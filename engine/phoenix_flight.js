// One flight path for the real-time Blender mesh and the Canvas-only fallback.
(()=>{
'use strict';
const birth=.8,exitSky=1.90,dive=2.10,impact=2.42;
const names=['chest','beak','tailTip','leftTip','rightTip'];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const mix=(a,b,k)=>a+(b-a)*k;
function ease(from,to,t){
  const k=clamp((t-from)/(to-from),0,1);
  return k*k*(3-2*k);
}
function preloadSheets(){
  for(const name of window.PhoenixFrames?.sheets||[])GFX.img(name);
}
function hasMeshPipeline(){return !!(GFX.on&&window.FX3?.on&&window.PhoenixMesh&&window.PhoenixRenderer);}
function preload(){
  if(hasMeshPipeline())PhoenixRenderer.preload(preloadSheets);
  else preloadSheets();
}
function usesMesh(){return hasMeshPipeline()&&(PhoenixRenderer.ready()||!PhoenixRenderer.failed());}
function ready(){
  if(usesMesh())return PhoenixRenderer.ready();
  return !!window.PhoenixFrames?.sheets.every(name=>GFX.tex[name]?.ok);
}
function portraitGap(){
  if(innerWidth>=innerHeight)return .5;
  const map=document.querySelector('#pfminimap:not([hidden])'),quest=document.querySelector('#pfquest.on');
  if(!map||!quest)return .5;
  const left=map.getBoundingClientRect().right,right=quest.getBoundingClientRect().left;
  return right>left?(left+right)/(2*innerWidth):.5;
}
function keyPosition(t,count,fps){
  const f=clamp((t-birth)*fps,0,count-1),i=Math.floor(f);
  return {i,j:Math.min(count-1,i+1),k:f-i};
}
function meshPose(t){
  if(!window.PhoenixRenderer?.ready())return null;
  const m=PhoenixMesh,pose=keyPosition(t,m.frameCount,m.fps),{i,j,k}=pose;
  const points={};
  for(const name of names){
    const a=m.landmarks[i][name],b=m.landmarks[j][name];
    points[name]=a.map((v,n)=>mix(v,b[n],k));
  }
  const r=m.bounds[i].map((v,n)=>mix(v,m.bounds[j][n],k));
  return {pose,points,box:[2*r[0]/m.viewSize-1,1-2*r[1]/m.viewSize,2*r[2]/m.viewSize-1,1-2*r[3]/m.viewSize]};
}
function canvasPose(t){
  const m=window.PhoenixFrames;
  if(!m)return null;
  const index=clamp(Math.round((t-birth)*m.fps),0,m.frames.length-1),frame=m.frames[index];
  const sheet=GFX.img(m.sheets[frame.sheet]);
  if(!sheet.ok)return null;
  const factor=2/m.viewSize,points={};
  const depth=window.PhoenixMesh?.landmarks[index];
  for(const name of names)points[name]=[frame[name][0]*factor,-frame[name][1]*factor,depth?.[name]?.[2]||0];
  return {points,box:[0,0,frame.rect[2]*factor,-frame.rect[3]*factor],
    image:sheet.im,rect:frame.rect,viewSize:m.viewSize};
}
function draw(t,bx,by,ix,iy,dir,gap=.5){
  if(t<birth||t>=impact||(t>=exitSky&&t<dive))return null;
  const gpu=usesMesh(),data=gpu?meshPose(t):canvasPose(t);
  if(!data)return null;
  const rising=t<exitSky,body=RPG.sv.BODY,zoom=S*cam.z;
  // World dimensions, including the growing span as the first power stroke unfolds.
  const span=body*(rising ? 1.75+7.65*ease(.8,1.40,t) : 8.1+1.45*ease(dive,impact,t));
  const radius=span*zoom*.5,roll=[Math.cos(cam.rot),Math.sin(cam.rot)];
  const floor=GFX.w2s(ix,iy);
  // An oblique view of the actual volume turns toward a target away from the camera axis.
  const yaw=gpu ? .12*clamp((floor[0]/W-.5)*2,-1,1)+.24*(post.tilt||0)+.048*Math.sin((t-birth)*2.2) : 0;
  const view=[Math.cos(yaw),Math.sin(yaw)];
  function offset(point){
    const x=dir*(point[0]*view[0]+point[2]*view[1]),y=point[1];
    return [radius*(roll[0]*x+roll[1]*y),radius*(roll[1]*x-roll[0]*y)];
  }
  const marks={};
  for(const name of names)marks[name]=offset(data.points[name]);
  const anchor=rising?marks.chest:marks.beak;
  // The exporter bounds are for the neutral camera. Include the depth variation across
  // the turned volume for conservative frustum clipping at both sides of the top edge.
  const corners=[];
  for(const x of [data.box[0],data.box[2]])for(const y of [data.box[1],data.box[3]]){
    corners.push(offset([x,y,-1]),offset([x,y,1]));
  }
  const low=Math.max(...corners.map(p=>p[1]));
  let ax,ay,ground;
  if(rising){
    const windup=ease(birth,1.28,t),drive=ease(1.26,1.65,t);
    ground=by-body*.32*drive;
    const launch=GFX.w2s(bx+dir*body*(.10*windup+.58*drive),ground,body*(.88+.18*windup+.94*drive));
    const climb=clamp((t-1.46)/(exitSky-1.46),0,1);
    ax=launch[0]+dir*body*.32*zoom*climb;
    if(H>W)ax=mix(ax,W*gap-(marks.beak[0]-anchor[0]),ease(1.46,1.78,t));
    ay=mix(launch[1],-H*.035-low+anchor[1],climb*climb);
  }else{
    ground=iy;
    const k=clamp((t-dive)/(impact-dive),0,1),travel=k*(.61+.39*k);
    const entry=H>W?W*gap:clamp(floor[0]-dir*body*1.6*zoom,W*.26,W*.74);
    ax=mix(entry,floor[0],travel);
    ay=mix(-H*.016,floor[1],travel);
  }
  const ox=ax-anchor[0],oy=ay-anchor[1];
  if(oy+low<=0||oy+Math.min(...corners.map(p=>p[1]))>=H||
     ox+Math.max(...corners.map(p=>p[0]))<=0||ox+Math.min(...corners.map(p=>p[0]))>=W)return null;
  function worldAt(offset){
    const x=(ox+offset[0]-W*.5)/zoom,y=(oy+offset[1]-H*.5)/zoom;
    return {x:cam.x-cam.sx+x*roll[0]+y*roll[1],y:ground,z:ground-cam.y+cam.sy+x*roll[1]-y*roll[0]};
  }
  const alpha=ease(birth,.94,t),chest=worldAt(marks.chest);
  if(gpu){
    PhoenixRenderer.submit({t,chest,pose:data.pose,alpha,dir,roll,view,
      screen:[2*radius/W,2*radius/H,2*ox/W-1,1-2*oy/H]});
  }else if(GFX.on){
    // A missing mesh or unsupported custom shader may still leave the game's basic
    // textured-quad renderer available. Submit its plate in the battle effect layer.
    const [sx,sy,w,h]=data.rect,iw=data.image.naturalWidth,ih=data.image.naturalHeight;
    const u0=sx/iw,v0=1-sy/ih,u1=(sx+w)/iw,v1=1-(sy+h)/ih,P=[];
    for(const [x,y] of [[0,0],[w,0],[0,h],[w,h]]){
      const p=offset([2*x/data.viewSize,-2*y/data.viewSize,0]);
      P.push(2*(ox+p[0])/W-1,1-2*(oy+p[1])/H);
    }
    GFX.q.push({st:GFX.st(0,'alpha',{t:data.image,L:4}),P,uv:[u0,v0,u1,v0,u0,v1,u1,v1],
      c:[1,1,1],a:alpha,p:[0,0,1,0],L:4});
  }else{
    const scale=2*radius/data.viewSize,[sx,sy,w,h]=data.rect;
    ctx.save();
    ctx.setTransform(dir*scale*roll[0],dir*scale*roll[1],-scale*roll[1],scale*roll[0],ox,oy);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;
    ctx.drawImage(data.image,sx,sy,w,h,0,0,w,h);
    ctx.restore();
  }
  // The projected plate and GPU silhouettes use the same sockets. Restore each tip's
  // offset in floor depth without moving its on-screen (floor Y minus height) position.
  function wingMount(name,tip){
    const q=data.points[name],c=data.points.chest;
    const depth=((q[2]-c[2])*view[0]-(q[0]-c[0])*view[1])*span*.5;
    const dy=-depth*GFX.FSY;
    return {x:tip.x,y:tip.y+dy,z:tip.z+dy};
  }
  const left=worldAt(marks.leftTip),right=worldAt(marks.rightTip);
  return {chest,tail:worldAt(marks.tailTip),left,right,span,alpha,
    air:{left:wingMount('leftTip',left),right:wingMount('rightTip',right),mesh:gpu}};
}
window.PhoenixFlight={birth,dive,impact,preload,ready,portraitGap,draw};
})();

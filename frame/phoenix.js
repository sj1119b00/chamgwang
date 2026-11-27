// 봉황강림의 원화 한 장을 연결된 날개와 몸통에 입힌다. 비행 시계와 타격은 원래 기술이 맡는다.
(function(){
'use strict';
const sv=RPG.sv, birth=.8, impact=2.42;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const smooth=(a,b,t)=>{const u=clamp((t-a)/(b-a),0,1);return u*u*(3-2*u);};
const mix=(a,b,t)=>a+(b-a)*t;
const rad=Math.PI/180;

// 준비 자세와 한 번의 동력 하강타. 공기가 손목과 바깥깃을 차례로 밀어 각 마디의 최고점이 다르다.
function spanAngle(t,delay,rest,raise,down,level,tuck){
  return rest+(raise-rest)*smooth(.82+delay,1.28+delay,t)
    +(down-raise)*smooth(1.28+delay,1.60+delay,t)
    +(level-down)*smooth(1.65+delay,1.97+delay,t)
    +(tuck-level)*smooth(2.10,2.38,t);
}
function pose(t){
  const dive=smooth(2.08,2.38,t), drive=smooth(1.32,1.65,t);
  return {
    shoulder:rad*spanAngle(t,0,53,66,-47,-3,-101),
    elbow:rad*spanAngle(t,.045,-36,1,-19,-4,-37),
    wrist:rad*spanAngle(t,.085,45,13,-20,3,-18),
    feather:rad*spanAngle(t,.115,12,5,-18,-2,-5),
    sweep:rad*(31*(1-smooth(.88,1.35,t))+16*(1-smooth(1.60,1.91,t))*drive+24*dive),
    pitch:rad*(7-14*drive+24*smooth(1.64,1.97,t)+14*dive),
    bank:rad*(-8+13*smooth(.88,1.42,t)-7*drive+14*smooth(1.85,2.09,t)-183*dive),
    tail:rad*(8-25*smooth(1.46,1.76,t)+20*smooth(2.15,2.42,t)),
    trail:rad*30*Math.sin(Math.PI*dive),
    stoop:dive,
    lift:.035*smooth(.8,1.26,t)+.39*smooth(1.34,1.94,t)-.026*smooth(1.99,2.19,t)-.395*smooth(2.09,2.42,t),
    size:.63+.37*smooth(.8,1.45,t)-.27*smooth(1.65,2,t)+.26*smooth(2.21,2.42,t),
    alpha:smooth(.8,.99,t)
  };
}

// 원화에서 마디를 잡은 자리는 날개 반폭의 약 11%, 41%, 67%, 83%.
// 끝깃부터 뿌리로 돌아가며 다음 회전의 중심도 함께 이동시킨다.
function wingJoint(p,hinge,height,angle,sweep,weight){
  if(weight<=0)return;
  const dx=p.x-hinge,dz=p.z-height,roll=angle*weight,turn=sweep*weight;
  const width=dx*Math.cos(roll)-dz*Math.sin(roll);
  p.z=height+dx*Math.sin(roll)+dz*Math.cos(roll);
  p.x=hinge+width*Math.cos(turn)-p.y*Math.sin(turn);
  p.y=width*Math.sin(turn)+p.y*Math.cos(turn);
}
function skin(u,v,s){
  const lateral=2*u-1,span=Math.abs(lateral),wing=1-smooth(.47,.60,v);
  const p={x:span,y:.14*Math.exp(-span*span*65)*Math.exp(-Math.pow((v-.36)*4,2))
    +.07*wing*Math.sin(Math.PI*span),z:(.33-v)*1.353};
  // 급강하 직전에는 목과 부리를 먼저 내밀고 긴 꼬리깃은 접힌 날개 뒤에 남겨 둔다.
  p.z+=s.stoop*(.15*(1-smooth(.13,.34,v))*(1-smooth(.07,.20,span))-.21*smooth(.55,.98,v));
  wingJoint(p,.83,.24,s.feather,0,wing*smooth(.76,.91,span));
  wingJoint(p,.67,.18,s.wrist,s.sweep*.36,wing*smooth(.58,.76,span));
  wingJoint(p,.41,.07,s.elbow,s.sweep*.62,wing*smooth(.32,.50,span));
  wingJoint(p,.11,0,s.shoulder,s.sweep*.33,wing*smooth(.045,.19,span));
  p.x*=Math.sign(lateral);
  const tail=smooth(.48,.91,v),turn=s.pitch-s.tail*tail,co=Math.cos(turn),sn=Math.sin(turn);
  const y=p.y*co-p.z*sn, z=p.y*sn+p.z*co;
  const bank=s.bank+s.trail*tail,cb=Math.cos(bank),sb=Math.sin(bank);
  return {x:p.x*cb-z*sb,y,z:p.x*sb+z*cb};
}

let mesh=null;
function makeMesh(image){
  const nx=28,ny=20,vertex=[],faces=[];
  // 투명한 칸은 한 번만 골라낸다. 원화의 작은 불똥과 긴 꼬리 끝까지 아우른다.
  const mask=document.createElement('canvas');mask.width=nx*4;mask.height=ny*4;
  const m=mask.getContext('2d');m.drawImage(image,0,0,mask.width,mask.height);
  const pixels=m.getImageData(0,0,mask.width,mask.height).data;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)vertex.push({u:i/nx,v:j/ny});
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    let visible=false;
    for(let y=j*4;y<j*4+4&&!visible;y++)for(let x=i*4;x<i*4+4;x++)if(pixels[(y*mask.width+x)*4+3]>2){visible=true;break;}
    if(!visible)continue;
    const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
    faces.push({indices:[a,b,c,d],uv:[i/nx,1-j/ny,(i+1)/nx,1-j/ny,i/nx,1-(j+1)/ny,(i+1)/nx,1-(j+1)/ny]});
  }
  return {vertex,faces};
}
let portraitHUD=null;
function hudBottom(){
  if(portraitHUD&&portraitHUD.width===innerWidth&&portraitHUD.height===innerHeight)return portraitHUD.bottom*H;
  const screen=out.getBoundingClientRect();
  let bottom=screen.top;
  for(const e of document.querySelectorAll('#pfminimap:not([hidden]),#pfquest.on,#shud .kc,#shud .bb.on,#shud .pz')){
    const r=e.getBoundingClientRect();
    if(r.width&&r.height)bottom=Math.max(bottom,r.bottom);
  }
  portraitHUD={width:innerWidth,height:innerHeight,bottom:(bottom-screen.top+8)/(screen.height||innerHeight)};
  return portraitHUD.bottom*H;
}
function projection(x,y,t){
  const s=pose(t),zoom=S*cam.z,cr=Math.cos(cam.rot),sr=Math.sin(cam.rot);
  const dx=(x-cam.x+cam.sx)*zoom,dy=(y-cam.y+cam.sy)*zoom;
  const radius=Math.min(W*.285,H*.42)*s.size;
  // 카메라가 원래의 2800 높이까지는 못 올라간다. 같은 바닥 지점에서 화면 높이에 비례해 원근을 압축한다.
  // 정점에서 앞으로 활강해 내려온다. 먼저 머리가 선회하고 그 뒤를 불꼬리가 따라온다.
  const arc=Math.sin(Math.PI*clamp((t-1.92)/(impact-1.92),0,1))*Math.min(W*.15,H*.27);
  const cx=clamp(W*.5+dx*cr-dy*sr-arc,radius*.84,W-radius*.84);
  const floor=H*.5+dx*sr+dy*cr;
  const beak=skin(.545,.13,s),beakY=radius*(-beak.z+beak.y*.24)/(1-beak.y*.28);
  const approach=mix(H*.09,beakY,smooth(2.21,impact,t));
  let cy=clamp(floor-H*s.lift-approach,H*.115+radius*.37,H*.88-radius*.58);
  if(H>W){
    // 세로에서는 양쪽 위 HUD가 낮게 내려온다. 그 아래에 활강 날개가 들어갈 만큼 남기고, 이륙점부터 높이차를 확보한다.
    const top=hudBottom(),apex=top+Math.min(W*.285,H*.42)*.73*.73;
    const launch=Math.max(floor-H*.025,apex+H*.22);
    cy=mix(mix(launch,apex,smooth(1.34,1.95,t)),floor-beakY,smooth(2.09,impact,t));
  }
  const projected=(u,v)=>{
    const p=skin(u,v,s),perspective=1/(1-p.y*.28);
    return {x:cx+radius*p.x*perspective,y:cy+radius*(-p.z+p.y*.24)*perspective,depth:p.y};
  };
  const vertices=mesh.vertex.map(v=>projected(v.u,v.v));
  const faces=mesh.faces.map(f=>({f,depth:f.indices.reduce((sum,i)=>sum+vertices[i].depth,0)}));
  faces.sort((a,b)=>a.depth-b.depth);
  function onBird(u,v){
    const point=projected(u,v),px=point.x-W*.5,py=point.y-H*.5;
    // 같은 투영을 거꾸로 따라가 현 바닥의 원래 빛·불기둥 손잡이를 원화의 깃에 붙인다.
    return {x:cam.x-cam.sx+(px*cr+py*sr)/zoom,y,z:y-cam.y+cam.sy-(-px*sr+py*cr)/zoom};
  }
  return {vertices,faces,alpha:s.alpha,heart:onBird(.5,.36),tail:onBird(.50,.80),tip:onBird(.51,.98),scale:radius/zoom};
}
const white=[1,.99,.97],params=[0,0,1,0];
function submitGPU(model,image){
  const state=GFX.st(0,'alpha',{t:image,L:4});
  for(const {f} of model.faces){
    const P=[];
    for(const i of f.indices){const v=model.vertices[i];P.push(2*v.x/W-1,1-2*v.y/H);}
    GFX.q.push({st:state,P,uv:f.uv,c:white,a:model.alpha,p:params,L:4});
  }
}
function drawTriangle(g,image,corners,points){
  const [a,b,c]=points,[u,v,w]=corners,iw=image.naturalWidth,ih=image.naturalHeight;
  const du=(v.u-u.u)*iw,dv=(v.v-u.v)*ih,eu=(w.u-u.u)*iw,ev=(w.v-u.v)*ih,det=du*ev-dv*eu;
  const ax=((b.x-a.x)*ev-(c.x-a.x)*dv)/det,ay=((b.y-a.y)*ev-(c.y-a.y)*dv)/det;
  const bx=((c.x-a.x)*du-(b.x-a.x)*eu)/det,by=((c.y-a.y)*du-(b.y-a.y)*eu)/det;
  // Canvas는 접한 두 삼각형의 공유 변을 각각 반투명 처리한다. 한 픽셀만 겹쳐 내부에 검은 그물이 생기지 않게 한다.
  const mx=(a.x+b.x+c.x)/3,my=(a.y+b.y+c.y)/3;
  g.save();g.beginPath();
  for(let i=0;i<3;i++){
    const vtx=points[i],dx=vtx.x-mx,dy=vtx.y-my,d=Math.hypot(dx,dy)||1;
    const px=vtx.x+1.4*dx/d,py=vtx.y+1.4*dy/d;
    if(i===0)g.moveTo(px,py);else g.lineTo(px,py);
  }
  g.closePath();g.clip();
  g.transform(ax,ay,bx,by,a.x-ax*u.u*iw-bx*u.v*ih,a.y-ay*u.u*iw-by*u.v*ih);
  const pad=Math.ceil(2/Math.max(.01,Math.min(Math.hypot(ax,ay),Math.hypot(bx,by))));
  const x=Math.max(0,Math.min(u.u,v.u,w.u)*iw-pad),y=Math.max(0,Math.min(u.v,v.v,w.v)*ih-pad);
  const sw=Math.min(iw,Math.max(u.u,v.u,w.u)*iw+pad)-x,sh=Math.min(ih,Math.max(u.v,v.v,w.v)*ih+pad)-y;
  g.drawImage(image,x,y,sw,sh,x,y,sw,sh);g.restore();
}
function submitCanvas(model,image){
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=model.alpha;
  for(const {f} of model.faces){
    const [a,b,c,d]=f.indices;
    for(const tri of [[a,b,c],[c,b,d]])drawTriangle(ctx,image,tri.map(i=>mesh.vertex[i]),tri.map(i=>model.vertices[i]));
  }
  ctx.restore();
}
function paint(x,y,t,image,submit){
  if(!image?.naturalWidth||t<birth||t>=impact)return false;
  if(!mesh)mesh=makeMesh(image);
  const model=projection(x,y,t);
  submit(model,image);
  return model;
}
function attachFire(model,chest,jet,light){
  if(light)Object.assign(light,model.heart);
  if(chest)Object.assign(chest,model.heart,{r:model.scale*.078,a:.40});
  if(jet){
    const dx=model.tip.x-model.tail.x,dz=model.tip.z-model.tail.z;
    Object.assign(jet,model.tail,{dir:dx<0?Math.PI:0,pitch:Math.atan2(dz,Math.abs(dx)),
      r:model.scale*.045,len:model.scale*.31,a:.42});
  }
}
const names=new Set(['v3_phoenix_fold','v3_phoenix_rise','v3_phoenix_dive']);
function attach(){
  const ults=sv.CLS.pyro?.ults;
  if(!ults?.py_ult2)return;
  document.removeEventListener('load',attach,true);
  const original=ults.py_ult2;
  const source=window.FX3?.img('v3_phoenix_rise');
  ults.py_ult2=function(){
    const start=RT,x0=pl.x,y0=pl.gy,dir=pl.f,result=original.apply(this,arguments);
    portraitHUD=null;
    const timed=window.GFX?.fx.find(q=>Math.abs(q.t0-start-birth)<.00001&&Math.abs(q.life-(impact-birth+.02))<.00001);
    if(timed&&GFX.on&&FX3.on){
      const flight=timed.fn;
      const light=GFX.lights.find(l=>l.hold===impact&&l.life===.3);
      let chest,jet;
      timed.fn=function(k,seconds){
        const bill=FX3.bill,orb=K3.vorb,stream=K3.vjet;
        let painted=false;
        if(!chest&&orb)K3.vorb=function(){return chest=orb.apply(this,arguments);};
        if(!jet&&stream)K3.vjet=function(){return jet=stream.apply(this,arguments);};
        FX3.bill=function(material,x,y){
          if(names.has(material?.tex?.name)){
            if(painted)return;
            painted=paint(x,y,birth+seconds,source.im,submitGPU);
            if(painted)return;
          }
          return bill.apply(this,arguments);
        };
        try{return flight.apply(this,arguments);}finally{
          FX3.bill=bill;K3.vorb=orb;K3.vjet=stream;
          if(painted)attachFire(painted,chest,jet,light);
        }
      };
    }else if(!window.GFX?.on||!window.FX3?.on){
      const target=sv.densest(1300),ix=target?mix(x0,target.x,.8):x0+dir*160,iy=target?mix(y0,target.y,.8)-40:y0-340;
      sv.draw(impact-birth,k=>{
        if(!lock||sv.V.ultId!=='py_ult2')return;
        const t=birth+k*(impact-birth),cross=1-Math.pow(1-clamp((t-2)/(impact-2),0,1),3);
        paint(mix(x0,ix,cross),mix(y0-150,iy,cross),t,source?.im,submitCanvas);
      },birth);
    }
    return result;
  };
}
document.addEventListener('load',attach,true);
attach();
})();

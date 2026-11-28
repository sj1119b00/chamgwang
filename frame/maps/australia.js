(function(){
'use strict';
const PF=window.PF,land=new Map(),patches=new Map(),survey=new Map();
const tones=['#51665a','#75584b','#3b6266','#395e4f','#855b44','#71583d','#8c5b4b','#766a48'];
const base='assets/campaign/atlas/';
const preview=new Map(),sheet=new Image();sheet.src=base+'survey-preview.webp';
const ready=sheet.decode().then(()=>{
  PF.WORLD.anchors.forEach((a,i)=>{
    const c=document.createElement('canvas');c.width=c.height=384;
    c.getContext('2d').drawImage(sheet,384*(i%3),384*Math.floor(i/3),384,384,0,0,384,384);
    preview.set(String(a.no??'town'),c);
  });
}).catch(()=>{});
function source(key){
  key=String(key);
  if(!land.has(key)){
    const tile=new Image();tile.decoding='async';tile.src=base+'land-'+key+'.webp';land.set(key,tile);
  }
  return land.get(key);
}
function texture(key){const im=source(key);return im.complete&&im.naturalWidth?im:preview.get(String(key));}
function rect(g,b){g.rect(b.l,b.t,b.r-b.l,b.b-b.t);}
const patterns=new WeakMap();
function photo(g,im,key,span,ox,oy,angle=0){
  if(!im){g.fillStyle=tones[Number(key)]||'#675f47';return;}
  let cache=patterns.get(g);if(!cache){cache=new Map();patterns.set(g,cache);}
  if(!cache.has(im))cache.set(im,g.createPattern(im,'repeat'));
  const p=cache.get(im),matrix=new DOMMatrix().translate(ox,oy).rotate(angle).scale(span/im.width,span/im.height);
  p.setTransform(matrix);g.fillStyle=p;
}
function near(a,b,r=0){return a.l-r<b.r&&a.r+r>b.l&&a.t-r<b.b&&a.b+r>b.t;}
function patch(key,j){
  const im=texture(j.texture);if(!im)return null;
  if(patches.get(key)?.im===im)return patches.get(key).canvas;
  const c=document.createElement('canvas');c.width=c.height=400;const g=c.getContext('2d');
  let seed=7;for(const ch of key)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const sx=80+seed%445,sy=80+(seed>>>7)%445;
  const k=im.width/1280;g.drawImage(im,sx*k,sy*k,475*k,475*k,0,0,400,400);
  // The same survey stones, surface, cut banks and railheads are seen from either side of a seam.
  g.fillStyle='rgba(30,41,39,.26)';g.fillRect(0,0,400,400);
  g.strokeStyle=j.tunnel?'#303e3b':'#6f6a54';g.lineWidth=j.tunnel?15:23;g.beginPath();
  g.moveTo(-12,198);g.bezierCurveTo(95,208,132,200,200,200);g.bezierCurveTo(262,201,305,190,412,197);g.stroke();
  for(const ay of [-5,5]){
    g.beginPath();g.moveTo(-12,198+ay);g.bezierCurveTo(95,208+ay,132,200+ay,200,200+ay);g.bezierCurveTo(262,201+ay,305,190+ay,412,197+ay);
    g.strokeStyle='#373e36';g.lineWidth=2;g.stroke();g.strokeStyle='#b5b49e';g.lineWidth=.8;g.stroke();
  }
  for(let x=92;x<310;x+=12){g.strokeStyle='#524f42';g.lineWidth=1.3;g.beginPath();g.moveTo(x,193);g.lineTo(x,207);g.stroke();}
  g.globalCompositeOperation='destination-in';const fade=g.createRadialGradient(200,200,42,200,200,199);
  fade.addColorStop(0,'#fff');fade.addColorStop(.28,'#fff');fade.addColorStop(.78,'rgba(255,255,255,.40)');fade.addColorStop(1,'transparent');
  g.fillStyle=fade;g.fillRect(0,0,400,400);
  patches.set(key,{im,canvas:c});return c;
}
function joint(g,place,d,view){
  const j=PF.WORLD.join(place,d.exit);
  if(!j||!near(view,{l:d.x,r:d.x,t:d.y,b:d.y},1520))return;
  const shot=patch(j.key,j),k=j.tunnel?620:1320,dir=d.dir||[1,0];
  g.save();g.translate(d.x,d.y);g.transform(j.sense*dir[0],j.sense*dir[1],-j.sense*dir[1],j.sense*dir[0],0,0);
  if(shot)g.drawImage(shot,-k,-k,k*2,k*2);
  if(!j.tunnel){
    for(const side of [-1,1]){
      const y=side*100;g.fillStyle='#343e37';g.fillRect(-19,y-12,42,22);
      g.fillStyle='#c5ae7e';g.fillRect(-15,y-10,30,15);g.fillStyle='#9ae8c4';g.fillRect(-11,y-13,22,5);
    }
  }
  g.restore();
}
function tunnel(g,place,d){
  if(!d)return;
  const v=RPG.sv.view();if(Math.abs(cam.x-d.x)>v.hw+200||Math.abs(cam.y-d.y)>v.hh+200)return;
  const j=PF.WORLD.join(place,place[0]==='z'?'out':'return'),[dx,dy]=d.dir;
  g.save();g.translate(d.x,d.y);g.transform(j.sense*dx,j.sense*dy,-j.sense*dy,j.sense*dx,0,0);
  const ring=(x,y,rx,ry,fill)=>{g.beginPath();g.ellipse(x,y,rx,ry,0,0,2*Math.PI);g.fillStyle=fill;g.fill();};
  ring(9,11,116,144,'#29312b');ring(0,0,113,140,'#7b7965');ring(0,0,99,126,'#3a4a44');ring(0,0,89,114,'#152e30');
  g.save();g.beginPath();g.ellipse(0,0,86,110,0,0,2*Math.PI);g.clip();
  for(let i=-4;i<8;i++){
    const y=i*21;g.fillStyle='#657369';g.fillRect(-85,y,170,9);g.fillStyle='#9f9a7e';g.fillRect(-85,y,170,3);
  }
  g.restore();
  for(const i of [-1,1]){
    g.fillStyle='#344c45';g.fillRect(-27,i*124-9,54,19);
    g.fillStyle='#b6f1cb';g.fillRect(-18,i*124-4,36,8);
  }
  g.restore();
}
function fence(g,B,v,doors){
  const sides=[[B.l,B.t,B.r,B.t],[B.r,B.t,B.r,B.b],[B.l,B.b,B.r,B.b],[B.l,B.t,B.l,B.b]];
  g.save();g.lineCap='round';
  for(const [x,y,xx,yy] of sides){
    if(!near(v,{l:Math.min(x,xx),r:Math.max(x,xx),t:Math.min(y,yy),b:Math.max(y,yy)},100))continue;
    const dx=xx===x?0:1,dy=yy===y?0:1,length=Math.hypot(xx-x,yy-y),step=345;
    for(let i=0;i<length;i+=step){
      const ax=x+dx*i,ay=y+dy*i,bx=x+dx*Math.min(i+step,length),by=y+dy*Math.min(i+step,length);
      if(!near(v,{l:ax,r:bx,t:ay,b:by},90)||doors.some(d=>Math.hypot(d.x-(ax+bx)/2,d.y-(ay+by)/2)<400))continue;
      g.strokeStyle='rgba(27,36,32,.68)';g.lineWidth=11;g.beginPath();g.moveTo(ax,ay-32);g.lineTo(bx,by-32);g.stroke();
      g.strokeStyle='#a2aa81';g.lineWidth=4;g.stroke();
      g.fillStyle='#364d43';g.fillRect(ax-9,ay-75,18,80);g.fillStyle='#d8c18c';g.fillRect(ax-9,ay-76,18,14);
    }
  }
  g.restore();
}
function ground(g,key,place,B,view,doors,origin){
  const im=texture(key),span=15500,angle=origin.turn||0;
  g.save();photo(g,im,key,span,origin.x,origin.y,angle);
  g.globalAlpha=.40;g.fillRect(view.l,view.t,view.r-view.l,view.b-view.t);g.globalAlpha=1;
  if(view.l<B.l||view.r>B.r||view.t<B.t||view.b>B.b){
    g.save();g.beginPath();rect(g,view);rect(g,B);g.clip('evenodd');
    g.fillRect(view.l,view.t,view.r-view.l,view.b-view.t);
    g.fillStyle='rgba(49,69,61,.15)';g.fillRect(view.l,view.t,view.r-view.l,view.b-view.t);g.restore();
    // Continue the same image through the fence and blend it into the playable surface.
    const s=72;
    for(let i=0;i<8;i++){
      g.globalAlpha=.82*(1-i/8)**1.4;
      const inset=i*s;
      if(view.l<B.l+600)g.fillRect(B.l+inset,B.t,s,B.b-B.t);
      if(view.r>B.r-600)g.fillRect(B.r-inset-s,B.t,s,B.b-B.t);
      if(view.t<B.t+600)g.fillRect(B.l,B.t+inset,B.r-B.l,s);
      if(view.b>B.b-600)g.fillRect(B.l,B.b-inset-s,B.r-B.l,s);
    }
    g.globalAlpha=1;
    fence(g,B,view,doors);
  }
  for(const d of doors)joint(g,place,d,view);
  g.restore();
}
function room(g,room,x0,y0,x1,y1){
  const town=room.id==='town',key=town?'town':String(room.no),place=town?'town':'v'+room.zone;
  const doors=room.roads.map(d=>({...d,dir:d.dir||[1,0]}));if(room.returnGate)doors.push(room.returnGate);
  const f=town?room.roads[0]:room.roads.find(d=>d.exit==='field');
  ground(g,key,place,{l:0,r:room.w,t:0,b:room.h},{l:x0,r:x1,t:y0,b:y1},doors,{x:f.x-8200,y:f.y-6700});
}
function field(g,M,edge){
  const no=M.regional.no,z=7-no,place='z'+z,st=M.regional.sites.O;
  if(!survey.has(no))survey.set(no,PF.WORLD.districtPlan(no,PF.regionMaps.read));
  const b=M.B,[ex,ey]=survey.get(no).entry;
  const entry={x:st.x+ex*100,y:st.y+ey*100,exit:'in',dir:[0,1]};
  const real=PF.road?.surveyDoors(M);const doors=[real?.in?{...real.in,exit:'in'}:entry];
  if(real?.out)doors.push({...real.out,exit:'out'});
  if(!edge){
    const view=RPG.sv.view();
    edge={l:cam.x-view.hw-420,r:cam.x+view.hw+420,t:cam.y-view.hh-420,b:cam.y+view.hh+420};
  }
  ground(g,String(no),place,b,edge,doors,{x:entry.x-6700,y:entry.y+8200,turn:-90});
}
PF.atlasTerrain={room,field,texture,source,ready,tunnel};
source('town');source('7');
PF.place.on((to,from,params)=>{
  if(to!=='village')return;
  const no=PF.regionMaps.number(params.zone);
  source(no);if(no>0)source(no-1);
});
})();

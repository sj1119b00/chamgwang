(function(){
'use strict';
const PF=window.PF,turn=2*Math.PI;
// The overhead map and the playable arena sample the same boundary.
function boundary(g,a,fsy,scale=1,from=0,to=turn){
  g.beginPath();
  for(let i=0;i<=96;i++){
    const angle=from+(to-from)*i/96,r=PF.regionMaps.radius(a,angle)*scale;
    const x=a.x+Math.cos(angle)*r,y=a.y+Math.sin(angle)*r*fsy;
    if(i) g.lineTo(x,y); else g.moveTo(x,y);
  }
  if(to-from>=turn-.0001) g.closePath();
}
function line(g,x0,y0,x1,y1){g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();}
const materials=[
  ['#0a101f','#6d9ca8','#b7fbff'],['#221618','#7d4238','#e98b64'],['#272117','#85704a','#f8da7e'],
  ['#0c2426','#50766a','#8fdbac'],['#211b2b','#76637c','#d0b4f5'],['#130f21','#693b66','#f0a6e5'],
  ['#172227','#6e807a','#fae5ad'],['#11222b','#476e7b','#a8e7fa']
];
function village(g,room,x0,y0,x1,y1){
  const no=room.no,[base,edge,ink]=materials[no];
  g.save();
  g.fillStyle=base; g.globalAlpha=.23;g.fillRect(x0,y0,x1-x0,y1-y0);g.globalAlpha=1;
  for(const [ax,ay,bx,by,w] of room.streets){
    if(Math.max(ax,bx)+w<x0||Math.min(ax,bx)-w>x1||Math.max(ay,by)+w<y0||Math.min(ay,by)-w>y1) continue;
    g.lineCap='round';g.globalAlpha=.72;g.strokeStyle=edge;g.lineWidth=w;line(g,ax,ay,bx,by);
    g.strokeStyle=base;g.lineWidth=w-20;line(g,ax,ay,bx,by);
    g.strokeStyle=ink;g.lineWidth=4;g.globalAlpha=.45;
    g.setLineDash(no===3?[5,45]:no===2?[22,12]:[52,76]);line(g,ax,ay,bx,by);g.setLineDash([]);
  }
  for(const [x,y,rx,ry] of room.plazas){
    if(x+rx<x0||x-rx>x1||y+ry<y0||y-ry>y1) continue;
    g.globalAlpha=.4;g.fillStyle=base;g.beginPath();g.ellipse(x,y,rx,ry,0,0,turn);g.fill();
    g.strokeStyle=ink;g.lineWidth=6;g.setLineDash([22,35]);g.stroke();g.setLineDash([]);
  }
  g.restore();
}
function land(g,M){
  const [base,edge,ink]=materials[M.regional.no];
  const v=RPG.sv.view();g.save();
  for(const t of M.regional.terrain){
    if(Math.abs(t.x-cam.x)>t.rx+v.hw+100||Math.abs(t.y-cam.y)>t.ry+v.hh+100) continue;
    g.save();g.translate(t.x,t.y);g.scale(t.rx,t.ry);g.beginPath();g.ellipse(0,0,1,1,0,0,turn);
    g.fillStyle=base;g.fill();g.strokeStyle=edge;g.lineWidth=.045;g.stroke();g.clip();
    g.lineWidth=.012;g.strokeStyle=ink;g.globalAlpha=.45;
    for(let i=-5;i<=5;i++){
      const j=i*.19;
      if(M.regional.no===3||M.regional.no===7){
        g.beginPath();g.moveTo(-1,j);g.bezierCurveTo(-.4,j-.12,.3,j+.13,1,j-.02);g.stroke();
      }else if(M.regional.no===5||M.regional.no===0){
        g.beginPath();g.moveTo(j,-1);g.lineTo(j,-.1);g.lineTo(j+.22,.1);g.lineTo(j+.22,.9);g.stroke();
      }else{line(g,-1,j,1,j-.6);}
    }
    g.restore();
  }
  g.restore();
}
function arena(g,fx,M,open,time,fsy){
  const a=M.arena,d=a.design,[base,edge,ink]=materials[M.regional.no],r=a.r;
  const v=RPG.sv.view(); if(Math.abs(a.x-cam.x)>r*1.7+v.hw||Math.abs(a.y-cam.y)>r+v.hh) return;
  g.save();boundary(g,a,fsy);g.fillStyle=base;g.globalAlpha=.91;g.fill();g.globalAlpha=1;
  g.strokeStyle=edge; g.lineWidth=12;g.stroke();boundary(g,a,fsy,.91);g.lineWidth=4;g.stroke();
  g.save();g.translate(a.x,a.y);g.scale(1,fsy);g.lineWidth=9;g.strokeStyle=ink;g.fillStyle=edge;g.globalAlpha=.58;
  switch(d.pattern){
    case 'benches':
      for(let row=1;row<=3;row++) for(let i=0;i<12;i++){
        g.beginPath();g.arc(0,0,r*(.22+row*.16),i*turn/12+.04,(i+1)*turn/12-.08);g.lineWidth=20;g.stroke();
      }break;
    case 'coil':
      for(let j=0;j<3;j++){g.rotate(turn/3);g.strokeRect(-.095*r,-.84*r,.19*r,.61*r);g.beginPath();g.arc(0,-r*.5,r*.19,0,turn);g.stroke();}
      break;
    case 'circuit':
      for(let i=-2;i<=2;i++){const y=i*r*.21;g.beginPath();g.moveTo(-r*.64,y);g.lineTo(-r*.11,y);g.lineTo(r*.12,y+r*.14);g.lineTo(r*.64,y+r*.14);g.stroke();g.fillRect(r*.63,y+r*.14-18,36,36);}break;
    case 'votes':
      for(let i=1;i<5;i++){g.beginPath();g.ellipse(0,r*.16,r*i*.24,r*i*.18,0,Math.PI,turn);g.lineWidth=23;g.stroke();}
      g.fillRect(-r*.19,r*.24,r*.38,r*.14);break;
    case 'spring':
      for(let i=0;i<7;i++){g.rotate(turn/7);g.beginPath();g.moveTo(0,0);g.bezierCurveTo(r*.25,-r*.20,r*.24,-r*.5,0,-r*.72);g.bezierCurveTo(-r*.11,-r*.46,-r*.22,-r*.23,0,0);g.stroke();}break;
    case 'scale':
      line(g,0,-r*.4,0,r*.4);line(g,-r*.55,-r*.25,r*.55,-r*.25);
      for(const k of [-1,1]){line(g,k*r*.45,-r*.25,k*r*.45,r*.16);g.beginPath();g.arc(k*r*.45,r*.12,r*.18,0,Math.PI);g.stroke();}break;
    case 'duel':
      g.lineWidth=19;line(g,-r*.48,-r*.14,r*.48,-r*.14);line(g,-r*.48,r*.14,r*.48,r*.14);g.lineWidth=6;g.strokeRect(-r*.5,-r*.53,r,r*1.06);break;
    case 'split':
      for(let i=1;i<=3;i++)for(const side of [-1,1]){g.beginPath();g.arc(side*r*.105,0,r*i*.19,side>0?-1.35:1.79,side>0?1.35:4.49);g.stroke();}
      break;
  }
  g.restore();g.restore();
  fx.save();const gateAngle=Math.PI/2,wc=open?ink:'#ff846e';
  boundary(fx,a,fsy,1,open?gateAngle+.32:0,open?gateAngle+turn-.32:turn);
  fx.strokeStyle=wc;fx.lineWidth=7;fx.globalAlpha=.75;fx.stroke();
  for(let i=0;i<36;i++){
    const angle=i*turn/36;if(open&&Math.abs(angle-gateAngle)<.34) continue;
    const rr=PF.regionMaps.radius(a,angle),x=a.x+Math.cos(angle)*rr,y=a.y+Math.sin(angle)*rr*fsy;
    fx.globalAlpha=.22+.08*Math.sin(time*2+i);fx.lineWidth=12;line(fx,x,y,x,y-(open?65:150));
  }
  fx.restore();
}
function stations(g,M,fsy){
  const active=PF.regionMaps.activeNodes(M),v=RPG.sv.view(),ink=materials[M.regional.no][2];
  g.save();
  if(M.duel){
    const n=M.duel;g.strokeStyle='#f6d8c4';g.lineWidth=10;g.setLineDash([90,38]);g.beginPath();
    g.ellipse(n.x,n.y,1440,1440*fsy,0,0,turn);g.stroke();g.setLineDash([]);
  }
  for(const n of M.nodes){
    if(Math.abs(n.x-cam.x)>v.hw+500||Math.abs(n.y-cam.y)>v.hh+300) continue;
    if(n.e&&!n.done) continue;
    const mode=PF.regionMaps.modeOf(n),r=mode==='calibrate'?290:180;
    g.strokeStyle=n.done?'#9abda7':active.includes(n)?ink:'#61717b';
    g.lineWidth=12;g.fillStyle='#16252c';g.beginPath();g.ellipse(n.x,n.y,r,r*fsy,0,0,turn);g.fill();g.stroke();
    if(mode==='calibrate'){g.globalAlpha=.26;g.lineWidth=140;g.stroke();g.globalAlpha=1;}
    const h=n.done?50:120;g.fillStyle='#35484b';g.fillRect(n.x-38,n.y-h,76,h);
    g.fillStyle=g.strokeStyle;g.fillRect(n.x-50,n.y-h-10,100,16);
    if(n.progress){g.beginPath();g.ellipse(n.x,n.y,r+25,(r+25)*fsy,0,-Math.PI/2,-Math.PI/2+turn*n.progress);g.lineWidth=15;g.stroke();}
  }
  g.restore();
}
PF.regionScenery={boundary,land,village,arena,stations};
})();

// The portrait and the combat figure share a rig measured from its feet.
// Floor marks instead use the encounter's native ground coordinates.
(() => {
'use strict';
const PF=window.PF, TAU=Math.PI*2;
const alloy={arbiter:{ink:'#302521',steel:'#6a5850',plate:'#c6b8a1',face:'#eadaca',light:'#ffc17b'},
  archivist:{ink:'#211d31',steel:'#514b6a',plate:'#a298ba',face:'#ded8f1',light:'#c6a6ff'},
  weaver:{ink:'#142d30',steel:'#3f6063',plate:'#99b2ac',face:'#d2dfd5',light:'#72e4cb'}};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

function path(g,points){
  g.beginPath();g.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
}
function plate(g,points,fill,edge='#182029',width=1.4){
  path(g,points);g.closePath();g.fillStyle=fill;g.fill();
  if(edge){g.strokeStyle=edge;g.lineWidth=width;g.stroke();}
}
function wire(g,points,color,width){
  path(g,points);g.strokeStyle=color;g.lineWidth=width;g.stroke();
}
function joint(g,x,y,r,p){
  g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=p.ink;g.fill();
  g.strokeStyle=p.plate;g.lineWidth=1.4;g.stroke();
  g.fillStyle=p.light;g.fillRect(x-1.1,y-1.1,2.2,2.2);
}
function limb(g,points,p,width){
  wire(g,points,p.ink,width);wire(g,points,p.steel,width*.62);
  wire(g,points.map(([x,y])=>[x-1.2,y-1]),p.plate,width*.17);
}
function panel(g,p,shape,seam){
  plate(g,shape,p.plate,p.ink,1.7);
  if(seam)plate(g,seam,p.steel,null);
}
function leg(g,p,side,wide){
  const foot=side*(wide?18:11),hip=side*9,knee=foot+side*2;
  limb(g,[[hip,-80],[knee,-40],[foot,-9]],p,wide?12:9);
  panel(g,p,[[hip-5,-78],[hip+6,-76],[knee+4,-49],[knee-3,-42],[knee-6,-57]]);
  joint(g,knee,-40,4.6,p);
  panel(g,p,[[knee-5,-36],[knee+5,-38],[foot+4,-15],[foot,-8],[foot-3,-20]],
    [[knee+1,-35],[knee+5,-37],[foot+4,-15],[foot,-9]]);
  plate(g,[[foot-4,-13],[foot+4,-12],[foot+7,-6],[foot+12,-4],[foot+13,-1],[foot-5,-1]],p.steel,p.ink);
}
function mask(g,p,type){
  if(type==='arbiter'){
    panel(g,p,[[-13,-146],[-11,-161],[-6,-167],[8,-167],[16,-158],[13,-143],[4,-136],[-4,-137]],
      [[4,-166],[15,-158],[12,-144],[4,-137],[6,-151]]);
    plate(g,[[-12,-156],[15,-157],[13,-151],[-9,-150]],p.ink,null);
    wire(g,[[-9,-153],[9,-154]],p.light,1.8);
    wire(g,[[-7,-145],[-1,-139],[5,-141]],p.face,1.5);
  }else if(type==='archivist'){
    plate(g,[[-20,-142],[-15,-160],[-3,-174],[12,-166],[20,-144],[8,-131],[-9,-131]],p.ink,p.steel);
    panel(g,p,[[-13,-148],[-5,-163],[9,-160],[13,-150],[5,-135],[-4,-138]],
      [[5,-162],[12,-151],[5,-136],[2,-142]]);
    wire(g,[[-8,-153],[8,-151]],p.ink,4);
    for(let i=0;i<3;i++)wire(g,[[-5+i*4,-154],[-6+i*4,-149]],p.light,1.4);
  }else{
    panel(g,p,[[-12,-154],[-4,-169],[8,-165],[15,-153],[9,-143],[0,-133],[-9,-143]],
      [[2,-166],[8,-164],[14,-153],[9,-143],[0,-134],[3,-151]]);
    wire(g,[[-9,-154],[-1,-150],[10,-156]],p.ink,4.5);
    wire(g,[[-8,-154],[-1,-151],[8,-155]],p.light,1.5);
    wire(g,[[-3,-164],[-10,-178],[-10,-190]],p.plate,2);
    wire(g,[[6,-165],[14,-179],[15,-187]],p.steel,2.5);
  }
}
function blade(g,p,x,y,t){
  g.save();g.translate(x,y);g.rotate(-.13+.04*Math.sin(t));
  limb(g,[[0,12],[0,-4],[0,-16]],p,4.2);
  panel(g,p,[[-9,-11],[7,-13],[10,-10],[5,-6],[-8,-5]]);
  panel(g,p,[[-4,-12],[5,-12],[9,-66],[4,-84],[-5,-62],[-2,-35]],
    [[1,-13],[5,-13],[9,-66],[4,-82],[4,-60]]);
  wire(g,[[-1,-17],[1,-42],[-1,-60],[4,-76]],p.light,2.4);g.restore();
}
function arbiter(g,p,t,open){
  const drift=Math.sin(t*1.35),hand=-90-(open?0:7)+drift*2;
  // The square crown is split at its four corners, like an open boundary.
  g.save();g.translate(0,-154);g.rotate(-.14+.03*drift);
  for(let i=0;i<4;i++){g.rotate(Math.PI/2);wire(g,[[-26,-9],[-26,-25],[-8,-25]],p.steel,4);
    wire(g,[[-26,-13],[-26,-25],[-14,-25]],p.light,1.4);}g.restore();
  for(const side of [-1,1]){
    plate(g,[[side*16,-129],[side*30,-124],[side*23,-76],[side*33,-25],[side*14,-40],[side*5,-85]],p.ink,p.steel);
    wire(g,[[side*25,-114],[side*17,-74],[side*26,-41]],p.steel,2.1);
  }
  leg(g,p,-1,true);leg(g,p,1,true);
  panel(g,p,[[-21,-131],[14,-134],[26,-121],[17,-100],[9,-82],[-8,-77],[-18,-95]],
    [[15,-132],[25,-120],[16,-99],[8,-82],[-2,-80],[5,-101]]);
  for(let i=0;i<3;i++)wire(g,[[-14+i*2,-100+i*6],[-4,-96+i*6],[8,-101+i*6]],p.ink,2.4);
  limb(g,[[-23,-120],[-32,-98],[-30,-78]],p,13);
  panel(g,p,[[-30,-101],[-39,-102],[-42,-81],[-35,-65],[-26,-75],[-24,-88]],
    [[-37,-99],[-40,-81],[-35,-68],[-35,-85]]);
  limb(g,[[23,-124],[37,-104],[48,hand]],p,12);
  blade(g,p,49,hand,t);
  for(const side of [-1,1])panel(g,p,[[side*13,-130],[side*25,-138],[side*38,-127],[side*37,-120],[side*24,-114],[side*16,-119]],
    [[side*24,-128],[side*37,-126],[side*36,-120],[side*24,-115]]);
  panel(g,p,[[-12,-129],[-1,-136],[14,-132],[12,-117],[0,-105],[-12,-117]]);
  wire(g,[[-9,-124],[0,-115],[10,-124]],p.ink,5);
  wire(g,[[-8,-124],[0,-117],[8,-123]],p.light,2);
  mask(g,p,'arbiter');
}
function folio(g,p,x,y,angle){
  g.save();g.translate(x,y);g.rotate(angle);
  plate(g,[[-8,-12],[6,-13],[10,-8],[8,12],[-7,14]],p.ink,p.plate,1.3);
  wire(g,[[-5,-8],[5,-9]],p.light,1.7);
  for(let i=0;i<3;i++)wire(g,[[-5,-4+i*4],[i===2?0:5,-5+i*4]],p.steel,1);
  g.restore();
}
function archivist(g,p,t,open){
  const drift=Math.sin(t*1.65)*2;
  for(let i=0;i<3;i++){
    const phi=t*.62+i*TAU/3;
    folio(g,p,Math.cos(phi)*39,-150+Math.sin(phi)*13,.13*Math.sin(phi));
  }
  leg(g,p,-1,false);leg(g,p,1,false);
  plate(g,[[-18,-137],[10,-136],[20,-124],[17,-87],[29,-26],[13,-36],[5,-19],[-2,-43],[-15,-24],[-34,-17],[-21,-82]],p.steel,p.ink,2);
  for(const side of [-1,1]){
    plate(g,[[side*16,-136],[side*20,-129],[side*13,-91],[side*26,-30],[side*12,-45],[side*4,-87]],p.ink,p.steel);
    wire(g,[[side*15,-127],[side*8,-88],[side*19,-48]],p.light,1.2);
  }
  panel(g,p,[[-14,-131],[4,-134],[16,-125],[9,-100],[2,-78],[-10,-99]],
    [[5,-133],[15,-124],[8,-100],[2,-78],[1,-98]]);
  for(let i=0;i<4;i++)wire(g,[[-8,-119+i*6],[6-i,-121+i*6]],p.ink,1.7);
  const h=-104+(open?6:0)+drift;
  limb(g,[[-15,-125],[-29,-105],[-43,h-3]],p,9);
  limb(g,[[15,-125],[27,-102],[41,h]],p,9);
  for(const side of [-1,1]){
    panel(g,p,[[side*12,-132],[side*21,-133],[side*27,-117],[side*21,-109],[side*11,-123]]);
    joint(g,side*42,h-(side===-1?3:0),3.8,p);
    folio(g,p,side*47,h-15,.21*side);
  }
  mask(g,p,'archivist');
}
function weaver(g,p,t,open){
  const points=[];
  for(const side of [-1,1]){
    for(let i=0;i<2;i++){
      const d=Math.sin(t*1.55+i*1.8+side*.4)*3, length=open?5:0;
      const root=[side*14,-115+i*9],elbow=[side*(37+i*3),-160+i*47+d],tip=[side*(54+i*8-length),-134+i*51+d];
      limb(g,[root,elbow,tip],p,4.5);joint(g,...elbow,2.7,p);
      plate(g,[[tip[0]-2,tip[1]-4],[tip[0]+2,tip[1]],[tip[0]+side*5,tip[1]+12]],p.face,p.steel,1);
      points.push(tip);
    }
  }
  wire(g,[points[0],points[1],[0,-66],points[3],points[2]],p.light+'9a',1);
  wire(g,[points[0],[0,-108],points[2]],p.light+'68',.8);
  leg(g,p,-1,false);leg(g,p,1,false);
  for(const side of [-1,1]){
    plate(g,[[side*10,-95],[side*15,-94],[side*21,-67],[side*15,-49],[side*19,-24],[side*8,-49],[side*13,-66]],p.ink,p.plate,1.2);
    limb(g,[[side*16,-126],[side*27,-107],[side*21,-89]],p,7);
    joint(g,side*21,-88,3.2,p);
  }
  plate(g,[[-14,-134],[11,-135],[23,-123],[15,-113],[7,-99],[10,-86],[0,-78],[-10,-88],[-7,-101],[-19,-117]],p.ink,p.steel);
  for(let i=0;i<3;i++){
    const y=-127+i*8,w=17-i*3;
    for(const side of [-1,1])panel(g,p,[[side*3,y],[side*w,y-6],[side*(w+1),y+1],[side*5,y+7]]);
  }
  wire(g,[[0,-127],[0,-98],[2,-90]],p.light,2.4);
  mask(g,p,'weaver');
}
const figures={arbiter,archivist,weaver};
function figure(g,id,t,open,flash=0){
  const p=alloy[id];g.lineCap='round';g.lineJoin='round';
  const swell=Math.sin(t*1.55)*1.2;
  g.translate(0,swell);g.rotate(open?.025:0);
  figures[id](g,p,t,open);
  coreSignal(g,id,t,open,flash);
}
function coreSignal(g,id,t,open,flash){
  if(open||flash>.1){
    const y=id==='arbiter'?-115:id==='archivist'?-112:-108,r=6+Math.sin(t*4);
    g.strokeStyle='#e2fff5';g.lineWidth=1;
    g.beginPath();g.arc(0,y,r+2,0,TAU);g.stroke();
    plate(g,[[-r,y],[0,y-r],[r,y],[0,y+r]],flash>.4?'#fff':'#aeffde','#395f57',1);
  }
}
const actChanges=new WeakMap();
function boss(g,e,id,run){
  if(!figures[id])return false;
  const h=(e.h||e.d.h*e.d.sc)*(e.sv||1);
  const inspection=PF.figures?.sheet('constructs',id);
  if(inspection?.manifest){
    const old=actChanges.get(run);
    if(!old||old.phase!==run.phase)actChanges.set(run,{phase:run.phase,start:run.elapsed});
    const sincePhase=run.elapsed-actChanges.get(run).start;
    let action=e.hurtT>.12||run.mode==='expose'?'hurt':run.mode==='mechanic'?'attack':'idle';
    if(inspection.manifest.extra&&action==='attack'){
      if(run.elapsed<1.35)action='entrance';
      else if(run.phase>0&&sincePhase<1.28)action='phase';
      else if(run.stageIndex===run.stageCount-1)action=run.skill===run.phaseSkill?'special':'heavy';
      else if(run.remaining<.82&&['needle','shear','sweep'].includes(run.skill?.id))action='heavy';
    }
    const seconds=(inspection.manifest.clips[action]||inspection.manifest.extra.clips[action]).seconds;
    let phase=run.elapsed/seconds;
    if(action==='entrance')phase=run.elapsed/1.35;
    else if(action==='phase')phase=sincePhase/1.28;
    else if(['attack','heavy','special'].includes(action)){
      const elapsed=run.beatDuration-run.remaining;
      // Settle from the preceding stroke, track the target, then release at
      // the same instant as the floor mark is judged.
      if(run.stageIndex>0&&elapsed<.28)phase=.66+.34*clamp(elapsed/.28,0,1);
      else if(run.remaining<.75)phase=.26+.40*(1-clamp(run.remaining/.75,0,1));
      else phase=.07+.17*clamp(elapsed/Math.max(.1,run.beatDuration-.75),0,1)+.025*Math.sin(elapsed*3);
    }else if(action==='hurt'){
      if(run.mode==='expose'){
        const open=run.boss.openSeconds-run.remaining;
        phase=run.remaining<.34 ? .52+.48*(1-clamp(run.remaining/.34,0,1))
          : .52*clamp(open/.39,0,1)+.025*Math.sin(open*3);
      }else phase=clamp(1-e.hurtT/.32,0,1);
    }
    if(PF.figures.paint(g,'constructs',id,action,phase,e.x,e.y-(e.z||0)+3,h,e.f||1,action==='idle',e)){
      g.save();g.translate(e.x,e.y-(e.z||0)+3);g.scale((e.f||1)*h/174,h/174);
      coreSignal(g,id,run.elapsed,run.mode==='expose',e.flash||0);g.restore();return true;
    }
  }
  if(PF.figures){
    g.save();g.translate(e.x,e.y-(e.z||0));g.strokeStyle=alloy[id].light;g.lineWidth=h*.012;
    g.beginPath();g.ellipse(0,0,h*.20,h*.062,0,0,TAU);g.stroke();g.restore();return true;
  }
  g.save();g.translate(e.x,e.y-(e.z||0)+3);g.scale((e.f||1)*h/174,h/174);
  if(e.hurtT>0)g.rotate(-clamp(e.hurtT,0,.35)*.10);
  figure(g,id,run.elapsed,run.mode==='expose',e.flash||0);
  g.restore();return true;
}
function portrait(canvas,id){
  if(!canvas||!figures[id])return;
  // Use a fixed landscape backing store. Canvas CSS may be measured while
  // the native dialog is closed, and measuring then would produce zero.
  const w=600,h=244,p=alloy[id];canvas.width=w;canvas.height=h;
  const g=canvas.getContext('2d');if(!g)return;
  const bg=g.createLinearGradient(0,h,w,0);bg.addColorStop(0,'#090f13');bg.addColorStop(.62,p.ink);bg.addColorStop(1,'#10171b');
  g.fillStyle=bg;g.fillRect(0,0,w,h);
  const halo=g.createRadialGradient(w*.5,h*.48,0,w*.5,h*.48,h*.73);
  halo.addColorStop(0,p.light+'42');halo.addColorStop(1,p.light+'00');g.fillStyle=halo;g.fillRect(0,0,w,h);
  g.strokeStyle=p.light+'16';g.lineWidth=1;
  for(let y=16;y<h;y+=20){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  g.save();g.translate(w*.5,h*.54);g.rotate(id==='arbiter'?-.17:id==='archivist'?-.31:.18);
  g.strokeStyle=p.light+'47';g.setLineDash([56,8,5,8]);g.lineWidth=1.7;
  if(id==='arbiter'){g.strokeRect(-92,-92,184,184);g.strokeRect(-103,-103,206,206);}
  else if(id==='archivist'){for(const r of [95,103]){g.beginPath();g.ellipse(0,0,r,r*.87,0,0,TAU);g.stroke();}}
  else {for(const r of [95,105]){path(g,[[0,-r],[r,0],[0,r],[-r,0]]);g.closePath();g.stroke();}}
  g.restore();
  if(PF.figures){
    const record=PF.figures.poster(id);canvas.dataset.figureId=id;
    if(record.image){
      // Crop transparent studio margins so each card shows the equipment
      // at a comparable size without decoding three animation sheets.
      const source=record.image,box=record.bounds;
      if(box){const k=Math.min(w*.77/box.w,h*.88/box.h),dw=k*box.w,dh=k*box.h;
        g.drawImage(source,box.x,box.y,box.w,box.h,(w-dw)/2,h*.95-dh,dw,dh);}
    }else if(canvas.dataset.figurePending!==id){
      canvas.dataset.figurePending=id;
      const refresh=ok=>{if(ok&&canvas.isConnected&&canvas.dataset.figureId===id)portrait(canvas,id);};
      record.ready.then(refresh);
    }
    return;
  }
  g.save();g.translate(w*.5,h*1.04);g.scale(1.29,1.29);figure(g,id,1.6,false);g.restore();
}

// Shape paths are authored on the uncompressed floor; draw them under the
// same projection as hit testing. Line endpoints use round collision caps.
function contour(g,m,fy){
  const y=m.y/fy;g.beginPath();
  if(m.shape==='line'){
    const ey=m.y2/fy,a=Math.atan2(ey-y,m.x2-m.x);
    g.arc(m.x2,ey,m.r,a-Math.PI/2,a+Math.PI/2);
    g.arc(m.x,y,m.r,a+Math.PI/2,a+1.5*Math.PI);g.closePath();
  }else{
    g.arc(m.x,y,m.r,0,TAU);g.closePath();
    if(m.shape==='ring'&&m.inner>0){g.moveTo(m.x+m.inner,y);g.arc(m.x,y,m.inner,0,TAU,true);g.closePath();}
  }
}
const markColors={danger:'#ff8571',safe:'#8df6d2',target:'#fff1a3',cue:'#dfd4ff'};
function mark(g,m,t,fy,px){
  const color=markColors[m.kind]||markColors.cue, safe=m.kind==='safe',goal=m.kind==='target',hazard=m.kind==='danger';
  const urgent=hazard&&t<2;
  g.save();g.scale(1,fy);contour(g,m,fy);
  g.fillStyle=color+(hazard?(urgent?'47':'2e'):safe?'2b':goal?'23':'10');g.fill('evenodd');
  if(hazard){
    g.save();g.clip('evenodd');g.beginPath();
    const minX=Math.min(m.x,m.x2??m.x)-m.r,maxX=Math.max(m.x,m.x2??m.x)+m.r;
    const minY=Math.min(m.y,m.y2??m.y)/fy-m.r,maxY=Math.max(m.y,m.y2??m.y)/fy+m.r;
    const h=maxY-minY,spacing=Math.max(32,18*px);
    for(let x=minX-h;x<maxX;x+=spacing){g.moveTo(x,minY);g.lineTo(x+h,maxY);}
    g.strokeStyle=color+'65';g.lineWidth=px;g.stroke();g.restore();
  }
  contour(g,m,fy);g.lineWidth=5*px;g.strokeStyle='#071016c2';g.stroke();
  if(goal||m.kind==='cue')g.setLineDash(goal?[12*px,5*px]:[3*px,6*px]);
  g.strokeStyle=color;g.lineWidth=(urgent?3.1:2)*px;g.stroke();g.restore();
}
function pin(g,m,px,fy){
  const title=m.label;if(!title)return;
  // Place annulus labels on the band; the empty middle usually holds the boss.
  const x=m.x,y=m.y+(m.shape==='ring'?(m.inner+m.r)*.5*fy:0);
  g.save();g.translate(x,y);g.scale(px,px);
  g.font='bold 12px "Malgun Gothic", sans-serif';g.textBaseline='middle';g.textAlign='center';
  const w=Math.ceil(g.measureText(title).width)+12;
  g.fillStyle='#061019e8';g.fillRect(-w/2,-9,w,18);
  g.fillStyle=markColors[m.kind];g.fillRect(-w/2,-9,2,18);g.fillText(title,0,.5);g.restore();
}
function floor(g,run,id){
  if(!alloy[id])return;
  const {cx,cy,fsy}=PF.raidEncounter.arena,light=alloy[id].light,t=run.elapsed;
  // The output canvas may be downsampled on touch devices; keep outlines
  // and labels legible in CSS pixels at every camera zoom.
  const scale=Math.abs(g.getTransform().a)||1;
  const px=clamp(g.canvas.width/(window.innerWidth||g.canvas.width)/scale,.7,9);
  g.save();g.translate(cx,cy);g.scale(1,fsy);
  g.lineWidth=3;g.strokeStyle=light+'55';g.setLineDash([45,12,5,12]);
  g.beginPath();g.arc(0,0,600,0,TAU);g.stroke();g.setLineDash([]);
  for(const side of [-1,1]){
    wire(g,[[side*630,-26],[side*612,0],[side*630,26]],light+'65',3);
    wire(g,[[-30,side*627],[0,side*608],[30,side*627]],light+'65',3);
  }
  const line=[[8,-208],[-18,-144],[16,-97],[-12,-62],[7,-16],[-16,22],[12,61],[-5,108],[14,133],[5,188]];
  wire(g,line,'#10151e',13);wire(g,line,light+'7d',3);
  if(run.mode==='expose'){
    const u=(Math.sin(t*3)+1)*.5;
    g.beginPath();g.arc(0,0,112+u*16,0,TAU);g.lineWidth=4;g.strokeStyle='#c3ffe1';g.stroke();
  }
  g.restore();
  for(const m of run.marks)mark(g,m,run.remaining,fsy,px);
  for(const m of run.marks)pin(g,m,px,fsy);
}
PF.raidArt={boss,floor,portrait};
})();

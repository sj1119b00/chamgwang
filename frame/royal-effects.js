// Signature spell choreography. All points in this module are projected world
// coordinates. Collision stays in king.js and uses the original floor shape.
(() => {
'use strict';
const PF=window.PF, FY=RPG.sv.FSY, TAU=Math.PI*2;
const sat=x=>Math.max(0,Math.min(1,x)), ease=x=>1-(1-sat(x))**3;
const art=new Map(), effects=[];
const dir='assets/campaign/royal/';
function preload(profile){
  if(art.has(profile.key)) return;
  const strip=new Image(), object=new Image();
  strip.src=dir+profile.key+'.webp';
  object.src=dir+profile.key+'-relic.webp';
  art.set(profile.key,{strip,object});
}
function stroke(g,pts,color,width,alpha=1){
  g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';
  g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.stroke();g.restore();
}
function oval(g,x,y,rx,ry,color,width,alpha=1){
  g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=width;g.beginPath();
  g.ellipse(x,y,rx,ry,0,0,TAU);g.stroke();g.restore();
}
function glint(g,x,y,r,color,alpha){
  g.save();g.globalAlpha*=alpha;const grad=g.createRadialGradient(x,y,0,x,y,r);
  grad.addColorStop(0,'#fffdeb');grad.addColorStop(.16,color);grad.addColorStop(1,color+'00');
  g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);g.restore();
}
function picture(g,img,x,y,w,h,angle,alpha,frame){
  if(!(img?.complete&&img.naturalWidth))return;
  g.save();g.globalAlpha*=sat(alpha);g.translate(x,y);g.rotate(angle);
  if(frame==null)g.drawImage(img,-w/2,-h/2,w,h);
  else {
    const cell=img.naturalWidth/4,f=Math.min(11,Math.floor(sat(frame)*12));
    g.drawImage(img,(f%4)*cell,Math.floor(f/4)*cell,cell,cell,-w/2,-h/2,w,h);
  }
  g.restore();
}
function targets(shapes){
  const pts=[];
  for(const s of shapes){
    if(s.type==='ring'){
      for(let i=0;i<7;i++){
        const a=(i+.23)*TAU/7,r=(s.r0+s.r1)/2;pts.push([s.x+r*Math.cos(a),FY*(s.y+r*Math.sin(a))]);
      }
    } else if(s.type==='cone'){
      for(const u of [-.72,0,.72]){
        const a=s.ang+s.half*u,r=s.r*.64;pts.push([s.x+Math.cos(a)*r,(s.y+Math.sin(a)*r)*FY]);
      }
    } else if(s.type==='line'){
      const steps=shapes.length>1?[.69]:[.28,.59,.89];
      for(const u of steps) pts.push([s.x+Math.cos(s.ang)*s.len*u,(s.y+Math.sin(s.ang)*s.len*u)*FY]);
    } else pts.push([s.x,s.y*FY]);
  }
  return pts;
}
function prepare(t,profile){
  preload(profile);t.profile=profile;t.points=targets(t.shapes);
  t.pivot=t.points[Math.floor(t.points.length/2)];
  return t;
}
function release(t){
  const a={...t,age:0,life:t.profile.key==='signal'?1.24:1.04};
  effects.push(a);if(effects.length>3) effects.shift();
  const [x,y]=a.pivot;
  if(window.GFX?.on)GFX.light(x,y,530,a.profile.color,.94,.28,{z:80});
}
function advance(dt){
  for(let i=effects.length-1;i>=0;i--)if((effects[i].age+=dt)>effects[i].life)effects.splice(i,1);
}
function clear(){effects.length=0;}
function packetRoute(g,t,u,charged){
  const [x,y]=t.pivot, sx=t.x,sy=t.y-190;
  const route=[[sx,sy],[sx+(x-sx)*.37,sy-35],[sx+(x-sx)*.58,y-65],[x,y-65],[x,y-8]];
  stroke(g,route,t.profile.color,charged?10:5,charged?.38:.54);
  for(let i=0;i<4;i++){
    const k=((u*1.4+i*.25)%1)*4,j=Math.floor(k),q=k-j,a=route[j],b=route[j+1];
    const cx=a[0]+(b[0]-a[0])*q,cy=a[1]+(b[1]-a[1])*q;
    g.fillStyle=i%2?'#bafffa':'#66d7ff';g.fillRect(cx-8,cy-5,16,10);
  }
}
function filigree(g,t,u,impact){
  const {color,light}=t.profile;
  for(const s of t.shapes){
    const x=s.x,y=s.y*FY;
    if(s.type==='line'){
      const dx=Math.cos(s.ang)*s.len,dy=Math.sin(s.ang)*s.len*FY;
      const a=impact?0:u*.60,b=impact?1:Math.min(1,a+.16);
      stroke(g,[[x+dx*a,y+dy*a],[x+dx*b,y+dy*b]],color,impact?12:7,.70);
      if(impact)stroke(g,[[x+dx*.08,y+dy*.08],[x+dx*.96,y+dy*.96]],light,3,.85);
    } else if(s.type==='ring'){
      const r=s.r0+(s.r1-s.r0)*(impact?u:.17+.65*u);
      oval(g,x,y,r,r*FY,color,impact?10:5,.68);
    } else if(s.type==='cone'){
      const r=s.r*(impact?.87:.68+.20*u),pts=[];
      for(let i=0;i<=18;i++){const a=s.ang-s.half+s.half*i/9;pts.push([x+Math.cos(a)*r,y+Math.sin(a)*r*FY]);}
      stroke(g,pts,color,impact?11:5,.75);
    } else oval(g,x,y,s.r*(.62+.26*u),s.r*FY*(.62+.26*u),color,impact?9:4,.58);
  }
}
function prepareCast(g,t){
  const f=sat(t.t/t.win),p=t.profile,img=art.get(p.key)?.object;
  const size=(145+f*95), x=t.x, y=t.y-295-36*f;
  g.save();filigree(g,t,f,false);
  glint(g,x,y,size*.60,p.color,.12+.14*f);
  picture(g,img,x,y,size,size,.09*Math.sin(f*4),.42+.54*f);
  // Brackets close on the point that will be overwritten, in world space.
  if(p.key==='root'){
    packetRoute(g,t,f,false);
    const [cx,cy]=t.pivot,rr=80+(1-f)*68,shape=t.shapes[0];
    if(t.id==='sweep'){
      for(const side of [-1,1]){
        const a=shape.ang+side*shape.half*(1-.52*f),r=shape.r*.67;
        const sx=shape.x+Math.cos(a)*r,sy=(shape.y+Math.sin(a)*r)*FY;
        stroke(g,[[sx-23,sy-88],[sx+23,sy-42],[sx-23,sy+4]],'#ffc67b',8,.84);
      }
    }else if(t.id==='slam'){
      for(const dx of [-1,1])for(const dy of [-1,1]){
        stroke(g,[[cx+dx*rr*.58,cy+dy*rr*.56],[cx+dx*rr,cy+dy*rr*.56],[cx+dx*rr,cy+dy*rr*.30]],p.color,7,.9);
      }
    }
  }
  g.restore();
}
function bell(g,x,y,s,u,p){
  for(let i=0;i<3;i++){
    const a=sat(u*1.46-i*.13),r=s*(.23+a*.84);
    oval(g,x,y,r,r*FY,p.color,3+8*(1-a),1-a);
  }
}
function turbine(g,x,y,s,u,p){
  for(let i=0;i<3;i++){
    const angle=i*TAU/3+u*5.5,pts=[];
    for(let j=0;j<10;j++){
      const v=j/9,a=angle+v*1.33,r=s*(.09+(.66+.18*u)*v);pts.push([x+r*Math.cos(a),y+r*FY*Math.sin(a)]);
    }
    stroke(g,pts,p.color,18*(1-u)+3,.83);stroke(g,pts,p.light,4,.9);
  }
}
function mirror(g,x,y,s,u,p){
  for(let i=0;i<5;i++){
    const a=i*TAU/5+.43,dx=Math.cos(a)*s*(.18+.62*u),dy=Math.sin(a)*s*.22;
    const h=s*(.20+.21*(i%3))*Math.sin(.42+u*2.4);
    const pts=[[x+dx,y+dy],[x+dx+h*.23,y+dy-h],[x+dx+h*.48,y+dy-h*.30],[x+dx,y+dy]];
    g.fillStyle=i%2?'#47376cb5':'#a7a9e99a';g.beginPath();pts.forEach(([a,b],j)=>j?g.lineTo(a,b):g.moveTo(a,b));g.fill();
    stroke(g,pts,p.color,4,.9);stroke(g,[pts[1],pts[2]],p.light,6,.8);
  }
}
function senate(g,x,y,s,u,p){
  for(let i=-1;i<=1;i++){
    const dx=i*s*.21,fall=s*(1-ease(u*2.8))*.78,at=[x+dx,y+Math.abs(i)*16-fall];
    const tip=[at[0]+s*.25,at[1]-s*.92];
    stroke(g,[tip,at],p.color,20,.27);stroke(g,[tip,at],p.light,6,.95);
    stroke(g,[[at[0]+s*.02,at[1]-s*.22],at,[at[0]+s*.13,at[1]-s*.17]],p.light,10,.96);
  }
}
function banksia(g,x,y,s,u,p){
  for(let i=0;i<6;i++){
    const a=i*TAU/6+.2,dx=Math.cos(a)*s*ease(u*3),dy=Math.sin(a)*s*FY*ease(u*3),pts=[[x,y],[x+dx*.27-dy*.19,y+dy*.29],[x+dx*.56+dy*.12,y+dy*.51-13],[x+dx*.93,y+dy]];
    stroke(g,pts,'#714c30',19,.91);stroke(g,pts,p.color,6,.8);
    stroke(g,[pts[1],[x+dx*.49-dy*.3,y+dy*.49+dx*.14]],'#92b85f',7,.83);
  }
}
function bullion(g,x,y,s,u,p){
  for(let i=0;i<8;i++){
    const a=i*TAU/8+.17,r=s*(.22+.65*u),cx=x+Math.cos(a)*r,cy=y+Math.sin(a)*r*FY-Math.sin(u*Math.PI)*s*(.26+.15*(i%3));
    const rx=8+Math.abs(Math.sin(i*2+u*10))*s*.075;
    g.fillStyle='#997029';g.beginPath();g.ellipse(cx,cy,rx,s*.085,0,0,TAU);g.fill();
    oval(g,cx,cy,rx,s*.085,p.light,3,.9);
  }
}
function iron(g,x,y,s,u,p){
  for(let i=-1;i<=1;i++){
    const dx=i*s*.18,pts=[[x+dx-s*.37,y+s*.15],[x+dx-s*.12,y-s*.02],[x+dx+s*.18,y-s*(.26+.2*u)],[x+dx+s*.34,y-s*(.41+.37*u)]];
    stroke(g,pts,'#402121',24,.96);stroke(g,pts,p.color,12,.9);stroke(g,pts.slice(1),p.light,4,.9);
  }
}
function rootAccess(g,x,y,s,u,p){
  // Raised circuit segments and packets describe a route rather than a round magical aura.
  for(let i=0;i<5;i++){
    const side=i%2?1:-1,dy=(i-2)*s*.13,spread=s*(.36+.49*ease(u*2));
    const pts=[[x,y-22],[x+side*spread*.27,y-22+dy*.26],[x+side*spread*.48,y-22+dy],[x+side*spread,y-22+dy],[x+side*spread,y+dy-s*(.17+.16*(i%3))]];
    stroke(g,pts,p.color,13,.31);stroke(g,pts,p.light,4,.98);
    const q=pts[4];g.fillStyle=i%2?'#b9ffff':'#46efc7';g.fillRect(q[0]-9,q[1]-9,18,18);
  }
  g.save();g.font='bold '+Math.round(s*.077)+'px monospace';g.fillStyle='#a8fff0';
  g.fillText(['R0 / 0F','SYNC:7F','R0 / 31'][Math.min(2,Math.floor(u*3))],x-s*.47,y-s*.44);g.restore();
}
function resonance(g,x,y,s,u,p){
  for(let i=0;i<7;i++){
    const a=i*TAU/7+.47,pts=[];
    for(let j=0;j<13;j++){
      const v=j/12,r=s*(.12+.90*v)*(.47+ease(u*2)*.56);
      const theta=a+Math.sin(v*2.9-u*3.4)*.62;
      pts.push([x+Math.cos(theta)*r,y+Math.sin(theta)*r*FY-Math.sin(v*Math.PI)*s*(.25+.19*Math.sin(a+u))]);
    }
    stroke(g,pts,i%2?p.color:p.light,11,.50);stroke(g,pts,i%2?'#e1ddff':'#fff5bc',3,.97);
    const [cx,cy]=pts[12];glint(g,cx,cy,s*.045,p.light,.88);
  }
}
const motifs={bell,turbine,mirror,senate,banksia,bullion,iron,root:rootAccess,signal:resonance};
function protocol(g,t,u){
  const s=t.shapes[0],p=t.profile;
  packetRoute(g,t,u,true);
  if(t.id==='slam'){
    const x=s.x,y=s.y*FY,w=s.r*1.6,h=s.r*1.8,scan=ease(u*1.65);
    // A standing terminal plane writes one horizontal row at a time.
    const top=y-h;
    g.save();g.translate(x,y);g.transform(1,-.14,0,1,0,0);
    const grd=g.createLinearGradient(0,-h,0,0);grd.addColorStop(0,'#1e65ab0d');grd.addColorStop(1,'#22d7d52e');
    g.fillStyle=grd;g.fillRect(-w/2,-h,w,h);
    stroke(g,[[-w/2,0],[-w/2,-h],[w/2,-h],[w/2,0]],'#9dfcff',7,.88);
    for(let j=0;j<7;j++){
      const cy=-h+j*h/7;stroke(g,[[-w*.5,cy],[w*.5,cy]],p.color,2,.42);
      if(j%2===0){g.fillStyle='#b3ffff';g.font='bold 22px monospace';g.fillText(['X / 1A','Y / 3E','Z / 0C','W / 7F'][j/2],-w*.45,cy+25);}
    }
    const row=-h+scan*h;g.fillStyle='#5cfff859';g.fillRect(-w/2,row-16,w,27);
    stroke(g,[[-w*.5,row],[w*.5,row]],'#f0ffff',7,.94);g.restore();
    glint(g,x,top+scan*h,s.r*.40,p.color,.35);
  }else if(t.id==='sweep'){
    for(let i=0;i<6;i++){
      const a=s.ang-s.half+(i+.45)/6*s.half*2,r=s.r*.78;
      const x=s.x+Math.cos(a)*r,y=(s.y+Math.sin(a)*r)*FY;
      const h=(185+50*Math.sin(i*1.2))*(.7+.3*ease(u*3)),w=110;
      g.save();g.translate(x,y);g.transform(1,-.18*Math.cos(a),0,1,0,0);
      g.fillStyle=i%2?'#5137469e':'#60463397';g.fillRect(-w/2,-h,w,h);
      stroke(g,[[-w/2,0],[-w/2,-h],[w/2,-h]],'#ffbd68',6,.95);
      stroke(g,[[-w*.31,-h*.74],[w*.31,-h*.32]],'#ffe1a5',9,.93);
      stroke(g,[[w*.31,-h*.74],[-w*.31,-h*.32]],'#ffe1a5',9,.93);
      g.restore();
    }
  }else if(t.id==='charge'){
    const nx=-Math.sin(s.ang),ny=Math.cos(s.ang)*FY;
    for(const v of [.22,.52,.82]){
      const cx=s.x+Math.cos(s.ang)*s.len*v,cy=(s.y+Math.sin(s.ang)*s.len*v)*FY;
      const w=s.w*.43,h=s.w*(.7+.12*Math.sin(u*7+v));
      const pts=[[cx-nx*w,cy-ny*w],[cx-nx*w,cy-ny*w-h],[cx+nx*w,cy+ny*w-h],[cx+nx*w,cy+ny*w]];
      stroke(g,pts,p.color,13,.39);stroke(g,pts,'#b3ffff',4,.93);
    }
  }
}
function phaseLight(g,t,u){
  const s=t.shapes[0],p=t.profile;
  if(t.id==='ring'){
    for(const side of [-1,1]){
      const pts=[];
      for(let i=0;i<=84;i++){
        const a=i/84*TAU,phase=a*7+side*u*7;
        const r=s.r0+(s.r1-s.r0)*(.48+.30*Math.sin(phase));
        pts.push([s.x+Math.cos(a)*r,(s.y+Math.sin(a)*r)*FY-36-24*Math.cos(phase)]);
      }
      stroke(g,pts,side<0?p.color:p.light,14,.42);stroke(g,pts,side<0?'#f1d7ff':'#ffef9e',4,.91);
    }
  }else if(t.id==='fan'){
    t.shapes.forEach((ray,i)=>{
      const c=i%2?p.light:p.color,pts=[];
      for(let j=0;j<=10;j++){
        const v=j/10,bend=Math.sin(v*Math.PI)*(i-3)*14;
        pts.push([ray.x+Math.cos(ray.ang)*ray.len*v-Math.sin(ray.ang)*bend,
          (ray.y+Math.sin(ray.ang)*ray.len*v+Math.cos(ray.ang)*bend)*FY-(1-v)*120]);
      }
      stroke(g,pts,c,21,.24);stroke(g,pts,c,6,.79);
      const head=pts[Math.min(10,Math.floor(ease(u*2+.12)*10))];glint(g,head[0],head[1],60,c,.77);
    });
  }else if(t.id==='slam'){
    const at=[s.x,s.y*FY],h=s.r*(1.4+.8*(1-u));
    for(const a of [-.45,0,.39])stroke(g,[[at[0]+h*a,at[1]-h],at],p.light,a===0?22:8,.60);
    glint(g,at[0],at[1]-40,s.r*.49,p.light,.53*(1-u));
  }else if(t.id==='summon'){
    for(const gate of t.shapes)for(let i=0;i<3;i++){
      const r=gate.r*(.52+i*.20),y=gate.y*FY-(i+1)*38*(.48+ease(u*2));
      oval(g,gate.x,y,r,r*.32,i%2?p.light:p.color,5,.77);
    }
  }
}
function discharge(g,t,u,calm){
  const {color,light}=t.profile,flash=1-sat(u*2.2);
  for(const s of t.shapes){
    const x=s.x,y=s.y*FY;
    if(s.type==='line'){
      const dx=Math.cos(s.ang),dy=Math.sin(s.ang)*FY,travel=ease(.18+u*2.6);
      const head=travel*s.len,tail=Math.max(0,head-s.len*(.26+.30*flash));
      const points=[[x+dx*tail,y+dy*tail],[x+dx*head,y+dy*head]];
      stroke(g,points,color,Math.min(s.w*.26,38),.19+.30*flash);
      stroke(g,points,light,4+6*flash,.78);
      if(!calm)glint(g,points[1][0],points[1][1],Math.min(94,s.w*.50),light,.72*flash);
    } else if(s.type==='cone'){
      const pts=[],sweep=-s.half+2*s.half*ease(.15+u*2.1);
      for(let j=0;j<=16;j++){
        const a=s.ang+Math.max(-s.half,sweep-.92)+j/16*(sweep-Math.max(-s.half,sweep-.92));
        pts.push([x+Math.cos(a)*s.r*.80,y+Math.sin(a)*s.r*FY*.80]);
      }
      stroke(g,pts,color,25,.6);stroke(g,pts,light,6,.9);
    } else if(s.type==='ring'){
      const r=s.r0+(s.r1-s.r0)*ease(.09+u*1.85);
      oval(g,x,y,r,r*FY,color,24,.23);oval(g,x,y,r,r*FY,light,5,.82);
    } else if(t.id==='summon'){
      const h=s.r*(.9+.56*Math.sin(u*Math.PI));
      oval(g,x,y-h*.76,s.r*.85,h,light,4,.81);
      stroke(g,[[x,y-h*1.55],[x,y]],color,11,.66);
    } else if(flash>0){
      const height=s.r*(1+.8*flash);
      stroke(g,[[x+height*.13,y-height],[x,y]],light,7+7*flash,flash*.75);
    }
  }
}
function drawRelease(g,t){
  const u=sat(t.age/t.life),p=t.profile,imgs=art.get(p.key),[x,y]=t.pivot;
  const calm=!!RPG.api.SV.opt?.calm,fade=1-sat((u-.52)/.48);
  const size=t.shapes.length===1&&t.shapes[0].type==='circle'?t.shapes[0].r:260;
  g.save();g.globalAlpha*=fade;filigree(g,t,ease(u*2.1),true);discharge(g,t,u,calm);
  if(p.key==='root')protocol(g,t,u);
  if(p.key==='signal')phaseLight(g,t,u);
  for(let i=0;i<t.points.length;i++){
    const [px,py]=t.points[i],primary=px===x&&py===y;
    if(!primary&&calm&&i%2)continue;
    const s=primary?size:size*.60;
    if((primary||t.points.length<=3)&&(p.key!=='root'||t.id==='charge'))motifs[p.key](g,px,py,s,u,p);
    glint(g,px,py,s*(.60+u*.26),p.color,(calm?.22:.38)*(1-u));
    const w=s*(primary?2.72:1.8);
    const clarity=p.key==='root'&&t.id!=='charge'?.50:p.key==='signal'&&t.id==='slam'?.77:1;
    picture(g,imgs?.strip,px,py-w*.12,w,w*.87,0,(calm?.54:.94)*(primary?1:.77)*clarity,sat(.12+u*.85));
  }
  const broad=p.key==='root'||p.key==='signal',falling=['bell','senate','bullion','iron'].includes(p.key);
  const scale=size*(broad?1.46:1.25)*(1+.13*Math.sin(u*Math.PI));
  const rise=falling?-(1-ease(u*3.4))*size*.56:-Math.sin(u*Math.PI)*size*.24;
  const turn=p.key==='turbine'?u*4.3:p.key==='bell'?Math.sin(u*8)*.19:p.key==='mirror'?.22-u*.55:Math.sin(u*4)*.08;
  if(p.key!=='root'||t.id==='charge')picture(g,imgs?.object,x,y-scale*.40+rise,scale,scale,turn,1-sat((u-.43)/.49));
  g.restore();
}
PF.royalEffects={prepare,preload,release,advance,clear,prepareCast,drawRelease,effects};
})();

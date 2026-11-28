// 기존 생존 화면의 막대와 조작을 사용하고, 각 궁극기의 실제 충전량을 그 버튼에 표시한다.
(function(){
'use strict';
const PF=window.PF,G=window.RPG,hud=document.getElementById('shud');
const hp=hud.querySelector('.hpb'),xp=hud.querySelector('.xb'),ults=hud.querySelector('.ul');
const hpFill=hp.querySelector('i'),xpFill=xp.querySelector('i');
function meter(el,label){
  el.setAttribute('role','progressbar'); el.setAttribute('aria-label',label);
  el.setAttribute('aria-valuemin','0'); el.setAttribute('aria-valuemax','100');
}
meter(hp,'체력'); meter(xp,'경험치');
function reflect(el,fill){
  const value=String(Math.round(parseFloat(fill.style.width)||0));
  if(el.getAttribute('aria-valuenow')!==value) el.setAttribute('aria-valuenow',value);
}

let levelUp=null;
G.frame.onLevelUp=level=>{
  levelUp={level,cls:pl.cls,start:RT};
  G.sv.sfx('rise',.9,.6);
};

function drawLevelUp(){
  if(!levelUp) return;
  const age=RT-levelUp.start;
  if(age>=1.65||G.mode!=='surv'||pl.cls!==levelUp.cls){levelUp=null;return;}
  if(!pl.visible||pl.gy==null) return;

  const calm=G.api.SV.opt?.calm;
  const opacity=Math.min(1,(1.65-age)/.35);
  ctx.save();
  applyCam(ctx);
  ctx.translate(pl.x,pl.gy-pl.air);
  const radius=calm?112:88+84*(1-Math.exp(-5*age));
  ctx.globalAlpha=opacity;
  ctx.fillStyle='rgba(255,184,60,.16)';
  ctx.strokeStyle='#ffd477'; ctx.lineWidth=5;
  ctx.beginPath(); ctx.ellipse(0,0,radius,radius*G.sv.FSY,0,0,TAU); ctx.fill(); ctx.stroke();
  if(!calm){
    // Stagger the glints around the silhouette so the face and weapon stay visible.
    for(let i=0;i<10;i++){
      const rise=(age*.88+i*.37)%1, angle=i*TAU/10;
      const x=Math.cos(angle)*(radius-18), y=Math.sin(angle)*36-rise*320;
      const size=7*Math.sin(Math.PI*rise);
      ctx.globalAlpha=opacity*Math.sin(Math.PI*rise);
      ctx.fillStyle=i%2?'#fff1bd':'#ffc35a';
      ctx.beginPath(); ctx.moveTo(x,y-size*2); ctx.lineTo(x+size,y);
      ctx.lineTo(x,y+size*2); ctx.lineTo(x-size,y); ctx.closePath(); ctx.fill();
    }
  }
  // Keep the lettering legible at phone zoom while following the character in world space.
  const unit=W/(innerWidth*S*cam.z);
  ctx.translate(0,-G.sv.BODY*1.8);
  ctx.scale(unit,unit);
  const y=-5-(calm?0:5*Math.min(1,age*3));
  const size=clamp(innerHeight*.036,16,25);
  ctx.globalAlpha=opacity; ctx.font='900 '+size+'px '+FONT_K;
  ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.lineJoin='round'; ctx.lineWidth=4;
  const label='레벨 업 · Lv. '+levelUp.level;
  ctx.strokeStyle='#41260f'; ctx.strokeText(label,0,y);
  ctx.fillStyle='#ffe5a2'; ctx.fillText(label,0,y);
  ctx.restore();
}
const originalHUD=drawHUD;
drawHUD=function(){originalHUD.apply(this,arguments);drawLevelUp();};

function draw(){
  if(G.mode!=='surv') return;
  reflect(hp,hpFill); reflect(xp,xpFill);
  if(!PF.ultimate) return;
  for(const button of ults.children){
    const id=button.dataset.u,charge=PF.ultimate.percent(id),full=charge>=100;
    const ready=full&&PF.ultimate.ready(id);
    const value=String(Math.floor(charge)),remaining=Math.ceil(PF.ultimate.remaining(id));
    if(button.dataset.charge===value&&button.dataset.remaining===String(remaining)&&button.dataset.ready===String(ready)) continue;
    button.style.setProperty('--pf-charge',value+'%');
    button.dataset.charge=value; button.dataset.remaining=String(remaining); button.dataset.ready=String(ready);
    button.setAttribute('aria-disabled',String(!ready));
    const state=full?(ready?'준비':'잠김'):'충전 '+value+'% · '+remaining+'초';
    button.title=G.sv.SK[id].name+' · '+state;
    button.setAttribute('aria-label',button.title);
  }
}
const original=render;
render=function(){const result=original.apply(this,arguments);draw();return result;};
})();

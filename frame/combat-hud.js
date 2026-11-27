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

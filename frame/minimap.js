(function(){
'use strict';
const PF=window.PF, M=PF.map;
const RANGE=1800, PIXELS=280, R=PIXELS/2;
const mini=document.createElement('button');
mini.type='button'; mini.id='pfminimap'; mini.hidden=true; mini.setAttribute('aria-label','구역 지도 열기');
mini.innerHTML='<span data-mini="title"><span></span><span id="pf-subarea" role="status"></span></span><span class="pf-mini-disc"><canvas></canvas><i data-mini="player"></i><i data-mini="target" hidden></i><i data-mini="side" hidden></i></span>';
document.getElementById('pfui').appendChild(mini);
mini.addEventListener('pointerdown',e=>e.stopPropagation());
mini.onclick=e=>{ e.stopPropagation(); M.open('zone'); };
const title=mini.firstElementChild, canvas=mini.querySelector('canvas'), g=canvas.getContext('2d');
canvas.width=canvas.height=PIXELS;
const player=mini.querySelector('[data-mini=player]'), goal=mini.querySelector('[data-mini=target]');
const banner=mini.querySelector('#pf-subarea'), side=mini.querySelector('[data-mini=side]');
let bannerTimer=0, lastArea=null, lastSection='', symbols=[], symbolList=null, foundCount=-1, done=-1, cleared=-1;
let lastX=NaN, lastY=NaN, lastHead=NaN;
const colors={npc:'#91ebd5',node:'#e09393',portal:'#72dcea',exit:'#84c6cf',rest:'#80e6ac',secret:'#d6b6f6',chest:'#ccab7a',log:'#d6b6f6'};
function paintArea(a){
  const B=a.B, scale=R/RANGE;
  g.clearRect(0,0,PIXELS,PIXELS);
  if(a.place!=='endless'){
    g.drawImage(M.terrain(a),R+(B.l-pl.x)*scale,R+(B.t-pl.gy)*scale,(B.r-B.l)*scale,(B.b-B.t)*scale);
  }
  for(const p of symbols){
    if(p.done) continue;
    const x=R+(p.x-pl.x)*scale,y=R+(p.y-pl.gy)*scale;
    if(Math.hypot(x-R,y-R)>R) continue;
    g.fillStyle=p.open===false?'#e58977':colors[p.kind];
    g.strokeStyle='#122027'; g.lineWidth=1.6;
    if(p.kind==='node'){
      g.beginPath(); g.moveTo(x,y-5); g.lineTo(x+4,y); g.lineTo(x,y+5); g.lineTo(x-4,y); g.closePath();
    }else if(p.kind==='exit'||p.kind==='portal'){
      g.beginPath(); g.rect(x-4,y-4,8,8);
    }else{
      g.beginPath(); g.arc(x,y,p.kind==='rest'?6:4,0,2*Math.PI);
    }
    g.fill(); g.stroke();
  }
}
function locate(n,t,moved){
  if(!moved&&n.px===t?.x&&n.py===t?.y) return;
  n.hidden=!t;
  if(t){
    const p=M.edge(pl.x,pl.gy,t.x,t.y,RANGE), pad=p.inside?50:n===side?37:46;
    n.style.left=(50+(p.x-pl.x)*pad/RANGE)+'%'; n.style.top=(50+(p.y-pl.gy)*pad/RANGE)+'%';
    n.dataset.inside=String(p.inside); n.style.transform='translate(-50%, -50%) rotate('+p.ang+'rad)';
  }
  n.px=t?.x; n.py=t?.y;
}
// 도보 전환에는 road의 도착 표시가 있다. 같은 입장에 생성되는 기존 생존 모드의 장 제목은 치운다.
PF.field.onEvent(n=>{
  if(n!=='enter') return;
  for(let i=parts.length-1;i>=0;i--) if(parts[i].k==='banner'&&/^(CHAPTER|ZONE) /.test(parts[i].en)) parts.splice(i,1);
});
function draw(){
  const a=M.area();
  if(!a){ if(!mini.hidden) mini.hidden=true; lastArea=null; return; }
  const changed=lastArea!==a, detail=M.section(a), s=PF.save.data.story;
  mini.hidden=false;
  mini.classList.toggle('pf-mini-tight',parts.some(p=>p.k==='banner'));
  const msg=a.M?.msg?.t;
  document.body.classList.toggle('pf-entry-msg',a.field&&(msg===a.M.Z.no+'구역 · '+a.M.Z.name||msg==='제압한 구역 · 자유롭게 둘러보세요'));
  if(changed||detail!==lastSection){
    title.firstElementChild.textContent=a.name; banner.textContent=detail;
    mini.style.setProperty('--region',RPG.hub.ZONES[a.zone]?.acc||'#88d5bf');
    clearTimeout(bannerTimer); banner.classList.remove('on');
    if(!changed&&detail&&!PF.story.busy()){
      banner.classList.add('on');
      bannerTimer=setTimeout(()=>banner.classList.remove('on'),1500);
    }
    lastSection=detail;
  }
  const total=Object.keys(s.found||{}).length;
  const dirty=changed||symbolList!==PF.spots.list||total!==foundCount||done!==a.M?.done||cleared!==s.cleared;
  if(dirty){
    symbols=M.points(a); symbolList=PF.spots.list; foundCount=total; done=a.M?.done; cleared=s.cleared;
  }
  const moved=changed||lastX!==pl.x||lastY!==pl.gy;
  if(moved||dirty||a.version!==M.terrainVersion(a)) paintArea(a);
  const head=M.heading();
  if(changed||head!==lastHead) player.style.transform='translate(-50%, -50%) rotate('+head+'rad)';
  locate(goal,PF.quest.target(),moved); locate(side,PF.side?.target(),moved);
  lastArea=a; lastHead=head; lastX=pl.x; lastY=pl.gy;
}
// 배경 갱신을 생략한 시뮬레이션 프레임에서는 미니맵도 그리지 않는다.
const render0=render; render=function(){ render0.apply(this,arguments); draw(); };
PF.minimap={get on(){ return !mini.hidden&&RPG.mode==='surv'&&!PF.win.cur; }};
})();

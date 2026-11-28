// Post-campaign rift operations. Native class attacks resolve against the exposed weak point.
(function(){
'use strict';
const PF=window.PF, game=window.RPG, api=game.api, combat=game.sv, battle=combat.V;
const encounters=PF.raidEncounter, art=PF.raidArt, arena=encounters.arena;
const missions={
  arbiter:{floor:7,credits:600,closed:'판정관의 저울이 수평으로 멎었다. 끊어졌던 도로의 양쪽 끝이 다시 맞닿는다.'},
  archivist:{floor:4,credits:1100,closed:'기록관이 마지막 장을 덮었다. 같은 밤을 되살리던 거리에 다음 날의 불이 켜진다.'},
  weaver:{floor:5,credits:1800,closed:'직조자의 손에서 마지막 실이 풀렸다. 저편으로 기울었던 건물들이 제자리를 찾는다.'}
};
const story=()=>PF.save.data.story;
const unlocked=()=>story().cleared>=PF.field.COUNT&&!!story().seen?.['ep8.ending'];
const records=id=>story().raids?.[id];
const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const bossById=id=>encounters.bosses.find(b=>b.id===id);
let current=null, board=null, selectedId=encounters.bosses[0].id;
const results=document.getElementById('sres'), quit=document.querySelector('#rpause [data-p=quit]');
const hud=document.createElement('section');
hud.id='pf-raid-hud'; hud.hidden=true; hud.setAttribute('aria-label','균열 봉쇄 현황');
hud.innerHTML=`<div class="raid-hud-head"><b class="raid-title"></b><time class="raid-time"></time></div>
  <div class="raid-meter" role="progressbar" aria-label="보스 잔여 내구도" aria-valuemin="0" aria-valuemax="100"><i></i></div>
  <div class="raid-status"></div><div class="raid-order" aria-live="polite"></div><div class="raid-feedback" role="status" hidden></div>`;
document.body.appendChild(hud);
const partsHUD={title:hud.querySelector('b'),time:hud.querySelector('time'),bar:hud.querySelector('.raid-meter'),fill:hud.querySelector('i'),status:hud.querySelector('.raid-status'),order:hud.querySelector('.raid-order'),feedback:hud.querySelector('.raid-feedback')};

function mount(menu){
  const open=unlocked();
  board=document.createElement('section');
  board.className='pf-raid-board'; board.setAttribute('aria-labelledby','pf-raid-title');
  board.innerHTML=`<div class="raid-panel"><header class="raid-heading"><div><h2 id="pf-raid-title">균열 봉쇄 작전</h2>
    <p>${open?'함께 일출을 본 지 오랜 세월이 흘렀다. 레온이 세상을 떠나자 그가 붙들던 공간의 이음매가 벌어졌다. 균열이 맺힐 때마다 후손이 다시 나선다.':'남부 관제시설의 마지막 기억을 확인하면 세 균열로 출격할 수 있습니다.'}</p></div>
    <button type="button" data-raid-close>닫기</button></header><div class="raid-grid"></div>
    <article class="raid-detail"></article><footer class="raid-actions"></footer></div>`;
  menu.replaceChildren(board);
  board.querySelector('.raid-grid').innerHTML=encounters.bosses.map(b=>`<button type="button" class="raid-card" data-raid="${b.id}" data-raid-id="${b.id}" aria-pressed="false" style="--raid-accent:${b.accent}">
    <canvas class="raid-portrait" aria-hidden="true"></canvas><strong>${b.name}</strong><small>${b.minMinutes}–${b.maxMinutes}분</small></button>`).join('');
  for(const card of board.querySelectorAll('[data-raid-id]')) art.portrait(card.querySelector('canvas'),card.dataset.raidId);
  board.addEventListener('pointerdown',event=>event.stopPropagation());
  board.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button) return;
    event.stopPropagation();
    if(button.hasAttribute('data-raid-close')){PF.win.close();return;}
    if(button.hasAttribute('data-raid-start')){start(selectedId);return;}
    if(button.dataset.raidId) select(button.dataset.raidId);
  });
  select(selectedId);
  board.querySelector('[aria-pressed="true"]').focus({preventScroll:true});
}
function select(id){
  const b=bossById(id), m=missions[id], record=records(id), open=unlocked();
  selectedId=id;
  if(open)PF.figures?.sheet('constructs',id);
  board.style.setProperty('--raid-accent',b.accent);
  for(const card of board.querySelectorAll('[data-raid-id]')) card.setAttribute('aria-pressed',String(card.dataset.raidId===id));
  board.querySelector('.raid-detail').innerHTML=`<h3>${b.arena} · ${b.name}</h3><p>${open?b.lore:b.title}</p>
    <ol class="raid-skill-list">${b.skills.map(s=>`<li><b>${s.name}</b><span>${s.hint}</span></li>`).join('')}</ol>`;
  board.querySelector('.raid-actions').innerHTML=`<div class="raid-record"><b>${record?`재발생 · 봉쇄 ${record.clears}회 · 최단 ${clock(record.best)}`:'첫 봉쇄 대기'}</b>
    <span>봉쇄 보상 ${m.credits.toLocaleString('ko-KR')} 크레딧</span></div>
    <button type="button" class="raid-primary" data-raid-start ${open?'':'disabled'}>${open?'균열 진입':'본편 완료 후 개방'}</button>`;
  PF.figures?.button(board.querySelector('.raid-actions'),'constructs','기체 관찰',id);
}
function unmount(){
  if(!board) return;
  board.remove(); board=null;
  document.querySelector('#pfui [data-w=raid]')?.focus({preventScroll:true});
}
function textIfChanged(el,value){if(el.textContent!==value) el.textContent=value;}
function refreshHud(c){
  const r=c.run, h=partsHUD;
  textIfChanged(h.time,`${clock(r.elapsed)} / ${clock(c.def.maxMinutes*60)}`);
  const hp=Math.round(100*(4-r.phase+Math.max(0,r.hp))/5);
  if(h.bar.getAttribute('aria-valuenow')!==String(hp)){
    h.bar.setAttribute('aria-valuenow',String(hp)); h.fill.style.width=hp+'%';
  }
  const cast=r.mode==='mechanic'?`${r.skill.name} ${r.stageIndex+1}/${r.stageCount}`:'핵 노출';
  textIfChanged(h.status,`${r.phase+1}/5 ${r.phaseName} · 봉인 ${r.seals}/${r.need} · ${cast} · ${Math.ceil(r.remaining)}초`);
  textIfChanged(h.order,r.mode==='expose'?'핵 노출! 보스에게 접근해 공격하세요.':r.hint);
  if(r.eventNo!==c.eventNo){
    c.eventNo=r.eventNo; c.feedbackUntil=r.elapsed+1.8;
    textIfChanged(h.feedback,r.lastEvent);
  }
  h.feedback.hidden=!(r.lastEvent&&r.elapsed<c.feedbackUntil);
  hud.dataset.mode=r.mode;
}
function start(id){
  const def=bossById(id);
  if(!def||!unlocked()||current||PF.place.cur!=='town'||PF.story.busy()||PF.story.cur||PF.road.frozen||PF.road.listOpen||PF.town.entry||!combat.CLS[pl.cls]) return false;
  if(PF.win.cur&&PF.win.cur!=='raid') return false;
  PF.win.close();
  if(!PF.place.go('raid')) return false;
  const run=encounters.create(id,Math.floor(Math.random()*0x100000000));
  const mission=missions[id], ch=game.hub.ZONES.findIndex(z=>z.no===mission.floor);
  const frameRun={kind:'raid',raid:id,ch};
  game.frame.run=frameRun;
  const c={def,run,damage:0,ended:false,eventNo:run.eventNo,feedbackUntil:0,quitText:quit.innerHTML};
  current=c;
  PF.room.enter({id:'raid',w:arena.w,h:arena.h,accent:def.accent,floor:`assets/menu/f_z${mission.floor}.webp`,
    start:{x:arena.cx,y:arena.cy+380*arena.fsy},boss:{type:'boss',x:arena.cx,y:arena.cy}},
    {ch,onLeave:()=>clean(c)});
  c.boss=battle.boss;
  // The room supplies a normal target for every class. Its own script owns movement and the five health bars.
  const boss=c.boss;
  boss.displayName=def.name; boss.d={...boss.d,r:45,scriptedAI:true};
  boss.h=270; boss.sv=1; boss.shielded=run.mode!=='expose';
  const table=PF.DPS1[pl.cls];
  // Newly registered classes start with a basic attack before a DPS table has been measured.
  const dps=table?PF.balance.interp(table,api.SV.lv):1000*api.mul(api.ORDER[pl.cls][0]);
  c.pointHealth=Math.max(1,Math.round(dps*3));
  boss.max=c.pointHealth*run.need; boss.hp=boss.max;
  boss.acceptDamage=value=>{
    if(c.ended||current!==c||run.mode!=='expose') return 0;
    const floor=Math.max(0,1-(run.seals+1)/run.need);
    const room=Math.max(0,Math.round((run.hp-floor)*boss.max)-c.damage);
    const accepted=Math.min(value,room);
    c.damage+=accepted;
    return accepted;
  };
  partsHUD.title.textContent=def.name; hud.style.setProperty('--raid-accent',def.accent); hud.hidden=false;
  quit.innerHTML='봉쇄 중단<small>마을로 귀환 · 보상 없음</small>';
  refreshHud(c);
  return true;
}
function clean(c){
  if(current!==c) return;
  current=null;
  window.GameEnemySkin?.clear();
  clearTimeout(c.resultTimer);
  hud.hidden=true;
  quit.innerHTML=c.quitText;
  results.classList.remove('on','hubr');
  results.querySelector('.pf-raid-result')?.remove();
  PF.defeat.clear();
}
function leave(){
  if(!current) return false;
  if(PF.story.busy()){current.leaveAfterUlt=true;return false;}
  api.setPause(false);
  game.survEnd();
  return PF.place.go('town');
}
const previousQuit=quit.onclick;
quit.onclick=function(event){
  if(!current) return previousQuit?.call(this,event);
  api.setPause(false); leave();
};
function showResult(c){
  if(current!==c) return;
  const {run,def}=c, mission=missions[def.id], won=run.status==='win';
  const title=won?'균열 봉쇄 완료':run.status==='timeout'?'균열 팽창':'봉쇄 실패';
  const line=won?mission.closed:run.status==='timeout'?'제한 시간 안에 이음매를 닫지 못했다. 마을에서 다시 진입할 수 있다.':'후손의 신호가 끊겼다. 마을에서 장비와 패턴을 점검하고 다시 진입할 수 있다.';
  const rec=records(def.id);
  results.innerHTML=`<section class="pf-raid-result" role="dialog" aria-labelledby="pf-raid-result-title" style="--raid-accent:${def.accent}">
    <div class="raid-panel"><small>${def.arena} · ${def.name}</small><h2 id="pf-raid-result-title">${title}</h2><p>${line}</p>
    <p>${clock(c.seconds)} · ${won?'5/5단계 봉쇄':`${run.phase+1}/5단계 도달`} · ${won?`+${mission.credits.toLocaleString('ko-KR')} 크레딧`:'보상 없음'}</p>
    ${won?`<p class="raid-record">누적 봉쇄 ${rec.clears}회 · 최단 ${clock(rec.best)}</p>`:''}
    <footer class="raid-actions"><button type="button" data-raid-board>작전 다시 선택</button><button class="raid-primary" type="button" data-raid-return>마을로 귀환</button></footer></div></section>`;
  results.classList.add('on');
  results.querySelector('[data-raid-return]').onclick=leave;
  results.querySelector('[data-raid-board]').onclick=()=>{if(leave()) PF.win.open('raid');};
  results.querySelector('[data-raid-return]').focus({preventScroll:true});
}
function end(c,status){
  if(c.ended||current!==c) return;
  c.ended=true; c.run.status=status; c.seconds=Math.round(c.run.elapsed);
  battle.over=true; battle.joy=null; battle.keys={}; game.keys={};
  document.getElementById('sjoy').classList.remove('act'); hud.hidden=true;
  if(status==='fallen'){
    PF.defeat.begin({afterFall:()=>showResult(c)});
    return;
  }
  if(status==='win'){
    const log=story().raids||(story().raids={}), prev=log[c.def.id];
    log[c.def.id]={clears:(prev?.clears||0)+1,best:Math.min(prev?.best??Infinity,c.seconds)};
    game.hub.H.gold+=missions[c.def.id].credits;
    PF.save.commit();
    c.boss.dead=true; battle.boss=null;
    combat.burst(arena.cx,arena.cy,24,{z:120,c:c.def.accent});
    combat.fring(arena.cx,arena.cy,730,c.def.accent,.85,8);
    combat.sfx('shatter',1,.7);
    c.resultTimer=setTimeout(()=>showResult(c),800);
  }else showResult(c);
}
const beforeFinish=game.frame.onFinish;
game.frame.onFinish=function(win){
  if(!current) return beforeFinish?.apply(this,arguments)??false;
  if(!win) end(current,'fallen');
  return true;
};
const beforeUpdate=update;
update=function(dt){
  beforeUpdate.apply(this,arguments);
  const c=current;
  if(!c||c.ended||game.paused||game.mode!=='surv'||document.hidden) return;
  const b=c.boss, r=c.run;
  b.x=arena.cx; b.y=arena.cy; b.kx=b.ky=b.vz=b.z=0; b.pull=null;
  b.f=pl.x<b.x?-1:1;
  if(PF.story.busy()) return;
  if(c.leaveAfterUlt){leave();return;}
  const phase=r.phase, mode=r.mode;
  const event=encounters.step(r,dt,{x:pl.x,y:pl.gy,damage:c.damage/b.max});
  c.damage=0;
  if(r.status!=='active'){end(c,r.status);return;}
  b.max=c.pointHealth*r.need; b.hp=b.max*r.hp; b.shielded=r.mode!=='expose';
  if(event.hurt) combat.hurt(event.hurt*api.maxHp(),b);
  if(c.ended) return;
  if(phase!==r.phase){
    if(game.hp<api.maxHp()) combat.heal(.12);
    combat.fring(b.x,b.y,620,c.def.accent,.75,8);
    combat.sfx('rise',1,.5);
  }else if(mode!==r.mode&&r.mode==='expose'){
    combat.fring(b.x,b.y,350,c.def.accent,.45,6);
    combat.sfx('click');
  }
  refreshHud(c);
};
const beforeFoe=game.foeDraw;
game.foeDraw=function(enemy){
  if(current&&enemy===current.boss) return art.boss(ctx,enemy,current.def.id,current.run);
  return beforeFoe.apply(this,arguments);
};
const beforeEnemies=drawEnemy;
drawEnemy=function(){
  if(current&&!lock) art.floor(ctx,current.run,current.def.id);
  return beforeEnemies.apply(this,arguments);
};
PF.raid={mount,unmount,start,leave,unlocked,get current(){return current?.run||null;}};
})();

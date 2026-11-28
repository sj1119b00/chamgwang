// 균열 봉합 전투. 좌표는 surv의 월드 발 위치, 반지름과 선 굵기는 바닥 평면 단위다.
// 한 봉인마다 바닥 명령을 완수하고 열린 핵에 실전 공격을 적중시켜야 한다.
(function(){
'use strict';
const arena={w:1500,h:940,cx:750,cy:470,fsy:.58};
const center={x:arena.cx,y:arena.cy}, tau=Math.PI*2;
const entry=(id,name,hint)=>({id,name,hint});
const bosses=[
  {id:'arbiter',name:'경계 판정관',title:'통행권을 회수하는 자',arena:'폐쇄 검문선',accent:'#FFC17B',minMinutes:5,maxMinutes:8,
    lore:'레온의 죽음으로 경계 좌표가 비었다. 사람의 윤곽을 빌린 검문 명령이 살아 있는 모든 것을 침입자로 판정한다.',
    need:5,castSeconds:12,openSeconds:11,skills:[
      entry('sweep','검문 광선','자신을 조준하는 검문선에서 벗어난다.'),
      entry('permit','통행 부호','판정관이 호명한 부호의 발판에 선다.'),
      entry('radius','격리 반경','봉쇄가 바뀔 때마다 안쪽과 바깥쪽 띠를 오간다.'),
      entry('freeze','동결 칙령','정지 명령을 지키고 해제 신호에 움직인다.'),
      entry('verdict','갈림 판결','한 출구를 선택하고 그 선택에 연결된 검문을 통과한다.')]},
  {id:'archivist',name:'결손 기록관',title:'사라진 좌표의 사서',arena:'영점 서고',accent:'#C6A6FF',minMinutes:8,maxMinutes:13,
    lore:'레온이 서 있던 자리는 삭제됐지만 그 좌표를 읽는 손은 남았다. 얼굴 없는 기록관이 산 자의 발자국으로 누락된 행을 덮어쓴다.',
    need:6,castSeconds:16,openSeconds:12,skills:[
      entry('recall','휘발 색인','잠깐 표시되는 두 색인을 기억해 순서대로 복원한다.'),
      entry('echo','잔상 덮어쓰기','지워질 발자국을 남기고 다음 기록대로 이동한다.'),
      entry('missing','결번 복구','기록열에서 빠진 숫자의 서가를 찾는다.'),
      entry('mirror','대칭 사본','빛난 원본과 정반대편에 있는 사본을 복구한다.'),
      entry('fork','분기 열람','열람 경로를 선택한 뒤 경로의 마지막 서명으로 돌아온다.')]},
  {id:'weaver',name:'봉합 직조자',title:'틈을 벌리는 여섯 손',arena:'역직조 심장부',accent:'#72E4CB',minMinutes:13,maxMinutes:20,
    lore:'레온이 사라진 경계에서 봉합 명령이 뒤집혔다. 여섯 손을 단 직조자가 공간의 양쪽을 잡아당긴다. 실의 장력을 되돌려야 틈이 닫힌다.',
    need:8,castSeconds:19.5,openSeconds:13,skills:[
      entry('warp','날실 꿰기','실이 가리키는 바늘귀를 따라 봉합선을 잇는다.'),
      entry('needle','봉침 유도','매듭 위에서 봉침을 유도한 뒤 낙하지점을 비운다.'),
      entry('shear','맞물림 가위','교차하는 두 날을 피하면서 열린 틈으로 건너간다.'),
      entry('tension','장력 조율','줄어들고 팽창하는 장력 띠 안에서 균형을 잡는다.'),
      entry('shuttle','왕복 북','움직이는 북을 따라붙고 실을 반대편 받침에 건넨다.')]},
];

const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/arena.fsy);
function radial(angle,r,origin=center){
  return {x:origin.x+Math.cos(angle)*r,y:origin.y+Math.sin(angle)*r*arena.fsy};
}
function circle(kind,p,r,label){return {kind,shape:'circle',x:p.x,y:p.y,r,label};}
function band(kind,p,inner,r,label){return {kind,shape:'ring',x:p.x,y:p.y,inner,r,label};}
function segment(kind,a,b,r,label){return {kind,shape:'line',x:a.x,y:a.y,x2:b.x,y2:b.y,r,label};}
function beam(p,angle,r){
  return segment('danger',radial(angle,-1550,p),radial(angle,1550,p),r);
}
function contains(m,p){
  if(m.shape==='line'){
    const ax=m.x, ay=m.y/arena.fsy, bx=m.x2-ax, by=m.y2/arena.fsy-ay;
    const dx=p.x-ax,dy=p.y/arena.fsy-ay;
    const t=Math.max(0,Math.min(1,(dx*bx+dy*by)/(bx*bx+by*by||1)));
    return Math.hypot(dx-t*bx,dy-t*by)<=m.r;
  }
  const d=dist(m,p);
  return d<=m.r&&(m.shape!=='ring'||d>=m.inner);
}
function action(hint,marks,options={}){
  const safe=marks.filter(m=>m.kind==='target'||m.kind==='safe'), danger=marks.filter(m=>m.kind==='danger');
  const check=p=>(!safe.length||safe.some(m=>contains(m,p)))&&!danger.some(m=>contains(m,p));
  return {hint,marks,check,...options};
}
function arrive(hint,p,label,r=110,options={}){
  return action(hint,[circle('target',p,r,label)],options);
}
function rng(run){
  // Mulberry32. 입장 시드 하나로 순서, 방위, 발판 배치, 갈림 경로를 재현한다.
  let t=run.rng=(run.rng+0x6D2B79F5)>>>0;
  t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
function shuffled(run,items){
  const a=items.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(rng(run)*(i+1)); [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
const mod=(n,d)=>((n%d)+d)%d;
function site(c,i,r=c.radius){return radial(c.angle+mod(i,4)*Math.PI/2*c.turn,r);}
const symbols=['△','◇','○','□'];
function pads(c,labels,kind='cue'){
  return labels.map((s,i)=>circle(kind,site(c,i),c.pad,s));
}
function choosePad(c,labels,index,hint){
  const marks=pads(c,labels);
  return action(hint,marks,{check:p=>contains(marks[index],p)});
}
function fork(c,hint){
  const marks=[circle('target',site(c,0),c.pad,'A'),circle('target',site(c,2),c.pad,'B')];
  return action(hint,marks,{accept:p=>{c.route=contains(marks[0],p)?0:2;}});
}

// Each builder creates one readable floor command. The next command can read the
// player's actual previous position/choice (bait, footprints, freeze, branching).
const patterns={
  sweep(c,i,p){
    const angle=c.angle+c.turn*i*.79;
    const marks=[beam(p,angle,70)];
    if(i===3) marks.push(beam(p,angle+Math.PI/2,53));
    return action(i===3?'교차 검문선 두 개를 모두 벗어나세요.':'발밑의 검문선 옆으로 이동하세요.',marks);
  },
  permit(c,i){
    const n=c.sequence[i];
    return choosePad(c,symbols,n,'통행 부호 '+symbols[n]+' 위에 서세요.');
  },
  radius(c,i){
    const outer=(i+c.variant)%2===0;
    const m=outer?band('safe',center,345,530,'외곽'):band('safe',center,160,300,'내곽');
    return action(outer?'외곽 통행만 허용됩니다. 바깥 띠에 서세요.':'내곽으로 복귀하세요. 안쪽 띠에 서세요.',[m]);
  },
  freeze(c,i,p){
    if(i===0)return arrive('집행 표식으로 이동하세요.',site(c,0),'집행');
    if(i===2)return action('동결 해제. 발밑의 원을 벗어나세요.',[circle('danger',p,200,'이탈')]);
    return action('동결 명령. 지금 위치에서 마지막 1초간 머무세요.',[circle('safe',p,60,'정지')],{hold:1});
  },
  verdict(c,i){
    if(i===0)return fork(c,'두 검문소 중 한 곳을 선택하세요.');
    const routes=[0,1,2,0],index=c.route+routes[i];
    return arrive(i===3?'처음 선택한 검문소에 서명하세요.':'선택한 경로의 다음 검문소로 이동하세요.',site(c,index),i===3?'서명':'통과',c.pad);
  },
  recall(c,i){
    const n=c.sequence[i%2], labels=['1','2','3','4'];
    if(i<2){
      const marks=pads(c,labels); marks[n].kind='target'; marks[n].label='기억 '+labels[n];
      return action((i===0?'첫 번째':'두 번째')+' 색인을 기억하세요.',marks,{check:()=>true});
    }
    return choosePad(c,labels,n,i===2?'첫 번째로 빛난 색인을 복원하세요.':'두 번째로 빛난 색인을 복원하세요.');
  },
  echo(c,i,p){
    c.trail.push({x:p.x,y:p.y});
    const destination=site(c,c.sequence[i]);
    // The hero can begin a cast already on the chosen desk. Only erase footprints
    // far enough from the fresh desk to leave it accessible in that case.
    const marks=c.trail.slice(-3).filter(t=>dist(t,destination)>220).map(t=>circle('danger',t,120));
    marks.push(circle('target',destination,c.pad,'기록'));
    return action('지난 발자국이 지워집니다. 다음 기록대로 이동하세요.',marks);
  },
  missing(c,i){
    const n=c.sequence[i],labels=c.numbers;
    const row=['1','2','3','4'].map(s=>s===labels[n]?'＿':s).join(' · ');
    return choosePad(c,labels,n,row+' 에서 빠진 번호의 서가를 밟으세요.');
  },
  mirror(c,i){
    const n=c.sequence[i], opposite=mod(n+2,4),marks=pads(c,['사본','사본','사본','사본']);
    marks[n].kind='target';marks[n].label='원본';
    return action('빛나는 원본의 정반대편에서 사본을 복구하세요.',marks,{check:p=>contains(marks[opposite],p)});
  },
  fork(c,i){
    if(i===0)return fork(c,'A 또는 B 서고에 서서 열람 경로를 선택하세요.');
    if(i===3){
      const marks=pads(c,['A','Ⅰ','B','Ⅱ']);
      return action('처음 선택한 서고로 돌아가 열람을 마치세요.',marks,{check:p=>contains(marks[c.route],p)});
    }
    return arrive('열람 경로를 따라 '+(i===1?'첫째':'둘째')+' 서명을 받으세요.',site(c,c.route+i),'서명',c.pad);
  },
  warp(c,i){
    const a=site(c,i-1),b=site(c,i);
    const marks=[segment('cue',a,b,14),circle('target',b,c.pad,'바늘귀 '+(i+1))];
    return action('봉합선을 따라 '+(i+1)+'번 바늘귀에 실을 거세요.',marks);
  },
  needle(c,i,p){
    if(i%2===0)return arrive('매듭으로 봉침을 유도하세요.',site(c,i),'유도',c.pad,{hold:.65});
    const marks=[circle('danger',p,165,'낙침')];
    return action('조준 고정. 봉침이 떨어질 원을 비우세요.',marks);
  },
  shear(c,i){
    const angle=c.angle+c.turn*i*.45;
    const between=angle+Math.PI/4+c.turn*i*Math.PI/2;
    const marks=[beam(center,angle,57),beam(center,angle+Math.PI/2,57),circle('safe',radial(between,c.radius),c.pad,'틈')];
    return action('두 날 사이로 건너가 열린 틈에 서세요.',marks);
  },
  tension(c,i){
    const outward=(i+c.variant)%2===0;
    const m=band('safe',center,215,345,'장력');
    return action('움직이는 장력 띠 안에서 마지막 1초간 균형을 잡으세요.',[m],{hold:1,update:f=>{
      const radius=245+155*(outward?f:1-f);m.inner=radius-65;m.r=radius+65;
    }});
  },
  shuttle(c,i){
    if(i%2)return arrive('옮겨 온 실을 빛나는 받침에 고정하세요.',site(c,i+1),'받침',c.pad);
    const m=circle('target',site(c,i),c.pad,'북');
    return action('움직이는 북을 따라가 마지막 1초간 곁을 지키세요.',[m],{hold:1,update:f=>{
      const pos=radial(c.angle+c.turn*(i+f)*Math.PI/2,c.radius);
      m.x=pos.x;m.y=pos.y;
    }});
  }
};

const cadences={
  arbiter:['단독 심사','추가 판결','교차 심사','긴급 검문','이중 집행'],
  archivist:['원본 열람','책갈피 등록','중간 복원','대칭 복원','양면 복원'],
  weaver:['날실 개방','실 선택','교차 봉합','되감기','마지막 매듭']
};
function beginPhase(run,player){
  run.phaseSkill=run.boss.skills[run.order[run.phase]];
  run.phaseName=cadences[run.id][run.phase];run.thread=null;
  // Start with a small vocabulary. Later phases combine the signature with
  // previously learned lines; the signature always appears in its own phase.
  const known=run.order.slice(0,Math.min(5,run.phase+2)).map(i=>run.boss.skills[i]);
  const others=shuffled(run,known.filter(s=>s!==run.phaseSkill));
  const deck=[];
  while(deck.length<run.need){
    const i=deck.length;
    if(i===0||i%3===2||others.length===1&&deck[i-1]!==run.phaseSkill)deck.push(run.phaseSkill);
    else { const next=others.shift();deck.push(next);others.push(next); }
  }
  run.deck=deck;run.hp=1;run.seals=0;run.openDamage=0;
  beginCast(run,player);
}
// Blend the signature into an already-running non-signature cast. These short
// interruptions have their own cast state, so a verdict never loses its chosen gate.
const interruptIndex={sweep:3,permit:1,radius:1,freeze:1,verdict:0};
function cadence(run){
  const beats=[0,1,2,3],p=run.phase;
  if(!p)return beats;
  if(run.id==='arbiter'&&run.skill!==run.phaseSkill){
    if(p===1)beats.push('ruling');
    if(p===2||p===3)beats.splice(p===2?2:1,0,'ruling');
    if(p===4){beats.splice(1,0,'ruling');beats.push('ruling');}
  }
  if(run.id==='archivist'){
    if(p===1&&run.skill===run.phaseSkill)return beats;
    beats.unshift('mark');
    if(p===1)beats.push('restore');
    else if(p===2)beats.splice(3,0,'restore');
    else if(p===3)beats.push('reflect');
    else {beats.splice(3,0,'restore');beats.push('reflect');}
  }
  if(run.id==='weaver'){
    // The first choice persists until the next phase. Later circuits offer a
    // reroute, and the finale makes the player complete the chosen two-part knot.
    if(run.thread==null||p>=3&&run.seals===Math.floor(run.need/2))beats.unshift('thread');
    beats.splice(p<=2?beats.length:Math.ceil(beats.length/2),0,'splice');
    if(p===4)beats.push('finishKnot');
  }
  return beats;
}
function supplemental(run,token,player){
  const c=run.cast;
  if(token==='ruling'){
    const id=run.phaseSkill.id,shadow={...c,angle:c.angle+Math.PI/4,variant:c.variant+c.rulings};
    const index=id==='radius'?(interruptIndex[id]+c.rulings)%4:interruptIndex[id];
    c.rulings++;
    const a=patterns[id](shadow,index,player);
    a.hint='추가 판결 · '+a.hint;return a;
  }
  if(token==='mark'){
    return arrive('빛난 서가의 번호를 기억하고 책갈피를 꽂으세요.',site(c,c.bookmark),'책갈피 '+(c.bookmark+1),c.pad);
  }
  if(token==='restore'||token==='reflect'){
    const reflect=token==='reflect',index=mod(c.bookmark+(reflect?2:0),4);
    return choosePad(c,['1','2','3','4'],index,reflect?'책갈피의 정반대편 서가에 사본을 놓으세요.':'책갈피를 꽂은 서가로 돌아가 기록을 회수하세요.');
  }
  if(token==='thread'){
    const a=fork(c,'이번 회로의 실을 고르세요. A는 고정, B는 봉침 유도입니다.');
    const accept=a.accept;
    a.marks[0].label='A 고정';a.marks[1].label='B 유도';
    a.accept=p=>{accept(p);run.thread=c.route===0?'anchor':'bait';};return a;
  }
  if(token==='splice'){
    c.stitchSpot={x:player.x,y:player.y};
    if(run.thread==='anchor')return arrive('고정 경로 · 실받침 위에서 마지막 1초간 실을 당기세요.',site(c,1),'고정',c.pad,{hold:1});
    return action('유도 경로 · 봉침을 끌어냈습니다. 발밑의 표적에서 벗어나세요.',[circle('danger',player,175,'유도침')]);
  }
  if(run.thread==='anchor')return arrive('고정 경로 · 맞은편 기둥에 마지막 매듭을 거세요.',site(c,3),'매듭',c.pad);
  return arrive('유도 경로 · 봉침이 꽂힌 자리로 돌아가 매듭을 푸세요.',c.stitchSpot,'봉침',c.pad);
}
function beginCast(run,player){
  run.mode='mechanic';run.skill=run.deck[run.seals];
  run.cast={angle:rng(run)*tau,turn:rng(run)<.5?-1:1,radius:310+rng(run)*45,pad:112-run.phase*4,
    variant:Math.floor(rng(run)*2),sequence:shuffled(run,[0,1,2,3]),numbers:shuffled(run,['1','2','3','4']),
    bookmark:Math.floor(rng(run)*4),rulings:0,route:0,trail:[]};
  run.beats=cadence(run);run.stageIndex=0;run.stageCount=run.beats.length;beginBeat(run,player);
}
function beginBeat(run,player){
  const token=run.beats[run.stageIndex];
  const a=typeof token==='number'?patterns[run.skill.id](run.cast,token,player):supplemental(run,token,player);
  run.action=a;run.hint=a.hint;run.marks=a.marks;
  run.beatDuration=run.boss.castSeconds/run.stageCount;
  run.remaining=run.beatDuration;run.held=0;
  if(a.update)a.update(0);
}
function create(id,seed,start=radial(Math.PI/2,380)){
  const boss=bosses.find(b=>b.id===id);
  if(!boss)throw new RangeError('알 수 없는 균열 '+id);
  const run={id,boss,rng:Number(seed)>>>0,status:'active',phase:0,elapsed:0,need:boss.need,
    lastEvent:'',eventNo:0,completed:0,misses:0};
  run.order=shuffled(run,[0,1,2,3,4]);beginPhase(run,start);return run;
}
function event(run,message){run.lastEvent=message;run.eventNo++;}
function expose(run){
  run.mode='expose';run.remaining=run.boss.openSeconds;run.marks=[];
  run.hint='균열핵이 열렸습니다. 보스에게 공격을 적중시키세요.';
  event(run,'명령 해제 · 핵 노출');
}
function resolveBeat(run,player){
  const a=run.action;
  if(!a.check(player)||run.held+1e-7<(a.hold||0)){
    run.misses++;event(run,'명령 실패 · 패턴 재시도');beginCast(run,player);
    return .065;
  }
  if(a.accept)a.accept(player);
  if(++run.stageIndex===run.stageCount)expose(run);else beginBeat(run,player);
  return 0;
}
function hit(run,damage,player){
  const cap=1/run.need;run.openDamage=Math.min(cap,run.openDamage+damage);
  run.hp=Math.max(0,1-run.seals*cap-run.openDamage);
  if(run.openDamage+1e-9<cap)return;
  run.seals++;run.completed++;run.openDamage=0;
  if(run.seals<run.need){
    event(run,'봉인 복구');beginCast(run,player);return;
  }
  if(run.phase===4){
    run.status='win';run.hp=0;run.remaining=0;run.marks=[];run.hint='공간의 빈틈을 봉합했습니다.';return;
  }
  run.phase++;event(run,'봉합 회로 전환');beginPhase(run,player);
}
function step(run,dt,player){
  let hurt=0;
  if(run.status!=='active'||!Number.isFinite(dt)||dt<=0)return {hurt};
  const limit=run.boss.maxMinutes*60;
  let budget=Math.min(dt,Math.max(0,limit-run.elapsed));
  // Damage was sampled during the preceding frame. Consume it exactly once and
  // never apply an overkill hit to the next seal or to a newly opened window.
  if(run.mode==='expose'&&Number.isFinite(player.damage)&&player.damage>0)hit(run,player.damage,player);
  while(budget>1e-8&&run.status==='active'){
    const t=Math.min(budget,run.remaining);
    run.remaining-=t;run.elapsed+=t;budget-=t;
    if(run.mode==='mechanic'){
      const a=run.action;
      if(a.update)a.update(1-run.remaining/run.beatDuration);
      if(a.hold)run.held=a.check(player)?run.held+t:0;
      if(run.remaining<=1e-8)hurt+=resolveBeat(run,player);
    }else if(run.remaining<=1e-8){
      event(run,'핵 폐쇄 · 남은 균열을 다시 노출하세요');beginCast(run,player);
    }
  }
  if(run.status==='active'&&run.elapsed>=limit-1e-6){
    run.status='timeout';run.remaining=0;run.marks=[];run.hint='공간이 붕괴했습니다.';
  }
  return {hurt};
}
const api={bosses,arena,create,step};
if(typeof window!=='undefined'&&window.PF)window.PF.raidEncounter=api;
if(typeof module!=='undefined')module.exports=api;
})();

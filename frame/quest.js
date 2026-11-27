// 메인 퀘스트. 구역 마을과 들판은 같은 저장 칸(story.quest.zN)을 쓴다.
// 순서를 어겨도 막히지 않는다: 노드·도착·길은 실제 상태(done)로 이미 채워져 있으면 차례가 왔을 때 넘어가고, 왕 제압은 그 앞 단계를 모두 끝낸 것으로 한다.
// 왕 제압 전의 대화를 건너뛸 수 있고, 새로 제압한 구역은 마을 주민에게 돌아가 마지막 단계를 마친다.
// 순수 부분(steps, cur, advance, sync, redo, loreIds)은 node 시험(frame/test/quest.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 data/quests 다음에 붙인다
(function(){
'use strict';
const D=typeof window!=='undefined'&&window.PF&&window.PF.QUESTS||require('./data/quests.js');
const COUNT=()=>typeof window!=='undefined'&&window.PF&&window.PF.field?window.PF.field.COUNT:require('./field.js').COUNT;
const zoneOf=p=>{ const m=/^z(\d+)$/.exec(p); return m?+m[1]:-1; };
// 구역 zone의 배경 문구 자리: 브라우저는 hub.js ZONES[zone].no(번호가 없으면 마지막 장소). node 시험에는 그 표가 없어 마지막 장소만 안다
let info=z=>z===COUNT()-1?{final:true}:{};
// 장소마다 단계 목록은 한 번만 만든다(대사 줄이 늘 같은 객체라야 story.js가 말하는 중인 줄을 알아본다)
const memo=new Map();
function steps(place){ let L=memo.get(place); if(L) return L;
  if(place==='town') L=D.town;
  else { const z=zoneOf(place), n=COUNT(); if(z<0||z>=n) return []; L=D.zone(z,{...info(z),end:z>=n-1}); }
  memo.set(place,L); return L; }
const done=(story,place)=>Math.max(0,(story&&story.quest||{})[place]|0);
const at=(L,type)=>L.findIndex(s=>s.type===type);
function cur(story,place){ const L=steps(place), i=done(story,place); return i<L.length?{i,step:L[i],total:L.length}:null; }
// 그 사건이 이 단계를 채우는가(e), 실제 상태(d: {nodes, king, went:{길:true}})로 이미 채워져 있는가(대화는 늘 직접 해야 한다)
function hit(s,e){ return e.type===s.type&&(s.type==='talk'?e.npc===s.npc:s.type==='reach'?e.at===s.at:s.type==='node'?(e.done?e.done.nodes:e.n)>=s.n:s.type==='travel'?e.exit===s.exit:true); }
function auto(s,d){ return s.type==='reach'?(d.nodes||0)>=1:s.type==='node'?(d.nodes||0)>=s.n:s.type==='king'?!!d.king:s.type==='travel'?!!(d.went&&d.went[s.exit]):false; }
// 지금 단계가 채워지면 다음으로, 이어지는 단계가 이미 채워져 있으면 계속 넘긴다(skipped). 왕 제압은 그 앞의 모든 단계(대화 포함)를 끝낸 것으로
function advance(story,place,e){ const L=steps(place), d=e.done||{}, skipped=[]; let i=done(story,place);
  if(i>=L.length) return {moved:false,skipped};
  const k=at(L,'king');
  if(k>=i&&(e.type==='king'||d.king)){ for(;i<k;i++) skipped.push(L[i].id); i=k+1; }
  else if(hit(L[i],e)||auto(L[i],d)) i++;
  else return {moved:false,skipped};
  while(i<L.length&&auto(L[i],d)){ skipped.push(L[i].id); i++; }
  (story.quest||(story.quest={}))[place]=i;
  return {moved:true,skipped}; }
// 이전 저장에서 제압한 곳은 열어 두고 새 저장에서 남은 마을 후일담을 보존한다.
function canDepart(story,z){ return z>=0&&(story.cleared||0)>z&&story.continent?.['z'+z]!=='return'; }
function sync(story,place,world){ const L=steps(place); if(L.length&&world.cleared&&story.continent?.[place]!=='return') (story.quest||(story.quest={}))[place]=L.length; }
function finished(story,p,nodes){ const i=done(story,p); return steps(p).filter((s,j)=>j<i||auto(s,{nodes})).length; }
// 지도가 새로 만들어져 진행이 실제 상태보다 앞서 있을 때의 남은 일: 끝낸 노드 단계보다 부순 노드가 적으면 노드, 왕의 문 대화까지 끝냈으면 왕. 그 밖에는 null
function redo(story,place,world){ if(world.cleared) return null;
  const L=steps(place), i=Math.min(L.length,done(story,place)), k=at(L,'king'); let need=0, total=0;
  L.forEach((s,j)=>{ if(s.type!=='node') return; total=Math.max(total,s.n); if(j<i) need=Math.max(need,s.n); });
  if(need>world.nodes) return D.REDO.nodes(world.nodes,total);
  return k>=0&&i>=k&&!world.king?D.REDO.king:null; }
// 기록 조각의 차례: 마을 셋, 구역(놀이 차례 nos의 구역 번호)마다 야영지·정찰, 왕의 문과 기억 한 토막은 처음 듣는 첫 구역 뒤, 마지막 장소. heard가 있으면 들은 것만
function loreIds(nos,heard){ const L=['town.resident','town.map','town.road'];
  nos.forEach((no,i)=>{ L.push('z'+no+'.camp','z'+no+'.scout'); if(!i) L.push('gate','memory'); });
  L.push('final');
  return heard?L.filter(id=>heard[id]):L; }
const Q={steps,cur,advance,sync,redo,loreIds,canDepart,finished};

// ---- 브라우저: boot.js가 road·data/lore·data/quests 다음에 붙인다. 전역 update, drawBackground_prep, applyCam, ctx, fx, pl, cam, RT, W, H, S(index.html·엔진)를 쓴다
if(typeof window!=='undefined'&&window.RPG&&window.PF){
  const G=RPG, FSY=G.sv.FSY, PF=window.PF, F=PF.field;
  const Zs=()=>G.hub.ZONES;
  info=z=>{ const Z=Zs()[z]; return Z?{no:Z.no}:{final:true}; };
  memo.clear();
  const story=()=>PF.save.data.story;
  const here=()=>{ const P=PF.place.cur, r=G.frame.run; return P==='town'?'town':P==='village'&&Number.isInteger(PF.village.zone)?'z'+PF.village.zone:P==='field'&&r&&r.kind==='field'?'z'+r.zone:null; };
  const name=p=>p==='town'?'마을':zoneOf(p)<Zs().length?Zs()[zoneOf(p)].name:'마지막 화 (임시)';
  const cleared=z=>F.state(story().cleared,z)==='cleared';
  // 누를 반경(마을 NPC와 같다), 도착(reach)으로 보는 남은 노드까지의 바닥 거리, 1m(월드 단위, 어림: 영웅 키 약 260)
  const NPC_R=170, REACH=700, UNIT=100;

  // ---- 실제 상태(advance의 done): 이 판의 부순 노드 수, 왕 제압(제압한 구역), 그 길로 이어지는 곳을 이미 들렀는지
  function world(p){ const z=zoneOf(p), M=here()===p?F.M:null, s=story();
    return {nodes:Math.max(M?.done||0,s.nodeMilestones?.[p]||0),king:z>=0&&cleared(z),cleared:z>=0&&cleared(z),went:p==='town'&&s.visited?.z0?{east:true}:{}}; }
  // 단계를 넘긴다. 넘어가면 저장하고, 단계 알림을 건다(궁극기·장면·창이 끝난 뒤에 뜬다)
  let notice=false;
  function step(p,e){ const s=story(), r=advance(s,p,{...e,done:world(p)});
    if(r.moved){ if(s.mainDialogue) delete s.mainDialogue[p]; PF.save.commit(); notice=true; } return r; }
  // 장면: 첫 제압 전에만, 본 장면은 다시 틀지 않는다(궁극기 뒤로 미루고 한 번만 여는 것은 story.js play가 지킨다)
  function scene(p,slot,first){ const id=PF.story.sceneId(zoneOf(p)+1,slot); return first&&!story().seen[id]?PF.story.play(id):null; }
  const first=()=>{ const r=G.frame.run; return !!(r&&r.kind==='field'&&r.first); };

  // ---- NPC와 대화: 그 단계의 대사를 차례로(첫 줄은 배경 문구). 다 끝나면 단계가 넘어간다. 말하는 중에 또 누르면 story.js가 다음 줄로 넘긴다.
  // 야영지 NPC의 첫 대화(①)는 도입 장면을 연 뒤에 대사
  function mainTalk(p,st,resuming=false){
    if(PF.story.talking(st.lines)){PF.story.talk(st.lines);return;}
    const save=story(), log=save.mainDialogue||(save.mainDialogue={});
    const progress=log[p]?.id===st.id?log[p]:(log[p]={id:st.id,read:0});
    function finish(){
      if(cur(save,p)?.step.id!==st.id) return;
      if(st.type==='travel'){
        save.continent[p]='done'; step(p,{type:'travel',exit:'out'});
      }else step(p,{type:'talk',npc:st.npc});
    }
    if(progress.read>=st.lines.length){finish();return;}
    PF.story.talk(st.lines,{start:progress.read,done:finish,read:n=>{
      if(log[p]!==progress||n<=progress.read) return;
      progress.read=n;
      if(resuming&&n===st.lines.length) finish(); else PF.save.commit();
    }});
  }
  function resumeTalk(p){
    const progress=story().mainDialogue?.[p];
    if(!progress||PF.story.cur||PF.story.busy()||PF.win.cur) return;
    let st=cur(story(),p)?.step;
    if(st?.id!==progress.id) return;
    if(st.type==='travel') st={...st,lines:extra(p,'closing','camp')};
    if(PF.story.talking(st.lines)) return;
    if(!PF.story.inConversation()||progress.read>=st.lines.length) mainTalk(p,st,true);
  }
  function talk(p,c){ const s=c.step, run=G.frame.run, go=()=>{
    if(here()!==p||run!==G.frame.run) return;
    if(s.type==='talk'&&zoneOf(p)>=0){mainTalk(p,s);return;}
    const next=s.type==='talk'?{done:()=>step(p,{type:'talk',npc:s.npc})}:undefined;
    PF.story.talk(s.lines,next);
  };
    const w=s.scene==='intro'&&zoneOf(p)>=0&&scene(p,'intro',!cleared(zoneOf(p)));
    if(w) w.then(go,go); else go(); }
  const townNpc=id=>Object.keys(D.NPC).find(k=>D.NPC[k].spot===id);
  // 지금 단계와 상관없는 사냥터 NPC의 임시 한 줄(NPC마다 같은 객체: 말하는 중에 또 누르면 쌓이지 않는다)
  const IDLE={}, idle=k=>IDLE[k]||(IDLE[k]=[D.idle(k)]);
  // 누른 지점: 사냥터 NPC(act 'quest:<npc>')는 여기서 다 받는다. 마을 주민은 지금 단계면 그 대사를(예전 임시 대사 대신),
  // 지도 담당은 처음 누를 때 지도 창을 그대로 먼저 열고(원래 받는 쪽) 그 뒤에 말을 건다: 대사는 창을 닫은 뒤에 뜬다(story.js가 창 동안 미룬다).
  // 말하는 중에 또 누르면 창 없이 다음 줄. 그 밖은 원래 받는 쪽으로
  const scripts=new Map();
  function extra(p,section,npc){ const key=p+'.'+section;
    if(!scripts.has(key)) scripts.set(key,D.lines(Zs()[zoneOf(p)]?.no,section,npc));
    return scripts.get(key); }
  function press(s){ const p=here(), m=/^quest:(\w+)$/.exec(s.act||''), npc=m?m[1]:p==='town'&&townNpc(s.id); if(!p||!npc) return false;
    if(PF.story.busy()||PF.story.cur||PF.win.cur) return true;
    if(PF.place.cur==='village'&&npc==='camp'&&cleared(zoneOf(p))){
      const closing=story().continent?.[p]==='return';
      if(closing){
        const st=cur(story(),p)?.step;
        if(st?.type==='travel') mainTalk(p,{...st,lines:extra(p,'closing','camp')});
        return true;
      }
      const arrival=steps(p)[0].lines;
      const missed=arrival[0].lore&&!story().lore?.[arrival[0].lore];
      const replay=PF.story.talking(arrival)||missed;
      PF.story.talk(replay?arrival:extra(p,'after','camp')); return true;
    }
    const c=cur(story(),p);
    if(c&&c.step.lines&&c.step.npc===npc){
      if(m||npc==='resident'||PF.story.talking(c.step.lines)){ talk(p,c); return true; }
      queueMicrotask(()=>talk(p,c)); return false; }
    if(npc==='scout'&&PF.side?.scout()) return true;
    if(m){ const line=npc==='camp'?extra(p,'idle','camp'):steps(p).find(st=>st.npc===npc&&st.type==='talk')?.lines;
      PF.story.talk(line||idle(npc)); return true; }
    return false; }
  // spots.js는 목록마다 받는 쪽이 하나다: 누가 목록을 걸든(마을·사냥터) 여기서 먼저 본다(secret.js와 같은 방법으로 그 위에 감싼다)
  const set0=PF.spots.set;
  PF.spots.set=function(l,fn){ return set0.call(this,l,s=>{ if(!press(s)&&fn) fn(s); }); };

  // 두 쉼터의 정찰·문 담당은 메인 완료 후에도 서브 의뢰와 기록 조각을 위해 머문다.
  const spotOf=(k,[x,y])=>({id:'q_'+k,kind:'npc',art:D.NPC[k].art,light:D.NPC[k].light,x,y,r:NPC_R,label:D.NPC[k].who,act:'quest:'+k});
  let key=null, spots=null, lastKing=null;
  const ensure=s=>{ if(s&&!PF.spots.list.some(q=>q.id===s.id)) PF.spots.add(s); };
  function npcTick(){
    if(!spots){ const rests=PF.continent?.rests()||[];
      const mid=rests.find(q=>q.kind==='middle'), gate=rests.find(q=>q.kind==='keepRest');
      if(!mid||!gate) return;
      spots={scout:spotOf('scout',[mid.x,mid.y]),gate:spotOf('gate',[gate.x,gate.y])};
    }
    ensure(spots.gate); ensure(spots.scout); }

  // 제압과 보상은 함께 저장한다. 경험치를 회수하는 도중 새로 고쳐도 마을에서 남은 마무리 장면과 기억을 이어 본다.
  const endings=new Map();
  function finishEnding(p){
    const pending=story().pendingEndings;
    if(!pending||!pending[p]||endings.has(p)) return;
    const memory={...D.MEMORY,shown:()=>{
      delete pending[p]; endings.delete(p); PF.save.commit();
    }};
    endings.set(p,memory);
    const ending=scene(p,'ending',true);
    const say=()=>{ if(endings.get(p)===memory&&pending[p]) PF.story.bark(memory,true); };
    if(ending) ending.then(say); else say();
  }
  PF.place.on(to=>{
    endings.clear();
    if(to==='village'&&here()){ const z=zoneOf(here()); sync(story(),here(),{cleared:cleared(z)}); }
    if(to==='town'||to==='field'||to==='village') queueMicrotask(()=>{
      for(const p of Object.keys(story().pendingEndings||{})) finishEnding(p);
    });
  });
  F.onEvent((n,c)=>{ const p='z'+c.zone;
    if(n==='enter') sync(story(),p,{nodes:0,king:false,cleared:cleared(c.zone)});
    else if(/^node\d$/.test(n)){ const s=story(), bank=s.nodeMilestones||(s.nodeMilestones={});
      const nodes=F.M?.done||0; bank[p]=Math.max(bank[p]||0,nodes); step(p,{type:'node',n:nodes}); PF.save.commit();
    }
    else if(n==='kingCleared'){
      const s=story(); (s.continent||(s.continent={}))[p]='return';
      (s.pendingEndings||(s.pendingEndings={}))[p]=1;
      step(p,{type:'king'}); PF.save.commit();
    } else if(n==='win') finishEnding(p); });
  // 중앙 마을은 실제 도보 이동, 구역은 귀환한 마을 주민과 대화한 뒤 마지막 단계가 끝난다.
  Q.travelled=(from,exit,to)=>{
    if(from==='town'&&exit==='east'&&to==='v0') step('town',{type:'travel',exit});
  };
  Q.canDepart=z=>canDepart(story(),z);

  // ---- 지금 보일 것(VM): 장소, 머리말·몇 번째·문구·덧줄(배경 문구면 그 기록 id), 목표 자리(has·x·y, 표식 높이 h)
  const VM={p:null,head:'',count:'',text:'',note:'',lore:null,has:false,x:0,y:0,h:0,label:''};
  function aim(x,y,h,label){ VM.has=true; VM.x=x; VM.y=y; VM.h=h; VM.label=label; }
  function nearNode(M){ let b=null, bd=Infinity; for(const n of M.nodes){ if(n.done) continue; const d=Math.hypot(n.x-pl.x,(n.y-pl.gy)/FSY); if(d<bd){ bd=d; b=n; } } return b; }
  const mouth=exit=>PF.road.mouths().find(q=>q.exit===exit);
  const townSpot=id=>PF.TOWN.spots.find(s=>s.id===id);
  function townView(s){ let c=cur(s,'town');
    if(c){ const st=c.step; VM.head=name('town'); VM.count=(c.i+1)+'/'+c.total; VM.text=st.text;
      if(st.type==='talk'){ const q=townSpot(D.NPC[st.npc].spot); aim(q.x,q.y,340,D.NPC[st.npc].who); }
      else { const m=mouth(st.exit); if(m) aim(m.x,m.y,0,m.label); if(st.note){ VM.note=st.note.text; VM.lore=st.note.lore; } }
      return; }
    // 마을 퀘스트를 마쳤으면 아직 제압하지 않은 첫 대륙의 지금 단계, 그곳으로 가는 길(들른 곳이면 마을 관문)
    const returning=Object.keys(s.continent||{}).find(k=>s.continent[k]==='return');
    const f=returning?zoneOf(returning):s.cleared||0;
    if(f>=F.COUNT){ VM.head=name('town'); VM.text=D.FREE; return; }
    const z='z'+f, go=!!(s.visited||{})[z], q=go?townSpot('portal_map'):mouth('east');
    c=cur(s,z); VM.head=name(z); VM.count=c?(c.i+1)+'/'+c.total:''; VM.text=c?c.step.text:D.FREE;
    if(q){ aim(q.x,q.y,0,q.label); VM.note=go?'마을 관문에서 빠른 이동':'동쪽 길로'; } }
  function regionalCount(s,p,c){ const nodes=s.nodeMilestones?.[p]||0, n=finished(s,p,nodes);
    VM.count=n>c.i?n+'/'+c.total+' 완료':(c.i+1)+'/'+c.total;
    if(n>c.i) VM.finishedNodes='노드 '+nodes+'개 완료';
  }
  function aimSpot(q,h=0){ if(q) aim(q.x,q.y,h,q.label); }
  function villageView(s,p){ const c=cur(s,p); VM.head=name(p);
    const z=zoneOf(p);
    if(!c){ const road=z<F.COUNT-1&&mouth('next'); VM.text=road?'다음 구역 마을로 이동':D.FREE; aimSpot(road); return; }
    regionalCount(s,p,c); const st=c.step;
    if(c.i===0||st.type==='travel'){ VM.text=st.type==='travel'?'돌아온 마을에서 주민과 대화':st.text;
      aimSpot(PF.spots.list.find(q=>q.id==='q_camp'),340); return; }
    VM.text=st.text; VM.note=VM.note||'외곽으로 가는 길'; aimSpot(mouth('field'));
  }
  function fieldView(s,p,M){ const c=cur(s,p); VM.head=name(p);
    if(!c){ VM.text=D.FREE; return; }
    const st=c.step, rd=redo(s,p,{nodes:M.done,king:!!M.won,cleared:cleared(zoneOf(p))}), n=nearNode(M);
    regionalCount(s,p,c);
    VM.text=rd&&rd!==D.REDO.king?rd:st.type==='node'?st.text+` (${M.done}/${M.nodes.length})`:st.text;
    if(st.npc==='camp'&&st.type==='talk'){ VM.text='입구로 돌아가 마을 주민과 대화'; aimSpot(mouth('in')); }
    else if(rd&&rd!==D.REDO.king||st.type==='reach'||st.type==='node'){ if(n) aim(n.x,n.y,640,'신호 노드'); }
    else if(st.type==='talk'){ const q=spots&&spots[st.npc]; if(q) aim(q.x,q.y,340,q.label); else if(n) aim(n.x,n.y,640,'신호 노드'); }
    else if(st.type==='king'){ const a=M.arena; if(M.gate||M.free||M.king) aim(a.x,a.y,0,'왕의 방'); else if(n) aim(n.x,n.y,640,'신호 노드'); }
    else if(st.type==='travel'){ const m=mouth(st.exit); if(m) aim(m.x,m.y,0,m.label); } }
  function view(){ const p=here(); VM.p=p; VM.has=false; VM.count=''; VM.note=''; VM.lore=null; VM.finishedNodes='';
    if(!p) return;
    if(p==='town') return townView(story());
    if(PF.place.cur==='village') return villageView(story(),p);
    if(F.M) fieldView(story(),p,F.M); else VM.p=null; }
  Q.target=()=>{ view(); return VM.has?{x:VM.x,y:VM.y,label:VM.label}:null; };
  Q.view=()=>{ view(); return {...VM}; };

  // ---- 화면: 오른쪽 위 구석 아이콘 아래의 퀘스트 판(frame.css #pfquest). 체력판·구역 목표 글(가운데)·미니맵 자리(체력판 아래)·궁극기 버튼을 비킨다.
  // 머리말 "메인 · <장소> i/total · 거리m", 그 아래 문구, 덧줄(동쪽 길 단계의 배경 문구, 마을의 안내). 단계 알림은 머리말 자리에 잠깐
  const el=document.createElement('div'); el.id='pfquest'; el.setAttribute('role','status');
  el.innerHTML='<div class="pf-q-hd"><b>메인</b><span></span><em></em></div><p></p><small></small>';
  document.getElementById('pfui').appendChild(el);
  const hd=el.querySelector('.pf-q-hd span'), cnt=el.querySelector('em'), tx=el.querySelector('p'), nt=el.querySelector('small');
  const NOTE_MS=2200;
  let shown=null, noteT=0, dist=null, on=false;
  function paint(){ const vis=!!VM.p&&G.mode==='surv';
    if(vis!==on){ on=vis; el.classList.toggle('on',vis); }
    if(!vis) return;
    // 단계 알림: 궁극기·장면·창이 없을 때 머리말 자리에 NOTE_MS 동안(frame.css .up의 깜빡임)
    const now=performance.now();
    if(notice&&!PF.story.busy()&&!PF.story.cur&&!PF.win.cur){ notice=false; noteT=now; el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }
    if(noteT&&now-noteT>NOTE_MS){ noteT=0; el.classList.remove('up'); }
    const head=VM.finishedNodes||(noteT?D.NOTICE:VM.head), k=head+'|'+VM.text+'|'+VM.note;
    if(k!==shown){ shown=k; hd.textContent=head; tx.textContent=VM.text; nt.textContent=VM.note; nt.hidden=!VM.note; }
    const d=VM.has?Math.round(Math.hypot(VM.x-pl.x,(VM.y-pl.gy)/FSY)/UNIT):-1, c=VM.count+'|'+d;
    if(c!==dist){ dist=c; cnt.textContent=[VM.count,d>=0?d+'m':''].filter(Boolean).join(' · '); }
    // 동쪽 길 단계의 덧줄(배경 문구)은 보인 때 들은 것으로 적는다
    if(VM.lore){ const s=story(), L=s.lore||(s.lore={}); if(!L[VM.lore]){ L[VM.lore]=1; PF.save.commit(); } } }

  // ---- 매 화면(안쪽 갱신 뒤): 판이 바뀌면 NPC 자리를 새로. 사냥터면 NPC, 도착(reach), 왕의 방에 들어섬(대면 장면). 그리고 판을 다시 그린다
  const u0=update; update=function(rdt){ u0(rdt); tick(); };
  function tick(){ const r=G.frame.run;
    if(r!==key){ key=r; spots=null; lastKing=null; }
    const p=here(), M=F.M;
    if(p&&p!=='town'&&G.mode==='surv') resumeTalk(p);
    if(PF.place.cur==='field'&&p&&M&&G.mode==='surv'){ npcTick();
      const c=cur(story(),p), st=c&&c.step;
      if(st&&st.type==='reach'){ const n=nearNode(M); if(n&&Math.hypot(n.x-pl.x,(n.y-pl.gy)/FSY)<REACH) step(p,{type:'reach',at:st.at}); }
      // 새 왕이 나왔다(왕의 방에 들어섬): 왕의 문 대화(⑦)까지 끝냈으면 대면 장면
      if(M.king&&!M.king.dead&&M.king!==lastKing&&st&&st.type==='king'){
        const a=M.arena;
        if(Math.hypot(pl.x-a.x,(pl.gy-a.y)/FSY)<a.r){ lastKing=M.king; scene(p,'confront',first()); }
      } }
    view(); paint(); }

  // ---- 바닥의 방향 화살표(영웅 발밑, 목표 쪽. 목표가 가까우면 없다)와 화면 안 목표 자리의 표식(떠 있는 꺾쇠, 바닥 고리).
  // 바닥 층(구역 지도·마을 바닥과 길 끝 띠 위, 영웅·NPC·소품 아래)에 그리고, 빛과 표식은 빛 층(fx, 맨 위에 더해진다)에.
  // 경로만 그린다: 그라디언트·새 객체·Math.random 없음. 궁극기 중에는 그리지 않는다
  const AMB='#EBA74E', ARROW_R=230, NEAR=320;
  const prep0=drawBackground_prep; drawBackground_prep=function(){ prep0(); if(on&&VM.has&&G.mode==='surv'&&!PF.story.busy()){ applyCam(ctx); applyCam(fx); mark(); ctx.setTransform(1,0,0,1,0,0); } };
  // 꺾쇠 하나(바닥 거리 u에서 밖을 가리킨다). g는 ctx(어두운 테를 두른 호박색 몸) 또는 fx(그 위의 빛)
  const chev=(g,u)=>{ g.beginPath(); g.moveTo(u+84,0); g.lineTo(u-10,-70); g.lineTo(u+16,0); g.lineTo(u-10,70); g.closePath(); };
  // 발밑 화살표 두 개(가까운 쪽이 진하다): ctx에는 어두운 테를 두른 몸(밝은 바닥에서도 보인다), fx에는 숨쉬는 빛(p)
  function arrow(g,a,glow,p){ g.save(); g.translate(pl.x,pl.gy); g.scale(1,FSY); g.rotate(a); g.fillStyle=AMB; g.strokeStyle='rgba(8,6,2,.75)'; g.lineWidth=10; g.lineJoin='round';
    for(let i=0;i<2;i++){ chev(g,ARROW_R+i*90); g.globalAlpha=(i?.6:1)*(glow?.55*p:.9); if(!glow) g.stroke(); g.fill(); }
    g.restore(); }
  function mark(){ const dx=VM.x-pl.x, dy=(VM.y-pl.gy)/FSY, p=.8+.2*Math.sin(RT*4);
    if(Math.hypot(dx,dy)>NEAR){ const a=Math.atan2(dy,dx); arrow(ctx,a,false,p); arrow(fx,a,true,p); }
    const hw=W/(2*S*cam.z), hh=H/(2*S*cam.z), top=VM.y-VM.h-70-Math.sin(RT*3)*12;
    if(Math.abs(VM.x-cam.x)<hw&&top-40<cam.y+hh&&VM.y>cam.y-hh){
      fx.save(); fx.fillStyle=AMB; fx.strokeStyle=AMB;
      fx.globalAlpha=.9; fx.beginPath(); fx.moveTo(VM.x-30,top-34); fx.lineTo(VM.x+30,top-34); fx.lineTo(VM.x,top+6); fx.closePath(); fx.fill();
      fx.globalAlpha=.3+.25*p; fx.lineWidth=6; fx.beginPath(); fx.ellipse(VM.x,VM.y,120,120*FSY,0,0,Math.PI*2); fx.stroke();
      fx.restore(); } }

  // ---- 기록 창(records, hub.js guild 화면의 후손 기록 판) 맨 아래: 들은 배경 문구("기록 조각")를 놀이 차례대로. 제목을 누르면 펼쳐 다시 읽는다
  const nos=()=>Zs().map(z=>z.no);
  const TITLE={'town.resident':'마을 · 주민','town.map':'마을 · 지도 담당','town.road':'마을 · 동쪽 길',gate:'왕의 문 앞',memory:'왕을 쓰러뜨린 뒤',final:'마지막 화 (임시) · 마을'};
  function title(id){ if(TITLE[id]) return TITLE[id]; const m=/^z(\d+)\.(camp|scout)$/.exec(id), Z=Zs().find(q=>q.no===+m[1]); return Z.no+'구역 '+Z.name+' · '+(m[2]==='camp'?'마을':'정찰'); }
  function text(id){ const L=PF.LORE, m=/^town\.(\w+)$/.exec(id), z=/^z(\d+)\.(camp|scout)$/.exec(id); return m?L.town[m[1]]:z?L.zone[z[1]][z[2]]:L[id]; }
  Q.loreList=()=>loreIds(nos(),story().lore||{}).map(id=>({id,title:title(id),text:text(id)}));
  Q.allLore=()=>loreIds(nos());
  const mo=G.menuOverride;
  G.menuOverride=function(m){ const r=mo.apply(this,arguments);
    const box=PF.win.cur==='records'&&G.hub.scr==='guild'&&m.querySelector('[data-go=hero]'), panel=box&&box.closest('.panel');
    if(panel){ const L=Q.loreList(), d=document.createElement('div'); d.className='pf-lore';
      d.innerHTML='<div class="rule"></div><span class="hk">LORE · 기록 조각</span>'+
        (L.length?L.map(x=>`<details data-pflore="${x.id}"><summary>${x.title}</summary><p></p></details>`).join(''):'<div class="mut">아직 들은 기록이 없습니다</div>');
      // 문구는 글자 그대로 넣는다. 펼치기는 hub.js 화면의 누르기 처리에 닿지 않게
      d.querySelectorAll('[data-pflore]').forEach((e,i)=>{ e.querySelector('p').textContent=L[i].text; e.addEventListener('click',ev=>ev.stopPropagation()); });
      panel.appendChild(d); }
    return r; };

  Q.here=here;
  PF.quest=Q;
}

if(typeof module!=='undefined') module.exports=Q;
})();

// 관리자 쿠폰 (설계 17.6): 설정 창 맨 아래 쿠폰 칸에 관리자 코드를 넣고 비밀번호까지 맞히면 모든 것을 연다(게임 주인의 시험용).
// 코드와 비밀번호는 SHA-256 16진수로만 들어 있고 입력의 해시와 견준다. 비밀번호는 쿠폰과 함께 해시한다(passHash): 숫자 몇 자리라 따로 해시하면
// 모든 경우를 바로 넣어 볼 수 있지만, 쿠폰을 모르면 그렇게 찾을 수 없다. 화면 쪽 검사라 지나가다 찾는 것만 막는다(코드를 읽고 검사를 고치는 사람은 막지 못한다).
// 켜기 직전의 새 저장 원문은 prometheus_save_v1.preadmin에 두고(관리자가 이미 켜진 저장에서 다시 켤 때만 덮지 않는다), "관리자 해제"가 그것으로 되돌린 뒤 페이지를 다시 연다.
// 순수 부분(CODE_HASH, PASS_HASH, sha, norm, passHash, unlock)은 node 시험(frame/test/admin.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 맨 끝에 붙인다
(function(){
'use strict';
const CODE_HASH='93e8971440e553ae3f0eaabaa9edb7c94c9c7c35a79de6c4fe0a6a2a27581f6a';
// passHash(쿠폰, 비밀번호)
const PASS_HASH='81dc47d980605c8bbeb1bfb30c7f6bc36cb065206ef43b029ed8763404320675';
// 관리자가 갖는 크레딧
const CREDITS=999999;
const norm=s=>String(s).trim().toUpperCase();
// UTF-8 바이트의 SHA-256 16진수. 브라우저는 crypto.subtle(https·localhost 같은 보안 연결에만 있다), node는 node:crypto
async function sha(t){ const b=new TextEncoder().encode(String(t));
  if(typeof window==='undefined') return require('node:crypto').createHash('sha256').update(b).digest('hex');
  const d=new Uint8Array(await crypto.subtle.digest('SHA-256',b));
  return Array.from(d,x=>x.toString(16).padStart(2,'0')).join(''); }
// 비밀번호의 해시: 다듬은 쿠폰, 줄바꿈, 비밀번호를 이어서
const passHash=(code,pass)=>sha(norm(code)+'\n'+String(pass).trim());
// 전부 연다. 넘겨받은 SV(rpg.js: 지금 직업의 값은 최상위, 나머지 직업은 SV.chars), H(hub.js), story(frame 저장)만 고치고, 이미 더 높은 값은 낮추지 않는다.
// ctx {classes, skills:{직업:[강화할 스킬]}, maxSkillLv, maxLv, zones, secrets:[id], scenes:[id], colors:{스킬:[색 번호]}}.
// 궁극기는 레벨로 잠금이 풀리므로(rpg.js unlocked: SV.lv>=SK.lv) 레벨만 올린다(장착은 그대로)
function unlock(SV,H,story,ctx){
  for(const c of ctx.classes){ let o=SV;
    // swapClass가 처음 고른 직업에 주는 값
    if(c!==SV.cls){ SV.chars=SV.chars||{}; o=SV.chars[c]=SV.chars[c]||{lv:1,exp:0,sp:0,sl:{},slots:[null,null,null,null],ult:null}; }
    o.lv=Math.max(o.lv||1,ctx.maxLv); o.sl=o.sl||{};
    for(const id of ctx.skills[c]||[]) o.sl[id]=Math.max(o.sl[id]||1,ctx.maxSkillLv); }
  // 마지막 구역은 앞 장을 빌리므로 장 진행(SV.chClear)은 구역 수 − 1까지(field.js winBook과 같다)
  story.cleared=Math.max(story.cleared||0,ctx.zones); SV.chClear=Math.max(SV.chClear||0,ctx.zones-1);
  const found=story.found||(story.found={}), seen=story.seen||(story.seen={});
  for(const id of ctx.secrets) found[id]=1;
  for(const id of ctx.scenes) seen[id]=1;
  // 스킬 색의 보유는 chroma.js가 own['<스킬>:<색 번호>']=1로 적는다. 고른 색(sel)은 그대로
  const cz=H.chroma||(H.chroma={own:{},sel:{}}), own=cz.own||(cz.own={});
  for(const id in ctx.colors) for(const k of ctx.colors[id]) own[id+':'+k]=1;
  H.gold=Math.max(H.gold||0,CREDITS);
  story.admin=1; }
const S={CODE_HASH,PASS_HASH,CREDITS,sha,norm,passHash,unlock};

// ---- 브라우저: boot.js가 frame 파일 맨 끝에 붙인다
if(typeof window!=='undefined'&&window.RPG&&window.PF){
  const G=RPG, A=G.api, PF=window.PF, P=PF.save, PRE=P.KEY+'.preadmin';
  // 스킬 강화의 끝 단계: rpg.js MAXSL, hub.js 시뮬레이터(LV 5에서 진화 완료)와 같다. 두 파일 모두 이 값을 밖으로 내놓지 않아 여기 적는다
  const MAX_SL=5;
  // 비밀번호를 이만큼 잇달아 틀리면 이 시간(밀리초) 동안 받지 않는다(새로 고치면 풀린다)
  const TRIES=5, LOCK_MS=60000;
  const story=()=>P.data.story;
  Object.defineProperty(S,'on',{get:()=>!!story().admin});

  // 지금 게임의 표에서 ctx: 직업(surv.js CLS_ORDER), 직업별 스킬(rpg.js ORDER·SK. 궁극기는 강화가 없다), 레벨, 구역(field.js), 숨은 곳, 장면, 스킬 색
  // 직업 파일(surv.js가 직업마다 따로 받는다)이 아직 다 오지 않아 스킬 목록이 없는 직업이 있거나 스킬 색 표(chroma.js)가 없으면 null: 일부만 열린다
  function ctxOf(){ const X=G.sv, C=G.chroma, classes=X.CLS_ORDER.slice(), ids=c=>(A.ORDER[c]||[]).filter(id=>A.SK[id]);
    if(!C||classes.some(c=>!X.CLS[c]||!ids(c).length)) return null;
    const skills={}, colors={};
    for(const c of classes){ skills[c]=ids(c).filter(id=>A.SK[id].type!=='ult'); for(const id of ids(c)) colors[id]=C.options(id).map((o,k)=>k); }
    // 레벨: 모든 스킬·궁극기가 풀리는 레벨과 밸런스 표 마지막 구역의 나가는 레벨 가운데 큰 쪽을 10 단위로 올린 값(rpg.js에는 레벨 끝이 없다)
    const top=Math.max(1,...classes.flatMap(c=>ids(c).map(id=>A.SK[id].lv||1))), R=PF.balance.rows;
    const maxLv=Math.ceil(Math.max(top,R[R.length-1].lvOut)/10)*10;
    // 숨은 곳: 자료의 자리 + 구역마다 지도의 상자·기록 단말 자리(secret.js builtinId). 지도의 상자·단말 수의 몫은 자료에 없으므로 두 종류 모두 PF.SECRET_BUILTIN개까지 적는다
    // (실제 지도의 id는 모두 이 안에 들고, 지도 창의 수는 PF.SECRET_BUILTIN에서 멈춘다)
    const secrets=PF.SECRETS.map(s=>s.id);
    for(let z=0;z<PF.field.COUNT;z++) for(const t of ['chest','log']) for(let i=0;i<PF.SECRET_BUILTIN;i++) secrets.push(PF.secret.builtinId(z,t,i));
    // 장면: 화 자료(숨은 곳의 장면 화 포함)의 장면 가운데 컷이 있는 것
    const scenes=[];
    for(const e of PF.EP) for(const k of PF.story.SLOTS) if(e.scenes&&e.scenes[k]&&e.scenes[k].length) scenes.push(PF.story.sceneId(e.ep,k));
    return {classes,skills,maxSkillLv:MAX_SL,maxLv,zones:PF.field.COUNT,secrets,scenes,colors}; }

  // 장비: 제작 목록의 종류마다 모든 등급 하나씩, 높은 등급부터 보관함에. 사냥터(field.js)가 주운 장비를 넣는 hub.js settle 길로 넣는다:
  // 보관함 한도(hub.js BAG)·장비 단계(마지막 장의 tierOf)·번호(uid)·새 장비 표시가 그쪽 규칙을 따른다. 넣지 못한 수를 돌려준다.
  // settle은 크레딧 0(노드 0, 처치 0)이고 끝에 제작 목록을 새로 채운다(restock). 첫 번째 부름은 지금 진행(장 7)으로 목록만 새로 채운다
  function gear(){ const h=G.hub, H=h.H, o={win:false,ch:h.ZONES.length-1,kills:0,first:false,t:0};
    h.settle(o,{gold:0,loot:0,nodes:0});
    const slots=[...new Set(H.stock.map(it=>it.slot))], want=[];
    for(let r=h.RAR.length-1;r>=0;r--) for(const slot of slots) want.push({slot,rar:r});
    const n0=H.stash.length;
    h.settle(o,{gold:0,loot:want.length,lootR:want.map(w=>w.rar),nodes:0});
    // settle은 종류를 무작위로 고르므로 넣은 차례대로 종류를 맞춘다
    const got=H.stash.slice(n0); got.forEach((it,i)=>{ it.slot=want[i].slot; });
    return {want:want.length,placed:got.length,left:want.length-got.length}; }

  // 쿠폰 칸의 상태: pend(맞는 코드를 넣어 비밀번호를 기다림), coupon(그때 받은 쿠폰. 비밀번호 해시에 쓴다. 이 안에만 두고 잠글 때·창을 닫을 때 지운다),
  // 잇달아 틀린 수, 잠금이 풀리는 때, 보일 알림, 마지막 적용 결과
  let pend=false, coupon=null, fails=0, until=0, msg=null, busy=false, focus=false;
  const forget=()=>{ pend=false; coupon=null; };
  S.last=null;
  S.redeem=async function(code){ const c=norm(code); pend=(await sha(c))===CODE_HASH; coupon=pend?c:null; return pend?'need-pass':'unknown'; };
  S.confirm=async function(pass){ if(performance.now()<until) return 'locked';
    if(!pend||coupon==null) return 'wrong';
    if((await passHash(coupon,pass))!==PASS_HASH){ if(++fails<TRIES) return 'wrong';
      fails=0; forget(); until=performance.now()+LOCK_MS; return 'locked'; }
    // 이미 켜져 있으면 다시 열지 않는다(장비가 두 번 들어가지 않게)
    forget(); fails=0; return S.on?'ok':apply(); };
  // 적용: 지금 상태를 먼저 저장해 그 원문을 preadmin에 남기고, 살아 있는 SV·H·story를 연 뒤 저장한다.
  // preadmin을 그대로 두는 것은 지금 저장에 관리자 표시(story.admin)가 이미 있을 때뿐이다. 표시가 없으면(관리자가 켜진 채 새 저장이 초기화된 뒤 등)
  // 남아 있던 preadmin은 그보다 앞의 저장이므로 지금 저장으로 새로 쓴다(해제가 더 옛 상태로 돌아가지 않게).
  // commit이 G.noSave를 세우므로 settle 안의 hub.js 저장은 옛 키에 쓰지 않는다.
  // 아무것도 바꾸지 않고 실패를 돌려주는 때: 직업·스킬 색 표가 아직 다 뜨지 않음(notready), preadmin을 남기지 못함(nobackup: 해제로 되돌릴 수 없다)
  function apply(){ const ctx=ctxOf(); if(!ctx) return 'notready';
    P.commit();
    try{ if(!story().admin||localStorage.getItem(PRE)==null) localStorage.setItem(PRE,localStorage.getItem(P.KEY)); if(localStorage.getItem(PRE)==null) throw new Error('preadmin이 비어 있다'); }
    catch(e){ console.warn('frame/admin.js: 되돌릴 사본(preadmin)을 남기지 못해 관리자 권한을 켜지 않았다',e); return 'nobackup'; }
    unlock(A.SV,G.hub.H,story(),ctx);
    S.last=gear();
    P.commit();
    return 'ok'; }
  // 해제: preadmin 원문을 새 저장에 되돌려 다시 불러들이고(살아 있는 값도 되돌아가므로 떠나며 하는 저장이 다시 덮지 않는다) preadmin을 지운 뒤 다시 연다.
  // 마을에서만 된다: 사냥터 판은 떠날 때·앱을 숨길 때 보상·기록을 저장에 담으므로 되돌린 저장에 섞인다
  S.off=function(){ let raw=null; try{ raw=localStorage.getItem(PRE); }catch(e){}
    if(!S.on||raw==null||PF.place.cur!=='town') return false;
    PF.win.close();
    localStorage.setItem(P.KEY,raw); P.load(); localStorage.removeItem(PRE);
    location.reload(); return true; };

  // ---- 설정 창(settings, hub.js guild 화면의 시스템 판) 맨 아래: 쿠폰 칸, 또는 관리자 표시와 해제 버튼. 보기 전용(사냥터 한가운데)에서는 누를 수 없다
  const TXT={unknown:['쓸 수 없는 코드입니다',1],'need-pass':['비밀번호를 입력하세요',0],wrong:['비밀번호가 맞지 않습니다',1],locked:['여러 번 틀려 1분 동안 쓸 수 없습니다',1],
    ok:['관리자 권한이 켜졌습니다',0],fail:['이 연결에서는 쿠폰을 쓸 수 없습니다',1],
    notready:['게임 파일을 아직 불러오는 중입니다 · 잠시 뒤 코드부터 다시 넣으세요',1],nobackup:['되돌릴 사본을 저장하지 못해 켜지 않았습니다 · 저장 공간을 확인하세요',1]};
  const say=k=>{ msg={t:TXT[k][0],bad:!!TXT[k][1]}; if(k==='ok'&&S.last&&S.last.left) msg.t+=` · 보관함이 가득 차 장비 ${S.last.left}개는 넣지 못했습니다`; };
  // 한 줄: 이름 · 입력 칸 · 버튼 · 알림(켜져 있으면 관리자 표시 · 알림 또는 안내 · 해제 버튼). 시스템 판이 낮아 알림도 같은 줄에 둔다
  function box(){ const d=document.createElement('div'), ro=PF.win.readOnly, m=msg?`<span class="pf-cp-msg${msg.bad?' bad':''}" role="status">${msg.t}</span>`:'';
    d.className='pf-coupon';
    if(S.on){ const town=PF.place.cur==='town';
      d.innerHTML=`<div class="pf-cp-row"><span class="pf-cp-badge">관리자</span>${m||`<span class="pf-cp-note">${town?'모든 직업·스킬·장비·구역이 열려 있습니다':'마을에서 해제할 수 있습니다'}</span>`}`+
        `<button type="button" class="pf-cp-btn" data-pfadm="off" ${town&&!ro?'':'disabled'}>관리자 해제</button></div>`;
      d.querySelector('[data-pfadm]').onclick=e=>{ e.stopPropagation(); S.off(); };
      return d; }
    const pass=pend;
    d.innerHTML=`<form class="pf-cp-row" data-pfcp="${pass?'pass':'code'}" novalidate><span class="pf-cp-lb">${pass?'비밀번호':'쿠폰 코드'}</span>`+
      `<input class="pf-cp-in" name="v" ${pass?'type="password" inputmode="numeric" pattern="[0-9]*"':'type="text" autocapitalize="characters"'} autocomplete="off" spellcheck="false" maxlength="40" aria-label="${pass?'비밀번호':'쿠폰 코드'}" ${ro?'disabled':''}>`+
      `<button type="submit" class="pf-cp-btn" ${ro?'disabled':''}>${pass?'확인':'사용'}</button>${m}</form>`;
    const f=d.querySelector('form'), inp=f.querySelector('input');
    f.onsubmit=async e=>{ e.preventDefault(); e.stopPropagation(); if(busy||PF.win.readOnly) return; busy=true;
      try{ const r=pass?await S.confirm(inp.value):await S.redeem(inp.value); say(r); focus=r==='need-pass'||r==='wrong'; }
      catch(err){ console.warn('frame/admin.js: 쿠폰을 확인하지 못했다',err); say('fail'); }
      finally{ busy=false; }
      if(PF.win.cur==='settings') A.menuRender(); };
    if(focus){ focus=false; setTimeout(()=>inp.focus(),0); }
    return d; }
  // 키보드: rpg.js는 surv 모드의 키를 모두 G.survKey로 넘기고, 마을(town.js: Space·1~3)과 지점(spots.js: E·Enter)이 그 키를 막는다.
  // 쿠폰 칸에 치는 글자는 게임에 넘기지 않는다(글자가 들어가고 Enter는 칸을 보낸다). Esc는 그대로 창을 닫는다
  const sk=G.survKey;
  G.survKey=function(e){ const t=e.target; if(t&&t.closest&&t.closest('#rmenu .pf-coupon')&&e.code!=='Escape') return; return sk.apply(this,arguments); };
  // 설정 창을 새로 열면 지난 알림과 비밀번호 단계(받아 둔 쿠폰)는 지운다(잠금은 그대로). 창을 닫을 때도 비밀번호 단계를 지운다
  const wo=PF.win.open, wc=PF.win.close;
  PF.win.open=function(id){ if(id==='settings'){ msg=null; forget(); } return wo.apply(this,arguments); };
  PF.win.close=function(){ forget(); return wc.apply(this,arguments); };
  const mo=G.menuOverride;
  G.menuOverride=function(m){ const r=mo.apply(this,arguments);
    const opt=PF.win.cur==='settings'&&G.hub.scr==='guild'&&m.querySelector('[data-opt]'), panel=opt&&opt.closest('.panel');
    if(panel) panel.appendChild(box());
    return r; };

  PF.admin=S;
}

if(typeof module!=='undefined') module.exports=S;
})();

// 합친 저장 (설계 7장): rpg.js의 저장(chamgwang_rpg_v1)과 hub.js의 저장(chamgwang_hub_v1)을 prometheus_save_v1 하나로 합친다.
// 주소에 frame이 있을 때만 쓰인다. 옛 두 키는 읽기만 하고, 쓰지도 지우지도 않는다.
// 순수 부분(fresh, migrate, compose, project)은 node 시험(frame/test/save.test.js)에서도 불러 쓴다.
(function(){
'use strict';
const KEY='prometheus_save_v1';
// rpg.js의 CH_KEYS와 같다: 직업마다 따로인 값. 지금 직업의 값은 SV 최상위에, 나머지 직업은 SV.chars에 있다(swapClass)
const CH_KEYS=['lv','exp','sp','sl','slots','ult'];
// 저장이 자리를 아는 SV 키(rpg.js)와 H 키(hub.js). 그 밖의 키(다른 작업이 더하는 저장 값, 옛 스테이지 모드의 clear 등)는 모르는 키로 그대로 옮긴다:
// SV 최상위는 저장의 extra, SV.chars[직업]은 그 직업 칸의 extra, H는 shared.extra
const SV_KEYS=['v','cls',...CH_KEYS,'chars','chClear','best','opt'], H_KEYS=['v','gold','stash','gear','stock','uid','fresh','chroma'];
// rpg.js freshSave(옛 스테이지 모드의 clear는 뺌), hub.js freshH, swapClass가 처음 고른 직업에 주는 값
const freshSV=()=>({v:1,cls:'sword',lv:1,exp:0,sp:0,sl:{},slots:['sw_dash','sw_rise',null,null],ult:null});
const freshH=()=>({v:1,gold:0,stash:[],gear:{},stock:[],uid:1,fresh:0});
const freshCh=()=>({lv:1,exp:0,sp:0,sl:{},slots:[null,null,null,null],ult:null});
const copy=x=>JSON.parse(JSON.stringify(x));
const pick=o=>{ const r={}; for(const k of CH_KEYS) if(k in o) r[k]=o[k]; return r; };
// o에서 known에 없는 키만. 없으면 null: 저장에 빈 extra를 남기지 않는다(모르는 키가 없으면 저장 모양은 예전 그대로)
const rest=(o,known)=>{ const r={}; let n=0; for(const k of Object.keys(o)) if(!known.includes(k)){ r[k]=o[k]; n++; } return n?r:null; };
// rpg.js와 hub.js가 옛 저장을 받아들이는 조건과 같다
const ok=s=>!!s&&typeof s==='object'&&s.v===1;

// 살아 있는 SV(rpg.js)와 H(hub.js)를 저장 한 덩어리로. story와 best2는 frame만 쓰는 값이라
// PF.save.data에 있는 것을 같은 객체 그대로 넘긴다(frame 파일들이 들고 있는 참조가 저장 뒤에도 맞게)
function compose(SV,H,x={}){
  const sv=copy(SV), h=copy(H), gear=h.gear||{}, chars={};
  for(const c in sv.chars||{}){ chars[c]=pick(sv.chars[c]); const e=rest(sv.chars[c],CH_KEYS); if(e) chars[c].extra=e; }
  chars[sv.cls]=pick(sv);
  for(const c in gear) if(!chars[c]) chars[c]=freshCh();
  for(const c in chars) chars[c].gear=gear[c]||{};
  const s={v:1,cls:sv.cls,
    story:x.story||{cleared:sv.chClear||0,seen:{},found:{}},
    // 스킬 색(chroma.js)은 hub 저장 안의 모양 그대로 둔다. 없으면 chroma.js가 처음 만들 때의 모양
    shared:{credits:h.gold||0,stash:h.stash||[],stock:h.stock||[],uid:h.uid||1,fresh:h.fresh||0,chroma:h.chroma||{own:{},sel:{}}},
    chars,best:sv.best||{},best2:x.best2||{},opt:Object.assign(sv.opt||{},x.opt2)};
  const e=rest(sv,SV_KEYS), he=rest(h,H_KEYS);
  if(e) s.extra=e;
  if(he) s.shared.extra=he;
  return s;
}
const fresh=()=>compose(freshSV(),freshH());
// 옛 저장 둘에서 처음 한 번 옮긴다. 없거나 깨진 쪽은 새 것으로 본다
function migrate(rpgOld,hubOld){
  return compose(Object.assign(freshSV(),ok(rpgOld)?rpgOld:null),Object.assign(freshH(),ok(hubOld)?hubOld:null));
}
// 저장 한 덩어리를 rpg.js의 SV 모양과 hub.js의 H 모양으로 되돌린다
function project(s){
  s=copy(s);
  const cur=s.chars[s.cls]||freshCh(), others={}, gear={};
  // 모르는 키(extra)를 먼저 펴고 아는 키를 그 위에 둔다
  for(const c in s.chars){ gear[c]=s.chars[c].gear||{}; if(c!==s.cls) others[c]={...s.chars[c].extra,...pick(s.chars[c])}; }
  const SV={...s.extra,v:1,cls:s.cls,...pick(cur),chClear:Math.min(7,s.story.cleared),best:s.best,opt:s.opt};
  // rpg.js는 직업을 한 번이라도 바꾼 뒤에만 SV.chars를 둔다(hub.js 첫 화면이 이것으로 '작전 재개'를 가른다)
  if(Object.keys(others).length) SV.chars=others;
  const sh=s.shared;
  return {SV,H:{...sh.extra,v:1,gold:sh.credits,stash:sh.stash,gear,stock:sh.stock,uid:sh.uid,fresh:sh.fresh,chroma:sh.chroma}};
}
const S={KEY,fresh,migrate,compose,project};

// ---- 브라우저: boot.js가 RPG, RPG.sv, RPG.hub, RPG.dun이 생긴 뒤에 붙인다. 전역 pl, setClass(index.html)를 쓴다
if(typeof window!=='undefined'&&window.RPG){
  const G=RPG, A=G.api, PF=window.PF=window.PF||{};
  const read=k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
  // 살아 있는 객체 o(SV, H)를 저장에서 되돌린 n으로: 저장이 맡는 키(own) 가운데 n에 없는 것만 지운다.
  // 그 밖의 키는 n에 있으면(저장의 extra) 덮고, 없으면(저장이 만들어진 뒤 rpg.js·hub.js에 생긴 키) 남긴다
  const put=(o,n,own)=>{ for(const k of own) if(!(k in n)) delete o[k]; Object.assign(o,n); };
  // 불러오기에 실패했을 때 처음 상태로 그대로 되돌린다(load가 더한 키도 지운다)
  const back=(o,n)=>{ for(const k of Object.keys(o)) if(!(k in n)) delete o[k]; Object.assign(o,n); };
  let last=null;
  S.load=function(){
    let raw=null, s=null;
    try{ raw=localStorage.getItem(KEY); s=JSON.parse(raw); }catch(e){}
    if(!(ok(s)&&s.story&&s.shared&&s.chars&&s.chars[s.cls])){
      // 읽을 수 없는 새 키는 아래 commit이 덮어쓰기 전에 옆 키에 글자 그대로 남긴다
      if(raw!=null) try{ localStorage.setItem(KEY+'.bad',raw); }catch(e){}
      s=migrate(read('chamgwang_rpg_v1'),read('chamgwang_hub_v1'));
    }
    const p=project(s), sv=A.SV, h=G.hub.H;
    // hub.js는 제작 목록이 비어 있으면 켤 때 새로 채운다. 저장에 목록이 없으면 hub.js가 방금 채운 것을 남긴다
    if(!p.H.stock.length&&h.stock&&h.stock.length){ p.H.stock=h.stock; p.H.uid=Math.max(p.H.uid,h.uid); }
    // 다른 파일들이 SV와 H 객체의 참조를 들고 있으므로 바꿔치기하지 않고 키 단위로 덮어쓴다
    put(sv,p.SV,SV_KEYS);
    put(h,p.H,H_KEYS);
    if(pl.cls!==sv.cls) setClass(sv.cls,true);
    S.data=s;
    if(G.mode==='menu') A.menuRender();
    // 끝까지 문제없이 왔을 때만 새 키에 쓴다
    last=null; S.commit();
    return S.data;
  };
  S.commit=function(){
    const D=S.data;
    if(!D) return;
    // 연습장을 나갈 때 surv.js가 noSave를 false로 되돌리므로 부를 때마다 다시 막는다(옛 키에 쓰지 않게)
    G.noSave=true;
    if(G.sv.V.practice) return;
    const sv=A.SV;
    // surv.js는 화를 깨면 SV.chClear만 올린다. story 객체는 그대로 둔 채 값만 올린다(max라 내려가지 않는다)
    if((sv.chClear||0)>D.story.cleared) D.story.cleared=sv.chClear;
    const s=compose(sv,G.hub.H,{story:D.story,best2:D.best2});
    for(const k in s) D[k]=s[k];
    // 모르는 키가 모두 없어졌으면 지난 extra를 남기지 않는다(shared·chars는 compose가 새로 만든다)
    if(!s.extra) delete D.extra;
    const j=JSON.stringify(D);
    if(j===last) return;
    try{ localStorage.setItem(KEY,j); last=j; }catch(e){}
  };
  // load가 실패하면 이 상태(옛 두 키에서 읽은 진행, 옛 저장 함수)로 되돌린다. 저장을 켤지(noSave)는 바로 뒤 boot.js ready가 정한다:
  // 새 저장이 있으면 끈 채 새로 고침을 알리고, 없으면 옛 저장 방식으로 둔다
  const sv0=JSON.stringify(A.SV), h0=JSON.stringify(G.hub.H), save0=A.save, hsave0=G.hub.save;
  try{
    G.noSave=true; A.save=S.commit; G.hub.save=S.commit;
    PF.save=S;
    S.load();
    // rpg.js·hub.js 안에서 직접 부르는 save()·hsave()는 noSave로 막히므로, 그 변화는 2초마다와 화면을 떠날 때 담는다
    setInterval(S.commit,2000);
    document.addEventListener('visibilitychange',S.commit);
    addEventListener('pagehide',S.commit);
  }catch(e){
    console.error('frame/save.js: 저장을 불러오지 못했다',e);
    S.data=null; A.save=save0; G.hub.save=hsave0;
    back(A.SV,JSON.parse(sv0)); back(G.hub.H,JSON.parse(h0));
    if(pl.cls!==A.SV.cls) setClass(A.SV.cls,true);
    if(G.mode==='menu') A.menuRender();
  }
}

if(typeof module!=='undefined') module.exports=S;
})();

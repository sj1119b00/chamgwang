// 구역 밸런스 (설계 17.2, 규칙 R1+R2 2026-11-27): 기준 경로(노드 셋 → 왕)에서 잡는 몹과 그 경험치로 구역마다 들어오는·나가는 레벨을 구하고,
// 그 레벨의 직업 평균 화력(frame/data/dps.js, 측정값)으로 몹 체력·공격력과 왕 체력을 거꾸로 정한다.
// R1: 잡몹(shard·archer)은 무리를 때릴 때의 화력으로, 하나짜리(큰 몹·노드·왕)는 하나만 때릴 때의 화력으로 '잡는 초'를 정한다.
// R2: 구역 안에서는 몹 체력·공격력이 영웅의 지금 레벨을 따르되 그 구역의 [lvIn, lvOut]으로 자른다. 이미 나온 적은 나올 때의 체력 그대로(노드는 깨어날 때 한 번).
// CAL: 표의 예측(측정 화력으로 나눈 값)을 실제 플레이로 잰 값에 맞추는 보정(frame/test/measure-dps.js --cal). 사냥터·그 구역의 숨은 방에 적용하고 떠나면 되돌린다.
// 직업(Task 15, 설계 17.8): 표는 직업 평균이고, 나오는 몹은 그 직업의 값이다(직업 화력 ÷ 직업 평균 = clsK, 한 마리 상대는 역할 배율 ROLE, 받는 피해는 takenK).
// 검사의 옛 특별 설정(surv.js DIF)은 frame에서 쓰지 않는다(surv.js dif가 1).
// 순수 부분(BAND, levelAfter, interp, table, valuesAt, check, clsK …)은 node 시험(frame/test/balance.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 data/dps·data/classes 다음에 붙인다
(function(){
'use strict';
// 목표 범위: 잡몹 하나(무리 10마리 처리 속도로 본 초), 큰 몹·노드 하나(초), 잡몹에게 쓰러지기까지 맞는 횟수, 왕과의 싸움(초),
// 넘어갈 때 잡몹 시간의 배율(구역 N 나갈 레벨의 영웅이 구역 N 몹 → 같은 영웅이 구역 N+1에 들어갈 때), 이미 깬 구역의 경험치 몫. 노드 범위는 R1과 함께 생겼다.
// 직업을 모으는 법: 잡몹·큰 몹·왕·맞는 횟수는 직업 평균, 노드만 직업 중앙값(Lv1 궁수·거너는 물결만 쏘아 노드를 못 깨 평균을 망친다. 그런 직업은 frame/data/dps.js 머리에 적는다).
// 노드는 가장 흔들리는 값이다(직업이 빠른 무리·느린 무리로 갈리고, 씨앗을 바꾸면 중앙값이 7~17초를 오간다. 직업의 대상 고르기에 달렸다). 그래서 노드 범위는 6~20초로 넓게 본다
const BAND={fodder:[0.6,1.4],brute:[4,8],node:[6,20],hitsToDie:[12,18],king:[70,110],step:[1.10,1.35],repeatExp:0.25};
// 노리는 값(구역마다 조금씩 어려워진다): 잡몹 초는 구역 0 first → 마지막 last(같은 비율, step 범위 아래 끝 1.11배씩이면 0.64 → 1.34),
// 큰 몹·노드·왕의 초와 맞는 횟수는 구역 0 [0] → 마지막 구역 [1]을 같은 비율로 잇는다(맞는 횟수는 줄어든다 = 몹 공격이 세진다). 범위 끝에서 이만큼(몫) 안쪽을 노린다
// 큰 몹·노드는 범위 끝에서 여유를 두려고 안쪽으로 당겼다(4.5→7.5, 9→15에서 4.8→7.3, 10→14: 컨트롤러 결정)
const AIM={first:0.64,last:1.34,brute:[4.8,7.3],node:[10,14],king:[75,105],hits:[17,13]}, IN=0.01, EPS=1e-9;
// 구역 z의 큰 몹·노드·왕·맞는 횟수 목표(n 구역)
const aimAt=(z,n)=>{ const o={}; for(const q of ['brute','node','king','hits']){ const [a,b]=AIM[q]; o[q]=a*Math.pow(b/a,z/(n-1)); } return o; };
const ONE={fodder:1,brute:1,node:1,king:1,hits:1};
// 구역 → dun.js가 쓰는 장(ch). field.js chOf와 같다(마지막 구역은 그 앞 장을 빌린다)
const chOf=(z,n)=>Math.min(z,n-2);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
// 경험치 gained를 얻은 뒤의 레벨과 남은 경험치(rpg.js gainExp와 같은 셈)
function levelAfter(lv,exp,gained,needExp){ exp+=gained;
  while(exp>=needExp(lv)){ exp-=needExp(lv); lv++; }
  return {lv,exp}; }
// 측정한 점들({레벨:값})에서 lv의 값. 사이는 선형, 바깥은 끝 값
function interp(pts,lv){ const L=Object.keys(pts).map(Number).sort((a,b)=>a-b);
  if(lv<=L[0]) return pts[L[0]];
  for(let i=1;i<L.length;i++) if(lv<=L[i]){ const a=L[i-1], b=L[i]; return pts[a]+(pts[b]-pts[a])*(lv-a)/(b-a); }
  return pts[L[L.length-1]]; }
// 배율은 유효 숫자 4자리(작은 배율에서도 범위 끝의 1% 여유를 반올림이 먹지 않게)
const r4=v=>+v.toPrecision(4);

// 구역 z(표의 한 줄 row)에서 영웅 레벨 lv일 때의 값(R2: lv를 [lvIn, lvOut]으로 자른다). 체력은 '몹 체력 기준'(직업의 DIF는 나올 때 surv.js가 곱한다)
//   hpK: 잡몹 장 배율(CHAP.hp), dmgK: 공격력 장 배율(CHAP.dmg), bruteHp·nodeHp·bossHp: 그 몹의 체력
// 보정 CAL의 항목은 수 하나이거나 레벨별 점({레벨:값}, 사이는 선형, 바깥은 끝 값). 지금 표는 항목마다 수 하나를 쓴다(아래 CAL)
const calAt=(I,L)=>{ const c=I.cal||ONE, o={}; for(const q in ONE) o[q]=typeof c[q]==='number'?c[q]:interp(c[q],L); return o; };
// I.taken: 몹 공격력에 곱하는 받는 피해 배율(직업의 입력 clsInput이 둔다, 없으면 1). I.dps1(레벨, 종류 'brute'|'node'|'king'): 직업의 입력은 종류마다 보정이 다르다
function valuesAt(I,row,lv){ const b=I.base, d1=I.dps1||I.dps, L=clamp(lv,row.lvIn,row.lvOut), c=calAt(I,L), a=row.aim;
  return {lv:L,hpK:r4(row.T*I.dps(L)/(b.shard.hp*c.fodder)),dmgK:r4(I.maxHp(L)*c.hits*(I.taken||1)/(a.hits*b.shard.dmg)),
    bruteHp:Math.round(a.brute*d1(L,'brute')/c.brute),nodeHp:Math.round(a.node*d1(L,'node')/c.node),bossHp:Math.round(a.king*d1(L,'king')/c.king/100)*100}; }
// 그 값으로 실제로 잴 때 나올 것이라 보는 값(측정 화력 × 보정 CAL): 잡몹·큰 몹·왕의 초와 맞는 횟수는 직업 평균, 노드의 초는 직업 중앙값(보정을 그렇게 잰다)
function predict(I,row,lv){ const b=I.base, d1=I.dps1||I.dps, v=valuesAt(I,row,lv), L=v.lv, c=calAt(I,L);
  return {fodder:v.hpK*b.shard.hp*c.fodder/I.dps(L),brute:v.bruteHp*c.brute/d1(L,'brute'),node:v.nodeHp*c.node/d1(L,'node'),king:v.bossHp*c.king/d1(L,'king'),
    hits:I.maxHp(L)*c.hits/(b.shard.dmg*v.dmgK)}; }

// 구역 표. I.dps: 잡몹 무리를 때릴 때의 초당 피해(레벨 → 값), I.dps1: 하나만 때릴 때(없으면 dps),
// I.extra: 구역마다 몹 말고 기준 경로에서 얻는 경험치(노드. 없으면 0), I.cal: 보정(없으면 모두 1)
function table(I){
  const n=I.zones, g=I.gem, L=[];
  // 레벨: 몹(+노드) 경험치로 왕 앞 레벨, 왕 경험치와 첫 제압 보너스(field.js winBook: 150×(ch+1))로 나가는 레벨
  let lv=I.startLv, ex=0;
  for(let z=0;z<n;z++){ const k=I.kills[z], ch=chOf(z,n);
    const a=levelAfter(lv,ex,k.shard*g.shard+k.archer*g.archer+k.brute*g.brute+((I.extra&&I.extra[z])||0),I.needExp);
    const o=levelAfter(a.lv,a.exp,g.boss+150*(ch+1),I.needExp);
    L.push({lvIn:lv,lvKing:a.lv,lvOut:o.lv}); lv=o.lv; ex=o.exp; }
  // 잡몹 초 T: 구역 0은 AIM.first, 마지막은 AIM.last 부근, 구역마다 같은 비율. R2에서는 넘어갈 때의 배율이 곧 이 비율이라 step 범위로 자르고, T는 잡몹 범위 안
  const fb=[BAND.fodder[0]*(1+IN),BAND.fodder[1]*(1-IN)], sb=[BAND.step[0]*(1+IN),BAND.step[1]*(1-IN)];
  const path=r=>{ const T=[clamp(AIM.first,...fb)]; for(let z=0;z+1<n;z++) T.push(clamp(T[z]*clamp(r,...sb),...fb)); return T; };
  let lo=0.5, hi=2;
  for(let i=0;i<60;i++){ const m=(lo+hi)/2; if(path(m)[n-1]<AIM.last) lo=m; else hi=m; }
  const T=path((lo+hi)/2);
  const R=L.map((l,z)=>{ const row={zone:z,...l,T:T[z],aim:aimAt(z,n)}, mid=(l.lvIn+l.lvOut)/2, v=valuesAt(I,row,l.lvIn), m=predict(I,row,mid);
    return Object.assign(row,{hpK:v.hpK,dmgK:v.dmgK,bruteHp:v.bruteHp,nodeHp:v.nodeHp,bossHp:valuesAt(I,row,l.lvKing).bossHp,
      ttk:{fodder:m.fodder,brute:m.brute,node:m.node,in:predict(I,row,l.lvIn).fodder,out:predict(I,row,l.lvOut).fodder},
      hitsToDie:m.hits,kingSec:predict(I,row,l.lvKing).king}); });
  // check가 표의 모양(레벨에 따른 값)을 보도록 입력을 붙여 둔다(줄 목록에는 보이지 않게)
  Object.defineProperty(R,'input',{value:I});
  return R; }

// 범위를 벗어난 항목과 표 모양의 잘못을 적은 목록(구역 순서, 비면 통과). 줄마다 예측값의 범위, 넘어갈 때 잡몹 시간 배율(앞 구역 나갈 레벨의 영웅이 같은 레벨로 이 구역에 들어올 때),
// ttk.node는 직업 중앙값으로 본 노드 시간(나머지는 직업 평균). 표에 입력이 붙어 있으면(table이 붙인다) 표의 모양도 본다:
// 목표가 범위 안이고 구역마다 어려워지는가, 보정이 그럴듯한가(0.5~4배), 구역 안에서 레벨이 오를 때 체력·공격력이 줄지 않는가,
// 다음 구역에 들어갈 때 모든 값이 앞 구역 나갈 때보다 작지 않은가, 값이 유한한 양수인가
const KINDS=[['hpK','잡몹 체력'],['bruteHp','큰 몹 체력'],['nodeHp','노드 체력'],['bossHp','왕 체력'],['dmgK','몹 공격력']], CAL_OK=[0.5,4];
function check(R){ const out=[], f=v=>(+v).toFixed(2), off=(v,[a,b])=>!(v>=a-EPS&&v<=b+EPS);
  R.forEach((r,i)=>{ const z='구역 '+r.zone;
    if(i>0){ const s=r.ttk.in/R[i-1].ttk.out; if(off(s,BAND.step)) out.push(`${z}: 넘어올 때 잡몹 시간 ×${f(s)} (목표 ×${BAND.step[0]}~${BAND.step[1]})`); }
    if(off(r.ttk.fodder,BAND.fodder)) out.push(`${z}: 잡몹 ${f(r.ttk.fodder)}초 (목표 ${BAND.fodder[0]}~${BAND.fodder[1]})`);
    if(off(r.ttk.brute,BAND.brute)) out.push(`${z}: 큰 몹 ${f(r.ttk.brute)}초 (목표 ${BAND.brute[0]}~${BAND.brute[1]})`);
    if(off(r.ttk.node,BAND.node)) out.push(`${z}: 노드(직업 중앙값) ${f(r.ttk.node)}초 (목표 ${BAND.node[0]}~${BAND.node[1]})`);
    if(off(r.hitsToDie,BAND.hitsToDie)) out.push(`${z}: 쓰러지기까지 ${f(r.hitsToDie)}번 (목표 ${BAND.hitsToDie[0]}~${BAND.hitsToDie[1]})`);
    if(off(r.kingSec,BAND.king)) out.push(`${z}: 왕 ${f(r.kingSec)}초 (목표 ${BAND.king[0]}~${BAND.king[1]})`); });
  const I=R.input; if(!I) return out;
  R.forEach((r,i)=>{ const z='구역 '+r.zone, a=r.aim, p=i>0&&R[i-1].aim;
    // 목표: 범위 안, 그리고 앞 구역보다 어렵다(큰 몹·노드·왕은 길고, 맞는 횟수는 적다)
    for(const [q,band,nm] of [['brute',BAND.brute,'큰 몹'],['node',BAND.node,'노드'],['king',BAND.king,'왕'],['hits',BAND.hitsToDie,'맞는 횟수']]){
      if(off(a[q],band)) out.push(`${z}: ${nm} 목표 ${f(a[q])}가 범위 밖 (${band[0]}~${band[1]})`);
      if(p&&(q==='hits'?a[q]>p[q]+EPS:a[q]<p[q]-EPS)) out.push(`${z}: ${nm} 목표가 앞 구역보다 쉽다 (${f(p[q])} → ${f(a[q])})`); }
    // 구역 안: 레벨이 오를 때 줄지 않고 유한한 양수
    for(let L=r.lvIn;L<=r.lvOut;L++){ const v=valuesAt(I,r,L), w=L<r.lvOut&&valuesAt(I,r,L+1), c=calAt(I,L);
      for(const [k,nm] of KINDS){ if(!(Number.isFinite(v[k])&&v[k]>0)) out.push(`${z}: ${nm}이 Lv${L}에서 ${v[k]}`); else if(w&&w[k]<v[k]) out.push(`${z}: ${nm}이 Lv${L}→${L+1}에서 준다 (${v[k]} → ${w[k]})`); }
      for(const q in ONE) if(off(c[q],CAL_OK)) out.push(`보정 ${q}: Lv${L}에서 ×${f(c[q])} (그럴듯한 범위 ${CAL_OK[0]}~${CAL_OK[1]})`); }
    // 넘어갈 때: 같은 레벨(앞 구역 나갈 레벨 = 이 구역 들어올 레벨)에서 모든 값이 앞 구역보다 작지 않다
    if(i>0){ const u=valuesAt(I,R[i-1],R[i-1].lvOut), v=valuesAt(I,r,r.lvIn);
      for(const [k,nm] of KINDS) if(v[k]<u[k]) out.push(`${z}: 들어올 때 ${nm}이 앞 구역 나갈 때보다 작다 (${u[k]} → ${v[k]})`); } });
  return [...new Set(out)]; }

// 기준 경로(첫 판: 노드 셋 → 왕)에서 구역마다 잡는 몹: 구역 0·6은 자동 플레이(node frame/test/measure-dps.js --walk 0,6, 9직업 평균)로 잰 값, 1~5는 dun.js 값으로 계산한 것에
// 0·6의 잰 값/계산값 비율을 보간해 곱하고, 7은 6과 같은 지도라 6 값. 처음 계산과 잰 값의 내력은 Task 9 보고서(R-2, 노드 범위 절)
const KILLS=[{shard:374,archer:46,brute:12},{shard:378,archer:49,brute:11},{shard:409,archer:56,brute:13},{shard:437,archer:64,brute:13},
  {shard:441,archer:70,brute:13},{shard:463,archer:79,brute:11},{shard:467,archer:86,brute:11},{shard:467,archer:86,brute:11}];
// 보정: 실제로 잰 값(frame/test/balance-probe.js, 씨앗 고정, 9직업 평균·노드는 중앙값) / 보정 없는 예측. 항목마다 수 하나 또는 레벨에 따라 고르게 바뀌는 직선 하나
// (점마다 다른 값은 한 번 잰 흔들림을 표에 굽는다: 고침 1회). 내력은 Task 9 보고서(R-5, 노드 범위, 씨앗, 고침 1회 절)
// 큰 몹은 네 점(구역 0·6 들어올·나갈)에 맞춘 직선(Lv1 1.41 → Lv29 1.57): 수 하나(1.47)로는 구역 6 나갈 때 8.3초로 범위(4~8) 밖이었다.
// 노드는 2.03에서 네 점이 목표의 1.16·0.57·0.68·1.09배라(구역 0 나갈 때 5.1초) 그 기하 평균(0.835)만큼 고르게 옮긴 1.70
// Task 15(2026-11-27, measure-dps.js --cal 0,6): 직업 배율(clsK·역할)과 검사 DIF 1, 노드 우선(NODE)이 들어간 뒤 다시 맞췄다. 큰 몹·노드·왕은 역할 배율로 나눈 시간의 직업 평균.
// 점마다 필요한 보정: 잡몹 1.70·1.85·1.58·1.72, 큰 몹 1.04·1.01·1.12·1.61, 노드 1.02·1.16·1.02·1.22, 왕 1.13·1.10·0.97·1.02, 맞는 횟수 1.53·1.57·1.61·1.61.
// 큰 몹만 직선: 수 하나(1.17)면 구역 6 나갈 때 직업 평균이 약 9.5초(범위 4~8 밖). 큰 몹 시간은 직업마다 계단처럼 뛴다(처음 몰아치는 스킬로 끝나거나 다음 쿨타임까지 기다린다:
// 같은 직선에서 샤먼 Lv26 8.8초 → Lv29 20.1초). 직선 몇 개를 잰 값(구역 0 Lv1·Lv8, 구역 6 Lv26·Lv29의 직업 평균): 0.97→1.39 5.90·4.49·6.74·8.12초, 1.0→1.45 5.72·4.46·5.98·8.04초,
// 1.0→1.55 5.72·4.59·5.45·7.42초, 1.0→1.65 5.72·4.54·4.79·6.47초. 네 점이 모두 범위(4~8) 안쪽으로 가장 여유 있는 1.0 → 1.65
const CAL={fodder:1.71,brute:{1:1.0,29:1.65},node:1.10,king:1.05,hits:1.58};
// 한 마리가 남기는 경험치의 기댓값(surv.js die(): 왕 24개·큰 몹(gem 5 이상) 3개·나머지 1개로 나눠 떨군다. gem 1짜리는 35%만, 값 2로)
const expOf=d=>{ const n=d.boss?24:d.gem>=5?3:1; return (d.gem>1?1:.35)*n*Math.ceil(d.gem/n)*(d.gem>1?1:2); };
// 직업 평균(그 레벨에서 잰 값이 0보다 큰 직업만: 재지 못한 직업이 평균을 끌어내리지 않게. clsK도 같은 평균으로 나눈다)
const avgOf=T=>lv=>{ const v=Object.keys(T).map(k=>interp(T[k],lv)).filter(x=>x>0); return v.length?v.reduce((s,x)=>s+x,0)/v.length:0; };

// ---- 직업 밸런스 (Task 15, 설계 17.8): 직업마다 몹의 단단함을 달리 준다. 센 직업의 몹은 단단하게, 약한 직업의 몹은 무르게 해서 잡는 시간을 맞춘다(화면의 피해 숫자는 그대로)
// ROLE: single = 한 마리 상대(큰 몹·노드·왕)의 잡는 시간 배율(몹 체력에 곱한다), taken = 받는 피해 배율(몹 공격력과 왕의 패턴 피해에 곱한다)
const ROLE={melee:{single:1/1.10,taken:0.80},ranged:{single:1.05,taken:1.00}};
// 직업 보정(규칙 변경, 2026-11-27 컨트롤러 결정): frame/data/clscal.js의 CLS_CAL[직업] = {crowd, king}, 각각 레벨별 점({레벨:값}, 사이는 선형, 바깥은 끝 값; 수 하나도 된다).
// 값은 표와 역할 배율로 맞춘 뒤 그 직업이 그 레벨에서 잰 시간 ÷ 목표에 맞춘 것(몹 체력을 이것으로 나눈다). 측정 도구(measure-dps.js --cal)가 쓴다. 큰 몹·노드는 보정하지 않는다. 없으면 1
// 측정한 점들({레벨:값})을 레벨이 오를 때 내려가지 않게: 그 레벨까지의 가장 큰 값(측정 흔들림, 예: 파이로 무리 화력 Lv15 → 20의 하락)
function smooth(t){ const o={}; let m=-Infinity; for(const k of Object.keys(t).map(Number).sort((a,b)=>a-b)){ m=Math.max(m,t[k]); o[k]=m; } return o; }
// 직업 표({직업:{레벨:값}})를 직업마다 다듬은 것(표마다 한 번 셈해 둔다)
const SMT=new WeakMap();
const smoothAll=T=>{ let s=SMT.get(T); if(!s){ s={}; for(const c in T) s[c]=smooth(T[c]); SMT.set(T,s); } return s; };
// 직업 자료의 기본값: 브라우저는 boot.js가 먼저 붙인 PF.DPS·PF.DPS1(data/dps)·PF.CLASSES(data/classes)·PF.CLS_CAL(data/clscal), node 시험은 그 파일들
let DATA0=null;
const DATA=()=>DATA0||(DATA0=typeof module!=='undefined'?{...require('./data/dps.js'),CLASSES:require('./data/classes.js'),CLS_CAL:require('./data/clscal.js')}:
  {DPS:window.PF.DPS,DPS1:window.PF.DPS1,CLASSES:window.PF.CLASSES||{},CLS_CAL:window.PF.CLS_CAL||{}});
// 그 직업의 화력 ÷ 직업 평균 화력(둘 다 다듬은 표, 레벨 사이는 선형). kind: 'crowd'(잡몹 무리, DPS) | 'single'(하나, DPS1).
// 표에 없거나 잰 화력이 0인 직업은 1(측정 전에는 평균으로). 측정이 망가져도 몹이 터무니없게 되지 않게 [CLS_K[0], CLS_K[1]]로 자른다
const CLS_K=[.25,4];
function clsK(cls,lv,kind,o){ const T=smoothAll((o||DATA())[kind==='single'?'DPS1':'DPS']), v=T[cls]?interp(T[cls],lv):0, a=avgOf(T)(lv);
  return v>0&&a>0?clamp(v/a,CLS_K[0],CLS_K[1]):1; }
// 역할. 자료(C, 기본은 data/classes.js)에 없는 직업은 원거리
const roleOf=(cls,C)=>{ const c=(C||DATA().CLASSES)[cls]; return c&&c.role==='melee'?'melee':'ranged'; };
const takenK=(cls,C)=>ROLE[roleOf(cls,C)].taken;
// 직업 보정을 받는 종류(2026-11-27 컨트롤러 최종 결정): 잡몹·왕만. 큰 몹은 잡는 시간이 계단처럼 뛰어 보정이 넘쳤으므로(파이로 구역 0 Lv8: 1차 뒤 ×3.72 → 2차 뒤 ×0.38)
// 노드처럼 clsK × 역할 배율만 쓰고, 직업별 큰 몹 시간은 재서 적기만 한다
const CC_KINDS=['crowd','king'];
// 그 직업·그 종류의 보정(레벨 lv). 없거나 보정을 받지 않는 종류면 1
const ccAt=(C,cls,kind,lv)=>{ if(!CC_KINDS.includes(kind)) return 1; const c=(C[cls]||{})[kind]; return c==null?1:typeof c==='number'?c:interp(c,lv); };
// 스폰 때 몹 체력에 곱하는 직업 배율. kind: 'crowd'(잡몹·궁수 몹) | 'brute' | 'node' | 'king' ('single'은 보정 없는 한 마리 상대).
// clsK, 한 마리 상대면 역할 배율도, 직업 보정이 있으면 그것으로 나눈다. o: {DPS, DPS1, CLASSES, CLS_CAL}(빠진 것은 기본값)
function clsHp(cls,lv,kind,o){ const d={...DATA(),...o}, crowd=kind==='crowd';
  return clsK(cls,lv,crowd?'crowd':'single',d)*(crowd?1:ROLE[roleOf(cls,d.CLASSES)].single)/ccAt(d.CLS_CAL,cls,kind,lv); }
// 직업 cls의 표 입력: 잡몹 화력에 무리 배율, 하나짜리 화력에 그 종류의 배율(clsHp)을 곱하고 몹 공격력에 takenK를 곱한다(valuesAt이 I.taken을 본다).
// 그래서 valuesAt(clsInput(I,c),줄,레벨)의 체력은 valuesAt(I,줄,레벨)의 값 × clsHp(c,레벨,종류)이고 반올림은 한 번이다
// (반올림한 표 값에 배율을 곱하면 다듬은 직업 표가 평평한 곳에서 값이 반올림만큼 줄 수 있다). 레벨에 따라 줄지 않는지는 직업 보정까지 넣은 값으로 시험한다(balance.test.js)
function clsInput(I,cls,o){ const d1=I.dps1||I.dps;
  return {...I,dps:lv=>I.dps(lv)*clsHp(cls,lv,'crowd',o),dps1:(lv,kind)=>d1(lv,kind)*clsHp(cls,lv,kind||'single',o),taken:(I.taken||1)*takenK(cls,o&&o.CLASSES)}; }
// 표의 입력(브라우저와 node 시험이 같이 쓴다). o.EN: surv.js 적 표(+dun.js node), o.DPS·o.DPS1: frame/data/dps.js, o.maxHp·o.needExp: 레벨 → 값.
// 직업 평균 화력은 다듬은 직업 표들의 평균(Task 15: clsK가 나누는 평균과 같아야 직업별 값 = 표 × clsK가 레벨에 따라 줄지 않는다).
// 노드가 주는 경험치: 노드 자신의 몫 + 부서질 때 뿌리는 10개(dun.js tick: 값 6+2ch)
function inputOf(o){ const EN=o.EN, n=o.zones, ch=o.chOf||(z=>chOf(z,n)), b=k=>({hp:EN[k].hp,dmg:EN[k].dmg});
  return {zones:n,kills:KILLS,gem:{shard:expOf(EN.shard),archer:expOf(EN.archer),brute:expOf(EN.brute),boss:expOf(EN.boss)},
    base:{shard:b('shard'),archer:b('archer'),brute:b('brute'),boss:{hp:EN.boss.hp}},dps:avgOf(smoothAll(o.DPS)),dps1:avgOf(smoothAll(o.DPS1)),maxHp:o.maxHp,needExp:o.needExp,startLv:1,
    extra:Array.from({length:n},(_,z)=>3*(expOf(EN.node)+10*(6+2*ch(z)))),cal:CAL}; }
const B={BAND,AIM,KILLS,CAL,levelAfter,interp,table,valuesAt,predict,check,expOf,avgOf,inputOf,ROLE,smooth,clsK,CLS_K,roleOf,takenK,clsHp,clsInput,ccAt,CC_KINDS};
// 직업 보정(frame/data/clscal.js). 측정 도구가 페이지에서 바꿔 보며 잴 수 있게 같은 물건을 가리킨다
Object.defineProperty(B,'CLS_CAL',{get:()=>DATA().CLS_CAL,enumerable:true});

if(typeof window!=='undefined'&&window.RPG&&window.PF){
  const G=RPG, A=G.api, X=G.sv, V=X.V, PF=window.PF, F=PF.field, EN=X.EN;
  // 장비 없는 최대 체력(rpg.js maxHp를 그 레벨로 잠깐 불러 hub.js 수트 몫을 뺀다)
  const maxHpAt=lv=>{ const s=A.SV, l=s.lv; s.lv=lv; try{ return A.maxHp()-G.hub.stat('a'); } finally{ s.lv=l; } };
  B.input=inputOf({EN,DPS:PF.DPS,DPS1:PF.DPS1,zones:F.COUNT,chOf:F.chOf,maxHp:maxHpAt,needExp:A.needExp});
  B.dpsAvg=B.input.dps; B.dps1Avg=B.input.dps1;
  B.rows=table(B.input);
  G.hub.ZONES.forEach((sector,i)=>{sector.rec=X.CHAP[i].rec=B.rows[i].lvIn;});
  // B.at: 직업 cls(기본은 지금 직업 pl.cls)가 구역 zone에서 레벨 lv일 때 나오는 몹의 값(직업 평균 표의 값 × 직업 배율 clsHp, 공격력 × takenK). 직업마다의 입력은 한 번 만들어 둔다
  const CI={}, inp=c=>CI[c]||(CI[c]=clsInput(B.input,c));
  B.at=(zone,lv,cls=pl.cls)=>valuesAt(inp(cls),B.rows[zone],lv);

  // ---- 적용: 그 구역의 사냥터와 숨은 방(RPG.frame.run.kind field·secret, 같은 zone)에서 장(CHAP[ch]) 배율을 표 값(지금 레벨)으로, 시간에 따른 증가는 끈다
  // (surv.js hm·dm이 RPG.frame.flat을 본다). 떠나면 원래 값으로. scale: 뒤에 붙는 것(어려움 등)이 들어온 뒤(enter 사건에서) 곱하는 몫. 떠날 때 1로 돌아간다
  let cur=null;
  B.scale={hp:1,dmg:1};
  // 표가 머무는 판의 종류(같은 zone). 도전(challenge.js)이 hard·rematch·endless를 더한다
  B.kinds=['field','secret'];
  // o.repeat: 처음부터 깬 구역의 경험치 몫(도전), o.flat===false: 시간에 따른 증가를 켠 채로(끝없이 버티기). 사냥터·숨은 방은 o 없이
  B.apply=function(zone,o){ B.restore(); const r=B.rows[zone], ch=F.chOf(zone), C=X.CHAP[ch]; if(!r||!C) return false;
    cur={zone,ch,row:r,hp0:C.hp,dmg0:C.dmg,repeat:!!(o&&o.repeat),key:null,v:null}; G.frame.flat=!(o&&o.flat===false); sync(); return true; };
  B.restore=function(){ if(!cur) return; const C=X.CHAP[cur.ch]; C.hp=cur.hp0; C.dmg=cur.dmg0; G.frame.flat=false; cur=null; B.scale={hp:1,dmg:1}; };
  Object.defineProperty(B,'cur',{get:()=>cur&&{zone:cur.zone,ch:cur.ch,repeat:cur.repeat,lv:cur.v.lv}});
  // R2: 레벨이나 scale이나 직업(pl.cls, 안전지대의 창에서 바꿀 수 있다)이 바뀌면 CHAP을 그 값으로(공격력은 다음 한 대부터, 체력은 새로 나오는 적부터: 이미 나온 적은 그대로).
  // 자른 레벨·scale·직업으로 먼저 비교해 같으면 값을 다시 셈하지 않는다. 노드 싸움(아래 nodeFight) 동안은 몹 공격력 × NODE.dmg
  function sync(){ const s=B.scale, r=cur.row, L=clamp(A.SV.lv,r.lvIn,r.lvOut), nf=nodeFight()?NODE.dmg:1, key=L+','+s.hp+','+s.dmg+','+pl.cls+','+nf; if(key===cur.key) return;
    const v=B.at(cur.zone,L), C=X.CHAP[cur.ch]; C.hp=v.hpK*s.hp; C.dmg=v.dmgK*s.dmg*nf; cur.v=v; cur.key=key; }
  const live=()=>{ const r=G.frame.run; return !!r&&B.kinds.includes(r.kind)&&r.zone===cur.zone; };
  // R1: 하나짜리는 종류별 체력(그 직업의 값, cur.v). 큰 몹·노드는 surv.js hm()이 곱한 배율(끝없이 버티기의 시간 증가. frame에서는 검사의 옛 DIF가 1이다: surv.js dif)을
  // 나올 때 재어 e.pfK에 두고 그대로 곱한다. 왕은 그 배율 없이
  function single(e,hp){ const k=e.pfK??(e.pfK=e.max/(e.d.hp*X.CHAP[cur.ch].hp)); e.hp=e.max=Math.max(1,Math.round(hp*B.scale.hp*k)); }
  const sp0=X.spawn;
  X.spawn=function(){ if(cur) sync(); const e=sp0.apply(this,arguments); if(!(cur&&e)) return e;
    if(e.d.boss) e.hp=e.max=Math.max(1,Math.round(cur.v.bossHp*B.scale.hp*(e.d.hp/EN.boss.hp)));
    else if(e.d.node) single(e,cur.v.nodeHp);
    else if((e.d.base||e.type)==='brute') single(e,cur.v.bruteHp*(e.d.hp/EN.brute.hp));
    return e; };
  // 노드 우선(설계 17.8: 궁수·거너는 가장 가까운 물결만 쏘아 Lv1에서 신호 노드를 못 깼다). surv.js nearest(R)가 고른 가장 가까운 적 b(거리² bd, 세로는 hy로 늘린 그 셈) 대신
  // 지도(dun.js)의 깨어난 노드가 NODE.far와 그 스킬의 거리 R 안에 있으면 가장 가까운 그 노드. 모든 직업에 같은 규칙. 브리프의 "영웅 곁의 몹 먼저"는 넣지 않았다
  // (잰 값: 곁 220·140이면 물결이 늘 붙어 있어 궁수·거너가 구역 0 Lv1 노드를 120초 넘게 못 깼고 최대 체력의 약 14배를 잃었다. 없으면 4.5~5.3초, 0.5~0.6배. 2026-11-27)
  // 노드 싸움의 피해(2026-11-27 컨트롤러 결정: 첫 노드 옆에 피하지 않고 서 있어도 쓰러지지 않게): 영웅이 깨어난 산 노드에서 NODE.far 안(위 노드 우선과 같은 셈)이고
  // 그 노드가 최근 NODE.hit초 안에 맞았으면(surv.js dmg()가 찍는 e.hitT=RT. RT는 update마다 화면 시간만큼 늘어 멈춘 동안 서고 느린 화면에도 줄지 않는다) 모든 몹의 공격력 × NODE.dmg
  // (표의 CHAP.dmg로, sync). 곧 실제로 노드를 부수는 동안만이다. 노드가 부서지는 화면부터 꺼진다.
  // 900 안이라고 노드를 치는 것은 아니다: nearest는 min(그 스킬의 거리, 900) 안의 노드만 고르므로 검사 평타 430·대시 560처럼 짧은 직업은 그 바깥 900 안에서 노드를 안 친다.
  // 고침 1회(리뷰): 처음에는 물결 거리(바닥 2200) 안 → 900 안. 고침 2회(리뷰): 그래도 짧은 직업이 노드를 치지 않고 물결만 잡으며 덜 맞을 수 있어 "최근에 맞은 노드" 조건을 더했다
  // 요구: 노드 옆에 가만히 서서 부수는 동안 잃는 체력이 구역 0 Lv1에서 최대 체력의 0.7배 이하, 구역 6 들어올 때 1.2배 이하(e2e/15-class.js).
  // 노드 목표 시간을 줄이는 길은 쓰지 않았다: 궁수·거너는 초당 최대 체력의 0.12~0.13배를 잃고 노드 시간이 직업 중앙값 근처(약 9초)라 0.7배가 되려면 약 5.5초,
  // 그러면 직업 중앙값이 범위(6~20초) 밑으로 간다. 같은 씨앗으로 잰 가장 많이 잃는 직업(구역 0 / 구역 6): 1이면 1.26 샤먼 / 2.61 거너, 0.5면 0.68 / 1.27,
  // 0.4면 0.66 / 1.03, 0.35면 0.36 / 0.88, 0.3이면 0.45 / 0.79(구역 0은 한 대가 정수로 반올림되어 계단처럼 움직인다). 두 요구에 여유가 있는 0.35
  const NODE={far:900,dmg:.35,hit:2}; B.NODE=NODE;
  // 영웅에서 깨어난 산 노드까지의 거리²(surv.js nearest의 셈: 가로 그대로, 세로 ÷ HY. HY는 surv.js가 nearest 갈고리에 넘겨 준다, 처음 값 .76)
  let HY=.76;
  const liveNodes=M=>M.nodes.filter(q=>!q.done&&q.awake&&q.e&&!q.e.dead), d2=e=>(e.x-pl.x)**2+((e.y-pl.gy)/HY)**2;
  const nodeFight=()=>{ const M=G.dun.M; return !!M&&liveNodes(M).some(q=>d2(q.e)<NODE.far*NODE.far&&q.e.hitT!=null&&RT-q.e.hitT<NODE.hit); };
  G.frame.nearest=function(b,bd,R,hy){ const M=G.dun.M; HY=hy; if(!M) return b;
    // A precision shot keeps its target in a boss arena. Otherwise EACH new
    // wave can take every bullet at Lv1, even while the boss is in range.
    if((pl.cls==='gunner'||pl.cls==='archer')&&M.king&&!M.king.dead&&d2(M.king)<R*R) return M.king;
    const far=Math.min(R,NODE.far); let n=null, nd=far*far;
    for(const q of liveNodes(M)){ const d=d2(q.e); if(d<nd){ nd=d; n=q.e; } }
    return n||b; };
  // 깬 구역(들어올 때 이미 깬 곳, 또는 이번 판에서 왕을 쓰러뜨린 뒤, 그 구역의 숨은 방)의 경험치는 repeatExp 몫. 자투리는 다음에 더한다
  let carry=0;
  const gx=A.gainExp;
  A.gainExp=function(v){ if(!(cur&&cur.repeat)) return gx.apply(this,arguments);
    const q=v*BAND.repeatExp+carry, n=Math.floor(q); carry=q-n; const a=[...arguments]; a[0]=n; return gx.apply(this,a); };

  // ---- 플레이 기록 story.stats[zone] = {runs, kills, sec, downs, lvIn}. 들어올 때 열고, 떠날 때·다음 구역으로 갈 때·앱을 숨길 때 담는다.
  // 모두 판을 더한 합이다: lvIn은 들어온 레벨의 합(평균 = lvIn/runs, 기록 창이 그렇게 보인다), kills·sec도 합, downs는 횟수
  // 브리프의 이름(lvIn)을 그대로 두어 저장 모양을 바꾸지 않았다
  // 숨은 방에 다녀오는 것(leave {via:'secret'} → enter {resume:true})은 한 판: 기록을 닫지 않고 이어 간다(방의 처치·시간도 더한다)
  const stats=()=>{ const s=PF.save.data.story; return s.stats||(s.stats={}); };
  // 관리자 상태(admin.js, story.admin)에서는 기록을 쌓지 않는다: 버리는 줄에 담는다(밸런스 기록이 흐려지지 않게)
  const row=z=>{ const S=PF.save.data.story.admin?{}:stats(); return S[z]||(S[z]={runs:0,kills:0,sec:0,downs:0,lvIn:0}); };
  // 지금 판의 기록: 처치 수와 시간은 매 화면 받아 둔다(다음 구역으로 갈 때 surv.js가 V.kills를 먼저 비운다). 사냥터 시간은 dun.js M.el(멈춘 동안 늘지 않음),
  // 숨은 방은 멈추지 않은 화면의 시간. k0·e0: 앞 구간(사냥터 ↔ 숨은 방)까지의 합, t0: 이 구간이 시작한 RT(그 전 판의 지도를 읽지 않게), fk·fs: 이미 담은 몫
  let rec=null;
  const part=()=>{ rec.k0=rec.kills; rec.e0=rec.el; rec.rt=0; rec.t0=RT; };
  function flush(end){ if(!rec) return; const s=row(rec.zone);
    if(!rec.counted){ rec.counted=true; s.runs++; s.lvIn+=rec.lv; }
    s.kills+=rec.kills-rec.fk; s.sec+=rec.el-rec.fs; rec.fk=rec.kills; rec.fs=rec.el;
    if(end) rec=null;
    PF.save.commit(); }
  F.onEvent((n,c)=>{
    if(n==='enter'){ const back=c.resume&&rec&&rec.zone===c.zone;
      if(back) part(); else { flush(true); carry=0; rec={zone:c.zone,lv:A.SV.lv,kills:0,el:0,fk:0,fs:0,counted:false}; part(); }
      if(B.apply(c.zone)) cur.repeat=!c.first; }
    // 숨은 방으로: 표와 기록을 그대로 둔다(방도 이 구역의 표, 깬 구역이라 경험치 25%)
    else if(n==='leave'){ if(c.via==='secret'&&rec&&rec.zone===c.zone) part(); else { flush(true); B.restore(); } }
    else if(n==='down'){ row(c.zone).downs++; PF.save.commit(); }
    // 첫 제압 뒤에는 깬 구역이다: 아직 담지 않은 경험치(왕의 몫)는 제 값으로 담고 나서 바꾼다
    else if(n==='win'&&cur&&!cur.repeat){ if(V.acc>0){ A.gainExp(V.acc); V.run+=V.acc; V.acc=0; } cur.repeat=true; } });
  const u0=update; update=function(rdt){
    // 숨은 방에서 사냥터로 돌아가지 못하고 끝났거나(마을로) 다른 곳으로 가면 기록을 닫고 되돌린다
    if(cur&&!live()){ flush(true); B.restore(); }
    if(cur) sync();
    u0(rdt);
    const r=G.frame.run, M=G.dun.M;
    if(rec&&G.mode==='surv'&&r&&r.zone===rec.zone){
      if(r.kind==='field'&&M&&M.t0>=rec.t0){ rec.kills=rec.k0+V.kills; rec.el=rec.e0+M.el; }
      else if(r.kind==='secret'){ if(!G.paused) rec.rt+=rdt; rec.kills=rec.k0+V.kills; rec.el=rec.e0+rec.rt; } }
    // R2 노드: 지도를 만들 때 나온 노드는 영웅이 다가와 깨어날 때 그 레벨의 체력으로 한 번 바꾼다(아직 맞지 않았으면).
    // dun.js 지도가 있는 종류만(field, hard. 숨은 방·끝없이 버티기에는 지도가 없어 M이 null이고, 재대결의 노드는 처음부터 부서져 있다)
    if(cur&&r&&B.kinds.includes(r.kind)&&M) for(const q of M.nodes){ const e=q.e; if(!q.awake||!e||e.dead||e.pfWake) continue; e.pfWake=true; if(e.hp===e.max) single(e,cur.v.nodeHp); } };
  const hide=()=>flush(false);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') hide(); });
  addEventListener('pagehide',hide);

  // ---- 기록 창(records, hub.js guild 화면의 후손 기록 판): 구역마다 한 줄, 표의 들어올 레벨을 나란히
  const name=z=>{ const Zs=G.hub.ZONES; return z<Zs.length?Zs[z].no+'구역 · '+Zs[z].name:'마지막 화'; };
  const mo=G.menuOverride;
  G.menuOverride=function(m){ const r=mo.apply(this,arguments);
    const box=PF.win.cur==='records'&&G.hub.scr==='guild'&&m.querySelector('[data-go=hero]'), panel=box&&box.closest('.panel');
    if(panel){ const S=stats(), L=Object.keys(S).map(Number).sort((a,b)=>a-b).filter(z=>S[z].runs>0), d=document.createElement('div'); d.className='pf-stats';
      const f=(v,n)=>(v/n).toFixed(1).replace(/\.0$/,'');
      d.innerHTML='<div class="rule"></div><span class="hk">PLAY RECORDS · 구역 기록</span>'+(L.length?L.map(z=>{ const s=S[z], t=B.rows[z];
        return `<div class="kv" data-pfstat="${z}"><span>${name(z)}</span><b>들어온 레벨 평균 ${f(s.lvIn,s.runs)}${t?' (표 '+t.lvIn+')':''} · 처치 평균 ${f(s.kills,s.runs)} · 쓰러짐 ${s.downs}</b></div>`; }).join(''):'<div class="mut">아직 기록이 없습니다</div>');
      panel.insertBefore(d,panel.querySelector('.pf-replay')); }
    return r; };

  PF.balance=B;
}

if(typeof module!=='undefined') module.exports=B;
})();

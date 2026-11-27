// 지점 (설계 5.1, 17.1): 장소에 꽂는 NPC, 포탈, 흔적, 표식. 영웅이 반경 안에 들어오면 이름이 달린 누를 수 있는 표시가 뜨고,
// 그것을 누르거나 E·Enter를 누르면 onUse(spot). 창이 열려 있거나 장면 재생 중에는 반응하지 않는다.
// 지점 {id,x,y,r,label,kind:'npc'|'portal'|'trace'|'mark'|'road',act,look?,art?}. label이 빈 지점은 그리기만 하고 누를 수 없다(아직 연결 전인 숨은 흔적).
// road(길 끝, road.js가 꽂는다)는 누르는 것이 아니라 밟으면 넘어간다: 누를 수 있는 표시가 뜨지 않는다. 여기서는 서 있는 것(관문 기둥·장벽·이름표)만 그린다
// (road {open, dir:[x,y] 밖으로 나가는 쪽, posts:[[x,y],[x,y]] 관문 기둥 자리 | null}. 바닥 화살표는 road.js가 바닥 층에)
// art(frame/art.js 그림 이름)가 있고 그 그림이 떠 있으면 NPC는 그 사람 그림, 포탈은 고리 문 받침과 움직이는 빛 원판으로 그린다. 없으면 예전 임시 모습
// 순수 부분(near)은 node 시험(frame/test/room.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 붙이고 index.html의 전역(update, drawPlayer, w2s, ctx, fx, cam)을 쓴다
(function(){
'use strict';
// 반경 r 안에서 가장 가까운 지점. 없으면 null
function near(list,x,y){ let best=null, bd=Infinity;
  for(const s of list){ const d=Math.hypot(s.x-x,s.y-y); if(d<=s.r&&d<bd){ bd=d; best=s; } }
  return best; }
const P={near};

if(typeof window!=='undefined'&&window.RPG){
  const G=RPG, FSY=G.sv.FSY, PF=window.PF;
  const HC='#7FF3FF', AM='#EBA74E', RD='#E2513F', KR='"Noto Sans KR","Malgun Gothic",sans-serif';
  // 서 있는 NPC의 키(월드 단위)와, 종류마다 누를 수 있는 표시가 뜨는 높이. 그림(frame/art.js) NPC는 ART_H(영웅 약 260), 포탈 받침 그림은 GATE_H(지점의 h가 있으면 그 높이)
  const NPC_H=360, ART_H=310, GATE_H=1000, TOP={npc:NPC_H+34,portal:430,trace:120,mark:170};
  const art=s=>s.art&&PF.art.img(s.art);
  const gateH=s=>s.h||GATE_H;
  const top=s=>s.kind==='npc'&&art(s)?ART_H+34:s.kind==='portal'&&art(s)?gateH(s)*.54:TOP[s.kind]||TOP.mark;
  // NPC 발밑의 불빛(문간·가로등 빛이 닿은 자리)과 그림에 입히는 테두리 빛. 지점의 light: 'warm'(기본, 호박색 등불) | 'cool'(차가운 흰빛·초록 판)
  const LIT={warm:{rgb:'255,196,128',pool:'255,186,112'},cool:{rgb:'196,232,236',pool:'176,222,226'}};
  // 미리 그려 둔 그림: 발밑 불빛 웅덩이(색마다 하나), 포탈 받침 아래의 부드러운 그림자
  const SPR={};
  function spr(id,make){ return SPR[id]||(SPR[id]=make()); }
  function radial(c,stops){ const n=document.createElement('canvas'); n.width=n.height=128; const g=n.getContext('2d'), q=g.createRadialGradient(64,64,0,64,64,64);
    for(const [t,a] of stops) q.addColorStop(t,`rgba(${c},${a})`); g.fillStyle=q; g.fillRect(0,0,128,128); return n; }
  const poolOf=k=>spr('pool'+k,()=>radial(LIT[k].pool,[[0,.85],[.3,.42],[.65,.12],[1,0]]));
  const shadowIm=()=>spr('shadow',()=>radial('0,0,0',[[0,.55],[.55,.34],[.85,.1],[1,0]]));
  // 포탈(큰 그림, 매 화면 도는 원판·빛 알갱이)은 화면 밖(여유 있게)이면 그리지 않는다
  function off(s){ if(s.kind!=='portal'&&s.kind!=='road') return false; const {hw,hh}=G.sv.view(), w=gateH(s)*.6+200;
    return s.x+w<cam.x-hw||s.x-w>cam.x+hw||s.y+300<cam.y-hh||s.y-Math.max(gateH(s),900)>cam.y+hh; }
  let list=[], onUse=null, act=null;

  // 화면 위 겹(hub.js의 .hub 단추·판 모양을 그대로 받는다). town.js가 구석 아이콘과 대사 줄을 같은 겹에 붙인다
  const css=document.createElement('style'); css.id='pfspots'; css.textContent=`
#pfui{position:fixed;inset:0;z-index:18;pointer-events:none}
body:not(.surv) #pfui,#rmenu.on~#pfui{display:none}
#pfui .btn,#pfui .panel{-webkit-backdrop-filter:none;backdrop-filter:none}
#pfui .pf-tip{position:absolute;left:0;top:0;display:none;pointer-events:auto;transform:translate(-50%,-100%);min-height:40px;padding:6px 16px;white-space:nowrap;font:700 13px ${KR}}
#pfui .pf-tip.on{display:block}
#pfui .pf-tip kbd{display:inline-block;margin-right:8px;padding:0 6px;border:1px solid rgba(190,250,255,.8);border-radius:2px;font:700 11px/16px Consolas,monospace;color:#F2FEFF}
@media (pointer:coarse){ #pfui .pf-tip kbd{display:none} }`;
  document.head.appendChild(css);
  const ui=document.createElement('div'); ui.id='pfui'; ui.className='hub'; document.body.appendChild(ui);
  const tip=document.createElement('button'); tip.className='btn pri pf-tip'; ui.appendChild(tip);
  // 같은 지점의 이름이 바뀌어도 새 상호작용 문구와 너비를 반영한다.
  let tipKey='';

  const busy=()=>!!(PF.win&&PF.win.cur)||G.paused||(PF.story?PF.story.busy():lock);
  function use(s){ if(!s||busy()) return; act=null; tip.classList.remove('on'); if(onUse) onUse(s); }
  tip.addEventListener('pointerdown',e=>e.stopPropagation());
  tip.addEventListener('click',e=>{ e.stopPropagation(); use(act); });

  // 매 화면: 가장 가까운 누를 수 있는 지점 위에 표시를 둔다
  function tick(){
    act=G.mode==='surv'&&list.length&&!busy()?near(list.filter(s=>s.label&&s.kind!=='road'),pl.x,pl.gy):null;
    if(!act){ tip.classList.remove('on'); return; }
    const key=act.id+'\n'+act.label, moved=!tip.classList.contains('on')||key!==tipKey;
    tip.classList.add('on');
    if(key!==tipKey){ tipKey=key; const k=document.createElement('kbd'); k.textContent='E'; tip.replaceChildren(k,act.label); }
    // 갱신 직후에도 새 버튼을 누를 수 있어야 한다. 같은 버튼은 다음에 실제로 그릴 때까지 안전한 자리에 둔다.
    if(moved){ occupied=null; uiBoxes(); }
  }
  const u0=update; update=function(rdt){ u0(rdt); tick(); };
  // 이름표는 실제 그리는 프레임에만 배치한다. 먼저 화면 UI와 누를 수 있는 표시의 자리를 확보한다.
  let occupied=null;
  const signs=[];
  const renderBase=render;
  render=function(){
    occupied=null; signs.length=0;
    for(const s of list) if(s.tagBox) s.tagBox=null;
    if(act&&tip.classList.contains('on')) uiBoxes();
    const result=renderBase.apply(this,arguments);
    // 배경의 왜곡·기울이기 효과를 모두 그리고 나서 이름표를 얹는다. 화면 정보와 같은 CSS 픽셀 좌표를 쓴다.
    if(signs.length&&!lock){
      tctx.save(); tctx.setTransform(W/innerWidth,0,0,H/innerHeight,0,0);
      for(const [s,x,y,left] of signs) if(s.kind==='road') paintRoadTag(s,x,y,left); else paintTag(s,x,y);
      tctx.restore();
    }
    return result;
  };
  function uiBoxes(){
    if(occupied) return;
    occupied=[];
    const controls='#shud .me,#shud .kc,#shud .pz,#shud .sk,#shud .dsh,#shud .ul button,#shud .bb.on,#pfui .pf-ico,#pfminimap,#pfquest.on,#pfbark.on,#pfplace.on';
    for(const e of document.querySelectorAll(controls)){
      const b=e.getBoundingClientRect();
      if(!b.width||!b.height) continue;
      const style=getComputedStyle(e);
      if(style.visibility==='visible'&&(e.id==='pfbark'||+style.opacity>.05)) occupied.push([b.left,b.top,b.right,b.bottom]);
    }
    if(act&&tip.classList.contains('on')){
      const box=tip.getBoundingClientRect();
      if(box.width&&box.height){
        const [sx,sy]=w2s(act.x,act.y-top(act));
        const left=Math.max(8,Math.min(innerWidth-box.width-8,sx*innerWidth/W-box.width/2));
        const b=labelBox(left,Math.max(52,sy*innerHeight/H)-box.height,box.width,box.height);
        if(b){ tip.style.left=(b[0]+b[2])/2+'px'; tip.style.top=b[3]+'px'; }
      }
    }
  }
  function labelBox(left,top,w,h){
    const clip=(v,m)=>Math.max(4,Math.min(m-4,v));
    const x=clip(left,innerWidth-w), y=clip(top,innerHeight-h);
    function take(left,top){
      const b=[left,top,left+w,top+h];
      if(occupied.some(r=>b[0]<r[2]+2&&b[2]>r[0]-2&&b[1]<r[3]+2&&b[3]>r[1]-2)) return null;
      occupied.push(b); return b;
    }
    const direct=take(x,y); if(direct) return direct;
    // 각 사각형 바로 위·아래·옆으로 필요한 만큼만 움직인다.
    const xs=[x],ys=[y];
    for(const r of occupied){
      xs.push(clip(r[0]-w-4,innerWidth-w),clip(r[2]+4,innerWidth-w));
      ys.push(clip(r[1]-h-4,innerHeight-h),clip(r[3]+4,innerHeight-h));
    }
    const choices=[];
    for(const l of new Set(xs)) for(const t of new Set(ys)) choices.push([l,t,(l-x)**2+(t-y)**2]);
    choices.sort((a,b)=>a[2]-b[2]);
    for(const [l,t] of choices){ const b=take(l,t); if(b) return b; }
    return null;
  }
  function layoutTag(s,x,y,w,h,alignLeft=false){
    const [sx,sy]=w2s(x,y),dx=sx-W/2,dy=sy-H/2,cr=Math.cos(cam.rot),sr=Math.sin(cam.rot);
    const left=(W/2+cr*dx-sr*dy)*innerWidth/W-(alignLeft?0:w/2);
    const top=(H/2+sr*dx+cr*dy)*innerHeight/H-h;
    if(left+w< -20||left>innerWidth+20||top< -120||top>innerHeight+60) return null;
    uiBoxes();
    return s.tagBox=labelBox(left,top,w,h);
  }
  // 키보드(rpg.js가 surv 모드에서 G.survKey로 넘긴다)
  const k0=G.survKey; G.survKey=function(e,down){
    if(act&&/^(KeyE|Enter|NumpadEnter)$/.test(e.code)){ e.preventDefault(); if(down&&!e.repeat) use(act); return; }
    return k0.apply(this,arguments); };

  // ---- 그리기(월드 좌표, 카메라가 걸린 ctx·fx). 방(room.js)이 켜져 있으면 방이 소품과 섞어 y 순서로 부르고, 아니면 영웅 앞뒤로 나눠 그린다
  // 이름표: 화면에서 늘 같은 크기로 보이게 월드 단위를 화면 픽셀로 맞춘다
  function tag(s,x,y){ signs.push([s,x,y]); }
  function paintTag(s,x,y){ const ctx=tctx,fs=12,pad=8,h=fs*1.8;
    ctx.save(); ctx.font=`600 ${fs}px ${KR}`; const w=ctx.measureText(s.label).width+pad*2;
    const xy=layoutTag(s,x,y,w,h);
    if(!xy){ ctx.restore(); return; }
    x=xy[0]+w/2; y=xy[3];
    ctx.fillStyle='rgba(4,16,20,.78)'; ctx.fillRect(x-w/2,y-h,w,h); ctx.strokeStyle='rgba(127,243,255,.55)'; ctx.lineWidth=1; ctx.strokeRect(x-w/2,y-h,w,h);
    ctx.fillStyle='#DDFBFF'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(s.label,x,y-h/2); ctx.restore(); }
  // 그림 NPC: 발밑에 문간·등불이 비춘 빛 웅덩이(미리 그린 그림을 더한다), 그 위 부드러운 접지 그림자, 테두리 빛을 입힌 그림(PF.art.lit, 없으면 그냥 그림).
  // 발을 디딘 채 숨쉬듯 키가 1~2px 늘었다 줄었다 한다
  function npcArt(s,im){ const x=s.x, y=s.y, ph=(s.x*.013+s.y*.007)%TAU, w=ART_H*im.naturalWidth/im.naturalHeight, k=S*cam.z*1.25, L=LIT[s.light]?s.light:'warm';
    const H=ART_H*(1+.022*Math.sin(RT*1.6+ph)), f=.92+.08*Math.sin(RT*1.1+ph*3);
    ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=.5*f; ctx.drawImage(poolOf(L),x-250,y-250*FSY*.62,500,500*FSY*.62);
    ctx.globalAlpha=.4*f; ctx.drawImage(poolOf(L),x-120,y-120*FSY*.55,240,240*FSY*.55); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x,y-3,w*.42,w*.42*FSY*.45,0,0,TAU); ctx.fill();
    const lit=PF.art.lit(s.art,w*k,ART_H*k,LIT[L].rgb);
    if(lit){ const P=PF.art.PAD, pw=w*(1+2*P), ph2=H*(1+P); ctx.drawImage(lit,x-pw/2,y-H*(1+P*.5),pw,ph2); }
    else ctx.drawImage(PF.art.fit(s.art,w*k,ART_H*k)||im,x-w/2,y-H,w,H);
    if(s!==act&&s.label) tag(s,x,y-ART_H-24); }
  // 홀로그램으로 서 있는 사람(임시 모습): 바닥의 투사기, 빛기둥, 긴 옷의 실루엣, 주사선
  function npc(s){ const im=art(s); if(im) return npcArt(s,im);
    const x=s.x, y=s.y, H=NPC_H, t=y-H, ph=(s.x*.013+s.y*.007)%TAU;
    ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x,y,92,92*FSY,0,0,TAU); ctx.fill();
    ctx.fillStyle='#0b1418'; ctx.beginPath(); ctx.ellipse(x,y,62,62*FSY,0,0,TAU); ctx.fill(); ctx.strokeStyle=hexA(HC,.7); ctx.lineWidth=4; ctx.stroke();
    fx.strokeStyle=hexA(HC,.35+.15*Math.sin(RT*3+ph)); fx.lineWidth=5; fx.beginPath(); fx.ellipse(x,y,84,84*FSY,0,0,TAU); fx.stroke();
    const gb=fx.createLinearGradient(0,t,0,y); gb.addColorStop(0,hexA(HC,0)); gb.addColorStop(1,hexA(HC,.16)); fx.fillStyle=gb; fx.fillRect(x-60,t,120,H);
    const dx=Math.random()<.03?rand(-8,8):0, X=x+dx;
    ctx.save(); ctx.globalAlpha=Math.random()<.04?.45:.9+.1*Math.sin(RT*9+ph);
    ctx.beginPath(); ctx.arc(X,t+30,27,0,TAU);
    const B=[[-12,58],[12,58],[50,76],[58,96],[56,210],[46,224],[40,212],[44,300],[30,312],[24,312],[20,H-4],[6,H-4],[4,322],[-4,322],[-6,H-4],[-20,H-4],[-24,312],[-30,312],[-44,300],[-40,212],[-46,224],[-56,210],[-58,96],[-50,76]];
    ctx.moveTo(X+B[0][0],t+B[0][1]); for(const [a,b] of B) ctx.lineTo(X+a,t+b); ctx.closePath();
    const gf=ctx.createLinearGradient(0,t,0,y); gf.addColorStop(0,'rgba(190,252,255,.7)'); gf.addColorStop(1,'rgba(127,243,255,.2)'); ctx.fillStyle=gf; ctx.fill();
    ctx.strokeStyle=hexA(HC,.85); ctx.lineWidth=3; ctx.stroke();
    ctx.clip(); ctx.fillStyle='rgba(2,12,16,.32)'; for(let k=t;k<y;k+=10) ctx.fillRect(X-70,k,140,3);
    ctx.fillStyle='rgba(230,255,255,.3)'; ctx.fillRect(X-70,t+((RT*110+ph*40)%H),140,16);
    ctx.restore();
    ctx.fillStyle='rgba(235,255,255,.95)'; ctx.fillRect(X-14,t+25,28,5);
    glow(fx,x,t+150,170,HC,.14);
    if(s!==act&&s.label) tag(s,x,t-24); }
  // 포탈 그림: 고리 문 받침(b_portal_base)과, 같은 자리·크기로 맞춰 그린 빛 원판(portal)을 고리 구멍 안에만 그린다.
  // 원판은 천천히 돌고(겹친 두 장이 서로 반대로 돌아 물결이 움직인다) 숨쉬듯 밝기가 오르내린다. 문 앞 바닥에 옅은 빛이 번지고 작은 빛 알갱이 몇이 떠오른다
  // 고리 구멍: 그림 안 가운데와 반지름(그림 높이 비율). 원판 가장자리의 홈이 구멍 안에 보이지 않게 원판을 조금 크게 그린다
  const RING={x:502.5/1006,y:464/1000,r:214/1000}, PG='#A9DCC6';
  function portalArt(s,base){ const H=gateH(s), w=H*base.naturalWidth/base.naturalHeight, x0=s.x-w/2, y0=s.y-H, k=S*cam.z*1.25;
    const cx=x0+RING.x*w, cy=y0+RING.y*H, r=RING.r*H, disc=PF.art.img('portal'), p=.5+.5*Math.sin(RT*1.1);
    // 받침 아래의 그림자: 가장자리가 부드럽게 사라지는 미리 그린 그림(받침 둘레를 조금 넘는다)
    ctx.globalAlpha=.8; ctx.drawImage(shadowIm(),s.x-w*.56,s.y-H*.29,w*1.12,H*.34); ctx.globalAlpha=1;
    if(disc){ const d=PF.art.fit('portal',w*k*1.08,H*k*1.08)||disc, dw=w*1.08, dh=H*1.08;
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU); ctx.clip(); ctx.fillStyle='#0a1311'; ctx.fillRect(cx-r,cy-r,2*r,2*r);
      ctx.translate(cx,cy); ctx.rotate(RT*.12); ctx.globalAlpha=.58+.12*p; ctx.drawImage(d,-RING.x*dw,-RING.y*dh,dw,dh);
      ctx.rotate(-RT*.29); ctx.globalAlpha=.1+.06*p; ctx.globalCompositeOperation='lighter'; ctx.drawImage(d,-RING.x*dw,-RING.y*dh,dw,dh);
      ctx.restore(); }
    ctx.drawImage(PF.art.fit(s.art,w*k,H*k)||base,x0,y0,w,H);
    glow(fx,cx,cy,r*1.15,PG,.07+.05*p);
    fx.save(); fx.translate(s.x,s.y+40*H/GATE_H); fx.scale(1,FSY*.6); glow(fx,0,0,460*H/GATE_H,PG,.09+.04*p); fx.restore();
    for(let i=0;i<6;i++){ const q=(RT*.16+i/6)%1; glow(fx,cx+Math.sin(i*2.3+RT*.6)*r*.55,cy+r*.75-q*r*1.7,9,'#DFF8EC',.55*Math.sin(q*Math.PI)); }
    if(s!==act&&s.label) tag(s,s.x,cy+20); }
  // 포탈: 바닥의 청록 고리와 세로 빛기둥
  function portal(s){ const base=art(s); if(base) return portalArt(s,base);
    const x=s.x, y=s.y;
    ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x,y,178,178*FSY,0,0,TAU); ctx.fill();
    fx.strokeStyle=hexA(HC,.85); fx.lineWidth=6; fx.beginPath(); fx.ellipse(x,y,165,165*FSY,0,0,TAU); fx.stroke();
    fx.setLineDash([36,28]); fx.lineDashOffset=-RT*80; fx.strokeStyle=hexA(HC,.55); fx.lineWidth=4; fx.beginPath(); fx.ellipse(x,y,118,118*FSY,0,0,TAU); fx.stroke(); fx.setLineDash([]);
    fx.lineWidth=5; for(let i=0;i<3;i++){ const a=RT*1.6+i*TAU/3; fx.strokeStyle=hexA(HC,.5); fx.beginPath(); fx.ellipse(x,y,72,72*FSY,0,a,a+1.3); fx.stroke(); }
    const g=fx.createLinearGradient(0,y-900,0,y); g.addColorStop(0,hexA(HC,0)); g.addColorStop(1,hexA(HC,.38)); fx.fillStyle=g; fx.fillRect(x-80,y-900,160,900);
    const gc=fx.createLinearGradient(0,y-760,0,y); gc.addColorStop(0,hexA('#E6FFFF',0)); gc.addColorStop(1,hexA('#E6FFFF',.5)); fx.fillStyle=gc; fx.fillRect(x-18,y-760,36,760);
    for(let i=0;i<8;i++){ const k=(RT*.35+i/8)%1; glow(fx,x+Math.sin(i*2.3+RT*1.5)*60,y-k*800,16,HC,.7*(1-k)); }
    glow(fx,x,y-60,210,HC,.32);
    if(window.GFX&&Math.random()<.5) GFX.light(x,y,420,HC,.8,.08,{z:300});
    if(s!==act&&s.label) tag(s,x,y-TOP.portal+40); }
  // 흔적·표식: 바닥의 작은 표시(흔적은 흐리게, 표식은 떠 있는 마름모)
  function small(s){ const x=s.x, y=s.y, c=s.kind==='trace'?AM:HC, p=.5+.5*Math.sin(RT*3+s.x);
    if(s.kind==='mark'){ const b=y-110+Math.sin(RT*2.5)*10; ctx.fillStyle=hexA(c,.9); ctx.beginPath(); ctx.moveTo(x,b-26); ctx.lineTo(x+16,b); ctx.lineTo(x,b+26); ctx.lineTo(x-16,b); ctx.closePath(); ctx.fill(); glow(fx,x,b,60,c,.4); }
    ctx.fillStyle=hexA(c,.25+.2*p); ctx.beginPath(); ctx.moveTo(x,y-14); ctx.lineTo(x+22,y); ctx.lineTo(x,y+14); ctx.lineTo(x-22,y); ctx.closePath(); ctx.fill();
    glow(fx,x,y-6,40,c,.12+.12*p);
    if(s!==act&&s.label) tag(s,x,y-TOP.mark+40); }
  // 길 끝(road): 구역 경계·왕의 방 벽에 선 관문(posts: 기둥 둘의 자리, 높이 PH). 기둥의 빛 줄과 꼭대기 등은 열렸으면 청록, 닫혔으면 붉은색.
  // 열린 관문: 두 기둥 꼭대기를 잇는 빛 가로대, 옅은 빛막, 떠오르는 빛 알갱이. 닫힌 관문: 두 짝의 닫힌 문(가로 골, 호박색 테), 그 앞의 붉은 장벽과 가로 빔, 가운데 자물쇠.
  // 이름표는 관문 위(카메라 쪽을 향한 관문은 그 앞으로 걸어오는 영웅을 가리지 않게 오른쪽 기둥 옆). 관문이 없는 길(마을 큰길 끝)은 길가의 투사기와 그 위에 떠 있는 이름표
  const PH=420;
  const lockMark=(ctx,x,y,k,c)=>{ ctx.save(); ctx.strokeStyle=c; ctx.fillStyle=c; ctx.lineWidth=k*.2; ctx.beginPath(); ctx.arc(x,y-k*.3,k*.38,Math.PI,0); ctx.stroke();
    ctx.fillRect(x-k*.58,y-k*.32,k*1.16,k*.86); ctx.fillStyle='#0d1619'; ctx.fillRect(x-k*.09,y-k*.08,k*.18,k*.34); ctx.restore(); };
  // 이름표(늘 같은 화면 크기, 아래 끝이 y, 가로는 x가 가운데·left면 왼쪽 끝): 앞에 나가는 쪽 호박색 화살표, 닫혔으면 붉은 자물쇠와 붉은 테.
  // 화면 위·아래 HUD 띠와 화면 밖으로 나가지 않게 화면 안으로 민다. 그린 자리(CSS px [왼, 위, 오른, 아래])를 s.tagBox에 남긴다(시험이 본다)
  function roadTag(s,x,y,left){ signs.push([s,x,y,left]); }
  function paintRoadTag(s,x,y,left){ const ctx=tctx,fs=13,pad=9,h=fs*2.1,ic=fs*1.1;
    ctx.save(); ctx.font=`700 ${fs}px ${KR}`; const w=ctx.measureText(s.label).width+pad*3+ic;
    const pos=layoutTag(s,x,y,w,h,left);
    if(!pos){ ctx.restore(); return; }
    const x0=pos[0], cx=x0+pad+ic/2; y=pos[3]; const cy=y-h/2;
    ctx.fillStyle='rgba(4,16,20,.86)'; ctx.fillRect(x0,y-h,w,h); ctx.strokeStyle=s.open?'rgba(127,243,255,.7)':hexA(RD,.85); ctx.lineWidth=1.4; ctx.strokeRect(x0,y-h,w,h);
    if(s.open){ ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.atan2(s.dir[1],s.dir[0])); ctx.fillStyle=AM; ctx.beginPath();
      ctx.moveTo(ic*.55,0); ctx.lineTo(-ic*.4,-ic*.46); ctx.lineTo(-ic*.14,0); ctx.lineTo(-ic*.4,ic*.46); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else lockMark(ctx,cx,cy+ic*.1,ic*.8,RD);
    ctx.fillStyle=s.open?'#F2FEFF':'#EBCFC8'; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(s.label,cx+ic/2+pad,cy); ctx.restore(); }
  function pylon(x,y,c,p){ ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x,y,64,64*FSY,0,0,TAU); ctx.fill();
    ctx.fillStyle='#0d1619'; ctx.beginPath(); ctx.moveTo(x-36,y); ctx.lineTo(x-25,y-PH); ctx.lineTo(x+25,y-PH); ctx.lineTo(x+36,y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=hexA(c,.5); ctx.lineWidth=3; ctx.stroke();
    ctx.fillStyle=hexA(c,.5+.35*p); ctx.fillRect(x-4,y-PH+34,8,PH-70);
    ctx.fillStyle='#1b2529'; ctx.fillRect(x-32,y-PH-20,64,24); ctx.fillStyle=hexA(c,.85); ctx.fillRect(x-24,y-PH-12,48,6);
    glow(fx,x,y-PH-8,80,c,.42+.25*p); glow(fx,x,y-PH*.5,100,c,.1+.08*p); }
  // 네 점 다각형을 채운다(g: ctx 또는 fx)
  const quad=(g,P)=>{ g.beginPath(); g.moveTo(P[0][0],P[0][1]); for(let i=1;i<P.length;i++) g.lineTo(P[i][0],P[i][1]); g.closePath(); g.fill(); };
  function road(s){ const c=s.open?HC:RD, p=.5+.5*Math.sin(RT*2.4+s.x*.01);
    if(!s.posts){ const x=s.x-s.dir[0]*40, y=s.y-170, h=300;
      ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x,y,46,46*FSY,0,0,TAU); ctx.fill();
      ctx.fillStyle='#0b1418'; ctx.beginPath(); ctx.ellipse(x,y,30,30*FSY,0,0,TAU); ctx.fill(); ctx.strokeStyle=hexA(c,.7); ctx.lineWidth=3; ctx.stroke();
      const g=fx.createLinearGradient(0,y-h,0,y); g.addColorStop(0,hexA(c,.06)); g.addColorStop(1,hexA(c,.34+.1*p)); fx.fillStyle=g; fx.fillRect(x-5,y-h,10,h);
      glow(fx,x,y-8,70,c,.32); roadTag(s,x,y-h); return; }
    // 기둥 사이 바닥 줄 위의 점(t 0~1)과 그 위로 k만큼 올린 점
    const [[x0,y0],[x1,y1]]=s.posts[0][0]<s.posts[1][0]?s.posts:[s.posts[1],s.posts[0]], L=(t,k=0)=>[x0+(x1-x0)*t,y0+(y1-y0)*t-k], Hd=PH*.8;
    if(s.open){ const g=fx.createLinearGradient(0,Math.min(y0,y1)-PH,0,Math.max(y0,y1)); g.addColorStop(0,hexA(c,0)); g.addColorStop(1,hexA(c,.13+.05*p)); fx.fillStyle=g; quad(fx,[L(0),L(1),L(1,PH),L(0,PH)]);
      const a=L(0,PH-8), b=L(1,PH-8); fx.strokeStyle=hexA(c,.7); fx.lineWidth=6; fx.beginPath(); fx.moveTo(a[0],a[1]); fx.lineTo(b[0],b[1]); fx.stroke();
      for(let i=0;i<7;i++){ const q=(RT*.22+i/7)%1, m=L(.1+(i*.618%1)*.8,q*PH*.9); glow(fx,m[0],m[1],10,'#DFFBFF',.6*Math.sin(q*Math.PI)); } }
    else { for(const [a,b] of [[.07,.49],[.51,.93]]){ ctx.fillStyle='rgba(16,24,28,.95)'; quad(ctx,[L(a),L(b),L(b,Hd),L(a,Hd)]); ctx.strokeStyle='rgba(235,167,78,.6)'; ctx.lineWidth=3; ctx.stroke();
        ctx.strokeStyle='rgba(130,150,156,.24)'; ctx.lineWidth=4; for(let k=28;k<Hd-12;k+=34){ const u=L(a+.03,k), v=L(b-.03,k); ctx.beginPath(); ctx.moveTo(u[0],u[1]); ctx.lineTo(v[0],v[1]); ctx.stroke(); } }
      const g=fx.createLinearGradient(0,Math.min(y0,y1)-Hd-40,0,Math.max(y0,y1)); g.addColorStop(0,hexA(RD,0)); g.addColorStop(1,hexA(RD,.22+.08*p)); fx.fillStyle=g; quad(fx,[L(0),L(1),L(1,Hd+40),L(0,Hd+40)]);
      fx.strokeStyle=hexA(RD,.5+.25*p); fx.lineWidth=5; for(const k of [.22,.5,.78]){ const a=L(0,Hd*k), b=L(1,Hd*k); fx.beginPath(); fx.moveTo(a[0],a[1]); fx.lineTo(b[0],b[1]); fx.stroke(); }
      const m=L(.5,Hd*.58); lockMark(ctx,m[0],m[1],34,'#F0A090'); glow(fx,m[0],m[1],90,RD,.25+.1*p); }
    pylon(x0,y0,c,p); pylon(x1,y1,c,p);
    if(s.dir[1]>.5) roadTag(s,x1+50,Math.max(y0,y1)-PH*.45,true);
    else roadTag(s,L(.5)[0],Math.min(y0,y1)-PH-44); }
  function draw(s){ if(off(s)) return; if(s.kind==='npc') npc(s); else if(s.kind==='portal') portal(s); else if(s.kind==='road') road(s); else small(s); }
  // 그림 포탈은 앞의 둥근 받침에 올라선 영웅이 받침 앞에 보이게, 고리 문 밑동(그림 높이의 .81)을 기준으로 앞뒤를 가른다. 관문이 선 길 끝은 기둥이 선 경계 줄로
  const ky=s=>s.kind==='portal'&&art(s)?s.y-gateH(s)*.19:s.kind==='road'&&s.posts?Math.max(s.posts[0][1],s.posts[1][1]):s.y;
  const dp0=drawPlayer; drawPlayer=function(){
    if(!list.length||G.mode!=='surv'||(PF.room&&PF.room.cur)) return dp0();
    const gy=pl.gy??0, L=list.slice().sort((a,b)=>ky(a)-ky(b));
    for(const s of L) if(ky(s)<=gy) draw(s);
    dp0();
    for(const s of L) if(ky(s)>gy) draw(s); };

  P.set=function(l,fn){ list=l.slice(); onUse=fn||null; act=null; tipKey=''; tip.classList.remove('on'); };
  P.clear=function(){ P.set([],null); };
  P.add=function(s){ list=list.filter(o=>o.id!==s.id); list.push(s); };
  P.remove=function(id){ list=list.filter(o=>o.id!==id); if(act&&act.id===id){ act=null; tip.classList.remove('on'); } };
  P.draw=draw; P.GATE_H=GATE_H;
  Object.defineProperty(P,'list',{get:()=>list});
  Object.defineProperty(P,'act',{get:()=>act});
  PF.spots=P;
}

if(typeof module!=='undefined') module.exports=P;
})();

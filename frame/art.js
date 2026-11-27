// 그림 (마을 그림 입히기): assets/frame/manifest.json에 적힌 그림을 미리 불러 둔다. boot.js가 그림을 쓰는 파일(spots, room, town)보다 먼저 붙인다.
// PF.art.img(key)  다 뜬 HTMLImageElement. 아직이거나 없거나 막혔으면 null → 부르는 쪽은 예전 임시 그림으로 그린다
// PF.art.fit(key,w,h,dim,top)  그 그림을 화면 크기(캔버스 픽셀)에 맞게 미리 줄인 캔버스(크게 줄이면 생기는 계단·반짝임을 막는다). dim(0~1)만큼 어둡게,
//   top을 주면 위쪽은 top, 아래쪽은 dim으로 세로로 번지게(지도 가장자리의 어둠에 걸친 소품). 그림이 없으면 null
// PF.art.tile(key,w,h)  이음매 없는 바닥 조각을 w×h(32px 단위로 올림)로 줄인 캔버스(가장자리를 감싸 줄여 이음매가 생기지 않게)
// PF.art.lit(key,w,h,rgb)  사람 그림에 rgb빛의 테두리(뒤에서 비추는 불빛)를 입히고 둘레에 옅은 빛 번짐을 둔 캔버스(위아래 좌우 PAD 비율 여백). 그림이 없으면 null
// PF.art.ver  그림이 하나 뜰 때마다 오른다(그림이 떠야 생기는 것, 예: 발자리를 다시 만들 때 본다)
// 그림을 못 불러와도 오류를 내지 않는다(콘솔 오류는 브라우저가 실패한 요청에만 낸다)
(function(){
'use strict';
const PF=window.PF, URL0='assets/frame/manifest.json';
const IM={}, FIT=new Map();
const A={M:null,ver:0,PAD:.16};
A.img=k=>{ const im=IM[k]; return im&&im.complete&&im.naturalWidth?im:null; };
A.meta=k=>A.M&&A.M[k]||null;
// 반씩 여러 번 줄여 한 번에 크게 줄일 때의 계단을 없앤다
function shrink(src,sw,sh,w,h){
  let c=src, cw=sw, ch=sh;
  while(cw/2>=w*1.01&&ch/2>=h*1.01){ const n=document.createElement('canvas'); n.width=Math.max(1,cw>>1); n.height=Math.max(1,ch>>1);
    const g=n.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(c,0,0,cw,ch,0,0,n.width,n.height); c=n; cw=n.width; ch=n.height; }
  const o=document.createElement('canvas'); o.width=w; o.height=h; const g=o.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(c,0,0,cw,ch,0,0,w,h);
  return o; }
// 같은 그림의 크기 칸(32px 단위로 올림)·어둡기·종류마다 하나씩, 그림마다 최근 16개만 둔다(해상도가 바뀌면 옛 크기가 밀려난다)
function cached(id,make){ let c=FIT.get(id); if(c) return c; c=make(); FIT.set(id,c);
  const pre=id.slice(0,id.indexOf('|')+1); let n=0; for(const k of FIT.keys()) if(k.startsWith(pre)) n++;
  if(n>16) for(const k of FIT.keys()) if(k.startsWith(pre)){ FIT.delete(k); break; }
  return c; }
const up=v=>Math.max(16,Math.ceil(v/32)*32);
A.fit=function(k,w,h,dim=0,top=dim){ const im=A.img(k); if(!im) return null;
  const nw=im.naturalWidth, nh=im.naturalHeight, H=Math.min(nh,up(h)), W=Math.min(nw,Math.round(H*(w/h)));
  if(H>=nh*.85&&!dim&&!top) return im;
  return cached(k+'|'+W+'x'+H+'|'+dim+'|'+top,()=>{ const c=shrink(im,nw,nh,W,H);
    if(dim||top){ const g=c.getContext('2d'); g.globalCompositeOperation='source-atop';
      if(top===dim) g.fillStyle=`rgba(4,7,10,${dim})`;
      else { const q=g.createLinearGradient(0,0,0,H); q.addColorStop(0,`rgba(4,7,10,${top})`); q.addColorStop(1,`rgba(4,7,10,${dim})`); g.fillStyle=q; }
      g.fillRect(0,0,W,H); }
    return c; }); };
// 테두리 빛: 그림을 아래·오른쪽으로 조금 민 모양을 빼면 위와 왼쪽 가장자리만 남는다(왼쪽 위의 등불이 머리·어깨를 비춘다).
// 그 가장자리를 흐려 그림 안쪽에 옅게 더하고, 그림 둘레에는 아주 옅은 빛 번짐을 깐다. 여백 PAD(그림 크기 비율)만큼 큰 캔버스
A.lit=function(k,w,h,rgb){ const src=A.fit(k,w,h); if(!src) return null;
  const W=src.naturalWidth||src.width, H=src.naturalHeight||src.height;
  return cached(k+'|l'+W+'x'+H+'|'+rgb,()=>{ const px=Math.round(W*A.PAD), py=Math.round(H*A.PAD*.5), o=document.createElement('canvas'); o.width=W+2*px; o.height=H+2*py;
    const mk=()=>{ const c=document.createElement('canvas'); c.width=o.width; c.height=o.height; return [c,c.getContext('2d')]; };
    const e=Math.max(2,Math.round(W*.05)), [rc,r]=mk();
    for(const [dx,dy,a] of [[0,e*1.6,1],[e,e*.4,.6]]){ const [m,g]=mk(); g.drawImage(src,px,py); g.globalCompositeOperation='destination-out'; g.drawImage(src,px+dx,py+dy); r.globalAlpha=a; r.drawImage(m,0,0); }
    r.globalAlpha=1; r.globalCompositeOperation='source-in'; r.fillStyle=`rgb(${rgb})`; r.fillRect(0,0,o.width,o.height);
    const g=o.getContext('2d');
    g.filter=`blur(${Math.max(3,Math.round(W*.12))}px)`; g.globalAlpha=.6; g.drawImage(src,px,py);
    g.filter='none'; g.globalCompositeOperation='source-in'; g.globalAlpha=1; g.fillStyle=`rgba(${rgb},.16)`; g.fillRect(0,0,o.width,o.height);
    g.globalCompositeOperation='source-over'; g.drawImage(src,px,py);
    g.globalCompositeOperation='source-atop'; g.filter=`blur(${Math.max(1,Math.round(W*.03))}px)`; g.globalAlpha=.42; g.drawImage(rc,0,0);
    g.filter='none'; g.globalAlpha=1; g.globalCompositeOperation='source-over';
    return o; }); };
// 젖은 바닥에 비친 모습: 그림 아래쪽 절반을 위아래로 뒤집어 세로로 번지게 흐리고, 아래로 갈수록 사라지게 한 캔버스(w×h/2). 부르는 쪽이 'lighter'로 옅게 더한다
A.refl=function(k,w,h,dim=0){ const src=A.fit(k,w,h,dim); if(!src) return null;
  const W=src.naturalWidth||src.width, H=src.naturalHeight||src.height;
  return cached(k+'|r'+W+'x'+H+'|'+dim,()=>{ const rh=Math.max(4,H>>1);
    const sm=document.createElement('canvas'); sm.width=Math.max(4,W>>1); sm.height=Math.max(4,rh>>3);
    let g=sm.getContext('2d'); g.imageSmoothingQuality='high'; g.translate(0,sm.height); g.scale(1,-1); g.drawImage(src,0,H-rh,W,rh,0,0,sm.width,sm.height);
    const o=document.createElement('canvas'); o.width=W; o.height=rh; g=o.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(sm,0,0,W,rh);
    const f=g.createLinearGradient(0,0,0,rh); f.addColorStop(0,'rgba(0,0,0,1)'); f.addColorStop(.35,'rgba(0,0,0,.45)'); f.addColorStop(1,'rgba(0,0,0,0)');
    g.globalCompositeOperation='destination-in'; g.fillStyle=f; g.fillRect(0,0,W,rh);
    return o; }); };
// 크기는 fit처럼 32px 단위로 올려 둔다(카메라가 잠깐 당겨져도 크기마다 새 캔버스를 만들지 않게). 부르는 쪽은 캔버스 크기로 무늬를 맞춘다
A.tile=function(k,w,h){ const im=A.img(k); if(!im) return null; w=up(w); h=up(h);
  return cached(k+'|t'+w+'x'+h,()=>{ const nw=im.naturalWidth, nh=im.naturalHeight, px=nw>>3, py=nh>>3;
    // 둘레를 1/8씩 감싸 붙인 큰 조각을 줄인 뒤 가운데만 잘라낸다
    const p=document.createElement('canvas'); p.width=nw+2*px; p.height=nh+2*py; const g=p.getContext('2d');
    for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) g.drawImage(im,px+i*nw,py+j*nh);
    const W=Math.round(w*(nw+2*px)/nw), H=Math.round(h*(nh+2*py)/nh), s=shrink(p,p.width,p.height,W,H);
    const o=document.createElement('canvas'); o.width=w; o.height=h; o.getContext('2d').drawImage(s,(W-w)/2,(H-h)/2,w,h,0,0,w,h);
    return o; }); };
fetch(URL0).then(r=>r.ok?r.json():null).then(M=>{ if(!M) return; A.M=M;
  for(const k in M){ const im=new Image(); im.decoding='async'; im.onload=()=>{ A.ver++; }; im.src=M[k].src; IM[k]=im; } }).catch(()=>{});
PF.art=A;
})();

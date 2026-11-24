// 참광 - jointed mannequin for the stickman option (survival mode, swordsman first).
// A 3D figure solved from a small set of controls (pelvis, spine, feet and hands by IK, the sword) and drawn as lit capsules
// in the game's own camera. Motion is keyed poses with eased segments, so it is a function of time: hit-stop, slow motion
// and sub-frame blade trails all come out exact.
'use strict';
(()=>{
const G=RPG, X=G.sv, V=X.V, A=X.A, FSY=X.FSY;
const SC=205, BL=.66, HILT=.17;
const sin=Math.sin, cos=Math.cos, PI=Math.PI;
const v3=(x,y,z)=>[x,y,z], add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], len=a=>Math.hypot(a[0],a[1],a[2]), nrm=a=>{ const l=len(a)||1; return [a[0]/l,a[1]/l,a[2]/l]; };
const mix3=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u], mixn=(a,b,u)=>a+(b-a)*u;
const lin3=(a,b,c,x,y,z)=>[a[0]*x+b[0]*y+c[0]*z,a[1]*x+b[1]*y+c[1]*z,a[2]*x+b[2]*y+c[2]*z];
const rotZ=(a,t)=>{ const c=cos(t), s=sin(t); return [a[0]*c-a[1]*s,a[0]*s+a[1]*c,a[2]]; };
const wrap=a=>{ while(a>PI) a-=2*PI; while(a<-PI) a+=2*PI; return a; };
// direction from azimuth (0 forward, + toward the right hand) and elevation
const dir=(az,el=0)=>[cos(el)*cos(az),cos(el)*sin(az),sin(el)];
function slerpAbout(a,b,u,o){ const va=sub(a,o), vb=sub(b,o), la=len(va), lb=len(vb); if(la<1e-4||lb<1e-4) return mix3(a,b,u);
  const c=Math.max(-1,Math.min(1,dot(va,vb)/(la*lb))), ang=Math.acos(c); if(ang<.02||ang>3.1) return mix3(a,b,u);
  const s=sin(ang), ka=sin((1-u)*ang)/s/la, kb=sin(u*ang)/s/lb, l=la+(lb-la)*u;
  return [o[0]+(va[0]*ka+vb[0]*kb)*l,o[1]+(va[1]*ka+vb[1]*kb)*l,o[2]+(va[2]*ka+vb[2]*kb)*l]; }
const EASE={ lin:u=>u, in:u=>u*u, in3:u=>u*u*u, out:u=>1-(1-u)*(1-u), out3:u=>1-(1-u)**3, out5:u=>1-(1-u)**5, io:u=>u*u*(3-2*u), io5:u=>u*u*u*(u*(u*6-15)+10),
  back:u=>{ const c=1.9; return 1+(c+1)*(u-1)**3+c*(u-1)**2; }, spring:u=>1-Math.exp(-5.5*u)*cos(11*u)*(1-u), hold:u=>u<1?0:1 };

// ------------------------------------------------------------------ controls
const DEF={ hip:[0,0,.5], hy:-.25, cy:.2, lean:.07, side:0, hd:.05, hp:0, fr:[.08,.09,0], fl:[-.1,-.085,0], hr:[.1,.13,-.27], hl:[.08,-.15,-.26], sw:[.3,0,-.95],
  lw:[1,0,0], sh:1, sf:0, gr:0, sa:.34, sp:0, tr:0, kr:.25, kl:.25 };
// a style per class: what he holds, what he wears, how he stands. BL / HILT = weapon length above / below the grip (body heights)
const STY={
  sword:{w:'katana',bl:BL,hilt:HILT,acc:'#c8102a',acc2:'#a80f24',sash:'#b0122a',tint:[1,1,1],scarf:[7,2.5],base:{}},
  mage:{w:'staff',bl:.47,hilt:.5,acc:'#8a4dff',acc2:'#5a2cc0',sash:'#6a3bd8',tint:[.86,.84,1.12],scarf:[17,9],hat:'point',
    base:{gr:1,sf:1,sh:0,lw:[0,0,1],hr:[.17,.17,-.12],sw:[.05,.02,1],hl:[.07,-.15,-.25],lean:.04,hy:-.15,cy:.12}},
  fist:{w:'fists',bl:.01,hilt:.01,acc:'#22b4ff',acc2:'#1688d8',sash:'#1c9cf0',tint:[.9,1,1.1],scarf:[5,1.5],head:1,
    base:{gr:0,lw:[0,0,1],hip:[0,0,.455],hy:-.42,cy:.22,lean:.17,fr:[.15,.11,0],fl:[-.17,-.1,0],hr:[.17,.09,-.04],hl:[.27,-.07,-.09],hd:.2,kr:.35,kl:.45}},
  shaman:{w:'staff',bl:.36,hilt:.56,acc:'#19d69a',acc2:'#0f9c70',sash:'#12b884',tint:[.9,1.08,.96],scarf:[6,2],hat:'cone',bell:1,
    base:{gr:1,sf:1,sh:0,lw:[0,0,1],hr:[.12,.19,-.16],sw:[-.08,.1,1],hl:[.17,-.03,-.07],lean:.02,hy:-.05,cy:.05,fr:[.05,.07,0],fl:[-.06,-.07,0]}},
  pyro:{w:'orb',bl:.01,hilt:.01,acc:'#ff6a1a',acc2:'#c8300a',sash:'#e04a10',tint:[1.12,.92,.84],scarf:[9,3],hat:'hood',
    base:{gr:0,lw:[0,0,1],hr:[.14,.14,-.17],hl:[.05,-.16,-.24],lean:.09,hy:-.2,cy:.16}} };
let ST=STY.sword, BASE=DEF;
const BASES={}; for(const k in STY) BASES[k]=Object.assign({},DEF,STY[k].base);
function setCls(c){ ST=STY[c]||STY.sword; BASE=BASES[c]||DEF; }
const O_R=[0,.105,0], O_L=[0,-.105,0], O_0=[0,0,0];
const KIND={ hip:'v', fr:'v', fl:'v', lw:'v', hr:'r', hl:'l', sw:'s' };
function imix(k,a,b,u){ const t=KIND[k]; if(!t) return mixn(a,b,u); if(t==='v') return mix3(a,b,u); if(t==='r') return slerpAbout(a,b,u,O_R); if(t==='l') return slerpAbout(a,b,u,O_L); return nrm(slerpAbout(a,b,u,O_0)); }
function blendPose(a,b,u){ const o={}; for(const k in DEF) o[k]=imix(k,a[k],b[k],u); return o; }
const clone=p=>{ const o={}; for(const k in DEF){ const v=p[k]??DEF[k]; o[k]=Array.isArray(v)?v.slice():v; } return o; };

// ------------------------------------------------------------------ solve: controls -> joints (clip space: +x forward, +y his right, +z up; unit = body height)
function ik(a,c,l1,l2,pole){ let d=sub(c,a), L=len(d); const mx=(l1+l2)*.999; if(L>mx){ d=mul(d,mx/L); L=mx; c=add(a,d); } if(L<1e-4){ d=[0,0,-1e-4]; L=1e-4; }
  const n=mul(d,1/L), x=(l1*l1-l2*l2+L*L)/(2*L), h=Math.sqrt(Math.max(0,l1*l1-x*x)); let p=sub(pole,mul(n,dot(pole,n))); const pl_=len(p); p=pl_<1e-4?[0,0,1]:mul(p,1/pl_);
  return [add(add(a,mul(n,x)),mul(p,h)),c]; }
function solve(P){ const J={}, hy=P.hy, fp=[cos(hy),sin(hy),0], rp=[-sin(hy),cos(hy),0], ty=hy+P.cy, f0=[cos(ty),sin(ty),0], r0=[-sin(ty),cos(ty),0];
  const cl=cos(P.lean), sl=sin(P.lean); let u=[f0[0]*sl,f0[1]*sl,cl]; const f=[f0[0]*cl,f0[1]*cl,-sl];
  const cb=cos(P.side), sb=sin(P.side), u2=add(mul(u,cb),mul(r0,sb)), r=sub(mul(r0,cb),mul(u,sb)); u=u2;
  const hl_=P.lean*.45, fm=mix3(fp,f0,.5), uh=nrm([fm[0]*sin(hl_),fm[1]*sin(hl_),cos(hl_)]);
  J.hip=P.hip.slice(); J.mid=add(J.hip,mul(uh,.13)); J.ch=add(J.mid,mul(u,.15)); J.nk=add(J.ch,mul(u,.045));
  const hf=add(mul(f,cos(P.hd)),mul(r,sin(P.hd))), hu=nrm(add(mul(u,cos(P.hp)),mul(hf,sin(P.hp)))); J.hd=add(J.nk,mul(hu,.088)); J.hf=nrm(sub(hf,mul(hu,dot(hf,hu))));
  J.sr=add(add(J.ch,mul(r,.105)),mul(u,-.012)); J.sl=add(add(J.ch,mul(r,-.105)),mul(u,-.012)); J.pr=add(J.hip,mul(rp,.06)); J.pl=add(J.hip,mul(rp,-.06));
  // legs
  const ar=[P.fr[0],P.fr[1],P.fr[2]+.04], al=[P.fl[0],P.fl[1],P.fl[2]+.04];
  [J.kr,J.ar]=ik(J.pr,ar,.25,.25,add(add(fp,mul(rp,P.kr)),[0,0,.12])); [J.kl,J.al]=ik(J.pl,al,.25,.25,add(add(fp,mul(rp,-P.kl)),[0,0,.12]));
  const toe=(a,lift)=>add(a,nrm([fp[0],fp[1],-Math.min(.9,lift*5)-.25]).map(v=>v*.09)); J.tr=toe(J.ar,P.fr[2]); J.tl=toe(J.al,P.fl[2]);
  // scabbard on the left hip
  const mouth=add(add(add(J.hip,mul(rp,-.088)),mul(fp,.075-P.sp)),[0,0,.05]), sd=nrm(add(add(mul(fp,-cos(P.sa)),[0,0,-sin(P.sa)]),mul(rp,-.16)));
  J.sm=mouth; J.se=add(mouth,mul(sd,BL+.03));
  // right hand and the sword
  const loc=p=>add(J.ch,lin3(f,r,u,p[0],p[1],p[2])), hFree=loc(P.hr), dFree=nrm(lin3(f,r,u,P.sw[0],P.sw[1],P.sw[2]));
  const baseC=add(mouth,mul(sd,-(1-P.sh)*BL)), hC=add(baseC,mul(sd,-.04)), hGrip=mix3(hC,hFree,P.sf); let hr=mix3(hFree,hGrip,P.gr);
  const reach=(s,h,m)=>{ const d=sub(h,s), L=len(d); return L>m?add(s,mul(d,m/L)):h; }; if(ST.w!=='katana') hr=hFree; hr=reach(J.sr,hr,.3);
  let sdir, sbase; if(ST.w!=='katana'){ sdir=dFree; sbase=add(hr,mul(sdir,.02)); } else if(P.gr>=.5){ sdir=nrm(mix3(sd,dFree,P.sf)); sbase=add(hr,mul(sdir,.04)); } else { sdir=sd; sbase=baseC; }
  J.sb=sbase; J.st=add(sbase,mul(sdir,ST.bl)); J.sp=add(sbase,mul(sdir,-ST.hilt)); J.sdir=sdir;
  const w=P.lw, ws=(w[0]+w[1]+w[2])||1, pF=loc(P.hl), pS=ST.w==='katana'?add(mouth,mul(sd,.035)):pF, pH=add(sbase,mul(sdir,-.125));
  let hl=[0,1,2].map(i=>(pS[i]*w[0]+pH[i]*w[1]+pF[i]*w[2])/ws); hl=reach(J.sl,hl,.3);
  [J.er,J.hr]=ik(J.sr,hr,.155,.15,add(add(mul(u,-.7),mul(r,.6)),mul(f,-.35))); [J.el,J.hl]=ik(J.sl,hl,.155,.15,add(add(mul(u,-.7),mul(r,-.6)),mul(f,-.35)));
  J.f=f; J.r=r; J.u=u; return J; }

// ------------------------------------------------------------------ clips
// keyed clip: {keys:[[t,{channels},ease],...]}; a channel with no key at t=0 starts from the pose the figure was in. procedural clip: {fn(t,st)->pose}
const CLIPS={};
function compile(c){ if(c.tracks||c.fn) return c; c.tracks={}; c.dur=0; for(const [t,ch,e] of c.keys){ c.dur=Math.max(c.dur,t); for(const k in ch) (c.tracks[k]=c.tracks[k]||[]).push({t,v:ch[k],e:e||'io'}); } return c; }
function sample(c,t,from){ if(c.fn) return c.fn(t); const P={};
  for(const k in DEF){ const T=c.tracks[k], f0=from?from[k]:BASE[k]; if(!T){ P[k]=f0; continue; }
    let a={t:0,v:f0}, b=null; for(const q of T){ if(q.t<=t) a=q; else { b=q; break; } }
    if(!b){ P[k]=a.v; continue; } const u=(t-a.t)/Math.max(1e-5,b.t-a.t); P[k]=imix(k,a.v,b.v,(EASE[b.e]||EASE.io)(Math.max(0,Math.min(1,u)))); }
  return P; }

// ---- locomotion (procedural)
const st={phase:0,spd:0};
CLIPS.idle={fn(){ const b=sin(RT*2.1), P=clone(BASE), w=ST.w;
  if(w==='katana') return Object.assign(P,{hip:[0,0,.5+.005*b],lean:.07+.012*b,hr:[.1,.13,-.27+.006*b]});
  if(w==='fists'){ const q=sin(RT*5.2), q2=sin(RT*2.6); P.hip=[.012*q2,0,.455+.012*q]; P.hr=[.17+.012*q2,.09,-.04+.01*q]; P.hl=[.27-.012*q2,-.07,-.09+.01*q]; P.fr=[.15,.11,.012*Math.max(0,q)]; P.fl=[-.17,-.1,.012*Math.max(0,-q)]; return P; }
  if(w==='orb'){ P.hip=[0,0,.5+.005*b]; P.lean=.09+.012*b; P.hr=[.14,.14,-.17+.012*sin(RT*3.1)]; return P; }
  P.hip=[0,0,.5+.004*b]; P.lean=BASE.lean+.01*b; if(ST.hat==='cone'){ P.hl=[.17,-.03,-.07+.006*b]; P.sw=[-.08+.02*sin(RT*.9),.1,1]; } else P.hr=[.17,.17,-.12+.005*b]; return P; }};
CLIPS.run={fn(){ const p=st.phase, k=Math.min(1,st.spd/380), foot=(q,y)=>{ q=((q%1)+1)%1; if(q<.42){ const s=q/.42; return [.25-.57*s,y,0]; } const s=(q-.42)/.58, e=s*s*(3-2*s); return [-.32+.57*e,y,.05+.2*Math.pow(sin(PI*Math.pow(s,.75)),1.2)]; };
  const a=sin(2*PI*p), P=clone(BASE); P.hip=[.02,0,.435+.022*cos(4*PI*p+.5)]; P.fr=[0,0,0]; P.fl=[0,0,0]; P.hy=.14*a; P.cy=-.3*a; P.lean=.2+.22*k; P.hd=.16*a; P.hp=-.18; P.fr=foot(p,.06); P.fl=foot(p+.5,-.06);
  P.kr=.1; P.kl=.1; const w=ST.w;
  if(w==='katana'){ P.hr=[-.1-.07*a,.2,-.2+.03*a]; return P; }
  P.gr=BASE.gr; P.sf=BASE.sf; P.sh=BASE.sh; P.lw=[0,0,1];
  if(w==='fists'){ P.lean=.3+.2*k; P.hr=[.1+.2*a,.13,-.12-.06*a]; P.hl=[.1-.2*a,-.13,-.12+.06*a]; P.cy=-.42*a; }
  else if(w==='orb'){ P.hr=[.12+.03*a,.2,-.1]; P.hl=[.02-.16*a,-.15,-.2+.04*a]; P.lean=.24+.16*k; }
  else if(ST.hat==='cone'){ P.lean=.12+.12*k; P.hr=[.1,.2,-.14+.02*a]; P.sw=[.25,.1,.95]; P.hl=[.14,-.05,-.08]; P.hip=[.02,0,.455+.014*cos(4*PI*p+.5)]; P.cy=-.16*a; }
  else { P.hr=[.06,.21,-.16+.02*a]; P.sw=[-.55,.05,.82]; P.hl=[.04-.15*a,-.16,-.2+.04*a]; }
  return P; }};

// ---- the iai stance (omen): he sinks, coils away from the target, the hand finds the hilt; the last tenth of a second he draws back before the release
CLIPS.iaiReady={keys:[
  [.34,{hip:[.02,0,.41],hy:-.38,cy:.08,lean:.3,fr:[.2,.095,0],fl:[-.24,-.09,0],gr:1,sf:0,sh:1,lw:[1,0,0],hd:.3,hp:.08,kr:.3,kl:.5},'io'],
  [.72,{hip:[.035,0,.365],hy:-.52,cy:-.14,lean:.43,hd:.62,hp:.02,sp:.02},'io'],
  [.86,{hip:[.0,0,.345],hy:-.6,cy:-.22,lean:.47,hd:.8,sp:.035},'io'] ]};
// ---- nukitsuke: the draw is the cut. contact at about .07; the hips lead, the blade arrives last and goes through
CLIPS.draw={keys:[
  [.028,{sh:.5,sp:.085,hip:[.07,0,.34],hy:-.42,cy:-.1,fr:[.27,.095,.035]},'in'],
  [.05,{sh:.02,sf:.35,hip:[.14,0,.335],hy:-.2,cy:.2,fr:[.36,.095,.03],hr:[.3,-.09,-.13],sw:dir(-2.0,-.1),tr:0,hd:.1},'lin'],
  [.07,{sf:1,tr:1,hip:[.2,0,.33],hy:.0,cy:.5,fr:[.43,.1,0],hr:[.36,.04,-.08],sw:dir(-.75,.0),hd:-.4,lean:.36},'lin'],
  [.09,{hip:[.22,0,.33],hy:.1,cy:.82,hr:[.3,.2,-.07],sw:dir(.0,.03),hd:-.85},'lin'],
  [.12,{hy:.14,cy:1.0,hr:[.16,.3,-.08],sw:dir(.5,.06),hd:-1.05,lean:.3},'out'],
  [.2,{hy:.12,cy:1.08,hr:[.1,.31,-.09],sw:dir(.8,.08),tr:0,hip:[.22,0,.345]},'out'],
  [.42,{cy:1.02,hr:[.12,.3,-.1],sw:dir(.62,.05),hip:[.21,0,.36],sp:.05,lean:.27},'io'] ]};
// ---- flurry arrivals: he is seen at the end of each cut. every clip starts already in the swing.
const cutBase={gr:1,sf:1,sh:0,lw:[0,1,0],sp:0,tr:1,kr:.3,kl:.5};
// A: level cut, left to right, two hands, deep lunge
CLIPS.cutA={keys:[
  [0,Object.assign({},cutBase,{hip:[.02,0,.36],hy:-.3,cy:-.2,lean:.4,fr:[.34,.1,0],fl:[-.36,-.09,0],hr:[.3,-.06,-.1],sw:dir(-1.0,0),hd:.4,hp:.05}),'lin'],
  [.035,{hip:[.1,0,.33],hy:-.05,cy:.45,hr:[.34,.1,-.08],sw:dir(.2,.02),hd:-.35},'lin'],
  [.07,{hip:[.13,0,.325],hy:.1,cy:.85,hr:[.2,.26,-.08],sw:dir(1.25,.05),hd:-.9},'out'],
  [.15,{cy:.98,hr:[.14,.29,-.09],sw:dir(1.65,.07),tr:0,lw:[0,.6,.4],hl:[.1,-.12,-.2]},'out'],
  [.4,{cy:.92,sw:dir(1.5,.04),hip:[.12,0,.345]},'io'] ]};
// B: rising cut, right to left, low to high; ends with the blade over the left shoulder
CLIPS.cutB={keys:[
  [0,Object.assign({},cutBase,{hip:[.0,0,.34],hy:.35,cy:.35,lean:.46,fr:[.3,.1,0],fl:[-.38,-.09,0],hr:[.22,.2,-.26],sw:dir(1.3,-.5),hd:-.6,hp:.1}),'lin'],
  [.035,{hip:[.08,0,.36],hy:.1,cy:-.1,lean:.3,hr:[.36,.02,-.06],sw:dir(.1,.1),hd:.0},'lin'],
  [.07,{hip:[.11,0,.4],hy:-.1,cy:-.6,lean:.16,hr:[.24,-.12,.14],sw:dir(-1.0,.7),hd:.6,hp:-.1},'out'],
  [.15,{cy:-.75,hr:[.16,-.15,.2],sw:dir(-1.5,.95),tr:0,hip:[.1,0,.42]},'out'],
  [.4,{cy:-.7,sw:dir(-1.4,.85),hip:[.1,0,.41]},'io'] ]};
// C: falling diagonal from the right shoulder, the whole body drops into it; ends very low, blade near the floor
CLIPS.cutC={keys:[
  [0,Object.assign({},cutBase,{hip:[-.02,0,.45],hy:.25,cy:.3,lean:.1,fr:[.26,.1,0],fl:[-.3,-.09,0],hr:[.12,.16,.22],sw:dir(1.9,1.0),hd:-.5,hp:0}),'lin'],
  [.035,{hip:[.08,0,.36],hy:.0,cy:-.05,lean:.42,hr:[.36,.02,.0],sw:dir(.15,.3),hd:0},'lin'],
  [.07,{hip:[.13,0,.29],hy:-.12,cy:-.5,lean:.62,fr:[.4,.1,0],hr:[.28,-.14,-.3],sw:dir(-.9,-.42),hd:.5,hp:-.2},'out'],
  [.15,{cy:-.6,hr:[.22,-.17,-.33],sw:dir(-1.25,-.5),tr:0,hip:[.13,0,.28]},'out'],
  [.4,{sw:dir(-1.15,-.46),hip:[.13,0,.295]},'io'] ]};
// D: spinning level cut, one hand, he finishes with his back to the line he cut
CLIPS.cutD={keys:[
  [0,Object.assign({},cutBase,{lw:[0,0,1],hl:[-.05,-.2,-.1],hip:[.0,0,.4],hy:-1.5,cy:-.5,lean:.3,fr:[.22,.1,0],fl:[-.3,-.09,0],hr:[.26,.14,-.02],sw:dir(.8,.05),hd:.8,hp:0}),'lin'],
  [.035,{hy:-.4,cy:-.1,hip:[.06,0,.37],hr:[.3,.18,-.03],sw:dir(1.0,.03),hd:.2},'lin'],
  [.075,{hy:.9,cy:.5,hip:[.1,0,.35],hr:[.26,.22,-.04],sw:dir(1.15,.0),hd:-.6,fr:[.3,.16,0],fl:[-.26,-.14,0]},'out'],
  [.16,{hy:1.35,cy:.75,hr:[.2,.27,-.07],sw:dir(1.5,-.06),tr:0,hd:-.9},'out'],
  [.4,{hy:1.3,sw:dir(1.4,-.1),hip:[.1,0,.365]},'io'] ]};
// ---- noto: the flick that clears the blade, the back of the blade finds the mouth of the scabbard, the long slide, and the click
CLIPS.noto={keys:[
  [0,Object.assign({},cutBase,{tr:0,lw:[1,0,0],hip:[0,0,.46],hy:-.3,cy:.5,lean:.1,fr:[.12,.1,0],fl:[-.14,-.09,0],hr:[.2,.26,-.12],sw:dir(.9,-.05),hd:-.2,hp:.1,kr:.25,kl:.3}),'lin'],
  [.07,{hr:[.2,.27,-.2],sw:dir(.75,-.75),tr:.6},'out5'],
  [.14,{tr:0,hip:[0,0,.47],cy:.35},'io'],
  [.3,{sf:0,sh:0,sp:.06,cy:.05,hy:-.3,lean:.12,hd:.25,hp:.18,hip:[0,0,.48]},'io'],
  [.62,{sh:.9,sp:.03,hp:.24,lean:.1},'io'],
  [.7,{sh:.9},'lin'],
  [.74,{sh:1,sp:0,hp:.3,hip:[0,0,.475]},'in'] ]};
// ---- the call: the open hand goes up for what is coming down
CLIPS.raise={keys:[
  [.12,{gr:0,hip:[0,0,.46],lean:.14,hr:[.14,.16,-.2],hp:.15},'io'],
  [.34,{hip:[0,0,.515],hy:-.2,cy:.15,lean:-.1,hr:[.06,.13,.3],hd:.05,hp:-.42,fr:[.1,.1,0],fl:[-.12,-.09,0]},'back'],
  [.6,{hr:[.05,.13,.31],hip:[0,0,.52]},'io'] ]};
// ---- and the hand comes down with it: he drops to a knee as the floor breaks
CLIPS.slam={keys:[
  [.05,{hr:[.3,.12,.1],hip:[.04,0,.44],lean:.2,hp:.0},'in'],
  [.09,{hr:[.3,.1,-.24],hip:[.08,0,.3],lean:.52,hp:.3,fr:[.26,.1,0],fl:[-.26,-.09,0],cy:.35,kl:.1},'lin'],
  [.2,{hip:[.08,0,.27],lean:.58,hr:[.28,.1,-.27]},'spring'],
  [.9,{hip:[.08,0,.275]},'io'] ]};
CLIPS.rise={keys:[ [.9,clone(DEF),'io'] ]};
// ---- mage: the staff does the talking. cast1 points and thrusts, cast2 sweeps it overhead and down, cast3 plants it and pushes with the open hand
CLIPS.mCast1={keys:[
  [.06,{hip:[-.03,0,.47],hy:-.4,cy:-.25,lean:.0,hr:[.02,.22,-.02],sw:[.3,.2,.93],hd:.3},'out'],
  [.12,{hip:[.09,0,.44],hy:-.1,cy:.5,lean:.24,fr:[.26,.09,0],fl:[-.2,-.09,0],hr:[.36,.08,.02],sw:[.97,0,.22],hd:-.35,tr:1},'in'],
  [.3,{hr:[.34,.08,.03],sw:[.95,0,.3],tr:0},'spring'],
  [.6,{},'io'] ]};
CLIPS.mCast2={keys:[
  [.08,{hip:[0,0,.51],hy:-.3,cy:-.4,lean:-.08,hr:[.0,.16,.3],sw:[-.5,.1,.85],hd:.3,hp:-.25},'out'],
  [.15,{hip:[.07,0,.43],hy:.0,cy:.55,lean:.3,fr:[.24,.09,0],fl:[-.2,-.09,0],hr:[.3,.1,-.12],sw:[.9,0,-.42],hd:-.3,hp:.15,tr:1},'in'],
  [.32,{hr:[.28,.1,-.14],sw:[.88,0,-.46],tr:0},'spring'],
  [.62,{},'io'] ]};
CLIPS.mCast3={keys:[
  [.07,{hip:[-.02,0,.48],hy:-.1,cy:.5,hl:[.02,-.2,-.05],hr:[.12,.2,-.1],sw:[0,.05,1]},'out'],
  [.13,{hip:[.08,0,.45],hy:-.25,cy:-.55,lean:.22,fr:[.1,.09,0],fl:[-.24,-.09,0],hl:[.4,-.04,.0],hd:.4,tr:.5},'in'],
  [.3,{hl:[.38,-.04,.01],tr:0},'spring'],
  [.6,{},'io'] ]};
// the long casts of the two ultimates: staff high with both hands, eyes up / staff driven into the floor
CLIPS.mChanA={keys:[
  [.25,{hip:[0,0,.47],lean:.12,hr:[.16,.12,-.1],sw:[.2,0,.98],lw:[0,1,0]},'io'],
  [.6,{hip:[0,0,.525],hy:-.1,cy:.1,lean:-.14,hr:[.08,.08,.33],sw:[.02,0,1],hp:-.45,fr:[.09,.1,0],fl:[-.1,-.1,0]},'back'],
  [9,{},'lin'] ]};
CLIPS.mChanB={keys:[
  [.3,{hip:[0,0,.52],lean:-.1,hr:[.05,.14,.32],sw:[-.2,0,.97],hp:-.35},'io'],
  [.5,{hip:[.06,0,.38],lean:.4,hy:-.2,cy:.3,fr:[.24,.1,0],fl:[-.24,-.09,0],hr:[.26,.1,-.02],sw:[.25,0,.96],hp:.2,lw:[0,1,0]},'in3'],
  [9,{},'lin'] ]};
// ---- fist: he is the weapon. jab (lead hand), cross (rear hand, the hips turn through), upper (from the floor), then the charges
CLIPS.fJab={keys:[
  [.03,{hy:-.5,cy:.3,hl:[.2,-.1,-.08]},'out'],
  [.075,{hip:[.07,0,.45],hy:-.3,cy:-.25,lean:.24,fr:[.22,.11,0],hl:[.44,-.03,-.02],hd:.3,tr:1},'in'],
  [.16,{hl:[.3,-.07,-.07],tr:0},'out'],
  [.36,{},'io'] ]};
CLIPS.fCross={keys:[
  [.04,{hip:[-.03,0,.44],hy:-.62,cy:.0,hr:[.08,.14,-.06]},'out'],
  [.09,{hip:[.13,0,.43],hy:-.1,cy:.85,lean:.33,fr:[.3,.11,0],fl:[-.26,-.1,0],hr:[.45,.0,-.03],hl:[.12,-.14,-.1],hd:-.7,tr:1},'in'],
  [.2,{hr:[.42,.0,-.04],tr:0},'spring'],
  [.42,{},'io'] ]};
CLIPS.fUpper={keys:[
  [.05,{hip:[.02,0,.36],hy:-.3,cy:.5,lean:.42,hr:[.14,.14,-.28],hl:[.2,-.1,-.05]},'out'],
  [.1,{hip:[.1,0,.51],hy:-.05,cy:.2,lean:-.06,fr:[.2,.1,.05],hr:[.24,.05,.24],hp:-.3,tr:1},'in'],
  [.22,{hip:[.1,0,.49],hr:[.22,.05,.22],fr:[.2,.1,0],tr:0},'spring'],
  [.44,{},'io'] ]};
CLIPS.fChanA={keys:[
  [.3,{hip:[0,0,.38],hy:-.6,cy:.1,lean:.3,fr:[.24,.12,0],fl:[-.26,-.11,0],hr:[.0,.16,-.2],hl:[.02,-.12,-.2],hd:.55,kr:.5,kl:.6},'io'],
  [.62,{hip:[.02,0,.36],hr:[-.04,.14,-.19],hl:[-.01,-.1,-.19]},'io'],
  [9,{},'lin'] ]};
CLIPS.fChanB={keys:[
  [.25,{hip:[0,0,.4],lean:.25,hr:[.1,.14,-.22],hl:[.12,-.12,-.2]},'io'],
  [.5,{hip:[0,0,.53],hy:-.1,cy:.05,lean:-.12,hr:[.06,.12,.33],hl:[.08,-.13,-.18],hp:-.4,fr:[.1,.11,0],fl:[-.12,-.11,0]},'back'],
  [9,{},'lin'] ]};
// ---- shaman: calm and upright. the seal hand strikes forward, the staff rings on the floor, the paper is thrown
CLIPS.sSeal={keys:[
  [.07,{hl:[.1,-.02,.06],hd:.1,hip:[-.01,0,.5]},'out'],
  [.13,{hip:[.05,0,.47],hy:-.2,cy:-.35,lean:.14,fl:[-.16,-.08,0],hl:[.4,-.02,.02],hd:.3,tr:.6},'in'],
  [.32,{hl:[.38,-.02,.03],tr:0},'spring'],
  [.6,{},'io'] ]};
CLIPS.sRing={keys:[
  [.08,{hip:[0,0,.515],hr:[.14,.18,.02],sw:[-.05,.05,1],hp:-.15},'out'],
  [.14,{hip:[.03,0,.455],lean:.16,hr:[.17,.18,-.2],sw:[.06,.04,1],hp:.15,tr:1},'in3'],
  [.3,{hip:[.03,0,.47],tr:0},'spring'],
  [.6,{},'io'] ]};
CLIPS.sSweep={keys:[
  [.08,{hy:-.35,cy:-.4,hr:[.05,.22,.0],sw:[-.3,.8,.5],hd:.3},'out'],
  [.15,{hip:[.06,0,.46],hy:.05,cy:.6,lean:.18,fr:[.2,.08,0],hr:[.33,.06,-.02],sw:[.9,-.35,.25],hd:-.4,tr:1},'in'],
  [.32,{sw:[.8,-.55,.22],tr:0},'out'],
  [.62,{},'io'] ]};
CLIPS.sChanA={keys:[
  [.3,{hip:[0,0,.5],hr:[.16,.16,-.02],sw:[0,0,1],hl:[.14,-.02,.0]},'io'],
  [.6,{hip:[0,0,.52],lean:-.06,hr:[.14,.15,.12],hl:[.12,-.03,.14],hp:-.3},'io'],
  [9,{},'lin'] ]};
CLIPS.sChanB={keys:[
  [.3,{hip:[0,0,.47],lean:.12,hr:[.12,.2,-.1],hl:[.12,-.1,-.1]},'io'],
  [.6,{hip:[0,0,.525],lean:-.12,hy:0,cy:0,hr:[.02,.27,.2],sw:[-.2,.5,.84],hl:[.02,-.27,.2],hp:-.5,fr:[.09,.12,0],fl:[-.09,-.12,0]},'back'],
  [9,{},'lin'] ]};
// ---- pyro: the fire sits over the open right hand. an overhand throw, a two-palm push, a wide sowing sweep
CLIPS.pThrow={keys:[
  [.07,{hip:[-.04,0,.49],hy:-.5,cy:-.5,lean:-.06,hr:[-.08,.2,.22],hl:[.26,-.1,-.02],hd:.5},'out'],
  [.13,{hip:[.1,0,.44],hy:-.1,cy:.75,lean:.32,fr:[.26,.1,0],fl:[-.22,-.09,0],hr:[.42,.04,-.02],hl:[.02,-.18,-.2],hd:-.6,tr:1},'in'],
  [.3,{hr:[.38,.05,-.08],tr:0},'out'],
  [.58,{},'io'] ]};
CLIPS.pPush={keys:[
  [.07,{hip:[-.03,0,.46],lean:.05,hr:[.06,.1,-.08],hl:[.06,-.1,-.08]},'out'],
  [.13,{hip:[.09,0,.44],hy:-.1,cy:.1,lean:.3,fr:[.26,.1,0],fl:[-.22,-.1,0],hr:[.42,.06,.0],hl:[.42,-.06,.0],hd:0,tr:1},'in'],
  [.3,{hr:[.4,.07,.0],hl:[.4,-.07,.0],tr:0},'spring'],
  [.58,{},'io'] ]};
CLIPS.pSweep={keys:[
  [.07,{hy:-.4,cy:-.55,hr:[.1,-.05,-.1],hd:.5,hip:[0,0,.47]},'out'],
  [.15,{hip:[.05,0,.45],hy:.1,cy:.7,lean:.2,hr:[.3,.26,-.04],hd:-.55,tr:1},'lin'],
  [.3,{hr:[.16,.31,-.08],cy:.85,tr:0},'out'],
  [.6,{},'io'] ]};
CLIPS.pChanA={keys:[
  [.3,{hip:[0,0,.46],lean:.16,hr:[.14,.12,-.16],hl:[.14,-.12,-.16]},'io'],
  [.6,{hip:[0,0,.525],hy:0,cy:0,lean:-.14,hr:[.04,.26,.26],hl:[.04,-.26,.26],hp:-.5,fr:[.09,.12,0],fl:[-.09,-.12,0]},'back'],
  [9,{},'lin'] ]};
CLIPS.pChanB={keys:[
  [.3,{hip:[0,0,.52],lean:-.1,hr:[.04,.14,.33],hp:-.4},'io'],
  [.55,{hip:[.08,0,.42],hy:-.15,cy:.5,lean:.3,fr:[.24,.1,0],fl:[-.22,-.09,0],hr:[.4,.05,.06],hl:[.02,-.2,-.16],hp:0,hd:-.4},'in3'],
  [9,{},'lin'] ]};
for(const k in CLIPS) compile(CLIPS[k]);

// ------------------------------------------------------------------ state
const M={clip:CLIPS.idle,name:'idle',t:0,yaw:0,from:null,fromYaw:0,blend:0,bt:0,P:clone(DEF),J:null,slide:null,px:null,py:null,loco:true,ghosts:[],scarf:null,hair:null,speed:1};
const on=()=>G.mode==='surv'&&A.STK()&&!!STY[pl.cls];
function cur(t){ let P=sample(M.clip,t,M.from); if(M.blend>0&&M.bt<M.blend&&M.from) P=blendPose(M.from,P,EASE.io(M.bt/M.blend)); return P; }
// re-express a pose held under one facing in the frame of another
function reyaw(P,d){ const o=clone(P); o.hip=rotZ(o.hip,d); o.fr=rotZ(o.fr,d); o.fl=rotZ(o.fl,d); o.hy=wrap(o.hy+d); return o; }
function play(name,o={}){ const c=CLIPS[name]; if(!c) return; const yaw=o.yaw!=null?o.yaw:M.yaw; M.from=reyaw(M.P,wrap(M.yaw-yaw)); M.clip=c; M.name=name; M.t=0; M.yaw=yaw; M.blend=o.blend??(c.fn?.18:0); M.bt=0; M.speed=o.speed||1; M.loco=!!o.loco;
  M.slide=o.from?{x:o.from[0],y:o.from[1],x1:pl.x,y1:pl.gy,t:0,dur:o.slide||.05}:null; if(M.slide){ pl.x=M.slide.x; pl.gy=M.slide.y; M.px=pl.x; M.py=pl.gy; } M.P=cur(0); M.J=solve(M.P); }
function tick(dt,rdt){ if(!on()){ M.px=null; return; } if(M.cls!==pl.cls){ M.cls=pl.cls; setCls(pl.cls); M.clip=CLIPS.idle; M.name='idle'; M.from=null; M.P=clone(BASE); M.loco=true; M.scarf=null; }
  // movement drives the run cycle and the facing while no clip holds him
  let vx=0, vy=0; if(M.px!=null&&rdt>0){ vx=(pl.x-M.px)/rdt; vy=(pl.gy-M.py)/rdt/FSY; if(Math.hypot(vx,vy)>2500){ const dx=pl.x-M.px, dy=pl.gy-M.py; for(const n of [...(M.scarf||[]),...(M.hair||[])]){ n.x+=dx; n.y+=dy; n.px+=dx; n.py+=dy; } vx=vy=0; } }
  M.px=pl.x; M.py=pl.gy; const sp=Math.hypot(vx,vy);
  if(M.loco&&!lock){ st.spd=mixn(st.spd,sp,1-Math.exp(-rdt*12)); const mv=st.spd>70; if(mv){ st.phase+=sp*rdt/(SC*.57/.42); M.yaw=wrap(M.yaw+wrap(Math.atan2(vy,vx)-M.yaw)*(1-Math.exp(-rdt*14))); }
    const want=mv?'run':'idle'; if(M.name!==want){ const y=M.yaw; play(want,{loco:true,blend:.16}); M.yaw=y; } }
  if(!M.loco&&!lock&&M.clip.dur!=null&&(M.t>M.clip.dur+.1||(M.clip.dur>8&&!anim.seq))) M.loco=true;
  M.t+=dt*M.speed; M.bt+=dt; if(M.slide){ const q=M.slide; q.t+=dt; const k=EASE.out3(Math.min(1,q.t/q.dur)); pl.x=q.x+(q.x1-q.x)*k; pl.gy=q.y+(q.y1-q.y)*k; M.px=pl.x; M.py=pl.gy; if(q.t>=q.dur+.12) M.slide=null; } M.P=cur(M.t); M.J=solve(M.P);
  cloth(rdt); for(let i=M.shades.length-1;i>=0;i--){ const s=M.shades[i]; s.t+=rdt; if(s.t>s.wait+s.dur+.3) M.shades.splice(i,1); }
  for(let i=M.ghosts.length-1;i>=0;i--){ const g=M.ghosts[i]; g.t+=rdt; if(g.t>=g.life) M.ghosts.splice(i,1); } }

// ------------------------------------------------------------------ world / screen
function origin(){ return [pl.x,pl.gy]; }
function proj(p,ox,oy,yaw){ const c=cos(yaw), s=sin(yaw), x=p[0]*c-p[1]*s, y=p[0]*s+p[1]*c; return [ox+x*SC,oy+y*SC*FSY-p[2]*SC,y,p[2]*SC,oy+y*SC*FSY]; }
// world point (x, floor y, height) of a joint: for effects that must sit on the blade
function wpt(name){ if(!M.J) return [pl.x,pl.gy,0]; const [ox,oy]=origin(), q=proj(M.J[name],ox,oy,M.yaw); return [q[0],q[4],q[3]]; }

// ------------------------------------------------------------------ cloth: a scarf and a tail of hair, verlet chains in world space
function chain(n){ const a=[]; for(let i=0;i<n;i++) a.push({x:pl.x,y:pl.gy,z:150,px:pl.x,py:pl.gy,pz:150}); return a; }
function stepChain(L,ax,ay,az,seg,rdt,grav,drag){ if(rdt<=0) return; const n0=L[0]; n0.x=ax; n0.y=ay; n0.z=az; const sub_=2, h=Math.min(rdt,.033)/sub_;
  for(let s=0;s<sub_;s++){ for(let i=1;i<L.length;i++){ const n=L[i], vx=(n.x-n.px)*drag, vy=(n.y-n.py)*drag, vz=(n.z-n.pz)*drag; n.px=n.x; n.py=n.y; n.pz=n.z; n.x+=vx; n.y+=vy; n.z+=vz-grav*h*h; if(n.z<3) n.z=3; }
    for(let it=0;it<3;it++) for(let i=1;i<L.length;i++){ const a=L[i-1], b=L[i], dx=b.x-a.x, dy=(b.y-a.y)/FSY, dz=b.z-a.z, d=Math.hypot(dx,dy,dz)||1, k=(d-seg)/d; b.x-=dx*k; b.y-=dy*k*FSY; b.z-=dz*k; } } }
function cloth(rdt){ if(!M.J) return; if(!M.scarf){ M.scarf=chain(9); M.hair=chain(5); } const [ox,oy]=origin(), J=M.J, back=ST.head?sub(add(J.hd,[0,0,.02]),mul(J.hf,.065)):sub(J.nk,mul(J.f,.05)), a=proj(back,ox,oy,M.yaw), hb=sub(add(J.hd,[0,0,.03]),mul(J.hf,.06)), b=proj(hb,ox,oy,M.yaw);
  stepChain(M.scarf,a[0],a[4],a[3],13,rdt,2600,.93); stepChain(M.hair,b[0],b[4],b[3],9,rdt,2200,.9); }
function ribbon(g,L,w0,w1,c){ const P=L.map(n=>[n.x,n.y-n.z]); g.fillStyle=c; g.beginPath(); const N=P.length, up=[], dn=[];
  for(let i=0;i<N;i++){ const a=P[Math.max(0,i-1)], b=P[Math.min(N-1,i+1)], dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy)||1, w=mixn(w0,w1,i/(N-1)); up.push([P[i][0]-dy/l*w,P[i][1]+dx/l*w]); dn.push([P[i][0]+dy/l*w,P[i][1]-dx/l*w]); }
  g.moveTo(up[0][0],up[0][1]); for(const p of up) g.lineTo(p[0],p[1]); for(let i=N-1;i>=0;i--) g.lineTo(dn[i][0],dn[i][1]); g.closePath(); g.fill(); }

// ------------------------------------------------------------------ drawing
const SEG=[ ['hip','mid',.062,.07,'t'],['mid','ch',.07,.082,'t'],['sl','sr',.045,.045,'t'],['pl','pr',.05,.05,'t'],['ch','nk',.03,.027,'b'],
  ['sr','er',.036,.03,'b'],['er','hr',.029,.023,'b'],['sl','el',.036,.03,'b'],['el','hl',.029,.023,'b'],
  ['pr','kr',.05,.04,'b'],['kr','ar',.037,.026,'b'],['ar','tr',.026,.021,'d'],['pl','kl',.05,.04,'b'],['kl','al',.037,.026,'b'],['al','tl',.026,.021,'d'] ];
const JNT=[['er',.03],['el',.03],['kr',.039],['kl',.039],['hr',.027],['hl',.027]];
const hex=c=>'#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function capsule(g,a,b,ra,rb){ const dx=b[0]-a[0], dy=b[1]-a[1], an=Math.atan2(dy,dx); g.beginPath(); g.arc(a[0],a[1],ra,an+PI/2,an+PI*1.5); g.arc(b[0],b[1],rb,an-PI/2,an+PI/2); g.closePath(); }
function lightOf(ox,oy){ let L={dx:-.5,dy:-.86,c:[200,214,255],s:.35}; if(window.GFX){ let best=.25; for(const l of GFX.lights){ const k=l.t<l.hold?1:Math.max(0,1-(l.t-l.hold)/l.life), dx=l.x-ox, dy=(l.y-oy)/FSY, d=Math.hypot(dx,dy), v=l.a*k*k/(1+(d/(l.r*.8))**2); if(v>best&&d>30){ best=v; const sx=dx, sy=dy*FSY-l.z*.6, n=Math.hypot(sx,sy)||1; L={dx:sx/n,dy:sy/n,c:[l.c[0]*255,l.c[1]*255,l.c[2]*255],s:Math.min(1,v)}; } } } return L; }
function pal(L){ const am=window.GFX&&GFX.amb?GFX.amb:[1,1,1], a=am.map(v=>.5+.5*v), k=L.s;
  const T=ST.tint; return { lit:hex([240*(1-k*.3)+L.c[0]*k*.3,244*(1-k*.3)+L.c[1]*k*.3,255*(1-k*.3)+L.c[2]*k*.3]), mid:hex([128*a[0]*T[0],136*a[1]*T[1],168*a[2]*T[2]]), dark:hex([36*a[0]*T[0],40*a[1]*T[1],62*a[2]*T[2]]), line:'#0a0b14' }; }
function figure(g,J,ox,oy,yaw,o={}){ const S={}; for(const k in J) if(Array.isArray(J[k])&&k!=='f'&&k!=='r'&&k!=='u'&&k!=='hf'&&k!=='sdir') S[k]=proj(J[k],ox,oy,yaw);
  const flat=o.flat, L=o.L||lightOf(ox,oy), C=flat?null:pal(L), items=[];
  for(const [a,b,ra,rb,kd] of SEG) items.push({d:(S[a][2]+S[b][2])/2+(kd==='t'?0:0),a:S[a],b:S[b],ra:ra*SC,rb:rb*SC,kd});
  for(const [j,r] of JNT) items.push({d:S[j][2]+.002,a:S[j],r:r*SC,kd:'j'});
  items.push({d:S.hd[2]+.001,a:S.hd,r:.067*SC,kd:'h'});
  if(ST.w==='katana'){ items.push({d:(S.sm[2]+S.se[2])/2,a:S.sm,b:S.se,kd:'saya'}); items.push({d:(S.sb[2]+S.st[2])/2+.003,kd:'sword'}); }
  else if(ST.w==='staff') items.push({d:(S.sp[2]+S.st[2])/2+.003,kd:'staff'});
  else if(ST.w==='orb') items.push({d:S.hr[2]+.01,kd:'orb'});
  items.sort((p,q)=>p.d-q.d);
  for(const it of items){
    if(it.kd==='staff'){ const p=S.sp, t=S.st; g.lineCap='round'; if(flat){ g.strokeStyle=flat; g.lineWidth=4; g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(t[0],t[1]); g.stroke(); continue; }
      g.strokeStyle='#0d0a10'; g.lineWidth=7; g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(t[0],t[1]); g.stroke(); g.strokeStyle=ST.bell?'#7a5a36':'#4a3a5e'; g.lineWidth=4; g.stroke();
      g.strokeStyle='#d9b45a'; g.lineWidth=5; g.beginPath(); g.moveTo(mixn(p[0],t[0],.86),mixn(p[1],t[1],.86)); g.lineTo(mixn(p[0],t[0],.9),mixn(p[1],t[1],.9)); g.stroke();
      const dx=t[0]-p[0], dy=t[1]-p[1], l=Math.hypot(dx,dy)||1, ux=dx/l, uy=dy/l;
      if(ST.bell){ /* a gold ring with paper charms that hang and sway */ const cx=t[0]+ux*9, cy=t[1]+uy*9; g.strokeStyle='#0d0a10'; g.lineWidth=5; g.beginPath(); g.arc(cx,cy,9,0,7); g.stroke(); g.strokeStyle='#e8c25a'; g.lineWidth=2.6; g.stroke();
        for(const sgn of [-1,1]){ const sw_=sin(RT*3+sgn)*3, x0=cx+sgn*8, y0=cy+4; g.fillStyle='#f4f0dc'; g.strokeStyle='#0d0a10'; g.lineWidth=1; g.beginPath(); g.moveTo(x0-3,y0); g.lineTo(x0+3,y0); g.lineTo(x0+3+sw_,y0+19); g.lineTo(x0-3+sw_,y0+19); g.closePath(); g.fill(); g.stroke(); g.strokeStyle=ST.acc; g.lineWidth=1.6; g.beginPath(); g.moveTo(x0+sw_*.3,y0+4); g.lineTo(x0+sw_*.8,y0+15); g.stroke(); } }
      else { /* a crystal in a claw: a hard diamond with its own light */ const cx=t[0]+ux*8, cy=t[1]+uy*8, px=-uy, py=ux; g.fillStyle='#efe6ff'; g.strokeStyle='#0d0a10'; g.lineWidth=1.4; g.beginPath(); g.moveTo(cx+ux*13,cy+uy*13); g.lineTo(cx+px*7,cy+py*7); g.lineTo(cx-ux*9,cy-uy*9); g.lineTo(cx-px*7,cy-py*7); g.closePath(); g.fill(); g.stroke();
        g.fillStyle=ST.acc; g.beginPath(); g.moveTo(cx+ux*13,cy+uy*13); g.lineTo(cx+px*7,cy+py*7); g.lineTo(cx-ux*9,cy-uy*9); g.closePath(); g.fill();
        if(g===ctx){ fx.save(); fx.globalCompositeOperation='lighter'; const rr=22+3*sin(RT*5), gr=fx.createRadialGradient(cx,cy,1,cx,cy,rr); gr.addColorStop(0,'rgba(190,150,255,.85)'); gr.addColorStop(1,'rgba(120,60,255,0)'); fx.fillStyle=gr; fx.beginPath(); fx.arc(cx,cy,rr,0,7); fx.fill(); fx.restore(); } }
      continue; }
    if(it.kd==='orb'){ if(flat) continue; /* the fire he carries: it floats over the open right hand */ const h=S.hr, cx=h[0], cy=h[1]-13-2*sin(RT*4); if(g===ctx){ fx.save(); fx.globalCompositeOperation='lighter'; const rr=20+4*sin(RT*11)+3*sin(RT*17.3), gr=fx.createRadialGradient(cx,cy,1,cx,cy,rr); gr.addColorStop(0,'rgba(255,240,190,.95)'); gr.addColorStop(.35,'rgba(255,140,40,.7)'); gr.addColorStop(1,'rgba(255,60,0,0)'); fx.fillStyle=gr; fx.beginPath(); fx.arc(cx,cy,rr,0,7); fx.fill();
        for(let i=0;i<3;i++){ const a=RT*6+i*2.1, tx=cx+sin(a)*5, ty=cy-12-8*((RT*2.2+i*.37)%1); fx.fillStyle='rgba(255,170,60,.5)'; fx.beginPath(); fx.arc(tx,ty,4-3*((RT*2.2+i*.37)%1),0,7); fx.fill(); } fx.restore(); }
      else { g.fillStyle='#ffb040'; g.beginPath(); g.arc(cx,cy,7,0,7); g.fill(); } continue; }
    if(it.kd==='sword'){ const b=S.sb, t=S.st, p=S.sp; if(flat){ g.strokeStyle=flat; g.lineWidth=4; g.lineCap='round'; g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(t[0],t[1]); g.stroke(); continue; }
      g.lineCap='round'; g.strokeStyle='#15131c'; g.lineWidth=6.4; g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(b[0],b[1]); g.stroke();
      g.strokeStyle='#c9a34a'; g.lineWidth=2; for(const u of [.25,.5,.75]){ const x=mixn(p[0],b[0],u), y=mixn(p[1],b[1],u), nx=-(b[1]-p[1]), ny=b[0]-p[0], l=Math.hypot(nx,ny)||1; g.beginPath(); g.moveTo(x-nx/l*3,y-ny/l*3); g.lineTo(x+nx/l*3,y+ny/l*3); g.stroke(); }
      if(o.P&&(o.P.gr<.5||o.P.sf<.999)&&o.P.sh>.02){ /* in the scabbard: only what is drawn out shows */ const k=o.P.gr<.5?1:o.P.sh*(1-o.P.sf); t[0]=mixn(t[0],b[0],k); t[1]=mixn(t[1],b[1],k); }
      const nx=-(t[1]-b[1]), ny=t[0]-b[0], l=Math.hypot(nx,ny)||1, w=3.1; g.fillStyle='#e9eef8'; g.beginPath(); g.moveTo(b[0]-nx/l*w,b[1]-ny/l*w); g.lineTo(t[0],t[1]); g.lineTo(b[0]+nx/l*w,b[1]+ny/l*w); g.closePath(); g.fill();
      g.strokeStyle='#5b6686'; g.lineWidth=1; g.beginPath(); g.moveTo(b[0],b[1]); g.lineTo(t[0],t[1]); g.stroke();
      g.fillStyle='#d9b45a'; g.beginPath(); g.arc(b[0],b[1],5.2,0,7); g.fill(); g.strokeStyle='#3a2c10'; g.lineWidth=1.2; g.stroke(); continue; }
    if(it.kd==='saya'){ g.lineCap='round'; g.strokeStyle=flat||'#100f18'; g.lineWidth=7.5; g.beginPath(); g.moveTo(it.a[0],it.a[1]); g.lineTo(it.b[0],it.b[1]); g.stroke(); if(!flat){ g.strokeStyle='#8f1626'; g.lineWidth=7.5; g.beginPath(); g.moveTo(mixn(it.a[0],it.b[0],.12),mixn(it.a[1],it.b[1],.12)); g.lineTo(mixn(it.a[0],it.b[0],.2),mixn(it.a[1],it.b[1],.2)); g.stroke(); g.strokeStyle='#c9a34a'; g.lineWidth=7.5; g.beginPath(); g.moveTo(mixn(it.a[0],it.b[0],.97),mixn(it.a[1],it.b[1],.97)); g.lineTo(it.b[0],it.b[1]); g.stroke(); } continue; }
    if(it.kd==='h'||it.kd==='j'){ const [x,y]=it.a, r=it.r; g.beginPath(); g.arc(x,y,r,0,7);
      if(flat){ g.fillStyle=flat; g.fill(); continue; }
      const gr=g.createRadialGradient(x+L.dx*r*.5,y+L.dy*r*.5,r*.1,x,y,r*1.05); gr.addColorStop(0,C.lit); gr.addColorStop(.55,it.kd==='j'?C.dark:C.mid); gr.addColorStop(1,C.dark); g.fillStyle=gr; g.fill(); g.strokeStyle=C.line; g.lineWidth=1.3; g.stroke();
      if(it.kd==='j'&&ST.w==='fists'&&(it.a===S.hr||it.a===S.hl)){ /* gauntlets: his hands are the weapon and they carry the light */ const rr=r*1.75; g.beginPath(); g.arc(x,y,rr,0,7); const g2=g.createRadialGradient(x+L.dx*rr*.5,y+L.dy*rr*.5,rr*.1,x,y,rr); g2.addColorStop(0,'#eafaff'); g2.addColorStop(.5,ST.acc); g2.addColorStop(1,'#0b3a66'); g.fillStyle=g2; g.fill(); g.strokeStyle=C.line; g.lineWidth=1.4; g.stroke();
        if(g===ctx){ fx.save(); fx.globalCompositeOperation='lighter'; const gl=fx.createRadialGradient(x,y,1,x,y,rr*2.4); gl.addColorStop(0,'rgba(80,190,255,.45)'); gl.addColorStop(1,'rgba(40,140,255,0)'); fx.fillStyle=gl; fx.beginPath(); fx.arc(x,y,rr*2.4,0,7); fx.fill(); fx.restore(); } continue; }
      if(it.kd==='h'&&ST.hat){ const nk=S.nk, ux=x-nk[0], uy=y-nk[1], ul=Math.hypot(ux,uy)||1, vx=ux/ul, vy=uy/ul, px=-vy, py=vx;
        if(ST.hat==='point'){ /* a tall bent hat on a wide brim */ const bx=x+vx*r*.45, by=y+vy*r*.45, tipx=x+vx*r*3.5-J.hf[0]*0+px*r*.9*sin(RT*1.3+1), tipy=y+vy*r*3.5+r*.5;
          g.fillStyle='#2a1a52'; g.strokeStyle=C.line; g.lineWidth=1.4; g.beginPath(); g.ellipse(bx,by,r*2,r*.8,Math.atan2(py,px),0,7); g.fill(); g.stroke();
          g.beginPath(); g.moveTo(bx-px*r*1.05,by-py*r*1.05); g.quadraticCurveTo(x+vx*r*2.2-px*r*.3,y+vy*r*2.2-py*r*.3,tipx,tipy); g.quadraticCurveTo(x+vx*r*2+px*r*.6,y+vy*r*2+py*r*.6,bx+px*r*1.05,by+py*r*1.05); g.closePath(); g.fillStyle='#3a2470'; g.fill(); g.stroke();
          g.strokeStyle=ST.acc; g.lineWidth=r*.3; g.beginPath(); g.moveTo(bx-px*r*.95+vx*r*.25,by-py*r*.95+vy*r*.25); g.lineTo(bx+px*r*.95+vx*r*.25,by+py*r*.95+vy*r*.25); g.stroke(); }
        else if(ST.hat==='cone'){ /* a wide straw hat: from above it is nearly a disc, and it hides his face */ const bx=x+vx*r*.5, by=y+vy*r*.5, an=Math.atan2(py,px); g.fillStyle='#b99a5a'; g.strokeStyle=C.line; g.lineWidth=1.4; g.beginPath(); g.ellipse(bx,by,r*2.5,r*1.25,an,0,7); g.fill(); g.stroke();
          const ax=bx+vx*r*1.05, ay=by+vy*r*1.05; g.fillStyle='#d8bd7c'; g.beginPath(); g.moveTo(bx-px*r*2.4,by-py*r*2.4); g.quadraticCurveTo(ax,ay-r*.2,bx+px*r*2.4,by+py*r*2.4); g.quadraticCurveTo(bx+vx*r*.2,by+vy*r*.2-r*.9,bx-px*r*2.4,by-py*r*2.4); g.fill();
          g.strokeStyle='rgba(60,40,10,.5)'; g.lineWidth=1; for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(ax,ay-r*.3); g.lineTo(bx+px*r*i*1.05,by+py*r*i*1.05+r*.5*(1-Math.abs(i)/2.4)); g.stroke(); }
          g.fillStyle=ST.acc; g.beginPath(); g.arc(ax,ay-r*.3,r*.28,0,7); g.fill(); }
        else { /* a hood, and the fire that is his hair */ g.fillStyle='#4a0f0a'; g.strokeStyle=C.line; g.lineWidth=1.4; g.beginPath(); g.arc(x-J.hf[0]*0+vx*r*.15,y+vy*r*.15,r*1.22,Math.atan2(vy,vx)-2.2,Math.atan2(vy,vx)+2.2); g.closePath(); g.fill(); g.stroke();
          if(g===ctx){ fx.save(); fx.globalCompositeOperation='lighter'; for(let i=0;i<4;i++){ const q=(RT*1.8+i*.25)%1, fx_=x+vx*r*(.9+q*1.3)+px*r*.4*sin(RT*7+i*2), fy=y+vy*r*(.9+q*1.3)+py*r*.4*sin(RT*7+i*2); fx.fillStyle=`rgba(255,${Math.round(190-120*q)},40,${(.6*(1-q)).toFixed(2)})`; fx.beginPath(); fx.arc(fx_,fy,r*(.75-.55*q),0,7); fx.fill(); } fx.restore(); } }
        continue; }
      if(it.kd==='h'){ /* headband and the eye: which way he looks reads from above */ const hf=J.hf, c=cos(yaw), s=sin(yaw), fx_=hf[0]*c-hf[1]*s, fy=(hf[0]*s+hf[1]*c)*FSY-hf[2], fl_=Math.hypot(fx_,fy)||1, ax=fx_/fl_, ay=fy/fl_;
        { const nk=S.nk, ux=x-nk[0], uy=y-nk[1], ul=Math.hypot(ux,uy)||1, px=-uy/ul, py=ux/ul, bx=x+ux/ul*r*.3, by=y+uy/ul*r*.3; g.save(); g.beginPath(); g.arc(x,y,r,0,7); g.clip(); g.strokeStyle=ST.acc; g.lineWidth=r*.4; g.beginPath(); g.moveTo(bx-px*r*1.2,by-py*r*1.2); g.lineTo(bx+px*r*1.2,by+py*r*1.2); g.stroke(); g.restore(); }
        if(o.eye!==false&&g===ctx){ const ex=x+ax*r*.55, ey=y+ay*r*.55+r*.12; fx.save(); fx.globalCompositeOperation='lighter'; fx.fillStyle=ST.w==='katana'?'rgba(255,60,70,.9)':'rgba(255,255,255,.75)'; fx.beginPath(); fx.ellipse(ex,ey,r*.3,r*.13,Math.atan2(ay,ax)+PI/2,0,7); fx.fill(); fx.restore(); } }
      continue; }
    capsule(g,it.a,it.b,it.ra,it.rb); if(flat){ g.fillStyle=flat; g.fill(); continue; }
    const mx=(it.a[0]+it.b[0])/2, my=(it.a[1]+it.b[1])/2, rr=Math.max(it.ra,it.rb)*1.15, gr=g.createLinearGradient(mx+L.dx*rr,my+L.dy*rr,mx-L.dx*rr,my-L.dy*rr);
    gr.addColorStop(0,C.lit); gr.addColorStop(.5,it.kd==='d'?C.dark:C.mid); gr.addColorStop(1,C.dark); g.fillStyle=gr; g.fill(); g.strokeStyle=C.line; g.lineWidth=1.3; g.stroke();
    if(it.kd==='t'&&it.a===S.pl){ /* sash */ g.strokeStyle=ST.sash; g.lineWidth=it.ra*1.5; g.lineCap='round'; g.beginPath(); g.moveTo(it.a[0],it.a[1]-it.ra*.9); g.lineTo(it.b[0],it.b[1]-it.ra*.9); g.stroke(); } }
  return S; }
function shadow(g,J,ox,oy,yaw,L){ const sx=-L.dx*.55, sy=.22, q=p=>{ const a=proj(p,ox,oy,yaw); return [a[0]+sx*a[3],a[4]+sy*a[3]*.5-Math.min(0,L.dy)*0]; };
  g.save(); g.globalAlpha=.42; g.strokeStyle='#000'; g.lineCap='round'; g.lineJoin='round'; g.lineWidth=.07*SC; g.beginPath();
  for(const [a,b] of [['pr','kr'],['kr','ar'],['ar','tr'],['pl','kl'],['kl','al'],['al','tl'],['sr','er'],['er','hr'],['sl','el'],['el','hl']]){ const p=q(J[a]), r=q(J[b]); g.moveTo(p[0],p[1]); g.lineTo(r[0],r[1]); } g.stroke();
  g.lineWidth=.15*SC; g.beginPath(); let p=q(J.hip), r=q(J.ch); g.moveTo(p[0],p[1]); g.lineTo(r[0],r[1]); r=q(J.hd); g.lineTo(r[0],r[1]); g.stroke();
  if(ST.w==='katana'||ST.w==='staff'){ g.lineWidth=3.2; g.beginPath(); p=q(J.sp); r=q(J.st); g.moveTo(p[0],p[1]); g.lineTo(r[0],r[1]); g.stroke(); } g.restore(); }
// the blade's own light: sampled back along the clip, so the arc is the true path of the edge
function trail(ox,oy){ const N=22, step=.0034, pts=[]; for(let i=0;i<=N;i++){ const t=M.t-i*step; if(t<0) break; const P=sample(M.clip,t,M.from); if(P.tr<=.02){ pts.push(null); continue; } const J=solve(P); pts.push({b:proj(mix3(J.sb,J.st,.5),ox,oy,M.yaw),m:proj(mix3(J.sb,J.st,.8),ox,oy,M.yaw),t:proj(J.st,ox,oy,M.yaw),a:Math.min(1,P.tr)}); }
  fx.save(); fx.globalCompositeOperation='lighter';
  const quad=(p0,p1,q1,q0,c)=>{ fx.fillStyle=c; fx.beginPath(); fx.moveTo(p0[0],p0[1]); fx.lineTo(p1[0],p1[1]); fx.lineTo(q1[0],q1[1]); fx.lineTo(q0[0],q0[1]); fx.closePath(); fx.fill(); };
  for(let i=0;i<pts.length-1;i++){ const p=pts[i], q=pts[i+1]; if(!p||!q) continue; const k=1-i/N, a=p.a*Math.pow(k,1.6); if(a<=.01) continue;
    quad(p.m,p.t,q.t,q.m,`rgba(255,${Math.round(90+165*k*k)},${Math.round(90+165*k*k)},${(a*.45).toFixed(3)})`);
    fx.strokeStyle=`rgba(255,255,255,${a.toFixed(3)})`; fx.lineWidth=2.6*k+.6; fx.lineCap='round'; fx.beginPath(); fx.moveTo(p.t[0],p.t[1]); fx.lineTo(q.t[0],q.t[1]); fx.stroke(); }
  fx.restore(); }
function draw(g){ if(!M.J) tick(0,0); if(!M.J) return; const [ox,oy]=origin(), J=M.J, main=g===ctx;
  if(main){ const L=lightOf(ox,oy); shadow(g,J,ox,oy,M.yaw,L);
    // where he was: the dash leaves his shape behind in the blade's colour
    fx.save(); fx.globalCompositeOperation='lighter';
    if(M.slide&&M.slide.t<M.slide.dur+.1){ const k0=Math.min(1,M.slide.t/M.slide.dur); for(let i=1;i<=4;i++){ const u=i/5, x=mixn(ox,M.slide.x,u*(1-k0*.3)), y=mixn(oy,M.slide.y,u*(1-k0*.3)); fx.globalAlpha=.3*(1-u)*(1-Math.max(0,(M.slide.t-M.slide.dur)/.1)); figure(fx,J,x,y,M.yaw,{flat:'#ff3038'}); } }
    for(const q of M.ghosts){ const k=q.t/q.life; fx.globalAlpha=(1-k)*(1-k)*q.a; figure(fx,q.J,q.x,q.y,q.yaw,{flat:q.c}); }
    fx.restore();
    const behind=M.scarf&&M.scarf[4].y<=oy+proj(J.nk,0,0,M.yaw)[4]; if(behind&&M.scarf){ ribbon(g,M.scarf,ST.scarf[0],ST.scarf[1],ST.acc2); }
    figure(g,J,ox,oy,M.yaw,{L,P:M.P}); if(M.hair) ribbon(g,M.hair,4.5,1.2,'#14121c'); if(!behind&&M.scarf) ribbon(g,M.scarf,ST.scarf[0],ST.scarf[1],ST.acc);
    if(ST.w==='katana') trail(ox,oy);
    if(ST.w==='katana'&&M.P.gr>=.5&&M.P.sf>.5){ const b=proj(J.sb,ox,oy,M.yaw), t=proj(J.st,ox,oy,M.yaw); fx.save(); fx.globalCompositeOperation='lighter'; fx.lineCap='round'; fx.strokeStyle='rgba(255,70,80,.35)'; fx.lineWidth=7; fx.beginPath(); fx.moveTo(b[0],b[1]); fx.lineTo(t[0],t[1]); fx.stroke(); fx.strokeStyle='rgba(255,255,255,.55)'; fx.lineWidth=1.6; fx.stroke(); fx.restore(); }
  } else figure(g,J,ox,oy,M.yaw,{P:M.P,eye:false}); }
// afterimages that act on their own: each waits in the draw stance where it was put, crosses to its mark in one cut, and fades
M.shades=[]; let READY=null; const SH=1.7;
function shade(o){ M.shades.push(Object.assign({t:0,wait:0,dur:.1,clip:'cutA',c:'#bcd0ff'},o)); }
function drawShades(){ if(!M.shades.length) return; if(!READY) READY=sample(CLIPS.iaiReady,.86,null); fx.save(); fx.globalCompositeOperation='lighter';
  for(const s of M.shades){ const t=s.t; if(t<s.wait){ fx.globalAlpha=Math.min(1,t/.14)*.7; fx.save(); fx.translate(s.x0,s.y0); fx.scale(SH,SH); figure(fx,solve(READY),0,0,s.yaw,{flat:s.c}); fx.restore(); continue; }
    const u=t-s.wait, k=Math.min(1,u/s.dur), e=EASE.out3(k), x=s.x0+(s.x1-s.x0)*e, y=s.y0+(s.y1-s.y0)*e, J=solve(sample(CLIPS[s.clip],u,null)), a=u<s.dur?.95:.95*Math.max(0,1-(u-s.dur)/.3);
    if(k<1) for(let i=1;i<=3;i++){ const b=Math.max(0,e-i*.14); fx.globalAlpha=a*.3*(1-i/4); fx.save(); fx.translate(s.x0+(s.x1-s.x0)*b,s.y0+(s.y1-s.y0)*b); fx.scale(SH,SH); figure(fx,J,0,0,s.yaw,{flat:s.c}); fx.restore(); }
    fx.globalAlpha=a; fx.save(); fx.translate(x,y); fx.scale(SH,SH); figure(fx,J,0,0,s.yaw,{flat:s.c}); fx.restore(); }
  fx.restore(); }
function ghost(o={}){ if(!M.J) return; const [ox,oy]=origin(); M.ghosts.push({J:M.J,x:o.x??ox,y:o.y??oy,yaw:M.yaw,t:0,life:o.life||.28,c:o.c||'#ff3038',a:o.a||.8}); }

// ------------------------------------------------------------------ hooks
const upd0=update; update=function(rdt){ const dt=hitstop>0?0:rdt*timeScale; upd0(rdt); tick(dt,rdt); };
const dpb0=drawPlayerBody; drawPlayerBody=function(g){ if(on()){ draw(g); return; } dpb0(g); };
// the hero over every effect, edged in his colour (the effect layer is composited by now)
function over(){ if(!M.J) return; const [ox,oy]=origin(), J=M.J, o=2.2/(S*cam.z); ctx.save();
  if(lock){ /* under the brightest effects he keeps a dark ground of his own */ const cy=oy-.3*SC, gr=ctx.createRadialGradient(ox,cy,SC*.1,ox,cy,SC*.62); gr.addColorStop(0,'rgba(6,3,10,.5)'); gr.addColorStop(1,'rgba(6,3,10,0)'); ctx.fillStyle=gr; ctx.beginPath(); ctx.ellipse(ox,cy,SC*.62,SC*.62,0,0,7); ctx.fill(); }
  ctx.globalAlpha=.9;
  for(const [dx,dy] of [[o,0],[-o,0],[0,o],[0,-o],[o*.7,o*.7],[-o*.7,o*.7],[o*.7,-o*.7],[-o*.7,-o*.7]]) figure(ctx,J,ox+dx,oy+dy,M.yaw,{flat:'#0c0612'});
  ctx.globalAlpha=1; if(M.scarf) ribbon(ctx,M.scarf,ST.scarf[0],ST.scarf[1],ST.acc); figure(ctx,J,ox,oy,M.yaw,{L:lightOf(ox,oy),P:M.P,eye:false}); if(M.hair) ribbon(ctx,M.hair,4.5,1.2,'#14121c'); ctx.restore(); }
// the old skeleton's own drawing (body, scarf, weapon light) is skipped: he is hidden for that call and drawn here instead
const dp0=drawPlayer; drawPlayer=function(){ if(!on()) return dp0(); const v=pl.visible; pl.visible=false; dp0(); pl.visible=v; drawShades(); if(v&&pl.gy!=null) draw(ctx); };
// outside the ultimates the painted sequences still drive the timing; each one becomes a cut of the mannequin toward the nearest enemy
const ATK={gs:'cutA',gm:'cutC',gu:'cutD',gk:'cutA',gt:'cutB',gp:'cutC',gc:'cutA',gw:'raise'}; let atkN=0;
const ATKC={mage:{gb:['mCast1','mCast3','mCast2'],gx:'mChanA',gy:'mChanB'},fist:{gb:['fJab','fCross','fUpper'],gx:'fChanA',gy:'fChanB'},shaman:{gb:['sSeal','sRing','sSweep'],gx:'sChanA',gy:'sChanB'},pyro:{gb:['pThrow','pPush','pSweep'],gx:'pChanA',gy:'pChanB'}};
const seq0=plSeq; plSeq=function(steps){ seq0(steps); if(!on()||!steps.length) return; const k=String(steps[0][0]).replace(/\d+$/,''); let c;
  if(pl.cls!=='sword'){ const m=ATKC[pl.cls]; c=m&&m[k]; if(!c) return; if(Array.isArray(c)) c=c[atkN++%c.length]; else if(M.name===c&&M.t<8) return; const e=X.nearest(1400); let yaw=pl.f>0?0:PI; if(e){ const a=X.angTo(e); yaw=Math.atan2(sin(a)/FSY,cos(a)); } play(c,{yaw,blend:.07}); return; }
  if(lock) return; c=ATK[k]; if(!c) return;
  if(k==='gs') c=['cutA','cutB','cutD'][atkN++%3]; const e=X.nearest(900); let yaw=pl.f>0?0:PI; if(e){ const a=X.angTo(e); yaw=Math.atan2(sin(a)/FSY,cos(a)); } play(c,{yaw,blend:.05}); };
// during an ultimate the effect meshes are composited over the whole 2D scene, so he is drawn once more on the overlay canvas,
// through the same camera and the same tilt as the final pass: a dark ground of his own, a dark edge, then the figure
function overTop(){ if(!M.J) return; const [ox,oy]=origin(), J=M.J, g=tctx, z=S*cam.z, cr=Math.cos(cam.rot), sr=Math.sin(cam.rot);
  const wx=(ox-cam.x+cam.sx)*z, wy=(oy-cam.y+cam.sy)*z, spx=W/2+wx*cr-wy*sr, spy=H/2+wx*sr+wy*cr, t=(typeof post!=='undefined'&&post.tilt)||0; let px=spx, py=spy, k=1;
  if(t>.001){ const sx=spx/W, sy=1-spy/H, A=sy-.5-.06*(1-t), uy=(A*(1+t)+.56*(1-t))/((1-t)+2*t*A), tm=(1+t*(1-2*uy))/(1-t); px=(.5+(sx-.5)*tm)*W; py=(1-uy)*H; k=tm; }
  g.save(); g.setTransform(1,0,0,1,0,0); g.translate(px,py); g.scale(k,k); g.translate(-spx,-spy); g.translate(W/2,H/2); g.rotate(cam.rot); g.scale(z,z); g.translate(-cam.x+cam.sx,-cam.y+cam.sy);
  const o=1.5/z; g.globalAlpha=.6; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) figure(g,J,ox+dx*o,oy+dy*o,M.yaw,{flat:'#0a0410'}); g.globalAlpha=.78;
  if(M.scarf) ribbon(g,M.scarf,ST.scarf[0],ST.scarf[1],ST.acc); figure(g,J,ox,oy,M.yaw,{L:lightOf(ox,oy),P:M.P,eye:false}); if(M.hair) ribbon(g,M.hair,4.5,1.2,'#14121c'); g.restore(); }
const rend0=render; render=function(){ rend0(); if(on()&&lock&&pl.visible&&pl.gy!=null) overTop(); };
const hud0=drawHUD; drawHUD=function(){ if(on()&&pl.visible&&pl.gy!=null){ applyCam(ctx); over(); } hud0(); };
window.MK={STY,setCls,on,play,ghost,shade,wpt,M,CLIPS,compile,dir,SC,sample,solve,figure,DEF,free(){ M.loco=true; }};
})();

// 참광 - ZERO SLASH for the mannequin (stickman option). Built around what the body does:
// he sinks and waits; the draw is seen (time slows for it) and the cut leaves the blade as a wave; four dashes, each a line he
// actually crosses, each leaving its cut hanging in the air; he walks none of it back - the blade goes home slowly, and on the click
// every cut he left opens at once.
'use strict';
(()=>{
const G=RPG, X=G.sv, A=X.A, FSY=X.FSY, BODY=X.BODY, PI=Math.PI;
// slower, heavier sheathing than the short one: the weight goes to the back leg, the head sinks with the blade, a stop, then the click
MK.CLIPS.notoS=MK.compile({keys:[
  [0,{gr:1,sf:1,sh:0,lw:[1,0,0],sp:0,tr:0,kr:.25,kl:.3,hip:[.04,0,.38],hy:-.2,cy:.8,lean:.3,side:0,fr:[.22,.1,0],fl:[-.22,-.09,0],hr:[.16,.29,-.08],sw:MK.dir(.75,.05),hd:-.5,hp:.06},'lin'],
  [.09,{hr:[.24,.24,-.24],sw:MK.dir(.5,-.95),tr:.8,hip:[.03,0,.44],cy:.5,lean:.16},'out5'],
  [.16,{tr:0},'lin'],
  [.36,{sf:0,sh:0,sp:.08,cy:-.05,hy:-.36,lean:.1,hd:.36,hp:.1,hip:[-.04,0,.485],fr:[.13,.1,0],fl:[-.16,-.09,0]},'io5'],
  [.66,{sh:.88,sp:.04,hp:.34,lean:.2,hip:[-.05,0,.42],cy:-.12,kl:.6},'io'],
  [.72,{sh:.88},'lin'],
  [.75,{sh:1,sp:0,hp:.44,hip:[-.05,0,.405]},'in'],
  [1.2,{hip:[-.05,0,.41]},'io'] ]});
// the coil before a dash: two frames of sinking and winding toward the line he is about to cross
MK.CLIPS.coil=MK.compile({keys:[ [.06,{gr:1,sf:1,sh:0,lw:[0,1,0],hip:[-.06,0,.31],hy:-.25,cy:-.55,lean:.52,fr:[.16,.1,0],fl:[-.2,-.09,0],hr:[.04,-.08,-.2],sw:MK.dir(-2.5,.12),hd:.75,hp:.0,tr:0,kr:.3,kl:.5},'out'] ]});
// he stands out of it: the hand leaves the hilt last
MK.CLIPS.stand=MK.compile({keys:[ [.5,{hip:[-.02,0,.49],hp:.1,lean:.08,cy:.1,hy:-.25},'io'], [.95,MK.DEF,'io'] ]});

function wave(x,y,z,o){ const F=FX3; if(!F.on) return; const K=K3, m=K.mats(), P=K.pal(o.pal), tex=o.tex&&F.ready(o.tex)?o.tex:'fx3_slash', A=K.ART[tex], asp=A.asp, C={cA:P.d,cB:P.b,cC:P.h,cM:P.m}, dir=o.dir, ccw=o.ccw?1:-1, dur=o.dur||.45, g=o.gain||1, sd=Math.random()*9;
  const mt=F.mat({...m.art,tex,layer:'o',nz:'wisp',n1:[1.5,1.5,.4*ccw,.1],n2:[1.2,1.2,.2,.1],dist:.03,mdist:1,rk:A.rk});
  GFX.add(dur,(k,t)=>{ const u=Math.min(1,t/dur), e=1-Math.pow(1-u,2.4), reach=o.r0+(o.r1-o.r0)*e, s=reach/((A.piv[0]-A.edge)*2*asp), d=(o.travel||0)*e, px=x+Math.cos(dir)*d, py=y+Math.sin(dir)*d*FSY, hk=K.eo5(K.sat(t/.05)), f=K.sat((u-.4)/.6);
    const cx=px+Math.cos(dir)*s*asp*(A.piv[0]-.5)*2, cy=py+Math.sin(dir)*s*asp*(A.piv[0]-.5)*2*FSY, aw=[A.piv[0],A.piv[1],ccw>0?.8:-.8,ccw], aw2=[.06+hk*.8,f*.62,.22,1];
    F.quad(mt,cx,cy,s*asp,s,0,{z,M:F.xfw({sx:s*asp,sy:s,rx:-(o.lean??.3),ry:o.roll||0,rz:dir+PI}),...C,a:1-f*f,gain:3*g*(1-.45*f),bgain:1.1,ero:.1+f*.42,nk:.18+f*.3,aw,aw2,t0:sd}); },o.delay||0); }
// a wall of fire with body: the line wanders, three sheets stand at different depths and heights (the foot of each fades into the
// floor instead of ending on a ruled line), flames of their own stand along the foot, and it goes out by burning away, not by shrinking
const RT_={fire:'v3_real_fire',wall:'v3_real_curtain',blast:'v3_flip_realblast',pillar:'v3_real_pillar',smoke:'v3_flip_realsmoke',burst:'v3_flip_realburst'};
const realOK=k=>!!(window.FX3&&FX3.on&&FX3.ready(RT_[k])), TX=(k,old)=>realOK(k)?RT_[k]:old;
if(window.FX3&&FX3.on){ FX3.img(RT_.fire); FX3.img(RT_.wall,{repeat:true}); FX3.img(RT_.blast); FX3.img(RT_.pillar); FX3.img(RT_.smoke); FX3.img(RT_.burst); }
// a fire standing on the floor (the kit's own uses the painted flame)
function flame(x,y,o){ const h={x,y,s:o.s||260,a:1,dead:false}, F=FX3; if(!F.on) return h; const K=K3, m=K.mats(), P=K.pal(o.pal), C={cA:P.d,cB:P.b,cC:P.h,cM:P.m}, dur=o.dur||1.2, g=o.gain||1, sd=Math.random()*9, flip=Math.random()<.5, tex=TX('fire','fx3_fire');
  const mt=m['lf_'+tex]||(m['lf_'+tex]=F.mat({...m.art,tex,layer:'o',nz:'billow',n1:[1.2,1,0,-1.1],n2:[1.3,1,.05,-1],dist:.07,mdist:1,rk:[.5,1.05]}));
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const i=K.sat(t/.12), f=K.sat((k-.6)/.4), ss=h.s*(.6+.4*K.eo3(i));
    F.quad(m.glowG,h.x,h.y,ss*.9,ss*.9,0,{...C,a:.8*(1-f)*h.a,gain:1.3});
    F.bill(mt,h.x,h.y,ss*.92,ss*.6,ss,0,{...C,a:(1-f*f)*h.a,gain:3*g,ero:.08+f*.6,nk:.3+f*.5,t0:sd,pm:[4,.5,.004,0],uvT:flip?[-1,1,1,0]:[1,1,0,0]}); },o.delay||0);
  GFX.light(x,y,(o.s||260)*3,P.l,.9,dur*.8,{z:100}); return h; }
// a column of fire from photographs: two sheets of the same jet at different widths and phases, a hot foot, a light of its own
function column(x,y,o){ const F=FX3; if(!F.on) return; if(!realOK('pillar')) return K3.pillar(x,y,o); const K=K3, m=K.mats(), P=K.pal(o.pal), C={cA:P.d,cB:P.b,cC:P.h,cM:P.m}, h=o.h||1400, r=o.r||100, dur=o.dur||.8, hold=o.hold??dur*.35, rise=o.rise??.07, g=o.gain||1, sd=Math.random()*9;
  const mt=m.colR||(m.colR=F.mat({...m.art,tex:RT_.pillar,layer:'o',nz:'billow',n1:[1,1.6,0,-2.2],n2:[1.4,1.2,.04,-1.6],dist:.06,mdist:1,rk:[.45,1.05]}));
  GFX.add(dur,(k,t)=>{ const up=K.eo3(K.sat(t/rise)), f=K.sat((t-hold)/Math.max(.01,dur-hold)), a=1-f*f*f, H=h*up*(1+.15*f), w=r*2.4*(1-.25*f)*(1+.08*Math.sin(t*23+sd));
    F.quad(m.glowG,x,y,r*1.8,r*1.8,0,{...C,a:a*.22,gain:1});
    F.bill(mt,x-r*.15,y-3,H*.5,w*1.5,H*.5,0,{cA:P.d,cB:'#8e1e06',cC:P.m,cM:P.b,a:a*.9,gain:2.2*g,ero:.12+f*.5,nk:.35+f*.4,t0:sd+7,pm:[4,.5,.004,0],uvT:[-1,1,1,0]});
    F.bill(mt,x,y,H/2,w,H/2,0,{...C,cC:f>.3?P.m:P.h,a,gain:4.2*g*(1-.7*f),ero:.04+f*.6,nk:.3+f*.4,t0:sd,pm:[4,.5,.004,0],uvT:[1,1,0,0]});
    F.bill(mt,x+r*.2,y+2,H*.42,w*.7,H*.42,0,{...C,cC:f>.3?P.m:P.h,a:a*.8,gain:3.4*g*(1-.7*f),ero:.1+f*.6,nk:.3+f*.4,t0:sd+4,pm:[4,.5,.004,0],uvT:[-1,1,1,0]}); },o.delay||0);
  GFX.light(x,y,r*8,P.l,.8,dur*.8,{z:h*.3}); }
// an explosion in layers, each on its own clock: a flash, the ground blast with its crown of sparks and dirt, two smaller fireballs
// rolling out of it, smoke rising after, fast sparks and slow ones, thrown rock, a dust ring on the floor, the scorch it leaves
function boom(x,y,s,c){ const K=K3, R=(a,b)=>a+Math.random()*(b-a), P=c.P, HOT=c.HOT, EMB=c.EMB, d0=c.delay||0, at=(d,fn)=>after(d0+d,fn);
  at(0,()=>{ K.flare(x,y,s*.2,{pal:HOT,s:s*.55,dur:.08,gain:6}); K.flip(x,y,{tex:TX('burst','v3_flip_blast'),s:s,dur:1.05,pal:HOT,gain:1,lift:.5});
    K.sparks(x,y,30,{pal:HOT,n:26,sp:[700,2300],up:1300,life:[.25,.6]}); K.sparks(x,y,40,{pal:P,n:14,sp:[300,900],up:1700,life:[.7,1.3]});
    K.debris(x,y,{n:10,r:s*.4,sp:[300,1500],up:2100,size0:9,size:28}); K.dust(x,y,{n:16,r:s*.5,sp:[500,1500],a:.5});
    K.art(x,y,{tex:'v3_scorch',floor:true,s:s*.75,dur:3.2,hold:2,s0:.7,pal:EMB,gain:.36,rot:R(0,6.28)}); GFX.light(x,y,s*3.4,'#ffb060',.7,.4,{z:s,flick:.4}); });
  at(.05,()=>K.flip(x+R(-.3,.3)*s,y+R(-.1,.1)*s,{tex:TX('blast','v3_flip_blast'),s:s*R(.5,.65),dur:.8,pal:P,gain:.9,lift:.7}));
  at(.11,()=>K.flip(x+R(-.35,.35)*s,y+R(-.12,.12)*s,{tex:TX('blast','v3_flip_blast'),s:s*R(.4,.55),dur:.75,pal:HOT,gain:.9,lift:.9}));
  at(.3,()=>K.flip(x,y,{tex:TX('smoke','v3_flip_smoke'),s:s*1.15,dur:1.9,smoke:true,nb:1,a:.72,c:'#1a1614',c2:'#5e5048',lift:.7,rise:180})); }
function fireWall(pts0,o){ const F=FX3; if(!F.on) return; const K=K3, m=K.mats(), P=K.pal(o.pal), C={cA:P.d,cB:P.b,cC:P.h,cM:P.m}, h=o.h||900, dur=o.dur||1.4, rise=o.rise??.1, g=o.gain||1, sd=Math.random()*9, ord=o.ord??0, R=(a,b)=>a+Math.random()*(b-a);
  const n0=pts0.length, pts=[], dx=pts0[n0-1].x-pts0[0].x, dy=(pts0[n0-1].y-pts0[0].y)/FSY, L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L, N=(n0-1)*2, hz=Math.abs(dx)/L, CB={cA:'#120002',cB:'#9a1206',cC:P.m||P.h,cM:P.b};
  for(let i=0;i<=N;i++){ const u=i/N*(n0-1), i0=Math.min(n0-2,Math.floor(u)), a=pts0[i0], b=pts0[i0+1], k=u-i0, w=(i===0||i===N)?0:R(-1,1)*(o.wander??55)*(1+1.6*hz), ha=a.h??h, hb=b.h??h;
    pts.push({x:a.x+(b.x-a.x)*k+nx*w,y:a.y+(b.y-a.y)*k+ny*w*FSY,h:(ha+(hb-ha)*k)*R(.6,1.15)}); }
  pts[0].h*=.4; pts[N].h*=.5;
  const sheet=(off,hm)=>pts.map(q=>({x:q.x+nx*off,y:q.y+ny*off*FSY,h:q.h*hm})), SB=sheet(-46-90*hz,1.12), SM=sheet(0,1), SF=sheet(44+80*hz,.55), ur=Math.max(.5,L/(h*1.9));
  const ft=TX('fire','fx3_fire'), wt=TX('wall','v3_curtain'), mt=m['wv_'+ft]||(m['wv_'+ft]=F.mat({...m.art,tex:ft,layer:'o',nz:'billow',n1:[1.2,1,0,-1.1],n2:[1.3,1,.05,-1],dist:.07,mdist:1,rk:[.5,1.05]}));
  const wB=m['wb_'+wt]||(m['wb_'+wt]=F.mat({...m.waB,tex:wt,texO:{repeat:true}})), wC=m['wc_'+wt]||(m['wc_'+wt]=F.mat({...m.waC,tex:wt,texO:{repeat:true}}));
  const lite=!!o.lite, nb=lite?7:F.low?3:Math.min(5,Math.max(3,Math.round(L/(h*.5)))), B=[];
  for(let i=0;i<nb;i++){ const u=(i+R(.15,.85))/nb, q=pts[Math.min(N,Math.round(u*N))], off=R(-30,70)*(1+1.5*hz); B.push({x:q.x+nx*off+R(-30,30),y:q.y+ny*off*FSY,s:h*R(.26,.5),ph:R(0,9),fl:Math.random()<.5,d:R(0,.12)}); }
  GFX.add(dur,(k,t)=>{ const up=K.eo3(K.sat(t/rise)), f=K.sat((k-(o.f0??.4))/(1-(o.f0??.4))), a=1-Math.pow(K.sat((k-(o.a0??.5))/(1-(o.a0??.5))),1.3), sink=1+.3*f, gk=1-.6*f;
    const lift=(S,j,hm)=>S.map((q,i)=>({x:q.x,y:q.y,h:q.h*up*sink*hm*(1+.1*Math.sin(t*(9+i%3)+i*1.7+sd+j))}));
    if(!F.low) F.quad(m.glowG,(pts[0].x+pts[N].x)/2,(pts[0].y+pts[N].y)/2,L*.62,Math.max(90,h*.3),Math.atan2(dy,dx),{...C,a:a*.85,gain:1.5,bgain:.9});
    if(!F.low&&!lite) F.wall(m.waS,lift(SB,0,1.15),{a:a*.9,ero:.1+f*.5,uvT:[ur*.8,1,sd+.5,0],t0:sd,ord:ord-.3,fd:[.12,.12,.1,.45]});
    if(!lite) F.wall(wB,lift(SB,1,1),{...CB,a:a*.85,gain:2*g*gk,ero:.16+f*.34,uvT:[ur*.9,1,sd+.2,0],t0:sd,ord:ord-.1,fd:[.14,.14,.3,.4]});
    F.wall(wB,lift(SM,2,1),{...C,a,gain:2.4*g*gk,ero:.12+f*.36,uvT:[ur,1,sd,0],t0:sd+3,ord,fd:[.14,.14,.18+.3*f,.4]});
    F.wall(wC,lift(SF,3,1),{...C,a,gain:2.6*g*gk,ero:.25+f*.3,uvT:[ur*1.3,1,sd+.37,0],t0:sd,ord:ord+.1,fd:[.16,.16,.2+.3*f,.5]});
    for(const b of B){ const i=K.sat((t-b.d)/.14); if(i<=0) continue; const ss=b.s*(.55+.45*K.eo3(i))*(1+.12*Math.sin(t*11+b.ph))*(1-.3*f);
      F.bill(mt,b.x,b.y,ss*.9,ss*.6,ss,0,{...C,a:a*(1-f*.5),gain:2.8*g*gk,ero:.1+f*.34,nk:.35+f*.5,t0:sd+b.ph,pm:[4,.5,.004,0],uvT:b.fl?[-1,1,1,0]:[1,1,0,0]}); }
    if(k<.6&&Math.random()<.8){ const q=pts[1+Math.floor(Math.random()*(N-1))]; GFX.pt({x:q.x+R(-60,60),y:q.y,z:q.h*up*R(.5,.95),vz:R(300,800),vx:R(-60,60),g:-200,drag:.6,life:R(.35,.7),s:R(22,50),m:5,b:'add',c:GFX.rgb(P.b),c2:P.d,c3:P.m||P.h,er:1,ns:R(1,1.6),w:1.6,a:.9,L:1}); } },o.delay||0); }
MK.ultZero=function(id){ const {V,view,ultStart,ultStop,inLine,hitFx,onScreen}=X; ultStart(id);
  const Cn=X.cine, K=K3, mk=MK, D=80000*A.mul(id), x0=pl.x, y0=pl.gy, VV=view(), hh=VV.hh, hwR=VV.hw, hw=Math.min(hwR,hh*1.15), hy=y0-BODY*.55, f0=pl.f, yaw0=f0>0?0:PI;
  // fire body, its hot core, the darker red the walls burn in, what the floor keeps, the cold light of the blade
  const P={d:'#160300',b:'#d23a0c',m:'#ffa838',h:'#fff2c8',l:'#ff5a1e',s:'#ffd9a0'}, HOT={d:'#2a0900',b:'#ff7e16',m:'#ffd070',h:'#ffffff',l:'#ff9a50',s:'#ffe6b8'},
    WALLP={d:'#0a0100',b:'#8e1e06',m:'#dc5e16',h:'#ffb860',l:'#d8400e',s:'#ff9a60'}, EMB={d:'#0a0100',b:'#7a1c08',m:'#d85a22',h:'#ffd8a8',l:'#b83410',s:'#ff9a70'},
    STEEL={d:'#04060e',b:'#5f78c0',m:'#b8ccff',h:'#f4f8ff',l:'#9ab4ff',s:'#d0dcff'}, EDGE={d:'#2a0900',b:'#ffb040',m:'#fff0c0',h:'#ffffff',l:'#ffd090',s:'#fff0d0'};
  const PALE={d:'#08080e',b:'#b8bcd0',m:'#eef0ff',h:'#ffffff',l:'#dfe4ff',s:'#ffffff'}, lanes=[], DEG=PI/180, SMK={smoke:true,nb:1,a:.85,c:'#201814',c2:'#a07c5c'}, CRIM={d:'#080000',b:'#7a1404',m:'#c23c0c',h:'#ff8a3a',l:'#b82a08',s:'#ff7a40'};
  // a lane: the line a cut throws from him to the edge of the field; every lane reaches about as far on the screen whichever way it runs
  const mkLane=(th,ccw)=>{ const c=Math.cos(th), sn=Math.sin(th), ux=c, uy=sn*FSY, reach=hwR*1.25+(hh-hwR)*.8*Math.abs(sn); return {th,ux,uy,ccw,len:reach/Math.hypot(c,sn*FSY),pt:q=>[x0+ux*q,y0+uy*q]}; };
  // ---- omen: the air leans in, the floor under him heats, a pale column of light narrows into the scabbard
  mk.play('iaiReady',{yaw:yaw0,speed:1.65});
  GFX.ambient(.42,.5,.62,3.5); const spot=GFX.light(x0,y0-60,520,'#d8e4ff',.7,.6,{hold:9,z:200});
  Cn.zoom(2.2); Cn.roll(-.04); Cn.cam(x0,hy,4.5); Cn.tilt(.1,1.5); duck(.3,.7); SFX.heart(1); after(.5,()=>SFX.heart(.9)); Cn.SND.inhale(1.15,.5);
  K.art(x0,y0,{tex:'v3_scorch',floor:true,s:hw*.34,dur:1.5,hold:.9,s0:.5,pal:EMB,gain:.7});
  after(.06,()=>K.pillar(x0,y0,{r:44,h:hh*1.2,dur:.7,hold:.4,pal:PALE,gain:.3,rise:.24})); after(.26,()=>K.pillar(x0,y0,{r:24,h:hh*1.8,dur:.58,hold:.34,pal:PALE,gain:.42,rise:.16})); after(.42,()=>K.pillar(x0,y0,{r:10,h:hh*2.4,dur:.56,hold:.4,pal:PALE,gain:.8,rise:.1}));
  for(let i=0;i<2;i++) after(.1+i*.3,()=>{ post.ca=.003+i*.002; });
  for(let i=0;i<30;i++) after(rand(0,.7),()=>{ const a=rand(0,TAU), d=rand(380,900); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,420),tx:x0-f0*20,ty:y0,tz:BODY*.5,pull:rand(4.5,7),life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,c:GFX.rgb(Math.random()<.5?'#ffffff':'#c8d8ff'),c2:'#8aa0d8',L:3}); });
  // ---- what a cut throws along one lane: fire that runs from the blade to the edge of the field, and keeps burning where it ran
  const throwLane=(L,g)=>{ lanes.push(L); const LEN=L.len;
    { const tp_=mk.wpt('st'), e1=L.pt(LEN*.34); K.trail([0,.25,.5,.75,1].map(u=>({x:tp_[0]+(e1[0]-tp_[0])*u,y:tp_[1]+(e1[1]-tp_[1])*u,z:tp_[2]*(1-u)+BODY*.3*u})),{w:30,dur:.22,draw:.05,pal:EDGE,gain:1.2}); }
    const N=Math.max(6,Math.min(11,Math.round(LEN/(hw*.24)))); for(let i=1;i<=N;i++){ const q=BODY*2.6+(LEN*.94-BODY*2.6)*(i-1)/(N-1), [qx,qy]=L.pt(q), [px,py]=L.pt(Math.max(0,q-LEN/N)), d=.01+i*.036, sz=hw*rand(.24,.3)*(1+.04*i)*g;
      after(d,()=>{ K.flip(qx+rand(-24,24),qy+rand(-14,14),{tex:TX('blast','v3_flip_blast'),s:sz*.9,dur:rand(.7,.9),pal:P,gain:.7,lift:.55});
        if(i%2){ K.debris(qx,qy,{n:5,r:70,sp:[300,1100],up:1600,size0:8,size:26}); K.dust(qx,qy,{n:5,r:60,sp:[300,800],a:.4}); } else K.sparks(qx,qy,40,{pal:HOT,n:12,sp:[500,1700],up:900,life:[.3,.7]});
        if(i===3||i===N) K.flip(qx,qy,Object.assign({tex:TX('smoke','v3_flip_smoke'),s:sz*1.5,dur:1.8,delay:.25,lift:.7,rise:170},SMK));
        GFX.light(qx,qy,hw*.5,'#ff5a20',.7,.3,{z:160}); let n=0;
        inLine(px,py,qx,qy,130,e=>{ if(e.zl===L) return; e.zl=L; e.flash=1; e.stun=Math.max(e.stun,5); if(n++<3){ hitFx(e,'#ffffff',1.4); K.flip(e.x,e.y,{tex:TX('blast','v3_flip_blast'),s:rand(200,260),dur:.6,pal:HOT,gain:1,lift:.6}); flame(e.x,e.y,{s:rand(110,150),dur:1,pal:P,gain:.9}); } const sd=((e.x-qx)*-L.uy+(e.y-qy)*L.ux)>=0?1:-1; e.kx+=L.ux*rand(200,380)-L.uy*sd*rand(140,300); e.ky+=L.uy*rand(200,380)+L.ux*sd*rand(80,180); if(!e.d.heavy) e.vz=Math.max(e.vz,rand(1300,2000)); X.dmg(e,D*.02,{crit:true}); }); }); }
    const a=L.pt(26), b=L.pt(LEN*.96); after(.08,()=>K.gash(a[0],a[1],b[0],b[1],{w:140,life:6,pal:EMB,gain:.65,grow:.35}));
    // it burns low along its whole length until the click, with two taller fires standing in it
    { const lp=[]; for(let i=0;i<=5;i++){ const [qx,qy]=L.pt(BODY*1.1+(LEN*.95-BODY*1.1)*i/5); lp.push({x:qx,y:qy,h:hh*rand(.2,.36)}); } after(.14,()=>fireWall(lp,{h:hh*.3,dur:(L.burn||2.4)+.22,pal:P,rise:.3,gain:1.25,lite:1,wander:26,f0:.93,a0:.94,ord:y0+L.uy*LEN*.5})); }
    L.fires=[]; for(const u of [rand(.3,.45),rand(.62,.8)]){ const [qx,qy]=L.pt(LEN*u); after(.34,()=>{ const fs=rand(170,280); L.fires.push(flame(qx+rand(-20,20),qy+rand(-12,12),{s:fs,dur:5,pal:Math.random()<.5?P:HOT,gain:.85})); }); } };
  // a cut throws three lanes, one after another in the direction the blade travels, no two alike
  const throwFan=(mid,g,burn)=>{ [-60,0,60].forEach((dg,k)=>after(k*.1,()=>{ const L=mkLane(mid+(dg+rand(-16,16))*DEG,false); L.len*=[.72,1.04,.86][k]*rand(.94,1.06); L.burn=burn-k*.08; throwLane(L,g*rand(.88,1.12)); Cn.shake(.5); })); };
  const arc=dir=>{ K.cres(x0,y0,BODY*.55,{reach:BODY*3.6,dir,lean:.2,roll:-.1*f0,tex:'fx3_slash',pal:EDGE,swing:.06,hold:.12,fade:.18,gain:1.5,sparks:0,light:0,ccw:false}); K.cres(x0,y0,BODY*.55,{reach:BODY*3.9,dir,lean:.2,roll:-.1*f0,tex:'v3_slash_thin',pal:EDGE,swing:.05,hold:.1,fade:.16,gain:1.6,sparks:0,light:0,ccw:false}); const t=mk.wpt('st'); K.flare(t[0],t[1],t[2],{pal:EDGE,s:120,dur:.09,gain:5}); GFX.light(x0,y0,hw*.7,'#fff0d0',.8,.16,{z:160}); };
  // ---- the draw (slow): the front half of the field
  const tD=.56, tC=tD+.12/.3;
  after(tD-.03,()=>{ const q=mk.wpt('sm'); K.flare(q[0],q[1],q[2],{pal:'silver',s:44,sx:4,sy:.35,dur:.14,gain:5}); Cn.SND.tick(1.4,.3); });
  after(tD,()=>{ mk.play('draw',{speed:.6}); timeScale=.3; slowHold=.6; Cn.zoom(2.5); });
  after(tC,()=>{ timeScale=1; slowHold=0; mk.M.speed=1; spot.hold=0; spot.life=.25; hitstop=Math.max(hitstop,.12); Cn.shake(1.3); post.ca=.007; Cn.zoom(1.4); Cn.cam(x0+f0*hw*.2,y0-hh*.04,5); Cn.roll(.035); Cn.tilt(.2,5); after(.22,()=>Cn.zoom(1.05));
    arc(yaw0); throwFan(yaw0,1,2.2); K.embers(x0+f0*hw*.4,y0,hw*.6,{pal:HOT,n:30,life:1.4,s:1.3}); const t=mk.wpt('st'); K.sparks(t[0],t[1],t[2],{pal:HOT,n:30,sp:[500,1900],up:400,dir:yaw0,spread:1.6}); K.dust(x0,y0,{n:10,r:60,sp:[300,900],dir:yaw0+PI,spread:1.2});
    GFX.ripple(x0,y0,hw*1.3,{life:.4,s:.25}); SFX.slash(.8,1.2); Cn.SND.shing(.8,.7); SFX.whoosh(.7,1); SFX.boom(1,.7); });
  // ---- the turn: he spins through the half behind him
  const t2=tC+.6, back=yaw0+PI;
  after(t2-.1,()=>mk.play('coil',{yaw:yaw0+PI*.5}));
  after(t2,()=>mk.play('cutD',{yaw:back-.2}));
  after(t2+.05,()=>{ hitstop=Math.max(hitstop,.11); Cn.shake(1.5); post.ca=.008; Cn.roll(-.04); Cn.zoom(.95); Cn.cam(x0,y0-hh*.04,5);
    arc(back); throwFan(back,.8,1.5); K.embers(x0-f0*hw*.4,y0,hw*.6,{pal:HOT,n:30,life:1.4,s:1.3}); const t=mk.wpt('st'); K.sparks(t[0],t[1],t[2],{pal:HOT,n:30,sp:[500,1900],up:500,dir:back,spread:1.6}); K.dust(x0,y0,{n:8,r:60,sp:[300,900],spread:3});
    SFX.slash(1,1.2); Cn.SND.shing(1,.7); SFX.boom(1.1,.8); });
  // ---- the blade goes home in the middle of six burning lanes
  const tN=t2+.5, tK=tN+.75;
  after(tN,()=>{ mk.play('notoS',{yaw:yaw0,blend:.12}); Cn.zoom(1.5); Cn.roll(.03); Cn.cam(x0,hy,4); Cn.tilt(.26,2.2); GFX.ambient(.4,.42,.52,6); duck(.16,.75); SFX.whoosh(1.4,.5); });
  [.2,.42,.6].forEach((d,j)=>after(tN+d,()=>{ SFX.heart(.7+j*.08); Cn.zoom(1.55+j*.1); for(const L of lanes){ for(const f of L.fires||[]) f.s*=1.12; const [qx,qy]=L.pt(L.len*rand(.3,.7)); K.embers(qx,qy,hw*.3,{pal:HOT,n:8,life:1.2,s:1.2}); } }));
  // the hush: the light drops, the fires sink, a glint runs to the guard
  after(tK-.22,()=>{ GFX.gain=.85; GFX.ambient(.16,.16,.22,18); for(const L of lanes) for(let i=0;i<6;i++){ const [qx,qy]=L.pt(L.len*rand(.2,.9)); GFX.pt({x:qx,y:qy,z:rand(20,160),tx:x0,ty:y0,tz:BODY*.5,pull:rand(5,8),life:rand(.22,.3),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb('#ffd090'),c2:'#ff5a14',L:3}); } const q=mk.wpt('sb'); K.flare(q[0],q[1],q[2],{pal:'silver',s:30,sx:4,sy:.4,dur:.22,gain:5}); Cn.zoom(2); });
  // ---- the click
  after(tK,()=>{ const q=mk.wpt('sm'); SFX.click(); Cn.SND.tick(.6,.3); K.flare(q[0],q[1],q[2],{pal:'silver',s:60,sx:5,sy:.3,dur:.2,gain:6}); hitstop=Math.max(hitstop,.13); GFX.gain=1.25; K.flare(q[0],q[1],q[2],{pal:EDGE,s:hw*.4,dur:.08,gain:6}); GFX.light(x0,y0,hw*1.6,'#fff0d0',1,.14,{z:200}); Cn.zoom(hwR>hh?.5:.66); Cn.cam(x0,y0-hh*(hwR>hh?.22:.1),7); Cn.tilt(.16,6); Cn.roll(-.03); GFX.ambient(.46,.4,.42,30); });
  after(tK+.06,()=>{ Cn.shake(1.9); post.ca=.008; SFX.shatter(1); SFX.boom(1.6,1); Cn.SND.hit(1);
    // every lane goes up at once, from him outward: the same fire that ran it the first time, bigger and hotter, with rock and sparks thrown off it
    lanes.forEach((L,li)=>{ for(const f of L.fires||[]) f.dead=true; const LEN=L.len;
      { const a=L.pt(BODY*1.2), b=L.pt(LEN*.95); K.trail([0,.2,.4,.6,.8,1].map(u=>({x:a[0]+(b[0]-a[0])*u,y:a[1]+(b[1]-a[1])*u,z:40})),{w:80,dur:.16,draw:.02,pal:EDGE,gain:1.6}); }
      const N=Math.max(5,Math.min(9,Math.round(LEN/(hw*.3)))); for(let i=1;i<=N;i++){ const q=BODY*2+(LEN*.95-BODY*2)*(i-1)/(N-1), [qx,qy]=L.pt(q), sz=hw*rand(.34,.44)*(1+.05*i);
        after(.03+i*.022,()=>{ K.flip(qx+rand(-20,20),qy+rand(-12,12),{tex:TX(i%2?'burst':'blast','v3_flip_blast'),s:sz,dur:rand(.85,1.05),pal:i%2?P:HOT,gain:.8,lift:.55});
          K.sparks(qx,qy,40,{pal:HOT,n:14,sp:[600,2100],up:1300,life:[.35,.9]}); if(i%2){ K.debris(qx,qy,{n:6,r:80,sp:[300,1300],up:2000,size0:9,size:28}); K.dust(qx,qy,{n:6,r:80,sp:[400,1200],a:.5}); }
          GFX.light(qx,qy,hw*.6,'#ffa040',.8,.34,{z:220}); }); }
      const pts=[]; for(let i=0;i<=6;i++){ const [qx,qy]=L.pt(210+(LEN*.96-210)*i/6); pts.push({x:qx,y:qy,h:hh*(.3+.2*Math.abs(Math.sin(i*1.7+li)))}); }
      after(.5,()=>fireWall(pts,{h:hh*.4,dur:1.1,pal:CRIM,rise:.2,gain:1.1,lite:1,ord:y0+L.uy*LEN*.5})); });
    // three columns, each in its own wedge and each the whole event: the jet, a head that rolls out at its top, the blast at its foot, smoke after
    for(let k=0;k<3;k++) after(.3+k*.28,()=>{ const LS=hwR>hh, B=mkLane(yaw0+((LS?[-28,180,28]:[30,150,270])[k]+rand(-8,8))*DEG), [qx,qy]=B.pt(LS?(k===1?hwR*.6:hw*.95):Math.max(hw*.5,B.len*rand(.42,.56))), r=rand(190,240), H=hh*(LS?(k===0?.8:.95):rand(1.5,1.75));
      K.flip(qx,qy,Object.assign({tex:TX('smoke','v3_flip_smoke'),s:r*4.4,dur:2,lift:.75,rise:120},SMK));
      column(qx,qy,{r,h:H,dur:1.25,hold:.9,pal:HOT,gain:1.1,rise:.07}); for(let i=0;i<6;i++){ const a=i*TAU/6+rand(-.3,.3); K.dust(qx+Math.cos(a)*r*.6,qy+Math.sin(a)*r*.6*FSY,{n:5,r:40,sp:[500,1500],dir:a,spread:.5,a:.55}); } K.sparks(qx,qy,40,{pal:HOT,n:30,sp:[700,2400],up:1700,life:[.5,1.2]}); after(1.05,()=>K.flip(qx,qy,Object.assign({tex:TX('smoke','v3_flip_smoke'),s:r*5,dur:2.2,lift:.8,rise:140},SMK))); boom(qx,qy,hw*.5,{P,HOT,EMB});
      after(.1,()=>{ K.flip(qx,qy,Object.assign({tex:TX('smoke','v3_flip_smoke'),s:r*6,z:H*.8,dur:1.6,lift:.5,rise:100},SMK)); K.flip(qx,qy,{tex:TX('blast','v3_flip_blast'),s:r*5.6,z:H*.86,dur:1.1,pal:HOT,gain:1,lift:.5}); });
      for(const u of [.3,.6]) after(.75+u*.2,()=>K.flip(qx,qy,Object.assign({tex:TX('smoke','v3_flip_smoke'),s:r*3.6,z:H*u,dur:1.5,lift:.5,rise:160},SMK)));
      after(.4,()=>K.flip(qx,qy,Object.assign({tex:TX('smoke','v3_flip_smoke'),s:r*4,z:H*.9,dur:1.7,lift:.5,rise:160},SMK)));
      K.crack(qx,qy,{r:hw*rand(.4,.55),pal:EMB,life:2.6,grow:.3,gain:1,alt:k===1?1:0,rot:rand(0,TAU)}); hitstop=Math.max(hitstop,.04); Cn.shake(1.5); });
    post.ca=.014; GFX.ripple(x0,y0,hw*2.8,{life:.4,s:.35,w:.06}); for(let i=0;i<5;i++){ const a=rand(0,TAU), d=hw*rand(.3,.6); K.dust(x0+Math.cos(a)*d,y0+Math.sin(a)*d*FSY,{n:6,r:60,sp:[500,1500],dir:a,spread:.6,a:.5}); }
    let nb=0; for(const e of onScreen(260)){ e.flash=1; e.stun=Math.max(e.stun,1.2); if(nb++<14){ const dl=rand(0,.5); K.flip(e.x,e.y,{tex:TX('blast','v3_flip_blast'),s:rand(230,300),dur:.7,pal:HOT,gain:1,lift:.6,delay:dl}); after(dl,()=>flame(e.x,e.y,{s:rand(120,170),dur:1.1,pal:P,gain:.9})); } if(!e.d.heavy){ const a=Math.atan2(e.y-y0,e.x-x0); e.kx+=Math.cos(a)*rand(300,600); e.ky+=Math.sin(a)*rand(180,360); e.vz=Math.max(e.vz,rand(1400,2200)); } }
    after(.03,()=>Cn.sweep(x0,y0,D*1.5,{speed:9000,max:.1})); post.grayT=0; });
  // ---- afterglow: smoke stands over the burnt lanes, embers drift, the light goes slowly; he stands out of it
  const tA=tK+.06;
  after(tA+.45,()=>{ for(const L of lanes) for(const u of [rand(.4,.7)]){ const [qx,qy]=L.pt(L.len*u); K.flip(qx,qy,Object.assign({tex:TX('smoke','v3_flip_smoke'),s:rand(420,600),dur:rand(2.2,2.8),delay:u*.2,lift:.7,rise:150},SMK)); }
    for(const L of lanes){ const [qx,qy]=L.pt(L.len*.5); K.embers(qx,qy,hw*.4,{pal:HOT,n:12,life:2,s:1.3}); }
    GFX.ambient(.6,.54,.54,.7); GFX.light(x0,y0,hw*2,'#ff7a30',.3,2.2,{z:200}); Cn.zoom(.84); Cn.tilt(.14,1.6); });
  after(tA+.62,()=>{ const n=V.ultSum||0; if(n>0){ V.nums.push({x:x0,y:y0-BODY*3.1,t:-.2,txt:n>=1e6?Math.round(n/1e6)+'M':n>=1e3?Math.round(n/1e3)+'K':String(Math.round(n)),big:true}); V.ultSum=0; } });
  after(tA+.7,()=>mk.play('stand'));
  after(tA+1.3,()=>{ GFX.ambient(1,1,1,1.2); Cn.zoom(1); Cn.tilt(0,2.5); Cn.cam(null); });
  after(tA+1.6,()=>{ for(const e of V.en) e.zl=null; GFX.gain=1.25; ultStop(); mk.free(); }); };
})();

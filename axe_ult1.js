// BERSERKER ultimate 1 (ax_ult1) 신부강림 - the 40-second awakening of the reference video, inside the battlefield. Plan: _gen/v3/axe_plan.md
//  prepare  0 - .8   he lifts his axe; behind him a giant of smoke and fire condenses with a colossal axe (lit solid, white-hot edge) raised
//  chop    .8 - 1.6  the giant brings the axe down on a diagonal; its path stays as a thick band of real fire; it bites the floor (flash, shake)
//  runes  1.2 - 2.6  a golden rune circle runs out from him to past the screen edge; small shafts of light stand round it
//  walls  2.5 - 3.4  fire columns of different heights rise round the circle, white-gold light falls between them, everyone is thrown up
//  dragon 3.3 - 4.35 a dragon of fire (a head with horns and burning eyes, a long burning body, dark smoke behind it) circles him round the whole field
//  climax 4.35- 4.6  the field holds its breath; he cuts upward and a white-gold crescent runs out in every direction (peak, hitstop, shake, light, bass)
//  after  4.6 - 6.4  the whole floor burns and cools, the circle cools into a scorched ring, embers lift and ash comes down
'use strict';
(()=>{
const X=RPG.sv, FSY=X.FSY, {V,A,BODY,dmg,sfx,view,onScreen}=X;
const K=window.K3, F=window.FX3, VQ=window.VOL, PI=Math.PI, TAU=PI*2;
const sat=v=>Math.max(0,Math.min(1,v)), mix=(a,b,k)=>a+(b-a)*k, eo3=k=>1-(1-k)*(1-k)*(1-k), smo=k=>k*k*(3-2*k);
const h01=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); };
const rand=(a,b)=>a+Math.random()*(b-a);
// palette: a copy of sk_axe.js PAL (AxeKit only exists once sk_axe.js has run). Fire as a black body; gold only for the runes and the light from above
const PF={d:'#1a0602',b:'#8a1a06',m:'#ff5a14',h:'#fff4d8',l:'#ff6a1c',s:'#ffc24a'};
const PE={d:'#220200',b:'#d81204',m:'#ff6a14',h:'#ffd070',l:'#ff3410',s:'#ff9a50'};
const PG={d:'#2a1606',b:'#b8741e',m:'#ffd27a',h:'#fff6dc',l:'#ffae34',s:'#ffe6a0'};
// the hottest instants only: white-gold
const PW={d:'#5a2a04',b:'#ffb040',m:'#fff0c0',h:'#ffffff',l:'#ffe2a8',s:'#fff2cc'};
const SMK='#1a1614', SMK2='#5e5048';
const col=P=>({cA:P.d,cB:P.b,cM:P.m||P.b,cC:P.h});
const mk=(n,o)=>{ if(window.MK&&MK.on()) MK.play(n,o); };
const yawTo=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a));
const vok=()=>!!(VQ&&VQ.on&&K.vok&&K.vok());
const vol=(kind,x,y,z,o)=>{ if(vok()) VQ.add(kind,x,y,z,o); };
// true-depth vectors [x, depth, z]; world calls take the floor y = depth*FSY
const v3=(x,y,z)=>[x,y,z], add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], scl=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const nrm=a=>{ const l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; }, crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const lerp3=(a,b,k)=>[mix(a[0],b[0],k),mix(a[1],b[1],k),mix(a[2],b[2],k)];
// a lit solid whose model axes go to the world axes ax (width), ay (thickness), az (length); its model foot (z = -.3) is put at 'foot'
const solidAt=(kind,vi,foot,ax,ay,az,sx,sy,sz,o)=>{ const M=new Float32Array([ax[0]*sx,ax[1]*sx,ax[2]*sx,0, ay[0]*sy,ay[1]*sy,ay[2]*sy,0, az[0]*sz,az[1]*sz,az[2]*sz,0, 0,0,0,1]), org=add(foot,scl(az,.3*sz));
  return F.solid(kind,vi,org[0],org[1]*FSY,org[2],{M,...o}); };
// a stream of volume fire between two true-depth points (mouth a, far end b)
const jetSeg=(a,b,r0,r1,o)=>{ const dx=b[0]-a[0], dY=b[1]-a[1], dz=b[2]-a[2], hl=Math.hypot(dx,dY), L=Math.hypot(hl,dz)||1, R=Math.max(r0,r1,1)*1.25;
  vol('jet',(a[0]+b[0])/2,(a[1]+b[1])/2*FSY,(a[2]+b[2])/2,{ex:L/2,ey:R,ez:R,yaw:Math.atan2(dY,dx),pitch:Math.atan2(dz,hl),pa:[r0/R,r1/R,o.freq||2.6,o.speed||5],pb:[o.heat??1.2,o.turb??.6,o.head??1.5,o.tail??-.3],
    dens:o.dens??10,gain:o.gain??1.5,seed:o.seed||1,smoke:o.smoke??.12,fire:.5,rim:o.rim||0,...col(o.pal||PF),cS:o.cS||(o.pal||PF).d,cK:o.cK||'#9a8676',band:o.band,btop:o.btop,lit:o.lit,flow:o.flow,ord:o.ord}); };

// ---------------------------------------------------------------- the colossal axe
// P pivot (the giant's hands), d haft direction (toward the head), n the way the edge faces. o: {L haft length, R blade reach, ero (0 whole .. 1 gone), heat (edge glow 0..1+), a}
function drawAxe(P,d,n,o){ if(!F.on||!(F.solids&&F.solids())) return; const L=o.L, Rb=o.R, b=nrm(crs(d,n)), ero=o.ero||0, ht=o.heat||0, a=o.a??1;
  const iron={alb:'#2a2422',emis:PF.m,rimC:'#ffb060',spec:.9,rim:.55,tone:.3,bump:1.2,ero,a};
  // the haft: a dark, iron-banded shaft from just behind the hands to the head
  const h0=add(P,scl(d,-.16*L)), HW=34;
  solidAt('slab',1,h0,n,b,d,HW/.3,HW/.1,L*1.14/1.3,{...iron,alb:'#2e211a',emis:PE.b,heat:.15*ht,rim:.3,spec:.35});
  // the head: three thick plates fanned from the neck out to the edge, each pointing its foot (where the heat sits) at the edge
  const hub=add(P,scl(d,L*.9)), w=.92;
  for(let i=0;i<3;i++){ const al=(i-1)*.46, u=nrm(add(scl(n,Math.cos(al)),scl(d,Math.sin(al)))), wv=nrm(add(scl(n,-Math.sin(al)),scl(d,Math.cos(al)))), E=add(hub,scl(u,Rb*(i===1?1.03:.95)));
    solidAt('slab',(i*2+1)%4,add(E,scl(u,8)),wv,b,scl(u,-1),Rb*.3/.3*w,22/.1,Rb*1.02/1.3,{...iron,alb:'#3e3634',heat:.25+.6*ht,vein:.15*ht}); }
  // the beak behind the haft
  solidAt('slab',2,add(hub,scl(n,-Rb*.5)),d,b,n,Rb*.12/.3,24/.1,Rb*.5/1.3,{...iron,heat:.2*ht});
  // the edge: a white-hot rim along the arc of the blade, its light on the floor
  const m=K.mats(), pts=[], C=col(ht>.7?PW:PF);
  for(let j=0;j<=10;j++){ const al=mix(-.78,.78,j/10), u=nrm(add(scl(n,Math.cos(al)),scl(d,Math.sin(al)))), E=add(hub,scl(u,Rb*(1.04-.08*Math.abs(al)))), wj=(10+16*Math.sin(PI*j/10))*(.5+.5*Math.min(1,ht));
    pts.push({x:E[0],y:E[1]*FSY,z:E[2],w:wj}); }
  if(ht>.05){ F.ribbon(m.trB,pts.map(p=>({...p,w:p.w*2.4})),{...C,a:Math.min(1,ht)*(1-ero)*a,gain:1.6}); F.ribbon(m.trC,pts,{...C,a:Math.min(1,ht)*(1-ero)*a,gain:2.2}); } }
// the edge's centre at the given pose (for trails, sparks and lights)
const edgeAt=(P,d,n,L,Rb)=>add(add(P,scl(d,L*.9)),scl(n,Rb*1.04));
// a fire left burning on the floor: a real flame painting through the fire ramp, its grain rising, flickering, burning down from the top
let FM=null; const fireMat=()=>FM||(FM=F.mat({...K.mats().art,tex:'v3_real_fire',layer:'o',nz:'billow',n1:[1,1.6,0,-2.2],n2:[1.4,1.2,.04,-1.6],dist:.07,mdist:1,rk:[.45,1.05]}));
const fireCard=(x,y,s,dur)=>{ if(!F.on) return; const mt=fireMat(), sd=rand(0,9), L=GFX.light(x,y,s*2.6,PF.l,.7,dur,{z:s*.5,flick:.3});
  GFX.add(dur,(k,t)=>{ const g=eo3(sat(t/.18)), f=sat((k-.45)/.55), fl=1+.06*Math.sin(t*23+sd)+.04*Math.sin(t*37+sd*2), hh=s*(.6+.4*g)*(1-.45*f)*fl;
    F.bill(mt,x,y,hh*.95,hh*.62,hh,0,{...col(f>.5?PE:PF),a:1-f*f,gain:2.4*(1-.4*f),ero:.1+.75*f,t0:sd}); L.a=.7*(1-f); }); };

function cast(id){ X.ultStart(id); if(F&&F.prepDeep) F.prepDeep(); const Cn=X.cine, {hw,hh}=view(), Dm=65000*A.mul(id), x0=pl.x, y0=pl.gy, Y0=y0/FSY, TE=6.4;
  const T_SW=.8, T_IMP=1.02, T_RUNE=1.18, T_WALL=2.5, T_DRA=3.25, T_DRE=4.3, T_PEAK=4.56;
  const st={dead:false};
  // ---- where things stand. The giant stands behind him and to the right; the axe lands at his right hand
  const G=v3(x0+1150,Y0-210,0), T=v3(x0+420,Y0+60,0), hz=nrm([T[0]-G[0],T[1]-G[1],0]), side=[-hz[1],hz[0],0], LH=950, RB=360, BETA=.66, GS=1.45;
  const e1=[hz[0]*Math.cos(BETA),hz[1]*Math.cos(BETA),-Math.sin(BETA)], e2=[hz[0]*Math.sin(BETA),hz[1]*Math.sin(BETA),Math.cos(BETA)];
  const PEND=add(sub(T,scl(e1,.9*LH)),scl(e2,RB*1.04)), PR=add(add(G,scl(hz,80)),[0,0,860]);
  // pose of the axe at time t: phi measured in the plane (e1, e2) from the strike direction; the pivot slides from raised to struck
  const pose=t=>{ let ph, pk;
    if(t<T_SW){ const k=sat(t/T_SW); ph=mix(2.3,2.85,smo(k)); pk=0; }
    else if(t<T_IMP){ const k=sat((t-T_SW)/(T_IMP-T_SW)), e=Math.pow(k,1.9); ph=mix(2.85,0,e); pk=smo(e); }
    else { const k=sat((t-T_IMP)/.12); ph=-.05*Math.sin(PI*k); pk=1; }
    const d=add(scl(e1,Math.cos(ph)),scl(e2,Math.sin(ph))), n=add(scl(e1,Math.sin(ph)),scl(e2,-Math.cos(ph))), P=lerp3(t<T_SW?add(PR,[0,0,-60*smo(sat(t/T_SW))]):add(PR,[0,0,-60]),PEND,pk);
    return {P,d,n,ph}; };

  // ---- 0: prepare
  mk('xRaise',{yaw:yawTo(0),blend:.08});
  GFX.ambient(.44,.38,.4,4); Cn.move({x:x0+120,y:y0-330,zoom:1.35,tilt:.04},.25,'out'); after(.2,()=>Cn.move({x:x0+580,y:y0-880,zoom:.78,tilt:.1,roll:-.02},.5,'io')); SFX.fire(2.6,.45); Cn.drone(40,.3); Cn.SND.inhale(.8,.4);
  K.flare(x0,y0,BODY*.9,{pal:PF,s:170,dur:.3,gain:2.2});
  // the light of the forming axe, following its head
  const LA=GFX.light(G[0],G[1]*FSY,900,PF.l,.2,.1,{z:1200,hold:T_IMP+.6});
  // embers and smoke drawn in to the giant while it condenses
  for(let i=0;i<26;i++){ const a=i*2.39996, r=700+300*h01(i*3.1), z=40+500*h01(i*5.7);
    GFX.pt({x:G[0]+Math.cos(a)*r,y:(G[1]+Math.sin(a)*r*.6)*FSY,z,oc:[G[0],G[1]*FSY,820],or:r,oa:a,ow:1.6,ok:r*1.5,oz0:z,rmin:60,life:.75,s:i%3?3:5,m:3,len:.05,c:GFX.rgb(i%4?PF.s:PG.h),c2:PF.b,c3:PF.m,L:3,pri:1}); }

  // ---- the giant: a figure of smoke with fire inside (torso, head, two arms reaching to the hands on the haft), the colossal axe the brightest thing
  let lastE=null, sT=0;
  GFX.add(T_IMP+1.4,(k,t)=>{ if(st.dead) return; const form=eo3(sat((t-.04)/.6)), gone=sat((t-T_IMP-.06)/.55), up=gone*gone*420, Q=pose(t), sd=3.3;
    const gx=G[0], gY=G[1], body=form*(1-gone), shL=add(G,add(scl(side,300),[0,0,960+up])), shR=add(G,add(scl(side,-300),[0,0,960+up])), hd=add(G,[0,0,1190+up]);
    // the lean of the body follows the swing: back while raised, thrown forward into the chop
    const lean=Q.ph<2.3?(2.3-Q.ph)/2.3:0, fw=scl(hz,180*lean), hot=1-gone, O=gY*FSY;
    if(body>.01){
      // chest (broad, burning from inside, its rim lit), waist narrowing into smoke, a skirt of smoke on the floor
      vol('blast',gx+fw[0]*.8,(gY+fw[1]*.8)*FSY,820+up,{ex:360,ey:240,ez:240,pa:[.8,.55,2.3,t*.35],pb:[1.3*hot,.85,1,.5],dens:11*body,band:.5,btop:.8,gain:1.35,seed:sd,smoke:.5,fire:.7,...col(PF),cS:SMK,cK:'#8a5a40',amb:.12,key:1.15,rim:.55,glow:.6,lit:.6,flow:.8,ord:O-40});
      vol('blast',gx+fw[0]*.4,(gY+fw[1]*.4)*FSY,500+up,{ex:240,ey:190,ez:290,pa:[.78,.6,2.4,t*.3],pb:[.9*hot,.85,1,.5],dens:10*body,band:.6,btop:.7,gain:1.2,seed:sd+1,smoke:.75,fire:.8,...col(PE),cS:SMK,cK:'#7a5040',amb:.12,key:1.1,rim:.45,glow:.3,lit:.6,flow:.8,ord:O-41});
      vol('blast',gx,O,200+up*.5,{ex:440,ey:330,ez:260,pa:[.75,.66,2.4,t*.35],pb:[.15,1,1,.6],dens:6*body,gain:1,seed:sd+2,smoke:1,fire:1,cS:SMK,cK:SMK2,amb:.2,key:1.1,rim:.3,glow:0,steps:20,ord:O-42});
      vol('blast',hd[0]+fw[0],(hd[1]+fw[1])*FSY,hd[2],{ex:165,ey:145,ez:175,pa:[.8,.5,2.6,t*.4],pb:[1.4*hot,.85,1,.5],dens:12*body,gain:1.4,seed:sd+5,smoke:.4,fire:.7,...col(PF),cS:SMK,cK:'#8a5a40',amb:.12,key:1.2,rim:.55,glow:.6,lit:.6,ord:O-20});
      // two arms of fire from the shoulders to the hands on the haft (upper arm, then forearm through a bent elbow)
      for(const s of [shL,shR]){ const s2=add(s,fw), mid=add(lerp3(s2,Q.P,.5),add(scl(side,s===shL?120:-120),[0,0,-90])); jetSeg(s2,mid,150,115,{pal:PF,heat:1*hot,turb:.85,smoke:.35,cS:SMK,cK:'#7a5040',dens:9*body,gain:1.25,speed:3,seed:sd+(s===shL?7:9),lit:.5,band:.4,ord:O-10}); jetSeg(mid,Q.P,115,85,{pal:PF,heat:1.1*hot,turb:.8,smoke:.3,cS:SMK,cK:'#7a5040',dens:9*body,gain:1.25,speed:3,seed:sd+(s===shL?8:10),lit:.5,ord:O-9}); }
      // two burning eyes
      const m=K.mats(), ey=add(hd,fw);
      for(const sg of [-1,1]){ const e=add(ey,add(scl(side,sg*55),add(scl(hz,90),[0,0,25]))); F.bill(m.glowO,e[0],e[1]*FSY,e[2],46*body,16*body,0,{...col(PW),a:body,gain:3.2}); }
      // flames licking up off the head and shoulders: the outline of the figure is fire
      for(const [b0,dx,len,r] of [[hd,0,460,120],[shL,-80,320,100],[shR,80,320,100]]){ const q=add(b0,fw); jetSeg(add(q,[0,0,40]),add(q,add(scl(side,dx),add(scl(hz,-80),[0,0,len]))),r*body,20*body,{pal:PF,heat:1.2*hot,turb:1.1,smoke:.3,dens:9*body,gain:1.3,speed:4,seed:sd+12+dx*.01,band:.6,btop:.7,flow:1}); }
      GFX.light(gx,O,1100,PF.l,.7*body,.04,{z:800}); }
    // the axe: condenses out of embers (dissolve runs backward), heats to white before the swing, bites the floor, then burns away
    const ero=t<T_IMP?1-eo3(sat((t-.08)/.5)):sat((t-T_IMP-.45)/.7), heat=t<T_IMP?sat((t-.25)/.55)*(.6+.6*sat((t-T_SW)/.2)):Math.max(0,1.2-1.6*sat((t-T_IMP)/.9));
    if(ero<1) drawAxe(Q.P,Q.d,Q.n,{L:LH,R:RB,ero,heat});
    const E=edgeAt(Q.P,Q.d,Q.n,LH,RB); LA.x=E[0]; LA.y=E[1]*FSY; LA.z=Math.max(80,E[2]); LA.a=.3+.9*heat*(1-ero); LA.r=600+500*heat;
    // sparks shed off the edge while it is hot and moving
    if(t>=T_SW-.05&&t<T_IMP&&lastE&&t-sT>.016){ sT=t; for(let i=0;i<3;i++){ const q=lerp3(lastE,E,Math.random()); GFX.pt({x:q[0],y:q[1]*FSY,z:q[2],vx:rand(-200,200),vy:rand(-80,80),vz:rand(-100,300),g:900,drag:1,life:rand(.25,.55),s:rand(3,6),m:3,len:.05,c:GFX.rgb(i?PF.s:PW.h),c2:PF.b,c3:'#ffffff',L:3}); } }
    lastE=E; });

  // ---- the swing's path: a broad smear of fire through the air while the axe passes, then a band of real fire along the arc that burns down to smoke
  const SW=[]; for(let i=0;i<=8;i++){ const tt=mix(T_SW+.03,T_IMP,i/8), Q=pose(tt); SW.push({E:edgeAt(Q.P,Q.d,Q.n,LH,RB),I:add(Q.P,scl(Q.d,LH*.78)),t:tt}); }
  after(T_SW,()=>{ sfx('whoosh',.6,.9); Cn.move({x:x0+400,y:y0-900,zoom:1,tilt:.12,roll:.02},T_IMP-T_SW+.05,'in'); });
  GFX.add(T_IMP-T_SW+.35,(k,t)=>{ if(st.dead||!F.on) return; const tt=T_SW+t, m=K.mats(), fade=sat((tt-T_IMP)/.3), pts=[], pts2=[];
    for(const s of SW){ if(s.t>tt) break; const mid=lerp3(s.I,s.E,.5), hw2=Math.hypot(s.E[0]-s.I[0],s.E[1]-s.I[1],s.E[2]-s.I[2])*.62; pts.push({x:mid[0],y:mid[1]*FSY,z:mid[2],w:hw2}); pts2.push({x:s.E[0],y:s.E[1]*FSY,z:s.E[2],w:34}); }
    if(pts.length>1){ F.ribbon(m.trB,pts,{...col(PF),a:.85*(1-fade),gain:1.4}); F.ribbon(m.trC,pts2,{...col(PW),a:1-fade,gain:2.2}); } },T_SW);
  // the band of real fire left along the arc
  after(T_IMP-.06,()=>{ const sd=11.3;
    GFX.add(1.25,(k,t)=>{ if(st.dead) return; const cool=sat(t/1.1), g=eo3(sat(t/.1));
      for(let i=1;i<SW.length-1;i+=2){ const a=lerp3(SW[i].I,SW[i].E,.6), b=lerp3(SW[i+2]?SW[i+2].I:SW[i+1].I,SW[i+2]?SW[i+2].E:SW[i+1].E,.6), rr=(70+18*i)*(1+.5*cool);
        jetSeg(a,b,rr*.8,rr,{pal:PF,heat:1.3*(1-cool*.85),turb:.7+.5*cool,smoke:mix(.12,.95,cool),cS:mix(0,1,cool)>.5?'#140e0c':PF.d,cK:'#5e5048',dens:9*(1-sat((t-.8)/.45)),gain:1.3*g,speed:3,seed:sd+i,rim:.3*cool,lit:.5,flow:.8,band:.4}); } }); });

  // ---- the blow lands
  after(T_IMP,()=>{ const ix=T[0], iy=T[1]*FSY;
    hitstop=Math.max(hitstop,.07); Cn.shake(1); Cn.SND.hit(.8); sfx('boom',1.6,.9); GFX.light(ix,iy,1300,PW.l,1.1,.35,{z:200});
    K.flare(ix,iy,60,{pal:PW,s:420,dur:.12,gain:2.6}); K.vblast(ix,iy,{s:360,pal:PF,dur:1.3,heat:1.1,rise:260,band:.5,lit:.6});
    K.vring(ix,iy,{r:900,r0:150,dur:.75,tube:.12,a:.7,c:'#2a2018',c2:'#8a6a50'});
    K.sparks(ix,iy,40,{pal:PG,n:26,sp:[500,1800],up:1500,life:[.3,.8]}); K.chunks(ix,iy,{n:5,r:160,sp:[300,900],up:1300,kind:'stone',s:[16,40],rock:'#3a302a',pal:PF,life:1.1});
    K.dust(ix,iy,{n:16,r:220,sp:[400,1200],a:.5});
    K.cool(ix,iy,{kind:'crack2',r:620,rot:Math.atan2(hz[1],hz[0]),pal:PF,life:3.2,hot:.8,light:0}); K.cool(ix,iy,{kind:'crater',r:280,pal:PF,life:3,light:0});
    for(const e of onScreen(300)){ const d=Math.hypot(e.x-ix,(e.y-iy)/FSY); if(d<900) after(d/4000,()=>{ if(e.dead) return; dmg(e,Dm*.05,{push:260,up:900,sx:ix,sy:iy}); }); } });
  after(T_SW+.02,()=>mk('xChop',{yaw:yawTo(0),blend:.05}));

  // ---- the rune circle: drawn out from his feet to past the screen edge, two rings turning against each other; small shafts of light stand on it.
  // It flares when the walls rise and goes out as the dragon comes (it is spent into it)
  const RC=hw*.9;
  after(T_RUNE,()=>{ mk('xPlant',{yaw:yawTo(0),blend:.1}); Cn.move({x:x0,y:y0-300,zoom:.95,tilt:.17,roll:.03},1,'io'); GFX.ambient(.5,.42,.38,2); SFX.rise(1.1,.4); Cn.SND.shing(.9,.35);
    st.sg1=K.sigil(x0,y0,{r:RC,dur:T_DRA+.25-T_RUNE,in:.75,out:.45,spin:.1,tex:'fx_circle_arcane',pal:PG,gain:.75});
    st.sg2=K.sigil(x0,y0,{r:RC*.42,dur:T_DRA+.1-T_RUNE-.15,in:.5,out:.4,spin:-.22,tex:'fx_circle_seal',pal:PG,gain:.9,delay:.15});
    GFX.light(x0,y0,RC*.9,PG.l,.55,1.6,{z:120,hold:1}); });
  [[.25,0],[.4,1.3],[.52,2.5],[.62,3.7],[.72,4.9]].forEach(([dl,a],i)=>after(T_RUNE+dl,()=>{ const r=RC*.42, x=x0+Math.cos(a)*r, y=y0+Math.sin(a)*r*FSY;
    K.vcolumn(x,y,{r:55,h:520,dur:.7,rise:.12,out:.35,pal:PG,twist:3,turb:.7,heat:1,taper:.6,gain:.9}); K.flare(x,y,30,{pal:PG,s:160,dur:.12,gain:1.8}); K.sparks(x,y,20,{pal:PG,n:6,sp:[100,400],up:700,life:[.3,.6]}); sfx('slash',1.6,.25); }));

  // ---- the walls: a ring of fire walls rises off the circle (tall behind him, low in front so he stays in sight) with two twisting columns at the sides
  // and white-gold light falling between them; everyone on the field is thrown up
  const RW=RC*.6, CL=[[245,1500,300,.05],[272,2150,350,0],[300,1650,310,.08],[200,1150,260,.12],[340,1100,250,.1],[95,520,230,.16]];
  after(T_WALL,()=>{ Cn.move({y:y0-560,zoom:.84,tilt:.2,roll:-.02},.7,'out'); GFX.ambient(.72,.46,.36,2); SFX.fire(1.8,.6); sfx('boom',1.2,.6); Cn.shake(.5); if(st.sg1) st.sg1.kick(); if(st.sg2) st.sg2.kick(); });
  CL.forEach(([deg,h,r,dl],i)=>after(T_WALL+dl,()=>{ const a=deg*PI/180, x=x0+Math.cos(a)*RW, y=y0+Math.sin(a)*RW*FSY;
    K.vcolumn(x,y,{r,h,dur:T_DRA+.35-T_WALL-dl,rise:.24,out:.45,pal:PF,twist:2.4+.4*i,turb:.95,heat:1.2,taper:.42,band:.6,btop:.82,lit:.5,flow:.8});
    K.flare(x,y,40,{pal:PG,s:r*1.2,dur:.14,gain:2}); K.dust(x,y,{n:7,r,sp:[200,700],a:.45}); K.sparks(x,y,60,{pal:PF,n:12,sp:[200,800],up:2200,life:[.4,1]}); GFX.light(x,y,800,PF.l,.9,1,{z:300,flick:.15,hold:.3}); }));
  [250,290].forEach((deg,i)=>after(T_WALL+.2+.1*i,()=>{ const a=deg*PI/180, x=x0+Math.cos(a)*RW*.55, y=y0+Math.sin(a)*RW*.55*FSY;
    K.godray(x,y,{r:120,r1:40,h:2600,dur:.6,in:.12,out:.3,pal:PG,gain:.45,a:.7,pool:1,light:0}); }));
  after(T_WALL+.12,()=>{ for(const e of onScreen(300)){ if(e.dead) continue; dmg(e,Dm*.06,{push:120,up:1600,sx:x0,sy:y0}); K.mark(e,'burn',{dur:2.2,pal:PF}); } });

  // ---- the dragon: comes down out of the tall wall behind him, circles him once round the whole field with its body burning and dark smoke torn off
  // behind it, then coils in on him and goes into his axe
  const RX=hw*.6, RY=hh*.62/FSY, DL=T_DRE-T_DRA, PS0=-PI/2-.5, LAP=TAU*1.05;
  const dpos=u=>{ const ps=PS0+u, rf=1-.92*smo(sat((u-(LAP-1.2))/1.2)), zi=Math.pow(1-sat(u/1.2),2); return [x0+Math.cos(ps)*RX*rf,Y0-40/FSY+Math.sin(ps)*RY*rf,mix(300,170,1-rf)+1100*zi+70*Math.sin(u*3)*rf]; };
  const dhit=new Set(); let dS=0;
  after(T_DRA,()=>{ Cn.move({y:y0-330,zoom:.86,tilt:.12,roll:.025},DL,'lin'); SFX.roar(1.2,.8); SFX.fire(1.2,.6); Cn.SND.shing(.6,.3); });
  GFX.add(DL,(k,t)=>{ if(st.dead) return; const u=LAP*(.2*k+.8*smo(k)), fin=1-sat((k-.84)/.16), sd=21.7, N=13, SEG=.13, m=K.mats();
    const P=[]; for(let j=0;j<=N;j++) P.push(dpos(u-j*SEG));
    // the body, tail first so the head sits on top; each piece runs a little past the next so it reads as one body
    for(let j=N-1;j>=0;j--){ const q=j/N, r0=mix(200,40,q), r1=mix(200,40,(j+1)/N), b=lerp3(P[j],P[j+1],1.25);
      jetSeg(P[j],b,r0*fin,r1*fin,{pal:j<2?PG:j<6?PF:PE,heat:mix(1.55,.7,q),turb:.7,smoke:mix(.1,.55,q),cS:PE.d,cK:'#6a5048',dens:10*fin,gain:1.45,speed:9,seed:sd+j,band:.25,lit:.4,flow:1.2}); }
    // a white-hot spine through it
    F.ribbon(m.trB,P.slice(0,N).map((p,j)=>({x:p[0],y:p[1]*FSY,z:p[2],w:mix(70,14,j/N)*fin})),{...col(PF),a:.8*fin,gain:1.5});
    // the head: a skull, a long muzzle, the open jaw, two horns swept back, a mane of short flames, two burning eyes
    const H=P[0], f=nrm(sub(P[0],P[1])), sdv=nrm(crs(f,[0,0,1])), upv=nrm(crs(sdv,f)), hs=fin;
    vol('blast',H[0],H[1]*FSY,H[2],{ex:230*hs,ey:200*hs,ez:180*hs,pa:[.55,.5,2.6,t*.8],pb:[1.5,1.2,1,.6],dens:12*hs,gain:1.5,seed:sd+30,smoke:.1,fire:.6,...col(PF),cS:PF.d,cK:'#8a5a40',amb:.1,key:1.2,rim:.3,glow:.8,band:.3});
    jetSeg(add(H,scl(f,80)),add(add(H,scl(f,470)),scl(upv,20)),140*hs,80*hs,{pal:PW,heat:1.5,turb:.45,smoke:.05,dens:11*hs,gain:1.4,speed:8,seed:sd+31});
    jetSeg(add(H,add(scl(f,60),scl(upv,-70))),add(H,add(scl(f,360),scl(upv,-230))),90*hs,40*hs,{pal:PF,heat:1.3,turb:.6,smoke:.1,dens:10*hs,gain:1.3,speed:8,seed:sd+32});
    for(const sg of [-1,1]) jetSeg(add(H,add(scl(sdv,sg*80),scl(upv,90))),add(H,add(add(scl(f,-420),scl(sdv,sg*220)),scl(upv,360))),60*hs,14*hs,{pal:PG,heat:1.4,turb:.35,smoke:.05,dens:10*hs,gain:1.3,speed:6,seed:sd+33+sg});
    jetSeg(add(H,add(scl(f,-80),scl(upv,120))),add(H,add(scl(f,-380),scl(upv,300))),110*hs,30*hs,{pal:PE,heat:1.1,turb:1.1,smoke:.2,dens:9*hs,gain:1.2,speed:7,seed:sd+36});
    for(const sg of [-1,1]){ const e=add(H,add(add(scl(f,140),scl(sdv,sg*70)),scl(upv,80))); F.bill(m.glowO,e[0],e[1]*FSY,e[2],44*hs,18*hs,0,{...col(PW),a:hs,gain:3.4}); }
    GFX.light(H[0],H[1]*FSY,900,PF.l,1.1*fin,.04,{z:H[2]});
    // dark smoke torn off the body hangs where it passed; burning scales fall off it
    if(t-dS>.022){ dS=t; if(t-(st.vs||0)>.13&&fin>.5){ st.vs=t; const q=P[N-2]; K.vsmoke(q[0],q[1]*FSY,{s:240,z:q[2]-120,dur:1.2,rise:260,a:.75,c:'#120e0c',c2:'#4a3c34'}); }
      for(let i=0;i<3;i++){ const q=P[1+((Math.random()*9)|0)]; GFX.pt({x:q[0],y:q[1]*FSY,z:q[2],vx:rand(-300,300),vy:rand(-150,150),vz:rand(-50,300),g:1200,drag:.8,life:rand(.35,.7),s:rand(3,7),m:3,len:.05,c:GFX.rgb(i?PF.s:PG.h),c2:PF.b,L:3}); } }
    // whoever the head passes through is struck, thrown outward and set burning
    for(const e of onScreen(300)){ if(dhit.has(e)||e.dead) continue; if(Math.hypot(e.x-H[0],(e.y-H[1]*FSY)/FSY)<420){ dhit.add(e); dmg(e,Dm*.08,{push:300,up:1300,sx:x0,sy:y0}); if(dhit.size<5) K.ehit(e,{pal:PF,pw:1.2,ring:0}); K.mark(e,'burn',{dur:2,pal:PF}); } } },T_DRA);
  after(T_DRE-.12,()=>{ K.flare(x0,y0,BODY*.6,{pal:PW,s:360,dur:.2,gain:2.4}); GFX.light(x0,y0,900,PW.l,1,.3,{z:BODY*.6}); Cn.shake(.3); sfx('fire',.8,.5);
    for(const e of onScreen(300)) if(!dhit.has(e)&&!e.dead){ dhit.add(e); dmg(e,Dm*.08,{push:200,up:900,sx:x0,sy:y0}); } });

  // ---- the breath, then the rising crescent. While the field holds its breath the dragon's fire sits in his axe as one white-gold point, growing
  GFX.add(T_PEAK-T_DRE+.04,(k,t)=>{ if(st.dead||!F.on) return; const m=K.mats(), q=window.MK&&MK.on()?MK.wpt('xc'):[pl.x,pl.gy,BODY*.7], g=eo3(k), fl=1+.08*Math.sin(t*40);
    F.bill(m.glowO,q[0],q[1],q[2],(70+150*g)*fl,(70+150*g)*fl,0,{...col(PW),a:.9,gain:2.6}); F.bill(m.glowO,q[0],q[1],q[2],(240+260*g)*fl,(30+20*g),0,{...col(PG),a:.7,gain:2}); },T_DRE);
  after(T_DRE+.02,()=>{ Cn.hush(T_PEAK-T_DRE-.02,{a:.4}); Cn.move({x:x0,y:y0-300,zoom:.98,tilt:.16,roll:0},T_PEAK-T_DRE,'io'); Cn.SND.inhale(.3,.5); });
  after(T_PEAK-.2,()=>mk('xRise',{yaw:yawTo(0),blend:.04}));
  after(T_PEAK,()=>{ const m=K.mats();
    Cn.peak(x0,y0-BODY*.6,{ca:.03,blur:.16,tint:'#ffd27a',hold:.05,out:.3}); hitstop=Math.max(hitstop,.1); Cn.shake(1.3); GFX.light(x0,y0,hw*1.1,PW.l,1.2,.5,{z:300}); Cn.SND.hit(1.2); sfx('boom',2.2,1); SFX.sub(1);
    Cn.move({zoom:.78,tilt:.12,roll:0},.22,'out'); GFX.ambient(.95,.7,.5,30); after(.25,()=>GFX.ambient(.6,.42,.36,3));
    K.flare(x0,y0,BODY*.6,{pal:PW,s:520,dur:.12,gain:2.8});
    // the upward cut itself: a tall crescent standing in front of him
    K.slash(x0,y0+30,BODY*.5,{r:820,w:.5,rx:-PI/2*.92,a0:-2.7,a1:.35,pal:PW,swing:.07,hold:.1,fade:.4,gain:1.3});
    // and the crescent running out from him in every direction, rising as it goes: three arcs, then a second, smaller ring of gold
    for(const [dl,R1,P,z0,g] of [[0,hw*1.25,PW,60,1.3],[.07,hw*.9,PG,40,1]]) after(dl,()=>{ const sd=rand(0,9), a0=rand(0,TAU);
      GFX.add(.55,(k,t)=>{ if(!F.on) return; const e=eo3(k), rr=mix(160,R1,e), f=sat((k-.35)/.65), C=col(P);
        for(let j=0;j<3;j++){ const s=a0+j*TAU/3+e*.5, w2=.22, M=F.xf({rx:-.12}); const z=z0+260*e;
          F.lathe(m.slU,x0,y0,z,{r0:rr*(1-w2*1.3),r1:rr*1.04,a0:s,a1:s+1.75,M,a:.5*(1-f),ero:.1+f*.5,t0:sd});
          F.lathe(m.slB,x0,y0,z,{r0:rr*(1-w2),r1:rr,a0:s,a1:s+1.75,M,...C,gain:1.5*g,ero:.16+f*.75,t0:sd+j});
          F.lathe(m.slC,x0,y0,z,{r0:rr*(1-w2*.5),r1:rr*1.004,a0:s,a1:s+1.75,M,...C,gain:3.4*g,ero:.3+f*.7,t0:sd+j*2}); } }); });
    K.vring(x0,y0,{r:hw*1.05,r0:200,dur:.7,tube:.09,a:.55,c:'#2a2018',c2:'#9a7458'});
    for(let i=0;i<8;i++){ const a=i/8*TAU+.3+(h01(i*3.3)-.5)*.5, d=hw*(.3+.32*h01(i*5.1)), x=x0+Math.cos(a)*d, y=y0+Math.sin(a)*d*FSY; after(d/3600,()=>{ K.vblast(x,y,{s:190+120*h01(i*7.7),pal:PF,dur:1.1,heat:1.25,rise:260,smoke:.55,c:'#1c1410',c2:'#5a4436',band:.5,lit:.5}); K.sparks(x,y,40,{pal:PG,n:8,sp:[300,900],up:1500,life:[.3,.7]}); }); }
    K.sparks(x0,y0,BODY*.6,{pal:PW,n:30,sp:[800,2600],up:1200,life:[.3,.8],s:2.5,len:.08});
    // every body on the field is thrown out and up, burning
    const L=onScreen(300).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0));
    L.forEach((e,i)=>{ K.knock(e,{from:[x0,y0],dist:640,up:2100,fx:0}); if(i<3) K.ehit(e,{pal:PW,pw:1.6,ring:0}); });
    after(.05,()=>Cn.shake(.9)); after(.12,()=>Cn.shake(.7));
    after(.12,()=>Cn.sweep(x0,y0,Dm*.72,{speed:3600,push:1.3,max:.4})); });

  // ---- after: the whole floor burns and cools; the circle goes out as a scorched ring; fires burn down where they stand; embers lift, ash comes down
  after(T_PEAK+.05,()=>{ K.cool(x0,y0,{kind:'scorch',r:hw*.95,pal:PF,life:3.2,hot:.6,start:.15,light:0,gain:1.1});
    K.cool(x0,y0,{kind:'ring',r:RC*.42,pal:PG,life:2.6,hot:.75,light:0}); K.cool(x0,y0,{kind:'crack2',r:900,rot:.4,pal:PF,life:3.2,grow:.2,light:0});
    GFX.light(x0,y0,hw*.9,PF.l,.6,1.6,{z:80,hold:.4,flick:.12}); });
  for(let i=0;i<7;i++){ const a=h01(i*4.3)*TAU, d=RC*(.3+.42*h01(i*7.1)), x=x0+Math.cos(a)*d, y=y0+Math.sin(a)*d*FSY*.9;
    after(T_PEAK+.1+.07*i,()=>{ fireCard(x,y,170+130*h01(i*2.9),1.3+.7*h01(i*3.7));
      K.cool(x,y,{kind:i%2?'scorch':'lava',r:180+80*h01(i*6.1),pal:PF,life:2.6,hot:.8,light:0}); GFX.light(x,y,420,PF.l,.7,1.5,{z:60,flick:.25});
      if(i%2===0) K.vsmoke(x,y,{s:220,z:200,dur:1.6,rise:420,a:.55,delay:.8}); }); }
  let an=0, t0=0;
  V.ultTick=dt=>{ t0+=dt; if(t0<T_PEAK) return; const te=t0-T_PEAK, want=Math.floor(Math.min(te,1.8)*60*(GFX.QK||1)); let n=0;
    while(an<want&&n++<6){ an++; const px=x0+(h01(an*1.9)-.5)*hw*1.6, py=y0-hh*.9+h01(an*4.3)*hh*1.6, ash=an%3===0;
      if(ash) GFX.pt({x:px,y:py,z:500+h01(an*6.1)*700,vx:-50+(h01(an*2.7)-.5)*120,vy:-20,vz:-(150+h01(an*8.3)*160),g:0,drag:.2,life:1.6+h01(an*3.1)*.8,s:4+h01(an*9.7)*5,rot:h01(an*5.3)*TAU,vr:(h01(an*7.9)-.5)*6,m:11,b:'alpha',c:GFX.rgb('#3a3436'),c2:'#0c0a0c',fk:4,L:1});
      else GFX.pt({x:px,y:py,z:10+h01(an*6.1)*50,vx:(h01(an*2.7)-.5)*120,vy:0,vz:100+h01(an*8.3)*260,g:-40,drag:.6,life:.9+h01(an*3.1)*.9,s:2.5+h01(an*9.7)*3.5,m:3,len:.03,c:GFX.rgb(an%2?PF.s:PG.m),c2:PE.b,L:3}); } };
  after(TE-1.05,()=>{ Cn.back(1); GFX.ambient(1,1,1,2); });
  after(TE,()=>{ st.dead=true; X.ultStop(); }); }

window.AxeUlt1={cast};
})();

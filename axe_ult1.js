// BERSERKER ultimate 1 (ax_ult1) 신부강림 - the 40-second awakening of the reference video, inside the battlefield. Plan: _gen/v3/axe_plan.md
//  prepare  0 - .85  he lifts his axe; behind him a golden giant of fire and light condenses, holding the colossal moon axe (gold pole, ivory crescent) high
//  chop    .85- 1.08 the giant brings it down on a diagonal; its path stays as a broad band of real fire; the blade bites the floor (flash, shake)
//  runes  1.25- 3.6  a golden rune circle runs out from him to past the screen edge, glowing and lighting the floor; small gold flames stand round it
//  walls  2.5 - 3.6  tall tongues of fire rise round the circle with dark smoke behind, white-gold shafts of light fall from above the screen
//  dragon 3.2 - 4.25 a thick dragon of fire (horned head, burning eyes, a body long enough to cross the screen, dark smoke) circles him, then coils into his axe
//  climax 4.25- 4.5  the field holds its breath while the charge builds in his axe; then one huge white-gold crescent rises from the floor past the top
//                    of the screen, a near-white flash, and fire bursts over the whole screen (peak, hitstop, shake, light, bass on that frame)
//  after  4.5 - 6.6  the whole floor burns (fires of every size, scorch and lava to the screen edges, columns of smoke) and cools
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
// the hottest instants only: white-gold; and the giant's own warm gold fire
const PW={d:'#5a2a04',b:'#ffb040',m:'#fff0c0',h:'#ffffff',l:'#ffe2a8',s:'#fff2cc'};
const PGF={d:'#2a0a02',b:'#b03a0a',m:'#ff7a20',h:'#ffe9b8',l:'#ff7a24',s:'#ffc24a'};
// the rune circle: an amber nearer the fire than the clean gold
const PGR={d:'#2a1006',b:'#a8521a',m:'#e8943c',h:'#ffd89a',l:'#ff9a34',s:'#ffd08a'};
const SMK='#1a1614';
const col=P=>({cA:P.d,cB:P.b,cM:P.m||P.b,cC:P.h});
const mk=(n,o)=>{ if(window.MK&&MK.on()) MK.play(n,o); };
const yawTo=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a));
const vok=()=>!!(VQ&&VQ.on&&K.vok&&K.vok());
const vol=(kind,x,y,z,o)=>{ if(vok()) VQ.add(kind,x,y,z,o); };
// true-depth vectors [x, depth, z]; world calls take the floor y = depth*FSY
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], scl=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const nrm=a=>{ const l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; }, crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const lerp3=(a,b,k)=>[mix(a[0],b[0],k),mix(a[1],b[1],k),mix(a[2],b[2],k)];
const W3=p=>({x:p[0],y:p[1]*FSY,z:p[2]});
// a lit solid whose model axes go to the world axes ax (width), ay (thickness), az (length); its model foot (z = -.3) is put at 'foot'
const solidAt=(kind,vi,foot,ax,ay,az,sx,sy,sz,o)=>{ const M=new Float32Array([ax[0]*sx,ax[1]*sx,ax[2]*sx,0, ay[0]*sy,ay[1]*sy,ay[2]*sy,0, az[0]*sz,az[1]*sz,az[2]*sz,0, 0,0,0,1]), org=add(foot,scl(az,.3*sz));
  return F.solid(kind,vi,org[0],org[1]*FSY,org[2],{M,...o}); };
// a stream of volume fire between two true-depth points (mouth a, far end b)
const jetSeg=(a,b,r0,r1,o)=>{ const dx=b[0]-a[0], dY=b[1]-a[1], dz=b[2]-a[2], hl=Math.hypot(dx,dY), L=Math.hypot(hl,dz)||1, R=Math.max(r0,r1,1)*1.25;
  vol('jet',(a[0]+b[0])/2,(a[1]+b[1])/2*FSY,(a[2]+b[2])/2,{ex:L/2,ey:R,ez:R,yaw:Math.atan2(dY,dx),pitch:Math.atan2(dz,hl),pa:[r0/R,r1/R,o.freq||2.6,o.speed||5],pb:[o.heat??1.2,o.turb??.6,o.head??1.5,o.tail??-.3],
    dens:o.dens??10,gain:o.gain??1.5,seed:o.seed||1,smoke:o.smoke??.12,fire:.5,rim:o.rim||0,...col(o.pal||PF),cS:o.cS||(o.pal||PF).d,cK:o.cK||'#9a8676',band:o.band,btop:o.btop,lit:o.lit,flow:o.flow,ord:o.ord}); };
// smooth light materials (no grain): a soft band across a ribbon and its hot core
let SMT=null; const smt=()=>SMT||(SMT={body:F.mat({pm:[2,1.3,0,0],nz:'fbm',n1:[1.2,.6,-1.4,0],nk:.12,ero:0,soft:.5,rk:[.3,.95],gain:2.4,bgain:1.1}),core:F.mat({pm:[2,3.5,0,0],nk:0,ero:0,soft:.4,rk:[.15,.55],gain:4,bgain:2})});
// a fire burning on the floor: a real flame painting through the fire ramp, its grain rising, flickering, burning down from the top. s = height
let FM=null; const fireMat=()=>FM||(FM=F.mat({...K.mats().art,tex:'v3_real_fire',layer:'o',nz:'billow',n1:[1,1.6,0,-2.2],n2:[1.4,1.2,.04,-1.6],dist:.07,mdist:1,rk:[.45,1.05]}));
// (2026-11-25) no longer a flame photograph stood on a card (it read as a picture sliding about): a real volume of fire, its own twist and girth,
// that burns down and leaves smoke
const fireCard=(x,y,s,dur,o={})=>{ if(!F.on) return; after(o.delay||0,()=>{ const hold=o.hold??.45, g=.8+.4*h01(x*.013+y*.007);
    K.vcolumn(x,y,{r:(s*.15+50)*(o.wide||1)*g,h:s*.8,dur,rise:o.rise||.18,out:dur*(1-hold)*.9,pal:o.pal||PF,heat:1.25,twist:1.4+1.6*h01(x*.031),turb:1.15,taper:.24+.3*h01(x*.017+y*.011),gain:.85,band:1,btop:.62,lit:.6,flow:1.4});
    if(o.light) GFX.light(x,y,s*2.2,PF.l,.7,dur,{z:s*.4,flick:.3});
    if(s>700&&g>1) after(dur*.7,()=>K.vsmoke(x,y,{s:s*.4,z:s*.3,dur:1.8+g,rise:420,a:.3,c:'#1c120e',c2:'#5a3a2a',lit:.4,vx:-100})); }); };
// a shaft of white-gold light falling from above the screen onto (x,y): it reaches down, stands, thins and goes
const shaft=(x,y,w,dur,delay,o={})=>{ if(!F.on) return; const m=K.mats(), S=smt(), br=o.br??1, fk=o.flick||0, ph=rand(0,9);
  GFX.add(dur,(k,t)=>{ const i=eo3(sat(t/.16)), f=sat((k-.5)/.5), fl=fk?(.45+.55*Math.abs(Math.sin(t*fk+ph))*(.7+.3*Math.sin(t*fk*2.3+ph))):1, a=(1-f*f)*fl*br, z0=5200*(1-i), pts=[0,1,2,3,4,5].map(j=>({x:x+(j/5)*w*.4,y,z:mix(z0,5200,j/5),q:j/5}));
    F.ribbon(S.body,pts.map(p=>({...p,w:w*(2.2+1.6*p.q)*(1-.3*f)})),{...col(PG),a:.35*a,gain:1.4});
    F.ribbon(S.body,pts.map(p=>({...p,w:w*(.9+.7*p.q)*(1-.5*f)})),{...col(PW),a:.7*a,gain:2});
    if(!fk) F.ribbon(S.core,pts.map(p=>({...p,w:w*(.3+.25*p.q)*(1-.6*f)})),{...col(PW),a:.8*a,gain:2.6});
    if(i>.9&&!fk) F.quad(m.glowG,x,y,w*4,w*4,0,{...col(PG),a:.7*a,gain:1.3}); },delay||0);
  if(!fk) after((delay||0)+.14,()=>{ GFX.light(x,y,w*9,PW.l,br,dur*.8,{z:200}); K.sparks(x,y,20,{pal:PG,n:10,sp:[200,700],up:900,life:[.3,.7]}); }); };

// ---------------------------------------------------------------- the colossal moon axe
// P the giant's grip, d pole direction (toward the head), n the way the edge faces. o: {L pole length, ero (0 whole .. 1 gone), heat (edge glow), a}
// A long gold pole with gold rings; at its head a neck and a big ivory crescent blade, thick in the middle, its horns curling back past the pole.
const RCB=560, WB=340;
function drawAxe(P,d,n,o){ if(!F.on||!(F.solids&&F.solids())) return null; const L=o.L, b=nrm(crs(d,n)), ero=o.ero||0, ht=o.heat||0, a=o.a??1;
  // (2026-11-25) the real 3D axe (axe_ult3.js): model z runs from the head to the pommel, x the way the edge faces
  if(window.AxeUlt3&&AxeUlt3.axe){ const sc=L*.62, Z=scl(d,-1), Xv=n, Yv=nrm(crs(Z,Xv)), O=add(P,scl(d,L*1.12));
    const M=new Float32Array([Xv[0]*sc,Xv[1]*sc,Xv[2]*sc,0, Yv[0]*sc,Yv[1]*sc,Yv[2]*sc,0, Z[0]*sc,Z[1]*sc,Z[2]*sc,0, O[0],O[1],O[2],1]);
    if(AxeUlt3.axe(M,[a,Math.min(1,ht),Math.min(1,ht),ero])) return add(add(P,scl(d,L*.97)),scl(n,110+WB*.52)); }
  const gold={alb:'#c8902c',emis:'#ff9a30',rimC:'#ffe6a0',spec:1.1,rim:.6,tone:.15,bump:.5,ero,a};
  solidAt('slab',1,add(P,scl(d,-.16*L)),n,b,d,44/.3,44/.1,L*1.14/1.3,{...gold});
  // ornamental bands: a wide ring with a thin ring either side, a spiked butt cap
  for(const [u,r,l] of [[-.16,70,.06],[.12,66,.035],[.17,58,.02],[.07,58,.02],[.5,66,.04],[.56,56,.02],[.44,56,.02],[.84,70,.05],[.92,58,.025]]) solidAt('slab',3,add(P,scl(d,u*L)),n,b,d,r/.3,r/.1,L*l/1.3,{...gold,alb:'#f4d070',spec:1.5,emis:'#ffb040',heat:.3});
  solidAt('slab',2,add(P,scl(d,-.16*L)),n,b,scl(d,-1),40/.3,40/.1,140/1.3,{...gold,alb:'#f0c860'});
  const hub=add(P,scl(d,L*.97)), neck=110;
  solidAt('slab',0,hub,d,b,n,95/.3,52/.1,(neck+30)/1.3,{...gold,alb:'#e8b850',spec:1.4});
  // the crescent: centreline round Cb, thickest at the front (theta 0), thin horns curling back
  const Cb=add(hub,scl(n,neck-RCB+WB*.5)), C=th=>add(Cb,scl(add(scl(n,Math.cos(th)),scl(d,Math.sin(th))),RCB)), N=12, T0=-1.95, T1=1.95, ivory={alb:'#ece2c8',emis:PF.m,rimC:'#fff4d8',spec:.9,rim:.7,tone:.12,bump:.4,ero,a,heat:.15*ht};
  for(let j=0;j<N;j++){ const t0=mix(T0,T1,j/N), t1=mix(T0,T1,(j+1)/N), tm=(t0+t1)/2, w=WB*(.18+.82*Math.pow(Math.cos(tm/T1*PI/2),.7)), p0=C(t0), p1=C(t1), tg=nrm(sub(p1,p0)), rad=nrm(add(scl(n,Math.cos(tm)),scl(d,Math.sin(tm)))), len=Math.hypot(...sub(p1,p0))*1.3;
    solidAt('slab',j%4,add(p0,scl(tg,-len*.12)),rad,b,tg,w*.5/.3,20/.1,len/1.3,ivory); }
  // the edge: a white-hot rim along the outer curve, a gold line along the inner
  const m=K.mats(), out=[], inn=[];
  for(let j=0;j<=14;j++){ const th=mix(T0*.97,T1*.97,j/14), w=WB*(.18+.82*Math.pow(Math.cos(th/T1*PI/2),.7)), r=add(scl(n,Math.cos(th)),scl(d,Math.sin(th))), sw=Math.sin(PI*j/14);
    out.push({...W3(add(C(th),scl(r,w*.52))),w:(10+20*sw)*(.5+.5*Math.min(1,ht))}); inn.push({...W3(add(C(th),scl(r,-w*.48))),w:6+8*sw}); }
  const ea=(1-ero)*a, C2=col(ht>.6?PW:PF);
  if(ht>.05){ F.ribbon(m.trB,out.map(p=>({...p,w:p.w*2.6})),{...C2,a:Math.min(1,ht)*ea,gain:1.5}); F.ribbon(m.trC,out,{...C2,a:Math.min(1,ht)*ea,gain:2.2}); }
  F.ribbon(m.trC,inn,{...col(PG),a:.6*ea,gain:1.4});
  // a soft ivory sheen over the blade's face hides the joins between its plates
  F.ribbon(smt().body,out.map((p,j)=>{ const th=mix(T0*.97,T1*.97,j/14); return {...W3(C(th)),w:WB*(.18+.82*Math.pow(Math.cos(th/T1*PI/2),.7))*.55}; }),{cA:'#4a3a28',cB:'#c8b890',cM:'#efe6d0',cC:'#fffaf0',a:.55*ea,gain:1.1});
  return add(C(0),scl(n,WB*.52)); }

function cast(id){ X.ultStart(id); if(F&&F.prepDeep) F.prepDeep(); const Cn=X.cine, {hw,hh}=view(), Dm=65000*A.mul(id), x0=pl.x, y0=pl.gy, Y0=y0/FSY, TE=6.6;
  const T_SW=.85, T_IMP=1.08, T_RUNE=1.25, T_WALL=2.5, T_DRA=3.2, T_DRE=4.25, T_PEAK=4.5;
  const st={dead:false,edge:null};
  // ---- the giant stands right behind him, a little to his right; the blade lands on his left
  const gx=x0+200, gy=y0-430, gY=gy/FSY, T=[x0-620,Y0+90/FSY,0], SHZ=1150;
  const shL=[gx-520,gY+20,SHZ], shR=[gx+520,gY+20,SHZ];
  // where the right hand holds the pole: raised over the head, wound back, then driven forward and down at the target
  const PR=[gx+200,gY+80,1700], PW_=[gx+360,gY,1800], PI_=lerp3(lerp3(shR,shL,.5),[T[0],T[1],0],.32); PI_[2]=Math.max(PI_[2],850);
  const LP=Math.max(1300,Math.min(2100,Math.hypot(...sub(T,PI_))*.88));
  const grip=t=>t<T_SW?lerp3(PR,PW_,smo(sat((t-.15)/(T_SW-.15)))):t<T_IMP?lerp3(PW_,PI_,smo(Math.pow(sat((t-T_SW)/(T_IMP-T_SW)),1.5))):PI_;
  // pose of the axe: phi in the plane through the grip and the target, 0 = pointing at the target on the floor
  const pose=t=>{ const P=grip(t), e1=nrm(sub(T,P)), U2=nrm([.8,.25,.55]), e2=nrm(sub(U2,scl(e1,e1[0]*U2[0]+e1[1]*U2[1]+e1[2]*U2[2]))); let ph;
    if(t<T_SW) ph=mix(1.6,2.15,smo(sat(t/T_SW)));
    else if(t<T_IMP) ph=mix(2.15,0,Math.pow(sat((t-T_SW)/(T_IMP-T_SW)),1.8));
    else ph=-.04*Math.sin(PI*sat((t-T_IMP)/.12));
    const d=add(scl(e1,Math.cos(ph)),scl(e2,Math.sin(ph))), n=add(scl(e1,Math.sin(ph)),scl(e2,-Math.cos(ph))), dist=Math.hypot(...sub(T,P));
    return {P,d,n,ph,L:LP}; };

  // ---- 0: prepare
  mk('xRaise',{yaw:yawTo(PI),blend:.08});
  GFX.ambient(.44,.38,.4,4); Cn.move({x:x0+60,y:y0-380,zoom:1.3,tilt:.04},.25,'out'); after(.15,()=>Cn.move({x:x0+40,y:y0-1120,zoom:.82,tilt:.1,roll:.02},.5,'io'));
  SFX.fire(2.6,.45); Cn.drone(40,.3); Cn.SND.inhale(.8,.4); SFX.choir(1.6,.35);
  K.flare(x0,y0,BODY*.9,{pal:PG,s:180,dur:.3,gain:2.2});
  const LA=GFX.light(gx,gy,1200,PG.l,.3,.1,{z:1600,hold:T_IMP+.7});
  // the giant: an upper body of dark smoke lit gold from inside and bright at its rim - head, broad shoulders, two arms whose hands hold the pole
  // (the right at the grip, the left lower down it). It overflows the top of the screen, and after the blow it lifts and scatters upward
  const wisp=(A,B,ey,ra,rb,o)=>{ const dx=B[0]-A[0], dY=B[1]-A[1], dz=B[2]-A[2], L2=Math.hypot(dx,dY,dz)/2||1;
    vol('wisp',(A[0]+B[0])/2,(A[1]+B[1])/2*FSY,(A[2]+B[2])/2,{ex:L2+ey*.35,ey,ez:ey,yaw:Math.atan2(dY,dx),pitch:Math.atan2(dz,Math.hypot(dx,dY)),pa:[ra,rb,2.4,o.flow||.8],pb:[o.glow??.3,o.loose??1,o.rimK??1.15,o.rag??.3],
      dens:o.dens??6,gain:1.15,seed:o.seed||1,smoke:.55,fire:.75,block:.8,...col(PGF),cS:'#160a06',cK:'#c0541c',amb:.2,key:1.2,rim:1,glow:.2,sdist:.25,shadow:5,steps:22,lit:.8,ord:o.ord??gy-40}); };
  const arm=(S,H,sg)=>{ const l=430, D=sub(H,S), dl=Math.hypot(...D)||1, h=Math.sqrt(Math.max(0,l*l-dl*dl/4)), m=lerp3(S,H,.5), out=nrm(add([sg,0,-.6],scl(nrm(D),-sg*.0))), E=add(m,scl(nrm(sub(out,scl(nrm(D),out[0]*D[0]/dl+out[1]*D[1]/dl+out[2]*D[2]/dl))),h));
    return E; };
  GFX.add(T_IMP+.95,(k,t)=>{ if(st.dead) return; const form=eo3(sat((t-.03)/.45)), gone=sat((t-T_IMP-.12)/.65), body=form*(1-gone*gone), up=gone*gone*700, U=[0,0,up], Q=pose(Math.min(t,T_IMP+.2));
    if(body<.02) return; const lean=t<T_SW?-.1:t<T_IMP?.35*sat((t-T_SW)/(T_IMP-T_SW)):.35, fw=[0,lean*260,-lean*120], dn=.6+.4*form, hot=1-gone;
    const sL=add(add(shL,fw),U), sR=add(add(shR,fw),U), nk=add(add([gx,gY+20,SHZ+60],fw),U), hd=add(add([gx,gY+60+lean*120,SHZ+330],fw),U), wa=add([gx,gY,250],U);
    const hR=Q.P, hL=add(Q.P,scl(Q.d,-320)), eR=arm(sR,hR,1), eL=arm(sL,hL,-1);
    // a dark mass of smoke behind the figure so its light has something to stand against
    vol('blast',gx,gy-30,1100+up,{ex:900,ey:420,ez:900,pa:[.7,.6,2,t*.25],pb:[.25*hot,1,1,.6],dens:4*body,gain:1,seed:3.3,smoke:1,fire:1,cS:'#0e0a08',cK:'#4a3426',amb:.25,key:1,rim:.4,glow:0,steps:18,ord:gy-90});
    wisp(wa,nk,400*dn,.42,.82,{dens:8*body,glow:.3*hot,seed:1,ord:gy-60,loose:1.3,rag:.9});
    wisp(sL,sR,230*dn,.7,.7,{dens:7*body,glow:.3*hot,seed:2,ord:gy-55,loose:1.5,rag:.8});
    wisp(add(hd,[0,0,-140]),add(hd,[0,0,150]),190*dn,.65,.6,{dens:10*body,glow:.38*hot,seed:3,ord:gy-50,rimK:1.4});
    for(const [S,E,H,sd] of [[sL,eL,hL,4],[sR,eR,hR,6]]){ wisp(S,E,165*dn,.8,.55,{dens:8*body,glow:.32*hot,seed:sd,ord:gy-30+sd,loose:1.4,rag:.7}); wisp(H,E,125*dn,.45,.65,{dens:8*body,glow:.36*hot,seed:sd+1,ord:gy-20+sd,loose:1.3,rag:.6});
      vol('blast',H[0],H[1]*FSY,H[2],{ex:150,ey:130,ez:130,pa:[.7,.5,2.6,t],pb:[1.3*hot,.9,1,.5],dens:10*body,gain:1.4,seed:sd+9,smoke:.3,fire:.7,...col(PGF),cS:'#2a1408',cK:'#a8501c',amb:.12,key:1.2,rim:.6,glow:.6,ord:gy+sd}); }
    // the eyes, and fire licking up off the crown
    const m=K.mats(); for(const sg of [-1,1]){ const e=add(hd,[sg*70,120,20]); F.bill(m.glowO,e[0],e[1]*FSY,e[2],95*body,28*body,0,{...col(PW),a:body*hot,gain:3.6}); }
    jetSeg(add(hd,[0,0,120]),add(hd,[30,-40,560]),130*body,20*body,{pal:PGF,heat:1.2*hot,turb:1.1,smoke:.25,dens:9*body,gain:1.3,speed:4,seed:7.7,band:.6,btop:.75,flow:1,ord:gy-45});
    GFX.light(gx,gy+250,1800,PGF.l,.8*body*hot,.04,{z:1300}); });
  // the axe: condenses out of embers (dissolve runs backward), heats to white before the swing, bites the floor, then burns away
  let lastE=null, sT=0; const SW=[];
  GFX.add(T_IMP+1.3,(k,t)=>{ if(st.dead) return; const Q=pose(Math.min(t,T_IMP+.2)); if(t>=T_IMP+.2&&!st.Q) st.Q=Q; const q=t>=T_IMP+.2?st.Q:Q;
    const ero=t<T_IMP?1-eo3(sat((t-.1)/.45)):sat((t-T_IMP-.5)/.7), heat=t<T_IMP?sat((t-.2)/.5)*(.6+.6*sat((t-T_SW)/.2)):Math.max(0,1.2-1.4*sat((t-T_IMP)/.9));
    const E=ero<1?drawAxe(q.P,q.d,q.n,{L:q.L,ero,heat}):null; if(!E) return; st.edge=E;
    LA.x=E[0]; LA.y=E[1]*FSY; LA.z=Math.max(80,E[2]); LA.a=.3+.9*heat*(1-ero); LA.r=900+600*heat;
    if(t>=T_SW-.02&&t<=T_IMP+.01){ const hub=add(q.P,scl(q.d,q.L*.97)); if(!SW.length||t-SW[SW.length-1].t>.01) SW.push({t,E,I:add(hub,scl(q.n,-60))}); }
    if(t>=T_SW-.05&&t<T_IMP&&lastE&&t-sT>.016){ sT=t; for(let i=0;i<3;i++){ const p=lerp3(lastE,E,Math.random()); GFX.pt({x:p[0],y:p[1]*FSY,z:p[2],vx:rand(-200,200),vy:rand(-80,80),vz:rand(-100,300),g:900,drag:1,life:rand(.25,.55),s:rand(3,7),m:3,len:.05,c:GFX.rgb(i?PG.s:PW.h),c2:PF.b,c3:'#ffffff',L:3}); } }
    lastE=E; });
  // the swing's path: a broad smear of fire behind the blade while it passes, then a band of real fire along the arc that burns down to smoke
  after(T_SW,()=>{ sfx('whoosh',.6,.9); Cn.move({x:x0-150,y:y0-760,zoom:.9,tilt:.12,roll:-.02},T_IMP-T_SW+.05,'in'); });
  GFX.add(T_IMP-T_SW+.4,(k,t)=>{ if(st.dead||!F.on||SW.length<2) return; const m=K.mats(), fade=sat((T_SW+t-T_IMP)/.35);
    const S2=smt(); F.ribbon(S2.body,SW.map((s,i)=>{ const c=lerp3(s.I,s.E,.5), u=i/(SW.length-1); return {...W3(c),w:Math.hypot(...sub(s.E,s.I))*.62*(.35+.65*u)}; }),{...col(PG),a:.8*(1-fade),gain:1.7});
    F.ribbon(m.trB,SW.map(s=>{ const c=lerp3(s.I,s.E,.75); return {...W3(c),w:Math.hypot(...sub(s.E,s.I))*.3}; }),{...col(PF),a:.6*(1-fade),gain:1.4});
    F.ribbon(m.trC,SW.map(s=>({...W3(s.E),w:40})),{...col(PW),a:1-fade,gain:2.2}); },T_SW);
  after(T_IMP-.02,()=>{ const S=SW.slice(); if(S.length<4) return;
    GFX.add(1.3,(k,t)=>{ if(st.dead) return; const cool=sat(t/1.15), g=eo3(sat(t/.1)), n=S.length, step=Math.max(1,Math.floor(n/5));
      for(let i=0;i+step<n;i+=step){ const a=lerp3(S[i].I,S[i].E,.6), b=lerp3(S[i+step].I,S[i+step].E,.6), rr=(110+12*i)*(1+.5*cool);
        jetSeg(a,b,rr*.8,rr,{pal:PF,heat:1.3*(1-cool*.85),turb:.7+.5*cool,smoke:mix(.12,.95,cool),cS:cool>.5?'#140e0c':PF.d,cK:'#5e5048',dens:9*(1-sat((t-.85)/.45)),gain:1.3*g,speed:3,seed:11+i,rim:.3*cool,lit:.5,flow:.8,band:.4}); } }); });

  // ---- the blow lands where the blade is
  after(T_IMP,()=>{ const Qi=pose(T_IMP), E=add(add(Qi.P,scl(Qi.d,Qi.L*.97)),scl(Qi.n,110+WB*.6)), ix=E[0], iy=E[1]*FSY;
    hitstop=Math.max(hitstop,.07); Cn.shake(1.1); Cn.SND.hit(.8); sfx('boom',1.6,.9); GFX.light(ix,iy,1600,PW.l,1.1,.35,{z:200});
    K.flare(ix,iy,60,{pal:PW,s:520,dur:.12,gain:2.6}); K.vblast(ix,iy,{s:460,pal:PF,dur:1.3,heat:1.15,rise:300,band:.5,lit:.6,smoke:.6,c:'#1c1410',c2:'#5a4436'});
    K.vring(ix,iy,{r:1200,r0:180,dur:.75,tube:.1,a:.6,c:'#2a2018',c2:'#8a6a50'});
    K.sparks(ix,iy,40,{pal:PG,n:28,sp:[500,1900],up:1600,life:[.3,.8]}); K.chunks(ix,iy,{n:5,r:180,sp:[300,900],up:1300,kind:'stone',s:[18,44],rock:'#3a302a',pal:PF,life:1.1});
    K.cool(ix,iy,{kind:'crack2',r:760,rot:-.4,pal:PF,life:3.2,hot:.8,light:0}); K.cool(ix,iy,{kind:'crater',r:320,pal:PF,life:3,light:0});
    for(const e of onScreen(300)){ const d=Math.hypot(e.x-ix,(e.y-iy)/FSY); if(d<1100) after(d/4000,()=>{ if(e.dead) return; dmg(e,Dm*.05,{push:260,up:900,sx:ix,sy:iy}); }); } });
  after(T_SW+.02,()=>mk('xChop',{yaw:yawTo(PI),blend:.05}));

  // ---- the rune circle: drawn out from his feet to past the screen edge, two rings turning against each other, a gold bloom over it and its light
  // on the floor; small gold flames stand round it. It flares when the walls rise and fades out while the dragon comes
  const RC=hw*.9;
  after(T_RUNE,()=>{ mk('xPlant',{yaw:yawTo(PI),blend:.1}); Cn.move({x:x0,y:y0-300,zoom:.95,tilt:.17,roll:.03},1,'io'); GFX.ambient(.5,.42,.38,2); SFX.rise(1.1,.4); Cn.SND.shing(.9,.35);
    st.sg1=K.sigil(x0,y0,{r:RC,dur:T_DRA+.55-T_RUNE,in:.75,out:.5,spin:.1,tex:'fx_circle_arcane',pal:PGR,gain:.48}); st.sg1.a=.6;
    st.sg2=K.sigil(x0,y0,{r:RC*.42,dur:T_DRA+.45-T_RUNE-.15,in:.5,out:.45,spin:-.22,tex:'fx_circle_seal',pal:PGR,gain:.55,delay:.15}); st.sg2.a=.6; });
  GFX.add(T_DRA+.55-T_RUNE,(k,t)=>{ if(st.dead||!F.on) return; const m=K.mats(), D=T_DRA+.55-T_RUNE, i=eo3(sat(t/.75)), f=sat((t-(D-.5))/.5), a=i*(1-f)*(.85+.15*Math.sin(t*6)), rr=RC*(.3+.7*i);
    F.quad(m.glowG,x0,y0,rr*1.15,rr*1.15,0,{...col(PF),a:.34*a,gain:1}); F.quad(m.glowG,x0,y0,RC*.5,RC*.5,0,{...col(PG),a:.22*a,gain:1.1}); },T_RUNE);
  { const RL=[0,1,2,3].map(j=>{ const a=j*PI/2+.4; return GFX.light(x0+Math.cos(a)*RC*.6,y0+Math.sin(a)*RC*.6*FSY,RC*.75,PG.l,0,.1,{z:150,hold:T_DRA+.55}); });
    GFX.add(T_DRA+.55,(k,t)=>{ const D=T_DRA+.55-T_RUNE, u=t-T_RUNE, a=u<0?0:eo3(sat(u/.75))*(1-sat((u-(D-.5))/.5)); for(const L of RL) L.a=.5*a; if(k>=.99) for(const L of RL) L.hold=0; }); }
  [[.3,0],[.34,1.3],[.4,2.5],[.37,3.7],[.45,4.9]].forEach(([dl,a])=>after(T_RUNE+dl,()=>{ const r=RC*.42, x=x0+Math.cos(a)*r, y=y0+Math.sin(a)*r*FSY;
    K.vcolumn(x,y,{r:50+40*h01(a*3.1),h:380+360*h01(a*5.7),dur:.8+.3*h01(a*2.3),rise:.14,out:.4,pal:PF,twist:3,turb:.8,heat:1.1,taper:.35+.2*h01(a),gain:.85,band:1,btop:.62}); K.flare(x,y,30,{pal:PF,s:170,dur:.12,gain:1.6}); sfx('slash',1.6,.25); }));

  // ---- the walls: tall tongues of real fire round the circle (tall behind him, low in front so he stays in sight), each with a burning foot and
  // dark smoke rolling up behind it; white-gold shafts of light fall from above the screen between them; everyone on the field is thrown up
  const RW=RC*.62, WL=[[200,1500,.06],[232,2300,.0],[262,2900,.1],[290,2500,.03],[322,1900,.12],[352,1300,.16],[160,1200,.2],[90,600,.22]];
  after(T_WALL,()=>{ Cn.move({y:y0-700,zoom:.8,tilt:.2,roll:-.02},.7,'out'); GFX.ambient(.72,.46,.36,2); SFX.fire(1.8,.6); sfx('boom',1.2,.6); Cn.shake(.5); if(st.sg1) st.sg1.kick(); if(st.sg2) st.sg2.kick(); });
  WL.forEach(([deg,h,dl],i)=>after(T_WALL+dl,()=>{ const a=deg*PI/180, x=x0+Math.cos(a)*RW, y=y0+Math.sin(a)*RW*FSY, dur=T_DRA+.6-T_WALL-dl+.1*h01(i*3.3);
    fireCard(x,y,h,dur,{rise:.22,hold:.62,wide:.95,gain:2.6,flip:i%2===1});
    if(h>1400) K.vsmoke(x+40,y-60,{s:420,z:h*.55,dur:dur+.4,rise:700,a:.7,c:'#120e0c',c2:'#3e322c',delay:.15});
    K.flare(x,y,40,{pal:PG,s:300,dur:.14,gain:2}); K.dust(x,y,{n:7,r:220,sp:[200,700],a:.45}); K.sparks(x,y,60,{pal:PF,n:12,sp:[200,800],up:2400,life:[.4,1]}); }));
  [[250,0,170,1,0,.48],[300,.17,120,.8,0,.42],[226,.3,26,.9,23,.5],[275,.09,18,1,31,.3],[318,.38,22,.8,27,.56],[205,.12,14,.7,37,.62]].forEach(([deg,dl,w,br,fk,rr])=>{ const a=deg*PI/180; shaft(x0+Math.cos(a)*RW*rr,y0+Math.sin(a)*RW*rr*FSY,w,fk?.7:1,T_WALL+.12+dl,{br,flick:fk}); });
  after(T_WALL+.12,()=>{ for(const e of onScreen(300)){ if(e.dead) continue; dmg(e,Dm*.06,{push:120,up:1600,sx:x0,sy:y0}); K.mark(e,'burn',{dur:2.2,pal:PF}); } });

  // ---- the dragon: comes down out of the tall fire behind him, circles him round the whole field with a thick burning body long enough to cross the
  // screen and dark smoke torn off behind it, then coils in on him and goes into his axe
  const RX=hw*.66, RY=hh*.66/FSY, DL=T_DRE-T_DRA, PS0=-PI/2-.35, LAP=TAU*1.0+1.2;
  const dpos=u=>{ const ps=PS0+u, rf=1-.94*smo(sat((u-(LAP-1.5))/1.5)), zi=Math.pow(1-sat(u/1.2),2); return [x0+Math.cos(ps)*RX*rf,Y0-40/FSY+Math.sin(ps)*RY*rf,mix(380,BODY*.7,1-rf)+1500*zi+90*Math.sin(u*2.6)*rf]; };
  const dhit=new Set();
  after(T_DRA,()=>{ Cn.move({x:x0,y:y0-380,zoom:.8,tilt:.12,roll:.025},DL,'lin'); SFX.roar(1.4,.9); SFX.fire(1.2,.6); Cn.SND.shing(.6,.3); });
  GFX.add(DL,(k,t)=>{ if(st.dead) return; const u=LAP*(.25*k+.75*smo(k)), fin=1-sat((k-.88)/.12), sd=21.7, N=10, SEG=.34, m=K.mats(), S=smt();
    const P=[]; for(let j=0;j<=N;j++) P.push(dpos(u-j*SEG*(.55+.45*fin)));
    const rad=q=>mix(300,60,Math.pow(q,1.1))*(1+.28*Math.sin(q*13-t*9)+.12*Math.sin(q*29+t*5))*(q<.12?.75+2*q:1)*(.35+.65*fin);
    // the body, tail first; each piece runs well past the next so they melt into one body
    for(let j=N-1;j>=0;j--){ const q=j/N, b=lerp3(P[j],P[j+1],1.6);
      jetSeg(lerp3(P[j],P[j+1],-.25),b,rad(q),rad((j+1)/N),{pal:j<1?PF:j<6?PE:PE,heat:mix(1.35,.45,q),turb:.6+.6*q,smoke:j>6?.9:mix(.08,.5,q),cS:j>6?'#120c0a':PE.d,cK:'#6a5048',dens:10,gain:1.45,speed:9,seed:sd+j,band:.2,lit:.4,flow:1.2}); }
    // a soft glowing body and a white-hot spine along it hide the joins
    const body=[]; for(let j=0;j<N*2;j++){ const jj=j/2, i0=Math.floor(jj), p=lerp3(P[i0],P[Math.min(N,i0+1)],jj-i0); body.push({...W3(p),q:jj/N}); }
    F.ribbon(S.body,body.slice(0,N*2-5).map(p=>({...p,w:rad(p.q)*1.2})),{...col(PE),a:.35,gain:1.3});
    // a flame mane along the neck and back: tongues thrown up and back, each its own size
    for(let j=1;j<5;j++){ const q=P[j], g=nrm(sub(P[j-1],P[j])), hh2=(260-40*j)*(1+.3*Math.sin(t*14+j*2))*(.4+.6*fin); jetSeg(add(q,[0,0,rad(j/N)*.5]),add(add(q,scl(g,-hh2*.8)),[0,0,hh2*1.3]),rad(j/N)*.45,16,{pal:PF,heat:1.3,turb:1.2,smoke:.15,dens:9,gain:1.3,speed:6,seed:sd+40+j,band:.5,btop:.7}); }
    // the head: a skull, a long muzzle, the open jaw, two horns swept back, a mane of flames, two burning eyes
    const H=P[0], f=nrm(sub(P[0],P[1])), sdv=nrm(crs(f,[0,0,1])), upv=nrm(crs(sdv,f)), hs=.4+.6*fin;
    vol('blast',H[0],H[1]*FSY,H[2],{ex:480*hs,ey:400*hs,ez:360*hs,pa:[.6,.45,2.6,t*.8],pb:[1.5,1.2,1,.6],dens:12,gain:1.5,seed:sd+30,smoke:.08,fire:.6,...col(PG),cS:PF.d,cK:'#8a5a40',amb:.1,key:1.2,rim:.3,glow:.8,band:.25});
    jetSeg(add(H,scl(f,120*hs)),add(add(H,scl(f,820*hs)),scl(upv,40*hs)),230*hs,120*hs,{pal:PW,heat:1.5,turb:.4,smoke:.04,dens:11,gain:1.4,speed:8,seed:sd+31});
    jetSeg(add(H,add(scl(f,100*hs),scl(upv,-130*hs))),add(H,add(scl(f,640*hs),scl(upv,-420*hs))),150*hs,60*hs,{pal:PF,heat:1.3,turb:.5,smoke:.1,dens:10,gain:1.3,speed:8,seed:sd+32});
    for(const sg of [-1,1]) jetSeg(add(H,add(scl(sdv,sg*150*hs),scl(upv,170*hs))),add(H,add(add(scl(f,-760*hs),scl(sdv,sg*400*hs)),scl(upv,620*hs))),100*hs,20*hs,{pal:PW,heat:1.4,turb:.3,smoke:.04,dens:10,gain:1.4,speed:6,seed:sd+33+sg});
    jetSeg(add(H,add(scl(f,-150*hs),scl(upv,220*hs))),add(H,add(scl(f,-700*hs),scl(upv,520*hs))),200*hs,50*hs,{pal:PE,heat:1.1,turb:1.1,smoke:.2,dens:9,gain:1.2,speed:7,seed:sd+36});
    for(const sg of [-1,1]){ const e=add(H,add(add(scl(f,250*hs),scl(sdv,sg*130*hs)),scl(upv,150*hs))); F.bill(m.glowO,e[0],e[1]*FSY,e[2],80*hs,30*hs,0,{...col(PW),a:1,gain:3.6}); }
    GFX.light(H[0],H[1]*FSY,1400,PF.l,1.1,.04,{z:H[2]});
    // dark smoke rolls off the body and stays hanging where it passed; burning scales fall off it
    if(t-(st.vs||0)>.1&&k<.7){ st.vs=t; const q=P[N-1], hq=P[0]; if(k<.75&&(st.sc=(st.sc||0)+1)%2===0) K.cool(hq[0],hq[1]*FSY,{kind:'scorch',r:340,rot:rand(0,TAU),pal:PF,life:2.4,hot:.75,light:0}); K.vsmoke(q[0],q[1]*FSY,{s:360,z:Math.max(0,q[2]-200),dur:1,rise:380,a:.8,c:'#100c0a',c2:'#3e322c'}); }
    for(let i=0;i<3;i++){ const q=P[1+((Math.random()*8)|0)]; GFX.pt({x:q[0]+rand(-80,80),y:q[1]*FSY,z:q[2],vx:rand(-300,300),vy:rand(-150,150),vz:rand(-50,300),g:1200,drag:.8,life:rand(.35,.7),s:rand(4,8),m:3,len:.05,c:GFX.rgb(i?PF.s:PG.h),c2:PF.b,L:3}); }
    // whoever the body passes through is struck, thrown outward and set burning
    for(const e of onScreen(300)){ if(dhit.has(e)||e.dead) continue; if(Math.hypot(e.x-H[0],(e.y-H[1]*FSY)/FSY)<520){ dhit.add(e); dmg(e,Dm*.08,{push:300,up:1300,sx:x0,sy:y0}); if(dhit.size<5) K.ehit(e,{pal:PF,pw:1.2,ring:0}); K.mark(e,'burn',{dur:2,pal:PF}); } } },T_DRA);
  after(T_DRE-.05,()=>{ for(const e of onScreen(300)) if(!dhit.has(e)&&!e.dead){ dhit.add(e); dmg(e,Dm*.08,{push:200,up:900,sx:x0,sy:y0}); } });

  // ---- the charge: the dragon's fire goes into his axe - embers spiral in from the whole field, the point in his axe grows white-gold; the field holds its breath
  after(T_DRE-.3,()=>{ st.gth=K.gather(x0,y0,BODY*.7,{dur:T_PEAK-T_DRE+.3,pal:PW,r:520,R:2200,n:1.6,gain:1.2}); Cn.SND.inhale(.5,.55); });
  after(T_DRE-.3,()=>{ for(let i=0;i<70;i++){ const a=i*2.39996, r=900+1500*h01(i*3.7), z=60+700*h01(i*5.1); GFX.pt({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,z,oc:[x0,y0,BODY*.7],or:r,oa:a,ow:2.6,ok:r/(.35+.2*h01(i*2.2)),oz0:z,rmin:40,life:.6,s:i%3?4:7,m:3,len:.06,c:GFX.rgb(i%4?PG.s:PW.h),c2:PF.b,c3:PW.m,L:3,pri:1}); } });
  GFX.add(T_PEAK-T_DRE+.3,(k,t)=>{ if(st.dead||!F.on) return; const m=K.mats(), q=window.MK&&MK.on()?MK.wpt('xc'):[pl.x,pl.gy,BODY*.7], g=eo3(k), fl=1+.08*Math.sin(t*40);
    F.bill(m.glowO,q[0],q[1],q[2],(80+200*g)*fl,(80+200*g)*fl,0,{...col(PW),a:.95,gain:2.8}); F.bill(m.glowO,q[0],q[1],q[2],(300+500*g)*fl,(30+30*g),0,{...col(PG),a:.75,gain:2.2});
    GFX.light(q[0],q[1],600+900*g,PW.l,.6+.6*g,.04,{z:q[2]}); },T_DRE-.3);
  after(T_DRE,()=>{ Cn.hush(T_PEAK-T_DRE,{a:.45}); Cn.move({x:x0,y:y0-500,zoom:.95,tilt:.16,roll:0},T_PEAK-T_DRE,'io'); });
  after(T_PEAK-.2,()=>mk('xRise',{yaw:yawTo(PI),blend:.04}));

  // ---- the climax: one huge crescent of white-gold light rises from the floor past the top of the screen; a near-white flash; fire over the whole screen
  after(T_PEAK,()=>{ if(st.gth) st.gth.release({s:1.4});
    Cn.peak(x0,y0-BODY*.6,{ca:.03,blur:.14,tint:'#fff2d8',a:.6,hold:.025,out:.16}); hitstop=Math.max(hitstop,.1); Cn.shake(1.4); GFX.light(x0,y0-200,hw*1.3,PW.l,1.2,.5,{z:600}); Cn.SND.hit(1.3); sfx('boom',2.4,1); SFX.sub(1);
    Cn.move({zoom:.74,tilt:.12,roll:0},.24,'out'); GFX.ambient(1,.86,.7,40); after(.08,()=>GFX.ambient(.85,.6,.45,6)); after(.4,()=>GFX.ambient(.62,.44,.38,2.5));
    K.flare(x0,y0,BODY*.6,{pal:PW,s:700,dur:.14,gain:2.8});
    // the crescent: an arc in the screen plane from the floor at his left up past the top of the screen at his right, thickest in the middle
    { const S=smt(), m=K.mats(), cx=x0+1900, cz=-1300, R=3300, a0=2.72, a1=1.05, Np=30;
      GFX.add(.75,(k,t)=>{ if(st.dead||!F.on) return; const head=eo3(sat(t/.09)), tail=sat((t-.2)/.5), f=sat((t-.3)/.45), mid=[], outE=[], inE=[];
        for(let j=0;j<=Np;j++){ const u=j/Np; if(u>head||u<tail*tail) continue; const a=mix(a0,a1,u), w=(20+620*Math.pow(Math.sin(PI*u),1.15))*(1-.5*f), c=Math.cos(a), sn=Math.sin(a);
          outE.push({x:cx+c*R,y:y0+20,z:cz+sn*R,w:16+20*Math.sin(PI*u)}); mid.push({x:cx+c*(R-w*.5),y:y0+20,z:cz+sn*(R-w*.5),w:w*.5}); inE.push({x:cx+c*(R-w),y:y0+20,z:cz+sn*(R-w),w:8+10*Math.sin(PI*u)}); }
        if(mid.length<2) return;
        F.ribbon(S.body,mid.map(p=>({...p,w:p.w*1.5})),{...col(PG),a:.45*(1-f),gain:1.5});
        F.ribbon(S.body,mid,{cA:'#a86a1c',cB:'#ffd890',cM:'#fff2d0',cC:'#ffffff',a:(1-f*f)*.95,gain:2.2});
        F.ribbon(S.core,outE,{...col(PW),a:1-f,gain:3.8});
        F.ribbon(m.trC,inE,{...col(PG),a:.9*(1-f),gain:2}); }); }
    K.sparks(x0,y0,BODY*.6,{pal:PW,n:34,sp:[900,2800],up:1400,life:[.3,.8],s:2.5,len:.08});
    K.vring(x0,y0,{r:hw*1.2,r0:220,dur:.8,tube:.08,a:.55,c:'#2a2018',c2:'#9a7458'});
    // fire bursting over the whole screen: a wave of real flames from him to the edges, the biggest ones in the middle, fireballs among them
    const fv=hw/.74, fh=hh/.74;
    // (kit update 13) one fire, not fires: it catches at him and runs out to the edges, its tongues joined at the foot, then breaks up and burns down from the far edge inward
    { const FP=[]; for(let i=0;i<26;i++){ const x=x0+(h01(i*3.1+.7)-.5)*fv*1.95, y=y0-fh*.95+h01(i*5.7+.3)*fh*1.7, d=Math.hypot(x-x0,(y-y0)/FSY);
        if(d<260||i%3) continue; FP.push([x,y,mix(1400,500,sat(d/(fv*1.1)))*(.35+.9*Math.pow(h01(i*7.3),1.5))]); }
      for(let i=0;i<15;i+=3){ const a=h01(i*4.3)*TAU, d=hw*(.18+.95*h01(i*7.1)); FP.push([x0+Math.cos(a)*d,y0+Math.sin(a)*d*FSY*.85,i%5===0?760+400*h01(i*2.9):200+420*h01(i*2.9)]); }
      K.firefield(x0,y0,{pts:FP,from:[x0,y0],speed:4200,dur:2.6,out:1.25,pal:PF,keep:[x0,y0,260],smoke:0}); }
    for(let i=0;i<5;i++){ const a=h01(i*3.3+.2)*TAU, d=hw*(.25+.5*h01(i*5.1)), x=x0+Math.cos(a)*d, y=y0+Math.sin(a)*d*FSY; after(d/4200,()=>{ K.vblast(x,y,{s:230+330*h01(i*7.7),pal:PF,dur:1+.5*h01(i*2.1),heat:1.25,rise:340,smoke:.22,c:'#1c120e',c2:'#5a3a2a',band:.5,lit:.5}); K.sparks(x,y,40,{pal:PG,n:8,sp:[300,900],up:1500,life:[.3,.7]}); }); }
    // every body on the field is thrown out and up, burning
    const Ls=onScreen(300).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0));
    Ls.forEach((e,i)=>{ K.knock(e,{from:[x0,y0],dist:680,up:2200,fx:0}); if(i<3) K.ehit(e,{pal:PW,pw:1.6,ring:0}); });
    after(.05,()=>Cn.shake(1)); after(.12,()=>Cn.shake(.8));
    after(.12,()=>Cn.sweep(x0,y0,Dm*.72,{speed:4200,push:1.3,max:.4})); });

  // ---- after: the whole floor burns - scorch and lava out to the screen edges, fires of every size (some tall) burning down at their own pace,
  // columns of smoke going up - and it all cools over two to three seconds; embers lift, ash comes down
  after(T_PEAK+.04,()=>{ K.cool(x0,y0,{kind:'scorch',r:hw*1.35,ry:hw*1.35,pal:PF,life:5.2,hot:.6,start:.1,light:0,gain:1.1});
    K.cool(x0,y0,{kind:'crack2',r:hw*.95,rot:.4,pal:PF,life:5,hot:.85,grow:.25,light:0}); K.cool(x0,y0,{kind:'ring',r:RC*.42,pal:PG,life:2.6,hot:.75,light:0});
    const LF=GFX.light(x0,y0,hw*1.1,PF.l,.8,4.6,{z:120,hold:.6,flick:.12}); GFX.add(4.6,k=>{ LF.a=.8*(1-k); }); });
  for(let i=0;i<6;i++){ const a=i/6*TAU+.5+(h01(i*9.1)-.5)*.6, d=hw*(.35+.5*h01(i*4.7)), x=x0+Math.cos(a)*d, y=y0+Math.sin(a)*d*FSY;
    after(T_PEAK+.1+.05*i,()=>K.cool(x,y,{kind:i%2?'lava':'crack',r:420+260*h01(i*6.1),rot:a,pal:PF,life:4.4+.8*h01(i*2.3),hot:.9,light:0})); }
  [[-.45,-.35,620],[.4,-.45,440],[.55,.2,760],[-.7,.05,520]].forEach(([fx,fy,sz],i)=>after(T_PEAK+.45+.3*h01(i*3.9),()=>K.vsmoke(x0+fx*hw,y0+fy*hh,{s:sz,z:150,dur:2+.5*h01(i*1.7),rise:700+500*h01(i*2.9),a:.34,c:'#1c120e',c2:'#5a3a2a',vx:-120,lit:.4})));
  let an=0;
  GFX.add(4.4,(k,te)=>{ const want=Math.floor(Math.min(te,4.2)*60*(GFX.QK||1)); let n=0;
    while(an<want&&n++<6){ an++; const px=x0+(h01(an*1.9)-.5)*hw*1.8, py=y0-hh*.9+h01(an*4.3)*hh*1.7, ash=an%3===0;
      if(ash) GFX.pt({x:px,y:py,z:500+h01(an*6.1)*700,vx:-50+(h01(an*2.7)-.5)*120,vy:-20,vz:-(150+h01(an*8.3)*160),g:0,drag:.2,life:1.6+h01(an*3.1)*.8,s:4+h01(an*9.7)*5,rot:h01(an*5.3)*TAU,vr:(h01(an*7.9)-.5)*6,m:11,b:'alpha',c:GFX.rgb('#3a3436'),c2:'#0c0a0c',fk:4,L:1});
      else GFX.pt({x:px,y:py,z:10+h01(an*6.1)*50,vx:(h01(an*2.7)-.5)*120,vy:0,vz:100+h01(an*8.3)*260,g:-40,drag:.6,life:.9+h01(an*3.1)*.9,s:2.5+h01(an*9.7)*3.5,m:3,len:.03,c:GFX.rgb(an%2?PF.s:PG.m),c2:PE.b,L:3}); } },T_PEAK);
  after(TE-1.05,()=>{ Cn.back(1); GFX.ambient(1,1,1,2); });
  after(TE,()=>{ st.dead=true; X.ultStop(); }); }

window.AxeUlt1={cast};
})();

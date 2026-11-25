// BERSERKER ultimate 2 (ax_ult2) 대지분쇄 - plan: _gen/v3/axe_plan.md "궁극기 2".
// prepare: he spins on the spot with the axe head dragged through the floor (sparks, a scorched ring) -> gather: he leaps high (the camera
// follows him up and pulls out) while fire wraps the axe and swells -> fall: a fireball dropping straight down with a long fire tail ->
// climax: the chop lands; radial fissures race to the screen edges, lava and fire spout along them in sequence, slabs of crust heave up
// between them and every body is thrown -> what is left: the cracks cool from white through red to soot and smoke.
// The star is the impact point and the heaving crust, not a fireball over the field (that is the pyro's eruption).
'use strict';
(()=>{
const X=RPG.sv, FSY=X.FSY, {A,BODY,dmg,view,onScreen,ultStart,ultStop,sfx}=X, V=X.V;
const K=window.K3, F=window.FX3, PI=Math.PI, TW=PI*2;
const mix=(a,b,k)=>a+(b-a)*k, sat=v=>Math.max(0,Math.min(1,v)), eo3=k=>1-Math.pow(1-k,3), eio=k=>k<.5?2*k*k:1-2*(1-k)*(1-k);
const hs=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); };
// palette: same values as sk_axe.js PAL (that file loads after this one)
const PAL={
  fire:{d:'#1a0602',b:'#8a1a06',m:'#ff5a14',h:'#fff4d8',l:'#ff6a1c',s:'#ffc24a'},
  ember:{d:'#220200',b:'#d81204',m:'#ff6a14',h:'#ffd070',l:'#ff3410',s:'#ff9a50'},
  gold:{d:'#2a1606',b:'#b8741e',m:'#ffd27a',h:'#fff6dc',l:'#ffae34',s:'#ffe6a0'},
  smoke:{c:'#1a1614',c2:'#5e5048'}
};
const PF=PAL.fire, PE=PAL.ember, PG=PAL.gold, ROCK='#4a403a';
const mkOn=()=>!!(window.MK&&MK.on());
const mk=(n,o)=>{ if(mkOn()) MK.play(n,o); };
const yawTo=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a));
// world point of the blade (the middle of the axe head); a stand-in over his head when the mannequin is off
const blade=()=>mkOn()?MK.wpt('xc'):[pl.x,pl.gy,BODY*1.25];
const spark=(x,y,z,vx,vy,vz,o={})=>GFX.pt({x,y,z,vx,vy,vz,g:o.g??1500,drag:o.drag??.4,life:o.life??.5,s:o.s??3.5,m:3,len:o.len??.05,c:GFX.rgb(o.c||PF.s),c3:o.c3||PF.h,c2:o.c2||PE.b,L:3});
const puff=(x,y,z,s,o={})=>GFX.pt({x,y,z,vx:o.vx||0,vy:o.vy||0,vz:o.vz??60,g:-20,drag:1,life:o.life??1.2,s,grow:o.grow??s*1.6,m:5,b:'alpha',c:GFX.rgb(o.c||'#2a1e18'),c2:'#000000',c3:o.c3||'#8a4a26',er:.9,ns:1.2,w:1,a:o.a??.55,L:o.L??2});

function cast(id){ ultStart(id); if(F&&F.prepDeep) F.prepDeep();
  const Cn=X.cine, {hw,hh}=view(), Dm=65000*A.mul(id), x0=pl.x, y0=pl.gy, yaw0=mkOn()?MK.M.yaw:0;
  // beats: drag ends / leap, apex, fall starts, impact, end
  const TD=.78, TA=1.5, TF=2.22, TC=2.62, TE=5.35, H=820;
  // the camera at the climax: what it shows decides how long the fissures must be to leave the screen
  const ZC=.56, HWc=hw/ZC, HHc=hh/ZC;
  let t=0, lift=0, gone=false, O=null, J=null;
  const zOf=tt=>tt<TD?0:tt<TA?H*eo3((tt-TD)/(TA-TD)):tt<TF?H*(1+.06*Math.sin(PI*.5*sat((tt-TA)/(TF-TA)))):tt<TC?H*1.06*(1-Math.pow(sat((tt-TF)/(TC-TF)),2.2)):0;
  // ---- one clock: his height (the figure is drawn at its floor point, so lifting him = sliding that point up the screen),
  // the shadow left on the floor, the dragged blade's sparks
  const km=K.mats(); let sp=0;
  V.ultTick=dt=>{ t+=dt; if(gone) return; lift=zOf(t); pl.gy=y0-lift; follow();
    if(t<TD&&mkOn()){ const k=sat((t-.12)/(TD-.18)); MK.M.yaw=yaw0-5.4*eio(k);
      if(k>0&&k<1&&t-sp>.016){ sp=t; const q=MK.wpt('xd'), a=MK.M.yaw-PI/2; for(let i=0;i<3;i++){ const v=mix(300,1100,Math.random()), b=a+(Math.random()-.5)*1.1; spark(q[0],q[1],8,Math.cos(b)*v,Math.sin(b)*v*FSY,mix(150,700,Math.random()),{life:mix(.25,.55,Math.random()),c:i?PF.s:PF.h}); } } } };
  // the shadow of him and the floor light under him: it shrinks while he climbs, closes in and heats while he falls
  GFX.add(TC+.02,(k,tt)=>{ if(!F.on||tt<TD) return; const u=sat(lift/H), r=mix(120,260,u)*(tt>TF?mix(1,.55,sat((tt-TF)/(TC-TF))):1);
    F.quad(km.dark,x0,y0,r,r*.8,0,{a:.55*(1-.45*u)+.25*sat((tt-TF)/(TC-TF))}); });
  const Lp=GFX.light(x0,y0,300,PF.l,.3,.3,{hold:TC,z:40,flick:.06});
  GFX.add(TC,(k,tt)=>{ const f=sat((tt-TD)/(TC-TD)); Lp.r=mix(300,1300,f*f); Lp.a=mix(.3,1.15,Math.pow(f,1.6)); });

  // ---- prepare (0 - TD): the axe goes into the floor and he wheels round it once, the head ploughing a ring of sparks and heat
  mk('xPlant',{yaw:yaw0,blend:.08}); GFX.ambient(.5,.42,.46,3); Cn.move({x:x0,y:y0-BODY*.55,zoom:1.55,tilt:.08,roll:.02},.6,'io'); SFX.whoosh(.8,.5); sfx('slash',.6,.4);
  after(.1,()=>{ const q=blade(); K.flare(q[0],q[1],20,{pal:PF,s:160,dur:.16,gain:2.4}); K.dust(q[0],q[1],{n:8,r:30,sp:[200,600],a:.4}); Cn.shake(.25); });
  K.cool(x0,y0,{kind:'ring',r:200,pal:PF,life:2.4,hot:.5,grow:TD-.1,gain:1.2,light:0,delay:.12});
  after(.35,()=>Cn.SND.shing(.8,.3));
  // ---- leap (TD): the floor kicked down under him, a ring of dust, the axe swung up over his head
  after(TD,()=>{ mk('xRaise',{yaw:yaw0+.3,blend:.12}); K.vring(x0,y0,{r:340,r0:70,dur:.45,tube:.14,c:'#1a1410',c2:'#4a3a30',a:.6,lit:.4});
    K.cool(x0,y0,{kind:'crack2',r:260,pal:PF,life:2,hot:.35,light:0}); K.dust(x0,y0,{n:14,r:60,sp:[300,900],a:.5}); K.chunks(x0,y0,{n:3,r:90,sp:[200,500],up:1200,kind:'shard',s:[14,30],rock:ROCK,pal:PF,life:.9});
    Cn.shake(.45); hitstop=Math.max(hitstop,.03); sfx('boom',.7,.4); SFX.whoosh(1.2,.6);
    Cn.move({x:x0,y:y0-H*.74,zoom:.68,tilt:0,roll:-.02},TA-TD+.1,'out'); GFX.ambient(.42,.34,.4,2); });
  // ---- gather (TD - TF): fire wraps the axe and swells; heat drawn in from far off; at the top he hangs and it keeps growing
  after(TD+.08,()=>{ const q=blade(); O=K.vorb(q[0],q[1],q[2],{r:50,dur:TC-TD+.04,pal:PF,heat:.85,core:.12,in:.25,out:.05,spin:2.6,band:.7,flow:.8,gain:.85});
    J=K.vjet(q[0],q[1],q[2],0,{len:160,r:60,r0:30,dur:TC-TD+.02,pal:PF,pitch:1.5,heat:1.25,turb:.9,speed:6,in:.2,out:.06,band:.9,btop:.6,lit:.6,flow:1.2});
    Cn.drone(42,.3); });
  // the fire follows the axe on the update clock (so it is where the axe is on the frame it is drawn): while he falls it closes round all of
  // him - the ball slides from the axe down onto his body and the flame streams up behind
  let bx=x0, by=y0, bz=0, u=0, fu=0;
  function follow(){ if(!O) return; const q=blade(); u=sat((t-TD)/(TF-TD)); fu=sat((t-TF)/(TC-TF));
    bx=mix(q[0],pl.x,.55*fu); by=mix(q[1],pl.gy,.55*fu); bz=mix(q[2],BODY*.75,.55*fu);
    O.x=bx; O.y=by; O.z=bz; O.r=mix(60,300,Math.pow(u,1.2))+120*fu;
    J.x=bx; J.y=by; J.z=bz+O.r*.35; J.len=mix(200,700,u)+1300*fu; J.r=mix(70,190,u)+70*fu; J.pitch=1.5; }
  GFX.add(TC,(k,tt)=>{ if(!O) return; const q=blade();
    // heat drawn in to the axe from round about: embers sliding in on curling paths, more as it swells
    if(fu===0&&Math.random()<.35+.6*u){ const a=Math.random()*TW, r0=mix(500,1000,Math.random()); GFX.pt({x:q[0]+Math.cos(a)*r0,y:q[1]+Math.sin(a)*r0*FSY,z:q[2],oc:[q[0],q[1],q[2]],or:r0,oa:a,ow:mix(1.2,2,Math.random()),ok:r0*mix(1.4,2,Math.random()),oz0:q[2]+mix(-150,150,Math.random()),rmin:O.r*.7,life:1,s:mix(3,5,Math.random()),m:3,len:.05,c:GFX.rgb(Math.random()<.3?PF.h:PF.s),c3:PF.m,c2:PE.b,fk:9,L:3,pri:1}); }
    // sparks peeling off the fire; in the fall they stream straight up past him
    if(Math.random()<.5+.5*u){ const a=Math.random()*TW, v=mix(80,300,Math.random()); spark(bx+Math.cos(a)*O.r*.6,by+Math.sin(a)*O.r*.3,bz,Math.cos(a)*v,Math.sin(a)*v*FSY,fu>0?mix(900,1800,Math.random()):mix(200,600,Math.random()),{g:fu>0?-200:400,life:mix(.3,.6,Math.random()),len:fu>0?.09:.05}); } });
  after(1.15,()=>Cn.SND.inhale(1.1,.5));
  after(TA,()=>{ Cn.move({zoom:.76,roll:.025},TF-TA,'lin'); K.flare(blade()[0],blade()[1],blade()[2],{pal:PG,s:260,dur:.2,gain:2}); });
  // ---- fall (TF - TC): the fire lets go of the gather and he drops; the camera dives with him
  after(TF,()=>{ const q=blade(); K.flare(q[0],q[1],q[2],{pal:PG,s:420,dur:.14,gain:2.2}); SFX.whoosh(1.6,.8); Cn.move({x:x0,y:y0-BODY*.7,zoom:.98,tilt:0,roll:0},TC-TF,'in'); GFX.ambient(.36,.28,.32,6); });
  after(TC-.2,()=>mk('xChop',{yaw:yaw0+.3,blend:.04}));
  after(TC-.2,()=>Cn.hush(.2,{a:.4}));

  // ---- climax (TC): the chop lands
  const N=7, a0=hs(x0*.01)*TW, SPD=3000;
  // fissures: each a ragged line of 3 runs from the impact to past the screen edge; [angle, points]
  const FS=[];
  for(let i=0;i<N;i++){ const a=a0+i/N*TW+(hs(i*3.1)-.5)*.5, ca=Math.cos(a), sa=Math.sin(a),
      L=Math.min(HWc/Math.max(.05,Math.abs(ca)),HHc/Math.max(.05,Math.abs(sa)*FSY))*1.15, P=[[x0+ca*90,y0+sa*90*FSY,90]];
    for(let j=1;j<=3;j++){ const d=L*[0,.3,.62,1][j], off=(hs(i*7.3+j*1.7)-.5)*.32*d*(j<3?1:.6), px=x0+ca*d-sa*off, py=y0+(sa*d+ca*off)*FSY; P.push([px,py,Math.hypot(px-x0,(py-y0)/FSY)]); }
    FS.push({a,P}); }
  const ON=k=>k/SPD;
  after(TC,()=>{ gone=true; pl.gy=y0; lift=0; if(O) O.dead=true; if(J) J.dead=true;
    Cn.peak(x0,y0-80,{ca:.03,blur:.16,tint:'#ff5a14',hold:.05,out:.3}); hitstop=Math.max(hitstop,.1); Cn.shake(1.6); Cn.SND.hit(1); sfx('boom',2.2,1);
    GFX.light(x0,y0,hw*1.55,PF.l,1.2,.45,{z:260}); GFX.light(x0,y0,700,'#fff2d0',1.1,.12,{z:80});
    Cn.move({x:x0,y:y0-BODY*.4-70,zoom:ZC,tilt:.22,roll:0},.32,'out'); GFX.ambient(.86,.5,.4,9); after(.12,()=>GFX.ambient(.6,.42,.4,3));
    // the point of impact: white heat where the axe went in, a fire ring rolling out over the floor, the dust ring after it
    const q=blade(); K.flare(q[0],q[1],40,{pal:PG,s:520,dur:.12,gain:2.6}); K.flare(x0,y0,30,{pal:PF,s:900,sx:2.2,sy:.5,dur:.18,gain:1.6});
    K.vring(x0,y0,{r:700,r0:160,dur:.45,tube:.24,heat:1.2,pal:PF,lit:.6,lump:.9});
    K.cool(x0,y0,{kind:'crater',r:440,pal:PF,life:4.2,hot:.75,start:.15,gain:1,light:0});
    K.cool(x0,y0,{kind:'lava',r:240,pal:PF,life:3.6,hot:.85,gain:1.2,light:0});
    K.sparks(x0,y0,30,{pal:PG,n:30,sp:[700,2400],up:2200,life:[.4,1],s:2.4,len:.09});
    K.chunks(x0,y0,{n:5,r:220,sp:[400,1100],up:1500,kind:'stone',s:[20,46],rock:ROCK,pal:PF,life:1.1});
    K.dust(x0,y0,{n:20,r:200,sp:[700,1600],a:.5,s:1.3,c:'#3a2a22'});
    after(.06,()=>Cn.shake(1.1)); after(.16,()=>Cn.shake(.8));
    // the crust right round the crater: plates levered up with their inner edges raised, behind him (never between him and the camera)
    for(let i=0;i<5;i++){ const a=PI*(1.1+.8*i/4)+(hs(i*3.3)-.5)*.2; plate(x0+Math.cos(a)*340,y0+Math.sin(a)*340*FSY,a+PI,230+60*hs(i*5.1),.02*i,.62,i); }
    K.rocks(x0,y0-190,{n:4,r:260,s:[60,150],kinds:['shard','stone','flag','shard'],a0:PI*1.1,a1:PI*1.9,glow:.8,pal:PF,rock:ROCK,rise:.16,over:.25,dur:1.9,dust:.5,dustC:'#3a2e28',shadow:1,delay:.05});
    // every body on the field is struck as the cracks reach it and thrown up off the floor
    for(const e of onScreen(300)){ const d=Math.hypot(e.x-x0,(e.y-y0)/FSY);
      after(Math.min(.5,ON(d)),()=>{ if(e.dead) return; dmg(e,Dm*.3,{sx:x0,sy:y0,crit:true}); K.knock(e,{from:[x0,y0],dist:260+160*hs(e.x),up:1900+500*hs(e.y),stun:1,fx:0}); }); }
    { const L=onScreen(300).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0)); L.slice(0,4).forEach(e=>after(Math.min(.5,ON(Math.hypot(e.x-x0,(e.y-y0)/FSY))),()=>K.ehit(e,{pal:PG,pw:1.5,ring:0}))); }
    // the finishing blow on everyone (ultHit), carried by the second wave of spouts
    after(.75,()=>Cn.sweep(x0,y0,Dm*.7,{speed:3600,push:1.2,max:.5}));
    FS.forEach((f,i)=>fissure(f,i)); slabs(); });

  // one fissure: it is torn open run by run, outward, at the speed of the crack front; spouts of lava and fire stand up out of it in turn
  function fissure(f,i){ const P=f.P;
    for(let j=0;j<3;j++){ const [ax,ay,da]=P[j], [bx,by,db]=P[j+1], w=[130,100,74][j]*(.85+.3*hs(i*2.3+j));
      K.coolLine(ax,ay,bx,by,{w,pal:PF,life:4.1-ON(da),hot:.78,grow:Math.max(.05,ON(db-da)),gain:1.25,delay:ON(da)}); }
    // the spouts: two per crack (the near one is lava thrown at a slant, the far one a column of fire), each its own height and lean
    [[.5,1],[.62+.25*hs(i*5.1),2]].forEach(([u,j],n)=>{ const [ax,ay]=P[j], [bx,by]=P[Math.min(3,j+1)], px=mix(ax,bx,u-(j===1?.3:.4)), py=mix(ay,by,u-(j===1?.3:.4)),
        d=Math.hypot(px-x0,(py-y0)/FSY), dl=ON(d)+.08+.05*n, hk=.75+.5*hs(i*9.7+n), big=n===1, lf=big?1.05:.85;
      after(dl,()=>{ const pitch=big?1.42+.1*hs(i+n):1.05+.25*hs(i*3+n), h0=(big?1500:900)*hk;
        const Hj=K.vjet(px,py,10,f.a+(hs(i*4.4+n)-.5)*.6,{len:h0*.25,r:(big?170:110)*hk,r0:50,dur:lf,pal:big?PF:PE,pitch,heat:big?1.15:1.35,turb:1,freq:2.2+1.4*hs(i+n*2),speed:5,in:.08,out:.3,gain:.7,band:1,btop:.58,lit:.7,flow:1.4});
        GFX.add(lf,(k,tt)=>{ Hj.len=h0*(.25+.75*eo3(sat(tt/.18)))*(1-.45*sat((tt-lf*.55)/(lf*.45))); });
        GFX.light(px,py,520*hk,PF.l,.9,.5,{z:120,flick:.15});
        K.flare(px,py,30,{pal:PF,s:240*hk,dur:.12,gain:1.8});
        // lava thrown out of the mouth, falling back in arcs; dirt off the lip; the smoke it leaves
        for(let m=0;m<7;m++){ const b=hs(i*7.1+n*3+m)*TW, v=200+500*hs(m*2.3+i), c=m%2?PF.m:PE.b; GFX.pt({x:px,y:py,z:30,vx:Math.cos(b)*v,vy:Math.sin(b)*v*FSY,vz:900+1000*hs(m*5.7+n),g:2600,drag:.25,life:.8+.3*hs(m+i),s:7+6*hs(m*4+n),m:8,c:GFX.rgb(c),c2:PE.d,L:3}); }
        K.dust(px,py,{n:4,r:40,sp:[120,380],a:.45});
        after(lf*.7,()=>{ puff(px,py,h0*.4,70*hk,{vz:120,life:1.4,a:.5}); puff(px+30,py,h0*.7,90*hk,{vz:160,life:1.6,a:.4}); });
        Cn.shake(.16+.1*big); if(n===1&&i%2===0) sfx('boom',.7,.35); }); }); }

  // one plate of crust (a layered flagstone mesh, wide and thin) shoved up out of the floor with the edge facing `ta` lifted: it overshoots and
  // settles, its cracks glow and cool, it sinks back and breaks up before the end
  function plate(x,y,ta,w,dl,ln,i){ if(!(F.on&&F.solids&&F.solids())) return; const v=i%4, th=w*.42, rz=ta+(hs(i*2.9)-.5)*.6, life=TE-TC-dl-.05, ca=Math.cos(ta), sa=Math.sin(ta);
    after(dl,()=>{ K.dust(x,y,{n:5,r:w*.3,sp:[200,600],a:.45,c:'#2a201a'}); K.chunks(x,y,{n:2,r:w*.3,sp:[150,450],up:900,kind:'shard',s:[10,22],rock:ROCK,pal:PF,life:.9}); spark(x,y,20,0,0,900,{life:.5});
      GFX.add(life,(k,tt)=>{ const u=sat(tt/.2), up=u<1?1.25*(1-Math.pow(1-u,3)):1+.25*Math.exp(-(tt-.2)*6)*Math.cos((tt-.2)*14), f=sat((tt-(life-.8))/.8), l=ln*up*(1-.5*f);
        F.solid('flag',v,x,y,-th*.35*(1-up)-th*.5*f*f,{M:F.xfw({sx:w,sy:w*.75,sz:th,rz,rx:-sa*l,ry:ca*l}),alb:ROCK,emis:PF.b,rimC:PF.h,spec:.4,rim:.22,heat:.35*sat(1-tt/.5),glow:mix(1.3,.25,sat(tt/2.2)),strata:4,edge:.07,dust:.45,dustC:'#3a2e28',bump:2.4,detail:1,ero:f*.85,seed:i*1.7,
          shadow:i%2?null:[ca*.5+.2,sa*.5+.2,.45*(1-f)],ord:y}); }); }); }
  // the crust along the cracks: a plate on either side of each crack, levered up as the crack front passes, the edge at the crack raised
  function slabs(){ FS.forEach((f,i)=>{ const [ax,ay]=f.P[1], [bx,by]=f.P[2], dx=bx-ax, dy=(by-ay)/FSY, L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L;
      [[.25+.2*hs(i*4.1),1],[.55+.25*hs(i*6.7),-1]].forEach(([u,sd],n)=>{ const off=170+40*hs(i+n), px=mix(ax,bx,u)+nx*off*sd, py=mix(ay,by,u)+ny*off*sd*FSY, d=Math.hypot(px-x0,(py-y0)/FSY);
        // nothing in the strip in front of him
        if(py>y0&&Math.abs(px-x0)<260) return;
        plate(px,py,Math.atan2(-ny*sd,-nx*sd),200+90*hs(i*3.7+n),ON(d)+.03,.55+.2*hs(i*8.1+n),i*2+n+5); }); }); }
  // ---- what is left (TC+.9 - TE): smoke climbs out of the cracks, ash and embers drift, the cracks go dark
  after(TC+1,()=>{ FS.forEach((f,i)=>{ if(i%2) return; const [px,py]=f.P[1]; K.vsmoke(px,py,{s:300+80*hs(i),z:200,dur:1.6,rise:380,a:.55,c:'#1e1814',c2:'#5e5048',lit:.5}); }); });
  after(TC+.9,()=>{ let n=0; GFX.add(TE-TC-1,(k,tt)=>{ const want=Math.floor(tt*40*(GFX.QK||1)); while(n<want){ n++; const px=x0+(hs(n*1.9)-.5)*HWc*2, py=y0+(hs(n*4.3)-.5)*HHc*1.8;
      if(n%3) GFX.pt({x:px,y:py,z:10,vx:(hs(n*2.7)-.5)*60,vy:0,vz:120+hs(n*8.3)*300,g:-40,drag:.5,life:1+hs(n*3.1)*.8,s:2.5+hs(n*9.7)*3,m:3,len:.03,c:GFX.rgb(n%2?PF.s:PE.m),c2:PE.d,L:3});
      else GFX.pt({x:px,y:py,z:400+hs(n*6.1)*500,vx:-50,vy:-20,vz:-(150+hs(n*8.3)*150),g:0,drag:.2,life:1.6,s:5+hs(n*9.7)*5,rot:hs(n*5.3)*TW,vr:3,m:11,b:'alpha',c:GFX.rgb('#3a3436'),c2:'#0c0a0c',L:1}); } }); });
  after(TC+.45,()=>mk('xPlant',{yaw:yaw0+.3,blend:.25}));
  after(TC+.6,()=>GFX.light(x0,y0,900,PF.l,.55,2.2,{z:60}));
  after(TE-.95,()=>{ Cn.back(.9); GFX.ambient(1,1,1,2); });
  after(TE,()=>{ pl.gy=y0; ultStop(); if(window.MK&&MK.free) MK.free(); });
}
window.AxeUlt2={cast};
})();

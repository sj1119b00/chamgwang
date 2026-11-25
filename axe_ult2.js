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
  // beats: drag ends / leap, apex, fall starts (a short hang), impact (a .45 s drop), end. The scars, embers and smoke outlive the end by ~2.5 s.
  const TD=.7, TA=1.2, TF=1.46, TC=1.91, TE=TC+3.6, AFT=2.6, H=820;
  // the camera at the climax: what it shows decides how far the fire must reach to leave the screen
  const ZC=.56, HWc=hw/ZC, HHc=hh/ZC, RM=Math.hypot(HWc,HHc/FSY)*1.05;
  let t=0, lift=0, gone=false, O=null, J=null, Jd=null;
  const zOf=tt=>tt<TD?0:tt<TA?H*eo3((tt-TD)/(TA-TD)):tt<TF?H*(1+.04*Math.sin(PI*.5*sat((tt-TA)/(TF-TA)))):tt<TC?H*1.04*(1-Math.pow(sat((tt-TF)/(TC-TF)),2.4)):0;
  // ---- one clock: his height (the figure is drawn at its floor point, so lifting him = sliding that point up the screen),
  // the fire that follows the axe, the dragged blade's sparks and the gouge it cuts
  const km=K.mats(); let sp=0, gp=null, gn=0;
  V.ultTick=dt=>{ t+=dt; if(gone) return; lift=zOf(t); pl.gy=y0-lift; follow();
    if(t<TD&&mkOn()){ const k=sat((t-.1)/(TD-.16)); MK.M.yaw=yaw0-5.4*eio(k); const q=MK.wpt('xd');
      if(Jd){ Jd.x=q[0]; Jd.y=q[1]; Jd.z=Math.max(10,q[2]); Jd.dir=MK.M.yaw+PI/2; Jd.len=mix(160,460,k); Jd.r=mix(80,130,k); }
      if(k>0&&k<1&&t-sp>.016){ sp=t; const a=MK.M.yaw-PI/2;
        for(let i=0;i<7;i++){ const v=mix(500,2000,Math.random()), b=a+(Math.random()-.5)*1.3; spark(q[0],q[1],8,Math.cos(b)*v,Math.sin(b)*v*FSY,mix(300,1300,Math.random()),{life:mix(.35,.8,Math.random()),s:mix(6,11,Math.random()),len:.09,g:1800,c:i%3?PF.s:PF.h}); }
        // stone torn out of the floor by the blade
        if(Math.random()<.35) GFX.pt({x:q[0],y:q[1],z:10,vx:Math.cos(a)*mix(200,600,Math.random()),vy:Math.sin(a)*mix(100,300,Math.random()),vz:mix(400,900,Math.random()),g:2400,drag:.3,life:.8,s:mix(8,16,Math.random()),rot:Math.random()*TW,vr:8,m:11,b:'alpha',c:GFX.rgb('#4a3e36'),c2:'#0a0806',shadow:true,bounce:.3,L:2}); }
      // the gouge: a burning furrow laid behind the blade, run by run
      if(k>0&&(!gp||Math.hypot(q[0]-gp[0],(q[1]-gp[1])/FSY)>70)&&gn<9){ if(gp){ gn++; K.coolLine(gp[0],gp[1],q[0],q[1],{w:58,pal:PF,life:TC-t+.25,hot:.6,grow:.05,gain:1.5}); } gp=[q[0],q[1]]; } } };
  // his shadow and the hot floor under him: a dark spot in a pool of light that swells and sharpens as the comet comes down - the warning
  GFX.add(TC+.02,(k,tt)=>{ if(!F.on||tt<TD) return; const u=sat(lift/H), fu=sat((tt-TF)/(TC-TF)), r=mix(150,230,u)+380*fu*fu;
    F.quad(km.dark,x0,y0,r,r*.8,0,{a:.45*(1-.3*u)+.5*fu}); });
  const Lp=GFX.light(x0,y0,300,PF.l,.3,.3,{hold:TC,z:40,flick:.06});
  GFX.add(TC,(k,tt)=>{ const f=sat((tt-TD)/(TC-TD)); Lp.r=mix(300,1600,f*f); Lp.a=mix(.35,1.25,Math.pow(f,1.6)); });

  // ---- prepare (0 - TD): the axe goes into the floor and he wheels round it once, the blade ploughing a burning gouge and a heavy spray of sparks
  mk('xPlant',{yaw:yaw0,blend:.08}); GFX.ambient(.5,.42,.46,3); Cn.move({x:x0,y:y0-BODY*.6,zoom:2.05,tilt:.08,roll:.02},.5,'io'); SFX.whoosh(.8,.5); sfx('slash',.6,.4);
  after(.08,()=>{ const q=blade(); K.flare(q[0],q[1],20,{pal:PF,s:240,dur:.16,gain:2.4}); K.dust(q[0],q[1],{n:10,r:30,sp:[200,700],a:.45}); Cn.shake(.35);
    const p=mkOn()?MK.wpt('xd'):q; Jd=K.vjet(p[0],p[1],20,0,{len:160,r:80,r0:30,dur:TD-.06,pal:PF,pitch:.5,heat:1.3,turb:1,speed:6,in:.1,out:.15,gain:.8,band:.8,lit:.5,flow:1.2}); });
  [.25,.45].forEach(tb=>after(tb,()=>{ Cn.shake(.25); sfx('slash',.5,.3); }));
  after(.3,()=>{ Cn.SND.shing(.8,.3); GFX.light(x0,y0,480,PF.l,.8,.5,{z:60,flick:.15}); });
  // ---- leap (TD): the floor kicked down under him, the axe swung up over his head. The camera rises and frames him high and the floor
  // below together, so the drop reads top to bottom
  after(TD,()=>{ Jd=null; mk('xRaise',{yaw:yaw0+.3,blend:.12}); K.vring(x0,y0,{r:340,r0:70,dur:.45,tube:.14,c:'#1a1410',c2:'#4a3a30',a:.6,lit:.4});
    K.cool(x0,y0,{kind:'crack2',r:280,pal:PF,life:2,hot:.35,light:0}); K.dust(x0,y0,{n:14,r:60,sp:[300,900],a:.5}); K.chunks(x0,y0,{n:3,r:90,sp:[200,500],up:1200,kind:'shard',s:[14,30],rock:ROCK,pal:PF,life:.9});
    Cn.shake(.5); hitstop=Math.max(hitstop,.03); sfx('boom',.7,.4); SFX.whoosh(1.2,.6);
    Cn.move({x:x0,y:y0-H*.5,zoom:.86,tilt:0,roll:-.02},.42,'out'); GFX.ambient(.42,.34,.4,2); });
  // ---- gather (TD - TF): fire wraps the axe and swells over his head; heat is drawn in from far off
  after(TD+.06,()=>{ const q=blade(); O=K.vorb(q[0],q[1],q[2],{r:60,dur:TF-TD+.02,pal:PF,heat:1,core:.3,in:.2,out:.04,spin:2.6,band:.7,flow:.8,gain:.85});
    J=K.vjet(q[0],q[1],q[2],0,{len:200,r:80,r0:40,dur:TC-TD+.02,pal:PF,pitch:1.5,heat:1.25,turb:1,speed:6,in:.2,out:.06,band:.9,btop:.6,lit:.6,flow:1.2});
    Cn.drone(42,.3); });
  // the fire follows the axe on the update clock (so it is where the axe is on the frame it is drawn). In the fall it is a solid comet round
  // all of him with a tail of fire a screen long
  let bx=x0, by=y0, bz=0, u=0, fu=0;
  function follow(){ if(!O) return; const q=blade(); u=sat((t-TD)/(TF-TD)); fu=sat((t-TF)/(TC-TF)); const w=Math.min(1,fu*4);
    bx=mix(q[0],pl.x,w); by=mix(q[1],pl.gy,w); bz=mix(q[2],BODY*.6,w);
    O.x=bx; O.y=by; O.z=bz; O.r=mix(70,260,Math.pow(u,1.1))+90*w;
    J.x=bx; J.y=by; J.z=bz+O.r*.4; J.len=mix(260,800,u)+1900*w; J.r=mix(90,220,u)+140*w; J.pitch=1.5; }
  let st=0;
  GFX.add(TC,(k,tt)=>{ if(!O) return; const q=blade();
    if(fu===0&&Math.random()<.5+.5*u){ const a=Math.random()*TW, r0=mix(500,1000,Math.random()); GFX.pt({x:q[0]+Math.cos(a)*r0,y:q[1]+Math.sin(a)*r0*FSY,z:q[2],oc:[q[0],q[1],q[2]],or:r0,oa:a,ow:mix(1.2,2,Math.random()),ok:r0*mix(1.8,2.6,Math.random()),oz0:q[2]+mix(-150,150,Math.random()),rmin:O.r*.7,life:.8,s:mix(4,7,Math.random()),m:3,len:.06,c:GFX.rgb(Math.random()<.3?PF.h:PF.s),c3:PF.m,c2:PE.b,fk:9,L:3,pri:1}); }
    // sparks peeling off the fire; in the fall they stream straight up past him, and thick dark smoke is left hanging along the path
    for(let n=0;n<3;n++) if(Math.random()<.5+.5*u){ const a=Math.random()*TW, v=mix(80,340,Math.random()); spark(bx+Math.cos(a)*O.r*.6,by+Math.sin(a)*O.r*.3,bz,Math.cos(a)*v,Math.sin(a)*v*FSY,fu>0?mix(1200,2400,Math.random()):mix(200,600,Math.random()),{g:fu>0?-300:400,life:mix(.3,.6,Math.random()),s:mix(4,7,Math.random()),len:fu>0?.12:.05}); }
    if(fu>0&&tt-st>.02){ st=tt; for(let n=0;n<2;n++) puff(bx+(Math.random()-.5)*O.r,by,bz+O.r*mix(.5,3,Math.random()),O.r*mix(.6,1,Math.random()),{vz:30,life:1.3,a:.6,L:1,c3:'#a05a2a'}); } });
  after(.95,()=>Cn.SND.inhale(.95,.5));
  after(TA,()=>{ Cn.move({zoom:.92,roll:.02},TF-TA+.1,'io'); K.flare(blade()[0],blade()[1],blade()[2],{pal:PG,s:360,dur:.2,gain:2}); });
  // ---- fall (TF - TC): the hang breaks; a solid comet (a fresh, denser ball round him) drops accelerating; the camera holds and leans in
  after(TF,()=>{ const q=blade(); K.flare(q[0],q[1],q[2],{pal:PG,s:520,dur:.14,gain:2.2}); SFX.whoosh(1.6,.8);
    if(O) O.dead=true; O=K.vorb(pl.x,pl.gy,BODY*.6,{r:330,dur:TC-TF+.03,pal:PF,heat:1.4,core:.75,in:.05,out:.03,spin:3.5,band:.5,flow:1.2,gain:1}); follow();
    Cn.move({x:x0,y:y0-H*.34,zoom:1,tilt:0,roll:0},TC-TF,'in'); GFX.ambient(.36,.28,.32,6); });
  after(TC-.2,()=>mk('xChop',{yaw:yaw0+.3,blend:.04}));
  after(TC-.2,()=>Cn.hush(.2,{a:.4}));

  // ---- climax (TC): the chop lands
  const N=7, a0=hs(x0*.01)*TW, SPD=3000;
  // fissures: each a ragged line of 4 runs from the impact to past the screen edge; [angle, points]
  const FS=[];
  for(let i=0;i<N;i++){ const a=a0+i/N*TW+(hs(i*3.1)-.5)*.5, ca=Math.cos(a), sa=Math.sin(a),
      L=Math.min(HWc/Math.max(.05,Math.abs(ca)),HHc/Math.max(.05,Math.abs(sa)*FSY))*1.15, P=[[x0+ca*90,y0+sa*90*FSY,90]];
    for(let j=1;j<=4;j++){ const d=L*[0,.22,.46,.72,1][j], off=(hs(i*7.3+j*1.7)-.5)*.26*d*(j<4?1:.6), px=x0+ca*d-sa*off, py=y0+(sa*d+ca*off)*FSY; P.push([px,py,Math.hypot(px-x0,(py-y0)/FSY)]); }
    FS.push({a,P}); }
  const ON=k=>k/SPD;
  after(TC,()=>{ gone=true; pl.gy=y0; lift=0; if(O) O.dead=true; if(J) J.dead=true;
    Cn.peak(x0,y0-80,{ca:.03,blur:.16,tint:'#ff5a14',hold:.05,out:.3}); hitstop=Math.max(hitstop,.1); Cn.shake(1.6); Cn.SND.hit(1); sfx('boom',2.2,1);
    GFX.light(x0,y0,hw*1.6,PF.l,1.2,.6,{z:300}); GFX.light(x0,y0,800,'#fff2d0',1.1,.15,{z:80});
    Cn.move({x:x0,y:y0-BODY*.4-160,zoom:ZC,tilt:.2,roll:0},.3,'out'); GFX.ambient(.9,.52,.4,9); after(.15,()=>GFX.ambient(.62,.42,.38,2));
    // the boom: a white-hot flash at the axe, a fire dome swelling out of the impact over a third of the screen (low and wide, it rolls out and
    // turns to smoke - no column, no cap), and a torn front of fire rushing out over the whole floor with smoke behind it, thinning as it goes
    const q=blade(); K.flare(q[0],q[1],60,{pal:PG,s:700,dur:.12,gain:2.6}); K.flare(x0,y0,120,{pal:PF,s:1500,sx:2.4,sy:.6,dur:.22,gain:1.5});
    K.vblast(x0,y0,{s:760,z:80,rise:220,dur:1.7,heat:1.35,fire:.7,smoke:.8,lump:.62,squash:.8,pal:PF,band:.7,lit:.6,flow:.6});
    K.vring(x0,y0,{r:RM,r0:300,dur:.95,tube:.2,heat:1.3,pal:PF,lump:.95,lit:.6,a:1.1});
    K.shock(x0,y0,{r:RM*.9,pal:PF,dur:.7,gain:1.1});
    GFX.ripple(x0,y0,RM*.8,{life:.6,s:.7,w:.12});
    K.cool(x0,y0,{kind:'crater',r:540,pal:PF,life:TE-TC+AFT,hot:.55,start:.1,gain:1.15,light:0});
    K.cool(x0,y0,{kind:'lava',r:300,pal:PF,life:TE-TC+AFT*.6,hot:.7,gain:1.2,light:0});
    K.sparks(x0,y0,40,{pal:PG,n:40,sp:[900,3000],up:2600,life:[.5,1.1],s:3,len:.1});
    K.chunks(x0,y0,{n:3,r:220,sp:[400,1100],up:1500,kind:'stone',s:[20,46],rock:ROCK,pal:PF,life:1.1});
    after(.06,()=>Cn.shake(1.2)); after(.18,()=>Cn.shake(.9)); after(.4,()=>Cn.shake(.6));
    // the crust round the crater: angular plates thrown up behind him (never between him and the camera) that crash back and wedge
    for(let i=0;i<3;i++){ const a=PI*(1.18+.64*i/2)+(hs(i*3.3)-.5)*.2; plate(x0+Math.cos(a)*620,y0+Math.sin(a)*620*FSY,a+PI,300+60*hs(i*5.1),.04+.04*i,i); }
    // every body on the field is thrown high as the crack front reaches it and tumbles (the hit lands while it is in the air: the killing
    // blow waits until they have flown)
    for(const e of onScreen(300)){ const d=Math.hypot(e.x-x0,(e.y-y0)/FSY), dl=Math.min(.55,ON(d))+.04*hs(e.x*.1);
      after(dl,()=>{ if(e.dead) return; K.knock(e,{from:[x0,y0],dist:380+300*hs(e.x),up:2700+900*hs(e.y),stun:1.6}); K.mark(e,'burn',{dur:2.4,pal:PF});
        after(.45,()=>{ if(!e.dead) dmg(e,Dm*.3,{sx:x0,sy:y0,crit:true}); }); }); }
    { const L=onScreen(300).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0)); L.slice(0,4).forEach(e=>after(Math.min(.5,ON(Math.hypot(e.x-x0,(e.y-y0)/FSY))),()=>K.ehit(e,{pal:PG,pw:1.5,ring:0}))); }
    // the finishing blow on everyone (ultHit) once they have come down again
    after(1.35,()=>Cn.sweep(x0,y0,Dm*.7,{speed:3600,push:1.2,max:.5}));
    FS.forEach((f,i)=>fissure(f,i)); slabs(); groundFires(); });

  // one fissure: it is torn open run by run, outward, at the speed of the crack front - a wide jagged rift of lava; standing fire columns
  // burst out of it one after another, out to the screen edge, each its own height, girth and life, each leaving smoke
  function fissure(f,i){ const P=f.P;
    // the first run lies inside the crater: the rift starts at its rim
    for(let j=1;j<4;j++){ const [ax,ay,da]=P[j], [bx,by,db]=P[j+1], w=[230,190,150,115][j]*(.85+.3*hs(i*2.3+j)), dl=ON(da);
      K.coolLine(ax,ay,bx,by,{w,pal:PF,life:TE-TC+AFT-dl,hot:.85,grow:Math.max(.05,ON(db-da)),gain:1.7,delay:dl}); }
    for(let j=1;j<4;j++){ const [ax,ay]=P[j], [bx,by]=P[j+1], uu=.25+.5*hs(i*5.1+j), px=mix(ax,bx,uu), py=mix(ay,by,uu), d=Math.hypot(px-x0,(py-y0)/FSY), dl=ON(d)+.06,
        hk=.75+.5*hs(i*9.7+j), lf=1.3+.7*hs(i*3.1+j)+(j===3?.4:0);
      after(dl,()=>{ K.vcolumn(px,py,{r:(105+25*j)*hk,h:(900+260*j)*hk,dur:lf,rise:.16,out:lf*.55,pal:j===1?PE:PF,heat:1.3,twist:2.2+hs(i+j),turb:1,taper:.32,gain:.85,band:1,btop:.64,lit:.7,flow:1.6});
        GFX.light(px,py,640*hk,PF.l,1,lf,{z:220,flick:.2});
        K.flare(px,py,30,{pal:PF,s:320*hk,dur:.12,gain:1.8});
        if(j===2) K.cool(px,py,{kind:'lava',r:150*hk,pal:PF,life:TE-TC+AFT*.7-dl,hot:.55,gain:1.2,light:0});
        for(let m=0;m<6;m++){ const b=hs(i*7.1+m+j)*TW, v=200+600*hs(m*2.3+i+j), c=m%2?PF.m:PE.b; GFX.pt({x:px,y:py,z:30,vx:Math.cos(b)*v,vy:Math.sin(b)*v*FSY,vz:1000+1100*hs(m*5.7+i),g:2600,drag:.25,life:.9+.3*hs(m+i),s:8+7*hs(m*4+i),m:8,c:GFX.rgb(c),c2:PE.d,L:3}); }
        K.dust(px,py,{n:4,r:40,sp:[120,380],a:.45});
        after(lf*.55,()=>K.vsmoke(px,py,{s:240*hk,z:800*hk,dur:2.2,rise:520,a:.6,c:'#1e1814',c2:'#4a3e36',lit:.5}));
        Cn.shake(.14); if(j===2&&i%2===0) sfx('boom',.7,.35); }); } }

  // one plate of crust: a flat, angular slab of broken stone (a cleaved stone mesh squashed thin) thrown up out of the floor and tipped on its
  // edge, then crashing back down and wedging in at a slant (dust, chips, a shake), where it stays; it sinks into the floor at the very end
  function plate(x,y,ta,w,dl,i){ if(!(F.on&&F.solids&&F.solids())) return; const v=i%4, th=w*.3, rz=ta+(hs(i*2.9)-.5)*.5, life=TE-TC-dl-.1, ca=Math.cos(ta), sa=Math.sin(ta), L1=.95, L2=.32+.12*hs(i*4.7);
    after(dl,()=>{ K.dust(x,y,{n:6,r:w*.3,sp:[200,700],a:.45,c:'#2a201a'}); K.sparks(x+ca*w*.4,y+sa*w*.4*FSY,30,{pal:PF,n:10,sp:[200,800],up:1400,life:[.3,.7]});
      GFX.light(x+ca*w*.4,y+sa*w*.4*FSY,w*1.6,PF.l,.8,1.2,{z:80,flick:.15}); let landed=false;
      after(.62,()=>{ landed=true; K.dust(x,y,{n:12,r:w*.45,sp:[300,900],a:.55,s:1.2,c:'#2a201a'}); K.debris(x,y,{n:10,r:w*.35,sp:[250,700],size0:8,size:20});
        GFX.pt({x,y,z:20,vx:0,vy:0,vz:40,g:0,drag:1,life:1.4,s:w*.5,grow:w*.6,m:5,b:'alpha',c:GFX.rgb('#2e241e'),c2:'#000000',c3:'#6a5040',er:.9,ns:1.2,w:1,a:.5,L:2}); Cn.shake(.3); sfx('boom',.5,.3); });
      GFX.add(life,(k,tt)=>{
        // up .26 s (overshooting to on-edge), hang a beat, crash down by .62 s with a small bounce, then sit wedged
        const up=tt<.26?eo3(tt/.26):tt<.4?1:tt<.62?1-Math.pow((tt-.4)/.22,2):0, bo=tt>.62?.12*Math.exp(-(tt-.62)*9)*Math.abs(Math.sin((tt-.62)*20)):0,
          l=mix(L2,L1,up)+bo*.5, z=th*(.45*up+bo)-th*.1, f=sat((tt-(life-.5))/.5);
        F.solid('stone',v,x,y,z-th*1.2*f*f,{M:F.xfw({sx:w,sy:w*.85,sz:th,rz,rx:-sa*l,ry:ca*l}),alb:'#7e7064',emis:PE.b,rimC:PF.h,spec:.5,rim:.4,heat:.45*sat(1-tt/.7),glow:mix(1.6,.35,sat(tt/2.8)),strata:0,edge:.07,dust:.55,dustC:'#5a4a3e',bump:2.2,detail:1,seed:i*1.7,
          shadow:[ca*.6+.2,sa*.6+.2,.55*(1-f)],ord:y}); }); }); }
  // the crust along the cracks: one big plate beside each crack (not in front of him), thrown up as the crack front passes, the edge at the crack raised
  function slabs(){ FS.forEach((f,i)=>{ const [ax,ay]=f.P[1], [bx,by]=f.P[2], dx=bx-ax, dy=(by-ay)/FSY, L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L, sd=i%2?1:-1, u=.3+.4*hs(i*4.1),
      off=280+50*hs(i), px=mix(ax,bx,u)+nx*off*sd, py=mix(ay,by,u)+ny*off*sd*FSY, d=Math.hypot(px-x0,(py-y0)/FSY);
    if(py>y0&&Math.abs(px-x0)<320) return;
    plate(px,py,Math.atan2(-ny*sd,-nx*sd),330+80*hs(i*3.7),ON(d)+.04,i+5); }); }
  // the floor burning between the cracks, then dying down one fire at a time (each its own size and life), leaving smoke
  function groundFires(){ for(let i=0;i<7;i++){ const a=hs(i*2.7+.3)*TW, d=mix(.3,.95,hs(i*5.9))*RM*.7, px=x0+Math.cos(a)*d, py=y0+Math.sin(a)*d*FSY;
      if(py>y0&&Math.abs(px-x0)<300) continue;
      const dl=ON(d)+.2, lf=2+1.8*hs(i*3.3), s=.7+.6*hs(i*8.7);
      after(dl,()=>{ K.vcolumn(px,py,{r:80*s,h:480*s,dur:lf,rise:.25,out:lf*.6,pal:i%3?PF:PE,heat:1.15,twist:1.6,turb:1.1,taper:.45,gain:.7,band:1,btop:.6,lit:.6,flow:1.2});
        after(lf*.7,()=>K.vsmoke(px,py,{s:220*s,z:300,dur:2,rise:400,a:.5,c:'#1e1814',c2:'#4a3e36',lit:.4})); }); } }
  // ---- what is left (TC+1 - TE+AFT): smoke climbs out of the cracks, ash and embers drift over the whole field, the rifts cool and go dark
  after(TC+2.2,()=>{ FS.forEach((f,i)=>{ const [px,py]=f.P[i%2?2:1]; K.vsmoke(px,py,{s:300+80*hs(i),z:250,dur:2.6,rise:600,a:.5,c:'#1e1814',c2:'#4a3e36',lit:.4,delay:.12*i}); }); });
  after(TC+.6,()=>{ let n=0; GFX.add(TE-TC+AFT-.8,(k,tt)=>{ const want=Math.floor(tt*(70-45*k)*(GFX.QK||1)); while(n<want){ n++; const px=x0+(hs(n*1.9)-.5)*HWc*2, py=y0+(hs(n*4.3)-.5)*HHc*1.8;
      if(n%3) GFX.pt({x:px,y:py,z:10,vx:(hs(n*2.7)-.5)*60,vy:0,vz:150+hs(n*8.3)*380,g:-40,drag:.5,life:1+hs(n*3.1)*.9,s:3+hs(n*9.7)*4,m:3,len:.035,c:GFX.rgb(n%2?PF.s:PE.m),c2:PE.d,L:3});
      else GFX.pt({x:px,y:py,z:400+hs(n*6.1)*500,vx:-50,vy:-20,vz:-(150+hs(n*8.3)*150),g:0,drag:.2,life:1.8,s:5+hs(n*9.7)*6,rot:hs(n*5.3)*TW,vr:3,m:11,b:'alpha',c:GFX.rgb('#3a3436'),c2:'#0c0a0c',L:1}); } }); });
  after(TC+.45,()=>mk('xPlant',{yaw:yaw0+.3,blend:.25}));
  after(TC+.6,()=>{ const L2=GFX.light(x0,y0,hw*1.5,PF.l,.75,TE-TC+AFT-.8,{z:120,flick:.1}); GFX.add(TE-TC+AFT-.8,k=>{ L2.a=.75*(1-k); L2.r=hw*mix(1.5,.7,k); }); });
  after(TC+2,()=>GFX.ambient(.76,.6,.55,1));
  after(TE-1,()=>{ Cn.back(.95); GFX.ambient(1,1,1,1.2); });
  after(TE,()=>{ pl.gy=y0; ultStop(); if(window.MK&&MK.free) MK.free(); });
}
window.AxeUlt2={cast};
})();

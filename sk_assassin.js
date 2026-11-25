// Black Mist Flurry. All paths are in the arena; y is floor depth and z is height.
'use strict';
(() => {
  const X = RPG.sv, { A, V, BODY, FSY } = X;
  const K = K3, F = FX3, pi = Math.PI;
  const steel = {d:'#090e26', b:'#5087b4', m:'#abdcf0', h:'#f2fcff', l:'#87c3ea', s:'#d9f6ff'};
  const night = {d:'#110b22', b:'#704d91', m:'#cca9db', h:'#fff1f8', l:'#9e7cae', s:'#e9c6e3'};
  const gold = {d:'#261021', b:'#ae613d', m:'#ffcd8c', h:'#fff7db', l:'#edb179', s:'#ffe1a4'};
  const iris = {d:'#130727', b:'#7140be', m:'#e093fb', h:'#fbe8ff', l:'#bb7ce3', s:'#f4beff'};
  const frost = {d:'#071733', b:'#246baf', m:'#80def1', h:'#dbfaff', l:'#67bedf', s:'#c6f8ff'};
  const sat = t => Math.max(0, Math.min(1,t));
  const mix = (lo,hi,t) => lo+(hi-lo)*t;
  const colors = p => ({cA:p.d,cB:p.b,cM:p.m,cC:p.h});
  const sk = {
    as_basic:{cls:'assassin',type:'basic',name:'쌍단도',lv:1,desc:'양손의 단도를 번갈아 휘둘러 가까운 적을 벤다.'},
    as_ult1:{cls:'assassin',type:'ult',name:'흑무연참',lv:1,desc:'검은 안개에 몸을 숨기고 사방의 적을 연달아 벤다. 두 칼날이 맞물리는 순간 전장의 모든 적에게 마지막 일격을 가한다.'}
  };
  const bladeTexture = 'as_razor';
  const daggerImage=F.img('as_spectral_dagger');
  if (F.on) F.img(bladeTexture);
  let painted, ink, tornEdge;
  function materials() {
    if (!painted) {
      painted=F.mat({tex:bladeTexture,nz:'wisp',n1:[3,1,.24,-.2],n2:[2,2,-.15,.1],
        dist:.012,nk:.18,ero:.025,soft:.17,rk:[.36,.94],bgain:1.1});
      ink=F.mat({tex:'v3_gash',nz:'veins',n1:[3,1,0,0],nk:.27,pw:.68,ero:.1,soft:.26,
        cA:'#06060b',cB:'#09090e',cM:'#0c0c16',cC:'#131323',op:1});
      tornEdge=F.mat({tex:'v3_fissure_b',nz:'veins',n1:[4,1.2,-.27,.1],n2:[3,2,-.09,.04],
        dist:.027,nk:.36,ero:.07,soft:.22,rk:[.46,1.04],cA:'#0d0a1c',cB:'#4b3590',cM:'#c4a6ff',cC:'#f4ecff',op:.78});
    }
    return {painted,ink};
  }

  // The blade climbs out of the fog on one side of the orbit and dips into it on the other.
  function orbit(x,y,r,angle,sense,lift,offset=0) {
    return (u,t=0) => {
      const a=angle+sense*(u*3.65+t*.44), reach=r*(.49+.51*u);
      return {x:x+Math.cos(a)*reach, y:y+Math.sin(a)*reach*FSY,
        z:26+lift*(.5+.5*Math.sin(a-offset))+.11*r*Math.sin(pi*u)};
    };
  }
  // Both hooks bite the same point at u=.5. One skims the cobbles, the other drops out of the air.
  function hook(x,y,span,depth,side,height=BODY*.61) {
    return (u,t=0) => {
      const v=2*u-1, curl=1-Math.cos(pi*v*.77);
      return {x:x+side*span*v*(.99+.035*t),
        y:y+depth*(side*.44*curl+v*(side>0?.76:.58)),
        z:height+depth*(side<0?.30:.12)*v*v};
    };
  }
  // This path passes through the chosen victim's chest at u=.76, then flicks past their shoulder.
  function lunge(x,y,r,a,targets) {
    const dx=Math.cos(a),dy=Math.sin(a);
    const aimX=x+dx*r*.54, aimY=y+dy*r*.54*FSY;
    let target=null, best=(r*.67)**2;
    for (const e of targets) {
      const d=(e.x-aimX)**2+((e.y-aimY)/FSY)**2;
      if(d<best){best=d;target=e;}
    }
    const tx=target?.x??aimX, ty=target?.y??aimY, tz=target?target.h*.49+target.z:BODY*.56;
    const path=u=>{
      const v=(u-.76)/.76, bend=r*.34*v*v;
      return {x:tx+dx*r*1.55*v-dy*bend,y:ty+(dy*r*1.55*v+dx*bend)*FSY,
        z:tz+v*v*r*.24};
    };
    return {path,target};
  }
  function sample(path,start,end,width,t,count=27) {
    const points=[];
    for (let i=0;i<count;i++) {
      const f=i/(count-1), u=mix(start,end,f), p=path(u,t);
      p.u=u;
      p.w=width*Math.pow(Math.max(0,Math.sin(pi*u)),.68)*(.46+.82*u)*(.1+.9*Math.min(1,f*9,(1-f)*12));
      points.push(p);
    }
    return points;
  }
  // Use the same sampled path for the cutting edge, the moving pool of light and its shadow.
  function stroke(path,p,width,{draw=.16,hold=.10,fade=.34,heavy=false,fogAt,fine=false}={}) {
    const life=draw+hold+fade;
    function frame(t) {
      const head=sat(t/draw), fadeT=sat((t-draw-hold)/fade), tail=head*fadeT*fadeT*.96;
      return {head:Math.max(.003,head),fadeT,tail:heavy?head*fadeT*.99:tail};
    }
    if (!F.on) {
      X.draw(life,k=>{
        const t=k*life, {head,tail,fadeT}=frame(t), pts=sample(path,tail,head,width,t);
        fx.save(); fx.lineCap='round';
        for(let i=1;i<pts.length;i++) {
          const a=pts[i-1],b=pts[i]; fx.beginPath(); fx.moveTo(a.x,a.y-a.z); fx.lineTo(b.x,b.y-b.z);
          fx.strokeStyle=hexA(p.b,.8*(1-fadeT)); fx.lineWidth=Math.max(1,b.w*.42); fx.stroke();
          fx.strokeStyle=hexA(p.h,.85*(1-fadeT)); fx.lineWidth=Math.max(1,b.w*.08); fx.stroke();
        }
        fx.restore();
      });
      return;
    }
    const origin=path(0), lamp=GFX.light(origin.x,origin.y,Math.min(heavy?610:720,width*3.7),p.l,heavy?.64:.58,.16,{hold:life,z:130});
    const m=materials(), shared=K.mats(), c=colors(p);
    GFX.add(life,(k,t)=>{
      const {head,tail,fadeT}=frame(t), gain=1-fadeT*fadeT;
      const pts=sample(path,tail,head,width,t);
      const tip=pts[pts.length-1]; lamp.x=tip.x; lamp.y=tip.y; lamp.z=tip.z;
      if(window.AssassinCuts?.sweep(pts,p,{t,fade:fadeT,heavy,fogAt,fine})) return;
      const wake=pts.map(q=>({...q,z:q.z-7,w:q.w*1.12}));
      F.ribbon(m.ink,wake,{a:.74*gain,ord:3});
      // The painted hook stretches over a curved strip. Its disconnected facets stay sharp in motion.
      F.ribbon(F.ready(bladeTexture)?m.painted:shared.smB,pts,
        {...c,ord:4,a:gain,gain:heavy?2.5:2.15,ero:.025+.22*fadeT});
      for (const q of pts) q.w*=heavy?.12:.17;
      F.ribbon(shared.trC,pts,{...c,ord:5,a:.85*gain,gain:heavy?2.9:2.4,ero:.18+.33*fadeT});
    });
  }
  function groundCut(path,p,width,life) {
    if (!F.on) return;
    const m=materials(), shared=K.mats();
    GFX.add(life,(k,t)=>{
      const head=Math.max(.005,sat(t/.2)), cool=sat((t-.2)/(life-.2)), tail=.58*cool**3;
      const pts=sample(path,tail,head,width,0);
      for (const q of pts) q.z=2;
      F.ribbon(m.ink,pts,{layer:'g',a:(1-cool**3)*.96,ero:.05+.46*cool});
      for(const q of pts) q.w*=.46;
      F.ribbon(shared.smB,pts,{...colors(p),layer:'g',a:(1-cool)**1.5,gain:2.1,ero:.12+cool*.43});
    });
  }
  // Low, dark tearing edge of the second dagger. Its near side lifts the broken paving as it passes.
  function rupture(path,depth,fogAt) {
    if(!F.on){ stroke(path,iris,depth*.54,{draw:.22,hold:.04,fade:.4,heavy:true}); return; }
    const m=materials(), shared=K.mats(), c=colors(iris), draw=.22;
    GFX.add(.92,(k,t)=>{
      const head=Math.max(.005,sat(t/draw)), fade=sat((t-.26)/.66), tail=.88*fade*fade;
      const pts=sample(path,Math.min(tail,head-.002),head,depth*.33,t,35);
      if(window.AssassinCuts?.fracture(pts,iris,{t,fade,depth,fogAt,path})) return;
      const face=[], rim=[];
      for(let i=0;i<pts.length;i++){
        const q=pts[i],u=mix(tail,head,i/(pts.length-1)), h=q.w*(.4+.42*Math.sin(u*14+.3)**2+.36*Math.sin(u*31)**6)*(1-fade);
        face.push({x:q.x,y:q.y,z:q.z+h*.32,w:h});
        rim.push({x:q.x,y:q.y,z:q.z+h*1.12,w:Math.max(1,h*.115)});
      }
      F.ribbon(m.ink,face,{ord:3,a:.98*(1-fade**3),op:1,gain:.17,ero:.04+fade*.37});
      F.ribbon(tornEdge,face,{ord:4,a:1-fade*.77,gain:1.9,ero:.06+fade*.38});
      F.ribbon(shared.trC,rim,{...c,ord:5,a:1-fade,gain:3.3,ero:.15+.34*fade});
    });
    const stones=F.low?[.25,.50,.72]:[.16,.34,.43,.53,.68,.83];
    for(const [i,u] of stones.entries()){
      const q=path(u), q1=path(u+.02), th=Math.atan2((q1.y-q.y)/FSY,q1.x-q.x);
      const side=i%2?1:-1, size=depth*(.13+.08*Math.sin(u*pi)), delay=draw*u;
      // Torn black vapour peels off the cut instead of lifted paving: ragged flakes with a violet rim.
      after(delay,()=>{
        for(let j=0;j<(F.low?2:4);j++){
          const a=th+side*pi*(.3+.3*Math.random()), v=size*(1.6+2.2*Math.random());
          GFX.pt({x:q.x,y:q.y,z:8+20*Math.random(),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:90+160*Math.random(),g:-40,drag:2.2,
            life:.7+.4*Math.random(),s:size*(.3+.25*Math.random()),grow:size*.9,m:5,b:'alpha',c:GFX.rgb('#07060d'),c2:'#000000',
            c3:'#4a3a7e',er:.95,ns:1.6,w:1,a:.78,L:0});
        }
        K.dust(q.x,q.y,{n:3,r:28,dir:th+side*pi*.34,spread:.4,sp:[170,520],s:1.1,a:.42,life:.7,c:'#0d0b16',c3:'#5c4f8c'});
      });
    }
  }
  function impact(x,y,z,dir,p,scale=1) {
    K.sparks(x,y,z,{pal:p,n:Math.round(12*scale),dir,spread:.35,sp:[430,1280],up:500,life:[.22,.58]});
    window.AssassinMist.splinters?.(x,y,z,dir,scale,p);
    const l=145*scale, dx=Math.cos(dir)*l, dy=Math.sin(dir)*l*FSY;
    K.coolLine(x-dx*.24,y-dy*.24,x+dx,y+dy,{pal:p,w:28*scale,grow:.11,life:1.6,hot:.56,shed:0,light:0});
    if(F.on) GFX.light(x,y,360*scale,p.l,.78,.24,{z});
  }

  // Four pairs hunt close to the ground. A second wave crosses above them
  // in the opposite direction before opening into the finishing fan.
  function skyDaggers(x,y,r,focus,mist) {
    const count=F.low?8:16, life=4.52, knives=[], claimed=new Set();
    const floorWake=window.AssassinGround?.cast(r,life,mist.fogAt,mist.flashGround);
    const body=F.on?F.mat({kind:2,tex:daggerImage,nz:'grain',n1:[2,3,0,0],soft:.12,
      cB:'#f7faff',cC:'#debaff',op:1}):null;
    for(let lane=0;lane<count;lane++){
      const crossing=lane>=8, pair=Math.floor((lane%8)/2), follower=lane%2;
      const a=pair*pi*.52+follower*.31+(crossing?.76+follower*.24:0);
      const side=(pair%2?-1:1)*(crossing?-1:1);
      const fan=(Math.floor(pair/2)*2+follower+(crossing?.5:0))/(count===8?3:3.5);
      const launch=.27+pair*.074+follower*.09+(crossing?.21:0);
      const recall=2.38+pair*.044+follower*.062+(crossing?.09:0);
      const release=3.325+follower*.056+(pair%2)*.026+(crossing?.072:0);
      const leader=pair%2===0 && !follower;
      const p=pair%2?iris:frost;
      // Depth tiers: four large blades sweep close to the lens, the followers sit
      // behind them and the crossing wave is small, dim and high in the air.
      const tier=crossing?0:follower?1:2;
      const size=r*(tier===2?(leader?.13:.112):tier===1?.06:.052);
      const dim=tier===2?0:tier===1?.24:.44;
      const back=3.96+(lane%8)*.011+(crossing?.035:0);
      const bankPass=t=>lane===1?Math.sin(pi*sat((t-1.30)/.93))**2:0;
      const bite=[1.21,1.63,2.00,2.30][pair], approach=side*(.44+pair*.13);
      const hunts=!crossing&&!follower;
      const skimAt=hunts?[null,.97,1.78,2.44][pair]:null;
      let target, mark;
      if(hunts){
        after(bite-.30,()=>{
          // Pick near this knife's bank. Reserve each body so simultaneous knives fan apart.
          const bx=x+Math.cos(a)*r*.49, by=y+Math.sin(a)*r*.39*FSY;
          let best=Infinity;
          for(const e of X.onScreen(50)){
            const d=Math.hypot(e.x-bx,(e.y-by)/FSY)+(claimed.has(e)?r*2:0);
            if(d<best){best=d;target=e;}
          }
          if(target) claimed.add(target);
        });
        after(bite,()=>{
          if(!target || target.dead) return;
          mark={x:target.x,y:target.y,z:target.z+target.h*.50};
          const through=side>0?approach:pi-approach;
          target.hdx=Math.cos(through); target.hurtT=.26; target.flash=1;
          K.sparks(mark.x,mark.y,mark.z,{pal:p,n:9,dir:through,spread:.25,sp:[460,1160],up:360,life:[.16,.38]});
          if(F.on) K.flare(mark.x,mark.y,mark.z,{s:Math.max(142,target.h*.92),sx:1.05,sy:.64,dur:.18,pal:p,gain:2.2});
        });
      }
      function flight(t) {
        if(t>back){
          // Recall: the blade is yanked back into the assassin's hand, slow off the mark, then fast.
          const from=flight(back), u=sat((t-back)/.24), w=u*u*u;
          return {x:mix(from.x,x,w),y:mix(from.y,y,w),z:mix(from.z,BODY*.62,w)+r*.06*Math.sin(pi*u)};
        }
        // A blade slows as it banks and snaps forward out of the turn, so its speed is never constant.
        const age0=Math.max(0,t-launch), age=age0-.12*Math.sin(age0*2.9+lane*.9)+.12*Math.sin(lane*.9);
        const open=1-(1-sat(age0/.64))**2;
        const angle=a+side*(age*(crossing?1.68:2.15)+.54*Math.sin(3.3*age+pair)+.68*open);
        const reach=r*(.14+(.69+.18*Math.sin(age*3.5+a)+follower*.17-(crossing?.15:0))*open);
        const front=Math.sin(angle), lift=r*(.075+.17*(1+front)*.5+.17*Math.sin(age*2.7+a)**2+(crossing?.076:0));
        const q={x:x+Math.cos(angle)*reach,y:y+front*reach*FSY*.84,
          z:BODY*.42*(1-open)+lift*open};
        // The front pair banks through the centre while the far blades keep circling.
        const pass=sat((t-(1.12+pair*.34+follower*.08))/.57);
        const cutIn=Math.sin(pi*pass)**2*(crossing?.14:pair%2===0?.96:.38);
        q.x=mix(q.x,x+(pass-.5)*r*1.45*side,cutIn);
        q.y=mix(q.y,y+r*(.40-pass*.35)*FSY,cutIn);
        q.z+=cutIn*r*.19;
        const near=bankPass(t);
        if(near>0){
          const u=sat((t-1.30)/.93);
          q.x=mix(q.x,x+r*(-.72+1.38*u),near);
          q.y=mix(q.y,y+r*(.65+.34*Math.sin(pi*u))*FSY,near);
          q.z=mix(q.z,r*(.10+.23*Math.sin(pi*u)),near);
        }
        // The leading blade folds over the body, crosses it edge first and climbs out.
        const victim=mark || (target && !target.dead?{x:target.x,y:target.y,z:target.z+target.h*.50}:null);
        const dt=t-bite;
        if(victim && dt>-.30 && dt<.28){
          const u=sat(1-Math.abs(dt)/(dt<0?.30:.28)), w=u*u*(3-2*u);
          const stride=dt*r*2.5;
          q.x=mix(q.x,victim.x+side*Math.cos(approach)*stride,w);
          q.y=mix(q.y,victim.y+Math.sin(approach)*stride*FSY,w);
          q.z=mix(q.z,victim.z+r*(2.6*dt*dt-.44*dt),w);
        }
        if(skimAt!==null){
          // Keep a short tangent near the stone so the chips leave along the actual pass.
          const dt=t-skimAt, reach=dt<0?(pair===3?.09:.16):.17;
          const u=sat(1-Math.max(0,Math.abs(dt)-.025)/reach);
          q.z=mix(q.z,17+5*Math.sin(dt*14+pair),u*u*(3-2*u));
        }
        const f=focus(), u=sat((t-recall)/.43), converge=u*u*(3-2*u);
        q.x=mix(q.x,f.x,converge); q.y=mix(q.y,f.y,converge);
        q.z=mix(q.z,f.z,converge)+r*.11*Math.sin(pi*u);
        if(t>=release){
          // Elevation falls as the fan opens toward the camera, so its tips
          // stay separated in projection as well as in world space.
          // Explodes out of the contact, then hangs quivering in the fan until the recall.
          const v=sat((t-release)/.62);
          const travel=1-(1-v)**4.2, arch=Math.sin(pi*travel);
          q.x=f.x+side*r*((.80+.35*Math.sin(pi*fan))*travel+.24*arch);
          q.y=f.y+r*FSY*((fan*.82-.29)*travel-.12*arch);
          q.z=f.z*(1-travel)+r*((.37-.18*fan)*travel+(.30-.11*fan)*arch);
          const quiver=sat((t-release-.3)/.1)*Math.exp(-Math.max(0,t-release-.4)*3);
          q.z+=quiver*5*Math.sin(t*61+lane*2.3); q.x+=quiver*4*Math.sin(t*53+lane);
        }
        return q;
      }
      if(skimAt!==null){
        const start=skimAt-.06, duration=.15;
        after(start,()=>mist.part?.(u=>flight(start+duration*u),duration,size*.44,p));
      }
      // Sample the actual pass once. An enemy can move after the knife passes it.
      // The wake must remain where the blade was, even after the target is knocked away.
      const history=new Array(36), hz=80;
      let lastTick=-Infinity;
      function advance(t){
        const tick=Math.floor(t*hz);
        for(let i=Math.max(lastTick+1,tick-history.length+1);i<=tick;i++)
          history[(i%history.length+history.length)%history.length]=flight(i/hz);
        lastTick=tick;
      }
      function past(t){
        const f=t*hz, i=Math.floor(f), idx=(i%history.length+history.length)%history.length;
        if(i<lastTick-history.length+1||i>lastTick) return flight(t);
        const a=history[idx], b=i===lastTick?flight((i+1)/hz):history[(idx+1)%history.length], k=f-i;
        return {x:mix(a.x,b.x,k),y:mix(a.y,b.y,k),z:mix(a.z,b.z,k)};
      }
      knives.push({lane,launch,recall,release,advance,past,bankPass,p,size,leader,skimAt,crossing,dim,back,tier});
    }
    function frame(t) {
      const glints=chain(), clearing=[];
      for(const b of knives){
        if(t<b.launch) continue;
        const burst=t>=b.release, age=t-(burst?b.release:b.launch);
        // The silence before the finisher has no blades hanging over its point of contact.
        const alpha=sat(age/(burst?.065:.11))*(burst?1-sat((t-b.back-.2)/.04):1-sat((t-b.recall-.31)/.12));
        if(alpha<.015) continue;
        if(burst && t>b.back+.2 && !b.home){
          b.home=true;
          if(b.lane%4===0) K.sparks(x,y,BODY*.62,{pal:steel,n:3,sp:[140,420],up:160,life:[.1,.24]});
        }
        b.advance(t);
        const p=b.past(t), prev=b.past(t-.012);
        const rot=Math.atan2((p.y-p.z)-(prev.y-prev.z),p.x-prev.x);
        const rollAt=time=>{
          const roll=time*(2.8+.24*b.lane)+b.lane*1.71+.82*Math.sin(time*3.4+b.lane);
          return b.lane===1?roll+2.55*sat((time-1.46)/.63):roll;
        };
        const roll=rollAt(t), bank=.45+.55*Math.abs(Math.cos(roll));
        const lens=1+.18*(p.y-y)/(r*FSY)+.10*p.z/r;
        const near=b.bankPass(t);
        const len=b.size*lens*(1+.13*near)*(burst?1.07:1), shade=burst?(b.lane%4===1?gold:b.p):b.p;
        if(b.skimAt!==null) floorWake?.pass(b.lane,t,b.past,p,len,shade,alpha,b.skimAt);
        const obscured=mist.fogAt?.(p)||0;
        if(b.lane===0||b.lane===4||near>.18)
          mist.bladeLight?.(b.lane===4?1:0,p,shade.m,alpha,b.past(Math.max(burst?b.release:b.launch,t-.080)));
        const trail=[], edges=[], span=(burst?.26:.17)*(b.crossing?.73:1), n=F.low||b.crossing?8:14;
        for(let j=0;j<=n;j++){
          const k=j/n, time=Math.max(burst?b.release:b.launch,t-span*(1-k));
          const q=b.past(time), last=b.past(time-.009);
          const dx=q.x-last.x, dy=(q.y-last.y)/FSY, dz=q.z-last.z;
          const travel=Math.hypot(dx,dy,dz)||1, flat=Math.hypot(dx,dy)||1;
          const width=len*(.022+.16*k), angle=rollAt(time);
          // Two points on the rolling steel sweep out a surface in world space.
          // A knife banking edge-on leaves a narrow wake even when seen from above.
          const vx=(-dy/flat*Math.cos(angle)-dx/flat*dz/travel*Math.sin(angle))*width;
          const vy=(dx/flat*Math.cos(angle)-dy/flat*dz/travel*Math.sin(angle))*width;
          const vz=flat/travel*Math.sin(angle)*width;
          q.x-=dx/travel*len*.54; q.y-=dy/travel*FSY*len*.54; q.z-=dz/travel*len*.54;
          edges.push({x:q.x-vx,y:q.y-vy*FSY,z:q.z-vz});
          q.x+=vx; q.y+=vy*FSY; q.z+=vz; q.w=width;
          trail.push(q);
        }
        if(F.on){
          const m=K.mats(), c=colors(shade);
          const wake=alpha*(1-obscured*.82)*(1-b.dim);
          if(b.tier===2 && clearing.length<6) clearing.push({x:p.x,y:p.y,z:p.z,s:alpha});
          if(!window.AssassinCuts?.sweep(trail,shade,{trail:true,t,fade:1-wake,side:b.lane%2?1:-1,edgePoints:edges,fogAt:mist.fogAt})){
            F.ribbon(m.trB,trail,{...c,a:.72*wake,gain:1.7,ero:.1,t0:b.lane*.7,ord:6});
          }
          // Each blade catches the light on its own beat as it rolls: a short four-point star on the steel.
          const hot=.5+.5*Math.cos(t*(8.5+1.37*(b.lane%5))+b.lane*2.71+roll*.5);
          if(hot>.8){
            const g=(hot-.8)/.2*alpha*(1-b.dim), s=Math.sin(rot), co=Math.cos(rot);
            const gx=p.x+co*len*.3, gy=p.y, gz=p.z-s*len*.3, L1=len*(b.tier===2?.55:.32)*g, L2=L1*.45, w=(b.tier===2?7:4)*g;
            glints.add([{x:gx-co*L1,y:gy,z:gz+s*L1,w:0},{x:gx,y:gy,z:gz,w},{x:gx+co*L1,y:gy,z:gz-s*L1,w:0}]);
            glints.add([{x:gx+s*L2,y:gy,z:gz+co*L2,w:0},{x:gx,y:gy,z:gz,w:w*.8},{x:gx-s*L2,y:gy,z:gz-co*L2,w:0}]);
          }
          if(window.AssassinBlades?.draw(p,prev,len,roll,shade,alpha,8,Math.min(.9,obscured+b.dim),mist.fogAt)) continue;
          if(daggerImage.ok) F.bill(body,p.x,p.y,p.z,len,len*.33*bank,rot,
            {cB:burst?shade.h:'#ffffff',cC:shade.m,ero:(1-alpha)*.69-.08,gain:1.28,
              a:alpha,ord:8});
        } else {
          fx.save(); fx.lineCap='round';
          for(let j=1;j<trail.length;j++){
            const a=trail[j-1],q=trail[j];
            fx.strokeStyle=hexA(shade.m,alpha*.74*j/n); fx.lineWidth=Math.max(1,q.w*.8);
            fx.beginPath();fx.moveTo(a.x,a.y-a.z);fx.lineTo(q.x,q.y-q.z);fx.stroke();
          }
          fx.restore();
          if(window.AssassinBlades?.canvas?.(fx,p,prev,len,roll,shade,alpha,obscured,mist.fogAt)) continue;
          fx.save();fx.translate(p.x,p.y-p.z);fx.rotate(rot);fx.globalAlpha=alpha;
          if(daggerImage.ok) fx.drawImage(daggerImage.im,-len,-len*.33*bank,len*2,len*.66*bank);
          fx.restore();
        }
      }
      if(!F.on) return;
      if(glints.pts.length>1) F.ribbon(K.mats().trC,glints.pts,{cA:steel.b,cB:steel.m,cM:steel.h,cC:'#ffffff',gain:3,ero:.02,ord:9});
      mist.clear?.(clearing);
    }
    if(F.on) GFX.add(life,(k,t)=>frame(t)); else X.draw(life,k=>frame(k*life));
  }

  // A cut leaves strips of light suspended in the mist. Each one comes unstuck
  // at a different instant and frays towards the point, instead of repeating the hit.
  function afterglow(path,p,w,side,fogAt) {
    if(window.AssassinCuts?.echo(path,p,w,side,fogAt)) return;
    const life=.64;
    function frame(t) {
      const strips=F.low?1:2;
      for(let j=0;j<strips;j++){
        const k=sat((t-.06*j)/(life-.06*j)), a=Math.sin(pi*sat(k*2))*0.35+.65*(1-k)**1.2;
        const lo=.07+.34*j+.31*k, hi=Math.min(.99,.55+.40*j+.13*k);
        const pts=sample(path,lo,hi,w*(j?.48:.68),.12,15);
        for(let n=0;n<pts.length;n++){
          const u=n/(pts.length-1), q=pts[n];
          q.z+=w*(.18+k*(.48+.65*Math.sin(pi*u)));
          q.x+=side*w*k*(.35+.43*u); q.w*=Math.sin(pi*u)**.75;
        }
        if(F.on){
          F.ribbon(materials().painted,pts,{...colors(p),a:a*.78,ord:5.5,gain:1.76,
            ero:.055+.43*k,t0:side*(j+1)});
        } else {
          fx.save();fx.beginPath();pts.forEach((q,i)=>i?fx.lineTo(q.x,q.y-q.z):fx.moveTo(q.x,q.y-q.z));
          fx.lineWidth=4*(1-k)+1;fx.strokeStyle=hexA(p.m,a*.66);fx.stroke();fx.restore();
        }
      }
    }
    if(F.on) GFX.add(life,(k,t)=>frame(t)); else X.draw(life,k=>frame(k*life));
  }
  function basic() {
    const enemy=X.nearest(345);
    if (!enemy && V.bcd<=0) return false;
    const a=enemy?X.angTo(enemy):(pl.f>0?0:pi), dir=Math.atan2(Math.sin(a)/FSY,Math.cos(a));
    const side=(V.chain++%2)?1:-1;
    X.face(a);
    if (window.MK && MK.on()) MK.play('assassinCut',{yaw:dir,blend:.04});
    const x=pl.x,y=pl.gy;
    const path=u=>({x:x+Math.cos(dir+side*(u-.5)*2.15)*(178+72*u),
      y:y+Math.sin(dir+side*(u-.5)*2.15)*198*FSY,z:BODY*(.38+.36*u)});
    stroke(path,steel,36,{draw:.065,hold:.025,fade:.13});
    X.sfx('slash',1.3,.36);
    after(.055,()=>X.inSector(x,y,a,345,1.15,e=>{
      X.dmg(e,1250*A.mul('as_basic'),{kb:.23}); X.hitFx(e,steel.m,.64);
    }));
    return true;
  }

  function bladeEchoes(C) {
    if(!AC || !master) return () => {};
    const bus=AC.createGain(); bus.connect(master);
    let live=true;
    C.drones.push({stop(){
      live=false;
      bus.gain.setTargetAtTime(0,AC.currentTime,.012);
    }});
    return (side,pitch,finish=false) => {
      const taps=finish?[.075,.185,.33,.52]:[.074,.149];
      taps.forEach((delay,i)=>after(delay,()=>{
        if(!live || !lock) return;
        const now=AC.currentTime, pan=AC.createStereoPanner?.(), out=pan || bus;
        if(pan){pan.pan.value=(i%2?side:-side)*(.72-i*.11);pan.connect(bus);}
        const hz=(finish?1060:1540)*pitch*(1-i*.023), tail=(finish?.63:.23)*(1+i*.15);
        for(const [ratio,amp] of [[1,1],[2.41,.32]]) {
          const note=osc('sine',hz*ratio), vol=AC.createGain();
          env(vol,now,.004,(finish?.098:.076)*amp*.56**i,tail);
          note.connect(vol);vol.connect(out);note.start(now);note.stop(now+tail+.02);
        }
      }));
    };
  }
  // Joins separate strips into one ribbon. Zero-width joints keep the gaps invisible,
  // so any number of short streaks costs a single draw.
  function chain() {
    const pts=[];
    return {pts,add(seg){
      if(seg.length<2) return;
      if(pts.length){
        const a=pts[pts.length-1], b=seg[0];
        pts.push({x:a.x,y:a.y,z:a.z,w:0},{x:b.x,y:b.y,z:b.z,w:0});
      }
      for(const q of seg) pts.push(q);
    }};
  }
  // Screen-wide rends. Each one is drawn from its root to its point in a few frames: heavy at the
  // root, needle-thin at the point, with a dark wake under a lit edge and a white core.
  // All rends share three ribbons, so any number of them costs three draws.
  function rends() {
    const start=RT, list=[];
    function frame(t){
      if(!F.on) return;
      const wake=chain(), bleed=chain(), edge=chain(), core=chain();
      for(const c of list){
        const age=t-c.at;
        if(age<0 || age>c.life) continue;
        const head=1-(1-sat(age/c.draw))**3, tail=sat((age-c.draw-c.hold)/(c.life-c.draw-c.hold))**.9;
        const fade=1-sat((age-c.draw-c.hold)/(c.life-c.draw-c.hold));
        const ca=Math.cos(c.a), sa=Math.sin(c.a), n=18, seg=[];
        for(let i=0;i<n;i++){
          const u=mix(tail,head,i/(n-1)), s=(u-.5)*c.len;
          const w=c.w*Math.min(1,u*14)*Math.min(1,(1-u)*9)*(.035+.965*(1-u)**1.45)*(1+.6*Math.exp(-u*9))*(.4+.6*fade);
          seg.push({x:c.x+ca*s-sa*c.bow*Math.sin(pi*u),y:c.y+sa*s+ca*c.bow*Math.sin(pi*u),z:c.z,w,u});
        }
        if(!c.lit && head>.5){
          c.lit=true;
          for(const u of [.2,.42,.64]){
            const q=seg[Math.round(u*(n-1))];
            K.sparks(q.x,q.y,q.z,{pal:c.p,n:F.low?3:6,dir:c.a,spread:.22,sp:[620,1500],up:180,life:[.14,.34]});
          }
          if(c.heavy) GFX.light(c.x,c.y,c.len*.4,c.p.l,.7,.2,{z:c.z});
        }
        // A torn black wake, a coloured bleed, the lit edge and a white core that thins to a needle.
        // Every layer narrows as the rend retracts, so nothing lingers as a uniform line.
        wake.add(seg.map(q=>({...q,w:q.w*1.9*fade})));
        bleed.add(seg.map(q=>({...q,z:q.z+4,w:q.w*(2.6+.9*(1-fade))*fade**.7})));
        edge.add(seg.map(q=>({...q,w:q.w*fade})));
        core.add(seg.map(q=>({...q,w:q.w*.16*(c.heavy?1.4:1)*fade**1.8})));
      }
      const m=materials(), shared=K.mats();
      if(wake.pts.length>1) F.ribbon(m.ink,wake.pts,{a:.62,ord:6.5,ero:.08});
      if(bleed.pts.length>1) F.ribbon(shared.trB,bleed.pts,{cA:iris.d,cB:iris.b,cM:iris.m,cC:iris.h,a:.8,gain:2.3,ero:.16,ord:7,ulen:420,t0:t*.8});
      if(edge.pts.length>1) F.ribbon(shared.smB,edge.pts,{...colors(steel),cA:iris.d,cB:iris.b,a:.9,gain:2.2,ero:.1,ord:7.5});
      if(core.pts.length>1) F.ribbon(shared.trC,core.pts,{cA:steel.b,cB:steel.m,cM:steel.h,cC:'#ffffff',gain:3.1,ero:.04,ord:9.5});
    }
    GFX.add(4.6,(k,t)=>frame(t));
    return {cut(x,y,z,a,len,w,{delay=0,bow=0,p=steel,heavy=false,draw=.07,hold=.11,life=.5}={}){
      list.push({x,y,z,a,len,w,bow,p,heavy,draw,hold,life,at:RT-start+delay});
    }};
  }
  // Phantom knives. Every dash leaves a few hanging in the mist along its path. They turn on the
  // finisher's victim, converge through it on the closing bite and lodge in the nearest bodies or
  // the paving, then cool and split apart. Two giant blades cross over the victim at the same instant.
  function phantoms(x,y,radius,mist,focus) {
    const start=RT, life=4.7, cap=F.low?12:24, knives=[], bits=[], giants=[];
    const ev={aim:Infinity,hush:Infinity,fire:Infinity,cross:Infinity};
    let body=null;
    const hash=i=>{const s=Math.sin(i*12.9898+4.13)*43758.5453; return s-Math.floor(s);};
    const ease=u=>u*u*(3-2*u);
    const unit=(dx,dy,dz)=>{const l=Math.hypot(dx,dy,dz)||1; return {x:dx/l,y:dy/l,z:dz/l};};
    // Directions are true 3D (floor depth unsquashed). Positions keep the arena's squashed y.
    const step=(p,d,s)=>({x:p.x+d.x*s,y:p.y+d.y*s*FSY,z:p.z+d.z*s});
    const toward=(a,b)=>unit(b.x-a.x,(b.y-a.y)/FSY,b.z-a.z);
    const center=e=>({x:e.x,y:e.y,z:e.z+e.h*.5});
    const lerpD=(a,b,k,lift=0)=>unit(mix(a.x,b.x,k),mix(a.y,b.y,k),mix(a.z,b.z,k)+lift);
    function blade(p,d,len,roll,pal,a,fog,shadow){
      if(!(len>4) || a<.01) return;
      const prev=step(p,d,-8);
      if(!F.on){ window.AssassinBlades?.canvas?.(fx,p,prev,len,roll,pal,a,fog); return; }
      // The blade batch queues a floor shadow for every low blade. Only the two giants keep one.
      const ground=F.ground;
      if(!shadow) F.ground=false;
      try{ window.AssassinBlades?.draw(p,prev,len,roll,pal,a,8,fog); } finally { F.ground=ground; }
    }
    function puff(p,n,s){
      for(let i=0;i<n;i++){
        const a=Math.random()*2*pi, v=40+90*Math.random();
        GFX.pt({x:p.x,y:p.y,z:Math.max(6,p.z),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:50+110*Math.random(),g:-25,drag:1.6,
          life:.55+.4*Math.random(),s:(16+16*Math.random())*s,grow:45*s,m:5,b:'alpha',c:GFX.rgb('#0c0b16'),c2:'#000000',
          c3:'#3a2f5c',er:.9,ns:1.3,w:1,a:.62,L:0});
      }
    }
    // A broken knife leaves short tumbling shards that shrink into black vapour, never a fade.
    function shatter(p,d,len,pal,t,n,size=.42,kick=1){
      const side=unit(-d.y,d.x,0);
      for(let j=0;j<n;j++){
        const along=n===1?.5:j/(n-1), o=step(p,d,len*(-.35+1.25*along)), s=(j%2?1:-1);
        bits.push({p:o,at:t,life:.46+.12*Math.random(),len:len*size*(.8+.4*Math.random()),pal,roll:Math.random()*6,
          v:{x:(side.x*s*170+d.x*90)*kick,y:(side.y*s*170+d.y*90)*kick,z:(160+220*Math.random())*kick},
          d,ax:unit(side.x*s,side.y*s,.6),spin:s*(9+6*Math.random())});
        puff(o,F.low?1:2,size*1.6);
      }
      K.sparks(p.x,p.y,p.z,{pal:steel,n:3,sp:[160,520],up:260,life:[.14,.32]});
    }
    function leave(path,draw,p){
      const now=RT-start, us=F.low?[.38,.7]:[.28,.47,.66,.86];
      for(const [j,u] of us.entries()){
        if(knives.length>=cap) return;
        const n=knives.length, tu=draw*u, q=path(u,tu), hero=n%5===2;
        const d=toward(path(Math.max(0,u-.03),tu),path(Math.min(1,u+.03),tu));
        // Every fifth knife hangs closer to the lens: bigger, higher and trailing after-images.
        if(hero) q.z+=120;
        knives.push({n,hero,at:now+tu+.02,p:q,d,len:(132+52*hash(n*3.1))*(j%2?.88:1)*(hero?1.8:1),roll0:hash(n*7.7)*6.28,
          pal:p===night?iris:steel,seed:hash(n*1.37)*40,fog:.34*(mist.fogAt?.(q)||0),brk:Infinity,stick:Infinity});
      }
    }
    // The hanging knives ride one vortex around the assassin. It spins faster and faster until
    // the aim, then brakes hard; meanwhile every blade lies along the current, point first.
    function spin(t){
      const A=Math.min(t,ev.aim);
      let th=.3*A*A;
      if(t>ev.aim) th+=.6*ev.aim*.14*(1-Math.exp(-(t-ev.aim)/.14));
      return th;
    }
    function swirl(k,t){
      const da=spin(t)-spin(k.at), c=Math.cos(da), sn=Math.sin(da);
      const dx=k.p.x-x, dy=(k.p.y-y)/FSY, rx=dx*c-dy*sn, ry=dx*sn+dy*c;
      const tan=unit(-ry,rx,.08), rd=unit(k.d.x*c-k.d.y*sn,k.d.x*sn+k.d.y*c,k.d.z);
      return {p:{x:x+rx,y:y+ry*FSY,z:k.p.z},d:lerpD(rd,tan,.72*ease(sat((t-k.at)/.35)))};
    }
    // While hanging, a knife sways slowly. Once aimed it draws back, and in the hush it shivers.
    function hang(k,t){
      const w=swirl(k,t);
      const ad=toward(w.p,focus()), ae=ease(sat((t-ev.aim-.011*k.n)/.25)), tension=sat((t-ev.hush)/.3), s=k.seed;
      const d=lerpD(w.d,ad,ae,.55*Math.sin(pi*ae));
      const p=step(w.p,ad,-(42*ae+20*tension));
      const A=3+1.5*ae;
      p.x+=A*Math.sin(t*9+s)+5*tension*Math.sin(t*47+s);
      p.y+=A*.6*Math.sin(t*7+s*1.3)+3*tension*Math.sin(t*53+s*.4);
      p.z+=A*Math.sin(t*11+s*.7)+5*tension*Math.sin(t*41+s*.9);
      return {p,d,ae,roll:k.roll0+.35*Math.sin(t*2.1+s)+pi*ae};
    }
    function pose(k,t){
      if(t<k.at||t>=k.brk) return null;
      if(t<ev.fire){ const h=hang(k,t); h.a=sat((t-k.at)/.06); return h; }
      if(!k.hold) return null;
      const f=focus(), arrive=ev.fire+.075, roll=k.roll0+pi;
      if(t<arrive){
        const u=sat((t-ev.fire)/.075), w=u*u, end=step(f,k.in,-k.len);
        return {p:{x:mix(k.hold.x,end.x,w),y:mix(k.hold.y,end.y,w),z:mix(k.hold.z,end.z,w)},
          d:lerpD(k.hd,k.in,ease(sat(u/.4))),roll:roll+u*2,a:1};
      }
      const dest=k.e?center(k.e):k.g, deep=k.len*(k.e?.62:.78);
      if(t<k.stick){
        const u=sat((t-arrive)/k.tt), w=1-(1-u)**2, from=step(f,k.in,-k.len), to=step(dest,k.d2,-deep);
        return {p:{x:mix(from.x,to.x,w),y:mix(from.y,to.y,w),z:mix(from.z,to.z,w)},
          d:lerpD(k.in,k.d2,ease(u)),roll:roll+2,a:1};
      }
      // Lodged: the hilt rings around the point of entry and settles.
      const age=t-k.stick, wob=.2*Math.exp(-age*6.5)*Math.sin(age*58)+.09*sat((t-k.brk+.28)/.28)*Math.sin(age*71+k.seed);
      const side=unit(-k.d2.y,k.d2.x,0), d=unit(k.d2.x+side.x*wob,k.d2.y+side.y*wob,k.d2.z+wob*.5);
      const pin=step(dest,k.d2,0);
      return {p:step(pin,d,-deep),d,roll:roll+2+wob*2,a:1,entry:pin,age};
    }
    function fire(){
      const now=RT-start, f=focus();
      ev.fire=now; body=f.target&&!f.target.dead?f.target:null;
      const live=[];
      for(const k of knives){
        if(now<k.at){ k.brk=-1; continue; }
        const h=hang(k,now); k.hold=h.p; k.hd=h.d; k.in=toward(h.p,f);
        live.push(k);
      }
      const dist=p=>Math.hypot(p.x-f.x,(p.y-f.y)/FSY);
      const free=[...live].sort((a,b)=>dist(a.hold)-dist(b.hold));
      if(body) for(let i=0;i<2&&free.length;i++){ const k=free.shift(); k.e=body; k.d2=k.in; }
      const others=X.onScreen(300).filter(e=>e!==body&&!e.dead).sort((a,b)=>dist(a)-dist(b)).slice(0,F.low?6:10);
      for(const e of others){
        const to=unit(e.x-f.x,(e.y-f.y)/FSY,0);
        let best=null, score=-2;
        for(const k of free){ const ex=unit(k.in.x,k.in.y,0), s=ex.x*to.x+ex.y*to.y; if(s>score){score=s;best=k;} }
        if(!best) break;
        free.splice(free.indexOf(best),1); best.e=e;
        const c=center(e); best.d2=unit(c.x-f.x,(c.y-f.y)/FSY,-.28*Math.hypot(c.x-f.x,(c.y-f.y)/FSY));
      }
      for(const k of free){
        const turn=(hash(k.n*4.7)-.5)*.9, ix=unit(k.in.x,k.in.y,0), c=Math.cos(turn), s=Math.sin(turn);
        const ex={x:ix.x*c-ix.y*s,y:ix.x*s+ix.y*c}, D=radius*(.34+.6*hash(k.n*5.3)), pitch=.42+.4*hash(k.n*2.9);
        k.g={x:f.x+ex.x*D,y:f.y+ex.y*D*FSY,z:0};
        k.d2=unit(ex.x*Math.cos(pitch),ex.y*Math.cos(pitch),-Math.sin(pitch));
      }
      for(const k of live){
        const dest=k.e?center(k.e):k.g;
        k.tt=Math.min(.2,Math.max(.06,dist(dest)/4800));
        k.stick=now+.075+k.tt;
        // Every lodged knife cracks into black vapour inside half a second, outermost last.
        k.brk=Math.max(k.stick+.5,now+.92+.42*sat(dist(dest)/radius)+.08*hash(k.n*9.1));
      }
    }
    // The giants share the hooks' arcs but not their timing: both pass the victim on the climax frame.
    function giantPose(g,t){
      const s=t-ev.cross;
      if(s<-.34) return null;
      // Thrown in from high and far: small and above the arena, swelling as it closes on the victim.
      const come=1-ease(sat((s+.34)/.3)), size=1-.62*come;
      const u=.5+.38*Math.tanh(s*8), q=g.path(u,0), yaw=g.side*(u-.5)*.5;
      const c=Math.cos(yaw), sn=Math.sin(yaw), b=g.dir;
      const d=unit(b.x*c-b.y*sn,b.x*sn+b.y*c,b.z);
      q.z+=g.len*.3+900*come*come; q.x-=g.side*260*come;
      return {p:step(q,d,-g.len*.12*size),d,s,size};
    }
    function frame(t){
      const gpu=F.on, core=chain(), vapour=chain(), glow=chain(), glowR=chain();
      const cool=sat((t-ev.fire-.15)/1.35)*.85;
      for(const k of knives){
        if(k.e&&k.e.dead&&t>k.stick&&k.brk>t+.1) k.brk=t+.1;
        if(t>=k.brk){
          if(!k.burst&&k.last){ k.burst=true; shatter(k.last.p,k.last.d,k.len,k.pal,t,F.low?1:2); }
          continue;
        }
        const q=pose(k,t);
        if(!q) continue;
        k.last=q;
        const grow=1-(1-sat((t-k.at)/.09))**3, len=k.len*(.55+.45*grow), tip=step(q.p,q.d,len*1.14);
        blade(q.p,q.d,len,q.roll,k.pal,q.a,t<ev.fire?k.fog:0,false);
        if(k.hero&&t<ev.fire&&t>k.at+.08){
          for(const [lag,ga] of [[.03,.42],[.065,.2]]){
            const g=pose(k,t-lag);
            if(g) blade(g.p,g.d,len*.97,g.roll,iris,ga,0,false);
          }
        }
        if(!k.lit){ k.lit=true; K.sparks(tip.x,tip.y,tip.z,{pal:steel,n:3,sp:[120,420],up:160,life:[.12,.3]}); }
        if(!gpu) continue;
        const sx=q.d.x, sy=q.d.y*FSY-q.d.z, sl=Math.hypot(sx,sy)||1, px=-sy/sl, py=sx/sl;
        const mid=step(q.p,q.d,len*.32);
        const flash=(c,l,w)=>core.add([{x:c.x-px*l,y:c.y-py*l,z:c.z,w:0},{x:c.x,y:c.y,z:c.z,w},{x:c.x+px*l,y:c.y+py*l,z:c.z,w:0}]);
        const edge=(w,a=-.1,b=1.12)=>core.add([{...step(q.p,q.d,len*a),w:0},{...step(q.p,q.d,len*mix(a,b,.55)),w},{...step(q.p,q.d,len*b),w:0}]);
        // Arrival: a short cross of light where the knife pins itself to the air.
        const born=sat((t-k.at)/.14);
        if(born<1){ flash(mid,len*(.35+.6*born),7*(1-born)**1.5); edge(5*(1-born)); }
        if(t<ev.fire){
          // The reflection runs down the blade as it turns to face the victim.
          const glint=Math.sin(pi*q.ae)**2;
          if(glint>.02){ edge(6*glint); flash(tip,55*glint,4*glint); }
          const tense=sat((t-ev.hush)/.3), smoke=sat((t-k.at-.04)/.3)*(1-.6*q.ae);
          if(!F.low && smoke>.02){
            const seg=[];
            for(let m=0;m<6;m++){
              const v=m/5;
              seg.push({x:tip.x+Math.sin(t*2.3+k.seed+m*.8)*m*4+q.d.x*m*6,y:tip.y-m*2,z:tip.z+m*15*smoke,
                w:10*smoke*Math.sin(pi*(v*.9+.08))*(1-.5*tense)});
            }
            vapour.add(seg);
          }
        } else if(t<k.stick+.06){
          // Converging and piercing: a stretched wake behind the point.
          const seg=[], wide=[];
          for(let j=4;j>=0;j--){
            const r=pose(k,Math.max(ev.fire,t-.065*j/4));
            if(!r) continue;
            const p=step(r.p,r.d,len*1.14), w=[3,13,10,5.5,0][j]*(t>k.stick?1-sat((t-k.stick)/.06):1);
            seg.push({...p,w}); wide.push({...p,w:w*3.2});
          }
          core.add(seg); vapour.add(wide);
        }
        if(q.entry){
          if(!k.hit){
            k.hit=true;
            const dir=Math.atan2(q.d.y,q.d.x);
            K.sparks(q.entry.x,q.entry.y,q.entry.z,{pal:iris,n:F.low?3:5,dir,spread:.5,sp:[260,760],up:300,life:[.14,.36]});
            if(k.e&&!k.e.dead){ k.e.flash=1; k.e.hurtT=.22; k.e.hdx=Math.cos(dir); }
            if(!k.e) K.dust(q.entry.x,q.entry.y,{n:F.low?2:3,r:10,sp:[90,260],s:.7,a:.5,life:.7,c:'#2c2a36',c3:'#8f8aa0'});
          }
          // The exposed steel cools from white to violet to dark iron, then cracks at the grip.
          const end=1-sat((t-k.brk+.12)/.12), w=len*.12*(1-.4*cool)*end*Math.min(1,q.age/.03);
          glow.add([{...step(q.p,q.d,len*.04),w:0},{...step(q.p,q.d,len*.4),w},{...q.entry,w:w*.7},{...step(q.p,q.d,len*1.16),w:0}]);
          if(t>k.brk-.11){
            const c=sat((t-k.brk+.11)/.11), seg=[];
            for(let m=0;m<4;m++){
              const o=step(q.p,q.d,len*(-.62+.2*m)), j=(m%2?1:-1)*9*c;
              seg.push({x:o.x+px*j,y:o.y+py*j,z:o.z,w:m===0||m===3?0:4*c});
            }
            core.add(seg);
          }
        }
      }
      for(const g of giants){
        const q=giantPose(g,t);
        if(!q) continue;
        const crack=sat((q.s-.3)/.22), whole=1-crack;
        if(whole<=.06){ if(!g.gone){ g.gone=true; shatter(q.p,q.d,g.len*.25,steel,t,1,.9,.6); } continue; }
        // The tip breaks first: the hilt stays where it is while the blade shortens behind flying shards.
        const G=g.len*q.size, hilt=step(q.p,q.d,-G*.9), len=G*whole, p=step(hilt,q.d,len*.9);
        const pieces=Math.floor(crack*5);
        while(g.shed<pieces){ g.shed++; shatter(step(p,q.d,len*1.02),q.d,g.len*.32,iris,t,1,.62,.8); }
        const rollG=g.roll+q.s*1.4, show=sat((q.s+.34)/.06);
        // A violet ghost a little larger than the steel reads as a burning rim around the blade.
        blade(step(p,q.d,-len*.03),q.d,len*1.06,rollG,iris,show*.55,0,false);
        blade(p,q.d,len,rollG,steel,show*.95,.04,false);
        if(!gpu) continue;
        const pass=1-Math.min(1,Math.abs(q.s)/.09);
        if(pass>0) core.add([{...step(p,q.d,-len*.2),w:0},{...step(p,q.d,len*.5),w:14*pass},{...step(p,q.d,len*1.14),w:0}]);
        // A highlight runs along the spine and flares on the edge each time the blade turns to the light.
        {
          const sx=q.d.x, sy=q.d.y*FSY-q.d.z, sl=Math.hypot(sx,sy)||1, px=-sy/sl, py=sx/sl;
          const sheen=.45+.55*Math.abs(Math.sin(rollG*1.7+q.s*9)), slide=sat((q.s+.3)/.5);
          const off=len*.05*whole;
          core.add([{...step(p,q.d,len*.05),w:0},{...step(p,q.d,len*mix(.2,.75,slide)),w:7*sheen*show},{...step(p,q.d,len*1.08),w:0}]);
          const e=step(p,q.d,0), f=step(p,q.d,len*1.1);
          glowR.add([{x:e.x+px*off,y:e.y+py*off,z:e.z,w:0},{...step(p,q.d,len*.5),x:step(p,q.d,len*.5).x+px*off,y:step(p,q.d,len*.5).y+py*off,w:11*show},{...f,w:0}]);
        }
        const seg=[];
        for(let j=5;j>=0;j--){
          const r=giantPose(g,Math.max(ev.cross-.14,t-.07*j/5));
          if(!r) continue;
          seg.push({...step(step(step(r.p,r.d,-g.len*.9),r.d,len*.9),r.d,len*1.1),w:[0,10,22,30,26,6][j]*whole});
        }
        vapour.add(seg);
      }
      for(let i=bits.length-1;i>=0;i--){
        const b=bits[i], a=t-b.at;
        if(a>=b.life){ bits.splice(i,1); continue; }
        const ang=b.spin*a, c=Math.cos(ang), s=Math.sin(ang);
        const d=unit(b.d.x*c+b.ax.x*s,b.d.y*c+b.ax.y*s,b.d.z*c+b.ax.z*s);
        const p={x:b.p.x+b.v.x*a,y:b.p.y+b.v.y*a*FSY,z:Math.max(4,b.p.z+b.v.z*a-900*a*a)};
        blade(p,d,b.len*(1-sat((a-.16)/(b.life-.16))),ang*.7,b.pal,1,.15,false);
      }
      if(!gpu) return;
      const m=K.mats();
      if(core.pts.length>1) F.ribbon(m.trC,core.pts,{cA:steel.b,cB:steel.m,cM:steel.h,cC:'#ffffff',gain:2.7,ero:.05,ord:9,ulen:260});
      if(vapour.pts.length>1) F.ribbon(m.trB,vapour.pts,{cA:iris.d,cB:iris.b,cM:iris.m,cC:iris.h,a:.72,gain:1.5,ero:.12,ord:7,ulen:320,t0:t*.6});
      if(glowR.pts.length>1) F.ribbon(m.trB,glowR.pts,{cA:iris.d,cB:iris.b,cM:iris.m,cC:iris.h,a:.85,gain:2.4,ero:.06,ord:8.5,ulen:300});
      if(glow.pts.length>1){
        const h=K.heat(iris,cool);
        F.ribbon(m.glowO,glow.pts,{cA:h.cA,cB:h.cB,cM:h.cM,cC:h.cC,gain:3*h.g,ord:9,ulen:200});
      }
    }
    if(F.on) GFX.add(life,(k,t)=>frame(t)); else X.draw(life,k=>frame(k*life));
    return {
      leave,
      aim(){ ev.aim=RT-start; },
      hush(){ ev.hush=RT-start; },
      fire,
      giants(a,b,delay){
        ev.cross=RT-start+delay;
        giants.push({path:a,side:-1,len:F.low?380:420,dir:unit(-.75,-.55,.42),roll:.6,shed:0},
          {path:b,side:1,len:F.low?410:460,dir:unit(.75,-.55,.42),roll:2.2,shed:0});
      }
    };
  }
  function ultimate(id) {
    X.ultStart(id);
    const C=X.cine, x=pl.x,y=pl.gy, {hw,hh}=X.view(), damage=70000*A.mul(id);
    const echo=bladeEchoes(C);
    const spread=Math.min(hw*.99,hh*2.16), depth=Math.min(hh*.82,spread*.62);
    const radius=Math.min(hw*.78,hh*1.48), finalTime=3.15;
    const mist=window.AssassinMist(x,y,{radius:radius*1.04,duration:4.62,openAt:3.36,pace:4.16});
    let focal={x,y,z:BODY*.61};
    skyDaggers(x,y,radius,()=>focal,mist);
    const ghosts=phantoms(x,y,radius,mist,()=>focal);
    const rend=rends();
    // Two crossing rends tear the whole screen between the dashes; the second X is wider and lower.
    for(const [when,a0,wide,cx0,cy0] of [[1.28,.40,.95,x-hw*.08,y-BODY*.2],[2.56,.30,1.1,x+hw*.06,y-BODY*.05]]){
      after(when,()=>{
        for(const s of [-1,1]){
          rend.cut(cx0,cy0,BODY*.55,s*a0,hw*2.4*wide,s<0?230:200,{delay:s<0?0:.075,bow:s*hh*.05,p:s<0?steel:iris});
          // The fog splits along the rend and stays parted for a moment.
          const L=hw*2.4*wide, ca=Math.cos(s*a0), sa=Math.sin(s*a0);
          after(s<0?0:.075,()=>mist.part?.(u=>({x:cx0+ca*(u-.5)*L,y:cy0+sa*(u-.5)*L,z:BODY*.55}),.07,150,steel));
        }
        X.sfx('slash',1.25,.42); C.shake(.18);
      });
    }
    C.move({x,y:y-BODY*.44,zoom:1.12,tilt:.065,roll:-.017},.44);
    GFX.ambient(.66,.68,.78,3);
    C.SND.inhale(.55,.29);
    K.flare(x,y,BODY*.57,{s:132,pal:steel,sx:2.9,sy:.18,gain:2.4,dur:.35});
    const entry=orbit(x,y,260,-2.7,1,110);
    stroke(entry,steel,90,{draw:.25,hold:.04,fade:.26,fogAt:mist.fogAt,fine:true});
    mist.part?.(entry,.25,83,steel);
    // Silver filings twist into the hood before its silhouette disappears.
    for(let i=0;i<(F.low?12:24);i++){
      const a=i*2.39996, r=190+220*(.5+.5*Math.cos(i*1.87)), z=18+125*(.5+.5*Math.sin(i*.83));
      GFX.pt({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*FSY,z,oc:[x,y,BODY*.66],or:r,
        oa:a,ow:2.8,ok:r*(1.4+.5*Math.sin(i)),oz0:z,rmin:16,life:.61,s:i%4?3:5,m:3,len:.043,
        c:GFX.rgb(i%5?'#7894a8':steel.h),c2:'#2b354b',c3:steel.m,L:2,pri:1});
    }
    after(.32,()=>{ C.SND.shing(1.17,.22); K.sparks(x,y,BODY*.5,{pal:steel,n:9,sp:[130,380],up:170}); });
    after(.49,()=>{ pl.visible=false; C.move({zoom:.89,tilt:.12,roll:.025},1.26); });

    const beats=[
      [.62,-2.9,1,.57,steel],[1.04,.56,-1,.70,night],[1.46,2.65,1,.84,steel],
      [1.84,-.86,-1,.95,night],[2.16,-2.2,1,1.02,steel],[2.46,.60,-1,1.12,steel]
    ];
    beats.forEach(([when,a,side,scale,p],i)=>after(when,()=>{
      const r=radius*scale, targets=X.onScreen(300);
      const dive=i===1||i===4||i===5, run=dive?lunge(x,y,r,a,targets):null;
      const path=run?run.path:orbit(x,y,r,a,side,r*(i%2?.22:.34),a-.7);
      mist.strike(a+side*1.9,scale);
      const draw=i<3?.23:.17;
      const contact=path(.76), lead=path(.72), dir=Math.atan2((contact.y-lead.y)/FSY,contact.x-lead.x);
      if(i===1 || i===4) {
        const bank=i===1?1:-1;
        C.move({x:mix(x,contact.x,.19),y:mix(y,contact.y,.17)-BODY*.47,
          zoom:i===1?.98:.92,tilt:i===1?.105:.14,roll:.018*bank},.37);
      }
      mist.part?.(path,draw,r*(dive?.18:.14),p);
      if(dive) window.MK?.assassinEcho?.(path,{draw,yaw:dir,pal:p,heroBeat:i===1||i===5,fogAt:mist.fogAt});
      const main=i===1||i===4;
      stroke(path,p,r*(main?.27:dive?.19:.25),{draw,hold:dive?.025:.08,fade:dive?.25:.31,fogAt:mist.fogAt,fine:true});
      // Sparks are thrown off the edge as it passes, along the cut.
      for(const u of (F.low?[.5]:[.34,.58,.82])) after(draw*u,()=>{
        const q=path(u), q1=path(u+.02), d=Math.atan2((q1.y-q.y)/FSY,q1.x-q.x);
        K.sparks(q.x,q.y,q.z,{pal:p,n:main?7:4,dir:d,spread:.3,sp:[380,1100],up:220,life:[.12,.3]});
      });
      after(draw,()=>{
        const q=path(.97), q0=path(.92), d=Math.atan2((q.y-q0.y)/FSY,q.x-q0.x);
        K.sparks(q.x,q.y,q.z,{pal:i%2?iris:steel,n:F.low?4:9,dir:d,spread:.5,sp:[520,1500],up:300,life:[.16,.42]});
        K.sparks(q.x,q.y,q.z,{pal:gold,n:F.low?1:3,dir:d,spread:.25,sp:[900,1900],up:200,life:[.1,.22]});
      });
      ghosts.leave(path,draw,p);
      after(draw+.045,()=>afterglow(path,i%2?frost:iris,r*(dive?.15:.21),side,mist.fogAt));
      after(draw*.76,()=>{
        impact(contact.x,contact.y,contact.z,dir,p,dive?1.04:.67);
        if(run?.target && !run.target.dead){
          K.knock(run.target,{dir,dist:220,up:560,stun:.42,fx:0});
          K.ehit(run.target,{pal:p,pw:.9,dir,ring:0,light:0});
        }
      });
      groundCut(path,night,54+i*3,1.04);
      X.sfx('whoosh',1+i*.05,.32); X.sfx('slash',.8+i*.075,.52);
      echo(side,.88+i*.045);
      let accents=0;
      for(const e of targets){
        const polar=Math.atan2((e.y-y)/FSY,e.x-x);
        const phase=((side*(polar-a)%(2*pi))+2*pi)%(2*pi);
        const dx=e.x-contact.x, dy=(e.y-contact.y)/FSY;
        const along=dx*Math.cos(dir)+dy*Math.sin(dir), across=-dx*Math.sin(dir)+dy*Math.cos(dir);
        if(dive?(Math.abs(across)>r*.32||along>r*.6||along< -r*1.55):phase>3.65) continue;
        const hitTime=dive?draw*sat(.76+.5*along/r):.04+.15*phase/3.65;
        after(hitTime,()=>{
          if(e.dead) return;
          X.dmg(e,Math.min(damage*.025,e.hp*.20),{crit:true,kb:0,stun:.26});
          e.flash=.52;
          if(accents++<2 && e!==run?.target) K.ehit(e,{pal:p,pw:.62,dir,ring:0,light:0});
        });
      }
    }));
    after(2.67,()=>{
      const near=X.onScreen(0).filter(e=>Math.abs(e.x-x)<hw*.69&&Math.abs(e.y-y)<hh*.57)
        .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
      if(near) focal={x:near.x,y:near.y,z:near.h*.48+near.z,target:near};
      const {x:cx,y:cy,z}=focal;
      C.move({x:mix(x,cx,.65),y:mix(y,cy,.65)-BODY*.55,zoom:1.14,tilt:.095,roll:-.047},.44);
      C.SND.inhale(.24,.23);
      if(F.on) GFX.light(cx,cy,410,steel.l,.43,.42,{z:z*.8});
      K.flare(cx,cy,z,{s:74,sx:1.9,sy:.17,pal:steel,gain:1.8,dur:.24});
      ghosts.aim();
      after(.12,()=>C.SND.shing(1.34,.14));
    });
    after(finalTime-.20,()=>{ C.hush(.19,{a:.65,c:'#cbd2f4'}); ghosts.hush(); });
    after(finalTime+.10,()=>{ ghosts.fire(); X.sfx('whoosh',1.45,.42); });
    after(finalTime-.12,()=>{
      if(focal.target && !focal.target.dead){
        focal.x=focal.target.x; focal.y=focal.target.y; focal.z=focal.target.h*.48+focal.target.z;
      }
      const first=hook(focal.x,focal.y,spread*.88,depth,-1,focal.z);
      ghosts.giants(hook(focal.x,focal.y,spread*.88,depth,-1,focal.z),hook(focal.x,focal.y,spread,depth,1,focal.z),.295);
      mist.part?.(first,.24,depth*.24,steel);
      stroke(first,steel,depth*.60,{draw:.24,hold:.015,fade:.28,heavy:true,fogAt:mist.fogAt,fine:true});
      groundCut(first,steel,depth*.15,1.23);
    });
    after(finalTime,()=>{
      const targets=X.onScreen(300);
      const second=hook(focal.x,focal.y,spread,depth,1,focal.z);
      C.move({x:focal.x-45,y:focal.y-BODY*.55,zoom:1.01,tilt:.14,roll:.009},.13,'out');
      mist.strike(.08,1.5); mist.strike(pi+.08,1.5);
      after(.065,()=>{
        mist.part?.(second,.22,depth*.36,iris);
        rupture(second,depth,mist.fogAt);
        groundCut(second,iris,depth*.20,1.46);
      });
      C.shake(.36); C.SND.shing(.82,.46);
      const {x:cx,y:cy}=focal;
      GFX.ripple(cx,cy,radius*1.12,{life:.36,s:.4});
      impact(cx,cy,focal.z,pi-.25,steel,1.33);
      const distance=e=>Math.hypot(e.x-cx,(e.y-cy)/FSY);
      targets.sort((a,b)=>distance(a)-distance(b));
      const primary=targets.includes(focal.target)?focal.target:targets[0];
      after(.175,()=>{
        hitstop=Math.max(hitstop,.085); C.shake(.82); C.SND.hit(.72);
        C.peak(cx,cy-focal.z,{ca:.009,blur:.03,hold:.035,out:.13,tint:'#dfe4ff',a:.5});
        // The climax X spans the whole screen through the victim; the floor splits under it.
        for(const s of [-1,1]) rend.cut(cx,cy,focal.z,s*.46,hw*3.1,290,{bow:s*hh*.03,p:s<0?steel:iris,heavy:true,draw:.05,hold:.12,life:.56});
        K.cool(cx,cy,{kind:'crack2',r:radius*.42,pal:iris,life:1.5,hot:.85,grow:.06,light:0});
        GFX.ripple(cx,cy,radius*1.6,{life:.5,s:.55});
        // A ragged band of light runs out across the floor ahead of the fog being blown open.
        if(F.on){
          const sd=Math.random()*9;
          GFX.add(.42,(k,t)=>{
            const e=1-(1-k)**3, R=mix(90,radius*1.35,e), pts=[];
            for(let j=0;j<=48;j++){
              const a=j/48*2*pi, jag=1+.07*Math.sin(5*a+sd)+.04*Math.sin(13*a+2*sd);
              pts.push({x:cx+Math.cos(a)*R*jag,y:cy+Math.sin(a)*R*jag*FSY,z:3,w:(46*(1-k)+6)*(.55+.45*Math.sin(7*a+sd)**2)});
            }
            F.ribbon(K.mats().trC,pts,{cA:iris.d,cB:iris.b,cM:steel.h,cC:'#ffffff',a:(1-k)**1.4,gain:2.6,ero:.12+.4*k,layer:'g',ulen:500});
          });
        }
        K.flare(cx,cy,focal.z,{s:128,pal:gold,sx:2.1,sy:.24,dur:.135});
        impact(cx,cy,focal.z,.22,iris,1.54);
        // The second cut kicks a short V of mist away from the struck body.
        for(const side of [-1,1]){
          const peel=u=>({x:cx+(u*.81+.19*u*u)*depth*.86,
            y:cy+side*Math.sin(u*pi*.63)*depth*.53*FSY,z:14+depth*.09*Math.sin(u*pi)});
          mist.part?.(peel,.14,depth*.32,gold);
          K.dust(cx,cy,{r:22,n:F.low?4:8,dir:side*.69,spread:.28,sp:[280,880],up:250,
            a:.56,s:1.2,c:'#0d0b16',c3:'#6e5f9e',life:.64});
        }
        C.move({x:cx+62,y:cy-BODY*.53,zoom:.80,tilt:.19,roll:.022},.17,'out');
        X.sfx('slash',.65,.7);
        echo(1,.88,true);
        // One running cast total, placed at contact. Add only damage already committed by ultHit.
        let total=0,number;
        function showAppliedDamage(){
          if(!V.ultSum) return;
          total+=V.ultSum; V.ultSum=0;
          if(!number){
            number={x:(primary?.x??cx)+BODY*.72,y:(primary?.y??cy)-(primary?primary.h+primary.z:focal.z)-BODY*.48,t:.08,big:true};
            V.nums.push(number);
          }
          number.txt=X.fmtN(total);
        }
        // The rippling outer hits retain the engine's normal damage, rewards and death impulse.
        C.sweep(cx,cy,damage,{list:targets.filter(e=>e!==primary),speed:5700,max:.24,fx:showAppliedDamage});
        if(primary&&!primary.dead){
          K.knock(primary,{dir:.22,dist:660,up:1430,stun:.8,fx:0});
          primary.mkC=gold.l; primary.mkT=RT+.29; primary.hurtT=.32;
          K.ehit(primary,{pal:gold,pw:1.04,dir:.22,ring:0,light:0});
          X.ultHit(primary,damage,cx,cy);
        }
        showAppliedDamage();
      });
      targets.forEach((e,i)=>{
        if(e===primary) return;
        const dir=Math.atan2((e.y-cy)/FSY,e.x-cx);
        const delay=Math.min(.24,distance(e)/5400);
        after(delay,()=>{
          if(e.dead) return;
          K.knock(e,{dir,dist:510,up:1050,stun:.8,fx:i<4?1:0});
          if(i<3) K.ehit(e,{pal:e.x<cx?steel:gold,pw:.91,dir,ring:0,light:0});
          if(i===3||i===9) impact(e.x,e.y,e.h*.42,dir,e.x<cx?steel:gold,.82);
        });
      });
    });
    // Aftermath: chips of steel catch the light as they drift down through the thinning fog.
    after(3.5,()=>{
      for(let i=0;i<(F.low?14:30);i++){
        const a=Math.random()*2*pi, r=radius*(.15+.9*Math.random());
        GFX.pt({x:focal.x+Math.cos(a)*r,y:focal.y+Math.sin(a)*r*FSY,z:260+520*Math.random(),vx:(Math.random()-.5)*60,vy:(Math.random()-.5)*30,
          vz:-60-80*Math.random(),g:120,drag:.8,life:.9+.6*Math.random(),s:i%3?3:5,m:3,len:.05,
          c:GFX.rgb(i%4?steel.h:iris.h),c2:'#2b354b',c3:'#ffffff',L:2,pri:1});
      }
    });
    after(3.62,()=>{
      pl.visible=true;
      if (window.MK && MK.on()) MK.play('assassinCut',{yaw:pl.f>0?0:pi,blend:.045});
      K.flare(x,y,BODY*.58,{pal:steel,s:112,sx:2.7,sy:.18,gain:2,dur:.31});
      GFX.ambient(.82,.84,.90,1.8);
      C.move({x,y:y-BODY*.45,zoom:1,tilt:.06,roll:0},.64);
    });
    after(4.0,()=>{C.back(.7); GFX.ambient(1,1,1,2);});
    after(4.78,()=>X.ultStop());
  }
  const ordinary=window.AssassinSkills;
  const ults={as_ult1:ultimate};
  Object.assign(sk,ordinary?.sk);
  for(const [id,lv,spell] of [['as_ult3',5,window.AssassinEclipse],['as_ult2',12,window.AssassinLoom]]){
    if(!spell) continue;
    sk[id]={cls:'assassin',type:'ult',name:spell.name,desc:spell.desc,lv};
    ults[id]=spell.cast;
  }
  X.reg('assassin',{sk,order:['as_basic',...Object.keys(ordinary?.sk||{}),...Object.keys(ults)],
    basic:{fn:basic,cd:()=>.54*(1-.04*(A.sLv('as_basic')-1))},skills:ordinary?.skills||{},ults});
})();

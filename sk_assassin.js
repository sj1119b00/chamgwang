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
        dist:.027,nk:.36,ero:.07,soft:.22,rk:[.46,1.04],cA:'#130c19',cB:'#784059',cM:'#ffb578',cC:'#fff1bf',op:.78});
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
  function stroke(path,p,width,{draw=.16,hold=.10,fade=.34,heavy=false,fogAt}={}) {
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
      if(window.AssassinCuts?.sweep(pts,p,{t,fade:fadeT,heavy,fogAt})) return;
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
    if(!F.on){ stroke(path,gold,depth*.54,{draw:.22,hold:.04,fade:.4,heavy:true}); return; }
    const m=materials(), shared=K.mats(), c=colors(gold), draw=.22;
    GFX.add(.92,(k,t)=>{
      const head=Math.max(.005,sat(t/draw)), fade=sat((t-.26)/.66), tail=.88*fade*fade;
      const pts=sample(path,Math.min(tail,head-.002),head,depth*.33,t,35);
      if(window.AssassinCuts?.fracture(pts,gold,{t,fade,depth,fogAt,path})) return;
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
      if(F.solids?.()){
        GFX.add(1.52,(k,t)=>{
          const lift=Math.sin(pi*sat(t/.54)), out=sat((t-.64)/.86), dist=size*.82*sat(t/.54);
          F.solid('slab',i%4,q.x-side*Math.sin(th)*dist,q.y+side*Math.cos(th)*dist*FSY,size*(.16+.72*lift)*(1-out),{
            M:F.xf({sx:size*1.5,sy:size,sz:size*.9,rx:side*(1.1-.7*lift),ry:-.12,rz:th}),
            alb:'#34313a',emis:'#be805d',rimC:'#d6bc9d',spec:.36,rim:.35,detail:1,strata:4,
            glow:.48*(1-k),edge:.07,heat:.15*(1-k),ero:.8*out,clip:0,seed:u*13,
            shadow:F.low?null:[.55,.28,.4*(1-out)]});
        },delay);
      }
      after(delay,()=>K.dust(q.x,q.y,{n:4,r:32,dir:th+side*pi*.34,spread:.4,sp:[170,560],s:1.22,a:.49,life:.78,c:'#31303b',c3:'#ad968a'}));
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
      const size=r*(follower?.055:leader?.088:.078)*(crossing?.91:1);
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
        const age=Math.max(0,t-launch), open=1-(1-sat(age/.64))**2;
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
          const v=sat((t-release)/.96);
          const travel=1-(1-v)**1.85, arch=Math.sin(pi*travel);
          q.x=f.x+side*r*((.80+.35*Math.sin(pi*fan))*travel+.24*arch);
          q.y=f.y+r*FSY*((fan*.82-.29)*travel-.12*arch);
          q.z=f.z*(1-travel)+r*((.37-.18*fan)*travel+(.30-.11*fan)*arch);
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
      knives.push({lane,launch,recall,release,advance,past,bankPass,p,size,leader,skimAt,crossing});
    }
    function frame(t) {
      for(const b of knives){
        if(t<b.launch) continue;
        const burst=t>=b.release, age=t-(burst?b.release:b.launch);
        // The silence before the finisher has no blades hanging over its point of contact.
        const alpha=sat(age/(burst?.065:.11))*(burst?1-sat((age-.37)/.60):1-sat((t-b.recall-.31)/.12));
        if(alpha<.015) continue;
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
          const wake=alpha*(1-obscured*.82);
          if(!window.AssassinCuts?.sweep(trail,shade,{trail:true,t,fade:1-alpha,side:b.lane%2?1:-1,edgePoints:edges,fogAt:mist.fogAt})){
            F.ribbon(m.trB,trail,{...c,a:.72*wake,gain:1.7,ero:.1,t0:b.lane*.7,ord:6});
          }
          if(window.AssassinBlades?.draw(p,prev,len,roll,shade,alpha,8,obscured,mist.fogAt)) continue;
          if(daggerImage.ok) F.bill(body,p.x,p.y,p.z,len,len*.33*bank,rot,
            {cB:burst?shade.h:'#ffffff',cC:shade.m,ero:(1-alpha)*.69-.08,gain:1.28,
              a:alpha,ord:8});
          const hot=.5+.5*Math.cos(t*14+b.lane*1.9);
          if(b.lane%2===0 && hot>.78){
            F.bill(m.glowO,p.x+Math.cos(rot)*len*.45,p.y,p.z-Math.sin(rot)*len*.45,
              len*(b.leader?.42:.26),len*.09,rot+.85,{...c,gain:2.4,a:alpha*(hot-.78)/.22,ord:9});
          }
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
  function ultimate(id) {
    X.ultStart(id);
    const C=X.cine, x=pl.x,y=pl.gy, {hw,hh}=X.view(), damage=70000*A.mul(id);
    const echo=bladeEchoes(C);
    const spread=Math.min(hw*.99,hh*2.16), depth=Math.min(hh*.82,spread*.62);
    const radius=Math.min(hw*.78,hh*1.48), finalTime=3.15;
    const mist=window.AssassinMist(x,y,{radius:radius*1.04,duration:4.16});
    let focal={x,y,z:BODY*.61};
    skyDaggers(x,y,radius,()=>focal,mist);
    C.move({x,y:y-BODY*.44,zoom:1.12,tilt:.065,roll:-.017},.44);
    GFX.ambient(.66,.68,.78,3);
    C.SND.inhale(.55,.29);
    K.flare(x,y,BODY*.57,{s:132,pal:steel,sx:2.9,sy:.18,gain:2.4,dur:.35});
    const entry=orbit(x,y,260,-2.7,1,110);
    stroke(entry,steel,90,{draw:.25,hold:.04,fade:.26,fogAt:mist.fogAt});
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
      stroke(path,p,r*(dive?.19:.25),{draw,hold:dive?.025:.08,fade:dive?.25:.31,fogAt:mist.fogAt});
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
    });
    after(finalTime-.20,()=>{ C.hush(.19,{a:.65,c:'#cbd2f4'}); });
    after(finalTime-.12,()=>{
      if(focal.target && !focal.target.dead){
        focal.x=focal.target.x; focal.y=focal.target.y; focal.z=focal.target.h*.48+focal.target.z;
      }
      const first=hook(focal.x,focal.y,spread*.88,depth,-1,focal.z);
      mist.part?.(first,.24,depth*.24,steel);
      stroke(first,steel,depth*.60,{draw:.24,hold:.015,fade:.28,heavy:true,fogAt:mist.fogAt});
      groundCut(first,steel,depth*.15,1.23);
    });
    after(finalTime,()=>{
      const targets=X.onScreen(300);
      const second=hook(focal.x,focal.y,spread,depth,1,focal.z);
      C.move({x:focal.x-45,y:focal.y-BODY*.55,zoom:1.01,tilt:.14,roll:.009},.13,'out');
      mist.strike(.08,1.5); mist.strike(pi+.08,1.5);
      after(.065,()=>{
        mist.part?.(second,.22,depth*.36,gold);
        rupture(second,depth,mist.fogAt);
        groundCut(second,gold,depth*.20,1.46);
      });
      C.shake(.36); C.SND.shing(.82,.46);
      const {x:cx,y:cy}=focal;
      GFX.ripple(cx,cy,radius*1.12,{life:.36,s:.4});
      impact(cx,cy,focal.z,pi-.25,steel,1.33);
      const distance=e=>Math.hypot(e.x-cx,(e.y-cy)/FSY);
      targets.sort((a,b)=>distance(a)-distance(b));
      const primary=targets.includes(focal.target)?focal.target:targets[0];
      after(.175,()=>{
        hitstop=Math.max(hitstop,.068); C.shake(.82); C.SND.hit(.72);
        C.peak(cx,cy-focal.z,{ca:.006,blur:.014,hold:.035,out:.115});
        K.flare(cx,cy,focal.z,{s:128,pal:gold,sx:2.1,sy:.24,dur:.135});
        impact(cx,cy,focal.z,.22,gold,1.54);
        // The second cut kicks a short V of mist away from the struck body.
        for(const side of [-1,1]){
          const peel=u=>({x:cx+(u*.81+.19*u*u)*depth*.86,
            y:cy+side*Math.sin(u*pi*.63)*depth*.53*FSY,z:14+depth*.09*Math.sin(u*pi)});
          mist.part?.(peel,.14,depth*.32,gold);
          K.dust(cx,cy,{r:22,n:F.low?4:8,dir:side*.69,spread:.28,sp:[280,880],up:250,
            a:.56,s:1.2,c:'#3d3541',c3:'#dbc4ac',life:.64});
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
    after(3.62,()=>{
      pl.visible=true;
      if (window.MK && MK.on()) MK.play('assassinCut',{yaw:pl.f>0?0:pi,blend:.045});
      K.flare(x,y,BODY*.58,{pal:steel,s:112,sx:2.7,sy:.18,gain:2,dur:.31});
      GFX.ambient(.82,.84,.90,1.8);
      C.move({x,y:y-BODY*.45,zoom:1,tilt:.06,roll:0},.64);
    });
    after(4.05,()=>{C.back(.83); GFX.ambient(1,1,1,2);});
    after(5.25,()=>X.ultStop());
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

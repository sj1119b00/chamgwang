// Archer. Floor y is already foreshortened; projectile z is measured above it.
'use strict';
(() => {
  const X = RPG.sv, {V, A, BODY, FSY, cine:C} = X, K = K3;
  const TAU = Math.PI*2, sat = x => Math.max(0, Math.min(1,x));
  const mix = (a,b,t) => a+(b-a)*t, ease = t => t*t*(3-2*t);
  const wind = {d:'#072a31',b:'#16877d',m:'#8ee5c8',h:'#effff1',l:'#68ebc3',s:'#d0fff0'};
  const brass = {d:'#311b19',b:'#ad6632',m:'#f5ca74',h:'#fff9db',l:'#edbb63',s:'#fff0bc'};
  const night = {d:'#0b1440',b:'#3f55d8',m:'#9db4ff',h:'#f2f8ff',l:'#7f9cff',s:'#d7dcff'};
  const point = (x,y,z=0) => ({x,y,z});
  const fromHero = () => point(pl.x+pl.f*55,pl.gy,BODY*.66);
  const onEnemy = e => point(e.x,e.y,(e.z||0)+e.h*.48);
  const pose = (name,time) => window.RangedHero?.pose(name,time);
  const evo = id => A.sLv(id)>=5;
  const low = () => FX3.low || !!A.SV.opt?.calm;
  const relic = {};
  let castEpoch=0;
  function later(delay,fn) {
    const epoch=castEpoch,room=V.dying;
    after(delay,()=>{if(epoch===castEpoch && room===V.dying && RPG.mode==='surv')fn();});
  }
  function plate(name) {
    if (!relic[name]) {
      const im = new Image();
      im.src = 'assets/'+name+'.webp?v='+ASSET_V;
      relic[name] = im;
    }
    return relic[name];
  }
  function poly(g, pts, fill) {
    g.fillStyle=fill; g.beginPath(); g.moveTo(...pts[0]);
    for (let i=1;i<pts.length;i++) g.lineTo(...pts[i]);
    g.closePath(); g.fill();
  }
  function line(g,pts,color,width) {
    g.beginPath(); g.moveTo(...pts[0]);
    for (let i=1;i<pts.length;i++) g.lineTo(...pts[i]);
    g.strokeStyle=color; g.lineWidth=width; g.stroke();
  }
  function star(g,x,y,r,tint,twist=0) {
    g.save(); g.translate(x,y); g.rotate(twist);
    poly(g,[[0,-r], [.11*r,-.13*r],[r*.73,0],[.12*r,.12*r],[0,r],[-.11*r,.13*r],[-r*.73,0],[-.11*r,-.13*r]],tint);
    g.restore();
  }
  function imageReady(im) { return im.complete && im.naturalWidth>0; }
  function preload() {
    ['ar_sonic_arrow','ar_eclipse_bow','ar_mach_front','archer_sidereal_stag'].forEach(plate);
  }
  function arrow(p,prev,len,alpha=1) {
    const im=plate('ar_sonic_arrow');
    const a=Math.atan2(p.y-p.z-prev.y+prev.z,p.x-prev.x);
    ctx.save(); ctx.translate(p.x,p.y-p.z); ctx.rotate(a); ctx.globalAlpha=alpha;
    if (imageReady(im)) ctx.drawImage(im,-len*.95,-len*.101,len,len*.202);
    else {
      line(ctx,[[-len*.94,0],[-len*.18,0]],'#bbbf8b',Math.max(3,len*.024));
      poly(ctx,[[-len*.32,-len*.054],[0,0],[-len*.32,len*.054],[-len*.23,0]],'#e3f3ce');
      for (const s of [-1,1]) poly(ctx,[[-len*.70,0],[-len*.93,s*len*.09],[-len*.87,0]],'#80c9b7');
    }
    ctx.restore();
  }
  function arcPath(start,end,height=0) {
    return u => point(mix(start.x,end.x,u),mix(start.y,end.y,u),mix(start.z,end.z,u)+Math.sin(Math.PI*u)*height);
  }
  function ribbon(path,u0,u1,p,width,alpha,heavy=false) {
    if (u1<=u0 || alpha<=.001) return;
    const n=heavy?32:10, pts=[];
    for(let j=0;j<=n;j++){
      const q=path(mix(u0,u1,j/n));
      pts.push({...q,w:width*(.015+Math.sin(j/n*Math.PI*.78)**.73)});
    }
    if (FX3.on) {
      const m=K.mats(), color={cA:p.d,cB:p.b,cM:p.m,cC:p.h};
      FX3.ribbon(m.smB,pts,{...color,gain:heavy?1.52:1.18,ero:.12,a:alpha,ord:4});
      for (const q of pts) q.w*=heavy?.21:.32;
      FX3.ribbon(m.trC,pts,{...color,gain:1.85,a:alpha,ord:5});
    } else {
      const flat=pts.map(q=>[q.x,q.y-q.z]);
      fx.save();fx.globalAlpha=alpha;line(fx,flat,p.b,width*.66);line(fx,flat,p.h,width*.16);fx.restore();
    }
  }
  // GFX's queue is built after the canvas world is drawn. Register the GPU
  // and canvas passes separately so headless and Canvas-only renderers agree.
  function animate(life,paintCanvas,paintGpu,delay=0) {
    const epoch=castEpoch;
    if (paintCanvas) X.draw(life,k=>{if(epoch===castEpoch)paintCanvas(k,k*life);},delay);
    if (paintGpu) {
      if (FX3.on) GFX.add(life,(k,t)=>paintGpu(k,t),delay);
      else X.draw(life,k=>{if(epoch===castEpoch)paintGpu(k,k*life);},delay);
    }
  }
  // A painted streak behind a moving head: hair-thin at the tail, full width
  // just behind the head. tip 0 keeps the head blunt (two halves meeting).
  function streak(path,u0,u1,p,width,alpha=1,tip=.7) {
    if (u1<=u0 || alpha<=.001) return;
    const n=12, pts=[];
    for(let j=0;j<=n;j++){
      const f=j/n,q=path(mix(u0,u1,f));
      pts.push({...q,w:width*(.05+.95*f**.6)*(1-f**6*tip)});
    }
    if (FX3.on) {
      const m=K.mats(), color={cA:p.d,cB:p.b,cM:p.m,cC:p.h};
      FX3.ribbon(m.trB,pts,{...color,gain:2.7,ero:.14,a:alpha,ord:4});
      for (const q of pts) q.w*=.34;
      FX3.ribbon(m.trC,pts,{...color,gain:4.2,a:alpha,ord:5});
    } else {
      const flat=pts.map(q=>[q.x,q.y-q.z]);
      fx.save();fx.globalAlpha=alpha;line(fx,flat,p.b,width*.66);line(fx,flat,p.h,width*.16);fx.restore();
    }
  }
  function flight(path,duration,p=wind,len=240,w=60,tail=.22) {
    animate(duration,k=>arrow(path(k),path(Math.max(0,k-.012)),len),null);
    animate(duration+tail,null,(k,t)=>{
      const head=sat(t/duration), cooling=sat((t-duration)/tail);
      streak(path,Math.min(.99,Math.max(0,head-.7)+cooling*.69),head,p,w,(1-cooling)**1.2);
    });
  }
  function nock(e,sec=.15) { X.face(X.angTo(e));pose('draw',sec); }
  function release(p=wind) {
    pose('release',.24);X.sfx('whoosh',1.65,.23);
    const q=fromHero();
    K.flare(q.x,q.y,q.z,{pal:p,s:130,sx:2.1,sy:.4,dur:.13,gain:2.2});
    if(!FX3.on) animate(.15,k=>{fx.save();fx.globalAlpha=(1-k)*.85;star(fx,q.x,q.y-q.z,47*(.32+.68*Math.sin(Math.PI*k)),p.h,.65);fx.restore();});
  }
  function hitAt(e,p,pw=1) {
    if (!e.dead) X.hitFx(e,p.l,pw);
  }
  // The first bodies of a cast get the kit's full reaction, the rest the cheap flash.
  function struck(e,p,i,pw=1.1) {
    if (e.dead) return;
    if (i<3 && FX3.on) K.ehit(e,{pal:p,pw,ring:0}); else hitAt(e,p,pw);
  }
  function impactAt(q,p,r=155) {
    K.flare(q.x,q.y,q.z,{pal:p,s:r,sx:1.7,sy:.45,dur:.22,gain:1});
    GFX.light(q.x,q.y,r*2.3,p.l,.55,.25,{z:q.z});
    K.sparks(q.x,q.y,q.z,{pal:p,n:low()?3:7,sp:[160,530],up:300,life:[.16,.36]});
  }
  // One landing: a volume body, a white-hot core, the floor lit and scarred.
  function blast(q,p,s,o={}) {
    const z=o.z??s*.3;
    K.vblast(q.x,q.y,{pal:p,s,z,smoke:o.smoke||0,dur:.45,fire:.26,rise:s*.22,heat:o.heat||.75,lump:.62});
    K.flare(q.x,q.y,z,{pal:p,s:s*.5,dur:.12,gain:2});
    GFX.light(q.x,q.y,s*2.6,p.l,o.light||.75,.32,{z:140});
    if(o.scar && !FX3.low) K.cool(q.x,q.y,{kind:o.scar,r:s*(o.scarR||.8),pal:p,life:o.life||1.5,start:.2,light:0});
    K.sparks(q.x,q.y,z,{pal:p,n:low()?4:10,sp:[300,1100],up:520});
    trauma=Math.min(1,trauma+(o.shake??.25));
    if(o.stop && !A.SV.opt?.calm) hitstop=Math.max(hitstop,o.stop);
  }
  function normalShot(e,dmg,p=wind) {
    const start=fromHero(),end=onEnemy(e),dur=Math.max(.10,Math.min(.3,Math.hypot(end.x-start.x,end.y-start.y)/3600));
    // Interpolate towards the moving target until contact, even while the player strafes.
    const path=u=>arcPath(start,e.dead?end:onEnemy(e),20)(u);
    flight(path,dur,p,210,44,.16); later(dur,()=>{
      if(e.dead) return;
      hitAt(e,p,1.2); GFX.light(e.x,e.y,260,p.l,.4,.16,{z:60});
      X.dmg(e,dmg,{kb:.25,sx:start.x,sy:start.y});
    });
  }
  const sk={ar_basic:{cls:'archer',type:'basic',name:'깃시위',lv:1,desc:'시위를 당겨 가장 가까운 적의 몸통에 깃화살을 꽂는다.'}};
  const skills={};
  function skill(id,name,lv,cd,dmg,desc,upgrade,fn) {
    sk[id]={cls:'archer',type:'skill',name,lv,cd,dmg,desc,evo:upgrade};
    skills[id]={fn:()=>fn(dmg*A.mul(id),evo(id))};
  }
  function basic() {
    const e=X.nearest(1100); if(!e) return false;
    nock(e,.105); later(.105,()=>{ release(); normalShot(e,1040*A.mul('ar_basic')); }); return true;
  }
  // Three (five) broad feathers of wind open from the bow; each lane is left scored in the floor.
  skill('ar_fan','삼우개화',1,4.5,1140,'세 발의 화살을 부채꼴로 펼쳐 앞을 휩쓴다.','다섯 발을 펼치고 부채의 바깥쪽까지 꿰뚫는다.',(d,up)=>{
    const e=X.nearest(1060); if(!e) return false;
    nock(e);const a=X.angTo(e),n=up?5:3;
    later(.15,()=>{release(); const p=fromHero(),hit=new Set(),L=1090;let shown=0;
      K.dust(pl.x,pl.gy,{n:low()?3:6,dir:a+Math.PI,spread:.7,sp:[220,560],a:.36});
      GFX.light(p.x+Math.cos(a)*L*.45,p.y+Math.sin(a)*L*.45,L*.62,wind.l,.62,.36,{z:90});
      for(let i=0;i<n;i++){
        const ang=a+(i-(n-1)*.5)*.162,ca=Math.cos(ang),sa=Math.sin(ang);
        const end=point(p.x+ca*L,p.y+sa*L,p.z*.75);
        flight(arcPath(p,end,42),.26,wind,270,up?92:78,.3);
        if(!FX3.low && i%2===(n>>1)%2) K.coolLine(p.x+ca*190,p.y+sa*190,end.x,end.y,{pal:wind,w:up?34:28,life:1.15,grow:.26,start:.28,light:0,shed:0});
        X.inLine(p.x,p.y,end.x,end.y,44,t=>{
          if(hit.has(t))return;hit.add(t);const dt=.26*sat(Math.hypot(t.x-p.x,t.y-p.y)/L);
          later(dt,()=>{if(!t.dead){struck(t,wind,shown++);X.dmg(t,d,{kb:0,push:up?260:190,sx:p.x,sy:p.y});}});
        });
      }
    });return true;
  });
  // One heavy bronze head bores a straight glowing furrow, a wind helix wound round its wake.
  skill('ar_drill','나선 관통시',1,5.8,1910,'회전하는 청동 화살촉이 일직선으로 적을 관통한다.','관통 폭이 넓어지고 종점에 압력파를 낸다.',(d,up)=>{
    const e=X.nearest(1340);if(!e)return false;nock(e,.23);const a=X.angTo(e);
    later(.23,()=>{release(brass);X.sfx('whoosh',.9,.5);const p=fromHero(),L=1450,ca=Math.cos(a),sa=Math.sin(a),end=point(p.x+ca*L,p.y+sa*L,p.z*.8),path=arcPath(p,end);
      const wide=up?105:68,rad=up?92:66;let shown=0;
      flight(path,.31,brass,430,up?150:118,.32);
      animate(.31+.24,null,(k,t)=>{
        const head=sat(t/.31),fade=1-sat((t-.31)/.24);
        const helix=u=>{const q=path(u),r=rad*Math.sin(u*19);q.x+=r*sa;q.y-=r*ca;q.z+=rad*.8*Math.cos(u*19);return q;};
        streak(helix,Math.max(0,head-.72),head,wind,58,fade);
      });
      K.coolLine(p.x+ca*150,p.y+sa*150,end.x,end.y,{pal:brass,w:wide*.62,life:1.6,grow:.3,start:.12,light:0});
      GFX.light(p.x+ca*L*.5,p.y+sa*L*.5,L*.6,brass.l,.7,.42,{z:80});
      K.dust(pl.x,pl.gy,{n:low()?3:7,dir:a+Math.PI,spread:.6,sp:[260,640],a:.4});
      trauma=Math.min(1,trauma+.2);
      X.inLine(p.x,p.y,end.x,end.y,wide,t=>later(.31*sat(Math.hypot(t.x-p.x,t.y-p.y)/L),()=>{if(!t.dead){struck(t,brass,shown++,1.3);X.dmg(t,d,{kb:0,push:230,sx:p.x,sy:p.y});}}));
      later(.31,()=>{
        if(!up){impactAt(end,brass,190);return;}
        K.flare(end.x,end.y,end.z,{pal:brass,s:230,dur:.14,gain:2.2});K.vring(end.x,end.y,{r:330,r0:60,dur:.5,pal:brass,heat:.6,tube:.15});
        K.shock(end.x,end.y,{r:280,pal:brass,dur:.4});K.cool(end.x,end.y,{kind:'crack2',r:290,pal:brass,life:1.6,start:.15,light:0});
        GFX.light(end.x,end.y,760,brass.l,.8,.32,{z:140});K.sparks(end.x,end.y,end.z,{pal:brass,n:low()?4:10,sp:[300,1100],up:520});
        trauma=Math.min(1,trauma+.35);X.sfx('boom',1.2,.5);
        X.inCircle(end.x,end.y,280,t=>X.dmg(t,d*.55,{kb:0,push:260,sx:end.x,sy:end.y}));
      });
    });return true;
  });
  // He leaps away on a ribbon of wind and, still in the air, shoots the ground he left.
  skill('ar_step','비연보',2,5.4,1500,'깃털을 흩날리며 입력 방향으로 도약하고, 출발점을 밟은 적을 쏜다.','출발점에 깃가시가 두 번 터진다.',(d,up)=>{
    const e=X.nearest(760);if(!e)return false;const p=fromHero(),a=X.angTo(e);
    X.face(a);pose('dash',.2);const end=point(pl.x+Math.cos(a)*470,pl.gy+Math.sin(a)*395);
    V.dash={x0:pl.x,y0:pl.gy,x1:end.x,y1:end.y,t:0,dur:.17};
    RPG.inv=Math.max(RPG.inv,.33);X.sfx('whoosh',1.4,.45);
    const leap=arcPath(p,{...end,z:BODY*.44},70);
    K.trail(Array.from({length:12},(_,i)=>leap(i/11)),{pal:wind,w:100,draw:.15,dur:.42,hold:.05,gain:.8});
    K.dust(p.x,p.y,{n:low()?3:6,dir:a+Math.PI,spread:.6,sp:[220,560],a:.38});
    for(const sign of [-1,1]){
      const plume=u=>{const q=leap(u),w=Math.sin(Math.PI*u)*sign*105;q.x-=Math.sin(a)*w;q.y+=Math.cos(a)*w*.72;return q;};
      animate(.42,null,k=>streak(plume,Math.max(0,k*1.52-.53),Math.min(1,k*2.5),wind,44,1-k*k));
    }
    const mark=point(p.x,p.y,12);
    const burst=second=>{
      if(second)pose('release',.2);
      flight(arcPath(point(pl.x,pl.gy,BODY*.7),mark),.09,wind,250,second?86:70,.2);X.sfx('whoosh',1.8,.3);
      later(.09,()=>{
        blast(mark,wind,second?350:280,{z:70,scar:second?'crack2':'scorch',scarR:second?.95:.8,shake:second?.4:.3,stop:.04});
        K.shock(p.x,p.y,{r:280,pal:wind,dur:.33});X.sfx('boom',1.5,.4);let shown=0;
        X.inCircle(p.x,p.y,263,t=>{struck(t,wind,shown++,1.2);X.dmg(t,d,{kb:0,push:240,up:second?1000:500,sx:p.x,sy:p.y});});
      });
    };
    later(.1,()=>burst(false));if(up)later(.4,()=>burst(true));return true;
  });
  // The arrow lands, five thick vines whip out of the split floor, then draw tight round the pack.
  skill('ar_snare','등나무 매듭',3,7.8,1750,'적 무리에 낙하시킨 화살에서 덩굴 시위가 자라 적을 한데 묶는다.','덩굴이 더 넓게 뻗고 오래 묶는다.',(d,up)=>{
    const e=X.densest(1080,220);if(!e)return false;nock(e);
    later(.15,()=>{release();const p=onEnemy(e),r=up?335:237,hold=up?1.65:1,life=hold+.25;
      flight(arcPath(fromHero(),{...p,z:10},210),.28,wind,260,64);
      later(.28,()=>{
        K.flare(p.x,p.y,40,{pal:wind,s:r*.55,dur:.14,gain:2});GFX.light(p.x,p.y,r*2.6,wind.l,.75,.4,{z:120});
        K.dust(p.x,p.y,{n:low()?4:9,r:40,sp:[240,640],a:.36});trauma=Math.min(1,trauma+.25);X.sfx('boom',1.35,.4);
        K.cool(p.x,p.y,{kind:'crack2',pal:wind,r:r*1.1,life:life+.5,hot:.8});
        for(let i=0;i<5;i++){
          const a=i*TAU/5+.3;
          const coil=(v,pull)=>{const ang=a+v*1.77-pull*.5,rr=r*1.18*(.08+.92*v)*(1-.26*pull);return point(p.x+Math.cos(ang)*rr,p.y+Math.sin(ang)*rr*FSY,14+(up?120:90)*Math.sin(Math.PI*v));};
          animate(life,null,(k,t)=>{
            const grown=sat(t/.16),pull=ease(sat((t-.16)/.34));
            streak(u=>coil(1-u,pull),1-grown,1,wind,up?74:60,sat((life-t)/.3),0);
          });
        }
        let shown=0;
        X.inCircle(p.x,p.y,r,t=>{struck(t,wind,shown++);X.dmg(t,d,{stun:hold,kb:-.65,sx:p.x,sy:p.y});if(!t.dead)K.mark(t,'seal',{pal:wind,dur:hold});});
      });
    });return true;
  });
  // A glass arrow skips from body to body; its zigzag stays scored on the floor and the last skip shatters.
  skill('ar_ricochet','물수제비',4,7,1420,'유리 깃 화살이 적 사이를 차례로 튕긴다.','연쇄 횟수가 세 번에서 다섯 번으로 늘어난다.',(d,up)=>{
    const first=X.nearest(970);if(!first)return false;nock(first);
    later(.14,()=>{release(night);const seen=new Set();
      function hop(p,e,n){
        seen.add(e);const end=onEnemy(e),path=u=>arcPath(p,e.dead?end:onEnemy(e),65)(u);
        flight(path,.17,night,240,up?74:66,.36);
        later(.17,()=>{const q=e.dead?end:onEnemy(e);
          let next=null,best=660**2;
          if(n>1)for(const t of V.en){const ds=(t.x-q.x)**2+(t.y-q.y)**2;if(!t.dead&&!seen.has(t)&&ds<best){best=ds;next=t;}}
          if(!FX3.low)K.coolLine(p.x,p.y,q.x,e.y,{pal:night,w:34,life:1.5,grow:.02,start:.08,light:0,shed:0});
          if(next){
            K.art(q.x,e.y,{tex:'v3_xburst',pal:night,s:210,z:q.z,dur:.22});GFX.light(q.x,e.y,420,night.l,.6,.22,{z:q.z});
            K.sparks(q.x,q.y,q.z,{pal:night,n:low()?3:7,sp:[240,800],up:420});X.sfx('whoosh',1.95,.2);
          } else {
            K.art(q.x,e.y,{tex:'v3_xburst',pal:night,s:up?430:360,z:q.z,dur:.34});K.flare(q.x,q.y,q.z,{pal:night,s:150,dur:.12,gain:2});
            GFX.light(q.x,e.y,700,night.l,.8,.32,{z:120});K.sparks(q.x,q.y,q.z,{pal:night,n:low()?5:14,sp:[300,1200],up:520});
            if(!FX3.low)K.cool(q.x,e.y,{kind:'scorch',r:210,pal:night,life:1.6,start:.15,light:0});
            trauma=Math.min(1,trauma+.3);X.sfx('boom',1.7,.4);
          }
          if(!e.dead){struck(e,night,0,next?1.2:1.5);X.dmg(e,d,{kb:0,push:next?120:260,sx:p.x,sy:p.y});}
          if(next)hop(q,next,n-1);
        });
      }hop(fromHero(),first,up?5:3);
    });return true;
  });
  // One arrow goes up; seven come down slanted, stand quivering in their own scorch, and the floor rolls outward.
  skill('ar_rain','소나기시',6,8.5,1570,'하늘로 올린 화살이 한 무리 위에 빗줄기처럼 비스듬히 떨어진다.','낙하 범위가 넓어지고 두 번째 소나기가 따라온다.',(d,up)=>{
    const e=X.densest(1250,240);if(!e)return false;nock(e);const x=e.x,y=e.y,r=up?330:240;
    later(.16,()=>{release(brass);flight(arcPath(fromHero(),point(pl.x-145,pl.gy,820)),.24,brass,260,62);});
    function volley(second){for(let i=0;i<7;i++){
      const a=i*2.4+(second?1.2:0),rr=r*Math.sqrt(i/7),q=point(x+Math.cos(a)*rr,y+Math.sin(a)*rr*FSY,7),sky=point(q.x-205,q.y,580+i*15);
      later(i*.027,()=>{
        flight(arcPath(sky,q),.22,brass,270,56,.26);
        animate(.8,k=>arrow(q,point(q.x-70,q.y,q.z+196),190,1-ease(sat((k-.6)/.4))),null,.22);
        later(.22,()=>{
          K.flare(q.x,q.y,24,{pal:brass,s:130,dur:.14,gain:2.3});
          if(i%3===0 && !low()) K.cool(q.x,q.y,{kind:'scorch',r:115,pal:brass,life:1.4,start:.25,light:0});
          K.sparks(q.x,q.y,20,{pal:brass,n:low()?2:4,sp:[200,620],up:520,life:[.18,.4]});
        });
      });
    }
    later(.32,()=>{
      K.vring(x,y,{r:r*1.25,r0:r*.3,dur:.6,pal:brass,heat:.55,tube:.13});
      K.cool(x,y,{kind:'crack',pal:brass,r:r*.85,life:1.6,hot:.7,grow:.05,light:0});
      GFX.light(x,y,r*2.6,brass.l,.85,.36,{z:140});X.sfx('boom',1.45,.42);
      trauma=Math.min(1,trauma+.32);let shown=0;
      X.inCircle(x,y,r,t=>{struck(t,brass,shown++);X.dmg(t,d,{kb:0,push:150,up:600,sx:x,sy:y});});
    });}
    later(.29,()=>volley(false));if(up)later(.72,()=>volley(true));return true;
  });
  // Two stars are pinned either side of the pack; the string between them snaps taut as one blade of starlight.
  skill('ar_bind','쌍성시',8,9.4,2450,'두 별을 화살로 박고 팽팽해진 별빛 시위로 그 사이의 적을 벤다.','두 별 사이의 거리가 늘고 시위가 한 차례 더 튕긴다.',(d,up)=>{
    const e=X.densest(1260,258);if(!e)return false;nock(e);const p=onEnemy(e),r=up?530:380;
    const a=X.angTo(e)+Math.PI*.51,ends=[-1,1].map(s=>point(p.x+s*Math.cos(a)*r,p.y+s*Math.sin(a)*r*.8,65));
    const span=arcPath(...ends);
    later(.16,()=>{release(night);ends.forEach(q=>{
      flight(arcPath(fromHero(),q,110),.23,night,250,58);
      K.vorb(q.x,q.y,q.z+30,{pal:night,r:78,dur:up?.68:.42,in:.06,out:.14,delay:.23});
    });});
    const snap=second=>{
      ends.forEach(q=>{K.flare(q.x,q.y,q.z+30,{pal:night,s:200,dur:.14,gain:1.8});K.sparks(q.x,q.y,q.z,{pal:night,n:low()?3:7,sp:[240,800],up:420});});
      GFX.light(p.x,p.y,r*1.4,night.l,.45,.34,{z:120});
      if(!second && !FX3.low) K.coolLine(ends[0].x,ends[0].y,ends[1].x,ends[1].y,{pal:night,w:44,life:1.8,grow:.04,start:.12,light:0});
      animate(.44,null,(k,t)=>{
        const amp=Math.sin(t*60)*75*(1-k)**3;
        for(const half of [0,1]){
          const path=u=>{const v=half?1-u*.5:u*.5,q=span(v);q.z+=30+Math.sin(v*Math.PI)*amp;return q;};
          streak(path,0,1,night,second?120:96,(1-k)**.7,0);
        }
      });
      X.sfx('whoosh',2.1,.4);trauma=Math.min(1,trauma+.3);
      if(!A.SV.opt?.calm)hitstop=Math.max(hitstop,.04);
      let shown=0;
      X.inLine(ends[0].x,ends[0].y,ends[1].x,ends[1].y,95,t=>{struck(t,night,shown++,1.4);X.dmg(t,d,{stun:.35,kb:.4});});
    };
    later(.42,()=>snap(false));if(up)later(.7,()=>snap(true));return true;
  });
  // The heaviest arrow: a high golden arc, then the floor caves, stones jump and the pack goes up with them.
  skill('ar_pin','황금 못',10,11.7,3180,'무거운 황금 화살이 적을 꿰뚫고 바닥에 박혀 주변을 들어 올린다.','충격 지점이 갈라지며 2차 피해를 준다.',(d,up)=>{
    const e=X.densest(1350,245);if(!e)return false;nock(e,.29);
    later(.29,()=>{release(brass);X.sfx('whoosh',.8,.5);const q=point(e.x,e.y,0);const p=fromHero();
      flight(arcPath(p,q,330),.4,brass,440,124,.3);
      later(.4,()=>{
        blast(q,brass,320,{z:80,scar:'crater',scarR:.7,life:2,shake:.5,stop:.06,light:.68,smoke:.45});
        K.cool(q.x,q.y,{kind:'crack2',pal:brass,r:338,life:1.65,light:0});
        K.shock(q.x,q.y,{r:420,pal:brass,dur:.45,gain:.8});
        K.chunks(q.x,q.y,{n:low()?3:6,r:70,sp:[170,520],up:1300,s:[34,80],pal:brass});X.sfx('boom',.9,.46);
        const prev=arcPath(p,q,330)(.94);
        animate(.96,(k,t)=>{const from={...prev,x:prev.x+Math.sin(t*40)*19*Math.exp(-t*8)};arrow(q,from,420,1-ease(sat((k-.67)/.33)));});
        let shown=0;
        X.inCircle(q.x,q.y,295,t=>{struck(t,brass,shown++,1.5);X.dmg(t,d,{kb:0,push:200,up:1500,sx:q.x,sy:q.y});});
        if(up)later(.32,()=>{
          K.cool(q.x,q.y,{kind:'crack',pal:brass,r:520,life:1.9,hot:.75,grow:.06,gain:2,light:0});
          K.shock(q.x,q.y,{r:390,pal:brass});GFX.light(q.x,q.y,900,brass.l,.7,.3,{z:140});
          X.sfx('boom',1.2,.4);trauma=Math.min(1,trauma+.3);
          X.inCircle(q.x,q.y,365,t=>X.dmg(t,d*.58,{kb:0,push:300,sx:q.x,sy:q.y}));
        });
      });
    });return true;
  });
  function startUlt(id,p,focus) {
    // Interrupt ordinary shots and their pending releases before nocking the
    // signature's single arrow. The engine also clears the shared GPU effects.
    castEpoch++;X.ultStart(id);preload();
    const x=pl.x,y=pl.gy;
    if(focus) X.face(X.angTo(focus));
    pose('draw',1.15);
    GFX.ambient(.56,.65,.72,4);
    C.move({x,y:y-BODY*.58,zoom:1.09,tilt:.047,roll:0},.65);
    K.flare(x,y,BODY*.63,{pal:p,s:145,sx:2.6,sy:.27,dur:.38,gain:1.12});
    return {x,y,hw:X.view().hw,hh:X.view().hh};
  }
  function peak(x,y,p) {
    C.peak(x,y,{ca:.011,blur:.046,tint:p.l,a:.10,hold:.03,out:.23});
    C.shake(.69);hitstop=Math.max(hitstop,.074);C.SND.hit(.69);
    GFX.light(x,y,1150,p.l,1,.45,{z:140});
  }
  function endUlt(t) {
    later(t-.87,()=>{C.back(.82);GFX.ambient(1,1,1,3);});
    later(t,X.ultStop);
  }
  function pressurePlate(g,im,x,y,a,size,alpha) {
    if(!imageReady(im)||alpha<=0)return;
    g.save();g.translate(x,y);g.rotate(a);g.globalAlpha=alpha;
    g.drawImage(im,-size*.8,-size*.2875,size,size*.575);
    g.restore();
  }
  function airWake(path,k,stage) {
    const width=stage.hw*.035, count=low()?28:46, tail=Math.max(0,k-.27),head=Math.max(tail,k-.006), samples=[];
    if(head<=tail)return;
    for(let i=0;i<=count;i++){
      const f=i/count,u=mix(tail,head,f),q=path(u);
      samples.push({x:q.x,y:q.y-q.z,u,f});
    }
    const left=[],right=[],north=[],south=[],seam=[];
    for(let i=0;i<=count;i++){
      const p=samples[i],a=samples[Math.max(0,i-1)],b=samples[Math.min(count,i+1)];
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1, nx=-dy/d,ny=dx/d;
      const s=p.f,age=k-p.u;
      const bend=Math.sin(s*Math.PI)**.67,taper=Math.sin(s*Math.PI*.88)**.68;
      const twist=age*88+p.u*18,mag=width*(.4+.6*bend)*taper;
      const l=mag*(.17+.72*(.5+.5*Math.sin(twist))),r=mag*(.18+.68*(.5+.5*Math.sin(twist+.81)));
      left.push([p.x+nx*l,p.y+ny*l]);right.push([p.x-nx*r,p.y-ny*r]);
      north.push([p.x+nx*mag*Math.sin(twist),p.y+ny*mag*Math.sin(twist)]);
      south.push([p.x+nx*mag*Math.sin(twist+Math.PI),p.y+ny*mag*Math.sin(twist+Math.PI)]);
      seam.push([p.x+nx*l*.41,p.y+ny*l*.41]);
    }
    ctx.save();ctx.lineJoin='round';
    const gradient=ctx.createLinearGradient(samples[0].x,samples[0].y,samples[count].x+.01,samples[count].y);
    gradient.addColorStop(0,'rgba(43,100,111,.04)');gradient.addColorStop(.39,'rgba(45,123,123,.30)');gradient.addColorStop(.84,'rgba(129,212,182,.58)');gradient.addColorStop(1,'rgba(225,245,208,.74)');
    poly(ctx,[...left,...right.reverse()],gradient);
    ctx.restore();fx.save();fx.globalAlpha=.72;fx.lineJoin='round';
    line(fx,north,'#73bbb2',width*.048);line(fx,south,'#d2c28e',width*.039);line(fx,seam,'#bfe5c5',width*.045);fx.restore();
  }
  function resonance(q,tangent,strength=1) {
    // The front is a hollow Mach cone perpendicular to the arrow's *projected*
    // velocity. The tip leaves first, then the expanding pressure front peels back.
    const a=Math.atan2(tangent.y,tangent.x),life=.60+.12*strength;
    const rr=Math.min(X.view().hw*.14,385)*strength;
    const im=plate('ar_mach_front');
    animate(life,k=>{
      const grow=1-(1-k)**2,r=rr*(.18+grow*.98),d=-58*grow*strength;
      pressurePlate(ctx,im,q.x+Math.cos(a)*d,q.y-q.z+Math.sin(a)*d,a,r*4.2,(1-k)**.93*.79);
      fx.save();fx.translate(q.x,q.y-q.z);fx.rotate(a);fx.translate(d,0);
      fx.globalAlpha=(1-k)**1.4;
      for(let rim=0;rim<3;rim++){
        const z=rim*-.18*r,sz=r*(1-rim*.16);
        const left=-r*.63+z, grad=fx.createLinearGradient(left,0,z+r*.40,0);
        grad.addColorStop(0,'rgba(37,106,111,0)');grad.addColorStop(.48,'rgba(78,201,179,.16)');grad.addColorStop(.84,'rgba(218,255,236,.74)');grad.addColorStop(1,'rgba(121,208,198,0)');
        fx.fillStyle=grad;fx.beginPath();fx.moveTo(r*.76,0);
        fx.bezierCurveTo(z+r*.34,-sz*.29,z-r*.06,-sz,z-r*.34,-sz);
        fx.bezierCurveTo(z+r*.06,-sz*.35,z+r*.06,sz*.48,z-r*.34,sz);
        fx.bezierCurveTo(z-r*.10,sz,z+r*.41,sz*.27,r*.76,0);fx.fill();
        fx.beginPath();fx.ellipse(z-r*.32,0,r*.21,sz,-.04,-1.93,1.59);
        fx.strokeStyle=rim?'#82cbba':'#defff0';fx.lineWidth=Math.max(2,r*.016);fx.stroke();
      }
      fx.restore();
    });
    GFX.ripple(q.x,q.y,rr*2.5,{s:.24,w:.09,life:.46,z:q.z*.25});
    K.dust(q.x,q.y,{n:low()?3:7,dir:a+Math.PI,spread:1.1,sp:[310,820],c:'#55857a',a:.36});
    GFX.light(q.x,q.y,rr*2.3,wind.l,.47,.26,{z:q.z});
  }
  // Each turn is a point on the screen perimeter. Alternate the diagonals,
  // horizontal chords and steep chords so the history fills the entire field.
  const boundaries=[
    [-.96,.59],[.96,-.58],[-.85,-.91],[.79,.92],[-.96,.10],[.46,-.92],
    [-.51,.92],[.96,-.25],[-.96,-.51],[.65,.92],[-.39,-.92],[.96,.43],
    [-.96,.79],[.23,-.92],[-.11,.92],[.88,-.91],[-.96,.30],[.96,.16],
    [-.72,-.92],[.39,.92],[-.96,-.72],[.96,-.03],[-.38,.92],[.64,-.92]
  ];
  function sonicScore(stage) {
    const {x,y,hw,hh}=stage,home=fromHero();
    const ends=boundaries.map(([u,v],i)=>{
      const z=BODY*(.68+.18*Math.sin(i*1.32));
      return point(x+hw*u,y-BODY*.52+hh*v+z,z);
    });
    const starts=[home,...ends],destinations=[...ends,home];
    let elapsed=.62;
    return starts.map((a,i)=>{
      const b=destinations[i],dx=b.x-a.x,dy=b.y-b.z-a.y+a.z,length=Math.hypot(dx,dy)||1;
      const duration=i===0?.16:i===1?.49:i===2?.44:i===24?.10:.34*.905**(i-3);
      const start=elapsed;elapsed+=duration;
      const dir=point(dx/length,dy/length), bend=Math.min(hw,hh)*(.018+.012*Math.sin(i*2.1))*(i%2?1:-1);
      function at(u){
        const arc=Math.sin(Math.PI*u)*bend;
        return point(mix(a.x,b.x,u)-dir.y*arc,mix(a.y,b.y,u)+dir.x*arc,mix(a.z,b.z,u));
      }
      const sample=t=>{const p=at(t);return [p.x,p.y-p.z];};
      const points=Array.from({length:13},(_,j)=>sample(j/12));
      return {i,start,end:elapsed,duration,a,b,at,points,dir,angle:Math.atan2(dir.y,dir.x)};
    });
  }
  function strokeEtching(score,now,ink,fade) {
    fx.save();fx.lineJoin='round';fx.lineCap='round';
    const bright=!A.SV.opt?.calm&&ink;
    for(const s of score){
      if(s.start>now) break;
      const u=sat((now-s.start)/s.duration),age=Math.max(0,now-s.end);
      const lit=bright?1:.52+.37*Math.exp(-age*1.06);
      let pts=s.points;
      if(u<1){
        const last=s.at(u);pts=pts.slice(0,1+Math.floor(u*12));pts.push([last.x,last.y-last.z]);
      }
      fx.globalAlpha=lit*fade*(bright?.85:.54);
      line(fx,pts,bright?'#a5b5ae':s.i%4?'#549988':'#ad9a66',bright?13:16);
      fx.globalAlpha=lit*fade;
      line(fx,pts,bright?'#ffffff':s.i%4?'#d6f1da':'#ffe6aa',bright?7:4.8);
      if(u===1 && s.i>0 && s.i<24){
        const [xx,yy]=pts[pts.length-1];fx.globalAlpha=fade*(.36+.58*Math.exp(-age*2.8));
        star(fx,xx,yy,17+(bright?13:0),bright?'#ffffff':brass.h,s.angle);
      }
    }
    fx.restore();
  }
  function acceleratedWhoosh(index,duration,pan) {
    if(index===1||index===2||index===6||index===12||index===18){
      const length=Math.max(.09,Math.min(.47,.06+duration*.76));
      if(window.RangedHero?.cue?.('sonic',{pan,length,gain:index<=2?.81:.60,rate:1.04+index*.024}))return;
    }
    // A narrow passing jet for every chord. Its envelope shrinks with travel time,
    // preserving the rhythm of the last ~45 ms crossings without stacking long tails.
    if(!AC)return;
    const t=AC.currentTime,life=Math.min(.26,duration*.87),n=noiseSrc(t,life),filter=filt('bandpass',800,1.2),g=AC.createGain();
    filter.frequency.setValueAtTime(580+index*28,t);filter.frequency.exponentialRampToValueAtTime(3400+index*66,t+life*.24);
    filter.frequency.exponentialRampToValueAtTime(680,t+life);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.29,t+Math.min(.012,life*.17));
    g.gain.exponentialRampToValueAtTime(.0001,t+life);
    n.connect(filter);filter.connect(g);const stereo=AC.createStereoPanner?.();
    if(stereo){stereo.pan.setValueAtTime(-pan,t);stereo.pan.linearRampToValueAtTime(pan,t+life);g.connect(stereo);stereo.connect(master);}
    else g.connect(master);
    n.onended=()=>{n.disconnect();filter.disconnect();g.disconnect();stereo?.disconnect();};
  }
  function executeSonic(e,q,stage) {
    if(e.dead || e.d.node)return;
    if(Math.abs(e.x-stage.x)<stage.hw && Math.abs(e.y-stage.y)<stage.hh) hitAt(e,wind,1.13);
    // Preserve normal drops, kill accounting and boss rewards, including at the
    // engine's minimum 92% random damage roll.
    X.dmg(e,Math.ceil((e.hp+1)/.92),{crit:true,kb:.35,sx:q.x,sy:q.y});
  }
  function sonicTargets(id,score,stage) {
    for(const e of V.en){
      if(e.dead||e.d.node) continue;
      const ey=e.y-e.h*.48-(e.z||0);
      let best=null,dist=Infinity,contact=0;
      for(let i=1;i<score.length-1;i++){
        const s=score[i],px=s.a.x,py=s.a.y-s.a.z,dx=s.b.x-px,dy=s.b.y-s.b.z-py;
        const u=sat(((e.x-px)*dx+(ey-py)*dy)/(dx*dx+dy*dy||1));
        const q=s.at(u),ds=(q.x-e.x)**2+(q.y-q.z-ey)**2;
        if(ds<dist){dist=ds;best=s;contact=u;}
      }
      later(best.start+best.duration*contact,()=>{
        if(e.dead || RPG.mode!=='surv' || V.over || !lock || V.ultId!==id)return;
        executeSonic(e,best.at(contact),stage);
      });
    }
  }
  function sonic(id) {
    const stage=startUlt(id,wind,X.nearest(Infinity)),{x,y,hw,hh}=stage;
    C.move({x,y:y-BODY*.52,zoom:1,tilt:.022,roll:0},.48);
    const score=sonicScore(stage),inkAt=score[24].end,blastAt=inkAt+.105,stop=blastAt+1.62;
    const draw=K.gather(x,y,BODY*.65,{pal:wind,r:139,R:590,dur:.62,n:.41,shells:1,gain:.67});
    C.SND.inhale(.54,.24);
    const bow=fromHero(),back=point(bow.x-score[0].dir.x*100,bow.y-score[0].dir.y*100,bow.z);
    animate(.62,k=>arrow(bow,back,hw*(.12+.13*k),ease(sat(k*4))));
    later(.62,()=>{draw.release({s:.49,ring:0});release();});
    // A single draw callback owns the only arrowhead. Even if the renderer skips
    // several turns, completed chords remain in the etching at their true length.
    animate(stop,(k,t)=>{
      if(t<.62)return;
      const fade=1-ease(sat((t-blastAt-.32)/1.16));
      if(fade>0)strokeEtching(score,t,t>=inkAt&&t<blastAt,fade);
      if(t>inkAt)return;
      const s=score.find(leg=>t<leg.end)||score[24],u=sat((t-s.start)/s.duration);
      const head=s.at(u),prev=s.at(Math.max(0,u-.006)),size=Math.max(BODY*2.4,hw*(s.i>15?.245:.28));
      airWake(s.at,u,stage);
      pressurePlate(ctx,plate('ar_mach_front'),head.x-s.dir.x*size*.2,head.y-head.z-s.dir.y*size*.2,s.angle,size*1.64,.83);
      arrow(head,prev,size);
      fx.save();star(fx,head.x,head.y-head.z,hw*.008,brass.h,s.angle);fx.restore();
      for(let j=Math.max(0,s.i-5);j<s.i;j++){
        const leg=score[j],age=t-leg.end;
        if(age>.42)continue;
        const f=sat(age/.42),sz=Math.min(hw,hh)*(.40+.65*f);
        pressurePlate(ctx,plate('ar_mach_front'),leg.b.x,leg.b.y-leg.b.z,leg.angle,sz,(1-f)**1.5*.61);
      }
    },(k,t)=>{
      if(t<.62 || t>inkAt)return;
      const s=score.find(leg=>t<leg.end)||score[24],u=sat((t-s.start)/s.duration);
      ribbon(s.at,Math.max(0,u-.27),Math.max(0,u-.011),wind,hw*.037,.84,true);
    });
    sonicTargets(id,score,stage);
    for(const s of score.slice(1,-1)){
      later(s.start,()=>{
        acceleratedWhoosh(s.i,s.duration,s.dir.x*.77);
        const big=s.i<=2 || s.i===6 || s.i===12 || s.i===18;
        if(big){resonance(s.a,s.dir,s.i<3?1.20:.93);C.shake(.14); }
        else{GFX.light(s.a.x,s.a.y,300,wind.l,.43,.15,{z:s.a.z});if(s.i<15||s.i%2===0)resonance(s.a,s.dir,.62);}
      });
    }
    later(inkAt-.14,()=>C.hush(.24,{a:.54,c:wind.l,snd:false}));
    later(inkAt,()=>{window.RangedHero?.impact?.('ink',.105);C.SND.tick(.58,.19);});
    later(blastAt,()=>{
      if(V.over || !lock || V.ultId!==id)return;
      // A mission may add enemies after the route was scored. The outgoing
      // final shock catches the exact live population at detonation.
      const present=V.en.filter(e=>!e.dead&&!e.d.node);
      for(const e of present)executeSonic(e,stage,stage);
      window.RangedHero?.impact?.('flash',.085);peak(x,y,brass);
      const radius=Math.hypot(hw,hh/FSY)*1.16;
      K.shock(x,y,{r:radius,pal:brass,dur:.70,gain:1.16});
      K.shock(x,y,{r:radius*.83,pal:wind,dur:.76,gain:.88,delay:.11});
      K.cool(x,y,{r:hw*.43,pal:wind,kind:'crack2',life:2.2,hot:.42});
      impactAt(point(x,y,BODY*.58),brass,hw*.23);
      K.vblast(x,y,{pal:brass,s:Math.min(hw,hh)*.39,smoke:.43,rise:310,heat:1.3,dur:.84,fire:.27,lump:.65});
      animate(.88,(k,t)=>{
        const gain=(1-k)**1.24,reach=hw*(.043+.21*(1-Math.exp(-t*18)));
        fx.save();fx.translate(x,y-BODY*.38);fx.globalAlpha=gain*(low()?.46:.87);
        const fire=fx.createRadialGradient(0,0,0,0,0,reach);
        fire.addColorStop(0,'rgba(255,248,207,.92)');fire.addColorStop(.13,'rgba(255,222,138,.81)');
        fire.addColorStop(.49,'rgba(242,153,67,.27)');fire.addColorStop(1,'rgba(225,132,61,0)');
        fx.fillStyle=fire;fx.fillRect(-reach,-reach,reach*2,reach*2);
        for(let i=0;i<15;i++){
          const a=i*2.399+.13,rr=reach*(.69+.65*((i*7)%11)/10),h=rr*(.013+.024*(i%3));
          fx.save();fx.rotate(a);poly(fx,[[reach*.048,0],[rr*.36,-h],[rr,0],[rr*.25,h*.49]],i%3?'#ffdd92':'#fff5ca');fx.restore();
        }
        fx.restore();
      });
      for(let i=0;i<8;i++){
        const a=i*TAU/8+.15,r=hw*(.21+.13*(i%3));
        const q=point(x+Math.cos(a)*r,y+Math.sin(a)*Math.min(r*FSY,hh*.80),27);
        later(i*.012,()=>{K.coolLine(x,y,q.x,q.y,{pal:brass,w:84,life:1.69,light:0});K.dust(q.x,q.y,{n:4,sp:[270,700],a:.36});});
      }
    });
    endUlt(stop);
  }
  // An original sidereal stag chart. Coordinates are in the chart plane;
  // its forelegs, back, jaw, antlers and facets light successively.
  const stag=[
    [-.92,.01],[-.77,-.15],[-.43,-.18],[-.18,-.13],[.02,-.20],[.19,-.38],[.36,-.61],[.55,-.59],[.74,-.51],
    [.60,-.41],[.43,-.41],[.34,-.22],[.22,.03],[.03,.16],[-.29,.12],[-.57,.06],[-.78,.10],
    [-.74,.32],[-.85,.55],[-.81,.58],[-.62,.37],[-.49,.11],[-.42,.36],[-.30,.52],[-.23,.54],
    [.07,.34],[.28,.54],[.34,.53],[.18,.23],[.28,.06],[.46,.17],[.63,.05],[.71,.05],
    [.40,-.78],[.30,-.96],[.13,-1.10],[.04,-1.24],[.28,-1.16],[.29,-1.30],[.51,-.93],[.53,-1.11],[.47,-1.23],
    [.67,-1.20],[.74,-1.34],[.64,-.77],[.73,-.89],[.82,-.98],[.84,-1.13],[.98,-1.04],
  ];
  const limbs=[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,0],[16,17,18,19,20,21],[15,22,23,24],[13,25,26,27,28,29],[12,30,31,32],[6,33,34,35,36],[34,37,38],[33,39,40,41],[40,42,43],[7,44,45,46,47],[46,48]];
  const facets=[[1,2,15],[2,3,14],[3,4,13],[4,11,13],[4,5,11],[5,6,10],[6,7,9],[2,14,15],[1,15,16],[11,12,13]];
  function starStag(stage) {
    const {x,y,hw,hh}=stage,R=Math.min(hw*.58,hh*.91),life=3.82;
    const atlas=plate('archer_sidereal_stag');
    // Two slowly rolling curtains of aurora drift behind the constellation.
    // The first bright thread travels towards the antlers as the figure rises.
    animate(3.48,null,(k,t)=>{
      const strength=sat(t/.67)*sat((3.48-t)/.68);
      for(const s of [-1,1]){
        const mist=u=>point(x+(u-.82)*R*2.25,
          y-R*.10+s*R*.15*Math.sin(u*7+t*.5),
          BODY*.41+R*(.06+.22*Math.sin(u*4.7+t*.49+s*.3)+.11*u));
        ribbon(mist,0,1,s<0?night:wind,R*.08,strength*.15,true);
      }
    });
    animate(life,(k,t)=>{
      const form=ease(sat((t-.06)/1.29)), leap=ease(sat((t-1.48)/1.28)),shatter=ease(sat((t-2.81)/.76));
      const fade=sat(t/.35)*(1-shatter);
      if(fade<=0)return;
      const loc=stag.map(([px,py],i)=>{
        const f=sat((t-.08-(i>=33?.34:0))/.94);
        const dx=(1-f)**2*Math.sin(i*2.4)*R*.53,dy=(1-f)**2*Math.cos(i*1.7)*R*.38;
        const leg=(i>=17&&i<=32)?Math.sin(t*4+i*.19)*R*.033:0;
        return [x+px*R+R*(leap-.5)*.38+dx+leg+shatter*(px+.36)*R*.63,
          y-BODY*.43+py*R*.85-R*(.04+leap*.13)+dy+shatter*(py+.25)*R*.33];
      });
      const modeled=imageReady(atlas);
      ctx.save();ctx.globalAlpha=fade*form;
      if(modeled){
        const cw=atlas.naturalWidth/4,ch=atlas.naturalHeight/4;
        const frame=Math.floor(Math.min(t,1.47)*7+Math.max(0,t-1.47)*12.4)%16,sw=R*2.05,sh=sw*ch/cw;
        const sx=x+(leap-.5)*R*.43,sy=y-BODY*.52-R*(.28+leap*.17);
        ctx.translate(sx,sy);ctx.rotate(-leap*.075);
        ctx.drawImage(atlas,(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch,-sw*.5,-sh*.5,sw,sh);
      } else facets.forEach((f,i)=>{poly(ctx,f.map(j=>loc[j]),['#243c56','#284c61','#395d6a','#376978'][i%4]);});
      ctx.restore();fx.save();fx.globalAlpha=fade*(modeled?.10+.56*(1-form)+.30*shatter:1);fx.lineJoin='round';fx.lineCap='round';
      limbs.forEach((l,i)=>{
        const f=sat((t-.11-i*.042)/.85)*(l.length-1);if(f<=0)return;
        const pts=l.slice(0,1+Math.floor(f)).map(j=>loc[j]);
        if(Math.ceil(f)<l.length){const p=loc[l[Math.floor(f)]],q=loc[l[Math.ceil(f)]];pts.push([mix(p[0],q[0],f%1),mix(p[1],q[1],f%1)]);}
        line(fx,pts,i>=5?'#ccab71':'#739db3',i>=5?7:5);
        line(fx,pts,i>=5?'#fff1c3':'#ddf7ff',i>=5?2.8:2.1);
      });
      for(let i=0;i<loc.length;i++){
        const [xx,yy]=loc[i],r=(i===7?23:i%5===0?13:6)*(1+.13*Math.sin(t*4+i));
        star(fx,xx,yy,r,i>=33?brass.h:night.h,.18);
      }
      if(modeled){
        // Stellar needles hang briefly in the wake of the leap and descend with the volley.
        fx.globalAlpha=fade*.76;
        for(let i=0;i<14;i++){
          const u=((i*.618+t*.28)%1),sx=x-R*(u+.15)+R*(leap-.5)*.38,sy=y-BODY*.72+R*(.04*Math.sin(i*9+t)+u*u*.17);
          line(fx,[[sx,sy],[sx-R*(.04+.05*u),sy+3]],i%3?night.m:brass.m,1.7);
          if(i%3===0)star(fx,sx,sy,8*(1-u),brass.h);
        }
      }
      fx.restore();
    });
  }
  function requiem(id) {
    const stage=startUlt(id,night,X.nearest(Infinity)),{x,y,hw,hh}=stage;
    C.SND.gong(.32);starStag(stage);
    C.move({x,y:y-BODY*.62,zoom:.84,tilt:.07,roll:.009},1.32);
    const stars=[];
    for(let i=0;i<25;i++){
      const a=i*2.39996,r=Math.sqrt((i+.65)/25);
      stars.push(point(x+hw*.96*r*Math.cos(a),y+hh*.9*r*Math.sin(a),240+110*(1+Math.sin(i*2.2))));
    }
    animate(3.64,(k,t)=>{fx.save();fx.globalAlpha=Math.min(sat(t/.64),sat((3.64-t)/.55))*.7;
      for(let i=0;i<stars.length;i++){const q=stars[i];star(fx,q.x,q.y-q.z,4+8*(.5+.5*Math.sin(i*2.1+t*2)),i%4?night.m:brass.m,.23);}
      fx.restore();
    });
    later(1.12,()=>{pose('draw',1.1);C.SND.shing(.72,.41);});
    later(2.04,()=>{C.SND.inhale(.68,.24);pose('release',.35);});
    const victims=X.onScreen(450).map(e=>({e,p:onEnemy(e)}));
    // Each enemy receives the arrow aimed at it. Additional shafts fill empty
    // regions of the screen while a finite render budget covers dense packs.
    const shafts=Math.min(low()?10:18,victims.length);
    const marks=victims.slice(0,shafts).map(t=>t.p);
    for(let i=marks.length;i<(low()?11:18);i++) marks.push(point(stars[i].x,stars[i].y,9));
    const peakAt=3.22;later(peakAt-.18,()=>C.hush(.17,{a:.57,c:night.l}));
    marks.forEach((q,i)=>{const phase=i/marks.length*.36,hit=peakAt+phase;
      const a=point(q.x-278-(i%3)*115,q.y-90,q.z+760+(i%4)*90);
      later(hit-.38,()=>flight(arcPath(a,q,70),.38,i%3?night:brass,300,84));
      later(hit,()=>{K.flare(q.x,q.y,30,{pal:i%3?night:brass,s:150,dur:.14,gain:2});if(i%3===0){impactAt(q,brass,165);K.cool(q.x,q.y,{pal:night,kind:'crack2',r:210,life:2.15,light:0});}});
    });
    victims.forEach(({e},i)=>later(peakAt+(i%Math.max(1,marks.length))/marks.length*.36,()=>{if(!e.dead){struck(e,night,i>>1,1.3);X.ultHit(e,7200*A.mul(id),x,y);}}));
    // The stag kicks off: the floor under it answers before the stars fall.
    later(1.48,()=>{K.shock(x,y,{pal:night,r:hw*.42,dur:.6,gain:.55});K.dust(x,y,{n:low()?4:10,r:80,sp:[260,700],a:.36});GFX.light(x,y,hw*.8,night.l,.6,.5,{z:200});X.sfx('whoosh',.7,.5);});
    later(peakAt,()=>{peak(x,y,night);K.shock(x,y,{pal:night,r:hw*.98,dur:.79,gain:.7});X.sfx('boom',.85,.6);
      K.cool(x,y,{kind:'ring',pal:night,r:hw*.5,life:2.4,light:0});
    });
    endUlt(5.13);
  }
  function greatbow(stage,shoot) {
    const {x,y,hw,hh}=stage,im=plate('ar_eclipse_bow'),span=Math.min(hw*1.37,hh*2.10),life=shoot+.95;
    animate(life,(k,t)=>{
      const form=ease(sat(t/.8)),draw=ease(sat((t-.6)/(shoot-.8))),end=sat((t-shoot-.2)/.75);
      const recoil=t>shoot?Math.sin((t-shoot)*24)*Math.exp(-(t-shoot)*8):0;
      const size=span*(.57+.43*form),h=size*400/960,z=BODY*.60+hh*.056;
      const fade=form*(1-end*end); if(!fade)return;
      const top=-.628*h,side=.455*size, angle=(1-form)*.69+draw*.07+recoil*.105;
      // The bow is held belly to the sky: grip on top, tips hanging at the archer's sides, string drawn downward.
      const grip=-.6*h,rest=grip-top,tie=t<shoot?mix(rest,h*.45,draw):rest+recoil*h*.26;
      const floorY=y-z;
      fx.save();fx.translate(x,floorY);fx.globalAlpha=fade;
      for(const s of [-1,1]){
        const ang=s*angle,c=Math.cos(ang),sn=Math.sin(ang),tx=s*side*c-top*sn,ty=grip-(s*side*sn+top*c);
        line(fx,[[tx,ty],[0,tie]],'#487e81',8);
        line(fx,[[tx,ty],[0,tie]],'#e6f6ca',2.4);
        for(let j=1;j<7;j++){const f=(j/7+t*.6)%1;star(fx,tx*f,mix(tie,ty,f),4+5*Math.sin(Math.PI*f),'#e8f7d1');}
      }
      fx.restore();
      ctx.save();ctx.translate(x,floorY+grip);ctx.scale(1,-1);ctx.globalAlpha=fade;
      for(const sign of [-1,1]){
        ctx.save();ctx.rotate(sign*angle);
        if(imageReady(im)) {
          const w=im.naturalWidth/2, start=sign<0?0:w;
          ctx.drawImage(im,start,0,w,im.naturalHeight,sign<0?-size*.5:0,-h*.77,size*.5,h);
        } else {
          ctx.strokeStyle='#e9c077';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(0,0);
          ctx.quadraticCurveTo(sign*size*.32,h*.18,sign*side,top);ctx.stroke();
        }ctx.restore();
      }ctx.restore();
      // The one great arrow rides the string, head to the sky, until the release hands it to its flight.
      if(t<shoot) arrow(point(x,y,z-tie+h*1.38),point(x,y,z-tie),h*1.45,fade*draw);
    });
  }
  function corona(stage) {
    const {x,y,hw,hh}=stage,R=Math.hypot(hw,hh/FSY)*1.13;
    animate(1.74,(k,t)=>{
      const f=1-(1-sat(t/.89))**2, fade=sat(t/.085)*(1-sat((t-.66)/1.06));
      fx.save();fx.translate(x,y);fx.scale(1,FSY);fx.globalAlpha=fade;
      for(let i=0;i<22;i++){
        const a=i*TAU/22+.24+.066*Math.sin(i*9),c=Math.cos(a),s=Math.sin(a);
        const r=R*f*(.91+.09*Math.sin(1.32*i)),length=R*(.11+.17*((i*7)%11)/10)*f;
        fx.save();fx.rotate(a);
        const g=fx.createLinearGradient(r-length,0,r,0);
        g.addColorStop(0,'rgba(96,109,102,0)');g.addColorStop(.68,'rgba(194,148,76,.39)');g.addColorStop(1,'rgba(255,234,159,.9)');
        poly(fx,[[r-length,0],[r-length*.2,-length*.055],[r,0],[r-length*.5,length*.04]],g);
        fx.restore();
        if(i%3===0) star(fx,c*r,s*r,15,'#fff2ce',a);
      }
      fx.restore();
    });
    K.shock(x,y,{r:R,pal:brass,dur:.94,gain:.97});
    K.shock(x,y,{r:R*.67,pal:wind,dur:.77,gain:.48,delay:.12});
    for(let i=0;i<7;i++){
      const a=i*2.39996+.39, r=R*(.28+.34*(i%3)/2);
      const q=point(x+Math.cos(a)*r,y+Math.sin(a)*r*FSY);
      later(.14+.32*r/R,()=>{K.coolLine(mix(x,q.x,.14),mix(y,q.y,.14),q.x,q.y,{pal:brass,w:63,life:2.06,gain:.65,light:0});});
    }
  }
  function eclipse(id) {
    const stage=startUlt(id,brass,X.nearest(Infinity)),{x,y,hw,hh}=stage;
    const shoot=2.3,fall=4.1,drop=.26,land=fall+drop;
    const h=Math.min(hw*1.37,hh*2.10)*400/960,len=h*1.45,sky=hh*3.2,nockZ=BODY*.60+hh*.056+h*.93;
    // The arrow returns ahead of the archer, slanting in from behind the shoulder.
    const tx=x+pl.f*Math.min(hw*.3,hh*.62),ty=y+hh*.06,target=point(tx,ty,0);
    const descent=arcPath(point(tx-pl.f*hh*.5,ty,sky),target);
    greatbow(stage,shoot);C.SND.gong(.45);
    C.move({x,y:y-BODY*.65,zoom:.82,tilt:.07,roll:0},1);
    let charge;
    later(.6,()=>{pose('draw',shoot-.6);C.SND.inhale(shoot-.75,.34);charge=K.gather(x,y,BODY*.94,{pal:brass,r:108,R:730,n:.32,dur:shoot-.75,shells:1,gain:.48});});
    later(shoot-.2,()=>{charge?.end();C.hush(.18,{a:.52,c:brass.l});});
    later(shoot,()=>{
      release(brass);C.SND.shing(.65,.44);X.sfx('whoosh',.6,.6);
      flight(arcPath(point(x,y,nockZ),point(x,y,sky)),.34,brass,len,150,.3);
      K.shock(x,y,{r:520,pal:brass,dur:.45,gain:.7});K.dust(x,y,{n:low()?5:10,sp:[300,820],a:.4});
      GFX.light(x,y,900,brass.l,.9,.3,{z:BODY});trauma=Math.min(1,trauma+.4);
      C.move({x:mix(x,tx,.5),y:y-BODY*.5,zoom:.74,tilt:.1,roll:0},.8);
    });
    // The arrow is gone. The field dims and waits.
    later(shoot+.4,()=>GFX.ambient(.4,.46,.58,2.2));
    later(fall-.62,()=>{
      C.SND.inhale(.6,.3);GFX.light(tx,ty,760,brass.l,.75,.7,{z:120});
      K.shock(tx,ty,{r:110,r0:720,dur:.6,pal:brass,gain:.55});
      animate(.62,k=>{
        const r=mix(520,150,k);
        ctx.save();ctx.globalAlpha=.5*k;ctx.fillStyle='#04080c';
        ctx.beginPath();ctx.ellipse(tx,ty,r,r*FSY,0,0,TAU);ctx.fill();ctx.restore();
      },k=>streak(descent,0,1,brass,18+50*k,.2+.5*k,0));
    });
    later(fall-.16,()=>C.hush(.16,{a:.5,c:brass.l}));
    later(fall,()=>{flight(descent,drop,brass,len*1.3,230,.25);X.sfx('whoosh',.5,.7);});
    later(land,()=>{
      C.move({x:mix(x,tx,.6),y:ty-BODY*.46,zoom:.72,tilt:.1,roll:-.012},.3);
      peak(tx,ty,brass);corona({...stage,x:tx,y:ty});X.sfx('boom',.8,.7);GFX.ambient(.7,.66,.56,6);
      blast(target,brass,Math.min(hw,hh)*.62,{smoke:.5,heat:1.2,scar:'crater',scarR:.9,life:3.2,shake:.6,stop:.09,light:1});
      K.vcolumn(tx,ty,{r:hh*.16,h:hh*1.5,pal:brass,dur:.85,rise:.1,out:.5,twist:1.2,turb:.9});
      K.vring(tx,ty,{r:hw*.8,r0:140,dur:.7,a:.65,pal:brass,heat:.6,tube:.12});
      K.cool(tx,ty,{pal:brass,kind:'ring',r:760,life:2.6,light:0});
      K.cool(tx,ty,{pal:brass,kind:'crack2',r:560,life:2.6});
      K.chunks(tx,ty,{pal:brass,n:low()?4:7,r:120,sp:[300,900],up:1500,s:[20,44]});
      // The shaft stays standing in the crater, shivering, before it burns away.
      const prev=descent(.93);
      animate(1.1,(k,t)=>{
        const from={...prev,x:prev.x+Math.sin(t*40)*22*Math.exp(-t*8)};
        arrow(target,from,len*1.3,1-ease(sat((k-.6)/.4)));
      });
      const r=Math.hypot(hw,hh/FSY)*1.13;
      let shown=0;
      for(const e of X.onScreen(460)){
        const dist=sat(Math.hypot(e.x-tx,(e.y-ty)/FSY)/r);
        later(.89*(1-Math.sqrt(1-dist)),()=>{if(!e.dead){struck(e,brass,shown++>>1,1.4);X.ultHit(e,10500*A.mul(id),tx,ty);}});
      }
    });
    endUlt(land+2.1);
  }
  const ultimates={
    ar_ult1:[1,'천궁일선','한 발의 화살이 소리를 추월한다. 전장 전역의 적과 보스를 차례로 꿰뚫어 처치하고, 급선회한 자리에 소닉붐을 남긴다.',sonic],
    ar_ult2:[5,'별자리 장송곡','별빛으로 수사슴의 별자리를 잇는다. 사슴이 도약하면 별들이 화살이 되어 전장에 쏟아진다.',requiem],
    ar_ult3:[12,'일식의 대궁','금빛 날개로 엮은 대궁으로 거대한 화살을 하늘 끝까지 쏘아 올린다. 사라졌던 화살이 어두워진 하늘에서 떨어져 꽂히며 빛의 해일이 사방으로 퍼져나간다.',eclipse],
  };
  const ults={};
  for(const [id,[lv,name,desc,cast]] of Object.entries(ultimates)){
    sk[id]={cls:'archer',type:'ult',lv,name,desc};ults[id]=()=>cast(id);
  }
  X.reg('archer',{sk,preload,order:Object.keys(sk),basic:{fn:basic,cd:()=>.62*(1-.04*(A.sLv('ar_basic')-1))},skills,ults});
})();

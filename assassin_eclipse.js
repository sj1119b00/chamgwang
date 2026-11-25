// 흑련개화 (Black Lotus Bloom). A bud of giant dagger petals is planted behind the hero,
// winds tighter while light leaks through its seams, then splays open across the floor.
// Positions use the arena frame (y = squashed floor depth, z = height). Directions are true 3D.
'use strict';
(() => {
  const X=RPG.sv, F=FX3, K=K3, FSY=X.FSY, BODY=X.BODY, pi=Math.PI, tau=pi*2;
  const steel={d:'#090e26',b:'#5087b4',m:'#abdcf0',h:'#f2fcff',l:'#87c3ea',s:'#d9f6ff'};
  const iris={d:'#130727',b:'#7140be',m:'#e093fb',h:'#fbe8ff',l:'#bb7ce3',s:'#f4beff'};
  const petalSteel={d:'#060914',b:'#2a3a56',m:'#4c5d7c',h:'#dfeeff',l:'#6f8fc0',s:'#c9dcf2'};
  const gold={d:'#261021',b:'#ae613d',m:'#ffcd8c',h:'#fff7db',l:'#edb179',s:'#ffe1a4'};
  const sat=v=>Math.max(0,Math.min(1,v));
  const mix=(a,b,k)=>a+(b-a)*k;
  const smooth=(a,b,v)=>{const u=sat((v-a)/(b-a));return u*u*(3-2*u);};
  const hash=i=>{const s=Math.sin(i*12.9898+7.31)*43758.5453;return s-Math.floor(s);};
  const unit=(x,y,z)=>{const l=Math.hypot(x,y,z)||1;return {x:x/l,y:y/l,z:z/l};};
  const step=(p,d,s)=>({x:p.x+d.x*s,y:p.y+d.y*s*FSY,z:p.z+d.z*s});
  const LIFE=5.4, BLOOM=3.2, HUSH=3.0;
  function chain(){
    const pts=[];
    return {pts,add(seg){
      if(seg.length<2)return;
      if(pts.length){const a=pts[pts.length-1],b=seg[0];pts.push({x:a.x,y:a.y,z:a.z,w:0},{x:b.x,y:b.y,z:b.z,w:0});}
      for(const q of seg)pts.push(q);
    }};
  }
  // Bud spin: still until 1.0, accelerating to 3.0, then it stops dead for the hush.
  function spin(t){
    if(t<1)return 0;
    const v=Math.min(t,HUSH)-1,u=v/2;
    return .4*v+6.4*u*u*u/3;
  }
  function cast(id){
    X.ultStart(id);
    const C=X.cine,x=pl.x,y=pl.gy,{hw,hh}=X.view(),D=70000*X.A.mul(id),gpu=!!F.on;
    const cx=x,cy=y-430,low=!!F.low;
    const reach=Math.hypot(hw*1.45,hh*1.45/FSY);
    // Petals: three rings, outer first. The last spin angle leaves a gap straight in front of the hero.
    const rings=low?[6,5,5]:[8,8,8], R0=[300,210,122], LEN=[440,400,362], OPEN=[-1.53,-1.14,-.72], SLIDE=[190,120,58];
    const front=pi/2-spin(HUSH);
    const petals=[];
    let order=0;
    rings.forEach((n,L)=>{
      const seq=[...Array(n).keys()].sort((a,b)=>((a*5)%n)-((b*5)%n));
      seq.forEach((j,k)=>{
        const len=LEN[L]*(1+.05*(hash(order*3.3)-.5));
        const lean=Math.asin(Math.min(.9,R0[L]/(2.16*len)));
        const plant=L===0?.62+.05*k*8/n:L===1?1.0+.04*k*8/n:1.3+.028*k*8/n;
        petals.push({L,i:order,az:front+(j+.5)*tau/n+L*pi/n,len,lean,plant,
          brk:BLOOM+1.0+.18*L+.32*hash(order*5.1),shed:0,landed:false,gone:false});
        order++;
      });
    });
    function bloomK(t){
      const u=(t-BLOOM)/.12;
      if(u<=0)return 0;
      if(u<1)return 1-(1-u)**3;
      const a=t-BLOOM-.12;
      return 1+.07*Math.sin(a*34)*Math.exp(-a*9);
    }
    function petalPose(P,t){
      const fall=.17,u=(t-P.plant+fall)/fall;
      if(u<0||P.gone)return null;
      const tt=Math.min(t,HUSH),phi=P.az+spin(t);
      const tight=smooth(1.0,HUSH,tt),e=bloomK(t);
      let th=P.lean*(.74+.26*tight),psi=.24*(1-Math.min(1,e));
      const age=t-P.plant;
      if(age>0&&t<BLOOM)th+=.11*Math.sin(age*38)*Math.exp(-age*7);
      if(t>HUSH&&t<BLOOM)th+=.012*Math.sin(t*93+P.i*1.7);
      let R=R0[P.L],bz=26,alpha=1,roll=0;
      if(u<1){
        th-=.55*(1-u);roll=5*(1-u)*(1-u)*(P.i%2?1:-1);alpha=sat(u*4);
        bz+=1150*(1-u*u);
      }else bz=26-18*smooth(0,.05,age);
      th=mix(th,OPEN[P.L],e);
      R+=SLIDE[P.L]*Math.min(1.05,e);
      if(e>0)bz=mix(bz,8+P.L*10,Math.min(1,e));
      const c=Math.cos(phi),s=Math.sin(phi),st=Math.sin(th);
      const d=unit(-c*st*Math.cos(psi)-s*st*Math.sin(psi),-s*st*Math.cos(psi)+c*st*Math.sin(psi),Math.cos(th));
      const base={x:cx+c*R,y:cy+s*R*FSY,z:bz};
      return {base,d,phi,alpha,roll,u};
    }
    // Small daggers that climb the bud in a helix, faster and faster.
    const helix=[],nh=low?18:36;
    for(let i=0;i<nh;i++)helix.push({i,s0:hash(i*1.9),a0:i*2.39996,from:1.15+.9*hash(i*4.4),len:46+22*hash(i*8.2),dead:false});
    function helixPos(h,t){
      const v=Math.max(0,Math.min(t,HUSH)-1.15),f=h.s0+.32*v+.2*v*v,hf=f-Math.floor(f);
      const r=(R0[0]+200)*(1-.6*hf),az=h.a0+2.3*spin(Math.min(t,HUSH))+3.2*hf;
      return {p:{x:cx+Math.cos(az)*r,y:cy+Math.sin(az)*r*FSY,z:60+930*hf},hf,az};
    }
    // Daggers that hang over every enemy on screen from 2.2 and drop on the bloom.
    const overhead=[];
    const bits=[];
    const ev={pulse:[1.5,1.88,2.22,2.5,2.74,2.92],done:[]};
    const lit=[],wisps=[];
    function puff(p,n,s,up=1){
      for(let i=0;i<n;i++){
        const a=Math.random()*tau,v=40+90*Math.random();
        GFX.pt({x:p.x,y:p.y,z:Math.max(6,p.z),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:(60+120*Math.random())*up,g:-25,drag:1.6,
          life:.6+.4*Math.random(),s:(18+18*Math.random())*s,grow:50*s,m:5,b:'alpha',c:GFX.rgb('#0b0a15'),c2:'#000000',
          c3:'#3a2f5c',er:.9,ns:1.3,w:1,a:.66,L:0});
      }
    }
    function shatter(p,d,len,pal,t,n,size=.4,kick=1){
      const side=unit(-d.y,d.x,0);
      for(let j=0;j<n;j++){
        const along=n===1?.5:j/(n-1),o=step(p,d,len*(-.3+1.3*along)),sg=j%2?1:-1;
        bits.push({p:o,at:t,life:.5+.14*Math.random(),len:len*size*(.8+.4*Math.random()),pal,
          v:{x:(side.x*sg*190+d.x*80)*kick,y:(side.y*sg*190+d.y*80)*kick,z:(170+230*Math.random())*kick},
          d,ax:unit(side.x*sg,side.y*sg,.6),spin:sg*(9+6*Math.random())});
        puff(o,low?1:2,size*1.7);
      }
      K.sparks(p.x,p.y,p.z,{pal:steel,n:3,sp:[160,520],up:260,life:[.14,.32]});
    }
    function blade(p,d,len,roll,pal,a,shadow,fog=0,fogAt){
      if(!(len>3)||a<.01)return;
      const prev=step(p,d,-8);
      if(!gpu){window.AssassinBlades?.canvas?.(fx,p,prev,len,roll,pal,a,fog,fogAt);return;}
      const ground=F.ground;
      if(!shadow)F.ground=false;
      try{window.AssassinBlades?.draw(p,prev,len,roll,pal,a,8,fog,fogAt);}finally{F.ground=ground;}
    }
    // Petal hilts sink into the ink: dark at the pommel, clean steel toward the point.
    const sunk=p=>Math.hypot(p.x-cx,(p.y-cy)/FSY)<R0[0]+SLIDE[0]+60&&p.z<140?.95:.02;
    const orb=gpu?K.vorb(cx,cy,400,{r:55,dur:BLOOM+.02-.62,pal:iris,in:.5,out:.04,core:.32,spin:2.4,delay:.62}):null;
    function frame(t){
      const core=chain(),vapour=chain(),glow=chain(),seam=chain();
      const m=gpu?K.mats():null;
      // Ink pool under the bud: spreads during the build, retracts into the scars at the end.
      if(gpu){
        const grow=smooth(.15,HUSH,t),shrink=smooth(4.3,5.35,t),ri=(300+820*grow)*(1-shrink*shrink);
        if(ri>20){
          F.quad(m.dark,cx,cy+30,ri*1.15,ri*1.15,0,{a:.62*sat(t/.3)});
          F.quad(m.soot,cx,cy+30,ri,ri,t*.05,{a:.9*sat(t/.3)});
        }
        if(orb&&t<BLOOM)orb.r=55+95*smooth(.62,HUSH,t)+8*Math.sin(t*(6+5*t));
      }
      // Seed knives: twelve thrown up in a spiral during the windup.
      for(let i=0;i<12;i++){
        const u=(t-.08-.022*i)/.55;
        if(u<=0||u>=1)continue;
        const q=v=>{const a=i*tau/12+v*4.2,r=40+260*v;return {x:x+Math.cos(a)*r,y:y-20+Math.sin(a)*r*FSY,z:110+1500*v*v};};
        const p=q(u),pr=q(Math.max(0,u-.03)),d=unit(p.x-pr.x,(p.y-pr.y)/FSY,p.z-pr.z);
        blade(p,d,58,u*9,steel,sat(u*6),false);
        if(gpu)core.add([{...step(p,d,-140),w:0},{...step(p,d,-50),w:5},{...step(p,d,60),w:0}]);
      }
      // Petals.
      const cool=sat((t-BLOOM)/1.7);
      const poses=[];
      for(const P of petals){
        const q=petalPose(P,t);
        poses.push(q);
        if(!q)continue;
        let len=P.len;
        if(t>=P.brk){
          const c=sat((t-P.brk)/.38);
          const pieces=Math.floor(c*4);
          while(P.shed<pieces){
            P.shed++;
            const whole=1-P.shed/4,tip=step(step(q.base,q.d,P.len*1.02),q.d,P.len*whole*1.1);
            shatter(tip,q.d,P.len*.3,P.shed%2?iris:steel,t,1,.7,.7);
          }
          if(c>=1){P.gone=true;shatter(step(q.base,q.d,P.len*.5),q.d,P.len*.3,steel,t,low?1:2,.6,.6);continue;}
          len=P.len*(1-.8*c);
        }
        const p=step(q.base,q.d,len*1.02);
        blade(p,q.d,len,q.roll,petalSteel,q.alpha,P.L===0,0,q.u<1?null:sunk);
        if(!P.landed&&q.u>=1){
          P.landed=true;
          K.sparks(q.base.x,q.base.y,20,{pal:steel,n:low?3:5,sp:[200,620],up:300,life:[.12,.3]});
          K.dust(q.base.x,q.base.y,{n:low?2:3,r:30,sp:[120,380],up:90,s:1,a:.45,life:.6,c:'#15131c',c3:'#3a3546'});
          if(P.L===0){C.shake(.14);if(P.i%2===0)C.SND.shing(.9+.1*P.i/8,.16);}
          if(gpu&&P.L===0)GFX.light(q.base.x,q.base.y,220,steel.l,.3,.2,{z:60});
        }
        if(!gpu)continue;
        if(q.u<1){
          const tip=step(p,q.d,len*1.14);
          vapour.add([{...tip,w:0},{...step(tip,{x:0,y:0,z:1},120),w:16},{...step(tip,{x:0,y:0,z:1},420),w:0}]);
        }else if(t<P.plant+.12){
          const k=sat((t-P.plant)/.12),mid=step(p,q.d,len*.4);
          core.add([{...step(mid,{x:1,y:0,z:0},-len*.6*(.4+k)),w:0},{...mid,w:9*(1-k)},{...step(mid,{x:1,y:0,z:0},len*.6*(.4+k)),w:0}]);
        }
        if(t>BLOOM-.02){
          // The bared edge cools from white through violet to iron, starting at the moment it opens.
          const end=t>=P.brk?1-sat((t-P.brk)/.38):1,w=len*.06*(1-.4*cool)*end;
          glow.add([{...step(p,q.d,-len*.1),w:0},{...step(p,q.d,len*.45),w},{...step(p,q.d,len*1.1),w:0}]);
        }
      }
      // Light leaking through the seams of the outer ring, brighter and faster as the bud tightens.
      if(gpu&&t<BLOOM+.03&&t>.9){
        const n0=rings[0],g=smooth(.9,HUSH,t);
        for(let j=0;j<n0;j++){
          const a=poses[j],b=poses[(j+1)%n0];
          if(!a||!b||a.u<1||b.u<1)continue;
          const pa=petals[j],pb=petals[(j+1)%n0];
          const ta=step(a.base,a.d,pa.len*2.1),tb=step(b.base,b.d,pb.len*2.1);
          const lo={x:(a.base.x+b.base.x)/2,y:(a.base.y+b.base.y)/2+6,z:60},hi={x:(ta.x+tb.x)/2,y:(ta.y+tb.y)/2+4,z:(ta.z+tb.z)/2*.88};
          const pulse=.55+.45*Math.sin(t*(5+7*g)-j*1.3),w=(9+24*g)*pulse*(t>BLOOM?1-sat((t-BLOOM)/.03):1);
          const seg=[];
          for(let k=0;k<=4;k++){const v=k/4;seg.push({x:mix(lo.x,hi.x,v),y:mix(lo.y,hi.y,v),z:mix(lo.z,hi.z,v),w:w*Math.sin(pi*(.1+.8*v))});}
          seam.add(seg);
        }
      }
      // Seam pulses: black vapour breathes out of the gaps.
      ev.pulse.forEach((tp,k)=>{
        if(ev.done[k]||t<tp)return;
        ev.done[k]=true;
        const n0=rings[0];
        for(let j=0;j<n0;j+=low?2:1){
          const a=poses[j];
          if(!a||a.u<1)continue;
          const ph=a.phi+pi/n0;
          wisps.push({t0:tp,ph,z:140+300*hash(j+k*9),s:1+.12*k});
        }
        if(gpu)GFX.light(cx,cy,420+60*k,iris.l,.18+.07*k,.3,{z:500});
        C.SND.inhale(.18+.04*k,.12+.03*k);
      });
      // Each breath is a curl of black vapour that leaves the seam, rises and thins out.
      for(let i=wisps.length-1;i>=0;i--){
        const w=wisps[i],a=t-w.t0;
        if(a>.75||t>BLOOM){wisps.splice(i,1);continue;}
        if(!gpu)continue;
        const k=a/.75,seg=[];
        for(let j=0;j<7;j++){
          const v=j/6,r=R0[0]+20+(60+160*k)*v*w.s,ph=w.ph+.25*v*Math.sin(t*3+i);
          seg.push({x:cx+Math.cos(ph)*r,y:cy+Math.sin(ph)*r*FSY,z:w.z+(40+260*k)*v,w:(14+30*v)*w.s*Math.sin(pi*(.08+.84*v))*Math.sin(pi*Math.min(1,k*1.3))});
        }
        vapour.add(seg);
      }
      // Helix daggers.
      for(const h of helix){
        if(t<h.from||h.dead)continue;
        if(t<BLOOM){
          const now=helixPos(h,t),pr=helixPos(h,t-.02);
          let d=unit(now.p.x-pr.p.x,(now.p.y-pr.p.y)/FSY,now.p.z-pr.p.z);
          if(t>HUSH){const tr=3*Math.sin(t*80+h.i);now.p.x+=tr;now.p.z+=tr*.7;}
          const a=sat((t-h.from)/.15)*Math.pow(Math.sin(pi*now.hf),.45);
          blade(now.p,d,h.len,h.i+t*2,steel,a,false);
          h.last=now;
          if(gpu&&t<HUSH&&!low&&h.i%2===0)vapour.add([{...step(now.p,d,-160),w:0},{...step(now.p,d,-60),w:7*a},{...step(now.p,d,40),w:0}]);
        }else{
          if(!h.last){h.dead=true;continue;}
          const s=t-BLOOM;
          if(s>.4){h.dead=true;continue;}
          const az=h.last.az,d=unit(Math.cos(az),Math.sin(az),-.06),p=step(h.last.p,d,5600*s);
          p.z=Math.max(20,p.z-260*s);
          blade(p,d,h.len*1.2,h.i+t*30,steel,Math.pow(Math.sin(pi*h.last.hf),.45),false);
          if(gpu)core.add([{...step(p,d,-Math.min(520,5600*s)),w:0},{...step(p,d,-90),w:6},{...step(p,d,70),w:0}]);
        }
      }
      // Hanging daggers over the enemies.
      for(const o of overhead){
        if(t<o.at||o.gone)continue;
        const e=o.e,born=sat((t-o.at)/.12),down={x:0,y:0,z:-1};
        let p,d=down,a=1;
        if(t<BLOOM){
          if(e.dead&&!o.drop){o.drop={x:e.x,y:e.y};}
          const ex=o.drop?o.drop.x:e.x,ey=o.drop?o.drop.y:e.y,ez=o.drop?0:e.z+e.h;
          const tr=t>HUSH?4:1.5;
          p={x:ex+tr*Math.sin(t*41+o.i),y:ey,z:ez+300+18*(1-born)+tr*Math.sin(t*37+o.i*.7)};
          a=born;
          if(gpu&&born<1){const mid=step(p,d,o.len*.5);core.add([{...step(mid,{x:1,y:0,z:0},-90*born),w:0},{...mid,w:7*(1-born)},{...step(mid,{x:1,y:0,z:0},90*born),w:0}]);}
        }else{
          const s=t-BLOOM;
          if(!o.hold){o.hold={x:e.x,y:e.y,z:e.z+e.h+300};o.brk=BLOOM+.4+.8*hash(o.i*3.7);}
          const alive=!e.dead,ex=alive?e.x:o.hold.x,ey=alive?e.y:o.hold.y;
          const pinZ=alive?e.z+e.h*.5:0,deep=o.len*(alive?.7:.85);
          const u=sat(s/.06),from=o.hold.z,to=pinZ+o.len*1.14-deep;
          p={x:ex,y:ey,z:mix(from,to,u*u)};
          if(u>=1&&!o.hit){
            o.hit=true;
            K.sparks(ex,ey,pinZ+10,{pal:iris,n:low?2:4,sp:[220,640],up:320,life:[.12,.3]});
            if(!alive)K.dust(ex,ey,{n:2,r:10,sp:[90,260],s:.7,a:.5,life:.7,c:'#2c2a36',c3:'#8f8aa0'});
          }
          if(gpu&&u<1)core.add([{...p,z:from+o.len*1.14,w:0},{...p,z:p.z+o.len*2,w:7},{...p,z:p.z+o.len*1.1,w:0}]);
          if(t>=o.brk||(o.hit&&!alive&&s>.25)){o.gone=true;shatter(step(p,d,o.len*.5),d,o.len*.5,iris,t,low?1:2,.6,.8);continue;}
          if(gpu&&o.hit){
            const hk=K.heat(iris,sat((t-BLOOM)/1.2));
            lit.push([{...step(p,d,o.len*.1),w:0},{...step(p,d,o.len*.6),w:o.len*.13*hk.g},{...step(p,d,o.len*1.1),w:0}]);
          }
        }
        blade(p,d,o.len*(.55+.45*born),o.i*.9,iris,a,false);
      }
      // Tumbling shards of broken petals and knives.
      for(let i=bits.length-1;i>=0;i--){
        const b=bits[i],a=t-b.at;
        if(a>=b.life){bits.splice(i,1);continue;}
        const ang=b.spin*a,c=Math.cos(ang),s=Math.sin(ang);
        const d=unit(b.d.x*c+b.ax.x*s,b.d.y*c+b.ax.y*s,b.d.z*c+b.ax.z*s);
        const p={x:b.p.x+b.v.x*a,y:b.p.y+b.v.y*a*FSY,z:Math.max(4,b.p.z+b.v.z*a-900*a*a)};
        blade(p,d,b.len*(1-sat((a-.18)/(b.life-.18))),ang*.7,b.pal,1,false);
      }
      if(!gpu)return;
      if(core.pts.length>1)F.ribbon(m.trC,core.pts,{cA:steel.b,cB:steel.m,cM:steel.h,cC:'#ffffff',gain:2.6,ero:.05,ord:9,ulen:260});
      if(vapour.pts.length>1)F.ribbon(m.trB,vapour.pts,{cA:iris.d,cB:'#2a1d4a',cM:iris.b,cC:iris.m,a:.6,gain:1.2,ero:.12,ord:7,ulen:320,t0:t*.6});
      if(seam.pts.length>1){
        const g=smooth(.9,HUSH,t);
        F.ribbon(m.trC,seam.pts,{cA:iris.b,cB:iris.m,cM:'#efe0ff',cC:'#ffffff',gain:1.6+2.4*g,ero:.04,ord:9,ulen:200,t0:t*1.5});
      }
      if(glow.pts.length>1){
        const h=K.heat(iris,cool);
        F.ribbon(m.trC,glow.pts,{cA:h.cA,cB:h.cB,cM:h.cM,cC:h.cC,gain:3*h.g,ero:.04,ord:9,ulen:300});
      }
      if(lit.length){
        const h=K.heat(iris,sat((t-BLOOM)/1.2)),all=chain();
        for(const s of lit)all.add(s);
        lit.length=0;
        F.ribbon(m.glowO,all.pts,{cA:h.cA,cB:h.cB,cM:h.cM,cC:h.cC,gain:2.4*h.g,ord:9,ulen:120});
      }
    }
    if(gpu)GFX.add(LIFE,(k,t)=>frame(t));else X.draw(LIFE,k=>frame(k*LIFE));

    // Windup: a spin cut throws the seed knives up.
    C.move({x,y:y-BODY*.8,zoom:1.12,tilt:.06,roll:-.015},.5);
    GFX.ambient(.6,.6,.72,2.2);
    C.SND.inhale(.62,.28);C.drone(46,.14);
    if(window.MK?.on())MK.play('assassinCut',{yaw:-.47,blend:.08});
    K.flare(x,y,BODY*.55,{pal:steel,s:130,sx:2.6,sy:.2,gain:2.2,dur:.3});
    after(.2,()=>{C.SND.shing(1.3,.22);K.sparks(x,y,BODY*.5,{pal:steel,n:10,sp:[160,440],up:260});});
    after(.55,()=>{
      C.move({x,y:y-BODY*2.3,zoom:.84,tilt:.08,roll:.01},.75);
      if(window.MK?.on())MK.play('raise',{blend:.1});
    });
    // Build: the bud winds up; three ripples of ink roll to the screen edge.
    after(1.35,()=>C.move({x,y:y-BODY*2.4,zoom:.93,roll:.03},1.25,'lin'));
    for(const [tr,k] of [[1.2,0],[1.9,1],[2.5,2]]){
      after(tr,()=>{
        if(gpu){
          K.vring(cx,cy,{r:reach,r0:300,dur:1.0,tube:.05+.012*k,c:'#040308',c2:'#1d1730',a:.5});
          GFX.ripple(cx,cy,reach,{life:.95,s:.3+.08*k});
          GFX.light(cx,cy,reach*.7,iris.l,.25+.1*k,.5,{z:200});
        }
        C.SND.gong(.14+.05*k);C.shake(.12+.05*k);
        for(const e of X.onScreen(300)){
          const dist=Math.hypot(e.x-cx,(e.y-cy)/FSY),wait=.8*sat((dist-260)/(reach-260));
          after(wait,()=>{
            if(e.dead)return;
            X.dmg(e,Math.min(D*.03,e.hp*.15),{crit:true,kb:0,stun:.22});
            e.flash=.45;
          });
        }
      });
    }
    after(2.2,()=>{
      const list=X.onScreen(0).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,low?14:30);
      list.forEach((e,i)=>overhead.push({e,i,at:2.2+.5*i/Math.max(1,list.length),len:92+14*hash(i*2.2)}));
      C.SND.shing(1.5,.14);
    });
    after(2.6,()=>{
      C.move({x,y:y-BODY*1.9,zoom:.86,tilt:.12,roll:0},.4);
      if(window.MK?.on())MK.play('iaiReady',{blend:.12});
    });
    after(HUSH,()=>{C.hush(.2,{a:.55,c:'#a9a2d8'});C.SND.cut();});
    // Bloom.
    after(BLOOM,()=>{
      const hitList=X.onScreen(300);
      C.peak(cx,cy-BODY*.6,{ca:.03,blur:.15,tint:'#6a5cff',a:.3,hold:.05,out:.3});
      hitstop=Math.max(hitstop,.1);C.shake(1);C.SND.hit(.85);C.SND.shing(.7,.36);X.sfx('whoosh',.8,.5);
      C.move({x,y:y-BODY*.9,zoom:.74,tilt:.2,roll:0},.22,'out');
      GFX.ambient(.72,.7,.86,1.2);
      if(window.MK?.on())MK.play('slam',{blend:.06});
      if(gpu){
        GFX.light(cx,cy,reach,'#d8ccff',1.4,.5,{z:260,hold:.08});
        GFX.light(cx,cy,reach*.6,iris.l,.9,1.4,{z:120});
        GFX.ripple(cx,cy,reach,{life:.4,s:.5});
        K.vblast(cx,cy,{s:430,pal:iris,heat:.45,smoke:1,dur:2.1,rise:380,fire:.35});
      }
      K.flare(cx,cy,320,{pal:iris,s:420,sx:2.2,sy:.3,gain:2.2,dur:.24});
      const nl=low?8:12;
      for(let i=0;i<nl;i++){
        const a=front+(i+.5)*tau/nl,dx=Math.cos(a),dy=Math.sin(a);
        const r0=R0[0]+120;
        K.coolLine(cx+dx*r0,cy+dy*r0*FSY,cx+dx*reach,cy+dy*reach*FSY,{pal:i%3?iris:steel,w:30+8*(i%2),grow:reach/6500,life:3,hot:.42,light:0,shed:0});
        K.dust(cx+dx*r0*1.6,cy+dy*r0*1.6*FSY,{n:low?2:4,dir:a,spread:.3,sp:[500,1200],up:260,life:.6,a:.55,c:'#2b2838',c3:'#9a90b0'});
      }
      if(gpu){
        // A ring of crescent edges, one per scar, riding out with the cut.
        GFX.add(.36,(k,t)=>{
          const rh=320+6500*t,m=K.mats(),edge=chain(),dark=chain(),fade=1-sat((rh-reach*.85)/(reach*.2));
          if(fade<=0)return;
          for(let i=0;i<nl;i++){
            const a=front+(i+.5)*tau/nl,half=.07+.04*(i%2),seg=[],wide=[];
            for(let j=0;j<=6;j++){
              const v=j/6,b=a+(v-.5)*2*half,bow=rh*(1+.05*Math.cos((v-.5)*pi)),z=28+30*Math.sin(pi*v);
              const q={x:cx+Math.cos(b)*bow,y:cy+Math.sin(b)*bow*FSY,z};
              seg.push({...q,w:(10+18*Math.sin(pi*v))*fade});wide.push({...q,z:z+16,w:(34+40*Math.sin(pi*v))*fade});
            }
            edge.add(seg);dark.add(wide);
          }
          F.ribbon(m.trB,dark.pts,{cA:iris.d,cB:iris.b,cM:iris.m,cC:iris.h,a:.7,gain:1.4,ero:.1,ord:7,ulen:300,t0:t});
          F.ribbon(m.trC,edge.pts,{cA:steel.b,cB:steel.m,cM:steel.h,cC:'#ffffff',gain:3,ero:.04,ord:9,ulen:240});
        });
      }
      hitList.sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy));
      hitList.forEach((e,i)=>{
        const dir=Math.atan2((e.y-cy)/FSY,e.x-cx),dist=Math.hypot(e.x-cx,(e.y-cy)/FSY);
        after(Math.min(.22,dist/6500),()=>{
          if(e.dead)return;
          K.knock(e,{dir,dist:450,up:1000,stun:.8,fx:0});
          if(i<6)K.ehit(e,{pal:iris,pw:1.2,dir,ring:0,light:0});
        });
      });
      C.sweep(cx,cy,D,{list:hitList,speed:6500,max:.22});
    });
    after(4.4,()=>{C.back(1);GFX.ambient(1,1,1,1.5);});
    after(LIFE,()=>X.ultStop());
  }
  window.AssassinEclipse={cast,name:'흑련개화',desc:'단검 수십 자루가 영웅 뒤에서 거대한 검은 연꽃 봉오리로 감겨 오른다. 봉오리가 피는 순간 칼날 꽃잎이 사방으로 펼쳐져 화면 끝까지 쓸고, 모든 적 위에 떠 있던 단검이 한꺼번에 내리꽂힌다.'};
})();

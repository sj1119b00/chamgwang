// Automatic assassin skills. Positions share the arena floor; z is height above it.
'use strict';
(() => {
  const X=RPG.sv, {A,V,BODY,FSY}=X, F=FX3, K=K3, pi=Math.PI;
  const frost={d:'#071422',b:'#218fab',m:'#a4edff',h:'#efffff',l:'#83dbea',s:'#c9efff'};
  const orchid={d:'#190c26',b:'#9142b3',m:'#e0a6fa',h:'#fff0ff',l:'#bf80e5',s:'#e3bdf5'};
  const blood={d:'#230d1c',b:'#aa4169',m:'#ff9eae',h:'#fff2ed',l:'#e5718d',s:'#ffd0c3'};
  const sk={};
  function define(id,name,lv,cd,dmg,desc,evo){
    sk[id]={cls:'assassin',type:'skill',name,lv,cd,dmg,desc,evo};
  }
  define('as_fan','관영비도',1,3.7,1750,'그림자를 두른 단검 세 자루를 부채꼴로 던져 앞의 적을 꿰뚫는다.','두 자루가 한 적을 꿰면 그 자리에 교차 낙인이 새겨져 추가 피해를 준다.');
  define('as_return','환도선',1,5.5,1720,'원반처럼 회전하는 단검을 던진다. 단검은 물방울 모양 궤도를 그리며 돌아오며 한 번 더 벤다.','돌아오는 단검이 강선을 끌고 와 벤 적을 끌어당긴다.');
  define('as_step','영섬',2,6.4,2650,'그림자 속으로 가라앉아 적을 지나쳐 솟아오르며, 지나간 자리의 공간을 벤다.','도착한 자리에서 반대 방향으로 한 번 더 베어 X자 틈을 연다.');
  define('as_snare','은사포박',3,8.5,2200,'적 무리 둘레에 쐐기 네 개를 박고 강선을 감아올려 조인다. 묶인 적은 가운데로 끌려와 잠시 속박된다.','쐐기가 여섯 개로 늘어 범위와 속박 시간이 늘어난다.');
  define('as_ricochet','연환비',5,6.9,1690,'단검 한 자루가 적에서 적으로 꺾여 튄다. 튈수록 빨라지고 달아오른다. 강화하면 경유하는 적이 늘어난다.','한 번 더 튀고, 마지막 적에게 박힌 단검이 파편으로 터진다.');
  define('as_caltrop','흑철질려',6,8.2,2380,'흑철 마름쇠 세 개를 적 무리에 흩뿌린다. 밟은 적은 피해를 입고 느려진다.','마름쇠가 터지며 바늘이 솟아 두 번째 피해를 준다.');
  define('as_warrant','단죄표',8,9,3650,'남은 체력 비율이 가장 낮은 적에게 사형 표식을 새기고, 하늘에서 거대한 단검을 떨어뜨려 꿰뚫는다. 잃은 체력이 많을수록 피해가 커진다.','체력 18% 이하의 일반 적은 처형한다. 보스에게는 추가 피해를 준다.');
  define('as_crescent','쌍익참',10,10.5,2320,'몸을 낮춰 바닥을 쓰는 낮은 베기와 솟구치는 높은 베기를 잇달아 그려, 두 날개 모양 칼날에 닿은 적을 벤다.','두 번째 날개가 넓어지고 맞은 적을 띄운다.');

  const sat=v=>Math.max(0,Math.min(1,v));
  const ease=v=>{const t=sat(v);return t*t*(3-2*t);};
  const lerp=(a,b,k)=>a+(b-a)*k;
  const place=(p,a,d,side=0,z=p.z)=>({x:p.x+Math.cos(a)*d-Math.sin(a)*side,
    y:p.y+(Math.sin(a)*d+Math.cos(a)*side)*FSY,z});
  const mixPoint=(p,q,k)=>({x:lerp(p.x,q.x,k),y:lerp(p.y,q.y,k),z:lerp(p.z,q.z,k)});
  const hero=()=>({x:pl.x,y:pl.gy,z:BODY*.53});
  const chest=e=>({x:e.x,y:e.y,z:e.z+e.h*.52});
  const facing=(a,b)=>Math.atan2((b.y-a.y)/FSY,b.x-a.x);
  const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/FSY);
  const rank=id=>A.sLv(id);
  const damage=id=>sk[id].dmg*A.mul(id);
  function arm(e){
    X.face(X.angTo(e));
    if(window.MK?.on()) MK.play('assassinCut',{yaw:facing(hero(),e),blend:.035});
  }
  // Timed contacts use the update clock, so they still land between rendered frames.
  function beat(seconds,fn){
    const run=V.draws;
    after(seconds,()=>{if(!lock&&!V.over&&RPG.mode==='surv'&&pl.cls==='assassin'&&V.draws===run) fn();});
  }
  function frames(life,paint){
    if(F.on) GFX.add(life,(k,t)=>{if(!lock)paint(t);});
    else X.draw(life,k=>{if(!lock)paint(k*life);});
  }
  function light(q,p,r=330){
    if(F.on) GFX.light(q.x,q.y,r,p.l,.65,.21,{z:q.z});
  }
  function sparks(q,p,dir){
    if(F.on) K.sparks(q.x,q.y,q.z,{pal:p,n:F.low?3:6,dir,spread:.42,sp:[140,470],up:185,life:[.11,.27]});
    else for(let i=0;i<3;i++) spark(q.x,q.y-q.z,dir+(i-1)*.29,280+i*55,{c:p.s,life:.17,w:2,g:290});
  }
  function strip(path,from,to,width,p,age,opacity=1,side=1,trail=false){
    if(to-from<.005||opacity<.015)return;
    const pts=[],n=F.low?9:15;
    for(let i=0;i<=n;i++){
      const k=i/n,q=path(lerp(from,to,k));
      pts.push({x:q.x,y:q.y,z:q.z,w:width*Math.pow(Math.max(.002,Math.sin(pi*k)),.59)*(.53+.47*k)});
    }
    if(F.on){
      AssassinCuts.sweep(pts,p,{trail,t:age,side,fade:1-opacity});
      // The moving pressure surface sits on a painted, thicker stroke. At
      // mobile scale its hot edge stays readable on both dark and lit stone.
      F.ribbon(K.mats().trB,pts,{cA:p.d,cB:p.b,cM:p.m,cC:p.h,a:opacity*.90,
        gain:3.4,bgain:1.45,ero:.09+.26*(1-opacity),t0:side*.37,ord:5});
      return;
    }
    fx.save();fx.lineCap='round';
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i];
      fx.beginPath();fx.moveTo(a.x,a.y-a.z);fx.lineTo(b.x,b.y-b.z);
      fx.strokeStyle=hexA(p.d,.68*opacity);fx.lineWidth=Math.max(2,b.w*1.37);fx.stroke();
      fx.strokeStyle=hexA(p.b,.9*opacity);fx.lineWidth=Math.max(1,b.w);fx.stroke();
      fx.strokeStyle=hexA(p.h,.88*opacity);fx.lineWidth=Math.max(1.5,b.w*.28);fx.stroke();
    }
    fx.restore();
  }
  function knife(q,previous,len,roll,p,opacity=1){
    if(opacity<.015)return;
    if(F.on) AssassinBlades.draw(q,previous,len,roll,p,opacity);
    else AssassinBlades.canvas(fx,q,previous,len,roll,p,opacity);
  }
  function throwKnife(path,life,p,len,{roll=1,tail=.24,width=14}={}){
    frames(life,t=>{
      const u=sat(t/life),q=path(u),last=path(Math.max(0,u-.018));
      const a=Math.min(1,u*19,(1-u)*18);
      strip(path,Math.max(0,u-tail),u,width,p,t,a,1,true);
      knife(q,last,len,roll+t*11,p,a);
    });
  }
  function slash(path,p,w,life,delay=0){
    function begin(){
      frames(life,t=>{
        const head=sat(t/Math.min(.16,life*.40)),fade=sat((t-life*.46)/(life*.54));
        strip(path,.79*fade*fade,head,w,p,t,1-fade*fade);
      });
    }
    if(delay)beat(delay,begin);else begin();
  }
  function sweepDamage(path,start,end,duration,radius,touch,hit=new Set()){
    const slices=7;
    let last=path(start);
    for(let i=1;i<=slices;i++){
      beat(duration*lerp(start,end,i/slices),()=>{
        const q=path(lerp(start,end,i/slices));
        X.inLine(last.x,last.y,q.x,q.y,radius,e=>{
          if(hit.has(e))return;
          hit.add(e);touch(e,q);
        });
        last=q;
      });
    }
  }
  function strike(e,d,source,opts={},flash=1){
    const prior=e.flash||0;
    X.dmg(e,d,{kb:.18,sx:source.x,sy:source.y,...opts});
    if(flash<1)e.flash=Math.max(prior,Math.min(flash,e.flash));
  }
  function nearby(origin,radius){
    return V.en.filter(e=>!e.dead&&distance(origin,e)<=radius+e.d.r);
  }
  // ---- A group helpers (thrown-dagger family: as_fan, as_return, as_ricochet, as_warrant) ----
  // Steel and indigo-violet. Every line a skill draws in one frame shares one ribbon per layer.
  const aSteel={d:'#090e26',b:'#5087b4',m:'#abdcf0',h:'#f2fcff',l:'#87c3ea',s:'#d9f6ff'};
  const aIris={d:'#130727',b:'#7140be',m:'#e093fb',h:'#fbe8ff',l:'#bb7ce3',s:'#f4beff'};
  const aWhite={d:'#16203c',b:'#8fb8dc',m:'#e8f8ff',h:'#ffffff',l:'#cfe8ff',s:'#ffffff'};
  const aR=(a,b)=>a+Math.random()*(b-a);
  const aCol=p=>({cA:p.d,cB:p.b,cM:p.m,cC:p.h});
  const aHex=c=>typeof c==='string'?c:'#'+c.map(v=>Math.round(sat(v)*255).toString(16).padStart(2,'0')).join('');
  let aMat=null;
  function aMats(){
    if(!aMat)aMat={
      mist:F.mat({nz:'wisp',n1:[.9,1,-1.4,0],n2:[1.4,1.2,-.6,.1],dist:.1,nk:.6,ero:.12,soft:.45,pm:[2,1.1,0,0],
        cA:'#000000',cB:'#000000',cC:'#000000',op:1}),
      star:F.mat({tex:'v3_xburst',nz:'fbm',n1:[2,2,0,0],nk:0,ero:.1,soft:.35,rk:[.5,1],gain:3,bgain:1.1})};
    return aMat;
  }
  // Several polylines in one ribbon: zero-width bridge points join them without drawing anything between.
  function aJoin(lines){
    const out=[];
    for(const pts of lines){
      if(pts.length<2)continue;
      if(out.length){const a=out[out.length-1],b=pts[0];out.push({x:a.x,y:a.y,z:a.z,w:0},{x:b.x,y:b.y,z:b.z,w:0});}
      for(const q of pts)out.push(q);
    }
    return out;
  }
  // w on each point is the dark body's half width; the colour and the white thread ride on it at fixed fractions.
  function aLines(lines,p,o={}){
    if(!F.on)return;
    const all=aJoin(lines);if(all.length<2)return;
    const m=aMats(),S=K.mats(),a=o.a??1,ero=o.ero??.1,ul=o.ulen||300,g=o.gain||1,z=o.ord||0;
    if(o.ink!==0)F.ribbon(m.mist,all,{a:a*(o.ink??.8),ulen:ul,t0:o.t0||0,ero,ord:4+z,layer:o.layer});
    F.ribbon(S.trB,all.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*(o.mid??.42)})),{...aCol(p),a,gain:2.6*g,ero,ulen:ul,ord:5+z,layer:o.layer});
    if(o.core!==0)F.ribbon(S.trC,all.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w?Math.max(1.8,q.w*(o.core??.13)):0})),
      {cA:p.b,cB:p.m,cM:p.h,cC:'#ffffff',a,gain:3.2*g,ero:ero+.05,ulen:ul*.8,ord:6+z,layer:o.layer});
  }
  // Black vapour and steel chips blown out of an enemy's back along the blow (the exit wound).
  function aWound(e,dir,p,n=5){
    const q=chest(e);
    if(!F.on){sparks(q,p,dir);return;}
    const r=(e.d.r||30)*.8,x=q.x+Math.cos(dir)*r,y=q.y+Math.sin(dir)*r*FSY;
    for(let i=0;i<n;i++){
      const a=dir+aR(-.36,.36),s=aR(260,760);
      GFX.pt({x,y,z:q.z+aR(-14,14),vx:Math.cos(a)*s,vy:Math.sin(a)*s*FSY,vz:aR(10,110),g:-30,drag:3.4,life:aR(.45,.85),
        s:aR(20,36),grow:aR(60,120),m:5,b:'alpha',c:[.03,.03,.07],c2:'#000000',c3:'#2b2540',er:.9,ns:aR(.9,1.6),w:1,a:.66,L:2});
    }
    for(let i=0;i<n;i++){
      const a=dir+aR(-.6,.6),s=aR(380,950);
      GFX.pt({x,y,z:q.z,vx:Math.cos(a)*s,vy:Math.sin(a)*s*FSY,vz:aR(150,560),g:1700,drag:.5,life:aR(.45,.8),s:aR(4,8),
        rot:aR(0,6.3),vr:aR(-14,14),m:11,b:'alpha',c:GFX.rgb(i%2?'#8ea3c0':'#2c3446'),c2:'#05060a',fk:4,L:2});
    }
    K.sparks(x,y,q.z,{pal:p,n:F.low?3:6,dir,spread:.4,sp:[500,1300],up:220,life:[.12,.3]});
  }
  // A glowing flake leaving a line as it breaks up.
  function aFlake(q,p){
    if(!F.on)return;
    GFX.pt({x:q.x+aR(-8,8),y:q.y+aR(-5,5),z:q.z,vx:aR(-60,60),vy:aR(-30,30),vz:aR(40,200),g:-20,drag:1.2,life:aR(.3,.6),
      s:aR(2.5,4.5),m:8,c:GFX.rgb(Math.random()<.4?p.h:p.s),fade:'in',L:3});
    if(Math.random()<.5)GFX.pt({x:q.x,y:q.y,z:q.z,vx:aR(-40,40),vy:aR(-20,20),vz:aR(20,90),g:-20,drag:2.6,life:aR(.4,.7),
      s:aR(12,20),grow:aR(30,60),m:5,b:'alpha',c:[.03,.03,.06],c2:'#000000',c3:'#28223a',er:.9,ns:1.2,w:1,a:.5,L:2});
  }
  // The second blade in one body carves an X across it; it bursts a quarter second later.
  function aBrand(e){
    if(!F.on)return;
    GFX.add(.26,(k,t)=>{
      if(lock)return;
      const q=chest(e),g=ease(t/.06),s=62,a=1-ease((t-.18)/.08);
      const cut=(sx,sz,d)=>[{x:q.x-sx*s*g,y:q.y+2,z:q.z-sz*s*g,w:0},{x:q.x,y:q.y+2,z:q.z,w:18},{x:q.x+sx*s*g,y:q.y+2,z:q.z+sz*s*g,w:0}];
      aLines([cut(1,1),cut(1,-1)],aIris,{a,gain:1.2,ink:.55,mid:.5,core:.18,ulen:160});
    });
    beat(.26,()=>{
      if(e.dead)return;
      K.ehit(e,{pal:aIris,pw:.9});X.sfx('slash',1.85,.24);
    });
  }
  function fan(id){
    const enemy=X.nearest(910);if(!enemy)return false;
    const src=hero(),ang=facing(src,enemy),len=880+rank(id)*28,d=damage(id),evo=rank(id)>=5;
    arm(enemy);X.sfx('whoosh',1.52,.36);
    const z1=enemy.h*.48,T=.40,HOLD=.12,BREAK=.36;
    // Three straight lanes: the only straight lines the assassin draws.
    const lanes=[-1,0,1].map(n=>{const a=ang+n*.35;return {n,a,flakes:0,path:u=>place(src,a,len*u,0,lerp(src.z,z1,Math.min(1,u)))};});
    const lamp=F.on?GFX.light(src.x,src.y,250,aSteel.l,.6,.2,{hold:T,z:src.z}):null;
    if(F.on){
      const mouth=place(src,ang,60);
      K.flare(mouth.x,mouth.y,mouth.z,{pal:aWhite,s:120,dur:.14});
      K.sparks(mouth.x,mouth.y,mouth.z,{pal:aSteel,n:F.low?4:8,dir:ang,spread:.5,sp:[700,1700],up:160,life:[.1,.22]});
    }
    frames(T+HOLD+BREAK,t=>{
      const fly=t/T,head=sat(fly),brk=ease((t-T-HOLD)/BREAK),tail=Math.min(head-.004,.04+.96*brk);
      if(lamp){const q=lanes[1].path(head);lamp.x=q.x;lamp.y=q.y;lamp.z=q.z;}
      const lines=[];
      for(const L of lanes){
        if(fly<1.15){
          const q=L.path(fly),b=L.path(fly-.02),fade=Math.min(1,t*30)*(1-sat((fly-1)/.15));
          knife(q,b,L.n?60:68,t*15+L.n,L.n?aSteel:aIris,fade);
        }
        if(!F.on){strip(L.path,tail,head,12,aSteel,t,1-brk,1,true);continue;}
        const pts=[],n=F.low?6:11;
        for(let i=0;i<=n;i++){
          const k=i/n,u=lerp(tail,head,k),q=L.path(u),near=sat((head-u)*len/70);
          q.w=36*Math.pow(k,.7)*(.25+.75*near)*(1-.5*brk);pts.push(q);
        }
        lines.push(pts);
        const want=Math.floor(brk*(F.low?4:9));
        while(L.flakes<want){L.flakes++;aFlake(L.path(tail+aR(0,.05)),aSteel);}
      }
      aLines(lines,aSteel,{a:1-brk*brk*brk,ero:.08+.45*brk,ulen:420,t0:t*.4,ink:.65,mid:.5,core:.15,gain:1.15});
    });
    const struck=new Map();let firstHit=true;
    for(const L of lanes){
      sweepDamage(L.path,0,1,T,34,(e,q)=>{
        const c=struck.get(e)||0;
        if(!c||evo){
          strike(e,d*(c?.47:1),src,{push:120});
          aWound(e,L.a,aSteel,F.low?3:5);
          if(firstHit){
            firstHit=false;hitstop=Math.max(hitstop,.045);X.cine.shake(.2);
            if(F.on)K.ehit(e,{pal:aSteel,dir:L.a,pw:.85});
          }
          if(c===1)aBrand(e);
        }
        struck.set(e,c+1);
      });
    }
    return true;
  }
  function returning(id){
    const e=X.nearest(910);if(!e)return false;
    const src=hero(),ang=facing(src,e),reach=Math.min(1050,distance(src,e)+123);
    const end=place(src,ang,reach,0,e.z+e.h*.48),d=damage(id),evo=rank(id)>=5;
    arm(e);X.sfx('whoosh',.90,.44);light(end,aIris);
    // A teardrop: wide and high on the way out, low and tight on the way back.
    const path=u=>{
      const back=u>.48,k=back?(u-.48)/.52:u/.48;
      const q=back?mixPoint(end,hero(),ease(k)):mixPoint(src,end,1-(1-k)**1.36);
      const bulge=back?Math.sin(pi*k)*(1-.45*k):Math.sin(pi*k)*(.55+.45*k);
      return place(q,ang,0,(back?-1:1)*bulge*Math.min(reach*.24,139),q.z+Math.sin(pi*k)*(back?30:118));
    };
    // The disc checks for a breath at the far point: the picture holds while the hit timing stays on the path.
    const vu=t=>t<.3?.48*t/.3:t<.36?.48:Math.min(1,.48+.52*(t-.36)/.32);
    const hooked=[],LIFE=1.14;
    frames(LIFE,t=>{
      const u=vu(t),q=path(u),undo=ease((t-.74)/.38),tail=Math.min(u-.004,undo);
      if(t<.72){
        const a=Math.min(1,t*25)*(1-sat((t-.68)/.04)),spin=t*42;
        for(let j=0;j<3;j++){
          const s=spin-j*.55;
          knife(q,{x:q.x-Math.cos(s)*12,y:q.y-Math.sin(s)*12*FSY,z:q.z},84,pi/2,j?aIris:aSteel,a*[1,.5,.24][j]);
        }
        if(F.on){
          F.quad(K.mats().glowO,q.x,q.y,190,190,0,{z:q.z,...aCol(aIris),a:.7*a,gain:2.4});
          // The blur of the spinning rim: an open ring that turns with the blade.
          const rim=[];
          for(let i=0;i<=14;i++){const b=spin*.8+i/14*pi*1.6;rim.push({x:q.x+Math.cos(b)*58,y:q.y+Math.sin(b)*58*FSY,z:q.z,w:i&&i<14?7*Math.sin(pi*i/14):0});}
          aLines([rim],aSteel,{a,ink:0,mid:.9,core:.3,gain:1.3,ulen:200});
        }
      }
      if(!F.on){strip(path,tail,u,14,aSteel,t,1-undo,1,true);return;}
      const pts=[],n=F.low?14:26;
      for(let i=0;i<=n;i++){
        const k=i/n,v=lerp(tail,u,k),p=path(v);
        p.w=24*(.45+.55*Math.pow(k,1.6))*Math.min(1,(u-v)*14+.15)*(1-.55*undo);pts.push(p);
      }
      aLines([pts],aSteel,{a:1-undo*undo,ero:.08+.4*undo,ulen:380,ink:.6,mid:.72,core:.2,gain:1.05,t0:t*.5});
      F.ribbon(aMats().mist,pts.map(p=>({x:p.x,y:p.y,z:0,w:p.w*1.3})),{layer:'g',a:.32*(1-undo),ulen:380});
      if(hooked.length&&t<.8){
        const tight=ease((t-.4)/.2),a=1-ease((t-.7)/.1),wires=[];
        for(const o of hooked){
          if(o.dead)continue;
          const c=chest(o),mid=mixPoint(q,c,.5);mid.z-=26*(1-tight);
          wires.push([{x:q.x,y:q.y,z:q.z,w:6},{...mid,w:5},{x:c.x,y:c.y,z:c.z,w:4}]);
        }
        aLines(wires,aWhite,{a,ink:0,mid:.6,core:.35,gain:1.1,ulen:200});
      }
    });
    beat(.31,()=>{
      X.sfx('slash',1.65,.29);
      if(!F.on)return;
      K.flare(end.x,end.y,end.z,{pal:aWhite,s:150,dur:.16});
      K.sparks(end.x,end.y,end.z,{pal:aSteel,n:F.low?5:10,sp:[300,900],up:300,life:[.12,.3]});
    });
    let first=true;
    sweepDamage(path,0,.48,.68,68,(o,q)=>{
      strike(o,d,src,{push:100});
      if(first){first=false;hitstop=Math.max(hitstop,.04);X.cine.shake(.15);if(F.on)K.ehit(o,{pal:aSteel,dir:ang,pw:.85});}
      else aWound(o,ang,aSteel,3);
    });
    sweepDamage(path,.48,1,.68,76,(o,q)=>{
      strike(o,d*(evo?1.42:1),src,{kb:evo?-1.05:.08});
      aWound(o,ang+pi,aIris,3);
      if(evo&&hooked.length<4)hooked.push(o);
    });
    return true;
  }
  // ---- B group helpers (body, floor and wire family: as_step, as_snare, as_caltrop, as_crescent) ----
  // Steel and indigo-violet over black mist. Every line one skill draws in a frame shares one ribbon per layer.
  const bSteel={d:'#090e26',b:'#5087b4',m:'#abdcf0',h:'#f2fcff',l:'#87c3ea',s:'#d9f6ff'};
  const bIris={d:'#130727',b:'#7140be',m:'#e093fb',h:'#fbe8ff',l:'#bb7ce3',s:'#f4beff'};
  const bWhite={d:'#16203c',b:'#8fb8dc',m:'#e8f8ff',h:'#ffffff',l:'#cfe8ff',s:'#ffffff'};
  const bR=(a,b)=>a+Math.random()*(b-a);
  const bCol=p=>({cA:p.d,cB:p.b,cM:p.m,cC:p.h});
  // The trail materials fade u 0..1 at both ends; with ulen shorter than a line that would cut it off, so B lines taper by width instead.
  const NOFD=[0,0,0,0];
  let bMat=null;
  function bMist(){
    if(!bMat)bMat=F.mat({nz:'wisp',n1:[.9,1,-1.4,0],n2:[1.4,1.2,-.6,.1],dist:.1,nk:.6,ero:.12,soft:.45,pm:[2,1.1,0,0],
      cA:'#000000',cB:'#000000',cC:'#000000',op:1});
    return bMat;
  }
  // Several polylines in one ribbon: zero-width bridge points join them without drawing anything between.
  function bJoin(lines){
    const out=[];
    for(const pts of lines){
      if(pts.length<2)continue;
      if(out.length){const a=out[out.length-1],b=pts[0];out.push({x:a.x,y:a.y,z:a.z,w:0},{x:b.x,y:b.y,z:b.z,w:0});}
      for(const q of pts)out.push(q);
    }
    return out;
  }
  // w on each point is the dark body's half width; the colour layer and the white thread ride on it at fixed fractions (mid, core; 0 = none).
  function bLines(lines,p,o={}){
    if(!F.on)return;
    const all=bJoin(lines);if(all.length<2)return;
    const S=K.mats(),a=o.a??1,ero=o.ero??.1,ul=o.ulen||300,g=o.gain||1,z=o.ord||0,L=o.layer;
    if(o.ink!==0)F.ribbon(bMist(),all,{a:a*(o.ink??.8),ulen:ul,t0:o.t0||0,ero,ord:4+z,layer:L});
    if(o.mid!==0)F.ribbon(S.trB,all.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*(o.mid??.42)})),{...bCol(p),a,gain:2.6*g,ero,ulen:ul,fd:NOFD,ord:5+z,layer:L});
    if(o.core!==0)F.ribbon(S.trC,all.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w?Math.max(1.6,q.w*(o.core??.13)):0})),
      {cA:p.b,cB:p.m,cM:p.h,cC:'#ffffff',a,gain:3.2*g,ero:ero+.05,ulen:ul*.8,fd:NOFD,ord:6+z,layer:L});
  }
  // Shift a polyline sideways on the screen by f(i) world units along the ribbon normal.
  function bShift(pts,f){
    const n=pts.length;
    return pts.map((p,i)=>{
      const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)],dx=b.x-a.x,dy=(b.y-b.z)-(a.y-a.z),l=Math.hypot(dx,dy)||1,s=f(i);
      return {x:p.x-dy/l*s,y:p.y,z:p.z-dx/l*s,w:p.w};
    });
  }
  // Black vapour breathing out of a point (dir: floor angle, null = all round).
  function bVapor(q,n,dir=null,sp=[60,260],size=[18,32]){
    if(!F.on)return;
    for(let i=0;i<n;i++){
      const a=dir==null?bR(0,2*pi):dir+bR(-.5,.5),v=bR(sp[0],sp[1]);
      GFX.pt({x:q.x+bR(-6,6),y:q.y+bR(-4,4),z:q.z+bR(-6,6),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:bR(20,120),g:-30,drag:2.8,life:bR(.45,.8),
        s:bR(size[0],size[1]),grow:bR(50,100),m:5,b:'alpha',c:[.03,.03,.07],c2:'#000000',c3:'#2b2540',er:.9,ns:bR(.9,1.5),w:1,a:.62,L:2});
    }
  }
  // Steel chips with dark edges, thrown out and falling.
  function bChips(q,n,dir=null,sp=[260,800]){
    if(!F.on)return;
    for(let i=0;i<n;i++){
      const a=dir==null?bR(0,2*pi):dir+bR(-.7,.7),v=bR(sp[0],sp[1]);
      GFX.pt({x:q.x,y:q.y,z:q.z,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:bR(150,520),g:1700,drag:.5,life:bR(.4,.75),s:bR(4,8),
        rot:bR(0,6.3),vr:bR(-14,14),m:11,b:'alpha',c:GFX.rgb(i%2?'#9fb4d2':'#2c3446'),c2:'#05060a',fk:4,L:2});
    }
  }
  // A cooling glint lifting off a line as it breaks.
  function bFlake(q,p){
    if(!F.on)return;
    GFX.pt({x:q.x+bR(-8,8),y:q.y+bR(-5,5),z:q.z,vx:bR(-60,60),vy:bR(-30,30),vz:bR(40,200),g:-20,drag:1.2,life:bR(.3,.6),
      s:bR(2.5,4.5),m:8,c:GFX.rgb(Math.random()<.4?p.h:p.s),fade:'in',L:3});
  }
  // A cut left hanging in the air along path(u): drawn as a white line, it splits open into a black slit with bright lips,
  // breathes black vapour, then snaps shut and breaks into steel chips. Times are seconds from the call.
  function bRift(path,{draw=.12,open=.09,hold=.3,shut=.1,gap=34,p=bIris}={}){
    const life=draw+open+hold+shut+.05,n=F.low?10:18,st={vent:0,broke:false};
    const ph=bR(0,6),rough=[...Array(n+1)].map((_,i)=>.82+.18*Math.sin(i/n*7+ph));
    frames(life,t=>{
      const head=ease(t/draw),o=ease((t-draw)/open),c=ease((t-draw-open-hold)/shut);
      if(c>=1){
        if(!st.broke){st.broke=true;for(let i=1;i<5;i++){const q=path(i/5);bChips(q,F.low?1:2);bVapor(q,1);bFlake(q,p);}}
        return;
      }
      if(!F.on){strip(path,0,head,8+gap*o*(1-c),p,t,1-c);return;}
      const g=gap*o*(1-c*c),pts=[];
      for(let i=0;i<=n;i++){
        const k=i/n,q=path(k*head);
        q.w=g*Math.pow(Math.sin(pi*k),.85)*rough[i];pts.push(q);
      }
      // The black inside, with a slow violet stir deep in it.
      if(g>1){
        F.ribbon(bMist(),pts.map(q=>({...q,w:q.w*1.5+6})),{a:1,ulen:260,t0:t*.6,ero:.06,ord:4});
        F.ribbon(K.mats().trB,pts.map(q=>({...q,w:q.w*.8})),{...bCol(p),a:.85*o*(1-c),gain:1.25,ulen:160,fd:NOFD,t0:-t,ero:.2,ord:5});
      }
      // Two bright lips; before it opens they are one white line.
      const lip=pts.map((q,i)=>({...q,w:(3.5+6*o)*Math.pow(Math.sin(pi*i/n),.45)}));
      const up=bShift(lip,i=>pts[i].w),dn=bShift(lip,i=>-pts[i].w);
      bLines(o>0?[up,dn]:[lip],p,{ink:0,mid:1,core:.5,gain:1.25*(1-.5*c),ulen:200,ero:.08+.4*c,ord:2});
      const want=o>0?Math.min(F.low?6:14,Math.floor((t-draw)*40)):0;
      while(st.vent<want){
        st.vent++;const i=1+Math.floor(Math.random()*(n-1)),q=pts[i],s=(st.vent%2?1:-1)*q.w;
        bVapor(bShift([pts[i-1],q,pts[i+1]],()=>s)[1],1,null,[20,90],[14,24]);
      }
    });
  }
  function shadowStep(id){
    const e=X.nearest(690);if(!e||V.steer)return false;
    const src=hero(),ang=facing(src,e),reach=Math.min(750,distance(src,e)+114),end=place(src,ang,reach);
    const evo=rank(id)>=5,d=damage(id),T=.14;arm(e);X.sfx('whoosh',1.24,.51);
    V.dash={x0:src.x,y0:src.y,x1:end.x,y1:end.y,t:0,dur:T,soft:true};
    RPG.inv=Math.max(RPG.inv,.17);
    if(window.MK?.on()){
      beat(.022,()=>MK.ghost({c:'#b397de',a:.73,life:.23}));
      beat(.075,()=>{if(V.dash) MK.ghost({c:'#8eb4cc',a:.56,life:.17});});
    }
    const floor=u=>place(src,ang,reach*u,Math.sin(pi*u)*18,0);
    const rift=u=>place(src,ang,lerp(-50,reach+70,u),-30*Math.sin(pi*u),118+36*u);
    bVapor({x:src.x,y:src.y,z:20},F.low?3:6,null,[40,170]);
    // The hero sinks into a pool of ink; the shadow runs along the floor to the far side, where a second pool lets the body up.
    frames(.95,t=>{
      const head=sat(t/T),tail=ease((t-.42)/.45);
      if(!F.on){if(head>tail)strip(floor,tail,head,22,bIris,t,1-tail);return;}
      const S=K.mats();
      const pool=(x,y,t0,r)=>{
        const k=t-t0;if(k<0||k>.5)return;
        const s=r*ease(k/.07)*(1-.55*ease((k-.2)/.3));
        F.quad(S.glowG,x,y,s*1.3,s*1.3,k*.7,{...bCol(bIris),a:.75*(1-ease((k-.25)/.25)),gain:1.1});
        F.quad(S.dark,x,y,s,s,k*.7,{a:.85*(1-ease((k-.3)/.2))});
      };
      pool(src.x,src.y,0,125);pool(end.x,end.y,T,110);
      if(head<=tail)return;
      const pts=[],n=F.low?8:14;
      for(let i=0;i<=n;i++){const k=i/n,q=floor(lerp(tail,head,k));q.w=40*Math.pow(Math.sin(pi*(.06+.88*k)),.6)*(1-.5*tail);pts.push(q);}
      F.ribbon(S.trB,pts.map(q=>({...q,w:q.w*1.55})),{...bCol(bIris),a:.9*(1-tail),gain:1.6,ulen:300,fd:NOFD,t0:-t*2,ero:.15+.4*tail,layer:'g',ord:3});
      F.ribbon(bMist(),pts,{a:.95*(1-tail*tail),ulen:300,t0:t,ero:.1+.5*tail,layer:'g',ord:4});
    });
    bRift(rift,{draw:T,gap:78});
    light(end,bIris,380);
    beat(T,()=>bVapor({x:end.x,y:end.y,z:24},F.low?3:5,null,[50,200]));
    beat(.17,()=>{
      const q=hero();let n=0;
      X.inLine(src.x,src.y,q.x,q.y,93,o=>{
        const side=Math.sign(Math.cos(ang)*(o.y-src.y)/FSY-Math.sin(ang)*(o.x-src.x))||1,dir=ang+side*pi/2;
        strike(o,d,src,{kb:0});K.knock(o,{dir,dist:140});
        if(n++<2&&F.on)K.ehit(o,{pal:bIris,dir,pw:.95});
        else bVapor(chest(o),2,dir);
      });
      X.sfx('slash',1.5,.36);
      if(n){hitstop=Math.max(hitstop,.05);X.cine.shake(.2);}
      if(F.on)K.coolLine(src.x,src.y,q.x,q.y,{w:30,pal:bIris,life:1.2,hot:.45,grow:.06});
      else sparks(q,orchid,ang+pi);
      if(!evo)return;
      // The X: a second rift rises across the first, just short of where the body came up.
      const c=place(q,ang,-Math.min(150,reach*.4),0,125),cross=u=>place(c,ang+1.2,lerp(-260,260,u),0,40+190*u);
      beat(.06,()=>{
        bRift(cross,{draw:.08,gap:52,hold:.24,p:bSteel});
        sweepDamage(cross,0,1,.08,67,o=>strike(o,d*.74,src));
        beat(.08,()=>{if(F.on){K.flare(c.x,c.y,c.z,{pal:bWhite,s:170,dur:.16});K.sparks(c.x,c.y,c.z,{pal:bIris,n:F.low?4:8,sp:[300,900],up:300,life:[.1,.26]});}X.sfx('slash',1.8,.26);});
      });
    });
    return true;
  }
  function snare(id){
    const e=X.densest(870,235);if(!e)return false;
    const q=chest(e),ang=facing(hero(),q),evo=rank(id)>=5,r=evo?311:225,d=damage(id),n=evo?6:4,TIGHT=.31,bind=evo?1.18:.76;
    arm(e);X.sfx('whoosh',.81,.41);light({...q,z:22},bSteel,r*1.6);
    const from=hero(),pegs=[],st={bound:[],broke:false};
    for(let i=0;i<n;i++){const a=ang+pi+(i+.5)*2*pi/n;pegs.push({a,p:place(q,a,r,0,0),land:.07+.014*i,i});}
    // The planted wedge: blade down and outward into the floor, quivering for a moment after it lands.
    const peg=(g,t)=>{
      const age=t-g.land,qv=Math.sin(age*70)*Math.exp(-age*12)*6,ca=Math.cos(g.a),sa=Math.sin(g.a);
      const p={x:g.p.x-ca*10,y:g.p.y-sa*10*FSY,z:52};
      return {p,b:{x:p.x-ca*10+qv,y:p.y-sa*10*FSY,z:p.z+22}};
    };
    // A wire wound from the wedge up and in: s 0 at the wedge .. 1 at the top of the cage.
    const wire=(g,t,s)=>{
      const taut=ease((t-.2)/.11),pull=ease((t-TIGHT)/.1),slack=ease((t-.5)/.32);
      const a=g.a+s*1.3+(1-taut)*.08*Math.sin(s*pi*5-t*48+g.a*3);
      const rad=r*(1-.7*s)*(1-.5*pull*Math.sqrt(s));
      const z=lerp(52+150*s,4,slack*(.35+.65*s))-60*slack*(1-slack)*Math.sin(pi*s);
      return place(q,a,rad,0,z);
    };
    const LIFE=TIGHT+bind+.25;
    frames(LIFE,t=>{
      const pull=ease((t-TIGHT)/.1),slack=ease((t-.5)/.32);
      if(t>.97&&!st.broke){
        st.broke=true;
        for(const g of pegs){const P=peg(g,t).p;bChips(P,F.low?2:3);bVapor(P,1);for(let j=1;j<4;j++)bFlake(wire(g,t,j/4),bSteel);}
      }
      const wires=[];
      for(const g of pegs){
        const k=sat(t/g.land);
        if(k<1){
          const to={x:g.p.x,y:g.p.y,z:55},at=v=>{const m=mixPoint(from,to,v);m.z+=90*Math.sin(pi*v);return m;};
          knife(at(k),at(Math.max(0,k-.08)),64,t*20,bSteel,Math.min(1,t*30));
          continue;
        }
        if(st.broke)continue;
        const P=peg(g,t);knife(P.p,P.b,64,0,bSteel,1);
        const head=ease((t-g.land)/.18),m=F.low?8:14,sp=((t-.12)*4.2+g.i*.23)%1,pts=[];
        if(!F.on){strip(s=>wire(g,t,s),0,head,7,bSteel,t,1-slack);continue;}
        for(let j=0;j<=m;j++){
          const s=j/m*head,w=wire(g,t,s),bead=1+1.8*Math.exp(-Math.pow((j/m-sp)/.08,2))*(1-pull);
          w.w=7*(1-.35*s)*bead;pts.push(w);
        }
        wires.push(pts);
      }
      bLines(wires,bSteel,{ink:.45,mid:.75,core:.4,gain:1.15-.6*slack,ero:.08+.6*sat((t-.75)/.22),ulen:160,t0:-t*2});
      // A loop of wire round each bound waist until the bind ends, then it snaps.
      const rings=[];
      for(const b of st.bound){
        const o=b.e;if(b.snap)continue;
        if(o.dead||t>b.end){
          b.snap=true;const c=chest(o);
          if(F.on)K.sparks(c.x,c.y,c.z,{pal:bSteel,n:F.low?2:4,sp:[200,600],up:250,life:[.1,.22]});
          bFlake(c,bSteel);continue;
        }
        const R=((o.d.r||30)+16)*(1.6-.6*ease((t-b.t0)/.08)),z=o.z+o.h*.42,pts=[],m=F.low?8:12;
        for(let j=0;j<=m;j++){const th=j/m*2*pi+t*1.5;pts.push({x:o.x+Math.cos(th)*R,y:o.y+Math.sin(th)*R*FSY,z:z+3*Math.sin(th*3+t*9),w:4.5});}
        rings.push(pts);
      }
      bLines(rings,bSteel,{ink:.5,mid:.8,core:.4,gain:1.1,ulen:120,ord:1});
    });
    pegs.forEach(g=>beat(g.land,()=>{
      X.cine.SND.tick(1.3+.1*g.i,.15);
      if(!F.on)return;
      K.dust(g.p.x,g.p.y,{n:3,r:10,sp:[90,240],a:.42,s:.55,life:.6});
      K.sparks(g.p.x,g.p.y,12,{pal:bSteel,n:3,sp:[150,450],up:320,life:[.08,.2]});
    }));
    beat(TIGHT,()=>{
      let hits=0;
      X.inCircle(q.x,q.y,r,o=>{
        strike(o,d,q,{kb:-1.55,stun:bind,slow:.9});
        if(st.bound.length<10)st.bound.push({e:o,t0:TIGHT,end:TIGHT+bind,snap:false});
        if(hits++<2&&F.on)K.ehit(o,{pal:bSteel,pw:.9,dir:facing(o,q)});
      });
      X.sfx('slash',1.56,.34);
      if(hits){hitstop=Math.max(hitstop,.045);X.cine.shake(.22);}
      if(!F.on){sparks({...q,z:56},frost,ang);return;}
      K.flare(q.x,q.y,200,{pal:bWhite,s:150,dur:.16});
      for(const g of pegs){const m=place(q,g.a+.65,r*.55,0,120);K.sparks(m.x,m.y,m.z,{pal:bSteel,n:F.low?2:4,sp:[200,700],up:300,life:[.1,.25]});}
      K.cool(q.x,q.y,{kind:'crack2',r:Math.round(r*.7),pal:bIris,life:1.3,hot:.4});
      GFX.light(q.x,q.y,r*1.8,bSteel.l,.8,.3,{z:120});
    });
    return true;
  }
  function ricochet(id){
    const first=X.nearest(850);if(!first)return false;
    const d=damage(id),lvl=rank(id),max=2+Math.floor((lvl+1)/2)+(lvl>=5?1:0),visited=new Set(),evo=lvl>=5;
    arm(first);light(chest(first),aSteel);X.sfx('whoosh',1.35,.36);
    // It heats as it bounces: steel, then white, then indigo-violet.
    const heat=[aSteel,aWhite,aIris],hp=i=>heat[Math.min(2,i)];
    const segs=[],corners=[],st={t:0,embed:null,burst:false,hot:0};
    const LIFE=.16+.117*(max-1)+.8;
    // One painter draws the whole chain: straight segments with hard corners, each lingering .5 s and breaking from its start.
    frames(LIFE,t=>{
      st.t=t;
      const lines=[];
      for(const s of segs){
        const to=s.end||chest(s.target),fly=s.end?1:sat((t-s.born)/s.life),age=s.end?t-s.arrive:0;
        const fade=ease((age-.3)/.24);if(fade>=1)continue;
        const P=u=>{const q=mixPoint(s.from,to,u);q.z+=10*Math.sin(pi*u);return q;};
        if(!s.end){
          const q=P(fly),n=Math.min(3,s.i+1);
          for(let j=0;j<=n;j++){
            const v=fly-.09*j;if(v<0)break;
            knife(P(v),P(v-.03),66,t*12+s.i,hp(s.i),j?.42/j:1);
          }
        }
        if(!F.on){strip(P,fade*fly,fly,10,hp(s.i),t,1-fade,1,true);continue;}
        const pts=[],w=17+4*Math.min(3,s.i);
        for(let k=0;k<=4;k++){
          const u=lerp(fade*fly,fly,k/4),q=P(u);
          q.w=w*(1-.6*fade)*Math.min(1,(fly-u)*10+.2);pts.push(q);
        }
        lines.push(pts);
      }
      aLines(lines,hp(st.hot),{ero:.08,ulen:260,ink:.6,mid:.75,core:.2,gain:1.35+.12*st.hot});
      if(!F.on)return;
      const m=aMats();
      for(const c of corners){
        const k=(t-c.born)/.14;if(k>=1||k<0)continue;
        const s=(130+22*c.i)*(1+.6*k);
        F.bill(m.star,c.p.x,c.p.y,c.p.z,s,s,c.rot,{...aCol(hp(c.i)),a:1-k*k,gain:2.4,ero:.12+k*.5});
      }
      const E=st.embed;
      if(E){
        const age=t-E.born,q=chest(E.e);
        if(age<.16&&!E.e.dead){
          const dx=Math.cos(E.ang),dy=Math.sin(E.ang)*FSY,glow=.6+.4*Math.sin(age*60);
          const p={x:q.x-dx*16,y:q.y-dy*16,z:q.z+4};
          knife(p,{x:p.x-dx*10,y:p.y-dy*10,z:p.z},58,0,aWhite,1);
          F.bill(K.mats().glowO,q.x,q.y,q.z,70*glow,70*glow,0,{...aCol(aIris),a:.8,gain:2.4});
        }else if(!st.burst){
          st.burst=true;
          for(let i=0;i<(evo?10:6);i++){
            const a=E.ang+aR(-1.4,1.4),s=aR(420,1100);
            GFX.pt({x:q.x,y:q.y,z:q.z,vx:Math.cos(a)*s,vy:Math.sin(a)*s*FSY,vz:aR(200,700),g:1700,drag:.5,life:aR(.4,.75),
              s:aR(5,9),rot:aR(0,6.3),vr:aR(-16,16),m:11,b:'alpha',c:GFX.rgb(i%2?'#9fb4d2':'#353d52'),c2:'#05060a',fk:4,L:2});
          }
          K.sparks(q.x,q.y,q.z,{pal:aIris,n:F.low?6:14,sp:[500,1500],up:420,life:[.14,.36]});
          K.flare(q.x,q.y,q.z,{pal:aIris,s:evo?210:150,dur:.18});
          if(evo&&!E.e.dead){K.ehit(E.e,{pal:aIris,pw:1.2,dir:E.ang});hitstop=Math.max(hitstop,.05);X.cine.shake(.22);}
        }
      }
    });
    function link(from,target,i){
      visited.add(target);
      const ang=facing(from,target),life=i?.117:.16;
      const seg={from,target,i,born:st.t,life,end:null,arrive:0};
      segs.push(seg);
      beat(life,()=>{
        const at=chest(target);
        const next=i+1<max?nearby(at,580).filter(o=>!visited.has(o)).sort((a,b)=>distance(a,at)-distance(b,at))[0]:null;
        seg.end=at;seg.arrive=st.t;st.hot=i+1;
        corners.push({p:at,born:st.t,i,rot:aR(0,6.3)});
        if(!target.dead){
          strike(target,d*(lvl>=5&&!next?1.58:1),from,{push:90},.55);
          X.sfx('slash',1.35+i*.08,.22);
          if(F.on)K.sparks(at.x,at.y,at.z,{pal:hp(i),n:F.low?4:8,dir:ang,spread:.5,sp:[500,1400],up:260,life:[.12,.3]});
          else sparks(at,hp(i),ang);
        }
        if(next)link(at,next,i+1);
        else{st.embed={e:target,born:st.t,ang};hitstop=Math.max(hitstop,.035);}
      });
    }
    link(hero(),first,0);return true;
  }
  // A black-iron caltrop: three spikes stand it on the floor, the fourth points up. Returns the four spike axes for the glints.
  function bBurr(q,roll,turn,size,a){
    const iron='#2a303c',axes=[];
    for(let i=0;i<4;i++){
      const yaw=turn+i*2*pi/3,tilt=(i===3?0:1.91)+roll;
      const dx=Math.cos(yaw)*Math.sin(tilt),dy=Math.sin(yaw)*Math.sin(tilt),dz=Math.cos(tilt);
      axes.push({dx,dy,dz});
      if(F.on&&F.solids()){
        F.solid('spike',i,q.x,q.y,q.z,{sx:size*.5,sy:size*.44,sz:size,ry:tilt,rz:yaw,
          alb:iron,emis:'#000000',rimC:bSteel.h,rim:1.25,spec:4.2,heat:0,vein:0,bump:.22,tone:.45,a,ord:5});
      }else if(F.on){
        F.ribbon(K.mats().trB,[{...q,w:size*.16},{x:q.x+dx*size,y:q.y+dy*size*FSY,z:q.z+dz*size,w:.01}],{...bCol(bSteel),a,gain:.8,ord:5});
      }else{
        const ex=q.x+dx*size,ey=q.y-q.z+(dy*FSY-dz)*size,w=size*.2;
        fx.save();fx.globalAlpha=a;fx.fillStyle='#3a414e';fx.beginPath();fx.moveTo(q.x-w,q.y-q.z+w*.33);
        fx.lineTo(ex,ey);fx.lineTo(q.x+w,q.y-q.z+w*.33);fx.closePath();fx.fill();
        fx.strokeStyle=bSteel.m;fx.lineWidth=2;fx.beginPath();fx.moveTo(q.x+w*.6,q.y-q.z);fx.lineTo(ex,ey);fx.stroke();fx.restore();
      }
    }
    return axes;
  }
  function caltrop(id){
    const e=X.densest(850,179);if(!e)return false;
    const src=hero(),center=chest(e),ang=facing(src,center),d=damage(id),evo=rank(id)>=5;
    const traps=[place(center,ang,-34,0,0),place(center,ang,99,162,0),place(center,ang,68,-164,0)];
    arm(e);X.sfx('whoosh',.93,.37);light({...center,z:18},bSteel);
    const SIZE=100,REST=SIZE*.33,BOOM=.64,GONE=1.28,st={broke:false,burst:false};
    // Fixed shapes drawn once: the star scar each lands in, and the needles each throws up.
    const T=traps.map((trap,i)=>{
      const lag=.034*i,dir=ang+bR(-.25,.25),slide=bR(22,40);
      return {trap,lag,land:.23+lag,i,turn:ang+i*1.27,rest:{x:trap.x+Math.cos(dir)*slide,y:trap.y+Math.sin(dir)*slide*FSY},
        scar:[0,1,2,3,4].map(j=>({a:j*1.257+bR(-.3,.3)+i,l:bR(60,115)})),
        needles:[...Array(F.low?5:8)].map((_,j)=>({a:j*2*pi/(F.low?5:8)+bR(-.25,.25),e:bR(.85,1.3),l:bR(130,170)}))};
    });
    frames(GONE+.05,t=>{
      if(t>GONE&&!st.broke){
        st.broke=true;
        for(const c of T){const q={...c.rest,z:REST};bChips(q,F.low?3:5);bVapor(q,2);bFlake(q,bSteel);}
      }
      if(st.broke)return;
      if(evo&&t>BOOM+.34&&!st.burst){
        st.burst=true;
        for(const c of T){const q={...c.rest,z:90};bChips(q,F.low?3:6,null,[200,700]);bFlake(q,bSteel);bFlake(q,bIris);}
      }
      const glints=[],scars=[],needles=[];
      for(const c of T){
        if(t<c.lag)continue;
        const u=sat((t-c.lag)/.23);let q,roll,turn;
        if(u<1){
          q=mixPoint(src,{...c.trap,z:REST},u);q.z+=140*Math.sin(pi*u);roll=(1-u)*3.3;turn=c.turn+u*4;
        }else{
          const b=(t-c.land)/.14,k=sat(b);
          q={x:lerp(c.trap.x,c.rest.x,ease(k)),y:lerp(c.trap.y,c.rest.y,ease(k)),z:REST+34*Math.sin(pi*k)};
          roll=.5*(1-k)*Math.sin(b*9);turn=c.turn+4+.6*(1-Math.exp(-b*3));
          if(evo)q.z+=40*Math.sin(pi*sat((t-BOOM)/.16));
          const g=ease((t-c.land)/.08),cool=sat((t-c.land)/.9);
          for(const s of c.scar){
            const a=s.a,L=s.l*g;
            scars.push([{x:c.trap.x,y:c.trap.y,z:0,w:11},{x:c.trap.x+Math.cos(a)*L*.5,y:c.trap.y+Math.sin(a)*L*.5*FSY,z:0,w:8},
              {x:c.trap.x+Math.cos(a)*L,y:c.trap.y+Math.sin(a)*L*FSY,z:0,w:0}]);
          }
          c.cool=cool;
        }
        const axes=bBurr(q,roll,turn,SIZE,1);
        for(const v of axes)glints.push([{x:q.x+v.dx*SIZE*.55,y:q.y+v.dy*SIZE*.55*FSY,z:q.z+v.dz*SIZE*.55,w:3},
          {x:q.x+v.dx*SIZE*.97,y:q.y+v.dy*SIZE*.97*FSY,z:q.z+v.dz*SIZE*.97,w:0}]);
        if(evo&&t>BOOM){
          const k=t-BOOM,rise=1-Math.pow(1-sat(k/.1),3),base={x:q.x,y:q.y,z:18};
          if(k<.36)for(const s of c.needles){
            const L=s.l*rise,ce=Math.cos(s.e),tip={x:base.x+Math.cos(s.a)*ce*L,y:base.y+Math.sin(s.a)*ce*L*FSY,z:base.z+Math.sin(s.e)*L};
            needles.push([{...base,w:8},{...mixPoint(base,tip,.55),w:5},{...tip,w:0}]);
          }
        }
      }
      if(!F.on)return;
      const cool=Math.min(...T.map(c=>c.cool??0));
      bLines(scars,bIris,{layer:'g',ink:.75,mid:.45,core:.12,gain:1.3*(1-.75*cool),ero:.1+.5*sat((t-.95)/.3),ulen:120});
      bLines(glints,bSteel,{ink:0,mid:.9,core:.6,gain:.75+.35*Math.sin(t*7),ulen:80,ord:3});
      if(needles.length){
        const k=t-BOOM;
        bLines(needles,bSteel,{ink:.9,mid:.6,core:.28,gain:1.2-.5*sat((k-.15)/.2),ero:.08+.7*sat((k-.22)/.14),ulen:120,ord:3});
      }
    });
    T.forEach(c=>beat(c.land,()=>{
      X.cine.SND.tick(1.25+.13*c.i,.18);
      if(!F.on){sparks({...c.trap,z:8},bSteel,ang+c.i*2);return;}
      K.sparks(c.trap.x,c.trap.y,14,{pal:bSteel,n:F.low?3:6,sp:[150,520],up:260,life:[.08,.22]});
      K.dust(c.trap.x,c.trap.y,{n:3,r:12,sp:[100,260],a:.42,s:.6,life:.7});
    }));
    const hit=new Set();let first=true;
    function trigger(mult,targets,o={}){
      for(const c of T) X.inCircle(c.trap.x,c.trap.y,129,e=>{
        if(targets.has(e))return;targets.add(e);strike(e,d*mult,c.trap,{kb:.16,slow:2.0,...o},.55);
        if(!F.on)return;
        bVapor({x:e.x,y:e.y,z:14},F.low?1:2,null,[30,110],[16,26]);
        K.sparks(c.rest.x,c.rest.y,REST+30,{pal:bSteel,n:3,sp:[200,600],up:300,life:[.08,.2]});
        if(first){first=false;K.ehit(e,{pal:bSteel,pw:.8});hitstop=Math.max(hitstop,.04);X.cine.shake(.12);}
      });
    }
    for(const t of [.31,.41,.53,.64])beat(t,()=>trigger(1,hit));
    if(evo)beat(BOOM,()=>{
      trigger(.60,new Set(),{push:120,up:600});
      X.sfx('slash',1.7,.4);hitstop=Math.max(hitstop,.05);X.cine.shake(.25);
      if(!F.on)return;
      for(const c of T){K.flare(c.rest.x,c.rest.y,70,{pal:bWhite,s:150,dur:.14});K.sparks(c.rest.x,c.rest.y,40,{pal:bSteel,n:F.low?4:8,sp:[400,1100],up:700,life:[.12,.3]});}
      GFX.light(center.x,center.y,420,bSteel.l,.8,.3,{z:80});
    });
    return true;
  }
  function warrant(id){
    const src=hero(),candidates=nearby(src,1050);
    candidates.sort((a,b)=>a.hp/a.max-b.hp/b.max||distance(src,a)-distance(src,b));
    const e=candidates[0];if(!e)return false;
    const d=damage(id),evo=rank(id)>=5,ang=facing(src,e);
    const doom=evo&&!e.d.boss&&1-e.hp/e.max>=.82,len=doom?400:330,HIT=.37;
    arm(e);X.sfx('whoosh',.72,.43);light(chest(e),aIris,350);
    const st={x:e.x,y:e.y,broke:false,shed:0};
    // The cooled blade falls apart from its point: steel splinters, black vapour along its height, embers.
    function shatter(){
      st.broke=true;
      if(!F.on)return;
      if(window.AssassinMist?.splinters)AssassinMist.splinters(st.x,st.y,len*.9,ang,1.3,aSteel);
      for(let i=0;i<(F.low?4:8);i++){
        const z=len*(.1+i*.26)+aR(-30,30);
        GFX.pt({x:st.x+aR(-45,45),y:st.y+aR(-12,12),z,vx:aR(-170,170),vy:aR(-50,50),vz:aR(40,220),g:-25,drag:2.2,life:aR(.6,1),
          s:aR(34,58),grow:aR(50,100),m:5,b:'alpha',c:[.03,.03,.07],c2:'#000000',c3:'#2b2540',er:.9,ns:aR(.9,1.5),w:1,a:.6,L:2});
        aFlake({x:st.x,y:st.y,z},aIris);
      }
    }
    // The only vertical drop in the kit: four points close on the head, then a giant dagger falls from the sky.
    frames(1.26,t=>{
      if(t<HIT){st.x=e.x;st.y=e.y;}
      if(t<.44){
        const c=ease(t/.2),a=Math.min(1,t*20)*(1-sat((t-.32)/.12)),top={x:st.x,y:st.y,z:e.z+e.h+52};
        for(let i=0;i<4;i++){
          const b=i*pi/2+pi/4+t*2.4,r=lerp(175,40,c),q={x:top.x+Math.cos(b)*r,y:top.y+Math.sin(b)*r*FSY,z:top.z+r*.22};
          knife(q,{x:q.x+Math.cos(b)*10,y:q.y+Math.sin(b)*10*FSY,z:q.z+2},58,0,aIris,a);
        }
        const s=lerp(280,110,c),cross=(dx,dy)=>[{x:st.x-dx*s,y:st.y-dy*s*FSY,z:3,w:0},{x:st.x,y:st.y,z:3,w:24},{x:st.x+dx*s,y:st.y+dy*s*FSY,z:3,w:0}];
        aLines([cross(.71,.71),cross(.71,-.71)],aIris,{a,ink:.7,mid:.5,core:.16,ulen:220,gain:1.3});
      }
      if(t<.2||st.broke)return;
      const f=sat((t-.2)/(HIT-.2)),after_=t-HIT;
      const quiver=after_>0?Math.sin(after_*70)*Math.exp(-after_*9)*9:0;
      const tipZ=after_<0?lerp(950,-8,Math.pow(f,1.7)):-8,origin={x:st.x+quiver,y:st.y+3,z:tipZ+len*1.14};
      const k=sat(after_/.62),H=after_>0?K.heat(aIris,k*.9):null;
      const tint=after_<0?{m:'#6f86a8'}:{m:k<.06?'#ffffff':aHex(H.cM)};
      if(after_>.56&&!st.broke)shatter();
      if(after_>.63)return;
      knife(origin,{x:origin.x,y:origin.y,z:origin.z+10},len,0,tint,1-sat((after_-.56)/.07));
      if(!F.on)return;
      const S=K.mats();
      if(after_<0){
        const r=lerp(240,80,f);
        F.quad(S.dark,st.x,st.y,r,r*.8,0,{a:.2+.55*f});
        aLines([[{x:origin.x,y:origin.y,z:origin.z+len*1.05,w:16},{x:origin.x,y:origin.y,z:origin.z+len*1.05+520*f,w:0}]],aSteel,{a:.8,ink:.5,ulen:300});
        return;
      }
      const edge=[{x:origin.x,y:origin.y,z:tipZ+8},{x:origin.x,y:origin.y,z:tipZ+len*1.06}];
      // A halo wider than the blade, under it: white-hot, then indigo, then dark steel as it cools.
      const gw=(doom?230:190)*(1-.4*k),HC=k<.25?{cA:aIris.b,cB:aIris.m,cM:aIris.h,cC:'#ffffff'}:{cA:aIris.d,cB:aIris.b,cM:aIris.m,cC:aIris.h};
      F.bill(S.glowO,origin.x,origin.y,tipZ+len*.55,gw,len*1.05,0,{...HC,a:Math.pow(1-k,1.3),gain:3.4*(doom?1.3:1)});
      F.bill(S.glowO,origin.x,origin.y,tipZ+len*.1,gw*1.3,gw*.55,0,{...HC,a:Math.pow(1-k,1.5),gain:3.6});
      // .78 s on: cracks run up the blade from its point before it falls apart.
      const cr=sat((after_-.41)/.18);
      if(cr>0){
        const pts=[],n=7;
        for(let i=0;i<=n;i++){const v=i/n;if(v>cr)break;pts.push({x:origin.x+(i%2?16:-16)*(.4+v),y:origin.y,z:tipZ+20+v*len*.95,w:i?11:0});}
        if(pts.length>1){
          F.ribbon(aMats().mist,pts.map(q=>({...q,w:q.w*1.4})),{a:1,ulen:120,ord:9});
          F.ribbon(S.trB,pts.map(q=>({...q,w:q.w*.5})),{...aCol(aIris),a:1,gain:3.4,ulen:120,ord:10});
        }
      }
    });
    beat(HIT,()=>{
      hitstop=Math.max(hitstop,.07);X.cine.shake(.4);X.sfx('slash',.74,.56);
      if(F.on){
        K.cool(st.x,st.y,{kind:'crack',r:200,pal:aIris,life:1.5,hot:.5});
        K.dust(st.x,st.y,{n:F.low?5:10,r:40,sp:[260,640],a:.45,s:.85,life:1});
        K.sparks(st.x,st.y,30,{pal:aWhite,n:F.low?7:15,sp:[300,1000],up:900,life:[.15,.4]});
        K.flare(st.x,st.y,60,{pal:aWhite,s:230,dur:.16});
        GFX.light(st.x,st.y,420,aIris.l,.7,.3,{z:60});
        for(let i=0;i<(F.low?5:10);i++){
          const a=aR(0,6.3),s=aR(250,700);
          GFX.pt({x:st.x,y:st.y,z:6,vx:Math.cos(a)*s,vy:Math.sin(a)*s*FSY,vz:aR(300,800),g:1900,drag:.4,life:aR(.5,.9),
            s:aR(5,10),rot:aR(0,6.3),vr:aR(-12,12),m:11,b:'alpha',c:GFX.rgb(i%3?'#3a3540':'#6d6676'),c2:'#05060a',fk:4,L:2});
        }
      }
      if(e.dead)return;
      const weakness=1-e.hp/e.max;
      let power=d*(1+weakness*.86)*(evo&&e.d.boss?1.32:1);
      if(evo&&!e.d.boss&&weakness>=.82)power=Math.max(power,e.hp*1.12);
      if(F.on)K.ehit(e,{pal:aIris,pw:1.5,dir:-pi/2});
      if(doom&&F.on){
        const q=chest(e);
        for(let i=0;i<14;i++){
          const z=e.z+e.h*i/13,a=aR(0,6.3);
          GFX.pt({x:q.x+aR(-18,18),y:q.y+aR(-6,6),z,vx:Math.cos(a)*aR(40,160),vy:Math.sin(a)*aR(20,70),vz:aR(120,300),g:-30,drag:1.6,
            life:aR(.7,1.2),s:aR(22,40),grow:aR(60,110),m:5,b:'alpha',c:[.03,.02,.06],c2:'#000000',c3:'#3a2a55',er:.9,ns:aR(.9,1.5),w:1,a:.7,L:2});
        }
      }
      strike(e,power,src,{crit:true,kb:.25});
    });
    return true;
  }
  // One wing of the cut: a broad black-mist band with a steel blade on its outer edge and a thinner second edge inside.
  //  feather: the head end splits into three quills. Daggers ride the head while it swings.
  function bWing(path,src,{w,p,swing=.165,hold=.18,fade=.34,delay=0,feather=0}){
    const life=swing+hold+fade;
    const go=()=>frames(life,t=>{
      const head=1-Math.pow(1-sat(t/swing),2.2),f=ease((t-swing-hold)/fade),tail=Math.min(head-.01,.85*f);
      if(head<=.02)return;
      if(!F.on){strip(path,tail,head,w*.5,p,t,1-f);return;}
      const n=F.low?12:22,body=[];
      for(let i=0;i<=n;i++){
        const k=i/n,q=path(lerp(tail,head,k));
        q.w=w*Math.pow(Math.sin(pi*(.04+.92*k)),.55)*(.35+.65*k)*(1-.35*f);body.push(q);
      }
      const a=1-f*f*f;
      bLines([body],p,{a,ink:.9,mid:.5,core:0,ero:.1+.5*f,ulen:420,t0:t*.5,gain:.85});
      // Which way is out (away from the hero on the screen) decides the side of the main edge.
      const m=n>>1,probe=bShift(body.slice(m-1,m+2),()=>10)[1],sy=v=>v.y-v.z;
      const out=Math.hypot(probe.x-src.x,sy(probe)-sy(src))>Math.hypot(body[m].x-src.x,sy(body[m])-sy(src))?1:-1;
      const edges=[bShift(body,i=>out*body[i].w*.6).map(q=>({...q,w:q.w*.17})),bShift(body,i=>-out*body[i].w*.15).map(q=>({...q,w:q.w*.07}))];
      if(feather&&head>.7){
        const i0=Math.floor(n*.6),part=body.slice(i0);
        for(const s of [-1,1])edges.push(bShift(part,i=>s*Math.pow(i/(part.length-1),1.5)*w*1.15).map((q,i)=>({...q,w:part[i].w*.13*(1-.6*i/(part.length-1))})));
      }
      bLines(edges,bSteel,{a:1-f*f,ink:0,mid:.95,core:.55,ero:.1+.55*f,ulen:300,gain:1.2,ord:2});
      if(t<swing+.06){
        const fa=1-sat((t-swing)/.06);
        for(let j=0;j<3;j++){const v=head-.07*j;if(v<.03)break;knife(path(v),path(v-.03),76,t*16+j,j?bIris:bSteel,fa*[1,.55,.3][j]);}
      }
    });
    if(delay)beat(delay,go);else go();
  }
  function crescent(id){
    const enemy=X.nearest(565);if(!enemy)return false;
    const src=hero(),ang=facing(src,enemy),r=Math.min(452,Math.max(149,distance(src,enemy))),d=damage(id),evo=rank(id)>=5;
    arm(enemy);light(chest(enemy),bSteel,r*1.15);X.sfx('slash',.91,.54);
    for(let i=0;i<2;i++){
      const side=i?1:-1,delay=i*.22,p=i?bIris:bSteel;
      // The first wing sweeps low over the floor; the second rises from the other side.
      const path=u=>{
        const a=ang+side*(u-.52)*(i&&evo?3.48:2.78);
        const span=r*(.89+.18*Math.sin(pi*u))+(i&&evo?35:0);
        return place(src,a,span,0,i?40+u*180+28*Math.sin(pi*u):34+Math.sin(pi*u)*24);
      };
      bWing(path,src,{w:i?74:66,p,delay,feather:i});
      const swing=()=>{
        if(i)X.sfx('slash',1.43,.45);
        let first=true;
        sweepDamage(path,0,1,.165,i&&evo?101:75,(e,q)=>{
          strike(e,d,src,{kb:.17,push:110,launch:i&&evo?660:0});
          if(first){
            first=false;hitstop=Math.max(hitstop,.045);X.cine.shake(.18);
            if(F.on)K.ehit(e,{pal:p,pw:i&&evo?1.2:.9,dir:facing(src,e)});else sparks(q,p,ang+side*.75);
          }else bVapor(chest(e),1,facing(src,e));
        });
        if(i||!F.on)return;
        // The low wing scrapes the floor: dust along it and two cooling scratches.
        beat(.09,()=>{
          for(const u of [.2,.5,.8]){const q=path(u);K.dust(q.x,q.y,{n:2,r:10,sp:[150,420],a:.42,s:.75,life:.9});}
          for(const [a,b] of [[.14,.46],[.54,.88]]){const A=path(a),B=path(b);K.coolLine(A.x,A.y,B.x,B.y,{w:20,pal:bSteel,life:1.1,hot:.3,grow:.08});}
        });
      };
      if(delay)beat(delay,swing);else swing();
    }
    return true;
  }
  const skills={as_fan:{fn:fan},as_return:{fn:returning},as_step:{fn:shadowStep,moves:true},
    as_snare:{fn:snare},as_ricochet:{fn:ricochet},as_caltrop:{fn:caltrop},as_warrant:{fn:warrant},as_crescent:{fn:crescent}};
  window.AssassinSkills={sk,skills};
})();

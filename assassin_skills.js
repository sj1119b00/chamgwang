// Automatic assassin skills. Positions share the arena floor; z is height above it.
'use strict';
(() => {
  const X=RPG.sv, {A,V,BODY,FSY}=X, F=FX3, K=K3, pi=Math.PI;
  const frost={d:'#071422',b:'#218fab',m:'#a4edff',h:'#efffff',l:'#83dbea',s:'#c9efff'};
  const orchid={d:'#190c26',b:'#9142b3',m:'#e0a6fa',h:'#fff0ff',l:'#bf80e5',s:'#e3bdf5'};
  const amber={d:'#24140f',b:'#a76538',m:'#ffd28b',h:'#fff3d3',l:'#e8aa64',s:'#ffe5a5'};
  const blood={d:'#230d1c',b:'#aa4169',m:'#ff9eae',h:'#fff2ed',l:'#e5718d',s:'#ffd0c3'};
  const sk={};
  function define(id,name,lv,cd,dmg,desc,evo){
    sk[id]={cls:'assassin',type:'skill',name,lv,cd,dmg,desc,evo};
  }
  define('as_fan','비연도',1,3.7,1750,'부채꼴로 단검 세 자루를 던져 앞을 관통한다.','서로 다른 칼날이 한 적을 꿰면 추가 피해를 준다.');
  define('as_return','회귀인',1,5.5,1720,'휘어진 궤도로 단검을 던진다. 단검은 돌아오는 길에 한 번 더 벤다.','돌아오는 검이 더 강하게 베며 적을 끌어당긴다.');
  define('as_step','그늘밟기',2,6.4,2650,'적을 가로질러 짧게 돌진하며 지난 자리를 벤다.','도착한 곳에 반대 방향으로 교차 베기를 낸다.');
  define('as_snare','은사매듭',3,8.5,2200,'적 무리의 발밑에 은실을 둘러 조이고 잠시 속박한다.','매듭의 범위와 속박 시간이 늘어난다.');
  define('as_ricochet','연쇄비도',5,6.9,1690,'단검 한 자루가 가까운 다른 적에게 연속으로 튄다. 강화하면 경유하는 적이 늘어난다.','한 번 더 튀며 마지막 타격이 강해진다.');
  define('as_caltrop','야철마름쇠',6,8.2,2380,'적 무리에 마름쇠 세 개를 흩뿌린다. 밟은 적은 피해를 받고 느려진다.','가시가 뽑혀 올라오며 두 번째 피해를 준다.');
  define('as_warrant','사망선고',8,9,3650,'근처에서 남은 체력 비율이 가장 낮은 적을 낙인찍고 위에서 찌른다. 잃은 체력에 따라 피해가 커진다.','체력이 18% 이하인 일반 적은 처형한다. 보스에게는 추가 피해를 준다.');
  define('as_crescent','삭월무',10,10.5,2320,'몸 앞에 고도가 다른 두 초승달을 그려, 각 칼끝에 닿은 적을 벤다.','마지막 초승달의 범위가 넓어지고 맞은 적을 띄운다.');

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
  function fan(id){
    const enemy=X.nearest(910);if(!enemy)return false;
    const src=hero(),ang=facing(src,enemy),len=880+rank(id)*28,d=damage(id);
    arm(enemy);X.sfx('whoosh',1.52,.36);light(place(src,ang,260),frost);
    const struck=new Set(),evo=rank(id)>=5;
    for(let n=-1;n<=1;n++){
      const path=u=>place(src,ang+n*.35,len*u,n*38*Math.sin(pi*u),lerp(src.z,enemy.h*.48,u)+36*Math.sin(pi*u));
      throwKnife(path,.40,n?frost:orchid,n?55:63,{roll:n*1.7,tail:.42,width:n?26:35});
      sweepDamage(path,0,1,.40,34,(e,q)=>{
        if(!struck.has(e)||evo){
          strike(e,d*(struck.has(e)?.47:1),src);if(struck.size<2)sparks(q,frost,ang);
        }
        struck.add(e);
      });
    }
    return true;
  }
  function returning(id){
    const e=X.nearest(910);if(!e)return false;
    const src=hero(),ang=facing(src,e),reach=Math.min(1050,distance(src,e)+123);
    const end=place(src,ang,reach,0,e.z+e.h*.48),d=damage(id),evo=rank(id)>=5;
    arm(e);X.sfx('whoosh',.90,.44);light(end,orchid);
    const path=u=>{
      const back=u>.48,k=back?(u-.48)/.52:u/.48;
      const q=back?mixPoint(end,hero(),ease(k)):mixPoint(src,end,1-(1-k)**1.36);
      return place(q,ang,0,(back?-1:1)*Math.sin(pi*k)*Math.min(reach*.24,139),q.z+Math.sin(pi*k)*(back?34:103));
    };
    frames(.71,t=>{
      const u=sat(t/.68),back=u>.48,q=path(u);
      const fade=Math.min(1,u*17,(.71-t)/.075);
      // At the turnaround the high outward edge hangs in the air while
      // the lower returning edge draws the second arm of the hook back.
      const outHead=Math.min(.48,u),outFade=1-ease((u-.57)/.39);
      strip(path,Math.max(0,outHead-.38),outHead,34,orchid,t,fade*outFade,1,true);
      if(back)strip(path,Math.max(.48,u-.35),u,39,frost,t,fade,-1,true);
      if(u<1)knife(q,path(Math.max(0,u-.016)),66,.6+u*7.3,back?frost:orchid,fade);
    });
    sweepDamage(path,0,.48,.68,68,(o,q)=>strike(o,d,src));
    let glints=0;
    sweepDamage(path,.48,1,.68,76,(o,q)=>{
      strike(o,d*(evo?1.42:1),src,{kb:evo?-1.05:.08});
      if(glints++<2)sparks(q,orchid,ang+pi);
    });
    beat(.32,()=>X.sfx('slash',1.65,.29));
    return true;
  }
  function shadowStep(id){
    const e=X.nearest(690);if(!e||V.steer)return false;
    const src=hero(),ang=facing(src,e),reach=Math.min(750,distance(src,e)+114),end=place(src,ang,reach);
    const evo=rank(id)>=5,d=damage(id);arm(e);X.sfx('whoosh',1.24,.51);
    V.dash={x0:src.x,y0:src.y,x1:end.x,y1:end.y,t:0,dur:.14,soft:true};
    RPG.inv=Math.max(RPG.inv,.17);
    if(window.MK?.on()){
      beat(.022,()=>MK.ghost({c:'#b397de',a:.73,life:.23}));
      beat(.075,()=>{if(V.dash) MK.ghost({c:'#8eb4cc',a:.56,life:.17});});
    }
    const wake=u=>place(src,ang,reach*u,Math.sin(pi*u)*53,lerp(src.z*.32,src.z*1.25,u));
    slash(wake,orchid,66,.47);light(end,orchid);
    const slit=u=>place(src,ang,reach*u,-22*Math.sin(pi*u),3+7*u);
    slash(slit,frost,27,.48,.055);
    beat(.14,()=>{
      const q=hero();
      X.inLine(src.x,src.y,q.x,q.y,93,o=>strike(o,d,src));
      sparks(q,orchid,ang+pi);
      if(!evo)return;
      const cross=u=>place(q,ang,lerp(-210,87,u),lerp(-165,153,u),29+180*u);
      slash(cross,frost,48,.34);
      sweepDamage(cross,0,1,.12,67,o=>strike(o,d*.74,src));
    });
    return true;
  }
  function snare(id){
    const e=X.densest(870,235);if(!e)return false;
    const q=chest(e),ang=facing(hero(),q),evo=rank(id)>=5,r=evo?311:225,d=damage(id);
    arm(e);X.sfx('whoosh',.81,.41);light({...q,z:22},frost,r*1.6);
    frames(.69,t=>{
      const close=ease((t-.14)/.24),fade=1-ease((t-.42)/.27),head=sat(t/.16);
      for(let i=0;i<2;i++){
        const thread=u=>{
          const angle=ang+(i?1:-1)*(.39+u*5.81)+i*pi;
          const rr=r*(1-.72*close)*(.88+.12*Math.sin(pi*u));
          return place(q,angle,rr,0,9+u*(49+98*close)+20*Math.sin(2*pi*u+t*8));
        };
        strip(thread,0,head,i?21:29,i?orchid:frost,t,fade,i?1:-1);
      }
    });
    beat(.31,()=>{
      X.inCircle(q.x,q.y,r,o=>strike(o,d,q,{kb:-1.55,stun:evo?1.18:.76,slow:.9}));
      sparks({...q,z:56},frost,ang);X.sfx('slash',1.56,.34);
    });
    return true;
  }
  function ricochet(id){
    const first=X.nearest(850);if(!first)return false;
    const d=damage(id),lvl=rank(id),max=2+Math.floor((lvl+1)/2)+(lvl>=5?1:0),visited=new Set();
    arm(first);light(chest(first),amber);X.sfx('whoosh',1.35,.36);
    function link(from,target,i){
      visited.add(target);
      const side=i%2?1:-1,ang=facing(from,target),life=i?.117:.16;
      const bow=Math.min(100,60+distance(from,target)*.12),sideBend=i?47:37;
      const path=u=>{
        const q=mixPoint(from,chest(target),u);
        return place(q,ang,0,side*sideBend*Math.sin(pi*u),q.z+Math.sin(pi*u)*bow);
      };
      throwKnife(path,life,amber,57,{roll:i*.87,width:27,tail:.73});
      beat(life,()=>{
        const at=chest(target);
        const next=i+1<max?nearby(at,580).filter(o=>!visited.has(o)).sort((a,b)=>distance(a,at)-distance(b,at))[0]:null;
        if(!target.dead){
          strike(target,d*(lvl>=5&&!next?1.58:1),from,{},.55);sparks(at,amber,ang);
          X.sfx('slash',1.35+i*.08,.22);
        }
        // A broken amber corner persists through the following bounce.
        const chord=u=>{const q=mixPoint(from,at,u);return place(q,ang,0,side*sideBend*Math.sin(pi*u),q.z+Math.sin(pi*u)*bow);};
        frames(.23,t=>strip(chord,.23+ease(t/.23)*.60,1,21,amber,t,1-ease(t/.23),side,true));
        if(next)link(at,next,i+1);
      });
    }
    link(hero(),first,0);return true;
  }
  // Three tines support the fourth. Each socket and its point rotate together in flight.
  function burr(q,roll,turn,size,a){
    const steel='#79889c',p=frost;
    for(let i=0;i<4;i++){
      const yaw=turn+i*2*pi/3,tilt=(i===3?0:1.91)+roll;
      const dx=Math.cos(yaw)*Math.sin(tilt),dy=Math.sin(yaw)*Math.sin(tilt),dz=Math.cos(tilt);
      if(F.on&&F.solids()){
        F.solid('spike',i,q.x,q.y,q.z,{sx:size*.68,sy:size*.60,sz:size,ry:tilt,rz:yaw,
          alb:steel,emis:amber.m,rimC:p.h,rim:1.0,spec:3.1,heat:.25,vein:.24,bump:.10,tone:.38,a,ord:5});
        if(i===3||dy>.26){
          const ridge=[.22,.54,.94].map((k,j)=>({x:q.x+dx*size*k,y:q.y+dy*FSY*size*k,
            z:q.z+dz*size*k,w:j===1?size*.075:.35}));
          F.ribbon(K.mats().trC,ridge,{cA:p.d,cB:steel,cM:p.m,cC:p.h,gain:2.7,a:a*.83,ord:6});
        }
      }else if(F.on){
        const pts=[{...q,w:size*.18},{x:q.x+dx*size,y:q.y+dy*size*FSY,z:q.z+dz*size,w:.01}];
        F.ribbon(K.mats().trC,pts,{cA:p.d,cB:steel,cM:p.m,cC:p.h,a,ord:5});
      }else{
        const ex=q.x+dx*size,ey=q.y-q.z+(dy*FSY-dz)*size,w=size*.23;
        fx.save();fx.globalAlpha=a;fx.fillStyle=steel;fx.beginPath();fx.moveTo(q.x-w,q.y-q.z+w*.33);
        fx.lineTo(ex,ey);fx.lineTo(q.x+w,q.y-q.z+w*.33);fx.closePath();fx.fill();
        fx.strokeStyle=p.m;fx.lineWidth=2.7;fx.beginPath();fx.moveTo(q.x+w*.65,q.y-q.z);fx.lineTo(ex,ey);fx.stroke();fx.restore();
      }
    }
  }
  function caltrop(id){
    const e=X.densest(850,179);if(!e)return false;
    const src=hero(),center=chest(e),ang=facing(src,center),d=damage(id),evo=rank(id)>=5;
    const traps=[place(center,ang,-34,0,0),place(center,ang,99,162,0),place(center,ang,68,-164,0)];
    arm(e);X.sfx('whoosh',.93,.37);light({...center,z:18},frost);
    traps.forEach((trap,i)=>{
      const lag=.034*i,land=.23+lag;
      frames(.76,t=>{
        const u=sat((t-lag)/.23);if(t<lag)return;
        const q=mixPoint(src,trap,u),recoil=evo?Math.sin(pi*sat((t-.55)/.17))*59:0;
        q.z+=127*Math.sin(pi*u)+19+recoil;
        burr(q,(1-u)*3.3,ang+i*1.27+u*1.6,81,1-ease((t-.65)/.11));
      });
      beat(land,()=>{sparks({...trap,z:8},frost,ang+i*2);X.cine.SND.tick(1.25+.13*i,.18);});
    });
    const hit=new Set();
    function trigger(mult,targets){
      for(const q of traps) X.inCircle(q.x,q.y,129,o=>{
        if(targets.has(o))return;targets.add(o);strike(o,d*mult,q,{kb:.16,slow:2.0},.55);
      });
    }
    for(const t of [.31,.41,.53,.64])beat(t,()=>trigger(1,hit));
    if(evo)beat(.64,()=>trigger(.60,new Set()));
    return true;
  }
  function warrant(id){
    const src=hero(),candidates=nearby(src,1050);
    candidates.sort((a,b)=>a.hp/a.max-b.hp/b.max||distance(src,a)-distance(src,b));
    const e=candidates[0];if(!e)return false;
    const d=damage(id),evo=rank(id)>=5,ang=facing(src,e);
    arm(e);X.sfx('whoosh',.72,.43);light(chest(e),blood,350);
    frames(.64,t=>{
      const q=chest(e),u=sat(t/.37),clasp=ease((u-.52)/.48),split=ease((t-.37)/.23);
      for(const side of [-1,1]){
        const seal=v=>{const fold=1-Math.abs(2*v-1);return {
          x:q.x+side*((128-53*clasp)*fold+split*75)+(v-.5)*34,
          y:q.y+side*(18+split*12)*fold,
          z:q.z+46+(v-.5)*213+side*split*32};};
        strip(seal,0,sat(t/.12),28,blood,t,1-ease((t-.44)/.20),side);
      }
    });
    const path=u=>{const q=chest(e);return place(q,ang,lerp(-85,26,u),0,q.z+lerp(288,-67,u));};
    beat(.22,()=>throwKnife(path,.19,amber,66,{width:33,tail:.88,roll:.76}));
    beat(.37,()=>{
      if(e.dead)return;
      const weakness=1-e.hp/e.max;
      let power=d*(1+weakness*.86)*(evo&&e.d.boss?1.32:1);
      if(evo&&!e.d.boss&&weakness>=.82)power=Math.max(power,e.hp*1.12);
      strike(e,power,src,{crit:true,kb:.25});sparks(chest(e),amber,ang);X.sfx('slash',.74,.56);
    });
    return true;
  }
  function crescent(id){
    const enemy=X.nearest(565);if(!enemy)return false;
    const src=hero(),ang=facing(src,enemy),r=Math.min(452,Math.max(149,distance(src,enemy))),d=damage(id),evo=rank(id)>=5;
    arm(enemy);light(chest(enemy),orchid,r*1.15);X.sfx('slash',.91,.54);
    for(let i=0;i<2;i++){
      const side=i?1:-1,delay=i*.22,p=i?frost:orchid;
      const path=u=>{
        const a=ang+side*(u-.52)*(i&&evo?3.48:2.78);
        const span=r*(.89+.18*Math.sin(pi*u))+(i&&evo?35:0);
        return place(src,a,span,0,i?28+u*185+28*Math.sin(pi*u):92+Math.sin(pi*u)*47);
      };
      slash(path,p,i?82:72,.46,delay);
      const swing=()=>{
        if(i)X.sfx('slash',1.43,.45);
        let glints=0;
        sweepDamage(path,0,1,.165,i&&evo?101:75,(e,q)=>{
          strike(e,d,src,{kb:.17,launch:i&&evo?660:0});
          if(glints++<2)sparks(q,p,ang+side*.75);
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

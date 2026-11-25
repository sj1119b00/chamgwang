// 천라지망 — a shadow spider on dagger legs pins the whole field, spins a steel web over it and draws it shut.
'use strict';
(() => {
  const X=RPG.sv,K=K3,F=FX3,FSY=X.FSY,pi=Math.PI;
  const steel={d:'#090e26',b:'#5087b4',m:'#abdcf0',h:'#f2fcff',l:'#87c3ea',s:'#d9f6ff'};
  const iris={d:'#130727',b:'#7140be',m:'#e093fb',h:'#fbe8ff',l:'#bb7ce3',s:'#f4beff'};
  const dusk={d:'#0b0a1c',b:'#3b3f6c',m:'#7f89b8',h:'#e6ecff',l:'#7d86c8',s:'#cfd6ff'};
  const rock={d:'#060509',b:'#1e1c27',m:'#3d3a4d',h:'#9a96b4',l:'#4b4760',s:'#8a86a2'};
  const legA={m:'#7a88ad'},legB={m:'#8f9cbe'},legC={m:'#555e84'};
  const gold={d:'#261021',b:'#ae613d',m:'#ffcd8c',h:'#fff7db',l:'#edb179',s:'#ffe1a4'};
  const sat=n=>Math.max(0,Math.min(1,n));
  const mix=(a,b,u)=>a+(b-a)*u;
  const ease=u=>{u=sat(u);return u*u*(3-2*u);};
  const outE=u=>1-(1-sat(u))**3;
  const hash=i=>{const s=Math.sin(i*12.9898+4.13)*43758.5453;return s-Math.floor(s);};
  const lerp3=(a,b,u)=>({x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:mix(a.z,b.z,u)});
  // Steel wire. gilt 0 = cold steel, 1 = violet-indigo. The shadow pass lays the same strip on the floor.
  const vertex=`attribute vec3 point,tangent;attribute vec2 sideArc;attribute vec4 ink;
    uniform vec4 camera;uniform vec2 screen;uniform mediump float shadow;
    varying vec4 coat;varying vec3 wire;
    void main(){
      vec2 p=vec2(point.x,point.y-point.z);
      vec2 d=vec2(tangent.x,tangent.y-tangent.z);
      if(shadow>.5){p=point.xy+vec2(.25,.14)*point.z;d=tangent.xy+vec2(.25,.14)*tangent.z;}
      d/=max(.01,length(d));p+=vec2(-d.y,d.x)*sideArc.x*ink.w;
      p=(p+camera.xy)*camera.z;float c=cos(camera.w),s=sin(camera.w);
      gl_Position=vec4((p.x*c-p.y*s)/screen.x,-(p.x*s+p.y*c)/screen.y,0.,1.);
      wire=vec3(sideArc,point.z);coat=vec4(ink.xyz,atan(tangent.z,length(tangent.xy)));
    }`;
  const fragment=`precision mediump float;
    uniform float shadow,clock;varying vec3 wire;varying vec4 coat;
    void main(){
      float v=wire.x,u=wire.y,h=coat.x,a=coat.y,gilt=coat.z;
      if(shadow>.5){float opacity=a*.42*(1.-smoothstep(.0,1.85,abs(v)))/(1.+wire.z*.006);
        gl_FragColor=vec4(vec3(.02,.016,.03)*opacity,opacity);return;}
      float x=clamp(v,-1.,1.), roundness=sqrt(max(0.,1.-x*x));
      float twist=u*.105+1.9*coat.w;
      float braid=cos(twist+atan(x,max(.01,roundness))*3.);
      float steelLight=.15+.46*roundness+.16*braid+.13*sin(u*.016+coat.w);
      vec3 metal=mix(vec3(.21,.31,.42),vec3(.33,.22,.52),gilt)*steelLight;
      float bevel=exp(-abs(x+.32+.21*sin(twist*.18))*8.5);
      metal+=vec3(.45,.55,.68)*bevel*(.26+.74*pow(.5+.5*cos(twist*.34-clock*2.),3.));
      float groove=smoothstep(-.93,-.37,braid);
      vec3 glow=mix(vec3(.56,.80,.98),vec3(.78,.48,1.),gilt);
      vec3 c=metal*(.51+.49*groove)+glow*h*(.20+.61*groove);
      c+=vec3(.95,.93,1.)*h*h*bevel*(.37+.62*roundness);
      float body=1.-smoothstep(.59,1.05,abs(v));
      float bloom=(1.-smoothstep(.60,1.92,abs(v)))*h*.32;
      float opacity=a*max(body,bloom);gl_FragColor=vec4(mix(glow,c,body)*opacity,opacity);
    }`;
  let gpu,failed=false;
  function program(){
    if(gpu||failed||!F.on)return gpu;
    const pg=gl.createProgram(),shaders=[];
    try{
      for(const [kind,src] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
        const sh=gl.createShader(kind);shaders.push(sh);gl.shaderSource(sh,src);gl.compileShader(sh);
        if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));gl.attachShader(pg,sh);
      }
      ['point','tangent','sideArc','ink'].forEach((name,i)=>gl.bindAttribLocation(pg,i,name));gl.linkProgram(pg);
      if(!gl.getProgramParameter(pg,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pg));
      gpu={pg,buffer:gl.createBuffer()};
      for(const name of ['camera','screen','shadow','clock'])gpu[name]=gl.getUniformLocation(pg,name);
    }catch(e){failed=true;gl.deleteProgram(pg);console.warn('Assassin wire mesh',e);}
    finally{for(const sh of shaders)gl.deleteShader(sh);}
    return gpu;
  }
  function paint(q){
    const {data,n}=q.mesh;
    gl.useProgram(gpu.pg);gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,data.subarray(0,n),gl.DYNAMIC_DRAW);
    let offset=0;
    for(const [i,size] of [3,3,2,4].entries()){
      gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,48,offset);offset+=size*4;
    }
    gl.uniform4f(gpu.camera,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot);gl.uniform2f(gpu.screen,W*.5,H*.5);
    gl.uniform1f(gpu.shadow,q.shadow);gl.uniform1f(gpu.clock,q.t);gl.drawArrays(gl.TRIANGLE_STRIP,0,n/12);F.stats.draws++;
  }
  function strand(mesh,pts,gilt){
    if(pts.length<2||mesh.n+(pts.length*2+4)*12>mesh.data.length)return;
    let length=0;
    const join=mesh.n;
    if(join){mesh.data.copyWithin(join,join-12,join);mesh.n+=24;}
    for(let j=0;j<pts.length;j++){
      const a=pts[Math.max(0,j-1)],p=pts[j],b=pts[Math.min(j+1,pts.length-1)];
      length+=Math.hypot(p.x-a.x,(p.y-a.y)/FSY,p.z-a.z);
      for(const side of [-2,2]){
        mesh.data.set([p.x,p.y,p.z,b.x-a.x,b.y-a.y,b.z-a.z,side,length,p.heat,p.alpha,p.tint??gilt,p.w],mesh.n);
        mesh.n+=12;
      }
    }
    if(join)mesh.data.copyWithin(join+12,join+24,join+36);
  }
  function canvasStrand(g,pts,gilt){
    g.save();g.lineCap='round';
    for(let j=1;j<pts.length;j++){
      const a=pts[j-1],b=pts[j],heat=sat((a.heat+b.heat)*.5),alpha=(a.alpha+b.alpha)*.5;
      if(alpha<.01)continue;
      g.globalAlpha=alpha*.26;g.strokeStyle='#12141d';g.lineWidth=a.w*2.25;
      g.beginPath();g.moveTo(a.x+a.z*.25,a.y+a.z*.14);g.lineTo(b.x+b.z*.25,b.y+b.z*.14);g.stroke();
      const warm=(b.tint??gilt)>.5;
      g.globalAlpha=alpha;g.strokeStyle=warm?'#5a4383':'#5d7891';g.lineWidth=a.w*1.64;
      g.beginPath();g.moveTo(a.x,a.y-a.z);g.lineTo(b.x,b.y-b.z);g.stroke();
      g.globalAlpha=alpha*(.32+.57*heat);g.strokeStyle=warm?'#ecd2ff':'#d9fcff';g.lineWidth=Math.max(1,a.w*.46);
      g.stroke();
    }g.restore();
  }
  function note(hz,pan,amp){
    if(!AC||!master)return;
    const time=AC.currentTime,out=AC.createStereoPanner?.();
    if(out){out.pan.value=pan;out.connect(master);}
    for(const [ratio,gain,tail] of [[1,1,.37],[2.04,.31,.24],[4.11,.13,.17]]){
      const tone=osc('sine',hz*ratio),vol=AC.createGain();
      tone.frequency.exponentialRampToValueAtTime(hz*ratio*.965,time+tail);
      env(vol,time,.004,amp*gain,tail);tone.connect(vol);vol.connect(out||master);
      tone.onended=()=>{tone.disconnect();vol.disconnect();if(out&&ratio===1)out.disconnect();};
      tone.start(time);tone.stop(time+tail+.02);
    }
  }
  function cast(id){
    X.ultStart(id);
    const C=X.cine,{hw,hh}=X.view(),x=pl.x,y=pl.gy;
    const D=70000*X.A.mul(id),low=!!F.low,web=!!program();
    const climax=3.85,BURST=4.8,LAND=1.1,end=6.0,life=6.05;
    const RX=Math.min(hw*.8,hh*2.0),RY=Math.min(hh*.74,RX*.5);
    const c={x,y:y-RY*.06};
    const B0={x,y:y-210,z:420};
    const mesh={data:new Float32Array(7200*12),n:0};
    const castRun=X.V.draws;
    const active=()=>lock&&RPG.mode==='surv'&&X.V.ultId===id&&X.V.draws===castRun;
    const later=(t,fn)=>after(t,()=>{if(active())fn();});
    const yaw=pl.f>0?0:pi;
    const unit=(a,b)=>{const dx=b.x-a.x,dy=(b.y-a.y)/FSY,dz=b.z-a.z,l=Math.hypot(dx,dy,dz)||1;return {x:dx/l,y:dy/l,z:dz/l};};
    const step=(p,d,s)=>({x:p.x+d.x*s,y:p.y+d.y*s*FSY,z:p.z+d.z*s});
    const dist3=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/FSY,a.z-b.z);
    // Eight feet ring the field. Planting order hops left/right, back/front; every leg gets its own proportions.
    const feetA=[-1.02,-.36,.30,.98],order=[5,1,6,2,4,0,7,3],legs=[];
    const tones=[legA,legB,legC];
    for(let i=0;i<8;i++){
      const side=i<4?-1:1,k=i%4,phi=side>0?feetA[k]:pi-feetA[k];
      const g={i,side,k,phi,tx:c.x+RX*Math.cos(phi)*(.9+.1*hash(i)),ty:c.y+RY*Math.sin(phi)*(.88+.12*hash(i+9)),
        hx:side*(46+18*k),hy:(k-1.5)*38,hz:-20-10*Math.abs(k-1.5),
        cx:Math.cos(phi)*(58+12*k),cy:Math.sin(phi)*34,cz:44+8*hash(i+3),
        roll0:side*1.25,roll1:side*(.55+.35*hash(i+40)),roll2:side*(.85+.2*k)+.35*(hash(i+50)-.5),
        tone:tones[Math.floor(hash(i+70)*3)]};
      const J={x:B0.x+g.hx+g.cx,y:B0.y+g.hy+g.cy,z:B0.z+g.hz+g.cz},reach=Math.hypot(g.tx-J.x,(g.ty-J.y)/FSY,J.z+26);
      g.L1=reach*(.44+.06*hash(i+20));g.L2=reach*(.6+.06*hash(i+30));
      legs.push(g);
    }
    // Planting, a settling tap, four paired re-stabs (the spider shifts its weight), then the shared wind-up and slam.
    const waves=[2.62,2.88,3.14,3.40];
    order.forEach((i,n)=>{
      const g=legs[i],rot=(hash(i+60)-.5)*.12,dx=g.tx-c.x,dy=(g.ty-c.y)/FSY,cs=Math.cos(rot),sn=Math.sin(rot);
      g.n=n;g.at=.9+n*.22;g.land=g.at+.2;g.rs=waves[n>>1];g.tap=g.land+.4+.3*hash(i+80);
      g.ux=c.x+(dx*cs-dy*sn)*.95;g.uy=c.y+(dx*sn+dy*cs)*.95*FSY;
    });
    const ring=[...legs].sort((a,b)=>Math.atan2(a.ty-c.y,a.tx-c.x)-Math.atan2(b.ty-c.y,b.tx-c.x));
    ring.forEach((g,j)=>{g.r=j;g.fold=4.2+.03*j;});
    const rings=low?3:4,segs=8*rings;
    const bite=a=>a>0?Math.exp(-7*a)*Math.sin(16*a):0;
    // Assembled in the air over the pool, it settles onto its first leg with a squash, then breathes, sways and dips under each stab.
    function bodyAt(t){
      let z=B0.z,sq=0;
      if(t<.95)z+=130+12*Math.sin(t*9);
      else if(t<LAND){const u=(t-.95)/(LAND-.95);z+=130*(1-u*u);}
      else{const a=t-LAND;sq=Math.exp(-4.5*a)*Math.cos(11*a);z-=95*sq;}
      const sway=ease((t-1.3)/.5)*(1-ease((t-3.5)/.2));
      let ox=sway*(30*Math.sin(1.7*t)+10*Math.sin(3.1*t)),oy=sway*16*Math.sin(1.2*t+.7),oz=sway*(30*Math.sin(2.1*t)+10*Math.sin(3.7*t+1));
      for(const g of legs){
        for(const [T,px,py] of [[g.land,g.tx,g.ty],[g.rs,g.ux,g.uy]]){
          const a=t-T;
          if(a>0&&a<1.3){
            const s=Math.exp(-4.2*a)*Math.sin(12*a),dx=px-B0.x,dy=py-B0.y,l=Math.hypot(dx,dy)||1;
            ox+=dx/l*40*s;oy+=dy/l*22*s;oz-=(T===g.rs?44:30)*s;
          }
        }
      }
      const pull=outE((t-climax)/.12),gather=ease((t-4.2)/.55);
      const wind=190*ease((t-3.56)/.26)*(1-pull);
      return {x:B0.x+ox,y:B0.y+oy,z:z+oz+wind-140*pull+90*gather,pull,sq,gather,on:t>=.4};
    }
    function footAt(g,t,hip){
      const fold={x:hip.x+g.side*(110+26*g.k),y:hip.y+g.hy*.6+30,z:hip.z-240+20*Math.sin(t*3+g.i)};
      if(t<g.at)return fold;
      const lift={x:mix(hip.x,g.tx,.5),y:mix(hip.y,g.ty,.5),z:hip.z+180};
      if(t<g.at+.12)return lerp3(fold,lift,ease((t-g.at)/.12));
      if(t<g.land)return lerp3(lift,{x:g.tx,y:g.ty,z:-26},((t-g.at-.12)/.08)**2);
      let p;
      // Re-stab: the foot is hauled up and back toward the body, holds trembling, then drives down.
      const r0=g.rs-.3,r1=g.rs-.07;
      const mid={x:mix(mix(g.tx,g.ux,.5),hip.x,.15),y:mix(mix(g.ty,g.uy,.5),hip.y,.15),z:330};
      if(t<r0){
        p={x:g.tx,y:g.ty,z:-26-14*bite(t-g.land)};
        const a=(t-g.tap)/.34;
        if(a>0&&a<1&&g.tap+.34<r0){const s=Math.sin(pi*a);p={x:g.tx+g.side*20*s,y:g.ty-12*s,z:p.z+120*s*s};}
        else if(a>=1)p.z-=10*bite(t-g.tap-.34);
      }
      else if(t<r1){const a=ease((t-r0)/.13);p=lerp3({x:g.tx,y:g.ty,z:-26},mid,a);p.z+=8*Math.sin(t*38+g.i)*a;}
      else if(t<g.rs)p=lerp3(mid,{x:g.ux,y:g.uy,z:-26},((t-r1)/.07)**2);
      else p={x:g.ux,y:g.uy,z:-26-14*bite(t-g.rs)};
      // Wind-up: every foot rises and spreads, then all slam at once and scrape inward.
      const w=t<3.8?280*ease((t-3.56)/.24):t<climax?280*(1-((t-3.8)/.05)**2):0;
      const spread=-.08*w/280,slide=.4*outE((t-climax)/.18);
      p={x:mix(p.x,c.x,spread+slide),y:mix(p.y,c.y,spread+slide),z:p.z+w-8*slide-14*bite(t-climax)};
      // Exit: the legs pull free of the floor and fold up under the rising body.
      const e=ease((t-g.fold)/.42);
      if(e>0)p=lerp3(p,{x:hip.x+g.side*(70+20*g.k),y:hip.y+g.hy*.5+20,z:hip.z-170},e);
      return p;
    }
    // Two-bone reach from the coxa joint: the knee bends outward along the leg's own heading and up.
    function kneeAt(g,h,f){
      const L1=g.L1,L2=g.L2,dx=f.x-h.x,dy=(f.y-h.y)/FSY,dz=f.z-h.z,d0=Math.hypot(dx,dy,dz)||1;
      const ux=dx/d0,uy=dy/d0,uz=dz/d0,d=Math.min(d0,(L1+L2)*.998);
      const a=(L1*L1-L2*L2+d*d)/(2*d),r=Math.sqrt(Math.max(0,L1*L1-a*a));
      const ox=Math.cos(g.phi)*.7,oy=Math.sin(g.phi)*.7,oz=.72,dot=ox*ux+oy*uy+oz*uz;
      const nx=ox-dot*ux,ny=oy-dot*uy,nz=oz-dot*uz,nl=Math.hypot(nx,ny,nz)||1;
      return {x:h.x+ux*a+nx/nl*r,y:h.y+(uy*a+ny/nl*r)*FSY,z:h.z+uz*a+nz/nl*r};
    }
    function legPose(g,t,b){
      const hip={x:b.x+g.hx,y:b.y+g.hy,z:b.z+g.hz},J={x:hip.x+g.cx,y:hip.y+g.cy,z:hip.z+g.cz};
      const f=footAt(g,t,hip),kn=kneeAt(g,J,f);
      return {g,hip,J,f,kn,anchor:lerp3(f,kn,.09)};
    }
    // hilt/tip fog darkens the grip end so joints read as shadowed gaps, not chrome rings.
    function blade(p,d,len,roll,pal,a,shadow,hilt=0,tip=0){
      if(!(len>3)||a<.01)return;
      const prev=step(p,d,-8);
      if(!web){window.AssassinBlades?.canvas?.(fx,p,prev,len,roll,pal,a,0);return;}
      const ground=F.ground;
      if(!shadow)F.ground=false;
      let q=0;
      const fogAt=hilt||tip?()=>(q++?tip:hilt):undefined;
      try{window.AssassinBlades?.draw(p,prev,len,roll,pal,a,8,0,fogAt);}finally{F.ground=ground;}
    }
    // A segment hangs from its pommel at a and its tip reaches b.
    function limb(a,b,len,roll,pal,alpha,shadow,hilt,tip){
      const d=unit(a,b);
      blade(step(a,d,len*.88),d,len,roll,pal,alpha,shadow,hilt,tip);
      return d;
    }
    // Assembly: each blade rises out of the ink, tumbling, and locks into place. Path centre for flight fraction e.
    function flight(a,b,seed,e){
      const ang=seed*2*pi,R=180+520*hash(seed*7.3),m=lerp3(a,b,.5);
      return {x:mix(x+Math.cos(ang)*R,m.x,e),y:mix(y+Math.sin(ang)*R*FSY,m.y,e),z:mix(-30,m.z,e)+420*Math.sin(pi*e)*(1-e)};
    }
    function form(a,b,t0,seed,t){
      const k=sat((t-t0)/.34);
      if(k<=0)return null;
      if(k>=1)return {a,b,k:1};
      const e=outE(k),M=flight(a,b,seed,e),sp=(1-e)*(4+3*hash(seed*3.1)),cs=Math.cos(sp),sn=Math.sin(sp),sc=(.4+.6*e)*.5;
      const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,hx=(dx*cs-dz*sn)*sc,hz=(dx*sn+dz*cs)*sc,hy=dy*sc;
      return {a:{x:M.x-hx,y:M.y-hy,z:M.z-hz},b:{x:M.x+hx,y:M.y+hy,z:M.z+hz},k,e,M,
        tail:[flight(a,b,seed,Math.max(0,e-.34)),flight(a,b,seed,Math.max(0,e-.14))]};
    }
    // The body is a mass of stacked blades: a two-layer abdomen fan behind, a crown of carapace plates, two fangs in front.
    function bodyParts(b,t,hush){
      const parts=[],sq=b.sq,br=(1+.06*Math.sin(2.3*t))*(1+.3*sq),A={x:b.x,y:b.y-34,z:b.z+40};
      for(let j=0;j<5;j++){
        const s=j-2,ang=s*.33*br,el=(.3+.08*Math.abs(s)+.05*Math.sin(t*2.3+j))*(1-.5*sq);
        const d=unit({x:0,y:0,z:0},{x:Math.sin(ang),y:-Math.cos(ang)*FSY,z:el});
        parts.push({a:A,d,len:(250-36*Math.abs(s))*(1+.04*hash(j)),roll:1.57+s*.4,pal:j%2?legB:legC,hilt:.8,tip:0,rim:1});
      }
      const A2={x:b.x,y:b.y-6,z:b.z+70};
      for(let j=0;j<4;j++){
        const s=j-1.5,ang=s*.36*br,el=(.62+.06*Math.sin(t*2+j))*(1-.4*sq);
        const d=unit({x:0,y:0,z:0},{x:Math.sin(ang),y:-Math.cos(ang)*FSY,z:el});
        parts.push({a:A2,d,len:170-18*Math.abs(s),roll:1.2+s*.5,pal:legA,hilt:.85,tip:0,rim:1});
      }
      const T={x:b.x,y:b.y+24,z:b.z+30};
      for(let j=0;j<6;j++){
        const ang=-1.05+j*.42,d=unit({x:0,y:0,z:0},{x:Math.sin(ang)*br,y:Math.cos(ang)*.55*FSY,z:.22-.04*Math.abs(j-2.5)-.12*sq});
        parts.push({a:T,d,len:118+14*hash(j+5),roll:.3*(j-2.5),pal:j%2?legC:legB,hilt:.9,tip:0,rim:0});
      }
      const H={x:b.x,y:b.y+70,z:b.z+20},open=.18+.32*hush-.45*Math.exp(-Math.max(0,t-climax)*7)*(t>=climax?1:0);
      for(const s of [-1,1]){
        const d=unit({x:0,y:0,z:0},{x:s*(.18+open),y:.6*FSY,z:-1});
        parts.push({a:{x:H.x+s*30,y:H.y,z:H.z},d,len:104,roll:s*.9,pal:legA,hilt:.9,tip:0,rim:0});
      }
      return {parts,H,A};
    }
    // Daggers thrown off at the burst: a hard initial kick, gravity, spin, then they stick tip-down in the floor.
    const bits=[],G=3200;
    function shed(p,len,pal,t,push){
      const h=hash(bits.length*7.1+.3),h2=hash(bits.length*3.3+1.7),vz=420+460*h2,sp=620+780*h;
      const ox=push.x+(h2-.5)*.5,oy=push.y-(h-.5)*.5,ol=Math.hypot(ox,oy)||1;
      const zs=len*.8;
      bits.push({p,at:t,len,pal,roll:h*6,spin:(h>.5?1:-1)*(10+9*h),ox:ox/ol,oy:oy/ol,zs,
        v:{x:ox/ol*sp,y:oy/ol*sp,z:vz},land:(vz+Math.sqrt(vz*vz+2*G*Math.max(0,p.z-zs)))/G,
        puffed:false});
      const q=bits[bits.length-1];q.crack=Math.min(5.88,t+q.land+.22+.32*hash(bits.length*1.9+5));
    }
    function puff(p,n,s=1){
      if(low)return;
      for(let j=0;j<n;j++){
        const a=hash(p.x*.01+j*3.3)*2*pi,v=40+90*hash(j+p.y*.01);
        GFX.pt({x:p.x,y:p.y,z:Math.max(6,p.z),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:60+110*hash(j*3+p.z*.01),g:-25,drag:1.6,
          life:.6+.4*hash(j+2),s:(22+16*hash(j+5))*s,grow:55,m:5,b:'alpha',c:GFX.rgb('#0c0b16'),c2:'#000000',c3:'#3a2f5c',er:.9,ns:1.3,w:1,a:.62,L:0});
      }
    }
    // Snared bodies: a steel loop at the waist and a tether to the nearest spoke. Struck bodies get an X cut.
    const snared=[],cuts=[];
    function spinneret(b){return {x:b.x,y:b.y-50,z:b.z-60};}
    let hubFix=null,burst=false;
    const poolR=t=>mix(0,980,outE(t/.9))+260*ease((t-.9)/2.7);
    function render(t){
      if(!active())return;
      mesh.n=0;
      const b=bodyAt(t),m=web?K.mats():null;
      if(t<climax+.16||!hubFix)hubFix=spinneret(b);
      const hub=hubFix;
      const core=[],glow=[],vapour=[];
      const add=(arr,seg)=>{
        if(seg.length<2)return;
        if(arr.length){const a=arr[arr.length-1],q=seg[0];arr.push({x:a.x,y:a.y,z:a.z,w:0},{x:q.x,y:q.y,z:q.z,w:0});}
        for(const q of seg)arr.push(q);
      };
      const star=(q,s,w,arr=core,vert=.7)=>{
        add(arr,[{x:q.x-s,y:q.y,z:q.z,w:0},{x:q.x-s*.25,y:q.y,z:q.z,w:w*.55},{...q,w},{x:q.x+s*.25,y:q.y,z:q.z,w:w*.55},{x:q.x+s,y:q.y,z:q.z,w:0}]);
        if(vert>0)add(arr,[{x:q.x,y:q.y,z:q.z-s*vert,w:0},{...q,w:w*.45},{x:q.x,y:q.y,z:q.z+s*vert,w:0}]);
      };
      const filament=(pts,gilt)=>{if(web)strand(mesh,pts,gilt);else canvasStrand(fx,pts,gilt);};
      // A blade that assembles itself first: flying out of the ink with a cold streak, a snap flash where it locks.
      const limbF=(a,b0,len,roll,pal,shadow,hilt,tip,t0,seed)=>{
        const f=form(a,b0,t0,seed,t);
        if(!f)return null;
        if(f.k<1){
          limb(f.a,f.b,len*(.4+.6*f.e),roll+(1-f.e)*5,pal,1,false,hilt,tip);
          if(web){
            add(core,[{...f.tail[0],w:0},{...f.tail[1],w:4},{...f.M,w:0}]);
            add(glow,[{...f.tail[0],w:0},{...f.tail[1],w:10},{...f.M,w:0}]);
            if(f.k<.22){const s=flight(a,b0,seed,0),o=1-f.k/.22;star({x:s.x,y:s.y,z:6},70*o+20,9*o,glow,0);}
          }
          return unit(f.a,f.b);
        }
        const snap=t-t0-.34;
        if(web&&snap<.08)star(a,50*(1-snap/.08)+14,10*(1-snap/.08),core,.5);
        return limb(a,b0,len,roll,pal,1,shadow,hilt,tip);
      };
      const hush=ease((t-3.6)/.2)*(1-ease((t-climax)/.05));
      const flash=Math.exp(-Math.max(0,t-climax)*9)*(t>=climax?1:0);
      // Ink floods out from under the hero and soaks back in at the end.
      if(web){
        const r=poolR(t),shrink=1-ease((t-5.15)/.8);
        if(shrink>0)F.quad(m.soot,x,y-40,r*shrink,r*shrink*.92,.4,{a:.9});
      }
      // Kunai thrown up into the dark, where the dragline will hang from.
      if(t>.24&&t<.62){
        for(let j=0;j<8;j++){
          const u=sat((t-.24-.012*j)/.3);
          if(u<=0||u>=1)continue;
          const from={x:x+(pl.f>0?28:-28),y:y,z:150},to={x:B0.x+(j-3.5)*46,y:B0.y,z:B0.z+1200};
          const at=v=>({x:mix(from.x,to.x,v)+(j-3.5)*40*Math.sin(pi*v),y:mix(from.y,to.y,v),z:mix(from.z,to.z,v)});
          const p=at(u),q=at(Math.max(0,u-.04)),d=unit(q,p);
          blade(p,d,40,u*20+j,steel,1,false);
          add(core,[{...at(Math.max(0,u-.3)),w:0},{...at(Math.max(0,u-.1)),w:3},{...p,w:0}]);
        }
      }
      // Dragline from the dark sky to the abdomen; it whips back up when the web is drawn shut.
      if(t>.62&&t<climax+.3){
        const top={x:B0.x+20,y:B0.y-60,z:B0.z+2400},bot={x:b.x,y:b.y-40,z:b.z+90};
        const k=t<climax?0:ease((t-climax)/.3),dn=ease((t-.62)/.25),lo=lerp3(top,lerp3(bot,top,k),dn),pts=[];
        for(let j=0;j<=8;j++){const u=j/8,p=lerp3(lo,top,u);p.x+=Math.sin(u*9+t*6)*12*(1-u)*(t<1.2?1:.3);p.w=4;p.heat=.25+.6*Math.exp(-(((u-((t*1.3)%1))*8)**2));p.alpha=1;p.tint=.2;pts.push(p);}
        filament(pts,.2);
      }
      // Legs: coxa, femur and tibia; each segment its own length (and so thickness), roll and tone.
      const P=[];
      for(const g of legs){
        const pose=legPose(g,t,b),{hip,J,kn,f}=pose;
        P.push(pose);
        if(t<climax+.16)g.aFix=pose.anchor;
        if(!b.on||burst)continue;
        const t0=.5+.05*g.n;
        const d2=limbF(kn,f,g.L2/2.02,g.roll2,g.tone,true,.82,0,t0+.12,g.i*3+1.3);
        limbF(J,kn,g.L1/2.02,g.roll1,legC,false,.9,.15,t0+.06,g.i*3+2.1);
        limbF(hip,J,dist3(hip,J)/2.02*1.05,g.roll0,legA,false,.95,.4,t0,g.i*3+.7);
        if(!web||!d2)continue;
        // Just before the burst, violet cracks run down the leg from the knee.
        const ck=sat((t-BURST+.2)/.17);
        if(ck>0)for(const [a0,b0,L] of [[kn,f,g.L2],[J,kn,g.L1]]){
          const d=unit(a0,b0),seg=[];
          for(let j=0;j<=6;j++){const u=j/6*ck,q=step(a0,d,L*u);seg.push({x:q.x+(j%2?1:-1)*10*hash(g.i+j),y:q.y,z:q.z+(j%2?-1:1)*8,w:(j===0||j===6?0:7+5*ck)});}
          add(glow,seg);
        }
        // Joints: a violet bead at the knee and a dimmer one at the coxa, black vapour bleeding up from the knee.
        const strain=.45+.55*Math.exp(-3*Math.max(0,t-g.land))+.6*Math.exp(-4*Math.max(0,t-g.rs))*(t>g.rs?1:0)+hush*.8+flash;
        const kw=(13+6*Math.sin(t*5+g.i))*strain;
        add(glow,[{x:kn.x-kw*3,y:kn.y,z:kn.z,w:0},{...kn,w:kw},{x:kn.x+kw*3,y:kn.y,z:kn.z,w:0}]);
        add(glow,[{x:kn.x,y:kn.y,z:kn.z-kw*2,w:0},{...kn,w:kw*.7},{x:kn.x,y:kn.y,z:kn.z+kw*2,w:0}]);
        const jw=(7+3*Math.sin(t*4+g.i*2))*(.6+.4*strain);
        add(glow,[{x:J.x-jw*2.4,y:J.y,z:J.z,w:0},{...J,w:jw},{x:J.x+jw*2.4,y:J.y,z:J.z,w:0}]);
        if(!low){
          const seg=[];
          for(let j=0;j<6;j++){const v=j/5;seg.push({x:kn.x+Math.sin(t*2.1+g.i+v*3)*v*22,y:kn.y-v*6,z:kn.z+v*150,w:24*Math.sin(pi*(v*.85+.1))});}
          add(vapour,seg);
        }
        // Planting flash along the lower blade and a short glint off the claw, on the first stab and the re-stab.
        for(const T of [g.land,g.rs]){
          const plant=t-T;
          if(plant>-.06&&plant<.16){
            const k=1-Math.abs(plant-.02)/.14;
            add(core,[{...step(kn,d2,g.L2*.35),w:0},{...step(kn,d2,g.L2*.8),w:9*k},{...f,w:0}]);
          }
          if(plant>0&&plant<.3)star({x:f.x,y:f.y,z:f.z+30},60*(1-plant/.3)+20,8*(1-plant/.3),core,0);
        }
      }
      // Body: carapace blades, a dark smoke abdomen lit violet from inside, eyes on the head.
      let H=null;
      if(b.on&&!burst){
        const bp=bodyParts(b,t,hush);H=bp.H;
        bp.parts.forEach((q,j)=>{
          const tip=step(q.a,q.d,q.len*2.02),d=limbF(q.a,tip,q.len,q.roll,q.pal,false,q.hilt,q.tip,.42+.018*j,j*5.7+40);
          // Violet rim light along the spine of the abdomen blades.
          if(web&&d&&q.rim&&t>.42+.018*j+.34){
            const rk=(.55+.45*Math.sin(t*3+j))*(1+1.5*hush+2*flash);
            add(glow,[{...step(q.a,d,q.len*.3),w:0},{...step(q.a,d,q.len*1.1),w:6*rk},{...step(q.a,d,q.len*1.9),w:0}]);
          }
        });
        if(web){
          const core_=bp.A,pulse=.5+.5*Math.sin(t*4.2);
          const cw=(22+10*pulse)*(1+1.2*hush+1.5*flash)*sat((t-.8)/.3)*(1-ease((t-4.5)/.3));
          if(cw>.5)add(glow,[{x:core_.x-cw*3.4,y:core_.y-10,z:core_.z+40,w:0},{x:core_.x,y:core_.y-10,z:core_.z+40,w:cw},{x:core_.x+cw*3.4,y:core_.y-10,z:core_.z+40,w:0}]);
        }
      }
      // Spokes are drawn out of each leg toward the spinneret: slack and trembling, then hauled taut.
      const taut=Math.max(ease((t-3.3)/.3),hush);
      const spoke=(pose,u,tt)=>{
        const g=pose.g,a=t>=climax+.16&&g.aFix?g.aFix:pose.anchor,s=hub,born=1.78+.06*g.r;
        const p=lerp3({x:a.x,y:a.y,z:Math.max(60,a.z)},s,u);
        const slack=25+150*(1-ease((t-born-.2)/.35));
        const sag=slack*(1-.8*tt)*Math.sin(pi*u);
        const tremble=Math.sin(9*u-t*14+g.i)*Math.sin(pi*u)*22*(1-tt)*Math.exp(-Math.max(0,t-(born+.2))*.9);
        p.z-=sag-tremble;
        return p;
      };
      const pulse=t=>.7*t+.9*Math.max(0,t-2)**2;
      const ph=pulse(t);
      // The closing cut: a white front runs from the spinneret outward along every thread.
      const front=1-(t-climax)/.28;
      const wave=u=>t>=climax-.01&&t<climax+.45?1.7*Math.exp(-(((u-front)*6)**2)):0;
      const crumble=(seed)=>sat((t-5.05-.35*hash(seed))/.7);
      // A severed half whips back, then sags to the floor and cools from white through violet to dark steel.
      const severed=(p,dt,free,rest,seed,amp)=>{
        const rec=.35*free*ease(dt/.18);
        p.x=mix(p.x,rest.x,rec)+Math.sin(13*dt+seed)*Math.exp(-2.6*dt)*amp*free;
        p.y=mix(p.y,rest.y,rec)+Math.cos(11*dt+seed)*Math.exp(-2.6*dt)*amp*.4*free;
        const drop=Math.max(ease((dt-.1-.3*(1-free))/.6),ease((dt-.4)/.7));
        p.z=Math.max(5,mix(p.z+Math.sin(9*dt+seed)*Math.exp(-3*dt)*60*free,5+24*Math.abs(Math.sin(free*13+seed)),drop));
        p.heat=1.5*Math.exp(-dt*4)+.02;p.tint=mix(.45,.12,ease((dt-.15)/.6));
      };
      for(const pose of P){
        const g=pose.g,born=1.78+.06*g.r,grow=ease((t-born)/.24);
        if(grow<=0)continue;
        const n=low?14:20,pts=[];
        const cut=.42+.16*hash(g.i+3),sev=climax+.28*(1-cut)+.02;
        const broken=t>=sev;
        const wf=5.5+8*hash(g.i*5.3+1);
        for(let j=0;j<=n;j++){
          const u=grow*j/n,p=spoke(pose,u,taut);
          const run=Math.exp(-(((u-((ph+g.r*.37)%1))*9)**2));
          if(broken){
            const piece=u<cut?0:1,free=piece?(u-cut)/(1-cut):(cut-u)/cut;
            const rest=piece?lerp3(spoke(pose,cut,taut),hub,.3*free):lerp3(spoke(pose,cut,taut),g.aFix||pose.anchor,.3*free);
            severed(p,t-sev,free,rest,g.i+u*5,120);
            const cr=crumble(g.i*13+j);
            p.alpha=(hash(g.i*97+j*3.1)>cr?1:0)*(Math.abs(u-cut)<.012?0:1);
          }else{
            const head=j===n&&grow<1?1.3:0,hw_=wave(u);
            p.heat=.12+.8*run*ease((t-2.1)/.8)+.3*taut+head+hw_;
            p.tint=mix(g.r%2?.7:.2,.08,sat(hw_));p.alpha=1;
          }
          // Thickness swells mid-span and pinches at the ends, with a few knots along it.
          p.w=wf*(.45+.55*Math.sin(pi*Math.min(1,u*1.1+.05))**.6)*(.85+.25*Math.sin(u*23+g.i*4))*(1+.7*wave(u));
          pts.push(p);
        }
        if(broken){
          const k=Math.round(cut/grow*n);
          filament(pts.slice(0,Math.max(2,k)),.6);filament(pts.slice(Math.min(n-1,k+1)),.6);
        }else{
          filament(pts,g.r%2?.7:.2);
          if(grow<1){const q=pts[pts.length-1];star(q,30,9);star(q,24,12,glow,0);}
        }
      }
      // The capture spiral winds from the feet inward: uneven rings, hanging catenaries, dew beads and running pulses.
      const sMax=segs*sat((t-2.0)/1.4);
      const jit=s=>{const i=Math.floor(s),f=s-i;return mix(hash(i*3.7+.5),hash((i+1)*3.7+.5),f)-.5;};
      const fr=s=>mix(.12,.72,(s/segs)**.82)+.05*jit(s);
      const posesByRing=[];
      for(const pose of P)posesByRing[pose.g.r]=pose;
      let headPt=null;
      for(let s=0;s<segs&&s<sMax;s++){
        const A=posesByRing[s%8],Bp=posesByRing[(s+1)%8];
        const vis=Math.min(1,sMax-s),u0s=fr(s),sev=climax+.28*(1-u0s)+.04+.008*((s*5)%7),broken=t>=sev,pts=[];
        const n=low?5:8,thick=.55+1*hash(s*3.7);
        for(let j=0;j<=n;j++){
          const v=j/n*vis,u0=fr(s+v);
          const pa=spoke(A,u0,taut),pb=spoke(Bp,u0,taut),p=lerp3(pa,pb,v);
          const sag=(60+70*(1-u0))*(1-.55*taut)*Math.sin(pi*v)*(.6+.8*hash(s));
          p.z=Math.max(8,p.z-sag+Math.sin(t*11+s+v*6)*10*(1-taut)*Math.sin(pi*v));
          const head=Math.exp(-(((s+v-sMax)*1.3)**2))*(t<3.45?1:0);
          const run=Math.exp(-(((((u0*1.4+ph*.8+v*.3)%1)-.5)*9)**2));
          if(broken){
            const piece=v<.5?0:1,free=piece?(v-.5)*2:(.5-v)*2;
            severed(p,t-sev,free,piece?pb:pa,s,80);
            p.alpha=(hash(s*41+j*2.3)>crumble(s*7+j)?1:0)*(Math.abs(v-.5)<.03?0:1);
          }else{
            const hw_=wave(u0);
            p.heat=.1+.7*run*ease((t-2.3)/.8)+1.1*head+.35*taut+hw_;p.tint=mix(s%3===1?.25:.55,.08,sat(hw_));p.alpha=1;
          }
          p.w=(s%4===0?9:6)*thick*(.45+.55*Math.sin(pi*v)**.5)*(1+.6*head)*(1+.6*wave(u0));
          pts.push(p);
        }
        if(broken){filament(pts.slice(0,Math.ceil(n/2)),.5);filament(pts.slice(Math.ceil(n/2)+1),.5);}
        else{
          filament(pts,s%3===1?.25:.55);
          // Dew: beads caught on the thread, each twinkling on its own phase.
          if(web&&vis>.6&&!low){
            for(const dv of [.22+.16*hash(s*5.1),.5+.1*hash(s*1.3),.7+.15*hash(s*2.3)]){
              const jj=Math.min(n,Math.round(dv*n)),q=pts[jj],tw=Math.max(0,Math.sin(t*5.3+s*2.7+dv*9))**3;
              star({x:q.x,y:q.y,z:q.z-5},12+22*tw,3+5*tw+3*taut,core,tw*.5);
              star({x:q.x,y:q.y,z:q.z-5},10,5+5*tw,glow,0);
            }
          }
        }
        if(vis<1&&!broken)headPt=pts[pts.length-1];
      }
      // Silk being paid out: a bright running thread from the spiral's leading end back up to the spinneret.
      if(web&&headPt&&t<3.45){
        const q=headPt,seg=[];
        for(let j=0;j<=8;j++){const u=j/8,p=lerp3(q,hub,u);p.z-=Math.sin(pi*u)*40;p.w=(j===0?7:3+2*Math.sin(t*30+j))*(1-.5*u);p.heat=1.2-.8*u;p.alpha=1;p.tint=.4;seg.push(p);}
        filament(seg,.4);
        star(q,40,10);star(q,30,14,glow,0);
      }
      // Snares.
      for(const sn of snared){
        const e=sn.e,dt=t-sn.t;
        if(dt<0)continue;
        const snap=t>=climax,bind=ease(dt/.18);
        if(e.dead&&!snap)continue;
        if(!snap){sn.x=e.x;sn.y=e.y;sn.z=e.z+e.h*.45;}
        const ex=sn.x,ey=sn.y,ez=sn.z;
        const loop=[],r=Math.max(60,e.h*.42)*(1.25-.25*bind)*(snap?1-.5*ease((t-climax)/.08):1);
        const go=snap?1-ease((t-climax-.06)/.12):1;
        if(go>0){
          for(let j=0;j<=16;j++){
            const u=j/16,a=sn.ang+u*pi*2.3;
            loop.push({x:ex+Math.cos(a)*r,y:ey+Math.sin(a)*r*FSY,z:ez+e.h*.18*(u-.5),w:5+2*Math.sin(pi*u),
              heat:.3+.5*Math.sin(pi*u)**2+1.2*(snap?1:0),alpha:bind*go,tint:snap?.1:.85});
          }
          filament(loop,.85);
          const pose=posesByRing[sn.r];
          if(pose&&!snap){
            const q=spoke(pose,sn.u,taut),tether=[];
            for(let j=0;j<=10;j++){
              const u=j/10,wv=Math.exp(-(((u-(1-ease(dt/.3)))*5)**2));
              tether.push({x:mix(ex,q.x,u),y:mix(ey,q.y,u),z:mix(ez,q.z,u)-Math.sin(pi*u)*30*(1-taut),w:4+3*wv,heat:.25+.9*wv,alpha:bind,tint:.3});
            }
            filament(tether,.3);
          }
        }
      }
      // The cut lands on every body: a white X across the torso, then a violet afterglow.
      if(web)for(const q of cuts){
        const a=t-q.at;
        if(a<0||a>.34)continue;
        const grow=outE(a/.05),fade=1-sat((a-.08)/.26),L=q.s*grow;
        for(const ang of [q.a,q.a+1.9]){
          const dx=Math.cos(ang)*L,dz=Math.sin(ang)*L;
          add(core,[{x:q.x-dx,y:q.y,z:q.z-dz,w:0},{x:q.x,y:q.y,z:q.z,w:14*fade},{x:q.x+dx,y:q.y,z:q.z+dz,w:0}]);
          add(glow,[{x:q.x-dx*1.2,y:q.y,z:q.z-dz*1.2,w:0},{x:q.x,y:q.y,z:q.z,w:24*fade},{x:q.x+dx*1.2,y:q.y,z:q.z+dz*1.2,w:0}]);
        }
      }
      // Eyes: eight violet eyes on the head, opening one by one, flaring at the hush, going out before the burst.
      if(web&&H){
        const eyes=[[-50,30,24,1],[-19,42,30,1.4],[19,42,30,1.4],[50,30,24,1],[-78,-4,17,.8],[-32,8,19,.9],[32,8,19,.9],[78,-4,17,.8]];
        const open=[2,1,0,3,6,5,4,7],fo=ease((t-.9)/.3)*(1-ease((t-4.55)/.2));
        // A violet sheen across the face plate the eyes sit in.
        if(fo>0)add(glow,[{x:H.x-150,y:H.y+14,z:H.z+95,w:0},{x:H.x-60,y:H.y+14,z:H.z+110,w:34*fo*(1+hush+flash)},{x:H.x+60,y:H.y+14,z:H.z+110,w:34*fo*(1+hush+flash)},{x:H.x+150,y:H.y+14,z:H.z+95,w:0}]);
        eyes.forEach(([dx,dz,s,k],j)=>{
          const o=ease((t-.9-.04*open[j])/.07)*(1-ease((t-4.55-.025*open[j])/.1));
          if(o<=0)return;
          const blink=1-.8*Math.exp(-(((t-1.7-j*.013)*30)**2));
          const w=s*o*blink*(1+1.1*hush+1.5*flash)*(.85+.15*Math.sin(t*7+j)),q={x:H.x+dx,y:H.y+14,z:H.z+dz*1.3+80};
          add(core,[{x:q.x-s*1.6,y:q.y,z:q.z,w:0},{x:q.x-s*.5,y:q.y,z:q.z,w:w*.6},{x:q.x+s*.5,y:q.y,z:q.z,w:w*.6},{x:q.x+s*1.6,y:q.y,z:q.z,w:0}]);
          add(glow,[{x:q.x-s*3.2,y:q.y,z:q.z,w:0},{x:q.x-s*1.1,y:q.y,z:q.z,w:w*4*k},{x:q.x+s*1.1,y:q.y,z:q.z,w:w*4*k},{x:q.x+s*3.2,y:q.y,z:q.z,w:0}]);
        });
      }
      // Burst daggers: kicked out, spinning under gravity, then stuck tip-down until they crack into black dust.
      for(let i=bits.length-1;i>=0;i--){
        const s=bits[i],a=t-s.at;
        if(a<0)continue;
        if(t>=s.crack+.14){bits.splice(i,1);continue;}
        const fa=Math.min(a,s.land),ang=s.spin*fa;
        const stuck={x:s.ox*.6,y:s.oy*.6,z:-.8},sl=Math.hypot(stuck.x,stuck.y,stuck.z);
        let d={x:s.ox*Math.cos(ang),y:s.oy*Math.cos(ang),z:Math.sin(ang)};
        const k=sat((a-(s.land-.07))/.07);
        d={x:mix(d.x,stuck.x/sl,k),y:mix(d.y,stuck.y/sl,k),z:mix(d.z,stuck.z/sl,k)};
        const l=Math.hypot(d.x,d.y,d.z)||1;d.x/=l;d.y/=l;d.z/=l;
        const p={x:s.p.x+s.v.x*fa,y:s.p.y+s.v.y*fa*FSY,z:Math.max(s.zs,s.p.z+s.v.z*fa-.5*G*fa*fa)};
        if(a>=s.land)p.z=s.zs-4*bite(a-s.land);
        const ck=sat((t-s.crack)/.14);
        blade(p,d,s.len*(1-ck),s.roll+ang*.7,s.pal,1,false,.3+.6*ck,ck);
        if(web&&a>=s.land&&a<s.land+.14){const o=1-(a-s.land)/.14;star({x:p.x,y:p.y,z:10},50*o+12,7*o,core,.3);}
        if(t>=s.crack&&!s.puffed){s.puffed=true;puff({x:p.x,y:p.y,z:20},2,.8);}
      }
      if(web){
        // The abdomen: black smoke under the carapace blades, lit cold from above and violet from inside.
        if(window.VOL?.on&&b.on&&!burst){
          const dis=sat((t-.55)/.4)*(1-.3*b.gather),glowK=.05+.2*hush+.5*flash;
          if(dis>.01){
            const opt=(s,seed,o)=>({ex:s*1.2,ey:s,ez:s*.85,pa:[.5+.3*dis,.6,2.3,t*.22],pb:[glowK,1,1,.5],
              dens:18*dis,seed,smoke:1,fire:1,cA:iris.d,cB:iris.b,cM:iris.m,cC:iris.h,cS:'#020106',cK:'#1d1934',amb:.12,key:1.0,rim:.36,glow:.14,steps:20,lit:.55,flow:.35,...o});
            VOL.add('blast',b.x,b.y-120,b.z+70,opt(300*(.55+.45*dis),3.1));
            VOL.add('blast',b.x,b.y+30,b.z-10,opt(150*(.55+.45*dis),7.7));
          }
        }
        if(mesh.n)F.q.push({L:0,ord:-3,render:paint,mesh,shadow:1,t},{L:1,ord:6,render:paint,mesh,shadow:0,t});
        if(core.length>1)F.ribbon(m.trC,core,{cA:steel.b,cB:steel.m,cM:steel.h,cC:'#ffffff',gain:2.6,ero:.05,ord:9,ulen:260,fd:[0,0,0,0]});
        if(glow.length>1)F.ribbon(m.glowO,glow,{cA:iris.d,cB:iris.b,cM:iris.m,cC:iris.h,gain:2.2,ord:9,ulen:200});
        if(vapour.length>1)F.ribbon(m.trB,vapour,{cA:'#05040b',cB:'#140f26',cM:'#30285a',cC:iris.b,a:.8,gain:1.1,ero:.14,ord:7,ulen:320,t0:t*.6,fd:[0,0,0,0]});
      }
    }
    if(web)GFX.add(life,(k,t)=>render(t));else X.draw(life,k=>render(life*k));
    // --- timeline ---
    C.move({x,y:y-420,zoom:1.04,tilt:.08,roll:-.012},.5);
    GFX.ambient(.6,.6,.72,3);C.SND.inhale(.5,.28);
    if(window.MK?.on())MK.play('iaiReady',{yaw,blend:.06});
    K.flare(x,y,X.BODY*.6,{s:120,sx:2.6,sy:.2,pal:steel,dur:.26});
    // Smoke boils off the rim of the ink pool, so it reads as a pit of shadow rather than a painted stain.
    if(!low)for(const [tk,a0] of [[.15,.4],[.32,2.6],[.5,4.5],[.7,1.5],[.95,3.6],[1.25,5.5]])later(tk,()=>{
      const r=poolR(tk)*.5;
      K.vsmoke(x+Math.cos(a0)*r,y-40+Math.sin(a0)*r*FSY,{s:230,dur:1.5,rise:420,c:'#0a0912',c2:'#3a3458',a:.42,lit:.35});
    });
    if(!low)for(let k=0;k<24;k++){
      const tk=.1+k*.15;
      later(tk,()=>{
        const r=poolR(tk)*.62;
        for(let j=0;j<4;j++){
          const a=hash(k*5.3+j*1.7)*2*pi,rr=r*(.9+.2*hash(k+j*7.1));
          GFX.pt({x:x+Math.cos(a)*rr,y:y-40+Math.sin(a)*rr*FSY,z:6,vx:Math.cos(a)*40,vy:Math.sin(a)*26,vz:120+110*hash(j+k*2.3),g:-40,drag:.9,
            life:1.3+.5*hash(k+j*2),s:40+30*hash(j*3+k),grow:110,m:5,b:'alpha',c:GFX.rgb('#100d1a'),c2:'#05040a',c3:'#2a2342',er:.9,ns:1.3,w:1,a:.4,L:0});
        }
      });
    }
    later(.24,()=>{C.SND.shing(1.2,.2);note(880,0,.12);});
    later(.5,()=>{C.move({x,y:y-560,zoom:.96,tilt:.06,roll:0},.45);C.SND.inhale(.4,.3);X.sfx('slash',.9,.2);});
    // The assembled body settles onto its legs: a jolt, a low note, the eyes open.
    later(LAND,()=>{
      C.shake(.45);note(110,0,.2);X.sfx('slash',.4,.35);
      K.flare(B0.x,B0.y+60,B0.z+40,{s:170,sx:2.2,sy:.22,pal:iris,dur:.3});
      if(web)GFX.light(B0.x,B0.y,620,iris.l,.55,.6,{z:B0.z*.5});
    });
    let drone;
    later(.95,()=>{drone=C.drone(58,.12);C.move({x,y:y-360,zoom:.8,tilt:.14,roll:.02},1.6,'lin');});
    for(const g of legs){
      later(g.land,()=>{
        const fx_=g.tx,fy=g.ty,dir=Math.atan2((fy-B0.y)/FSY,fx_-B0.x);
        C.shake(.32);note([147,165,175,196,220,247,262,294][g.n],sat((fx_-x)/RX*.5+.5)*2-1,.2);
        X.sfx('slash',.55+.05*g.n,.3);
        K.sparks(fx_,fy,24,{pal:steel,n:low?4:7,dir,spread:.8,sp:[220,700],up:420,life:[.12,.34]});
        if(K.chunks&&!low)K.chunks(fx_,fy,{n:3,r:50,sp:[160,420],up:760,s:[26,48],kind:'slab',rock:'#2b2832',pal:dusk,life:1.1});
        K.debris(fx_,fy,{n:low?5:10,r:50,sp:[200,620],up:820,size:20,c:'#3c3744'});
        K.dust(fx_,fy,{r:60,n:low?4:9,sp:[220,620],s:1.7,a:.5,life:1.1,c:'#1c1926',c3:'#4a4560'});
        if(!low)K.vring(fx_,fy,{r:340,r0:60,dur:.6,tube:.12,c:'#16131c',c2:'#3a3450',lit:.2,a:.5});
        K.cool(fx_,fy,{kind:'crater',r:170,pal:rock,life:Math.max(2.4,5.85-g.land),hot:.12,grow:.05,light:0,shed:0});
        if(web)GFX.light(fx_,fy,360,iris.l,.9,.28,{z:30});
        let first=true;
        for(const e of X.onScreen(300)){
          if(Math.hypot(e.x-fx_,(e.y-fy)/FSY)>260)continue;
          X.dmg(e,Math.min(D*.03,e.hp*.15),{crit:true,kb:0,stun:.3});
          K.knock(e,{dir:Math.atan2((e.y-fy)/FSY,e.x-fx_),dist:170,up:700,stun:.4,fx:0});
          if(first){first=false;K.ehit(e,{pal:steel,pw:.9,ring:0,light:0});}
        }
      });
      // The re-stab: a heavier step that shifts the body and tugs the whole web.
      later(g.rs,()=>{
        const fx_=g.ux,fy=g.uy,dir=Math.atan2((fy-B0.y)/FSY,fx_-B0.x);
        C.shake(g.n%2===0?.34:.2);
        if(g.n%2===0){note(98+12*(g.n>>1),0,.22);X.sfx('slash',.45,.35);}
        K.sparks(fx_,fy,18,{pal:g.n%2?iris:steel,n:low?3:6,dir,spread:.9,sp:[200,600],up:380,life:[.12,.3]});
        K.debris(fx_,fy,{n:low?4:8,r:44,sp:[180,540],up:700,size:17,c:'#3c3744'});
        K.dust(fx_,fy,{r:48,n:low?3:7,sp:[180,520],s:1.4,a:.45,life:1,c:'#1c1926',c3:'#4a4560'});
        if(web)GFX.light(fx_,fy,280,iris.l,.8,.22,{z:30});
        for(const e of X.onScreen(300)){
          if(Math.hypot(e.x-fx_,(e.y-fy)/FSY)>200)continue;
          K.knock(e,{dir:Math.atan2((e.y-fy)/FSY,e.x-fx_),dist:90,up:420,stun:.3,fx:0});
        }
      });
    }
    later(1.85,()=>{if(window.MK?.on())MK.play('raise',{yaw,blend:.1});C.SND.shing(.9,.2);});
    later(1.78,()=>{const b=bodyAt(1.78),h=spinneret(b);K.flare(h.x,h.y,h.z,{s:120,sx:1.6,sy:.5,pal:iris,dur:.5,gain:1.5});});
    // The spiral sweeps inward; each body is caught as it passes over.
    later(1.95,()=>{
      const foes=X.onScreen(300);
      let shown=0;
      for(const e of foes){
        const rho=Math.hypot((e.x-c.x)/RX,(e.y-c.y)/RY),u=sat(1-rho);
        const when=Math.max(0,2.0+1.4*sat((u-.12)/.58)-1.95);
        const ang=Math.atan2(e.y-c.y,e.x-c.x);
        let best=ring[0],bd=9;
        for(const g of ring){
          const ga=Math.atan2(g.ty-c.y,g.tx-c.x),d=Math.abs(Math.atan2(Math.sin(ga-ang),Math.cos(ga-ang)));
          if(d<bd){bd=d;best=g;}
        }
        later(when,()=>{
          if(e.dead)return;
          X.dmg(e,Math.min(D*.02,e.hp*.1),{crit:true,kb:0,stun:.5});
          K.knock(e,{dir:Math.atan2((c.y-e.y)/FSY,c.x-e.x),dist:60,up:340,stun:1.4,fx:0});
          if(shown++<(low?5:10)){
            snared.push({e,t:1.95+when,r:best.r,u:mix(.15,.72,u),ang:hash(e.x)*6,x:e.x,y:e.y,z:e.z+e.h*.45});
            K.sparks(e.x,e.y,e.z+e.h*.5,{pal:iris,n:low?3:5,sp:[120,380],up:160,life:[.1,.25]});
          }
        });
      }
    });
    later(2.6,()=>{C.move({x:x+30,y:y-340,zoom:.86,tilt:.12,roll:-.012},1.0,'io');C.SND.inhale(.42,.26);});
    later(3.58,()=>{C.SND.inhale(.3,.3);});
    later(3.62,()=>{C.hush(.22,{a:.55,c:'#c9c2ee'});if(drone)drone.stop();});
    later(climax,()=>{
      const foes=X.onScreen(300);
      C.SND.hit(.78);C.shake(1);hitstop=Math.max(hitstop,.12);
      C.peak(c.x,c.y-260,{ca:.006,blur:.1,tint:'#7a6cff',a:.26});
      if(web)GFX.light(c.x,c.y,1500,'#b7a6ff',1.25,.5,{z:200});
      const b=bodyAt(climax),h=spinneret(b);
      K.flare(h.x,h.y,h.z,{s:240,sx:3,sy:.25,pal:iris,dur:.3,gain:2});
      C.move({x,y:y-300,zoom:.76,tilt:.2,roll:0},.22,'out');
      GFX.ambient(.74,.72,.86,2.2);
      if(window.MK?.on())MK.play('slam',{yaw,blend:.05});
      X.sfx('slash',.62,.7);
      for(const g of legs){
        const ex=mix(g.ux,c.x,.4),ey=mix(g.uy,c.y,.4),dir=Math.atan2((ey-g.uy)/FSY,ex-g.ux);
        K.coolLine(g.ux,g.uy,ex,ey,{w:30,pal:dusk,life:2,hot:.45,grow:.18,shed:0});
        K.sparks(g.ux,g.uy,16,{pal:g.k%2?iris:steel,n:low?5:11,dir,spread:.35,sp:[400,1100],up:260,life:[.15,.4]});
        K.debris(g.ux,g.uy,{n:low?3:6,r:36,sp:[220,640],up:700,size:16,c:'#3c3744'});
      }
      let n=0;
      for(const e of foes){
        const dir=Math.atan2((e.y-c.y)/FSY,e.x-c.x),k=n++;
        const at=climax+.03*Math.min(6,k);
        K.knock(e,{dir,dist:420,up:1100,stun:.8,fx:0});
        if(k<(low?6:14))cuts.push({x:e.x,y:e.y,z:e.z+e.h*.5,s:Math.max(80,e.h*.6),a:-.5+hash(e.x*.1)*.5,at});
        // Cut bodies spill dark shards and steel sparks along the cut.
        if(k<(low?4:10)){
          K.debris(e.x,e.y,{n:low?3:6,r:30,sp:[260,760],up:820,size:12,c:'#1b1526'});
          K.sparks(e.x,e.y,e.z+e.h*.5,{pal:steel,n:low?3:7,dir,spread:.6,sp:[380,1000],up:260,life:[.1,.3]});
          puff({x:e.x,y:e.y,z:e.z+e.h*.4},2,1.2);
        }
      }
      foes.slice().sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,6)
        .forEach((e,j)=>K.ehit(e,{pal:steel,pw:.85,ring:0,light:0}));
      C.sweep(c.x,c.y,D,{list:foes,speed:7000,max:.2});
      later(.1,()=>{C.SND.shing(.7,.4);note(98,0,.25);C.shake(.5);});
    });
    // Exit: legs fold in, the body draws up, then the whole spider bursts apart into daggers.
    later(4.3,()=>{C.SND.inhale(.35,.3);note(196,0,.12);});
    later(BURST,()=>{
      const b=bodyAt(BURST-.01),bp=bodyParts(b,BURST,0),ctr={x:b.x,y:b.y,z:b.z};
      burst=true;
      const out=p=>{const dx=p.x-ctr.x,dy=(p.y-ctr.y)/FSY,l=Math.hypot(dx,dy)||1;return {x:dx/l,y:dy/l};};
      for(const g of legs){
        const pose=legPose(g,BURST,b),{hip,J,kn,f}=pose;
        shed(lerp3(kn,f,.3),g.L2/2.02*.42,g.tone,BURST,out(f));
        if(!low)shed(lerp3(kn,f,.75),g.L2/2.02*.36,g.tone,BURST,out(f));
        shed(lerp3(J,kn,.5),g.L1/2.02*.42,legC,BURST,out(kn));
        if(!low)shed(lerp3(hip,J,.5),dist3(hip,J)/2.02*.6,legA,BURST,out(J));
      }
      bp.parts.forEach((q,j)=>{if(low&&j%2)return;const p=step(q.a,q.d,q.len);shed(p,q.len*.42,q.pal,BURST,out({x:p.x+q.d.x*30,y:p.y+q.d.y*30*FSY}));});
      C.shake(.6);hitstop=Math.max(hitstop,.05);C.SND.shing(.6,.4);note(82,0,.3);X.sfx('slash',.7,.5);
      K.flare(ctr.x,ctr.y,ctr.z,{s:150,sx:2,sy:.35,pal:steel,dur:.3,gain:1.1});
      K.sparks(ctr.x,ctr.y,ctr.z,{pal:steel,n:low?8:16,sp:[500,1300],up:400,life:[.15,.45]});
      K.vsmoke(ctr.x,ctr.y-40,{s:240,z:ctr.z-60,dur:.8,rise:320,c:'#09080f',c2:'#2c2840',a:.5,lit:.3});
      puff({x:ctr.x,y:ctr.y,z:ctr.z-40},8,1.6);
      if(web)GFX.light(ctr.x,ctr.y,900,iris.l,1,.4,{z:ctr.z*.6});
    });
    later(5.2,()=>{C.back(.75);GFX.ambient(1,1,1,1.6);});
    later(end,()=>X.ultStop());
  }
  window.AssassinLoom={cast,name:'천라지망',desc:'검은 안개 위로 단검 다리 여덟 개를 가진 그림자 거미가 내려와 전장 곳곳을 찍고, 다리 사이에 강선 그물을 쳐 화면의 모든 적을 옭아맨다. 거미가 다리를 한꺼번에 오므리면 그물째 모든 적이 베인다.'};
})();

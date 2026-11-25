// 천라지망 — a shadow spider on dagger legs pins the whole field, spins a steel web over it and draws it shut.
'use strict';
(() => {
  const X=RPG.sv,K=K3,F=FX3,FSY=X.FSY,pi=Math.PI;
  const steel={d:'#090e26',b:'#5087b4',m:'#abdcf0',h:'#f2fcff',l:'#87c3ea',s:'#d9f6ff'};
  const iris={d:'#130727',b:'#7140be',m:'#e093fb',h:'#fbe8ff',l:'#bb7ce3',s:'#f4beff'};
  const dusk={d:'#0b0a1c',b:'#3b3f6c',m:'#7f89b8',h:'#e6ecff',l:'#7d86c8',s:'#cfd6ff'};
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
    const climax=3.85,end=6.0,life=6.05;
    const RX=Math.min(hw*.9,hh*2.2),RY=Math.min(hh*.8,RX*.46);
    const c={x,y:y-RY*.08};
    const B0={x,y:y-240,z:470};
    const mesh={data:new Float32Array(5600*12),n:0};
    const castRun=X.V.draws;
    const active=()=>lock&&RPG.mode==='surv'&&X.V.ultId===id&&X.V.draws===castRun;
    const later=(t,fn)=>after(t,()=>{if(active())fn();});
    const yaw=pl.f>0?0:pi;
    // Eight feet ring the field. The planting order hops left and right, back and front.
    const feetA=[-1.02,-.36,.30,.98],order=[5,1,6,2,4,0,7,3],legs=[];
    for(let i=0;i<8;i++){
      const side=i<4?-1:1,k=i%4,phi=side>0?feetA[k]:pi-feetA[k];
      legs.push({i,side,k,phi,tx:c.x+RX*Math.cos(phi)*(.93+.07*hash(i)),ty:c.y+RY*Math.sin(phi)*(.9+.1*hash(i+9)),
        hx:side*(44+22*k),hy:(k-1.6)*36,hz:-28-14*Math.abs(k-1.5),roll:side*(.9+.25*k),cut:0,shed:0});
    }
    order.forEach((i,n)=>{const g=legs[i];g.n=n;g.at=.9+n*.22;g.land=g.at+.2;g.sever=climax+.05+.025*n;g.crack=4.02+.07*n;});
    let reach=0;
    for(const g of legs){
      reach=Math.max(reach,Math.hypot(g.tx-B0.x-g.hx,(g.ty-B0.y-g.hy)/FSY,B0.z+g.hz+26));
    }
    const L1=reach*.47,L2=reach*.62,len1=L1/2.02,len2=L2/2.02;
    const ring=[...legs].sort((a,b)=>Math.atan2(a.ty-c.y,a.tx-c.x)-Math.atan2(b.ty-c.y,b.tx-c.x));
    ring.forEach((g,j)=>{g.r=j;});
    const rings=low?3:4,segs=8*rings;
    // The thorax, the spinneret under it and the hips all ride on one breathing, lurching body.
    function bodyAt(t){
      const form=ease((t-.55)/.45),rise=ease((t-4.15)/1.35),pull=outE((t-climax)/.16);
      let ox=0,oy=0,oz=14*Math.sin(t*2.3)+8*Math.sin(t*3.7+1);
      for(const g of legs){
        const a=t-g.land;
        if(a>0&&a<1.4){
          const s=Math.exp(-4.2*a)*Math.sin(12*a),dx=g.tx-B0.x,dy=g.ty-B0.y,l=Math.hypot(dx,dy)||1;
          ox+=dx/l*46*s;oy+=dy/l*26*s;oz-=34*s;
        }
      }
      return {x:B0.x+ox,y:B0.y+oy,z:B0.z+oz-(1-form)*140-150*pull*(1-rise)+300*rise,form,rise,pull};
    }
    function footAt(g,t,hip){
      const fold={x:hip.x+g.side*(300+60*g.k),y:hip.y+g.hy*1.5+50,z:Math.max(60,hip.z-430+26*Math.sin(t*3+g.i))};
      if(t<g.at)return fold;
      const lift={x:mix(hip.x,g.tx,.48),y:mix(hip.y,g.ty,.48),z:hip.z+210};
      if(t<g.at+.12)return lerp3(fold,lift,ease((t-g.at)/.12));
      if(t<g.land)return lerp3(lift,{x:g.tx,y:g.ty,z:-26},((t-g.at-.12)/.08)**2);
      const slide=.4*outE((t-climax)/.18),bite=Math.exp(-7*(t-g.land))*Math.sin(16*(t-g.land));
      return {x:mix(g.tx,c.x,slide),y:mix(g.ty,c.y,slide),z:-26-8*slide-14*bite};
    }
    // Two-bone reach: the knee bends outward along the leg's own heading and up.
    function kneeAt(g,h,f){
      const dx=f.x-h.x,dy=(f.y-h.y)/FSY,dz=f.z-h.z,d0=Math.hypot(dx,dy,dz)||1;
      const ux=dx/d0,uy=dy/d0,uz=dz/d0,d=Math.min(d0,(L1+L2)*.998);
      const a=(L1*L1-L2*L2+d*d)/(2*d),r=Math.sqrt(Math.max(0,L1*L1-a*a));
      const ox=Math.cos(g.phi)*.7,oy=Math.sin(g.phi)*.7,oz=.72,dot=ox*ux+oy*uy+oz*uz;
      const nx=ox-dot*ux,ny=oy-dot*uy,nz=oz-dot*uz,nl=Math.hypot(nx,ny,nz)||1;
      return {x:h.x+ux*a+nx/nl*r,y:h.y+(uy*a+ny/nl*r)*FSY,z:h.z+uz*a+nz/nl*r};
    }
    const unit=(a,b)=>{const dx=b.x-a.x,dy=(b.y-a.y)/FSY,dz=b.z-a.z,l=Math.hypot(dx,dy,dz)||1;return {x:dx/l,y:dy/l,z:dz/l};};
    const step=(p,d,s)=>({x:p.x+d.x*s,y:p.y+d.y*s*FSY,z:p.z+d.z*s});
    function blade(p,d,len,roll,pal,a,shadow){
      if(!(len>3)||a<.01)return;
      const prev=step(p,d,-8);
      if(!web){window.AssassinBlades?.canvas?.(fx,p,prev,len,roll,pal,a,0);return;}
      const ground=F.ground;
      if(!shadow)F.ground=false;
      try{window.AssassinBlades?.draw(p,prev,len,roll,pal,a,8);}finally{F.ground=ground;}
    }
    // A segment hangs from its pommel at a. cut shortens it from the tip; the hilt stays put.
    function limb(a,b,len,roll,pal,alpha,shadow,cut){
      const d=unit(a,b),l=len*(1-cut);
      blade(step(a,d,l*.88),d,l,roll,pal,alpha,shadow);
      return {d,tip:step(a,d,l*2.02)};
    }
    const bits=[];
    function shed(p,d,len,pal,t,n){
      for(let j=0;j<n;j++){
        const s=j%2?1:-1,h=hash(bits.length*7.1+t*13);
        bits.push({p,at:t,life:.46+.16*h,len:len*(.7+.5*h),pal,roll:h*6,d,spin:s*(8+6*h),
          v:{x:-d.y*s*190+d.x*80,y:d.x*s*190+d.y*80,z:200+240*h}});
      }
      if(!low)for(let j=0;j<3;j++){
        const a=hash(t*31+j)*2*pi,v=40+90*hash(j+t);
        GFX.pt({x:p.x,y:p.y,z:Math.max(6,p.z),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:60+110*hash(j*3+t),g:-25,drag:1.6,
          life:.6+.4*hash(j+2),s:22+16*hash(j+5),grow:55,m:5,b:'alpha',c:GFX.rgb('#0c0b16'),c2:'#000000',c3:'#3a2f5c',er:.9,ns:1.3,w:1,a:.62,L:0});
      }
    }
    // Snared bodies: a steel loop at the waist and a tether to the nearest spoke.
    const snared=[];
    // Spokes run from a point on each lower leg near the tip to the spinneret under the thorax.
    function spinneret(b){return {x:b.x,y:b.y+60,z:b.z-150};}
    function render(t){
      if(!active())return;
      mesh.n=0;
      const b=bodyAt(t),hub=spinneret(b),m=web?K.mats():null;
      const core=[],glow=[],vapour=[];
      const add=(arr,seg)=>{
        if(seg.length<2)return;
        if(arr.length){const a=arr[arr.length-1],q=seg[0];arr.push({x:a.x,y:a.y,z:a.z,w:0},{x:q.x,y:q.y,z:q.z,w:0});}
        for(const q of seg)arr.push(q);
      };
      const filament=(pts,gilt)=>{if(web)strand(mesh,pts,gilt);else canvasStrand(fx,pts,gilt);};
      const hush=ease((t-3.6)/.2)*(1-ease((t-climax)/.05));
      const flash=Math.exp(-Math.max(0,t-climax)*9)*(t>=climax?1:0);
      // Ink floods out from under the hero and soaks back in at the end.
      if(web){
        const r=mix(0,980,outE(t/.9))+260*ease((t-.9)/2.7),shrink=1-ease((t-4.9)/1.05);
        if(shrink>0)F.quad(m.soot,x,y-40,r*shrink,r*shrink*.92,.4,{a:.9});
      }
      // Kunai thrown into the dark above become the spider's eyes.
      if(t>.24&&t<.62){
        for(let j=0;j<8;j++){
          const u=sat((t-.24-.012*j)/.3);
          if(u<=0||u>=1)continue;
          const ex=b.x+(j-3.5)*30,from={x:x+(pl.f>0?28:-28),y:y,z:150};
          const to={x:ex,y:B0.y+60,z:B0.z-10};
          const at=v=>({x:mix(from.x,to.x,v)+(j-3.5)*60*Math.sin(pi*v),y:mix(from.y,to.y,v),z:mix(from.z,to.z,v)+240*Math.sin(pi*v)});
          const p=at(u),q=at(Math.max(0,u-.04)),d=unit(q,p);
          blade(p,d,40,u*20+j,steel,1-ease((u-.75)/.25),false);
          add(core,[{...at(Math.max(0,u-.35)),w:0},{...at(Math.max(0,u-.12)),w:3},{...p,w:0}]);
        }
      }
      // Legs.
      const P=[];
      for(const g of legs){
        const hip={x:b.x+g.hx,y:b.y+g.hy,z:b.z+g.hz},f=footAt(g,t,hip),kn=kneeAt(g,hip,f);
        const alpha=b.form*sat(.25+.75*ease((t-.62-.03*g.n)/.3));
        const lowCut=ease((t-g.crack)/.5),upCut=ease((t-g.crack-.34)/.46);
        const pose={g,hip,f,kn,alpha,anchor:lerp3(f,kn,.09)};
        P.push(pose);
        if(alpha<=.01)continue;
        const tone=g.k%2?legA:legB;
        let lo={tip:f};
        if(lowCut<1)lo=limb(kn,f,len2,g.roll,tone,alpha,true,lowCut);
        if(upCut<1)limb(kn,hip,len1,g.roll+.7,legC,alpha,false,upCut);
        if(lowCut>0&&lowCut<1){
          const want=Math.floor(lowCut*4);
          while(g.shed<want){g.shed++;shed(lo.tip,lo.d,len2*.2,tone,t,low?1:2);}
        }
        if(!web)continue;
        // Knee: a violet bead with black vapour bleeding upward, brighter while the spider strains.
        const strain=.45+.55*Math.exp(-3*Math.max(0,t-g.land))+hush*.8+flash;
        const kw=(14+8*Math.sin(t*5+g.i))*alpha*(1-upCut)*strain;
        if(kw>.5){
          add(glow,[{x:kn.x-kw*3.2,y:kn.y,z:kn.z,w:0},{...kn,w:kw},{x:kn.x+kw*3.2,y:kn.y,z:kn.z,w:0}]);
          add(glow,[{x:kn.x,y:kn.y,z:kn.z-kw*2.2,w:0},{...kn,w:kw*.7},{x:kn.x,y:kn.y,z:kn.z+kw*2.2,w:0}]);
          if(!low){
            const seg=[];
            for(let j=0;j<6;j++){const v=j/5;seg.push({x:kn.x+Math.sin(t*2.1+g.i+v*3)*v*22,y:kn.y-v*6,z:kn.z+v*150,w:26*Math.sin(pi*(v*.85+.1))*alpha*(1-upCut)});}
            add(vapour,seg);
          }
        }
        // Planting flash along the lower blade.
        const plant=t-g.land;
        if(plant>-.06&&plant<.16){
          const k=1-Math.abs(plant-.02)/.14,d=unit(kn,f);
          add(core,[{...step(kn,d,L2*.35),w:0},{...step(kn,d,L2*.8),w:9*k},{...f,w:0}]);
        }
      }
      // Spokes.
      const spoke=(pose,u,taut)=>{
        const a=pose.anchor,s=hub,g=pose.g;
        const p=lerp3({x:a.x,y:a.y,z:Math.max(60,a.z)},s,u);
        const sag=(70*(1-taut))*Math.sin(pi*u);
        const tremble=Math.sin(9*u-t*14+g.i)*Math.sin(pi*u)*18*(1-taut)*Math.exp(-Math.max(0,t-(1.8+.06*g.r))*.9);
        p.z-=sag-tremble;
        return p;
      };
      const taut=Math.max(ease((t-3.3)/.3),hush);
      const pulse=t=>.7*t+.9*Math.max(0,t-2)**2;
      const ph=pulse(t);
      const cool=(sev,u)=>{
        const a=t-sev;
        if(a<0)return {k:0,fall:0};
        return {k:a,fall:ease((a-.08-.25*(1-u))/.55)};
      };
      const crumble=(seed)=>sat((t-4.85-.35*hash(seed))/.8);
      for(const pose of P){
        const g=pose.g,born=1.78+.06*g.r,grow=ease((t-born)/.22);
        if(grow<=0||pose.alpha<=.01)continue;
        const sev=g.sever,n=low?14:20,pts=[];
        const cut=.42+.16*hash(g.i+3);
        const broken=t>=sev;
        for(let j=0;j<=n;j++){
          const u=j/n*grow,p=spoke(pose,u,taut);
          const wave=Math.exp(-(((u-((ph+g.r*.37)%1))*6)**2));
          if(broken){
            const piece=u<cut?0:1,free=piece?(u-cut)/(1-cut):(cut-u)/cut;
            const fc=cool(sev,1-free),dt=fc.k;
            const back=piece?lerp3(spoke(pose,cut,taut),hub,.3*free):lerp3(spoke(pose,cut,taut),pose.anchor,.3*free);
            const rec=.35*(1-free)*ease(dt/.18);
            p.x=mix(p.x,back.x,rec)+Math.sin(14*dt+g.i+u*5)*Math.exp(-3*dt)*70*(1-free);
            p.y=mix(p.y,back.y,rec);
            const drop=Math.max(fc.fall,ease((dt-.25)/.6));
            p.z=Math.max(5,mix(p.z,5+30*Math.abs(Math.sin(u*17+g.i)),drop));
            p.heat=1.5*Math.exp(-dt*3.3)+.05;p.tint=mix(.4,1,ease(dt/.35))*(1-.8*ease((dt-.55)/.7));
            const cr=crumble(g.i*13+j);
            p.alpha=pose.alpha*(hash(g.i*97+j*3.1)>cr?1:0)*(Math.abs(u-cut)<.012?0:1);
          }else{
            p.heat=.12+.55*wave*ease((t-2.1)/.8)+.3*taut+.9*Math.exp(-(((u-grow)*14)**2))*(1-ease((t-born-.3)/.2));
            p.tint=g.r%2?.82:.2;p.alpha=pose.alpha;
          }
          p.w=(g.r%3===0?13:9)*(.8+.2*Math.sin(pi*u))*(1+.5*flash);
          pts.push(p);
        }
        if(broken){
          const k=Math.round(cut*n/grow);
          filament(pts.slice(0,Math.max(2,k)),.6);filament(pts.slice(Math.min(n-1,k+1)),.6);
        }else filament(pts,g.r%2?.82:.2);
      }
      // The closing cut: a white edge races up every spoke from the foot to the spinneret.
      if(web&&t>=climax-.02&&t<climax+.2){
        const k=sat((t-climax+.02)/.1),fade=1-sat((t-climax-.06)/.14);
        for(const pose of P){
          if(pose.alpha<=.01)continue;
          const seg=[];
          for(let j=0;j<=6;j++){const u=j/6*k;seg.push({...spoke(pose,u,1),w:(j===0||j===6?0:18*fade*(.5+.5*u))});}
          add(core,seg);
        }
      }
      // The capture spiral winds from the feet inward.
      const sMax=segs*sat((t-2.0)/1.4),fr=s=>mix(.12,.7,s/segs);
      const posesByRing=[];
      for(const pose of P)posesByRing[pose.g.r]=pose;
      for(let s=0;s<segs&&s<sMax;s++){
        const A=posesByRing[s%8],Bp=posesByRing[(s+1)%8];
        if(A.alpha<=.01||Bp.alpha<=.01)continue;
        const vis=Math.min(1,sMax-s),sev=climax+.02+.012*((s*5)%segs),broken=t>=sev,pts=[];
        const n=low?5:7;
        for(let j=0;j<=n;j++){
          const v=j/n*vis,u0=fr(s+v);
          const pa=spoke(A,u0,taut),pb=spoke(Bp,u0,taut),p=lerp3(pa,pb,v);
          const sag=(46+40*(1-u0))*(1-.75*taut)*Math.sin(pi*v);
          p.z=Math.max(8,p.z-sag+Math.sin(t*11+s+v*6)*10*(1-taut)*Math.sin(pi*v));
          const head=Math.exp(-(((s+v-sMax)*1.3)**2))*(t<3.45?1:0);
          const wave=Math.exp(-(((((u0*1.4+ph*.8)%1)-.5)*7)**2));
          if(broken){
            const piece=v<.5?0:1,free=piece?(v-.5)*2:(.5-v)*2,dt=t-sev;
            const rec=.3*free*ease(dt/.16),anc=piece?pb:pa;
            p.x=mix(p.x,anc.x,rec)+Math.sin(15*dt+s)*Math.exp(-3.2*dt)*50*free;p.y=mix(p.y,anc.y,rec);
            const drop=Math.max(ease((dt-.06-.2*(1-free))/.45),ease((dt-.3)/.55));
            p.z=Math.max(4,mix(p.z,4+20*Math.abs(Math.sin(v*11+s)),drop));
            p.heat=1.4*Math.exp(-dt*3.4)+.05;p.tint=mix(.5,1,ease(dt/.35))*(1-.8*ease((dt-.55)/.7));
            p.alpha=(hash(s*41+j*2.3)>crumble(s*7+j)?1:0)*(Math.abs(v-.5)<.03?0:1);
          }else{
            p.heat=.1+.42*wave*ease((t-2.3)/.8)+1.1*head+.35*taut;p.tint=s%3===1?.25:.9;p.alpha=1;
          }
          p.w=(s%4===0?10:7)*(.85+.15*Math.sin(pi*v))*(1+.6*head)*(1+.5*flash);
          pts.push(p);
        }
        if(broken){filament(pts.slice(0,Math.ceil(n/2)),.7);filament(pts.slice(Math.ceil(n/2)+1),.7);}
        else filament(pts,s%3===1?.25:.9);
        if(vis<1&&!broken&&web){const q=pts[pts.length-1];add(core,[{x:q.x-24,y:q.y,z:q.z,w:0},{...q,w:8},{x:q.x+24,y:q.y,z:q.z,w:0}]);}
      }
      // Snares.
      for(const sn of snared){
        const e=sn.e,dt=t-sn.t;
        if(dt<0)continue;
        const snap=t>=climax,bind=ease(dt/.18);
        if(e.dead&&!snap)continue;
        if(!snap){sn.x=e.x;sn.y=e.y;sn.z=e.z+e.h*.45;}
        const ex=sn.x,ey=sn.y,ez=sn.z;
        const loop=[],r=Math.max(60,e.h*.42)*(1.25-.25*bind);
        const go=snap?1-ease((t-climax)/.12):1;
        if(go>0){
          for(let j=0;j<=16;j++){
            const u=j/16,a=sn.ang+u*pi*2.3;
            loop.push({x:ex+Math.cos(a)*r,y:ey+Math.sin(a)*r*FSY,z:ez+e.h*.18*(u-.5),w:5+2*Math.sin(pi*u),
              heat:.3+.5*Math.sin(pi*u)**2+1.2*(snap?1:0),alpha:bind*go,tint:.85});
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
      // Eyes: eight horizontal glints on the front of the head, opening one by one.
      if(web&&b.form>0){
        const eyes=[[-60,30,20,1],[-22,40,28,1.4],[22,40,28,1.4],[60,30,20,1],[-92,-4,15,.8],[-38,6,16,.9],[38,6,16,.9],[92,-4,15,.8]];
        const open=[2,1,0,3,6,5,4,7];
        const fade=1-ease((t-4.3)/.6);
        eyes.forEach(([dx,dz,s,k],j)=>{
          const o=ease((t-.66-.04*open[j])/.07)*fade;
          if(o<=0)return;
          const blink=1-.8*Math.exp(-(((t-1.7-j*.013)*30)**2));
          const w=s*o*blink*(1+1.1*hush+1.5*flash)*(.85+.15*Math.sin(t*7+j)),q={x:b.x+dx*.8,y:b.y+60,z:b.z+dz*1.4+300};
          add(core,[{x:q.x-s*2.2,y:q.y,z:q.z,w:0},{x:q.x-s*.7,y:q.y,z:q.z,w:w*.9},{x:q.x+s*.7,y:q.y,z:q.z,w:w*.9},{x:q.x+s*2.2,y:q.y,z:q.z,w:0}]);
          add(glow,[{x:q.x-s*4,y:q.y,z:q.z,w:0},{x:q.x-s*1.2,y:q.y,z:q.z,w:w*2.4*k},{x:q.x+s*1.2,y:q.y,z:q.z,w:w*2.4*k},{x:q.x+s*4,y:q.y,z:q.z,w:0}]);
        });
      }
      // Blade shards from the cracking legs.
      for(let i=bits.length-1;i>=0;i--){
        const s=bits[i],a=t-s.at;
        if(a<0)continue;
        if(a>=s.life){bits.splice(i,1);continue;}
        const ang=s.spin*a,cs=Math.cos(ang),sn=Math.sin(ang);
        const d={x:s.d.x*cs-s.d.y*sn,y:s.d.x*sn+s.d.y*cs,z:s.d.z*cs+.5*sn};
        const l=Math.hypot(d.x,d.y,d.z)||1;d.x/=l;d.y/=l;d.z/=l;
        const p={x:s.p.x+s.v.x*a,y:s.p.y+s.v.y*a*FSY,z:Math.max(4,s.p.z+s.v.z*a-900*a*a)};
        blade(p,d,s.len*(1-sat((a-.18)/(s.life-.18))),s.roll+ang*.7,s.pal,1,false);
      }
      if(web){
        // The body: an abdomen of black smoke behind a smaller thorax, lit cold from above.
        if(window.VOL?.on&&b.form>0){
          const dis=1-ease((t-4.15)/1.25),den=b.form*dis,glowK=.06+.25*hush+.6*flash;
          if(den>.01){
            const opt=(s,seed,o)=>({ex:s*1.25,ey:s,ez:s*.92,pa:[.5+.32*b.form+.12*b.rise,.6,2.3,t*.22],pb:[glowK,1,1,.5+.4*b.rise],
              dens:11*den,seed,smoke:1,fire:1,cA:iris.d,cB:iris.b,cM:iris.m,cC:iris.h,cS:'#030208',cK:'#2e2a4c',amb:.2,key:1.25,rim:.34,glow:.25,steps:20,lit:.65,flow:.35,...o});
            VOL.add('blast',b.x,b.y-170,b.z+170,opt(520,3.1));
            VOL.add('blast',b.x,b.y+40,b.z-10,opt(300,7.7));
          }
        }
        if(mesh.n)F.q.push({L:0,ord:-3,render:paint,mesh,shadow:1,t},{L:1,ord:6,render:paint,mesh,shadow:0,t});
        if(core.length>1)F.ribbon(m.trC,core,{cA:steel.b,cB:steel.m,cM:steel.h,cC:'#ffffff',gain:2.6,ero:.05,ord:9,ulen:260});
        if(glow.length>1)F.ribbon(m.glowO,glow,{cA:iris.d,cB:iris.b,cM:iris.m,cC:iris.h,gain:2.2,ord:9,ulen:200});
        if(vapour.length>1)F.ribbon(m.trB,vapour,{cA:'#05040b',cB:'#140f26',cM:'#30285a',cC:iris.b,a:.8,gain:1.1,ero:.14,ord:7,ulen:320,t0:t*.6});
      }
    }
    if(web)GFX.add(life,(k,t)=>render(t));else X.draw(life,k=>render(life*k));
    // --- timeline ---
    C.move({x,y:y-380,zoom:1.08,tilt:.08,roll:-.012},.5);
    GFX.ambient(.6,.6,.72,3);C.SND.inhale(.5,.28);
    if(window.MK?.on())MK.play('iaiReady',{yaw,blend:.06});
    K.flare(x,y,X.BODY*.6,{s:120,sx:2.6,sy:.2,pal:steel,dur:.26});
    later(.24,()=>{C.SND.shing(1.2,.2);note(880,0,.12);});
    later(.58,()=>{
      note(196,0,.16);
      K.flare(B0.x,B0.y+60,B0.z-10,{s:150,sx:2.2,sy:.22,pal:iris,dur:.3});
      if(web)GFX.light(B0.x,B0.y,620,iris.l,.55,.6,{z:B0.z*.5});
    });
    // The eyes open one by one where the kunai vanished, and flare again in the held breath.
    [[-60,30,20],[-22,40,28],[22,40,28],[60,30,20],[-92,-4,15],[-38,6,16],[38,6,16],[92,-4,15]].forEach(([dx,dz,s],j)=>{
      const q=tt=>{const b=bodyAt(tt);return [b.x+dx*.8,b.y+60,b.z+dz*1.4+300];};
      later(.66+.04*[2,1,0,3,6,5,4,7][j],()=>{const [ex,ey,ez]=q(1.2);K.flare(ex,ey,ez,{s:s*2.2,sx:2.4,sy:.32,pal:iris,dur:3.3,gain:1.6});});
      later(3.62+.012*j,()=>{const [ex,ey,ez]=q(3.7);K.flare(ex,ey,ez,{s:s*3.2,sx:2.8,sy:.3,pal:iris,dur:.4,gain:2.4});});
    });
    let drone;
    later(.9,()=>{drone=C.drone(58,.12);C.move({x,y:y-330,zoom:.84,tilt:.14,roll:.02},1.6,'lin');});
    for(const g of legs){
      later(g.land,()=>{
        const fx_=g.tx,fy=g.ty,dir=Math.atan2((fy-B0.y)/FSY,fx_-B0.x);
        C.shake(.25);note([147,165,175,196,220,247,262,294][g.n],sat((fx_-x)/RX*.5+.5)*2-1,.2);
        X.sfx('slash',.55+.05*g.n,.3);
        K.sparks(fx_,fy,24,{pal:steel,n:low?5:10,dir,spread:.8,sp:[220,760],up:420,life:[.14,.4]});
        K.debris(fx_,fy,{n:low?4:8,r:40,sp:[180,560],up:760,size:15,c:'#4a4553'});
        K.dust(fx_,fy,{r:30,n:low?3:6,sp:[160,460],s:1.1,a:.55,life:.9,c:'#2c2836',c3:'#8b84a0'});
        K.cool(fx_,fy,{kind:'crack',r:190,pal:iris,life:Math.max(2.4,5.85-g.land),hot:.4,grow:.07,light:0,shed:0});
        if(web)GFX.light(fx_,fy,320,iris.l,.9,.28,{z:30});
        let first=true;
        for(const e of X.onScreen(300)){
          if(Math.hypot(e.x-fx_,(e.y-fy)/FSY)>260)continue;
          X.dmg(e,Math.min(D*.03,e.hp*.15),{crit:true,kb:0,stun:.3});
          K.knock(e,{dir:Math.atan2((e.y-fy)/FSY,e.x-fx_),dist:170,up:700,stun:.4,fx:0});
          if(first){first=false;K.ehit(e,{pal:steel,pw:.9,ring:0,light:0});}
        }
      });
    }
    later(1.85,()=>{if(window.MK?.on())MK.play('raise',{yaw,blend:.1});C.SND.shing(.9,.2);});
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
    later(2.6,()=>{C.move({x:x+40,y:y-340,zoom:.9,tilt:.12,roll:-.012},1.0,'io');C.SND.inhale(.42,.26);});
    later(3.62,()=>{C.hush(.22,{a:.55,c:'#c9c2ee'});if(drone)drone.stop();});
    later(climax,()=>{
      const foes=X.onScreen(300);
      C.SND.hit(.78);C.shake(1);hitstop=Math.max(hitstop,.1);
      C.peak(c.x,c.y-260,{ca:.025,blur:.12,tint:'#7a6cff'});
      if(web)GFX.light(c.x,c.y,1500,'#b7a6ff',1.25,.5,{z:200});
      K.flare(B0.x,B0.y+60,B0.z-40,{s:240,sx:3,sy:.25,pal:iris,dur:.3,gain:2});
      C.move({x,y:y-280,zoom:.76,tilt:.2,roll:0},.22,'out');
      GFX.ambient(.74,.72,.86,2.2);
      if(window.MK?.on())MK.play('slam',{yaw,blend:.05});
      X.sfx('slash',.62,.7);
      for(const g of legs){
        const ex=mix(g.tx,c.x,.4),ey=mix(g.ty,c.y,.4),dir=Math.atan2((ey-g.ty)/FSY,ex-g.tx);
        K.coolLine(g.tx,g.ty,ex,ey,{w:30,pal:iris,life:2.3,hot:.55,grow:.18,shed:0});
        K.sparks(g.tx,g.ty,16,{pal:g.k%2?iris:steel,n:low?5:11,dir,spread:.35,sp:[400,1100],up:260,life:[.15,.4]});
      }
      for(const e of foes){
        const dir=Math.atan2((e.y-c.y)/FSY,e.x-c.x);
        K.knock(e,{dir,dist:420,up:1100,stun:.8,fx:0});
      }
      foes.slice().sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,6)
        .forEach(e=>K.ehit(e,{pal:iris,pw:1.1,ring:0,light:0}));
      C.sweep(c.x,c.y,D,{list:foes,speed:7000,max:.2});
      later(.1,()=>{C.SND.shing(.7,.4);note(98,0,.25);});
    });
    later(4.25,()=>{K.vsmoke(B0.x,B0.y-80,{s:420,z:B0.z,dur:1.5,rise:320,c:'#09080f',c2:'#3a3458',a:.6,lit:.4});});
    later(4.9,()=>{C.back(1);GFX.ambient(1,1,1,2);});
    later(end,()=>X.ultStop());
  }
  window.AssassinLoom={cast,name:'천라지망',desc:'검은 안개 위로 단검 다리 여덟 개를 가진 그림자 거미가 내려와 전장 곳곳을 찍고, 다리 사이에 강선 그물을 쳐 화면의 모든 적을 옭아맨다. 거미가 다리를 한꺼번에 오므리면 그물째 모든 적이 베인다.'};
})();

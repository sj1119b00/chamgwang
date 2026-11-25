// 월식낙인. The occluder, its forged corona, and its shadow share a world-space frame.
'use strict';
(() => {
  const X=RPG.sv, F=FX3, K=K3, fs=X.FSY, tau=Math.PI*2;
  const gold={d:'#1a1214',b:'#97532f',m:'#ffca80',h:'#fff1c9',l:'#f4b76b',s:'#ffe2a7'};
  const steel={d:'#090e18',b:'#445d83',m:'#9fc9de',h:'#e6f5fa',l:'#76aaca',s:'#dbe8ee'};
  const brand={...gold,l:'#887b69'};
  const sat=x=>Math.max(0,Math.min(1,x));
  const blend=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,t)=>{const u=sat((t-a)/(b-a));return u*u*(3-2*u);};
  const impact=3.16,life=4.86;
  const vertex=`attribute vec2 corner;
    uniform vec4 camera, placement;uniform vec2 halfView;
    varying vec2 ray;
    void main(){
      ray=corner*placement.w;
      vec2 p=(placement.xy+vec2(ray.x,ray.y)*placement.z+camera.xy)*camera.z;
      float c=cos(camera.w),s=sin(camera.w);
      gl_Position=vec4((p.x*c-p.y*s)/halfView.x,-(p.x*s+p.y*c)/halfView.y,0.,1.);
    }`;
  const fragment=`#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 ray;uniform mat3 axes;uniform vec4 state;uniform sampler2D grain;
    vec3 local(vec3 w){return vec3(dot(w,axes[0]),dot(w,axes[1]),dot(w,axes[2]));}
    float noise(vec3 p){
      vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      vec2 xy=i.xy+f.xy+vec2(37.,-17.)*i.z;
      vec2 v=texture2D(grain,(xy+.5)/256.).rg;return mix(v.x,v.y,f.z);
    }
    float folds(vec3 p){
      float a=noise(p*2.13+1.2);
      return .51*a+.30*noise(p*4.67+2.7*a)+.14*noise(p*10.4+2.*a)+.05*noise(p*24.+a);
    }
    void main(){
      float t=state.x,alive=state.y,fire=state.z;
      if(state.w>.5){
        vec2 p=ray*vec2(1.,1.57);
        float wav=folds(vec3(p*2.,t*.18));
        float rad=length(p),limb=rad-.94-(wav-.5)*.14;
        float moon=length(p+vec2(-.48+.08*sin(t),.12));
        float feather=1.-smoothstep(-.14,.18,limb);
        float umbra=feather*(.08+.70*smoothstep(.70,1.07,moon));
        float penumbra=exp(-max(0.,limb)*6.)*(.20+.12*wav);
        float glint=exp(-abs(limb)*29.)*(.18+.82*smoothstep(.83,1.3,moon))*(.45+.55*wav);
        float alpha=alive*clamp(umbra+penumbra,0.,.84);
        gl_FragColor=vec4((vec3(.013,.020,.031)+vec3(.23,.19,.12)*glint)*alpha,alpha);return;
      }
      // Ray/ellipsoid intersection. Ellipticity and lighting follow the tilted
      // weapon plane, including its edge-on attitude during the dive.
      vec3 shape=vec3(1.,.94,.23);
      vec3 o=local(vec3(ray.x,0.,-ray.y))/shape;
      vec3 d=local(normalize(vec3(0.,1.,.58)))/shape;
      float h=-dot(o,d)/dot(d,d);vec3 nearP=o+d*h;
      float r=length(nearP);
      if(r>1.54)discard;
      vec3 limb=nearP/max(.0002,r);
      float a=atan(limb.y,limb.x),dawn=.5+.5*cos(a-.54*sin(t*.91)-.57);
      float coil=folds(limb*3.1+vec3(t*.16,-t*.24,t*.07));
      float skin=folds(limb*7.3+vec3(0.,t*.29,-.5*t)+coil*1.8);
      float twist=.5+.5*sin(15.*a+7.*coil+7.*(r-1.)-t*1.6);
      float tendril=.5+.5*sin(38.*a+12.*coil+13.*(r-1.)-t*2.2);
      float plume=(.045+.18*coil*coil+.19*pow(twist,5.)*skin)*(.54+.92*dawn);
      float dist=max(0.,r-1.),outer=exp(-dist/max(.012,plume));
      float ribbon=pow(.51+.49*cos(80.*dist-8.*skin+4.*a+t*.7),4.);
      vec3 hot=mix(vec3(.28,.50,.66),vec3(1.1,.48,.13),smoothstep(.12,.76,dawn));
      float lobe=(.22+.82*twist*twist+.32*tendril)*(.52+skin);
      vec3 plasma=hot*outer*(.23+.63*ribbon)*lobe;
      plasma+=mix(vec3(.56,.77,.94),vec3(1.45,.99,.55),dawn)*exp(-dist*105.)*(.29+.73*skin);
      if(r>1.){
        float alpha=alive*outer*(.28+.63*lobe);
        gl_FragColor=vec4(plasma*alive*(.88+.7*fire),min(.95,alpha));return;
      }
      vec3 surf=nearP+d*sqrt(max(0.,1.-r*r)/dot(d,d));
      vec3 n=normalize(axes*(surf/shape));float fres=pow(1.-max(0.,dot(n,normalize(vec3(0.,1.,.58)))),2.5);
      float crust=folds(surf*5.+vec3(t*.04,0.,0.));
      float grainN=noise(surf*63.+crust*2.);
      float fracture=pow(max(0.,1.-abs(crust-.52)*32.),3.)*smoothstep(.44,.77,sin(surf.x*5.-surf.y*3.)*.5+.5);
      float light=clamp(.24+.68*dot(n,normalize(vec3(-.66,-.23,.72))),0.,1.);
      vec2 terrain=surf.xy+vec2(.046*sin(t*.43),.027*cos(t*.39));
      float offset=length(terrain-vec2(-.53+.29*sin(t*1.17),.16+.18*cos(t*1.28)));
      float crescent=smoothstep(.77,1.17,offset)*smoothstep(.32,.99,r);
      float striae=folds(surf*10.+vec3(3.2*crust,1.4*crust,1.));
      vec3 stone=mix(vec3(.012,.020,.031),vec3(.10,.136,.168),light*crust*(.67+.46*grainN));
      stone+=mix(vec3(.065,.113,.17),vec3(.30,.19,.105),dawn)*crescent*(.16+.69*striae)*(.5+.5*light);
      stone+=vec3(.12,.16,.19)*exp(-abs(offset-.97)*23.)*crescent*(.15+.77*striae);
      stone+=vec3(.13,.20,.27)*fres*(.48+crust)+hot*fracture*(.045+fire*.14);
      float rim=exp(-(1.-r)*54.)*(.23+.80*dawn)*(.53+.75*skin);
      vec3 lit=stone+hot*rim*(.55+fire*.65)+vec3(.68,.77,.87)*exp(-(1.-r)*210.);
      gl_FragColor=vec4(lit*alive,alive);
    }`;
  let gpu,failed=false;
  function setup(){
    if(gpu||failed||!F.on)return gpu;
    const program=gl.createProgram(),shaders=[];
    try{
      for(const [kind,src] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
        const s=gl.createShader(kind);shaders.push(s);gl.shaderSource(s,src);gl.compileShader(s);
        if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
        gl.attachShader(program,s);
      }
      gl.bindAttribLocation(program,0,'corner');gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      const old=gl.getParameter(gl.ARRAY_BUFFER_BINDING),buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,old);
      const u={};for(const n of ['camera','placement','halfView','axes','state','grain'])u[n]=gl.getUniformLocation(program,n);
      // One linear-filtered lookup interpolates eight independent voxel values.
      const cells=new Uint8Array(256*256),atlas=new Uint8Array(256*256*4);
      let seed=1974409;
      for(let i=0;i<cells.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;cells[i]=seed>>>24;}
      for(let y=0;y<256;y++)for(let x=0;x<256;x++){
        const i=256*y+x;atlas[i*4]=cells[i];atlas[i*4+1]=cells[((y-17)&255)*256+((x+37)&255)];atlas[i*4+3]=255;
      }
      const active=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE1);
      const oldTex=gl.getParameter(gl.TEXTURE_BINDING_2D),texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
      gl.bindTexture(gl.TEXTURE_2D,oldTex);gl.activeTexture(active);gpu={program,buffer,u,texture};
    }catch(e){gl.deleteProgram(program);failed=true;console.warn('Eclipse corona',e);}
    finally{for(const s of shaders)gl.deleteShader(s);}
    return gpu;
  }
  function paint(q){
    const {s,ground}=q,{program,buffer,u}=gpu;
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.enableVertexAttribArray(0);for(let j=1;j<4;j++)gl.disableVertexAttribArray(j);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.uniform4f(u.camera,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot);gl.uniform2f(u.halfView,W*.5,H*.5);
    gl.uniform4f(u.placement,ground?s.sx:s.x,ground?s.sy:s.y-s.z,ground?s.shadowR:s.r,ground?1.48:1.85);
    gl.uniformMatrix3fv(u.axes,false,s.axes);gl.uniform1i(u.grain,6);
    gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,gpu.texture);gl.activeTexture(gl.TEXTURE0);
    gl.uniform4f(u.state,s.t,ground?s.shadow:s.alpha,s.fire,+ground);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);F.stats.draws++;
  }
  function point(s,angle,radius=1,h=0){
    const a=s.axes,u=Math.cos(angle)*radius*s.r,v=Math.sin(angle)*radius*s.r,w=h*s.r;
    return {x:s.x+a[0]*u+a[3]*v+a[6]*w,y:s.y+(a[1]*u+a[4]*v+a[7]*w)*fs,z:s.z+a[2]*u+a[5]*v+a[8]*w};
  }
  function state(t,x,y,r,hw,f){
    const rise=smooth(.04,1.25,t),drift=smooth(.65,2.47,t),tip=smooth(2.35,2.90,t),dive=smooth(2.69,impact,t);
    const fire=smooth(2.08,2.71,t),out=smooth(impact,impact+.38,t);
    const yaw=-.34+.29*Math.sin(t*1.07)+.88*tip,tilt=-.52+.15*Math.sin(t*1.32)+1.10*tip;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt);
    const axes=new Float32Array([cy,sy,0,-sy*ct,cy*ct,st,sy*st,-cy*st,ct]);
    const ex=x-r*(.12+.39*rise+.18*drift),ey=y+r*(.20-.08*drift),ez=r*(.08+.33*rise+.10*drift);
    return {t,axes,x:blend(ex,f.x,dive)+out*r*.31,y:blend(ey,f.y,dive)+out*r*.083,z:blend(ez,r*.086,dive),
      r:r*blend(.055,.48,rise)*(1-.30*dive)*(1-.77*out),alpha:smooth(.075,.40,t)*(1-out),fire,
      sx:x+hw*blend(-1.18,1.18,smooth(.63,2.40,t)),sy:y+r*.10*Math.sin(t*2.2),shadowR:r*(.54+.67*rise),
      shadow:rise*(1-smooth(2.12,2.66,t))*.93};
  }
  function knife(s,i,n,x,y,r,contact){
    const ang=tau*i/n,scatter=i*2.39996,assemble=smooth(.08+.32*(i%5)/4,1.03+.028*(i%4),s.t);
    const phase=ang+.28*s.t+.32*Math.sin(s.t*.81)+.73*(1-assemble);
    const rad=1.07+.048*Math.sin(i*1.61),p=point(s,phase,rad,.07*Math.cos(phase*2+i*.7));
    const tangent=point(s,phase-.038,rad-.018,.06*Math.cos(phase*2+i*.7));
    const start={x:x+r*(.33+.48*Math.sin(i*1.83)**2)*Math.cos(scatter),y:y+r*.48*fs*Math.sin(scatter),z:18};
    const jump=Math.sin(Math.PI*assemble)*r*.18;
    const q={x:blend(start.x,p.x,assemble),y:blend(start.y,p.y,assemble),z:blend(start.z,p.z,assemble)+jump};
    const prev={x:q.x-(p.x-tangent.x)*assemble-(p.x-start.x)*.05*(1-assemble),y:q.y-(p.y-tangent.y)*assemble-(p.y-start.y)*.05*(1-assemble),z:q.z-(p.z-tangent.z)*assemble-r*.022*(1-assemble)};
    if(s.t>impact-.015){
      const u=sat((s.t-impact+.015)/(.66+.13*(i%4))),travel=1-(1-u)**2;
      const dx=r*(.40+.54*Math.sin(ang*.5)**2),dy=r*(.16+.39*Math.sin(ang));
      const strike=point(contact,phase,rad,.03);
      q.x=strike.x+dx*travel;q.y=strike.y+fs*dy*travel;q.z=blend(Math.max(0,strike.z),0,u)+r*(.075+.23*(i%4)/3)*4*u*(1-u);
      prev.x=q.x-dx*.014;prev.y=q.y-fs*dy*.014;prev.z=q.z-r*.016*(1-2*u);
    }
    return {q,prev,angle:phase*.9-.52+s.t*(s.t>impact?5:1.3),size:r*(.044+.012*(i%3)/2),
      alpha:smooth(.05+.29*(i%5)/4,.39+.29*(i%5)/4,s.t)*(1-smooth(impact+.26,impact+.85,s.t))};
  }
  function softShadow(s){
    const g=ctx;g.save();g.translate(s.sx,s.sy);g.scale(s.shadowR,s.shadowR*.64);
    const gradient=g.createRadialGradient(-.21,0,.17,0,0,1.4);
    gradient.addColorStop(0,'rgba(5,9,17,.23)');gradient.addColorStop(.58,'rgba(5,9,17,.56)');gradient.addColorStop(.78,'rgba(10,15,23,.68)');gradient.addColorStop(1,'rgba(14,21,31,0)');
    g.globalAlpha=s.shadow;g.fillStyle=gradient;g.fillRect(-1.45,-1.45,2.9,2.9);g.restore();
  }
  function softCorona(s){
    // The cold occulting body belongs on the opaque scene canvas: the effects
    // canvas is additively composited and would let the cobbles shine through.
    const g=ctx,a=s.axes,det=a[0]*(a[4]*fs-a[5])-a[3]*(a[1]*fs-a[2]);
    g.save();g.translate(s.x,s.y-s.z);
    g.transform(s.r*a[0],s.r*(a[1]*fs-a[2]),s.r*a[3],s.r*((a[4]*fs-a[5])+(Math.abs(det)<.15?.17:0)),0,0);g.globalAlpha=s.alpha;
    for(let i=0;i<39;i++){
      const angle=i*tau/39,w=.028+.105*Math.sin(i*2.14+s.t*.85)**2;
      const seg=.13+.20*Math.sin(i*1.22)**2;
      g.lineWidth=w;g.strokeStyle=i%4?'rgba(208,133,68,.26)':'rgba(148,198,221,.47)';
      g.beginPath();g.arc(0,0,1+.032*Math.sin(i+s.t),angle,angle+seg);g.stroke();
    }
    const surface=g.createRadialGradient(-.25,-.29,.06,0,0,1);
    surface.addColorStop(0,'#1d2a37');surface.addColorStop(.77,'#101925');surface.addColorStop(.95,'#18222f');surface.addColorStop(1,'#9d7655');
    g.fillStyle=surface;g.beginPath();g.arc(0,0,1,0,tau);g.fill();g.save();g.clip();
    for(let i=0;i<32;i++){
      const phi=i*2.399+s.t*.065,dr=.16+.90*((i*17%35)/35);
      g.strokeStyle=i%4?'rgba(101,128,148,.11)':'rgba(218,172,119,.22)';g.lineWidth=.005+(i%3)*.002;
      g.beginPath();g.arc(Math.cos(phi)*dr,Math.sin(phi)*dr,.026+(i%6)*.019,phi+.3,phi+2.4);g.stroke();
    }
    g.restore();g.lineWidth=.016;g.strokeStyle='#e4bf86';g.beginPath();g.arc(0,0,1,-.88+s.t*.14,1.92+s.t*.14);g.stroke();g.restore();
  }
  // A prominence is a lifted rope with both feet on the dark limb. Each
  // ignites at one foot, grows under tension, then drains through the other.
  function prominences(s,software){
    const starts=[.36,.81,1.22,1.64,2.03];
    const roots=[.73,2.96,4.85,1.36,3.74];
    for(let i=0;i<starts.length;i++){
      const age=s.t-starts[i],life=.91+.18*(i%2);
      if(age<=0||age>=life)continue;
      const u=age/life,grow=smooth(0,.32,u),drain=smooth(.58,1,u),flare=Math.sin(Math.PI*u);
      const span=.51+.14*Math.sin(i*2.1),root=roots[i]+s.t*.15,points=[];
      for(let k=0;k<=22;k++){
        const part=k/22,v=blend(drain,grow,part),arch=Math.sin(Math.PI*v);
        const curl=.036*Math.sin(v*16.-u*6.+i)*arch;
        const p=point(s,root+v*span+curl,1+arch*(.26+.20*flare)+curl,.16*arch*Math.cos(v*3.+i));
        p.w=s.r*(.026+.055*arch)*Math.sin(Math.PI*part)**.65*(1-.55*drain);points.push(p);
      }
      if(software){
        fx.save();fx.lineJoin='round';fx.lineCap='round';
        for(let k=1;k<points.length;k++){const a=points[k-1],b=points[k];fx.strokeStyle=hexA(i%3===1?steel.m:gold.m,.16+.50*flare);fx.lineWidth=Math.max(1,b.w*.42);fx.beginPath();fx.moveTo(a.x,a.y-a.z);fx.lineTo(b.x,b.y-b.z);fx.stroke();}fx.restore();
      }else AssassinCuts.sweep(points,i%3===1?steel:gold,{trail:true,t:s.t,fade:1-.89*flare,side:i%2?1:-1});
    }
  }
  function wake(s,x,y,r,hw,f,software){
    if(s.t<2.67||s.t>impact+.67)return;
    const head=Math.min(impact,s.t),tail=Math.max(2.67,s.t-.57),fade=smooth(impact+.05,impact+.67,s.t);
    if(head<=tail)return;
    for(let j=0;j<3;j++){
      const pts=[],angle=3.02+(j-1)*.69;
      for(let i=0;i<20;i++){
        const u=i/19,old=state(blend(tail,head,u),x,y,r,hw,f),p=point(old,angle+.17*Math.sin(3*u+j),.86,.05);
        p.w=r*(j===1?.088:.051)*(.08+.92*Math.sin(Math.PI*u)**.8);pts.push(p);
      }
      if(!software){AssassinCuts.sweep(pts,j===1?gold:steel,{t:s.t,trail:true,fade,side:j%2?1:-1});continue;}
      ctx.save();fx.save();fx.lineCap=ctx.lineCap='round';
      for(let i=1;i<pts.length;i++){
        const p=pts[i],v=pts[i-1];
        ctx.strokeStyle=hexA(j===1?'#896746':'#3e536d',(1-fade)*.63);ctx.lineWidth=Math.max(1,p.w*.56);
        ctx.beginPath();ctx.moveTo(v.x,v.y-v.z);ctx.lineTo(p.x,p.y-p.z);ctx.stroke();
        fx.strokeStyle=hexA(j===1?gold.m:steel.m,(1-fade)*.36);fx.lineWidth=Math.max(1,p.w*.11);fx.beginPath();fx.moveTo(v.x,v.y-v.z);fx.lineTo(p.x,p.y-p.z);fx.stroke();
      }
      fx.restore();ctx.restore();
    }
  }
  function cast(id){
    X.ultStart(id);
    const C=X.cine,x=pl.x,y=pl.gy,{hw,hh}=X.view(),r=Math.min(hw*.84,hh*1.37),D=70000*X.A.mul(id);
    const sunX=x+r*.33,sunY=y+r*.15;
    const target=X.onScreen(0).filter(e=>Math.abs(e.x-x)<hw*.67&&Math.abs(e.y-y)<hh*.54).sort((a,b)=>Math.hypot(a.x-sunX,a.y-sunY)-Math.hypot(b.x-sunX,b.y-sunY))[0];
    const f={x:target?.x??sunX,y:target?.y??sunY};
    const marks=[],blades=F.low?12:18,web=!!setup();
    function frame(t,software){
      const s=state(t,x,y,r,hw,f);
      const contact=t>impact-.015?state(impact,x,y,r,hw,f):null;
      if(s.shadow>.003){if(software)softShadow(s);else F.q.push({L:0,ord:-2,ground:true,s,render:paint});}
      if(s.alpha>.003){if(software)softCorona(s);else F.q.push({L:1,ord:4,ground:false,s,render:paint});}
      prominences(s,software);wake(s,x,y,r,hw,f,software);
      for(let i=0;i<blades;i++){
        const b=knife(s,i,blades,x,y,r,contact);if(b.alpha<.015)continue;
        const tint=i%3?steel:gold;
        if(software)AssassinBlades.canvas(fx,b.q,b.prev,b.size,b.angle,tint,b.alpha,0);
        else AssassinBlades.draw(b.q,b.prev,b.size,b.angle,tint,b.alpha,8,0);
      }
    }
    if(web)GFX.add(impact+.88,(k,t)=>frame(t,false));else X.draw(impact+.88,k=>frame(k*(impact+.88),true));
    C.move({x,y:y-X.BODY*.53,zoom:.94,tilt:.075,roll:-.029},.80);GFX.ambient(.62,.67,.76,2.2);
    C.SND.inhale(.74,.27);C.drone(48,.14);if(window.MK?.on())MK.play('assassinCut',{yaw:-.47,blend:.08});
    after(.26,()=>{K.flare(x,y,X.BODY*.57,{pal:steel,s:128,sx:1.9,sy:.26,dur:.24});C.SND.shing(1.36,.22);});
    after(.69,()=>{
      if(F.on)GFX.light(x-r*.36,y+r*.10,r*1.34,steel.l,.69,.76,{z:r*.51,hold:.78});
      C.SND.gong(.24);
      for(const e of X.onScreen(300)){
        const wait=1.51*sat((e.x-x+hw*1.18)/(hw*2.36));
        after(wait,()=>{
          if(e.dead)return;
          X.dmg(e,Math.min(e.hp*.17,D*.036),{crit:true,kb:0,stun:.25});
          const m=K.mark(e,'brand',{pal:brand,dur:3.10-wait,s:.39});
          if(m)marks.push(m);
        });
      }
    });
    after(1.42,()=>{C.move({x:x-r*.10,y:y-X.BODY*.63,zoom:.89,tilt:.13,roll:.034},.76);C.SND.shing(.71,.16);});
    after(2.34,()=>{
      if(target&&!target.dead){f.x=target.x;f.y=target.y;}
      C.move({x:blend(x,f.x,.32),y:blend(y,f.y,.32)-X.BODY*.52,zoom:.96,tilt:.13,roll:-.035},.49);
      C.SND.inhale(.37,.32);
    });
    after(2.70,()=>{C.hush(.23,{a:.59,c:'#a2bcdb'});C.SND.cut();});
    after(impact,()=>{
      const hitList=X.onScreen(300);for(const m of marks)m.end();
      const angle=Math.atan2((f.y-y)/(fs*r)+.11,(f.x-x)/r+.69);
      C.peak(f.x,f.y,{ca:.012,blur:.044,tint:gold.l,a:.11,hold:.043,out:.19});
      hitstop=Math.max(hitstop,.093);C.shake(.65);C.SND.hit(.76);C.SND.shing(.70,.31);
      if(F.on){GFX.light(f.x,f.y,r*1.17,gold.l,1.25,.34,{z:135});GFX.ripple(f.x,f.y,r*.86,{life:.33,s:.44});}
      for(let i=0;i<3;i++){
        const u=i*.22,dx=Math.cos(angle+(i-1)*.12),dy=Math.sin(angle+(i-1)*.12);
        const ox=f.x+dx*r*(u-.22),oy=f.y+dy*fs*r*(u-.22);
        K.coolLine(ox-r*.15,oy-r*.05,ox+r*(.44+.16*i),oy+dy*fs*r*.48,{pal:i===1?gold:steel,w:(.042+.012*i)*r,grow:.14,life:1.55,hot:.48,light:0,shed:0});
        window.AssassinMist?.splinters?.(ox,oy,18,angle,i===1?1.48:.82,i===1?gold:steel);
        K.dust(ox,oy,{n:F.low?3:6,dir:angle,spread:.44,sp:[390,900],up:460,life:.55,c:'#343744'});
      }
      K.flare(f.x,f.y,53,{pal:gold,s:r*.29,sx:2.5,sy:.24,gain:1.9,dur:.21});
      // A lip of slate peels up as the low edge of the corona meets the stone.
      const gouge=u=>{
        const v=(u-.5)*2,bend=(1-v*v)*.16;
        return {x:f.x+r*(v*.50-bend*.27),y:f.y+fs*r*(v*.29+bend),z:r*(.016+.06*(1-v*v))};
      };
      if(F.on){
        const pw=r*.15;
        GFX.add(.87,(k,t)=>{
          const reach=smooth(0,.19,t),pts=[];
          for(let i=0;i<=26;i++){const u=i/26,p=gouge(u*reach);p.w=pw*Math.sin(Math.PI*u)**.72;pts.push(p);}
          AssassinCuts.fracture(pts,gold,{path:gouge,depth:r*.43,t,fade:smooth(.27,.87,t),side:1});
        });
      }else X.draw(1.42,k=>{
        const reach=smooth(0,.13,k),cool=1-smooth(.10,1,k);ctx.save();ctx.lineCap='round';
        for(let i=1;i<=26;i++){
          const u=i/26,a=gouge((i-1)/26*reach),b=gouge(u*reach),w=Math.sin(Math.PI*u)*r*.043;
          ctx.strokeStyle=hexA('#191a22',(1-k)*.87);ctx.lineWidth=Math.max(1,w);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
          ctx.strokeStyle=hexA(i%6?gold.m:steel.m,cool*.83);ctx.lineWidth=Math.max(1,w*.21);ctx.beginPath();ctx.moveTo(a.x,a.y-2);ctx.lineTo(b.x,b.y-2);ctx.stroke();
        }ctx.restore();
      });
      for(const e of hitList){K.knock(e,{dir:angle,dist:510,up:1060,stun:.79,fx:0});e.flash=.63;}
      after(.24,()=>C.sweep(f.x,f.y,D,{list:hitList,speed:6800,max:.22,push:.42}));
    });
    after(life-1.23,()=>C.back(1.15));
    after(life,()=>X.ultStop());
  }
  window.AssassinEclipse={cast,name:'월식낙인',desc:'회전하는 단검이 공중에서 검은 달을 엮는다. 달그림자가 적에게 낙인을 새기고, 기울어진 칼날 고리가 떨어져 전장의 모든 적을 벤다.'};
})();

// 장송사선 — forged anchors wind up a set of braided cutting wires.
'use strict';
(() => {
  const X=RPG.sv,K=K3,F=FX3,depth=X.FSY,pi=Math.PI;
  const steel={d:'#111822',b:'#385369',m:'#b4d9e3',h:'#f3fbff',l:'#98ccea',s:'#cee7e6'};
  const copper={d:'#211120',b:'#864054',m:'#f39e92',h:'#ffebc8',l:'#ed835f',s:'#ffd698'};
  const gold={d:'#2e1721',b:'#a45b37',m:'#ffbb70',h:'#fff5da',l:'#fbb27b',s:'#ffdaa9'};
  const sat=n=>Math.max(0,Math.min(1,n));
  const mix=(a,b,u)=>a+(b-a)*u;
  function smooth(a,b,x){const u=sat((x-a)/(b-a));return u*u*(3-2*u);}
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
      if(shadow>.5){float opacity=a*.42*(1.-smoothstep(.0,1.85,abs(v)))/(1.+wire.z*.007);
        gl_FragColor=vec4(vec3(.024,.018,.025)*opacity,opacity);return;}
      if(gilt<-.5){
        float grit=.50+.29*sin(u*.17)+.21*cos(u*.53+v*3.);
        float profile=1.-smoothstep(.64,1.7,abs(v)+grit*.25);
        float rim=exp(-abs(v-.43-.23*grit)*6.7);
        vec3 stone=mix(vec3(.020,.017,.025),vec3(.29,.27,.27),rim*(.46+.50*grit));
        stone+=vec3(1.,.38,.09)*h*rim*(.28+.72*grit);
        float opacity=a*profile;gl_FragColor=vec4(stone*opacity,opacity);return;
      }
      float x=clamp(v,-1.,1.), roundness=sqrt(max(0.,1.-x*x));
      float twist=u*.105+1.9*coat.w;
      float braid=cos(twist+atan(x,max(.01,roundness))*3.);
      float steelLight=.15+.46*roundness+.16*braid+.13*sin(u*.016+coat.w);
      vec3 metal=mix(vec3(.19,.36,.42),vec3(.61,.25,.20),gilt)*steelLight;
      float bevel=exp(-abs(x+.32+.21*sin(twist*.18))*8.5);
      metal+=vec3(.41,.57,.61)*bevel*(.26+.74*pow(.5+.5*cos(twist*.34-clock*2.),3.));
      float groove=smoothstep(-.93,-.37,braid);
      vec3 glow=mix(vec3(.51,.80,.90),vec3(1.,.36,.17),gilt);
      vec3 c=metal*(.51+.49*groove)+glow*h*(.20+.61*groove);
      c+=vec3(1.,.83,.55)*h*h*bevel*(.37+.62*roundness);
      float body=1.-smoothstep(.59,1.05,abs(v));
      float bloom=(1.-smoothstep(.60,1.92,abs(v)))*h*.29;
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
    let length=0;
    const join=mesh.n;
    if(join){mesh.data.copyWithin(join,join-12,join);mesh.n+=24;}
    for(let j=0;j<pts.length;j++){
      const a=pts[Math.max(0,j-1)],p=pts[j],b=pts[Math.min(j+1,pts.length-1)];
      length+=Math.hypot(p.x-a.x,(p.y-a.y)/depth,p.z-a.z);
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
      g.globalAlpha=alpha*.26;g.strokeStyle='#12141d';g.lineWidth=a.w*2.25;
      g.beginPath();g.moveTo(a.x+a.z*.25,a.y+a.z*.14);g.lineTo(b.x+b.z*.25,b.y+b.z*.14);g.stroke();
      const stone=gilt<0,warm=(b.tint??gilt)>.5;
      g.globalAlpha=alpha;g.strokeStyle=stone?'#211d22':warm?'#8b4948':'#638595';g.lineWidth=a.w*1.64;
      g.beginPath();g.moveTo(a.x,a.y-a.z);g.lineTo(b.x,b.y-b.z);g.stroke();
      g.globalAlpha=alpha*(.32+.57*heat);g.strokeStyle=stone?'#be8555':warm?'#ffd8aa':'#d9fcff';g.lineWidth=Math.max(1,a.w*.46);
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
    const w=Math.min(hw*.91,hh*2.30),h=Math.min(hh*.90,w*.78),body=X.BODY;
    const strike=3.03,end=4.82,D=70000*X.A.mul(id),low=!!F.low,web=!!program();
    const mesh={data:new Float32Array(2600*12),n:0};
    const ground={data:new Float32Array(260*12),n:0};
    // The lower anchors sit nearer the viewer. Cable eyes slide along an
    // oblique seam, so each strand breaks in a different place and at a different time.
    const loc=[[-.83,-.51],[-.96,.19],[-.65,.75],[.76,-.72],[.96,-.04],[.68,.74]];
    const pins=loc.map(([a,b],i)=>({x:x+a*w,y:y+b*h,z:26,at:.23+i*.095,land:.67+i*.095,i}));
    // Two eyes turn under each pull. These three anchors slip inward in
    // sequence, briefly rock past their new stop and bite into the stone.
    const slips=[
      {i:1,at:1.69,dx:w*.125,dy:h*.065,roll:1.27,eye:.19},
      {i:5,at:2.05,dx:-w*.116,dy:-h*.13,roll:-1.40,eye:.71},
      {i:0,at:2.41,dx:w*.098,dy:h*.14,roll:.91,eye:.43}
    ];
    for(const sl of slips)pins[sl.i].slip=sl;
    const pairs=[[1,4],[0,5],[2,3],[0,4],[2,5],[1,3]];
    const visible=low?4:6, sections=low?18:29;
    const registered=new Set(),snared=[];
    const castRun=X.V.draws;
    const active=()=>lock&&RPG.mode==='surv'&&X.V.ultId===id&&X.V.draws===castRun;
    const later=(t,fn)=>after(t,()=>{if(active())fn();});
    const aim=X.onScreen(0).filter(e=>Math.abs(e.x-x)<w*.57&&Math.abs(e.y-y)<h*.62)
      .sort((a,b)=>Math.hypot(a.x-x,(a.y-y)/depth)-Math.hypot(b.x-x,(b.y-y)/depth))[0];
    const cx=aim?mix(x,aim.x,.61):x+w*.12,cy=aim?mix(y,aim.y,.57):y;
    // The shuttle follows one curve; the zipper, its light and the cutting
    // fronts all use this position rather than independent screen coordinates.
    function seam(u,t){
      const arch=Math.sin(pi*u),lift=smooth(.94,2.26,t),drop=smooth(strike+.25,strike+.72,t);
      return {x:cx+(u-.5)*w*1.13,y:cy+(u-.5)*h*.84+arch*h*.13,
        z:mix(body*.36+(h*.09+h*.32*arch)*lift,5,drop)};
    }
    function slipTravel(sl,t){
      if(!sl||t<=sl.at)return 0;
      const age=t-sl.at,settle=Math.max(0,age-.20);
      return smooth(0,.225,age)+.10*Math.sin(22*settle)*Math.exp(-9*settle);
    }
    function seamLoad(u,t){
      let load=0;
      for(const sl of slips){
        const age=t-sl.at-.26-Math.abs(u-sl.eye)*.48;
        if(age>0&&age<.45)load+=Math.sin(age*15)*Math.exp(-7*age)*(sl.roll>0?1:-1);
      }
      return load;
    }
    function pinPose(p,t){
      const u=sat((t-p.at)/(p.land-p.at)),arc=Math.sin(pi*u),pull=1-(1-u)**1.32;
      const sl=p.slip,k=slipTravel(sl,t),heel=Math.sin(pi*sat(k));
      return {x:mix(x,p.x,pull)+(sl?sl.dx*k:0),y:mix(y,p.y,pull)+(sl?sl.dy*k+h*.026*heel*Math.sign(sl.roll):0),
        z:mix(body*.55,p.z,pull)+h*(.34+.08*(p.i%3))*arc+22*heel-8*k};
    }
    function blade(p,prev,len,roll,pal,a){
      if(web&&AssassinBlades.draw(p,prev,len,roll,pal,a,8))return;
      if(!web)AssassinBlades.canvas(fx,p,prev,len,roll,pal,a,0);
    }
    function render(t){
      if(!active())return;
      mesh.n=0;ground.n=0;const fade=1-smooth(4.00,4.64,t),shuttle=sat((t-strike+.21)/.55);
      const filament=(pts,gilt)=>{if(web)strand(mesh,pts,gilt);else canvasStrand(fx,pts,gilt);};
      function gouge(a,b,born,span,width,seed){
        if(t<=born||t>4.74)return;
        const teeth=Math.min(1,(t-born)/span),age=t-born;
        const pts=[];
        for(let j=0;j<=16;j++){
          const u=j/16*teeth,n=Math.sin(u*37+seed)*.53+Math.cos(u*63-seed)*.23,bell=Math.sin(pi*j/16);
          pts.push({x:mix(a.x,b.x,u)+width*.27*n,y:mix(a.y,b.y,u)+width*depth*(.37*n+.41*Math.sin(pi*u)),
            z:2,w:width*(.23+.77*bell)*(.81+.21*n),heat:Math.exp(-Math.max(0,age-u*span)*1.73)*1.63,
            alpha:(.67+.24*bell)*smooth(0,.04,age)*(1-smooth(4.29,4.74,t))});
        }
        if(web)strand(ground,pts,-1);else canvasStrand(fx,pts,-1);
      }
      for(const sl of slips){const pin=pins[sl.i];gouge(pin,pinPose(pin,sl.at+.34),sl.at,.23,13,sl.i);}
      for(const [u,v] of [[.08,.29],[.40,.64],[.70,.94]]){
        const when=strike-.21+.55*u;
        if(t>when)gouge(seam(u,when),seam(v,when),when,.55*(v-u),19,u*23);
      }
      if(web&&ground.n)F.q.push({L:0,ord:.88,render:paint,mesh:ground,shadow:0,t});
      for(const pin of pins){
        if(t<=pin.at||fade<=0)continue;
        const p=pinPose(pin,t),prev=pinPose(pin,t-.013);
        const k=slipTravel(pin.slip,t),twist=(pin.slip?.roll||0)*k;
        if(t>pin.land-.005){
          const dir=Math.atan2((pin.y-y)/depth,pin.x-x)+twist*.43;
          prev.x=p.x-w*.031*Math.cos(dir);prev.y=p.y-w*.031*depth*Math.sin(dir);prev.z=p.z+h*(.072-.024*Math.sin(pi*sat(k)));
        }
        const spin=pin.i*1.78+7*Math.max(0,Math.min(t-pin.at,pin.land-pin.at))+twist;
        blade(p,prev,Math.max(28,Math.min(71,w*.052)),spin,pin.i%2?copper:steel,smooth(pin.at,pin.at+.09,t)*fade);
      }
      for(let i=0;i<visible;i++){
        const path=pairs[i],eyeU=(i+.40)/(visible-.20),eye=seam(eyeU,t);
        const sever=strike-.21+.55*eyeU;
        for(let side=0;side<2;side++){
          const pin=pins[path[side]];
          const age=t-pin.at;if(age<.015)continue;
          const at=pinPose(pin,t),open=smooth(pin.at,pin.land+.41,t);
          const ta=smooth(1.12+i*.082,2.08+i*.055,t),dt=t-sever,free=smooth(0,.67,dt);
          const ir=i*1.47+side*2.7,sgn=side?1:-1,arc=Math.sin(pi*open);
          const eyeX=mix(x,eye.x,open),eyeY=mix(y,eye.y,open),eyeZ=mix(body*.54,eye.z,open);
          const tailX=mix(eyeX,at.x+(eye.x-at.x)*.38,free)+w*.05*Math.sin(8*dt+ir)*free;
          const tailY=mix(eyeY,at.y+(eye.y-at.y)*.24+sgn*h*.11,free);
          const tailZ=mix(eyeZ,5+42*Math.abs(Math.sin(dt*13+ir))*Math.exp(-dt*3.3),free);
          const pts=[];
          for(let j=0;j<=sections;j++){
            const u=j/sections,bell=Math.sin(pi*u),loop=Math.sin(pi*u*(1.06+.37*(i%3))+ir);
            const tremble=Math.sin(2*pi*u*2.1-t*15+ir)*Math.exp(-Math.max(0,t-(1.25+i*.08))*2.2);
            const unwind=free*Math.exp(-Math.max(0,dt-.09)*2.8),whip=unwind*Math.sin(9*u-15*dt+ir);
            const p={x:mix(at.x,tailX,u)+bell*w*(.046*loop*(1-ta)+.056*whip),
              y:mix(at.y,tailY,u)+bell*h*(sgn*(.25*(1-ta)+.14*arc)+.15*whip),
              z:Math.max(4,mix(at.z+16,tailZ,u)+bell*h*((.24+.13*Math.sin(ir))*(1-ta)+.055*ta*(1-free)*loop+.015*tremble+.18*whip))};
            // Round the bight before it reaches the steel eye. The incoming
            // tangent turns along the seam while the eye carries the load.
            const bight=(u-1)*smooth(.65,.99,u)*ta*(1-free)*.86;
            p.x+=bight*((side?-1:1)*w*.34-(tailX-at.x));
            p.y+=bight*((side?-1:1)*h*.15-(tailY-at.y));
            p.z=Math.max(3,p.z+bight*((side?-1:1)*h*.055-(tailZ-at.z)));
            const since=pin.slip?t-pin.slip.at-u*.45:-1;
            const load=since>0&&since<.48?Math.sin(18*since)*Math.exp(-6.3*since):0;
            const surface=.5+.5*sat(.48+(p.y-cy)/(h*1.6));
            p.z=Math.max(4,p.z+bell*h*.23*load);p.y+=sgn*bell*h*.135*load;
            const wave=Math.exp(-(((u-(t-pin.land)*1.4)*7)**2));
            const ring=Math.exp(-(((u-1+Math.abs(dt)*2.9)*7)**2))*Math.exp(-Math.abs(dt)*2.3);
            p.heat=((.14+.54*wave+.23*ta)*surface+.94*ring+1.24*Math.max(0,load))*(1-.82*free);
            p.alpha=smooth(.01,.18,age)*fade*(1-.60*free)*surface;
            p.tint=mix((i+side)%3===0?.16:.86,.03,sat(load*2.05));
            p.w=(i<3?12:7)*(.81+.19*Math.sin(pi*u))*(1+.54*ring)*(.82+.34*surface);
            pts.push(p);
          }
          filament(pts,(i+side)%3===0?.16:.86);
        }
        // A split steel eye turns on the bight as the cut travels through it.
        // A visible bore and a cold lower lip make the bend read as a fitting.
        const eyeAge=t-(.95+.078*i),fracture=smooth(sever,sever+.34,t);
        if(eyeAge>0&&fracture<1){
          const ring=[],r=Math.min(39,w*.026),lean=.58+.23*Math.sin(i+t*1.3);
          const opening=smooth(0,.36,eyeAge);
          for(let j=0;j<=19;j++){
            const a=j/19*pi*1.86*opening+i*.65,cs=Math.cos(a),sn=Math.sin(a);
            ring.push({x:eye.x+cs*r,y:eye.y+r*depth*sn*.59,z:eye.z+r*(sn*lean+cs*.31),
              w:5.6+2.6*(1+sn)*.5,heat:.16+.45*Math.max(0,cs)+.62*Math.exp(-Math.abs(t-sever)*9),
              alpha:opening*(1-fracture)});
          }
          filament(ring,i%2?.30:.82);
        }
      }
      // The weft is a bundle with interleaved copper and silver plies. Each
      // turns in depth and is successively sheared by the pointed shuttle.
      const weft=smooth(1.22,2.36,t),plies=low?3:5;
      if(weft>.001&&t<3.80){
        for(let i=0;i<plies;i++){
          const pts=[],phase=i*2*pi/plies,unspool=smooth(1.37+i*.085,2.44+i*.035,t);
          for(let j=0;j<=38;j++){
            const u=j/38,bell=Math.sin(pi*u),s=unspool*u,p=seam(s,t);
            const snap=smooth(-.07,.13,shuttle-s)*smooth(strike-.22,strike-.09,t);
            const load=seamLoad(s,t);
            const curl=phase+s*(5.0+i*.46)+.55*Math.sin(2.3*t+s*4.1)+load*(.65+.16*i);
            const radius=h*(.10+.065*unspool)*bell*(1+.36*load);
            p.y+=depth*radius*Math.cos(curl)*(1+.51*snap);
            p.z=Math.max(2,p.z+radius*Math.sin(curl)*(1-.62*snap)-h*.20*snap*bell);
            p.x+=w*.023*Math.sin(phase+s*5)*bell;
            const hot=Math.exp(-(((shuttle-s)*8.2)**2)),edge=1-smooth(0,.68,t-3.18);
            p.w=(i===0?15:8.5)*(.38+.62*bell);
            p.alpha=weft*edge*(1-.84*snap)*(.82+.18*bell);
            const near=.50+.50*Math.cos(curl);
            p.alpha*=.64+.36*near;p.tint=mix(i%2?.16:.91,.06,sat(Math.abs(load)*1.45));
            p.heat=(.08+.71*weft*(.20+.45*Math.sin(curl+1.3)**2)+.67*Math.abs(load)+hot*1.04)*(.70+.30*near);
            pts.push(p);
          }
          filament(pts,i%2?.16:.91);
        }
      }
      for(const knot of snared){
        const dt=t-knot.t,bind=smooth(0,.20,dt)*(1-smooth(strike-.12,strike+.15,t)),e=knot.e;
        if(e.dead||bind<.01)continue;
        const pts=[],r=e.h*(.25+.10*(1-bind));
        for(let j=0;j<=18;j++){
          const u=j/18,a=knot.ang+u*pi*2.42;
          pts.push({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r*depth,z:e.z+e.h*(.36+.22*u),
            w:4+3*u,heat:.26+.48*Math.sin(pi*u)**2,alpha:bind*(.32+.61*Math.sin(pi*u))});
        }
        filament(pts,.72);
        const catchT=strike-.21+.55*knot.u,contact=smooth(catchT-.13,catchT-.03,t)*(1-smooth(catchT+.04,catchT+.23,t));
        if(contact>.01){
          const ray=[],b=seam(knot.u,t),travel=sat((t-catchT+.13)/.27);
          for(let j=0;j<=13;j++){
            const u=j/13,wave=Math.exp(-(((u-travel)*5.5)**2));
            ray.push({x:mix(b.x,e.x,u),y:mix(b.y,e.y,u)+Math.sin(pi*u)*24,
              z:mix(b.z,e.z+e.h*.52,u)+Math.sin(pi*u)*(1-travel)*h*.09,
              w:3.4+5.5*wave,heat:.46+wave,alpha:contact*(.46+.5*wave)});
          }
          filament(ray,.94);
        }
      }
      // The braid delaminates at the shuttle. The two real edges of each
      // peeled strip turn in space; an edge-on strip reads as a single glint.
      const peel=smooth(2.54,2.89,t)*(1-smooth(3.38,3.73,t));
      if(peel>.008){
        for(let i=0;i<(low?2:3);i++){
          const pts=[],edges=[],lip=[],side=i===1?-1:1,reach=(.29+.071*i)*peel;
          const pal=i===0?gold:i===1?steel:copper;
          for(let j=0;j<=26;j++){
            const u=j/26,v=1-u,bell=Math.sin(pi*u),s=shuttle-v*reach,p=seam(s,t);
            const turn=(u*1.15+.42*i)*pi+(t-2.8)*(i%2?-4.9:5.6);
            p.x+=w*.031*bell*Math.sin(turn);
            p.y+=side*h*peel*(.13*bell+.06*v);
            p.z=Math.max(4,p.z+h*peel*((i===1?-.11:.20)*bell+.11*v*Math.cos(turn)));
            const edgeR=h*(i===0?.21:i===1?.14:.092)*peel*(.12+.88*bell)*(.22+.78*smooth(0,.17,u))*Math.pow(v,.32);
            const dx=edgeR*.32*Math.sin(turn),dy=edgeR*.84*Math.cos(turn)*depth,dz=edgeR*Math.sin(turn);
            const cut={x:p.x+dx,y:p.y+dy,z:p.z+dz,w:edgeR,u};
            pts.push(cut);edges.push({x:p.x-dx,y:p.y-dy,z:p.z-dz});
            lip.push({x:cut.x,y:cut.y,z:cut.z,w:(3+5.5*bell)*peel,
              heat:.40+.94*u,alpha:peel*(.15+.85*bell)});
          }
          if(web)AssassinCuts.sweep(pts,pal,{t:t-2.54,fade:1-peel,side,heavy:true,edgePoints:edges});
          else{
            fx.save();fx.beginPath();pts.forEach((p,j)=>j?fx.lineTo(p.x,p.y-p.z):fx.moveTo(p.x,p.y-p.z));
            for(let j=edges.length-1;j>=0;j--)fx.lineTo(edges[j].x,edges[j].y-edges[j].z);
            fx.closePath();fx.fillStyle=hexA(pal.m,.40*peel);fx.fill();fx.restore();
          }
          filament(lip,i===1?.07:.96);
        }
      }
      if(t>2.61&&t<3.66){
        const path=[],head=seam(shuttle,t),wake=smooth(2.61,2.96,t)*(1-smooth(3.39,3.66,t));
        for(let j=0;j<=21;j++){
          const u=j/21,s=shuttle-(1-u)*.36,p=seam(sat(s),t);
          p.z+=Math.sin(pi*u)*h*.025;p.w=4+11*u;p.heat=.28+1.28*u;p.alpha=wake*smooth(0,.18,u)*smooth(-.02,.05,s);
          path.push(p);
        }
        filament(path,.97);
        if(shuttle>.002){
          const prev=seam(Math.max(0,shuttle-.015),t);
          blade(head,prev,Math.min(78,w*.055),t*7.4,gold,wake);
        }
      }
      if(web&&mesh.n){F.q.push({L:0,ord:-3,render:paint,mesh,shadow:1,t},{L:1,ord:6,render:paint,mesh,shadow:0,t});}
    }
    if(web)GFX.add(4.76,(k,t)=>render(t));else X.draw(4.76,k=>render(4.76*k));
    function hookFoes(t){
      let accents=0;
      for(const e of X.onScreen(300)){
        X.dmg(e,Math.min(D*.020,e.hp*.105),{crit:true,kb:0,stun:.32});
        e.mkC=copper.m;e.mkT=RT+.41;
        if(!registered.has(e)&&accents++<4){
          if(snared.length<(low?4:8))snared.push({e,ang:Math.atan2(cy-e.y,cx-e.x),t:1.36,u:sat(.5+(e.x-cx)/(w*1.13))});
          K.sparks(e.x,e.y,e.z+e.h*.58,{pal:copper,n:5,dir:e.x<cx?0:pi,spread:.24,sp:[130,490],up:170,life:[.09,.22]});
        }
        registered.add(e);
        const dir=Math.atan2((cy-e.y)/depth,cx-e.x);
        K.knock(e,{dir,dist:65+30*t,up:120,stun:.25,fx:0});
      }
    }
    C.move({x,y:y-body*.48,zoom:1.08,tilt:.07,roll:-.015},.44);
    GFX.ambient(.62,.66,.74,3.6);C.SND.inhale(.46,.26);const drone=C.drone(62,.12);
    later(.24,()=>{K.flare(x,y,body*.61,{s:125,sx:2.4,sy:.21,pal:steel,dur:.23});note(655,-.25,.17);
      if(window.MK?.on())MK.play('assassinCut',{yaw:pl.f>0?0:pi,blend:.04});});
    pins.forEach(pin=>later(pin.land,()=>{
      const dir=Math.atan2((pin.y-y)/depth,pin.x-x),pal=pin.i%2?copper:steel;
      K.sparks(pin.x,pin.y,14,{pal,n:low?5:9,dir,spread:.56,sp:[240,780],up:350,life:[.14,.39]});
      K.vsmoke(pin.x,pin.y,{s:128,dur:.74,rise:62,c:'#252830',c2:'#758087',a:.67});
      if(web)GFX.light(pin.x,pin.y,240,pal.l,.78,.22,{z:24});
      K.coolLine(pin.x-Math.cos(dir)*64,pin.y-Math.sin(dir)*36,pin.x+Math.cos(dir)*61,pin.y+Math.sin(dir)*34,
        {w:18,life:1.45,hot:.33,pal,grow:.04,shed:0,light:0});
      note([247,330,371,440,495,555][pin.i],sat((pin.x-x)/w*.5+.5)*2-1,.15);
    }));
    for(const sl of slips)later(sl.at+.10,()=>{
      const p=pinPose(pins[sl.i],sl.at+.10),dir=Math.atan2(sl.dy/depth,sl.dx);
      K.dust(p.x,p.y,{r:18,n:low?3:6,dir:dir+pi,spread:.39,sp:[140,470],up:115,s:1,a:.63,life:.61,c:'#36313b',c3:'#a49891'});
      AssassinMist.splinters(p.x,p.y,5,dir+pi,.52,copper);
      K.sparks(p.x,p.y,9,{n:low?4:7,pal:steel,dir:dir+pi,spread:.24,sp:[190,620],up:160,life:[.10,.24]});
      if(web)GFX.light(p.x,p.y,185,steel.l,.68,.17,{z:24});
      note(260+82*sl.i,sl.dx<0?.56:-.56,.11);
    });
    later(.82,()=>{C.move({zoom:.87,tilt:.13,roll:.027},1.04);});
    later(1.36,()=>{hookFoes(.4);C.SND.shing(.91,.23);
      for(const u of [.23,.70]){const p=seam(u,1.36);K.vsmoke(p.x,p.y,{s:Math.min(420,h*.58),z:22,rise:110,dur:1.72,c:'#221c29',c2:'#80636b',a:.66});}
    });
    later(1.99,()=>{hookFoes(1);C.SND.inhale(.47,.25);note(730,-.38,.12);
      C.move({x:mix(x,cx,.46),y:mix(y,cy,.46)-body*.48,zoom:1.02,tilt:.12,roll:-.028},.65);});
    later(2.58,()=>{C.hush(.24,{a:.57,c:'#c6b0ae'});});
    later(2.86,()=>{
      const p=seam(.07,2.86),jet=K.vjet(p.x,p.y,p.z,pi,{pal:gold,r:48,r0:14,len:w*.24,dur:.53,in:.07,out:.15,
        pitch:.19,speed:1.7,turb:.68});
      if(web)GFX.add(.53,(k,t)=>{
        const u=sat((t+.04)/.55),p=seam(u,2.86+t),prev=seam(u-.015,2.86+t);
        jet.x=p.x;jet.y=p.y;jet.z=p.z;jet.dir=Math.atan2((prev.y-p.y)/depth,prev.x-p.x);
      });
    });
    for(let i=0;i<visible;i++){
      const u=(i+.4)/(visible-.2),t=strike-.21+.55*u;
      later(t,()=>{
        const q=seam(u,t),next=seam(sat(u+.025),t),dir=Math.atan2((next.y-q.y)/depth,next.x-q.x);
        note(860+u*530,u*1.5-.75,.090);
        K.sparks(q.x,q.y,q.z,{pal:i%2?gold:copper,n:low?5:10,dir,spread:.46,sp:[220,920],up:370,life:[.16,.39]});
        if(i%2===0){
          K.vsmoke(q.x,q.y,{z:q.z*.44,s:125+65*u,dur:.78,rise:70,c:'#251f28',c2:'#966f6a',a:.68});
          AssassinMist.splinters(q.x,q.y,12,dir,.70+u*.21,copper);
        }
        if(web)GFX.light(q.x,q.y,345,gold.l,.94,.22,{z:q.z*.72});
        K.coolLine(q.x-w*.07,q.y-h*.04,next.x+w*.07,next.y+h*.036,{w:38,grow:.09,pal:copper,life:1.23,hot:.48,shed:0,light:0});
      });
    }
    later(strike,()=>{
      drone.stop();C.SND.hit(.68);C.shake(.59);hitstop=Math.max(hitstop,.068);
      const tip=seam(.48,strike);
      C.peak(tip.x,tip.y-tip.z,{ca:.009,blur:.022,hold:.032,out:.14});
      K.flare(tip.x,tip.y,tip.z,{s:165,sx:2.35,sy:.25,pal:gold,dur:.20,gain:2});
      if(web)GFX.light(tip.x,tip.y,580,gold.l,1.05,.30,{z:tip.z});
      C.move({x:cx,y:cy-body*.55,zoom:.86,tilt:.18,roll:.015},.18,'out');
      const foes=X.onScreen(300);
      for(const e of foes){K.knock(e,{dir:Math.atan2((e.y-cy)/depth,e.x-cx)+.23,dist:470,up:1150,stun:.72,fx:0});}
      later(.30,()=>C.sweep(cx,cy,D,{list:foes,speed:7300,max:.16}));
    });
    later(3.52,()=>{C.back(1.18);GFX.ambient(1,1,1,2.8);});
    later(end,()=>X.ultStop());
  }
  window.AssassinLoom={cast,name:'장송사선',desc:'여섯 곳에 단검을 박아 강선을 건다. 교차한 강선이 적들을 당기고, 금빛 칼날이 이음매를 가르며 전장의 모든 적을 벤다.'};
})();

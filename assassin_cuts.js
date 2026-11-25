// The wake is a curved shock surface swept through world space by the cutting edge.
'use strict';
(() => {
  const F=FX3, FSY=.58, pi=Math.PI, cap=64, rows=9, stride=13;
  const sat=v=>Math.max(0,Math.min(1,v));
  const vertexSource=`attribute vec3 center,across,depth;
    attribute vec4 uvwa;
    uniform vec4 camera,shape;
    uniform vec2 halfView;
    varying vec2 uv;
    varying vec3 normalW,world;
    varying float veil,along;
    void main(){
      float u=uvwa.x, v=uvwa.y, w=uvwa.z;
      float wave=3.141593*v, bow=.31+.12*sin(u*8.7+shape.y*2.6);
      float convex=sin(wave)*bow+.046*sin(2.*wave);
      vec3 P=center+across*((.47-v)*1.65*w)+depth*(convex*w);
      float slope=3.141593*(bow*cos(wave)+.092*cos(2.*wave));
      normalW=normalize(depth*1.65+across*slope);
      vec2 screen=(vec2(P.x,P.y*.58-P.z)+camera.xy)*camera.z;
      float c=cos(camera.w),s=sin(camera.w);
      gl_Position=vec4((screen.x*c-screen.y*s)/halfView.x,-(screen.x*s+screen.y*c)/halfView.y,0.,1.);
      if(shape.x>3.5){P=center;normalW=across;
        screen=(vec2(P.x,P.y*.58-P.z)+camera.xy)*camera.z;
        gl_Position=vec4((screen.x*c-screen.y*s)/halfView.x,-(screen.x*s+screen.y*c)/halfView.y,0.,1.);}
      world=P;uv=uvwa.xy;veil=uvwa.w;along=uvwa.z;
    }`;
  const fragmentSource=`#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 uv;
    varying vec3 normalW,world;
    varying float veil,along;
    uniform sampler2D noiseMap;
    uniform vec4 shape,lamps[2];
    uniform vec3 optical;
    uniform vec3 tint,hot,lightColor[2];
    void main(){
      float u=uv.x,v=uv.y, mode=shape.x,t=shape.y,fade=shape.z;
      if(mode>3.5){
        if(along<0.){
          float shade=veil*(1.-smoothstep(.08,1.,dot(uv,uv)));
          gl_FragColor=vec4(vec3(.012,.014,.018)*shade,shade);
          return;
        }
        vec3 N=normalize(normalW), V=vec3(0.,.865,.502), L=normalize(vec3(-.51,-.42,.75));
        float kd=max(0.,dot(N,L)),spec=pow(max(0.,dot(N,normalize(L+V))),14.);
        float grain=texture2D(noiseMap,world.xy*.008+world.z*.002).r;
        vec3 earth=mix(vec3(.065,.064,.083),vec3(.39,.33,.28),.14+.8*kd);
        vec3 color=earth*(.68+.62*grain)*(u*.45+.55);
        color+=tint*max(0.,dot(N,vec3(.25,.90,-.35)))*v*.83+hot*(spec*.48+.17*v);
        float a=veil*smoothstep(.0,.12,along);
        gl_FragColor=vec4(color*a,a);return;
      }
      float trail=step(1.5,mode)*(1.-step(2.5,mode));
      float echo=step(.5,mode)*(1.-step(1.5,mode));
      float stone=step(2.5,mode);
      vec2 field=world.xy*.00025+world.z*.00011;
      vec2 drift=vec2(u*1.35-t*.13,v*.86+shape.w)+field;
      vec3 n1=texture2D(noiseMap,drift).rgb;
      vec3 n2=texture2D(noiseMap,vec2(u*2.7+n1.g*.19,v*3.4+n1.r*.31-t*.09)).rgb;
      float flutter=.055*sin(10.*u-t*7.+2.4*n1.r)+.052*(n1.g-.5);
      float ridge=.22+flutter;
      float line=exp(-abs(v-ridge)*30.);
      float section=abs(v-ridge);
      float threads=n2.b*.65+n1.g*.35;
      float back=smoothstep(.04,.58,v);
      float coverage=1.-smoothstep(.50,1.,v+back*(n1.r-.44)*.55);
      coverage*=smoothstep(.01,.135,v);
      coverage*=mix(1.,smoothstep(.23,.59,threads+.16-.38*fade),back);
      float longitudinal=smoothstep(0.,.055,u)*smoothstep(0.,.032,1.-u);
      vec2 holes=texture2D(noiseMap,vec2(u*3.7-t*.13,v*1.6)+field).rg;
      float torn=smoothstep(.12+.28*fade,.49+.22*fade,holes.r+.13*holes.g);
      float current=.5+.5*sin(u*16.+n1.g*6.4-t*9.);
      float glaze=exp(-section*(15.+4.*current));
      float shoulder=(.1+.68*torn)*(.24+.76*smoothstep(.27,.62,threads));
      float skin=mix(shoulder,.57+.43*torn,glaze)*(.66+.34*current);
      float a=coverage*longitudinal*(1.-fade)*veil*mix(skin,1.,trail*.42);
      float front=.36+.46*clamp((t+.035)/.28,0.,1.);
      float crest=exp(-pow((u-front)*6.1,2.))*(.68+.32*current);
      if(optical.z>.5){
        // The two sides of a tilted pressure front bend the light in opposite
        // directions. FINFS samples both the real fog and the floor through it.
        vec3 N=normalize(normalW);
        vec2 axis=vec2(N.x,N.z-N.y*.58);
        axis/=max(.22,length(axis));
        float ridgeSide=(v-ridge)*9.;
        float bend=ridgeSide*exp(-1.5*ridgeSide*ridgeSide)*6.;
        float pixels=clamp(bend*(.27+2.42*crest)*torn,-3.,3.);
        float coverageD=longitudinal*(1.-fade)*(.38+.62*veil);
        gl_FragColor=vec4(.5+axis*pixels*optical.xy,0.,coverageD);
        return;
      }
      float leading=(1.-step(.5,mode))*crest;
      a+=longitudinal*(1.-fade)*(.22+.78*veil)*leading*glaze*.46;
      if(a<.01)discard;
      vec3 N=normalize(normalW),V=vec3(0.,.865,.502);
      if(dot(N,V)<0.)N=-N;
      vec3 L=normalize(vec3(-.62,-.25,.76));
      float facing=abs(dot(N,V)), fres=pow(1.-facing,2.);
      float spec=pow(max(0.,dot(N,normalize(L+V))),22.);
      vec3 scatter=vec3(.07,.10,.15);
      for(int i=0;i<2;i++){
        vec3 d=vec3(lamps[i].x,lamps[i].y/.58,lamps[i].z)-world;
        float rr=max(1.,dot(d,d));
        float fall=max(0.,1.-rr/max(1.,lamps[i].w*lamps[i].w));
        scatter+=lightColor[i]*fall*fall*(.12+.5*abs(dot(N,d*inversesqrt(rr))));
      }
      float wisps=smoothstep(.38,.76,threads);
      float broad=(.10+.21*wisps+.35*fres+.18*max(dot(N,L),0.));
      vec3 base=tint*(broad+scatter*.40);
      base=mix(base,vec3(.10,.075,.055)+tint*(.25+.34*wisps),stone*.55);
      float caustic=exp(-abs(section-.12-.045*n2.g)*27.)*(.18+.47*threads);
      float grainBreak=mix(.32,1.,smoothstep(.25,.71,n1.g+n2.r*.18));
      vec3 color=base+hot*(line*(.52+1.25*grainBreak)*(.63+.37*current)+caustic+.54*spec);
      color+=mix(hot,vec3(.94,.97,1.),.42)*leading*(line*1.82+caustic*.61);
      if(stone>.5){
        // A low-pressure crack throws up separate hot lips with opaque gaps.
        float lip=exp(-abs(v-ridge-.085*sin(u*39.+n1.r*4.))*31.);
        float clinker=smoothstep(.23,.56,holes.g+.26*n2.r-.12*fade);
        a*=mix(.14+.25*torn,clinker,lip)*(.9-.41*fade);
        color=mix(base*.53,tint*.60+hot*(1.3+spec),lip);
      }
      a*=mix(1.,.66,echo);
      a*=mix(1.,.84,trail);
      gl_FragColor=vec4(color*a,a*(.48+.33*stone));
    }`;
  let program=null,failed=false,vb,ib,uniforms;
  const vertices=new Float32Array(cap*rows*stride);
  const opticalMeshes=Array.from({length:4},()=>new Float32Array(vertices.length));
  let nextOptical=0;
  const chips=new Float32Array(cap*rows*stride);
  const facets=[[0,2,1],[0,3,2],[0,4,3],[0,1,4],[5,1,2],[5,2,3],[5,3,4],[5,4,1]];
  const rocks=new WeakMap();
  function sampleRocks(path,size){
    const stones=[],n=F.low?9:21;let seed=5321;
    const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    for(let i=0;i<n;i++){
      const u=(i+.3+.4*rnd())/n,q=path(u),next=path(u+.004);
      const dir=Math.atan2((next.y-q.y)/FSY,next.x-q.x)+(i%2?1:-1)*(1.+.58*rnd());
      const radius=size*(.014+.041*rnd()**2)*(i%7===0?1.7:1);
      const high=.35+.71*rnd(),speed=size*(.07+.32*rnd());
      const model=[[.14,-.16,.55],[1,0,0],[.24,.79,.06],[-1,.27,-.10],[-.34,-.69,-.03],[-.12,.08,-.42]];
      for(const v of model){
        v[0]*=radius*(1.05+.47*rnd());v[1]*=radius*(.84+.32*rnd());v[2]*=radius*(.68+.4*rnd());
      }
      stones.push({x:q.x,y:q.y/FSY,at:u*.22+.025*rnd(),radius,up:size*high,
        vx:Math.cos(dir)*speed,vy:Math.sin(dir)*speed,phase:rnd()*6.28,spin:(i%2?1:-1)*(3.4+4.7*rnd()),model,
        tone:.35+.64*rnd(),heat:.25+.70*rnd(),gravity:size*2.8});
    }
    rocks.set(path,stones);return stones;
  }
  function spall(path,depth,t,fogAt){
    const stones=rocks.get(path)||sampleRocks(path,depth);
    let offset=0;
    for(const rock of stones){
      const age=t-rock.at;
      if(age<=0)continue;
      const flight=2*rock.up/rock.gravity;
      const h=Math.min(age,flight),landed=sat((age-flight)/.21);
      if(landed===1)continue;
      const cx=rock.x+rock.vx*h, cy=rock.y+rock.vy*h;
      const cz=Math.max(0,h*(rock.up-.5*rock.gravity*h))+rock.radius*.28;
      const roll=rock.phase+rock.spin*h, yaw=rock.phase*.31-rock.spin*.6*h;
      const cr=Math.cos(roll),sr=Math.sin(roll),ca=Math.cos(yaw),sa=Math.sin(yaw);
      const corners=rock.model.map(([x,y,z])=>{
        const ry=cr*y-sr*z,rz=sr*y+cr*z;
        return [cx+ca*x-sa*ry,cy+sa*x+ca*ry,cz+rz];
      });
      const veil=(1-landed)*(1-.73*(fogAt?.({x:cx,y:cy*FSY,z:cz})||0));
      if(!F.low&&rock.radius>depth*.030){
        const sx=cx+cz*.36,sy=cy+cz*.22;
        const sw=rock.radius*(1.17+.7*h),sh=sw*(.47+.25*Math.abs(cr));
        const darkness=(1-landed)*.51/(1+cz/(rock.radius*3.2))*(1-.88*(fogAt?.({x:sx,y:sy*FSY,z:1})||0));
        for(const [u,v] of [[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]]){
          chips[offset++]=sx+u*ca*sw-v*sa*sh;chips[offset++]=sy+u*sa*sw+v*ca*sh;chips[offset++]=1;
          chips[offset++]=0;chips[offset++]=0;chips[offset++]=1;chips[offset++]=0;chips[offset++]=0;chips[offset++]=0;
          chips[offset++]=u;chips[offset++]=v;chips[offset++]=-1;chips[offset++]=darkness;
        }
      }
      for(const [ia,ib,ic] of facets){
        const a=corners[ia],b=corners[ib],c=corners[ic];
        const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
        let nx=vy*uz-vz*uy,ny=vz*ux-vx*uz,nz=vx*uy-vy*ux;
        if(ny*.865+nz*.502<=0)continue;
        const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
        for(const v of [a,b,c]){
          chips[offset++]=v[0];chips[offset++]=v[1];chips[offset++]=v[2];
          chips[offset++]=nx;chips[offset++]=ny;chips[offset++]=nz;
          chips[offset++]=0;chips[offset++]=0;chips[offset++]=0;
          chips[offset++]=rock.tone;chips[offset++]=rock.heat*(1-sat(age/.32));chips[offset++]=1;chips[offset++]=veil;
        }
      }
    }
    if(!offset)return;
    gl.bufferSubData(gl.ARRAY_BUFFER,0,chips.subarray(0,offset));gl.uniform4f(uniforms.shape,4,t,0,0);
    gl.drawArrays(gl.TRIANGLES,0,offset/stride);F.stats.draws++;
  }
  function init(){
    if(program||failed||!F.on) return !!program;
    const shaders=[],oldVB=gl.getParameter(gl.ARRAY_BUFFER_BINDING),oldIB=gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
    let linked;
    try {
      linked=gl.createProgram();
      for(const [kind,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]){
        const shader=gl.createShader(kind); shaders.push(shader);
        gl.shaderSource(shader,source); gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
        gl.attachShader(linked,shader);
      }
      ['center','across','depth','uvwa'].forEach((s,i)=>gl.bindAttribLocation(linked,i,s));
      gl.linkProgram(linked);
      if(!gl.getProgramParameter(linked,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(linked));
      const indices=[];
      for(let i=0;i<cap-1;i++)for(let j=0;j<rows-1;j++){
        const a=i*rows+j,b=a+rows; indices.push(a,b,a+1,b,b+1,a+1);
      }
      vb=gl.createBuffer();ib=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,vertices.byteLength,gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
      uniforms=Object.fromEntries(['camera','shape','halfView','optical','noiseMap','tint','hot','lamps[0]','lightColor[0]'].map(k=>[k,gl.getUniformLocation(linked,k)]));
      program=linked;
    }catch(e){
      failed=true;if(linked)gl.deleteProgram(linked);console.warn('Assassin cut surface',e);
    }finally{
      for(const s of shaders) gl.deleteShader(s);
      gl.bindBuffer(gl.ARRAY_BUFFER,oldVB);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,oldIB);
    }
    return !!program;
  }
  // Use the actual pommel trajectory for a knife, or parallel-transport a banked
  // cross-section along the world tangent for a blade swung by the assassin.
  function draw(q,lights,colors){
    const {pts,p,mode,o}=q, count=Math.min(cap,pts.length),t=o.t||0;
    const fog=[];
    if(o.fogAt){
      const n=Math.min(7,pts.length-1);
      for(let i=0;i<=n;i++){
        const pos=pts[Math.round(i*(pts.length-1)/n)];
        fog.push(o.fogAt(mode===3?{x:pos.x,y:pos.y,z:8+pos.z*.23}:pos));
      }
    }
    let offset=0;
    for(let i=0;i<count;i++){
      const u=i/(count-1),k=Math.round(u*(pts.length-1)),p0=pts[k];
      const prev=pts[Math.max(0,k-1)],next=pts[Math.min(pts.length-1,k+1)];
      let tx=next.x-prev.x,ty=(next.y-prev.y)/FSY,tz=next.z-prev.z;
      const tl=Math.hypot(tx,ty,tz)||1;
      tx/=tl;ty/=tl;tz/=tl;
      const xy=Math.hypot(tx,ty)||1;
      const sx=-ty/xy,sy=tx/xy;
      const upx=-tz*tx/xy,upy=-tz*ty/xy,upz=xy;
      const pu=p0.u??u;
      const roll=(mode===3?.82:.23)+(o.side||1)*(.95*Math.sin(pu*4.3+t*3.1)+.27*Math.cos(pu*9.1-t));
      const co=Math.cos(roll),si=Math.sin(roll);
      let ax=sx*co+upx*si,ay=sy*co+upy*si,az=upz*si;
      let cx=p0.x,cy=p0.y/FSY,cz=p0.z,w=p0.w*(o.heavy?.81:1.02);
      if(mode===3){cz=8+cz*.23+w*.04;w*=.66+.19*Math.sin(pu*35.+Math.sin(pu*9.));}
      const edge=o.edgePoints?.[k];
      if(edge){
        const dx=p0.x-edge.x,dy=(p0.y-edge.y)/FSY,dz=p0.z-edge.z;
        // Project out motion along the path so banking can turn the wake edge on.
        const along=dx*tx+dy*ty+dz*tz;
        const px=dx-along*tx,py=dy-along*ty,pz=dz-along*tz,length=Math.hypot(px,py,pz);
        if(length>.01){
          ax=px/length;ay=py/length;az=pz/length;
          w=Math.max(w*.30,Math.min(w*1.55,length*.62));
          cx-=px*.28;cy-=py*.28;cz-=pz*.28;
        }
      }
      const bx=ty*az-tz*ay,by=tz*ax-tx*az,bz=tx*ay-ty*ax;
      let veil=.60+.40*sat((cz-12)/225);
      if(fog.length){
        const f=u*(fog.length-1),j=Math.floor(f),k=f-j;
        veil=1-.78*(fog[j]*(1-k)+fog[Math.min(j+1,fog.length-1)]*k);
      }
      for(let j=0;j<rows;j++){
        vertices[offset++]=cx;vertices[offset++]=cy;vertices[offset++]=cz;
        vertices[offset++]=ax;vertices[offset++]=ay;vertices[offset++]=az;
        vertices[offset++]=bx;vertices[offset++]=by;vertices[offset++]=bz;
        vertices[offset++]=u;vertices[offset++]=j/(rows-1);vertices[offset++]=w;vertices[offset++]=veil;
      }
    }
    const surface=vertices.subarray(0,offset);
    if(q.optics){
      const mesh=opticalMeshes[nextOptical++%opticalMeshes.length];
      mesh.set(surface);q.optics.surface=mesh.subarray(0,offset);q.optics.count=count;
    }
    bindSurface(surface,mode,o);
    gl.uniform3f(uniforms.optical,0,0,0);
    gl.uniform3fv(uniforms.tint,F.rgb(p.b));gl.uniform3fv(uniforms.hot,F.rgb(p.m));
    gl.uniform4fv(uniforms['lamps[0]'],lights.subarray(0,8));
    gl.uniform3fv(uniforms['lightColor[0]'],colors.subarray(0,6));
    gl.drawElements(gl.TRIANGLES,(count-1)*(rows-1)*6,gl.UNSIGNED_SHORT,0);F.stats.draws++;
    if(mode===3&&o.path)spall(o.path,o.depth,t,o.fogAt);
  }
  function bindSurface(surface,mode,o){
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferSubData(gl.ARRAY_BUFFER,0,surface);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    for(let i=0;i<4;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,i===3?4:3,gl.FLOAT,false,stride*4,i*12);}
    gl.uniform4f(uniforms.camera,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot);
    gl.uniform2f(uniforms.halfView,W*.5,H*.5);
    gl.uniform4f(uniforms.shape,mode,o.t||0,sat(o.fade||0),o.side||0);
    gl.uniform1i(uniforms.noiseMap,1);
  }
  function refract(q){
    if(!q.surface)return;
    bindSurface(q.surface,0,q.o);
    // FINFS multiplies the encoded field by .14, so amounts remain screen pixels.
    gl.uniform3f(uniforms.optical,1/(W*.14),1/(H*.14),1);
    gl.drawElements(gl.TRIANGLES,(q.count-1)*(rows-1)*6,gl.UNSIGNED_SHORT,0);F.stats.draws++;
  }
  function submit(pts,p,o,mode){
    if(!init()) return false;
    if(pts.length>=2){
      const q={L:1,ord:mode===2?6:4.2,render:draw,pts,p,mode,o};
      F.q.push(q);
      if(mode===0&&o.fogAt&&!F.low&&!GFX.calm?.()&&o.fade<.78){
        q.optics={L:2,ord:4.2,render:refract,o};
        F.q.push(q.optics);
      }
    }
    return true;
  }
  function echo(path,p,width,side,fogAt){
    if(!init()) return false;
    GFX.add(.56,(k,t)=>{
      const pts=[],n=F.low?13:23;
      for(let i=0;i<n;i++){
        const a=i/(n-1),u=.16+.19*k+a*(.68-.16*k),q=path(u,.1);
        const bend=Math.sin(u*9.4-side*k*3.9);
        q.x+=width*side*k*(.37+.23*bend);
        q.y+=width*.53*k*Math.cos(u*7.2+k)*FSY;
        q.z+=width*(.11+k*(.48+.50*Math.sin(pi*a))+.13*k*bend);
        q.w=width*.32*Math.sin(pi*a)**.64*(.45+.55*a);
        pts.push(q);
      }
      submit(pts,p,{t,fade:k,side,fogAt},1);
    });
    return true;
  }
  window.AssassinCuts={
    sweep:(pts,p,o={})=>submit(pts,p,o,o.trail?2:0),
    fracture:(pts,p,o={})=>submit(pts,p,o,3),echo
  };
  init();
})();

// 흑련개화 (Black Lotus Bloom). Giant dagger petals rise out of a pool of ink behind the hero,
// wind into a bud that breathes and tightens while light leaks through its seams, then the bud
// unfolds ring by ring across the floor, cuts once more, and the petals burn away in violet.
// Positions use the arena frame (y = squashed floor depth, z = height). Directions are true 3D.
'use strict';
(() => {
  const X=RPG.sv, F=FX3, K=K3, FSY=X.FSY, BODY=X.BODY, pi=Math.PI, tau=pi*2;
  const steel={d:'#090e26',b:'#5087b4',m:'#abdcf0',h:'#f2fcff',l:'#87c3ea',s:'#d9f6ff'};
  const iris={d:'#130727',b:'#7140be',m:'#e093fb',h:'#fbe8ff',l:'#bb7ce3',s:'#f4beff'};
  const petalSteel={d:'#060914',b:'#2a3a56',m:'#4c5d7c',h:'#dfeeff',l:'#6f8fc0',s:'#c9dcf2'};
  const NF=[0,0,0,0];
  const sat=v=>Math.max(0,Math.min(1,v));
  const mix=(a,b,k)=>a+(b-a)*k;
  const smooth=(a,b,v)=>{const u=sat((v-a)/(b-a));return u*u*(3-2*u);};
  const hash=i=>{const s=Math.sin(i*12.9898+7.31)*43758.5453;return s-Math.floor(s);};
  const unit=(x,y,z)=>{const l=Math.hypot(x,y,z)||1;return {x:x/l,y:y/l,z:z/l};};
  const step=(p,d,s)=>({x:p.x+d.x*s,y:p.y+d.y*s*FSY,z:p.z+d.z*s});
  const LIFE=5.4, BLOOM=3.2, HUSH=3.0, CUT2=3.76;

  // ---- Petal blade mesh: a long single-edged blade with a clipped point, a fuller and a ridge.
  // Each instance gets its own width, sweep (bend), chipped edge, heat, burn and wetness.
  const PM=(()=>{
    const verts=[];
    const sm=(a,b,v)=>{const u=sat((v-a)/(b-a));return u*u*(3-2*u);};
    const edgeY=x=>(.15+.07*sm(0,.3,x))*(1-.72*sm(.45,1,x));
    const backY=x=>.062*Math.pow(sm(.7,1,x),1.4);
    const thick=x=>.032*(1-.75*x)+.003;
    const loop=[[0,.6,0],[.08,.85,0],[.13,.42,2],[.33,.42,2],[.42,1,2],[1,.04,3],[1,-.04,3],[.42,-1,3],[.33,-.42,2],[.13,-.42,2],[.08,-.85,2],[0,-.6,0]];
    function normal(a,b,c,center){
      const u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]);
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],h=Math.hypot(...n);
      if(h<1e-9)return null;
      const flip=n.reduce((s,q,i)=>s+q*((a[i]+b[i]+c[i])/3-center[i]),0)<0?-1:1;
      return n.map(q=>q*flip/h);
    }
    function tri(a,b,c,center,mat,wa,wb,wc){
      const n=normal(a,b,c,center);
      if(!n)return;
      verts.push(...a,...n,mat,wa,...b,...n,mat,wb,...c,...n,mat,wc);
    }
    const xs=[];
    for(let i=0;i<=30;i++)xs.push(-.02+1.02*Math.pow(i/30,.92));
    const rings=xs.map(x=>{const e=edgeY(Math.max(0,x)),b=backY(Math.max(0,x)),T=thick(Math.max(0,x));return loop.map(([w,zf])=>[x,b+(e-b)*w,T*zf]);});
    for(let i=1;i<rings.length;i++){
      const a=rings[i-1],b=rings[i],x=xs[i-1],cy=(backY(Math.max(0,x))+edgeY(Math.max(0,x)))/2,center=[x,cy,0];
      for(let j=0;j<loop.length;j++){
        const k=(j+1)%loop.length,mat=loop[j][2],wj=loop[j][0],wk=loop[k][0];
        tri(a[j],b[j],b[k],center,mat,wj,wj,wk);
        tri(a[j],b[k],a[k],center,mat,wj,wk,wk);
      }
    }
    function box(x0,x1,y0,y1,z0,z1,mat){
      const c=[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],P=[];
      for(const x of [x0,x1])for(const y of [y0,y1])for(const z of [z0,z1])P.push([x,y,z]);
      const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
      for(const f of faces){tri(P[f[0]],P[f[1]],P[f[2]],c,mat,0,0,0);tri(P[f[0]],P[f[2]],P[f[3]],c,mat,0,0,0);}
    }
    function prism(x0,x1,yc,r0,r1,mat,sides=7){
      const ring=(x,r)=>Array.from({length:sides},(_,i)=>{const a=tau*i/sides;return [x,yc+Math.cos(a)*r,Math.sin(a)*r];});
      const A=ring(x0,r0),B=ring(x1,r1),c=[(x0+x1)/2,yc,0];
      for(let j=0;j<sides;j++){const k=(j+1)%sides;tri(A[j],B[j],B[k],c,mat,0,0,0);tri(A[j],B[k],A[k],c,mat,0,0,0);}
    }
    box(-.05,-.015,-.06,.27,-.05,.05,4);
    prism(-.3,-.05,.08,.034,.03,5);
    prism(-.36,-.3,.08,.05,.045,4);
    const N=8,STRIDE=8,VS=`attribute vec3 point,normal;attribute vec2 part;
      uniform mat4 models[${N}];uniform vec3 origins[${N}];uniform vec4 inA[${N}],inB[${N}];
      uniform vec4 camera;uniform vec2 halfView;
      varying vec3 Nv,P,Wp;varying float mat,wq;varying vec4 A,B;
      void main(){
        int slot=int(part.x/${STRIDE}.+.01);
        mat4 model=models[0];vec3 origin=origins[0];A=inA[0];B=inB[0];
        for(int i=1;i<${N};i++){if(i==slot){model=models[i];origin=origins[i];A=inA[i];B=inB[i];}}
        vec3 q=point;q.y*=A.y;q.z*=mix(1.,A.y,.5);
        float fx=max(q.x,0.),slope=2.*A.z*fx;q.y+=A.z*fx*fx;
        vec3 n=vec3(normal.x-slope*normal.y/A.y,normal.y/A.y,normal.z);
        vec3 off=(model*vec4(q,0.)).xyz;
        vec3 pos=vec3(origin.x+off.x,origin.y/.58+off.y,origin.z+off.z);
        float dx=pos.x+camera.x,dy=pos.y*.58+camera.y-pos.z;
        float c=cos(camera.w),s=sin(camera.w);
        float depth=((pos.y+camera.y/.58)+.58*pos.z)/40000.;
        gl_Position=vec4(vec2(dx*c-dy*s,-dx*s-dy*c)*camera.z/halfView,-clamp(depth,-.95,.95),1.);
        Nv=mat3(model)*n;P=point;Wp=pos;mat=mod(part.x,${STRIDE}.);wq=part.y;
      }`;
    const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      varying vec3 Nv,P,Wp;varying float mat,wq;varying vec4 A,B;
      uniform vec4 lightP[3],coreP;uniform vec3 lightC[3],coreC;
      float h1(float x){return fract(sin(x*91.7+3.1)*43758.5);}
      vec3 heatC(float k){
        vec3 a=vec3(1.,.97,1.),b=vec3(.88,.58,.98),c=vec3(.44,.25,.75),d=vec3(.07,.05,.13);
        return k<.3?mix(a,b,k/.3):k<.65?mix(b,c,(k-.3)/.35):mix(c,d,(k-.65)/.35);
      }
      void main(){
        if(Wp.z<0.)discard;
        float seed=A.w;
        float burnAt=1.04-B.y*1.45+.07*sin(P.y*90.+seed*7.)+.05*sin(P.x*61.+seed*3.);
        if(B.y>0.&&P.x>burnAt)discard;
        if(B.y<0.){
          float c=-B.y,hw=B.z,lo=c-hw+.07*sin(P.y*70.+seed*5.)+.04*sin(P.y*190.+seed),hi=c+hw+.07*sin(P.y*83.+seed*2.)-.04*sin(P.y*170.+seed*3.);
          if(P.x<max(lo,.02)||P.x>hi)discard;
        }
        float notch=0.;
        for(int k=0;k<3;k++){
          float fk=float(k),at=.16+.72*fract(seed*7.13+fk*.618),wd=.008+.014*fract(seed*3.1+fk*.37),dp=.12+.3*fract(seed*5.7+fk*.21);
          notch=max(notch,dp*(1.-smoothstep(0.,wd,abs(P.x-at))));
        }
                if(mat>2.5&&mat<3.5&&wq>.42&&(wq-.42)/.58>1.-notch*1.6)discard;
        vec3 n=normalize(Nv),v=normalize(vec3(0.,1.,.58));
        if(dot(n,v)<0.)discard;
        vec3 r=reflect(-v,n),key=normalize(vec3(-.45,.38,.81));
        float nv=max(dot(n,v),0.),f=pow(1.-nv,3.),sky=smoothstep(-.45,.86,r.z),lam=max(dot(n,key),0.);
        vec3 env=mix(vec3(.02,.022,.034),vec3(.30,.33,.40),sky*sky);
        float strip=exp(-abs(dot(r,normalize(vec3(.24,.86,.45)))-.1-.12*(P.x-.3))*18.);
        env+=vec3(.70,.78,.92)*strip;
        float grind=.9+.1*sin(160.*P.y+5.*sin(P.x*17.+seed*4.));
        vec3 col;
        if(mat<.5)col=vec3(.06,.065,.08)*(.4+.8*lam)+env*.6;
        else if(mat<2.5){
          float groove=abs(wq-.23)/.1;
          col=vec3(.025,.028,.042)*(.5+.7*lam)+env*(.26+.3*f)*grind;
          col+=vec3(.25,.22,.34)*exp(-groove*groove*30.)*sky*.5;
        }
        else if(mat<3.5){
          float lip=smoothstep(.75,1.,wq);
          col=vec3(.10,.11,.13)*(.5+.6*lam)+env*(.95+.25*lip)*grind;
          col+=vec3(.30,.32,.38)*lip*(.4+.6*lam);
        }
        else if(mat<4.5)col=vec3(.09,.085,.09)*(.45+.7*lam)+env*.35;
        else{
          float wrap=.6+.4*smoothstep(-.4,.3,sin(P.x*150.+atan(P.z,P.y-.08)*1.2));
          col=vec3(.05,.035,.06)*(.5+.8*lam)*wrap+env*.08;
        }
        col+=vec3(.30,.34,.46)*f*(.2+.35*sky);
        float back=P.z<0.?.42:1.;
        col*=mix(back,1.,step(2.5,mat)*step(mat,3.5)*.5);
        float tipK=smoothstep(.45,1.,P.x),edgeL=smoothstep(.9,.995,wq)*step(1.5,mat)*step(mat,3.5);
        col+=vec3(.78,.84,.96)*edgeL*(.18+.82*tipK)*(.35+.65*sky)*(.6+.4*lam);
        col+=vec3(1.,1.,1.)*exp(-(1.-P.x)*40.)*smoothstep(.3,1.,wq)*.6;
        vec3 dc=coreP.xyz-Wp;float d2=max(dot(dc,dc),1.);vec3 lc=dc*inversesqrt(d2);
        float ca=max(0.,1.-d2/(coreP.w*coreP.w));
        col+=coreC*ca*(pow(max(dot(r,lc),0.),14.)*(mat>2.5&&mat<3.5?1.1:.35)+.05*max(dot(n,lc),0.));
        for(int i=0;i<3;i++){
          vec3 d=lightP[i].xyz-Wp;float q2=max(dot(d,d),1.);vec3 l=d*inversesqrt(q2);
          float rad=max(1.,lightP[i].w),at=max(0.,1.-q2/(rad*rad));at*=at;
          col+=lightC[i]*at*(col*.2*max(dot(n,l),0.)+pow(max(dot(n,normalize(l+v)),0.),23.)*.4);
        }
        float pk=max(col.r,max(col.g,col.b));col/=1.+max(0.,pk-.78)*.9;
        float hot=B.x*smoothstep(.86,1.,wq)*(mat>2.5&&mat<3.5?1.:0.)*(.55+.45*sin(P.x*23.-seed*9.)*.5+.5);
        col+=heatC(B.z)*hot*1.4;
        if(B.y>0.){float fr=1.-smoothstep(0.,.14,burnAt-P.x);col=mix(col,heatC(.6-.5*fr*fr)*(1.2+1.8*fr),fr);}
        float wet=(1.-smoothstep(0.,110.,Wp.z))*(1.-B.w*.0);
        col*=1.-.75*wet*step(.5,B.w);
        float a=A.x;
        gl_FragColor=vec4(col*a,a);
      }`;
    let prog,buf,U,failed=false,batch=null;
    const targets=new WeakMap(),mo=new Float32Array(16*N),og=new Float32Array(3*N),ia=new Float32Array(4*N),ib=new Float32Array(4*N);
    const lp=new Float32Array(12),lcol=new Float32Array(9),core={x:0,y:0,z:0,r:1,c:[0,0,0]};
    function link(){
      const cs=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(o));return o;};
      const p=gl.createProgram(),a=cs(gl.VERTEX_SHADER,VS),b=cs(gl.FRAGMENT_SHADER,FS);
      gl.attachShader(p,a);gl.attachShader(p,b);
      ['point','normal','part'].forEach((nm,i)=>gl.bindAttribLocation(p,i,nm));
      gl.linkProgram(p);gl.deleteShader(a);gl.deleteShader(b);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
      return p;
    }
    function init(){
      if(prog||failed||!F.on)return !!prog;
      try{
        const p=link();U={};
        for(const nm of ['models','origins','inA','inB','camera','halfView','lightP','lightC','coreP','coreC'])U[nm]=gl.getUniformLocation(p,nm);
        const packed=new Float32Array(verts.length*N);
        for(let s=0;s<N;s++){packed.set(verts,s*verts.length);for(let v=6;v<verts.length;v+=8)packed[s*verts.length+v]+=s*STRIDE;}
        buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,packed,gl.STATIC_DRAW);
        prog=p;
      }catch(e){failed=true;console.warn('Lotus petal mesh',e);}
      return !!prog;
    }
    function paint(q){
      const fb=gl.getParameter(gl.FRAMEBUFFER_BINDING),vp=gl.getParameter(gl.VIEWPORT);
      let dep=targets.get(fb);
      if(!dep||dep.w!==vp[2]||dep.h!==vp[3]){
        if(dep)gl.deleteRenderbuffer(dep.rb);
        const rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);
        gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,vp[2],vp[3]);gl.bindRenderbuffer(gl.RENDERBUFFER,null);
        dep={rb,w:vp[2],h:vp[3]};targets.set(fb,dep);
      }
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,dep.rb);
      gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LESS);gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog);gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,32,12);gl.vertexAttribPointer(2,2,gl.FLOAT,false,32,24);
      gl.uniform4f(U.camera,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot);gl.uniform2f(U.halfView,W/2,H/2);
      lp.fill(0);lcol.fill(0);
      const lamps=window.GFX?.lights||[];
      for(let i=0;i<Math.min(3,lamps.length);i++){
        const l=lamps[lamps.length-1-i],fade=l.t<l.hold?1:Math.max(0,1-(l.t-l.hold)/l.life);
        lp.set([l.x,l.y/FSY,(l.z||0)+90,l.r*1.5],i*4);lcol.set(l.c.map(v=>v*l.a*fade*fade),i*3);
      }
      gl.uniform4fv(U.lightP,lp);gl.uniform3fv(U.lightC,lcol);
      gl.uniform4f(U.coreP,core.x,core.y/FSY,core.z,core.r);gl.uniform3f(U.coreC,...core.c);
      const per=verts.length/8;
      for(let first=0;first<q.items.length;first+=N){
        const cnt=Math.min(N,q.items.length-first);
        for(let s=0;s<cnt;s++){
          const b=q.items[first+s];
          mo.set(b.M,16*s);og.set([b.p.x,b.p.y,b.p.z],3*s);ia.set(b.A,4*s);ib.set(b.B,4*s);
        }
        gl.uniformMatrix4fv(U.models,false,mo);gl.uniform3fv(U.origins,og);gl.uniform4fv(U.inA,ia);gl.uniform4fv(U.inB,ib);
        gl.drawArrays(gl.TRIANGLES,0,cnt*per);F.stats.draws++;
      }
      gl.disable(gl.DEPTH_TEST);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,null);
      batch=null;
    }
    // p = blade base (hilt end of the edge), d = unit direction toward the point, side = unit vector toward the edge.
    function draw(p,d,side,len,A,B){
      if(!init())return false;
      if(!batch||!F.q.includes(batch)){batch={L:1,ord:8,render:paint,items:[]};F.q.push(batch);}
      const u=unit(side.y*d.z-side.z*d.y,side.z*d.x-side.x*d.z,side.x*d.y-side.y*d.x);
      const s=unit(d.y*u.z-d.z*u.y,d.z*u.x-d.x*u.z,d.x*u.y-d.y*u.x);
      const M=[d.x*len,d.y*len,d.z*len,0,s.x*len,s.y*len,s.z*len,0,u.x*len,u.y*len,u.z*len,0,0,0,0,1];
      batch.items.push({p,M,A,B});
      return true;
    }
    return {draw,core,init};
  })();

  function chain(){
    const pts=[];
    return {pts,add(seg){
      if(seg.length<2)return;
      if(pts.length){const a=pts[pts.length-1],b=seg[0];pts.push({x:a.x,y:a.y,z:a.z,w:0},{x:b.x,y:b.y,z:b.z,w:0});}
      for(const q of seg)pts.push(q);
    }};
  }
  // Breaths of the bud: each opens it a little and clenches it tighter, faster and stronger toward the hush.
  // Three build beats: each one clenches the bud a step tighter, grows the floor cracks and steps the light up.
  const BREATH=[1.3,1.9,2.5];
  const stage=t=>BREATH.reduce((s,b)=>s+smooth(b,b+.16,t),0);
  function breath(t){
    let o=0;
    BREATH.forEach((tp,k)=>{
      const s=t-tp;
      if(s<0)return;
      const amp=.05+.04*k,env=s<.09?Math.sin(pi/2*s/.09):Math.exp(-(s-.09)*7)*(1-.35*Math.sin(Math.min(1,(s-.09)/.2)*pi));
      o+=amp*env;
    });
    return o;
  }
  // Bud spin per ring: slow drift that accelerates to the hush, then stops dead. The middle ring counter-turns.
  function spin(t){
    if(t<1.2)return 0;
    const v=Math.min(t,HUSH)-1.2,u=v/1.8;
    return .35*v+4.2*u*u*u*1.8/3;
  }
  function cast(id){
    X.ultStart(id);
    const C=X.cine,x=pl.x,y=pl.gy,{hw,hh}=X.view(),D=70000*X.A.mul(id),gpu=!!F.on;
    const cx=x,cy=y-430,low=!!F.low;
    if(gpu)PM.init();
    const reach=Math.hypot(hw*1.45,hh*1.45/FSY);
    const rings=low?[6,5,5]:[8,8,8], R0=[340,240,140], LEN=[570,505,440], OPEN=[-1.5,-1.12,-.7], SLIDE=[200,126,60];
    const RDIR=[1,-.6,1.25], RISE=[.55,.92,1.22], ROPEN=[0,.07,.14];
    const front=pi/2-spin(HUSH);
    const petals=[];
    let order=0;
    rings.forEach((n,L)=>{
      const seq=[...Array(n).keys()].sort((a,b)=>((a*5)%n)-((b*5)%n));
      seq.forEach((j,k)=>{
        const h=hash(order*3.3+1),len=LEN[L]*(.84+.32*h);
        petals.push({L,i:order,k,az:front*RDIR[L]+(j+.5)*tau/n+L*pi/n,len,
          lean:Math.asin(Math.min(.9,R0[L]/(2.05*len))),
          wid:(L===0?1.02:.92)+.28*hash(order*7.7+2),bend:(.06+.16*hash(order*5.3+4))*(L===1?-1:1),seed:hash(order*2.9+9)*10,
          rise:RISE[L]+.045*k*8/n,open:BLOOM+ROPEN[L]+.014*k*8/n,
          thrust:3.66+.5*(((j+.5)/n+L*.5/n)%1)+.05*L+.04*hash(order*3.9),
          brk:4.08+.2*(2-L)+.32*hash(order*5.1),thud:false,gone:false,cracked:false,embers:0});
        order++;
      });
    });
    // Rise out of the ink: thrust up past the rest height, hang, then slam down and settle.
    function riseOff(P,t){
      const s=t-P.rise;
      if(s<0)return null;
      if(s<.3){const u=s/.3,e=u<.35?.55*u*u/.1225*.35:.1925+.8075*(1-Math.pow(1-(u-.35)/.65,2));return -1.12+1.2*e;}
      if(s<.37)return .08+.01*(s-.3)/.07;
      if(s<.41){const u=(s-.37)/.04;return .09-.115*u*u;}
      const a=s-.41;
      return -.025*Math.exp(-a*9)*Math.cos(a*30);
    }
    function openK(P,t){
      const u=(t-P.open)/.24;
      if(u<=0)return 0;
      if(u<1){const c=1.7,v=u-1;return 1+(c+1)*v*v*v+c*v*v;}
      const a=t-P.open-.24;
      return 1+.11*Math.sin(a*6.5)*Math.exp(-a*2.6);
    }
    function petalPose(P,t){
      const off=riseOff(P,t);
      if(off===null||P.gone)return null;
      const tt=Math.min(t,HUSH),ring=spin(t)*RDIR[P.L];
      let phi=P.az+ring;
      const sg=stage(tt),e=openK(P,t);
      let th=P.lean*(.8+.1*sg)-breath(tt)*(1-.3*P.L);
      const rs=t-P.rise;
      if(rs<.4)th*=.35+.65*smooth(0,.4,rs);
      if(rs>.41&&t<BLOOM)th+=.06*Math.exp(-(rs-.41)*8)*Math.sin((rs-.41)*34);
      if(t>1.25&&t<BLOOM)th+=(.003+.006*sg*sg)*Math.sin(t*(40+14*sg)+P.i*1.7);
      if(P.L===0&&t<BLOOM)th-=.16*smooth(2.62+.03*P.k,2.8+.03*P.k,tt)*(1-.5*smooth(HUSH,BLOOM,t));
      if(t>HUSH&&t<BLOOM)th+=.014*Math.sin(t*93+P.i*1.7);
      let R=R0[P.L],bz=26-14*sat(rs/.4);
      const k=e;
      th=mix(th,OPEN[P.L],k);
      if(P.L===0)th=Math.max(th,-1.53);
      if(e>0)th+=.016*Math.sin(t*39+P.i*2.3)*smooth(P.open+.25,P.open+.45,t);
      const aft=Math.max(0,t-BLOOM);
      phi+=(.2*aft-.03*aft*aft)*(P.L===1?-1:1);
      R+=SLIDE[P.L]*Math.min(1.05,k);
      // A wave of thrusts runs round the open flower: each petal stabs outward and draws back.
      const tw=P.thrust,tu=sat((t-tw)/.26);
      if(tu>0&&tu<1){R+=(70+40*(2-P.L))*Math.sin(pi*tu)*(1-.35*tu);th+=.12*Math.sin(pi*tu);}
      if(e>0)bz=mix(bz,8+P.L*10,Math.min(1,e));
      let base={x:cx+Math.cos(phi)*R,y:cy+Math.sin(phi)*R*FSY,z:bz};
      let roll=0,heat=0,burn=0,alpha=1;
      if(t>=P.brk-.16&&t<P.brk){
        const a=(t-P.brk+.16)/.16;
        th+=.18*a*a;base.z+=30*a*a;heat=a;
      }
      const c=Math.cos(phi),s=Math.sin(phi),st=Math.sin(th);
      const d=unit(-c*st,-s*st,Math.cos(th));
      let side=unit(-s,c,0);
      if(roll){const cr=Math.cos(roll),sr=Math.sin(roll),u=unit(d.y*side.z-d.z*side.y,d.z*side.x-d.x*side.z,d.x*side.y-d.y*side.x);side=unit(side.x*cr+u.x*sr,side.y*cr+u.y*sr,side.z*cr+u.z*sr);}
      base=step(base,d,P.len*off);
      return {base,d,side,phi,alpha,burn,heat,rs,e};
    }
    // Small daggers that climb the bud in a helix, then get pulled into its seams.
    const helix=[],nh=low?18:34;
    for(let i=0;i<nh;i++)helix.push({i,s0:hash(i*1.9),a0:i*2.39996,from:1.15+.7*hash(i*4.4),len:46+22*hash(i*8.2),dead:false});
    function helixPos(h,t){
      const tt=Math.min(t,HUSH),v=Math.max(0,tt-1.15),f=h.s0+.3*v+.28*v*v,hf=f-Math.floor(f);
      const suck=smooth(2.2+.5*h.s0,2.75+.2*h.s0,tt);
      const r=mix((R0[0]+220)*(1-.55*hf),70,suck),az=h.a0+2.6*spin(tt)+3.2*hf+2.5*suck;
      return {p:{x:cx+Math.cos(az)*r,y:cy+Math.sin(az)*r*FSY,z:mix(60+900*hf,460,suck*suck)},hf,az,suck};
    }
    // Shards thrown outward when the bud bursts.
    const shards=[];
    const overhead=[],bits=[],pshards=[],lit=[],wisps=[];
    const ev={pulse:BREATH,done:[]};
    // Ground cracks: every one has its own width, reach, speed and kinks - a few thick rifts that cross the
    // screen, thinner side cracks that give out early, forks that split off at odd angles.
    const nl=low?8:12,cracks=[],CR0=R0[0]+30;
    function walk(i,x0,y0,hd0,L,seg,kw){
      const pts=[];
      let px=x0,py=y0,hd=hd0;
      for(let j=0;j<=seg;j++){
        const v=j/seg;
        pts.push({x:px,y:py,r:Math.hypot(px,py),v,hd,k:(.5+1.0*hash(i*17+j*3.7))*(1-.72*v)*kw});
        const kink=hash(i*13+j*5.1)<.24?(hash(i*7+j*2.3)-.5)*1.25:(hash(i*31+j*7.3)-.5)*.4;
        hd=mix(hd+kink,hd0,.3);
        const sl=L/seg*(.65+.7*hash(i*3+j*11.3));
        px+=Math.cos(hd)*sl;py+=Math.sin(hd)*sl;
      }
      return pts;
    }
    for(let i=0;i<nl;i++){
      const main=i%3===0,a0=front+(i+.5)*tau/nl+.42*(hash(i*4.1)-.5),lenK=main?.95:.38+.5*hash(i*2.7);
      const L=(reach-CR0)*lenK*1.05,seg=main?18:11;
      const pts=walk(i,Math.cos(a0)*CR0,Math.sin(a0)*CR0,a0,L,seg,1);
      const forks=[];
      for(const [fv,fs] of main?[[.38,1],[.6,-1],[.8,1]]:[[.55,hash(i)<.5?1:-1]]){
        if(low&&fv>.6)continue;
        const q=pts[Math.round(fv*seg)];
        forks.push(walk(i*7+fv*40,q.x,q.y,q.hd+fs*(.45+.5*hash(i*2+fv)),L*(.18+.2*hash(i*5+fv)),6,.7).map(p=>({...p,v:fv+(1-fv)*p.v*.8})));
      }
      const marks=[.12,.3,.5,.7,.9].map(v=>pts[Math.round(v*seg)]);
      cracks.push({pts,forks,marks,mi:0,main,end:false,w:main?30+14*hash(i*9.1):9+12*hash(i*9.1),sp:3300+3000*hash(i*6.6),dl:.06*hash(i*8.8)});
    }
    const spikes=[];
    cracks.forEach((c,i)=>{
      for(const v of c.main?[.2,.4,.6,.8]:[.35,.75]){
        if(low&&(v===.4||v===.8||v===.75))continue;
        const q=c.pts[Math.round(v*(c.pts.length-1))],h=hash(i*9+v*7);
        spikes.push({q,h,at:CUT2-.08+(q.r-CR0)/3800+.04*h,len:(c.main?210:160)+110*hash(i*4+v*10),hold:.42+.25*h,hit:false,gone:false});
      }
    });
    function puff(p,n,s,up=1){
      for(let i=0;i<n;i++){
        const a=Math.random()*tau,v=40+90*Math.random();
        GFX.pt({x:p.x,y:p.y,z:Math.max(6,p.z),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:(60+120*Math.random())*up,g:-25,drag:1.6,
          life:.6+.4*Math.random(),s:(18+18*Math.random())*s,grow:50*s,m:5,b:'alpha',c:GFX.rgb('#0b0a15'),c2:'#000000',
          c3:'#3a2f5c',er:.9,ns:1.3,w:1,a:.66,L:0});
      }
    }
    function embers(p,n,s=1){
      for(let i=0;i<n;i++){
        const a=Math.random()*tau,v=60+160*Math.random();
        GFX.pt({x:p.x,y:p.y,z:Math.max(6,p.z),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:80+200*Math.random(),g:-60,drag:1.2,
          life:.5+.5*Math.random(),s:(5+6*Math.random())*s,grow:-4,m:1,b:'add',c:GFX.rgb(i%3?'#8a5ccc':'#d9c8ff'),c2:'#3a2466',c3:'#130727',w:1,a:.75,L:1});
      }
    }
    // A petal rears up, then snaps into three sharp steel pieces that tumble outward, land, skid and smoke away.
    function breakPetal(P,q,t){
      const n=low?2:3,out=unit(Math.cos(q.phi),Math.sin(q.phi),0);
      for(let j=0;j<n;j++){
        const c=(j+.5)/n,o=step(q.base,q.d,P.len*c),sg=j%2?1:-1,sp=110+190*hash(P.i*3+j),h=hash(P.i*5.3+j*2.1);
        const ax=unit(q.side.x*sg,q.side.y*sg,.5);
        pshards.push({p:o,at:t,c,hw:.5/n,life:Math.max(.3,Math.min(.75+.35*h,LIFE-.03-t)),len:P.len,P,side:q.side,
          v:{x:out.x*sp*(.6+c)+q.side.x*sg*90,y:out.y*sp*(.6+c)+q.side.y*sg*90,z:180+260*h},d:q.d,ax,spin:sg*(4+5*h)});
      }
      const mid=step(q.base,q.d,P.len*.5);
      K.sparks(mid.x,mid.y,mid.z+10,{pal:steel,n:low?3:5,sp:[220,700],up:340,life:[.12,.3]});
      puff(mid,low?1:2,1.4,.8);
      if(P.L===0&&P.k%2===0)C.SND.shing(1.1+.1*hash(P.i),.08);
    }
    function shatter(p,d,len,pal,t,n,size=.4,kick=1){
      const side=unit(-d.y,d.x,0);
      for(let j=0;j<n;j++){
        const along=n===1?.5:j/(n-1),o=step(p,d,len*(-.3+1.3*along)),sg=j%2?1:-1;
        bits.push({p:o,at:t,life:Math.max(.2,Math.min(.5+.14*Math.random(),LIFE-.03-t)),len:len*size*(.8+.4*Math.random()),pal,
          v:{x:(side.x*sg*190+d.x*80)*kick,y:(side.y*sg*190+d.y*80)*kick,z:(170+230*Math.random())*kick},
          d,ax:unit(side.x*sg,side.y*sg,.6),spin:sg*(9+6*Math.random())});
        puff(o,low?1:2,size*1.7);
      }
      K.sparks(p.x,p.y,p.z,{pal:steel,n:3,sp:[160,520],up:260,life:[.14,.32]});
    }
    function blade(p,d,len,roll,pal,a,shadow){
      if(!(len>3)||a<.01)return;
      const prev=step(p,d,-8);
      if(!gpu){window.AssassinBlades?.canvas?.(fx,p,prev,len,roll,pal,a);return;}
      const ground=F.ground;
      if(!shadow)F.ground=false;
      try{window.AssassinBlades?.draw(p,prev,len,roll,pal,a,8);}finally{F.ground=ground;}
    }
    const orb=gpu?K.vorb(cx,cy,330,{r:30,dur:BLOOM+.02-1.7,pal:iris,in:.6,out:.04,core:.32,spin:2.4,delay:1.7}):null;
    let swirlT=0;
    function frame(t){
      const core=chain(),vapour=chain(),seam=chain(),gouge=chain(),scar=chain();
      const m=gpu?K.mats():null;
      const g=smooth(1.4,HUSH,Math.min(t,HUSH));
      PM.core.x=cx;PM.core.y=cy;PM.core.z=t<BLOOM?440:mix(440,120,sat((t-BLOOM)/.3));
      PM.core.r=t<BLOOM?560+300*g:1500*(1-smooth(4.2,5.2,t));
      const sgT=stage(Math.min(t,HUSH)),ck=(t<1.25?0:t<BLOOM?.12+.32*sgT+1.2*breath(t):mix(1.1,.15,sat((t-BLOOM)/1.0)));
      PM.core.c=[.62*ck,.36*ck,1*ck];
      // Ink pool: spreads through the build, is sucked back toward the bud before the hush, then drains away.
      if(gpu){
        const grow=smooth(.15,2.1,t),suck=smooth(2.35,HUSH,t),drain=smooth(4.3,5.35,t);
        const ri=(300+640*grow-480*suck+520*smooth(BLOOM,BLOOM+.2,t))*(1-drain*drain);
        if(ri>20){
          F.quad(m.dark,cx,cy+30,ri*1.15,ri*1.15,0,{a:.62*sat(t/.3)});
          F.quad(m.soot,cx,cy+30,ri,ri,t*.05,{a:.9*sat(t/.3)});
        }
        if(orb&&t<BLOOM)orb.r=30+20*sgT+40*breath(t);
        // The floor sinks toward the bud: dark grit and smoke wheel inward round it, faster with every beat.
        if(t>.7&&t<HUSH&&t-swirlT>(low?.06:.03)){
          swirlT=t;
          for(let j=0;j<2;j++){
            const a=Math.random()*tau,r=R0[0]+150+500*Math.random(),sp=(260+160*sgT)*(.7+.6*Math.random());
            const tx=-Math.sin(a),ty=Math.cos(a),ix=-Math.cos(a),iy=-Math.sin(a);
            GFX.pt({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*FSY,z:10+20*Math.random(),vx:(tx*sp+ix*sp*.55),vy:(ty*sp+iy*sp*.55)*FSY,vz:20+40*Math.random(),g:0,drag:.6,
              life:.7+.4*Math.random(),s:30+40*Math.random(),grow:30,m:5,b:'alpha',c:GFX.rgb('#07060c'),c2:'#000000',c3:'#2a2240',er:.9,ns:1.4,w:1,a:.55,L:0});
          }
        }
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
      const poses=[];
      for(const P of petals){
        const q=petalPose(P,t);
        poses.push(q);
        if(!q){
          // The floor splits where the petal is about to come through: a slit, grit and a puff a beat ahead.
          const pre=P.rise-t;
          if(gpu&&pre<.12&&pre>=0){
            const az=P.az+spin(t)*RDIR[P.L],R=R0[P.L],bx=cx+Math.cos(az)*R,by=cy+Math.sin(az)*R*FSY,u=1-pre/.12,hl=P.len*.16*u;
            const tx=-Math.sin(az),ty=Math.cos(az);
            gouge.add([{x:bx-tx*hl,y:by-ty*hl*FSY,z:2,w:0},{x:bx,y:by,z:2,w:26*u},{x:bx+tx*hl,y:by+ty*hl*FSY,z:2,w:0}]);
            if(!P.cracked){P.cracked=true;K.dust(bx,by,{n:low?2:3,r:30,sp:[120,380],s:.8,a:.5,life:.6,c:'#15131c',c3:'#3a3546'});K.debris(bx,by,{n:low?3:6,r:30,sp:[80,300],up:700,size0:4,size:11,c:'#2a2633'});}
          }
          continue;
        }
        if(t>=P.brk){
          P.gone=true;
          breakPetal(P,q,t);
          continue;
        }
        if(gpu&&q.rs<.45){
          const R=R0[P.L],bx=cx+Math.cos(q.phi)*R,by=cy+Math.sin(q.phi)*R*FSY,tx=-Math.sin(q.phi),ty=Math.cos(q.phi),hl=P.len*.2,w=26*(1-sat((q.rs-.25)/.2));
          gouge.add([{x:bx-tx*hl,y:by-ty*hl*FSY,z:2,w:0},{x:bx,y:by,z:2,w},{x:bx+tx*hl,y:by+ty*hl*FSY,z:2,w:0}]);
          if(q.rs<.3&&(P.i+Math.floor(t*30))%3===0)K.debris(bx,by,{n:1,r:40,sp:[60,240],up:600,size0:4,size:12,c:'#2a2633'});
        }
        const cool=sat((t-P.open)/1.6),edgeGlow=q.heat>0?q.heat:t<P.open-.02?(t>1.2?.12+.12*stage(t)+.5*breath(t):0):1-.75*cool;
        const wet=t<P.open?1:0;
        if(gpu)PM.draw(q.base,q.d,q.side,P.len,[q.alpha,P.wid,P.bend,P.seed],[Math.min(1,edgeGlow),0,q.heat>0?.3:t<P.open?.42-.08*stage(t):.08+.85*cool,wet]);
        else blade(step(q.base,q.d,P.len*1.02),q.d,P.len,0,petalSteel,q.alpha,false);
        if(!P.thud&&q.rs>=.41){
          P.thud=true;
          K.sparks(q.base.x,q.base.y,20,{pal:steel,n:low?3:5,sp:[200,620],up:300,life:[.12,.3]});
          K.dust(q.base.x,q.base.y,{n:low?2:4,r:40,sp:[160,460],up:110,s:1.1,a:.5,life:.7,c:'#15131c',c3:'#3a3546'});
          puff({x:q.base.x,y:q.base.y,z:20},low?1:2,1.1,1.6);
          if(P.L===0){C.shake(.12);if(P.k%2===0)C.SND.shing(.8+.1*P.k/8,.16);}
          if(gpu&&P.L===0&&P.k%2===0)GFX.light(q.base.x,q.base.y,240,steel.l,.3,.2,{z:60});
        }
        if(!gpu)continue;
      }
      // Light leaking through the seams of the outer ring, brighter and faster as the bud tightens.
      if(gpu&&t<BLOOM+.08&&t>1.25){
        const n0=rings[0],br=breath(t);
        for(let j=0;j<n0;j++){
          const a=poses[j],b=poses[(j+1)%n0];
          if(!a||!b||a.rs<.31||b.rs<.31)continue;
          const pa=petals[j],pb=petals[(j+1)%n0];
          const ta=step(a.base,a.d,pa.len*.95),tb=step(b.base,b.d,pb.len*.95);
          const lo={x:(a.base.x+b.base.x)/2,y:(a.base.y+b.base.y)/2+6,z:50},hi={x:(ta.x+tb.x)/2,y:(ta.y+tb.y)/2+4,z:(ta.z+tb.z)/2*.92};
          const sg=stage(Math.min(t,HUSH)),show=sat(sg+1-(j%3===0?0:j%3===1?1:2));
          if(show<=0)continue;
          const pry=smooth(2.62+.03*j,2.8+.03*j,t),va=Math.max(.06,.12+.32*hash(j*3.1)-.12*pry),vb=Math.min(.97,va+.22+.25*hash(j*5.7)+.35*pry);
          const pulse=.7+.3*Math.sin(t*(5+5*sg)-j*1.3),w=(2.5+3.5*sg+40*br+22*pry)*pulse*show*(t>BLOOM?1-sat((t-BLOOM)/.08):1);
          const seg=[];
          for(let k=0;k<=5;k++){const v=mix(va,vb,k/5);seg.push({x:mix(lo.x,hi.x,v),y:mix(lo.y,hi.y,v),z:mix(lo.z,hi.z,v),w:w*Math.sin(pi*k/5)*(.75+.25*Math.sin(k*2.1+j))});}
          seam.add(seg);
        }
      }
      // Breaths: black vapour puffs out of the gaps, the floor light swells.
      ev.pulse.forEach((tp,k)=>{
        if(ev.done[k]||t<tp)return;
        ev.done[k]=true;
        const n0=rings[0];
        for(let j=0;j<n0;j+=low?2:1){
          const a=poses[j];
          if(!a||a.rs<.31)continue;
          wisps.push({t0:tp,ph:a.phi+pi/n0,z:140+300*hash(j+k*9),s:1+.15*k});
        }
        if(gpu)GFX.light(cx,cy,420+160*k,iris.l,.22+.14*k,.35,{z:300});
        C.SND.inhale(.16+.04*k,.12+.04*k);C.SND.gong(.12+.05*k);C.shake(.1+.08*k);
        K.dust(cx,cy,{n:(low?6:12)+4*k,r:R0[0]+60,sp:[300+200*k,800+300*k],s:1+.2*k,a:.5,life:1,c:'#15131c',c3:'#3a3546'});
        if(gpu)GFX.ripple(cx,cy,reach,{life:.9,s:.25+.08*k});
      });
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
      // Helix daggers, pulled into the bud before the hush.
      for(const h of helix){
        if(t<h.from||h.dead||t>=HUSH)continue;
        const now=helixPos(h,t),pr=helixPos(h,t-.02);
        if(now.suck>=.98){h.dead=true;K.sparks(now.p.x,now.p.y,now.p.z,{pal:iris,n:2,sp:[120,360],up:120,life:[.1,.22]});continue;}
        const d=unit(now.p.x-pr.p.x,(now.p.y-pr.p.y)/FSY,now.p.z-pr.p.z);
        const a=sat((t-h.from)/.15)*Math.pow(Math.sin(pi*Math.min(.999,now.hf+.001)),.45)*(1-.4*now.suck);
        blade(now.p,d,h.len*(1-.4*now.suck),h.i+t*2,steel,a,false);
        if(gpu&&!low&&h.i%2===0)vapour.add([{...step(now.p,d,-160-200*now.suck),w:0},{...step(now.p,d,-60),w:7*a},{...step(now.p,d,40),w:0}]);
      }
      // Burst shards.
      for(const s of shards){
        const a=t-s.at;
        if(a<0||a>s.life)continue;
        const dist=s.v*a-s.v*a*a/(2*s.life),p={x:cx+Math.cos(s.az)*(s.r0+dist),y:cy+Math.sin(s.az)*(s.r0+dist)*FSY,z:Math.max(14,s.z+s.vz*a-1400*a*a)};
        const d=unit(Math.cos(s.az),Math.sin(s.az),(s.vz-2800*a)/s.v);
        const k=1-sat((a-s.life*.6)/(s.life*.4));
        blade(p,d,s.len*(.3+.7*k),s.i+a*s.spin,s.i%4?steel:petalSteel,1,false);
        if(gpu&&a<.2)core.add([{...step(p,d,-Math.min(420,dist)),w:0},{...step(p,d,-70),w:6*(1-a/.2)},{...step(p,d,50),w:0}]);
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
          if(!o.hold){o.hold={x:e.x,y:e.y,z:e.z+e.h+300};o.brk=BLOOM+.5+.8*hash(o.i*3.7);}
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
          if(t>=o.brk||(o.hit&&!alive&&s>.25)){o.gone=true;shatter(step(p,d,o.len*.5),d,o.len*.5,steel,t,low?1:2,.6,.8);embers(p,low?2:3,.8);continue;}
          if(gpu&&o.hit){
            const hk=K.heat(iris,sat((t-BLOOM)/1.2));
            lit.push([{...step(p,d,o.len*.1),w:0},{...step(p,d,o.len*.6),w:o.len*.13*hk.g},{...step(p,d,o.len*1.1),w:0}]);
          }
        }
        blade(p,d,o.len*(.55+.45*born),o.i*.9,iris,a,false);
      }
      // Tumbling shards of broken petals and knives: fly, land, skid to a stop, then crumble into black smoke.
      for(let i=bits.length-1;i>=0;i--){
        const b=bits[i],a=t-b.at;
        if(a>=b.life){bits.splice(i,1);continue;}
        const tl=(b.v.z+Math.sqrt(b.v.z*b.v.z+3600*Math.max(0,b.p.z-4)))/1800,air=a<tl;
        const ah=air?a:tl+(1-Math.exp(-(a-tl)*7))/7,ang=b.spin*(air?a:tl+.12*(1-Math.exp(-(a-tl)*7)));
        const c=Math.cos(ang),s=Math.sin(ang);
        let d=unit(b.d.x*c+b.ax.x*s,b.d.y*c+b.ax.y*s,b.d.z*c+b.ax.z*s);
        if(!air)d=unit(d.x,d.y,d.z*Math.exp(-(a-tl)*12));
        const p={x:b.p.x+b.v.x*ah,y:b.p.y+b.v.y*ah*FSY,z:air?b.p.z+b.v.z*a-900*a*a:4};
        if(!air&&!b.land){b.land=true;K.sparks(p.x,p.y,8,{pal:steel,n:2,sp:[120,380],up:160,life:[.08,.2]});if(b.big)K.dust(p.x,p.y,{n:1,r:10,sp:[80,220],s:.7,a:.45,life:.6,c:'#15131c',c3:'#3a3546'});}
        const end=sat((a-b.life*.72)/(b.life*.28));
        if(end>0&&!b.smoke){b.smoke=true;puff(p,b.big?2:1,b.len/150,.5);embers(p,1,.6);}
        blade(p,d,b.len*(1-end*end),ang*.4,b.pal,1,false);
      }
      // Broken petal pieces: jagged lengths of the petal itself, tumbling out, skidding, then eaten away into smoke.
      for(let i=pshards.length-1;i>=0;i--){
        const b=pshards[i],a=t-b.at;
        if(a>=b.life){pshards.splice(i,1);continue;}
        const tl=(b.v.z+Math.sqrt(b.v.z*b.v.z+3600*Math.max(0,b.p.z-8)))/1800,air=a<tl;
        const ah=air?a:tl+(1-Math.exp(-(a-tl)*7))/7,ang=b.spin*(air?a:tl+.12*(1-Math.exp(-(a-tl)*7)));
        const c=Math.cos(ang),s=Math.sin(ang);
        let d=unit(b.d.x*c+b.ax.x*s,b.d.y*c+b.ax.y*s,b.d.z*c+b.ax.z*s);
        if(!air)d=unit(d.x,d.y,d.z*Math.exp(-(a-tl)*12));
        const p={x:b.p.x+b.v.x*ah,y:b.p.y+b.v.y*ah*FSY,z:air?b.p.z+b.v.z*a-900*a*a:8};
        if(!air&&!b.land){b.land=true;K.sparks(p.x,p.y,8,{pal:steel,n:2,sp:[120,380],up:160,life:[.08,.2]});K.dust(p.x,p.y,{n:1,r:10,sp:[80,220],s:.8,a:.45,life:.6,c:'#15131c',c3:'#3a3546'});}
        const end=sat((a-b.life*.6)/(b.life*.4));
        if(end>0&&!b.smoke){b.smoke=true;puff(p,2,b.len/500,.5);embers(p,1,.6);}
        if(end>.3&&!b.smoke2){b.smoke2=true;puff(p,1,b.len/600,.4);}
        const side=unit(b.side.x*c-b.ax.x*s*.3,b.side.y*c-b.ax.y*s*.3,b.side.z);
        if(gpu)PM.draw(step(p,d,-b.len*b.c),d,side,b.len,[1,b.P.wid,b.P.bend,b.P.seed],[0,-b.c,b.hw*(1-end),0]);
        else blade(p,d,b.len*b.hw*2*(1-end),ang*.4,petalSteel,1,false);
      }
      if(!gpu)return;
      // Ground cracks: they creep out a step with every build beat, then each rips to its own length at its own
      // speed behind the bloom, a bright head running ahead and grit kicked up where it passes; light keeps
      // flowing outward along them while they cool, and they crumble from both ends.
      const lipC=chain();
      if(t>=1.25){
        const pre=t<BLOOM,sgc=stage(Math.min(t,HUSH));
        const crumble=smooth(4.35,5.3,t),inner=CR0+(reach-CR0)*.5*crumble,outer=reach*(1-.5*crumble);
        const hk=pre?K.heat(iris,.78-.16*sgc):K.heat(iris,sat((t-BLOOM)/1.6));
        const fB=CR0-40+360*sgc,flowR=pre?CR0+(t*700)%900:CR0+1900*(t-BLOOM-.2);
        const addPath=(pts,wid,deep,fr,lip)=>{
          const sg=[],dk=[],lp=[];
          for(let j=0;j<pts.length;j++){
            const q=pts[j];
            if(q.r>fr||q.r>outer||q.r<inner)continue;
            const p={x:cx+q.x,y:cy+q.y*FSY,z:2},dr=(q.r-flowR)/280,dr2=(q.r-flowR+1400)/300;
            const fresh=pre?1:1+1.4*Math.exp(-Math.max(0,fr-q.r)/420);
            const flow=.45+1.1*Math.exp(-dr*dr)+(pre?0:.7*Math.exp(-dr2*dr2));
            sg.push({...p,w:wid*q.k*(pre?.3+.22*sgc:.12+.45*hk.g)*fresh*flow});
            dk.push({...p,w:wid*q.k*deep*(1.3+.4*fresh)});
            if(lip){
              const n=pts[Math.min(pts.length-1,j+1)],o=pts[Math.max(0,j-1)],dx=n.x-o.x,dy=n.y-o.y,l=Math.hypot(dx,dy)||1;
              let nx=-dy/l,ny=dx/l;
              if(ny>0){nx=-nx;ny=-ny;}
              const off=wid*q.k*deep*.6;
              lp.push({x:p.x+nx*off,y:p.y+ny*off*FSY,z:3,w:wid*q.k*.5});
            }
          }
          if(sg.length>1){sg[0].w=0;dk[0].w=0;sg[sg.length-1].w=0;dk[dk.length-1].w=0;scar.add(sg);gouge.add(dk);}
          if(lp.length>1){lp[0].w=0;lp[lp.length-1].w=0;lipC.add(lp);}
        };
        for(const c of cracks){
          const fr=pre?fB:Math.max(fB,CR0+c.sp*(t-BLOOM-c.dl));
          addPath(c.pts,c.w,1.5,fr,c.main&&!pre);
          if(pre)continue;
          for(const f of c.forks)addPath(f,c.w*.55,1.3,fr,false);
          const last=c.pts[c.pts.length-1];
          if(fr<last.r+150){
            const hd=[];
            for(const q of c.pts)if(q.r<=fr&&q.r>fr-340)hd.push({x:cx+q.x,y:cy+q.y*FSY,z:5,w:(5+c.w*.3)*q.k*Math.min(1,(fr-q.r)/120+.2)});
            if(hd.length>1){hd[hd.length-1].w=0;core.add(hd);}
          }
          while(c.mi<c.marks.length&&fr>=c.marks[c.mi].r){
            const q=c.marks[c.mi++],px=cx+q.x,py=cy+q.y*FSY;
            K.dust(px,py,{n:low?1:2,dir:q.hd,spread:.7,sp:[250,700],s:.8+c.w/60,a:.5,life:.9,c:'#15131c',c3:'#3a3546'});
            K.debris(px,py,{n:low?2:(c.main?5:3),r:20,sp:[100,380],up:c.main?900:600,size0:4,size:c.main?16:11,c:'#2a2633'});
            if(c.mi<=2)K.sparks(px,py,10,{pal:steel,n:2,sp:[200,600],up:240,life:[.1,.24]});
          }
          if(!c.end&&fr>=last.r){
            c.end=true;
            const px=cx+last.x,py=cy+last.y*FSY;
            K.sparks(px,py,12,{pal:iris,n:low?3:6,dir:last.hd,spread:.9,sp:[300,1100],up:420,life:[.12,.34]});
            K.dust(px,py,{n:low?2:4,r:20,dir:last.hd,spread:1,sp:[200,600],s:1+c.w/50,a:.55,life:1.1,c:'#15131c',c3:'#3a3546'});
          }
        }
      }
      // Second strike: blades burst up out of the cracks, outward-leaning, hold, then snap.
      for(const sp of spikes){
        const a=t-sp.at;
        if(a<0||sp.gone)continue;
        const q=sp.q,gx=cx+q.x,gy=cy+q.y*FSY,ox=Math.cos(q.hd),oy=Math.sin(q.hd),d=unit(ox*(.5+.3*sp.h),oy*(.5+.3*sp.h),1);
        const u=sat(a/.09),ext=.08+.92*(1-(1-u)*(1-u)*(1-u))+.06*Math.sin(pi*sat((a-.09)/.12));
        const tip=step({x:gx,y:gy,z:0},d,sp.len*ext);
        if(!sp.hit){
          sp.hit=true;
          K.sparks(gx,gy,14,{pal:steel,n:low?2:4,dir:q.hd,spread:.8,sp:[250,800],up:500,life:[.1,.28]});
          K.debris(gx,gy,{n:low?2:4,r:20,sp:[120,420],up:900,size0:4,size:14,c:'#2a2633'});
          K.dust(gx,gy,{n:1,r:10,dir:q.hd,spread:.6,sp:[200,500],s:1,a:.5,life:.8,c:'#15131c',c3:'#3a3546'});
        }
        if(a>=sp.hold){sp.gone=true;shatter(step({x:gx,y:gy,z:0},d,sp.len*.5),d,sp.len*.5,steel,t,low?1:2,.5,.8);continue;}
        blade(tip,d,sp.len*ext,sp.h*6,steel,1,false);
        if(a<.1)core.add([{x:gx,y:gy,z:4,w:0},{...step({x:gx,y:gy,z:0},d,sp.len*ext*.5),w:14*(1-a/.1)},{...tip,w:0}]);
      }
      if(gouge.pts.length>1)F.ribbon(m.trB,gouge.pts,{cA:'#000000',cB:'#06030c',cM:'#1a1030',cC:'#3a2a5c',a:.85,gain:.8,ero:.18,ord:2,ulen:180,fd:NF});
      if(lipC.pts.length>1)F.ribbon(m.trB,lipC.pts,{cA:'#0c0a12',cB:'#262230',cM:'#48425a',cC:'#77708c',a:.8,gain:.9,ero:.3,ord:2,ulen:110,fd:NF});
      if(scar.pts.length>1){const hk=t<BLOOM?K.heat(iris,.78-.16*sgT):K.heat(iris,sat((t-BLOOM)/1.6));F.ribbon(m.trC,scar.pts,{cA:hk.cA,cB:hk.cB,cM:hk.cM,cC:hk.cC,gain:1.4*hk.g,ero:.1,ord:3,ulen:140,fd:NF});}
      if(core.pts.length>1)F.ribbon(m.trC,core.pts,{cA:steel.b,cB:steel.m,cM:steel.h,cC:'#ffffff',gain:2.6,ero:.05,ord:9,ulen:260,fd:NF});
      if(vapour.pts.length>1)F.ribbon(m.trB,vapour.pts,{cA:iris.d,cB:'#2a1d4a',cM:iris.b,cC:iris.m,a:.6,gain:1.2,ero:.12,ord:7,ulen:320,t0:t*.6,fd:NF});
      if(seam.pts.length>1)F.ribbon(m.trC,seam.pts,{cA:iris.b,cB:iris.m,cM:'#b48cf0',cC:'#e4d2ff',gain:.8+.5*sgT+1.5*breath(t),ero:.04,ord:9,ulen:200,t0:t*1.5,fd:NF});
      if(lit.length){
        const h=K.heat(iris,sat((t-BLOOM)/1.2)),all=chain();
        for(const s of lit)all.add(s);
        lit.length=0;
        F.ribbon(m.glowO,all.pts,{cA:h.cA,cB:h.cB,cM:h.cM,cC:h.cC,gain:2.4*h.g,ord:9,ulen:120,fd:NF});
      }
    }
    if(gpu)GFX.add(LIFE,(k,t)=>frame(t));else X.draw(LIFE,k=>frame(k*LIFE));

    // Windup: a spin cut throws the seed knives up.
    C.move({x,y:y-BODY*.8,zoom:1.12,tilt:.06,roll:-.015},.5);
    GFX.ambient(.6,.6,.72,2.2);
    C.SND.inhale(.62,.28);C.drone(46,.14);
    if(window.MK?.on())MK.play('assassinCut',{yaw:-.47,blend:.08});
    K.flare(x,y,BODY*.55,{pal:steel,s:130,sx:2.6,sy:.2,gain:2.2,dur:.3});
    K.dust(x,y,{n:low?6:10,r:60,sp:[300,700],s:.9,a:.45,life:.8,c:'#15131c',c3:'#3a3546'});
    after(.2,()=>{C.SND.shing(1.3,.22);K.sparks(x,y,BODY*.5,{pal:steel,n:10,sp:[160,440],up:260});});
    after(.5,()=>{
      C.move({x,y:y-BODY*2.5,zoom:.82,tilt:.08,roll:.01},.6);
      if(window.MK?.on())MK.play('raise',{blend:.1});
    });
    // The outer ring lands as a whole: one heavy thud with a rolling dust ring.
    after(RISE[0]+.31+.32,()=>{
      C.shake(.4);C.SND.gong(.2);X.sfx('whoosh',.5,.3);
      if(gpu){
        GFX.ripple(cx,cy,900,{life:.6,s:.3});
        GFX.light(cx,cy,700,steel.l,.35,.3,{z:120});
      }
    });
    // Build: the bud winds up and the camera pushes in; three ripples of ink roll to the screen edge.
    after(1.3,()=>C.move({x,y:y-BODY*2.6,zoom:.96,roll:.035},1.4,'lin'));
    BREATH.forEach((tr,k)=>{
      after(tr,()=>{
        if(gpu)GFX.light(cx,cy,reach*.7,iris.l,.2+.1*k,.5,{z:200});
        for(const e of X.onScreen(300)){
          const dist=Math.hypot(e.x-cx,(e.y-cy)/FSY),wait=.8*sat((dist-260)/(reach-260));
          after(wait,()=>{
            if(e.dead)return;
            X.dmg(e,Math.min(D*.03,e.hp*.15),{crit:true,kb:0,stun:.22});
            e.flash=.45;
          });
        }
      });
    });
    after(2.2,()=>{
      const list=X.onScreen(0).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,low?14:30);
      list.forEach((e,i)=>overhead.push({e,i,at:2.2+.5*i/Math.max(1,list.length),len:92+14*hash(i*2.2)}));
      C.SND.shing(1.5,.14);
    });
    after(2.7,()=>{
      C.move({x,y:y-BODY*2.1,zoom:.86,tilt:.12,roll:0},.3);
      if(window.MK?.on())MK.play('iaiReady',{blend:.12});
    });
    after(HUSH,()=>{C.hush(.2,{a:.55,c:'#a9a2d8'});C.SND.cut();});
    // Bloom.
    after(BLOOM,()=>{
      const hitList=X.onScreen(300);
      C.peak(cx,cy-BODY*.4,{ca:.006,blur:.16,tint:'#6a5cff',a:.14,hold:.03,out:.2});
      hitstop=Math.max(hitstop,.1);C.shake(1.4);C.SND.hit(.85);C.SND.shing(.7,.36);X.sfx('whoosh',.8,.5);
      C.move({x,y:y-BODY*.9,zoom:.74,tilt:.2,roll:0},.22,'out');
      GFX.ambient(.66,.64,.8,1.2);
      if(window.MK?.on())MK.play('slam',{blend:.06});
      if(gpu){
        GFX.light(cx,cy,reach*.7,'#cfc2ff',.8,.25,{z:260,hold:.04});
        GFX.light(cx,cy,900,iris.l,.55,.7,{z:120});
        GFX.ripple(cx,cy,reach,{life:.45,s:.7});
        K.vring(cx,cy,{r:reach*.95,r0:R0[0]+80,dur:.5,tube:.06,c:'#0a090b',c2:'#2c2a30',a:.6});
        K.vblast(cx,cy,{s:260,pal:iris,heat:.55,smoke:.25,dur:1.2,rise:260,fire:.2});
        // A column of dust and grit thrown straight up out of the heart of the flower, lit from below.
        K.vsmoke(cx,cy,{s:460,z:60,rise:1200,dur:1.9,c:'#16121e',c2:'#7a7096',a:1,lit:.8,flow:.5});
        K.vsmoke(cx+60,cy-20,{s:300,z:260,rise:1300,dur:1.6,c:'#0c0a12',c2:'#463f58',a:.7,lit:.4,delay:.06});
        K.cool(cx,cy+20,{kind:'crack2',r:620,pal:iris,life:2.4,hot:.5,light:0});
        K.cool(cx,cy+20,{kind:'scorch',r:460,pal:iris,life:2.4,hot:.3,light:0,start:.3});
      }
      K.flare(cx,cy,320,{pal:iris,s:380,sx:2.2,sy:.3,gain:2,dur:.2});
      const ns=low?14:28;
      for(let i=0;i<ns;i++)shards.push({i,at:BLOOM+.012*(i%5),az:front+i*tau/ns+.35*(hash(i*3.3)-.5),r0:80,z:200+500*hash(i*1.7),vz:150+700*hash(i*2.1),v:2600+3400*hash(i*5.5),life:.45+.3*hash(i),len:100+150*hash(i*9.9),spin:10+14*hash(i*4.4)});
      K.dust(cx,cy,{n:low?14:26,r:R0[0],sp:[900,2300],s:1.5,a:.6,life:1.2,c:'#15131c',c3:'#4a4458'});
      K.debris(cx,cy,{n:low?10:20,r:R0[0],sp:[300,1100],up:1600,size0:6,size:20,c:'#2a2633'});
      for(let i=0;i<(low?10:22);i++){
        const a=Math.random()*tau,r=R0[1]*Math.random(),v=40+120*Math.random();
        GFX.pt({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*FSY,z:40+80*Math.random(),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:700+1100*Math.random(),g:-200,drag:1.5,
          life:1+.6*Math.random(),s:60+70*Math.random(),grow:120,m:5,b:'alpha',c:GFX.rgb('#1a1622'),c2:'#05040a',c3:'#6a6284',er:.9,ns:1.3,w:1,a:.6,L:0});
      }
      for(const c of cracks){
        const q=c.pts[0];
        K.dust(cx+q.x,cy+q.y*FSY,{n:low?1:3,dir:q.hd,spread:.35,sp:[500,1300],life:.7,a:.55,s:.8+c.w/40,c:'#1b1824',c3:'#6a6280'});
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
    // Second strike: blades burst out of the cracks from the centre outward while the petals stab in a wave.
    after(3.56,()=>{C.SND.inhale(.2,.2);C.move({zoom:.8,roll:.02},.2);});
    after(CUT2,()=>{
      hitstop=Math.max(hitstop,.05);C.shake(.6);C.SND.shing(.9,.3);X.sfx('whoosh',.6,.4);
      C.move({zoom:.72,roll:-.02},.25,'out');
      if(window.MK?.on())MK.play('assassinCut',{yaw:.6,blend:.06});
      if(gpu){
        GFX.light(cx,cy,reach*.6,steel.l,.45,.5,{z:160});
        GFX.ripple(cx,cy,reach,{life:.5,s:.35});
      }
      const list=X.onScreen(300).sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy));
      list.forEach((e,i)=>{
        const dir=Math.atan2((e.y-cy)/FSY,e.x-cx)+.5,dist=Math.hypot(e.x-cx,(e.y-cy)/FSY);
        after(Math.max(0,(dist-CR0)/3800-.06),()=>{
          if(e.dead)return;
          X.dmg(e,Math.min(D*.03,e.hp*.15),{crit:true,kb:0});
          K.knock(e,{dir,dist:180,up:600,stun:.4,fx:0});
          if(i<5)K.ehit(e,{pal:steel,pw:1,dir,ring:0,light:0});
        });
      });
    });
    after(4.4,()=>{C.back(1);GFX.ambient(1,1,1,1.5);});
    after(LIFE,()=>X.ultStop());
  }
  try{PM.init();}catch(e){}
  window.AssassinEclipse={cast,name:'흑련개화',desc:'단검 수십 자루가 영웅 뒤에서 거대한 검은 연꽃 봉오리로 감겨 오른다. 봉오리가 피는 순간 칼날 꽃잎이 사방으로 펼쳐져 화면 끝까지 쓸고, 모든 적 위에 떠 있던 단검이 한꺼번에 내리꽂힌다.'};
})();

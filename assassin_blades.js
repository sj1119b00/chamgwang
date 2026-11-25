// Forged double-bevel daggers. Geometry is authored in the blade's own frame.
'use strict';
(() => {
  const F=window.FX3, FSY=.58, tau=2*Math.PI;
  if(!F) return;
  const metal=0, edge=1, fuller=2, leather=3, trim=4, gem=5;
  const vertices=[];
  let meshOut=vertices;
  function normal(a,b,c,center){
    const u=b.map((v,i)=>v-a[i]), v=c.map((x,i)=>x-a[i]);
    let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const h=Math.hypot(...n);
    if(h<1e-7) return null;
    const flip=n.reduce((s,x,i)=>s+x*((a[i]+b[i]+c[i])/3-center[i]),0)<0?-1:1;
    return n.map(x=>x*flip/h);
  }
  function triangle(a,b,c,center,material,smooth){
    const n=normal(a,b,c,center);
    if(!n) return;
    for(const [i,p] of [a,b,c].entries()) meshOut.push(...p,...(smooth?.[i]||n),material);
  }
  function bridge(lo,hi,center,materials){
    for(let j=0;j<lo.length;j++){
      const k=(j+1)%lo.length, mat=materials[j%materials.length];
      triangle(lo[j],hi[j],hi[k],center,mat);
      triangle(lo[j],hi[k],lo[k],center,mat);
    }
  }
  // The inset channel and four bevels are cut into each side of the blade.
  const sections=[
    [-.35,-.105,.112,.063],[-.18,-.193,.147,.09],[-.07,-.238,.245,.094],
    [.10,-.221,.118,.084],[.25,-.201,.144,.08],[.49,-.14,.179,.069],
    [.71,-.045,.195,.051],[.91,.085,.203,.034],[1.14,.21,.211,.001]];
  const face=[[0,0],[.14,.67],[.48,1],[.55,.68],[.69,.56],[.77,.93],[.95,.62],[1,.18],
    [1,-.18],[.95,-.62],[.77,-.93],[.69,-.56],[.55,-.68],[.48,-1],[.14,-.67]];
  const cladding=[edge,metal,trim,fuller,fuller,metal,edge,metal,edge,metal,fuller,fuller,trim,metal,edge];
  const steelRings=sections.map(([x,lower,upper,h])=>face.map(([q,z])=>[x,(lower+(upper-lower)*q)*1.11,h*z*1.52]));
  // Smooth along the grind; retain a hard normal break between the hollow, bevel and spine.
  const stripNormals=steelRings.map((ring,i)=>ring.map((a,j)=>{
    const left=steelRings[Math.max(0,i-1)][j],right=steelRings[Math.min(i+1,steelRings.length-1)][j];
    const ahead=right.map((v,k)=>a[k]+v-left[k]),[x,lower,upper]=sections[i];
    return normal(a,ahead,ring[(j+1)%ring.length],[x,.55*(lower+upper),0]);
  }));
  for(let i=1;i<steelRings.length;i++){
    const [x,lo,hi]=sections[i-1],center=[x,.55*(lo+hi),0],a=steelRings[i-1],b=steelRings[i];
    for(let j=0;j<a.length;j++){
      const k=(j+1)%a.length, n0=stripNormals[i-1][j],n1=stripNormals[i][j];
      triangle(a[j],b[j],b[k],center,cladding[j],[n0,n1,n1]);
      triangle(a[j],b[k],a[k],center,cladding[j],[n0,n1,n0]);
    }
  }
  function lathed(profile,axis,mat,sides=10){
    const rings=profile.map(([along,c,ra,rb])=>Array.from({length:sides},(_,i)=>{
      const t=tau*i/sides, a=Math.cos(t)*ra,b=Math.sin(t)*rb;
      return axis===0?[along,c+a,b]:[c+a,along,b];
    }));
    for(let i=1;i<rings.length;i++){
      const [along,c]=profile[i-1];
      bridge(rings[i-1],rings[i],axis===0?[along,c,0]:[c,along,0],[mat]);
    }
  }
  lathed([[-.88,0,.018,.018],[-.83,0,.093,.102],[-.76,0,.083,.087],
    [-.56,0,.075,.082],[-.42,0,.09,.092],[-.37,0,.07,.076]],0,leather);
  for(const x of [-.814,-.71,-.59,-.465]){
    lathed([[x-.023,0,.081,.088],[x-.014,0,.097,.101],[x+.005,0,.098,.101],
      [x+.017,0,.082,.088]],0,trim);
  }
  // A swept, solid guard passes through the ricasso.
  lathed([[-.27,-.19,.003,.004],[-.22,-.24,.048,.032],[-.12,-.34,.066,.072],
    [0,-.35,.092,.11],[.13,-.33,.068,.075],[.23,-.37,.046,.046],[.32,-.46,.004,.004]],1,trim,8);
  const ringCenter=-.91, radius=.109, loop=[];
  for(let i=0;i<=18;i++){
    const t=tau*i/18, ct=Math.cos(t), st=Math.sin(t);
    loop.push(Array.from({length:6},(_,j)=>{
      const u=tau*j/6, r=radius+.028*Math.cos(u);
      return [ringCenter+r*ct,r*st,.028*Math.sin(u)];
    }));
    if(i) bridge(loop[i-1],loop[i],[ringCenter+radius*Math.cos(t-tau/36),radius*Math.sin(t-tau/36),0],[trim]);
  }
  for(const side of [-1,1]){
    const corners=[[-.445,0],[-.371,-.075],[-.214,-.018],[-.26,.069],[-.355,.11]];
    const crown=[-.34,.012,side*.159];
    for(let i=0;i<corners.length;i++){
      triangle([...corners[i],side*.08],[...corners[(i+1)%corners.length],side*.08],crown,[-.34,.016,0],gem);
    }
  }
  const batchSize=4, materialStride=8;
  const vertexShader=`attribute vec3 point,normal; attribute float part;
    uniform mat4 models[${batchSize}];uniform vec3 origins[${batchSize}],tints[${batchSize}];uniform vec4 tones[${batchSize}];
    uniform vec4 camera;uniform vec2 halfView;
    varying vec3 N,P,W;varying float matID,faceAngle;
    varying vec4 tone;varying vec3 tint;
    void main(){
      int slot=int(part/${materialStride}.);
      mat4 model=models[slot];vec3 origin=origins[slot];tone=tones[slot];tint=tints[slot];
      vec3 offset=(model*vec4(point,0.)).xyz;
      vec3 pos=vec3(origin.x+offset.x,origin.y/.58+offset.y,origin.z+offset.z);
      float dx=pos.x+camera.x,dy=pos.y*.58+camera.y-pos.z;
      float c=cos(camera.w),s=sin(camera.w);
      float depth=((pos.y+camera.y/.58)+.58*pos.z)/40000.;
      gl_Position=vec4(vec2(dx*c-dy*s,-dx*s-dy*c)*camera.z/halfView,-clamp(depth,-.95,.95),1.);
      N=mat3(model)*normal;P=point;W=pos;matID=mod(part,${materialStride}.);
      faceAngle=abs(dot(normalize(model[2].xyz),normalize(vec3(0.,1.,.58))));
    }`;
  const fragmentShader=`#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec3 N,P,W;varying float matID,faceAngle;
    varying vec4 tone;varying vec3 tint;uniform vec4 lightP[3];uniform vec3 lightC[3];
    void main(){
      vec3 n=normalize(N),v=normalize(vec3(0.,1.,.58));
      if(dot(n,v)<0.)discard;
      vec3 r=reflect(-v,n), key=normalize(vec3(-.45,.38,.81));
      float nv=max(dot(n,v),0.),f=pow(1.-nv,3.),sky=smoothstep(-.45,.86,r.z);
      vec3 environment=mix(vec3(.038,.043,.050),vec3(.40,.44,.48),sky*sky);
      // A canted reflection strip sweeps down the distal grind as successive sections turn toward it.
      float sweep=dot(r,normalize(vec3(.24,.86,.45)))-.10-.10*(P.x-.24);
      float strip=exp(-abs(sweep)*20.);
      float rim=exp(-abs(dot(r,normalize(vec3(-.61,.22,.75)))-.30)*27.);
      environment+=vec3(.83,.90,1.01)*strip+vec3(.72,.68,.62)*rim;
      float lambert=max(dot(n,key),0.);
      // Fine, longitudinal grind marks break up highlights on the body but leave a polished cutting edge.
      float grind=.93+.07*sin(71.*P.y+4.*sin(P.x*13.)+2.5*sin(P.y*37.));
      vec3 col=(vec3(.068,.072,.088)*(.36+.90*lambert)+environment*(.83+.30*f))*grind;
      bool polished=matID>.5&&matID<1.5;
      if(polished)col=environment*1.13+vec3(.21,.22,.24)*(.74+.67*lambert);
      if(matID>1.5&&matID<2.5)col=vec3(.012,.014,.025)+environment*(.21+.28*f)+tint*.14;
      if(matID>2.5&&matID<3.5){
        float wrap=.62+.38*smoothstep(-.48,.21,sin(P.x*139.+atan(P.z,P.y)*.9));
        col=vec3(.079,.070,.077)*(.49+.83*lambert)*wrap+environment*.12;
      }
      if(matID>3.5&&matID<4.5) col=vec3(.15,.15,.16)*(.47+.67*lambert)+environment*vec3(.80,.76,.72);
      if(matID>4.5) col=tint*(.41+.96*lambert)+environment*.57+f*vec3(.35,.25,.44);
      // The cutting lip is polished through the DLC. Only the broad reverse and its fuller stay charcoal.
      float satin=smoothstep(-.018,.022,P.z);
      if(matID<.5){
        vec3 coated=vec3(.044,.048,.054)+environment*(.22+.43*f)+vec3(.17)*strip;
        vec3 honed=col+vec3(.13,.15,.17)*(.57+.69*lambert);
        col=mix(coated,honed,satin);
      }
      if(matID>1.5&&matID<2.5)col*=mix(.61,1.13,satin);
      for(int i=0;i<3;i++){
        vec3 d=lightP[i].xyz-W;float d2=max(dot(d,d),1.);vec3 l=d*inversesqrt(d2);
        float radius=max(1.,lightP[i].w);
        float at=max(0.,1.-d2/(radius*radius));at*=at;
        float spec=pow(max(dot(n,normalize(l+v)),0.),23.);
        col+=lightC[i]*at*(col*.16*max(dot(n,l),0.)+spec*(polished?.50:.29));
      }
      // Keep the dark and satin faces within a steel midtone even under the large finisher light.
      // Only a mirror-aligned cutting edge can drive the bloom pass.
      float peak=max(col.r,max(col.g,col.b));
      col/=1.+max(0.,peak-(polished?.70:.51))*(polished?.80:1.35);
      if(polished){
        float glancing=1.-smoothstep(.06,.31,faceAngle);
        col+=vec3(.26,.30,.35)*pow(strip,3.)+vec3(.39,.44,.49)*glancing*(.49+.51*lambert);
      }
      float fog=P.x<0.?mix(tone.z,tone.y,clamp((P.x+.90)/.90,0.,1.)):
                         mix(tone.y,tone.w,clamp(P.x/1.13,0.,1.));
      col=mix(col,vec3(.032,.043,.062),fog*.72);
      float alpha=tone.x*(1.-.78*fog);
      gl_FragColor=vec4(col*alpha,alpha);
    }`;
  const shadowVS=`attribute vec2 corner;uniform vec4 rect,camera;uniform vec2 halfView;
    varying vec2 ground;void main(){
      ground=rect.xy+corner*rect.zw;
      vec2 p=vec2(ground.x+camera.x,ground.y*.58+camera.y)*camera.z;
      float c=cos(camera.w),s=sin(camera.w);
      gl_Position=vec4((p.x*c-p.y*s)/halfView.x,-(p.x*s+p.y*c)/halfView.y,0.,1.);
    }`;
  const shadowFS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 ground;
    uniform vec2 shape[6];uniform vec3 penumbra;
    float edgeD(vec2 p,vec2 a,vec2 b){vec2 e=b-a,v=p-a;
      return length(v-e*clamp(dot(v,e)/max(dot(e,e),.01),0.,1.));}
    float cross2(vec2 a,vec2 b){return a.x*b.y-a.y*b.x;}
    float triangleD(vec2 p,vec2 a,vec2 b,vec2 c){
      float d=min(edgeD(p,a,b),min(edgeD(p,b,c),edgeD(p,c,a)));
      float signTri=sign(cross2(b-a,c-a));
      float inside=min(cross2(b-a,p-a)*signTri,min(cross2(c-b,p-b)*signTri,cross2(a-c,p-c)*signTri));
      return inside>=0.?-d:d;
    }
    void main(){vec2 p=ground-shape[0];vec2 a=shape[1]-shape[0],b=shape[2]-shape[0];
      vec2 tip=shape[3]-shape[0],c=shape[4]-shape[0],pommel=shape[5]-shape[0];
      float sd=min(triangleD(p,a,b,tip),triangleD(p,a,tip,c));
      sd=min(sd,edgeD(p,pommel,a)-penumbra.z);
      float aShadow=penumbra.y*(1.-smoothstep(-penumbra.x,penumbra.x*1.6,sd));
      gl_FragColor=vec4(vec3(.018,.019,.027)*aShadow,aShadow);
    }`;
  let program,buffer,uniforms,shadowProgram,shadowBuffer,su,failed=false;
  function link(vsrc,fsrc,attributes){
    const compile=(type,src)=>{
      const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
      return s;
    };
    const vs=compile(gl.VERTEX_SHADER,vsrc),fs=compile(gl.FRAGMENT_SHADER,fsrc);
    const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);
    attributes.forEach((name,i)=>gl.bindAttribLocation(p,i,name));gl.linkProgram(p);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
    return p;
  }
  function init(){
    if(program||failed||!F.on) return !!program;
    try{
      const p=link(vertexShader,fragmentShader,['point','normal','part']);
      uniforms={};
      for(const name of ['models','origins','camera','halfView','tones','tints','lightP','lightC']){
        uniforms[name]=gl.getUniformLocation(p,name);
      }
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      // Consecutive copies keep the submitted triangle order. Each copy selects
      // its own transform and shading uniforms, including on WebGL 1 without instancing.
      const packed=new Float32Array(vertices.length*batchSize);
      for(let slot=0;slot<batchSize;slot++){
        const offset=slot*vertices.length;
        packed.set(vertices,offset);
        for(let v=6;v<vertices.length;v+=7)packed[offset+v]+=slot*materialStride;
      }
      gl.bufferData(gl.ARRAY_BUFFER,packed,gl.STATIC_DRAW);
      shadowProgram=link(shadowVS,shadowFS,['corner']);
      su={};
      for(const name of ['rect','camera','halfView','shape','penumbra'])su[name]=gl.getUniformLocation(shadowProgram,name);
      shadowBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,shadowBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      program=p;
    }catch(e){failed=true;console.warn('Assassin blade mesh',e);}
    return !!program;
  }
  function model(p,prev,len,roll){
    const dx=p.x-prev.x,dy=(p.y-prev.y)/FSY,dz=p.z-prev.z;
    return F.xf({s:len,rz:Math.atan2(dy,dx),ry:-Math.atan2(dz,Math.hypot(dx,dy)),rx:roll});
  }
  function color(hex){
    const v=parseInt(hex.slice(1),16);
    return [(v>>16)/255,(v>>8&255)/255,(v&255)/255];
  }
  let batch,shadows;
  function transform(m,p){
    return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]];
  }
  function footprint(b){
    function floor(p){
      const [x,y,z]=transform(b.M,p),h=Math.max(0,b.p.z+z);
      return [b.p.x+x+h*.31,b.p.y/FSY+y-h*.19];
    }
    const heel=floor([-.34,0,0]),tip=floor([1.14,.21,0]),tail=floor([-1.05,0,0]);
    const samples=steelRings[2].map(floor),dx=tip[0]-heel[0],dy=tip[1]-heel[1];
    samples.sort((a,c)=>dx*(a[1]-c[1])-dy*(a[0]-c[0]));
    return [heel,heel,samples[0],tip,samples[samples.length-1],tail];
  }
  function fogEnds(p,m,center,query){
    if(!query)return [center,center];
    return [[-.90,0,0],[1.13,.21,0]].map(q=>{
      const [dx,dy,dz]=transform(m,q);
      return query({x:p.x+dx,y:p.y+dy*FSY,z:p.z+dz});
    });
  }
  function paintShadows(q){
    gl.useProgram(shadowProgram);gl.bindBuffer(gl.ARRAY_BUFFER,shadowBuffer);
    gl.enableVertexAttribArray(0);gl.disableVertexAttribArray(1);gl.disableVertexAttribArray(2);gl.disableVertexAttribArray(3);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.uniform4f(su.camera,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot);gl.uniform2f(su.halfView,W/2,H/2);
    for(const b of q.blades){
      const poly=footprint(b),xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
      const soft=2+b.len*.019+b.p.z*.11,a=b.a*.48*Math.exp(-.80*b.p.z/b.len);
      const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys),pad=soft*2+b.len*.1;
      gl.uniform4f(su.rect,Math.min(...xs)+width/2,Math.min(...ys)+height/2,width/2+pad,height/2+pad);
      gl.uniform2fv(su.shape,new Float32Array(poly.flat()));gl.uniform3f(su.penumbra,soft,a,b.len*.063);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);F.stats.draws++;
    }
    shadows=null;
  }
  const targets=new WeakMap(),lampPos=new Float32Array(12),lampCol=new Float32Array(9);
  const models=new Float32Array(16*batchSize),origins=new Float32Array(3*batchSize);
  const tones=new Float32Array(4*batchSize),tints=new Float32Array(3*batchSize);
  function paint(q){
    const fb=gl.getParameter(gl.FRAMEBUFFER_BINDING),vp=gl.getParameter(gl.VIEWPORT);
    let depth=targets.get(fb);
    if(!depth || depth.w!==vp[2] || depth.h!==vp[3]){
      if(depth)gl.deleteRenderbuffer(depth.rb);
      const rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);
      gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,vp[2],vp[3]);gl.bindRenderbuffer(gl.RENDERBUFFER,null);
      depth={rb,w:vp[2],h:vp[3]};targets.set(fb,depth);
    }
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth.rb);
    gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LESS);gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,28,12);gl.vertexAttribPointer(2,1,gl.FLOAT,false,28,24);
    gl.uniform4f(uniforms.camera,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot);
    gl.uniform2f(uniforms.halfView,W/2,H/2);
    lampPos.fill(0);lampCol.fill(0);
    const lamps=window.GFX?.lights||[];
    for(let i=0;i<Math.min(3,lamps.length);i++){
      const l=lamps[lamps.length-1-i],fade=l.t<l.hold?1:Math.max(0,1-(l.t-l.hold)/l.life);
      lampPos.set([l.x,l.y/FSY,(l.z||0)+90,l.r*1.5],i*4);
      lampCol.set(l.c.map(x=>x*l.a*fade*fade),i*3);
    }
    gl.uniform4fv(uniforms.lightP,lampPos);gl.uniform3fv(uniforms.lightC,lampCol);
    for(let first=0;first<q.blades.length;first+=batchSize){
      const count=Math.min(batchSize,q.blades.length-first);
      for(let slot=0;slot<count;slot++){
        const b=q.blades[first+slot];
        models.set(b.M,16*slot);origins.set([b.p.x,b.p.y,b.p.z],3*slot);
        tones.set([b.a,b.fog,b.ends[0],b.ends[1]],4*slot);tints.set(b.rgb,3*slot);
      }
      gl.uniformMatrix4fv(uniforms.models,false,models);gl.uniform3fv(uniforms.origins,origins);
      gl.uniform4fv(uniforms.tones,tones);gl.uniform3fv(uniforms.tints,tints);
      gl.drawArrays(gl.TRIANGLES,0,count*vertices.length/7);F.stats.draws++;
    }
    gl.disable(gl.DEPTH_TEST);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,null);
    batch=null;
  }
  function draw(p,prev,len,roll,palette,alpha,ord=8,fog=0,fogAt){
    if(!init()) return false;
    if(!batch||batch.ord!==ord||!F.q.includes(batch)){
      batch={L:1,ord,render:paint,blades:[]};F.q.push(batch);
    }
    const M=model(p,prev,len,roll);
    const blade={p,M,rgb:color(palette.m),a:alpha,fog,len,ends:fogEnds(p,M,fog,fogAt)};
    batch.blades.push(blade);
    if(!F.low && F.ground && p.z<len*2.6){
      if(!shadows||!F.q.includes(shadows)){shadows={L:0,ord:-4,render:paintShadows,blades:[]};F.q.push(shadows);}
      shadows.blades.push(blade);
    }
    return true;
  }
  // The fallback uses the same ridge, guard and grip in a reduced polygon model.
  let lowFaces;
  function fallbackMesh(){
    const data=[];meshOut=data;
    const slices=[0,2,3,5,7,8],bands=[0,2,5,7,10,13];
    for(let i=1;i<slices.length;i++){
      const lo=slices[i-1],hi=slices[i],center=[sections[lo][0],.55*(sections[lo][1]+sections[lo][2]),0];
      bridge(bands.map(j=>steelRings[lo][j]),bands.map(j=>steelRings[hi][j]),center,[edge,fuller,metal,metal,fuller,edge]);
    }
    lathed([[-.91,0,.058,.05],[-.8,0,.10,.10],[-.42,0,.093,.084],[-.34,0,.048,.05]],0,leather,5);
    lathed([[-.27,-.19,.004,.003],[-.11,-.32,.07,.07],[0,-.35,.092,.11],[.14,-.33,.067,.07],[.32,-.46,.004,.004]],1,trim,5);
    for(const side of [-1,1]){
      const a=[-.44,0,side*.081],b=[-.32,.11,side*.082],c=[-.21,-.015,side*.08],d=[-.34,.01,side*.16],e=[-.35,-.09,side*.08],o=[-.34,0,0];
      triangle(a,b,d,o,gem);triangle(b,c,d,o,gem);triangle(c,e,d,o,gem);triangle(e,a,d,o,gem);
    }
    meshOut=vertices;
    lowFaces=[];
    for(let i=0;i<data.length;i+=21){
      lowFaces.push({points:[data.slice(i,i+3),data.slice(i+7,i+10),data.slice(i+14,i+17)],n:data.slice(i+3,i+6),mat:data[i+6],along:(data[i]+data[i+7]+data[i+14])/3,satin:data[i+2]+data[i+9]+data[i+16]>0});
    }
  }
  function canvas(ctx,p,prev,len,roll,palette,alpha,fog=0,fogAt){
    if(!lowFaces)fallbackMesh();
    const m=model(p,prev,len,roll),visible=[],tint=color(palette.m),ends=fogEnds(p,m,fog,fogAt);
    const grazing=Math.max(0,1-Math.abs(.865*m[9]+.502*m[10])/len/.31);
    for(const f of lowFaces){
      const n=transform(m,f.n).map(v=>v/len),nv=n[1]*.865+n[2]*.502;
      if(nv<=0)continue;
      const pts=f.points.map(q=>transform(m,q)),h=pts.reduce((s,q)=>s+q[1]+q[2]*FSY,0);
      const rx=2*nv*n[0],ry=2*nv*n[1]-.865,rz=2*nv*n[2]-.502;
      const env=.055+.37*Math.max(0,rz)+.77*Math.exp(-14*Math.abs(rx*.24+ry*.86+rz*.45-.1));
      const kd=Math.max(0,n[0]*-.45+n[1]*.38+n[2]*.81);
      const faceTone=f.satin?.14+env*.84+kd*.13:.048+env*(.25+.22*(1-nv));
      const k=f.mat===edge?.30+env*.94+kd*.17+.28*grazing:f.mat===metal?faceTone:f.mat===fuller?.05+env*.32:f.mat===leather?.043+.055*kd:env*.68+.11;
      const rgb=tint.map((v,j)=>Math.min(255,Math.round(255*(f.mat===gem?v*(.46+kd*.63)+env*.42:k*(j===2?1.07:1)))));
      const side=f.along<0?0:1,weight=Math.min(1,Math.abs(f.along)/(side?1.13:.90));
      visible.push({pts,h,fill:'rgb('+rgb.join(',')+')',fog:fog+(ends[side]-fog)*weight});
    }
    visible.sort((a,b)=>a.h-b.h);ctx.save();const opacity=ctx.globalAlpha*alpha;ctx.translate(p.x,p.y-p.z);
    for(const f of visible){
      ctx.globalAlpha=opacity*(1-f.fog*.82);ctx.fillStyle=f.fill;ctx.beginPath();
      for(let i=0;i<3;i++){const q=f.pts[i];if(i)ctx.lineTo(q[0],q[1]*FSY-q[2]);else ctx.moveTo(q[0],q[1]*FSY-q[2]);}
      ctx.closePath();ctx.fill();
    }
    ctx.restore();return true;
  }
  window.AssassinBlades={draw,canvas};
  init();
})();

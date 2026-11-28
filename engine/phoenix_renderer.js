// Draw the Blender mesh into FX3's battle framebuffer. Skin and shade each articulated
// group on the GPU; the transparent photograph is a material on the individual vanes.
(()=>{
'use strict';
const geometry=['position','normal','fold','gust','uv','pigment'];
const attributes=[...geometry,'material'];
const uniforms=['uPose','uFold','uGust','uScreen','uFacing','uView','uRoll','uTime',
  'uAtlas','uOpacity','uAmbient','uFirelight','uFringe'];
const vertex=`
attribute vec3 position,normal,fold,gust,pigment;
attribute vec2 uv;
attribute vec3 material;
uniform mat4 uPose;
uniform vec2 uView,uRoll;
uniform vec4 uScreen;
uniform float uFold,uGust,uFacing,uFringe;
varying vec2 texCoord;
varying vec3 color,n,rest;
varying float role,phase,temperature;
void main(){
  vec3 p=(uPose*vec4(position+fold*uFold+gust*uGust,1.)).xyz;
  vec2 viewXZ=vec2(dot(p.xz,uView),dot(p.xz,vec2(-uView.y,uView.x)));
  vec2 plane=vec2(uFacing*viewXZ.x,p.y);
  if(uFringe<-.5)plane+=.018*plane/max(length(plane),.15);
  vec2 rotated=vec2(dot(plane,uRoll),dot(plane,vec2(-uRoll.y,uRoll.x)));
  gl_Position=vec4(uScreen.zw+uScreen.xy*rotated,viewXZ.y,1.);
  vec3 dir=mat3(uPose)*normal;
  n=normalize(vec3(uFacing*dot(dir.xz,uView),dir.y,dot(dir.xz,vec2(uView.y,-uView.x))));
  texCoord=uv; color=pigment; rest=position; role=material.x*255.; phase=material.y; temperature=material.z;
}`;
const fragment=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uAtlas;
uniform float uTime,uOpacity,uFringe;
uniform vec3 uAmbient,uFirelight;
varying vec2 texCoord;
varying vec3 color,n,rest;
varying float role,phase,temperature;
float hash(vec2 p){
  vec3 v=fract(vec3(p.xyx)*vec3(.1031,.11369,.13787));
  v+=dot(v,v.yzx+19.19);
  return fract((v.x+v.y)*v.z);
}
float cloud(vec2 p){
  vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
             mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
vec3 flame(float k){
  vec3 c=mix(vec3(.092,.009,.018),vec3(.82,.074,.013),smoothstep(.19,.52,k));
  c=mix(c,vec3(1.72,.54,.038),smoothstep(.46,.73,k));
  return mix(c,vec3(2.3,1.75,.82),smoothstep(.67,.91,k));
}
void main(){
  vec3 N=normalize(n);
  if(N.z<0.)N=-N;
  float key=max(dot(N,normalize(vec3(-.44,.71,.55))),0.);
  float back=max(dot(N,normalize(vec3(.66,.57,-.48))),0.);
  float rim=pow(1.-abs(N.z),2.);
  vec3 lit=vec3(.32)+.21*uAmbient+key*vec3(.51,.45,.39)+uFirelight;
  vec3 rgb=color*lit;
  float alpha=1.;
  vec2 flow=vec2(rest.x*.87+rest.z*.64,rest.y+rest.z*.63);
  float clock=uTime*.67;
  float broad=cloud(flow*3.25+vec2(.12,-.36)*clock);
  float curl=cloud(flow*6.1+vec2(broad*1.25,1.38*broad-clock));
  float cord=1.-abs(2.*cloud(flow*vec2(8.,4.)+vec2(curl*2.6,1.7*broad-clock))-1.);
  float fire=clamp(broad*.41+curl*.17+cord*cord*.37+.14*temperature,0.,1.);
  if(uFringe<-.5){
    if((role>1.5&&role<3.5)||temperature<.36)discard;
    float veil=role<.5?.32:texture2D(uAtlas,texCoord).a;
    float a=veil*smoothstep(.35,.83,temperature)*uOpacity;
    gl_FragColor=vec4(vec3(.17,.042,.004)*a,0.);
    return;
  }
  if((role>.5&&role<1.5)||role>3.5){
    // Flow slowly along the barb direction, with each feather at a different phase.
    float t=uTime*4.8+phase*6.28, bend=sin(texCoord.y*11.-t);
    vec2 uv=texCoord+vec2(.013*bend*sin(3.14159*texCoord.y)+.029*(curl-.5),
      .008*sin(texCoord.y*17.-t*1.3+texCoord.x*8.)+.045*(broad-.5));
    vec4 plume=texture2D(uAtlas,clamp(uv,.001,.999));
    float heat=smoothstep(.08,.82,plume.g+.21*plume.b);
    float shaft=pow(max(0.,1.-abs(uv.x-.5)*8.),2.)*smoothstep(.16,.52,plume.g);
    float flicker=.91+.09*sin(t*2.1-texCoord.y*15.5);
    alpha=role>3.5?plume.a*.77:.48+.52*plume.a;
    float exposure=.19+2.20*pow(temperature,2.2);
    vec3 ember=mix(vec3(.22,.023,.026),vec3(1.18,.24,.037),heat);
    vec3 gold=mix(ember,vec3(2.1,1.12,.32),smoothstep(.52,.92,heat)*(.51+.45*temperature));
    gold=mix(gold,vec3(2.38,1.87,1.19),max(shaft*.83,smoothstep(.80,.98,heat)*pow(temperature,2.)));
    rgb=plume.rgb*(.17+.22*key)+gold*exposure*(.69+.29*key)*flicker;
    rgb+=flame(fire)*(.13+.27*temperature)*smoothstep(.28,.83,cord);
    rgb+=vec3(.33,.11,.025)*(back*.63+rim*.33)*plume.r;
  }else if(role>2.5){
    rgb=color*(1.06+.21*sin(uTime*8.))+vec3(.23,.08,.012);
  }else if(role>1.5){
    rgb=color*lit+vec3(.12,.089,.064)*pow(max(N.z,0.),16.);
  }else{
    rgb=.20*rgb+flame(fire)*(.61+.64*temperature)*(.66+.40*key);
    rgb+=vec3(.46,.14,.027)*(back*.25+rim*.51);
  }
  // Opaque vanes first; softer tongues can then blend over the visible anatomy.
  if(alpha<.035||(uFringe<.5?alpha<.72:alpha>=.72))discard;
  alpha*=uOpacity;
  gl_FragColor=vec4(rgb*alpha,alpha);
}`;
let resource=null,loading=null,failed=false;

function compileProgram(vs=vertex,fs=fragment,inputs=attributes){
  const program=gl.createProgram(),shaders=[];
  try{
    for(const [kind,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
      const shader=gl.createShader(kind);
      shaders.push(shader);
      gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
    }
    inputs.forEach((name,i)=>gl.bindAttribLocation(program,i,name));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    return program;
  }catch(error){gl.deleteProgram(program);throw error;}
  finally{for(const shader of shaders)gl.deleteShader(shader);}
}
// Free fire peels away from selected shafts. The root follows this instant's joint while
// the hottest gas at the tip retains an earlier orientation through the power stroke.
const plumeInputs=['root','tip','rootFold','tipFold','rootGust','tipGust','section','attachment'];
const plumeSizes=[3,3,3,3,3,3,4,2];
const plumeVertex=`
attribute vec3 root,tip,rootFold,tipFold,rootGust,tipGust;
attribute vec4 section;
attribute vec2 attachment;
uniform mat4 uPlumeNow[11],uPlumePast[11];
uniform vec4 uMorph[11],uProjection;
uniform vec2 uView,uRoll;
uniform float uFacing,uPlumeClock,uStoop;
varying vec4 plume;
void main(){
  int j=int(attachment.x+.5);
  float kind=attachment.y,side=section.x,age=section.y,width=section.z,seed=section.w;
  vec4 morph=uMorph[j];
  vec3 a=root+rootFold*morph.x+rootGust*morph.y;
  vec3 b=tip+tipFold*morph.x+tipGust*morph.y;
  vec3 origin=(uPlumeNow[j]*vec4(a,1.)).xyz;
  vec3 axis=mat3(uPlumeNow[j])*(b-a);
  vec3 oldRoot=root+rootFold*morph.z+rootGust*morph.w;
  vec3 previous=(uPlumePast[j]*vec4(oldRoot,1.)).xyz;
  vec3 drift=previous-origin;
  drift*=min(1.,.23/max(.001,length(drift)));
  float age2=age*age,phase=6.283*seed;
  float rise=1.-uStoop,tail=step(1.5,kind);
  float breathe=.91+.11*sin(uPlumeClock*6.3+phase);
  vec3 path=axis*(1.33+.40*seed+.54*uStoop)*breathe;
  // An upstroke leaves warmer gas below the hand; a downstroke leaves it above.
  vec3 endFlow=drift*(.69-.21*tail)+vec3(0.,rise*(.060-.087*smoothstep(1.45,1.84,uPlumeClock))+.115*uStoop,.012);
  vec2 d=path.xy+endFlow.xy;
  vec2 tangent=d/max(.001,length(d)),crosswind=vec2(-tangent.y,tangent.x);
  float wave=sin(phase+age*5.7-uPlumeClock*8.3)+.38*sin(phase*1.8+age*8.4-uPlumeClock*5.7);
  vec3 p=origin+age*path+age2*endFlow;
  p.xy+=crosswind*wave*width*age*(1.18+.58*rise);
  float swell=(.72+.37*sin(3.14*min(1.,age*1.37)))*pow(max(.001,1.-age),.51);
  float w=width*swell*(.93+.14*sin(age*7.-uPlumeClock*7.+phase));
  p.xy+=crosswind*w*side;p.z-=w*.30*(1.-side*side);
  vec2 xz=vec2(dot(p.xz,uView),dot(p.xz,vec2(-uView.y,uView.x)));
  vec2 plane=vec2(uFacing*xz.x,p.y);
  gl_Position=vec4(uProjection.zw+uProjection.xy*vec2(dot(plane,uRoll),dot(plane,vec2(-uRoll.y,uRoll.x))),xz.y,1.);
  plume=vec4(side,age,seed,kind);
}`;
const plumeFragment=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uFeatherFire;
uniform float uPlumeClock,uIntensity;
varying vec4 plume;
void main(){
  float x=plume.x,y=plume.y,seed=plume.z,phase=seed*6.283;
  // The edges roll at different speeds. An intermittent central opening bifurcates
  // the tongue where hot sheets peel apart, while its root remains connected.
  float bend=.25*sin(5.6*y-uPlumeClock*6.9+phase)+.11*sin(11.*y-uPlumeClock*4.6+phase*.63);
  float channel=x+bend*(.47+.53*y);
  vec2 uv=vec2(.5+.36*channel,.14+.73*y+.067*sin(phase+y*4.-uPlumeClock*5.1));
  vec4 photo=texture2D(uFeatherFire,clamp(uv,.001,.999));
  float edge=1.-smoothstep(.29+.21*photo.g,1.,abs(channel));
  float gate=smoothstep(.29,.62,y);
  float roll=sin(12.*y+phase-uPlumeClock*5.2);
  float split=1.-smoothstep(.05,.24,abs(channel-.32*roll));
  // One side of the sheet burns through first. Individual swirls pinch off above
  // the opening, leaving short-lived independent flame tips at different heights.
  float nick=.5+.5*sin(y*22.+2.5*channel+phase-uPlumeClock*6.6);
  float lobe=(1.-gate*.91*split)*(1.-gate*smoothstep(.48,.85,nick)*(.83+.16*roll));
  float a=edge*lobe*smoothstep(0.,.15,y)*(1.-smoothstep(.82,1.,y))*.94*uIntensity;
  if(a<.012)discard;
  float heat=clamp(photo.g*.79+.34*(1.-abs(channel))+.17*(1.-y)+.12*(.5-nick)*gate,0.,1.);
  vec3 c=mix(vec3(.52,.044,.008),vec3(1.56,.37,.018),smoothstep(.23,.63,heat));
  c=mix(c,vec3(2.02,1.17,.30),smoothstep(.53,.83,heat));
  c=mix(c,vec3(2.25,1.84,1.02),smoothstep(.83,.99,heat)*(1.-.44*y));
  gl_FragColor=vec4(c*a,a*.75);
}`;

function makePlumes(model,bytes){
  const attr=model.attributes,read=(key,Type)=>{const a=attr[key];return new Type(bytes,a.offset,a.count*a.components);};
  const pos=read('position',Float32Array),uv=read('uv',Float32Array),fold=read('fold',Float32Array),gust=read('gust',Float32Array);
  const role=read('surface',Uint8Array),joint=read('joint',Uint8Array),grain=read('seed',Uint8Array);
  const vanes=model.joints.map(()=>[]);
  // Each Blender vane is emitted as its own contiguous strip with one pigment seed.
  // Select points on its rachis from its authored UVs, including their fold/gust offsets.
  for(let begin=0;begin<joint.length;){
    let end=begin+1;
    while(end<joint.length&&joint[end]===joint[begin]&&role[end]===role[begin]&&grain[end]===grain[begin])end++;
    if(role[begin]===1&&end-begin>12){
      const nearest=value=>{
        let best=begin,error=Infinity;
        for(let v=begin;v<end;v++){
          const d=5*(uv[v*2+1]-value)**2+(uv[v*2]-.498)**2;
          if(d<error){best=v;error=d;}
        }
        return best;
      };
      const base=nearest(.05),tip=nearest(.93),root=nearest(.61),mid=nearest(.40);
      const length=Math.hypot(...[0,1,2].map(k=>pos[tip*3+k]-pos[base*3+k]));
      if(length>.60||model.joints[joint[begin]]==='root')vanes[joint[begin]].push({base,root,mid,tip,length,seed:grain[begin]/255});
    }
    begin=end;
  }
  const emitters=[];
  for(const [j,group] of vanes.entries()){
    const name=model.joints[j],crest=name==='neck',tail=name==='tail',hand=name.startsWith('primaries.');
    if(!group.length||name.startsWith('wrist.'))continue;
    if(name==='root'){
      // The mantle has many short overlapping feathers. Follow four individual
      // rachises on the shoulder and rump, with the chest and bill left clear.
      for(const [x,y,z] of [[-.26,.20,.19],[.23,.31,.24],[-.18,-.22,.20],[.15,-.39,.19]]){
        const distance=v=>(pos[v.base*3]-x)**2+(pos[v.base*3+1]-y)**2+(pos[v.base*3+2]-z)**2;
        const vane=group.reduce((a,b)=>distance(a)<distance(b)?a:b);
        emitters.push({...vane,root:vane.base,j,width:.042,kind:0,core:y>0});
      }
      continue;
    }
    group.sort((a,b)=>b.length-a.length);
    const candidates=(crest||tail?group.slice(0,3):group.filter(v=>v.length>.71)).sort((a,b)=>pos[a.root*3]-pos[b.root*3]);
    const total=Math.min(candidates.length,hand?5:3);
    for(let k=0;k<total;k++){
      const vane=candidates[Math.round((k+.5)*candidates.length/total-.5)],seed=vane.seed;
      const width=(crest?.023:tail?.058:hand?.050:.042)*(.85+.27*seed);
      emitters.push({...vane,j,width,kind:tail?2:crest?1:0,core:k%2===0||tail});
      if(tail)emitters.push({...vane,root:vane.mid,j,width:width*.74,seed:(seed+.39)%1,kind:2,core:false});
    }
  }
  emitters.sort((a,b)=>Number(b.core)-Number(a.core));
  const data=[],indices=[];
  let index=0,lowCount=0;
  for(const e of emitters){
    const rows=12;
    for(let i=0;i<=rows;i++)for(const side of [-1,0,1]){
      for(const stream of [pos,fold,gust])for(const v of [e.root,e.tip]){
        data.push(stream[v*3],stream[v*3+1],stream[v*3+2]);
      }
      data.push(side,i/rows,e.width,e.seed,e.j,e.kind);
    }
    for(let i=0;i<rows;i++)for(let k=0;k<2;k++){
      const a=index+i*3+k;indices.push(a,a+1,a+3,a+1,a+4,a+3);
    }
    index+=(rows+1)*3;
    if(e.core)lowCount=indices.length;
  }
  let program;
  try{program=compileProgram(plumeVertex,plumeFragment,plumeInputs);}
  catch(error){console.warn('Phoenix fire ribbons:',error.message);return null;}
  const vb=gl.createBuffer(),ib=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  const loc=name=>gl.getUniformLocation(program,name);
  const u=Object.fromEntries(['uPlumeNow','uPlumePast','uMorph','uProjection','uRoll','uView','uFacing','uPlumeClock','uStoop','uIntensity','uFeatherFire'].map(n=>[n,loc(n)]));
  return {program,vb,ib,u,count:indices.length,lowCount,now:new Float32Array(model.jointCount*16),
    past:new Float32Array(model.jointCount*16),morph:new Float32Array(model.jointCount*4)};
}

function drawPlumes(q,g,m){
  const p=g.plumes;
  if(!p)return;
  const f=q.pose.i+q.pose.k,ago=Math.max(0,f-2.8);
  function sample(at,out,offset){
    const i=Math.floor(at),j=Math.min(m.frameCount-1,i+1),k=at-i,n=m.jointCount;
    for(let v=0;v<out.length;v++){const a=g.poses[i*n*16+v];out[v]=a+(g.poses[j*n*16+v]-a)*k;}
    for(let v=0;v<n;v++){
      p.morph[v*4+offset]=g.fold[i]+(g.fold[j]-g.fold[i])*k;
      const a=g.gust[i*n+v];p.morph[v*4+offset+1]=a+(g.gust[j*n+v]-a)*k;
    }
  }
  sample(f,p.now,0);sample(ago,p.past,2);
  gl.useProgram(p.program);gl.bindBuffer(gl.ARRAY_BUFFER,p.vb);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,p.ib);
  let offset=0;
  for(let i=0;i<plumeSizes.length;i++){
    gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,plumeSizes[i],gl.FLOAT,false,96,offset);
    offset+=plumeSizes[i]*4;
  }
  const u=p.u;
  gl.uniformMatrix4fv(u.uPlumeNow,false,p.now);gl.uniformMatrix4fv(u.uPlumePast,false,p.past);gl.uniform4fv(u.uMorph,p.morph);
  gl.uniform2fv(u.uRoll,q.roll);gl.uniform2fv(u.uView,q.view);gl.uniform4fv(u.uProjection,q.screen);
  gl.uniform1f(u.uFacing,q.dir);gl.uniform1f(u.uPlumeClock,q.t);gl.uniform1f(u.uStoop,q.t>=2.10?1:0);
  gl.uniform1f(u.uIntensity,q.alpha);gl.uniform1i(u.uFeatherFire,0);
  gl.depthMask(false);
  gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.drawElements(gl.TRIANGLES,FX3.low?p.lowCount:p.count,gl.UNSIGNED_SHORT,0);
  gl.disableVertexAttribArray(7);
}
function upload(model,bytes,image){
  const a=model.attributes;
  const indices=new Uint16Array(bytes,a.indices.offset,model.indexCount);
  const poses=new Float32Array(bytes,a.poses.offset,model.frameCount*model.jointCount*16);
  const fold=new Float32Array(bytes,a.foldWeight.offset,model.frameCount);
  const gust=new Float32Array(bytes,a.gustWeight.offset,model.frameCount*model.jointCount);
  const material=new Uint8Array(model.vertexCount*3);
  const bytes8=new Uint8Array(bytes);
  for(let i=0;i<model.vertexCount;i++){
    material[3*i]=bytes8[a.surface.offset+i];
    material[3*i+1]=bytes8[a.seed.offset+i];
    material[3*i+2]=a.heat?bytes8[a.heat.offset+i]:200;
  }
  const program=compileProgram(),vbo=gl.createBuffer(),mbo=gl.createBuffer(),ibo=gl.createBuffer(),texture=gl.createTexture();
  const prevArray=gl.getParameter(gl.ARRAY_BUFFER_BINDING),prevIndex=gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
  const active=gl.getParameter(gl.ACTIVE_TEXTURE);
  gl.activeTexture(gl.TEXTURE0);
  const prevTexture=gl.getParameter(gl.TEXTURE_BINDING_2D);
  const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),premultiply=gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
  try{
    gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
    const lastByte=Math.max(...geometry.map(name=>{
      const v=a[name];return v.offset+model.vertexCount*v.components*(v.type==='f32'?4:1);
    }));
    gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(bytes,0,lastByte),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,mbo);gl.bufferData(gl.ARRAY_BUFFER,material,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    // A flight feather narrows to only a few pixels at its tip. Filter its many
    // photographic barbs into a smooth flame vein, even on WebGL 1 / NPOT devices.
    const pot=n=>2**Math.round(Math.log2(n));
    let source=image;
    if(pot(image.naturalWidth)!==image.naturalWidth||pot(image.naturalHeight)!==image.naturalHeight){
      source=document.createElement('canvas');
      source.width=pot(image.naturalWidth);source.height=pot(image.naturalHeight);
      const g=source.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(image,0,0,source.width,source.height);
    }
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const u=Object.fromEntries(uniforms.map(n=>[n,gl.getUniformLocation(program,n)]));
    const plumes=makePlumes(model,bytes);
    return {program,u,vbo,mbo,ibo,texture,poses,fold,gust,plumes};
  }catch(error){
    gl.deleteTexture(texture);gl.deleteBuffer(vbo);gl.deleteBuffer(mbo);gl.deleteBuffer(ibo);gl.deleteProgram(program);throw error;
  }finally{
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,premultiply);
    gl.bindTexture(gl.TEXTURE_2D,prevTexture);gl.activeTexture(active);
    gl.bindBuffer(gl.ARRAY_BUFFER,prevArray);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,prevIndex);
  }
}
async function load(model){
  const image=new Image();
  image.src=model.texture;
  const [bytes]=await Promise.all([fetch(model.url).then(r=>{
    if(!r.ok)throw Error('HTTP '+r.status+' for '+model.url);
    return r.arrayBuffer();
  }),image.decode()]);
  if(!gl.isContextLost())resource=upload(model,bytes,image);
}
function preload(onFailure){
  const model=window.PhoenixMesh;
  if(resource||loading||!model||!window.FX3?.on)return;
  loading=load(model).then(()=>{failed=!resource;}).catch(error=>{
    failed=true;onFailure?.();console.warn('Phoenix mesh:',error.message);
  }).finally(()=>{loading=null;});
}
const matrix=new Float32Array(16);
function paint(q,lights,colors){
  const m=window.PhoenixMesh,g=resource;
  if(!g)return;
  const {u}=g;
  gl.useProgram(g.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,g.vbo);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.ibo);
  geometry.forEach((name,i)=>{
    const a=m.attributes[name];
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i,a.components,a.type==='f32'?gl.FLOAT:gl.UNSIGNED_BYTE,
      name==='pigment',0,a.offset);
  });
  gl.bindBuffer(gl.ARRAY_BUFFER,g.mbo);gl.enableVertexAttribArray(6);
  gl.vertexAttribPointer(6,3,gl.UNSIGNED_BYTE,true,0,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,g.texture);
  gl.uniform1i(u.uAtlas,0);gl.uniform1f(u.uTime,q.t);gl.uniform1f(u.uOpacity,q.alpha);
  gl.uniform1f(u.uFacing,q.dir);gl.uniform2fv(u.uView,q.view);gl.uniform2fv(u.uRoll,q.roll);
  gl.uniform4fv(u.uScreen,q.screen);gl.uniform3fv(u.uAmbient,GFX.amb);
  const warm=[0,0,0],c=q.chest;
  for(let j=0;j<4;j++){
    const r=lights[j*4+3];
    if(!r)continue;
    const distance=Math.hypot(c.x-lights[j*4],(c.y-lights[j*4+1])/.58,c.z-lights[j*4+2]);
    const w=.15*Math.pow(Math.max(0,1-distance/r),2);
    for(let k=0;k<3;k++)warm[k]=Math.min(.38,warm[k]+colors[j*3+k]*w);
  }
  gl.uniform3fv(u.uFirelight,warm);
  const {i,j,k}=q.pose;
  gl.uniform1f(u.uFold,g.fold[i]+(g.fold[j]-g.fold[i])*k);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  // Low quality keeps the same lit anatomy and transparent flame edges, skipping the
  // additional expanded contour geometry. The game's bloom can still catch the shafts.
  for(let fringe=FX3.low?0:-1;fringe<2;fringe++){
    gl.depthMask(fringe===0);
    gl.blendFuncSeparate(gl.ONE,fringe<0?gl.ONE:gl.ONE_MINUS_SRC_ALPHA,
      fringe<0?gl.ZERO:gl.ONE,fringe<0?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(u.uFringe,fringe);
    for(const group of m.groups){
      const from=i*m.jointCount+group.joint,to=j*m.jointCount+group.joint;
      for(let n=0;n<16;n++)matrix[n]=g.poses[from*16+n]+k*(g.poses[to*16+n]-g.poses[from*16+n]);
      gl.uniformMatrix4fv(u.uPose,false,matrix);
      gl.uniform1f(u.uGust,g.gust[from]+(g.gust[to]-g.gust[from])*k);
      gl.drawElements(gl.TRIANGLES,group.indexCount,gl.UNSIGNED_SHORT,group.firstIndex*2);
    }
  }
  drawPlumes(q,g,m);
  gl.depthMask(true);gl.disable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);
  for(let i=2;i<attributes.length;i++)gl.disableVertexAttribArray(i);
  // FX3 restores the following material and vertex pointers when the next queue item starts.
}
window.PhoenixRenderer={preload,ready:()=>!!resource,failed:()=>failed,
  submit:q=>FX3.q.push({...q,L:1,ord:3.6,dp:1,render:paint})};
})();

// 참광 survival - VOL: real volumes. Fire, smoke, plasma and dust are not pictures on a card here: each one is a box in the
// world (x, floor y, height z) that the fragment shader marches through along the camera ray, sampling a 3D noise field,
// so it has thickness, hides its own far side, is lit from one side and is cut by the floor it stands on.
// Everything is drawn at reduced resolution into its own HDR target and laid into the effect layer by FX3.renderOver.
// Immediate mode like FX3: call VOL.add every frame the volume is alive. Loaded by surv.js after fx3.js.
'use strict';
(()=>{
const FSY=.58, VY=.86503, VZ=.50172, UK=1.15603;
const V={on:false,q:[],rt:null,scale:.6,stats:{n:0}};
window.VOL=V;
const VS=`attribute vec2 p;uniform vec4 box;uniform vec4 camP;uniform vec2 hf;varying vec2 s;
void main(){s=p*box.zw;float wx=box.x+s.x;float wy=box.y-s.y;
 float px=(wx+camP.x)*camP.z;float py=(wy+camP.y)*camP.z;float c=cos(camP.w);float sn=sin(camP.w);
 gl_Position=vec4((px*c-py*sn)/hf.x,-(px*sn+py*c)/hf.y,0.,1.);}`;
// kinds: 0 blast (billowing ball) | 1 column (rising fire / light) | 2 funnel (hollow twister) | 3 orb (plasma shell + core)
//        4 ring (torus rolling outward) | 5 jet (stream along local x) | 6 sheet (flames standing on the local x axis)
//        7 wisp (kit update 9: a capsule of mist or light along local x, ragged and flowing, bright at its rim - limbs of a figure of light)
const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 s;
uniform sampler2D nz;uniform mat3 Ri;uniform vec3 ext;uniform float cz,kind,time,steps,seed;
uniform vec4 pa,pb,pc,pd;uniform vec3 cA,cB,cM,cC,cS,cK;uniform vec3 ld;uniform vec4 lt;uniform vec3 lt2;
float sst(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
float n3(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);vec2 uv=(i.xy+vec2(37.,17.)*i.z)+f.xy;vec2 rg=texture2D(nz,(uv+.5)/256.).rg;return mix(rg.x,rg.y,f.z);}
float fbm(vec3 x){return n3(x)*.5+n3(x*2.03+vec3(7.3,1.7,4.1))*.25+n3(x*4.1+vec3(2.9,8.2,5.4))*.125+n3(x*8.3)*.0625;}
float fb2(vec3 x){return n3(x)*.62+n3(x*2.03+vec3(7.3,1.7,4.1))*.38;}
// billow: ridged inward so the surface is cauliflower lumps, not fuzz
float bil(vec3 x){float a=1.-abs(n3(x)*2.-1.);float b=1.-abs(n3(x*2.1+vec3(3.1,9.2,5.7))*2.-1.);float c=n3(x*4.3+vec3(1.7,4.4,2.2));return a*.56+b*.3+c*.14;}
// returns density (x) and heat (y) at a point of the unit box; lo = cheap version for the light sample
vec2 map(vec3 q,float lo){
 float d=0.,h=0.;vec3 sd=vec3(seed*3.1,seed*1.7,seed*2.3-time*pd.w);
 if(kind<.5){
  // blast. pa: radius, lumpiness, noise freq, outward flow | pb: heat, core falloff, squash at the floor, edge hardness
  float r=length(q*vec3(1.,1.,pb.z));vec3 dir=q/max(r,.001);
  vec3 x=q*pa.z-dir*pa.w+sd;float n=bil(x);
  float rr=pa.x*(1.-pa.y+pa.y*1.7*n);
  float f=1.-r/max(rr,.001);
  float det=lo>.5?.5:fbm(x*2.9+vec3(0.,0.,time*.4));
  d=sst(0.,pb.w,f+(det-.5)*(.3+pb.w*.75));
  h=pb.x*pow(clamp(f,0.,1.),pb.y)*(.2+1.7*det)*(.5+.8*n);
 }else if(kind<1.5){
  // column. pa: radius, taper toward the top, noise freq, rise speed | pb: heat, twist, turbulence, how tall it has grown (0..1)
  float hh=q.z*.5+.5;float a=hh*pb.y-time*pb.y*.4;float ca=cos(a),sa=sin(a);vec2 xy=vec2(q.x*ca-q.y*sa,q.x*sa+q.y*ca);
  float rxy=length(xy);
  vec3 x=vec3(xy*pa.z,hh*pa.z*1.25-time*pa.w)+sd;x.xy+=(n3(x*.55+4.7)-.5)*1.3;float n=lo>.5?fb2(x):fbm(x)*1.2;
  float foot=1.+.9*exp(-hh*8.);float rr=pa.x*foot*(1.-pa.y*hh);
  float f=1.-rxy/max(rr,.001)+(n-.5)*pb.z*(1.+hh*3.2)-sst(pb.w*.5,pb.w,hh)*1.8;
  d=sst(0.,.35,f)*sst(-.02,.03,hh);
  h=pb.x*pow(clamp(f,0.,1.3),1.5)*(1.05-hh*.5);
 }else if(kind<2.5){
  // funnel. pa: radius at the foot, radius at the top, wall thickness, spin | pb: heat, noise freq, sway, streak contrast
  float hh=q.z*.5+.5;vec2 c=vec2(sin(hh*5.+time*2.1),cos(hh*4.3+time*1.7))*pb.z*hh;vec2 xy=q.xy-c;
  float rxy=length(xy);float ang=atan(xy.y,xy.x);
  float R=mix(pa.x,pa.y,pow(hh,1.4));
  float aa=ang+hh*6.-time*pa.w;vec3 x=vec3(cos(aa)*pb.y,sin(aa)*pb.y,hh*pb.y*2.2-time*pa.w*.12+rxy*pb.y*.6)+sd;
  float n=lo>.5?fb2(x):fbm(x)*1.2;float n2=lo>.5?.5:fb2(x*vec3(2.6,2.6,1.3)+3.3);
  float th=pa.z*(.5+1.1*n)*(.7+.6*hh);
  float f=1.-abs(rxy-R*(.88+.3*n2))/max(th,.001)+(n-.5)*pb.w*1.6-sst(.8,1.,hh)*1.5;
  d=sst(0.,.4,f)*sst(-.02,.04,hh);
  h=pb.x*pow(clamp(f,0.,1.3),1.5)*(1.1-hh*.5);
 }else if(kind<3.5){
  // orb. pa: radius, shell thickness, noise freq, swirl speed | pb: heat, core radius, core heat, shell breakup
  float r=length(q);float a=time*pa.w;float ca=cos(a),sa=sin(a);vec3 qq=vec3(q.x*ca-q.y*sa,q.x*sa+q.y*ca,q.z);
  vec3 x=qq*pa.z+vec3(0.,0.,time*pa.w*.3)+sd;float n=lo>.5?fb2(x):fbm(x)*1.2;
  float vein=1.-abs(n*2.-1.);
  float sh=sst(pa.y,0.,abs(r-pa.x*(.86+.28*n)))*mix(1.,sst(.55,.9,vein),pb.w);
  float core=sst(pb.y,pb.y*.15,r);
  d=max(sh*.85,core);h=pb.x*sh*(.4+1.2*vein)+pb.z*core;
 }else if(kind<4.5){
  // ring. pa: ring radius, tube radius, noise freq, roll speed | pb: heat, vertical squash, lumpiness, -
  float rxy=length(q.xy);vec2 t=vec2(rxy-pa.x,q.z*pb.y);float r=length(t);float ang=atan(q.y,q.x);
  vec3 x=vec3(cos(ang)*pa.x*pa.z*2.,sin(ang)*pa.x*pa.z*2.,0.)+vec3(t.x,t.x,t.y)*pa.z*2.-vec3(0.,0.,time*pa.w)+sd;
  float n=bil(x);float det=lo>.5?.5:fbm(x*2.9);
  float rr=pa.y*(1.-pb.z+pb.z*1.7*n);float f=1.-r/max(rr,.001);
  d=sst(0.,.45,f+(det-.5)*.5);h=pb.x*clamp(f,0.,1.)*(.3+1.4*det);
 }else if(kind<5.5){
  // jet. pa: radius at the mouth (x=-1), radius at the far end (x=+1), noise freq, stream speed | pb: heat, turbulence, head (0..1 reached), tail (where it has left)
  float u=q.x*.5+.5;float ryz=length(q.yz);
  vec3 x=vec3(u*pa.z*1.5*ext.x/max(ext.y,1.)-time*pa.w,q.y*pa.z,q.z*pa.z)+sd;x.yz+=(n3(x*.55+4.7)-.5)*1.3;float n=lo>.5?fb2(x):fbm(x)*1.2;
  float rr=mix(pa.x,pa.y,pow(u,.7));
  float f=1.-ryz/max(rr,.001)+(n-.5)*pb.y*(1.+u*3.2)-sst(pb.z-.3,pb.z,u)*1.8-sst(pb.w+.15,pb.w,u)*1.8-sst(.55,1.,u)*1.3;
  d=sst(0.,.35,f);h=pb.x*pow(clamp(f,0.,1.3),1.5)*(1.1-u*.5);
 }else if(kind<6.5){
  // sheet. pa: thickness, flame height (0..1), noise freq, rise speed | pb: heat, turbulence, fade at both ends, -
  float hh=q.z*.5+.5;float u=q.x*.5+.5;
  vec3 x=vec3(q.x*pa.z*ext.x/max(ext.z,1.),q.y*pa.z*.7,hh*pa.z*1.25-time*pa.w)+sd;x.xy+=(n3(x*.55+4.7)-.5)*1.3;float n=lo>.5?fb2(x):fbm(x)*1.2;
  float big=n3(vec3(q.x*ext.x/max(ext.z,1.)*1.6,time*.9,seed));
  float big2=n3(vec3(q.x*ext.x/max(ext.z,1.)*4.3,time*1.7,seed+3.));float top=pa.y*(.4+.5*big*big+.3*big2);
  float f=1.-abs(q.y)/max(pa.x,.001)+(n-.5)*pb.y*(1.+hh*3.4)-pow(hh/max(top,.01),1.3)*1.5-sst(pb.z,0.,u)*1.5-sst(1.-pb.z,1.,u)*1.5;
  d=sst(0.,.35,f)*sst(-.02,.03,hh);
  h=pb.x*pow(clamp(f,0.,1.3),1.5)*(1.1-hh/max(top,.01)*.45);
 }else{
  // wisp. pa: radius at x=-1, radius at x=+1 (in units of the box's y half size), noise freq, flow speed | pb: glow, looseness, rim boost, ragged end at x=-1
  float u=q.x*.5+.5;float rr=mix(pa.x,pa.y,u);float al=max(1.-rr*ext.y/max(ext.x,1.),0.);
  float dx=(q.x-clamp(q.x,-al,al))*ext.x/max(ext.y,1.);
  vec3 x=vec3(q.x*ext.x/max(ext.y,1.),q.y,q.z)*pa.z+vec3(-time*pa.w,0.,0.)+sd;x+=(n3(x*.5+2.3)-.5)*1.4;
  float n=lo>.5?fb2(x):fbm(x)*1.2;
  float r=length(vec3(dx,q.y,q.z));
  float f=1.-r/max(rr,.001)+(n-.5)*pb.y*(1.+pb.w*(1.-u)*2.5);
  float rim=1.-sst(0.,.45,f);
  d=sst(0.,.5,f)*(.25+.75*rim);
  h=(pb.x*(.3+.9*n*n)+pb.z*rim)*sst(-.15,.12,f);
 }
 d*=sst(1.,.9,max(max(abs(q.x),abs(q.y)),q.z));
 return vec2(d,max(h,0.));}
void main(){
 // the ray through this pixel: a point on the plane through the centre facing the camera, marched toward the far side
 vec3 Dv=vec3(0.,${VY},${VZ});
 vec3 P0=vec3(s.x,-${VZ}*s.y/${UK},${VY}*s.y/${UK});
 vec3 qo=(Ri*P0)/ext;vec3 qd=(Ri*Dv)/ext;
 vec3 inv=1./(abs(qd)+1e-5)*sign(qd+1e-6);vec3 ta=(-1.-qo)*inv;vec3 tb=(1.-qo)*inv;vec3 tmn=min(ta,tb);vec3 tmx=max(ta,tb);
 float t0=max(max(tmn.x,tmn.y),tmn.z);float t1=min(min(tmx.x,tmx.y),tmx.z);
 // the floor cuts the volume: world height = cz + P0.z + Dv.z*t >= 0
 t0=max(t0,-(cz+P0.z)/${VZ});
 if(t1<=t0)discard;
 float jit=texture2D(nz,gl_FragCoord.xy/256.+fract(time*7.31)).b;
 float n=steps;float dt=(t1-t0)/n;float t=t1-dt*jit;
 float ref=min(ext.x,min(ext.y,ext.z));float ds=dt/ref;
 vec3 acc=vec3(0.);float T=1.;vec3 lq=(Ri*ld)/ext*ref*pc.z;
 for(int i=0;i<40;i++){
  if(float(i)>=n||T<.02)break;
  vec3 q=qo+qd*t;vec2 m=map(q,0.);
  if(m.x>.004){
   float hz=q.z*.5+.5;float hb=m.y;if(pd.x>0.)hb=m.y*(1.+.45*pd.x*(1.-hz))*(1.-pd.x*sst(pd.y-.22,pd.y+.06,hz));
   float heat=clamp(hb,0.,1.7);float hm=sst(.04,.3,heat);
   float den=m.x*pc.x*ds*mix(lt2.x,lt2.y,hm);float a=1.-exp(-den);
   float sh=1.;if(pc.z>0.&&hm<.98){float dl=map(q+lq,1.).x;sh=exp(-dl*pc.w);}
   vec3 smk=cS*(lt.x+lt.y*sh)+cK*(lt.z+pd.z)*sh*sh+cB*lt.w*sst(0.,.3,heat)*.6;
   vec3 em=mix(cA,cB,sst(.1,.45,heat));em=mix(em,cM,sst(.45,.85,heat));em=mix(em,cC,sst(.85,1.3,heat));
   vec3 c=mix(smk,em*pc.y*(.35+1.1*heat),hm);
   acc+=T*c*a;T*=1.-a*mix(1.,lt2.z,hm);
  }
  t-=dt;}
 gl_FragColor=vec4(acc,1.-T);}`;
const BVS=`attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const BFS=`precision mediump float;varying vec2 v;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,v);}`;
let P=null,U={},PB=null,UB={},qb=null,fsb=null,nzT=null;
function prog(vs,fs){ const mk=(t,src)=>{ const o=gl.createShader(t); gl.shaderSource(o,src); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const p=gl.createProgram(); gl.attachShader(p,mk(gl.VERTEX_SHADER,vs)); gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs)); gl.bindAttribLocation(p,0,'p'); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
function init(){ if(typeof gl==='undefined'||!gl||!window.FX3||!FX3.on) return;
  try{ P=prog(VS,FS); for(const n of ['box','camP','hf','nz','Ri','ext','cz','kind','time','steps','seed','pa','pb','pc','pd','cA','cB','cM','cC','cS','cK','ld','lt','lt2']) U[n]=gl.getUniformLocation(P,n);
    PB=prog(BVS,BFS); UB.t=gl.getUniformLocation(PB,'t');
    qb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,qb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    fsb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,fsb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    // 3D value noise packed in a 2D texture: G(x,y)=R(x+37,y+17), so one fetch gives two neighbouring slices; B is an independent dither
    const N=256, r=new Uint8Array(N*N), d=new Uint8Array(N*N*4); let sd=1234567; const rnd=()=>{ sd=(sd*1664525+1013904223)>>>0; return sd>>>24; };
    for(let i=0;i<N*N;i++) r[i]=rnd();
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const i=(y*N+x)*4; d[i]=r[y*N+x]; d[i+1]=r[((y+17)&255)*N+((x+37)&255)]; d[i+2]=rnd(); d[i+3]=255; }
    nzT=gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,nzT); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,N,N,0,gl.RGBA,gl.UNSIGNED_BYTE,d); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
    V.on=true;
  }catch(e){ console.error('VOL',e); V.on=false; } }
const rgb=h=>FX3.rgb(h);
const KIND={blast:0,column:1,funnel:2,orb:3,ring:4,jet:5,sheet:6,wisp:7};
const ID3=[1,0,0,0,1,0,0,0,1];
// rotation taking local axes to world (true depth): yaw about the vertical, then pitch lifting local +x off the floor
function rot(yaw,pitch){ const c=Math.cos(yaw), s=Math.sin(yaw), cp=Math.cos(pitch||0), sp=Math.sin(pitch||0);
  // columns = world images of local x, y, z
  return [c*cp,s*cp,sp, -s,c,0, -c*sp,-s*sp,cp]; }
// VOL.add(kind, x, y, z, o): z is the height of the box centre. o: ex,ey,ez half sizes (ey in true depth units), yaw, pitch,
//   pa,pb (shape, see the shader), dens, gain, cA,cB,cM,cC (emission ramp cold -> hot), cS smoke colour, cK key light colour,
//   amb,key,rim,glow (how the unlit body is shaded), shadow (self shadow strength), steps, seed, time, ord,
//   band (0..1: fire colour cut by height), btop (local height 0..1 above which it is smoke, .72), lit (extra key light on smoke), flow (grain rising speed)
V.add=(kind,x,y,z,o={})=>{ if(!V.on||V.q.length>40) return null; const q={k:KIND[kind]??0,x,y,z:z||0,o}; V.q.push(q); return q; };
V.pending=()=>V.q.length>0;
// draw the queued volumes into the low resolution target, then lay it into the bound effect target (premultiplied)
V.render=(G,target)=>{ if(!V.on||!V.q.length){ V.q.length=0; return false; }
  const low=FX3.low, sc=low?.34:V.scale, w=Math.max(8,Math.round(W*sc)), h=Math.max(8,Math.round(H*sc));
  if(!V.rt||V.rt.w!==w||V.rt.h!==h){ if(V.rt){ gl.deleteTexture(V.rt.t); gl.deleteFramebuffer(V.rt.f); } V.rt=FX3.mkRT(w,h,true); }
  gl.bindFramebuffer(gl.FRAMEBUFFER,V.rt.f); gl.viewport(0,0,w,h); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(P); gl.bindBuffer(gl.ARRAY_BUFFER,qb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,nzT); gl.uniform1i(U.nz,0);
  gl.uniform4f(U.camP,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot); gl.uniform2f(U.hf,W/2,H/2);
  gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  // far volumes first (smaller floor y = farther from the camera)
  V.q.sort((a,b)=>((a.o.ord??a.y)-(b.o.ord??b.y)));
  V.stats.n=V.q.length;
  for(const q of V.q){ const o=q.o;
    // A custom density field shares this pass's noise texture, quad and blend order.
    if(o.renderVolume){ o.renderVolume(G); gl.useProgram(P); continue; }
    const ex=o.ex||100, ey=o.ey??ex, ez=o.ez??ex, R=o.R||((o.yaw||o.pitch)?rot(o.yaw||0,o.pitch||0):ID3);
    // inverse (transpose) for the shader, column major
    gl.uniformMatrix3fv(U.Ri,false,[R[0],R[3],R[6],R[1],R[4],R[7],R[2],R[5],R[8]]);
    const tilt=!!(o.pitch||o.R), rm=tilt?Math.hypot(ex,ey,ez):Math.hypot(ex,ey), rh=tilt?rm*1.16:(rm*FSY+ez);
    gl.uniform4f(U.box,q.x,q.y-q.z,rm,rh); gl.uniform3f(U.ext,ex,ey,ez); gl.uniform1f(U.cz,q.z); gl.uniform1f(U.kind,q.k);
    gl.uniform1f(U.time,o.time??RT); gl.uniform1f(U.steps,Math.round((o.steps||26)*(low?.55:1))); gl.uniform1f(U.seed,o.seed||0);
    const pa=o.pa||[.8,.35,2.2,0], pb=o.pb||[1,1.5,1,.5]; gl.uniform4f(U.pa,pa[0],pa[1],pa[2],pa[3]); gl.uniform4f(U.pb,pb[0],pb[1],pb[2],pb[3]);
    gl.uniform4f(U.pc,(o.dens??9)*(o.a??1),o.gain??1.6,low?0:(o.sdist??.22),o.shadow??4.5);
    // kit update 9: band = fire cut by height (white-yellow low, red high, smoke above btop), lit = extra key light on the smoke's lit side, flow = inner grain rising
    gl.uniform4f(U.pd,o.band||0,o.btop??.72,o.lit||0,o.flow||0);
    const cA=rgb(o.cA||'#300600'), cB=rgb(o.cB||'#ff3c06'), cM=rgb(o.cM||'#ffc030'), cC=rgb(o.cC||'#fff8dc'), cS=rgb(o.cS||'#1a1614'), cK=rgb(o.cK||'#8a7a70');
    gl.uniform3f(U.cA,cA[0],cA[1],cA[2]); gl.uniform3f(U.cB,cB[0],cB[1],cB[2]); gl.uniform3f(U.cM,cM[0],cM[1],cM[2]); gl.uniform3f(U.cC,cC[0],cC[1],cC[2]); gl.uniform3f(U.cS,cS[0],cS[1],cS[2]); gl.uniform3f(U.cK,cK[0],cK[1],cK[2]);
    const L=o.ld||[-.52,-.3,.8]; gl.uniform3f(U.ld,L[0],L[1],L[2]); gl.uniform4f(U.lt,o.amb??.16,o.key??1.3,o.rim??.3,o.glow??.5); gl.uniform3f(U.lt2,o.smoke??1,o.fire??.55,o.block??.6);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4); }
  V.q.length=0;
  // composite
  gl.bindFramebuffer(gl.FRAMEBUFFER,target.f); gl.viewport(0,0,target.w,target.h);
  gl.useProgram(PB); gl.bindBuffer(gl.ARRAY_BUFFER,fsb); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0); gl.bindTexture(gl.TEXTURE_2D,V.rt.t); gl.uniform1i(UB.t,0);
  gl.drawArrays(gl.TRIANGLES,0,3); gl.disable(gl.BLEND); return true; };
init();
})();

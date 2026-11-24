// 참광 survival - FX3: the lit ground and the mesh effect renderer.
//  * the floor is no longer a canvas pattern: it is a painted, normal-mapped surface lit every frame by the effect lights
//    (GFX.lights / GFX.amb), so a skill visibly lights the stone it happens on
//  * effects are real geometry in the world (rings, cones, domes, pillars, tilted arcs, ribbons, walls) carrying
//    scrolling noise materials (mask x panning noise -> erosion -> colour ramp), drawn in HDR
//  * two layers: 'g' is drawn into the ground target (under every character), 'o' over the scene, 'd' into the refraction buffer
// Loaded by surv.js before gfx.js; everything hangs off window.FX3. Without WebGL every call is a no-op.
'use strict';
(()=>{
const FSY=.58;
const F={on:false,hdr:false,ground:false,q:[],tex:{},tile:1300,gtint:[1,1,1],gk:.95,stats:{draws:0}};
window.FX3=F;

// ---------------------------------------------------------------- shaders
const VS=`attribute vec3 p;attribute vec2 uv;
uniform mat4 M;uniform vec3 org;uniform vec4 camP;uniform vec2 hf;uniform vec4 la;uniform vec4 lb;
varying vec2 v;varying vec2 vd;
void main(){vec3 q=p;vd=vec2(0.,1.);
 if(lb.w>.5){float a=mix(lb.x,lb.y,p.x);float t=p.y;float r=mix(la.x,la.y,t);float h=mix(la.z,la.w,t);
  if(lb.z>.5){float e=t*1.5707963;r=la.x*cos(e)+la.y*(1.-cos(e));h=la.z+(la.w-la.z)*sin(e);}
  q=vec3(cos(a)*r,sin(a)*r,h);vd=vec2(cos(a),sin(a)*${FSY});}
 vec3 w=(M*vec4(q,1.)).xyz;
 float wx=org.x+w.x;float wy=org.y+w.y*${FSY}-(org.z+w.z);
 float px=(wx+camP.x)*camP.z;float py=(wy+camP.y)*camP.z;float c=cos(camP.w);float s=sin(camP.w);
 gl_Position=vec4((px*c-py*s)/hf.x,-(px*s+py*c)/hf.y,0.,1.);v=uv;}`;
const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;varying vec2 vd;
uniform sampler2D tex,nzA,nzB;
uniform float kind,time;
uniform vec4 uvT,n1,n2,ch1,ch1b,pr,fd,pw,pm,rv;
uniform vec3 cA,cB,cC;uniform vec3 rk;uniform vec4 msk;uniform vec2 gn;uniform vec4 aw,aw2;
void main(){
 vec2 d=(texture2D(nzA,v*n2.xy+time*n2.zw).rg-.5)*pr.x;
 vec2 q1=v*n1.xy+time*n1.zw+d;
 float nz=dot(texture2D(nzA,q1),ch1)+dot(texture2D(nzB,q1),ch1b);
 vec2 mu=v*uvT.xy+uvT.zw+d*rk.z;
 vec4 tx=texture2D(tex,mu);
 float m=dot(tx,msk);
 // built-in profiles across the strip: 1 lead edge at v=1, 2 centre band, 3 radial dot, 4 lead edge at v=0
 if(pm.x>.5&&pm.x<1.5)m*=pow(clamp(v.y,0.,1.),pm.y)*smoothstep(1.,1.-pm.z,v.y);
 else if(pm.x<2.5&&pm.x>1.5)m*=pow(max(1.-abs(v.y*2.-1.),0.),pm.y);
 else if(pm.x<3.5&&pm.x>2.5)m*=pow(max(1.-length(v*2.-1.),0.),pm.y);
 else if(pm.x>3.5&&pm.x<4.5)m*=pow(clamp(1.-v.y,0.,1.),pm.y)*smoothstep(0.,pm.z,v.y);
 else if(pm.x>4.5){
  // 5 crescent: thick in the middle of the arc, pointed at both ends, razor outer edge (v=1), feathered inner side
  float th=pow(max(sin(3.14159*clamp(v.x,0.,1.)),0.),pm.y);float inner=1.-th;
  m*=smoothstep(inner,inner+th*pm.z+.001,v.y)*pow(clamp((v.y-inner)/max(th,.001),0.,1.),pm.w);}
 float val=m*(1.-pr.y+pr.y*nz*2.);
 if(fd.x>0.)val*=smoothstep(0.,fd.x,v.x);
 if(fd.y>0.)val*=smoothstep(1.,1.-fd.y,v.x);
 if(fd.z>0.)val*=smoothstep(0.,fd.z,v.y);
 if(fd.w>0.)val*=smoothstep(1.,1.-fd.w,v.y);
 if(aw2.w>.5){vec2 q=v-aw.xy;float ang=atan(q.y,q.x);float tt=fract((ang-aw.z)*aw.w/6.2831853+1.);val*=(1.-smoothstep(aw2.x-aw2.z,aw2.x,tt))*smoothstep(aw2.y-aw2.z,aw2.y,tt+.0001);}
 if(rv.x>0.){float r=length(v*2.-1.);val*=1.-smoothstep(rv.x-rv.y,rv.x,r);val*=smoothstep(rv.z-rv.w,rv.z,r+.0001);}
 val=pow(max(val,0.),pw.x);
 float a=smoothstep(pr.z,pr.z+pr.w,val);
 float heat=clamp((val-pr.z)/max(1.-pr.z,.001),0.,1.);
 if(kind<.5){
  vec3 col=mix(cA,cB*gn.x,smoothstep(0.,rk.x,heat));col=mix(col,cC*pw.y,smoothstep(rk.x,rk.y,heat));
  gl_FragColor=vec4(col*a*pw.w,a*pw.z*pw.w);
 }else if(kind<1.5){
  // refraction: push along the mesh's outward direction (lathe) by the field's value
  gl_FragColor=vec4(.5+vd.x*.5*pw.y,.5-vd.y*.5*pw.y,0.,a*pw.w);
 }else{
  // painted colour texture: tint, dissolve by the noise field, hot dissolve edge
  float keep=smoothstep(pr.z,pr.z+pr.w,nz+.001);float e=smoothstep(pr.z-.08,pr.z,nz)-keep;
  float al=tx.a*keep*pw.w;
  gl_FragColor=vec4((tx.rgb*cB*pw.y*keep+cC*e*tx.a*pw.y)*pw.w,al*pw.z);
 }}`;
const GVS=`attribute vec3 p;varying vec2 v;void main(){v=p.xy*.5+.5;gl_Position=vec4(p.xy,0.,1.);}`;
const GFS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D alb,nrm,nzA;
uniform vec2 res;uniform vec4 camU;uniform vec4 gOff;uniform vec3 amb,tint;uniform vec4 lp[8];uniform vec3 lc[8];uniform float time,gk;uniform vec3 hp;
vec2 toWorld(vec2 uv){vec2 s=vec2(uv.x*res.x,(1.-uv.y)*res.y)-res*.5;float c=cos(camU.w),sn=sin(camU.w);s=vec2(c*s.x+sn*s.y,-sn*s.x+c*s.y);return camU.xy+s/camU.z;}
void main(){
 vec2 w=toWorld(v);
 // true floor coordinates (the camera squashes depth by ${FSY})
 vec2 g=vec2(w.x-gOff.x,(w.y-gOff.y)/${FSY});
 vec2 uv=vec2(g.x,-g.y)/gOff.z;
 vec3 a=texture2D(alb,uv).rgb;vec3 nt=texture2D(nrm,uv).rgb*2.-1.;
 float big=texture2D(nzA,g/5200.).r;float big2=texture2D(nzA,g/1900.+.37).r;
 a*=.72+.5*big;a=mix(a,a*vec3(.86,.94,1.08),big2*.5);
 vec3 N=normalize(vec3(nt.xy*1.25,max(nt.z,.05)));
 vec3 Vd=vec3(0.,.8146,.58);
 // resting light: the chapter's ambient plus a low key from the upper left so the relief always reads
 vec3 Lk=normalize(vec3(-.55,-.62,.56));
 float rel=max(dot(N,Lk),0.);vec3 lit=amb*(.25+.82*rel*rel);
 vec3 spc=vec3(0.);
 // the hero carries a soft pool of light, so the eye has a centre even when nothing is happening
 {vec2 dh=(w-hp.xy)*vec2(1.,1./.58);float ah=clamp(1.-dot(dh,dh)/(hp.z*hp.z),0.,1.);lit+=amb*vec3(.34,.31,.3)*ah*ah*(.35+.65*N.z);}
 vec3 P=vec3(w.x,w.y/${FSY},0.);
 for(int i=0;i<8;i++){vec4 L=lp[i];if(L.w<=0.)continue;vec3 dl=vec3(L.x,L.y/${FSY},L.z)-P;float d2=dot(dl,dl);float dist=sqrt(d2);vec3 l=dl/dist;
  float at=clamp(1.-d2/(L.w*L.w),0.,1.);at*=at;float nd=max(dot(N,l),0.);
  lit+=lc[i]*at*(nd*1.25+.12);
  vec3 Hh=normalize(l+Vd);spc+=lc[i]*at*pow(max(dot(N,Hh),0.),22.)*.55;}
 float rough=.35+.65*dot(a,vec3(.33));
 vec3 col=a*tint*lit*gk+spc*rough*(.4+a);
 gl_FragColor=vec4(col,1.);}`;

// ---------------------------------------------------------------- state
let Pm=null, Pg=null, Um={}, Ug={}, lathe=null, quadF=null, quadU=null, dyn=null, dynData=null, dynN=0, fsb=null, white=null, nzA=null, nzB=null, HF=null;
const LN=96, LT=10, DYN_MAX=24000;
const IDENT=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);

function prog(vs,fs,attrs){ const mk=(t,src)=>{ const o=gl.createShader(t); gl.shaderSource(o,src); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const P=gl.createProgram(); gl.attachShader(P,mk(gl.VERTEX_SHADER,vs)); gl.attachShader(P,mk(gl.FRAGMENT_SHADER,fs)); attrs.forEach((n,i)=>gl.bindAttribLocation(P,i,n)); gl.linkProgram(P);
  if(!gl.getProgramParameter(P,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(P)); return P; }
function uni(P,names){ const U={}; for(const n of names) U[n]=gl.getUniformLocation(P,n); return U; }

function init(){ if(typeof gl==='undefined'||!gl||!GLX) return;
  try{
    Pm=prog(VS,FS,['p','uv']); Um=uni(Pm,['M','org','camP','hf','la','lb','tex','nzA','nzB','kind','time','uvT','n1','n2','ch1','ch1b','pr','fd','pw','pm','rv','cA','cB','cC','rk','msk','gn','aw','aw2']);
    Pg=prog(GVS,GFS,['p']); Ug=uni(Pg,['alb','nrm','nzA','res','camU','gOff','amb','tint','lp','lc','time','gk','hp']);
    // lathe grid: p = (u around 0..1, t along the profile 0..1, 0), uv = (u, t)
    { const vtx=new Float32Array((LN+1)*(LT+1)*5), idx=new Uint16Array(LN*LT*6); let o=0;
      for(let j=0;j<=LT;j++) for(let i=0;i<=LN;i++){ vtx[o++]=i/LN; vtx[o++]=j/LT; vtx[o++]=0; vtx[o++]=i/LN; vtx[o++]=j/LT; }
      o=0; for(let j=0;j<LT;j++) for(let i=0;i<LN;i++){ const a=j*(LN+1)+i, b=a+1, c=a+LN+1, d=c+1; idx[o++]=a; idx[o++]=b; idx[o++]=c; idx[o++]=c; idx[o++]=b; idx[o++]=d; }
      lathe={vb:gl.createBuffer(),ib:gl.createBuffer(),n:idx.length}; gl.bindBuffer(gl.ARRAY_BUFFER,lathe.vb); gl.bufferData(gl.ARRAY_BUFFER,vtx,gl.STATIC_DRAW); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,lathe.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW); }
    const mkQuad=arr=>{ const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW); return b; };
    // floor quad (local x, y on the floor) and upright quad (local x, height z), uv 0..1 with v=1 at the top / far side
    quadF=mkQuad([-1,-1,0,0,1, 1,-1,0,1,1, -1,1,0,0,0, 1,1,0,1,0]);
    quadU=mkQuad([-1,0,-1,0,0, 1,0,-1,1,0, -1,0,1,0,1, 1,0,1,1,1]);
    dynData=new Float32Array(DYN_MAX*5); dyn=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,dyn); gl.bufferData(gl.ARRAY_BUFFER,dynData.byteLength,gl.DYNAMIC_DRAW);
    fsb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,fsb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),gl.STATIC_DRAW);
    white=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,white); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
    // HDR targets when the device can render to and filter half floats
    const hf=gl.getExtension('OES_texture_half_float'), hfl=gl.getExtension('OES_texture_half_float_linear'), cb=gl.getExtension('EXT_color_buffer_half_float')||gl.getExtension('WEBGL_color_buffer_float');
    if(hf&&hfl&&cb&&!/[?&]ldr=1/.test(location.search)){ HF=hf.HALF_FLOAT_OES; const t=F.mkRT(4,4,true); F.hdr=t.hdr; gl.deleteTexture(t.t); gl.deleteFramebuffer(t.f); }
    nzA=loadTex('v3_nzA','png',{repeat:true,raw:true}); nzB=loadTex('v3_nzB','png',{repeat:true,raw:true});
    F.gAlb=loadTex('v3_gnd','webp',{repeat:true,raw:true,mip:true}); F.gNrm=loadTex('v3_gnd_n','webp',{repeat:true,raw:true,mip:true});
    F.on=true;
  }catch(e){ console.error('FX3',e); F.on=false; } }

// a render target; half float when asked for and available
F.mkRT=(w,h,hdr)=>{ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t); const type=hdr&&HF?HF:gl.UNSIGNED_BYTE; gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,type,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const f=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  let ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE; gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  if(!ok&&type!==gl.UNSIGNED_BYTE){ gl.deleteTexture(t); gl.deleteFramebuffer(f); return F.mkRT(w,h,false); }
  return {t,f,w,h,hdr:type!==gl.UNSIGNED_BYTE}; };

// ---------------------------------------------------------------- textures
// assets/<name>.<ext>; raw = data texture (no premultiply), repeat needs a power-of-two image
function loadTex(name,ext,o={}){ const s={im:new Image(),ok:false,t:null,o,name}; s.im.onload=()=>{ s.ok=true; }; s.im.onerror=()=>{ s.bad=true; }; s.im.src='assets/'+name+'.'+ext+'?v='+(typeof ASSET_V!=='undefined'?ASSET_V:'')+'3'; return s; }
function glTex(s){ if(!s) return white; if(s.t) return s.t; if(!s.ok) return null;
  const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t); if(s.o.raw){ gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE); }
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,s.im);
  if(s.o.raw){ gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.BROWSER_DEFAULT_WEBGL); }
  const pot=v=>(v&(v-1))===0, rep=s.o.repeat&&pot(s.im.naturalWidth)&&pot(s.im.naturalHeight);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  if(s.o.mip&&rep){ gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); } else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,rep?gl.REPEAT:gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,rep?gl.REPEAT:gl.CLAMP_TO_EDGE);
  s.t=t; return t; }
// named effect texture (cached). o: {ext, repeat, raw}
F.img=(name,o={})=>F.tex[name]||(F.tex[name]=loadTex(name,o.ext||'webp',o));
F.ready=name=>{ const s=F.tex[name]; return !!(s&&s.ok); };

// ---------------------------------------------------------------- materials
const rgbC={}; function rgb(h){ if(typeof h!=='string') return h; return rgbC[h]||(rgbC[h]=[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255]); }
F.rgb=rgb;
// channel names of the two noise atlases
const CH={fbm:[1,0,0,0, 0,0,0,0],billow:[0,1,0,0, 0,0,0,0],streak:[0,0,1,0, 0,0,0,0],veins:[0,0,0,1, 0,0,0,0],crack:[0,0,0,0, 1,0,0,0],cells:[0,0,0,0, 0,1,0,0],grain:[0,0,0,0, 0,0,1,0],wisp:[0,0,0,0, 0,0,0,1]};
const DEF={kind:0,tex:null,msk:[0,1,0,0],uvT:[1,1,0,0],n1:[1,1,0,0],n2:[1,1,0,0],nz:'fbm',dist:0,mdist:1,nk:1,ero:.1,soft:.2,fd:[0,0,0,0],pw:1,gain:1,bgain:1,op:0,a:1,pm:[0,1,.06,0],rv:[0,.1,0,.1],
  cA:[0,0,0],cB:[1,1,1],cC:[1,1,1],rk:[.35,.8],layer:'o',ord:0};
// F.mat({...}): a material is a plain parameter set; colours may be '#rrggbb'
F.mat=o=>{ const m={...DEF,...o}; m.cA=rgb(m.cA); m.cB=rgb(m.cB); m.cC=rgb(m.cC); if(typeof m.tex==='string') m.tex=F.img(m.tex,m.texO||{}); if(typeof m.nz==='string') m.nz=CH[m.nz]||CH.fbm; return m; };

// ---------------------------------------------------------------- transforms
// scale, then tilt about x (lean away from the camera), about y (roll), then turn about the vertical axis
F.xf=(o={})=>{ const sx=o.sx??o.s??1, sy=o.sy??o.s??1, sz=o.sz??o.s??1, rx=o.rx||0, ry=o.ry||0, rz=o.rz||0;
  const cx=Math.cos(rx), s1=Math.sin(rx), cy=Math.cos(ry), s2=Math.sin(ry), cz=Math.cos(rz), s3=Math.sin(rz);
  // R = Rz * Ry * Rx
  const r00=cz*cy, r01=cz*s2*s1-s3*cx, r02=cz*s2*cx+s3*s1, r10=s3*cy, r11=s3*s2*s1+cz*cx, r12=s3*s2*cx-cz*s1, r20=-s2, r21=cy*s1, r22=cy*cx;
  return new Float32Array([r00*sx,r10*sx,r20*sx,0, r01*sy,r11*sy,r21*sy,0, r02*sz,r12*sz,r22*sz,0, o.tx||0,o.ty||0,o.tz||0,1]); };

// the same in view order: turn about the vertical axis first (rz), then roll about the screen's depth axis (ry), then lean about
// the screen's horizontal axis (rx). lean<0 raises the far side toward the camera (a floor shape reads fuller); +0.53 is edge-on.
F.xfw=(o={})=>{ const sx=o.sx??o.s??1, sy=o.sy??o.s??1, sz=o.sz??o.s??1, a=o.rx||0, b=o.ry||0, c=o.rz||0, cx=Math.cos(a), s1=Math.sin(a), cy=Math.cos(b), s2=Math.sin(b), cz=Math.cos(c), s3=Math.sin(c);
  const r00=cy*cz, r01=-cy*s3, r02=s2, r10=cx*s3+s1*s2*cz, r11=cx*cz-s1*s2*s3, r12=-s1*cy, r20=s1*s3-cx*s2*cz, r21=s1*cz+cx*s2*s3, r22=cx*cy;
  return new Float32Array([r00*sx,r10*sx,r20*sx,0, r01*sy,r11*sy,r21*sy,0, r02*sz,r12*sz,r22*sz,0, o.tx||0,o.ty||0,o.tz||0,1]); };

// ---------------------------------------------------------------- submission (immediate: call every frame the thing is alive)
function sub(geo,mat,x,y,z,o){ if(!F.on) return null; const q={geo,mat,org:[x,y,z||0],M:o.M||IDENT,la:o.la||null,lb:o.lb||null,first:o.first||0,count:o.count||0,ov:o,L:(o.layer||mat.layer)==='g'?0:(o.layer||mat.layer)==='d'?2:1,ord:o.ord??mat.ord}; F.q.push(q); return q; }
// a surface of revolution about the vertical axis at (x, floor y, height z):
//   r0,r1 radius at the two ends of the profile, h0,h1 heights; a0,a1 the arc in radians (default the full turn); dome:true bends it into a cap
//   flat ring: h0=h1=0 | pillar: r0=r1 | cone / funnel: r0!=r1 with height | tilted slash arc: a flat ring with o.M=F.xf({rx,ry,rz})
F.lathe=(mat,x,y,z,o={})=>sub('lathe',mat,x,y,z,{...o,la:[o.r0??0,o.r1??100,o.h0||0,o.h1||0],lb:[o.a0||0,o.a1??6.2831853,o.dome?1:0,1]});
F.ring=(mat,x,y,r0,r1,o={})=>F.lathe(mat,x,y,o.z||0,{...o,r0,r1});
// a quad lying on the floor (half sizes rx, ry in floor units, turned by rot) / an upright quad facing the camera (half sizes hw, hh, centre height z)
F.quad=(mat,x,y,rx,ry,rot=0,o={})=>sub('quadF',mat,x,y,o.z||0,{...o,M:o.M||F.xf({sx:rx,sy:ry??rx,rz:rot})});
F.bill=(mat,x,y,z,hw,hh,rot=0,o={})=>sub('quadU',mat,x,y,z,{...o,M:o.M||F.xf({sx:hw,sz:hh,ry:rot})});
// a ribbon through world points [{x,y,z,w}] that always faces the camera (w = half width; u runs 0..1 along it, or by distance / o.ulen)
const NOLB=[0,0,0,0];
F.ribbon=(mat,pts,o={})=>{ if(!F.on||pts.length<2||dynN+pts.length*2>DYN_MAX) return null; const first=dynN, n=pts.length, x0=pts[0].x, y0=pts[0].y; let len=0; const L=[0];
  for(let i=1;i<n;i++){ len+=Math.hypot(pts[i].x-pts[i-1].x,(pts[i].y-(pts[i].z||0))-(pts[i-1].y-(pts[i-1].z||0))); L.push(len); }
  for(let i=0;i<n;i++){ const a=pts[Math.max(0,i-1)], b=pts[Math.min(n-1,i+1)], p=pts[i], dx=b.x-a.x, dy=(b.y-(b.z||0))-(a.y-(a.z||0)), l=Math.hypot(dx,dy)||1, w=p.w??o.w??20, nx=-dy/l*w, ny=dx/l*w, sx=p.x-x0, sy=p.y-(p.z||0)-y0, u=o.ulen?L[i]/o.ulen:L[i]/(len||1);
    let k=dynN*5; dynData[k]=sx+nx; dynData[k+1]=(sy+ny)/FSY; dynData[k+2]=0; dynData[k+3]=u; dynData[k+4]=1; dynN++; k=dynN*5; dynData[k]=sx-nx; dynData[k+1]=(sy-ny)/FSY; dynData[k+2]=0; dynData[k+3]=u; dynData[k+4]=0; dynN++; }
  return sub('dyn',mat,x0,y0,0,{...o,lb:NOLB,first,count:n*2}); };
// a wall standing on a floor path [{x,y,h}] (h = height there, default o.h), from height z0; u along the base, v 0 at the floor .. 1 at the top
F.wall=(mat,pts,o={})=>{ if(!F.on||pts.length<2||dynN+pts.length*2>DYN_MAX) return null; const first=dynN, n=pts.length, x0=pts[0].x, y0=pts[0].y, z0=o.z0||0; let len=0; const L=[0];
  for(let i=1;i<n;i++){ len+=Math.hypot(pts[i].x-pts[i-1].x,(pts[i].y-pts[i-1].y)/FSY); L.push(len); }
  for(let i=0;i<n;i++){ const p=pts[i], u=o.ulen?L[i]/o.ulen:L[i]/(len||1), sx=p.x-x0, sy=(p.y-y0)/FSY, h=p.h??o.h??300;
    let k=dynN*5; dynData[k]=sx; dynData[k+1]=sy; dynData[k+2]=z0+h; dynData[k+3]=u; dynData[k+4]=1; dynN++; k=dynN*5; dynData[k]=sx; dynData[k+1]=sy; dynData[k+2]=z0; dynData[k+3]=u; dynData[k+4]=0; dynN++; }
  return sub('dyn',mat,x0,y0,0,{...o,lb:NOLB,first,count:n*2}); };

// ---------------------------------------------------------------- frame
let cur=null;
function bindGeo(geo){ if(cur===geo) return; cur=geo; const b=geo==='lathe'?lathe.vb:geo==='quadF'?quadF:geo==='quadU'?quadU:dyn; gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0); gl.vertexAttribPointer(1,2,gl.FLOAT,false,20,12); if(geo==='lathe') gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,lathe.ib); }
const v4=(u,a)=>gl.uniform4f(u,a[0],a[1],a[2],a[3]);
function drawOne(q){ const m=q.mat, o=q.ov; let t=m.tex?glTex(m.tex):white; if(!t) return;
  bindGeo(q.geo); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,t);
  gl.uniformMatrix4fv(Um.M,false,q.M); gl.uniform3f(Um.org,q.org[0],q.org[1],q.org[2]); v4(Um.la,q.la||NOLB); v4(Um.lb,q.lb||NOLB);
  gl.uniform1f(Um.kind,q.L===2?1:m.kind); gl.uniform1f(Um.time,(o.time??RT)+(o.t0||0));
  const uvT=o.uvT||m.uvT, n1=o.n1||m.n1, n2=o.n2||m.n2, fd=o.fd||m.fd, pm=o.pm||m.pm, rv=o.rv||m.rv, rk=o.rk||m.rk, nz=m.nz;
  v4(Um.uvT,uvT); v4(Um.n1,n1); v4(Um.n2,n2); gl.uniform4f(Um.ch1,nz[0],nz[1],nz[2],nz[3]); gl.uniform4f(Um.ch1b,nz[4],nz[5],nz[6],nz[7]);
  gl.uniform4f(Um.pr,o.dist??m.dist,o.nk??m.nk,o.ero??m.ero,o.soft??m.soft); v4(Um.fd,fd); gl.uniform4f(Um.pw,o.pw??m.pw,o.gain??m.gain,o.op??m.op,(o.a??1)*m.a); v4(Um.pm,pm); v4(Um.rv,rv);
  const cA=o.cA?rgb(o.cA):m.cA, cB=o.cB?rgb(o.cB):m.cB, cC=o.cC?rgb(o.cC):m.cC;
  gl.uniform3f(Um.cA,cA[0],cA[1],cA[2]); gl.uniform3f(Um.cB,cB[0],cB[1],cB[2]); gl.uniform3f(Um.cC,cC[0],cC[1],cC[2]); gl.uniform3f(Um.rk,rk[0],rk[1],o.mdist??m.mdist); v4(Um.msk,m.msk); gl.uniform2f(Um.gn,o.bgain??m.bgain,0); if(o.aw){ v4(Um.aw,o.aw); v4(Um.aw2,o.aw2); } else gl.uniform4f(Um.aw2,0,0,0,0);
  if(q.geo==='lathe') gl.drawElements(gl.TRIANGLES,lathe.n,gl.UNSIGNED_SHORT,0); else if(q.geo==='dyn') gl.drawArrays(gl.TRIANGLE_STRIP,q.first,q.count); else gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  F.stats.draws++; }
function beginMesh(){ gl.useProgram(Pm); gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); cur=null;
  gl.uniform4f(Um.camP,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot); gl.uniform2f(Um.hf,W/2,H/2);
  gl.uniform1i(Um.tex,0); gl.uniform1i(Um.nzA,1); gl.uniform1i(Um.nzB,2); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,glTex(nzA)||white); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,glTex(nzB)||white);
  gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA); }
function endMesh(){ gl.disable(gl.BLEND); gl.disableVertexAttribArray(1); gl.bindBuffer(gl.ARRAY_BUFFER,GLX_fs()); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0); gl.activeTexture(gl.TEXTURE0); }
// the engine's own fullscreen triangle (2 floats a vertex) must be bound again when we hand the context back
let _fs2=null; function GLX_fs(){ if(!_fs2){ _fs2=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,_fs2); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW); } return _fs2; }

const LP=new Float32Array(32), LC=new Float32Array(24);
// is the lit floor ready to stand in for the canvas floor this frame?
F.groundReady=()=>F.on&&!F.noGround&&!!(glTex(F.gAlb)&&glTex(F.gNrm)&&glTex(nzA));
// 1) the floor and everything lying on it -> G.gGround. Called first in glFrame (survival only).
F.renderGround=G=>{ if(!F.on) return false; F.stats.draws=0;
  if(dynN){ gl.bindBuffer(gl.ARRAY_BUFFER,dyn); gl.bufferSubData(gl.ARRAY_BUFFER,0,dynData.subarray(0,dynN*5)); }
  F.q.sort((a,b)=>a.L-b.L||a.ord-b.ord);
  if(!F.groundReady()){ F.ground=false; return false; }
  if(!G.gGround||G.gGround.w!==W||G.gGround.h!==H){ if(G.gGround){ gl.deleteTexture(G.gGround.t); gl.deleteFramebuffer(G.gGround.f); } G.gGround=F.mkRT(W,H,true); }
  gl.bindFramebuffer(gl.FRAMEBUFFER,G.gGround.f); gl.viewport(0,0,W,H);
  gl.useProgram(Pg); gl.bindBuffer(gl.ARRAY_BUFFER,fsb); gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,glTex(F.gAlb)); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,glTex(F.gNrm)); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,glTex(nzA));
  gl.uniform1i(Ug.alb,0); gl.uniform1i(Ug.nrm,1); gl.uniform1i(Ug.nzA,2); gl.uniform2f(Ug.res,W,H); gl.uniform4f(Ug.camU,cam.x-cam.sx,cam.y-cam.sy,S*cam.z,cam.rot);
  const V=RPG.surv; gl.uniform4f(Ug.gOff,V.ox||0,V.oy||0,F.tile,0); gl.uniform1f(Ug.time,RT); gl.uniform1f(Ug.gk,F.gk); gl.uniform3f(Ug.hp,pl.x,pl.gy??pl.y,1150);
  const A=window.GFX?GFX.amb:[1,1,1]; gl.uniform3f(Ug.amb,A[0],A[1],A[2]); gl.uniform3f(Ug.tint,F.gtint[0],F.gtint[1],F.gtint[2]);
  LP.fill(0); LC.fill(0); if(window.GFX){ const Ls=GFX.lights.map(l=>{ const k=l.t<l.hold?1:Math.max(0,1-(l.t-l.hold)/l.life); return [l,l.a*k*k*(l.flick?1-l.flick*Math.random():1)]; }).filter(e=>e[1]>.01).sort((a,b)=>b[1]*b[0].r-a[1]*a[0].r).slice(0,8);
    Ls.forEach(([l,a],i)=>{ LP.set([l.x,l.y,(l.z||0)+90,l.r*1.5],i*4); LC.set([l.c[0]*a*1.7,l.c[1]*a*1.7,l.c[2]*a*1.7],i*3); }); }
  gl.uniform4fv(Ug.lp,LP); gl.uniform3fv(Ug.lc,LC);
  gl.drawArrays(gl.TRIANGLES,0,3);
  let n=0; for(const q of F.q) if(q.L===0) n++;
  if(n){ beginMesh(); for(const q of F.q) if(q.L===0) drawOne(q); endMesh(); } else { gl.bindBuffer(gl.ARRAY_BUFFER,GLX_fs()); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0); gl.activeTexture(gl.TEXTURE0); }
  F.ground=true; return true; };
// 2) everything above the scene -> G.gVfx (and refraction -> G.gDist). Called after GFX.render; gfxDrew says whether it left quads in the target.
F.renderOver=(G,gfxDrew)=>{ if(!F.on) return false; let n=0, nd=0, ng=0; for(const q of F.q){ if(q.L===1) n++; else if(q.L===2) nd++; else ng++; }
  if(!n&&!nd){ if(ng&&!F.ground){ /* ground layer without a ground target: drop it */ } F.q.length=0; dynN=0; return false; }
  if(!G.gVfx) return (F.q.length=0,dynN=0,false);
  beginMesh();
  if(n){ gl.bindFramebuffer(gl.FRAMEBUFFER,G.gVfx.f); gl.viewport(0,0,G.gVfx.w,G.gVfx.h); for(const q of F.q) if(q.L===1) drawOne(q); }
  if(nd){ gl.bindFramebuffer(gl.FRAMEBUFFER,G.gDist.f); gl.viewport(0,0,G.gDist.w,G.gDist.h); gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE); for(const q of F.q) if(q.L===2) drawOne(q); }
  endMesh(); F.q.length=0; dynN=0; if(window.GFX) GFX.wasClear=false; return true; };
F.pending=()=>F.q.length>0;
init();
})();

// 참광 survival - GPU effect layer. A second renderer that draws the ultimates' effects as shaded geometry in the
// world (floor quads, upright billboards, extruded walls, ribbons) into its own target, which the final pass lays over
// the 2D scene with bloom, scene lighting and a refraction buffer. Shapes are cel-shaded fields (rim / body / core tones)
// animated on stepped time, so they read as drawn frames rather than soft sprites.
// Loaded by surv.js before cine.js; everything hangs off window.GFX. Without WebGL every call is a no-op.
'use strict';
(()=>{
const FSY=.58, MAXQ=3072;
const X={on:false,q:[],fx:[],pts:[],lights:[],amb:[1,1,1],ambT:[1,1,1],ambK:6,gain:1.3,dk:1,tex:{},FSY,QK:1};
window.GFX=X;
const NOPF=()=>{};
// stepped clock: effects animate "on twos" (12 drawings a second) unless they ask for smooth time
X.tq=(fps=12,seed=0)=>Math.floor(RT*fps)*.618+seed;

const VSRC=`attribute vec2 p;attribute vec2 uv;attribute vec4 col;attribute vec4 par;varying vec2 v;varying vec4 vc;varying vec4 vp;
void main(){v=uv;vc=col;vp=par;gl_Position=vec4(p,0.,1.);}`;
const FSRC=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;varying vec4 vc;varying vec4 vp;uniform sampler2D tex,nz;uniform float mode;uniform vec3 c2;uniform vec3 c3;
float N(vec2 q){return texture2D(nz,q).r;}
float M(vec2 q){return texture2D(nz,q).g;}
float C(vec2 q){return texture2D(nz,q).b;}
// three flat tones from one field: m<=0 nothing, a thin rim, the body colour, a hot core above k
vec4 cel(float m,float k,float rim){float a=smoothstep(0.,.035,m);vec3 c=mix(c2,vc.rgb,smoothstep(rim,rim+.03,m));c=mix(c,c3,smoothstep(k,k+.04,m));return vec4(c*a,a)*vc.a;}
void main(){vec4 o=vec4(0.);
 if(mode<.5){ // 0 textured sprite: uv warp by noise, dissolve, hot dissolve edge
  vec2 w=(vec2(N(v*vp.z+vp.y),M(v*vp.z-vp.y))-.5)*vp.w;vec2 q=v+w;vec4 t=texture2D(tex,q);
  if(c2.g>0.){for(int i=1;i<=9;i++){float f=float(i)/9.;t=max(t,texture2D(tex,q+vec2(c2.g*f,0.))*(1.-f)*(1.-f)*.9);}}
  t.rgb=mix(t.rgb,vec3(t.a),c2.r);float n=N(v*1.3+vp.y*.31);
  float k=smoothstep(vp.x*1.2-.2,vp.x*1.2-.05,n);float e=smoothstep(vp.x*1.2-.2,vp.x*1.2-.12,n)-k;
  o=vec4(t.rgb*vc.rgb,t.a)*k*vc.a+vec4(c3*e*t.a*vc.a,0.);
 }else if(mode<1.5){ // 1 crescent slash: par x=head, w=tail (0..1 along the arc), z=span in radians, y=phase
  float r=length(v);float th=atan(v.y,v.x);if(th<0.)th+=6.2831853;float u=th/vp.z;
  float s=(u-vp.w)/max(vp.x-vp.w,.001);float sc=clamp(s,0.,1.);
  float t=.34*pow(sin(3.14159*pow(sc,1.7)),.75)+.0001;float R=.97;float q=(r-(R-t))/t;
  float n=N(vec2(u*vp.z*.55-vp.y,r*5.5));float n2=M(vec2(u*vp.z*.2+vp.y*.5,r*2.2));
  float m=min(q,(1.-q)*3.5);m-=(1.-sc)*(1.-sc)*n*2.2+(1.-q)*n2*.55*(1.-sc*.6);
  m*=step(0.,s)*step(s,1.)*step(u,1.)*step(r,R);
  float a=smoothstep(0.,.05,m);vec3 c=mix(c2,vc.rgb,smoothstep(.12,.16,m));c=mix(c,c3,smoothstep(.5,.56,q*sc+m*.25));
  o=vec4(c*a,a)*vc.a;
 }else if(mode<2.5){ // 2 shock ring on the floor: x=radius, z=thickness, w=jag, y=phase
  float r=length(v);float th=atan(v.y,v.x)/6.2831853;float n=N(vec2(th*3.+vp.y,.37))*.6+M(vec2(th*9.-vp.y,.71))*.4;
  float rr=r+(n-.5)*vp.w;float d=rr-vp.x;float m=d>0.?1.-d/(vp.z*.35):1.+d/vp.z;m=min(m,1.)-M(vec2(th*5.+vp.y,r*1.5))*.35*step(d,0.);
  m*=step(r,1.);o=cel(m,.62,.14);
 }else if(mode<3.5){ // 3 streak / beam: u 0..1 along, v.y -1..1 across; x=erode, z=noise stretch, w=edge jag, y=phase
  float u=v.x;float tp=vp.z<0.?1.:pow(max(sin(3.14159*clamp(u,0.,1.)),0.),vp.w>=.5?1.3:.4);float n=N(vec2(u*abs(vp.z)-vp.y,v.y*.21+.5));
  float m=tp*(1.-vp.w*n)-abs(v.y);m-=vp.x*(.4+n);o=cel(m,.42,.1);
 }else if(mode<4.5){ // 4 impact star: x=size, z=spike count, w=core, y=phase
  float r=length(v);float th=atan(v.y,v.x)/6.2831853;float sp=N(vec2(th*vp.z+vp.y,.5));sp=sp*sp;float sp2=M(vec2(th*vp.z*2.3-vp.y,.2));
  float rad=(.2+.8*sp+.25*sp2*sp2)*vp.x;float m=1.-r/max(rad,.001);m=max(m,(1.-r/(vp.w*vp.x+.001))*.9);
  o=cel(m,.5,.1);
 }else if(mode<5.5){ // 5 cel puff (smoke, flame, dust): x=erode, z=noise scale, w=rise stretch, y=phase
  float r=length(v);float n=N(v*vec2(.3,.3*vp.w)*vp.z+vec2(vp.y*.73,vp.y))*.65+M(v*.7*vp.z-vec2(vp.y,vp.y*.4))*.35;
  float m=(1.-r*r)*1.15+(n-.5)*1.3-vp.x*1.6-.25;m*=step(r,1.);o=cel(m,.58,.12);
 }else if(mode<6.5){ // 6 wall of light: u along the base, v.y 0 at the floor .. 1 at the top; x=erode, z=streak count, y=phase
  float u=v.x;float h=v.y;float cu=u*vp.z;float sel=N(vec2(cu*.9,.13));float st=pow(sel,3.)*step(vp.x,M(vec2(cu*.9+.5,.9))+.02);
  float top=.3+.7*M(vec2(cu*.9,.5));float col=st*smoothstep(top,top*.15,h);float soft=exp(-h*3.4)*(.4+.6*N(vec2(cu*.28,vp.y*.2-h*.35)))*(1.-vp.x)*(1.-vp.x);
  float ends=smoothstep(0.,.04,u)*smoothstep(1.,.96,u);float base=exp(-h*24.)*(1.-vp.x);
  o=vec4((vc.rgb*soft*.75+mix(vc.rgb,c3,smoothstep(.25,.6,col))*col*1.3+c3*base)*ends*vc.a,0.);
 }else if(mode<7.5){ // 7 tear in space: u along, v.y across; x=opening 0..1, z=jag frequency, w=glow, y=phase
  float u=v.x;float w=pow(max(sin(3.14159*clamp(u,0.,1.)),0.),.45)*vp.x*(.45+1.1*N(vec2(u*vp.z+vp.y*.01,.3)));
  float wob=(N(vec2(u*vp.z*.55,.71))-.5)*.5+(M(vec2(u*vp.z*2.6,.23))-.5)*.16;float d=abs(v.y-wob*.8);
  float inside=smoothstep(w,w-.03,d)*step(.002,w);
  float st=step(.86,C(vec2(u*vp.z*.9+vp.y*.02,v.y*.9+.5)))*N(vec2(u*3.+vp.y,v.y));
  vec3 vo=c2*(.2+.8*M(vec2(u*1.7-vp.y*.05,v.y*.4+vp.y*.03)))+vec3(st)*.8;
  float e=exp(-max(d-w,0.)/(.05+.1*vp.w))*step(.002,w);float core=smoothstep(.07,.0,abs(d-w));
  o=vec4(vo*inside+vc.rgb*e*.9*(1.-inside)+c3*core,inside)*vc.a;
 }else if(mode<8.5){ // 8 soft glow
  float r=length(v);float m=max(1.-r,0.);o=vec4(vc.rgb*m*m*vc.a,0.);
 }else if(mode<9.5){ // 9 refraction ring -> distortion buffer: x=radius, z=width, w=strength
  float r=length(v);float x=(r-vp.x)/vp.z;float f=exp(-x*x)*step(r,1.);vec2 n=v/(r+1e-4);o=vec4(.5+n.x*.5*vp.w,.5-n.y*.29*vp.w,0.,f*vc.a);
 }else if(mode<10.5){ // 10 slip along a line -> distortion buffer: par.zw = screen direction, x = strength
  float f=exp(-abs(v.y)*2.2)*smoothstep(0.,.1,v.x)*smoothstep(1.,.9,v.x);vec2 d=vp.zw*sign(v.y)*vp.x;o=vec4(.5+d.x*.5,.5+d.y*.5,0.,f*vc.a);
 }else if(mode<11.5){ // 11 rock chip: faceted, lit from the upper left
  vec2 q=v;float a=N(vec2(vp.y,.3))*6.28;q=mat2(cos(a),-sin(a),sin(a),cos(a))*q;float d=max(abs(q.x)*1.15+q.y*.5,max(abs(q.y)*1.05-q.x*.3,-q.y*.9+abs(q.x)*.4));
  float m=1.-d;float lit=step(.0,q.x*-.6+q.y*.8+N(vec2(vp.y*3.,.6))-.5);vec3 c=mix(vc.rgb*.45,vc.rgb,lit);float al=smoothstep(0.,.08,m);o=vec4(mix(c2,c,smoothstep(.1,.16,m))*al,al)*vc.a;
 }else if(mode<12.5){ // 12 flat shadow on the floor
  float r=length(v);float m=smoothstep(1.,.55,r);o=vec4(0.,0.,0.,m*vc.a);
 }else if(mode<13.5){ // 13 ground fracture glow: radial jagged cracks: x=reach, z=count, w=width, y=seed
  float r=length(v);float th=atan(v.y,v.x)/6.2831853;float wob=(N(vec2(r*1.4+vp.y,th*2.))-.5)*.11;float k=fract((th+wob)*vp.z+.5)-.5;
  float sel=step(.35,M(vec2(floor((th+wob)*vp.z+.5)*.173+vp.y,.4)));float w=vp.w*(1.-r/vp.x)*(.5+N(vec2(r*3.,vp.y)));
  float m=(1.-abs(k)/max(w,.0001))*sel*step(r,vp.x);m=max(m,1.-r/(vp.x*.16));o=cel(m,.5,.05);
 }else if(mode<15.5&&mode>14.5){ // 15 hand-drawn key art in three grey tones -> rim / body / core colours: x=erode, y=phase, z=warp scale, w=warp amount
  vec2 w2=(vec2(N(v*vp.z+vp.y),M(v*vp.z-vp.y*1.3))-.5)*vp.w;float L=texture2D(tex,v+w2).g;float n=N(v*1.6+vp.y*.17);
  float keep=smoothstep(vp.x*1.25-.25,vp.x*1.25-.18,n);float a=smoothstep(.1,.16,L)*keep;
  vec3 c=mix(c2,vc.rgb,smoothstep(.36,.44,L));c=mix(c,c3,smoothstep(.72,.82,L));o=vec4(c*a,a)*vc.a;
 }else{ // 14 screen-space speed streaks toward a point: x=inner radius, z=count, w=density, y=phase
  float r=length(v);float th=atan(v.y,v.x)/6.2831853;float n=N(vec2(th*vp.z+vp.y,.5));float n2=M(vec2(th*vp.z*3.1+vp.y*1.7,.1));
  float len=vp.x+(1.-vp.x)*n2;float m=(n-(1.-vp.w))/vp.w;m*=smoothstep(len,len+.25,r);o=cel(m,.6,.02);
 }
 gl_FragColor=o;}`;

let P=null, vb=null, ib=null, fsb=null, U={}, data=null, nzT=null, white=null;
const B={n:0,mode:-1,tex:null,blend:-1,rt:null,c2:null,c3:null};

function init(){ if(typeof gl==='undefined'||!gl||!GLX) return;
  try{ const mk=(t,src)=>{ const o=gl.createShader(t); gl.shaderSource(o,src); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    P=gl.createProgram(); gl.attachShader(P,mk(gl.VERTEX_SHADER,VSRC)); gl.attachShader(P,mk(gl.FRAGMENT_SHADER,FSRC));
    ['p','uv','col','par'].forEach((n,i)=>gl.bindAttribLocation(P,i,n)); gl.linkProgram(P); if(!gl.getProgramParameter(P,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(P));
    for(const n of ['tex','nz','mode','c2','c3']) U[n]=gl.getUniformLocation(P,n);
    data=new Float32Array(MAXQ*4*12); vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);
    const idx=new Uint16Array(MAXQ*6); for(let i=0;i<MAXQ;i++) idx.set([i*4,i*4+1,i*4+2,i*4+2,i*4+1,i*4+3],i*6);
    ib=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);
    fsb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,fsb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    nzT=noiseTex(); white=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,white); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
    X.on=true; }catch(e){ console.error('GFX',e); X.on=false; } }

// tileable noise: R = soft fbm, G = a second, finer fbm, B = cells (for stars and chips), A unused
function noiseTex(){ const n=256, d=new Uint8Array(n*n*4), rnd=(()=>{ let s=1234567; return ()=>((s=(s*16807)%2147483647)/2147483647); })();
  const layer=(cells)=>{ const g=new Float32Array(cells*cells); for(let i=0;i<g.length;i++) g[i]=rnd(); return (x,y)=>{ const fx=x*cells/n, fy=y*cells/n, x0=Math.floor(fx), y0=Math.floor(fy), tx=fx-x0, ty=fy-y0, sx=tx*tx*(3-2*tx), sy=ty*ty*(3-2*ty), a=(i,j)=>g[((j%cells+cells)%cells)*cells+((i%cells+cells)%cells)];
      return (a(x0,y0)*(1-sx)+a(x0+1,y0)*sx)*(1-sy)+(a(x0,y0+1)*(1-sx)+a(x0+1,y0+1)*sx)*sy; }; };
  const A1=[layer(4),layer(8),layer(16),layer(32)], A2=[layer(8),layer(16),layer(32),layer(64)], A3=layer(64);
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){ const i=(y*n+x)*4; let a=0, b=0, w=.5, t=0; for(let k=0;k<4;k++){ a+=A1[k](x,y)*w; b+=A2[k](x,y)*w; t+=w; w*=.5; }
    const st=(v,lo,hi)=>Math.max(0,Math.min(1,(v/t-lo)/(hi-lo))); d[i]=st(a,.22,.78)*255; d[i+1]=st(b,.24,.76)*255; d[i+2]=A3(x,y)*255; d[i+3]=255; }
  const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,n,n,0,gl.RGBA,gl.UNSIGNED_BYTE,d); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT); return t; }

// an image element or canvas as a texture (cached by the object); canvases marked live are uploaded again every frame they are used
const TEXS=new Map();
function texOf(src,live){ let e=TEXS.get(src); if(!e){ if(src instanceof HTMLImageElement&&!(src.complete&&src.naturalWidth)) return null; e={t:gl.createTexture(),f:-1}; TEXS.set(src,e); gl.bindTexture(gl.TEXTURE_2D,e.t); texParams(); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src); e.f=FRAME; }
  else if(live&&e.f!==FRAME){ gl.bindTexture(gl.TEXTURE_2D,e.t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src); e.f=FRAME; }
  return e.t; }
// named asset textures (assets/<name>.webp)
X.img=name=>{ let s=X.tex[name]; if(!s){ s=X.tex[name]={im:new Image(),ok:false}; s.im.onload=()=>{ s.ok=true; }; s.im.src='assets/'+name+'.webp?v='+ASSET_V; } return s; };
let FRAME=0;

// ---------------------------------------------------------------- projection: world (x, floor y, height z) -> clip space
let cxk=0, cyk=0, czk=1, crc=1, crs=0;
function camSet(){ czk=S*cam.z; cxk=-cam.x+cam.sx; cyk=-cam.y+cam.sy; crc=Math.cos(cam.rot); crs=Math.sin(cam.rot); }
function prj(x,y,z,o){ const px=(x+cxk)*czk, py=(y-(z||0)+cyk)*czk; o[0]=(px*crc-py*crs)/(W/2); o[1]=-(px*crs+py*crc)/(H/2); }
X.w2s=(x,y,z=0)=>{ camSet(); const o=[0,0]; prj(x,y,z,o); return [(o[0]*.5+.5)*W,(.5-o[1]*.5)*H]; };
const rgbC={}; function rgb(h){ return rgbC[h]||(rgbC[h]=[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255]); }
X.rgb=rgb;

// ---------------------------------------------------------------- submission
// every draw is one quad: 4 corners (clip), uv corners, colour, 4 parameters, and its state (mode, texture, blend, target, c2, c3)
// state: {m:mode, t:texture source, b:'add'|'alpha', rt:'vfx'|'dist', c2, c3}
const tmp=[[0,0],[0,0],[0,0],[0,0]];
function push(st,P4,uv,c,a,p0,p1,p2,p3){ if(!X.on) return; X.q.push({st,P:[P4[0][0],P4[0][1],P4[1][0],P4[1][1],P4[2][0],P4[2][1],P4[3][0],P4[3][1]],uv,c,a,p:[p0,p1,p2,p3],L:st.L||0}); }
const UV01=[0,1,1,1,0,0,1,0], UVC=[-1,1,1,1,-1,-1,1,-1];
// a quad lying on the floor: centre, radius (rx, ry default rx), rotation in the floor plane; uv -1..1
X.floor=(st,x,y,rx,ry,rot,c,a,p0=0,p1=0,p2=0,p3=0,z=0)=>{ if(!X.on) return; camSet(); const co=Math.cos(rot||0), si=Math.sin(rot||0); ry=ry??rx;
  const K=[[-1,-1],[1,-1],[-1,1],[1,1]]; for(let i=0;i<4;i++){ const lx=K[i][0]*rx, ly=K[i][1]*ry; prj(x+lx*co-ly*si,y+(lx*si+ly*co)*FSY,z,tmp[i]); }
  push(st,tmp,st.uv01?[0,1,1,1,0,0,1,0]:[-1,-1,1,-1,-1,1,1,1],c,a,p0,p1,p2,p3); };
// an upright billboard facing the camera: centre (x, floor y, height z), half sizes, screen rotation
X.bill=(st,x,y,z,hw,hh,rot,c,a,p0=0,p1=0,p2=0,p3=0)=>{ if(!X.on) return; camSet(); const co=Math.cos(rot||0), si=Math.sin(rot||0);
  const K=[[-1,-1],[1,-1],[-1,1],[1,1]]; for(let i=0;i<4;i++){ const lx=K[i][0]*hw, ly=K[i][1]*hh; prj(x+lx*co-ly*si,y+lx*si+ly*co,z,tmp[i]); }
  push(st,tmp,st.uv01?[0,1,1,1,0,0,1,0]:[-1,-1,1,-1,-1,1,1,1],c,a,p0,p1,p2,p3); };
// a streak between two world points (each with a height), half-width w in world units; uv: x 0..1 along, y -1..1 across
X.line=(st,x1,y1,z1,x2,y2,z2,w,c,a,p0=0,p1=0,p2=0,p3=0,u0=0,u1=1)=>{ if(!X.on) return; camSet(); const ax=x1, ay=y1-z1, bx=x2, by=y2-z2, dx=bx-ax, dy=by-ay, l=Math.hypot(dx,dy)||1, nx=-dy/l*w, ny=dx/l*w;
  prj(ax+nx,ay+ny,0,tmp[0]); prj(bx+nx,by+ny,0,tmp[1]); prj(ax-nx,ay-ny,0,tmp[2]); prj(bx-nx,by-ny,0,tmp[3]);
  push(st,tmp,st.uv01?[u0,1,u1,1,u0,0,u1,0]:[0,-1,1,-1,0,1,1,1],c,a,p0,p1,p2,p3); };
// a wall standing on a floor line, extruded to height h; uv: x 0..1 along the base, y 0 floor .. 1 top
X.wall=(st,x1,y1,x2,y2,h,c,a,p0=0,p1=0,p2=0,p3=0,z0=0)=>{ if(!X.on) return; camSet();
  prj(x1,y1,z0+h,tmp[0]); prj(x2,y2,z0+h,tmp[1]); prj(x1,y1,z0,tmp[2]); prj(x2,y2,z0,tmp[3]);
  push(st,tmp,[0,1,1,1,0,0,1,0],c,a,p0,p1,p2,p3); };
// a quad over the whole screen (uv -1..1 about a screen point given in world coordinates, or the centre)
X.screen=(st,wx,wy,c,a,p0=0,p1=0,p2=0,p3=0)=>{ if(!X.on) return; let cx=0, cy=0; if(wx!=null){ camSet(); prj(wx,wy,0,tmp[0]); cx=tmp[0][0]; cy=tmp[0][1]; } const asp=W/H, R=2.4;
  tmp[0][0]=cx-R; tmp[0][1]=cy+R*asp; tmp[1][0]=cx+R; tmp[1][1]=cy+R*asp; tmp[2][0]=cx-R; tmp[2][1]=cy-R*asp; tmp[3][0]=cx+R; tmp[3][1]=cy-R*asp;
  push(st,tmp,[-1,-1,1,-1,-1,1,1,1],c,a,p0,p1,p2,p3); };
// a painted character frame standing at (x, base) facing f, as a texture: afterimages, smears, silhouettes
X.pose=(st,cls,fr,x,base,f,c,a,o={})=>{ if(!X.on) return; const s=spr(cls+'_'+fr); if(!s) return; const h=(s.wh||330)*(o.sc||1), w=h*s.w/s.h*(o.sx||1), ax=s.ax??.5, z=o.z||0; camSet();
  const xl=x-w*(ax+Math.abs(o.smear||0))*f+(o.dx||0), xr=x+w*(1-ax)*f+(o.dx||0), sk=o.skew||0;
  prj(xl+sk,base-h,z,tmp[0]); prj(xr+sk,base-h,z,tmp[1]); prj(xl,base,z,tmp[2]); prj(xr,base,z,tmp[3]);
  const u0=o.smear?-Math.abs(o.smear):0; push({...st,t:s.im,m:0,c2:st.c2||[0,0,0]},tmp,[u0,1,1,1,u0,0,1,0],c,a,o.er||0,o.ph||0,o.ns||1,o.warp||0); };
X.st=(m,b='add',o={})=>({m,b,rt:'vfx',c2:[0,0,0],c3:[1,1,1],...o});

// ---------------------------------------------------------------- timed effects and particles
// X.add(life, fn(k, t), delay): fn is called every rendered frame of its life with k = 0..1 and t = seconds
X.add=(life,fn,delay=0)=>{ const e={t0:RT+delay,life,fn,dead:false}; X.fx.push(e); return e; };
// particles: {x,y,z,vx,vy,vz,g,drag,life,s,c,m,rot,vr,grow,a,bounce,shadow,st}
const PT_ST={}; function ptSt(m,b,c2,c3,L){ const k=m+b+(c2||'')+(c3||'')+(L||''); return PT_ST[k]||(PT_ST[k]=X.st(m,b,{c2:c2?rgb(c2):[0,0,0],c3:c3?rgb(c3):[1,1,1],L:L??1})); }
X.pt=o=>{ if(!X.on||X.pts.length>900) return; X.pts.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,g:0,drag:0,life:1,s:10,c:[1,1,1],m:8,rot:0,vr:0,grow:0,a:1,t:0,b:'add',ph:Math.random()*9,sx:1,...o}); };
function stepPts(dt){ for(let i=X.pts.length-1;i>=0;i--){ const p=X.pts[i]; p.t+=dt; if(p.t>=p.life){ X.pts.splice(i,1); continue; }
    const d=Math.exp(-p.drag*dt); p.vx*=d; p.vy*=d; p.vz=(p.vz-p.g*dt)*(p.g?1:d); p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt; p.rot+=p.vr*dt; p.s+=p.grow*dt;
    if(p.tx!=null){ const k=1-Math.exp(-dt*(p.pull||5)); p.x+=(p.tx-p.x)*k; p.y+=(p.ty-p.y)*k; p.z+=((p.tz||0)-p.z)*k; }
    if(p.z<0){ if(p.bounce){ p.z=0; p.vz=-p.vz*p.bounce; p.vx*=.55; p.vy*=.55; p.vr*=.5; if(Math.abs(p.vz)<120){ p.vz=0; p.g=0; p.vx=p.vy=p.vr=0; p.bounce=0; } } else if(p.g){ p.t=p.life; } } } }
function drawPts(){ for(const p of X.pts){ const k=p.t/p.life, a=p.a*(p.fade==='in'?Math.min(1,k*5)*Math.min(1,(1-k)*2.5):Math.min(1,(1-k)*(p.fk||3)));
    if(p.shadow&&p.z>4) X.floor(ptSt(12,'alpha'),p.x,p.y,p.s*(1+p.z*.0012),null,0,[0,0,0],.5*a/(1+p.z*.004));
    const st=ptSt(p.m,p.b,p.c2,p.c3,p.L);
    if(p.m===3){ const sp=Math.hypot(p.vx,p.vy-p.vz)||1, l=p.len||.04; X.line(st,p.x,p.y,p.z,p.x-p.vx*l,p.y-p.vy*l,p.z-p.vz*l,p.s,p.c,a,0,p.ph,1,0); }
    else X.bill(st,p.x,p.y,p.z,p.s*p.sx,p.s,p.rot,p.c,a,p.er?k*p.er:0,p.ph,p.ns||1,p.w||0); } }

// ---------------------------------------------------------------- scene lighting and the refraction buffer
// X.light(x,y,r,c,a,life): a coloured light on the floor and everything standing on it (up to 4 strongest are used)
X.light=(x,y,r,c,a=1,life=.5,o={})=>{ const L={x,y,z:o.z||0,r,c:rgb(c),a,t:0,life,hold:o.hold||0,flick:o.flick||0}; X.lights.push(L); return L; };
// ambient: the scene's own light level and tint during a sequence; eases toward the target
X.ambient=(r,g,b,k=6)=>{ X.ambT=[r,g,b]; X.ambK=k; };
// one-shot refraction ring growing over the floor
X.ripple=(x,y,R,o={})=>{ if(!X.on||(X.calm&&X.calm())) return; const life=o.life||.6, st=X.st(9,'mix',{rt:'dist'}), s=o.s??.6; X.add(life,k=>{ const e=1-(1-k)*(1-k); X.floor(st,x,y,R,null,0,[0,0,0],(1-k)*(1-k),e*.92,0,o.w||.09,s,o.z||0); },o.delay||0); };

X.reset=()=>{ X.fx.length=0; X.pts.length=0; X.lights.length=0; X.amb=[1,1,1]; X.ambT=[1,1,1]; };
X.step=rdt=>{ if(!X.on) return; const dt=hitstop>0?0:rdt; stepPts(dt); const k=1-Math.exp(-rdt*X.ambK); for(let i=0;i<3;i++) X.amb[i]+=(X.ambT[i]-X.amb[i])*k;
  for(let i=X.lights.length-1;i>=0;i--){ const L=X.lights[i]; L.t+=dt; if(L.t>=L.life+L.hold) X.lights.splice(i,1); } };

// ---------------------------------------------------------------- frame: build, sort by layer, batch, draw
const LPA=new Float32Array(16), LCA=new Float32Array(12);
function flush(){ if(!B.n) return; gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,B.n*48)); gl.drawElements(gl.TRIANGLES,B.n*6,gl.UNSIGNED_SHORT,0); B.n=0; }
function setState(st,G){ const t=st.t?texOf(st.t,st.live):white; if(st.t&&!t) return false;
  if(B.mode===st.m&&B.tex===t&&B.blend===st.b&&B.rt===st.rt&&B.c2===st.c2&&B.c3===st.c3) return true; flush();
  if(B.rt!==st.rt){ const rt=st.rt==='dist'?G.gDist:G.gVfx; gl.bindFramebuffer(gl.FRAMEBUFFER,rt.f); gl.viewport(0,0,rt.w,rt.h); B.rt=st.rt; }
  if(B.blend!==st.b){ if(st.b==='add') gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ZERO,gl.ONE); else if(st.b==='mix') gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE); else gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA); B.blend=st.b; }
  if(B.tex!==t){ gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,t); B.tex=t; }
  if(B.mode!==st.m){ gl.uniform1f(U.mode,st.m); B.mode=st.m; }
  if(B.c2!==st.c2){ gl.uniform3fv(U.c2,st.c2); B.c2=st.c2; } if(B.c3!==st.c3){ gl.uniform3fv(U.c3,st.c3); B.c3=st.c3; }
  return true; }
X.resize=G=>{ for(const k of ['gVfx','gDist']) if(G[k]){ gl.deleteTexture(G[k].t); gl.deleteFramebuffer(G[k].f); } G.gVfx=mkRT(W,H); G.gDist=mkRT(Math.max(1,W>>2),Math.max(1,H>>2)); };
X.active=()=>X.on&&(X.fx.length||X.pts.length||X.q.length||X.lights.length||Math.abs(X.amb[0]-1)+Math.abs(X.amb[1]-1)+Math.abs(X.amb[2]-1)>.01);
// called from glFrame before the bloom chain; returns true when the layer has something in it this frame
X.render=G=>{ if(!X.on) return false; FRAME++; if(!G.gVfx||G.gVfx.w!==W||G.gVfx.h!==H) X.resize(G);
  for(let i=X.fx.length-1;i>=0;i--){ const e=X.fx[i], t=RT-e.t0; if(e.dead||t>=e.life){ X.fx.splice(i,1); continue; } if(t>=0) e.fn(t/e.life,t); }
  drawPts();
  const act=X.q.length>0;
  if(!act&&X.wasClear) return false;
  gl.bindFramebuffer(gl.FRAMEBUFFER,G.gDist.f); gl.viewport(0,0,G.gDist.w,G.gDist.h); gl.clearColor(.5,.5,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER,G.gVfx.f); gl.viewport(0,0,W,H); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  X.wasClear=!act; if(!act) return false;
  X.q.sort((a,b)=>a.L-b.L);   // stable: layer first, then submission order
  gl.useProgram(P); gl.enable(gl.BLEND); gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  for(let i=0;i<4;i++) gl.enableVertexAttribArray(i);
  gl.vertexAttribPointer(0,2,gl.FLOAT,false,48,0); gl.vertexAttribPointer(1,2,gl.FLOAT,false,48,8); gl.vertexAttribPointer(2,4,gl.FLOAT,false,48,16); gl.vertexAttribPointer(3,4,gl.FLOAT,false,48,32);
  gl.uniform1i(U.tex,0); gl.uniform1i(U.nz,1); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,nzT);
  B.n=0; B.mode=-1; B.tex=null; B.blend=-1; B.rt='vfx'; B.c2=null; B.c3=null;
  for(const q of X.q){ if(!setState(q.st,G)) continue; if(B.n>=MAXQ) flush(); let o=B.n*48; const c=q.c, a=q.a, p=q.p;
    for(let i=0;i<4;i++){ data[o++]=q.P[i*2]; data[o++]=q.P[i*2+1]; data[o++]=q.uv[i*2]; data[o++]=q.uv[i*2+1]; data[o++]=c[0]; data[o++]=c[1]; data[o++]=c[2]; data[o++]=a; data[o++]=p[0]; data[o++]=p[1]; data[o++]=p[2]; data[o++]=p[3]; }
    B.n++; }
  flush(); X.q.length=0;
  gl.disable(gl.BLEND); for(let i=1;i<4;i++) gl.disableVertexAttribArray(i);
  gl.bindBuffer(gl.ARRAY_BUFFER,fsb); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0); gl.activeTexture(gl.TEXTURE0);
  return true; };
// uniforms for the final pass: ambient and the four strongest lights, in screen uv
X.finUniforms=(Pf,Uf)=>{ LPA.fill(0); LCA.fill(0); const L=X.lights.map(l=>{ const k=l.t<l.hold?1:Math.max(0,1-(l.t-l.hold)/l.life); return [l,l.a*k*k*(l.flick?1-l.flick*Math.random():1)]; }).filter(e=>e[1]>.01).sort((a,b)=>b[1]*b[0].r-a[1]*a[0].r).slice(0,4);
  L.forEach(([l,a],i)=>{ const [sx,sy]=X.w2s(l.x,l.y,l.z); LPA.set([sx/W,1-sy/H,l.r*S*cam.z/H,a],i*4); LCA.set(l.c,i*3); });
  gl.uniform4fv(Uf(Pf,'glp'),LPA); gl.uniform3fv(Uf(Pf,'glc'),LCA); gl.uniform3fv(Uf(Pf,'amb'),X.amb); gl.uniform1f(Uf(Pf,'vfxK'),X.gain); gl.uniform1f(Uf(Pf,'dstK'),X.dk); };
init();
})();

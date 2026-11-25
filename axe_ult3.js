// BERSERKER ultimate 3 (ax_ult3) 천부난무. Plan: _gen/v3/axe_plan.md "궁극기 3".
// (2026-11-25 concept change by the user: one colossal axe, one full turn, one boom.) He sets his feet and drags his axe back while fire is
// drawn into it and it swells into a colossus several times his height; the field holds its breath; he swings it once round the whole screen,
// accelerating, leaving a wall of fire and a burnt trench on the full circle and throwing every body outward; the turn ends with a jolt, the axe
// is wrenched up over him and slammed down up the field: a white core, a ring of fire to the screen edges, slabs heaved up, everything launched.
// Then the trench burns down and cools and the giant axe bursts into burning shards.
// The giant axe is a real lit mesh (forged head with a bevelled cutting edge, socket, back spike, banded haft) drawn by a small batched
// renderer of its own (like assassin_blades.js): a depth buffer for self-occlusion and a projected shadow on the floor.
'use strict';
(()=>{
const X=RPG.sv, FSY=X.FSY, {A,BODY,dmg,inCircle,view,onScreen,sfx}=X;
const K=window.K3, F=window.FX3, PI=Math.PI, TAU=PI*2;
const sat=v=>Math.max(0,Math.min(1,v)), mix=(a,b,k)=>a+(b-a)*k, eo3=k=>1-(1-k)*(1-k)*(1-k);
const h01=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); };
// palette: copied from sk_axe.js PAL (black-body fire), plus the white of the hottest instant
const PAL={
  fire:{d:'#1a0602',b:'#8a1a06',m:'#ff5a14',h:'#fff4d8',l:'#ff6a1c',s:'#ffc24a'},
  ember:{d:'#220200',b:'#d81204',m:'#ff6a14',h:'#ffd070',l:'#ff3410',s:'#ff9a50'},
  gold:{d:'#2a1606',b:'#b8741e',m:'#ffd27a',h:'#fff6dc',l:'#ffae34',s:'#ffe6a0'},
  smoke:{c:'#1a1614',c2:'#5e5048'}
};
const PF={d:'#2a0600',b:'#ff4a0c',m:'#ffa424',h:'#fff3c4',l:'#ff6a1c',s:'#ffc478'};
const PW={d:'#6a3200',b:'#ffc848',m:'#fff2b8',h:'#ffffff',l:'#ffd890',s:'#fff0c0'};
const IRON='#3a3230';

// ================================================================ the axe mesh
// model frame: X = out of the haft towards the cutting edge, Y = through the blade (its faces look along +-Y), Z = up the haft towards the butt.
// The head sits on the origin; the whole axe is about 1.15 long. Vertex: position 3, normal 3, material(+8*slot) 1, distance to the edge 1.
const WOOD=0, IRONM=1, FACE=2, EDGE=3;
const VX=[];
function tri(a,b,c,ctr,mat,s){ const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2]; let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const l=Math.hypot(nx,ny,nz); if(l<1e-9) return; nx/=l; ny/=l; nz/=l;
  const mx=(a[0]+b[0]+c[0])/3-ctr[0], my=(a[1]+b[1]+c[1])/3-ctr[1], mz=(a[2]+b[2]+c[2])/3-ctr[2]; if(nx*mx+ny*my+nz*mz<0){ nx=-nx; ny=-ny; nz=-nz; }
  const ss=Array.isArray(s)?s:[s,s,s]; [a,b,c].forEach((p,i)=>VX.push(p[0],p[1],p[2],nx,ny,nz,mat,ss[i])); }
function quad(a,b,c,d,ctr,mat,s){ const ss=Array.isArray(s)?s:[s,s,s,s]; tri(a,b,c,ctr,mat,[ss[0],ss[1],ss[2]]); tri(a,c,d,ctr,mat,[ss[0],ss[2],ss[3]]); }
// a lathe along Z: profile [[z, radius]], sides, x/y squash
function lathe(prof,sides,mat,sx=1,sy=1){ const rings=prof.map(([z,r])=>Array.from({length:sides},(_,i)=>{ const a=i/sides*TAU+PI/sides; return [Math.cos(a)*r*sx,Math.sin(a)*r*sy,z]; }));
  for(let k=1;k<rings.length;k++){ const c=[0,0,(prof[k-1][0]+prof[k][0])/2]; for(let i=0;i<sides;i++){ const j=(i+1)%sides; quad(rings[k-1][i],rings[k-1][j],rings[k][j],rings[k][i],c,mat,0); } }
  const cap=(ring,z)=>{ for(let i=0;i<sides;i++) tri(ring[i],ring[(i+1)%sides],[0,0,z],[0,0,z+(z<.5?1:-1)],mat,0); };
  if(prof[0][1]>0) cap(rings[0],prof[0][0]); }
// the cutting edge, top horn to the tip of the beard (a quadratic curve); the spine of the blade runs along the socket
const EP=u=>{ const a=(1-u)*(1-u), b=2*u*(1-u), c=u*u; return [a*.40+b*.68+c*.33, a*.36+b*.02+c*-.44]; };
const INNER=u=>[.05,mix(.2,-.1,u)];
const BLD=(u,s)=>{ const e=EP(u), i=INNER(u), top=-.035*Math.sin(PI*s), bot=.085*Math.sin(PI*s), off=mix(top,bot,u); return [mix(i[0],e[0],s),mix(i[1],e[1],s)+off]; };
// half thickness across the blade: a thick cheek at the socket, thinning, then the bevel down to a razor
const THK=s=>s<.8?.034-.016*s/.8:.018*Math.pow(1-(s-.8)/.2,1.1)+.0015;
(function build(){
  const NU=14, SR=[0,.14,.28,.42,.55,.68,.8,.88,.95,1];
  const G=[]; for(let i=0;i<=NU;i++){ const u=i/NU; G.push(SR.map(s=>{ const [x,z]=BLD(u,s); return {x,z,t:THK(s),s}; })); }
  for(const sd of [1,-1]) for(let i=0;i<NU;i++) for(let j=0;j<SR.length-1;j++){ const P=(a,b)=>{ const g=G[a][b]; return [g.x,g.t*sd,g.z]; }, a=P(i,j), b=P(i+1,j), c=P(i+1,j+1), d=P(i,j+1),
      ctr=[(a[0]+c[0])/2,0,(a[2]+c[2])/2], mat=SR[j]>=.8?EDGE:FACE; quad(a,b,c,d,ctr,mat,[G[i][j].s,G[i+1][j].s,G[i+1][j+1].s,G[i][j+1].s]); }
  // the spine (top) and the underside of the beard close the blade
  for(const i of [0,NU]) for(let j=0;j<SR.length-1;j++){ const g0=G[i][j], g1=G[i][j+1], ctr=[(g0.x+g1.x)/2,0,(g0.z+g1.z)/2+(i?.2:-.2)];
    quad([g0.x,g0.t,g0.z],[g1.x,g1.t,g1.z],[g1.x,-g1.t,g1.z],[g0.x,-g0.t,g0.z],ctr,SR[j]>=.8?EDGE:FACE,[g0.s,g1.s,g1.s,g0.s]); }
  // the socket round the haft, a raised collar at each end
  lathe([[-.15,0],[-.15,.05],[-.13,.062],[-.1,.056],[.19,.056],[.22,.064],[.24,.05],[.24,0]],8,IRONM,1.25,.85);
  // the back spike
  { const B=[[-.06,.032,.1],[-.06,-.032,.1],[-.06,-.032,-.05],[-.06,.032,-.05]], T=[-.27,0,.05], c=[-.12,0,.03]; for(let i=0;i<4;i++) tri(B[i],B[(i+1)%4],T,c,IRONM,0); }
  // the haft: dark wood, swelling to the butt, two iron bands and an iron cap
  lathe([[.24,.032],[.5,.03],[.8,.028],[1.02,.031],[1.08,.037]],8,WOOD);
  lathe([[.33,.036],[.37,.036]],8,IRONM); lathe([[.66,.035],[.7,.035]],8,IRONM);
  lathe([[1.08,.04],[1.12,.042],[1.15,.02],[1.16,0]],8,IRONM);
})();
const NV=VX.length/8;

// ================================================================ the renderer
const NB=8;
const VS=`attribute vec3 p;attribute vec3 n;attribute vec2 ms;
uniform mat4 Mo[${NB}];uniform vec4 Pa[${NB}];uniform vec4 camP;uniform vec2 hf;uniform float shad;
varying vec3 vN;varying vec3 vW;varying vec3 vP;varying float vMat;varying float vS;varying vec4 vPa;varying float vSh;
void main(){int k=int(ms.x/8.+.01);mat4 M=Mo[0];vec4 pa=Pa[0];
 for(int i=1;i<${NB};i++){if(i==k){M=Mo[i];pa=Pa[i];}}
 vec3 w=(M*vec4(p,1.)).xyz;vSh=1.;
 if(shad>.5){float z=max(w.z,0.);vSh=exp(-z/700.);w.x+=z*.5;w.y+=z*.26;w.z=0.;}
 vW=w;vP=p;vN=mat3(M)*n;vMat=mod(ms.x,8.);vS=ms.y;vPa=pa;
 float dx=w.x+camP.x;float dy=w.y*${FSY}+camP.y-w.z;float c=cos(camP.w);float s=sin(camP.w);
 float depth=((w.y+camP.y/${FSY})+${FSY}*w.z)/40000.;
 gl_Position=vec4(vec2(dx*c-dy*s,-dx*s-dy*c)*camP.z/hf,shad>.5?0.:-clamp(depth,-.95,.95),1.);}`;
const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vN;varying vec3 vW;varying vec3 vP;varying float vMat;varying float vS;varying vec4 vPa;varying float vSh;
uniform sampler2D nz;uniform vec3 amb;uniform vec4 lp[4];uniform vec3 lc[4];uniform float shad;uniform float time;
vec3 bb(float t){t=clamp(t,0.,1.2);
 vec3 c=mix(vec3(0.),vec3(.55,.04,.0),smoothstep(0.,.3,t));
 c=mix(c,vec3(1.,.28,.03),smoothstep(.25,.55,t));c=mix(c,vec3(1.,.66,.2),smoothstep(.5,.78,t));c=mix(c,vec3(1.,.95,.82),smoothstep(.74,1.,t));return c;}
void main(){
 float dn=texture2D(nz,vP.xz*2.3+vP.y*3.).b;
 if(dn<vPa.w)discard;
 if(shad>.5){if(vW.z<-1.)discard;float a=.5*vPa.x*vSh*(1.-vPa.w);gl_FragColor=vec4(0.,0.,0.,a);return;}
 if(vW.z<-.5)discard;
 vec3 Vd=vec3(0.,.8146,.58);vec3 N=normalize(vN);if(dot(N,Vd)<0.)N=-N;
 float g1=texture2D(nz,vP.xz*1.7+vec2(.13,.71)).r;float g2=texture2D(nz,vP.xz*5.3+vP.y*2.).g;
 vec3 alb;float spk;float hk;
 if(vMat<.5){alb=vec3(.17,.085,.045)*(.75+.35*sin(vP.z*140.+g1*9.))*(.8+.4*g2);spk=.25;hk=.1;}
 else if(vMat<1.5){alb=vec3(.11,.1,.105)*(.8+.4*g2);spk=.9;hk=.3;}
 else if(vMat<2.5){alb=vec3(.085,.075,.075)*(.65+.6*g1)*(.85+.3*g2);spk=.55;hk=.45+.35*vS;}
 else {alb=vec3(.42,.39,.37)*(.85+.25*g2);spk=1.4;hk=1.;}
 vec3 key=normalize(vec3(-.5,.3,.82));float kd=max(dot(N,key),0.);
 vec3 lit=amb*(.16+1.05*kd);vec3 spc=amb*pow(max(dot(N,normalize(key+Vd)),0.),24.)*.6;
 for(int i=0;i<4;i++){vec4 L=lp[i];if(L.w<=0.)continue;vec3 dl=vec3(L.x,L.y/${FSY},L.z)-vW;float d2=max(dot(dl,dl),1.);vec3 l=dl*inversesqrt(d2);
  float at=clamp(1.-d2/(L.w*L.w),0.,1.);at*=at;float nd=max(dot(N,l),0.);lit+=lc[i]*at*(nd*1.25+.1);spc+=lc[i]*at*pow(max(dot(N,normalize(l+Vd)),0.),20.);}
 float fr=pow(1.-max(dot(N,Vd),0.),3.);
 vec3 col=alb*lit+spc*spk*(.25+alb)+vec3(.9,.42,.18)*fr*.35*(.4+.6*vPa.y);
 // heat: the edge band burns white, the cracks in the steel and the whole head go red as the field holds its breath
 float ck=texture2D(nz,vP.xz*.38+vec2(.4,.2)).g+.25*(g1-.5);float crack=1.-smoothstep(.0,.022,abs(ck-.5));
 float fl=.88+.12*sin(time*23.+vP.z*31.+vP.x*17.);
 float eb=step(1.5,vMat)*smoothstep(.8,1.,vS);
 float edgeT=vPa.z*eb*(.55+.45*eb)*fl;
 float bodyT=vPa.y*hk*(.34+.5*vS*vS)*(.8+.4*g1)+vPa.y*crack*(vMat>1.5?.8:.45)+vPa.z*crack*.3*smoothstep(.45,.95,vS)*step(1.5,vMat);
 float T=max(edgeT,bodyT);
 col=col*(1.-.45*smoothstep(.3,.8,T))+bb(T)*(.25+3.2*T*T);
 float rim=smoothstep(vPa.w+.07,vPa.w,dn)*step(.001,vPa.w);col+=bb(.95)*rim*2.5;
 gl_FragColor=vec4(col*vPa.x,vPa.x);}`;
let P=null, U=null, VB=null, bad=false;
function init(){ if(P||bad) return !!P; if(!F||!F.on||typeof gl==='undefined'||!gl) return false;
  try{ const mk=(t,src)=>{ const o=gl.createShader(t); gl.shaderSource(o,src); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(o)); return o; };
    const p=gl.createProgram(), v=mk(gl.VERTEX_SHADER,VS), f=mk(gl.FRAGMENT_SHADER,FS); gl.attachShader(p,v); gl.attachShader(p,f);
    ['p','n','ms'].forEach((nm,i)=>gl.bindAttribLocation(p,i,nm)); gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
    U={}; for(const nm of ['Mo','Pa','camP','hf','shad','nz','amb','lp','lc','time']) U[nm]=gl.getUniformLocation(p,nm);
    // NB consecutive copies of the mesh; each copy picks its own transform by the slot packed into the material number
    const pk=new Float32Array(VX.length*NB); for(let s=0;s<NB;s++){ pk.set(VX,s*VX.length); for(let i=6;i<VX.length;i+=8) pk[s*VX.length+i]+=s*8; }
    const prev=gl.getParameter(gl.ARRAY_BUFFER_BINDING); VB=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,VB); gl.bufferData(gl.ARRAY_BUFFER,pk,gl.STATIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER,prev);
    P=p; }catch(e){ bad=true; console.warn('AxeUlt3 mesh',e); }
  return !!P; }
const depthRB=new WeakMap(), MO=new Float32Array(16*NB), PA=new Float32Array(4*NB);
function paint(q,LP,LC){ const sh=q.sh?1:0; let fb=null, dep=null;
  if(!sh){ fb=gl.getParameter(gl.FRAMEBUFFER_BINDING); const vp=gl.getParameter(gl.VIEWPORT); dep=depthRB.get(fb||gl);
    if(!dep||dep.w!==vp[2]||dep.h!==vp[3]){ if(dep) gl.deleteRenderbuffer(dep.rb); const rb=gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER,rb); gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,vp[2],vp[3]); gl.bindRenderbuffer(gl.RENDERBUFFER,null); dep={rb,w:vp[2],h:vp[3]}; depthRB.set(fb||gl,dep); }
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,dep.rb); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LESS); gl.clear(gl.DEPTH_BUFFER_BIT); }
  gl.useProgram(P); gl.bindBuffer(gl.ARRAY_BUFFER,VB); gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0); gl.vertexAttribPointer(1,3,gl.FLOAT,false,32,12); gl.vertexAttribPointer(2,2,gl.FLOAT,false,32,24);
  gl.uniform4f(U.camP,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot); gl.uniform2f(U.hf,W/2,H/2); gl.uniform1f(U.shad,sh); gl.uniform1i(U.nz,1); gl.uniform1f(U.time,RT%100);
  const Am=window.GFX?GFX.amb:[1,1,1]; gl.uniform3f(U.amb,Am[0],Am[1],Am[2]); gl.uniform4fv(U.lp,LP.subarray(0,16)); gl.uniform3fv(U.lc,LC.subarray(0,12));
  const L=q.list; for(let f=0;f<L.length;f+=NB){ const n=Math.min(NB,L.length-f); MO.fill(0); PA.fill(0);
    for(let s=0;s<n;s++){ MO.set(L[f+s].M,16*s); PA.set(L[f+s].pa,4*s); }
    gl.uniformMatrix4fv(U.Mo,false,MO); gl.uniform4fv(U.Pa,PA); gl.drawArrays(gl.TRIANGLES,0,n*NV); F.stats.draws++; }
  if(!sh){ gl.disable(gl.DEPTH_TEST); gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,null); } }
function submit(list){ if(!list.length||!init()) return; F.q.push({L:1,ord:0,render:paint,list}); if(!F.low&&F.ground) F.q.push({L:0,ord:-5,render:paint,list,sh:1}); }
// the giant axe held by its grip at H (world x, floor y, z): the head lies out along floor angle th, pitched by ph (+ up); the edge leads the
// way it travels (sg = +1/-1), the blade turned ro about the haft so its faces catch the light. s = world length of one model unit.
function held(th,ph,sg,ro,s,Hx,Hy,Hz){ const c=Math.cos(ph), r=[Math.cos(th)*c,Math.sin(th)*c,Math.sin(ph)], Z=[-r[0],-r[1],-r[2]];
  let Xv=[-Math.sin(th)*sg,Math.cos(th)*sg,0];
  const Yv=[Z[1]*Xv[2]-Z[2]*Xv[1],Z[2]*Xv[0]-Z[0]*Xv[2],Z[0]*Xv[1]-Z[1]*Xv[0]], cr=Math.cos(ro), sr=Math.sin(ro);
  const Xr=Xv.map((v,i)=>v*cr+Yv[i]*sr), Yr=Xv.map((v,i)=>-v*sr+Yv[i]*cr);
  const ox=Hx+s*r[0], oy=Hy/FSY+s*r[1], oz=Hz+s*r[2];
  return new Float32Array([Xr[0]*s,Xr[1]*s,Xr[2]*s,0, Yr[0]*s,Yr[1]*s,Yr[2]*s,0, Z[0]*s,Z[1]*s,Z[2]*s,0, ox,oy,oz,1]); }

// ================================================================ the ultimate: one turn of a colossal axe, and a blow that splits the field
function cast(id){ const ultStart=X.ultStart, ultStop=X.ultStop; ultStart(id); if(F&&F.prepDeep) F.prepDeep();
  const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, t0=RT, clk=()=>RT-t0;
  const KIT=window.AxeKit, yawTo=KIT?KIT.yawTo:(a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a))), MKon=()=>!!(window.MK&&MK.on()), mk=(n,o)=>{ if(MKon()) MK.play(n,o); };
  // beats: the axe grows (to TG), the breath, the turn (TS..TE1), it is hauled up and slammed down (TB), what is left, the end
  const TG=1.15, TS=1.38, TE1=2.28, TB=2.56, TEND=5.9;
  // the turn: from behind him on the left, once round clockwise on the screen and on past the start, ending up the field where it comes down
  const SG=-1, TH0=-PI/2+1.25, DTH=SG*(TAU+1.25), THB=TH0+DTH, SF=1300, GZ=125, ROLL=.42;
  const ease=k=>k<.08?.5*k*k/.08*.4:(.02+.98*Math.pow((k-.04)/.96,1.75));
  const thAt=t=>TH0+DTH*sat(ease(sat((t-TS)/(TE1-TS))));
  const grip=th=>[x0+Math.cos(th)*55,y0+Math.sin(th)*55*FSY];
  const ST={dead:false,th:TH0,ph:-.2,s:220,heat:.15,edge:.5,ero:0,seg:0,lp:0,emb:0,jet:null,jet2:null,gat:null,hold:0};
  const BP=[x0,y0-SF*1.08*FSY];

  // ---- the driver: pose of the axe from the clock, every frame
  GFX.add(TEND+.2,()=>{ if(ST.dead) return; const t=clk();
    let th=TH0, ph, s;
    if(t<TS){ const g=sat((t-.18)/(TG-.18)), e=g<1?1-Math.pow(1-g,3)*(1-.35*g):1; s=mix(240,SF,e)*(1+.035*Math.sin(t*9)*(1-g)); ph=Math.asin(Math.max(-.9,(28-GZ)/Math.max(s,1)))-.02*(1-g);
      th=TH0+.08*Math.sin(Math.min(t,TG)*3)*(1-g); }
    else if(t<TE1){ th=thAt(t); s=SF; ph=Math.asin((95-GZ)/SF); }
    else if(t<TB){ th=THB; s=SF; const k=sat((t-TE1)/(TB-TE1)), up=k<.62?Math.sin(PI/2*k/.62):1-Math.pow((k-.62)/.38,2.2); ph=mix(Math.asin((95-GZ)/SF),1.25,up); }
    else { th=THB; s=SF; ph=Math.asin((-60-GZ)/SF)+.02*Math.exp(-6*(t-TB))*Math.sin((t-TB)*55); }
    ST.th=th; ST.ph=ph; ST.s=s;
    const [Hx,Hy]=grip(th), M=held(th,ph,SG,ROLL*(t<TS?.6:1),s,Hx,Hy,GZ);
    if(!ST.gone) submit([{M,pa:[1,ST.heat,ST.edge,ST.ero]}]);
    // the head: where the fire trails from (its centre and the outer tip of the beard)
    const c=Math.cos(ph), hx=Hx+Math.cos(th)*c*s*1.05, hy=Hy+Math.sin(th)*c*s*1.05*FSY, hz=GZ+Math.sin(ph)*s;
    ST.hx=hx; ST.hy=hy; ST.hz=hz;
    if(ST.gat&&!ST.gat.dead){ ST.gat.x=hx; ST.gat.y=hy; ST.gat.z=hz+60; }
    // the turn: a jet of fire streams back off the blade, and the trail it leaves is laid down as a standing wall of fire and a burnt trench
    if(t>=TS&&t<TE1+.05){ const tb=-SG; const back=Math.atan2(Math.sin(th+tb*PI/2),Math.cos(th+tb*PI/2)), vv=sat((t-TS)/(TE1-TS));
      for(const [J,f] of [[ST.jet,1.05],[ST.jet2,.72]]) if(J){ J.x=Hx+Math.cos(th)*s*f; J.y=Hy+Math.sin(th)*s*f*FSY; J.z=f>1?110:80; J.dir=back; J.len=mix(500,1400,vv)*(f>1?1:.75); J.r=mix(140,230,vv)*(f>1?1:.8); }
      if(t-ST.lp>.016){ ST.lp=t; for(let i=0;i<4;i++){ const f=.75+.7*Math.random(), px=Hx+Math.cos(th)*s*f, py=Hy+Math.sin(th)*s*f*FSY, sp=900+1800*vv;
        GFX.pt({x:px,y:py,z:40+Math.random()*120,vx:Math.cos(back)*sp*(.4+Math.random()*.6),vy:Math.sin(back)*sp*FSY*(.4+Math.random()*.6),vz:200+Math.random()*500,g:900,drag:1.2,life:.3+Math.random()*.4,s:4+Math.random()*4,m:3,len:.05,c:GFX.rgb(i%2?PW.h:PF.s),c2:PF.b,L:3}); } }
      // a new section of wall each time the blade has gone an eighth of the way round
      const done=Math.abs(th-TH0)/(TAU/12);
      while(ST.seg<Math.min(13,Math.floor(done))){ const i=ST.seg++, a0=TH0+SG*i*TAU/12, a1=TH0+SG*(i+1)*TAU/12, R0=SF*(1.02+.06*h01(i)), R1=SF*(1.02+.06*h01(i+1)),
          p0=[x0+Math.cos(a0)*R0,y0+Math.sin(a0)*R0*FSY], p1=[x0+Math.cos(a1)*R1,y0+Math.sin(a1)*R1*FSY], left=TB-t;
        if(i<12){ const ex=.2, q0=[p0[0]+(p0[0]-p1[0])*ex,p0[1]+(p0[1]-p1[1])*ex], q1=[p1[0]+(p1[0]-p0[0])*ex,p1[1]+(p1[1]-p0[1])*ex];
          K.vsheet(q0[0],q0[1],q1[0],q1[1],{h:mix(420,900,h01(i*3.3)),thick:95,dur:left+2.3+.5*h01(i),rise:.1,out:1.3,pal:PF,heat:1.15,turb:1.25,freq:2.2+h01(i*5.1),band:.8,btop:.58,gain:.95,lit:.5,ord:(p0[1]+p1[1])/2});
          K.coolLine(p0[0],p0[1],p1[0],p1[1],{w:190,pal:PF,life:left+4.2,hot:.72,grow:.08,gain:1.4});
          if(i%4===1) K.vsmoke((p0[0]+p1[0])/2,(p0[1]+p1[1])/2,{s:420,z:520,dur:2,rise:600,a:.5,c:'#1c1614',c2:'#4e4038',delay:left+.3}); } } }
    // embers lift off the trench while it burns (counted on the clock)
    if(t>TS+.3){ const want=Math.floor((t-TS-.3)*40*(GFX.QK||1)); let n=0;
      while(ST.emb<want&&n++<4){ ST.emb++; const a=TH0+SG*h01(ST.emb*1.7)*Math.min(TAU,Math.abs(th-TH0)), R=SF*(.95+.2*h01(ST.emb*2.3));
        GFX.pt({x:x0+Math.cos(a)*R,y:y0+Math.sin(a)*R*FSY,z:10,vx:(h01(ST.emb*3.1)-.5)*80,vy:0,vz:150+h01(ST.emb*4.7)*420,g:-40,drag:.5,life:.7+h01(ST.emb*5.9)*.8,s:2.5+h01(ST.emb*6.1)*3.5,m:3,len:.03,c:GFX.rgb(ST.emb%3?PF.m:PF.s),c2:PF.b,fade:'in',L:3}); } }
  });

  // ---- wind-up (0 - 1.15): he sets his feet and drags the axe back; fire is drawn into the head and the axe swells to a colossus, the floor
  // cracks under him, grit and dust are pulled in along the floor
  mk('xSweep',{yaw:yawTo(TH0-SG*1.1),blend:.12,speed:.09});
  GFX.ambient(.55,.4,.36,3); Cn.move({x:x0+Math.cos(TH0)*SF*.45,y:y0+Math.sin(TH0)*SF*.45*FSY-BODY*.5,zoom:1.02,tilt:.2,roll:.02},.9,'io'); Cn.drone&&Cn.drone(38,.34);
  after(.15,()=>{ ST.gat=K.gather?K.gather(x0,y0,200,{dur:1.05,r:420,R:1500,pal:PF,n:.6,shells:0}):null; Cn.SND.inhale(1.1,.5); });
  GFX.add(TS,(k,t)=>{ ST.heat=.15+.6*sat(t/TG); ST.edge=.5+.6*sat(t/TG); });
  [.35,.7,1.0].forEach((tb,i)=>after(tb,()=>{ K.cool(x0+(i-1)*40,y0+10,{kind:i===1?'crack':'crack2',r:220+140*i,rot:i*2.1,pal:PF,life:TB-tb+1.2,hot:.8,grow:.15,light:0}); Cn.shake(.12+.08*i); sfx('boom',.35+.15*i,.3);
    K.sparks(ST.hx||x0,ST.hy||y0,30,{pal:PF,n:8+4*i,sp:[200,700],up:900,life:[.25,.6]}); GFX.light(x0,y0,500+200*i,PF.l,.6,.3,{z:80});
    for(let j=0;j<14;j++){ const a=h01(j*2.1+i)*TAU, r0=700+500*h01(j*3.7+i); GFX.pt({x:x0+Math.cos(a)*r0,y:y0+Math.sin(a)*r0*FSY,z:4,vx:-Math.cos(a)*r0*1.6,vy:-Math.sin(a)*r0*1.6*FSY,vz:40+80*h01(j),g:200,drag:1.1,life:.6,s:9+8*h01(j*5.1),rot:a,vr:3,m:11,b:'alpha',c:GFX.rgb('#4a3426'),c2:'#120c0a',L:1}); } }));
  // ---- the breath (1.15 - 1.38): the floor goes dark, the edge burns white
  after(TG,()=>{ Cn.hush(TS-TG,{a:.45}); GFX.ambient(.36,.22,.2,9); ST.edge=1.25; if(ST.gat&&!ST.gat.dead) ST.gat.release({s:1.1,ring:0}); K.flare(ST.hx,ST.hy,ST.hz+40,{pal:PW,s:360,dur:.18,gain:2.4}); });
  // ---- the turn (1.38 - 2.28): one heavy accelerating turn; he turns with it, arms out on the haft
  after(TS,()=>{ if(MKon()){ MK.M.speed=1; after(.14,()=>{ if(MKon()) MK.M.speed=.015; }); }
    GFX.ambient(.7,.48,.4,5); Cn.move({x:x0,y:y0-160,zoom:.7,tilt:.16,roll:-.05},TE1-TS,'in'); SFX.whoosh&&SFX.whoosh(.9,.9); sfx('fire',.8,.8);
    ST.jet=K.vjet(x0,y0,110,0,{len:500,r:150,r0:90,dur:TE1-TS+.12,pal:PF,pitch:.12,heat:1.2,turb:1,speed:7,in:.08,out:.15,gain:.9,band:.6});
    ST.jet2=K.vjet(x0,y0,80,0,{len:400,r:120,r0:70,dur:TE1-TS+.1,pal:PF,pitch:.08,heat:1.1,turb:1,speed:7,in:.12,out:.15,gain:.75,band:.6});
    // every body is struck as the blade reaches it: thrown outward and up, burning
    for(const e of onScreen(300)){ let a=Math.atan2((e.y-y0)/FSY,e.x-x0), q=SG*(a-TH0); q=((q%TAU)+TAU)%TAU; const fr=q/Math.abs(DTH);
      let lo=0, hi=1; for(let i=0;i<20;i++){ const m=(lo+hi)/2; if(ease(m)<fr) lo=m; else hi=m; } const tt=TS+lo*(TE1-TS)-clk();
      after(Math.max(0,tt),()=>{ if(e.dead) return; dmg(e,Math.min(Dm*.06,e.d.boss?Dm*.06:e.hp*.6),{sx:x0,sy:y0}); if(K.knock) K.knock(e,{from:[x0,y0],dist:420,up:1700,fx:0}); hitstop=Math.max(hitstop,.012); }); } });
  // the hero follows the haft round
  GFX.add(TE1-TS,()=>{ if(MKon()) MK.M.yaw=yawTo(thAt(clk())); },TS);
  // ---- the haul and the blow (2.28 - 2.56): the turn ends with a jolt, the axe is wrenched up over him and brought down up the field
  after(TE1,()=>{ hitstop=Math.max(hitstop,.08); Cn.shake(.6); sfx('boom',.9,.4); mk('xChop',{yaw:yawTo(THB),blend:.04,speed:.85}); Cn.move({x:x0,y:y0-300,zoom:.78,tilt:.24,roll:0},TB-TE1,'in'); Cn.SND.inhale(TB-TE1,.6); });
  after(TB,()=>{ const [bx,by]=BP;
    Cn.peak(bx,by,{ca:.03,blur:.16,tint:'#ff6a1c',hold:.05,out:.32}); hitstop=Math.max(hitstop,.12); Cn.shake(1.6); Cn.SND.hit(1); sfx('boom',2.4,1.1);
    GFX.light(bx,by,hw*1.5,PF.l,1.15,.5,{z:350}); GFX.ambient(.9,.6,.48,8); after(.18,()=>GFX.ambient(.62,.46,.4,2.5));
    Cn.move({x:x0,y:y0-260,zoom:.6,tilt:.14,roll:.025},.22,'out'); after(.4,()=>Cn.move({x:x0,y:y0-220,zoom:.66,tilt:.1,roll:0},1.4,'io'));
    ST.edge=1.4; ST.heat=1;
    K.flare(bx,by,140,{pal:PW,s:900,dur:.09,gain:2.6}); K.flare(bx,by,200,{pal:PF,s:1300,dur:.3,gain:1.5});
    K.vblast(bx,by,{s:820,pal:PF,dur:1.6,smoke:.22,fire:.5,rise:700,band:.7,lit:.4,c:'#1c1210',c2:'#4a3428'});
    K.vring(bx,by,{r:hw*1.7,r0:300,dur:1,heat:.8,pal:PF,tube:.1,a:.38,c:'#1c1412',c2:'#4a3428'});
    K.cool(bx,by,{kind:'crater',r:620,pal:PF,life:3.4,light:0}); K.cool(bx,by,{kind:'crack2',r:1300,ry:900,pal:PF,life:3.4,grow:.22,light:0});
    if(K.rocks) K.rocks(bx,by-40,{n:5,r:560,s:[120,280],kinds:['flag','shard','flag','stone'],pal:PF,glow:.9,dur:1.7,a0:PI*1.05,a1:PI*1.95,lx:bx,ly:by});
    K.chunks(bx,by,{n:5,r:200,sp:[500,1400],up:1700,kind:'stone',s:[40,90],rock:'#3a302a',pal:PF,life:1.2});
    K.sparks(bx,by,200,{pal:PW,n:26,sp:[700,2400],up:2400,life:[.4,1],len:.08});
    for(let i=0;i<22;i++){ const an=h01(i*1.7)*TAU, v=500+1100*h01(i*2.9); GFX.pt({x:bx,y:by,z:20,vx:Math.cos(an)*v,vy:Math.sin(an)*v*FSY,vz:700+1100*h01(i*4.1),g:2600,drag:.3,life:.8+.4*h01(i),s:8+9*h01(i*5.5),rot:an,vr:4,m:11,b:'alpha',c:GFX.rgb('#3a2c24'),c2:'#0c0806',L:1}); }
    { const L=onScreen(300); L.forEach(e=>{ if(K.knock) K.knock(e,{from:[bx,by],dist:600,up:2100,fx:0}); }); L.sort((p,q)=>Math.hypot(p.x-bx,p.y-by)-Math.hypot(q.x-bx,q.y-by)).slice(0,2).forEach(e=>K.ehit&&K.ehit(e,{pal:PF,pw:1.6,ring:0})); }
    after(.06,()=>Cn.shake(1.1)); after(.14,()=>Cn.shake(.8));
    after(.3,()=>Cn.sweep(bx,by,Dm*.6,{speed:5200,push:1.3,max:.35})); });
  // ---- what is left (2.6 - 5.9): the giant axe sits in the floor, cools, then bursts into burning shards; the ring of fire burns down into a trench
  after(TB+.7,()=>{ GFX.add(.55,(k)=>{ ST.ero=.1+.9*k; ST.edge=1.2; ST.heat=1.1; });
    const c=Math.cos(ST.ph); for(let i=0;i<4;i++){ const f=.25+.25*i, px=x0+Math.cos(THB)*c*SF*f, py=y0+Math.sin(THB)*c*SF*f*FSY;
      K.chunks(px,py,{n:2,r:60,sp:[300,900],up:1200,kind:'shard',s:[40,80],rock:IRON,pal:PF,life:1.1,detail:1,glow:1}); }
    K.sparks(BP[0],BP[1],120,{pal:PF,n:20,sp:[300,1200],up:1500,life:[.3,.8]}); sfx('fire',.6,.5); Cn.shake(.3);
    after(.55,()=>{ ST.gone=1; }); });
  after(TB+1.3,()=>mk('xRaise',{yaw:yawTo(PI/2),blend:.2}));
  after(TEND-.85,()=>{ Cn.back(.8); GFX.ambient(1,1,1,2); });
  after(TEND,()=>{ ST.dead=true; ultStop(); }); }

window.AxeUlt3={cast};
})();

// BERSERKER ultimate 3 (ax_ult3) 천붕선풍. Plan: _gen/v3/axe_plan.md "궁극기 3"; reworked 2026-11-25 night after the reference video's
// 40-second awakening (frames in _gen/ref/axe/ref_ult1_*), told with the summoned giant axe:
//  summon  0 - .8    he raises his own axe; a gold rune gate opens above and behind him and the colossal axe is pushed out of it, molten
//  turn   1.14-1.69  he coils and whips it one savage full turn round him; the swept arc stays as a broad torn sheet of gold-orange fire
//  runes  1.64-      a gold rune circle bursts out over the whole floor, small flames of light at five points; he lifts the axe to the sky
//  walls  2.2 -      tall tongues of fire rise round the circle, dark smoke behind, white-gold shafts fall from above (the thickest on the axe)
//  dragon 2.85-3.57  the axe is whipped down and round again and a dragon of fire runs out ahead of its blade round the whole field
//  blow   3.57-3.91  the axe goes up over his head and down on the far side, its path one huge white-gold crescent; it bursts: the
//                    whole-screen explosion (kept from the earlier version)
//  after  3.91-6.91  the whole floor burns, scorched and smoking, and cools
// The giant axe is a lit 3D solid drawn by a small renderer of its own (like assassin_blades.js): see "the giant axe" below.
// Kit update 14 round 2 (2026-11-26): with the baked sequences loaded (BK) the axe's whole life - pushed out of a gate to his right handle
// first, hauled into the coil, the first turn ploughing the floor, heaved up, the second turn dived into the floor on a tilted plane, the
// blow slammed down edge first and buried, burning away in the explosion - and the floor it tears up (trench, slabs, chunks, chips, thrown
// again by the second turn and the blow, left lying) are one Blender render (_gen/blend/ax_ult3.py, motion ax3_motion.py). Its per-frame
// model matrix (meta marks) keeps the fire, sparks, light and hits on the baked blade. The beats after the first turn are 0.4 s tighter.
// Without the sequences everything below draws as before.
'use strict';
(()=>{
const X=RPG.sv, FSY=X.FSY, {A,BODY,dmg,view,onScreen,sfx}=X;
const K=window.K3, F=window.FX3, PI=Math.PI, TAU=PI*2;
const sat=v=>Math.max(0,Math.min(1,v)), mix=(a,b,k)=>a+(b-a)*k, eo3=k=>1-(1-k)*(1-k)*(1-k), eio=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
const h01=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); };
// palette: copied from sk_axe.js PAL (black-body fire), plus the white of the hottest instant
const PF={d:'#2a0600',b:'#ff4a0c',m:'#ffa424',h:'#fff3c4',l:'#ff6a1c',s:'#ffc478'};
const PW={d:'#6a3200',b:'#ffc848',m:'#fff2b8',h:'#ffffff',l:'#ffd890',s:'#fff0c0'};
const PG={d:'#2a1606',b:'#d88a24',m:'#ffd27a',h:'#fff6dc',l:'#ffae34',s:'#ffe6a0'};

// ================================================================ the giant axe: a lit 3D solid built after the design picture
// assets/axe_giant_a (2163 x 702: pole along row 344, butt on the left, crescent on the right) is the design: its silhouette and colours.
// Model frame: Z = down the pole toward the butt (1 unit = 868 px, origin at the dragon head, px 1750), X = picture up (the horns),
// Y = through the blade's faces. Three kinds of surface, all real geometry with their own normals:
//  * the pole: a lathe (18 sides) whose radius follows the picture column by column, so the studded rings, the cloud collars and the
//    spiked pommel bulge out; four big and four small spikes stand out of the pommel; the picture is wrapped round it (cylindrical)
//  * the head: a height field over the blade and the dragon, front and back: thin at the cutting edge (a bevel ~50 px wide), a thick
//    spine along the inner rim, the dragon's head raised high; its outline (chips, two notches) is cut by the picture's alpha
//  * side walls standing along that outline, as tall as the head is thick there
// The fragment shader adds what is too fine for geometry: relief from the painting's light and dark (engraving, scales, wrap ridges),
// grime in the grooves and bright wear on what stands out, fine scratches, soot by the edge, heat on the edge, runes filling with fire.
const IW=2163, IH=702, PXU=868, PCX=1750, PCY=344, DW=544, DH=176;
const PROF=[0,0,6,8,12,15,19,22,25,30,34,64,62,68,72,72,72,72,72,72,70,70,70,64,49,47,53,55,48,44,44,44,44,44,45,46,45,44,44,46,47,46,44,44,42,40,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,39,39,40,40,40,40,40,40,39,39,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,44,48,48,48,48,48,48,48,62,64,65,64,62,56,46,46,47,44,44,43,44,46,52,47,46,46,46,45,45,44,44,43,44,44,43,42,42,42,42,44,44,45,45,45,44,44,54,46,47,54,44,44,44,46,46,54,62,64,65,64,62,48,47,47,48,48,47,47,45,37,36,36,36,36,36,36,36,36,36,36,36,36,37,37,37,37,37,37,37,37,42,50,52,52,52,50,50,50,50,64];
const LZ=(PROF.length-1)*8;
const IMG={ok:false,map:null,pot:null,mesh:null};
(function load(){ if(typeof Image==='undefined') return; const im=new Image();
  im.onload=()=>{ try{ build(im); IMG.ok=true; }catch(e){ console.warn('AxeUlt3 build',e); return; } let n=0; const up=()=>{ if(!init()&&!bad&&n++<60) setTimeout(up,500); }; up(); };
  im.src='assets/axe_giant_a.webp?v=1'; })();
// the head's map (DW x DH): R = half thickness (px/64), G = blade (vs dragon), B = covered by the pole lathe, A = the outer cutting edge
function build(im){ const cv=document.createElement('canvas'); cv.width=DW; cv.height=DH; const cx=cv.getContext('2d'); cx.drawImage(im,0,0,DW,DH);
  const px=cx.getImageData(0,0,DW,DH).data, N=DW*DH, D=new Float32Array(N), sx=IW/DW, sy=IH/DH;
  for(let i=0;i<N;i++) D[i]=px[i*4+3]>110?1e4:0;
  const g=(x,y)=>x<0||y<0||x>=DW||y>=DH?0:D[y*DW+x];
  for(let y=0;y<DH;y++) for(let x=0;x<DW;x++){ const i=y*DW+x; if(!D[i]) continue; D[i]=Math.min(D[i],g(x-1,y)+1,g(x,y-1)+1,g(x-1,y-1)+1.414,g(x+1,y-1)+1.414); }
  for(let y=DH-1;y>=0;y--) for(let x=DW-1;x>=0;x--){ const i=y*DW+x; if(!D[i]) continue; D[i]=Math.min(D[i],g(x+1,y)+1,g(x,y+1)+1,g(x+1,y+1)+1.414,g(x-1,y+1)+1.414); }
  // outward direction of the silhouette (-grad D), smoothed over a few pixels; the edge facing away from the hollow is the cutting edge
  const OX=new Float32Array(N), OY=new Float32Array(N);
  for(let y=0;y<DH;y++) for(let x=0;x<DW;x++){ const i=y*DW+x; if(!D[i]) continue; let ox=0, oy=0; for(let r=1;r<=3;r++){ ox+=g(x-r,y)-g(x+r,y); oy+=g(x,y-r)-g(x,y+r); } const l=Math.hypot(ox,oy)||1; OX[i]=ox/l; OY[i]=oy/l; }
  const H=new Float32Array(N), out=new Uint8Array(N*4), lathe=(fx,dy)=>fx<LZ&&dy<76;
  for(let y=0;y<DH;y++) for(let x=0;x<DW;x++){ const i=y*DW+x, d0=D[i]; if(!d0) continue;
    const fx=(x+.5)*sx, fy=(y+.5)*sy, dy=Math.abs(fy-PCY), d=d0*sx, lt=lathe(fx,dy);
    const w=sat((105-dy)/30)*sat((1915-fx)/35), inner=OX[i]<-.3||OY[i]*(fy-PCY)<0, outer=!inner;
    const hb=outer?Math.min(20,4+d*.3):Math.min(20,12+d*.2), hh=Math.min(48,12+d*.6), h=lt?0:mix(hb,hh,w);
    H[i]=h; out[i*4]=Math.min(255,h/64*255); out[i*4+1]=(1-w)*255; out[i*4+2]=lt?255:0; out[i*4+3]=(1-w)*(outer?1:0)*sat(1-d/26)*255; }
  // thickness carried a few pixels past the outline, so the faces meet the side walls at the outline's height
  for(let y=0;y<DH;y++) for(let x=0;x<DW;x++){ const i=y*DW+x; if(D[i]) continue; let m=0; for(let v=-2;v<=2;v++) for(let u=-2;u<=2;u++){ const xx=x+u, yy=y+v; if(xx>=0&&yy>=0&&xx<DW&&yy<DH&&D[yy*DW+xx]) m=Math.max(m,H[yy*DW+xx]); } out[i*4]=Math.min(255,m/64*255); }
  IMG.map=out;
  const pc=document.createElement('canvas'); pc.width=2048; pc.height=1024; pc.getContext('2d').drawImage(im,0,0,2048,1024); IMG.pot=pc;
  // ---- the mesh. vertex: position 3, uv 2, normal 3, kind 1 (0 pole, 1 head face, 2 wall)
  const V=[], P=(fx,fy,o)=>[(PCY-fy)/PXU,o/PXU,(PCX-fx)/PXU], hAt=(fx,fy)=>{ const x=Math.min(DW-1,Math.max(0,Math.floor(fx/sx))), y=Math.min(DH-1,Math.max(0,Math.floor(fy/sy))); return out[(y*DW+x)*4]/255*64; };
  const vx=(p,u,v,n,k)=>V.push(p[0],p[1],p[2],u,v,n[0],n[1],n[2],k), tri=(a,b,c)=>{ for(const q of [a,b,c]) vx(...q); };
  // the pole: rings every 8 px, 18 sides; normal from the slope of the profile
  const NS=18, rings=[]; for(let i=0;i<PROF.length;i++){ const fx=i*8; if(fx>LZ) break; const r=Math.max(PROF[i],.5), dr=((PROF[Math.min(i+1,PROF.length-1)]||0)-(PROF[Math.max(i-1,0)]||0))/16;
    rings.push(Array.from({length:NS+1},(_,j)=>{ const a=j/NS*TAU, c=Math.cos(a), s=Math.sin(a), n=[c,s,dr], l=Math.hypot(...n); return [[r*c/PXU,r*s/PXU,(PCX-fx)/PXU],fx/IW,(PCY-.9*r*c)/IH,[n[0]/l,n[1]/l,n[2]/l],0]; })); }
  for(let i=1;i<rings.length;i++) for(let j=0;j<NS;j++){ const a=rings[i-1][j], b=rings[i-1][j+1], c=rings[i][j+1], d=rings[i][j]; tri(a,b,c); tri(a,c,d); }
  { const R=rings[rings.length-1], z=R[0][0][2], c=[[0,0,z],R[0][1],PCY/IH,[0,0,-1],0]; for(let j=0;j<NS;j++) tri(c,[R[j][0],R[j][1],R[j][2],[0,0,-1],0],[R[j+1][0],R[j+1][1],R[j+1][2],[0,0,-1],0]); }
  // the pommel's spikes: four big ones square to the pole at px 124, four small ones between them at px 84
  for(const [fx,a0,r0,r1,rb] of [[124,0,62,118,17],[84,PI/4,30,92,10]]) for(let q=0;q<4;q++){ const a=a0+q*PI/2, ax=[Math.cos(a),Math.sin(a),0], e1=[0,0,1], e2=[-ax[1],ax[0],0], z=(PCX-fx)/PXU;
    const at=s=>[ax[0]*s/PXU,ax[1]*s/PXU,z], tip=at(r1), uvp=s=>[fx/IW,(PCY-s)/IH], ring=[];
    for(let j=0;j<=8;j++){ const b=j/8*TAU, cb=Math.cos(b), sb=Math.sin(b), off=[e1[0]*cb+e2[0]*sb,e1[1]*cb+e2[1]*sb,e1[2]*cb+e2[2]*sb], base=at(r0), p=[base[0]+off[0]*rb/PXU,base[1]+off[1]*rb/PXU,base[2]+off[2]*rb/PXU], k=rb/(r1-r0), n=[off[0]+ax[0]*k,off[1]+ax[1]*k,off[2]+ax[2]*k], l=Math.hypot(...n);
      ring.push([p,(fx+cb*rb*.6)/IW,(PCY-r0)/IH,[n[0]/l,n[1]/l,n[2]/l],0]); }
    for(let j=0;j<8;j++){ const m=ring[j][3], n2=ring[j+1][3]; tri(ring[j],ring[j+1],[tip,...uvp(r1-4),[(m[0]+n2[0])/2,(m[1]+n2[1])/2,(m[2]+n2[2])/2],0]); } }
  // the head: a height field (12 px cells) front and back over the cells the picture covers outside the lathe
  const ST=12, X0=1440, NX=Math.ceil((IW-X0)/ST), NY=Math.ceil(IH/ST), cover=(fx,fy)=>{ for(let v=0;v<=ST;v+=4) for(let u=0;u<=ST;u+=4){ const x=Math.floor((fx+u)/sx), y=Math.floor((fy+v)/sy); if(x<DW&&y<DH&&(D[y*DW+x]||out[(y*DW+x)*4])&&!out[(y*DW+x)*4+2]) return true; } return false; };
  for(const sd of [1,-1]) for(let j=0;j<NY;j++) for(let i=0;i<NX;i++){ const fx=X0+i*ST, fy=j*ST; if(!cover(fx,fy)) continue;
    const C=(a,b)=>{ const x=Math.min(IW,fx+a*ST), y=Math.min(IH,fy+b*ST); return [P(x,y,sd*hAt(x,y)),x/IW,y/IH,[0,sd,0],1]; };
    const a=C(0,0), b=C(1,0), c=C(1,1), d=C(0,1); tri(a,b,c); tri(a,c,d); }
  // side walls along the outline (marching squares over the alpha, so they follow it smoothly), facing out, as tall as the faces there
  const AL=(x,y)=>px[(y*DW+x)*4+3], TH=110, SEG=[[],[[3,2]],[[2,1]],[[3,1]],[[0,1]],[[3,0],[2,1]],[[0,2]],[[3,0]],[[3,0]],[[0,2]],[[0,1],[3,2]],[[0,1]],[[3,1]],[[2,1]],[[3,2]],[]];
  for(let y=0;y<DH-1;y++) for(let x=0;x<DW-1;x++){ const C4=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]], ins=C4.map(([u,v])=>AL(u,v)>TH), code=(ins[0]?8:0)|(ins[1]?4:0)|(ins[2]?2:0)|(ins[3]?1:0); if(!SEG[code].length) continue;
    const E=e=>{ const [u0,v0]=C4[e], [u1,v1]=C4[(e+1)%4], a0=AL(u0,v0), a1=AL(u1,v1), t=(TH-a0)/((a1-a0)||1); return [(u0+(u1-u0)*t+.5)*sx,(v0+(v1-v0)*t+.5)*sy]; };
    let cx=0, cy=0, ni=0; C4.forEach(([u,v],k)=>{ if(ins[k]){ cx+=(u+.5)*sx; cy+=(v+.5)*sy; ni++; } }); cx/=ni; cy/=ni;
    for(const [e0,e1] of SEG[code]){ const p=E(e0), q=E(e1), hp=hAt(p[0],p[1]), hq=hAt(q[0],q[1]); if(hp<.5&&hq<.5) continue;
      let nx=-(q[1]-p[1]), ny=q[0]-p[0]; const l=Math.hypot(nx,ny)||1; nx/=l; ny/=l; const mx=(p[0]+q[0])/2, my=(p[1]+q[1])/2; if(nx*(mx-cx)+ny*(my-cy)<0){ nx=-nx; ny=-ny; }
      const nn=[-ny,0,-nx], u=(mx-nx*8)/IW, v=(my-ny*8)/IH;
      const A_=[P(p[0],p[1],hp),u,v,nn,2], B_=[P(q[0],q[1],hq),u,v,nn,2], C_=[P(q[0],q[1],-hq),u,v,nn,2], D_=[P(p[0],p[1],-hp),u,v,nn,2]; tri(A_,B_,C_); tri(A_,C_,D_); } }
  IMG.mesh=new Float32Array(V); }
// the outer cutting edge (picture px [row, col]) for the fire torn off it
const EDGE=[[8,1790],[30,1931],[60,2002],[90,2043],[120,2073],[150,2097],[180,2118],[210,2134],[240,2147],[300,2104],[360,2103],[420,2153],[450,2139],[480,2122],[510,2102],[540,2078],[570,2050],[600,2000],[630,1971],[660,1915],[690,1821]].map(([r,c])=>[(PCY-r)/PXU,(PCX-c)/PXU]);

// ================================================================ the renderer
const VS=`attribute vec3 p;attribute vec2 uv;attribute vec3 n;attribute float kd;
uniform mat4 M;uniform vec4 pa;uniform vec4 camP;uniform vec2 hf;uniform float mode;
varying vec2 vUV;varying vec3 vW;varying vec3 vN;varying vec3 vMp;varying float vK;varying float vSh;varying vec3 vX;varying vec3 vY;varying vec3 vZ;
void main(){vec3 w=(M*vec4(p,1.)).xyz;vW=w;vSh=1.;
 vX=normalize(M[0].xyz);vY=normalize(M[1].xyz);vZ=normalize(M[2].xyz);vN=vX*n.x+vY*n.y+vZ*n.z;
 if(mode>1.5){float z=max(w.z,0.);vSh=exp(-z/1600.);w.x+=z*.5;w.y+=z*.26;w.z=0.;}
 vUV=uv;vMp=p;vK=kd;
 float dx=w.x+camP.x;float dy=w.y*${FSY}+camP.y-w.z;float c=cos(camP.w);float s=sin(camP.w);
 float depth=((w.y+camP.y/${FSY})+${FSY}*w.z)/12000.;
 gl_Position=vec4(vec2(dx*c-dy*s,-dx*s-dy*c)*camP.z/hf,mode>.5?0.:-clamp(depth,-.95,.95),1.);}`;
const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUV;varying vec3 vW;varying vec3 vN;varying vec3 vMp;varying float vK;varying float vSh;varying vec3 vX;varying vec3 vY;varying vec3 vZ;
uniform sampler2D tA;uniform sampler2D tD;uniform sampler2D nz;uniform vec3 amb;uniform vec4 lp[4];uniform vec3 lc[4];uniform float mode;uniform float time;
uniform vec4 pa;uniform vec4 clip;uniform vec4 fx;
vec3 bb(float t){t=clamp(t,0.,1.2);
 vec3 c=mix(vec3(0.),vec3(.55,.04,.0),smoothstep(0.,.3,t));
 c=mix(c,vec3(1.,.28,.03),smoothstep(.25,.55,t));c=mix(c,vec3(1.,.66,.2),smoothstep(.5,.78,t));c=mix(c,vec3(1.,.95,.82),smoothstep(.74,1.,t));return c;}
float lum(vec4 c){return dot(c.rgb,vec3(.3,.59,.11))/max(c.a,.05);}
void main(){
 vec4 D=texture2D(tD,vUV);
 bool head=vK>.5&&vK<1.5;bool pole=vK<.5;
 vec4 Al=texture2D(tA,vUV);
 if(head&&(Al.a<.5||D.b>.5))discard;
 float dn=texture2D(nz,vMp.xz*2.1+vMp.y*3.).b;
 if(dn<pa.w)discard;
 float dp=dot(vW,clip.xyz)-clip.w;if(fx.w>.5&&dp<0.)discard;
 vec3 V=vec3(0.,.8146,.58);
 if(mode>1.5){if(normalize(vN).z<-.05||vK>1.5)discard;gl_FragColor=vec4(0.,0.,0.,.62*pa.x*vSh*(1.-pa.w));return;}
 vec3 al=Al.a>.3?Al.rgb/Al.a:vec3(.42,.3,.14);
 // geometric normal (head faces: from the thickness map, so the bevel and the dragon's volume light up), then relief from the painting
 vec3 N=normalize(vN);
 vec2 at=vec2(1.5/2048.,1.5/1024.);
 float bx=(lum(texture2D(tA,vUV+vec2(at.x,0.)))-lum(texture2D(tA,vUV-vec2(at.x,0.))))/3.17;
 float by=(lum(texture2D(tA,vUV+vec2(0.,at.y)))-lum(texture2D(tA,vUV-vec2(0.,at.y))))/2.06;
 float sg=sign(dot(N,vY)+.0001);
 if(head){vec2 dt=vec2(1./${DW}.,1./${DH}.);
  float gx=(texture2D(tD,vUV+vec2(dt.x,0.)).r-texture2D(tD,vUV-vec2(dt.x,0.)).r)*8.05;
  float gy=(texture2D(tD,vUV+vec2(0.,dt.y)).r-texture2D(tD,vUV-vec2(0.,dt.y)).r)*8.02;
  N=normalize(vX*gy+vY*sg+vZ*gx);}
 float rk=pole?4.:head?5.5:1.5;
 vec3 T1=normalize(vX-N*dot(vX,N)), T2=normalize(vZ-N*dot(vZ,N));
 N=normalize(N+(T1*by+T2*bx)*rk*(vK>1.5?.3:1.));
 // wear: the painting's local mean (a blurred mip) tells grooves (darker: grime) from raised work (lighter: polished by use)
 float lu=dot(al,vec3(.3,.59,.11));vec4 Mn=texture2D(tA,vUV,4.);float mu=Mn.a>.2?lum(Mn):lu;
 float cav=smoothstep(.0,.18,mu-lu), rise=smoothstep(.0,.15,lu-mu);
 float gold=smoothstep(.36,.56,(al.r-al.b)/max(al.r,.02))*smoothstep(.3,.5,lu);
 // fine scratches across the faces and the metal
 vec2 sc=vec2(vUV.x*IWF+vUV.y*.35*IHF,vUV.y*IHF-vUV.x*.2*IWF);
 float s1=texture2D(nz,sc*vec2(.0028,.045)).g, s2=texture2D(nz,sc.yx*vec2(.003,.05)+.5).r;
 float scr=max(smoothstep(.965,.995,1.-abs(s1-.5)*2.),smoothstep(.97,.997,1.-abs(s2-.5)*2.)*.7)*(pole?.6:1.);
 al=al*(1.-.45*cav)*(1.+.25*rise)+scr*vec3(.18,.16,.13);
 // the side walls: the bare section of the blade, a little darker and glossier than the painted faces
 if(vK>1.5){al*=vec3(.78,.74,.68);rise=1.;}
 vec3 key=normalize(vec3(-.45,.35,.82));float kd=max(dot(N,key),0.);
 vec3 mc=mix(vec3(1.),al*1.7,gold);float sx=mix(14.,46.,gold)*(1.-.5*cav);float sk=(.12+.95*gold+.3*scr)*(1.-.7*cav)*(1.+.6*rise);
 vec3 lit=amb*(.36+.58*kd)+vec3(.16,.15,.14)*(.5+.5*kd);vec3 spc=amb*pow(max(dot(N,normalize(key+V)),0.),sx)*sk*mc;
 for(int i=0;i<4;i++){vec4 L=lp[i];if(L.w<=0.)continue;vec3 dl=vec3(L.x,L.y/${FSY},L.z)-vW;float d2=max(dot(dl,dl),1.);vec3 l=dl*inversesqrt(d2);
  float a=clamp(1.-d2/(L.w*L.w),0.,1.);a*=a;float nd=max(dot(N,l),0.);lit+=lc[i]*a*(nd*.75+.08);spc+=lc[i]*a*pow(max(dot(N,normalize(l+V)),0.),sx*.7)*sk*1.2*mc;}
 lit=1.5*(1.-exp(-lit*.85));spc=spc/(1.+.6*spc);
 vec3 col=al*lit+spc;
 float fr=pow(1.-max(dot(N,V),0.),3.);col+=mix(vec3(.5,.42,.32),vec3(1.,.5,.2),pa.y)*fr*.35*(1.-.5*cav);
 // heat: the outer edge of the crescent burns, the whole weapon warms; soot darkens the burning edge's surroundings
 float edg=head?D.a:0.;
 float flk=.82+.18*sin(time*23.+vUV.x*41.+vUV.y*27.);
 float T=max(edg*edg*pa.z*flk*.85,pa.y*.4*(.4+.6*D.g));
 col*=1.-.25*smoothstep(.0,.6,edg)*pa.z;
 col=col*(1.-.4*smoothstep(.3,.8,T))+bb(T)*(.25+3.*T*T)*step(.03,T);
 // the engraved gold fills with fire light (runes), pulsing
 float rune=gold*mix(.18,1.,head?D.g:0.)*fx.z*(.75+.25*sin(time*13.-vUV.x*22.));col+=bb(.62+.2*fx.z)*rune*1.1;
 // cracks of light run through it from the blade before it bursts
 if(fx.y>0.){float c=texture2D(nz,vUV*vec2(7.,2.3)+.37).r;float rd=1.-abs(c-.5)*2.;float fr2=fx.y*1.3-(1.-vUV.x);
  float ex=max(fx.y-1.,0.);float cm=smoothstep(.95-.12*ex,.99-.05*ex,rd)*smoothstep(0.,.12,fr2);col=col*(1.-.6*smoothstep(.85,.95,rd)*smoothstep(0.,.12,fr2))+bb(.96+.2*ex)*cm*(3.2+6.*ex)+bb(.5)*min(fx.y,1.)*.06+bb(.8)*ex*.35;}
 // fresh out of the gate: still molten, cooling as it moves away from it
 if(fx.w>.5){float g=exp(-dp/240.)*fx.x;col=col*(1.-.55*g)+bb(.72+.3*g)*g*2.3;}
 if(pa.w>.001)col+=bb(.95)*(1.-smoothstep(pa.w,pa.w+.07,dn))*2.5;
 gl_FragColor=vec4(col*pa.x,pa.x);}`.replace(/IWF/g,IW+'.').replace(/IHF/g,IH+'.');
let PR=null, U=null, VB=null, NV=0, TA=null, TD=null, bad=false;
function init(){ if(PR||bad) return !!PR; if(!F||!F.on||typeof gl==='undefined'||!gl||!IMG.ok) return false;
  try{ const mk=(t,src)=>{ const o=gl.createShader(t); gl.shaderSource(o,src); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(o)); return o; };
    const p=gl.createProgram(), v=mk(gl.VERTEX_SHADER,VS), f=mk(gl.FRAGMENT_SHADER,FS); gl.attachShader(p,v); gl.attachShader(p,f);
    ['p','uv','n','kd'].forEach((nm,i)=>gl.bindAttribLocation(p,i,nm)); gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
    U={}; for(const nm of ['M','pa','camP','hf','mode','tA','tD','nz','amb','lp','lc','time','clip','fx']) U[nm]=gl.getUniformLocation(p,nm);
    const prev=gl.getParameter(gl.ARRAY_BUFFER_BINDING); VB=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,VB); gl.bufferData(gl.ARRAY_BUFFER,IMG.mesh,gl.STATIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER,prev); NV=IMG.mesh.length/9;
    // the two textures go on units 5 and 6 (FX3 uses 0-3)
    const prevU=gl.getParameter(gl.ACTIVE_TEXTURE), pm=gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL), fy=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.activeTexture(gl.TEXTURE5); TA=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,TA); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,IMG.pot); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE6); TD=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,TD); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,DW,DH,0,gl.RGBA,gl.UNSIGNED_BYTE,IMG.map);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,pm); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,fy); gl.activeTexture(prevU);
    PR=p; }catch(e){ bad=true; console.warn('AxeUlt3 mesh',e); }
  return !!PR; }
const depthRB=new WeakMap(), FXU={clip:[0,0,1,-1e9],fx:[0,0,0,0]};
// q.mode: 0 the weapon (depth tested), 2 floor shadow (upward faces only)
function paint(q,LP,LC){ const mode=q.mode; let fb=null, dep=null;
  if(mode===0){ fb=gl.getParameter(gl.FRAMEBUFFER_BINDING); const vp=gl.getParameter(gl.VIEWPORT); dep=depthRB.get(fb||gl);
    if(!dep||dep.w!==vp[2]||dep.h!==vp[3]){ if(dep) gl.deleteRenderbuffer(dep.rb); const rb=gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER,rb); gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,vp[2],vp[3]); gl.bindRenderbuffer(gl.RENDERBUFFER,null); dep={rb,w:vp[2],h:vp[3]}; depthRB.set(fb||gl,dep); }
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,dep.rb); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LESS); gl.clear(gl.DEPTH_BUFFER_BIT); }
  gl.useProgram(PR); gl.bindBuffer(gl.ARRAY_BUFFER,VB); for(let i=0;i<4;i++) gl.enableVertexAttribArray(i);
  gl.vertexAttribPointer(0,3,gl.FLOAT,false,36,0); gl.vertexAttribPointer(1,2,gl.FLOAT,false,36,12); gl.vertexAttribPointer(2,3,gl.FLOAT,false,36,20); gl.vertexAttribPointer(3,1,gl.FLOAT,false,36,32);
  const prevU=gl.getParameter(gl.ACTIVE_TEXTURE); gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D,TA); gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D,TD); gl.activeTexture(prevU);
  gl.uniform4f(U.camP,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot); gl.uniform2f(U.hf,W/2,H/2); gl.uniform1f(U.mode,mode); gl.uniform1i(U.tA,5); gl.uniform1i(U.tD,6); gl.uniform1i(U.nz,1); gl.uniform1f(U.time,RT%100);
  gl.uniform4fv(U.clip,FXU.clip); gl.uniform4fv(U.fx,FXU.fx);
  const Am=window.GFX?GFX.amb:[1,1,1]; gl.uniform3f(U.amb,Am[0],Am[1],Am[2]); gl.uniform4fv(U.lp,LP.subarray(0,16)); gl.uniform3fv(U.lc,LC.subarray(0,12));
  for(const it of q.list){ gl.uniformMatrix4fv(U.M,false,it.M); gl.uniform4fv(U.pa,it.pa); gl.drawArrays(gl.TRIANGLES,0,NV); F.stats.draws++; }
  gl.disableVertexAttribArray(3);
  if(mode===0){ gl.disable(gl.DEPTH_TEST); gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,null); } }
function submit(main){ if(!init()) return;
  F.q.push({L:1,ord:0,render:paint,list:[main],mode:0}); if(!F.low&&F.ground) F.q.push({L:0,ord:-5,render:paint,list:[main],mode:2}); }
// the giant axe with its pivot (model z GR) at H (world x, floor y, z): the head lies out along floor angle th, pitched by ph (+ up); the
// horns lead the way it travels (sg = +1/-1); turned ro about the pole, then a share `face` of the way toward showing its face to the camera.
const GR=1.75;
function held(th,ph,sg,ro,s,Hx,Hy,Hz,face=.7){ const c=Math.cos(ph), r=[Math.cos(th)*c,Math.sin(th)*c,Math.sin(ph)], Z=[-r[0],-r[1],-r[2]];
  const Xv=[-Math.sin(th)*sg,Math.cos(th)*sg,0];
  const Yv=[Z[1]*Xv[2]-Z[2]*Xv[1],Z[2]*Xv[0]-Z[0]*Xv[2],Z[0]*Xv[1]-Z[1]*Xv[0]];
  { const bx=Xv[1]*.8146+Xv[2]*.58, by=Yv[1]*.8146+Yv[2]*.58, opt=Math.atan2(-bx,by); let d=opt-ro; d=Math.atan2(Math.sin(d),Math.cos(d)); if(Math.abs(d)>PI/2) d=Math.atan2(Math.sin(d+PI),Math.cos(d+PI)); ro+=d*face; }
  const cr=Math.cos(ro), sr=Math.sin(ro);
  const Xr=Xv.map((v,i)=>v*cr+Yv[i]*sr), Yr=Xv.map((v,i)=>-v*sr+Yv[i]*cr);
  const ox=Hx+s*GR*r[0], oy=Hy/FSY+s*GR*r[1], oz=Hz+s*GR*r[2];
  return new Float32Array([Xr[0]*s,Xr[1]*s,Xr[2]*s,0, Yr[0]*s,Yr[1]*s,Yr[2]*s,0, Z[0]*s,Z[1]*s,Z[2]*s,0, ox,oy,oz,1]); }
const wpt=(M,ex,ez)=>[M[0]*ex+M[8]*ez+M[12],(M[1]*ex+M[9]*ez+M[13])*FSY,M[2]*ex+M[10]*ez+M[14]];

// ================================================================ the summoning gate: a rune disc standing in a plane (normal n, true 3D),
// drawn with FX3 quads: a dark hollow, a glow, two counter-turning rune rings
let GM=null;
function gateMats(){ if(GM) return GM; GM={
  dark:F.mat({pm:[3,.75,0,0],nk:0,ero:0,soft:.5,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'o',ord:-3}),
  glow:F.mat({pm:[3,1.4,0,0],nk:0,ero:0,soft:.6,rk:[.6,1],gain:1.2,layer:'o',ord:-2}),
  ringA:F.mat({tex:'fx_circle_arcane',nk:0,ero:.12,soft:.3,rk:[.6,1.35],gain:1.5,bgain:1.05,layer:'o',ord:-2}),
  ringN:F.mat({tex:'fx_circle_arcane',nz:'veins',n1:[3,3,.05,.03],nk:.9,pw:1.3,ero:.1,soft:.3,rk:[.35,.8],gain:1.8,bgain:1.1,layer:'o',ord:-2}),
  ringB:F.mat({tex:'fx_circle_seal',nk:0,ero:.12,soft:.3,rk:[.6,1.35],gain:1.5,bgain:1.05,layer:'o',ord:-2}) }; return GM; }
function gateM(n,r,rot){ const e1=[-n[1],n[0],0], l=Math.hypot(e1[0],e1[1])||1; e1[0]/=l; e1[1]/=l; const e2=[n[1]*e1[2]-n[2]*e1[1],n[2]*e1[0]-n[0]*e1[2],n[0]*e1[1]-n[1]*e1[0]];
  const c=Math.cos(rot), s=Math.sin(rot), a=e1.map((v,i)=>v*c+e2[i]*s), b=e1.map((v,i)=>-v*s+e2[i]*c);
  return new Float32Array([a[0]*r,a[1]*r,a[2]*r,0, b[0]*r,b[1]*r,b[2]*r,0, n[0]*r,n[1]*r,n[2]*r,0, 0,0,0,1]); }
function gateDraw(G,t,k){ const m=gateMats(), C={cA:'#2a1006',cB:'#a8521a',cC:'#ffd89a',cM:'#e8943c'}, CF={cA:PF.d,cB:PF.b,cC:PF.h,cM:PF.m}, r=G.r*k, o={z:G.z};
  if(r<4) return; const sp=1+.08*Math.sin(t*31);
  F.quad(m.dark,G.x,G.y,1,1,0,{...o,M:gateM(G.n,r*1.02,0),a:.75*k});
  F.quad(m.glow,G.x,G.y,1,1,0,{...o,M:gateM(G.n,r*1.45,0),...CF,a:.7*k*sp,gain:.9,bgain:.6});
  F.quad(m.ringA,G.x,G.y,1,1,0,{...o,M:gateM(G.n,r,t*.9),...C,a:k*.8,gain:1.1,rv:[Math.min(1.5,G.u*1.5),.25,0,.14]});
  F.quad(m.ringN,G.x,G.y,1,1,0,{...o,M:gateM(G.n,r,t*.9),...CF,a:k*(.5+.3*Math.sin(t*6)),gain:1.9,rv:[Math.min(1.5,G.u*1.5),.25,0,.14]});
  F.quad(m.ringB,G.x,G.y,1,1,0,{...o,M:gateM(G.n,r*.62,-t*1.6),...C,a:k*.75,gain:1.05,rv:[Math.min(1.5,G.u*1.5-.2),.25,0,.14]}); }

// ================================================================ pieces after axe_ult1.js (local copies, adapted): the video's rune circle,
// fire walls, shafts of light, fire dragon and crescent
const VQ=window.VOL;
const QF={d:'#1a0602',b:'#8a1a06',m:'#ff5a14',h:'#fff4d8',l:'#ff6a1c',s:'#ffc24a'};
const PE={d:'#220200',b:'#d81204',m:'#ff6a14',h:'#ffd070',l:'#ff3410',s:'#ff9a50'};
// the rune circles: an amber nearer the fire than the clean gold
const PGR={d:'#2a1006',b:'#a8521a',m:'#e8943c',h:'#ffd89a',l:'#ff9a34',s:'#ffd08a'};
const col=P=>({cA:P.d,cB:P.b,cM:P.m||P.b,cC:P.h});
const rand=(a,b)=>a+Math.random()*(b-a), smo=k=>k*k*(3-2*k);
const vok=()=>!!(VQ&&VQ.on&&K.vok&&K.vok());
const vol=(kind,x,y,z,o)=>{ if(vok()) VQ.add(kind,x,y,z,o); };
// true-depth vectors [x, depth, z]; world calls take the floor y = depth*FSY
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], scl=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const nrm=a=>{ const l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; }, crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const lerp3=(a,b,k)=>[mix(a[0],b[0],k),mix(a[1],b[1],k),mix(a[2],b[2],k)];
const W3=p=>({x:p[0],y:p[1]*FSY,z:p[2]});
// a stream of volume fire between two true-depth points (mouth a, far end b)
const jetSeg=(a,b,r0,r1,o)=>{ const dx=b[0]-a[0], dY=b[1]-a[1], dz=b[2]-a[2], hl=Math.hypot(dx,dY), L=Math.hypot(hl,dz)||1, R=Math.max(r0,r1,1)*1.25;
  vol('jet',(a[0]+b[0])/2,(a[1]+b[1])/2*FSY,(a[2]+b[2])/2,{ex:L/2,ey:R,ez:R,yaw:Math.atan2(dY,dx),pitch:Math.atan2(dz,hl),pa:[r0/R,r1/R,o.freq||2.6,o.speed||5],pb:[o.heat??1.2,o.turb??.6,o.head??1.5,o.tail??-.3],
    dens:o.dens??10,gain:o.gain??1.5,seed:o.seed||1,smoke:o.smoke??.12,fire:.5,rim:o.rim||0,...col(o.pal||QF),cS:o.cS||(o.pal||QF).d,cK:o.cK||'#9a8676',band:o.band,btop:o.btop,lit:o.lit,flow:o.flow,ord:o.ord}); };
// smooth light materials (no grain): a soft band across a ribbon and its hot core
let SMT=null; const smt=()=>SMT||(SMT={body:F.mat({pm:[2,1.3,0,0],nz:'fbm',n1:[1.2,.6,-1.4,0],nk:.12,ero:0,soft:.5,rk:[.3,.95],gain:2.4,bgain:1.1}),core:F.mat({pm:[2,3.5,0,0],nk:0,ero:0,soft:.4,rk:[.15,.55],gain:4,bgain:2}),
  torn:F.mat({pm:[2,1.1,0,0],nz:'billow',n1:[2.2,1.1,-2.6,.3],n2:[4.5,2,-3.4,-.4],nk:.85,pw:1.2,ero:.18,soft:.35,rk:[.25,1],gain:2.2,bgain:1.1})});
// a fire burning on the floor: a real flame painting through the fire ramp, its grain rising, flickering, burning down from the top. s = height
let FM=null; const fireMat=()=>FM||(FM=F.mat({...K.mats().art,tex:'v3_real_fire',layer:'o',nz:'billow',n1:[1,1.6,0,-2.2],n2:[1.4,1.2,.04,-1.6],dist:.07,mdist:1,rk:[.45,1.05]}));
// (2026-11-25) no longer a flame photograph stood on a card (it read as a picture sliding about): a real volume of fire, its own twist and girth,
// that burns down and leaves smoke
const fireCard=(x,y,s,dur,o={})=>{ if(!F.on) return; after(o.delay||0,()=>{ const hold=o.hold??.45, g=.8+.4*h01(x*.013+y*.007);
    K.vcolumn(x,y,{r:(s*.15+50)*(o.wide||1)*g,h:s*.8,dur,rise:o.rise||.18,out:dur*(1-hold)*.9,pal:o.pal||QF,heat:1.25,twist:1.4+1.6*h01(x*.031),turb:1.15,taper:.24+.3*h01(x*.017+y*.011),gain:.85,band:1,btop:.62,lit:.6,flow:1.4});
    if(o.light) GFX.light(x,y,s*2.2,QF.l,.7,dur,{z:s*.4,flick:.3});
    if(s>700&&g>1) after(dur*.7,()=>K.vsmoke(x,y,{s:s*.4,z:s*.3,dur:1.8+g,rise:420,a:.3,c:'#1c120e',c2:'#5a3a2a',lit:.4,vx:-100})); }); };
// a shaft of white-gold light falling from above the screen onto (x,y): it reaches down, stands, thins and goes
const shaft=(x,y,w,dur,delay,o={})=>{ if(!F.on) return; const m=K.mats(), S=smt(), br=o.br??1, fk=o.flick||0, ph=rand(0,9);
  GFX.add(dur,(k,t)=>{ const i=eo3(sat(t/.16)), f=sat((k-.5)/.5), fl=fk?(.45+.55*Math.abs(Math.sin(t*fk+ph))*(.7+.3*Math.sin(t*fk*2.3+ph))):1, a=(1-f*f)*fl*br, z0=5200*(1-i), pts=[0,1,2,3,4,5].map(j=>({x:x+(j/5)*w*.4,y,z:mix(z0,5200,j/5),q:j/5}));
    const ft=q=>Math.min(1,.12+q*4.4);
    F.ribbon(S.body,pts.map(p=>({...p,w:w*(2.2+1.6*p.q)*(1-.3*f)*ft(p.q)})),{...col(PG),a:.35*a,gain:1.4});
    F.ribbon(S.body,pts.map(p=>({...p,w:w*(.9+.7*p.q)*(1-.5*f)*ft(p.q)})),{...col(PW),a:.7*a,gain:2});
    if(!fk) F.ribbon(S.core,pts.map(p=>({...p,w:w*(.3+.25*p.q)*(1-.6*f)*ft(p.q)})),{...col(PW),a:.8*a,gain:2.6});
    if(i>.9&&!fk) F.quad(m.glowG,x,y,w*4,w*4,0,{...col(PG),a:.7*a,gain:1.3}); },delay||0);
  if(!fk) after((delay||0)+.14,()=>{ GFX.light(x,y,w*9,PW.l,br,dur*.8,{z:200}); K.sparks(x,y,20,{pal:PG,n:10,sp:[200,700],up:900,life:[.3,.7]}); }); };

// ================================================================ the ultimate
function cast(id){ const ultStart=X.ultStart, ultStop=X.ultStop; ultStart(id); if(F&&F.prepDeep) F.prepDeep();
  const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, Y0=y0/FSY, t0=RT, clk=()=>RT-t0;
  const BM=K.bakeMeta||{}, BK=!!(F.on&&BM.ax3_a&&BM.ax3_b&&BM.ax3_a.marks)&&K.bakePre(['ax3_a','ax3_b']);   // the baked pictures are used only if every page has arrived; if not (a slow phone, a first cast) the drawn version plays, and they keep loading for the next cast
  const KIT=window.AxeKit, yawTo=KIT?KIT.yawTo:(a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a))), MKon=()=>!!(window.MK&&MK.on()), mk=(n,o)=>{ if(MKon()) MK.play(n,o); };
  // beats: the gate opens (T0) and the axe is pushed out of it (to TOUT); he coils (to TW), a breath (to TS); one savage full turn (TS..TE1)
  // leaving a sheet of gold fire; the rune circle bursts out over the floor (TRUNE) while he lifts the axe to the sky; walls of fire and
  // shafts of light (TWALL); the axe is whipped round once more, a dragon of fire running out ahead of its blade (TD0..TD1); the haul up,
  // the crescent down, the cracks blow open, the blow (TB); the burning field; the end
  const T0=.08, TOUT=.8, TW=1.02, TS=1.14, TE1=TS+.55, TRUNE=TE1-.05, TWALL=BK?1.95:2.2, TD0=BK?2.45:2.85, TD1=TD0+.72, TB=TD1+(BK?.52:.34), TEND=TB+(BK?.9:3.0), TCON=TB-.08;
  const SG=1, TH0=BK?0:.55, THW=-PI/2-.3, THB=-PI/2+TAU, DTH=THB-THW, SF=920, RH=SF*GR, PZ=240, PZS=640, LS=2470, WB2=.2, TH2=3*PI, A0=THB-WB2;
  const PHS=-.13, PH1=Math.asin((80-PZ)/RH), PHR=.5, PHE=PI-Math.asin((-50-PZ)/RH);
  // baked axe: frame f of the render is clock AX_T0+(f-1)/30; the first turn's sweep is the bake's (SWT: share of the turn at each 1/20 of
  // its time), and so is the blow's pitch (bk)
  const AX_T0=.08, PHB=3.5302, PZB=700, SWT=[0.0000,0.0023,0.0061,0.0132,0.0257,0.0458,0.0758,0.1181,0.1753,0.2466,0.3188,0.3892,0.4571,0.5231,0.5887,0.6543,0.7199,0.7862,0.8553,0.9273,1.0000];
  const swp=k=>{ const f=sat(k)*20, i=Math.min(19,Math.floor(f)); return SWT[i]+(SWT[i+1]-SWT[i])*(f-i); };
  const bk=k=>k<.5?.42*(1-(1-k/.5)*(1-k/.5)):k<.62?.42+.03*(k-.5)/.12:.45+.55*Math.pow((k-.62)/.38,2.4);
  const ease=BK?swp:(k=>.2*k+.8*Math.pow(k,2.3)), e2=k=>.3*k+.7*k*k;
  // which baked picture shows at clock t (ax3_a holds the summon at 15 fps, then 30 fps, then the hold at 15 fps; ax3_b the rest)
  const axF=t=>{ const f=1+(t-AX_T0)*30; if(f<72) return ['ax3_a',f<=21?(f-1)/2:f<=58?10+(f-21):47+(f-58)/2]; return ['ax3_b',Math.min(BM.ax3_b.n-1,f-72)]; };
  const thAt=t=>t<TD0?THW+DTH*sat(ease(sat((t-TS)/(TE1-TS)))):A0+(TH2-A0)*e2(sat((t-TD0)/(TD1-TD0)));
  // the last blow: up over his head and down on the other side (pitch past the vertical), a catch of breath at the top
  const phO=BK?(t=>{ const k=sat((t-TD1)/(TCON-TD1)); return PH1+.03+(PHB-PH1-.03)*bk(k); }):(t=>{ const k=sat((t-TD1)/(TB-TD1)); return PH1+(PHE-PH1)*(.26*Math.sin(PI/2*Math.min(1,k/.42))+.74*Math.pow(sat((k-.42)/.58),2.2)); });
  const dir=(th,ph)=>[Math.cos(th)*Math.cos(ph),Math.sin(th)*Math.cos(ph),Math.sin(ph)];
  const D0=dir(TH0,PHS);
  // the gate: on the axe's line behind the butt, its plane turned 0.6 rad from the pole toward the camera so it reads as a disc
  const GN=BK?[-0.82,0.57,0]:[Math.cos(TH0+.62),Math.sin(TH0+.62),0], GC=BK?[x0+2350,Y0,640]:[x0-D0[0]*330,y0/FSY-D0[1]*330,PZS-D0[2]*330];
  const G={x:GC[0],y:GC[1]*FSY,z:GC[2],n:GN,r:BK?640:560,u:0};
  const ST={dead:false,th:TH0,ph:PHS,heat:.1,edge:.2,ero:0,rune:0,crack:0,emerge:1,clip:1,fl:0,flw:0,pt:0,tr:0,lp:0,emb:0,suck:0,ev:0,burn:0,wd:0,gone:0,M:null};
  const BP=[x0+(BK?1600:RH*.98),y0];
  const finish=()=>{ if(ST.dead) return; ST.dead=true; FXU.fx=[0,0,0,0]; ultStop(); };
  // what the first turn leaves behind, decided up front: torn wall fragments, columns of fire of every height and gaps, at uneven distances
  const EV=Array.from({length:10},(_,i)=>{ const u=(i+.3+.5*h01(i*1.3))/10, kind=h01(i*2.7)<.28?'col':h01(i*3.1)<.15?'gap':'wall';
    return {u,kind,R:RH*mix(.55,1.12,h01(i*4.3)),L:mix(260,620,h01(i*5.9)),h:mix(260,1000,Math.pow(h01(i*6.7),1.4)),j:(h01(i*7.1)-.5)*.8,dur:mix(.5,1.2,h01(i*8.3)),sm:h01(i*9.7)<.4}; });
  const arcP=(a,r,z)=>[x0+Math.cos(a)*r,Y0+Math.sin(a)*r,z];

  // ---- the driver: pose of the axe from the clock, every frame
  GFX.add(TEND+.3,()=>{ if(ST.dead) return; if(typeof lock!=='undefined'&&!lock&&clk()>.2){ ST.dead=true; FXU.fx=[0,0,0,0]; return; } const t=clk();
    const dt=Math.min(.05,Math.max(0,t-ST.pt)); ST.pt=t;
    const turn1=t>=TS&&t<TE1, turn2=t>=TD0&&t<TD1, turning=turn1||turn2, tk=t<TD0?sat((t-TS)/(TE1-TS)):sat((t-TD0)/(TD1-TD0));
    let th=TH0, ph=PHS, Hx=x0, Hy=y0, Hz=PZS, face=1, vis=t>=T0;
    if(t<TOUT){ const g=sat((t-T0)/(TOUT-T0)), sd=LS*(1-eio(g)*.55-.45*eo3(g)); Hx=x0-D0[0]*sd; Hy=y0-D0[1]*sd*FSY; Hz=PZS-D0[2]*sd; }
    else if(t<TS){ const g=eio(sat((t-TOUT)/(TW-TOUT))), pull=280*g, hold=sat((t-TW)/(TS-TW)); th=mix(TH0,THW,g); Hz=mix(PZS,PZ,g)+(t<TW?14*Math.sin(t*40)*(1-g):7*Math.sin(t*90)*hold); ph=mix(PHS,PH1,g); face=mix(1,.6,g);
      Hx=x0-Math.cos(th)*pull; Hy=y0-Math.sin(th)*pull*FSY; }
    else if(t<TE1){ const pull=280*(1-eo3(sat((t-TS)/.14))); th=thAt(t); Hz=PZ; ph=PH1; face=.6; Hx=x0-Math.cos(th)*pull; Hy=y0-Math.sin(th)*pull*FSY; }
    else if(t<TD0){ const u=t-TE1, g=eio(sat(u/.45)), wb=smo(sat((t-(TD0-.2))/.2)); th=THB+.1*Math.exp(-7*u)*Math.sin(u*16)+.32*g*(1-wb)-WB2*wb; ph=mix(PH1,PHR,g)+.012*Math.sin(t*34)*g+.08*wb; Hz=PZ; face=mix(.6,.95,g); }
    else if(t<TD1){ th=thAt(t); ph=mix(PHR+.08,PH1,eo3(sat(tk/.3))); Hz=PZ; face=mix(.95,.6,sat(tk/.2)); }
    else if(t<TB){ th=TH2; Hz=PZ; ph=phO(t); face=.95; }
    else { th=TH2; Hz=PZ; ph=PHE+.02*Math.exp(-6*(t-TB))*Math.sin((t-TB)*55); face=.8; }
    ST.th=th; ST.ph=ph;
    if(sg&&!sg.dead){ if(t>.3&&t<TS-.1) sg.a=.8+.3*Math.sin(t*7); if(t>=TS-.1){ const b=sat((t-TS+.1)/.75); sg.pal=PF; sg.hole=b*1.08; sg.a=1.1;
      const want=Math.floor(b*50*(GFX.QK||1)); while(ST.burn<want){ ST.burn++; const a=h01(ST.burn*2.9)*TAU, r=640*Math.min(1,b*1.08+.02);
        GFX.pt({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,z:8,vx:0,vy:0,vz:90+120*h01(ST.burn),g:-30,drag:1,life:.35+.3*h01(ST.burn*3.3),s:26+30*h01(ST.burn*4.1),grow:30,m:8,c:GFX.rgb(ST.burn%3?PF.m:PF.s),L:3}); } } }
    // the weapon's state from the clock: molten out of the gate, runes filling, the edge heating, white-gold under the shafts, cracks before the burst
    ST.emerge=sat((TOUT+.15-t)/.3); ST.clip=t<TOUT+.12?1:0;
    ST.rune=t<TS?sat((t-.2)/.6):t<TE1?.6+.3*Math.sin(t*16):t<TD1?.9+.3*sat((t-TE1)/.5)+.15*Math.sin(t*12):1.3;
    ST.edge=t<TS?mix(.15,.9,sat((t-.3)/.6)):t<TE1?1:t<TD1?1.15:1.25;
    ST.heat=t<TS?.1+.2*sat(t/.9):t<TWALL?.3:t<TD1?.3+.3*sat((t-TWALL)/.5):t<TB?.6+.2*sat((t-TD1)/(TB-TD1)):.8+.4*sat((t-TB)/.3);
    ST.crack=t<TD1?0:t<TB-.1?eo3(sat((t-TD1)/(TB-.1-TD1))):1+sat((t-TB+.1)/.1); ST.ero=t<TB?0:Math.min(1,.15+sat((t-TB)/.3)*1.05); ST.gone=t>TB+.3?1:0;
    let M=held(th,ph,SG,.85,SF,Hx,Hy,Hz,face);
    if(BK){ const MS=BM.ax3_a.marks, g=Math.max(0,Math.min(MS.length-1.001,(t-AX_T0)*30)), i=Math.floor(g), w=g-i, a=MS[i], b=MS[i+1], m=a.map((v,j)=>v+(b[j]-v)*w);
      M=new Float32Array([m[0],m[1],m[2],0,m[3],m[4],m[5],0,m[6],m[7],m[8],0,x0+m[9],Y0+m[10],m[11],1]);
      const sl=Math.hypot(m[6],m[7],m[8])||1, r=[-m[6]/sl,-m[7]/sl,-m[8]/sl], dt0=Math.atan2(r[1],r[0])-th; th+=Math.atan2(Math.sin(dt0),Math.cos(dt0)); ph=Math.asin(Math.max(-1,Math.min(1,r[2])));
      Hx=M[12]-SF*GR*r[0]; Hy=(M[13]-SF*GR*r[1])*FSY; Hz=M[14]-SF*GR*r[2]; }
    ST.M=M;
    FXU.clip=[GN[0],GN[1],GN[2],GN[0]*GC[0]+GN[1]*GC[1]+GN[2]*GC[2]]; FXU.fx=[ST.emerge,ST.crack,ST.rune,ST.clip];
    if(!BK&&vis&&!ST.gone) submit({M,pa:[1,ST.heat,ST.edge,ST.ero]});
    // the baked axe and the floor it tore up (drawn over the hero, who shows through its holdout); the last picture (the rubble lying,
    // the axe burnt away) stays until the end and fades with it; from the blow on it is the scorched rubble in the fire's light
    if(BK&&t>=AX_T0){ const [nm,f]=axF(t); K.bakeFrame(nm,f,x0,y0,{a:1-sat((t-TEND+.7)/.6),amb:t<TB?.35:.8,bright:.9-.45*sat((t-TB)/.3),tint:t<TB?'#ffffff':'#ffb890',ord:.02}); }
    const c=Math.cos(ph), rr=SF*GR, hx=Hx+Math.cos(th)*c*rr, hy=Hy+Math.sin(th)*c*rr*FSY, hz=Hz+Math.sin(ph)*rr;
    ST.hx=hx; ST.hy=hy; ST.hz=hz;
    // fire wrapping the edge: licks torn off the crescent, streaming back as it moves (out of the gate only)
    if(t>.3&&t<TB&&!ST.gone){ ST.flw+=dt*(turning?95:t>TE1?55:45)*(GFX.QK||1); const back=th-SG*PI/2, spd=turning?200+900*tk:140; let n=0;
      while(ST.fl<ST.flw&&n++<6){ ST.fl++; const e=EDGE[Math.floor(h01(ST.fl*1.37)*EDGE.length)], [wx,wy,wz]=wpt(M,e[0],e[1]), hot=ST.fl%4===0;
        if(ST.clip&&(wx*GN[0]+wy/FSY*GN[1]+wz*GN[2])<FXU.clip[3]+60) continue;
        GFX.pt({x:wx,y:wy,z:Math.max(10,wz),vx:Math.cos(back)*spd*(.5+.5*h01(ST.fl*2.1)),vy:Math.sin(back)*spd*FSY*(.5+.5*h01(ST.fl*2.1)),vz:200+300*h01(ST.fl*3.3),g:-60,drag:1.6,life:.22+.22*h01(ST.fl*4.1),s:20+28*h01(ST.fl*5.3),grow:40,m:8,c:GFX.rgb(hot?PW.h:ST.fl%2?PF.m:PF.s),c2:PF.b,L:3}); }
      if(ST.flw-ST.fl>12) ST.fl=Math.floor(ST.flw); }
    // heat haze over the burning edge
    if(t>.5&&t<TB&&GFX.haze){ const [ex,ey,ez]=wpt(M,0,-.3); GFX.haze(ex,ey,ez+60,360,.5); }
    // the lifted axe stands in its own white-gold light while the walls burn
    if(F.on&&t>TE1+.2&&t<TD0+.1){ const g=sat((t-TE1-.2)/.4)*(1-sat((t-TD0+.1)/.2)), [ex,ey,ez]=wpt(M,0,-.1), fl=1+.07*Math.sin(t*37), m=K.mats();
      F.bill(m.glowO,ex,ey,ez,(520+260*g)*fl,(520+260*g)*fl,0,{...col(PG),a:.2*g,gain:1.3}); GFX.light(ex,ey,1300,PW.l,.8*g,.04,{z:ez}); }
    // the sheet of fire: the arc the blade has just swept stays for an instant as one broad torn band of gold-orange fire, thickest right
    // behind the blade, lifting and thinning to smoke at its tail (first turn; the second turn's fire is the dragon)
    if(F.on&&t>=TS+.05&&t<TE1+.4){ const thn=thAt(Math.min(t,TE1)), fade=sat((t-TE1)/.4), span=Math.min(thn-THW,2.9), N=30, S=smt(), m=K.mats(), mid=[], hot=[], tip=[];
      if(span>.12){ for(let j=0;j<=N;j++){ const u=j/N, a=thn-span*u, tp=Math.pow(1-u,.55)*Math.min(1,.25+u*9), lift=380*u*u+260*fade;
          mid.push({...W3(arcP(a,RH*(.66+.05*Math.sin(a*5.3)),90+lift)),w:RH*.47*tp*(1+.25*fade)});
          hot.push({...W3(arcP(a,RH*(.86+.04*Math.sin(a*7.1)),70+lift*.6)),w:RH*.2*tp});
          if(u<.4) tip.push({...W3(arcP(a,RH*1.02,60)),w:46*(1-u/.4)}); }
        F.ribbon(S.torn,mid,{...col(PG),a:(BK?.35:.9)*(1-fade),gain:1.9,ero:.18+.6*fade});
        F.ribbon(m.trB,hot,{...col(PF),a:(BK?.3:.85)*(1-fade),gain:1.7});
        if(tip.length>1&&!fade) F.ribbon(m.trC,tip,{...col(PW),a:1,gain:2.6});
        // real fire in the band: three thick streams along the arc right behind the blade, the last already smoke
        const sp3=Math.min(span,1.65)/3; for(let i=BK?1:0;i<3;i++){ const a0=thn-.08-i*sp3, r=RH*(.8-.05*i), rad=(170+70*i)*(1+.5*fade);
          jetSeg(arcP(a0,r,110+60*i),arcP(a0-sp3*1.15,r-40,150+120*i+200*fade),rad*.8,rad,{pal:i?PF:PW,heat:1.35*(1-.8*fade)-.15*i,turb:.7+.3*i+.5*fade,smoke:mix(.1+.25*i,.95,fade),cS:fade>.4?'#140e0c':QF.d,cK:'#5e5048',dens:9*(1-fade*fade),gain:1.35,speed:5,seed:41+i,rim:.3*fade,lit:.5,flow:.9,band:.4}); } } }
    // the last blow's path: the whole arc the blade cuts over him stays as one huge white-gold crescent, thickest in the middle
    if(F.on&&t>TD1+.08&&t<TB+.5){ const pn=phO(Math.min(t,TB)), f=sat((t-TB-.06)/.4), tail=sat((t-TB)/.45), Np=30, S=smt(), m=K.mats(), mid=[], outE=[], inE=[], RO=RH*1.36;
      for(let j=0;j<=Np;j++){ const u=j/Np, a=mix(.6,(BK?PHB:PHE)-.04,u); if(a>pn||u<tail*tail) continue; const sn=Math.sin(PI*u), w=(30+760*Math.pow(sn,1.15))*(1-.5*f), P=r=>({x:x0-Math.cos(a)*r,y:y0+24,z:Math.max(0,(BK?PZB:PZ)+Math.sin(a)*r)});
        outE.push({...P(RO),w:16+22*sn}); mid.push({...P(RO-w*.5),w:w*.5}); inE.push({...P(RO-w),w:8+10*sn}); }
      if(mid.length>1){ F.ribbon(S.body,mid.map(p=>({...p,w:p.w*1.5})),{...col(PG),a:.45*(1-f),gain:1.5});
        F.ribbon(S.body,mid,{cA:'#a86a1c',cB:'#ffd890',cM:'#fff2d0',cC:'#ffffff',a:(1-f*f)*.95,gain:2.2});
        F.ribbon(S.core,outE,{...col(PW),a:1-f,gain:3.8});
        F.ribbon(m.trC,inE,{...col(PG),a:.9*(1-f),gain:2}); } }
    // one smear, at the blade tip only: fire along the arc the tip has just swept (from the clock, so no angle is skipped however far it
    // moved since the last frame), a tail of smoke shed behind it
    if((t>=TS+.1&&t<TE1+.02)||(t>=TD0+.06&&t<TD1+.02)){ const sw=t<TD0?thAt(Math.min(t,TE1))-THW:DTH+thAt(Math.min(t,TD1))-THB, want=Math.floor(sw/.055); let n=0;
      while(ST.wd<want&&n++<60){ ST.wd++; const a=THW+SG*ST.wd*.055, q=h01(ST.wd*1.7), R=RH*(.86+.2*q), tg=a+SG*PI/2, ca=Math.cos(a), sa=Math.sin(a);
        if(ST.wd%2===0) GFX.pt({x:x0+ca*RH*.75,y:y0+sa*RH*.75*FSY,z:15,vx:ca*1100,vy:sa*1100*FSY,vz:60,g:0,drag:2.2,life:.6,s:110+80*q,grow:220,m:5,b:'alpha',c:GFX.rgb('#4a3a30'),c2:'#0a0706',c3:'#9a7a5e',er:.9,ns:1.1,w:1,a:.35,L:2});
        if(ST.wd%3===0) GFX.pt({x:x0+ca*RH,y:y0+sa*RH*FSY,z:90,vx:ca*1500+(q-.5)*400,vy:sa*1500*FSY,vz:500+500*q,g:1500,drag:.6,life:.6+.4*q,s:7+6*q,m:8,c:GFX.rgb(PW.h),L:3});
        if(turn1||ST.wd%2) GFX.pt({x:x0+Math.cos(a)*R,y:y0+Math.sin(a)*R*FSY,z:60+90*h01(ST.wd*2.3),vx:-Math.cos(tg)*120,vy:-Math.sin(tg)*120*FSY,vz:120+160*q,g:-80,drag:1.4,life:.3+.25*h01(ST.wd*3.1),s:mix(80,150,tk)*(.7+.6*q),grow:90,m:8,c:GFX.rgb(ST.wd%5===0?PW.h:ST.wd%2?PF.m:PF.s),c2:PF.b,L:3}); }
      if(t-ST.tr>=.03){ ST.tr=t; const b=thAt(t)-SG*.12; GFX.pt({x:x0+Math.cos(b)*RH*1.05,y:y0+Math.sin(b)*RH*1.05*FSY,z:120,vx:0,vy:0,vz:160,g:-30,drag:1,life:1.3,s:120+90*tk,grow:160,m:5,b:'alpha',c:GFX.rgb('#2e2622'),c2:'#0a0706',c3:'#6a5a50',er:.9,ns:1.2,w:1,a:.4,L:2}); } }
    // the summoning: sparks and fire drawn into the gate along spirals, dust lifted off the floor toward it (counted on the clock)
    if(t>T0&&t<TOUT+.1){ const want=Math.floor((t-T0)*80*(GFX.QK||1)); let n=0;
      while(ST.suck<want&&n++<5){ ST.suck++; const a=h01(ST.suck*1.9)*TAU, R=700+500*h01(ST.suck*2.7), lf=.4+.25*h01(ST.suck*3.1), b=h01(ST.suck*4.3)<.35;
        const sx=G.x+Math.cos(a)*R, sy=G.y+Math.sin(a)*R*FSY*.6, sz=Math.max(20,G.z+Math.sin(a)*R*.5);
        if(b) GFX.pt({x:sx,y:y0+Math.sin(a)*300*FSY,z:10,vx:(G.x-sx)/lf*.8,vy:(G.y-y0)/lf*.5,vz:(G.z-10)/lf*.7,g:0,drag:.2,life:lf,s:40+40*h01(ST.suck),grow:-30,m:5,b:'alpha',c:GFX.rgb('#3a2c24'),c2:'#0a0706',c3:'#8a6448',er:.9,ns:1.1,w:1,a:.35,L:2});
        else GFX.pt({x:sx,y:sy,z:sz,vx:(G.x-sx)/lf,vy:(G.y-sy)/lf,vz:(G.z-sz)/lf,g:0,drag:0,life:lf,s:3+3*h01(ST.suck*5.1),m:3,len:.06,c:GFX.rgb(ST.suck%3?PG.s:PW.h),c2:PF.b,fade:'in',L:3}); } }
    // the turns: sparks stream back off the blade; behind the first one the floor tears open in fragments of wall, columns of fire, scorched trench and smoke
    if((t>=TS&&t<TE1+.05)||(t>=TD0&&t<TD1+.05)){ const back=Math.atan2(Math.sin(th-SG*PI/2),Math.cos(th-SG*PI/2));
      if(t-ST.lp>.03){ ST.lp=t; for(let i=0;i<2;i++){ const f=.6+.55*Math.random(), px=Hx+Math.cos(th)*rr*f, py=Hy+Math.sin(th)*rr*f*FSY, sp=900+1800*tk;
        GFX.pt({x:px,y:py,z:30+Math.random()*140,vx:Math.cos(back)*sp*(.4+Math.random()*.6),vy:Math.sin(back)*sp*FSY*(.4+Math.random()*.6),vz:200+Math.random()*600,g:1100,drag:1.2,life:.3+Math.random()*.45,s:4+Math.random()*3,m:3,len:.022,c:GFX.rgb(i%2?PW.h:PF.s),c2:PF.b,L:3}); } }
      const done=Math.abs(th-THW)/Math.abs(DTH);
      while(t<TE1+.05&&ST.ev<EV.length&&EV[ST.ev].u<=done){ const E=EV[ST.ev++], a=th-SG*.12, px=x0+Math.cos(a)*E.R, py=y0+Math.sin(a)*E.R*FSY, left=Math.max(0,TE1-t)+.25, tg=a+SG*PI/2+E.j;
        if(E.kind==='wall') K.vcolumn(px,py,{r:mix(150,240,h01(ST.ev*2.2)),h:E.h*.9,dur:left+E.dur,rise:.1,out:.6,pal:PF,twist:1.2,turb:1.3,heat:1.15,taper:.4,band:.8,btop:.56,gain:.95,lit:.5});
        else if(E.kind==='col') K.vcolumn(px,py,{r:mix(80,150,h01(ST.ev*2.2)),h:E.h*1.3,dur:left+E.dur*.8,rise:.12,out:.6,pal:PF,twist:1.8,turb:.9,taper:.55,band:.8,gain:.95});
        K.coolLine(px-Math.cos(tg)*E.L*.8,py-Math.sin(tg)*E.L*.8*FSY,px+Math.cos(tg)*E.L*.8,py+Math.sin(tg)*E.L*.8*FSY,{w:mix(90,200,h01(ST.ev*3.3)),pal:PF,life:TB-t+2.4+h01(ST.ev),hot:.7,grow:.06,gain:1.3}); } }
    // embers lift off everything that burns (counted on the clock)
    if(t>TS+.3){ const want=Math.floor((t-TS-.3)*36*(GFX.QK||1)); let n=0;
      while(ST.emb<want&&n++<4){ ST.emb++; const late=t>TWALL, a=h01(ST.emb*1.1)*TAU, R=late?hw*1.4*Math.sqrt(h01(ST.emb*2.3)):RH*(.55+.6*h01(ST.emb*2.3));
        GFX.pt({x:x0+Math.cos(a)*R,y:y0+Math.sin(a)*R*FSY,z:10,vx:(h01(ST.emb*3.1)-.5)*80,vy:0,vz:150+h01(ST.emb*4.7)*420,g:-40,drag:.5,life:.7+h01(ST.emb*5.9)*.9,s:5+h01(ST.emb*6.1)*7,m:8,c:GFX.rgb(ST.emb%3?PF.m:PF.s),fade:'in',L:3}); } }
  });

  // ---- the summoning (0 - .8): he raises his own axe; the gate opens over and behind him, the axe is pushed out of it blade first
  mk('xRaise',{yaw:yawTo(PI/2+.35),blend:.12});
  const Cx=BK?x0+1050:(G.x+x0+Math.cos(TH0)*RH*.95)/2, Cy=BK?y0-640:(G.y-G.z+y0+Math.sin(TH0)*RH*.95*FSY-80)/2;
  GFX.ambient(.5,.4,.36,3); Cn.move({x:Cx,y:Cy+BODY*.2,zoom:BK?.8:1.12,tilt:.14,roll:-.02},.55,'io'); Cn.drone&&Cn.drone(38,.34);
  after(.05,()=>Cn.SND.inhale(.9,.5));
  const sg=K.sigil(x0,y0,{r:640,pal:PG,tex:'v3_circ_pyro',dur:TE1+.55,in:.4,out:.2,spin:.35,gain:.6}); sg.pal=PGR; sg.a=.7;
  GFX.add(TS+.25,(k,t)=>{ G.u=sat(t/.35); const open=eo3(sat(t/.3)), shut=t<TOUT?1:1-Math.pow(sat((t-TOUT)/.24),1.6); const kk=open*shut;
    if(kk>.01) gateDraw(G,t+(t>TOUT?3*(t-TOUT)*(t-TOUT):0),kk*(1+.05*Math.sin(t*9))); },0);
  GFX.light(G.x,G.y,1100,PF.l,.7,TOUT+.3,{z:G.z,hold:TOUT,flick:.15});
  [.22,.45,.68].forEach((tb,i)=>after(tb,()=>{ Cn.shake(.08+.05*i); sfx('boom',.25+.1*i,.25); }));
  after(TOUT,()=>Cn.hush(TS-TOUT,{a:.45}));
  after(TOUT+.24,()=>{ K.flare(G.x,G.y,G.z,{pal:PW,s:620,dur:.16,gain:2}); GFX.light(G.x,G.y,1300,PG.l,1.1,.3,{z:G.z}); sfx('boom',.7,.4); Cn.shake(.3);
    for(let i=0;i<22;i++){ const a=i/22*TAU+h01(i)*.3, e1=[-GN[1],GN[0]], v=500+700*h01(i*2.3), cz=Math.sin(a), cx=Math.cos(a);
      GFX.pt({x:G.x,y:G.y,z:G.z,vx:e1[0]*cx*v,vy:e1[1]*cx*v*FSY,vz:cz*v+300,g:1400,drag:.6,life:.7+.4*h01(i*3.1),s:9+9*h01(i*4.7),rot:a,vr:9*(h01(i*5.3)-.5),m:11,b:'alpha',c:GFX.rgb(i%3?'#e0a83a':'#fff0b0'),c2:'#4a2a08',L:3}); } });

  after(TOUT,()=>{ mk('xSpin',{yaw:yawTo(TH0-SG*PI/2),blend:.1}); Cn.move({x:x0,y:y0-140,zoom:.98,tilt:.22,roll:.06},TW-TOUT,'io'); Cn.SND.inhale(TS-TOUT,.7);
    K.cool(x0,y0+10,{kind:'crack2',r:380,rot:.7,pal:PF,life:TE1-TOUT+2.2,hot:.6,grow:TW-TOUT,light:0}); Cn.shake(.2);
    for(let i=0;i<14;i++){ const a=h01(i*1.3)*TAU, R=520+260*h01(i*2.1), sx=x0+Math.cos(a)*R, sy=y0+Math.sin(a)*R*FSY;
      GFX.pt({x:sx,y:sy,z:10,vx:(x0-sx)*2.4,vy:(y0-sy)*2.4,vz:40,g:0,drag:1.2,life:.4,s:80+60*h01(i*3.7),grow:-60,m:5,b:'alpha',c:GFX.rgb('#3a2c24'),c2:'#0a0706',c3:'#8a6448',er:.9,ns:1.1,w:1,a:.4,L:2}); }
    SFX.whoosh&&SFX.whoosh(.5,.5); });
  after(TW,()=>{ Cn.shake(.12); sfx('boom',.4,.2); });
  // ---- the first turn (TS - TE1): released all at once: one savage full turn round him in about half a second; he pivots with it, leaning in
  after(TS,()=>{ hitstop=Math.max(hitstop,.03); Cn.shake(.45);
    GFX.ambient(.7,.48,.4,8); Cn.move({x:x0,y:y0-60,zoom:.7,tilt:.15,roll:-.07},.22,'out'); after(.24,()=>Cn.move({x:x0,y:y0-80,zoom:.75,tilt:.17,roll:.05},TE1-TS-.24,'io'));
    SFX.whoosh&&SFX.whoosh(1.2,1.1); sfx('fire',1,.6); sfx('boom',.6,.3);
    // the blade passing each quarter of the circle lands like a blow
    [.25,.5,.75].forEach((q,i)=>after(Math.sqrt(q)*(TE1-TS),()=>{ hitstop=Math.max(hitstop,.018); Cn.shake(.3+.12*i); sfx('boom',.5+.2*i,.25); }));
    // every body is struck as the blade reaches it: thrown outward and up, burning
    for(const e of onScreen(300)){ let a=Math.atan2((e.y-y0)/FSY,e.x-x0), q=SG*(a-THW); q=((q%TAU)+TAU)%TAU; const fr=q/Math.abs(DTH);
      let lo=0, hi=1; for(let i=0;i<20;i++){ const m=(lo+hi)/2; if(ease(m)<fr) lo=m; else hi=m; } const tt=TS+lo*(TE1-TS)-clk();
      after(Math.max(0,tt),()=>{ if(e.dead) return; dmg(e,Math.min(Dm*.06,e.d.boss?Dm*.06:e.hp*.6),{sx:x0,sy:y0}); if(K.knock) K.knock(e,{from:[x0,y0],dist:420,up:1700,fx:0}); hitstop=Math.max(hitstop,.012); }); } });
  GFX.add(TD1-TOUT,()=>{ if(MKon()) MK.M.yaw=yawTo(ST.th-SG*PI/2); },TOUT);

  // ---- the rune circle (TRUNE): as the turn completes it stops with a jolt and a circle of gold runes bursts out from his feet across the
  // whole floor, two rings turning against each other, a gold bloom and its light on the floor; small flames of light stand at five points
  // of it. He lifts the axe to the sky
  const RC=hw*1.02, RW=RC*.6, TRE=BK?TB:TD0+.55;
  after(TE1,()=>{ hitstop=Math.max(hitstop,.07); Cn.shake(.8); sfx('boom',1.1,.5); K.shock&&K.shock(x0,y0,{r:2000,r0:400,dur:.5}); });
  after(TRUNE,()=>{ Cn.move({x:x0,y:y0-260,zoom:.72,tilt:.18,roll:.02},.55,'io'); GFX.ambient(.5,.42,.38,3); SFX.rise&&SFX.rise(.9,.4); Cn.SND.shing&&Cn.SND.shing(.9,.35);
    K.flare(x0,y0,40,{pal:PG,s:900,dur:.14,gain:2});
    ST.sg1=K.sigil(x0,y0,{r:RC,dur:TRE-TRUNE,in:.42,out:.5,spin:.1,tex:'fx_circle_arcane',pal:PGR,gain:.48}); ST.sg1.a=.6;
    ST.sg2=K.sigil(x0,y0,{r:RC*.42,dur:TRE-TRUNE-.15,in:.3,out:.45,spin:-.22,tex:'fx_circle_seal',pal:PGR,gain:.55,delay:.08}); ST.sg2.a=.6; });
  after(TE1+.06,()=>mk('xRaise',{yaw:yawTo(THB-SG*PI/2),blend:.14}));
  GFX.add(TRE-TRUNE,(k,t)=>{ if(ST.dead||!F.on) return; const m=K.mats(), D=TRE-TRUNE, i=eo3(sat(t/.42)), f=sat((t-(D-.5))/.5), a=i*(1-f)*(.85+.15*Math.sin(t*6)), rr=RC*(.3+.7*i);
    F.quad(m.glowG,x0,y0,rr*1.15,rr*1.15,0,{...col(QF),a:.34*a,gain:1}); F.quad(m.glowG,x0,y0,RC*.5,RC*.5,0,{...col(PG),a:.22*a,gain:1.1}); },TRUNE);
  { const RL=[0,1].map(j=>{ const a=j*PI+.4; return GFX.light(x0+Math.cos(a)*RC*.5,y0+Math.sin(a)*RC*.5*FSY,RC*.9,PG.l,0,.1,{z:150,hold:TRE}); });
    GFX.add(TRE,(k,t)=>{ const D=TRE-TRUNE, u=t-TRUNE, a=u<0?0:eo3(sat(u/.42))*(1-sat((u-(D-.5))/.5)); for(const L of RL) L.a=.5*a; if(k>=.99) for(const L of RL) L.hold=0; }); }
  [[.14,.2],[.18,1.5],[.25,2.75],[.21,4.0],[.29,5.2]].forEach(([dl,a])=>after(TRUNE+dl,()=>{ const r=RC*.44, x=x0+Math.cos(a)*r, y=y0+Math.sin(a)*r*FSY;
    K.vcolumn(x,y,{r:50+40*h01(a*3.1),h:380+360*h01(a*5.7),dur:.7+.3*h01(a*2.3),rise:.14,out:.4,pal:QF,twist:3,turb:.8,heat:1.1,taper:.35+.2*h01(a),gain:.85,band:1,btop:.62}); K.flare(x,y,30,{pal:QF,s:170,dur:.12,gain:1.6}); sfx('slash',1.6,.25); }));

  // ---- the walls (TWALL): tall tongues of real fire round the circle (tall behind him, low in front so he stays in sight), each with a
  // burning foot and dark smoke behind it; white-gold shafts of light fall from above the screen, the thickest onto the lifted axe;
  // everyone on the field is thrown up
  const WL=[[196,1500,.06],[226,2200,.0],[258,2800,.1],[292,2400,.03],[324,1900,.12],[352,1300,.16],[160,1100,.2],[84,560,.22]];
  after(TWALL,()=>{ Cn.move({x:x0,y:y0-700,zoom:.62,tilt:.2,roll:-.02},.6,'out'); GFX.ambient(.72,.46,.36,2); SFX.fire&&SFX.fire(1.6,.6); sfx('boom',1.2,.6); Cn.shake(.5); if(ST.sg1&&ST.sg1.kick) ST.sg1.kick(); if(ST.sg2&&ST.sg2.kick) ST.sg2.kick(); });
  WL.forEach(([deg,h,dl],i)=>after(TWALL+dl,()=>{ const a=deg*PI/180, x=x0+Math.cos(a)*RW, y=y0+Math.sin(a)*RW*FSY, dur=TD0+.5-TWALL-dl+.25*h01(i*3.3);
    fireCard(x,y,h,dur,{rise:.22,hold:.62,wide:.95,gain:2.6,flip:i%2===1,light:i%3===0});
    if(h>1400) K.vsmoke(x+40,y-60,{s:420,z:h*.55,dur:dur+.4,rise:700,a:.7,c:'#120e0c',c2:'#3e322c',delay:.15});
    K.flare(x,y,40,{pal:PG,s:300,dur:.14,gain:2}); K.dust(x,y,{n:7,r:220,sp:[200,700],a:.45}); K.sparks(x,y,60,{pal:QF,n:12,sp:[200,800],up:2400,life:[.4,1]}); }));
  after(TWALL+.1,()=>{ shaft(ST.hx,ST.hy,150,.75,0,{br:1}); });
  [[305,.17,110,.8,0,.42],[236,.24,84,.85,0,.52],[222,.3,26,.9,23,.5],[275,.09,18,1,31,.3],[330,.36,22,.8,27,.56],[205,.12,14,.7,37,.62]].forEach(([deg,dl,w,br,fk,rr])=>{ const a=deg*PI/180; shaft(x0+Math.cos(a)*RW*rr,y0+Math.sin(a)*RW*rr*FSY,w,fk?.6:.8,TWALL+.12+dl,{br,flick:fk}); });
  after(TWALL+.12,()=>{ for(const e of onScreen(300)){ if(e.dead) continue; dmg(e,Dm*.06,{push:120,up:1600,sx:x0,sy:y0}); K.mark&&K.mark(e,'burn',{dur:2.2,pal:QF}); } });

  // ---- the second turn (TD0 - TD1): he whips the white-hot axe down off the sky and round once more, and a dragon of fire runs out ahead of
  // its blade: horned head, burning eyes, a thick body trailing back along the arc through the axe, dark smoke torn off behind it. It
  // circles the whole field with the blade, then climbs away as the axe is hauled up
  const RD=RH*1.0, SEGA=.3, ND=9, WD=(TH2-A0)*1.7/(TD1-TD0), dhit=new Set(), PGF={d:'#3a1404',b:'#d8701a',m:'#ffc24a',h:'#fff4d8'};
  const dang=t=>(t<TD1?thAt(t):TH2+WD*.8*(1-Math.exp(-(t-TD1)*3))/3)+.55*sat((t-TD0)/.22);
  const dpos=(a,t,j)=>{ const u=Math.max(0,t-TD1-j*.022), up=u*u*9000; return arcP(a,RD*(1+.05*Math.sin(a*3.1))*(1-sat(u/.4)*.25),270+90*Math.sin(a*2.6)+up); };
  after(TD0,()=>{ mk('xSpin',{yaw:yawTo(THB-SG*PI/2),blend:.08}); Cn.move({x:x0,y:y0-170,zoom:.64,tilt:.13,roll:.03},TD1-TD0,'io'); GFX.ambient(.66,.46,.38,3);
    SFX.roar&&SFX.roar(1.3,.9); SFX.whoosh&&SFX.whoosh(1.1,1); sfx('fire',1.1,.6); Cn.shake(.4); hitstop=Math.max(hitstop,.03);
    [.3,.55,.8].forEach((q,i)=>after(q*(TD1-TD0),()=>{ Cn.shake(.3+.1*i); sfx('boom',.5+.15*i,.25); })); });
  GFX.add(TB-TD0,(k,t)=>{ if(ST.dead) return; const tc=TD0+t, ah=dang(tc), fin=1-sat((tc-TD1-.16)/.18), born=sat((ah-A0-.25)/.5), sd=21.7, N=ND, m=K.mats(), S=smt();
    if(born<=0||fin<=0) return;
    const P=[]; for(let j=0;j<=N;j++) P.push(dpos(Math.max(A0,ah-j*SEGA*born),tc,j));
    const rad=q=>mix(400,90,Math.pow(q,1.1))*(1+.28*Math.sin(q*13-t*9)+.12*Math.sin(q*29+t*5))*(q<.12?.75+2*q:1)*(.35+.65*fin)*(.5+.5*born);
    // the body, tail first; each piece runs well past the next so they melt into one body
    for(let j=N-1;j>=0;j--){ const q=j/N, b=lerp3(P[j],P[j+1],1.6);
      jetSeg(lerp3(P[j],P[j+1],-.25),b,rad(q),rad((j+1)/N),{pal:PGF,heat:mix(1.5,.3,Math.pow(q,.85)),turb:.6+.6*q,smoke:mix(.08,.95,q*q),cS:'#160c08',cK:'#6a5048',dens:10,gain:1.45,speed:9,seed:sd+j,band:.2,lit:.4,flow:1.2}); }
    // a soft glowing body hides the joins
    const body=[]; for(let j=0;j<N*2;j++){ const jj=j/2, i0=Math.floor(jj), p=lerp3(P[i0],P[Math.min(N,i0+1)],jj-i0); body.push({...W3(p),q:jj/N}); }
    F.ribbon(S.body,body.slice(0,N*2-5).map(p=>({...p,w:rad(p.q)*1.2})),{...col(PE),a:.35*fin,gain:1.3});
    // a flame mane along the neck and back: tongues thrown up and back, each its own size
    for(let j=1;j<4;j++){ const q=P[j], g=nrm(sub(P[j-1],P[j])), h2=(260-40*j)*(1+.3*Math.sin(t*14+j*2))*(.4+.6*fin)*born; jetSeg(add(q,[0,0,rad(j/N)*.5]),add(add(q,scl(g,-h2*.8)),[0,0,h2*1.3]),rad(j/N)*.45,16,{pal:QF,heat:1.3,turb:1.2,smoke:.15,dens:9,gain:1.3,speed:6,seed:sd+40+j,band:.5,btop:.7}); }
    // the head: a skull, a long muzzle, the open jaw, two horns swept back, a crest of flame, two burning eyes
    const H=P[0], f=nrm(sub(P[0],P[1])), sdv=nrm(crs(f,[0,0,1])), upv=nrm(crs(sdv,f)), hs=(.4+.6*fin)*(.06+.94*born)*1.3;
    vol('blast',H[0],H[1]*FSY,H[2],{ex:480*hs,ey:400*hs,ez:360*hs,pa:[.6,.45,2.6,t*.8],pb:[1.5,1.2,1,.6],dens:12,gain:1.5,seed:sd+30,smoke:.08,fire:.6,...col(PG),cS:QF.d,cK:'#8a5a40',amb:.1,key:1.2,rim:.3,glow:.8,band:.25});
    jetSeg(add(H,scl(f,120*hs)),add(add(H,scl(f,820*hs)),scl(upv,40*hs)),230*hs,120*hs,{pal:PW,heat:1.5,turb:.7,smoke:.04,dens:11,gain:1.4,speed:8,seed:sd+31});
    jetSeg(add(H,add(scl(f,100*hs),scl(upv,-130*hs))),add(H,add(scl(f,640*hs),scl(upv,-420*hs))),150*hs,60*hs,{pal:QF,heat:1.3,turb:.5,smoke:.1,dens:10,gain:1.3,speed:8,seed:sd+32});
    for(const s2 of [-1,1]) jetSeg(add(H,add(scl(sdv,s2*150*hs),scl(upv,170*hs))),add(H,add(add(scl(f,-560*hs),scl(sdv,s2*340*hs)),scl(upv,330*hs))),80*hs,16*hs,{pal:PGF,heat:1.2,turb:1.1,smoke:.1,dens:9,gain:1.15,speed:7,seed:sd+33+s2,band:.4});
    jetSeg(add(H,add(scl(f,-150*hs),scl(upv,220*hs))),add(H,add(scl(f,-700*hs),scl(upv,520*hs))),200*hs,50*hs,{pal:PE,heat:1.1,turb:1.1,smoke:.2,dens:9,gain:1.2,speed:7,seed:sd+36});
    for(const s2 of [-1,1]){ const e=add(H,add(add(scl(f,250*hs),scl(sdv,s2*130*hs)),scl(upv,150*hs))); F.bill(m.glowO,e[0],e[1]*FSY,e[2],80*hs,30*hs,0,{...col(PW),a:fin,gain:3.6}); }
    GFX.light(H[0],H[1]*FSY,1400,QF.l,1.1*fin,.04,{z:H[2]});
    // dark smoke rolls off the body and stays hanging where it passed; the floor under it is left scorched; burning scales fall off it
    if(t-(ST.vs||0)>.085&&tc<TD1){ ST.vs=t; const q=P[N-2], hq=P[0]; K.cool(hq[0],hq[1]*FSY,{kind:'scorch',r:420,rot:rand(0,TAU),pal:QF,life:TB-tc+2.6,hot:.75,light:0});
      if((ST.sc=(ST.sc||0)+1)%2===0) K.vsmoke(q[0],q[1]*FSY,{s:380,z:Math.max(0,q[2]-200),dur:.9,rise:380,a:.8,c:'#100c0a',c2:'#3e322c'}); }
    for(let i=0;i<3;i++){ const q=P[1+((Math.random()*(N-2))|0)]; GFX.pt({x:q[0]+rand(-80,80),y:q[1]*FSY,z:q[2],vx:rand(-300,300),vy:rand(-150,150),vz:rand(-50,300),g:1200,drag:.8,life:rand(.35,.7),s:rand(4,8),m:3,len:.05,c:GFX.rgb(i?QF.s:PG.h),c2:QF.b,L:3}); }
    // whoever the head passes is struck, thrown outward and set burning
    for(const e of onScreen(300)){ if(dhit.has(e)||e.dead) continue; let q=Math.atan2((e.y-y0)/FSY,e.x-x0)-A0; q=((q%TAU)+TAU)%TAU; if(ah-A0>=q){ dhit.add(e); dmg(e,Dm*.08,{push:300,up:1300,sx:x0,sy:y0}); if(dhit.size<5&&K.ehit) K.ehit(e,{pal:QF,pw:1.2,ring:0}); K.mark&&K.mark(e,'burn',{dur:2,pal:QF}); } } },TD0);

  // ---- the haul and the blow (TD1 - TB): the turn ends with a jolt, the axe is wrenched up, cracks of light run through it, and it comes
  // down behind one huge white-gold crescent
  after(TD1,()=>{ hitstop=Math.max(hitstop,.08); Cn.shake(.9); sfx('boom',1.1,.5); mk('xChop',{yaw:yawTo(0),blend:.04,speed:.8}); Cn.move({x:x0+260,y:y0-520,zoom:.64,tilt:.15,roll:0},TB-TD1,'out'); Cn.SND.inhale(TB-TD1,.6); });
  if(BK) after(TCON,()=>{ const [bx,by]=BP; hitstop=Math.max(hitstop,.07); Cn.shake(1.1); Cn.SND.hit(.7); sfx('boom',1.4,.7);
    K.cool(bx,by,{kind:'crack2',r:1300,ry:900,rot:.2,pal:PF,life:TEND-TCON,grow:.18,hot:.85,light:0}); K.dust(bx,by,{n:12,r:500,sp:[300,1100],a:.5});
    K.sparks(bx,by,60,{pal:PW,n:26,sp:[600,2200],up:1800,life:[.3,.8]}); GFX.light(bx,by,1600,PW.l,1.,.2,{z:150}); });
  if(!BK) after(TB-.09,()=>{ hitstop=Math.max(hitstop,.05); if(ST.M) for(let i=0;i<4;i++){ const [px,py,pz]=wpt(ST.M,(h01(i*7.7)-.5)*.5,-.25+.5*i); K.flare(px,py,pz,{pal:PW,s:260+120*h01(i),dur:.14,gain:2.4}); }
    if(ST.M){ const [px,py,pz]=wpt(ST.M,0,0); GFX.light(px,py,1500,PW.l,1.1,.2,{z:pz}); } sfx('boom',.8,.3); SFX.whoosh&&SFX.whoosh(1.3,1.2); });
  after(TB,()=>{ const [bx,by]=BP, W=hw/.6, Hh=hh/.6;
    // the axe itself bursts: its cracks blow open and it comes apart in burning pieces of gold pole and ivory blade
    if(ST.M&&!BK){ const M=ST.M; for(let i=0;i<5;i++){ const [px,py]=wpt(M,0,1.6-.38*i); K.chunks(px,py,{n:2,r:60,sp:[400,1100],up:1300,kind:'shard',s:[50,100],rock:'#c8902e',pal:PF,life:1.3,detail:1,glow:.8}); }
      K.chunks(bx,by,{n:4,r:140,sp:[450,1200],up:1600,kind:'flag',s:[90,160],rock:'#d8d0bc',pal:PF,life:1.4,detail:1,glow:.8}); }
    // the first two frames: a near-white core over everything; the camera kicked back
    Cn.peak(bx,by,{ca:BK?0:.035,blur:BK?.08:.18,tint:'#fff0d0',a:BK?.2:.38,hold:.035,out:BK?.25:.35}); hitstop=Math.max(hitstop,.12); Cn.shake(1.7); Cn.SND.hit(1); sfx('boom',2.6,1.2);
    K.flare(bx,by,160,{pal:PW,s:BK?1700:3200,dur:.035,gain:2}); K.flare(x0,y0,120,{pal:PW,s:2200,dur:.035,gain:1.6});
    GFX.light(bx,by,hw*1.6,PF.l,1.2,.6,{z:350}); GFX.light(x0,y0+300,hw*1.3,PW.l,.9,.35,{z:300}); GFX.ambient(BK?.78:.95,BK?.56:.62,BK?.44:.48,8); after(.25,()=>GFX.ambient(.6,.44,.38,2));
    Cn.move({x:x0+320,y:y0-300,zoom:.58,tilt:.14,roll:.025},.22,'out'); after(.45,()=>Cn.move({x:x0+120,y:y0-260,zoom:.64,tilt:.1,roll:0},1.4,'io'));
    // fire over the whole screen inside a quarter second: one colossal fireball at the blow and four more bursting outward across the field
    K.vblast(bx,by,{s:BK?760:1250,pal:QF,dur:2,smoke:.3,fire:.6,rise:900,band:.7,lit:.5,c:'#241610',c2:'#6a4632'});
    if(!BK) [[-.62,.15],[.62,.1],[-.38,.75],[.4,.8]].forEach(([fx,fy],i)=>{ const px=x0+fx*W, py=y0+fy*Hh-200; K.vblast(px,py,{s:mix(460,860,h01(i*3.3)),pal:QF,dur:1.1+.5*h01(i*1.9),smoke:.22,fire:.42,rise:500,band:.7,lit:.5,c:'#241610',c2:'#6a4632',delay:.04+.035*i}); });
    // then a thick wall of smoke and fire rolling out past the edges of the screen
    K.vring(bx,by,{r:W*1.5,r0:700,dur:.8,heat:.9,pal:QF,tube:.12,a:.6,smoke:.3});
    if(!BK) K.vring(x0,y0,{r:W*2,r0:500,dur:1.2,tube:.1,a:.4,c:'#1a100c',c2:'#4e3428',delay:.08});
    K.sparks(bx,by,200,{pal:PW,n:30,sp:[800,2800],up:2600,life:[.4,1.1],len:.08});
    for(let i=0;i<26;i++){ const an=h01(i*1.7)*TAU, v=600+1400*h01(i*2.9); GFX.pt({x:bx,y:by,z:20,vx:Math.cos(an)*v,vy:Math.sin(an)*v*FSY,vz:700+1200*h01(i*4.1),g:2600,drag:.3,life:.8+.4*h01(i),s:8+10*h01(i*5.5),rot:an,vr:4,m:11,b:'alpha',c:GFX.rgb('#3a2c24'),c2:'#0c0806',L:1}); }
    // the whole floor is left burnt: a crater at the blow, lava cracks and scorch across the screen, cooling white -> orange -> dark
    if(BK) [.9,2.3,3.4,4.6].forEach((a,i)=>K.cool(bx+Math.cos(a)*520,by+Math.sin(a)*520*FSY,{kind:i%2?'crack':'crack2',r:700,ry:260,rot:a,pal:PF,life:TEND-TB+.3,hot:.9,grow:.15,light:0}));
    if(!BK) K.cool(x0,y0,{kind:'scorch',r:W*1.25,ry:W*1.25,pal:QF,life:3.6,hot:.6,start:.1,light:0,gain:1.1});
    K.cool(bx,by,{kind:'crater',r:700,pal:PF,life:3.4,light:0}); K.cool(bx,by,{kind:'crack2',r:1500,ry:1000,pal:PF,life:3.4,grow:.22,light:0});
    const KD=['lava','crack2','scorch','crack','lava','crack2','scorch','crack'];
    if(!BK) [[-.7,-.35],[.68,-.4],[-.75,.4],[.75,.45],[-.25,.8],[.3,.78],[-.45,-.05],[.45,.05]].forEach(([fx,fy],i)=>K.cool(x0+fx*W*.9,y0+fy*Hh*.9-150,{kind:KD[i],r:mix(480,820,h01(i*2.9)),ry:mix(300,520,h01(i*4.1)),rot:h01(i*6.3)*TAU,pal:PF,life:3.3+.4*h01(i),hot:.75,grow:.18+.03*i,light:0,gain:1.2}));
    { const L=onScreen(300); L.forEach(e=>{ if(K.knock) K.knock(e,{from:[bx,by],dist:650,up:2200,fx:0}); }); L.sort((p,q)=>Math.hypot(p.x-bx,p.y-by)-Math.hypot(q.x-bx,q.y-by)).slice(0,2).forEach(e=>K.ehit&&K.ehit(e,{pal:PF,pw:1.6,ring:0})); }
    after(.06,()=>Cn.shake(1.2)); after(.15,()=>Cn.shake(.9));
    after(.3,()=>Cn.sweep(bx,by,Dm*.8,{speed:5200,push:1.3,max:.35}));
    // the whole floor burns: real flames of every size across the screen as the fireballs thin, a few tall, each burning down at its own pace
    { const FP=[]; for(let i=0;i<8;i++){ const px=x0+(h01(i*3.1+.7)-.5)*W*1.7, py=y0-Hh*.75+h01(i*5.7+.3)*Hh*1.5, big=i%5===0; FP.push([px,py,big?760+300*h01(i*2.9):220+420*h01(i*2.9)]); }
      for(const [fx,fy,r,h] of [[.36,.1,210,620],[.5,-.08,130,360],[.24,.3,170,880],[-.3,-.2,150,420]]) FP.push([x0+fx*W*.8,y0+fy*Hh*.8,h]);
      // (kit update 13) one fire: it catches where the blow landed and runs out, joined at the foot, then breaks up and burns down from the far edge inward
      if(!BK) K.firefield(bx,by,{pts:FP,from:[bx,by],speed:3600,dur:2.3,out:1.2,pal:QF,keep:[x0,y0,260],smoke:0,delay:.5}); }
    // smoke climbing out of the burnt field, each column its own size, speed, drift and length, thinning as it spreads
    // (round 3, BK) one column of smoke out of the blow, nothing else left burning across the field
    if(BK) K.vsmoke(bx,by,{s:620,z:200,dur:1.3,rise:1300,a:.3,c:'#1c120e',c2:'#5a3a2a',delay:.25,lit:.4});
    if(!BK) [[-.5,.1,520,1100,-110,2.2],[.55,-.15,760,1800,50,2.6],[.1,-.55,640,1400,-30,2.4],[-.15,.6,900,2100,80,2.6],[.62,.5,460,900,-140,2]].forEach(([fx,fy,sz,ri,vx,du],i)=>
      K.vsmoke(x0+fx*W*.8,y0+fy*Hh*.8,{s:sz,z:200+80*i,dur:du,rise:ri,a:.26+.04*(i%3),c:'#1c120e',c2:'#5a3a2a',vx,delay:.6+.5*h01(i*4.3),lit:.4}));
    // fires left burning at a few cracks: different sizes, and they go out one by one
    });
  // the ring the turns burnt into the floor, glowing red at first and cooling
  after(TE1,()=>K.cool(x0,y0,{kind:'ring',r:RH*1.14,pal:PF,life:TEND-TE1,hot:.7,grow:.1,light:0,gain:1.2}));
  // ---- what is left: he stands up with his axe raised over the burnt field
  after(TB+1.1,()=>{ mk('xRaise',{yaw:yawTo(PI/2),blend:.2}); K.flare(x0,y0,BODY*.7,{pal:PW,s:260,dur:.2,gain:2}); });
  after(TEND-.9,()=>{ Cn.back(.85); GFX.ambient(1,1,1,2); });
  after(TEND,finish); }

// axe(M,pa): the same lit 3D axe for other skills (M model matrix: z = the pole from the head (0) to the pommel, x = the way the edge faces; pa [alpha, heat, edge glow, dissolve])
window.AxeUlt3={cast,axe:(M,pa)=>{ if(!init()) return false; submit({M,pa}); return true; }};
})();

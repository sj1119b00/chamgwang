// A single self-shadowing soot volume, attached to the arena floor.
'use strict';
(() => {
  const depth=.58, tau=Math.PI*2;
  const clamp01=v=>Math.max(0,Math.min(1,v));
  function ease(a,b,v) {
    const u=clamp01((v-a)/(b-a)); return u*u*(3-2*u);
  }
  const vertex=`
    attribute vec2 p;
    uniform vec3 anchor;
    uniform vec4 camera;
    uniform vec2 halfSize;
    varying vec2 screen;
    void main(){
      // The world volume spans the view. Reconstruct where each screen ray
      // meets the floor even when the camera pans, rolls or changes zoom.
      vec2 px=vec2(p.x,-p.y)*halfSize/camera.z;
      float sn=sin(camera.w),cs=cos(camera.w);
      vec2 w=vec2(cs*px.x+sn*px.y,-sn*px.x+cs*px.y)-camera.xy;
      screen=(w-anchor.xy)*vec2(1.,-1.)/anchor.z;
      gl_Position=vec4(p,0.,1.);
    }`;
  const fragment=`
    precision highp float;
    /* FLOW_VOLUME */
    varying vec2 screen;
    uniform sampler2D fieldNoise,sceneMask;
    uniform vec2 invTarget,frontScale;
    uniform vec4 state;
    uniform vec4 cutA[8],cutB[8],lamp[2],wake[2];
    uniform vec4 actors[8],groundFlash,holes[6];
    uniform vec3 lampRGB[2],lampTail[2],groundColor;
    uniform float steps;
    float noise3(vec3 p){
      vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      // The shared atlas is uploaded bottom-up. Its G channel equals the R
      // channel at (+37,-17), the first voxel of the next height slice.
      vec2 uv=i.xy+vec2(37.,-17.)*i.z+f.xy;
      vec2 n=texture2D(fieldNoise,(uv+.5)/256.).rg;
      return mix(n.r,n.g,f.z);
    }
    vec3 flow(vec3 w){
      // Roll an inclined sheet into a vortex tube. Its ends lose coherence in air.
      float direction=.42+.47*sin(2.7*w.x+1.6*w.y+.38*state.x)+.21*cos(3.1*w.y-.34*state.x);
      vec2 axis=vec2(cos(direction),sin(direction)), across=vec2(-axis.y,axis.x);
      float along=dot(w.xy,axis);
      vec2 yz=vec2(dot(w.xy,across)-.13*sin(3.4*along-.43*state.x),w.z-.132);
      float a=2.95*exp(-dot(yz,yz)*24.)*(.52+.28*sin(3.2*along+state.x*.54));
      float c=cos(a),s=sin(a);
      vec2 turn=vec2(c*yz.x-s*yz.y,s*yz.x+c*yz.y)-yz;
      w.xy+=across*turn.x;w.z+=turn.y;
      float boil=sin(along*6.3+state.x*.69)*cos(dot(w.xy,across)*7.4-state.x*.58);
      w.z-=.046*boil*exp(-18.*(w.z-.19)*(w.z-.19));
      for(int j=0;j<2;j++){
        vec4 h=wake[j];if(h.w<=0.)continue;
        vec2 n=vec2(-h.y,h.x);
        float alongCut=dot(w.xy,h.xy)-h.z;
        float acrossCut=dot(w.xy,n);
        float jet=h.w*exp(-alongCut*alongCut*17.-acrossCut*acrossCut*5.-w.z*w.z*13.);
        w.xy-=h.xy*jet*.11+n*jet*.06;
        w.z-=jet*.065;
      }
      return w;
    }
    // The simulated plume supplies the large structures. Only the unresolved
    // grain is synthesized here; strokes can displace this field in world space.
    float front(vec2 xy){
      float distance=length(xy*frontScale);
      float reach=.27+2.76*smoothstep(.04,1.03,state.x);
      return 1.-smoothstep(reach-.34,reach+.07,distance);
    }
    float bankWeight(vec3 p,float center){
      // A pair of ground-hugging draughts combs channels through the new
      // peripheral banks. The overhead portion still catches the rim light.
      float a=p.y-(.57+.34*sin(2.4*p.x+.55*state.x));
      float b=p.y-(-.37+.28*sin(2.8*p.x-.60*state.x));
      float channel=max(exp(-a*a*13.-p.x*p.x*.56),.76*exp(-b*b*20.-(p.x-.23)*(p.x-.23)*1.15));
      return (.10+.94*(1.-center))*(1.-.81*channel*(1.-smoothstep(.11,.38,p.z)));
    }
    // Reuse the resolved fluid folds at their native scale across the arena.
    // Folding continuous coordinates keeps neighbouring banks joined. The
    // transverse current breaks up their alignment as they reach the sidelines.
    vec3 outerBank(vec3 p,bool detail,float wool){
      vec2 v=vec2(.89*p.x+.46*p.y,-.46*p.x+.89*p.y);
      v+=vec2(.30*sin(p.y*1.35+state.x*.32)+.11*sin(2.7*p.x),
              .33*sin(p.x*1.16-state.x*.29)+.12*sin(p.y*2.22));
      vec2 folded=abs(fract(v/vec2(2.58,1.97)+vec2(.16,.34))*2.-1.);
      vec2 local=(folded-.5)*vec2(1.67,1.15);
      float roll=noise3(vec3(v*.99,state.x*.19)+17.4);
      float ceiling=.136+.235*roll;
      float bed=(.11+.31*roll)*(.58+.55*wool)*(1.-smoothstep(ceiling*.47,ceiling+.054,p.z));
      // Soot settles below the moving folds and blocks the view of the stone
      // even in the draughts. The top of the deposited layer follows the flow.
      float settledTop=.116+.093*roll+.024*(wool-.5);
      float settled=(.72+.38*roll)*(1.-smoothstep(settledTop*.43,settledTop+.027,p.z));
      float soot=0.;
      if(p.z<.59){
        if(flowFrame.z>.5){
          float phase=min(54.95,13.+.71*(flowFrame.x+flowFrame.y)+5.*roll);
          soot=smokeVoxelAt(vec3(local,clamp(p.z*(.85+.39*roll),.006,.68)),phase);
        }else soot=smoothstep(.33,.75,wool*.64+roll*.36)*(1.-smoothstep(ceiling*.5,ceiling+.18,p.z));
      }
      float weight=detail ? .62+.63*wool : .95;
      return vec3(bed+soot*weight,.22+.16*roll+.12*soot,settled);
    }
    vec2 simulated(vec3 w,bool detail){
      vec3 p=w;
      for(int j=0;j<2;j++){
        vec4 h=wake[j]; if(h.w<=0.)continue;
        vec2 n=vec2(-h.y,h.x);
        float along=dot(p.xy,h.xy)-h.z,across=dot(p.xy,n);
        float air=h.w*exp(-along*along*28.-across*across*8.-p.z*p.z*15.);
        p.xy-=air*(h.xy*.08+n*.04);p.z=max(.001,p.z-air*.040);
      }
      vec3 uv=p*vec3(8.7,9.3,13.6)+vec3(-.32,-.11,-.46)*state.x;
      float wool=noise3(uv+vec3(8.1,2.7,3.4));
      if(detail){
        float crosswind=noise3(uv*.69+vec3(-3.0,4.2,7.1));
        p.xy+=vec2(wool-.5,crosswind-.5)*.051;
        p.z+=(wool-crosswind)*.032;
      }
      float center=1.-smoothstep(.51,1.47,length(p.xy*vec2(.93,1.1)));
      float soot=center>.001?smokeVoxel(p):0.;
      vec3 bank=outerBank(p,detail,wool);
      float modulation=.79+.39*wool;
      if(detail){
        float fine=noise3(uv*2.63+vec3(wool*1.6,1.4,-state.x*.24));
        float billow=smoothstep(.25,.75,.48*wool+.52*fine);
        modulation*=mix(.35,1.37,billow);
        modulation+=.15*(noise3(uv*5.2+fine)-.5);
      }
      float edge=bankWeight(w,center)*(1.-.60*min(1.,soot));
      return vec2(soot*modulation+(bank.x*edge+bank.z)*front(w.xy),mix(bank.y,.23+.14*wool+.12*soot,center));
    }
    vec2 field(vec3 w,bool detail){
      if(flowFrame.z>.5)return simulated(w,detail);
      float time=state.x, r=state.y;
      vec2 xy=w.xy/vec2(r*1.24,r*.89);
      float radial=dot(xy,xy);
      if(w.z<0.||w.z>.69)return vec2(0.);
      float wool=noise3(w*vec3(8.7,9.3,13.6)+vec3(8.1-.32*time,2.7-.11*time,3.4-.46*time));
      vec3 bank=outerBank(w,detail,wool);
      float center=1.-smoothstep(.51,1.47,length(w.xy*vec2(.93,1.1)));
      bank.xz*=front(w.xy);
      bank.x*=bankWeight(w,center);
      if(radial>1.65)return vec2(bank.x+bank.z,bank.y);
      vec3 advected=flow(w);
      vec3 uv=advected*vec3(3.6,3.5,5.45);
      uv+=vec3(-.32,.085,-.29)*time+vec3(8.7,4.2,1.7);
      vec2 wind=vec2(noise3(uv*.72+2.8),noise3(uv*.69-3.9))-.5;
      uv.xy+=wind*1.70;
      uv.z+=wind.x*.79;
      float big=noise3(uv), curl=noise3(uv*2.04+vec3(.6,7.2,4.3));
      float loft=smoothstep(.46,.79,big*.72+curl*.28);
      float crest=.068+.092*big+.089*curl+.126*loft;
      if(w.z>crest+.095) return vec2(bank.x+bank.z,bank.y);
      float base=(big-.48)*1.02+(curl-.48)*.51;
      float thin=0.;
      if(detail){
        float small=noise3(uv*4.21+vec3(-2.3,.8,time*.22));
        float grain=noise3(uv*8.7+vec3(4.7,-3.2,time*.39));
        base+=(small-.5)*.25+(grain-.5)*.095;
        // Turbulent entrainment stretches isolated veneers above the heavier body.
        float ridge=1.-abs(2.*(curl*.61+small*.39)-1.);
        thin=smoothstep(.82,.98,ridge)*smoothstep(.46,.72,big)*(.30+.70*grain);
      }
      float inner=1.-smoothstep(.26,1.13,radial-base*.98);
      float strata=1.-smoothstep(crest-.072,crest+.057,w.z);
      float d=inner*strata*smoothstep(-.042,.19,base+.012);
      d+=.36*thin*inner*(1.-smoothstep(.025,.089,abs(w.z-crest+.016)));
      return vec2(d+bank.x*(1.-.60*min(1.,d))+bank.z,max(bank.y,crest));
    }
    // Soot gathers into heavy banks with clear gaps between them, so the floor and
    // the knives read through the holes. state.w is the radius already blown open
    // by the closing gust; the displaced soot piles up just outside it.
    float clumps(vec3 w){
      vec3 q=vec3(w.xy*vec2(2.3,2.9)+vec2(.13,-.06)*state.x,w.z*1.6+.07*state.x);
      float n=noise3(q+vec3(31.7,12.3,5.9))*.68+noise3(q*2.3+vec3(-4.1,9.2,2.2))*.32;
      float k=mix(.03,1.95,smoothstep(.42,.63,n));
      float open=state.w;
      if(open>0.){
        float r=length(w.xy*vec2(1.,1.45)), pile=(r-open-.28)/.16;
        k*=smoothstep(open-.06,open+.32,r)*(1.+1.4*exp(-pile*pile));
      }
      return k;
    }
    void main(){
      // The sightline intersects the ground, then rises towards the viewer.
      float y0=-screen.y/.58;
      float low=0.,high=flowFrame.z>.5?.64:.55;
      // Geometry is drawn to the scene texture before the volume. Stop at an
      // actual opaque body pixel, keeping only the fog between it and the eye.
      float sceneAlpha=texture2D(sceneMask,gl_FragCoord.xy*invTarget).a;
      float bodyZ=0.;
      if(sceneAlpha>.12)for(int j=0;j<8;j++){
        vec4 e=actors[j]; if(e.w<=0.)continue;
        float z=e.y+screen.y;
        if(abs(screen.x-e.x)<e.w*.69&&z>=e.z-.008&&z<=e.z+e.w*1.15)
          bodyZ=max(bodyZ,z*smoothstep(.12,.84,sceneAlpha));
      }
      low=max(low,bodyZ);if(high<=low)discard;
      float dz=(high-low)/steps;
      float jitter=texture2D(fieldNoise,(gl_FragCoord.xy+.5)/256.).b;
      float T=1.;
      vec3 radiance=vec3(0.);
      // Banks crowd the edges of the frame. The middle stays a dark, thin veil
      // so the silver steel and its wakes keep their contrast.
      vec2 sc=(gl_FragCoord.xy*invTarget-.5)*vec2(1.3,1.);
      float vig=smoothstep(.04,.62,length(sc));
      for(int i=0;i<32;++i){
        if(float(i)>=steps||T<.025) break;
        float z=high-(float(i)+.025+.95*fract(jitter+float(i)*.618034))*dz;
        vec3 w=vec3(screen.x,y0+z/.58,z);
        vec2 f=field(w,true);
        float ck=clumps(w);
        // Smoke is combed into long streaks that follow the vortex, dense near
        // the floor and torn into wisps above the blades.
        float rr=length(w.xy), aa=atan(w.y,w.x)-state.x*.35;
        float streak=noise3(vec3(rr*13.+.8*sin(3.*aa+state.x*.5)-state.x*.6,cos(aa)*1.4,sin(aa)*1.4+w.z*4.));
        float layer=mix(1.32,.5,smoothstep(.05,.3,w.z));
        float density=f.x*ck*layer*(.38+1.15*smoothstep(.32,.68,streak))*mix(.4,1.,vig), slit=0., rim=0., pulse=0.;
        for(int j=0;j<6;j++){
          vec4 h=holes[j]; if(h.w<=0.)continue;
          vec3 g=(w-h.xyz)*vec3(1.,1.6,1.2);
          density*=1.-.86*h.w*exp(-dot(g,g)*95.);
        }
        vec3 displaced=w,scatter=vec3(0.);
        for(int j=0;j<8;j++){
          vec4 a=cutA[j], b=cutB[j]; if(b.w<=0.)continue;
          vec3 ba=b.xyz-a.xyz;
          float u=clamp(dot(w-a.xyz,ba)/max(.00001,dot(ba,ba)),0.,1.);
          vec3 delta=w-(a.xyz+ba*u);
          float dist2=dot(delta,delta)*a.w;
          if(dist2>4.8)continue;
          slit=max(slit,(1.-smoothstep(.11,1.30,dist2))*b.w);
          float air=(1.-smoothstep(.83,3.80,dist2))*smoothstep(.23,.86,dist2)*b.w;
          if(air>rim){
            rim=air;
            float roll=.55+.45*sin(dot(w,vec3(23.,19.,31.))-state.x*6.);
            displaced=w-delta*(.58+.27*roll);
            displaced.z=max(.005,displaced.z-(.023+.053*roll)*b.w);
          }
        }
        for(int j=0;j<2;j++){
          if(lamp[j].w<=0.)continue;
          vec3 velocity=lamp[j].xyz-lampTail[j];
          float course=clamp(dot(w-lampTail[j],velocity)/max(.0001,dot(velocity,velocity)),0.,1.);
          vec3 delta=w-(lampTail[j]+velocity*course);
          float d=dot(delta,delta), core=1.-smoothstep(.0001,.0062,d);
          float lip=(1.-smoothstep(.004,.023,d))*smoothstep(.0004,.006,d);
          slit=max(slit,core*lamp[j].w);
          pulse=max(pulse,lip*lamp[j].w*(1.-.38*course));
          float reach=max(0.,1.-d/.063);
          scatter+=lampRGB[j]*lamp[j].w*reach*reach*(.19+.50*course);
        }
        if(groundFlash.w>.001){
          vec3 gap=w-groundFlash.xyz;
          float spread=max(0.,1.-dot(gap.xy,gap.xy)/.088-gap.z*gap.z/.032);
          scatter+=groundColor*groundFlash.w*spread*spread*.84;
          slit=max(slit,spread*spread*min(1.,groundFlash.w)*.72);
        }
        if(rim>.06){
          float source=field(displaced,false).x;
          density+=source*rim*(.68+.95*rim);
        }
        density=density*(1.-.98*slit)+density*pulse*.92;
        if(density<.012)continue;
        vec3 sun=vec3(-.49,-.40,.76);
        float d1=field(w+sun*.092,false).x*ck;
        float d2=field(w+sun*.218,false).x*ck;
        float sunT=exp(-3.6*d1-1.65*d2);
        float sky=clamp((w.z+.045)/max(f.y,.09),0.,1.);
        vec3 light=vec3(.013,.015,.018)+vec3(.018,.023,.031)*sky*sky;
        light+=vec3(.151,.162,.176)*sunT*(.42+.58*sky);
        if(flowFrame.z>.5){
          // Backlit concentration gradients reveal the turbulent folds. The
          // dense interior receives little of the grazing light.
          float edge=smoothstep(.025,.47,max(0.,f.x-d1))*(.34+.66*sky);
          light+=vec3(.172,.185,.193)*edge*exp(-.72*d2);
        }
        light*=mix(.42,1.,vig);
        light+=vec3(.081,.107,.14)*rim+scatter*exp(-density*.78);
        float alpha=1.-exp(-density*dz*24.*state.z);
        radiance+=T*light*alpha; T*=1.-alpha;
      }
      // The floor just outside a sunlit curl still receives its cast penumbra.
      float shade=0.;
      if(bodyZ<.001){
        vec3 floorPoint=vec3(screen.x,y0,0.);
        shade=(field(floorPoint+vec3(-.042,-.034,.085),false).x*.15
             +field(floorPoint+vec3(-.107,-.087,.205),false).x*.16)*state.z*min(1.,clumps(floorPoint+vec3(-.07,-.06,.14)));
      }
      gl_FragColor=vec4(radiance,1.-T*(1.-shade));
    }`;
  let gpu, gpuFailed=false;
  function compileProgram(){
    if(gpu||gpuFailed) return gpu;
    const shaders=[];
    try{
      const program=gl.createProgram();
      const flowSource=window.AssassinFlow?.glsl||'const vec3 flowFrame=vec3(0.);float smokeVoxel(vec3 w){return 0.;}float smokeVoxelAt(vec3 w,float t){return 0.;}';
      const fs=fragment.replace('/* FLOW_VOLUME */',flowSource);
      for(const [type,src] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fs]]){
        const sh=gl.createShader(type); shaders.push(sh); gl.shaderSource(sh,src); gl.compileShader(sh);
        if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
        gl.attachShader(program,sh);
      }
      gl.bindAttribLocation(program,0,'p');gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      const u={};
      for(const n of ['anchor','camera','halfSize','state','cutA[0]','cutB[0]','lamp[0]','lampRGB[0]','lampTail[0]','wake[0]','actors[0]','steps','fieldNoise','sceneMask','invTarget','frontScale','groundFlash','groundColor','holes[0]'])u[n]=gl.getUniformLocation(program,n);
      gpu={program,u};
    }catch(err){gpuFailed=true;console.warn('Assassin fog shader',err);}
    finally{for(const sh of shaders)gl.deleteShader(sh);}
    return gpu;
  }
  // Value noise for the software renderer and the blade's atmospheric perspective.
  const noise=new Uint8Array(65536);
  let seed=1234567;
  for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed>>>24;}
  function sample(x,y,z){
    const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z);
    let a=x-i,b=y-j,c=z-k;a*=a*(3-2*a);b*=b*(3-2*b);c*=c*(3-2*c);
    const X=i+37*k,Y=255-j+17*k;
    const interp=(xx,yy)=>{
      const lo=(yy&255)<<8,hi=((yy-1)&255)<<8,x0=xx&255,x1=(xx+1)&255;
      return (noise[lo+x0]*(1-a)+noise[lo+x1]*a)*(1-b)+(noise[hi+x0]*(1-a)+noise[hi+x1]*a)*b;
    };
    return (interp(X,Y)*(1-c)+interp(X+37,Y+17)*c)/255;
  }
  window.AssassinMist=function(x,y,{radius=1100,duration=4,openAt,pace}={}){
    window.AssassinFlow?.prepare?.();
    const R=Math.max(120,radius), life=Math.max(.1,duration), start=RT;
    const blowAt=openAt??life-.55;
    const frontX=2*S*cam.z*R/W,frontY=2*S*cam.z*R*depth/H;
    const cuts=[], lights=[], wakes=[];
    const A=new Float32Array(32),B=new Float32Array(32),L=new Float32Array(8),C=new Float32Array(6),winds=new Float32Array(8);
    const tails=new Float32Array(6),actors=new Float32Array(32),holes=new Float32Array(24);
    let endAt=Infinity,phase=0,radiusNow=.42,strength=0,open=0,canvas,lastPaint=-10,pixels,bounds,flash,clearAt=-1;
    function timing(t){
      phase=t*4/(pace||life);
      radiusNow=.49+.54*ease(.12,1.33,phase)-.095*ease(2.64,3.08,phase)+.10*ease(3.16,3.65,phase);
      const blow=ease(0,.62,t-blowAt);
      open=blow>0?-.3+2.7*blow:0;
      strength=ease(0,.25,phase)*(1-ease(blowAt+.12,life,t))*(1-ease(0,.34,RT-endAt));
    }
    // Same banks and gaps as the shader's clumps(), for the knives' atmospheric perspective.
    function clumps(px,py,pz){
      const qx=px*2.3+.13*phase,qy=py*2.9-.06*phase,qz=pz*1.6+.07*phase;
      const n=sample(qx+31.7,qy+12.3,qz+5.9)*.68+sample(qx*2.3-4.1,qy*2.3+9.2,qz*2.3+2.2)*.32;
      let k=.03+1.92*ease(.42,.63,n);
      if(open>0){const r=Math.hypot(px,py*1.45),pile=(r-open-.28)/.16;k*=ease(open-.06,open+.32,r)*(1+1.4*Math.exp(-pile*pile));}
      return k;
    }
    function coarse(px,py,pz,accurate=false){
      const d=coarseField(px,py,pz,accurate);
      return d>0?d*clumps(px,py,pz):d;
    }
    function coarseField(px,py,pz,accurate=false){
      if(pz<0 || pz>.68)return 0;
      const t=RT-start;
      const center=1-ease(.51,1.47,Math.hypot(px*.93,py*1.1));
      const vx=.89*px+.46*py+.30*Math.sin(py*1.35+phase*.32)+.11*Math.sin(2.7*px);
      const vy=-.46*px+.89*py+.33*Math.sin(px*1.16-phase*.29)+.12*Math.sin(py*2.22);
      const triangle=a=>Math.abs((a-Math.floor(a))*2-1)-.5;
      const roll=sample(vx*.99+17.4,vy*.99+17.4,phase*.19+17.4);
      const ceiling=.136+.235*roll;
      const wool=sample(px*8.7-phase*.32+8.1,py*9.3-phase*.11+2.7,pz*13.6-phase*.46+3.4);
      let outer=0;
      if(pz<.59)outer=window.AssassinFlow?.sample?.(1.67*triangle(vx/2.58+.16),1.15*triangle(vy/1.97+.34),
        Math.min(.68,Math.max(.006,pz*(.85+.39*roll))),Math.min(4.156,13*4.16/55+.71*t+5*4.16/55*roll))
        ??ease(.33,.75,wool*.64+roll*.36)*(1-ease(ceiling*.5,ceiling+.18,pz));
      const reach=.27+2.76*ease(.04,1.03,phase);
      const arrival=1-ease(reach-.34,reach+.07,Math.hypot(px*frontX,py*frontY));
      const bed=(.11+.31*roll)*(.58+.55*wool)*(1-ease(ceiling*.47,ceiling+.054,pz));
      const settledTop=.116+.093*roll+.024*(wool-.5);
      const settled=(.72+.38*roll)*(1-ease(settledTop*.43,settledTop+.027,pz))*arrival;
      const a0=py-(.57+.34*Math.sin(2.4*px+.55*phase)),b0=py-(-.37+.28*Math.sin(2.8*px-.60*phase));
      const channel=Math.max(Math.exp(-a0*a0*13-px*px*.56),.76*Math.exp(-b0*b0*20-(px-.23)**2*1.15));
      const weight=(.10+.94*(1-center))*(1-.81*channel*(1-ease(.11,.38,pz)));
      const edge=(bed+outer*(.62+.63*wool))*arrival*weight;
      const soot=center>.001?window.AssassinFlow?.sample?.(px,py,pz,t):0;
      if(soot!==undefined){
        return soot*(.79+.39*wool)+edge*(1-.60*Math.min(1,soot))+settled;
      }
      const r2=(px/(radiusNow*1.24))**2+(py/(radiusNow*.89))**2;
      if(r2>1.5||pz>.55)return edge+settled;
      const angle=.42+.47*Math.sin(2.7*px+1.6*py+.38*phase)+.21*Math.cos(3.1*py-.34*phase);
      const ax=Math.cos(angle),ay=Math.sin(angle),along=ax*px+ay*py,side=-ay*px+ax*py-.13*Math.sin(3.4*along-.43*phase),height=pz-.132;
      const turn=2.95*Math.exp(-(side*side+height*height)*24)*(.52+.28*Math.sin(3.2*along+phase*.54));
      const c=Math.cos(turn),s=Math.sin(turn),dr=c*side-s*height-side;
      let ux=(px-ay*dr)*3.6-phase*.32+8.7,uy=(py+ax*dr)*3.5+phase*.085+4.2;
      const rz=s*side+c*height+.132,boil=Math.sin(along*6.3+phase*.69)*Math.cos((-ay*px+ax*py+dr)*7.4-phase*.58);
      let uz=(rz-.046*boil*Math.exp(-18*(rz-.19)*(rz-.19)))*5.45-phase*.29+1.7;
      const a=sample(ux*.72+2.8,uy*.72+2.8,uz*.72+2.8)-.5,b=sample(ux*.69-3.9,uy*.69-3.9,uz*.69-3.9)-.5;
      ux+=a*1.7;uy+=b*1.7;uz+=a*.79;
      const big=sample(ux,uy,uz),curl=sample(ux*2.04+.6,uy*2.04+7.2,uz*2.04+4.3);
      let base=(big-.48)*1.02+(curl-.48)*.51;
      if(accurate)base+=(sample(ux*4.21-2.3,uy*4.21+.8,uz*4.21+phase*.22)-.5)*.25;
      const crest=.068+.092*big+.089*curl+.126*ease(.46,.79,big*.72+curl*.28);
      const d=(1-ease(.26,1.13,r2-base*.98))*(1-ease(crest-.072,crest+.057,pz))*ease(-.042,.19,base+.012);
      return d+edge*(1-.60*Math.min(1,d))+settled;
    }
    function pack(includeBodies=true){
      A.fill(0);B.fill(0);L.fill(0);C.fill(0);winds.fill(0);tails.fill(0);actors.fill(0);
      for(let j=0;j<wakes.length;j++){
        const h=wakes[j],age=RT-h.at;
        winds.set([Math.cos(h.a),Math.sin(h.a),.16+age*.87,h.s*(1-ease(.06,.69,age))],j*4);
      }
      while(cuts.length&&RT-cuts[0].at>cuts[0].draw+.60)cuts.shift();
      let pos=0;
      for(const cut of cuts.slice(-2)){
        const t=RT-cut.at,head=clamp01(t/cut.draw);
        const w=cut.width/R;
        let p=cut.path(0,t);
        for(let j=1;j<=4;j++){
          const u=j*.25*head,q=cut.path(u,t), k=pos*4;
          A[k]=(p.x-x)/R;A[k+1]=(p.y-y)/(depth*R);A[k+2]=p.z/R;A[k+3]=1/(w*w);
          B[k]=(q.x-x)/R;B[k+1]=(q.y-y)/(depth*R);B[k+2]=q.z/R;
          B[k+3]=(1-ease(.13,.60,t-u*cut.draw))*ease(0,.05,t);
          pos++;p=q;
        }
      }
      for(let j=0;j<2;j++){
        const l=lights[j];if(!l||RT-l.at>.12)continue;
        L.set([(l.x-x)/R,(l.y-y)/(depth*R),l.z/R,l.gain],j*4);C.set(l.rgb,j*3);
        const p=l.prev||l;tails.set([(p.x-x)/R,(p.y-y)/(depth*R),p.z/R],j*3);
      }
      if(!includeBodies)return;
      const near=RPG.surv.en.filter(e=>!e.dead&&Math.abs(e.x-cam.x)<W/(2*S*cam.z)+e.h&&Math.abs(e.y-cam.y)<H/(2*S*cam.z)+e.h+e.z);
      near.sort((a,b)=>(a.x-x)**2+((a.y-y)/depth)**2-((b.x-x)**2+((b.y-y)/depth)**2));
      near.slice(0,8).forEach((e,j)=>actors.set([(e.x-x)/R,(e.y-y)/R,e.z/R,e.h/R],j*4));
    }
    function drawVolume(G){
      const {program,u}=gpu;gl.useProgram(program);gl.uniform1i(u.fieldNoise,0);
      window.AssassinFlow?.bind?.(gl,program,RT-start);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,G.tScene);gl.uniform1i(u.sceneMask,1);
      gl.activeTexture(gl.TEXTURE0);gl.uniform2f(u.invTarget,1/VOL.rt.w,1/VOL.rt.h);
      gl.uniform3f(u.anchor,x,y,R);gl.uniform4f(u.camera,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot);
      gl.uniform2f(u.halfSize,W/2,H/2);gl.uniform4f(u.state,phase,radiusNow,strength,open);
      if(RT-clearAt>.05)holes.fill(0);
      gl.uniform4fv(u['holes[0]'],holes);
      gl.uniform2f(u.frontScale,frontX,frontY);
      if(flash&&RT-flash.at<.28){
        gl.uniform4f(u.groundFlash,flash.x,flash.y,flash.z,flash.gain*(1-ease(0,.28,RT-flash.at)));
        gl.uniform3fv(u.groundColor,flash.rgb);
      }else gl.uniform4f(u.groundFlash,0,0,0,0);
      gl.uniform4fv(u['cutA[0]'],A);gl.uniform4fv(u['cutB[0]'],B);gl.uniform4fv(u['lamp[0]'],L);gl.uniform3fv(u['lampRGB[0]'],C);
      gl.uniform4fv(u['wake[0]'],winds);
      gl.uniform3fv(u['lampTail[0]'],tails);gl.uniform4fv(u['actors[0]'],actors);
      gl.uniform1f(u.steps,FX3.low?14:26);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    function software(){
      if(!canvas){canvas=document.createElement('canvas');}
      if(RT-lastPaint>=1/18){
        const size=S*cam.z,c=Math.abs(Math.cos(cam.rot)),s=Math.abs(Math.sin(cam.rot));
        const halfX=(W*c+H*s)/(2*size)*1.06,halfY=(H*c+W*s)/(2*size)*1.06;
        bounds={x:cam.x-cam.sx-halfX,y:cam.y-cam.sy-halfY,w:2*halfX,h:2*halfY};
        const width=halfX>=halfY?128:Math.max(44,Math.round(128*halfX/halfY));
        const height=halfX>=halfY?Math.max(44,Math.round(128*halfY/halfX)):128;
        if(!pixels||canvas.width!==width||canvas.height!==height){
          canvas.width=width;canvas.height=height;pixels=canvas.getContext('2d').createImageData(width,height);
        }
        pack(false);
        const w=canvas.width,h=canvas.height,data=pixels.data;let k=0;
        const top=window.AssassinFlow?.ready ? .66 : .45, levels=top>.5?8:6;
        for(let j=0;j<h;j++)for(let i=0;i<w;i++){
          const sx=(bounds.x-x+(i+.5)/w*bounds.w)/R, sy=(y-bounds.y-(j+.5)/h*bounds.h)/R;
          let trans=1,lit=0,red=0,green=0,blue=0;
          for(let n=0;n<levels;n++){
            const z=top-(n+.5)*top/levels, wy=(z-sy)/depth;
            let d=coarse(sx,wy,z);
            if(d<.01)continue;
            let cut=0,rim=0;
            for(let s=0;s<32;s+=4){
              if(!B[s+3])continue;
              const vx=B[s]-A[s],vy=B[s+1]-A[s+1],vz=B[s+2]-A[s+2];
              const dx=sx-A[s],dy=wy-A[s+1],dz=z-A[s+2];
              const u=clamp01((dx*vx+dy*vy+dz*vz)/Math.max(.00001,vx*vx+vy*vy+vz*vz));
              const dist=((dx-vx*u)**2+(dy-vy*u)**2+(dz-vz*u)**2)*A[s+3];
              cut=Math.max(cut,B[s+3]*(1-ease(.11,1.30,dist)));
              rim=Math.max(rim,B[s+3]*ease(.23,.86,dist)*(1-ease(.83,3.8,dist)));
            }
            d*=1-.98*cut+.83*rim;
            const alpha=1-Math.exp(-d*2.55*strength);
            lit+=trans*alpha*(.20+.60*z/top+.30*(1-d)+rim*.33);
            if(flash&&RT-flash.at<.28){
              const s=Math.max(0,1-((sx-flash.x)**2+(wy-flash.y)**2)/.088-(z-flash.z)**2/.032);
              const glow=alpha*trans*s*s*flash.gain*(1-ease(0,.28,RT-flash.at));
              red+=flash.rgb[0]*glow;green+=flash.rgb[1]*glow;blue+=flash.rgb[2]*glow;
            }
            for(let j=0;j<2;j++){
              const s=j*4;if(L[s+3]<=0)continue;
              const dx=sx-L[s],dy=wy-L[s+1],dz=z-L[s+2];
              const glow=Math.max(0,1-(dx*dx+dy*dy+dz*dz)/.065)**2*L[s+3]*alpha*trans;
              red+=C[j*3]*glow;green+=C[j*3+1]*glow;blue+=C[j*3+2]*glow;
            }
            trans*=1-alpha;
          }
          const a=Math.max(.002,1-trans),v=lit/a;
          data[k++]=8+30*v+48*red/a;data[k++]=10+32*v+48*green/a;data[k++]=13+36*v+48*blue/a;data[k++]=(1-trans)*250;
        }
        canvas.getContext('2d').putImageData(pixels,0,0);lastPaint=RT;
      }
      ctx.drawImage(canvas,bounds.x,bounds.y,bounds.w,bounds.h);
    }
    const handle={
      strike(a,s=1){wakes.push({a,s,at:RT});if(wakes.length>2)wakes.shift();},
      part(path,draw,width){if(typeof path==='function'&&width>0&&RT<endAt){cuts.push({path,draw:Math.max(.04,draw||.16),width:Math.min(R*.22,Math.max(63,width*.71)),at:RT});if(cuts.length>2)cuts.shift();}},
      end(){endAt=Math.min(RT,endAt);},
      // Up to six blades push the soot away from themselves this frame.
      clear(list){
        holes.fill(0);clearAt=RT;
        for(let j=0;j<Math.min(6,list.length);j++){const q=list[j];holes.set([(q.x-x)/R,(q.y-y)/(depth*R),q.z/R,q.s??1],j*4);}
      },
      fogAt(p){
        if(!p||RT>start+life)return 0;
        timing(RT-start);
        const sx=(p.x-x)/R,wy=(p.y-y)/(depth*R),z=p.z/R;
        const top=window.AssassinFlow?.ready ? .68 : .49;
        const dz=Math.max(0,top-z)/5;
        if(dz<=0)return 0;
        let optical=0;
        for(let i=0;i<5;i++){const h=(i+.5)*dz;optical+=coarse(sx,wy+h/depth,z+h,true);}
        return .90*(1-Math.exp(-optical*dz*24*strength));
      },
      bladeLight(slot,p,hex,gain=1,prev){
        if(!p||(slot!==0&&slot!==1))return;
        const rgb=window.FX3?.rgb?.(hex||'#b7dbec')||[.65,.8,.93];
        lights[slot]={x:p.x,y:p.y,z:p.z,at:RT,gain,rgb,prev};
      },
      flashGround(p,hex,gain=1){
        if(!p||RT>=Math.min(start+life,endAt))return;
        flash={x:(p.x-x)/R,y:(p.y-y)/(R*depth),z:(p.z||0)/R,rgb:window.FX3?.rgb?.(hex)||[.7,.8,1],gain:Math.min(2,Math.max(0,gain)),at:RT};
      }
    };
    const vol=!!(window.FX3?.on&&window.VOL?.on&&!FX3.noVol&&compileProgram());
    if(vol)GFX.add(life,(k,t)=>{timing(t);if(strength>.003){pack();VOL.add('blast',x,y,0,{renderVolume:drawVolume});}});
    else RPG.sv.draw(life,k=>{timing(k*life);if(strength>.003)software();});
    return handle;
  };

  // Chips follow the blade out of contact. A different spin and landing time on each
  // chip breaks up the fan; their fractured faces flash briefly as they turn edge-on.
  window.AssassinMist.splinters = function(x,y,z,angle,scale=1,pal) {
    const renderer = window.FX3, gpu = !!(window.GFX?.on && renderer?.on && renderer.solids?.());
    if (!gpu && !window.RPG?.sv?.draw) return;
    if (!(scale>0) || !Number.isFinite(x+y+z+angle+scale)) return;
    const size = Math.min(scale,2.4), low = !!renderer?.low;
    const tint = typeof pal === 'string' ? window.K3?.PAL?.[pal] : pal;
    const edge = tint?.m || '#b7cfdf', spark = tint?.h || '#e2f4ff';
    const count = low ? 2 : 4, pieces = [];
    for (let i=0;i<count;i++) {
      const lane = i/(count-1);
      const heading = angle+(lane-.5)*1.18+(Math.random()-.5)*.16;
      const travel = size*(165+198*Math.random()+35*Math.sin(lane*Math.PI));
      const length = size*(i===0 ? 53 : 25+23*Math.random());
      pieces.push({dx:Math.cos(heading)*travel,dy:Math.sin(heading)*depth*travel,heading,bevel:i%2===0,
        length,width:length*(.22+.18*Math.random()), apex:size*(57+80*Math.random()),
        flight:.44+.19*Math.random(),hang:.19+.13*Math.random(),
        spin:(i%2?-1:1)*(5.3+7*Math.random()),roll:Math.random()*tau,variant:Math.floor(Math.random()*4)});
    }
    const life = Math.max(...pieces.map(p=>p.flight+p.hang));
    function render(t) {
      for (const p of pieces) {
        if (t>=p.flight+p.hang) continue;
        const u=clamp01(t/p.flight), landed=Math.max(0,t-p.flight), fade=1-ease(.08,p.hang,landed);
        const hop=clamp01(landed/.13), stride=1-(1-u)**1.22+.10*hop;
        const cx=x+p.dx*stride,cy=y+p.dy*stride;
        const cz=Math.max(0,z)*(1-u)+4*p.apex*u*(1-u)+p.apex*.28*hop*(1-hop)+2;
        const roll=p.roll+p.spin*t,settle=ease(.73,1,u);
        const glint=(1-settle)*(.10+.9*Math.pow(Math.abs(Math.cos(roll+.45)),8));
        const tilt=.56*Math.sin(roll)*(1-settle)+Math.PI*.49*settle;
        if (gpu) {
          const M=renderer.xf({sx:p.width,sy:p.width*.66,sz:p.length,
            rx:tilt,ry:(roll+.28)*(1-settle),rz:p.heading-.28});
          renderer.solid('plate',p.variant,cx,cy,cz,{M,alb:'#364052',
            emis:edge,rimC:spark,spec:2.1,rim:.16+glint*1.5,heat:.18*glint,
            vein:.06*(1-settle),bump:.14,tone:.22,clip:0,a:fade,
            shadow:p.bevel?[.27,.16,.38*fade]:null,ord:4});
          if (p.bevel && !low && glint>.09 && window.K3?.mats) {
            const facet=(a,b,w)=>({x:cx+M[0]*a+M[8]*b,y:cy+(M[1]*a+M[9]*b)*depth,
              z:cz+M[2]*a+M[10]*b,w:w*p.width});
            renderer.ribbon(K3.mats().trC,[facet(-.30,-.20,0),facet(.03,.24,.14),facet(.13,.72,0)],
              {cA:edge,cB:edge,cM:spark,cC:spark,a:fade*(.3+.7*glint),gain:2.1,ero:.03,ord:5});
          }
        } else {
          ctx.save(); ctx.translate(cx,cy);
          ctx.fillStyle='rgba(4,5,9,'+(.32*fade)+')';
          ctx.beginPath(); ctx.ellipse(0,0,p.length*.30,p.width*.25,p.heading,0,tau); ctx.fill();
          ctx.translate(0,-cz); ctx.rotate(p.heading+roll*(1-settle)+.7*settle);
          const w=p.width*(.12+.88*Math.abs(Math.cos(roll)))*.55;
          ctx.globalAlpha=fade; ctx.fillStyle='#202431'; ctx.beginPath();
          ctx.moveTo(p.length*.70,0); ctx.lineTo(-p.length*.15,w); ctx.lineTo(-p.length*.36,-w*.55);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle=edge; ctx.lineWidth=Math.max(1,p.width*.12);
          ctx.globalAlpha=fade*(.15+.85*glint); ctx.beginPath(); ctx.moveTo(-p.length*.15,w);
          ctx.lineTo(p.length*.70,0); ctx.stroke(); ctx.restore();
        }
      }
    }
    if (gpu) GFX.add(life,(k,t)=>render(t));
    else RPG.sv.draw(life,k=>render(k*life));
  };
})();

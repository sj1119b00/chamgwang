// The wing pushes a parcel of air down. It reaches the floor later and fans out
// under that wing. The open tip wake stays aloft, shedding and rolling with the tip.
(()=>{
'use strict';
const mix=(a,b,k)=>a+(b-a)*k;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=(a,b,k)=>({x:mix(a.x,b.x,k),y:mix(a.y,b.y,k),z:mix(a.z,b.z,k)});
const sides=['left','right'];
const smokeStamps=[];
let wispMaterial,wispLine;

function dustStamp(leading){
  const index=leading?1:0;
  if(smokeStamps[index])return smokeStamps[index];
  const smokeStamp=document.createElement('canvas');
  smokeStamp.width=smokeStamp.height=64;
  const g=smokeStamp.getContext('2d');
  for(const [x,y,r] of [[24,34,22],[38,28,21],[46,37,15],[29,40,18]]){
    const grad=g.createRadialGradient(x,y,0,x,y,r);
    grad.addColorStop(0,leading?'rgba(202,165,120,.74)':'rgba(175,153,125,.66)');
    grad.addColorStop(.52,'rgba(139,122,101,.46)');
    grad.addColorStop(1,'rgba(96,86,77,0)');
    g.fillStyle=grad;g.fillRect(x-r,y-r,2*r,2*r);
  }
  return smokeStamps[index]=smokeStamp;
}
function release(particles){
  if(GFX.on){for(const p of particles)GFX.pt(p);return;}
  const life=Math.max(...particles.map(p=>p.life));
  RPG.sv.draw(life,k=>{
    const age=k*life,scale=S*cam.z;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    for(const p of particles){
      if(age>=p.life)continue;
      const travel=-Math.expm1(-p.drag*age)/p.drag;
      const z=p.z+(p.g?p.vz*age-.5*p.g*age*age:p.vz*travel);
      if(z<0)continue;
      const [x,y]=GFX.w2s(p.x+p.vx*travel,p.y+p.vy*travel,z);
      const r=(p.s+(p.grow||0)*age)*scale;
      ctx.save();ctx.translate(x,y);ctx.rotate(p.rot+p.vr*age);
      ctx.globalAlpha=p.a*Math.min(1,(p.life-age)*4/p.life)*Math.min(1,age*10/p.life);
      if(p.m===5)ctx.drawImage(dustStamp(p.leading),-r*p.sx,-r,2*r*p.sx,2*r);
      else{
        ctx.fillStyle=p.m===8?'#f5a550':p.L===1?'#b58e68':'#827568';
        ctx.fillRect(-r,-r*.44,2*r,r*.88);
      }
      ctx.restore();
    }
    ctx.restore();
  });
}
// Broken clusters of dust and loose grit retain the direction of the arriving air.
function liftDust(wave,quality){
  const {x,y,nx,ny,span,strength,phase,outer}=wave,depth=GFX.FSY;
  const clouds=quality<.52?1:quality<.85?2:3;
  const particles=[],jitter=i=>{const v=Math.sin(phase*43+i*13.7)*4358.71;return v-Math.floor(v);};
  const speed=span*(outer?.73:1.01)*strength;
  for(let i=0;i<clouds+1;i++){
    const chip=i===clouds,j=jitter(i*3+1),h=jitter(i*3+2);
    const side=(j-.5)*span*wave.dir*(outer?.16:.115),along=(h-.5)*span*.055;
    const v=speed*(i===0?1.23:.73+.49*h);
    const p={x:x+nx*along-ny*side,y:y+(ny*along+nx*side)*depth,
      z:chip?5:8+12*j,vx:nx*v-ny*wave.dir*(j-.5)*v*.46,vy:(ny*v+nx*wave.dir*(j-.5)*v*.46)*depth,
      rot:(j-.5)*.40,vr:(h-.5)*(chip?11:1.6),drag:chip?2.5:3.05,
      vz:(chip?210:85)*strength*(.7+h*.6),g:chip?780:0,
      s:chip?3+4*j:span*(.027+j*.016),sx:chip?1:1.72+.65*h,
      grow:chip?0:span*(.051+.024*h),life:chip?.50:.58+.19*h,
      a:chip?.63:.49*strength*(outer?.84:1),m:chip?11:5,b:'alpha',L:1,
      c:GFX.rgb(chip?'#b58e68':i===0?'#a68665':'#847462'),c2:chip?'#594b3e':'#423c36',
      c3:chip?'#a89980':'#bca487',leading:i===0,fade:'in',ns:2.1,w:1,er:.52,bounce:chip?.20:0};
    particles.push(p);
  }
  // A few still-hot grains from the ignition patch skip along the floor. Their
  // source is nearer the caster than the dust front and their hop is shallow.
  if(!outer&&wave.heat>.21){
    const n=quality>=.85&&wave.heat>.54?2:1;
    for(let i=0;i<n;i++){
      const j=jitter(18+i),v=speed*(.81+.19*j);
      particles.push({x:mix(wave.bx,x,.66)+nx*span*.023*i,y:mix(wave.by,y,.66)+ny*span*.023*i*depth,
        z:3+j*3,vx:nx*v,vy:ny*v*depth,vz:36+30*j,g:440,bounce:.16,drag:2.2,
        s:4.8+2.1*j,sx:1.28,rot:j*2,vr:1.7,life:.32+.14*j,
        m:8,b:'add',L:1,a:Math.min(.91,.35+strength*.7)*wave.heat,c:GFX.rgb('#fdad54')});
    }
  }
  release(particles);
}
function looseFeathers(tip,span,nx,ny,strength,phase,quality){
  const particles=[];
  for(let i=0;i<(quality<.52?1:3);i++){
    const f=i/3,j=.5+.5*Math.sin(phase*5+i*4.2),ember=i===0;
    particles.push({x:tip.x+nx*span*.018*f,y:tip.y+ny*span*.018*f*GFX.FSY,
      z:Math.max(8,tip.z-span*.020*f),vx:nx*span*(.07+.065*j),vy:ny*GFX.FSY*span*(.07+.065*j),
      vz:-span*(.14+.15*j)*strength,g:ember?400:240,drag:1.7,life:.31+.13*j,
      s:(ember?5.6:3.3)*(1+.3*j),rot:phase+2*i,vr:3.4-4.6*f,sx:1.3,
      m:ember?8:11,b:ember?'add':'alpha',a:ember?.64:.54,L:3,
      c:GFX.rgb(ember?'#e68a39':'#8a7868'),c2:'#413b36'});
  }
  release(particles);
}
function drawWisp(trace,t,quality){
  const life=.26,points=[];
  for(const p of trace.knots){
    const age=t-p.t;
    if(age<0||age>=life)continue;
    const k=age/life,span=trace.span;
    // Vorticity rolls in opposite directions at the two tips. The displaced
    // column descends and drifts behind the climbing bird after it separates.
    const roll=k*(2.7+.8*trace.strength),sweep=span*(.035*Math.sin(roll)+.035*k);
    const down=span*(.084*k+.023*(1-Math.cos(roll)));
    points.push({x:p.x+trace.nx*sweep-trace.dir*span*.067*k,
      y:p.y+trace.ny*sweep*GFX.FSY,z:Math.max(5,p.z-down),
      w:span*.007*(1-k)*(.62+.38*Math.sin(Math.PI*clamp((p.t-trace.start)/.12,0,1)))});
  }
  if(points.length<3)return;
  points[0].w*=.22;points[points.length-1].w*=.30;
  const alpha=.31*trace.strength*clamp((trace.end+life-t)/life,0,1);
  if(window.FX3?.on){
    wispMaterial||=FX3.mat({nz:'wisp',n1:[2,.55,-.8,0],n2:[2,1,-.25,.1],
      nk:.75,dist:.075,ero:.16,soft:.40,pm:[2,1.4,0,0],fd:[.16,.19,0,0],
      cA:'#4c443d',cB:'#948471',cC:'#c8b095',op:.95,gain:.83,bgain:0});
    FX3.ribbon(wispMaterial,points,{a:alpha,ord:1.9,time:t,t0:trace.phase});
  }else if(GFX.on){
    wispLine||=GFX.st(3,'alpha',{L:2,c2:GFX.rgb('#504940'),c3:GFX.rgb('#b79e82')});
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      GFX.line(wispLine,a.x,a.y,a.z,b.x,b.y,b.z,(a.w+b.w)*.5,
        GFX.rgb('#8b7967'),alpha*.65,.12,trace.phase,-1,.32);
    }
  }else{
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.lineCap='round';
    ctx.strokeStyle='#b49d82';
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],p=GFX.w2s(a.x,a.y,a.z),q=GFX.w2s(b.x,b.y,b.z);
      ctx.lineWidth=Math.max(.5,(a.w+b.w)*S*cam.z);
      ctx.globalAlpha=alpha*(quality<.52?.38:.50);
      ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();
    }
    ctx.restore();
  }
}

function create(bx,by,dir,onStroke){
  const waves=[],traces=[];
  let previous=null,crest=0,trough=0,armed=false,nStrokes=0,ended=false,lastTime=-Infinity;
  const phase=(Math.abs(bx*.019+by*.031)%6)+.37;
  function stroke(a,b,t0,t1,k,strength,quality){
    const t=mix(t0,t1,k),span=mix(a.span,b.span,k),chest=point(a.chest,b.chest,k);
    onStroke?.(strength,nStrokes);
    nStrokes++;
    for(const [i,side] of sides.entries()){
      const tip=point(a.air?.[side]||a[side],b.air?.[side]||b[side],k);
      const dx=tip.x-chest.x,dy=(tip.y-chest.y)/GFX.FSY,length=Math.hypot(dx,dy)||1;
      const nx=dx/length,ny=dy/length,p=phase+i*2.3+t*3;
      looseFeathers(tip,span,nx,ny,strength,p,quality);
      traces.push({side,start:t,end:t+.105,next:t+1/40,dir,nx,ny,span,strength,phase:p,
        knots:[{...tip,t}]});
      // The midwing carries more circulation than its tip. Downwash from higher
      // strokes spreads in flight and arrives weaker, later, and further aft.
      const below=point(chest,tip,.49),height=Math.max(0,below.z);
      const reach=strength/(1+(height/(RPG.sv.BODY*2.65))**2);
      if(reach<.10)continue;
      const at=t+height/(span*1.40)+.023;
      const nearOrigin=Math.hypot((below.x-bx),(below.y-by)/GFX.FSY)/(RPG.sv.BODY*2.0);
      const heat=1/(1+nearOrigin*nearOrigin);
      for(let band=0;band<(quality<.52?1:2);band++){
        const distance=span*(.018+band*.125);
        waves.push({at:at+band*.125/(.8+.33*reach),x:below.x+nx*distance-dir*height*.085,
          y:below.y+ny*distance*GFX.FSY,nx,ny,span,dir,strength:reach,bx,by,heat,
          phase:p+band*1.2,outer:band===1});
      }
    }
  }
  function update(t,bird){
    if(ended||t<=lastTime)return;
    lastTime=t;
    const quality=GFX.QK||1,dt=previous?t-previous.t:0;
    const rising=bird&&t<PhoenixFlight.dive&&bird.alpha>.06;
    // Strip overall growth and chest translation. A camera move or the full dive
    // moves both tips and the chest together and cannot trigger another stroke.
    const height=rising?(bird.left.z+bird.right.z-2*bird.chest.z)/(2*bird.span):0;
    const joined=rising&&previous&&dt<=.135&&previous.bird.air?.mesh===bird.air?.mesh;
    if(joined){
      crest=Math.max(crest,height);trough=Math.min(trough,height);
      if(!armed&&height-trough>.095){armed=true;crest=height;}
      const down=(previous.height-height)/dt,level=crest-.055;
      if(armed&&previous.height>level&&height<=level&&down>.39){
        const k=clamp((previous.height-level)/(previous.height-height),0,1);
        const strength=.44+.29*clamp(down/1.7,0,1)+.27*clamp((crest-trough)/.42,0,1);
        stroke(previous.bird,bird,previous.t,t,k,strength,quality);
        armed=false;trough=height;
      }
    }else{armed=false;crest=trough=height;}
    for(let i=traces.length-1;i>=0;i--){
      const trace=traces[i];
      if(t>trace.end+.26){traces.splice(i,1);continue;}
      if(joined){
        const side=trace.side,a=previous.bird.air?.[side]||previous.bird[side],b=bird.air?.[side]||bird[side];
        while(trace.next<=t&&trace.next<=trace.end){
          const sample=trace.next;trace.next+=1/40;
          if(sample>=previous.t)trace.knots.push({...point(a,b,(sample-previous.t)/dt),t:sample});
        }
      }
      drawWisp(trace,t,quality);
    }
    previous=rising?{t,bird,height}:null;
    for(let i=waves.length-1;i>=0;i--){
      const wave=waves[i];
      if(t>=wave.at){waves.splice(i,1);liftDust(wave,quality);}
    }
  }
  return {update,end(){ended=true;waves.length=traces.length=0;previous=null;}};
}
window.PhoenixWind={create};
})();

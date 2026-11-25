// A low pass shears a few stone splinters off the floor. Its reflected blade
// light stays at the sampled floor positions after the knife has flown away.
'use strict';
(() => {
  const F=FX3, depth=.58, pi=Math.PI;
  const sat=x=>Math.max(0,Math.min(1,x));
  const lerp=(a,b,k)=>a+(b-a)*k;
  const blend=(a,b,k)=>a.map((v,i)=>lerp(v,b[i],k));
  const white=[1,.98,.89], coal=[.07,.06,.085];
  const warm=[1,.53,.21];
  const stride=7;
  let gpu,unavailable=false;
  function setup(){
    if(gpu||unavailable||!F.on)return gpu;
    const vs=`attribute vec3 position;attribute vec4 ink;uniform vec4 camera;
      uniform vec2 screen;varying vec4 shade;
      void main(){
        vec2 q=(vec2(position.x,position.y-position.z)+camera.xy)*camera.z;
        float c=cos(camera.w),s=sin(camera.w);
        gl_Position=vec4((q.x*c-q.y*s)/screen.x,-(q.x*s+q.y*c)/screen.y,0.,1.);
        shade=ink;
      }`;
    const fs=`precision mediump float;varying vec4 shade;
      void main(){gl_FragColor=vec4(shade.rgb*shade.a,shade.a);}`;
    const prog=gl.createProgram(), shaders=[];
    try{
      for(const [kind,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
        const shader=gl.createShader(kind); shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
        gl.attachShader(prog,shader);
      }
      gl.bindAttribLocation(prog,0,'position');gl.bindAttribLocation(prog,1,'ink');gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
      gpu={prog,buffer:gl.createBuffer(),camera:gl.getUniformLocation(prog,'camera'),screen:gl.getUniformLocation(prog,'screen')};
    }catch(err){gl.deleteProgram(prog);unavailable=true;console.warn('Assassin ground wake',err);}
    finally{for(const shader of shaders)gl.deleteShader(shader);}
    return gpu;
  }
  function batch(){return {data:new Float32Array(3072*stride),n:0};}
  function vertex(mesh,p,color,alpha){
    const v=mesh.data,i=mesh.n;v[i]=p[0];v[i+1]=p[1];v[i+2]=p[2];
    v[i+3]=color[0];v[i+4]=color[1];v[i+5]=color[2];v[i+6]=alpha;mesh.n+=stride;
  }
  function triangle(mesh,a,b,c,color,alpha){
    vertex(mesh,a,color,alpha);vertex(mesh,b,color,alpha);vertex(mesh,c,color,alpha);
  }
  function paint(q){
    const b=q.batch;
    gl.useProgram(gpu.prog);gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,b.data.subarray(0,b.n),gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);gl.disableVertexAttribArray(2);gl.disableVertexAttribArray(3);
    gl.vertexAttribPointer(0,3,gl.FLOAT,false,stride*4,0);gl.vertexAttribPointer(1,4,gl.FLOAT,false,stride*4,12);
    gl.uniform4f(gpu.camera,-cam.x+cam.sx,-cam.y+cam.sy,S*cam.z,cam.rot);
    gl.uniform2f(gpu.screen,W*.5,H*.5);
    gl.drawArrays(gl.TRIANGLES,0,b.n/stride);F.stats.draws++;
  }
  function software(g,b){
    const v=b.data;g.save();
    for(let i=0;i<b.n;i+=stride*3){
      const a=(v[i+6]+v[i+stride+6]+v[i+stride*2+6])/3;if(a<.014)continue;
      g.fillStyle='rgba('+Math.min(255,Math.round(255*v[i+3]))+','+Math.min(255,Math.round(255*v[i+4]))+','+Math.min(255,Math.round(255*v[i+5]))+','+a+')';
      g.beginPath();g.moveTo(v[i],v[i+1]-v[i+2]);
      for(let j=1;j<3;j++){const k=i+j*stride;g.lineTo(v[k],v[k+1]-v[k+2]);}
      g.closePath();g.fill();
    }
    g.restore();
  }
  function pin(mesh,at,dx,dy,size,c,alpha){
    const p=[at.x,at.y,at.z], d=[dx*size,dy*depth*size], s=[-dy*size*.11,dx*depth*size*.11];
    const a=[p[0]-d[0],p[1]-d[1],p[2]],b=[p[0]+d[0]*.58,p[1]+d[1]*.58,p[2]];
    const high=[p[0]+s[0],p[1]+s[1],p[2]+size*.055],low=[p[0]-s[0],p[1]-s[1],p[2]-size*.055];
    triangle(mesh,a,high,b,c,alpha);triangle(mesh,a,low,b,c,alpha);
  }
  const corners=[[1,0,.06],[-.63,-.58,-.16],[-.84,.45,-.28],[-.19,.04,.64]];
  const faces=[[0,1,3],[1,2,3],[2,0,3],[0,2,1]];
  function spark(mesh,x,y,z,vx,vy,vz,seconds,width,color,alpha){
    const ax=vx*seconds,ay=vy*seconds*depth,az=vz*seconds;
    const n=Math.hypot(ax,ay-az)||1;
    const wx=-(ay-az)/n*width, wz=-ax/n*width;
    const tail=[x-ax,y-ay,z-az],tip=[x+ax*.12,y+ay*.12,z+az*.12];
    const left=[x+wx,y,z+wz],right=[x-wx,y,z-wz];
    vertex(mesh,tail,color,0);vertex(mesh,left,color,alpha);vertex(mesh,right,color,alpha);
    triangle(mesh,left,right,tip,white,alpha);
  }
  function flyChip(chip,t,mesh,ground,fogAt){
    const age=t-chip.t;if(age<0)return;
    const first=2*chip.up/chip.g,reb=chip.up*.37,second=2*reb/chip.g;
    if(age>first+second+.13)return;
    const after=age-first,drift=after<0?age:first+Math.min(after,second)*.48;
    const z=Math.max(0,after<0?chip.up*age-chip.g*age*age*.5:reb*after-chip.g*after*after*.5);
    const x=chip.x+chip.vx*drift,y=chip.y+chip.vy*drift*depth;
    const fade=sat((first+second+.13-age)/.15),a=fade*(1-.56*(fogAt?.({x,y,z})||0));
    if(a<.01)return;
    const roll=chip.spin*drift+chip.phase,pitch=chip.phase*.7+chip.pitch*drift;
    const co=Math.cos(roll),si=Math.sin(roll),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const verts=corners.map(v=>{
      const lx=v[0]*chip.size,ly=v[1]*chip.size*.86,lz=v[2]*chip.size*.78;
      const py=ly*cp-lz*sp,z0=ly*sp+lz*cp;
      return [x+co*lx-si*py,y+(si*lx+co*py)*depth,z+chip.size*.32+z0];
    });
    const shadow=chip.size*.9;
    triangle(ground,[x-shadow,y-shadow*.26,1],[x+shadow,y,1],[x-shadow*.25,y+shadow*.30,1],coal,a*.46/(1+z*.013));
    for(let j=0;j<faces.length;j++){
      const [i,k,l]=faces[j],v=verts[i],b=verts[k],c=verts[l];
      const vx=b[0]-v[0],vy=(b[1]-v[1])/depth,vz=b[2]-v[2];
      const ux=c[0]-v[0],uy=(c[1]-v[1])/depth,uz=c[2]-v[2];
      let nx=vy*uz-vz*uy,ny=vz*ux-vx*uz,nz=vx*uy-vy*ux;
      const len=Math.hypot(nx,ny,nz)||1;nx/=len;ny/=len;nz/=len;
      if(ny*.865+nz*.502<=0)continue;
      const key=sat(-.52*nx-.28*ny+.80*nz);
      const glint=Math.pow(sat(-.30*nx+.42*ny+.855*nz),12);
      const heat=sat(1-age/.38);
      const color=blend(chip.dark,chip.rim,.13+.53*key+.31*heat);
      for(let k=0;k<3;k++)color[k]+=(.60+heat*.75)*glint*chip.rim[k];
      triangle(mesh,v,b,c,color,a);
    }
    if(z>3&&age<.23)spark(mesh,x,y,z,chip.vx,chip.vy,chip.up-chip.g*age,
      Math.min(.088,age),chip.size*.42,chip.rim,a*(1-age/.40));
    if(after>=0&&after<.065)pin(mesh,{x,y,z:2},chip.vx/chip.vel,chip.vy/chip.vel,chip.size*2.1,warm,(1-after/.065)*a*.85);
  }
  function seedChips(mark,at,len,low){
    const count=low?2:4+(mark.lane===4?1:0),chips=[];
    for(let i=0;i<count;i++){
      const phi=at.dir+(i%2?1:-1)*(.28+.37*i)+.18*Math.sin(mark.lane+i);
      const vel=len*(2.1+1.15*Math.sin(1.7*i+mark.lane)**2);
      const size=len*(i===0?.120:.057+.026*Math.sin(i*2.13)**2);
      const metal=i%3!==1;
      chips.push({x:at.x,y:at.y,t:mark.beat+.014*i,vel,vx:Math.cos(phi)*vel,vy:Math.sin(phi)*vel,
        up:len*(1.85+1.03*Math.sin(i*1.81+.2)**2),g:len*10.6,size,spin:(i%2?1:-1)*(9+3.8*i),
        pitch:8.7-i*1.4,phase:i*2.4+.46*mark.lane,
        rim:metal?blend(mark.color,white,.53):warm,dark:metal?[.15,.22,.28]:[.095,.07,.075]});
    }
    return chips;
  }
  function band(mesh,a,b,offset0,offset1,aw,bw,z,c,alpha){
    const A=[a.x+a.nx*offset0,a.y+a.ny*offset0*depth,z],B=[b.x+b.nx*offset1,b.y+b.ny*offset1*depth,z];
    const al=[A[0]+a.nx*aw,A[1]+a.ny*aw*depth,z],ar=[A[0]-a.nx*aw,A[1]-a.ny*aw*depth,z];
    const bl=[B[0]+b.nx*bw,B[1]+b.ny*bw*depth,z],br=[B[0]-b.nx*bw,B[1]-b.ny*bw*depth,z];
    triangle(mesh,al,ar,br,c,alpha);triangle(mesh,al,br,bl,c,alpha);
  }
  function drawSear(mark,t,ground,air){
    const pts=mark.pts, count=17;
    const center=mark.touch?.arc??pts[pts.length-1]?.arc??0;
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i],u=i/count,age=t-b.t;
      const dist=Math.abs((a.arc+b.arc)*.5-center)/mark.reach;
      if(dist>=1)continue;
      const life=.44+.16*Math.sin(i*1.8+mark.lane)**2;
      if(age>life||!a||!b||Math.min(a.near,b.near)<.04)continue;
      const fade=1-sat(age/life),hot=Math.exp(-age*7.8),base=mark.width;
      const tip=Math.min(1,u*6,(1-u)*6+.09),w=base*(.37+.63*tip);
      const intensity=fade*(.70+.30*fade)*(a.near+b.near)*.5*(1-dist*dist);
      const gap=(i+mark.lane)%9===0 || ((i+mark.lane)%5===0&&age>.14);
      const color=blend(mark.color,white,hot*.77);
      band(ground,a,b,0,0,w*2.35,w*2.20,1.5,mark.base,.34*intensity);
      if(!gap){
        band(ground,a,b,0,0,w*.82,w*.63,2.3,color,.98*intensity);
        // The luminous lip is visible through soot, with absorption sampled on the floor.
        band(air,a,b,0,0,w*.45,w*.39,4.0,color,intensity*(.68+.32*hot)*(1-.60*b.fog));
      }
      if(i>2&&i<14&&(i+mark.lane)%6!==0){
        const offs=base*(1.5+.69*Math.sin(i*.77+mark.lane))*mark.side;
        const next=base*(1.5+.69*Math.sin((i+1)*.77+mark.lane))*mark.side;
        band(ground,a,b,offs,next,w*.35,w*.17,2.2,mark.color,.77*intensity);
      }
    }
  }
  function cast(radius,life,fogAt,flashGround){
    const ground=batch(),air=batch(),marks=new Map(),low=!!F.low,web=!!setup();
    function pass(lane,t,past,p,len,palette,alpha,beat){
      if(!beat||t<beat-.12||t>beat+.36||alpha<.16)return;
      let mark=marks.get(lane);
      if(!mark){
        mark={lane,beat,pts:[],chips:null,side:lane===4?-1:1,width:Math.max(7,len*.082),
          reach:Math.min(radius*.36,len*2.06),
          color:F.rgb(palette.m),base:F.rgb(palette.b)};
        marks.set(lane,mark);
      }
      const count=17,start=beat-.10,span=.202;
      while(mark.pts.length<=count){
        const k=mark.pts.length,time=start+span*k/count;
        if(time>t)break;
        const q=past(time),v=past(time-.011),dx=q.x-v.x,dy=(q.y-v.y)/depth,dz=q.z-v.z;
        const planar=Math.hypot(dx,dy)||1,norm=Math.hypot(dx,dy,dz)||1;
        const edge=len*.68,x=q.x+dx/norm*edge,y=q.y+dy/norm*edge*depth;
        const nearest=Math.max(0,Math.min(q.z,q.z+dz/norm*edge));
        const near=1-sat((nearest-len*.36)/(len*.86+radius*.023));
        const prev=mark.pts[k-1];
        const arc=prev?prev.arc+Math.hypot(x-prev.x,(y-prev.y)/depth):0;
        mark.pts.push({x,y,nx:-dy/planar,ny:dx/planar,near,t:time,arc,dir:Math.atan2(dy,dx),fog:fogAt?.({x,y,z:3})||0});
      }
      if(!mark.chips&&t>=beat&&mark.pts.length){
        const touch=mark.pts.reduce((best,q)=>Math.abs(q.t-beat)<Math.abs(best.t-beat)?q:best);
        mark.touch=touch;
        mark.chips=touch.near>.32?seedChips(mark,touch,len,low):[];
        if(mark.chips.length){
          const impact={x:touch.x,y:touch.y,z:13};
          flashGround?.(impact,palette.m,.90);
          if(web)GFX.light(impact.x,impact.y,len*1.57,palette.l||palette.m,.78,.18,{z:22});
        }
      }
    }
    function draw(t){
      ground.n=0;air.n=0;
      for(const [id,mark] of marks){
        if(t>mark.beat+1.1){marks.delete(id);continue;}
        drawSear(mark,t,ground,air);
        for(const chip of mark.chips||[])flyChip(chip,t,air,ground,fogAt);
      }
      if(web){
        if(ground.n)F.q.push({L:F.groundReady()?0:1,ord:.92,render:paint,batch:ground});
        if(air.n)F.q.push({L:1,ord:3.5,render:paint,batch:air});
      }else{
        if(ground.n)software(ctx,ground);
        if(air.n)software(fx,air);
      }
    }
    if(web)GFX.add(life,(k,t)=>draw(t));else RPG.sv.draw(life,k=>draw(k*life));
    return {pass};
  }
  window.AssassinGround={cast};
})();

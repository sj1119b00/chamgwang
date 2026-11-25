// Four-dimensional smoke density. Each tile is one horizontal slice. Its red and
// green channels store consecutive simulation times, allowing WebGL 1 filtering.
'use strict';
(() => {
  const columns=32, nx=64, ny=48, nz=28, frames=56, duration=4.16;
  const width=2048, height=1200;
  let atlas, pixels;
  const devices=new WeakMap(), locations=new WeakMap();

  function prepare(){
    if(atlas) return;
    atlas=new Image();
    atlas.onload=()=>{
      if(atlas.naturalWidth!==width || atlas.naturalHeight!==height) return;
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const g=canvas.getContext('2d',{willReadFrequently:true});
      g.drawImage(atlas,0,0);pixels=g.getImageData(0,0,width,height).data;
      canvas.width=canvas.height=1;
    };
    atlas.src='assets/as_mist_density.png';
  }

  const glsl=`
    uniform sampler2D flowAtlas;
    uniform vec3 flowFrame;
    vec2 densityPair(vec3 voxel,float pair){
      float z=floor(voxel.z), id=pair*28.+z, next=pair*28.+min(27.,z+1.);
      vec2 tile=vec2(mod(id,32.),floor(id/32.));
      vec2 tileNext=vec2(mod(next,32.),floor(next/32.));
      vec2 scale=vec2(64.,48.), size=vec2(2048.,1200.);
      vec2 a=texture2D(flowAtlas,(tile*scale+voxel.xy+.5)/size).rg;
      vec2 b=texture2D(flowAtlas,(tileNext*scale+voxel.xy+.5)/size).rg;
      return mix(a,b,fract(voxel.z));
    }
    float smokeVoxelAt(vec3 w,float at){
      vec3 norm=vec3((w.x+1.5)/3.,(w.y+1.22)/2.44,w.z/.68);
      if(any(lessThan(norm,vec3(0.)))||any(greaterThan(norm,vec3(1.))))return 0.;
      vec3 v=norm*vec3(63.,47.,27.);
      float frame=floor(at),pair=floor(frame*.5);
      vec2 d=densityPair(v,pair);
      if(mod(frame,2.)<.5)return mix(d.r,d.g,fract(at));
      return mix(d.g,densityPair(v,min(pair+1.,27.)).r,fract(at));
    }
    float smokeVoxel(vec3 w){return smokeVoxelAt(w,flowFrame.x+flowFrame.y);}`;

  function bind(gl,program,seconds){
    prepare();
    let u=locations.get(program);
    if(!u){u={atlas:gl.getUniformLocation(program,'flowAtlas'),frame:gl.getUniformLocation(program,'flowFrame')};locations.set(program,u);}
    let device=devices.get(gl);
    if(!device){
      device={texture:gl.createTexture(),loaded:false};devices.set(gl,device);
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,device.texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    }
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,device.texture);
    if(pixels && !device.loaded){
      // Typed pixels put the first PNG row at texture v=0, independent of the
      // scene/canvas upload's FLIP_Y and browser image colour-conversion flags.
      const flipped=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flipped);device.loaded=true;
    }
    const at=Math.max(0,Math.min(frames-1,seconds*(frames-1)/duration)),frame=Math.floor(at);
    gl.uniform1i(u.atlas,2);gl.uniform3f(u.frame,frame,at-frame,device.loaded?1:0);
    gl.activeTexture(gl.TEXTURE0);
    return device.loaded;
  }

  function plane(x,y,z,t,dx,dy){
    const tile=(t>>1)*nz+z;
    const px=(tile%columns)*nx+x, py=(tile>>5)*ny+y;
    const i=(py*width+px)*4+(t&1), row=width*4;
    const a=pixels[i]+(pixels[i+4]-pixels[i])*dx;
    const b=pixels[i+row]+(pixels[i+row+4]-pixels[i+row])*dx;
    return a+(b-a)*dy;
  }
  function sample(x,y,z,t){
    if(!pixels) return undefined;
    const vx=(x+1.5)*(nx-1)/3,vy=(y+1.22)*(ny-1)/2.44,vz=z*(nz-1)/.68;
    if(vx<0||vy<0||vz<0||vx>nx-1||vy>ny-1||vz>nz-1)return 0;
    const ix=Math.min(nx-2,Math.floor(vx)),iy=Math.min(ny-2,Math.floor(vy)),iz=Math.min(nz-2,Math.floor(vz));
    const dx=vx-ix,dy=vy-iy,dz=vz-iz;
    const at=Math.max(0,Math.min(frames-1,t*(frames-1)/duration)),i=Math.min(frames-2,Math.floor(at)),dt=at-i;
    const a=plane(ix,iy,iz,i,dx,dy),b=plane(ix,iy,iz+1,i,dx,dy);
    const c=plane(ix,iy,iz,i+1,dx,dy),d=plane(ix,iy,iz+1,i+1,dx,dy);
    return ((a+(b-a)*dz)*(1-dt)+(c+(d-c)*dz)*dt)/255;
  }
  window.AssassinFlow={glsl,prepare,bind,sample,get ready(){return !!pixels;}};
  if(pl.cls==='assassin')prepare();
})();

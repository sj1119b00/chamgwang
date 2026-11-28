(function(){
'use strict';
function fit(B,w,h,pad){
  const s=Math.min((w-pad*2)/(B.r-B.l),(h-pad*2)/(B.b-B.t));
  return {s,ox:(w-(B.l+B.r)*s)/2,oy:(h-(B.t+B.b)*s)/2};
}
const toMap=(f,x,y)=>[f.ox+f.s*x,f.oy+f.s*y];
function sub(start,arena,height,x,y){
  if(Math.hypot(x-arena.x,y-arena.y)<=arena.r*1.6) return 'keep';
  return Math.hypot(x-start.x,y-start.y)<=height*.28?'outer':'core';
}
function edge(cx,cy,tx,ty,r){
  const dx=tx-cx, dy=ty-cy, d=Math.hypot(dx,dy), inside=d<=r;
  return {x:inside?tx:cx+dx*r/d,y:inside?ty:cy+dy*r/d,ang:Math.atan2(dy,dx),inside};
}
const SUB={outer:'외곽',core:'중심',keep:'왕의 성채'};
const map={fit,toMap,sub,edge,SUB};
if(typeof module!=='undefined') module.exports=map;
if(typeof window==='undefined') return;
const PF=window.PF, G=window.RPG, fsY=G.sv.FSY;
const story=()=>PF.save.data.story;
const zoneName=z=>G.hub.ZONES[z]?.name||'남부 관제시설';
const locationName=id=>id==='town'?'마을':zoneName(Number(id.slice(1)));
const district=z=>G.hub.ZONES[z];
const tone=z=>district(z)?.acc||'#87c6bc';
const prefix=z=>district(z)?district(z).no+'구역':'';
const regionName=z=>[prefix(z),zoneName(z)].filter(Boolean).join(' · ');
const challengeName={hard:'높은 난이도',rematch:'왕 재대결',endless:'끝없이 버티기'};
const currentId=()=>PF.place.cur==='town'?'town':'z'+G.frame.run.zone;
const el=(tag,cls,txt)=>{ const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; };
// 한 판의 지형만 보관한다. 새 방/새 구역은 첫 게임 갱신 뒤 실제 경계가 준비되면 교체한다.
let cached=null, artRevision=0;
const pictureFiles=new Map(), watched=new WeakSet();
function picture(im){
  if(typeof im==='string'){
    if(!pictureFiles.has(im)){ const pic=new Image(); pic.src=im; pictureFiles.set(im,pic); }
    im=pictureFiles.get(im);
  }
  if(!im) return null;
  if(im.complete) return im.naturalWidth?im:null;
  if(!watched.has(im)){
    watched.add(im);
    im.addEventListener('load',()=>{ artRevision++; if(paintTerrain) paintTerrain(); },{once:true});
  }
  return null;
}
function terrainVersion(a){ return artRevision+(a.room?PF.art.ver:0); }
function area(){
  const place=PF.place.cur, run=G.frame.run;
  if(!run||G.mode!=='surv'||place!==run.kind) return null;
  const room=PF.room.cur, M=place==='field'?PF.field.M:challengeName[place]&&G.dun.M;
  const key=room||M||(place==='endless'?run:null);
  if(!key) return null;
  if(cached?.key===key&&cached.run===run) return cached;
  const B=room?{l:0,t:0,r:room.w,b:room.h}:M?M.B:{l:pl.x-1800,t:pl.gy-1800,r:pl.x+1800,b:pl.gy+1800};
  const start=room?room.start:M?.plazas.find(p=>p.k==='start');
  const hidden=place==='secret'&&PF.SECRETS.find(s=>s.id===run.id);
  const name=place==='town'?'마을':hidden?(hidden.kind==='zone'?'옛 대피소':'폐쇄된 배급 지하로'):challengeName[place]||regionName(run.zone);
  cached={key,run,place,B,room,M,start,name,field:place==='field',zone:place==='town'?'town':run.zone};
  return cached;
}
function section(a){
  if(a.place==='village') return a.room.name;
  if(!a.field) return '';
  const kind=PF.continent?.place()?.kind;
  return PF.continent?.rests().find(r=>r.kind===kind)?.label||({outer:SUB.outer,core:SUB.core,boss:a.M.arena.design?.name||'왕의 방'})[kind]||SUB[sub(a.start,a.M.arena,a.B.b-a.B.t,pl.x,pl.gy)];
}
// 미니맵·큰 지도 모두 같은 월드 그림을 투영한다. 마을 건물은 방의 충돌 다각형과 같은 변환을 쓴다.
function terrain(a){
  const version=terrainVersion(a);
  if(a.texture&&a.version===version) return a.texture;
  const B=a.B, w=B.r-B.l, h=B.b-B.t;
  const canvas=document.createElement('canvas'), scale=1200/Math.max(w,h);
  canvas.width=Math.ceil(w*scale); canvas.height=Math.ceil(h*scale);
  const g=canvas.getContext('2d');
  g.setTransform(scale,0,0,scale,-B.l*scale,-B.t*scale);
  const color=tone(a.zone);
  const ground=g.createLinearGradient(B.l,B.b,B.r,B.t);
  ground.addColorStop(0,a.room?'#213b39':'#263634'); ground.addColorStop(1,a.room?'#152d33':'#332c32');
  g.fillStyle=ground; g.fillRect(B.l,B.t,w,h);
  g.fillStyle=color+'12'; g.fillRect(B.l,B.t,w,h);
  const floor=picture(a.room?.floor||(a.M?.Z?'assets/menu/f_z'+a.M.Z.no+'.webp':null));
  if(floor){ g.globalAlpha=.43; g.drawImage(floor,B.l,B.t,w,h); g.globalAlpha=1; }
  const key=a.place==='town'?'town':a.room?.no??a.M?.regional?.no;
  if(key!=null&&PF.atlasTerrain&&(picture(PF.atlasTerrain.source(key))||PF.atlasTerrain.texture(key))){
    if(a.room)PF.atlasTerrain.room(g,a.room,B.l,B.t,B.r,B.b);
    else PF.atlasTerrain.field(g,a.M,B);
  }
  function oval(x,y,rx,ry,fill,line){
    g.beginPath(); g.ellipse(x,y,rx,ry,0,0,Math.PI*2);
    if(fill){ g.fillStyle=fill; g.fill(); }
    if(line){ g.strokeStyle=line; g.lineWidth=2/scale; g.stroke(); }
  }
  function street(r,width){
    g.lineCap='round'; g.beginPath(); g.moveTo(r[0],r[1]); g.lineTo(r[2],r[3]);
    g.strokeStyle='#547878'; g.lineWidth=width; g.stroke();
    g.strokeStyle='#3b585a'; g.lineWidth=Math.max(1,width-26); g.stroke();
  }
  function building(im,p,height,opacity){
    if(!im) return;
    const width=height*im.naturalWidth/im.naturalHeight;
    g.save(); g.globalAlpha=opacity; g.translate(p.x,p.y);
    if(p.flip) g.scale(-1,1);
    g.drawImage(im,-width/2,-height,width,height); g.restore();
  }
  if(a.room){
    for(const r of a.room.streets||[]) street(r,r[4]*2);
    for(const p of a.room.plazas||[]) oval(...p,'#3e5f61');
    for(const p of [...a.room.props||[]].sort((p,q)=>p.y-q.y)){
      const meta=p.art&&PF.art.meta(p.art);
      const polys=meta?.foot?PF.room.polys(meta.foot,p.x,p.y,p.h*meta.w/meta.h,p.h,p.flip):[];
      for(const poly of polys){
        g.beginPath(); poly.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y)); g.closePath();
        g.fillStyle='#152c35'; g.fill(); g.strokeStyle=color; g.lineWidth=1.1/scale; g.stroke();
      }
      building(p.art?PF.art.img(p.art):picture(p.img),p,p.h*.85,.89);
    }
  }else if(a.M){
    const m=a.M;
    if(a.field){
      for(const t of m.regional?.terrain||[]) oval(t.x,t.y,t.rx,t.ry,'#122024','#638481');
      for(const p of m.props){
        if(!p.solid||!p.rx||!p.ry) continue;
        g.fillStyle=p.k.big?'#577174':'#3c5154';
        g.fillRect(p.x-p.rx,p.y-p.ry,p.rx*2,p.ry*2);
      }
      for(const r of m.roads) street(r,r[4]*(r[1]===r[3]?fsY:1));
      const lane=PF.road.approach();
      for(let i=1;i<lane.length;i++) street([lane[i-1].x,lane[i-1].y,lane[i].x,lane[i].y],270);
      for(const p of m.plazas) if(p.k==='start'||p.k==='node') oval(p.x,p.y,p.r,p.r*fsY,'#416366');
      for(const z of PF.continent?.rests()||[]) oval(z.x,z.y,z.r,z.r,'#295e4d','#76c5a5');
    }
    if(m.arena.design){
      PF.regionScenery.boundary(g,m.arena,fsY);
      g.fillStyle='#302f39';g.fill();g.strokeStyle='#a18887';g.lineWidth=2/scale;g.stroke();
    }else oval(m.arena.x,m.arena.y,m.arena.r,m.arena.r*fsY,'#302f39','#a18887');
    if(a.field){
      for(const p of m.props) if(p.k.big) building(picture(p.im),p,p.h*.66,.7);
      for(const s of PF.continent?.rests()||[]){
        const key=s.kind==='middle'?'camp_tent':'p_tramstop';
        building(PF.art.img(key),{x:s.x-230,y:s.y-60},370,1);
      }
    }
  }
  if(a.place!=='endless'){ g.strokeStyle='#5b7e80'; g.lineWidth=4/scale; g.strokeRect(B.l,B.t,w,h); }
  a.texture=canvas; a.version=version; return canvas;
}
function points(a){
  const list=[], add=(kind,x,y,label,more={})=>list.push({kind,x,y,label,...more});
  if(a.field||a.place==='town'||a.place==='village'){
    for(const s of PF.spots.list){
      if(s.act?.startsWith('regional:')) add('log',s.x,s.y,s.label);
      if(s.kind==='npc') add('npc',s.x,s.y,s.label);
      if(s.act==='portal:warp') add('portal',s.x,s.y,s.label);
    }
    for(const m of PF.road.mouths()) add('exit',m.x,m.y,m.label,{open:m.open});
    const found=story().found||{}, origin=a.field?a.start:{x:0,y:0};
    for(const s of PF.SECRETS) if(a.place!=='village'&&s.zone===a.zone&&found[s.id])
      add('secret',origin.x+s.x,origin.y+s.y,'찾은 숨은 곳');
    if(a.field){
      for(const z of PF.continent?.rests()||[]) add('rest',z.x,z.y,z.label);
      for(const n of a.M.nodes) add('node',n.x,n.y,n.label||'현장 목표',{done:!!n.done});
      for(const [kind,set] of [['chest',a.M.chests],['log',a.M.logs]]) set.forEach((p,i)=>{
        if(found[PF.secret.builtinId(a.zone,kind,i)]) add(kind,p.x,p.y,kind==='chest'?'찾은 상자':'찾은 단말');
      });
    }
  }else if(a.place==='secret'){
    for(const s of PF.spots.list) if(s.act==='portal:back'||s.act==='read') add(s.act==='read'?'log':'exit',s.x,s.y,s.label,{open:true});
  }
  return list;
}
let lastRun=null, lastX=0, lastY=0, face=1, angle=0;
function heading(){
  const run=G.frame.run;
  if(run!==lastRun){ angle=pl.f<0?Math.PI:0; lastRun=run; }
  else {
    const dx=pl.x-lastX, dy=pl.gy-lastY;
    if((G.sv.V.steer||G.sv.V.dash)&&(dx||dy)) angle=Math.atan2(dy,dx);
    else if(pl.f!==face) angle=pl.f<0?Math.PI:0;
  }
  face=pl.f; lastX=pl.x; lastY=pl.gy; return angle;
}
Object.assign(map,{area,terrain,terrainVersion,points,section,heading});

let panel=null, board=null, info=null, tab='zone', selection=null, layoutWatch=null, paintTerrain=null;
let boardWidth=0,boardHeight=0;
const PAD=18;
const geom=(x,y)=>'translate(-50%, -50%) rotate('+Math.atan2(y,x)+'rad)';
function pin(kind,x,y,label,angle){
  const n=el('i','pf-map-mark'); n.dataset.mark=kind;
  n.style.left=x+'px'; n.style.top=y+'px'; n.title=label;
  if(angle!=null) n.style.transform=geom(Math.cos(angle),Math.sin(angle));
  board.appendChild(n); return n;
}
function note(text,x,y,align){
  const n=el('span','pf-map-note '+(align||''),text);
  n.style.left=x+'px'; n.style.top=y+'px'; board.appendChild(n);
  return n;
}
// 경계 가까운 두 출구는 주변 NPC·목표와 같은 자리에 몰리곤 한다. 표식은 실제 좌표에 두고 글만 비어 있는 쪽에 붙인다.
function exitNote(p,x,y,w,h,occupied){
  const n=note(p.label,0,0), width=n.offsetWidth, height=n.offsetHeight, gap=8;
  const labelX=offset=>Math.max(1,Math.min(w-width-1,offset));
  let best=null, bestCost=Infinity;
  for(const dy of [0,-height,height,-2*height,2*height]){
    for(const dx of [gap,-gap-width]){
      const l=labelX(x+dx), top=Math.max(1,Math.min(h-height-1,y+dy-height/2));
      const r=l+width, bottom=top+height;
      let cost=Math.abs(dy);
      for(const b of occupied) if(l<b.r&&r>b.l&&top<b.b&&bottom>b.t) cost+=1000;
      if(cost<bestCost){ best={l,r,t:top,b:bottom}; bestCost=cost; }
    }
  }
  n.style.left=best.l+'px'; n.style.top=((best.t+best.b)/2)+'px'; occupied.push(best);
}
function canvasFor(w,h){
  const c=el('canvas','pf-map-surface'), d=Math.min(devicePixelRatio||1,2);
  c.width=Math.round(w*d); c.height=Math.round(h*d); board.appendChild(c);
  const g=c.getContext('2d'); g.scale(c.width/w,c.height/h); return g;
}
function row(label,value){
  const r=el('div','pf-map-row'); r.append(el('span','',label),el('b','',value)); info.appendChild(r); return r;
}
function zoneBoard(a){
  const w=board.clientWidth, h=board.clientHeight; if(!w||!h) return;
  if(a.place==='endless') a.B={l:pl.x-1800,t:pl.gy-1800,r:pl.x+1800,b:pl.gy+1800};
  const B=a.B, f=fit(B,w,h,PAD), at=(x,y)=>toMap(f,x,y);
  const g=canvasFor(w,h), [x0,y0]=at(B.l,B.t);
  paintTerrain=()=>g.drawImage(terrain(a),x0,y0,(B.r-B.l)*f.s,(B.b-B.t)*f.s);
  paintTerrain();
  const occupied=[];
  if(a.field){
    const m=a.M, x=B.l+(B.r-B.l)*.16;
    note(SUB.keep,...at(x,m.arena.y),'section'); note('중심 · 전투',...at(x,(m.arena.y+a.start.y)/2),'section');
    note('외곽 · 전투',...at(x,a.start.y),'section');
    const [ax,ay]=at(m.arena.x,m.arena.y);
    const label=note(m.arena.design?.name||'왕의 방',ax,ay,'arena');
    occupied.push({l:ax-label.offsetWidth/2,r:ax+label.offsetWidth/2,t:ay-label.offsetHeight/2,b:ay+label.offsetHeight/2});
  }
  const POI=points(a), occupy=(x,y,r)=>occupied.push({l:x-r,t:y-r,r:x+r,b:y+r});
  for(const p of POI){
    const [x,y]=at(p.x,p.y), n=pin(p.kind,x,y,p.label);
    if(p.done!=null) n.dataset.done=p.done;
    if(p.open!=null) n.dataset.open=p.open;
    occupy(x,y,6);
  }
  const q=PF.quest.view();
  if(q.has){ pin('target',...at(q.x,q.y),q.label); occupy(...at(q.x,q.y),11); }
  const side=PF.side?.target();
  if(side){ pin('side',...at(side.x,side.y),side.label); occupy(...at(side.x,side.y),10); }
  pin('player',...at(pl.x,pl.gy),'현재 위치',heading());
  occupy(...at(pl.x,pl.gy),9);
  for(const p of POI) if(p.kind==='exit'||p.kind==='rest') exitNote(p,...at(p.x,p.y),w,h,occupied);
}
const legend=[['player','내 위치'],['target','메인 목표'],['side','서브 목표'],['npc','대화 상대'],['node','현장 목표'],['portal','관문'],['exit','출구'],
  ['rest','쉼터'],['chest','찾은 상자'],['log','기록 단말'],['secret','숨은 곳']];
function zoneInfo(a){
  info.appendChild(el('h3','',a.name));
  const d=section(a); if(d) info.appendChild(el('p','pf-map-status',d));
  const q=PF.quest.view();
  if(q.p&&q.text){
    const block=el('div','pf-map-objective');
    block.append(el('small','','메인 '+q.count),el('strong','',q.text)); info.appendChild(block);
  }else if(a.place==='endless') info.appendChild(el('p','pf-map-status','현재 위치 주변'));
  const key=el('div','pf-map-legend'), kinds=new Set(points(a).map(p=>p.kind));
  kinds.add('player'); if(q.has) kinds.add('target');
  if(PF.side?.target()) kinds.add('side');
  for(const [kind,label] of legend){
    if(!kinds.has(kind)) continue;
    const item=el('span'), icon=el('i','pf-map-mark'); icon.dataset.symbol=kind;
    item.append(icon,document.createTextNode(label)); key.appendChild(item);
  }
  info.appendChild(key); PF.secret.mapLine(info,a.zone);
}
function goalId(a){
  const s=story(), id=currentId();
  if(a.field||a.place==='town'||a.place==='village'){
    const c=PF.quest.cur(s,id);
    if(c){
      if(c.step.type==='travel'){
        if(a.place==='village'&&PF.quest.target()) return id;
        return (PF.road.next(id,c.step.exit,PF.field.COUNT)?.place||id).replace(/^v/,'z');
      }
      return id;
    }
  }
  const returning=Object.keys(s.continent||{}).find(id=>s.continent[id]==='return');
  return returning||((s.cleared||0)<PF.field.COUNT?'z'+(s.cleared||0):null);
}
function worldState(id){
  if(id==='town') return 'open';
  const s=story(),z=Number(id.slice(1)), state=PF.field.state(s.cleared||0,z);
  return state==='open'&&s.continent?.['z'+(z-1)]==='return'&&!s.visited?.[id]?'locked':state;
}
function worldInfo(){
  info.replaceChildren();
  const id=selection, state=worldState(id), zone=id==='town'?'town':Number(id.slice(1));
  info.appendChild(el('h3','',[prefix(zone),state==='locked'?'???':locationName(id)].filter(Boolean).join(' · ')));
  const geo=PF.WORLD.anchors.find(p=>p.id===id);
  if(geo){info.append(el('p','pf-map-geography',geo.geo+' · '+geo.en),el('p','pf-map-landform',geo.land));}
  const atlas=el('button','btn pf-atlas-open','대륙 지형도 확대');atlas.type='button';atlas.onclick=atlasViewer;info.appendChild(atlas);
  const visited=zone==='town'||state==='cleared'||!!story().visited?.[id];
  const status={cleared:'제압한 곳',locked:'진입 불가',open:visited?'들른 곳':'갈 수 있는 곳'};
  info.appendChild(el('p','pf-map-status',status[state]+(id===currentId()?' · 현재 위치':'')));
  const s=story(), total=PF.quest.steps(id).length;
  const progress=state==='cleared'&&s.continent?.[id]!=='return'?total:PF.quest.finished(s,id,s.nodeMilestones?.[id]||0);
  row('메인 퀘스트 완료',progress+' / '+total).dataset.record='main';
  if(zone!=='town'){
    const side=PF.side?.record(zone);
    row('서브 퀘스트',(side?.done||0)+' / '+(side?.total||0)).dataset.record='side';
  }
  PF.secret.mapLine(info,zone); info.lastElementChild.dataset.record='secret';
  const keys=PF.quest.steps(id).flatMap(st=>[st.note,...st.lines||[]].map(b=>b?.lore).filter(Boolean));
  // 기록 창의 loreIds와 같이 모든 구역이 공유하는 문·기억 한 줄은 첫 구역에 한 번만 센다.
  const fragments=[...new Set(keys)].filter(k=>zone===0||k!=='gate'&&k!=='memory');
  row('기록 조각',fragments.filter(k=>story().lore?.[k]).length+' / '+fragments.length).dataset.record='lore';
  if(zone!=='town'){
    const completed=['hard','rematch','endless'].filter(k=>PF.save.data.best2?.[k+':'+pl.cls+':'+zone]!=null).length;
    row('도전 기록',completed+' / 3').dataset.record='challenge';
  }
  if(zone!=='town'&&state==='cleared') PF.challenge.mapRow(info,zone);
  if(zone!=='town'&&visited&&state!=='locked') PF.bestiary?.catalog?.(info,G.hub.ZONES[zone]?.no??0);
}
let atlasDialog=null;
const previousKey=G.survKey;
let atlasEscape=false;
G.survKey=function(e,down){
  if(e.code==='Escape'&&atlasEscape){if(!down)atlasEscape=false;e.preventDefault();return;}
  if(atlasDialog?.open){
    if(down&&e.code==='Escape'){atlasEscape=true;e.preventDefault();atlasDialog.close();}
    return;
  }
  return previousKey.apply(this,arguments);
};
function atlasViewer(){
  if(!atlasDialog){
    const d=el('dialog','pf-atlas-view');atlasDialog=d;d.setAttribute('aria-label','호주 대륙 원정 지도');
    const plate=PF.WORLD.plate,bar=el('header'),title=el('b','','호주 대륙 원정 지도'),view=el('div','pf-atlas-scroll');
    const sheet=el('div','pf-atlas-sheet'),img=el('img'),pin=el('i','pf-atlas-current');
    img.width=plate.width;img.height=plate.height;img.src=PF.WORLD.atlas;img.alt='호주 대륙 노선과 여덟 구역의 마을, 사냥터, 왕의 방을 연결한 지형도';
    img.draggable=false;sheet.append(img,pin);view.appendChild(sheet);bar.appendChild(title);
    let zoom=1,last=null;
    function resize(next,fx=.5,fy=.5){
      const w=view.clientWidth,h=view.clientHeight,box=view.getBoundingClientRect(),old=img.getBoundingClientRect();
      const px=(box.left+w*fx-old.left)/(old.width||w),py=(box.top+h*fy-old.top)/(old.height||h);
      const fit=Math.min(w/plate.width,h/plate.height);zoom=Math.max(1,Math.min(8,next));
      sheet.style.width=Math.round(plate.width*fit*zoom)+'px';
      const fresh=img.getBoundingClientRect();
      view.scrollBy(fresh.left+px*fresh.width-box.left-w*fx,fresh.top+py*fresh.height-box.top-h*fy);
    }
    function locate(){
      const place=PF.WORLD.anchors.find(p=>p.id===currentId()),p=PF.WORLD.project(place.lon,place.lat);
      pin.style.left=(plate.x+p.x*plate.geoWidth)/plate.width*100+'%';
      pin.style.top=(plate.y+p.y*plate.geoHeight)/plate.height*100+'%';
      pin.setAttribute('aria-label','현재 위치 · '+place.geo);pin.title=pin.getAttribute('aria-label');
    }
    function centerPlayer(){
      resize(Math.max(zoom,3));const target=pin.getBoundingClientRect(),box=view.getBoundingClientRect();
      view.scrollBy(target.left+target.width/2-box.left-view.clientWidth/2,target.top+target.height/2-box.top-view.clientHeight/2);
    }
    for(const [txt,label,fn] of [['−','축소',()=>resize(zoom/1.65)],['+','확대',()=>resize(zoom*1.65)],['내 위치','현재 위치 보기',centerPlayer],['전체','전체 보기',()=>resize(1)],['닫기','지도 닫기',()=>d.close()]]){
      const b=el('button','',txt);b.type='button';b.setAttribute('aria-label',label);b.onclick=fn;bar.appendChild(b);
    }
    view.onwheel=e=>{e.preventDefault();const r=view.getBoundingClientRect();resize(zoom*(e.deltaY<0?1.25:.8),(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);};
    view.onpointerdown=e=>{if(e.pointerType==='mouse'){view.setPointerCapture(e.pointerId);last=[e.clientX,e.clientY];}};
    view.onpointermove=e=>{if(last){view.scrollBy(last[0]-e.clientX,last[1]-e.clientY);last=[e.clientX,e.clientY];}};
    view.onpointerup=view.onpointercancel=()=>{last=null;};
    view.ondblclick=()=>resize(zoom===1?3:1);d.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();d.close();}};
    d.append(bar,view);document.body.appendChild(d);d.reset=()=>{locate();resize(1);};
    new ResizeObserver(()=>{if(d.open)resize(zoom);}).observe(view);
  }
  atlasDialog.showModal();atlasDialog.reset();
}
function worldBoard(a){
  const w=board.clientWidth,h=board.clientHeight;if(!w||!h)return;
  const L=PF.WORLD.layout(PF.field.COUNT),ratio=2560/2136,gw=Math.min(w-10,(h-10)*ratio),gh=gw/ratio;
  const offx=(w-gw)/2,offy=(h-gh)/2,at=n=>[offx+n.x*gw,offy+n.y*gh];
  const img=el('img','pf-world-base');img.src=PF.WORLD.base;img.alt='';img.style.cssText='left:'+offx+'px;top:'+offy+'px;width:'+gw+'px;height:'+gh+'px';board.appendChild(img);
  const g=canvasFor(w,h),goal=goalId(a),occupied=[];
  g.lineJoin='round';g.lineCap='round';
  PF.WORLD.routes.forEach((route,i)=>{
    const shut=worldState(L.links[i][1])==='locked';
    g.beginPath();route.forEach((n,j)=>{const [x,y]=at(n);if(j)g.lineTo(x,y);else g.moveTo(x,y);});
    g.setLineDash([]);g.strokeStyle='#233c39';g.lineWidth=3.7;g.stroke();
    g.strokeStyle=shut?'#dbcca5':'#ffce77';g.lineWidth=1.65;g.setLineDash(shut?[2,3]:[]);g.stroke();
  });
  g.setLineDash([]);
  for(const n of L.nodes){
    const id=n.id,state=worldState(id),current=id===currentId(),goalHere=id===goal;
    const b=el('button','pf-world-node');b.type='button';
    const z=id==='town'?'town':Number(id.slice(1)),region=district(z);
    Object.assign(b.dataset,{place:id,state,current,visited:id==='town'||state==='cleared'||!!story().visited?.[id],goal:goalHere});
    b.style.setProperty('--region',tone(z));b.setAttribute('aria-pressed',String(selection===id));
    b.setAttribute('aria-label',n.geo+' · '+(current?'현재 위치 · ':'')+(region?prefix(z):id==='town'?'중앙 기지':'남부 관제시설'));
    const [x,y]=at(n),tw=52,th=23;
    const dx=Math.sign(n.label[0]),dy=Math.sign(n.label[1]);
    const opts=[[dx*19,dy*13],[dx*28,dy*23],[-dx*20,dy*14],[0,-21],[0,21],[-27,0],[27,0],[dx*35,-dy*26],[-dx*36,-dy*27]];
    let tx=x,ty=y;
    for(const [ox,oy] of opts){
      tx=Math.min(w-tw/2-1,Math.max(tw/2+1,x+ox));ty=Math.min(h-th/2-1,Math.max(th/2+1,y+oy));
      if(!occupied.some(([a,b])=>Math.abs(tx-a)<tw+2&&Math.abs(ty-b)<th+1))break;
    }
    occupied.push([tx,ty]);g.strokeStyle='#cbd0b9';g.lineWidth=.9;g.beginPath();g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();
    g.fillStyle=goalHere?'#ffd180':current?'#b4ffdc':'#e3ddc4';g.beginPath();g.arc(x,y,current?3.7:2.5,0,Math.PI*2);g.fill();
    b.style.left=tx+'px';b.style.top=ty+'px';
    const dot=el('i','pf-world-dot'),cap=el('b','pf-world-label',region?prefix(z):id==='town'?'기지':'관제');
    dot.style.backgroundImage='url("assets/menu/'+(region?'v_z'+region.no:id==='town'?'m_base':'m_arcadia')+'.webp")';
    b.append(dot,cap);b.append(el('span','pf-world-sr',(state==='locked'?'???':n.geo)+(current?' 현재 위치':'')+(goalHere?' 메인 목표':'')));
    b.onclick=()=>{selection=id;board.querySelectorAll('[data-place]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));worldInfo();};
    board.appendChild(b);
  }
}
function redraw(){
  if(!panel) return;
  const a=area(); paintTerrain=null; board.replaceChildren(); info.replaceChildren();
  boardWidth=board.clientWidth; boardHeight=board.clientHeight;
  board.id=tab==='zone'?'pf-zone-map':'pf-world-map';
  for(const b of panel.querySelectorAll('[data-map-tab]')) b.setAttribute('aria-selected',String(b.dataset.mapTab===tab));
  if(!a) return;
  board.dataset.land=a.place; panel.style.setProperty('--region',tone(a.zone));
  if(tab==='zone'){ zoneBoard(a); zoneInfo(a); }
  else { worldBoard(a); worldInfo(); }
}
map.mount=function(menu,initial){
  map.unmount(); tab=initial==='world'?'world':'zone'; selection=currentId();
  panel=el('section'); panel.id='pfmap'; panel.setAttribute('aria-label','지도');
  const bar=el('header','pf-map-head'), tabs=el('nav'), close=el('button','pf-map-close','닫기');
  close.type='button'; close.dataset.go='town'; close.onclick=()=>PF.win.close();
  bar.append(el('h2','','지도'),tabs,close);
  for(const [id,name] of [['zone','구역 지도'],['world','전체 지도']]){
    const b=el('button','',name); b.type='button'; b.dataset.mapTab=id; b.setAttribute('role','tab');
    b.onclick=()=>{ tab=id; redraw(); }; tabs.appendChild(b);
  }
  const content=el('div','pf-map-body'); board=el('div','pf-map-board'); info=el('aside','pf-map-info');
  content.append(board,info); panel.append(bar,content); menu.replaceChildren(panel);
  redraw(); layoutWatch=new ResizeObserver(()=>{ if(board&&(boardWidth!==board.clientWidth||boardHeight!==board.clientHeight)) redraw(); }); layoutWatch.observe(board);
};
map.unmount=function(){ if(atlasDialog?.open)atlasDialog.close(); layoutWatch?.disconnect(); layoutWatch=null; paintTerrain=null; panel?.remove(); panel=board=info=null; };
map.open=function(tab){ return PF.win.open('map',tab); };
PF.map=map;
})();

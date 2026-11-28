// 구역마다 들고나는 독립된 방. 건물과 거리의 충돌·그리기는 기존 room을 사용한다.
(function(){
'use strict';
const PF=window.PF,G=RPG,rooms=new Map();
function make(zone){
  const district=G.hub.ZONES[zone];
  return PF.regionMaps.village(district?.no??0,zone,PF.field.COUNT,district?.acc||'#a9e1e2');
}
function definition(zone){ if(!rooms.has(zone)) rooms.set(zone,make(zone)); return rooms.get(zone); }
function onSpot(s){
  if(s.act.startsWith('regional:')) PF.regionMaps.completeStation(V.zone,s.act.slice(9));
  if(s.act==='portal:warp') PF.road.list();
  if(s.act==='side:resident') PF.side?.press?.(s);
  if(s.act==='win:shop'&&PF.win.open('gear')) G.api.menuEl.querySelector('[data-tab=shop]')?.click();
}
const V={definition,get zone(){return PF.place.cur==='village'?G.frame.run?.zone??null:null;},
  enter(zone,arrive='in'){
    if(!Number.isInteger(zone)||zone<0||zone>=PF.field.COUNT||PF.field.state(PF.save.data.story.cleared,zone)==='locked') return false;
    if(!PF.place.can(PF.place.cur,'village')||PF.story.busy()||PF.story.cur||PF.win.cur) return false;
    if(PF.place.cur==='field') PF.field.closeForTravel();
    return PF.place.go('village',{zone,arrive});
  }};
PF.place.on((to,from,params)=>{
  if(to!=='village') return;
  const {zone,arrive}=params,d=definition(zone),ch=PF.field.chOf(zone);
  PF.bestiary?.preload(zone);
  G.frame.run={kind:'village',zone,ch};
  const mouth=arrive==='return'?d.returnGate:d.roads.find(m=>m.exit===arrive);
  const start=mouth?{x:mouth.x-mouth.dir[0]*100,y:mouth.y-mouth.dir[1]*100}:d.warp;
  PF.room.enter({...d,start},{ch,onSpot,onLeave(){PF.town.icons([]);}});
  PF.town.icons(['map','skills','gear','records','settings']);
  G.api.menuEl.classList.remove('on');
  const s=PF.save.data.story;
  (s.visited||(s.visited={}))['z'+zone]=1;
  PF.save.commit();
});
const previous=update;
update=function(dt){previous(dt);PF.regionMaps.villageTick(dt);};
PF.village=V;
})();

// 구역마다 들고나는 독립된 방. 건물과 거리의 충돌·그리기는 기존 room을 사용한다.
(function(){
'use strict';
const PF=window.PF,G=RPG,rooms=new Map();
const entry=(exit,x,y,dir)=>({exit,x,y,dir,r:200});
function make(zone){
  const district=G.hub.ZONES[zone],no=district?.no,industrial=no===1;
  const title=(district?.name||'관제 시설')+' 마을', y=industrial?1960:1640;
  const prop=(art,x,y,h,more={})=>({art,x,y,h,...more});
  const lamp=(x,y)=>prop('p_lamp',x,y,470,{light:1});
  const landmark=(i,x,y,h)=>({img:'assets/dun/z'+(no||G.hub.ZONES.at(-1).no)+'_'+i+'.webp',x,y,h});
  const npc=(id,art,x,act,label,light)=>({id,kind:'npc',art,x,y:y-105,r:180,act,label,light});
  const roads=[entry('in',580,y,[-1,0]),entry('field',5520,y,[1,0])];
  if(zone+1<PF.field.COUNT) roads.push(entry('next',3420,2900,[0,1]));
  const spots=[npc('q_camp','npc_resident',2080,'quest:camp','마을 주민','warm'),
    npc('q_neighbor','npc_archive',2960,'side:resident','이웃 주민','cool'),
    npc('q_service','npc_forge',4020,'win:shop','상점 · 정비','warm'),
    {id:'portal_town',kind:'portal',art:'b_portal_base',x:1150,y:y-355,r:250,h:430,label:'관문 · 빠른 이동',act:'portal:warp'}];
  const props=[prop(industrial?'b_forge':'b_archive',2080,y-255,850),prop(industrial?'p_crates':'p_tramstop',2930,y-225,440),
    prop(industrial?'b_sim':'b_map',4070,y-250,900),lamp(780,y+310),lamp(2490,y-240),lamp(4620,y+340),
    landmark(industrial?3:0,650,y-720,990),landmark(industrial?1:2,3300,y-740,600),
    landmark(industrial?5:4,4970,y-340,520),landmark(industrial?0:3,4420,2650,450),
    prop('p_crates',2520,y+610,210),lamp(3240,2540),lamp(3630,2820)];
  return {id:'village',zone,name:title,w:6250,h:3480,solid:true,fence:false,start:{x:1500,y},accent:district?.acc||'#9cbbc3',
    floor:'assets/menu/f_z'+(no||G.hub.ZONES.at(-1).no)+'.webp',floorArt:'floor_plain',floorScale:industrial?.88:.66,
    rail:'rail',rails:industrial?[[-300,y,6800,y]]:[[60,y,6650,y],[3420,y,3420,3480]],
    streets:[[-600,y,6800,y,245],[3420,y,3420,3620,185]],plazas:[[2080,y,870,460],[3600,y,900,510]],
    curbs:[[120,y+220,3210,y+220,-1],[3640,y+220,6100,y+220,-1]],puddles:[[1490,y+74,200,50],[4500,y-30,270,55]],
    props,spots,roads,warp:{x:1150,y:y-65}};
}
function definition(zone){ if(!rooms.has(zone)) rooms.set(zone,make(zone)); return rooms.get(zone); }
function onSpot(s){
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
  G.frame.run={kind:'village',zone,ch};
  const mouth=d.roads.find(m=>m.exit===arrive);
  const start=mouth?{x:mouth.x-mouth.dir[0]*100,y:mouth.y-mouth.dir[1]*100}:d.warp;
  PF.room.enter({...d,start},{ch,onSpot,onLeave(){PF.town.icons([]);}});
  PF.town.icons(['map','skills','gear','records','settings']);
  G.api.menuEl.classList.remove('on');
  const s=PF.save.data.story;
  (s.visited||(s.visited={}))['z'+zone]=1;
  PF.save.commit();
});
PF.village=V;
})();

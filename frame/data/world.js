(function(){
'use strict';
// Longitude / latitude in WGS 84. Campaign locations are fictional places set in these landscapes.
const bounds={west:110,east:155.8,north:-9,south:-45};
const anchors=[
  {id:'town',no:null,geo:'올버니 항만',en:'Albany',lon:117.89,lat:-35.023,land:'킹조지 사운드의 화강암 만과 남서부 해안 철도',label:[-.055,.052]},
  {id:'z0',no:7,geo:'에이번 계곡',en:'Avon Valley',lon:116.655,lat:-31.651,land:'휘어진 에이번강과 밀밭 사이의 철도 정착지',label:[-.050,-.037]},
  {id:'z1',no:6,geo:'필바라',en:'Hamersley Range',lon:118.015,lat:-22.257,land:'해머슬리 산맥의 붉은 협곡과 띠철광층',label:[-.032,-.048]},
  {id:'z2',no:5,geo:'동킴벌리',en:'East Kimberley',lon:128.586,lat:-15.956,land:'오드강 지류와 사암 고원 사이의 봉쇄 지대',label:[.028,-.050]},
  {id:'z3',no:4,geo:'맥도널 산맥',en:'MacDonnell Ranges',lon:132.642,lat:-23.695,land:'평행한 돌능선 사이에 놓인 중부 내륙 의회',label:[.014,.047]},
  {id:'z4',no:3,geo:'데인트리 저지대',en:'Daintree Lowlands',lon:145.340,lat:-16.166,land:'습윤 열대림과 범람원, 산호해로 향하는 하구',label:[.049,-.025]},
  {id:'z5',no:2,geo:'브리즈번 하구',en:'Brisbane River',lon:153.141,lat:-27.385,land:'모턴만에 면한 사행 하천과 화물 부두',label:[.035,.047]},
  {id:'z6',no:1,geo:'브로큰힐',en:'Broken Hill',lon:141.475,lat:-31.959,land:'배리어 산맥에 이어진 건조한 광산 지대',label:[.058,-.018]},
  {id:'z7',no:0,geo:'플루리외반도',en:'Fleurieu Peninsula',lon:138.524,lat:-35.527,land:'남호주 반도의 구릉과 남쪽 해안의 마지막 교대소',label:[.054,.043]}
];
// Intervening points trace a fictional overland route around marine inlets and along regional valleys.
const bends=[[[117.57,-34.48],[117.27,-33.51],[117.17,-32.87]],[[116.65,-30.61],[117.48,-28.13],[118.54,-26.61],[119.66,-24.74],[119.46,-23.63]],[[119.68,-20.86],[121.78,-19.74],[123.55,-18.47],[125.48,-18.13],[126.67,-17.96],[127.83,-16.86]],[[128.75,-17.04],[130.01,-18.23],[130.80,-20.5],[132.18,-22.17]],[[134.28,-23.61],[135.80,-22.12],[138.86,-20.78],[140.13,-19.63],[141.04,-18.33],[143.36,-17.67],[145.06,-17.12]],[[145.71,-17.05],[146.05,-18.44],[146.82,-19.50],[148.19,-20.46],[149.18,-21.21],[149.84,-22.35],[150.53,-23.45],[151.47,-24.42],[152.58,-25.84],[152.83,-26.77]],[[151.96,-27.52],[150.16,-28.44],[148.15,-29.06],[146.18,-30.10],[143.74,-31.02]],[[140.36,-32.5],[139.17,-33.16],[138.59,-34.35],[138.62,-35.06]]];
const project=(lon,lat)=>({x:(lon-bounds.west)/(bounds.east-bounds.west),y:(bounds.north-lat)/(bounds.north-bounds.south)});
const routes=bends.map((middle,i)=>[anchors[i],...middle.map(([lon,lat])=>({lon,lat})),anchors[i+1]].map(p=>project(p.lon,p.lat)));
function layout(count){const nodes=anchors.slice(0,count+1).map(a=>({...a,...project(a.lon,a.lat)}));return {nodes,links:nodes.slice(1).map((v,i)=>[nodes[i].id,v.id])};}
// A joint is oriented from the preceding settlement into the next, or out of a village into its field.
function join(place,exit){
  if(place==='town'&&exit==='east')return {key:'rail-0',sense:1,texture:'7'};
  const m=/^([vz])([0-7])$/.exec(place);if(!m)return null;
  const i=Number(m[2]),no=7-i;
  if(m[1]==='v'){
    if(exit==='in')return {key:'rail-'+i,sense:-1,texture:String(no)};
    if(exit==='next'&&i<7)return {key:'rail-'+(i+1),sense:1,texture:String(no-1)};
    if(exit==='field')return {key:'branch-'+i,sense:1,texture:String(no)};
    if(exit==='return')return {key:'return-'+i,sense:-1,texture:String(no),tunnel:true};
  }else if(exit==='in')return {key:'branch-'+i,sense:-1,texture:String(no)};
  else if(exit==='out')return {key:'return-'+i,sense:1,texture:String(no),tunnel:true};
  return null;
}
function seamPoint(j,door,x,y){
  const [a,b]=door.dir,sign=j.sense,dx=x-door.x,dy=y-door.y;
  return {key:j.key,along:sign*(dx*a+dy*b),across:sign*(-dx*b+dy*a)};
}
// One survey sheet per district. Original map coordinates are in hundreds of game units.
// The field is turned a quarter turn so its southern approach meets the village's east road.
function districtPlan(no,read){
  const v=read(no,'village'),f=read(no,'field'),b=read(no,'boss');
  const maps=globalThis.PF.regionMaps,compiled=maps.field(no,0,0);
  const arrival=maps.village(no,7-no,8).returnGate;
  const entry=compiled.roads.at(-2).slice(2,4).map(value=>value/100);
  const gate=v.sites.F,field=([x,y])=>[gate[0]-(y-entry[1]),gate[1]+x-entry[0]];
  const paths=(rows,sites,fn)=>rows.map(row=>row.split(' ').map(k=>fn(sites[k])));
  const villageRoads=paths(v.streets,v.sites,p=>p),fieldRoads=paths(f.paths,f.sites,field);
  fieldRoads.push([field(entry),field(f.sites.O)],[field(f.sites.G),field(b.center)]);
  const arena=[];
  for(let i=0;i<=64;i++){
    const a=i*Math.PI/32,radius=maps.radius(compiled.arena,a)/100;
    arena.push(field([b.center[0]+Math.cos(a)*radius,b.center[1]+Math.sin(a)*radius*.58]));
  }
  return {villageRoads,fieldRoads,arena,entry,branch:gate,start:v.sites.I,next:v.sites.N,
    stations:['A','B','C'].map(k=>field(f.sites[k])),settlement:v.sites.C,returnGate:[arrival.x/100,arrival.y/100],throne:field(b.center)};
}
const plate={width:3360,height:2110,x:55,y:198,geoWidth:1660,geoHeight:1385};
const world={bounds,plate,anchors,routes,project,layout,join,seamPoint,districtPlan,atlas:'assets/campaign/atlas/australia-expedition.webp',base:'assets/campaign/atlas/continental.webp'};
if(typeof module!=='undefined') module.exports=world;
if(typeof window!=='undefined')window.PF.WORLD=world;
})();

// Credits are shared by descendants. A first victory buys one standard weapon
// at the current tier, or multiple early refits. Salvage never pays back a refit.
(function(){
'use strict';
const rarity=[1,1.24,1.53,1.9];
function value(it){
  const base={w:4+4*it.tier,a:12+13*it.tier,t:3+2*it.tier}[it.slot];
  const step={w:3,a:7+it.tier,t:2}[it.slot];
  return Math.round(base*rarity[it.rar])+step*(it.plus||0);
}
const price=it=>Math.round((32+38*it.tier)*rarity[it.rar]**2);
const refit=it=>Math.round((18+14*it.tier)*rarity[it.rar]*(1+.65*(it.plus||0)));
function salvage(it){
  let invested=0;
  for(let plus=0;plus<(it.plus||0);plus++) invested+=refit({...it,plus});
  return Math.floor(price(it)*.28+invested*.18);
}
const victory=(chapter,kills,first)=> (first?75:45)*(chapter+1)+Math.min(80*(chapter+1),Math.max(0,kills)*.6);
// Deliveries and rescues may be completed with very few kills. The memory
// awarded on a first clear provides the XP missing for the next chapter.
function memoryXP(chapter,level,exp,target,need){
  let missing=-exp;
  for(let lv=level;lv<target;lv++) missing+=need(lv);
  return Math.max(150*(chapter+1),missing);
}
const economy={value,price,refit,salvage,victory,memoryXP};
if(typeof module!=='undefined') module.exports=economy;
if(typeof window!=='undefined'){
  window.PF.economy=economy;
  const save=PF.save.data;
  if(!save.story.fabricator){
    RPG.hub.restock();
    save.story.fabricator=1;
    PF.save.commit();
  }
}
})();

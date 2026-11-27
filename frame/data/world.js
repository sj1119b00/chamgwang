(function(){
'use strict';
// 길을 따라 읽으면 매 줄 끝에서 다음 줄로 접히는 한 장의 여정 지도.
function layout(count){
  const n=count+1, cols=Math.ceil(Math.sqrt(n*1.2)), rows=Math.ceil(n/cols);
  const nodes=[], links=[];
  for(let i=0;i<n;i++){
    const row=Math.floor(i/cols), col=row%2?cols-1-i%cols:i%cols;
    const x=cols===1?.5:.12+.76*col/(cols-1);
    const y=rows===1?.49:.15+.64*row/(rows-1);
    const id=i?'z'+(i-1):'town';
    nodes.push({id,x,y:y+(col%2?.04:0)});
    if(i) links.push([nodes[i-1].id,id]);
  }
  return {nodes,links};
}
if(typeof module!=='undefined') module.exports={layout};
if(typeof window!=='undefined') window.PF.WORLD={layout};
})();

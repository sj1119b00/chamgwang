// The campaign codex shares its sprite sheets and poses with the survival districts.
(function(){
'use strict';
const fields=typeof module!=='undefined'?require('../engine/field-enemies'):window.GameFieldEnemies;
if(typeof module!=='undefined')module.exports=fields;
if(typeof window==='undefined')return;
const {roles,identity,clips,actions,sprite}=fields,root='assets/campaign/foes/';
let manifest={};
fetch(root+'cast.json').then(r=>r.json()).then(data=>{manifest=data.entries;}).catch(()=>{});
function number(zone){return zone===7?0:RPG.hub.ZONES[zone]?.no;}
const B={...fields,preload(zone){fields.preloadSector(number(zone));},draw(g,e,death){
  const run=RPG.frame?.run;
  if(!run||!Number.isInteger(run.zone)||!['field','secret','hard','rematch','endless'].includes(run.kind))return false;
  return fields.draw(number(run.zone),g,e,death);
}};
const labels={idle:'대기',walk:'걷기',run:'달리기',turn:'방향 전환',prepare:'공격 준비',attack:'기본 공격',
  heavy:'강공격',charge:'돌진',hurt:'피격',stagger:'휘청임',knockdown:'넘어졌다 일어나기',fall:'날아가 쓰러짐',death:'전사'};
const royalLabels={entrance:'등장',roar:'포효',phase:'전투 단계 전환',special:'고유 기술'};
let dialog,canvas,caption,fieldset,status,weapon,action,focus,viewer,modulePromise,active=0,current,flatCanvas,flatFrame;
const moduleURL=new URL('frame/vendor/cast-viewer.js',document.baseURI).href;
function stopFallback(){cancelAnimationFrame(flatFrame);if(flatCanvas)flatCanvas.remove();canvas.hidden=false;}
function fallback(){
  stopFallback();flatCanvas=flatCanvas||document.createElement('canvas');
  flatCanvas.width=canvas.width;flatCanvas.height=canvas.height;flatCanvas.setAttribute('aria-label','전투 동작 모형');
  canvas.hidden=true;canvas.after(flatCanvas);
  const ctx=flatCanvas.getContext('2d'),other=current.group&&PF.figures?.sheet(current.group,current.key);
  const extra=!other&&actions[action.value],im=other?.image||sprite(current.key+(extra?'-actions':'')),started=performance.now();
  function tick(now){if(!dialog.open||!flatCanvas.isConnected)return;
    if(current.group==='constructs'){
      const data=PF.figures.sheet('constructs',current.key)?.manifest;
      const selected=data?.extra?.clips[action.value]||data?.clips[action.value];
      const h=flatCanvas.height;
      ctx.clearRect(0,0,flatCanvas.width,h);
      PF.figures.paint(ctx,'constructs',current.key,action.value,(now-started)/(1000*(selected?.seconds||1)),
        flatCanvas.width/2,h*.94,h*.86,1,true);
      flatFrame=requestAnimationFrame(tick);return;
    }
    const cols=other?.manifest?.columns||8,cell=im.naturalWidth/cols;
    const clip=other?.manifest?.clips[action.value];
    const [first,count,seconds]=clip?[clip.start,clip.count,clip.seconds]:(extra||clips[action.value]||clips.idle);
    if(cell){const frame=first+Math.floor((now-started)/(seconds*1000)*count)%count;
      const h=flatCanvas.height;
      ctx.clearRect(0,0,flatCanvas.width,h);ctx.drawImage(im,frame%cols*cell,Math.floor(frame/cols)*cell,cell,cell,(flatCanvas.width-h)/2,0,h,h);}
    flatFrame=requestAnimationFrame(tick);}
  tick(started);
}
async function display(form){
  const request=++active;current=form;caption.textContent=form.name;status.textContent='모형 불러오는 중';
  weapon.textContent=form.weapon||manifest[form.key]?.weapon||'';
  const choices=form.labels||(/_(boss|signal)$/.test(form.key)?{...labels,...royalLabels}:labels);
  action.replaceChildren();
  for(const [key,label] of Object.entries(choices))action.add(new Option(label,key));
  action.value='idle';focus.value='full';focus.disabled=true;viewer?.clear();stopFallback();
  try{
    modulePromise=modulePromise||import(moduleURL);
    const base=form.group?'assets/campaign/'+form.group+'/':root;
    const compact=window.matchMedia('(max-width: 640px), (pointer: coarse) and (max-height: 540px) and (max-width: 960px)').matches||navigator.connection?.saveData;
    const full=base+form.key+'.glb';
    const model=compact?fetch(base+'lod/'+form.key+'.glb').then(r=>r.ok?r:fetch(full)).catch(()=>fetch(full)):fetch(full);
    const [module,response]=await Promise.all([modulePromise,model]);if(!response.ok)throw Error(String(response.status));
    const buffer=await response.arrayBuffer();if(request!==active||!dialog.open)return;
    viewer=viewer||module.createCastViewer(canvas);const info=await viewer.load(buffer,form.key);
    if(request!==active||!dialog.open)return;
    weapon.textContent=form.weapon||info?.weapon||manifest[form.key]?.weapon||'';focus.disabled=false;status.textContent='';
  }catch(error){if(request===active&&dialog.open){status.textContent='입체 보기를 사용할 수 없습니다. 전투 동작을 표시합니다.';fallback();}}
}
function openForms(forms,categories,start=0){if(!dialog){
  dialog=document.createElement('dialog');dialog.className='pf-bestiary';dialog.setAttribute('aria-labelledby','pf-bestiary-name');
  dialog.innerHTML='<header><div><h2 id="pf-bestiary-name"></h2><small class="pf-cast-weapon"></small></div><button type="button" aria-label="도감 닫기">닫기</button></header><nav aria-label="대상 선택"></nav><canvas width="1120" height="656" aria-label="캐릭터 입체 모형"></canvas><aside role="status"></aside><footer><button type="button" aria-label="왼쪽으로 회전">↶</button><label>동작 <select aria-label="모형 동작"></select></label><label>관찰 <select data-focus aria-label="모형 관찰 위치"><option value="full">전신</option><option value="face">얼굴</option><option value="cloth">의복·외장</option><option value="hands">손·장비</option></select></label><button type="button" aria-label="오른쪽으로 회전">↷</button></footer>';
  document.body.appendChild(dialog);caption=dialog.querySelector('h2');canvas=dialog.querySelector('canvas');fieldset=dialog.querySelector('nav');status=dialog.querySelector('aside');weapon=dialog.querySelector('small');action=dialog.querySelector('select');focus=dialog.querySelector('[data-focus]');
  dialog.querySelector('header button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{active++;viewer?.clear();stopFallback();});
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close();}e.stopPropagation();});
  dialog.querySelectorAll('footer button').forEach((b,i)=>b.onclick=()=>viewer?.rotate((i?1:-1)*Math.PI/6));
  action.onchange=()=>flatCanvas?.isConnected?fallback():viewer?.play(action.value);let lastX=0;
  focus.onchange=()=>viewer?.focus(focus.value);
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);lastX=e.clientX;};canvas.onpointermove=e=>{if(canvas.hasPointerCapture(e.pointerId)){viewer?.rotate((e.clientX-lastX)*.015);lastX=e.clientX;}};
}
fieldset.replaceChildren();if(!dialog.open)dialog.showModal();
forms.forEach((form,i)=>{const b=document.createElement('button');b.type='button';b.textContent=categories[i];
 b.onclick=()=>{for(const q of fieldset.children)q.setAttribute('aria-pressed',String(b===q));display(form);};fieldset.appendChild(b);});fieldset.children[start].click();}
B.openForms=openForms;
function openCatalog(number){const forms=roles.map(r=>identity(number,r)),categories=['일반','원거리','중간','보스'];
for(const id of RPG.sv.encounterFoes(number)){
  const form=identity(number,id); forms.push(form);categories.push(form.name);
}
if(number===0&&['signal','separated'].includes(PF.save.data.story.finalStage)){forms.push(identity(0,'boss','signal'));categories.push('신호체');}
openForms(forms,categories);}
B.catalog=function(parent,number){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='지역 전투 도감';b.addEventListener('click',()=>openCatalog(number));parent.appendChild(b);};
window.PF.bestiary=B;
})();

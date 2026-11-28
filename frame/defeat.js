// Hold the battle at the fatal hit while the current character falls and the player chooses where to return.
(function(){
'use strict';
const G=RPG, V=G.sv.V, fallTime=.7;
const dialog=document.createElement('dialog');
dialog.id='pfdefeat';
dialog.setAttribute('aria-labelledby','pfdefeat-title');
dialog.innerHTML='<section hidden><h2 id="pfdefeat-title">쓰러졌습니다</h2><div><button type="button" data-revive="checkpoint"></button><button type="button" data-revive="town">마을로 귀환</button></div></section>';
document.body.appendChild(dialog);
const panel=dialog.querySelector('section'), checkpoint=dialog.querySelector('[data-revive=checkpoint]');
dialog.addEventListener('cancel',event=>event.preventDefault());
let fallen=null;

function begin(options){
  if(fallen) return false;
  // Freeze the visible skeleton, weapon and pose at the fatal hit.
  const portrait=document.createElement('canvas');
  portrait.width=900; portrait.height=640;
  const g=portrait.getContext('2d'), foot=pl.gy-pl.air;
  g.translate(450-pl.x,560-foot);
  drawPlayerBody(g);
  fallen={...options,portrait,elapsed:0,ready:false,x:pl.x,y:pl.gy,facing:pl.f,
    visible:pl.visible,paused:G.paused,over:V.over};
  G.hp=0; G.paused=true; V.over=true; pl.visible=false;
  G.keys={}; V.keys={}; V.joy=null; V.dash=null;
  document.getElementById('sjoy').classList.remove('act');
  // A fatal hit can land after the normal HUD update for this frame.
  const hp=document.querySelector('#shud .hpb');
  hp.querySelector('i').style.width='0%';hp.setAttribute('aria-valuenow','0');
  panel.hidden=true; dialog.showModal();
  return true;
}
function clear(){
  if(!fallen) return;
  G.paused=fallen.paused; V.over=fallen.over; pl.visible=fallen.visible;
  fallen=null; dialog.close(); panel.hidden=true;
}
dialog.addEventListener('click',event=>{
  const action=event.target.closest('[data-revive]')?.dataset.revive;
  if(!fallen?.ready||!action) return;
  const choose=fallen.choose;
  clear(); choose(action);
});
const beforeUpdate=update;
update=function(dt){
  if(!fallen) return beforeUpdate.apply(this,arguments);
  fallen.elapsed+=dt;
  if(fallen.ready||fallen.elapsed<fallTime) return;
  fallen.ready=true;
  if(fallen.afterFall){dialog.close();fallen.afterFall();return;}
  checkpoint.textContent=fallen.checkpoint;
  panel.hidden=false;checkpoint.focus({preventScroll:true});
};
const beforeDraw=drawPlayer;
drawPlayer=function(){
  beforeDraw.apply(this,arguments);
  if(!fallen) return;
  const {x,y,facing,portrait,elapsed}=fallen;
  const drop=clamp((elapsed-.12)/.43,0,1), impact=clamp((elapsed-.55)/.15,0,1);
  const tuck=Math.sin(Math.PI*clamp(elapsed/.4,0,1));
  ctx.save(); applyCam(ctx); ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();
  ctx.ellipse(-facing*68*drop,1,65+92*drop,17,0,0,TAU);ctx.fill();
  ctx.translate(-facing*(16*tuck+22*drop),-10*Math.sin(Math.PI*impact));
  ctx.rotate(-facing*(.12*tuck+1.51*drop*drop));
  ctx.scale(1,1-.25*tuck);
  ctx.drawImage(portrait,-450,-560);ctx.restore();
};
const beforeKey=G.survKey;
G.survKey=function(){if(!fallen)return beforeKey.apply(this,arguments);};
const beforeEnd=G.survEnd,beforeStart=G.survStart;
G.survEnd=function(){clear();return beforeEnd.apply(this,arguments);};
G.survStart=function(){clear();return beforeStart.apply(this,arguments);};
PF.defeat={begin,clear};
})();

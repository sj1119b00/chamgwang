// 실제 녹음이 준비된 기술에서 원래 효과음의 비율을 바꾼다. 값은 음원 입력에만 적용한다.
(function(){
'use strict';
function createMix(){
  const zero='sw_ult1', zeroGain=Math.pow(10,-32/20), beamSend=.08;
  const zeroVolumes={
    slash:[1,1], shing:[1,.6], whoosh:[1,.6], inhale:[1,.5], tick:[1,.25],
    heart:[0,1], hit:[0,1], boom:[1,1], shatter:[0,1]
  };
  let warmClass=null, zeroClips=[], zeroReady=false, insideOriginal=false;
  function select(engine,cls,candidate){
    if(!engine.ctx||cls===warmClass) return;
    warmClass=cls;
    zeroReady=false;
    if(cls!=='sword') return;
    const sheet=engine.cand(zero,candidate);
    if(!sheet) return;
    const clips=new Set();
    for(const cue of sheet.cues) for(const layer of cue.layers){
      clips.add(layer.clip);
      for(const id of layer.alt||[]) clips.add(id);
    }
    zeroClips=[...clips];
    engine.preload(zero,candidate);
  }
  function begin(engine,id){
    // 클래스 교체가 디코딩 버퍼를 비운다. 첫 소리가 나기 전에 이번 시전 전체의 비율을 결정한다.
    zeroReady=id===zero&&warmClass==='sword'&&zeroClips.length>0&&zeroClips.every(clip=>engine.decoded.has(clip));
  }
  function withOutput(audio,connect,play){
    const send=audio.toOut;
    audio.toOut=(source,wet)=>connect(source,wet,send);
    try{return play();}finally{audio.toOut=send;}
  }
  function sword(id,name,original,receiver,args,audio){
    if(id!==zero||!zeroReady||insideOriginal) return original.apply(receiver,args);
    // 납도음은 음량 인수가 없어 네 발진기의 개별 출력에 같은 감쇠를 건다.
    if(name==='click'&&audio?.toOut){
      return withOutput(audio,(source,wet,send)=>{
        const trim=source.context.createGain();
        trim.gain.value=zeroGain;
        source.connect(trim);
        send(trim,wet);
      },()=>original.apply(receiver,args));
    }
    const volume=zeroVolumes[name];
    if(!volume) return original.apply(receiver,args);
    const [index,defaultValue]=volume, adjusted=args.slice();
    adjusted[index]=(args[index]??defaultValue)*zeroGain;
    // hit는 같은 음량으로 boom을 부른다. 한 번만 감쇠하고 원래 음의 시간·음높이·난수를 보존한다.
    insideOriginal=true;
    try{return original.apply(receiver,adjusted);}finally{insideOriginal=false;}
  }
  function beam(engine,audio,play){
    if(!engine.synth||!audio.toOut) return play();
    // 빔 한 음의 마른 출력을 조금 더한다. 다른 음, 기존 반향, 마스터의 압축과 자동 음량은 건드리지 않는다.
    let dry=null;
    const handle=withOutput(audio,(source,wet,send)=>{
      send(source,wet);
      dry=source;
    },play);
    if(!dry||!handle?.stop) return handle;
    let extra=dry.context.createGain();
    // 원래 압축 경로의 6ms 지연에 맞춰 두 저음 파형이 서로 지워지지 않게 한다.
    const align=dry.context.createDelay();
    align.delayTime.value=.006;
    extra.gain.value=beamSend;
    dry.connect(align).connect(extra).connect(engine.synth);
    return {stop(...args){
      if(extra){
        const tail=extra;
        extra=null;
        tail.gain.setTargetAtTime(0,engine.ctx.currentTime,.004);
        setTimeout(()=>{dry.disconnect(align); align.disconnect(); tail.disconnect();},60);
      }
      return handle.stop(...args);
    }};
  }
  return {select,begin,sword,beam};
}
if(typeof module==='object'&&module.exports) module.exports=createMix;
else window.PF.combatSound=createMix();
})();

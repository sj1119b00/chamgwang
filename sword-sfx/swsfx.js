/* SwordSFX — runtime mixer for the swordsman sound designs (Web Audio).
 * Layer clips arrive already trimmed / pitched / EQ'd / faded / loudness-matched (tools/build.py).
 * This file does what must stay live: scheduling against the animation clock, gain, pan, per-layer delay,
 * reverb send, bus ducking (side-chain style), pre-impact hush, voice limits, hit aggregation and the master glue.
 */
'use strict';
(()=>{
const db=x=>Math.pow(10,x/20);
const BUSES=['swing','blade','impact','low','fx','amb'];
// stereo width per bus (1 = as recorded, 0 = mono). Measured on 4,464 Lost Ark casts: the hit is narrow (side-mid -11.8 dB)
// and the tail wider (-7.7 dB) -> sub and crack in the centre, tails / debris / sizzle keep their spread. tools/build.py mirrors it.
const WIDTH={low:.35,impact:.6,blade:.7,hero:.6,verb:.45};
// fixed bus gain (dB) after the duck: swing / ambience -2 dB so the blow's body (쾅/펑) is not masked. The weight bus stays at 0:
// at +3 dB the sub took the headroom and the 150 Hz-2 kHz share at the blasts fell (0.65 vs 0.68), and phones do not play it. tools/build.py mirrors it.
const BUSDB={low:0,swing:-2,amb:-2};
// layer mode (user 2026-11-26): the game's own synthesized sounds stay as the base and the recordings sit on top.
// Both share one context and one final ceiling. Measured from live captures of all classes: the original synth peaks up to
// +1.3 dBTP on its own, and with both feeds hot the final stage squashed 평타 / 스킬 / 궁극기 to the same -8.5 LUFS. Feeds come
// down (recordings -5, synth -2, its lows -4 dB under 120 Hz where the sub drops sit) so only ultimate peaks reach the ceiling.
const LAYERDB=-5, SYNTHDB=-2, SYNTH_LOWSHELF=-4;
class Engine{
  constructor(){ this.castT={}; this.ctx=null; this.clips={}; this.designs=null; this.buf=new Map(); this.decoded=new Map(); this.voices=[]; this.hitClock=new Map(); this.rr=new Map(); this.maxVoices=40; this.listeners=[]; this.epoch=0; }
  async init(base=''){
    this.base=base;
    const [c,d]=await Promise.all([fetch(base+'clips.json',{cache:'no-store'}).then(r=>r.json()),fetch(base+'designs.json',{cache:'no-store'}).then(r=>r.json())]);
    this.clips=c; this.designs=d; return this;
  }
  graph(){
    if(this.ctx) return this.ctx;
    // share the game's context when it exists, so its sounds and ours meet in one limiter
    const game=(typeof AC!=='undefined'&&AC)||null;
    const ctx=this.ctx=game||new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
    // master: rumble cut -> glue compressor -> brickwall-ish limiter -> out
    const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=28; hp.Q.value=.6;
    const glue=ctx.createDynamicsCompressor(); Object.assign(glue,{}); glue.threshold.value=-16; glue.knee.value=8; glue.ratio.value=2.5; glue.attack.value=.015; glue.release.value=.25;
    const mk=ctx.createGain(); mk.gain.value=db(3);
    const lim=ctx.createDynamicsCompressor(); lim.threshold.value=-6; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=.001; lim.release.value=.08;
    const out=ctx.createGain(); out.gain.value=db(-1);
    const an=ctx.createAnalyser(); an.fftSize=2048; an.smoothingTimeConstant=.6;
    // final stage for everything that leaves (ours + the game's): a fast compressor, then a 4x-oversampled soft clipper that only
    // touches what still overshoots, ceiling -1 dBFS (a Web Audio compressor alone let +0.1 dBFS through)
    const fin=ctx.createDynamicsCompressor(); fin.threshold.value=-3; fin.knee.value=2; fin.ratio.value=20; fin.attack.value=.0005; fin.release.value=.1;
    const pre=ctx.createGain(); pre.gain.value=.5; const clip=ctx.createWaveShaper(); clip.oversample='4x'; const N=4096, cv=new Float32Array(N), C=db(-1), K=.8*C;
    for(let i=0;i<N;i++){ const x=(i/(N-1)*2-1)*2, a=Math.abs(x); cv[i]=Math.sign(x)*(a<K?a:K+(C-K)*Math.tanh((a-K)/(C-K))); }
    clip.curve=cv;
    this.master=ctx.createGain(); this.master.connect(hp).connect(glue).connect(mk).connect(lim).connect(out); out.connect(fin).connect(pre).connect(clip).connect(ctx.destination); clip.connect(an);
    this.fin=fin;
    if(game&&typeof master!=='undefined'&&master){ out.gain.value=db(-1+LAYERDB); this.adoptSynth(); }
    this.glue=glue; this.lim=lim; this.analyser=an; this.out=out;
    // world gain: everything passes it; the hush automates it so the impact after it lands on silence
    this.world=ctx.createGain(); this.world.connect(this.master);
    this.bus={}; for(const b of BUSES){ const g=ctx.createGain(), fixed=ctx.createGain(); fixed.gain.value=db(BUSDB[b]||0); g.connect(fixed).connect(this.width(WIDTH[b],this.world)); this.bus[b]=g; }
    // hero bus bypasses the hush/duck so the impact that caused them is not ducked by itself
    this.hero=ctx.createGain(); this.hero.connect(this.width(WIDTH.hero,this.master));
    // a hero layer on the weight bus keeps the weight bus' gain and centre
    this.heroLow=ctx.createGain(); const hf=ctx.createGain(); hf.gain.value=db(BUSDB.low); this.heroLow.connect(hf).connect(this.width(WIDTH.low,this.master));
    // reverb send: convolution with a short hall built from decaying filtered noise (processing only, not a sound source)
    // tails lose their top first and keep low body (measured tail: 60% of energy under 150 Hz), so the return is darker
    this.verb=ctx.createConvolver(); this.verb.buffer=this.ir(3.2,2.0); const vr=ctx.createGain(); vr.gain.value=db(-1);
    const vhp=ctx.createBiquadFilter(); vhp.type='highpass'; vhp.frequency.value=120; const vlp=ctx.createBiquadFilter(); vlp.type='lowpass'; vlp.frequency.value=5000;
    this.send=ctx.createGain(); this.send.connect(vhp).connect(this.verb).connect(vlp).connect(vr).connect(this.width(WIDTH.verb,this.world));
    return ctx;
  }
  // mid/side width: L'=aL+bR, R'=bL+aR with a=(1+w)/2, b=(1-w)/2 (side scaled by w, mid untouched)
  // the game's chain is master -> compressor -> destination; rebuild that compressor here (same settings, so the original keeps
  // its sound) and send it into the shared ceiling. The game's own duck() still drives master.gain.
  adoptSynth(){ const ctx=this.ctx; try{ master.disconnect(); }catch(_){}
    const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-16; comp.knee.value=12; comp.ratio.value=7; comp.attack.value=.002; comp.release.value=.25;
    const ls=ctx.createBiquadFilter(); ls.type='lowshelf'; ls.frequency.value=120; ls.gain.value=SYNTH_LOWSHELF;
    this.synth=ctx.createGain(); this.synth.gain.value=db(SYNTHDB); master.connect(comp).connect(ls).connect(this.synth).connect(this.fin); }
  // returns the node to connect into; its output goes to `dest`
  width(w,dest){ const ctx=this.ctx; if(!(w<1)) return dest;
    const inp=ctx.createGain(), sp=ctx.createChannelSplitter(2), mg=ctx.createChannelMerger(2), a=(1+w)/2, b=(1-w)/2;
    inp.channelCountMode='explicit'; inp.channelCount=2; inp.connect(sp);
    for(const [i,o,k] of [[0,0,a],[1,0,b],[0,1,b],[1,1,a]]){ const g=ctx.createGain(); g.gain.value=k; sp.connect(g,i); g.connect(mg,0,o); }
    mg.connect(dest); return inp; }
  ir(sec,decay){ const ctx=this.ctx, n=Math.floor(sec*ctx.sampleRate), b=ctx.createBuffer(2,n,ctx.sampleRate);
    for(let c=0;c<2;c++){ const d=b.getChannelData(c); let lp=0; for(let i=0;i<n;i++){ const t=i/n, pre=i<ctx.sampleRate*.012?0:1; lp+=(Math.random()*2-1-lp)*(.55-.4*t); d[i]=pre*lp*Math.pow(1-t,decay); } }
    return b; }
  load(id){
    if(!this.buf.has(id)){
      const c=this.clips[id];
      const pending=(this.pack?this.packSlice(id):c?fetch(this.base+c.file).then(r=>r.arrayBuffer()).then(a=>this.ctx.decodeAudioData(a)):Promise.resolve(null))
        .then(b=>{ if(b) this.decoded.set(id,b); return b; }).catch(()=>null);
      this.buf.set(id,pending);
    }
    return this.buf.get(id);
  }
  // public build: no loose sound files, one MP3 pack per class (tools/pack.py). packCls = the class in play, looked up first.
  usePack(index,ver=''){ this.pack=index; this.packVer=ver; this.packAb=new Map(); }
  packData(cls){ if(!this.packAb.has(cls)) this.packAb.set(cls,fetch(this.base+'pack/'+cls+'.bin'+(this.packVer||'')).then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })); return this.packAb.get(cls); }
  // MP3 starts with encoder delay: decode the pack's click (written at calib_at s) once and trim every clip by the same lead
  packSkip(cls){ if(!this.skipP) this.skipP=this.packData(cls).then(ab=>{ const [o,n]=this.pack.packs[cls]._calib; return this.ctx.decodeAudioData(ab.slice(o,o+n)); })
      .then(b=>{ const d=b.getChannelData(0); let k=0, pk=0; for(let i=0;i<d.length;i++) if(Math.abs(d[i])>pk){ pk=Math.abs(d[i]); k=i; } return Math.max(0,Math.round(k-this.pack.calib_at*b.sampleRate)); });
    return this.skipP; }
  async packSlice(id){ const P=this.pack.packs, cls=P[this.packCls]?.[id]?this.packCls:Object.keys(P).find(c=>P[c][id]); if(!cls) return null;
    const [ab,skip]=await Promise.all([this.packData(cls),this.packSkip(cls)]); const [o,n]=P[cls][id];
    const b=await this.ctx.decodeAudioData(ab.slice(o,o+n)); if(!skip||skip>=b.length) return b;
    const t=this.ctx.createBuffer(b.numberOfChannels,b.length-skip,b.sampleRate); for(let c=0;c<b.numberOfChannels;c++) t.copyToChannel(b.getChannelData(c).subarray(skip),c); return t; }
  async preload(skill,cand){ this.graph(); const d=this.cand(skill,cand); if(!d) return; const ids=new Set(); for(const q of d.cues) for(const l of q.layers) (l.alt||[l.clip]).concat(l.clip).forEach(i=>ids.add(i)); await Promise.all([...ids].map(i=>this.load(i))); }
  cand(skill,cand){ return this.designs?.skills?.[skill]?.candidates?.[cand]||null; }
  resume(){ this.graph(); return this.ctx.resume(); }
  now(){ return this.graph().currentTime; }
  stopAll(){ this.epoch++; this.unfollow(); for(const v of this.voices){ try{ v.src.stop(); }catch(_){} } this.voices=[]; if(this.ctx){ const t=this.ctx.currentTime; for(const g of [this.world,...Object.values(this.bus)]){ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(1,t); } } }
  // schedule every time-based cue of a skill candidate; t0 = audio time of the cast (default: now + tiny lead)
  cast(skill,cand,t0){ this.graph(); const d=this.cand(skill,cand); if(!d) return null; t0=t0??this.ctx.currentTime+.01; this.castT[skill]=t0;
    for(const q of d.cues){ if(q.on==='hit') continue; for(const at of (q.times||[q.at||0])) this.cue(q,t0+at,1,d.trim); }
    return {t0,dur:d.dur}; }
  // game-clock sync: cues are released a little ahead of the game's own clock and placed at now + (cue - clock).
  // Each cue is sent early enough for its earliest layer (aligned whooshes / reverse swells start before the cue) and its hush.
  follow(skill,cand,clock,look=.06){ this.graph(); const d=this.cand(skill,cand); if(!d) return null; this.unfollow(skill);
    const items=[]; for(const q of d.cues){ if(q.on==='hit') continue; const lead=Math.max(0,-Math.min(0,...q.layers.map(l=>l.delay||0)),q.hush?(q.hush.pre??.12)+.03:0);
      for(const at of (q.times||[q.at||0])) items.push({q,at,lead}); }
    items.sort((a,b)=>(a.at-a.lead)-(b.at-b.lead)); this.castT[skill]=this.ctx.currentTime-clock();
    const tick=()=>{ const g=clock(), now=this.ctx.currentTime; this.castT[skill]=now-g;
      while(items.length&&items[0].at-items[0].lead<=g+look){ const it=items.shift(); this.cue(it.q,now+Math.max(0,it.at-g),1,d.trim); }
      if(!items.length) this.unfollow(skill); };
    this.timers=this.timers||new Map(); this.timers.set(skill,setInterval(tick,8)); tick(); return {dur:d.dur}; }
  unfollow(skill){ if(!this.timers) return; for(const [k,h] of this.timers) if(skill==null||k===skill){ clearInterval(h); this.timers.delete(k); } }
  // a confirmed contact reported by the game (kind matches cue.kind). n = enemies hit in that frame
  hit(skill,cand,kind,n=1){ const d=this.cand(skill,cand); if(!d) return; const t=this.ctx.currentTime, rel=t-(this.castT[skill]??t);
    for(const q of d.cues){ if(q.on!=='hit'||(q.kind||'hit')!==kind) continue; if(q.win&&(rel<q.win[0]||rel>q.win[1])) continue; const key=skill+cand+q.id, last=this.hitClock.get(key)||-9;
      if(t-last<(q.cool??.045)) continue; this.hitClock.set(key,t);
      // several enemies in one frame -> one voice, a little louder and wider, never n voices
      this.cue(q,t+(q.lag||0),Math.min(1.6,1+.18*Math.log2(Math.max(1,n))),d.trim); } }
  cue(q,t,boost,trim=0){ const ctx=this.ctx; boost*=db(trim||0);
    if(q.hush){ const g=this.world.gain, a=t-(q.hush.pre??.12); g.cancelScheduledValues(a-.03); g.setValueAtTime(1,Math.max(ctx.currentTime,a-.03)); g.linearRampToValueAtTime(db(q.hush.db??-18),a+.02); g.setValueAtTime(db(q.hush.db??-18),t-.004); g.linearRampToValueAtTime(1,t+(q.hush.back??.35)); }
    if(q.duck){ for(const b of (q.duck.buses||['swing','fx','amb'])){ const g=this.bus[b].gain; g.cancelScheduledValues(t); g.setTargetAtTime(db(q.duck.db??-7),t,.006); g.setTargetAtTime(1,t+(q.duck.hold??.08),(q.duck.rel??.18)/3); } }
    const live=this.voices.filter(v=>v.q===q&&v.end>t).length; if(live>=(q.voices??3)) return;
    for(const l of q.layers){ if(l.p!=null&&Math.random()>l.p) continue; this.layer(q,l,t,boost); }
    this.listeners.forEach(f=>f(q,t)); }
  pickClip(l){ const pool=l.alt?[l.clip,...l.alt]:[l.clip]; if(pool.length<2) return pool[0]; const k=(this.rr.get(l)||0)+1; this.rr.set(l,k); return pool[k%pool.length]; }
  async layer(q,l,t,boost){ const id=this.pickClip(l), epoch=this.epoch;
    // A warmed cue must reach Web Audio inside the hit callback. Even awaiting a resolved promise waits for render().
    const b=this.decoded.get(id)||await this.load(id); if(!b||epoch!==this.epoch) return; const ctx=this.ctx;
    // voice cap: drop the quietest old voice instead of piling up
    this.voices=this.voices.filter(v=>v.end>ctx.currentTime); if(this.voices.length>=this.maxVoices){ const v=this.voices.sort((a,b)=>a.prio-b.prio||a.start-b.start).shift(); try{ v.g.gain.setTargetAtTime(0,ctx.currentTime,.01); v.src.stop(ctx.currentTime+.05); }catch(_){} }
    const s=ctx.createBufferSource(); s.buffer=b; const cents=(l.cents||0)+(l.jit?(Math.random()*2-1)*l.jit:0); s.playbackRate.value=Math.pow(2,cents/1200)*(l.rate||1);
    const g=ctx.createGain(); g.gain.value=db(l.gain||0)*boost; const p=ctx.createStereoPanner(); p.pan.value=Math.max(-1,Math.min(1,(l.pan||0)+(l.panJit?(Math.random()*2-1)*l.panJit:0)));
    let head=s; if(l.lp||l.hp){ const f=ctx.createBiquadFilter(); f.type=l.lp?'lowpass':'highpass'; f.frequency.value=l.lp||l.hp; head.connect(f); head=f; }
    head.connect(g).connect(p); const bus=l.hero?(l.bus==='low'?this.heroLow:this.hero):this.bus[l.bus||'fx']; p.connect(bus);
    if(l.send){ const sg=ctx.createGain(); sg.gain.value=l.send; p.connect(sg).connect(this.send); }
    // reactive cues fire at the moment of the game call: skip the clip's pre-roll so its transient is heard at once
    const off=q.reactive?Math.min(.05,(this.clips[id]?.onset_ms||0)/1000):0;
    const st=Math.max(ctx.currentTime,t+(l.delay||0)), dur=(b.duration-off)/s.playbackRate.value; s.start(st,off);
    if(l.until!=null){ const e=t+l.until; g.gain.setValueAtTime(g.gain.value,Math.max(st,e-.03)); g.gain.linearRampToValueAtTime(0,Math.max(st+.001,e)); s.stop(Math.max(st+.002,e+.01)); }
    if(l.cut){ g.gain.setValueAtTime(g.gain.value,st+l.cut); g.gain.linearRampToValueAtTime(0,st+l.cut+.06); s.stop(st+l.cut+.07); }
    const v={q,grp:q.grp,src:s,g,start:st,end:st+(l.cut?l.cut+.07:dur),prio:l.prio??(l.hero?3:1)}; this.voices.push(v); s.onended=()=>{ s.disconnect(); g.disconnect(); }; }
  // fade out every voice of one sustained sound (drone / beam handles returned to the game)
  stopGroup(grp,fade=.25){ const t=this.ctx.currentTime; for(const v of this.voices) if(v.grp===grp){ try{ v.g.gain.setTargetAtTime(0,t,fade/3); v.src.stop(t+fade+.05); }catch(_){} } }
  // the picture is fading out: close every tail that is still ringing (voices older than `age`) before the effect is gone
  fadeOld(age=.25,tc=.13){ if(!this.ctx) return; const t=this.ctx.currentTime; for(const v of this.voices) if(v.end>t&&t-v.start>age&&!v.faded){ v.faded=1; try{ v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0,t,tc); v.src.stop(t+tc*5); }catch(_){} v.end=t+tc*5; } }
  // visual gate: feed it the screen's effect activity every frame; when the activity has fallen to the last fifth of its
  // peak and stays there, the tails are closed. A new burst re-arms it.
  gate(a){ const G=this.G||(this.G={base:a,peak:a,low:0,done:false,hist:[]}); const t=performance.now()/1000; G.hist.push([t,a]); while(G.hist.length&&t-G.hist[0][0]>6) G.hist.shift();
    G.base=Math.min(...G.hist.map(h=>h[1])); if(a>G.peak) G.peak=a;
    if(this.bedG){ const lv=Math.pow(Math.max(0,Math.min(1,(a-G.base-4)/55)),.7); this.bedG.gain.setTargetAtTime(lv*db(this.bedDb),this.ctx.currentTime,.06); } const span=G.peak-G.base; if(span<6){ G.peak=Math.max(a,G.base); G.done=false; return; }
    const thr=G.base+.22*span; if(a>thr){ G.low=0; G.done=false; return; }
    if(!G.low) G.low=t; if(!G.done&&t-G.low>.18){ G.done=true; this.fadeOld(); G.peak=a; } }
  // effect bed: a class texture that loops under the action and follows how much effect is on screen (see gate()),
  // so the space between hits is never empty and it leaves with the picture
  async setBed(clip,gainDb=-14){ this.graph(); if(this.bedId===clip) return; this.bedId=clip; const ctx=this.ctx;
    if(this.bedS){ try{ this.bedG.gain.setTargetAtTime(0,ctx.currentTime,.1); this.bedS.stop(ctx.currentTime+.5); }catch(_){} this.bedS=null; }
    if(!clip) return; const b=await this.load(clip); if(!b||this.bedId!==clip) return;
    const s=ctx.createBufferSource(); s.buffer=b; s.loop=true; const g=ctx.createGain(); g.gain.value=0; s.connect(g).connect(this.bus.amb);
    const sg=ctx.createGain(); sg.gain.value=.25; g.connect(sg).connect(this.send); s.start(); this.bedS=s; this.bedG=g; this.bedDb=gainDb; }
  meter(){ if(!this.analyser) return {peak:-120,rms:-120,gr:0}; const a=new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(a); let pk=0,s=0; for(const x of a){ pk=Math.max(pk,Math.abs(x)); s+=x*x; }
    return {peak:20*Math.log10(pk+1e-9),rms:20*Math.log10(Math.sqrt(s/a.length)+1e-9),gr:(this.glue.reduction||0)+(this.lim.reduction||0)}; }
}
window.SwordSFX=new Engine();
})();

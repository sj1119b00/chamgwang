/* ClassFX v2 — event-driven sound for every class except the swordsman (who has hand-timed cue sheets in designs.json).
 * The game calls a semantic sound at the exact moment of each action (SFX.whoosh / boom / fire / thunder / shatter,
 * SND.inhale / hit / gong / shing, Cn.hush, duck, K3.knock ...). install() wraps those calls at run time (game files are
 * not changed) and replays each as a STACK of library recordings chosen per class: a body in the mids, weight underneath,
 * an edge on top and a reverb tail. On top of the game's calls it adds what they do not carry:
 *   - a cast signature per skill (SIG) so every skill has its own entrance,
 *   - a bed under each ultimate (stinger + drone + riser) and a full climax stack on SND.hit,
 *   - loudness per class and tier (TRIM) so basic < skill < ultimate holds across classes.
 * Tails are closed by the visual gate (swsfx.js gate()) when the effect leaves the screen.
 * map() is pure (event -> [cue, time]) so the same code drives the offline video render (record mode). */
'use strict';
(()=>{
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dB=(v,ref)=>clamp(20*Math.log10(Math.max(v,.03)/ref),-14,4);
const ct=p=>clamp(700*Math.log2(p||1),-600,600);
const L=(clip,gain=0,o={})=>({clip,gain,...o});
const RR=(list,gain=0,o={})=>({clip:list[0],alt:list.slice(1),gain,...o});
const SW={bus:'swing'}, BL={bus:'blade'}, IM={bus:'impact'}, LO={bus:'low'}, FX={bus:'fx'}, AM={bus:'amb'};
const ASW=['A_swish_0','A_swish_1','A_swish_2','A_swish_3'], BWH=['B_whoosh_0','B_whoosh_1','B_whoosh_2','B_whoosh_3'];
const ASTAB=['A_stab_0','A_stab_1','A_stab_2','A_stab_3'], BTHD=['B_thud_0','B_thud_1','B_thud_2','B_thud_3'], ATHD=['A_thud_0','A_thud_1','A_thud_2','A_thud_3'];
const PUNCH=['K_punch_0','K_punch_1','K_punch_2','K_bat_0','K_bat_1'], JAB=['K_jab_0','K_jab_1','K_jab_2'], WOOD=['K_wood_0','K_wood_1','K_wood_2'];
const KNIFE=['K_knife_0','K_knife_1'], ROCK=['K_rock_0','K_rock_1'], HEART=['K_heart_0','K_heart_1'], ETH=['K_ether_0','K_ether_1'], GB=['G_boom_a','G_boom_b'];
// ranged classes (gunner / archer)
const PIST=['R_pistol_0','R_pistol_1','R_pistol_2','R_pistol_3'], SMG=['R_smg_0','R_smg_1','R_smg_2','R_smg_3'], CASE=['R_casing_0','R_casing_1','R_casing_2','R_casing_3'];
const RICO=['R_rico_0','R_rico_1','R_rico_2','R_rico_3'], BHIT=['R_bhit_0','R_bhit_1','R_bhit_2','R_bhit_3'], SWITCH=['R_switch_0','R_switch_1','R_switch_2'];
const AHIT=['R_ahit_0','R_ahit_1','R_ahit_2'], TWANG=['R_twang_0','R_twang_1','R_twang_2'], CREAK=['R_creak_1','R_creak_0'];

// Named stages come from the animation, projectile, and zone callbacks in sk_fist.js.
// The dry sleeve moves with the hand. Only a confirmed contact gets the close body mic.
const BODY_HITS=['F_body_0','F_body_1','F_body_2'];
const FIST={
  fs_basic:{
    swing:([i=0])=>[L(i%2?'F_swish_1':'F_swish_0',i===3?-2:-5,{...SW,cents:i===3?-220:80*i,pan:i%2?.16:-.16})],
    contact:([i=0])=>i===3
      ?[L('F_upper',-1,IM),L('A_lowthud',-7,LO),L('C_air_impact',-12,{...FX,hp:480,until:.28})]
      :[L(BODY_HITS[i],-2,{...IM,jit:45}),L('A_lowthud',i===2?-10:-15,{...LO,until:.15})],
  },
  fs_dash:{
    swing:()=>[L('F_swish_1',-1,SW),L('C_doppler',-8,{...SW,until:.19})],
    contact:([end])=>[L(end?'F_upper':'F_body_1',end?1:-3,IM)],
    finish:()=>[L('F_release',0,{...FX,cents:-180}),L('A_lowthud',-2,LO)],
  },
  fs_upper:{
    charge:()=>[L('F_swish_0',-5,{...SW,cents:-320})],
    release:()=>[L('F_release',-4,{...FX,cents:220,send:.09}),L('C_air_impact',-8,{...LO,lp:400})],
    contact:()=>[L('F_upper',0,IM)],
    finish:()=>[L('K_rock_0',-5,{...IM,until:.32}),L('F_body_0',-6,{...LO,cents:-250})],
  },
  fs_ki:{
    charge:()=>[L('F_draw',-1,FX)],
    // user 2026-11-26: the ball in flight was nearly silent; it should read "저음 지이이이잉 → 펑". A rising saw whine and a low
    // tone ride the flight (group 'ki') and are cut at the burst, which then lands bigger.
    release:()=>[L('F_release',0,FX),L('C_doppler',-8,{...SW,until:.24,pan:.16}),L('H_saw',-2,{...FX,grp:'ki',until:1.8}),L('H_low',-3,{...LO,grp:'ki',until:1.8})],
    contact:()=>[L('C_zap',-9,{...FX,until:.09}),L('F_body_2',-8,{...IM,hp:300})],
    burst:()=>[{stop:'ki',fade:.05},L('F_burst',1,{...IM,send:.14}),L('C_surge',-7,{...FX,until:.52})],
  },
  fs_stomp:{
    charge:()=>[L('F_draw',-6,{...FX,rate:1.72})],
    burst:([echo])=>[L(echo?'K_rock_1':'K_rock_0',echo?-4:0,IM),L('F_burst',echo?-6:-3,{...LO,cents:-180}),
      L('K_brick',-11,{...AM,delay:.045,pan:echo?-.32:.32,send:.2})],
  },
  fs_rush:{
    swing:([last,i=0])=>[L(i%2?'F_swish_0':'F_swish_1',last?-6:-10,{...SW,pan:i%2?.25:-.25,rate:last?1.2:1.7,until:last?.11:.055})],
    contact:([last,i=0])=>last?[L('F_upper',-1,IM),L('F_burst',-7,{...LO,lp:420})]
      :[L(BODY_HITS[i%3],-5,{...IM,pan:i%2?.12:-.12,until:.085})],
  },
  fs_tornado:{
    release:()=>[L('C_wind_rush',-3,{...SW,send:.12}),L('F_swish_0',-5,SW)],
    pulse:()=>[L('F_swish_1',-7,{...SW,jit:130,until:.16}),L('C_tex_whoosh',-13,{...FX,rate:1.7,until:.21})],
    finish:()=>[L('C_air_impact',-3,{...FX,send:.12}),L('F_burst',-5,{...LO,lp:550})],
  },
  fs_aura:{
    charge:()=>[L('F_compress',-4,FX),L('K_bell_low',-9,{...FX,send:.18,until:.75})],
    pulse:()=>[L('K_heart_0',-7,{...LO,until:.22}),L('K_bell',-12,{...FX,cents:260,until:.29})],
    finish:()=>[L('C_crystal',-9,{...FX,send:.18,until:.38})],
  },
  fs_giga:{
    charge:()=>[L('F_compress',-1,FX),L('H_two',-6,{...FX,fit:.45,endAt:true}),L('H_low',-8,{...LO,until:.5})],
    release:()=>[L('F_release',-1,{...FX,cents:-290}),L('F_burst',-2,{...LO,lp:540}),L('C_air_impact',-6,{...SW,send:.14})],
    contact:()=>[L('F_upper',-3,IM)],
    burst:([i=1])=>[L(i%2?'K_rock_0':'K_rock_1',-5-i*.9,{...IM,rate:1.3,until:.17,pan:(i-3)*.13})],
  },
};

// ---------------------------------------------------------------- recipes: (args, ctx) -> layers
// s = size of a boom (game arg): <.8 small contact, <1.5 a blow, above that a blast. v = the game's own volume for the call.
const BASE={
  whoosh:([p=1,v=.6])=>p>=1.2?[RR(ASW,dB(v,.6)-2,{jit:90,cents:ct(p)*.4,...SW}),RR(BWH,dB(v,.6)-9,{jit:70,...SW})]
    :p<.75?[L('B_swing_low',dB(v,.7)-1,{cents:ct(p)*.4,send:.12,...SW}),L('B_power_whoosh',dB(v,.7)-6,{...SW})]
    :[RR(BWH,dB(v,.6)-2,{jit:70,cents:ct(p)*.3,...SW}),L('B_swing_design',dB(v,.6)-8,{...SW})],
  slash:([p=1,v=1])=>[RR(ASTAB,dB(v,.8)-4,{jit:90,cents:ct(p)*.3,...IM}),RR(ASW,dB(v,.8)-7,{jit:90,...SW}),L('A_slash',dB(v,.8)-9,{...IM})],
  boom:([s=1,v=1])=>s<.8?[RR(BTHD,dB(v,.5)-3,{jit:80,...IM}),L('B_punch_wet',dB(v,.5)-8,{...IM})]
    :s<1.5?[RR(BTHD,dB(v,.8)-2,{...IM}),L('B_slasher',dB(v,.8)-4,{...IM}),L('B_boom_chef',dB(v,.8)-6,{cut:1.1,...LO}),L('A_debris',dB(v,.8)-14,{delay:.05,send:.2,...AM})]
    :[L('G_impact',dB(v,1)-2,{...IM}),L('B_boom_modern',dB(v,1)-3,{...LO}),L('B_explosion',dB(v,1)-5,{send:.2,...IM}),L('B_downer_fast',dB(v,1)-7,{...LO}),L('B_collapse',dB(v,1)-13,{delay:.15,send:.2,...AM})],
  shatter:([v=1])=>[L('C_glass',dB(v,1)-10,{jit:200,...FX}),L('K_brick',dB(v,1)-12,{jit:150,...IM}),L('A_debris',dB(v,1)-18,{...AM})],
  thunder:([v=1])=>[L('K_thunder_strike',dB(v,1)-3,{send:.2,...LO}),L('C_surge',dB(v,1)-8,{...FX}),L('C_zap',dB(v,1)-10,{...FX})],
  fire:([d=2,v=.7])=>[L(d>1.2?'C_fire_burst':'K_flamer',dB(v,.7)-4,{until:Math.max(.5,d),send:.1,...FX}),L('C_fire_growl',dB(v,.7)-8,{...LO}),...(d>1.5?[L('K_fire_loop',dB(v,.7)-8,{until:d+.2,...AM})]:[])],
  fireball:([v=1])=>[L('C_torch',dB(v,1)-3,{...FX}),L('C_fire_growl',dB(v,1)-6,{...LO}),L('K_flamer',dB(v,1)-10,{until:.9,...FX})],
  rise:([d=1.2,v=.5])=>[L('G_riser',dB(v,.5)-4,{fit:d,endAt:true,...FX}),L('K_matter_grow',dB(v,.5)-8,{fit:d,endAt:true,...FX})],
  rumble:([d=2])=>[L('K_quake',-5,{until:d+.3,...LO}),L('B_rumble',-10,{until:d+.3,...AM})],
  roar:([d=2,v=1])=>[L('K_roar',dB(v,1)-2,{until:d+.4,send:.2,...LO}),L('K_growl',dB(v,1)-8,{delay:.08,...LO})],
  choir:([d=4])=>[L('K_choir',-6,{until:d,send:.25,...AM}),L('K_heaven',-10,{until:d,send:.25,...AM})],
  charge:()=>[L('C_fmw_fx',-5,{...FX}),L('C_charge_down',-10,{...FX})],
  sub:([v=1])=>[L('B_downer_fast',dB(v,1)-4,{...LO}),L('G_downer',dB(v,1)-8,{...LO})],
  click:()=>[L('A_click',-4,{...BL}),L('A_lowthud',-10,{...LO})],
  bell:([v=1])=>[L('K_bell',dB(v,1)-6,{send:.2,...FX}),L('K_bell_low',dB(v,1)-8,{send:.2,...FX})],
  heart:([v=1])=>[RR(HEART,dB(v,1)-3,{...LO}),RR(HEART,dB(v,1)-6,{delay:.3,...LO})],
  siren:([d=2])=>[L('K_alarm',-9,{until:d,...AM})],
  inhale:([d=1,v=.5])=>[L(d>1.5?'B_rev_flutter':'B_rev_trans',dB(v,.5)-3,{fit:d,endAt:true,...FX}),L('G_riser',dB(v,.5)-9,{fit:d,endAt:true,...FX})],
  // the climax: every big body at once, tails with long reverb (the visual gate decides how long they may ring)
  hit:([v=1])=>[L('B_boom_cav',dB(v,1),{...LO}),L('G_impact',dB(v,1)-1,{...IM}),L('B_explosion',dB(v,1)-3,{send:.2,...IM}),L('B_downer_fast',dB(v,1)-4,{...LO}),
    L('B_slasher',dB(v,1)-5,{...IM}),L('B_thunder',dB(v,1)-9,{delay:.12,send:.3,...AM}),L('B_collapse',dB(v,1)-10,{delay:.28,send:.2,...AM})],
  shing:([p=1,v=.6])=>[L('A_ring',dB(v,.6)-8,{cents:ct(p)*.4,cut:.45,...BL})],
  tick:([p=1,v=.25])=>[L('A_click',dB(v,.25)-10,{cents:ct(p)*.5,...BL})],
  gong:([v=1])=>[L('K_gong',dB(v,1)-2,{send:.25,...LO}),RR(GB,dB(v,1)-8,{...LO})],
  cut:()=>[L('A_hi_swing',-4,{...SW}),L('A_click',-4,{...BL}),L('B_deep_thud',-6,{cut:.9,...LO}),L('A_slash',-6,{...IM})],
  drone:([f=55,v=.35])=>[L('K_drone_dark',dB(v,.35)-3,{...AM}),L('K_drone',dB(v,.35)-8,{...AM})],
  beam:()=>[L('K_beam',-6,{...FX}),L('K_beam_low',-5,{...LO}),L('C_surge',-8,{...FX})],
  knock:()=>[RR(BTHD,-6,{jit:80,...IM}),RR(ASTAB,-12,{...BL})],
  vblast:()=>[], shock:()=>[RR(ROCK,-8,{...LO}),L('A_debris',-16,{send:.15,...AM})],
  // ultimate bed (at the cast) and the lead-in that ends on the climax
  bed:()=>[L('G_stinger',-6,{...LO}),L('K_drone_dark',-10,{until:3.5,...AM}),L('G_riser_long',-12,{...FX})],
  sig:()=>[RR(BWH,-6,{...SW})],
  lead:'B_rev_flutter',
};
const CLASSES={
  // 암살자: 얇은 칼날 여러 겹 + 그림자 숨결, 타격마다 짧은 저역 받침
  assassin:{
    slash:([p=1,v=1])=>[RR(KNIFE,dB(v,.8)-4,{jit:120,...BL}),RR(ASTAB,dB(v,.8)-2,{jit:120,...IM}),RR(ASW,dB(v,.8)-6,{jit:90,...SW}),L('A_slash',dB(v,.8)-7,{jit:80,...IM}),RR(ATHD,dB(v,.8)-10,{...LO})],
    whoosh:([p=1,v=.6])=>[RR(ASW,dB(v,.6)-2,{jit:120,cents:ct(p)*.4,...SW}),L('A_hi_swing',dB(v,.6)-6,{...SW}),L('K_breath',dB(v,.6)-10,{send:.2,...AM})],
    shing:([p=1,v=.6])=>[RR(KNIFE,dB(v,.6)-4,{cents:ct(p)*.3,...BL}),L('A_scrape_up',dB(v,.6)-10,{...BL})],
    knock:()=>[RR(ASTAB,-4,{jit:150,...IM}),RR(ATHD,-9,{...LO})],
    boom:([s=1,v=1])=>s<1.2?[L('A_slash',dB(v,.7)-3,{...IM}),RR(BTHD,dB(v,.7)-6,{...IM}),L('A_lowthud',dB(v,.7)-6,{...LO})]:[L('G_impact',dB(v,1)-3,{...IM}),L('A_slash',dB(v,1)-3,{...IM}),L('B_boom_chef',dB(v,1)-4,{cut:1.3,...LO}),L('K_ether_0',-10,{send:.3,...AM})],
    hit:([v=1])=>[L('A_slash',dB(v,1),{...IM}),L('B_slasher',dB(v,1)-2,{...IM}),L('G_impact',dB(v,1)-3,{...IM}),L('B_boom_cav',dB(v,1)-2,{...LO}),L('B_downer_fast',dB(v,1)-4,{...LO}),
      L('C_glass',dB(v,1)-8,{delay:.03,send:.2,...FX}),L('K_ether_0',-8,{delay:.1,send:.35,...AM}),L('K_portal',-10,{delay:.2,send:.3,...AM})],
    gong:([v=1])=>[L('K_gong',dB(v,1)-4,{send:.3,...LO}),L('K_breath',-8,{send:.2,...AM}),L('G_stinger',-10,{...LO})],
    inhale:([d=1,v=.5])=>[L('K_breath',dB(v,.5)-2,{fit:d,endAt:true,send:.2,...FX}),L('C_rev_demon',dB(v,.5)-6,{fit:d,endAt:true,...FX})],
    drone:([f=55,v=.35])=>[L('K_drone',dB(v,.35)-4,{...AM}),L('K_portal',dB(v,.35)-10,{...AM})],
    bed:()=>[L('G_stinger',-7,{...LO}),L('K_drone',-9,{until:3.5,...AM}),L('K_portal',-9,{send:.3,...AM}),L('K_breath',-8,{...FX})],
    sig:()=>[L('A_hi_swing',-5,{...SW}),L('K_breath',-9,{send:.2,...AM})],
    lead:'C_rev_demon',
  },
  // 버서커(도끼): 무거운 스윙 + 쪼개는 금속 + 몸통 둔탁 + 화염 폭발
  axe:{
    slash:([p=1,v=1])=>[L('B_swing_low',dB(v,.8)-2,{cents:ct(p)*.3,...SW}),RR(BTHD,dB(v,.8)-2,{jit:80,...IM}),L('B_slasher',dB(v,.8)-6,{...IM}),L('A_metal_hit',dB(v,.8)-12,{...BL}),L('A_lowthud',dB(v,.8)-6,{...LO})],
    whoosh:([p=1,v=.6])=>[L(p<1?'B_swing_low':'B_swing_design',dB(v,.6)-2,{cents:ct(p)*.3,...SW}),L('B_power_whoosh',dB(v,.6)-7,{...SW}),L('C_fire_growl',dB(v,.6)-12,{...FX})],
    boom:([s=1,v=1])=>s<1?[RR(BTHD,dB(v,.6)-2,{...IM}),L('A_ground',dB(v,.6)-5,{...IM}),L('B_boom_chef',dB(v,.6)-8,{cut:1,...LO}),L('C_torch',dB(v,.6)-10,{...FX})]
      :[L('A_ground',dB(v,.8)-1,{...IM}),L('G_impact',dB(v,.8)-3,{...IM}),L('B_boom_chef',dB(v,.8)-3,{cut:1.6,...LO}),L('G_mine',dB(v,.8)-6,{send:.2,...IM}),L('C_fire_burst',dB(v,.8)-9,{until:1.2,...FX}),L('B_collapse',dB(v,.8)-13,{delay:.12,send:.2,...AM})],
    vblast:()=>[L('C_torch',-9,{jit:200,...FX}),L('C_fire_growl',-14,{...LO})],
    fire:([d=2,v=.7])=>[L(d>1.2?'C_fire_burst':'K_flamer',dB(v,.7)-3,{until:Math.max(.5,d),send:.1,...FX}),L('C_fire_growl',dB(v,.7)-6,{...LO}),L('K_fire_loop',dB(v,.7)-8,{until:d+.2,...AM})],
    knock:()=>[RR(BTHD,-4,{jit:80,...IM}),RR(ASTAB,-11,{...BL}),L('A_lowthud',-9,{...LO})],
    hit:([v=1])=>[L('B_boom_metal',dB(v,1),{...LO}),L('C_fire_impact',dB(v,1)-1,{...LO}),L('G_impact',dB(v,1)-1,{...IM}),L('B_slasher',dB(v,1)-3,{...IM}),L('G_mine',dB(v,1)-4,{send:.2,...IM}),
      L('G_downer',dB(v,1)-5,{...LO}),L('C_fire_burst',dB(v,1)-8,{delay:.1,until:2.2,send:.15,...FX}),L('B_collapse',dB(v,1)-9,{delay:.25,send:.2,...AM})],
    roar:([d=2,v=1])=>[L('K_roar',dB(v,1),{until:d+.4,send:.2,...LO}),L('C_fire_growl',dB(v,1)-4,{...FX}),L('K_growl',dB(v,1)-6,{delay:.1,...LO})],
    bed:()=>[L('G_stinger',-5,{...LO}),L('K_drone_dark',-9,{until:3.5,...AM}),L('K_growl',-8,{send:.2,...LO}),L('K_fire_loop',-10,{until:3,...AM})],
    sig:()=>[L('B_swing_design',-4,{...SW}),L('C_fire_growl',-12,{...FX})],
    lead:'B_rev_flutter',
  },
  // 격투가: 주먹 타격 3겹(가죽·뼈·저역) + 짧은 바람 + 바위 구르기 + 기 폭발
  fist:{
    inhale:([d=1,v=.5])=>d<=.55
      ?[L(d<=.4?'F_draw':'F_compress',dB(v,.5)-4,{fit:d,endAt:true,...FX})]
      :[L('K_matter_grow',dB(v,.5)-7,{fit:d,endAt:true,...FX}),L('C_magic_flow',dB(v,.5)-14,{until:d,...AM})],
    whoosh:([p=1,v=.6])=>p>=1.2?[RR(JAB,dB(v,.5)-1,{jit:120,...SW}),RR(ASW,dB(v,.5)-8,{...SW})]:[RR(BWH,dB(v,.6)-2,{jit:80,cents:ct(p)*.3,...SW}),RR(JAB,dB(v,.6)-6,{...SW}),L('B_swing_design',dB(v,.6)-9,{...SW})],
    boom:([s=1,v=1])=>s<.8?[RR(PUNCH,dB(v,.4)-1,{jit:120,...IM}),L('K_smack',dB(v,.4)-6,{jit:100,...IM}),L('A_lowthud',dB(v,.4)-8,{...LO})]
      :s<1.5?[RR(PUNCH,dB(v,.8),{jit:80,...IM}),L('K_punch_deep',dB(v,.8)-3,{...LO}),L('B_punch_wet',dB(v,.8)-5,{...IM}),L('B_boom_chef',dB(v,.8)-8,{cut:1,...LO}),L('C_air_impact',dB(v,.8)-12,{send:.2,...FX})]
      :[L('K_rock_1',dB(v,1)-1,{...IM}),L('G_impact',dB(v,1)-2,{...IM}),L('K_punch_deep',dB(v,1)-2,{...LO}),L('B_boom_chef',dB(v,1)-3,{cut:1.5,...LO}),L('C_air_impact',dB(v,1)-6,{send:.2,...FX}),L('A_debris',dB(v,1)-12,{delay:.06,send:.2,...AM})],
    tick:([p=1,v=.25])=>[RR(WOOD,dB(v,.25)-10,{jit:100,...BL})],
    knock:()=>[RR(PUNCH,-5,{jit:150,...IM}),L('K_smack',-11,{jit:100,...IM})],
    shock:()=>[RR(ROCK,-5,{...IM}),L('B_boom_chef',-9,{cut:1.2,...LO}),L('A_debris',-13,{send:.2,...AM})],
    vblast:()=>[L('C_air_impact',-9,{jit:150,send:.2,...FX}),L('C_surge',-14,{...FX})],
    rise:([d=1.2,v=.5])=>[L('C_fmw_fx',dB(v,.5)-3,{...FX}),L('G_riser',dB(v,.5)-6,{fit:d,endAt:true,...FX}),L('C_charge_down',dB(v,.5)-10,{...FX})],
    hit:([v=1])=>[L('K_punch_deep',dB(v,1),{...IM}),L('K_rock_1',dB(v,1)-1,{...IM}),L('G_impact',dB(v,1)-1,{...IM}),L('B_boom_cav',dB(v,1)-1,{...LO}),L('B_downer_fast',dB(v,1)-4,{...LO}),
      L('C_air_impact',dB(v,1)-4,{send:.25,...FX}),L('B_explosion',dB(v,1)-6,{send:.2,...IM}),L('B_collapse',dB(v,1)-10,{delay:.25,send:.2,...AM})],
    beam:()=>[L('C_surge',-4,{...FX}),L('K_beam_low',-4,{...LO}),L('K_beam',-8,{...FX}),L('C_fmw_fx',-8,{...FX})],
    bed:()=>[L('G_stinger',-6,{...LO}),L('K_drone_dark',-10,{until:3.5,...AM}),L('C_special',-8,{...FX}),L('C_wind_rush',-10,{...AM})],
    sig:()=>[RR(BWH,-4,{...SW}),RR(JAB,-6,{...SW})],
    lead:'B_rev_trans',
  },
  // 마법사: 얼음·크리스털 몸통 + 실제 천둥 + 마력 충돌, 넓은 잔향
  mage:{
    whoosh:([p=1,v=.6])=>[L('C_spell_whoosh',dB(v,.6)-2,{cents:ct(p)*.3,send:.15,...SW}),L('C_tex_whoosh',dB(v,.6)-7,{...SW}),L('K_chime',dB(v,.6)-14,{...FX})],
    boom:([s=1,v=1])=>s<1?[L('K_ice_hit',dB(v,.6)-3,{jit:150,...IM}),L('C_air_impact',dB(v,.6)-8,{send:.2,...IM}),L('C_zap',dB(v,.6)-12,{...FX}),L('A_lowthud',dB(v,.6)-8,{...LO})]
      :s<1.6?[L('C_air_impact',dB(v,.8)-1,{send:.2,...IM}),L('K_ice_magic',dB(v,.8)-4,{...FX}),L('K_ice_crack',dB(v,.8)-6,{...FX}),L('B_boom_chef',dB(v,.8)-6,{cut:1.2,...LO}),L('C_surge',dB(v,.8)-10,{...FX})]
      :[L('G_impact',dB(v,1)-2,{...IM}),L('C_air_impact',dB(v,1)-1,{send:.25,...IM}),L('B_boom_modern',dB(v,1)-3,{...LO}),L('C_crystal',dB(v,1)-5,{send:.2,...FX}),L('K_ice_crack',dB(v,1)-6,{...FX}),L('B_thunder',dB(v,1)-10,{delay:.1,send:.3,...AM})],
    shatter:([v=1])=>[L('K_ice_hit',dB(v,1)-5,{jit:200,...FX}),L('C_crystal',dB(v,1)-10,{jit:200,send:.2,...FX}),L('K_ice_crack',dB(v,1)-12,{jit:150,...FX})],
    thunder:([v=1])=>[L('K_thunder_strike',dB(v,1)-1,{send:.25,...LO}),L('C_surge',dB(v,1)-5,{...FX}),L('C_zap',dB(v,1)-8,{...FX}),L('B_boom_chef',dB(v,1)-8,{cut:1.2,...LO}),L('C_elec_cast',dB(v,1)-12,{until:1.4,...FX})],
    slash:([p=1,v=1])=>[L('C_energy_cut',dB(v,.8)-3,{jit:120,...IM}),L('K_plasma',dB(v,.8)-8,{jit:100,...FX}),L('C_zap',dB(v,.8)-14,{...FX})],
    tick:([p=1,v=.25])=>[L('C_zap',dB(v,.25)-14,{jit:300,...FX})],
    knock:()=>[L('K_ice_hit',-8,{jit:200,...IM}),L('C_energy_cut',-12,{jit:150,...IM})],
    shock:()=>[L('K_ice_magic',-5,{send:.2,...FX}),L('K_ice_freeze',-8,{...FX}),L('B_boom_chef',-10,{cut:1,...LO})],
    rise:([d=1.2,v=.5])=>[L('K_ice_magic',dB(v,.5)-4,{...FX}),L('G_riser',dB(v,.5)-5,{fit:d,endAt:true,...FX}),L('C_magic_flow',dB(v,.5)-10,{until:d+.3,send:.3,...AM})],
    rumble:([d=2])=>[L('K_quake',-6,{until:d+.3,...LO}),L('B_rumble',-8,{until:d+.3,...AM}),L('C_elec_cast',-12,{until:d,...FX})],
    hit:([v=1])=>[L('K_thunder_strike',dB(v,1),{send:.25,...LO}),L('G_impact',dB(v,1)-1,{...IM}),L('B_boom_cav',dB(v,1)-2,{...LO}),L('C_air_impact',dB(v,1)-2,{send:.25,...IM}),L('C_crystal',dB(v,1)-3,{send:.25,...FX}),
      L('G_downer',dB(v,1)-5,{...LO}),L('K_ice_crack',dB(v,1)-6,{delay:.08,...FX}),L('C_surge',dB(v,1)-7,{...FX}),L('C_magic_flow',-10,{delay:.2,send:.35,...AM})],
    shing:([p=1,v=.6])=>[L('K_chime',dB(v,.6)-4,{cents:ct(p)*.3,send:.25,...FX}),L('K_plasma',dB(v,.6)-10,{...FX})],
    drone:([f=55,v=.35])=>[L('K_drone',dB(v,.35)-3,{...AM}),L('C_magic_flow',dB(v,.35)-8,{send:.3,...AM})],
    bed:()=>[L('G_stinger',-7,{...LO}),L('K_drone',-8,{until:3.5,...AM}),L('C_dark_cast',-7,{send:.25,...FX}),L('C_air_charm',-10,{send:.3,...AM})],
    sig:()=>[L('C_spell_whoosh',-4,{send:.15,...SW}),L('C_texture',-9,{...FX})],
    lead:'C_rev_interf',
  },
  // 화염술사: 화염 분출 + 폭발 몸통 + 낮은 으르렁 + 잔불
  pyro:{
    whoosh:([p=1,v=.6])=>[L('C_torch',dB(v,.6)-2,{cents:ct(p)*.3,...SW}),RR(BWH,dB(v,.6)-7,{...SW}),L('C_fire_growl',dB(v,.6)-10,{...LO})],
    boom:([s=1,v=1])=>s<1.2?[L('C_torch',dB(v,.6)-2,{jit:150,...FX}),L('G_mine',dB(v,.6)-6,{send:.15,...IM}),RR(BTHD,dB(v,.6)-7,{...IM}),L('C_fire_growl',dB(v,.6)-8,{...LO})]
      :[L('C_fire_impact',dB(v,1)-1,{...LO}),L('B_explosion',dB(v,1)-2,{send:.2,...IM}),L('G_impact',dB(v,1)-3,{...IM}),L('G_mine',dB(v,1)-5,{...IM}),L('C_fire_burst',dB(v,1)-7,{until:1.6,send:.15,...FX}),L('B_collapse',dB(v,1)-13,{delay:.15,send:.2,...AM})],
    fire:([d=2,v=.7])=>[L(d>1.2?'C_fire_burst':'K_flamer',dB(v,.7)-2,{until:Math.max(.5,d),send:.12,...FX}),L('C_fire_growl',dB(v,.7)-5,{...LO}),L('K_fire_loop',dB(v,.7)-6,{until:d+.3,...AM}),L('C_torch',dB(v,.7)-8,{...FX})],
    fireball:([v=1])=>[L('C_torch',dB(v,1)-1,{...FX}),L('C_fire_growl',dB(v,1)-4,{...LO}),L('K_flamer',dB(v,1)-7,{until:.9,...FX}),L('C_doppler',dB(v,1)-10,{...SW})],
    vblast:()=>[L('C_torch',-8,{jit:250,...FX}),L('G_mine',-13,{jit:150,...IM})],
    shock:()=>[L('G_mine',-7,{send:.2,...IM}),L('C_fire_growl',-9,{...LO})],
    knock:()=>[L('C_torch',-10,{jit:250,...FX}),RR(BTHD,-10,{...IM})],
    hit:([v=1])=>[L('C_fire_impact',dB(v,1),{...LO}),L('B_explosion',dB(v,1)-1,{send:.2,...IM}),L('G_impact',dB(v,1)-2,{...IM}),L('G_mine',dB(v,1)-3,{send:.2,...IM}),L('B_boom_cav',dB(v,1)-3,{...LO}),
      L('G_downer',dB(v,1)-5,{...LO}),L('C_fire_burst',dB(v,1)-5,{delay:.08,until:2.6,send:.15,...FX}),L('K_fire_loop',-8,{delay:.2,until:3,...AM}),L('B_collapse',dB(v,1)-11,{delay:.3,send:.2,...AM})],
    roar:([d=2,v=1])=>[L('K_roar',dB(v,1),{until:d+.4,send:.25,...LO}),L('C_fire_growl',dB(v,1)-2,{...FX}),L('K_flamer',dB(v,1)-6,{until:d,...FX}),L('K_growl',dB(v,1)-6,{delay:.1,...LO})],
    bed:()=>[L('G_stinger',-6,{...LO}),L('K_drone_dark',-10,{until:3.5,...AM}),L('C_fire_growl',-6,{...FX}),L('K_fire_loop',-7,{until:3.5,...AM}),L('G_riser_long',-12,{...FX})],
    sig:()=>[L('C_torch',-3,{...FX}),L('K_flamer',-9,{until:.8,...FX})],
    lead:'B_rev_flutter',
  },
  // 주술사: 종·징 + 바위·대지 몸통 + 정령 숨결·성가풍 패드
  shaman:{
    whoosh:([p=1,v=.6])=>[RR(ETH,dB(v,.6)-3,{cents:ct(p)*.3,send:.25,...SW}),RR(BWH,dB(v,.6)-8,{...SW}),L('K_chime',dB(v,.6)-14,{...FX})],
    slash:([p=1,v=1])=>[RR(ETH,dB(v,.8)-7,{jit:150,send:.2,...SW}),RR(WOOD,dB(v,.8)-5,{jit:120,...IM}),L('K_plasma',dB(v,.8)-10,{jit:120,...FX})],
    boom:([s=1,v=1])=>s<1.2?[RR(ROCK,dB(v,.7)-3,{jit:150,...IM}),RR(WOOD,dB(v,.7)-8,{...BL}),L('B_boom_chef',dB(v,.7)-8,{cut:1,...LO}),L('A_debris',dB(v,.7)-13,{send:.2,...AM})]
      :[RR(ROCK,dB(v,1)-1,{...IM}),L('G_impact',dB(v,1)-2,{...IM}),L('B_boom_chef',dB(v,1)-3,{cut:1.6,...LO}),L('K_gong',dB(v,1)-9,{send:.3,...LO}),L('B_collapse',dB(v,1)-10,{delay:.1,send:.2,...AM}),RR(ETH,-12,{send:.3,...AM})],
    shatter:([v=1])=>[L('K_brick',dB(v,1)-9,{jit:250,...IM}),L('K_chime',dB(v,1)-14,{jit:300,send:.2,...FX}),L('A_debris',dB(v,1)-16,{...AM})],
    knock:()=>[RR(WOOD,-5,{jit:120,...IM}),L('K_brick',-12,{jit:200,...IM})],
    shock:()=>[RR(ROCK,-5,{...IM}),L('K_quake',-10,{until:1.2,...LO}),L('A_debris',-13,{send:.2,...AM})],
    bell:([v=1])=>[L('K_bell',dB(v,1)-9,{send:.3,...FX}),L('K_bell_low',dB(v,1)-9,{send:.3,...FX}),RR(ETH,dB(v,1)-12,{send:.3,...AM})],
    gong:([v=1])=>[L('K_gong',dB(v,1)-5,{send:.3,...LO}),L('K_gong_swell',-12,{fit:.4,endAt:true,...LO}),RR(GB,dB(v,1)-10,{...LO})],
    hit:([v=1])=>[L('K_gong',dB(v,1)-3,{send:.3,...LO}),L('K_rock_1',dB(v,1)-1,{...IM}),L('G_impact',dB(v,1)-2,{...IM}),L('B_boom_cav',dB(v,1)-2,{...LO}),L('G_downer',dB(v,1)-5,{...LO}),
      L('B_explosion',dB(v,1)-6,{send:.2,...IM}),L('B_collapse',dB(v,1)-8,{delay:.2,send:.2,...AM}),L('K_portal',-9,{delay:.15,send:.35,...AM}),L('K_moan',-12,{delay:.2,until:2.5,send:.3,...AM})],
    choir:([d=4])=>[L('K_moan',-6,{until:d,send:.3,...AM}),L('K_heaven',-8,{until:d,send:.3,...AM}),L('K_choir',-10,{until:d,...AM})],
    roar:([d=2,v=1])=>[L('K_growl',dB(v,1)-1,{until:d+.4,send:.25,...LO}),RR(ETH,dB(v,1)-6,{send:.3,...FX}),L('K_roar',dB(v,1)-6,{until:d+.4,...LO})],
    rumble:([d=2])=>[L('K_quake',-3,{until:d+.3,...LO}),L('B_rumble',-8,{until:d+.3,...AM}),L('A_debris',-12,{send:.2,...AM})],
    bed:()=>[L('G_stinger',-7,{...LO}),L('K_drone_dark',-10,{until:3.5,...AM}),L('K_moan',-8,{until:3.5,send:.3,...AM}),L('K_gong_swell',-10,{...LO}),L('K_portal',-10,{send:.3,...AM})],
    sig:()=>[RR(ETH,-4,{send:.25,...SW}),L('K_bell_low',-13,{send:.3,...FX})],
    lead:'K_gong_swell',
  },
  // 거너: 건조하고 단단한 총성 몸통 + 고역 크랙 + 짧은 저역 + 탄피. 폭발(K3.shock / vblast)은 실제 폭발음.
  // release / draw / dash = RangedHero.pose (the hero's own shot, aim and slide frames), knock = a skill's damage landing.
  gunner:{
    release:([s,n=1,k=0])=>[RR(PIST,-1,{jit:50,...IM}),L('R_hand',-7,{hp:900,...IM}),L('A_lowthud',-8,{...LO}),RR(CASE,-15,{delay:.24,pan:k%2?.3:-.3,...AM})],
    draw:()=>[L('R_cock2',-8,{...BL})],
    dash:()=>[RR(BWH,-4,{...SW}),RR(CASE,-10,{delay:.08,...AM})],
    knock:()=>[RR(BHIT,-6,{jit:120,...IM}),L('R_bhit_flesh',-11,{jit:100,...IM})],
    tick:([p=1,v=.25])=>[RR(SWITCH,dB(v,.25)-6,{cents:ct(p)*.5,...BL})],
    shing:([p=1,v=.6])=>[L('R_rico_2',dB(v,.6)-9,{cents:ct(p)*.4,cut:.5,...BL})],
    // a boom on its own is a thump (being hit calls it too); the explosions come through shock
    boom:([s=1,v=1])=>v<.2?[]:[RR(BTHD,dB(v,.5)-3,{jit:80,...IM}),L('B_punch_wet',dB(v,.5)-8,{...IM})],
    shock:()=>[L('G_mine',-3,{send:.15,...IM}),RR(ROCK,-7,{...IM}),L('B_boom_chef',-7,{cut:1,...LO})],
    bed:()=>[L('G_stinger',-7,{...LO}),L('K_drone_dark',-10,{until:3.5,...AM}),L('R_cock',-6,{...BL})],
    sig:()=>[L('R_cock4',-8,{...BL})],
    lead:'R_powerup',
  },
  // 궁수: 시위 당김(삐걱) → 시위 튕김 + 화살 떠남 → 박히는 소리. 폭발 대신 공기 압력과 묵직한 박힘.
  archer:{
    draw:([s=.15])=>[RR(CREAK,-6,{until:Math.max(.12,s)+.05,...FX}),L('R_xbow_0',-12,{...BL})],
    release:([s,n=1,k=0])=>[RR(TWANG,-2,{jit:60,...IM}),L('R_loose',-3,{...IM}),L('R_hawk',-6,{...SW}),L('R_arrow_wh',-10,{until:.3,...SW})],
    dash:()=>[RR(ASW,-4,{...SW}),L('R_whipby',-8,{...SW})],
    // the arrow's own whoosh comes with release; the game's call at the same moment only adds a little air
    whoosh:([p=1,v=.6])=>p>=1.5?[L('R_arrow_wh',dB(v,.3)-9,{until:.3,...SW})]:BASE.whoosh([p,v]),
    knock:()=>[RR(AHIT,-4,{jit:100,...IM}),RR(WOOD,-11,{jit:100,...IM})],
    shock:()=>[L('C_air_impact',-6,{send:.15,...FX}),RR(ASW,-8,{...SW}),L('R_vaeyan',-8,{...FX})],
    boom:([s=1,v=1])=>s<.8?[RR(BTHD,dB(v,.5)-3,{jit:80,...IM}),L('B_punch_wet',dB(v,.5)-8,{...IM})]
      :[L('R_ahit_1',dB(v,.5)-2,{...IM}),RR(ROCK,dB(v,.5)-5,{...IM}),L('B_boom_chef',dB(v,.5)-6,{cut:1.1,...LO}),L('A_debris',dB(v,.5)-13,{delay:.06,send:.2,...AM})],
    tick:([p=1,v=.25])=>[L('R_twang_1',dB(v,.25)-8,{cents:ct(p)*.5,cut:.18,...BL})],
    shing:([p=1,v=.6])=>[L('R_twang_0',dB(v,.6)-6,{cents:ct(p)*.4,...BL}),L('K_chime',dB(v,.6)-12,{send:.25,...FX})],
    bed:()=>[L('G_stinger',-8,{...LO}),L('K_drone',-10,{until:3.5,...AM}),L('R_creak_2',-6,{...FX})],
    sig:()=>[L('R_xbow_1',-8,{...BL})],
    lead:'R_bowcym',
  },
};
// ---------------------------------------------------------------- per-skill event recipes (ranged classes)
// The gunner and the archer make few sound calls of their own, and the same call means different things in different skills
// (SND.tick is a ricochet in 도탄 왈츠 and a range click in 영점 붕괴; SFX.whoosh(2.1) is the string snapping in 쌍성시). So a
// skill may voice any event itself: KIT[skill][event]. Lookup order in map(): ultimate palette, this table, the class recipe,
// BASE. Skill ids are fixed; if a skill stops making a call, its entry simply never fires and the class recipe covers the rest.
// args: release [seconds, shots fired in that frame, index of the release within the cast], knock [enemies, index within the cast].
// dry: events of that skill that are not a blast or a blow, so no explosion body / weight is laid under them.
const KIT={
  gn_basic:{tick:()=>[], boom:()=>[]},
  // 점화 삼점사: 두 발은 짧고 밝게, 세 번째는 무겁게 (그 탄이 터진다)
  gn_burst:{
    release:([s,n=1,k=0])=>k<2?[RR(SMG,-2,{cents:k*70,...IM}),L('R_rifle',-8,{hp:1200,...IM}),RR(CASE,-15,{delay:.2,pan:k?.3:-.3,...AM})]
      :[L('R_steam_shot',0,{...IM}),RR(SMG,-3,{cents:-150,...IM}),L('A_lowthud',-5,{...LO})],
    tick:()=>[],
  },
  // 도탄 왈츠: 한 발 쏘고, 튕길 때마다 도탄음 (게임의 tick이 튕김마다 온다), 마지막 적에서 금속 파열
  gn_bank:{
    release:()=>[L('R_rifle2',-1,{...IM}),L('R_hand',-5,{...IM}),L('R_flyby',-8,{...SW}),L('A_lowthud',-9,{...LO})],
    tick:([p=1])=>[RR(RICO,-3,{cents:ct(p)*.6,cut:.45,panJit:.5,...BL}),L('R_flyby',-9,{cents:ct(p)*.6,panJit:.5,...SW})],
    knock:()=>[RR(BHIT,-7,{jit:120,...IM}),L('R_bhit_glass',-12,{jit:200,cut:.25,...FX})],
    shock:()=>[RR(RICO,-2,{cut:.6,...BL}),L('R_bhit_multi',-4,{...IM}),L('R_bhit_glass',-8,{...FX})],
    dry:{shock:1},
  },
  // 산탄 부채: 산탄총 세 겹 + 저역
  gn_fan:{
    release:()=>[L('R_shotgun',1,{...IM}),L('R_shotgun2',-3,{...IM}),L('R_shotgun3',-6,{hp:800,...IM}),L('B_boom_chef',-7,{cut:.7,...LO})],
    boom:()=>[],
    knock:()=>[RR(BHIT,-6,{jit:120,...IM}),L('R_bhit_flesh',-8,{...IM})],
  },
  // 자기 유탄: 유탄 발사 '퉁' → 자력 웅웅 → 폭발 + 철편
  gn_mine:{
    release:()=>[L('R_gl_thump',0,{...IM}),L('A_lowthud',-6,{...LO}),L('C_elec_cast',-13,{until:.45,...FX})],
    whoosh:()=>[],
    shock:()=>[L('R_gl_hit',-1,{...IM}),L('G_mine',-4,{send:.15,...IM}),L('C_surge',-9,{...FX}),L('A_metal_hit',-12,{delay:.05,...BL}),L('K_brick',-12,{delay:.07,pan:.3,...AM})],
  },
  // 백야 관통탄: 충전(조준 자세 동안) → 방전 + 저격 총성 + 지나가는 탄
  gn_rail:{
    draw:([s=.24])=>[L('R_powerup',-3,{fit:s,endAt:true,...FX}),L('R_charge',-5,{fit:s,endAt:true,...FX})],
    inhale:()=>[],
    release:()=>[L('R_rail',1,{...IM}),L('R_sniper',-3,{cut:.8,...IM}),L('R_rail2',-5,{...FX}),L('B_downer_fast',-6,{...LO}),L('R_plasma_by',-8,{...SW})],
    shing:()=>[], boom:()=>[],
    knock:()=>[RR(BHIT,-7,{jit:120,...IM}),L('C_zap',-11,{jit:200,...FX})],
  },
  // 분광 표식: 렌즈가 달라붙는 유리 소리 → 여러 발이 거의 동시에
  gn_prism:{
    draw:()=>[L('R_glasswh',-5,{...FX}),RR(SWITCH,-7,{...BL}),L('K_chime',-11,{send:.2,...FX})],
    release:()=>[L('R_rifle',0,{...IM}),L('R_rail3',-4,{...IM}),L('R_rifle',-3,{delay:.045,cents:120,pan:-.3,...IM}),L('R_rifle',-4,{delay:.09,cents:-90,pan:.3,...IM}),L('A_lowthud',-6,{...LO})],
    shing:()=>[L('C_glass',-10,{cut:.4,...FX})], boom:()=>[],
    knock:()=>[RR(BHIT,-7,{jit:120,...IM}),L('R_bhit_glass',-10,{jit:200,cut:.3,...FX})],
  },
  // 탄피 슬라이드: 미끄러짐 + 흩어지는 탄피, 탄피가 차례로 '팡'
  gn_slide:{
    dash:()=>[L('B_pass_low',-4,{...SW}),RR(CASE,-6,{delay:.05,pan:-.3,...AM}),RR(CASE,-8,{delay:.12,pan:.3,...AM}),L('R_casing_4',-8,{delay:.03,...AM})],
    whoosh:()=>[],
    shock:()=>[L('R_abs_0',-2,{jit:120,...IM}),RR(ROCK,-9,{...IM}),L('A_lowthud',-7,{...LO})],
  },
  // 궤도 박격: 발사 '쿵' → (시전 시그니처의 낙하음) → 탄착 폭발
  gn_mortar:{
    release:()=>[L('R_rocket',0,{...IM}),L('R_gl_thump',-4,{cents:-300,...IM}),L('B_boom_chef',-8,{cut:.6,...LO})],
    whoosh:()=>[],
    shock:()=>[L('R_gl_hit',-4,{cut:.9,...IM}),L('B_boom_chef',-8,{cut:.8,...LO})],
  },
  ar_basic:{draw:([s=.1])=>[L('R_creak_1',-9,{until:s+.05,...FX})]},
  // 삼우개화: 한 번의 시위에 화살 여러 대가 좌우로
  ar_fan:{
    release:()=>[RR(TWANG,1,{...IM}),L('R_loose',0,{...IM}),L('R_hawk',-2,{pan:-.4,...SW}),L('R_hawk',-3,{delay:.03,pan:.4,cents:150,...SW}),L('R_hawk',-4,{delay:.06,cents:-120,...SW}),L('A_lowthud',-7,{...LO})],
  },
  // 나선 관통시: 깊은 시위 + 회전하며 나가는 윙 소리
  ar_drill:{
    draw:([s=.23])=>[L('R_creak_0',-4,{until:s+.05,...FX}),L('R_xbow_0',-10,{...BL})],
    release:()=>[L('R_twang_2',-2,{...IM}),L('R_loose',-5,{...IM}),L('R_pinaka',-3,{...SW}),L('C_doppler',-8,{...SW}),L('A_lowthud',-8,{...LO})],
    whoosh:()=>[],
    knock:()=>[RR(AHIT,-5,{jit:100,...IM}),L('A_metal_hit',-12,{cut:.2,...BL})],
  },
  // 비연보: 도약(옷자락·깃) → 돌아보며 한 발(whoosh 1.8) → 출발점에서 깃가시가 터짐
  ar_step:{
    dash:()=>[RR(ASW,-3,{...SW}),L('R_whipby',-6,{...SW}),L('X_cloth',-9,{...SW})],
    whoosh:([p=1])=>p>1.6?[L('R_loose',-5,{...IM}),L('R_twang_1',-7,{cut:.3,...BL}),L('R_hawk',-6,{...SW})]:[],
    release:()=>[],
    shock:()=>[L('R_vaeyan',-5,{...FX}),L('C_air_impact',-7,{send:.15,...FX}),RR(AHIT,-8,{...IM}),L('A_lowthud',-10,{...LO})],
  },
  // 등나무 매듭: 화살이 꽂히면(boom 1.35) 덩굴이 조여든다
  ar_snare:{
    boom:()=>[RR(AHIT,-4,{...IM}),L('R_rope',-2,{until:.8,...FX}),L('R_creak_1',-5,{delay:.05,...FX}),L('R_cable_1',-9,{cut:.5,...BL}),L('A_lowthud',-8,{...LO})],
    dry:{boom:1},
  },
  // 물수제비: 튕길 때마다 유리 깃이 한 음씩 올라가고, 마지막에 유리가 터진다
  ar_ricochet:{
    release:()=>[RR(TWANG,-2,{...IM}),L('R_loose',-3,{...IM}),L('R_glasswh',-8,{until:.4,...SW})],
    whoosh:([p=1,v=.6])=>p>1.9?[L('R_flyby',-7,{panJit:.5,...SW})]:[],
    knock:([n=1,k=0])=>[RR(AHIT,-5,{jit:80,...IM}),L('C_glass',-10,{cents:k*140,cut:.25,...FX}),L('K_chime',-11,{cents:k*140,cut:.5,send:.2,...FX})],
    boom:()=>[L('R_bhit_glass',-3,{...IM}),L('C_crystal',-6,{cut:.6,send:.2,...FX}),L('R_shimmer',-9,{send:.2,...FX}),L('A_lowthud',-7,{...LO})],
    dry:{boom:1},
  },
  // 소나기시: 한 발을 하늘로 → 여러 대가 연달아 박힌다 (boom 1.45)
  ar_rain:{
    release:()=>[RR(TWANG,-2,{...IM}),L('R_loose',-3,{...IM}),L('R_hawk',-4,{cents:300,...SW})],
    boom:()=>[RR(AHIT,-3,{...IM}),RR(AHIT,-5,{delay:.04,pan:-.3,...IM}),RR(AHIT,-6,{delay:.085,pan:.3,...IM}),RR(AHIT,-7,{delay:.135,...IM}),
      L('R_arrow_wh',-9,{...SW}),L('A_lowthud',-6,{...LO}),L('A_debris',-15,{delay:.05,...AM})],
    knock:()=>[],
    dry:{boom:1},
  },
  // 쌍성시: 두 발 → 별빛 시위가 팽팽하게 튕긴다 (whoosh 2.1)
  ar_bind:{
    release:()=>[RR(TWANG,-2,{...IM}),L('R_loose',-3,{...IM}),L('R_hawk',-5,{pan:-.5,...SW}),L('R_hawk',-6,{delay:.03,pan:.5,cents:120,...SW}),L('K_chime',-10,{send:.25,...FX})],
    whoosh:([p=1,v=.6])=>p>2?[L('R_cable_0',0,{...IM}),L('R_twang_3',-3,{...BL}),L('R_gliss',-9,{send:.2,...FX}),L('A_lowthud',-8,{...LO})]:CLASSES.archer.whoosh([p,v]),
  },
  // 황금 못: 길게 당겨 무겁게 → 땅에 박히며 '쿵' + 금속 울림
  ar_pin:{
    draw:([s=.29])=>[L('R_creak_2',-3,{until:s+.05,...FX}),L('R_xbow_0',-9,{...BL})],
    release:()=>[L('R_twang_2',1,{...IM}),L('R_twang_0',-4,{...IM}),L('R_loose',-3,{...IM}),L('R_pinaka',-5,{...SW}),L('A_lowthud',-5,{...LO})],
    shock:()=>[L('R_ahit_1',0,{...IM}),RR(ROCK,-2,{...IM}),L('B_boom_chef',-4,{cut:1.2,...LO}),L('K_bell_low',-10,{send:.2,...FX}),L('A_debris',-12,{delay:.06,send:.2,...AM})],
    boom:()=>[L('R_ahit_1',0,{...IM}),RR(ROCK,-2,{...IM}),L('B_boom_chef',-4,{cut:1.2,...LO}),L('K_bell_low',-10,{send:.2,...FX}),L('A_debris',-12,{delay:.06,send:.2,...AM})],
  },
};
// ---------------------------------------------------------------- cast signature of each skill (played at the cast)
// {fit,endAt}: stretched so it ends `fit` seconds after the cast (a swell into the blow).
const SIG={
  fs_dash:()=>[L('B_pass_low',-5,{...SW}),RR(JAB,-5,{...SW})], fs_upper:()=>[L('B_swing_design',-3,{...SW}),RR(JAB,-7,{...SW})],
  fs_ki:()=>[L('C_fmw_fx',-4,{...FX}),L('C_charge_down',-9,{...FX}),L('C_wind_rush',-10,{...AM})], fs_stomp:()=>[L('B_whoosh_1',-5,{cents:-300,...SW}),L('B_rev_trans',-8,{fit:.22,endAt:true,...FX})],
  fs_rush:()=>[L('B_power_whoosh',-7,{...SW}),L('C_wind_rush',-10,{...AM})], fs_tornado:()=>[L('B_power_whoosh',-2,{send:.15,...SW}),L('C_wind_rush',-5,{...AM}),RR(BWH,-5,{delay:.25,...SW}),RR(BWH,-5,{delay:.5,cents:100,...SW})],
  fs_aura:()=>[L('C_special',-3,{send:.2,...FX}),L('K_gong_swell',-9,{...LO}),L('A_lowthud',-6,{...LO})], fs_giga:()=>[L('B_rev_trans',-3,{fit:.45,endAt:true,...FX}),L('C_fmw_fx',-5,{...FX}),L('G_riser',-8,{fit:.45,endAt:true,...FX})],
  mg_bolt:()=>[L('C_zap',-5,{...FX}),L('K_plasma',-4,{...FX})], mg_orb:()=>[L('K_plasma',-3,{send:.2,...FX}),L('C_magic_flow',-9,{until:2,send:.3,...AM})],
  mg_chain:()=>[L('C_elec_cast',-4,{until:1.4,...FX}),L('C_surge',-7,{...FX})], mg_nova:()=>[L('K_ice_magic',-2,{send:.25,...FX}),L('K_ice_freeze',-4,{...FX}),L('C_air_impact',-6,{send:.2,...IM}),L('B_boom_chef',-8,{cut:1,...LO})],
  mg_vortex:()=>[L('K_portal',-3,{send:.3,...AM}),L('B_pass_low',-5,{...LO}),L('C_rev_interf',-8,{...FX})], mg_field:()=>[L('C_elec_cast',-3,{until:2,...FX}),L('K_drone',-9,{until:2.2,...AM}),L('K_thunder_strike',-9,{send:.25,...LO})],
  mg_star:()=>[L('C_doppler',-3,{send:.2,...SW}),L('K_chime',-8,{send:.3,...FX}),L('G_riser',-10,{...FX})], mg_beam:()=>[L('K_beam',-3,{until:1.3,...FX}),L('C_surge',-4,{...FX}),L('K_beam_low',-5,{until:1.3,...LO})],
  py_dash:()=>[L('C_torch',-2,{...FX}),L('B_pass_low',-7,{...SW}),L('K_flamer',-8,{until:.6,...FX})], py_pillar:()=>[L('K_flamer',-2,{until:1.2,send:.15,...FX}),L('C_fire_growl',-4,{...LO}),L('G_riser',-10,{fit:.4,endAt:true,...FX})],
  py_ring:()=>[L('C_fire_burst',-4,{until:1.1,send:.15,...FX}),L('C_torch',-5,{...FX})], py_boom:()=>[L('C_fire_growl',-3,{...LO}),L('C_rev_interf',-7,{...FX})],
  py_rain:()=>[L('C_fire_growl',-4,{...LO}),L('G_riser',-9,{...FX}),L('K_fire_loop',-8,{until:2.4,...AM})], py_breath:()=>[L('K_flamer',-1,{until:1.6,send:.12,...FX}),L('K_fire_loop',-5,{until:1.7,...AM}),L('C_fire_growl',-6,{...LO})],
  py_tornado:()=>[L('C_fire_burst',-2,{until:2.6,send:.15,...FX}),L('C_wind_rush',-4,{...AM}),L('K_fire_loop',-5,{until:2.6,...AM}),L('B_power_whoosh',-6,{...SW})], py_nova:()=>[L('C_rev_demon',-4,{fit:.4,endAt:true,...FX}),L('C_fire_growl',-2,{...LO})],
  sh_bomb:()=>[RR(ETH,-3,{send:.25,...SW}),L('K_plasma',-7,{...FX})], sh_spike:()=>[L('K_quake',-6,{until:.9,...LO}),RR(ROCK,-7,{...IM}),L('A_debris',-10,{send:.2,...AM})],
  sh_wisp:()=>[RR(ETH,-3,{send:.3,...SW}),L('K_chime',-7,{send:.3,...FX})], sh_heal:()=>[L('K_heaven',-4,{until:2.2,send:.3,...AM}),L('K_chime',-5,{send:.3,...FX}),L('K_bell',-10,{send:.3,...FX}),L('C_air_charm',-8,{until:2.2,send:.3,...AM})],
  sh_rock:()=>[L('K_quake',-4,{until:1.1,...LO}),L('A_debris',-9,{send:.2,...AM}),L('B_rev_trans',-9,{...FX})], sh_seal:()=>[L('K_gong_swell',-5,{...LO}),L('K_portal',-6,{until:1.6,send:.3,...AM})],
  sh_wolf:()=>[L('K_growl',-2,{send:.25,...LO}),RR(ETH,-5,{send:.3,...FX}),L('C_doppler',-9,{...SW})], sh_palm:()=>[L('B_swing_design',-3,{...SW}),L('K_gong',-9,{send:.3,...LO}),RR(ETH,-8,{...AM})],
  as_fan:()=>[L('A_hi_swing',-2,{...SW}),RR(KNIFE,-4,{...BL}),RR(ASW,-5,{delay:.04,pan:-.4,...SW}),RR(ASW,-5,{delay:.08,pan:.4,...SW})], as_return:()=>[L('C_doppler',-5,{...SW}),RR(KNIFE,-5,{...BL})],
  as_step:()=>[L('K_breath',-2,{send:.25,...AM}),L('B_pass_low',-7,{...SW}),L('A_hi_swing',-6,{...SW})], as_snare:()=>[RR(WOOD,-5,{...IM}),L('A_click',-4,{...BL}),L('A_steel_1',-10,{...BL})],
  as_ricochet:()=>[L('A_hi_swing',-3,{...SW}),RR(KNIFE,-5,{...BL})], as_caltrop:()=>[L('A_steel_0',-7,{...BL}),L('A_steel_2',-8,{delay:.07,pan:.3,...BL}),L('A_steel_3',-9,{delay:.14,pan:-.3,...BL})],
  as_warrant:()=>[L('K_breath',-3,{send:.25,...AM}),RR(ETH,-7,{send:.3,...AM}),L('A_lowthud',-8,{...LO})], as_crescent:()=>[L('A_blade_swing',-2,{...SW}),L('K_breath',-7,{send:.2,...AM}),L('A_slash',-8,{...IM})],
  ax_cleave:()=>[L('B_swing_low',-1,{...SW}),L('C_fire_growl',-10,{...FX})], ax_whirl:()=>[L('B_power_whoosh',-2,{send:.15,...SW}),RR(BWH,-4,{delay:.2,cents:-150,...SW}),RR(BWH,-4,{delay:.45,cents:-100,...SW})],
  ax_pillar:()=>[L('K_flamer',-3,{until:1.2,send:.15,...FX}),L('C_fire_growl',-4,{...LO}),L('G_riser',-10,{fit:.4,endAt:true,...FX})], ax_bolt:()=>[L('C_torch',-3,{...FX}),L('B_pass_low',-7,{...SW}),L('C_doppler',-9,{...SW})],
  ax_seal:()=>[L('C_fire_growl',-3,{...LO}),L('K_drone_dark',-9,{until:1.6,...AM}),L('K_gong_swell',-8,{...LO})], ax_throw:()=>[L('B_swing_design',-2,{...SW}),L('C_doppler',-7,{...SW})],
  ax_trail:()=>[L('C_fire_burst',-4,{until:1.3,send:.15,...FX}),L('K_fire_loop',-7,{until:1.4,...AM})], ax_burst:()=>[L('C_rev_interf',-6,{...FX}),L('C_fire_growl',-3,{...LO}),L('B_swing_low',-5,{...SW})],
  // gunner: what the weapon does around the shot (the shot itself is the release event)
  gn_burst:()=>[L('R_cock2',-5,{...BL})], gn_bank:()=>[L('R_cock',-6,{...BL}),L('R_rico_3',-11,{until:.5,...SW})],
  gn_fan:()=>[L('R_pump_0',-4,{delay:.3,...BL}),L('R_pump_1',-4,{delay:.42,...BL}),RR(CASE,-12,{delay:.62,...AM})], gn_mine:()=>[L('R_cock3',-5,{...BL})],
  gn_rail:()=>[L('R_switch_0',-6,{...BL}),L('C_charge_down',-11,{...FX})], gn_prism:()=>[L('R_cock3',-7,{...BL})],
  gn_slide:()=>[RR(CASE,-8,{delay:.2,pan:-.3,...AM}),RR(CASE,-9,{delay:.3,pan:.3,...AM})],
  // the shells of 궤도 박격 land about half a second after the cast: the incoming sound is stretched to end there
  gn_mortar:()=>[L('R_incoming',-5,{fit:.5,endAt:true,...FX}),L('R_cock',-8,{...BL})],
  ar_fan:()=>[L('R_xbow_1',-7,{...BL})], ar_drill:()=>[L('R_xbow_1',-9,{...BL}),L('C_fmw_fx',-12,{until:.3,...FX})], ar_step:()=>[L('R_vaeyan',-6,{...FX})],
  ar_snare:()=>[L('R_rope2',-7,{until:.4,...FX})], ar_ricochet:()=>[L('R_xbow_0',-8,{...BL}),L('K_chime',-12,{send:.2,...FX})], ar_rain:()=>[L('R_xbow_0',-8,{...BL})],
  ar_bind:()=>[L('K_chime',-8,{send:.25,...FX}),L('R_gliss',-11,{send:.2,...FX})], ar_pin:()=>[L('K_bell_low',-11,{send:.2,...FX})],
};
// ---------------------------------------------------------------- one palette per ultimate
// The climax (SND.hit), the bed under the cast and the lead-in are what the ear remembers of an ultimate. If they share
// recordings, every ultimate sounds the same (user, 2026-11-25). So each gets its own boom, blast, sub drop, tail, drone
// and riser. tools/cfx_check.js reports how much any two ultimates still share.
const U=(o)=>({
  hit:([v=1])=>[L(o.boom,dB(v,1),{...LO}),L(o.body,dB(v,1)-1,{cents:o.bc||0,...IM}),L(o.explo,dB(v,1)-2,{send:.25,...IM}),L(o.down,dB(v,1)-2,{...LO}),
    // measured ultimates: the peak is brighter than a skill's (512 vs 327 Hz, 12% above 2 kHz) and the low end outlasts the
    // highs (sub ends 185 ms after the high mids): an air layer on the hit, and the ultimate's own boom again, slowed and
    // low-passed, as the rolling tail (its own recording, so no two ultimates share a tail)
    ...(o.air?[L(o.air,dB(v,1)-8,{...FX,hp:2500,send:.2})]:[]),L(o.boom,dB(v,1)-9,{...AM,delay:.3,lp:200,rate:.8}),
    L(o.tail,dB(v,1)-8,{delay:.12,send:.3,...AM}),...(o.tail2?[L(o.tail2,dB(v,1)-10,{delay:.28,send:.25,...AM})]:[]),...(o.extra||[]).map(([c,g,x])=>L(c,dB(v,1)+g,{send:.25,...FX,...(x||{})}))],
  bed:()=>[...(o.sting?[L(o.sting,-6,{...LO})]:[]),L(o.drone,-8,{until:4,send:.25,...AM}),L(o.riser,-10,{...FX}),...(o.open||[]).map(([c,g,x])=>L(c,g,{send:.2,...FX,...(x||{})}))],
  lead:o.lead});
const ULT={
  // 파천 기공포 (user 2026-11-26, from a recording of the original): keep "지잉 쿠구구구궁", make the last 펑 clearly bigger.
  // In that recording the final blast (-10 dB) came out under the beam (-8 dB).
  fs_ult1:{
    bed:()=>[L('C_special',-7,{...FX,until:1.12}),L('K_drone_dark',-13,{...AM,until:1.13})],
    // 지잉: the charge (rumble call at the cast) buzzes - the original flutters ~26 Hz
    rumble:([d=1.3])=>[L('K_beam_low',-6,{...LO,until:d+.2}),L('U1_buzz',-8,{...FX,until:d+.2}),L('H_two',-10,{...FX,fit:d,endAt:true})],
    // 쿠구구구궁: the beam rolls (~14 Hz in the lows, like the original); the game stops it when the beam ends
    beam:()=>[L('U1_beam',-2,LO),L('U1_rumble',-6,LO),L('K_beam',-9,FX),L('C_surge',-10,FX),L('U1_buzz',-13,FX)],
    hit:([v=1])=>v<.85
      ?[L('F_release',-1,IM),L('A_lowthud',-4,LO),L('C_zap',-8,{...FX,until:.12})]
      // 펑: crack first, a real blast, the sub after it, then the golden rays' crackle and the rumble rolling away
      :[L('K_whip',-6,{...FX,hp:2500}),L('U1_blast',2,IM),L('F_burst',1,IM),L('V_b4',-1,LO),L('W_s6',-2,LO),L('C_air_impact',-3,{...FX,send:.18}),
        L('U1_crack',-5,{...AM,delay:.08,send:.2}),L('B_rumble',-9,{...AM,delay:.13,until:1.6}),L('V_b4',-8,{...AM,delay:.3,lp:200,rate:.8})],
    lead:'F_draw',
  },
  fs_ult2:{
    bed:()=>[L('V_dr2',-10,{...AM,until:2}),L('C_wind_rush',-6,{...SW,until:.75})],
    hit:([v=1])=>v<.85
      ?[L('K_rock_1',-4,IM),L('K_brick',-7,{...FX,delay:.04}),L('V_t1',-10,{...AM,send:.18,until:1.3})]
      :[L('V_b9',-2,LO),L('F_upper',0,IM),L('V_e3',-4,{...IM,send:.15}),L('W_s7',-3,LO),L('K_rock_0',-7,{...FX,delay:.08}),L('K_smack',-9,{...FX,hp:2500}),L('V_b9',-11,{...AM,delay:.3,lp:200,rate:.8})],
    lead:'F_compress',
  },
  fs_ult3:{
    bed:()=>[L('V_dr5',-10,{...AM,until:3.15}),L('C_magic_flow',-8,{...FX,send:.21,until:2.9})],
    hit:()=>[L('G_boom_a',-3,LO),L('F_burst',-1,IM),L('C_crystal',-4,{...FX,send:.22}),L('W_s8',-4,LO),L('V_t2',-10,{...AM,delay:.12,send:.2}),L('G_boom_a',-12,{...AM,delay:.3,lp:200,rate:.8})],
    lead:'F_draw',
  },
  as_ult1:U({air:'A_steel_0',boom:'V_b12',body:'A_slash',explo:'B_slasher',down:'B_downer_fast',tail:'K_portal',sting:'V_s1',drone:'V_dr1',riser:'G_riser',lead:'C_rev_demon',extra:[['C_glass',-8]],open:[['K_breath',-7]]}),
  as_ult2:U({air:'K_knife_1',boom:'V_b10',body:'A_slash',bc:-250,explo:'C_mixed_impact',down:'V_d2',tail:'K_ether_0',drone:'K_drone',riser:'V_r4',lead:'K_breath',extra:[['A_metal_hit',-6]],open:[['K_ether_1',-8]]}),
  as_ult3:U({air:'A_ring',boom:'V_b7',body:'B_slasher',explo:'V_e4',down:'B_tone_downer',tail:'K_breath',tail2:'K_ether_1',sting:'B_bigmetal',drone:'V_dr6',riser:'B_riser',lead:'C_rev_interf',extra:[['C_crystal',-8]],open:[['K_gong_swell',-9]]}),
  ax_ult1:U({air:'A_metal_hit',boom:'B_boom_metal',body:'A_ground',explo:'C_fire_impact',down:'G_downer',tail:'C_fire_burst',sting:'V_b5',drone:'V_dr3',riser:'B_riser',lead:'B_rev_flutter',extra:[['B_slasher',-4]],open:[['K_growl',-7]]}),
  ax_ult2:U({air:'C_mixed_impact',boom:'V_b2',body:'B_punch_wet',explo:'V_e7',down:'V_d4',tail:'V_t3',drone:'V_dr7',riser:'V_r1',lead:'B_rev_trans',extra:[['A_metal_hit',-5]],open:[['C_fire_growl',-6]]}),
  ax_ult3:U({air:'K_fire_loop',boom:'V_b3',body:'A_ground',bc:-200,explo:'V_e10',down:'B_downer_slow',tail:'B_collapse',tail2:'K_fire_loop',sting:'G_metal_boom',drone:'E_axe',riser:'G_riser_long',lead:'C_rev_demon',extra:[['K_roar',-6]],open:[['K_roar',-8]]}),
  mg_ult1:U({air:'K_plasma',boom:'K_thunder_strike',body:'C_air_impact',explo:'V_e5',down:'W_s1',tail:'B_thunder',tail2:'C_elec_cast',drone:'V_dr4',riser:'V_r2',lead:'C_rev_interf',extra:[['C_surge',-4],['C_zap',-8]],open:[['C_elec_cast',-8,{until:2}]]}),
  mg_ult2:U({air:'C_air_charm',boom:'V_b1',body:'G_impact',explo:'V_e6',down:'W_s2',tail:'B_debris',tail2:'V_t1',sting:'V_s1',drone:'K_choir',riser:'V_r3',lead:'B_rev_flutter',extra:[['C_doppler',-8]],open:[['C_air_charm',-8]]}),
  mg_ult3:U({boom:'V_b8',body:'K_ice_hit',explo:'K_ice_magic',down:'V_d1',tail:'K_ice_crack',tail2:'C_crystal',drone:'K_heaven',riser:'K_matter_grow',lead:'K_matter_grow',extra:[['K_ice_freeze',-5],['C_glass',-8]],open:[['K_ice_magic',-8]]}),
  py_ult1:U({air:'C_torch',boom:'G_boom_b',body:'C_fire_impact',explo:'V_e1',down:'B_deep_thud',tail:'K_fire_loop',tail2:'C_torch',drone:'E_pyro',riser:'G_riser_long',lead:'B_rev_flutter',extra:[['K_flamer',-6,{until:1.5}]],open:[['C_fire_growl',-5]]}),
  py_ult2:U({air:'K_flamer',boom:'B_boom_modern',body:'B_explosion',explo:'V_e2',down:'V_d3',tail:'C_fire_burst',sting:'G_stinger',drone:'K_moan',riser:'V_r1',lead:'C_rev_demon',extra:[['K_roar',-4]],open:[['K_roar',-7]]}),
  py_ult3:U({air:'C_fire_burst',boom:'V_b6',body:'G_mine',explo:'V_e9',down:'G_downer_b',tail:'V_t3',tail2:'K_quake',drone:'V_dr3',riser:'V_r4',lead:'B_rev_trans',extra:[['K_rock_1',-5]],open:[['K_quake',-7,{until:3}]]}),
  sh_ult1:U({air:'K_bell',boom:'G_metal_boom',body:'K_rock_1',explo:'V_e4',down:'W_s3',tail:'K_portal',tail2:'C_wind_rush',drone:'K_moan',riser:'K_gong_swell',lead:'K_gong_swell',extra:[['K_gong',-5]],open:[['C_wind_rush',-6]]}),
  sh_ult2:U({air:'K_chime',boom:'K_gong',body:'G_impact',explo:'V_choir',down:'W_s4',tail:'K_heaven',tail2:'K_chime',sting:'V_b11',drone:'V_dr6',riser:'V_r2',lead:'K_ether_0',extra:[['K_bell_low',-6]],open:[['K_bell',-9]]}),
  sh_ult3:U({air:'K_brick',boom:'B_boom_cav',body:'K_rock_0',bc:-300,explo:'G_far_explo',down:'W_s5',tail:'B_collapse',tail2:'K_brick',drone:'E_shaman',riser:'G_riser',lead:'C_rev_demon',extra:[['K_quake',-5,{until:2.5}]],open:[['K_quake',-6,{until:3.5}]]}),
};
// ---- ranged ultimates: own boom / blast / sub / drone / riser / lead-in each (R_b*, R_e*, R_s*, R_dr*, R_r*), plus the events
// their casts are made of. cue_* = RangedHero.cue (the game's own one-off recordings sit in the base layer under these).
Object.assign(ULT,{
  // 영점 붕괴: 조준경이 열리고(shing) 적을 훑을 때마다 딸깍(tick) → 고정(cue lock) → 한 발(cue breach) → 탄착 충격파(hit)
  gn_ult1:{
    bed:()=>[L('R_dr1',-10,{...AM,until:2.5,send:.2}),L('R_r1',-12,{...FX}),L('R_cock',-5,{...BL})],
    draw:()=>[], release:()=>[], thunder:()=>[],
    shing:()=>[L('R_glasswh',-7,{...FX}),L('R_bolt',-6,{...BL}),L('K_beam',-15,{...FX,until:1.6})],
    tick:([p=1])=>[RR(SWITCH,-5,{cents:ct(p)*1.2,...BL}),L('A_click',-10,{cents:ct(p),...BL})],
    cue_lock:()=>[L('R_bolt',-1,{...BL}),L('R_cock',-5,{delay:.06,...BL}),L('A_lowthud',-8,{...LO})],
    inhale:([d=.3])=>[L('R_charge',-5,{fit:d,endAt:true,...FX})],
    cue_breach:()=>[L('R_sniper',2,{...IM}),L('R_cannon',0,{...IM}),L('R_heavy',-4,{hp:900,...FX}),L('W_s9',-3,{...LO}),L('R_flyby',-8,{...SW}),L('R_casing_4',-12,{delay:.5,...AM})],
    hit:([v=1])=>[L('R_b1',dB(v,1),{...LO}),L('R_cannon2',dB(v,1)-1,{...IM}),L('V_e8',dB(v,1)-2,{send:.25,...IM}),L('R_e1',dB(v,1)-3,{...IM}),L('W_s10',dB(v,1)-2,{...LO}),
      L('R_bhit_glass',dB(v,1)-7,{hp:2500,send:.2,...FX}),L('C_glass',dB(v,1)-9,{delay:.04,...FX}),L('P_db4',dB(v,1)-9,{delay:.1,send:.2,...AM}),L('R_b1',dB(v,1)-9,{...AM,delay:.3,lp:200,rate:.8})],
    lead:'R_charge',
  },
  // 황혼 편대: 비행함 세 척이 지나가는 엔진(bed) + 줄폭격(shock마다 폭발) → 떨어지는 마지막 포탄(inhale) → 대폭발(hit)
  gn_ult2:{
    bed:()=>[L('R_ship',-6,{...AM,until:3.4}),L('R_jet_0',-9,{...SW,until:3.2}),L('R_dr2',-12,{...AM,until:3.6})],
    draw:()=>[],
    whoosh:()=>[L('R_jet_1',-7,{...SW,until:1.8})],
    gong:()=>[L('R_blastoff',-8,{...FX,until:1.4}),L('R_cock',-8,{...BL})],
    shock:()=>[L('R_gl_hit',-2,{...IM}),L('G_far_explo',-6,{send:.15,...IM}),RR(ROCK,-8,{...IM}),L('B_boom_chef',-6,{cut:1.1,...LO})],
    inhale:()=>[L('R_incoming',-3,{...FX,until:.98}),L('R_whistle',-8,{...FX})],
    hit:([v=1])=>[L('R_b2',dB(v,1),{...LO}),L('R_e2',dB(v,1)-1,{...IM}),L('B_boom_metal2',dB(v,1)-3,{send:.25,...IM}),L('R_rocket',dB(v,1)-4,{cents:-400,...IM}),L('R_s2',dB(v,1)-2,{...LO}),
      L('K_brick',dB(v,1)-8,{hp:2500,send:.2,...FX}),L('R_jet_2',dB(v,1)-9,{delay:.15,until:2.6,...AM}),L('P_db2',dB(v,1)-9,{delay:.1,send:.2,...AM}),L('R_b2',dB(v,1)-9,{...AM,delay:.3,lp:200,rate:.8})],
    lead:'R_whistle',
  },
  // 사건의 지평선: 중력핵이 눌리는 저음(bed) + 조여드는 상승(inhale) → 자이로 잠김(tick) → 궤도탄(release) → 붕괴와 제트(hit)
  gn_ult3:{
    bed:()=>[L('R_dr3',-7,{...AM,until:2.6,send:.2}),L('R_subsonic_1',-6,{...LO,until:2.5}),L('R_overheat',-12,{...FX})],
    draw:()=>[], shing:()=>[],
    gong:()=>[L('R_subsonic_0',-4,{...LO}),L('K_portal',-10,{send:.3,...AM})],
    inhale:([d=1.9])=>[L('R_r3',-5,{fit:d,endAt:true,...FX}),L('C_rev_interf',-9,{fit:d,endAt:true,...FX})],
    tick:()=>[L('R_cock',-3,{...BL}),RR(SWITCH,-8,{...BL})],
    release:()=>[L('R_rail2',0,{...IM}),L('R_cannon2',-3,{cents:200,...IM}),L('R_plasma_by',-8,{...SW})],
    hit:([v=1])=>[L('R_planet_low',dB(v,1),{...LO}),L('R_b3',dB(v,1)-1,{...IM}),L('R_planet_high',dB(v,1)-2,{send:.25,...IM}),L('R_s3',dB(v,1)-2,{...LO}),
      L('R_rico_2',dB(v,1)-8,{hp:2500,send:.2,...FX}),L('R_blastoff',dB(v,1)-6,{delay:.05,until:1.6,...AM}),L('P_db1',dB(v,1)-10,{delay:.1,send:.2,...AM}),L('R_planet_low',dB(v,1)-9,{...AM,delay:.3,lp:200,rate:.8})],
    lead:'R_r3',
  },
  // 천궁일선: 큰 시위 → 화살이 나는 동안의 제트 소리(grp fly, 먹 순간 tick에 끊김) + 급선회마다 소닉붐(cue sonic) → 마지막 폭발
  ar_ult1:{
    bed:()=>[L('R_dr4',-11,{...AM,until:5.2}),L('R_creak_2',-4,{...FX,until:.3}),L('R_r4',-11,{...FX})],
    draw:()=>[],
    // one arrow pass-by for every equal stretch of its course: the game raises the pitch and shortens the gaps as the arrow speeds up
    whoosh:([p=1,v=.3])=>[L('R_arrow_wh',dB(v,.3)-5,{cents:ct(p)*.9,until:.22,panJit:.7,...SW}),L('R_flyby',dB(v,.3)-9,{cents:ct(p)*.9,until:.2,panJit:.7,...SW})],
    // the arrowhead tearing a gash in the stone floor: a short rock scrape and a ricochet ring, pitched with its speed
    slash:([p=1,v=.2])=>[RR(ROCK,dB(v,.2)-7,{cents:ct(p)*.6,until:.18,panJit:.7,...IM}),L('R_rico_2',dB(v,.2)-12,{cents:ct(p)*.6,hp:1800,until:.22,panJit:.7,...FX})],
    inhale:([d=.54])=>[L('R_powerup',-9,{fit:d,endAt:true,...FX})],
    release:()=>[L('R_twang_2',2,{...IM}),L('R_loose',0,{...IM}),L('R_whipcrack',-2,{...FX}),L('R_sonic',-4,{cut:.6,...IM}),
      L('R_sonic_tail',-9,{...SW,grp:'fly',until:4.7}),L('R_jet_1',-10,{...AM,grp:'fly',until:4.7})],
    cue_sonic:([g=.6,r=1,pan=0])=>[L('R_sonic',dB(g,.8)-1,{pan,cents:ct(r),cut:.45,...IM}),L('R_whipcrack',dB(g,.8)-3,{pan,hp:1500,...FX}),L('K_whip',dB(g,.8)-7,{pan,...SW}),L('A_explo_low',dB(g,.8)-6,{cut:.3,...LO})],
    knock:()=>[RR(AHIT,-5,{jit:100,...IM}),L('R_flyby',-8,{jit:200,panJit:.6,...SW})],
    tick:()=>[{stop:'fly',fade:.05},L('R_twang_1',-4,{...BL}),L('R_xbow_0',-8,{...BL})],
    hit:([v=1])=>[L('R_b4',dB(v,1),{...LO}),L('R_e4',dB(v,1)-1,{...IM}),L('R_e4b',dB(v,1)-2,{send:.25,...IM}),L('R_s4',dB(v,1)-2,{...LO}),
      L('R_whipcrack',dB(v,1)-7,{hp:2500,send:.2,...FX}),L('V_t4',dB(v,1)-8,{delay:.12,send:.3,...AM}),L('R_sonic_tail',dB(v,1)-10,{delay:.1,...AM}),L('R_b4',dB(v,1)-9,{...AM,delay:.3,lp:200,rate:.8})],
    lead:'R_whipby',
  },
  // 별자리 장송곡: 별이 이어지는 하프·종(bed, gong) → 사슴의 도약(shock 1.48) → 별화살이 쏟아짐(knock마다 종) → 폭죽 같은 절정
  ar_ult2:{
    bed:()=>[L('R_bells',-9,{...AM,until:3.4,send:.3}),L('R_dr5',-10,{...AM,until:4.2}),L('R_harp_0',-6,{send:.3,...FX}),L('R_chimes',-11,{...AM,until:3.3})],
    draw:()=>[L('R_creak_2',-6,{until:1,...FX})],
    gong:()=>[L('R_light',-5,{send:.3,...FX}),L('K_bell_low',-10,{send:.3,...FX})],
    shock:()=>[L('R_shimmer',-4,{send:.25,...FX}),L('C_air_impact',-8,{...FX}),L('A_lowthud',-8,{...LO})],
    whoosh:()=>[L('R_whipby',-6,{...SW}),L('R_glasswh',-8,{until:.6,...SW})],
    shing:()=>[L('R_harp_1',-6,{send:.3,...FX}),L('R_twang_1',-8,{...BL})],
    inhale:([d=.68])=>[L('R_r5',-6,{fit:d,endAt:true,...FX})],
    release:()=>[L('R_twang_0',0,{...IM}),L('R_loose',-2,{...IM}),L('R_glasswh',-5,{until:.6,...SW}),L('R_gliss',-6,{send:.3,...FX})],
    knock:()=>[RR(AHIT,-5,{jit:100,...IM}),L('K_chime',-9,{jit:500,send:.2,...FX}),L('C_crystal',-13,{cut:.3,...FX})],
    hit:([v=1])=>[L('R_b5',dB(v,1),{...LO}),L('R_fwblast',dB(v,1)-1,{...IM}),L('R_sparkle',dB(v,1)-5,{send:.25,until:2.6,...FX}),L('R_s5',dB(v,1)-2,{...LO}),
      L('R_shimmer',dB(v,1)-8,{hp:2500,send:.2,...FX}),L('R_harp_1',dB(v,1)-9,{delay:.12,send:.3,...AM}),L('R_b5',dB(v,1)-9,{...AM,delay:.3,lp:200,rate:.8})],
    dry:{shock:1},
    lead:'R_gliss',
  },
  // 일식의 대궁: 뿔나팔 같은 대궁의 등장(gong) → 길게 당기는 삐걱임(draw) → 거대한 현, 화살이 하늘로(release: 깔개음이 여기서 끊긴다)
  // → 조용한 틈 → 조짐(짧은 inhale) → 떨어지는 화살(whoosh .5) → 착탄(hit)
  ar_ult3:{
    bed:()=>[L('R_horn',-6,{...AM,grp:'bow',until:3.3,send:.2}),L('R_dr6',-10,{...AM,grp:'bow',until:4}),L('R_pstr_low',-7,{...LO})],
    gong:()=>[L('R_horn2',-4,{...FX,until:2.6,send:.2})],
    draw:([s=1.7])=>[L('R_creak_2',-2,{cents:-500,until:s,...FX}),L('R_rope2',-6,{cents:-400,until:s,...FX})],
    inhale:([d=1.5])=>d>1?[L('R_r6',-6,{fit:d,endAt:true,...FX})]:[L('R_bowcym',-6,{fit:d,endAt:true,...FX}),L('R_whistle',-10,{fit:d,endAt:true,...FX})],
    release:()=>[{stop:'bow',fade:.5},L('R_pstr_hit',2,{...IM}),L('R_twang_2',0,{cents:-500,...IM}),L('R_spacehorn',-3,{send:.25,until:1.2,...FX}),L('B_downer_slow',-3,{cut:1,...LO}),L('R_whipby',-6,{cents:-300,...SW})],
    whoosh:([p=1])=>p<.55?[L('R_incoming',-2,{until:.32,...SW}),L('R_whipby',-4,{cents:-300,...SW}),L('R_plasma_by',-8,{until:.4,...SW})]:[],
    shock:()=>[L('C_air_impact',-7,{...FX}),L('A_lowthud',-6,{...LO})],
    shing:()=>[L('R_cable_0',-4,{cents:-300,...BL})],
    hit:([v=1])=>[L('R_b6',dB(v,1),{...LO}),L('R_e6',dB(v,1)-1,{...IM}),L('G_dist_hit',dB(v,1)-2,{send:.25,...IM}),L('R_s6',dB(v,1)-2,{...LO}),
      L('R_bowcym',dB(v,1)-8,{hp:2500,send:.2,until:2,...FX}),L('R_spacehorn',dB(v,1)-9,{delay:.15,until:2.5,send:.3,...AM}),L('R_b6',dB(v,1)-9,{...AM,delay:.3,lp:200,rate:.8})],
    dry:{shock:1},
    lead:'R_r6',
  },
});
const NAMES=['slash','whoosh','boom','thunder','click','rise','shatter','siren','bell','choir','rumble','charge','beam','fire','fireball','heart','sub','roar'];
const SNDN=['inhale','hit','shing','gong','tick','cut','drone'];
// loudness per class and tier (dB), fitted offline so that across classes: basic about -15, skills -13, ultimates -11.5 LUFS
// momentary max (the same hierarchy as the swordsman). Re-fit with tools/video_cls.py after changing recipes.
// 2026-11-26: shifted by (fit after each remix - fit before it: measured targets, punch / blast body, less wind + per-skill variety); layer mode: mage / shaman skills -1 dB so they stay under the ultimates over the synth, so in-game levels follow the new mix
// layer mode (recordings over the synth): set from live captures so 스킬 sits ~1.5 dB under 궁극기 and 평타 ~1.5 dB under 스킬
const TRIM={fist:{basic:1.5,skill:-4.1,ult:1.5},assassin:{basic:11.5,skill:3.3,ult:-.3},axe:{basic:-2.6,skill:-1.6,ult:.9},mage:{basic:-5.9,skill:-5.9,ult:-.3},pyro:{basic:-3.5,skill:-3.5,ult:2.6},shaman:{basic:-9.3,skill:-6.8,ult:1},
  gunner:{basic:-.8,skill:-3.4,ult:.7},archer:{basic:-1.5,skill:-4,ult:1.5}};

let hushEnd=-9, grpN=0, lastHit=-9, inhaleEnd=-9;
const SUBLAG=.024;
// user 2026-11-26: keep the game's own (synthesized) sounds and lay the recordings on top, instead of replacing them.
// LAYER=true: every wrapped call plays the original too; swsfx.js routes the game's output through a shared bus.
const LAYER=true;
// weight under every impact that carries no sub of its own (review 2026-11-26: "sub/boom" missing in 70 of 72 class actions,
// low share at the hit 0.0-0.3 against 0.6 measured). One recorded sub per class; gain and length by tier.
// assassin keeps it short (measured: the sharp classes ring 245 ms, sub <= 300 ms).
const SUBS=new Set(['V_d1','V_d2','V_d3','V_d4','V_b12','G_stinger','A_explo_low','B_downer_fast','G_boom_a','G_boom_b','B_deep_thud','B_boom_modern','A_lowthud',
  'C_fire_burst','V_s1','B_tone_downer','F_body_0','F_body_2','V_b6','V_b7','C_fire_impact','B_boom_chef','B_downer_slow','G_far_explo','B_bigmetal','V_e9','V_e10',
  'V_b9','V_b5','V_b2','V_b1','V_e8','F_upper','K_quake','B_rumble','W_s1','W_s2','W_s3','W_s4','W_s5','W_s6','W_s7','W_s8','W_r1','W_r2',
  'W_s9','W_s10','R_s1','R_s2','R_s3','R_s4','R_s5','R_s6','R_s7','R_s8','R_subsonic_0','R_subsonic_1','R_planet_low','R_b1','R_b2','R_b3','R_b4','R_b5','R_b6']);
// the classes that shoot: their hero poses, one-off cues and damage calls are events too (see install())
const RANGED={gunner:'gn_basic',archer:'ar_basic'};
const IMPACT={hit:1,boom:1,shock:1,thunder:1,gong:1,knock:1,slash:1,fist_contact:1,fist_burst:1,fist_finish:1};
const WEIGHT={assassin:['A_lowthud',.25,0],axe:['B_deep_thud',.7,0],fist:['A_lowthud',.45,0],mage:['B_boom_modern',.6,3],pyro:['B_boom_chef',.7,0],shaman:['G_boom_a',.7,4],gunner:['R_s8',.5,0],archer:['R_s7',.4,-2]};
// lengths: the sub outlasts the body (measured: it ends ~185 ms after the high mids, tail energy 60% under 150 Hz); the visual gate still closes it
const WTIER={basic:[-9,1],skill:[-5,1.8],ult:[-4,2.4]};
// body of the blow (user 2026-11-26: "쾅쿠콰쾅 펑 이런 소리가 전체적으로 부족"): the part between 150 Hz and 2 kHz that a phone
// speaker plays. pu = punch on every contact, ex = a real explosion on every blast, db = debris scattered after it.
const BODY={assassin:{pu:'P_pu1',ex:'P_ex1',db:'P_db1'},axe:{pu:'A_ground',ex:'P_ex4',db:'P_db4'},fist:{pu:'K_punch_deep',ex:'P_ex3',db:'P_db3'},
  mage:{pu:'C_air_impact',ex:'P_ex5',db:'K_ice_crack',cr:'P_pu2'},pyro:{pu:'B_punch_wet',ex:'P_ex2',db:'P_db2'},shaman:{pu:'K_rock_0',ex:'B_explosion',db:'P_db3'},
  // no: a gong is the ultimate's entrance for these two, not a blast
  gunner:{pu:'R_bhit_1',ex:'R_gl_hit',db:'P_db2',no:{gong:1}},archer:{pu:'R_ahit_0',ex:'C_air_impact',db:'A_debris',no:{gong:1}}};
const CONTACT={knock:1,slash:1,fist_contact:1}, BLAST={boom:1,shock:1,thunder:1,gong:1,hit:1,fist_burst:1,fist_finish:1};
const BTIER={basic:-3,skill:0,ult:1};
// user 2026-11-26 "거의 비슷한 느낌들이 강해": one punch / one blast per class under every skill made the skills alike (CLAP
// similarity inside a class rose 0.709 -> 0.734). Each skill now draws its own blast and punch from a class pool and its own pitch.
const POOL={assassin:{ex:['P_ex1','P_ex6','C_mixed_impact'],pu:['P_pu1','K_smack','A_stab_2']},axe:{ex:['P_ex4','G_mine','P_ex3'],pu:['A_ground','B_thud_1','K_bat_0']},
  fist:{ex:['P_ex3','F_burst','P_ex2'],pu:['K_punch_deep','F_upper','K_punch_1']},mage:{ex:['P_ex5','C_air_impact','K_ice_magic'],pu:['C_air_impact','K_ice_hit','C_energy_cut']},
  pyro:{ex:['P_ex2','C_fire_impact','P_ex4'],pu:['B_punch_wet','C_torch','G_mine']},shaman:{ex:['B_explosion','G_far_explo','P_ex1'],pu:['K_rock_0','K_rock_1','K_wood_1']},
  gunner:{ex:['R_gl_hit','P_ex2','P_ex6'],pu:['R_bhit_1','R_bhit_0','K_punch_1']},archer:{ex:['C_air_impact','R_ahit_1','K_rock_0'],pu:['R_ahit_0','R_ahit_2','K_wood_1']}};
// skills in a fixed order per class: the n-th skill takes pool entry n%3 and pitch step n%5, so neighbours never share both
const ORDER=['fs_dash','fs_upper','fs_ki','fs_stomp','fs_rush','fs_tornado','fs_aura','fs_giga','as_fan','as_return','as_step','as_snare','as_ricochet','as_caltrop','as_warrant','as_crescent',
  'ax_cleave','ax_whirl','ax_pillar','ax_bolt','ax_seal','ax_throw','ax_trail','ax_burst','mg_bolt','mg_orb','mg_chain','mg_nova','mg_vortex','mg_field','mg_star','mg_beam',
  'py_dash','py_pillar','py_ring','py_boom','py_rain','py_breath','py_tornado','py_nova','sh_bomb','sh_spike','sh_wisp','sh_heal','sh_rock','sh_seal','sh_wolf','sh_palm'];
const skillIdx=id=>{ const i=ORDER.indexOf(id); if(i>=0) return i%8; let h=7; for(const c of String(id||'')) h=(h*31+c.charCodeAt(0))|0; return Math.abs(h); };
const pick=(cls,k,id)=>{ const p=POOL[cls]&&POOL[cls][k]; return p?p[skillIdx(id)%p.length]:BODY[cls][k]; };
const skillCents=id=>[-220,110,-110,220,0][skillIdx(id)%5];
// wind / long whoosh beds read as a constant "솨아아" (user 2026-11-26): 3 dB down and no longer than 0.45 s
const WINDY=new Set(['C_wind_rush','B_power_whoosh','B_pass_low','K_breath','C_tex_whoosh','K_ether_0','K_ether_1','C_spell_whoosh','C_doppler','C_whoosh_fast','C_scifi_whoosh']);
let lastBlast=-9, blastN=0, lastRB=-9;
function body(cls,name,args,now,tier,ult,id){ const B=BODY[cls]; if(!B||(B.no&&B.no[name])) return [];
  const g=BTIER[tier]??0, out=[], pu=pick(cls,'pu',id), ex=pick(cls,'ex',id), cents=0;
  if(CONTACT[name]) return [L(pu,-5+g,{...IM,hp:150,cut:.25,cents})];
  if(!BLAST[name]||ult) return [];
  // the game's own loudness of the call: a faint crackle (thunder tick at .1) gets no blast, a big boom gets all of it
  const v=name==='boom'?(args[1]??1):(name==='thunder'||name==='hit'||name==='gong')?(args[0]??1):1;
  if(v<.35) return [];
  const lv=dB(v,1);
  // a chain of blasts (쿠콰쾅): each one keeps its punch and crack but rings short and alternates sides, so the next one is heard
  const chain=now-lastBlast<.25; lastBlast=now; blastN++;
  const small=name==='boom'&&(args[0]??1)<.8, side=chain?(blastN%2?.3:-.3):0;
  out.push(L(pu,-3+g+lv,{...IM,hp:150,cut:.3,pan:side,cents}));
  out.push(L(ex,(small?-5:0)+g+lv,{...IM,cut:chain||small?.3:1.2,pan:side,send:chain?0:.12,cents,blast:1}));
  if(B.cr) out.push(L(B.cr,-9+g+lv,{...FX,cut:.4,pan:side}));
  if(!chain&&!small) out.push(L(B.db,-11+g+lv,{...AM,delay:.05,pan:blastN%2?.35:-.35,send:.15}));
  return out; }
const HERO={hit:1,boom:1,thunder:1,gong:1,shock:1,release:1,cue_breach:1};
// event -> list of [cue, time]. tier: 'basic' | 'skill' | 'ult'. Pure apart from the hush / climax bookkeeping.
function map(cls,name,args,now,tier='skill',id=null){
  const P=CLASSES[cls]||{}, UP=ULT[id], RG=RANGED[cls], KP=RG?KIT[id==='basic'?RG:id]:null;
  // ranged: an explosion is drawn with K3.vblast and K3.shock and usually announced with SFX.boom as well, all in one frame.
  // The first of them is the explosion; the others in that frame add nothing.
  if(RG&&name==='vblast') name='shock';
  if(RG&&(name==='shock'||name==='boom')){ if(now>=lastRB&&now-lastRB<.05) return []; if(name==='shock'||((args&&args[1])??1)>=.2) lastRB=now; }
  const stage=cls==='fist'&&name.startsWith('fist_')?FIST[id]?.[name.slice(5)]:null;
  const f=stage||(name==='sig'?(SIG[id]||P.sig||BASE.sig):(UP&&typeof UP[name]==='function'?UP[name]:((KP&&KP[name])||P[name]||BASE[name]))); if(typeof f!=='function') return [];
  const dry=((UP&&UP.dry)||(KP&&KP.dry)||{})[name];
  // the climax hit already carries the rock / boom / blast bodies: the calls that land with it in the same frame add nothing
  if((name==='boom'||name==='shock'||name==='vblast')&&now>=lastHit&&now-lastHit<.04) return [];
  if(name==='hit') lastHit=now;
  if(name==='inhale') inhaleEnd=now+((args&&args[0])||1);
  // what lands at the end of a hush is the climax: it bypasses the hush (hero bus)
  const hero=Math.abs(now-hushEnd)<.09&&HERO[name], tr=((TRIM[cls]||{})[tier])||0;
  // top end first, weight after: measured layer peaks are high -5 ms, mids +5 ms, sub +20..30 ms after the hit frame
  const raw=f(args||[],{hero,tier}).filter(Boolean), W=WEIGHT[cls], wt=WTIER[tier]||WTIER.skill;
  // (ranged contacts come many to a volley: no sub under each one)
  if(W&&IMPACT[name]&&!dry&&!(RG&&name==='knock')&&raw.length&&!raw.some(l=>SUBS.has(l.clip))) raw.push(L(W[0],wt[0]+W[2],{...LO,cut:W[1]*wt[1]}));
  if(!dry&&raw.length) raw.push(...body(cls,name,args||[],now,tier,name==='hit'&&!!UP,id));
  const stops=raw.filter(l=>l.stop);
  // every layer of a skill's own events moves by that skill's pitch, so two skills of one class built from the same event
  // recipes still sound apart (ultimates have their own palettes; basic attacks keep the class's own pitch)
  // (a skill with its own recipes in KIT is already its own sound)
  const shift=tier==='skill'&&id&&id!=='basic'&&!KP?skillCents(id):0;
  const layers=raw.filter(l=>!l.stop).map(l=>({...l,gain:(l.gain||0)+tr,...(l.bus==='low'&&l.delay==null?{delay:SUBLAG}:{}),...(hero||name==='hit'?{hero:true}:{}),...(shift?{cents:(l.cents||0)+shift}:{}),
    ...(WINDY.has(l.clip)&&!l.fit?{gain:(l.gain||0)+tr-3,until:Math.min(l.until??.45,.45)}:{})}));
  const out=[]; const q={id:name,label:name,reactive:name!=='fist_charge',cls,tier,layers:[],voices:name==='knock'||name==='shatter'||name==='tick'||name==='vblast'?3:6};
  if(stage) q.skill=id;
  if(name==='hit') q.duck={db:-8,hold:.2,rel:.5};
  // every blast clears the texture around it for a moment (swing / effect / ambience buses), so in a chain each 쾅 stands out
  else if(BLAST[name]&&layers.some(l=>l.blast)) q.duck={db:-5,hold:.07,rel:.22};
  const grps={};
  for(const l of layers){ if(l.fit){ const fit=l.fit, endAt=l.endAt; delete l.fit; delete l.endAt; out.push([{id:name+'_fit',label:name,cls,tier,layers:[l],fitDur:fit,endAt:!!endAt},now]); }
    else if(l.grp){ (grps[l.grp]=grps[l.grp]||[]).push(l); } else q.layers.push(l); }
  // a sustained layer that a later event cuts (the ki ball's hum stops at its burst): its own cue in a named group
  for(const [g,ls] of Object.entries(grps)) out.push([{id:name+'_'+g,label:name,cls,tier,grp:g,layers:ls,voices:2},now]);
  for(const s of stops) out.unshift([{id:'stop',label:'stop',cls,tier,layers:[],stop:s.stop,fade:s.fade??.06},now]);
  if(q.layers.length) out.unshift([q,now]);
  return out;
}
// hush: the world drops now and comes back when the climax lands; a class lead-in swell ends exactly there
// The dip itself is shallow and short: measured before Lost Ark hits, the level 100-400 ms ahead is only -5.5 dB under the
// peak and a >=3 dB drop shows in 32% of casts. A -20 dB hole over the whole hush read as a dropout.
function hush(cls,dur,depth,now,tier='ult',id=null){ hushEnd=now+dur; const lead=(ULT[id]&&ULT[id].lead)||(CLASSES[cls]&&CLASSES[cls].lead)||BASE.lead, H=[{id:'hush',label:'hush',cls,tier,layers:[],hush:{db:Math.max(depth,-6),pre:Math.min(dur,.3),back:.3}},now+dur];
  // an inhale that already swells into this moment is the lead-in; a second one would double it
  if(Math.abs(inhaleEnd-hushEnd)<.3||dur<.12) return [H];
  return [H,[{id:'lead',label:'lead-in',cls,tier,layers:[{clip:lead,gain:-4+(((TRIM[cls]||{})[tier])||0),hero:true,bus:'fx'}],fitDur:dur,endAt:true},now]]; }

// -------------------------------------------------------------- wiring into the running game
function install(E,o={}){
  const active=o.active||(()=>window.pl&&pl.cls!=='sword');
  const out=o.emit||((q,t)=>{ if(q.stop){ E.stopGroup(q.stop,q.fade); } else if(q.fitDur){ fitPlay(E,q,t); } else E.cue(q,t,1,0); });
  const now=o.now||(()=>E.now());
  let depth=0, inHit=0, ctx={tier:'skill',id:null,t:-9};
  // which cast an event belongs to is timed on the game's clock: when frames are slow (hidden tab, weak phone) the game
  // stretches while the audio clock does not, and an ultimate's climax fell outside its window and lost its palette
  const gnow=()=>typeof RT==='number'?RT:now();
  const tier=()=>(typeof lock!=='undefined'&&lock)?'ult':(gnow()-ctx.t<2.5?ctx.tier:'skill');
  // raw: the bare event stream (for offline replay through map(), so recipes can change without filming again)
  const num=a=>Array.from(a||[]).map(v=>typeof v==='number'?+v.toFixed(4):null);
  const raw=(...r)=>{ if(o.raw) o.raw(r); };
  const cid=()=>gnow()-ctx.t<12?ctx.id:null;
  const run=(name,args,id,tr=tier())=>{ const t=now(), i=id||cid(); raw('ev',t,pl.cls,name,num(args),tr,i,null); for(const [q,tt] of map(pl.cls,name,args,t,tr,i)) out(q,tt); };
  const fistOn=()=>pl.cls==='fist'&&active();
  RPG.sv.fistSound=(id,stage,args=[])=>{
    if(!fistOn()||!FIST[id]?.[stage]) return false;
    run('fist_'+stage,args,id,id==='fs_basic'?'basic':'skill');
    // false lets the game play its own sound for the stage too (layer mode)
    return !LAYER;
  };
  const handle=()=>{ const g=++grpN; return {g,stop(fade=.25){ (o.stopGroup||((g,f)=>E.stopGroup&&E.stopGroup(g,f)))(g,fade); }}; };
  const wrap=(obj,name,ev,ret)=>{ const f=obj[name]; if(typeof f!=='function'||f.__cfx) return; const w=function(...a){ if(!active()||depth) return f.apply(this,a);
      depth++; try{ const orig=LAYER?f.apply(this,a):undefined;
        if(ret){ const h=handle(); const t=now(), tr=tier(); raw('ev',t,pl.cls,ev,num(a),tr,cid(),h.g); for(const [q,tt] of map(pl.cls,ev,a,t,tr,cid())){ q.grp=h.g; out(q,tt); }
          // a sustained call (beam, drone): stopping it stops the game's sound and ours together
          return orig&&orig.stop?{g:h.g,stop(...x){ try{ orig.stop(...x); }catch(_){} h.stop(...x); }}:h; }
        run(ev,a); return orig; } finally{ depth--; } };
    w.__cfx=1; obj[name]=w; };
  for(const n of NAMES) wrap(SFX,n,n,n==='beam');
  const Cn=RPG.sv.cine; for(const n of SNDN) wrap(Cn.SND,n,n,n==='drone');
  const ch=Cn.hush; Cn.hush=function(d,opt){ if(active()&&(!opt||opt.snd!==false)){ raw('hush',now(),pl.cls,d||.3,-20,tier(),cid()); for(const [q,t] of hush(pl.cls,d||.3,-20,now(),tier(),cid())) out(q,t); } depth++; try{ return ch.apply(this,arguments); } finally{ depth--; } };
  const du=window.duck; window.duck=function(level,d){ if(!active()||depth) return du.apply(this,arguments); if(LAYER) du.apply(this,arguments); const dp=clamp(20*Math.log10(Math.max(level,.05)/.85),-24,0); raw('hush',now(),pl.cls,d,dp,tier(),cid()); for(const [q,t] of hush(pl.cls,d,dp,now(),tier(),cid())) out(q,t); };
  // ranged contacts: at most one every 55 ms (90 ms inside an ultimate, where a shock wave reaches a crowd one by one)
  let pend=0, lastKn=-9; const flush=()=>{ const n=pend; pend=0; if(!active()) return;
    if(!RANGED[pl.cls]){ run('knock',[n]); return; }
    const t=now(); if(t-lastKn<((typeof lock!=='undefined'&&lock)?.09:.055)) return; lastKn=t;
    run('knock',[n,(ctx.kn=(ctx.kn||0)+1)-1]); };
  // Regular ki attacks voice their own contacts, blast rings and shock waves at the point of origin.
  const kitAudio=()=>active()&&(pl.cls!=='fist'||lock);
  const kn=K3.knock; K3.knock=function(){ if(kitAudio()&&!depth){ if(!pend) queueMicrotask(flush); pend++; } return kn.apply(this,arguments); };
  for(const [n,ev] of [['vblast','vblast'],['shock','shock']]){ const f=K3[n]; let last=-9; K3[n]=function(){
    // ranged: the kit's own rings (a marker popping, the end of a ray: painted:0) are not explosions
    if(kitAudio()&&!inHit&&!(RANGED[pl.cls]&&arguments[2]&&arguments[2].painted===0)){ const t=now(); if(t-last>.06){ last=t; run(ev,[...arguments]); } } return f.apply(this,arguments); }; }
  // ---- ranged classes. Their skills make few sound calls, so three more of the game's own calls are read as events:
  //  RangedHero.pose('draw'|'release'|'dash')  the hero's aim / shot / slide frames = bow drawn, shot fired, dash
  //  RangedHero.cue(key)                       the game's one-off recordings (sonic, lock, breach): that moment gets our layers too
  //  RPG.sv.dmg / hitFx, K3.ehit               a skill's damage landing on an enemy = the contact (as K3.knock is for the others)
  // All are looked up by property at call time in sk_gunner.js / sk_archer.js, so wrapping them here needs no change there.
  const ranged=()=>RANGED[pl.cls]&&active()&&!depth;
  const RH=window.RangedHero;
  if(RH&&!RH.__cfx){ RH.__cfx=1; let rel=0, relS=0;
    const relFlush=()=>{ const n=rel; rel=0; if(active()) run('release',[relS,n,(ctx.rel=(ctx.rel||0)+1)-1]); };
    const po=RH.pose; RH.pose=function(name,sec){ if(ranged()){
        if(name==='release'){ if(!rel) queueMicrotask(relFlush); rel++; relS=sec; }
        else if(name==='draw'||name==='dash') run(name,[sec]); }
      return po.apply(this,arguments); };
    // the event is raised whether or not the game's own file was ready (when it was not, the game falls back to a synthesized call)
    const cu=RH.cue; RH.cue=function(key,o){ const r=cu.apply(this,arguments); if(ranged()){ const c=o||{}; run('cue_'+key,[c.gain??1,c.rate??1,c.pan??0,r?1:0]); } return r; }; }
  // (the ring K3.ehit draws around a struck enemy is a K3.shock of its own: part of the contact, not an explosion)
  const touch=(obj,n)=>{ const f=obj&&obj[n]; if(typeof f!=='function'||f.__cfx) return; const w=function(){ const on=ranged(); if(on){ if(!pend) queueMicrotask(flush); pend++; inHit++; }
      try{ return f.apply(this,arguments); } finally{ if(on) inHit--; } }; w.__cfx=1; obj[n]=w; };
  touch(RPG.sv,'dmg'); touch(RPG.sv,'hitFx'); touch(K3,'ehit');
  // casts: the tier of what follows, a signature for each skill, a bed under each ultimate
  for(const [cls,C] of Object.entries(RPG.sv.CLS)){ if(cls==='sword'||!C) continue;
    if(C.basic&&C.basic.fn){ const f=C.basic.fn; C.basic.fn=function(){ if(active()&&pl.cls===cls) ctx={tier:'basic',id:'basic',t:gnow()}; return f.apply(this,arguments); }; }
    for(const [id,s] of Object.entries(C.skills||{})){ if(!s||!s.fn) continue; const f=s.fn; s.fn=function(){ const on=active()&&pl.cls===cls; if(on) ctx={tier:'skill',id,t:gnow()};
      const r=f.apply(this,arguments); if(on&&r!==false&&!(cls==='fist'&&FIST[id])){ raw('ev',now(),cls,'sig',[],'skill',id,null); for(const [q,tt] of map(cls,'sig',[],now(),'skill',id)) out(q,tt); } return r; }; }
    for(const id of Object.keys(C.ults||{})){ const f=C.ults[id]; C.ults[id]=function(){ const on=active()&&pl.cls===cls; if(on){ ctx={tier:'ult',id,t:gnow()}; raw('ev',now(),cls,'bed',[],'ult',id,null); for(const [q,tt] of map(cls,'bed',[],now(),'ult',id)) out(q,tt); } return f.apply(this,arguments); }; }
  }
}
// a layer stretched to a duration: rate so its length fits, ending at t+dur when endAt, else starting at t
function fitPlay(E,q,t){ const l=q.layers[0], c=E.clips[l.clip]; if(!c) return; const r=clamp(c.dur/Math.max(.15,q.fitDur),.55,1.8);
  const start=q.endAt?t+q.fitDur-c.dur/r:t; E.cue({...q,layers:[{...l,rate:r*(l.rate||1)}]},Math.max(E.now(),start),1,0); }

const BED={pyro:'E_pyro',axe:'E_axe',fist:'E_fist',mage:'E_mage',assassin:'E_assassin',shaman:'E_shaman',sword:'E_sword',gunner:'E_gunner',archer:'E_archer'};
// Decode before enabling event replacement so the very first strike has the same timing as repeats.
function fistClips(){
  const ids=new Set([BED.fist,WEIGHT.fist[0],...Object.values(BODY.fist),...POOL.fist.ex,...POOL.fist.pu]);
  const collect=layers=>{ for(const l of layers){ if(!l.clip) continue; ids.add(l.clip); for(const id of l.alt||[]) ids.add(id); } };
  for(const stages of Object.values(FIST)) for(const recipe of Object.values(stages))
    for(let i=0;i<4;i++) collect(recipe([i,i]));
  for(const id of ['fs_ult1','fs_ult2','fs_ult3']){
    const u=ULT[id]; ids.add(u.lead); collect(u.hit([.7])); for(const k of Object.keys(u)) if(typeof u[k]==='function') collect(u[k]([1]));
  }
  for(const name of ['inhale','whoosh','beam','drone','rumble','shing','tick','knock','boom','shatter','shock','vblast','click']){
    const f=CLASSES.fist[name]||BASE[name]; for(const args of [[.4,.4],[1,.6],[1.8,1]]) collect(f(args));
  }
  return [...ids];
}
// every clip a ranged class can play (ingame.js decodes them when the class is picked, so the first shot is not late)
function rangedClips(cls){ const ids=new Set([BED[cls],WEIGHT[cls][0],...Object.values(BODY[cls]).filter(v=>typeof v==='string'),...POOL[cls].ex,...POOL[cls].pu]);
  const collect=ls=>{ for(const l of ls||[]){ if(!l||!l.clip) continue; ids.add(l.clip); for(const a of l.alt||[]) ids.add(a); } };
  const pre=RANGED[cls].slice(0,3), tables=[CLASSES[cls],...Object.keys(KIT).filter(k=>k.startsWith(pre)).map(k=>KIT[k]),...Object.keys(ULT).filter(k=>k.startsWith(pre)).map(k=>ULT[k]),
    Object.fromEntries(Object.keys(SIG).filter(k=>k.startsWith(pre)).map(k=>[k,SIG[k]]))];
  for(const T of tables) for(const f of Object.values(T)){ if(typeof f==='string') ids.add(f); else if(typeof f==='function') for(const a of [[],[.3,.3,0],[1,1,1],[2,1,2],[2.2,.6,3]]){ try{ collect(f(a,{})); }catch(_){} } }
  for(const n of ['whoosh','inhale','gong','hit','shatter','rise','click','thunder']) for(const a of [[.4,.4],[1,.6],[1.8,1]]) collect((CLASSES[cls][n]||BASE[n])(a,{}));
  return [...ids].filter(Boolean); }
window.ClassFX={LAYER,map,hush,install,fitPlay,fistClips,rangedClips,CLASSES,BASE,SIG,ULT,KIT,RANGED,BED,TRIM};
})();

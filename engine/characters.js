// Character profiles are also the hub roster and the campaign balance role table.
(() => {
  'use strict';
  const profiles = Object.assign(Object.create(null), {
    sword: {name:'소드맨', en:'BLADE', role:'melee', color:'#ff3355', rim:'#ffb3c0', accent:'#ff5a7a', dash:'sw_dash',
      weapon:'포톤 블레이드', lore:'검을 익힌 후손. 빛의 칼날 하나로 구역의 질서를 가른다.'},
    mage: {name:'메이지', en:'ARCANIST', role:'ranged', color:'#b48cff', rim:'#e6d4ff', accent:'#a98bff', dashName:'블링크',
      weapon:'위상 포커스', lore:'피가 짙게 발현된 후손. 공간을 접어 무리를 한꺼번에 지운다.'},
    fist: {name:'파이터', en:'STRIKER', role:'melee', color:'#55ddff', rim:'#bff4ff', accent:'#56d8ff', dash:'fs_dash',
      weapon:'키네틱 너클', lore:'맨몸으로 싸우는 법을 익힌 후손. 연타와 충격파로 밀어붙인다.'},
    shaman: {name:'샤먼', en:'SPIRIT LINK', role:'ranged', roleLabel:'정령', color:'#3dffb0', rim:'#c8ffe8', accent:'#4fffb8', dashName:'영혼 걸음',
      weapon:'스피릿 링크', lore:'정령과 동기화하는 후손. 보이지 않는 것들을 불러 싸운다.'},
    pyro: {name:'파이로', en:'PYROMANCER', role:'ranged', color:'#ff7a2a', rim:'#ffd0a8', accent:'#ff9a4a', dash:'py_dash',
      weapon:'플라즈마 이미터', lore:'플라즈마를 다루는 후손. 닿는 모든 것을 태운다.'},
    assassin: {name:'암살자', en:'PHANTOM', role:'melee', color:'#a9afff', rim:'#e1ddff', accent:'#b9c0ff', dash:'as_step', needsMK:true,
      weapon:'모노 대거', lore:'그림자처럼 움직이는 후손. 보이기 전에 끝낸다.'},
    axe: {name:'액스', en:'AXE', role:'melee', color:'#ff5a14', rim:'#ffc9a8', accent:'#ff7a3a', dash:'ax_trail', needsMK:true,
      weapon:'헤비 액스', lore:'불타는 거대 도끼를 휘두르는 후손. 내려치는 곳마다 땅이 탄다.'},
    archer: {name:'궁수', en:'ARCHER', role:'ranged', roleLabel:'원거리 · 관통', color:'#9ce4ad', rim:'#daf6cb', accent:'#9ce4ad', dash:'ar_step',
      portrait:'assets/menu/archer_portrait.webp?v=stick1', weapon:'공명 장궁',
      lore:'경계 장벽 밖에서 길을 찾던 추적자. 화살 한 발에 자신의 동기화 신호를 실어, 시야 너머의 표적까지 궤적을 꺾는다.'},
    gunner: {name:'거너', en:'GUNNER', role:'ranged', roleLabel:'원거리 · 정밀 사격', color:'#77e5e4', rim:'#c9fbff', accent:'#77e5e4', dash:'gn_slide',
      portrait:'assets/menu/gunner_portrait.webp?v=stick1', weapon:'위상 저격총',
      lore:'보더라인 관측소의 마지막 사수. 오래된 황동 조준경을 들여다보면 지면 위에 푸른 십자선이 맺힌다.'}
  });
  const roleLabel = role => role === 'melee' ? '근접' : '원거리';
  for (const [id, hero] of Object.entries(profiles)) {
    hero.roleLabel ??= roleLabel(hero.role);
    hero.thumbnail = 'assets/' + id + '_a.webp';
  }

  function check(ok, message) {
    if (!ok) throw new TypeError('registerCharacter: ' + message);
  }
  const validId = id => typeof id === 'string' && /^[a-z][a-z0-9_-]*$/.test(id) && !(id in Object.prototype);
  const positive = n => Number.isFinite(n) && n > 0;
  function label(value, field) {
    check(typeof value === 'string' && value.trim() && !/[<>]/.test(value), field + ' must be plain text');
    return value;
  }
  function color(value, field) {
    check(typeof value === 'string' && /^#[\da-f]{6}$/i.test(value), field + ' must be a six-digit hex color');
    return value;
  }
  function imagePath(value, field) {
    check(typeof value === 'string' && !/^(?:\/|\w+:)/.test(value) && !/[<>"'\\]/.test(value) && value.trim(), field + ' must be a relative image path');
    return value;
  }

  // Validate and build the legacy combat tables without publishing a partial character.
  function prepare(id, spec, existingSkills, poses) {
    check(validId(id) && !profiles[id], 'invalid or duplicate character ID ' + id);
    check(spec && typeof spec === 'object', id + ' needs a definition');
    const {role, basic, skills = [], ultimates = []} = spec;
    check(role === 'melee' || role === 'ranged', id + '.role must be melee or ranged');
    const profile = {name:label(spec.name, id + '.name'), en:label(spec.en ?? id.toUpperCase(), 'en'), role,
      roleLabel:label(spec.roleLabel ?? roleLabel(role), 'roleLabel'), lore:spec.lore == null ? '' : label(spec.lore, 'lore'),
      weapon:label(spec.weapon ?? '무기', 'weapon'), color:color(spec.color, 'color'), eye:color(spec.eye ?? '#ffffff', 'eye'),
      idle:spec.idle ?? 'idle', dash:spec.dash, dashName:spec.dashName == null ? null : label(spec.dashName, 'dashName')};
    profile.accent = color(spec.accent ?? profile.color, 'accent');
    profile.rim = color(spec.rim ?? profile.eye, 'rim');
    check(Object.hasOwn(poses, profile.idle), 'unknown idle pose ' + profile.idle);
    if (spec.portrait != null) profile.portrait = imagePath(spec.portrait, 'portrait');
    if (spec.sprites != null) {
      check(spec.sprites && typeof spec.sprites === 'object' && Object.hasOwn(spec.sprites, 'a'), 'sprites needs an idle frame named a');
      profile.sprites = Object.create(null);
      for (const [frame, path] of Object.entries(spec.sprites)) {
        check(validId(frame), 'invalid sprite frame ' + frame);
        profile.sprites[frame] = imagePath(path, 'sprites.' + frame);
      }
    }
    profile.thumbnail = profile.portrait || profile.sprites?.a;
    check(Array.isArray(skills) && Array.isArray(ultimates), 'skills and ultimates must be arrays');
    const combat = {sk:Object.create(null), order:[], skills:Object.create(null), ults:Object.create(null)};
    for (const [hook, value] of Object.entries({preload:spec.preload, onHurt:spec.onHurt, glow:spec.glow})) {
      if (value == null) continue;
      check(typeof value === 'function', hook + ' must be a function');
      combat[hook] = value;
    }
    function ability(row, type) {
      check(row && validId(row.id), id + ' has an invalid ' + type + ' ID');
      const key = row.id, lv = row.lv ?? 1;
      check(!Object.hasOwn(existingSkills, key) && !Object.hasOwn(combat.sk, key), 'duplicate skill ID ' + key);
      check(typeof row.fn === 'function', key + '.fn must be a function');
      check(Number.isInteger(lv) && lv >= 1 && (type !== 'basic' || lv === 1), key + ' has an invalid unlock level');
      const meta = {cls:id, type, name:label(row.name, key + '.name'), lv, desc:row.desc == null ? '' : label(row.desc, key + '.desc')};
      if (row.evo != null) meta.evo = label(row.evo, key + '.evo');
      if (row.icon != null) meta.icon = imagePath(row.icon, key + '.icon');
      if (row.castEffect != null) meta.castEffect = row.castEffect;
      if (type === 'basic') {
        check(typeof row.cd === 'function' || positive(row.cd), key + ' needs a positive cooldown or cooldown function');
        combat.basic = {fn:() => row.fn(key) !== false, cd:typeof row.cd === 'function' ? row.cd : () => row.cd};
      } else if (type === 'skill') {
        check(positive(row.cd), key + ' needs a positive cooldown');
        meta.cd = row.cd;
        combat.skills[key] = {fn:row.fn, moves:!!row.moves, passive:!!row.passive};
      } else {
        combat.ults[key] = row.fn;
      }
      combat.sk[key] = meta;
      combat.order.push(key);
    }
    ability(basic, 'basic');
    for (const row of skills) ability(row, 'skill');
    for (const row of ultimates) ability(row, 'ult');
    if (spec.dash != null) check(Object.hasOwn(combat.skills, spec.dash) && !combat.skills[spec.dash].passive, 'dash must name an active skill on ' + id);
    return {profile, combat};
  }
  const characters = {profiles, prepare};
  if (typeof module !== 'undefined') module.exports = characters;
  if (typeof window !== 'undefined') window.GameCharacters = characters;
})();

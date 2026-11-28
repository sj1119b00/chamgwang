// A playable example. Enable 'training' in manifest.js to try it in sector 7.
export default function install(sv) {
  sv.effects.register('training_pulse', [
    {kind:'ring', color:'#62dbd2', size:180, duration:0.34},
    {kind:'flash', color:'#d7fffa', size:72, height:65, duration:0.15},
    {kind:'sparks', color:'#62dbd2', size:110, height:65, delay:0.05, count:6}
  ]);

  sv.registerCharacter('training_guide', {
    name:'훈련 교관', en:'INSTRUCTOR', role:'ranged', color:'#62dbd2', weapon:'훈련 발신기',
    basic:{
      id:'training_mark', name:'표적 사격', cd:0.65, desc:'가까운 표적 하나를 맞힌다.',
      fn(id) {
        const target = sv.nearest(650);
        if (!target) return false;
        sv.face(sv.angTo(target));
        sv.dmg(target, 620 * sv.A.mul(id));
        sv.hitFx(target, '#62dbd2', 1);
      }
    },
    skills:[{
      id:'training_wave', name:'공명파', lv:1, cd:4, castEffect:'training_pulse',
      desc:'표적 주변에 공명파를 일으켜 범위 안의 적을 함께 맞힌다.',
      fn(id) {
        const target = sv.nearest(680);
        if (!target) return false;
        const {x, y} = target;
        sv.face(sv.angTo(target));
        sv.effects.play('training_pulse', {x, y});
        sv.inCircle(x, y, 180, enemy => sv.dmg(enemy, 1600 * sv.A.mul(id)));
      }
    }]
  });

  sv.registerMonster({
    id:'training_scout', name:'모의 정찰기', base:'shard', art:'z6_shard',
    stats:{spd:190}, encounters:[{sector:7, chance:1}]
  });
  sv.registerBoss({
    id:'training_warden', name:'훈련 감독기', art:'z6_boss', patternSector:6,
    patterns:[
      {id:'slam', name:'표적 낙하', r:260, dmg:0.18},
      {id:'summon', name:'정찰기 호출', from:2, n:2, r:100, d:340, k:1, foe:'training_scout'}
    ],
    encounters:[{sector:7, chance:1}]
  });
}

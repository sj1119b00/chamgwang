# 참광 VFX 키트 사용법 (엔진 v3, 2026-11-24)

스킬·궁극기 연출은 전부 이 키트로 만든다. 새 세션·서브에이전트는 이 문서와 `sk_sword.js`의 `ultZero`(기준 궁극기)를 읽고 시작한다.

## 구조
| 파일 | 역할 | 수정 권한 |
|---|---|---|
| `fx3.js` (`window.FX3`) | 조명 받는 GL 지면(알베도+노멀맵, 광원 8개), 3D 메시 이펙트 렌더러(HDR), 재질 셰이더 | 엔진 담당만 |
| `gfx.js` (`window.GFX`) | 파티클, 광원(`GFX.light`), 주변광(`GFX.ambient`), 굴절(`GFX.ripple`), 타이머(`GFX.add`) | 엔진 담당만 |
| `vfx3.js` (`window.K3`) | **이펙트 키트** — 아래 조각들 | 엔진 담당만(추가 요청은 기록) |
| `cine.js` (`RPG.sv.cine`) | 카메라(zoom/roll/cam/shake), 사운드(SND), 피해 스윕(sweep) | 엔진 담당만 |
| `sk_<cls>.js` | 직업별 스킬·궁극기 본문 | 그 직업 담당 |

화면 합성 순서: **지면(조명) → 지면 레이어 이펙트('g': 마법진·균열·충격파 — 캐릭터 발밑) → 캐릭터 스프라이트 → 공중 레이어 이펙트('o') → 블룸·후처리**.

## 좌표
- 월드 `(x, y, z)`: `y`는 바닥 좌표(화면 세로 방향, 이미 .58로 눌린 단위), `z`는 높이(화면 위로 1:1).
- 영웅 바닥 위치는 `pl.x, pl.gy`. 몸 높이 상수 `BODY`. 화면 반폭/반높이는 `view()` → `{hw,hh}`.
- 바닥에 눕는 도형의 반지름 `r`은 가로 기준(세로는 자동으로 .58).

## 핵심 원칙 (품질 기준)
1. **그림 원화 × 색 램프 × 침식 × 3D 배치.** 회색 원화(검정 배경)를 팔레트(어두운 테두리 d / 포화된 본색 b / 흰 핵 h)로 칠하고, 노이즈로 타 들어가며 사라지게 한다. 단색 도형·얇은 선·흰 덩어리는 실패.
2. **흰색은 핵에만.** 화면이 분홍·흰색으로 뜨면 gain을 낮추고 본색이 보이게 한다.
3. **지면이 반응한다.** 모든 타격에 `GFX.light`(바닥이 그 색으로 물듦) + 바닥 흔적(crack/gash/shock) + 파편·먼지.
4. **단계가 있다.** 전조(응축·마법진·주변광 하강) → 시전 → 전개 → 절정(히트스톱·흔들림) → 여운(잔불·흉터·주변광 복귀).
5. **암전·컷인·레터박스·화면 전체 섬광 금지.** 어둡게 할 때는 `GFX.ambient(.3~.5, …)`만 쓴다(전장은 계속 보인다). `Cn.setDark`, `Cn.cutin`, `ov.lbT`, `Cn.impact`의 2색 프레임, `Cn.wash`는 쓰지 않는다.
6. 궁극기 > 일반 스킬. 일반 스킬은 조각 1~3개 + 광원 1개로 짧고 선명하게(0.3~0.8초), 궁극기는 전장 전체.
7. 직업마다 구조가 달라야 한다(색만 바꾼 재사용 금지).

## 팔레트
`K3.PAL`: `crimson`(검사), `gold`, `violet`(마법사 번개), `azure`(권사 기공), `jade`(도사), `flame`(화염술사). 직접 만들 때 `{d:'#어두운', b:'#본색', h:'#핵', l:'#바닥광', s:'#불티'}`.

### 키트 갱신 (2026-11-24 12:30, 하위 호환)
- **색 램프 4단계**: 팔레트에 `m`(본색과 핵 사이의 중간 고온색)을 넣으면 "어두운 테두리 → 본색 → m → 흰 핵"으로 칠해진다(예: 진홍 `m:'#ffb66a'` 금빛). 직접 만든 팔레트에도 `m`을 넣을 것 — 한 가지 색·한 가지 밝기로 보이는 문제를 없앤다. `K3.PAL.silver`(차가운 은색) 추가: 마법진은 은색, 타격은 직업색처럼 **두 색 대비**를 쓰면 좋다.
- **최종 합성이 색상을 보존**한다(밝아져도 흰색으로 날아가지 않음). 그래도 gain을 과하게 올리지 말 것.
- `sigil` 핸들: `h.pal`(살아 있는 동안 색 변경), `h.kick()`(맥동), 쓰이는 동안 선두 불티.
- `seam`: 그림 원화 기반의 찢어진 틈 + 바닥에 비친 빛 + 달리는 불티, `h.kick()`.
- `wall`: 뒤에 어두운 연기 띠, 들쭉날쭉한 높이, 떨어져 나가는 불꽃 조각. 옵션 `rise`(솟는 시간) `ord`(깊이 순서: 보통 벽의 y) `licks:0` `smoke`.
  **화면에서 세로에 가까운 선(약 55° 초과) 위의 벽은 납작한 선으로 보인다** — 벽·장막은 가로~대각 방향으로 세우고, 뒤쪽(화면 위)은 높게 앞쪽은 낮게.
- `debris`: `size0`~`size`(큰 판석 조각), `petals`: 크고 회전.
- 스프라이트(적·영웅)는 가장 센 광원 쪽 가장자리에 **테두리광**을 받고, 그림자가 광원 반대쪽으로 길어진다 → 큰 타격에는 반드시 `GFX.light`를 넣을 것(반경 넓게, z 150~300).
- 궁극기 구도 교훈(대표 궁극기 검증에서): ①절정에 **하나의 초점**(중앙 빛기둥·폭발 등, 색도 다르게)을 두고 그 직전에 0.1초 숨죽임 ②주인공이 이펙트에 가려지지 않게 ③여운에 스킬의 모양이 바닥 흉터로 남게.

### 키트 갱신 2 (2026-11-24 13:30, 하위 호환)
- **카메라 기울임 `Cn.tilt(t, k)`**: t 0 = 평소 탑다운, 0.2~0.3 = 카메라가 바닥 쪽으로 내려앉아 전장이 원근으로 물러남(먼 줄은 좁게, 가까운 줄은 크게). k는 도달 속도. 화면 중앙이 1/(1-t)배 확대되므로 `Cn.zoom`을 그만큼 낮춘다(예: tilt .28이면 zoom .66 ≈ 실제 .92). 궁극기 끝에 `Cn.tilt(0, 2.5)`(ultStop이 자동으로 0으로 되돌리지만 여운에서 천천히 올리는 편이 좋다). **정지 화면에서도 카메라 연출이 보이게 하는 유일한 수단** — 전조에서 조금(.1), 절정 직전에 깊게(.24~.3), 여운에서 복귀.
- `K3.cres(..., {keep:true, idlePal, idle, max})` → 핸들 반환: 그려진 뒤 공중에 멈춰 서서(idlePal 색, idle 밝기) `h.kick()`으로 맥동, `h.end()`로 타 사라짐. "공중에 남는 참격"은 **곧은 선(seam) 대신 이것**을 쓴다 — 검증자 다섯 명이 곧은 선을 싸구려 레이저로 읽었다.
- `K3.crack(..., {ry})`: 세로(깊이) 방향으로 늘려 세로 화면 끝까지 닿게.
- 교훈: 화면에 곧은 선·곧은 가장자리·균일한 폭이 보이면 감점된다. 그림 원화의 실루엣(초승달·불꽃·번개)으로 대체하고, 한 궁극기 안에서 색을 세 번 바꾼다(예: 강철빛 → 진홍 → 금).

## 조각 (모두 `K3.*`, 옵션 `delay`초 지원, 시간은 자동 진행)
| 함수 | 설명 | 주요 옵션 |
|---|---|---|
| `cres(x,y,z,o)` | **그림 초승달 검기**: 휘두르는 방향으로 그려지고 꼬리부터 타 사라짐 | `reach`(영웅→날 거리) `dir`(바닥 각도) `lean`(0 눕힘~.9 세움) `roll`(대각) `tex`(`fx3_slash`·`v3_slash_thin`·`v3_slash_heavy`) `swing/hold/fade` `ccw` `pal` `gain` |
| `slash(x,y,z,o)` | 절차적 호(弧) 검기(메시). 그림보다 단순 — 보조용 | `r,w,a0,a1,rx,ry,rz` |
| `art(x,y,o)` | 회색 원화 한 장(세운 판 / `floor:true` 바닥 / `rx,ry,rz` 기울임) | `tex`(`v3_xburst` 임팩트, `fx3_burst` 폭발, `v3_spin_ring` 회전참, `v3_thrust` 찌르기 등) `s` `asp` `z` `dur` `hold` `s0` `flip` |
| `burst(x,y,o)` | 폭발 한 세트(섬광+화구+연기+충격파+불티+파편+균열+광원) | `s` `pal` `z` `no:['smoke','crack',…]` |
| `shock(x,y,o)` | 바닥 충격파 고리(발밑 레이어)+아지랑이+먼지 | `r` `r0`(r0>r이면 수축) `dur` `gain` |
| `pillar(x,y,o)` | 빛기둥(원통 메시) | `r` `h` `dur` |
| `wall(pts,o)` | 바닥 선에서 솟는 불꽃 장벽. `pts:[{x,y,h}]` | `h` `dur` |
| `dome(x,y,o)` | 부풀어 오르는 반구 껍질 | `r` `dur` `hk` |
| `sigil(x,y,o)` → handle | 바닥 마법진(중심에서 써 내려감, 회전). `handle.r/a/dead` 조절 | `r` `dur` `in` `out` `spin` `tex` |
| `crack(x,y,o)` | 방사형 균열 + 속에서 새는 빛(식어 감) | `r` `life` `grow` |
| `gash(x1,y1,x2,y2,o)` | 직선 상처(바닥) | `w` `life` |
| `seam(x1,y1,x2,y2,o)` → handle | 공중에 남는 참격선. `handle.end()` | `z` `w` |
| `trail(pts,o)` | 점들을 잇는 빛 리본 | `w` `dur` `draw` `hold` |
| `bolt(x,y,o)` | 그림 낙뢰(하늘→바닥) | `h` `w` `dur` |
| `flame(x,y,o)` → handle | 서 있는 불꽃 | `s` `dur` |
| `beam(x1,y1,z1,x2,y2,z2,o)` → handle | 두 점 사이 그림 빔(끝점을 매 프레임 바꿔도 됨) | `w` `dur` |
| `drop(x,y,o)` | 하늘에서 떨어지는 그림(운석·검)+조여드는 그림자 | `img` `s` `h0` `dur` `land()` |
| `pic(x,y,z,o)` → handle | **채색 그림(알파 있음)** 한 장을 세우거나(`floor:true`면 눕힘) 노이즈로 타 들어오고 나가게: 소환물·무기 (`deity`,`palm`,`meteor`,`sword`,`dragon_head`,`crystal` 등 `assets/*.webp`). handle의 `x,y,z,s,a,rot`를 매 프레임 바꿔 움직임 | `img` `s` `asp` `dur` `in` `out` `tint` `edge` `flip` |
| `smoke(x,y,o)` | 피어오르는 어두운 연기 | `s` `dur` `c` |
| `flare(x,y,z,o)` | 공중의 뜨거운 빛(칼집의 번쩍임 `sx:5,sy:.3`) | `s` `dur` `gain` |
| `sparks(x,y,z,o)` | 불티(줄무늬, 중력) | `n` `sp:[lo,hi]` `up` `dir` `spread` |
| `embers / petals / debris / dust` | 잔불 / 꽃잎(검사 전용 서명) / 그림자 있는 돌 파편 / 바닥 먼지 | `n` 등 |

조명·환경: `GFX.light(x,y,r,'#색',세기,수명,{z,hold,flick})`, `GFX.ambient(r,g,b,속도)`(끝날 때 `GFX.ambient(1,1,1,2)`), `GFX.ripple(x,y,R,{life,s})`.
연출: `Cn.zoom(z)`, `Cn.roll(r)`, `Cn.cam(x,y,k)`/`Cn.cam(null)`, `Cn.shake(s)`, `hitstop=Math.max(hitstop,.08)`, `post.ca=.012`, `Cn.sweep(x,y,D,{speed})`(피해 파동).
저수준(새 조각이 꼭 필요할 때, 자기 `sk_<cls>.js` 안에서): `FX3.mat({...})`, `FX3.lathe/ring/quad/bill/ribbon/wall`, `GFX.add(life,(k,t)=>{…})`, `GFX.pt({...})`. 재질 매개변수는 `fx3.js` 상단 주석과 `vfx3.js`의 `mats()` 참고.

## 쓸 수 있는 원화 (`assets/`)
- 회색 마스크(램프로 채색, `art`/`cres`/`sigil`의 `tex`): `fx3_burst`(폭발 1.39:1) `fx3_shock`(충격 고리) `fx3_smoke` `fx3_slash` `fx3_fire`(세로) `fx3_bolt`(세로) `fx3_tornado`(세로) `fx3_beam`(가로 띠) `v3_xburst`(임팩트 바늘) `v3_curtain`(불꽃 장막, 가로 반복) `v3_fissure` `v3_gash` `v3_slash_thin` `v3_slash_heavy` `v3_thrust`(가로 3.7:1) `v3_spin_ring` `fx_crack` `fx_lightning`
- 추가 회색 마스크(2026-11-24 오후): `v3_pillar`(세로 빛기둥, 나선 리본) `v3_scorch`(그을음, 위에서 본) `v3_dustring`(먼지 고리) `v3_orb`(에너지 구체) `v3_boulder`(각진 바위) `v3_spikes`(돌가시 무리, 세로) `v3_palmprint`(연꽃 손자국, 세로) `v3_skygate`(소용돌이 구름 문) `v3_bolt_b`(갈라지는 낙뢰, 세로) `v3_bolt_fork`(거대 다발 낙뢰, 세로) `v3_arc_h`(가로 번개 아크 4:1) `v3_frost_ring`(얼음 가시 고리) `v3_crater`(분화구+분출 줄기) `v3_comet_tail`(운석 불꼬리, 머리가 오른쪽, 4:1) `v3_greatsword`(아래를 향한 대검, 1:2 세로) `v3_cres_up`(세로로 선 가는 초승달, 볼록한 쪽이 왼쪽)
- 추가(2차): `v3_fist_punch`(오른쪽으로 내지르는 기의 주먹, 16:9) `v3_fist_cone`(오른쪽으로 넓어지는 압력 원뿔+충격 고리, 2:1) `v3_flame_cone`(화염 방사, 왼쪽이 좁고 오른쪽이 넓음, 2:1) `v3_vortex_wisps`(속이 비어 보이는 회오리 리본, 세로) `v3_groundfire`(바닥을 따라 타는 낮은 불길, 가로 반복 4:1 — `FX3.img('v3_groundfire',{repeat:true})`)
- 마법진 선화(`sigil`의 `tex`): `v3_circ_blade`(검사) `v3_circ_mage` `v3_circ_fist` `v3_circ_shaman` `v3_circ_pyro` `fx_circle_arcane` `fx_circle_seal`
- 채색 그림(`pic`/`drop`의 `img`): `meteor` `sword` `deity` `palm` `crystal` `dragon_head` `dragon_body` `fx_sun`
- 기존 GIF 프레임 이펙트(`vfx('이름',…)`, `tdV`)는 2D 캔버스 위에 그려진다. 새로 만드는 연출에는 쓰지 않는 것을 원칙으로 하되, 화룡 몸통처럼 대체가 어려운 것은 유지해도 된다.

### 키트 갱신 3 (2026-11-24 14:20, 하위 호환)
교차 검증(10개 궁극기 평균 68)에서 "모든 궁극기가 같은 별 모양 폭발·얇은 타원 충격파·검은 거미줄 균열로 끝난다"는 지적에 대한 공용 조치.
- 새 원화(회색, `K3.art`의 `tex`로 사용): `v3_burst_sword`(X자 참격+칼날 파편), `v3_burst_arcane`(룬 고리+다각 별), `v3_burst_ki`(겹겹의 두꺼운 압력 고리+암석), `v3_burst_lotus`(빛의 연꽃), `v3_burst_fire`(덩어리진 비대칭 폭염+연기), `v3_shock_thick`(두꺼운 충격파 전면, 가운데 빔), `v3_fissure_b`(세 갈래 비대칭 균열+들린 암반).
- `K3.burst`의 섬광이 **직업별 원화로 자동 교체**된다(`K3.btex()` = 현재 직업의 폭발 원화). 예전 별 모양은 `ftex:'v3_xburst'`, 다른 원화는 `ftex:'…'`.
- `K3.shock`은 `r>=400`이면 두꺼운 그림 전면(`v3_shock_thick`)을 쓰고 얇은 선 고리를 뺀다. 예전 모양은 `thick:0`.
- `K3.crack(x,y,{alt:1})` = 세 갈래 균열(`v3_fissure_b`). 궁극기마다 같은 방사형 균열로 끝내지 말 것.
- 정점 광원 상한: 반경 `hw*1.6` 이하, 세기 1.2 이하(화면 전체 섬광으로 읽히지 않게).

## 드로우 예산
- 궁극기 한 개 단독으로 메시 드로우 **120 이하**, 일반 스킬 전부가 동시에 터질 때도 150 이하가 목표(스모크 테스트: `--eval "await __inc('_gen/v3/smoke.js'); return await __smoke('<cls>',5);"` 의 `peakDraws`).
- 메뉴의 "이펙트 품질 낮음"(`FX3.low`)에서는 키트가 보조 레이어(연기 뒷면·그을음·아지랑이·먼지 고리)를 자동으로 뺀다. 직업 파일의 지역 조각도 보조 레이어는 `if(!FX3.low)`로 감쌀 것.

## 주의 (실제로 밟은 함정)
- `GFX.add` 콜백은 "그린 프레임"마다 불린다. 위치는 `t`의 함수로 계산하고 프레임마다 누적하지 않는다.
- 기울임: `lean` +방향이 카메라 쪽으로 세우는 것. `FX3.xf`의 `rx`는 +0.53 근처에서 모서리로 보여 사라진다 → 기울인 판은 `FX3.xfw`를 쓴다.
- 텍스처는 처음 쓸 때 로드된다. 새 이미지를 쓰면 `K3.pre` 목록(TEX)에 추가를 요청하거나 파일 로드 시 `FX3.img('이름')`을 한 번 불러 둔다.
- 한 줄에 여러 문장을 쓰는 코드에서 줄 중간 `//` 주석 금지(뒤 코드가 주석이 된다). 수정 후 `node --check`.
- 궁극기 시작은 `ultStart(id)`, 끝은 반드시 `ultStop()`(주변광·줌·롤 복귀 포함해 상태 복구 확인).

## 캡처·검증 (헤드리스, 병렬 가능)
서버: `.claude/launch.json`의 `game-8791`(이미 떠 있으면 그대로 사용, `http://localhost:8791/index.html?rpg`).
```
node _gen/cap/cap.js <cls> <ult id> "0.5,1.2,1.4,…" 이름.jpg --cols 8 --tw 300        # 궁극기 프레임 시트 → _gen/shots/이름.jpg
node _gen/cap/cap.js --cls mage --piece "K3.bolt(pl.x+200,pl.gy,{pal:'violet'});" --ts ".05,.15,.3" --name p.jpg --o "{ch:760}"   # 조각/스킬 단독
node _gen/cap/cap.js --eval "…임의 JS…"                                             # __boot, __step, __one, __piece 사용 가능
```
- 일반 스킬 단독 캡처: `--piece "RPG.sv.CLS.mage.skills.mg_xxx.fn('mg_xxx')"`처럼 스킬 함수를 직접 부른다.
- 캡처 뒤 반드시 이미지를 열어 본다. **화면을 보지 않고 개선됐다고 쓰지 않는다.**
- 종료 후 상태 복구: `--eval "return await __perf('sword','sw_ult1')"` 의 `restored` 값(`lock:false, zk:1, roll:0 …`)과 프레임 비용.

## 원화 생성
`_gen/run_batch.py <manifest.json> <log.json> 2` (gpt-image 스킬, ChatGPT 로그인 Codex). 실패로 나와도 `~/.codex/generated_images/…`에 생성돼 있는 경우가 많다(log의 error 문자열에 경로). 회색·검정 배경·"No colour, no text"로 요청하고 `_gen/v3/proc2.py`처럼 1024 webp로 가공해 `assets/v3_*.webp`에 둔다. 동시에 여러 세션이 돌리면 429가 나므로 **원화 생성은 엔진 담당이 일괄 처리**한다(필요 목록을 보고서에 적는다).

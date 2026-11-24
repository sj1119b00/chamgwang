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
| `smoke(x,y,o)` | 피어오르는 어두운 연기 | `s` `dur` `c` |
| `flare(x,y,z,o)` | 공중의 뜨거운 빛(칼집의 번쩍임 `sx:5,sy:.3`) | `s` `dur` `gain` |
| `sparks(x,y,z,o)` | 불티(줄무늬, 중력) | `n` `sp:[lo,hi]` `up` `dir` `spread` |
| `embers / petals / debris / dust` | 잔불 / 꽃잎(검사 전용 서명) / 그림자 있는 돌 파편 / 바닥 먼지 | `n` 등 |

조명·환경: `GFX.light(x,y,r,'#색',세기,수명,{z,hold,flick})`, `GFX.ambient(r,g,b,속도)`(끝날 때 `GFX.ambient(1,1,1,2)`), `GFX.ripple(x,y,R,{life,s})`.
연출: `Cn.zoom(z)`, `Cn.roll(r)`, `Cn.cam(x,y,k)`/`Cn.cam(null)`, `Cn.shake(s)`, `hitstop=Math.max(hitstop,.08)`, `post.ca=.012`, `Cn.sweep(x,y,D,{speed})`(피해 파동).
저수준(새 조각이 꼭 필요할 때, 자기 `sk_<cls>.js` 안에서): `FX3.mat({...})`, `FX3.lathe/ring/quad/bill/ribbon/wall`, `GFX.add(life,(k,t)=>{…})`, `GFX.pt({...})`. 재질 매개변수는 `fx3.js` 상단 주석과 `vfx3.js`의 `mats()` 참고.

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

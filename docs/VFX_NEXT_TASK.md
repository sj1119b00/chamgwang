# 다음 작업 (2026-11-24 오후, 엔진 v3 · 5개 직업 1차 재작성 뒤)

## 먼저 읽을 것
`VFX_MASTER_PLAN.md`의 "엔진 v3" → `VFX_KIT.md` → 이 파일 → `VFX_PROGRESS.json`. 기준 궁극기는 `sk_sword.js`의 `ultZero`(원본 `_gen/v3/zero_v3.js`, `python _gen/v3/p7.py`로 설치).
사용자 선호: 디테일한 페인팅풍(그라데이션·발광·입자). 평면 단색·3톤 단순화 금지. 컷인·암전·레터박스·화면 전체 섬광 금지. 매 반복 승인 요청 금지(단, 배포 push는 승인 필요).

## 현재 상태 (목표 미달 — 완료 아님)
- 10개 궁극기 + 일반 스킬 45개 + 평타 5개 전부 새 엔진(K3 키트) 위. 직업 파일에 금지 호출 0건(grep 확인).
- 대표 궁극기 독립 검증: 53 → 63 → 64 → 60(검증자마다 기준선 38~46인 척도, 로스트아크 각성기=95). **60대 초반에서 정체.** 29회차(8각 별 구도) 이후는 아직 재검증 전.
- 다른 9개 궁극기는 독립 검증을 아직 받지 않았다(주 세션이 시트를 직접 확인만 함).
- 라이브 사이트(GitHub Pages)는 여전히 옛 버전. `_gen/deploy`에 로컬 커밋만 있음.

## 다음 순서
1. 직업별 2차 보완(새 원화 16종 반영, 자체 보고 약점) 결과 확인 → 10개 궁극기 전체 교차 독립 검증(한 검증자, 같은 척도) → 낮은 순으로 3차 보완.
2. 검증자 공통 지적으로 남은 것: ①영웅이 작고 시전 동작이 약함(옆모습 스프라이트 한계 — 궁극기 전용 키포즈 원화 생성 검토) ②적 스프라이트가 작고 어두움·피격 반응 약함 ③카메라 연출이 정지 화면에서 안 읽힘(영상으로 검증 필요) ④한 색 계열 → 두 색 대비.
3. 에이전트들이 각 직업 파일 안에 만든 지역 조각(lance, skySigil, comet, arc, scorch, whirl, fireLine, stone, palmFall, orbDraw, fa() 등)이 서로 겹친다 → 공용 키트(`vfx3.js`)로 통합.
4. 실제 휴대폰에서 성능·터치·소리 확인(사용자). 저사양이면 메뉴의 "이펙트 품질 낮음".
5. HDR 미지원 기기 폴백(RGBA8) 화면 확인: `?ldr=1`로 캡처.

## 도구
- 캡처: `node _gen/cap/cap.js <cls> <ult> "초,…" 이름.jpg --cols N --tw W` / 조각: `--cls <cls> --piece "JS" --ts "…" --name x.jpg` / 임의: `--eval "…"`.
- 영상: `--eval "await __inc('_gen/v3/h.js'); __boot(cls,ult,{fill:6}); await new Promise(r=>setTimeout(r,2500)); return await __film('이름',7,30,.75);"` → ffmpeg로 mp4 (`_gen/review/`).
- 실시간 프레임: `node _gen/cap/rt.js <cls> <ult> [--low 1]`.
- 원화: `_gen/g4*.json` 매니페스트 → `python _gen/run_batch.py m.json log.json 2` → 실패로 나와도 `~/.codex/generated_images`에 있음(log의 error 경로, 또는 생성 시각 순서) → 1024 webp로 `assets/v3_*.webp`, `vfx3.js`의 TEX 목록과 `VFX_KIT.md`에 등록.
- 서버: `.claude/launch.json`의 `game-8791`(대기열 512). 동시 캡처 5~6개까지 확인.

## 배포
`python _gen/build_deploy.py` → `_gen/deploy`에 로컬 커밋. **push는 사용자 승인 후**: `git -C C:\BMAI\game\_gen\deploy push origin HEAD`

## 미검증
실제 휴대폰 성능·터치, 소리(자동화 창은 무음), HDR 폴백 화면.

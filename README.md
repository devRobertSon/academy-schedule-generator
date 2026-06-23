# 알파학원 입시 로드맵 · 시간표 생성기

학생이 **현재 학년 + 현재 월 + 현재 교과 진도**만 입력하면(목표 학교 입력 없음),

1. **5개 학교(영재학교·과학고·국제고·외고·전사고)** 각각의 특화 과정 로드맵(월별 타임라인),
2. 교과 2과목(수학·과학)을 **드래그로 배치**해 만드는 **주간 시간표**(드래그하면 자동 재생성),
3. 위 결과의 **최종본 내보내기**(인쇄/PDF/PNG)

를 제공하는 정적 웹앱입니다.

> 타임라인 단위는 계절이 아니라 **월(月)** 입니다(초5 3월 ~ 중3 2월 = 60칸).
> 특화 과정은 월 일정이 **고정**, 교과는 **유연**(드래그로 이동, 시간표 즉시 재생성)합니다.

## 기술 스택

- Vite + React + TypeScript
- 드래그앤드롭: `@dnd-kit/core`
- 차트: 외부 라이브러리 없이 **SVG 직접 렌더**
- 이미지 내보내기: `html-to-image`
- 테스트: Vitest

## 개발

소스 코드는 모두 `app/` 폴더 안에 있습니다. 개발 명령은 `app/`에서 실행하세요.

```bash
cd app
npm install
npm run dev      # 개발 서버
npm run test     # 로직 테스트(SPEC 10장 케이스)
npm run build    # 프로덕션 빌드 → 레포 루트(index.html, assets/)로 출력
npm run preview  # 빌드 결과 미리보기
```

## 디렉터리

```
repo/
├─ index.html             # ★ 빌드 결과물(커밋) — GitHub Pages가 서빙
├─ assets/                # ★ 빌드 결과물(커밋) — index.js / index.css
├─ .nojekyll              # Pages가 assets/를 그대로 서빙하도록
├─ SPEC.md · roadmap_A4.svg · README.md
└─ app/                   # 소스(개발용)
   ├─ index.html
   ├─ vite.config.ts      # build.outDir = '..' (루트로 출력)
   ├─ package.json · tsconfig.json
   └─ src/
      ├─ data/roadmap.ts        # 도메인 시드 데이터(월 단위)
      ├─ lib/logic.ts           # 상태/로드맵/시간표/충돌 로직
      ├─ lib/logic.test.ts      # SPEC 10장 테스트
      ├─ components/
      │  ├─ InputForm.tsx       # 학년/월/진도 (학교 입력 없음)
      │  ├─ RoadmapChart.tsx    # 5개 학교 월별 타임라인(SVG)
      │  ├─ TimetableBuilder.tsx# 교과 드래그 → 주간 시간표 재생성
      │  └─ ExportBar.tsx       # 인쇄/PDF/PNG 내보내기
      └─ styles.css
```

## GitHub Pages 배포 (워크플로우 없음)

이 레포는 **빌드 결과물을 레포 루트에 커밋**하는 방식으로 배포합니다. GitHub Pages는 `main` 브랜치 루트를 그대로 서빙합니다. (Actions 워크플로우·Pages 설정 변경 불필요)

코드를 수정한 뒤 배포하려면:

```bash
cd app && npm run build      # 루트의 index.html / assets/ 갱신
cd .. && git add -A && git commit -m "build" && git push   # main에 반영
```

> Vite/React 앱은 빌드된 결과물만 브라우저에서 동작하므로, 소스만 push하면 흰 화면이 됩니다. 반드시 위처럼 **빌드 후 결과물을 커밋**하세요.
>
> 레포명이 바뀌면 `app/vite.config.ts`의 `base`를 `/<레포명>/`로 맞춘 뒤 다시 빌드·커밋하세요. (현재 `/academy-schedule-generator/`)

## 학원이 채워야 할 값

- 각 과정의 `schedule`(요일·시각), `GYO_DEFAULT_BLOCKS`, `GYO_PACE` — 현재 예시값입니다.
- 교과 진도 단원 세분화, 통합과학2/진로·융합선택 추가는 `src/data/roadmap.ts`의 배열에 항목만 추가하면 자동 반영됩니다(데이터 주도).

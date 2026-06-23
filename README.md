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

```bash
npm install
npm run dev      # 개발 서버
npm run test     # 로직 테스트(SPEC 10장 케이스)
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
```

## 디렉터리

```
src/
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

## GitHub Pages 배포

- `main` 브랜치에 push하면 GitHub Pages에 자동으로 반영됩니다. (별도의 Actions 워크플로우 없음)
- 레포명이 바뀌면 `vite.config.ts`의 `base`를 `/<레포명>/`로 맞추세요. (현재 `/academy-schedule-generator/`)

## 학원이 채워야 할 값

- 각 과정의 `schedule`(요일·시각), `GYO_DEFAULT_BLOCKS`, `GYO_PACE` — 현재 예시값입니다.
- 교과 진도 단원 세분화, 통합과학2/진로·융합선택 추가는 `src/data/roadmap.ts`의 배열에 항목만 추가하면 자동 반영됩니다(데이터 주도).

# 알파학원 입시 상담 로드맵

입시 **상담용 도구**입니다. 상담 온 학생의 **현재 학년 + 상담 월 + 수학/과학 진도**와 **목표 학교**를 입력하면:

1. **목표 학교 합격까지 남은 과목**(아직 안 들은 특화/면접/통합과학 + 교과)을 시험 전까지 배치한 **로드맵**,
2. **월별 시간표**(◀ ▶로 달 이동, 담당 선생님 표시),
3. 학부모님께 전달할 **최종본 내보내기**(인쇄/PDF/PNG)

를 만들어 줍니다.

**상호작용**
- 로드맵에서 과목 막대를 **좌우로 드래그** → 수강 시작 월 이동 → 월별 시간표에 자동 반영
- 월별 시간표에서 **달을 바꾸고**, 수업 블록을 **드래그**해 요일·시간 조정 (충돌 경고)

**관리(Admin) 탭**
- 과정의 **개설 월·기간·수업 요일·시작 시간·담당 선생님**을 추가/편집/삭제
- 교과(수학·과학) 기본 요일/시간/담당쌤/진행속도 설정
- 변경 내용은 **브라우저(localStorage)에 자동 저장**, **JSON 내보내기/가져오기**로 백업·복원

> 타임라인 단위는 **월(月)** 입니다(초5 3월 ~ 중3 2월 = 60칸).

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
      ├─ data/roadmap.ts          # 도메인 시드 데이터(월 단위, 담당쌤 포함)
      ├─ lib/logic.ts             # 남은 과목/월별 시간표/충돌 로직
      ├─ lib/store.ts             # localStorage 영속화 + JSON 백업
      ├─ lib/logic.test.ts        # 로직 테스트
      ├─ components/
      │  ├─ ConsultForm.tsx       # 상담 정보 입력(이름/학년/월/진도)
      │  ├─ RemainingRoadmap.tsx  # 목표 학교 남은 과목 로드맵(드래그=수강월 이동)
      │  ├─ MonthlyTimetable.tsx  # 월별 시간표(달 이동 + 요일/시간 드래그)
      │  ├─ AdminPage.tsx         # 과정/교과/담당쌤 관리 + JSON 백업
      │  └─ ExportBar.tsx         # 인쇄/PDF/PNG 내보내기
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

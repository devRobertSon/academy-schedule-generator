# 알파학원 입시 로드맵 · 시간표 생성기 — Claude Code 빌드 지시서 (SPEC.md)

## 0. 이 문서 사용법
- 빈 GitHub 레포를 만들고 로컬에 clone 한 뒤, 이 `SPEC.md`와 디자인 레퍼런스 `roadmap_A4.svg`를 레포 루트에 둔다.
- Claude Code에 **"SPEC.md를 처음부터 끝까지 읽고 그대로 구현해줘. 데이터/타입/로직 정의를 따르고, 불명확하면 합리적 기본값으로 진행해줘."** 라고 입력한다.
- 또는 맨 아래 **11장 단계별 프롬프트**를 순서대로 입력한다.

> ⚠ **핵심 원칙**
> 1) 타임라인 단위는 **계절이 아니라 "월(月)"** (초5 3월 ~ 중3 2월 = 60칸).
> 2) **목표 학교를 입력하지 않는다.** 결과는 **5개 학교(트랙) 전부**를 동시에 출력한다.
> 3) 특화 과정은 월 일정이 **고정**, **교과는 유연**하므로 **블록을 드래그**해 시간을 옮길 수 있고, 옮기면 **시간표가 즉시 재생성**된다.
> 4) "특화 과정"이 올바른 명칭이다(과거 "사고력 과정" 표기 금지).

---

## 1. 목표(한 줄 요약)
학생이 **현재 학년 + 현재 월 + 현재 교과 진도**만 입력하면(목표 학교 입력 없음),
(1) **5개 학교(영재학교·과학고·국제고·외고·전사고) 각각의 특화 과정 로드맵(월별 타임라인)**,
(2) 교과 2과목을 **드래그로 배치**해 만드는 **주간 시간표**(드래그하면 자동 재생성),
(3) 위 결과의 **최종본 내보내기(인쇄/PDF/이미지)** 를 제공하는 정적 웹앱.
`main` 브랜치 push 시 GitHub Actions로 **GitHub Pages 자동 배포**.

---

## 2. 기술 스택 / 레포 구조
- **Vite + React + TypeScript**, 산출물 `dist/`를 Pages로 배포.
- 스타일: 순수 CSS(또는 CSS Modules).
- 드래그앤드롭: 가벼운 **@dnd-kit/core** 사용(또는 pointer 이벤트 직접 구현). 외부 차트 라이브러리는 쓰지 않고 **SVG/HTML 직접** 렌더.
- 내보내기: 인쇄(window.print + `@media print`) 기본, 이미지 저장은 **html-to-image**(선택).

```
repo/
├─ SPEC.md
├─ roadmap_A4.svg            # 디자인 레퍼런스(월별, 특화 과정)
├─ index.html
├─ package.json
├─ vite.config.ts
├─ .github/workflows/deploy.yml
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ data/roadmap.ts        # 3장 시드 데이터(월 단위)
│  ├─ lib/logic.ts           # 5장 로직
│  ├─ components/
│  │  ├─ InputForm.tsx       # 학년/월/진도 (학교 입력 X)
│  │  ├─ RoadmapChart.tsx    # 7장: 5개 학교 전부 월별 타임라인(SVG)
│  │  ├─ TimetableBuilder.tsx# 8장: 교과 드래그 → 주간 시간표 재생성
│  │  └─ ExportBar.tsx       # 9.5장: 최종본 내보내기
│  └─ styles.css
└─ README.md
```

---

## 3. 도메인 데이터 (시드) — 그대로 `src/data/roadmap.ts`
> 학년·과목·기간은 확정 데이터(월로 환산). 계절→월 규칙: 봄 3·4·5 / 여름 6·7·8 / 가을 9·10·11 / 겨울 12·1·2.
> `schedule`(요일/시각)만 예시 placeholder(`// TODO 시간`). **특화/면접/통합과학 = 고정 일정**, **교과 = 드래그로 이동 가능**.

```ts
// src/data/roadmap.ts
export type Grade = '초5' | '초6' | '중1' | '중2' | '중3';
export type Track = '영재학교' | '과학고' | '국제고' | '외고' | '전사고';
export type Subject = '수학' | '과학' | '면접';
export type CourseType = '특화' | '면접' | '통합과학' | '교과';
export type Weekday = '월' | '화' | '수' | '목' | '금' | '토' | '일';
export type Season = '봄' | '여름' | '가을' | '겨울';

export const GRADES: Grade[] = ['초5', '초6', '중1', '중2', '중3'];
export const TRACKS: Track[] = ['영재학교', '과학고', '국제고', '외고', '전사고'];
export const ACADEMIC_MONTHS: number[] = [3,4,5,6,7,8,9,10,11,12,1,2]; // 학사연도 월 순서

export const COLORS = {
  수학: { fill: '#85B7EB', text: '#042C53' },
  과학: { fill: '#F0997B', text: '#4A1B0C' },
  면접: { fill: '#AFA9EC', text: '#26215C' },
  교과: { fill: '#D3D1C7', text: '#2C2C2A' },
};

export function academicMonthIndex(month: number): number { return (month + 9) % 12; } // 3월=0…2월=11
export function gmIndex(grade: Grade, month: number): number {                          // 0..59
  return GRADES.indexOf(grade) * 12 + academicMonthIndex(month);
}
export function monthToSeason(month: number): Season {
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

export interface TimeSlot { day: Weekday; start: string; end: string; } // 'HH:MM'
export interface YM { grade: Grade; month: number; }

export interface Course {
  id: string; name: string;
  track: Track | '공통';   // '공통' = 교과
  subject: Subject; type: CourseType;
  start: YM; end: YM;      // 포함 구간(월)
  schedule: TimeSlot[];    // TODO 시간
}

/** 트랙별 특화/면접/통합과학 과정 (월 단위, 일정 고정) */
export const TRACK_COURSES: Course[] = [
  // 영재학교 · 수학
  { id:'yj_chang1', name:'창의수학 1단계', track:'영재학교', subject:'수학', type:'특화',
    start:{grade:'중1',month:6}, end:{grade:'중1',month:2}, schedule:[{day:'월',start:'18:00',end:'20:00'}] },
  { id:'yj_kmo', name:'KMO', track:'영재학교', subject:'수학', type:'특화',
    start:{grade:'중2',month:3}, end:{grade:'중3',month:8}, schedule:[{day:'화',start:'18:00',end:'21:00'}] },
  { id:'yj_final_math', name:'영재 파이널 수학', track:'영재학교', subject:'수학', type:'특화',
    start:{grade:'중2',month:12}, end:{grade:'중3',month:8}, schedule:[{day:'목',start:'18:00',end:'21:00'}] },
  { id:'yj_hs_math_review', name:'고등수학 총정리', track:'영재학교', subject:'수학', type:'특화',
    start:{grade:'중3',month:9}, end:{grade:'중3',month:11}, schedule:[{day:'토',start:'10:00',end:'13:00'}] },
  // 영재학교 · 과학
  { id:'yj_astro_genetics', name:'천체·유전 특강', track:'영재학교', subject:'과학', type:'특화',
    start:{grade:'중2',month:6}, end:{grade:'중2',month:11}, schedule:[{day:'수',start:'18:00',end:'20:00'}] },
  { id:'yj_mid_adv_sci', name:'중등심화과학', track:'영재학교', subject:'과학', type:'특화',
    start:{grade:'중2',month:12}, end:{grade:'중2',month:2}, schedule:[{day:'금',start:'18:00',end:'20:00'}] },
  { id:'yj_final_sci', name:'영재 파이널 과학', track:'영재학교', subject:'과학', type:'특화',
    start:{grade:'중3',month:3}, end:{grade:'중3',month:8}, schedule:[{day:'토',start:'14:00',end:'17:00'}] },
  { id:'yj_phys_chem_review', name:'물리학/화학 총정리', track:'영재학교', subject:'과학', type:'특화',
    start:{grade:'중3',month:9}, end:{grade:'중3',month:11}, schedule:[{day:'일',start:'10:00',end:'13:00'}] },
  // 과학고 · 수학
  { id:'sg_chang1', name:'창의수학 1단계', track:'과학고', subject:'수학', type:'특화',
    start:{grade:'중2',month:6}, end:{grade:'중2',month:2}, schedule:[{day:'월',start:'17:00',end:'19:00'}] },
  { id:'sg_chang2', name:'창의수학 2단계', track:'과학고', subject:'수학', type:'특화',
    start:{grade:'중3',month:3}, end:{grade:'중3',month:8}, schedule:[{day:'목',start:'17:00',end:'20:00'}] },
  { id:'sg_interview_math', name:'과학고 면접 대비(수학)', track:'과학고', subject:'수학', type:'면접',
    start:{grade:'중3',month:9}, end:{grade:'중3',month:11}, schedule:[{day:'토',start:'13:00',end:'15:00'}] },
  { id:'sg_hs_math_info_review', name:'고등수학 및 정보 총정리', track:'과학고', subject:'수학', type:'특화',
    start:{grade:'중3',month:12}, end:{grade:'중3',month:2}, schedule:[{day:'토',start:'15:00',end:'18:00'}] },
  // 과학고 · 과학
  { id:'sg_mid_adv_sci', name:'중등심화과학', track:'과학고', subject:'과학', type:'특화',
    start:{grade:'중3',month:6}, end:{grade:'중3',month:8}, schedule:[{day:'수',start:'17:00',end:'19:00'}] },
  { id:'sg_interview_sci', name:'과학고 면접 대비(과학)', track:'과학고', subject:'과학', type:'면접',
    start:{grade:'중3',month:9}, end:{grade:'중3',month:11}, schedule:[{day:'토',start:'15:00',end:'17:00'}] },
  { id:'sg_hs_sci_review', name:'고등과학 총정리', track:'과학고', subject:'과학', type:'특화',
    start:{grade:'중3',month:12}, end:{grade:'중3',month:2}, schedule:[{day:'일',start:'13:00',end:'16:00'}] },
  // 국제고
  { id:'ig_interview', name:'면접 대비', track:'국제고', subject:'면접', type:'면접',
    start:{grade:'중3',month:9}, end:{grade:'중3',month:11}, schedule:[{day:'금',start:'19:00',end:'21:00'}] },
  { id:'ig_int_sci1', name:'통합과학1', track:'국제고', subject:'과학', type:'통합과학',
    start:{grade:'중3',month:9}, end:{grade:'중3',month:2}, schedule:[{day:'화',start:'17:00',end:'19:00'}] },
  // 외고
  { id:'fl_interview', name:'면접 대비', track:'외고', subject:'면접', type:'면접',
    start:{grade:'중3',month:9}, end:{grade:'중3',month:11}, schedule:[{day:'금',start:'19:00',end:'21:00'}] },
  { id:'fl_int_sci1', name:'통합과학1', track:'외고', subject:'과학', type:'통합과학',
    start:{grade:'중3',month:9}, end:{grade:'중3',month:2}, schedule:[{day:'화',start:'17:00',end:'19:00'}] },
  // 전사고
  { id:'js_int_sci1', name:'통합과학1', track:'전사고', subject:'과학', type:'통합과학',
    start:{grade:'중3',month:9}, end:{grade:'중3',month:2}, schedule:[{day:'목',start:'17:00',end:'19:00'}] },
];

/** 교과(공통) — 교육과정 "순서" 배열. 학생 진도 = 인덱스. 앱에서 현재 월에 투영. */
export const MATH_GYO_SEQUENCE = ['중1-1학기','중1-2학기','중2-1학기','중2-2학기','중3-1학기','중3-2학기','공통수학1','공통수학2','대수','미적분Ⅰ','확률과 통계','미적분Ⅱ','기하'];
export const SCI_GYO_MID_SEQUENCE = ['중1-1학기','중1-2학기','중2-1학기','중2-2학기','중3-1학기','중3-2학기'];
export const SCI_GYO_HS_PARALLEL = ['물리학','화학','생명과학','지구과학'];

/** 교과는 2과목(수학·과학)을 동시에 들을 수 있다. 아래 슬롯이 드래그 가능한 기본 블록. */
export const GYO_DEFAULT_BLOCKS = {
  math: [{ day:'수', start:'16:00', end:'18:00' }] as TimeSlot[], // TODO 시간 (세션 추가 가능)
  sci:  [{ day:'금', start:'16:00', end:'18:00' }] as TimeSlot[], // TODO 시간
};
export const GYO_PACE = { mathMonthsPerItem: 3, sciMonthsPerItem: 3 }; // 교과 진행 속도(월/항목)
```

---

## 4. 입력값(폼) — `InputForm.tsx`
- `현재 학년(grade)`: 초5~중3
- `현재 월(month)`: 1~12 → `gmIndex(grade, month)`로 현재 월 인덱스(0..59)
- `수학 교과 진도`: `MATH_GYO_SEQUENCE` 중 현재 항목(인덱스)
- `과학 교과 진도`: 중등이면 `SCI_GYO_MID_SEQUENCE`, 고등 진입이면 `SCI_GYO_HS_PARALLEL`
- **목표 학교 입력란은 없다.** (결과에서 5개 학교 전부 출력)
- (선택) `기준 시점`: 기본 "현재 월", 다른 월 선택 가능

---

## 5. 핵심 로직 — `src/lib/logic.ts`
```ts
type Status = '완료' | '진행중' | '예정';

nowIndex(grade, month) => gmIndex(grade, month)

courseStatus(course, atIdx): Status   // gmIndex(start)..gmIndex(end) 기준 완료/진행중/예정

// 5개 학교 전부의 로드맵 데이터 (입력에 학교 없음)
buildAllRoadmaps(atIdx): Record<Track, { course, status }[]>
  = TRACKS.map(t => TRACK_COURSES.filter(c=>c.track===t).map(c=>({course:c, status:courseStatus(c,atIdx)})))

// 교과 월 투영(완료/진행중/예정)
projectGyo(seq, currentIdx, nowIdx, monthsPerItem) => seq.map((name,i)=>({name, startIdx: nowIdx+(i-currentIdx)*monthsPerItem, done: i<currentIdx, current: i===currentIdx}))

// 시간표 재생성: 특정 학교 특화(고정) + 드래그된 교과 블록
buildTimetable(track, atIdx, gyoBlocks: {math:TimeSlot[], sci:TimeSlot[]}) => {
  const fixed = TRACK_COURSES.filter(c=>c.track===track && courseStatus(c,atIdx)==='진행중')
                 .flatMap(c => c.schedule.map(s=>({label:c.name, subject:c.subject, slot:s, fixed:true})));
  const gyo = [...gyoBlocks.math.map(s=>({label:'수학 교과', subject:'수학', slot:s, fixed:false})),
               ...gyoBlocks.sci.map(s=>({label:'과학 교과', subject:'과학', slot:s, fixed:false}))];
  return { blocks:[...fixed, ...gyo], conflicts: detectConflicts([...fixed,...gyo]) };
}

detectConflicts(blocks) => 같은 요일·시간 겹치는 쌍 목록
```
- 드래그로 `gyoBlocks`가 바뀌면 `buildTimetable`을 다시 호출 → 시간표/충돌 즉시 갱신.

---

## 6. 화면(UI) — `App.tsx`
1. 상단: **입력 폼**(학년/월/진도). 학교 선택 없음.
2. **로드맵 영역**(7장): **5개 학교 전부**를 한 화면에 출력. 각 학교 특화 과정 + 교과 + 현재 월 세로선 + 상태 표시.
3. **시간표 빌더**(8장): 학교 탭(영재/과학고/국제고/외고/전사고) 전환. 선택 학교의 특화(고정) + 교과 2과목(드래그) 블록으로 주간 시간표. 드래그 시 즉시 재생성.
4. **내보내기 바**(9.5장): 현재 화면(로드맵+시간표)을 인쇄/PDF/이미지로 저장.

---

## 7. 로드맵 시각화 — `RoadmapChart.tsx` (SVG, 가로 스크롤, 5개 학교 전부)
- 가로축 = **월** 60칸(초5~중3). 헤더 2단: ① 학년(각 12칸) ② 월 숫자(3…12,1,2), 계절별 옅은 배경 틴트.
- **5개 학교(트랙)를 위→아래로 모두** 표시(영재학교·과학고·국제고·외고·전사고). 각 학교 안에서 과목 줄(수학/과학/면접) 분리, 기간 겹치면 레벨 쌓기.
- 막대: `gmIndex(start)~gmIndex(end)` → 색 `COLORS[subject]`. 짧으면 라벨 2줄.
- **교과**: 하단 별도 섹션(수학 교과 한 줄 / 과학 교과 = 중등 블록→물·화·생·지 4줄 병렬). `projectGyo`로 과거=흐리게·현재=강조·이후=예정.
- **현재 월 세로선**(빨간 점선 + "오늘 ○월"), 완료 opacity 0.45 / 진행중 stroke 강조 / 예정 기본.
- 라벨은 반드시 **"특화 과정"**(좌상단 섹션명). 색/레벨 쌓기/교과 분기 구조는 `roadmap_A4.svg`를 따른다.

---

## 8. 주간 시간표 빌더 — `TimetableBuilder.tsx` (드래그 → 재생성)
- 그리드: **요일(월~일) × 시간(예 16:00~21:00, 30분 눈금)**.
- 학교 탭으로 선택된 학교의 **특화/면접/통합과학 수업(진행중)** = **고정 블록**(드래그 불가, 회색 잠금 아이콘).
- **교과 2과목(수학 교과·과학 교과)** = **드래그 가능한 블록**. (교과는 2과목 동시 수강이 가능하므로 자유 배치)
  - @dnd-kit 또는 pointer 이벤트로 요일 칸·시간 슬롯에 **스냅 이동**(블록 길이=수업 시간 유지).
  - 같은 교과를 주 N회로 늘리려면 "세션 추가" 버튼으로 블록 복제.
- **드래그가 끝나면 `gyoBlocks` 상태 업데이트 → `buildTimetable` 재호출 → 시간표·충돌 즉시 재생성.**
- **충돌**(같은 요일·시간 겹침) = 빨간 테두리 + 하단 경고 목록. 특화(고정)와 겹치면 교과를 옮겨 해결.
- 하단에 "이번 주 수업 목록"(요일·시간·과목) 텍스트도 출력.
- 학교 탭마다 시간표를 따로 만들 수 있게 `gyoBlocks`는 공통(학생 교과는 동일), 특화만 학교별로 달라진다. (탭 전환 시 교과 배치는 유지)

---

## 9. GitHub Pages 자동 배포
### 9.1 `vite.config.ts`
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], base:'/REPO_NAME/' }); // 레포명, 루트레포면 '/'
```
### 9.2 `.github/workflows/deploy.yml`
```yaml
name: Deploy to GitHub Pages
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
### 9.3 한 번만(사람): Settings → Pages → Source = "GitHub Actions".
### 9.4 폰트: 한글 시스템 폰트 우선(`'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif`).
### 9.5 **최종본 내보내기** — `ExportBar.tsx`
- 기본: **인쇄/PDF** = `window.print()` + `@media print`(로드맵 5개 학교 + 시간표가 한 페이지/연속 페이지로 깔끔히 나오도록 print 레이아웃 정의).
- 선택: **이미지 저장** = `html-to-image`의 `toPng`로 결과 영역을 PNG 다운로드.
- 내보낼 때 상단에 입력 요약(학년·월·진도)과 생성일자를 표기.

---

## 10. 완료 기준 / 테스트 케이스 (월 해상도)
- **예시: 중2, 9월** → `nowIndex = gmIndex('중2',9) = 3*12+6 = 42`
  - 학교 입력 없이 5개 학교 로드맵이 모두 출력된다.
  - 영재학교: KMO(중2 3월 idx36~중3 8월 idx53)·천체·유전 특강(idx39~44) **진행중**, 영재 파이널 수학(idx45~)·중등심화과학(idx45~47) **예정**, 창의수학 1단계(idx27~35) **완료**.
  - 시간표 빌더(영재학교 탭): KMO(화·고정)·천체·유전 특강(수·고정) + 수학 교과·과학 교과(드래그 블록). 교과 블록을 옮기면 시간표가 즉시 바뀐다. 충돌 시 경고.
  - 내보내기로 인쇄/PDF·PNG 저장이 된다.
- `main` push → Actions 통과 → Pages에서 동일 확인. 모바일에서 폼/시간표 정상(로드맵 가로 스크롤 허용).

---

## 11. 단계별 Claude Code 프롬프트(순서대로)
1. "Vite + React + TS 초기화, SPEC 2장 구조대로 뼈대 + @dnd-kit, html-to-image 의존성 추가."
2. "SPEC 3장 `src/data/roadmap.ts` 생성(데이터·월 단위 유지, 명칭 '특화 과정')."
3. "SPEC 5장 로직 `src/lib/logic.ts` 구현 + 10장 예시 vitest 테스트."
4. "SPEC 4·6장대로 `InputForm.tsx`(학교 입력 없음)와 `App.tsx` 레이아웃."
5. "SPEC 7장대로 `RoadmapChart.tsx`(월 60칸, 5개 학교 전부, 현재 월 선, 교과 투영). roadmap_A4.svg 디자인 기준, 섹션명 '특화 과정'."
6. "SPEC 8장대로 `TimetableBuilder.tsx`(특화 고정 + 교과 드래그, 드래그 시 시간표 재생성, 충돌 경고, 학교 탭)."
7. "SPEC 9.5장 `ExportBar.tsx`(인쇄/PDF + PNG)와 9장 배포 설정(vite base, deploy.yml, README)."
8. "`npm run dev`로 10장 케이스 확인, `npm run build` 통과까지 수정."
9. "전부 commit 후 main push 명령 안내(또는 실행)."

---

## 12. 학원이 채워야 할 값 / 조정 포인트
- 모든 과정 `schedule`(요일·시각), `GYO_DEFAULT_BLOCKS`, `GYO_PACE` — 현재 예시값.
- 계절→월 변환으로 3개월 폭이 된 단일 계절 과정(면접·총정리)을 특정 월로 좁히려면 해당 과정 `start/end` 월을 같은 달로 수정.
- `vite.config.ts`의 `base`(레포명).
- (선택) 교과 진도 단원 세분화, 통합과학2·진로/융합선택 추가 — 배열에 항목만 추가하면 자동 반영(데이터 주도).
- (선택) 교과 주당 세션 수(블록 개수)·기본 배치 시간 조정.

import { useEffect, useMemo, useRef, useState } from 'react';
import ConsultForm, { ConsultInfo } from './components/ConsultForm';
import RemainingRoadmap from './components/RemainingRoadmap';
import MonthlyTimetable from './components/MonthlyTimetable';
import JourneySummary from './components/JourneySummary';
import AdminPage from './components/AdminPage';
import ExportBar from './components/ExportBar';
import {
  Course,
  MATH_GYO_SEQUENCE,
  SCI_GYO_SEQUENCE,
  TimeSlot,
  Track,
  TRACKS,
  TrackPlan,
  defaultHiddenIds,
  posToEndYM,
  posToStartYM,
  ymLabel,
} from './data/roadmap';
import { journeySummary, nowIndex, remainingCourses } from './lib/logic';
import { StoreData, loadStore, mergePlans, saveStore } from './lib/store';

type Page = 'consult' | 'admin';

const DEFAULT_CONSULT: ConsultInfo = {
  studentName: '',
  grade: '중1',
  month: 6,
  mathIdx: MATH_GYO_SEQUENCE.indexOf('중3-2학기'),
  sciIdx: SCI_GYO_SEQUENCE.indexOf('중2-2학기'),
};

/** 저장/불러오기 파일 형식: 과정·여정 데이터 + 이 학생의 상담 상태 */
interface SavedFile {
  version: 1;
  courses: Course[];
  plans?: Record<Track, TrackPlan>;
  consult?: {
    info: ConsultInfo;
    track: Track;
    shifts: Record<string, number>;
    slotOverrides: Record<string, TimeSlot>;
    hidden: string[];
    viewIdx: number;
  };
}

// 레포 루트의 logo.png (GitHub Pages 기준). 없으면 α 마크로 대체.
const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

export default function App() {
  const [page, setPage] = useState<Page>('consult');
  const [store, setStoreState] = useState<StoreData>(() => loadStore());
  const updateCourses = (fn: (courses: Course[]) => Course[]) =>
    setStoreState((prev) => {
      const next = { ...prev, courses: fn(prev.courses) };
      saveStore(next);
      return next;
    });
  const setStore = (next: StoreData) => {
    setStoreState(next);
    saveStore(next);
  };

  const [info, setInfo] = useState<ConsultInfo>(DEFAULT_CONSULT);
  const [track, setTrack] = useState<Track>('영재학교');
  const [shifts, setShifts] = useState<Record<string, number>>({});
  const [slotOverrides, setSlotOverrides] = useState<Record<string, TimeSlot>>({});
  // 처음엔 수학 교과 공통수학2 다음 과목(대수~기하)을 접어 둠 → 로드맵 아래 '숨긴 과목'에서 클릭해 추가
  const [hidden, setHidden] = useState<string[]>(() => defaultHiddenIds(store.courses));
  const [logoOk, setLogoOk] = useState(true);

  const atIdx = useMemo(() => nowIndex(info.grade, info.month), [info.grade, info.month]);
  const progress = useMemo(
    () => ({ mathCurrent: info.mathIdx + 1, sciCurrent: info.sciIdx + 1 }),
    [info.mathIdx, info.sciIdx]
  );
  const [viewIdx, setViewIdx] = useState<number>(atIdx);
  useEffect(() => {
    setViewIdx((v) => Math.min(59, Math.max(atIdx, v)));
  }, [atIdx]);

  const visibleCourses = useMemo(() => store.courses.filter((c) => !hidden.includes(c.id)), [store.courses, hidden]);
  const plan = store.plans[track];
  const journey = useMemo(
    () => journeySummary(visibleCourses, plan, track, atIdx, shifts, progress),
    [visibleCourses, plan, track, atIdx, shifts, progress]
  );

  const exportRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mathProgress = MATH_GYO_SEQUENCE[info.mathIdx];
  const sciProgress = SCI_GYO_SEQUENCE[info.sciIdx];
  const today = new Date().toLocaleDateString('ko-KR');
  const remaining = remainingCourses(visibleCourses, track, atIdx, shifts);
  const firstExam = journey.milestones[0];

  // ── 저장 / 불러오기 (JSON 파일) ─────────────────────────
  const saveFile = () => {
    const data: SavedFile = {
      version: 1,
      courses: store.courses,
      plans: store.plans,
      consult: { info, track, shifts, slotOverrides, hidden, viewIdx },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `상담_${info.studentName || '학생'}_${track}_${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const loadFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<SavedFile>;
      if (!Array.isArray(parsed.courses)) throw new Error('courses 배열이 없습니다');
      setStore({ courses: parsed.courses, plans: mergePlans(parsed.plans) });
      const c = parsed.consult;
      if (c) {
        setInfo(c.info);
        setTrack(c.track);
        setShifts(c.shifts ?? {});
        setSlotOverrides(c.slotOverrides ?? {});
        setHidden(c.hidden ?? []);
        setViewIdx(c.viewIdx ?? nowIndex(c.info.grade, c.info.month));
      }
      alert('불러왔습니다.');
    } catch (e) {
      alert('파일을 읽지 못했습니다: ' + (e as Error).message);
    }
  };

  return (
    <div className="app">
      <header className="app-header no-print">
        <div className="brand">
          <a className="logo" href="#" onClick={(e) => e.preventDefault()}>
            {logoOk ? (
              <img src={LOGO_URL} alt="알파학원" onError={() => setLogoOk(false)} />
            ) : (
              <span className="mark">α</span>
            )}
            <span>
              <b>알파학원</b>
              <small>입시 상담 로드맵</small>
            </span>
          </a>
          <nav className="page-nav">
            <button className={page === 'consult' ? 'active' : ''} onClick={() => setPage('consult')}>
              상담
            </button>
            <button className={page === 'admin' ? 'active' : ''} onClick={() => setPage('admin')}>
              관리
            </button>
          </nav>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
              e.target.value = '';
            }}
          />
          {page === 'admin' && (
            <div className="file-bar">
              <button className="primary" onClick={saveFile}>
                💾 저장
              </button>
              <button onClick={() => fileRef.current?.click()}>📂 불러오기</button>
            </div>
          )}
        </div>
      </header>

      {page === 'admin' ? (
        <section className="card">
          <p className="muted">
            과정의 개설 월·기간·요일·시작시간·담당 선생님과 학교별 입시 단계·시험을 편집합니다. 브라우저에 자동 저장되며 JSON으로 백업할 수 있습니다.
          </p>
          <AdminPage store={store} onChange={setStore} />
        </section>
      ) : (
        <>
          {/* 히어로: 큰 제목 + 입력 칩 + 버튼 */}
          <section className="hero no-print">
            <div className="hero-l">
              <div className="eyebrow">Roadmap · {track}</div>
              <h2>
                {info.studentName ? `${info.studentName} 학생의 ` : ''}
                {track} 로드맵
              </h2>
              <div className="chip-bar">
                <ConsultForm value={info} onChange={setInfo} />
                {/* 목표 학교: 목록을 펼쳐서 버튼으로 */}
                <div className="seg" role="radiogroup" aria-label="목표 학교">
                  <span className="k">목표</span>
                  {TRACKS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={track === t}
                      className={track === t ? 'on' : ''}
                      onClick={() => setTrack(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {journey.milestones.length > 0 && (
                <div className="chip-bar exam-bar">
                  {journey.milestones.map((m) => (
                    <span key={m.name} className="chip stat" title={`${m.name}까지`}>
                      ◆ {m.name} · {ymLabel(Math.floor(m.pos))} {m.half ? '중순' : '초'} · <b>{m.monthsLeft < 1 ? '이번 달' : `${m.monthsLeft}개월`}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="hero-r">
              <button className="primary" onClick={saveFile}>
                💾 저장
              </button>
              <button onClick={() => fileRef.current?.click()}>📂 불러오기</button>
              <ExportBar targetRef={exportRef} />
            </div>
          </section>

          <div className="export-region" ref={exportRef}>
            {/* 인쇄/PNG용 요약 헤더 */}
            <div className="export-summary">
              <h2>
                {info.studentName ? `${info.studentName} 학생 · ` : ''}
                {track} 준비 로드맵
              </h2>
              <p>
                현재 {info.grade} {info.month}월 · 수학 진도 {mathProgress} 완료 · 과학 진도 {sciProgress} 완료
                {firstExam ? ` · ${firstExam.name}까지 ${firstExam.monthsLeft}개월` : ''}
                <span className="gen-date"> · 상담일 {today}</span>
              </p>
            </div>

            <section className="card hero-card">
              <div className="card-head">
                <span className="eyebrow">Roadmap</span>
                <h2>
                  {track} 합격까지 남은 과목
                  <span className="muted">
                    · {remaining.length}개 과정 · {plan.phases.length}단계
                  </span>
                </h2>
              </div>
              <div className="roadmap-scroll">
                <RemainingRoadmap
                  courses={visibleCourses}
                  form={info}
                  track={track}
                  plan={plan}
                  atIdx={atIdx}
                  shifts={shifts}
                  onShiftChange={(id, shift) => setShifts((s) => ({ ...s, [id]: shift }))}
                  onCourseRange={(id, r) =>
                    updateCourses((cs) =>
                      cs.map((c) => (c.id === id ? { ...c, start: posToStartYM(r.startPos), end: posToEndYM(r.endPos) } : c))
                    )
                  }
                  onCourseChange={(course) => updateCourses((cs) => cs.map((c) => (c.id === course.id ? course : c)))}
                  onHide={(id) => setHidden((h) => (h.includes(id) ? h : [...h, id]))}
                  hiddenCourses={store.courses.filter((c) => hidden.includes(c.id))}
                  onShow={(id) => setHidden((h) => h.filter((x) => x !== id))}
                />
              </div>
              <JourneySummary summary={journey} />
            </section>

            <section className="card">
              <div className="card-head">
                <span className="eyebrow">Timetable</span>
                <h2>월별 시간표</h2>
              </div>
              <MonthlyTimetable
                courses={visibleCourses}
                progress={progress}
                track={track}
                atIdx={atIdx}
                viewIdx={viewIdx}
                onViewIdxChange={setViewIdx}
                shifts={shifts}
                slotOverrides={slotOverrides}
                onSlotOverrideChange={(key, slot) => setSlotOverrides((s) => ({ ...s, [key]: slot }))}
              />
            </section>
          </div>

          <footer className="app-footer no-print">
            <small>목표 학교 1곳 기준 · 남은 과목만 표시 · 블록 클릭 = 선택(시작·종료월 표시), 선택된 블록 다시 클릭 = 편집 팝업 · 과정·단계·시험은 [관리] 탭에서도 수정</small>
          </footer>
        </>
      )}
    </div>
  );
}

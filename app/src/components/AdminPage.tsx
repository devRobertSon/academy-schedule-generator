import { useRef } from 'react';
import {
  COURSE_TYPES,
  Course,
  CourseType,
  Grade,
  GRADES,
  Milestone,
  Phase,
  Subject,
  Track,
  TRACKS,
  TrackPlan,
  Weekday,
  YM,
} from '../data/roadmap';
import {
  StoreData,
  defaultStore,
  exportStoreJson,
  newCourseId,
  parseStoreJson,
} from '../lib/store';

const SUBJECTS: Subject[] = ['수학', '과학', '면접'];
const TRACK_OPTIONS: (Track | '공통')[] = [...TRACKS, '공통'];
const DAYS: Weekday[] = ['월', '화', '수', '목', '금', '토', '일'];
const MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2];

interface Props {
  store: StoreData;
  onChange: (next: StoreData) => void;
}

export default function AdminPage({ store, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const updateCourse = (id: string, patch: Partial<Course>) =>
    onChange({ ...store, courses: store.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const updateSession = (
    id: string,
    i: number,
    patch: Partial<{ day: Weekday; start: string; end: string }>
  ) =>
    onChange({
      ...store,
      courses: store.courses.map((c) =>
        c.id !== id ? c : { ...c, schedule: c.schedule.map((s, j) => (j === i ? { ...s, ...patch } : s)) }
      ),
    });

  const addSession = (id: string) =>
    onChange({
      ...store,
      courses: store.courses.map((c) => {
        if (c.id !== id) return c;
        const last = c.schedule[c.schedule.length - 1] ?? { day: '월' as Weekday, start: '17:00', end: '19:00' };
        return { ...c, schedule: [...c.schedule, { ...last }] };
      }),
    });

  const removeSession = (id: string, i: number) =>
    onChange({
      ...store,
      courses: store.courses.map((c) =>
        c.id !== id || c.schedule.length <= 1 ? c : { ...c, schedule: c.schedule.filter((_, j) => j !== i) }
      ),
    });

  const addCourse = () => {
    const nc: Course = {
      id: newCourseId(),
      name: '새 과정',
      track: '영재학교',
      subject: '수학',
      type: '영재학교입시',
      start: { grade: '중1', month: 3 },
      end: { grade: '중1', month: 8 },
      schedule: [{ day: '월', start: '17:00', end: '19:00' }],
      teacher: '',
    };
    onChange({ ...store, courses: [...store.courses, nc] });
  };

  const deleteCourse = (id: string) => {
    if (!confirm('이 과정을 삭제할까요?')) return;
    onChange({ ...store, courses: store.courses.filter((c) => c.id !== id) });
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      onChange(parseStoreJson(text));
      alert('불러왔습니다.');
    } catch (e) {
      alert('JSON을 읽지 못했습니다: ' + (e as Error).message);
    }
  };

  const resetAll = () => {
    if (!confirm('모든 과목 설정을 기본값으로 되돌릴까요?')) return;
    onChange(defaultStore());
  };

  // ── 학교별 여정 단계·시험 편집 ────────────────────────
  const setPlan = (t: Track, fn: (p: TrackPlan) => TrackPlan) =>
    onChange({ ...store, plans: { ...store.plans, [t]: fn(store.plans[t]) } });
  const YMSel = ({ value, onChange: oc, noHalf }: { value: YM; onChange: (v: YM) => void; noHalf?: boolean }) => (
    <span className="ym">
      <select value={value.grade} onChange={(e) => oc({ ...value, grade: e.target.value as Grade })}>
        {GRADES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select value={value.month} onChange={(e) => oc({ ...value, month: Number(e.target.value) })}>
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {m}월
          </option>
        ))}
      </select>
      {!noHalf && (
        <select value={value.half ? '1' : '0'} title="월초 / 월중순" onChange={(e) => oc({ ...value, half: e.target.value === '1' })}>
          <option value="0">초</option>
          <option value="1">중순</option>
        </select>
      )}
    </span>
  );

  return (
    <div className="admin">
      <div className="admin-toolbar no-print">
        <button className="primary" onClick={addCourse}>
          + 과정 추가
        </button>
        <button onClick={() => exportStoreJson(store)}>JSON 내보내기</button>
        <button onClick={() => fileRef.current?.click()}>JSON 가져오기</button>
        <button className="ghost" onClick={resetAll}>
          기본값 복원
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = '';
          }}
        />
        <span className="hint">변경 내용은 브라우저에 자동 저장됩니다.</span>
      </div>

      <div className="admin-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>과정명</th>
              <th>학교</th>
              <th>과목</th>
              <th>유형</th>
              <th>시작</th>
              <th>종료</th>
              <th>수업 (요일·시간 · 주 N회)</th>
              <th>담당쌤</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {store.courses.map((c) => {
              return (
                <tr key={c.id}>
                  <td>
                    <input value={c.name} onChange={(e) => updateCourse(c.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <select value={c.track} onChange={(e) => updateCourse(c.id, { track: e.target.value as Track | '공통' })}>
                      {TRACK_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select value={c.subject} onChange={(e) => updateCourse(c.id, { subject: e.target.value as Subject })}>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select value={c.type} onChange={(e) => updateCourse(c.id, { type: e.target.value as CourseType })}>
                      {COURSE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="ym">
                    <select value={c.start.grade} onChange={(e) => updateCourse(c.id, { start: { ...c.start, grade: e.target.value as Grade } })}>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <select value={c.start.month} onChange={(e) => updateCourse(c.id, { start: { ...c.start, month: Number(e.target.value) } })}>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}월
                        </option>
                      ))}
                    </select>
                    <select
                      value={c.start.half ? '1' : '0'}
                      title="월초 / 월중순부터 (0.5월 단위)"
                      onChange={(e) => updateCourse(c.id, { start: { ...c.start, half: e.target.value === '1' } })}
                    >
                      <option value="0">초</option>
                      <option value="1">중순</option>
                    </select>
                  </td>
                  <td className="ym">
                    <select value={c.end.grade} onChange={(e) => updateCourse(c.id, { end: { ...c.end, grade: e.target.value as Grade } })}>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <select value={c.end.month} onChange={(e) => updateCourse(c.id, { end: { ...c.end, month: Number(e.target.value) } })}>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}월
                        </option>
                      ))}
                    </select>
                    <select
                      value={c.end.half ? '1' : '0'}
                      title="월말 / 월중순까지 (0.5월 단위)"
                      onChange={(e) => updateCourse(c.id, { end: { ...c.end, half: e.target.value === '1' } })}
                    >
                      <option value="0">말</option>
                      <option value="1">중순</option>
                    </select>
                  </td>
                  <td>
                    <div className="sessions">
                      {c.schedule.map((s, i) => (
                        <div className="session-row" key={i}>
                          <select value={s.day} onChange={(e) => updateSession(c.id, i, { day: e.target.value as Weekday })}>
                            {DAYS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <input type="time" value={s.start} onChange={(e) => updateSession(c.id, i, { start: e.target.value })} />
                          <span>~</span>
                          <input type="time" value={s.end} onChange={(e) => updateSession(c.id, i, { end: e.target.value })} />
                          <button
                            className="del"
                            title="세션 삭제"
                            disabled={c.schedule.length <= 1}
                            onClick={() => removeSession(c.id, i)}
                          >
                            −
                          </button>
                        </div>
                      ))}
                      <button className="mini" onClick={() => addSession(c.id)}>
                        + 세션(주 N회)
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      value={c.teacher ?? ''}
                      placeholder="이름"
                      onChange={(e) => updateCourse(c.id, { teacher: e.target.value })}
                    />
                  </td>
                  <td>
                    <button className="del" onClick={() => deleteCourse(c.id)} title="삭제">
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ marginTop: 10 }}>
        교과(수학·과학) 블록(각 학기, 공통수학1~기하, 통합과학·물리·화학)도 <b>트랙 = 공통</b> 과정으로 이 표에서 관리합니다.
        공통 과정은 <b>시작~종료 길이가 로드맵 블록 개월수</b>가 되고, 실제 위치는 학생 진도 기준으로 오늘부터
        순서대로 배치(드래그로 이동)됩니다. 세션·담당쌤은 그 블록이 배치된 달의 시간표에 올라갑니다.
      </p>

      <h3 style={{ marginTop: 22 }}>입시 여정 단계 · 시험 (학교별)</h3>
      <p className="muted">
        로드맵 상단의 <b>단계 띠</b>와 <b>◆ 시험 마일스톤</b>, 로드맵 아래 "지금 단계 / 다음 단계 / 시험" 카드에 쓰입니다.
      </p>
      <div className="admin-plans">
        {TRACKS.map((t) => {
          const p = store.plans[t];
          return (
            <fieldset key={t}>
              <legend>{t}</legend>
              <div className="plan-group">
                <div className="plan-title">로드맵 표시 종료</div>
                <div className="plan-row">
                  <label className="plan-check">
                    <input
                      type="checkbox"
                      checked={!!p.roadmapEnd}
                      onChange={(e) =>
                        setPlan(t, (pp) => ({ ...pp, roadmapEnd: e.target.checked ? { grade: '중3', month: 11 } : undefined }))
                      }
                    />
                    중3 2월 전에 끝내기
                  </label>
                  {p.roadmapEnd && (
                    <YMSel noHalf value={p.roadmapEnd} onChange={(v) => setPlan(t, (pp) => ({ ...pp, roadmapEnd: { grade: v.grade, month: v.month } }))} />
                  )}
                  <span className="muted">{p.roadmapEnd ? `${p.roadmapEnd.grade} ${p.roadmapEnd.month}월까지 표시` : '중3 2월까지 표시'}</span>
                </div>
              </div>
              <div className="plan-group">
                <div className="plan-title">단계</div>
                {p.phases.map((ph: Phase, i: number) => (
                  <div className="plan-row" key={i}>
                    <input
                      value={ph.name}
                      onChange={(e) =>
                        setPlan(t, (pp) => ({ ...pp, phases: pp.phases.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))
                      }
                    />
                    <YMSel value={ph.start} onChange={(v) => setPlan(t, (pp) => ({ ...pp, phases: pp.phases.map((x, j) => (j === i ? { ...x, start: v } : x)) }))} />
                    <span>~</span>
                    <YMSel value={ph.end} onChange={(v) => setPlan(t, (pp) => ({ ...pp, phases: pp.phases.map((x, j) => (j === i ? { ...x, end: v } : x)) }))} />
                    <button className="del" title="단계 삭제" onClick={() => setPlan(t, (pp) => ({ ...pp, phases: pp.phases.filter((_, j) => j !== i) }))}>
                      −
                    </button>
                  </div>
                ))}
                <button
                  className="mini"
                  onClick={() =>
                    setPlan(t, (pp) => ({
                      ...pp,
                      phases: [...pp.phases, { name: `${pp.phases.length + 1}단계`, start: { grade: '중3', month: 3 }, end: { grade: '중3', month: 8 } }],
                    }))
                  }
                >
                  + 단계
                </button>
              </div>
              <div className="plan-group">
                <div className="plan-title">시험(마일스톤)</div>
                {p.milestones.map((m: Milestone, i: number) => (
                  <div className="plan-row" key={i}>
                    <input
                      value={m.name}
                      onChange={(e) =>
                        setPlan(t, (pp) => ({ ...pp, milestones: pp.milestones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))
                      }
                    />
                    <YMSel value={m.at} onChange={(v) => setPlan(t, (pp) => ({ ...pp, milestones: pp.milestones.map((x, j) => (j === i ? { ...x, at: v } : x)) }))} />
                    <button className="del" title="시험 삭제" onClick={() => setPlan(t, (pp) => ({ ...pp, milestones: pp.milestones.filter((_, j) => j !== i) }))}>
                      −
                    </button>
                  </div>
                ))}
                <button
                  className="mini"
                  onClick={() => setPlan(t, (pp) => ({ ...pp, milestones: [...pp.milestones, { name: '시험', at: { grade: '중3', month: 5 } }] }))}
                >
                  + 시험
                </button>
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

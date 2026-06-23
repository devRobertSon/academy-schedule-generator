import { useRef } from 'react';
import {
  Course,
  CourseType,
  Grade,
  GRADES,
  Subject,
  Track,
  TRACKS,
  Weekday,
} from '../data/roadmap';
import {
  StoreData,
  defaultStore,
  exportStoreJson,
  newCourseId,
  parseStoreJson,
} from '../lib/store';

const SUBJECTS: Subject[] = ['수학', '과학', '면접'];
const TYPES: CourseType[] = ['특화', '면접', '통합과학', '교과'];
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

  const updateSlot = (id: string, slotPatch: Partial<{ day: Weekday; start: string; end: string }>) =>
    onChange({
      ...store,
      courses: store.courses.map((c) => {
        if (c.id !== id) return c;
        const base = c.schedule[0] ?? { day: '월' as Weekday, start: '17:00', end: '19:00' };
        return { ...c, schedule: [{ ...base, ...slotPatch }, ...c.schedule.slice(1)] };
      }),
    });

  const addCourse = () => {
    const nc: Course = {
      id: newCourseId(),
      name: '새 과정',
      track: '영재학교',
      subject: '수학',
      type: '특화',
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

  const gyo = store.gyo;
  const setGyo = (patch: Partial<typeof gyo>) => onChange({ ...store, gyo: { ...gyo, ...patch } });
  const mathSlot = gyo.mathSlots[0] ?? { day: '수', start: '16:00', end: '18:00' };
  const sciSlot = gyo.sciSlots[0] ?? { day: '금', start: '16:00', end: '18:00' };

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
              <th>요일</th>
              <th>시작</th>
              <th>종료</th>
              <th>담당쌤</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {store.courses.map((c) => {
              const slot = c.schedule[0] ?? { day: '월', start: '17:00', end: '19:00' };
              return (
                <tr key={c.id}>
                  <td>
                    <input value={c.name} onChange={(e) => updateCourse(c.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <select value={c.track} onChange={(e) => updateCourse(c.id, { track: e.target.value as Track })}>
                      {TRACKS.map((t) => (
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
                      {TYPES.map((t) => (
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
                  </td>
                  <td>
                    <select value={slot.day} onChange={(e) => updateSlot(c.id, { day: e.target.value as Weekday })}>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="time" value={slot.start} onChange={(e) => updateSlot(c.id, { start: e.target.value })} />
                  </td>
                  <td>
                    <input type="time" value={slot.end} onChange={(e) => updateSlot(c.id, { end: e.target.value })} />
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

      <h3>교과(공통) 기본 설정</h3>
      <div className="gyo-config">
        <fieldset>
          <legend>수학 교과</legend>
          <label>
            담당쌤
            <input value={gyo.mathTeacher ?? ''} onChange={(e) => setGyo({ mathTeacher: e.target.value })} />
          </label>
          <label>
            요일
            <select
              value={mathSlot.day}
              onChange={(e) => setGyo({ mathSlots: [{ ...mathSlot, day: e.target.value as Weekday }] })}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            시작
            <input type="time" value={mathSlot.start} onChange={(e) => setGyo({ mathSlots: [{ ...mathSlot, start: e.target.value }] })} />
          </label>
          <label>
            종료
            <input type="time" value={mathSlot.end} onChange={(e) => setGyo({ mathSlots: [{ ...mathSlot, end: e.target.value }] })} />
          </label>
          <label>
            진행속도(개월/단원)
            <input
              type="number"
              min={1}
              value={gyo.mathMonthsPerItem}
              onChange={(e) => setGyo({ mathMonthsPerItem: Math.max(1, Number(e.target.value)) })}
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>과학 교과</legend>
          <label>
            담당쌤
            <input value={gyo.sciTeacher ?? ''} onChange={(e) => setGyo({ sciTeacher: e.target.value })} />
          </label>
          <label>
            요일
            <select
              value={sciSlot.day}
              onChange={(e) => setGyo({ sciSlots: [{ ...sciSlot, day: e.target.value as Weekday }] })}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            시작
            <input type="time" value={sciSlot.start} onChange={(e) => setGyo({ sciSlots: [{ ...sciSlot, start: e.target.value }] })} />
          </label>
          <label>
            종료
            <input type="time" value={sciSlot.end} onChange={(e) => setGyo({ sciSlots: [{ ...sciSlot, end: e.target.value }] })} />
          </label>
          <label>
            진행속도(개월/단원)
            <input
              type="number"
              min={1}
              value={gyo.sciMonthsPerItem}
              onChange={(e) => setGyo({ sciMonthsPerItem: Math.max(1, Number(e.target.value)) })}
            />
          </label>
        </fieldset>
      </div>
    </div>
  );
}

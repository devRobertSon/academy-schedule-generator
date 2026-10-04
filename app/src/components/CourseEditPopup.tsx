import { useState } from 'react';
import { Course, TimeSlot, Weekday } from '../data/roadmap';

const DAYS: Weekday[] = ['월', '화', '수', '목', '금', '토', '일'];

interface Props {
  course: Course;
  onSave: (course: Course) => void;
  onClose: () => void;
  onRemove: () => void;
  /** (교과 수학) 시간표에서 월·수 / 화·목 세션을 함께 움직일지 — 학생별 설정. 없으면 스위치를 숨김 */
  linked?: boolean;
  onLinkedChange?: (linked: boolean) => void;
}

/** 로드맵 블록 클릭 시 뜨는 팝업: 요일·시간(세션)·담당쌤 편집 → 관리 탭(과정 데이터)에 반영 */
export default function CourseEditPopup({ course, onSave, onClose, onRemove, linked, onLinkedChange }: Props) {
  const [teacher, setTeacher] = useState(course.teacher ?? '');
  const [sessions, setSessions] = useState<TimeSlot[]>(course.schedule.map((s) => ({ ...s })));

  const update = (i: number, patch: Partial<TimeSlot>) =>
    setSessions((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const add = () =>
    setSessions((ss) => {
      const last = ss[ss.length - 1] ?? { day: '월' as Weekday, start: '17:00', end: '19:00' };
      return [...ss, { ...last }];
    });
  const remove = (i: number) => setSessions((ss) => (ss.length <= 1 ? ss : ss.filter((_, j) => j !== i)));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${course.name} 편집`}>
        <h3>{course.name}</h3>
        <p className="muted">
          {course.track} · {course.subject} · {course.type}
        </p>

        <label className="modal-field">
          담당 선생님
          <input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="이름" />
        </label>

        <div className="modal-field">
          <span>수업 (요일·시간 · 주 N회)</span>
          <div className="sessions">
            {sessions.map((s, i) => (
              <div className="session-row" key={i}>
                <select value={s.day} onChange={(e) => update(i, { day: e.target.value as Weekday })}>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input type="time" value={s.start} onChange={(e) => update(i, { start: e.target.value })} />
                <span>~</span>
                <input type="time" value={s.end} onChange={(e) => update(i, { end: e.target.value })} />
                <button className="del" disabled={sessions.length <= 1} onClick={() => remove(i)} title="세션 삭제">
                  −
                </button>
              </div>
            ))}
            <button className="mini" onClick={add}>
              + 세션(주 N회)
            </button>
          </div>
        </div>

        {onLinkedChange && (
          <label className="modal-field modal-check">
            <input type="checkbox" checked={!!linked} onChange={(e) => onLinkedChange(e.target.checked)} />
            <span>
              세션 함께 움직이기
              <small className="muted"> — 시간표에서 한 블록을 옮기면 짝(월·수 / 화·목)도 같이 이동. 끄면 따로 움직임 (Shift+드래그로도 분리)</small>
            </span>
          </label>
        )}

        <div className="modal-actions">
          <button className="primary" onClick={() => onSave({ ...course, teacher: teacher || undefined, schedule: sessions })}>
            저장 (관리 탭 반영)
          </button>
          <button onClick={onClose}>취소</button>
          <button className="danger" onClick={onRemove}>
            이 학생 로드맵에서 제거
          </button>
        </div>
      </div>
    </div>
  );
}

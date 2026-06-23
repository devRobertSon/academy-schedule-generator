import {
  Grade,
  GRADES,
  MATH_GYO_SEQUENCE,
  SCI_GYO_HS_PARALLEL,
  SCI_GYO_MID_SEQUENCE,
} from '../data/roadmap';

export type SciMode = 'mid' | 'hs';

export interface ConsultInfo {
  studentName: string;
  grade: Grade;
  month: number; // 1..12
  mathIdx: number;
  sciMode: SciMode;
  sciIdx: number;
}

interface Props {
  value: ConsultInfo;
  onChange: (next: ConsultInfo) => void;
}

const MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2];

export default function ConsultForm({ value, onChange }: Props) {
  const set = (patch: Partial<ConsultInfo>) => onChange({ ...value, ...patch });
  const sciSeq = value.sciMode === 'mid' ? SCI_GYO_MID_SEQUENCE : SCI_GYO_HS_PARALLEL;

  return (
    <form className="input-form" onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label htmlFor="studentName">학생 이름</label>
        <input
          id="studentName"
          type="text"
          placeholder="(선택)"
          value={value.studentName}
          onChange={(e) => set({ studentName: e.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor="grade">현재 학년</label>
        <select id="grade" value={value.grade} onChange={(e) => set({ grade: e.target.value as Grade })}>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="month">상담 월</label>
        <select id="month" value={value.month} onChange={(e) => set({ month: Number(e.target.value) })}>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="mathIdx">수학 진도(완료한 단계)</label>
        <select id="mathIdx" value={value.mathIdx} onChange={(e) => set({ mathIdx: Number(e.target.value) })}>
          {MATH_GYO_SEQUENCE.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="sciMode">과학 단계</label>
        <select
          id="sciMode"
          value={value.sciMode}
          onChange={(e) => set({ sciMode: e.target.value as SciMode, sciIdx: 0 })}
        >
          <option value="mid">중등 과학</option>
          <option value="hs">고등 진입(물·화·생·지)</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="sciIdx">과학 진도(완료한 단계)</label>
        <select id="sciIdx" value={value.sciIdx} onChange={(e) => set({ sciIdx: Number(e.target.value) })}>
          {sciSeq.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

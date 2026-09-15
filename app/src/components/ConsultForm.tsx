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

/** 상담 정보 — 상단 칩 스트립(각 칩이 곧 입력) */
export default function ConsultForm({ value, onChange }: Props) {
  const set = (patch: Partial<ConsultInfo>) => onChange({ ...value, ...patch });
  const sciSeq = value.sciMode === 'mid' ? SCI_GYO_MID_SEQUENCE : SCI_GYO_HS_PARALLEL;

  return (
    <>
      <label className="chip" title="학생 이름">
        <input
          id="studentName"
          type="text"
          placeholder="학생 이름"
          value={value.studentName}
          onChange={(e) => set({ studentName: e.target.value })}
        />
      </label>

      <label className="chip">
        <span className="k">학년</span>
        <select id="grade" value={value.grade} onChange={(e) => set({ grade: e.target.value as Grade })}>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>

      <label className="chip">
        <span className="k">상담 월</span>
        <select id="month" value={value.month} onChange={(e) => set({ month: Number(e.target.value) })}>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
      </label>

      <label className="chip">
        <span className="k">수학 완료</span>
        <select id="mathIdx" value={value.mathIdx} onChange={(e) => set({ mathIdx: Number(e.target.value) })}>
          {MATH_GYO_SEQUENCE.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="chip">
        <span className="k">과학</span>
        <select
          id="sciMode"
          value={value.sciMode}
          onChange={(e) => set({ sciMode: e.target.value as SciMode, sciIdx: 0 })}
        >
          <option value="mid">중등</option>
          <option value="hs">고등 진입</option>
        </select>
        <span className="k">완료</span>
        <select id="sciIdx" value={value.sciIdx} onChange={(e) => set({ sciIdx: Number(e.target.value) })}>
          {sciSeq.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

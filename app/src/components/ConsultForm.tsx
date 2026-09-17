import { Grade, GRADES, MATH_GYO_SEQUENCE, SCI_GYO_SEQUENCE } from '../data/roadmap';

export interface ConsultInfo {
  studentName: string;
  grade: Grade;
  month: number; // 1..12
  mathIdx: number; // MATH_GYO_SEQUENCE 인덱스(완료한 단계)
  sciIdx: number; // SCI_GYO_SEQUENCE 인덱스(완료한 단계)
}

interface Props {
  value: ConsultInfo;
  onChange: (next: ConsultInfo) => void;
}

/** 진도 인덱스 -1 = 아직 아무것도 하지 않음(중학교 과학을 전혀 안 한 학생 등) */
export const NONE_IDX = -1;
export const NONE_LABEL = '없음 (아직 안 함)';

/** 상담 정보 — 상단 칩 스트립(각 칩이 곧 입력) */
export default function ConsultForm({ value, onChange }: Props) {
  const set = (patch: Partial<ConsultInfo>) => onChange({ ...value, ...patch });

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

      {/* 상담 월은 오늘 날짜로 고정(미래로 바꾸지 않음) */}
      <span className="chip" title="상담 월은 오늘 기준">
        <span className="k">상담 월</span>
        <b>{value.month}월</b>
      </span>

      <label className="chip">
        <span className="k">수학 완료</span>
        <select id="mathIdx" value={value.mathIdx} onChange={(e) => set({ mathIdx: Number(e.target.value) })}>
          <option value={-1}>{NONE_LABEL}</option>
          {MATH_GYO_SEQUENCE.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="chip">
        <span className="k">과학 완료</span>
        <select id="sciIdx" value={value.sciIdx} onChange={(e) => set({ sciIdx: Number(e.target.value) })}>
          <option value={-1}>{NONE_LABEL}</option>
          {SCI_GYO_SEQUENCE.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

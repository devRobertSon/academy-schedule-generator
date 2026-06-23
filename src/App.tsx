import { useMemo, useRef, useState } from 'react';
import InputForm, { FormState } from './components/InputForm';
import RoadmapChart from './components/RoadmapChart';
import TimetableBuilder, { GyoBlocks } from './components/TimetableBuilder';
import ExportBar from './components/ExportBar';
import {
  GYO_DEFAULT_BLOCKS,
  MATH_GYO_SEQUENCE,
  SCI_GYO_HS_PARALLEL,
  SCI_GYO_MID_SEQUENCE,
  Track,
} from './data/roadmap';
import { nowIndex } from './lib/logic';

const DEFAULT_FORM: FormState = {
  grade: '중2',
  month: 9,
  mathIdx: 4, // 중3-1학기
  sciMode: 'mid',
  sciIdx: 4,
};

export default function App() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [activeTrack, setActiveTrack] = useState<Track>('영재학교');
  const [gyoBlocks, setGyoBlocks] = useState<GyoBlocks>({
    math: [...GYO_DEFAULT_BLOCKS.math],
    sci: [...GYO_DEFAULT_BLOCKS.sci],
  });

  const atIdx = useMemo(() => nowIndex(form.grade, form.month), [form.grade, form.month]);
  const exportRef = useRef<HTMLDivElement>(null);

  const mathProgress = MATH_GYO_SEQUENCE[form.mathIdx];
  const sciSeq = form.sciMode === 'mid' ? SCI_GYO_MID_SEQUENCE : SCI_GYO_HS_PARALLEL;
  const sciProgress = sciSeq[form.sciIdx];
  const today = new Date().toLocaleDateString('ko-KR');

  return (
    <div className="app">
      <header className="app-header no-print">
        <h1>알파학원 입시 로드맵 · 시간표 생성기</h1>
        <p>
          현재 학년·월·진도만 입력하면 5개 학교(영재학교·과학고·국제고·외고·전사고)의 특화 과정
          로드맵과 주간 시간표를 자동 생성합니다.
        </p>
      </header>

      <section className="card no-print">
        <h2>입력</h2>
        <InputForm value={form} onChange={setForm} />
      </section>

      <ExportBar targetRef={exportRef} />

      {/* 내보내기 대상 영역(로드맵 + 시간표) */}
      <div className="export-region" ref={exportRef}>
        <div className="export-summary">
          <h2>입시 로드맵 · 주간 시간표</h2>
          <p>
            학년 <b>{form.grade}</b> · 현재 <b>{form.month}월</b> · 수학 진도{' '}
            <b>{mathProgress}</b> · 과학 진도 <b>{sciProgress}</b>
            <span className="gen-date"> · 생성일 {today}</span>
          </p>
        </div>

        <section className="card">
          <h2>① 5개 학교 특화 과정 로드맵 (월별)</h2>
          <div className="roadmap-scroll">
            <RoadmapChart form={form} atIdx={atIdx} />
          </div>
        </section>

        <section className="card">
          <h2>② 주간 시간표 빌더 — {activeTrack}</h2>
          <p className="muted no-print">
            학교 탭을 바꾸면 특화(고정) 수업이 달라지고, 교과 2과목은 드래그로 자유 배치할 수
            있습니다. (교과 배치는 탭을 바꿔도 유지)
          </p>
          <TimetableBuilder
            atIdx={atIdx}
            activeTrack={activeTrack}
            onTrackChange={setActiveTrack}
            gyoBlocks={gyoBlocks}
            onGyoBlocksChange={setGyoBlocks}
          />
        </section>
      </div>

      <footer className="app-footer no-print">
        <small>
          특화/면접/통합과학 = 고정 일정 · 교과 = 드래그로 이동 가능 · 결과는 5개 학교 전부 출력
        </small>
      </footer>
    </div>
  );
}

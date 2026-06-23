import {
  ACADEMIC_MONTHS,
  COLORS,
  GRADES,
  MATH_GYO_SEQUENCE,
  SCI_GYO_HS_PARALLEL,
  SCI_GYO_MID_SEQUENCE,
  TRACKS,
  Track,
  gmIndex,
  monthToSeason,
} from '../data/roadmap';
import {
  GyoProjection,
  RoadmapEntry,
  buildAllRoadmaps,
  projectGyo,
} from '../lib/logic';
import { FormState } from './InputForm';

// ── 레이아웃 상수 ─────────────────────────────────────────────
const COL_W = 24; // 월 1칸 폭
const LABEL_W = 116; // 좌측 섹션 라벨 폭
const GRADE_H = 26;
const MONTH_H = 22;
const HEADER_H = GRADE_H + MONTH_H;
const BAR_H = 18;
const ROW_H = 22;
const SECTION_PAD = 8; // 섹션(트랙) 상하 여백
const PLOT_W = 60 * COL_W;
const CHART_W = LABEL_W + PLOT_W;
const GYO_MONTHS_PER_ITEM = 3;

const SEASON_TINT: Record<string, string> = {
  봄: '#EEF4EC',
  여름: '#FBF1E9',
  가을: '#F4F0E7',
  겨울: '#ECF0F6',
};

const SUBJECT_ORDER = ['수학', '과학', '면접'] as const;

interface Props {
  form: FormState;
  atIdx: number;
}

interface PlacedEntry extends RoadmapEntry {
  startIdx: number;
  endIdx: number;
  level: number;
}

/** 겹치는 막대를 레벨로 쌓는다 */
function assignLevels(entries: RoadmapEntry[]): { placed: PlacedEntry[]; levels: number } {
  const withIdx = entries
    .map((e) => ({
      ...e,
      startIdx: gmIndex(e.course.start.grade, e.course.start.month),
      endIdx: gmIndex(e.course.end.grade, e.course.end.month),
    }))
    .sort((a, b) => a.startIdx - b.startIdx);
  const levelEnds: number[] = [];
  const placed: PlacedEntry[] = withIdx.map((e) => {
    let lvl = levelEnds.findIndex((end) => end < e.startIdx);
    if (lvl === -1) {
      lvl = levelEnds.length;
      levelEnds.push(e.endIdx);
    } else {
      levelEnds[lvl] = e.endIdx;
    }
    return { ...e, level: lvl };
  });
  return { placed, levels: Math.max(1, levelEnds.length) };
}

function statusOpacity(status: string): number {
  return status === '완료' ? 0.45 : 1;
}

/** 막대 라벨: 좁으면 2줄로 분할 */
function labelLines(name: string, widthPx: number): string[] {
  if (widthPx >= name.length * 11) return [name];
  // 공백 기준 2분할, 없으면 가운데 분할
  const sp = name.lastIndexOf(' ', Math.ceil(name.length / 2) + 2);
  if (sp > 0) return [name.slice(0, sp), name.slice(sp + 1)];
  const mid = Math.ceil(name.length / 2);
  return [name.slice(0, mid), name.slice(mid)];
}

function xOf(idx: number): number {
  return LABEL_W + idx * COL_W;
}

export default function RoadmapChart({ form, atIdx }: Props) {
  const roadmaps = buildAllRoadmaps(atIdx);

  // ── 트랙 섹션 레이아웃 계산 ──────────────────────────────
  type LaneBar = { entry: PlacedEntry; y: number };
  interface TrackLayout {
    track: Track;
    top: number;
    height: number;
    bars: LaneBar[];
  }

  const trackLayouts: TrackLayout[] = [];
  let cursorY = HEADER_H;
  for (const track of TRACKS) {
    const entries = roadmaps[track];
    const top = cursorY;
    let laneY = cursorY + SECTION_PAD;
    const bars: LaneBar[] = [];
    for (const subj of SUBJECT_ORDER) {
      const subjEntries = entries.filter((e) => e.course.subject === subj);
      if (subjEntries.length === 0) continue;
      const { placed, levels } = assignLevels(subjEntries);
      for (const p of placed) {
        bars.push({ entry: p, y: laneY + p.level * ROW_H });
      }
      laneY += levels * ROW_H;
    }
    const height = laneY + SECTION_PAD - top;
    trackLayouts.push({ track, top, height, bars });
    cursorY = top + height;
  }

  // ── 교과 섹션 레이아웃 ──────────────────────────────────
  const gyoTop = cursorY + 12; // 구분선 아래
  const mathProj = projectGyo(MATH_GYO_SEQUENCE, form.mathIdx, atIdx, GYO_MONTHS_PER_ITEM);

  // 과학: 중등 시퀀스(1줄) + 고등 4과목 병렬(4줄)
  const sciMidCurrent = form.sciMode === 'mid' ? form.sciIdx : SCI_GYO_MID_SEQUENCE.length;
  const sciMidProj = projectGyo(SCI_GYO_MID_SEQUENCE, sciMidCurrent, atIdx, GYO_MONTHS_PER_ITEM);
  // 고등 병렬 시작: 중등 시퀀스 끝난 직후 위치
  const hsStartIdx = atIdx + (SCI_GYO_MID_SEQUENCE.length - sciMidCurrent) * GYO_MONTHS_PER_ITEM;

  const mathRowY = gyoTop + 24;
  const sciLabelY = mathRowY + ROW_H + 14;
  const sciMidRowY = sciLabelY;
  const hsRowsTop = sciMidRowY + ROW_H + 4;
  const gyoBottom = hsRowsTop + 4 * ROW_H + 8;

  const CHART_H = gyoBottom + 40; // 범례 공간

  // 현재 월 세로선 위치(해당 칸 중앙)
  const todayX = xOf(atIdx) + COL_W / 2;
  const todayMonth = ACADEMIC_MONTHS[atIdx % 12];

  // 교과 막대 렌더 헬퍼(투영)
  const renderGyoItem = (p: GyoProjection, y: number, idx: number, keyPrefix: string) => {
    const vStart = Math.max(0, p.startIdx);
    const vEnd = Math.min(60, p.startIdx + GYO_MONTHS_PER_ITEM);
    if (vEnd <= vStart) return null;
    const x = xOf(vStart);
    const w = (vEnd - vStart) * COL_W;
    const op = p.done ? 0.4 : 1;
    return (
      <g key={`${keyPrefix}-${idx}`} opacity={op}>
        <rect
          x={x}
          y={y}
          width={w}
          height={BAR_H}
          rx={4}
          fill={COLORS.교과.fill}
          stroke={p.current ? '#D6443B' : '#B4B2A9'}
          strokeWidth={p.current ? 2 : 0.8}
        />
        {w >= 30 && (
          <text
            x={x + w / 2}
            y={y + BAR_H / 2 + 3.5}
            fontSize={9}
            fill={COLORS.교과.text}
            textAnchor="middle"
          >
            {p.name}
          </text>
        )}
      </g>
    );
  };

  return (
    <svg
      className="roadmap-svg"
      width={CHART_W}
      height={CHART_H}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      role="img"
      aria-label="입시 트랙 로드맵(월별)"
    >
      {/* 좌상단 섹션명 */}
      <text x={8} y={18} fontSize={13} fontWeight={600} fill="#2C2C2A">
        특화 과정
      </text>

      {/* 월 배경 틴트 */}
      {Array.from({ length: 60 }).map((_, k) => {
        const month = ACADEMIC_MONTHS[k % 12];
        const season = monthToSeason(month);
        return (
          <rect
            key={`tint-${k}`}
            x={xOf(k)}
            y={HEADER_H}
            width={COL_W}
            height={CHART_H - HEADER_H}
            fill={SEASON_TINT[season]}
            opacity={0.5}
          />
        );
      })}

      {/* 헤더: 학년(12칸) */}
      {GRADES.map((g, gi) => (
        <g key={`grade-${g}`}>
          <rect
            x={xOf(gi * 12)}
            y={0}
            width={12 * COL_W}
            height={GRADE_H}
            fill="#F6F5F0"
            stroke="#C9C7BD"
            strokeWidth={0.5}
          />
          <text
            x={xOf(gi * 12) + 6 * COL_W}
            y={GRADE_H / 2 + 4}
            fontSize={13}
            fontWeight={600}
            fill="#2C2C2A"
            textAnchor="middle"
          >
            {g}
          </text>
        </g>
      ))}

      {/* 헤더: 월 숫자 + 계절 틴트 */}
      {Array.from({ length: 60 }).map((_, k) => {
        const month = ACADEMIC_MONTHS[k % 12];
        const season = monthToSeason(month);
        return (
          <g key={`month-${k}`}>
            <rect
              x={xOf(k)}
              y={GRADE_H}
              width={COL_W}
              height={MONTH_H}
              fill={SEASON_TINT[season]}
            />
            <text
              x={xOf(k) + COL_W / 2}
              y={GRADE_H + MONTH_H / 2 + 3}
              fontSize={8}
              fill="#6B6A64"
              textAnchor="middle"
            >
              {month}
            </text>
          </g>
        );
      })}

      {/* 학년 경계 세로선 */}
      {GRADES.map((_, gi) => (
        <line
          key={`gl-${gi}`}
          x1={xOf(gi * 12)}
          y1={0}
          x2={xOf(gi * 12)}
          y2={CHART_H}
          stroke="#C9C7BD"
          strokeWidth={1}
        />
      ))}
      <line x1={xOf(60)} y1={0} x2={xOf(60)} y2={CHART_H} stroke="#C9C7BD" strokeWidth={1} />

      {/* 트랙 섹션 */}
      {trackLayouts.map((tl) => (
        <g key={tl.track}>
          {/* 좌측 라벨 */}
          <rect x={0} y={tl.top} width={LABEL_W} height={tl.height} fill="#F6F5F0" />
          <rect x={0} y={tl.top} width={4} height={tl.height} fill="#888780" />
          <text x={12} y={tl.top + tl.height / 2 + 4} fontSize={12} fontWeight={600} fill="#2C2C2A">
            {tl.track}
          </text>
          {/* 막대 */}
          {tl.bars.map(({ entry, y }) => {
            const x = xOf(entry.startIdx);
            const w = (entry.endIdx - entry.startIdx + 1) * COL_W;
            const c = COLORS[entry.course.subject];
            const lines = labelLines(entry.course.name, w);
            return (
              <g key={entry.course.id} opacity={statusOpacity(entry.status)}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={BAR_H}
                  rx={4}
                  fill={c.fill}
                  stroke={entry.status === '진행중' ? '#D6443B' : 'none'}
                  strokeWidth={entry.status === '진행중' ? 2 : 0}
                />
                {w >= 24 &&
                  lines.map((ln, li) => (
                    <text
                      key={li}
                      x={x + w / 2}
                      y={
                        y +
                        BAR_H / 2 +
                        3.5 +
                        (lines.length === 2 ? (li === 0 ? -4.5 : 4.5) : 0)
                      }
                      fontSize={lines.length === 2 ? 7.5 : 9}
                      fill={c.text}
                      textAnchor="middle"
                    >
                      {ln}
                    </text>
                  ))}
              </g>
            );
          })}
          {/* 섹션 하단 구분선 */}
          <line
            x1={0}
            y1={tl.top + tl.height}
            x2={CHART_W}
            y2={tl.top + tl.height}
            stroke="#E2E0D8"
            strokeWidth={1}
          />
        </g>
      ))}

      {/* 교과 섹션 구분선 + 제목 */}
      <line x1={0} y1={gyoTop} x2={CHART_W} y2={gyoTop} stroke="#C9C7BD" strokeWidth={1} />
      <text x={8} y={gyoTop + 16} fontSize={12} fontWeight={600} fill="#2C2C2A">
        교과 과정
      </text>
      <text x={120} y={gyoTop + 16} fontSize={10} fill="#6B6A64">
        교육과정 순서 · 학생 진도를 현재 월에 투영(과거=흐리게, 현재=강조)
      </text>

      {/* 수학 교과 (한 줄) */}
      <rect x={0} y={mathRowY - 4} width={LABEL_W} height={ROW_H + 4} fill="#F6F5F0" />
      <rect x={0} y={mathRowY - 4} width={4} height={ROW_H + 4} fill="#888780" />
      <text x={12} y={mathRowY + BAR_H / 2 + 3} fontSize={11} fontWeight={500} fill="#2C2C2A">
        수학 교과
      </text>
      {mathProj.map((p, i) => renderGyoItem(p, mathRowY, i, 'math'))}

      {/* 과학 교과 (중등 1줄 + 고등 4줄 병렬) */}
      <rect
        x={0}
        y={sciLabelY - 4}
        width={LABEL_W}
        height={ROW_H + 4 * ROW_H + 8}
        fill="#F6F5F0"
      />
      <rect x={0} y={sciLabelY - 4} width={4} height={ROW_H + 4 * ROW_H + 8} fill="#888780" />
      <text x={12} y={sciLabelY + BAR_H / 2 + 3} fontSize={11} fontWeight={500} fill="#2C2C2A">
        과학 교과
      </text>
      {sciMidProj.map((p, i) => renderGyoItem(p, sciMidRowY, i, 'scimid'))}

      {/* 고등 4과목 병렬 */}
      {SCI_GYO_HS_PARALLEL.map((name, i) => {
        const current = form.sciMode === 'hs' && form.sciIdx === i;
        const done = form.sciMode === 'hs' && i < form.sciIdx;
        const proj: GyoProjection = { name, startIdx: hsStartIdx, done, current };
        const y = hsRowsTop + i * ROW_H;
        return renderGyoItem(proj, y, i, 'scihs');
      })}

      {/* 현재 월 세로선 */}
      <line
        x1={todayX}
        y1={HEADER_H}
        x2={todayX}
        y2={gyoBottom}
        stroke="#D6443B"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <text x={todayX + 4} y={HEADER_H + 12} fontSize={9} fontWeight={600} fill="#D6443B">
        오늘 {todayMonth}월
      </text>

      {/* 범례 */}
      <g>
        {(
          [
            ['수학 과정', COLORS.수학.fill],
            ['과학 과정', COLORS.과학.fill],
            ['면접·일반', COLORS.면접.fill],
            ['교과', COLORS.교과.fill],
          ] as [string, string][]
        ).map(([lab, color], i) => (
          <g key={lab} transform={`translate(${8 + i * 130}, ${CHART_H - 22})`}>
            <rect x={0} y={0} width={13} height={13} rx={3} fill={color} />
            <text x={19} y={11} fontSize={11} fill="#6B6A64">
              {lab}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

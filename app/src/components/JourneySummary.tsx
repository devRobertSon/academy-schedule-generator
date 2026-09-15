import { ymLabel } from '../data/roadmap';
import { JourneySummary as Summary } from '../lib/logic';

interface Props {
  summary: Summary;
}

/** 로드맵 아래 3장: 지금 단계 / 다음 단계 / 시험 */
export default function JourneySummary({ summary }: Props) {
  const { currentPhase, nowCourses, nextPhase, nextPhaseStartIdx, nextCourses, milestones } = summary;
  return (
    <div className="journey-next">
      <div className="jn now">
        <span className="jn-k">지금 단계</span>
        <b>{currentPhase ? currentPhase.name : '단계 정보 없음'}</b>
        <p>{nowCourses.length ? nowCourses.join(' · ') : '진행 중인 과정 없음'}</p>
      </div>
      <div className="jn next">
        <span className="jn-k">다음 단계{nextPhaseStartIdx !== undefined ? ` · ${ymLabel(nextPhaseStartIdx)}~` : ''}</span>
        <b>{nextPhase ? nextPhase.name : '남은 단계 없음'}</b>
        <p>{nextCourses.length ? nextCourses.slice(0, 4).join(' · ') + (nextCourses.length > 4 ? ' …' : '') : '—'}</p>
      </div>
      <div className="jn exam">
        <span className="jn-k">시험</span>
        {milestones.length === 0 ? (
          <b>예정된 시험 없음</b>
        ) : (
          <ul>
            {milestones.map((m) => (
              <li key={m.name}>
                <b>◆ {m.name}</b>
                <span>
                  {ymLabel(m.idx)} · <em>{m.monthsLeft === 0 ? '이번 달' : `${m.monthsLeft}개월 남음`}</em>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

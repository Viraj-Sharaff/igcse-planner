import { usePlanner } from '../../context/PlannerContext';

const shortLabel = (label) => label.replace('Paper ', 'P').replace('Study Session', 'Session');

function SubjectTargetRow({ subject, paper }) {
  const { targets, setTarget, placedCounts, doneCounts, getPoolCount } = usePlanner();

  const target = targets[paper.id] || 0;
  const placed = placedCounts[paper.id] || 0;
  const done = doneCounts[paper.id] || 0;
  const remaining = Math.max(0, target - done);
  const pool = getPoolCount(paper.id);

  const minTarget = placed; // can't go below placed count

  return (
    <div className="target-row">
      <div className="target-row-top">
        <div className="paper-label-block">
          <span
            className="subject-dot"
            style={{ backgroundColor: subject.color }}
          />
          <span className="paper-name">{shortLabel(paper.label)}</span>
          <span className="paper-duration">{paper.duration}m</span>
        </div>
        <div className="target-stepper">
          <button
            className="stepper-btn"
            onClick={() => setTarget(paper.id, target - 1)}
            disabled={target <= minTarget}
          >
            −
          </button>
          <span className="stepper-val">{target}</span>
          <button
            className="stepper-btn"
            onClick={() => setTarget(paper.id, target + 1)}
          >
            +
          </button>
        </div>
      </div>
      {target > 0 && (
        <div className="target-stats">
          <span className="tstat done-stat">✓ {done}</span>
          <span className="tstat rem-stat">◦ {remaining}</span>
          <span className="tstat pool-stat">pool: {pool}</span>
        </div>
      )}
    </div>
  );
}

export default function TargetsTab() {
  const { SUBJECTS } = usePlanner();

  return (
    <div className="targets-tab">
      {SUBJECTS.map((subject) => (
        <div key={subject.id} className="subject-section">
          <div className="subject-header">
            <span
              className="subject-color-bar"
              style={{ backgroundColor: subject.color }}
            />
            <span className="subject-name">{subject.shortName}</span>
            <span className="subject-code">{subject.code}</span>
          </div>
          <div className="subject-papers">
            {subject.papers.map((paper) => (
              <SubjectTargetRow key={paper.id} subject={subject} paper={paper} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import { usePlanner } from '../context/PlannerContext';
import { isConfigured } from '../firebase';

export default function MobileHeader() {
  const { mode, setMode, daysToStudyLeave, daysToExams, syncStatus } = usePlanner();

  const syncDot = {
    idle:    { color: 'var(--t4)',    label: '○' },
    syncing: { color: 'var(--sky)',   label: '↑' },
    synced:  { color: 'var(--green)', label: '✓' },
    error:   { color: 'var(--red)',   label: '✕' },
  }[syncStatus] || { color: 'var(--t4)', label: '○' };

  return (
    <header className="mobile-header">
      <div className="mobile-header-left">
        <span className="mobile-logo">IGCSE</span>
        {isConfigured && (
          <span className="mobile-sync-dot" style={{ color: syncDot.color }}>{syncDot.label}</span>
        )}
      </div>

      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'pre' ? 'active' : ''}`}
          onClick={() => setMode('pre')}
        >
          Pre-Leave
        </button>
        <button
          className={`mode-btn crunch-btn ${mode === 'crunch' ? 'active' : ''}`}
          onClick={() => setMode('crunch')}
        >
          Crunch
        </button>
      </div>

      <div className="mobile-header-right">
        {mode === 'pre' ? (
          <span className="mobile-countdown pre">
            <span className="mobile-countdown-num">{Math.max(0, daysToStudyLeave)}</span>d
          </span>
        ) : (
          <span className="mobile-countdown crunch">
            💀<span className="mobile-countdown-num">{Math.max(0, daysToExams)}</span>d
          </span>
        )}
      </div>
    </header>
  );
}

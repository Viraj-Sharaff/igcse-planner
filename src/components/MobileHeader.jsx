import { usePlanner } from '../context/PlannerContext';
import { isConfigured } from '../firebase';

const GCAL_LABEL = {
  idle:      { text: '+ GCal',      cls: 'gcal-connect'  },
  loading:   { text: '…',           cls: 'gcal-loading'  },
  connected: { text: '✓ GCal',      cls: 'gcal-connected'},
  error:     { text: '✕ Cal',       cls: 'gcal-error'    },
};

export default function MobileHeader() {
  const { mode, setMode, daysToStudyLeave, daysToExams, syncStatus, gcal } = usePlanner();

  const gcalInfo = GCAL_LABEL[gcal?.status] || GCAL_LABEL.idle;

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
        {gcal?.isConfigured && (
          <button
            className={`mobile-gcal-btn ${gcalInfo.cls}`}
            onClick={gcal.status !== 'connected' ? gcal.connect : undefined}
            disabled={gcal.status === 'loading'}
            title={gcal.status === 'connected' ? 'Google Calendar connected' : 'Connect Google Calendar'}
          >
            📅{gcal.status === 'connected' ? ' ✓' : gcal.status === 'loading' ? ' …' : ''}
          </button>
        )}
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

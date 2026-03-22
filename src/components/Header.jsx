import { usePlanner } from '../context/PlannerContext';
import { isConfigured } from '../firebase';

const SYNC_LABEL = {
  idle:    { text: '○ local',    cls: 'sync-idle' },
  syncing: { text: '↑ saving…',  cls: 'sync-ing'  },
  synced:  { text: '✓ synced',   cls: 'sync-ok'   },
  error:   { text: '✕ error',    cls: 'sync-err'  },
};

const GCAL_LABEL = {
  idle:      { text: '+ Google Cal',    cls: 'gcal-connect' },
  loading:   { text: '… connecting',    cls: 'gcal-loading'  },
  connected: { text: '✓ Google Cal',    cls: 'gcal-connected'},
  error:     { text: '✕ Cal error',     cls: 'gcal-error'    },
};

export default function Header() {
  const {
    mode, setMode,
    totalPlaced, totalDone,
    totalUnscheduled,
    daysToStudyLeave, daysToExams,
    syncStatus,
    gcal,
    clearAllData,
  } = usePlanner();

  function handleReset() {
    if (window.confirm('Reset ALL data? This cannot be undone.')) clearAllData();
  }

  const syncInfo  = SYNC_LABEL[syncStatus]  || SYNC_LABEL.idle;
  const gcalInfo  = GCAL_LABEL[gcal.status] || GCAL_LABEL.idle;
  const pct       = totalPlaced > 0 ? Math.round((totalDone / totalPlaced) * 100) : 0;

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo-block">
          <span className="logo-title">IGCSE Planner</span>
          <span className="logo-sub">MAY / JUNE 2026</span>
        </div>

        <div className="header-divider" />

        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'pre' ? 'active' : ''}`}
            onClick={() => setMode('pre')}
          >
            Pre-Leave
            <span className="mode-date">→ Apr 6</span>
          </button>
          <button
            className={`mode-btn crunch-btn ${mode === 'crunch' ? 'active' : ''}`}
            onClick={() => setMode('crunch')}
          >
            Crunch
            <span className="mode-date">Apr 6–27</span>
          </button>
        </div>
      </div>

      <div className="header-right">
        <div className="header-stats">
          <span className="stat-chip">
            <span className="stat-num">{totalPlaced}</span>
            <span className="stat-label">placed</span>
          </span>
          <span className="stat-chip">
            <span className="stat-num">{totalDone}</span>
            <span className="stat-label">done</span>
          </span>
          {totalPlaced > 0 && (
            <>
              <div className="header-progress-bar">
                <div className="header-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="progress-pct">{pct}%</span>
            </>
          )}
        </div>

        <div className="header-divider" />

        {totalUnscheduled > 0 && (
          <div className="unscheduled-badge">
            <span className="badge-num">{totalUnscheduled}</span>
            <span className="badge-label">unscheduled</span>
          </div>
        )}

        {mode === 'pre' ? (
          <div className="countdown-pill pre-countdown">
            <span className="countdown-num">{Math.max(0, daysToStudyLeave)}</span>
            <span className="countdown-label">days to study leave</span>
          </div>
        ) : (
          <div className="countdown-pill crunch-countdown">
            💀 <span className="countdown-num">{Math.max(0, daysToExams)}</span>
            <span className="countdown-label">days to exams</span>
          </div>
        )}

        <div className="header-divider" />

        {/* Google Calendar button — only shown if VITE_GCAL_CLIENT_ID is set */}
        {gcal.isConfigured && (
          <button
            className={`gcal-btn ${gcalInfo.cls}`}
            onClick={gcal.status !== 'connected' ? gcal.connect : undefined}
            title={gcal.status === 'connected' ? 'Google Calendar connected — blocks sync automatically' : 'Connect Google Calendar'}
            disabled={gcal.status === 'loading'}
          >
            <span className="gcal-icon">📅</span>
            {gcalInfo.text}
          </button>
        )}

        <span
          className={`sync-pill ${syncInfo.cls}`}
          title={isConfigured ? 'Firebase sync' : 'Add .env.local to enable sync'}
        >
          {isConfigured ? syncInfo.text : '○ local only'}
        </span>

        <button className="reset-btn" onClick={handleReset} title="Reset all data">
          🗑
        </button>
      </div>
    </header>
  );
}

import { usePlanner } from '../context/PlannerContext';

export default function MobileNav({ tab, setTab }) {
  const { totalUnscheduled } = usePlanner();

  return (
    <nav className="mobile-nav">
      <button
        className={`mobile-nav-btn ${tab === 'calendar' ? 'active' : ''}`}
        onClick={() => setTab('calendar')}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="3" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6 2v2M14 2v2M2 8h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="5" y="11" width="3" height="3" rx="0.5" fill="currentColor"/>
          <rect x="9" y="11" width="3" height="3" rx="0.5" fill="currentColor"/>
        </svg>
        <span>Calendar</span>
      </button>

      <button
        className={`mobile-nav-btn ${tab === 'targets' ? 'active' : ''}`}
        onClick={() => setTab('targets')}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
        </svg>
        <span>Targets</span>
      </button>

      <button
        className={`mobile-nav-btn ${tab === 'pool' ? 'active' : ''}`}
        onClick={() => setTab('pool')}
      >
        <div style={{ position: 'relative' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {totalUnscheduled > 0 && (
            <span className="mobile-nav-badge">{totalUnscheduled}</span>
          )}
        </div>
        <span>Pool</span>
      </button>
    </nav>
  );
}

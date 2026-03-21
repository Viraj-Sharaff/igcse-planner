import { useState } from 'react';
import TargetsTab from './TargetsTab';
import PoolTab from './PoolTab';
import { usePlanner } from '../../context/PlannerContext';

export default function Sidebar() {
  const [tab, setTab] = useState('targets');
  const { totalUnscheduled } = usePlanner();

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${tab === 'targets' ? 'active' : ''}`}
          onClick={() => setTab('targets')}
        >
          TARGETS
        </button>
        <button
          className={`sidebar-tab ${tab === 'pool' ? 'active' : ''}`}
          onClick={() => setTab('pool')}
        >
          POOL
          {totalUnscheduled > 0 && (
            <span className="tab-badge">{totalUnscheduled}</span>
          )}
        </button>
      </div>

      <div className="sidebar-content">
        {tab === 'targets' ? <TargetsTab /> : <PoolTab />}
      </div>
    </aside>
  );
}

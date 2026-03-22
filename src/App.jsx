import { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { PlannerProvider, usePlanner } from './context/PlannerContext';
import PasswordGate from './components/PasswordGate';
import { useIsMobile } from './hooks/useIsMobile';

// Desktop components
import Header from './components/Header';
import Sidebar from './components/Sidebar/index';
import Calendar from './components/Calendar/index';

// Mobile components
import MobileHeader from './components/MobileHeader';
import MobileNav from './components/MobileNav';
import MobileCalendar from './components/MobileCalendar';
import TargetsTab from './components/Sidebar/TargetsTab';
import PoolTab from './components/Sidebar/PoolTab';

function MobileTargetsView() {
  return (
    <div className="mobile-full-view">
      <TargetsTab />
    </div>
  );
}

function MobilePoolView() {
  return (
    <div className="mobile-full-view">
      <PoolTab />
    </div>
  );
}

function PlannerApp() {
  const { onDragEnd, mode } = usePlanner();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState('calendar');

  if (isMobile) {
    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="app-shell mobile">
          <MobileHeader />
          <div className={`mobile-body ${mode === 'crunch' ? 'crunch-mode' : ''}`}>
            {mobileTab === 'calendar' && <MobileCalendar />}
            {mobileTab === 'targets'  && <MobileTargetsView />}
            {mobileTab === 'pool'     && <MobilePoolView />}
          </div>
          <MobileNav tab={mobileTab} setTab={setMobileTab} />
        </div>
      </DragDropContext>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="app-shell">
        <Header />
        <div className={`app-body ${mode === 'crunch' ? 'crunch-mode' : ''}`}>
          <Sidebar />
          <Calendar />
        </div>
      </div>
    </DragDropContext>
  );
}

export default function App() {
  return (
    <PasswordGate>
      <PlannerProvider>
        <PlannerApp />
      </PlannerProvider>
    </PasswordGate>
  );
}

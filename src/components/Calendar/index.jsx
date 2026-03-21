import { useEffect, useRef, useMemo } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { formatDateKey } from '../../utils/dates';
import DayCard from './DayCard';

const DAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function groupIntoWeeks(days) {
  if (!days.length) return [];

  const dayMap = new Map();
  days.forEach((d) => dayMap.set(formatDateKey(d), d));

  // Find the Monday on or before the first day
  const first = new Date(days[0]);
  const firstDow = first.getDay(); // 0=Sun
  const daysBack = firstDow === 0 ? 6 : firstDow - 1;
  const weekStart = new Date(first);
  weekStart.setDate(weekStart.getDate() - daysBack);
  weekStart.setHours(0, 0, 0, 0);

  // Find the Sunday on or after the last day
  const last = new Date(days[days.length - 1]);
  const lastDow = last.getDay();
  const daysAhead = lastDow === 0 ? 0 : 7 - lastDow;
  const weekEnd = new Date(last);
  weekEnd.setDate(weekEnd.getDate() + daysAhead);
  weekEnd.setHours(23, 59, 59, 999);

  const weeks = [];
  const cursor = new Date(weekStart);

  while (cursor <= weekEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const key = formatDateKey(cursor);
      week.push(dayMap.has(key) ? new Date(cursor) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

export default function Calendar() {
  const { days, mode } = usePlanner();
  const todayRef = useRef(null);
  const todayKey = formatDateKey(new Date());

  const weeks = useMemo(() => groupIntoWeeks(days), [days]);

  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [mode]);

  if (!days.length) {
    return (
      <main className="calendar-area">
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 60 }}>
          No days in this range.
        </div>
      </main>
    );
  }

  return (
    <main className="calendar-area">
      {mode === 'crunch' && (
        <div className="crunch-banner">
          <span className="crunch-skull">💀</span>
          <span>CRUNCH MODE — Apr 6 to Apr 27 — no excuses</span>
          <span className="crunch-skull">💀</span>
        </div>
      )}

      <div className="cal-grid">
        <div className="cal-header-row">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="cal-header-cell">{d}</div>
          ))}
        </div>

        <div className="cal-body">
          {weeks.map((week, wi) => (
            <div key={wi} className="week-row">
              {week.map((date, di) => {
                if (!date) {
                  return <div key={`empty-${wi}-${di}`} className="day-cell-empty" />;
                }
                const key = formatDateKey(date);
                const isToday = key === todayKey;
                return (
                  <div key={key} ref={isToday ? todayRef : null}>
                    <DayCard date={date} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

import { Droppable, Draggable } from '@hello-pangea/dnd';
import { usePlanner } from '../context/PlannerContext';
import { formatDateKey, formatDayLabel, formatDateLabel } from '../utils/dates';
import { getStudyWindow } from '../utils/studyWindows';
import BlockChip from './Calendar/BlockChip';
import { PAPER_MAP, TUTOR_MAP } from '../data/subjects';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Horizontal pool chip strip (always visible above calendar for drag-and-drop)
function PoolStrip() {
  const { SUBJECTS, TUTORS, getPoolCount } = usePlanner();

  // One chip per paper type with count badge — same as desktop sidebar
  const paperItems = [];
  SUBJECTS.forEach(s => s.papers.forEach(p => {
    const count = getPoolCount(p.id);
    if (count > 0) {
      paperItems.push({
        draggableId: `pool-paper-${p.id}-0`,
        paperId: p.id,
        name: s.shortName,
        label: p.label.replace('Paper ','P').replace('Study Session','Sess.'),
        duration: p.duration,
        color: s.color,
        isTutor: false,
        count,
      });
    }
  }));

  const tutorItems = TUTORS.map(t => ({
    draggableId: `pool-tutor-${t.id}`,
    tutorId: t.id,
    name: t.name,
    duration: t.duration,
    color: t.color,
    isTutor: true,
  }));

  const allItems = [...paperItems, ...tutorItems];

  return (
    <div className="mobile-pool-strip">
      <Droppable droppableId="return-zone" direction="horizontal">
        {(provided, snapshot) => (
          <div
            className={`mobile-return-zone ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            <span>↩</span>
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="mobile-strip-scroll">
        <Droppable droppableId="pool-papers" direction="horizontal">
          {(provided) => (
            <div
              className="mobile-strip-inner"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {paperItems.map((item, idx) => (
                <Draggable key={item.draggableId} draggableId={item.draggableId} index={idx}>
                  {(provided, snapshot) => (
                    <div
                      className={`mobile-strip-chip ${snapshot.isDragging ? 'dragging' : ''}`}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        background: hexToRgba(item.color, 0.12),
                        borderColor: hexToRgba(item.color, 0.35),
                        borderLeftColor: item.color,
                        ...provided.draggableProps.style,
                      }}
                    >
                      <span style={{ color: item.color, fontWeight: 700, fontSize: 11 }}>{item.name}</span>
                      <span style={{ color: 'var(--t3)', fontSize: 10, fontFamily: 'var(--mono)' }}>
                        {item.label} · {item.duration}m
                      </span>
                      {item.count > 1 && (
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                          color: 'var(--accent-l)', background: 'var(--accent-glow)',
                          border: '1px solid var(--accent-ring)',
                          borderRadius: 99, padding: '0 5px', marginTop: 1,
                        }}>×{item.count}</span>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <Droppable droppableId="pool-tutors" direction="horizontal">
          {(provided) => (
            <div
              className="mobile-strip-inner"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {tutorItems.map((item, idx) => (
                <Draggable key={item.draggableId} draggableId={item.draggableId} index={idx}>
                  {(provided, snapshot) => (
                    <div
                      className={`mobile-strip-chip tutor ${snapshot.isDragging ? 'dragging' : ''}`}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        background: hexToRgba(item.color, 0.12),
                        borderColor: hexToRgba(item.color, 0.35),
                        borderLeftColor: item.color,
                        ...provided.draggableProps.style,
                      }}
                    >
                      <span style={{ color: item.color, fontWeight: 700, fontSize: 11 }}>{item.name}</span>
                      <span style={{ color: 'var(--t3)', fontSize: 10, fontFamily: 'var(--mono)' }}>
                        TUTOR · {item.duration}m
                      </span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

function MobileDayCard({ date }) {
  const { mode, calendar, schoolDays, toggleSchoolDay, todayKey } = usePlanner();

  const dateKey = formatDateKey(date);
  const dayLabel = formatDayLabel(date);
  const isFirst = date.getDate() === 1;
  const isToday = dateKey === todayKey;
  const isPast  = dateKey < todayKey;
  const allBlocks = Array.isArray(calendar[dateKey]) ? calendar[dateKey] : [];
  // Past days: only show completed blocks — undone ones flow back to pool
  const blocks = isPast ? allBlocks.filter(b => b.done) : allBlocks;
  const { windowLabel, hasSchool } = getStudyWindow(date, mode, schoolDays);
  const totalMins = blocks.reduce((s,b) => s + (b.duration||0), 0);
  const doneCount = blocks.filter(b => b.done).length;

  return (
    <div className={`mobile-day-card ${isToday ? 'today' : ''} ${isPast ? 'past-day' : ''} ${blocks.length > 0 ? 'has-blocks' : ''}`}>
      <div className="mobile-day-header">
        <div className="mobile-day-date">
          <span className={`mobile-day-num ${isToday ? 'today-num' : ''}`}>{date.getDate()}</span>
          <div className="mobile-day-info">
            <span className="mobile-day-label">{dayLabel}{isFirst ? ` ${MONTH_SHORT[date.getMonth()]}` : ''}</span>
            <span className="mobile-day-window">{windowLabel}</span>
          </div>
        </div>
        <div className="mobile-day-meta">
          {totalMins > 0 && <span className="day-total-time">{totalMins}m</span>}
          {doneCount > 0 && <span className="day-done-badge">✓{doneCount}</span>}
          {!isPast && mode === 'pre' && (
            <button className="school-toggle" onClick={() => toggleSchoolDay(dateKey)}>
              {hasSchool ? '🏫' : '🏠'}
            </button>
          )}
        </div>
      </div>

      <Droppable droppableId={`day-${dateKey}`} isDropDisabled={isPast}>
        {(provided, snapshot) => (
          <div
            className={`mobile-day-blocks ${snapshot.isDraggingOver ? 'drag-over' : ''} ${blocks.length === 0 ? 'empty' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {blocks.map((block, index) => (
              <BlockChip key={block.instanceId} block={block} dateKey={dateKey} index={index} readOnly={isPast} />
            ))}
            {provided.placeholder}
            {blocks.length === 0 && !isPast && <span className="drop-hint">drop here</span>}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function MobileCalendar() {
  const { days, mode } = usePlanner();

  return (
    <div className="mobile-calendar-view">
      <PoolStrip />
      <div className="mobile-day-list">
        {mode === 'crunch' && (
          <div className="crunch-banner" style={{ margin: '0 12px 8px' }}>
            <span className="crunch-skull">💀</span>
            <span>CRUNCH — Apr 6–27</span>
            <span className="crunch-skull">💀</span>
          </div>
        )}
        {days.map(date => (
          <MobileDayCard key={formatDateKey(date)} date={date} />
        ))}
      </div>
    </div>
  );
}

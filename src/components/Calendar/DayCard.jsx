import { Droppable } from '@hello-pangea/dnd';
import { usePlanner } from '../../context/PlannerContext';
import { formatDateKey, formatDateLabel } from '../../utils/dates';
import { getStudyWindow } from '../../utils/studyWindows';
import BlockChip from './BlockChip';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function DayCard({ date }) {
  const { mode, calendar, schoolDays, toggleSchoolDay, todayKey } = usePlanner();

  const dateKey   = formatDateKey(date);
  const dayNum    = date.getDate();
  const isFirst   = dayNum === 1;
  const blocks    = Array.isArray(calendar[dateKey]) ? calendar[dateKey] : [];
  const isToday   = dateKey === todayKey;
  const isPast    = dateKey < todayKey;
  const { windowLabel, hasSchool } = getStudyWindow(date, mode, schoolDays);

  const totalMinutes = blocks.reduce((s, b) => s + (b.duration || 0), 0);
  const doneCount    = blocks.filter((b) => b.done).length;

  return (
    <div className={`day-cell ${isToday ? 'today' : ''} ${isPast ? 'past-day' : ''} ${blocks.length > 0 ? 'has-blocks' : ''}`}>
      <div className="day-cell-header">
        <div className="day-cell-date">
          <div className="day-num-wrap">
            <div className="day-num">{dayNum}</div>
          </div>
          {isFirst && (
            <div className="day-month-label">{MONTH_SHORT[date.getMonth()]}</div>
          )}
          <div className="day-window">{windowLabel}</div>
        </div>

        <div className="day-cell-meta">
          {totalMinutes > 0 && (
            <span className="day-total-time">{totalMinutes}m</span>
          )}
          {doneCount > 0 && (
            <span className="day-done-badge">✓{doneCount}</span>
          )}
          {!isPast && mode === 'pre' && (
            <button
              className="school-toggle"
              onClick={() => toggleSchoolDay(dateKey)}
              title={hasSchool ? 'School day — click to toggle' : 'Home day — click to toggle'}
            >
              {hasSchool ? '🏫' : '🏠'}
            </button>
          )}
        </div>
      </div>

      <Droppable droppableId={`day-${dateKey}`} isDropDisabled={isPast}>
        {(provided, snapshot) => (
          <div
            className={`day-drop-zone ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {blocks.map((block, index) => (
              <BlockChip
                key={block.instanceId}
                block={block}
                dateKey={dateKey}
                index={index}
                readOnly={isPast}
              />
            ))}
            {provided.placeholder}
            {blocks.length === 0 && !isPast && (
              <span className="drop-hint">drop here</span>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

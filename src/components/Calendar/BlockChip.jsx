import { useState, useRef, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { usePlanner } from '../../context/PlannerContext';
import { PAPER_MAP, TUTOR_MAP } from '../../data/subjects';

function shortLabel(label) {
  return label.replace('Paper ', 'P').replace('Study Session', 'Sess.');
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function fmt24(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const TIME_SECTIONS = [
  { label: 'Morning',    times: ['06:00','07:00','08:00','09:00','10:00','11:00'] },
  { label: 'Afternoon',  times: ['12:00','13:00','14:00','15:00','15:30','16:00','16:30','17:00','17:30'] },
  { label: 'Evening',    times: ['18:00','19:00','20:00','21:00','22:00','23:00'] },
  { label: 'Late night', times: ['00:00','01:00','02:00','03:00'] },
];

// Renders via a fixed-position div appended to <body> so it's never clipped
// by any grid/overflow context
import { createPortal } from 'react-dom';

function TimePopover({ current, anchorRect, onSelect, onClear, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, 50);
    return () => clearTimeout(t);
  }, [onClose]);

  // Position below the anchor button, keep within viewport
  const top  = Math.min(anchorRect.bottom + 6, window.innerHeight - 420);
  const left = Math.min(anchorRect.left,        window.innerWidth  - 250);

  return createPortal(
    <div
      className="time-popover"
      ref={ref}
      style={{ position: 'fixed', top, left }}
      onClick={e => e.stopPropagation()}
    >
      {TIME_SECTIONS.map(s => (
        <div key={s.label} className="time-section">
          <div className="time-section-label">{s.label}</div>
          <div className="time-popover-grid">
            {s.times.map(t => (
              <button
                key={t}
                className={`time-preset-btn ${current === t ? 'active' : ''}`}
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onSelect(t); }}
              >
                {fmt24(t)}
              </button>
            ))}
          </div>
        </div>
      ))}
      {current && (
        <button className="time-clear-btn" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onClear(); }}>
          ✕ remove time
        </button>
      )}
    </div>,
    document.body
  );
}

export default function BlockChip({ block, dateKey, index, readOnly }) {
  const { toggleDone, updateDuration, updateStartTime, removeBlock } = usePlanner();
  const [editingDur,  setEditingDur]  = useState(false);
  const [durInput,    setDurInput]    = useState(String(block.duration));
  const [showTimePop, setShowTimePop]   = useState(false);
  const [anchorRect,  setAnchorRect]    = useState(null);

  const color = block.isTutor
    ? (TUTOR_MAP[block.tutorId]?.color || '#555')
    : (PAPER_MAP[block.paperId]?.subject.color || '#555');

  const subjectName = block.isTutor
    ? block.label
    : PAPER_MAP[block.paperId]?.subject.shortName || '';

  const chipStyle = {
    background:      hexToRgba(color, 0.08),
    borderColor:     hexToRgba(color, 0.2),
    borderLeftColor: color,
  };

  function commitDuration() {
    const d = parseInt(durInput, 10);
    if (d > 0) updateDuration(dateKey, block.instanceId, d);
    else setDurInput(String(block.duration));
    setEditingDur(false);
  }

  return (
    <Draggable draggableId={`cal-${block.instanceId}`} index={index} isDragDisabled={readOnly}>
      {(provided, snapshot) => (
        <div
          className={`block-chip${block.done ? ' done' : ''}${snapshot.isDragging ? ' dragging' : ''}${block.isTutor ? ' tutor-chip' : ''}${readOnly ? ' read-only' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(readOnly ? {} : provided.dragHandleProps)}
          style={{ ...chipStyle, ...provided.draggableProps.style }}
        >
          {/* Checkbox — visible but disabled in read-only mode */}
          <input
            type="checkbox"
            className="chip-checkbox"
            checked={block.done}
            onChange={readOnly ? undefined : () => toggleDone(dateKey, block.instanceId)}
            onClick={e => e.stopPropagation()}
            readOnly={readOnly}
            style={readOnly ? { cursor: 'default', opacity: 0.5 } : undefined}
          />

          {/* Two-row main content */}
          <div className="chip-main">
            <div className="chip-row-name">
              {block.isTutor ? (
                <span className="chip-subject" style={{ color }}>{block.label}</span>
              ) : (
                <span className="chip-subject" style={{ color }}>{subjectName}</span>
              )}
              {block.isTutor && <span className="chip-tag tutor-tag">TUTOR</span>}
            </div>

            <div className="chip-row-meta">
              {!block.isTutor && (
                <span className="chip-paper-label">{shortLabel(block.label)}</span>
              )}

              {/* Duration — editable only on current/future days */}
              {!readOnly && editingDur ? (
                <input
                  className="dur-input"
                  value={durInput}
                  onChange={e => setDurInput(e.target.value)}
                  onBlur={commitDuration}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitDuration();
                    if (e.key === 'Escape') { setDurInput(String(block.duration)); setEditingDur(false); }
                  }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <button
                  className="dur-btn"
                  onClick={readOnly ? undefined : e => { e.stopPropagation(); setDurInput(String(block.duration)); setEditingDur(true); }}
                  style={readOnly ? { cursor: 'default' } : undefined}
                >
                  {block.duration}m
                </button>
              )}

              {/* Time — only shown on current/future days */}
              {!readOnly && (
                <div className="chip-time-wrap" style={{ position: 'relative' }}>
                  <button
                    className={`time-btn ${block.startTime ? 'has-time' : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      setAnchorRect(e.currentTarget.getBoundingClientRect());
                      setShowTimePop(v => !v);
                    }}
                  >
                    {block.startTime ? fmt24(block.startTime) : '+ time'}
                  </button>
                  {showTimePop && anchorRect && (
                    <TimePopover
                      current={block.startTime || null}
                      anchorRect={anchorRect}
                      onSelect={t => { updateStartTime(dateKey, block.instanceId, t); setShowTimePop(false); }}
                      onClear={() => { updateStartTime(dateKey, block.instanceId, null); setShowTimePop(false); }}
                      onClose={() => setShowTimePop(false)}
                    />
                  )}
                </div>
              )}
              {/* Show time as static text on past days */}
              {readOnly && block.startTime && (
                <span className="chip-time-static">{fmt24(block.startTime)}</span>
              )}
            </div>
          </div>

          {/* Delete — hidden on past days */}
          {!readOnly && (
            <button
              className="chip-delete"
              onClick={e => { e.stopPropagation(); removeBlock(dateKey, block.instanceId); }}
            >×</button>
          )}
        </div>
      )}
    </Draggable>
  );
}

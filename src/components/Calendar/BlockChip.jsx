import { useState } from 'react';
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

// Format "HH:MM" (24h) → "4:30 PM"
function fmt24(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function BlockChip({ block, dateKey, index }) {
  const { toggleDone, updateDuration, updateStartTime, removeBlock } = usePlanner();
  const [editingDur,  setEditingDur]  = useState(false);
  const [durInput,    setDurInput]    = useState(String(block.duration));
  const [editingTime, setEditingTime] = useState(false);

  const color = block.isTutor
    ? (TUTOR_MAP[block.tutorId]?.color || '#555')
    : (PAPER_MAP[block.paperId]?.subject.color || '#555');

  const subjectShort = block.isTutor
    ? null
    : PAPER_MAP[block.paperId]?.subject.shortName;

  const chipStyle = {
    background:      hexToRgba(color, 0.08),
    borderColor:     hexToRgba(color, 0.18),
    borderLeftColor: color,
  };

  function commitDuration() {
    const d = parseInt(durInput, 10);
    if (d > 0) updateDuration(dateKey, block.instanceId, d);
    else setDurInput(String(block.duration));
    setEditingDur(false);
  }
  function handleDurKey(e) {
    if (e.key === 'Enter')  commitDuration();
    if (e.key === 'Escape') { setDurInput(String(block.duration)); setEditingDur(false); }
  }

  function commitTime(e) {
    updateStartTime(dateKey, block.instanceId, e.target.value || null);
    setEditingTime(false);
  }

  return (
    <Draggable draggableId={`cal-${block.instanceId}`} index={index}>
      {(provided, snapshot) => (
        <div
          className={`block-chip${block.done ? ' done' : ''}${snapshot.isDragging ? ' dragging' : ''}${block.isTutor ? ' tutor-chip' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{ ...chipStyle, ...provided.draggableProps.style }}
        >
          <input
            type="checkbox"
            className="chip-checkbox"
            checked={block.done}
            onChange={() => toggleDone(dateKey, block.instanceId)}
            onClick={(e) => e.stopPropagation()}
          />

          <div className="chip-info">
            <div className="chip-title">
              {block.isTutor ? (
                <>
                  <span className="chip-tutor-name" style={{ color }}>{block.label}</span>
                  <span className="chip-tag tutor-tag">TUTOR</span>
                </>
              ) : (
                <>
                  <span className="chip-subject" style={{ color }}>{subjectShort}</span>
                  <span className="chip-paper-label">{shortLabel(block.label)}</span>
                </>
              )}
            </div>

            <div className="chip-meta">
              {/* ── Time button ── */}
              {editingTime ? (
                <input
                  type="time"
                  className="time-input"
                  defaultValue={block.startTime || ''}
                  onBlur={commitTime}
                  onChange={commitTime}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  className={`time-btn ${block.startTime ? 'has-time' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setEditingTime(true); }}
                  title={block.startTime ? 'Change start time' : 'Set start time (optional)'}
                >
                  {block.startTime ? fmt24(block.startTime) : '⊕'}
                </button>
              )}

              {/* ── Duration button ── */}
              {editingDur ? (
                <input
                  className="dur-input"
                  value={durInput}
                  onChange={(e) => setDurInput(e.target.value)}
                  onBlur={commitDuration}
                  onKeyDown={handleDurKey}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  className="dur-btn"
                  onClick={(e) => { e.stopPropagation(); setDurInput(String(block.duration)); setEditingDur(true); }}
                  title="Edit duration"
                >
                  {block.duration}m
                </button>
              )}
            </div>
          </div>

          <button
            className="chip-delete"
            onClick={(e) => { e.stopPropagation(); removeBlock(dateKey, block.instanceId); }}
            title="Remove"
          >
            ×
          </button>
        </div>
      )}
    </Draggable>
  );
}

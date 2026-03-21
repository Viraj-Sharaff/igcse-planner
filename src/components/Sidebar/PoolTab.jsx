import { Droppable, Draggable } from '@hello-pangea/dnd';
import { usePlanner } from '../../context/PlannerContext';
import { PAPER_MAP } from '../../data/subjects';

function PoolChip({ item, index }) {
  const color = item.isTutor
    ? item.color
    : PAPER_MAP[item.paperId]?.subject.color || '#555';

  return (
    <Draggable draggableId={item.draggableId} index={index}>
      {(provided, snapshot) => (
        <div
          className={`pool-chip ${snapshot.isDragging ? 'dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            borderColor: color,
            ...provided.draggableProps.style,
          }}
        >
          <span
            className="chip-dot"
            style={{ backgroundColor: color }}
          />
          <span className="chip-name">{item.name}</span>
          {item.label && item.label !== item.name && (
            <span className="chip-label">{item.label}</span>
          )}
          <span className="chip-dur">{item.duration}m</span>
          {item.isTutor && <span className="tutor-badge">tutor</span>}
        </div>
      )}
    </Draggable>
  );
}

export default function PoolTab() {
  const { SUBJECTS, TUTORS, getPoolCount } = usePlanner();

  // Build flat list of pool paper chips
  const paperItems = [];
  SUBJECTS.forEach((subject) => {
    subject.papers.forEach((paper) => {
      const count = getPoolCount(paper.id);
      for (let i = 0; i < count; i++) {
        paperItems.push({
          draggableId: `pool-paper-${paper.id}-${i}`,
          paperId: paper.id,
          name: subject.shortName,
          label: paper.label,
          duration: paper.duration,
          isTutor: false,
        });
      }
    });
  });

  // Tutor items (always shown, unlimited)
  const tutorItems = TUTORS.map((tutor) => ({
    draggableId: `pool-tutor-${tutor.id}`,
    tutorId: tutor.id,
    name: tutor.name,
    label: tutor.subjects.join(', '),
    duration: tutor.duration,
    color: tutor.color,
    isTutor: true,
  }));

  return (
    <div className="pool-tab">
      {/* Return zone */}
      <Droppable droppableId="return-zone">
        {(provided, snapshot) => (
          <div
            className={`return-zone ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            <span className="return-zone-label">↩ drop here to unschedule</span>
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Paper pool */}
      <div className="pool-section">
        <div className="pool-section-header">PAPER BLOCKS</div>
        <Droppable droppableId="pool-papers">
          {(provided, snapshot) => (
            <div
              className={`pool-list ${snapshot.isDraggingOver ? 'drag-over-list' : ''}`}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {paperItems.length === 0 ? (
                <div className="pool-empty">All papers scheduled ✓</div>
              ) : (
                paperItems.map((item, idx) => (
                  <PoolChip key={item.draggableId} item={item} index={idx} />
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      {/* Tutor pool */}
      <div className="pool-section">
        <div className="pool-section-header">TUTORS</div>
        <Droppable droppableId="pool-tutors">
          {(provided, snapshot) => (
            <div
              className={`pool-list ${snapshot.isDraggingOver ? 'drag-over-list' : ''}`}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {tutorItems.map((item, idx) => (
                <PoolChip key={item.draggableId} item={item} index={idx} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

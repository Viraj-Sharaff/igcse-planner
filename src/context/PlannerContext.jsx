import { createContext, useContext, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { SUBJECTS, TUTORS, PAPER_MAP, TUTOR_MAP } from '../data/subjects';
import { generateDayRange, formatDateKey, generateId, daysUntil } from '../utils/dates';

const PlannerContext = createContext(null);

// Date constants
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const TODAY_KEY   = formatDateKey(TODAY);
const PRE_START   = new Date('2026-03-21'); // show from fixed start so past days stay visible
const PRE_END     = new Date('2026-04-06');
const CRUNCH_START = new Date('2026-04-06');
const CRUNCH_END   = new Date('2026-04-27');
const EXAM_START   = new Date('2026-05-05');

// When Firestore echoes data back, preserve any googleEventId values already in local state.
// This prevents a race condition where the Firestore echo fires before the GCal async
// createEvent writes back the new event ID, causing the ID to be silently stripped.
function preserveGcalIds(fsCalendar, localCalendar) {
  const result = {};
  Object.keys(fsCalendar).forEach((dk) => {
    const fsBlocks = fsCalendar[dk];
    if (!Array.isArray(fsBlocks)) { result[dk] = fsBlocks; return; }
    const localBlocks = Array.isArray(localCalendar[dk]) ? localCalendar[dk] : [];
    result[dk] = fsBlocks.map((fb) => {
      const lb = localBlocks.find((b) => b.instanceId === fb.instanceId);
      return lb?.googleEventId && !fb.googleEventId ? { ...fb, googleEventId: lb.googleEventId } : fb;
    });
  });
  return result;
}

export function PlannerProvider({ children }) {
  const [mode, setMode] = useLocalStorage('igcse_mode', 'pre');
  const [targetsPre, setTargetsPre] = useLocalStorage('igcse_targets_pre', {});
  const [targetsCrunch, setTargetsCrunch] = useLocalStorage('igcse_targets_crunch', {});
  const [calPre, setCalPre] = useLocalStorage('igcse_cal_pre', {});
  const [calCrunch, setCalCrunch] = useLocalStorage('igcse_cal_crunch', {});
  const [schoolDays, setSchoolDays] = useLocalStorage('igcse_school', {});

  // Google Calendar integration
  const gcal = useGoogleCalendar();

  // Active mode accessors
  const targets = mode === 'pre' ? targetsPre : targetsCrunch;
  const setTargets = mode === 'pre' ? setTargetsPre : setTargetsCrunch;
  const calendar = mode === 'pre' ? calPre : calCrunch;
  const setCalendar = mode === 'pre' ? setCalPre : setCalCrunch;

  // Day ranges — pre-leave starts from fixed date so past days stay visible as read-only history
  const preDays = useMemo(() => generateDayRange(PRE_START, PRE_END), []);
  const crunchDays = useMemo(() => generateDayRange(CRUNCH_START, CRUNCH_END), []);
  const days = mode === 'pre' ? preDays : crunchDays;

  // Computed: placed counts per paperId.
  // Past undone blocks are NOT counted — they effectively flow back to the pool.
  const placedCounts = useMemo(() => {
    const counts = {};
    Object.entries(calendar).forEach(([dateKey, dayBlocks]) => {
      if (!Array.isArray(dayBlocks)) return;
      const isPast = dateKey < TODAY_KEY;
      dayBlocks.forEach((block) => {
        if (!block.isTutor && block.paperId) {
          if (isPast && !block.done) return; // past + undone → back in pool
          counts[block.paperId] = (counts[block.paperId] || 0) + 1;
        }
      });
    });
    return counts;
  }, [calendar]);

  // Computed: done counts per paperId
  const doneCounts = useMemo(() => {
    const counts = {};
    Object.values(calendar).forEach((dayBlocks) => {
      if (!Array.isArray(dayBlocks)) return;
      dayBlocks.forEach((block) => {
        if (block.done && !block.isTutor && block.paperId) {
          counts[block.paperId] = (counts[block.paperId] || 0) + 1;
        }
      });
    });
    return counts;
  }, [calendar]);

  // Pool count for a paper
  const getPoolCount = useCallback(
    (paperId) => Math.max(0, (targets[paperId] || 0) - (placedCounts[paperId] || 0)),
    [targets, placedCounts]
  );

  // Total unscheduled (sum of all pool counts)
  const totalUnscheduled = useMemo(() => {
    let total = 0;
    SUBJECTS.forEach((s) => s.papers.forEach((p) => { total += getPoolCount(p.id); }));
    return total;
  }, [getPoolCount]);

  // Total placed and done (global stats for header)
  const totalPlaced = useMemo(() => {
    return Object.values(calendar).reduce((sum, blocks) => sum + (Array.isArray(blocks) ? blocks.length : 0), 0);
  }, [calendar]);

  const totalDone = useMemo(() => {
    return Object.values(calendar).reduce((sum, blocks) => {
      if (!Array.isArray(blocks)) return sum;
      return sum + blocks.filter((b) => b.done).length;
    }, 0);
  }, [calendar]);

  // Countdown values
  const daysToStudyLeave = useMemo(() => daysUntil(PRE_END), []);
  const daysToExams = useMemo(() => daysUntil(EXAM_START), []);

  // ─── Target management ───────────────────────────────────────────────────

  const setTarget = useCallback(
    (paperId, count) => {
      const placed = placedCounts[paperId] || 0;
      const safeCount = Math.max(placed, Math.max(0, count));
      setTargets((prev) => ({ ...prev, [paperId]: safeCount }));
    },
    [placedCounts, setTargets]
  );

  // ─── Calendar management ─────────────────────────────────────────────────

  const addBlockToDay = useCallback(
    (dateKey, type, id, insertIndex) => {
      let newBlock;
      if (type === 'paper') {
        const info = PAPER_MAP[id];
        if (!info) return;
        const poolCount = Math.max(0, (targets[id] || 0) - (placedCounts[id] || 0));
        if (poolCount <= 0) return;
        newBlock = {
          instanceId: generateId(),
          paperId: id,
          isTutor: false,
          subjectId: info.subject.id,
          subjectName: info.subject.shortName,
          label: info.paper.label,
          duration: info.paper.duration,
          done: false,
          // no googleEventId — the sync effect will create it automatically
        };
      } else if (type === 'tutor') {
        const tutor = TUTOR_MAP[id];
        if (!tutor) return;
        newBlock = {
          instanceId: generateId(),
          tutorId: id,
          isTutor: true,
          label: tutor.name,
          duration: tutor.duration,
          done: false,
        };
      } else {
        return;
      }

      setCalendar((prev) => {
        const existing = Array.isArray(prev[dateKey]) ? [...prev[dateKey]] : [];
        if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= existing.length) {
          existing.splice(insertIndex, 0, newBlock);
        } else {
          existing.push(newBlock);
        }
        return { ...prev, [dateKey]: existing };
      });
    },
    [targets, placedCounts, setCalendar]
  );

  // Mirror calendar in a ref so callbacks can read current state without
  // needing it as a dependency (avoids stale closures + unnecessary re-creation)
  const calendarRef = useRef(calendar);
  useEffect(() => { calendarRef.current = calendar; }, [calendar]);

  // ─── Google Calendar pending-delete queue ──────────────────────────────────
  // Queues googleEventIds that need to be deleted from GCal.
  // Flushed by the sync effect whenever GCal is connected.
  // This handles the case where the user deletes/moves a block before
  // the auto-reconnect has finished (isReady() would be false).
  const gcalPendingDeletes  = useRef(new Set());
  const gcalProcessingRef   = useRef(new Set()); // instanceIds currently being created

  const queueGcalDelete = useCallback((googleEventId) => {
    if (googleEventId) gcalPendingDeletes.current.add(googleEventId);
  }, []);

  const removeBlock = useCallback(
    (dateKey, instanceId) => {
      // Read current state via ref — never put side-effects inside setState updaters
      const existing = Array.isArray(calendarRef.current[dateKey]) ? calendarRef.current[dateKey] : [];
      const block = existing.find((b) => b.instanceId === instanceId);
      if (block?.googleEventId) queueGcalDelete(block.googleEventId);
      setCalendar((prev) => ({
        ...prev,
        [dateKey]: (Array.isArray(prev[dateKey]) ? prev[dateKey] : []).filter((b) => b.instanceId !== instanceId),
      }));
    },
    [setCalendar, queueGcalDelete]
  );

  const moveBlock = useCallback(
    (fromDateKey, instanceId, toDateKey, toIndex) => {
      // Read current state via ref to grab googleEventId before clearing it
      const fromBlocks = Array.isArray(calendarRef.current[fromDateKey]) ? calendarRef.current[fromDateKey] : [];
      const block = fromBlocks.find((b) => b.instanceId === instanceId);
      if (block?.googleEventId && fromDateKey !== toDateKey) {
        // Moving to a different day: queue deletion of old event, sync effect creates new one
        queueGcalDelete(block.googleEventId);
      }

      setCalendar((prev) => {
        const from = Array.isArray(prev[fromDateKey]) ? [...prev[fromDateKey]] : [];
        const idx = from.findIndex((b) => b.instanceId === instanceId);
        if (idx === -1) return prev;
        const [moved] = from.splice(idx, 1);

        if (fromDateKey === toDateKey) {
          from.splice(toIndex, 0, moved);
          return { ...prev, [fromDateKey]: from };
        }

        const { googleEventId: _gid, ...blockWithoutEvent } = moved;
        const to = Array.isArray(prev[toDateKey]) ? [...prev[toDateKey]] : [];
        to.splice(toIndex, 0, blockWithoutEvent);
        return { ...prev, [fromDateKey]: from, [toDateKey]: to };
      });
    },
    [setCalendar, queueGcalDelete]
  );

  // ─── Google Calendar auto-sync effect ─────────────────────────────────────
  useEffect(() => {
    if (!gcal.isReady()) {
      gcalProcessingRef.current.clear();
      return;
    }

    // 1. Flush pending deletions
    gcalPendingDeletes.current.forEach((id) => gcal.deleteEvent(id));
    gcalPendingDeletes.current.clear();

    // 2. Create events for blocks that don't have one yet
    const toCreate = [];
    Object.entries(calendar).forEach(([dateKey, blocks]) => {
      if (!Array.isArray(blocks)) return;
      blocks.forEach((block) => {
        if (!block.googleEventId && !gcalProcessingRef.current.has(block.instanceId)) {
          gcalProcessingRef.current.add(block.instanceId);
          toCreate.push({ dateKey, block });
        }
      });
    });

    toCreate.forEach(({ dateKey, block }) => {
      gcal.createEvent(dateKey, block).then((googleEventId) => {
        gcalProcessingRef.current.delete(block.instanceId);
        if (!googleEventId) return;
        setCalendar((prev) => {
          const dayBlocks = Array.isArray(prev[dateKey]) ? [...prev[dateKey]] : [];
          const idx = dayBlocks.findIndex((b) => b.instanceId === block.instanceId);
          if (idx === -1) return prev;
          dayBlocks[idx] = { ...dayBlocks[idx], googleEventId };
          return { ...prev, [dateKey]: dayBlocks };
        });
      });
    });
  // gcal.connected triggers re-run on connect so pending deletes + unsynced blocks are processed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar, gcal.connected]);

  const toggleDone = useCallback(
    (dateKey, instanceId) => {
      setCalendar((prev) => {
        const existing = Array.isArray(prev[dateKey]) ? [...prev[dateKey]] : [];
        return {
          ...prev,
          [dateKey]: existing.map((b) =>
            b.instanceId === instanceId ? { ...b, done: !b.done } : b
          ),
        };
      });
    },
    [setCalendar]
  );

  const updateDuration = useCallback(
    (dateKey, instanceId, newDuration) => {
      const d = parseInt(newDuration, 10);
      if (!d || d <= 0) return;
      setCalendar((prev) => {
        const existing = Array.isArray(prev[dateKey]) ? [...prev[dateKey]] : [];
        return {
          ...prev,
          [dateKey]: existing.map((b) =>
            b.instanceId === instanceId ? { ...b, duration: d } : b
          ),
        };
      });
    },
    [setCalendar]
  );

  const updateStartTime = useCallback(
    (dateKey, instanceId, time) => {
      // Queue deletion of the old GCal event (if any) — sync effect will create a new one
      const existing = Array.isArray(calendarRef.current[dateKey]) ? calendarRef.current[dateKey] : [];
      const block = existing.find((b) => b.instanceId === instanceId);
      if (block?.googleEventId) queueGcalDelete(block.googleEventId);

      setCalendar((prev) => {
        const blocks = Array.isArray(prev[dateKey]) ? [...prev[dateKey]] : [];
        return {
          ...prev,
          [dateKey]: blocks.map((b) => {
            if (b.instanceId !== instanceId) return b;
            const { googleEventId: _old, ...rest } = b;
            return time ? { ...rest, startTime: time } : { ...rest, startTime: undefined };
          }),
        };
      });
    },
    [setCalendar, queueGcalDelete]
  );

  // ─── Reset all data ──────────────────────────────────────────────────────
  const clearAllData = useCallback(async () => {
    const keys = [
      'igcse_mode', 'igcse_targets_pre', 'igcse_targets_crunch',
      'igcse_cal_pre', 'igcse_cal_crunch', 'igcse_school', 'gcal_auto_connect',
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    if (db) {
      try {
        await setDoc(doc(db, 'planner', 'main'), {
          targets_pre: {}, targets_crunch: {},
          cal_pre: {}, cal_crunch: {},
          school: {}, mode: 'pre',
        });
      } catch (e) { console.warn('Firestore reset failed', e); }
    }
    window.location.reload();
  }, []);

  // ─── School day management ────────────────────────────────────────────────

  const toggleSchoolDay = useCallback(
    (dateKey) => {
      setSchoolDays((prev) => {
        // Default is school on weekdays. Toggle inverts from default.
        const date = new Date(dateKey);
        const weekday = date.getDay() >= 1 && date.getDay() <= 5;
        const currentDefault = weekday ? true : false;
        const current = prev[dateKey] !== undefined ? prev[dateKey] : currentDefault;
        return { ...prev, [dateKey]: !current };
      });
    },
    [setSchoolDays]
  );

  // ─── Drag and drop handler ────────────────────────────────────────────────

  const onDragEnd = useCallback(
    ({ source, destination, draggableId }) => {
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) return;

      const isReturnDest =
        destination.droppableId === 'return-zone' ||
        destination.droppableId === 'pool-papers' ||
        destination.droppableId === 'pool-tutors';

      const isCalSource = source.droppableId.startsWith('day-');
      const isCalDest = destination.droppableId.startsWith('day-');
      const isPoolPaperSource = source.droppableId === 'pool-papers';
      const isPoolTutorSource = source.droppableId === 'pool-tutors';

      if (isCalSource && isReturnDest) {
        // Remove block from calendar
        const fromDateKey = source.droppableId.slice(4); // remove "day-"
        // draggableId is "cal-{instanceId}"
        const instanceId = draggableId.slice(4);
        removeBlock(fromDateKey, instanceId);
        return;
      }

      if (isCalSource && isCalDest) {
        // Move between days (or reorder within same day)
        const fromDateKey = source.droppableId.slice(4);
        const toDateKey = destination.droppableId.slice(4);
        const instanceId = draggableId.slice(4);
        moveBlock(fromDateKey, instanceId, toDateKey, destination.index);
        return;
      }

      if (isPoolPaperSource && isCalDest) {
        const toDateKey = destination.droppableId.slice(4);
        // draggableId is "pool-paper-{paperId}-{index}"
        const parts = draggableId.split('-');
        // pool-paper-{subjectId}_{paperSlug}-{index}
        // Reconstruct paperId: everything between "pool-paper-" and "-{index}"
        const withoutPrefix = draggableId.replace('pool-paper-', '');
        const lastDash = withoutPrefix.lastIndexOf('-');
        const paperId = withoutPrefix.slice(0, lastDash);
        addBlockToDay(toDateKey, 'paper', paperId, destination.index);
        return;
      }

      if (isPoolTutorSource && isCalDest) {
        const toDateKey = destination.droppableId.slice(4);
        // draggableId is "pool-tutor-{tutorId}"
        const tutorId = draggableId.replace('pool-tutor-', '');
        addBlockToDay(toDateKey, 'tutor', tutorId, destination.index);
        return;
      }
    },
    [removeBlock, moveBlock, addBlockToDay]
  );

  // ─── Firebase sync ────────────────────────────────────────────────────────
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle'|'syncing'|'synced'|'error'
  const remoteUpdateRef = useRef(false);
  const syncTimerRef = useRef(null);
  // Don't write to Firestore until we've received the first snapshot.
  // This prevents a fresh window (empty localStorage) from overwriting cloud data.
  const readyToWriteRef = useRef(!db); // true immediately if no Firebase configured

  // Listen for remote changes (real-time)
  useEffect(() => {
    if (!db) return;

    // Safety fallback: allow writes after 6s even if Firestore never responds
    const fallbackTimer = setTimeout(() => { readyToWriteRef.current = true; }, 6000);

    const unsub = onSnapshot(
      doc(db, 'planner', 'main'),
      (snap) => {
        clearTimeout(fallbackTimer);
        if (snap.exists()) {
          const d = snap.data();
          remoteUpdateRef.current = true;
          if (d.targets_pre    !== undefined) setTargetsPre(d.targets_pre);
          if (d.targets_crunch !== undefined) setTargetsCrunch(d.targets_crunch);
          // Use functional setters so we can preserve googleEventIds that Firestore
          // doesn't know about (avoids race condition with async GCal writes)
          if (d.cal_pre    !== undefined) setCalPre((prev) => preserveGcalIds(d.cal_pre, prev));
          if (d.cal_crunch !== undefined) setCalCrunch((prev) => preserveGcalIds(d.cal_crunch, prev));
          if (d.school     !== undefined) setSchoolDays(d.school);
          if (d.mode       !== undefined) setMode(d.mode);
          setSyncStatus('synced');
        }
        // First snapshot received — safe to start writing now
        readyToWriteRef.current = true;
      },
      (err) => {
        clearTimeout(fallbackTimer);
        console.warn('Firestore sync error:', err);
        readyToWriteRef.current = true; // allow local writes if Firebase errors
        setSyncStatus('error');
      }
    );
    return () => { unsub(); clearTimeout(fallbackTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write to Firestore on state changes (debounced 800ms, skips remote echoes)
  useEffect(() => {
    if (!db) return;
    if (!readyToWriteRef.current) return; // wait for first snapshot
    if (remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
      return;
    }
    setSyncStatus('syncing');
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timed out')), 8000)
      );
      Promise.race([
        setDoc(doc(db, 'planner', 'main'), {
          targets_pre: targetsPre,
          targets_crunch: targetsCrunch,
          cal_pre: calPre,
          cal_crunch: calCrunch,
          school: schoolDays,
          mode,
        }),
        timeout,
      ])
        .then(() => setSyncStatus('synced'))
        .catch((e) => { console.warn('Firestore write failed:', e); setSyncStatus('error'); });
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsPre, targetsCrunch, calPre, calCrunch, schoolDays, mode]);

  // ─────────────────────────────────────────────────────────────────────────

  const value = {
    mode,
    setMode,
    days,
    targets,
    setTarget,
    calendar,
    schoolDays,
    toggleSchoolDay,
    placedCounts,
    doneCounts,
    getPoolCount,
    totalUnscheduled,
    totalPlaced,
    totalDone,
    daysToStudyLeave,
    daysToExams,
    addBlockToDay,
    removeBlock,
    moveBlock,
    toggleDone,
    updateDuration,
    updateStartTime,
    onDragEnd,
    syncStatus,
    todayKey: TODAY_KEY,
    clearAllData,
    gcal,
    SUBJECTS,
    TUTORS,
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used inside PlannerProvider');
  return ctx;
}

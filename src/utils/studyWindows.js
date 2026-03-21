import { formatDateKey, isWeekday } from './dates';

/**
 * Returns { startLabel, endLabel, windowLabel } for a given day.
 */
export function getStudyWindow(date, mode, schoolDays) {
  if (mode === 'crunch') {
    return { startLabel: 'All day', endLabel: '2:00 AM', windowLabel: 'All day → 2:00 AM' };
  }

  // Pre-leave mode
  const dow = date.getDay(); // 0=Sun
  const dateKey = formatDateKey(date);
  const weekday = isWeekday(date);

  // School status: default Mon-Fri = school, Sat-Sun = home
  // schoolDays[dateKey] can be explicitly set to true/false
  const hasSchool = weekday
    ? schoolDays[dateKey] !== false  // default true for weekdays
    : schoolDays[dateKey] === true;  // default false for weekends

  // Next day school status
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextKey = formatDateKey(nextDate);
  const nextWeekday = isWeekday(nextDate);
  const nextHasSchool = nextWeekday
    ? schoolDays[nextKey] !== false
    : schoolDays[nextKey] === true;

  const endLabel = nextHasSchool ? '11:30 PM' : '1:30 AM';

  if (hasSchool && weekday) {
    // Mon=1, Wed=3 → 4:30 PM; Tue=2, Thu=4, Fri=5 → 3:30 PM
    const startLabel = (dow === 1 || dow === 3) ? '4:30 PM' : '3:30 PM';
    return { startLabel, endLabel, windowLabel: `${startLabel} → ${endLabel}`, hasSchool: true };
  } else {
    return { startLabel: 'All day', endLabel, windowLabel: `All day → ${endLabel}`, hasSchool: false };
  }
}

export function isSchoolDay(date, schoolDays) {
  const dateKey = formatDateKey(date);
  const weekday = isWeekday(date);
  return weekday
    ? schoolDays[dateKey] !== false
    : schoolDays[dateKey] === true;
}

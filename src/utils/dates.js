export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function generateDayRange(start, end) {
  const days = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);
  while (current <= endNorm) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDayLabel(date) {
  return DAY_NAMES[date.getDay()];
}

export function formatDateLabel(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

export function isWeekday(date) {
  const d = date.getDay();
  return d >= 1 && d <= 5;
}

export function getTodayKey() {
  return formatDateKey(new Date());
}

export function daysUntil(targetDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

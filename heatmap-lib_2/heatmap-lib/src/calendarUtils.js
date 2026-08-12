/**
 * Get the number of days in a given month.
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January, 11 = December)
 */
export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the weekday (0 = Sun ... 6 = Sat) that the 1st of the month falls on.
 */
export function firstWeekdayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

/**
 * Build a calendar grid for a given month as an array of weeks,
 * where each week is an array of 7 cells (Sun–Sat).
 * Cells outside the current month are `null`.
 *
 * Example return shape for July 2026:
 * [
 *   [null, null, null, 1, 2, 3, 4],
 *   [5, 6, 7, 8, 9, 10, 11],
 *   ...
 * ]
 */
export function buildCalendarGrid(year, month) {
  const totalDays = daysInMonth(year, month);
  const startWeekday = firstWeekdayOfMonth(year, month);

  const cells = [];

  // Leading blanks before day 1
  for (let i = 0; i < startWeekday; i++) cells.push(null);

  // Actual days
  for (let day = 1; day <= totalDays; day++) cells.push(day);

  // Trailing blanks to complete the last week
  while (cells.length % 7 !== 0) cells.push(null);

  // Chunk into weeks of 7
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}

/**
 * Format a date as 'YYYY-MM-DD' — useful as a lookup key for data.
 */
export function formatDateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

import { buildCalendarGrid, formatDateKey } from './calendarUtils.js';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Render a full calendar heatmap into a container element.
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.container - element to render into (cleared first)
 * @param {number} opts.year
 * @param {number} opts.month - 0-indexed
 * @param {Map<string, number>} opts.data - map of 'YYYY-MM-DD' -> value
 * @param {(value: number) => string} opts.getColor - color scale function
 * @param {string} opts.emptyColor - color for days with no data
 * @param {() => void} [opts.onPrev] - called when the "previous month" arrow is clicked
 * @param {() => void} [opts.onNext] - called when the "next month" arrow is clicked
 * @param {[string, string]} [opts.colorRange] - [lowColor, highColor], used to draw the legend
 * @param {[number, number]} [opts.valueRange] - [min, max], used to label the legend
 * @param {boolean} [opts.showLegend] - whether to render the legend (default true)
 */
export function renderCalendarHeatmap({
  container,
  year,
  month,
  data,
  getColor,
  emptyColor,
  onPrev,
  onNext,
  colorRange,
  valueRange,
  showLegend = true,
}) {
  container.innerHTML = '';
  container.classList.add('chm-container');

  container.appendChild(renderHeaderRow({ year, month, onPrev, onNext }));
  container.appendChild(renderWeekdayRow());

  const grid = buildCalendarGrid(year, month);
  grid.forEach((week) => {
    container.appendChild(renderWeekRow(week, { year, month, data, getColor, emptyColor }));
  });

  if (showLegend && colorRange && valueRange) {
    container.appendChild(renderLegend({ colorRange, valueRange }));
  }
}

function renderHeaderRow({ year, month, onPrev, onNext }) {
  const header = document.createElement('div');
  header.className = 'chm-header';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'chm-nav-btn';
  prevBtn.textContent = '‹';
  prevBtn.setAttribute('aria-label', 'Previous month');
  if (onPrev) prevBtn.addEventListener('click', onPrev);

  const label = document.createElement('span');
  label.className = 'chm-header-label';
  label.textContent = `${MONTH_NAMES[month]} ${year}`;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'chm-nav-btn';
  nextBtn.textContent = '›';
  nextBtn.setAttribute('aria-label', 'Next month');
  if (onNext) nextBtn.addEventListener('click', onNext);

  header.appendChild(prevBtn);
  header.appendChild(label);
  header.appendChild(nextBtn);

  return header;
}

function renderLegend({ colorRange, valueRange }) {
  const [lowColor, highColor] = colorRange;
  const [min, max] = valueRange;

  const legend = document.createElement('div');
  legend.className = 'chm-legend';

  const minLabel = document.createElement('span');
  minLabel.className = 'chm-legend-label';
  minLabel.textContent = String(min);

  const bar = document.createElement('div');
  bar.className = 'chm-legend-bar';
  bar.style.background = `linear-gradient(to right, ${lowColor}, ${highColor})`;

  const maxLabel = document.createElement('span');
  maxLabel.className = 'chm-legend-label';
  maxLabel.textContent = String(max);

  legend.appendChild(minLabel);
  legend.appendChild(bar);
  legend.appendChild(maxLabel);

  return legend;
}

function renderWeekdayRow() {
  const row = document.createElement('div');
  row.className = 'chm-weekday-row';
  WEEKDAY_LABELS.forEach((label) => {
    const cell = document.createElement('div');
    cell.className = 'chm-weekday-label';
    cell.textContent = label;
    row.appendChild(cell);
  });
  return row;
}

function renderWeekRow(week, { year, month, data, getColor, emptyColor }) {
  const row = document.createElement('div');
  row.className = 'chm-week-row';

  week.forEach((day) => {
    const cell = document.createElement('div');
    cell.className = 'chm-cell';

    if (day === null) {
      // Blank filler cell (before day 1 or after last day)
      cell.classList.add('chm-cell--blank');
    } else {
      const key = formatDateKey(year, month, day);
      const value = data.get(key);

      cell.textContent = String(day);
      cell.dataset.date = key;

      if (value === undefined) {
        cell.style.backgroundColor = emptyColor;
        cell.classList.add('chm-cell--empty');
      } else {
        cell.style.backgroundColor = getColor(value);
        cell.dataset.value = value;
      }
    }

    row.appendChild(cell);
  });

  return row;
}

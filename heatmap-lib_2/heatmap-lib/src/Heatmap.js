import { createColorScale } from './scale.js';
import { renderCalendarHeatmap } from './render.js';

/**
 * A reusable calendar heatmap component.
 *
 * @example
 * const heatmap = new CalendarHeatmap({
 *   container: document.getElementById('app'),
 *   year: 2026,
 *   month: 6, // July (0-indexed)
 *   data: { '2026-07-04': 3, '2026-07-15': 9 },
 *   colorRange: ['#f0f9ff', '#0369a1'], // low -> high
 *   valueRange: [1, 10],                // expected min/max of your data
 *   emptyColor: '#2a2a2a',
 * });
 * heatmap.render();
 */
export class CalendarHeatmap {
  constructor({
    container,
    year,
    month,
    data = {},
    colorRange = ['#f0f9ff', '#0369a1'],
    valueRange = [1, 10],
    emptyColor = '#2a2a2a',
    showLegend = true,
    onMonthChange = null,
  }) {
    if (!container) {
      throw new Error('CalendarHeatmap requires a `container` element.');
    }

    this.container = container;
    this.year = year;
    this.month = month;
    this.data = this._normalizeData(data);
    this.emptyColor = emptyColor;
    this.colorRange = colorRange;
    this.valueRange = valueRange;
    this.showLegend = showLegend;
    this.onMonthChange = onMonthChange;

    const [min, max] = valueRange;
    this.getColor = createColorScale(colorRange, min, max);

    // Bind once so these can be passed directly as event listeners.
    this._handlePrev = this._handlePrev.bind(this);
    this._handleNext = this._handleNext.bind(this);
  }

  /** Move to the previous month, wrapping the year backward at January. */
  _handlePrev() {
    const newMonth = this.month === 0 ? 11 : this.month - 1;
    const newYear = this.month === 0 ? this.year - 1 : this.year;
    this.setMonth(newYear, newMonth);
  }

  /** Move to the next month, wrapping the year forward at December. */
  _handleNext() {
    const newMonth = this.month === 11 ? 0 : this.month + 1;
    const newYear = this.month === 11 ? this.year + 1 : this.year;
    this.setMonth(newYear, newMonth);
  }

  /** Convert a plain object of {dateKey: value} into a Map for fast lookup. */
  _normalizeData(data) {
    if (data instanceof Map) return data;
    return new Map(Object.entries(data));
  }

  /** Render (or re-render) the calendar into the container. */
  render() {
    renderCalendarHeatmap({
      container: this.container,
      year: this.year,
      month: this.month,
      data: this.data,
      getColor: this.getColor,
      emptyColor: this.emptyColor,
      onPrev: this._handlePrev,
      onNext: this._handleNext,
      colorRange: this.colorRange,
      valueRange: this.valueRange,
      showLegend: this.showLegend,
    });
  }

  /** Update the data and re-render. Useful for live-updating dashboards. */
  setData(data) {
    this.data = this._normalizeData(data);
    this.render();
  }

  /** Navigate to a different month/year, re-render, and notify the consumer. */
  setMonth(year, month) {
    this.year = year;
    this.month = month;
    this.render();

    if (typeof this.onMonthChange === 'function') {
      this.onMonthChange(year, month); // month is 0-indexed, matches constructor convention
    }
  }
}

# calendar-heatmap-lib

A reusable calendar heatmap component. Renders a month as a grid of day cells, colored by intensity — useful for tracking things like daily spending, habits, or activity over time.

## Install

```bash
npm install calendar-heatmap-lib
```

## Usage

```js
import { CalendarHeatmap } from 'calendar-heatmap-lib';
import 'calendar-heatmap-lib/styles.css';

const heatmap = new CalendarHeatmap({
  container: document.getElementById('app'),
  year: 2026,
  month: 6, // 0-indexed: 0 = January, 6 = July
  data: {
    '2026-07-04': 3,
    '2026-07-15': 9,
    '2026-07-20': 1,
  },
  colorRange: ['#f0f9ff', '#0369a1'], // [lowColor, highColor]
  valueRange: [1, 10],                // expected min/max of your data
  emptyColor: '#2a2a2a',              // color for days with no data
});

heatmap.render();
```

Days with no entry in `data` render as a plain calendar cell in `emptyColor` — so an empty month just looks like a normal calendar, and it "fills in" with color as you add data.

## API

### `new CalendarHeatmap(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `HTMLElement` | *required* | Element to render into |
| `year` | `number` | *required* | e.g. `2026` |
| `month` | `number` | *required* | 0-indexed (0 = Jan, 11 = Dec) |
| `data` | `Object \| Map` | `{}` | Map of `'YYYY-MM-DD'` → numeric value |
| `colorRange` | `[string, string]` | `['#f0f9ff', '#0369a1']` | `[lowColor, highColor]` as hex strings |
| `valueRange` | `[number, number]` | `[1, 10]` | `[min, max]` your data values span |
| `emptyColor` | `string` | `'#2a2a2a'` | Color for days with no data |
| `showLegend` | `boolean` | `true` | Show the min/max color legend below the grid |

### Methods

- **`.render()`** — draws (or redraws) the calendar into the container.
- **`.setData(data)`** — replaces the data and re-renders. Use this to reflect new entries without rebuilding the whole component.
- **`.setMonth(year, month)`** — navigates to a different month and re-renders. Also what the built-in `‹` `›` header buttons call internally.

## Example: tracking daily spending

```js
const spendingHeatmap = new CalendarHeatmap({
  container: document.getElementById('spending-chart'),
  year: 2026,
  month: 6,
  data: {}, // starts empty — looks like a normal calendar
  colorRange: ['#ecfdf5', '#047857'], // light green -> dark green
  valueRange: [0, 200], // e.g. $0-$200/day
});

spendingHeatmap.render();

// Later, as spending is logged:
spendingHeatmap.setData({
  '2026-07-01': 45,
  '2026-07-02': 120,
});
```

## Styling

The component ships unstyled-but-functional CSS in `dist/styles.css`. Key class names, if you want to override anything:

- `.chm-container` — outer wrapper
- `.chm-header`, `.chm-header-label`, `.chm-nav-btn` — month header + prev/next buttons
- `.chm-weekday-row`, `.chm-weekday-label` — Sun–Sat header row
- `.chm-week-row`, `.chm-cell` — the grid itself
- `.chm-cell--empty` — applied to cells with no data
- `.chm-cell--blank` — leading/trailing filler cells outside the month
- `.chm-legend`, `.chm-legend-bar`, `.chm-legend-label` — the color legend

## Development

```bash
npm install
npm run build   # bundles src/ -> dist/ (ESM, CJS, and type declarations)
npm run dev     # watch mode
```

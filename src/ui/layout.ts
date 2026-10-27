export type LayoutMode = 'wide' | 'narrow' | 'tiny';

export interface DashboardLayout {
  mode: LayoutMode;
  columns: number;
  rows: number;
  headerHeight: number;
  inputHeight: number;
  keyBarHeight: number;
  mainHeight: number;
  singlePane: boolean;
  listWidth: number;
  listTextWidth: number;
  detailWidth: number;
  detailTextWidth: number;
  /** Visible task rows in the list pane. */
  listRows: number;
  /** Header lines inside the detail pane. */
  detailHeaderLines: number;
  /** Rule line between detail header and log. */
  detailRuleLines: number;
  /** Visible log lines. */
  detailRows: number;
}

const MIN_WIDE_COLUMNS = 64;
const MIN_USABLE_COLUMNS = 50;
const MIN_USABLE_ROWS = 10;
const LIST_MIN = 26;
const LIST_MAX = 42;
const DETAIL_MIN = 30;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Resolve the dashboard layout for a terminal size.
 *
 * The root uses no horizontal padding; panes own their own padding. The list
 * pane is `listWidth` columns, the detail pane gets a 1-column separator and
 * the remainder. Narrow terminals collapse to one pane instead of squeezing
 * both into unreadable columns.
 */
export function computeLayout(columns: number, rows: number): DashboardLayout {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeRows = Math.max(1, Math.floor(rows));

  const headerHeight = 1;
  const keyBarHeight = 1;
  const inputHeight = 1;

  if (safeColumns < MIN_USABLE_COLUMNS || safeRows < MIN_USABLE_ROWS) {
    return {
      mode: 'tiny',
      columns: safeColumns,
      rows: safeRows,
      headerHeight,
      inputHeight: 0,
      keyBarHeight,
      mainHeight: Math.max(1, safeRows - headerHeight - keyBarHeight),
      singlePane: true,
      listWidth: safeColumns,
      listTextWidth: Math.max(1, safeColumns - 2),
      detailWidth: safeColumns,
      detailTextWidth: Math.max(1, safeColumns - 2),
      listRows: Math.max(1, safeRows - headerHeight - keyBarHeight),
      detailHeaderLines: 2,
      detailRuleLines: 1,
      detailRows: Math.max(1, safeRows - headerHeight - keyBarHeight - 3),
    };
  }

  const mainHeight = Math.max(1, safeRows - headerHeight - inputHeight - keyBarHeight);

  const wideListWidth = clamp(Math.round(safeColumns * 0.36), LIST_MIN, LIST_MAX);
  const wideDetailWidth = safeColumns - wideListWidth;

  if (safeColumns < MIN_WIDE_COLUMNS || wideDetailWidth - 3 < DETAIL_MIN) {
    return {
      mode: 'narrow',
      columns: safeColumns,
      rows: safeRows,
      headerHeight,
      inputHeight,
      keyBarHeight,
      mainHeight,
      singlePane: true,
      listWidth: safeColumns,
      listTextWidth: Math.max(1, safeColumns - 2),
      detailWidth: safeColumns,
      detailTextWidth: Math.max(1, safeColumns - 2),
      listRows: mainHeight,
      detailHeaderLines: 2,
      detailRuleLines: 1,
      detailRows: Math.max(1, mainHeight - 3),
    };
  }

  return {
    mode: 'wide',
    columns: safeColumns,
    rows: safeRows,
    headerHeight,
    inputHeight,
    keyBarHeight,
    mainHeight,
    singlePane: false,
    listWidth: wideListWidth,
    listTextWidth: Math.max(1, wideListWidth - 2),
    detailWidth: wideDetailWidth,
    detailTextWidth: Math.max(1, wideDetailWidth - 3),
    listRows: mainHeight,
    detailHeaderLines: 2,
    detailRuleLines: 1,
    detailRows: Math.max(1, mainHeight - 3),
  };
}

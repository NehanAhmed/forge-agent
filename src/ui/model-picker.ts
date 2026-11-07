import type { ModelInfo } from '../core/models.js';

export interface ModelPickerLayout {
  columns: number;
  rows: number;
  width: number;
  height: number;
  bordered: boolean;
  paddingX: number;
  contentWidth: number;
  /** Maximum number of model rows the list may occupy. */
  listRows: number;
  /** Number of models actually visible in the current window. */
  visibleCount: number;
  /** Rows used by the list, including the empty-state row. */
  listHeight: number;
  scrollTop: number;
  showHeader: boolean;
  showFilter: boolean;
  showDescription: boolean;
  showFooter: boolean;
  compact: boolean;
}

const MAX_WIDTH = 88;
const MIN_BORDER_WIDTH = 8;
const MIN_BORDER_ROWS = 3;

/** Case-insensitive search across a model's name, id, and description. */
export function filterModels(models: ModelInfo[], filter: string): ModelInfo[] {
  const query = filter.trim().toLowerCase();
  if (!query) return models;

  return models.filter(
    model =>
      model.name.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query) ||
      model.description.toLowerCase().includes(query),
  );
}

/** Keep the selected model visible while centring it when the list overflows. */
export function modelScrollTop(selectedIndex: number, itemCount: number, listRows: number): number {
  if (itemCount <= 0 || listRows <= 0) return 0;
  if (itemCount <= listRows) return 0;

  const maxTop = itemCount - listRows;
  const half = Math.floor(listRows / 2);
  return Math.min(maxTop, Math.max(0, selectedIndex - half));
}

/**
 * Resolve the responsive geometry for the model picker.
 *
 * The modal shrinks to its content instead of always filling the terminal. As
 * space gets tight, optional chrome (hints, filter, description, footer, then
 * the border) is dropped in that order so the model list always remains usable.
 */
export function computeModelPickerLayout(
  columns: number,
  rows: number,
  itemCount: number,
  selectedIndex: number,
): ModelPickerLayout {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeRows = Math.max(1, Math.floor(rows));

  const horizontalMargin = safeColumns >= 6 ? 1 : 0;
  const width = Math.max(1, Math.min(safeColumns - horizontalMargin * 2, MAX_WIDTH));
  const bordered = width >= MIN_BORDER_WIDTH && safeRows >= MIN_BORDER_ROWS;
  const paddingX = width >= (bordered ? 8 : 4) ? 1 : 0;
  const contentWidth = Math.max(1, width - (bordered ? 2 : 0) - paddingX * 2);

  const verticalMargin = safeRows >= 6 ? 1 : 0;
  const maxHeight = Math.max(1, safeRows - verticalMargin * 2);
  let budget = Math.max(1, maxHeight - (bordered ? 2 : 0));

  const showHeader = budget >= 2;
  if (showHeader) budget -= 1;

  const showFilter = budget >= 2 && contentWidth >= 10;
  if (showFilter) budget -= 1;

  const showFooter = budget >= 2;
  if (showFooter) budget -= 1;

  const showDescription = budget >= 2 && contentWidth >= 40;
  if (showDescription) budget -= 1;

  const listRows = Math.max(1, budget);
  const count = Math.max(0, Math.floor(itemCount));
  const visibleCount = Math.min(count, listRows);
  const listHeight = count === 0 ? Math.min(1, listRows) : Math.max(1, visibleCount);
  const chromeHeight =
    (bordered ? 2 : 0) +
    (showHeader ? 1 : 0) +
    (showFilter ? 1 : 0) +
    listHeight +
    (showDescription ? 1 : 0) +
    (showFooter ? 1 : 0);
  const height = Math.min(maxHeight, chromeHeight);

  return {
    columns: safeColumns,
    rows: safeRows,
    width,
    height,
    bordered,
    paddingX,
    contentWidth,
    listRows,
    visibleCount,
    listHeight,
    scrollTop: modelScrollTop(selectedIndex, count, listRows),
    showHeader,
    showFilter,
    showDescription,
    showFooter,
    compact: safeRows < 14 || width < 46,
  };
}

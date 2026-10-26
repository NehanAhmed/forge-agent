import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout } from '../src/ui/layout.js';

describe('UI Layout', () => {
  it('uses a two-pane layout on a wide terminal', () => {
    const layout = computeLayout(120, 40);
    assert.equal(layout.mode, 'wide');
    assert.equal(layout.singlePane, false);
    assert.equal(layout.headerHeight + layout.inputHeight + layout.keyBarHeight + layout.mainHeight, 40);
    assert.ok(layout.listWidth >= 26 && layout.listWidth <= 42);
    assert.equal(layout.listWidth + layout.detailWidth, 120);
    assert.equal(layout.detailRows, layout.mainHeight - 3);
  });

  it('keeps both panes usable at 80x24', () => {
    const layout = computeLayout(80, 24);
    assert.equal(layout.mode, 'wide');
    assert.equal(layout.mainHeight, 21);
    assert.equal(layout.listTextWidth, layout.listWidth - 2);
    assert.equal(layout.detailRows, 18);
  });

  it('collapses to a single pane when the detail column would be too narrow', () => {
    const layout = computeLayout(50, 20);
    assert.equal(layout.mode, 'narrow');
    assert.equal(layout.singlePane, true);
    assert.equal(layout.listWidth, 50);
    assert.equal(layout.listTextWidth, 48);
  });

  it('falls back to a recovery layout on tiny terminals', () => {
    const layout = computeLayout(30, 8);
    assert.equal(layout.mode, 'tiny');
    assert.equal(layout.inputHeight, 0);
    assert.equal(layout.mainHeight, 6);
  });

  it('never produces zero or negative sizes', () => {
    const layout = computeLayout(1, 1);
    assert.ok(layout.mainHeight >= 1);
    assert.ok(layout.listTextWidth >= 1);
    assert.ok(layout.detailTextWidth >= 1);
    assert.ok(layout.detailRows >= 1);
  });
});

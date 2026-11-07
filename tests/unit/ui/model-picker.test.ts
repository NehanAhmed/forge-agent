import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CODING_MODELS } from '../../../src/core/models.js';
import { computeModelPickerLayout, filterModels, modelScrollTop } from '../../../src/ui/model-picker.js';

describe('UI Model Picker', () => {
  describe('filterModels', () => {
    it('returns the catalog unchanged for an empty filter', () => {
      assert.deepEqual(filterModels(CODING_MODELS, ''), CODING_MODELS);
      assert.deepEqual(filterModels(CODING_MODELS, '   '), CODING_MODELS);
    });

    it('matches name, id, and description case-insensitively', () => {
      const byName = filterModels(CODING_MODELS, 'lightning');
      assert.ok(byName.length > 0);
      assert.ok(byName.every(model => model.name.toLowerCase().includes('lightning')));

      const byId = filterModels(CODING_MODELS, 'nemotron-3-super');
      assert.ok(byId.length > 0);
      assert.ok(byId.every(model => model.id.toLowerCase().includes('nemotron-3-super')));

      const byDescription = filterModels(CODING_MODELS, 'COMPLEX REASONING');
      assert.ok(byDescription.length > 0);
      assert.ok(byDescription.every(model => model.description.toLowerCase().includes('complex reasoning')));
    });

    it('returns an empty list when nothing matches', () => {
      assert.deepEqual(filterModels(CODING_MODELS, 'definitely-not-a-model'), []);
    });
  });

  describe('modelScrollTop', () => {
    it('never scrolls when the list fits', () => {
      assert.equal(modelScrollTop(0, 4, 8), 0);
      assert.equal(modelScrollTop(3, 4, 8), 0);
    });

    it('keeps the selection inside the scroll window', () => {
      assert.equal(modelScrollTop(0, 100, 10), 0);
      assert.equal(modelScrollTop(50, 100, 10), 45);
      assert.equal(modelScrollTop(99, 100, 10), 90);
    });

    it('handles empty lists and zero-height windows', () => {
      assert.equal(modelScrollTop(0, 0, 10), 0);
      assert.equal(modelScrollTop(3, 10, 0), 0);
    });
  });

  describe('computeModelPickerLayout', () => {
    it('fits a comfortable modal inside a large terminal', () => {
      const layout = computeModelPickerLayout(140, 50, CODING_MODELS.length, 1);

      assert.ok(layout.width <= 88);
      assert.ok(layout.height <= 50);
      assert.equal(layout.bordered, true);
      assert.equal(layout.showHeader, true);
      assert.equal(layout.showFilter, true);
      assert.equal(layout.showFooter, true);
      assert.equal(layout.showDescription, true);
      assert.ok(layout.contentWidth > 40);
      assert.equal(layout.visibleCount, CODING_MODELS.length);
      assert.equal(layout.height, 2 + 1 + 1 + CODING_MODELS.length + 1 + 1);
    });

    it('drops optional chrome on a short terminal while keeping the list usable', () => {
      const layout = computeModelPickerLayout(50, 10, 20, 0);

      assert.ok(layout.width <= 50);
      assert.ok(layout.height <= 10);
      assert.equal(layout.bordered, true);
      assert.equal(layout.showHeader, true);
      assert.ok(layout.listRows >= 1);
      assert.ok(layout.visibleCount >= 1);
    });

    it('remains safe on very small terminals', () => {
      for (const [columns, rows] of [
        [20, 6],
        [10, 3],
        [1, 1],
      ]) {
        const layout = computeModelPickerLayout(columns!, rows!, 4, 0);

        assert.ok(layout.width >= 1);
        assert.ok(layout.width <= columns!);
        assert.ok(layout.height >= 1);
        assert.ok(layout.height <= rows!);
        assert.ok(layout.contentWidth >= 1);
        assert.ok(layout.listRows >= 1);
      }
    });

    it('centres the visible window around a long selection', () => {
      const layout = computeModelPickerLayout(80, 24, 100, 50);

      assert.ok(layout.visibleCount > 0);
      assert.ok(layout.scrollTop > 0);
      assert.ok(layout.scrollTop <= 50);
      assert.ok(layout.scrollTop + layout.visibleCount <= 100);
    });
  });
});

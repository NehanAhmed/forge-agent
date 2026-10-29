import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CODING_MODELS, DEFAULT_MODEL_ID, getModelById, getModelName } from '../../../src/core/models.js';

describe('models', () => {
  it('exposes a non-empty model catalog with unique ids', () => {
    assert.ok(CODING_MODELS.length > 0);
    const ids = CODING_MODELS.map(model => model.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(id => id.length > 0));
  });

  it('uses the first catalog entry as the default', () => {
    assert.equal(DEFAULT_MODEL_ID, CODING_MODELS[0]?.id);
    assert.ok(getModelById(DEFAULT_MODEL_ID));
  });

  it('falls back to the raw id for unknown models', () => {
    assert.equal(getModelById('missing/model'), undefined);
    assert.equal(getModelName('missing/model'), 'missing/model');
    assert.equal(getModelName(DEFAULT_MODEL_ID), CODING_MODELS[0]?.name);
  });
});

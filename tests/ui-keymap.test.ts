import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAction, type KeyLike } from '../src/ui/keymap.js';

function key(overrides: Partial<KeyLike> = {}): KeyLike {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageUp: false,
    pageDown: false,
    return: false,
    escape: false,
    tab: false,
    backspace: false,
    delete: false,
    ctrl: false,
    shift: false,
    home: false,
    end: false,
    meta: false,
    ...overrides,
  };
}

describe('UI Keymap', () => {
  it('never fires list shortcuts while typing', () => {
    for (const letter of ['a', 'c', 'r', 'm', 'x', 's', 'q', '?']) {
      assert.deepEqual(resolveAction(letter, key(), { focus: 'input', overlay: null }), { type: 'none' });
    }
  });

  it('moves selection with arrows from the input and list', () => {
    assert.deepEqual(
      resolveAction('', key({ upArrow: true }), { focus: 'input', overlay: null }),
      { type: 'moveSelection', delta: -1 },
    );
    assert.deepEqual(
      resolveAction('', key({ downArrow: true }), { focus: 'list', overlay: null }),
      { type: 'moveSelection', delta: 1 },
    );
  });

  it('routes list actions only when the list is focused', () => {
    assert.deepEqual(resolveAction('a', key(), { focus: 'list', overlay: null }), { type: 'openApprovals' });
    assert.deepEqual(resolveAction('c', key(), { focus: 'list', overlay: null }), { type: 'cancelTask' });
    assert.deepEqual(resolveAction('D', key(), { focus: 'list', overlay: null }), { type: 'diffTask' });
    assert.deepEqual(resolveAction('q', key(), { focus: 'list', overlay: null }), { type: 'quit' });
  });

  it('scrolls the log when the detail owns focus', () => {
    assert.deepEqual(
      resolveAction('', key({ downArrow: true }), { focus: 'detail', overlay: null }),
      { type: 'scroll', delta: 1 },
    );
    assert.deepEqual(
      resolveAction('g', key(), { focus: 'detail', overlay: null }),
      { type: 'scrollEdge', edge: 'first' },
    );
  });

  it('cycles focus and blurs predictably', () => {
    assert.deepEqual(resolveAction('', key({ tab: true }), { focus: 'input', overlay: null }), {
      type: 'cycleFocus',
      reverse: false,
    });
    assert.deepEqual(resolveAction('', key({ tab: true, shift: true }), { focus: 'list', overlay: null }), {
      type: 'cycleFocus',
      reverse: true,
    });
    assert.deepEqual(resolveAction('', key({ escape: true }), { focus: 'detail', overlay: null }), {
      type: 'blur',
    });
  });

  it('only confirms from inside the confirm modal', () => {
    assert.deepEqual(resolveAction('y', key(), { focus: 'input', overlay: null }), { type: 'none' });
    assert.deepEqual(resolveAction('y', key(), { focus: 'input', overlay: 'confirm' }), {
      type: 'overlayConfirmYes',
    });
    assert.deepEqual(resolveAction('n', key(), { focus: 'list', overlay: 'confirm' }), {
      type: 'overlayConfirmNo',
    });
    assert.deepEqual(resolveAction('a', key(), { focus: 'list', overlay: 'confirm' }), { type: 'none' });
  });

  it('routes approvals and diff overlays', () => {
    assert.deepEqual(resolveAction('', key({ upArrow: true }), { focus: 'list', overlay: 'approvals' }), {
      type: 'overlayMove',
      delta: -1,
    });
    assert.deepEqual(resolveAction('y', key(), { focus: 'list', overlay: 'approvals' }), {
      type: 'overlayApprove',
    });
    assert.deepEqual(resolveAction('A', key(), { focus: 'list', overlay: 'approvals' }), {
      type: 'overlayApproveAll',
    });
    assert.deepEqual(resolveAction('', key({ pageDown: true }), { focus: 'list', overlay: 'diff' }), {
      type: 'overlayScroll',
      delta: 1,
      page: true,
    });
  });

  it('requires an explicit y or n while approve-all confirmation is open', () => {
    const context = { focus: 'list' as const, overlay: 'approvals' as const, confirmingAll: true };
    assert.deepEqual(resolveAction('y', key(), context), { type: 'overlayApproveAllConfirm' });
    assert.deepEqual(resolveAction('Y', key(), context), { type: 'overlayApproveAllConfirm' });
    assert.deepEqual(resolveAction('n', key(), context), { type: 'overlayCancelApproveAll' });
    assert.deepEqual(resolveAction('', key({ escape: true }), context), { type: 'overlayCancelApproveAll' });
    assert.deepEqual(resolveAction('', key({ return: true }), context), { type: 'none' });
    assert.deepEqual(resolveAction('A', key(), context), { type: 'none' });
    assert.deepEqual(resolveAction('', key({ upArrow: true }), context), { type: 'none' });
  });

  it('always honours Ctrl+C and opens help only outside the input', () => {
    assert.deepEqual(resolveAction('c', key({ ctrl: true }), { focus: 'input', overlay: null }), {
      type: 'quit',
    });
    assert.deepEqual(resolveAction('?', key(), { focus: 'list', overlay: null }), { type: 'help' });
    assert.deepEqual(resolveAction('?', key(), { focus: 'input', overlay: null }), { type: 'none' });
  });
});

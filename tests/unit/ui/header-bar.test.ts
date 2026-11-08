import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from 'ink-testing-library';
import { HeaderBar } from '../../../src/cli/components/dashboard/HeaderBar.js';
import { createGlyphs, createTheme } from '../../../src/ui/theme.js';
import { truncateCells } from '../../../src/ui/text.js';

const theme = createTheme({ noColor: true });
const glyphs = createGlyphs(true);

function renderHeader(columns: number, modelName = 'Test Model') {
  return render(
    React.createElement(HeaderBar, {
      tasks: [],
      approvalsCount: 0,
      filter: 'all',
      modelName,
      theme,
      glyphs,
      ascii: true,
      columns,
    }),
  );
}

describe('HeaderBar', () => {
  it('hides the model label below 100 columns', () => {
    const instance = renderHeader(99);
    try {
      assert.equal((instance.lastFrame() ?? '').includes('model:'), false);
    } finally {
      instance.unmount();
    }
  });

  it('shows the model label at 100 columns', () => {
    const instance = renderHeader(100);
    try {
      assert.equal((instance.lastFrame() ?? '').includes('model: Test Model'), true);
    } finally {
      instance.unmount();
    }
  });

  it('still truncates long model names at the existing width', () => {
    const name = 'A very long model name that exceeds the limit';
    const instance = renderHeader(100, name);
    try {
      const frame = instance.lastFrame() ?? '';
      assert.equal(frame.includes(`model: ${truncateCells(name, 28)}`), true);
      assert.equal(frame.includes(name), false);
    } finally {
      instance.unmount();
    }
  });
});

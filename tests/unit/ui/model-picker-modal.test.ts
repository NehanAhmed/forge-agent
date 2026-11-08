import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from 'ink-testing-library';
import { Box } from 'ink';
import { ModelPickerModal } from '../../../src/cli/components/ModelPickerModal.js';
import type { ModelInfo } from '../../../src/core/models.js';
import { cellWidth } from '../../../src/ui/text.js';

const MODELS: ModelInfo[] = [
  { id: 'alpha/model', name: 'Alpha Model', description: 'Fast and small' },
  { id: 'beta/model', name: 'Beta Model', description: 'Balanced reasoning' },
  { id: 'gamma/model', name: 'Gamma Model', description: 'Largest context window' },
];

function wait(ms = 20): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForFrame(
  instance: { lastFrame: () => string | undefined },
  text: string,
  timeoutMs = 2000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((instance.lastFrame() ?? '').includes(text)) return true;
    await wait(50);
  }
  return false;
}

function renderPicker(overrides: Partial<React.ComponentProps<typeof ModelPickerModal>> = {}) {
  const width = overrides.width ?? 80;
  const height = overrides.height ?? 24;
  return render(
    React.createElement(
      Box,
      { width, height, flexDirection: 'column' },
      React.createElement(ModelPickerModal, {
        isOpen: true,
        onClose: () => {},
        onSelect: () => {},
        currentModelId: MODELS[0]!.id,
        models: MODELS,
        width,
        height,
        ...overrides,
      }),
    ),
  );
}

describe('ModelPickerModal', () => {
  it('shows the model list, the current marker, and key hints', async () => {
    const instance = renderPicker();

    try {
      assert.ok(await waitForFrame(instance, 'Select model'));
      const frame = instance.lastFrame() ?? '';
      assert.ok(frame.includes('Alpha Model'));
      assert.ok(frame.includes('Beta Model'));
      assert.ok(frame.includes('Gamma Model'));
      assert.ok(frame.includes('●'));
      assert.ok(frame.includes('enter select'));
    } finally {
      instance.unmount();
    }
  });

  it('moves the cursor and selects the highlighted model with Enter', async () => {
    const selected: string[] = [];
    const instance = renderPicker({ onSelect: modelId => selected.push(modelId) });

    try {
      await waitForFrame(instance, 'Select model');
      instance.stdin.write('\u001B[B'); // down arrow
      await wait(30);
      instance.stdin.write('\r');
      await wait(30);
      assert.deepEqual(selected, [MODELS[1]!.id]);
    } finally {
      instance.unmount();
    }
  });

  it('filters the list as the user types and closes with Escape', async () => {
    let closed = false;
    const instance = renderPicker({ onClose: () => (closed = true) });

    try {
      await waitForFrame(instance, 'Select model');
      instance.stdin.write('gamma');
      assert.ok(await waitForFrame(instance, 'filter: gamma'));
      const frame = instance.lastFrame() ?? '';
      assert.ok(frame.includes('Gamma Model'));
      assert.ok(!frame.includes('Beta Model'));
      assert.ok(!frame.includes('  Alpha Model'));

      instance.stdin.write('\u001B'); // escape
      await wait(30);
      assert.equal(closed, true);
    } finally {
      instance.unmount();
    }
  });

  it('renders without overflowing a very small terminal', async () => {
    const instance = renderPicker({ width: 20, height: 6 });

    try {
      assert.ok(await waitForFrame(instance, 'Alpha'));
      const lines = (instance.lastFrame() ?? '').split('\n');
      assert.ok(lines.length <= 6, `expected at most 6 lines, got ${lines.length}`);
      assert.ok(
        lines.every(line => cellWidth(line) <= 20),
        'expected every line to fit 20 columns',
      );
    } finally {
      instance.unmount();
    }
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGlyphs, createTheme, logColor, logGlyph, statusColor } from '../../../src/ui/theme.js';

describe('UI theme', () => {
  it('disables colour when NO_COLOR is set or explicitly requested', () => {
    const noColor = createTheme({ env: { NO_COLOR: '1' } });
    assert.equal(noColor.noColor, true);
    assert.equal(noColor.accent, undefined);

    const forced = createTheme({ noColor: true, env: {} });
    assert.equal(forced.noColor, true);

    const color = createTheme({ env: {} });
    assert.equal(color.noColor, false);
    assert.equal(color.accent, 'cyan');
    assert.equal(color.error, 'redBright');
  });

  it('returns ASCII and Unicode glyph sets', () => {
    const ascii = createGlyphs(true);
    assert.equal(ascii.selected, '>');
    assert.equal(ascii.separator, '|');
    const unicode = createGlyphs(false);
    assert.notEqual(unicode.selected, ascii.selected);
    assert.equal(unicode.approval, '⚠');
  });

  it('maps task statuses and log kinds to semantic colours', () => {
    const theme = createTheme({ env: {} });
    assert.equal(statusColor('failed', theme), theme.error);
    assert.equal(statusColor('waiting_approval', theme), theme.warning);
    assert.equal(statusColor('cancelled', theme), theme.muted);
    assert.equal(logColor('error', theme), theme.error);
    assert.equal(logColor('tool_call', theme), theme.warning);
    assert.equal(logGlyph('assistant', true), '*');
    assert.equal(logGlyph('error', true), 'x');
    assert.notEqual(logGlyph('assistant', false), '*');
    assert.ok(logGlyph('assistant', false).length > 0);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BUNDLED_FONT_FILES,
  FONT_FAMILY,
  bundledFontsDir,
  fontInstallInstructions,
  formatFontInstallReport,
  installBundledFonts,
  userFontDir,
} from '../../../src/core/fonts.js';
import { tempDir } from '../../helpers/temp.js';

describe('bundled font paths', () => {
  it('resolves the packaged assets/fonts directory', () => {
    const dir = bundledFontsDir();
    assert.equal(path.basename(dir), 'fonts');
    assert.equal(path.basename(path.dirname(dir)), 'assets');
  });

  it('ships every file the installer copies', () => {
    const dir = bundledFontsDir();
    for (const file of BUNDLED_FONT_FILES) {
      assert.ok(fs.existsSync(path.join(dir, file)), `missing ${file}`);
    }
    assert.ok(fs.existsSync(path.join(dir, 'OFL.txt')), 'missing OFL.txt');
  });
});

describe('userFontDir', () => {
  it('uses LOCALAPPDATA on Windows', () => {
    const dir = userFontDir('win32', { LOCALAPPDATA: 'C:\\Users\\test\\AppData\\Local' }, 'C:\\Users\\test');
    assert.equal(dir, path.join('C:\\Users\\test\\AppData\\Local', 'Microsoft', 'Windows', 'Fonts'));
  });

  it('falls back to the home directory when LOCALAPPDATA is unset', () => {
    const dir = userFontDir('win32', {}, path.join('C:', 'Users', 'test'));
    assert.equal(dir, path.join('C:', 'Users', 'test', 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts'));
  });

  it('uses ~/Library/Fonts on macOS', () => {
    assert.equal(userFontDir('darwin', {}, '/Users/test'), path.join('/Users/test', 'Library', 'Fonts'));
  });

  it('uses XDG_DATA_HOME on Linux when set', () => {
    const dir = userFontDir('linux', { XDG_DATA_HOME: '/data' }, '/home/test');
    assert.equal(dir, path.join('/data', 'fonts'));
  });

  it('falls back to ~/.local/share/fonts on Linux', () => {
    const dir = userFontDir('linux', {}, '/home/test');
    assert.equal(dir, path.join('/home/test', '.local', 'share', 'fonts'));
  });
});

describe('installBundledFonts', () => {
  it('copies the bundled fonts into the target directory', t => {
    const target = tempDir(t, 'forge-fonts-');
    const result = installBundledFonts({ targetDir: target, register: false });

    assert.equal(result.directory, target);
    assert.deepEqual(result.installed, [...BUNDLED_FONT_FILES]);
    assert.deepEqual(result.skipped, []);
    assert.equal(result.registered, false);
    for (const file of BUNDLED_FONT_FILES) {
      assert.ok(fs.existsSync(path.join(target, file)), `missing ${file}`);
    }
  });

  it('skips files that are already present with the same size', t => {
    const target = tempDir(t, 'forge-fonts-');
    installBundledFonts({ targetDir: target, register: false });
    const second = installBundledFonts({ targetDir: target, register: false });

    assert.deepEqual(second.installed, []);
    assert.deepEqual(second.skipped, [...BUNDLED_FONT_FILES]);
  });

  it('fails with an actionable message when the source directory is missing', t => {
    const target = tempDir(t, 'forge-fonts-');
    const missing = path.join(tempDir(t, 'forge-fonts-missing-'), 'nope');

    assert.throws(() => installBundledFonts({ sourceDir: missing, targetDir: target, register: false }), /Reinstall/);
  });

  it('fails when a bundled font file is missing', t => {
    const source = tempDir(t, 'forge-fonts-source-');
    const target = tempDir(t, 'forge-fonts-target-');

    assert.throws(() => installBundledFonts({ sourceDir: source, targetDir: target, register: false }), /missing/);
  });
});

describe('font instructions and report', () => {
  it('names the font family in the platform instructions', () => {
    for (const platform of ['win32', 'darwin', 'linux'] as const) {
      const lines = fontInstallInstructions(platform);
      assert.ok(lines.join('\n').includes(FONT_FAMILY), `missing family for ${platform}`);
    }
  });

  it('mentions the install directory and explains that selection is manual', () => {
    const report = formatFontInstallReport(
      {
        directory: '/tmp/fonts',
        installed: ['JetBrainsMono-Regular.ttf'],
        skipped: [],
        warnings: [],
        registered: false,
      },
      'linux',
    );

    assert.match(report, /\/tmp\/fonts/);
    assert.match(report, /cannot change the terminal font/);
  });
});

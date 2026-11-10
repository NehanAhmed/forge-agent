import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Font family name shipped with Forge. */
export const FONT_FAMILY = 'JetBrains Mono';
export const FONT_LICENSE = 'SIL Open Font License 1.1';

/** Files copied into the user's font directory. */
export const BUNDLED_FONT_FILES = ['JetBrainsMono-Regular.ttf', 'JetBrainsMono-Bold.ttf'] as const;

export interface FontInstallOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  home?: string;
  /** Directory containing the bundled .ttf files. */
  sourceDir?: string;
  /** Override the destination (used by tests and `--dir`). */
  targetDir?: string;
  /** Register the font with the OS. Disabled by tests and `--no-register`. */
  register?: boolean;
}

export interface FontInstallResult {
  directory: string;
  installed: string[];
  skipped: string[];
  warnings: string[];
  registered: boolean;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The package ships the font next to `dist/`, so `dist/core/fonts.js` resolves
 * `<package>/assets/fonts`. In development the same relative path points at the
 * repository's `assets/fonts`.
 */
export function bundledFontsDir(moduleUrl = import.meta.url): string {
  return path.resolve(path.dirname(fileURLToPath(moduleUrl)), '..', '..', 'assets', 'fonts');
}

/** Per-user font directory for the current platform. Never requires admin. */
export function userFontDir(platform = process.platform, env = process.env, home = os.homedir()): string {
  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA?.trim() || path.join(home, 'AppData', 'Local');
    return path.join(localAppData, 'Microsoft', 'Windows', 'Fonts');
  }

  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Fonts');
  }

  const dataHome = env.XDG_DATA_HOME?.trim() || path.join(home, '.local', 'share');
  return path.join(dataHome, 'fonts');
}

/** Human instructions for selecting the installed font in common terminals. */
export function fontInstallInstructions(platform = process.platform, family = FONT_FAMILY): string[] {
  const lines = [`Installed ${family}. Select it once in your terminal profile:`];

  if (platform === 'win32') {
    lines.push(
      `  Windows Terminal: Settings -> Profiles -> Defaults -> Appearance -> Font face -> ${family}`,
      `  VS Code: set "terminal.integrated.fontFamily": "${family}"`,
    );
  } else if (platform === 'darwin') {
    lines.push(
      `  iTerm2: Settings -> Profiles -> Text -> Font -> ${family}`,
      `  Terminal.app: Settings -> Profiles -> Text -> Font -> ${family}`,
      `  VS Code: set "terminal.integrated.fontFamily": "${family}"`,
    );
  } else {
    lines.push(
      `  GNOME Terminal: Preferences -> Profile -> Text -> Custom font -> ${family}`,
      `  Konsole: Edit Current Profile -> Appearance -> Font -> ${family}`,
      `  VS Code: set "terminal.integrated.fontFamily": "${family}"`,
    );
  }

  return lines;
}

function registerWindowsFonts(directory: string): void {
  const key = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts';
  const entries: Array<[string, string]> = [
    [`${FONT_FAMILY} (TrueType)`, path.join(directory, 'JetBrainsMono-Regular.ttf')],
    [`${FONT_FAMILY} Bold (TrueType)`, path.join(directory, 'JetBrainsMono-Bold.ttf')],
  ];

  for (const [valueName, file] of entries) {
    execFileSync('reg', ['add', key, '/v', valueName, '/t', 'REG_SZ', '/d', file, '/f'], { stdio: 'ignore' });
  }
}

function copyFont(source: string, destination: string): 'installed' | 'skipped' {
  const sourceSize = fs.statSync(source).size;
  try {
    if (fs.statSync(destination).size === sourceSize) return 'skipped';
  } catch {
    // Missing destination: copy below.
  }

  fs.copyFileSync(source, destination);
  return 'installed';
}

/**
 * Copy the bundled font files into the user's font directory and optionally
 * register them with the OS. Terminal font selection stays a user setting; see
 * `fontInstallInstructions`.
 */
export function installBundledFonts(options: FontInstallOptions = {}): FontInstallResult {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const home = options.home ?? os.homedir();
  const sourceDir = options.sourceDir ?? bundledFontsDir();
  const directory = options.targetDir ?? userFontDir(platform, env, home);
  const register = options.register ?? true;
  const installed: string[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Bundled font directory is missing: ${sourceDir}. Reinstall @nehanahmed/forge.`);
  }

  for (const file of BUNDLED_FONT_FILES) {
    const source = path.join(sourceDir, file);
    if (!fs.existsSync(source)) {
      throw new Error(`Bundled font file is missing: ${source}. Reinstall @nehanahmed/forge.`);
    }
  }

  fs.mkdirSync(directory, { recursive: true });
  for (const file of BUNDLED_FONT_FILES) {
    const result = copyFont(path.join(sourceDir, file), path.join(directory, file));
    if (result === 'installed') installed.push(file);
    else skipped.push(file);
  }

  let registered = false;
  if (register) {
    if (platform === 'win32') {
      try {
        registerWindowsFonts(directory);
        registered = true;
      } catch (error: unknown) {
        warnings.push(
          `Windows font registration failed: ${errorText(error)}. The files are in ${directory}; install them from Explorer if needed.`,
        );
      }
    } else if (platform === 'linux') {
      try {
        execFileSync('fc-cache', ['-f', directory], { stdio: 'ignore' });
        registered = true;
      } catch {
        warnings.push(
          'fc-cache was not available. Log out and back in, or run "fc-cache -f" to refresh the font cache.',
        );
      }
    } else {
      registered = true;
    }
  }

  return { directory, installed, skipped, warnings, registered };
}

export function formatFontInstallReport(result: FontInstallResult, platform = process.platform): string {
  const lines = [`Forge bundles ${FONT_FAMILY} (${FONT_LICENSE}).`, `Font directory: ${result.directory}`];

  if (result.installed.length > 0) lines.push(`Installed: ${result.installed.join(', ')}`);
  if (result.skipped.length > 0) lines.push(`Already present: ${result.skipped.join(', ')}`);
  if (result.registered) lines.push('The font is registered with the operating system.');
  for (const warning of result.warnings) lines.push(`Warning: ${warning}`);

  lines.push('', ...fontInstallInstructions(platform));
  lines.push(
    '',
    'Forge cannot change the terminal font itself: the font face belongs to the terminal emulator,',
    'and there is no portable ANSI sequence for setting it.',
  );

  return lines.join('\n');
}

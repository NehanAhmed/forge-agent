import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ForgeConfig {
  children: {
    maxDepth: number;
    maxPerTask: number;
    maxPerTree: number;
  };
  ui: {
    bell: boolean;
    logWindow: number;
    renderBatchMs: number;
    ascii: boolean;
    timestamps: boolean;
    showCost: boolean;
    compactLog: boolean;
    alternateScreen: boolean;
  };
}

const DEFAULT_CONFIG: ForgeConfig = {
  children: {
    maxDepth: 2,
    maxPerTask: 4,
    maxPerTree: 10,
  },
  ui: {
    bell: false,
    logWindow: 2000,
    renderBatchMs: 50,
    ascii: false,
    timestamps: true,
    showCost: true,
    compactLog: true,
    alternateScreen: true,
  },
};

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getConfigPath(): string {
  return path.join(os.homedir(), '.forge', 'config.json');
}

export function getConfig(): ForgeConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return {
      children: { ...DEFAULT_CONFIG.children },
      ui: { ...DEFAULT_CONFIG.ui },
    };
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      children: {
        maxDepth: parsed.children?.maxDepth ?? DEFAULT_CONFIG.children.maxDepth,
        maxPerTask: parsed.children?.maxPerTask ?? DEFAULT_CONFIG.children.maxPerTask,
        maxPerTree: parsed.children?.maxPerTree ?? DEFAULT_CONFIG.children.maxPerTree,
      },
      ui: {
        bell: readBoolean(parsed.ui?.bell, DEFAULT_CONFIG.ui.bell),
        logWindow: typeof parsed.ui?.logWindow === 'number' && parsed.ui.logWindow > 0
          ? Math.floor(parsed.ui.logWindow)
          : DEFAULT_CONFIG.ui.logWindow,
        renderBatchMs: typeof parsed.ui?.renderBatchMs === 'number' && parsed.ui.renderBatchMs >= 0
          ? Math.floor(parsed.ui.renderBatchMs)
          : DEFAULT_CONFIG.ui.renderBatchMs,
        ascii: readBoolean(parsed.ui?.ascii, DEFAULT_CONFIG.ui.ascii),
        timestamps: readBoolean(parsed.ui?.timestamps, DEFAULT_CONFIG.ui.timestamps),
        showCost: readBoolean(parsed.ui?.showCost, DEFAULT_CONFIG.ui.showCost),
        compactLog: readBoolean(parsed.ui?.compactLog, DEFAULT_CONFIG.ui.compactLog),
        alternateScreen: readBoolean(parsed.ui?.alternateScreen, DEFAULT_CONFIG.ui.alternateScreen),
      },
    };
  } catch {
    return {
      children: { ...DEFAULT_CONFIG.children },
      ui: { ...DEFAULT_CONFIG.ui },
    };
  }
}

export function updateConfig(patch: Partial<ForgeConfig>): ForgeConfig {
  const current = getConfig();
  const updated: ForgeConfig = {
    children: { ...current.children, ...patch.children },
    ui: { ...current.ui, ...patch.ui },
  };
  const configDir = path.join(os.homedir(), '.forge');
  fs.mkdirSync(configDir, { recursive: true });
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(fs.readFileSync(getConfigPath(), 'utf-8')) as Record<string, unknown>;
  } catch {
    // Keep writing defaults when the file is missing or malformed.
  }
  fs.writeFileSync(
    getConfigPath(),
    JSON.stringify({ ...existing, ...updated }, null, 2),
    { encoding: 'utf-8', mode: 0o600 },
  );
  return updated;
}

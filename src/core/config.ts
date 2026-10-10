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
  },
};

function getConfigPath(): string {
  return path.join(os.homedir(), '.forge', 'config.json');
}

export function getConfig(): ForgeConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
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
        bell: parsed.ui?.bell ?? DEFAULT_CONFIG.ui.bell,
        logWindow: parsed.ui?.logWindow ?? DEFAULT_CONFIG.ui.logWindow,
        renderBatchMs: parsed.ui?.renderBatchMs ?? DEFAULT_CONFIG.ui.renderBatchMs,
      },
    };
  } catch {
    return DEFAULT_CONFIG;
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
  fs.writeFileSync(getConfigPath(), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

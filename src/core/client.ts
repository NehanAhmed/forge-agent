// core/client.ts
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { OpenRouter } from '@openrouter/agent';

// In tests, never read the developer's real .env: the test runner supplies a
// dummy key and an explicit DOTENV_CONFIG_PATH.
if (process.env.FORGE_TEST !== '1') {
  config({ override: true }); // Allow .env to override existing env vars
}

export function resolveApiKey(configPath = path.join(os.homedir(), '.forge', 'config.json')): string | undefined {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;

  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (parsed.apiKey) return parsed.apiKey;
    } catch {
      // ignore malformed config
    }
  }
  return undefined;
}

let _client: OpenRouter | null = null;

export function getClient(): OpenRouter {
  if (_client) return _client;
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error(
      'No OpenRouter API key found.\n' +
        'Set one with: forge config set-key <your-key>\n' +
        'Or set the OPENROUTER_API_KEY environment variable.',
    );
    process.exit(1);
  }
  _client = new OpenRouter({ apiKey });
  return _client;
}

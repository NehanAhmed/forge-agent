// core/client.ts
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { OpenRouter } from '@openrouter/agent';

function resolveApiKey(): string | undefined {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;

  const globalConfigPath = path.join(os.homedir(), '.forge', 'config.json');
  if (fs.existsSync(globalConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));
      if (config.apiKey) return config.apiKey;
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
      'Or set the OPENROUTER_API_KEY environment variable.'
    );
    process.exit(1);
  }
  _client = new OpenRouter({ apiKey });
  return _client;
}
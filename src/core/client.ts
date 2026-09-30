import { OpenRouter } from '@openrouter/agent';
export const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

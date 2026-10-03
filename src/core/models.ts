export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export const CODING_MODELS: ModelInfo[] = [
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra (550B)',
    description: "NVIDIA's largest Nemotron model, best for complex reasoning",
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'Nemotron 3 Super (120B)',
    description: 'Strong coding and reasoning, faster than Ultra',
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron 3.5 Lightning',
    description: 'Optimized for speed, good for quick coding tasks',
  },
  {
    id: 'qwen/qwen3.8-27b:free',
    name: 'Qwen 3.8 27B',
    description: 'Balanced coding and general reasoning (current default)',
  },
];

export const DEFAULT_MODEL_ID = CODING_MODELS[3]?.id ?? CODING_MODELS[0]?.id ?? 'qwen/qwen3.8-27b:free';

export function getModelById(id: string): ModelInfo | undefined {
  return CODING_MODELS.find(m => m.id === id);
}

export function getModelName(id: string): string {
  return getModelById(id)?.name ?? id;
}
/** October 2026 retirement policy. Keep endpoints and response contracts unchanged.
 * https://developers.openai.com/api/docs/deprecations
 * GPT-4o mini supports existing max_tokens/temperature/JSON requests without
 * adding reasoning tokens; bounded PhraseMan prompts fit its 128K context.
 */
export const DEFAULT_TEXT_MODEL = 'gpt-4o-mini' as const;
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2.5-flare' as const;
export const SUPPORTED_IMAGE_MODELS = [DEFAULT_IMAGE_MODEL, 'gpt-image-2.5-sunburst'] as const;
export type SupportedImageModel = typeof SUPPORTED_IMAGE_MODELS[number];

/** Applied when reading old Firestore/env settings; never mutates stored data. */
export function migrateRetiredTextModel(model: string): string {
  return model === 'gpt-4.1-nano' || model === 'gpt-4.1-nano-2025-04-14'
    ? DEFAULT_TEXT_MODEL : model;
}

export function resolveImageModel(model: unknown): SupportedImageModel {
  return SUPPORTED_IMAGE_MODELS.includes(model as SupportedImageModel)
    ? model as SupportedImageModel : DEFAULT_IMAGE_MODEL;
}

/** USD per million tokens, checked against official model pages 2026-10-08. */
export const ACTIVE_TEXT_MODEL_PRICES: Readonly<Record<string, { input: number; output: number }>> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
};

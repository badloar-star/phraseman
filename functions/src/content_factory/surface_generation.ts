import type { CanonicalReleaseSurface } from './course_release_contract';

export type GeneratedSurfaceItem =
  | { readonly id: string; readonly prompt: string; readonly answer: string; readonly options: readonly string[] }
  | { readonly id: string; readonly front: string; readonly back: string };

export interface GeneratedSurfaceArtifact {
  readonly lessonId: number;
  readonly surface: Exclude<CanonicalReleaseSurface, 'lesson'>;
  readonly items: readonly GeneratedSurfaceItem[];
}

export function buildSurfaceGenerationPrompt(input: {
  surface: Exclude<CanonicalReleaseSurface, 'lesson'>;
  studyTarget: string;
  sourceLocale: string;
  lessonId: number;
  topic: string;
  sourcePhrases: readonly string[];
}): string {
  return [
    'You are the Phraseman surface-content generator.',
    `Generate surface=${input.surface} for studyTarget=${input.studyTarget}, sourceLocale=${input.sourceLocale}, lessonId=${input.lessonId}.`,
    `Preserve the English blueprint topic and phrase meaning: ${JSON.stringify({ topic: input.topic, sourcePhrases: input.sourcePhrases })}`,
    'Return JSON only. Do not include markdown, commentary, theory or invented source citations.',
    input.surface === 'flashcard'
      ? `Every front must be written only in studyTarget=${input.studyTarget}; every back must be the exact learner-facing meaning only in sourceLocale=${input.sourceLocale}. Shape: {"lessonId":number,"surface":"flashcard","items":[{"id":string,"front":string,"back":string}]}`
      : `Every prompt must be written only in sourceLocale=${input.sourceLocale}; every answer and every option must be written only in studyTarget=${input.studyTarget}. Shape: {"lessonId":number,"surface":"quiz|arena","items":[{"id":string,"prompt":string,"answer":string,"options":string[]}]}. The answer must occur exactly once in options.${input.surface === 'arena' ? ' Arena requires exactly four unique options per item.' : ' Quiz requires 2-8 unique options per item.'}`,
  ].join('\n');
}

export function parseGeneratedSurfaceArtifact(raw: string): GeneratedSurfaceArtifact {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('generated_surface_invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('generated_surface_invalid');
  const artifact = value as Record<string, unknown>;
  const surface = artifact.surface;
  if ((surface !== 'quiz' && surface !== 'flashcard' && surface !== 'arena') || !Number.isInteger(artifact.lessonId) || Number(artifact.lessonId) < 1 || !Array.isArray(artifact.items) || artifact.items.length === 0) throw new Error('generated_surface_invalid');
  const valid = artifact.items.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || !row.id.trim()) return false;
    if (surface === 'flashcard') return typeof row.front === 'string' && !!row.front.trim() && typeof row.back === 'string' && !!row.back.trim();
    const options = Array.isArray(row.options) ? row.options : [];
    const optionsLengthValid = surface === 'arena' ? options.length === 4 : options.length >= 2 && options.length <= 8;
    return typeof row.prompt === 'string' && !!row.prompt.trim() && typeof row.answer === 'string' && !!row.answer.trim() && optionsLengthValid && options.every((option) => typeof option === 'string' && !!option.trim()) && new Set(options).size === options.length && options.filter((option) => option === row.answer).length === 1;
  });
  if (!valid) throw new Error('generated_surface_invalid');
  return Object.freeze({ lessonId: Number(artifact.lessonId), surface, items: Object.freeze(artifact.items as GeneratedSurfaceItem[]) });
}

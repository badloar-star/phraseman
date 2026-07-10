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
      ? 'Shape: {"lessonId":number,"surface":"flashcard","items":[{"id":string,"front":string,"back":string}]}'
      : 'Shape: {"lessonId":number,"surface":"quiz|arena","items":[{"id":string,"prompt":string,"answer":string,"options":string[]}]}. The answer must be one of options.',
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
    return typeof row.prompt === 'string' && !!row.prompt.trim() && typeof row.answer === 'string' && !!row.answer.trim() && Array.isArray(row.options) && row.options.length >= 2 && row.options.every((option) => typeof option === 'string' && !!option.trim()) && row.options.includes(row.answer);
  });
  if (!valid) throw new Error('generated_surface_invalid');
  return Object.freeze({ lessonId: Number(artifact.lessonId), surface, items: Object.freeze(artifact.items as GeneratedSurfaceItem[]) });
}

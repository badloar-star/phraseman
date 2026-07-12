import type { SourceEvidence } from './publication_contract';

export interface SourceBlueprintLesson {
  readonly lessonId: number;
  readonly topic: string;
  readonly sourcePhrases: readonly string[];
  readonly vocabularyFocus: readonly string[];
  readonly drills: readonly string[];
}

export interface SourceRegistry {
  readonly blueprintId: string;
  readonly blueprintLocale: 'en';
  readonly blueprintHash: string;
  readonly version: string;
  readonly evidence: readonly SourceEvidence[];
  readonly lessons: Readonly<Record<string, SourceBlueprintLesson>>;
}

export type SourceRegistryCoverage = Readonly<
  | { ok: true; code: 'ok'; missingLessonIds: readonly number[] }
  | { ok: false; code: 'source_coverage'; missingLessonIds: readonly number[] }
>;

const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_RE = /^[a-f0-9]{64}$/i;

export function sourceRegistryDocId(blueprintId: string, version: string): string {
  if (!TOKEN_RE.test(blueprintId) || !TOKEN_RE.test(version)) throw new Error('source_registry_id_invalid');
  return `${blueprintId}:${version}`;
}

export function parseSourceRegistryReference(reference: string): { blueprintId: string; version: string } {
  const separator = reference.indexOf(':');
  if (separator <= 0 || separator === reference.length - 1) throw new Error('source_registry_reference_invalid');
  const blueprintId = reference.slice(0, separator);
  const version = reference.slice(separator + 1);
  sourceRegistryDocId(blueprintId, version);
  return Object.freeze({ blueprintId, version });
}

export function inspectSourceRegistryCoverage(registry: SourceRegistry, requestedLessonIds: readonly number[]): SourceRegistryCoverage {
  const missingLessonIds = [...new Set(requestedLessonIds)]
    .filter((lessonId) => !Object.prototype.hasOwnProperty.call(registry.lessons, String(lessonId)))
    .sort((left, right) => left - right);
  return missingLessonIds.length
    ? Object.freeze({ ok: false as const, code: 'source_coverage' as const, missingLessonIds: Object.freeze(missingLessonIds) })
    : Object.freeze({ ok: true as const, code: 'ok' as const, missingLessonIds: Object.freeze([]) });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateSourceRegistry(value: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ['source_registry_required'] };
  if (typeof value.blueprintId !== 'string' || !TOKEN_RE.test(value.blueprintId)) errors.push('blueprint_id_invalid');
  if (value.blueprintLocale !== 'en') errors.push('blueprint_locale_must_be_en');
  if (typeof value.blueprintHash !== 'string' || !HASH_RE.test(value.blueprintHash)) errors.push('blueprint_hash_invalid');
  if (typeof value.version !== 'string' || !TOKEN_RE.test(value.version)) errors.push('version_invalid');
  if (!Array.isArray(value.evidence) || value.evidence.length === 0) errors.push('source_evidence_required');
  else value.evidence.forEach((item) => {
    if (!isRecord(item) || typeof item.evidenceId !== 'string' || !item.evidenceId.trim() || typeof item.authority !== 'string' || !item.authority.trim() || typeof item.url !== 'string' || !item.url.startsWith('https://') || typeof item.claim !== 'string' || !item.claim.trim()) errors.push('source_evidence_invalid');
  });
  if (!isRecord(value.lessons) || Object.keys(value.lessons).length === 0) errors.push('lessons_required');
  else Object.values(value.lessons).forEach((lesson) => {
    if (!isRecord(lesson) || !Number.isInteger(lesson.lessonId) || Number(lesson.lessonId) < 1 || typeof lesson.topic !== 'string' || !lesson.topic.trim() || !Array.isArray(lesson.sourcePhrases) || lesson.sourcePhrases.length === 0 || lesson.sourcePhrases.some((phrase) => typeof phrase !== 'string' || !phrase.trim()) || !Array.isArray(lesson.vocabularyFocus) || !Array.isArray(lesson.drills)) errors.push('lesson_blueprint_invalid');
  });
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

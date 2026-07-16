import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { normalizeArenaCourseIdentity, type ArenaCourseIdentity } from '../arena_course_identity';
import { assertCourseRelease } from './course_release_contract';
import { parseHashedJsonBytes, resolveIndexedCourseUnits } from './release_surface_delivery';
import { courseCatalogId } from '../language_release';

type SurfaceEntry = { readonly lessonId: number; readonly engineResolved?: 'legacy' | 'stage'; readonly payload: unknown };

export interface ReleaseArenaQuestion {
  readonly id: string;
  readonly level: 'A1' | 'A2' | 'B1' | 'B2';
  readonly type: 'translate' | 'fill' | 'choose' | 'audio' | 'complete_phrasal' | 'translate_meaning' | 'fill_blank' | 'find_error' | 'choose_phrasal';
  readonly task?: string;
  readonly question: string;
  readonly options: readonly [string, string, string, string];
  readonly correct: string;
  readonly correctIndex?: number;
  readonly rule: string;
  readonly source: string;
  readonly releaseId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly expectedAnswerTimeMs?: number;
  readonly sourceReferences?: readonly string[];
  readonly rand: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function levelForLesson(lessonId: number): ReleaseArenaQuestion['level'] {
  if (lessonId <= 8) return 'A1';
  if (lessonId <= 16) return 'A2';
  if (lessonId <= 24) return 'B1';
  return 'B2';
}

export function arenaQuestionsFromCourseSurfaceEntries(
  rawIdentity: ArenaCourseIdentity,
  entries: readonly SurfaceEntry[],
): ReleaseArenaQuestion[] {
  const identity = normalizeArenaCourseIdentity(rawIdentity);
  const seenIds = new Set<string>();
  const seenLessons = new Set<number>();
  return entries.flatMap((entry) => {
    if (!Number.isInteger(entry.lessonId) || entry.lessonId < 1 || entry.lessonId > 100 || seenLessons.has(entry.lessonId) || !isRecord(entry.payload) || Number(entry.payload.lessonId) !== entry.lessonId || entry.payload.surface !== 'arena' || !Array.isArray(entry.payload.items) || entry.payload.items.length < 1) throw new Error('arena_release_payload_invalid');
    seenLessons.add(entry.lessonId);
    return entry.payload.items.map((item): ReleaseArenaQuestion => {
      if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim() || !Array.isArray(item.options) || item.options.length !== 4 || item.options.some((option) => typeof option !== 'string' || !option.trim())) throw new Error('arena_release_payload_invalid');
      const sourceId = item.id.trim();
      const options = item.options.map((option) => String(option).trim()) as [string, string, string, string];
      const structured = typeof item.question === 'string' || typeof item.correct === 'string';
      if (entry.engineResolved === 'stage' && !structured) throw new Error('arena_release_engine_payload_mismatch');
      const question = String(structured ? item.question ?? '' : item.prompt ?? '').trim();
      const answer = String(structured ? item.correct ?? '' : item.answer ?? '').trim();
      const correctIndex = structured ? Number(item.correctIndex) : options.indexOf(answer);
      if (!question || !answer || seenIds.has(sourceId) || new Set(options).size !== 4 || options.filter((option) => option === answer).length !== 1 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3 || options[correctIndex] !== answer) throw new Error('arena_release_payload_invalid');
      if (structured && (item.level !== levelForLesson(entry.lessonId) || typeof item.task !== 'string' || !item.task.trim() || typeof item.rule !== 'string' || !item.rule.trim() || !Number.isSafeInteger(item.expectedAnswerTimeMs) || Number(item.expectedAnswerTimeMs) < 2000 || Number(item.expectedAnswerTimeMs) > 12000 || !Array.isArray(item.sourceReferences))) throw new Error('arena_release_payload_invalid');
      const sourceReferences = structured && Array.isArray(item.sourceReferences) ? Object.freeze(item.sourceReferences.map(String)) : undefined;
      seenIds.add(sourceId);
      const id = `cr_${createHash('sha256').update(`${identity.courseReleaseId}:${sourceId}`).digest('hex').slice(0, 40)}`;
      const rand = Number.parseInt(createHash('sha256').update(`${identity.courseReleaseId}:${sourceId}:rand`).digest('hex').slice(0, 12), 16) / 0x1000000000000;
      return Object.freeze({
        id,
        level: levelForLesson(entry.lessonId),
        type: structured ? String(item.type) as ReleaseArenaQuestion['type'] : 'translate',
        ...(structured ? { task: String(item.task).trim() } : {}),
        question,
        options: Object.freeze(options) as unknown as [string, string, string, string],
        correct: answer,
        ...(structured ? { correctIndex } : {}),
        rule: structured ? String(item.rule).trim() : '',
        source: `course_release:${identity.courseReleaseId}`,
        releaseId: identity.courseReleaseId,
        studyTarget: identity.studyTarget,
        learnerSourceLocale: identity.learnerSourceLocale,
        ...(structured ? { expectedAnswerTimeMs: Number(item.expectedAnswerTimeMs), sourceReferences } : {}),
        rand,
      });
    });
  });
}

async function readImmutableJson(path: string, expectedHash: string, expectedGeneration: string): Promise<unknown> {
  const file = admin.storage().bucket().file(path);
  const [metadata] = await file.getMetadata();
  if (String(metadata.generation ?? '') !== expectedGeneration) throw new Error('arena_release_generation_mismatch');
  const [bytes] = await file.download({ validation: false });
  return parseHashedJsonBytes(bytes, expectedHash);
}

async function loadActiveReleaseQuestions(identity: ArenaCourseIdentity): Promise<ReleaseArenaQuestion[]> {
  const db = admin.firestore();
  const [catalogSnap, releaseSnap] = await Promise.all([
    db.collection('content_factory_catalog').doc(courseCatalogId(identity.studyTarget, identity.learnerSourceLocale)).get(),
    db.collection('content_factory_releases').doc(identity.courseReleaseId).get(),
  ]);
  const active = catalogSnap.data()?.activeRelease;
  if (!isRecord(active) || active.releaseId !== identity.courseReleaseId || active.studyTarget !== identity.studyTarget || active.learnerSourceLocale !== identity.learnerSourceLocale || !releaseSnap.exists) throw new Error('arena_release_is_not_active');
  const release = assertCourseRelease(releaseSnap.data());
  if (release.releaseId !== identity.courseReleaseId || release.studyTarget !== identity.studyTarget || release.learnerSourceLocale !== identity.learnerSourceLocale) throw new Error('arena_release_identity_mismatch');
  const artifact = release.artifacts.arena;
  const index = await readImmutableJson(artifact.entryIndex, artifact.contentHash, artifact.objectGeneration);
  const units = resolveIndexedCourseUnits(index, { releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, surface: 'arena' });
  const entries: SurfaceEntry[] = [];
  for (let offset = 0; offset < units.length; offset += 8) {
    entries.push(...await Promise.all(units.slice(offset, offset + 8).map(async (unit) => ({ lessonId: unit.lessonId, engineResolved: unit.engineResolved, payload: await readImmutableJson(unit.objectPath, unit.contentHash, unit.objectGeneration) }))));
  }
  return arenaQuestionsFromCourseSurfaceEntries(identity, entries);
}

function shuffled<T>(values: readonly T[]): T[] {
  const out = [...values];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [out[index], out[swap]] = [out[swap]!, out[index]!];
  }
  return out;
}

export async function pickCanonicalArenaQuestions(
  rawIdentity: ArenaCourseIdentity,
  level: string | null,
  count: number,
  exclude: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  const identity = normalizeArenaCourseIdentity(rawIdentity);
  if (identity.courseReleaseId.startsWith('legacy-') || !Number.isInteger(count) || count < 1 || count > 50) throw new Error('arena_release_request_invalid');
  const all = await loadActiveReleaseQuestions(identity);
  const eligible = all.filter((question) => (!level || question.level === level) && !exclude.has(question.id));
  const selected = shuffled(eligible).slice(0, count);
  if (selected.length < count) throw new Error(`arena_release_insufficient_questions:${selected.length}/${count}`);
  const batch = admin.firestore().batch();
  for (const question of selected) batch.set(admin.firestore().collection('arena_questions').doc(question.id), question);
  await batch.commit();
  return selected.map((question) => question.id);
}

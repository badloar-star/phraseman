import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { normalizeArenaCourseIdentity, type ArenaCourseIdentity } from '../arena_course_identity';
import { assertCourseRelease } from './course_release_contract';
import { parseHashedJsonBytes, resolveIndexedCourseUnits } from './release_surface_delivery';
import { courseCatalogId } from '../language_release';

type SurfaceEntry = { readonly lessonId: number; readonly payload: unknown };

export interface ReleaseArenaQuestion {
  readonly id: string;
  readonly level: 'A1' | 'A2' | 'B1' | 'B2';
  readonly type: 'translate';
  readonly question: string;
  readonly options: readonly [string, string, string, string];
  readonly correct: string;
  readonly rule: string;
  readonly source: string;
  readonly releaseId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
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
      if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim() || typeof item.prompt !== 'string' || !item.prompt.trim() || typeof item.answer !== 'string' || !item.answer.trim() || !Array.isArray(item.options) || item.options.length !== 4 || item.options.some((option) => typeof option !== 'string' || !option.trim())) throw new Error('arena_release_payload_invalid');
      const sourceId = item.id.trim();
      const options = item.options.map((option) => String(option).trim()) as [string, string, string, string];
      const answer = item.answer.trim();
      if (seenIds.has(sourceId) || new Set(options).size !== 4 || options.filter((option) => option === answer).length !== 1) throw new Error('arena_release_payload_invalid');
      seenIds.add(sourceId);
      const id = `cr_${createHash('sha256').update(`${identity.courseReleaseId}:${sourceId}`).digest('hex').slice(0, 40)}`;
      return Object.freeze({
        id,
        level: levelForLesson(entry.lessonId),
        type: 'translate',
        question: item.prompt.trim(),
        options: Object.freeze(options) as unknown as [string, string, string, string],
        correct: answer,
        rule: '',
        source: `course_release:${identity.courseReleaseId}`,
        releaseId: identity.courseReleaseId,
        studyTarget: identity.studyTarget,
        learnerSourceLocale: identity.learnerSourceLocale,
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
    entries.push(...await Promise.all(units.slice(offset, offset + 8).map(async (unit) => ({ lessonId: unit.lessonId, payload: await readImmutableJson(unit.objectPath, unit.contentHash, unit.objectGeneration) }))));
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

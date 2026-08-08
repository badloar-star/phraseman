import { createHash } from 'node:crypto';
import type { LessonCandidate } from './lesson_extractors';

export interface LessonLedgerEntry {
  readonly phraseArtifactId: string;
  readonly candidateKeys: readonly string[];
  readonly fingerprint: string;
  readonly state?: 'approved' | 'stale';
}
export interface LessonLedger { readonly studyTarget: string; readonly revision: number; readonly lessons: Readonly<Record<number, LessonLedgerEntry>> }

export function parseLessonLedger(value: unknown, studyTarget: string): LessonLedger {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return Object.freeze({ studyTarget, revision: 0, lessons: Object.freeze({}) });
  const record = value as Record<string, unknown>;
  if (record.studyTarget !== studyTarget || !Number.isSafeInteger(record.revision) || typeof record.lessons !== 'object' || record.lessons === null || Array.isArray(record.lessons)) throw new Error('lesson_ledger_invalid');
  const lessons: Record<number, LessonLedgerEntry> = {};
  for (const [rawId, rawEntry] of Object.entries(record.lessons as Record<string, unknown>)) {
    const lessonId = Number(rawId); const entry = rawEntry as Record<string, unknown>;
    if (!Number.isSafeInteger(lessonId) || lessonId < 1 || typeof entry !== 'object' || entry === null || typeof entry.phraseArtifactId !== 'string' || !Array.isArray(entry.candidateKeys) || entry.candidateKeys.some((item) => typeof item !== 'string') || typeof entry.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(entry.fingerprint)) throw new Error('lesson_ledger_invalid');
    lessons[lessonId] = Object.freeze({ phraseArtifactId: entry.phraseArtifactId, candidateKeys: Object.freeze(entry.candidateKeys as string[]), fingerprint: entry.fingerprint, state: entry.state === 'stale' ? 'stale' : 'approved' });
  }
  return Object.freeze({ studyTarget, revision: Number(record.revision), lessons: Object.freeze(lessons) });
}

function key(candidate: Pick<LessonCandidate, 'lemma' | 'partOfSpeech'>): string { return `${candidate.partOfSpeech}\u0000${candidate.lemma.normalize('NFKC').toLocaleLowerCase().trim()}`; }
function fingerprint(phraseArtifactId: string, keys: readonly string[]): string { return createHash('sha256').update(JSON.stringify([phraseArtifactId, [...keys].sort()])).digest('hex'); }

export function dedupeLessonCandidates(ledger: LessonLedger, input: { readonly lessonId: number; readonly phraseArtifactId: string; readonly candidates: readonly LessonCandidate[] }) {
  const missingPreviousLessonIds = Array.from({ length: Math.max(0, input.lessonId - 1) }, (_, index) => index + 1).filter((id) => !ledger.lessons[id]);
  if (missingPreviousLessonIds.length) return Object.freeze({ state: 'review_required' as const, missingPreviousLessonIds: Object.freeze(missingPreviousLessonIds), extracted: input.candidates, accepted: Object.freeze([]), excludedPrevious: Object.freeze([]), rejected: Object.freeze([]) });
  const previous = new Map<string, number>();
  for (let id = 1; id < input.lessonId; id += 1) for (const candidateKey of ledger.lessons[id]?.candidateKeys ?? []) if (!previous.has(candidateKey)) previous.set(candidateKey, id);
  const seen = new Set<string>();
  const accepted: LessonCandidate[] = []; const excludedPrevious: Array<LessonCandidate & { previousLessonId: number }> = []; const rejected: LessonCandidate[] = [];
  for (const candidate of input.candidates) {
    const candidateKey = key(candidate);
    if (seen.has(candidateKey)) { rejected.push(candidate); continue; }
    seen.add(candidateKey);
    const previousLessonId = previous.get(candidateKey);
    if (previousLessonId) excludedPrevious.push(Object.freeze({ ...candidate, previousLessonId })); else accepted.push(candidate);
  }
  return Object.freeze({ state: 'ready' as const, missingPreviousLessonIds: Object.freeze([]), extracted: input.candidates, accepted: Object.freeze(accepted), excludedPrevious: Object.freeze(excludedPrevious), rejected: Object.freeze(rejected) });
}

export function approveLessonLedger(ledger: LessonLedger, input: { readonly lessonId: number; readonly phraseArtifactId: string; readonly candidates: readonly LessonCandidate[] }): { ledger: LessonLedger; staleLessonIds: readonly number[] } {
  const receipt = dedupeLessonCandidates(ledger, input);
  if (receipt.state !== 'ready') throw new Error('lesson_ledger_previous_lessons_missing');
  const candidateKeys = Object.freeze(receipt.accepted.map(key).sort());
  const nextFingerprint = fingerprint(input.phraseArtifactId, candidateKeys);
  const previousFingerprint = ledger.lessons[input.lessonId]?.fingerprint;
  const staleLessonIds = previousFingerprint && previousFingerprint !== nextFingerprint ? Object.keys(ledger.lessons).map(Number).filter((id) => id > input.lessonId).sort((a, b) => a - b) : [];
  const lessons: Record<number, LessonLedgerEntry> = { ...ledger.lessons, [input.lessonId]: Object.freeze({ phraseArtifactId: input.phraseArtifactId, candidateKeys, fingerprint: nextFingerprint, state: 'approved' }) };
  for (const id of staleLessonIds) lessons[id] = Object.freeze({ ...lessons[id], state: 'stale' });
  return Object.freeze({ ledger: Object.freeze({ studyTarget: ledger.studyTarget, revision: ledger.revision + 1, lessons: Object.freeze(lessons) }), staleLessonIds: Object.freeze(staleLessonIds) });
}

export function rollbackLessonLedger(ledger: LessonLedger, lessonId: number): LessonLedger {
  const lessons = { ...ledger.lessons }; delete lessons[lessonId];
  for (const id of Object.keys(lessons).map(Number).filter((id) => id > lessonId)) lessons[id] = Object.freeze({ ...lessons[id], state: 'stale' });
  return Object.freeze({ studyTarget: ledger.studyTarget, revision: ledger.revision + 1, lessons: Object.freeze(lessons) });
}

import type { Lang } from '../constants/i18n';
import type { LessonPhrase, LessonTeachingNote } from './lesson_data_types';
import { phraseWordRowsForStudyTarget } from './phrase_target_utils';
import type { StudyTargetLang } from './study_target_lang_dev';

export type ResolvedLessonTeachingNote = {
  id: string;
  title: string;
  body: string;
  tone: 'correct' | 'wrong';
};

export function shouldShowLessonTeachingNote(input: {
  isPlanPhraseRecallTask: boolean;
  isRight: boolean;
}): boolean {
  return !(input.isPlanPhraseRecallTask && input.isRight);
}

type SeenTeachingNoteIds = ReadonlySet<string> | readonly string[] | null | undefined;

export function lessonTeachingNoteSeenStorageKey(
  lessonScopeId: string | number,
  studyTarget: StudyTargetLang,
): string {
  return `lesson_teaching_notes_seen_v1:${studyTarget}:${String(lessonScopeId)}`;
}

export function parseLessonTeachingNoteSeenIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const id = item.trim();
      if (id) seen.add(id);
    }
    return [...seen];
  } catch {
    return [];
  }
}

export function serializeLessonTeachingNoteSeenIds(ids: Iterable<string>): string {
  return JSON.stringify([...new Set([...ids].map((id) => id.trim()).filter(Boolean))]);
}

function hasSeenNote(seenIds: SeenTeachingNoteIds, id: string): boolean {
  if (!seenIds) return false;
  if ('has' in seenIds) return seenIds.has(id);
  return seenIds.includes(id);
}

function pickLang(lang: Lang, ru: string | undefined, uk: string | undefined, es: string | undefined): string {
  if (lang === 'uk') return uk || ru || es || '';
  if (lang === 'es') return es || ru || uk || '';
  return ru || uk || es || '';
}

function renderTeachingNote(
  note: LessonTeachingNote,
  wasWrong: boolean,
  lang: Lang,
): ResolvedLessonTeachingNote {
  return {
    id: note.id,
    title: pickLang(lang, note.titleRu, note.titleUk, note.titleEs)
      || (wasWrong ? 'Разберём спокойно' : 'Почему так работает'),
    body: wasWrong
      ? pickLang(lang, note.wrongRu, note.wrongUk, note.wrongEs)
      : pickLang(lang, note.correctRu, note.correctUk, note.correctEs),
    tone: wasWrong ? 'wrong' : 'correct',
  };
}

function noteAtIndex(
  rows: ReturnType<typeof phraseWordRowsForStudyTarget>,
  index: number,
  wasWrong: boolean,
  seenIds: SeenTeachingNoteIds,
): LessonTeachingNote | null {
  const row = rows[index];
  if (!row) return null;
  if (row.category === 'name') return null;
  const note = row.teachingNote;
  if (!note) return null;
  if (!wasWrong && hasSeenNote(seenIds, note.id)) return null;
  return note;
}

function findNearbyTeachingNote(
  rows: ReturnType<typeof phraseWordRowsForStudyTarget>,
  tokenIndex: number,
  wasWrong: boolean,
  seenIds: SeenTeachingNoteIds,
): LessonTeachingNote | null {
  const current = rows[tokenIndex];
  if (current?.category === 'name') return null;

  const direct = noteAtIndex(rows, tokenIndex, wasWrong, seenIds);
  if (direct) return direct;

  if (!wasWrong) return null;

  for (let i = tokenIndex + 1; i < rows.length; i += 1) {
    const note = noteAtIndex(rows, i, wasWrong, seenIds);
    if (note) return note;
  }
  for (let i = tokenIndex - 1; i >= 0; i -= 1) {
    const note = noteAtIndex(rows, i, wasWrong, seenIds);
    if (note) return note;
  }
  return null;
}

export function resolvePhraseTeachingNote(
  phrase: LessonPhrase | null | undefined,
  studyTarget: StudyTargetLang,
  wasWrong: boolean,
  lang: Lang,
  tokenIndex?: number,
  seenIds?: SeenTeachingNoteIds,
): ResolvedLessonTeachingNote | null {
  const rows = phraseWordRowsForStudyTarget(phrase, studyTarget);
  if (Number.isFinite(tokenIndex)) {
    const note = findNearbyTeachingNote(rows, Math.max(0, Math.floor(tokenIndex ?? 0)), wasWrong, seenIds);
    if (!note) return null;
    const resolved = renderTeachingNote(note, wasWrong, lang);
    return resolved.body.trim() ? resolved : null;
  }

  const note = rows
    .map((row) => row.teachingNote)
    .find((candidate): candidate is LessonTeachingNote => {
      if (!candidate) return false;
      return wasWrong || !hasSeenNote(seenIds, candidate.id);
    });
  if (!note) return null;
  const resolved = renderTeachingNote(note, wasWrong, lang);
  return resolved.body.trim() ? resolved : null;
}

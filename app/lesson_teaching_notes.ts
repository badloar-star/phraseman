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

export function shouldShowLessonTeachingNote(): boolean {
  return true;
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

function pickLang(
  lang: Lang,
  values: {
    ru?: string;
    uk?: string;
    es?: string;
    'pt-BR'?: string;
    vi?: string;
    id?: string;
    tr?: string;
    pl?: string;
  },
): string {
  if (lang === 'uk') return values.uk || values.ru || values.es || '';
  if (lang === 'es') return values.es || values.ru || values.uk || '';
  if (lang === 'pt-BR') return values['pt-BR'] || values.ru || values.uk || values.es || '';
  if (lang === 'vi') return values.vi || values.ru || values.uk || values.es || '';
  if (lang === 'id') return values.id || values.ru || values.uk || values.es || '';
  if (lang === 'tr') return values.tr || values.ru || values.uk || values.es || '';
  if (lang === 'pl') return values.pl || values.ru || values.uk || values.es || '';
  return values.ru || values.uk || values.es || '';
}

function renderTeachingNote(
  note: LessonTeachingNote,
  wasWrong: boolean,
  lang: Lang,
): ResolvedLessonTeachingNote {
  return {
    id: note.id,
    title: pickLang(lang, {
      ru: note.titleRu,
      uk: note.titleUk,
      es: note.titleEs,
      'pt-BR': note.titlePtBr,
      vi: note.titleVi,
      id: note.titleId,
      tr: note.titleTr,
      pl: note.titlePl,
    })
      || (wasWrong ? 'Разберём спокойно' : 'Почему так работает'),
    body: wasWrong
      ? pickLang(lang, {
          ru: note.wrongRu,
          uk: note.wrongUk,
          es: note.wrongEs,
          'pt-BR': note.wrongPtBr,
          vi: note.wrongVi,
          id: note.wrongId,
          tr: note.wrongTr,
          pl: note.wrongPl,
        })
      : pickLang(lang, {
          ru: note.correctRu,
          uk: note.correctUk,
          es: note.correctEs,
          'pt-BR': note.correctPtBr,
          vi: note.correctVi,
          id: note.correctId,
          tr: note.correctTr,
          pl: note.correctPl,
        }),
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

import type { Lang } from '../constants/i18n';
import type { LessonPhrase, LessonWord } from './lesson_data_types';
import type { StudyTargetLang } from './study_target_lang_dev';

const stripMarkers = (word: string): string => {
  const stripped = word
    .replace(/^\/|\/$/g, '')
    .replace(/«-»/g, '')
    .replace(/[«»]/g, '')
    .replace(/[.!?,;]+$/, '')
    .trim();
  return stripped === '-' ? '' : stripped;
};

/** Как в lesson1: убрать маркеры артиклей и пустые токены перед показом. */
export function cleanPhraseForDisplay(surface: string): string {
  return surface.split(' ').map(stripMarkers).filter(w => w.length > 0).join(' ');
}

/** Слоты токенов для режима изучения: ES → `words` (L2), EN → `wordsEn` при двойном наборе. */
export function phraseWordRowsForStudyTarget(
  phrase: LessonPhrase,
  studyTarget: StudyTargetLang,
): LessonWord[] {
  if (studyTarget === 'es') {
    return phrase.words?.length ? phrase.words : [];
  }
  if (phrase.wordsEn?.length) return phrase.wordsEn;
  return phrase.words ?? [];
}

/**
 * Каноническая строка для проверки ответа и SRS: склейка активных слотов (`words` / `wordsEn`).
 */
export function phraseCanonicalAnswer(phrase: LessonPhrase, studyTarget: StudyTargetLang): string {
  const rows = phraseWordRowsForStudyTarget(phrase, studyTarget);
  if (rows.length) {
    return rows
      .map(w => stripMarkers(w.correct ?? w.text))
      .filter(w => w.length > 0)
      .join(' ');
  }
  return cleanPhraseForDisplay(phrase.english);
}

/** Текст цели: английская фраза или испанский перевод (если выбрано изучение ES и spanish заполнен). */
export function phrasePrimarySurface(phrase: LessonPhrase, studyTarget: StudyTargetLang): string {
  if (studyTarget === 'es') {
    const s = phrase.spanish?.trim();
    if (s) return s;
  }
  return phrase.english;
}

export function phraseAnswerAlternatives(
  phrase: LessonPhrase,
  studyTarget: StudyTargetLang,
): string[] | undefined {
  if (studyTarget === 'es') {
    return phrase.alternativesEs;
  }
  return phrase.alternatives;
}

/**
 * Строка «правильного ответа» на экране результата: учитывает целевой язык и пунктуацию-намёк из перевода.
 */
export function phraseAnswerDisplayLine(
  phrase: LessonPhrase,
  studyTarget: StudyTargetLang,
  uiLang: Lang,
): string {
  const useEsSurface = studyTarget === 'es' && !!phrase.spanish?.trim();
  const clean = useEsSurface
    ? cleanPhraseForDisplay(phrasePrimarySurface(phrase, studyTarget))
    : cleanPhraseForDisplay(phrase.english);
  if (/[.?!]$/.test(clean)) return clean;
  const punctSrc =
    studyTarget === 'es'
      ? (phrase.spanish ?? phrase.english)
      : uiLang === 'es'
        ? (phrase.spanish ?? phrase.russian)
        : phrase.russian;
  if (punctSrc?.endsWith('?')) return clean + '?';
  if (punctSrc?.endsWith('!')) return clean + '!';
  if (punctSrc?.endsWith('.')) return clean + '.';
  return clean;
}

export function ttsLocaleForStudyTarget(studyTarget: StudyTargetLang): 'en-US' | 'es-ES' {
  return studyTarget === 'es' ? 'es-ES' : 'en-US';
}

export default function __PhraseTargetUtilsRouteShim() {
  return null;
}

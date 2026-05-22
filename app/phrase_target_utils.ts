import type { Lang } from '../constants/i18n';
import type { LessonPhrase, LessonWord } from './lesson_data_types';
import type { StudyTargetLang } from './study_target_lang_dev';
import { ENABLE_DEV_STUDY_TARGET_LANG } from './config';
import { frenchStudyActive, spanishStudyActive } from './spanish_content_gate';

const PUNCTUATION_SOURCE_BY_LANG: Partial<Record<Lang, 'russian' | 'ukrainian'>> = {
  uk: 'ukrainian',
};

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

/**
 * English line from lesson/active recall storage: spaced chunk markers (` … - … `) collapse to normal prose.
 * Hyphenated compounds (`fir-tree`, `Wi-Fi`) stay intact — только токены, равные «-», отбрасываются как в сборке слов урока.
 */
export function englishRecallSurface(surface: string): string {
  return cleanPhraseForDisplay(surface.replace(/\s+/g, ' ').trim());
}

/** Слоты токенов для режима изучения: ES → `words` (L2), EN → `wordsEn` при двойном наборе. */
export function phraseWordRowsForStudyTarget(
  phrase: LessonPhrase | null | undefined,
  studyTarget: StudyTargetLang,
): LessonWord[] {
  if (!phrase) return [];
  if (ENABLE_DEV_STUDY_TARGET_LANG && studyTarget === 'es') {
    return phrase?.words?.length ? phrase.words : [];
  }
  if (frenchStudyActive(studyTarget)) {
    return phrase?.wordsFr?.length ? phrase.wordsFr : [];
  }
  if (phrase?.wordsEn?.length) return phrase.wordsEn;
  const words = phrase.words;
  return words || [];
}

/**
 * Каноническая строка для проверки ответа и SRS: склейка активных слотов (`words` / `wordsEn`).
 */
export function phraseCanonicalAnswer(phrase: LessonPhrase | null | undefined, studyTarget: StudyTargetLang): string {
  if (!phrase) return '';
  const rows = phraseWordRowsForStudyTarget(phrase, studyTarget);
  if (rows.length) {
    return rows
      .map(w => stripMarkers(w.correct !== undefined && w.correct !== null ? w.correct : w.text))
      .filter(w => w.length > 0)
      .join(' ');
  }
  return cleanPhraseForDisplay(phrase.english);
}

/** Текст цели: английская фраза или испанский перевод (если выбрано изучение ES и spanish заполнен). */
export function phrasePrimarySurface(phrase: LessonPhrase | null | undefined, studyTarget: StudyTargetLang): string {
  if (!phrase) return '';
  if (ENABLE_DEV_STUDY_TARGET_LANG && studyTarget === 'es') {
    const s = phrase.spanish?.trim();
    if (s) return s;
  }
  if (frenchStudyActive(studyTarget)) {
    const s = phrase.french?.trim();
    if (s) return s;
  }
  const rows = phraseWordRowsForStudyTarget(phrase, studyTarget);
  if (rows.length > 0) {
    let s = phraseCanonicalAnswer(phrase, studyTarget);
    const ref = phrase.english.trim();
    if (ref.endsWith('.') && !/[.?!]$/.test(s)) s += '.';
    if (ref.endsWith('?') && !/[.?!]$/.test(s)) s += '?';
    if (ref.endsWith('!') && !/[.?!]$/.test(s)) s += '!';
    return s;
  }
  return phrase.english;
}

export function phraseAnswerAlternatives(
  phrase: LessonPhrase | null | undefined,
  studyTarget: StudyTargetLang,
): string[] | undefined {
  if (!phrase) return undefined;
  if (ENABLE_DEV_STUDY_TARGET_LANG && studyTarget === 'es') {
    return phrase.alternativesEs;
  }
  if (frenchStudyActive(studyTarget)) {
    return phrase.alternativesFr;
  }
  return phrase.alternatives;
}

export function phraseHasStudyTargetContent(phrase: LessonPhrase | null | undefined, studyTarget: StudyTargetLang): boolean {
  if (!phrase) return false;
  if (frenchStudyActive(studyTarget)) {
    return !!phrase?.french?.trim() && !!phrase?.wordsFr?.length;
  }
  if (spanishStudyActive(studyTarget)) {
    return !!phrase?.spanish?.trim() && !!phrase?.words?.length;
  }
  return phraseWordRowsForStudyTarget(phrase, studyTarget).length > 0;
}

/**
 * Строка «правильного ответа» на экране результата: учитывает целевой язык и пунктуацию-намёк из перевода.
 */
export function phraseAnswerDisplayLine(
  phrase: LessonPhrase | null | undefined,
  studyTarget: StudyTargetLang,
  uiLang: Lang,
): string {
  if (!phrase) return '';
  const useEsSurface =
    spanishStudyActive(studyTarget) && !!phrase.spanish?.trim();
  const useFrSurface =
    frenchStudyActive(studyTarget) && !!phrase.french?.trim();
  // Для EN показываем склейку слотов (`words`), как при проверке ответа — иначе при расхождении
  // `english` и слотов пользователь видит одну формулировку, а проверку проходит другая.
  const rawSurface = useEsSurface || useFrSurface
    ? phrasePrimarySurface(phrase, studyTarget)
    : phraseWordRowsForStudyTarget(phrase, studyTarget).length > 0
      ? phraseCanonicalAnswer(phrase, studyTarget)
      : phrase.english;
  if (useFrSurface) return rawSurface.trim();
  const clean = cleanPhraseForDisplay(rawSurface);
  if (/[.?!]$/.test(clean)) return clean;
  let punctSrc: string | undefined;
  if (spanishStudyActive(studyTarget)) {
    punctSrc = phrase.spanish !== undefined && phrase.spanish !== null ? phrase.spanish : phrase.english;
  } else if (frenchStudyActive(studyTarget)) {
    punctSrc = phrase.french !== undefined && phrase.french !== null ? phrase.french : phrase.english;
  } else {
    const punctuationSource = PUNCTUATION_SOURCE_BY_LANG[uiLang] || 'russian';
    punctSrc = punctuationSource === 'ukrainian' && phrase.ukrainian ? phrase.ukrainian : phrase.russian;
  }
  const frenchPunctuationSpace = frenchStudyActive(studyTarget) ? ' ' : '';
  if (punctSrc?.endsWith('?')) return clean + frenchPunctuationSpace + '?';
  if (punctSrc?.endsWith('!')) return clean + frenchPunctuationSpace + '!';
  if (punctSrc?.endsWith('.')) return clean + '.';
  return clean;
}

export function ttsLocaleForStudyTarget(studyTarget: StudyTargetLang): 'en-US' | 'es-ES' | 'fr-FR' {
  const devTargetLocales: Partial<Record<StudyTargetLang, 'es-ES'>> = {
    es: 'es-ES',
  };
  if (ENABLE_DEV_STUDY_TARGET_LANG) {
    const locale = devTargetLocales[studyTarget];
    if (locale) return locale;
  }
  if (frenchStudyActive(studyTarget)) return 'fr-FR';
  return 'en-US';
}

export default function __PhraseTargetUtilsRouteShim() {
  return null;
}

import type { Lang } from '../constants/i18n';
import {
  ENERGY_MESSAGES_ES,
  ENERGY_MESSAGES_RU,
  ENERGY_MESSAGES_UK,
} from './lesson1_energy';
import { spanishLessonUiStringsActive } from './spanish_content_gate';
import type { StudyTargetLang } from './study_target_lang_dev';

/** Тексты подсказок до уроков 20/21 (артикли / some-any): три локали. */
export type GrammarHintTrilingual = { textRu: string; textUk: string; textEs: string };

export function grammarHintLine(
  lang: Lang,
  hint: GrammarHintTrilingual,
  studyTarget: StudyTargetLang = 'en',
): string {
  if (lang === 'uk') return hint.textUk;
  if (spanishLessonUiStringsActive(lang, studyTarget)) return hint.textEs;
  return hint.textRu;
}

/** Случайное сообщение модалки нулевой энергии выбирается из этого массива. */
export function lessonEnergyMessages(
  lang: Lang,
  studyTarget: StudyTargetLang = 'en',
): readonly string[] {
  if (lang === 'uk') return ENERGY_MESSAGES_UK;
  if (spanishLessonUiStringsActive(lang, studyTarget)) return ENERGY_MESSAGES_ES;
  return ENERGY_MESSAGES_RU;
}

// Канонический MAX target для route/call payload. Не используем
// storageStudyTarget: он намеренно схлопывает dev-испанский в English
// namespace. Голосовой урок так делать не имеет права.
import type { RuntimeStudyTarget } from './target_storage_keys';

export type MaxVoiceStudyTarget = 'en' | 'fr' | 'es';

export function maxVoiceStudyTarget(studyTarget?: RuntimeStudyTarget): MaxVoiceStudyTarget {
  if (studyTarget === 'fr') return 'fr';
  if (studyTarget === 'es') return 'es';
  return 'en';
}

/** Compatibility API: все текущие курсы имеют MAX. В UI гейт не используется. */
export function maxVoiceContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return studyTarget === undefined || studyTarget === null || ['en', 'fr', 'es'].includes(studyTarget);
}

export function maxVoiceTeacherAccessibilityLabel(lang: string, studyTarget?: RuntimeStudyTarget): string {
  const target = maxVoiceStudyTarget(studyTarget);
  const labels: Record<MaxVoiceStudyTarget, Record<string, string>> = {
    en: {
      ru: 'МАКС, учитель английского', uk: 'МАКС, учитель англійської', es: 'MAX, profesor de inglés',
      'pt-BR': 'MAX, professor de inglês', vi: 'MAX, giáo viên tiếng Anh', id: 'MAX, guru bahasa Inggris',
      tr: 'MAX, İngilizce öğretmeni', pl: 'MAX, nauczyciel angielskiego',
    },
    fr: {
      ru: 'МАКС, учитель французского', uk: 'МАКС, учитель французької', es: 'MAX, profesor de francés',
      'pt-BR': 'MAX, professor de francês', vi: 'MAX, giáo viên tiếng Pháp', id: 'MAX, guru bahasa Prancis',
      tr: 'MAX, Fransızca öğretmeni', pl: 'MAX, nauczyciel francuskiego',
    },
    es: {
      ru: 'МАКС, учитель испанского', uk: 'МАКС, учитель іспанської', es: 'MAX, profesor de español',
      'pt-BR': 'MAX, professor de espanhol', vi: 'MAX, giáo viên tiếng Tây Ban Nha', id: 'MAX, guru bahasa Spanyol',
      tr: 'MAX, İspanyolca öğretmeni', pl: 'MAX, nauczyciel hiszpańskiego',
    },
  };
  return labels[target][lang] ?? labels[target].en ?? `MAX, ${target} teacher`;
}

/* expo-router: не регистрировать файл как экран */
export default function __MaxTargetGateRouteShim() {
  return null;
}

import { triLang, type Lang } from '../constants/i18n';

export const LESSON_DIALOG_MIN_ID = 1;
export const LESSON_DIALOG_MAX_ID = 32;

export function getLessonDialogScenarioId(lessonId: number): string | undefined {
  if (!Number.isInteger(lessonId) || lessonId < LESSON_DIALOG_MIN_ID || lessonId > LESSON_DIALOG_MAX_ID) {
    return undefined;
  }
  return `lesson${lessonId}_practice_dialog`;
}

export function lessonDialogLockedHint(lang: Lang): string {
  return triLang(lang, {
    ru: 'Диалог откроется, когда ты пройдёшь этот урок на золото.',
    uk: 'Діалог відкриється, коли ти пройдеш цей урок на золото.',
    en: 'The dialogue will unlock once you complete this lesson with gold.',
    es: 'El diálogo se abrirá cuando completes esta lección con oro.',
    'pt-BR': 'O diálogo abre quando você concluir esta lição com ouro.',
    vi: 'Hội thoại sẽ mở khi bạn hoàn thành bài này với huy chương vàng.',
    id: 'Dialog terbuka setelah kamu menyelesaikan pelajaran ini dengan emas.',
    tr: 'Bu dersi altınla tamamladığında diyalog açılır.',
    pl: 'Dialog otworzy się, gdy ukończysz tę lekcję na złoto.',
  });
}

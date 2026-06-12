import { triLang, type Lang } from '../constants/i18n';

const LESSON_DIALOG_SCENARIO_BY_ID: Record<number, string> = {
  18: 'lesson18_restaurant_table',
  20: 'lesson20_lost_bag',
};

export function getLessonDialogScenarioId(lessonId: number): string | undefined {
  return LESSON_DIALOG_SCENARIO_BY_ID[lessonId];
}

export function lessonDialogLockedHint(lang: Lang): string {
  return triLang(lang, {
    ru: 'Пройди урок на золото. Диалог откроется после 50 фраз.',
    uk: 'Пройди урок на золото. Діалог відкриється після 50 фраз.',
    es: 'Completa la lección con oro. El diálogo se abrirá después de 50 frases.',
    'pt-BR': 'Conclua a lição com ouro. O diálogo abre depois de 50 frases.',
    vi: 'Hoàn thành bài với huy chương vàng. Hội thoại mở sau 50 cụm.',
    id: 'Selesaikan pelajaran dengan emas. Dialog terbuka setelah 50 frasa.',
    tr: 'Dersi altınla bitir. Diyalog 50 ifadeden sonra açılır.',
    pl: 'Ukończ lekcję na złoto. Dialog otworzy się po 50 frazach.',
  });
}

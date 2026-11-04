/**
 * зачем (владелец 04.11, «ярлыки на значке: Продолжить урок / Повторить слова / Новая карточка»): чистая конфигурация без
 * нативных вызовов — подписи на 9 языках (docs/work/ux_conveniences_strings_9lang.md, Переводчик) и маршруты в СУЩЕСТВУЮЩИЕ
 * экраны. Классика, не V2 (заморозка V2): «Продолжить» ведёт в меню последнего классического урока, новичку — урок 1.
 * Ни одного чтения Firebase: последний урок берётся из локального ключа.
 */
export const QUICK_ACTION_IDS = ['continue_lesson', 'review_words', 'new_card'] as const;
export type QuickActionId = (typeof QUICK_ACTION_IDS)[number];

type Titles = Readonly<Record<QuickActionId, string>>;

/** Порядок языков: ru, uk, en, es, pt-BR, vi, id, tr, pl. */
export const QUICK_ACTION_TITLES: Readonly<Record<string, Titles>> = Object.freeze({
  ru: { continue_lesson: 'Продолжить урок', review_words: 'Повторить слова', new_card: 'Новая карточка' },
  uk: { continue_lesson: 'Продовжити урок', review_words: 'Повторити слова', new_card: 'Нова картка' },
  en: { continue_lesson: 'Continue lesson', review_words: 'Review words', new_card: 'New card' },
  es: { continue_lesson: 'Seguir la lección', review_words: 'Repasar palabras', new_card: 'Nueva tarjeta' },
  'pt-BR': { continue_lesson: 'Continuar a lição', review_words: 'Revisar palavras', new_card: 'Novo cartão' },
  vi: { continue_lesson: 'Tiếp tục bài học', review_words: 'Ôn từ', new_card: 'Thẻ mới' },
  id: { continue_lesson: 'Lanjut pelajaran', review_words: 'Ulas kata', new_card: 'Kartu baru' },
  tr: { continue_lesson: 'Derse devam et', review_words: 'Kelimeleri tekrarla', new_card: 'Yeni kart' },
  pl: { continue_lesson: 'Kontynuuj lekcję', review_words: 'Powtórz słowa', new_card: 'Nowa karta' },
});

export function quickActionTitles(lang: string): Titles {
  return QUICK_ACTION_TITLES[lang] ?? QUICK_ACTION_TITLES.en;
}

export type QuickActionRoute = Readonly<{ pathname: string; params?: Readonly<Record<string, string>> }>;

/** Маршруты ярлыков — только существующие экраны (сторож tests/quick_actions_config.test.ts проверяет файлы). */
export const QUICK_ACTION_ROUTE_FILES: Readonly<Record<QuickActionId, string>> = Object.freeze({
  continue_lesson: 'lesson_menu',
  review_words: 'flashcards_collection',
  new_card: 'flashcards_card_editor',
});

/** Номер последнего открытого урока из локального ключа; нет/мусор → 1 (новичок = классика, урок 1). */
export function lastLessonIdOrFirst(raw: string | null | undefined): string {
  const n = Number.parseInt(String(raw ?? ''), 10);
  return Number.isInteger(n) && n >= 1 && n <= 32 ? String(n) : '1';
}

export function quickActionRoute(id: QuickActionId, lastLessonRaw: string | null | undefined): QuickActionRoute {
  switch (id) {
    case 'continue_lesson':
      return { pathname: '/lesson_menu', params: { id: lastLessonIdOrFirst(lastLessonRaw) } };
    case 'review_words':
      return { pathname: '/flashcards_collection', params: { cat: 'saved', from: 'quick_action' } };
    case 'new_card':
      return { pathname: '/flashcards_card_editor', params: { create: '1', cat: 'custom' } };
  }
}

export function isQuickActionId(value: unknown): value is QuickActionId {
  return typeof value === 'string' && (QUICK_ACTION_IDS as readonly string[]).includes(value);
}

export type HomeHintAudience = 'all' | 'free' | 'plus';

export type PublishedHomeHint = {
  readonly id: string;
  readonly category: string;
  readonly audience: HomeHintAudience;
  readonly textRu: string;
  readonly textByLocale?: Readonly<Record<string, string>>;
};

export type PublishedHomeHints = {
  readonly schemaVersion: 1;
  readonly version: string;
  readonly items: readonly PublishedHomeHint[];
};

export const DEV_HOME_HINT_FIXTURES: readonly PublishedHomeHint[] = [
  { id: 'dev-results', category: 'results', audience: 'all', textRu: 'Статистика на связи — нажми на карточку результатов.' },
  { id: 'dev-lessons', category: 'lessons', audience: 'all', textRu: 'Урок готов. Английский уже открыл тетрадь.' },
  { id: 'dev-dialogues', category: 'dialogues', audience: 'all', textRu: 'Диалог ждёт первой реплики. Сцена твоя.' },
  { id: 'dev-flashcards', category: 'flashcards', audience: 'all', textRu: 'Карточки приготовили маленький повтор.' },
  { id: 'dev-energy', category: 'energy', audience: 'all', textRu: 'Проверь энергию перед новой тренировкой.' },
  { id: 'dev-video', category: 'video', audience: 'all', textRu: 'Видео зовёт на короткий английский просмотр.' },
  { id: 'dev-plus', category: 'plus', audience: 'plus', textRu: 'Загляни в Plus и изучи его возможности.' },
  { id: 'dev-league', category: 'league', audience: 'all', textRu: 'Лига ждёт проверки текущей цели.' },
  { id: 'dev-referrals', category: 'referrals', audience: 'all', textRu: 'Возможно, пора позвать языкового союзника.' },
  { id: 'dev-arena', category: 'arena', audience: 'all', textRu: 'Арена готова к маленькому матчу.' },
  { id: 'dev-settings', category: 'settings', audience: 'all', textRu: 'Шестерёнка приготовила настройки.' },
  { id: 'dev-learning', category: 'learning', audience: 'all', textRu: 'Одна фраза сегодня — уже хороший шаг.' },
];

export function pickRandomHomeHint<T extends PublishedHomeHint>(
  items: readonly T[],
  random: () => number = Math.random,
): T | null {
  if (items.length === 0) return null;
  const value = Number(random());
  const bounded = Number.isFinite(value) ? Math.min(0.999999, Math.max(0, value)) : 0;
  return items[Math.floor(bounded * items.length)] ?? items[0] ?? null;
}

export function resolveHomeHintText(
  hint: PublishedHomeHint,
  locale: string,
  localizedFallback: string,
): string {
  if (locale === 'ru' && hint.textRu.trim()) return hint.textRu.trim();
  const translated = hint.textByLocale?.[locale]?.trim();
  return translated || localizedFallback;
}

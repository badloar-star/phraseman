export const HOME_HINT_CATEGORIES = [
  'results', 'lessons', 'dialogues', 'flashcards', 'energy', 'video', 'plus', 'league',
  'referrals', 'arena', 'settings', 'streak', 'daily', 'learning', 'home',
] as const;

export type HomeHintCategory = typeof HOME_HINT_CATEGORIES[number];
export type HomeHintAudience = 'all' | 'free' | 'plus';
export type HomeHintFactStatus = 'verified' | 'needs_owner_confirmation' | 'copy_only';
export type HomeHintDraftStatus = 'draft' | 'approved' | 'published' | 'paused';

export type HomeHintDraft = {
  readonly id: string;
  readonly category: HomeHintCategory;
  readonly variantsRu: readonly [string, string, string];
  readonly audience: HomeHintAudience;
  readonly factStatus: HomeHintFactStatus;
  readonly factSource?: string;
  readonly ownerNote?: string;
  readonly status: HomeHintDraftStatus;
  readonly updatedAtMs: number;
};

const TOPICS: Record<HomeHintCategory, readonly string[]> = {
  results: [
    'твои результаты', 'время занятий', 'сегодняшняя практика', 'недельный прогресс', 'уроки за неделю',
    'практика за неделю', 'карточки за неделю', 'точность ответов', 'дни активности', 'история занятий',
    'серия дней', 'итог сегодняшнего дня', 'маленькие победы', 'разбор ошибок', 'любимый режим',
    'самый продуктивный день', 'ритм занятий', 'твой учебный след', 'график недели', 'экран результатов',
  ],
  lessons: [
    'уроки', 'следующий урок', 'теория урока', 'слова урока', 'неправильные формы', 'повтор урока',
    'продолжение урока', 'первый урок дня', 'короткий урок', 'урок после паузы', 'новая тема', 'знакомая тема',
    'разминка перед уроком', 'финал урока', 'список уроков', 'урок с нуля', 'урок на пять минут',
    'урок для разгона', 'урок без спешки', 'меню уроков',
  ],
  dialogues: [
    'диалоги', 'следующий сценарий', 'брифинг диалога', 'реплика героя', 'первая сцена', 'вторая попытка',
    'разговорная практика', 'короткий диалог', 'сценарий дня', 'новая ситуация', 'знакомая ситуация',
    'ответ в диалоге', 'голосовая реплика', 'разбор диалога', 'меню диалогов', 'диалог после урока',
    'пауза в разговоре', 'минута с героем', 'тренировка ответа', 'экран диалогов',
  ],
  flashcards: [
    'карточки', 'набор карточек', 'сохранённая фраза', 'новое слово', 'повтор карточек', 'режим карточек',
    'карточка дня', 'колода для повтора', 'слова из урока', 'фраза из практики', 'тренировка карточек',
    'карточки после ошибки', 'список сохранённого', 'быстрый повтор', 'сложная карточка', 'знакомая карточка',
    'первая карточка', 'последняя карточка', 'экран карточек', 'маленькая колода',
  ],
  energy: [
    'энергия', 'индикатор энергии', 'жемчужины', 'пополнение энергии', 'лимит энергии', 'экран энергии',
    'следующая тренировка', 'пауза между сессиями', 'энергия перед уроком', 'энергия перед практикой',
    'баланс жемчужин', 'кошелёк жемчужин', 'расход энергии', 'восстановление энергии', 'энергия на сегодня',
    'маленькая пауза', 'кнопка энергии', 'практика с запасом', 'заряд перед стартом', 'энергетический план',
  ],
  video: [
    'видео', 'кнопка видео', 'новый ролик', 'фраза из видео', 'короткий просмотр', 'видео на сегодня',
    'экран видео', 'каталог видео', 'плейлист', 'следующий выпуск', 'повтор ролика', 'субтитры ролика',
    'пауза в видео', 'любимый выпуск', 'минутка просмотра', 'видеофраза', 'просмотр после урока',
    'ролик для разогрева', 'видео в шапке', 'видеокаталог',
  ],
  plus: [
    'Plus', 'экран Plus', 'планы Plus', 'сравнение тарифов', 'условия Plus', 'возможности Plus',
    'подписка Plus', 'месячный план', 'годовой план', 'плюсы подписки', 'страница оплаты', 'экран преимуществ',
    'доступные режимы', 'проверка тарифа', 'вопрос о Plus', 'пауза перед покупкой', 'решение без спешки',
    'карточка Plus', 'раздел подписки', 'меню Plus',
  ],
  league: [
    'лига', 'клуб недели', 'цель лиги', 'место в таблице', 'очки недели', 'следующий соперник',
    'экран клуба', 'недельный итог', 'лиговая карточка', 'путь вверх', 'текущая группа', 'позиция недели',
    'активность клуба', 'таблица очков', 'начало недели', 'конец недели', 'лиговая цель', 'твой клуб',
    'новая неделя', 'раздел лиги',
  ],
  referrals: [
    'рефералы', 'приглашение друга', 'твоя ссылка', 'экран приглашений', 'статус приглашения', 'реферальная программа',
    'друг в приложении', 'сообщение другу', 'копирование ссылки', 'приглашение без спешки', 'список приглашений',
    'раздел рефералов', 'новый приглашённый', 'шаг приглашения', 'карточка реферала', 'проверка статуса',
    'пригласительный экран', 'дружеский бонус', 'кнопка приглашения', 'меню рефералов',
  ],
  arena: [
    'арена', 'быстрый матч', 'режим арены', 'экран арены', 'поиск соперника', 'карточка матча',
    'ход на арене', 'результат матча', 'повтор матча', 'режим без рейтинга', 'режим с рангом', 'аренный профиль',
    'ежедневная попытка', 'задание матча', 'таблица арены', 'старт матча', 'пауза матча', 'итог арены',
    'лаборатория арены', 'меню арены',
  ],
  settings: [
    'настройки', 'язык приложения', 'скорость голоса', 'озвучка', 'доступность', 'профиль', 'тема приложения',
    'уведомления', 'обратная связь', 'идея для приложения', 'экран настроек', 'раздел помощи', 'свой ник',
    'настройки голоса', 'настройки обучения', 'параметры профиля', 'меню настроек', 'спокойный режим',
    'настройка экрана', 'кнопка идеи',
  ],
  streak: [
    'серия', 'день подряд', 'огонёк серии', 'новый день', 'продолжение серии', 'страница серии',
    'недельная цепочка', 'история серии', 'активный день', 'серия после паузы', 'маленький ритуал', 'старт серии',
    'итог серии', 'экран цепочки', 'твой учебный ритм', 'соседний день', 'прошлая неделя', 'новая отметка',
    'серия практики', 'раздел серии',
  ],
  daily: [
    'задача дня', 'фокус дня', 'быстрый старт', 'первая практика', 'маленькая цель', 'сегодняшний шаг',
    'пять минут английского', 'разминка дня', 'слово дня', 'фраза дня', 'повтор дня', 'урок дня',
    'диалог дня', 'карточка дня', 'вечерний повтор', 'утренний старт', 'план на сегодня', 'проверка дня',
    'спокойный финал', 'домашний экран',
  ],
  learning: [
    'повторение', 'короткая сессия', 'ошибка как подсказка', 'пауза между повторами', 'пример в контексте',
    'новая фраза', 'знакомое слово', 'слово в предложении', 'голосовой пример', 'медленный темп', 'быстрый темп',
    'активное вспоминание', 'смешанная тренировка', 'смена режима', 'одна трудная фраза', 'маленький прогресс',
    'возврат к теме', 'повтор перед сном', 'практика без идеала', 'следующая попытка',
  ],
  home: [
    'главная', 'быстрый старт', 'нижняя навигация', 'карточка результатов', 'плитка уроков', 'плитка диалогов',
    'плитка карточек', 'профиль', 'колокольчик', 'кнопка видео', 'баланс жемчужин', 'счётчик энергии',
    'уровень', 'перо серии', 'домашняя цель', 'экран сегодня', 'верхняя панель', 'меню разделов',
    'новая подсказка', 'маленький вход',
  ],
};

const AUDIENCE_BY_CATEGORY: Partial<Record<HomeHintCategory, HomeHintAudience>> = {
  plus: 'plus',
};

const OWNER_CONFIRMATION_TOPICS = new Set([
  'пополнение энергии',
  'восстановление энергии',
  'месячный план',
  'дружеский бонус',
  'режим с рангом',
  'путь вверх',
]);

const VARIANT_BUILDERS: readonly ((topic: string) => string)[] = [
  (topic) => `Загляни в «${topic}» — там может спрятаться твой следующий маленький успех.`,
  (topic) => `«${topic}» ждёт короткого визита. Английский не кусается, обещаем.`,
  (topic) => `Мини-миссия дня: открыть «${topic}» и посмотреть, что там происходит.`,
];

const SOURCE_BY_CATEGORY: Partial<Record<HomeHintCategory, string>> = {
  results: 'app/(tabs)/home.tsx',
  lessons: 'app/lesson_menu.tsx',
  dialogues: 'components/DialogsTabContent.tsx',
  flashcards: 'app/flashcards/FlashcardsHubScreen.tsx',
  energy: 'components/EnergyBar.tsx',
  video: 'components/home/HomeYoutubeFeatureCard.tsx',
  plus: 'app/premium_context.ts',
  league: 'app/club_screen.tsx',
  referrals: 'functions/src/referral.ts',
  arena: 'modules/arena/duel_plan.ts',
  settings: 'app/(tabs)/settings.tsx',
  streak: 'constants/streak_stats_i18n.ts',
  daily: 'app/(tabs)/home.tsx',
  learning: 'docs/learning/LEARNING_SCIENCE.md',
  home: 'app/(tabs)/home.tsx',
};

const buildDraft = (category: HomeHintCategory, topic: string, index: number): HomeHintDraft => {
  const factStatus: HomeHintFactStatus = OWNER_CONFIRMATION_TOPICS.has(topic)
    ? 'needs_owner_confirmation'
    : 'copy_only';
  return Object.freeze({
    id: `home_hint_${category}_${String(index + 1).padStart(2, '0')}`,
    category,
    variantsRu: Object.freeze(VARIANT_BUILDERS.map((build) => build(topic)) as [string, string, string]),
    audience: AUDIENCE_BY_CATEGORY[category] ?? 'all',
    factStatus,
    factSource: SOURCE_BY_CATEGORY[category],
    ...(factStatus === 'needs_owner_confirmation' ? { ownerNote: 'Проверить точную механику перед публикацией.' } : {}),
    status: 'draft',
    updatedAtMs: 0,
  });
};

export const HOME_HINT_CATALOG: readonly HomeHintDraft[] = Object.freeze(
  HOME_HINT_CATEGORIES.flatMap((category) => TOPICS[category].map((topic, index) => buildDraft(category, topic, index))),
);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function validateHomeHintDraft(value: unknown): { ok: true } | { ok: false; reason: string } {
  if (!isRecord(value)) return { ok: false, reason: 'draft must be an object' };
  if (typeof value.id !== 'string' || !/^home_hint_[a-z]+_\d{2}$/.test(value.id)) return { ok: false, reason: 'invalid id' };
  if (!HOME_HINT_CATEGORIES.includes(value.category as HomeHintCategory)) return { ok: false, reason: 'invalid category' };
  if (!Array.isArray(value.variantsRu) || value.variantsRu.length !== 3 || value.variantsRu.some((text) => typeof text !== 'string' || text.trim().length === 0 || text.length > 180)) {
    return { ok: false, reason: 'variantsRu must contain three short strings' };
  }
  if (!['all', 'free', 'plus'].includes(String(value.audience))) return { ok: false, reason: 'invalid audience' };
  if (!['verified', 'needs_owner_confirmation', 'copy_only'].includes(String(value.factStatus))) return { ok: false, reason: 'invalid fact status' };
  if (value.factStatus === 'verified' && typeof value.factSource !== 'string') return { ok: false, reason: 'verified draft needs a source' };
  if (!['draft', 'approved', 'published', 'paused'].includes(String(value.status))) return { ok: false, reason: 'invalid status' };
  return { ok: true };
}

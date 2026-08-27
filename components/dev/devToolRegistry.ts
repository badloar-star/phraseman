export type DevToolAction =
  | 'run-onboarding'
  | 'open-max-voice'
  | 'open-motion-showcase'
  | 'open-learning-v2-modes-showcase'
  | 'open-learning-v2-authoring-preview'
  | 'open-shop'
  | 'open-paywall-a'
  | 'open-paywall-b'
  | 'open-paywall-c'
  | 'open-paywall-d'
  | 'open-paywall-e'
  | 'open-paywall-f'
  | 'open-paywall-g'
  | 'open-paywall-onboarding'
  | 'open-max-paywall'
  | 'preview-level-standard'
  | 'preview-level-milestone'
  | 'preview-lesson-results'
  | 'preview-spin-reward'
  | 'preview-welcome-gift'
  | 'preview-league-promoted'
  | 'preview-league-demoted'
  | 'preview-league-stay'
  | 'preview-league-rank-mismatch'
  | 'grant-plus'
  | 'revoke-plus'
  // Отписка: витрина сценариев удержания при отмене подписки (владелец, 24.08).
  | 'open-cancel-flow'
  | 'open-manage-subscription'
  // зачем (владелец, 2026-08-27): «Проверка рун» — отдельный НОВЫЙ раздел (не
  // внутри «Движение · все поверхности»). Каждая кнопка открывает НАСТОЯЩИЙ
  // экран из соответствующего раздела приложения со случайным стартовым
  // числом рун/XP/счёта — быстрая визуальная проверка без прохождения сессии.
  | 'open-dev-runes-lesson'
  | 'open-dev-runes-vocabulary'
  | 'open-dev-runes-irregular-verbs'
  | 'open-dev-runes-blitz'
  | 'open-dev-runes-flashcards-training'
  | 'open-dev-runes-mistake-practice'
  | 'open-dev-runes-speaking';

export type DevToolIcon =
  | 'call-outline'
  | 'flash-outline'
  | 'sparkles-outline'
  | 'trophy-outline'
  | 'sync-outline'
  | 'hourglass-outline'
  | 'analytics-outline'
  | 'map-outline'
  | 'add-circle-outline'
  | 'remove-circle-outline'
  | 'trending-up-outline'
  | 'trending-down-outline'
  | 'shield-checkmark-outline'
  | 'bug-outline'
  | 'rocket-outline'
  | 'color-wand-outline'
  | 'card-outline'
  | 'cart-outline'
  | 'exit-outline'
  | 'list-outline'
  | 'school-outline'
  | 'gift-outline'
  | 'diamond-outline';

export type DevTool = Readonly<{
  id: string;
  order: number;
  title: string;
  detail: string;
  actionLabel: string;
  action: DevToolAction;
  icon: DevToolIcon;
  testID: string;
  tone?: 'default' | 'danger';
}>;

export type DevToolSection = Readonly<{
  id: string;
  order: number;
  title: string;
  icon: 'call-outline' | 'sparkles-outline' | 'key-outline' | 'trophy-outline' | 'rocket-outline' | 'card-outline' | 'cart-outline' | 'school-outline' | 'diamond-outline';
  testID: string;
  /**
   * Секция свёрнута при открытии хаба.
   * зачем (владелец, 24.08): девять пейволов развёрнутым списком оттесняли всё
   * остальное вниз — до нужного инструмента приходилось листать. Заголовок
   * секции становится кнопкой, содержимое раскрывается по тапу.
   */
  collapsed?: boolean;
  tools: readonly DevTool[];
}>;

export const DEV_TOOL_SECTIONS = [
  // зачем 16.08.2026: владелец не нашёл кнопку запуска онбординга, когда она
  // стояла внизу списка. Секция объявлена ПЕРВОЙ в массиве и с минимальным
  // order — так её видно сразу, а локальные секции остаются ниже без правок.
  {
    id: 'onboarding-tools',
    order: 1,
    title: 'Онбординг',
    icon: 'rocket-outline',
    testID: 'dev-section-onboarding',
    tools: [
      {
        id: 'onboarding-run',
        order: 10,
        title: 'Пройти онбординг',
        detail: 'Боевой флоу с первого экрана: ключи прохождения сбрасываются, профиль и прогресс не трогаются.',
        actionLabel: 'Запустить',
        action: 'run-onboarding',
        icon: 'rocket-outline',
        testID: 'dev-onboarding-run',
      },
    ],
  },
  // зачем 16.08.2026: старая Motion Lab (бутафорные сцены) удалена по решению
  // владельца; витрина открывает РЕАЛЬНЫЕ экраны/модалки/тосты по подразделам.
  {
    id: 'motion-showcase',
    order: 2,
    title: 'Движение · все поверхности',
    icon: 'sparkles-outline',
    testID: 'dev-hub-section-motion-showcase',
    tools: [
      {
        id: 'motion-showcase',
        order: 10,
        title: 'Витрина движения',
        detail: 'Все модалки, тосты и экраны по подразделам. Каждый пункт запускает настоящую поверхность приложения.',
        actionLabel: 'Открыть',
        action: 'open-motion-showcase',
        icon: 'color-wand-outline',
        testID: 'dev-open-motion-showcase',
      },
    ],
  },
  // зачем (владелец, 25.08): ОТДЕЛЬНЫЙ подраздел от «Движение · все
  // поверхности» — 7 одобренных режимов Learning V2 (docs/v2/mockups/
  // index.html), каждый открывается ПОЛНОЭКРАННЫМ пробным мини-уроком.
  {
    id: 'learning-v2-modes-showcase',
    order: 3,
    title: 'Learning V2 · 7 режимов',
    icon: 'school-outline',
    testID: 'dev-hub-section-learning-v2-modes-showcase',
    tools: [
      {
        id: 'learning-v2-modes-showcase',
        order: 10,
        title: 'Пробный мини-урок · 7 режимов',
        detail: 'Каждый режим — полноэкранный работающий экран с той же анимацией смены задания, что в боевом уроке.',
        actionLabel: 'Открыть',
        action: 'open-learning-v2-modes-showcase',
        icon: 'school-outline',
        testID: 'dev-open-learning-v2-modes-showcase',
      },
    ],
  },
  {
    id: 'learning-v2-authoring-preview',
    order: 4,
    title: 'Learning V2 · проверка сессий',
    icon: 'school-outline',
    testID: 'dev-hub-section-learning-v2-authoring-preview',
    tools: [
      {
        id: 'learning-v2-authoring-preview',
        order: 10,
        title: 'Сессии на телефоне',
        detail: 'Реальный текущий черновик из source-пакета. Прогресс, энергия и звёзды не записываются.',
        actionLabel: 'Проверить',
        action: 'open-learning-v2-authoring-preview',
        icon: 'school-outline',
        testID: 'dev-open-learning-v2-authoring-preview',
      },
    ],
  },
  {
    id: 'full-modes',
    order: 5,
    title: 'Режимы · полный запуск',
    icon: 'call-outline',
    testID: 'dev-hub-section-full-modes',
    tools: [
      {
        id: 'max-voice',
        order: 10,
        title: 'MAX Voice',
        detail: 'Полный путь: подготовка, живой WebRTC-звонок и разбор разговора.',
        actionLabel: 'Открыть',
        action: 'open-max-voice',
        icon: 'call-outline',
        testID: 'dev-open-max-voice',
      },
    ],
  },
  // зачем 2026-08-24: кнопки paywall_a...g уже жили в «Витрине движения», но
  // там их отфильтровывает isExecutableHybridItem (только пункты с "hybrid" в
  // id реально доходят до экрана) — владелец не мог их открыть. Отдельная
  // секция прямо в DEV-центре, без похода в витрину и без завязки на фильтр.
  {
    id: 'paywalls',
    order: 6,
    title: 'Пейволы',
    icon: 'card-outline',
    testID: 'dev-hub-section-paywalls',
    collapsed: true,
    tools: [
      {
        id: 'paywall-a',
        order: 10,
        title: 'Пейвол A · Компакт',
        detail: 'Полноценный экран покупки, без скролла. Реальные цены из стора.',
        actionLabel: 'Открыть',
        action: 'open-paywall-a',
        icon: 'card-outline',
        testID: 'dev-open-paywall-a',
      },
      {
        id: 'paywall-b',
        order: 20,
        title: 'Пейвол B',
        detail: 'Полноценный экран покупки. Реальные цены из стора.',
        actionLabel: 'Открыть',
        action: 'open-paywall-b',
        icon: 'card-outline',
        testID: 'dev-open-paywall-b',
      },
      {
        id: 'paywall-c',
        order: 30,
        title: 'Пейвол C',
        detail: 'Полноценный экран покупки, с галереей доказательств. Реальные цены из стора.',
        actionLabel: 'Открыть',
        action: 'open-paywall-c',
        icon: 'card-outline',
        testID: 'dev-open-paywall-c',
      },
      {
        id: 'paywall-d',
        order: 40,
        title: 'Пейвол D · Плитки',
        detail: 'Тарифы плитками в ряд. Реальные цены из стора.',
        actionLabel: 'Открыть',
        action: 'open-paywall-d',
        icon: 'card-outline',
        testID: 'dev-open-paywall-d',
      },
      {
        id: 'paywall-e',
        order: 50,
        title: 'Пейвол E · Один план',
        detail: 'Один доминирующий оффер, остальные планы скрыты за «Другие варианты».',
        actionLabel: 'Открыть',
        action: 'open-paywall-e',
        icon: 'card-outline',
        testID: 'dev-open-paywall-e',
      },
      {
        id: 'paywall-f',
        order: 60,
        title: 'Пейвол F',
        detail: 'Полноценный экран покупки. Реальные цены из стора.',
        actionLabel: 'Открыть',
        action: 'open-paywall-f',
        icon: 'card-outline',
        testID: 'dev-open-paywall-f',
      },
      {
        id: 'paywall-g',
        order: 70,
        title: 'Пейвол G · С приманкой',
        detail: 'С якорем «6 месяцев» между Годом и Месяцем.',
        actionLabel: 'Открыть',
        action: 'open-paywall-g',
        icon: 'card-outline',
        testID: 'dev-open-paywall-g',
      },
      {
        id: 'paywall-onboarding',
        order: 80,
        title: 'Пейвол · вариант с онбординга',
        detail: 'Тот же экран (текущий A/B-вариант), что видит новичок в конце онбординга: source=onboarding_plan, полноэкранный без слайда, Pro и MAX скрыты.',
        actionLabel: 'Открыть',
        action: 'open-paywall-onboarding',
        icon: 'rocket-outline',
        testID: 'dev-open-paywall-onboarding',
      },
      {
        id: 'paywall-max',
        order: 90,
        title: 'Пейвол MAX',
        detail: 'Тариф MAX: 120 минут звонков с ИИ-учителем в месяц. Реальная цена из стора.',
        actionLabel: 'Открыть',
        action: 'open-max-paywall',
        icon: 'call-outline',
        testID: 'dev-open-paywall-max',
      },
    ],
  },
  // зачем 2026-08-24: магазин пока БЕЗ входа из приложения — владелец не хочет
  // показывать его игрокам до готовности. Единственная дверь — этот пункт;
  // когда экран примут, вход появится в обычной навигации, а секция уйдёт.
  {
    id: 'shop',
    order: 7,
    title: 'Магазин · вход только отсюда',
    icon: 'cart-outline',
    testID: 'dev-hub-section-shop',
    tools: [
      {
        id: 'shop-screen',
        order: 10,
        title: 'Магазин',
        detail: 'Временно: другого входа в магазин в приложении нет. Две валюты, товары по 3 в ряд, фильтр снизу.',
        actionLabel: 'Открыть',
        action: 'open-shop',
        icon: 'cart-outline',
        testID: 'dev-open-shop',
      },
    ],
  },
  {
    id: 'level-previews',
    order: 10,
    title: 'Повышение уровня',
    icon: 'sparkles-outline',
    testID: 'dev-hub-section-previews',
    tools: [
      {
        id: 'level-standard',
        order: 10,
        title: 'Обычное повышение',
        detail: 'Быстрый вариант со спином. Прогресс не изменится.',
        actionLabel: 'Показать',
        action: 'preview-level-standard',
        icon: 'flash-outline',
        testID: 'dev-preview-level-up-standard',
      },
      {
        id: 'level-milestone',
        order: 20,
        title: 'Каждый 5-й уровень',
        detail: 'Более заметная анимация и спин без начисления награды.',
        actionLabel: 'Показать',
        action: 'preview-level-milestone',
        icon: 'sparkles-outline',
        testID: 'dev-preview-level-up-milestone',
      },
      {
        id: 'lesson-results',
        order: 30,
        title: 'Результат урока',
        detail: 'Учебный пример наград без сохранения прогресса.',
        actionLabel: 'Показать',
        action: 'preview-lesson-results',
        icon: 'trophy-outline',
        testID: 'dev-preview-lesson-results',
      },
      {
        id: 'spin-reward',
        order: 40,
        title: '+1 Спин',
        detail: 'Показывает только overlay-анимацию получения Спина поверх текущего окна.',
        actionLabel: 'Показать',
        action: 'preview-spin-reward',
        icon: 'sync-outline',
        testID: 'dev-preview-spin-reward',
      },
      // зачем (владелец, 2026-08-26): «добавь кнопку в DEV Hub чтобы проверить
      // модал» — приветственная церемония начисляет ОДИН раз на аккаунт
      // навсегда (жёсткая идемпотентность), поэтому кнопка ни разу не зовёт
      // beginWelcomeGiftGrant — только монтирует WelcomeGiftModal саму по себе.
      // Компонент не начисляет ничего сам (см. components/WelcomeGiftModal.tsx)
      // — начисление живёт снаружи, в OnboardingWelcomeHost, сюда не подключено.
      {
        id: 'welcome-gift',
        order: 50,
        title: 'Приветствие + бонус новичку',
        detail: 'Только анимация и текст. Жемчужины и руны НЕ начисляются — реальная выдача живёт отдельно и одноразова.',
        actionLabel: 'Показать',
        action: 'preview-welcome-gift',
        icon: 'gift-outline',
        testID: 'dev-preview-welcome-gift',
      },
    ],
  },
  // зачем 13.08.2026: настоящие итоги недели показываются только в понедельник
  // после ролловера — проверить три исхода на живом устройстве было нечем.
  // Здесь модалка открывается с синтетическим результатом: прогресс, лига и
  // сохранённый pending не меняются.
  {
    id: 'league',
    order: 25,
    title: 'Лига · итоги недели',
    icon: 'trophy-outline',
    testID: 'dev-hub-section-league',
    tools: [
      {
        id: 'league-promoted',
        order: 10,
        title: 'Повышение',
        detail: 'Зелёный исход: место в зоне повышения, переход в лигу выше.',
        actionLabel: 'Показать',
        action: 'preview-league-promoted',
        icon: 'trending-up-outline',
        testID: 'dev-preview-league-promoted',
      },
      {
        id: 'league-demoted',
        order: 20,
        title: 'Понижение',
        detail: 'Красный исход: место в зоне вылета, переход в лигу ниже.',
        actionLabel: 'Показать',
        action: 'preview-league-demoted',
        icon: 'trending-down-outline',
        testID: 'dev-preview-league-demoted',
      },
      {
        id: 'league-stay',
        order: 30,
        title: 'Остаёшься в лиге',
        detail: 'Нейтральный исход: место сразу за зоной повышения.',
        actionLabel: 'Показать',
        action: 'preview-league-stay',
        icon: 'shield-checkmark-outline',
        testID: 'dev-preview-league-stay',
      },
      {
        id: 'league-rank-mismatch',
        order: 40,
        title: 'Отставший снимок группы',
        detail: 'Сервер отдал место 2, а очки в снимке старые. Моя строка обязана стоять второй.',
        actionLabel: 'Показать',
        action: 'preview-league-rank-mismatch',
        icon: 'bug-outline',
        testID: 'dev-preview-league-rank-mismatch',
      },
    ],
  },
  {
    id: 'subscription',
    order: 30,
    title: 'Plus',
    icon: 'key-outline',
    testID: 'dev-hub-section-access',
    tools: [
      {
        id: 'plus-grant',
        order: 10,
        title: 'Выдать Plus',
        detail: 'Включает Plus локально для текущего аккаунта на этом устройстве.',
        actionLabel: 'Выдать',
        action: 'grant-plus',
        icon: 'add-circle-outline',
        testID: 'dev-plus-grant',
      },
      {
        id: 'plus-revoke',
        order: 20,
        title: 'Снять Plus',
        detail: 'Убирает только локальную DEV-выдачу. Покупка и VIP сохраняются.',
        actionLabel: 'Снять',
        action: 'revoke-plus',
        icon: 'remove-circle-outline',
        testID: 'dev-plus-remove',
        tone: 'danger',
      },
    ],
  },
  // зачем (владелец, 24.08.2026): шаг удержания при отмене подписки нельзя
  // проверить руками — нужна настоящая платная подписка, и опрос причины
  // проходится заново ради каждой ветки. Здесь все сценарии в один тап.
  // Цены в удержании НЕ участвуют (запрет владельца) — сценариев с тарифами тут нет.
  {
    id: 'cancel-flow',
    order: 32,
    title: 'Отписка',
    icon: 'card-outline',
    testID: 'dev-hub-section-cancel-flow',
    tools: [
      {
        id: 'cancel-flow-preview',
        order: 10,
        title: 'Сценарии удержания',
        detail: 'Все ветки шага отмены: прогресс, поддержка, тихий уход. Прогресс подменяется — обычный, новичок, рекордный, пусто. Есть сквозной прогон.',
        actionLabel: 'Открыть',
        action: 'open-cancel-flow',
        icon: 'list-outline',
        testID: 'dev-open-cancel-flow',
      },
      {
        id: 'manage-subscription-live',
        order: 20,
        title: 'Живой экран подписки',
        detail: 'Боевой экран управления подпиской целиком: опрос причины, шаг удержания, выход в стор.',
        actionLabel: 'Открыть',
        action: 'open-manage-subscription',
        icon: 'exit-outline',
        testID: 'dev-open-manage-subscription',
      },
    ],
  },
  // зачем (владелец, 2026-08-27): ОТДЕЛЬНЫЙ новый раздел — не внутри
  // «Движение · все поверхности». Каждая кнопка открывает НАСТОЯЩИЙ экран
  // (тот же самый, что видят игроки) из своего раздела приложения, но со
  // случайным стартовым числом рун/XP/счёта вместо реального прогресса —
  // диск и сеть не трогаются, проверка чисто визуальная.
  {
    id: 'practice-runes-preview',
    order: 40,
    title: 'Проверка рун',
    icon: 'diamond-outline',
    testID: 'dev-hub-section-practice-runes',
    collapsed: true,
    tools: [
      {
        id: 'runes-lesson',
        order: 10,
        title: 'Урок',
        detail: 'Настоящий Урок 1 со случайным счётом рун и XP на экране завершения.',
        actionLabel: 'Открыть',
        action: 'open-dev-runes-lesson',
        icon: 'school-outline',
        testID: 'dev-open-runes-lesson',
      },
      {
        id: 'runes-vocabulary',
        order: 20,
        title: 'Словарь',
        detail: 'Настоящий раздел словаря первого урока со случайным счётом рун и очков.',
        actionLabel: 'Открыть',
        action: 'open-dev-runes-vocabulary',
        icon: 'school-outline',
        testID: 'dev-open-runes-vocabulary',
      },
      {
        id: 'runes-irregular-verbs',
        order: 30,
        title: 'Неправильные глаголы',
        detail: 'Настоящий раздел глаголов со случайным счётом рун и очков.',
        actionLabel: 'Открыть',
        action: 'open-dev-runes-irregular-verbs',
        icon: 'school-outline',
        testID: 'dev-open-runes-irregular-verbs',
      },
      {
        id: 'runes-blitz',
        order: 40,
        title: 'Блиц',
        detail: 'Настоящий Блиц со случайным счётом рун, очков и точности на финише.',
        actionLabel: 'Открыть',
        action: 'open-dev-runes-blitz',
        icon: 'flash-outline',
        testID: 'dev-open-runes-blitz',
      },
      {
        id: 'runes-flashcards-training',
        order: 50,
        title: 'Тренировка карточек',
        detail: 'Настоящая тренировка (свайп) со случайным счётом рун и статистикой на финише.',
        actionLabel: 'Открыть',
        action: 'open-dev-runes-flashcards-training',
        icon: 'sparkles-outline',
        testID: 'dev-open-runes-flashcards-training',
      },
      {
        id: 'runes-mistake-practice',
        order: 60,
        title: 'Отработка ошибок',
        detail: 'Настоящая отработка ошибок со случайным счётом рун, XP и оценки.',
        actionLabel: 'Открыть',
        action: 'open-dev-runes-mistake-practice',
        icon: 'bug-outline',
        testID: 'dev-open-runes-mistake-practice',
      },
      {
        id: 'runes-speaking',
        order: 70,
        title: 'Голосовая отработка',
        detail: 'Настоящая голосовая отработка со случайным счётом рун и точности на финише.',
        actionLabel: 'Открыть',
        action: 'open-dev-runes-speaking',
        icon: 'call-outline',
        testID: 'dev-open-runes-speaking',
      },
    ],
  },
] as const satisfies readonly DevToolSection[];

export function getOrderedDevToolSections(): readonly DevToolSection[] {
  return [...DEV_TOOL_SECTIONS]
    .sort((left, right) => left.order - right.order)
    .map((section) => ({
      ...section,
      tools: [...section.tools].sort((left, right) => left.order - right.order),
    }));
}

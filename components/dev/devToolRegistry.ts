export type DevToolAction =
  // зачем (владелец 2026-09-21): «в девхаб в самом вверху добавь обе анимации
  // чтобы я мог запустить и проверить их». Празднование первой покупки иначе
  // видно только один раз в жизни аккаунта — после первой покупки его уже не
  // вызвать, и проверять правки было бы нечем.
  | 'preview-first-purchase-dialog'
  | 'preview-first-purchase-lesson'
  | 'run-onboarding'
  | 'open-motion-showcase'
  | 'open-learning-v2-modes-showcase'
  | 'open-learning-v2-authoring-preview'
  | 'open-shop'
  | 'open-paywall-plus'
  | 'preview-lesson-results'
  | 'grant-plus'
  | 'revoke-plus'
  // зачем (координатор 05.10, learn-1): «вести себя как Free» — только проверка доступа к урокам, только dev.
  | 'dev-as-free-on'
  | 'dev-as-free-off'
  // Отписка: витрина сценариев удержания при отмене подписки (владелец, 24.08).
  | 'open-cancel-flow'
  | 'open-spire-preview'
  | 'refresh-remote-gates'
  | 'open-manage-subscription'
  // зачем (владелец, 2026-08-27): «Проверка рун» — отдельный НОВЫЙ раздел (не
  // внутри «Движение · все поверхности»). Каждая кнопка открывает НАСТОЯЩИЙ
  // экран из соответствующего раздела приложения со случайным стартовым
  // числом рун и счёта — быстрая визуальная проверка без прохождения сессии.
  | 'open-dev-runes-lesson'
  | 'open-dev-runes-vocabulary'
  | 'open-dev-runes-irregular-verbs'
  | 'open-dev-runes-blitz'
  | 'open-dev-runes-flashcards-training'
  | 'open-dev-runes-mistake-practice'
  | 'open-dev-runes-speaking'
  // Зачем (владелец 2026-09-02): окно обновления нельзя было увидеть иначе
  // как включив его в Пульте ВСЕМ живым пользователям. Здесь оно
  // показывается только на этом устройстве, без записи в remote_config.
  | 'preview-update-modal-optional'
  | 'preview-update-modal-force'
  // зачем (владелец 2026-09-20): «добавь в дев-хаб в самый вверх кнопку,
  // которая показывает анимацию празднования получения Плюс или Про».
  // Раньше это жило только внутри витрины движения — два уровня вглубь.
  | 'preview-celebration-plus'
  | 'preview-celebration-pro'
  // зачем (координатор 12.10): проверить режим энергии Б на эмуляторе, не включая его в проде — локальный override режима и быстрая
  // установка энергии. Plus вкл/выкл — существующие 'grant-plus' / 'revoke-plus'.
  | 'dev-energy-mode-a'
  | 'dev-energy-mode-b'
  | 'dev-energy-mode-server'
  | 'dev-energy-set-5'
  | 'dev-energy-set-1'
  | 'dev-energy-set-0';

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
  icon: 'call-outline' | 'flash-outline' | 'sparkles-outline' | 'key-outline' | 'trophy-outline' | 'rocket-outline' | 'card-outline' | 'cart-outline' | 'school-outline' | 'diamond-outline' | 'gift-outline';
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
  /**
   * зачем (координатор 12.10): «ЧТОБЫ ВЛАДЕЛЬЦУ И СВЕРКЕ ТЕСТИРОВАТЬ режим Б на эмуляторе БЕЗ включения в проде». Локальный переключатель
   * режима энергии (поверх серверного ключа energy_mistake_charge) и быстрые состояния «Энергия: 5 / 1 / 0». Plus вкл/выкл — в секции «Plus».
   * order: -4 — самая первая секция хаба.
   */
  {
    id: 'energy-modes',
    order: -4,
    title: 'Режим энергии (проверка)',
    icon: 'flash-outline',
    testID: 'dev-section-energy-modes',
    tools: [
      { id: 'energy-mode-a', order: 10, title: 'Режим А', detail: 'Энергия за старт занятия, за ошибки сердечки. Только на этом устройстве.', actionLabel: 'Включить', action: 'dev-energy-mode-a', icon: 'flash-outline', testID: 'dev-energy-mode-a' },
      { id: 'energy-mode-b', order: 20, title: 'Режим Б', detail: 'Старт бесплатный, каждая ошибка снимает 1 энергию, на последней — остановка. Только на этом устройстве.', actionLabel: 'Включить', action: 'dev-energy-mode-b', icon: 'flash-outline', testID: 'dev-energy-mode-b' },
      { id: 'energy-mode-server', order: 30, title: 'Как на сервере', detail: 'Снять локальный выбор: режим берётся из рубильника energy_mistake_charge.', actionLabel: 'Снять', action: 'dev-energy-mode-server', icon: 'sync-outline', testID: 'dev-energy-mode-server' },
      { id: 'energy-set-5', order: 40, title: 'Энергия: 5', detail: 'Полный запас, часы восстановления с нуля.', actionLabel: 'Поставить', action: 'dev-energy-set-5', icon: 'add-circle-outline', testID: 'dev-energy-set-5' },
      { id: 'energy-set-1', order: 50, title: 'Энергия: 1', detail: 'Последняя энергия: баннер и красный пульс, следующая ошибка остановит занятие.', actionLabel: 'Поставить', action: 'dev-energy-set-1', icon: 'remove-circle-outline', testID: 'dev-energy-set-1' },
      { id: 'energy-set-0', order: 60, title: 'Энергия: 0', detail: 'Пустой запас: старт без энергии показывает шторку «Нужна энергия».', actionLabel: 'Поставить', action: 'dev-energy-set-0', icon: 'remove-circle-outline', testID: 'dev-energy-set-0' },
    ],
  },
  /**
   * зачем (владелец 2026-09-21): «в девхаб в самом вверху добавь обе анимации
   * в приложении чтобы я мог запустить и проверить их». order: -3 — выше
   * празднования Plus (-2) и рун (-1), то есть самая первая секция хаба.
   *
   * Без этой секции празднование первой покупки увидеть практически нельзя:
   * оно показывается ОДИН раз за товар (повторная покупка отдаёт
   * `alreadyOwned` и праздника не получает), а проверять правки анимации
   * надо многократно.
   *
   * Обе кнопки монтируют БОЕВОЙ FirstPurchaseSealCelebration с теми же
   * пропсами, что и настоящая покупка. Ничего не начисляется и не
   * списывается: компонент только показывает, доступ выдаёт покупка.
   */
  {
    id: 'first-purchase-celebration',
    order: -3,
    title: 'Первая покупка',
    icon: 'sparkles-outline',
    testID: 'dev-section-first-purchase',
    tools: [
      {
        id: 'first-purchase-dialog',
        order: 10,
        title: 'Диалог за руны',
        detail: 'Боевая анимация «Печать» с иконкой руны. Ничего не списывается.',
        actionLabel: 'Показать',
        action: 'preview-first-purchase-dialog',
        icon: 'sparkles-outline',
        testID: 'dev-first-purchase-dialog',
      },
      {
        id: 'first-purchase-lesson',
        order: 20,
        title: 'Урок за жемчужины',
        detail: 'Та же анимация с иконкой жемчуга. Ничего не списывается.',
        actionLabel: 'Показать',
        action: 'preview-first-purchase-lesson',
        icon: 'diamond-outline',
        testID: 'dev-first-purchase-lesson',
      },
    ],
  },
  /**
   * зачем (владелец 2026-09-20): «ДОБАВЬ В ДЕВ ХАБ В САМЫЙ ВВЕРХ КНОПКУ КОТОРАЯ
   * ПОКАЗЫВАЕТ АНИМАЦИЮ ПРАЗДНОВАНИЯ ПОЛУЧЕНИЯ ПЛЮС ИЛИ ПРО». order: -2 —
   * выше рун (-1), то есть самая первая секция хаба. Оба пункта монтируют
   * БОЕВУЮ модалку PremiumCelebrationModal (хореография v6 «Золотая палата»)
   * со звуком; вход в неё был только внутри «Движение · все поверхности», где
   * владелец его не находил. Превью ничего не начисляет и не пишет в
   * premium_celebration_state — очередь празднования на Главной не трогается.
   */
  {
    id: 'purchase-celebration',
    order: -2,
    title: 'Празднование покупки',
    icon: 'sparkles-outline',
    testID: 'dev-section-purchase-celebration',
    tools: [
      {
        id: 'celebration-plus',
        order: 10,
        title: 'Анимация Plus',
        detail: 'Боевая золотая хореография со звуком. Ничего не начисляется.',
        actionLabel: 'Показать',
        action: 'preview-celebration-plus',
        icon: 'sparkles-outline',
        testID: 'dev-celebration-plus',
      },
      {
        id: 'celebration-pro',
        order: 20,
        title: 'Анимация Pro',
        detail: 'Та же хореография в синей палитре Phraseman Pro. Ничего не начисляется.',
        actionLabel: 'Показать',
        action: 'preview-celebration-pro',
        icon: 'diamond-outline',
        testID: 'dev-celebration-pro',
      },
    ],
  },
  /**
   * зачем (владелец 2026-09-02): «добавь его в дев-хаб сразу в самый верх, чтобы
   * он полностью рабочий был». order: 0 ставит секцию выше онбординга. Обе
   * кнопки открывают НАСТОЯЩЕЕ окно обновления с реальной анимацией и реальной
   * кнопкой в магазин — отличие от боевого показа только в том, что окно
   * поднимается локально и не трогает remote_config, то есть его видит один
   * этот телефон, а не все пользователи.
   */
  {
    id: 'update-modal-preview',
    order: 0,
    title: 'Окно обновления',
    icon: 'rocket-outline',
    testID: 'dev-section-update-modal',
    tools: [
      {
        id: 'update-modal-optional',
        order: 10,
        title: 'Свободное окно',
        detail: 'Поднимается снизу, приложение видно за подложкой. Есть крестик и «Не сейчас».',
        actionLabel: 'Показать',
        action: 'preview-update-modal-optional',
        icon: 'rocket-outline',
        testID: 'dev-update-modal-optional',
      },
      {
        id: 'update-modal-force',
        order: 20,
        title: 'Принудительное окно',
        detail: 'Оседает сверху на сплошной фон. Ни крестика, ни «Не сейчас», ни кнопки назад.',
        actionLabel: 'Показать',
        action: 'preview-update-modal-force',
        icon: 'shield-checkmark-outline',
        testID: 'dev-update-modal-force',
        tone: 'danger',
      },
    ],
  },
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
  // зачем 2026-08-24: кнопки пейволов уже жили в «Витрине движения», но
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
      // зачем (владелец 2026-09-30, D78): пейволы A–G и превью «с онбординга» удалены —
      // остался один пейвол Plus. Онбординг-пейвол смотреть через «Запустить онбординг».
      {
        id: 'paywall-plus',
        order: 10,
        title: 'Пейвол Plus',
        detail: 'Единственный пейвол: реальные цены и пробный период из стора, выбранный контекст.',
        actionLabel: 'Открыть',
        action: 'open-paywall-plus',
        icon: 'card-outline',
        testID: 'dev-open-paywall-plus',
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
        id: 'lesson-results',
        order: 30,
        title: 'Результат урока',
        detail: 'Учебный пример наград без сохранения прогресса.',
        actionLabel: 'Показать',
        action: 'preview-lesson-results',
        icon: 'trophy-outline',
        testID: 'dev-preview-lesson-results',
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
      {
        id: 'dev-as-free-on',
        order: 30,
        title: 'Уроки как Free',
        detail: 'Доступ к урокам как у Free в релизе: пейвол вместо «Ещё рано». Покупки и Plus не трогает.',
        actionLabel: 'Вкл',
        action: 'dev-as-free-on',
        icon: 'remove-circle-outline',
        testID: 'dev-as-free-on',
      },
      {
        id: 'dev-as-free-off',
        order: 40,
        title: 'Уроки как обычно',
        detail: 'Выключает «Уроки как Free».',
        actionLabel: 'Выкл',
        action: 'dev-as-free-off',
        icon: 'add-circle-outline',
        testID: 'dev-as-free-off',
      },
    ],
  },
  // зачем (координатор 11.10): живую комнату Шпиля снять нельзя, пока на сервере config.enabled=false — экраны открываются на моках.
  {
    id: 'spire-preview',
    order: 33,
    title: 'Пик',
    icon: 'rocket-outline',
    testID: 'dev-hub-section-spire-preview',
    tools: [
      {
        id: 'spire-preview-open',
        order: 10,
        title: 'Пик на моках',
        detail: 'Хаб, комната, итоги ступени, пустое и офлайн, ступень с заданиями — без сервера и без включения Пика. Внизу полоса переключения состояний.',
        actionLabel: 'Открыть',
        action: 'open-spire-preview',
        icon: 'map-outline',
        testID: 'dev-open-spire-preview',
      },
      // зачем (владелец 11.10: «ШПИЛЬ НЕМЕДЛЕННО»): кэши рубильников и конфига Шпиля живут 6 ч — перечитать их сейчас,
      // без перезапуска и без сброса данных приложения.
      {
        id: 'spire-refresh-remote-gates',
        order: 20,
        title: 'Обновить рубильники сейчас',
        detail: 'Перечитать remote_config и config/spire_v1 с сервера, минуя кэш 6 ч. Вкладка «Пик» появится без перезапуска.',
        actionLabel: 'Обновить',
        action: 'refresh-remote-gates',
        icon: 'rocket-outline',
        testID: 'dev-refresh-remote-gates',
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
  // случайным стартовым числом рун и счёта вместо реального прогресса —
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
        detail: 'Настоящий Урок 1 со случайным счётом рун на экране завершения.',
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
        detail: 'Настоящая отработка ошибок со случайным счётом рун и оценки.',
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

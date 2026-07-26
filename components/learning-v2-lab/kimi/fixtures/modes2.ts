// зачем: дословная копия фикстур Kimi V5 из fixtures/mobile-story/*.json
// (сюжетные режимы modes2). Контент и copy состояний — только отсюда.
import type { ActivityOption } from '../components';
import type { StateCopy } from '../ChoiceShell';

export interface SdStarSlot {
  readonly id: string;
  readonly kind: 'completion' | 'quality' | 'transfer';
  readonly state: 'earned' | 'available' | 'locked';
  readonly earnedLabel: string;
  readonly unlockHint: string;
}

export interface SdScriptedDialogueVM {
  readonly id: string;
  readonly surfaceId: string;
  readonly title: string;
  readonly brief: {
    readonly situation: string;
    readonly role: string;
    readonly turnsDisplay: string;
    readonly offlineChip: string;
  };
  readonly partner: { readonly name: string; readonly portraitAlt: string };
  readonly controls: {
    readonly repeatLabel: string;
    readonly slowerLabel: string;
    readonly micLabel: string;
    readonly micHint: string;
    readonly supportLabel: string;
    readonly prevTurnLabel: string;
    readonly nextTurnLabel: string;
  };
  readonly turns: readonly {
    readonly id: string;
    readonly partner: { readonly en: string; readonly ru: string };
    readonly yourTurn: {
      readonly functionLabel: string;
      readonly supportPhrase: { readonly en: string; readonly ru: string };
    };
  }[];
  readonly repair: { readonly cue: string; readonly partialLabel: string };
  readonly fallbackNote: string;
  readonly permissionPanel: {
    readonly title: string;
    readonly body: string;
    readonly actionLabel: string;
  };
  readonly summary: {
    readonly title: string;
    readonly functionsLabel: string;
    readonly functionsDone: readonly string[];
    readonly hardLineLabel: string;
    readonly hardLine: { readonly en: string; readonly ru: string };
    readonly repeatLineLabel: string;
    readonly stars: readonly SdStarSlot[];
  };
  readonly copy: StateCopy;
}

/** fixtures/mobile-story/sd-scripted-dialogue.json */
export const sdScriptedDialogueFixture: SdScriptedDialogueVM = {
  id: 'vm-sd-scripted-dialogue',
  surfaceId: 'sd-scripted-dialogue',
  title: 'Диалог · Запись к врачу',
  brief: {
    situation: 'Ты звонишь в клинику, чтобы записаться на приём.',
    role: 'Твоя роль: пациент',
    turnsDisplay: '5 реплик',
    offlineChip: 'Работает офлайн',
  },
  partner: { name: 'Администратор клиники', portraitAlt: 'Портрет: администратор клиники с гарнитурой' },
  controls: {
    repeatLabel: 'Повторить',
    slowerLabel: 'Медленнее',
    micLabel: 'Говорить',
    micHint: 'Нажми — и скажи свою реплику',
    supportLabel: 'Фраза-поддержка',
    prevTurnLabel: 'Назад',
    nextTurnLabel: 'Дальше',
  },
  turns: [
    {
      id: 'turn-1',
      partner: { en: 'Good morning, City Clinic. How can I help you?', ru: 'Доброе утро, клиника «Сити». Чем помочь?' },
      yourTurn: {
        functionLabel: 'Поздоровайся и объясни цель звонка',
        supportPhrase: { en: "I'd like to make an appointment.", ru: 'Я хочу записаться на приём.' },
      },
    },
    {
      id: 'turn-2',
      partner: { en: 'Sure. Is it for today or later this week?', ru: 'Конечно. На сегодня или на этой неделе?' },
      yourTurn: {
        functionLabel: 'Назови удобный день',
        supportPhrase: { en: 'Later this week, please.', ru: 'Позже на этой неделе, пожалуйста.' },
      },
    },
    {
      id: 'turn-3',
      partner: {
        en: 'We have Friday at nine or at half past eleven.',
        ru: 'Есть пятница на девять или на половину двенадцатого.',
      },
      yourTurn: {
        functionLabel: 'Выбери время',
        supportPhrase: { en: 'Friday at nine works for me.', ru: 'Пятница в девять мне подходит.' },
      },
    },
    {
      id: 'turn-4',
      partner: { en: 'Sorry, could you say that again?', ru: 'Прости, можешь повторить?' },
      yourTurn: {
        functionLabel: 'Повтори спокойно, не торопясь',
        supportPhrase: { en: 'Friday at nine, please.', ru: 'Пятница, девять, пожалуйста.' },
      },
    },
    {
      id: 'turn-5',
      partner: { en: "Perfect — you're booked for Friday at nine.", ru: 'Отлично — ты записан на пятницу на девять.' },
      yourTurn: {
        functionLabel: 'Подтверди и попрощайся',
        supportPhrase: { en: 'Thank you. See you on Friday!', ru: 'Спасибо. До пятницы!' },
      },
    },
  ],
  repair: {
    cue: 'Партнёр переспросил — так бывает в живой речи. Попробуй ещё раз, можно с фразой-поддержкой.',
    partialLabel: 'Подсказка: «Friday at…»',
  },
  fallbackNote: 'Диалог можно пройти выбором или текстом — но звезда за голос тогда не выдаётся.',
  permissionPanel: {
    title: 'Микрофон выключен',
    body: 'Диалог можно продолжить выбором или текстом. Чтобы говорить, разреши микрофон в настройках и вернись.',
    actionLabel: 'Открыть настройки',
  },
  summary: {
    title: 'Итог диалога',
    functionsLabel: 'Получилось:',
    functionsDone: ['Поздоровался и объяснил цель', 'Назвал удобное время', 'Подтвердил запись'],
    hardLineLabel: 'Сложная реплика — повтори её:',
    hardLine: {
      en: 'We have Friday at nine or at half past eleven.',
      ru: 'Есть пятница на девять или на половину двенадцатого.',
    },
    repeatLineLabel: 'Прослушать ещё раз',
    stars: [
      {
        id: 'sd-st-1',
        kind: 'completion',
        state: 'earned',
        earnedLabel: 'Диалог завершён до конца',
        unlockHint: 'Доведи диалог до конца',
      },
      {
        id: 'sd-st-2',
        kind: 'quality',
        state: 'earned',
        earnedLabel: 'Партнёр понял тебя без переспросов в 4 репликах из 5',
        unlockHint: 'Добейся, чтобы партнёр понял без переспросов',
      },
      {
        id: 'sd-st-3',
        kind: 'transfer',
        state: 'available',
        earnedLabel: 'Свои слова без фразы-поддержки',
        unlockHint: 'Пройди диалог без фразы-поддержки',
      },
    ],
  },
  copy: {
    primaryActions: {
      prompt: 'Начать диалог',
      active: 'Готово',
      processing: 'Слушаем…',
      success: 'Дальше',
      needs_work: 'Попробовать ещё раз',
      recovery: 'Продолжить диалог',
    },
    statusMessages: {
      prompt: 'Короткий предсказуемый разговор — партнёр записан заранее, ждать не придётся.',
      active: 'Слушай реплику партнёра, потом скажи свою.',
      processing: 'Партнёр отвечает…',
      success: 'Диалог состоялся — посмотри итог.',
      needs_work: 'Партнёр переспросил — это нормально. Ещё одна попытка.',
      recovery: 'Диалог на паузе. Твоя реплика не потерялась.',
    },
  },
};

export interface CpCheckpointVM {
  readonly id: string;
  readonly surfaceId: string;
  readonly title: string;
  readonly intro: {
    readonly canDoLabel: string;
    readonly canDoList: readonly string[];
    readonly mixedNote: string;
    readonly hintsHiddenNotice: string;
    readonly noCertNote: string;
  };
  readonly progressDisplay: string;
  readonly progressPercent: number;
  readonly tasks: readonly {
    readonly id: string;
    readonly typeLabel: string;
    readonly promptLabel: string;
    readonly options: readonly ActivityOption[];
    readonly correctOptionId: string;
  }[];
  readonly voiceUncertainty: {
    readonly title: string;
    readonly body: string;
    readonly retryLabel: string;
  };
  readonly pause: {
    readonly pauseLabel: string;
    readonly pausedTitle: string;
    readonly pausedBody: string;
    readonly resumeLabel: string;
  };
  readonly result: {
    readonly title: string;
    readonly rows: readonly {
      readonly id: string;
      readonly label: string;
      readonly status: 'can' | 'practice';
      readonly note: string;
    }[];
    readonly evidenceLabel: string;
    readonly evidenceRows: readonly string[];
    readonly reinforcementTitle: string;
    readonly reinforcementItems: readonly string[];
    readonly calmNote: string;
  };
  readonly copy: StateCopy;
}

/** fixtures/mobile-story/cp-checkpoint.json */
export const cpCheckpointFixture: CpCheckpointVM = {
  id: 'vm-cp-checkpoint',
  surfaceId: 'cp-checkpoint',
  title: 'Чекпоинт · Глава 2',
  intro: {
    canDoLabel: 'Что проверяем',
    canDoList: [
      'Представиться и назвать цель',
      'Попросить помощь или повторить',
      'Понять объявление на вокзале',
    ],
    mixedNote: '8 заданий знакомых типов вперемешку — ничего нового',
    hintsHiddenNotice: 'Подсказки скрыты — как в жизни',
    noCertNote: 'Это проверка твоих навыков, а не экзамен на сертификат.',
  },
  progressDisplay: '3 из 8',
  progressPercent: 38,
  tasks: [
    {
      id: 'cp-1',
      typeLabel: 'Понимание',
      promptLabel:
        'Объявление: «The 14:30 to Cork leaves from platform two.» Откуда отправляется поезд?',
      options: [
        { id: 'cp-1-a', label: 'Со второй платформы' },
        { id: 'cp-1-b', label: 'С первой платформы' },
        { id: 'cp-1-c', label: 'От кассы' },
      ],
      correctOptionId: 'cp-1-a',
    },
    {
      id: 'cp-2',
      typeLabel: 'Диалог',
      promptLabel: 'Тебя не расслышали. Что скажешь?',
      options: [
        { id: 'cp-2-a', label: 'Could you say that again?' },
        { id: 'cp-2-b', label: "I don't hear nothing." },
        { id: 'cp-2-c', label: 'Speak! Please!' },
      ],
      correctOptionId: 'cp-2-a',
    },
    {
      id: 'cp-3',
      typeLabel: 'Память',
      promptLabel: 'Собери фразу: попросить чек.',
      options: [
        { id: 'cp-3-a', label: 'Can I have the receipt, please?' },
        { id: 'cp-3-b', label: 'Receipt I can have?' },
        { id: 'cp-3-c', label: 'Please receipt me.' },
      ],
      correctOptionId: 'cp-3-a',
    },
    {
      id: 'cp-4',
      typeLabel: 'Голос',
      promptLabel: "Скажи: «I'd like a ticket to Cork, please.»",
      options: [
        { id: 'cp-4-a', label: 'Записать голос', hint: 'симуляция' },
        { id: 'cp-4-b', label: 'Пропустить голосовое задание' },
      ],
      correctOptionId: 'cp-4-a',
    },
  ],
  voiceUncertainty: {
    title: 'Не удалось уверенно расслышать',
    body: 'Это не ошибка. Попробуй эквивалентную попытку — лучший прежний результат сохранится.',
    retryLabel: 'Другая попытка (бесплатно)',
  },
  pause: {
    pauseLabel: 'Пауза',
    pausedTitle: 'Пауза. Всё сохранено.',
    pausedBody: 'Продолжишь с того же задания — таймера нет, торопиться некуда.',
    resumeLabel: 'Продолжить',
  },
  result: {
    title: 'Итог чекпоинта',
    rows: [
      { id: 'cp-r-1', label: 'Можешь представиться и назвать цель', status: 'can', note: 'уверенно' },
      { id: 'cp-r-2', label: 'Можешь попросить помощь', status: 'can', note: 'получилось со второй попытки' },
      { id: 'cp-r-3', label: 'Понимание объявлений', status: 'practice', note: 'стоит повторить числа и время' },
    ],
    evidenceLabel: 'Что подтвердилось',
    evidenceRows: [
      'Аудирование: подтверждено',
      'Память: подтверждено',
      'Говорение: есть над чем поработать',
    ],
    reinforcementTitle: 'План повторения',
    reinforcementItems: ['Повторить время и числа (12 фраз)', 'Один диалог на вокзале завтра'],
    calmNote:
      'Заработанные звёзды остаются при тебе — чекпоинт только показывает, куда идти дальше.',
  },
  copy: {
    primaryActions: {
      prompt: 'Начать чекпоинт',
      active: 'Ответить',
      processing: 'Проверяем…',
      success: 'К плану повторения',
      needs_work: 'Продолжить',
      recovery: 'Продолжить чекпоинт',
    },
    statusMessages: {
      prompt: 'Спокойная проверка навыков главы — без таймера и сюрпризов.',
      active: 'Знакомые типы заданий. Подсказки скрыты, как договаривались.',
      processing: 'Смотрим ответ…',
      success: 'Готово — вот что у тебя получается, а что стоит повторить.',
      needs_work: 'Эта часть просит повторения — план уже собран ниже.',
      recovery: 'Чекпоинт на паузе. Всё сохранено.',
    },
  },
};

export interface PrReviewItem {
  readonly id: string;
  readonly typeLabel: string;
  readonly dueReason: string;
  readonly promptLabel: string;
  readonly options: readonly ActivityOption[];
  readonly correctOptionId: string;
  readonly optional: boolean;
  readonly reason: string;
  readonly hint: string;
}

export interface PrPersonalReviewVM {
  readonly id: string;
  readonly surfaceId: string;
  readonly title: string;
  readonly brief: {
    readonly sizeDisplay: string;
    readonly reasonDisplay: string;
    readonly copyLine: string;
  };
  readonly queueLabel: string;
  readonly positionDisplay: string;
  readonly items: readonly PrReviewItem[];
  readonly skipLabel: string;
  readonly completion: { readonly summary: string };
  readonly offlineNote: string;
  readonly copy: StateCopy;
}

/** fixtures/mobile-story/pr-personal-review.json */
export const prPersonalReviewFixture: PrPersonalReviewVM = {
  id: 'vm-pr-personal-review',
  surfaceId: 'pr-personal-review',
  title: 'Персональное повторение',
  brief: {
    sizeDisplay: '6 заданий · около 5 минут',
    reasonDisplay: '2 фразы после вчерашнего урока · 3 слова из эпизода 11',
    copyLine: 'Повторим 5 фраз',
  },
  queueLabel: 'Очередь на сегодня',
  positionDisplay: '2 из 6',
  items: [
    {
      id: 'pr-1',
      typeLabel: 'Фраза',
      dueReason: 'после вчерашнего урока',
      promptLabel: 'Как вежливо попросить чек?',
      options: [
        { id: 'pr-1-a', label: 'Can I have the receipt, please?' },
        { id: 'pr-1-b', label: 'Give me a receipt now.' },
        { id: 'pr-1-c', label: 'Receipt is me.' },
      ],
      correctOptionId: 'pr-1-a',
      optional: false,
      reason: 'Вчера эта фраза далась тяжело',
      hint: 'Начни с «Can I have…?» — так просьба звучит мягко.',
    },
    {
      id: 'pr-2',
      typeLabel: 'Слово',
      dueReason: 'слово из эпизода 11',
      promptLabel: '«boarding» — это…',
      options: [
        { id: 'pr-2-a', label: 'посадка на рейс' },
        { id: 'pr-2-b', label: 'багаж' },
        { id: 'pr-2-c', label: 'задержка рейса' },
      ],
      correctOptionId: 'pr-2-a',
      optional: false,
      reason: 'Встретилось в микроистории и отвлекло',
      hint: 'Вспомни: boarding pass — посадочный талон.',
    },
    {
      id: 'pr-3',
      typeLabel: 'Фраза',
      dueReason: 'после вчерашнего урока',
      promptLabel: 'Спроси дорогу к выходу № 7:',
      options: [
        { id: 'pr-3-a', label: 'Where is gate seven?' },
        { id: 'pr-3-b', label: 'What is gate seven?' },
        { id: 'pr-3-c', label: 'Gate seven where is?' },
      ],
      correctOptionId: 'pr-3-a',
      optional: true,
      reason: 'Порядок слов в вопросе',
      hint: 'Вопрос начинается с «Where is…».',
    },
    {
      id: 'pr-4',
      typeLabel: 'Слово',
      dueReason: 'слово из эпизода 11',
      promptLabel: '«check-in desk» — это…',
      options: [
        { id: 'pr-4-a', label: 'стойка регистрации' },
        { id: 'pr-4-b', label: 'выход на посадку' },
        { id: 'pr-4-c', label: 'паспортный контроль' },
      ],
      correctOptionId: 'pr-4-a',
      optional: false,
      reason: 'Новая фраза из микроистории',
      hint: 'Там ты получаешь посадочный талон.',
    },
    {
      id: 'pr-5',
      typeLabel: 'Фраза',
      dueReason: 'возвращается с другим контекстом',
      promptLabel: 'В кафе: попроси только воду.',
      options: [
        { id: 'pr-5-a', label: 'Just a water, please.' },
        { id: 'pr-5-b', label: 'Only water is me.' },
        { id: 'pr-5-c', label: 'Water, go!' },
      ],
      correctOptionId: 'pr-5-a',
      optional: true,
      reason: 'Та же просьба — новая сцена',
      hint: '«Just a…, please» — короткая вежливая форма.',
    },
    {
      id: 'pr-6',
      typeLabel: 'Слово',
      dueReason: 'слово из эпизода 11',
      promptLabel: '«platform» на вокзале — это…',
      options: [
        { id: 'pr-6-a', label: 'платформа' },
        { id: 'pr-6-b', label: 'касса' },
        { id: 'pr-6-c', label: 'расписание' },
      ],
      correctOptionId: 'pr-6-a',
      optional: false,
      reason: 'Пригодится в миссии на вокзале',
      hint: '«Platform two» — вторая платформа.',
    },
  ],
  skipLabel: 'Пропустить',
  completion: { summary: '3 навыка стали увереннее · 2 вернутся завтра' },
  offlineNote: 'Очередь сохранена на устройстве — синхронизация не помешает заниматься.',
  copy: {
    primaryActions: {
      prompt: 'Начать повторение',
      active: 'Проверить',
      processing: 'Проверяем…',
      success: 'Закончить',
      needs_work: 'Продолжить',
      recovery: 'Вернуться к очереди',
    },
    statusMessages: {
      prompt: 'Небольшая очередь — только то, что просится назад.',
      active: 'Одно задание за раз. Подсказка — одна причина и одна подсказка.',
      processing: 'Смотрим твой ответ…',
      success: 'Всё на сегодня. Возвращайся завтра за новой порцией.',
      needs_work: 'Ничего страшного — именно для этого и есть повторение.',
      recovery: 'Очередь на месте — продолжим с того же задания.',
    },
  },
};

export interface BaHotspot {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly x: number;
  readonly y: number;
  readonly line: { readonly speaker: string; readonly en: string; readonly ru: string };
  readonly choices: readonly { readonly id: string; readonly label: string; readonly hint: string }[];
}

export interface BaBranchingSceneVM {
  readonly id: string;
  readonly surfaceId: string;
  readonly title: string;
  readonly mission: {
    readonly briefLabel: string;
    readonly brief: string;
    readonly objectivesLabel: string;
    readonly objectives: readonly { readonly id: string; readonly label: string; readonly done: boolean }[];
    readonly phrasesLabel: string;
    readonly knownPhrases: readonly string[];
  };
  readonly scene: {
    readonly altRu: string;
    readonly hotspotsLabel: string;
    readonly listViewLabel: string;
    readonly sceneViewLabel: string;
    readonly hotspots: readonly BaHotspot[];
  };
  readonly repair: {
    readonly speaker: string;
    readonly en: string;
    readonly ru: string;
    readonly note: string;
  };
  readonly resume: { readonly nodeLabel: string; readonly chip: string; readonly savedNote: string };
  readonly objectiveDoneNote: string;
  readonly offlineFallbackNote: string;
  readonly completion: {
    readonly title: string;
    readonly summary: string;
    readonly objectivesDisplay: string;
  };
  readonly copy: StateCopy;
}

/** fixtures/mobile-story/ba-branching-scene.json */
export const baBranchingSceneFixture: BaBranchingSceneVM = {
  id: 'vm-ba-branching-scene',
  surfaceId: 'ba-branching-scene',
  title: 'Миссия · Купи билет до Корка',
  mission: {
    briefLabel: 'Твоя задача',
    brief: 'Ты на вокзале в Дублине. Купи билет до Корка на сегодня — и успей на поезд.',
    objectivesLabel: 'Цели миссии',
    objectives: [
      { id: 'obj-1', label: 'Спроси билет до Корка', done: true },
      { id: 'obj-2', label: 'Уточни время отправления', done: false },
      { id: 'obj-3', label: 'Оплати картой', done: false },
    ],
    phrasesLabel: 'Пригодятся фразы',
    knownPhrases: ['A single to Cork, please.', 'What time does it leave?', 'Can I pay by card?'],
  },
  scene: {
    altRu: 'Вокзал: слева касса, в центре табло с рейсами, справа кафе, вдалеке платформа.',
    hotspotsLabel: 'Куда пойдёшь?',
    listViewLabel: 'Показать списком',
    sceneViewLabel: 'Показать сцену',
    hotspots: [
      {
        id: 'hs-ticket',
        label: 'Касса',
        icon: '🎫',
        x: 12,
        y: 56,
        line: { speaker: 'Кассир', en: 'Hi! Where are you travelling today?', ru: 'Привет! Куда едешь сегодня?' },
        choices: [
          { id: 'hs-ticket-a', label: 'A single to Cork, please.', hint: 'single = билет в один конец' },
          { id: 'hs-ticket-b', label: 'I like trains.', hint: '' },
        ],
      },
      {
        id: 'hs-board',
        label: 'Табло',
        icon: '🕑',
        x: 42,
        y: 16,
        line: {
          speaker: 'Объявление',
          en: 'The 14:30 to Cork leaves from platform two.',
          ru: 'Поезд 14:30 до Корка — со второй платформы.',
        },
        choices: [
          { id: 'hs-board-a', label: 'What time does it leave?', hint: '' },
          { id: 'hs-board-b', label: 'Where is platform two?', hint: '' },
        ],
      },
      {
        id: 'hs-cafe',
        label: 'Кафе',
        icon: '☕',
        x: 72,
        y: 52,
        line: { speaker: 'Бариста', en: 'Anything to drink before your train?', ru: 'Что-нибудь выпить перед поездом?' },
        choices: [
          { id: 'hs-cafe-a', label: 'Just a water, please.', hint: '' },
          { id: 'hs-cafe-b', label: 'I am a ticket.', hint: '' },
        ],
      },
      {
        id: 'hs-platform',
        label: 'Платформа',
        icon: '🚆',
        x: 56,
        y: 78,
        line: {
          speaker: 'Контролёр',
          en: 'Tickets, please. Cork, platform two.',
          ru: 'Билеты, пожалуйста. Корк — вторая платформа.',
        },
        choices: [
          { id: 'hs-platform-a', label: 'Here you are.', hint: 'here you are = вот, пожалуйста' },
          { id: 'hs-platform-b', label: 'No ticket.', hint: '' },
        ],
      },
    ],
  },
  repair: {
    speaker: 'Кассир',
    en: 'You wanted a ticket for today, right?',
    ru: 'Ты хотел билет на сегодня, верно?',
    note: 'Персонаж не ругает, а уточняет: ответь про день поездки.',
  },
  resume: {
    nodeLabel: 'Касса',
    chip: 'Продолжишь с узла: Касса',
    savedNote: 'Выход сохраняет текущий узел — вернёшься ровно туда же.',
  },
  objectiveDoneNote: 'Цель отмечена: спросил билет до Корка ✓',
  offlineFallbackNote: 'Офлайн-режим: сцена заменена текстовым сценарием — задания и реплики те же.',
  completion: {
    title: 'Миссия выполнена',
    summary: 'Билет до Корка у тебя в кармане — поезд в 14:30, вторая платформа.',
    objectivesDisplay: 'Цели: 3 из 3',
  },
  copy: {
    primaryActions: {
      prompt: 'Начать миссию',
      active: 'Ответить',
      processing: 'Слушаем…',
      success: 'Продолжить',
      needs_work: 'Уточнить ответ',
      recovery: 'Вернуться к узлу',
    },
    statusMessages: {
      prompt: 'Прочитай задачу и цели — потом исследуй вокзал.',
      active: 'Выбери место на сцене и ответь персонажу своими словами.',
      processing: 'Персонаж отвечает…',
      success: 'Цель выполнена — открылась следующая точка.',
      needs_work: 'Персонаж переспросил — это не ошибка, а живой разговор.',
      recovery: 'Сцена сохранена. Продолжишь с того же узла.',
    },
  },
};

export interface MrMicrostoryVM {
  readonly id: string;
  readonly surfaceId: string;
  readonly title: string;
  readonly cover: {
    readonly goal: string;
    readonly durationDisplay: string;
    readonly newPhrasesDisplay: string;
    readonly illustrationAlt: string;
  };
  readonly download: {
    readonly state: 'downloaded' | 'not_downloaded';
    readonly sizeDisplay: string;
    readonly actionLabel: string;
    readonly downloadedChip: string;
    readonly neededChip: string;
  };
  readonly player: {
    readonly progressDisplay: string;
    readonly progressPercent: number;
    readonly speedOptions: readonly string[];
    readonly backLabel: string;
    readonly captionsToggleLabel: string;
    readonly signalLabel: string;
  };
  readonly captions: readonly {
    readonly id: string;
    readonly en: string;
    readonly ru: string;
    readonly phraseId?: string;
  }[];
  readonly phraseFocus: Readonly<
    Record<
      string,
      {
        readonly id: string;
        readonly phrase: string;
        readonly translation: string;
        readonly note: string;
        readonly replayLabel: string;
        readonly saveLabel: string;
      }
    >
  >;
  readonly comprehension: {
    readonly title: string;
    readonly question: string;
    readonly options: readonly ActivityOption[];
    readonly correctOptionId: string;
    readonly resumeNote: string;
  };
  readonly completion: {
    readonly canDo: string;
    readonly relistenLabel: string;
    readonly continueLabel: string;
    readonly phrasesSavedDisplay: string;
  };
  readonly copy: StateCopy;
}

/** fixtures/mobile-story/mr-microstory.json */
export const mrMicrostoryFixture: MrMicrostoryVM = {
  id: 'vm-mr-microstory',
  surfaceId: 'mr-microstory',
  title: 'Микроистория · Посадка на рейс',
  cover: {
    goal: 'Понять короткую историю про поездку в аэропорт и заметить новые фразы.',
    durationDisplay: '2 мин 58 с',
    newPhrasesDisplay: 'Новые фразы: 4',
    illustrationAlt: 'Иллюстрация: девушка с рюкзаком смотрит на табло рейсов в аэропорту.',
  },
  download: {
    state: 'not_downloaded',
    sizeDisplay: '12 МБ',
    actionLabel: 'Скачать эпизод',
    downloadedChip: 'Скачано · работает офлайн',
    neededChip: 'Не скачано · нужна сеть',
  },
  player: {
    progressDisplay: '0:42 / 2:58',
    progressPercent: 24,
    speedOptions: ['1×', '0.75×'],
    backLabel: '−5 с',
    captionsToggleLabel: 'Субтитры',
    signalLabel: 'История · часть 1',
  },
  captions: [
    { id: 'cap-1', en: 'Marta got to the airport two hours early.', ru: 'Марта приехала в аэропорт за два часа.' },
    { id: 'cap-2', en: 'She asked where the check-in desk was.', ru: 'Она спросила, где стойка регистрации.', phraseId: 'ph-check-in' },
    { id: 'cap-3', en: 'Her flight was boarding at gate seven.', ru: 'Посадка на её рейс была у седьмого выхода.', phraseId: 'ph-boarding' },
  ],
  phraseFocus: {
    'ph-check-in': {
      id: 'ph-check-in',
      phrase: 'check-in desk',
      translation: 'стойка регистрации',
      note: 'check in — зарегистрироваться на рейс',
      replayLabel: 'Слушать фрагмент',
      saveLabel: 'Сохранить фразу',
    },
    'ph-boarding': {
      id: 'ph-boarding',
      phrase: 'boarding',
      translation: 'посадка на рейс',
      note: 'board — садиться; boarding pass — посадочный талон',
      replayLabel: 'Слушать фрагмент',
      saveLabel: 'Сохранить фразу',
    },
  },
  comprehension: {
    title: 'Проверка понимания',
    question: 'Почему Марта приехала так рано?',
    options: [
      { id: 'cmp-a', label: 'Она боялась опоздать на рейс' },
      { id: 'cmp-b', label: 'Она хотела поработать в аэропорту' },
      { id: 'cmp-c', label: 'Она встречала подругу' },
    ],
    correctOptionId: 'cmp-a',
    resumeNote: 'После ответа история продолжится с того же места.',
  },
  completion: {
    canDo: 'Теперь ты можешь понять короткий рассказ о поездке в аэропорт.',
    relistenLabel: 'Переслушать',
    continueLabel: 'Продолжить',
    phrasesSavedDisplay: 'Сохранено фраз: 2 из 4',
  },
  copy: {
    primaryActions: {
      prompt: 'Слушать историю',
      active: 'Ответить',
      processing: 'Проверяем…',
      success: 'Продолжить',
      needs_work: 'Дослушать ещё раз',
      recovery: 'Продолжить с того же места',
    },
    statusMessages: {
      prompt: 'Короткая история с субтитрами. Новые фразы можно сохранять по ходу.',
      active: 'Слушай. Нажми на выделенную фразу, чтобы увидеть перевод.',
      processing: 'Проверяем твой ответ — история не сбросится.',
      success: 'История понята — здорово!',
      needs_work: 'Почти. Ответ спрятан в самом начале истории.',
      recovery: 'Загрузка прервалась. Место в истории сохранено.',
    },
  },
};

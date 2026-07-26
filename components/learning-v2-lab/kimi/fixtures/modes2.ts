// зачем: дословная копия фикстур Kimi V5 из fixtures/mobile-story/*.json
// (сюжетные режимы modes2). Контент и copy состояний — только отсюда.
import type { ActivityOption } from '../components';
import type { StateCopy } from '../ChoiceShell';

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

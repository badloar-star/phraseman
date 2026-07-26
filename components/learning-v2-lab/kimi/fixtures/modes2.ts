// зачем: дословная копия фикстур Kimi V5 из fixtures/mobile-story/*.json
// (сюжетные режимы modes2). Контент и copy состояний — только отсюда.
import type { ActivityOption } from '../components';
import type { StateCopy } from '../ChoiceShell';

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

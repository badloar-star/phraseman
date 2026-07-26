// зачем: дословная копия фикстур Kimi V5 (fixtures/mobile/*.json поставки
// 20260719-0858-k3). Весь контент и copy шести состояний берём ТОЛЬКО отсюда —
// ничего не выдумываем, иначе экран разойдётся со скриншотами поставки.
import type { ActivityOption } from '../components';
import type { StateCopy } from '../ChoiceShell';

export interface ListenChooseVM {
  readonly surfaceId: string;
  readonly signalLabel: string;
  readonly promptLabel: string;
  readonly transcript: string;
  readonly transcriptNote: string;
  readonly options: readonly ActivityOption[];
  readonly correctOptionId: string;
  readonly contrastNote: string;
  readonly missHint: string;
  readonly copy: StateCopy;
  readonly offlineNote: string;
}

/** fixtures/mobile/lc-listen-choose.json */
export const lcListenChooseFixture: ListenChooseVM = {
  surfaceId: 'lc-listen-choose',
  signalLabel: 'Dialogue · two friends',
  promptLabel: 'Что ты слышишь? Выбери подходящую ситуацию.',
  transcript: '— Hi! Are you flying to Berlin today? — Yes, my flight leaves at nine.',
  transcriptNote: 'Transcript открывается после первой попытки.',
  options: [
    { id: 'lc-a', label: 'Two people talk about a flight to Berlin.' },
    { id: 'lc-b', label: 'A man orders coffee at the airport café.' },
    { id: 'lc-c', label: 'A woman asks about the Wi-Fi password.' },
    { id: 'lc-d', label: 'Two friends plan a trip to the sea.' },
  ],
  correctOptionId: 'lc-a',
  contrastNote:
    'flight /flaɪt/ — рейс. Заметь: leaves at nine — вылетает в девять (расписание → настоящее время).',
  missHint: 'Почти. Послушай ещё раз: в начале они говорят о городе — Berlin.',
  copy: {
    primaryActions: {
      prompt: 'Начать',
      active: 'Проверить',
      processing: 'Проверяем…',
      success: 'Дальше',
      needs_work: 'Ещё раз',
      recovery: 'Продолжить',
    },
    statusMessages: {
      prompt: 'Нажми play и слушай диалог.',
      active: 'Слушай и выбирай ситуацию. Transcript откроется после попытки.',
      processing: 'Проверяем твой ответ…',
      success: 'Да, это разговор о рейсе в Берлин!',
      needs_work: 'Почти. Попробуй ещё раз с этой подсказкой.',
      recovery: 'Связь прервалась. Аудио доступно — можешь продолжить.',
    },
  },
  offlineNote: 'Аудио уже на устройстве — работает без сети.',
};

export interface VisualDiscoveryVM {
  readonly surfaceId: string;
  readonly scene: { readonly id: string; readonly altRu: string; readonly promptLabel: string };
  readonly cards: readonly { readonly id: string; readonly label: string; readonly note: string }[];
  readonly correctCardId: string;
  readonly reveal: { readonly phrase: string; readonly phraseRu: string; readonly note: string };
  readonly missHint: string;
  readonly copy: StateCopy;
}

/** fixtures/mobile/vd-visual-discovery.json */
export const vdVisualDiscoveryFixture: VisualDiscoveryVM = {
  surfaceId: 'vd-visual-discovery',
  scene: {
    id: 'scene-airport-01',
    altRu: 'Аэропорт: человек с чемоданом у стойки регистрации, табло рейсов на фоне.',
    promptLabel: 'Что здесь происходит?',
  },
  cards: [
    { id: 'vd-a', label: 'A man is checking in for his flight.', note: 'check in — регистрация на рейс' },
    { id: 'vd-b', label: 'A woman is drinking coffee at the gate.', note: '' },
    { id: 'vd-c', label: 'Two friends are saying goodbye at security.', note: '' },
    { id: 'vd-d', label: 'A pilot is walking to the plane.', note: '' },
  ],
  correctCardId: 'vd-a',
  reveal: {
    phrase: "I'm checking in for my flight.",
    phraseRu: 'Я регистрируюсь на рейс.',
    note: 'check in = зарегистрироваться. Заметь: настоящее длительное — действие происходит сейчас.',
  },
  missHint: 'Почти. Посмотри на действие справа — человек что-то делает у стойки.',
  copy: {
    primaryActions: {
      prompt: 'Начать',
      active: 'Проверить',
      processing: 'Проверяем…',
      success: 'Дальше',
      needs_work: 'Ещё раз',
      recovery: 'Продолжить',
    },
    statusMessages: {
      prompt: 'Посмотри на сцену и выбери, что происходит.',
      active: 'Выбери карточку, которая подходит к сцене.',
      processing: 'Проверяем твой выбор…',
      success: 'Да! Именно это и происходит на сцене.',
      needs_work: 'Почти. Попробуй ещё раз с этой подсказкой.',
      recovery: 'Связь прервалась. Сцена сохранена — можешь продолжить.',
    },
  },
};

export interface ContextGapVM {
  readonly surfaceId: string;
  readonly situationLabel: string;
  readonly sentence: {
    readonly before: string;
    readonly after: string;
    readonly slotOptions: readonly {
      readonly id: string;
      readonly label: string;
      readonly correct: boolean;
    }[];
  };
  readonly sentenceRu: string;
  readonly slotFeedback: Readonly<Record<string, string>>;
  readonly successNote: string;
  readonly missHint: string;
  readonly copy: StateCopy;
}

/** fixtures/mobile/cg-context-gap.json */
export const cgContextGapFixture: ContextGapVM = {
  surfaceId: 'cg-context-gap',
  situationLabel: 'В аэропорту · разговор',
  sentence: {
    before: 'She ___ to Madrid every month for work.',
    after: '',
    slotOptions: [
      { id: 'cg-a', label: 'flies', correct: true },
      { id: 'cg-b', label: 'fly', correct: false },
      { id: 'cg-c', label: 'flying', correct: false },
      { id: 'cg-d', label: 'flew', correct: false },
    ],
  },
  sentenceRu: 'Она летает в Мадрид каждый месяц по работе.',
  slotFeedback: {
    'cg-a': 'Верно: every month → обычное настоящее, she flies.',
    'cg-b': 'После she нужен flies, не fly.',
    'cg-c': 'flying — продолженное время, но every month = привычка.',
    'cg-d': 'flew — прошедшее, а every month происходит регулярно.',
  },
  successNote: 'Точно! Регулярные действия — Present Simple: she flies.',
  missHint: 'Почти. Посмотри на every month — это привычка, не одно действие.',
  copy: {
    primaryActions: {
      prompt: 'Начать',
      active: 'Проверить',
      processing: 'Проверяем…',
      success: 'Дальше',
      needs_work: 'Ещё раз',
      recovery: 'Продолжить',
    },
    statusMessages: {
      prompt: 'Выбери правильную форму слова в пропуске.',
      active: 'Прочитай ситуацию и выбери форму.',
      processing: 'Проверяем форму…',
      success: 'Форма верная. Отлично!',
      needs_work: 'Почти. Попробуй ещё раз с этой подсказкой.',
      recovery: 'Связь прервалась. Предложение сохранено.',
    },
  },
};

export interface SpeedMatchVM {
  readonly surfaceId: string;
  readonly briefLabel: string;
  readonly pairs: readonly { readonly id: string; readonly en: string; readonly ru: string }[];
  readonly timerDisplay: string;
  readonly results: {
    readonly speedDisplay: string;
    readonly accuracyDisplay: string;
    readonly personalBestDisplay: string;
  };
  readonly copy: StateCopy;
}

/** fixtures/mobile/sm-speed-match.json */
export const smSpeedMatchFixture: SpeedMatchVM = {
  surfaceId: 'sm-speed-match',
  briefLabel: 'Соедини 8 пар. Таймер можно отключить.',
  pairs: [
    { id: 'p1', en: 'check in', ru: 'регистрироваться (на рейс)' },
    { id: 'p2', en: 'boarding pass', ru: 'посадочный талон' },
    { id: 'p3', en: 'gate', ru: 'выход на посадку' },
    { id: 'p4', en: 'delay', ru: 'задержка' },
    { id: 'p5', en: 'luggage', ru: 'багаж' },
    { id: 'p6', en: 'security check', ru: 'контроль безопасности' },
    { id: 'p7', en: 'window seat', ru: 'место у окна' },
    { id: 'p8', en: 'take off', ru: 'взлетать' },
  ],
  timerDisplay: '01:30',
  results: {
    speedDisplay: '01:12',
    accuracyDisplay: '8/8',
    personalBestDisplay: '00:58',
  },
  copy: {
    primaryActions: {
      prompt: 'Начать',
      active: 'Завершить',
      processing: 'Считаем…',
      success: 'Дальше',
      needs_work: 'Ещё раз',
      recovery: 'Продолжить',
    },
    statusMessages: {
      prompt: 'Это необязательная тренировка на скорость — она не влияет на прогресс.',
      active: 'Соединяй фразы с переводами. Можно без таймера.',
      processing: 'Считаем результат…',
      success: 'Готово! Скорость, точность и рекорд — ниже.',
      needs_work: 'Почти. Спокойный темп тоже отличный результат.',
      recovery: 'Пауза из-за сети. Пары на месте — продолжай когда будешь готов.',
    },
  },
};

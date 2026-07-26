// зачем: дословная копия фикстур Kimi V5 из fixtures/mobile-voice/*.json
// (речевые режимы SB-05…SB-08). Тексты вердиктов ЧЕСТНЫЕ: «проверяются слова и
// их порядок — не акцент» — ровно то, что умеет распознавание на устройстве.
import type { VoiceShellVM } from '../VoiceShell';

export interface SlSoundSyllableLabVM extends VoiceShellVM {
  readonly word: {
    readonly text: string;
    readonly meaningRu: string;
    readonly ipa: string;
    readonly targetSound: string;
    readonly targetNote: string;
  };
  readonly soundHint: { readonly title: string; readonly body: string; readonly diagramAlt: string };
  readonly guidedNote: string;
  readonly controls: {
    readonly wordLabel: string;
    readonly soundLabel: string;
    readonly ownLabel: string;
    readonly retryLabel: string;
  };
}

/** fixtures/mobile-voice/sl-sound-syllable-lab.json */
export const slSoundSyllableLabFixture: SlSoundSyllableLabVM = {
  surfaceId: 'sl-sound-syllable-lab',
  title: 'Звуковая лаборатория',
  goalLabel: 'Цель: звук /θ/',
  copy: {
    primaryActions: {
      prompt: 'Начать',
      active: 'Остановить',
      processing: 'Проверяем…',
      success: 'Дальше',
      needs_work: 'Повторить',
      recovery: 'Повторить бесплатно',
    },
    statusMessages: {
      prompt: 'Послушай слово и звук, потом запиши себя.',
      active: 'Слушаю… Скажи «think».',
      processing: 'Проверяем попытку…',
      success: 'Записано! Сравни свою запись с эталоном.',
      needs_work: 'Послушай разницу и попробуй ещё раз.',
      recovery: 'Мы не уверены из-за шума. Эта попытка не повлияет на звёзды.',
    },
  },
  voice: {
    instructionLabel: 'Скажи «think»',
    timerDisplay: '0:02 / 0:05',
    routeLabel: 'Микрофон устройства',
    evidenceLabel: 'Тренировка без оценки звука — сравнение на слух',
    passTitle: 'Записано!',
    passNote: 'Сравни «Моя запись» и «Эталон». Оценки звука нет — это тренировка на слух.',
    needsWorkHint: 'Подсказка: кончик языка — между зубами, дуй воздух без голоса.',
    retryScopeLabel: 'Повторяем только «think»',
    attemptsDisplay: 'Повтор 1 из 2',
    uncertainNote: 'Эта попытка не повлияет на звёзды',
    invalidNote: 'Попробуй ещё раз в тихом месте — попытка бесплатная.',
    offlineNote: 'Сейчас нет сети. Можно продолжить локальное задание или вернуться позже.',
  },
  permission: {
    title: 'Нужен доступ к микрофону',
    body: 'Чтобы записать твой голос, разреши микрофон в настройках. Можно и без него — тогда слушай и повторяй вслух без записи.',
    settingsLabel: 'Открыть настройки',
    noMicLabel: 'Продолжить без микрофона',
    backLabel: 'Назад',
  },
  word: {
    text: 'think',
    meaningRu: 'думать',
    ipa: '/θɪŋk/',
    targetSound: 'θ',
    targetNote: 'Сегодня тренируем /θ/',
  },
  soundHint: {
    title: 'Как сказать /θ/',
    body: 'Кончик языка — между зубами. Дуй воздух, голос не включай. Почти как «с», но язык выше.',
    diagramAlt: 'Схема артикуляции: кончик языка касается верхних зубов, воздух выходит свободно',
  },
  guidedNote:
    'Режим тренировки: слушай, повторяй и сравнивай сам. Оценка звука появится позже — после калибровки.',
  controls: {
    wordLabel: 'Слово',
    soundLabel: 'Звук',
    ownLabel: 'Моя запись',
    retryLabel: 'Повторить',
  },
};

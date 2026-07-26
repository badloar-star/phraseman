// зачем: дословная копия фикстур Kimi V5 из fixtures/mobile-voice/*.json
// (речевые режимы SB-05…SB-08). Тексты вердиктов ЧЕСТНЫЕ: «проверяются слова и
// их порядок — не акцент» — ровно то, что умеет распознавание на устройстве.
import type { VoiceShellVM } from '../VoiceShell';

export interface ShShadowingVM extends VoiceShellVM {
  readonly phrase: {
    readonly text: string;
    readonly meaningRu: string;
    readonly ipa: string;
    readonly chunks: readonly { readonly id: string; readonly text: string; readonly stress: string }[];
  };
  readonly lanes: readonly { readonly id: string; readonly label: string; readonly display: string }[];
  readonly modeNote: string;
  readonly result: {
    readonly rows: readonly { readonly id: string; readonly label: string; readonly display: string }[];
    readonly evidenceLabel: string;
  };
  readonly retryChunkId: string;
}

/** fixtures/mobile-voice/sh-shadowing.json */
export const shShadowingFixture: ShShadowingVM = {
  surfaceId: 'sh-shadowing',
  title: 'Эхо — ритм и ударение',
  goalLabel: 'Цель: ритм и ударение',
  copy: {
    primaryActions: {
      prompt: 'Начать',
      active: 'Остановить',
      processing: 'Проверяем…',
      success: 'Дальше',
      needs_work: 'Повторить кусок',
      recovery: 'Повторить бесплатно',
    },
    statusMessages: {
      prompt: 'Сначала слушай эталон, потом повторяй — как эхо.',
      active: 'Слушаю… Повторяй фразу по кускам.',
      processing: 'Проверяем длительность, шум и ритм…',
      success: 'Ритм совпал — отличная попытка.',
      needs_work: 'Почти. Повторим один кусок: «the platform».',
      recovery: 'Мы не уверены из-за шума. Эта попытка не повлияет на звёзды.',
    },
  },
  voice: {
    instructionLabel: 'Повтори фразу за эталоном — по кускам',
    timerDisplay: '0:05 / 0:20',
    routeLabel: 'Микрофон устройства',
    evidenceLabel: 'Проверяются ритм и паузы — не акцент',
    passTitle: 'Ритм совпал',
    passNote: 'Ударение, ритм и паузы близки к эталону. Тебя легко слушать.',
    needsWorkHint: 'Подсказка: в куске «the platform» ударение на PLAT — послушай и повтори только его.',
    retryScopeLabel: 'Повторяем один кусок: «the platform»',
    attemptsDisplay: 'Повтор 1 из 2',
    uncertainNote: 'Эта попытка не повлияет на звёзды',
    invalidNote: 'Проверь микрофон или наушники — попытка бесплатная.',
    offlineNote: 'Сейчас нет сети. Можно продолжить локальное задание или вернуться позже.',
  },
  permission: {
    title: 'Нужен доступ к микрофону',
    body: 'Чтобы записать твой голос, разреши микрофон в настройках. Можно и без него — слушай и повторяй вслух без записи.',
    settingsLabel: 'Открыть настройки',
    noMicLabel: 'Продолжить без микрофона',
    backLabel: 'Назад',
  },
  phrase: {
    text: "I'm looking for the platform for trains to Cork.",
    meaningRu: 'Я ищу платформу, с которой отправляются поезда в Корк.',
    ipa: '/aɪm ˈlʊkɪŋ fɔː ðə ˈplætfɔːm fɔː treɪnz tə kɔːk/',
    chunks: [
      { id: 'sh-c1', text: "I'm looking for", stress: 'LOOK-ing' },
      { id: 'sh-c2', text: 'the platform', stress: 'PLAT-form' },
      { id: 'sh-c3', text: 'for trains to Cork.', stress: 'CORK' },
    ],
  },
  lanes: [
    { id: 'stress', label: 'Ударение', display: 'LOOK-ing · PLAT-form · CORK' },
    { id: 'rhythm', label: 'Ритм', display: '— • • — | — • | • • —' },
    { id: 'pauses', label: 'Паузы', display: 'короткая после «looking for» и «platform»' },
  ],
  modeNote:
    'Режим «эхо»: сначала слушай эталон, потом повторяй. Одновременное чтение — только в наушниках.',
  result: {
    rows: [
      { id: 'stress', label: 'Ударение', display: 'Совпало в ключевых словах' },
      { id: 'rhythm', label: 'Ритм', display: 'Близко к эталону' },
      { id: 'pauses', label: 'Паузы', display: 'На месте' },
    ],
    evidenceLabel: 'Показаны только проверенные признаки: длительность, маршрут звука, шум',
  },
  retryChunkId: 'sh-c2',
};

export interface QrQuickResponseVM extends VoiceShellVM {
  readonly goal: {
    readonly contextLabel: string;
    readonly promptLabel: string;
    readonly supportLabel: string;
    readonly supportPhrase: string;
    readonly supportNote: string;
  };
  readonly transcript: {
    readonly heardLabel: string;
    readonly text: string;
    readonly originLabel: string;
    readonly editLabel: string;
    readonly rerecordLabel: string;
    readonly sendLabel: string;
    readonly cancelSendLabel: string;
    readonly editedNote: string;
  };
  readonly typed: {
    readonly label: string;
    readonly placeholder: string;
    readonly note: string;
    readonly submitLabel: string;
  };
  readonly result: {
    readonly goalMetLabel: string;
    readonly evidenceLabel: string;
    readonly naturalnessTip: string;
  };
  /**
   * ВНИМАНИЕ: карточка согласия на СЕТЕВУЮ обработку голоса — из поставки Kimi.
   * В приложении она НЕ показывается: владелец выбрал распознавание только на
   * устройстве, запись никуда не уходит. Держим текст дословно (порт без потерь),
   * но подключать нельзя — иначе интерфейс обещает передачу, которой нет, и это
   * разошлось бы с политикой приватности.
   */
  readonly consent: {
    readonly title: string;
    readonly body: string;
    readonly acceptLabel: string;
    readonly declineLabel: string;
  };
}

/** fixtures/mobile-voice/qr-quick-response.json */
export const qrQuickResponseFixture: QrQuickResponseVM = {
  surfaceId: 'qr-quick-response',
  title: 'Быстрый ответ',
  goalLabel: 'Цель: ответ по смыслу',
  copy: {
    primaryActions: {
      prompt: 'Начать',
      active: 'Остановить',
      processing: 'Отправляем…',
      success: 'Дальше',
      needs_work: 'Ещё раз',
      recovery: 'Повторить бесплатно',
    },
    statusMessages: {
      prompt: 'Подумай и ответь своими словами. Таймера нет.',
      active: 'Слушаю… Говори спокойно, как получается.',
      processing: 'Проверяем попытку… Промпт и transcript остаются на месте.',
      success: 'Цель выполнена — тебя поняли.',
      needs_work: 'Почти. Попробуй ещё раз — можно с подсказкой.',
      recovery: 'Мы не уверены из-за шума. Эта попытка не повлияет на звёзды.',
    },
  },
  voice: {
    instructionLabel: 'Скажи, что ты хочешь заказать',
    timerDisplay: '0:06 / 0:30',
    routeLabel: 'Микрофон устройства',
    evidenceLabel: 'Проверяются смысл и понятность — не акцент',
    passTitle: 'Цель выполнена — тебя поняли',
    passNote: 'Ответ по смыслу подходит к ситуации. Фраза распознана уверенно.',
    needsWorkHint: 'Подсказка: начни с «I would like…» и назови напиток.',
    retryScopeLabel: 'Повторяем тот же ответ — только его',
    attemptsDisplay: 'Повтор 1 из 2',
    uncertainNote: 'Эта попытка не повлияет на звёзды',
    invalidNote: 'Проверь микрофон или введи ответ текстом — попытка бесплатная.',
    offlineNote: 'Сейчас нет сети. Черновик сохранится локально, звёзды не уменьшатся.',
  },
  permission: {
    title: 'Нужен доступ к микрофону',
    body: 'Чтобы записать твой голос, разреши микрофон в настройках. Можно и без него — ответь текстом.',
    settingsLabel: 'Открыть настройки',
    noMicLabel: 'Продолжить без микрофона',
    backLabel: 'Назад',
  },
  goal: {
    contextLabel: 'Кафе в аэропорту',
    promptLabel: 'Скажи, что ты хочешь заказать',
    supportLabel: 'Нужна фраза-подсказка',
    supportPhrase: 'I would like a …, please.',
    supportNote: 'Опора: начни с «I would like…» и добавь напиток.',
  },
  transcript: {
    heardLabel: 'Мы услышали:',
    text: 'I would like a coffee, please.',
    originLabel: 'transcriptOrigin: asr_raw',
    editLabel: 'Изменить',
    rerecordLabel: 'Записать ещё раз',
    sendLabel: 'Отправить',
    cancelSendLabel: 'Отменить отправку',
    editedNote: 'Ты изменил текст — transcriptOrigin: learner_edited',
  },
  typed: {
    label: 'Ввести текстом',
    placeholder: 'Напиши ответ текстом…',
    note: 'inputSource=keyboard · transcriptOrigin=typed — без голосовой звезды',
    submitLabel: 'Отправить текст',
  },
  result: {
    goalMetLabel: 'Цель выполнена — тебя поняли',
    evidenceLabel: 'Понятность: фраза распознана уверенно',
    naturalnessTip: 'Естественнее звучит: «Can I get a coffee?»',
  },
  consent: {
    title: 'Сетевая обработка голоса',
    body: 'Чтобы распознать ответ, запись уходит на сервер (обработчик: Phraseman Voice, регион: ЕС). Запись удаляется сразу после результата. Можно продолжить и без сетевой обработки — задание засчитается.',
    acceptLabel: 'Разрешить сетевую обработку',
    declineLabel: 'Продолжить без неё',
  },
};

export interface RpRepeatCompareVM extends VoiceShellVM {
  readonly phrase: {
    readonly text: string;
    readonly meaningRu: string;
    readonly ipa: string;
    readonly chunks: readonly { readonly id: string; readonly text: string }[];
  };
  readonly wordChips: readonly string[];
  readonly compare: {
    readonly ownLabel: string;
    readonly refLabel: string;
    readonly ownDurationDisplay: string;
    readonly refDurationDisplay: string;
    readonly nowPlayingLabel: string;
    readonly slowerLabel: string;
  };
}

/** fixtures/mobile-voice/rp-repeat-compare.json */
export const rpRepeatCompareFixture: RpRepeatCompareVM = {
  surfaceId: 'rp-repeat-compare',
  title: 'Повтори и сравни',
  goalLabel: 'Цель: понятность фразы',
  copy: {
    primaryActions: {
      prompt: 'Начать',
      active: 'Остановить',
      processing: 'Проверяем…',
      success: 'Дальше',
      needs_work: 'Ещё раз',
      recovery: 'Повторить бесплатно',
    },
    statusMessages: {
      prompt: 'Сначала послушай эталон, потом повтори.',
      active: 'Слушаю… Говори фразу целиком.',
      processing: 'Проверяем качество записи и слова…',
      success: 'Фраза распознана — слова и порядок совпали.',
      needs_work: 'Почти. Одна подсказка — и ещё раз.',
      recovery: 'Мы не уверены из-за шума. Эта попытка не повлияет на звёзды.',
    },
  },
  voice: {
    instructionLabel: 'Повтори фразу после эталона',
    timerDisplay: '0:04 / 0:15',
    routeLabel: 'Микрофон устройства',
    evidenceLabel: 'Проверяются слова и их порядок — не акцент',
    passTitle: 'Фраза распознана',
    passNote: 'Слова и порядок совпали. Тебя легко понять.',
    needsWorkHint: 'Подсказка: скажи чётче «again» — /əˈɡen/. Послушай эталон ещё раз.',
    retryScopeLabel: 'Повторяем всю фразу — только её',
    attemptsDisplay: 'Повтор 1 из 2',
    uncertainNote: 'Эта попытка не повлияет на звёзды',
    invalidNote: 'Проверь микрофон или выбери другой способ — попытка бесплатная.',
    offlineNote: 'Сейчас нет сети. Можно продолжить локальное задание или вернуться позже.',
  },
  permission: {
    title: 'Нужен доступ к микрофону',
    body: 'Чтобы записать твой голос, разреши микрофон в настройках. Можно и без него — тогда слушай эталон и повторяй вслух без записи.',
    settingsLabel: 'Открыть настройки',
    noMicLabel: 'Продолжить без микрофона',
    backLabel: 'Назад',
  },
  phrase: {
    text: 'Could you say that again, please?',
    meaningRu: 'Можешь повторить, пожалуйста?',
    ipa: '/kʊd juː seɪ ðæt əˈɡen pliːz/',
    chunks: [
      { id: 'rp-c1', text: 'Could you' },
      { id: 'rp-c2', text: 'say that' },
      { id: 'rp-c3', text: 'again, please?' },
    ],
  },
  wordChips: ['Could', 'you', 'say', 'that', 'again,', 'please?'],
  compare: {
    ownLabel: 'Моя запись',
    refLabel: 'Эталон',
    ownDurationDisplay: '0:03',
    refDurationDisplay: '0:03',
    nowPlayingLabel: 'Сейчас играет',
    slowerLabel: 'Медленнее',
  },
};

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

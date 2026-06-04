import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export const GAVAN_WEEK1_CONTENT_AUTHORING_SEED_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-content-authoring-seed.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const REQUIRED_EXERCISE_TYPES = [
  'lesson_bridge',
  'phrase_build',
  'missing_word',
  'natural_choice',
  'listening_choice',
  'active_recall',
  'quick_reply',
  'mistake_repair',
] as const;

const FORBIDDEN_CONTENT_PATTERNS = [
  'alex',
  'beta',
  'phone',
  'email',
  'apartment',
  'rent',
  'landlord',
  'viewing',
  'passport number',
  'doctor appointment',
];

const FORBIDDEN_CONTENT_MATCHERS: Array<[string, RegExp]> = [
  ['alex', /\balex\b/i],
  ['beta', /\bbeta\b/i],
  ['phone', /phone/i],
  ['email', /email/i],
  ['apartment', /apartment/i],
  ['rent', /rent/i],
  ['landlord', /landlord/i],
  ['viewing', /viewing/i],
  ['passport number', /passport number/i],
  ['doctor appointment', /doctor appointment/i],
];

const FORBIDDEN_USER_FACING_TERMS = [
  'scene',
  'scenario',
  'developer',
  'draft',
  'placeholder',
];

export type GavanWeek1SeedExerciseType =
  | 'lesson_bridge'
  | 'phrase_build'
  | 'missing_word'
  | 'natural_choice'
  | 'listening_choice'
  | 'active_recall'
  | 'quick_reply'
  | 'mistake_repair'
  | 'micro_dialogue'
  | 'pronunciation_shadow';

export type GavanWeek1SeedExplanationCard = {
  id: string;
  covers: string[];
  correctFeedbackRu: string;
  wrongFeedbackRu: string;
  correctTone: 'calm_confirming';
  wrongTone: 'supportive_repair';
  mustNotMentionUnseenWrongOption: true;
};

export type GavanWeek1SeedPhrase = {
  id: string;
  english: string;
  meaningRu: string;
  newWords: string[];
  firstSeenConstructions: string[];
  explanationCards: GavanWeek1SeedExplanationCard[];
  finalCopyApproved: false;
};

export type GavanWeek1SeedExerciseBlock = {
  id: string;
  exerciseType: GavanWeek1SeedExerciseType;
  userFacingLabelRu: string;
  purposeRu: string;
  sourcePhraseIds: string[];
  finalExerciseBuilt: false;
  wrongAnswerPolicy: {
    mustNotInventUnseenOptions: true;
    explainCorrectIdeaOnly: true;
  };
};

export type GavanWeek1SeedLoad = {
  targetMinutes: number;
  exerciseBlockCount: number;
  phraseCount: number;
};

export type GavanWeek1SeedDay = {
  dayId: `gavan-week1-day${number}`;
  dayIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  userFacingTitle: string;
  universalGoal: string;
  socialSafety: 'broad_everyday_public';
  userFacingCopyMustAvoidDevLanguage: true;
  lessonBridge: {
    prerequisiteLessonIds: string[];
    bridgeNoteRu: string;
    mustExplainBeforeUse: true;
  };
  loadByMinutes: {
    5: GavanWeek1SeedLoad;
    10: GavanWeek1SeedLoad;
    15: GavanWeek1SeedLoad;
    20: GavanWeek1SeedLoad;
  };
  exerciseBlocks: GavanWeek1SeedExerciseBlock[];
  phraseBank: GavanWeek1SeedPhrase[];
  quizIntent: {
    questionCount: 10;
    finalQuizWritten: false;
    focusRu: string;
  };
  recallPlan: {
    enabled: true;
    errorsReturnLater: true;
    noHintsOnRecall: true;
    orderChanges: true;
  };
  mediaClaims: {
    audioAssetStatus: 'not_generated';
    pronunciationScoringStatus: 'not_built';
    finalAudioReady: false;
    finalPronunciationScoringReady: false;
  };
};

export type GavanWeek1ContentAuthoringSeed = {
  kind: 'gavan_week1_content_authoring_seed';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: 'content_authoring_seed_not_live';
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  forbiddenContentPatterns: string[];
  legacyResetPolicy: {
    legacyArtifactsTreatedAs: 'non_canonical_reset_evidence';
    mustNotCopyOldNarrowDays: true;
    resetReasons: string[];
  };
  days: GavanWeek1SeedDay[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: string[];
    liveFilesEdited: false;
  };
};

export type GavanWeek1ContentAuthoringSeedOptions = {
  generatedAt: string;
};

export type GavanWeek1ContentAuthoringSeedWriteOptions =
  GavanWeek1ContentAuthoringSeedOptions & {
    targetPath: string;
  };

export type GavanWeek1ContentAuthoringSeedIssueCode =
  | 'wrong_day_count'
  | 'live_integration_enabled'
  | 'forbidden_user_facing_term'
  | 'forbidden_anchor_present'
  | 'missing_required_exercise_type'
  | 'missing_explanation_coverage'
  | 'invalid_minute_choices'
  | 'fake_audio_claim'
  | 'fake_pronunciation_claim'
  | 'target_path_not_allowed';

export type GavanWeek1ContentAuthoringSeedIssue = {
  code: GavanWeek1ContentAuthoringSeedIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1ContentAuthoringSeedValidationResult = {
  valid: boolean;
  issues: GavanWeek1ContentAuthoringSeedIssue[];
};

export type GavanWeek1ContentAuthoringSeedWriteResult = {
  valid: boolean;
  issues: GavanWeek1ContentAuthoringSeedIssue[];
  targetPath?: string;
  bytesWritten?: number;
  seed?: GavanWeek1ContentAuthoringSeed;
};

function issue(
  code: GavanWeek1ContentAuthoringSeedIssueCode,
  detail: string,
  target?: string,
): GavanWeek1ContentAuthoringSeedIssue {
  return { code, detail, target };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1ContentAuthoringSeedTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function loadByMinutes(): GavanWeek1SeedDay['loadByMinutes'] {
  return {
    5: { targetMinutes: 5, exerciseBlockCount: 1, phraseCount: 1 },
    10: { targetMinutes: 9, exerciseBlockCount: 2, phraseCount: 2 },
    15: { targetMinutes: 14, exerciseBlockCount: 3, phraseCount: 3 },
    20: { targetMinutes: 18, exerciseBlockCount: 4, phraseCount: 4 },
  };
}

function explanation(
  phraseId: string,
  covers: string[],
  correctFeedbackRu: string,
  wrongFeedbackRu: string,
): GavanWeek1SeedExplanationCard {
  return {
    id: `${phraseId}:explanation-1`,
    covers,
    correctFeedbackRu,
    wrongFeedbackRu,
    correctTone: 'calm_confirming',
    wrongTone: 'supportive_repair',
    mustNotMentionUnseenWrongOption: true,
  };
}

function phrase(
  id: string,
  english: string,
  meaningRu: string,
  newWords: string[],
  firstSeenConstructions: string[],
  correctFeedbackRu: string,
  wrongFeedbackRu: string,
): GavanWeek1SeedPhrase {
  return {
    id,
    english,
    meaningRu,
    newWords,
    firstSeenConstructions,
    explanationCards: [
      explanation(
        id,
        [...newWords, ...firstSeenConstructions],
        correctFeedbackRu,
        wrongFeedbackRu,
      ),
    ],
    finalCopyApproved: false,
  };
}

function block(
  dayIndex: number,
  index: number,
  exerciseType: GavanWeek1SeedExerciseType,
  userFacingLabelRu: string,
  purposeRu: string,
  sourcePhraseIds: string[],
): GavanWeek1SeedExerciseBlock {
  return {
    id: `gavan-week1-day${dayIndex}:seed-block-${index}`,
    exerciseType,
    userFacingLabelRu,
    purposeRu,
    sourcePhraseIds,
    finalExerciseBuilt: false,
    wrongAnswerPolicy: {
      mustNotInventUnseenOptions: true,
      explainCorrectIdeaOnly: true,
    },
  };
}

function day(
  dayIndex: GavanWeek1SeedDay['dayIndex'],
  userFacingTitle: string,
  universalGoal: string,
  bridgeNoteRu: string,
  phraseRows: Array<[
    string,
    string,
    string[],
    string[],
    string,
    string,
  ]>,
  exerciseRows: Array<[
    GavanWeek1SeedExerciseType,
    string,
    string,
  ]>,
  quizFocusRu: string,
): GavanWeek1SeedDay {
  const phrases = phraseRows.map((row, index) =>
    phrase(
      `gavan-week1-day${dayIndex}:phrase-${index + 1}`,
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
    ),
  );
  const phraseIds = phrases.map((item) => item.id);

  return {
    dayId: `gavan-week1-day${dayIndex}`,
    dayIndex,
    userFacingTitle,
    universalGoal,
    socialSafety: 'broad_everyday_public',
    userFacingCopyMustAvoidDevLanguage: true,
    lessonBridge: {
      prerequisiteLessonIds: ['lesson-1'],
      bridgeNoteRu,
      mustExplainBeforeUse: true,
    },
    loadByMinutes: loadByMinutes(),
    exerciseBlocks: exerciseRows.map((row, index) =>
      block(dayIndex, index + 1, row[0], row[1], row[2], phraseIds),
    ),
    phraseBank: phrases,
    quizIntent: {
      questionCount: 10,
      finalQuizWritten: false,
      focusRu: quizFocusRu,
    },
    recallPlan: {
      enabled: true,
      errorsReturnLater: true,
      noHintsOnRecall: true,
      orderChanges: true,
    },
    mediaClaims: {
      audioAssetStatus: 'not_generated',
      pronunciationScoringStatus: 'not_built',
      finalAudioReady: false,
      finalPronunciationScoringReady: false,
    },
  };
}

export function buildGavanWeek1ContentAuthoringSeed(
  options: GavanWeek1ContentAuthoringSeedOptions,
): GavanWeek1ContentAuthoringSeed {
  return {
    kind: 'gavan_week1_content_authoring_seed',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'content_authoring_seed_not_live',
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    forbiddenContentPatterns: [...FORBIDDEN_CONTENT_PATTERNS],
    legacyResetPolicy: {
      legacyArtifactsTreatedAs: 'non_canonical_reset_evidence',
      mustNotCopyOldNarrowDays: true,
      resetReasons: [
        'Old day copy was too narrow for a broad product plan.',
        'Identity and relocation anchors must not be required in the first week.',
        'Feedback must explain the correct idea without inventing unseen wrong choices.',
      ],
    },
    days: [
      day(1, 'Старт без ступора',
        'Коротко сказать, что ты здесь, готов или пока не уверен, без личных данных.',
        'День опирается на базовое I am / it is и сразу дает короткие бытовые фразы без личных данных.',
        [
          ['I am here.', 'Я здесь.', ['here'], ['I am'], 'Да, это короткая и нормальная фраза: I am говорит о тебе, here значит здесь.', 'Собираем простую мысль: сначала I am, потом место или состояние. Никаких лишних деталей.'],
          ['I am ready.', 'Я готов.', ['ready'], ['I am'], 'Ready значит готов. Фраза звучит спокойно и подходит почти везде.', 'Если мысль про себя, начинаем с I am. Ready ставим после, без украшений.'],
          ["I'm not sure.", 'Я не уверен.', ['sure'], ["I'm not"], "I'm not sure звучит мягко: ты не споришь, а честно говоришь, что пока не уверен.", "Not ставит отрицание после I'm. Так фраза остается короткой и понятной."],
          ["It's okay.", 'Все нормально.', ['okay'], ["It's"], "It's okay - универсальное спокойное подтверждение: без драмы, без объяснений на три этажа.", "It's говорит про ситуацию: все нормально, можно продолжать."],
        ],
        [
          ['lesson_bridge', 'Короткая база', 'Сначала вспоминаем I am и it is, потом используем их в живых фразах.'],
          ['phrase_build', 'Собрать фразу', 'Собрать короткую фразу из знакомых кусочков.'],
          ['natural_choice', 'Выбрать естественно', 'Отличить нормальную короткую фразу от перегруженной.'],
        ],
        'Проверить, где I am, где it is, и как коротко сказать состояние.',
      ),
      day(2, 'Повторить и замедлить',
        'Спокойно переспросить, когда речь прозвучала быстро или часть фразы потерялась.',
        'День добавляет Could you как мягкую просьбу и заранее объясняет слова again, slower и catch.',
        [
          ['Could you say that again?', 'Можете сказать это еще раз?', ['could', 'again'], ['Could you'], 'Could you звучит вежливо и спокойно. Again значит еще раз.', 'Для просьбы ставим Could you в начало. Так фраза звучит мягче, чем резкий приказ.'],
          ['Could you say it slower?', 'Можете сказать медленнее?', ['slower'], ['Could you'], 'Slower значит медленнее. Это нормальная просьба, когда темп слишком быстрый.', 'Смысл простой: Could you + действие. Просим темп, не извиняемся пять раз.'],
          ["I didn't catch that.", 'Я не расслышал.', ['catch'], ["didn't"], 'Catch здесь не про ловить руками, а про то, что смысл не успел дойти на слух.', "Didn't показывает, что не получилось понять. Это обычная живая фраза, без стыда и без длинных объяснений."],
          ['One more time, please.', 'Еще раз, пожалуйста.', ['more', 'please'], ['One more time'], 'One more time - короткая просьба повторить. Please добавляет вежливость.', 'Здесь нет сложной грамматики: готовая фраза, которую удобно помнить целиком.'],
        ],
        [
          ['lesson_bridge', 'Мягко переспросить', 'Перед просьбами объясняем Could you и зачем оно звучит спокойно.'],
          ['listening_choice', 'Узнать на слух', 'Подготовить короткое аудио на просьбу повторить или сказать медленнее.'],
          ['active_recall', 'Вспомнить без подсказки', 'Повторить просьбу в новом порядке без подсветок.'],
        ],
        'Проверить просьбы повторить, сказать медленнее и честно сказать, что не расслышал.',
      ),
      day(3, 'Сказать, что нужно',
        'Коротко попросить помощь, минуту или проверку, не превращая разговор в длинное объяснение.',
        'День вводит I need как простую конструкцию для просьбы о действии или времени.',
        [
          ['I need some help.', 'Мне нужна помощь.', ['need', 'help'], ['I need'], 'I need значит мне нужно. Some help звучит мягко и естественно.', 'Если нужно попросить помощь, I need дает понятный старт без лишней истории.'],
          ['I need a minute.', 'Мне нужна минута.', ['minute'], ['I need'], 'A minute часто значит немного времени, а не ровно шестьдесят секунд.', 'I need a minute - нормальный способ выиграть время и не зависнуть.'],
          ['I need to check.', 'Мне нужно проверить.', ['check'], ['I need to'], 'I need to + действие: мне нужно что-то сделать.', 'После I need to ставим действие. Здесь действие - check, проверить.'],
          ['Could you help me with this?', 'Можете помочь мне с этим?', ['with', 'this'], ['Could you'], 'With this значит с этим. Можно показать на предмет или экран, не называя детали.', 'Could you help me звучит вежливо. With this добавляет контекст без лишних слов.'],
        ],
        [
          ['lesson_bridge', 'Что нужно', 'Сначала объясняем I need, потом тренируем короткие просьбы.'],
          ['missing_word', 'Вставить слово', 'Вставить need, help или check по смыслу.'],
          ['quick_reply', 'Ответить быстро', 'Выбрать короткий ответ, когда нужно немного времени.'],
        ],
        'Проверить I need, I need to и просьбу о помощи.',
      ),
      day(4, 'Проверить понимание',
        'Уточнить, правильно ли ты понял место, действие или следующий шаг.',
        'День связывает is it / is this с короткими вопросами без новых тяжелых правил.',
        [
          ['Is this right?', 'Так правильно?', ['right'], ['Is this'], 'Right здесь значит правильно. This - то, на что ты смотришь или показываешь.', 'В вопросе Is this порядок меняется: сначала is, потом this.'],
          ['Is it here?', 'Это здесь?', ['here'], ['Is it'], 'Is it here - короткий вопрос про место.', 'Для вопроса про ситуацию или предмет подходит it.'],
          ['Is that okay?', 'Так нормально?', ['that'], ['Is that'], 'That можно использовать, когда говоришь о варианте, который уже показали или сказали.', 'Is that okay - мягкая проверка, подходит в быту и в сервисе.'],
          ['Do I need anything else?', 'Мне нужно что-то еще?', ['anything', 'else'], ['Do I need'], 'Anything else значит что-то еще. Вопрос помогает не уйти слишком рано.', 'Do I need - вопросная форма для I need. Смысл: нужно ли мне еще что-то.'],
        ],
        [
          ['lesson_bridge', 'Короткий вопрос', 'Перед вопросами объясняем порядок слов в Is this и Is it.'],
          ['natural_choice', 'Проверить смысл', 'Выбрать вопрос, который не звучит странно.'],
          ['mistake_repair', 'Починить ошибку', 'Исправить порядок слов в коротком вопросе.'],
        ],
        'Проверить короткие вопросы this, that, it и anything else.',
      ),
      day(5, 'Попросить проще',
        'Попросить объяснить проще, показать или записать, когда слов пока не хватает.',
        'День учит просить помощь с формой подачи: проще, показать, записать.',
        [
          ['Could you explain it simply?', 'Можете объяснить проще?', ['explain', 'simply'], ['Could you'], 'Explain значит объяснить, simply - просто или понятнее.', 'Фраза не обвиняет собеседника, а просит удобный формат.'],
          ['Could you show me?', 'Можете показать мне?', ['show'], ['Could you'], 'Show значит показать. Иногда увидеть проще, чем слушать длинное объяснение.', 'Could you show me - короткая вежливая просьба без лишних деталей.'],
          ['Can you write it down?', 'Можете записать это?', ['write', 'down'], ['Can you'], 'Write it down значит записать. Down здесь часть устойчивой фразы.', 'Can you проще и чуть прямее, чем Could you, но все еще нормально.'],
          ['Please use simple words.', 'Пожалуйста, используйте простые слова.', ['use', 'simple', 'words'], ['Please use'], 'Simple words - простые слова. Фраза помогает снизить сложность разговора.', 'Please use звучит как просьба. Она нормальная, если сказать спокойно.'],
        ],
        [
          ['lesson_bridge', 'Просьба о формате', 'Сначала объясняем explain, show, write down, потом тренируем выбор.'],
          ['phrase_build', 'Собрать просьбу', 'Собрать просьбу показать или записать.'],
          ['listening_choice', 'Услышать просьбу', 'Позже отличить explain, show и write down на слух.'],
        ],
        'Проверить просьбы explain simply, show me и write it down.',
      ),
      day(6, 'Ответить коротко',
        'Сказать, подходит ли вариант, можешь ли ты сделать это сейчас или вернешься позже.',
        'День вводит works for me, can, cannot и will как короткие ответы на предложение.',
        [
          ['That works for me.', 'Мне подходит.', ['works'], ['works for me'], 'Works for me значит мне подходит. Это живой короткий ответ.', 'Фраза не про работу буквально: works здесь значит подходит.'],
          ['I can do that.', 'Я могу это сделать.', ['can', 'do'], ['I can'], 'Can значит могу. Do that - сделать это.', 'I can do that звучит уверенно и коротко.'],
          ["I can't do that today.", 'Сегодня я не могу это сделать.', ['today'], ["I can't"], "Can't - короткое отрицание от can. Today уточняет время.", "Если не можешь сегодня, так и говорим: I can't do that today."],
          ["I'll check and come back.", 'Я проверю и вернусь.', ['come back'], ["I'll"], "I'll - коротко от I will. Come back значит вернуться.", 'Фраза полезна, когда нужно время проверить и ответить позже.'],
        ],
        [
          ['lesson_bridge', 'Короткий ответ', 'Сначала объясняем can, cannot и will без перегруза.'],
          ['quick_reply', 'Выбрать ответ', 'Быстро выбрать, подходит вариант или нет.'],
          ['pronunciation_shadow', 'Повторить вслух', 'Позже потренировать ритм короткого ответа без финального скоринга.'],
        ],
        'Проверить works for me, can, cannot и I will.',
      ),
      day(7, 'Собрать разговор',
        'Связать просьбу, уточнение и короткий ответ в один спокойный мини-разговор.',
        'День собирает фразы недели без новых обязательных конструкций.',
        [
          ['Let me check.', 'Дайте мне проверить.', ['let', 'check'], ['Let me'], 'Let me check значит дайте мне проверить. Звучит естественно и коротко.', 'Фразу удобно помнить целиком: она дает паузу без неловкости.'],
          ['I think I understand.', 'Кажется, я понял.', ['think', 'understand'], ['I think'], 'I think смягчает ответ. Understand значит понимать.', 'Так можно подтвердить понимание без чрезмерной уверенности.'],
          ['I have one question.', 'У меня один вопрос.', ['have', 'question'], ['I have'], 'I have one question - нормальный вход в уточнение.', 'One question звучит коротко и не пугает длинным списком.'],
          ["Thanks, that's clear.", 'Спасибо, теперь понятно.', ['clear'], ["that's"], 'Clear значит понятно. Thanks звучит естественно и тепло.', "That's clear - короткое подтверждение, что объяснение помогло."],
        ],
        [
          ['lesson_bridge', 'Собрать неделю', 'Повторяем только то, что уже объяснялось в неделе.'],
          ['micro_dialogue', 'Мини-разговор', 'Выбрать следующий короткий ответ в бытовом обмене.'],
          ['active_recall', 'Закрепить без подсказок', 'Вернуть фразы недели в другом порядке.'],
          ['mistake_repair', 'Исправить слабое место', 'Повторить ошибки недели без подсветок.'],
        ],
        'Проверить фразы недели в смешанном порядке.',
      ),
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

function hasForbiddenUserFacingTerm(day: GavanWeek1SeedDay): boolean {
  const userFacing = [
    day.userFacingTitle,
    day.universalGoal,
    day.lessonBridge.bridgeNoteRu,
    day.quizIntent.focusRu,
    ...day.exerciseBlocks.flatMap((blockItem) => [
      blockItem.userFacingLabelRu,
      blockItem.purposeRu,
    ]),
  ].join(' ').toLowerCase();

  return FORBIDDEN_USER_FACING_TERMS.some((term) => userFacing.includes(term));
}

function phraseMissingExplanation(phraseItem: GavanWeek1SeedPhrase): boolean {
  const covered = new Set(phraseItem.explanationCards.flatMap((card) => card.covers));
  return [...phraseItem.newWords, ...phraseItem.firstSeenConstructions]
    .some((target) => !covered.has(target));
}

function hasInvalidMinuteChoices(dayItem: GavanWeek1SeedDay): boolean {
  return JSON.stringify(Object.keys(dayItem.loadByMinutes)) !== JSON.stringify(['5', '10', '15', '20']);
}

export function validateGavanWeek1ContentAuthoringSeed(
  seed: GavanWeek1ContentAuthoringSeed,
): GavanWeek1ContentAuthoringSeedValidationResult {
  const issues: GavanWeek1ContentAuthoringSeedIssue[] = [];

  if (seed.days.length !== 7) {
    issues.push(issue('wrong_day_count', 'Gavan week 1 content seed must contain exactly 7 days.'));
  }

  if (seed.liveIntegration || seed.sourceWritesUsed || seed.phaseWriteTargets.length > 0) {
    issues.push(issue('live_integration_enabled', 'Content seed must stay non-live.'));
  }

  const serializedDays = JSON.stringify(seed.days);
  FORBIDDEN_CONTENT_MATCHERS.forEach(([pattern, matcher]) => {
    if (matcher.test(serializedDays)) {
      issues.push(issue('forbidden_anchor_present', `Forbidden anchor found: ${pattern}`, pattern));
    }
  });

  seed.days.forEach((dayItem) => {
    if (hasForbiddenUserFacingTerm(dayItem)) {
      issues.push(issue(
        'forbidden_user_facing_term',
        'User-facing content contains a banned product-copy term.',
        dayItem.dayId,
      ));
    }

    if (!dayItem.exerciseBlocks.some((blockItem) => blockItem.exerciseType === 'lesson_bridge')) {
      issues.push(issue(
        'missing_required_exercise_type',
        'Each day must begin from a lesson bridge before plan-specific practice.',
        dayItem.dayId,
      ));
    }

    if (hasInvalidMinuteChoices(dayItem)) {
      issues.push(issue('invalid_minute_choices', 'Only 5, 10, 15, and 20 minute loads are allowed.', dayItem.dayId));
    }

    if (dayItem.mediaClaims.audioAssetStatus !== 'not_generated' || dayItem.mediaClaims.finalAudioReady) {
      issues.push(issue('fake_audio_claim', 'Seed must not claim generated audio.', dayItem.dayId));
    }

    if (
      dayItem.mediaClaims.pronunciationScoringStatus !== 'not_built' ||
      dayItem.mediaClaims.finalPronunciationScoringReady
    ) {
      issues.push(issue('fake_pronunciation_claim', 'Seed must not claim pronunciation scoring.', dayItem.dayId));
    }

    dayItem.phraseBank.forEach((phraseItem) => {
      if (phraseMissingExplanation(phraseItem)) {
        issues.push(issue(
          'missing_explanation_coverage',
          'Every new word and first-seen construction must be covered by an explanation card.',
          phraseItem.id,
        ));
      }
    });
  });

  const exerciseTypes = new Set(
    seed.days.flatMap((dayItem) => dayItem.exerciseBlocks.map((blockItem) => blockItem.exerciseType)),
  );
  REQUIRED_EXERCISE_TYPES.forEach((exerciseType) => {
    if (!exerciseTypes.has(exerciseType)) {
      issues.push(issue('missing_required_exercise_type', `Missing exercise type: ${exerciseType}`, exerciseType));
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function writeGavanWeek1ContentAuthoringSeed(
  options: GavanWeek1ContentAuthoringSeedWriteOptions,
): GavanWeek1ContentAuthoringSeedWriteResult {
  if (!isGavanWeek1ContentAuthoringSeedTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const seed = buildGavanWeek1ContentAuthoringSeed({
    generatedAt: options.generatedAt,
  });
  const validation = validateGavanWeek1ContentAuthoringSeed(seed);

  if (!validation.valid) {
    return validation;
  }

  const resolvedTarget = path.resolve(options.targetPath);
  mkdirSync(path.dirname(resolvedTarget), { recursive: true });
  const body = `${JSON.stringify(seed, null, 2)}\n`;
  writeFileSync(resolvedTarget, body, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTarget,
    bytesWritten: Buffer.byteLength(body, 'utf8'),
    seed,
  };
}

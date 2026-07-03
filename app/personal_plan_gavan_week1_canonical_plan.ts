export type GavanCanonicalExerciseType =
  | 'lesson_bridge'
  | 'phrase_build'
  | 'missing_word'
  | 'natural_choice'
  | 'listening_choice'
  | 'phrase_recall'
  | 'quick_reply'
  | 'mistake_repair'
  | 'micro_dialogue'
  | 'pronunciation_shadow';

export type GavanCanonicalExplanationCard = {
  id: string;
  covers: string[];
  correctRu: string;
  wrongRu: string;
  mustNotMentionUnseenWrongOption: true;
};

export type GavanCanonicalPhrase = {
  id: string;
  english: string;
  ru: string;
  uk?: string;
  es?: string;
  newWords: string[];
  firstSeenConstructions: string[];
  explanationCards: GavanCanonicalExplanationCard[];
};

export type GavanCanonicalExerciseBlock = {
  id: string;
  exerciseType: GavanCanonicalExerciseType;
  titleRu: string;
  purposeRu: string;
  phraseIds: string[];
  estimatedMinutes: number;
  prerequisiteLessonIds: number[];
  progressionRole: 'open' | 'practice' | 'recall' | 'check' | 'media_prepare';
  errorsReturnLater: boolean;
};

export type GavanCanonicalLoad = {
  estimatedMinutes: number;
  blockIds: string[];
  phraseCount: number;
};

export type GavanCanonicalDay = {
  dayId: string;
  dayIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  titleRu: string;
  goalRu: string;
  prerequisiteSummaryRu: string;
  loadByMinutes: Record<5 | 10 | 15 | 20, GavanCanonicalLoad>;
  phrases: GavanCanonicalPhrase[];
  exerciseBlocks: GavanCanonicalExerciseBlock[];
};

export type GavanWeek1CanonicalPlan = {
  planId: 'gavan';
  weekIndex: 1;
  status: 'canonical_ready_for_runtime_bridge';
  productPrinciples: string[];
  days: GavanCanonicalDay[];
};

export type GavanWeek1CanonicalPlanIssue = {
  code:
    | 'wrong_day_count'
    | 'missing_lesson_bridge'
    | 'missing_minute_load'
    | 'load_not_progressive'
    | 'missing_exercise_type'
    | 'missing_explanation'
    | 'bad_copy';
  target: string;
};

export type GavanWeek1CanonicalValidationResult = {
  valid: boolean;
  issues: GavanWeek1CanonicalPlanIssue[];
};

export type GavanWeek1ImplementationQueueItem = {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  titleRu: string;
  acceptanceRu: string;
  fileTargets: string[];
};

const REQUIRED_TYPES: GavanCanonicalExerciseType[] = [
  'lesson_bridge',
  'phrase_build',
  'missing_word',
  'natural_choice',
  'listening_choice',
  'phrase_recall',
  'quick_reply',
  'mistake_repair',
  'micro_dialogue',
  'pronunciation_shadow',
];

const BAD_COPY_RE =
  /\b(?:dev|debug|draft|placeholder|scene|scenario|apartment|viewing|landlord|rent|phone|email|passport number|doctor appointment|alex|beta)\b|@|\d{3,}/i;
const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/;

type PhraseRow = [
  string,
  string,
  string[],
  string[],
  string,
  string,
  string?,
];

type BlockRow = [
  GavanCanonicalExerciseType,
  string,
  string,
  number,
  GavanCanonicalExerciseBlock['progressionRole'],
];

function card(
  phraseId: string,
  covers: string[],
  correctRu: string,
  wrongRu: string,
): GavanCanonicalExplanationCard {
  return {
    id: `${phraseId}:after-answer`,
    covers,
    correctRu,
    wrongRu,
    mustNotMentionUnseenWrongOption: true,
  };
}

function phrase(
  dayIndex: number,
  index: number,
  row: PhraseRow,
): GavanCanonicalPhrase {
  const id = `gavan-week1-day${dayIndex}:phrase-${index}`;
  const [english, ru, newWords, firstSeenConstructions, correctRu, wrongRu, es] = row;
  const covers = [...newWords, ...firstSeenConstructions];

  return {
    id,
    english,
    ru,
    ...(es ? { es } : {}),
    newWords,
    firstSeenConstructions,
    explanationCards: [card(id, covers, correctRu, wrongRu)],
  };
}

function block(
  dayIndex: number,
  index: number,
  row: BlockRow,
  phraseIds: string[],
): GavanCanonicalExerciseBlock {
  const [exerciseType, titleRu, purposeRu, estimatedMinutes, progressionRole] = row;

  return {
    id: `gavan-week1-day${dayIndex}:block-${index}`,
    exerciseType,
    titleRu,
    purposeRu,
    phraseIds: [...phraseIds],
    estimatedMinutes,
    prerequisiteLessonIds: [1],
    progressionRole,
    errorsReturnLater: exerciseType !== 'lesson_bridge',
  };
}

function loadByMinutes(blocks: GavanCanonicalExerciseBlock[]): GavanCanonicalDay['loadByMinutes'] {
  const pick = (count: number): GavanCanonicalExerciseBlock[] => blocks.slice(0, count);
  const load = (items: GavanCanonicalExerciseBlock[]): GavanCanonicalLoad => ({
    estimatedMinutes: Math.min(20, items.reduce((sum, item) => sum + item.estimatedMinutes, 0)),
    blockIds: items.map((item) => item.id),
    phraseCount: Math.max(1, Math.min(4, items.length)),
  });

  return {
    5: load(pick(1)),
    10: load(pick(2)),
    15: load(pick(Math.min(3, blocks.length))),
    20: load(pick(blocks.length)),
  };
}

function day(
  dayIndex: GavanCanonicalDay['dayIndex'],
  titleRu: string,
  goalRu: string,
  prerequisiteSummaryRu: string,
  phraseRows: PhraseRow[],
  blockRows: BlockRow[],
): GavanCanonicalDay {
  const phrases = phraseRows.map((row, index) => phrase(dayIndex, index + 1, row));
  const phraseIds = phrases.map((item) => item.id);
  const exerciseBlocks = blockRows.map((row, index) => block(dayIndex, index + 1, row, phraseIds));

  return {
    dayId: `gavan-week1-day${dayIndex}`,
    dayIndex,
    titleRu,
    goalRu,
    prerequisiteSummaryRu,
    loadByMinutes: loadByMinutes(exerciseBlocks),
    phrases,
    exerciseBlocks,
  };
}

function buildDays(): GavanCanonicalDay[] {
  return [
    day(
      1,
      'Старт без ступора',
      'Коротко сказать, что ты здесь, готов, просишь минуту или просишь повторить.',
      'Опираемся на урок 1: I am, I need, короткая просьба без личных данных.',
      [
        ['I am here.', 'Я здесь.', ['here'], ['I am'], 'Верно: короткая фраза без лишних деталей. Here значит здесь, а I am спокойно говорит о тебе.', 'Собираем простую мысль: сначала I am, потом место или состояние. Так фраза остаётся понятной и взрослой.', 'Estoy aquí.'],
        ['I am ready.', 'Я готов.', ['ready'], ['I am'], 'Да, ready значит готов. Фраза звучит спокойно и подходит почти в любой обычной ситуации.', 'Если говорим о себе, начинаем с I am. Ready ставим после, без украшений и лишней официальности.', 'Estoy listo.'],
        ['I need a minute.', 'Мне нужна минута.', ['need', 'minute'], ['I need'], 'Хорошо: I need a minute даёт паузу без неловкости. Minute здесь не про точное время, а про короткую передышку.', 'Держим смысл: I need говорит мне нужно, a minute добавляет спокойную паузу. Это нормальная просьба, не оправдание.', 'Necesito un minuto.'],
        ['Could you repeat that?', 'Можете повторить?', ['repeat', 'that'], ['Could you'], 'Отлично: Could you звучит мягко, repeat значит повторить, that указывает на сказанное только что.', 'Для вежливой просьбы ставим Could you в начало. Так звучит спокойно, даже если ты просишь повторить второй раз.', '¿Podría repetir eso?'],
      ],
      [
        ['lesson_bridge', 'База перед стартом', 'Сначала вспоминаем короткие I am и I need, потом сразу используем их в обычных фразах.', 4, 'open'],
        ['phrase_build', 'Собери фразу', 'Собрать короткую фразу из точного количества слов, как в уроках.', 5, 'practice'],
        ['natural_choice', 'Выбери живой вариант', 'Отличить нормальную короткую фразу от странной или перегруженной.', 4, 'practice'],
        ['phrase_recall', 'Вспомни без подсказок', 'Повторить фразы в другом порядке, без подсветки правильных слов.', 4, 'recall'],
      ],
    ),
    day(
      2,
      'Попросить повторить',
      'Спокойно переспросить, если речь прозвучала быстро или часть смысла потерялась.',
      'Опираемся на Could you из дня 1 и добавляем again, slower, catch.',
      [
        ['Could you say that again?', 'Можете сказать это ещё раз?', ['again'], ['Could you'], 'Да, again значит ещё раз. Could you делает просьбу мягкой и нормальной для живого разговора.', 'Смысл простой: просьба начинается с Could you, потом действие. Так ты не звучишь резко.', '¿Podría decir eso otra vez?'],
        ['Could you say it slower?', 'Можете сказать медленнее?', ['slower'], ['Could you'], 'Верно: slower значит медленнее. Это обычная просьба, когда темп слишком быстрый.', 'Просим темп, не извиняемся пять раз. Could you помогает сделать фразу вежливой.', '¿Podría decirlo más despacio?'],
        ["I didn't catch that.", 'Я не расслышал.', ['catch'], ["didn't"], 'Хорошо: catch здесь значит уловить смысл на слух. Фраза звучит естественно, когда ты не расслышал.', 'Didn’t показывает, что не получилось понять. Это не ошибка общения, а нормальная просьба уточнить.', 'No alcancé a entenderlo.'],
        ['One more time, please.', 'Ещё раз, пожалуйста.', ['more', 'please'], ['One more time'], 'Да, это готовая короткая просьба. Please добавляет вежливость без длинной фразы.', 'Фраза работает целиком: One more time, please. Её удобно помнить как один спокойный блок.', 'Una vez más, por favor.'],
      ],
      [
        ['lesson_bridge', 'Мягко переспросить', 'Перед тренировкой разбираем, как Could you помогает звучать спокойно.', 4, 'open'],
        ['listening_choice', 'Узнай на слух', 'Позже сюда подключим короткое аудио: повторить, медленнее, ещё раз.', 5, 'media_prepare'],
        ['phrase_build', 'Собери просьбу', 'Собрать просьбу повторить или сказать медленнее из знакомых слов.', 5, 'practice'],
        ['phrase_recall', 'Повтор без подсказок', 'Вернуть фразы дня в новом порядке и закрепить ошибки.', 4, 'recall'],
      ],
    ),
    day(
      3,
      'Сказать, что нужно',
      'Коротко попросить помощь, время или проверку без длинного объяснения.',
      'Опираемся на I need из дня 1 и добавляем help, check, more time.',
      [
        ['I need some help.', 'Мне нужна помощь.', ['some', 'help'], ['I need'], 'Да, some help звучит мягко: нужна помощь, но без паники. Фраза короткая и очень частая.', 'I need держит основу просьбы. Some help делает её обычной человеческой фразой, не приказом.', 'Necesito un poco de ayuda.'],
        ['I need to check this.', 'Мне нужно это проверить.', ['check', 'this'], ['I need to'], 'Верно: I need to check this говорит, что тебе нужно проверить это. This указывает на предмет или информацию рядом.', 'После I need to ставим действие. Check this звучит коротко и понятно.', 'Necesito comprobar esto.'],
        ['Can you help me with this?', 'Можете помочь мне с этим?', ['with'], ['Can you'], 'Хорошо: with this значит с этим. Can you звучит прямо, но всё ещё нормально и вежливо.', 'Фраза просит помощь с конкретной вещью, не раскрывая личные данные и не растягивая разговор.', '¿Puede ayudarme con esto?'],
        ['I need a little more time.', 'Мне нужно немного больше времени.', ['little', 'time'], ['I need'], 'Да, a little more time звучит мягко: нужно немного больше времени, а не бесконечная пауза.', 'Строим от I need. A little more time добавляет понятную, спокойную просьбу.', 'Necesito un poco más de tiempo.'],
      ],
      [
        ['lesson_bridge', 'Нужно без лишнего', 'Сначала разбираем I need и I need to, потом тренируем короткие просьбы.', 4, 'open'],
        ['missing_word', 'Вставь ключевое слово', 'Проверить help, check, this и time в уже понятных фразах.', 5, 'practice'],
        ['phrase_build', 'Собери просьбу', 'Собрать фразу с I need или Can you без лишних слов.', 5, 'practice'],
        ['phrase_recall', 'Вернуть слабое', 'Ошибки возвращаются в конце круга и позже в повтор.', 4, 'recall'],
      ],
    ),
    day(
      4,
      'Проверить понимание',
      'Уточнить, правильно ли ты понял место, действие или следующий шаг.',
      'Опираемся на короткие вопросы с is, this, that и Do I need.',
      [
        ['Is this right?', 'Так правильно?', ['right'], ['Is this'], 'Да, right здесь значит правильно. Is this помогает быстро проверить то, что перед тобой.', 'В вопросе порядок меняется: сначала is, потом this. Так английский слышит вопрос.', '¿Esto está bien?'],
        ['Is it here?', 'Это здесь?', ['here'], ['Is it'], 'Верно: Is it here коротко проверяет место. It подходит для предмета, места или ситуации.', 'Если спрашиваем про место, here ставится в конце. Фраза получается короткой и ясной.', '¿Está aquí?'],
        ['Is that okay?', 'Так нормально?', ['that', 'okay'], ['Is that'], 'Хорошо: Is that okay мягко проверяет, подходит ли вариант. That указывает на уже сказанное или показанное.', 'Это безопасная фраза для быта и сервиса. Она не звучит как спор.', '¿Eso está bien?'],
        ['Do I need anything else?', 'Мне нужно что-то ещё?', ['anything', 'else'], ['Do I need'], 'Да, anything else значит что-то ещё. Фраза помогает не уйти слишком рано.', 'Do I need превращает I need в вопрос. Смысл: нужно ли мне ещё что-то.', '¿Necesito algo más?'],
      ],
      [
        ['lesson_bridge', 'Короткий вопрос', 'Разбираем порядок слов в Is this, Is it и Do I need.', 4, 'open'],
        ['natural_choice', 'Выбери вопрос', 'Выбрать вопрос, который звучит естественно и подходит к смыслу.', 4, 'practice'],
        ['quick_reply', 'Ответь быстро', 'Выбрать короткую реакцию без долгого чтения вариантов.', 4, 'practice'],
        ['mistake_repair', 'Почини порядок', 'Исправить порядок слов в коротком вопросе.', 4, 'check'],
        ['phrase_recall', 'Вспомни вопросы', 'Вернуть вопросы дня без подсказок и подсветки.', 3, 'recall'],
      ],
    ),
    day(
      5,
      'Попросить проще',
      'Попросить объяснить проще, показать или записать, когда слов пока не хватает.',
      'Опираемся на Could you и Can you, добавляем explain, show, write down.',
      [
        ['Could you explain it simply?', 'Можете объяснить проще?', ['explain', 'simply'], ['Could you'], 'Верно: explain значит объяснить, simply значит проще. Фраза просит удобный формат, а не обвиняет человека.', 'Could you помогает звучать мягко. Simply ставим в конце, чтобы попросить проще.', '¿Podría explicarlo de forma sencilla?'],
        ['Could you show me?', 'Можете показать мне?', ['show'], ['Could you'], 'Да, show значит показать. Иногда увидеть проще, чем слушать длинное объяснение.', 'Фраза короткая и вежливая: Could you show me. Никаких лишних уточнений не нужно.', '¿Podría mostrarme?'],
        ['Can you write it down?', 'Можете записать это?', ['write', 'down'], ['Can you'], 'Хорошо: write it down значит записать. Down здесь часть устойчивой фразы.', 'Can you звучит чуть прямее, чем Could you, но остаётся нормальной просьбой.', '¿Puede escribirlo?'],
        ['Please use simple words.', 'Пожалуйста, используйте простые слова.', ['use', 'simple', 'words'], ['Please use'], 'Да, simple words значит простые слова. Фраза помогает снизить сложность разговора.', 'Please use звучит как просьба, если сказать спокойно. Это нормально, когда нужно понять главное.', 'Por favor, use palabras sencillas.'],
      ],
      [
        ['lesson_bridge', 'Просьба о формате', 'Разбираем explain, show, write down и simple words перед практикой.', 4, 'open'],
        ['phrase_build', 'Собери просьбу', 'Собрать просьбу показать, записать или объяснить проще.', 5, 'practice'],
        ['listening_choice', 'Услышать просьбу', 'Позже подключим аудио, чтобы отличать explain, show и write down на слух.', 5, 'media_prepare'],
        ['natural_choice', 'Выбери естественно', 'Проверить, какая просьба звучит нормально в живом разговоре.', 4, 'practice'],
        ['phrase_recall', 'Повтор без подсказок', 'Закрепить просьбы дня в другом порядке.', 3, 'recall'],
      ],
    ),
    day(
      6,
      'Ответить коротко',
      'Сказать, подходит ли вариант, можешь ли ты это сделать сейчас или вернёшься позже.',
      'Опираемся на can, cannot, will и готовые короткие реакции.',
      [
        ['That works for me.', 'Мне подходит.', ['works'], ['works for me'], 'Да, works for me значит мне подходит. Это живой короткий ответ, не про работу буквально.', 'Works здесь значит подходит. Фраза помогает быстро согласиться без длинного объяснения.', 'Eso me va bien.'],
        ['I can do that.', 'Я могу это сделать.', ['can', 'do'], ['I can'], 'Верно: can значит могу, do that значит сделать это. Ответ короткий и уверенный.', 'Если можешь сделать, говорим I can do that. Это естественнее, чем длинная книжная фраза.', 'Puedo hacerlo.'],
        ["I can't do that today.", 'Сегодня я не могу это сделать.', ['today'], ["I can't"], 'Хорошо: can’t коротко отрицает can, today уточняет время. Фраза честная и спокойная.', 'Смысл не в отказе навсегда, а в сегодняшнем ограничении. Поэтому today важен.', 'No puedo hacerlo hoy.'],
        ["I'll check and come back.", 'Я проверю и вернусь.', ['check', 'come back'], ["I'll"], 'Да, I’ll значит I will. Come back значит вернуться, а check даёт время проверить.', 'Фраза полезна, когда нужно взять паузу и ответить позже. Она звучит нормально и по делу.', 'Lo revisaré y vuelvo.'],
      ],
      [
        ['lesson_bridge', 'Короткий ответ', 'Разбираем can, can’t и I’ll без перегруза.', 4, 'open'],
        ['quick_reply', 'Выбери реакцию', 'Быстро выбрать, подходит вариант или нет.', 4, 'practice'],
        ['missing_word', 'Вставь смысл', 'Проверить can, today, check и back в коротких ответах.', 5, 'practice'],
        ['pronunciation_shadow', 'Повтори вслух', 'Позже тренируем ритм короткого ответа без финального скоринга.', 4, 'media_prepare'],
        ['phrase_recall', 'Вернуть ответы', 'Повторить ответы без подсказок и перенести ошибки дальше.', 3, 'recall'],
      ],
    ),
    day(
      7,
      'Собрать разговор',
      'Связать просьбу, уточнение и короткий ответ в один спокойный мини-диалог.',
      'Повторяем только то, что уже было объяснено в неделе.',
      [
        ['Let me check.', 'Дайте мне проверить.', ['let', 'check'], ['Let me'], 'Верно: Let me check даёт паузу и звучит естественно. Это коротко и без паники.', 'Фраза работает целиком: Let me check. Её удобно держать как готовый инструмент.', 'Déjeme comprobarlo.'],
        ['I think I understand.', 'Кажется, я понял.', ['think', 'understand'], ['I think'], 'Да, I think смягчает ответ, а understand значит понимать. Звучит спокойно, без чрезмерной уверенности.', 'Так можно подтвердить понимание и оставить себе место уточнить, если что-то ещё неясно.', 'Creo que entiendo.'],
        ['I have one question.', 'У меня один вопрос.', ['have', 'question'], ['I have'], 'Хорошо: one question звучит коротко и не пугает длинным списком. Фраза вежливо открывает уточнение.', 'I have здесь значит у меня есть. Дальше ставим one question, и смысл сразу понятен.', 'Tengo una pregunta.'],
        ["Thanks, that's clear.", 'Спасибо, теперь понятно.', ['clear'], ["that's"], 'Да, clear значит понятно. Thanks добавляет нормальное человеческое завершение разговора.', 'That’s clear коротко подтверждает, что объяснение помогло. Фраза звучит тепло и спокойно.', 'Gracias, ahora está claro.'],
      ],
      [
        ['lesson_bridge', 'Собрать неделю', 'Перед финальной практикой повторяем только уже знакомые конструкции.', 4, 'open'],
        ['micro_dialogue', 'Мини-диалог', 'Выбрать следующий короткий ответ в бытовом обмене.', 5, 'practice'],
        ['mistake_repair', 'Почини слабое место', 'Вернуть ошибки недели и исправить их без подсветки.', 5, 'check'],
        ['phrase_recall', 'Фразы недели', 'Повторить фразы недели в смешанном порядке.', 4, 'recall'],
      ],
    ),
  ];
}

export function buildGavanWeek1CanonicalPlan(): GavanWeek1CanonicalPlan {
  return {
    planId: 'gavan',
    weekIndex: 1,
    status: 'canonical_ready_for_runtime_bridge',
    productPrinciples: [
      'План учит общим социально безопасным фразам, а не личным данным.',
      'Каждый день начинается с уроковой базы, затем даёт разные форматы практики.',
      'Ошибки не исчезают: они возвращаются в recall и персональную тренировку.',
      'Аудио и произношение не заявляются готовыми, пока нет реальных ассетов и скоринга.',
    ],
    days: buildDays(),
  };
}

function addIssue(
  issues: GavanWeek1CanonicalPlanIssue[],
  code: GavanWeek1CanonicalPlanIssue['code'],
  target: string,
) {
  issues.push({ code, target });
}

export function validateGavanWeek1CanonicalPlan(
  plan: GavanWeek1CanonicalPlan,
): GavanWeek1CanonicalValidationResult {
  const issues: GavanWeek1CanonicalPlanIssue[] = [];

  if (plan.days.length !== 7) addIssue(issues, 'wrong_day_count', 'week');

  const allTypes = new Set(
    plan.days.flatMap((dayItem) => dayItem.exerciseBlocks.map((blockItem) => blockItem.exerciseType)),
  );
  REQUIRED_TYPES.forEach((exerciseType) => {
    if (!allTypes.has(exerciseType)) addIssue(issues, 'missing_exercise_type', exerciseType);
  });

  plan.days.forEach((dayItem) => {
    if (dayItem.exerciseBlocks[0]?.exerciseType !== 'lesson_bridge') {
      addIssue(issues, 'missing_lesson_bridge', dayItem.dayId);
    }

    const loadKeys = Object.keys(dayItem.loadByMinutes);
    if (loadKeys.join('|') !== '5|10|15|20') {
      addIssue(issues, 'missing_minute_load', dayItem.dayId);
    }
    if (
      dayItem.loadByMinutes[10].blockIds.length <= dayItem.loadByMinutes[5].blockIds.length ||
      dayItem.loadByMinutes[20].blockIds.length <= dayItem.loadByMinutes[15].blockIds.length
    ) {
      addIssue(issues, 'load_not_progressive', dayItem.dayId);
    }

    dayItem.phrases.forEach((phraseItem) => {
      const fullText = JSON.stringify(phraseItem);
      if (BAD_COPY_RE.test(fullText) || MOJIBAKE_RE.test(fullText)) {
        addIssue(issues, 'bad_copy', phraseItem.id);
      }

      const covered = new Set(phraseItem.explanationCards.flatMap((cardItem) => cardItem.covers));
      [...phraseItem.newWords, ...phraseItem.firstSeenConstructions].forEach((target) => {
        if (!covered.has(target)) addIssue(issues, 'missing_explanation', `${phraseItem.id}:${target}`);
      });
    });
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

function queueItem(
  id: string,
  priority: GavanWeek1ImplementationQueueItem['priority'],
  titleRu: string,
  acceptanceRu: string,
  fileTargets: string[],
): GavanWeek1ImplementationQueueItem {
  return { id, priority, titleRu, acceptanceRu, fileTargets };
}

export function buildGavanWeek1ImplementationQueue(
  plan: GavanWeek1CanonicalPlan = buildGavanWeek1CanonicalPlan(),
): GavanWeek1ImplementationQueueItem[] {
  const dayTargets = plan.days.map((dayItem) => `gavan-week1-day-${dayItem.dayIndex}`);
  return [
    queueItem('gavan-week1-bridge-canonical-plan', 'P0', 'Подключить canonical plan к runtime assembler', 'DEV runtime открывает дни из canonical plan, а не из старых узких кандидатов.', ['app/personal_plan_day_runtime_assembler.ts', 'app/personal_plan_runtime_block_factory.ts']),
    queueItem('gavan-week1-day1-runtime-material', 'P0', 'Собрать runtime day 1 из canonical data', 'День 1 использует фразы canonical plan, clean copy, correct-only progress и перенос ошибок.', ['app/personal_plan_runtime_block_factory.ts']),
    queueItem('gavan-week1-day2-runtime-material', 'P0', 'Собрать runtime day 2', 'День 2 открывается после day 1 и содержит listening placeholder без fake audio.', dayTargets),
    queueItem('gavan-week1-day3-runtime-material', 'P0', 'Собрать runtime day 3', 'Missing-word режим работает по точным словам и безопасным distractors.', dayTargets),
    queueItem('gavan-week1-day4-runtime-material', 'P0', 'Собрать runtime day 4', 'Natural choice, quick reply и mistake repair доступны как отдельные блоки.', dayTargets),
    queueItem('gavan-week1-day5-runtime-material', 'P0', 'Собрать runtime day 5', 'Listening choice остаётся честным placeholder до появления аудио ассетов.', dayTargets),
    queueItem('gavan-week1-day6-runtime-material', 'P0', 'Собрать runtime day 6', 'Pronunciation shadow не обещает скоринг, пока scorer не готов.', dayTargets),
    queueItem('gavan-week1-day7-runtime-material', 'P0', 'Собрать runtime day 7', 'Week review использует micro dialogue, mistake repair и recall по всей неделе.', dayTargets),
    queueItem('gavan-week1-attempt-events-all-modes', 'P0', 'Подключить attempt events ко всем режимам', 'Каждая ошибка пишет grammar/vocabulary/context tags для аналитики и персональных занятий.', ['app/personal_plan_attempt_event_adapter.ts', 'app/personal_plan_attempt_events.ts']),
    queueItem('gavan-week1-recovery-queue', 'P0', 'Связать ошибки с recall и тренером', 'Неправильные ответы возвращаются в конце круга и попадают в персональную тренировку.', ['app/personal_plan_recovery_actions.ts', 'app/personal_plan_recovery_write_adapter.ts']),
    queueItem('gavan-week1-day-carryover', 'P0', 'Доделать перенос незавершённого дня', 'Если задания дня не закончены, следующий вход продолжает тот же день.', ['app/personal_plan_day_runtime_screen_controller.ts']),
    queueItem('gavan-week1-next-day-unlock', 'P0', 'Открывать следующий день после завершения', 'После completed day следующий календарный день открывает dayIndex + 1 с тем же planInstanceId.', ['app/personal_plan_state.ts']),
    queueItem('gavan-week1-home-route-card-restore', 'P0', 'Вернуть большую кнопку маршрута на главной', 'При активном плане кнопка маршрута заменяет Continue Lesson и показывает круговой progress.', ['components/PersonalPlanHomeRouteCard.tsx', 'app/(tabs)/home.tsx']),
    queueItem('gavan-week1-final-audio-generation', 'P1', 'Сгенерировать аудио ассеты', 'Listening blocks получают реальные approved OpenAI audio assets, не TTS-заглушки.', ['app/personal_plan_audio_generation_jobs.ts', 'assets/audio/personal_plans']),
    queueItem('gavan-week1-pronunciation-mvp', 'P1', 'Собрать pronunciation MVP', 'Shadow режим записывает попытку, показывает мягкий feedback и не штрафует за ненадёжный скоринг.', ['app/personal_plan_pronunciation_attempt.ts']),
    queueItem('gavan-week1-quality-gate-runtime', 'P0', 'Расширить quality gates', 'Gate проверяет фразы, объяснения, режимы, нагрузки, audio honesty и no bad copy.', ['app/personal_plan_week_content_quality_gate.ts']),
    queueItem('gavan-week1-maestro-runtime-smoke', 'P1', 'Прогнать Maestro по runtime week 1', 'Smoke проходит день 1, открывает список дней, проверяет progress и отсутствие crash toast.', ['maestro/flows/personal_plans']),
  ];
}

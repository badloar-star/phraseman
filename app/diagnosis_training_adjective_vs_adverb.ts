import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function adjAdvStep(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  correctFeedback: TriText;
  wrong: Record<string, TriText>;
  retry: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Сначала найди, что описывает слово. Noun или состояние после be/look/sound/feel обычно требует adjective: good, quick, careful. Action обычно требует adverb: well, quickly, carefully.',
      'Спочатку знайди, що описує слово. Noun або стан після be/look/sound/feel зазвичай потребує adjective: good, quick, careful. Action зазвичай потребує adverb: well, quickly, carefully.',
      'Primero encuentra qué describe la palabra. Noun o estado después de be/look/sound/feel normalmente necesita adjective: good, quick, careful. Action normalmente necesita adverb: well, quickly, carefully.',
    ),
    microTask: tri('Выбери adjective или adverb form.', 'Обери adjective або adverb form.', 'Elige adjective o adverb form.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Проверь функцию: описывается noun/state или action?',
        'Не зовсім. Перевір функцію: описується noun/state чи action?',
        'No exactamente. Revisa la función: describe noun/state o action?',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: правильная форма здесь - "${input.correctAnswer}".`,
        `Підказка: правильна форма тут - "${input.correctAnswer}".`,
        `Pista: la forma correcta aquí es "${input.correctAnswer}".`,
      ),
    ],
    fallbackExplanation: tri(
      'Adjective описывает noun/state: good teacher, He is careful. Adverb описывает action: teaches well, drives carefully.',
      'Adjective описує noun/state: good teacher, He is careful. Adverb описує action: teaches well, drives carefully.',
      'Adjective describe noun/state: good teacher, He is careful. Adverb describe action: teaches well, drives carefully.',
    ),
    focusWords: input.focusWords,
  };
}

export const ADJECTIVE_VS_ADVERB_TRAINING: DiagnosisTraining = {
  id: 'adjective_vs_adverb',
  category: 'adverb',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 14,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Good / Well, Quick / Quickly: качество или действие', 'Good / Well, Quick / Quickly: якість чи дія', 'Good / Well, Quick / Quickly: cualidad o acción'),
  shortTitle: tri('Adjective vs Adverb', 'Adjective vs Adverb', 'Adjective vs Adverb'),
  shortDiagnosis: tri(
    'Ты путаешь adjective и adverb: good/well, quick/quickly, careful/carefully.',
    'Ти плутаєш adjective і adverb: good/well, quick/quickly, careful/carefully.',
    'Confundes adjective y adverb: good/well, quick/quickly, careful/carefully.',
  ),
  diagnosisText: tri(
    'Ты путаешь adjective и adverb. Английский смотрит не на перевод, а на то, что описывается: человек/предмет/состояние или действие.',
    'Ти плутаєш adjective і adverb. Англійська дивиться не на переклад, а на те, що описується: людина/предмет/стан чи дія.',
    'Confundes adjective y adverb. El inglés no mira la traducción, sino qué se describe: persona/cosa/estado o acción.',
  ),
  mentalModel: tri(
    'Adjective описывает noun или состояние после be/look/seem/feel: a quick answer, he is careful. Adverb описывает действие: he answers quickly, she drives carefully.',
    'Adjective описує noun або стан після be/look/seem/feel: a quick answer, he is careful. Adverb описує дію: he answers quickly, she drives carefully.',
    'Adjective describe noun o estado después de be/look/seem/feel: a quick answer, he is careful. Adverb describe acción: he answers quickly, she drives carefully.',
  ),
  contrastSet: ['adjective', 'adverb', 'good/well', '-ly adverbs', 'linking verbs'],
  coreRule: tri(
    'Adjective: good job, quick answer, careful driver, She is careful. Adverb: works well, answers quickly, drives carefully.',
    'Adjective: good job, quick answer, careful driver, She is careful. Adverb: works well, answers quickly, drives carefully.',
    'Adjective: good job, quick answer, careful driver, She is careful. Adverb: works well, answers quickly, drives carefully.',
  ),
  whatUserMustLearn: {
    ru: [
      'Adjective описывает noun: a good teacher, a quick answer, a careful driver.',
      'Adjective идет после be/look/seem/feel, если описывает состояние subject: She is careful, It sounds strange.',
      'Adverb описывает verb/action: drive carefully, answer quickly, speak clearly.',
      'Многие adverbs образуются через -ly: quick -> quickly, careful -> carefully.',
      'Good - adjective. Well - обычно adverb.',
      'Правильно: She speaks English well. Неправильно: She speaks English good.',
      'После be обычно adjective: He is careful, не He is carefully.',
      'После action verb обычно adverb: He drives carefully, не He drives careful.',
    ],
    uk: [
      'Adjective описує noun: a good teacher, a quick answer, a careful driver.',
      'Adjective іде після be/look/seem/feel, якщо описує стан subject: She is careful, It sounds strange.',
      'Adverb описує verb/action: drive carefully, answer quickly, speak clearly.',
      'Багато adverbs утворюються через -ly: quick -> quickly, careful -> carefully.',
      'Good - adjective. Well - зазвичай adverb.',
      'Правильно: She speaks English well. Неправильно: She speaks English good.',
      'Після be зазвичай adjective: He is careful, не He is carefully.',
      'Після action verb зазвичай adverb: He drives carefully, не He drives careful.',
    ],
    es: [
      'Adjective describe noun: a good teacher, a quick answer, a careful driver.',
      'Adjective va después de be/look/seem/feel si describe estado del subject: She is careful, It sounds strange.',
      'Adverb describe verb/action: drive carefully, answer quickly, speak clearly.',
      'Muchos adverbs se forman con -ly: quick -> quickly, careful -> carefully.',
      'Good es adjective. Well normalmente es adverb.',
      'Correcto: She speaks English well. Incorrecto: She speaks English good.',
      'Después de be normalmente va adjective: He is careful, no He is carefully.',
      'Después de action verb normalmente va adverb: He drives carefully, no He drives careful.',
    ],
  },
  examples: [
    { en: 'She is a good teacher.', ru: 'Она хороший учитель.', uk: 'Вона хороша вчителька.', es: 'Ella es una buena profesora.', why: tri('Good описывает noun teacher.', 'Good описує noun teacher.', 'Good describe el noun teacher.') },
    { en: 'She teaches well.', ru: 'Она хорошо преподает.', uk: 'Вона добре викладає.', es: 'Ella enseña bien.', why: tri('Well описывает действие teaches.', 'Well описує дію teaches.', 'Well describe la acción teaches.') },
    { en: 'He gave a quick answer.', ru: 'Он дал быстрый ответ.', uk: 'Він дав швидку відповідь.', es: 'Dio una respuesta rápida.', why: tri('Quick описывает noun answer.', 'Quick описує noun answer.', 'Quick describe el noun answer.') },
    { en: 'He answered quickly.', ru: 'Он ответил быстро.', uk: 'Він відповів швидко.', es: 'Respondió rápidamente.', why: tri('Quickly описывает действие answered.', 'Quickly описує дію answered.', 'Quickly describe la acción answered.') },
    { en: 'Be careful.', ru: 'Будь осторожен.', uk: 'Будь обережним.', es: 'Ten cuidado.', why: tri('После be описывается состояние человека.', 'Після be описується стан людини.', 'Después de be se describe estado de la persona.') },
    { en: 'Drive carefully.', ru: 'Води осторожно.', uk: 'Води обережно.', es: 'Conduce con cuidado.', why: tri('Carefully описывает действие drive.', 'Carefully описує дію drive.', 'Carefully describe la acción drive.') },
    { en: 'It sounds strange.', ru: 'Это звучит странно.', uk: 'Це звучить дивно.', es: 'Suena raro.', why: tri('Sound здесь linking verb, поэтому strange.', 'Sound тут linking verb, тому strange.', 'Sound aquí es linking verb, por eso strange.') },
    { en: 'He looked at me strangely.', ru: 'Он странно посмотрел на меня.', uk: 'Він дивно подивився на мене.', es: 'Me miró de forma extraña.', why: tri('Looked at описывает действие, поэтому strangely.', 'Looked at описує дію, тому strangely.', 'Looked at describe acción, por eso strangely.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь adjective и adverb: предмет/состояние или действие.', 'Схоже, ти плутаєш adjective і adverb: предмет/стан чи дія.', 'Parece que confundes adjective y adverb: cosa/estado o acción.') },
    { id: 'intro_rule', type: 'rule', text: tri('Adjective описывает кто/что какой. Adverb описывает как делается действие.', 'Adjective описує хто/що який. Adverb описує як виконується дія.', 'Adjective describe cómo es algo/alguien. Adverb describe cómo se hace una acción.') },
    { id: 'intro_warning', type: 'warning', text: tri('Главная ловушка: good teacher, но teaches well.', 'Головна пастка: good teacher, але teaches well.', 'La trampa principal: good teacher, pero teaches well.') },
  ],
  steps: [
    adjAdvStep({ id: 'adj_adv_easy_001', order: 1, difficulty: 'easy', targetSkill: 'good_before_noun', sentence: 'She is a ___ teacher.', translation: tri('Она хороший учитель.', 'Вона хороша вчителька.', 'Ella es una buena profesora.'), options: ['good', 'well', 'goodly', 'better'], correctAnswer: 'good', correctFeedback: tri('Да. Teacher - noun. Перед noun нужна adjective form: good teacher.', 'Так. Teacher - noun. Перед noun потрібна adjective form: good teacher.', 'Sí. Teacher es noun. Antes de noun necesitamos adjective form: good teacher.'), wrong: { well: tri('Well описывает действие: teaches well. Перед teacher нужно good.', 'Well описує дію: teaches well. Перед teacher потрібно good.', 'Well describe acción: teaches well. Antes de teacher necesitamos good.'), goodly: tri('Goodly здесь не используется. Нужна форма good.', 'Goodly тут не використовується. Потрібна форма good.', 'Goodly no se usa aquí. Necesitamos good.'), better: tri('Better означает “лучше”. Здесь просто качество: good teacher.', 'Better означає “краще”. Тут просто якість: good teacher.', 'Better significa “mejor”. Aquí solo es cualidad: good teacher.') }, retry: [tri('Teacher - noun. Описываем noun - good.', 'Teacher - noun. Описуємо noun - good.', 'Teacher es noun. Describimos noun - good.'), tri('Good teacher.', 'Good teacher.', 'Good teacher.'), tri('Подсказка: She is a good teacher.', 'Підказка: She is a good teacher.', 'Pista: She is a good teacher.')], focusWords: ['good', 'teacher'] }),
    adjAdvStep({ id: 'adj_adv_easy_002', order: 2, difficulty: 'easy', targetSkill: 'well_after_action', sentence: 'She teaches very ___.', translation: tri('Она очень хорошо преподает.', 'Вона дуже добре викладає.', 'Ella enseña muy bien.'), options: ['good', 'well', 'goodly', 'best'], correctAnswer: 'well', correctFeedback: tri('Да. Well описывает действие teaches.', 'Так. Well описує дію teaches.', 'Sí. Well describe la acción teaches.'), wrong: { good: tri('Good описывает noun: good teacher. Действие teaches описывает well.', 'Good описує noun: good teacher. Дію teaches описує well.', 'Good describe noun: good teacher. La acción teaches se describe con well.'), goodly: tri('Goodly здесь не используется. Для действия от good используется well.', 'Goodly тут не використовується. Для дії від good використовується well.', 'Goodly no se usa aquí. Para acción con good usamos well.'), best: tri('Best требует другой контекст. Здесь нужно well.', 'Best потребує іншого контексту. Тут потрібно well.', 'Best necesita otro contexto. Aquí necesitamos well.') }, retry: [tri('Teaches - действие. Описываем действие - well.', 'Teaches - дія. Описуємо дію - well.', 'Teaches es acción. Describimos acción - well.'), tri('Teaches well.', 'Teaches well.', 'Teaches well.'), tri('Подсказка: She teaches very well.', 'Підказка: She teaches very well.', 'Pista: She teaches very well.')], focusWords: ['teaches', 'well'] }),
    adjAdvStep({ id: 'adj_adv_easy_003', order: 3, difficulty: 'easy', targetSkill: 'adjective_after_be', sentence: 'He is very ___.', translation: tri('Он очень осторожный.', 'Він дуже обережний.', 'Él es muy cuidadoso.'), options: ['careful', 'carefully', 'care', 'caringly'], correctAnswer: 'careful', correctFeedback: tri('Да. После be описывается человек. Нужен adjective: careful.', 'Так. Після be описується людина. Потрібен adjective: careful.', 'Sí. Después de be describimos a la persona. Necesitamos adjective: careful.'), wrong: { carefully: tri('Carefully описывает действие: drive carefully. После is нужно careful.', 'Carefully описує дію: drive carefully. Після is потрібно careful.', 'Carefully describe acción: drive carefully. Después de is necesitamos careful.'), care: tri('Care - noun/verb. Для качества нужна form careful.', 'Care - noun/verb. Для якості потрібна form careful.', 'Care es noun/verb. Para cualidad necesitamos careful.'), caringly: tri('Caringly описывает действие. После is нужно careful.', 'Caringly описує дію. Після is потрібно careful.', 'Caringly describe acción. Después de is necesitamos careful.') }, retry: [tri('После is описываем человека.', 'Після is описуємо людину.', 'Después de is describimos a la persona.'), tri('He is careful.', 'He is careful.', 'He is careful.'), tri('Подсказка: He is very careful.', 'Підказка: He is very careful.', 'Pista: He is very careful.')], focusWords: ['is', 'careful'] }),
    adjAdvStep({ id: 'adj_adv_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'adjective_before_noun', sentence: 'He gave a ___ answer.', translation: tri('Он дал быстрый ответ.', 'Він дав швидку відповідь.', 'Dio una respuesta rápida.'), options: ['quick', 'quickly', 'quicker', 'quickness'], correctAnswer: 'quick', correctFeedback: tri('Да. Answer - noun. Перед noun нужна adjective form: quick answer.', 'Так. Answer - noun. Перед noun потрібна adjective form: quick answer.', 'Sí. Answer es noun. Antes de noun necesitamos adjective form: quick answer.'), wrong: { quickly: tri('Quickly описывает действие: answered quickly. Перед answer нужен quick.', 'Quickly описує дію: answered quickly. Перед answer потрібен quick.', 'Quickly describe acción: answered quickly. Antes de answer necesitamos quick.'), quicker: tri('Quicker требует сравнение. Здесь quick answer.', 'Quicker потребує порівняння. Тут quick answer.', 'Quicker necesita comparación. Aquí quick answer.'), quickness: tri('Quickness - noun. Перед answer нужен adjective quick.', 'Quickness - noun. Перед answer потрібен adjective quick.', 'Quickness es noun. Antes de answer necesitamos adjective quick.') }, retry: [tri('Answer - noun. Описываем noun - quick.', 'Answer - noun. Описуємо noun - quick.', 'Answer es noun. Describimos noun - quick.'), tri('Quick answer.', 'Quick answer.', 'Quick answer.'), tri('Подсказка: He gave a quick answer.', 'Підказка: He gave a quick answer.', 'Pista: He gave a quick answer.')], focusWords: ['quick', 'answer'] }),
    adjAdvStep({ id: 'adj_adv_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'adjective_before_noun', sentence: 'She is a ___ driver.', translation: tri('Она осторожный водитель.', 'Вона обережний водій.', 'Ella es una conductora cuidadosa.'), options: ['careful', 'carefully', 'care', 'carefulness'], correctAnswer: 'careful', correctFeedback: tri('Да. Driver - noun. Перед noun нужна adjective form: careful driver.', 'Так. Driver - noun. Перед noun потрібна adjective form: careful driver.', 'Sí. Driver es noun. Antes de noun necesitamos adjective form: careful driver.'), wrong: { carefully: tri('Carefully описывает действие: drives carefully. Перед driver нужен careful.', 'Carefully описує дію: drives carefully. Перед driver потрібен careful.', 'Carefully describe acción: drives carefully. Antes de driver necesitamos careful.'), care: tri('Care не описывает driver как качество. Нужна form careful.', 'Care не описує driver як якість. Потрібна form careful.', 'Care no describe driver como cualidad. Necesitamos careful.'), carefulness: tri('Carefulness - noun. Перед driver нужен careful.', 'Carefulness - noun. Перед driver потрібен careful.', 'Carefulness es noun. Antes de driver necesitamos careful.') }, retry: [tri('Driver - noun. Описываем noun - careful.', 'Driver - noun. Описуємо noun - careful.', 'Driver es noun. Describimos noun - careful.'), tri('Careful driver.', 'Careful driver.', 'Careful driver.'), tri('Подсказка: She is a careful driver.', 'Підказка: She is a careful driver.', 'Pista: She is a careful driver.')], focusWords: ['careful', 'driver'] }),
    adjAdvStep({ id: 'adj_adv_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'adjective_before_noun', sentence: 'This is a ___ problem.', translation: tri('Это серьезная проблема.', 'Це серйозна проблема.', 'Este es un problema serio.'), options: ['serious', 'seriously', 'seriousness', 'more seriously'], correctAnswer: 'serious', correctFeedback: tri('Да. Problem - noun. Перед noun нужна adjective form: serious problem.', 'Так. Problem - noun. Перед noun потрібна adjective form: serious problem.', 'Sí. Problem es noun. Antes de noun necesitamos adjective form: serious problem.'), wrong: { seriously: tri('Seriously описывает действие: take it seriously. Перед problem нужен serious.', 'Seriously описує дію: take it seriously. Перед problem потрібен serious.', 'Seriously describe acción: take it seriously. Antes de problem necesitamos serious.'), seriousness: tri('Seriousness - noun. Перед problem нужен serious.', 'Seriousness - noun. Перед problem потрібен serious.', 'Seriousness es noun. Antes de problem necesitamos serious.'), 'more seriously': tri('More seriously описывает действие. Перед problem нужен serious.', 'More seriously описує дію. Перед problem потрібен serious.', 'More seriously describe acción. Antes de problem necesitamos serious.') }, retry: [tri('Problem - noun. Нужна форма serious.', 'Problem - noun. Потрібна форма serious.', 'Problem es noun. Necesitamos serious.'), tri('Serious problem.', 'Serious problem.', 'Serious problem.'), tri('Подсказка: This is a serious problem.', 'Підказка: This is a serious problem.', 'Pista: This is a serious problem.')], focusWords: ['serious', 'problem'] }),
    adjAdvStep({ id: 'adj_adv_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'adverb_after_action', sentence: 'He answered very ___.', translation: tri('Он ответил очень быстро.', 'Він відповів дуже швидко.', 'Respondió muy rápido.'), options: ['quick', 'quickly', 'quicker', 'quickness'], correctAnswer: 'quickly', correctFeedback: tri('Да. Quickly описывает действие answered.', 'Так. Quickly описує дію answered.', 'Sí. Quickly describe la acción answered.'), wrong: { quick: tri('Quick описывает noun: quick answer. Действие answered требует quickly.', 'Quick описує noun: quick answer. Дія answered потребує quickly.', 'Quick describe noun: quick answer. La acción answered necesita quickly.'), quicker: tri('Quicker требует сравнение. Здесь very quickly.', 'Quicker потребує порівняння. Тут very quickly.', 'Quicker necesita comparación. Aquí very quickly.'), quickness: tri('Quickness - noun. Действие answered описывает quickly.', 'Quickness - noun. Дію answered описує quickly.', 'Quickness es noun. La acción answered se describe con quickly.') }, retry: [tri('Answered - действие. Описываем действие - quickly.', 'Answered - дія. Описуємо дію - quickly.', 'Answered es acción. Describimos acción - quickly.'), tri('Answered quickly.', 'Answered quickly.', 'Answered quickly.'), tri('Подсказка: He answered very quickly.', 'Підказка: He answered very quickly.', 'Pista: He answered very quickly.')], focusWords: ['answered', 'quickly'] }),
    adjAdvStep({ id: 'adj_adv_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'adverb_after_action', sentence: 'She drives very ___.', translation: tri('Она водит очень осторожно.', 'Вона водить дуже обережно.', 'Ella conduce con mucho cuidado.'), options: ['careful', 'carefully', 'care', 'carefulness'], correctAnswer: 'carefully', correctFeedback: tri('Да. Carefully описывает действие drives.', 'Так. Carefully описує дію drives.', 'Sí. Carefully describe la acción drives.'), wrong: { careful: tri('Careful описывает человека: She is careful. Действие drives требует carefully.', 'Careful описує людину: She is careful. Дія drives потребує carefully.', 'Careful describe a la persona: She is careful. La acción drives necesita carefully.'), care: tri('Care не описывает, как происходит действие. Нужен carefully.', 'Care не описує, як відбувається дія. Потрібен carefully.', 'Care no describe cómo ocurre la acción. Necesitamos carefully.'), carefulness: tri('Carefulness - noun. Действие drives описывает carefully.', 'Carefulness - noun. Дію drives описує carefully.', 'Carefulness es noun. La acción drives se describe con carefully.') }, retry: [tri('Drives - действие. Описываем действие - carefully.', 'Drives - дія. Описуємо дію - carefully.', 'Drives es acción. Describimos acción - carefully.'), tri('Drives carefully.', 'Drives carefully.', 'Drives carefully.'), tri('Подсказка: She drives very carefully.', 'Підказка: She drives very carefully.', 'Pista: She drives very carefully.')], focusWords: ['drives', 'carefully'] }),
    adjAdvStep({ id: 'adj_adv_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'adverb_after_action', sentence: 'Please speak ___.', translation: tri('Пожалуйста, говори ясно.', 'Будь ласка, говори ясно.', 'Por favor, habla claramente.'), options: ['clear', 'clearly', 'clearness', 'clearer'], correctAnswer: 'clearly', correctFeedback: tri('Да. Clearly описывает действие speak.', 'Так. Clearly описує дію speak.', 'Sí. Clearly describe la acción speak.'), wrong: { clear: tri('Clear описывает noun/state. Действие speak требует clearly.', 'Clear описує noun/state. Дія speak потребує clearly.', 'Clear describe noun/state. La acción speak necesita clearly.'), clearness: tri('Clearness - noun. Действие speak описывает clearly.', 'Clearness - noun. Дію speak описує clearly.', 'Clearness es noun. La acción speak se describe con clearly.'), clearer: tri('Clearer требует сравнение. Здесь speak clearly.', 'Clearer потребує порівняння. Тут speak clearly.', 'Clearer necesita comparación. Aquí speak clearly.') }, retry: [tri('Speak - действие. Описываем действие - clearly.', 'Speak - дія. Описуємо дію - clearly.', 'Speak es acción. Describimos acción - clearly.'), tri('Speak clearly.', 'Speak clearly.', 'Speak clearly.'), tri('Подсказка: Please speak clearly.', 'Підказка: Please speak clearly.', 'Pista: Please speak clearly.')], focusWords: ['speak', 'clearly'] }),
    adjAdvStep({ id: 'adj_adv_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'linking_verb_adjective', sentence: 'This sounds ___.', translation: tri('Это звучит странно.', 'Це звучить дивно.', 'Esto suena raro.'), options: ['strange', 'strangely', 'stranger', 'strangeness'], correctAnswer: 'strange', correctFeedback: tri('Да. Sounds здесь linking verb. Он описывает качество this, поэтому strange.', 'Так. Sounds тут linking verb. Він описує якість this, тому strange.', 'Sí. Sounds aquí es linking verb. Describe cualidad de this, por eso strange.'), wrong: { strangely: tri('Strangely описывает действие. Sounds здесь описывает состояние, поэтому strange.', 'Strangely описує дію. Sounds тут описує стан, тому strange.', 'Strangely describe acción. Sounds aquí describe estado, por eso strange.'), stranger: tri('Stranger требует сравнение или значит “незнакомец”. Здесь strange.', 'Stranger потребує порівняння або значить “незнайомець”. Тут strange.', 'Stranger necesita comparación o significa desconocido. Aquí strange.'), strangeness: tri('Strangeness - noun. После sounds нужна adjective form: strange.', 'Strangeness - noun. Після sounds потрібна adjective form: strange.', 'Strangeness es noun. Después de sounds necesitamos adjective: strange.') }, retry: [tri('Sounds здесь состояние/впечатление.', 'Sounds тут стан/враження.', 'Sounds aquí es estado/impresión.'), tri('Sounds strange.', 'Sounds strange.', 'Sounds strange.'), tri('Подсказка: This sounds strange.', 'Підказка: This sounds strange.', 'Pista: This sounds strange.')], focusWords: ['sounds', 'strange'] }),
    adjAdvStep({ id: 'adj_adv_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'linking_verb_adjective', sentence: 'I feel ___.', translation: tri('Я плохо себя чувствую.', 'Я погано почуваюся.', 'Me siento mal.'), options: ['bad', 'badly', 'worse', 'badness'], correctAnswer: 'bad', correctFeedback: tri('Да. Feel здесь linking verb и описывает состояние человека.', 'Так. Feel тут linking verb і описує стан людини.', 'Sí. Feel aquí es linking verb y describe estado de la persona.'), wrong: { badly: tri('Badly обычно описывает действие. Для состояния здоровья естественно I feel bad.', 'Badly зазвичай описує дію. Для стану здоров’я природно I feel bad.', 'Badly normalmente describe acción. Para salud lo natural es I feel bad.'), worse: tri('Worse требует сравнение или контекст ухудшения. Здесь bad.', 'Worse потребує порівняння або контексту погіршення. Тут bad.', 'Worse necesita comparación o empeoramiento. Aquí bad.'), badness: tri('Badness - noun. После feel нужна adjective form: bad.', 'Badness - noun. Після feel потрібна adjective form: bad.', 'Badness es noun. Después de feel necesitamos adjective: bad.') }, retry: [tri('Feel описывает состояние.', 'Feel описує стан.', 'Feel describe estado.'), tri('I feel bad.', 'I feel bad.', 'I feel bad.'), tri('Подсказка: I feel bad.', 'Підказка: I feel bad.', 'Pista: I feel bad.')], focusWords: ['feel', 'bad'] }),
    adjAdvStep({ id: 'adj_adv_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'action_verb_adverb_vs_linking_adjective', sentence: 'He looked at me ___.', translation: tri('Он странно посмотрел на меня.', 'Він дивно подивився на мене.', 'Me miró de forma extraña.'), options: ['strange', 'strangely', 'stranger', 'strangeness'], correctAnswer: 'strangely', correctFeedback: tri('Да. Looked at me - действие. Действие описывает adverb strangely.', 'Так. Looked at me - дія. Дію описує adverb strangely.', 'Sí. Looked at me es acción. La acción se describe con adverb strangely.'), wrong: { strange: tri('Strange подошло бы в It looks strange. Looked at me - действие, поэтому strangely.', 'Strange підійшло б у It looks strange. Looked at me - дія, тому strangely.', 'Strange funcionaría en It looks strange. Looked at me es acción, por eso strangely.'), stranger: tri('Stranger не описывает, как он посмотрел. Нужен strangely.', 'Stranger не описує, як він подивився. Потрібен strangely.', 'Stranger no describe cómo miró. Necesitamos strangely.'), strangeness: tri('Strangeness - noun. Действие looked описывает strangely.', 'Strangeness - noun. Дію looked описує strangely.', 'Strangeness es noun. La acción looked se describe con strangely.') }, retry: [tri('Looked at = действие.', 'Looked at = дія.', 'Looked at = acción.'), tri('Looked strangely.', 'Looked strangely.', 'Looked strangely.'), tri('Подсказка: He looked at me strangely.', 'Підказка: He looked at me strangely.', 'Pista: He looked at me strangely.')], focusWords: ['looked', 'strangely'] }),
    adjAdvStep({ id: 'adj_adv_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'good_well_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['good teacher / teaches well', 'well teacher / teaches good', 'good teacher / teaches good', 'well teacher / teaches well'], correctAnswer: 'good teacher / teaches well', correctFeedback: tri('Да. Good описывает teacher. Well описывает действие teaches.', 'Так. Good описує teacher. Well описує дію teaches.', 'Sí. Good describe teacher. Well describe la acción teaches.'), wrong: { 'well teacher / teaches good': tri('Формы перепутаны. Перед teacher нужен good. После teaches нужен well.', 'Форми переплутані. Перед teacher потрібен good. Після teaches потрібен well.', 'Las formas están invertidas. Antes de teacher necesitamos good. Después de teaches necesitamos well.'), 'good teacher / teaches good': tri('Good teacher правильно, но teaches good неправильно. Действие teaches описывает well.', 'Good teacher правильно, але teaches good неправильно. Дію teaches описує well.', 'Good teacher está bien, pero teaches good es incorrecto. La acción teaches se describe con well.'), 'well teacher / teaches well': tri('Teaches well правильно, но well teacher неправильно. Перед teacher нужен good.', 'Teaches well правильно, але well teacher неправильно. Перед teacher потрібен good.', 'Teaches well está bien, pero well teacher es incorrecto. Antes de teacher necesitamos good.') }, retry: [tri('Teacher = good. Teaches = well.', 'Teacher = good. Teaches = well.', 'Teacher = good. Teaches = well.'), tri('Good noun. Verb well.', 'Good noun. Verb well.', 'Good noun. Verb well.'), tri('Подсказка: good teacher / teaches well.', 'Підказка: good teacher / teaches well.', 'Pista: good teacher / teaches well.')], focusWords: ['good', 'well'] }),
    adjAdvStep({ id: 'adj_adv_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'adjective_adverb_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['careful driver / drives carefully', 'carefully driver / drives careful', 'careful driver / drives careful', 'carefully driver / drives carefully'], correctAnswer: 'careful driver / drives carefully', correctFeedback: tri('Да. Careful описывает driver. Carefully описывает действие drives.', 'Так. Careful описує driver. Carefully описує дію drives.', 'Sí. Careful describe driver. Carefully describe la acción drives.'), wrong: { 'carefully driver / drives careful': tri('Формы перепутаны. Перед driver нужен careful. После drives нужен carefully.', 'Форми переплутані. Перед driver потрібен careful. Після drives потрібен carefully.', 'Las formas están invertidas. Antes de driver necesitamos careful. Después de drives necesitamos carefully.'), 'careful driver / drives careful': tri('Careful driver правильно, но drives careful неправильно. Действие требует carefully.', 'Careful driver правильно, але drives careful неправильно. Дія потребує carefully.', 'Careful driver está bien, pero drives careful es incorrecto. La acción necesita carefully.'), 'carefully driver / drives carefully': tri('Drives carefully правильно, но carefully driver неправильно. Перед driver нужен careful.', 'Drives carefully правильно, але carefully driver неправильно. Перед driver потрібен careful.', 'Drives carefully está bien, pero carefully driver es incorrecto. Antes de driver necesitamos careful.') }, retry: [tri('Driver = careful. Drives = carefully.', 'Driver = careful. Drives = carefully.', 'Driver = careful. Drives = carefully.'), tri('Careful noun. Verb carefully.', 'Careful noun. Verb carefully.', 'Careful noun. Verb carefully.'), tri('Подсказка: careful driver / drives carefully.', 'Підказка: careful driver / drives carefully.', 'Pista: careful driver / drives carefully.')], focusWords: ['careful', 'carefully'] }),
    adjAdvStep({ id: 'adj_adv_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Elige la oración correcta.'), options: ['He is careful, and he drives carefully.', 'He is carefully, and he drives careful.', 'He is careful, and he drives careful.', 'He is carefully, and he drives carefully.'], correctAnswer: 'He is careful, and he drives carefully.', correctFeedback: tri('Да. После is нужно careful, потому что описываем человека. После drives нужно carefully, потому что описываем действие.', 'Так. Після is потрібно careful, бо описуємо людину. Після drives потрібно carefully, бо описуємо дію.', 'Sí. Después de is necesitamos careful porque describimos a la persona. Después de drives necesitamos carefully porque describimos la acción.'), wrong: { 'He is carefully, and he drives careful.': tri('Формы перепутаны. После is нужен careful. После drives нужен carefully.', 'Форми переплутані. Після is потрібен careful. Після drives потрібен carefully.', 'Las formas están invertidas. Después de is necesitamos careful. Después de drives necesitamos carefully.'), 'He is careful, and he drives careful.': tri('Первая часть правильная. Ошибка во второй: drives описывает действие, поэтому carefully.', 'Перша частина правильна. Помилка в другій: drives описує дію, тому carefully.', 'La primera parte está bien. Error en la segunda: drives describe acción, por eso carefully.'), 'He is carefully, and he drives carefully.': tri('Вторая часть правильная. Ошибка в первой: после is нужно careful, не carefully.', 'Друга частина правильна. Помилка в першій: після is потрібно careful, не carefully.', 'La segunda parte está bien. Error en la primera: después de is necesitamos careful, no carefully.') }, retry: [tri('Is описывает человека = careful. Drives описывает действие = carefully.', 'Is описує людину = careful. Drives описує дію = carefully.', 'Is describe persona = careful. Drives describe acción = carefully.'), tri('He is careful. He drives carefully.', 'He is careful. He drives carefully.', 'He is careful. He drives carefully.'), tri('Подсказка: He is careful, and he drives carefully.', 'Підказка: He is careful, and he drives carefully.', 'Pista: He is careful, and he drives carefully.')], focusWords: ['careful', 'carefully'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['good_well_confusion', 'adjective_instead_of_adverb_after_action', 'adverb_instead_of_adjective_before_noun', 'adverb_after_be_error', 'linking_verb_adjective_error', 'ly_form_error', 'noun_description_error', 'action_description_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем, что описывает слово - noun/state или action.', 'Показуємо, що описує слово - noun/state чи action.', 'Mostramos qué describe la palabra - noun/state o action.'),
    depth2: tri('Проще: “какой?” или “как?”.', 'Простіше: “який?” або “як?”.', 'Más simple: “qué tipo?” o “cómo?”.'),
    depth3: tri('Пара: good teacher / teaches well.', 'Пара: good teacher / teaches well.', 'Pareja: good teacher / teaches well.'),
    depth4: tri('Почти подсказка: нужна adjective form или adverb form.', 'Майже підказка: потрібна adjective form чи adverb form.', 'Casi pista: necesitas adjective form o adverb form.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri('Остановись. Noun/state = adjective: good, quick, careful. Action = adverb: well, quickly, carefully.', 'Зупинись. Noun/state = adjective: good, quick, careful. Action = adverb: well, quickly, carefully.', 'Detente. Noun/state = adjective: good, quick, careful. Action = adverb: well, quickly, carefully.'),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_described_target_hint_then_retry',
      card: tri('Система покажет, что описывается - noun/state или action, но не выберет форму за пользователя.', 'Система покаже, що описується - noun/state чи action, але не вибере форму за користувача.', 'El sistema mostrará qué se describe - noun/state o action, pero no elegirá la forma.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Режим подсказки: сначала выбери, описывается состояние или действие.', 'Режим підказки: спочатку обери, описується стан чи дія.', 'Modo guiado: primero elige si se describe estado o acción.'),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_adj_adv_001', prompt: tri('В good teacher слово good описывает noun или action?', 'У good teacher слово good описує noun чи action?', 'En good teacher, good describe noun o action?'), options: ['noun', 'action'], correctIndex: 0, thenReturnToExerciseId: 'adj_adv_easy_001' },
      { id: 'guided_adj_adv_002', prompt: tri('В teaches well слово well описывает noun или action?', 'У teaches well слово well описує noun чи action?', 'En teaches well, well describe noun o action?'), options: ['noun', 'action'], correctIndex: 1, thenReturnToExerciseId: 'adj_adv_easy_002' },
      { id: 'guided_adj_adv_003', prompt: tri('После is в He is ___ мы описываем состояние или действие?', 'Після is у He is ___ ми описуємо стан чи дію?', 'Después de is en He is ___ describimos estado o acción?'), options: ['состояние', 'действие'], correctIndex: 0, thenReturnToExerciseId: 'adj_adv_easy_003' },
      { id: 'guided_adj_adv_004', prompt: tri('В drives ___ мы описываем, как происходит действие?', 'У drives ___ ми описуємо, як відбувається дія?', 'En drives ___ describimos cómo ocurre la acción?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'adj_adv_contrast_005' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'adverb',
    microDiagnosisId: 'adjective_vs_adverb',
    diagnosisLabel: tri('Adjective vs Adverb', 'Adjective vs Adverb', 'Adjective vs Adverb'),
    contrastSet: ['adjective', 'adverb', 'good/well', '-ly adverbs', 'linking verbs'],
    focusWords: ['good', 'well', 'quick', 'quickly', 'careful', 'carefully'],
    focusPatterns: ['good_before_noun', 'well_after_action', 'adjective_after_be', 'adjective_before_noun', 'adverb_after_action', 'linking_verb_adjective', 'action_verb_adverb_vs_linking_adjective', 'good_well_pair', 'adjective_adverb_pair', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_adjective_vs_adverb_start',
    answer: 'diagnosis_training_adjective_vs_adverb_answer',
    mastery: 'diagnosis_training_adjective_vs_adverb_mastery',
    fallback: 'diagnosis_training_adjective_vs_adverb_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'adverb', microDiagnosisId: 'adjective_vs_adverb', contrastSet: ['adjective', 'adverb', 'good/well', '-ly adverbs', 'linking verbs'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logDescribedTarget: true, logWordForm: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=adverb&microDiagnosisId=adjective_vs_adverb',
  },
  qualityChecklist: {
    hasStableId: true,
    hasCategory: true,
    hasMultilingualTitle: true,
    hasPlainDiagnosisText: true,
    hasMentalModel: true,
    hasContrastSet: true,
    hasAtLeastSixExamples: true,
    hasAtLeastTwelveExercises: true,
    hasEasyContrastMixedStructure: true,
    hasDistractorSpecificFeedback: true,
    hasRetryFeedbackLevels: true,
    hasGuidedModeForRepeatedMistakes: true,
    hasMasteryRules: true,
    hasSmartTrainerConfig: true,
    hasAnalyticsPayload: true,
    hasFallbackRoute: true,
  },
};



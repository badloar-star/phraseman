// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = [
  'turn on',
  'turn off',
  'look up',
  'look for',
  'pick up',
  'give up',
  'find out',
  'run out of',
  'put on',
  'take off',
  'carry on',
  'fill in',
];

const option = (text: string) => ({ id: text, text });

const defaultWrong = (correctAnswer: string): TriText => tri(
  `С этой частицей получается другой смысл. Здесь нужна пара "${correctAnswer}".`,
  `З цією часткою виходить інший сенс. Тут потрібна пара "${correctAnswer}".`,
  `That choice makes a different meaning. Here we need the pair with "${correctAnswer}".`,
);

const retry = (line: string, pair: string): [TriText, TriText, TriText, TriText] => [
  tri(line, line, 'Choose the meaning first, then the second part.'),
  tri(
    'Не выбирай на слух. Сначала смысл, потом короткая часть после глагола.',
    'Не вибирай навмання. Спочатку сенс, потім коротка частка після дієслова.',
    'Do not choose by sound. Choose the meaning first, then the second part.',
  ),
  tri(
    `Держи пару целиком: ${pair}.`,
    `Тримай пару цілком: ${pair}.`,
    `Keep the whole pair together: ${pair}.`,
  ),
  tri(
    `Почти подсказка: нужна пара "${pair}".`,
    `Майже підказка: потрібна пара "${pair}".`,
    `Almost a hint: the needed pair is "${pair}".`,
  ),
];

function phrasalStep(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  pair: string;
  correctFeedback: TriText;
  wrong: Record<string, TriText>;
  retryLine: string;
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
      'Смотри не на первое слово отдельно, а на всю пару. Короткая часть после глагола часто меняет смысл всей фразы.',
      'Дивись не на перше слово окремо, а на всю пару. Коротка частка після дієслова часто змінює сенс усієї фрази.',
      'Look at the whole pair, not at the first word alone. The short second part often changes the meaning of the whole phrase.',
    ),
    microTask: tri(
      'Выбери короткую часть, которая дает нужный смысл.',
      'Вибери коротку частку, яка дає потрібний сенс.',
      'Choose the second part that gives the right meaning.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map(option),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((item) => item === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((item) => item !== input.correctAnswer)
        .map((item) => [item, input.wrong[item] ?? defaultWrong(input.correctAnswer)]),
    ),
    retryFeedback: retry(input.retryLine, input.pair),
    fallbackExplanation: tri(
      'Не переводи первый глагол отдельно. Turn on = включить. Turn off = выключить. Look up = найти информацию. Look for = искать. Pick up = поднять или забрать человека.',
      'Не перекладай перше дієслово окремо. Turn on = увімкнути. Turn off = вимкнути. Look up = знайти інформацію. Look for = шукати. Pick up = підняти або забрати людину.',
      'Do not translate the first verb alone. Turn on = switch on. Turn off = switch off. Look up = find information. Look for = search. Pick up = lift or collect.',
    ),
    focusWords: input.focusWords,
  };
}

export const PHRASAL_PARTICLE_PAIR_TRAINING: DiagnosisTraining = {
  id: 'phrasal_particle_pair',
  category: 'phrasal_particle',
  version: '1.0.0',
  status: 'active',
  priority: 37,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Turn on / look up: учи пару целиком', 'Turn on / look up: вчи пару цілком', 'Turn on / look up: learn the whole pair'),
  shortTitle: tri('Пара, не одно слово', 'Пара, не одне слово', 'Whole pair'),
  shortDiagnosis: tri(
    'Ты видишь первое слово, но теряешь короткую часть после него. Из-за этого фраза меняет смысл.',
    'Ти бачиш перше слово, але губиш коротку частку після нього. Через це фраза змінює сенс.',
    'You see the first word, but lose the second part. That changes the meaning.',
  ),
  diagnosisText: tri(
    'Ошибка не в том, что ты не знаешь turn или look. Смысл живет в паре: turn on, turn off, look up, look for.',
    'Помилка не в тому, що ти не знаєш turn або look. Сенс живе в парі: turn on, turn off, look up, look for.',
    'The mistake is not that you do not know turn or look. The meaning lives in the pair: turn on, turn off, look up, look for.',
  ),
  mentalModel: tri(
    'Думай готовыми блоками, а не отдельными словами. Turn сам по себе еще не дает смысл: turn on = включить, turn off = выключить. Сначала выбирай смысл, потом пару.',
    'Думай готовими блоками, а не окремими словами. Turn саме по собі ще не дає сенс: turn on = увімкнути, turn off = вимкнути. Спочатку вибирай сенс, потім пару.',
    'Think in ready-made blocks, not separate words. Turn alone is not enough: turn on = switch on, turn off = switch off. Choose the meaning first, then the pair.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Сначала назови смысл: включить, выключить, найти информацию, искать, забрать, сдаться, узнать, закончиться. Потом выбирай пару.',
    'Спочатку назви сенс: увімкнути, вимкнути, знайти інформацію, шукати, забрати, здатися, дізнатися, закінчитися. Потім вибирай пару.',
    'Name the meaning first: switch on, switch off, find information, search, collect, give up, discover, run out. Then choose the pair.',
  ),
  whatUserMustLearn: {
    ru: [
      'Смысл нужно брать из пары целиком.',
      'Turn on = включить, turn off = выключить.',
      'Look up = найти информацию, look for = искать кого-то или что-то.',
      'Pick up = поднять или забрать человека.',
      'Give up = сдаться или перестать пытаться.',
      'Find out = узнать информацию.',
      'Run out of = что-то закончилось.',
    ],
    uk: [
      'Сенс потрібно брати з пари цілком.',
      'Turn on = увімкнути, turn off = вимкнути.',
      'Look up = знайти інформацію, look for = шукати когось або щось.',
      'Pick up = підняти або забрати людину.',
      'Give up = здатися або перестати намагатися.',
      'Find out = дізнатися інформацію.',
      'Run out of = щось закінчилося.',
    ],
    es: [
      'Take the meaning from the whole pair.',
      'Turn on = switch on, turn off = switch off.',
      'Look up = find information, look for = search.',
      'Pick up = lift or collect a person.',
      'Give up = stop trying.',
      'Find out = discover information.',
      'Run out of = have none left.',
    ],
  },
  examples: [
    { en: 'Please turn on the light.', ru: 'Пожалуйста, включи свет.', uk: 'Будь ласка, увімкни світло.', es: 'Please turn on the light.', why: tri('Turn on = включить.', 'Turn on = увімкнути.', 'Turn on = switch on.') },
    { en: 'Please turn off the TV.', ru: 'Пожалуйста, выключи телевизор.', uk: 'Будь ласка, вимкни телевізор.', es: 'Please turn off the TV.', why: tri('Turn off = выключить.', 'Turn off = вимкнути.', 'Turn off = switch off.') },
    { en: 'I looked up the word.', ru: 'Я нашел слово в словаре.', uk: 'Я знайшов слово у словнику.', es: 'I looked up the word.', why: tri('Look up = найти информацию.', 'Look up = знайти інформацію.', 'Look up = find information.') },
    { en: 'I am looking for my keys.', ru: 'Я ищу ключи.', uk: 'Я шукаю ключі.', es: 'I am looking for my keys.', why: tri('Look for = искать.', 'Look for = шукати.', 'Look for = search.') },
    { en: 'Can you pick me up at six?', ru: 'Можешь забрать меня в шесть?', uk: 'Можеш забрати мене о шостій?', es: 'Can you pick me up at six?', why: tri('Pick up здесь = забрать человека.', 'Pick up тут = забрати людину.', 'Pick up here = collect a person.') },
    { en: 'Do not give up.', ru: 'Не сдавайся.', uk: 'Не здавайся.', es: 'Do not give up.', why: tri('Give up = перестать пытаться.', 'Give up = перестати намагатися.', 'Give up = stop trying.') },
    { en: 'We ran out of coffee.', ru: 'У нас закончился кофе.', uk: 'У нас закінчилася кава.', es: 'We ran out of coffee.', why: tri('Run out of = запас закончился.', 'Run out of = запас закінчився.', 'Run out of = have none left.') },
    { en: 'I found out the answer.', ru: 'Я узнал ответ.', uk: 'Я дізнався відповідь.', es: 'I found out the answer.', why: tri('Find out = узнать информацию.', 'Find out = дізнатися інформацію.', 'Find out = discover information.') },
  ],
  introBlocks: [
    {
      id: 'intro_pair',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты видишь первый глагол, но выбираешь вторую часть на слух. Из-за этого "включить" легко превращается в "выключить".',
        'Схоже, ти бачиш перше дієслово, але вибираєш другу частку навмання. Через це "увімкнути" легко перетворюється на "вимкнути".',
        'It looks like you see the first verb, but choose the second part by sound. That can turn switch on into switch off.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Мини-правило: не переводи turn, look, pick отдельно. Сначала спроси: какой смысл нужен?',
        'Міні-правило: не перекладай turn, look, pick окремо. Спочатку запитай: який сенс потрібен?',
        'Small rule: do not translate turn, look, pick alone. Ask: what meaning do I need?',
      ),
    },
    {
      id: 'intro_pairs',
      type: 'contrast',
      text: tri(
        'Тренируем не отдельный глагол, а пару целиком: turn on, look for, give up.',
        'Тренуємо не окреме дієслово, а пару цілком: turn on, look for, give up.',
        'We train pairs: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
      ),
    },
  ],
  steps: [
    phrasalStep({ id: 'phrasal_easy_001', order: 1, difficulty: 'easy', targetSkill: 'turn_on', sentence: 'Please turn ___ the light.', translation: tri('Пожалуйста, включи свет.', 'Будь ласка, увімкни світло.', 'Please turn on the light.'), options: ['on', 'off', 'up', 'out'], correctAnswer: 'on', pair: 'turn on', correctFeedback: tri('Да. Turn on = включить.', 'Так. Turn on = увімкнути.', 'Yes. Turn on = switch on.'), wrong: { off: tri('Turn off значит выключить. Здесь нужно включить: turn on.', 'Turn off означає вимкнути. Тут потрібно увімкнути: turn on.', 'Turn off means switch off. Here we need switch on: turn on.'), up: tri('Turn up чаще про громкость или силу. Свет включаем: turn on.', 'Turn up частіше про гучність або силу. Світло вмикаємо: turn on.', 'Turn up is usually about volume or intensity. For a light, use turn on.'), out: tri('Turn out дает другой смысл. Для света нужно turn on.', 'Turn out дає інший сенс. Для світла потрібно turn on.', 'Turn out gives a different meaning. For a light, use turn on.') }, retryLine: 'Нужен смысл: включить.', focusWords: ['turn on'] }),
    phrasalStep({ id: 'phrasal_easy_002', order: 2, difficulty: 'easy', targetSkill: 'turn_off', sentence: 'Please turn ___ the TV.', translation: tri('Пожалуйста, выключи телевизор.', 'Будь ласка, вимкни телевізор.', 'Please turn off the TV.'), options: ['off', 'on', 'up', 'in'], correctAnswer: 'off', pair: 'turn off', correctFeedback: tri('Да. Turn off = выключить.', 'Так. Turn off = вимкнути.', 'Yes. Turn off = switch off.'), wrong: { on: tri('Turn on значит включить. Здесь нужен обратный смысл: turn off.', 'Turn on означає увімкнути. Тут потрібен протилежний сенс: turn off.', 'Turn on means switch on. Here we need the opposite: turn off.'), up: tri('Turn up значит сделать громче или сильнее.', 'Turn up означає зробити голосніше або сильніше.', 'Turn up means make louder or stronger.'), in: tri('Turn in не подходит для телевизора. Нужно turn off.', 'Turn in не підходить для телевізора. Потрібно turn off.', 'Turn in does not fit a TV. We need turn off.') }, retryLine: 'Нужен смысл: выключить.', focusWords: ['turn off'] }),
    phrasalStep({ id: 'phrasal_easy_003', order: 3, difficulty: 'easy', targetSkill: 'look_up_information', sentence: 'I need to look ___ this word.', translation: tri('Мне нужно найти это слово в словаре.', 'Мені потрібно знайти це слово у словнику.', 'I need to look up this word.'), options: ['up', 'for', 'at', 'after'], correctAnswer: 'up', pair: 'look up', correctFeedback: tri('Да. Look up = найти информацию.', 'Так. Look up = знайти інформацію.', 'Yes. Look up = find information.'), wrong: { for: tri('Look for = искать предмет или человека. Слово в словаре = look up.', 'Look for = шукати предмет або людину. Слово у словнику = look up.', 'Look for = search for a thing or person. A word in a dictionary = look up.'), at: tri('Look at = смотреть на что-то. Это другой смысл.', 'Look at = дивитися на щось. Це інший сенс.', 'Look at = watch or look at something. That is a different meaning.'), after: tri('Look after = заботиться. Это не про словарь.', 'Look after = піклуватися. Це не про словник.', 'Look after = take care of. This is not about a dictionary.') }, retryLine: 'Нужен смысл: найти информацию.', focusWords: ['look up'] }),
    phrasalStep({ id: 'phrasal_easy_004', order: 4, difficulty: 'easy', targetSkill: 'look_for_search', sentence: 'I am looking ___ my keys.', translation: tri('Я ищу свои ключи.', 'Я шукаю свої ключі.', 'I am looking for my keys.'), options: ['for', 'up', 'after', 'into'], correctAnswer: 'for', pair: 'look for', correctFeedback: tri('Да. Look for = искать.', 'Так. Look for = шукати.', 'Yes. Look for = search for something.'), wrong: { up: tri('Look up = найти информацию в словаре или интернете. Ключи ищем: look for.', 'Look up = знайти інформацію у словнику або інтернеті. Ключі шукаємо: look for.', 'Look up = find information in a dictionary or online. For keys, use look for.'), after: tri('Look after = заботиться. Ключи не нужно воспитывать, их нужно найти.', 'Look after = піклуватися. Ключі не треба виховувати, їх треба знайти.', 'Look after = take care of. Keys need finding, not caring for.'), into: tri('Look into = изучить проблему. Ключи ищем: look for.', 'Look into = вивчити проблему. Ключі шукаємо: look for.', 'Look into = investigate a problem. For keys, use look for.') }, retryLine: 'Нужен смысл: искать предмет.', focusWords: ['look for'] }),
    phrasalStep({ id: 'phrasal_contrast_001', order: 5, difficulty: 'contrast', targetSkill: 'pick_up_collect', sentence: 'Can you pick me ___ at six?', translation: tri('Можешь забрать меня в шесть?', 'Можеш забрати мене о шостій?', 'Can you pick me up at six?'), options: ['up', 'out', 'off', 'on'], correctAnswer: 'up', pair: 'pick up', correctFeedback: tri('Да. Pick up здесь = забрать человека.', 'Так. Pick up тут = забрати людину.', 'Yes. Pick up here = collect a person.'), wrong: { out: tri('Pick out = выбрать из нескольких вариантов.', 'Pick out = вибрати з кількох варіантів.', 'Pick out = choose from several options.'), off: tri('Pick off дает другой смысл. Забрать человека = pick up.', 'Pick off дає інший сенс. Забрати людину = pick up.', 'Pick off gives a different meaning. Collect a person = pick up.'), on: tri('Pick on = придираться к кому-то. Это не "забрать".', 'Pick on = чіплятися до когось. Це не "забрати".', 'Pick on = criticize or bully someone. It is not collect.') }, retryLine: 'Нужен смысл: забрать человека.', focusWords: ['pick up'] }),
    phrasalStep({ id: 'phrasal_contrast_002', order: 6, difficulty: 'contrast', targetSkill: 'give_up_stop_trying', sentence: 'Do not give ___. Try again.', translation: tri('Не сдавайся. Попробуй еще раз.', 'Не здавайся. Спробуй ще раз.', 'Do not give up. Try again.'), options: ['up', 'back', 'out', 'in'], correctAnswer: 'up', pair: 'give up', correctFeedback: tri('Да. Give up = сдаться или перестать пытаться.', 'Так. Give up = здатися або перестати намагатися.', 'Yes. Give up = stop trying.'), wrong: { back: tri('Give back = вернуть. Здесь про "не сдавайся".', 'Give back = повернути. Тут про "не здавайся".', 'Give back = return something. Here the meaning is do not stop trying.'), out: tri('Give out = раздать или перестать работать. Здесь нужно give up.', 'Give out = роздати або перестати працювати. Тут потрібно give up.', 'Give out = distribute or stop working. Here we need give up.'), in: tri('Give in = уступить. Близко, но готовая фраза "не сдавайся" = do not give up.', 'Give in = поступитися. Близько, але готова фраза "не здавайся" = do not give up.', 'Give in = yield. Close, but do not stop trying = do not give up.') }, retryLine: 'Нужен смысл: не сдаваться.', focusWords: ['give up'] }),
    phrasalStep({ id: 'phrasal_contrast_003', order: 7, difficulty: 'contrast', targetSkill: 'find_out_discover', sentence: 'I need to find ___ the truth.', translation: tri('Мне нужно узнать правду.', 'Мені потрібно дізнатися правду.', 'I need to find out the truth.'), options: ['out', 'up', 'off', 'for'], correctAnswer: 'out', pair: 'find out', correctFeedback: tri('Да. Find out = узнать информацию.', 'Так. Find out = дізнатися інформацію.', 'Yes. Find out = discover information.'), wrong: { up: tri('Find up не нужна пара. Узнать информацию = find out.', 'Find up не потрібна пара. Дізнатися інформацію = find out.', 'Find up is not the pair we need. Discover information = find out.'), off: tri('Find off не дает нужный смысл.', 'Find off не дає потрібний сенс.', 'Find off does not give the needed meaning.'), for: tri('Find for не подходит. Нужно find out the truth.', 'Find for не підходить. Потрібно find out the truth.', 'Find for does not fit. We need find out the truth.') }, retryLine: 'Нужен смысл: узнать информацию.', focusWords: ['find out'] }),
    phrasalStep({ id: 'phrasal_contrast_004', order: 8, difficulty: 'contrast', targetSkill: 'run_out_of_supply', sentence: 'We ran ___ coffee.', translation: tri('У нас закончился кофе.', 'У нас закінчилася кава.', 'We ran out of coffee.'), options: ['out of', 'into', 'over', 'away'], correctAnswer: 'out of', pair: 'run out of', correctFeedback: tri('Да. Run out of = что-то закончилось.', 'Так. Run out of = щось закінчилося.', 'Yes. Run out of = have none left.'), wrong: { into: tri('Run into = случайно встретить или врезаться.', 'Run into = випадково зустріти або врізатися.', 'Run into = meet by chance or crash into.'), over: tri('Run over = переехать или быстро просмотреть.', 'Run over = переїхати або швидко переглянути.', 'Run over = hit with a vehicle or review quickly.'), away: tri('Run away = убежать. Кофе здесь просто закончился.', 'Run away = втекти. Кава тут просто закінчилася.', 'Run away = escape. Here the coffee is gone.') }, retryLine: 'Нужен смысл: запас закончился.', focusWords: ['run out of'] }),
    phrasalStep({ id: 'phrasal_mixed_001', order: 9, difficulty: 'mixed_review', targetSkill: 'put_on_clothes', sentence: 'Put ___ your jacket. It is cold.', translation: tri('Надень куртку. Холодно.', 'Одягни куртку. Холодно.', 'Put on your jacket. It is cold.'), options: ['on', 'off', 'up', 'out'], correctAnswer: 'on', pair: 'put on', correctFeedback: tri('Да. Put on = надеть одежду.', 'Так. Put on = одягнути одяг.', 'Yes. Put on = put clothes on your body.'), wrong: { off: tri('Put off = отложить. Одежду надевают: put on.', 'Put off = відкласти. Одяг одягають: put on.', 'Put off = postpone. For clothes, use put on.'), up: tri('Put up = поднять или разместить. Куртку надевают: put on.', 'Put up = підняти або розмістити. Куртку одягають: put on.', 'Put up = raise or place. For a jacket, use put on.'), out: tri('Put out = погасить или вынести. Это не про куртку.', 'Put out = загасити або винести. Це не про куртку.', 'Put out = extinguish or put outside. This is not about a jacket.') }, retryLine: 'Нужен смысл: надеть одежду.', focusWords: ['put on'] }),
    phrasalStep({ id: 'phrasal_mixed_002', order: 10, difficulty: 'mixed_review', targetSkill: 'take_off_clothes', sentence: 'Take ___ your shoes before you come in.', translation: tri('Сними обувь перед тем, как войти.', 'Зніми взуття перед тим, як зайти.', 'Take off your shoes before you come in.'), options: ['off', 'on', 'up', 'out'], correctAnswer: 'off', pair: 'take off', correctFeedback: tri('Да. Take off = снять одежду или обувь.', 'Так. Take off = зняти одяг або взуття.', 'Yes. Take off = remove clothes or shoes.'), wrong: { on: tri('Take on = взять на себя задачу. Обувь снимают: take off.', 'Take on = взяти на себе завдання. Взуття знімають: take off.', 'Take on = accept a task. For shoes, use take off.'), up: tri('Take up = начать занятие или занять место.', 'Take up = почати заняття або зайняти місце.', 'Take up = start an activity or use space.'), out: tri('Take out = вынести или достать. С обувью нужно take off.', 'Take out = винести або дістати. З взуттям потрібно take off.', 'Take out = remove from a place or take outside. For shoes, use take off.') }, retryLine: 'Нужен смысл: снять.', focusWords: ['take off'] }),
    phrasalStep({ id: 'phrasal_mixed_003', order: 11, difficulty: 'mixed_review', targetSkill: 'carry_on_continue', sentence: 'Please carry ___ with your work.', translation: tri('Пожалуйста, продолжай работу.', 'Будь ласка, продовжуй роботу.', 'Please carry on with your work.'), options: ['on', 'out', 'off', 'up'], correctAnswer: 'on', pair: 'carry on', correctFeedback: tri('Да. Carry on = продолжать.', 'Так. Carry on = продовжувати.', 'Yes. Carry on = continue.'), wrong: { out: tri('Carry out = выполнить план или задачу.', 'Carry out = виконати план або завдання.', 'Carry out = complete a plan or task.'), off: tri('Carry off = справиться с чем-то сложным. Здесь нужно продолжать.', 'Carry off = впоратися з чимось складним. Тут потрібно продовжувати.', 'Carry off = succeed at something difficult. Here we need continue.'), up: tri('Carry up не дает нужный смысл. Продолжать = carry on.', 'Carry up не дає потрібний сенс. Продовжувати = carry on.', 'Carry up does not give the needed meaning. Continue = carry on.') }, retryLine: 'Нужен смысл: продолжать.', focusWords: ['carry on'] }),
    phrasalStep({ id: 'phrasal_mixed_004', order: 12, difficulty: 'mixed_review', targetSkill: 'fill_in_form', sentence: 'Please fill ___ this form.', translation: tri('Пожалуйста, заполни эту форму.', 'Будь ласка, заповни цю форму.', 'Please fill in this form.'), options: ['in', 'out', 'up', 'off'], correctAnswer: 'in', pair: 'fill in', correctFeedback: tri('Да. Fill in = заполнить форму.', 'Так. Fill in = заповнити форму.', 'Yes. Fill in = complete a form.'), wrong: { out: tri('Fill out тоже может значить заполнить форму, но здесь тренируем пару fill in.', 'Fill out теж може означати заповнити форму, але тут тренуємо пару fill in.', 'Fill out can also mean complete a form, but this item trains fill in.'), up: tri('Fill up = наполнить до конца, например бак или стакан.', 'Fill up = наповнити до кінця, наприклад бак або склянку.', 'Fill up = fill completely, for example a tank or a glass.'), off: tri('Fill off не нужная пара. Для формы здесь нужно in.', 'Fill off не потрібна пара. Для форми тут потрібно in.', 'Fill off is not the needed pair. For a form here, use in.') }, retryLine: 'Нужен смысл: заполнить форму.', focusWords: ['fill in'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['turn_on_off_confusion', 'look_up_for_confusion', 'pair_meaning_unit'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем пару и смысл второй части.', 'Звичайне пояснення: показуємо пару і сенс другої частки.', 'Normal explanation: show the pair and the meaning of the second part.'),
    depth2: tri('Проще: не первое слово отдельно, а вся пара.', 'Простіше: не перше слово окремо, а вся пара.', 'Simpler: not the first word alone, but the whole pair.'),
    depth3: tri('Сравни две пары: turn on = включить, turn off = выключить.', 'Порівняй дві пари: turn on = увімкнути, turn off = вимкнути.', 'Compare two pairs: turn on = switch on, turn off = switch off.'),
    depth4: tri('Почти подсказка: выбираем пару под смысл фразы.', 'Майже підказка: вибираємо пару під сенс фрази.', 'Almost a hint: choose the pair for the meaning of the sentence.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card' },
    afterThreeWrongInSameExercise: { action: 'show_pair_meaning_hint_then_retry' },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode' },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_phrasal_001', prompt: tri('Нужен смысл "включить". Какая пара?', 'Потрібен сенс "увімкнути". Яка пара?', 'We need switch on. Which pair?'), options: ['turn on', 'turn off'], correctIndex: 0, thenReturnToExerciseId: 'phrasal_easy_001' },
      { id: 'guided_phrasal_002', prompt: tri('Нужен смысл "искать ключи". Какая пара?', 'Потрібен сенс "шукати ключі". Яка пара?', 'We need search for keys. Which pair?'), options: ['look up', 'look for'], correctIndex: 1, thenReturnToExerciseId: 'phrasal_easy_004' },
      { id: 'guided_phrasal_003', prompt: tri('Нужен смысл "не сдаваться". Какая пара?', 'Потрібен сенс "не здаватися". Яка пара?', 'We need not stop trying. Which pair?'), options: ['give up', 'give back'], correctIndex: 0, thenReturnToExerciseId: 'phrasal_contrast_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'phrasal_particle',
    microDiagnosisId: 'phrasal_particle_pair',
    diagnosisLabel: tri('Готовые пары', 'Готові пари', 'Ready-made pairs'),
    contrastSet: CONTRAST,
    focusWords: CONTRAST,
    focusPatterns: ['turn_on', 'turn_off', 'look_up_information', 'look_for_search', 'pick_up_collect', 'give_up_stop_trying', 'find_out_discover', 'run_out_of_supply', 'put_on_clothes', 'take_off_clothes', 'carry_on_continue', 'fill_in_form'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_phrasal_particle_pair_start',
    answer: 'diagnosis_training_phrasal_particle_pair_answer',
    mastery: 'diagnosis_training_phrasal_particle_pair_mastery',
    fallback: 'diagnosis_training_phrasal_particle_pair_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'phrasal_particle',
      microDiagnosisId: 'phrasal_particle_pair',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logParticleChoice: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=phrasal_particle&microDiagnosisId=phrasal_particle_pair',
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

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = 'This training is available for this interface language.'): TriText => ({ ru, uk, es });

const CONTRAST_SET = [
  'can',
  'could',
  'should',
  'must',
  'have to',
  "mustn't",
  "don't have to",
  'may',
  'might',
];

const option = (text: string) => ({ id: text, text });

const retry = (line: string): [TriText, TriText, TriText, TriText] => [
  tri(line, line, 'First choose the meaning: allowed, advisable, required, forbidden, not required, or possible.'),
  tri(
    'Сначала выбери смысл: можно, стоит, надо, запрещено, не обязательно или возможно.',
    'Спочатку вибери сенс: можна, варто, треба, заборонено, не обовʼязково або можливо.',
    'First choose the meaning: allowed, advisable, required, forbidden, not required, or possible.',
  ),
  tri(
    "Самая опасная пара: mustn't = нельзя, don't have to = не обязательно.",
    "Найнебезпечніша пара: mustn't = не можна, don't have to = не обовʼязково.",
    "The most dangerous pair: mustn't = forbidden, don't have to = not required.",
  ),
  tri(
    'Не переводи все одним словом "можно". Смотри на силу фразы.',
    'Не перекладай усе одним словом "можна". Дивись на силу фрази.',
    'Do not translate everything as "can". Look at the force of the phrase.',
  ),
];

const defaultWrong = (correctAnswer: string): TriText => tri(
  `Не та сила. Здесь нужно "${correctAnswer}": смысл фразы другой.`,
  `Не та сила. Тут потрібно "${correctAnswer}": сенс фрази інший.`,
  `Wrong force. We need "${correctAnswer}": the meaning is different.`,
);

function step(input: {
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
      'Здесь важно не само слово, а сила: разрешение, совет, правило, запрет, отсутствие обязанности или вероятность.',
      'Тут важливе не саме слово, а сила: дозвіл, порада, правило, заборона, відсутність обовʼязку або ймовірність.',
      'Here the word itself is not enough; choose the force: permission, advice, rule, prohibition, no obligation, or probability.',
    ),
    microTask: tri(
      'Выбери слово с нужной силой.',
      'Вибери слово з потрібною силою.',
      'Choose the word with the right force.',
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
    retryFeedback: retry(input.retryLine),
    fallbackExplanation: tri(
      "Can = можно/умею. Could = раньше мог или вежливая просьба. Should = стоит. Must/have to = надо. Mustn't = нельзя. Don't have to = не обязательно. May/might = возможно.",
      "Can = можна/вмію. Could = раніше міг або ввічливе прохання. Should = варто. Must/have to = треба. Mustn't = не можна. Don't have to = не обовʼязково. May/might = можливо.",
      "Can = allowed/able. Could = past ability or polite request. Should = advisable. Must/have to = required. Mustn't = forbidden. Don't have to = not required. May/might = possible.",
    ),
    focusWords: input.focusWords,
  };
}

export const MODAL_FORCE_TRAINING: DiagnosisTraining = {
  id: 'modal_force',
  category: 'modal',
  version: '1.0.0',
  status: 'active',
  priority: 38,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Can / Should / Must: выбираем силу', 'Can / Should / Must: вибираємо силу', 'Can / Should / Must: choose the force'),
  shortTitle: tri('Сила can/should/must', 'Сила can/should/must', 'Force of can/should/must'),
  shortDiagnosis: tri(
    'Ты выбираешь похожее слово, но меняешь смысл: можно, стоит, надо, нельзя или не обязательно.',
    'Ти вибираєш схоже слово, але змінюєш сенс: можна, варто, треба, не можна або не обовʼязково.',
    'You choose a similar word, but change the meaning: allowed, advisable, required, forbidden, or not required.',
  ),
  diagnosisText: tri(
    'Ошибка здесь не в действии после модального слова. Ошибка в силе фразы: совет превращается в приказ, а запрет - в "не обязательно".',
    'Помилка тут не в дії після модального слова. Помилка в силі фрази: порада перетворюється на наказ, а заборона - на "не обовʼязково".',
    'The mistake is not in the action after the modal word. The mistake is the force: advice can become an order, and prohibition can become "not required".',
  ),
  mentalModel: tri(
    'Думай шкалой: can = можно, should = стоит, must/have to = надо, must not = нельзя, do not have to = не обязательно, might = возможно.',
    'Думай шкалою: can = можна, should = варто, must/have to = треба, must not = не можна, do not have to = не обовʼязково, might = можливо.',
    'Think as a scale: can = allowed, should = advisable, must/have to = required, must not = forbidden, do not have to = not required, might = possible.',
  ),
  contrastSet: CONTRAST_SET,
  coreRule: tri(
    "Главная ловушка: mustn't не равно don't have to. Mustn't = нельзя. Don't have to = можно, но не обязательно.",
    "Головна пастка: mustn't не дорівнює don't have to. Mustn't = не можна. Don't have to = можна, але не обовʼязково.",
    "Main trap: mustn't is not don't have to. Mustn't = forbidden. Don't have to = allowed, but not required.",
  ),
  whatUserMustLearn: {
    ru: [
      'Can часто значит можно или умею.',
      'Could может быть вежливой просьбой или прошлой способностью.',
      'Should звучит как совет.',
      'Must и have to звучат как надо.',
      "Mustn't значит нельзя.",
      "Don't have to значит не обязательно.",
      'May и might часто про вероятность или возможность.',
    ],
    uk: [
      'Can часто означає можна або вмію.',
      'Could може бути ввічливим проханням або минулою здатністю.',
      'Should звучить як порада.',
      'Must і have to звучать як треба.',
      "Mustn't означає не можна.",
      "Don't have to означає не обовʼязково.",
      'May і might часто про ймовірність або можливість.',
    ],
    es: [
      'Can often means allowed or able.',
      'Could can be a polite request or past ability.',
      'Should sounds like advice.',
      'Must and have to sound like requirement.',
      "Mustn't means forbidden.",
      "Don't have to means not required.",
      'May and might often mean possibility.',
    ],
  },
  examples: [
    { en: 'You can sit here.', ru: 'You can sit here.', uk: 'You can sit here.', es: 'You can sit here.', why: tri('Can дает разрешение.', 'Can дає дозвіл.', 'Can gives permission.') },
    { en: 'Could you help me?', ru: 'Could you help me?', uk: 'Could you help me?', es: 'Could you help me?', why: tri('Could делает просьбу мягче.', 'Could робить прохання мʼякшим.', 'Could makes the request softer.') },
    { en: 'You should rest.', ru: 'You should rest.', uk: 'You should rest.', es: 'You should rest.', why: tri('Should звучит как совет.', 'Should звучить як порада.', 'Should sounds like advice.') },
    { en: 'You must wear a helmet.', ru: 'You must wear a helmet.', uk: 'You must wear a helmet.', es: 'You must wear a helmet.', why: tri('Must звучит как строгое правило.', 'Must звучить як суворе правило.', 'Must sounds like a strong rule.') },
    { en: 'You must not smoke here.', ru: 'You must not smoke here.', uk: 'You must not smoke here.', es: 'You must not smoke here.', why: tri('Must not значит запрещено.', 'Must not означає заборонено.', 'Must not means forbidden.') },
    { en: "You don't have to come early.", ru: "You don't have to come early.", uk: "You don't have to come early.", es: "You don't have to come early.", why: tri('Do not have to значит не обязательно.', 'Do not have to означає не обовʼязково.', 'Do not have to means not required.') },
    { en: 'She might be at home.', ru: 'She might be at home.', uk: 'She might be at home.', es: 'She might be at home.', why: tri('Might дает неполную уверенность.', 'Might дає неповну впевненість.', 'Might gives uncertainty.') },
    { en: 'When I was five, I could swim.', ru: 'When I was five, I could swim.', uk: 'When I was five, I could swim.', es: 'When I was five, I could swim.', why: tri('Could здесь про то, что умел раньше.', 'Could тут про те, що вмів раніше.', 'Could here means was able before.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Слова похожи, но сила разная. You should rest не равно You must rest.', 'Слова схожі, але сила різна. You should rest не дорівнює You must rest.', 'The words are similar, but the force is different. You should rest is not You must rest.') },
    { id: 'intro_scale', type: 'rule', text: tri("Шкала: can -> should -> must/have to. Отдельно: mustn't = нельзя, don't have to = не обязательно.", "Шкала: can -> should -> must/have to. Окремо: mustn't = не можна, don't have to = не обовʼязково.", "Scale: can -> should -> must/have to. Separately: mustn't = forbidden, don't have to = not required.") },
    { id: 'intro_probability', type: 'contrast', text: tri('May/might держи отдельно: это возможно, а не правило.', 'May/might тримай окремо: це можливо, а не правило.', 'Keep may/might separate: possible, not a rule.') },
  ],
  steps: [
    step({ id: 'modal_force_easy_001', order: 1, difficulty: 'easy', targetSkill: 'can_permission', sentence: 'You ___ sit here. This seat is free.', translation: tri('Можно сесть здесь. Место свободно.', 'Можна сісти тут. Місце вільне.', 'You can sit here. This seat is free.'), options: ['can', 'must', 'should', "mustn't"], correctAnswer: 'can', correctFeedback: tri('Да. Здесь разрешение: You can sit here.', 'Так. Тут дозвіл: You can sit here.', 'Yes. This is permission: You can sit here.'), wrong: { must: tri('Must звучит так, будто человек обязан сесть. Здесь просто разрешение: can.', 'Must звучить так, ніби людина зобовʼязана сісти. Тут просто дозвіл: can.', 'Must sounds like an obligation to sit. Here it is just permission: can.'), should: tri('Should звучит как совет сесть. Здесь смысл "можно": can.', 'Should звучить як порада сісти. Тут сенс "можна": can.', 'Should sounds like advice to sit. Here the meaning is allowed: can.'), "mustn't": tri("Mustn't значит нельзя. Это противоположный смысл.", "Mustn't означає не можна. Це протилежний сенс.", "Mustn't means forbidden. That is the opposite meaning.") }, retryLine: 'Нужно мягкое разрешение: can.', focusWords: ['can'] }),
    step({ id: 'modal_force_easy_002', order: 2, difficulty: 'easy', targetSkill: 'should_advice', sentence: 'You ___ rest. You look tired.', translation: tri('Тебе стоит отдохнуть. Ты выглядишь уставшим.', 'Тобі варто відпочити. Ти виглядаєш втомленим.', 'You should rest. You look tired.'), options: ['should', 'must', 'can', "don't have to"], correctAnswer: 'should', correctFeedback: tri('Да. Should дает совет: You should rest.', 'Так. Should дає пораду: You should rest.', 'Yes. Should gives advice: You should rest.'), wrong: { must: tri('Must слишком строго. Здесь дружеский совет: should.', 'Must занадто суворо. Тут дружня порада: should.', 'Must is too strong. This is friendly advice: should.'), can: tri('Can значит можно или умеешь, но не дает совет.', 'Can означає можна або вмієш, але не дає пораду.', 'Can means allowed or able, but it does not give advice.'), "don't have to": tri("Don't have to значит не обязательно. Здесь человеку стоит отдохнуть.", "Don't have to означає не обовʼязково. Тут людині варто відпочити.", "Don't have to means not required. Here the person should rest.") }, retryLine: 'Совет = should.', focusWords: ['should'] }),
    step({ id: 'modal_force_easy_003', order: 3, difficulty: 'easy', targetSkill: 'must_rule', sentence: 'You ___ wear a helmet here. It is the rule.', translation: tri('Здесь надо надеть шлем. Это правило.', 'Тут треба одягнути шолом. Це правило.', 'You must wear a helmet here. It is the rule.'), options: ['must', 'can', 'might', "don't have to"], correctAnswer: 'must', correctFeedback: tri('Да. Правило требует must.', 'Так. Правило потребує must.', 'Yes. A rule needs must.'), wrong: { can: tri('Can дает разрешение, но не обязательное правило.', 'Can дає дозвіл, але не обовʼязкове правило.', 'Can gives permission, not a required rule.'), might: tri('Might значит возможно. Здесь правило: must.', 'Might означає можливо. Тут правило: must.', 'Might means possible. Here it is a rule: must.'), "don't have to": tri("Don't have to значит не обязательно. Здесь наоборот: надо.", "Don't have to означає не обовʼязково. Тут навпаки: треба.", "Don't have to means not required. Here it is the opposite: required.") }, retryLine: 'Строгое правило = must.', focusWords: ['must'] }),
    step({ id: 'modal_force_easy_004', order: 4, difficulty: 'easy', targetSkill: 'must_not_prohibition', sentence: 'You ___ smoke here. It is forbidden.', translation: tri('Здесь нельзя курить. Это запрещено.', 'Тут не можна курити. Це заборонено.', 'You must not smoke here. It is forbidden.'), options: ["mustn't", "don't have to", 'should', 'may'], correctAnswer: "mustn't", correctFeedback: tri("Да. Mustn't значит нельзя.", "Так. Mustn't означає не можна.", "Yes. Mustn't means forbidden."), wrong: { "don't have to": tri("Don't have to значит не обязательно, но можно. Здесь нельзя, поэтому mustn't.", "Don't have to означає не обовʼязково, але можна. Тут не можна, тому mustn't.", "Don't have to means not required, but allowed. Here it is forbidden, so use mustn't."), should: tri("Should не делает сильный запрет. Здесь нужно mustn't.", "Should не створює сильної заборони. Тут потрібно mustn't.", "Should does not make a strong prohibition. Here we need mustn't."), may: tri('May звучит как можно или возможно. Здесь запрет.', 'May звучить як можна або можливо. Тут заборона.', 'May sounds like allowed or possible. Here it is forbidden.') }, retryLine: "Запрещено = mustn't.", focusWords: ["mustn't"] }),
    step({ id: 'modal_force_contrast_001', order: 5, difficulty: 'contrast', targetSkill: 'no_obligation', sentence: 'You ___ come early. The meeting starts at ten.', translation: tri('Не обязательно приходить рано. Встреча в десять.', 'Не обовʼязково приходити рано. Зустріч о десятій.', "You don't have to come early. The meeting starts at ten."), options: ["don't have to", "mustn't", 'should', 'can'], correctAnswer: "don't have to", correctFeedback: tri("Да. Don't have to = не обязательно.", "Так. Don't have to = не обовʼязково.", "Yes. Don't have to = not required."), wrong: { "mustn't": tri("Mustn't значит запрещено. Здесь просто не обязательно.", "Mustn't означає заборонено. Тут просто не обовʼязково.", "Mustn't means forbidden. Here it is simply not required."), should: tri('Should советует прийти рано. Здесь обратный смысл.', 'Should радить прийти рано. Тут протилежний сенс.', 'Should advises coming early. Here the meaning is the opposite.'), can: tri('Can значит можешь, но не показывает отсутствие обязанности так ясно.', 'Can означає можеш, але не показує відсутність обовʼязку так чітко.', 'Can means you can, but it does not show lack of obligation clearly enough.') }, retryLine: "Не обязательно = don't have to.", focusWords: ["don't have to"] }),
    step({ id: 'modal_force_contrast_002', order: 6, difficulty: 'contrast', targetSkill: 'polite_request', sentence: '___ you help me, please?', translation: tri('Не могли бы вы помочь?', 'Чи не могли б ви допомогти?', 'Could you help me, please?'), options: ['Could', 'Must', 'Should', 'May'], correctAnswer: 'Could', correctFeedback: tri('Да. Could делает просьбу вежливой.', 'Так. Could робить прохання ввічливим.', 'Yes. Could makes the request polite.'), wrong: { Must: tri('Must you help me звучит как требование, не просьба.', 'Must you help me звучить як вимога, не прохання.', 'Must you help me sounds like a demand, not a request.'), Should: tri('Should you help me звучит как вопрос о совете.', 'Should you help me звучить як питання про пораду.', 'Should you help me sounds like a question about advice.'), May: tri('May I... подходит, когда ты просишь разрешение себе. Здесь просьба к человеку: Could you...?', 'May I... підходить, коли ти просиш дозвіл собі. Тут прохання до людини: Could you...?', 'May I... fits when you ask permission for yourself. Here you ask another person: Could you...?') }, retryLine: 'Вежливая просьба = Could you...?', focusWords: ['could'] }),
    step({ id: 'modal_force_contrast_003', order: 7, difficulty: 'contrast', targetSkill: 'possibility_might', sentence: 'She ___ be at home, but I am not sure.', translation: tri('Она, возможно, дома, но я не уверен.', 'Вона, можливо, вдома, але я не впевнений.', 'She might be at home, but I am not sure.'), options: ['might', 'must', 'can', "mustn't"], correctAnswer: 'might', correctFeedback: tri('Да. Might показывает возможность без уверенности.', 'Так. Might показує можливість без впевненості.', 'Yes. Might shows uncertain possibility.'), wrong: { must: tri('Must звучит как почти уверенный вывод. Здесь я не уверен.', 'Must звучить як майже впевнений висновок. Тут я не впевнений.', 'Must sounds like a strong conclusion. Here I am not sure.'), can: tri('Can часто про разрешение или общую возможность. Здесь нужна неполная уверенность: might.', 'Can часто про дозвіл або загальну можливість. Тут потрібна неповна впевненість: might.', 'Can is often about permission or general possibility. Here we need uncertainty: might.'), "mustn't": tri("Mustn't значит запрещено. Это не про вероятность.", "Mustn't означає заборонено. Це не про ймовірність.", "Mustn't means forbidden. This is not about probability.") }, retryLine: 'Не уверен, но возможно = might.', focusWords: ['might'] }),
    step({ id: 'modal_force_contrast_004', order: 8, difficulty: 'contrast', targetSkill: 'past_ability_could', sentence: 'When I was a child, I ___ run very fast.', translation: tri('Когда я был ребенком, я умел быстро бегать.', 'Коли я був дитиною, я вмів швидко бігати.', 'When I was a child, I could run very fast.'), options: ['could', 'can', 'must', 'should'], correctAnswer: 'could', correctFeedback: tri('Да. Could здесь значит умел раньше.', 'Так. Could тут означає вмів раніше.', 'Yes. Could here means was able before.'), wrong: { can: tri('Can про сейчас или вообще. Здесь прошлое: when I was a child, I could.', 'Can про зараз або загалом. Тут минуле: when I was a child, I could.', 'Can is for now or generally. Here it is past: when I was a child, I could.'), must: tri('Must значит надо, не умел.', 'Must означає треба, не вмів.', 'Must means required, not was able.'), should: tri('Should значит стоит, не умел.', 'Should означає варто, не вмів.', 'Should means advisable, not was able.') }, retryLine: 'Мог раньше = could.', focusWords: ['could'] }),
    step({ id: 'modal_force_mixed_001', order: 9, difficulty: 'mixed_review', targetSkill: 'external_requirement_have_to', sentence: 'I ___ work tomorrow. My boss asked me.', translation: tri('Мне надо работать завтра. Начальник попросил.', 'Мені треба працювати завтра. Начальник попросив.', 'I have to work tomorrow. My boss asked me.'), options: ['have to', 'should', 'might', "don't have to"], correctAnswer: 'have to', correctFeedback: tri('Да. Have to подходит для внешнего требования.', 'Так. Have to підходить для зовнішньої вимоги.', 'Yes. Have to fits an outside requirement.'), wrong: { should: tri('Should звучит как совет, а boss asked me делает это обязанностью.', 'Should звучить як порада, а boss asked me робить це обовʼязком.', 'Should sounds like advice, but boss asked me makes it a requirement.'), might: tri('Might значит возможно. Здесь надо работать.', 'Might означає можливо. Тут треба працювати.', 'Might means possible. Here work is required.'), "don't have to": tri("Don't have to значит не обязательно. Здесь наоборот: have to.", "Don't have to означає не обовʼязково. Тут навпаки: have to.", "Don't have to means not required. Here it is the opposite: have to.") }, retryLine: 'Внешнее надо = have to.', focusWords: ['have to'] }),
    step({ id: 'modal_force_mixed_002', order: 10, difficulty: 'mixed_review', targetSkill: 'may_formal_permission', sentence: '___ I ask a question?', translation: tri('Можно задать вопрос?', 'Можна поставити питання?', 'May I ask a question?'), options: ['May', 'Must', 'Should', "Mustn't"], correctAnswer: 'May', correctFeedback: tri('Да. May I...? звучит как вежливый запрос разрешения.', 'Так. May I...? звучить як ввічливий запит дозволу.', 'Yes. May I...? sounds like polite permission.'), wrong: { Must: tri('Must I ask? значит "я обязан спросить?"', 'Must I ask? означає "я зобовʼязаний спитати?"', 'Must I ask? means am I required to ask?'), Should: tri('Should I ask? значит "стоит ли спросить?"', 'Should I ask? означає "чи варто спитати?"', 'Should I ask? means is it advisable to ask?'), "Mustn't": tri("Mustn't I ask? здесь не подходит. Нужно May I...?", "Mustn't I ask? тут не підходить. Потрібно May I...?", "Mustn't I ask? does not fit here. Use May I...?") }, retryLine: 'Вежливо спросить разрешение = May I...?', focusWords: ['may'] }),
    step({ id: 'modal_force_mixed_003', order: 11, difficulty: 'mixed_review', targetSkill: 'strong_deduction_must', sentence: 'You ___ be tired after that long trip.', translation: tri('Ты, должно быть, устал после долгой поездки.', 'Ти, мабуть, втомився після довгої подорожі.', 'You must be tired after that long trip.'), options: ['must', 'can', "mustn't", "don't have to"], correctAnswer: 'must', correctFeedback: tri('Да. Must здесь значит сильный вывод: должно быть.', 'Так. Must тут означає сильний висновок: мабуть.', 'Yes. Must here means a strong conclusion.'), wrong: { can: tri('Can не дает сильный вывод. Здесь говорящий почти уверен.', 'Can не дає сильний висновок. Тут мовець майже впевнений.', 'Can does not give a strong conclusion. Here the speaker is almost sure.'), "mustn't": tri("Mustn't значит запрещено. Усталость нельзя запретить.", "Mustn't означає заборонено. Втому не можна заборонити.", "Mustn't means forbidden. You cannot forbid tiredness."), "don't have to": tri("Don't have to значит не обязательно. Это не вывод о состоянии.", "Don't have to означає не обовʼязково. Це не висновок про стан.", "Don't have to means not required. This is not a conclusion about a state.") }, retryLine: 'Сильный вывод = must.', focusWords: ['must'] }),
    step({ id: 'modal_force_mixed_004', order: 12, difficulty: 'mixed_review', targetSkill: 'should_not_advice', sentence: 'You ___ eat so much sugar.', translation: tri('Тебе не стоит есть так много сахара.', 'Тобі не варто їсти так багато цукру.', "You shouldn't eat so much sugar."), options: ["shouldn't", "mustn't", "don't have to", 'may not'], correctAnswer: "shouldn't", correctFeedback: tri("Да. Shouldn't дает совет не делать.", "Так. Shouldn't дає пораду не робити.", "Yes. Shouldn't gives advice not to do it."), wrong: { "mustn't": tri("Mustn't звучит как строгий запрет. Здесь совет о здоровье.", "Mustn't звучить як сувора заборона. Тут порада про здоровʼя.", "Mustn't sounds like a strict prohibition. Here it is health advice."), "don't have to": tri("Don't have to значит не обязан есть сахар. Здесь смысл: лучше не ешь.", "Don't have to означає не зобовʼязаний їсти цукор. Тут сенс: краще не їж.", "Don't have to means you are not required to eat sugar. Here the meaning is: better not."), 'may not': tri('May not не дает нужный совет. Здесь нужно should not.', 'May not не дає потрібну пораду. Тут потрібно should not.', 'May not does not give the needed advice. Here we need should not.') }, retryLine: 'Мягкий совет не делать = should not.', focusWords: ["shouldn't"] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['permission_vs_obligation', 'prohibition_vs_no_obligation', 'advice_vs_rule', 'possibility_vs_rule'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем силу выбранного слова.', 'Показуємо силу вибраного слова.', 'Show the force of the chosen word.'),
    depth2: tri('Проще: можно, стоит, надо, нельзя, не обязательно или возможно.', 'Простіше: можна, варто, треба, не можна, не обовʼязково або можливо.', 'Simpler: allowed, advisable, required, forbidden, not required, or possible.'),
    depth3: tri("Сравни пару mustn't / don't have to.", "Порівняй пару mustn't / don't have to.", "Compare mustn't / don't have to."),
    depth4: tri('Даем почти прямую смысловую подсказку.', 'Даємо майже пряму смислову підказку.', 'Give an almost direct meaning hint.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri("Can = можно. Should = стоит. Must/have to = надо. Mustn't = нельзя. Don't have to = не обязательно. Might = возможно.", "Can = можна. Should = варто. Must/have to = треба. Mustn't = не можна. Don't have to = не обовʼязково. Might = можливо.", "Can = allowed. Should = advisable. Must/have to = required. Mustn't = forbidden. Don't have to = not required. Might = possible."),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_force_scale_then_retry',
      card: tri("Запомни пару: mustn't = нельзя, don't have to = не обязательно.", "Запамʼятай пару: mustn't = не можна, don't have to = не обовʼязково.", "Remember the pair: mustn't = forbidden, don't have to = not required."),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Guided mode: сначала выбери смысл, потом слово.', 'Guided mode: спочатку вибери сенс, потім слово.', 'Guided mode: first choose the meaning, then the word.'),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_modal_force_001', prompt: tri('You should rest: это совет или приказ?', 'You should rest: це порада чи наказ?', 'You should rest: advice or order?'), options: ['advice', 'order'], correctIndex: 0, thenReturnToExerciseId: 'modal_force_easy_002' },
      { id: 'guided_modal_force_002', prompt: tri("Mustn't: запрещено или не обязательно?", "Mustn't: заборонено чи не обовʼязково?", "Mustn't: forbidden or not required?"), options: ['forbidden', 'not required'], correctIndex: 0, thenReturnToExerciseId: 'modal_force_easy_004' },
      { id: 'guided_modal_force_003', prompt: tri("Don't have to: запрет или не обязательно?", "Don't have to: заборона чи не обовʼязково?", "Don't have to: forbidden or not required?"), options: ['forbidden', 'not required'], correctIndex: 1, thenReturnToExerciseId: 'modal_force_contrast_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modal',
    microDiagnosisId: 'modal_force',
    diagnosisLabel: tri('Сила can/should/must', 'Сила can/should/must', 'Force of can/should/must'),
    contrastSet: CONTRAST_SET,
    focusWords: ['can', 'could', 'should', 'must', 'have to', "mustn't", "don't have to", 'may', 'might'],
    focusPatterns: ['can_permission', 'should_advice', 'must_rule', 'must_not_prohibition', 'no_obligation', 'polite_request', 'possibility_might', 'past_ability_could', 'external_requirement_have_to', 'may_formal_permission', 'strong_deduction_must', 'should_not_advice'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_modal_force_start',
    answer: 'diagnosis_training_modal_force_answer',
    mastery: 'diagnosis_training_modal_force_mastery',
    fallback: 'diagnosis_training_modal_force_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'modal', microDiagnosisId: 'modal_force', contrastSet: CONTRAST_SET, logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=modal&microDiagnosisId=modal_force',
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

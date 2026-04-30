// Нормализация сокращений — поддержка curly apostrophes с мобильных клавиатур
//
// AmE-tolerance: при сравнении ответов британские эквиваленты приводятся к AmE,
// чтобы пользователь, выбравший BrE-вариант, всё равно получал «правильно».
// На экране результата и в TTS пользователь видит/слышит AmE-канон
// (т.к. lesson-экран рендерит phrase.english после успеха).
//
// Сюда включены ТОЛЬКО однозначно безопасные замены:
//  - орфографические различия BrE/AmE (colour→color, theatre→theater, organise→organize и т.д.);
//  - BrE-only лексика без двойного значения в AmE (pavement→sidewalk, queue→line, rubbish→trash, …).
// Намеренно НЕ включены слова с другим значением в AmE: lift (verb), cooker, torch,
// boot, bonnet, chips, holiday, jumper, coriander, prawn — иначе нормализация
// исказит смысл фразы.

const PAIRS: [RegExp, string][] = [
  // Отрицательные вспомогательные
  [/\bdidn't\b/gi,    'did not'],
  [/\bdoesn't\b/gi,   'does not'],
  [/\bdon't\b/gi,     'do not'],
  [/\bwon't\b/gi,     'will not'],
  [/\bwouldn't\b/gi,  'would not'],
  [/\bcouldn't\b/gi,  'could not'],
  [/\bshouldn't\b/gi, 'should not'],
  [/\bmustn't\b/gi,   'must not'],
  [/\bmightn't\b/gi,  'might not'],
  [/\bneedn't\b/gi,   'need not'],
  [/\bdaren't\b/gi,   'dare not'],
  [/\bhasn't\b/gi,    'has not'],
  [/\bhaven't\b/gi,   'have not'],
  [/\bhadn't\b/gi,    'had not'],
  [/\bisn't\b/gi,     'is not'],
  [/\baren't\b/gi,    'are not'],
  [/\bwasn't\b/gi,    'was not'],
  [/\bweren't\b/gi,   'were not'],
  [/\bcan't\b/gi,     'can not'],
  [/\bcannot\b/gi,    'can not'],
  // Местоимения + be/have/will/would
  [/\bI'm\b/gi,       'I am'],
  [/\bI've\b/gi,      'I have'],
  [/\bI'll\b/gi,      'I will'],
  [/\bI'd\b/gi,       'I would'],
  [/\bhe's\b/gi,      'he is'],
  [/\bshe's\b/gi,     'she is'],
  [/\bit's\b/gi,      'it is'],
  [/\bwe're\b/gi,     'we are'],
  [/\bthey're\b/gi,   'they are'],
  [/\byou're\b/gi,    'you are'],
  [/\bhe'll\b/gi,     'he will'],
  [/\bshe'll\b/gi,    'she will'],
  [/\bit'll\b/gi,     'it will'],
  [/\bthey'll\b/gi,   'they will'],
  [/\bwe'll\b/gi,     'we will'],
  [/\byou'll\b/gi,    'you will'],
  [/\bhe'd\b/gi,      'he would'],
  [/\bshe'd\b/gi,     'she would'],
  [/\bthey'd\b/gi,    'they would'],
  [/\bwe'd\b/gi,      'we would'],
  [/\byou'd\b/gi,     'you would'],
  [/\bthey've\b/gi,   'they have'],
  [/\bwe've\b/gi,     'we have'],
  [/\byou've\b/gi,    'you have'],
  [/\bthere's\b/gi,   'there is'],
  [/\bthere're\b/gi,  'there are'],
  [/\bthat's\b/gi,    'that is'],
  [/\bwhat's\b/gi,    'what is'],
  [/\bwho's\b/gi,     'who is'],
];

// BrE → AmE «синонимы»: применяются после lowercase, до сравнения.
// Регексы с \b — только полные слова, без partial-match.
// Порядок не важен (нет цепочек), все замены независимы.
type BreReplacer = string | ((match: string, ...groups: string[]) => string);
const keepSuffix = (stem: string) => (_m: string, suf?: string) => `${stem}${suf || ''}`;
const swapSuffix = (stem: string) => (_m: string, suf: string) => `${stem}${suf}`;

const BRE_TO_AME: [RegExp, BreReplacer][] = [
  // -our → -or
  [/\bcolour(s|ed|ing|ful)?\b/g,      keepSuffix('color')],
  [/\bfavour(s|ed|ite|ites)?\b/g,     keepSuffix('favor')],
  [/\bhonour(s|ed|able)?\b/g,         keepSuffix('honor')],
  [/\bbehaviour(s)?\b/g,              keepSuffix('behavior')],
  [/\bneighbour(s|ing|hood|ly)?\b/g,  keepSuffix('neighbor')],
  [/\blabour(s|ed|ing)?\b/g,          keepSuffix('labor')],
  [/\bharbour(s)?\b/g,                keepSuffix('harbor')],
  [/\bflavour(s|ed|ing|ful)?\b/g,     keepSuffix('flavor')],
  [/\bhumour(s|ed|less)?\b/g,         keepSuffix('humor')],
  [/\bvapour(s)?\b/g,                 keepSuffix('vapor')],
  [/\brumour(s)?\b/g,                 keepSuffix('rumor')],
  [/\bsaviour(s)?\b/g,                keepSuffix('savior')],
  [/\bodour(s|less)?\b/g,             keepSuffix('odor')],
  // -re → -er
  [/\bcentre(s|d)?\b/g,               keepSuffix('center')],
  [/\btheatre(s)?\b/g,                keepSuffix('theater')],
  [/\bmetre(s)?\b/g,                  keepSuffix('meter')],
  [/\blitre(s)?\b/g,                  keepSuffix('liter')],
  [/\bfibre(s)?\b/g,                  keepSuffix('fiber')],
  [/\bkilometre(s)?\b/g,              keepSuffix('kilometer')],
  // -ise → -ize (с производными)
  [/\brealis(e|es|ed|ing)\b/g,                 swapSuffix('realiz')],
  [/\borganis(e|es|ed|ing|ation|ations)\b/g,   swapSuffix('organiz')],
  [/\brecognis(e|es|ed|ing)\b/g,               swapSuffix('recogniz')],
  [/\bapologis(e|es|ed|ing)\b/g,               swapSuffix('apologiz')],
  [/\bcriticis(e|es|ed|ing)\b/g,               swapSuffix('criticiz')],
  [/\bsummaris(e|es|ed|ing)\b/g,               swapSuffix('summariz')],
  [/\bmemoris(e|es|ed|ing)\b/g,                swapSuffix('memoriz')],
  [/\banalys(e|es|ed|ing)\b/g,                 swapSuffix('analyz')],
  [/\bemphasis(e|es|ed|ing)\b/g,               swapSuffix('emphasiz')],
  [/\bspecialis(e|es|ed|ing)\b/g,              swapSuffix('specializ')],
  [/\bprioritis(e|es|ed|ing)\b/g,              swapSuffix('prioritiz')],
  [/\bcategoris(e|es|ed|ing)\b/g,              swapSuffix('categoriz')],
  [/\boptimis(e|es|ed|ing)\b/g,                swapSuffix('optimiz')],
  [/\bmaximis(e|es|ed|ing)\b/g,                swapSuffix('maximiz')],
  [/\bminimis(e|es|ed|ing)\b/g,                swapSuffix('minimiz')],
  [/\butilis(e|es|ed|ing)\b/g,                 swapSuffix('utiliz')],
  [/\bsympathis(e|es|ed|ing)\b/g,              swapSuffix('sympathiz')],
  [/\bfinalis(e|es|ed|ing)\b/g,                swapSuffix('finaliz')],
  [/\bpublicis(e|es|ed|ing)\b/g,               swapSuffix('publiciz')],
  // practise (BrE verb) → practice
  [/\bpractis(e|es|ed|ing)\b/g,                swapSuffix('practic')],
  // -ence → -ense (существительные)
  [/\bdefence\b/g,  'defense'],
  [/\boffence\b/g,  'offense'],
  [/\blicence\b/g,  'license'],
  [/\bpretence\b/g, 'pretense'],
  // -ll → -l для безударных past/-ing форм (BrE удваивает, AmE — нет)
  [/\btravelled\b/g,  'traveled'],   [/\btravelling\b/g,  'traveling'],
  [/\bcancelled\b/g,  'canceled'],   [/\bcancelling\b/g,  'canceling'],
  [/\bmodelled\b/g,   'modeled'],    [/\bmodelling\b/g,   'modeling'],
  [/\blabelled\b/g,   'labeled'],    [/\blabelling\b/g,   'labeling'],
  [/\bsignalled\b/g,  'signaled'],   [/\bsignalling\b/g,  'signaling'],
  [/\bfuelled\b/g,    'fueled'],     [/\bfuelling\b/g,    'fueling'],
  [/\bdialled\b/g,    'dialed'],     [/\bdialling\b/g,    'dialing'],
  [/\blevelled\b/g,   'leveled'],    [/\blevelling\b/g,   'leveling'],
  [/\btunnelled\b/g,  'tunneled'],   [/\btunnelling\b/g,  'tunneling'],
  [/\bcounselled\b/g, 'counseled'],  [/\bcounselling\b/g, 'counseling'],
  // -l → -ll: в AmE base form удваивает
  [/\bskilful\b/g,     'skillful'],
  [/\bwilful\b/g,      'willful'],
  [/\bfulfil\b/g,      'fulfill'],
  [/\benrol\b/g,       'enroll'],
  [/\benthral\b/g,     'enthrall'],
  [/\binstalment\b/g,  'installment'],
  [/\benrolment\b/g,   'enrollment'],
  [/\bfulfilment\b/g,  'fulfillment'],
  // BrE past tense -t → AmE -ed (где AmE форма однозначна)
  [/\blearnt\b/g, 'learned'],
  [/\bdreamt\b/g, 'dreamed'],
  [/\bburnt\b/g,  'burned'],
  [/\bsmelt\b/g,  'smelled'],
  [/\bspelt\b/g,  'spelled'],
  [/\bspilt\b/g,  'spilled'],
  [/\bspoilt\b/g, 'spoiled'],
  [/\bleapt\b/g,  'leaped'],
  [/\bleant\b/g,  'leaned'],
  [/\bknelt\b/g,  'kneeled'],
  // Прочая орфография
  [/\bgrey(s|ish)?\b/g,        keepSuffix('gray')],
  [/\bprogramme(s)?\b/g,       keepSuffix('program')],
  [/\baluminium\b/g,           'aluminum'],
  [/\bmoustache\b/g,           'mustache'],
  [/\bjudgement\b/g,           'judgment'],
  [/\bjewellery\b/g,           'jewelry'],
  [/\baeroplane(s)?\b/g,       keepSuffix('airplane')],
  [/\btyre(s)?\b/g,            keepSuffix('tire')],
  [/\bwhilst\b/g,              'while'],
  [/\bamongst\b/g,             'among'],
  // BrE-only лексика (без двойного значения в AmE)
  [/\bpavement(s)?\b/g,        keepSuffix('sidewalk')],
  [/\bqueue(s)?\b/g,           keepSuffix('line')],
  [/\bqueued\b/g,              'lined up'],
  [/\bqueuing\b/g,             'lining up'],
  [/\brubbish\b/g,             'trash'],
  [/\bpetrol\b/g,              'gasoline'],
  [/\blorry\b/g,               'truck'],
  [/\blorries\b/g,             'trucks'],
  [/\bbiscuit(s)?\b/g,         keepSuffix('cookie')],
  [/\btrousers\b/g,            'pants'],
  [/\bpram(s)?\b/g,            keepSuffix('stroller')],
  [/\bnappy\b/g,               'diaper'],
  [/\bnappies\b/g,             'diapers'],
  [/\baubergine(s)?\b/g,       keepSuffix('eggplant')],
  [/\bcourgette(s)?\b/g,       keepSuffix('zucchini')],
  [/\bmotorway(s)?\b/g,        keepSuffix('highway')],
];

/**
 * Преобразует BrE-варианты в AmE на уже lower-cased строке.
 * Используется как часть normalize() при сравнении ответов,
 * чтобы выбор/ввод BrE-формы засчитывался как правильный.
 */
export const toAmE = (lowercased: string): string => {
  let result = lowercased;
  for (const [pattern, replacement] of BRE_TO_AME) {
    result = result.replace(
      pattern,
      replacement as string & ((m: string, ...g: string[]) => string),
    );
  }
  return result;
};

/**
 * Нормализует текст:
 * 1. Заменяет curly apostrophes (\u2019 \u2018) и другие unicode-апострофы на прямой '
 * 2. Раскрывает все сокращения
 * 3. Приводит к нижнему регистру
 * 4. Убирает пунктуацию в конце
 * 5. Убирает лишние пробелы
 */
export const normalize = (text: string): string => {
  let result = text.trim();

  // Нормализация апострофов: любой символ из диапазонов одиночных кавычек, диакритики и модификаторов → прямой апостроф
  // Диапазоны: \u0060-\u0060 (backtick), \u00B4 (acute), \u02B0-\u02FF (modifier letters), \u0300-\u036F (combining diacritics),
  //            \u2018-\u201F (typographic quotes), \u2032-\u2037 (prime symbols), \u275B-\u275E (ornamental), \uFF07 (fullwidth)
  result = result.replace(/[\u0060\u00B4\u02B0-\u02FF\u0300-\u036F\u2018-\u201F\u2032-\u2037\u275B-\u275E\uFF07]/g, "'");

  result = result.toLowerCase();
  result = result.replace(/[.!?,;]+$/, '').trim();

  for (const [pattern, replacement] of PAIRS) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/\bcannot\b/g, 'can not');
  // BrE → AmE: чтобы британские эквиваленты засчитывались как правильные
  result = toAmE(result);
  return result.replace(/\s+/g, ' ').trim().toLowerCase();
};

export const isCorrectAnswer = (userAnswer: string, correctAnswer: string, alternatives?: string[]): boolean => {
  const norm = normalize(userAnswer);
  if (norm === normalize(correctAnswer)) return true;
  if (alternatives) {
    return alternatives.some(alt => norm === normalize(alt));
  }
  return false;
};

// Нормализация сокращений — поддержка curly apostrophes с мобильных клавиатур

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

  // ── Ключевой фикс: нормализация всех видов апострофов ──
  // \u2019 = ' (right single quotation mark) — iOS автозамена
  // \u2018 = ' (left single quotation mark)
  // \u02BC = ʼ (modifier letter apostrophe)
  // \u0060 = ` (backtick)
  result = result.replace(/[\u2019\u2018\u02BC\u0060]/g, "'");

  result = result.toLowerCase();
  result = result.replace(/[.!?,;]+$/, '').trim();

  for (const [pattern, replacement] of PAIRS) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/\bcannot\b/g, 'can not');
  return result.replace(/\s+/g, ' ').trim();
};

export const isCorrectAnswer = (userAnswer: string, correctAnswer: string): boolean => {
  return normalize(userAnswer) === normalize(correctAnswer);
};

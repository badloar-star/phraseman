const fs = require('fs');
const ts = require('typescript');

const source = fs.readFileSync('app/lesson_words.tsx', 'utf8');
const sf = ts.createSourceFile('lesson_words.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function propName(node) {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node) ? node.text : undefined;
}

function literal(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) out[propName(prop.name)] = literal(prop.initializer);
    }
    return out;
  }
  if (ts.isNewExpression(node) && node.arguments?.[0]) return literal(node.arguments[0]);
  return undefined;
}

let wordsNode;
let blockNode;
let functionNode;
let grammarNode;

function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    if (node.name.text === 'WORDS_BY_LESSON') wordsNode = node.initializer;
    if (node.name.text === 'AUXILIARY_DICTIONARY_BLOCKLIST') blockNode = node.initializer;
    if (node.name.text === 'FUNCTION_WORDS') functionNode = node.initializer;
    if (node.name.text === 'GRAMMAR_CHUNKS') grammarNode = node.initializer;
  }
  ts.forEachChild(node, visit);
}

visit(sf);

const raw = literal(wordsNode);
const blocklist = new Set((literal(blockNode) || []).map((item) => String(item).toLowerCase()));
const functionWords = literal(functionNode) || {};
const grammarChunks = literal(grammarNode) || {};
const servicePos = new Set(['phrases', 'articles', 'prepositions', 'conjunctions']);

const nounPluralExceptions = new Set([
  'belongings', 'boots', 'children', 'clothes', 'contents', 'genius', 'glasses', 'goods',
  'graphics', 'groceries', 'halves', 'headphones', 'knives', 'leaves', 'metropolis', 'mice',
  'news', 'overalls', 'people', 'scissors', 'series', 'shoes', 'shelves', 'sneakers',
  'species', 'stairs', 'sunglasses', 'thesis', 'thieves', 'things',
]);

const nounOverrides = {
  book: { ru: 'Книга', uk: 'Книжка', es: 'libro' },
  cookie: { ru: 'Печенье', uk: 'Печиво', es: 'galleta' },
  eye: { ru: 'Глаз', uk: 'Око', es: 'ojo' },
  fact: { ru: 'Факт', uk: 'Факт', es: 'hecho' },
  material: { ru: 'Материал', uk: 'Матеріал', es: 'material' },
  name: { ru: 'Имя', uk: "Ім'я", es: 'nombre' },
  paper: { ru: 'Бумага', uk: 'Папір', es: 'papel' },
  thing: { ru: 'Вещь', uk: 'Річ', es: 'cosa' },
  word: { ru: 'Слово', uk: 'Слово', es: 'palabra' },
};

function canonicalNoun(value) {
  const lower = value.toLowerCase().trim();
  if (nounPluralExceptions.has(lower)) return lower;
  if (/[^aeiou]ies$/.test(lower) && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ves') && lower.length > 4) return lower.slice(0, -3) + 'f';
  if (/(ches|shes|xes|zes|sses)$/.test(lower) && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('oes') && lower.length > 4) return lower.slice(0, -1);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

function canonicalVerb(value) {
  const lower = value.toLowerCase().trim();
  if (!lower || lower.includes(' ')) return lower;
  if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (/(ches|shes|xes|zes|oes|ses)$/.test(lower) && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1);
  if (lower.endsWith('ying') && lower.length > 5) return lower.slice(0, -4) + 'ie';
  if (lower.endsWith('ing') && lower.length > 5) {
    const stem = lower.slice(0, -3);
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2)) return stem.slice(0, -1);
    if (/(iv|ov|av|us|ak|it|at|iz)$/.test(stem)) return stem + 'e';
    return stem;
  }
  if (lower.endsWith('ied') && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ed') && lower.length > 4) {
    const noD = lower.slice(0, -1);
    const noEd = lower.slice(0, -2);
    if (noD.endsWith('e')) return noD;
    if (noEd.length >= 2 && noEd.at(-1) === noEd.at(-2)) return noEd.slice(0, -1);
    return noEd;
  }
  return lower;
}

function finalEnglish(word) {
  if (word.pos === 'verbs') return canonicalVerb(word.en);
  if (word.pos === 'nouns') return canonicalNoun(word.en);
  return String(word.en).trim();
}

function allowed(word) {
  const en = String(word.en).trim().toLowerCase();
  if (!en) return false;
  if (servicePos.has(word.pos)) return false;
  if (word.pos === 'irregular_verbs') return false;
  if (blocklist.has(en)) return false;
  return true;
}

function esc(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function row(cells) {
  return `| ${cells.map(esc).join(' | ')} |`;
}

function csv(value) {
  return `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ').trim()}"`;
}

const singularNouns = new Map();
for (const arr of Object.values(raw)) {
  for (const word of arr) {
    if (word.pos !== 'nouns') continue;
    const en = String(word.en).trim().toLowerCase();
    if (canonicalNoun(en) === en && !singularNouns.has(en)) singularNouns.set(en, word);
  }
}

const removed = [];
const normalized = [];
const lessons = {};
const seenAcrossLessons = new Map();

for (const [lessonId, arr] of Object.entries(raw).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const seen = new Set();
  lessons[lessonId] = [];
  for (const word of arr) {
    const sourceEn = String(word.en).trim();
    const finalEn = finalEnglish(word);
    const key = `${finalEn.toLowerCase()}::${word.pos}`;

    if (!allowed(word)) {
      const reason = servicePos.has(word.pos)
        ? `служебная часть речи: ${word.pos}`
        : word.pos === 'irregular_verbs'
          ? 'неправильные глаголы вынесены на отдельный экран'
          : `blocklist: ${sourceEn}`;
      removed.push({ lesson: lessonId, en: sourceEn, ru: word.ru, uk: word.uk, pos: word.pos, reason });
      continue;
    }

    if (seen.has(key)) {
      removed.push({ lesson: lessonId, en: sourceEn, ru: word.ru, uk: word.uk, pos: word.pos, reason: `дубль в уроке, уже есть ${finalEn}` });
      continue;
    }
    seen.add(key);

    const earlier = seenAcrossLessons.get(finalEn.toLowerCase());
    if (earlier) {
      removed.push({
        lesson: lessonId,
        en: sourceEn,
        ru: word.ru,
        uk: word.uk,
        pos: word.pos,
        reason: `повтор из урока ${earlier.lesson}, уже есть ${earlier.en}`,
      });
      continue;
    }

    const out = { ...word, en: finalEn, source: sourceEn };
    if (word.pos === 'nouns' && finalEn !== sourceEn.toLowerCase()) {
      const override = nounOverrides[finalEn];
      const singular = singularNouns.get(finalEn);
      if (override || singular) {
        out.ru = override?.ru ?? singular?.ru ?? out.ru;
        out.uk = override?.uk ?? singular?.uk ?? out.uk;
        out.es = override?.es ?? singular?.es ?? out.es;
      }
    }

    const status = finalEn.toLowerCase() === sourceEn.toLowerCase() ? 'OK' : `NORMALIZED: ${sourceEn} -> ${finalEn}`;
    if (status !== 'OK') normalized.push({ lesson: lessonId, from: sourceEn, to: finalEn, pos: word.pos, ru: out.ru, uk: out.uk });
    lessons[lessonId].push({ ...out, status });
    seenAcrossLessons.set(finalEn.toLowerCase(), { lesson: lessonId, en: finalEn });
  }
}

const functionService = Object.values(functionWords).filter((word) => servicePos.has(word.pos) || blocklist.has(String(word.en).toLowerCase()));
const grammarService = Object.values(grammarChunks);

let md = '';
md += '# Готовая таблица словарей уроков\n\n';
md += 'Источник: актуальный `app/lesson_words.tsx`. Формат сделан для ручной проверки: английское слово, русский перевод, украинский перевод, часть речи и короткое примечание.\n\n';
md += '## Сводка\n\n';
md += row(['Проверка', 'Результат']) + '\n';
md += row(['---', '---']) + '\n';
md += row(['Уроков проверено', Object.keys(lessons).length]) + '\n';
md += row(['Исходных entries в WORDS_BY_LESSON', Object.values(raw).reduce((sum, arr) => sum + arr.length, 0)]) + '\n';
md += row(['Итоговых строк словаря после фильтра', Object.values(lessons).reduce((sum, arr) => sum + arr.length, 0)]) + '\n';
md += row(['Удалено/заблокировано из исходных словарей', removed.length]) + '\n';
md += row(['Нормализовано к первой форме', normalized.length]) + '\n';
md += row(['Служебные POS заблокированы', 'articles, phrases, prepositions, conjunctions']) + '\n';
md += row(['Aux/modal/blocklist заблокированы', [...blocklist].join(', ')]) + '\n\n';

md += '## Убрано из словарей\n\n';
md += row(['Урок', 'EN', 'RU', 'UK', 'POS', 'Причина']) + '\n';
md += row(['---', '---', '---', '---', '---', '---']) + '\n';
for (const item of removed) md += row([item.lesson, item.en, item.ru, item.uk, item.pos, item.reason]) + '\n';

md += '\n## Заблокированные служебные автодобавления\n\n';
md += row(['Источник', 'EN', 'POS', 'Решение']) + '\n';
md += row(['---', '---', '---', '---']) + '\n';
for (const word of grammarService) md += row(['GRAMMAR_CHUNKS', word.en, word.pos, 'убрать из словаря']) + '\n';
for (const word of functionService) md += row(['FUNCTION_WORDS/blocklist', word.en, word.pos, 'убрать из словаря']) + '\n';

md += '\n## Нормализация к первой форме\n\n';
md += row(['Урок', 'Было', 'Стало', 'POS', 'RU', 'UK']) + '\n';
md += row(['---', '---', '---', '---', '---', '---']) + '\n';
for (const item of normalized) md += row([item.lesson, item.from, item.to, item.pos, item.ru, item.uk]) + '\n';

md += '\n## Итоговые словари по урокам\n\n';
for (const [lessonId, arr] of Object.entries(lessons).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  md += `### Урок ${lessonId} (${arr.length} строк)\n\n`;
  md += row(['№', 'EN', 'RU', 'UK', 'POS', 'Примечание']) + '\n';
  md += row(['---', '---', '---', '---', '---', '---']) + '\n';
  arr.forEach((word, index) => {
    const note = word.status === 'OK' ? '' : word.status.replace('NORMALIZED: ', 'первая форма: ');
    md += row([index + 1, word.en, word.ru, word.uk, word.pos, note]) + '\n';
  });
  md += '\n';
}

fs.writeFileSync('docs/lesson-vocabulary-audit.md', md, 'utf8');

const csvLines = [
  ['lesson', 'number', 'en', 'ru', 'uk', 'pos', 'note'].map(csv).join(','),
];
for (const [lessonId, arr] of Object.entries(lessons).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  arr.forEach((word, index) => {
    const note = word.status === 'OK' ? '' : word.status.replace('NORMALIZED: ', 'первая форма: ');
    csvLines.push([lessonId, index + 1, word.en, word.ru, word.uk, word.pos, note].map(csv).join(','));
  });
}

fs.writeFileSync('docs/lesson-vocabulary-table.csv', `${csvLines.join('\n')}\n`, 'utf8');
console.log(`Wrote docs/lesson-vocabulary-audit.md (${md.length} chars)`);
console.log(`Wrote docs/lesson-vocabulary-table.csv (${csvLines.length - 1} rows)`);

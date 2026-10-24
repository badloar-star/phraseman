// ЗАМОК по постоянным подсказкам «Можно сказать…» в Диалогах (слово владельца 24.10, дословно через координатора: «обязательно разработай подсказки, чтобы внизу над полем ввода
// появлялся у пользователя мелкий текст — что можно написать по контексту, с подсказкой, что это значит»; «постоянно должны быть подсказки, потому что я ноль, но хочу учиться»).
// Реестр docs/work/OWNER_LOCKS.md. Падает, если подсказки спрячут за «застрял», потеряют смысл-строку, поднимут выше трёх или добавят обводку.
import fs from 'node:fs';
import path from 'node:path';

import { applyDialogSayHint, DIALOG_SAY_HINTS_MAX, dialogSayHintsFromLists, sanitizeDialogSayHints } from '../components/dialogs/hints/dialog_say_hints_model';
import { dialogSayHintsLabel } from '../components/dialogs/hints/dialog_say_hints_copy';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('Подсказки «Можно сказать…»: модель', () => {
  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «1–3 варианта фразы на изучаемом языке … с подсказкой, что это значит» — не больше трёх, у каждой смысл рядом
  it('берёт не больше трёх, смысл сохраняет, повторы и пустые убирает', () => {
    const hints = sanitizeDialogSayHints([
      { text: 'I would like a coffee, please.', meaning: 'Мне, пожалуйста, кофе.' },
      { text: '  i would like a COFFEE, please. ', meaning: 'повтор' },
      { text: '', meaning: 'пусто' },
      { text: 'Can I have a tea?', meaning: 'Можно мне чай?' },
      { text: 'Just water.', meaning: null },
      { text: 'Fourth one.', meaning: 'Четвёртая' },
    ]);
    expect(hints).toHaveLength(DIALOG_SAY_HINTS_MAX);
    expect(hints.map((h) => h.text)).toEqual(['I would like a coffee, please.', 'Can I have a tea?', 'Just water.']);
    expect(hints[0]?.meaning).toBe('Мне, пожалуйста, кофе.');
    expect(hints[2]?.meaning).toBeNull();
  });

  it('слишком длинное и мусор не показываем; управляющие символы вычищаются', () => {
    expect(sanitizeDialogSayHints([{ text: 'x'.repeat(121), meaning: 'a' }])).toEqual([]);
    expect(sanitizeDialogSayHints([{ text: 'Hello\u0000\nthere', meaning: ' hi ' }])).toEqual([{ text: 'Hello there', meaning: 'hi' }]);
    expect(sanitizeDialogSayHints(null)).toEqual([]);
    expect(sanitizeDialogSayHints(undefined)).toEqual([]);
  });

  it('параллельные списки фраз и переводов собираются в подсказки', () => {
    expect(dialogSayHintsFromLists(['Hi!', 'Hello!'], ['Привет!'])).toEqual([{ text: 'Hi!', meaning: 'Привет!' }, { text: 'Hello!', meaning: null }]);
    expect(dialogSayHintsFromLists(null, ['x'])).toEqual([]);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «тап по фразе — вставить в поле»; отправляет человек сам
  it('тап заменяет черновик фразой (не дописывает к чужому тексту)', () => {
    expect(applyDialogSayHint('abc', { text: 'Hello!', meaning: null })).toBe('Hello!');
  });

  it('подпись блока — на девяти языках', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) expect(dialogSayHintsLabel(lang).length).toBeGreaterThan(5);
    expect(dialogSayHintsLabel('ru')).toBe('Можно сказать…');
  });
});

describe('Подсказки «Можно сказать…»: компонент', () => {
  const src = code(read('components/dialogs/hints/DialogSayHints.tsx'));

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «постоянно должны быть подсказки» — компонент не знает про «застрял»: ни счётчика слабых реплик, ни условия показа, кроме наличия фраз
  it('показывается всегда, пока есть фразы: нет условий «застрял» и счётчиков', () => {
    expect(src).toContain('if (hints.length === 0) return null;');
    expect(src).not.toMatch(/isWeakLearnerReply|stuck|weak|attempts|replies\s*[<>]/u);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «что это значит» — под фразой строка смысла на родном языке
  it('под каждой фразой — смысл, подпись блока и тап вставляет фразу', () => {
    expect(src).toContain('hint.meaning ?');
    expect(src).toContain('dialogSayHintsLabel(lang)');
    expect(src).toContain('onUse(applyDialogSayHint(');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «мелкий текст» — фраза 14/19, смысл 13/17, без сжатия шрифта и без обводок
  it('кегли мелкие, шрифт не сжимается, обводок нет', () => {
    expect(src).toContain('phrase: { size: 14, line: 19 }');
    expect(src).toContain('meaning: { size: 13, line: 17, marginTop: 2 }');
    expect(src).not.toMatch(/adjustsFontSizeToFit|borderWidth|borderColor/u);
  });
});

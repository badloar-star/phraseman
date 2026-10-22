// зачем (Сверка 22.10, th_side_T3 и dict_side_D1): (1) вкладки разделов теории переносятся на вторую строку, а не уходят за край экрана; (2) у кнопки «Тренировать · N слов»
// словаря есть значок ▶ слева, как в макете; (3) ряд чипов словаря не сжимается списком (иначе «Все уроки» резалось снизу). Раскладку мерит Сверка; здесь — контракт исходников.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Вкладки теории отсюда убраны (владелец 22.10): теория Learning V2 = экран основного курса, сторож — tests/theory_sheet_1to1_2026_10_22.test.ts.
describe('словарь V2', () => {
  const dict = code(read('components/learning-v2/LearningV2DictionaryV2.tsx'));
  const glass = code(read('components/learning-v2/LearningV2Glass.tsx'));

  it('кнопка «Тренировать» со значком ▶ слева (общая кнопка получила необязательный значок)', () => {
    expect(dict).toMatch(/testID="learning-v2-dict-train"[\s\S]*?left="play"/);
    expect(glass).toContain('{left ? <Ionicons name={left} size={18} color={ink} /> : null}');
  });

  it('ряд чипов не сжимается, список забирает остаток высоты', () => {
    expect(dict).toContain('chipsScroll: { flexGrow: 0, flexShrink: 0, minHeight: 40, marginTop: 12 }');
    expect(dict).toContain('list: { flex: 1 }');
    expect(dict).toMatch(/<FlatList\s+style=\{styles\.list\}/);
  });
});

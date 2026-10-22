// зачем (закон владельца 22.10 «до бита», таблица docs/work/tasks/theory-1to1-2026-10-22.md): шторка теории перенесена 1:1 с
// lesson-theory.html, вариант A — тень `.tsh`, формула столбиком `.frm`, разделитель примеров 1 px `--edge`, межстрочные `.ex .ru` 19 и
// `.tip` 21, надпись активной вкладки и значок «звук идёт» — `--solid`, «неверно» — `#B5651D`. Раскладку мерит Сверка; здесь — контракт исходников.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('шторка теории 1:1 с lesson-theory.html', () => {
  const sheet = code(read('components/learning-v2/LearningV2TheorySheet.tsx'));

  it('у шторки тень `.tsh`, и overflow её не срезает', () => {
    expect(sheet).toContain('offsetY: -18, blurRadius: 40, spreadDistance: -18, color: "rgba(0,0,0,0.5)"');
    expect(sheet).toContain('boxShadow: SHEET_SHADOW');
    expect(sheet).toMatch(/sheet: \{[^}]*borderTopRightRadius: 30 \}/);
    expect(sheet).not.toMatch(/sheet: \{[^}]*overflow: "hidden"/);
  });

  it('формула — столбик строк с gap 8, варианты «x: …» отдельными строками', () => {
    expect(sheet).toMatch(/frm: \{ marginTop: 14, borderRadius: 18, padding: 14, gap: 8 \}/);
    expect(sheet).toContain('frmLine: { fontSize: 16, lineHeight: 22, fontWeight: "700" }');
    expect(sheet).toContain('formulaRows(block.formula).map(');
  });

  it('разделитель примеров — 1 px цвета --edge', () => {
    expect(sheet).toContain('sep: { height: 1 }');
    expect(sheet).toContain('backgroundColor: g.hairlineSoft');
  });

  it('межстрочные как в макете: перевод 19, совет 21 (кегли по D145)', () => {
    expect(sheet).toContain('ru: { marginTop: 1, fontSize: 13, lineHeight: 19 }');
    expect(sheet).toContain('tipText: { flex: 1, fontSize: 16, lineHeight: 21 }');
  });

  it('цвета: активная вкладка и «звук идёт» — --solid, «неверно» — #B5651D', () => {
    expect(sheet).toContain('const solid = lv2TaskTokens(g).footerSolid;');
    expect(sheet).toContain('color: on ? solid : g.secondary');
    expect(sheet).toContain('color={on ? lv2TaskTokens(g).footerSolid : g.text}');
    expect(sheet).toContain('const THEORY_WRONG = "#B5651D";');
    expect(sheet).toContain('color: THEORY_WRONG, textDecorationLine: "line-through"');
    expect(sheet).not.toContain('color: on ? g.bg');
  });
});

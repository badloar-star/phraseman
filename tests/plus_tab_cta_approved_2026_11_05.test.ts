// D из MOCKUP_VERDICTS_LV2 (05.11): вкладка Plus, низ — кнопка и подпись строго по plus_tab_approved_2026-11-05.html на всех 9 языках:
// «Оформить Ultra на год» / «Оформить Plus на месяц» и «Цена и пробный период — из магазина. Отмена в любой момент.» — и до, и после прихода цен.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/plus-tab/PlusTabScreen.tsx'), 'utf8').replace(/\r\n/g, '\n');
const LANGS = ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl'];

describe('вкладка Plus: кнопка и подпись по макету', () => {
  it('кнопка всегда подписана по выбранному плану, а не ценой из магазина', () => {
    expect(src).toContain("const ctaShown = ultra ? ULTRA_CTA_FALLBACK[lang] ?? ULTRA_CTA_FALLBACK.en : PLUS_CTA_FALLBACK[lang] ?? PLUS_CTA_FALLBACK.en;");
    expect(src).toContain('<Text style={[S.ctaText, { color: ctaInk }]}>{ctaShown}</Text>');
    expect(src).not.toContain('{state === \'ready\' ? cta.label');
  });
  it('подпись под кнопкой всегда «Цена и пробный период — из магазина. Отмена в любой момент.»', () => {
    expect(src).toContain('(STORE_NOTE[lang] ?? STORE_NOTE.en)');
    expect(src).not.toContain("state === 'ready' ? cta.fine");
    expect(src).toContain("ru: 'Цена и пробный период — из магазина. Отмена в любой момент.'");
    expect(src).toContain("ru: 'Оформить Ultra на год'");
    expect(src).toContain("ru: 'Оформить Plus на месяц'");
  });
  it('все 9 языков у кнопки Ultra, кнопки Plus и подписи', () => {
    for (const name of ['ULTRA_CTA_FALLBACK', 'PLUS_CTA_FALLBACK', 'STORE_NOTE']) {
      const start = src.indexOf(`const ${name}`);
      const block = src.slice(start, src.indexOf('};', start));
      for (const l of LANGS) expect(block).toContain(l.includes("'") ? `${l}:` : `${l}:`);
    }
  });
});

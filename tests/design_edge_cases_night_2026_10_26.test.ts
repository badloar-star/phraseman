// зачем (координатор 26.10, крайние случаи ночных экранов): узкий экран 360 dp, системный «крупный шрифт» ×1,3 и самая длинная строка из 9 языков.
// Правила владельца: без adjustsFontSizeToFit, без многоточия вместо текста, кнопка и подпись растут (minHeight), а не режутся фиксированной высотой.
import fs from 'node:fs';
import path from 'node:path';

import { PAYWALL_M_COPY_ROWS } from '../components/paywall/m/paywall_m_copy.generated';
import { paywallMCompactLayout } from '../components/paywall/m/paywall_m_panels';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('окна М: тесная раскладка', () => {
  it('узкий экран и крупный шрифт включают её, обычный телефон — нет', () => {
    expect(paywallMCompactLayout(360, 1)).toBe(true);
    expect(paywallMCompactLayout(412, 1.3)).toBe(true);
    expect(paywallMCompactLayout(390, 1)).toBe(false);
    expect(paywallMCompactLayout(390, 1.15)).toBe(false);
    expect(paywallMCompactLayout(Number.NaN, Number.NaN)).toBe(false);
  });
});

describe('окна М: исходники не режут и не сжимают текст', () => {
  const mFiles = fs.readdirSync(path.join(ROOT, 'components/paywall/m')).filter((name) => name.endsWith('.tsx')).map((name) => `components/paywall/m/${name}`);

  it('в окнах М нет numberOfLines и adjustsFontSizeToFit', () => {
    for (const file of mFiles) {
      const code = read(file).split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
      expect(code).not.toMatch(/adjustsFontSizeToFit|numberOfLines/);
    }
  });

  it('кнопки панелей и «дока» — minHeight, а не фиксированная высота', () => {
    expect(read('components/paywall/m/PaywallMPanels.tsx')).not.toMatch(/\bcta: \{[^}]*\bheight: 56/);
    expect(read('components/paywall/m/PaywallMDock.tsx')).not.toMatch(/\bcta: \{[^}]*\bheight: 56/);
    expect(read('components/paywall/m/PaywallMPanels.tsx')).toMatch(/\bcta: \{ minHeight: 56/);
    expect(read('components/paywall/m/PaywallMDock.tsx')).toMatch(/\bcta: \{ minHeight: 56/);
  });

  it('панель прокручивается, когда не помещается: каркас — ScrollView, обе панели (общая и «Не видим Plus») в нём', () => {
    const panels = read('components/paywall/m/PaywallMPanels.tsx');
    expect(panels).toContain('<ScrollView testID="paywall-m-panel" style={S.frame}');
    expect(panels).not.toContain('<View testID="paywall-m-panel"');
    expect(panels.split('<PanelFrame bottomInset={p.bottomInset}>').length - 1).toBe(2);
  });

  it('плитки энергии, тарифы и колонки сравнения подчиняются тесной раскладке', () => {
    expect(read('components/paywall/m/PaywallMPanels.tsx')).toContain('compact ? S.tilesStacked : S.tiles');
    expect(read('components/paywall/m/PaywallMPlans.tsx')).toContain('compact ? S.rowStacked : S.row');
    expect(read('components/paywall/m/PaywallMCompare.tsx')).toContain('compact ? S.freeColCompact : S.freeCol');
  });

  it('«Восстановить аккаунт?» и окно удаления: подписи переносятся, а не обрезаются', () => {
    expect(read('components/account/AccountRestoreSummaryDialog.tsx')).not.toMatch(/numberOfLines|adjustsFontSizeToFit/);
    expect(read('components/account/DeleteAccountVariantBBody.tsx')).not.toMatch(/numberOfLines|adjustsFontSizeToFit/);
    expect(read('components/account/DeleteAccountVariantBBody.tsx')).toMatch(/pillLabel: \{[^}]*flexShrink: 1/);
  });

  it('строка награды «+N»: минимальная высота, перенос', () => {
    expect(read('components/completion/V2DoneScreen.tsx')).not.toMatch(/\baward: \{[^}]*\bheight: 54/);
  });
});

// Оценка числа строк без устройства: ширина знака ≈ 0,6 кегля (жирный), крупный шрифт ×1,3, окно 360 dp.
// Не заменяет кадры Сверки, но ловит «кто-то положил в кнопку абзац»: самая длинная строка из 9 языков обязана уложиться в бюджет строк.
const WIDTH = 360;
const FONT_SCALE = 1.3;
const CHAR = 0.6;

function worstCase(text: string): string {
  // подстановки и формы по числу: числа берём двузначными, форму — самую длинную
  return text.replace(/\{[a-zA-Z]+\}/g, '99').replace(/\[([^\]]+)\]/g, (_m, forms: string) => forms.split('|').sort((a, b) => b.length - a.length)[0]);
}

function estimatedLines(text: string, fontPx: number, innerWidth: number): number {
  const perLine = Math.max(8, Math.floor(innerWidth / (fontPx * FONT_SCALE * CHAR)));
  let lines = 1;
  let used = 0;
  for (const word of worstCase(text).split(/\s+/)) {
    const need = word.length + (used > 0 ? 1 : 0);
    if (used + need > perLine && used > 0) { lines += 1; used = word.length; } else { used += need; }
  }
  return lines;
}

function longestOverLanguages(keys: readonly (keyof typeof PAYWALL_M_COPY_ROWS)[], fontPx: number, innerWidth: number): { key: string; lang: string; lines: number } {
  let worst = { key: '', lang: '', lines: 0 };
  for (const key of keys) {
    for (const [lang, text] of Object.entries(PAYWALL_M_COPY_ROWS[key])) {
      const lines = estimatedLines(text, fontPx, innerWidth);
      if (lines > worst.lines) worst = { key, lang, lines };
    }
  }
  return worst;
}

describe('окна М: самая длинная строка из 9 языков при 360 dp и шрифте ×1,3', () => {
  const keys = Object.keys(PAYWALL_M_COPY_ROWS) as (keyof typeof PAYWALL_M_COPY_ROWS)[];
  const ctaKeys = keys.filter((key) => /(^|\.)cta($|\.)|^mc\.refused\.(restore|subscribe)$/.test(key));
  const titleKeys = keys.filter((key) => /^mc\..*\.title$|^m\.head\..*\.title$/.test(key));
  const bodyKeys = keys.filter((key) => /^mc\..*\.body/.test(key));

  it('подписи кнопок укладываются в 3 строки (кнопка растёт, текст не режется)', () => {
    expect(ctaKeys.length).toBeGreaterThan(5);
    const worst = longestOverLanguages(ctaKeys, 16, WIDTH - 32 - 32);
    expect(worst.lines).toBeLessThanOrEqual(3);
  });

  it('заголовки панелей и шапок укладываются в 5 строк', () => {
    expect(titleKeys.length).toBeGreaterThan(8);
    const worst = longestOverLanguages(titleKeys, 24, WIDTH - 32);
    expect(worst.lines).toBeLessThanOrEqual(5);
  });

  it('абзацы панелей укладываются в 9 строк (панель прокручивается, но абзац не должен занимать экран)', () => {
    expect(bodyKeys.length).toBeGreaterThan(3);
    const worst = longestOverLanguages(bodyKeys, 16, WIDTH - 32);
    expect(worst.lines).toBeLessThanOrEqual(9);
  });
});

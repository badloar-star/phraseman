// зачем (Ядро 15.10, D195; макет Q9jqpBbjwJEFV1DpdEGx2h): окно «Встречайте PhraseMan 2.0» рисует только то, что сервер реально начислил: строки — где монет > 0,
// итог — coins.total; тексты — 9 языков без системных слов; окно живёт в очереди окон Главной своим ключом и грузится лениво после первого кадра.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import {
  easeOutExpo,
  formatBonusNumber,
  legacyBonusHasContent,
  legacyBonusRows,
  legacyBonusTotal,
  type LegacyBonusViewInput,
} from '../modules/legacy_bonus/legacy_bonus_view';
import {
  legacyBonusCoinWord,
  legacyBonusConvertTitle,
  legacyBonusCta,
  legacyBonusRowTitle,
  legacyBonusTitle,
  legacyBonusTotalLabel,
} from '../modules/legacy_bonus/legacy_bonus_strings';
import { fitRowCoinsToTotal, splitCoinsForFlight } from '../components/legacy_bonus/use_legacy_bonus_burn';
import type { Lang } from '../constants/i18n';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const result = (from: [number, number, number], coins: [number, number, number], total?: number): LegacyBonusViewInput => ({
  from: { xp: from[0], pearls: from[1], spins: from[2] },
  coins: { xp: coins[0], pearls: coins[1], spins: coins[2], total: total ?? coins[0] + coins[1] + coins[2] },
});
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const code = (rel: string): string => read(rel).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

describe('окно «Встречайте PhraseMan 2.0» · строки и итог', () => {
  it('строки только там, где монет больше нуля, порядок «опыт → жемчуг → вращения»', () => {
    const rows = legacyBonusRows(result([8362, 40, 0], [836, 400, 0]));
    expect(rows.map((r) => r.key)).toEqual(['xp', 'pearls']);
    expect(rows[0]).toEqual({ key: 'xp', from: 8362, coins: 836 });
    expect(legacyBonusRows(result([0, 0, 2], [0, 0, 260])).map((r) => r.key)).toEqual(['spins']);
  });

  it('итог — ровно coins.total сервера, а не сумма строк', () => {
    expect(legacyBonusTotal(result([8362, 40, 2], [836, 400, 260], 1496))).toBe(1496);
    expect(legacyBonusTotal(result([1, 1, 1], [5000, 5000, 0], 6000))).toBe(6000);
  });

  it('нечего показывать — окно не рисуется: нули, отрицательные и NaN не дают содержимого', () => {
    expect(legacyBonusHasContent(result([0, 0, 0], [0, 0, 0]))).toBe(false);
    expect(legacyBonusHasContent(result([5, 0, 0], [Number.NaN, -3, 0], 0))).toBe(false);
    expect(legacyBonusHasContent(result([100, 0, 0], [10, 0, 0]))).toBe(true);
  });

  it('число с неразрывным пробелом по тысячам', () => {
    expect(formatBonusNumber(8362)).toBe('8 362');
    expect(formatBonusNumber(836)).toBe('836');
    expect(formatBonusNumber(1234567)).toBe('1 234 567');
  });
});

describe('окно «Встречайте PhraseMan 2.0» · сценарий монет', () => {
  it('шесть монет строки в сумме дают ровно монеты строки (floor, остаток — последней)', () => {
    for (const coins of [836, 400, 260, 5, 6, 7, 0]) {
      const shares = splitCoinsForFlight(coins, 6);
      expect(shares).toHaveLength(6);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(coins);
    }
    expect(splitCoinsForFlight(836, 6)).toEqual([139, 139, 139, 139, 139, 141]);
  });

  it('счётчик сходится ровно к итогу: сумма строк больше итога — вклады сжимаются, остаток в последней строке', () => {
    const rows = legacyBonusRows(result([1, 1, 1], [5000, 5000, 260], 6000));
    const fit = fitRowCoinsToTotal(rows, 6000);
    expect(fit.reduce((a, b) => a + b, 0)).toBe(6000);
    const small = legacyBonusRows(result([1, 1, 0], [100, 50, 0]));
    expect(fitRowCoinsToTotal(small, 150)).toEqual([100, 50]);
  });

  it('кривая счётчика easeOutExpo: ноль в начале, ровно единица в конце, монотонно', () => {
    expect(easeOutExpo(0)).toBeCloseTo(0, 2);
    expect(easeOutExpo(1)).toBe(1);
    let prev = -1;
    for (let p = 0; p <= 1; p += 0.05) { const v = easeOutExpo(p); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });
});

describe('окно «Встречайте PhraseMan 2.0» · тексты', () => {
  it('все девять языков заполнены, ничего не пустое', () => {
    for (const lang of LANGS) {
      for (const text of [legacyBonusTitle(lang), legacyBonusConvertTitle(lang), legacyBonusTotalLabel(lang), legacyBonusCta(lang), legacyBonusRowTitle(lang, 'xp'), legacyBonusRowTitle(lang, 'pearls'), legacyBonusRowTitle(lang, 'spins'), legacyBonusCoinWord(lang, 5)]) {
        expect(text.trim().length).toBeGreaterThan(1);
      }
    }
  });

  it('русский — дословно макет; слово «монета» склоняется (1 монета, 2 монеты, 5 монет, 21 монета)', () => {
    expect(legacyBonusTitle('ru')).toBe('Встречайте PhraseMan 2.0');
    expect(legacyBonusConvertTitle('ru')).toBe('Твои бонусы переходят в монеты');
    expect(legacyBonusCta('ru')).toBe('Понятно');
    expect(legacyBonusCoinWord('ru', 1)).toBe('монета');
    expect(legacyBonusCoinWord('ru', 2)).toBe('монеты');
    expect(legacyBonusCoinWord('ru', 5)).toBe('монет');
    expect(legacyBonusCoinWord('ru', 21)).toBe('монета');
    expect(legacyBonusCoinWord('pl', 21)).toBe('monet');
  });

  it('человеку никаких системных слов: нет «сервер», «синхронизация», «конвертация» ни в одном языке', () => {
    const forbidden = /сервер|синхрониз|конверт|server|sync|conver(?:sion|t\b)|servidor|sincroniz|conversión|conversão|máy chủ|đồng bộ|chuyển đổi|sinkron|konversi|sunucu|senkron|dönüşüm|synchroniz|konwersj/i;
    for (const lang of LANGS) {
      for (const text of [legacyBonusTitle(lang), legacyBonusConvertTitle(lang), legacyBonusTotalLabel(lang), legacyBonusCta(lang)]) {
        expect(text).not.toMatch(forbidden);
      }
    }
  });
});

describe('окно «Встречайте PhraseMan 2.0» · подключение', () => {
  it('своя запись в очереди окон: после «С возвращением», до «Хватает на ранг», нативное окно, защищённое от выселения', () => {
    const core = read('components/overlay_arbiter_core.ts');
    expect(core).toContain("| 'legacyBonusWelcome'");
    const order = core.split('export const OVERLAY_PRIORITY')[1].split('];')[0];
    expect(order.indexOf("'welcomeBack'")).toBeLessThan(order.indexOf("'legacyBonusWelcome'"));
    expect(order.indexOf("'legacyBonusWelcome'")).toBeLessThan(order.indexOf("'coinRankEnough'"));
    expect(core.split('export const NATIVE_MODAL_KEYS')[1].split(']);')[0]).toContain("'legacyBonusWelcome'");
    expect(core.split('export const EMPTY_OVERLAY_WANTS')[1]).toContain('legacyBonusWelcome: false');
    expect(core.split('export const FORCE_EVICTABLE_KEYS')[1].split(']);')[0]).not.toContain('legacyBonusWelcome');
  });

  it('Главная монтирует хост окна; хост ждёт первый кадр и грузит рабочую часть лениво', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("components/legacy_bonus/LegacyBonusWelcomeHost");
    expect(home).toMatch(/<LegacyBonusWelcomeHost lang=\{lang\} coinRank=\{[^}]+\} active=\{homeRuntimeActive\} \/>/);
    const host = code('components/legacy_bonus/LegacyBonusWelcomeHost.tsx');
    expect(host).toContain("runAfterHomeFirstFrame('legacy_bonus_welcome'");
    expect(host).toContain("lazy(() => import('./LegacyBonusWelcomeInner'))");
    expect(host).not.toContain('legacy_bonus_client');
  });

  it('рабочая часть: слот арбитра, плавное закрытие (слот отдаётся после ухода окна), «не show» — окно не рисуется', () => {
    const inner = code('components/legacy_bonus/LegacyBonusWelcomeInner.tsx');
    expect(inner).toContain("useOverlayVisible('legacyBonusWelcome'");
    expect(inner).toContain("welcome.kind === 'show'");
    expect(inner).not.toContain('legacyBonusHasContent'); // начислено 0 → окно всё равно с заголовком (плашку скрывает шторка)
    expect(inner).toContain('onDismissed={onDismissed}');
    expect(inner).toContain('dismissLegacyBonusWelcome()');
    expect(inner).toContain('if (!frozen) return null;');
  });

  it('вид: без обводок, без ужатия шрифта, без долгов на показ (ничего не пишет в хранилище)', () => {
    for (const rel of ['LegacyBonusWelcomeSheet', 'LegacyBonusHero', 'LegacyBonusRow', 'LegacyBonusFlyLayer', 'LegacyBonusTotalCounter', 'LegacyBonusWelcomeInner', 'LegacyBonusWelcomeHost']) {
      const src = code(`components/legacy_bonus/${rel}.tsx`);
      expect(src).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit|AsyncStorage|setItem\(/);
    }
  });
});

describe('окно «Встречайте PhraseMan 2.0» · форма по решению владельца 15.10', () => {
  it('в шторке заголовок, над плашкой «Твои бонусы переходят в монеты», пояснения под ним нет, кнопка в цветах cta', () => {
    const sheet = code('components/legacy_bonus/LegacyBonusWelcomeSheet.tsx');
    expect(sheet).toContain('legacyBonusTitle(lang)');
    expect(sheet).toContain('legacyBonusConvertTitle(lang)');
    expect(sheet.indexOf('legacyBonusConvertTitle(lang)')).toBeGreaterThan(sheet.indexOf('{hasContent ? ('));
    expect(sheet).not.toMatch(/convertSub|legacyBonusConvertSub/);
    expect(sheet).toContain('backgroundColor: glass.ctaFill');
    expect(sheet).toContain('color: glass.ctaInk');
  });

  it('ничего не начислено — плашка пересчёта скрыта, остаются заголовок и «Понятно»', () => {
    const sheet = code('components/legacy_bonus/LegacyBonusWelcomeSheet.tsx');
    expect(sheet).toContain('{hasContent ? (');
    expect(sheet).toContain('legacyBonusHasContent(result)');
  });

  it('первая строка сгорает через 1100 мс от открытия, дальше каждые 720 мс (эталон whats-new-coins.html)', () => {
    const burn = code('components/legacy_bonus/use_legacy_bonus_burn.ts');
    expect(burn).toContain('LEGACY_BONUS_START_DELAY_MS = 700');
    expect(burn).toContain('LEGACY_BONUS_FIRST_ROW_MS = 400');
    expect(burn).toContain('LEGACY_BONUS_ROW_GAP_MS = 720');
  });
});

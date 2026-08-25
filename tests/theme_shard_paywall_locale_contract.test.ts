import fs from 'fs';
import path from 'path';

// зачем (владелец 2026-08-24): пейвол покупки темы за жемчуг — валютный, а не
// подписочный, поэтому копирайт живёт внутри самого компонента (как в
// CardPackShardPaywallModal), а не в paywall_copy.ts. Отсутствие общего словаря
// означает, что забытый язык никто не поймает — этим занят данный сторож.
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app', 'ThemeShardPaywallModal.tsx'), 'utf8');
const pickerSource = fs.readFileSync(path.join(root, 'app', 'settings_themes.tsx'), 'utf8');

const NON_RU_LANGS = ['uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const REQUIRED_FIELDS = [
  'kicker',
  'intro',
  'cancel',
  'forShards',
  'insufficientTitle',
  'insufficientIntro',
  'shortageRemaining',
  'balanceBlockTitle',
  'needLabel',
  'youHaveLabel',
  'costLabel',
  'buyShards',
] as const;

/**
 * Тело функции копирайта. Проверки идут по нему, а не по всему файлу: ключи
 * локалей вроде `pl:` встречаются и в других местах (пропсы, типы), и счёт
 * по целому файлу дал бы ложное «всё переведено».
 */
const copyBody = (() => {
  const start = source.indexOf('export function themePaywallCopy(');
  expect(start).toBeGreaterThan(0);
  const end = source.indexOf('\nexport default function', start);
  return source.slice(start, end > 0 ? end : undefined);
})();

describe('theme shard paywall copy', () => {
  // зачем переписано (2026-08-25): копирайт переведён с языковых веток
  // `if (lang === 'uk')` на triLang-словари — этого потребовал сторож
  // непереведённого UI (он видит только вызовы переводчиков). Тест обязан
  // сторожить ФАКТИЧЕСКУЮ структуру, иначе он охраняет то, чего в коде нет.
  it('routes every string through the shared translator', () => {
    // Ни одной языковой ветки: сторож локализации такие строки не видит.
    for (const lang of NON_RU_LANGS) {
      expect(copyBody).not.toContain(`if (lang === '${lang}')`);
    }
    expect(copyBody).toContain('triLang(lang, {');
  });

  it('fills every required field on all eight languages', () => {
    const langKeys = ['ru', ...NON_RU_LANGS] as const;
    for (const field of REQUIRED_FIELDS) {
      // Поле объявлено ровно один раз — как ключ словаря triLang.
      const declarations = copyBody.split(`${field}: `).length - 1;
      expect(declarations).toBeGreaterThanOrEqual(1);
    }
    // И каждый язык присутствует столько же раз, сколько всего полей —
    // то есть ни один язык не забыт ни в одном словаре.
    const dictionaries = copyBody.split('triLang(lang, {').length - 1;
    expect(dictionaries).toBe(REQUIRED_FIELDS.length + 3); // + buying, ctaSub, shopCtaSub
    for (const lang of langKeys) {
      const key = lang === 'pt-BR' ? "'pt-BR':" : `${lang}:`;
      const occurrences = copyBody.split(key).length - 1;
      expect(occurrences).toBe(dictionaries);
    }
  });

  it('declines Russian and Ukrainian shard words instead of hardcoding a form', () => {
    // «200 жемчужин», но «не хватает 3 жемчужин» — падежи берём из общего
    // словаря, иначе формы разъезжаются между экранами (уже было).
    expect(source).toContain('ruKnowledgeShardsAccusativeAfterNumber');
    expect(source).toContain('ruKnowledgeShardsGenitiveAfterNumber');
    expect(source).toContain('ukKnowledgeShardsAccusativeAfterNumber');
    expect(source).toContain('ukKnowledgeShardsGenitiveAfterNumber');
  });

  it('never shows a subscription disclaimer on a currency purchase', () => {
    // Юридический дисклеймер автопродления относится к подписке. На разовой
    // трате внутренней валюты он был бы прямой ложью.
    expect(source).not.toContain('PaywallLegalDisclosure');
    expect(source).not.toContain('usePaywallPurchase');
    // Смотрим только на текст, который реально видит пользователь: слово
    // «автопродление» законно встречается в комментарии, объясняющем, почему
    // дисклеймера здесь быть не должно.
    const withoutComments = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(withoutComments).not.toMatch(/автопрод|auto-renew|списыв/i);
  });

  it('stops its looping animation when hidden', () => {
    // Правило перф-библии: бесконечный луп не крутится в фоне.
    expect(source).toContain('cancelAnimation(ctaPulse)');
  });

  it('is opened by the theme picker for shard themes instead of the Plus paywall', () => {
    expect(pickerSource).toContain('ThemeShardPaywallModal');
    expect(pickerSource).toContain('candidateNeedsShards');
    // Тема за жемчуг НЕ должна вести в подписочный пейвол — это ядро решения владельца.
    expect(pickerSource).toMatch(/if \(candidateNeedsShards\)[\s\S]{0,400}setPurchaseTarget\(candidate\);/);
  });
});

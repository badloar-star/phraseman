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

describe('theme shard paywall copy', () => {
  it('has a branch for every supported language', () => {
    for (const lang of NON_RU_LANGS) {
      expect(source).toContain(`if (lang === '${lang}')`);
    }
  });

  it('fills every required field in every branch', () => {
    // Русский — ветка по умолчанию (без if), поэтому считаем все восемь.
    for (const field of REQUIRED_FIELDS) {
      const occurrences = source.split(`${field}:`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(NON_RU_LANGS.length + 1);
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

// зачем (владелец 06.11, «МАКЕТ ПО УЛЬТРА И ПЛЮС ОДОБРЯЮ!»): на пейволе Месяц = Plus, Год = Ultra; заголовок, кнопка и тексты «с Plus» следуют выбранной плитке.
import fs from 'node:fs';
import path from 'node:path';
import { applyTierName } from '../app/subscription_tier';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('пейвол: Месяц = Plus, Год = Ultra', () => {
  it('плитки: «Ultra · Год» и «Plus · Месяц»', () => {
    const rows = read('components/paywall/PaywallPlanRows.tsx');
    expect(rows).toContain("name={`${SUBSCRIPTION_TIER_NAME.ultra} · ${pick(lang, COPY.year)}`}");
    expect(rows).toContain("name={`${SUBSCRIPTION_TIER_NAME.plus} · ${pick(lang, COPY.month)}`}");
  });

  it('экран: уровень по выбранной плитке задаёт провайдер (yearly → ultra)', () => {
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toContain("const paywallTier = p.selected === 'yearly' ? 'ultra' : 'plus';");
    expect(screen).toContain('<PaywallTierScope tier={paywallTier}>');
    expect(screen).toContain('</PaywallTierScope>');
  });

  it('шапка, тело и кнопка подставляют название уровня; без провайдера — Plus', () => {
    const plus = read('components/paywall/PaywallPlus.tsx');
    expect(plus).toContain("const tierText = useTierText();");
    expect(plus).toContain("{`PhraseMan ${tier === 'ultra' ? 'Ultra' : 'Plus'}`}");
    expect(plus).toContain('{tierText(label)}');
    expect(plus).toContain('tierText(leadBenefit)');
    expect(read('components/paywall/paywall_tier_context.tsx')).toContain("createContext<SubscriptionTier>('plus')");
  });

  it('подмена названия по слову работает на всех языках и не трогает «Plus» внутри слов', () => {
    expect(applyTierName('Добавь немецкий с PhraseMan Plus.', 'ultra')).toBe('Добавь немецкий с PhraseMan Ultra.');
    expect(applyTierName('Add another language with PhraseMan Plus.', 'ultra')).toBe('Add another language with PhraseMan Ultra.');
    expect(applyTierName('Bez Plus i Plusik', 'ultra')).toBe('Bez Ultra i Plusik');
    expect(applyTierName('Open with Plus', 'plus')).toBe('Open with Plus');
  });
});

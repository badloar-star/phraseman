// ЗАМОК ВЛАДЕЛЬЦА 05.11 ~19:40 (вариант Б, через координатора): на вкладке Plus подпись «Цена и пробный период — из магазина. Отмена в любой момент.» ОСТАЁТСЯ,
// под ней — строка автопродления выбранного плана и ряд «Условия · Конфиденциальность · Восстановить». Причина — App Store 3.1.2 / Google Play (риск отказа на ревью).
// Реестр docs/work/OWNER_LOCKS.md, строка 05.11. Ослабить можно только по новому слову владельца.
import { PLUS_TAB_RENEWS_MONTH, PLUS_TAB_RENEWS_YEAR, plusTabRenewsLine } from '../components/plus-tab/plus_tab_disclosure';
import { readSource } from './helpers/read_source';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('ЗАМОК ВЛАДЕЛЬЦА 05.11 — вкладка Plus: автопродление, ссылки, восстановление', () => {
  it('строки автопродления есть на всех 9 языках, непустые, год и месяц различаются', () => {
    for (const lang of LANGS) {
      expect(PLUS_TAB_RENEWS_YEAR[lang].length).toBeGreaterThan(10);
      expect(PLUS_TAB_RENEWS_MONTH[lang].length).toBeGreaterThan(10);
      expect(PLUS_TAB_RENEWS_YEAR[lang]).not.toBe(PLUS_TAB_RENEWS_MONTH[lang]);
    }
    expect(plusTabRenewsLine('ru', 'yearly')).toBe('Продлевается автоматически каждый год.');
    expect(plusTabRenewsLine('xx', 'monthly')).toBe('Renews automatically every month.');
  });
  it('подпись макета осталась, под ней строка автопродления и ряд ссылок', () => {
    const s = readSource('components/plus-tab/PlusTabScreen.tsx');
    expect(s).toContain('Цена и пробный период — из магазина. Отмена в любой момент.');
    const note = s.indexOf('STORE_NOTE[lang]');
    const renews = s.indexOf('plusTabRenewsLine(lang, p.selected)');
    const legal = s.indexOf('<PlusTabLegalRow');
    expect(note).toBeGreaterThan(0);
    expect(renews).toBeGreaterThan(note);
    expect(legal).toBeGreaterThan(renews);
    expect(s).toContain('p.handleRestore()');
  });
  it('ряд: Условия, Конфиденциальность, Восстановить — функциональные ссылки без обводок', () => {
    const s = readSource('components/plus-tab/PlusTabLegalRow.tsx');
    expect(s).toContain('KNOWLY_LEGAL_TERMS_URL');
    expect(s).toContain('KNOWLY_LEGAL_PRIVACY_URL');
    expect(s).toContain('PAYWALL_V3_RESTORE');
    expect(s).toContain('testID="plus-tab-restore"');
    expect(s).not.toMatch(/borderWidth|borderColor/);
  });
});

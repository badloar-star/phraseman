// ЗАМОК ВЛАДЕЛЬЦА (25.10, дословно): «все темы не бесплатные, те что с условиями — те с условиями. Те что вчера Кодекс добавил,
// там у каждой есть условия, и они должны быть». Условия открытия 6 премиум-тем = пакет Codex (снимок docs/work/codex_premium_themes_snapshot_2026-10-24_new).
// Оливковая — проверенной покупкой Plus и видна в выборе тем с замком. Сработал — вернуть условие, а не править сторож.
import fs from 'node:fs';
import path from 'node:path';
import { PREMIUM_THEME_CATALOG } from '../app/premium_theme_catalog';
import { premiumThemeRequirement } from '../app/premium_theme_copy';

const root = path.join(__dirname, '..');
const read = (p: string): string => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const SNAPSHOT = 'docs/work/codex_premium_themes_snapshot_2026-10-24_new/app/premium_theme_catalog.ts.txt';
const pairs = (src: string): string[] => [...src.matchAll(/\{\s*id:\s*'(grad_full_[a-z_]+)'[^}]*condition:\s*'([a-z0-9_]+)'/g)].map((m) => `${m[1]}=${m[2]}`).sort();

describe('условия премиум-тем = пакет Codex (замок владельца 25.10)', () => {
  it('каталог: те же 6 тем, условия и пороги, что в пакете', () => {
    const block = (src: string): string => (src.split('PREMIUM_THEME_CATALOG')[1] ?? '').split(']);')[0]!.replace(/\s+/g, ' ').trim();
    expect(block(read('app/premium_theme_catalog.ts'))).toBe(block(read(SNAPSHOT)));
    const expected = pairs(read(SNAPSHOT));
    expect(expected).toHaveLength(6);
    expect(PREMIUM_THEME_CATALOG.map((t) => `${t.id}=${t.condition}`).sort()).toEqual(expected);
    expect(PREMIUM_THEME_CATALOG.find((t) => t.id === 'grad_full_olive')?.condition).toBe('plus_purchase');
  });

  it('у каждой темы непустой текст условия; Оливковая — «Покупка Phraseman Plus»', () => {
    for (const t of PREMIUM_THEME_CATALOG) expect(premiumThemeRequirement(t.id, 'ru').trim().length).toBeGreaterThan(0);
    expect(premiumThemeRequirement('grad_full_olive', 'ru')).toBe('Покупка Phraseman Plus');
  });

  it('сервер засчитывает покупку Plus, клиент просит пересчёт после покупки, выбор тем не прячет Оливковую', () => {
    expect(read('functions/src/premium_themes.ts')).toMatch(/case 'plus_purchase': return input\.premiumPurchased;/);
    const ctx = read('components/ThemeContext.tsx');
    expect(ctx).toMatch(/onAppEvent\('premium_activated'/);
    expect(ctx).toMatch(/claimPremiumThemeCondition\('plus_purchase'\)/);
    expect(read('app/settings_themes.tsx')).not.toMatch(/HIDDEN_UNTIL_ACHIEVEMENT/);
  });
});

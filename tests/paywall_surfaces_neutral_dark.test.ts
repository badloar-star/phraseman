// зачем (координатор 13.10, paywall-gap-001): в тёмной «Авроре» PaywallPlus был зеленоватым (лист и плашки ≈ (40,53,53)) — теперь нейтраль «Тени» независимо от тона темы; светлое прежнее.
import fs from 'node:fs';
import path from 'node:path';

import { paywallPlateBg, paywallSheetBg } from '../components/paywall/paywall_surfaces';
import { SHADOW_SHEET_DARK_TOP } from '../components/v2/shadow_sheet_paint';

const channels = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const spread = (hex: string) => { const c = channels(hex); return Math.max(...c) - Math.min(...c); };

// токены с тоном темы: зелёно-серые лист/плитки, как у «Авроры» до правки
const tinted = (isLight: boolean) => ({ isLight, opaqueSheet: '#E9EEEE', opaqueCard: '#283535', opaqueControl: '#283535', plateFillFrom: '#2F4040', plateFillTo: '#2A3838' }) as never;

describe('поверхности пейвола Plus', () => {
  it('тёмное: лист — нейтральный #28282E, плашки светлее листа и нейтральны при любом тоне темы', () => {
    const g = tinted(false);
    expect(paywallSheetBg(g)).toBe(SHADOW_SHEET_DARK_TOP);
    const plate = paywallPlateBg(g);
    expect(spread(SHADOW_SHEET_DARK_TOP)).toBeLessThanOrEqual(8);
    expect(spread(plate)).toBeLessThanOrEqual(8);
    expect(channels(plate)[0]).toBeGreaterThan(channels(SHADOW_SHEET_DARK_TOP)[0]);
  });
  it('светлое: прежние токены — лист opaqueSheet, плашки opaqueControl', () => {
    const g = tinted(true);
    expect(paywallSheetBg(g)).toBe('#E9EEEE');
    expect(paywallPlateBg(g)).toBe('#283535');
  });
  it('PaywallPlus и список преимуществ берут плашки отсюда, а не из opaqueControl темы', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    for (const rel of ['components/paywall/PaywallPlus.tsx', 'components/paywall/PaywallBenefitComparison.tsx']) {
      const src = read(rel).split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
      expect(src).not.toMatch(/backgroundColor: g\.opaqueControl/);
      expect(src).toContain('paywallPlateBg(g)');
    }
  });
});

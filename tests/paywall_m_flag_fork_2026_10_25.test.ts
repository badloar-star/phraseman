// зачем (координатор 25.10, пейвол «Вариант М»): М живёт за флагом «Пульта» paywall_m_enabled — по умолчанию выключен, включается только значением true;
// в экране это одна развилка (вход «Не видим твой Plus» на неё не попадает), в «Пульте → Монетизация» — отдельный переключатель с дефолтом «выключено».
import fs from 'node:fs';
import path from 'node:path';

import { applyRemoteConfigSnapshot, getRemoteBool } from '../app/remote_flags';

const read = (relativePath: string): string => fs.readFileSync(path.join(path.resolve(__dirname, '..'), relativePath), 'utf8');

describe('пейвол «Вариант М»: флаг и развилка', () => {
  afterEach(() => { applyRemoteConfigSnapshot({}); });

  it('по умолчанию выключен; включается только значением true из Пульта', () => {
    applyRemoteConfigSnapshot({});
    expect(getRemoteBool('paywall_m_enabled')).toBe(false);
    applyRemoteConfigSnapshot({ bools: { paywall_m_enabled: true } });
    expect(getRemoteBool('paywall_m_enabled')).toBe(true);
  });

  it('экран: М только при флаге и не на входе «Не видим твой Plus»; прежнее окно остаётся веткой else', () => {
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toContain('const showM = mFlag && !serverRefused;');
    expect(screen).toContain('{showM ? (');
    expect(screen).toContain('<PaywallSwipeSheet testID="paywall-sheet"');
    expect(screen).toContain('usePaywallMPerson(showM)');
    expect(screen).toContain('setMFlag(isPaywallMEnabled());');
  });

  it('Пульт: переключатель М есть, пустой конфиг его не включает (у остальных дефолт «видно»)', () => {
    const admin = read('admin/v2/legacy.html');
    expect(admin).toContain('id="cp-paywall-control-paywall_m_enabled"');
    expect(admin).toContain("input.checked = key === 'paywall_m_enabled' ? bools[key] === true : bools[key] !== false;");
  });
});

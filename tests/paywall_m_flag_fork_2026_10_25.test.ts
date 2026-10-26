// зачем (координатор 25.10, пейвол «Вариант М»; владелец 26.10 — включён по умолчанию в 2.0.3 (146)): М живёт за флагом «Пульта» paywall_m_enabled — по умолчанию ВКЛЮЧЁН, выключается только значением false;
// в экране это одна развилка (вход «Не видим твой Plus» на неё не попадает), в «Пульте → Монетизация» — переключатель с дефолтом «включено», как в приложении.
import fs from 'node:fs';
import path from 'node:path';

import { applyRemoteConfigSnapshot, getRemoteBool } from '../app/remote_flags';

const read = (relativePath: string): string => fs.readFileSync(path.join(path.resolve(__dirname, '..'), relativePath), 'utf8');

describe('пейвол «Вариант М»: флаг и развилка', () => {
  afterEach(() => { applyRemoteConfigSnapshot({}); });

  it('по умолчанию включён; выключается только значением false из Пульта', () => {
    applyRemoteConfigSnapshot({});
    expect(getRemoteBool('paywall_m_enabled')).toBe(true);
    applyRemoteConfigSnapshot({ bools: { paywall_m_enabled: false } });
    expect(getRemoteBool('paywall_m_enabled')).toBe(false);
    applyRemoteConfigSnapshot({ bools: { paywall_m_enabled: true } });
    expect(getRemoteBool('paywall_m_enabled')).toBe(true);
  });

  it('экран: М только при флаге (вход «Не видим твой Plus» получает свою панель М); прежнее окно остаётся веткой else', () => {
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toContain('const showM = mFlag;');
    expect(screen).toContain('{showM ? (');
    expect(screen).toContain('<PaywallSwipeSheet testID="paywall-sheet"');
    expect(screen).toContain('usePaywallMPerson(showM)');
    expect(screen).toContain('setMFlag(isPaywallMEnabled());');
  });

  it('Пульт: переключатель М есть, пустой конфиг показывает его включённым — как приложение (как и у остальных)', () => {
    const admin = read('admin/v2/legacy.html');
    expect(admin).toContain('id="cp-paywall-control-paywall_m_enabled"');
    expect(admin).toContain('input.checked = bools[key] !== false;');
    expect(admin).not.toContain("key === 'paywall_m_enabled' ? bools[key] === true");
  });
});

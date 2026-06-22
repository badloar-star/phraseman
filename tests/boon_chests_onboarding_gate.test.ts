// Контракт: все boon-сундуки (RN Modal поверх онбординг-оверлея) НЕ показываются
// во время онбординга. Иначе сундук всплывает на первом экране у нового/сброшенного
// юзера (баг, который был у PerfectWeekHost). Гейт читает onboarding_done и стоит ДО
// setWantShow → слот OverlayArbiter не занимается зря и не голодит тосты.
//
// Статическая проверка исходника (как onboarding_responsive_layout.test.ts): ловит
// регресс, если кто-то снимет гейт. Полноценный рендер-тест хостов с хуками избыточен.
import fs from 'fs';
import path from 'path';

function readComponent(name: string): string {
  return fs.readFileSync(path.join(__dirname, '..', 'components', name), 'utf8');
}

describe('boon-сундуки: гейт онбординга перед показом', () => {
  it('PerfectWeekHost читает onboarding_done в логике eligibility', () => {
    // У PerfectWeekHost гейт в app/boons/perfect_week.ts (checkPerfectWeekEligible).
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'boons', 'perfect_week.ts'),
      'utf8',
    );
    expect(src).toContain("getItem('onboarding_done')");
  });

  it('MysteryMondayHost: гейт onboarding_done стоит ДО setWantShow', () => {
    const src = readComponent('MysteryMondayHost.tsx');
    expect(src).toContain("getItem('onboarding_done')");
    const gateIdx = src.indexOf("getItem('onboarding_done')");
    const showIdx = src.indexOf('setWantShow(true)');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(showIdx).toBeGreaterThan(-1);
    // Гейт должен предшествовать показу — иначе слот занимается до проверки.
    expect(gateIdx).toBeLessThan(showIdx);
  });

  it('BoonActivatedHost: гейт onboarding_done стоит ДО setWantShow', () => {
    const src = readComponent('BoonActivatedHost.tsx');
    expect(src).toContain("getItem('onboarding_done')");
    const gateIdx = src.indexOf("getItem('onboarding_done')");
    const showIdx = src.indexOf('setWantShow(true)');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(showIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(showIdx);
  });

  it('ComebackBoonHost безопасен по природе (null last_active_date = 0 дней, не eligible)', () => {
    // Comeback не нуждается в гейте: после сброса last_active_date стёрт → null →
    // daysSinceLastActive=0 → 0 >= 2 = false. Подтверждено в boon_comeback.test.ts.
    // Здесь лишь фиксируем, что хост по-прежнему гейтится checkComebackEligible.
    const src = readComponent('ComebackBoonHost.tsx');
    expect(src).toContain('checkComebackEligible()');
  });
});

// Сторож «энергия от Пика» (владелец 04.11): бонус считается из дельт по неделям, идемпотентно, максимум по языкам.
import {
  SPIRE_ENERGY_BONUS_MAX,
  spireEnergyBonusForLang,
  spireEnergyBonusFromDeltas,
  spireEnergyDeltaForWeek,
} from '../../shared/spire_energy_bonus';

describe('spire energy bonus', () => {
  it('нет карты/мусор → 0 (существующие игроки: запас остаётся 5)', () => {
    for (const raw of [undefined, null, 5, 'x', [], {}]) expect(spireEnergyBonusFromDeltas(raw)).toBe(0);
  });

  it('повышения +1, понижения −1, не ниже 0 и не выше 11', () => {
    expect(spireEnergyBonusForLang({ '2026-W45': 1, '2026-W46': 1, '2026-W47': -1 })).toBe(1);
    expect(spireEnergyBonusForLang({ '2026-W45': -1, '2026-W46': -1 })).toBe(0);
    const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`w${i}`, 1]));
    expect(spireEnergyBonusForLang(many)).toBe(SPIRE_ENERGY_BONUS_MAX);
  });

  it('повтор финализа недели не удваивает: тот же ключ недели перезаписывается', () => {
    const once = { en: { '2026-W45': 1 } };
    const rerun = { en: { ...once.en, '2026-W45': 1 } };
    expect(spireEnergyBonusFromDeltas(rerun)).toBe(spireEnergyBonusFromDeltas(once));
  });

  it('несколько языков: максимум, смена языка запас не режет', () => {
    expect(spireEnergyBonusFromDeltas({ en: { a: 1, b: 1 }, es: { a: 1 } })).toBe(2);
    expect(spireEnergyBonusFromDeltas({ en: { a: 1, b: -1 }, es: { a: 1 } })).toBe(1);
  });

  it('дельта недели: только знак смены лиги', () => {
    expect(spireEnergyDeltaForWeek(3, 4)).toBe(1);
    expect(spireEnergyDeltaForWeek(4, 3)).toBe(-1);
    expect(spireEnergyDeltaForWeek(4, 4)).toBe(0);
  });

  it('финализ пишет дельту по ключу недели в тот же merge-набор, что и spireTiers', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(path.join(__dirname, 'spire_finalize_cron.ts'), 'utf8');
    expect(src).toMatch(/spireEnergyDeltas: \{ \[lang\]: \{ \[weekId\]: spireEnergyDeltaForWeek\(result\.prevTier, result\.newTier\) \} \}/);
  });
});

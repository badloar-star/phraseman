// Страж имён шпилей-камней (PM-278, T29). Шпиль N = бывшая лига N — 12 ступеней,
// в каждой локали интерфейса все 12. Сработал — допиши перевод, а не ослабляй проверку.
// зачем правка 01.10: Лиги удалены (D74/D83) вместе с app/league_engine.ts и миграцией
// functions/src/spire_league_migration_contract.ts — сравнение «лига → шпиль» снято.
import { SOURCE_LOCALES } from '../app/source_locales';
import {
  SPIRE_TIER_COUNT,
  SPIRE_TIER_NAMES,
  clampSpireTierIndex,
  spireTierName,
} from '../modules/spire/tier_names';

const OWNER_T29 = ['Гранит', 'Базальт', 'Мрамор', 'Нефрит', 'Кварц', 'Агат', 'Оникс', 'Аметист', 'Опал', 'Топаз', 'Обсидиан', 'Алмаз'];

describe('имена шпилей-камней', () => {
  it('12 ступеней-камней: Гранит … Алмаз', () => {
    expect(SPIRE_TIER_COUNT).toBe(12);
    expect(spireTierName(0, 'ru')).toBe('Гранит');
    expect(spireTierName(11, 'ru')).toBe('Алмаз');
  });

  it('русские имена — ровно решение владельца T29', () => {
    expect([...SPIRE_TIER_NAMES.ru]).toEqual(OWNER_T29);
  });

  it('все локали интерфейса (+en) имеют 12 непустых уникальных имён', () => {
    const locales = [...SOURCE_LOCALES, 'en'] as const;
    for (const locale of locales) {
      const names = SPIRE_TIER_NAMES[locale];
      expect(names).toHaveLength(12);
      for (const name of names) expect(name.trim().length).toBeGreaterThan(0);
      expect(new Set(names).size).toBe(12);
    }
    expect(Object.keys(SPIRE_TIER_NAMES).sort()).toEqual([...locales].sort());
  });

  it('битый tier не роняет экран', () => {
    expect(clampSpireTierIndex('x')).toBe(0);
    expect(clampSpireTierIndex(99)).toBe(11);
    expect(clampSpireTierIndex(-3)).toBe(0);
    expect(spireTierName(undefined, 'uk')).toBe('Граніт');
  });
});

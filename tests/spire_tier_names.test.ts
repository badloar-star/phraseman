// Страж имён шпилей-камней (PM-278, T29). Шпиль N = бывшая лига N, поэтому
// имён ровно столько же, сколько лиг, и в каждой локали интерфейса все 12.
// Сработал — допиши перевод, а не ослабляй проверку.
import { CLUBS } from '../app/league_engine';
import { SOURCE_LOCALES } from '../app/source_locales';
import {
  LEAGUE_TIER_COUNT,
  SPIRE_TIER_COUNT as SERVER_SPIRE_TIER_COUNT,
  leagueIdToSpireTier,
} from '../functions/src/spire_league_migration_contract';
import {
  SPIRE_TIER_COUNT,
  SPIRE_TIER_NAMES,
  clampSpireTierIndex,
  spireTierName,
} from '../modules/spire/tier_names';

const OWNER_T29 = ['Гранит', 'Базальт', 'Мрамор', 'Нефрит', 'Кварц', 'Агат', 'Оникс', 'Аметист', 'Опал', 'Топаз', 'Обсидиан', 'Алмаз'];

describe('имена шпилей-камней', () => {
  it('12 лиг = 12 шпилей на клиенте и на сервере', () => {
    expect(CLUBS).toHaveLength(12);
    expect(SPIRE_TIER_COUNT).toBe(CLUBS.length);
    expect(SERVER_SPIRE_TIER_COUNT).toBe(CLUBS.length);
    expect(LEAGUE_TIER_COUNT).toBe(CLUBS.length);
  });

  it('каждая лига CLUBS переходит в шпиль с тем же индексом', () => {
    for (const club of CLUBS) {
      expect(leagueIdToSpireTier(club.id)).toEqual({ tier: club.id, clamped: false });
    }
    expect(spireTierName(CLUBS[0].id, 'ru')).toBe('Гранит');
    expect(spireTierName(CLUBS[CLUBS.length - 1].id, 'ru')).toBe('Алмаз');
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

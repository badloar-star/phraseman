import fs from 'fs';
import path from 'path';
import { PROFILE_CARD_XP_BOOST, profileCardXpMultiplier } from '../app/profile_card_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(),
  spendShards: jest.fn(),
  forceSyncShardsToCloud: jest.fn(async () => {}),
}));
jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: false,
  IS_EXPO_GO: true,
}));

describe('profileCardXpMultiplier — Фаза 1: постоянный XP-буст +2% для карточки II+', () => {
  it('pins the boost constant to ×1.02', () => {
    expect(PROFILE_CARD_XP_BOOST).toBe(1.02);
  });

  it('is neutral below level II and ×1.02 for every level II+', () => {
    expect(profileCardXpMultiplier(0)).toBe(1);
    expect(profileCardXpMultiplier(1)).toBe(1);
    expect(profileCardXpMultiplier(2)).toBe(1.02);
    expect(profileCardXpMultiplier(3)).toBe(1.02);
    expect(profileCardXpMultiplier(4)).toBe(1.02);
    expect(profileCardXpMultiplier(5)).toBe(1.02);
  });
});

describe('xp_manager — cardM вклад во всех формулах (source contract)', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'xp_manager.ts'), 'utf8');

  it('declares cardM in MultiplierBreakdown', () => {
    expect(source).toContain('cardM: number;');
  });

  it('adds (cardM - 1) to all three multiplier formulas', () => {
    // registerXP (начисление), getCurrentMultiplier и getCurrentMultiplierBreakdown (UI).
    expect(source.match(/\(cardM - 1\)/g)).toHaveLength(3);
  });

  it('reads the card level through the storage-key pattern, without importing profile_card_system', () => {
    expect(source).toContain("storageGetString('profile_card_level')");
    expect(source).not.toMatch(/from '\.\/profile_card_system'/);
  });

  it('normalizes legacy multiplier docs that predate cardM', () => {
    // Чтение старых документов остаётся живым: где бы breakdown ни был прочитан,
    // отсутствующий cardM должен дефолтиться к нейтральной 1.
    expect(source).toContain("cardM: typeof m.cardM === 'number' ? m.cardM : 1");
  });

  it('never writes multipliers back into the decommissioned arena_profiles', () => {
    // зачем: арена выведена из эксплуатации (tests/quiz_arena_decommission_contract) —
    // firestore.rules держит `allow read, write: if false`, сервер туда не пишет, поле
    // multipliers не читает ни один экран. Раньше registerXP слал эту запись на КАЖДЫЙ
    // начисляемый XP; правила её отклоняли, а .catch(() => {}) скрывал отказ — впустую
    // будило радио на каждом правильном ответе. Контракт декоммиссии фильтрует клиентские
    // файлы по слову «arena» в ИМЕНИ файла, поэтому xp_manager.ts мимо него проходил;
    // этот храповик закрывает именно ту брешь.
    expect(source).not.toContain("collection('arena_profiles')");
  });

  it('keeps cardM neutral in the breakdown fallback', () => {
    expect(source).toContain('boonXpContribution: 0, cardM: 1, hotHoursM: 1, total: 1');
  });
});

describe('PlayerProfileModal — чип «Карточка ×1.02» (source contract)', () => {
  const modal = fs.readFileSync(path.join(process.cwd(), 'components', 'PlayerProfileModal.tsx'), 'utf8');

  it('renders the card chip only when cardM > 1, formatted like sibling chips', () => {
    expect(modal).toContain('{multipliers.cardM > 1 && (');
    expect(modal).toContain('×{multipliers.cardM.toFixed(2)}');
  });

  it('localizes the chip label into all 8 app languages', () => {
    for (const label of [
      "ru: 'Карточка',",
      "uk: 'Картка',",
      "es: 'Tarjeta',",
      "'pt-BR': \"Cartão\",",
      'vi: "Thẻ",',
      'id: "Kartu",',
      'tr: "Kart",',
      "pl: 'Karta',",
    ]) {
      expect(modal).toContain(label);
    }
  });
});

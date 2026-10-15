// D195 (владелец 15.10): старые бонусы → монеты по курсам «Средне», потолки, только серверные поля.
import fs from 'node:fs';
import path from 'node:path';

import { LEGACY_BONUS_RATES_V1, legacyBonusSourceFromUserDoc, planLegacyBonus } from './legacy_bonus_convert';
import { STAR_OP_CLASS, STAR_OP_SOURCE } from './stars_ledger';

describe('planLegacyBonus — курсы «Средне» и потолки', () => {
  it('курсы: опыт ×0,1, жемчуг ×10, вращение 130', () => {
    expect(LEGACY_BONUS_RATES_V1).toMatchObject({ xpToCoins: 0.1, pearlToCoins: 10, levelSpinToCoins: 130, capPerCurrency: 5000, capPerPerson: 6000 });
    expect(planLegacyBonus({ xp: 8362, pearls: 12, spins: 1 })).toEqual({
      from: { xp: 8362, pearls: 12, spins: 1 },
      coins: { xp: 836, pearls: 120, spins: 130, total: 1086 },
      cappedBy: 'none',
    });
  });

  it('потолок валюты 5 000', () => {
    const plan = planLegacyBonus({ xp: 726_419, pearls: 0, spins: 0 });
    expect(plan.coins).toEqual({ xp: 5000, pearls: 0, spins: 0, total: 5000 });
    expect(plan.cappedBy).toBe('currency');
  });

  it('потолок человека 6 000 — срезается сперва жемчуг, потом опыт', () => {
    const plan = planLegacyBonus({ xp: 60_000, pearls: 500, spins: 1 });
    expect(plan.coins.total).toBe(6000);
    expect(plan.coins.spins).toBe(130);
    expect(plan.coins.xp).toBe(5000);
    expect(plan.coins.pearls).toBe(870);
    expect(plan.cappedBy).toBe('person');
  });

  it('мусор и отрицательные значения → 0', () => {
    expect(planLegacyBonus({ xp: -5, pearls: Number.NaN, spins: 0.4 }).coins.total).toBe(0);
  });
});

describe('источник — только серверные поля', () => {
  it('опыт из progressServerState.totalXp, жемчуг из shards, вращения из levelSpinServerState.balance; телефонные копии игнорируются', () => {
    expect(legacyBonusSourceFromUserDoc({
      progressServerState: { totalXp: 1200 },
      shards: 30,
      levelSpinServerState: { balance: 2 },
      progress: { user_total_xp: 999_999, shards_balance: 999_999 },
    })).toEqual({ xp: 1200, pearls: 30, spins: 2 });
    expect(legacyBonusSourceFromUserDoc(undefined)).toEqual({ xp: 0, pearls: 0, spins: 0 });
  });
});

describe('журнал монет и проводка', () => {
  it('legacy_bonus — grant (не двигает earnedTotal и лигу), источник other', () => {
    expect(STAR_OP_CLASS.legacy_bonus).toBe('grant');
    expect(STAR_OP_SOURCE.legacy_bonus).toBe('other');
  });

  it('экспорт, выключатель, идемпотентность по opId и метке, сироты слияния — 0', () => {
    const src = fs.readFileSync(path.join(__dirname, 'legacy_bonus_convert.ts'), 'utf8');
    expect(fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8')).toContain('export { legacyBonusConvertMine } from "./legacy_bonus_convert";');
    expect(src).toContain("bools[LEGACY_BONUS_FLAG_KEY] === true");
    expect(src).toContain('opId: `legacy_bonus:v1.${currency}`');
    expect(src).toContain('commitStarOperations(tx, prepared, { [LEGACY_BONUS_V1_FIELD]: record })');
    expect(src).toContain("data.identityHidden === true || (canonical && canonical !== stableUid)");
    expect(src).not.toMatch(/request\.data\?\.(xp|pearls|shards|spins|amount)/);
    // окно при нуле — только обновившимся с 1.x: время создания документа (служебное), не клиентское поле
    expect(src).toContain('const upgraded = createdMs < LEGACY_BONUS_UPGRADE_CUTOFF_MS;');
    expect(src).toContain('userSnap.createTime ? userSnap.createTime.toMillis()');
  });
});

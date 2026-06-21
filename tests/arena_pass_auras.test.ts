import {
  AVATAR_AURAS,
  ARENA_PASS_AURA_IDS,
  getAvatarAuraById,
  type AvatarAuraEffect,
} from '../constants/avatar_auras';
import { AURA_MILESTONE_LEVELS, buildBattlePassLadder } from '../app/arena_battle_pass';

// Эффекты, у которых ЕСТЬ реальный рендер в components/AvatarAura.tsx.
// Если добавляешь новый эффект — сначала дай ему рендер, потом сюда.
const RENDERED_EFFECTS: AvatarAuraEffect[] = ['flame', 'storm', 'frost', 'stardust', 'ether'];

describe('Ауры Боевого пропуска Арены', () => {
  it('все 4 id пропуска есть в каталоге AVATAR_AURAS', () => {
    for (const id of ARENA_PASS_AURA_IDS) {
      expect(getAvatarAuraById(id)).toBeDefined();
    }
  });

  it('у каждой ауры пропуска есть реально отрисованный эффект (не пустое кольцо)', () => {
    for (const id of ARENA_PASS_AURA_IDS) {
      const aura = getAvatarAuraById(id)!;
      expect(aura.effect).toBeDefined();
      expect(RENDERED_EFFECTS).toContain(aura.effect);
    }
  });

  it('ауры пропуска НЕ премиум/VIP-онли и без unlockLevel (выдаются дропом)', () => {
    for (const id of ARENA_PASS_AURA_IDS) {
      const aura = getAvatarAuraById(id)!;
      expect(aura.premiumOnly).toBeFalsy();
      expect(aura.vipOnly).toBeFalsy();
      expect(aura.unlockLevel).toBeUndefined();
    }
  });

  it('у каждой ауры пропуска заполнены все 8 локализованных имён', () => {
    for (const id of ARENA_PASS_AURA_IDS) {
      const a = getAvatarAuraById(id)!;
      for (const name of [a.nameRu, a.nameUk, a.nameEs, a.namePtBr, a.nameVi, a.nameId, a.nameTr, a.namePl]) {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      }
    }
  });

  it('сезонные ауры aura-season / aura-season-champion получили реальные эффекты', () => {
    expect(RENDERED_EFFECTS).toContain(getAvatarAuraById('aura-season')!.effect);
    expect(RENDERED_EFFECTS).toContain(getAvatarAuraById('aura-season-champion')!.effect);
  });

  it('вехи пропуска ровно совпадают с числом аур', () => {
    expect(AURA_MILESTONE_LEVELS.length).toBe(ARENA_PASS_AURA_IDS.length);
  });

  it('каждая веха в лестнице выдаёт ауру из ARENA_PASS_AURA_IDS', () => {
    const ladder = buildBattlePassLadder();
    const granted = AURA_MILESTONE_LEVELS.map((lvl) => ladder[lvl - 1].premium?.auraId);
    for (const id of granted) {
      expect(ARENA_PASS_AURA_IDS).toContain(id);
    }
  });

  it('id каталога не дублируются', () => {
    const ids = AVATAR_AURAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

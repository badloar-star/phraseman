import {
  SEASON_AVATAR_AURA_IDS,
  getAvatarAuraById,
  normalizeAvatarAuraId,
} from '../constants/avatar_auras';

describe('season aura account preview', () => {
  it('registers every season aura in the canonical user_aura catalog', () => {
    expect(SEASON_AVATAR_AURA_IDS).toEqual([
      'aura-season-1-stage-1',
      'aura-season-1-stage-2',
      'aura-season-1-stage-3',
      'aura-season-1-stage-4',
      'aura-season-1-secret',
    ]);

    for (const id of SEASON_AVATAR_AURA_IDS) {
      expect(getAvatarAuraById(id)).toMatchObject({ id, rewardOnly: true });
      expect(normalizeAvatarAuraId(id)).toBe(id);
    }
  });

  // зачем (PM-062/D61, владелец 2026-09-24): AvatarAura.tsx больше не рисует
  // ни одобренные, ни сезонные кольца — «ауры удаляем без замены». Тест на
  // рендер-внутренности AvatarAura.tsx (SeasonAuraRing/scale/размер кольца)
  // отменён вместе с самим рендером; каталог id/владения (проверен выше)
  // остаётся источником правды для данных.
});

// зачем (владелец 06.11, Plus/Ultra; Ядро e4e2bf551): у друзей кольцо Ultra, когда сервер отдаёт plusTier === 'ultra'; нет поля (старый ответ/сервер не выложен) → Plus.
import fs from 'node:fs';
import path from 'node:path';
import { isPlusProfile, plusTierOfProfile } from '../components/plus/plus_ring_spec';

const src = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Plus/Ultra: друзья', () => {
  it('plusTierOfProfile: только "ultra" даёт ultra; нет поля/null/мусор — plus', () => {
    expect(plusTierOfProfile({ isPlus: true, plusUntilMs: 0, plusTier: 'ultra' })).toBe('ultra');
    for (const v of ['plus', null, undefined, 'ULTRA', 3, {}]) expect(plusTierOfProfile({ isPlus: true, plusUntilMs: 0, plusTier: v })).toBe('plus');
    expect(plusTierOfProfile(null)).toBe('plus');
  });

  it('признак Plus по-прежнему решает isPlusProfile (уровень на него не влияет)', () => {
    expect(isPlusProfile({ isPlus: false, plusUntilMs: 0, plusTier: 'ultra' })).toBe(false);
    expect(isPlusProfile({ isPlus: true, plusUntilMs: 0, plusTier: 'ultra' })).toBe(true);
  });

  it('проводка: монета друга, карточки поиска/заявок, строка списка и разбор профиля несут plusTier', () => {
    expect(src('components/friends/FriendsGlassKit.tsx')).toContain('<PlusAvatarRing plus={plus} tier={plusTier} size={size} surface={glass.plateFillFrom}>');
    expect(src('components/friends/FriendsFoundCard.tsx')).toContain('plusTier={plusTierOfProfile(profile)}');
    expect(src('components/friends/FriendsRequestCard.tsx')).toContain('plusTier={plusTierOfProfile(profile)}');
    expect(src('components/friends_together/FriendListRow.tsx')).toContain('plus={isPlus} plusTier={plusTier}');
    const friends = src('app/(tabs)/friends.tsx');
    expect(friends).toContain("plusTier: data.plusTier === 'ultra' ? 'ultra' : data.plusTier === 'plus' ? 'plus' : null,");
    expect(friends).toContain("plusTier: rec.plusTier === 'ultra' ? 'ultra' : rec.plusTier === 'plus' ? 'plus' : null,");
    expect(friends).toContain('plusTier={plusTierOfProfile(profile)}');
  });
});

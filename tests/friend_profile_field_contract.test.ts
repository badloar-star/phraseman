/**
 * Страж контракта «писатель ↔ читатель» публичного профиля игрока.
 *
 * Инцидент 2026-08-03: карточка ЛЮБОГО чужого игрока показывала «0 опыта / Lv.1».
 * Причина — рассинхрон имён полей: writer кладёт в leaderboard/{uid} общий XP в
 * поле `points`, а reader (buildFriendProfile) спрашивал `totalXp`, которого в
 * документе нет вовсе → num(undefined) = 0. Профиль возвращался «валидным», но
 * пустым: молчаливая ложь вместо явной поломки.
 *
 * Обычные тесты департаментов такое НЕ ловят — они работают на моках, где поля
 * названы так, как их ждёт читатель, и остаются зелёными. Поэтому здесь документ
 * собирается ровно по схеме РЕАЛЬНОГО писателя (functions/src/sync_leaderboard.ts
 * → batch.set(lbRef, {...}) и app/firestore_leaderboard.ts), а проверяется
 * результат чтения.
 *
 * Сломался тест — чини контракт, а не удаляй проверку.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildFriendProfile } from '../functions/src/friends_profiles';

const REPO_ROOT = join(__dirname, '..');

/**
 * Документ leaderboard/{uid} ровно в той схеме, которую пишет
 * functions/src/sync_leaderboard.ts. Имена полей менять здесь НЕЛЬЗЯ в отрыве от
 * писателя — в этом весь смысл стража.
 */
const LEADERBOARD_DOC_AS_WRITTEN = {
  name: 'Omega 89307',
  nameLower: 'omega 89307',
  points: 12480,          // ← общий XP живёт ИМЕННО здесь, не в totalXp
  weekPoints: 320,        // ← недельные очки — отдельное поле, это НЕ опыт
  weekKey: '2026-W31',
  lang: 'ru',
  avatar: '7',
  frame: null,
  aura: null,
  profileCardLevel: 2,
  profileCardTheme: 'classic',
  profileCardMotion: 'none',
  profileCardPublicFocus: 'balanced',
  streak: 5,
  leagueId: 3,
  isBot: false,
  syncVersion: 2,
  updatedAt: 1_754_000_000_000,
};

describe('friend public profile field contract', () => {
  it('reads real XP from the field the writer actually populates', () => {
    const profile = buildFriendProfile('uid-1', LEADERBOARD_DOC_AS_WRITTEN);

    expect(profile).not.toBeNull();
    // Регрессия инцидента: раньше здесь было 0, потому что читали `totalXp`.
    expect(profile!.totalXp).toBe(12480);
    expect(profile!.totalXp).not.toBe(0);
    // Уровень считается от опыта → он тоже перестаёт быть «Lv.1».
    expect(profile!.level).toBeGreaterThan(1);
  });

  it('never mistakes weekly points for lifetime XP', () => {
    const profile = buildFriendProfile('uid-1', LEADERBOARD_DOC_AS_WRITTEN);
    // weekPoints (320) — витринное недельное число. Если оно просочится в
    // totalXp, уровень станет враньём: 25 XP = 1 уровень.
    expect(profile!.totalXp).not.toBe(LEADERBOARD_DOC_AS_WRITTEN.weekPoints);
  });

  it('carries name, card level, streak and league from the written fields', () => {
    const profile = buildFriendProfile('uid-1', LEADERBOARD_DOC_AS_WRITTEN);

    expect(profile!.displayName).toBe('Omega 89307');
    expect(profile!.profileCardLevel).toBe(2);
    expect(profile!.streak).toBe(5);
    expect(profile!.leagueId).toBe(3);
  });

  it('distinguishes "no streak field" from an honest zero', () => {
    const { streak: _omitted, ...withoutStreak } = LEADERBOARD_DOC_AS_WRITTEN;
    const unknown = buildFriendProfile('uid-1', withoutStreak);
    // null → карточка прячет строку; 0 → карточка утверждает «цепочки нет».
    expect(unknown!.streak).toBeNull();

    const honestZero = buildFriendProfile('uid-1', { ...LEADERBOARD_DOC_AS_WRITTEN, streak: 0 });
    expect(honestZero!.streak).toBe(0);
  });

  it('still understands legacy documents written under the old key names', () => {
    // Старые документы (arena_profiles / прежние схемы) должны продолжать читаться.
    const legacy = buildFriendProfile('uid-2', {
      displayName: 'Legacy',
      totalXp: 900,
      courseProfileCardLevel: 1,
      courseIsPremium: true,
    });

    expect(legacy!.totalXp).toBe(900);
    expect(legacy!.displayName).toBe('Legacy');
    expect(legacy!.profileCardLevel).toBe(1);
    expect(legacy!.isPremium).toBe(true);
  });

  it('returns null for a genuinely empty profile instead of a zeroed lie', () => {
    expect(buildFriendProfile('uid-3', undefined)).toBeNull();
    expect(buildFriendProfile('uid-3', {})).toBeNull();
  });

  /**
   * Прямая сцепка с писателем: если кто-то переименует поле в
   * sync_leaderboard.ts, читатель перестанет его находить и карточка снова
   * молча занулится. Тест ломается СРАЗУ на переименовании.
   */
  it('keeps the writer emitting exactly the keys the reader looks up', () => {
    const writerSource = readFileSync(
      join(REPO_ROOT, 'functions', 'src', 'sync_leaderboard.ts'),
      'utf8',
    );
    for (const key of ['points:', 'name,', 'profileCardLevel,', 'streak,', 'leagueId,', 'avatar,']) {
      expect(writerSource).toContain(key);
    }

    const readerSource = readFileSync(
      join(REPO_ROOT, 'functions', 'src', 'friends_profiles.ts'),
      'utf8',
    );
    // Канонические ключи обязаны стоять ПЕРВЫМИ в цепочке ??, иначе документ
    // старой схемы снова перебьёт актуальный.
    expect(readerSource).toContain('lb?.points ?? lb?.totalXp');
    expect(readerSource).toContain('lb?.profileCardLevel ?? lb?.courseProfileCardLevel');
    expect(readerSource).toContain('str(lb?.name)');
  });
});

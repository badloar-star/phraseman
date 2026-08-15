import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateBotProfiles } from './tournament_core';
import {
  REDDIT_BOT_NAMES,
  TOURNAMENT_REDDIT_BOT_PROFILE_COUNT,
  TOURNAMENT_REDDIT_BOT_PROFILE_IDS,
  TOURNAMENT_REDDIT_BOT_SEED_VERSION,
  isAcceptedTournamentBotSeedVersion,
  isSafeTournamentBotName,
} from './tournament_reddit_bot_names';

const tournamentRuntime = require('./tournaments') as {
  validBotProfile?: (id: string, data: Record<string, unknown>) => {
    avatarEmoji: string;
    avatarAura?: string;
  } | null;
};

describe('tournament Reddit bot names', () => {
  test('ships exactly 200 unique, safe multilingual tournament names', () => {
    expect(REDDIT_BOT_NAMES).toHaveLength(200);
    expect(new Set(REDDIT_BOT_NAMES.map((name) => name.toLowerCase())).size).toBe(200);
    expect(REDDIT_BOT_NAMES.filter((name) => /[А-Яа-яЁё]/u.test(name)).length)
      .toBeGreaterThanOrEqual(60);
    expect(REDDIT_BOT_NAMES.filter((name) => /^[A-Za-z0-9_-]+$/u.test(name)).length)
      .toBeGreaterThanOrEqual(60);
    expect(REDDIT_BOT_NAMES).not.toContain('huesoso');

    for (const name of REDDIT_BOT_NAMES) {
      // Точка допущена наравне с _ и - : ники вида nova.k и rain.exe входят в
      // ту самую разнородность, ради которой корпус переписан вручную.
      expect(name).toMatch(/^[\p{L}\p{N}._-]{3,20}$/u);
      expect(name).not.toMatch(/^(?:\[deleted\]|AutoModerator)$/i);
      expect(name).not.toMatch(/bot|admin|mod(?:erator)?|fuck|shit|cunt|nazi|porn|sex|nipple|racist|hitler|asshole|penis|fart|dick|cock|boob|tits|whore|slut|rape|huesos|khuesos|хуесос|хуй|пизд|бляд|ебан|ёбан/i);
    }
  });

  test('rejects transliterated and separator-obfuscated profanity', () => {
    expect(isSafeTournamentBotName('huesoso')).toBe(false);
    expect(isSafeTournamentBotName('hue_soso')).toBe(false);
    expect(isSafeTournamentBotName('хуесос')).toBe(false);
    expect(isSafeTournamentBotName('тихий_лис')).toBe(true);
    expect(isSafeTournamentBotName('quiet_polyglot')).toBe(true);
  });

  test('keeps the prior seed readable during the zero-downtime corpus migration', () => {
    expect(isAcceptedTournamentBotSeedVersion(TOURNAMENT_REDDIT_BOT_SEED_VERSION)).toBe(true);
    expect(isAcceptedTournamentBotSeedVersion('tournament-bots-v2-reddit-20260801')).toBe(true);
    expect(isAcceptedTournamentBotSeedVersion('tournament-bots-v1')).toBe(false);
  });

  test('reads as a real lobby: no single naming template dominates the corpus', () => {
    // зачем 2026-08-02 (владелец: «ники все очень однотипные, нет ни одного
    // игрового»): прошлый корпус был машинным. Сотня имён строилась решёткой
    // 10 префиксов × 10 существительных (тихий_лис, сонный_кот, рыжий_сова…),
    // а вторая сотня — покрученными реальными никами (BeaotyAndGlamaur). В
    // лобби это читалось как список, а не как живые игроки. Тест сторожит
    // именно РАЗНОРОДНОСТЬ, а не конкретные имена: любой будущий корпус,
    // собранный по одному шаблону, здесь упадёт.
    const withUnderscore = REDDIT_BOT_NAMES.filter((name) => name.includes('_'));
    const withDot = REDDIT_BOT_NAMES.filter((name) => name.includes('.'));
    const withDigits = REDDIT_BOT_NAMES.filter((name) => /\d/u.test(name));
    const camelCase = REDDIT_BOT_NAMES.filter((name) => /^[A-Z][a-z]+[A-Z]/u.test(name));
    const allLowerLatin = REDDIT_BOT_NAMES.filter((name) => /^[a-z]+$/u.test(name));
    const cyrillic = REDDIT_BOT_NAMES.filter((name) => /[А-Яа-яЁё]/u.test(name));

    // Каждый стиль реально представлен — корпус не свалился в один приём.
    expect(withUnderscore.length).toBeGreaterThanOrEqual(20);
    expect(withDot.length).toBeGreaterThanOrEqual(5);
    expect(withDigits.length).toBeGreaterThanOrEqual(10);
    expect(camelCase.length).toBeGreaterThanOrEqual(20);
    expect(allLowerLatin.length).toBeGreaterThanOrEqual(30);
    expect(cyrillic.length).toBeGreaterThanOrEqual(40);

    // Ни один приём не занимает больше половины корпуса.
    for (const group of [withUnderscore, withDot, withDigits, camelCase, allLowerLatin, cyrillic]) {
      expect(group.length).toBeLessThan(REDDIT_BOT_NAMES.length / 2);
    }

    // Длины разные — у живых людей ники и короткие, и длинные.
    const lengths = REDDIT_BOT_NAMES.map((name) => name.length);
    expect(Math.min(...lengths)).toBeLessThanOrEqual(4);
    expect(Math.max(...lengths)).toBeGreaterThanOrEqual(14);
    expect(new Set(lengths).size).toBeGreaterThanOrEqual(10);

    // Главная ловушка прошлого корпуса: решётка «префикс_существительное».
    // Если один и тот же префикс до подчёркивания повторяется у многих имён —
    // это снова машинная генерация, а не живые ники.
    const prefixCounts = new Map<string, number>();
    for (const name of withUnderscore) {
      const prefix = name.slice(0, name.indexOf('_')).toLowerCase();
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
    }
    expect(Math.max(0, ...prefixCounts.values())).toBeLessThanOrEqual(3);
  });

  test('no name survives from the retired real-person corpus', () => {
    // Ники живых людей с Reddit больше не должны встречаться ни в каком виде —
    // ни целиком, ни как «покрученный» вариант с переставленными буквами.
    const retired = [
      'gulbasaur', 'beckylibei', 'creolepolyglot', 'mrggy', 'steveisamonster',
      'beautyandglamour', 'linguobuxo', 'artgor', 'vercertorix', 'xefjord',
    ];
    const compact = (value: string) => value.toLowerCase().replace(/[^a-zа-яё0-9]/gu, '');
    for (const name of REDDIT_BOT_NAMES) {
      const flat = compact(name);
      for (const old of retired) {
        expect(flat).not.toBe(old);
        // Покрученный вариант: та же длина и >70% общих букв на тех же местах.
        if (flat.length !== old.length) continue;
        const same = [...flat].filter((char, index) => char === old[index]).length;
        expect(same / old.length).toBeLessThan(0.7);
      }
    }
  });

  test('assigns all 200 profiles distinct names', () => {
    const profiles = generateBotProfiles(200, TOURNAMENT_REDDIT_BOT_SEED_VERSION);
    expect(new Set(profiles.map((profile) => profile.name.toLowerCase())).size).toBe(200);
  });

  test('assigns stable mixed level, aura, and rare shop avatars', () => {
    const profiles = generateBotProfiles(200, 'tournament-bots-v2-reddit-20260801');
    const levelAvatars = profiles.filter((profile) => /^\d{1,2}$/.test(profile.avatarEmoji));
    const shopAvatars = profiles.filter((profile) => (
      /^custom:custom-gen-(?:4[1-9]|5\d|6[0-2]):[a-z]+:(?:black|white)$/.test(profile.avatarEmoji)
    ));
    const auras = profiles.filter((profile) => Boolean(profile.avatarAura));

    expect(levelAvatars.length).toBeGreaterThanOrEqual(160);
    expect(shopAvatars.length).toBeGreaterThanOrEqual(8);
    expect(shopAvatars.length).toBeLessThanOrEqual(30);
    expect(auras.length).toBeGreaterThanOrEqual(3);
    expect(auras.length).toBeLessThanOrEqual(12);
    expect(auras.length).toBeLessThan(shopAvatars.length);
    // Порог 80→70 (2026-08-03): кап уровня ботов ≤50 сжал пул уровневых
    // аватаров с 60 до 50 значений, уникальных комбинаций на 200 профилей
    // стало 75. Смысл стража прежний — боты не вырождаются в горстку близнецов.
    expect(new Set(profiles.map((profile) => `${profile.avatarEmoji}|${profile.avatarAura ?? ''}`)).size)
      .toBeGreaterThanOrEqual(70);
    // Владелец 2026-08-03: бот не может выглядеть выше 50 уровня.
    for (const profile of levelAvatars) {
      expect(Number(profile.avatarEmoji)).toBeGreaterThanOrEqual(1);
      expect(Number(profile.avatarEmoji)).toBeLessThanOrEqual(50);
    }
  });

  test('normalizes accepted legacy emoji profiles to the current rare visual mix', () => {
    const validBotProfile = tournamentRuntime.validBotProfile;
    expect(typeof validBotProfile).toBe('function');
    if (!validBotProfile) return;

    const profiles = TOURNAMENT_REDDIT_BOT_PROFILE_IDS.map((botId, index) => validBotProfile(botId, {
      isBot: true,
      seedVersion: 'tournament-bots-v2-reddit-20260801',
      name: REDDIT_BOT_NAMES[index],
      avatarEmoji: '🦊',
      avatarAura: 'aura-ember',
      color: '#47C870',
      winRate: 0.5,
      rank: 'silver',
      titles: [],
    }));

    expect(profiles.every(Boolean)).toBe(true);
    const visuals = profiles.filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
    const levelAvatars = visuals.filter((profile) => /^\d{1,2}$/.test(profile.avatarEmoji));
    const shopAvatars = visuals.filter((profile) => profile.avatarEmoji.startsWith('custom:'));
    const auras = visuals.filter((profile) => Boolean(profile.avatarAura));

    expect(levelAvatars.length).toBeGreaterThanOrEqual(170);
    expect(shopAvatars.length).toBeGreaterThanOrEqual(8);
    expect(shopAvatars.length).toBeLessThanOrEqual(30);
    expect(auras.length).toBeGreaterThanOrEqual(3);
    expect(auras.length).toBeLessThanOrEqual(12);
    expect(auras.length).toBeLessThan(shopAvatars.length);
    expect(visuals.some((profile) => profile.avatarEmoji === '🦊')).toBe(false);
  });

  test('loads the complete 200-profile corpus for live room selection', () => {
    const source = readFileSync(resolve(__dirname, 'tournaments.ts'), 'utf8');
    expect(TOURNAMENT_REDDIT_BOT_PROFILE_COUNT).toBe(200);
    expect(TOURNAMENT_REDDIT_BOT_PROFILE_IDS).toHaveLength(200);
    expect(TOURNAMENT_REDDIT_BOT_PROFILE_IDS[0]).toBe('bot_001');
    expect(TOURNAMENT_REDDIT_BOT_PROFILE_IDS[199]).toBe('bot_200');
    expect(new Set(TOURNAMENT_REDDIT_BOT_PROFILE_IDS).size).toBe(200);
    expect(source).toContain('...TOURNAMENT_REDDIT_BOT_PROFILE_IDS.map((botId) =>');
    expect(source).toContain('!isAcceptedTournamentBotSeedVersion(data.seedVersion)');
    expect(source).toContain('!isSafeTournamentBotName(name)');
    expect(source).not.toContain("collection(BOT_PROFILES_COLLECTION).limit(");
  });

  test('keeps the connected admin callable pinned to the exact safe corpus', () => {
    const source = readFileSync(resolve(__dirname, 'tournament_bots.ts'), 'utf8');
    expect(TOURNAMENT_REDDIT_BOT_SEED_VERSION).toBe('tournament-bots-v5-handcrafted-20260802');
    expect(source).toContain('const count = TOURNAMENT_REDDIT_BOT_PROFILE_COUNT;');
    expect(source).toContain('generateBotProfiles(count, TOURNAMENT_REDDIT_BOT_PERSONA_SEED)');
    expect(source).toContain("throw new HttpsError('invalid-argument', 'bot_count_must_equal_200')");
    expect(source).toContain('{ merge: true }');
    expect(source).not.toContain('MAX_BOT_COUNT');
    expect(source).not.toContain('{ merge: overwrite }');
  });
});

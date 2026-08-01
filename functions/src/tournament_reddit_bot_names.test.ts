import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateBotProfiles } from './tournament_core';
import {
  REDDIT_BOT_NAMES,
  REDDIT_BOT_SOURCE_PAGES,
  TOURNAMENT_REDDIT_BOT_PROFILE_COUNT,
  TOURNAMENT_REDDIT_BOT_PROFILE_IDS,
  TOURNAMENT_REDDIT_BOT_SEED_VERSION,
  isAcceptedTournamentBotSeedVersion,
  isSafeTournamentBotName,
} from './tournament_reddit_bot_names';

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
      expect(name).toMatch(/^[\p{L}\p{N}_-]{3,20}$/u);
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

  test('records the public Reddit pages used as provenance', () => {
    expect(REDDIT_BOT_SOURCE_PAGES.length).toBeGreaterThanOrEqual(4);
    for (const page of REDDIT_BOT_SOURCE_PAGES) {
      expect(page).toMatch(/^https:\/\/(?:www\.|old\.|en\.)?reddit\.com\/r\//);
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
    expect(auras.length).toBeGreaterThanOrEqual(25);
    expect(auras.length).toBeLessThanOrEqual(70);
    expect(new Set(profiles.map((profile) => `${profile.avatarEmoji}|${profile.avatarAura ?? ''}`)).size)
      .toBeGreaterThanOrEqual(80);
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
    expect(TOURNAMENT_REDDIT_BOT_SEED_VERSION).toBe('tournament-bots-v3-multilingual-20260801');
    expect(source).toContain('const count = TOURNAMENT_REDDIT_BOT_PROFILE_COUNT;');
    expect(source).toContain('generateBotProfiles(count, TOURNAMENT_REDDIT_BOT_PERSONA_SEED)');
    expect(source).toContain("throw new HttpsError('invalid-argument', 'bot_count_must_equal_200')");
    expect(source).toContain('{ merge: true }');
    expect(source).not.toContain('MAX_BOT_COUNT');
    expect(source).not.toContain('{ merge: overwrite }');
  });
});

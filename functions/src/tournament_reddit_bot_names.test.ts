import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateBotProfiles } from './tournament_core';
import {
  REDDIT_BOT_NAMES,
  REDDIT_BOT_SOURCE_PAGES,
  TOURNAMENT_REDDIT_BOT_PROFILE_COUNT,
  TOURNAMENT_REDDIT_BOT_PROFILE_IDS,
  TOURNAMENT_REDDIT_BOT_SEED_VERSION,
} from './tournament_reddit_bot_names';

describe('tournament Reddit bot names', () => {
  test('ships exactly 200 unique, safe public Reddit handles', () => {
    expect(REDDIT_BOT_NAMES).toHaveLength(200);
    expect(new Set(REDDIT_BOT_NAMES.map((name) => name.toLowerCase())).size).toBe(200);

    for (const name of REDDIT_BOT_NAMES) {
      expect(name).toMatch(/^[A-Za-z0-9_-]{3,20}$/);
      expect(name).not.toMatch(/^(?:\[deleted\]|AutoModerator)$/i);
      expect(name).not.toMatch(/bot|admin|mod(?:erator)?|fuck|shit|cunt|nazi|porn|sex|nipple|racist|hitler|asshole|penis|fart|dick|cock|boob|tits|whore|slut|rape/i);
    }
  });

  test('records the public Reddit pages used as provenance', () => {
    expect(REDDIT_BOT_SOURCE_PAGES.length).toBeGreaterThanOrEqual(4);
    for (const page of REDDIT_BOT_SOURCE_PAGES) {
      expect(page).toMatch(/^https:\/\/(?:www\.|old\.|en\.)?reddit\.com\/r\//);
    }
  });

  test('assigns all 200 profiles distinct names', () => {
    const profiles = generateBotProfiles(200, 'tournament-bots-v2-reddit-20260801');
    expect(new Set(profiles.map((profile) => profile.name.toLowerCase())).size).toBe(200);
  });

  test('loads the complete 200-profile corpus for live room selection', () => {
    const source = readFileSync(resolve(__dirname, 'tournaments.ts'), 'utf8');
    expect(TOURNAMENT_REDDIT_BOT_PROFILE_COUNT).toBe(200);
    expect(TOURNAMENT_REDDIT_BOT_PROFILE_IDS).toHaveLength(200);
    expect(TOURNAMENT_REDDIT_BOT_PROFILE_IDS[0]).toBe('bot_001');
    expect(TOURNAMENT_REDDIT_BOT_PROFILE_IDS[199]).toBe('bot_200');
    expect(new Set(TOURNAMENT_REDDIT_BOT_PROFILE_IDS).size).toBe(200);
    expect(source).toContain('...TOURNAMENT_REDDIT_BOT_PROFILE_IDS.map((botId) =>');
    expect(source).toContain("data.seedVersion !== TOURNAMENT_REDDIT_BOT_SEED_VERSION");
    expect(source).not.toContain("collection(BOT_PROFILES_COLLECTION).limit(");
  });

  test('keeps the connected admin callable pinned to the exact safe corpus', () => {
    const source = readFileSync(resolve(__dirname, 'tournament_bots.ts'), 'utf8');
    expect(TOURNAMENT_REDDIT_BOT_SEED_VERSION).toBe('tournament-bots-v2-reddit-20260801');
    expect(source).toContain('const count = TOURNAMENT_REDDIT_BOT_PROFILE_COUNT;');
    expect(source).toContain("throw new HttpsError('invalid-argument', 'bot_count_must_equal_200')");
    expect(source).toContain('{ merge: true }');
    expect(source).not.toContain('MAX_BOT_COUNT');
    expect(source).not.toContain('{ merge: overwrite }');
  });
});

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPT_PATH = path.resolve(
  __dirname,
  '..',
  'functions',
  'scripts',
  'seed_tournament_bots.js',
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const seedScript = require(SCRIPT_PATH);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateBotProfiles } = require('../functions/src/tournament_core.ts');

describe('tournament Reddit bot production seed script', () => {
  test('is dry-run by default and requires all independent apply guards', () => {
    expect(seedScript.resolveApplyIntent([], {})).toBe(false);
    expect(seedScript.resolveApplyIntent([], {
      PHRASEMAN_TOURNAMENT_REDDIT_BOT_APPLY: '1',
    })).toBe(false);
    expect(() => seedScript.resolveApplyIntent(['--apply'], {}))
      .toThrow('reddit_bot_apply_guard_missing');
    expect(seedScript.resolveApplyIntent(['--apply'], {
      PHRASEMAN_TOURNAMENT_REDDIT_BOT_APPLY: '1',
    })).toBe(true);
  });

  test('pins the exact reviewed 200-name corpus and production project', () => {
    const names = seedScript.buildExpectedProfiles().map((profile: { name: string }) => profile.name);
    const digest = crypto.createHash('sha256')
      .update(Buffer.from(`${names.join('\n')}\n`, 'utf8'))
      .digest('hex');

    expect(names).toHaveLength(200);
    expect(new Set(names.map((name: string) => name.toLowerCase())).size).toBe(200);
    // зачем 2026-08-01 (аудит турнира): корпус пересобран — прежние 100 имён
    // были настоящими никами живых пользователей Reddit, использованными без
    // согласия в игре на реальные жемчужины. Хеш и версия seed подняты, чтобы
    // засев переписал имена ботов в базе; персоны при этом не трогаются
    // (см. следующий тест).
    // зачем 2026-08-02 (владелец: «ники все очень однотипные, нет ни одного
    // игрового»): корпус переписан ВРУЧНУЮ во второй раз. Версия v4 брала
    // реальные ники и крутила в них буквы (Gulbasaur → Gullpasaur), а вторую
    // сотню строила решёткой 10×10 (тихий_лис, сонный_кот…) — в лобби это
    // читалось как машинный список. v5 собран из разных стилей: слитные,
    // CamelCase, с точкой, с цифрами, кириллица, короткие «ленивые».
    expect(seedScript.EXPECTED_NAMES_SHA256)
      .toBe('1c924a54c39262a7ddafb5f290e9254f987e7226b1a5148384e16c7614011603');
    expect(digest).toBe(seedScript.EXPECTED_NAMES_SHA256);
    expect(seedScript.EXPECTED_PROJECT_ID).toBe('phraseman-ea0b3');
    expect(seedScript.SEED_VERSION).toBe('tournament-bots-v5-handcrafted-20260802');
  });

  test('contains no real Reddit handle the corpus was originally sampled from', () => {
    // зачем 2026-08-01 (аудит турнира): это главный смысл правки. Прежний
    // корпус состоял из НАСТОЯЩИХ ников реальных людей с Reddit, взятых без их
    // согласия, а игра идёт на реальные жемчужины. Тест держит границу: если
    // кто-то однажды вернёт исходный список, сборка упадёт здесь.
    const RETIRED_REAL_HANDLES = [
      'Gulbasaur', 'BeckyLiBei', 'CreolePolyglot', 'LinguoBuxo', 'mrggy',
      'Artgor', 'valeriethesinger', 'NoTakaru', 'unsafeideas', 'Xefjord',
      'Starthreads', 'vercertorix', 'transnochator', 'jragonfyre', 'simiform',
      'Longjumping_Read_684', 'Excellent_Potential', 'ZestycloseSample7403',
    ];
    const names = seedScript.buildExpectedProfiles()
      .map((profile: { name: string }) => profile.name.toLowerCase());

    for (const handle of RETIRED_REAL_HANDLES) {
      expect(names).not.toContain(handle.toLowerCase());
    }
  });

  test('changes names without re-rolling persistent bot personas or difficulty', () => {
    const legacy = generateBotProfiles(200, 'tournament-bots-v2-reddit-20260801');
    const migrated = seedScript.buildExpectedProfiles();

    expect(migrated.map((profile: Record<string, unknown>) => ({
      botId: profile.botId,
      avatarEmoji: profile.avatarEmoji,
      avatarAura: profile.avatarAura,
      rank: profile.rank,
      titles: profile.titles,
      winRate: profile.winRate,
      color: profile.color,
    }))).toEqual(legacy.map((profile: Record<string, unknown>) => ({
      botId: profile.botId,
      avatarEmoji: profile.avatarEmoji,
      avatarAura: profile.avatarAura,
      rank: profile.rank,
      titles: profile.titles,
      winRate: profile.winRate,
      color: profile.color,
    })));
  });

  test('requires the caller to repeat the exact corpus SHA on every run', () => {
    expect(() => seedScript.assertExpectedNamesHash([]))
      .toThrow('expected_names_sha256_missing');
    expect(() => seedScript.assertExpectedNamesHash([
      '--expected-names-sha256=wrong',
    ])).toThrow('expected_names_sha256_mismatch');
    expect(() => seedScript.assertExpectedNamesHash([
      `--expected-names-sha256=${seedScript.EXPECTED_NAMES_SHA256}`,
    ])).not.toThrow();
  });

  test('plans only changed target documents and preserves unrelated fields', () => {
    const expected = seedScript.buildExpectedProfiles();
    const unchanged = {
      ...expected[0],
      updatedAt: 10,
      customField: 'preserve-me',
    };
    const renamed = {
      ...expected[1],
      name: 'OldName',
      customField: 'also-preserve-me',
    };
    const plan = seedScript.planProfileChanges(expected, new Map([
      [expected[0].botId, unchanged],
      [expected[1].botId, renamed],
    ]));

    expect(plan.unchangedIds).toContain(expected[0].botId);
    expect(plan.changed.map((entry: { id: string }) => entry.id)).toEqual(
      expected.slice(1).map((profile: { botId: string }) => profile.botId),
    );
    expect(plan.changed[0].writeData).toMatchObject(expected[1]);
    expect(plan.changed[0].writeData).not.toHaveProperty('customField');
    expect(plan.changed[0].writeData).not.toHaveProperty('updatedAt');
  });

  test('backs up every target before the first production write', () => {
    const expected = seedScript.buildExpectedProfiles();
    const backup = seedScript.buildBackupPayload(expected, new Map([
      [expected[0].botId, { ...expected[0], customField: 'recover-me' }],
    ]), '2026-08-01T00:00:00.000Z');

    expect(backup.entries).toHaveLength(200);
    expect(backup.entries[0]).toEqual({
      id: expected[0].botId,
      exists: true,
      data: { ...expected[0], customField: 'recover-me' },
    });
    expect(backup.entries[1]).toEqual({
      id: expected[1].botId,
      exists: false,
      data: null,
    });

    const mainSource = seedScript.main.toString();
    expect(mainSource.indexOf('writeBackupFile')).toBeGreaterThan(-1);
    expect(mainSource.indexOf('writeBackupFile')).toBeLessThan(mainSource.indexOf('applyChanges'));
    const scriptSource = fs.readFileSync(SCRIPT_PATH, 'utf8');
    expect(scriptSource).toContain("flag: 'wx'");
    expect(scriptSource).toContain('immutableBackupStamp');
  });
});

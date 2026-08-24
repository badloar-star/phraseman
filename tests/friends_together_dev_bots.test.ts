import fs from 'node:fs';
import path from 'node:path';
import { buildWeeklyChestModel } from '../app/friends_together/weekly_chest_model';

const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
}));

jest.mock('../app/constants/bot_names', () => ({
  BOT_NAMES: ['Ada', 'Ben', 'Cleo', 'Dani', 'Eli', 'Faye', 'Gus', 'Hana', 'Ivan', 'Juno', 'Kai', 'Lina'],
}));

jest.mock('../app/config', () => ({
  ENABLE_DEV_TOOLS: true,
}));

async function loadSubject() {
  jest.resetModules();
  (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
  return import('../app/friends_together/dev_bots');
}

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  jest.restoreAllMocks();
});

afterAll(() => {
  delete (global as typeof globalThis & { __DEV__?: boolean }).__DEV__;
});

describe('friends_together DEV bots', () => {
  it('adds bots, persists them, and restores the same state after a module reload', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.25);
    const subject = await loadSubject();

    const added = await subject.addDevBots(3);

    expect(added.bots).toHaveLength(3);
    expect(new Set(added.bots.map((bot) => bot.uid)).size).toBe(3);
    expect(added.bots.map((bot) => bot.days)).toEqual([0, 3, 10]);

    const reloaded = await loadSubject();
    await expect(reloaded.loadDevBots()).resolves.toEqual(added);
  });

  it('advances one bot and all bots without changing unrelated flags', async () => {
    const subject = await loadSubject();
    const added = await subject.addDevBots(3);
    const target = added.bots[0];

    const one = await subject.advanceBotDay(target.uid, 2);
    expect(one.bots[0]).toMatchObject({ days: target.days + 2, learnedToday: true });
    expect(one.bots[1].days).toBe(added.bots[1].days);

    const all = await subject.advanceAllBots(1);
    expect(all.bots.map((bot) => bot.days)).toEqual(one.bots.map((bot) => bot.days + 1));
  });

  it('exposes incoming nudge and gift-ready changes in returned state', async () => {
    const subject = await loadSubject();
    const added = await subject.addDevBots(1);
    const uid = added.bots[0].uid;

    const nudged = await subject.simulateIncomingNudge(uid);
    expect(nudged.bots[0]).toMatchObject({ incomingNudge: true, learnedToday: false });

    const gifted = await subject.markGiftReady(uid);
    expect(gifted.bots[0]).toMatchObject({ incomingNudge: true, giftReady: true });
  });

  it('forces each chest tier to the exact reachable threshold, even from only three bots', async () => {
    const subject = await loadSubject();
    await subject.addDevBots(3);

    for (const [tier, threshold] of [[1, 6000], [2, 12000], [3, 20000]] as const) {
      const state = await subject.setChestScenario(tier);
      const metrics = (subject as any).devBotTogetherMetrics as (bot: typeof state.bots[number]) => { level: number };
      const model = buildWeeklyChestModel({
        friends: state.bots.map((bot) => ({
          uid: bot.uid,
          weeklyXp: bot.weeklyXp,
          pairLevel: metrics(bot).level,
        })),
        myDays: 7,
        myWeeklyXp: 1000,
        weekKey: '2026-W34',
        claimedWeekKey: null,
        isClaimDay: true,
      });

      expect(state.chestScenarioTier).toBe(tier);
      expect(model.progress).toBe(threshold);
      expect(model.tier).toBe(tier);
      expect(model.canClaim).toBe(true);
    }
  });

  it('clear chest resets the scenario and all bot weekly XP', async () => {
    const subject = await loadSubject();
    await subject.addDevBots(3);
    await subject.setChestScenario(2);

    const cleared = await subject.setChestScenario(0);

    expect(cleared.chestScenarioTier).toBe(0);
    expect(cleared.bots.every((bot) => bot.weeklyXp === 0)).toBe(true);
    expect(cleared.chestOpenedTier).toBe(0);
  });

  it('opens a DEV chest only once until the explicit chest reset', async () => {
    const subject = await loadSubject();
    await subject.addDevBots(3);
    await subject.setChestScenario(1);

    const first = await subject.openDevChestScenario();
    expect(first.opened).toBe(true);
    expect(first.state.chestOpenedTier).toBe(1);

    const repeated = await subject.openDevChestScenario();
    expect(repeated.opened).toBe(false);
    expect(repeated.state.chestOpenedTier).toBe(1);

    const reset = await subject.resetDevChestScenario();
    expect(reset.chestOpenedTier).toBe(0);
    expect(reset.chestScenarioTier).toBe(1);

    const afterReset = await subject.openDevChestScenario();
    expect(afterReset.opened).toBe(true);
  });

  it('builds a complete visible friend profile and friendship metrics for a bot', async () => {
    const subject = await loadSubject();
    const bot = (await subject.addDevBots(1)).bots[0];
    const toProfile = (subject as any).devBotToFriendProfile as (value: typeof bot, avatar: string, frame: string) => unknown;
    const metrics = (subject as any).devBotTogetherMetrics as (value: typeof bot) => unknown;

    expect(toProfile(bot, 'avatar-dev', 'frame-dev')).toEqual({
      uid: bot.uid,
      name: bot.name,
      totalXp: bot.totalXp,
      weeklyXp: bot.weeklyXp,
      streak: bot.streak,
      isPremium: false,
      isVip: false,
      isLifetime: false,
      avatar: 'avatar-dev',
      frame: 'frame-dev',
      aura: undefined,
    });
    expect(metrics(bot)).toMatchObject({
      level: 1,
      progressPercent: 0,
      learnedToday: false,
      incomingNudge: false,
      giftReady: false,
    });
  });

  it('resets all local DEV bot state', async () => {
    const subject = await loadSubject();
    await subject.addDevBots(3);
    await subject.setChestScenario(1);

    await expect(subject.resetDevBots()).resolves.toEqual({ bots: [], chestScenarioTier: 0, chestOpenedTier: 0 });
    expect(subject.getDevBotsSnapshot()).toEqual({ bots: [], chestScenarioTier: 0, chestOpenedTier: 0 });
  });

  it('wires DEV bot statuses into the details sheet, not compact list-row badges', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/friends.tsx'), 'utf8');
    const devBotsSource = fs.readFileSync(path.join(process.cwd(), 'app/friends_together/dev_bots.ts'), 'utf8');
    const togetherDisplayStart = source.indexOf('const togetherDisplay = pair && friendsTogetherUiEnabled');
    const togetherSheetEnd = source.indexOf('{friendsTogetherPolicy.enabled && levelUpModal', togetherDisplayStart);
    const togetherSheet = source.slice(togetherDisplayStart, togetherSheetEnd);

    expect(source).toContain('const friendsTogetherUiEnabled = friendsTogetherPolicy.enabled || (ENABLE_DEV_TOOLS && devBots.length > 0)');
    expect(source).toMatch(/\{ENABLE_DEV_TOOLS\s*&&\s*\(\s*<TouchableOpacity[\s\S]*?testID="friends-together-dev-open"/);
    expect(devBotsSource).toContain("import { ENABLE_DEV_TOOLS } from '../config'");
    expect(devBotsSource).toContain('return ENABLE_DEV_TOOLS;');
    expect(source).toContain('devBotToFriendProfile');
    expect(source).toContain('devBotTogetherMetrics');
    expect(source).toContain('incomingNudge: bot.incomingNudge');
    expect(source).toContain('giftReady: bot.giftReady');
    expect(source).not.toContain('friend-together-incoming-${profile.uid}');
    expect(source).not.toContain('friend-together-gift-ready-${profile.uid}');
    expect(togetherDisplayStart).toBeGreaterThanOrEqual(0);
    expect(togetherSheetEnd).toBeGreaterThan(togetherDisplayStart);
    expect(togetherSheet).toContain('incomingNudge: rowTogether?.incomingNudge ?? false');
    expect(togetherSheet).toContain('giftReady: rowTogether?.giftReady ?? false');
    expect(togetherSheet).toContain('<FriendTogetherSheet');
    expect(togetherSheet).toContain('together={togetherDisplay}');
  });

  it('renders an unmistakable themed DEV label instead of an icon-only control', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/friends.tsx'), 'utf8');
    const buttonStart = source.indexOf('testID="friends-together-dev-open"');
    const buttonEnd = source.indexOf('</TouchableOpacity>', buttonStart);
    const devButton = source.slice(buttonStart, buttonEnd);

    expect(buttonStart).toBeGreaterThan(-1);
    expect(devButton).toContain('backgroundColor: t.accent');
    expect(devButton).toContain('color: t.correctText');
    expect(devButton).toMatch(/>DEV<\/FlowText>/);
  });
});

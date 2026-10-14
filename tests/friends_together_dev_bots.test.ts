import fs from 'node:fs';
import path from 'node:path';

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

  it('exposes incoming nudge changes in returned state', async () => {
    const subject = await loadSubject();
    const added = await subject.addDevBots(1);
    const uid = added.bots[0].uid;

    const nudged = await subject.simulateIncomingNudge(uid);
    expect(nudged.bots[0]).toMatchObject({ incomingNudge: true, learnedToday: false });

  });

  it('builds a complete visible friend profile and friendship metrics for a bot', async () => {
    const subject = await loadSubject();
    const bot = (await subject.addDevBots(1)).bots[0];
    const toProfile = (subject as any).devBotToFriendProfile as (value: typeof bot, avatar: string, frame: string) => unknown;
    const metrics = (subject as any).devBotTogetherMetrics as (value: typeof bot) => unknown;

    expect(toProfile(bot, 'avatar-dev', 'frame-dev')).toEqual({
      uid: bot.uid,
      name: bot.name,
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
    });
  });

  it('resets all local DEV bot state', async () => {
    const subject = await loadSubject();
    await subject.addDevBots(3);

    await expect(subject.resetDevBots()).resolves.toEqual({ bots: [] });
    expect(subject.getDevBotsSnapshot()).toEqual({ bots: [] });
  });

  it('wires DEV bot statuses into the details sheet, not compact list-row badges', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/friends.tsx'), 'utf8');
    const devBotsSource = fs.readFileSync(path.join(process.cwd(), 'app/friends_together/dev_bots.ts'), 'utf8');
    const togetherDisplayStart = source.indexOf('const togetherDisplay = pair && friendsTogetherUiEnabled');
    // зачем (10.10): «Вместе» выключен в релизном контуре (5249a7a6e, 30.09) — флаг стал константой false,
    // окно повышения уровня «Вместе» снято; шторка по-прежнему получает данные через togetherDisplay.
    const togetherSheetEnd = source.indexOf('</FriendTogetherSheet>', togetherDisplayStart) > -1
      ? source.indexOf('</FriendTogetherSheet>', togetherDisplayStart)
      : source.indexOf('/>', source.indexOf('<FriendTogetherSheet', togetherDisplayStart));
    const togetherSheet = source.slice(togetherDisplayStart, togetherSheetEnd);

    expect(source).toContain('const friendsTogetherUiEnabled = false;');
    // зачем (Макеты 12.10, community-020): к условию добавлено `!isDevOverlaysOff()` — плашка DEV не попадает в кадры сверки; в разработке она по-прежнему только под ENABLE_DEV_TOOLS
    expect(source).toMatch(/\{ENABLE_DEV_TOOLS\s*&&\s*!isDevOverlaysOff\(\)\s*&&\s*\(\s*<TouchableOpacity[\s\S]*?testID="friends-together-dev-open"/);
    expect(devBotsSource).toContain("import { ENABLE_DEV_TOOLS } from '../config'");
    expect(devBotsSource).toContain('return ENABLE_DEV_TOOLS;');
    expect(source).toContain('devBotToFriendProfile');
    expect(source).toContain('devBotTogetherMetrics');
    expect(source).toContain('incomingNudge: bot.incomingNudge');
    expect(source).not.toContain('friend-together-incoming-${profile.uid}');
    expect(source).not.toContain('friend-together-gift-ready-${profile.uid}');
    expect(togetherDisplayStart).toBeGreaterThanOrEqual(0);
    expect(togetherSheetEnd).toBeGreaterThan(togetherDisplayStart);
    expect(togetherSheet).toContain('incomingNudge: rowTogether?.incomingNudge ?? false');
    expect(togetherSheet).toContain('<FriendTogetherSheet');
    expect(togetherSheet).toContain('together={togetherDisplay}');
  });

  it('renders an unmistakable themed DEV label instead of an icon-only control', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/friends.tsx'), 'utf8');
    const buttonStart = source.indexOf('testID="friends-together-dev-open"');
    const buttonEnd = source.indexOf('</TouchableOpacity>', buttonStart);
    const devButton = source.slice(buttonStart, buttonEnd);

    expect(buttonStart).toBeGreaterThan(-1);
    // зачем (владелец 2026-09-29): DEV-кнопка на нейтральных токенах Liquid Glass, не на «брендовом» accent/зелёном.
    expect(devButton).toContain('backgroundColor: glass.buttonFill');
    expect(devButton).toContain('color: glass.text');
    expect(devButton).toMatch(/>DEV<\/FlowText>/);
  });
});

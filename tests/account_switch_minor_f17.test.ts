/**
 * F17, аудит — «мелкое» (владелец 11.11: «исправь мелкое, что не трогал»). Память и отметки, которые после смены аккаунта
 * A → B доставались следующему игроку: напоминание «Пик ждёт», сообщение о золоте, время списка друзей, отметки «позвано»,
 * веха пары, «С возвращением», кольцо историй, замок уроков, серия, приветствия. Сработал — чини логику, а не сторожа.
 */
import * as fs from 'fs';
import * as path from 'path';

import AsyncStorage from '@react-native-async-storage/async-storage';

const mockOwnerResets: Record<string, () => void> = {};
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: (name: string, reset: () => void) => { mockOwnerResets[name] = reset; } }));
const mockCancelNotification = jest.fn(async (_id: string) => undefined);
jest.mock('../app/notifications', () => ({ cancelScheduledLocalNotificationById: (id: string) => mockCancelNotification(id) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const mockDiagnostics = jest.fn(async (_event: unknown) => undefined);
jest.mock('../app/support_diagnostics', () => ({ recordSupportDiagnostic: (event: unknown) => mockDiagnostics(event) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: async () => 'b' }));

import { cancelSpireWeekRemind } from '../app/spire/spire_week_remind';
import { noteSpireGhostExperiment, resetSpireGhostAbLogForTests } from '../app/spire/spire_ghost_ab_log';
import { __resetFriendsListSyncForTests, noteFriendsListServerSnapshot, peekFriendsListSyncedAt } from '../app/friends_together/friends_list_sync';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const switchOwner = (name: string): void => {
  const reset = mockOwnerResets[name];
  if (!reset) throw new Error(`сброс при смене владельца не подключён: ${name}`);
  reset();
};
const flush = async (): Promise<void> => { for (let n = 0; n < 8; n += 1) await new Promise((resolve) => setImmediate(resolve)); };

beforeEach(async () => {
  await AsyncStorage.clear();
  mockCancelNotification.mockClear();
  mockDiagnostics.mockClear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('F17 · напоминание «Пик ждёт» не приходит следующему игроку', () => {
  it('смена владельца снимает поставленное напоминание и забывает его id', async () => {
    await AsyncStorage.setItem('spire_week_remind_id_v1', 'notif-a');
    switchOwner('spire_week_remind');
    await flush();
    expect(mockCancelNotification).toHaveBeenCalledWith('notif-a');
    expect(await AsyncStorage.getItem('spire_week_remind_id_v1')).toBeNull();
  });

  it('напоминания не было — ничего не снимаем и не падаем', async () => {
    await expect(cancelSpireWeekRemind('test')).resolves.toBe(false);
    expect(mockCancelNotification).not.toHaveBeenCalled();
  });
});

describe('F17 · время списка друзей и журнал пробы', () => {
  it('полоса «список сохранён в …» не показывает время прошлого игрока', () => {
    __resetFriendsListSyncForTests();
    noteFriendsListServerSnapshot('a', 1_700_000_000_000);
    expect(peekFriendsListSyncedAt()).toBe(1_700_000_000_000);
    switchOwner('friends_list_sync');
    expect(peekFriendsListSyncedAt()).toBeNull();
  });

  it('событие пробы «призрака» второго аккаунта в том же запуске записывается', () => {
    resetSpireGhostAbLogForTests();
    const decision = { shown: true, bucket: 'a', source: 'experiment' } as never;
    noteSpireGhostExperiment(decision);
    noteSpireGhostExperiment(decision);
    expect(mockDiagnostics).toHaveBeenCalledTimes(1);
    switchOwner('spire_ghost_ab_log');
    noteSpireGhostExperiment(decision);
    expect(mockDiagnostics).toHaveBeenCalledTimes(2);
  });
});

describe('F17 · проводка мелких сбросов (по строкам файлов)', () => {
  it('золото: сообщение показывается только игроку, чьей была ступень', () => {
    const src = read('app/spire/spire_gold_settle.ts');
    expect(src).toMatch(/function toast\(kind: 'daily_cap' \| 'not_counted', owner: string\): void \{[\s\S]{0,700}if \(current !== null && current !== owner\) \{[^\n]*reason=account_changed[^\n]*return; \}/);
    expect(src).toContain('if (toastKind) toast(toastKind, owner);');
  });

  it('сверка монет Пика: идущий проход другого игрока не возвращается как свой', () => {
    const src = read('app/spire/spire_pending_orphans.ts');
    expect(src).toContain('if (inFlight && !injected && inFlightOwner === owner) return inFlight;');
    expect(src).toContain('if (!injected && inFlight === run) { inFlight = null; inFlightOwner = null; }');
  });

  it('«позвать»: отметки дня чистятся, владелец памяти остаётся — очередь прошлого сбросит ensureOwner', () => {
    const src = read('app/friends_together/nudge_client.ts');
    expect(src).toContain("onAccountOwnerChanged('friends_nudged_today', () => { _memoryDayKey = ''; _memoryMap = {}; });");
    // Перечитывание отметок во вкладке «Друзья» (одна строка в app/(tabs)/friends.tsx) здесь не сторожим: файл в момент коммита
    // редактировался в другой сессии, строка уходит с её коммитом. Без неё отметки нового игрока появятся при следующем «позвать».
  });

  it('лимит своих наборов и замок уроков не помнят прошлого игрока', () => {
    expect(read('app/community_packs/localAuthorPacks.ts')).toContain("onAccountOwnerChanged('author_pack_count', () => { lastKnownAuthorPackCount = null; });");
    expect(read('app/lesson_premium_gate.ts')).toContain("onAccountOwnerChanged('lesson_gate_decisions', () => { lastGateDecisions.clear(); });");
  });

  it('серия: засчитывание, начатое прошлым игроком, не публикуется новому; идущие проходы не делятся', () => {
    const src = read('app/hall_of_fame_utils.ts');
    const guard = src.indexOf('if (!isSameAccountOwner(owner)) {');
    expect(guard).toBeGreaterThan(src.indexOf('const owner = markAccountOwner();'));
    expect(guard).toBeLessThan(src.indexOf('      streakTouchedDayKey = day;\n      streakSweptDayKey = day;\n      markStreakDayCounted('));
    expect(src).toMatch(/onAccountOwnerChanged\('streak_day_marks', \(\) => \{[\s\S]{0,400}streakCountInFlight = null;\s+streakPassiveInFlight = null;/);
    expect(src).toContain('if (streakCountInFlight === countRun) streakCountInFlight = null;');
    expect(src).toContain('if (streakPassiveInFlight === passiveRun) streakPassiveInFlight = null;');
  });

  it('окна и кольца: веха пары, «С возвращением», истории, «Встречайте 2.0», приветствие приглашённого — по владельцу', () => {
    const pair = read('hooks/use_pair_milestone_moment.ts');
    expect(pair).toMatch(/if \(ownerRef\.current === owner\) return;[\s\S]{0,500}busyRef\.current = false;\s+checkedRef\.current = null;\s+setMoment\(null\);/);
    const back = read('hooks/use_welcome_back_moment.ts');
    expect(back).toMatch(/if \(ownerRef\.current === owner\) return;[\s\S]{0,400}markedRef\.current = false;\s+setDecision\(null\);/);
    expect(back).toContain('}, [active, coinRank, decision, energyCurrent, energyMax, signalTick, studyTarget, owner]);');
    expect(read('components/stories/StoryAvatarSlot.tsx')).toContain('storyOwnerRef.current = storyOwner; setSeenHomeIds(new Set()); setViewer(null);');
    expect(read('components/legacy_bonus/LegacyBonusWelcomeInner.tsx')).toMatch(/if \(hostOwnerRef\.current === hostOwner\) return;[\s\S]{0,400}storyRecordedRef\.current = false;\s+setFrozen\(null\);\s+setClosing\(false\);/);
    expect(read('components/ReferralWelcomeHost.tsx')).toContain('}, [rouletteOn, welcomeOwner]);');
  });

  it('«Тебя обогнали»: раз за сессию на каждый аккаунт (A → B → A не показывает A второй раз)', () => {
    const src = read('app/spire/use_spire_position_moments.ts');
    expect(src).toContain('const overtakeShownForUids = new Set<string>();');
    expect(src).toContain('const shownThisSession = overtakeShownForUids.has(uid);');
    expect(src).toContain("if (kind === 'overtake' && uid) overtakeShownForUids.add(uid);");
  });
});

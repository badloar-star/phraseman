// ═══════════════════════════════════════════════════════════════════════════
// story_contest_win_bridge_2026_10_29.test.ts — мост «проекция доступа → история победителю в кольце».
//
// зачем (Ядро и координатор 29.10): сервер кладёт строку contest_last_win (JSON v1) копией в access_projection/current.contestLastWin; PremiumContext
// уже слушает этот документ и одной строкой передаёт поле в contest_win_store. Проверяем: разбор строки Ядра, окно показа (28 дней после итогов,
// 7 дней от первого показа), чужой аккаунт, отметки «впервые показана / просмотрена» (память сразу, диск фоном), «никогда не бросает» и что
// событие моста рисуется кадром истории победителю. Новых чтений Firestore нет — только AsyncStorage.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CONTEST_WIN_LIVE_MS, CONTEST_WIN_START_WITHIN_MS, contestWinDecision, parseContestLastWin, parseContestWinLocal, serializeContestWinLocal,
  type ContestWinInput,
} from '../modules/story_events/contest_win_story';
import {
  __resetContestWinForTests, markContestWinSeen, peekContestWin, publishContestLastWin, recordContestWinFirstShow, subscribeContestWin,
} from '../modules/story_events/contest_win_store';

const mockAccount = { stableId: 'u1' as string | null, phase: 'active' as 'active' | 'transitioning', failCapture: false };
let mockGenerationListener: (() => void) | null = null;
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => {
    if (mockAccount.failCapture) throw new Error('поколение аккаунта недоступно');
    return { generation: 1, stableId: mockAccount.stableId, phase: mockAccount.phase };
  },
  subscribeAccountGeneration: (listener: () => void) => { mockGenerationListener = listener; return () => undefined; },
}));
const mockWarn = jest.fn();
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: (...args: unknown[]) => mockWarn(...args) } }));
jest.mock('../app/achievements', () => ({ ALL_ACHIEVEMENTS: [] }));
jest.mock('../app/coin_rank_table_v1', () => ({ isValidCoinRank: () => false, coinRankRowForDisplay: () => ({ priceToReach: 0 }) }));

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const DAY = 24 * 60 * 60 * 1000;
const GRANTED = Date.UTC(2026, 11, 1, 0, 5);
/** Строка ровно как её пишет Ядро (contestWinStoryValue, functions/src/community_month_tally.ts). */
const coreRaw = (over: Readonly<Record<string, unknown>> = {}): string =>
  JSON.stringify({ v: 1, monthId: '2026-11', place: 1, plusMonths: 3, packId: 'p1', packTitle: 'B2 глаголы', hearts: 42, grantedAtMs: GRANTED, ...over });
const flush = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0); });

describe('разбор строки Ядра (ContestWinStory v1)', () => {
  it('строка Ядра → победа со всеми полями', () => {
    expect(parseContestLastWin(coreRaw())).toEqual({
      ok: true, win: { monthId: '2026-11', place: 1, plusMonths: 3, packId: 'p1', packTitle: 'B2 глаголы', hearts: 42, grantedAtMs: GRANTED },
    });
    expect(parseContestLastWin(coreRaw({ plusMonths: 0 }))).toMatchObject({ ok: true, win: { plusMonths: 0 } });
    expect(parseContestLastWin(coreRaw({ hearts: 17.9 }))).toMatchObject({ ok: true, win: { hearts: 17 } });
  });

  it('нет поля — норма (absent); битые данные — причина, а не тишина', () => {
    expect(parseContestLastWin(null)).toEqual({ ok: false, reason: 'absent' });
    expect(parseContestLastWin('{')).toMatchObject({ ok: false, reason: expect.stringMatching(/^bad_json/) });
    expect(parseContestLastWin('[1]')).toEqual({ ok: false, reason: 'not_object' });
    expect(parseContestLastWin(coreRaw({ v: 2 }))).toEqual({ ok: false, reason: 'version:2' });
    expect(parseContestLastWin(coreRaw({ monthId: '2026-13' }))).toMatchObject({ ok: false, reason: expect.stringMatching(/^month_id/) });
    expect(parseContestLastWin(coreRaw({ place: 4 }))).toEqual({ ok: false, reason: 'place:4' });
    expect(parseContestLastWin(coreRaw({ grantedAtMs: 0 }))).toEqual({ ok: false, reason: 'granted_at' });
    expect(parseContestLastWin(coreRaw({ plusMonths: -1 }))).toEqual({ ok: false, reason: 'plus_months:-1' });
    expect(parseContestLastWin('x'.repeat(5000))).toMatchObject({ ok: false, reason: 'too_long:5000' });
  });

  it('отметка на телефоне: туда и обратно; битая — null', () => {
    const local = { monthId: '2026-11', firstShownAtMs: 5, seen: true };
    expect(parseContestWinLocal(serializeContestWinLocal(local))).toEqual(local);
    expect(parseContestWinLocal('{')).toBeNull();
    expect(parseContestWinLocal(null)).toBeNull();
  });
});

describe('показывать ли историю (Ядро 29.10: 28 дней после итогов, 7 дней от первого показа)', () => {
  const base: ContestWinInput = { enabled: true, owner: 'u1', sourceUid: 'u1', raw: coreRaw(), local: null, localLoaded: true, nowMs: GRANTED + DAY };

  it('первый показ: событие contest_winner, время — сейчас, не просмотрена', () => {
    const d = contestWinDecision(base);
    expect(d).toMatchObject({ show: true, firstShow: true, event: { id: 'contest_winner:2026-11', type: 'contest_winner', atMs: GRANTED + DAY, seen: false } });
    expect(d.show && d.event.payload).toEqual({ monthId: '2026-11', place: 1, plusMonths: 3, packId: 'p1', packTitle: 'B2 глаголы', hearts: 42, grantedAtMs: GRANTED });
  });

  it('уже показана: время первого показа и отметка «просмотрена» — с телефона', () => {
    const local = { monthId: '2026-11', firstShownAtMs: GRANTED + 2 * 60 * 1000, seen: true };
    expect(contestWinDecision({ ...base, local })).toMatchObject({ show: true, firstShow: false, event: { atMs: local.firstShownAtMs, seen: true } });
  });

  it('новая победа другого месяца — снова первый показ, старая отметка не мешает', () => {
    const local = { monthId: '2026-10', firstShownAtMs: GRANTED - 30 * DAY, seen: true };
    expect(contestWinDecision({ ...base, local })).toMatchObject({ show: true, firstShow: true, event: { seen: false } });
  });

  it('окно: начать можно до 28 дней после итогов; держится 7 дней от первого показа', () => {
    expect(contestWinDecision({ ...base, nowMs: GRANTED + CONTEST_WIN_START_WITHIN_MS })).toMatchObject({ show: true });
    expect(contestWinDecision({ ...base, nowMs: GRANTED + CONTEST_WIN_START_WITHIN_MS + 1 })).toEqual({ show: false, reason: 'too_old' });
    // впервые показали на 27-й день — держим ещё 7 дней, хотя 28 дней уже прошло
    const late = { monthId: '2026-11', firstShownAtMs: GRANTED + 27 * DAY, seen: false };
    expect(contestWinDecision({ ...base, local: late, nowMs: GRANTED + 33 * DAY })).toMatchObject({ show: true, firstShow: false });
    expect(contestWinDecision({ ...base, local: late, nowMs: late.firstShownAtMs + CONTEST_WIN_LIVE_MS + 1 })).toEqual({ show: false, reason: 'expired' });
  });

  it('нет причин показывать — причина видна: флаг, аккаунт, проекция, поле, загрузка', () => {
    expect(contestWinDecision({ ...base, enabled: false })).toEqual({ show: false, reason: 'stories_off' });
    expect(contestWinDecision({ ...base, owner: null })).toEqual({ show: false, reason: 'no_owner' });
    expect(contestWinDecision({ ...base, sourceUid: null })).toEqual({ show: false, reason: 'no_projection' });
    // сменили аккаунт, а проекция ещё от прежнего — чужую победу не показываем
    expect(contestWinDecision({ ...base, sourceUid: 'u0' })).toEqual({ show: false, reason: 'other_account' });
    expect(contestWinDecision({ ...base, raw: null })).toEqual({ show: false, reason: 'absent' });
    expect(contestWinDecision({ ...base, localLoaded: false })).toEqual({ show: false, reason: 'loading' });
  });

  it('событие моста рисуется кадром истории победителю (тот же payload)', () => {
    const { storyTemplateFromEvent } = jest.requireActual<typeof import('../components/stories/templates/story_template_from_event')>('../components/stories/templates/story_template_from_event');
    const d = contestWinDecision(base);
    if (!d.show) throw new Error(`ожидали показ, причина ${d.reason}`);
    expect(storyTemplateFromEvent(d.event)).toEqual({ id: 'contest_winner', place: 1, month: 11, plusMonths: 3, packTitle: 'B2 глаголы', hearts: 42 });
  });
});

describe('contest_win_store: строка из проекции, отметки на телефоне', () => {
  beforeEach(() => {
    __resetContestWinForTests();
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    mockAccount.stableId = 'u1';
    mockAccount.phase = 'active';
    mockAccount.failCapture = false;
    mockGenerationListener = null;
    mockWarn.mockClear();
    // зачем: у заглушки AsyncStorage история вызовов общая на файл — чтение из прошлого теста не должно засчитаться этому
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  it('та же строка того же аккаунта — без повторных уведомлений (ни одной лишней перерисовки)', async () => {
    const listener = jest.fn();
    subscribeContestWin(listener);
    publishContestLastWin('u1', coreRaw());
    await flush();
    const calls = listener.mock.calls.length;
    publishContestLastWin('u1', coreRaw());
    await flush();
    expect(listener.mock.calls.length).toBe(calls);
    expect(peekContestWin()).toMatchObject({ owner: 'u1', sourceUid: 'u1', raw: coreRaw(), local: null, localLoaded: true });
  });

  it('нет победы — отметку с диска не читаем', async () => {
    publishContestLastWin('u1', undefined);
    await flush();
    expect(AsyncStorage.getItem).not.toHaveBeenCalledWith('story_contest_win_v1:u1');
    expect(peekContestWin()).toMatchObject({ sourceUid: 'u1', raw: null, localLoaded: false });
  });

  it('первый показ и просмотр: в памяти сразу, на диск — фоном; чужой id — пропуск', async () => {
    publishContestLastWin('u1', coreRaw());
    await flush();
    recordContestWinFirstShow('u1', '2026-11', 777);
    expect(peekContestWin().local).toEqual({ monthId: '2026-11', firstShownAtMs: 777, seen: false });
    expect(markContestWinSeen('contest_winner:2026-10')).toBe(false);
    expect(markContestWinSeen('contest_winner:2026-11')).toBe(true);
    expect(peekContestWin().local).toEqual({ monthId: '2026-11', firstShownAtMs: 777, seen: true });
    await flush();
    expect(parseContestWinLocal(await AsyncStorage.getItem('story_contest_win_v1:u1'))).toEqual({ monthId: '2026-11', firstShownAtMs: 777, seen: true });
  });

  it('отметка с диска возвращается после перезапуска', async () => {
    await AsyncStorage.setItem('story_contest_win_v1:u1', serializeContestWinLocal({ monthId: '2026-11', firstShownAtMs: 9, seen: true }));
    publishContestLastWin('u1', coreRaw());
    await flush();
    expect(peekContestWin()).toMatchObject({ localLoaded: true, local: { monthId: '2026-11', firstShownAtMs: 9, seen: true } });
  });

  it('смена аккаунта: строка прежнего аккаунта остаётся чужой (решение other_account)', async () => {
    publishContestLastWin('u1', coreRaw());
    await flush();
    mockAccount.stableId = 'u2';
    mockGenerationListener?.();
    const snap = peekContestWin();
    expect(snap).toMatchObject({ owner: 'u2', sourceUid: 'u1' });
    expect(contestWinDecision({ enabled: true, ...snap, nowMs: GRANTED + DAY })).toEqual({ show: false, reason: 'other_account' });
  });

  it('никогда не бросает в обработчик Plus: не строка — «поля нет», упавший подписчик и сбой внутри — только сигнал в журнал', async () => {
    expect(() => publishContestLastWin('u1', 42)).not.toThrow();
    expect(peekContestWin().raw).toBeNull();
    expect(mockWarn).toHaveBeenCalledWith('[STORY-CONTEST]', expect.stringContaining('не строка (number)'));
    const good = jest.fn();
    subscribeContestWin(() => { throw new Error('подписчик упал'); });
    subscribeContestWin(good);
    expect(() => publishContestLastWin('u1', coreRaw())).not.toThrow();
    await flush();
    expect(good).toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith('[STORY-CONTEST]', expect.stringContaining('подписчик упал'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockAccount.failCapture = true;
    expect(() => publishContestLastWin('u1', coreRaw({ hearts: 43 }))).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[STORY-CONTEST] передача из проекции не удалась: Error: поколение аккаунта недоступно'));
    warn.mockRestore();
  });
});

describe('подключение моста (код)', () => {
  it('PremiumContext передаёт поле из уже существующего обработчика снапшота проекции — один вызов, без нового state', () => {
    const src = read('components/PremiumContext.tsx');
    const calls = src.match(/publishContestLastWin\(/g) ?? [];
    expect(calls).toHaveLength(1);
    const handler = src.indexOf(".collection('access_projection').doc('current').onSnapshot(");
    const dataLine = src.indexOf('const data = snap.data ? snap.data() : undefined;', handler);
    const call = src.indexOf('publishContestLastWin(listenerStableId, data?.contestLastWin);', handler);
    expect([handler > 0, dataLine > handler, call > dataLine]).toEqual([true, true, true]);
    expect(src).not.toMatch(/useState[^\n]*contestLastWin/);
  });

  it('тип события contest_winner есть; кольцо берёт историю моста и отмечает просмотр в нём', () => {
    expect(read('modules/story_events/story_events_core.ts')).toMatch(/export type StoryEventType = [^\n]*\| 'contest_winner'/);
    const hook = read('modules/story_events/use_story_events.ts');
    expect(hook).toContain('...contestWin.stories');
    expect(hook).toContain('id.startsWith(CONTEST_WIN_ID_PREFIX)) markContestWinSeen(id)');
  });
});

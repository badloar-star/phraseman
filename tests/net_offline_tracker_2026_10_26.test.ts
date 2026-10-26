import {
  NET_UNREACHABLE_CONFIRM_MS,
  netOfflineInstant,
  trackNetOffline,
  type NetOfflineSnapshot,
  type NetOfflineTrackerDeps,
} from '../app/net_offline_step';

// зачем (владелец 26.10 «Нет сети» при живой сети; координатор — общий помощник для Главной, каталога и очереди зовов):
// подписка объявляет «нет сети» по reachable=false только через 5 с подряд, сразу — по connected=false, null = есть.

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const deps: NetOfflineTrackerDeps = {
    now: () => now,
    setTimeout: (fn, ms) => { const id = nextId++; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimeout: (id) => { timers.delete(id as number); },
  };
  const advance = (ms: number) => {
    now += ms;
    for (const [id, t] of [...timers.entries()].sort((a, b) => a[1].at - b[1].at)) {
      if (t.at <= now && timers.has(id)) { timers.delete(id); t.fn(); }
    }
  };
  return { deps, advance, pending: () => timers.size };
}

function harness() {
  const clock = fakeClock();
  let listener: ((s: NetOfflineSnapshot) => void) | null = null;
  let unsubscribed = false;
  const seen: boolean[] = [];
  const stop = trackNetOffline('test_place', (l) => { listener = l; return () => { unsubscribed = true; listener = null; }; },
    (offline) => { seen.push(offline); }, clock.deps);
  const emit = (isConnected: boolean | null, isInternetReachable: boolean | null) => listener?.({ isConnected, isInternetReachable, type: 'wifi' });
  return { clock, seen, stop, emit, isUnsubscribed: () => unsubscribed };
}

describe('trackNetOffline — общее правило «нет сети»', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('reachable=false держится 5 с — «нет сети» перепроверкой, раньше — нет', () => {
    const h = harness();
    h.emit(true, false);
    expect(h.seen).toEqual([false]);
    expect(h.clock.pending()).toBe(1);
    h.clock.advance(NET_UNREACHABLE_CONFIRM_MS - 1);
    expect(h.seen).toEqual([false]);
    h.clock.advance(1);
    expect(h.seen).toEqual([false, true]);
    expect(h.clock.pending()).toBe(0);
  });

  it('возврат до 5 с снимает таймер — «нет сети» не появляется; возврат после — уходит сразу', () => {
    const h = harness();
    h.emit(true, false);
    h.clock.advance(2_000);
    h.emit(true, true);
    expect(h.clock.pending()).toBe(0);
    h.clock.advance(10_000);
    expect(h.seen).toEqual([false, false]);
    h.emit(true, false);
    h.clock.advance(NET_UNREACHABLE_CONFIRM_MS);
    expect(h.seen[h.seen.length - 1]).toBe(true);
    h.emit(true, null);
    expect(h.seen[h.seen.length - 1]).toBe(false);
  });

  it('connected=false — сразу; null/неизвестно — сеть есть', () => {
    const h = harness();
    h.emit(false, null);
    h.emit(null, null);
    h.emit(true, null);
    expect(h.seen).toEqual([true, false, false]);
    expect(h.clock.pending()).toBe(0);
  });

  it('дребезг: провалы короче 5 с не копят время', () => {
    const h = harness();
    for (let i = 0; i < 5; i += 1) {
      h.emit(true, false);
      h.clock.advance(3_000);
      h.emit(true, true);
      h.clock.advance(1_000);
    }
    expect(h.seen.every((v) => v === false)).toBe(true);
  });

  it('отписка снимает и подписку, и таймер; поздняя перепроверка ничего не решает', () => {
    const h = harness();
    h.emit(true, false);
    h.stop();
    expect(h.isUnsubscribed()).toBe(true);
    expect(h.clock.pending()).toBe(0);
    h.clock.advance(NET_UNREACHABLE_CONFIRM_MS * 2);
    expect(h.seen).toEqual([false]);
  });

  it('разовая проверка: reachable=false само по себе — ещё не «нет сети»', () => {
    expect(netOfflineInstant({ isConnected: true, isInternetReachable: false, type: 'wifi' }).offline).toBe(false);
    expect(netOfflineInstant({ isConnected: false, isInternetReachable: false, type: 'none' }).offline).toBe(true);
    expect(netOfflineInstant({ isConnected: null, isInternetReachable: null, type: 'unknown' }).offline).toBe(false);
  });
});

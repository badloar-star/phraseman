// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
// Движок V2: колода «не повторять» (в том числе на стыке колод), серии, флаг и переключатели,
// ленивое создание плееров, пул без утечек, микро-вариация, отказ нативного слоя без исключений.
import {
  SOUND_V2_CATALOG,
  SOUND_V2_EVENT_IDS,
  type SoundV2Clip,
  type SoundV2EventId,
} from '../modules/sound_v2/catalog';
import { NoRepeatDeck, StreakBook } from '../modules/sound_v2/deck';
import {
  SOUND_V2_GAIN_JITTER_DB,
  SOUND_V2_GAIN_NOMINAL_DB,
  SOUND_V2_MAX_PLAYERS,
  SOUND_V2_RATE_JITTER,
  SoundBank,
  type SoundBankDeps,
  type SoundV2Player,
} from '../modules/sound_v2/sound_bank';

type FakePlayer = SoundV2Player & {
  clip: SoundV2Clip;
  released: boolean;
  plays: number;
  rateCalls: number[];
  finish(): void;
};

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Harness = {
  bank: SoundBank;
  players: FakePlayer[];
  played: string[];
  deps: SoundBankDeps;
  state: { flag: boolean; effects: boolean; quiet: boolean; createFails: number; asyncSeek: boolean; noStatus: boolean };
  logs: string[];
  warns: string[];
  finishAll(): void;
  advanceTime(ms: number): void;
  silence?: (reason: 'effects_disabled' | 'quiet_recording') => void;
};

function makeHarness(rng: () => number = mulberry32(1), maxPlayers = SOUND_V2_MAX_PLAYERS): Harness {
  const players: FakePlayer[] = [];
  const played: string[] = [];
  const logs: string[] = [];
  const warns: string[] = [];
  const state = { flag: true, effects: true, quiet: false, createFails: 0, asyncSeek: false, noStatus: false };
  let nowMs = 1_000;
  let timerSeq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();

  const deps: SoundBankDeps = {
    createPlayer: (clip) => {
      if (state.createFails > 0) {
        state.createFails -= 1;
        throw new Error('native player capacity');
      }
      const listeners = new Set<(s: { didJustFinish?: boolean; isLoaded?: boolean; playing?: boolean }) => void>();
      const player: FakePlayer = {
        clip,
        volume: 1,
        shouldCorrectPitch: true,
        released: false,
        plays: 0,
        rateCalls: [],
        play() {
          player.plays += 1;
          played.push(clip.file);
        },
        pause() {},
        seekTo() {
          return state.asyncSeek ? Promise.resolve() : undefined;
        },
        setPlaybackRate(rate: number) {
          player.rateCalls.push(rate);
        },
        release() {
          player.released = true;
        },
        addListener(_event, cb) {
          if (state.noStatus) return { remove() {} };
          listeners.add(cb);
          return { remove: () => listeners.delete(cb) };
        },
        finish() {
          for (const cb of [...listeners]) cb({ playing: true });
          for (const cb of [...listeners]) cb({ didJustFinish: true });
        },
      };
      players.push(player);
      return player;
    },
    isFlagEnabled: () => state.flag,
    isEffectsEnabled: () => state.effects,
    isQuiet: () => state.quiet,
    rng,
    now: () => nowMs,
    setTimer: (fn, ms) => {
      timerSeq += 1;
      timers.set(timerSeq, { at: nowMs + ms, fn });
      return timerSeq;
    },
    clearTimer: (handle) => {
      timers.delete(handle as number);
    },
    log: (m) => logs.push(m),
    warn: (m) => warns.push(m),
  };
  const harness: Harness = {
    bank: undefined as unknown as SoundBank,
    players,
    played,
    deps,
    state,
    logs,
    warns,
    finishAll: () => players.forEach((p) => p.finish()),
    advanceTime: (ms) => {
      nowMs += ms;
      for (const [id, t] of [...timers.entries()]) {
        if (t.at <= nowMs) {
          timers.delete(id);
          t.fn();
        }
      }
    },
  };
  deps.onSilenceNeeded = (listener) => {
    harness.silence = listener;
    return () => {
      harness.silence = undefined;
    };
  };
  harness.bank = new SoundBank(deps, new StreakBook(), maxPlayers);
  return harness;
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe('NoRepeatDeck', () => {
  it.each([
    ['rng=0', () => 0],
    ['rng=0.999999', () => 0.999999],
    ['rng=случайный seed 7', mulberry32(7)],
    ['rng=случайный seed 99', mulberry32(99)],
  ])('1000 вытягиваний — ни одного повтора подряд, все варианты встречаются (%s)', (_name, rng) => {
    const deck = new NoRepeatDeck(4, rng);
    const seen = new Set<number>();
    let prev = -1;
    for (let i = 0; i < 1000; i += 1) {
      const v = deck.draw();
      expect(v).not.toBe(prev);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4);
      seen.add(v);
      prev = v;
    }
    expect(seen.size).toBe(4);
  });

  it('каждая колода из 4 содержит все 4 варианта ровно по разу', () => {
    const deck = new NoRepeatDeck(4, mulberry32(3));
    for (let d = 0; d < 50; d += 1) {
      const batch = [deck.draw(), deck.draw(), deck.draw(), deck.draw()];
      expect([...batch].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('peek() обещает ровно то, что выпадет следующим, и ничего не меняет', () => {
    const deck = new NoRepeatDeck(4, mulberry32(11));
    for (let i = 0; i < 200; i += 1) {
      const promised = deck.peek();
      expect(deck.peek()).toBe(promised);
      expect(deck.draw()).toBe(promised);
    }
  });

  it('два варианта чередуются, один вариант допускает повтор (иначе некуда)', () => {
    const two = new NoRepeatDeck(2, mulberry32(5));
    let prev = -1;
    for (let i = 0; i < 100; i += 1) {
      const v = two.draw();
      expect(v).not.toBe(prev);
      prev = v;
    }
    const one = new NoRepeatDeck(1, mulberry32(5));
    expect(one.draw()).toBe(0);
    expect(one.draw()).toBe(0);
  });
});

describe('SoundBank: колода «не повторять»', () => {
  it('1000 вызовов одного события — ни одного повтора подряд, все 4 варианта встречаются', () => {
    const h = makeHarness();
    const seen = new Set<string>();
    let prev = '';
    for (let i = 0; i < 1000; i += 1) {
      const r = h.bank.playEvent('tap');
      expect(r.played).toBe(true);
      expect(r.file).not.toBe(prev);
      seen.add(r.file as string);
      prev = r.file as string;
      h.finishAll();
    }
    expect(seen.size).toBe(4);
    // и то, что реально ушло в плеер, а не только то, что вернул playEvent
    for (let i = 1; i < h.played.length; i += 1) expect(h.played[i]).not.toBe(h.played[i - 1]);
    expect(h.played).toHaveLength(1000);
  });

  it('то же для всех 36 событий и крайних источников случайности (стык колод)', () => {
    for (const rng of [() => 0, () => 0.999999, mulberry32(2026)]) {
      const h = makeHarness(rng);
      for (const id of SOUND_V2_EVENT_IDS) {
        const seen = new Set<number>();
        let prev = -1;
        for (let i = 0; i < 120; i += 1) {
          const r = h.bank.playEvent(id);
          expect(r.played).toBe(true);
          expect(r.variant).not.toBe(prev);
          seen.add(r.variant as number);
          prev = r.variant as number;
          h.finishAll();
        }
        expect(seen.size).toBe(SOUND_V2_CATALOG[id].variants.length);
      }
    }
  });

  it('колоды у событий независимы: соседнее событие не ломает чередование', () => {
    const h = makeHarness();
    const lastByEvent = new Map<string, number>();
    const ids: SoundV2EventId[] = ['tap', 'correct', 'tap', 'wrong', 'tap', 'coin', 'tap'];
    for (let i = 0; i < 700; i += 1) {
      const id = ids[i % ids.length];
      const r = h.bank.playEvent(id);
      expect(r.variant).not.toBe(lastByEvent.get(id));
      lastByEvent.set(id, r.variant as number);
      h.finishAll();
    }
  });
});

describe('SoundBank: серии', () => {
  it('растёт с advanceStreak, держится на последнем шаге и сбрасывается resetStreak', () => {
    const h = makeHarness();
    const steps: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const r = h.bank.playEvent('correct');
      expect(r.file).toMatch(new RegExp(`^correct/v[1-4]_s${r.step}\\.m4a$`));
      steps.push(r.step as number);
      h.bank.advanceStreak('correct');
      h.finishAll();
    }
    expect(steps).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 7, 7]);
    h.bank.resetStreak('correct');
    expect(h.bank.playEvent('correct').step).toBe(0);
  });

  it('playEvent без advance серию не двигает; advance:true двигает сам; явный step серию не трогает', () => {
    const h = makeHarness();
    expect(h.bank.playEvent('lightning').step).toBe(0);
    expect(h.bank.playEvent('lightning').step).toBe(0);
    expect(h.bank.playEvent('lightning', { advance: true }).step).toBe(0);
    expect(h.bank.playEvent('lightning', { advance: true }).step).toBe(1);
    expect(h.bank.playEvent('lightning', { step: 3, advance: true }).step).toBe(3);
    expect(h.bank.streaks.get('lightning')).toBe(2);
    expect(h.bank.playEvent('lightning', { step: 99 }).step).toBe(3);
    expect(h.bank.playEvent('tap', { step: 5 }).step).toBe(0);
  });

  it('кольцо дня идёт по кругу 0→1→2→0, монета держится на пятом шаге', () => {
    const h = makeHarness();
    const ring: number[] = [];
    const coin: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      ring.push(h.bank.playEvent('ring').step as number);
      h.bank.advanceStreak('ring');
      coin.push(h.bank.playEvent('coin').step as number);
      h.bank.advanceStreak('coin');
    }
    expect(ring).toEqual([0, 1, 2, 0, 1, 2, 0]);
    expect(coin).toEqual([0, 1, 2, 3, 4, 4, 4]);
  });

  it('ошибка (wrong) рвёт correct, lightning, coin, но не кольцо дня; resetStreak() без аргумента сбрасывает всё', () => {
    const h = makeHarness();
    for (let i = 0; i < 4; i += 1) {
      h.bank.advanceStreak('correct');
      h.bank.advanceStreak('lightning');
      h.bank.advanceStreak('coin');
      h.bank.advanceStreak('ring');
    }
    expect(h.bank.streaks.get('correct')).toBe(4);
    expect(h.bank.streaks.get('lightning')).toBe(3);
    expect(h.bank.streaks.get('coin')).toBe(4);
    expect(h.bank.streaks.get('ring')).toBe(1);
    expect(h.bank.playEvent('wrong').played).toBe(true);
    expect(h.bank.streaks.get('correct')).toBe(0);
    expect(h.bank.streaks.get('lightning')).toBe(0);
    expect(h.bank.streaks.get('coin')).toBe(0);
    expect(h.bank.streaks.get('ring')).toBe(1);
    h.bank.resetStreak();
    expect(h.bank.streaks.get('ring')).toBe(0);
  });

  it('несерийные события: advanceStreak ничего не меняет', () => {
    const h = makeHarness();
    expect(h.bank.advanceStreak('tap')).toBe(0);
    expect(h.bank.playEvent('tap').step).toBe(0);
  });
});

describe('SoundBank: флаг, переключатель звука, тихий режим', () => {
  it('флаг выключен — ничего не играет и ни один плеер не создаётся', () => {
    const h = makeHarness();
    h.state.flag = false;
    for (let i = 0; i < 50; i += 1) {
      const r = h.bank.playEvent('tap');
      expect(r).toEqual({ event: 'tap', played: false, reason: 'flag_off' });
    }
    expect(h.players).toHaveLength(0);
    expect(h.played).toHaveLength(0);
    expect(h.logs.some((l) => l.includes('[SOUND-V2] skip event=tap reason=flag_off'))).toBe(true);
  });

  it('причина «не играть» пишется в лог, повторы одной причины сжимаются', () => {
    const h = makeHarness();
    h.state.flag = false;
    for (let i = 0; i < 20; i += 1) h.bank.playEvent('tap');
    expect(h.logs.filter((l) => l.includes('reason=flag_off'))).toHaveLength(1);
    h.advanceTime(6000);
    h.bank.playEvent('tap');
    const lines = h.logs.filter((l) => l.includes('reason=flag_off'));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('repeated=19');
  });

  it('звук приложения выключен (uiSounds) — тишина, без плееров; включили — играет', () => {
    const h = makeHarness();
    h.state.effects = false;
    expect(h.bank.playEvent('correct')).toMatchObject({ played: false, reason: 'effects_disabled' });
    expect(h.players).toHaveLength(0);
    h.state.effects = true;
    expect(h.bank.playEvent('correct').played).toBe(true);
  });

  it('тихий режим (идёт запись) — тишина; серия при этом логически сдвигается по advance', () => {
    const h = makeHarness();
    h.state.quiet = true;
    const r = h.bank.playEvent('correct', { advance: true });
    expect(r).toMatchObject({ played: false, reason: 'quiet_recording' });
    expect(h.bank.streaks.get('correct')).toBe(1);
    expect(h.players).toHaveLength(0);
  });

  it('сигнал «замолчать» гасит играющее (pause + освобождение слота), плееры остаются в пуле', () => {
    const h = makeHarness();
    h.bank.playEvent('lesson_done');
    expect(h.silence).toBeDefined();
    const pause = jest.spyOn(h.players[0], 'pause');
    h.silence?.('quiet_recording');
    expect(pause).toHaveBeenCalledTimes(1);
    expect(h.bank.poolSize).toBe(1);
  });

  it('неизвестное событие — предупреждение и played=false, без исключения', () => {
    const h = makeHarness();
    const r = h.bank.playEvent('no_such_event' as SoundV2EventId);
    expect(r).toMatchObject({ played: false, reason: 'unknown_event' });
    expect(h.warns.some((w) => w.includes('unknown_event'))).toBe(true);
  });
});

describe('SoundBank: пул плееров и ленивая подгрузка', () => {
  it('до первого события не создаётся ни одного плеера и не подписывается на тишину', () => {
    const h = makeHarness();
    expect(h.players).toHaveLength(0);
    expect(h.silence).toBeUndefined();
    h.bank.advanceStreak('correct');
    h.bank.resetStreak('correct');
    expect(h.players).toHaveLength(0);
  });

  it('плеер создаётся при первом запросе клипа, повторный запрос того же клипа переиспользует плеер', () => {
    const h = makeHarness(() => 0);
    h.bank.playEvent('tap');
    expect(h.players).toHaveLength(1);
    h.finishAll();
    // каждый второй вызов даёт другой вариант; через 8 вызовов тот же клип вернётся и найдёт свой плеер
    for (let i = 0; i < 40; i += 1) {
      h.bank.playEvent('tap');
      h.finishAll();
    }
    expect(h.players.filter((p) => p.clip.file.startsWith('tap/')).length).toBeLessThanOrEqual(4 + 1);
  });

  it('пул ограничен: после сотен разных событий живых плееров не больше лимита, остальные освобождены (release)', () => {
    const h = makeHarness(mulberry32(42), 6);
    for (let i = 0; i < 600; i += 1) {
      h.bank.playEvent(SOUND_V2_EVENT_IDS[i % SOUND_V2_EVENT_IDS.length]);
      h.finishAll();
      h.advanceTime(400);
    }
    const alive = h.players.filter((p) => !p.released);
    expect(alive.length).toBeLessThanOrEqual(6);
    expect(h.bank.poolSize).toBe(alive.length);
    expect(h.players.filter((p) => p.released).length).toBe(h.players.length - alive.length);
  });

  it('одновременные запуски одного клипа не обрывают друг друга: занятый плеер не берётся', () => {
    const h = makeHarness(() => 0);
    h.bank.playEvent('tap'); // v1 без завершения
    expect(h.players).toHaveLength(1);
    // колода при rng=0 даёт другие варианты; принудительно запросим тот же клип через вторую пару вызовов
    for (let i = 0; i < 9; i += 1) h.bank.playEvent('tap');
    const busyAtOnce = h.players.filter((p) => p.plays > 0).length;
    expect(busyAtOnce).toBeGreaterThanOrEqual(2);
    // ни один занятый плеер не получил второй play() без завершения
    for (const p of h.players) expect(p.plays).toBeLessThanOrEqual(1);
  });

  it('dispose освобождает все плееры и гасит подписки; после него банк молчит', () => {
    const h = makeHarness();
    h.bank.playEvent('tap');
    h.bank.playEvent('correct');
    h.bank.dispose();
    expect(h.players.every((p) => p.released)).toBe(true);
    expect(h.bank.poolSize).toBe(0);
    expect(h.silence).toBeUndefined();
    expect(h.bank.playEvent('tap')).toMatchObject({ played: false, reason: 'player_unavailable' });
  });

  it('переиспользуемый плеер: сперва перемотка в ноль (в том числе асинхронная), потом play()', async () => {
    const h = makeHarness(() => 0);
    h.state.asyncSeek = true;
    // добьёмся повторного запроса одного клипа: 4 варианта по кругу
    for (let i = 0; i < 5; i += 1) {
      h.bank.playEvent('tap');
      await flush();
      h.finishAll();
    }
    const reused = h.players.find((p) => p.plays >= 2);
    expect(reused).toBeDefined();
    h.advanceTime(500); // и таймерный запасной путь не даёт второго старта
    expect(h.played.length).toBe(5);
  });

  it('прогрев: следующий вариант колоды создаётся заранее и именно он потом звучит', () => {
    const h = makeHarness(mulberry32(8));
    h.bank.playEvent('tap');
    h.finishAll();
    h.advanceTime(300); // сработал отложенный прогрев
    const warmedFiles = h.players.map((p) => p.clip.file);
    expect(warmedFiles).toHaveLength(2);
    const next = h.bank.playEvent('tap');
    expect(next.file).toBe(warmedFiles[1]);
    expect(h.players).toHaveLength(2); // новый плеер не создавался
  });
});

describe('SoundBank: микро-вариация', () => {
  it('скорость в пределах ±0,15 %, громкость в пределах −2…0 дБ, коррекция высоты выключена', () => {
    const h = makeHarness(mulberry32(77));
    const rates: number[] = [];
    const gains: number[] = [];
    for (let i = 0; i < 2000; i += 1) {
      h.bank.playEvent('tap');
      const p = h.players[h.players.length - 1];
      rates.push(p.rateCalls[p.rateCalls.length - 1]);
      gains.push(p.volume);
      h.finishAll();
    }
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    expect(maxRate).toBeLessThanOrEqual(1 + SOUND_V2_RATE_JITTER + 1e-12);
    expect(minRate).toBeGreaterThanOrEqual(1 - SOUND_V2_RATE_JITTER - 1e-12);
    expect(maxRate).toBeGreaterThan(1.001); // вариация реально есть
    expect(minRate).toBeLessThan(0.999);
    const lo = Math.pow(10, (SOUND_V2_GAIN_NOMINAL_DB - SOUND_V2_GAIN_JITTER_DB) / 20) - 1e-9;
    const hi = Math.pow(10, (SOUND_V2_GAIN_NOMINAL_DB + SOUND_V2_GAIN_JITTER_DB) / 20) + 1e-9;
    expect(Math.min(...gains)).toBeGreaterThanOrEqual(lo);
    expect(Math.max(...gains)).toBeLessThanOrEqual(Math.min(1, hi));
    expect(Math.max(...gains) - Math.min(...gains)).toBeGreaterThan(0.1);
    expect(h.players.every((p) => p.shouldCorrectPitch === false)).toBe(true);
  });
});

describe('SoundBank: отказы нативного слоя', () => {
  it('отказ createPlayer: освобождаются простаивающие и пробуем ещё раз; два отказа подряд — played=false без исключения', () => {
    const h = makeHarness();
    h.bank.playEvent('tap');
    h.finishAll();
    h.state.createFails = 1;
    const recovered = h.bank.playEvent('correct');
    expect(recovered.played).toBe(true);
    expect(h.players[0].released).toBe(true); // простаивавший плеер ушёл в release
    h.state.createFails = 2;
    const failed = h.bank.playEvent('coin');
    expect(failed).toMatchObject({ played: false, reason: 'player_unavailable' });
    expect(h.warns.filter((w) => w.includes('createPlayer')).length).toBeGreaterThanOrEqual(3);
    // и дальше живёт
    expect(h.bank.playEvent('coin').played).toBe(true);
  });

  it('play() бросает — слот освобождается, результат played=false, причина в логе', () => {
    const h = makeHarness();
    h.bank.playEvent('tap');
    h.finishAll();
    const target = h.players[0];
    jest.spyOn(target, 'play').mockImplementation(() => {
      throw new Error('boom');
    });
    // дойти до того же клипа: тянем, пока не вернётся файл первого плеера
    let hit = false;
    for (let i = 0; i < 12 && !hit; i += 1) {
      const r = h.bank.playEvent('tap');
      if (r.file === target.clip.file) {
        expect(r.played).toBe(false);
        hit = true;
      }
      h.finishAll();
    }
    expect(hit).toBe(true);
    expect(h.warns.some((w) => w.includes('play не удался'))).toBe(true);
  });

  it('watchdog: плеер не прислал конец — слот освобождается по таймеру длительности клипа', () => {
    const h = makeHarness(() => 0);
    h.state.noStatus = true;
    const r = h.bank.playEvent('tap');
    expect(r.played).toBe(true);
    h.advanceTime(10);
    h.bank.stopAll('probe');
    expect(h.logs.some((l) => l.includes('stopAll reason=probe stopped=1'))).toBe(true); // слот ещё занят
    h.bank.playEvent('tap'); // новый слот занят снова
    h.advanceTime(5000);
    expect(h.warns.some((w) => w.includes('watchdog'))).toBe(true);
    h.bank.stopAll('probe2');
    expect(h.logs.some((l) => l.includes('stopAll reason=probe2 stopped=0'))).toBe(true); // освобождён таймером
  });
});

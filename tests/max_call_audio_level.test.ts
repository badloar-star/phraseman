import {
  createAudioLevelFanout,
  orbAudioResponse,
  orbScale,
  parseAudioLevels,
  smoothRemoteAudioLevel,
  type AudioLevelSample,
} from '../app/max_call_audio_level';
import { MAX_CALL_ORB_HYBRID } from '../constants/motionHybrid';

// Тест №3 спеки MAX Voice: парсинг обоих форматов статов, null-fallback при
// отсутствии audioLevel (idle pulse), фан-аут одного тика двум подписчикам,
// извлечение RTT для гейтинга barge-in.

const ARRAY_STATS = [
  { type: 'inbound-rtp', kind: 'audio', audioLevel: 0.42 },
  { type: 'inbound-rtp', kind: 'video', audioLevel: 0.99 }, // не аудио — игнор
  { type: 'media-source', kind: 'audio', audioLevel: 0.17 },
  {
    type: 'candidate-pair',
    nominated: true,
    currentRoundTripTime: 0.123, // секунды по спеке WebRTC
  },
  { type: 'candidate-pair', nominated: false, currentRoundTripTime: 9 },
];

function toMapLikeReport(entries: Record<string, unknown>[]): unknown {
  const map = new Map<string, unknown>();
  entries.forEach((entry, i) => map.set(`stat_${i}`, entry));
  return map; // Map отдаёт forEach(value, key) — как RTCStatsReport
}

describe('max_call_audio_level', () => {
  it('smooths remote energy with a bounded asymmetric EMA and ignores mic energy for orb scale', () => {
    // Атака (сигнал вырос) быстрее спада — иначе слоги срезаются в прямую.
    expect(smoothRemoteAudioLevel(0.5, 1)).toBeCloseTo(0.775);
    // Мусор выше 1 клампится, а не пробрасывается как есть.
    expect(smoothRemoteAudioLevel(0.5, 9)).toBeCloseTo(0.775);
    // Спад медленнее атаки: хвост фразы угасает мягко.
    expect(smoothRemoteAudioLevel(0.5, 0)).toBeCloseTo(0.41);
    const attack = smoothRemoteAudioLevel(0.5, 1) - 0.5;
    const release = 0.5 - smoothRemoteAudioLevel(0.5, 0);
    expect(attack).toBeGreaterThan(release);

    expect(orbScale({ remote: 0.7, mic: 0, rttMs: null })).toBeGreaterThan(
      orbScale({ remote: 0, mic: 0.7, rttMs: null }),
    );
    expect(orbScale({ remote: null, mic: 1, rttMs: null })).toBe(1);
  });

  it('projects real speech levels into a visible orb travel, and rests at 1 in silence', () => {
    // зачем (владелец 2026-08-23): «сфера не пульсирует». Реальный audioLevel
    // речи ~0.02..0.25; линейная проекция давала ~1.5px хода на сфере 238px —
    // втрое меньше её собственного дыхания. Сторожим именно ВИДИМОСТЬ.
    let smoothed = 0;
    const scales: number[] = [];
    for (const level of [0.02, 0.12, 0.18, 0.09, 0.03, 0.15, 0.21, 0.11]) {
      smoothed = smoothRemoteAudioLevel(smoothed, level);
      scales.push(1 + orbAudioResponse(smoothed) * MAX_CALL_ORB_HYBRID.audioScaleMax);
    }
    const travelPx = (Math.max(...scales) - Math.min(...scales)) * MAX_CALL_ORB_HYBRID.size;
    // Собственное дыхание шара ~5px — речь обязана быть заметно сильнее.
    expect(travelPx).toBeGreaterThan(12);

    // Тишина возвращает сферу ровно в покой, без залипания раздутой.
    let quiet = 0.4;
    for (let i = 0; i < 30; i += 1) quiet = smoothRemoteAudioLevel(quiet, 0);
    expect(1 + orbAudioResponse(quiet) * MAX_CALL_ORB_HYBRID.audioScaleMax).toBeCloseTo(1, 2);
  });

  it('keeps the response curve bounded for garbage and extreme input', () => {
    expect(orbAudioResponse(0)).toBe(0);
    expect(orbAudioResponse(1)).toBeLessThanOrEqual(1);
    expect(orbAudioResponse(Number.NaN)).toBe(0);
    expect(orbAudioResponse(-5)).toBe(0);
  });
  describe('parseAudioLevels: оба формата статов', () => {
    it('парсит массив RTCStats-подобных объектов', () => {
      expect(parseAudioLevels(ARRAY_STATS)).toEqual({
        mic: 0.17,
        remote: 0.42,
        rttMs: 123,
      });
    });

    it('парсит Map-like отчёт (forEach) с тем же результатом', () => {
      expect(parseAudioLevels(toMapLikeReport(ARRAY_STATS))).toEqual({
        mic: 0.17,
        remote: 0.42,
        rttMs: 123,
      });
    });

    it('принимает values()-итератор без forEach', () => {
      const report = {
        values: () => ARRAY_STATS[Symbol.iterator](),
      };
      expect(parseAudioLevels(report)).toEqual({
        mic: 0.17,
        remote: 0.42,
        rttMs: 123,
      });
    });

    it('принимает mediaType вместо kind (старые сборки)', () => {
      const sample = parseAudioLevels([
        { type: 'inbound-rtp', mediaType: 'audio', audioLevel: 0.5 },
      ]);
      expect(sample.remote).toBe(0.5);
    });
  });

  describe('null-fallback (idle pulse), никогда throw', () => {
    it('отсутствие audioLevel → null-поля, не 0', () => {
      const sample = parseAudioLevels([
        { type: 'inbound-rtp', kind: 'audio' },
        { type: 'media-source', kind: 'audio' },
      ]);
      expect(sample).toEqual({ mic: null, remote: null, rttMs: null });
    });

    it('не-числовой/NaN audioLevel → null', () => {
      const sample = parseAudioLevels([
        { type: 'inbound-rtp', kind: 'audio', audioLevel: 'loud' },
        { type: 'media-source', kind: 'audio', audioLevel: NaN },
      ]);
      expect(sample.remote).toBeNull();
      expect(sample.mic).toBeNull();
    });

    it('мусорный вход любого вида не бросает', () => {
      const garbage: unknown[] = [
        undefined,
        null,
        42,
        'stats',
        {},
        { forEach: 'not a function' },
        [null, undefined, 7, 'x', { type: 123 }],
        {
          forEach: () => {
            throw new Error('broken report');
          },
        },
      ];
      for (const input of garbage) {
        expect(() => parseAudioLevels(input)).not.toThrow();
        expect(parseAudioLevels(input)).toEqual({
          mic: null,
          remote: null,
          rttMs: null,
        });
      }
    });

    it('audioLevel вне 0..1 клампится, а не пробрасывается как есть', () => {
      const sample = parseAudioLevels([
        { type: 'inbound-rtp', kind: 'audio', audioLevel: 3.5 },
        { type: 'media-source', kind: 'audio', audioLevel: -1 },
      ]);
      expect(sample.remote).toBe(1);
      expect(sample.mic).toBe(0);
    });
  });

  describe('RTT-извлечение', () => {
    it('берёт только nominated/selected пару и переводит секунды в мс', () => {
      expect(
        parseAudioLevels([
          { type: 'candidate-pair', nominated: false, currentRoundTripTime: 5 },
          { type: 'candidate-pair', selected: true, currentRoundTripTime: 0.25 },
        ]).rttMs,
      ).toBe(250);
    });

    it('пара без валидного currentRoundTripTime → rttMs null', () => {
      expect(
        parseAudioLevels([{ type: 'candidate-pair', nominated: true }]).rttMs,
      ).toBeNull();
      expect(
        parseAudioLevels([
          { type: 'candidate-pair', nominated: true, currentRoundTripTime: -1 },
        ]).rttMs,
      ).toBeNull();
    });
  });

  describe('createAudioLevelFanout', () => {
    const TICK: AudioLevelSample = { mic: 0.2, remote: 0.6, rttMs: 90 };

    it('один push синхронно доставляет тик двум подписчикам', () => {
      const fanout = createAudioLevelFanout();
      const equalizer: AudioLevelSample[] = [];
      const halo: AudioLevelSample[] = [];
      fanout.subscribe((s) => equalizer.push(s));
      fanout.subscribe((s) => halo.push(s));

      fanout.push(TICK);

      // Синхронность: оба получили сэмпл ещё до выхода из push.
      expect(equalizer).toEqual([TICK]);
      expect(halo).toEqual([TICK]);
    });

    it('исключение в одном подписчике не ломает остальных', () => {
      const fanout = createAudioLevelFanout();
      const received: AudioLevelSample[] = [];
      fanout.subscribe(() => {
        throw new Error('halo crashed');
      });
      fanout.subscribe((s) => received.push(s));

      expect(() => fanout.push(TICK)).not.toThrow();
      expect(received).toEqual([TICK]);
    });

    it('отписка прекращает доставку, повторная отписка — no-op', () => {
      const fanout = createAudioLevelFanout();
      const received: AudioLevelSample[] = [];
      const unsubscribe = fanout.subscribe((s) => received.push(s));

      fanout.push(TICK);
      unsubscribe();
      unsubscribe(); // идемпотентно
      fanout.push({ mic: null, remote: null, rttMs: null });

      expect(received).toEqual([TICK]);
    });
  });
});

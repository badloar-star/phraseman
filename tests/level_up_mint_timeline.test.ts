// зачем (PM-077, D49): церемония повышения уровня «Монетный двор» перенесена из
// утверждённого HTML-прототипа. Тест стережёт три вещи:
// 1) сцена приходит ровно в финальное состояние (монета новая, анфас, текст и кнопка видны);
// 2) короткая версия для «уменьшения движения» не двигает монету и короче полной;
// 3) тайминги приложения совпадают с эталоном variant-b.html, который утвердил владелец.
import fs from 'fs';
import path from 'path';
import {
  MINT_TIMELINE,
  MINT_TIMELINE_REDUCED,
  buildMintSparks,
  crossedCues,
  cubicBezier,
  mintButtonAtMs,
  mintSkipDurationMs,
  mintTotalMs,
  sampleMintFrame,
  sampleSpark,
} from '../components/level_up/level_up_mint_timeline';

const T = MINT_TIMELINE;

describe('cubicBezier', () => {
  it('совпадает с линейной кривой для cubic-bezier(0,0,1,1)', () => {
    for (const x of [0, 0.1, 0.33, 0.5, 0.77, 1]) {
      expect(cubicBezier([0, 0, 1, 1], x)).toBeCloseTo(x, 4);
    }
  });

  it('держит края и монотонен для кривых таймлайна', () => {
    const curves = [T.fade.ease, T.flip.ease, T.land.ease, T.title.ease, T.rise.easeUp];
    for (const c of curves) {
      expect(cubicBezier(c, 0)).toBe(0);
      expect(cubicBezier(c, 1)).toBe(1);
      let prev = -1;
      for (let i = 0; i <= 50; i++) {
        const v = cubicBezier(c, i / 50);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-4);
        prev = v;
      }
    }
  });
});

describe('sampleMintFrame · полная версия', () => {
  it('стартует с тёмного экрана и монеты под полом', () => {
    const f = sampleMintFrame(0, false);
    expect(f.scene).toBe(0);
    expect(f.coinY).toBeGreaterThan(0.5); // центр ниже линии пола — монета скрыта щелью
    expect(f.flipDeg).toBe(0);
    expect(f.newFaceOpacity).toBe(0);
    expect(f.title).toBe(0);
    expect(f.button).toBe(0);
  });

  it('заканчивается новой монетой анфас, без вспышек, с текстом и кнопкой', () => {
    const f = sampleMintFrame(T.total, false);
    expect(f.scene).toBe(1);
    expect(f.coinY).toBeCloseTo(T.rise.to, 5);
    expect(f.flipDeg).toBe(180);
    expect(f.newFaceOpacity).toBe(1);
    expect(f.coinScale).toBeCloseTo(1, 5);
    expect(f.flash).toBe(0);
    expect(f.ringOpacity).toBe(0);
    expect(f.shakeX).toBe(0);
    expect(f.shakeY).toBe(0);
    expect(f.title).toBe(1);
    expect(f.sub).toBe(1);
    expect(f.button).toBe(1);
  });

  it('подъём перелетает выше точки покоя и садится обратно', () => {
    let minY = Infinity;
    for (let t = T.rise.at; t <= T.rise.at + T.rise.dur; t += 5) {
      minY = Math.min(minY, sampleMintFrame(t, false).coinY);
    }
    expect(minY).toBeLessThan(T.rise.to - 0.03);
    expect(sampleMintFrame(T.rise.at + T.rise.dur, false).coinY).toBeCloseTo(T.rise.to, 3);
  });

  it('новая монета появляется ровно после ребра (90°), не раньше', () => {
    for (let t = T.flip.at; t <= T.flip.at + T.flip.dur; t += 2) {
      const f = sampleMintFrame(t, false);
      if (f.flipDeg < 89.9) expect(f.newFaceOpacity).toBe(0);
      if (f.flipDeg > 90.1) expect(f.newFaceOpacity).toBe(1);
    }
  });

  it('вспышка, удар камеры и волна случаются в момент чеканки', () => {
    const before = sampleMintFrame(T.land.at - 1, false);
    expect(before.flash).toBe(0);
    expect(before.ringOpacity).toBe(0);
    // Кривая применяется ко всему шагу (как easing у WAAPI в эталоне), поэтому пик ищем по окну.
    let flashPeak = 0;
    let ringPeak = 0;
    for (let t = T.land.at; t <= T.land.at + 400; t += 5) {
      const f = sampleMintFrame(t, false);
      flashPeak = Math.max(flashPeak, f.flash);
      ringPeak = Math.max(ringPeak, f.ringOpacity);
    }
    expect(flashPeak).toBeGreaterThan(0.95);
    expect(ringPeak).toBeGreaterThan(0.7);
    expect(Math.abs(sampleMintFrame(T.shake.at + T.shake.dur * 0.2, false).shakeY)).toBeGreaterThan(1);
  });

  it('порядок шагов: подъём → флип → чеканка → название → кнопка → конец часов', () => {
    expect(T.rise.at).toBeGreaterThanOrEqual(T.fade.at);
    expect(T.flip.at).toBeGreaterThanOrEqual(T.breathe.at + T.breathe.dur - 20);
    expect(T.land.at).toBe(T.flip.at + T.flip.dur);
    expect(T.title.at).toBeGreaterThan(T.land.at);
    expect(T.button.at).toBeGreaterThan(T.title.at);
    expect(T.button.at + T.button.dur).toBeLessThanOrEqual(T.total);
  });
});

describe('sampleMintFrame · уменьшение движения', () => {
  it('короче полной версии и не двигает монету', () => {
    expect(mintTotalMs(true)).toBeLessThan(mintTotalMs(false));
    for (let t = 0; t <= MINT_TIMELINE_REDUCED.total; t += 50) {
      const f = sampleMintFrame(t, true);
      expect(f.coinY).toBe(T.rise.to);
      expect(f.flipDeg).toBe(0);
      expect(f.coinScale).toBe(1);
      expect(f.shakeX).toBe(0);
      expect(f.flash).toBe(0);
    }
  });

  it('меняет монету кроссфейдом и доходит до кнопки', () => {
    expect(sampleMintFrame(0, true).newFaceOpacity).toBe(0);
    const end = sampleMintFrame(MINT_TIMELINE_REDUCED.total, true);
    expect(end.newFaceOpacity).toBe(1);
    expect(end.title).toBe(1);
    expect(end.button).toBe(1);
    expect(mintButtonAtMs(true)).toBeLessThan(MINT_TIMELINE_REDUCED.total);
  });
});

describe('досмотр по тапу и метки звука', () => {
  it('досмотр в 6 раз быстрее остатка и не уходит в минус', () => {
    expect(mintSkipDurationMs(500, false)).toBeCloseTo((T.total - 500) / 6, 5);
    expect(mintSkipDurationMs(T.total + 100, false)).toBe(0);
  });

  it('каждая метка срабатывает ровно один раз при покадровом проходе', () => {
    const seen: string[] = [];
    let prev = -1;
    for (let t = 0; t <= T.total; t += 16.7) {
      seen.push(...crossedCues(prev, t, false));
      prev = t;
    }
    seen.push(...crossedCues(prev, T.total, false));
    expect(seen).toEqual(['drop', 'riser', 'flip', 'mint', 'shimmer']);
  });

  it('при досмотре одним скачком метки не теряются', () => {
    expect(crossedCues(-1, T.total, false)).toEqual(['drop', 'riser', 'flip', 'mint', 'shimmer']);
    expect(crossedCues(-1, MINT_TIMELINE_REDUCED.total, true)).toEqual(['drop', 'mint', 'shimmer']);
  });

  it('удар «mint» стоит внутри чеканки, «flip» — внутри оборота', () => {
    const mint = T.cues.find((c) => c.cue === 'mint')!;
    const flip = T.cues.find((c) => c.cue === 'flip')!;
    expect(mint.at).toBeGreaterThanOrEqual(T.land.at);
    expect(mint.at).toBeLessThan(T.land.at + T.land.dur);
    expect(flip.at).toBeGreaterThan(T.flip.at);
    expect(flip.at).toBeLessThan(T.flip.at + T.flip.dur);
  });
});

describe('искры', () => {
  it('детерминированы по seed и меняются от показа к показу', () => {
    expect(buildMintSparks(7)).toEqual(buildMintSparks(7));
    expect(buildMintSparks(7)).not.toEqual(buildMintSparks(8));
    expect(buildMintSparks(1)).toHaveLength(T.sparks.count);
  });

  it('невидимы до вылета и после угасания', () => {
    for (const s of buildMintSparks(3)) {
      expect(s.delay).toBeGreaterThanOrEqual(T.sparks.at);
      expect(sampleSpark(s, s.delay - 1).opacity).toBe(0);
      expect(sampleSpark(s, s.delay + s.dur + 1).opacity).toBe(0);
      let peak = 0;
      for (let t = s.delay; t <= s.delay + s.dur; t += 5) peak = Math.max(peak, sampleSpark(s, t).opacity);
      expect(peak).toBeGreaterThan(0.9);
    }
  });
});

describe('совпадение с утверждённым эталоном variant-b.html', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'docs', 'design', 'level-up-animation', 'variant-b.html'), 'utf8');
  const start = html.indexOf('const TIMELINE = {');
  const block = html.slice(start, html.indexOf('};', start));

  const read = (key: string): { at: number; dur: number } => {
    const m = new RegExp(`\\b${key}:\\s*\\{\\s*at:\\s*(\\d+),\\s*dur:\\s*(\\d+)`).exec(block);
    if (!m) throw new Error(`в эталоне нет шага ${key}`);
    return { at: Number(m[1]), dur: Number(m[2]) };
  };

  it.each(['fade', 'rise', 'breathe', 'flip', 'land', 'title', 'sub', 'button'] as const)('шаг %s', (key) => {
    const ref = read(key);
    expect({ at: T[key].at, dur: T[key].dur }).toEqual(ref);
  });

  it('общая длина часов', () => {
    const m = /\btotal:\s*(\d+)/.exec(block);
    expect(Number(m?.[1])).toBe(T.total);
  });
});

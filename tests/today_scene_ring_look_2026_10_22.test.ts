// зачем (закон владельца 22.10: «КРУЖОЧКИ ДОЛЖНЫ БЫТЬ СТРОГО В ЦВЕТАХ ТЕМЫ!! ОТТЕНКИ ТЕМЫ КАЖДОЙ»): кольца «Сегодня» — только из токенов
// темы (b06c6a399). Кольца-герой — todayRing + дорожка todayRingTrack; ✓ «Заданий дня» и мини-кольца «Недели» на карточке темы читаются
// лесенкой 4,4 / 3,6 / 3 во всех темах и оформлениях, в тёмных — те же цвета, что на сцене, в светлых различимы светлотой.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { homeSceneOklchOf, homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { TODAY_RING_ON_CARD_MIN, todayRingOnCard, todayRingsOnCard, todaySceneRingLook } from '../components/home/v2/today_scene/today_scene_ring_look';
import { readSource } from './helpers/read_source';

const rgbOfHex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];

describe('кольца «Сегодня» в оттенках темы', () => {
  it('кольца-герой — токены темы: три оттенка акцента, дорожка — свой токен, точка начала у пустого кольца', () => {
    const tok = homeSceneTokensForTheme('marine', 'dark');
    const look = todaySceneRingLook(tok);
    expect(look.colors).toEqual(tok.todayRing);
    expect(look.trackColor).toBe(tok.todayRingTrack);
    expect([look.trackOpacity, look.zeroDot]).toEqual([1, true]);
    expect(Object.isFrozen(look)).toBe(true);
  });

  it('на карточке темы: мини-кольца и ✓ проходят лесенку во всех темах; в тёмных — как на сцене; в светлых различимы светлотой', () => {
    const misses: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        const tok = homeSceneTokensForTheme(id, appearance);
        const card = liquidGlassTokens(id, { level: 'max', appearance });
        const tag = `${id}:${appearance}`;
        const on = todayRingsOnCard(tok.todayRing, card);
        on.forEach((c, i) => {
          const ratio = contrastRatio(c, card.opaqueCard);
          if (ratio < TODAY_RING_ON_CARD_MIN[i]!) misses.push(`${tag} · кольцо ${i + 1}: ${ratio.toFixed(2)} < ${TODAY_RING_ON_CARD_MIN[i]}`);
        });
        const tick = todayRingOnCard(tok.todayRingDone, card, TODAY_RING_ON_CARD_MIN[0]);
        if (contrastRatio(tick, card.opaqueCard) < 3) misses.push(`${tag} · ✓ ниже 3:1`);
        if (tick.toLowerCase() !== on[0].toLowerCase()) misses.push(`${tag} · ✓ не совпадает с первым мини-кольцом`);
        if (appearance === 'dark' && on.some((c, i) => c.toLowerCase() !== tok.todayRing[i]!.toLowerCase())) misses.push(`${tag} · тёмная тема: цвет на карточке не как на сцене`);
        const L = on.map((c) => homeSceneOklchOf(rgbOfHex(c))[0]);
        if (Math.abs(L[0]! - L[1]!) < 0.02 || Math.abs(L[1]! - L[2]!) < 0.02) misses.push(`${tag} · кольца неразличимы: ${L.map((x) => x.toFixed(2)).join('/')}`);
      }
    }
    expect(LIQUID_GLASS_THEME_IDS.length).toBeGreaterThanOrEqual(20);
    expect(misses.slice(0, 12)).toEqual([]);
  });

  it('проводка: сцена, панель и «Неделя» берут цвета отсюда; цветов эталона и своего персика нет', () => {
    const view = readSource('components/home/v2/today_scene/TodaySceneView.tsx');
    const week = readSource('components/home/v2/today_scene/TodayWeekCard.tsx');
    expect(view).toContain('const ringLook = useMemo(() => todaySceneRingLook(tokens), [tokens]);');
    expect(view.match(/look=\{ringLook\}/g)).toHaveLength(2);
    expect(view).toContain('color={doneTick}');
    expect(view).toContain('const warmTone = homeSceneWarmTone(card.accent).flame;');
    expect(view).toContain('<Text testID="today-scene-warm" style={[s.warm, { color: warmTone }]}>');
    expect(week).toContain('<MiniRings day={cell.day} colors={ringColors} />');
    expect(week).not.toContain("from './TodaySceneView'");
    for (const src of [view, week]) expect(src).not.toMatch(/#FF6B5B|#3DD6A3|#55A8FF|#FFD9D0|#FFD0C4/i);
  });
});

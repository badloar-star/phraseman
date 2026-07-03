/**
 * Контракт карточек-подсказок главной (app/home_feature_tips.ts):
 * 6 наборов текстов по счётчику повторов, стабильные заголовки/иконки,
 * финальный набор честно предупреждает об исчезновении кнопки в настройках.
 */
import {
    buildHomeFeatureTips,
    clampHomeFeatureTipIndex,
    clampHomeFeatureTipReplayCount,
    HOME_FEATURE_TIPS_MAX_REPLAYS,
} from '../app/home_feature_tips';

const TIP_COUNT = 15;
const ALL_SETS = [0, 1, 2, 3, 4, 5] as const;

describe('home_feature_tips', () => {
    it('каждый набор содержит все 15 карточек с заголовком, текстом и иконкой', () => {
        for (const set of ALL_SETS) {
            const tips = buildHomeFeatureTips('ru', set);
            expect(tips).toHaveLength(TIP_COUNT);
            for (const tip of tips) {
                expect(tip.title.trim().length).toBeGreaterThan(0);
                expect(tip.body.trim().length).toBeGreaterThan(0);
                expect(tip.icon).toBeTruthy();
            }
        }
    });

    it('заголовки и иконки одинаковы во всех наборах, тексты — уникальны по показам', () => {
        const base = buildHomeFeatureTips('ru', 0);
        for (let i = 0; i < TIP_COUNT; i++) {
            const bodies = new Set<string>();
            for (const set of ALL_SETS) {
                const tip = buildHomeFeatureTips('ru', set)[i];
                expect(tip.title).toBe(base[i].title);
                expect(tip.icon).toBe(base[i].icon);
                bodies.add(tip.body);
            }
            expect(bodies.size).toBe(ALL_SETS.length);
        }
    });

    it('счётчик повторов клампится в диапазон наборов', () => {
        expect(clampHomeFeatureTipReplayCount(-1)).toBe(0);
        expect(clampHomeFeatureTipReplayCount(Number.NaN)).toBe(0);
        expect(clampHomeFeatureTipReplayCount(3.7)).toBe(3);
        expect(clampHomeFeatureTipReplayCount(99)).toBe(HOME_FEATURE_TIPS_MAX_REPLAYS);
        // За пределами диапазона показываем финальный набор, а не падаем.
        expect(buildHomeFeatureTips('ru', 99)).toEqual(buildHomeFeatureTips('ru', HOME_FEATURE_TIPS_MAX_REPLAYS));
    });

    it('финальный набор предупреждает об исчезновении кнопки (первая и последняя карточки)', () => {
        const finalTips = buildHomeFeatureTips('ru', HOME_FEATURE_TIPS_MAX_REPLAYS);
        expect(finalTips[0].body).toContain('исчезнет');
        expect(finalTips[TIP_COUNT - 1].body).toContain('исчезнет');
    });

    it('индекс карточки клампится в границы списка', () => {
        expect(clampHomeFeatureTipIndex(-2, TIP_COUNT)).toBe(0);
        expect(clampHomeFeatureTipIndex(4.9, TIP_COUNT)).toBe(4);
        expect(clampHomeFeatureTipIndex(200, TIP_COUNT)).toBe(TIP_COUNT - 1);
        expect(clampHomeFeatureTipIndex(3, 0)).toBe(0);
    });
});

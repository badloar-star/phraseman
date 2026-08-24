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

const TIP_COUNT = { ru: 9, uk: 10 } as const;
const ALL_SETS = [0, 1, 2, 3, 4, 5] as const;

describe('home_feature_tips', () => {
    it('не возвращает удалённый раздел «Ошибки» на главную через подсказки', () => {
        for (const lang of ['ru', 'uk'] as const) {
            for (const set of ALL_SETS) {
                const tips = buildHomeFeatureTips(lang, set);
                expect(tips.some((tip) => tip.title === 'Ошибки' || tip.title === 'Помилки')).toBe(false);
                expect(tips.some((tip) => /только голос|лише голос/i.test(tip.body))).toBe(false);
            }
        }
    });

    it('каждый набор содержит все карточки языка с заголовком, текстом и иконкой', () => {
        for (const lang of ['ru', 'uk'] as const) {
            for (const set of ALL_SETS) {
                const tips = buildHomeFeatureTips(lang, set);
                expect(tips).toHaveLength(TIP_COUNT[lang]);
                for (const tip of tips) {
                    expect(tip.title.trim().length).toBeGreaterThan(0);
                    expect(tip.body.trim().length).toBeGreaterThan(0);
                    expect(tip.icon).toBeTruthy();
                }
            }
        }
    });

    it('заголовки и иконки одинаковы во всех наборах, тексты — уникальны по показам', () => {
        for (const lang of ['ru', 'uk'] as const) {
            const base = buildHomeFeatureTips(lang, 0);
            for (let i = 0; i < TIP_COUNT[lang]; i++) {
                const bodies = new Set<string>();
                for (const set of ALL_SETS) {
                    const tip = buildHomeFeatureTips(lang, set)[i];
                    expect(tip.title).toBe(base[i].title);
                    expect(tip.icon).toBe(base[i].icon);
                    bodies.add(tip.body);
                }
                expect(bodies.size).toBe(ALL_SETS.length);
            }
        }
    });

    it('для украинского интерфейса все карточки и все повторы имеют собственный текст', () => {
        for (const set of ALL_SETS) {
            const ruTips = buildHomeFeatureTips('ru', set);
            const ukTips = buildHomeFeatureTips('uk', set);

            expect(ukTips).toHaveLength(TIP_COUNT.uk);
            expect(ruTips).toHaveLength(TIP_COUNT.ru);
            expect(ukTips.every((tip) => tip.body.trim().length > 0)).toBe(true);
        }

        expect(buildHomeFeatureTips('uk', 0)[1]).toMatchObject({
            title: 'Статистика',
            body: 'Тут видно, як у тебе насправді йдуть справи: що вже виходить, що варто повторити і чому «я нічого не зробив» інколи виявляється неправдою.',
        });
    });

    it('украинські тексти так само змінюються між повторами', () => {
        for (let i = 0; i < TIP_COUNT.uk; i++) {
            const bodies = new Set(ALL_SETS.map((set) => buildHomeFeatureTips('uk', set)[i].body));
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

    it('финальный набор предупреждает об исчезновении кнопки', () => {
        const finalTips = buildHomeFeatureTips('ru', HOME_FEATURE_TIPS_MAX_REPLAYS);
        expect(finalTips[0].body).toContain('исчезнет');

        const finalUkTips = buildHomeFeatureTips('uk', HOME_FEATURE_TIPS_MAX_REPLAYS);
        expect(finalUkTips[0].body).toContain('зникне');
        expect(finalUkTips[TIP_COUNT.uk - 1].body).toContain('зникне');
    });

    it('индекс карточки клампится в границы списка', () => {
        expect(clampHomeFeatureTipIndex(-2, TIP_COUNT.ru)).toBe(0);
        expect(clampHomeFeatureTipIndex(4.9, TIP_COUNT.ru)).toBe(4);
        expect(clampHomeFeatureTipIndex(200, TIP_COUNT.ru)).toBe(TIP_COUNT.ru - 1);
        expect(clampHomeFeatureTipIndex(3, 0)).toBe(0);
    });
});

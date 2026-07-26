"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_plan_1 = require("./generation_plan");
describe('legacy content generation plan identity', () => {
    it('canonicalizes related legacy checkboxes once in stable release order', () => {
        expect((0, generation_plan_1.canonicalizeFactorySurfaces)(['vocabulary', 'lessons', 'drills', 'arena_questions', 'quizzes', 'cards'])).toEqual([
            'lesson', 'arena', 'quiz', 'flashcard',
        ]);
    });
    it('uses requested lesson IDs and canonical surfaces in an order-independent fingerprint', () => {
        const first = (0, generation_plan_1.generationPlanFingerprint)([2, 1], ['lessons', 'vocabulary', 'quizzes']);
        const same = (0, generation_plan_1.generationPlanFingerprint)([1, 2], ['quizzes', 'drills']);
        const changedLessons = (0, generation_plan_1.generationPlanFingerprint)([1, 3], ['quizzes', 'drills']);
        const changedSurfaces = (0, generation_plan_1.generationPlanFingerprint)([1, 2], ['quizzes', 'cards']);
        expect(first).toBe(same);
        expect(changedLessons).not.toBe(first);
        expect(changedSurfaces).not.toBe(first);
    });
});
describe('V2 generation stage plan', () => {
    it('creates the exact pilot cardinality and terminal season QA', () => {
        const plan = (0, generation_plan_1.buildV2SeasonPlan)({
            scope: 'full_season',
            seasonId: 'season-01',
            episodeIds: Array.from({ length: 32 }, (_, index) => `episode-${index + 1}`),
        });
        expect(plan.filter((stage) => stage.kind === 'v2_episode_outline')).toHaveLength(32);
        expect(plan.filter((stage) => stage.kind === 'v2_season_outline')).toHaveLength(1);
        expect(plan.filter((stage) => stage.kind === 'v2_season_qa')).toHaveLength(1);
        expect(plan.at(-1)?.dependsOn).toHaveLength(32);
    });
    it('keeps optional dialogue and Speaking Club branches recipe-aware', () => {
        const withBranches = (0, generation_plan_1.buildV2EpisodeSubgraph)({ episodeId: 'e1', dialogue: true, speakingClub: true }, 's1');
        const withoutBranches = (0, generation_plan_1.buildV2EpisodeSubgraph)({ episodeId: 'e2' }, 's1');
        expect(withBranches.filter((stage) => stage.kind === 'v2_dialogue_script')).toHaveLength(1);
        expect(withBranches.filter((stage) => stage.kind === 'v2_speaking_mission')).toHaveLength(1);
        expect(withBranches.find((stage) => stage.kind === 'v2_activity_instances')?.dependsOn).toEqual(expect.arrayContaining([
            'v2_dialogue_script:s1:e1',
            'v2_speaking_mission:s1:e1',
        ]));
        expect(withoutBranches.some((stage) => stage.kind === 'v2_dialogue_script')).toBe(false);
        expect(withoutBranches.some((stage) => stage.kind === 'v2_speaking_mission')).toBe(false);
    });
    it('rejects wrong scope cardinality and duplicate episode IDs', () => {
        expect(() => (0, generation_plan_1.buildV2SeasonPlan)({ scope: 'chapter_internal', seasonId: 's', episodeIds: ['e1'] })).toThrow('v2_episode_count_expected_8');
        expect(() => (0, generation_plan_1.buildV2SeasonPlan)({ scope: 'vertical_slice', seasonId: 's', episodeIds: ['e1', 'e1'] })).toThrow('v2_episode_count_expected_1');
        expect(() => (0, generation_plan_1.buildV2SeasonPlan)({ scope: 'vertical_slice', seasonId: 's', episodeIds: ['e1'], recipes: [{ episodeId: 'e1' }, { episodeId: 'e1' }] })).toThrow('v2_recipe_episode_ids_must_be_unique');
    });
    // зачем: пакет E1 не имеет права добавить 14-ю стадию — профиль языка это ref,
    // а не стадия; фиксируем полный набор видов стадий как ровно 13 существующих.
    it('keeps the stage-kind universe at exactly the thirteen pre-existing kinds', () => {
        const plan = (0, generation_plan_1.buildV2SeasonPlan)({
            seasonId: 'season-13',
            scope: 'full_season',
            episodeIds: Array.from({ length: 32 }, (_, index) => `episode-${String(index + 1).padStart(2, '0')}`),
            recipes: [{ episodeId: 'episode-01', dialogue: true, speakingClub: true }],
        });
        const kinds = new Set(plan.map((stage) => stage.kind));
        expect([...kinds].sort()).toEqual([
            'v2_activity_graph',
            'v2_activity_instances',
            'v2_asset_manifest',
            'v2_dialogue_script',
            'v2_episode_bundle',
            'v2_episode_outline',
            'v2_localization',
            'v2_preview_receipt',
            'v2_scene_set',
            'v2_season_outline',
            'v2_season_qa',
            'v2_speaking_mission',
            'v2_voice_targets',
        ]);
    });
});
//# sourceMappingURL=generation_plan.test.js.map
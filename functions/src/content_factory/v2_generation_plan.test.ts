import {
  buildV2EpisodeSubgraph,
  buildV2SeasonPlan,
} from './v2_generation_plan';

describe('legacy V2 generation stage plan', () => {
  it('preserves the existing full-season cardinality and terminal season QA', () => {
    const plan = buildV2SeasonPlan({
      scope: 'full_season',
      seasonId: 'season-01',
      episodeIds: Array.from({ length: 32 }, (_, index) => `episode-${index + 1}`),
    });
    expect(plan.filter((stage) => stage.kind === 'v2_episode_outline')).toHaveLength(32);
    expect(plan.filter((stage) => stage.kind === 'v2_season_outline')).toHaveLength(1);
    expect(plan.filter((stage) => stage.kind === 'v2_season_qa')).toHaveLength(1);
    expect(plan.at(-1)?.dependsOn).toHaveLength(32);
  });

  it('keeps the existing optional dialogue branch unchanged', () => {
    const withBranches = buildV2EpisodeSubgraph({ episodeId: 'e1', dialogue: true }, 's1');
    const withoutBranches = buildV2EpisodeSubgraph({ episodeId: 'e2' }, 's1');
    expect(withBranches.filter((stage) => stage.kind === 'v2_dialogue_script')).toHaveLength(1);
    expect(withBranches.find((stage) => stage.kind === 'v2_activity_instances')?.dependsOn).toEqual(expect.arrayContaining([
      'v2_dialogue_script:s1:e1',
    ]));
    expect(withoutBranches.some((stage) => stage.kind === 'v2_dialogue_script')).toBe(false);
  });

  it('rejects wrong scope cardinality and duplicate episode IDs', () => {
    expect(() => buildV2SeasonPlan({ scope: 'chapter_internal', seasonId: 's', episodeIds: ['e1'] })).toThrow('v2_episode_count_expected_8');
    expect(() => buildV2SeasonPlan({ scope: 'vertical_slice', seasonId: 's', episodeIds: ['e1', 'e1'] })).toThrow('v2_episode_count_expected_1');
    expect(() => buildV2SeasonPlan({ scope: 'vertical_slice', seasonId: 's', episodeIds: ['e1'], recipes: [{ episodeId: 'e1' }, { episodeId: 'e1' }] })).toThrow('v2_recipe_episode_ids_must_be_unique');
  });

  it('remains the historical twelve-kind aggregate-localization graph', () => {
    const plan = buildV2SeasonPlan({
      seasonId: 'season-legacy',
      scope: 'full_season',
      episodeIds: Array.from({ length: 32 }, (_, index) => `episode-${String(index + 1).padStart(2, '0')}`),
      recipes: [{ episodeId: 'episode-01', dialogue: true }],
    });
    expect(new Set(plan.map((stage) => stage.kind))).toEqual(new Set([
      'v2_season_outline', 'v2_episode_outline', 'v2_scene_set', 'v2_dialogue_script',
      'v2_voice_targets', 'v2_activity_instances', 'v2_activity_graph', 'v2_asset_manifest',
      'v2_localization', 'v2_preview_receipt', 'v2_episode_bundle', 'v2_season_qa',
    ]));
    expect(plan.filter((stage) => stage.kind === 'v2_localization')).toHaveLength(32);
  });

  it('freezes legacy 1/8/32 totals in both recipe modes', () => {
    const count = (scope: 'vertical_slice' | 'chapter_internal' | 'full_season', episodes: number, dialogue: boolean) => buildV2SeasonPlan({
      scope,
      seasonId: `legacy-${episodes}-${dialogue}`,
      episodeIds: Array.from({ length: episodes }, (_, index) => `e${index + 1}`),
      recipes: dialogue ? Array.from({ length: episodes }, (_, index) => ({ episodeId: `e${index + 1}`, dialogue: true })) : [],
    }).length;
    expect([count('vertical_slice', 1, false), count('vertical_slice', 1, true)]).toEqual([11, 12]);
    expect([count('chapter_internal', 8, false), count('chapter_internal', 8, true)]).toEqual([74, 82]);
    expect([count('full_season', 32, false), count('full_season', 32, true)]).toEqual([290, 322]);
  });
});

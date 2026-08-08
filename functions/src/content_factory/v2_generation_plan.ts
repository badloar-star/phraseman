// зачем: V2-строитель сезона (линия пилота Learning V2); легаси-утилиты поверхностей
// остались в generation_plan.ts этой ветки — здесь только мир V2.

export type V2GenerationScope = 'vertical_slice' | 'chapter_internal' | 'full_season';

export type V2StageKind =
  | 'v2_season_outline'
  | 'v2_episode_outline'
  | 'v2_scene_set'
  | 'v2_dialogue_script'
  | 'v2_voice_targets'
  | 'v2_activity_instances'
  | 'v2_activity_graph'
  | 'v2_asset_manifest'
  | 'v2_localization'
  | 'v2_preview_receipt'
  | 'v2_episode_bundle'
  | 'v2_season_qa';

export interface V2EpisodeRecipe {
  readonly episodeId: string;
  readonly dialogue?: boolean;
}

export interface V2GenerationStage {
  readonly id: string;
  readonly kind: V2StageKind;
  readonly episodeId?: string;
  readonly dependsOn: readonly string[];
}

export interface V2SeasonGenerationInput {
  readonly scope: V2GenerationScope;
  readonly seasonId: string;
  readonly episodeIds?: readonly string[];
  readonly recipes?: readonly V2EpisodeRecipe[];
}

const V2_SCOPE_EPISODE_COUNT: Readonly<Record<V2GenerationScope, number>> = Object.freeze({
  vertical_slice: 1,
  chapter_internal: 8,
  full_season: 32,
});

export function expectedV2EpisodeCount(scope: V2GenerationScope): number {
  const count = V2_SCOPE_EPISODE_COUNT[scope];
  if (!count) throw new Error('v2_generation_scope_invalid');
  return count;
}

function stageId(kind: V2StageKind, seasonId: string, episodeId?: string): string {
  return episodeId ? `${kind}:${seasonId}:${episodeId}` : `${kind}:${seasonId}`;
}

/** Build the deterministic V2 stage DAG without creating any content. */
export function buildV2SeasonPlan(input: V2SeasonGenerationInput): readonly V2GenerationStage[] {
  const seasonId = input.seasonId.trim();
  if (!seasonId) throw new Error('v2_season_id_required');
  const expected = expectedV2EpisodeCount(input.scope);
  const episodeIds = [...(input.episodeIds ?? [])].map((id) => id.trim());
  if (episodeIds.length !== expected || episodeIds.some((id) => !id)) {
    throw new Error(`v2_episode_count_expected_${expected}`);
  }
  if (new Set(episodeIds).size !== episodeIds.length) throw new Error('v2_episode_ids_must_be_unique');

  const normalizedRecipes = (input.recipes ?? []).map((recipe) => ({ ...recipe, episodeId: recipe.episodeId.trim() }));
  if (new Set(normalizedRecipes.map((recipe) => recipe.episodeId)).size !== normalizedRecipes.length) {
    throw new Error('v2_recipe_episode_ids_must_be_unique');
  }
  const recipes = new Map(normalizedRecipes.map((recipe) => [recipe.episodeId, recipe]));
  if (recipes.size && [...recipes.keys()].some((id) => !episodeIds.includes(id))) throw new Error('v2_recipe_episode_unknown');

  const seasonOutline = stageId('v2_season_outline', seasonId);
  const stages: V2GenerationStage[] = [{ id: seasonOutline, kind: 'v2_season_outline', dependsOn: [] }];
  for (const episodeId of episodeIds) {
    const recipe = recipes.get(episodeId);
    const outline = stageId('v2_episode_outline', seasonId, episodeId);
    const sceneSet = stageId('v2_scene_set', seasonId, episodeId);
    const dialogue = stageId('v2_dialogue_script', seasonId, episodeId);
    const voice = stageId('v2_voice_targets', seasonId, episodeId);
    const instances = stageId('v2_activity_instances', seasonId, episodeId);
    const graph = stageId('v2_activity_graph', seasonId, episodeId);
    const assets = stageId('v2_asset_manifest', seasonId, episodeId);
    const localization = stageId('v2_localization', seasonId, episodeId);
    const preview = stageId('v2_preview_receipt', seasonId, episodeId);
    const bundle = stageId('v2_episode_bundle', seasonId, episodeId);
    stages.push({ id: outline, kind: 'v2_episode_outline', episodeId, dependsOn: [seasonOutline] });
    stages.push({ id: sceneSet, kind: 'v2_scene_set', episodeId, dependsOn: [outline] });
    if (recipe?.dialogue) stages.push({ id: dialogue, kind: 'v2_dialogue_script', episodeId, dependsOn: [sceneSet] });
    stages.push({ id: voice, kind: 'v2_voice_targets', episodeId, dependsOn: [sceneSet] });
    const instanceDependencies = [outline, voice];
    if (recipe?.dialogue) instanceDependencies.push(dialogue);
    stages.push({ id: instances, kind: 'v2_activity_instances', episodeId, dependsOn: instanceDependencies });
    stages.push({ id: graph, kind: 'v2_activity_graph', episodeId, dependsOn: [instances] });
    stages.push({ id: assets, kind: 'v2_asset_manifest', episodeId, dependsOn: [graph] });
    stages.push({ id: localization, kind: 'v2_localization', episodeId, dependsOn: [graph] });
    stages.push({ id: preview, kind: 'v2_preview_receipt', episodeId, dependsOn: [assets, localization] });
    stages.push({ id: bundle, kind: 'v2_episode_bundle', episodeId, dependsOn: [preview] });
  }
  stages.push({ id: stageId('v2_season_qa', seasonId), kind: 'v2_season_qa', dependsOn: episodeIds.map((episodeId) => stageId('v2_episode_bundle', seasonId, episodeId)) });
  return Object.freeze(stages.map((stage) => Object.freeze({ ...stage, dependsOn: Object.freeze([...stage.dependsOn]) })));
}

export function buildV2EpisodeSubgraph(recipe: V2EpisodeRecipe, seasonId = 'season'): readonly V2GenerationStage[] {
  return buildV2SeasonPlan({ scope: 'vertical_slice', seasonId, episodeIds: [recipe.episodeId], recipes: [recipe] })
    .filter((stage) => stage.kind !== 'v2_season_outline' && stage.kind !== 'v2_season_qa');
}

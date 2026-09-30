/**
 * Non-learner-facing structural contract for the next Dialogue catalogue.
 * Content is deliberately kept outside this module so no scenario becomes
 * runnable before it has passed its own authoring and locale gates.
 */
export const DIALOGUE_V2_WORLD_IDS = ['social', 'work', 'travel', 'everyday'] as const;

export const DIALOGUE_V2_CEFR_SEQUENCE = [
  'A1', 'A1', 'A1', 'A1', 'A1',
  'A2', 'A2', 'A2', 'A2', 'A2',
  'B1', 'B1', 'B1',
  'B2', 'B2', 'B2',
  'C1', 'C1',
  'C2',
] as const;

export type DialogueV2Cefr = typeof DIALOGUE_V2_CEFR_SEQUENCE[number];
export type DialogueV2WorldId = typeof DIALOGUE_V2_WORLD_IDS[number];

type DialogueV2ScenarioShape = Readonly<{
  id: string;
  rankRequired: number;
  cefr: string;
  objectives: readonly DialogueV2ObjectiveShape[];
}>;

type DialogueV2ObjectiveShape = Readonly<{ id: string }>;

type DialogueV2WorldShape = Readonly<{
  id: string;
  scenarios: readonly DialogueV2ScenarioShape[];
}>;

export type DialogueV2PackShape = Readonly<{ worlds: readonly DialogueV2WorldShape[] }>;

export type DialogueV2PackValidation = Readonly<{ ok: true }> | Readonly<{ ok: false; error: string }>;

/**
 * Syntax-only immutable handle a client will eventually send instead of
 * client-authored role, setting, persona or objectives. A server-owned
 * manifest lookup must still bind it to an approved language pack and index.
 */
export type DialogueV2PackReference = Readonly<{
  scenarioId: string;
  packVersion: string;
  packSha256: string;
  catalogueSha256: string;
}>;

export type DialogueV2PackReferenceValidation =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; error: 'pack_reference_invalid' }>;

const DIALOGUE_V2_REFERENCE_TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

export function validateDialogueV2Pack(value: unknown): DialogueV2PackValidation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'pack_invalid' };
  const worlds = (value as { worlds?: unknown }).worlds;
  if (!Array.isArray(worlds) || worlds.length !== DIALOGUE_V2_WORLD_IDS.length) return { ok: false, error: 'world_count' };
  const worldIds = new Set<string>();
  const scenarioIds = new Set<string>();
  for (const world of worlds) {
    if (!world || typeof world !== 'object' || Array.isArray(world)) return { ok: false, error: 'world_invalid' };
    const row = world as Partial<DialogueV2WorldShape>;
    if (typeof row.id !== 'string' || !DIALOGUE_V2_WORLD_IDS.includes(row.id as DialogueV2WorldId) || worldIds.has(row.id)) {
      return { ok: false, error: 'world_id' };
    }
    worldIds.add(row.id);
    if (!Array.isArray(row.scenarios) || row.scenarios.length !== DIALOGUE_V2_CEFR_SEQUENCE.length) {
      return { ok: false, error: 'scenario_count' };
    }
    for (const [index, scenario] of row.scenarios.entries()) {
      if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) return { ok: false, error: 'scenario_invalid' };
      const item = scenario as Partial<DialogueV2ScenarioShape>;
      const scenarioId = typeof item.id === 'string' ? item.id.trim() : '';
      if (!scenarioId || item.id !== scenarioId || scenarioIds.has(scenarioId)) return { ok: false, error: 'scenario_id' };
      scenarioIds.add(scenarioId);
      if (item.rankRequired !== index + 1 || item.cefr !== DIALOGUE_V2_CEFR_SEQUENCE[index]) {
        return { ok: false, error: 'rank_or_cefr' };
      }
      if (!Array.isArray(item.objectives) || item.objectives.length < 6 || item.objectives.length > 12) {
        return { ok: false, error: 'objective_count' };
      }
      const objectiveIds = new Set<string>();
      for (const objective of item.objectives) {
        if (!objective || typeof objective !== 'object' || Array.isArray(objective)) return { ok: false, error: 'objective_id' };
        const objectiveId = typeof (objective as Partial<DialogueV2ObjectiveShape>).id === 'string'
          ? (objective as Partial<DialogueV2ObjectiveShape>).id!.trim()
          : '';
        if (!objectiveId || (objective as Partial<DialogueV2ObjectiveShape>).id !== objectiveId || objectiveIds.has(objectiveId)) {
          return { ok: false, error: 'objective_id' };
        }
        objectiveIds.add(objectiveId);
      }
    }
  }
  return { ok: true };
}

/**
 * Use this at client/server boundaries before treating untrusted JSON as the
 * structural V2 catalogue. Content and release eligibility remain separate.
 */
export function isDialogueV2Pack(value: unknown): value is DialogueV2PackShape {
  return validateDialogueV2Pack(value).ok;
}

export function validateDialogueV2PackReference(value: unknown): DialogueV2PackReferenceValidation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'pack_reference_invalid' };
  }
  const reference = value as Partial<DialogueV2PackReference>;
  const isCanonicalToken = (token: unknown): token is string => (
    typeof token === 'string' && token === token.trim() && DIALOGUE_V2_REFERENCE_TOKEN_RE.test(token)
  );
  const isSha256 = (hash: unknown): hash is string => (
    typeof hash === 'string' && SHA256_RE.test(hash)
  );
  if (
    !isCanonicalToken(reference.scenarioId)
    || !isCanonicalToken(reference.packVersion)
    || !isSha256(reference.packSha256)
    || !isSha256(reference.catalogueSha256)
  ) {
    return { ok: false, error: 'pack_reference_invalid' };
  }
  return { ok: true };
}

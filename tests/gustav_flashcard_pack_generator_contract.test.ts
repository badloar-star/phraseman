import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';

const ROOT = path.join(__dirname, '..');
const RUN_ID = '2026-07-04_flashcard_pack_generator_v1';
const BUILD_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', RUN_ID, 'build');
const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', RUN_ID, 'review');

function readJson<T = any>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function readProject(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

describe('Gustav flashcard pack generator contract', () => {
  beforeAll(() => {
    childProcess.execFileSync('node', ['scripts/gustav_build_flashcard_pack_generator_contract.mjs'], {
      cwd: ROOT,
      stdio: 'ignore',
    });
  });

  it('locks the reusable generator spec and forbids English pack translation as source', () => {
    const spec = readProject('specs/gustav-flashcard-pack-generator.md');
    const operator = readProject('docs/gustav/OPERATOR.md');
    const workOrderScript = readProject('scripts/gustav_builder_work_orders.mjs');

    expect(spec).toContain('gustav_flashcard_pack_generator');
    expect(spec).toContain('reusable Gustav Flashcard Pack Generator');
    expect(spec).toContain('future languages');
    expect(spec).toContain('must not translate English marketplace packs');
    expect(operator).toContain('Official flashcard packs use `gustav_flashcard_pack_generator`');
    expect(operator).toContain('It is never accepted as a row-by-row source to translate');
    expect(workOrderScript).toContain("builderId: 'gustav_flashcard_pack_generator'");
    expect(workOrderScript).toContain("reusableForTargets: true");
  });

  it('captures the English marketplace blueprint before target-language generation', () => {
    const blueprint = readJson(path.join(BUILD_DIR, 'english_flashcard_pack_blueprint_inventory.json'));

    expect(blueprint.schemaVersion).toBe('gustav-english-flashcard-pack-blueprint-inventory-v1');
    expect(blueprint.packCount).toBe(12);
    expect(blueprint.totalCards).toBe(385);
    expect(blueprint.categories).toEqual(expect.arrayContaining(['business', 'daily', 'slang', 'verbs']));
    expect(blueprint.requiredCardFields).toEqual(
      expect.arrayContaining(['en', 'ru', 'uk', 'literalRu', 'literalUk', 'explanationRu', 'explanationUk']),
    );
    expect(Object.keys(blueprint.styleFamilies)).toEqual(
      expect.arrayContaining(['culture_native', 'everyday_functional', 'grammar_utility']),
    );
    expect(blueprint.representativeCardSignals.length).toBeGreaterThanOrEqual(6);
  });

  it('keeps French pack generation planned, source-backed and activation-closed', () => {
    const contract = readJson(path.join(BUILD_DIR, 'flashcard_pack_generator_contract.json'));
    const plan = readJson(path.join(BUILD_DIR, 'target_flashcard_pack_plan.json'));
    const finalGate = readJson(path.join(BUILD_DIR, 'target_flashcard_final_gate.json'));
    const review = readJson(path.join(REVIEW_DIR, 'target_flashcard_review.json'));

    expect(contract.generatorId).toBe('gustav_flashcard_pack_generator');
    expect(contract.reusableAcrossTargets).toBe(true);
    expect(contract.firstTarget).toBe('fr');
    expect(contract.activationApproved).toBe(false);
    expect(contract.hardRules).toEqual(expect.arrayContaining([
      'Do not translate English marketplace packs as target-language source of truth.',
      'Use English packs only as product-shape and style blueprint.',
      'Reject lesson-row fanout as official marketplace pack parity.',
    ]));
    expect(contract.sourcePolicy.requiredPerAcceptedRow).toBe(true);
    expect(contract.descriptionStylePolicy).toMatchObject({
      required: true,
      sourceBlueprint: 'english_marketplace_product_copy',
      driftVerdict: 'BLOCK_PRODUCT_COPY_DRIFT',
    });
    expect(contract.descriptionStylePolicy.requiredSignals).toEqual(expect.arrayContaining([
      'scene_first',
      'conflict_or_tension',
      'concrete_social_fantasy',
      'useful_learning_promise',
    ]));
    expect(contract.descriptionStylePolicy.blockedSignals).toEqual(expect.arrayContaining([
      'contains_phrases_about',
      'this_pack_teaches',
      'topic_summary_only',
    ]));

    expect(plan.status).toBe('PLAN_READY_CONTENT_GENERATION_HOLD');
    expect(plan.commonPacks.length).toBeGreaterThanOrEqual(5);
    expect(plan.cultureNativePacks.length).toBeGreaterThanOrEqual(7);
    expect(plan.cultureNativePacks.map((pack: any) => pack.id)).toEqual(expect.arrayContaining([
      'fr_cafe_terrace_life',
      'fr_boulangerie_market',
      'fr_metro_train_city',
      'fr_bureaucracy_paperwork',
      'fr_apero_social_life',
    ]));
    expect([...plan.commonPacks, ...plan.cultureNativePacks].every((pack: any) => (
      pack.requiredEvidence.includes('trusted_source_per_row') &&
      pack.requiredEvidence.includes('no_english_translation_source')
    ))).toBe(true);

    expect(finalGate.generatorContractReady).toBe(true);
    expect(finalGate.productionReady).toBe(false);
    expect(finalGate.frenchPackContentReady).toBe(false);
    expect(finalGate.activationApproved).toBe(false);
    expect(finalGate.status).toBe('GENERATOR_CONTRACT_READY_CONTENT_GENERATION_HOLD');
    expect(finalGate.holdGates).toEqual(expect.arrayContaining([
      'sourceEvidence',
      'runtimeStorageIsolation',
      'serverPackDryRun',
      'adminWorkflowSurface',
      'rollback',
    ]));
    expect(review.verdict).toBe('PASS_GENERATOR_CONTRACT_HOLD_CONTENT');
    expect(review.activationApproved).toBe(false);
  });
});

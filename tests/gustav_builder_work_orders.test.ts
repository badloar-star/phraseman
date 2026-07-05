import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const WORK_ORDERS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'work_orders', 'fr_builder_work_orders.json');
const OPERATOR_PATH = path.join(ROOT, 'docs', 'gustav', 'OPERATOR.md');

describe('Gustav French builder work orders', () => {
  it('turns blocked feature-matrix rows into ordered French builder work orders', () => {
    const report = JSON.parse(fs.readFileSync(WORK_ORDERS_PATH, 'utf8'));
    const operator = fs.readFileSync(OPERATOR_PATH, 'utf8');

    expect(report.schemaVersion).toBe('gustav-fr-builder-work-orders-v1');
    expect(report.status).toBe('READY');
    expect(report.activationApproved).toBe(false);
    expect(report.summary.workOrderCount).toBeGreaterThanOrEqual(19);
    expect(report.summary.highReasoningCount).toBe(0);
    expect(report.summary.deepReasoningCount).toBe(report.summary.workOrderCount);

    const first = report.workOrders[0];
    expect(first.featureId).toBe('research_best_practices');
    expect(first.builderId).toBe('french_research_packet_builder');
    expect(first.reasoningLevel).toBe('deep');
    expect(first.requiredSourceIds).toEqual(
      expect.arrayContaining([
        'coe_cefr_companion_2020',
        'tv5monde_apprendre',
        'tv5monde_grammar',
        'le_robert_dictionary',
        'le_robert_conjugation',
      ]),
    );

    for (const order of report.workOrders) {
      expect(order.status).toBe('READY_TO_BUILD');
      expect(order.activationApproved).toBe(false);
      expect(order.reasoningLevel).toBe('deep');
      expect(order.requiredSourceIds.length).toBeGreaterThan(0);
      expect(order.outputArtifacts.length).toBeGreaterThan(0);
      expect(order.gates.length).toBeGreaterThan(0);
      expect(order.acceptanceCriteria).toContain('research packet exists and cites requiredSourceIds');
    }

    expect(report.workOrders.map((order: any) => order.builderId)).toEqual(expect.arrayContaining([
      'gustav_flashcard_pack_generator',
      'french_collectible_card_pack_builder',
      'french_daily_phrase_builder',
      'french_audio_tts_manifest_builder',
      'french_arena_question_bank_builder',
      'french_quiz_explanation_prompt_builder',
      'french_mistake_explanation_prompt_builder',
    ]));

    const flashcardOrder = report.workOrders.find((order: any) => order.featureId === 'flashcards');
    expect(flashcardOrder).toMatchObject({
      builderId: 'gustav_flashcard_pack_generator',
      generatorMode: 'target_language_official_flashcard_packs',
      reusableForTargets: true,
      activationApproved: false,
    });
    expect(flashcardOrder.requiredSourceIds).toEqual(expect.arrayContaining([
      'le_robert_dictionary',
      'tv5monde_apprendre',
      'phraseman_english_feature_atlas',
    ]));
    expect(flashcardOrder.gates).toEqual(expect.arrayContaining([
      'english_blueprint_inventory_gate',
      'generator_contract_gate',
      'source_evidence_gate',
      'admin_workflow_surface_gate',
      'activation_closed_gate',
    ]));

    expect(operator).toContain('scripts/gustav_builder_work_orders.mjs');
  });
});

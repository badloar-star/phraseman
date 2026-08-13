import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const MATRIX_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'feature_parity', 'english_feature_atlas_french_gap_matrix.json');
const SOURCES_PATH = path.join(ROOT, 'docs', 'gustav', 'trusted_sources', 'fr_trusted_sources.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'work_orders');
const OUT_JSON = path.join(OUT_DIR, 'fr_builder_work_orders.json');
const OUT_MD = path.join(OUT_DIR, 'fr_builder_work_orders.md');

const WORK_ORDER_OVERRIDES = {
  core_lessons_32: {
    builderId: 'french_lesson_scope_sequence_builder',
    requiredSources: ['coe_cefr_companion_2020', 'tv5monde_a1', 'tv5monde_a2', 'alliance_francaise_normandie_levels'],
    outputArtifacts: ['fr_lesson_scope_sequence_packet.json', 'fr_lesson_order_decision.md'],
    gates: ['target_sequence_fit_gate', 'official_source_evidence_gate', 'english_order_copy_blocker_gate'],
    reasoningLevel: 'deep',
  },
  lesson_theory: {
    builderId: 'french_lesson_theory_builder',
    requiredSources: ['tv5monde_grammar', 'le_robert_dictionary', 'le_robert_conjugation'],
    outputArtifacts: ['fr_lesson_theory_pack.json', 'fr_lesson_theory_research_packet.json'],
    gates: ['theory_source_coverage_gate', 'source_locale_explanation_gate', 'anti_calque_gate'],
    reasoningLevel: 'deep',
  },
  vocabulary_bank: {
    builderId: 'french_vocabulary_bank_builder',
    requiredSources: ['le_robert_dictionary', 'tv5monde_apprendre'],
    outputArtifacts: ['fr_vocabulary_bank.json', 'fr_vocab_gender_article_register_packet.json'],
    gates: ['gender_article_gate', 'elision_liaison_gate', 'register_usage_gate'],
    reasoningLevel: 'deep',
  },
  grammar_hubs: {
    builderId: 'french_grammar_hub_builder',
    requiredSources: ['tv5monde_grammar', 'le_robert_conjugation', 'coe_cefr_companion_2020'],
    outputArtifacts: ['fr_grammar_hubs.json', 'fr_high_frequency_verbs_packet.json'],
    gates: ['grammar_progression_gate', 'verb_form_gate', 'preposition_article_gate'],
    reasoningLevel: 'deep',
  },
  mistake_explanations: {
    builderId: 'french_mistake_explanation_prompt_builder',
    requiredSources: ['tv5monde_grammar', 'le_robert_conjugation', 'le_robert_dictionary'],
    outputArtifacts: ['fr_mistake_explanation_prompt_pack.json', 'fr_mistake_taxonomy.json'],
    gates: ['mistake_target_language_gate', 'source_locale_bridge_gate', 'cache_isolation_gate'],
    reasoningLevel: 'deep',
  },
  compass_ai: {
    builderId: 'french_compass_prompt_builder',
    requiredSources: ['tv5monde_apprendre', 'tv5monde_grammar', 'phraseman_english_feature_atlas'],
    outputArtifacts: ['fr_compass_prompt_pack.json', 'fr_dialog_situation_prompt_pack.json'],
    gates: ['compass_output_language_gate', 'premium_dialog_target_gate', 'ai_cache_scope_gate'],
    reasoningLevel: 'deep',
  },
  personal_practice: {
    builderId: 'french_personal_practice_builder',
    requiredSources: ['coe_cefr_companion_2020', 'tv5monde_apprendre', 'le_robert_dictionary'],
    outputArtifacts: ['fr_personal_practice_banks.json', 'fr_practice_mistake_taxonomy.json'],
    gates: ['not_lesson_fanout_gate', 'practice_queue_target_gate', 'weak_spot_taxonomy_gate'],
    reasoningLevel: 'deep',
  },
  flashcards: {
    builderId: 'gustav_flashcard_pack_generator',
    generatorMode: 'target_language_official_flashcard_packs',
    reusableForTargets: true,
    requiredSources: ['le_robert_dictionary', 'tv5monde_apprendre', 'phraseman_english_feature_atlas'],
    outputArtifacts: [
      'english_flashcard_pack_blueprint_inventory.json',
      'flashcard_pack_generator_contract.json',
      'target_flashcard_pack_plan.json',
      'target_flashcard_source_evidence.json',
      'target_flashcard_server_pack_manifest.json',
      'target_flashcard_admin_workflow_manifest.json',
      'target_flashcard_final_gate.json',
    ],
    gates: [
      'english_blueprint_inventory_gate',
      'generator_contract_gate',
      'pack_taxonomy_gate',
      'source_evidence_gate',
      'not_lesson_fanout_gate',
      'card_content_language_gate',
      'runtime_storage_isolation_gate',
      'server_pack_dry_run_gate',
      'admin_workflow_surface_gate',
      'activation_closed_gate',
    ],
    reasoningLevel: 'deep',
  },
  community_card_packs: {
    builderId: 'french_collectible_card_pack_builder',
    requiredSources: ['le_robert_dictionary', 'phraseman_english_feature_atlas'],
    outputArtifacts: ['fr_collectible_card_packs.json', 'fr_card_pack_metadata.json'],
    gates: ['collectible_content_target_gate', 'pack_manifest_gate', 'admin_pack_status_gate'],
    reasoningLevel: 'deep',
  },
  daily_phrase: {
    builderId: 'french_daily_phrase_builder',
    requiredSources: ['tv5monde_apprendre', 'le_robert_dictionary'],
    outputArtifacts: ['fr_daily_phrase_bank.json'],
    gates: ['daily_phrase_target_gate', 'no_english_fallback_gate'],
    reasoningLevel: 'deep',
  },
  diagnostics_exams: {
    builderId: 'french_diagnostic_exam_builder',
    requiredSources: ['coe_cefr_companion_2020', 'tv5monde_a1', 'tv5monde_a2'],
    outputArtifacts: ['fr_diagnostic_bank.json', 'fr_exam_bank.json', 'fr_level_check_bank.json'],
    gates: ['assessment_level_gate', 'exam_item_source_gate', 'result_feedback_language_gate'],
    reasoningLevel: 'deep',
  },
  personal_plans: {
    builderId: 'french_personal_plan_builder',
    requiredSources: ['coe_cefr_companion_2020', 'tv5monde_apprendre', 'alliance_francaise_normandie_levels'],
    outputArtifacts: ['fr_personal_plan_catalog.json', 'fr_plan_audio_manifest.json'],
    gates: ['plan_content_target_gate', 'plan_audio_gate', 'plan_progress_storage_gate'],
    reasoningLevel: 'deep',
  },
  audio_tts: {
    builderId: 'french_audio_tts_manifest_builder',
    requiredSources: ['le_robert_dictionary', 'phraseman_english_feature_atlas'],
    outputArtifacts: ['fr_audio_manifest.json', 'fr_missing_audio_gate_report.json'],
    gates: ['openai_tts_manifest_gate', 'audio_checksum_gate', 'server_audio_path_gate'],
    reasoningLevel: 'deep',
  },
  server_course_packs: {
    builderId: 'french_server_course_pack_builder',
    requiredSources: ['phraseman_english_feature_atlas'],
    outputArtifacts: ['fr_server_pack_manifest.json', 'fr_rollback_manifest.json', 'fr_remote_loader_contract.json'],
    gates: ['server_manifest_hash_gate', 'remote_loader_target_gate', 'rollback_rehearsal_gate'],
    reasoningLevel: 'deep',
  },
  admin_website: {
    builderId: 'french_admin_website_parity_builder',
    requiredSources: ['phraseman_admin_parity_atlas', 'phraseman_english_feature_atlas'],
    outputArtifacts: ['admin_english_learning_surface_matrix.json', 'admin_french_target_equivalence_matrix.json'],
    gates: ['admin_write_path_isolation_gate', 'admin_activation_rollback_french_gate', 'admin_ui_bible_compliance_check'],
    reasoningLevel: 'deep',
  },
  research_best_practices: {
    builderId: 'french_research_packet_builder',
    requiredSources: ['coe_cefr_companion_2020', 'tv5monde_apprendre', 'tv5monde_grammar', 'le_robert_dictionary', 'le_robert_conjugation'],
    outputArtifacts: ['fr_feature_research_packets.json', 'fr_anti_calque_rules.json', 'fr_best_practice_notes.json'],
    gates: ['trusted_source_coverage_gate', 'research_conflict_resolution_gate', 'generation_constraints_gate'],
    reasoningLevel: 'deep',
    forceOrder: 0,
  },
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function assertSourceCoverage(requiredSources, sourceIds, featureId) {
  const missing = requiredSources.filter((id) => !sourceIds.has(id));
  if (missing.length) {
    throw new Error(`Work order ${featureId} references missing trusted sources: ${missing.join(', ')}`);
  }
}

function defaultOrder(feature) {
  return {
    builderId: `french_${feature.featureId}_builder`,
    requiredSources: ['phraseman_english_feature_atlas'],
    outputArtifacts: [`fr_${feature.featureId}_packet.json`],
    gates: [`${feature.featureId}_target_gate`],
    reasoningLevel: 'deep',
  };
}

function buildReport() {
  const matrix = readJson(MATRIX_PATH);
  const sources = readJson(SOURCES_PATH);
  const sourceIds = new Set(sources.sources.map((source) => source.id));
  const blocked = matrix.features
    .filter((feature) => feature.status === 'BLOCK' || feature.status === 'HOLD')
    .sort((a, b) => a.priority - b.priority);

  const orderedBlocked = blocked
    .slice()
    .sort((a, b) => {
      const ao = WORK_ORDER_OVERRIDES[a.featureId]?.forceOrder ?? a.priority;
      const bo = WORK_ORDER_OVERRIDES[b.featureId]?.forceOrder ?? b.priority;
      return ao - bo || a.priority - b.priority;
    });

  const workOrders = orderedBlocked.map((feature, index) => {
    const override = WORK_ORDER_OVERRIDES[feature.featureId] ?? defaultOrder(feature);
    assertSourceCoverage(override.requiredSources, sourceIds, feature.featureId);
    return {
      workOrderId: `fr-${String(index + 1).padStart(3, '0')}-${feature.featureId}`,
      studyTarget: 'fr',
      sourceLocales: ['ru', 'uk'],
      featureId: feature.featureId,
      label: feature.label,
      priority: feature.priority,
      status: 'READY_TO_BUILD',
      activationApproved: false,
      reasoningLevel: override.reasoningLevel,
      builderId: override.builderId,
      ...(override.generatorMode ? { generatorMode: override.generatorMode } : {}),
      ...(override.reusableForTargets ? { reusableForTargets: true } : {}),
      blockersFromMatrix: feature.blockers,
      requiredSourceIds: override.requiredSources,
      productShapeEvidence: feature.englishSourceFiles.slice(0, 20),
      targetEvidenceSeen: feature.frenchEvidenceFiles.slice(0, 20),
      outputArtifacts: override.outputArtifacts.map((artifact) => `docs/gustav/generated/fr/${feature.featureId}/${artifact}`),
      gates: override.gates,
      acceptanceCriteria: [
        'research packet exists and cites requiredSourceIds',
        'builder output is isolated under studyTarget=fr and sourceLocale-aware',
        'no lesson-row fan-out is accepted unless English feature proves the same product shape',
        'all generated content remains activationApproved=false until apply gates pass',
        'matching validator or Jest guard exists before PASS',
      ],
      nextCommandHint: `node scripts/gustav_build_${feature.featureId}_work_order.mjs --work-order ${feature.featureId}`,
    };
  });

  return {
    schemaVersion: 'gustav-fr-builder-work-orders-v1',
    generatedAt: new Date().toISOString(),
    status: workOrders.length ? 'READY' : 'PASS',
    activationApproved: false,
    matrixPath: 'docs/gustav/generated/feature_parity/english_feature_atlas_french_gap_matrix.json',
    trustedSourcesPath: 'docs/gustav/trusted_sources/fr_trusted_sources.json',
    matrixHash: sha256(JSON.stringify(matrix)),
    trustedSourcesHash: sha256(JSON.stringify(sources)),
    summary: {
      workOrderCount: workOrders.length,
      deepReasoningCount: workOrders.filter((order) => order.reasoningLevel === 'deep').length,
      highReasoningCount: workOrders.filter((order) => order.reasoningLevel === 'high').length,
      activationApproved: false,
    },
    workOrders,
    firstBuildSequence: workOrders.slice(0, 8).map((order) => order.workOrderId),
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Gustav French Builder Work Orders',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Work orders: ${report.summary.workOrderCount}`,
    `- Deep reasoning: ${report.summary.deepReasoningCount}`,
    `- High reasoning: ${report.summary.highReasoningCount}`,
    `- activationApproved: ${report.activationApproved}`,
    '',
    '## First Build Sequence',
    '',
    ...report.firstBuildSequence.map((id) => `- \`${id}\``),
    '',
    '## Work Orders',
    '',
    '| Priority | Work Order | Builder | Reasoning | Gates |',
    '|---:|---|---|---|---|',
  ];

  for (const order of report.workOrders) {
    lines.push(`| ${order.priority} | \`${order.workOrderId}\` ${order.label} | \`${order.builderId}\` | \`${order.reasoningLevel}\` | ${order.gates.map((gate) => `\`${gate}\``).join('<br>')} |`);
  }

  lines.push('', '## Rule', '');
  lines.push('Every order starts as `READY_TO_BUILD`, not PASS. It becomes PASS only after its research packet, target pack, validator/judge evidence, admin/server/storage gates and activation chain all pass.');
  lines.push('');
  return lines.join('\n');
}

const report = buildReport();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(OUT_MD, renderMarkdown(report));
console.log(`Gustav French builder work orders: ${report.status}`);
console.log(`Work orders: ${report.summary.workOrderCount}`);
console.log(`Deep reasoning: ${report.summary.deepReasoningCount}`);
console.log(path.relative(ROOT, OUT_JSON).replace(/\\/g, '/'));

import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type DomainId =
  | 'lesson_rows'
  | 'lesson_intro_screens'
  | 'quizzes'
  | 'words_vocabulary'
  | 'preposition_packs'
  | 'flashcards'
  | 'daily_phrases'
  | 'ai_output_language_contracts'
  | 'ai_dialogs'
  | 'mistake_explanations'
  | 'weekly_review'
  | 'stats_insights'
  | 'premium_dialogs_paywall'
  | 'collectibles_reward_text'
  | 'admin_reviewer_import_flows'
  | 'target_storage_and_cloud_sync'
  | 'source_locale_ui_copy'
  | 'gustav_gate_scripts';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type AtlasRecord = {
  path: string;
  primaryDomain: string;
  secondaryDomains?: string[];
  targetSensitive?: boolean;
  aiPromptEntrypoint?: boolean;
  generatedContentConsumer?: boolean;
  storageOrCacheTouch?: boolean;
  sourceLocaleTouch?: boolean;
  targetLocaleTouch?: boolean;
  uiLocaleTouch?: boolean;
  reviewerOrImportTouch?: boolean;
};

type DomainContract = {
  id: DomainId;
  title: string;
  contentOwner: string;
  targetFields: string[];
  sourceLocaleFields: string[];
  uiLocaleFields: string[];
  storageNamespace: string;
  cacheKeyPolicy: string;
  reviewerDecisionContract: string;
  researchEvidenceRequirement: string;
  aiPromptContract: string;
  activationGate: string;
  generationAllowedBeforeResearchPack: false;
  applyAllowedWithoutApproval: false;
  appAtlasFiles: string[];
  targetSensitiveFiles: string[];
  aiPromptEntrypoints: string[];
  storageOrCacheTouchFiles: string[];
};

type Report = {
  schemaVersion: 'gustav-algorithm-domain-registry-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    requiredDomains: number;
    registryDomains: number;
    appAtlasRecords: number;
    atlasDomainsCovered: number;
    unknownAtlasRecords: number;
    targetSensitiveRecords: number;
    targetSensitiveRecordsCovered: number;
    aiPromptEntrypoints: number;
    aiPromptEntrypointsCovered: number;
    storageOrCacheTouchFiles: number;
    storageOrCacheTouchFilesCovered: number;
    domainsWithContentOwner: number;
    domainsWithTargetFields: number;
    domainsWithSourceLocaleFields: number;
    domainsWithUiLocaleFields: number;
    domainsWithStorageNamespace: number;
    domainsWithCacheKeyPolicy: number;
    domainsWithReviewerDecisionContract: number;
    domainsWithResearchEvidenceRequirement: number;
    domainsWithAiPromptContract: number;
    domainsWithActivationGate: number;
    generationV2ContractsComplete: boolean;
    blockers: number;
    warnings: number;
    readyForResearchPackBuilder: boolean;
    readyForGenerationSchemaV2: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  registry: DomainContract[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

const REQUIRED_DOMAINS: DomainId[] = [
  'lesson_rows',
  'lesson_intro_screens',
  'quizzes',
  'words_vocabulary',
  'preposition_packs',
  'flashcards',
  'daily_phrases',
  'ai_output_language_contracts',
  'ai_dialogs',
  'mistake_explanations',
  'weekly_review',
  'stats_insights',
  'premium_dialogs_paywall',
  'collectibles_reward_text',
  'admin_reviewer_import_flows',
  'target_storage_and_cloud_sync',
  'source_locale_ui_copy',
  'gustav_gate_scripts',
];

const CONTRACTS: Array<Omit<DomainContract, 'appAtlasFiles' | 'targetSensitiveFiles' | 'aiPromptEntrypoints' | 'storageOrCacheTouchFiles'>> = [
  {
    id: 'lesson_rows',
    title: 'Lesson row target content',
    contentOwner: 'learning_content',
    targetFields: ['proposedTarget', 'wordsTarget', 'quizTarget', 'targetExamples'],
    sourceLocaleFields: ['russianMeaning', 'ukrainianMeaning', 'sourceLocaleExplanations'],
    uiLocaleFields: ['lesson chrome labels only'],
    storageNamespace: 'progress/targets/{targetLocale}/lessons/{lessonId}',
    cacheKeyPolicy: 'targetLocale + sourceLocale + lessonId + sourceGraphVersion + researchPackVersion',
    reviewerDecisionContract: 'Full-row reviewer decision with evidence checked and activationApproved=false until import/apply gates.',
    researchEvidenceRequirement: 'At least one pedagogy blueprint node and required researchEvidenceIds per row; high-risk rows require two trusted sources.',
    aiPromptContract: 'Generation prompts must pass targetLocale, sourceLocale, uiLocale and forbidden-language field rules.',
    activationGate: 'Language isolation + evidence coverage + reviewer import dry-run + explicit apply approval.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'lesson_intro_screens',
    title: 'Lesson intro and teaching screens',
    contentOwner: 'learning_content',
    targetFields: ['target grammar explanation', 'target examples'],
    sourceLocaleFields: ['RU explanation', 'UK explanation'],
    uiLocaleFields: ['button labels', 'screen chrome'],
    storageNamespace: 'progress/targets/{targetLocale}/lesson_intro',
    cacheKeyPolicy: 'targetLocale + sourceLocale + introScreenId + researchPackVersion',
    reviewerDecisionContract: 'Intro-screen reviewer decision must verify source-locale explanation does not leak into target fields.',
    researchEvidenceRequirement: 'Grammar-cluster source refs and CEFR level note.',
    aiPromptContract: 'Prompt must separate teaching language from learner UI language.',
    activationGate: 'Intro schema V2 + source-locale parity audit + reviewer accept.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'quizzes',
    title: 'Quiz and distractor design',
    contentOwner: 'assessment',
    targetFields: ['quizBlank', 'quizCorrect', 'quizDistractors'],
    sourceLocaleFields: ['RU prompt', 'UK prompt'],
    uiLocaleFields: ['quiz labels', 'feedback chrome'],
    storageNamespace: 'progress/targets/{targetLocale}/quizzes',
    cacheKeyPolicy: 'targetLocale + sourceLocale + quizId + grammarClusterId + researchPackVersion',
    reviewerDecisionContract: 'Reviewer cannot accept without one-correct-answer proof and distractor quality decision.',
    researchEvidenceRequirement: 'Quiz design rule, grammar rule, and lexical/conjugation evidence when applicable.',
    aiPromptContract: 'AI must not reveal answer through wording and must emit field-language declarations.',
    activationGate: 'Quiz quality audit + anti-calque audit + reviewer accept.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'words_vocabulary',
    title: 'Vocabulary, lemma and word cards',
    contentOwner: 'lexical_content',
    targetFields: ['lemma', 'gender', 'number', 'article', 'word examples'],
    sourceLocaleFields: ['RU meaning', 'UK meaning'],
    uiLocaleFields: ['word-screen labels'],
    storageNamespace: 'progress/targets/{targetLocale}/words',
    cacheKeyPolicy: 'targetLocale + sourceLocale + wordId + dictionarySourceVersion',
    reviewerDecisionContract: 'Reviewer verifies lemma, gender, article and false-friend risks.',
    researchEvidenceRequirement: 'Dictionary/usage source for lexical rows; conjugation source for verbs.',
    aiPromptContract: 'AI lexical notes require dictionary source refs and target-language-only target fields.',
    activationGate: 'Lexical evidence audit + reviewer accept + apply approval.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'preposition_packs',
    title: 'Preposition packs',
    contentOwner: 'grammar_content',
    targetFields: ['preposition', 'contracted article', 'example sentence'],
    sourceLocaleFields: ['RU/UK contrast note'],
    uiLocaleFields: ['pack labels'],
    storageNamespace: 'progress/targets/{targetLocale}/prepositions',
    cacheKeyPolicy: 'targetLocale + sourceLocale + packId + grammarClusterId',
    reviewerDecisionContract: 'Reviewer verifies French-specific preposition choice, not English calque.',
    researchEvidenceRequirement: 'Usage and grammar refs for place/country/article-contraction rules.',
    aiPromptContract: 'Prompt must allow grammar rebuild instead of direct translation.',
    activationGate: 'Anti-calque audit + grammar evidence audit.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'flashcards',
    title: 'Flashcards and marketplace bundles',
    contentOwner: 'flashcard_content',
    targetFields: ['card target phrase', 'target example', 'target answer'],
    sourceLocaleFields: ['sourceLocales maps', 'RU/UK marketplace support'],
    uiLocaleFields: ['bundle title UI', 'CTA labels'],
    storageNamespace: 'progress/targets/{targetLocale}/flashcards',
    cacheKeyPolicy: 'targetLocale + sourceLocale + bundleId + cardId + researchPackVersion',
    reviewerDecisionContract: 'Reviewer verifies target answer, example naturalness and sourceLocale map separation.',
    researchEvidenceRequirement: 'Dictionary/usage refs for phrase and example decisions.',
    aiPromptContract: 'Prompt must emit target card fields separately from marketplace UI copy.',
    activationGate: 'Bundle contract + target isolation + reviewer accept.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'daily_phrases',
    title: 'Daily phrase content',
    contentOwner: 'learning_content',
    targetFields: ['daily target phrase', 'usage note'],
    sourceLocaleFields: ['RU/UK meaning and hint'],
    uiLocaleFields: ['daily screen chrome'],
    storageNamespace: 'progress/targets/{targetLocale}/daily_phrases',
    cacheKeyPolicy: 'targetLocale + sourceLocale + dailyPhraseId + registerTag',
    reviewerDecisionContract: 'Reviewer verifies naturalness, register and source meaning.',
    researchEvidenceRequirement: 'Usage or dictionary refs for idiomatic/natural phrases.',
    aiPromptContract: 'Prompt must reject literal translations that are not natural in target language.',
    activationGate: 'Naturalness audit + reviewer accept.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'ai_output_language_contracts',
    title: 'Shared AI output language contracts and semantic gates',
    contentOwner: 'conversation_ai_platform',
    targetFields: ['target-language generated text', 'target examples', 'target corrections'],
    sourceLocaleFields: ['RU/UK generated explanations and support copy'],
    uiLocaleFields: ['UI-language generated prose when feature is UI-only'],
    storageNamespace: 'ai_cache/{featureId}/{targetLocale}/{sourceLocale}/{uiLocale}',
    cacheKeyPolicy: 'Every AI cache key must include featureId, targetLocale, sourceLocale, uiLocale and promptVersion.',
    reviewerDecisionContract: 'Rejected fresh AI text cannot be returned live, cached, or marked accepted by reviewer workflow.',
    researchEvidenceRequirement: 'Grammar/usage-bearing AI output must reference researchPack and pedagogy blueprint decisions before acceptance.',
    aiPromptContract: 'Central registry declares allowed output language per field, forbidden languages, cache dimensions and reject behavior.',
    activationGate: 'AI prompt registry audit + AI output language contract audit + language gate regression tests.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'ai_dialogs',
    title: 'AI dialog scenarios and session prompts',
    contentOwner: 'conversation_ai',
    targetFields: ['learner target-language utterances', 'target correction examples'],
    sourceLocaleFields: ['RU/UK scenario help'],
    uiLocaleFields: ['dialog UI title', 'goal', 'next-step hint'],
    storageNamespace: 'progress/targets/{targetLocale}/ai_dialogs',
    cacheKeyPolicy: 'targetLocale + sourceLocale + uiLocale + scenarioId + promptVersion',
    reviewerDecisionContract: 'Prompt scenario reviewer verifies allowed output language per field.',
    researchEvidenceRequirement: 'Research refs required for grammar/usage-bearing scenario corrections.',
    aiPromptContract: 'Required: targetLocale, sourceLocale, uiLocale, allowed language per field, forbidden language per field, reject behavior before return/cache.',
    activationGate: 'AI prompt registry audit + AI output language contract audit.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'mistake_explanations',
    title: 'AI mistake explanations',
    contentOwner: 'conversation_ai',
    targetFields: ['target correction', 'target example'],
    sourceLocaleFields: ['RU/UK explanation text'],
    uiLocaleFields: ['coach UI labels'],
    storageNamespace: 'progress/targets/{targetLocale}/mistakes',
    cacheKeyPolicy: 'targetLocale + sourceLocale + mistakeType + phraseId + promptVersion',
    reviewerDecisionContract: 'Rejected or ungated fresh AI text cannot be accepted or cached.',
    researchEvidenceRequirement: 'Grammar cluster refs for explanation decisions.',
    aiPromptContract: 'Output gate before return/cache; rejected fresh text must not be returned live.',
    activationGate: 'AI output language contract audit + cache key audit.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'weekly_review',
    title: 'Weekly review AI summaries',
    contentOwner: 'review_ai',
    targetFields: ['target-language examples and corrections'],
    sourceLocaleFields: ['RU/UK weekly summary copy'],
    uiLocaleFields: ['weekly card labels'],
    storageNamespace: 'progress/targets/{targetLocale}/weekly_review',
    cacheKeyPolicy: 'targetLocale + sourceLocale + weekId + promptVersion',
    reviewerDecisionContract: 'Weekly review cannot cache language-mismatched generated text.',
    researchEvidenceRequirement: 'Evidence refs required when summary teaches grammar or usage.',
    aiPromptContract: 'Prompt and cache key must include targetLocale/sourceLocale/uiLocale.',
    activationGate: 'Weekly review language gate + target storage policy.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'stats_insights',
    title: 'Stats insights AI text',
    contentOwner: 'review_ai',
    targetFields: ['target examples in insights'],
    sourceLocaleFields: ['RU/UK insight explanation'],
    uiLocaleFields: ['stats UI labels'],
    storageNamespace: 'progress/targets/{targetLocale}/stats_insights',
    cacheKeyPolicy: 'targetLocale + sourceLocale + statsWindow + promptVersion',
    reviewerDecisionContract: 'Stats insight output must be gated before display/cache.',
    researchEvidenceRequirement: 'Research refs required for grammar-bearing advice.',
    aiPromptContract: 'Prompt must declare language per field and reject mixed-language output.',
    activationGate: 'Stats AI output language contract + cache key audit.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'premium_dialogs_paywall',
    title: 'Premium dialogs, paywalls and speaking surfaces',
    contentOwner: 'monetization_and_speaking',
    targetFields: ['speaking target prompts', 'target examples when present'],
    sourceLocaleFields: ['RU/UK paywall explanatory copy'],
    uiLocaleFields: ['CTA labels', 'premium modal copy'],
    storageNamespace: 'entitlements/global plus progress/targets/{targetLocale}/speaking',
    cacheKeyPolicy: 'targetLocale + sourceLocale + uiLocale + entitlementState + promptVersion',
    reviewerDecisionContract: 'Speaking target prompts require target-language gate; entitlement copy remains UI/source-locale.',
    researchEvidenceRequirement: 'Evidence refs required only for learning/speaking target content.',
    aiPromptContract: 'Premium/speaking AI text must separate monetization UI copy from target-language practice.',
    activationGate: 'Speaking language contract + UI locale separation + explicit apply approval.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'collectibles_reward_text',
    title: 'Collectibles and reward text',
    contentOwner: 'rewards_content',
    targetFields: ['target-language collectible educational text when present'],
    sourceLocaleFields: ['RU/UK reward descriptions'],
    uiLocaleFields: ['reward UI labels'],
    storageNamespace: 'rewards/global plus progress/targets/{targetLocale}/reward_learning_text',
    cacheKeyPolicy: 'targetLocale + sourceLocale + collectibleSetId + cardId',
    reviewerDecisionContract: 'Reviewer verifies reward text is UI/source-locale or target content, never mixed.',
    researchEvidenceRequirement: 'Evidence refs required for educational target text, not language-neutral art assets.',
    aiPromptContract: 'Image/text generation prompts must mark embedded text language and targetLocale.',
    activationGate: 'Asset gate + localized text sidecar + reviewer accept.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'admin_reviewer_import_flows',
    title: 'Admin, reviewer and import flows',
    contentOwner: 'operations',
    targetFields: ['none by default; only reviewer work products inside run container'],
    sourceLocaleFields: ['reviewer/admin notes'],
    uiLocaleFields: ['admin UI labels'],
    storageNamespace: 'gustav/run-artifacts only unless explicitly approved',
    cacheKeyPolicy: 'runId + targetLocale + reviewerDecisionFileHash',
    reviewerDecisionContract: 'Partial review never unlocks import; decisions must be full-file and dry-run clean.',
    researchEvidenceRequirement: 'Import must verify evidence fields before acceptance.',
    aiPromptContract: 'No AI-generated approval receipts; admin prompts cannot create apply approval.',
    activationGate: 'Decision import dry-run + explicit approval receipt firewall.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'target_storage_and_cloud_sync',
    title: 'Target storage and cloud sync',
    contentOwner: 'runtime_state',
    targetFields: ['target-scoped progress payloads'],
    sourceLocaleFields: ['source locale preference'],
    uiLocaleFields: ['settings UI'],
    storageNamespace: 'progress/targets/{targetLocale} and sourceLocale/global split',
    cacheKeyPolicy: 'All cache keys include targetLocale when target content or progress is involved.',
    reviewerDecisionContract: 'No content activation until target storage/cloud policy passes.',
    researchEvidenceRequirement: 'No linguistic evidence; requires runtime state contract evidence.',
    aiPromptContract: 'AI caches must include language dimensions and reject mismatched payloads.',
    activationGate: 'Target key, cloud mapping and raw storage guard gates.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'source_locale_ui_copy',
    title: 'Source-locale UI copy',
    contentOwner: 'localization_ui',
    targetFields: ['none unless screen contains learning target content'],
    sourceLocaleFields: ['RU/UK/PT/VI/etc UI copy'],
    uiLocaleFields: ['all non-learning UI labels'],
    storageNamespace: 'settings/sourceLocale',
    cacheKeyPolicy: 'sourceLocale + uiLocale; must not mutate study target.',
    reviewerDecisionContract: 'UI copy review cannot approve target-language study content.',
    researchEvidenceRequirement: 'No target grammar evidence unless UI copy includes learning content.',
    aiPromptContract: 'UI AI copy must declare uiLocale and cannot emit target study answers.',
    activationGate: 'Source-locale parity audit + studyTarget immutability test.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
  {
    id: 'gustav_gate_scripts',
    title: 'GUSTAV gate scripts',
    contentOwner: 'pipeline_safety',
    targetFields: ['audit outputs only'],
    sourceLocaleFields: ['audit notes only'],
    uiLocaleFields: ['none'],
    storageNamespace: 'docs/gustav/runs/{runId}',
    cacheKeyPolicy: 'runId + targetLocale + sourceGraphHash + researchPackHash',
    reviewerDecisionContract: 'Gate scripts may validate decisions but cannot create them silently.',
    researchEvidenceRequirement: 'Gate scripts must require research evidence before content generation/apply.',
    aiPromptContract: 'Prompt audits must be read-only until explicit implementation approval.',
    activationGate: 'Brain gate V2 + master manifest V2 + no production writes without approval.',
    generationAllowedBeforeResearchPack: false,
    applyAllowedWithoutApproval: false,
  },
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function array<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function isDomainId(value: string): value is DomainId {
  return REQUIRED_DOMAINS.includes(value as DomainId);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Algorithm Domain Registry V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Required domains: ${report.summary.requiredDomains}`,
    `- Registry domains: ${report.summary.registryDomains}`,
    `- App atlas records: ${report.summary.appAtlasRecords}`,
    `- Atlas domains covered: ${report.summary.atlasDomainsCovered}`,
    `- Unknown atlas records: ${report.summary.unknownAtlasRecords}`,
    `- Target-sensitive records: ${report.summary.targetSensitiveRecords}`,
    `- Target-sensitive records covered: ${report.summary.targetSensitiveRecordsCovered}`,
    `- AI prompt entrypoints: ${report.summary.aiPromptEntrypoints}`,
    `- AI prompt entrypoints covered: ${report.summary.aiPromptEntrypointsCovered}`,
    `- Storage/cache touch files: ${report.summary.storageOrCacheTouchFiles}`,
    `- Storage/cache touch files covered: ${report.summary.storageOrCacheTouchFilesCovered}`,
    `- Generation V2 contracts complete: ${report.summary.generationV2ContractsComplete ? 'yes' : 'no'}`,
    `- Ready for research pack builder: ${report.summary.readyForResearchPackBuilder ? 'yes' : 'no'}`,
    `- Ready for Generation Schema V2: ${report.summary.readyForGenerationSchemaV2 ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Domains',
    '',
  ];

  for (const domain of report.registry) {
    lines.push(`### ${domain.id}`);
    lines.push('');
    lines.push(`- Owner: \`${domain.contentOwner}\``);
    lines.push(`- App atlas files: ${domain.appAtlasFiles.length}`);
    lines.push(`- Target-sensitive files: ${domain.targetSensitiveFiles.length}`);
    lines.push(`- AI prompt entrypoints: ${domain.aiPromptEntrypoints.length}`);
    lines.push(`- Storage/cache files: ${domain.storageOrCacheTouchFiles.length}`);
    lines.push(`- Cache key policy: ${domain.cacheKeyPolicy}`);
    lines.push(`- Activation gate: ${domain.activationGate}`);
    lines.push('');
  }

  lines.push('## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is audit-only.',
    '- It did not modify production app files.',
    '- It did not modify generated French ledgers.',
    '- It did not write reviewer decisions.',
    '- It did not approve production apply.',
    '',
  );
  return lines.join('\n');
}

function hasNonEmpty(value: string | string[]): boolean {
  if (Array.isArray(value)) return value.some((item) => item.trim().length > 0);
  return value.trim().length > 0;
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_algorithm_domain_registry_v2_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const appAtlasPath = path.join(auditsDir, 'app_atlas.json');
  const appAtlasAuditPath = path.join(auditsDir, 'app_atlas_refresh_audit.json');
  const legacyRegistryPath = path.join(auditsDir, 'algorithm_domain_registry_packet.json');
  const findings: Finding[] = [];

  if (!fs.existsSync(appAtlasPath)) {
    addFinding(findings, 'blocker', 'app_atlas_missing', 'Domain Registry V2 requires app_atlas.json.', rel(repoRoot, appAtlasPath));
  }
  if (!fs.existsSync(appAtlasAuditPath)) {
    addFinding(findings, 'blocker', 'app_atlas_audit_missing', 'Domain Registry V2 requires app_atlas_refresh_audit.json.', rel(repoRoot, appAtlasAuditPath));
  }

  const atlasBody = fs.existsSync(appAtlasPath) ? readJson<JsonObject>(appAtlasPath) : {};
  const atlasRecords = array<AtlasRecord>(atlasBody.records);
  const recordsByDomain = new Map<DomainId, AtlasRecord[]>();
  for (const domain of REQUIRED_DOMAINS) recordsByDomain.set(domain, []);

  let unknownAtlasRecords = 0;
  for (const record of atlasRecords) {
    if (isDomainId(record.primaryDomain)) {
      recordsByDomain.get(record.primaryDomain)?.push(record);
    } else {
      unknownAtlasRecords += 1;
      if (record.targetSensitive) {
        addFinding(findings, 'blocker', 'target_sensitive_atlas_record_unregistered', 'Target-sensitive atlas record has no registered domain.', record.path);
      }
    }
  }

  const contractsById = new Map(CONTRACTS.map((contract) => [contract.id, contract]));
  for (const required of REQUIRED_DOMAINS) {
    if (!contractsById.has(required)) {
      addFinding(findings, 'blocker', 'required_domain_missing_contract', `Required domain has no V2 contract: ${required}.`);
    }
  }

  const registry: DomainContract[] = [];
  for (const required of REQUIRED_DOMAINS) {
    const contract = contractsById.get(required);
    if (!contract) continue;
    const domainRecords = recordsByDomain.get(required) ?? [];
    const domainContract: DomainContract = {
      ...contract,
      appAtlasFiles: domainRecords.map((record) => record.path).sort(),
      targetSensitiveFiles: domainRecords.filter((record) => record.targetSensitive).map((record) => record.path).sort(),
      aiPromptEntrypoints: domainRecords.filter((record) => record.aiPromptEntrypoint).map((record) => record.path).sort(),
      storageOrCacheTouchFiles: domainRecords.filter((record) => record.storageOrCacheTouch).map((record) => record.path).sort(),
    };
    registry.push(domainContract);
  }

  for (const domain of registry) {
    const requiredFields: Array<[keyof DomainContract, string | string[]]> = [
      ['contentOwner', domain.contentOwner],
      ['targetFields', domain.targetFields],
      ['sourceLocaleFields', domain.sourceLocaleFields],
      ['uiLocaleFields', domain.uiLocaleFields],
      ['storageNamespace', domain.storageNamespace],
      ['cacheKeyPolicy', domain.cacheKeyPolicy],
      ['reviewerDecisionContract', domain.reviewerDecisionContract],
      ['researchEvidenceRequirement', domain.researchEvidenceRequirement],
      ['aiPromptContract', domain.aiPromptContract],
      ['activationGate', domain.activationGate],
    ];
    for (const [field, value] of requiredFields) {
      if (!hasNonEmpty(value)) {
        addFinding(findings, 'blocker', 'domain_contract_field_missing', `Domain ${domain.id} is missing ${String(field)}.`);
      }
    }
    if (domain.generationAllowedBeforeResearchPack !== false || domain.applyAllowedWithoutApproval !== false) {
      addFinding(findings, 'blocker', 'domain_contract_safety_boolean_invalid', `Domain ${domain.id} must block generation before research pack and apply without approval.`);
    }
    if (domain.appAtlasFiles.length === 0 && !['gustav_gate_scripts'].includes(domain.id)) {
      addFinding(findings, 'warning', 'domain_has_no_atlas_files', `Domain ${domain.id} has no current app atlas file mapped.`);
    }
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const targetSensitiveRecords = atlasRecords.filter((record) => record.targetSensitive);
  const aiPromptEntrypoints = atlasRecords.filter((record) => record.aiPromptEntrypoint);
  const storageOrCacheTouchFiles = atlasRecords.filter((record) => record.storageOrCacheTouch);
  const covered = (record: AtlasRecord): boolean => isDomainId(record.primaryDomain);

  const outJson = path.join(auditsDir, 'algorithm_domain_registry_v2_packet.json');
  const outMd = path.join(auditsDir, 'algorithm_domain_registry_v2_packet.md');
  const domainsWithContentOwner = registry.filter((domain) => hasNonEmpty(domain.contentOwner)).length;
  const domainsWithTargetFields = registry.filter((domain) => hasNonEmpty(domain.targetFields)).length;
  const domainsWithSourceLocaleFields = registry.filter((domain) => hasNonEmpty(domain.sourceLocaleFields)).length;
  const domainsWithUiLocaleFields = registry.filter((domain) => hasNonEmpty(domain.uiLocaleFields)).length;
  const domainsWithStorageNamespace = registry.filter((domain) => hasNonEmpty(domain.storageNamespace)).length;
  const domainsWithCacheKeyPolicy = registry.filter((domain) => hasNonEmpty(domain.cacheKeyPolicy)).length;
  const domainsWithReviewerDecisionContract = registry.filter((domain) => hasNonEmpty(domain.reviewerDecisionContract)).length;
  const domainsWithResearchEvidenceRequirement = registry.filter((domain) => hasNonEmpty(domain.researchEvidenceRequirement)).length;
  const domainsWithAiPromptContract = registry.filter((domain) => hasNonEmpty(domain.aiPromptContract)).length;
  const domainsWithActivationGate = registry.filter((domain) => hasNonEmpty(domain.activationGate)).length;
  const atlasDomainsCovered = new Set(atlasRecords.filter(covered).map((record) => record.primaryDomain)).size;
  const targetSensitiveRecordsCovered = targetSensitiveRecords.filter(covered).length;
  const aiPromptEntrypointsCovered = aiPromptEntrypoints.filter(covered).length;
  const storageOrCacheTouchFilesCovered = storageOrCacheTouchFiles.filter(covered).length;
  const generationV2ContractsComplete =
    blockers === 0 &&
    warnings === 0 &&
    registry.length === REQUIRED_DOMAINS.length &&
    atlasDomainsCovered === REQUIRED_DOMAINS.length &&
    targetSensitiveRecords.length > 0 &&
    targetSensitiveRecordsCovered === targetSensitiveRecords.length &&
    aiPromptEntrypoints.length > 0 &&
    aiPromptEntrypointsCovered === aiPromptEntrypoints.length &&
    storageOrCacheTouchFiles.length > 0 &&
    storageOrCacheTouchFilesCovered === storageOrCacheTouchFiles.length &&
    domainsWithContentOwner === registry.length &&
    domainsWithTargetFields === registry.length &&
    domainsWithSourceLocaleFields === registry.length &&
    domainsWithUiLocaleFields === registry.length &&
    domainsWithStorageNamespace === registry.length &&
    domainsWithCacheKeyPolicy === registry.length &&
    domainsWithReviewerDecisionContract === registry.length &&
    domainsWithResearchEvidenceRequirement === registry.length &&
    domainsWithAiPromptContract === registry.length &&
    domainsWithActivationGate === registry.length &&
    registry.every((domain) => domain.generationAllowedBeforeResearchPack === false && domain.applyAllowedWithoutApproval === false);
  const report: Report = {
    schemaVersion: 'gustav-algorithm-domain-registry-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : (warnings > 0 ? 'HOLD' : 'PASS'),
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      appAtlas: rel(repoRoot, appAtlasPath),
      appAtlasRefreshAudit: rel(repoRoot, appAtlasAuditPath),
      legacyDomainRegistry: rel(repoRoot, legacyRegistryPath),
    },
    outputs: {
      auditJson: rel(repoRoot, outJson),
      auditMd: rel(repoRoot, outMd),
    },
    summary: {
      requiredDomains: REQUIRED_DOMAINS.length,
      registryDomains: registry.length,
      appAtlasRecords: atlasRecords.length,
      atlasDomainsCovered,
      unknownAtlasRecords,
      targetSensitiveRecords: targetSensitiveRecords.length,
      targetSensitiveRecordsCovered,
      aiPromptEntrypoints: aiPromptEntrypoints.length,
      aiPromptEntrypointsCovered,
      storageOrCacheTouchFiles: storageOrCacheTouchFiles.length,
      storageOrCacheTouchFilesCovered,
      domainsWithContentOwner,
      domainsWithTargetFields,
      domainsWithSourceLocaleFields,
      domainsWithUiLocaleFields,
      domainsWithStorageNamespace,
      domainsWithCacheKeyPolicy,
      domainsWithReviewerDecisionContract,
      domainsWithResearchEvidenceRequirement,
      domainsWithAiPromptContract,
      domainsWithActivationGate,
      generationV2ContractsComplete,
      blockers,
      warnings,
      readyForResearchPackBuilder: blockers === 0,
      readyForGenerationSchemaV2: blockers === 0,
      readyForGenerationV2: generationV2ContractsComplete,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    registry,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV algorithm domain registry V2 packet: ${report.status}`);
  console.log(`Required domains: ${report.summary.requiredDomains}`);
  console.log(`Registry domains: ${report.summary.registryDomains}`);
  console.log(`App atlas records: ${report.summary.appAtlasRecords}`);
  console.log(`Target-sensitive records covered: ${report.summary.targetSensitiveRecordsCovered}/${report.summary.targetSensitiveRecords}`);
  console.log(`AI prompt entrypoints covered: ${report.summary.aiPromptEntrypointsCovered}/${report.summary.aiPromptEntrypoints}`);
  console.log(`Ready for research pack builder: ${report.summary.readyForResearchPackBuilder ? 'yes' : 'no'}`);
  console.log(`Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();

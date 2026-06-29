import fs from 'node:fs';
import path from 'node:path';

type HeisenbergLocale = 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type GateStatus = 'PASS' | 'HOLD' | 'NA';

type CliOptions = {
  batchManifestPath?: string;
  uiAuditPath?: string;
  semanticAuditPath?: string;
  semanticClearanceValidationPath?: string;
  quizRepairPlanPath?: string;
  quizValidationPath?: string;
  releaseEvidencePath?: string;
  outputDir?: string;
  generatedAt?: string;
  strict?: boolean;
};

type JsonRecord = Record<string, unknown>;

type GateSummary = {
  status: GateStatus;
  blockers: string[];
  warnings: string[];
  counts?: Record<string, number | string | boolean | null>;
};

type LocaleReadiness = {
  locale: HeisenbergLocale;
  status: 'READY' | 'HOLD';
  progressPercent: number;
  passedRequiredGates: number;
  requiredGates: number;
  gates: {
    batchCoverage: GateSummary;
    uiLocale: GateSummary;
    semantic: GateSummary;
    quizPayloadRepair: GateSummary;
    productionPack: GateSummary;
    approvals: GateSummary;
    serverRuntime: GateSummary;
  };
  blockers: string[];
  warnings: string[];
};

type ProductionReadinessReport = {
  schemaVersion: 'heisenberg-production-readiness-gate-v1';
  mode: 'production-readiness-gate';
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  strict: boolean;
  locales: HeisenbergLocale[];
  summary: {
    locales: number;
    readyLocales: number;
    blockedLocales: number;
    blockers: number;
    warnings: number;
    semanticClearanceReady: boolean;
    sourceApplyCandidateReady: boolean;
    activationApproved: boolean;
    remoteLoadingEnabled: boolean;
    runtimeManifestRegistered: boolean;
    generatedApprovals: boolean;
    runtimeSourceMutation: boolean;
  };
  evidence: {
    batchManifestPath: string | null;
    uiAuditPath: string | null;
    semanticAuditPath: string | null;
    semanticClearanceValidationPath: string | null;
    quizRepairPlanPath: string | null;
    quizValidationPath: string | null;
    releaseEvidencePath: string | null;
  };
  languages: LocaleReadiness[];
  blockers: string[];
  nextActions: string[];
};

type WriteResult = {
  report: ProductionReadinessReport;
  outputDir: string;
  jsonPath: string;
  markdownPath: string;
};

const HEISENBERG_LOCALES: HeisenbergLocale[] = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const STRUCTURED_QUIZ_LOCALES = new Set<HeisenbergLocale>(['pt-BR', 'vi', 'id', 'tr', 'pl']);
const SHA256_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const PLACEHOLDER_PATTERN = /^(?:todo|tbd|pending|blank|example|sample|fill[_ -]?me|replace[_ -]?me|n\/a|na|none|null)$/i;
const SOURCE_PATH_FIELDS = [
  'batchManifestPath',
  'uiAuditPath',
  'semanticAuditPath',
  'quizValidationPath',
  'productionReadinessGatePath',
  'sourceApplyCandidatePath',
] as const;
const QUIZ_ORDINAL_BLOCKER_CODES = new Set([
  'quiz-payload-ordinal-mismatch',
  'quiz-payload-ordinal-ambiguous',
  'quiz-payload-ordinal-drift',
  'quiz-payload-without-source-entry',
]);

export function writeHeisenbergProductionReadinessGate(
  repoRoot: string,
  options: CliOptions = {},
): WriteResult {
  const report = buildHeisenbergProductionReadinessReport(repoRoot, options);
  const outputDir = resolveAllowedPath(
    repoRoot,
    options.outputDir,
    path.join('docs', 'heisenberg', 'production-readiness', timestampSlug(report.generatedAt)),
    'Heisenberg production readiness output',
  );
  const jsonPath = path.join(outputDir, 'production_readiness_gate.json');
  const markdownPath = path.join(outputDir, 'production_readiness_gate.md');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${renderMarkdown(report)}\n`, 'utf8');

  return { report, outputDir, jsonPath, markdownPath };
}

export function buildHeisenbergProductionReadinessReport(
  repoRoot: string,
  options: CliOptions = {},
): ProductionReadinessReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const evidencePaths = resolveEvidencePaths(repoRoot, options);
  const batchManifest = readJsonIfExists<JsonRecord>(evidencePaths.batchManifestPath);
  const uiAudit = readJsonIfExists<JsonRecord>(evidencePaths.uiAuditPath);
  const semanticAudit = readJsonIfExists<JsonRecord>(evidencePaths.semanticAuditPath);
  const semanticClearanceValidation = readJsonIfExists<JsonRecord>(evidencePaths.semanticClearanceValidationPath);
  const quizRepairPlan = readJsonIfExists<JsonRecord>(evidencePaths.quizRepairPlanPath);
  const quizValidation = readJsonIfExists<JsonRecord>(evidencePaths.quizValidationPath);
  const releaseEvidence = readJsonIfExists<JsonRecord>(evidencePaths.releaseEvidencePath);

  const releaseGlobalBlockers = validateReleaseEvidenceEnvelope(repoRoot, releaseEvidence);
  const languages: LocaleReadiness[] = HEISENBERG_LOCALES.map((locale) => {
    const gates = {
      batchCoverage: batchCoverageGate(repoRoot, locale, batchManifest),
      uiLocale: uiGate(locale, uiAudit),
      semantic: semanticGate(locale, semanticAudit, semanticClearanceValidation),
      quizPayloadRepair: quizRepairGate(locale, quizRepairPlan, quizValidation),
      productionPack: productionPackGate(locale, releaseEvidence, releaseGlobalBlockers),
      approvals: approvalsGate(locale, releaseEvidence, releaseGlobalBlockers),
      serverRuntime: serverRuntimeGate(locale, releaseEvidence, releaseGlobalBlockers),
    };
    const requiredGates = Object.values(gates).filter((gate) => gate.status !== 'NA');
    const passedRequiredGates = requiredGates.filter((gate) => gate.status === 'PASS').length;
    const blockers = uniqueStrings(Object.values(gates).flatMap((gate) => gate.blockers));
    const warnings = uniqueStrings(Object.values(gates).flatMap((gate) => gate.warnings));

    return {
      locale,
      status: blockers.length === 0 ? 'READY' as const : 'HOLD' as const,
      progressPercent: Math.round((passedRequiredGates / Math.max(requiredGates.length, 1)) * 100),
      passedRequiredGates,
      requiredGates: requiredGates.length,
      gates,
      blockers,
      warnings,
    };
  });

  const blockers = uniqueStrings(languages.flatMap((language) =>
    language.blockers.map((blocker) => `${language.locale}: ${blocker}`),
  ));
  const warnings = uniqueStrings(languages.flatMap((language) =>
    language.warnings.map((warning) => `${language.locale}: ${warning}`),
  ));
  const readinessStatus = languages.every((language) => language.status === 'READY') ? 'PASS' : 'HOLD';

  return {
    schemaVersion: 'heisenberg-production-readiness-gate-v1',
    mode: 'production-readiness-gate',
    generatedAt,
    status: readinessStatus,
    strict: Boolean(options.strict),
    locales: HEISENBERG_LOCALES,
    summary: {
      locales: HEISENBERG_LOCALES.length,
      readyLocales: languages.filter((language) => language.status === 'READY').length,
      blockedLocales: languages.filter((language) => language.status === 'HOLD').length,
      blockers: blockers.length,
      warnings: warnings.length,
      semanticClearanceReady: valueAt(semanticClearanceValidation, 'status') === 'PASS',
      sourceApplyCandidateReady: valueAt(quizValidation, 'sourceApplyCandidateReady') === true,
      activationApproved: valueAt(releaseEvidence, 'activationApproved') === true,
      remoteLoadingEnabled: valueAt(releaseEvidence, 'remoteLoadingEnabled') === true,
      runtimeManifestRegistered: valueAt(releaseEvidence, 'runtimeManifestRegistered') === true,
      generatedApprovals: valueAt(releaseEvidence, 'generatedApprovals') === true,
      runtimeSourceMutation: valueAt(releaseEvidence, 'runtimeSourceMutation') === true,
    },
    evidence: {
      batchManifestPath: relativeOrNull(repoRoot, evidencePaths.batchManifestPath),
      uiAuditPath: relativeOrNull(repoRoot, evidencePaths.uiAuditPath),
      semanticAuditPath: relativeOrNull(repoRoot, evidencePaths.semanticAuditPath),
      semanticClearanceValidationPath: relativeOrNull(repoRoot, evidencePaths.semanticClearanceValidationPath),
      quizRepairPlanPath: relativeOrNull(repoRoot, evidencePaths.quizRepairPlanPath),
      quizValidationPath: relativeOrNull(repoRoot, evidencePaths.quizValidationPath),
      releaseEvidencePath: relativeOrNull(repoRoot, evidencePaths.releaseEvidencePath),
    },
    languages,
    blockers,
    nextActions: buildNextActions(languages),
  };
}

function resolveEvidencePaths(repoRoot: string, options: CliOptions): Record<string, string | null> {
  const quizRepairPlanPath = resolveOptionalAllowedPath(
    repoRoot,
    options.quizRepairPlanPath,
    findLatestReport(repoRoot, ['docs', 'heisenberg', 'quiz-payload-ordinal-repair'], 'repair_plan.json'),
    'Heisenberg quiz repair plan input',
  );

  return {
    batchManifestPath: resolveOptionalAllowedPath(
      repoRoot,
      options.batchManifestPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'batch'], 'manifest.json'),
      'Heisenberg batch manifest input',
    ),
    uiAuditPath: resolveOptionalAllowedPath(
      repoRoot,
      options.uiAuditPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'ui'], 'ui_locale_audit.json'),
      'Heisenberg UI audit input',
    ),
    semanticAuditPath: resolveOptionalAllowedPath(
      repoRoot,
      options.semanticAuditPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'semantic'], 'semantic_audit.json'),
      'Heisenberg semantic audit input',
    ),
    semanticClearanceValidationPath: resolveOptionalAllowedPath(
      repoRoot,
      options.semanticClearanceValidationPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'semantic-clearance'], 'semantic_clearance_validation.json'),
      'Heisenberg semantic clearance validation input',
    ),
    quizRepairPlanPath,
    quizValidationPath: resolveOptionalAllowedPath(
      repoRoot,
      options.quizValidationPath,
      quizRepairPlanPath ? path.join(path.dirname(quizRepairPlanPath), 'filled_work_order_validation.json') : null,
      'Heisenberg quiz filled work-order validation input',
    ),
    releaseEvidencePath: resolveOptionalAllowedPath(
      repoRoot,
      options.releaseEvidencePath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'production-release-evidence'], 'release_evidence.json'),
      'Heisenberg production release evidence input',
    ),
  };
}

function batchCoverageGate(repoRoot: string, locale: HeisenbergLocale, batchManifest: JsonRecord | null): GateSummary {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const counts: GateSummary['counts'] = {};

  if (!batchManifest) {
    return hold('batch manifest is missing');
  }

  const runs = arrayAt(batchManifest, 'runs');
  const run = runs.find((row) => isRecord(row) && valueAt(row, 'locale') === locale) as JsonRecord | undefined;
  if (!run) {
    blockers.push('batch manifest has no run for this locale');
  } else if (valueAt(run, 'ok') !== true || valueAt(run, 'status') !== 0) {
    blockers.push(`batch run failed with status ${String(valueAt(run, 'status'))}`);
  }

  const localeManifest = readJsonIfExists<JsonRecord>(findLatestLocaleManifest(repoRoot, locale));
  if (localeManifest) {
    const localizedItemsForBlocks = numberAt(localeManifest, 'localizedItemsForBlocks');
    const localizedItemsAll = numberAt(localeManifest, 'localizedItemsAll');
    const existingAudit = recordAt(localeManifest, 'existingLocaleAudit');
    const coverage = recordAt(localeManifest, 'batchLocaleCoverage');
    counts.localizedItemsForBlocks = localizedItemsForBlocks;
    counts.localizedItemsAll = localizedItemsAll;
    counts.existingLocaleBlockers = existingAudit ? numberAt(existingAudit, 'blockers') : null;
    counts.partialUnits = coverage ? numberAt(coverage, 'partialUnits') : null;
    counts.missingAllLocaleUnits = coverage ? numberAt(coverage, 'missingAllLocaleUnits') : null;

    if (existingAudit && numberAt(existingAudit, 'blockers') > 0) {
      blockers.push(`existing-locale audit has ${numberAt(existingAudit, 'blockers')} blocker(s)`);
    }
    if (coverage) {
      const missingByLocale = recordAt(coverage, 'missingByLocale');
      const missingAllByLocale = recordAt(coverage, 'missingAllByLocale');
      const missingUnits = missingByLocale ? numberAt(missingByLocale, locale) : 0;
      const missingAllUnits = missingAllByLocale ? numberAt(missingAllByLocale, locale) : 0;
      if (missingUnits > 0) blockers.push(`batch coverage has ${missingUnits} missing unit(s) for this locale`);
      if (missingAllUnits > 0) blockers.push(`batch coverage has ${missingAllUnits} missing-all unit(s) for this locale`);
      if (numberAt(coverage, 'partialUnits') > 0) warnings.push(`batch coverage still reports ${numberAt(coverage, 'partialUnits')} partial unit(s) globally`);
    }
  } else {
    warnings.push('per-locale manifest was not found; using batch run status only');
  }

  return blockers.length ? { status: 'HOLD', blockers, warnings, counts } : { status: 'PASS', blockers, warnings, counts };
}

function uiGate(locale: HeisenbergLocale, uiAudit: JsonRecord | null): GateSummary {
  if (!uiAudit) return hold('UI locale audit is missing');

  const blockers: string[] = [];
  const warnings: string[] = [];
  const findings = arrayAt(uiAudit, 'findings').filter(isRecord);
  const localeFindings = findings.filter((finding) => findingBelongsToLocale(finding, locale));
  const localeBlockers = localeFindings.filter((finding) => valueAt(finding, 'severity') === 'blocker').length;
  const localeWarnings = localeFindings.filter((finding) => valueAt(finding, 'severity') === 'warning').length;

  if (valueAt(uiAudit, 'activationReady') !== true) blockers.push('UI audit activationReady is false');
  if (localeBlockers > 0) blockers.push(`UI audit has ${localeBlockers} blocker finding(s) for this locale`);
  if (localeWarnings > 0) warnings.push(`UI audit has ${localeWarnings} warning finding(s) for this locale`);

  return blockers.length
    ? { status: 'HOLD', blockers, warnings, counts: { localeBlockers, localeWarnings } }
    : { status: 'PASS', blockers, warnings, counts: { localeBlockers, localeWarnings } };
}

function semanticGate(
  locale: HeisenbergLocale,
  semanticAudit: JsonRecord | null,
  semanticClearanceValidation: JsonRecord | null,
): GateSummary {
  if (!semanticAudit) return hold('semantic audit is missing');

  const findings = arrayAt(semanticAudit, 'findings').filter(isRecord);
  const localeFindings = findings.filter((finding) => findingBelongsToLocale(finding, locale));
  const sharedQuizBlockers = STRUCTURED_QUIZ_LOCALES.has(locale)
    ? findings.filter((finding) => isSharedQuizOrdinalBlocker(finding)).length
    : 0;
  const localeBlockers = localeFindings.filter((finding) => valueAt(finding, 'severity') === 'blocker').length;
  const localeWarnings = localeFindings.filter((finding) => valueAt(finding, 'severity') === 'warning').length;
  const clearanceReady = semanticClearanceValidationReadyForLocale(semanticClearanceValidation, locale, localeWarnings);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (sharedQuizBlockers > 0) blockers.push(`shared structured quiz payload repair has ${sharedQuizBlockers} blocker(s)`);
  if (localeBlockers > 0) blockers.push(`semantic audit has ${localeBlockers} locale-specific blocker(s)`);
  if (localeWarnings > 0) {
    warnings.push(`semantic audit has ${localeWarnings} warning finding(s) for this locale`);
    if (!clearanceReady) blockers.push(`semantic warnings require reviewer clearance or fixes (${localeWarnings})`);
  }

  return blockers.length
    ? { status: 'HOLD', blockers, warnings, counts: { sharedQuizBlockers, localeBlockers, localeWarnings, clearanceReady } }
    : { status: 'PASS', blockers, warnings, counts: { sharedQuizBlockers, localeBlockers, localeWarnings, clearanceReady } };
}

function semanticClearanceValidationReadyForLocale(
  semanticClearanceValidation: JsonRecord | null,
  locale: HeisenbergLocale,
  localeWarnings: number,
): boolean {
  if (localeWarnings === 0) return true;
  if (!semanticClearanceValidation || valueAt(semanticClearanceValidation, 'status') !== 'PASS') return false;
  const locales = recordAt(semanticClearanceValidation, 'locales');
  const localeReport = locales ? recordAt(locales, locale) : null;
  if (!localeReport) return false;
  if (numberAt(localeReport, 'warnings') !== localeWarnings) return false;
  if (numberAt(localeReport, 'cleared') !== localeWarnings) return false;
  return arrayAt(localeReport, 'blockers').length === 0;
}

function quizRepairGate(
  locale: HeisenbergLocale,
  quizRepairPlan: JsonRecord | null,
  quizValidation: JsonRecord | null,
): GateSummary {
  if (!STRUCTURED_QUIZ_LOCALES.has(locale)) {
    return { status: 'NA', blockers: [], warnings: [], counts: { structuredPayloadLocale: false } };
  }
  if (!quizRepairPlan) return hold('quiz payload repair plan is missing');
  if (!quizValidation) return hold('quiz payload filled work-order validation is missing');

  const blockers: string[] = [];
  const warnings: string[] = [];
  const validationBlockers = arrayAt(quizValidation, 'blockers').map(String);
  const residualFindings = arrayAt(quizValidation, 'finalResidualOrdinalFindings');
  const candidate = recordAt(quizRepairPlan, 'candidate');
  const candidateSummary = candidate ? recordAt(candidate, 'summary') : null;

  if (valueAt(quizValidation, 'status') !== 'PASS') blockers.push(`quiz validation status is ${String(valueAt(quizValidation, 'status'))}`);
  if (valueAt(quizValidation, 'sourceApplyCandidateReady') !== true) blockers.push('quiz source-apply candidate is not ready');
  if (valueAt(quizValidation, 'generatedDecisionsOrEvidence') === true) blockers.push('quiz validation contains generated decisions/evidence');
  if (validationBlockers.length > 0) blockers.push(...validationBlockers);
  if (residualFindings.length > 0) blockers.push(`quiz validation still has ${residualFindings.length} residual ordinal finding(s)`);

  return blockers.length
    ? {
        status: 'HOLD',
        blockers: uniqueStrings(blockers),
        warnings,
        counts: {
          acceptedRemaps: candidateSummary ? numberAt(candidateSummary, 'acceptedRemaps') : null,
          sourceEntryCoverageDrops: candidateSummary ? numberAt(candidateSummary, 'sourceEntryCoverageDrops') : null,
          unresolvedMultipleTargets: candidateSummary ? numberAt(candidateSummary, 'unresolvedMultipleTargets') : null,
          residualOrdinalBlockers: candidateSummary ? numberAt(candidateSummary, 'residualOrdinalBlockers') : null,
        },
      }
    : {
        status: 'PASS',
        blockers,
        warnings,
        counts: {
          acceptedRemaps: candidateSummary ? numberAt(candidateSummary, 'acceptedRemaps') : null,
          residualOrdinalBlockers: 0,
        },
      };
}

function productionPackGate(
  locale: HeisenbergLocale,
  releaseEvidence: JsonRecord | null,
  releaseGlobalBlockers: string[],
): GateSummary {
  const blockers = releaseGlobalBlockers.filter((blocker) => blocker.includes('release evidence'));
  if (!releaseEvidence) return hold('production release evidence is missing');

  const packArtifacts = recordAt(releaseEvidence, 'packArtifacts');
  const localePack = packArtifacts ? recordAt(packArtifacts, locale) : null;
  if (!localePack) blockers.push('production pack artifact evidence is missing for this locale');
  if (valueAt(releaseEvidence, 'packHashesRebuiltFromCurrentContent') !== true) {
    blockers.push('pack hashes were not proven rebuilt from current fixed content');
  }
  for (const field of ['contentHash', 'packHash'] as const) {
    const value = localePack ? valueAt(localePack, field) : undefined;
    if (!filledString(value)) {
      blockers.push(`production pack artifact is missing ${field}`);
    } else if (!SHA256_HASH_PATTERN.test(value)) {
      blockers.push(`production pack artifact ${field} must be sha256:<64 hex>`);
    }
  }
  if (!filledString(localePack ? valueAt(localePack, 'serverArtifactId') : undefined)) {
    blockers.push('production pack artifact is missing serverArtifactId');
  }
  const deployedAt = localePack ? valueAt(localePack, 'deployedAt') : undefined;
  if (!filledString(deployedAt)) {
    blockers.push('production pack artifact is missing deployedAt');
  } else if (Number.isNaN(Date.parse(deployedAt))) {
    blockers.push('production pack artifact deployedAt must be a valid timestamp');
  }

  return blockers.length ? { status: 'HOLD', blockers: uniqueStrings(blockers), warnings: [] } : pass();
}

function approvalsGate(
  locale: HeisenbergLocale,
  releaseEvidence: JsonRecord | null,
  releaseGlobalBlockers: string[],
): GateSummary {
  const blockers = releaseGlobalBlockers.filter((blocker) =>
    blocker.includes('generated approval') || blocker.includes('schemaVersion'),
  );
  if (!releaseEvidence) return hold('production reviewer/locale approval evidence is missing');

  const approvals = recordAt(releaseEvidence, 'approvals');
  const localeApproval = approvals ? recordAt(approvals, locale) : null;
  for (const field of ['reviewerEvidenceId', 'localeOwnerEvidenceId', 'productOwnerEvidenceId']) {
    if (!filledString(localeApproval ? valueAt(localeApproval, field) : undefined)) {
      blockers.push(`approval evidence is missing ${field}`);
    }
  }

  return blockers.length ? { status: 'HOLD', blockers: uniqueStrings(blockers), warnings: [] } : pass();
}

function serverRuntimeGate(
  locale: HeisenbergLocale,
  releaseEvidence: JsonRecord | null,
  releaseGlobalBlockers: string[],
): GateSummary {
  const blockers = releaseGlobalBlockers.filter((blocker) =>
    !blocker.includes('release evidence') && !blocker.includes('generated approval') && !blocker.includes('schemaVersion'),
  );
  if (!releaseEvidence) return hold('server/runtime activation evidence is missing');

  if (valueAt(releaseEvidence, 'activationApproved') !== true) blockers.push('activationApproved is not true');
  if (valueAt(releaseEvidence, 'remoteLoadingEnabled') !== true) blockers.push('remote loading is not enabled for release');
  if (valueAt(releaseEvidence, 'runtimeManifestRegistered') !== true) blockers.push('runtime manifest is not registered');
  if (valueAt(releaseEvidence, 'runtimeSourceMutation') === true) blockers.push('runtime source mutation is not allowed');

  const runtimeGates = recordAt(releaseEvidence, 'runtimeGates');
  const localeRuntime = runtimeGates ? recordAt(runtimeGates, locale) : null;
  for (const field of ['offlineCacheEvidenceId', 'rollbackEvidenceId', 'storageRulesEvidenceId']) {
    if (!filledString(localeRuntime ? valueAt(localeRuntime, field) : undefined)) {
      blockers.push(`runtime gate evidence is missing ${field}`);
    }
  }

  return blockers.length ? { status: 'HOLD', blockers: uniqueStrings(blockers), warnings: [] } : pass();
}

function validateReleaseEvidenceEnvelope(repoRoot: string, releaseEvidence: JsonRecord | null): string[] {
  if (!releaseEvidence) return ['production release evidence artifact is missing'];
  const blockers: string[] = [];
  if (valueAt(releaseEvidence, 'schemaVersion') !== 'heisenberg-production-release-evidence-v1') {
    blockers.push('production release evidence schemaVersion is invalid');
  }
  if (valueAt(releaseEvidence, 'generatedApprovals') !== false) {
    blockers.push('generated approvals are not accepted for production release');
  }
  if (valueAt(releaseEvidence, 'activationApproved') !== true) {
    blockers.push('activationApproved is not true');
  }
  if (valueAt(releaseEvidence, 'remoteLoadingEnabled') !== true) {
    blockers.push('remoteLoadingEnabled is not true');
  }
  if (valueAt(releaseEvidence, 'runtimeManifestRegistered') !== true) {
    blockers.push('runtimeManifestRegistered is not true');
  }
  if (valueAt(releaseEvidence, 'packHashesRebuiltFromCurrentContent') !== true) {
    blockers.push('pack hashes were not rebuilt from current content');
  }
  if (valueAt(releaseEvidence, 'runtimeSourceMutation') === true) {
    blockers.push('runtime source mutation is not allowed');
  }
  const sourceEvidence = recordAt(releaseEvidence, 'sourceEvidence');
  for (const field of SOURCE_PATH_FIELDS) {
    const value = sourceEvidence ? valueAt(sourceEvidence, field) : undefined;
    if (!filledString(value)) {
      blockers.push(`sourceEvidence.${field} is required`);
      continue;
    }
    const resolved = resolveEvidenceFilePath(repoRoot, value);
    if (!resolved) {
      blockers.push(`sourceEvidence.${field} must stay under docs/heisenberg or .codex-tmp`);
    } else if (!fs.existsSync(resolved)) {
      blockers.push(`sourceEvidence.${field} file does not exist`);
    }
  }
  if (!filledString(sourceEvidence ? valueAt(sourceEvidence, 'contentRevisionId') : undefined)) {
    blockers.push('sourceEvidence.contentRevisionId is required');
  }
  return blockers;
}

function findingBelongsToLocale(finding: JsonRecord, locale: HeisenbergLocale): boolean {
  if (valueAt(finding, 'locale') === locale) return true;
  if (valueAt(finding, 'keyPath') === locale) return true;
  const missing = arrayAt(finding, 'missing').map(String);
  return missing.includes(locale);
}

function isSharedQuizOrdinalBlocker(finding: JsonRecord): boolean {
  return valueAt(finding, 'severity') === 'blocker' &&
    QUIZ_ORDINAL_BLOCKER_CODES.has(String(valueAt(finding, 'code')));
}

function buildNextActions(languages: LocaleReadiness[]): string[] {
  const actions = new Set<string>();
  if (languages.some((language) => language.gates.quizPayloadRepair.status === 'HOLD')) {
    actions.add('Fill and validate the external quiz payload repair work-order before any source apply.');
  }
  if (languages.some((language) => language.gates.semantic.status === 'HOLD')) {
    actions.add('Clear semantic blockers and reviewer-clear semantic warnings with evidence.');
  }
  if (languages.some((language) => language.gates.uiLocale.status === 'HOLD')) {
    actions.add('Clear UI locale findings and rerun the UI audit until activationReady is true.');
  }
  if (languages.some((language) => language.gates.productionPack.status === 'HOLD')) {
    actions.add('Rebuild production pack/server artifacts from the fixed content and record new hashes.');
  }
  if (languages.some((language) => language.gates.approvals.status === 'HOLD')) {
    actions.add('Collect real reviewer, locale-owner, and product-owner approval evidence for every locale.');
  }
  if (languages.some((language) => language.gates.serverRuntime.status === 'HOLD')) {
    actions.add('Record server/runtime activation evidence, including remote loading, manifest, offline cache, storage rules, and rollback.');
  }
  return [...actions];
}

function renderMarkdown(report: ProductionReadinessReport): string {
  const rows = report.languages.map((language) => {
    const gate = (summary: GateSummary) => summary.status;
    const blockers = language.blockers.slice(0, 3).join('; ') || 'none';
    return `| ${language.locale} | ${language.status} | ${language.progressPercent}% (${language.passedRequiredGates}/${language.requiredGates}) | ${gate(language.gates.batchCoverage)} | ${gate(language.gates.uiLocale)} | ${gate(language.gates.semantic)} | ${gate(language.gates.quizPayloadRepair)} | ${gate(language.gates.productionPack)} | ${gate(language.gates.approvals)} | ${gate(language.gates.serverRuntime)} | ${blockers} |`;
  });

  return [
    '# Heisenberg Production Readiness Gate',
    '',
    `- Status: ${report.status}`,
    `- Generated at: ${report.generatedAt}`,
    `- Ready locales: ${report.summary.readyLocales}/${report.summary.locales}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Semantic clearance ready: ${report.summary.semanticClearanceReady}`,
    `- Source apply candidate ready: ${report.summary.sourceApplyCandidateReady}`,
    `- Activation approved: ${report.summary.activationApproved}`,
    `- Remote loading enabled: ${report.summary.remoteLoadingEnabled}`,
    '',
    '| Locale | Status | Progress | Batch | UI | Semantic | Quiz | Pack | Approvals | Server | Top blockers |',
    '| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Evidence',
    '',
    ...Object.entries(report.evidence).map(([key, value]) => `- ${key}: ${value ?? 'missing'}`),
    '',
    '## Next actions',
    '',
    ...(report.nextActions.length ? report.nextActions.map((action) => `- ${action}`) : ['- None']),
  ].join('\n');
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--batch-manifest') {
      options.batchManifestPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--ui-audit') {
      options.uiAuditPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--semantic-audit') {
      options.semanticAuditPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--semantic-clearance-validation') {
      options.semanticClearanceValidationPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--quiz-repair-plan') {
      options.quizRepairPlanPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--quiz-validation') {
      options.quizValidationPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--release-evidence') {
      options.releaseEvidencePath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out-dir') {
      options.outputDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--strict') {
      options.strict = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function hold(blocker: string): GateSummary {
  return { status: 'HOLD', blockers: [blocker], warnings: [] };
}

function pass(): GateSummary {
  return { status: 'PASS', blockers: [], warnings: [] };
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function timestampSlug(value: string): string {
  return value.replace(/[:.]/g, '-');
}

function localeSlug(locale: HeisenbergLocale): string {
  return locale.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function findLatestReport(repoRoot: string, segments: string[], fileName: string): string | null {
  const root = path.join(repoRoot, ...segments);
  if (!fs.existsSync(root)) return null;
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .find((entry) => fs.existsSync(path.join(root, entry, fileName)));
  return latest ? path.join(root, latest, fileName) : null;
}

function findLatestLocaleManifest(repoRoot: string, locale: HeisenbergLocale): string | null {
  return findLatestReport(repoRoot, ['docs', 'heisenberg', localeSlug(locale)], 'manifest.json');
}

function resolveOptionalAllowedPath(repoRoot: string, requested: string | undefined, fallback: string | null, label: string): string | null {
  if (!requested && !fallback) return null;
  return resolveAllowedPath(repoRoot, requested, fallback ?? '', label);
}

function resolveAllowedPath(repoRoot: string, requested: string | undefined, fallback: string, label: string): string {
  const resolved = path.resolve(repoRoot, requested ?? fallback);
  const allowedRoots = [
    path.resolve(repoRoot, '.codex-tmp'),
    path.resolve(repoRoot, 'docs', 'heisenberg'),
  ];
  if (!allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))) {
    throw new Error(`${label} must stay under .codex-tmp or docs/heisenberg`);
  }
  return resolved;
}

function readJsonIfExists<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) as T;
}

function relativeOrNull(repoRoot: string, filePath: string | null): string | null {
  return filePath ? path.relative(repoRoot, filePath).replace(/\\/g, '/') : null;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function valueAt(record: unknown, key: string): unknown {
  return isRecord(record) ? record[key] : undefined;
}

function recordAt(record: unknown, key: string): JsonRecord | null {
  const value = valueAt(record, key);
  return isRecord(value) ? value : null;
}

function arrayAt(record: unknown, key: string): unknown[] {
  const value = valueAt(record, key);
  return Array.isArray(value) ? value : [];
}

function numberAt(record: unknown, key: string): number {
  const value = valueAt(record, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function filledString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !PLACEHOLDER_PATTERN.test(trimmed);
}

function resolveEvidenceFilePath(repoRoot: string, requestedPath: unknown): string | null {
  if (typeof requestedPath !== 'string') return null;
  const resolved = path.resolve(repoRoot, requestedPath);
  const allowedRoots = [
    path.resolve(repoRoot, '.codex-tmp'),
    path.resolve(repoRoot, 'docs', 'heisenberg'),
  ];
  return allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))
    ? resolved
    : null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

if (require.main === module) {
  try {
    const options = parseCli(process.argv.slice(2));
    const result = writeHeisenbergProductionReadinessGate(process.cwd(), options);
    console.log(`Heisenberg production readiness gate: ${result.report.status}`);
    console.log(`Ready locales: ${result.report.summary.readyLocales}/${result.report.summary.locales}`);
    console.log(`Blockers: ${result.report.summary.blockers}`);
    console.log(`Report: ${relativeOrNull(process.cwd(), result.jsonPath)}`);
    if (options.strict && result.report.status !== 'PASS') process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

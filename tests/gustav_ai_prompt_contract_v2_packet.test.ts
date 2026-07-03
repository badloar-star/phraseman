import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(
  ROOT,
  'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/ai_prompt_contract_v2_packet.json',
);
const CONTRACT_PATH = path.join(
  ROOT,
  'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/research/fr_ai_prompt_contract_v2.json',
);
const SCRIPT_PATH = path.join(ROOT, 'scripts/gustav_ai_prompt_contract_v2_packet.ts');

const CRITICAL_SURFACE_CLASSES = [
  'mistake_explanation',
  'weekly_review',
  'stats_insights',
  'premium_dialog_or_paywall',
  'ai_dialog',
] as const;

const REQUIRED_CRITICAL_FILES = [
  'app/ai_mistake_explain_client.ts',
  'app/stats_insights_client.ts',
  'app/weekly_review_client.ts',
  'app/ai_dialog_client.ts',
  'app/ai_dialog_session.tsx',
  'functions/src/mistake_explain.ts',
  'functions/src/explain/mistake_explain_cache.ts',
  'functions/src/weekly_review.ts',
  'functions/src/stats_insights.ts',
  'functions/src/premium_dialog.ts',
];

describe('Gustav AI prompt contract V2 packet', () => {
  it('keeps every critical AI surface language-scoped, cache-scoped and blocked before generation/apply', () => {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const source = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const contracts = contract.entrypointContracts;
    const expectedEntrypoints = report.summary.aiPromptEntrypointsExpected;
    const criticalExpected = report.summary.criticalSurfaceContracts;
    const criticalContracts = contracts.filter((entry: any) =>
      CRITICAL_SURFACE_CLASSES.includes(entry.featureRiskClass),
    );

    expect(report.status).toBe('PASS');
    expect(report.summary.targetLocale).toBe('fr');
    expect(expectedEntrypoints).toBeGreaterThanOrEqual(164);
    expect(report.summary.aiPromptEntrypointContracts).toBe(expectedEntrypoints);
    expect(report.summary.aiPromptEntrypointFilesExist).toBe(expectedEntrypoints);
    expect(report.summary.criticalSurfaceClassesCovered).toBe(CRITICAL_SURFACE_CLASSES.length);
    expect(criticalExpected).toBeGreaterThanOrEqual(55);
    expect(report.summary.criticalSurfaceContractsWithLanguageDimensions).toBe(criticalExpected);
    expect(report.summary.criticalSurfaceContractsWithCacheContract).toBe(criticalExpected);
    expect(report.summary.criticalSurfaceContractsWithRejectBeforeReturn).toBe(criticalExpected);
    expect(report.summary.criticalSurfaceContractsWithRejectBeforeCache).toBe(criticalExpected);
    expect(report.summary.criticalSurfaceContractsWithLanguageSafeFallback).toBe(criticalExpected);
    expect(report.summary.criticalSurfaceContractsGenerationBlocked).toBe(criticalExpected);
    expect(report.summary.criticalSurfaceRequiredFilesCovered).toBe(REQUIRED_CRITICAL_FILES.length);
    expect(report.summary.readyForGenerationV2).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.summary.fixtureProbesPassed).toBe(report.summary.fixtureProbes);

    for (const requiredFile of REQUIRED_CRITICAL_FILES) {
      expect(contracts.some((entry: any) => entry.filePath === requiredFile)).toBe(true);
    }

    for (const entry of criticalContracts) {
      expect(entry.requiredLanguageDimensions).toMatchObject({
        targetLocale: true,
        targetStudyLanguage: true,
        sourceLocales: true,
        uiLocale: true,
        generationSchemaVersion: true,
        researchPackVersion: true,
        pedagogyBlueprintVersion: true,
      });
      expect(entry.cacheContract.requiredKeyDimensions).toEqual(expect.arrayContaining([
        'targetLocale',
        'targetStudyLanguage',
        'sourceLocales',
        'uiLocale',
        'domainId',
        'entrypointFile',
        'generationSchemaVersion',
        'researchPackVersion',
        'pedagogyBlueprintVersion',
      ]));
      expect(entry.cacheContract.rejectedFreshOutputMayBeCached).toBe(false);
      expect(entry.cacheContract.targetMismatchCacheFallbackAllowed).toBe(false);
      expect(entry.cacheContract.sourceLocaleMismatchCacheFallbackAllowed).toBe(false);
      expect(entry.cacheContract.uiLocaleMismatchCacheFallbackAllowed).toBe(false);
      expect(entry.outputContract.freshOutputLanguageGate).toBe('reject_before_return_and_cache');
      expect(entry.outputContract.rejectedFreshOutputMayReturn).toBe(false);
      expect(entry.outputContract.wrongLanguageFallbackAllowed).toBe(false);
      expect(entry.returnContract.mustReturnSafeFallbackOnReject).toBe(true);
      expect(entry.returnContract.safeFallbackMayContainTargetContent).toBe(false);
      expect(entry.activationStatus).toBe('blocked');
    }

    expect(source).toContain('critical_ai_surface_class_coverage_incomplete');
    expect(source).toContain('critical_ai_surface_file_coverage_incomplete');
    expect(source).toContain('critical_ai_surface_reject_before_cache_incomplete');
    expect(source).toContain('generation_open_before_quality_gate');
    expect(source).toContain('activation_policy_opened_generation');
  });
});

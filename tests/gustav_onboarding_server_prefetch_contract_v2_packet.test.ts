import fs from 'fs';
import path from 'path';
import { buildOnboardingServerPrefetchContractReport } from '../scripts/gustav_onboarding_server_prefetch_contract_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_onboarding_server_prefetch_contract_v2_packet.ts'),
  'utf8',
);

describe('Gustav onboarding server prefetch contract V2 packet', () => {
  it('passes when French onboarding is wired to an approved remote-only server prefetch contract', () => {
    const report = buildOnboardingServerPrefetchContractReport({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });
    expect(report.status).toBe('PASS');
    expect(report.summary.onboardingStudyTargetStepPresent).toBe(true);
    expect(report.summary.onboardingEnglishChoicePresent).toBe(true);
    expect(report.summary.onboardingFrenchChoicePresent).toBe(true);
    expect(report.summary.onboardingEnglishVisualMarkPresent).toBe(true);
    expect(report.summary.onboardingFrenchVisualMarkPresent).toBe(true);
    expect(report.summary.onboardingStartsFrenchPrefetch).toBe(true);
    expect(report.summary.onboardingRecordsFrenchPrefetchResult).toBe(true);
    expect(report.summary.frenchServerActivationGateApproved).toBe(true);
    expect(report.summary.frenchRegistrationsSourceLocaleScoped).toBe(true);
    expect(report.summary.frenchRegistrationSurfaces).toBe(6);
    expect(report.summary.frenchRegistrationSourceLocales).toBe(2);
    expect(report.summary.frenchRegistrationTotalAfterApproval).toBe(12);
    expect(report.summary.frenchRegistrationUrlScopeValid).toBe(true);
    expect(report.summary.frenchRegistrationUrlNoEnglishRefs).toBe(true);
    expect(report.summary.frenchRegistrationUrlNoUiLocaleRefs).toBe(true);
    expect(report.summary.frenchRegistrationRowPathSanitized).toBe(true);
    expect(report.summary.frenchPrefetchFailClosed).toBe(true);
    expect(report.summary.frenchPrefetchRecordIsSeparateFromActiveTarget).toBe(true);
    expect(report.summary.englishPrefetchDoesNotOverwriteFrenchRecord).toBe(true);
    expect(report.summary.bundledFrenchContentImported).toBe(false);
    expect(report.summary.englishPackRegistrationImported).toBe(false);
    expect(report.summary.activationApproved).toBe(true);
    expect(report.summary.readyForRuntimeDownloadActivation).toBe(true);
  });

  it('keeps the required production safeguards in the packet source', () => {
    expect(SOURCE).toContain('onboarding_study_target_step_missing');
    expect(SOURCE).toContain('onboarding_english_visual_mark_missing');
    expect(SOURCE).toContain('onboarding_french_visual_mark_missing');
    expect(SOURCE).toContain('french_server_activation_gate_not_approved');
    expect(SOURCE).toContain('french_registration_scope_invalid');
    expect(SOURCE).toContain('french_registration_source_locale_count_invalid');
    expect(SOURCE).toContain('french_registration_total_after_approval_invalid');
    expect(SOURCE).toContain('french_registration_url_scope_invalid');
    expect(SOURCE).toContain('french_registration_url_english_ref');
    expect(SOURCE).toContain('french_registration_url_ui_locale_ref');
    expect(SOURCE).toContain('french_registration_row_path_unsanitized');
    expect(SOURCE).toContain('french_prefetch_not_fail_closed');
    expect(SOURCE).toContain('onboarding_french_prefetch_result_record_missing');
    expect(SOURCE).toContain('french_prefetch_record_not_separate');
    expect(SOURCE).toContain('english_prefetch_overwrites_french_record');
    expect(SOURCE).toContain('bundled_french_content_imported');
    expect(SOURCE).toContain('english_pack_registration_imported');
    expect(SOURCE).toContain('productionAppFilesModifiedByThisScript: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('activationApproved: frenchServerActivationGateApproved');
    expect(SOURCE).toContain('productionApplyApproved: false');
  });
});

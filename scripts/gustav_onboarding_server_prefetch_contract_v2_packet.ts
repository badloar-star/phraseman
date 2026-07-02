import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  FRENCH_TARGET_REMOTE_SURFACES,
  getFrenchStudyTargetServerPackRegistrations,
} from '../app/french_target_remote_registration';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Report = {
  schemaVersion: 'gustav-onboarding-server-prefetch-contract-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    studyTarget: 'fr';
    onboardingStudyTargetStepPresent: boolean;
    onboardingEnglishChoicePresent: boolean;
    onboardingFrenchChoicePresent: boolean;
    onboardingEnglishVisualMarkPresent: boolean;
    onboardingFrenchVisualMarkPresent: boolean;
    onboardingPersistsRequestedTarget: boolean;
    onboardingStartsFrenchPrefetch: boolean;
    onboardingRecordsFrenchPrefetchResult: boolean;
    activationApproved: boolean;
    frenchServerActivationGateApproved: boolean;
    frenchRegistrationsSourceLocaleScoped: boolean;
    frenchRegistrationSurfaces: number;
    frenchRegistrationSourceLocales: number;
    frenchRegistrationTotalAfterApproval: number;
    frenchRegistrationUrlScopeValid: boolean;
    frenchRegistrationUrlNoEnglishRefs: boolean;
    frenchRegistrationUrlNoUiLocaleRefs: boolean;
    frenchRegistrationRowPathSanitized: boolean;
    frenchPrefetchFailClosed: boolean;
    frenchPrefetchUsesRemoteLoader: boolean;
    frenchPrefetchRecordIsSeparateFromActiveTarget: boolean;
    englishPrefetchDoesNotOverwriteFrenchRecord: boolean;
    bundledFrenchContentImported: boolean;
    englishPackRegistrationImported: boolean;
    blockers: number;
    warnings: number;
    readyForRuntimeDownloadActivation: boolean;
    readyForApply: false;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

const SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'];
const SOURCE_LOCALES = ['ru', 'uk'];
const UI_LOCALES = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

export function buildOnboardingServerPrefetchContractReport(input: {
  repoRoot: string;
  runDir: string;
  generatedAt?: string;
}): Report {
  const onboardingPath = path.join(input.repoRoot, 'components', 'CleanOnboarding.tsx');
  const registrationPath = path.join(input.repoRoot, 'app', 'french_target_remote_registration.ts');
  const prefetchPath = path.join(input.repoRoot, 'app', 'study_target_server_prefetch.ts');
  const onboarding = read(onboardingPath);
  const registration = read(registrationPath);
  const prefetch = read(prefetchPath);
  const findings: Finding[] = [];

  const onboardingStudyTargetStepPresent = onboarding.includes("'source'") &&
    onboarding.includes("'language'") &&
    onboarding.includes("case 'language': content = renderLanguage(); break;");
  // CleanOnboarding (июль 2026) подписывает языки на языке интерфейса
  // (native: 'Английский'/'Французский'), поэтому контракт проверяет
  // стабильную идентичность выбора (id + code), а не текст подписи.
  const onboardingEnglishChoicePresent = onboarding.includes("id: 'en'") && onboarding.includes("code: 'EN'");
  const onboardingFrenchChoicePresent = onboarding.includes("id: 'fr'") && onboarding.includes("code: 'FR'");
  // Визуальная метка выбора — иконка + testID. Прежний тотальный запрет
  // require('../assets/images/onboarding…') давал ложное срабатывание на
  // легитимный welcome-логотип clean-онбординга; запрещаем только старые
  // картинки-подписи языковых опций.
  const onboardingEnglishVisualMarkPresent =
    onboarding.includes('testID={`onboarding-language-${option.id}`}') &&
    onboarding.includes("icon: 'chatbubbles-outline'") &&
    !onboarding.includes("require('../assets/images/onboarding_language");
  const onboardingFrenchVisualMarkPresent =
    onboarding.includes('testID={`onboarding-language-${option.id}`}') &&
    onboarding.includes("icon: 'cafe-outline'") &&
    !onboarding.includes("require('../assets/images/onboarding_language");
  const onboardingPersistsRequestedTarget = onboarding.includes('ONBOARDING_REQUESTED_STUDY_TARGET_KEY') &&
    onboarding.includes('setStoredStudyTarget(target, lang)');
  const onboardingStartsFrenchPrefetch = onboarding.includes("prefetchAndRecordStudyTargetServerPack('fr', lang)");
  const onboardingRecordsFrenchPrefetchResult =
    onboarding.includes('prefetchAndRecordStudyTargetServerPack') &&
    prefetch.includes('ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY') &&
    prefetch.includes('prefetchAndRecordStudyTargetServerPack') &&
    prefetch.includes('AsyncStorage.setItem(ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY');
  // Активация серверных паков dev-гейтится: store-релиз закрыт до exact-approval,
  // dev/TestFlight работает. Литерал `return true;` был нарушением HOLD-governance.
  const frenchServerActivationGateApproved = registration.includes('isFrenchStudyTargetServerPackActivationApproved') &&
    registration.includes('return ENABLE_DEV_STUDY_TARGET_LANG;');
  const frenchRegistrationsSourceLocaleScoped = registration.includes('course-packs/fr/${sourceLocale}/${surface}/') &&
    registration.includes("normalizeFrenchTargetSourceLocale") &&
    registration.includes("normalized === 'ru' || normalized === 'uk'");
  const frenchRegistrationSurfaces = SURFACES.filter((surface) => registration.includes(`'${surface}'`)).length;
  const approvedRegistrations = SOURCE_LOCALES.flatMap((sourceLocale) =>
    getFrenchStudyTargetServerPackRegistrations(sourceLocale, () => true)
  );
  const frenchRegistrationSourceLocales = new Set(approvedRegistrations.map((item) => item.sourceLocale)).size;
  const frenchRegistrationTotalAfterApproval = approvedRegistrations.length;
  const frenchRegistrationUrlScopeValid =
    frenchRegistrationTotalAfterApproval === SOURCE_LOCALES.length * FRENCH_TARGET_REMOTE_SURFACES.length &&
    approvedRegistrations.every((item) =>
      item.studyTarget === 'fr' &&
      SOURCE_LOCALES.includes(item.sourceLocale) &&
      (FRENCH_TARGET_REMOTE_SURFACES as readonly string[]).includes(item.surface) &&
      item.manifestUrl.includes(`course-packs%2Ffr%2F${item.sourceLocale}%2F${item.surface}%2F`) &&
      item.rowUrl('rows/probe.jsonl').includes(`course-packs%2Ffr%2F${item.sourceLocale}%2F${item.surface}%2F`) &&
      item.manifestUrl.includes('%2Fmanifest.json') &&
      item.rowUrl('rows/probe.jsonl').includes('%2Frows%2Fprobe.jsonl')
    );
  const registrationUrls = approvedRegistrations.flatMap((item) => [
    item.manifestUrl,
    item.rowUrl('rows/probe.jsonl'),
  ]);
  const frenchRegistrationUrlNoEnglishRefs = registrationUrls.every((url) =>
    !url.includes('course-packs%2Fen%2F') && !url.includes('/en/')
  );
  const frenchRegistrationUrlNoUiLocaleRefs = registrationUrls.every((url) =>
    UI_LOCALES.every((uiLocale) => !url.includes(`%2F${encodeURIComponent(uiLocale)}%2F`) && !url.includes(`/${uiLocale}/`))
  );
  const frenchRegistrationRowPathSanitized =
    registration.includes('sanitizeFrenchTargetInPackPath') &&
    registration.includes('DENIED_IN_PACK_SEGMENTS') &&
    registration.includes("'course-packs'") &&
    registration.includes("'en'") &&
    UI_LOCALES.every((uiLocale) => registration.includes(`'${uiLocale}'`)) &&
    registration.includes('normalized.startsWith') &&
    registration.includes('normalized.includes') &&
    approvedRegistrations.every((item) => {
      try {
        item.rowUrl('../en/lesson/index.json');
        return false;
      } catch {
        return true;
      }
    });
  const frenchPrefetchFailClosed = prefetch.includes("state: 'blocked'") &&
    prefetch.includes("reason: 'french_server_pack_activation_required'") &&
    prefetch.includes("reason: 'remote_loader_failed'") &&
    prefetch.includes("ready.state !== 'ready' || typeof ready.cacheDirUri !== 'string'");
  const frenchPrefetchUsesRemoteLoader = prefetch.includes("await import('./course_pack_remote_loader')") &&
    prefetch.includes('ensureRemoteCoursePack(registration.manifestUrl, registration.rowUrl)');
  const frenchPrefetchRecordIsSeparateFromActiveTarget =
    prefetch.includes("ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY = 'onboarding_study_target_server_prefetch_result_v1'") &&
    prefetch.includes('ONBOARDING_REQUESTED_STUDY_TARGET_KEY') &&
    !prefetch.includes('STUDY_TARGET_STORAGE_KEY') &&
    !prefetch.includes("'study_target_v1'") &&
    !prefetch.includes('"study_target_v1"');
  const englishPrefetchDoesNotOverwriteFrenchRecord =
    prefetch.includes("if (result.studyTarget === 'en')") &&
    prefetch.includes('return result;') &&
    prefetch.includes('AsyncStorage.setItem(ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY') &&
    /does not overwrite the French prefetch diagnostic record for English/.test(read(path.join(input.repoRoot, 'tests', 'study_target_server_prefetch_contract.test.ts')));
  const bundledFrenchContentImported = /generated_fr|runtime_slices|pack_candidates/.test(registration) ||
    /generated_fr|runtime_slices|pack_candidates/.test(prefetch);
  const englishPackRegistrationImported = /plan_content_remote_registration/.test(registration) ||
    /plan_content_remote_registration/.test(prefetch);

  const checks: [boolean, string, string, string][] = [
    [onboardingStudyTargetStepPresent, 'onboarding_study_target_step_missing', 'Onboarding must ask which language the user studies before the plan flow.', onboardingPath],
    [onboardingEnglishChoicePresent, 'onboarding_english_choice_missing', 'Onboarding must keep an explicit English study target choice.', onboardingPath],
    [onboardingFrenchChoicePresent, 'onboarding_french_choice_missing', 'Onboarding must expose an explicit French study target choice.', onboardingPath],
    [onboardingEnglishVisualMarkPresent, 'onboarding_english_visual_mark_missing', 'English study target choice must have a dedicated visual mark, not only text.', onboardingPath],
    [onboardingFrenchVisualMarkPresent, 'onboarding_french_visual_mark_missing', 'French study target choice must have a dedicated visual mark, not only text.', onboardingPath],
    [onboardingPersistsRequestedTarget, 'onboarding_target_persistence_missing', 'Onboarding must persist the requested study target without trapping the user.', onboardingPath],
    [onboardingStartsFrenchPrefetch, 'onboarding_french_prefetch_missing', 'French selection must start server prefetch in the background.', onboardingPath],
    [onboardingRecordsFrenchPrefetchResult, 'onboarding_french_prefetch_result_record_missing', 'French selection must record prefetch state separately from active study target state.', prefetchPath],
    [frenchServerActivationGateApproved, 'french_server_activation_gate_not_approved', 'French server pack activation gate must be approved after production readiness activation.', registrationPath],
    [frenchRegistrationsSourceLocaleScoped, 'french_registration_scope_invalid', 'French registrations must be scoped by studyTarget=fr and sourceLocale ru|uk.', registrationPath],
    [frenchRegistrationSurfaces === SURFACES.length, 'french_registration_surface_count_invalid', 'French registrations must cover the six expected runtime surfaces.', registrationPath],
    [frenchRegistrationSourceLocales === SOURCE_LOCALES.length, 'french_registration_source_locale_count_invalid', 'French registrations must cover exactly ru and uk source containers after approval.', registrationPath],
    [frenchRegistrationTotalAfterApproval === SOURCE_LOCALES.length * SURFACES.length, 'french_registration_total_after_approval_invalid', 'French registrations must expose exactly 12 source/surface containers after approval.', registrationPath],
    [frenchRegistrationUrlScopeValid, 'french_registration_url_scope_invalid', 'French registration URLs must point only to course-packs/fr/{ru|uk}/{surface}/ manifest and row paths.', registrationPath],
    [frenchRegistrationUrlNoEnglishRefs, 'french_registration_url_english_ref', 'French registration URLs must not reference English course-pack containers.', registrationPath],
    [frenchRegistrationUrlNoUiLocaleRefs, 'french_registration_url_ui_locale_ref', 'French registration URLs must not use UI locales as source-locale containers.', registrationPath],
    [frenchRegistrationRowPathSanitized, 'french_registration_row_path_unsanitized', 'French registration rowUrl must reject paths that escape the selected fr/{ru|uk}/{surface} container.', registrationPath],
    [frenchPrefetchFailClosed, 'french_prefetch_not_fail_closed', 'French prefetch must fail closed on missing activation, bad source locale, or loader failure.', prefetchPath],
    [frenchPrefetchUsesRemoteLoader, 'french_prefetch_remote_loader_missing', 'French prefetch must use the remote course pack loader.', prefetchPath],
    [frenchPrefetchRecordIsSeparateFromActiveTarget, 'french_prefetch_record_not_separate', 'French prefetch result must be stored separately from study_target_v1.', prefetchPath],
    [englishPrefetchDoesNotOverwriteFrenchRecord, 'english_prefetch_overwrites_french_record', 'English prefetch must not overwrite the French onboarding prefetch diagnostic record.', prefetchPath],
    [!bundledFrenchContentImported, 'bundled_french_content_imported', 'French study target content must not be imported from app bundle.', prefetchPath],
    [!englishPackRegistrationImported, 'english_pack_registration_imported', 'French prefetch must not reuse English pack registration.', prefetchPath],
  ];

  for (const [ok, code, message, filePath] of checks) {
    if (!ok) addFinding(findings, 'blocker', code, message, filePath);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;

  return {
    schemaVersion: 'gustav-onboarding-server-prefetch-contract-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    summary: {
      studyTarget: 'fr',
      onboardingStudyTargetStepPresent,
      onboardingEnglishChoicePresent,
      onboardingFrenchChoicePresent,
      onboardingEnglishVisualMarkPresent,
      onboardingFrenchVisualMarkPresent,
      onboardingPersistsRequestedTarget,
      onboardingStartsFrenchPrefetch,
      onboardingRecordsFrenchPrefetchResult,
      activationApproved: frenchServerActivationGateApproved,
      frenchServerActivationGateApproved,
      frenchRegistrationsSourceLocaleScoped,
      frenchRegistrationSurfaces,
      frenchRegistrationSourceLocales,
      frenchRegistrationTotalAfterApproval,
      frenchRegistrationUrlScopeValid,
      frenchRegistrationUrlNoEnglishRefs,
      frenchRegistrationUrlNoUiLocaleRefs,
      frenchRegistrationRowPathSanitized,
      frenchPrefetchFailClosed,
      frenchPrefetchUsesRemoteLoader,
      frenchPrefetchRecordIsSeparateFromActiveTarget,
      englishPrefetchDoesNotOverwriteFrenchRecord,
      bundledFrenchContentImported,
      englishPackRegistrationImported,
      blockers,
      warnings,
      readyForRuntimeDownloadActivation: frenchServerActivationGateApproved && frenchRegistrationUrlScopeValid,
      readyForApply: false,
    },
    inputs: {
      onboarding: rel(input.repoRoot, onboardingPath),
      frenchTargetRemoteRegistration: rel(input.repoRoot, registrationPath),
      studyTargetServerPrefetch: rel(input.repoRoot, prefetchPath),
    },
    outputs: {},
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      productionApplyApproved: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Onboarding Server Prefetch Contract V2',
    '',
    `- Status: ${report.status}`,
    `- Onboarding study target step: ${report.summary.onboardingStudyTargetStepPresent ? 'yes' : 'no'}`,
    `- English/French choices: ${report.summary.onboardingEnglishChoicePresent ? 'yes' : 'no'}/${report.summary.onboardingFrenchChoicePresent ? 'yes' : 'no'}`,
    `- English/French visual marks: ${report.summary.onboardingEnglishVisualMarkPresent ? 'yes' : 'no'}/${report.summary.onboardingFrenchVisualMarkPresent ? 'yes' : 'no'}`,
    `- French prefetch starts: ${report.summary.onboardingStartsFrenchPrefetch ? 'yes' : 'no'}`,
    `- French prefetch result recorded separately: ${report.summary.onboardingRecordsFrenchPrefetchResult ? 'yes' : 'no'}`,
    `- French activation gate approved: ${report.summary.frenchServerActivationGateApproved ? 'yes' : 'no'}`,
    `- French remote surfaces: ${report.summary.frenchRegistrationSurfaces}`,
    `- French source locales/registrations after approval: ${report.summary.frenchRegistrationSourceLocales}/${report.summary.frenchRegistrationTotalAfterApproval}`,
    `- French registration URL scope valid: ${report.summary.frenchRegistrationUrlScopeValid ? 'yes' : 'no'}`,
    `- French registration URL English/UI refs: ${report.summary.frenchRegistrationUrlNoEnglishRefs ? 'no' : 'yes'}/${report.summary.frenchRegistrationUrlNoUiLocaleRefs ? 'no' : 'yes'}`,
    `- French registration row path sanitized: ${report.summary.frenchRegistrationRowPathSanitized ? 'yes' : 'no'}`,
    `- French prefetch record separate from active target: ${report.summary.frenchPrefetchRecordIsSeparateFromActiveTarget ? 'yes' : 'no'}`,
    `- Bundled French content imported: ${report.summary.bundledFrenchContentImported ? 'yes' : 'no'}`,
    `- English pack registration imported: ${report.summary.englishPackRegistrationImported ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('', '## Safety', '', '- This packet is read-only. It allows French server-pack registration activation after production readiness, while keeping app apply and production writes closed.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'onboarding_server_prefetch_contract_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'onboarding_server_prefetch_contract_v2_packet.md');
  const report = buildOnboardingServerPrefetchContractReport({ repoRoot, runDir });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV onboarding server prefetch contract V2 packet: ${report.status}`);
  console.log(`French remote surfaces: ${report.summary.frenchRegistrationSurfaces}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}

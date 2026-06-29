import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  file: string;
  expected: string;
  passed: boolean;
};

type Report = {
  schemaVersion: 'gustav-french-dev-surface-navigation-guard-v2-packet-v0';
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
    targetLocale: 'fr';
    mode: 'dev_surface_visible_content_fail_closed';
    visibleSurfaceParityReady: boolean;
    dailyTaskNavigationGuardsReady: boolean;
    compassNavigationGuardsReady: boolean;
    personalPlanNavigationGuardsReady: boolean;
    trainerSessionSelfGatesReady: boolean;
    adminShortcutGuardsReady: boolean;
    aiDialogSourceGatesReady: boolean;
    destinationSelfGatesReady: boolean;
    englishFallbackAbsent: boolean;
    productionActivationStillClosed: true;
    probesPassed: number;
    probes: number;
    blockers: number;
    warnings: number;
  };
  artifactHashes: Record<string, string>;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    activationApprovedByThisScript: false;
    runtimeDownloadsEnabledByThisScript: false;
    serverUploadStartedByThisScript: false;
  };
  nextPassPlan: string[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function probeContains(input: {
  probes: Probe[];
  findings: Finding[];
  repoRoot: string;
  filePath: string;
  id: string;
  expected: string;
  pattern: string;
  severity?: Severity;
}): void {
  const source = readText(input.filePath);
  const passed = source.includes(input.pattern);
  input.probes.push({
    id: input.id,
    file: rel(input.repoRoot, input.filePath),
    expected: input.expected,
    passed,
  });
  if (!passed) {
    addFinding(
      input.findings,
      input.severity ?? 'blocker',
      input.id,
      input.expected,
      rel(input.repoRoot, input.filePath),
    );
  }
}

function probeAbsent(input: {
  probes: Probe[];
  findings: Finding[];
  repoRoot: string;
  filePath: string;
  id: string;
  expected: string;
  pattern: string;
  severity?: Severity;
}): void {
  const source = readText(input.filePath);
  const passed = !source.includes(input.pattern);
  input.probes.push({
    id: input.id,
    file: rel(input.repoRoot, input.filePath),
    expected: input.expected,
    passed,
  });
  if (!passed) {
    addFinding(
      input.findings,
      input.severity ?? 'blocker',
      input.id,
      input.expected,
      rel(input.repoRoot, input.filePath),
    );
  }
}

function writeMarkdown(filePath: string, report: Report): void {
  const lines = [
    '# Gustav French Dev Surface Navigation Guard V2',
    '',
    `- Status: ${report.status}`,
    `- Run: ${report.runId}`,
    `- Mode: ${report.summary.mode}`,
    `- Visible surface parity ready: ${report.summary.visibleSurfaceParityReady}`,
    `- Daily task navigation guards ready: ${report.summary.dailyTaskNavigationGuardsReady}`,
    `- Compass navigation guards ready: ${report.summary.compassNavigationGuardsReady}`,
    `- Personal Plan navigation guards ready: ${report.summary.personalPlanNavigationGuardsReady}`,
    `- Trainer session self gates ready: ${report.summary.trainerSessionSelfGatesReady}`,
    `- Admin shortcut guards ready: ${report.summary.adminShortcutGuardsReady}`,
    `- AI dialog source gates ready: ${report.summary.aiDialogSourceGatesReady}`,
    `- Destination self gates ready: ${report.summary.destinationSelfGatesReady}`,
    `- English fallback absent: ${report.summary.englishFallbackAbsent}`,
    `- Production activation still closed: ${report.summary.productionActivationStillClosed}`,
    `- Probes: ${report.summary.probesPassed}/${report.summary.probes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
    ...(report.findings.length === 0
      ? ['- none']
      : report.findings.map((finding) => `- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`)),
    '',
    '## Next Pass Plan',
    '',
    ...report.nextPassPlan.map((item) => `- ${item}`),
    '',
  ];
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function main(): void {
  const repoRoot = process.cwd();
  const runRoot = path.resolve(repoRoot, argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
  const runId = path.basename(runRoot);
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') {
    throw new Error(`This packet is French-specific. Received --target ${target}`);
  }

  const files = {
    home: path.join(repoRoot, 'app/(tabs)/home.tsx'),
    dailyTasksModel: path.join(repoRoot, 'app/daily_tasks.ts'),
    dailyTasksScreen: path.join(repoRoot, 'app/daily_tasks_screen.tsx'),
    dailyTaskNavigation: path.join(repoRoot, 'app/daily_task_navigation.ts'),
    lessonMenu: path.join(repoRoot, 'app/lesson_menu.tsx'),
    quizzes: path.join(repoRoot, 'app/(tabs)/quizzes.tsx'),
    diagnostic: path.join(repoRoot, 'app/diagnostic_test.tsx'),
    flashcards: path.join(repoRoot, 'app/flashcards.tsx'),
    trainer: path.join(repoRoot, 'app/trainer.tsx'),
    compassBriefingHost: path.join(repoRoot, 'app/compass/compass_briefing_host.tsx'),
    compassTaskRoute: path.join(repoRoot, 'app/compass/compass_task_route.ts'),
    compassInductionRoute: path.join(repoRoot, 'app/compass/compass_induction_route.ts'),
    trainerPlanSession: path.join(repoRoot, 'app/trainer_plan_session.tsx'),
    trainerWordsSession: path.join(repoRoot, 'app/trainer_words_session.tsx'),
    trainerPhrasesSession: path.join(repoRoot, 'app/trainer_phrases_session.tsx'),
    trainerArenaSession: path.join(repoRoot, 'app/trainer_arena_session.tsx'),
    adminSettingsTesters: path.join(repoRoot, 'app/_admin_settings_testers.tsx'),
    aiDialogTargetGate: path.join(repoRoot, 'app/ai_dialog_target_gate.ts'),
    aiDialogHome: path.join(repoRoot, 'app/ai_dialog_home.tsx'),
    aiDialogSession: path.join(repoRoot, 'app/ai_dialog_session.tsx'),
    aiCompanionSession: path.join(repoRoot, 'app/ai_companion_session.tsx'),
    dialogsTabContent: path.join(repoRoot, 'components/DialogsTabContent.tsx'),
    tests: path.join(repoRoot, 'tests/gustav_french_dev_surface_parity.test.ts'),
    dailyTasksTargetFilterTests: path.join(repoRoot, 'tests/gustav_french_daily_tasks_target_filter.test.ts'),
  };

  const findings: Finding[] = [];
  const probes: Probe[] = [];

  for (const [id, filePath] of Object.entries(files)) {
    if (!fs.existsSync(filePath)) {
      addFinding(findings, 'blocker', `missing_input_${id}`, 'Required source file is missing.', rel(repoRoot, filePath));
    }
  }

  probeContains({ probes, findings, repoRoot, filePath: files.home, id: 'home_quizzes_visible', expected: 'Home keeps quizzes quick tile visible for French dev.', pattern: "testID: 'home-quick-quizzes'" });
  probeContains({ probes, findings, repoRoot, filePath: files.home, id: 'home_daily_visible', expected: 'Home keeps daily task activity tile visible for French dev.', pattern: "key: 'daily'" });
  probeContains({ probes, findings, repoRoot, filePath: files.home, id: 'home_attest_visible', expected: 'Home keeps diagnostic/attestation tile visible for French dev.', pattern: "key: 'attest'" });
  probeAbsent({ probes, findings, repoRoot, filePath: files.home, id: 'home_no_quiz_filter', expected: 'Home must not filter quizzes out for studyTarget=fr.', pattern: "quickItems.filter((item) => item.key !== 'quizzes')" });
  probeAbsent({ probes, findings, repoRoot, filePath: files.home, id: 'home_no_attest_filter', expected: 'Home must not filter attestation out for studyTarget=fr.', pattern: "activityQuickItems.filter((item) => item.key !== 'attest')" });

  probeContains({ probes, findings, repoRoot, filePath: files.dailyTasksModel, id: 'daily_tasks_fr_visible', expected: 'French daily tasks keep the generated English-shaped challenge slots visible.', pattern: 'return tasks;' });
  probeContains({ probes, findings, repoRoot, filePath: files.dailyTasksModel, id: 'daily_tasks_target_param', expected: 'Daily task model accepts studyTarget and does not fall back to English target.', pattern: 'studyTarget?: RuntimeStudyTarget' });

  for (const [fileKey, filePath] of [['daily_tasks_screen', files.dailyTasksScreen], ['daily_task_navigation', files.dailyTaskNavigation]] as const) {
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_vocabulary_gate`, expected: 'Daily task vocabulary/verb destinations must pass through vocabulary source gate.', pattern: 'openVocabularyOrFrenchGate' });
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_trainer_gate`, expected: 'Daily task trainer destinations must pass through trainer source gate.', pattern: 'openTrainerOrFrenchGate' });
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_flashcards_gate`, expected: 'Daily task flashcard destinations must pass through flashcard source gate.', pattern: 'openFlashcardsOrFrenchGate' });
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_daily_phrase_gate`, expected: 'Daily task daily-phrase destinations must pass through daily phrase source gate.', pattern: 'openDailyPhraseOrFrenchGate' });
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_theory_gate`, expected: 'Daily task theory destination must check lesson support gate, not just lesson runtime gate.', pattern: "lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId)" });
    probeAbsent({ probes, findings, repoRoot, filePath, id: `${fileKey}_no_direct_words_route`, expected: 'Daily task words case must not directly push /lesson_words.', pattern: "case 'words_learned':\n                router.push({ pathname: '/lesson_words'" });
    probeAbsent({ probes, findings, repoRoot, filePath, id: `${fileKey}_no_direct_trainer_route`, expected: 'Daily task recall case must not directly push /trainer.', pattern: "case 'recall_session':\n            case 'recall_answers':\n            case 'recall_perfect':\n                router.push('/trainer')" });
  }

  probeContains({ probes, findings, repoRoot, filePath: files.lessonMenu, id: 'lesson_menu_unavailable_rows', expected: 'Lesson menu rows remain visible with unavailable state for French auxiliary surfaces.', pattern: 'unavailable: frenchAuxiliarySourceGated' });
  probeContains({ probes, findings, repoRoot, filePath: files.lessonMenu, id: 'lesson_menu_preposition_gate', expected: 'Lesson menu preposition row can show a source-gated unavailable row.', pattern: 'unavailable: prepositionSourceGated' });
  probeContains({ probes, findings, repoRoot, filePath: files.quizzes, id: 'quizzes_self_gate', expected: 'Quizzes screen keeps level select visible but source-gated for French.', pattern: '<LevelSelect sourceGated={frenchQuizBlocked}' });
  probeContains({ probes, findings, repoRoot, filePath: files.diagnostic, id: 'diagnostic_self_gate', expected: 'Diagnostic screen has a French unavailable source gate.', pattern: 'FrenchDiagnosticUnavailable' });
  probeContains({ probes, findings, repoRoot, filePath: files.flashcards, id: 'flashcards_self_gate', expected: 'Flashcards hub has a French flashcard source gate.', pattern: 'flashcardsSourceGatedContentAvailableForTarget' });
  probeContains({ probes, findings, repoRoot, filePath: files.trainer, id: 'trainer_self_gate', expected: 'Trainer hub has a French trainer source gate.', pattern: 'trainerSessionContentAvailableForTarget(studyTarget)' });
  probeContains({ probes, findings, repoRoot, filePath: files.compassBriefingHost, id: 'compass_uses_study_target', expected: 'Compass host must read active studyTarget before resolving route pushes.', pattern: 'const { studyTarget } = useStudyTarget()' });
  probeContains({ probes, findings, repoRoot, filePath: files.compassBriefingHost, id: 'compass_route_resolver', expected: 'Compass host must resolve source-gated routes before router.push.', pattern: 'resolveSourceGatedRoute' });
  probeContains({ probes, findings, repoRoot, filePath: files.compassBriefingHost, id: 'compass_flashcards_gate', expected: 'Compass flashcard deep links must pass through flashcards source gate.', pattern: "flashcardsSourceGatedContentAvailableForTarget(studyTarget, 'system_cards')" });
  probeContains({ probes, findings, repoRoot, filePath: files.compassBriefingHost, id: 'compass_trainer_gate', expected: 'Compass trainer deep links must pass through trainer source gate.', pattern: 'trainerSessionContentAvailableForTarget(studyTarget)' });
  probeContains({ probes, findings, repoRoot, filePath: files.compassBriefingHost, id: 'compass_diagnostic_gate', expected: 'Compass diagnostic deep links must pass through diagnostic source gate.', pattern: 'diagnosticContentAvailableForTarget(studyTarget)' });
  probeContains({ probes, findings, repoRoot, filePath: files.compassBriefingHost, id: 'compass_task_route_wrapped', expected: 'Compass task press must wrap computed routes before push.', pattern: 'route = resolveSourceGatedRoute(route);' });
  probeContains({ probes, findings, repoRoot, filePath: files.compassBriefingHost, id: 'compass_induction_route_wrapped', expected: 'Compass induction press must wrap computed routes before push.', pattern: 'resolveSourceGatedRoute(compassInductionRoute(feature))' });
  probeContains({ probes, findings, repoRoot, filePath: files.trainerPlanSession, id: 'personal_plan_trainer_redirect_gate', expected: 'Personal Plan trainer redirect must check trainer source gate before reading plan trainer context.', pattern: 'trainerSessionContentAvailableForTarget(studyTarget)' });
  probeContains({ probes, findings, repoRoot, filePath: files.trainerPlanSession, id: 'personal_plan_trainer_redirect_fallback', expected: 'Personal Plan trainer redirect must fail closed to lessons when French trainer is unavailable.', pattern: "router.replace('/(tabs)/lessons' as any)" });
  for (const [fileKey, filePath] of [
    ['trainer_words_session', files.trainerWordsSession],
    ['trainer_phrases_session', files.trainerPhrasesSession],
    ['trainer_arena_session', files.trainerArenaSession],
  ] as const) {
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_source_gate`, expected: `${fileKey} must self-gate before loading trainer content for French.`, pattern: 'trainerSessionContentAvailableForTarget(studyTarget)' });
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_gate_copy`, expected: `${fileKey} must show French trainer gate copy when blocked.`, pattern: 'frenchTrainerGateCopy(lang)' });
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_gate_branch`, expected: `${fileKey} must branch on !trainerGateOpen.`, pattern: 'if (!trainerGateOpen)' });
  }
  probeContains({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_trainer_shortcut_gate', expected: 'Admin trainer shortcuts must check trainer source gate for active studyTarget.', pattern: 'trainerQaRouteGateOpen = trainerSessionContentAvailableForTarget(studyTarget)' });
  probeContains({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_trainer_shortcut_helper', expected: 'Admin trainer shortcuts must use a single guarded route helper.', pattern: 'const openTrainerQaRoute =' });
  probeContains({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_trainer_words_shortcut_wrapped', expected: 'Admin words trainer shortcut must use guarded helper.', pattern: "openTrainerQaRoute('/trainer_words_session')" });
  probeContains({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_trainer_phrases_shortcut_wrapped', expected: 'Admin phrases trainer shortcut must use guarded helper.', pattern: "openTrainerQaRoute('/trainer_phrases_session')" });
  probeContains({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_trainer_arena_shortcut_wrapped', expected: 'Admin arena trainer shortcut must use guarded helper.', pattern: "openTrainerQaRoute('/trainer_arena_session')" });
  probeAbsent({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_no_direct_words_session_push', expected: 'Admin must not directly push /trainer_words_session from QA buttons.', pattern: "onPress={() => router.push('/trainer_words_session' as any)}" });
  probeAbsent({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_no_direct_phrases_session_push', expected: 'Admin must not directly push /trainer_phrases_session from QA buttons.', pattern: "onPress={() => router.push('/trainer_phrases_session' as any)}" });
  probeAbsent({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_no_direct_arena_session_push', expected: 'Admin must not directly push /trainer_arena_session from QA buttons.', pattern: "onPress={() => router.push('/trainer_arena_session' as any)}" });
  probeContains({ probes, findings, repoRoot, filePath: files.aiDialogTargetGate, id: 'ai_dialog_target_gate_exists', expected: 'AI dialog domain must have an explicit French source gate.', pattern: 'french_ai_dialog_source_gate' });
  probeContains({ probes, findings, repoRoot, filePath: files.aiDialogTargetGate, id: 'ai_dialog_required_prompt_contract', expected: 'AI dialog French gate must require a prompt contract before activation.', pattern: 'french_ai_dialog_prompt_contract' });
  probeContains({ probes, findings, repoRoot, filePath: files.aiDialogTargetGate, id: 'ai_dialog_blocked_routes', expected: 'AI dialog gate must enumerate direct blocked routes.', pattern: "blockedRoutes: ['/ai_dialog_home', '/ai_dialog_session', '/ai_companion_session']" });
  probeContains({ probes, findings, repoRoot, filePath: files.aiDialogHome, id: 'ai_dialog_home_delegates_visible_surface', expected: 'AI dialog home must delegate to DialogsTabContent so French dev keeps the English-shaped lessons/situations surface visible.', pattern: '<DialogsTabContent headerSlot={header} />' });
  probeAbsent({ probes, findings, repoRoot, filePath: files.aiDialogHome, id: 'ai_dialog_home_no_whole_screen_gate_placeholder', expected: 'AI dialog home must not replace the entire French dev surface with a gate placeholder.', pattern: 'aiDialogGateOpen ?' });
  for (const [fileKey, filePath] of [
    ['ai_dialog_session', files.aiDialogSession],
    ['ai_companion_session', files.aiCompanionSession],
    ['dialogs_tab_content', files.dialogsTabContent],
  ] as const) {
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_source_gate`, expected: `${fileKey} must check AI dialog source gate for active studyTarget.`, pattern: 'aiDialogContentAvailableForTarget(studyTarget)' });
    probeContains({ probes, findings, repoRoot, filePath, id: `${fileKey}_gate_copy`, expected: `${fileKey} must show French AI dialog gate copy when blocked.`, pattern: 'frenchAiDialogGateCopy(lang)' });
  }
  probeContains({ probes, findings, repoRoot, filePath: files.dialogsTabContent, id: 'dialogs_tab_content_french_press_gate', expected: 'DialogsTabContent must gate French scenario presses before routing into AI dialog sessions.', pattern: 'Alert.alert(frenchGateCopy.title, frenchGateCopy.body' });
  probeContains({ probes, findings, repoRoot, filePath: files.dialogsTabContent, id: 'dialogs_tab_content_situations_visible', expected: 'DialogsTabContent must keep the situations/challenges tab visible for French dev parity.', pattern: "{ key: 'situations' as const" });
  probeContains({ probes, findings, repoRoot, filePath: files.dialogsTabContent, id: 'dialogs_tab_content_challenges_visible', expected: 'DialogsTabContent must still build challenge scenario cards while French AI content is source-gated.', pattern: 'getChallengeDialogScenarios().map' });
  probeContains({ probes, findings, repoRoot, filePath: files.quizzes, id: 'quiz_thematic_challenges_visible_while_source_gated', expected: 'French dev quiz themes/challenge categories must remain visible while their starts are blocked by the source gate.', pattern: '() => getAvailableThematicQuizCategories(studyTarget)' });
  probeAbsent({ probes, findings, repoRoot, filePath: files.quizzes, id: 'quiz_no_source_gate_category_hide', expected: 'French source gate must not hide thematic quiz/challenge categories.', pattern: 'sourceGated ? [] : getAvailableThematicQuizCategories(studyTarget)' });
  probeContains({ probes, findings, repoRoot, filePath: files.compassBriefingHost, id: 'compass_ai_dialog_gate', expected: 'Compass dialogs induction route must pass through AI dialog source gate.', pattern: "route.pathname === '/ai_dialog_home'" });
  probeContains({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_ai_dialog_shortcut_helper', expected: 'Admin AI dialog shortcut must use a guarded helper.', pattern: 'const openAiDialogQaRoute =' });
  probeContains({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_ai_dialog_shortcut_wrapped', expected: 'Admin AI dialog shortcut button must use guarded helper.', pattern: 'onPress={openAiDialogQaRoute}' });
  probeAbsent({ probes, findings, repoRoot, filePath: files.adminSettingsTesters, id: 'admin_no_direct_ai_dialog_home_push', expected: 'Admin must not directly push /ai_dialog_home from QA button.', pattern: "onPress={() => router.push('/ai_dialog_home' as any)}" });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'parity_test_guarded', expected: 'A narrow Jest contract covers French dev surface visibility and gated daily-task destinations.', pattern: 'keeps French daily-task sections visible but source-gates non-French task destinations before navigation' });
  probeContains({ probes, findings, repoRoot, filePath: files.dailyTasksTargetFilterTests, id: 'daily_quiz_challenge_visibility_test_guarded', expected: 'A narrow Jest contract proves French keeps every quiz/challenge daily task type visible while source-gating quiz content.', pattern: 'keeps every quiz/challenge daily task type visible for French while quiz content stays source-gated' });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'compass_test_guarded', expected: 'A narrow Jest contract covers Compass French deep-link gates.', pattern: 'source-gates Compass deep links before French can reach unfinished practice surfaces' });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'personal_plan_test_guarded', expected: 'A narrow Jest contract covers Personal Plan trainer redirect gates.', pattern: 'source-gates Personal Plan trainer redirect before French can enter unfinished trainer sessions' });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'trainer_session_test_guarded', expected: 'A narrow Jest contract covers direct trainer session self-gates.', pattern: 'keeps every direct trainer session screen behind the French trainer source gate' });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'admin_shortcut_test_guarded', expected: 'A narrow Jest contract covers admin trainer QA shortcut gates.', pattern: 'source-gates admin trainer QA shortcuts before they can deep-link into French trainer sessions' });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'ai_dialog_test_guarded', expected: 'A narrow Jest contract covers AI dialog source gates.', pattern: 'source-gates AI dialog routes before French can use English scenarios or prompts' });

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const visibleSurfaceParityReady = probes
    .filter((probe) => probe.id.startsWith('home_') || probe.id.startsWith('lesson_menu_') || probe.id === 'daily_tasks_fr_visible')
    .every((probe) => probe.passed);
  const dailyTaskNavigationGuardsReady = probes
    .filter((probe) => probe.id.startsWith('daily_tasks_screen_') || probe.id.startsWith('daily_task_navigation_'))
    .every((probe) => probe.passed);
  const compassNavigationGuardsReady = probes
    .filter((probe) => probe.id.startsWith('compass_'))
    .every((probe) => probe.passed);
  const personalPlanNavigationGuardsReady = probes
    .filter((probe) => probe.id.startsWith('personal_plan_'))
    .every((probe) => probe.passed);
  const trainerSessionSelfGatesReady = probes
    .filter((probe) => probe.id.startsWith('trainer_'))
    .every((probe) => probe.passed);
  const adminShortcutGuardsReady = probes
    .filter((probe) => probe.id.startsWith('admin_'))
    .every((probe) => probe.passed);
  const aiDialogSourceGatesReady = probes
    .filter((probe) => probe.id.startsWith('ai_dialog_') || probe.id.startsWith('ai_companion_') || probe.id.startsWith('dialogs_tab_content_') || probe.id === 'compass_ai_dialog_gate')
    .every((probe) => probe.passed);
  const destinationSelfGatesReady = probes
    .filter((probe) => ['quizzes_self_gate', 'diagnostic_self_gate', 'flashcards_self_gate', 'trainer_self_gate'].includes(probe.id))
    .every((probe) => probe.passed);
  const englishFallbackAbsent = probes
    .filter((probe) => probe.id.includes('no_direct') || probe.id.includes('no_') || probe.id === 'daily_tasks_target_param')
    .every((probe) => probe.passed);

  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const outputJson = path.join(runRoot, 'audits/french_dev_surface_navigation_guard_v2_packet.json');
  const outputMd = path.join(runRoot, 'audits/french_dev_surface_navigation_guard_v2_packet.md');

  const report: Report = {
    schemaVersion: 'gustav-french-dev-surface-navigation-guard-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: Object.fromEntries(Object.entries(files).map(([key, filePath]) => [key, rel(repoRoot, filePath)])),
    outputs: {
      json: rel(repoRoot, outputJson),
      markdown: rel(repoRoot, outputMd),
    },
    summary: {
      targetLocale: 'fr',
      mode: 'dev_surface_visible_content_fail_closed',
      visibleSurfaceParityReady,
      dailyTaskNavigationGuardsReady,
      compassNavigationGuardsReady,
      personalPlanNavigationGuardsReady,
      trainerSessionSelfGatesReady,
      adminShortcutGuardsReady,
      aiDialogSourceGatesReady,
      destinationSelfGatesReady,
      englishFallbackAbsent,
      productionActivationStillClosed: true,
      probesPassed: probes.filter((probe) => probe.passed).length,
      probes: probes.length,
      blockers,
      warnings,
    },
    artifactHashes: Object.fromEntries(Object.entries(files).map(([key, filePath]) => [key, sha256(filePath)])),
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      activationApprovedByThisScript: false,
      runtimeDownloadsEnabledByThisScript: false,
      serverUploadStartedByThisScript: false,
    },
    nextPassPlan: [
      'Expand this guard to any remaining admin/tester shortcuts that can deep-link into trainer, flashcards, diagnostic or quizzes.',
      'Connect this packet to readiness evidence after exact approval remains separate from activation.',
      'Keep production activation HOLD until explicit approval receipt, hash lock, runtime/server/rollback gates and downloadable packs pass.',
    ],
  };

  writeJson(outputJson, report);
  writeMarkdown(outputMd, report);
  console.log(`Gustav French dev surface navigation guard: ${status}`);
  console.log(`Probes: ${report.summary.probesPassed}/${report.summary.probes}`);
  console.log(`Blockers: ${blockers}`);
  console.log(`Wrote ${rel(repoRoot, outputJson)}`);
  console.log(`Wrote ${rel(repoRoot, outputMd)}`);
}

main();

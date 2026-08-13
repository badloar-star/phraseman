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
    personalPlanNavigationGuardsReady: boolean;
    trainerSessionSelfGatesReady: boolean;
    aiDialogSourceGatesReady: boolean;
    destinationSelfGatesReady: boolean;
    challengeSurfaceGuardsReady: boolean;
    challengeSurfaceProbes: number;
    arenaSurfaceGuardsReady: boolean;
    arenaSurfaceProbes: number;
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
    `- Personal Plan navigation guards ready: ${report.summary.personalPlanNavigationGuardsReady}`,
    `- Trainer session self gates ready: ${report.summary.trainerSessionSelfGatesReady}`,
    `- AI dialog source gates ready: ${report.summary.aiDialogSourceGatesReady}`,
    `- Destination self gates ready: ${report.summary.destinationSelfGatesReady}`,
    `- Challenge surface guards ready/probes: ${report.summary.challengeSurfaceGuardsReady}/${report.summary.challengeSurfaceProbes}`,
    `- Arena surface guards ready/probes: ${report.summary.arenaSurfaceGuardsReady}/${report.summary.arenaSurfaceProbes}`,
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
    lessonMenu: path.join(repoRoot, 'app/lesson_menu.tsx'),
    quizzes: path.join(repoRoot, 'app/(tabs)/quizzes.tsx'),
    diagnostic: path.join(repoRoot, 'app/diagnostic_test.tsx'),
    flashcards: path.join(repoRoot, 'app/flashcards.tsx'),
    trainer: path.join(repoRoot, 'app/trainer.tsx'),
    trainerPlanSession: path.join(repoRoot, 'app/trainer_plan_session.tsx'),
    trainerWordsSession: path.join(repoRoot, 'app/trainer_words_session.tsx'),
    trainerPhrasesSession: path.join(repoRoot, 'app/trainer_phrases_session.tsx'),
    trainerArenaSession: path.join(repoRoot, 'app/trainer_arena_session.tsx'),
    aiDialogTargetGate: path.join(repoRoot, 'app/ai_dialog_target_gate.ts'),
    aiDialogHome: path.join(repoRoot, 'app/ai_dialog_home.tsx'),
    aiDialogSession: path.join(repoRoot, 'app/ai_dialog_session.tsx'),
    aiCompanionSession: path.join(repoRoot, 'app/ai_companion_session.tsx'),
    dialogsTabContent: path.join(repoRoot, 'components/DialogsTabContent.tsx'),
    tests: path.join(repoRoot, 'tests/gustav_french_dev_surface_parity.test.ts'),
  };

  const findings: Finding[] = [];
  const probes: Probe[] = [];

  for (const [id, filePath] of Object.entries(files)) {
    if (!fs.existsSync(filePath)) {
      addFinding(findings, 'blocker', `missing_input_${id}`, 'Required source file is missing.', rel(repoRoot, filePath));
    }
  }

  probeContains({ probes, findings, repoRoot, filePath: files.home, id: 'home_quizzes_visible', expected: 'Home keeps quizzes quick tile visible for French dev.', pattern: "testID: 'home-quick-quizzes'" });
  probeContains({ probes, findings, repoRoot, filePath: files.home, id: 'home_attest_visible', expected: 'Home keeps diagnostic/attestation tile visible for French dev.', pattern: "key: 'attest'" });
  probeAbsent({ probes, findings, repoRoot, filePath: files.home, id: 'home_no_quiz_filter', expected: 'Home must not filter quizzes out for studyTarget=fr.', pattern: "quickItems.filter((item) => item.key !== 'quizzes')" });
  probeAbsent({ probes, findings, repoRoot, filePath: files.home, id: 'home_no_attest_filter', expected: 'Home must not filter attestation out for studyTarget=fr.', pattern: "activityQuickItems.filter((item) => item.key !== 'attest')" });

  probeContains({ probes, findings, repoRoot, filePath: files.lessonMenu, id: 'lesson_menu_unavailable_rows', expected: 'Lesson menu rows remain visible with unavailable state for French auxiliary surfaces.', pattern: 'unavailable: frenchAuxiliarySourceGated' });
  probeContains({ probes, findings, repoRoot, filePath: files.lessonMenu, id: 'lesson_menu_preposition_gate', expected: 'Lesson menu preposition row can show a source-gated unavailable row.', pattern: 'unavailable: prepositionSourceGated' });
  probeContains({ probes, findings, repoRoot, filePath: files.quizzes, id: 'quizzes_self_gate', expected: 'Quizzes screen keeps level select visible but source-gated for French.', pattern: '<LevelSelect sourceGated={frenchQuizBlocked}' });
  probeContains({ probes, findings, repoRoot, filePath: files.diagnostic, id: 'diagnostic_self_gate', expected: 'Diagnostic screen has a French unavailable source gate.', pattern: 'FrenchDiagnosticUnavailable' });
  probeContains({ probes, findings, repoRoot, filePath: files.flashcards, id: 'flashcards_self_gate', expected: 'Flashcards hub has a French flashcard source gate.', pattern: 'flashcardsSourceGatedContentAvailableForTarget' });
  probeContains({ probes, findings, repoRoot, filePath: files.trainer, id: 'trainer_self_gate', expected: 'Trainer hub has a French trainer source gate.', pattern: 'trainerSessionContentAvailableForTarget(studyTarget)' });
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
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'parity_test_guarded', expected: 'A narrow Jest contract covers visible French dev surfaces while unavailable French content remains source-gated.', pattern: 'keeps active English surfaces visible for French dev while source-gating missing French content' });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'personal_plan_test_guarded', expected: 'A narrow Jest contract covers Personal Plan trainer redirect gates.', pattern: 'source-gates Personal Plan trainer redirect before French can enter unfinished trainer sessions' });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'trainer_session_test_guarded', expected: 'A narrow Jest contract covers direct trainer session self-gates.', pattern: 'keeps every direct trainer session screen behind the French trainer source gate' });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'admin_shortcut_test_guarded', expected: 'A narrow Jest contract covers admin trainer QA shortcut gates.', pattern: 'source-gates admin trainer QA shortcuts before they can deep-link into French trainer sessions' });
  probeContains({ probes, findings, repoRoot, filePath: files.tests, id: 'ai_dialog_test_guarded', expected: 'A narrow Jest contract covers AI dialog source gates.', pattern: 'source-gates AI dialog routes before French can use English scenarios or prompts' });

  const visibleSurfaceParityReady = probes
    .filter((probe) => probe.id.startsWith('home_') || probe.id.startsWith('lesson_menu_'))
    .every((probe) => probe.passed);
  const personalPlanNavigationGuardsReady = probes
    .filter((probe) => probe.id.startsWith('personal_plan_'))
    .every((probe) => probe.passed);
  const trainerSessionSelfGatesReady = probes
    .filter((probe) => probe.id.startsWith('trainer_'))
    .every((probe) => probe.passed);
  const aiDialogSourceGatesReady = probes
    .filter((probe) => probe.id.startsWith('ai_dialog_') || probe.id.startsWith('ai_companion_') || probe.id.startsWith('dialogs_tab_content_'))
    .every((probe) => probe.passed);
  const destinationSelfGatesReady = probes
    .filter((probe) => ['quizzes_self_gate', 'diagnostic_self_gate', 'flashcards_self_gate', 'trainer_self_gate'].includes(probe.id))
    .every((probe) => probe.passed);
  const challengeSurfaceProbeIds = [
    'home_quizzes_visible',
    'quiz_thematic_challenges_visible_while_source_gated',
    'quiz_no_source_gate_category_hide',
    'dialogs_tab_content_challenges_visible',
  ];
  const arenaSurfaceProbeIds = [
    'trainer_arena_session_source_gate',
    'trainer_arena_session_gate_copy',
    'trainer_arena_session_gate_branch',
    'admin_trainer_arena_shortcut_wrapped',
    'admin_no_direct_arena_session_push',
  ];
  const challengeSurfaceProbes = probes.filter((probe) => challengeSurfaceProbeIds.includes(probe.id));
  const arenaSurfaceProbes = probes.filter((probe) => arenaSurfaceProbeIds.includes(probe.id));
  const challengeSurfaceGuardsReady =
    challengeSurfaceProbes.length === challengeSurfaceProbeIds.length &&
    challengeSurfaceProbes.every((probe) => probe.passed);
  const arenaSurfaceGuardsReady =
    arenaSurfaceProbes.length === arenaSurfaceProbeIds.length &&
    arenaSurfaceProbes.every((probe) => probe.passed);
  const englishFallbackAbsent = probes
    .filter((probe) => probe.id.includes('no_direct') || probe.id.includes('no_'))
    .every((probe) => probe.passed);
  if (!challengeSurfaceGuardsReady) {
    addFinding(findings, 'blocker', 'challenge_surface_guards_not_ready', 'French challenge surfaces must remain visible and source-gated without requiring an extra remote-pack surface.');
  }
  if (!arenaSurfaceGuardsReady) {
    addFinding(findings, 'blocker', 'arena_surface_guards_not_ready', 'French arena trainer surfaces must self-gate and admin shortcuts must not deep-link around the gate.');
  }

  const finalBlockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const finalWarnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = finalBlockers > 0 ? 'BLOCK' : 'PASS';
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
      personalPlanNavigationGuardsReady,
      trainerSessionSelfGatesReady,
      aiDialogSourceGatesReady,
      destinationSelfGatesReady,
      challengeSurfaceGuardsReady,
      challengeSurfaceProbes: challengeSurfaceProbes.length,
      arenaSurfaceGuardsReady,
      arenaSurfaceProbes: arenaSurfaceProbes.length,
      englishFallbackAbsent,
      productionActivationStillClosed: true,
      probesPassed: probes.filter((probe) => probe.passed).length,
      probes: probes.length,
      blockers: finalBlockers,
      warnings: finalWarnings,
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
  console.log(`Blockers: ${finalBlockers}`);
  console.log(`Wrote ${rel(repoRoot, outputJson)}`);
  console.log(`Wrote ${rel(repoRoot, outputMd)}`);
}

main();

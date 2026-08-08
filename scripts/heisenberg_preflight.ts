import fs from 'node:fs';
import path from 'node:path';
import { SOURCE_LOCALES } from '../app/source_locales';
import { auditPlanContentLocaleIsolation } from '../app/plan_content_locale_gate';
import { IMPULS_CONTENT_DAYS } from '../app/plan_content_impuls';
import { ECHO_CONTENT_DAYS } from '../app/plan_content_echo';
import { GAVAN_CONTENT_DAYS } from '../app/plan_content_gavan';
import { MITAP_CONTENT_DAYS } from '../app/plan_content_mitap';
import { VOYAZH_CONTENT_DAYS } from '../app/plan_content_voyazh';
import type { PlanContentDay } from '../app/plan_content_schema';

type Severity = 'blocker' | 'warning' | 'info';

interface Finding {
  severity: Severity;
  area: string;
  code: string;
  message: string;
  file?: string;
  sample?: string;
}

interface CheckResult {
  area: string;
  status: 'pass' | 'hold';
  file?: string;
  checks: string[];
}

interface PlanSummary {
  plan: string;
  days: number;
  blockers: number;
  warnings: number;
  protectedAnchorBlockers: Array<{
    term: string;
    count: number;
  }>;
  blockedLocales: Array<{
    locale: string;
    count: number;
  }>;
  firstBlockers: Array<{
    day: number;
    code: string;
    path: string;
    locale?: string;
    message: string;
  }>;
}

export interface HeisenbergPreflightReport {
  generatedAt: string;
  mode: 'heisenberg-preflight-brain';
  sourceLocales: readonly string[];
  status: 'GO' | 'HOLD';
  summary: {
    blockers: number;
    warnings: number;
    info: number;
    planContentBlockers: number;
    planContentWarnings: number;
  };
  planContent: PlanSummary[];
  checks: CheckResult[];
  findings: Finding[];
  nextActions: string[];
}

const PLAN_CONTENT: Array<{ plan: string; days: PlanContentDay[] }> = [
  { plan: 'impuls', days: IMPULS_CONTENT_DAYS },
  { plan: 'echo', days: ECHO_CONTENT_DAYS },
  { plan: 'gavan', days: GAVAN_CONTENT_DAYS },
  { plan: 'mitap', days: MITAP_CONTENT_DAYS },
  { plan: 'voyazh', days: VOYAZH_CONTENT_DAYS },
];

const CONTRACT_CHECKS: Array<{
  area: string;
  file: string;
  mustContain: string[];
  blockerMessage: string;
}> = [
  {
    area: 'PlanContent generation prompt',
    file: 'app/plan_content_generation_job.ts',
    mustContain: [
      "Source locales: ${job.sourceLocales.join(', ')}",
      'Locale isolation: ru text only in ru',
      'Do not copy RU/UK/ES into planned locales',
      'ptBr/pt_BR/vn',
      'Protected English anchors',
      'keep those English anchors exactly in every locale',
    ],
    blockerMessage: 'AI day-generation brief is missing explicit source-locale isolation rules.',
  },
  {
    area: 'PlanContent pipeline gate',
    file: 'app/plan_content_agent_pipeline.ts',
    mustContain: [
      'auditPlanContentLocaleIsolation',
      "issue.severity === 'blocker'",
      'locale:',
    ],
    blockerMessage: 'Generated PlanContent days are not blocked by the locale isolation audit.',
  },
  {
    area: 'PlanContent runtime adapter',
    file: 'app/plan_content_runtime_adapter.ts',
    mustContain: [
      'lessonSourceLocales',
      "text['pt-BR']",
      'sourceLocales',
      'titlePtBr',
    ],
    blockerMessage: 'Runtime adapter is not preserving planned locale containers.',
  },
  {
    area: 'Premium dialog language context',
    file: 'functions/src/premium_dialog.ts',
    mustContain: [
      'interfaceLang',
      'Do not assume Russian unless this value is Russian',
      'buildScenarioSystemPrompt',
      'buildCompanionSystemPrompt',
    ],
    blockerMessage: 'Premium dialog prompt can still default to a Russian-only learner profile.',
  },
  {
    area: 'Premium dialog scenario client',
    file: 'app/ai_dialog_session.tsx',
    mustContain: [
      'interfaceLang: lang',
      'targetLang: lang',
    ],
    blockerMessage: 'Scenario dialog client does not forward UI language to AI send/translate calls.',
  },
  {
    area: 'Premium companion client',
    file: 'app/ai_companion_session.tsx',
    mustContain: ['interfaceLang: lang'],
    blockerMessage: 'Companion dialog client does not forward UI language to AI send calls.',
  },
  {
    area: 'Generated AI language post-gate',
    file: 'functions/src/ai_language_gate.ts',
    mustContain: [
      'rejectGeneratedLanguageText',
      'wrongScriptRatio',
      'looksLikeEnglishLeak',
    ],
    blockerMessage: 'Shared generated-AI language gate is missing.',
  },
  {
    area: 'Generated AI language contract',
    file: 'functions/src/ai_language_contract.ts',
    mustContain: [
      'LANGUAGE_CONTRACT_VERSION',
      'resolveAiOutputLang',
      'assertAiOutputLanguage',
      'assertAiJsonTextFieldsLanguage',
      'rejectGeneratedLanguageText',
    ],
    blockerMessage: 'Shared AI output-language contract is missing.',
  },
  {
    area: 'Weekly review generated-language gate',
    file: 'functions/src/weekly_review.ts',
    mustContain: [
      'assertAiJsonTextFieldsLanguage',
      "feature: 'weekly_review'",
      'buildSystemPrompt(briefing.lang)',
    ],
    blockerMessage: 'Weekly Review can publish AI text without checking the requested UI language.',
  },
  {
    area: 'Stats insights generated-language gate',
    file: 'functions/src/stats_insights.ts',
    mustContain: [
      'assertAiJsonTextFieldsLanguage',
      "feature: 'stats_insights'",
      'buildSystemPrompt(briefing.lang)',
    ],
    blockerMessage: 'Stats Insights can publish AI text without checking the requested UI language.',
  },
  {
    area: 'Explain prompt language map',
    file: 'functions/src/explain/explain_prompts.ts',
    mustContain: [
      "ru: { name: 'Russian'",
      "uk: { name: 'Ukrainian'",
      "es: { name: 'Spanish'",
      "'pt-BR': { name: 'Brazilian Portuguese'",
      "vi: { name: 'Vietnamese'",
      "id: { name: 'Indonesian'",
      "tr: { name: 'Turkish'",
      "pl: { name: 'Polish'",
      'resolvePromptLangKey',
    ],
    blockerMessage: 'Explain prompts do not cover every registered app source locale.',
  },
  {
    area: 'Explain localized fallback',
    file: 'functions/src/explain_phrase.ts',
    mustContain: [
      'EXPLAIN_FALLBACK_BY_LANG',
      'resolveAiOutputLang',
      'resolvePromptLangKey(lang)',
      'buildFallback(phraseMeaning, lang)',
      "'pt-BR'",
    ],
    blockerMessage: 'Explain fallback can still return the wrong UI language when AI generation is skipped or rejected.',
  },
  {
    area: 'Explain phrase client language forwarding',
    file: 'components/ExplainSheet.tsx',
    mustContain: [
      'useExplainRequest({ phraseEn, phraseMeaning, lang: effLang }, visible)',
      'resolveExplainDisplay(state, effLang, phraseMeaning)',
      'trackEvent(\'explain_sheet_opened\'',
    ],
    blockerMessage: 'Explain phrase sheet is not forwarding the current UI language into the AI request/fallback path.',
  },
  {
    area: 'Choice explanation language isolation',
    file: 'functions/src/explain_choice.ts',
    mustContain: [
      "resolveAiOutputLang(asText(data.lang, 12) || 'ru', 'choice')",
      'resolvePromptLangKey(lang)',
      'choiceHashFor(correctEn, distractors, langKey)',
      'judgeExplanation({ text: judgeText, phraseEn: correctEn, lang, apiKey })',
    ],
    blockerMessage: 'Choice explanations are missing canonical lang, lang-specific cache, or output judge isolation.',
  },
  {
    area: 'Choice prompt language map',
    file: 'functions/src/explain/choice_explain_prompts.ts',
    mustContain: [
      'PROMPT_LANGUAGES',
      'resolvePromptLangKey',
      '${target.writeIn}',
      '${target.name}',
    ],
    blockerMessage: 'Choice explanation prompt is not tied to the shared per-language prompt map.',
  },
  {
    area: 'Choice explanation client contract',
    file: 'app/explain_choice_client.ts',
    mustContain: [
      'lang: string',
      'httpsCallable<ExplainChoiceRequest, ExplainChoiceResponse>',
      "'explainChoice'",
    ],
    blockerMessage: 'Choice explanation client no longer requires a language field for server-side isolation.',
  },
  {
    area: 'Quiz explanation language isolation',
    file: 'functions/src/explain_quiz.ts',
    mustContain: [
      "resolveAiOutputLang(asText(data.lang, 12) || 'ru', 'quiz')",
      'resolvePromptLangKey(lang)',
      'quizHashFor(correctEn, [correctEn, ...wrongOptions], langKey)',
      'judgeExplanation({ text: judgeText, phraseEn: correctEn, lang, apiKey })',
    ],
    blockerMessage: 'Quiz explanations are missing canonical lang, lang-specific cache, or output judge isolation.',
  },
  {
    area: 'Quiz prompt language map',
    file: 'functions/src/explain/quiz_explain_prompts.ts',
    mustContain: [
      'PROMPT_LANGUAGES',
      'resolvePromptLangKey',
      '${target.writeIn}',
      '${target.name}',
    ],
    blockerMessage: 'Quiz explanation prompt is not tied to the shared per-language prompt map.',
  },
  {
    area: 'Mistake explanation language isolation',
    file: 'functions/src/mistake_explain.ts',
    mustContain: [
      'resolveAiOutputLang(text(value, 16)',
      'resolvePromptLangKey(payload.interfaceLang)',
      'mistakeHashFor(payload.targetAnswer, payload.userAnswer, langKey)',
      'assertAiOutputLanguage',
    ],
    blockerMessage: 'Mistake explanations are missing canonical lang, lang-specific cache, or post-generation language gate.',
  },
  {
    area: 'Compass generated-language judge',
    file: 'functions/src/compass.ts',
    mustContain: [
      'resolvePromptLangKey',
      'compassHashFor(signature, langKey)',
      'judgeExplanation',
    ],
    blockerMessage: 'Compass AI text is not isolated by language-specific cache and judge.',
  },
];

const TRACE_SURFACES = [
  {
    area: 'Admin personal trainings sync',
    file: 'scripts/sync_personal_trainings_admin.ts',
    token: 'sourceLocales',
  },
  {
    area: 'Hosted admin personal trainings payload',
    file: 'admin/personal-trainings.js',
    token: 'sourceLocales',
  },
  {
    area: 'Community packs locale payload',
    file: 'functions/src/community_packs.ts',
    token: 'sourceLocales',
  },
  {
    area: 'Lesson runtime type contract',
    file: 'app/lesson_data_types.ts',
    token: 'sourceLocales',
  },
  {
    area: 'Lesson all-data runtime bridge',
    file: 'app/lesson_data_all.ts',
    token: 'titlePtBr',
  },
];

function normalizeRel(file: string): string {
  return file.replace(/\\/g, '/');
}

function readText(root: string, relFile: string): string {
  return fs.readFileSync(path.join(root, relFile), 'utf8');
}

function pushFinding(findings: Finding[], finding: Finding): void {
  findings.push({
    ...finding,
    file: finding.file ? normalizeRel(finding.file) : undefined,
  });
}

function auditContracts(root: string, findings: Finding[]): CheckResult[] {
  const checks: CheckResult[] = [];
  for (const check of CONTRACT_CHECKS) {
    const missing: string[] = [];
    let text = '';
    try {
      text = readText(root, check.file);
    } catch {
      missing.push('<file missing>');
    }
    for (const token of check.mustContain) {
      if (!text.includes(token)) missing.push(token);
    }
    if (missing.length) {
      pushFinding(findings, {
        severity: 'blocker',
        area: check.area,
        code: 'missing_contract_token',
        file: check.file,
        message: check.blockerMessage,
        sample: missing.slice(0, 5).join(' | '),
      });
    }
    checks.push({
      area: check.area,
      file: normalizeRel(check.file),
      status: missing.length ? 'hold' : 'pass',
      checks: check.mustContain,
    });
  }
  return checks;
}

function auditTraceSurfaces(root: string, findings: Finding[]): CheckResult[] {
  return TRACE_SURFACES.map((surface) => {
    let ok = false;
    try {
      ok = readText(root, surface.file).includes(surface.token);
    } catch {
      ok = false;
    }
    if (!ok) {
      pushFinding(findings, {
        severity: 'warning',
        area: surface.area,
        code: 'trace_surface_not_confirmed',
        file: surface.file,
        message: `Could not confirm token "${surface.token}" in this downstream/admin/runtime surface.`,
      });
    }
    return {
      area: surface.area,
      file: normalizeRel(surface.file),
      status: ok ? 'pass' : 'hold',
      checks: [surface.token],
    };
  });
}

function protectedTermFromMessage(message: string): string | undefined {
  return message.match(/"([^"]+)"/)?.[1];
}

function topCounts(map: Map<string, number>, limit: number): Array<{ term: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function topLocaleCounts(map: Map<string, number>, limit: number): Array<{ locale: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([locale, count]) => ({ locale, count }));
}

function auditPlanContent(findings: Finding[]): PlanSummary[] {
  return PLAN_CONTENT.map(({ plan, days }) => {
    let blockers = 0;
    let warnings = 0;
    const firstBlockers: PlanSummary['firstBlockers'] = [];
    const protectedTerms = new Map<string, number>();
    const blockedLocales = new Map<string, number>();
    for (const day of days) {
      const issues = auditPlanContentLocaleIsolation(day);
      blockers += issues.filter((issue) => issue.severity === 'blocker').length;
      warnings += issues.filter((issue) => issue.severity === 'warning').length;
      for (const issue of issues) {
        if (issue.severity !== 'blocker') continue;
        if (issue.locale) {
          blockedLocales.set(issue.locale, (blockedLocales.get(issue.locale) ?? 0) + 1);
        }
        if (issue.code === 'protected_english_term_missing') {
          const term = protectedTermFromMessage(issue.message);
          if (term) protectedTerms.set(term, (protectedTerms.get(term) ?? 0) + 1);
        }
        if (firstBlockers.length < 8) {
          firstBlockers.push({
            day: day.dayIndex,
            code: issue.code,
            path: issue.path,
            locale: issue.locale,
            message: issue.message,
          });
        }
      }
    }
    const protectedAnchorBlockers = topCounts(protectedTerms, 12);
    const blockedLocaleCounts = topLocaleCounts(blockedLocales, 8);
    if (blockers > 0) {
      pushFinding(findings, {
        severity: 'blocker',
        area: `PlanContent:${plan}`,
        code: 'plan_content_locale_blockers',
        file: `app/plan_content_${plan}.ts`,
        message: `${plan} has ${blockers} source-locale blockers. Content generation must stay HOLD until fixed.`,
        sample: [
          ...firstBlockers.map((b) => `day ${b.day} ${b.path} ${b.locale ?? ''}`),
          ...protectedAnchorBlockers.slice(0, 4).map((item) => `anchor "${item.term}" x${item.count}`),
        ].join(' | '),
      });
    }
    if (warnings > 0) {
      pushFinding(findings, {
        severity: 'warning',
        area: `PlanContent:${plan}`,
        code: 'plan_content_locale_warnings',
        file: `app/plan_content_${plan}.ts`,
        message: `${plan} has ${warnings} duplicate/cognate review warnings.`,
      });
    }
    return {
      plan,
      days: days.length,
      blockers,
      warnings,
      protectedAnchorBlockers,
      blockedLocales: blockedLocaleCounts,
      firstBlockers,
    };
  });
}

function buildNextActions(report: Omit<HeisenbergPreflightReport, 'nextActions'>): string[] {
  const actions: string[] = [];
  const blockedPlans = report.planContent.filter((plan) => plan.blockers > 0);
  if (blockedPlans.length) {
    actions.push(`Finish locale containers for blocked PlanContent plans: ${blockedPlans.map((p) => `${p.plan}(${p.blockers})`).join(', ')}.`);
  }
  if (report.findings.some((finding) => finding.code === 'missing_contract_token')) {
    actions.push('Restore every missing prompt/runtime/client language contract before generating more content.');
  }
  if (!actions.length) {
    actions.push('Preflight is GO: content generation may proceed, then rerun this report and focused tests.');
  } else {
    actions.push('Do not activate or publish generated content while any blocker remains.');
  }
  return actions;
}

function renderMarkdown(report: HeisenbergPreflightReport): string {
  const planRows = report.planContent.map((plan) => (
    `| ${plan.plan} | ${plan.days} | ${plan.blockers} | ${plan.warnings} |`
  ));
  const checkRows = report.checks.map((check) => (
    `| ${check.status.toUpperCase()} | ${check.area} | ${check.file ?? ''} |`
  ));
  const findingRows = report.findings.slice(0, 120).map((finding) => (
    `- [${finding.severity}] ${finding.code} ${finding.area}${finding.file ? ` (${finding.file})` : ''}: ${finding.message}${finding.sample ? ` | ${finding.sample}` : ''}`
  ));
  const anchorRows = report.planContent.flatMap((plan) => {
    if (!plan.protectedAnchorBlockers.length) return [];
    const anchors = plan.protectedAnchorBlockers.map((item) => `${item.term} (${item.count})`).join(', ');
    const locales = plan.blockedLocales.map((item) => `${item.locale} (${item.count})`).join(', ');
    return [`| ${plan.plan} | ${anchors} | ${locales} |`];
  });

  return [
    '# Heisenberg Preflight Brain',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Source locales: ${report.sourceLocales.join(', ')}`,
    '',
    '## Summary',
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- PlanContent blockers: ${report.summary.planContentBlockers}`,
    `- PlanContent warnings: ${report.summary.planContentWarnings}`,
    '',
    '## PlanContent Containers',
    '| Plan | Days | Blockers | Warnings |',
    '| --- | ---: | ---: | ---: |',
    ...planRows,
    '',
    '## Protected Anchor Blockers',
    '| Plan | Top Anchors | Locales |',
    '| --- | --- | --- |',
    ...(anchorRows.length ? anchorRows : ['| none | none | none |']),
    '',
    '## Contract Checks',
    '| Status | Area | File |',
    '| --- | --- | --- |',
    ...checkRows,
    '',
    '## Findings',
    ...(findingRows.length ? findingRows : ['No findings.']),
    '',
    '## Next Actions',
    ...report.nextActions.map((action) => `- ${action}`),
    '',
    '## Operating Rule',
    'Heisenberg must run this preflight before new source-locale generation or activation. Content work starts only after prompt contracts, runtime adapters, client language forwarding, AI post-generation gates, and PlanContent containers are accounted for.',
  ].join('\n');
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function buildHeisenbergPreflightReport(root = process.cwd()): HeisenbergPreflightReport {
  const findings: Finding[] = [];
  const planContent = auditPlanContent(findings);
  const checks = [
    ...auditContracts(root, findings),
    ...auditTraceSurfaces(root, findings),
  ];
  const summary = {
    blockers: findings.filter((finding) => finding.severity === 'blocker').length,
    warnings: findings.filter((finding) => finding.severity === 'warning').length,
    info: findings.filter((finding) => finding.severity === 'info').length,
    planContentBlockers: planContent.reduce((sum, plan) => sum + plan.blockers, 0),
    planContentWarnings: planContent.reduce((sum, plan) => sum + plan.warnings, 0),
  };
  const baseReport = {
    generatedAt: new Date().toISOString(),
    mode: 'heisenberg-preflight-brain' as const,
    sourceLocales: SOURCE_LOCALES,
    status: summary.blockers > 0 ? 'HOLD' as const : 'GO' as const,
    summary,
    planContent,
    checks,
    findings,
  };
  return {
    ...baseReport,
    nextActions: buildNextActions(baseReport),
  };
}

function writeReport(root: string, report: HeisenbergPreflightReport): string {
  const relOutDir = path.join('docs', 'heisenberg', 'preflight', timestampSlug());
  const outDir = path.join(root, relOutDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'preflight.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, 'preflight.md'), `${renderMarkdown(report)}\n`, 'utf8');
  return relOutDir.replace(/\\/g, '/');
}

function main(): void {
  const root = process.cwd();
  const strict = process.argv.includes('--strict');
  const report = buildHeisenbergPreflightReport(root);
  const outDir = writeReport(root, report);
  console.log(`Heisenberg preflight: ${report.status}, blockers=${report.summary.blockers}, warnings=${report.summary.warnings}`);
  console.log(`PlanContent blockers=${report.summary.planContentBlockers}, warnings=${report.summary.planContentWarnings}`);
  console.log(`Report: ${outDir}`);
  if (strict && report.summary.blockers > 0) process.exit(1);
}

if (require.main === module) {
  main();
}

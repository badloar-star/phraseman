import type { PlanContentDay } from './plan_content_schema';
import { validatePlanContentDay } from './plan_content_schema';
import { checkPlanContentGate } from './plan_content_gate_check';
import { auditPlanContentLocaleIsolation } from './plan_content_locale_gate';
import type { PlanContentGenerationJob } from './plan_content_generation_job';

/**
 * Content-agent pipeline orchestration.
 *
 * The pipeline is a deterministic STRUCTURE (roles + flow + verdicts). The thinking for
 * each role (writing phrases, checking grammar, judging) is performed by Claude in
 * session at build time — there is no runtime LLM call. This module encodes the roles
 * and the accept/reject gate so a generated day can be verified the same way every time.
 *
 * Roles (see docs/content-agents-spec.md):
 *   writers (×3 angles) -> grammar/lexicon/cefr checkers -> judge -> adversarial -> code gate
 *
 * Pure module.
 */

export type AgentRole =
  | 'writer_survival'
  | 'writer_natural'
  | 'writer_grammar_in_context'
  | 'checker_grammar'
  | 'checker_lexicon'
  | 'checker_cefr_frequency'
  | 'judge'
  | 'adversarial';

export const WRITER_ROLES: readonly AgentRole[] = [
  'writer_survival',
  'writer_natural',
  'writer_grammar_in_context',
];

export const CHECKER_ROLES: readonly AgentRole[] = [
  'checker_grammar',
  'checker_lexicon',
  'checker_cefr_frequency',
];

export type CheckerVerdict = 'pass' | 'fix' | 'reject';

export type CheckerReport = {
  role: AgentRole;
  verdict: CheckerVerdict;
  /** Concrete fixes/issues the checker found (empty when pass). */
  notes: string[];
};

export type AdversarialReport = {
  /** True when the skeptic could NOT break the day. */
  clean: boolean;
  attacks: string[];
};

/** The full record of one day going through the pipeline. */
export type PipelineRun = {
  job: PlanContentGenerationJob;
  /** Draft from each writer angle. */
  drafts: Partial<Record<AgentRole, PlanContentDay>>;
  /** Checker verdicts on the judged day. */
  checkerReports: CheckerReport[];
  /** The judge's synthesized day. */
  judged?: PlanContentDay;
  adversarial?: AdversarialReport;
};

export type PipelineGateResult = {
  accepted: boolean;
  /** Reasons the day was NOT accepted (empty when accepted). */
  blockers: string[];
};

/**
 * The final, deterministic code gate. A judged+adversarially-cleared day is accepted
 * only when it passes the content schema AND stays within the grammar gate AND every
 * checker passed AND the adversarial skeptic came up clean.
 */
export function evaluatePipelineRun(run: PipelineRun): PipelineGateResult {
  const blockers: string[] = [];

  if (!run.judged) {
    blockers.push('no_judged_day');
    return { accepted: false, blockers };
  }

  const schemaIssues = validatePlanContentDay(run.judged);
  for (const issue of schemaIssues) {
    blockers.push(`schema:${issue.code}${issue.phraseId ? `:${issue.phraseId}` : ''}`);
  }

  const gate = checkPlanContentGate(run.judged);
  if (!gate.withinGate) {
    for (const warning of gate.warnings) {
      blockers.push(`gate:${warning.phraseId}:${warning.aboveGateConstructions.join('+')}`);
    }
  }

  const localeIssues = auditPlanContentLocaleIsolation(run.judged);
  for (const issue of localeIssues) {
    if (issue.severity === 'blocker') {
      blockers.push(`locale:${issue.code}:${issue.path}${issue.locale ? `:${issue.locale}` : ''}`);
    }
  }

  const failedCheckers = run.checkerReports.filter((report) => report.verdict === 'reject');
  for (const report of failedCheckers) {
    blockers.push(`checker_reject:${report.role}`);
  }

  // Any checker still asking for fixes blocks acceptance.
  const pendingFixes = run.checkerReports.filter((report) => report.verdict === 'fix');
  for (const report of pendingFixes) {
    blockers.push(`checker_fix_pending:${report.role}`);
  }

  if (run.adversarial && !run.adversarial.clean) {
    for (const attack of run.adversarial.attacks) {
      blockers.push(`adversarial:${attack}`);
    }
  }

  // Every checker role must have reported.
  for (const role of CHECKER_ROLES) {
    if (!run.checkerReports.some((report) => report.role === role)) {
      blockers.push(`checker_missing:${role}`);
    }
  }

  // Adversarial pass is required.
  if (!run.adversarial) {
    blockers.push('adversarial_missing');
  }

  return { accepted: blockers.length === 0, blockers };
}

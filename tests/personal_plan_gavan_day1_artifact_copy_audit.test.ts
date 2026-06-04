import { readFileSync } from 'fs';
import path from 'path';
import {
  type GavanDay1ApprovedReportArtifact,
} from '../tools/personal_plan_gavan_day1_approved_report_artifact';
import {
  buildCleanGavanDay1ApprovedReport,
} from '../tools/personal_plan_gavan_day1_generated_artifact';
import {
  auditGavanDay1ApprovedArtifactCopy,
} from '../tools/personal_plan_gavan_day1_artifact_copy_audit';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';
const GENERATED_AT = '2026-06-01T12:30:00.000Z';

function buildArtifact(): GavanDay1ApprovedReportArtifact {
  return {
    artifactKind: 'gavan_day1_approved_report_artifact',
    generatedAt: GENERATED_AT,
    report: buildCleanGavanDay1ApprovedReport({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    }),
  };
}

function cloneArtifact(): GavanDay1ApprovedReportArtifact {
  return JSON.parse(JSON.stringify(buildArtifact()));
}

describe('Gavan day 1 approved artifact product copy audit', () => {
  it('reads generated artifact rows and passes once technical target tails stay in metadata', () => {
    const audit = auditGavanDay1ApprovedArtifactCopy(buildArtifact());

    expect(audit.valid).toBe(true);
    expect(audit.summary.totalRows).toBe(45);
    expect(audit.summary.rowGroups).toEqual({
      phrase_explanations: 5,
      quiz_prompts: 10,
      quiz_notes: 30,
    });
    expect(audit.issues).toEqual([]);
  });

  it('rejects robotic developer wording corrupted text and fake selected-answer context', () => {
    const artifact = cloneArtifact();
    artifact.report.groups.quizNotes[0].exactText = 'DEV placeholder: you chose the selected option.';
    artifact.report.groups.quizNotes[1].exactText = '\u00d0\u0094\u00d0\u00b0: corrupted copy.';
    artifact.report.groups.quizNotes[2].exactText = 'Да: повторяем одну и ту же формулу.';

    const audit = auditGavanDay1ApprovedArtifactCopy(artifact);
    const codes = audit.issues.map((issue) => issue.code);

    expect(audit.valid).toBe(false);
    expect(codes).toEqual(expect.arrayContaining([
      'developer_or_robotic_copy',
      'fake_selected_answer_context',
      'mojibake_marker',
      'repetitive_formula_start',
    ]));
    expect(audit.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        group: 'quiz_notes',
        snippetId: artifact.report.groups.quizNotes[0].snippetId,
        excerpt: expect.stringContaining('DEV placeholder'),
      }),
    ]));
  });

  it('rejects too-short explanation rows that cannot teach a real learner', () => {
    const artifact = cloneArtifact();
    artifact.report.groups.phraseExplanations[0].exactText = 'I am.';
    artifact.report.groups.quizNotes[0].exactText = 'No.';

    const audit = auditGavanDay1ApprovedArtifactCopy(artifact);
    const codes = audit.issues.map((issue) => issue.code);

    expect(audit.valid).toBe(false);
    expect(codes).toEqual(expect.arrayContaining([
      'phrase_explanation_too_short',
      'quiz_note_too_short',
    ]));
  });

  it('rejects wrong row counts and non-approved rows', () => {
    const artifact = cloneArtifact();
    artifact.report.groups.quizPrompts.pop();
    artifact.report.groups.quizNotes[0].reviewStatus = 'needs_manual_review' as 'approved';

    const audit = auditGavanDay1ApprovedArtifactCopy(artifact);
    const codes = audit.issues.map((issue) => issue.code);

    expect(audit.valid).toBe(false);
    expect(codes).toEqual(expect.arrayContaining([
      'wrong_row_counts',
      'non_approved_row',
    ]));
  });

  it('stays outside UI storage live catalog and live quiz registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_day1_artifact_copy_audit.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from '../app/personal_plan_catalog'");
    expect(source).not.toContain("from '../app/personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});

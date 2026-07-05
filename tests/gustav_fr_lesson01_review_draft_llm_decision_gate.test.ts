import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_review_draft_llm_decision_gate_audit_v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_review_draft_llm_decision_gate_audit_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_validate_fr_lesson01_review_draft_llm_decisions.mjs');

describe('Gustav French lesson 1 review-draft LLM decision gate', () => {
  it('allows only materialization contract after 50 accepted official-source LLM decisions while keeping apply closed', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('decisions_file_missing');
    expect(script).toContain('expected_${REQUIRED_ROWS}_decision_rows_got');
    expect(script).toContain('rows_have_missing_gate_notes');
    expect(script).toContain('rows_have_schema_extra_keys');
    expect(script).toContain('reviewerImportAllowed || decision.productionApplyAllowed || decision.activationApproved');
    expect(script).toContain("status: readyForMaterialization ? 'PASS_READY_FOR_MATERIALIZATION_CONTRACT' : 'HOLD'");

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-review-draft-llm-decision-gate-audit-v1');
    expect(audit.status).toBe('PASS_READY_FOR_MATERIALIZATION_CONTRACT');
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourcePacket).toBe('docs/gustav/generated/fr/reviewer/fr_lesson01_review_draft_llm_packet_v1.json');
    expect(audit.decisionsPath).toBe('docs/gustav/generated/fr/reviewer/fr_lesson01_review_draft_llm_decisions_v1.jsonl');
    expect(audit.decisionsPresent).toBe(true);
    expect(audit.decisionRows).toBe(50);
    expect(audit.acceptedRows).toBe(50);
    expect(audit.uniqueRequestIds).toBe(50);
    expect(audit.openedImportApplyActivationRows).toBe(0);
    expect(audit.rowsWithGateFailures).toBe(0);
    expect(audit.rowsWithMissingGateNotes).toBe(0);
    expect(audit.rowsWithSchemaExtraKeys).toBe(0);
    expect(audit.rowsWithCorrections).toBe(0);
    expect(audit.readyForMaterialization).toBe(true);
    expect(audit.readyForApply).toBe(false);
    expect(audit.productionApplyApproved).toBe(false);
    expect(audit.activationApproved).toBe(false);
    expect(audit.blockers).toEqual([]);

    expect(markdown).toContain('# French Lesson 1 Review Draft LLM Decision Gate');
    expect(markdown).toContain('Status: PASS_READY_FOR_MATERIALIZATION_CONTRACT');
    expect(markdown).toContain('- readyForApply: false');
  });
});

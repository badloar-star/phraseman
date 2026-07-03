import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PACKET_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_lesson_scope_sequence_packet.json');
const DECISION_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_lesson_order_decision.md');

describe('Gustav fr-002 core lessons scope sequence work order', () => {
  it('creates a French-specific 32-lesson sequence while keeping current generated lessons on HOLD', () => {
    const packet = JSON.parse(fs.readFileSync(PACKET_PATH, 'utf8'));
    const decision = fs.readFileSync(DECISION_PATH, 'utf8');

    expect(packet.schemaVersion).toBe('gustav-fr-lesson-scope-sequence-packet-v1');
    expect(packet.workOrderId).toBe('fr-002-core_lessons_32');
    expect(packet.studyTarget).toBe('fr');
    expect(packet.reasoningLevel).toBe('deep');
    expect(packet.status).toBe('PASS');
    expect(packet.activationApproved).toBe(false);
    expect(packet.lessonCount).toBe(32);
    expect(packet.targetLessonOrder).toHaveLength(32);
    expect(packet.currentLessonFingerprint).toHaveLength(32);

    expect(packet.sourceIds).toEqual(
      expect.arrayContaining([
        'coe_cefr_companion_2020',
        'tv5monde_a1',
        'tv5monde_a2',
        'alliance_francaise_normandie_levels',
      ]),
    );
    expect(packet.copiedEnglishOrderWithoutAudit).toBe(false);
    expect(packet.officialSourceEvidence).toBe('pass');
    expect(packet.targetSequenceFit).toBe('pass');
    expect(packet.currentGeneratedOrderAssessment.verdict).toBe('HOLD');
    expect(packet.gates.current_generated_lessons_reconciled_gate).toBe('HOLD');

    const lesson3 = packet.targetLessonOrder.find((lesson: any) => lesson.lessonId === 3);
    expect(lesson3.targetGrammarFocus).toEqual(expect.arrayContaining(['gender', 'definite articles', 'indefinite articles']));

    const lesson13 = packet.targetLessonOrder.find((lesson: any) => lesson.lessonId === 13);
    expect(lesson13.targetGrammarFocus).toEqual(expect.arrayContaining(['partitive articles', 'food quantities', 'negative de']));

    expect(decision).toContain('Existing generated lesson ledgers are not production-ready until reconciled/rebuilt');
    expect(decision).toContain('English lesson shape remains product evidence only');
  });
});

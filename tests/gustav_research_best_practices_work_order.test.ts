import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const RESEARCH_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'research_best_practices', 'fr_feature_research_packets.json');
const ANTI_CALQUE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'research_best_practices', 'fr_anti_calque_rules.json');
const BEST_PRACTICE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'research_best_practices', 'fr_best_practice_notes.json');

describe('Gustav fr-001 research best practices work order', () => {
  it('creates source-backed French research packets without approving production activation', () => {
    const research = JSON.parse(fs.readFileSync(RESEARCH_PATH, 'utf8'));
    const antiCalque = JSON.parse(fs.readFileSync(ANTI_CALQUE_PATH, 'utf8'));
    const bestPractice = JSON.parse(fs.readFileSync(BEST_PRACTICE_PATH, 'utf8'));

    expect(research.schemaVersion).toBe('gustav-fr-feature-research-packets-v1');
    expect(research.workOrderId).toBe('fr-001-research_best_practices');
    expect(research.status).toBe('PASS');
    expect(research.activationApproved).toBe(false);
    expect(research.summary.packetCount).toBeGreaterThanOrEqual(22);
    expect(research.summary.passCount).toBe(research.summary.packetCount);

    const packetsByFeature = new Map(research.packets.map((packet: any) => [packet.featureId, packet]));
    for (const featureId of [
      'core_lessons_32',
      'lesson_theory',
      'vocabulary_bank',
      'grammar_hubs',
      'quizzes',
      'quiz_explanations',
      'mistake_explanations',
      'compass_ai',
      'personal_practice',
      'flashcards',
      'daily_phrase_tasks',
      'diagnostics_exams',
      'personal_plans',
      'arena',
      'audio_tts',
      'server_course_packs',
      'storage_cloud_isolation',
      'admin_website',
    ]) {
      const packet = packetsByFeature.get(featureId) as any;
      expect(packet).toBeTruthy();
      expect(packet.verdict).toBe('PASS');
      expect(packet.activationApproved).toBe(false);
      expect(packet.sourceIds.length).toBeGreaterThan(0);
      expect(packet.targetLanguageClaims.length).toBeGreaterThan(0);
      expect(packet.generationConstraints.length).toBeGreaterThan(0);
      expect(packet.reviewerChecks.length).toBeGreaterThan(0);
      expect(packet.unresolvedConflicts).toEqual([]);
    }

    expect((packetsByFeature.get('core_lessons_32') as any).sourceIds).toEqual(
      expect.arrayContaining(['coe_cefr_companion_2020', 'tv5monde_a1', 'tv5monde_a2']),
    );
    expect((packetsByFeature.get('vocabulary_bank') as any).sourceIds).toContain('le_robert_dictionary');
    expect((packetsByFeature.get('grammar_hubs') as any).sourceIds).toContain('le_robert_conjugation');

    expect(antiCalque.schemaVersion).toBe('gustav-fr-anti-calque-rules-v1');
    expect(antiCalque.activationApproved).toBe(false);
    expect(antiCalque.rules.map((rule: any) => rule.id)).toEqual(
      expect.arrayContaining(['fr_no_english_order_copy', 'fr_seed_not_parity', 'fr_not_source_locale']),
    );

    expect(bestPractice.schemaVersion).toBe('gustav-fr-best-practice-notes-v1');
    expect(bestPractice.activationApproved).toBe(false);
    expect(bestPractice.notes.length).toBeGreaterThanOrEqual(5);
  });
});

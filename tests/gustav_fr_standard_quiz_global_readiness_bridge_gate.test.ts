import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'quizzes', 'fr_standard_quiz_global_readiness_bridge_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_standard_quiz_global_readiness_bridge_gate.mjs');

describe('Gustav French standard quiz global readiness bridge gate', () => {
  it('proves standard quizzes are a native server-pack surface while global French activation stays closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('QUIZ_PAYLOAD_OVERLAPS_CORE_LESSON_PHRASES');
    expect(script).toContain('MOJIBAKE_PATTERN');
    expect(script).toContain('PLACEHOLDER_PATTERN');

    expect(gate.schemaVersion).toBe('gustav-fr-standard-quiz-global-readiness-bridge-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.surface).toBe('quiz');
    expect(gate.section).toBe('standard');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);

    expect(gate.summary).toMatchObject({
      quizRowsPerLocale: 840,
      totalRuntimeRows: 1680,
      acceptedContentRows: 840,
      ruOverlapWithCoreLessons: 0,
      ukOverlapWithCoreLessons: 0,
      ruIssueCount: 0,
      ukIssueCount: 0,
      finalGateStatus: 'READY_FOR_EXPLICIT_ACTIVATION_APPROVAL',
      quizSurfaceProductionReadyForApproval: true,
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.summary.lessonPhrasesCompared).toBeGreaterThanOrEqual(1500);

    expect(gate.validations.ru).toMatchObject({
      sourceLocale: 'ru',
      entries: 840,
      overlapWithLessons: 0,
      issueCount: 0,
    });
    expect(gate.validations.uk).toMatchObject({
      sourceLocale: 'uk',
      entries: 840,
      overlapWithLessons: 0,
      issueCount: 0,
    });
    expect(gate.validations.ru.levels).toEqual({ A2: 240, A1: 240, B1: 210, B2: 150 });
    expect(gate.validations.ru.difficulties).toEqual({ easy: 300, medium: 240, hard: 300 });
    expect(gate.validations.uk.levels).toEqual(gate.validations.ru.levels);
    expect(gate.validations.uk.difficulties).toEqual(gate.validations.ru.difficulties);

    expect(gate.invariants).toMatchObject({
      noLessonRowFanout: true,
      fullSentenceMcqOnly: true,
      fourChoicesAndFourExplanations: true,
      sourceLocaleSeparated: true,
      officialSourceCoverageRequired: true,
      noMojibakeOrPlaceholders: true,
      activationRemainsClosed: true,
    });
    expect(gate.blockers).toEqual([]);
    expect(gate.nextRequiredGlobalSteps[0]).toContain('Keep French global activation HOLD');
  });
});

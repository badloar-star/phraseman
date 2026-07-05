import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const CANDIDATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_blueprint_rebuild_candidate_v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_blueprint_rebuild_candidate_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_candidate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild candidate', () => {
  it('creates a readable 50-row French-native A1 lesson from the English blueprint without production activation', () => {
    const candidate = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('lesson01_blueprint_rebuild_candidate_v1');
    expect(script).toContain('accentLeakPattern');
    expect(script).toContain('English lexical list');

    expect(candidate.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-candidate-v1');
    expect(candidate.status).toBe('HOLD_REVIEW_CANDIDATE_READY_FOR_USER_CHECK');
    expect(candidate.studyTarget).toBe('fr');
    expect(candidate.sourceStudyTarget).toBe('en');
    expect(candidate.lessonId).toBe(1);
    expect(candidate.appCourseLevel).toBe('A1');
    expect(candidate.activationApproved).toBe(false);
    expect(candidate.summary).toMatchObject({
      rows: 50,
      distractorsPerSlot: 5,
      validationBlockers: 0,
      activationApproved: false,
      readyForApply: false,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
    });
    expect(candidate.summary.wordsFrSlots).toBeGreaterThanOrEqual(150);

    expect(candidate.blueprintBasis.copiedFromEnglish).toEqual(expect.arrayContaining([
      '50-row product count',
      'per-word slot structure',
      'five distractors per slot',
    ]));
    expect(candidate.blueprintBasis.notCopiedFromEnglish).toEqual(expect.arrayContaining([
      'English lexical list',
      'English spelling distractors',
      'English-only phrases such as you are right / hungry where French uses avoir',
    ]));

    const phrases = candidate.rows.map((row: { phraseFr: string }) => row.phraseFr);
    expect(phrases).toHaveLength(50);
    expect(new Set(phrases).size).toBe(50);
    expect(phrases).toEqual(expect.arrayContaining([
      'Je suis ici.',
      'Tu es là.',
      'Il est prêt.',
      'Elle est prête.',
      'Nous sommes en sécurité.',
      'Vous êtes en retard.',
      "C'est sérieux.",
      "C'est possible.",
    ]));

    const textDump = JSON.stringify(candidate);
    expect(textDump).not.toMatch(/\b(etes|pret|prete|prets|pretes|occupe|occupee|fatigue|fatiguee|securite|casse|serieux)\b/);
    expect(textDump).toContain('êtes');
    expect(textDump).toContain('prêt');
    expect(textDump).toContain('sécurité');
    expect(textDump).toContain('sérieux');

    for (const row of candidate.rows) {
      expect(row.wordsFr.length).toBeGreaterThanOrEqual(3);
      for (const word of row.wordsFr) {
        expect(word.correct).toBe(word.text);
        expect(word.distractors).toHaveLength(5);
        expect(new Set(word.distractors).size).toBe(5);
        expect(word.distractors).not.toContain(word.correct);
      }
    }

    expect(candidate.trustedEvidence.map((source: { id: string }) => source.id)).toEqual(expect.arrayContaining([
      'le_robert_etre_present',
      'tv5monde_etre_present_a1',
      'coe_cefr_a1_short_simple_phrases',
      'phraseman_english_lesson1_blueprint',
    ]));
    expect(candidate.theory.sections).toHaveLength(5);
    expect(candidate.productionBlockers).toEqual(expect.arrayContaining([
      'USER_REVIEW_NOT_DONE',
      'LLM_TRUSTED_SOURCE_REVIEW_NOT_DONE_FOR_THIS_REBUILD',
      'AUDIO_NOT_GENERATED',
      'SERVER_PACK_NOT_BUILT',
    ]));
    expect(candidate.safety).toMatchObject({
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      firebaseUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    });

    expect(markdown).toContain('| 50 |');
    expect(markdown).toContain('Je suis ici.');
    expect(markdown).toContain('Vous êtes en retard.');
    expect(markdown).toContain('## Production Blockers');

    expect(state.lesson01BlueprintRebuildCandidate).toBe('docs/gustav/generated/fr/review/lesson01_blueprint_rebuild_candidate_v1.json');
    expect(state.lesson01BlueprintRebuildCandidateMd).toBe('docs/gustav/generated/fr/review/lesson01_blueprint_rebuild_candidate_v1.md');
    expect(state.lesson01BlueprintRebuildCandidateStatus).toBe('HOLD_REVIEW_CANDIDATE_READY_FOR_USER_CHECK');
  });
});

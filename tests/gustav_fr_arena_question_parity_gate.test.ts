import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'arena', 'fr_arena_question_parity_gate_v1.json');
const BANK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'arena', 'fr_arena_question_bank_v1.json');
const RU_PAYLOAD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'arena', 'fr_arena_questions_runtime_payload_ru.dryrun.json');
const UK_PAYLOAD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'arena', 'fr_arena_questions_runtime_payload_uk.dryrun.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_arena_question_parity_gate.mjs');

const EXPECTED_LEVEL_COUNTS = { A1: 387, A2: 688, B1: 1022, B2: 2245 };
const ALLOWED_TYPES = new Set(['fill_blank', 'find_error', 'choose', 'translate_meaning']);

function validatePayload(payload: any, sourceLocale: 'ru' | 'uk') {
  expect(payload).toMatchObject({
    schemaVersion: 'gustav-fr-arena-runtime-payload-v1',
    studyTarget: 'fr',
    sourceLocale,
    surface: 'arena',
    productionReady: false,
    activationApproved: false,
  });
  expect(payload.entries).toHaveLength(4342);
  const ids = new Set<string>();
  const levels: Record<string, number> = {};
  for (const row of payload.entries) {
    expect(ids.has(row.id)).toBe(false);
    ids.add(row.id);
    levels[row.level] = (levels[row.level] ?? 0) + 1;
    expect(row.studyTarget).toBe('fr');
    expect(row.sourceLocale).toBe(sourceLocale);
    expect(row.surface).toBe('arena');
    expect(ALLOWED_TYPES.has(row.type)).toBe(true);
    expect(row.options).toHaveLength(4);
    expect(new Set(row.options).size).toBe(4);
    expect(row.options).toContain(row.correct);
    expect(row.activationApproved).toBe(false);
    expect(row.acceptedForProduction).toBe(false);
    expect(row.question.trim()).toBeTruthy();
    expect(row.rule.trim()).toBeTruthy();
    expect(row.targetContentLang).toBe('fr');
  }
  expect(levels).toEqual(EXPECTED_LEVEL_COUNTS);
}

describe('Gustav French arena question parity gate', () => {
  it('builds French arena server-pack candidates matching English level counts without app apply', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const bank = JSON.parse(fs.readFileSync(BANK_PATH, 'utf8'));
    const ruPayload = JSON.parse(fs.readFileSync(RU_PAYLOAD_PATH, 'utf8'));
    const ukPayload = JSON.parse(fs.readFileSync(UK_PAYLOAD_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('server-pack-candidate');
    expect(script).toContain('matchesEnglishArenaCountsByLevel');
    expect(script).toContain('appBundleAssetsNotModified');

    expect(gate.schemaVersion).toBe('gustav-fr-arena-question-parity-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.surface).toBe('arena');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.summary).toMatchObject({
      englishBlueprintCounts: EXPECTED_LEVEL_COUNTS,
      frenchLessonRowsUsed: 1600,
      ruRuntimeRows: 4342,
      ukRuntimeRows: 4342,
      totalRuntimeRows: 8684,
      levelsRu: EXPECTED_LEVEL_COUNTS,
      levelsUk: EXPECTED_LEVEL_COUNTS,
      ruIssueCount: 0,
      ukIssueCount: 0,
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.blockers).toEqual([]);
    expect(gate.invariants).toMatchObject({
      matchesEnglishArenaCountsByLevel: true,
      serverPackCandidateOnly: true,
      appBundleAssetsNotModified: true,
      noQuizLogicType: true,
      fourOptionsCorrectInOptions: true,
      sourceLocaleSeparated: true,
      targetContentLangFrench: true,
      noPlainLessonQuestionFanout: true,
      noMojibakeOrPlaceholders: true,
      activationRemainsClosed: true,
    });

    expect(bank).toMatchObject({
      schemaVersion: 'gustav-fr-arena-question-bank-v1',
      studyTarget: 'fr',
      targetContentLang: 'fr',
      surface: 'arena',
      delivery: 'server-pack-candidate',
      productionReady: false,
      activationApproved: false,
      englishBlueprintCounts: EXPECTED_LEVEL_COUNTS,
    });
    validatePayload(ruPayload, 'ru');
    validatePayload(ukPayload, 'uk');
  });
});

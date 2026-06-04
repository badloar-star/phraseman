import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ContentAuthoringSeed,
  GAVAN_WEEK1_CONTENT_AUTHORING_SEED_PATH,
  validateGavanWeek1ContentAuthoringSeed,
  writeGavanWeek1ContentAuthoringSeed,
} from '../tools/personal_plan_gavan_week1_content_authoring_seed';

const GENERATED_AT = '2026-06-03T12:00:00.000Z';

describe('Gavan week 1 content authoring seed after reset', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_CONTENT_AUTHORING_SEED_PATH)) {
      rmSync(GAVAN_WEEK1_CONTENT_AUTHORING_SEED_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_CONTENT_AUTHORING_SEED_PATH,
    });
  });

  it('builds a non-live seven-day content seed after the reset', () => {
    const seed = buildGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
    });

    expect(seed).toEqual(expect.objectContaining({
      kind: 'gavan_week1_content_authoring_seed',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'content_authoring_seed_not_live',
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
    expect(seed.days).toHaveLength(7);
    expect(seed.days.map((day) => day.dayIndex)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(seed.legacyResetPolicy.legacyArtifactsTreatedAs).toBe('non_canonical_reset_evidence');
  });

  it('keeps the week broad and rejects narrow identity relocation anchors', () => {
    const seed = buildGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
    });
    const serialized = JSON.stringify(seed.days).toLowerCase();

    expect(seed.forbiddenContentPatterns).toEqual(expect.arrayContaining([
      'alex',
      'beta',
      'phone',
      'email',
      'apartment',
      'rent',
      'landlord',
      'viewing',
      'passport number',
      'doctor appointment',
    ]));
    expect(serialized).not.toMatch(/\balex\b|\bbeta\b|phone|email|apartment|rent|landlord|viewing|087|@/);
    expect(seed.days.every((day) => day.socialSafety === 'broad_everyday_public')).toBe(true);
    expect(seed.days.every((day) => day.userFacingCopyMustAvoidDevLanguage)).toBe(true);
  });

  it('gives every day a title goal lesson bridge minute load phrases explanations quiz intent and recall plan', () => {
    const seed = buildGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
    });

    seed.days.forEach((day) => {
      expect(day.userFacingTitle.length).toBeGreaterThanOrEqual(6);
      expect(day.universalGoal.length).toBeGreaterThanOrEqual(24);
      expect(day.lessonBridge.prerequisiteLessonIds.length).toBeGreaterThanOrEqual(1);
      expect(day.lessonBridge.mustExplainBeforeUse).toBe(true);
      expect(Object.keys(day.loadByMinutes)).toEqual(['5', '10', '15', '20']);
      expect(day.phraseBank.length).toBeGreaterThanOrEqual(4);
      expect(day.quizIntent.questionCount).toBe(10);
      expect(day.quizIntent.finalQuizWritten).toBe(false);
      expect(day.recallPlan.enabled).toBe(true);
      expect(day.recallPlan.errorsReturnLater).toBe(true);
    });
  });

  it('varies exercise formats across the week and avoids fake built assets', () => {
    const seed = buildGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
    });
    const exerciseTypes = new Set(
      seed.days.flatMap((day) => day.exerciseBlocks.map((block) => block.exerciseType)),
    );

    expect(exerciseTypes.size).toBeGreaterThanOrEqual(8);
    expect([...exerciseTypes]).toEqual(expect.arrayContaining([
      'lesson_bridge',
      'phrase_build',
      'missing_word',
      'natural_choice',
      'listening_choice',
      'active_recall',
      'quick_reply',
      'mistake_repair',
    ]));
    expect(seed.days.every((day) => day.mediaClaims.audioAssetStatus === 'not_generated')).toBe(true);
    expect(seed.days.every((day) => day.mediaClaims.pronunciationScoringStatus === 'not_built')).toBe(true);
  });

  it('requires explanations for new words and first-seen constructions without inventing wrong choices', () => {
    const seed = buildGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
    });

    seed.days.forEach((day) => {
      day.phraseBank.forEach((phrase) => {
        const covered = new Set(phrase.explanationCards.flatMap((card) => card.covers));
        [...phrase.newWords, ...phrase.firstSeenConstructions].forEach((target) => {
          expect(covered.has(target)).toBe(true);
        });
        expect(phrase.explanationCards.every((card) => card.correctTone === 'calm_confirming')).toBe(true);
        expect(phrase.explanationCards.every((card) => card.wrongTone === 'supportive_repair')).toBe(true);
        expect(phrase.explanationCards.every((card) => card.mustNotMentionUnseenWrongOption)).toBe(true);
      });
    });
  });

  it('passes its own quality gate and catches corrupted content seeds', () => {
    const seed = buildGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
    });

    expect(validateGavanWeek1ContentAuthoringSeed(seed)).toEqual({
      valid: true,
      issues: [],
    });

    const corrupted = {
      ...seed,
      days: [
        {
          ...seed.days[0],
          userFacingTitle: 'Scene 1',
          phraseBank: [
            {
              ...seed.days[0].phraseBank[0],
              english: 'My phone number is 0871234567.',
              explanationCards: [],
            },
          ],
          exerciseBlocks: seed.days[0].exerciseBlocks.filter((block) =>
            block.exerciseType !== 'lesson_bridge',
          ),
          mediaClaims: {
            ...seed.days[0].mediaClaims,
            audioAssetStatus: 'generated',
          },
        },
      ],
    };

    const result = validateGavanWeek1ContentAuthoringSeed(corrupted as any);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'wrong_day_count' }),
      expect.objectContaining({ code: 'forbidden_user_facing_term' }),
      expect.objectContaining({ code: 'forbidden_anchor_present' }),
      expect.objectContaining({ code: 'missing_required_exercise_type' }),
      expect.objectContaining({ code: 'missing_explanation_coverage' }),
      expect.objectContaining({ code: 'fake_audio_claim' }),
    ]));
  });

  it('writes deterministic seed JSON only under temp or report roots', () => {
    const result = writeGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_CONTENT_AUTHORING_SEED_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-content-authoring-seed.json',
    ));
    expect(existsSync(GAVAN_WEEK1_CONTENT_AUTHORING_SEED_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_CONTENT_AUTHORING_SEED_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_content_authoring_seed');
    expect(parsed.days).toHaveLength(7);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-content-seed.json'),
    });
    const toolsResult = writeGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-content-seed.json'),
    });
    const testsResult = writeGavanWeek1ContentAuthoringSeed({
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-content-seed.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolsResult.valid).toBe(false);
    expect(testsResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolsResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testsResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import or mutate live app routes catalog quiz UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_content_authoring_seed.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});

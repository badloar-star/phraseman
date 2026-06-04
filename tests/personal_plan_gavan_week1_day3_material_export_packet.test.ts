import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ContentAuthoringSeed,
} from '../tools/personal_plan_gavan_week1_content_authoring_seed';
import {
  buildGavanWeek1Day1MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day1_material_candidate';
import {
  buildGavanWeek1Day1MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day1_material_export_packet';
import {
  buildGavanWeek1Day2MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day2_material_candidate';
import {
  buildGavanWeek1Day2MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day2_material_export_packet';
import {
  buildGavanWeek1Day3MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day3_material_candidate';
import {
  buildGavanWeek1Day3MaterialExportPacket,
  GAVAN_WEEK1_DAY3_MATERIAL_EXPORT_PACKET_PATH,
  writeGavanWeek1Day3MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day3_material_export_packet';

const GENERATED_AT = '2026-06-03T18:00:00.000Z';

function seed() {
  return buildGavanWeek1ContentAuthoringSeed({
    generatedAt: GENERATED_AT,
  });
}

function day1Export() {
  const sourceSeed = seed();
  const day1Candidate = buildGavanWeek1Day1MaterialCandidate(sourceSeed, {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day1MaterialExportPacket(day1Candidate, sourceSeed, {
    generatedAt: GENERATED_AT,
  });
}

function day2Export() {
  const sourceSeed = seed();
  const sourceDay1Export = day1Export();
  const day2Candidate = buildGavanWeek1Day2MaterialCandidate(sourceSeed, sourceDay1Export, {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day2MaterialExportPacket(day2Candidate, sourceSeed, sourceDay1Export, {
    generatedAt: GENERATED_AT,
  });
}

function candidate() {
  return buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
    generatedAt: GENERATED_AT,
  });
}

describe('Gavan week 1 day 3 material quality export packet', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY3_MATERIAL_EXPORT_PACKET_PATH)) {
      rmSync(GAVAN_WEEK1_DAY3_MATERIAL_EXPORT_PACKET_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day3MaterialExportPacket(candidate(), seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY3_MATERIAL_EXPORT_PACKET_PATH,
    });
  });

  it('builds a non-live reviewer export packet from the day 3 material candidate', () => {
    const packet = buildGavanWeek1Day3MaterialExportPacket(candidate(), seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day3_material_export_packet',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day3',
      status: 'day3_material_export_not_live',
      sourceCandidateStatus: 'day3_material_candidate_not_live',
      exportApproved: false,
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
  });

  it('summarizes blocks phrases tiles missing-word recall and quiz intent', () => {
    const packet = buildGavanWeek1Day3MaterialExportPacket(candidate(), seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet.reviewerSummary).toEqual(expect.objectContaining({
      blockCount: 5,
      phraseCount: 4,
      phraseBuildItemCount: 4,
      missingWordItemCount: 4,
      quizBlueprintCount: 10,
      recallHasHints: false,
      recallHighlightsCorrectWords: false,
    }));
    expect(packet.reviewerSummary.exerciseTypes).toEqual([
      'lesson_bridge',
      'phrase_build',
      'missing_word',
      'active_recall',
      'day_quiz_intent',
    ]);
  });

  it('includes pass quality gates for the valid day 3 candidate', () => {
    const packet = buildGavanWeek1Day3MaterialExportPacket(candidate(), seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });
    const gateMap = new Map(packet.qualityGates.map((gate) => [gate.id, gate.status]));

    expect(packet.qualityGates).toHaveLength(9);
    expect([...gateMap.keys()]).toEqual([
      'broadness',
      'word_tile_counts',
      'distractor_safety',
      'explanation_coverage',
      'missing_word_slot_quality',
      'no_recall_highlighting',
      'quiz_count',
      'media_honesty',
      'no_production_writes',
    ]);
    expect([...gateMap.values()].every((status) => status === 'pass')).toBe(true);
  });

  it('includes a compact human-readable preview of day 3', () => {
    const packet = buildGavanWeek1Day3MaterialExportPacket(candidate(), seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet.preview.titleRu).toBe(candidate().sourceSeedDayTitle);
    expect(packet.preview.phrases.map((phrase) => phrase.english)).toEqual([
      'I need some help.',
      'I need a minute.',
      'I need to check.',
      'Could you help me with this?',
    ]);
    expect(packet.preview.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'missing_word' }),
      expect.objectContaining({ type: 'active_recall' }),
      expect.objectContaining({ type: 'day_quiz_intent' }),
    ]));
    expect(packet.preview.missingWordLine).toContain('4');
    expect(packet.preview.recallLine).toContain('no hints');
    expect(packet.preview.quizLine).toContain('10');
  });

  it('blocks export quality when candidate gates fail instead of approving it', () => {
    const sourceCandidate = candidate();
    const brokenCandidate = {
      ...sourceCandidate,
      phraseBuildItems: [
        {
          ...sourceCandidate.phraseBuildItems[0],
          wordTiles: ['I'],
          distractorTiles: ['I'],
        },
      ],
      missingWordItems: [
        {
          ...sourceCandidate.missingWordItems[0],
          visibleSlots: ['__'],
          distractorTiles: [sourceCandidate.missingWordItems[0].answer],
        },
      ],
      activeRecall: {
        ...sourceCandidate.activeRecall,
        correctWordHighlighting: true,
      },
      dayQuizIntent: {
        ...sourceCandidate.dayQuizIntent,
        questionBlueprints: sourceCandidate.dayQuizIntent.questionBlueprints.slice(0, 9),
      },
    };

    const packet = buildGavanWeek1Day3MaterialExportPacket(brokenCandidate as any, seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });
    const failedGates = packet.qualityGates.filter((gate) => gate.status === 'fail');

    expect(packet.status).toBe('day3_material_export_blocked');
    expect(packet.exportApproved).toBe(false);
    expect(failedGates.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'word_tile_counts',
      'distractor_safety',
      'missing_word_slot_quality',
      'no_recall_highlighting',
      'quiz_count',
    ]));
  });

  it('writes deterministic export JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day3MaterialExportPacket(candidate(), seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY3_MATERIAL_EXPORT_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day3-material-export-packet.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY3_MATERIAL_EXPORT_PACKET_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY3_MATERIAL_EXPORT_PACKET_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day3_material_export_packet');
    expect(parsed.status).toBe('day3_material_export_not_live');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day3MaterialExportPacket(candidate(), seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day3-export.json'),
    });
    const toolsResult = writeGavanWeek1Day3MaterialExportPacket(candidate(), seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day3-export.json'),
    });
    const testsResult = writeGavanWeek1Day3MaterialExportPacket(candidate(), seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day3-export.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day3_material_export_packet.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});

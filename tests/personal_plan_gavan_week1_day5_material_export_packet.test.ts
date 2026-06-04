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
} from '../tools/personal_plan_gavan_week1_day3_material_export_packet';
import {
  buildGavanWeek1Day4MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day4_material_candidate';
import {
  buildGavanWeek1Day4MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day4_material_export_packet';
import {
  buildGavanWeek1Day5MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day5_material_candidate';
import {
  buildGavanWeek1Day5MaterialExportPacket,
  GAVAN_WEEK1_DAY5_MATERIAL_EXPORT_PACKET_PATH,
  writeGavanWeek1Day5MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day5_material_export_packet';

const GENERATED_AT = '2026-06-03T22:00:00.000Z';

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

function day3Export() {
  const sourceSeed = seed();
  const sourceDay2Export = day2Export();
  const day3Candidate = buildGavanWeek1Day3MaterialCandidate(sourceSeed, sourceDay2Export, {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day3MaterialExportPacket(day3Candidate, sourceSeed, sourceDay2Export, {
    generatedAt: GENERATED_AT,
  });
}

function day4Export() {
  const sourceSeed = seed();
  const sourceDay3Export = day3Export();
  const day4Candidate = buildGavanWeek1Day4MaterialCandidate(sourceSeed, sourceDay3Export, {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day4MaterialExportPacket(day4Candidate, sourceSeed, sourceDay3Export, {
    generatedAt: GENERATED_AT,
  });
}

function candidate() {
  return buildGavanWeek1Day5MaterialCandidate(seed(), day4Export(), {
    generatedAt: GENERATED_AT,
  });
}

describe('Gavan week 1 day 5 material quality export packet', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY5_MATERIAL_EXPORT_PACKET_PATH)) {
      rmSync(GAVAN_WEEK1_DAY5_MATERIAL_EXPORT_PACKET_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day5MaterialExportPacket(candidate(), seed(), day4Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY5_MATERIAL_EXPORT_PACKET_PATH,
    });
  });

  it('builds a non-live reviewer export packet from the day 5 material candidate', () => {
    const packet = buildGavanWeek1Day5MaterialExportPacket(candidate(), seed(), day4Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day5_material_export_packet',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day5',
      status: 'day5_material_export_not_live',
      sourceCandidateStatus: 'day5_material_candidate_not_live',
      exportApproved: false,
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
  });

  it('summarizes blocks phrases phrase build listening choice recall and quiz intent', () => {
    const packet = buildGavanWeek1Day5MaterialExportPacket(candidate(), seed(), day4Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet.reviewerSummary).toEqual(expect.objectContaining({
      blockCount: 6,
      phraseCount: 4,
      phraseBuildItemCount: 4,
      listeningPlaceholderCount: 4,
      naturalChoiceItemCount: 4,
      quizBlueprintCount: 10,
      recallHasHints: false,
      recallHighlightsCorrectWords: false,
    }));
    expect(packet.reviewerSummary.exerciseTypes).toEqual([
      'lesson_bridge',
      'phrase_build',
      'listening_choice',
      'natural_choice',
      'active_recall',
      'day_quiz_intent',
    ]);
  });

  it('includes pass quality gates for the valid day 5 candidate', () => {
    const packet = buildGavanWeek1Day5MaterialExportPacket(candidate(), seed(), day4Export(), {
      generatedAt: GENERATED_AT,
    });
    const gateMap = new Map(packet.qualityGates.map((gate) => [gate.id, gate.status]));

    expect(packet.qualityGates).toHaveLength(10);
    expect([...gateMap.keys()]).toEqual([
      'broadness',
      'word_tile_counts',
      'distractor_safety',
      'choice_option_counts',
      'listening_placeholder_honesty',
      'explanation_coverage',
      'no_recall_highlighting',
      'quiz_count',
      'media_honesty',
      'no_production_writes',
    ]);
    expect([...gateMap.values()].every((status) => status === 'pass')).toBe(true);
  });

  it('includes a compact human-readable preview of day 5', () => {
    const sourceCandidate = candidate();
    const packet = buildGavanWeek1Day5MaterialExportPacket(sourceCandidate, seed(), day4Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet.preview.titleRu).toBe(sourceCandidate.sourceSeedDayTitle);
    expect(packet.preview.phrases.map((phrase) => phrase.english)).toEqual([
      'Could you explain it simply?',
      'Could you show me?',
      'Can you write it down?',
      'Please use simple words.',
    ]);
    expect(packet.preview.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'phrase_build' }),
      expect.objectContaining({ type: 'listening_choice' }),
      expect.objectContaining({ type: 'natural_choice' }),
      expect.objectContaining({ type: 'day_quiz_intent' }),
    ]));
    expect(packet.preview.phraseTileLine).toContain('4');
    expect(packet.preview.listeningPlaceholderLine).toContain('not generated');
    expect(packet.preview.naturalChoiceLine).toContain('4');
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
          wordTiles: ['Could'],
          distractorTiles: ['Could'],
        },
      ],
      naturalChoiceItems: [
        {
          ...sourceCandidate.naturalChoiceItems[0],
          options: [sourceCandidate.naturalChoiceItems[0].correctEnglish],
        },
      ],
      listeningPlaceholders: [
        {
          ...sourceCandidate.listeningPlaceholders[0],
          assetStatus: 'generated',
          finalAudioReady: true,
        },
      ],
      activeRecall: {
        ...sourceCandidate.activeRecall,
        hintsEnabled: true,
      },
      dayQuizIntent: {
        ...sourceCandidate.dayQuizIntent,
        questionBlueprints: sourceCandidate.dayQuizIntent.questionBlueprints.slice(0, 9),
      },
    };

    const packet = buildGavanWeek1Day5MaterialExportPacket(brokenCandidate as any, seed(), day4Export(), {
      generatedAt: GENERATED_AT,
    });
    const failedGates = packet.qualityGates.filter((gate) => gate.status === 'fail');

    expect(packet.status).toBe('day5_material_export_blocked');
    expect(packet.exportApproved).toBe(false);
    expect(failedGates.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'word_tile_counts',
      'distractor_safety',
      'choice_option_counts',
      'listening_placeholder_honesty',
      'no_recall_highlighting',
      'quiz_count',
    ]));
  });

  it('writes deterministic export JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day5MaterialExportPacket(candidate(), seed(), day4Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY5_MATERIAL_EXPORT_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day5-material-export-packet.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY5_MATERIAL_EXPORT_PACKET_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY5_MATERIAL_EXPORT_PACKET_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day5_material_export_packet');
    expect(parsed.status).toBe('day5_material_export_not_live');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day5MaterialExportPacket(candidate(), seed(), day4Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day5-export.json'),
    });
    const toolsResult = writeGavanWeek1Day5MaterialExportPacket(candidate(), seed(), day4Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day5-export.json'),
    });
    const testsResult = writeGavanWeek1Day5MaterialExportPacket(candidate(), seed(), day4Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day5-export.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day5_material_export_packet.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});

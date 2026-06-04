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
  GAVAN_WEEK1_DAY4_MATERIAL_EXPORT_PACKET_PATH,
  writeGavanWeek1Day4MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day4_material_export_packet';

const GENERATED_AT = '2026-06-03T20:00:00.000Z';

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

function candidate() {
  return buildGavanWeek1Day4MaterialCandidate(seed(), day3Export(), {
    generatedAt: GENERATED_AT,
  });
}

describe('Gavan week 1 day 4 material quality export packet', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY4_MATERIAL_EXPORT_PACKET_PATH)) {
      rmSync(GAVAN_WEEK1_DAY4_MATERIAL_EXPORT_PACKET_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day4MaterialExportPacket(candidate(), seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY4_MATERIAL_EXPORT_PACKET_PATH,
    });
  });

  it('builds a non-live reviewer export packet from the day 4 material candidate', () => {
    const packet = buildGavanWeek1Day4MaterialExportPacket(candidate(), seed(), day3Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day4_material_export_packet',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day4',
      status: 'day4_material_export_not_live',
      sourceCandidateStatus: 'day4_material_candidate_not_live',
      exportApproved: false,
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
  });

  it('summarizes blocks phrases choices repair quick replies recall and quiz intent', () => {
    const packet = buildGavanWeek1Day4MaterialExportPacket(candidate(), seed(), day3Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet.reviewerSummary).toEqual(expect.objectContaining({
      blockCount: 6,
      phraseCount: 4,
      naturalChoiceItemCount: 4,
      repairItemCount: 4,
      quickReplyItemCount: 4,
      quizBlueprintCount: 10,
      recallHasHints: false,
      recallHighlightsCorrectWords: false,
    }));
    expect(packet.reviewerSummary.exerciseTypes).toEqual([
      'lesson_bridge',
      'natural_choice',
      'mistake_repair',
      'quick_reply',
      'active_recall',
      'day_quiz_intent',
    ]);
  });

  it('includes pass quality gates for the valid day 4 candidate', () => {
    const packet = buildGavanWeek1Day4MaterialExportPacket(candidate(), seed(), day3Export(), {
      generatedAt: GENERATED_AT,
    });
    const gateMap = new Map(packet.qualityGates.map((gate) => [gate.id, gate.status]));

    expect(packet.qualityGates).toHaveLength(9);
    expect([...gateMap.keys()]).toEqual([
      'broadness',
      'choice_option_counts',
      'repair_tile_counts',
      'distractor_safety',
      'explanation_coverage',
      'no_recall_highlighting',
      'quiz_count',
      'media_honesty',
      'no_production_writes',
    ]);
    expect([...gateMap.values()].every((status) => status === 'pass')).toBe(true);
  });

  it('includes a compact human-readable preview of day 4', () => {
    const packet = buildGavanWeek1Day4MaterialExportPacket(candidate(), seed(), day3Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet.preview.titleRu).toBe(candidate().sourceSeedDayTitle);
    expect(packet.preview.phrases.map((phrase) => phrase.english)).toEqual([
      'Is this right?',
      'Is it here?',
      'Is that okay?',
      'Do I need anything else?',
    ]);
    expect(packet.preview.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'natural_choice' }),
      expect.objectContaining({ type: 'mistake_repair' }),
      expect.objectContaining({ type: 'quick_reply' }),
      expect.objectContaining({ type: 'day_quiz_intent' }),
    ]));
    expect(packet.preview.naturalChoiceLine).toContain('4');
    expect(packet.preview.repairLine).toContain('4');
    expect(packet.preview.quickReplyLine).toContain('4');
    expect(packet.preview.recallLine).toContain('no hints');
    expect(packet.preview.quizLine).toContain('10');
  });

  it('blocks export quality when candidate gates fail instead of approving it', () => {
    const sourceCandidate = candidate();
    const brokenCandidate = {
      ...sourceCandidate,
      naturalChoiceItems: [
        {
          ...sourceCandidate.naturalChoiceItems[0],
          options: [sourceCandidate.naturalChoiceItems[0].correctEnglish],
        },
      ],
      repairItems: [
        {
          ...sourceCandidate.repairItems[0],
          wordTiles: ['Is'],
          distractorTiles: ['Is'],
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

    const packet = buildGavanWeek1Day4MaterialExportPacket(brokenCandidate as any, seed(), day3Export(), {
      generatedAt: GENERATED_AT,
    });
    const failedGates = packet.qualityGates.filter((gate) => gate.status === 'fail');

    expect(packet.status).toBe('day4_material_export_blocked');
    expect(packet.exportApproved).toBe(false);
    expect(failedGates.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'choice_option_counts',
      'repair_tile_counts',
      'distractor_safety',
      'no_recall_highlighting',
      'quiz_count',
    ]));
  });

  it('writes deterministic export JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day4MaterialExportPacket(candidate(), seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY4_MATERIAL_EXPORT_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day4-material-export-packet.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY4_MATERIAL_EXPORT_PACKET_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY4_MATERIAL_EXPORT_PACKET_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day4_material_export_packet');
    expect(parsed.status).toBe('day4_material_export_not_live');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day4MaterialExportPacket(candidate(), seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day4-export.json'),
    });
    const toolsResult = writeGavanWeek1Day4MaterialExportPacket(candidate(), seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day4-export.json'),
    });
    const testsResult = writeGavanWeek1Day4MaterialExportPacket(candidate(), seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day4-export.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day4_material_export_packet.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});

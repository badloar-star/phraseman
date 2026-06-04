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
} from '../tools/personal_plan_gavan_week1_day5_material_export_packet';
import {
  buildGavanWeek1Day6MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day6_material_candidate';
import {
  buildGavanWeek1Day6MaterialExportPacket,
  type GavanWeek1Day6MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day6_material_export_packet';
import {
  buildGavanWeek1ExpansionStandards,
} from '../tools/personal_plan_gavan_week1_expansion_standards';
import {
  buildGavanWeek1Day7BlueprintCandidate,
} from '../tools/personal_plan_gavan_week1_day7_blueprint_candidate';
import {
  buildGavanWeek1Day7ReviewerExport,
} from '../tools/personal_plan_gavan_week1_day7_reviewer_export';
import {
  approveGavanWeek1Day7ReviewerExport,
  buildGavanWeek1Day7ReviewerApprovalInput,
  type GavanWeek1Day7ApprovedReviewerExport,
} from '../tools/personal_plan_gavan_week1_day7_reviewer_approval_gate';
import {
  buildGavanWeek1Day7MaterialCandidate,
  type GavanWeek1Day7MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day7_material_candidate';
import {
  buildGavanWeek1Day7MaterialExportPacket,
  GAVAN_WEEK1_DAY7_MATERIAL_EXPORT_PACKET_PATH,
  writeGavanWeek1Day7MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day7_material_export_packet';

const GENERATED_AT = '2026-06-03T23:50:00.000Z';
const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-03T23:55:00.000Z';

function seed() {
  return buildGavanWeek1ContentAuthoringSeed({
    generatedAt: GENERATED_AT,
  });
}

function day6Export(): GavanWeek1Day6MaterialExportPacket {
  const sourceSeed = seed();
  const day1 = buildGavanWeek1Day1MaterialCandidate(sourceSeed, { generatedAt: GENERATED_AT });
  const day1Export = buildGavanWeek1Day1MaterialExportPacket(day1, sourceSeed, { generatedAt: GENERATED_AT });
  const day2 = buildGavanWeek1Day2MaterialCandidate(sourceSeed, day1Export, { generatedAt: GENERATED_AT });
  const day2Export = buildGavanWeek1Day2MaterialExportPacket(day2, sourceSeed, day1Export, { generatedAt: GENERATED_AT });
  const day3 = buildGavanWeek1Day3MaterialCandidate(sourceSeed, day2Export, { generatedAt: GENERATED_AT });
  const day3Export = buildGavanWeek1Day3MaterialExportPacket(day3, sourceSeed, day2Export, { generatedAt: GENERATED_AT });
  const day4 = buildGavanWeek1Day4MaterialCandidate(sourceSeed, day3Export, { generatedAt: GENERATED_AT });
  const day4Export = buildGavanWeek1Day4MaterialExportPacket(day4, sourceSeed, day3Export, { generatedAt: GENERATED_AT });
  const day5 = buildGavanWeek1Day5MaterialCandidate(sourceSeed, day4Export, { generatedAt: GENERATED_AT });
  const day5Export = buildGavanWeek1Day5MaterialExportPacket(day5, sourceSeed, day4Export, { generatedAt: GENERATED_AT });
  const day6 = buildGavanWeek1Day6MaterialCandidate(sourceSeed, day5Export, { generatedAt: GENERATED_AT });

  return buildGavanWeek1Day6MaterialExportPacket(day6, sourceSeed, day5Export, {
    generatedAt: GENERATED_AT,
  });
}

function approvedExport(): GavanWeek1Day7ApprovedReviewerExport {
  const standards = buildGavanWeek1ExpansionStandards({ generatedAt: GENERATED_AT });
  const blueprint = buildGavanWeek1Day7BlueprintCandidate(standards, {
    generatedAt: GENERATED_AT,
  });
  const reviewerExport = buildGavanWeek1Day7ReviewerExport(blueprint, {
    generatedAt: GENERATED_AT,
  });
  const input = buildGavanWeek1Day7ReviewerApprovalInput(reviewerExport, {
    reviewerId: REVIEWER_ID,
    approvedAt: APPROVED_AT,
  });
  const result = approveGavanWeek1Day7ReviewerExport(reviewerExport, input, GENERATED_AT);

  if (!result.approvedExport) {
    throw new Error('Expected approved day 7 reviewer export.');
  }

  return result.approvedExport;
}

function candidate(): GavanWeek1Day7MaterialCandidate {
  return buildGavanWeek1Day7MaterialCandidate(approvedExport(), day6Export(), {
    generatedAt: GENERATED_AT,
  });
}

describe('Gavan week 1 day 7 material quality export packet', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY7_MATERIAL_EXPORT_PACKET_PATH)) {
      rmSync(GAVAN_WEEK1_DAY7_MATERIAL_EXPORT_PACKET_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day7MaterialExportPacket(candidate(), approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY7_MATERIAL_EXPORT_PACKET_PATH,
    });
  });

  it('builds a non-live reviewer export packet from the day 7 material candidate', () => {
    const packet = buildGavanWeek1Day7MaterialExportPacket(candidate(), approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day7_material_export_packet',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day7',
      status: 'day7_material_export_not_live',
      sourceCandidateStatus: 'day7_material_candidate_not_live',
      exportApproved: false,
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
  });

  it('summarizes blocks phrases choice items dialogues approved source rows recall and quiz intent', () => {
    const packet = buildGavanWeek1Day7MaterialExportPacket(candidate(), approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet.reviewerSummary).toEqual(expect.objectContaining({
      blockCount: 6,
      phraseCount: 4,
      listeningChoiceItemCount: 4,
      naturalChoiceItemCount: 4,
      microDialogueItemCount: 4,
      approvedContentUnitCount: 4,
      approvedExplanationCount: 8,
      approvedExerciseBlueprintCount: 4,
      quizBlueprintCount: 10,
      recallHasHints: false,
      recallHighlightsCorrectWords: false,
    }));
    expect(packet.reviewerSummary.exerciseTypes).toEqual([
      'lesson_bridge',
      'active_recall',
      'listening_choice',
      'natural_choice',
      'micro_dialogue',
      'day_quiz_intent',
    ]);
  });

  it('includes pass quality gates for the valid day 7 candidate', () => {
    const packet = buildGavanWeek1Day7MaterialExportPacket(candidate(), approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
    });
    const gateMap = new Map(packet.qualityGates.map((gate) => [gate.id, gate.status]));

    expect(packet.qualityGates).toHaveLength(10);
    expect([...gateMap.keys()]).toEqual([
      'broadness',
      'listening_choice_option_counts',
      'listening_audio_honesty',
      'natural_choice_option_counts',
      'micro_dialogue_option_counts',
      'explanation_coverage',
      'no_recall_highlighting',
      'quiz_count',
      'media_honesty',
      'no_production_writes',
    ]);
    expect([...gateMap.values()].every((status) => status === 'pass')).toBe(true);
  });

  it('includes a compact human-readable preview of day 7', () => {
    const sourceCandidate = candidate();
    const packet = buildGavanWeek1Day7MaterialExportPacket(sourceCandidate, approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(packet.preview.titleRu).toBe(sourceCandidate.sourceSeedDayTitle);
    expect(packet.preview.phrases.map((phrase) => phrase.english)).toEqual([
      'I need a moment.',
      'Could you say that again?',
      'What should I do next?',
      "I'll check and come back.",
    ]);
    expect(packet.preview.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'listening_choice' }),
      expect.objectContaining({ type: 'natural_choice' }),
      expect.objectContaining({ type: 'micro_dialogue' }),
      expect.objectContaining({ type: 'day_quiz_intent' }),
    ]));
    expect(packet.preview.listeningChoiceLine).toContain('4');
    expect(packet.preview.listeningChoiceLine).toContain('not generated');
    expect(packet.preview.naturalChoiceLine).toContain('4');
    expect(packet.preview.microDialogueLine).toContain('4');
    expect(packet.preview.recallLine).toContain('no hints');
    expect(packet.preview.quizLine).toContain('10');
  });

  it('blocks export quality when candidate gates fail instead of approving it', () => {
    const sourceCandidate = candidate();
    const brokenCandidate = {
      ...sourceCandidate,
      listeningChoiceItems: [
        {
          ...sourceCandidate.listeningChoiceItems[0],
          options: [sourceCandidate.listeningChoiceItems[0].correctEnglish],
          finalAudioReady: true,
        },
      ],
      naturalChoiceItems: [
        {
          ...sourceCandidate.naturalChoiceItems[0],
          options: [sourceCandidate.naturalChoiceItems[0].correctEnglish],
        },
      ],
      microDialogueItems: [
        {
          ...sourceCandidate.microDialogueItems[0],
          responseOptions: [sourceCandidate.microDialogueItems[0].targetEnglish],
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

    const packet = buildGavanWeek1Day7MaterialExportPacket(brokenCandidate as any, approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
    });
    const failedGates = packet.qualityGates.filter((gate) => gate.status === 'fail');

    expect(packet.status).toBe('day7_material_export_blocked');
    expect(packet.exportApproved).toBe(false);
    expect(failedGates.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'listening_choice_option_counts',
      'listening_audio_honesty',
      'natural_choice_option_counts',
      'micro_dialogue_option_counts',
      'no_recall_highlighting',
      'quiz_count',
    ]));
  });

  it('writes deterministic export JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day7MaterialExportPacket(candidate(), approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY7_MATERIAL_EXPORT_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day7-material-export-packet.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY7_MATERIAL_EXPORT_PACKET_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY7_MATERIAL_EXPORT_PACKET_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day7_material_export_packet');
    expect(parsed.status).toBe('day7_material_export_not_live');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day7MaterialExportPacket(candidate(), approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day7-export.json'),
    });
    const toolsResult = writeGavanWeek1Day7MaterialExportPacket(candidate(), approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day7-export.json'),
    });
    const testsResult = writeGavanWeek1Day7MaterialExportPacket(candidate(), approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day7-export.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day7_material_export_packet.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});

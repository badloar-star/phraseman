import fs from 'fs';
import path from 'path';

import type { GavanWeek1RouteApprovalGuard } from '../tools/personal_plan_gavan_week1_route_approval_guard';
import {
  buildGavanWeek1LiveRouteImplementationPreflight,
  GAVAN_WEEK1_LIVE_ROUTE_IMPLEMENTATION_PREFLIGHT_PATH,
  writeGavanWeek1LiveRouteImplementationPreflight,
} from '../tools/personal_plan_gavan_week1_live_route_implementation_preflight';
import { ensureGavanWeek1RoutePrerequisiteArtifacts } from '../tools/personal_plan_gavan_week1_route_prerequisite_artifact_refresh';

const GENERATED_AT = '2026-06-03T10:55:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function approvalGuard(): GavanWeek1RouteApprovalGuard {
  return JSON.parse(fs.readFileSync(
    path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-route-approval-guard.json',
    ),
    'utf8',
  )) as GavanWeek1RouteApprovalGuard;
}

describe('Gavan week 1 live route implementation preflight', () => {
  beforeAll(() => {
    ensureGavanWeek1RoutePrerequisiteArtifacts({ generatedAt: GENERATED_AT });
  });

  it('builds a blocked live-route preflight from an unsigned approval guard', () => {
    const result = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.preflight).toEqual(expect.objectContaining({
      kind: 'gavan_week1_live_route_implementation_preflight',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'live_route_preflight_blocked_unsigned',
      sourceGuardStatus: 'route_approval_guard_blocked_unsigned',
      blockerStillOpen: 'missing_signature:product_copy',
      approved: false,
      readyForLive: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
    }));
  });

  it('lists production source files that would be edited only after signed approval', () => {
    const result = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.preflight?.proposedSourceEdits).toEqual([
      {
        id: 'catalog_week1_days',
        sourcePath: 'app/personal_plan_catalog.ts',
        reason: 'Register approved Gavan week 1 day ids and preserve minute-load behavior.',
        status: 'blocked_not_allowed',
        writeActionAllowed: false,
      },
      {
        id: 'dedicated_day_quizzes',
        sourcePath: 'app/personal_plan_quizzes.ts',
        reason: 'Register seven dedicated 10-question Gavan week 1 quiz ids.',
        status: 'blocked_not_allowed',
        writeActionAllowed: false,
      },
      {
        id: 'task_open_helper',
        sourcePath: 'app/personal_plan_navigation.ts',
        reason: 'Connect approved lesson, quiz, and plan exercise task openings.',
        status: 'blocked_not_allowed',
        writeActionAllowed: false,
      },
      {
        id: 'day_open_actions',
        sourcePath: 'app/personal_plan_day_open_actions.ts',
        reason: 'Preserve and extend plan task action mapping after approval.',
        status: 'blocked_not_allowed',
        writeActionAllowed: false,
      },
    ]);
  });

  it('lists required regression suites and emulator checks for the future live pass', () => {
    const result = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.preflight?.requiredRegressionSuites).toEqual(expect.arrayContaining([
      'tests/personal_plan_gavan_week1_catalog_adapter_design.test.ts',
      'tests/personal_plan_gavan_week1_quiz_adapter_design.test.ts',
      'tests/personal_plan_gavan_week1_ui_route_adapter_design.test.ts',
      'tests/personal_plan_gavan_week1_aggregate_route_readiness_gate.test.ts',
      'tests/personal_plan_home_route_card_layout.test.ts',
      'tests/personal_plan_quiz_screen_contract.test.ts',
      'tests/personal_plan_lesson_progress_contract.test.ts',
      'tests/personal_plan_premium_activation_contract.test.ts',
    ]));
    expect(result.preflight?.requiredEmulatorChecks.map((check: { id: string }) => check.id)).toEqual([
      'home_card_opens_plan',
      'plan_lesson_task_opens_lesson',
      'plan_quiz_task_opens_dedicated_quiz',
      'plan_renderer_task_opens_renderer',
      'self_guided_lesson_still_works',
      'self_guided_quiz_still_works',
      'completed_day_state_still_blocks_next_day',
    ]);
    expect(result.preflight?.requiredEmulatorChecks.every((check: { status: string }) =>
      check.status === 'blocked_until_signed_approval',
    )).toBe(true);
  });

  it('defaults material export evidence to incomplete when no export packets are supplied', () => {
    const result = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.preflight?.materialExportEvidence).toEqual({
      expectedExportPacketCount: 7,
      providedExportPacketCount: 0,
      notLiveExportPacketCount: 0,
      blockedExportPacketCount: 0,
      missingDayIds: [
        'gavan-week1-day1',
        'gavan-week1-day2',
        'gavan-week1-day3',
        'gavan-week1-day4',
        'gavan-week1-day5',
        'gavan-week1-day6',
        'gavan-week1-day7',
      ],
      dayIds: [],
      readyForRouteReview: false,
    });
  });

  it('rejects approved or live-ready guards instead of opening route implementation', () => {
    const approvedGuard = {
      ...approvalGuard(),
      approved: true,
    } as unknown as GavanWeek1RouteApprovalGuard;
    const liveGuard = {
      ...approvalGuard(),
      readyForLive: true,
      liveEditsAllowed: true,
    } as unknown as GavanWeek1RouteApprovalGuard;

    expect(buildGavanWeek1LiveRouteImplementationPreflight(approvedGuard, {
      generatedAt: GENERATED_AT,
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'guard_already_approved' }),
    ]));
    expect(buildGavanWeek1LiveRouteImplementationPreflight(liveGuard, {
      generatedAt: GENERATED_AT,
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'guard_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_LIVE_ROUTE_IMPLEMENTATION_PREFLIGHT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-live-route-implementation-preflight.json',
    ));
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const serialized = fs.readFileSync(GAVAN_WEEK1_LIVE_ROUTE_IMPLEMENTATION_PREFLIGHT_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);
    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_live_route_implementation_preflight');
    expect(parsed.status).toBe('live_route_preflight_blocked_unsigned');
  });

  it('rejects app tools tests and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'live-route-preflight.json'),
      path.join(process.cwd(), 'components', 'live-route-preflight.json'),
      path.join(process.cwd(), 'tools', 'live-route-preflight.json'),
      path.join(process.cwd(), 'tests', 'live-route-preflight.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
        generatedAt: GENERATED_AT,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'target_path_not_allowed' }),
      ]));
    }
  });

  it('does not import or mutate live catalog quiz UI storage audio scoring or navigation', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_live_route_implementation_preflight.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});

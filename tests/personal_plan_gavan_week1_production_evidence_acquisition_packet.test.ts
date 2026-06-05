import { readFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1MasterFinalReleaseReadinessV2,
} from '../tools/personal_plan_gavan_week1_master_final_release_readiness_v2';
import {
  GAVAN_WEEK1_PRODUCTION_EVIDENCE_ACQUISITION_PACKET_PATH,
  buildGavanWeek1ProductionEvidenceAcquisitionPacket,
  writeGavanWeek1ProductionEvidenceAcquisitionPacket,
} from '../tools/personal_plan_gavan_week1_production_evidence_acquisition_packet';

const GENERATED_AT = '2026-06-04T23:45:00.000Z';

function finalReadiness(): GavanWeek1MasterFinalReleaseReadinessV2 {
  return {
    kind: 'gavan_week1_master_final_release_readiness_v2',
    generatedAt: GENERATED_AT,
    releaseOwnerId: 'master-final-release-owner',
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceMasterStatus: 'hold_audio_pronunciation_route_blocked',
    sourceRouteEvidenceStatus: 'blocked_before_source_registration_plan',
    status: 'hold_audio_pronunciation_route_evidence_blocked',
    releaseDecision: 'hold',
    finalReleaseReady: false,
    productionReady: false,
    readyForLive: false,
    audioReady: false,
    pronunciationReady: false,
    routeReady: false,
    regressionEvidenceReady: false,
    deviceEvidenceReady: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    summary: {
      sourceLayerCount: 2,
      finalLayerCount: 3,
      productionReadyLayerCount: 0,
      masterBlockerCount: 20,
      routeEvidenceBlockerCount: 6,
      totalBlockerCount: 26,
      audioExpectedMp3Count: 10,
      pronunciationReferenceCount: 4,
      routeWorkflowStageCount: 8,
      routeRegressionSuiteCount: 7,
      routeDeviceCheckCount: 5,
    },
    layers: [
      {
        id: 'audio',
        status: 'blocked_before_generated_file_validation',
        productionReady: false,
        readyForLive: false,
        blockerCount: 5,
      },
      {
        id: 'pronunciation',
        status: 'blocked_before_scorer_provider_contract',
        productionReady: false,
        readyForLive: false,
        blockerCount: 7,
      },
      {
        id: 'route',
        status: 'blocked_before_source_registration_plan',
        productionReady: false,
        readyForLive: false,
        blockerCount: 14,
      },
    ],
    blockers: [
      ...Array.from({ length: 5 }, (_, index) => ({
        code: `audio_blocker_${index + 1}`,
        layer: 'audio' as const,
        blocksProduction: true as const,
        detail: 'Audio blocker.',
      })),
      ...Array.from({ length: 7 }, (_, index) => ({
        code: `pronunciation_blocker_${index + 1}`,
        layer: 'pronunciation' as const,
        blocksProduction: true as const,
        detail: 'Pronunciation blocker.',
      })),
      ...Array.from({ length: 14 }, (_, index) => ({
        code: `route_blocker_${index + 1}`,
        layer: 'route' as const,
        blocksProduction: true as const,
        detail: 'Route blocker.',
      })),
    ],
    requiredNextActions: [],
    writePolicy: {
      allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
      sourceWritesAllowed: false,
      liveWritesAllowed: false,
    },
  };
}

describe('Gavan week 1 production evidence acquisition packet', () => {
  it('turns final release blockers into concrete external evidence requests without claiming readiness', () => {
    const result = buildGavanWeek1ProductionEvidenceAcquisitionPacket(finalReadiness(), {
      generatedAt: GENERATED_AT,
      acquisitionOwnerId: 'production-evidence-acquisition-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.packet).toMatchObject({
      kind: 'gavan_week1_production_evidence_acquisition_packet',
      status: 'awaiting_external_production_evidence',
      releaseDecision: 'hold',
      productionReady: false,
      readyForLive: false,
      evidenceAcquisitionComplete: false,
      audioEvidenceComplete: false,
      pronunciationEvidenceComplete: false,
      routeEvidenceComplete: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.packet.summary).toEqual({
      sourceFinalBlockerCount: 26,
      acquisitionStreamCount: 3,
      evidenceRequestCount: 28,
      audioRequestCount: 12,
      pronunciationRequestCount: 6,
      routeRequestCount: 10,
      fulfilledRequestCount: 0,
      blockedRequestCount: 28,
    });
    expect(result.packet.streams.map((stream) => stream.id)).toEqual([
      'audio',
      'pronunciation',
      'route',
    ]);
    expect(result.packet.streams.map((stream) => stream.requestCount)).toEqual([12, 6, 10]);
  });

  it('lists exact audio MP3 output paths plus approval evidence requests', () => {
    const result = buildGavanWeek1ProductionEvidenceAcquisitionPacket(finalReadiness(), {
      generatedAt: GENERATED_AT,
      acquisitionOwnerId: 'production-evidence-acquisition-owner',
    });

    const audioRequests = result.packet.requests.filter((request) => request.stream === 'audio');
    expect(audioRequests).toHaveLength(12);
    expect(audioRequests.slice(0, 10).map((request) => request.expectedPath)).toEqual([
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3',
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t02.mp3',
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t03.mp3',
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t04.mp3',
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t05.mp3',
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t06.mp3',
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t07.mp3',
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t08.mp3',
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t09.mp3',
      'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t10.mp3',
    ]);
    expect(audioRequests.map((request) => request.status).every((status) => status === 'blocked_missing_external_evidence')).toBe(true);
  });

  it('rejects unsafe final readiness artifacts that already claim live readiness', () => {
    const result = buildGavanWeek1ProductionEvidenceAcquisitionPacket({
      ...finalReadiness(),
      productionReady: true as false,
      readyForLive: true as false,
    }, {
      generatedAt: GENERATED_AT,
      acquisitionOwnerId: 'production-evidence-acquisition-owner',
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'final_readiness_not_non_live',
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-production-evidence-acquisition-packet.test.json',
    );

    const result = writeGavanWeek1ProductionEvidenceAcquisitionPacket(finalReadiness(), {
      generatedAt: GENERATED_AT,
      acquisitionOwnerId: 'production-evidence-acquisition-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const stored = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(stored).toEqual(result.packet);
    expect(stored.status).toBe('awaiting_external_production_evidence');
  });

  it.each([
    'app/personal_plan_catalog.ts',
    'app/personal_plan_day_open_actions.ts',
    'app/personal_plan_navigation.ts',
    'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3',
    'package.json',
  ])('rejects source or asset target path %s', (relativeTargetPath) => {
    const result = writeGavanWeek1ProductionEvidenceAcquisitionPacket(finalReadiness(), {
      generatedAt: GENERATED_AT,
      acquisitionOwnerId: 'production-evidence-acquisition-owner',
      targetPath: path.join(process.cwd(), relativeTargetPath),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{
      code: 'target_path_not_allowed',
      detail: 'Production evidence acquisition packet can only write under .codex-tmp or docs/reports.',
    }]);
  });

  it('does not import runtime route, storage, audio registration, or navigation modules', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_production_evidence_acquisition_packet.ts'),
      'utf8',
    );

    for (const forbidden of [
      'react-native',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'personal_plan_catalog',
      'personal_plan_day_open_actions',
      'personal_plan_audio_openai_worker',
      'approvePlanAudioAssets',
      'registerPlanAudioAssetsForRuntime',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('uses the canonical acquisition packet path', () => {
    expect(GAVAN_WEEK1_PRODUCTION_EVIDENCE_ACQUISITION_PACKET_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-production-evidence-acquisition-packet.json',
    ));
  });
});

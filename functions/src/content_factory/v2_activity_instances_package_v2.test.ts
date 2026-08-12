import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_REQUIRED_SESSION_TASK_PURPOSES_V2 } from "../../../modules/learning-v2/contracts/activity_session_package_v2";
import { V2_REQUIRED_SESSION_FAMILIES_V2 } from "../../../modules/learning-v2/contracts/activity_catalog_v2";
import {
  buildV2LocalEvaluatorCapsuleRawV1,
  createV2LocalEvaluatorCommitmentV1,
  evaluateV2LocalEvaluatorCapsuleV1,
  isV2LocalEvaluatorCapsuleHandleV1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  v2LocalEvaluatorInputKindForFamilyV1,
} from "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import {
  buildV2ActivitySessionProjection,
  parseV2ActivitySessionProjectionSource,
  V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
} from "./v2_activity_session_projection";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "./v2_canonical_generation_plan_v2";
import {
  V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES,
  V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES,
  V2_ACTIVITY_INSTANCES_DEVICE_ROOT_MAX_BYTES,
  V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES,
  V2_ACTIVITY_SESSION_RENDER_MAX_BYTES,
  V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
  V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES,
  getV2ActivityInstancesDeviceEvaluatorHandleV2,
  getV2ActivityInstancesDeviceRenderPayloadV2,
  isV2ActivityInstancesAuthoringRootV2,
  isV2ActivityInstancesDeviceIntegrityHandleV2,
  isV2ActivityInstancesDeviceRootV2,
  loadV2ActivityInstancesDeviceSessionV2,
  materializeV2ActivityInstancesAuthoringRootV2,
  materializeV2ActivityInstancesDeviceRootV2,
  materializeV2GenerationCapabilitySnapshotV1,
  parseV2ActivityInstancesAuthoringRootV2,
  parseV2ActivityInstancesUntrustedRootManifestPermitsV2,
  parseV2ActivityInstancesDeviceRootV2,
  v2ActivitySessionId,
  v2ActivitySessionProjectionObjectPath,
  v2ActivitySessionSourceObjectPath,
} from "./v2_activity_instances_package_v2";

const hash = (value: unknown) => hashCanonicalBody(value);
const SALT_PREFIX = "0123456789abcdef";

function planInput(templateCount = 1) {
  return {
    schemaVersion: "v2-canonical-plan-request.v2" as const,
    workspaceId: "workspace-1",
    jobId: "job-1",
    authoringRevision: 7,
    seasonId: "season-1",
    scope: "vertical_slice" as const,
    episodeIds: ["episode-1"],
    recipes: [
      { episodeId: "episode-1", dialogue: true, speakingMission: true },
    ],
    languageProfileRef: {
      profileId: "english-general",
      targetLanguage: "en",
      version: 3,
      contentHash: hash("language-profile"),
    },
    speechProfileRef: {
      profileId: "english-speech-general",
      targetLanguage: "en",
      speechLocale: "en-US",
      version: 2,
      contentHash: hash("speech-profile"),
    },
    voiceGenerationProfileRef: {
      profileId: "openai-tts-learning-v2",
      version: 1,
      contentHash: hash("voice-profile"),
    },
    decisionRegistryRef: {
      decisionId: "HYP-V2-007" as const,
      version: 1,
      contentHash: hash("decision"),
    },
    templateBindings: [
      {
        episodeId: "episode-1",
        templateRefs: Array.from({ length: templateCount }, (_, index) => ({
          templateId: `template-${String(index + 1).padStart(2, "0")}`,
          version: 2,
          contentHash: hash(["template", index]),
        })),
      },
    ],
  };
}

function plan(templateCount = 1) {
  const request = parseV2CanonicalPlanRequestV2(
    canonicalJsonV1(planInput(templateCount)),
  );
  return buildV2CanonicalSeasonPlanV2(request);
}

function capability(currentPlan: ReturnType<typeof plan>, templateCount = 1) {
  const request = planInput(templateCount);
  return materializeV2GenerationCapabilitySnapshotV1({
    languageProfileRef: {
      profileId: request.languageProfileRef.profileId,
      version: request.languageProfileRef.version,
      contentHash: request.languageProfileRef.contentHash,
    },
    familyCatalogRef: currentPlan.courseContract.familyCatalogRef,
    requiredSessionFamilyPolicyRef:
      currentPlan.courseContract.requiredSessionFamilyPolicyRef,
    templates: request.templateBindings[0].templateRefs.map(
      (template, index) => ({
        ...template,
        kernelBindingFingerprint: hash(["kernel", index]),
        policySetFingerprint: hash(["policy", index]),
        projectorRulesFingerprint: hash(["projector", index]),
        supportManifestFingerprint: hash(["support", index]),
      }),
    ),
  });
}

function sessionBytes(
  sessionOrdinal: number,
  identityOrdinal = sessionOrdinal,
) {
  const episodeId = "episode-1";
  const sessionId = v2ActivitySessionId(episodeId, sessionOrdinal);
  const independentFallbackFamily = [0, 1, 2]
    .map(
      (offset) =>
        V2_REQUIRED_SESSION_FAMILIES_V2[
          (sessionOrdinal - 1 + offset) % V2_REQUIRED_SESSION_FAMILIES_V2.length
        ],
    )
    .find((family) => family !== "scripted_repeat_compare")!;
  const tasks = Array.from({ length: 12 }, (_, index) => {
    const slot = index + 1;
    const taskId = `task:e1:s${identityOrdinal}:t${slot}`;
    const selectedFamily =
      V2_REQUIRED_SESSION_FAMILIES_V2[
        (sessionOrdinal - 1 + Math.floor(index / 3)) %
          V2_REQUIRED_SESSION_FAMILIES_V2.length
      ];
    const family =
      (slot === 10 || slot === 12) &&
      selectedFamily === "scripted_repeat_compare"
        ? independentFallbackFamily
        : selectedFamily;
    const responseOptions = [
      { responseId: `${taskId}:a`, text: "A" },
      { responseId: `${taskId}:b`, text: "B" },
    ];
    const inputKind = v2LocalEvaluatorInputKindForFamilyV1(family);
    const correctResponse =
      inputKind === "choice_token"
        ? responseOptions[0].responseId
        : `answer ${sessionOrdinal} ${slot}`;
    return {
      taskId,
      slot,
      purpose: V2_REQUIRED_SESSION_TASK_PURPOSES_V2[index],
      family,
      activityId: `activity:e1:s${identityOrdinal}:t${slot}`,
      contentItemId: `content:e1:s${identityOrdinal}:t${slot}`,
      objectiveId:
        slot === 10
          ? `objective:e1:s${identityOrdinal}:t4`
          : slot === 12
            ? `objective:e1:s${identityOrdinal}:t6`
            : slot === 11
              ? `objective:e1:s${identityOrdinal === 1 ? 1 : identityOrdinal - 1}:t8`
              : `objective:e1:s${identityOrdinal}:t${slot}`,
      learningFunction: `Practice function ${sessionOrdinal}/${slot}`,
      answerExposure:
        slot === 10 || slot === 12 ? "forbidden" : "allowed_after_attempt",
      promptNovelty: slot === 10 || slot === 12 ? "novel" : "trained",
      localEvaluatorCapsuleId: `capsule:e1:s${identityOrdinal}:t${slot}`,
      inputMode:
        inputKind === "choice_token"
          ? "single_choice"
          : inputKind === "transcript"
            ? "scripted_speech"
            : "ordered_tokens",
      support: slot === 10 || slot === 12 ? "none" : "partial_cue",
      hintsAllowed: 0,
      introQuestionRef:
        slot <= 3
          ? {
              introArtifactFingerprint: hash(["intro", sessionOrdinal]),
              questionId: `${taskId}:intro-question`,
              coveredConceptIds: [`concept:s${sessionOrdinal}:t${slot}`],
            }
          : null,
      reviewSource:
        slot === 11
          ? {
              kind:
                sessionOrdinal === 1
                  ? ("same_session_bootstrap" as const)
                  : ("prior_session" as const),
              reviewOfTaskId: `task:e1:s${identityOrdinal === 1 ? 1 : identityOrdinal - 1}:t8`,
              sourceSessionOrdinal:
                sessionOrdinal === 1 ? 1 : sessionOrdinal - 1,
            }
          : null,
      learner: {
        promptId: `prompt:e1:s${sessionOrdinal}:t${slot}`,
        prompt: `Prompt ${sessionOrdinal}/${slot}`,
        responseOptions,
        mediaIds: [],
        audioTargetIds: [],
        accessibilityLabel: `Task ${slot}`,
      },
      scriptedAlternate: [
        "listen_choose",
        "sound_contrast",
        "listen_build_dictation",
        "scripted_repeat_compare",
      ].includes(family)
        ? {
            alternateId: `${taskId}:alternate`,
            instruction: `Accessible alternate ${sessionOrdinal}/${slot}`,
            voiceEvidenceEquivalent: false,
            canAward: false,
          }
        : null,
      evaluator: {
        inputKind,
        normalizationRef: V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
        correctResponse,
        acceptedResponses: [correctResponse],
        salt: hash([SALT_PREFIX, sessionOrdinal, slot]),
      },
    };
  });
  const source = {
    schemaVersion: V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
    episodeId,
    targetLanguage: "en",
    normalizationLocale: "en",
    normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
    session: {
      sessionId,
      ordinal: sessionOrdinal,
      zone:
        sessionOrdinal <= 4
          ? "understand"
          : sessionOrdinal <= 8
            ? "use"
            : "master",
      targetSeconds: 240,
      tasks,
    },
  };
  const sourceRaw = canonicalJsonV1(source);
  const artifacts = buildV2ActivitySessionProjection(
    parseV2ActivitySessionProjectionSource(sourceRaw),
  );
  const renderRaw = canonicalJsonV1(artifacts.renderSeed);
  const capsuleEnvelopeRaw = canonicalJsonV1(artifacts.appLocalCapsuleEnvelope);
  const sidecarRaw = canonicalJsonV1(artifacts.serverSidecar);
  return {
    sessionOrdinal,
    sessionId,
    sourceRaw,
    renderRaw,
    capsuleEnvelopeRaw,
    sidecarRaw,
    objectGenerations: {
      source: `source-generation-${sessionOrdinal}`,
      render: `render-generation-${sessionOrdinal}`,
      capsule: `capsule-generation-${sessionOrdinal}`,
      sidecar: `sidecar-generation-${sessionOrdinal}`,
    },
  };
}

function fixture(templateCount = 1) {
  const currentPlan = plan(templateCount);
  const stage = currentPlan.stages.find(
    (candidate) =>
      candidate.kind === "v2_activity_instances" &&
      candidate.episodeId === "episode-1",
  );
  if (!stage) throw new Error("missing fixture stage");
  return {
    currentPlan,
    stage,
    snapshot: capability(currentPlan, templateCount),
    sessions: Array.from({ length: 12 }, (_, index) => sessionBytes(index + 1)),
  };
}

describe("Learning V2 activity instances package v2", () => {
  it("derives exact pins and the 144-task bijection from canonical session bytes", () => {
    const { currentPlan, stage, snapshot, sessions } = fixture();
    const authoring = materializeV2ActivityInstancesAuthoringRootV2({
      plan: currentPlan,
      stageId: stage.stageId,
      capabilitySnapshot: snapshot,
      sessions,
    });
    const device = materializeV2ActivityInstancesDeviceRootV2(authoring);
    expect(authoring.sessions).toHaveLength(12);
    expect(authoring.taskCount).toBe(144);
    expect(authoring.sessions[0].source).toMatchObject({
      contentHash: sha256Utf8(sessions[0].sourceRaw),
      byteSize: utf8ByteLengthV1(sessions[0].sourceRaw),
      objectPath: v2ActivitySessionSourceObjectPath(
        stage.stageId,
        1,
        sha256Utf8(sessions[0].sourceRaw),
      ),
    });
    expect(authoring.sessions[0].render.contentHash).toBe(
      sha256Utf8(sessions[0].renderRaw),
    );
    expect(authoring.sessions[0].taskIdentityFingerprint).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(isV2ActivityInstancesAuthoringRootV2(authoring)).toBe(true);
    expect(isV2ActivityInstancesDeviceRootV2(device)).toBe(true);
    expect(utf8ByteLengthV1(canonicalJsonV1(authoring))).toBeLessThanOrEqual(
      V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES,
    );
    expect(utf8ByteLengthV1(canonicalJsonV1(device))).toBeLessThanOrEqual(
      V2_ACTIVITY_INSTANCES_DEVICE_ROOT_MAX_BYTES,
    );
    const rehydratedDevice = parseV2ActivityInstancesDeviceRootV2(
      canonicalJsonV1(device),
    );
    expect(isV2ActivityInstancesDeviceRootV2(rehydratedDevice)).toBe(true);

    const handle = loadV2ActivityInstancesDeviceSessionV2({
      deviceRoot: rehydratedDevice,
      sessionOrdinal: 1,
      renderRaw: sessions[0].renderRaw,
      capsuleEnvelopeRaw: sessions[0].capsuleEnvelopeRaw,
    });
    expect(isV2ActivityInstancesDeviceIntegrityHandleV2(handle)).toBe(true);
    expect(handle).not.toHaveProperty("renderRaw");
    expect(handle).not.toHaveProperty("capsuleEnvelopeRaw");
    expect(getV2ActivityInstancesDeviceRenderPayloadV2(handle)).toMatchObject({
      episodeId: "episode-1",
    });
    const firstTaskId = JSON.parse(sessions[0].renderRaw).session.tasks[0]
      .taskId;
    expect(
      isV2LocalEvaluatorCapsuleHandleV1(
        getV2ActivityInstancesDeviceEvaluatorHandleV2(handle, firstTaskId),
      ),
    ).toBe(true);

    const originalFetch = globalThis.fetch;
    const networkSpy = jest.fn();
    globalThis.fetch = networkSpy as typeof globalThis.fetch;
    try {
      let evaluated = 0;
      for (const [index, session] of sessions.entries()) {
        const sessionHandle = loadV2ActivityInstancesDeviceSessionV2({
          deviceRoot: rehydratedDevice,
          sessionOrdinal: index + 1,
          renderRaw: session.renderRaw,
          capsuleEnvelopeRaw: session.capsuleEnvelopeRaw,
        });
        const sidecar = JSON.parse(session.sidecarRaw) as {
          tasks: Array<{
            taskId: string;
            inputKind: "text" | "choice_token" | "transcript";
            correctResponse: string;
          }>;
        };
        for (const task of sidecar.tasks) {
          const evaluatorHandle = getV2ActivityInstancesDeviceEvaluatorHandleV2(
            sessionHandle,
            task.taskId,
          );
          expect(
            evaluateV2LocalEvaluatorCapsuleV1(evaluatorHandle, {
              kind: task.inputKind,
              value: task.correctResponse,
            }).resultCode,
          ).toBe("provisional_correct");
          evaluated += 1;
        }
      }
      expect(evaluated).toBe(144);
      expect(networkSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
    const tamperedRender = JSON.parse(sessions[0].renderRaw);
    tamperedRender.session.tasks[0].learner.prompt = "Tampered prompt";
    expect(() =>
      loadV2ActivityInstancesDeviceSessionV2({
        deviceRoot: device,
        sessionOrdinal: 1,
        renderRaw: canonicalJsonV1(tamperedRender),
        capsuleEnvelopeRaw: sessions[0].capsuleEnvelopeRaw,
      }),
    ).toThrow("v2_activity_instances_device_bytes_mismatch");
    expect(() =>
      loadV2ActivityInstancesDeviceSessionV2({
        deviceRoot: device,
        sessionOrdinal: 1,
        renderRaw: "x".repeat(V2_ACTIVITY_SESSION_RENDER_MAX_BYTES + 1),
        capsuleEnvelopeRaw: sessions[0].capsuleEnvelopeRaw,
      }),
    ).toThrow("v2_activity_instances_device_bytes_mismatch");
  });

  it("rejects cross-session swaps, task drift, forged bytes and forged roots", () => {
    const { currentPlan, stage, snapshot, sessions } = fixture();
    const build = (changed = sessions) =>
      materializeV2ActivityInstancesAuthoringRootV2({
        plan: currentPlan,
        stageId: stage.stageId,
        capabilitySnapshot: snapshot,
        sessions: changed,
      });
    expect(() => build(sessions.slice(0, 11))).toThrow(
      "v2_activity_instances_session_count_invalid",
    );
    expect(() =>
      build([
        {
          ...sessions[0],
          sourceRaw: "x".repeat(V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES + 1),
        },
        ...sessions.slice(1),
      ]),
    ).toThrow("v2_activity_instances_source_bytes_invalid");
    expect(() =>
      build([
        {
          ...sessions[0],
          capsuleEnvelopeRaw: "x".repeat(
            V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES + 1,
          ),
        },
        ...sessions.slice(1),
      ]),
    ).toThrow("v2_activity_instances_capsule_bytes_invalid");
    expect(() =>
      build([
        {
          ...sessions[0],
          sidecarRaw: "x".repeat(V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES + 1),
        },
        ...sessions.slice(1),
      ]),
    ).toThrow("v2_activity_instances_sidecar_bytes_invalid");
    expect(() =>
      build([sessions[1], sessions[0], ...sessions.slice(2)]),
    ).toThrow("v2_activity_instances_session_identity_invalid");
    expect(() =>
      build([sessions[0], sessionBytes(2, 1), ...sessions.slice(2)]),
    ).toThrow("v2_activity_instances_episode_projection_invalid");
    const driftedRender = JSON.parse(sessions[0].renderRaw);
    driftedRender.session.tasks[0].learner.prompt = "Forged prompt";
    expect(() =>
      build([
        { ...sessions[0], renderRaw: canonicalJsonV1(driftedRender) },
        ...sessions.slice(1),
      ]),
    ).toThrow("v2_activity_instances_render_bytes_invalid");
    const driftedSidecar = JSON.parse(sessions[0].sidecarRaw);
    driftedSidecar.tasks[0].correctResponse = "forged-answer";
    expect(() =>
      build([
        {
          ...sessions[0],
          sidecarRaw: canonicalJsonV1(driftedSidecar),
        },
        ...sessions.slice(1),
      ]),
    ).toThrow("v2_activity_instances_sidecar_bytes_invalid");
    const sidecarWithExtra = JSON.parse(sessions[0].sidecarRaw);
    sidecarWithExtra.tasks[0].hiddenEvaluatorData = "must-not-be-pinned";
    expect(() =>
      build([
        {
          ...sessions[0],
          sidecarRaw: canonicalJsonV1(sidecarWithExtra),
        },
        ...sessions.slice(1),
      ]),
    ).toThrow("v2_activity_instances_sidecar_bytes_invalid");

    const coordinatedSidecar = JSON.parse(sessions[0].sidecarRaw);
    const coordinatedEnvelope = JSON.parse(sessions[0].capsuleEnvelopeRaw);
    const task = coordinatedSidecar.tasks[0];
    task.salt = "f".repeat(64);
    task.correctResponse = "coordinated-forged-answer";
    task.acceptedResponses = [task.correctResponse];
    task.acceptedCommitments = [
      createV2LocalEvaluatorCommitmentV1({
        capsuleId: task.capsuleId,
        taskId: task.taskId,
        activityId: task.activityId,
        family: task.family,
        inputKind: task.inputKind,
        normalizationLocale: task.normalizationLocale,
        normalizationProfileHash: task.normalizationProfileHash,
        salt: task.salt,
        response: task.correctResponse,
      }),
    ];
    coordinatedEnvelope.capsules[0] = buildV2LocalEvaluatorCapsuleRawV1({
      capsuleId: task.capsuleId,
      taskId: task.taskId,
      activityId: task.activityId,
      family: task.family,
      inputKind: task.inputKind,
      normalizationLocale: task.normalizationLocale,
      normalizationProfileHash: task.normalizationProfileHash,
      salt: task.salt,
      acceptedCommitments: task.acceptedCommitments,
    });
    coordinatedEnvelope.commitmentAggregate = hash({
      schemaVersion: "v2-activity-session-commitment-aggregate.v2",
      sourceFingerprint: coordinatedEnvelope.sourceFingerprint,
      sessionId: coordinatedEnvelope.sessionId,
      capsules: coordinatedEnvelope.capsules,
    });
    coordinatedSidecar.commitmentAggregate =
      coordinatedEnvelope.commitmentAggregate;
    expect(() =>
      build([
        {
          ...sessions[0],
          capsuleEnvelopeRaw: canonicalJsonV1(coordinatedEnvelope),
          sidecarRaw: canonicalJsonV1(coordinatedSidecar),
        },
        ...sessions.slice(1),
      ]),
    ).toThrow("v2_activity_instances_capsule_bytes_invalid");
    const foreignLanguageSource = JSON.parse(sessions[0].sourceRaw);
    foreignLanguageSource.targetLanguage = "fr";
    foreignLanguageSource.normalizationLocale = "fr";
    expect(() =>
      build([
        {
          ...sessions[0],
          sourceRaw: canonicalJsonV1(foreignLanguageSource),
        },
        ...sessions.slice(1),
      ]),
    ).toThrow("v2_activity_instances_source_bytes_invalid");

    const authoring = build();
    const raw = canonicalJsonV1(authoring);
    expect(
      parseV2ActivityInstancesAuthoringRootV2(
        raw,
        currentPlan,
        stage.stageId,
        sessions,
      ).packageFingerprint,
    ).toBe(authoring.packageFingerprint);
    const forged = JSON.parse(raw);
    forged.sessions[0].render.contentHash = hash("forged");
    expect(() =>
      parseV2ActivityInstancesAuthoringRootV2(
        canonicalJsonV1(forged),
        currentPlan,
        stage.stageId,
        sessions,
      ),
    ).toThrow();
  });

  it("binds language, catalog, policy and the exact template closure to the plan", () => {
    const { currentPlan, stage, snapshot, sessions } = fixture(2);
    const build = (changed: typeof snapshot) =>
      materializeV2ActivityInstancesAuthoringRootV2({
        plan: currentPlan,
        stageId: stage.stageId,
        capabilitySnapshot: changed,
        sessions,
      });
    const rematerialize = (overrides: {
      templates?: typeof snapshot.templates;
      languageProfileRef?: typeof snapshot.languageProfileRef;
      familyCatalogRef?: typeof snapshot.familyCatalogRef;
      requiredSessionFamilyPolicyRef?: typeof snapshot.requiredSessionFamilyPolicyRef;
    }) =>
      materializeV2GenerationCapabilitySnapshotV1({
        languageProfileRef:
          overrides.languageProfileRef ?? snapshot.languageProfileRef,
        familyCatalogRef:
          overrides.familyCatalogRef ?? snapshot.familyCatalogRef,
        requiredSessionFamilyPolicyRef:
          overrides.requiredSessionFamilyPolicyRef ??
          snapshot.requiredSessionFamilyPolicyRef,
        templates: (overrides.templates ?? snapshot.templates).map(
          ({ capabilityFingerprint: _ignored, ...template }) => template,
        ),
      });
    expect(build(snapshot).capabilitySnapshot.templates).toHaveLength(2);
    expect(() =>
      build(rematerialize({ templates: snapshot.templates.slice(0, 1) })),
    ).toThrow("v2_activity_instances_capability_plan_mismatch");
    expect(() =>
      build(
        rematerialize({
          templates: snapshot.templates.map((template, index) =>
            index === 0
              ? { ...template, contentHash: hash("substituted-template") }
              : template,
          ),
        }),
      ),
    ).toThrow("v2_activity_instances_capability_plan_mismatch");
    expect(() =>
      build(
        rematerialize({
          languageProfileRef: {
            ...snapshot.languageProfileRef,
            contentHash: hash("substituted-language-profile"),
          },
        }),
      ),
    ).toThrow("v2_activity_instances_capability_plan_mismatch");
    expect(() =>
      build(
        rematerialize({
          templates: [
            ...snapshot.templates,
            {
              ...snapshot.templates[0],
              templateId: "template-99",
              capabilityFingerprint: undefined as never,
            },
          ],
        }),
      ),
    ).toThrow("v2_activity_instances_capability_plan_mismatch");
    expect(() =>
      build(
        rematerialize({
          requiredSessionFamilyPolicyRef: {
            ...snapshot.requiredSessionFamilyPolicyRef,
            contentHash: hash("substituted-required-policy"),
          },
        }),
      ),
    ).toThrow("v2_activity_instances_capability_plan_mismatch");
    expect(() =>
      build(
        rematerialize({
          familyCatalogRef: {
            ...snapshot.familyCatalogRef,
            contentHash: hash("substituted-family-catalog"),
          },
        }),
      ),
    ).toThrow("v2_activity_instances_capability_plan_mismatch");
    expect(() =>
      materializeV2ActivityInstancesAuthoringRootV2({
        plan: { ...currentPlan },
        stageId: stage.stageId,
        capabilitySnapshot: snapshot,
        sessions,
      }),
    ).toThrow("v2_activity_instances_plan_untrusted");
  });

  it("derives exactly 48 deterministic untrusted read permits without granting a root brand", () => {
    const { currentPlan, stage, snapshot, sessions } = fixture();
    const authoring = materializeV2ActivityInstancesAuthoringRootV2({
      plan: currentPlan,
      stageId: stage.stageId,
      capabilitySnapshot: snapshot,
      sessions,
    });
    const permits = parseV2ActivityInstancesUntrustedRootManifestPermitsV2(
      canonicalJsonV1(authoring),
      currentPlan,
      stage.stageId,
    );
    expect(permits.permitCount).toBe(48);
    expect(permits.permits).toHaveLength(48);
    expect(permits.permits.slice(0, 4).map(({ kind }) => kind)).toEqual([
      "source",
      "render",
      "capsule",
      "sidecar",
    ]);
    expect(permits.permits[4].sessionOrdinal).toBe(2);
    expect(permits.totalDeclaredByteSize).toBe(
      sessions.reduce(
        (total, session) =>
          total +
          utf8ByteLengthV1(session.sourceRaw) +
          utf8ByteLengthV1(session.renderRaw) +
          utf8ByteLengthV1(session.capsuleEnvelopeRaw) +
          utf8ByteLengthV1(session.sidecarRaw),
        0,
      ),
    );
    expect(permits.maximumAggregateBytes).toBe(
      V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES,
    );
    expect(permits.maximumAggregateBytes).toBe(11_796_480);
    expect(Object.isFrozen(permits)).toBe(true);
    expect(Object.isFrozen(permits.permits)).toBe(true);
    expect(isV2ActivityInstancesAuthoringRootV2(permits)).toBe(false);
  });

  it("rejects 47/49 permit shapes and pin path/hash/generation/size substitution", () => {
    const { currentPlan, stage, snapshot, sessions } = fixture();
    const authoring = materializeV2ActivityInstancesAuthoringRootV2({
      plan: currentPlan,
      stageId: stage.stageId,
      capabilitySnapshot: snapshot,
      sessions,
    });
    const reject = (mutate: (value: any) => void, code?: string) => {
      const changed = JSON.parse(canonicalJsonV1(authoring));
      mutate(changed);
      const action = () =>
        parseV2ActivityInstancesUntrustedRootManifestPermitsV2(
          canonicalJsonV1(changed),
          currentPlan,
          stage.stageId,
        );
      return code ? expect(action).toThrow(code) : expect(action).toThrow();
    };
    reject((value) => {
      delete value.sessions[0].sidecar;
    });
    reject((value) => {
      value.sessions[0].bonus = value.sessions[0].sidecar;
    });
    reject((value) => {
      value.sessions[0].render.objectPath = value.sessions[0].source.objectPath;
    }, "v2_activity_instances_manifest_pin_invalid");
    reject((value) => {
      value.sessions[0].source.contentHash = hash("substituted-source");
    }, "v2_activity_instances_manifest_pin_invalid");
    reject((value) => {
      value.sessions[0].capsule.objectGeneration = "../bad";
    }, "v2_activity_instances_manifest_pin_invalid");
    reject((value) => {
      value.sessions[0].source.byteSize =
        V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES + 1;
    }, "v2_activity_instances_manifest_pin_invalid");
    reject((value) => {
      value.sessions[0].render.byteSize = 0;
    }, "v2_activity_instances_manifest_pin_invalid");
    reject((value) => {
      value.packageFingerprint = hash("forged-package");
    }, "v2_activity_instances_manifest_fingerprint_invalid");
    reject((value) => {
      value.capabilitySnapshot.templates[0].unexpected = true;
    });
    reject((value) => {
      value.sessions.pop();
    }, "v2_activity_instances_manifest_permit_count_invalid");
    reject((value) => {
      value.sessions.push(value.sessions[11]);
    }, "v2_activity_instances_manifest_permit_count_invalid");
  });

  it("preflights depth, reserved keys and NFC before canonical fingerprint work", () => {
    const { currentPlan, stage, snapshot, sessions } = fixture();
    const authoring = materializeV2ActivityInstancesAuthoringRootV2({
      plan: currentPlan,
      stageId: stage.stageId,
      capabilitySnapshot: snapshot,
      sessions,
    });
    const deep = JSON.parse(canonicalJsonV1(authoring));
    let nested: Record<string, unknown> = {};
    deep.capabilitySnapshot.nested = nested;
    for (let index = 0; index < 20; index += 1) {
      const next: Record<string, unknown> = {};
      nested.next = next;
      nested = next;
    }
    expect(() =>
      parseV2ActivityInstancesUntrustedRootManifestPermitsV2(
        canonicalJsonV1(deep),
        currentPlan,
        stage.stageId,
      ),
    ).toThrow("v2_activity_instances_manifest_complexity_invalid");

    const decomposed = canonicalJsonV1(authoring).replace(
      '"workspaceId":"workspace-1"',
      '"workspaceId":"e\u0301"',
    );
    expect(() =>
      parseV2ActivityInstancesUntrustedRootManifestPermitsV2(
        decomposed,
        currentPlan,
        stage.stageId,
      ),
    ).toThrow("v2_activity_instances_manifest_string_invalid");

    const canonical = canonicalJsonV1(authoring);
    const reserved = canonical.replace("{", '{"__proto__":{},');
    expect(() =>
      parseV2ActivityInstancesUntrustedRootManifestPermitsV2(
        reserved,
        currentPlan,
        stage.stageId,
      ),
    ).toThrow("v2_activity_instances_manifest_object_invalid");
  });

  it("validates exported stage paths and session ordinals", () => {
    const { stage } = fixture();
    const sourceHash = hash("source-a");
    expect(
      v2ActivitySessionSourceObjectPath(stage.stageId, 1, sourceHash),
    ).toContain(`/sessions/01/source/${sourceHash}.json`);
    expect(() =>
      v2ActivitySessionSourceObjectPath("../bad", 1, sourceHash),
    ).toThrow("v2_activity_instances_stage_identity_invalid");
    expect(() =>
      v2ActivitySessionSourceObjectPath(stage.stageId, 0, sourceHash),
    ).toThrow("v2_activity_instances_session_identity_invalid");
    expect(() =>
      v2ActivitySessionSourceObjectPath(stage.stageId, 1, "bad"),
    ).toThrow("v2_activity_instances_object_pin_invalid");
    expect(
      v2ActivitySessionSourceObjectPath(
        stage.stageId,
        1,
        hash("source-variant-a"),
      ),
    ).not.toBe(
      v2ActivitySessionSourceObjectPath(
        stage.stageId,
        1,
        hash("source-variant-b"),
      ),
    );
    expect(() =>
      v2ActivitySessionProjectionObjectPath(
        stage.stageId,
        13,
        "render",
        hash("render"),
      ),
    ).toThrow("v2_activity_instances_session_identity_invalid");
  });
});

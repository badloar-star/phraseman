import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2ActivityAudioRuntimeProjectionV1,
  encodeLearningV2ActivityAudioRuntimeProjectionV1,
} from "../modules/learning-v2/runtime/activity_audio_runtime_projection_v1";
import {
  materializeLearningV2ActivityLearnerActionResourceV1,
  encodeLearningV2ActivityLearnerActionResourceV1,
  type LearningV2ActivityLearnerActionEntryV1,
} from "../modules/learning-v2/runtime/activity_learner_action_resource_v1";
import { materializeLearningV2ActivityPostTerminalCardCatalogV1 } from "../modules/learning-v2/runtime/activity_post_terminal_card_catalog_v1";
import {
  materializeLearningV2ActivityPostTerminalCardCapsuleV1,
  encodeLearningV2ActivityPostTerminalCardCapsuleV1,
} from "../modules/learning-v2/runtime/activity_post_terminal_card_capsule_v1";
import {
  encodeLearningV2ActivityAuxiliaryReleaseManifestV1,
  isLearningV2ActivityAuxiliaryReleaseManifestV1,
  materializeLearningV2ActivityAuxiliaryReleaseManifestV1,
  parseLearningV2ActivityAuxiliaryReleaseManifestV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_release_manifest_v1";
import {
  getLearningV2ActivityAuxiliaryIntegritySummaryV1,
  getLearningV2ActivityReportContextFromIntegrityV1,
  isLearningV2ActivityAuxiliaryIntegrityHandleV1,
  loadLearningV2ActivityAuxiliaryIntegrityV1,
  projectLearningV2ActivityAuxiliaryClientMaterialV1,
  resolveLearningV2ActivityCardFromIntegrityV1,
  resolveLearningV2ActivityErrorFromIntegrityV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_integrity_loader_v1";
import {
  encodeLearningV2ActivityAuxiliaryClientDescriptorV1,
  isLearningV2ActivityAuxiliaryClientDescriptorV1,
  materializeLearningV2ActivityAuxiliaryClientDescriptorV1,
  parseLearningV2ActivityAuxiliaryClientDescriptorV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1";
import {
  learningV2ActivityAuxiliaryClientCacheKeyV1,
  loadLearningV2ActivityAuxiliaryClientWithLkgV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_client_loader_v1";
import {
  createLearningV2ActivityAuxiliarySessionRuntimeV1,
  isLearningV2ActivityAuxiliarySessionRuntimeV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_session_runtime_v1";
import {
  bindLearningV2ActivityAuxiliaryIntegrityToReleaseV1,
  encodeLearningV2ActivityAuxiliaryReleaseIndexV1,
  getLearningV2ActivityAuxiliaryReleaseSummaryV1,
  isLearningV2ActivityAuxiliaryReleaseHandleV1,
  materializeLearningV2ActivityAuxiliaryReleaseIndexV1,
  parseLearningV2ActivityAuxiliaryReleaseIndexV1,
  resolveLearningV2ActivityAuxiliaryIntegrityFromReleaseV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_release_index_v1";
import {
  buildV2SeasonReleaseRecord,
  v2ManifestHash,
  type V2PublishedSeasonManifestView,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleasePointer,
} from "../modules/learning-v2/content/release_manifest";
import {
  isV2ActivityAuxiliaryReleasePointerV1,
  materializeV2ActivityAuxiliaryReleasePointerV1,
  parseV2ActivityAuxiliaryReleasePointerV1,
  v2ActivityAuxiliaryReleasePointerDocumentPathV1,
} from "../functions/src/content_factory/v2_activity_auxiliary_release_pointer_v1";
import {
  parseLearningV2ActivityErrorExplanationCatalogV1,
  projectLearningV2ActivityErrorExplanationsForLearnerV1,
  encodeLearningV2ActivityErrorExplanationLearnerProjectionV1,
} from "../modules/learning-v2/content/activity_error_explanation_catalog_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const voices = ["ash", "onyx", "nova", "coral"] as const;

function actionFixture(sessionOrdinal = 1) {
  const entries: LearningV2ActivityLearnerActionEntryV1[] = Array.from(
    { length: 12 },
    (_, index) => {
      const slot = index + 1;
      const suffix =
        sessionOrdinal === 1 ? `${slot}` : `${sessionOrdinal}-${slot}`;
      const taskId = `task-${suffix}`;
      const activityId = `activity-${suffix}`;
      const promptId = `prompt-${suffix}`;
      const prompt = `Visible prompt ${slot}`;
      const responseOptions = Object.freeze([
        Object.freeze({ responseId: `option-${slot}-a`, text: "Option A" }),
        Object.freeze({ responseId: `option-${slot}-b`, text: "Option B" }),
      ]);
      const learnerSurfaceFingerprint = h({
        promptId,
        prompt,
        responseOptions,
        accessibilityLabel: `Task ${slot}`,
      });
      const reportBody = {
        taskId,
        activityId,
        promptId,
        sessionOrdinal,
        screen: "learning_v2_activity" as const,
        dataId: taskId,
        prompt,
        responseOptions,
        accessibilityLabel: `Task ${slot}`,
        learnerSurfaceFingerprint,
      };
      const report = Object.freeze({
        reportContextRef: h(reportBody),
        screen: "learning_v2_activity" as const,
        dataId: taskId,
        prompt,
        responseOptions,
        accessibilityLabel: `Task ${slot}`,
        learnerSurfaceFingerprint,
      });
      const visible = slot <= 8 || slot === 11;
      const saveBody = visible
        ? {
            taskId,
            activityId,
            promptId,
            resolution: "learner_visible_prompt" as const,
            targetText: prompt,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint: h({ targetText: prompt }),
          }
        : {
            taskId,
            activityId,
            promptId,
            resolution: "server_post_terminal" as const,
          };
      const save = visible
        ? Object.freeze({
            savablePhraseRef: h(saveBody),
            resolution: "learner_visible_prompt" as const,
            targetText: prompt,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint: h({ targetText: prompt }),
          })
        : Object.freeze({
            savablePhraseRef: h(saveBody),
            resolution: "server_post_terminal" as const,
            targetText: null,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint: null,
          });
      const body = {
        taskId,
        activityId,
        promptId,
        slot,
        family: "phrase_builder" as const,
        report,
        save,
        voiceAvailable: true,
      };
      return Object.freeze({ ...body, entryFingerprint: h(body) });
    },
  );
  return materializeLearningV2ActivityLearnerActionResourceV1({
    episodeId: "episode-1",
    targetLanguage: "en",
    sessionId: `session-${sessionOrdinal}`,
    sessionOrdinal,
    sourceFingerprint: h(["source", sessionOrdinal]),
    renderFingerprint: h(["render", sessionOrdinal]),
    entries,
  });
}

function errorsRaw(action: ReturnType<typeof actionFixture>) {
  const entries = Array.from({ length: 144 }, (_, index) => {
    const sessionOrdinal = Math.floor(index / 12) + 1;
    const slot = (index % 12) + 1;
    const taskId =
      sessionOrdinal === 1 ? `task-${slot}` : `task-${sessionOrdinal}-${slot}`;
    const activityId =
      sessionOrdinal === 1
        ? `activity-${slot}`
        : `activity-${sessionOrdinal}-${slot}`;
    const textByLocale = Object.freeze(
      Object.fromEntries(
        LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
          locale,
          `${locale} explanation ${index + 1}`,
        ]),
      ),
    );
    return {
      explanationId: `explanation-${index + 1}`,
      episodeId: action.episodeId,
      sessionId: `session-${sessionOrdinal}`,
      sessionOrdinal,
      taskId,
      activityId,
      family: "phrase_builder",
      errorKind: "generic_wrong_answer",
      selectedVariantId: `variant-${index + 1}`,
      variants: [
        {
          variantId: `variant-${index + 1}`,
          state: "selected_for_preview",
          origin: "owner_authored",
          provenanceFingerprint: h(["provenance", index]),
          textByLocale,
        },
      ],
    };
  });
  const body = {
    schemaVersion: "learning-v2-activity-error-explanation-catalog.v1",
    catalogId: "errors-1",
    packageId: "package-1",
    targetLanguage: "en",
    episodeId: action.episodeId,
    episodeOrdinal: 1,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    entries,
    entryCount: 144,
    filterDimensions: [
      "interface_locale",
      "family",
      "episode",
      "session",
      "task",
    ],
    contentOriginAuthority: "unverified_owner_or_generator_claim",
    selectionAuthority: "preview_only_no_release_authority",
    runtimeAuthority: "none",
    publicationAuthority: "none",
    releaseAuthority: false,
  };
  const catalog = parseLearningV2ActivityErrorExplanationCatalogV1(
    canonicalJsonV1({ ...body, catalogFingerprint: h(body) }),
  );
  return encodeLearningV2ActivityErrorExplanationLearnerProjectionV1(
    projectLearningV2ActivityErrorExplanationsForLearnerV1(catalog),
  );
}

function fixture(sessionOrdinal = 1) {
  const action = actionFixture(sessionOrdinal);
  const declarations = action.entries.map((entry, index) => ({
    taskId: entry.taskId,
    targetText: `Visible prompt ${index + 1}`,
    meaningByLocale: Object.freeze(
      Object.fromEntries(
        LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
          locale,
          `${locale} meaning ${index + 1}`,
        ]),
      ),
    ) as never,
    provenanceFingerprint: h(["card", index]),
  }));
  const catalog = materializeLearningV2ActivityPostTerminalCardCatalogV1({
    catalogId: "cards-1",
    packageId: "package-1",
    actionResource: action,
    declarations,
  });
  const cards = materializeLearningV2ActivityPostTerminalCardCapsuleV1(
    catalog,
    action,
  );
  const audioEntries = voices.flatMap((voiceId) =>
    [
      { inputKind: "full_utterance" as const, wordId: null, wordOrdinal: null },
      { inputKind: "word" as const, wordId: h("word-1"), wordOrdinal: 1 },
    ].map((coordinate) => {
      const contentHash = h(["audio", voiceId, coordinate]);
      const body = {
        generationTargetFingerprint: h(["generation", voiceId, coordinate]),
        itemFingerprint: h(["item", voiceId, coordinate]),
        taskId: action.entries[0].taskId,
        taskVoiceGroupFingerprint: h("group"),
        audioTargetId: h("target"),
        ...coordinate,
        voiceId,
        objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${contentHash}.mp3`,
        contentHash,
        objectGeneration: "9",
        byteSize: 2048,
        contentType: "audio/mpeg" as const,
        codecRulesFingerprint: h("codec-rules"),
        codecResultFingerprint: h(["codec-result", voiceId, coordinate]),
      };
      return Object.freeze({ ...body, entryFingerprint: h(body) });
    }),
  );
  const audio = materializeLearningV2ActivityAudioRuntimeProjectionV1({
    episodeId: action.episodeId,
    sessionId: action.sessionId,
    sessionOrdinal: action.sessionOrdinal,
    voiceAudioManifestFingerprint: h("manifest"),
    sourceSessionManifestFingerprint: h("session-manifest"),
    activityAudioCatalogFingerprint: h("audio-catalog"),
    voiceTargetsPackageFingerprint: h("voice-package"),
    entries: audioEntries,
    selectableBindings: [],
  });
  return {
    action,
    actionRaw: encodeLearningV2ActivityLearnerActionResourceV1(action),
    cardRaw: encodeLearningV2ActivityPostTerminalCardCapsuleV1(cards),
    audioRaw: encodeLearningV2ActivityAudioRuntimeProjectionV1(audio),
    errorsRaw: errorsRaw(action),
  };
}

function publishedView(episodeId: string): V2PublishedSeasonManifestView {
  const manifestObject = {
    path: "learning-v2/releases/season-1/manifest.json",
    generation: "7",
    contentHash: h("placeholder"),
    byteSize: 2048,
  };
  const lessonObject = {
    path: `learning-v2/releases/season-1/${episodeId}.json`,
    generation: "8",
    contentHash: h("lesson-unit"),
    byteSize: 4096,
  };
  const body: V2SeasonReleaseManifestBody = {
    schemaVersion: "v2-season-release-manifest-body.v1",
    releaseId: "release-1",
    courseReleaseId: "course-release-1",
    seasonId: "season-1",
    seasonRevision: 1,
    seasonContentHash: h("season"),
    studyTarget: "en",
    learnerSourceLocale: "ru",
    releaseScope: "vertical_slice",
    decisionRegistryRef: {
      id: "decision-registry",
      version: 1,
      contentHash: h("decision-registry"),
    },
    supportManifestRefs: [
      {
        platform: "ios",
        environment: "lab",
        minAppVersion: "1.0.0",
        manifestId: "ios-support",
        contentHash: h("ios-support"),
      },
      {
        platform: "android",
        environment: "lab",
        minAppVersion: "1.0.0",
        manifestId: "android-support",
        contentHash: h("android-support"),
      },
    ],
    voiceNetworkEgressRefs: [],
    lessonUnits: [{ episodeId, lessonId: 1, object: lessonObject }],
  };
  const manifestHash = v2ManifestHash(body);
  const object = { ...manifestObject, contentHash: manifestHash };
  const record = buildV2SeasonReleaseRecord(
    body,
    object,
    "2026-08-12T00:00:00.000Z",
  );
  const pointer: V2SeasonReleasePointer = {
    schemaVersion: "v2-season-release-pointer.v1",
    pointerId: "lab:en:ru:season-1",
    environment: "lab",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    seasonId: "season-1",
    activeReleaseId: "release-1",
    activeManifestHash: manifestHash,
    rollout: {
      revision: 1,
      state: "internal",
      percent: 0,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
    },
    expectedCatalogRevision: 1,
    updatedBy: "admin-1",
    updatedAt: "2026-08-12T00:00:00.000Z",
  };
  return {
    schemaVersion: "published-v2-season-manifest-view.v1",
    catalogRevision: 1,
    manifestBody: body,
    manifestRecord: record,
    activePointer: pointer,
  };
}

function auxiliaryManifest(value: ReturnType<typeof fixture>) {
  return materializeLearningV2ActivityAuxiliaryReleaseManifestV1({
    stageId: "stage-activity-1",
    activityPackageFingerprint: h("activity-package"),
    learnerActionRaw: value.actionRaw,
    learnerActionGeneration: "11",
    postTerminalCardCapsuleRaw: value.cardRaw,
    postTerminalCardCapsuleGeneration: "12",
    audioRuntimeRaw: value.audioRaw,
    audioRuntimeGeneration: "13",
    errorExplanationRaw: value.errorsRaw,
    errorExplanationGeneration: "14",
  });
}

describe("Learning V2 activity auxiliary release manifest", () => {
  it("binds four exact immutable auxiliary objects without granting release authority", () => {
    const value = fixture();
    const manifest = materializeLearningV2ActivityAuxiliaryReleaseManifestV1({
      stageId: "stage-activity-1",
      activityPackageFingerprint: h("activity-package"),
      learnerActionRaw: value.actionRaw,
      learnerActionGeneration: "11",
      postTerminalCardCapsuleRaw: value.cardRaw,
      postTerminalCardCapsuleGeneration: "12",
      audioRuntimeRaw: value.audioRaw,
      audioRuntimeGeneration: "13",
      errorExplanationRaw: value.errorsRaw,
      errorExplanationGeneration: "14",
    });
    const rehydrated = parseLearningV2ActivityAuxiliaryReleaseManifestV1(
      encodeLearningV2ActivityAuxiliaryReleaseManifestV1(manifest),
    );
    expect(rehydrated).toMatchObject({
      objectCount: 4,
      storageEvidence: "unverified_structural_pins",
      clientDelivery: "manifest_only_no_embedded_payloads",
      runtimeAuthority: "none_release_pointer_and_readback_required",
      releaseAuthority: false,
    });
    expect(rehydrated.objects.map((entry) => entry.kind)).toEqual([
      "learner_action",
      "post_terminal_card_capsule",
      "audio_runtime",
      "error_explanations",
    ]);
    expect(
      isLearningV2ActivityAuxiliaryReleaseManifestV1({ ...rehydrated }),
    ).toBe(false);
  });

  it("exact-readbacks all four pins and exposes only narrow integrity resolvers", async () => {
    const value = fixture();
    const manifest = materializeLearningV2ActivityAuxiliaryReleaseManifestV1({
      stageId: "stage-activity-1",
      activityPackageFingerprint: h("activity-package"),
      learnerActionRaw: value.actionRaw,
      learnerActionGeneration: "11",
      postTerminalCardCapsuleRaw: value.cardRaw,
      postTerminalCardCapsuleGeneration: "12",
      audioRuntimeRaw: value.audioRaw,
      audioRuntimeGeneration: "13",
      errorExplanationRaw: value.errorsRaw,
      errorExplanationGeneration: "14",
    });
    const rawByKind = {
      learner_action: value.actionRaw,
      post_terminal_card_capsule: value.cardRaw,
      audio_runtime: value.audioRaw,
      error_explanations: value.errorsRaw,
    } as const;
    const reads: string[] = [];
    const handle = await loadLearningV2ActivityAuxiliaryIntegrityV1({
      manifest,
      expected: {
        stageId: manifest.stageId,
        episodeId: manifest.episodeId,
        sessionId: manifest.sessionId,
        sessionOrdinal: manifest.sessionOrdinal,
        activityPackageFingerprint: manifest.activityPackageFingerprint,
        sourceFingerprint: manifest.sourceFingerprint,
        renderFingerprint: manifest.renderFingerprint,
      },
      reader: {
        readExact: async (pin) => {
          reads.push(pin.kind);
          return {
            raw: rawByKind[pin.kind],
            objectGeneration: pin.objectGeneration,
            byteSize: pin.byteSize,
            contentHash: pin.contentHash,
            contentType: "application/json; charset=utf-8" as const,
          };
        },
      },
    });
    expect(reads).toEqual([
      "learner_action",
      "post_terminal_card_capsule",
      "audio_runtime",
      "error_explanations",
    ]);
    expect(
      getLearningV2ActivityAuxiliaryIntegritySummaryV1(handle),
    ).toMatchObject({
      storageIntegrity: "exact_generation_hash_size_readback",
      originAuthority: "none_external_release_pointer_required",
      releaseAuthority: false,
    });
    expect(
      getLearningV2ActivityReportContextFromIntegrityV1(
        handle,
        "task-10",
        "activity-10",
      ),
    ).toMatchObject({ prompt: "Visible prompt 10", dataId: "task-10" });
    expect(
      resolveLearningV2ActivityCardFromIntegrityV1(handle, {
        taskId: "task-10",
        activityId: "activity-10",
        savablePhraseRef: value.action.entries[9].save.savablePhraseRef,
        interfaceLocale: "pl",
        terminalState: "completed",
      }),
    ).toMatchObject({ meaning: "pl meaning 10" });
    expect(
      resolveLearningV2ActivityErrorFromIntegrityV1(handle, {
        taskId: "task-10",
        activityId: "activity-10",
        interfaceLocale: "uk",
      }),
    ).toMatchObject({ localizedText: "uk explanation 10" });
    expect(isLearningV2ActivityAuxiliaryIntegrityHandleV1({ ...handle })).toBe(
      false,
    );
    const clientMaterial =
      projectLearningV2ActivityAuxiliaryClientMaterialV1(handle);
    const clientDescriptor =
      materializeLearningV2ActivityAuxiliaryClientDescriptorV1({
        environment: "lab",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        seasonId: "season-1",
        releaseId: "release-1",
        activeManifestHash: h("active-manifest"),
        episodeId: manifest.episodeId,
        stageId: manifest.stageId,
        sessionId: manifest.sessionId,
        sessionOrdinal: manifest.sessionOrdinal,
        activityPackageFingerprint: manifest.activityPackageFingerprint,
        auxiliaryIndexFingerprint: h("auxiliary-index"),
        auxiliaryManifestFingerprint: manifest.manifestFingerprint,
        sourceFingerprint: manifest.sourceFingerprint,
        renderFingerprint: manifest.renderFingerprint,
        actionResource: clientMaterial.action,
        postTerminalCards: clientMaterial.cards,
        audioRuntime: clientMaterial.audio,
        errorSourceProjectionFingerprint:
          clientMaterial.errorSourceProjectionFingerprint,
        errorExplanations: clientMaterial.errorEntries.map((entry) => ({
          explanationRef: entry.explanationRef,
          taskId: entry.taskId,
          activityId: entry.activityId,
          textByLocale: entry.textByLocale,
        })),
      });
    const clientRaw =
      encodeLearningV2ActivityAuxiliaryClientDescriptorV1(clientDescriptor);
    const parsedClient =
      parseLearningV2ActivityAuxiliaryClientDescriptorV1(clientRaw);
    expect(parsedClient).toMatchObject({
      errorExplanationCount: 12,
      serverProjectionClaim: "authenticated_active_release_session_readback",
      originAuthority: "none_transport_authentication_required",
      evaluatorPayload: "absent_by_exact_schema",
      walletAuthority: "none",
      releaseAuthority: false,
    });
    expect(clientRaw).not.toContain("correctResponse");
    expect(clientRaw).not.toContain("acceptedResponses");
    expect(
      isLearningV2ActivityAuxiliaryClientDescriptorV1({ ...parsedClient }),
    ).toBe(false);
    const mounted = createLearningV2ActivityAuxiliarySessionRuntimeV1({
      descriptor: parsedClient,
      interfaceLocale: "uk",
    });
    expect(mounted).toMatchObject({
      taskCount: 12,
      transportDependency: "none_after_verified_descriptor_mount",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      releaseAuthority: false,
    });
    expect(mounted.resolveTaskBySlot(10)).toMatchObject({
      slot: 10,
      secondErrorExplanation: {
        text: "uk explanation 10",
        interfaceLocale: "uk",
      },
      postTerminalSaveAvailable: true,
    });
    expect(mounted.getDescriptor()).toBe(parsedClient);
    expect(isLearningV2ActivityAuxiliarySessionRuntimeV1({ ...mounted })).toBe(
      false,
    );
    expect(() => mounted.resolveTaskBySlot(13)).toThrow(
      "learning_v2_activity_auxiliary_session_runtime_invalid",
    );
  });

  it("binds twelve session manifests to the structurally active release without upgrading origin authority", async () => {
    const values = Array.from({ length: 12 }, (_, index) => fixture(index + 1));
    const manifests = values.map(auxiliaryManifest);
    const index = materializeLearningV2ActivityAuxiliaryReleaseIndexV1({
      publishedView: publishedView("episode-1"),
      expectedEnvironment: "lab",
      episodeId: "episode-1",
      stageId: "stage-activity-1",
      activityPackageFingerprint: h("activity-package"),
      manifests: manifests.map((manifest, index) => ({
        raw: encodeLearningV2ActivityAuxiliaryReleaseManifestV1(manifest),
        objectGeneration: String(100 + index),
      })),
    });
    const rehydrated = parseLearningV2ActivityAuxiliaryReleaseIndexV1(
      encodeLearningV2ActivityAuxiliaryReleaseIndexV1(index),
    );
    expect(rehydrated).toMatchObject({
      sessionCount: 12,
      releaseIdentityEvidence: "validated_published_view_structure_only",
      repositoryOriginAuthority: "none_server_readback_required",
      runtimeAuthority: "none_release_index_readback_required",
      releaseAuthority: false,
    });
    const indexRaw = encodeLearningV2ActivityAuxiliaryReleaseIndexV1(index);
    const pointer = materializeV2ActivityAuxiliaryReleasePointerV1({
      indexRaw,
      indexObjectGeneration: "501",
    });
    expect(
      parseV2ActivityAuxiliaryReleasePointerV1(
        canonicalJsonV1(pointer),
        rehydrated,
      ),
    ).toMatchObject({
      activeManifestHash: index.activeManifestHash,
      indexFingerprint: index.indexFingerprint,
      repositoryAuthority: "none_structural_pointer_only",
      runtimeAuthority: "none_admin_readback_required",
      releaseAuthority: false,
    });
    expect(
      v2ActivityAuxiliaryReleasePointerDocumentPathV1({
        activeManifestHash: index.activeManifestHash,
        episodeId: index.episodeId,
      }),
    ).toMatch(
      /^content_v2_activity_auxiliary_release_pointers\/[a-f0-9]{64}__[a-f0-9]{64}$/u,
    );
    expect(isV2ActivityAuxiliaryReleasePointerV1({ ...pointer })).toBe(false);

    const selected = values[9];
    const selectedManifest = manifests[9];
    const rawByKind = {
      learner_action: selected.actionRaw,
      post_terminal_card_capsule: selected.cardRaw,
      audio_runtime: selected.audioRaw,
      error_explanations: selected.errorsRaw,
    } as const;
    const integrity = await loadLearningV2ActivityAuxiliaryIntegrityV1({
      manifest: selectedManifest,
      expected: {
        stageId: selectedManifest.stageId,
        episodeId: selectedManifest.episodeId,
        sessionId: selectedManifest.sessionId,
        sessionOrdinal: selectedManifest.sessionOrdinal,
        activityPackageFingerprint: selectedManifest.activityPackageFingerprint,
        sourceFingerprint: selectedManifest.sourceFingerprint,
        renderFingerprint: selectedManifest.renderFingerprint,
      },
      reader: {
        readExact: async (pin) => ({
          raw: rawByKind[pin.kind],
          objectGeneration: pin.objectGeneration,
          byteSize: pin.byteSize,
          contentHash: pin.contentHash,
          contentType: "application/json; charset=utf-8" as const,
        }),
      },
    });
    const release = bindLearningV2ActivityAuxiliaryIntegrityToReleaseV1({
      index: rehydrated,
      integrity,
    });
    expect(
      getLearningV2ActivityAuxiliaryReleaseSummaryV1(release),
    ).toMatchObject({
      releaseId: "release-1",
      sessionId: "session-10",
      sessionOrdinal: 10,
      releaseIdentityEvidence:
        "validated_structural_active_pointer_and_lesson_unit",
      repositoryOriginAuthority: "none_server_readback_required",
      storageIntegrity: "exact_generation_hash_size_readback",
      releaseAuthority: false,
    });
    expect(
      resolveLearningV2ActivityAuxiliaryIntegrityFromReleaseV1(release),
    ).toBe(integrity);
    expect(isLearningV2ActivityAuxiliaryReleaseHandleV1({ ...release })).toBe(
      false,
    );

    const tampered = JSON.parse(
      encodeLearningV2ActivityAuxiliaryReleaseIndexV1(index),
    );
    [tampered.sessions[0], tampered.sessions[1]] = [
      tampered.sessions[1],
      tampered.sessions[0],
    ];
    expect(() =>
      parseLearningV2ActivityAuxiliaryReleaseIndexV1(canonicalJsonV1(tampered)),
    ).toThrow("learning_v2_activity_auxiliary_release_index_invalid");
  });

  it("rejects generation/path/hash tamper and cross-session resources", async () => {
    const value = fixture();
    const manifest = materializeLearningV2ActivityAuxiliaryReleaseManifestV1({
      stageId: "stage-activity-1",
      activityPackageFingerprint: h("activity-package"),
      learnerActionRaw: value.actionRaw,
      learnerActionGeneration: "11",
      postTerminalCardCapsuleRaw: value.cardRaw,
      postTerminalCardCapsuleGeneration: "12",
      audioRuntimeRaw: value.audioRaw,
      audioRuntimeGeneration: "13",
      errorExplanationRaw: value.errorsRaw,
      errorExplanationGeneration: "14",
    });
    const parsed = JSON.parse(
      encodeLearningV2ActivityAuxiliaryReleaseManifestV1(manifest),
    );
    parsed.objects[0].objectPath = "learning-v2/wrong/path.json";
    expect(() =>
      parseLearningV2ActivityAuxiliaryReleaseManifestV1(
        canonicalJsonV1(parsed),
      ),
    ).toThrow("learning_v2_activity_auxiliary_manifest_path_invalid");

    expect(() =>
      materializeLearningV2ActivityAuxiliaryReleaseManifestV1({
        stageId: "stage-activity-1",
        activityPackageFingerprint: h("activity-package"),
        learnerActionRaw: value.actionRaw,
        learnerActionGeneration: "11",
        postTerminalCardCapsuleRaw: value.cardRaw,
        postTerminalCardCapsuleGeneration: "12",
        audioRuntimeRaw: value.audioRaw.replace(
          '"sessionOrdinal":1',
          '"sessionOrdinal":2',
        ),
        audioRuntimeGeneration: "13",
        errorExplanationRaw: value.errorsRaw,
        errorExplanationGeneration: "14",
      }),
    ).toThrow();

    const rawByKind = {
      learner_action: value.actionRaw,
      post_terminal_card_capsule: value.cardRaw,
      audio_runtime: value.audioRaw,
      error_explanations: value.errorsRaw,
    } as const;
    await expect(
      loadLearningV2ActivityAuxiliaryIntegrityV1({
        manifest,
        expected: {
          stageId: manifest.stageId,
          episodeId: manifest.episodeId,
          sessionId: manifest.sessionId,
          sessionOrdinal: manifest.sessionOrdinal,
          activityPackageFingerprint: manifest.activityPackageFingerprint,
          sourceFingerprint: manifest.sourceFingerprint,
          renderFingerprint: manifest.renderFingerprint,
        },
        reader: {
          readExact: async (pin) => ({
            raw:
              pin.kind === "learner_action"
                ? `${rawByKind[pin.kind]} `
                : rawByKind[pin.kind],
            objectGeneration: pin.objectGeneration,
            byteSize: pin.byteSize,
            contentHash: pin.contentHash,
            contentType: "application/json; charset=utf-8" as const,
          }),
        },
      }),
    ).rejects.toThrow("learning_v2_activity_auxiliary_integrity_invalid");

    const validHandle = await loadLearningV2ActivityAuxiliaryIntegrityV1({
      manifest,
      expected: {
        stageId: manifest.stageId,
        episodeId: manifest.episodeId,
        sessionId: manifest.sessionId,
        sessionOrdinal: manifest.sessionOrdinal,
        activityPackageFingerprint: manifest.activityPackageFingerprint,
        sourceFingerprint: manifest.sourceFingerprint,
        renderFingerprint: manifest.renderFingerprint,
      },
      reader: {
        readExact: async (pin) => ({
          raw: rawByKind[pin.kind],
          objectGeneration: pin.objectGeneration,
          byteSize: pin.byteSize,
          contentHash: pin.contentHash,
          contentType: "application/json; charset=utf-8" as const,
        }),
      },
    });
    const material =
      projectLearningV2ActivityAuxiliaryClientMaterialV1(validHandle);
    const descriptor = materializeLearningV2ActivityAuxiliaryClientDescriptorV1(
      {
        environment: "lab",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        seasonId: "season-1",
        releaseId: "release-1",
        activeManifestHash: h("active-manifest"),
        episodeId: manifest.episodeId,
        stageId: manifest.stageId,
        sessionId: manifest.sessionId,
        sessionOrdinal: manifest.sessionOrdinal,
        activityPackageFingerprint: manifest.activityPackageFingerprint,
        auxiliaryIndexFingerprint: h("auxiliary-index"),
        auxiliaryManifestFingerprint: manifest.manifestFingerprint,
        sourceFingerprint: manifest.sourceFingerprint,
        renderFingerprint: manifest.renderFingerprint,
        actionResource: material.action,
        postTerminalCards: material.cards,
        audioRuntime: material.audio,
        errorSourceProjectionFingerprint:
          material.errorSourceProjectionFingerprint,
        errorExplanations: material.errorEntries.map((entry) => ({
          explanationRef: entry.explanationRef,
          taskId: entry.taskId,
          activityId: entry.activityId,
          textByLocale: entry.textByLocale,
        })),
      },
    );
    const descriptorRaw =
      encodeLearningV2ActivityAuxiliaryClientDescriptorV1(descriptor);
    const expected = {
      environment: descriptor.environment,
      studyTarget: descriptor.studyTarget,
      learnerSourceLocale: descriptor.learnerSourceLocale,
      seasonId: descriptor.seasonId,
      activeManifestHash: descriptor.activeManifestHash,
      episodeId: descriptor.episodeId,
      sessionId: descriptor.sessionId,
      sessionOrdinal: descriptor.sessionOrdinal,
      activityPackageFingerprint: descriptor.activityPackageFingerprint,
      auxiliaryIndexFingerprint: descriptor.auxiliaryIndexFingerprint,
    } as const;
    const cacheRows = new Map<string, string>();
    const cache = {
      get: async (key: string) => cacheRows.get(key) ?? null,
      set: async (key: string, raw: string) => {
        cacheRows.set(key, raw);
      },
      remove: async (key: string) => {
        cacheRows.delete(key);
      },
    };
    const networkLoad = await loadLearningV2ActivityAuxiliaryClientWithLkgV1({
      expected,
      cache,
      fetchCanonicalRaw: async () => descriptorRaw,
    });
    expect(networkLoad.source).toBe("network");
    expect(networkLoad.descriptor.descriptorFingerprint).toBe(
      descriptor.descriptorFingerprint,
    );
    const lkgLoad = await loadLearningV2ActivityAuxiliaryClientWithLkgV1({
      expected,
      cache,
      fetchCanonicalRaw: async () => {
        throw new Error("offline");
      },
    });
    expect(lkgLoad.source).toBe("lkg");
    expect(lkgLoad.cacheAuthority).toBe(
      "availability_only_not_release_or_origin_authority",
    );
    const mismatchedNetworkDescriptor = JSON.parse(descriptorRaw);
    mismatchedNetworkDescriptor.activeManifestHash = h("wrong-network-release");
    mismatchedNetworkDescriptor.descriptorFingerprint = hashCanonicalBody(
      Object.fromEntries(
        Object.entries(mismatchedNetworkDescriptor).filter(
          ([key]) => key !== "descriptorFingerprint",
        ),
      ),
    );
    await expect(
      loadLearningV2ActivityAuxiliaryClientWithLkgV1({
        expected,
        cache,
        fetchCanonicalRaw: async () =>
          canonicalJsonV1(mismatchedNetworkDescriptor),
      }),
    ).rejects.toThrow("learning_v2_activity_auxiliary_client_load_invalid");
    expect(
      learningV2ActivityAuxiliaryClientCacheKeyV1({
        ...expected,
        activeManifestHash: h("next-active-manifest"),
      }),
    ).not.toBe(learningV2ActivityAuxiliaryClientCacheKeyV1(expected));
    await expect(
      loadLearningV2ActivityAuxiliaryClientWithLkgV1({
        expected: {
          ...expected,
          activeManifestHash: h("next-active-manifest"),
        },
        cache,
        fetchCanonicalRaw: async () => {
          throw new Error("offline-new-release");
        },
      }),
    ).rejects.toThrow("offline-new-release");
    const tamperedDescriptor = JSON.parse(descriptorRaw);
    tamperedDescriptor.errorExplanations[0].taskId = "task-other";
    expect(() =>
      parseLearningV2ActivityAuxiliaryClientDescriptorV1(
        canonicalJsonV1(tamperedDescriptor),
      ),
    ).toThrow("learning_v2_activity_auxiliary_client_descriptor_invalid");
  });
});

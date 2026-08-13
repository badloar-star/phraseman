import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2ActivityLearnerActionResourceV1,
  type LearningV2ActivityLearnerActionEntryV1,
} from "../modules/learning-v2/runtime/activity_learner_action_resource_v1";
import {
  LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_MAX_BYTES_V1,
  encodeLearningV2ActivityPostTerminalCardCatalogV1,
  getLearningV2ActivityPostTerminalCardEntryV1,
  isLearningV2ActivityPostTerminalCardCatalogV1,
  materializeLearningV2ActivityPostTerminalCardCatalogV1,
  parseLearningV2ActivityPostTerminalCardCatalogV1,
} from "../modules/learning-v2/runtime/activity_post_terminal_card_catalog_v1";
import {
  encodeLearningV2ActivityPostTerminalCardCapsuleV1,
  isLearningV2ActivityPostTerminalCardCapsuleV1,
  materializeLearningV2ActivityPostTerminalCardCapsuleV1,
  parseLearningV2ActivityPostTerminalCardCapsuleV1,
  resolveLearningV2ActivityPostTerminalCardV1,
} from "../modules/learning-v2/runtime/activity_post_terminal_card_capsule_v1";

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;

function fixture(scope = "primary") {
  const entries: LearningV2ActivityLearnerActionEntryV1[] = Array.from(
    { length: 12 },
    (_, index) => {
      const slot = index + 1;
      const taskId = `task-${slot}`;
      const activityId = `activity-${slot}`;
      const promptId = `prompt-${slot}`;
      const prompt = `Visible prompt ${slot}`;
      const responseOptions = Object.freeze([
        Object.freeze({ responseId: `option-${slot}-a`, text: "Option A" }),
        Object.freeze({ responseId: `option-${slot}-b`, text: "Option B" }),
      ]);
      const learnerSurfaceFingerprint = hashCanonicalBody({
        promptId,
        prompt,
        responseOptions,
        accessibilityLabel: `Task ${slot}`,
      });
      const reportBody = {
        taskId,
        activityId,
        promptId,
        sessionOrdinal: 1,
        screen: "learning_v2_activity" as const,
        dataId: taskId,
        prompt,
        responseOptions,
        accessibilityLabel: `Task ${slot}`,
        learnerSurfaceFingerprint,
      };
      const report = Object.freeze({
        reportContextRef: hashCanonicalBody(reportBody),
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
            sourceTextFingerprint: hashCanonicalBody({ targetText: prompt }),
          }
        : {
            taskId,
            activityId,
            promptId,
            resolution: "server_post_terminal" as const,
          };
      const save = visible
        ? Object.freeze({
            savablePhraseRef: hashCanonicalBody(saveBody),
            resolution: "learner_visible_prompt" as const,
            targetText: prompt,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint: hashCanonicalBody({ targetText: prompt }),
          })
        : Object.freeze({
            savablePhraseRef: hashCanonicalBody(saveBody),
            resolution: "server_post_terminal" as const,
            targetText: null,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint: null,
          });
      const entryBody = {
        taskId,
        activityId,
        promptId,
        slot,
        family: "phrase_builder" as const,
        report,
        save,
        voiceAvailable: true,
      };
      return Object.freeze({
        ...entryBody,
        entryFingerprint: hashCanonicalBody(entryBody),
      });
    },
  );
  const actionResource = materializeLearningV2ActivityLearnerActionResourceV1({
    episodeId: "episode-1",
    targetLanguage: "en",
    sessionId: "episode-1:session:01",
    sessionOrdinal: 1,
    sourceFingerprint: hashCanonicalBody(["source", scope]),
    renderFingerprint: hashCanonicalBody(["render", scope]),
    entries,
  });
  const declarations = entries.map((entry, index) => ({
    taskId: entry.taskId,
    targetText: `Visible prompt ${index + 1}`,
    meaningByLocale: Object.freeze(
      Object.fromEntries(
        locales.map((locale) => [locale, `${locale} meaning ${index + 1}`]),
      ),
    ) as never,
    provenanceFingerprint: hashCanonicalBody(["owner", index + 1]),
  }));
  return { actionResource, declarations };
}

describe("Learning V2 post-terminal card catalog", () => {
  it("keeps all 12 localized cards server-only and resolves one exact ref", () => {
    const { actionResource, declarations } = fixture();
    const catalog = materializeLearningV2ActivityPostTerminalCardCatalogV1({
      catalogId: "cards-episode-1-session-1",
      packageId: "package-1",
      actionResource,
      declarations,
    });
    const raw = encodeLearningV2ActivityPostTerminalCardCatalogV1(catalog);
    const rehydrated = parseLearningV2ActivityPostTerminalCardCatalogV1(raw);
    expect(rehydrated).toMatchObject({
      entryCount: 12,
      clientDelivery: "forbidden",
      terminalEvidenceAuthority: "none_runtime_terminal_gate_required",
      runtimeAuthority: "none",
      releaseAuthority: false,
    });
    const action = actionResource.entries[9];
    expect(action.save).toMatchObject({
      resolution: "server_post_terminal",
      targetText: null,
    });
    expect(
      getLearningV2ActivityPostTerminalCardEntryV1(
        rehydrated,
        actionResource,
        action.taskId,
        action.activityId,
        action.save.savablePhraseRef,
      ),
    ).toMatchObject({
      slot: 10,
      sourceVisibility: "post_terminal_only",
      targetText: "Visible prompt 10",
      meaningByLocale: { ru: "ru meaning 10", tr: "tr meaning 10" },
    });
    expect(
      isLearningV2ActivityPostTerminalCardCatalogV1({ ...rehydrated }),
    ).toBe(false);

    const capsule = materializeLearningV2ActivityPostTerminalCardCapsuleV1(
      rehydrated,
      actionResource,
    );
    const rehydratedCapsule = parseLearningV2ActivityPostTerminalCardCapsuleV1(
      encodeLearningV2ActivityPostTerminalCardCapsuleV1(capsule),
    );
    expect(rehydratedCapsule).toMatchObject({
      consumer: "app_internal_post_terminal_save_only",
      assessmentSecrecy: "none_device_inspectable",
      terminalGateAuthority: "local_terminal_state_only",
      runtimeAuthority: "none_release_binding_required",
    });
    expect(
      resolveLearningV2ActivityPostTerminalCardV1({
        capsule: rehydratedCapsule,
        actionResource,
        taskId: action.taskId,
        activityId: action.activityId,
        savablePhraseRef: action.save.savablePhraseRef,
        interfaceLocale: "ru",
        terminalState: "completed",
      }),
    ).toMatchObject({
      targetText: "Visible prompt 10",
      meaning: "ru meaning 10",
      localTerminalAuthority: "ui_save_availability_only",
      walletAuthority: "none",
    });
    expect(() =>
      resolveLearningV2ActivityPostTerminalCardV1({
        capsule: rehydratedCapsule,
        actionResource,
        taskId: action.taskId,
        activityId: action.activityId,
        savablePhraseRef: action.save.savablePhraseRef,
        interfaceLocale: "ru",
        terminalState: "not_terminal",
      }),
    ).toThrow("learning_v2_post_terminal_card_capsule_gate_invalid");
    expect(isLearningV2ActivityPostTerminalCardCapsuleV1({ ...capsule })).toBe(
      false,
    );
  });

  it("rejects visible-text drift, duplicate tasks and cross-resource resolution", () => {
    const { actionResource, declarations } = fixture();
    const drifted = declarations.map((entry, index) =>
      index === 0 ? { ...entry, targetText: "Hidden answer" } : entry,
    );
    expect(() =>
      materializeLearningV2ActivityPostTerminalCardCatalogV1({
        catalogId: "cards-1",
        packageId: "package-1",
        actionResource,
        declarations: drifted,
      }),
    ).toThrow("learning_v2_post_terminal_card_visible_text_mismatch");

    expect(() =>
      materializeLearningV2ActivityPostTerminalCardCatalogV1({
        catalogId: "cards-1",
        packageId: "package-1",
        actionResource,
        declarations: [declarations[0], ...declarations.slice(0, 11)],
      }),
    ).toThrow("learning_v2_post_terminal_card_materialization_invalid");

    const catalog = materializeLearningV2ActivityPostTerminalCardCatalogV1({
      catalogId: "cards-1",
      packageId: "package-1",
      actionResource,
      declarations,
    });
    const other = fixture("other").actionResource;
    expect(() =>
      getLearningV2ActivityPostTerminalCardEntryV1(
        catalog,
        other,
        "task-1",
        "activity-1",
        actionResource.entries[0].save.savablePhraseRef,
      ),
    ).toThrow("learning_v2_post_terminal_card_handle_invalid");
  });

  it("rejects unknown fields, authority escalation, coordinated drift and caps", () => {
    const { actionResource, declarations } = fixture();
    const catalog = materializeLearningV2ActivityPostTerminalCardCatalogV1({
      catalogId: "cards-1",
      packageId: "package-1",
      actionResource,
      declarations,
    });
    const parsed = JSON.parse(
      encodeLearningV2ActivityPostTerminalCardCatalogV1(catalog),
    );
    parsed.clientDelivery = "allowed";
    expect(() =>
      parseLearningV2ActivityPostTerminalCardCatalogV1(canonicalJsonV1(parsed)),
    ).toThrow("learning_v2_post_terminal_card_authority_invalid");

    const unknown = JSON.parse(
      encodeLearningV2ActivityPostTerminalCardCatalogV1(catalog),
    );
    unknown.entries[0].correctResponse = "leak";
    expect(() =>
      parseLearningV2ActivityPostTerminalCardCatalogV1(
        canonicalJsonV1(unknown),
      ),
    ).toThrow("learning_v2_post_terminal_card_entry_invalid");

    const drift = JSON.parse(
      encodeLearningV2ActivityPostTerminalCardCatalogV1(catalog),
    );
    drift.entries[0].meaningByLocale.ru = "changed";
    expect(() =>
      parseLearningV2ActivityPostTerminalCardCatalogV1(canonicalJsonV1(drift)),
    ).toThrow("learning_v2_post_terminal_card_entry_fingerprint_invalid");

    expect(() =>
      parseLearningV2ActivityPostTerminalCardCatalogV1(
        "x".repeat(
          LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_MAX_BYTES_V1 + 1,
        ),
      ),
    ).toThrow("learning_v2_post_terminal_card_raw_invalid");
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import * as admin from "firebase-admin";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, type DocumentSnapshot } from "firebase/firestore";
import { createEpisodeDraft } from "../../../../modules/learning-v2/authoring/episode_draft";
import { adminSaveV2EpisodeDraft } from "../../admin_content_studio_callables";

const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");

const validFirstDraft = () => {
  const base = createEpisodeDraft({
    draftId: "callable-draft-1",
    episodeId: "callable-episode-1",
    seasonId: "callable-season-1",
    ordinal: 1,
    chapterId: "callable-chapter-1",
  });
  return {
    ...base,
    body: {
      ...base.body,
      activities: [{ activityId: "activity-1" }] as never,
      graph: {
        ...base.body.graph,
        startNodeId: "node-1",
        capstoneNodeId: "node-1",
        nodes: [
          {
            nodeId: "node-1",
            activityId: "activity-1",
            position: 1,
            visible: true,
            requiredForCore: true,
            voiceEvidenceOptional: true,
            phase: "encounter_build" as const,
            evidenceDeclarations: [],
            gateEligible: false,
            maxStars: 0,
          },
        ],
        edges: [],
      },
    },
  };
};

describe("V2 authoring exported callable lifecycle", () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST)
      throw new Error(
        "FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec",
      );
    if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, "utf8") },
    });
  });

  afterAll(async () => {
    await environment?.cleanup();
    await Promise.all(admin.apps.filter(Boolean).map((app) => app!.delete()));
  });

  it("creates, updates with the returned CAS head, and rejects a replay", async () => {
    const draft = validFirstDraft();
    const auth = {
      uid: "admin-callable-1",
      token: { admin: true, adminRole: "content_editor" },
    };
    const call = (data: unknown) =>
      adminSaveV2EpisodeDraft.run({
        data,
        auth,
        app: { appId: "emulator-app" },
      } as never);

    const first = await call({
      draftId: draft.body.draftId,
      expectedRevision: 0,
      expectedFingerprint: "",
      draft,
    });
    expect(first.ok).toBe(true);
    expect(first.draft.record.revision).toBe(1);

    let snapshot: DocumentSnapshot | undefined;
    await environment.withSecurityRulesDisabled(async (context) => {
      snapshot = await getDoc(
        doc(context.firestore(), "content_episode_drafts", draft.body.draftId),
      );
    });
    if (!snapshot) throw new Error("missing emulator snapshot");
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()?.ownerId).toBe(auth.uid);

    const second = await call({
      draftId: draft.body.draftId,
      expectedRevision: first.draft.record.revision,
      expectedFingerprint: first.draft.record.fingerprint,
      draft: first.draft,
    });
    expect(second.draft.record.revision).toBe(2);

    await expect(
      call({
        draftId: draft.body.draftId,
        expectedRevision: first.draft.record.revision,
        expectedFingerprint: first.draft.record.fingerprint,
        draft: first.draft,
      }),
    ).rejects.toThrow("authoring_revision_stale");
  });

  it("keeps direct client Firestore reads denied for the callable-owned document", async () => {
    await expect(
      getDoc(
        doc(
          environment.authenticatedContext("admin-callable-1").firestore(),
          "content_episode_drafts/callable-draft-1",
        ),
      ),
    ).rejects.toBeDefined();
  });

  it("rejects missing auth and non-editor roles before touching Firestore", async () => {
    const draft = validFirstDraft();
    const data = {
      draftId: draft.body.draftId,
      expectedRevision: 0,
      expectedFingerprint: "",
      draft,
    };
    await expect(
      adminSaveV2EpisodeDraft.run({ data } as never),
    ).rejects.toThrow("Admin only");
    await expect(
      adminSaveV2EpisodeDraft.run({
        data,
        auth: {
          uid: "support-user",
          token: { admin: true, adminRole: "support" },
        },
      } as never),
    ).rejects.toThrow("Role cannot edit V2 drafts");
  });
});

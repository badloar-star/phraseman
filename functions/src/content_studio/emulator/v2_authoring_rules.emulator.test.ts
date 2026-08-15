import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setLogLevel,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");

const SERVER_ONLY_CONTENT_ROOTS = [
  "content_mode_templates",
  "content_mode_template_draft_revisions",
  "content_mode_template_versions",
  "content_mode_template_lifecycle",
  "content_mode_template_lifecycle_audit",
  "content_mode_template_lifecycle_operations",
  "content_season_drafts",
  "content_season_revisions",
  "content_season_lifecycle",
  "content_season_episode_pins",
  "content_season_lifecycle_operations",
  "content_season_pin_cleanup_audits",
  "content_episode_drafts",
  "content_episode_revisions",
  "content_episode_lifecycle",
  "content_episode_lifecycle_audit",
  "content_episode_lifecycle_operations",
  "content_studio_review_queue",
  "content_studio_localization_units",
  "content_studio_review_receipts",
  "content_studio_validation_receipts",
  "content_studio_localization_receipts",
  "content_studio_voice_receipts",
  "content_studio_gate_receipts",
  "content_studio_season_approval_receipts",
  "content_studio_episode_review_operations",
  "content_studio_episode_validation_operations",
  "content_studio_episode_localization_operations",
  "content_studio_episode_voice_operations",
  "content_studio_gate_operations",
  "content_studio_waivers",
  "content_studio_preview_sessions",
  "content_studio_preview_receipts",
  "content_app_support_manifests",
  "content_decision_registries",
  "content_factory_stages",
  "content_v2_owner_episode_confirmations",
  "content_v2_unified_course_release_heads",
  "content_v2_unified_course_release_roots",
  "content_v2_unified_course_release_heads_v3",
  "content_v2_unified_course_release_roots_v3",
  "content_language_profile_versions",
  "content_language_profile_lifecycle",
  "content_speech_profile_versions",
  "content_speech_profile_lifecycle",
  "content_voice_generation_profile_versions",
  "content_voice_generation_profile_lifecycle",
  "content_v2_repository_auth",
  "content_v2_stage_repository_commits",
  "content_v2_stage_candidate_pins",
  "content_v2_required_session_sets",
  "content_v2_required_session_answer_manifests",
  "content_v2_season_release_pointers",
  "content_v2_season_release_manifests",
  "content_v2_activity_auxiliary_release_pointers",
  "content_v2_activity_learner_core_release_pointers",
] as const;

setLogLevel("silent");

describe("Learning V2 Content Studio server-only roots (emulator)", () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, "utf8") },
    });
  });

  afterAll(async () => environment.cleanup());
  beforeEach(async () => environment.clearFirestore());

  it.each(SERVER_ONLY_CONTENT_ROOTS)(
    "%s denies browser-admin get/list/create/update/delete",
    async (root) => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), root, "existing"), {
          status: "published",
          value: 1,
        });
      });

      const db = environment
        .authenticatedContext("browser-admin", { admin: true })
        .firestore();
      await assertFails(getDoc(doc(db, root, "existing")));
      await assertFails(getDocs(collection(db, root)));
      await assertFails(
        setDoc(doc(db, root, "forged"), { status: "published" }),
      );
      await assertFails(updateDoc(doc(db, root, "existing"), { value: 2 }));
      await assertFails(deleteDoc(doc(db, root, "existing")));
    },
  );
});

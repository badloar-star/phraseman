import { readFileSync } from "node:fs";
import path from "node:path";

const rules = readFileSync(path.join(process.cwd(), "firestore.rules"), "utf8");

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
] as const;

describe("Learning V2 Content Studio Firestore isolation", () => {
  const catchAll = rules.match(
    /match \/\{collection\}\/\{document=\*\*\} \{([\s\S]*?)\n    \}/,
  )?.[1];

  test("the browser-admin catch-all invokes the server-owned namespace guard", () => {
    expect(catchAll).toBeTruthy();
    expect(catchAll).toContain("!isServerOwnedContentStudioRoot(collection)");
    expect(rules).toContain(
      "function isServerOwnedContentStudioRoot(collection)",
    );
  });

  test.each(SERVER_ONLY_CONTENT_ROOTS)(
    "%s has an exact deny-only root",
    (root) => {
      const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const block = rules.match(
        new RegExp(`match /${escaped}/\\{docId\\} \\{([\\s\\S]*?)\\n    \\}`),
      )?.[1];
      expect(block).toBeTruthy();
      expect(block).toContain("allow read, write: if false;");
      expect(block).not.toMatch(/isAdmin\(\)|request\.auth/);
    },
  );
});

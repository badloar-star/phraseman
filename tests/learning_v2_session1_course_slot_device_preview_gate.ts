// Обычная карта курса всегда запускает learner run с наградами и feedback.
// Авторский preview доступен только через отдельный DEV-экран и не имеет права
// заражать session 1 на реальной карте параметром previewMode.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const findings: string[] = [];

for (const path of ["app/(tabs)/lessons.tsx", "app/learning-v2/lesson/[id].tsx"]) {
  const source = read(path);
  if (source.includes('previewMode: "authoring_v1"')) {
    findings.push(`normal_course_route_forces_authoring_preview:${path}`);
  }
  if (!source.includes('previewOrigin: "course"')) {
    findings.push(`session1_course_return_not_wired:${path}`);
  }
}

const legacyMap = read("app/learning-v2/lesson/[id].tsx");
for (const required of [
  "preparedCourseSessionsRef",
  "prepareCourseSession",
  "LEARNING_V2_SESSION_MODAL_EXIT_MS",
  "Promise.all([prepared.promise, modalExit])",
  "preparedCourseSessionsRef.current.delete(prepared.key)",
  "stageLearningV2CourseSessionReadyHandoffV3",
]) {
  if (!legacyMap.includes(required)) {
    findings.push(`legacy_course_route_does_not_reuse_prewarmed_handle:${required}`);
  }
}

const explicitPreview = read("app/_learning_v2_authoring_preview.tsx");
if (!explicitPreview.includes('previewMode: "authoring_v1"')) {
  findings.push("explicit_authoring_preview_route_missing");
}

const player = read("app/learning_v2_direct_session_player_v1.tsx");
if (!player.includes('previewOrigin?: string | string[];')) {
  findings.push("direct_player_preview_origin_param_missing");
}
if (!player.includes('first(params.previewOrigin) === "course"')) {
  findings.push("direct_player_does_not_return_course_preview_to_course");
}

if (findings.length > 0) {
  throw new Error(
    [
      "LEARNING V2 SESSION 1 COURSE-SLOT REWARD + FEEDBACK GATE: HOLD",
      `total_findings=${findings.length}`,
      ...findings,
    ].join("\n"),
  );
}

process.stdout.write(
  "LEARNING V2 SESSION 1 COURSE-SLOT REWARD + FEEDBACK GATE: PASS\n",
);

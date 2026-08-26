// зачем: владелец должен проходить текущую сессию 1 на телефоне из её обычного
// места в карте курса, не разыскивая отдельный лабораторный экран.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const findings: string[] = [];

for (const path of ["app/(tabs)/lessons.tsx", "app/learning-v2/lesson/[id].tsx"]) {
  const source = read(path);
  if (!source.includes('previewMode: "authoring_v1"')) {
    findings.push(`session1_authoring_material_not_wired:${path}`);
  }
  if (!source.includes('previewOrigin: "course"')) {
    findings.push(`session1_course_return_not_wired:${path}`);
  }
  if (!source.includes("__DEV__")) {
    findings.push(`session1_authoring_material_not_dev_guarded:${path}`);
  }
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
      "LEARNING V2 SESSION 1 COURSE-SLOT DEVICE PREVIEW GATE: HOLD",
      `total_findings=${findings.length}`,
      ...findings,
    ].join("\n"),
  );
}

process.stdout.write(
  "LEARNING V2 SESSION 1 COURSE-SLOT DEVICE PREVIEW GATE: PASS\n",
);

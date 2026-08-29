import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildLearningV2StaticOwnerReviewBundleV1 } from "../modules/learning-v2/preview/static_owner_review_bundle_v1";
import { renderLearningV2StaticOwnerReviewHtmlV1 } from "./learning-v2-static-owner-review/template_v1";

async function main(): Promise<void> {
  const outputDirectory = resolve(
    process.cwd(),
    ".codex-tmp",
    "learning-v2-owner-review",
  );
  const outputPath = resolve(outputDirectory, "index.html");
  const bundle = buildLearningV2StaticOwnerReviewBundleV1();

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    outputPath,
    renderLearningV2StaticOwnerReviewHtmlV1(bundle),
    "utf8",
  );

  process.stdout.write(
    `LEARNING V2 OWNER REVIEW HTML: BUILT sessions=${bundle.sessions
      .map((session) => session.sessionOrdinal)
      .join(",")} path=${outputPath}\n`,
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `LEARNING V2 OWNER REVIEW HTML: FAILED ${
      error instanceof Error ? error.message : String(error)
    }\n`,
  );
  process.exitCode = 1;
});

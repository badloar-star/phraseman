import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateLearningV2ModeNativePayloadV1 } from "../modules/learning-v2/contracts/mode_native_payload_v1";
import { applyPracticeExplanationsV1 } from "../content/learning-v2-course/pipeline/practice_explanations_v1.mjs";

type Interaction = {
  readonly interactionId: string;
  readonly family: Parameters<typeof validateLearningV2ModeNativePayloadV1>[1];
  readonly modePayload: Record<string, unknown>;
};

type AtomicSource = {
  readonly courseSessionId: string;
  readonly interactionsByLocale: Readonly<Record<"ru" | "uk", readonly Interaction[]>>;
  readonly answers: readonly { readonly interactionId: string }[];
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SESSION = path.resolve(HERE, "../content/learning-v2-course/sessions/en/l01/s01");
const findings: string[] = [];

function interactionIdsFromMarkdown(locale: "ru" | "uk"): readonly string[] {
  const markdown = fs.readFileSync(path.join(SESSION, `final.${locale}.md`), "utf8");
  const ids = Array.from(markdown.matchAll(/<!--\s*interaction_id:\s*([^;\s]+);/gu), (match) => match[1]!);
  const taskNumbers = Array.from(markdown.matchAll(/^\*\*(\d+)\s*·/gmu), (match) => Number(match[1]));
  if (ids.length !== taskNumbers.length) findings.push(`markdown_inventory_shape:${locale}:ids=${ids.length}:tasks=${taskNumbers.length}`);
  if (taskNumbers.some((number, index) => number !== index + 1)) findings.push(`markdown_task_numbers:${locale}:${taskNumbers.join(",")}`);
  return ids;
}

const atomic = JSON.parse(fs.readFileSync(path.join(SESSION, "practice.atomic.json"), "utf8")) as AtomicSource;
const sidecar = JSON.parse(fs.readFileSync(path.join(SESSION, "practice.explanations.v1.json"), "utf8"));
const projected = applyPracticeExplanationsV1({ atomicSource: atomic, sidecar }) as AtomicSource;
const authoritativeIds = interactionIdsFromMarkdown("ru");
const ukIds = interactionIdsFromMarkdown("uk");
if (JSON.stringify(ukIds) !== JSON.stringify(authoritativeIds)) findings.push("markdown_locale_inventory_mismatch");

for (const locale of ["ru", "uk"] as const) {
  const interactions = projected.interactionsByLocale[locale] ?? [];
  const ids = interactions.map((entry) => entry.interactionId);
  if (JSON.stringify(ids) !== JSON.stringify(authoritativeIds)) findings.push(`atomic_inventory_mismatch:${locale}`);
  for (const interaction of interactions) {
    try {
      validateLearningV2ModeNativePayloadV1(interaction.modePayload, interaction.family);
    } catch (error) {
      findings.push(`mode_payload:${locale}:${interaction.interactionId}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const answerIds = atomic.answers.map((entry) => entry.interactionId);
if (JSON.stringify(answerIds) !== JSON.stringify(authoritativeIds)) findings.push("answer_inventory_mismatch");
if (new Set(authoritativeIds).size !== authoritativeIds.length) findings.push("authoritative_inventory_duplicate_id");
if (authoritativeIds.some((id) => !id.startsWith(`${atomic.courseSessionId}:`))) findings.push("authoritative_inventory_wrong_session");

if (findings.length > 0) {
  throw new Error([
    "LESSON 1 SESSION 01 MODE-NATIVE GATE: HOLD",
    `total_findings=${findings.length}`,
    ...findings,
  ].join("\n"));
}

process.stdout.write(`LESSON 1 SESSION 01 MODE-NATIVE GATE: PASS (${authoritativeIds.length} authoritative tasks)\n`);

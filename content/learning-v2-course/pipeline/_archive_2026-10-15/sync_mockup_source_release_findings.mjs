import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sourceReleaseScopeIssues } from "./build_release.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";

const COURSE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// A reviewed projection must contain both learner locales and the matching
// explanations/answers. Missing files keep a card yellow. A release/source
// mismatch also stays visible: the card must not turn green merely because a
// separate reviewed projection exists.
function reviewedProjectionIssue(root, key) {
  const directory = path.join(root, "mockup", "reviewed-source", ...String(key).split("/"));
  const required = ["intro.json", "learner.json", "learner.uk.json", "answers.json"];
  const missing = required.filter((name) => !fs.existsSync(path.join(directory, name)));
  return missing.length ? missing : null;
}

function embeddedJson(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = html.match(new RegExp(`<script id="${escapedId}" type="application/json">([\\s\\S]*?)<\\/script>`));
  return match ? JSON.parse(match[1]) : null;
}

function replaceEmbeddedJson(html, id, value) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`(<script id="${escapedId}" type="application/json">)([\\s\\S]*?)(<\\/script>)`);
  if (!pattern.test(html)) return null;
  return html.replace(pattern, `$1${JSON.stringify(value)}$3`);
}

function sessionFromIssue(issue) {
  return /^source_release_parity:([a-z]{2}\/l\d{2}\/s\d{2}):/u.exec(issue)?.[1] ?? null;
}

function firstIssueText(issue) {
  const missing = /:file_missing:([^:]+)$/u.exec(issue);
  if (missing) return `В открывающемся варианте отсутствует ${missing[1]}.`;
  const intro = /:intro:(ru|uk):page=(\d+):([^:]+):/u.exec(issue);
  if (intro) return `Во вводной карточке ${intro[2]} (${intro[1]}) не совпадает ${intro[3]}.`;
  const practice = /:practice:(ru|uk):(en:lesson-\d{2}:session-\d{2}:[\w:]+):([^:]+):/u.exec(issue);
  if (practice) return `В задании ${practice[2].split(":").at(-1)} (${practice[1]}) не совпадает ${practice[3]}.`;
  const answer = /:answers:([^:]+):([^:]+):/u.exec(issue);
  if (answer) return `У задания ${answer[1].split(":").at(-1)} не совпадает проверяемый ответ.`;
  return "Текст карточки и то, что открывается ученику, не совпадают.";
}

export function sourceReleaseFindings({ root = COURSE_ROOT, sessionKeys, releaseRoot = path.join(root, "release") }) {
  const issues = sourceReleaseScopeIssues({ root, scope: "all", locales: ["ru", "uk"], releaseRoot });
  const grouped = new Map();
  for (const issue of issues) {
    const key = sessionFromIssue(issue);
    if (!key || !sessionKeys.has(key)) continue;
    const items = grouped.get(key) ?? [];
    items.push(issue);
    grouped.set(key, items);
  }
  const out = Object.fromEntries([...grouped.entries()].map(([key, findings]) => [key, [
    `${firstIssueText(findings[0])} Всего расхождений в этой карточке: ${findings.length}.`,
    `Исправлю все ${findings.length} расхождений этой карточки, затем заново сверю текст, тип задания, ответ, варианты, аудио и объяснение в обеих версиях.`,
  ]]));
  // A partial reviewed directory can otherwise look green merely because the
  // native release happens to match.  The learner must never open a card whose
  // selected language is silently falling back to another language.
  for (const key of sessionKeys) {
    const missing = reviewedProjectionIssue(root, key);
    if (!missing || !fs.existsSync(path.join(root, "mockup", "reviewed-source", ...String(key).split("/"), "learner.json"))) continue;
    out[key] ??= [
      `В проверенной версии отсутствует ${missing.join(", ")}.`,
      "Карточка останется жёлтой, пока не собраны все тексты и ответы для обеих версий.",
    ];
  }
  return out;
}

/** Refresh the owner mockup's card-specific before/after text from current facts. */
export async function syncMockupSourceReleaseFindings({ mockupPath, root = COURSE_ROOT }) {
  if (!fs.existsSync(mockupPath)) return { updated: false, reason: "mockup_missing" };
  const html = fs.readFileSync(mockupPath, "utf8");
  const cards = embeddedJson(html, "data");
  if (!Array.isArray(cards)) return { updated: false, reason: "cards_missing" };
  const findings = sourceReleaseFindings({ root, sessionKeys: new Set(cards.map((card) => String(card?.key ?? ""))) });
  const next = replaceEmbeddedJson(html, "source-release-findings", findings);
  if (next === null) return { updated: false, reason: "findings_missing" };
  const updated = await writeMockupFile(mockupPath, next);
  return { updated, findings: Object.keys(findings).length };
}

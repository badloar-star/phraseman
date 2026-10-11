import fs from "node:fs";
import path from "node:path";

import { sessionReadiness } from "./session_readiness.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";

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

/**
 * Refresh the per-card proof shown in the owner mockup from the exact same
 * readiness function that blocks a course card.  This deliberately preserves
 * the rest of the owner-facing artifact: only the evidence payload changes.
 */
export async function syncMockupReadiness({ mockupPath, sessionsRoot, locales = ["uk"] }) {
  if (!fs.existsSync(mockupPath)) return { updated: false, reason: "mockup_missing" };
  const html = fs.readFileSync(mockupPath, "utf8");
  const cards = embeddedJson(html, "data");
  if (!Array.isArray(cards)) return { updated: false, reason: "cards_missing" };

  const readiness = {};
  for (const card of cards) {
    const key = String(card?.key ?? "");
    const parts = key.split("/");
    if (parts.length !== 3 || !parts.every(Boolean)) {
      throw new Error(`mockup card has invalid key: ${key || "<empty>"}`);
    }
    const [language, lesson, session] = parts;
    const sessionRoot = path.join(sessionsRoot, language, lesson, session);
    const result = sessionReadiness(sessionRoot, locales);
    readiness[key] = {
      ready: result.ready,
      unresolvedQualityItems: result.issues.length,
      firstUnresolvedItem: result.issues[0] ?? null,
    };
  }

  const next = replaceEmbeddedJson(html, "session-readiness", readiness);
  if (next === null) return { updated: false, reason: "readiness_missing" };
  const updated = await writeMockupFile(mockupPath, next);
  return { updated, cards: cards.length };
}

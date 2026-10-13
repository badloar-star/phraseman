import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const originalRoot = ".tmp/de-task6c-l01-direct-capture";
const amendmentRoot = ".tmp/de-task6c-l01-source-anchor-amendment";
const catalogPath = ".tmp/de-task6a-exact-transport/task6a3-l01/lexical_item_evidence_de_v1.candidate.json";
const plans = [
  ["de_lex_plan_l01_c02_aufzug_v1", "https://www.dwds.de/wb/Aufzug", "raw/de_lex_plan_l01_c02_aufzug_v1.html"],
  ["de_lex_plan_l01_c03_briefkasten_v1", "https://www.dwds.de/wb/Briefkasten", "raw/de_lex_plan_l01_c03_briefkasten_v1.html"],
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const span = (raw, anchor) => {
  const marker = `<div class="dwdswb-lesart" id="${anchor}">`;
  const start = raw.indexOf(marker);
  if (start < 0) throw new Error(`missing marker ${anchor}`);
  const divTag = /<\/?div\b[^>]*>/gi;
  divTag.lastIndex = start;
  let depth = 0;
  for (let match = divTag.exec(raw); match !== null; match = divTag.exec(raw)) {
    if (match.index < start) continue;
    if (match[0][1] === "/") depth -= 1;
    else depth += 1;
    if (depth === 0) return raw.slice(start, divTag.lastIndex);
  }
  throw new Error(`unbalanced div ${anchor}`);
};
const claim = (raw, anchor) => {
  const exactRawHtml = span(raw, anchor);
  return { sourceAnchor: anchor, exactRawHtml, exactRawHtmlSha256: sha256(exactRawHtml), exactRawHtmlUtf8Bytes: Buffer.byteLength(exactRawHtml, "utf8") };
};
const rows = plans.map(([sourcePlanId, canonicalUrl, rawPath]) => {
  const raw = fs.readFileSync(path.join(originalRoot, rawPath));
  const html = raw.toString("utf8");
  return { sourcePlanId, canonicalUrl, rawResponse: { path: rawPath, sha256: sha256(raw), bytes: raw.length }, originalRejected: claim(html, "d-1-1"), amendment: claim(html, "d-1-2") };
});
fs.mkdirSync(amendmentRoot, { recursive: true });
const registry = {
  schemaVersion: "learning-v2-de-task6c-l01-source-anchor-amendment.v1",
  status: "PROPOSED_NOT_CANONICAL",
  task7Unlock: false,
  canonicalAdmission: "FORBIDDEN",
  originalCapture: { root: originalRoot, registrySha256: sha256(fs.readFileSync(path.join(originalRoot, "registry.json"))) },
  sourceCatalog: { path: catalogPath, sha256: sha256(fs.readFileSync(catalogPath)) },
  rows,
};
fs.writeFileSync(path.join(amendmentRoot, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`, "utf8");
process.stdout.write(`TASK6C_L01_ANCHOR_AMENDMENT rows=${rows.length} status=HOLD\n`);

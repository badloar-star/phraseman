import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { sessionReadiness } from "./session_readiness.mjs";
import { sourceReleaseFindings } from "./sync_mockup_source_release_findings.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, "../../../..");
const SESSIONS_ROOT = path.join(PROJECT_ROOT, "content", "learning-v2-course", "sessions", "en");
const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-mockup-readiness-"));
const MOCKUP = path.join(TEMP_ROOT, "index.html");

test.before(() => {
  const build = spawnSync(process.execPath, [
    path.join(PROJECT_ROOT, "content", "learning-v2-course", "pipeline", "build_mockup.mjs"),
    "--out",
    MOCKUP,
  ], { cwd: PROJECT_ROOT, encoding: "utf8" });
  assert.ok(
    build.status === 0 || (build.status === 1 && /factory_intro_practice_mockup_hold/u.test(`${build.stdout}\n${build.stderr}`)),
    `isolated mockup build failed unexpectedly (status=${build.status}):\n${build.stdout}\n${build.stderr}`,
  );
  assert.ok(fs.existsSync(MOCKUP), "isolated build must produce the mockup before evidence assertions");
});

test.after(() => fs.rmSync(TEMP_ROOT, { recursive: true, force: true }));

function embeddedJson(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = html.match(new RegExp(`<script id="${escapedId}" type="application/json">([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `missing embedded JSON script #${id}`);
  return JSON.parse(match[1]);
}

function expectedReadinessBySession() {
  const expected = {};
  for (const lesson of fs.readdirSync(SESSIONS_ROOT).sort()) {
    const lessonRoot = path.join(SESSIONS_ROOT, lesson);
    if (!fs.statSync(lessonRoot).isDirectory()) continue;
    for (const session of fs.readdirSync(lessonRoot).sort()) {
      const sessionRoot = path.join(lessonRoot, session);
      if (!fs.statSync(sessionRoot).isDirectory()) continue;
      const readiness = sessionReadiness(sessionRoot, ["uk"]);
      expected[`en/${lesson}/${session}`] = {
        ready: readiness.ready,
        unresolvedQualityItems: readiness.issues.length,
        firstUnresolvedItem: readiness.issues[0] ?? null,
      };
    }
  }
  return expected;
}

test("every mockup card embeds its current per-card readiness evidence", () => {
  const html = fs.readFileSync(MOCKUP, "utf8");
  const cards = embeddedJson(html, "data");
  const embedded = embeddedJson(html, "session-readiness");
  const expected = expectedReadinessBySession();

  assert.deepEqual(Object.keys(embedded).sort(), cards.map(({ key }) => key).sort(), "readiness must cover every rendered card exactly once");
  assert.deepEqual(embedded, expected, "each card must carry the current sessionReadiness count and concrete first unresolved item");
  assert.equal(Object.values(embedded).filter(({ ready }) => ready).length, 0, "no card may be shown as fixed before fresh proof exists");
  assert.match(html, /пока не собрано подтверждение качества/iu, "each comparison must explain unresolved evidence in ordinary Russian");
  assert.match(html, /freshCardEvidenceText/u, "after-state must promise fresh card-specific evidence");
});

test("every displayed text-versus-opened-card finding is regenerated from current parity facts", () => {
  const html = fs.readFileSync(MOCKUP, "utf8");
  const cards = embeddedJson(html, "data");
  const embedded = embeddedJson(html, "source-release-findings");
  const expected = sourceReleaseFindings({ sessionKeys: new Set(cards.map(({ key }) => key)) });

  assert.deepEqual(embedded, expected, "the yellow card explanation must describe current per-card facts, not a saved shortlist");
  for (const [session, [before, after]] of Object.entries(embedded)) {
    assert.ok(cards.some(({ key }) => key === session), `${session} must be a displayed card`);
    assert.match(before, /расхождени/iu, `${session} needs a concrete before-state`);
    assert.match(after, /Исправлю/u, `${session} needs a concrete after-state`);
  }
});

test("visible comparison copy never exposes authoring or verification jargon", () => {
  const html = fs.readFileSync(MOCKUP, "utf8");
  const renderedCopy = html.slice(html.indexOf("const sourceReleaseSpecific ="));

  assert.doesNotMatch(html, /собранного релиза/iu, "the learner-facing header must not expose release jargon");
  for (const forbidden of ["исходник", "выпуск", "сессия", "гейт", "судья", "хеш", "реестр", "локал"] ) {
    assert.doesNotMatch(renderedCopy, new RegExp(forbidden, "iu"), `visible comparison copy must not expose ${forbidden}`);
  }
});

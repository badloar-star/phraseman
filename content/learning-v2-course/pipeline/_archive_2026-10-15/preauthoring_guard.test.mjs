import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as preauthoringGuard from "./preauthoring_guard.mjs";
import {
  PREAUTHORING_REQUIREMENT_IDS,
  PREAUTHORING_REQUIREMENT_SOURCES,
  preauthoringAuthorityConflictIssues,
  preauthoringDocumentManifest,
  preauthoringReceiptIssues,
  priorLearnerFacingManifest,
} from "./preauthoring_guard.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const bindingSchemaVersion = "learning_v2_preauthoring_guardian_v2";
const currentAuthority = "current_authority";
const supplementalRuntime = "supplemental_runtime";
const historicalContext = "historical_context";
const roleForDocument = (name) => {
  if (name === "repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md") return historicalContext;
  if (name.startsWith("repo/docs/v2/") || name === "factory/IMPROVEMENT_LOG.md") return supplementalRuntime;
  return currentAuthority;
};

const expected = {
  session: "en/l03/s44",
  curriculumRow: "Урок 3, сессия 44 · тип: голос/слух · грамматика: услышать новое или известное · новые слова: customer, seller, assistant · момент сцены: у кассы",
  previousSession: "en/l03/s43",
  expectedNewWords: ["customer", "seller", "assistant"],
  priorRangeReady: true,
  priorRangeIssues: [],
  preflightRunId: "preflight:00000000-0000-4000-8000-000000000044",
  preflightIssuedAt: new Date().toISOString(),
  hostEpoch: "host-epoch:00000000-0000-4000-8000-000000000044",
};

const fileForKey = (name) => name.startsWith("DesktopCodex/")
  ? `C:/Users/badlo/OneDrive/Desktop/Codex/${name.slice("DesktopCodex/".length)}`
  : name.startsWith("factory/")
    ? new URL(`../${name.slice("factory/".length)}`, import.meta.url)
    : new URL(`../../../${name.slice("repo/".length)}`, import.meta.url);

const evidenceFor = (manifest) => Object.fromEntries(Object.entries(manifest).map(([name, sha256]) => {
  const bytes = fs.readFileSync(fileForKey(name), "utf8");
  return [name, {
    sha256,
    role: roleForDocument(name),
    quote: bytes.trimStart().slice(0, 80),
    applied: `Применено актуальное правило из документа ${name}`,
  }];
}));

const quoteForRule = (rule, id) => {
  const bytes = fs.readFileSync(fileForKey(rule.source), "utf8");
  if (id === "exact_curriculum_row") return bytes.split(/\r?\n/).find((line) => line.startsWith("| 44 |") && line.includes("customer"));
  const index = bytes.indexOf(rule.needle);
  return bytes.slice(Math.max(0, index - 20), index + rule.needle.length + 40);
};

const valid = () => {
  const documentHashes = preauthoringDocumentManifest();
  const documentReview = evidenceFor(documentHashes);
  return {
    bindingSchemaVersion,
    verdict: "PASS",
    preflightRunId: expected.preflightRunId,
    preflightIssuedAt: expected.preflightIssuedAt,
    hostEpoch: expected.hostEpoch,
    issuedAt: new Date(Date.parse(expected.preflightIssuedAt) + 1_000).toISOString(),
    guardian: "independent-preauthoring-guardian",
    authorMustNotSelfIssue: true,
    session: expected.session,
    curriculumRow: expected.curriculumRow,
    priorLearnerFacingScan: {
      through: expected.previousSession,
      evidence: "Выполнен полный поиск по всем learner-facing полям предыдущих сессий.",
      conflicts: [],
      hashes: priorLearnerFacingManifest(expected.previousSession),
    },
    newWords: ["customer", "seller", "assistant"],
    retrievalWords: ["magazine"],
    cambridgeEvidence: "Cambridge подтверждает применимую операцию и её точную грамматическую границу.",
    scene: "Разговор покупателя и продавца у кассы после выбора товаров.",
    introTargets: [1, 2, 3].map((intro) => ({ intro, target: `точная цель ${intro}`, practiceLink: `связана с заданием практики ${intro}` })),
    independentFinal: { target: "самостоятельный финал", independence: "Ответ не показан, все опоры сняты перед выполнением." },
    requirementsChecklist: PREAUTHORING_REQUIREMENT_IDS.map((id) => ({
      id,
      status: "PASS",
      evidence: `Требование ${id} отдельно сверено с планом и learner-facing материалом.`,
      source: PREAUTHORING_REQUIREMENT_SOURCES[id].source,
      sourceQuote: quoteForRule(PREAUTHORING_REQUIREMENT_SOURCES[id], id),
    })),
    documentHashes,
    documentRoles: Object.fromEntries(Object.keys(documentHashes).map((name) => [name, roleForDocument(name)])),
    documentReview,
    mustFix: [],
  };
};

test("only the exact v2 binding schema can authorize authoring", () => {
  for (const value of [undefined, "learning_v2_preauthoring_guardian_v1", "learning_v2_preauthoring_guardian_v3"]) {
    const receipt = valid();
    receipt.bindingSchemaVersion = value;
    assert.match(preauthoringReceiptIssues(receipt, expected).join("\n"), /bindingSchemaVersion.*v2/u);
  }
});

test("the manifest and checklist bind the shared improvement log", () => {
  const receipt = valid();
  assert.ok(receipt.documentHashes["factory/IMPROVEMENT_LOG.md"]);
  const checklistItem = receipt.requirementsChecklist.find((item) => item.id === "improvement_log_read");
  assert.equal(checklistItem?.source, "factory/IMPROVEMENT_LOG.md");
  assert.match(checklistItem?.sourceQuote ?? "", /Before work on a bounded lesson or batch, read this file/u);
});

test("document roles are code-bound and legacy blueprint review stays historical", () => {
  const receipt = valid();
  assert.equal(receipt.documentRoles["factory/КОНСТИТУЦИЯ.md"], currentAuthority);
  assert.equal(receipt.documentRoles["repo/docs/v2/СТАРТ В2.md"], supplementalRuntime);
  assert.equal(receipt.documentRoles["repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md"], historicalContext);

  receipt.documentRoles["repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md"] = currentAuthority;
  receipt.documentReview["repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md"].role = currentAuthority;
  assert.match(preauthoringReceiptIssues(receipt, expected).join("\n"), /роль документа не совпадает.*historical_context/u);
});

test("receipt is bound to the current preflight id and exact timestamp", () => {
  for (const mutate of [
    (receipt) => { delete receipt.preflightRunId; },
    (receipt) => { receipt.preflightRunId = "preflight:00000000-0000-4000-8000-000000000099"; },
    (receipt) => { delete receipt.preflightIssuedAt; },
    (receipt) => { receipt.preflightIssuedAt = new Date(Date.parse(expected.preflightIssuedAt) - 60_000).toISOString(); },
  ]) {
    const receipt = valid();
    mutate(receipt);
    assert.match(preauthoringReceiptIssues(receipt, expected).join("\n"), /текущ(?:ему|ей) preflight/u);
  }
});

test("receipt is bound to the trusted host lifecycle epoch", () => {
  for (const value of [undefined, "host-epoch:00000000-0000-4000-8000-000000000099"]) {
    const receipt = valid();
    receipt.hostEpoch = value;
    assert.match(preauthoringReceiptIssues(receipt, expected).join("\n"), /host lifecycle epoch/u);
  }
});

test("only the dedicated coordinator epoch is trusted; Codex thread and session ids are ignored", () => {
  const absent = preauthoringGuard.trustedPreauthoringHostEpoch({
    CODEX_THREAD_ID: "thread-stable-across-compaction",
    CODEX_SESSION_ID: "session-not-a-documented-lifecycle-epoch",
  });
  assert.equal(absent.ready, false);
  assert.match(absent.issues.join("\n"), /trusted host lifecycle epoch/u);

  const present = preauthoringGuard.trustedPreauthoringHostEpoch({
    PHRASEMAN_PREAUTHORING_HOST_EPOCH: expected.hostEpoch,
    CODEX_THREAD_ID: "must-not-win",
    CODEX_SESSION_ID: "must-not-win",
  });
  assert.deepEqual(present, { ready: true, hostEpoch: expected.hostEpoch, issues: [] });
});

test("receipt issued before its preflight remains HOLD", () => {
  const receipt = valid();
  receipt.issuedAt = new Date(Date.parse(expected.preflightIssuedAt) - 1_000).toISOString();
  assert.match(preauthoringReceiptIssues(receipt, expected).join("\n"), /вердикт выпущен раньше текущего preflight/u);
});

test("a preflight timestamp older than the bound documents remains HOLD", () => {
  const stale = "2000-01-01T00:00:00.000Z";
  const receipt = valid();
  receipt.preflightIssuedAt = stale;
  receipt.issuedAt = "2000-01-01T00:00:01.000Z";
  const issues = preauthoringReceiptIssues(receipt, { ...expected, preflightIssuedAt: stale }).join("\n");
  assert.match(issues, /preflight старше одного из обязательных документов/u);
});

test("a freshly rotated preflight id invalidates the previous receipt", () => {
  const receipt = valid();
  const nextRun = {
    ...expected,
    preflightRunId: "preflight:00000000-0000-4000-8000-000000000045",
    preflightIssuedAt: new Date(Date.parse(expected.preflightIssuedAt) + 2_000).toISOString(),
  };
  assert.match(preauthoringReceiptIssues(receipt, nextRun).join("\n"), /текущ(?:ему|ей) preflight/u);
});

test("latest preflight binding is persisted per session and rotates atomically", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-preflight-state-"));
  const first = {
    session: "en/l01/s01",
    preflightRunId: "preflight:00000000-0000-4000-8000-000000000001",
    preflightIssuedAt: "2026-10-14T09:00:00.000Z",
    hostEpoch: "host-epoch:00000000-0000-4000-8000-000000000001",
  };
  const second = {
    session: "en/l01/s01",
    preflightRunId: "preflight:00000000-0000-4000-8000-000000000002",
    preflightIssuedAt: "2026-10-14T09:01:00.000Z",
    hostEpoch: first.hostEpoch,
  };
  try {
    preauthoringGuard.persistPreauthoringRunBinding(dir, first);
    assert.deepEqual(preauthoringGuard.readPreauthoringRunBinding(dir, first.session, first.hostEpoch), {
      ready: true,
      binding: first,
      issues: [],
    });

    preauthoringGuard.persistPreauthoringRunBinding(dir, second);
    assert.deepEqual(preauthoringGuard.readPreauthoringRunBinding(dir, second.session, second.hostEpoch), {
      ready: true,
      binding: second,
      issues: [],
    });
    assert.equal(fs.existsSync(path.join(dir, ".preauthoring-preflight.json")), true);
  } finally {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith("learning-v2-preflight-state-"));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("persisted preflight state is rejected without the current trusted host epoch or after an epoch change", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-preflight-state-"));
  const binding = {
    session: "en/l01/s01",
    preflightRunId: "preflight:00000000-0000-4000-8000-000000000001",
    preflightIssuedAt: "2026-10-14T09:00:00.000Z",
    hostEpoch: "host-epoch:00000000-0000-4000-8000-000000000001",
  };
  try {
    preauthoringGuard.persistPreauthoringRunBinding(dir, binding);
    for (const hostEpoch of [undefined, "host-epoch:00000000-0000-4000-8000-000000000002"]) {
      const result = preauthoringGuard.readPreauthoringRunBinding(dir, binding.session, hostEpoch);
      assert.equal(result.ready, false);
      assert.match(result.issues.join("\n"), /host lifecycle epoch/u);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("one per-session lock excludes a second writer even inside the same host epoch", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const lockRoot = fs.mkdtempSync(path.join(parent, "learning-v2-preauthoring-lock-root-"));
  let first = null;
  let third = null;
  try {
    first = preauthoringGuard.acquirePreauthoringSessionLock("en/l01/s01", { lockRoot });
    assert.throws(
      () => preauthoringGuard.acquirePreauthoringSessionLock("en/l01/s01", { lockRoot }),
      /lock.*held|уже удерживается/iu,
    );

    first.release();
    first = null;
    third = preauthoringGuard.acquirePreauthoringSessionLock("en/l01/s01", { lockRoot });
    assert.ok(third.path.startsWith(lockRoot));
  } finally {
    third?.release();
    first?.release();
    fs.rmSync(lockRoot, { recursive: true, force: true });
  }
});

test("a dead-owner lock is recovered before the next writer starts", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const lockRoot = fs.mkdtempSync(path.join(parent, "learning-v2-preauthoring-stale-lock-root-"));
  let abandoned = null;
  let recovered = null;
  try {
    abandoned = preauthoringGuard.acquirePreauthoringSessionLock("en/l01/s99", { lockRoot });
    const ownerPath = path.join(abandoned.path, "owner.json");
    const owner = JSON.parse(fs.readFileSync(ownerPath, "utf8"));
    fs.writeFileSync(ownerPath, `${JSON.stringify({ ...owner, pid: 2147483647 }, null, 2)}\n`, "utf8");
    recovered = preauthoringGuard.acquirePreauthoringSessionLock("en/l01/s99", { lockRoot });
    abandoned = null;
    assert.ok(fs.existsSync(path.join(recovered.path, "owner.json")));
  } finally {
    recovered?.release();
    abandoned?.release();
    fs.rmSync(lockRoot, { recursive: true, force: true });
  }
});

test("state rotation atomically replaces the live path without a live-to-backup gap", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-preflight-state-"));
  const first = {
    session: "en/l01/s01",
    preflightRunId: "preflight:00000000-0000-4000-8000-000000000001",
    preflightIssuedAt: "2026-10-14T09:00:00.000Z",
    hostEpoch: "host-epoch:00000000-0000-4000-8000-000000000001",
  };
  const second = {
    ...first,
    preflightRunId: "preflight:00000000-0000-4000-8000-000000000002",
    preflightIssuedAt: "2026-10-14T09:01:00.000Z",
  };
  const live = path.join(dir, ".preauthoring-preflight.json");
  const realRenameSync = fs.renameSync;
  const renames = [];
  try {
    preauthoringGuard.persistPreauthoringRunBinding(dir, first);
    fs.renameSync = (from, to) => {
      renames.push({ from, to, liveExisted: fs.existsSync(live) });
      return realRenameSync(from, to);
    };
    preauthoringGuard.persistPreauthoringRunBinding(dir, second);
  } finally {
    fs.renameSync = realRenameSync;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(renames.length, 1);
  assert.equal(renames[0].to, live);
  assert.equal(renames[0].liveExisted, true);
  assert.match(path.basename(renames[0].from), /\.tmp$/u);
});

test("preflight state reads reject symlinks and hardlinks", (t) => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-preflight-state-"));
  const external = path.join(dir, "external.json");
  const live = path.join(dir, ".preauthoring-preflight.json");
  const binding = {
    schemaVersion: "learning_v2_preauthoring_preflight_state_v1",
    session: "en/l01/s01",
    preflightRunId: "preflight:00000000-0000-4000-8000-000000000001",
    preflightIssuedAt: "2026-10-14T09:00:00.000Z",
    hostEpoch: "host-epoch:00000000-0000-4000-8000-000000000001",
  };
  try {
    fs.writeFileSync(external, JSON.stringify(binding), "utf8");
    fs.linkSync(external, live);
    let result = preauthoringGuard.readPreauthoringRunBinding(dir, binding.session, binding.hostEpoch);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /hardlink|single-link/u);

    fs.unlinkSync(live);
    try {
      fs.symlinkSync(external, live, "file");
    } catch (error) {
      if (error?.code === "EPERM") {
        t.diagnostic("file symlink creation is not permitted on this Windows host; hardlink branch remained enforced");
        return;
      }
      throw error;
    }
    result = preauthoringGuard.readPreauthoringRunBinding(dir, binding.session, binding.hostEpoch);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /symlink|regular file/u);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("missing malformed or cross-session persisted preflight binding remains HOLD", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-preflight-state-"));
  try {
    assert.equal(preauthoringGuard.readPreauthoringRunBinding(dir, "en/l01/s01", expected.hostEpoch).ready, false);
    assert.throws(() => preauthoringGuard.persistPreauthoringRunBinding(dir, {
      preflightRunId: "preflight:00000000-0000-4000-8000-000000000002",
      preflightIssuedAt: "2026-10-14T09:01:00.000Z",
      hostEpoch: expected.hostEpoch,
    }), /session/u);

    fs.writeFileSync(path.join(dir, ".preauthoring-preflight.json"), "{broken", "utf8");
    assert.equal(preauthoringGuard.readPreauthoringRunBinding(dir, "en/l01/s01", expected.hostEpoch).ready, false);

    fs.writeFileSync(path.join(dir, ".preauthoring-preflight.json"), JSON.stringify({
      schemaVersion: "learning_v2_preauthoring_preflight_state_v1",
      session: "en/l01/s02",
      preflightRunId: "preflight:00000000-0000-4000-8000-000000000002",
      preflightIssuedAt: "2026-10-14T09:01:00.000Z",
      hostEpoch: expected.hostEpoch,
    }), "utf8");
    const crossSession = preauthoringGuard.readPreauthoringRunBinding(dir, "en/l01/s01", expected.hostEpoch);
    assert.equal(crossSession.ready, false);
    assert.match(crossSession.issues.join("\n"), /другой сессии/u);
  } finally {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith("learning-v2-preflight-state-"));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("legacy guardian receipt no longer asserts prior release readiness", () => {
  assert.equal(PREAUTHORING_REQUIREMENT_SOURCES.previous_required_range_release_ready, undefined);
  assert.equal(PREAUTHORING_REQUIREMENT_IDS.includes("previous_required_range_release_ready"), false);
});

test("guardian prompt requires the exact v2 run binding and code-derived document roles", () => {
  const prompt = fs.readFileSync(path.join(here, "prompts/judge_preauthoring.md"), "utf8");
  assert.match(prompt, /bindingSchemaVersion[^\n]+learning_v2_preauthoring_guardian_v2/u);
  assert.match(prompt, /preflightRunId/u);
  assert.match(prompt, /preflightIssuedAt/u);
  assert.match(prompt, /documentRoles/u);
  assert.match(prompt, /current_authority/u);
  assert.match(prompt, /supplemental_runtime/u);
  assert.match(prompt, /historical_context/u);
  assert.match(prompt, /restart[^\n]+preflight/iu);
  assert.match(prompt, /сохран[её]нн(?:ое|ого)[^\n]+состояни/iu);
  assert.match(prompt, /аргумент[^\n]+не является источником/iu);
});

test("legacy blueprint claims stay in the read manifest without overriding current factory authority", () => {
  const receipt = valid();
  const manifest = receipt.documentHashes;
  assert.ok(manifest["repo/docs/v2/СТАРТ В2.md"]);
  assert.ok(manifest["repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md"]);
  assert.ok(manifest["factory/judgements/owner/2026-10-14_english_blueprint_d956_approval.md"]);
  assert.ok(receipt.documentReview["repo/docs/v2/СТАРТ В2.md"]);
  assert.ok(receipt.documentReview["repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md"]);
  assert.ok(receipt.documentReview["factory/judgements/owner/2026-10-14_english_blueprint_d956_approval.md"]);
  assert.ok(manifest["factory/КОНСТИТУЦИЯ.md"]);
  assert.ok(manifest["factory/curriculum/en/ПЛАН_КУРСА.md"]);
  assert.ok(manifest["factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md"]);

  const issues = preauthoringReceiptIssues(valid(), expected).join("\n");
  assert.equal(issues, "");
});

test("requirements copied into the direct progression ruling cite that ruling, not the legacy route", () => {
  const directRuling = "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md";
  for (const id of [
    "one_to_five_truly_new_words",
    "new_concrete_situation",
    "honest_grammar_delta_or_review_delta",
    "three_intro_practice_final_chains",
  ]) {
    assert.equal(PREAUTHORING_REQUIREMENT_SOURCES[id].source, directRuling, id);
  }
});

test("a changed active factory constitution keeps the receipt on HOLD", () => {
  const receipt = valid();
  receipt.documentHashes["factory/КОНСТИТУЦИЯ.md"] = "stale";
  const issues = preauthoringReceiptIssues(receipt, expected).join("\n");
  assert.match(issues, /документ не перечитан или изменился: factory\/КОНСТИТУЦИЯ\.md/u);
});

test("unambiguous mandatory blueprint authorities add no conflict issue", () => {
  const fingerprint = "a".repeat(64);
  const documents = [
    {
      name: "repo/docs/v2/СТАРТ В2.md",
      text: `## CURRENT AUTHORITY\n\n- Текущий canonical fingerprint:\n  \`${fingerprint}\`.\n- Статус: \`OWNER APPROVED\`.`,
    },
    {
      name: "repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md",
      text: `# Receipt\n\n**Статус:** \`OWNER APPROVED\`\n**Canonical fingerprint:**\n\`${fingerprint}\``,
    },
  ];

  assert.deepEqual(preauthoringAuthorityConflictIssues(documents), []);
});

test("conflicting fixture reports each concrete fingerprint and status", () => {
  const pendingFingerprint = "b".repeat(64);
  const approvedFingerprint = "c".repeat(64);
  const documents = [
    {
      name: "start.md",
      text: `- Текущий canonical fingerprint:\n  \`${pendingFingerprint}\`.\n- Статус: \`OWNER REVIEW REQUIRED\`.`,
    },
    {
      name: "receipt.md",
      text: `**Статус:** \`OWNER APPROVED\`\n**Canonical fingerprint:**\n\`${approvedFingerprint}\`\n\nНовый exact fingerprint выше имеет\n\`ownerApproval = PENDING\``,
    },
  ];

  const issues = preauthoringAuthorityConflictIssues(documents).join("\n");
  assert.match(issues, /start\.md/u);
  assert.match(issues, new RegExp(pendingFingerprint, "u"));
  assert.match(issues, /OWNER REVIEW REQUIRED/u);
  assert.match(issues, /receipt\.md/u);
  assert.match(issues, new RegExp(approvedFingerprint, "u"));
  assert.match(issues, /OWNER APPROVED/u);
  assert.match(issues, /PENDING/u);
});

test("stale conflicting historical claims cannot override aligned current START authorities and successor receipt", () => {
  const currentFingerprint = "d".repeat(64);
  const staleFingerprint = "e".repeat(64);
  const documents = [
    {
      name: "repo/docs/v2/СТАРТ В2.md",
      role: currentAuthority,
      text: `- Текущий canonical fingerprint:\n  \`${currentFingerprint}\`.\n- Статус: \`OWNER APPROVED\`.\n\n## HISTORICAL\n\n- Текущий canonical fingerprint:\n  \`${staleFingerprint}\`.\n- Статус: \`OWNER REVIEW REQUIRED\`.`,
    },
    {
      name: "repo/docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md",
      role: currentAuthority,
      text: `- Current canonical fingerprint:\n  \`${currentFingerprint}\`.\n- Status: \`OWNER APPROVED\`.`,
    },
    {
      name: "repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_APPROVAL_2026-10-14.md",
      role: currentAuthority,
      text: `**Статус:** \`OWNER APPROVED\`\n**Canonical fingerprint:**\n\`${currentFingerprint}\``,
    },
    {
      name: "repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md",
      role: historicalContext,
      text: `**Статус:** \`OWNER REVIEW REQUIRED\`\n**Canonical fingerprint:**\n\`${staleFingerprint}\``,
    },
  ];

  assert.deepEqual(preauthoringAuthorityConflictIssues(documents), []);
});

test("receipt becomes HOLD when any required instruction changes", () => {
  const receipt = valid();
  const first = Object.keys(receipt.documentHashes)[0];
  receipt.documentHashes[first] = "stale";
  assert.match(preauthoringReceiptIssues(receipt, expected).join("\n"), /документ не перечитан или изменился/);
});

test("receipt cannot be reused for another session or without a full scan", () => {
  const receipt = valid();
  receipt.session = "en/l03/s43";
  receipt.priorLearnerFacingScan.through = "en/l03/s42";
  receipt.priorLearnerFacingScan.hashes = {};
  const issues = preauthoringReceiptIssues(receipt, expected).join("\n");
  assert.match(issues, /другой сессии/);
  assert.match(issues, /learner-facing поиск/);
  assert.match(issues, /хэши предыдущего learner-facing диапазона/);
});

test("generic or duplicate checklist cannot imitate every requirement", () => {
  const receipt = valid();
  receipt.requirementsChecklist = [receipt.requirementsChecklist[0], receipt.requirementsChecklist[0]];
  const issues = preauthoringReceiptIssues(receipt, expected).join("\n");
  assert.match(issues, /дубликаты требований/);
  assert.match(issues, /пропущено требование exact_curriculum_row/);
});

test("a hash without a real quote and per-document evidence remains HOLD", () => {
  const receipt = valid();
  receipt.documentReview["DesktopCodex/НАЧНИ_ОТСЮДА.md"] = {
    sha256: receipt.documentHashes["DesktopCodex/НАЧНИ_ОТСЮДА.md"],
    quote: "x",
    applied: "x",
  };
  assert.match(preauthoringReceiptIssues(receipt, expected).join("\n"), /нет отдельного проверяемого доказательства чтения/);
});

test("author cannot forge PASS with malformed evidence, plan words, or future time", () => {
  const receipt = valid();
  receipt.guardian = "author";
  receipt.issuedAt = "2099-01-01T00:00:00.000Z";
  receipt.priorLearnerFacingScan.evidence = "x";
  receipt.priorLearnerFacingScan.conflicts = ["owner conflict exists"];
  receipt.newWords = ["foo"];
  receipt.retrievalWords = [null];
  delete receipt.introTargets;
  delete receipt.independentFinal;
  const issues = preauthoringReceiptIssues(receipt, expected).join("\n");
  assert.match(issues, /не независимым guardian/);
  assert.match(issues, /issuedAt находится в будущем/);
  assert.match(issues, /содержательного доказательства/);
  assert.match(issues, /содержит конфликт/);
  assert.match(issues, /newWords не совпадают/);
  assert.match(issues, /retrievalWords/);
  assert.match(issues, /intro→practice/);
  assert.match(issues, /independent final/);
});

test("legacy guardian receipt ignores retired prior release-readiness options", () => {
  const receipt = valid();
  const issues = preauthoringReceiptIssues(receipt, {
    ...expected,
    priorRangeReady: false,
    priorRangeIssues: ["en/l03/s43: stale receipts"],
  });
  assert.deepEqual(issues, []);
});

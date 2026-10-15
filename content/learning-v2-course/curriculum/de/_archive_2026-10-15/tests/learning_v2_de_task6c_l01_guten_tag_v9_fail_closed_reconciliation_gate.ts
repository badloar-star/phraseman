import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  PATHS,
  TRANSACTION_PATHS,
  validateGutenTagV9,
  type GateOverrides,
} from "../modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v9_fail_closed_reconciliation_de_v1";

const ROOT = path.resolve(process.cwd());
if (!fs.existsSync(path.join(ROOT, PATHS.module))) {
  console.error(`guten_tag_v9_missing:${PATHS.module}`);
  process.exit(1);
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "guten-tag-v9-"));
const load = (relative: string): any =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const save = (name: string, value: unknown): string => {
  const target = path.join(temp, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
};
const sha = (value: Buffer): string =>
  crypto.createHash("sha256").update(value).digest("hex");
const hostile = (
  key: keyof GateOverrides,
  relative: string,
  name: string,
  mutate: (value: any) => void,
): void => {
  const value = structuredClone(load(relative));
  mutate(value);
  reject(name, { [key]: save(`${name}.json`, value) });
};
const reject = (name: string, overrides: GateOverrides): void => {
  try {
    validateGutenTagV9(overrides);
  } catch {
    return;
  }
  throw new Error(`guten_tag_v9_hostile_accepted:${name}`);
};

try {
  validateGutenTagV9();
  reject("v7_task6_clone", { task6V9: path.join(ROOT, PATHS.task6V7) });
  reject("v8_task6_clone", { task6V9: path.join(ROOT, PATHS.task6V8) });
  reject("v7_inventory_clone", {
    inventoryV9: path.join(ROOT, PATHS.inventoryV7),
  });
  reject("v8_inventory_clone", {
    inventoryV9: path.join(ROOT, PATHS.inventoryV8),
  });

  const inventoryCases: [string, (v: any) => void][] = [
    [
      "stale_v6_digests",
      (v) => {
        v.inventoryDigests.resolvedPlanIdsCanonicalSha256 =
          "19c692747b3d2fb2c60312b3864df109d608320510b350a825aa7a0ff5f83a1e";
      },
    ],
    [
      "count_right_digest_wrong",
      (v) => {
        v.inventoryDigests.resolvedPlanIdsCanonicalSha256 = "0".repeat(64);
      },
    ],
    [
      "duplicate_resolution",
      (v) => {
        v.resolutions[10] = structuredClone(v.resolutions[9]);
      },
    ],
    [
      "missing_resolution",
      (v) => {
        v.resolutions.pop();
      },
    ],
    [
      "reordered_resolution",
      (v) => {
        [v.resolutions[0], v.resolutions[1]] = [
          v.resolutions[1],
          v.resolutions[0],
        ];
      },
    ],
    [
      "unknown_resolution",
      (v) => {
        v.resolutions[10].sourcePlanId = "de_lex_plan_unknown";
      },
    ],
    [
      "sorted_ids",
      (v) => {
        v.resolutions.sort((a: any, b: any) =>
          a.sourcePlanId.localeCompare(b.sourcePlanId),
        );
      },
    ],
    [
      "extra_top",
      (v) => {
        v.finalVerdict = "PASS";
      },
    ],
    [
      "missing_top",
      (v) => {
        delete v.sequence;
      },
    ],
    [
      "extra_nested",
      (v) => {
        v.authority.unexpected = true;
      },
    ],
    [
      "task7",
      (v) => {
        v.authority.task7Unlock = true;
      },
    ],
    [
      "preauthoring",
      (v) => {
        v.authority.preauthoringAuthority = true;
      },
    ],
    [
      "learner",
      (v) => {
        v.authority.learnerFacing = true;
      },
    ],
    [
      "release",
      (v) => {
        v.authority.releaseAuthorized = true;
      },
    ],
    [
      "phrase",
      (v) => {
        v.authority.phraseAuthority = true;
      },
    ],
    [
      "cutover",
      (v) => {
        v.authority.consumerCutover = "V9";
      },
    ],
  ];
  for (const [name, mutate] of inventoryCases)
    hostile("inventoryV9", PATHS.inventoryV9, name, mutate);

  const task6Cases: [string, (v: any) => void][] = [
    [
      "lexical_drift",
      (v) => {
        v.registry.lexicalSenses[10].register = "formal";
      },
    ],
    [
      "phrase_drift",
      (v) => {
        v.registry.phraseFrames.push({ id: "forbidden" });
      },
    ],
    [
      "pronunciation_drift",
      (v) => {
        v.registry.pronunciationTargets = [];
      },
    ],
    [
      "mapping_drift",
      (v) => {
        v.authorityContext.lexicalMappings[10].firstScoredUsePacketId =
          "de_l01_c04_s32";
      },
    ],
    [
      "default_consumer",
      (v) => {
        v.authority.defaultConsumerChanged = true;
      },
    ],
    [
      "final_verdict",
      (v) => {
        v.finalVerdict = "PASS";
      },
    ],
  ];
  for (const [name, mutate] of task6Cases)
    hostile("task6V9", PATHS.task6V9, name, mutate);

  const manifestCases: [string, (v: any) => void][] = [
    [
      "manifest_missing",
      (v) => {
        delete v.provenance;
      },
    ],
    [
      "manifest_extra",
      (v) => {
        v.finalVerdict = "PASS";
      },
    ],
    [
      "manifest_hash",
      (v) => {
        v.inputs[0].sha256 = "0".repeat(64);
      },
    ],
  ];
  for (const [name, mutate] of manifestCases)
    hostile("manifest", PATHS.manifest, name, mutate);

  const evidenceCases: [string, (v: any) => void][] = [
    [
      "evidence_missing",
      (v) => {
        delete v.provenance;
      },
    ],
    [
      "evidence_extra",
      (v) => {
        v.finalVerdict = "PASS";
      },
    ],
    [
      "log_nonexistent",
      (v) => {
        v.focusedRun.log.path = "missing.log";
      },
    ],
    [
      "log_absolute",
      (v) => {
        v.focusedRun.log.path = "C:/Temp/fake.log";
      },
    ],
    [
      "log_backslash",
      (v) => {
        v.focusedRun.log.path = "logs\\fake.log";
      },
    ],
    [
      "log_parent",
      (v) => {
        v.focusedRun.log.path = "../fake.log";
      },
    ],
    [
      "log_zero_hash",
      (v) => {
        v.focusedRun.log.sha256 = "0".repeat(64);
      },
    ],
    [
      "log_wrong_bytes",
      (v) => {
        v.focusedRun.log.bytes += 1;
      },
    ],
    [
      "diagnostics_999",
      (v) => {
        v.repositoryRun.diagnostics.total = 999;
      },
    ],
    [
      "fake_repo_green",
      (v) => {
        v.repositoryRun.exitCode = 0;
        v.repositoryRun.outcome = "PASS";
      },
    ],
    [
      "wrong_heap",
      (v) => {
        v.repositoryRun.env.NODE_OPTIONS = "--max-old-space-size=4096";
      },
    ],
    [
      "wrong_command",
      (v) => {
        v.repositoryRun.argv.push("--skipLibCheck");
      },
    ],
    [
      "transaction_paths",
      (v) => {
        v.transactionPaths = [...TRANSACTION_PATHS].reverse();
      },
    ],
  ];
  for (const [name, mutate] of evidenceCases)
    hostile("typescriptEvidence", PATHS.typescriptEvidence, name, mutate);

  const hostileLog = (
    name: string,
    raw: Buffer,
    facts?: { total: number; transaction: number; codes: number[] },
    reseal = true,
  ): void => {
    const value = structuredClone(load(PATHS.typescriptEvidence));
    if (reseal) {
      value.repositoryRun.log.sha256 = sha(raw);
      value.repositoryRun.log.bytes = raw.length;
    }
    if (facts !== undefined) value.repositoryRun.diagnostics = facts;
    const evidencePath = save(`${name}-evidence.json`, value);
    const logPath = path.join(temp, `${name}.log`);
    fs.writeFileSync(logPath, raw);
    reject(name, { typescriptEvidence: evidencePath, repositoryLog: logPath });
  };
  const repositoryLog = fs.readFileSync(path.join(ROOT, PATHS.repositoryLog));
  hostileLog(
    "one_byte_log_mutation",
    Buffer.concat([repositoryLog, Buffer.from("x")]),
    undefined,
    false,
  );
  hostileLog("nul_log", Buffer.from("\u0000", "utf8"), {
    total: 0,
    transaction: 0,
    codes: [],
  });
  hostileLog("ansi_log", Buffer.from("\u001b[31merror\u001b[0m\n", "utf8"), {
    total: 0,
    transaction: 0,
    codes: [],
  });
  hostileLog(
    "ambiguous_diagnostic",
    Buffer.from("fake error TS9999: ambiguous\n", "utf8"),
  );
  hostileLog(
    "v9_transaction_diagnostic",
    Buffer.from(`${PATHS.module}(1,1): error TS9999: injected\n`, "utf8"),
    { total: 1, transaction: 1, codes: [9999] },
  );

  const symlinkTarget = path.join(temp, "symlink-target.log");
  const symlinkPath = path.join(temp, "symlink.log");
  fs.writeFileSync(symlinkTarget, "", "utf8");
  try {
    fs.symlinkSync(symlinkTarget, symlinkPath, "file");
    reject("symlink_log_override", {
      repositoryLog: symlinkPath,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
  }

  const receipt = fs.readFileSync(path.join(ROOT, PATHS.receipt), "utf8");
  const receiptCases: [string, string][] = [
    ["human_pass", receipt.replace("PENDING_INDEPENDENT_REVIEW", "PASS")],
    ["second_block", `${receipt}\n\`\`\`json\n{}\n\`\`\`\n`],
    ["missing_block", receipt.replace(/```json[\s\S]*?```/u, "")],
    ["additive_prose", `${receipt}APPROVED\n`],
  ];
  for (const [name, body] of receiptCases) {
    const target = path.join(temp, `${name}.md`);
    fs.writeFileSync(target, body, "utf8");
    reject(name, { receipt: target });
  }
  console.log("guten_tag_v9_fail_closed_reconciliation_gate: PASS");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

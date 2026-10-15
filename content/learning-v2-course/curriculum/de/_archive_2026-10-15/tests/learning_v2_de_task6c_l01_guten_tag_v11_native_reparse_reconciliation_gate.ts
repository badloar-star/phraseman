import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  analyzeTypeScriptLog,
  CLOSED_AUTHORITY_V11,
  CONSTRUCTIVE_HASHES,
  type DiagnosticFsProvider,
  nativeDiagnosticFs,
  PATHS,
  readWindowsFileAttributesWithSpawnSync,
  readSafeWindowsAttributes,
  REJECTED_AUDIT_HASHES,
  ROOT,
  TRANSACTION_PATHS,
  WINDOWS_ATTRIBUTE_SCRIPT_ENCODED,
  type GateOverrides,
  receiptRecord,
  renderReceipt,
  renderTypeScriptEvidence,
  validateGutenTagV11,
  validateLexicalEvidenceRaw,
} from "../modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v11_native_reparse_reconciliation_de_v1";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "guten-tag-v11-"));
const ordinaryProvider: DiagnosticFsProvider = {
  ...nativeDiagnosticFs,
  readWindowsFileAttributesSync: (paths) => paths.map(() => 0),
};
const load = (relative: string): any =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const save = (name: string, value: unknown): string => {
  const target = path.join(temp, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
};
const sha = (value: Buffer): string =>
  crypto.createHash("sha256").update(value).digest("hex");
const reject = (
  name: string,
  overrides: GateOverrides = {},
  provider?: DiagnosticFsProvider,
): void => {
  try {
    validateGutenTagV11(overrides, provider ?? ordinaryProvider);
  } catch {
    return;
  }
  throw new Error(`guten_tag_v11_hostile_accepted:${name}`);
};
const rejectCall = (name: string, operation: () => unknown): void => {
  try {
    operation();
  } catch {
    return;
  }
  throw new Error(`guten_tag_v11_hostile_accepted:${name}`);
};
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

function rejectRepositoryLog(
  name: string,
  raw: Buffer,
  diagnostics: { total: number; transaction: number; codes: number[] },
  mutate?: (record: any) => void,
  provider?: DiagnosticFsProvider,
): void {
  const record = structuredClone(load(PATHS.typescriptEvidence));
  record.repositoryRun.log.sha256 = sha(raw);
  record.repositoryRun.log.bytes = raw.length;
  record.repositoryRun.diagnostics = diagnostics;
  mutate?.(record);
  const evidencePath = save(`${name}-evidence.json`, record);
  const logPath = path.join(temp, `${name}.log`);
  fs.writeFileSync(logPath, raw);
  reject(
    name,
    { typescriptEvidence: evidencePath, repositoryLog: logPath },
    provider,
  );
}

const MODULE_PATH = path.join(ROOT, PATHS.module);
const MODULE_STAT = nativeDiagnosticFs.statSync(MODULE_PATH) as any;
const makeBigStat = (
  source: any = MODULE_STAT,
  overrides: Partial<{
    dev: unknown;
    ino: unknown;
    size: unknown;
    mtimeNs: unknown;
    ctimeNs: unknown;
    symlink: boolean;
    file: boolean;
  }> = {},
): any => ({
  dev: "dev" in overrides ? overrides.dev : source.dev,
  ino: "ino" in overrides ? overrides.ino : source.ino,
  size: "size" in overrides ? overrides.size : source.size,
  mtimeNs: "mtimeNs" in overrides ? overrides.mtimeNs : source.mtimeNs,
  ctimeNs: "ctimeNs" in overrides ? overrides.ctimeNs : source.ctimeNs,
  isFile: () => overrides.file ?? true,
  isDirectory: () => !(overrides.file ?? true),
  isSymbolicLink: () => overrides.symlink ?? false,
});

const providerForFakeFile = (
  target: string,
  stat: any,
  realpath = target,
  attributes = 0,
): DiagnosticFsProvider => ({
  platform: nativeDiagnosticFs.platform,
  existsSync: (value) =>
    value === target || nativeDiagnosticFs.existsSync(value),
  lstatSync: (value) =>
    value === target ? stat : nativeDiagnosticFs.lstatSync(value),
  statSync: (value) =>
    value === target ? stat : nativeDiagnosticFs.statSync(value),
  realpathSync: (value) =>
    value === target ? realpath : nativeDiagnosticFs.realpathSync(value),
  readWindowsFileAttributesSync: (paths) =>
    paths.map((value) => (value === target ? attributes : 0)),
});

function fakeProvider(
  target: string,
  kind: "symlink" | "junction" | "reparse" | "short-alias",
): DiagnosticFsProvider {
  return providerForFakeFile(
    target,
    makeBigStat(MODULE_STAT, {
      symlink: kind === "symlink" || kind === "junction",
    }),
    kind === "short-alias"
      ? path.join(path.dirname(target), "__different_long_name__.ts")
      : target,
    kind === "reparse" ? 0x400 : 0,
  );
}

function decodeProbePayload(base64: string): string[] {
  const payload = Buffer.from(base64, "base64");
  const count = payload.readUInt32LE(0);
  const values: string[] = [];
  let offset = 4;
  for (let index = 0; index < count; index += 1) {
    const length = payload.readUInt32LE(offset);
    offset += 4;
    values.push(payload.subarray(offset, offset + length).toString("utf8"));
    offset += length;
  }
  if (offset !== payload.length)
    throw new Error("guten_tag_v11_probe_test_payload_trailing");
  return values;
}

function assertWindowsAttributeProbeContract(): void {
  const environment = {
    SystemRoot: "C:\\Windows",
    WINDIR: "C:\\ignored",
    TEMP: "C:\\Temp",
    TMP: "C:\\Tmp",
    PATH: "C:\\must-not-leak",
  };
  const injectionPath = "C:\\repo\\';[Environment]::Exit(0);#";
  let happyCalls = 0;
  const happyRunner = (executable: string, argv: string[], options: any) => {
    happyCalls += 1;
    if (
      executable !==
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
    )
      throw new Error("guten_tag_v11_probe_executable");
    if (
      JSON.stringify(argv) !==
      JSON.stringify([
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        WINDOWS_ATTRIBUTE_SCRIPT_ENCODED,
      ])
    )
      throw new Error("guten_tag_v11_probe_argv");
    if (
      options.cwd !== ROOT ||
      options.shell !== false ||
      options.windowsHide !== true ||
      options.timeout !== 5000 ||
      options.maxBuffer !== 65536 ||
      options.encoding !== null
    )
      throw new Error("guten_tag_v11_probe_options");
    if (
      JSON.stringify(Object.keys(options.env).sort()) !==
        JSON.stringify(
          [
            "SystemRoot",
            "WINDIR",
            "TEMP",
            "TMP",
            "PHRASEMAN_V11_REPARSE_PATHS_B64",
          ].sort(),
        ) ||
      options.env.WINDIR !== environment.SystemRoot
    )
      throw new Error("guten_tag_v11_probe_environment");
    if (
      JSON.stringify(
        decodeProbePayload(options.env.PHRASEMAN_V11_REPARSE_PATHS_B64),
      ) !== JSON.stringify([injectionPath])
    )
      throw new Error("guten_tag_v11_probe_payload_identity");
    return {
      error: undefined,
      signal: null,
      status: 0,
      stdout: Buffer.from("PHRASEMAN_ATTRS_V1|1|32", "ascii"),
      stderr: Buffer.alloc(0),
    };
  };
  const happy = readWindowsFileAttributesWithSpawnSync(
    [injectionPath],
    environment,
    happyRunner,
  );
  if (happyCalls !== 1 || JSON.stringify(happy) !== JSON.stringify([32]))
    throw new Error("guten_tag_v11_probe_happy");

  const result = (
    stdout: string | Buffer,
    overrides: Record<string, unknown> = {},
  ): any => ({
    error: undefined,
    signal: null,
    status: 0,
    stdout: typeof stdout === "string" ? Buffer.from(stdout, "ascii") : stdout,
    stderr: Buffer.alloc(0),
    ...overrides,
  });
  for (const [name, response] of [
    ["timeout", result("", { error: new Error("ETIMEDOUT"), status: null })],
    ["error_null", result("PHRASEMAN_ATTRS_V1|1|0", { error: null })],
    ["signal", result("PHRASEMAN_ATTRS_V1|1|0", { signal: "SIGTERM" })],
    ["nonzero", result("PHRASEMAN_ATTRS_V1|1|0", { status: 70 })],
    [
      "stderr",
      result("PHRASEMAN_ATTRS_V1|1|0", {
        stderr: Buffer.from("PHRASEMAN_ATTRS_V1_ERROR"),
      }),
    ],
    ["wrong_version", result("PHRASEMAN_ATTRS_V2|1|0")],
    ["wrong_count", result("PHRASEMAN_ATTRS_V1|2|0,0")],
    ["malformed", result("PHRASEMAN_ATTRS_V1|1|")],
    ["overflow", result("PHRASEMAN_ATTRS_V1|1|4294967296")],
    ["trailing", result("PHRASEMAN_ATTRS_V1|1|0\n")],
    ["leading_zero", result("PHRASEMAN_ATTRS_V1|1|00")],
    ["output_spoof", result(Buffer.from([0x50, 0x48, 0x80]))],
  ] as [string, any][]) {
    rejectCall(`probe_${name}`, () =>
      readWindowsFileAttributesWithSpawnSync(
        ["C:\\repo\\file.ts"],
        environment,
        () => response,
      ),
    );
  }
  for (const [name, badEnvironment] of [
    ["relative_system_root", { ...environment, SystemRoot: "Windows" }],
    [
      "normalized_system_root",
      { ...environment, SystemRoot: "C:\\Windows\\..\\Windows" },
    ],
    ["system_root_nul", { ...environment, SystemRoot: "C:\\Win\u0000dows" }],
    ["temp_nul", { ...environment, TEMP: "C:\\Te\u0000mp" }],
  ] as [string, NodeJS.ProcessEnv][]) {
    rejectCall(`probe_${name}`, () =>
      readWindowsFileAttributesWithSpawnSync(
        ["C:\\repo\\file.ts"],
        badEnvironment,
        happyRunner,
      ),
    );
  }
  for (const [name, paths] of [
    ["zero_count", []],
    ["too_many", Array.from({ length: 257 }, (_, index) => `C:\\r\\${index}`)],
    ["empty_path", [""]],
    ["nul_path", ["C:\\repo\\bad\u0000.ts"]],
    ["long_path", [`C:\\${"x".repeat(4097)}`]],
    [
      "total_payload",
      Array.from(
        { length: 4 },
        (_, index) => `C:\\${index}${"x".repeat(3995)}`,
      ),
    ],
  ] as [string, string[]][]) {
    rejectCall(`probe_${name}`, () =>
      readWindowsFileAttributesWithSpawnSync(paths, environment, happyRunner),
    );
  }

  let posixProbeCalls = 0;
  const posixProvider: DiagnosticFsProvider = {
    ...ordinaryProvider,
    platform: "posix",
    readWindowsFileAttributesSync: () => {
      posixProbeCalls += 1;
      throw new Error("must not run");
    },
  };
  if (
    readSafeWindowsAttributes(["/repo/file.ts"], posixProvider, "posix")
      .length !== 0 ||
    posixProbeCalls !== 0
  )
    throw new Error("guten_tag_v11_posix_probe_called");
}

function assertIdentityContract(): void {
  const hardlinkTarget = path.join(
    ROOT,
    "tests",
    "__guten_tag_v11_hardlink_alias__.ts",
  );
  const hardlinkProvider = providerForFakeFile(
    hardlinkTarget,
    makeBigStat(MODULE_STAT),
  );
  const hardlinkFacts = analyzeTypeScriptLog(
    Buffer.from(`${hardlinkTarget}(1,1): error TS9999: hardlink alias\n`),
    hardlinkProvider,
  );
  if (hardlinkFacts.total !== 1 || hardlinkFacts.transaction !== 1)
    throw new Error("guten_tag_v11_hardlink_not_transaction");

  const nativeShapedTarget = path.join(
    ROOT,
    "tests",
    "__guten_tag_v11_native_shaped_reparse__.ts",
  );
  const { isReparsePoint: _removedFakeApi, ...nativeShapedBigIntStats } =
    makeBigStat(MODULE_STAT);
  rejectCall("native_shaped_reparse_without_fake_api", () =>
    analyzeTypeScriptLog(
      Buffer.from(
        `${nativeShapedTarget}(1,1): error TS9999: native shaped reparse alias\n`,
      ),
      providerForFakeFile(
        nativeShapedTarget,
        nativeShapedBigIntStats,
        nativeShapedTarget,
        0x400,
      ),
    ),
  );

  for (const attributes of [
    0x00000400, 0x00001000, 0x00040000, 0x00400000, 0x00441400, 0x00001400,
  ]) {
    rejectCall(`unsafe_attributes_${attributes.toString(16)}`, () =>
      analyzeTypeScriptLog(
        Buffer.from(
          `${nativeShapedTarget}(1,1): error TS9999: unsafe attributes\n`,
        ),
        providerForFakeFile(
          nativeShapedTarget,
          nativeShapedBigIntStats,
          nativeShapedTarget,
          attributes,
        ),
      ),
    );
  }

  const missingAttributeProvider = providerForFakeFile(
    nativeShapedTarget,
    nativeShapedBigIntStats,
  );
  delete missingAttributeProvider.readWindowsFileAttributesSync;
  rejectCall("missing_windows_attribute_provider", () =>
    analyzeTypeScriptLog(
      Buffer.from(
        `${nativeShapedTarget}(1,1): error TS9999: missing provider\n`,
      ),
      missingAttributeProvider,
    ),
  );

  const throwingAttributeProvider: DiagnosticFsProvider = {
    ...providerForFakeFile(nativeShapedTarget, nativeShapedBigIntStats),
    readWindowsFileAttributesSync: () => {
      throw new Error("operational ambiguity");
    },
  };
  rejectCall("throwing_windows_attribute_provider", () =>
    analyzeTypeScriptLog(
      Buffer.from(
        `${nativeShapedTarget}(1,1): error TS9999: throwing provider\n`,
      ),
      throwingAttributeProvider,
    ),
  );

  let targetAttributeReads = 0;
  const changingAttributeProvider: DiagnosticFsProvider = {
    ...providerForFakeFile(nativeShapedTarget, nativeShapedBigIntStats),
    readWindowsFileAttributesSync: (paths) => {
      const includesTarget = paths.includes(nativeShapedTarget);
      if (includesTarget) targetAttributeReads += 1;
      return paths.map((value) =>
        value === nativeShapedTarget && targetAttributeReads === 2 ? 0x20 : 0,
      );
    },
  };
  rejectCall("windows_attributes_changed", () =>
    analyzeTypeScriptLog(
      Buffer.from(`${nativeShapedTarget}(1,1): error TS9999: attribute race\n`),
      changingAttributeProvider,
    ),
  );

  const aliases = [
    `./${PATHS.module}`,
    PATHS.module.replaceAll("/", "\\"),
    MODULE_PATH,
    pathToFileURL(MODULE_PATH).href,
  ];
  if (process.platform === "win32") aliases.push(MODULE_PATH.toUpperCase());
  for (const [index, alias] of aliases.entries()) {
    const facts = analyzeTypeScriptLog(
      Buffer.from(`${alias}(1,1): error TS9999: spelling alias\n`),
      ordinaryProvider,
    );
    if (facts.total !== 1 || facts.transaction !== 1)
      throw new Error(`guten_tag_v11_spelling_alias:${index}`);
  }

  const ordinaryPath = path.join(ROOT, "package.json");
  const ordinaryFacts = analyzeTypeScriptLog(
    Buffer.from(`${ordinaryPath}(1,1): error TS9999: ordinary external\n`),
    ordinaryProvider,
  );
  if (ordinaryFacts.total !== 1 || ordinaryFacts.transaction !== 0)
    throw new Error("guten_tag_v11_ordinary_external_misclassified");

  const duplicateTarget = path.join(ROOT, PATHS.gate);
  const duplicateProvider: DiagnosticFsProvider = {
    ...ordinaryProvider,
    lstatSync: (value) =>
      value === duplicateTarget
        ? makeBigStat(MODULE_STAT)
        : nativeDiagnosticFs.lstatSync(value),
    statSync: (value) =>
      value === duplicateTarget
        ? makeBigStat(MODULE_STAT)
        : nativeDiagnosticFs.statSync(value),
  };
  rejectCall("duplicate_transaction_identity", () =>
    analyzeTypeScriptLog(Buffer.alloc(0), duplicateProvider),
  );

  const invalidTarget = path.join(
    ROOT,
    "tests",
    "__guten_tag_v11_invalid_identity__.ts",
  );
  for (const [name, overrides] of [
    ["undefined_identity", { dev: undefined, ino: undefined }],
    ["zero_identity", { dev: 0n, ino: 0n }],
    [
      "unsafe_number_identity",
      { dev: Number(MODULE_STAT.dev), ino: Number(MODULE_STAT.ino) },
    ],
  ] as [string, Record<string, unknown>][]) {
    const invalid = makeBigStat(MODULE_STAT, overrides);
    rejectCall(name, () =>
      analyzeTypeScriptLog(
        Buffer.from(`${invalidTarget}(1,1): error TS9999: invalid identity\n`),
        providerForFakeFile(invalidTarget, invalid),
      ),
    );
  }

  const flipTarget = path.join(ROOT, "tests", "__guten_tag_v11_flip__.ts");
  const identityA = makeBigStat(MODULE_STAT, {
    dev: MODULE_STAT.dev + 101n,
    ino: MODULE_STAT.ino + 101n,
  });
  const identityB = makeBigStat(MODULE_STAT, {
    dev: MODULE_STAT.dev + 202n,
    ino: MODULE_STAT.ino + 202n,
  });
  let flipStatCalls = 0;
  const flipProvider: DiagnosticFsProvider = {
    ...providerForFakeFile(flipTarget, identityA),
    lstatSync: (value) =>
      value === flipTarget
        ? flipStatCalls === 0
          ? identityA
          : identityB
        : nativeDiagnosticFs.lstatSync(value),
    statSync: (value) => {
      if (value !== flipTarget) return nativeDiagnosticFs.statSync(value);
      const result = flipStatCalls === 0 ? identityA : identityB;
      flipStatCalls += 1;
      return result;
    },
  };
  rejectCall("pre_post_identity_flip", () =>
    analyzeTypeScriptLog(
      Buffer.from(`${flipTarget}(1,1): error TS9999: identity flip\n`),
      flipProvider,
    ),
  );

  const newIdentity = makeBigStat(MODULE_STAT, {
    dev: MODULE_STAT.dev + 303n,
    ino: MODULE_STAT.ino + 303n,
  });
  let canonicalStatCalls = 0;
  const canonicalRaceProvider: DiagnosticFsProvider = {
    ...ordinaryProvider,
    lstatSync: (value) =>
      value === MODULE_PATH && canonicalStatCalls >= 2
        ? newIdentity
        : nativeDiagnosticFs.lstatSync(value),
    statSync: (value) => {
      if (value !== MODULE_PATH) return nativeDiagnosticFs.statSync(value);
      const result =
        canonicalStatCalls >= 2
          ? newIdentity
          : nativeDiagnosticFs.statSync(value);
      canonicalStatCalls += 1;
      return result;
    },
  };
  rejectCall("canonical_path_new_identity", () =>
    analyzeTypeScriptLog(
      Buffer.from(`${MODULE_PATH}(1,1): error TS9999: canonical race\n`),
      canonicalRaceProvider,
    ),
  );

  const missingTarget = path.join(ROOT, "tests", "__missing_v11__.ts");
  let missingIdentityReads = 0;
  const missingProvider: DiagnosticFsProvider = {
    ...ordinaryProvider,
    existsSync: (value) =>
      value === missingTarget ? false : nativeDiagnosticFs.existsSync(value),
    lstatSync: (value) => {
      if (value === missingTarget) missingIdentityReads += 1;
      return nativeDiagnosticFs.lstatSync(value);
    },
    statSync: (value) => {
      if (value === missingTarget) missingIdentityReads += 1;
      return nativeDiagnosticFs.statSync(value);
    },
  };
  rejectCall("missing_candidate", () =>
    analyzeTypeScriptLog(
      Buffer.from(`${missingTarget}(1,1): error TS9999: missing\n`),
      missingProvider,
    ),
  );
  if (missingIdentityReads !== 0)
    throw new Error("guten_tag_v11_missing_identity_was_read");

  const outsideTarget =
    process.platform === "win32"
      ? "C:\\Temp\\outside-hardlink.ts"
      : "/tmp/outside-hardlink.ts";
  let outsideIdentityReads = 0;
  const outsideProvider: DiagnosticFsProvider = {
    ...ordinaryProvider,
    existsSync: (value) => {
      if (value === outsideTarget) outsideIdentityReads += 1;
      return value === outsideTarget || nativeDiagnosticFs.existsSync(value);
    },
    lstatSync: (value) => {
      if (value === outsideTarget) outsideIdentityReads += 1;
      return value === outsideTarget
        ? makeBigStat(MODULE_STAT)
        : nativeDiagnosticFs.lstatSync(value);
    },
    statSync: (value) => {
      if (value === outsideTarget) outsideIdentityReads += 1;
      return value === outsideTarget
        ? makeBigStat(MODULE_STAT)
        : nativeDiagnosticFs.statSync(value);
    },
  };
  rejectCall("outside_hardlink_before_stat", () =>
    analyzeTypeScriptLog(
      Buffer.from(`${outsideTarget}(1,1): error TS9999: outside hardlink\n`),
      outsideProvider,
    ),
  );
  if (outsideIdentityReads !== 0)
    throw new Error("guten_tag_v11_outside_identity_was_read");

  for (const kind of ["symlink", "junction", "reparse"] as const) {
    rejectCall(`hardlink_${kind}`, () =>
      analyzeTypeScriptLog(
        Buffer.from(`${hardlinkTarget}(1,1): error TS9999: link alias\n`),
        fakeProvider(hardlinkTarget, kind),
      ),
    );
  }
}

function assertNativeWindowsIntegration(): void {
  if (process.platform !== "win32")
    throw new Error("guten_tag_v11_native_windows_integration_hold");
  const ordinaryPath = path.join(ROOT, "package.json");
  const ordinaryFacts = analyzeTypeScriptLog(
    Buffer.from(
      `${ordinaryPath}(1,1): error TS9999: native ordinary integration\n`,
    ),
    nativeDiagnosticFs,
  );
  if (ordinaryFacts.total !== 1 || ordinaryFacts.transaction !== 0)
    throw new Error("guten_tag_v11_native_ordinary_integration");

  const junctionDirectory = path.join(ROOT, "node_modules", "expo");
  const junctionTarget = path.join(junctionDirectory, "package.json");
  if (!fs.existsSync(junctionDirectory) || !fs.existsSync(junctionTarget))
    throw new Error("guten_tag_v11_native_junction_fixture_hold");
  rejectCall("native_junction_integration", () =>
    analyzeTypeScriptLog(
      Buffer.from(
        `${junctionTarget}(1,1): error TS9999: native junction integration\n`,
      ),
      nativeDiagnosticFs,
    ),
  );
}

const IDENTITY_ONLY = process.argv.includes("--identity-only");

try {
  assertWindowsAttributeProbeContract();
  assertIdentityContract();
  if (IDENTITY_ONLY) {
    console.log("guten_tag_v11_identity_contract: PASS");
  } else {
    assertNativeWindowsIntegration();
    const receiptText = fs.readFileSync(path.join(ROOT, PATHS.receipt), "utf8");
    const receiptBlocks = [
      ...receiptText.matchAll(/```json\n([\s\S]*?)\n```/gu),
    ];
    if (receiptBlocks.length !== 1)
      throw new Error("guten_tag_v11_receipt_json_block_count");
    if (
      JSON.stringify(JSON.parse(receiptBlocks[0][1])) !==
      JSON.stringify(receiptRecord())
    )
      throw new Error("guten_tag_v11_receipt_record_mismatch");
    if (receiptText !== renderReceipt())
      throw new Error("guten_tag_v11_receipt_byte_mismatch");
    if (!receiptText.includes('"codes": [2339, 2345, 18046]'))
      throw new Error("guten_tag_v11_receipt_codes_format");

    const evidenceText = fs.readFileSync(
      path.join(ROOT, PATHS.typescriptEvidence),
      "utf8",
    );
    if (evidenceText !== renderTypeScriptEvidence(JSON.parse(evidenceText)))
      throw new Error("guten_tag_v11_typescript_evidence_format");

    validateGutenTagV11({}, ordinaryProvider);

    for (const [relative, expected] of Object.entries({
      ...CONSTRUCTIVE_HASHES,
      ...REJECTED_AUDIT_HASHES,
    })) {
      if (sha(fs.readFileSync(path.join(ROOT, relative))) !== expected)
        throw new Error(`guten_tag_v11_frozen_hash:${relative}`);
    }

    const lexicalEvidence = load(PATHS.lexicalEvidence);
    for (const [name, mutate] of [
      [
        "evidence_identity",
        (v: any) => {
          v.canonicalSenseId = "rejected";
        },
      ],
      [
        "evidence_schema_extra",
        (v: any) => {
          v.unexpected = true;
        },
      ],
      ["evidence_hash_reformatted", (_v: any) => undefined],
      [
        "evidence_formal",
        (v: any) => {
          v.claimBoundaries.formalRegisterClaim = true;
        },
      ],
      [
        "evidence_scored",
        (v: any) => {
          v.allocation.firstScoredUsePacketId = "de_l01_c04_s32";
        },
      ],
    ] as [string, (value: any) => void][]) {
      const value = structuredClone(lexicalEvidence);
      mutate(value);
      rejectCall(name, () =>
        validateLexicalEvidenceRaw(Buffer.from(JSON.stringify(value), "utf8")),
      );
    }

    reject("v10_lexical_substitution", {
      lexicalV11: path.join(ROOT, PATHS.lexicalV10),
    });
    reject("v10_task6_substitution", {
      task6V11: path.join(ROOT, PATHS.task6V10),
    });
    reject("v10_inventory_substitution", {
      inventoryV11: path.join(ROOT, PATHS.inventoryV10),
    });

    const lexicalCases: [string, (value: any) => void][] = [
      [
        "farewell_tail",
        (v) => {
          v.at(-1).excludedSourceSenseSegments = ["d-1-2"];
        },
      ],
      [
        "d12",
        (v) => {
          v.at(-1).sourceSenseAnchor = "d-1-2";
        },
      ],
      [
        "formal",
        (v) => {
          v.at(-1).formalRegisterClaim = true;
        },
      ],
      [
        "neutral",
        (v) => {
          v.at(-1).neutralRegisterClaim = true;
        },
      ],
      [
        "all_day",
        (v) => {
          v.at(-1).timeOfDayScope.push("ganztägig");
        },
      ],
      [
        "phrase_missing",
        (v) => {
          delete v.at(-1).phraseAuthority;
        },
      ],
      [
        "phrase_true",
        (v) => {
          v.at(-1).phraseAuthority = true;
        },
      ],
      [
        "phrase_string",
        (v) => {
          v.at(-1).phraseAuthority = "false";
        },
      ],
      [
        "phrase_extra",
        (v) => {
          v.at(-1).phraseFrame = "Guten Tag, {Person}!";
        },
      ],
    ];
    for (const [name, mutate] of lexicalCases)
      hostile("lexicalV11", PATHS.lexicalV11, name, mutate);

    const task6Cases: [string, (value: any) => void][] = [
      [
        "mapping_intro",
        (v) => {
          v.authorityContext.lexicalMappings.at(-1).firstIntroductionPacketId =
            "de_l01_c04_s32";
        },
      ],
      [
        "mapping_scored",
        (v) => {
          v.authorityContext.lexicalMappings.at(-1).firstScoredUsePacketId =
            "de_l01_c04_s32";
        },
      ],
      [
        "mapping_phrase_missing",
        (v) => {
          delete v.authorityContext.lexicalMappings.at(-1).phraseAuthority;
        },
      ],
      [
        "materialization_phrase_true",
        (v) => {
          v.materialization.l01GutenTagLexicalMapping.phraseAuthority = true;
        },
      ],
      [
        "phrase_frame",
        (v) => {
          v.registry.phraseFrames.push({ id: "forbidden" });
        },
      ],
      [
        "hidden_unlock",
        (v) => {
          v.registry.lexicalSenses.at(-1).hidden = { task7Unlock: true };
        },
      ],
    ];
    for (const [name, mutate] of task6Cases)
      hostile("task6V11", PATHS.task6V11, name, mutate);

    const inventoryCases: [string, (value: any) => void][] = [
      [
        "resolution_missing",
        (v) => {
          v.resolutions.pop();
        },
      ],
      [
        "resolution_duplicate",
        (v) => {
          v.resolutions[10] = structuredClone(v.resolutions[9]);
        },
      ],
      [
        "resolution_scored",
        (v) => {
          v.resolutions.at(-1).firstScoredUsePacketId = "de_l01_c04_s32";
        },
      ],
      [
        "digest_wrong",
        (v) => {
          v.inventoryDigests.resolvedPlanIdsCanonicalSha256 = "0".repeat(64);
        },
      ],
      [
        "materialized",
        (v) => {
          v.counts.materializedPackets = 1;
        },
      ],
      [
        "extra",
        (v) => {
          v.finalVerdict = "PASS";
        },
      ],
    ];
    for (const [name, mutate] of inventoryCases)
      hostile("inventoryV11", PATHS.inventoryV11, name, mutate);

    for (const key of Object.keys(CLOSED_AUTHORITY_V11)) {
      const badValue =
        key === "materializedPackets"
          ? 1
          : key === "consumerCutover"
            ? "V11"
            : key === "ownerApproval"
              ? "GRANTED"
              : true;
      for (const [override, relative] of [
        ["task6V11", PATHS.task6V11],
        ["inventoryV11", PATHS.inventoryV11],
        ["manifest", PATHS.manifest],
        ["typescriptEvidence", PATHS.typescriptEvidence],
      ] as [keyof GateOverrides, string][]) {
        hostile(
          override,
          relative,
          `authority_${String(override)}_${key}`,
          (v) => {
            v.authority[key] = badValue;
          },
        );
      }
    }
    hostile("task6V11", PATHS.task6V11, "authority_missing", (v) => {
      delete v.authority.phraseAuthority;
    });
    hostile("task6V11", PATHS.task6V11, "authority_extra", (v) => {
      v.authority.unexpected = false;
    });
    hostile("task6V11", PATHS.task6V11, "authority_string_false", (v) => {
      v.authority.task7Unlock = "false";
    });

    const moduleSource = fs.readFileSync(path.join(ROOT, PATHS.module), "utf8");
    if (
      /json\(PATHS\.(?:lexicalV10|task6V10|inventoryV10|manifestV10|evidenceV10)\)/u.test(
        moduleSource,
      )
    )
      throw new Error("guten_tag_v11_rejected_body_parse_present");
    const captureSource = fs.readFileSync(
      path.join(ROOT, PATHS.capture),
      "utf8",
    );
    if (
      !captureSource.includes("analyzeTypeScriptLog") ||
      captureSource.includes("TextDecoder")
    )
      throw new Error("guten_tag_v11_capture_canonicalization_fork");

    const aliases = [
      `./${PATHS.module}`,
      PATHS.module.replaceAll("/", "\\"),
      path.join(ROOT, PATHS.module),
      pathToFileURL(path.join(ROOT, PATHS.module)).href,
    ];
    if (process.platform === "win32")
      aliases.push(path.join(ROOT, PATHS.module).toUpperCase());
    for (const [index, alias] of aliases.entries()) {
      const raw = Buffer.from(
        `${alias}(1,1): error TS9999: injected\n`,
        "utf8",
      );
      const facts = analyzeTypeScriptLog(raw, ordinaryProvider);
      if (facts.transaction !== 1 || facts.total !== 1)
        throw new Error(`guten_tag_v11_alias_not_transaction:${index}`);
      rejectRepositoryLog(`alias_transaction_${index}`, raw, {
        total: 1,
        transaction: 0,
        codes: [9999],
      });
    }

    for (const [name, diagnosticPath] of [
      [
        "outside",
        process.platform === "win32"
          ? "C:\\Temp\\outside.ts"
          : "/tmp/outside.ts",
      ],
      ["http_uri", "https://example.com/file.ts"],
      [
        "file_query",
        `${pathToFileURL(path.join(ROOT, PATHS.module)).href}?x=1`,
      ],
      [
        "file_fragment",
        `${pathToFileURL(path.join(ROOT, PATHS.module)).href}#x`,
      ],
      ["drive_relative", "C:relative.ts"],
    ] as [string, string][])
      rejectCall(name, () =>
        analyzeTypeScriptLog(
          Buffer.from(`${diagnosticPath}(1,1): error TS9999: injected\n`),
          ordinaryProvider,
        ),
      );

    const fakeTarget = path.join(ROOT, "tests", "__guten_tag_v11_fake__.ts");
    for (const kind of [
      "symlink",
      "junction",
      "reparse",
      "short-alias",
    ] as const)
      rejectCall(`fake_${kind}`, () =>
        analyzeTypeScriptLog(
          Buffer.from(`${fakeTarget}(1,1): error TS9999: injected\n`),
          fakeProvider(fakeTarget, kind),
        ),
      );

    const unsafeLogs: [string, Buffer][] = [
      ["invalid_utf8", Buffer.from([0xff])],
      ["nul", Buffer.from("\u0000")],
      ["bel", Buffer.from("\u0007")],
      ["osc", Buffer.from("\u001b]0;title\u0007")],
      ["dcs", Buffer.from("\u001bPpayload\u001b\\")],
      ["private_csi", Buffer.from("\u001b[?25l")],
      ["del", Buffer.from("\u007f")],
      ["c1", Buffer.from("\u0085")],
      ["bom", Buffer.from("\ufeff")],
      ["lone_cr", Buffer.from("x\ry")],
      ["bidi", Buffer.from("\u202e")],
    ];
    for (const [name, raw] of unsafeLogs)
      rejectRepositoryLog(
        name,
        Buffer.concat([
          raw,
          Buffer.from("\napp/unrelated.ts(1,1): error TS9999: injected\n"),
        ]),
        { total: 1, transaction: 0, codes: [9999] },
      );
    rejectRepositoryLog(
      "ambiguous_error",
      Buffer.from("fake error TS9999: ambiguous\n"),
      { total: 1, transaction: 0, codes: [9999] },
    );

    hostile(
      "typescriptEvidence",
      PATHS.typescriptEvidence,
      "fake_green",
      (v) => {
        v.repositoryRun.exitCode = 0;
        v.repositoryRun.outcome = "PASS";
      },
    );
    hostile(
      "typescriptEvidence",
      PATHS.typescriptEvidence,
      "wrong_heap",
      (v) => {
        v.repositoryRun.env.NODE_OPTIONS = "--max-old-space-size=4096";
      },
    );
    hostile(
      "typescriptEvidence",
      PATHS.typescriptEvidence,
      "wrong_command",
      (v) => {
        v.repositoryRun.argv.push("--skipLibCheck");
      },
    );
    hostile(
      "typescriptEvidence",
      PATHS.typescriptEvidence,
      "wrong_counts",
      (v) => {
        v.repositoryRun.diagnostics.total += 1;
      },
    );
    hostile("typescriptEvidence", PATHS.typescriptEvidence, "log_hash", (v) => {
      v.repositoryRun.log.sha256 = "0".repeat(64);
    });
    hostile(
      "typescriptEvidence",
      PATHS.typescriptEvidence,
      "snapshot_hash",
      (v) => {
        v.sourceSnapshot.files[0].sha256 = "0".repeat(64);
      },
    );
    hostile("manifest", PATHS.manifest, "manifest_rejected_status", (v) => {
      v.rejectedAudits[0].status = "ACCEPTED";
    });
    hostile("manifest", PATHS.manifest, "manifest_rejected_extra", (v) => {
      v.rejectedAudits[0].reason = "trusted";
    });
    hostile("manifest", PATHS.manifest, "manifest_hash", (v) => {
      v.constructiveInputs[0].sha256 = "0".repeat(64);
    });

    const receipt = fs.readFileSync(path.join(ROOT, PATHS.receipt), "utf8");
    for (const [name, body] of [
      ["receipt_missing", receipt.replace(/```json[\s\S]*?```/u, "")],
      ["receipt_second", `${receipt}\n\`\`\`json\n{}\n\`\`\`\n`],
      ["receipt_additive_approval", `${receipt}APPROVED\n`],
      [
        "receipt_reformatted",
        receipt.replace('  "schemaVersion"', '    "schemaVersion"'),
      ],
      ["receipt_pass", receipt.replace("PENDING_INDEPENDENT_REVIEW", "PASS")],
    ] as [string, string][]) {
      const target = path.join(temp, `${name}.md`);
      fs.writeFileSync(target, body, "utf8");
      reject(name, { receipt: target });
    }

    if (
      TRANSACTION_PATHS.length !== 11 ||
      new Set(TRANSACTION_PATHS).size !== 11
    )
      throw new Error("guten_tag_v11_transaction_path_set");
    console.log("guten_tag_v11_native_reparse_reconciliation_gate: PASS");
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

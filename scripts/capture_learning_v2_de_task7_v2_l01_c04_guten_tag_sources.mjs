import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1",
);
const RAW_ROOT = path.join(EVIDENCE_ROOT, "raw");
const GOETHE_URL =
  "https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(code) {
  throw new Error(code);
}

fs.mkdirSync(RAW_ROOT, { recursive: true });
const rawPath = path.join(RAW_ROOT, "goethe_a1_redemittel.pdf");
const headersPath = path.join(RAW_ROOT, "goethe_a1_redemittel.headers.txt");
const command = spawnSync(
  "curl.exe",
  [
    "--compressed",
    "--fail",
    "--silent",
    "--show-error",
    "--max-redirs",
    "0",
    "--connect-timeout",
    "30",
    "--max-time",
    "120",
    "--dump-header",
    headersPath,
    "--output",
    rawPath,
    GOETHE_URL,
  ],
  { encoding: "utf8" },
);
if (command.status !== 0) {
  fail(`TASK7_GUTEN_TAG_CAPTURE_FAILED:${command.status}:${command.stderr}`);
}
const headers = fs.readFileSync(headersPath, "utf8");
const status = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\b/mu.exec(headers)?.[1] ?? "";
const contentType =
  /^content-type:\s*([^\r\n]+)/imu.exec(headers)?.[1]?.trim() ?? "";
if (status !== "200" || /\r?\nlocation:/iu.test(headers)) {
  fail(`TASK7_GUTEN_TAG_HTTP_IDENTITY:${status}`);
}
const body = fs.readFileSync(rawPath);
if (body.length === 0) fail("TASK7_GUTEN_TAG_EMPTY_BODY");
const metadata =
  [
    `canonical-url: ${GOETHE_URL}`,
    `requested-url: ${GOETHE_URL}`,
    `http-status: ${status}`,
    `content-type: ${contentType}`,
    "transport: DIRECT_PUBLIC_HTTPS",
    `body-sha256: ${sha256(body)}`,
    `body-bytes: ${body.length}`,
  ].join("\n") + "\n";
fs.writeFileSync(
  path.join(RAW_ROOT, "goethe_a1_redemittel.http_metadata.txt"),
  metadata,
  "utf8",
);
fs.unlinkSync(headersPath);
process.stdout.write(
  `TASK7_GUTEN_TAG_CAPTURE PASS goethe=${sha256(body)} transport=DIRECT_PUBLIC_HTTPS\n`,
);

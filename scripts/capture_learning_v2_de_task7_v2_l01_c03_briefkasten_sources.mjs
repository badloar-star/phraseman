import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const evidenceRoot = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1",
);
const rawRoot = path.join(evidenceRoot, "raw");
const url = "https://www.dwds.de/wb/Briefkasten";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(code) {
  throw new Error(code);
}

fs.mkdirSync(rawRoot, { recursive: true });
const rawPath = path.join(rawRoot, "dwds_briefkasten.html");
const headersPath = path.join(rawRoot, "dwds_briefkasten.headers.txt");
const result = spawnSync(
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
    url,
  ],
  { encoding: "utf8" },
);
if (result.status !== 0) fail("TASK7_BRIEFKASTEN_CAPTURE_FAILED");
const headers = fs.readFileSync(headersPath, "utf8");
const status = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\b/mu.exec(headers)?.[1] ?? "";
const contentType =
  /^content-type:\s*([^\r\n]+)/imu.exec(headers)?.[1]?.trim() ?? "";
if (status !== "200" || /\r?\nlocation:/iu.test(headers)) {
  fail(`TASK7_BRIEFKASTEN_HTTP_IDENTITY:${status}`);
}
const body = fs.readFileSync(rawPath);
if (body.length === 0) fail("TASK7_BRIEFKASTEN_EMPTY_BODY");
const metadata =
  [
    `canonical-url: ${url}`,
    `requested-url: ${url}`,
    `http-status: ${status}`,
    `content-type: ${contentType}`,
    "transport: DIRECT_PUBLIC_HTTPS",
    `body-sha256: ${sha256(body)}`,
    `body-bytes: ${body.length}`,
  ].join("\n") + "\n";
fs.writeFileSync(
  path.join(rawRoot, "dwds_briefkasten.http_metadata.txt"),
  metadata,
  "utf8",
);
fs.unlinkSync(headersPath);
process.stdout.write(
  `TASK7_BRIEFKASTEN_CAPTURE PASS sha256=${sha256(body)} bytes=${body.length} transport=DIRECT_PUBLIC_HTTPS\n`,
);

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_source_hold_v1",
);
const RAW_ROOT = path.join(EVIDENCE_ROOT, "raw");
const DWDS_URL = "https://www.dwds.de/wb/tsch%C3%BCss";
const GOETHE_URL =
  "https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(code) {
  throw new Error(code);
}

function capture({ id, url, rawName }) {
  const rawPath = path.join(RAW_ROOT, rawName);
  const headersPath = path.join(RAW_ROOT, `${id}.headers.txt`);
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
      url,
    ],
    { encoding: "utf8" },
  );
  if (command.status !== 0) {
    fail(
      `TASK7_TSCHUESS_CAPTURE_FAILED:${id}:${command.status}:${command.stderr}`,
    );
  }
  const headers = fs.readFileSync(headersPath, "utf8");
  const status = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\b/mu.exec(headers)?.[1] ?? "";
  const contentType =
    /^content-type:\s*([^\r\n]+)/imu.exec(headers)?.[1]?.trim() ?? "";
  if (status !== "200" || /\r?\nlocation:/iu.test(headers)) {
    fail(`TASK7_TSCHUESS_HTTP_IDENTITY:${id}:${status}`);
  }
  const bytes = fs.readFileSync(rawPath);
  if (bytes.length === 0) fail(`TASK7_TSCHUESS_EMPTY_BODY:${id}`);
  const metadata =
    [
      `canonical-url: ${url}`,
      `requested-url: ${url}`,
      `http-status: ${status}`,
      `content-type: ${contentType}`,
      "transport: DIRECT_PUBLIC_HTTPS",
      `body-sha256: ${sha256(bytes)}`,
      `body-bytes: ${bytes.length}`,
    ].join("\n") + "\n";
  const metadataPath = path.join(RAW_ROOT, `${id}.http_metadata.txt`);
  fs.writeFileSync(metadataPath, metadata, "utf8");
  fs.unlinkSync(headersPath);
  return {
    rawName,
    rawSha256: sha256(bytes),
    rawBytes: bytes.length,
    metadataName: `${id}.http_metadata.txt`,
    metadataSha256: sha256(metadata),
    metadataBytes: Buffer.byteLength(metadata, "utf8"),
  };
}

fs.mkdirSync(RAW_ROOT, { recursive: true });
const dwds = capture({
  id: "dwds_tschuess",
  url: DWDS_URL,
  rawName: "dwds_tschuess.html",
});
const goethe = capture({
  id: "goethe_a1_redemittel",
  url: GOETHE_URL,
  rawName: "goethe_a1_redemittel.pdf",
});
process.stdout.write(
  `TASK7_TSCHUESS_CAPTURE PASS dwds=${dwds.rawSha256} goethe=${goethe.rawSha256} transport=DIRECT_PUBLIC_HTTPS\n`,
);

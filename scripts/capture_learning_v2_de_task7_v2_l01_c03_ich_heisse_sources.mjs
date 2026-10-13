import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const evidenceRoot = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1",
);
const rawRoot = path.join(evidenceRoot, "raw");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(code) {
  throw new Error(code);
}

function capture({ id, url, rawName }) {
  const rawPath = path.join(rawRoot, rawName);
  const headersPath = path.join(rawRoot, `${id}.headers.txt`);
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
  if (result.status !== 0) fail(`TASK7_ICH_HEISSE_CAPTURE_FAILED:${id}`);
  const headers = fs.readFileSync(headersPath, "utf8");
  const status = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\b/mu.exec(headers)?.[1] ?? "";
  const contentType =
    /^content-type:\s*([^\r\n]+)/imu.exec(headers)?.[1]?.trim() ?? "";
  if (status !== "200" || /\r?\nlocation:/iu.test(headers)) {
    fail(`TASK7_ICH_HEISSE_HTTP_IDENTITY:${id}:${status}`);
  }
  const body = fs.readFileSync(rawPath);
  if (body.length === 0) fail(`TASK7_ICH_HEISSE_EMPTY_BODY:${id}`);
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
    path.join(rawRoot, `${id}.http_metadata.txt`),
    metadata,
    "utf8",
  );
  fs.unlinkSync(headersPath);
  return { sha256: sha256(body), bytes: body.length };
}

fs.mkdirSync(rawRoot, { recursive: true });
const dwds = capture({
  id: "dwds_heissen",
  url: "https://www.dwds.de/wb/hei%C3%9Fen",
  rawName: "dwds_heissen.html",
});
const goethe = capture({
  id: "goethe_a1_redemittel",
  url: "https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf",
  rawName: "goethe_a1_redemittel.pdf",
});
process.stdout.write(
  `TASK7_ICH_HEISSE_CAPTURE PASS dwds=${dwds.sha256} goethe=${goethe.sha256} transport=DIRECT_PUBLIC_HTTPS\n`,
);

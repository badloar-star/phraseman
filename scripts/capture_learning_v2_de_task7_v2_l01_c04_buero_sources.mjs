import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const registryPath = ".tmp/de-task6c-l01-direct-capture/registry.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const registryBytes = await readFile(registryPath);
const registry = JSON.parse(registryBytes.toString("utf8"));
const rows = registry.rows.filter(
  (row) => row.sourcePlanId === "de_lex_plan_l01_c04_buero_v1",
);
if (rows.length !== 1)
  throw new Error("TASK7_BUERO_CAPTURE_SOURCE_PLAN_NOT_UNIQUE");
const row = rows[0];
if (
  row.httpStatus !== 200 ||
  row.finalUrl !== "https://www.dwds.de/wb/B%C3%BCro" ||
  row.rawResponse.responseSha256 !==
    "8a33bb90ed67602206a65824a5e3e19c69c9b85384cc1426b62f3628675e5787"
)
  throw new Error("TASK7_BUERO_CAPTURE_DIRECT_PROVENANCE_INVALID");
process.stdout.write(
  `TASK7_BUERO_CAPTURE HOLD registry=${sha256(registryBytes)} raw=${row.rawResponse.responseSha256} http=${row.httpStatus}\n`,
);

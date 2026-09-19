import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GERMAN_RESEARCH_AUTHORITY_V1,
  type GermanResearchClaim,
} from "../modules/learning-v2/curriculum/de/research_authority_de_v1";
import {
  GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1,
  validateGermanResearchEvidenceBindingsDeV1,
} from "../modules/learning-v2/curriculum/de/research_evidence_bindings_de_v1";

const repoRoot = join(__dirname, "..");
const dossier = readFileSync(
  join(repoRoot, "docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md"),
  "utf8",
);
const ledger = readFileSync(
  join(repoRoot, "docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md"),
  "utf8",
);
const ownerDecisions = readFileSync(
  join(repoRoot, "docs/v2/curriculum/de/OWNER_DECISIONS.md"),
  "utf8",
);

const researchEvidenceBindings = GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1;

validateGermanResearchEvidenceBindingsDeV1(
  GERMAN_RESEARCH_AUTHORITY_V1 as readonly GermanResearchClaim[],
  researchEvidenceBindings,
);
const ledgerRowsByClaimId = new Map<string, readonly string[]>();
for (const line of ledger.split(/\r?\n/u)) {
  if (!line.startsWith("| `DE-")) continue;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  assert.equal(cells.length, 4, `ledger_cell_count:${line}`);
  const id = /^`(DE-(?:RSCH|GRM|ORTH|LEX|PHON|REG)-[A-Z]+-\d{3})`$/u.exec(cells[0])?.[1];
  assert.ok(id, `ledger_claim_id_cell_invalid:${cells[0]}`);
  assert.ok(!ledgerRowsByClaimId.has(id), `duplicate_ledger_claim_id:${id}`);
  ledgerRowsByClaimId.set(id, cells);
}
assert.equal(
  ledgerRowsByClaimId.size,
  GERMAN_RESEARCH_AUTHORITY_V1.length,
  "ledger_must_have_exactly_one_row_per_typed_claim",
);
for (const claim of GERMAN_RESEARCH_AUTHORITY_V1) {
  assert.ok(ledgerRowsByClaimId.has(claim.id), `missing_ledger_claim_row:${claim.id}`);
}
for (const binding of researchEvidenceBindings) {
  if (!binding.id.startsWith("DE-PHON-")) continue;
  const ledgerCells = ledgerRowsByClaimId.get(binding.id);
  assert.ok(ledgerCells, `missing_pronunciation_ledger_row:${binding.id}`);
  assert.ok(
    ledgerCells[2].includes(`\`${binding.status}\``),
    `ledger_evidence_status_mismatch:${binding.id}`,
  );
}

assert.throws(
  () => validateGermanResearchEvidenceBindingsDeV1(
    GERMAN_RESEARCH_AUTHORITY_V1 as readonly GermanResearchClaim[],
    [...researchEvidenceBindings, {
      id: "DE-GRM-UNKNOWN-999",
      status: "DIRECT_SOURCE",
      limitation: "NO_OWNER_DECISION_OR_BLUEPRINT_SEQUENCE",
    }],
  ),
  /unknown_evidence_id:DE-GRM-UNKNOWN-999/u,
);
assert.throws(
  () => validateGermanResearchEvidenceBindingsDeV1(
    GERMAN_RESEARCH_AUTHORITY_V1 as readonly GermanResearchClaim[],
    researchEvidenceBindings.map((binding, index) => index === 0
      ? { ...binding, limitation: "" }
      : binding),
  ),
  /missing_evidence_limitation:DE-RSCH-CEFR-001/u,
);
assert.throws(
  () => validateGermanResearchEvidenceBindingsDeV1(
    GERMAN_RESEARCH_AUTHORITY_V1 as readonly GermanResearchClaim[],
    researchEvidenceBindings.map((binding) => binding.id === "DE-PHON-UK-002"
      ? { ...binding, status: "DIRECT_L2_UK" }
      : binding),
  ),
  /inconsistent_evidence_status:DE-PHON-UK-002/u,
);

assert.ok(
  GERMAN_RESEARCH_AUTHORITY_V1.length >= 20,
  "German research authority must contain at least 20 independently reviewable claims",
);

const ids = new Set<string>();
const urls = new Set<string>();
for (const claim of GERMAN_RESEARCH_AUTHORITY_V1 as readonly GermanResearchClaim[]) {
  assert.match(claim.id, /^DE-(RSCH|GRM|ORTH|LEX|PHON|REG)-[A-Z]+-\d{3}$/u);
  assert.ok(!ids.has(claim.id), `duplicate research claim id: ${claim.id}`);
  ids.add(claim.id);
  assert.match(claim.sourceUrl, /^https:\/\//u, `missing authoritative URL: ${claim.id}`);
  urls.add(claim.sourceUrl);
  assert.ok(claim.authority.trim().length >= 3, `missing authority: ${claim.id}`);
  assert.equal(claim.accessedOn, "2026-09-19", `wrong access date: ${claim.id}`);
  assert.ok(claim.claim.trim().length >= 25, `claim too vague: ${claim.id}`);
  assert.ok(
    claim.curriculumImplication.trim().length >= 25,
    `curriculum implication too vague: ${claim.id}`,
  );
  assert.ok(ledger.includes(`\`${claim.id}\``), `claim absent from Markdown ledger: ${claim.id}`);
}

assert.ok(urls.size >= 10, "research must not collapse to one or two pages");
for (const requiredAuthority of [
  "Council of Europe",
  "Goethe-Institut",
  "IDS Mannheim",
  "Rat für deutsche Rechtschreibung",
  "DeReWo",
]) assert.ok(ledger.includes(requiredAuthority), `missing authority: ${requiredAuthority}`);

for (const requiredDecision of [
  "Satzklammer",
  "V2",
  "Verberst",
  "Verbletzt",
  "отделяем",
  "Nominativ",
  "Akkusativ",
  "Dativ",
  "Genitiv",
  "артик",
  "прилагатель",
  "Modal",
  "Perfekt",
  "Präteritum",
  "nicht",
  "kein",
  "Präposition",
  "Reflexiv",
  "Relativ",
  "Passiv",
  "Genus",
  "Plural",
  "произнош",
  "du/Sie",
  "Австри",
  "Швейцар",
  "functional B1",
]) assert.ok(
  dossier.toLocaleLowerCase("ru").includes(requiredDecision.toLocaleLowerCase("ru")),
  `unsupported or missing course decision: ${requiredDecision}`,
);

assert.match(ownerDecisions, /PENDING/u);
assert.doesNotMatch(ownerDecisions, /^status:\s*(?:OWNER_)?APPROVED\s*$/imu);

process.stdout.write(
  `LEARNING V2 GERMAN RESEARCH AUTHORITY GATE: PASS (${ids.size} claims)\n`,
);

# German L01 Guten Tag positive lexical admission V7 receipt

Status: `PENDING_INDEPENDENT_REVIEW`

Decision: `EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION`.
Admission scope: `DWDS_D_1_1_GREETING_HALF_LEXICAL_ONLY`.
Source plan: `de_lex_plan_l01_c04_guten_tag_v1`.
Canonical sense: `de_lex_l01_c04_guten_tag_v1`.
Checkpoint packet: `de_l01_c04_s32`.
First introduction packet: `null`.
First scored use packet: `null`.
Phrase authority: `false`.
Register: `null`.
Time-of-day scope: `am Vormittag | am Mittag | am Nachmittag`.
Production policy: `NOT_AUTHORIZED_BY_THIS_ADMISSION`.
Resolved plan IDs: `11`.
Unresolved plan IDs: `277`.
Packet IDs: `1792`.
Materialized packets: `0`.
Task7 unlock: `false`.
Preauthoring authority: `false`.
Learner-facing authority: `false`.
Release authorized: `false`.
Consumer cutover: `NONE`.
Default consumer changed: `false`.
Owner approval: `NOT_REQUESTED_NOT_GRANTED`.

Fresh DWDS capture: `HTTP 200; 44909 bytes; sha256 542050aad29117960da3264eaa73dbb41ffe252b7330d1809a4dc6e47c97ebf2`.
Admitted DWDS evidence: `d-1-1 greeting half only: höfliche Formel zur Begrüßung`.
Excluded DWDS evidence: `occasional farewell tail and all d-1-2 rare angry dismissal`.
Register boundary: `polite source marker only; neutral/formal/unqualified formal address claims are false`.
Phrase boundary: `no phrase frame, phrase mapping, or addressee composition authority; V6 phrase structures preserved`.

Deterministic gate: `node --import tsx tests/learning_v2_de_task6c_l01_guten_tag_positive_admission_gate.ts`.
Deterministic gate result: `PASS_EXIT_0_WRITER_VERIFICATION_ONLY`.
Prettier result: `PASS_EXIT_0`.
Focused TypeScript result: `PASS_EXIT_0_DIAGNOSTICS_0`.
Reviewed repository TypeScript result: `EXIT_1_DIAGNOSTICS_17_TRANSACTION_DIAGNOSTICS_0`.
Reviewed repository TypeScript log: `C:\Temp\phraseman_guten_tag_v7_tsc_20261013.log`.
Fresh repair repository TypeScript result: `EXIT_2_DIAGNOSTICS_17_TRANSACTION_DIAGNOSTICS_0`.
Fresh repair repository TypeScript log: `C:\Temp\phraseman_guten_tag_v7_repository_repair_20261013.log`.
Default-heap probe result: `EXIT_134_OOM_DIAGNOSTICS_0_NOT_COMPILER_GREEN`.

<!-- guten-tag-positive-typescript-evidence-v1
{
  "schemaVersion": "guten_tag_positive_typescript_evidence_v1",
  "status": "PENDING_INDEPENDENT_REVIEW",
  "repositoryGreen": false,
  "focusedRun": {
    "command": "node node_modules/typescript/bin/tsc --noEmit --pretty false --skipLibCheck --esModuleInterop --module commonjs --target es2022 --moduleResolution node modules/learning-v2/curriculum/de/task6c_l01_guten_tag_positive_admission_de_v1.ts tests/learning_v2_de_task6c_l01_guten_tag_positive_admission_gate.ts",
    "exitCode": 0,
    "diagnostics": 0,
    "logPath": "C:\\Temp\\phraseman_guten_tag_v7_focused_tsc_repair_20261013.log",
    "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "logBytes": 0
  },
  "repositoryReviewedRun": {
    "command": "npx tsc --noEmit --pretty false",
    "nodeOptions": "--max-old-space-size=8192",
    "heapMb": 8192,
    "exitCode": 1,
    "diagnostics": 17,
    "transactionDiagnostics": 0,
    "repositoryGreen": false,
    "logPath": "C:\\Temp\\phraseman_guten_tag_v7_tsc_20261013.log",
    "logSha256": "81a77f0cc7a6f85f7806098c14cc1ebd833f0ce1f11ca0f93b0324327854faf6",
    "logBytes": 4680
  },
  "repositoryFreshRepairRun": {
    "command": "npx tsc --noEmit --pretty false",
    "nodeOptions": "--max-old-space-size=8192",
    "heapMb": 8192,
    "exitCode": 2,
    "diagnostics": 17,
    "transactionDiagnostics": 0,
    "repositoryGreen": false,
    "logPath": "C:\\Temp\\phraseman_guten_tag_v7_repository_repair_20261013.log",
    "logSha256": "81a77f0cc7a6f85f7806098c14cc1ebd833f0ce1f11ca0f93b0324327854faf6",
    "logBytes": 4680
  },
  "defaultHeapProbe": {
    "command": "$env:NODE_OPTIONS=$null; npx tsc --noEmit --pretty false",
    "nodeOptions": null,
    "heapMb": null,
    "exitCode": 134,
    "diagnostics": 0,
    "outcome": "OOM",
    "repositoryGreen": false,
    "logPath": "C:\\Temp\\phraseman_guten_tag_v7_default_heap_probe_20261013.log",
    "logSha256": "42e99e88091a8bc7b59f8a923875b46357c22b19ef763ec6c0b76b50ed38143a",
    "logBytes": 1368
  },
  "transactionPaths": [
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_positive_admission_de_v1.ts",
    "tests/learning_v2_de_task6c_l01_guten_tag_positive_admission_gate.ts",
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/raw/dwds_guten_tag.html",
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/raw/dwds_guten_tag.http_metadata.json",
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/extraction_map.json",
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/lexical_evidence.json",
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/manifest.json",
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v7.json",
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v7.json",
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v7.json",
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md"
  ]
}
guten-tag-positive-typescript-evidence-v1 -->

TDD RED was observed before the module and V7 artifacts existed: exit `1` with
`guten_tag_positive_missing:modules/learning-v2/curriculum/de/task6c_l01_guten_tag_positive_admission_de_v1.ts`.
The focused gate then reached exit `0`. These writer-run checks do not replace
fresh independent review and do not change this receipt's pending status.

This receipt is intentionally pending. It is not an independent review, owner approval, release receipt, Task7 unlock, learner-authoring authorization, or production cutover.

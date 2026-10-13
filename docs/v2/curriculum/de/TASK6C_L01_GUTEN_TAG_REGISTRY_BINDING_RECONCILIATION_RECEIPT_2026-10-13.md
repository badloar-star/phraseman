# German L01 Guten Tag V8 registry-binding reconciliation receipt

Status: `PENDING_INDEPENDENT_REVIEW`

Decision: `SEMANTIC_CANONICAL_REPAIR_NEW_V8`.
V7 disposition: `FROZEN_REJECTED_NOT_AUTHORITY`.
V7 review finding: `HOLD_P1_CONNECTED_CONTRACT_GAPS`.
The frozen V7 transaction remains byte-identical and is not treated as authoritative
provenance for V8. V8 reconnects the last closed V6 state to the admitted Guten Tag
lexical evidence and lexical registry V7.

Reconciled Task6 contract:

- Added the exact `l01GutenTagLexicalMapping` materialization binding.
- Added connected bindings for Task6 V6, inventory V6, V6 closure, Guten Tag lexical
  evidence, and lexical registry V7.
- Preserved every V7 lexical row, phrase frame, pronunciation target, authority
  mapping, count, and closed authority boundary.

Reconciled inventory contract:

- Corrected status to `GUTEN_TAG_LEXICAL_SENSE_CANONICAL_ADMITTED_PARTIAL`.
- Added connected bindings for inventory V6, V6 closure, Guten Tag lexical evidence,
  lexical registry V7, and the exact generated Task6 V8 bytes.
- Preserved `11 / 277 / 1792 / 0`, all digests, resolution order, sequence, and
  `task7=false`, `preauthoring=false`, `learner=false`, `release=false`,
  `consumerCutover=NONE`.

TDD RED command:
`node --import tsx tests/learning_v2_de_task6c_l01_guten_tag_registry_binding_reconciliation_gate.ts`.

TDD RED result: exit `1`,
`guten_tag_v8_missing:modules/learning-v2/curriculum/de/task6c_l01_guten_tag_registry_binding_reconciliation_de_v1.ts`.

Writer GREEN was observed with exit `0`; it is writer verification only. Independent
review, closure, learner authoring, Task7 unlock, release, consumer cutover, and owner
approval remain absent.

<!-- guten-tag-v8-reconciliation-evidence-v1
{
  "schemaVersion": "guten_tag_v8_reconciliation_evidence_v1",
  "status": "PENDING_INDEPENDENT_REVIEW",
  "independentReview": "PENDING",
  "closure": "NOT_CREATED",
  "red": {
    "command": "node --import tsx tests/learning_v2_de_task6c_l01_guten_tag_registry_binding_reconciliation_gate.ts",
    "exitCode": 1,
    "reason": "guten_tag_v8_missing:modules/learning-v2/curriculum/de/task6c_l01_guten_tag_registry_binding_reconciliation_de_v1.ts"
  },
  "green": {
    "command": "node --import tsx tests/learning_v2_de_task6c_l01_guten_tag_registry_binding_reconciliation_gate.ts",
    "exitCode": 0,
    "result": "PASS_EXIT_0_WRITER_VERIFICATION_ONLY"
  },
  "artifacts": {
    "task6V8": {
      "path": "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v8.json",
      "sha256": "f80c085f75f3c09bb84072ea56d4809ed11110248b6f5958365b6d0197019ff7"
    },
    "inventoryV8": {
      "path": "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v8.json",
      "sha256": "b051f67de024c149f734167b25f18b88849d6c79502ea59a2d33bdee3b5af536"
    },
    "manifest": {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_registry_binding_reconciliation_v1/manifest.json",
      "sha256": "b69d2563cc337711d0924eca955556d543823cb17ca736c41b3f786979f94a62"
    },
    "module": {
      "path": "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_registry_binding_reconciliation_de_v1.ts",
      "sha256": "b413e2b40cf095b9fc188320bcf4829a90d83e6c0948f3aeea43d1dc41421d9a"
    },
    "gate": {
      "path": "tests/learning_v2_de_task6c_l01_guten_tag_registry_binding_reconciliation_gate.ts",
      "sha256": "15603524061c774735d159812c2d998544a832f6523120e6519ae2d97696fdad"
    }
  },
  "authority": {
    "task7Unlock": false,
    "preauthoringAuthority": false,
    "learnerFacing": false,
    "releaseAuthorized": false,
    "currentlyMaterializable": false,
    "materializedPackets": 0,
    "phraseAuthority": false,
    "consumerCutover": "NONE",
    "defaultConsumerChanged": false,
    "ownerApproval": "NOT_REQUESTED_NOT_GRANTED"
  },
  "englishSurface": {
    "roots": [
      "modules/learning-v2/curriculum/en",
      "content/learning-v2-course/curriculum/en",
      "content/learning-v2-course/release/en",
      "modules/learning-v2/content/factory_native/generated_release/en"
    ],
    "fileCount": 1570,
    "sha256": "33c6dfd1201dfa9e2719eda7b4845a4591fdb2acd7b0cc059f89e1297e2b9f95"
  },
  "focusedTypeScript": {
    "command": "node node_modules/typescript/bin/tsc --noEmit --pretty false --skipLibCheck --esModuleInterop --module commonjs --target es2022 --moduleResolution node modules/learning-v2/curriculum/de/task6c_l01_guten_tag_registry_binding_reconciliation_de_v1.ts tests/learning_v2_de_task6c_l01_guten_tag_registry_binding_reconciliation_gate.ts",
    "exitCode": 0,
    "diagnostics": 0
  },
  "repositoryTypeScript": {
    "status": "OBSERVED_NONZERO_UNRELATED_DIAGNOSTICS",
    "command": "npx tsc --noEmit --pretty false",
    "nodeOptions": "--max-old-space-size=8192",
    "semaphore": ".claude/semaphore/slot.sh acquire/release",
    "semaphoreAcquired": true,
    "exitCode": 2,
    "diagnostics": 17,
    "repositoryGreen": false,
    "transactionDiagnostics": 0,
    "logPath": "C:\\Temp\\phraseman_guten_tag_v8_repository_20261013.log",
    "logSha256": "81a77f0cc7a6f85f7806098c14cc1ebd833f0ce1f11ca0f93b0324327854faf6",
    "logBytes": 4680
  }
}
guten-tag-v8-reconciliation-evidence-v1 -->

This receipt is intentionally pending. It is not an independent review, a closure,
an owner approval, a learner-session authorization, a release receipt, or production
authority.

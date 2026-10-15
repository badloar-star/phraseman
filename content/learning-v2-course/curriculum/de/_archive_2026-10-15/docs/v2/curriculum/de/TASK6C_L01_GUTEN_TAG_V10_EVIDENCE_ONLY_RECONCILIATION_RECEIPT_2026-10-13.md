# German Learning V2 — Guten Tag V10 evidence-only reconciliation

Status: `PENDING_INDEPENDENT_REVIEW`.

This local receipt records a V10 reconstruction from frozen V6 authority and direct lexical evidence only. Rejected V7/V8/V9 bytes are hashed for audit identity and are never parsed as constructive input. It grants no Task 7, preauthoring, learner-facing, release, phrase, cutover, default-consumer, or owner authority.

```json
{
  "schemaVersion": "learning-v2-de-guten-tag-v10-evidence-only-reconciliation-receipt.v1",
  "status": "PENDING_INDEPENDENT_REVIEW",
  "provenance": "LOCAL_WORKTREE_NOT_IMMUTABLE_EXTERNAL_RUNNER",
  "independentReview": "PENDING",
  "adversarialReview": "PENDING",
  "closure": "NOT_CREATED",
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
  "inventory": {
    "task5PlanIds": 288,
    "resolvedPlanIds": 11,
    "unresolvedPlanIds": 277,
    "packetIds": 1792,
    "materializedPackets": 0
  },
  "digests": {
    "task5": "b9d1f10fd35ce789a90055a6632af29550b0cfef349cd6b229a764336b0a271b",
    "resolved": "f769b2a0ac46870f09a4f1c35bd0815ef97973b27cbfe711b56dcd717b37f400",
    "unresolved": "fc3aa2befc24bd30c456fd69ebe53f62acb821d6eda683cada6b03565e92c605",
    "packets": "32a2320cf26729d24efc5884e0fe3c6e993e9eeeac693886a49fd566771a6d3f"
  },
  "artifacts": [
    {
      "path": "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v10.json",
      "sha256": "77f0f1df558c9d0ee3c9b8e14f046c63e2261e3e5531e70a4a36dd4f79ad7be4"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v10.json",
      "sha256": "93e7a4f2413f879945c5f740d5f98cc0b18c5a60c03bb80eac32697ec1ac6ecd"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v10.json",
      "sha256": "dff3fb050d58906eadbb92b0e75fc955e6d7ce848a9164c17f8b574a102679eb"
    },
    {
      "path": "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v10_evidence_only_reconciliation_de_v1.ts",
      "sha256": "5d7aff945ffa5f32c9d2f33bf85a6deed99079ce43d867ca4c3e4d5d92af6a11"
    },
    {
      "path": "tests/learning_v2_de_task6c_l01_guten_tag_v10_evidence_only_reconciliation_gate.ts",
      "sha256": "3a18b3290c276ee27b0958cb96a26ca4ed91ccd82a43cb39aa1499bcad8e2bdf"
    },
    {
      "path": "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v10_typescript_evidence.mjs",
      "sha256": "e58d1e92bda41e443ad4ee9db92b4b7a31bcad9d52922e18457c6078b2113a95"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/manifest.json",
      "sha256": "062d709fbb877d75ee327e02dea6abb02fc8b86996cd345ad2f9a9d78eec1c01"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/typescript_evidence.json",
      "sha256": "166ccf86e389d5cd640c812e97e991829166e7119377b893c47c66a0f3769c95"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/focused_tsc.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/repository_tsc_8192.log",
      "sha256": "c1ddaee2bf4d1853e53f288e60b306962074490ac735a28a58adac32f0c734f7"
    }
  ],
  "rejectedAudits": [
    {
      "path": "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v7.json",
      "byteSha256": "a52b925ee5e6d3adbd1de87749e7722424f6fc9c1fb5a50e3f306d2ad2fce5b1",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v7.json",
      "byteSha256": "29e2c6b7e379acd2fa69431e28d25eb6c1e97466555bc7751eafe05693b33195",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v7.json",
      "byteSha256": "d409e6cc0a909fdcf486c69308f8d2de84b2a6db688d7a90d31f933e14c0f69b",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v8.json",
      "byteSha256": "f80c085f75f3c09bb84072ea56d4809ed11110248b6f5958365b6d0197019ff7",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v8.json",
      "byteSha256": "b051f67de024c149f734167b25f18b88849d6c79502ea59a2d33bdee3b5af536",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v9.json",
      "byteSha256": "808093390dfb8d6074021a9af55721ba251ad296c0bd5ecefa025947ea49239d",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v9.json",
      "byteSha256": "83529d0021c399dc1d6b8c4f310d49f783d582c3effa094380c8823270a84c1e",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v9_fail_closed_reconciliation_de_v1.ts",
      "byteSha256": "6455d9abfa65e7483aa0200352d809b085e6a2a53ee549a4f053f799ee03e69e",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "tests/learning_v2_de_task6c_l01_guten_tag_v9_fail_closed_reconciliation_gate.ts",
      "byteSha256": "0358a742889fc9670bec88163ff3afb0840f000542d01d928898bfeb9ed7ca0c",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v9_typescript_evidence.mjs",
      "byteSha256": "77fb56d0b872b9ef60ee602d7c0983c51923333b7da5e822365d8a55c5e2e9ad",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/manifest.json",
      "byteSha256": "1820eba60cac363e3b3d7cc420d7a7ef4a94657a531391b3d8e094210aed5ecc",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/typescript_evidence.json",
      "byteSha256": "5413b055de4059c02690016574b41eed6fce722bd18b64e670b2c640a63dd0d0",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/logs/focused_tsc.log",
      "byteSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/logs/repository_tsc_8192.log",
      "byteSha256": "c1ddaee2bf4d1853e53f288e60b306962074490ac735a28a58adac32f0c734f7",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_V9_FAIL_CLOSED_RECONCILIATION_RECEIPT_2026-10-13.md",
      "byteSha256": "6c967f8a24a71e7b7fe46ccb5fe73d188d327fe55edb71a60a981865726a01ef",
      "status": "REJECTED_NOT_AUTHORITY"
    }
  ],
  "typescript": {
    "focused": {
      "executable": "node",
      "argv": [
        "node_modules/typescript/bin/tsc",
        "--noEmit",
        "--pretty",
        "false",
        "--skipLibCheck",
        "--esModuleInterop",
        "--module",
        "commonjs",
        "--target",
        "es2022",
        "--moduleResolution",
        "node",
        "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v10_evidence_only_reconciliation_de_v1.ts",
        "tests/learning_v2_de_task6c_l01_guten_tag_v10_evidence_only_reconciliation_gate.ts"
      ],
      "cwdRelative": ".",
      "env": {},
      "exitCode": 0,
      "outcome": "PASS",
      "log": {
        "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/focused_tsc.log",
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "bytes": 0
      },
      "diagnostics": {
        "total": 0,
        "transaction": 0,
        "codes": []
      }
    },
    "repository": {
      "executable": "node",
      "argv": [
        "node_modules/typescript/bin/tsc",
        "--noEmit",
        "--pretty",
        "false"
      ],
      "cwdRelative": ".",
      "env": {
        "NODE_OPTIONS": "--max-old-space-size=8192"
      },
      "exitCode": 2,
      "outcome": "BASELINE_DIAGNOSTICS_OUTSIDE_TRANSACTION",
      "log": {
        "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/repository_tsc_8192.log",
        "sha256": "c1ddaee2bf4d1853e53f288e60b306962074490ac735a28a58adac32f0c734f7",
        "bytes": 3118
      },
      "diagnostics": {
        "total": 14,
        "transaction": 0,
        "codes": [2339, 2345, 18046]
      }
    }
  }
}
```

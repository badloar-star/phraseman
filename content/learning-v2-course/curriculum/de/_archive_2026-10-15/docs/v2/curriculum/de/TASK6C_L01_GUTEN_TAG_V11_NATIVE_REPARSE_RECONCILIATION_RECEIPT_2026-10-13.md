# German Learning V2 — Guten Tag V11 native-reparse reconciliation

Status: `PENDING_INDEPENDENT_REVIEW`.

This local receipt records a V11 reconstruction from frozen V6 authority and direct lexical evidence only. The exact 11 V10 transaction bytes are hashed as REJECTED_NOT_AUTHORITY and are never parsed as constructive input. Windows reparse/offline/recall attributes are probed fail-closed before and after bigint identity snapshots; a sufficiently privileged swap between adjacent operations remains an explicitly documented residual risk. This receipt grants no Task 7, preauthoring, learner-facing, release, phrase, cutover, default-consumer, or owner authority.

```json
{
  "schemaVersion": "learning-v2-de-guten-tag-v11-native-reparse-reconciliation-receipt.v1",
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
  "nativeReparseContract": {
    "platform": "win32",
    "unsafeAttributeMaskHex": "0x00441400",
    "probeProtocol": "PHRASEMAN_ATTRS_V1",
    "probeTiming": "BEFORE_AND_AFTER_BIGINT_IDENTITY_SNAPSHOTS"
  },
  "residualRisk": "A sufficiently privileged local actor may still swap filesystem state between the attribute probe and the adjacent bigint identity operations; V11 reduces and detects ordinary races but does not claim an atomic kernel handle proof.",
  "artifacts": [
    {
      "path": "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v11.json",
      "sha256": "77f0f1df558c9d0ee3c9b8e14f046c63e2261e3e5531e70a4a36dd4f79ad7be4"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v11.json",
      "sha256": "ed53ffe5adf9ce9b93c9f01076ec923bed30f9692b334aead28c7bf2d7176e91"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v11.json",
      "sha256": "ae02c3baa0c34cb0a12a844c1637b69a45460be987f8d2f5bf1c86fd5d3283f6"
    },
    {
      "path": "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v11_native_reparse_reconciliation_de_v1.ts",
      "sha256": "8f4db9a4f3c5a83559c900cd8e2c8ba0f5780e812f032b2bc6a97e7ff3097102"
    },
    {
      "path": "tests/learning_v2_de_task6c_l01_guten_tag_v11_native_reparse_reconciliation_gate.ts",
      "sha256": "e9514de9a06480f947c6a5c7ffddb2bfd8822e9b987448ba2af802a94c564b50"
    },
    {
      "path": "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v11_typescript_evidence.mjs",
      "sha256": "fb11abc24c4ec8a832c2c77e318868fe8c431060ca8092375e52d481ed8fd58a"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/manifest.json",
      "sha256": "8efeedd5e9ae5474ec8e4375a80844b80328141d6115ac19fe54d521822dbca0"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/typescript_evidence.json",
      "sha256": "2bd9295c08c03844599363dcca6d002b345d7095b4365a96680c8fd326bf5422"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/logs/focused_tsc.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/logs/repository_tsc_8192.log",
      "sha256": "c1ddaee2bf4d1853e53f288e60b306962074490ac735a28a58adac32f0c734f7"
    }
  ],
  "rejectedAudits": [
    {
      "path": "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v10.json",
      "byteSha256": "77f0f1df558c9d0ee3c9b8e14f046c63e2261e3e5531e70a4a36dd4f79ad7be4",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v10.json",
      "byteSha256": "93e7a4f2413f879945c5f740d5f98cc0b18c5a60c03bb80eac32697ec1ac6ecd",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v10.json",
      "byteSha256": "dff3fb050d58906eadbb92b0e75fc955e6d7ce848a9164c17f8b574a102679eb",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v10_evidence_only_reconciliation_de_v1.ts",
      "byteSha256": "5d7aff945ffa5f32c9d2f33bf85a6deed99079ce43d867ca4c3e4d5d92af6a11",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "tests/learning_v2_de_task6c_l01_guten_tag_v10_evidence_only_reconciliation_gate.ts",
      "byteSha256": "3a18b3290c276ee27b0958cb96a26ca4ed91ccd82a43cb39aa1499bcad8e2bdf",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v10_typescript_evidence.mjs",
      "byteSha256": "e58d1e92bda41e443ad4ee9db92b4b7a31bcad9d52922e18457c6078b2113a95",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/manifest.json",
      "byteSha256": "062d709fbb877d75ee327e02dea6abb02fc8b86996cd345ad2f9a9d78eec1c01",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/typescript_evidence.json",
      "byteSha256": "166ccf86e389d5cd640c812e97e991829166e7119377b893c47c66a0f3769c95",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/focused_tsc.log",
      "byteSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/repository_tsc_8192.log",
      "byteSha256": "c1ddaee2bf4d1853e53f288e60b306962074490ac735a28a58adac32f0c734f7",
      "status": "REJECTED_NOT_AUTHORITY"
    },
    {
      "path": "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_V10_EVIDENCE_ONLY_RECONCILIATION_RECEIPT_2026-10-13.md",
      "byteSha256": "a0d89d62aa541cc74223c321e6ac66698e853bf182b5f01d8335ef9607b5fa57",
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
        "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v11_native_reparse_reconciliation_de_v1.ts",
        "tests/learning_v2_de_task6c_l01_guten_tag_v11_native_reparse_reconciliation_gate.ts"
      ],
      "cwdRelative": ".",
      "env": {},
      "exitCode": 0,
      "outcome": "PASS",
      "log": {
        "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/logs/focused_tsc.log",
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
        "path": "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/logs/repository_tsc_8192.log",
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

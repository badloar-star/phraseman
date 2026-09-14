# Business Continuity and Disaster Recovery

| Tier 0 service/data | RTO | RPO | Backup source | Retention | Encryption | Access | Restore dependency | Approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Firebase Auth identity | `PENDING` | `PENDING` | `PENDING` | `PENDING` | `PENDING` | `PENDING` | project IAM + export tooling | `PENDING_OWNER_APPROVAL` |
| Firestore progress/economy journal | `PENDING` | `PENDING` | `PENDING` | `PENDING` | `PENDING` | `PENDING` | rules/schema compatibility | `PENDING_OWNER_APPROVAL` |
| Cloud Functions configuration | `PENDING` | `PENDING` | `PENDING` | `PENDING` | `PENDING` | `PENDING` | source revision + secrets | `PENDING_OWNER_APPROVAL` |
| Hosting/admin surface | `PENDING` | `PENDING` | `PENDING` | `PENDING` | `PENDING` | `PENDING` | Firebase Hosting target | `PENDING_OWNER_APPROVAL` |

No restore has been executed in this packet. The owner must approve targets and a non-production test window.

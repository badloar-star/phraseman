# Access review log template

Store completed copies only in the restricted evidence repository. Do not commit names, emails, tokens, exports or screenshots here.

| Field | Required value |
|---|---|
| Review ID | Stable `ACCESS-YYYY-QN-...` identifier |
| Review date / as-of | ISO date and provider snapshot date |
| Reviewer person ID | Stable restricted identity; reviewer is independent of the access owner where practical |
| Scope | People, service identities, systems and privileged roles reviewed |
| Joiner/mover/leaver evidence | Ticket/evidence IDs and completion status |
| MFA result | Pass, exception with expiry, or not applicable with reason |
| Break-glass review | Events, approvals, duration and post-use review |
| Findings | Access removed, retained, or remediation required |
| Exception IDs | Linked risk/exception IDs with owner and expiry |
| Decision | Clean or exceptions open; never infer clean from an empty export |
| Evidence retention | Retention class and destruction date under the approved schedule |

Required sign-off: reviewer identity, date, decision and review notes. A future or missing review date is not valid evidence.

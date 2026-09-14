# Risk acceptance record template

Use one immutable/reviewable record per proposed acceptance. Completing this template does not itself approve a risk. Link the approved record from `RISK_REGISTER.md`; do not replace remediation evidence with acceptance prose.

## Identity and decision

- Risk ID:
- Register version/date:
- Acceptance decision: `NotAccepted` / `Pending` / `Approved` / `Rejected`
- Severity and likelihood:
- Asset/process:
- Proposed accountable owner (named person and role):
- Independent security/privacy reviewer:
- Business approver:
- Decision date:
- Acceptance expiry (YYYY-MM-DD, required; never indefinite):
- Treatment due/review date (YYYY-MM-DD; independent from acceptance expiry):

## Risk statement and evidence

- Threat and preconditions:
- Expected impact and affected users/data:
- Current exposure/reachability evidence:
- Existing preventive/detective/corrective controls:
- Control effectiveness evidence and freshness:
- Residual risk after those controls:
- Legal, contractual, child-safety or customer-commitment constraints:

## Alternatives considered

- Mitigate now:
- Avoid/disable the exposed path:
- Transfer/contractual treatment:
- Accept temporarily:
- Reason the selected path is proportionate:

## Acceptance guardrails

- Explicit scope and impact ceiling:
- Monitoring/alert and owner:
- Incident trigger that voids acceptance:
- Architecture/vendor/change trigger that voids acceptance:
- Compensating controls:
- Remediation task, owner and due date:
- Exit evidence required:

## Approval rules

- `PENDING`, a blank signature, chat approval, or a risk-register status is not acceptance.
- Every `Approved` decision, at every severity, requires an explicit expiry strictly after the review date.
- `Treatment: Accept` is invalid unless the acceptance decision is `Approved`.
- The risk owner cannot be the only reviewer of their own Critical/High acceptance.
- Critical acceptance requires explicit product-owner and security/privacy approval plus a future expiry date; customer, legal or CPA review may also be required by the commitment.
- No acceptance can authorize an illegal act, misleading SOC 2 claim, secret exposure, unauthorized access, orphan debit, deletion bypass or violation of an owner constitution.
- Expired acceptance reopens/escalates the risk; it must not roll forward automatically.

## Sign-off

- Risk owner: PENDING — name/date/evidence link
- Security/privacy reviewer: PENDING — name/date/evidence link
- Business/product approver: PENDING — name/date/evidence link
- Legal/CPA/customer approver when required: PENDING — name/date/evidence link

## Review outcome

- Review performed on:
- Evidence reviewed:
- Residual risk changed: yes/no and why
- Decision: renew with new approval / remediate / avoid / transfer / close
- New expiry (if freshly approved):
- Follow-up evidence link:

# Lingman Algorithm Upgrade 001

Date:

```text
2026-05-20
```

Upgrade theme:

```text
Algorithm control layer, route selection, protocol activation, and repair discipline.
```

## Problem

The office was already powerful, but it could still behave like a giant checklist.

Main risks:

```text
1. Too many agents could run on simple requests.
2. Specialized protocols could be added without changing the output.
3. The route could be implicit instead of deliberately selected.
4. QA could check quality without checking whether the right algorithm path was used.
5. Old test runs could miss new QA fields.
```

## Upgrade Applied

Added:

```text
Algorithm Control Director / Mode Router.
Routing Decision Contract.
Gate 0: Routing Gate.
Routing fit in QA Report Format.
ROUTE, ACTIVE PROTOCOLS, and SKIPPED PROTOCOLS in the One-Page Brief.
Algorithm Control Layer section.
Routing rules in the master prompt.
Routing fit backfill in test runs 001-006.
```

## New Algorithm Behavior

Every major task now starts with:

```text
1. Detect request type.
2. Choose route.
3. Activate only relevant protocols.
4. Name skipped protocols when needed.
5. Name main risk.
6. Define repair triggers.
7. Produce output.
8. Verify routing fit in QA.
```

## New Rule

```text
No dead field.
Every active protocol field must affect the brief, the script, the QA report, or the final recommendation.
```

## Conflict Order

When agents disagree, the algorithm now resolves conflicts with:

```text
truth over click;
clarity over cleverness;
viewer trust over conversion;
one strong lesson over broad coverage;
spoken rhythm over written elegance;
natural phrase over literal grammar explanation.
```

## Files Updated

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
LINGMAN_TEST_RUN_001_I_AM_AGREE.md
LINGMAN_TEST_RUN_002_IN_ON_AT.md
LINGMAN_TEST_RUN_003_PRESENT_PERFECT.md
LINGMAN_TEST_RUN_004_I_VERY_LIKE_IT.md
LINGMAN_TEST_RUN_005_POLITE_DISAGREEMENT.md
LINGMAN_TEST_RUN_006_PHRASAL_VERBS_WORK.md
```

## Verification Targets

```text
Algorithm Control Director appears in full office order and route lists.
Gate 0 appears before topic gate.
Routing fit appears in pipeline QA, master QA, and test runs 001-006.
Scorecard remains 13 lines and 100 total points.
```

## Next Upgrade Candidate

```text
Create Test Run 007: Viewer-submitted sentence repair.
This will stress-test the new routing layer with improve/community/correction behavior.
```

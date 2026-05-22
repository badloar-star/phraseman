# Lingman Bug Audit 001

Date:

```text
2026-05-20
```

Scope:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
LINGMAN_TEST_RUN_001_I_AM_AGREE.md
LINGMAN_TEST_RUN_002_IN_ON_AT.md
LINGMAN_TEST_RUN_003_PRESENT_PERFECT.md
LINGMAN_TEST_RUN_004_I_VERY_LIKE_IT.md
LINGMAN_TEST_RUN_005_POLITE_DISAGREEMENT.md
```

## Summary

The audit found process drift, not content collapse.

The main system is coherent, but several templates were lagging behind the new specialized protocols added during test runs.

## Findings

### Bug 001 - Production Command Template Drift

Severity:

```text
P1
```

What broke:

```text
The one-page brief had specialized protocol fields, but the Production Command Template still only exposed KNOWN EDGE CASES TO HANDLE.
```

Why it matters:

```text
Users or agents could fail to provide scope, tense contrast, quick correction, or social tone constraints before generation.
```

Fix:

```text
Added specialized notes for scope/exceptions, tense contrast, quick correction, and social tone.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
```

### Bug 002 - Specialized Field Bloat Risk

Severity:

```text
P2
```

What broke:

```text
The brief template had many specialized fields, but no rule saying they should only be filled when relevant.
```

Why it matters:

```text
Agents could produce bloated briefs with irrelevant fields for every episode.
```

Fix:

```text
Added Field Rule: fill specialized fields only when relevant; use N/A otherwise.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
```

### Bug 003 - Missing Canonical QA Report Format

Severity:

```text
P1
```

What broke:

```text
New protocol fields were added, but there was no single QA report format that checked them.
```

Why it matters:

```text
The system could create stronger briefs but fail to verify them before delivery.
```

Fix:

```text
Added QA Report Format with known edge case, scope fence, exception parking lot, type-specific protocol, and type-specific check.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
```

### Bug 004 - Test Run Naming Drift

Severity:

```text
P3
```

What broke:

```text
The naming examples stopped at Test Run 003, while the system already had Test Runs 004 and 005.
```

Why it matters:

```text
Future test files could become inconsistent.
```

Fix:

```text
Updated naming examples through Test Run 006.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
```

### Bug 005 - Test Run Verdict Format Missing Files Updated

Severity:

```text
P2
```

What broke:

```text
Required Test Run Output demanded "Files updated", but the verdict format omitted that field.
```

Why it matters:

```text
The system could claim learning happened without tracking where it was applied.
```

Fix:

```text
Added Files updated to the Test Run Verdict Format.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_TEST_RUN_001_I_AM_AGREE.md
LINGMAN_TEST_RUN_002_IN_ON_AT.md
LINGMAN_TEST_RUN_003_PRESENT_PERFECT.md
LINGMAN_TEST_RUN_004_I_VERY_LIKE_IT.md
LINGMAN_TEST_RUN_005_POLITE_DISAGREEMENT.md
```

### Bug 006 - Scorecard Check False-Positive Risk

Severity:

```text
P2
```

What broke:

```text
The loose scorecard scan could match score-like labels outside the actual scorecard block.
```

Why it matters:

```text
The sum may stay correct by accident or fail later for the wrong reason.
```

Fix:

```text
Added Scorecard Integrity Rule: count only the 13 score lines inside the scorecard block.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
```

## Verification

```text
Scorecard total:
100

Main pipeline:
updated

Master prompt:
updated

Bug audit:
created
```

## Remaining Risk

```text
Closed by Bug Audit 003.
```

Recommendation:

```text
Test runs 001-005 now include Canonical QA Report blocks.
```

# Lingman Bug Audit 006

Date:

```text
2026-05-20
```

Scope:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
LINGMAN_SCRIPT_001_PREPOSITIONS_IN_ON_AT_10_MIN.md
LINGMAN_SCRIPT_001_PREPOSITIONS_IN_ON_AT_10_MIN_FLOW.md
```

## Summary

The user caught a style bug: the teleprompter script was too chopped, with too many tiny sentence fragments and artificial pauses.

## Finding

### Bug 011 - Teleprompter Staccato Instead Of Dense Spoken Flow

Severity:

```text
P1
```

What broke:

```text
The script followed "short lines" too aggressively and became a sequence of chopped notes instead of a charismatic spoken monologue.
```

Why it matters:

```text
Professor Lingman should sound like a confident human speaking naturally into camera. Excessive line breaks and constant dots make the performance feel robotic, slow, and irritating.
```

Fix:

```text
Added Dense Teleprompter Flow rules to the master prompt.
Updated Teleprompter Polish Agent rules in the full pipeline.
Updated the Ideal Teleprompter Standard.
Added Dense spoken flow to QA.
Created a dense-flow rewrite of the prepositions script.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
LINGMAN_SCRIPT_001_PREPOSITIONS_IN_ON_AT_10_MIN_FLOW.md
```

## Verification

```text
Future long-form scripts must use continuous spoken paragraphs by default.
Short lines are now reserved for punchlines, hard turns, examples, and performance emphasis.
```

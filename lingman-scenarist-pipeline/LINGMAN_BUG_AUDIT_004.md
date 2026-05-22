# Lingman Bug Audit 004

Date:

```text
2026-05-20
```

Scope:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
LINGMAN_TEST_RUN_006_PHRASAL_VERBS_WORK.md
```

## Summary

This audit checks the new workplace-message protocol for template drift after Test Run 006.

## Finding

### Bug 009 - Workplace Protocol Missing From Production Command Template

Severity:

```text
P1
```

What broke:

```text
WORKPLACE CONTEXT, MESSAGE INTENT, REGISTER LEVEL, TASK OUTCOME, PHRASE CLUSTER, and MESSAGE TEMPLATE were added to the brief and protocol, but the Production Command Template did not yet have a workplace-message notes field.
```

Why it matters:

```text
An agent could know the workplace-message rule but fail to ask for or infer the practical message context, causing the script to drift back into a generic phrasal-verb list.
```

Fix:

```text
Added WORKPLACE MESSAGE NOTES to the Production Command Template.
Updated Test Run 006 verdict to record the applied fix.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_TEST_RUN_006_PHRASAL_VERBS_WORK.md
```

## Verification

```text
WORKPLACE MESSAGE NOTES now appears in the Production Command Template.
Workplace fields appear in the ideal brief format.
The master prompt contains the Workplace Message Rule.
Test Run 006 verdict no longer says pending.
```

## Remaining Risk

```text
None known for workplace-message template compatibility.
```

# Lingman Bug Audit 008

Date:

```text
2026-05-20
```

Scope:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
LINGMAN_SCRIPT_001_PREPOSITIONS_IN_ON_AT_10_MIN_FLOW.txt
```

## Summary

The user clarified the required final script file format.

## Finding

### Bug 013 - Text Script File Still Contained Timing And Long Lines

Severity:

```text
P1
```

What broke:

```text
The .txt script file still contained timing labels and very long lines, making it unsuitable as a clean teleprompter file.
```

Why it matters:

```text
The final scenario file must be directly usable in a teleprompter: no timestamps, no service blocks, no endless horizontal lines.
```

Fix:

```text
Updated script file format rules in the master prompt and full pipeline.
Rewrote the .txt script as pure teleprompter text with normal line breaks.
```

Required final .txt format:

```text
only spoken script text;
no timings;
no QA;
no routing;
no Markdown headings;
normal readable line breaks.
```

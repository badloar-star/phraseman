# Lingman Bug Audit 007

Date:

```text
2026-05-20
```

Scope:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
```

## Summary

The user clarified the required start sequence for new videos.

## Finding

### Bug 012 - New Video Flow Did Not Enforce User Choice Before Scriptwriting

Severity:

```text
P1
```

What broke:

```text
The office could move from a broad user request into a full script too early, before asking control questions and presenting 10 viral topic/title options.
```

Why it matters:

```text
The creator must choose the video angle before the office writes a 10-minute script. Otherwise the script can be technically complete but strategically unwanted.
```

Fix:

```text
Added Creator Start Protocol to the master prompt.
Added Creator Start Protocol and hard stop to the full pipeline.
```

Required order:

```text
1. Ask control questions.
2. Generate 10 viral topic/title options.
3. Recommend top 3.
4. Wait for user choice.
5. Write full 10-minute script only after choice.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
```

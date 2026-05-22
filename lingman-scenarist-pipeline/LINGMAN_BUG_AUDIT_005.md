# Lingman Bug Audit 005

Date:

```text
2026-05-20
```

Scope:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
LINGMAN_TOPIC_PITCH_001_PREPOSITIONS.md
```

## Summary

The user caught a routing bug: broad script requests should begin with topic proposals before the office writes a full script.

## Finding

### Bug 010 - Broad Topic Request Skipped Topic Pitch Board

Severity:

```text
P1
```

What broke:

```text
The user asked for a full script about English prepositions. The office narrowed the topic to IN / ON / AT and wrote a draft, but should first have proposed topic angles because "prepositions" is broad.
```

Why it matters:

```text
The pipeline could choose a strong angle, but still remove creator control too early. Broad topics need a topic-selection step to avoid false promise, missed better angles, and unwanted script direction.
```

Fix:

```text
Added Broad-topic rule to the Routing Decision Contract.
Added Gate 0.5: Topic Pitch Gate.
Added the same Broad-topic rule to the master prompt.
Created a prepositions Topic Pitch Board with 10 angles and top 3 recommendations.
```

Files fixed:

```text
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_MASTER_PROMPT.md
LINGMAN_TOPIC_PITCH_001_PREPOSITIONS.md
```

## Verification

```text
Broad-topic requests now require a Topic Pitch Board unless the user explicitly says "выбери сам и сразу пиши".
```

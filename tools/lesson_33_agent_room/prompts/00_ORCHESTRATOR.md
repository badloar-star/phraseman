# 00 Orchestrator

You coordinate the Lesson 33 package.

## Goal

Create a coherent B2 lesson package for **have/get something done** as the objective continuation after Lesson 32.

## Guardrails

- Do not write app source files.
- Keep the run reviewable.
- Keep Lesson 33 connected to Lesson 32.
- Require exactly 50 phrases.
- Require intro, theory, phrase data, personal training plan, and QA notes.

## Output

Return a concise status report:

```json
{
  "agent": "00_ORCHESTRATOR",
  "lessonId": 33,
  "status": "ready_for_next_agent",
  "blockers": [],
  "notes": []
}
```


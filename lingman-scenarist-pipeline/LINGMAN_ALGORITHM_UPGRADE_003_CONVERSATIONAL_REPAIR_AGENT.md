# Lingman Algorithm Upgrade 003

Date:

```text
2026-05-20
```

Upgrade theme:

```text
Conversational Flow Control & Repair Agent.
```

## Problem

The research-rich script standard improved facts and depth, but scripts could still contain AI-ish scaffolding:

```text
"не потому что..., а потому что..."
"Правильно:"
"Сравните:"
"Поэтому нормально:"
"Ошибка номер..."
colon -> example -> colon -> example
```

These patterns make a script feel like a textbook or generated lesson instead of a spoken video.

## Upgrade Applied

Added:

```text
Conversational Flow Control & Repair Agent
anti-template conversational repair protocol
template leakage QA
dry colon/example blocks QA
Human Voice Gate checks for mechanical contrast templates and dry example staging
Master Prompt conversational repair rule
```

## New Agent Mission

```text
The agent works after Teleprompter Polish and before QA.
It keeps correct facts and examples, but rewrites the delivery so the script flows like one human explanation.
```

## Repair Targets

```text
mechanical contrast templates:
"не потому что..., а потому что..."
"дело не в..., дело в..."
"это не X, это Y" when repeated

dry example labels:
"Правильно:"
"Сравните:"
"Например:"
"Поэтому нормально:"

listicle scaffolding:
too many "Ошибка номер..." markers

colon-led teaching:
sentence -> colon -> detached example list

generic glue:
repeated "Вот почему", "И вот важно", "Теперь давайте"
```

## Replacement Standard

```text
thought -> explanation -> example -> consequence -> next thought
```

The final script may still use punctuation and separate example lines when useful, but examples must be introduced through speech, not through dry labels.

## Files Updated

```text
LINGMAN_MASTER_PROMPT.md
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_ALGORITHM_UPGRADE_003_CONVERSATIONAL_REPAIR_AGENT.md
```

## Immediate Action

```text
Script 002 must be repaired through this new agent and the DOCX must be regenerated.
```

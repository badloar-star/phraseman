# Lingman Algorithm Upgrade 002

Date:

```text
2026-05-20
```

Upgrade theme:

```text
Research-rich, fact-checked, conversational video flow.
```

## User Requirement

```text
Every video must be informative and interesting, not dry.
Scripts need many interesting facts, constant flow, and natural conversation.
Full scripts require deep research, official or primary sources where possible, and fact-checking.
The teleprompter style should not feel like separate tiny sentences with hard stops.
```

## Interpretation

```text
"Без точек между предложениями" does not mean removing punctuation.
It means the script must not sound like chopped notes where every short phrase restarts the thought.

The new standard:
one continuous charismatic conversation with connective tissue between ideas.
```

## Upgrade Applied

Added to `LINGMAN_MASTER_PROMPT.md`:

```text
Core Laws:
Research beats empty confidence.
Interesting beats dry only when it stays true.
Flow beats chopped bullet-speech.

New active protocol:
research-rich conversational flow.

New brief fields:
RESEARCH DEPTH
OFFICIAL SOURCES
FACT CHECK STATUS
INTERESTING FACTS
CONVERSATIONAL FLOW

New rule:
Research-Rich Conversational Flow Rule.

QA additions:
Research depth
Fact-check status
Interesting information
Conversation flow
```

Added to `LINGMAN_AGENT_OFFICE_PIPELINE.md`:

```text
Non-negotiable research/fact-check/flow rules.
Research-rich conversational flow active protocol.
Lesson Gate source-backed research requirements.
Retention Gate flow and curiosity requirements.
Human Voice Gate anti-chopped-notes requirements.
Research & Interesting Facts Agent official-source fact ledger.
Teleprompter Polish Agent conversation-flow rules.
QA additions for research, official sources, fact-checking, interesting information, and conversation flow.
```

## New Algorithm Behavior

Every full script must now include:

```text
1. A deep research pass when the topic has factual, usage, historical, product, or current-pattern claims.
2. Official or primary sources first whenever available.
3. Forums/comments/social posts only as audience-pain signals unless independently verified.
4. A fact ledger:
   claim / source type / confidence / script beat / keep-soften-cut.
5. 3-7 interesting facts, usage observations, or cultural/contextual details.
6. Smooth conversational transitions between beats.
7. QA checks for research depth, fact-checking, interesting information, and conversation flow.
```

## Failure Conditions

The script must loop back if:

```text
research is missing;
interesting facts are unsupported;
official sources were available but ignored;
the video feels like a dry grammar checklist;
the script is chopped into tiny disconnected lines;
facts interrupt the lesson instead of deepening it;
the ad breaks the conversational flow.
```

## Files Updated

```text
LINGMAN_MASTER_PROMPT.md
LINGMAN_AGENT_OFFICE_PIPELINE.md
LINGMAN_ALGORITHM_UPGRADE_002_RESEARCH_FLOW.md
```

## Next Required Behavior

```text
The existing Script 002 can be used as a base, but under the upgraded algorithm it should receive a research-rich conversational rewrite before publication.
That rewrite should add source-backed usage notes, more natural story flow, and fewer chopped sentence breaks.
```

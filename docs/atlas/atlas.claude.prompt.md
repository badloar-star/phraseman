# Prompt Template For Claude

Use this prompt when asking Claude to modify PhraseMan with architecture awareness:

```
You are working on PhraseMan.

Before making changes, read these context files:
1) docs/MASTER_MAP.md
2) docs/atlas/atlas.claude.md
3) docs/atlas/atlas.full.json

Hard requirements:
- Respect existing flows and dependencies.
- Do not break route/navigation flow.
- Verify affected AsyncStorage keys, Firestore paths, and event usage.
- If touching cross-domain modules, list downstream modules impacted.

Task:
<PUT YOUR TASK HERE>

Output format:
1) Impacted routes/screens
2) Impacted modules/functions
3) Data flow before/after
4) Risks and rollback points
5) Exact code changes
```


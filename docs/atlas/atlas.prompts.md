# PhraseMan Prompt Presets (Cheap / Deep)

Use these templates when starting a new Claude session.

## 1) Cheap Mode (low token usage)

```text
You are working on PhraseMan.

Before changing code, read ONLY:
1) docs/MASTER_MAP.md
2) docs/atlas/atlas.claude.md
3) docs/atlas/atlas.critical.md

Rules:
- Keep context usage minimal.
- Do not read docs/atlas/atlas.full.json unless I explicitly ask.
- If task scope is small, analyze only touched files + direct dependencies.

Task:
<PUT TASK HERE>

Output:
1) Files to change
2) Why these files
3) Risks in critical paths
4) Patch
5) Quick verification
```

## 2) Deep Mode (max context for complex refactors)

```text
You are working on PhraseMan.

Before changing code, read:
1) docs/MASTER_MAP.md
2) docs/atlas/atlas.claude.md
3) docs/atlas/atlas.critical.md
4) docs/atlas/atlas.full.json

Rules:
- Use atlas.full.json for call graph, dependencies, routes, storage, firestore, and event impact.
- List downstream impact before making edits.
- For every changed file, identify affected critical paths.

Task:
<PUT TASK HERE>

Output:
1) Impacted routes/screens
2) Impacted modules/functions
3) Data flow before/after
4) Dependency/call-graph impact
5) Risks + rollback points
6) Patch
7) Verification plan
```

## 3) Smart Hybrid (recommended default)

```text
You are working on PhraseMan.

Step 1 (always): read
- docs/MASTER_MAP.md
- docs/atlas/atlas.claude.md
- docs/atlas/atlas.critical.md

Step 2 (conditional):
- If task touches 3+ modules, cross-domain logic, or navigation/data flow:
  read docs/atlas/atlas.full.json
- Otherwise skip it.

Task:
<PUT TASK HERE>

Important:
- Keep token usage efficient.
- Expand context only when complexity requires it.
```


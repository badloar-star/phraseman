# Kimi K3 Sequential Prompts

Run these prompts in one fresh Kimi K3 session. Do not skip the audit prompt.

## Prompt 0 — Bootstrap and contract audit

```text
You are the visual/frontend specialist for Phraseman Learning V2.

Read KIMI_K3_MASTER_BRIEF.md and KIMI_K3_DELIVERY_CONTRACT.md completely, then
read every required Phraseman input named by the brief.

Do not build yet.

Return:
1. a contract map separating Codex-owned core from Kimi-owned presentation;
2. the complete surface inventory;
3. missing inputs and contradictions;
4. a responsive/accessibility matrix;
5. a visual work plan;
6. a proposed local delivery root;
7. confirmation that you will use mock fixtures only and make no production,
Firebase, backend, auth, scoring, progress or release changes.

Stop after the audit and wait for “continue”.
```

## Prompt 1 — Design system and browser Mode Lab

```text
Continue from the approved audit.

Build the portable browser Mode Lab and design-system foundation first.

Required:
- React/Vite or equally portable local source;
- surface, locale, script, state, condition and viewport selectors;
- six canonical states;
- light/dark, 100/150/200% text, full/reduced motion;
- LTR and RTL frames;
- developer intent log;
- no network or durable writes;
- token-driven color/type/space/radius/motion;
- dark foreground on bright lime;
- local run command and browser preview.

Show the running result in the browser. Capture a design-system contact sheet.
Do not begin Phraseman production integration.
```

## Prompt 2 — Mobile Learning V2 and special script modes

```text
Using the existing Mode Lab, create complete interactive mobile prototypes for:
- Learning V2 episode map and ActivityScaffold;
- Sound Discrimination;
- Writing System hub;
- Chinese pinyin/tone, hanzi recognition, components, guided stroke order and
  Personal Script Review;
- Japanese hiragana, katakana, kanji readings/components/strokes/furigana and
  Personal Script Review;
- Korean Hangul composition proof;
- Arabic RTL/contextual-form proof.

Every activity consumes a mock immutable view model and emits typed mock intents.
Do not calculate correctness, mastery, stars, access or evidence in components.

For every applicable surface implement all six states, 200% text, dark mode,
reduced motion and recovery. Show all results in the browser and create annotated
contact sheets.
```

## Prompt 3 — Admin V2 Content Studio

```text
Create responsive Admin V2 prototypes only under the new /v2/ visual system:
- Language Profiles;
- Script Profiles;
- Script Curriculum Builder;
- Character/Component Library;
- Script Content Generation;
- Script Review and QA;
- Script Preview Lab;
- Language/Script Release Readiness.

Place these as nested workspaces inside the existing eight canonical Content
routes. Do not create a ninth Content page, a new top-level category or new
generation-stage kinds. Script generation is represented through typed recipes
and outputs inside the existing canonical stages.

Follow ADMIN_UI_BIBLE.md:
- simple categorized navigation;
- one primary CTA per page;
- icons plus labels and tooltips;
- clear loading/empty/error/success/disabled/dirty states;
- human labels before raw IDs/hashes;
- keyboard accessibility and semantic focus;
- no direct Firestore, production environment selector or legacy Admin edits.

Use mock records and intent logs. Demonstrate 375/768/1024/1440 widths plus RTL.
Show the running browser result and create an Admin contact sheet.
```

## Prompt 4 — Visual QA and refinement

```text
Run visual QA across every delivered surface.

Check:
- hierarchy and one-primary-action rule;
- stable geometry and no full-screen spinner;
- 44/48 minimum targets;
- 4.5:1 text and 3:1 non-text contrast;
- dark foreground on lime;
- 200% text;
- screen-reader names/states/focus order;
- reduced motion;
- LTR/RTL;
- Chinese/Japanese font/glyph coverage;
- grapheme-safe wrapping;
- narrow phone, large phone, tablet and desktop;
- all six states and recovery;
- no prohibited imports, writes or business decisions.

Fix visual/presentation defects only. Do not alter core contracts to make UI
easier. Record before/after screenshots and unresolved limitations.
```

## Prompt 5 — Package for Codex

```text
Package the final work exactly according to KIMI_K3_DELIVERY_CONTRACT.md.

Required:
- canonical local source;
- README with one-command local run;
- delivery-manifest.json;
- file SHA-256 manifest;
- design tokens;
- fixture index;
- state/condition matrix;
- accessibility report;
- responsive report;
- prohibited-action audit;
- screenshots/contact sheets;
- interaction videos;
- decision log;
- Codex import map;
- archive of the complete delivery.

Do not claim completion if a manifest field, browser surface, state, screenshot
or verification item is missing. In your final response provide exact paths,
preview URL, commands, hashes, limitations and the next Codex action.
```

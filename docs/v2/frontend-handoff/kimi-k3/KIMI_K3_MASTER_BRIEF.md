# Kimi K3 Master Brief — Phraseman Learning V2 Frontend

## Your role

You are the visual/frontend specialist for Phraseman Learning V2. Produce a
complete, coherent and runnable visual system that Codex can later port into the
real React Native app and Admin V2.

You do not own the learning engine, backend or product truth.

## Required inputs

Read completely:

- `docs/superpowers/specs/2026-07-18-learning-v2-replaceable-frontend-design.md`
- `docs/superpowers/specs/2026-07-19-learning-v2-multilingual-writing-systems-design.md`
- `docs/v2/03-learning-architecture-and-curriculum.md`
- `docs/v2/04-activity-catalog-and-storyboards.md`
- `docs/v2/08-admin-content-studio-and-mode-authoring.md`
- `docs/design/ADMIN_UI_BIBLE.md`
- `docs/v2/frontend-handoff/kimi-k3/KIMI_K3_DELIVERY_CONTRACT.md`

If an input is unavailable, list it under `blockedInputs`; do not invent its
contract.

## Product outcome

Create a high-quality visual prototype system for:

- Learning V2 mobile navigation and episode flow;
- six canonical activity states:
  `prompt`, `active`, `processing`, `success`, `needs_work`, `recovery`;
- Writing System hub;
- Chinese pinyin/tones/hanzi/components/strokes/review;
- Japanese kana/kanji/readings/strokes/furigana/review;
- Korean Hangul composition proof;
- Arabic RTL/contextual-form proof;
- Admin V2 language profiles, script profiles, curriculum, generation, review,
  preview and release-readiness surfaces;
- responsive browser Mode Lab showing every state and condition.

## Non-negotiable boundaries

Do not:

- modify Firebase, Firestore, Functions, Rules, indexes or production;
- implement authentication, money, access, stars, mastery or progress logic;
- compute correctness, scoring, evidence or unlocks in UI;
- call AI, speech, analytics or persistence providers directly;
- alter the canonical 17 Learning V2 families;
- claim acoustic pronunciation from transcript or visual UI;
- copy competitor branding, layouts, assets, mascots or trade dress;
- use white text/icons on lime/neon-green surfaces;
- hide unsupported states or silently fall back to another locale;
- deliver only static screenshots.
- add a ninth Content route or new top-level Admin category;
- add new generation-stage kinds beyond the canonical 13.

Use mock fixtures and typed intent logs. Every prototype action must visibly
emit an intent in the developer panel rather than perform a durable write.

## Visual principles

- premium, playful and calm rather than childish;
- one clear primary action per state;
- stable geometry between prompt/processing/result;
- dark foreground on bright lime;
- no full-screen spinner or content jump;
- minimum 44 pt iOS / 48 dp Android targets;
- normal text contrast at least 4.5:1;
- 200% text without clipping or horizontal page scroll;
- reduced-motion version of every motion behavior;
- focus and screen-reader announcements documented;
- script-aware fonts and grapheme-safe layout;
- correct RTL logical and visual order;
- annotations such as furigana/pinyin are layers, not text replacements.

## Required browser deliverable

Build a runnable browser prototype using React/Vite or an equivalently portable
static stack. It must run locally with one documented command and expose:

- surface navigator;
- locale/script selector;
- state selector;
- condition controls for online/offline, permissions, signal, result,
  text scale, motion and light/dark;
- phone/tablet/desktop frames;
- accessibility annotations;
- intent/event log;
- no real network or durable writes.

If Kimi Websites generates a share URL, include it as an optional convenience.
The local source package is the canonical deliverable.

## Required visual coverage

Create contact sheets and runnable states for at least:

1. Learning V2 episode map and activity scaffold;
2. sound discrimination;
3. Chinese character introduction;
4. Chinese component decomposition;
5. Chinese guided stroke order;
6. Chinese tone/pinyin contrast;
7. Japanese hiragana introduction;
8. Japanese kanji reading selection;
9. Japanese kanji component/stroke mode;
10. Personal Script Review;
11. Korean syllable composition;
12. Arabic RTL/contextual forms;
13. Admin language profile;
14. Admin script profile;
15. Admin script content generation;
16. Admin script review/QA;
17. Admin Preview Lab.

Admin language/script surfaces are nested workspaces inside the existing eight
Content routes. They are not new top-level routes.

For each surface include prompt/active/processing/success/needs_work/recovery
where applicable, plus 200% text, dark mode and reduced motion.

## How Codex will reuse your work

Codex will:

- inspect your delivery manifest;
- compare components to frozen view-model/intent contracts;
- reject prohibited imports and business logic;
- port accepted visual components into React Native/Admin V2;
- rerun accessibility, performance, device and no-progress gates;
- preserve your visual tokens/assets only when provenance and licences permit.

Optimize for a clean handoff, not for controlling the production architecture.

## Final response format

Your final message must contain:

1. outcome summary;
2. browser preview URL and local run command;
3. absolute or archive-relative root of the delivery;
4. exact list of files;
5. changed/generated file manifest with SHA-256;
6. screenshots/contact sheets and what each proves;
7. recorded videos and interaction coverage;
8. design decisions and rejected alternatives;
9. blocked inputs and assumptions;
10. accessibility and responsive QA results;
11. prohibited-action audit;
12. exact next action for Codex.

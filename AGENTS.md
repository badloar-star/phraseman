# Project Rules

## Admin UI Bible

- Before changing `admin/index.html`, admin navigation, admin controls, banners, update modals, remote-config panels, or any new admin screen, read `docs/design/ADMIN_UI_BIBLE.md` first and follow it as the source of truth.
- Admin UI must stay simple, categorized, icon-supported, tooltip-rich, accessible, and free of visual clutter. Do not add admin buttons, colors, overlays, menus, or text patterns that violate the Bible.

## MAYMAY — CapCut phrase/TTS pipeline

- If the user mentions **"MAYMAY"**, "меймей", "найди пайплайн меймей", or asks for a new MAYMAY video/package,
  read `content/MAYMAY.md` FIRST and follow its step-by-step instructions exactly.
- MAYMAY builds 30 short English-learning CapCut videos from 30 sets of 20 phrase/preposition/phrasal-verb items,
  generates OpenAI TTS audio, and produces ready CapCut JSON while preserving all template timing, positions, styles,
  and element counts except the explicitly replaced audio/text.

## MASON — content scriptwriter pipeline

- If the user mentions **"MASON"**, "мейсон", "подними мейсон", or "пишем новый ролик", load the
  content pipeline: read `content/MASON.md` FIRST and follow its step-by-step instructions exactly.
- MASON writes ready-to-voice short-video scripts (RU, Clarkson's-Farm style) about building Phraseman.
  All its state lives in `content/` (MASON.md, DOSSIER.md, CLARKSON_STYLE.md, scripts/). It is
  self-contained — any AI in any session continues from those files.

## BUYER RADAR — revenue article/carousel pipeline

- If the user mentions **"BUYER RADAR"**, "баер радар", "buyer radar", buyer-search content, revenue carousels,
  or asks for Phraseman buyer-finding articles/carousels, read `docs/pipelines/buyer-radar-revenue-intelligence-pipeline.ru.md`
  and `docs/pipelines/buyer-radar-editorial-bible.ru.md` FIRST.
- All BUYER RADAR articles and carousels must follow the editorial bible: first slide instantly signals language learning,
  every slide advances a research-backed contradiction, and the last slide uses a closing contradiction plus
  "Ссылка на приложение Phraseman — в био."

## UI Contrast Rule

- On lime/salad/neon-green filled surfaces such as `t.accent`, `t.correct`, bright green badges, pills, and CTA buttons, use dark/black foreground (`t.correctText`, `#07110A`, or similarly dark text/icons), never white.
- Future UI generation must preserve this contrast rule across screenshots, badges, CTAs, tabs, paywalls, generated components, and design fixes unless the green surface is deliberately darkened enough for white to pass contrast.

## Session Performance And Context Budget

- Keep every session lean. Do not bulk-read, summarize, index, or paste large directory trees unless the current user request explicitly needs them.
- Treat generated output, runtime state, screenshots, image/audio/video assets, archives, caches, logs, native build output, package manager output, and previous agent/session state as out of context by default.
- Before using broad file discovery, prefer targeted `rg` searches with globs that exclude heavy areas such as `node_modules/`, `.git/`, `.codex*/`, `.claude*/`, `.superpowers/`, `.artifacts/`, `.logs/`, `docs/reports/`, `maestro-results/`, `assets/images/`, `admin/avatars/`, `android/.gradle/`, `android/app/build/`, `dist/`, `builds/`, `exports/`, `lingman-*`, and `subscription-recovery/`.
- Do not run broad Jest suites, whole-project typechecks, global asset scans, or recursive report generation as an automatic session habit. Run only the narrow verification needed for the active task unless the user explicitly asks for a broad gate.
- Do not start background workers, MCP servers, swarm/agent daemons, memory sync jobs, Telegram relays, auto-installers, or hook-based automation during normal sessions. Start them only for a request that explicitly needs that service, then stop them before finishing.
- Compact regularly in long sessions. If the active conversation becomes large, after major milestones, after broad logs/test output, or before starting a new unrelated task, compact/summarize the session and continue from the compacted state.
- Never keep huge command output in the active response context. Summarize the important lines and write bulky logs only to ignored temp/report directories.
- When the user reports slowness, first check active processes, Codex/VS Code log database size, hook configuration, and temp/plugin caches before touching app functionality.

## Codex Bulk Image Safety

- Do not run large DALL-E/image-generation batches through Codex's in-thread image generation because every base64 image result is stored in `.codex/sessions/*.jsonl` and can crash Codex with `RangeError: Invalid string length`.
- For collection cards, thumbnails, captions, or other bulk visual generation, use a file-based script/API pipeline that writes images, prompts, captions, manifests, and checkpoints to ignored folders such as `.codex-tmp/`, `output/`, `qa-artifacts/`, or the intended asset directory.
- Wrap long-running generators with `node scripts/codex-safe-run.mjs -- <command>` so stdout/stderr go to log files and Codex receives only short progress summaries.
- When extracting images already generated inside Codex, use `node scripts/export-codex-dalli-results.mjs --rollout <path> --summary`; the full record report must stay in `.codex-tmp/collectibles-dalli/reports/`, not in stdout.
- Before continuing a session that already generated many images, export the existing `image_generation_end` results, confirm the exported files/checkpoints, then continue in a fresh or compacted session. Preserve the original rollout file until the export has been verified.

## New Theme / Per-Theme Asset Hygiene

- When adding a new theme (e.g. `business`) or generating per-theme art, an asset is allowed to exist in `assets/images/**` only if it is wired into a static `require()` in app source (theme→asset maps such as `app/home_menu_icons.ts`, `app/quizzes/medal_assets.ts`, per-feature visual maps, etc.). Generating a `*-<theme>.webp` (or a `assets/images/<feature>/<theme>/*` file) that no `require()` references is wasted bundle weight — do not do it.
- Wire first, generate second: before generating a theme's asset set, confirm each target slot has a `require()` line (or add the lines in the same change). Every generated file must map 1:1 to a slot the running app actually loads. Do not generate "extra" variants (alternate crops, unused sizes, speculative future slots) into the bundled `assets/images/**` tree.
- Match the existing theme's slot list exactly. A new theme must produce the SAME set of asset keys as the established themes for that feature — no more (extra files bloat the bundle), no fewer (missing files crash at runtime). If a slot does not apply, leave the map fallback, don't ship a dead file.
- Keep raw generation sources OUT of the bundled set. DALL-E originals / contact sheets / intermediate crops go in `*sources*`, `dalle_sources`, `singles`, `output/`, or `qa-artifacts/` — never loose in `assets/images/<feature>/` where they look bundled. Only the final, wired, compressed webp belongs there.
- Compress every new bundled image before committing (webp, quality ~58–80 via `sharp`, alpha preserved). Do not commit a freshly generated png/webp at generator-default quality.
- Periodic audit: an image in `assets/images/**` (excluding raw/source dirs) whose path-tail or basename appears in NO source file under `app/components/constants/hooks/contexts/lib/modules` is unused and may be removed. Verify with a literal basename search across those dirs (the project uses ONLY static `require()` path strings — no dynamic/template asset requires — so a path/basename-presence check is reliable). Always confirm zero references and back up before deleting.

## Do Not Delete Functionality Without Explicit Request

- Never remove, disable, hide, bypass, or replace an existing feature, screen, button, flow, state, storage key, API contract, asset mapping, test coverage, or user-visible behavior as a side effect of fixing another issue.
- A request to "fix", "repair", "adjust", "make it work", "improve", "refactor", or "clean up" is not permission to delete functionality.
- Deletion is allowed only when the user explicitly names the exact thing to delete or remove, for example: "delete the Premium text on the VIP card" or "remove this button".
- If a fix seems easier by removing functionality, keep the functionality and fix the broken behavior instead.
- If two existing features conflict and one appears impossible to preserve, stop and report the conflict before editing. Do not choose a deletion yourself.
- When editing shared UI, image/icon systems, navigation, localization, purchases, account deletion, gifts, stats, league, chat, lessons, or onboarding, preserve existing capabilities unless the current user request explicitly says to remove a specific capability.

## Auth Identity And Account Deletion Invariants

- Before changing auth/account flows, read this section. It applies to `app/auth_provider.ts`, `app/cloud_sync.ts`, `functions/src/auth_identity.ts`, `functions/src/account_delete.ts`, `firestore.rules`, auth modals, and their tests.
- Provider sign-in must not use a client Firestore transaction to create/update `users/*` or `auth_links/*`. Stable-link writes and repair belong on server callables. A return of `transaction_[firestore/permission-denied]` from `signInWithProvider` is a regression.
- `auth_links/{providerUid}` is the provider identity anchor. If server/callable discovers an existing provider-linked `stableUid`, it wins over the local anonymous `stable_id`; do not silently create a new account from an unverified Firestore fallback.
- `deleteAccountAndWipe()` intentionally starts `deleteCloudData()` in the background, then signs out, wipes local account data, clears `stable_id`, and writes the local `account_delete_pending_auth_v1` guard. Do not make account deletion wait synchronously on the cloud delete before local exit.
- `signInWithProvider()` must check `readAccountDeletePendingAuth(firebaseProviderUid)` immediately after `signInWithCredential` and before reading/writing `auth_links`. If the same provider UID is still pending deletion, it must `signOutCurrentProvider()`, best-effort `ensureAnonUser()`, and return `account_delete_pending` without writing Critical App Health.
- Account switch/reset flows must use `signOutAndWipeForAccountSwitch()` rather than composing `signOutCurrentProvider()`, `clearStableId()`, and `ensureAnonUser()` manually; otherwise old account data can leak into a new account.
- When touching this area, run the narrow guards: `tests/auth_provider_stable_link.test.ts`, `tests/account_delete_flow_contract.test.ts`, `tests/firestore_rules_security.test.ts`, `tests/stable_id.test.ts`, and `tests/auth_identity_anon_relink.test.ts`.

## Tests Are Read-Only Guards

- Tests must report failures; they must not rewrite app source, tests, configs, assets, generated source, storage contracts, or snapshots as part of a normal test run.
- A passing test run is not permission to auto-apply the state captured by that test. If a test finds drift, report the drift and let the user decide what to change.
- Do not run snapshot update, fixture update, codemod, generator, repair, migration, or "fix" scripts from a test unless their writes are confined to an ignored temp/report directory such as `.codex-tmp/`, `tmp/`, `coverage/`, `.artifacts/`, `.logs/`, `docs/reports/`, `docs/gustav/runs/`, `maestro-results/`, or `qa-artifacts/`.
- If a test needs a fixture, create it in a temp/report directory during the test. Never write fixture state into `app/`, `components/`, `constants/`, `hooks/`, `assets/`, `scripts/`, `tools/`, `functions/`, `tests/`, or root config files.
- If a generator or repair script must update source, it must be a separate explicit command, not part of `npm test`; default to dry-run/report mode and require a clear user request before applying changes.
- Root and Functions Jest use `tests/setup_jest_write_guard.js` to block accidental source writes, including inherited Node child processes. Only bypass it for intentional maintenance with `PHRASEMAN_ALLOW_SOURCE_WRITES=1`, and state that explicitly.

## CapCut Draft Safety Protocol

- Before any read/write repair, generation, or timeline mutation of a native CapCut draft, check for running `CapCut` processes.
- If CapCut is open and the task requires draft file edits, close CapCut yourself before writing. First try a normal close through the main window, wait for autosave to settle, then terminate remaining `CapCut` helper processes only if they do not exit.
- Never edit `draft_content.json`, `template-2.tmp`, `draft_meta_info.json`, `draft_biz_config.json`, `timeline_layout.json`, `Timelines/*/draft_content.json`, or CapCut resource mappings while any `CapCut` process is still running.
- After CapCut is fully closed, create a timestamped backup of the current project folder or every file that will be changed before making edits.
- After edits, mirror native draft changes consistently across root draft files and `Timelines/<draft-id>/draft_content.json`, then run structural gates before reopening or reporting completion.
- Do not leave the user responsible for closing CapCut unless the close operation fails or the user explicitly asks to keep it open.

## Lingman Named Pipeline

- When the user says "Lingman", "Professor Lingman", or "lingman pipeline", invoke the `lingman` skill and use `lingman-scenarist-pipeline/` as the source of truth for YouTube script, lesson package, title/thumbnail, rewrite, audit, and DOCX scenarist work.
- Every user manual correction to a generated lesson/video/package is a generation-rule update by default. When the user says they changed, fixed, disliked, corrected, or manually adjusted anything, preserve their current edit as sacred project context and add the underlying rule to the relevant generation rules, pipeline notes, builder comments, or QA gate if that rule is not already present. Do this even if the user does not explicitly ask to update rules. Future generations must follow the new rule instead of repeating the old behavior.
- CapCut lesson text must never rely on automatic wrapping that can split a word. For every generated or replaced on-screen text, insert manual line breaks only at spaces or clear phrase boundaries before applying it to CapCut. If a word or line still cannot fit, shorten or rephrase the text; never allow mid-word line breaks in Russian, English, IPA, captions, CTA, intro, or transition text.
- CTA/STA text in CapCut must always use Cyrillic-safe text writing and a Cyrillic-capable font. The generation gate must fail on literal `????`, replacement characters, mojibake such as `Ð`/`Ñ`, or unsupported-font rendering in CTA/STA text. Restoring CTA/STA text must not touch phrase timing, audio, or backgrounds.
- The current-good Cepicepi CapCut state is locked in `.codex-tmp/capcut-backups/ЦЕПИ ЦЕПИ ЦЕПИ (1).LOCKED-GOOD-CURRENT-20260605_162149` with manifest `exports/chains/cepicepi_next_chains_a1a2_20260605/LOCKED_GOOD_CURRENT_STATE.json`. Treat that exact state as the baseline for future Cepicepi generation and repair work; do not alter CTA/STA text, background behavior, timing, audio, or text layout unless the user explicitly requests that exact change.
- Chains CapCut background videos must be real semantic video assets selected for the exact current phrase meaning from open-source stock APIs such as Pexels and Pixabay. Never fill phrase backgrounds with intro clips, generic placeholders, one broad query repeated across many phrases, or a small set of clips duplicated through the lesson. The generation gate must report the query, provider asset id, source title/tags when available, local file path, and source reuse count; it must fail when a background is not phrase-specific or when reuse exceeds the explicit cap for that run. The gate must also fail if any CapCut background material has no resolvable `path` or draft-placeholder `media_path`, if any phrase background segment is transparent or faded out, or if any visible preset/intro/template overlay such as `My presets` covers the phrase background area after the intro boundary.
- For Chains 800 phrase/video packages, all 800 phrases must be unique. Do not build an 800-row package by repeating, cycling, paraphrase-cloning, or expanding a smaller phrase set. The gate must fail unless there are 800 distinct English phrases and 800 distinct Russian translations after normalization.
- For Lingman thumbnail/preview work, always inspect `lingman-scenarist-pipeline/THUMBNAIL_GENERATION_RULES.md` first and use `C:\Users\badlo\OneDrive\Desktop\preview examples` plus `lingman-scenarist-pipeline\thumbnail_reference_bank\every_pack_9_styles_20260531\source_screenshots` as the mandatory inspiration source. Future 9-thumbnail packs must cover the five saved reference families 1-2 times each, use DALL-E/AI generated raster finals only, keep Russian-channel visible text in Russian, and pass a contact-sheet gate before saying "готово".
- For VENGA 200-phrase language variants, also inspect `lingman-scenarist-pipeline\youtube_packages\venga_a1_200_20260531_pack2_ru_only\READY_YOUTUBE_PACK\contact_sheet.jpg` as the golden previous-pack quality baseline. Do not accept weak one-word labels or generic AI cards just because they pass technical checks; the new pack must be at least comparable in hook strength, density, composition, and style match.

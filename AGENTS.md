# Project Rules

## Session Performance And Context Budget

- Keep every session lean. Do not bulk-read, summarize, index, or paste large directory trees unless the current user request explicitly needs them.
- Treat generated output, runtime state, screenshots, image/audio/video assets, archives, caches, logs, native build output, package manager output, and previous agent/session state as out of context by default.
- Before using broad file discovery, prefer targeted `rg` searches with globs that exclude heavy areas such as `node_modules/`, `.git/`, `.codex*/`, `.claude*/`, `.superpowers/`, `.artifacts/`, `.logs/`, `docs/reports/`, `maestro-results/`, `assets/images/`, `admin/avatars/`, `android/.gradle/`, `android/app/build/`, `dist/`, `builds/`, `exports/`, `lingman-*`, and `subscription-recovery/`.
- Do not run broad Jest suites, whole-project typechecks, global asset scans, or recursive report generation as an automatic session habit. Run only the narrow verification needed for the active task unless the user explicitly asks for a broad gate.
- Do not start background workers, MCP servers, swarm/agent daemons, memory sync jobs, Telegram relays, auto-installers, or hook-based automation during normal sessions. Start them only for a request that explicitly needs that service, then stop them before finishing.
- Compact regularly in long sessions. If the active conversation becomes large, after major milestones, after broad logs/test output, or before starting a new unrelated task, compact/summarize the session and continue from the compacted state.
- Never keep huge command output in the active response context. Summarize the important lines and write bulky logs only to ignored temp/report directories.
- When the user reports slowness, first check active processes, Codex/VS Code log database size, hook configuration, and temp/plugin caches before touching app functionality.

## Do Not Delete Functionality Without Explicit Request

- Never remove, disable, hide, bypass, or replace an existing feature, screen, button, flow, state, storage key, API contract, asset mapping, test coverage, or user-visible behavior as a side effect of fixing another issue.
- A request to "fix", "repair", "adjust", "make it work", "improve", "refactor", or "clean up" is not permission to delete functionality.
- Deletion is allowed only when the user explicitly names the exact thing to delete or remove, for example: "delete the Premium text on the VIP card" or "remove this button".
- If a fix seems easier by removing functionality, keep the functionality and fix the broken behavior instead.
- If two existing features conflict and one appears impossible to preserve, stop and report the conflict before editing. Do not choose a deletion yourself.
- When editing shared UI, image/icon systems, navigation, localization, purchases, account deletion, gifts, stats, league, chat, lessons, or onboarding, preserve existing capabilities unless the current user request explicitly says to remove a specific capability.

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
- For Lingman thumbnail/preview work, always inspect `lingman-scenarist-pipeline/THUMBNAIL_GENERATION_RULES.md` first and use `C:\Users\badlo\OneDrive\Desktop\preview examples` plus `lingman-scenarist-pipeline\thumbnail_reference_bank\every_pack_9_styles_20260531\source_screenshots` as the mandatory inspiration source. Future 9-thumbnail packs must cover the five saved reference families 1-2 times each, use DALL-E/AI generated raster finals only, keep Russian-channel visible text in Russian, and pass a contact-sheet gate before saying "готово".
- For VENGA 200-phrase language variants, also inspect `lingman-scenarist-pipeline\youtube_packages\venga_a1_200_20260531_pack2_ru_only\READY_YOUTUBE_PACK\contact_sheet.jpg` as the golden previous-pack quality baseline. Do not accept weak one-word labels or generic AI cards just because they pass technical checks; the new pack must be at least comparable in hook strength, density, composition, and style match.

# Project Rules

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

## Lingman Named Pipeline

- When the user says "Lingman", "Professor Lingman", or "lingman pipeline", invoke the `lingman` skill and use `lingman-scenarist-pipeline/` as the source of truth for YouTube script, lesson package, title/thumbnail, rewrite, audit, and DOCX scenarist work.

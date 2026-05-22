# Heisenberg Release Manual Smoke - Interface Languages

Date: 2026-05-20

Scope: release activation and manual smoke for `pt-BR`, `vi`, `id`, `tr`, `pl`, plus regression spot checks for `ru`, `uk`, `es`.

## Current Gate Status

- Static activation: `pt-BR`, `vi`, `id`, `tr`, `pl` are active/selectable interface locales.
- Physical Maestro smoke status: Java fixed locally; iOS XCUITest driver is currently unstable on the second simulator (`127.0.0.1:7001` disconnects during flow execution).
- English study target material must remain unchanged.
- No language-mixing fixes are allowed without explicit locale branches.
- If a runtime surface has only legacy `ru/uk/es` cloud data, log it as a release caveat instead of silently treating it as complete.

## Automated Gates To Re-run Before Release

- `npx tsc --noEmit --pretty false --skipLibCheck`
- `git diff --check`
- `npm run heisenberg:ui-audit`
- `npm run heisenberg:semantic-audit:strict`
- `npm run heisenberg:batch:audit:strict`
- `npm test -- --runTestsByPath tests/i18n_helpers.test.ts tests/heisenberg_ui_locale_audit.test.ts tests/heisenberg_semantic_audit.test.ts tests/heisenberg_pipeline.test.ts tests/trainer_modes.test.ts tests/admin_personal_trainings.test.ts tests/share_locale_lesson_celebration.test.ts --runInBand`

## Language Switch Smoke

Repeat for each locale: `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`.

1. Launch app fresh.
2. Open Settings.
3. Open language screen.
4. Verify the target language row is unlocked and tappable.
5. Select the language.
6. Return to Settings.
7. Kill/reopen app.
8. Verify selected language persists.
9. Verify no lock icon appears for `pt-BR`, `vi`, `id`, `tr`, `pl`.

Expected rows/testIDs:

- `settings-language-row-ru`
- `settings-language-row-uk`
- `settings-language-row-es`
- `settings-language-row-pt-BR`
- `settings-language-row-vi`
- `settings-language-row-id`
- `settings-language-row-tr`
- `settings-language-row-pl`

## Full Manual Route Matrix

Repeat the route smoke below for every active locale.

1. Onboarding: language picker, name entry, goals, intensity, level, plan, reminders, finish.
2. Home: daily state, streak/xp cards, arena entry, flashcards entry, premium entry.
3. Lessons tab: list, locked/unlocked labels, lesson 1 row, lesson menu.
4. Lesson 1 full phrase pass: physically advance all 50 phrase prompts; verify target English phrase remains English and interface/help/feedback uses selected locale.
5. Lesson words: dictionary list, learn-word card, correct/wrong feedback, exit and resume.
6. Verbs/prepositions where visible: labels, empty states, CTA text.
7. Quizzes: level select, question, feedback, result, retry.
8. Trainer: hub, phrases queue, words queue, smart trainer, empty state.
9. Flashcards: collection, card details, swipe session, marketplace/paywall.
10. Premium/paywall: benefits, CTA, restore, close, all legal/price labels.
11. Settings: profile, theme, language, invite friend, support, privacy, terms, delete account.
12. Inbox/app messages: empty state and message/poll state if seeded.
13. Admin/dev screens only when dev mode is enabled: personal trainings, tester tools, premium grant.

## Phrase-Level Lesson 1 Checklist

For each selected locale:

- Start lesson 1 from Lessons tab.
- For prompts 1-50, record: phrase number, English target text, localized instruction/feedback language, answer state, visual overlap.
- Fail at least 3 prompts intentionally and verify wrong feedback language.
- Use hint/help once and verify selected locale.
- Complete lesson and verify lesson-complete/share copy language.

## Findings Log

Use this format while smoking:

| Locale | Route | Finding | Severity | Fix |
| --- | --- | --- | --- | --- |
| pt-BR | Pending physical smoke | Not started yet | P0 before release claim | Run device pass |
| vi | Pending physical smoke | Not started yet | P0 before release claim | Run device pass |
| id | Pending physical smoke | Not started yet | P0 before release claim | Run device pass |
| tr | Pending physical smoke | Not started yet | P0 before release claim | Run device pass |
| pl | Pending physical smoke | Not started yet | P0 before release claim | Run device pass |

Environment blocker:

| Tool | Status | Evidence | Required action |
| --- | --- | --- | --- |
| Java Runtime | Fixed locally | `JAVA_HOME=.codex-tools/java/jdk-21.0.11+10/Contents/Home`, `maestro --version` returns `2.5.1` | Use this `JAVA_HOME` for Maestro commands |
| Second simulator | Ready | `iPhone 17 Pro Max` booted, `app.phraseman` installed | Continue smoke here |
| Maestro iOS driver | Blocked | `Failed to connect to /127.0.0.1:7001` during XCUITest view hierarchy reads | Stabilize/reinstall XCUITest driver or run equivalent manual pass |

## Added Automation Flow

- `maestro/flows/dev_only/heisenberg_language_unlock_matrix.yaml`

Purpose: open the dev client on the second simulator, enter Settings -> Language, verify `pt-BR`, `vi`, `id`, `tr`, `pl` rows, and tap every row.

Command:

```bash
JAVA_HOME=.codex-tools/java/jdk-21.0.11+10/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
maestro test --udid 5B31CAAD-5382-416C-ACCB-73E4F923E128 \
  --debug-output maestro-results/heisenberg-language-unlock \
  maestro/flows/dev_only/heisenberg_language_unlock_matrix.yaml
```

## Release Decision Rules

- Static gates green is enough to say the languages are unlocked and build-time validated.
- Production marketing by country requires at least one complete physical smoke pass per country language, including Lesson 1 all 50 phrases and Settings/Paywall/Legal.
- Any mixed-language UI, untranslated CTA, broken route, clipped text, or English interface fallback outside target material blocks marketing for that locale until fixed and re-tested.

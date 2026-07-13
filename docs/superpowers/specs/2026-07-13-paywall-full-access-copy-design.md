# Paywall full-access copy — design specification

**Date:** 2026-07-13
**Status:** Awaiting final user review
**Scope:** Copy shown by the `course_after_lesson3` premium-paywall context

## Objective

Replace the narrow promise about opening only the current course level with a clear full-access value proposition.

## Approved Russian copy

- Title: `Открой полный доступ к Phraseman`
- Subtitle: `Plus открывает доступ ко всем урокам, безлимитную практику и все возможности Plus.`

The copy must not mention the current level or exams.

## Behavior and boundaries

- Change copy only; do not change pricing, navigation, entitlement checks, lesson progression, or purchase behavior.
- Keep `course_after_lesson3` as the source context used by every active A/B/C paywall.
- Apply the same meaning to all eight supported locales so the context does not make different commercial promises by language.
- Preserve all unrelated context-specific paywall copy and benefits.

## Verification

- Add a focused contract assertion for the approved Russian title and subtitle before changing production copy.
- Confirm the assertion fails against the old current-level wording and passes after the copy update.
- Run the focused paywall-copy contract test and inspect the final diff for scope isolation.

# Task packet: LESSON-EXIT trace (lesson closes after 2-6 correct answers and goes home)

Governance-ID: TG-A0B4606041F1
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator §126 (2026-10-04)
Related epic/enabler: user report iPhone iOS 26.7, Plus, 03.10, three times in 25 minutes

## Outcome

Every exit path of the lesson screen writes a [LESSON-EXIT] record with the reason and the value that decided the branch, plus an unmount record; an exit without a matching exit record proves an external cause (router.replace from the layout). The next user report is diagnosable without guessing.

## Scope

In scope: new app/lesson_exit_trace.ts; log calls in app/lesson1.tsx (navigateUpFromLessonScreen, handleLessonHeaderBack, dismissEnergyModal, unmount); test.
Out of scope: app/_layout.tsx (foreign uncommitted edits, reported to coordinator); any behaviour change.

## Architecture

No architecture change: a small helper writes console.warn and a trackActivity event (writeToFirestore only for consenting users, existing path). No navigation logic touched.

## Security and privacy

Only lesson id, cell index, route flags and a reason string; no personal data. Existing analytics consent gate applies.

## Technical debt

- Contain: temporary diagnostic, to be reduced after the root cause is fixed; early-exit and catch logs stay permanently.

## Verification

Unit test for the helper; type check; the lesson screen behaviour unchanged.

## Rollback

Revert the commit.

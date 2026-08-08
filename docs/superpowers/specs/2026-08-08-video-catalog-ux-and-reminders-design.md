# Video catalog UX and reminder repair

## Goal

Make the in-app Video screen easy to scan and ensure an explicit tap on a premiere reminder works on a new installation.

## Screen layout

- The upcoming-premiere hero presents a clean 16:9 thumbnail at the top with only the small premiere state badge.
- A solid information panel directly below the thumbnail contains the title, countdown/date, and actions. The title and controls must never cover the thumbnail.
- The primary action opens the video. The secondary action sets a reminder. Both remain at least 48 dp high and retain accessible labels.

## Reminder flow

1. A tap on `Remind me` immediately requests native notification permission when it has not yet been granted.
2. If permission is granted, the app enables the notification path needed for this explicitly requested premiere and schedules the local notification.
3. If permission is blocked or denied, the app explains that a reminder was not set and offers the relevant system settings route only when it can help.
4. A failed schedule must be visible to the user rather than reported as successful.

## Catalog recovery

- Preserve and display the most recent valid catalog whenever a refresh fails.
- When there is no catalog to show, display a dedicated retry action in addition to pull-to-refresh.
- Disable duplicate retry requests while a retry is in progress and expose the action to assistive technology.

## Verification

- Contract tests cover the separated thumbnail/information structure, retry action, and immediate permission-first reminder sequence.
- Reminder unit tests cover the explicit opt-in path, permission denied/blocked outcomes, and scheduling failure.
- Run focused Jest suites and TypeScript checking after the changes.

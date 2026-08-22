# MAX Voice — physical device release matrix

Last updated: 2026-08-21

This matrix is the release record for MAX voice on real iOS and Android hardware. Automated source, unit, and render checks are prerequisites only: they do **not** count as a physical VoiceOver, TalkBack, audio-route, lifecycle, or large-text pass. Release sign-off stays blocked until every required row is `PASS` with a reproducible evidence link.

Allowed result values: `NOT RUN — physical device required`, `PASS`, `FAIL`, `BLOCKED`.

| ID | Device / setup | Required journey | Result | Evidence |
|---|---|---|---|---|
| IOS-SE-100 | iPhone SE-size device, default text | Consent → prepared lesson → start → learner/MAX turns → finish → durable review | NOT RUN — physical device required | pending |
| IOS-SE-200 | iPhone SE-size device, 200% text | Every title, status, caption, control, correction, tomorrow action, and memory control remains readable and reachable without clipping | NOT RUN — physical device required | pending |
| IOS-STD-100 | Standard iPhone, default text | Full happy path and explicit learner end intent | NOT RUN — physical device required | pending |
| IOS-LARGE-200 | Large iPhone, 200% text | Layout hierarchy, scrolling, captions, transcript sheet, and review details | NOT RUN — physical device required | pending |
| AND-SMALL-100 | Small Android phone, default text | Consent → prepared lesson → start → learner/MAX turns → finish → durable review | NOT RUN — physical device required | pending |
| AND-SMALL-200 | Small Android phone, 200% font size | Controls meet 48dp, text reflows, and no content becomes unreachable | NOT RUN — physical device required | pending |
| AND-STD-100 | Standard Android phone, default text | Full happy path and explicit learner end intent | NOT RUN — physical device required | pending |
| AND-STD-200 | Standard Android phone, 200% font size | Prestart, live call, transcript, review, and memory settings | NOT RUN — physical device required | pending |
| VO-IOS | iPhone with VoiceOver | Focus enters consent/review/error correctly; one owner announces call status; orb is decorative; every action has a useful name/state/hint | NOT RUN — physical device required | pending |
| TB-AND | Android with TalkBack | Focus order, switch state, modal escape/back, status announcements, and all actions are understandable without sight | NOT RUN — physical device required | pending |
| REDUCE-IOS | iPhone with Reduce Motion | No required information depends on pulsing/motion; transitions remain understandable | NOT RUN — physical device required | pending |
| REDUCE-AND | Android with animations disabled | No required information depends on pulsing/motion; transitions remain understandable | NOT RUN — physical device required | pending |
| AUDIO-IOS-BT | iPhone with Bluetooth headset | Route before start, mid-call route change, mute, MAX audio, interruption, and route restoration after finish | NOT RUN — physical device required | pending |
| AUDIO-IOS-WIRED | iPhone with wired/USB headphones | Input/output route, mute, MAX audio, and route restoration | NOT RUN — physical device required | pending |
| AUDIO-AND-BT | Android with Bluetooth headset | Route before start, mid-call route change, mute, MAX audio, interruption, and route restoration after finish | NOT RUN — physical device required | pending |
| AUDIO-AND-WIRED | Android with wired/USB headphones | Input/output route, mute, MAX audio, and route restoration | NOT RUN — physical device required | pending |
| LIFE-IOS | iPhone background → foreground during call | Grace period, truthful reconnect state, recovery or explicit failure, no false “listening” | NOT RUN — physical device required | pending |
| LIFE-AND | Android background → foreground during call | Grace period, truthful reconnect state, recovery or explicit failure, no false “listening” | NOT RUN — physical device required | pending |
| KILL-FINALIZE-IOS | Kill iOS app after conversation before finalization completes | Next launch drains local outbox once and opens the same durable review without repeating the call | NOT RUN — physical device required | pending |
| KILL-FINALIZE-AND | Kill Android app after conversation before finalization completes | Next launch drains local outbox once and opens the same durable review without duplicate memory mutation | NOT RUN — physical device required | pending |
| OFFLINE-IOS | Finish offline, kill app, reopen offline then reconnect | Pending review is explicit; local handoff remains bounded; reconnect produces the same receipt | NOT RUN — physical device required | pending |
| OFFLINE-AND | Finish offline, kill app, reopen offline then reconnect | Pending review is explicit; local handoff remains bounded; reconnect produces the same receipt | NOT RUN — physical device required | pending |
| RECONNECT-RECOVER | Network drop with recovery inside reconnect window | UI announces recovery state, audio owner is accurate, call resumes without duplicate charge/finalization | NOT RUN — physical device required | pending |
| RECONNECT-FAIL | Network drop with failed recovery | UI says connection failed, exposes Retry and Finish, never masks failure as “MAX thinks” or “Listening” | NOT RUN — physical device required | pending |
| LANG-8 | UI smoke: Russian, Ukrainian, Spanish, Brazilian Portuguese, Vietnamese, Indonesian, Turkish, Polish | Prestart, call states, errors, review, and memory settings use the selected UI language; Russian is never a fallback for another locale | NOT RUN — physical device required | pending |
| INPUT-IOS | iPad/iPhone with external keyboard, Voice Control, and Switch Control | All actions are focusable, named, operable, and not dependent on drag or timed gestures | NOT RUN — physical device required | pending |
| INPUT-AND | Android with external keyboard, Voice Access, and Switch Access | All actions are focusable, named, operable, and not dependent on drag or timed gestures | NOT RUN — physical device required | pending |

## Evidence required for PASS

For each row, record the device model, OS version, app build/commit, date, tester, and a screenshot or short recording. Accessibility rows also require a screen-reader recording with speech audible. Audio-route rows must name the headset and show the route transition. Lifecycle/finalization rows must include the resulting session ID and confirm exactly one durable review.

## Automated prerequisite gates

The repository checks cover static semantics, target sizes, the single call-status live region, one-shot completed-caption announcement, decorative orb behavior, large-text-safe caption layout, and the completeness of this matrix. They cannot verify native focus behavior, spoken order, Bluetooth routing, actual audio timing, or operating-system lifecycle behavior.

# Learning V2 — reference pattern readiness

Status: `capture_required`. This document is a requirements map, not competitor evidence and not UI approval.

## Selected modes

| Mode ID | Learning purpose | Shared-shell dependency |
| --- | --- | --- |
| `sound-discrimination` | Distinguish a bounded sound contrast before supported production. | `ChoiceShell`, `VoiceActivityShell` |
| `guided-phrase-pronunciation` | Hear, record, receive a bounded repair cue, and retry. | `VoiceActivityShell` |
| `prompted-translation-by-voice` | Speak a response, confirm the transcript, and submit or retry. | `VoiceActivityShell` |
| `contextual-dialogue-mission` | Complete supported turns before a freer response. | `ScenarioShell`, `VoiceActivityShell` |

## Exact state and condition axes

Every mode must map exactly the six canonical `PreviewState` values:
`prompt`, `active`, `processing`, `success`, `needs_work`, and `recovery`.

Conditions remain orthogonal to `PreviewState`: online/offline; microphone
granted/denied/unavailable; clean/noisy/silence/not-applicable signal; pass,
needs-work, uncertain, system-invalid, or not-applicable scorer outcome; full
or reduced motion; 100/150/200% text; light/dark theme. Permission, offline,
noise, theme, and text scale must never be invented as extra preview states.

## Capture and distinctiveness boundary

Implementation readiness requires lawful first-hand current captures with
platform/device, OS, app version/build, locale, learner level, account or
subscription state, capture date, provenance, rights/use note, raw SHA-256,
and separately redacted derivative paths where needed. Marketing-only or
official Tier B sources may corroborate a flow but cannot satisfy this gate.

Original Phraseman wireframes must use project copy, geometry, icons, color,
reward semantics, and motion. They must not depend on competitor logos, copy,
art, audio, proprietary lesson content, or trade dress. Accessibility review
must cover VoiceOver, TalkBack, 200% text, reduced motion, non-color feedback,
44 pt iOS / 48 dp Android targets, focus recovery, and a non-speech route where
speech is not an essential evidence requirement. Device claims remain
unverified until tested on physical devices.

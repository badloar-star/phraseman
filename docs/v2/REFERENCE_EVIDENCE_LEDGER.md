# Learning V2 — competitor UX evidence ledger (Task 3.0 draft)

Status: `provisional / approval required`. This is an evidence ledger and state inventory, not an approval to copy a competitor interface. Raw competitor screenshots are not stored in the repository; only source links and observations are recorded. A current first-hand capture with lawful account/device metadata is still required before `approved` can be set.

## Scope of the first evidence pack

Selected patterns for the voice-first pilot:

1. **Sound discrimination** — hear two similar sounds, choose same/different, then produce the target sound.
2. **Guided phrase pronunciation** — hear model, record, receive actionable sound-level feedback, retry.
3. **Prompted translation by voice** — speak a response instead of typing, inspect transcript, submit or retry.
4. **Contextual dialogue mission** — complete short turns with constrained support, then perform a freer response.
5. **Speaking Club mission** — bounded asynchronous/live prompt with consent, interruption, report and resume states.

## Source ledger

| ID | Product / pattern | Tier | Source | Observation | Missing / confidence |
|---|---|---|---|---|---|
| DUO-SOUND-01 | Duolingo pronunciation tab | B — official current | [Duolingo pronunciation lessons](https://blog.duolingo.com/duolingo-english-sounds-tab/) | Sound-focused tab presents ordered vowel/consonant units and exercises for identifying, distinguishing and matching sounds; pronunciation is separated from new vocabulary/grammar. | No first-hand build, locale, permission/offline/error captures. Medium. |
| DUO-SPEAK-01 | Duolingo voice input | B — official current | [Duolingo hidden speaking practice](https://blog.duolingo.com/sneaky-pronunciation-practice/) | A translation prompt can switch from typing to microphone input; speech is transcribed and can be edited before submission. | Feedback states and exact scoring are not established by this source. Medium. |
| DUO-PRACTICE-01 | Duolingo Practice tab | B — official current | [Duolingo Practice Hub](https://blog.duolingo.com/guide-to-duolingo-practice-hub/) | Practice hub exposes speaking and mistake-review routes as separate practice intents. | Current platform/build and complete failure sequence missing. Medium. |
| RS-COURSE-01 | Rosetta Stone speaking from lesson 1 | B — official help | [Rosetta Course help](https://resources.rosettastone.com/V4/help/en-US/Content/RSV4Help/RosettaCourse.htm) | Course documentation states speaking begins in the first lesson and speech recognition guides pronunciation. | Exact current mobile states, thresholds and retry UI missing. Medium/low. |
| ELSA-WORD-01 | ELSA word/phrase feedback | B — official current | [ELSA Instant](https://elsaspeak.com/en/elsa-instant/) | Learner hears a sample or records a word/phrase and receives immediate feedback; color signals are described as excellent vs needs work. | No lawful first-hand capture or complete error/resume states. Medium. |
| ELSA-SENTENCE-01 | ELSA sentence delivery | B — official current | [ELSA home](https://elsaspeak.com/en/new-homepage/) | Sentence delivery feedback is described across pronunciation, intonation and fluency; spontaneous speech adds vocabulary/grammar feedback. | Marketing page is not proof of every runtime state. Medium. |
| ELSA-ANALYZER-01 | ELSA speech analyzer | B — official current | [ELSA Speech Analyzer](https://speechanalyzer.elsaspeak.com/) | Flow is mic on → speak freely → transcript → analysis; categories include pronunciation, intonation, fluency, grammar and vocabulary. | Group/live permission, offline, deletion and recovery states missing. Medium. |

## Minimum storyboard state matrix

Every selected Phraseman mode must produce its own six-frame contact sheet plus the full state inventory below. `Observed` means directly captured; `Inferred` is a hypothesis; `Phraseman` is our proposed adaptation.

| State | Required evidence | Phraseman requirement |
|---|---|---|
| Entry / locked | source or marked unavailable | Show lesson/gate context and why the activity is available. |
| Instruction | source or marked unavailable | One clear action, model audio and accessible text alternative. |
| Idle prompt | source or marked unavailable | Stable hierarchy, mic affordance, permission preflight. |
| Active input | source or marked unavailable | Recording timer, cancel/stop, interruption-safe state. |
| Processing | source or marked unavailable | No ambiguous spinner; preserve last-known geometry. |
| Correct / high quality | source or marked unavailable | Actionable feedback and earned performance-star preview only after server receipt. |
| Partial / incorrect | source or marked unavailable | Specific repair cue, retry without shame or dead end. |
| Hint / fallback | source or marked unavailable | Scripted/non-voice route when capability or consent is unavailable. |
| Permission / offline / service error | source or marked unavailable | Explain cause, preserve attempt, provide retry/resume. |
| Completion / reward | source or marked unavailable | Completion is distinct from mastery; show next episode/gate state. |
| Exit / resume | source or marked unavailable | Reopen from durable local state without cross-account leakage. |

## Adaptation decision (provisional)

- **Adopt:** ordered sound contrasts (Duolingo evidence), model → record → actionable repair loop (Rosetta/ELSA evidence), transcript confirmation before submission (Duolingo evidence), and context-to-free-response progression (product hypothesis aligned with V2 learning design).
- **Adapt:** use Phraseman's own visual grammar, copy, icons, star/access semantics, accessibility fallbacks and offline-first outbox. Do not copy competitor art, characters, audio, wording or trade dress.
- **Reject:** any design that treats a speech-recognition confidence score as mastery, hides retry/error states, requires live participation without consent, or lets a client award stars.

## Approval gate

This ledger is **not current approval**. To promote a mode to `approved`, add a dated first-hand capture ledger, six-frame (minimum) original Phraseman wireframe/contact sheet, motion/audio/accessibility notes, offline/permission/interruption/resume states, distinctiveness review and owner decision. Until then, Tasks 3.2–3.4 remain blocked by the evidence gate; legacy routes remain unchanged.

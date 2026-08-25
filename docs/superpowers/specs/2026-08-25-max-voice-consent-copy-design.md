# MAX Voice Consent Copy

## Goal

Replace the explanatory body in the MAX voice-consent modal with concise,
natural language. The modal must disclose that MAX uses artificial intelligence
and processes the user's voice, without discussing whether conversation data is
saved.

## Approved Russian Copy

> MAX — собеседник на основе искусственного интеллекта. Чтобы отвечать вам, он обрабатывает ваш голос.

## Scope

- Keep the existing title, buttons, layout, behavior, consent state, and cloud recording unchanged.
- Replace only the body copy in `components/MaxVoiceConsentModal.tsx`.
- Preserve equivalent meaning in all eight supported interface languages.
- Do not mention saving, storage, audio retention, transcripts, learning memory, or deletion.

## Verification

- Update `tests/max_voice_consent.test.ts` to require the approved Russian copy.
- Keep the existing eight-locale contract.
- Assert that the removed Russian storage wording does not return.
- Run only the focused MAX voice-consent test.

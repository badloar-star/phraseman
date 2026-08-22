# MAX Call Live Experience — approved design

**Date:** 2026-08-21  
**Status:** approved in the visual companion  
**Scope:** MAX tutor prestart and live-call surfaces, live captions, and remote-audio playback recovery

## Problem

The MAX flow currently has four connected usability problems:

1. The prestart hero spends space on `goalsDone / goalsTotal`, while the user needs to understand how many MAX minutes remain today.
2. The live-call scene uses a generic icon inside an animated halo instead of the animated MAX sphere already established on Home.
3. The live caption is a large tappable card containing competing user and assistant text. It changes size, introduces a nested scroll region, and can reveal the assistant transcript before the spoken phrase catches up.
4. Assistant audio can become silent while the output-audio transcript still arrives. The provider is producing an audio response, so the client must harden the late WebRTC-track and speaker-route boundary.

## User-approved direction

- Remove the `Целей закрыто` metric from the MAX prestart hero.
- Show a ChatGPT-style horizontal daily-usage meter, but label it in minutes rather than percentages.
- During a call, show a compact version of the same daily meter in the header.
- Replace the generic centre icon with the full layered MAX sphere used on Home.
- Do not draw any extra rings, circular progress outlines, or halo layers around the sphere.
- Let the sphere itself pulse smoothly with the active speaker's audio level.
- Replace the current live-caption card with a quiet two-line subtitle rail showing the current MAX phrase only.
- Keep the full transcript available from the existing captions control.

## Information hierarchy

### Prestart

The hero contains, in order:

1. Animated MAX sphere.
2. Unique lesson number and title.
3. One sentence describing the lesson outcome.
4. Speech level / practice context.
5. Full-width daily MAX quota meter.
6. Preparation status and the primary `Начать разговор` button.

The deleted `goalsDone / goalsTotal` tile is not replaced with another secondary statistic. The lesson goal remains available through the title and outcome rather than a second progress system.

### Live call

The live surface contains:

1. Compact header with back, MAX identity, and daily quota meter.
2. Current lesson goal or live topic.
3. Full-size animated MAX sphere.
4. A short state label such as `MAX говорит` or `Слушаю`.
5. Two-line subtitle rail.
6. Existing mute, end, and captions controls.

No nested scrolling is used for ordinary captions. A tutor board may still use its existing bounded surface when MAX intentionally shows a phrase.

## Daily quota model

The meter represents the user's **daily MAX allowance**, not the maximum length of the current call.

- Denominator: `dailyVoiceSecMax` from the server mint/preflight limits.
- Prestart numerator: `dayRemainingSec + reservedSec`, because the premint reservation must not make time appear consumed before the user starts speaking.
- Live numerator: the same reconstructed pre-call allowance minus elapsed active-call seconds.
- Progress fraction: `clamp(remainingSec / dailyVoiceSecMax, 0, 1)`.
- Visible label: whole remaining minutes using the existing conservative floor convention.
- Zero state: the CTA remains unavailable and the existing truthful exhausted copy remains visible.

The quota model must live in one pure module shared by prestart and live call. The session hard deadline remains the call safety boundary but is not presented as the primary quota.

### Visual behaviour

- Large value: `236 мин`.
- Supporting copy: `осталось сегодня` and `из 240 мин`.
- Wide, stable track whose reserved space never changes.
- Normal state uses the theme accent with dark text where the accent is a bright green surface.
- Low remaining quota changes to amber, then red, without flashing.
- The label updates only when the visible minute changes; the bar may interpolate smoothly on the UI thread.
- Accessibility announces the remaining and total minutes, not a percentage alone.

## MAX sphere motion

`MaxHomeOrb` remains the source of the layered visual assets and ambient internal motion. The call screen adds a thin audio-reactive wrapper rather than modifying asset ownership.

The wrapper:

- exposes an imperative `setAudioLevel(level)` interface so 250 ms WebRTC statistics do not cause React renders;
- receives the remote level while MAX speaks and the microphone level while the learner speaks;
- applies one small scale transform to the sphere itself;
- smooths attack and release so syllables flow into each other instead of producing separate jolts;
- returns gently to scale `1` when audio data is missing;
- disables audio pulsing when reduced motion is enabled while retaining a static, recognisable sphere;
- uses only named values from `constants/motionHybrid.ts`.

The old call halo, feather layers, inner/outer circles, and school/chat icon are not rendered around or inside the tutor sphere.

## Live captions

The live rail shows only the current assistant phrase:

- `MAX` is a small speaker label.
- The phrase uses large, high-contrast text and occupies at most two lines.
- Incoming assistant transcript deltas are buffered while audio has not started.
- Reveal begins only after `output_audio_buffer.started`.
- Text advances in short word groups while audio is playing; it does not dump the complete transcript ahead of the voice.
- `output_audio_buffer.stopped` reveals the completed phrase and then lets the next turn replace it.
- `output_audio_buffer.cleared`, reconnect, and teardown immediately stop pending reveal timers.
- User speech is kept in the full transcript but is not mixed into the live rail.
- The captions button opens the complete transcript sheet and remains at least a 44 × 44 pt touch target.

This is intentionally not karaoke highlighting. Realtime transcript deltas do not provide reliable per-word playback timestamps, so semantic word groups are more stable and less misleading.

## Remote audio diagnosis and repair

The assistant transcript is emitted from output-audio transcript events, so model inference and audio-response generation are active. The fragile boundary is after generation:

- speaker routing is currently requested before the remote WebRTC track becomes active;
- native WebRTC may reconfigure the process audio session when the track is established;
- the client retains only the remote track and does not reassert the intended route when `ontrack` or `output_audio_buffer.started` fires.

The repair is deliberately late and idempotent:

1. Explicitly set `output_modalities: ['audio']` in the realtime session configuration and response requests that override response settings.
2. Retain the remote media stream as well as the audio track for the lifetime of the peer connection.
3. On `ontrack`, enable the remote audio track and reassert the speaker route.
4. On `output_audio_buffer.started`, reassert the route once more after WebRTC has activated playback.
5. If an audio-start event arrives without a remote audio track, allow one bounded transport recovery attempt. Do not loop reconnects.
6. Clear the retained stream, track, and recovery state during reconnect and teardown.

Route calls remain best-effort: a native routing exception must not crash or end an otherwise valid call. If the bounded recovery fails, the existing reconnect/failure flow owns the user-visible state.

## Component boundaries

- `max_call_daily_quota.ts`: pure reconstruction, formatting, fraction, and tone model.
- `MaxDailyQuotaMeter`: stable prestart/live presentation variants.
- `MaxCallOrb`: call-specific audio-reactive wrapper around `MaxHomeOrb`.
- `MaxCallLiveCaptionView`: non-tappable two-line rail; transcript opening stays on the captions control.
- `max_call_live_caption.ts`: buffered reveal state and lifecycle events.
- `max_call_client.ts`: remote stream retention, explicit audio modality, late route enforcement, and bounded recovery.
- `max_call_session.tsx`: wires quota, current audio owner, sphere, rail, and existing controls without audio-level React state.

## Error handling

- Missing quota fields fall back to the current server-safe defaults and never produce negative widths or labels.
- Missing remote levels settle the sphere rather than freezing it at an enlarged scale.
- Caption timers are cancelled on every terminal or transport-reset event.
- Speaker-route methods are optional and individually guarded for older native builds.
- Missing-track recovery is single-shot for the entire call-client lifetime, so a failed recovery cannot start a reconnect loop.
- Teardown remains idempotent and must still stop local tracks, close the peer connection, release `InCallManager`, and restore the shared Expo audio mode.

## Testing and acceptance criteria

### Quota

- Prestart does not contain `целей закрыто` or render `goalsDone / goalsTotal`.
- Premint reservation does not make the displayed daily minutes jump down before the call starts.
- The live meter decreases from the prestart value as active seconds elapse.
- Fractions clamp at 0 and 1; zero and low-quota tones are deterministic.

### Sphere

- The call scene renders the same theme-specific MAX layers as Home.
- No call-halo rings or central school/chat icon remain for tutor calls.
- Audio levels reach the sphere through an imperative ref without React frame-by-frame state.
- Reduced-motion mode disables pulsing.

### Captions

- Assistant deltas remain hidden until audio starts.
- The live rail never contains a user transcript and never becomes a nested scroll area.
- Stop, clear, reconnect, failure, and teardown cancel reveal work deterministically.
- The full transcript still opens from the captions control.

### Audio

- Realtime session and overridden responses request audio explicitly.
- A remote `ontrack` event retains the stream/track and reasserts the speaker route.
- Audio start reasserts the route after track activation.
- Missing-track recovery runs at most once.
- Reconnect and teardown release all retained audio objects and route state.

### Focused verification

Run only the MAX call contracts and component tests affected by the change, followed by TypeScript checks for the touched modules. Manual device verification must confirm:

1. MAX is audible from the first greeting.
2. The sphere pulses smoothly with speech and has no external rings.
3. Captions do not appear ahead of the spoken phrase.
4. The daily meter does not jump when transitioning from prestart to the call.
5. Ending, reconnecting, and backgrounding do not leave audio or animation running.

## Non-goals

- No redesign of the post-call review in this change.
- No new daily-quota policy or server billing rule.
- No word-level forced alignment or synthetic karaoke timing.
- No new modal, sheet, or audio cue.
- No removal of the lesson goal, tutor boards, full transcript, mute, end, or captions controls.

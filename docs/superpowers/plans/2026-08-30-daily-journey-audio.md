# Daily Journey Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate five paid ElevenLabs Sound Effects packs without speech, mix them into deterministic 6.2-second scene masters, and add synchronized comparison controls to the existing daily-reward HTML prototype.

**Architecture:** A pure catalog module owns the five palettes, four prompts per palette, timing, and output names. A checkpointed generator reads `ELEVENLABS_API_KEY` from local environment state, writes 20 raw stems and a non-secret manifest under `.codex-tmp`, and never repeats a verified stem. A separate FFmpeg mixer creates ten persistent MP3 files (five masters and five taps); the HTML uses one scene `Audio` element and one tap `Audio` element synchronized to the existing deterministic animation controller.

**Tech Stack:** Node.js ESM, built-in `fetch`, ElevenLabs Sound Effects API (`eleven_text_to_sound_v2`), FFmpeg/FFprobe, Web Audio through `HTMLAudioElement`, semantic HTML/CSS/vanilla JavaScript, Node test runner, Playwright for focused local verification.

---

### Task 1: Define the sound-pack contract

**Files:**
- Create: `scripts/daily_journey_audio_catalog.mjs`
- Create: `tests/daily_journey_audio_contract.test.mjs`
- Reference: `docs/superpowers/specs/2026-08-30-daily-journey-audio-design.md`

- [ ] **Step 1: Write the failing catalog test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { AUDIO_CUES, SOUND_PACKS, TIMELINE_MS } from '../scripts/daily_journey_audio_catalog.mjs';

test('defines five speech-free packs and twenty paid cues', () => {
  assert.equal(SOUND_PACKS.length, 5);
  assert.deepEqual(AUDIO_CUES.map((cue) => cue.kind), ['intro', 'pulse', 'reveal', 'tap']);
  assert.equal(SOUND_PACKS.length * AUDIO_CUES.length, 20);
  for (const pack of SOUND_PACKS) {
    assert.deepEqual(Object.keys(pack.prompts).sort(), ['intro', 'pulse', 'reveal', 'tap']);
    for (const prompt of Object.values(pack.prompts)) {
      assert.match(prompt, /No speech, no voice, no words, no vocals, no melody\./);
      assert.ok(prompt.length <= 450);
    }
  }
  assert.equal(TIMELINE_MS.duration, 6200);
  assert.deepEqual(TIMELINE_MS.pulses, [2800, 3230, 3660]);
  assert.equal(TIMELINE_MS.reveal, 4100);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/daily_journey_audio_contract.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `daily_journey_audio_catalog.mjs`.

- [ ] **Step 3: Create the exact catalog**

The module exports these shared settings:

```js
export const MODEL_ID = 'eleven_text_to_sound_v2';
export const PROMPT_INFLUENCE = 0.65;
export const TIMELINE_MS = Object.freeze({ duration: 6200, pulses: [2800, 3230, 3660], reveal: 4100 });
export const AUDIO_CUES = Object.freeze([
  { kind: 'intro', durationSeconds: 2.6 },
  { kind: 'pulse', durationSeconds: 0.5 },
  { kind: 'reveal', durationSeconds: 2.1 },
  { kind: 'tap', durationSeconds: 0.5 },
]);
```

`SOUND_PACKS` has ids `crystal`, `runes`, `arcade`, `cinematic`, and `tactile`. Each pack contains these four English prompts, with the shared sentence `No speech, no voice, no words, no vocals, no melody.` appended verbatim:

```js
const promptSets = {
  crystal: {
    intro: 'Elegant crystalline UI atmosphere blooming from silence, tiny glass particles, airy and luminous, premium mobile game reward, restrained dynamics.',
    pulse: 'Single short crystalline energy pulse, rounded glass ping with a soft low body, precise premium game UI accent, no harsh high frequencies.',
    reveal: 'Airy crystalline riser for one second, then one bright controlled reward impact followed by shimmering glass dust and a soft luminous tail.',
    tap: 'Short premium crystalline UI confirmation tap, soft glass click with a warm rounded tail, clean and restrained.',
  },
  runes: {
    intro: 'Ancient rune chamber atmosphere emerging from silence, subtle stone resonance, dry magical ink crackle, low warm hum, calm not ominous.',
    pulse: 'Single compact rune pulse, carved stone resonance with a small magical ink snap, weighty but friendly premium game UI accent.',
    reveal: 'Ancient magical rise with stone and ink texture for one second, then one controlled rune impact and a warm resonant halo, not ominous.',
    tap: 'Short tactile rune UI confirmation, small carved stone click with a quiet magical resonance, clean and friendly.',
  },
  arcade: {
    intro: 'Modern premium game reward atmosphere, soft synth energy waking up, playful elastic texture, polished and confident, never casino-like.',
    pulse: 'Single short elastic synth pulse, juicy reward UI pop with a rounded transient and compact bass body, playful but premium.',
    reveal: 'Fast polished synth riser for one second, then one satisfying elastic reward pop with bright digital shimmer and a clean short tail, not casino-like.',
    tap: 'Short modern game UI confirmation tap, elastic digital click with a tiny positive shimmer, premium and restrained.',
  },
  cinematic: {
    intro: 'Wide cinematic reward atmosphere from silence, restrained sub-bass heartbeat, distant luminous air, premium and calm, suitable for a mobile interface.',
    pulse: 'Single cinematic energy pulse, soft sub-bass body with a luminous high accent, compact controlled transient, premium mobile UI.',
    reveal: 'Wide cinematic riser for one second, then one controlled deep impact with luminous rays and an elegant decaying halo, powerful but not loud or frightening.',
    tap: 'Short cinematic UI confirmation tap, muted low click with a tiny luminous tail, expensive and controlled.',
  },
  tactile: {
    intro: 'Minimal tactile interface atmosphere, nearly silent airy room tone, subtle magnetic movement and soft material detail, calm premium product sound.',
    pulse: 'Single minimal magnetic pulse, soft physical click with a breath of air, precise tactile premium interface sound.',
    reveal: 'Minimal soft air whoosh rising for one second, then one clean magnetic impact and a very short natural decay, tactile and refined.',
    tap: 'Short soft magnetic confirmation click, physical tactile UI sound with immediate clean decay.',
  },
};
```

- [ ] **Step 4: Run the catalog test and verify GREEN**

Run: `node --test tests/daily_journey_audio_contract.test.mjs`
Expected: 1 test passes.

- [ ] **Step 5: Commit the contract**

```powershell
git add -- scripts/daily_journey_audio_catalog.mjs tests/daily_journey_audio_contract.test.mjs
git commit -m "test: define daily journey sound packs"
```

### Task 2: Build the checkpointed ElevenLabs generator

**Files:**
- Create: `scripts/generate_daily_journey_audio.mjs`
- Modify: `tests/daily_journey_audio_contract.test.mjs`
- Runtime output: `.codex-tmp/daily-journey-audio/stems/*.mp3`
- Runtime output: `.codex-tmp/daily-journey-audio/generation-manifest.json`

- [ ] **Step 1: Add a failing generator source contract**

```js
test('generator is checkpointed and never leaks its key', async () => {
  const source = await readFile(new URL('../scripts/generate_daily_journey_audio.mjs', import.meta.url), 'utf8');
  assert.match(source, /ELEVENLABS_API_KEY/);
  assert.match(source, /generation-manifest\.json/);
  assert.match(source, /createHash\('sha256'\)/);
  assert.match(source, /character-cost/i);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*apiKey/);
  assert.doesNotMatch(source, /text-to-speech/i);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/daily_journey_audio_contract.test.mjs`
Expected: FAIL because `generate_daily_journey_audio.mjs` is missing.

- [ ] **Step 3: Implement the generator**

The script must:

1. load only `ELEVENLABS_API_KEY` from process env or `.env.local` without printing it;
2. enumerate the 20 `(pack, cue)` jobs from the catalog;
3. skip a job only when manifest metadata and the on-disk SHA-256 both match;
4. POST to `https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128` with:

```js
{
  text: prompt,
  duration_seconds: durationSeconds,
  prompt_influence: PROMPT_INFLUENCE,
  loop: false,
  model_id: MODEL_ID,
}
```

5. retry at most twice for `429` or `5xx`, with bounded delays of 2 and 5 seconds;
6. write to a temporary sibling file, validate non-zero bytes, then atomically rename;
7. write manifest after every successful job with `requestId`, `characterCost`, `sha256`, byte count, prompt, duration, and model;
8. print one compact line per job without headers or secrets.

- [ ] **Step 4: Run source tests and a no-key dry run**

Run:

```powershell
node --test tests/daily_journey_audio_contract.test.mjs
$env:ELEVENLABS_API_KEY=''; node scripts/generate_daily_journey_audio.mjs --dry-run
```

Expected: tests pass; dry run lists exactly 20 jobs and performs zero network requests.

- [ ] **Step 5: Commit the generator before spending**

```powershell
git add -- scripts/generate_daily_journey_audio.mjs tests/daily_journey_audio_contract.test.mjs
git commit -m "feat: add checkpointed daily journey audio generator"
```

### Task 3: Generate and mix five synchronized masters

**Files:**
- Create: `scripts/mix_daily_journey_audio.mjs`
- Create: `docs/design/daily-journey-audio/manifest.json`
- Create: `docs/design/daily-journey-audio/crystal-master.mp3`
- Create: `docs/design/daily-journey-audio/crystal-tap.mp3`
- Create equivalent `*-master.mp3` and `*-tap.mp3` for `runes`, `arcade`, `cinematic`, and `tactile`
- Modify: `tests/daily_journey_audio_contract.test.mjs`

- [ ] **Step 1: Add failing output-validation tests**

Add tests that assert all ten persistent files exist only after generation, all five masters have FFprobe duration `6.15–6.25`, and the public manifest contains five packs without `apiKey` or secret-like `sk_` values.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/daily_journey_audio_contract.test.mjs`
Expected: FAIL listing the missing ten MP3 files.

- [ ] **Step 3: Run the paid generator exactly once with safe logging**

Run:

```powershell
node scripts/codex-safe-run.mjs -- node scripts/generate_daily_journey_audio.mjs
```

Expected: 20 successful or checkpoint-skipped jobs; generated files are under `.codex-tmp/daily-journey-audio/stems`; no secret appears in console or log summary.

- [ ] **Step 4: Implement and run the FFmpeg mixer**

For each pack, the mixer uses `intro`, one `pulse` split three ways, and `reveal`:

```text
intro:  start 0 ms, gain 0.78
pulse1: delay 2800 ms, gain 0.72
pulse2: delay 3230 ms, gain 0.86
pulse3: delay 3660 ms, gain 1.00
reveal: delay 4100 ms, gain 0.92
```

The FFmpeg filter ends with:

```text
amix=inputs=5:duration=longest:normalize=0,
loudnorm=I=-18:TP=-1:LRA=7,
apad,
atrim=duration=6.2
```

The tap is normalized separately with `loudnorm=I=-20:TP=-1:LRA=5` and trimmed to 0.5 seconds. The script writes a public manifest with relative paths, durations, sizes, hashes, pack labels, and no generation credentials.

Run: `node scripts/mix_daily_journey_audio.mjs`
Expected: five masters, five taps, and one public manifest.

- [ ] **Step 5: Verify generated audio**

Run:

```powershell
node --test tests/daily_journey_audio_contract.test.mjs
```

Expected: all tests pass; every master is 6.2 seconds within tolerance.

- [ ] **Step 6: Commit only persistent audio outputs and mixer code**

```powershell
git add -- scripts/mix_daily_journey_audio.mjs tests/daily_journey_audio_contract.test.mjs docs/design/daily-journey-audio
git commit -m "feat: generate daily journey sound design packs"
```

### Task 4: Synchronize audio with the HTML scene

**Files:**
- Modify: `docs/design/daily-journey-rewards-prototype.html`
- Modify: `tests/daily_journey_audio_contract.test.mjs`

- [ ] **Step 1: Add a failing HTML integration contract**

The test must require:

```js
for (const id of ['crystal', 'runes', 'arcade', 'cinematic', 'tactile']) {
  assert.match(html, new RegExp(`data-sound-pack="${id}"`));
}
for (const token of ['sceneAudio', 'tapAudio', 'soundEnabled', 'syncSceneAudio', 'stopSceneAudio']) {
  assert.match(html, new RegExp(token));
}
assert.match(html, /skipScene[\s\S]*stopSceneAudio/);
assert.doesNotMatch(html, /api\.elevenlabs|ELEVENLABS_API_KEY|xi-api-key/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/daily_journey_audio_contract.test.mjs`
Expected: FAIL because sound controls and audio controller are missing.

- [ ] **Step 3: Add visible prototype-only sound controls**

Outside the phone, add a five-button segmented selector with `data-sound-pack` values and one `#soundToggle` button. The mobile modal itself receives no new labels. The selected button uses the existing lime surface with dark foreground.

- [ ] **Step 4: Add the audio controller**

Create two `Audio` instances, preload selected master/tap, and implement:

```js
function stopSceneAudio() {
  sceneAudio.pause();
  sceneAudio.currentTime = 0;
}

function syncSceneAudio(ms, shouldPlay) {
  sceneAudio.currentTime = Math.max(0, Math.min(6.2, ms / 1000));
  if (soundEnabled && shouldPlay) void sceneAudio.play().catch(() => {});
}

function playTap() {
  if (!soundEnabled) return;
  tapAudio.currentTime = 0;
  void tapAudio.play().catch(() => {});
}
```

Wire replay/play/pause/seek to the same millisecond position as the scene controller. Wire skip and close to `stopSceneAudio()`. Wire Apply and Later to `playTap()` followed by dismissal. Enabling sound replays from 0 so browser gesture requirements are satisfied without desynchronization.

- [ ] **Step 5: Run source tests and browser interaction checks**

Run: `node --test tests/daily_journey_audio_contract.test.mjs`
Expected: all tests pass.

Browser assertions:

1. select every sound pack and verify its corresponding master path;
2. enable sound and replay;
3. pause at about 3 seconds and verify animation/audio positions differ by no more than 120 ms;
4. seek to 5 seconds and verify the same tolerance;
5. press skip and verify final modal remains open while `sceneAudio.paused === true`;
6. press Later and verify the modal closes.

- [ ] **Step 6: Commit HTML integration**

```powershell
git add -- docs/design/daily-journey-rewards-prototype.html tests/daily_journey_audio_contract.test.mjs
git commit -m "feat: synchronize daily reward animation audio"
```

### Task 5: Build and show the autonomous visual companion

**Files:**
- Runtime output: `.superpowers/brainstorm/8698-1788080522/content/daily-journey-audio-v1.html`
- Modify: `docs/superpowers/specs/2026-08-30-daily-journey-audio-design.md`

- [ ] **Step 1: Create a new companion artifact**

Mechanically copy the persistent HTML to a new filename and replace only local image and audio path strings with data URIs read from the same project files. Do not reuse or overwrite an earlier companion filename. Confirm the autonomous file contains seven WebP occurrences and ten MP3 occurrences and contains no network URL or key material.

- [ ] **Step 2: Run final deterministic checks**

Run:

```powershell
node --test tests/daily_journey_audio_contract.test.mjs
git diff --check
```

Expected: all focused tests pass and no owned-file whitespace errors exist.

- [ ] **Step 3: Verify the autonomous file in the local browser**

Open `http://localhost:64610/`, exercise all five sound buttons, and repeat the pause/seek/skip checks. Confirm the final modal still has `Применить` and `Позже`, no `Твой язык сегодня` screen, and no broken image/audio assets.

- [ ] **Step 4: Mark the design complete**

Update the spec status to name the generated manifest and prototype. Commit only the spec update:

```powershell
git add -- docs/superpowers/specs/2026-08-30-daily-journey-audio-design.md
git commit -m "docs: complete daily journey audio prototype"
```

- [ ] **Step 5: Report evidence**

Return the five pack names, generated/skip counts, reported ElevenLabs character cost total when provided, master durations, test command/status, browser result, HTML path, manifest path, and commit hashes. Never include prompts containing secrets, request authorization headers, or the API key.

# MAX Call Live Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore audible MAX speech and replace the cluttered tutor-call UI with the approved daily-minute meter, full animated MAX sphere, and paced two-line subtitles.

**Architecture:** Keep server quota and Realtime configuration authoritative, but project them through small client-only modules. Harden remote playback at the WebRTC boundary, model daily quota in one pure module shared by prestart/live screens, wrap the existing Home sphere with an imperative audio-level animator, and keep caption pacing separate from canonical transcript history.

**Tech Stack:** React Native, Expo Router, TypeScript, React Native Reanimated, react-native-webrtc, react-native-incall-manager, Jest, React Native Testing Library, Firebase Functions tests.

**Execution constraint:** Project rules prohibit creating a branch, worktree, or delegated coding task without explicit owner authorization. Execute in the current checkout, stage only named MAX files, and never disturb unrelated staged or working-tree changes.

---

## File map

### New files

- `app/max_call_daily_quota.ts` — pure parsing and projection of daily quota.
- `components/max/MaxDailyQuotaMeter.tsx` — hero and compact quota presentation.
- `components/max/MaxCallOrb.tsx` — audio-reactive wrapper around `MaxHomeOrb` with no rings.
- `tests/max_call_daily_quota.test.ts` — quota arithmetic and tone tests.
- `tests/max_daily_quota_meter.test.tsx` — meter accessibility and copy tests.
- `tests/max_call_orb_visual_contract.test.ts` — sphere asset/motion/no-rings contract.

### Modified files

- `functions/src/max_voice_mint.ts` — explicit audio output modality in both provider profiles.
- `functions/src/max_voice_mint.test.ts` — provider-body audio contract.
- `app/max_call_client.ts` — explicit audio responses, remote stream retention, late speaker routing, one recovery attempt.
- `app/max_call_session.tsx` — live quota meter, tutor sphere, subtitle rail, transcript-sheet access.
- `app/max_call_prestart.tsx` — remove completed-goals metric and render daily quota meter.
- `app/max_call_live_caption_view.tsx` — replace tappable conversation card with a stable assistant-only rail.
- `constants/motionHybrid.ts` — named MAX call sphere motion values.
- `tests/max_call_client_teardown.test.ts` — route, stream, recovery, cleanup regression tests.
- `tests/max_call_prestart_design_contract.test.ts` — rejected metric absent, daily meter present.
- `tests/max_call_live_caption_view.test.ts` — noninteractive rail and scaling contract.
- `tests/max_call_live_board_integration_contract.test.ts` — tutor orb, quota, captions, and transcript access wiring.

### Preserved files

- `app/max_call_halo.tsx` remains available for non-tutor scenario/companion calls. Tutor mode simply stops rendering it.
- `app/max_call_transcript.ts` remains the canonical history owner.
- The existing transcript modal, tutor goal strip, tutor board, mute, end, and captions capabilities remain available.

---

### Task 1: Repair the remote-audio contract

**Files:**
- Modify: `functions/src/max_voice_mint.ts:474-520`
- Modify: `functions/src/max_voice_mint.test.ts:520-780`
- Modify: `app/max_call_client.ts:460-500, 598-630, 660-760, 1065-1080, 1160-1210`
- Modify: `tests/max_call_client_teardown.test.ts:20-130` and audio/reconnect describes

- [ ] **Step 1: Write failing provider and response-modality tests**

Add these assertions to the existing mint-profile tests and client harness tests:

```ts
expect(body.session.output_modalities).toEqual(['audio']);

const greeting = sentBy(h).find((event) => event.type === 'response.create');
expect(greeting).toMatchObject({
  response: { output_modalities: ['audio'] },
});
```

Add route/retention cases using the existing `makeHarness`, `connect`, `dcMessage`, and fake timers:

```ts
it('retains the remote stream and reasserts speaker routing after track and playback start', async () => {
  const h = makeHarness();
  const client = await connect(h);
  const remoteTrack: MediaStreamTrackLike & { stop: jest.Mock } = {
    enabled: false,
    stop: jest.fn(),
    kind: 'audio',
  };
  const remoteStream = {
    getTracks: () => [remoteTrack],
    getAudioTracks: () => [remoteTrack],
  };
  const beforeForce = h.inCall.setForceSpeakerphoneOn.mock.calls.length;

  h.pc.ontrack?.({ track: remoteTrack, streams: [remoteStream] });
  expect(remoteTrack.enabled).toBe(true);
  expect(h.inCall.setForceSpeakerphoneOn.mock.calls.length).toBe(beforeForce + 1);

  dcMessage(h, { type: 'output_audio_buffer.started' });
  expect(h.inCall.setForceSpeakerphoneOn.mock.calls.length).toBe(beforeForce + 2);

  await client.end('completed');
  expect(h.pc.close).toHaveBeenCalledTimes(1);
});

it('attempts missing-track recovery at most once for the entire call', async () => {
  const h = makeHarness();
  await connect(h);

  dcMessage(h, { type: 'output_audio_buffer.started' });
  jest.advanceTimersByTime(MAX_CALL_REMOTE_TRACK_GRACE_MS + RECONNECT_GRACE_MS);
  await flushAsync();
  const afterFirstRecovery = (h.deps.mint as jest.Mock).mock.calls.length;
  expect(afterFirstRecovery).toBe(2);

  dcMessage(h, { type: 'output_audio_buffer.started' });
  jest.advanceTimersByTime(MAX_CALL_REMOTE_TRACK_GRACE_MS + RECONNECT_GRACE_MS);
  await flushAsync();
  expect(h.deps.mint).toHaveBeenCalledTimes(afterFirstRecovery);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/max_call_client_teardown.test.ts --no-cache --runInBand
Set-Location functions
npx jest --runTestsByPath src/max_voice_mint.test.ts --no-cache --runInBand
Set-Location ..
```

Expected: failures mention missing `output_modalities`, missing `MAX_CALL_REMOTE_TRACK_GRACE_MS`, and absent late speaker-route calls.

- [ ] **Step 3: Make the provider request audio explicitly**

Change the shared provider core in `functions/src/max_voice_mint.ts` so both full and compatibility profiles inherit the same mode:

```ts
const core = {
  type: 'realtime',
  model: args.config.model,
  instructions: args.instructions,
  output_modalities: ['audio'],
  audio: { output: { voice } },
};
```

- [ ] **Step 4: Add idempotent late route enforcement and stream retention**

In `app/max_call_client.ts`, add the state and helper below next to existing transport state:

```ts
export const MAX_CALL_REMOTE_TRACK_GRACE_MS = 750;

let remoteStream: MediaStreamLike | null = null;
let remoteTrack: MediaStreamTrackLike | null = null;
let audioRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
let audioRecoveryAttempted = false;

function ensureSpeakerRoute(): void {
  if (!inCallStarted) return;
  try { deps.native.InCallManager.setForceSpeakerphoneOn?.(true); } catch {}
  try { deps.native.InCallManager.setSpeakerphoneOn?.(true); } catch {}
}

function clearAudioRecoveryTimer(): void {
  if (audioRecoveryTimer === null) return;
  clearTimeout(audioRecoveryTimer);
  audioRecoveryTimer = null;
}

function scheduleMissingTrackRecovery(): void {
  if (remoteTrack || audioRecoveryAttempted || audioRecoveryTimer !== null || isTornDown()) return;
  audioRecoveryTimer = setTimeout(() => {
    audioRecoveryTimer = null;
    if (remoteTrack || audioRecoveryAttempted || isTornDown()) return;
    audioRecoveryAttempted = true;
    beginReconnect();
  }, MAX_CALL_REMOTE_TRACK_GRACE_MS);
}
```

Use `ensureSpeakerRoute()` in `acquireAudioSession()` after `InCallManager.start()`. Replace the track handler with:

```ts
connection.ontrack = (event) => {
  if (connection !== pc || !event?.track || (event.track.kind && event.track.kind !== 'audio')) return;
  remoteStream = event.streams?.[0] ?? null;
  remoteTrack = event.track;
  remoteTrack.enabled = true;
  clearAudioRecoveryTimer();
  ensureSpeakerRoute();
};
```

At `output_audio_buffer.started`, call both helpers after setting `remoteAudioPlaying`:

```ts
ensureSpeakerRoute();
scheduleMissingTrackRecovery();
```

Clear the timer and set both retained values to `null` in reconnect transport cleanup and final teardown. Do not reset `audioRecoveryAttempted` during reconnect.

- [ ] **Step 5: Request audio in every client-created response**

Change the response helper so per-response overrides cannot accidentally become text-only:

```ts
function requestResponse(response?: Record<string, unknown>): boolean {
  if (isTornDown() || responseActive || responseRequestPending || remoteAudioPlaying) return false;
  const sent = dcSend({
    type: 'response.create',
    response: {
      output_modalities: ['audio'],
      ...(response ?? {}),
    },
  });
  if (sent) responseRequestPending = true;
  return sent;
}
```

- [ ] **Step 6: Run audio tests and verify GREEN**

Run the same two commands from Step 2.

Expected: both suites pass; route calls occur after track and playback start; recovery count remains one.

- [ ] **Step 7: Commit only the audio repair files**

```powershell
git add -- app/max_call_client.ts tests/max_call_client_teardown.test.ts functions/src/max_voice_mint.ts functions/src/max_voice_mint.test.ts
git commit --only -- app/max_call_client.ts tests/max_call_client_teardown.test.ts functions/src/max_voice_mint.ts functions/src/max_voice_mint.test.ts -m "fix(max-voice): restore remote audio playback"
```

Expected: unrelated staged paths remain staged and absent from this commit.

---

### Task 2: Add one canonical daily-quota projection

**Files:**
- Create: `app/max_call_daily_quota.ts`
- Create: `tests/max_call_daily_quota.test.ts`

- [ ] **Step 1: Write the failing pure-model tests**

Create `tests/max_call_daily_quota.test.ts`:

```ts
import {
  dailyQuotaFromLimits,
  dailyQuotaRemainingAt,
  dailyQuotaView,
} from '../app/max_call_daily_quota';

describe('MAX daily quota projection', () => {
  it('restores a premint reservation before the call consumes it', () => {
    expect(dailyQuotaFromLimits({
      dayRemainingSec: 13_860,
      reservedSec: 300,
      dailyVoiceSecMax: 14_400,
    })).toEqual({ startRemainingSec: 14_160, maxSec: 14_400 });
  });

  it('subtracts only active elapsed seconds and clamps at zero', () => {
    expect(dailyQuotaRemainingAt(600, 1_000, 61_400)).toBe(540);
    expect(dailyQuotaRemainingAt(10, 1_000, 20_000)).toBe(0);
  });

  it('returns stable minute, fraction, and tone values', () => {
    expect(dailyQuotaView(14_160, 14_400)).toEqual({ minutes: 236, fraction: 0.9833333333333333, tone: 'normal' });
    expect(dailyQuotaView(1_800, 14_400).tone).toBe('amber');
    expect(dailyQuotaView(60, 14_400).tone).toBe('red');
  });

  it('accepts snake-case server aliases without exceeding the maximum', () => {
    expect(dailyQuotaFromLimits({
      day_remaining_sec: 20_000,
      reserved_sec: 300,
      day_max_sec: 14_400,
    })).toEqual({ startRemainingSec: 14_400, maxSec: 14_400 });
  });
});
```

- [ ] **Step 2: Run the model test and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/max_call_daily_quota.test.ts --no-cache --runInBand
```

Expected: module-not-found failure for `app/max_call_daily_quota.ts`.

- [ ] **Step 3: Implement the complete pure model**

Create `app/max_call_daily_quota.ts`:

```ts
export type MaxDailyQuotaTone = 'normal' | 'amber' | 'red';

export interface MaxDailyQuotaStart {
  startRemainingSec: number;
  maxSec: number;
}

function finite(source: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

export function dailyQuotaFromLimits(limits: Record<string, unknown> | undefined): MaxDailyQuotaStart | null {
  if (!limits) return null;
  const remaining = finite(limits, 'dayRemainingSec', 'day_remaining_sec');
  const maximum = finite(limits, 'dailyVoiceSecMax', 'day_max_sec');
  if (remaining === null || maximum === null || maximum <= 0) return null;
  const reserved = Math.max(0, finite(limits, 'reservedSec', 'reserved_sec') ?? 0);
  return {
    startRemainingSec: Math.max(0, Math.min(maximum, remaining + reserved)),
    maxSec: maximum,
  };
}

export function dailyQuotaRemainingAt(startRemainingSec: number, startedAtMs: number, nowMs: number): number {
  const elapsedSec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1_000));
  return Math.max(0, startRemainingSec - elapsedSec);
}

export function dailyQuotaView(remainingSec: number, maxSec: number) {
  const safeMax = Math.max(1, maxSec);
  const safeRemaining = Math.max(0, Math.min(safeMax, remainingSec));
  const fraction = safeRemaining / safeMax;
  const tone: MaxDailyQuotaTone = safeRemaining <= 60 ? 'red' : fraction <= 0.15 ? 'amber' : 'normal';
  return { minutes: Math.floor(safeRemaining / 60), fraction, tone };
}

export default function __RouteShim() { return null; }
```

- [ ] **Step 4: Run the model test and verify GREEN**

Run the command from Step 2.

Expected: 4 tests pass.

- [ ] **Step 5: Commit the quota model**

```powershell
git add -- app/max_call_daily_quota.ts tests/max_call_daily_quota.test.ts
git commit --only -- app/max_call_daily_quota.ts tests/max_call_daily_quota.test.ts -m "feat(max-voice): model daily minute quota"
```

---

### Task 3: Build and wire the daily-minute meter

**Files:**
- Create: `components/max/MaxDailyQuotaMeter.tsx`
- Create: `tests/max_daily_quota_meter.test.tsx`
- Modify: `app/max_call_prestart.tsx:96-115, 205-215, 250-450`
- Modify: `app/max_call_session.tsx:350-420, 740-790, 1020-1110`
- Modify: `tests/max_call_prestart_design_contract.test.ts`

- [ ] **Step 1: Write failing component and prestart-contract tests**

Create a React Native Testing Library test that renders the static variant:

```ts
import React from 'react';
import { render } from '@testing-library/react-native';
import MaxDailyQuotaMeter from '../components/max/MaxDailyQuotaMeter';

describe('MaxDailyQuotaMeter', () => {
  it('names remaining and total daily minutes without percentages', async () => {
    const view = await render(
      <MaxDailyQuotaMeter startRemainingSec={14_160} maxSec={14_400} runningSinceMs={null} variant="hero" lang="ru" />,
    );
    expect(view.getByText('236 мин')).toBeTruthy();
    expect(view.getByLabelText('Осталось 236 минут MAX сегодня из 240')).toBeTruthy();
    expect(view.queryByText(/%/)).toBeNull();
  });
});
```

Extend `tests/max_call_prestart_design_contract.test.ts`:

```ts
expect(source).toContain("import MaxDailyQuotaMeter from '../components/max/MaxDailyQuotaMeter'");
expect(source).toContain('<MaxDailyQuotaMeter');
expect(source).not.toContain('целей закрыто');
expect(source).not.toContain('goalProgressLabel');
```

- [ ] **Step 2: Run both tests and verify RED**

```powershell
npx jest --runTestsByPath tests/max_daily_quota_meter.test.tsx tests/max_call_prestart_design_contract.test.ts --no-cache --runInBand
```

Expected: missing component and rejected copy still present.

- [ ] **Step 3: Implement the stable meter component**

Create `components/max/MaxDailyQuotaMeter.tsx` with one private ticker and no parent-screen per-second state:

```tsx
import React, { memo, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { dailyQuotaRemainingAt, dailyQuotaView } from '../../app/max_call_daily_quota';
import { triLang, type Lang } from '../../constants/i18n';
import { useTheme } from '../ThemeContext';

type Props = {
  startRemainingSec: number;
  maxSec: number;
  runningSinceMs: number | null;
  variant: 'hero' | 'compact';
  lang: Lang;
};

function MaxDailyQuotaMeter({ startRemainingSec, maxSec, runningSinceMs, variant, lang }: Props) {
  const { theme: t, f } = useTheme();
  const [remainingSec, setRemainingSec] = useState(startRemainingSec);

  useEffect(() => {
    setRemainingSec(runningSinceMs === null
      ? startRemainingSec
      : dailyQuotaRemainingAt(startRemainingSec, runningSinceMs, Date.now()));
    if (runningSinceMs === null) return;
    const id = setInterval(() => {
      setRemainingSec(dailyQuotaRemainingAt(startRemainingSec, runningSinceMs, Date.now()));
    }, 1_000);
    return () => clearInterval(id);
  }, [runningSinceMs, startRemainingSec]);

  const model = dailyQuotaView(remainingSec, maxSec);
  const totalMinutes = Math.floor(maxSec / 60);
  const color = model.tone === 'red' ? t.wrong : model.tone === 'amber' ? t.gold : t.accent;
  const minutesValue = triLang(lang, {
    ru: `${model.minutes} мин`, uk: `${model.minutes} хв`, es: `${model.minutes} min`,
    'pt-BR': `${model.minutes} min`, vi: `${model.minutes} phút`, id: `${model.minutes} mnt`,
    tr: `${model.minutes} dk`, pl: `${model.minutes} min`,
  });
  const label = triLang(lang, {
    ru: `Осталось ${model.minutes} минут MAX сегодня из ${totalMinutes}`,
    uk: `Залишилося ${model.minutes} хвилин MAX сьогодні з ${totalMinutes}`,
    es: `Quedan ${model.minutes} minutos de MAX hoy de ${totalMinutes}`,
    'pt-BR': `Restam ${model.minutes} minutos de MAX hoje de ${totalMinutes}`,
    vi: `Hôm nay còn ${model.minutes} phút MAX trên ${totalMinutes}`,
    id: `Sisa ${model.minutes} menit MAX hari ini dari ${totalMinutes}`,
    tr: `Bugün ${totalMinutes} dakikadan ${model.minutes} MAX dakikası kaldı`,
    pl: `Zostało dziś ${model.minutes} z ${totalMinutes} minut MAX`,
  });

  return (
    <View testID={`max-daily-quota-${variant}`} accessible accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ color: t.textMuted, fontSize: variant === 'hero' ? f.sub : f.label, fontWeight: '800' }}>
          {triLang(lang, { ru: 'Дневной запас MAX', uk: 'Денний запас MAX', es: 'Minutos MAX de hoy', 'pt-BR': 'Minutos MAX de hoje', vi: 'Số phút MAX hôm nay', id: 'Menit MAX hari ini', tr: 'Bugünkü MAX süresi', pl: 'Dzisiejsze minuty MAX' })}
        </Text>
        <Text style={{ color: t.textPrimary, fontSize: variant === 'hero' ? f.numMd + 2 : f.sub, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
          {minutesValue}
        </Text>
      </View>
      <View style={{ height: variant === 'hero' ? 10 : 6, borderRadius: 99, overflow: 'hidden', backgroundColor: t.bgSurface2, marginTop: variant === 'hero' ? 10 : 7 }}>
        <View style={{ width: `${model.fraction * 100}%`, height: '100%', borderRadius: 99, backgroundColor: color }} />
      </View>
    </View>
  );
}

export default memo(MaxDailyQuotaMeter);
```

- [ ] **Step 4: Replace the prestart completed-goals tile**

In `app/max_call_prestart.tsx`, remove `goalProgressLabel`, remove its accessibility sentence, delete the `целей закрыто` tile, and render:

```tsx
<MaxDailyQuotaMeter
  startRemainingSec={dayRemainingSec}
  maxSec={dayMaxSec}
  runningSinceMs={null}
  variant="hero"
  lang={lang}
/>
```

Place it below the lesson outcome/level and above preparation status. Keep the existing no-minutes gate and CTA behavior.

- [ ] **Step 5: Wire the compact live meter without replacing the call deadline**

In `app/max_call_session.tsx`, store the pure snapshot at activation:

```ts
const [dailyQuota, setDailyQuota] = useState<MaxDailyQuotaStart | null>(null);

function onCallActivated(): void {
  const startedAt = Date.now();
  startedAtRef.current = startedAt;
  const mint = clientRef.current?.mintResult();
  if (!mint) return;
  setDailyQuota(dailyQuotaFromLimits(mint.limits));
  // existing deadline, hints, tutor notes, and teardown setup continues here
}
```

Replace `MinutesPill` in the header only when `dailyQuota` is available:

```tsx
{dailyQuota ? (
  <View style={{ flexBasis: 116, flexGrow: 0 }}>
    <MaxDailyQuotaMeter
      startRemainingSec={dailyQuota.startRemainingSec}
      maxSec={dailyQuota.maxSec}
      runningSinceMs={startedAtRef.current}
      variant="compact"
      lang={lang}
    />
  </View>
) : null}
```

Keep `hardAtMs`, wrap-up notes, and teardown timers unchanged; they remain safety logic rather than the displayed quota.

- [ ] **Step 6: Run quota UI tests and verify GREEN**

Run the command from Step 2 plus the pure test from Task 2.

Expected: all three files pass.

- [ ] **Step 7: Commit only quota UI files**

```powershell
git add -- components/max/MaxDailyQuotaMeter.tsx app/max_call_prestart.tsx app/max_call_session.tsx tests/max_daily_quota_meter.test.tsx tests/max_call_prestart_design_contract.test.ts
git commit --only -- components/max/MaxDailyQuotaMeter.tsx app/max_call_prestart.tsx app/max_call_session.tsx tests/max_daily_quota_meter.test.tsx tests/max_call_prestart_design_contract.test.ts -m "feat(max-voice): show daily minute meter"
```

---

### Task 4: Replace the tutor halo with the full audio-reactive MAX sphere

**Files:**
- Modify: `constants/motionHybrid.ts:114-165`
- Create: `components/max/MaxCallOrb.tsx`
- Create: `tests/max_call_orb_visual_contract.test.ts`
- Modify: `app/max_call_session.tsx:1-90, 410-450, 620-630, 1125-1160`
- Modify: `tests/max_call_live_board_integration_contract.test.ts`

- [ ] **Step 1: Write the failing no-rings and integration contracts**

Create `tests/max_call_orb_visual_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';
import { MAX_CALL_ORB_HYBRID } from '../constants/motionHybrid';

const orb = fs.readFileSync(path.join(__dirname, '../components/max/MaxCallOrb.tsx'), 'utf8');
const session = fs.readFileSync(path.join(__dirname, '../app/max_call_session.tsx'), 'utf8');

describe('MAX tutor call sphere', () => {
  it('uses the Home layers with named smooth audio tokens and no ring geometry', () => {
    expect(MAX_CALL_ORB_HYBRID).toMatchObject({ size: 238, audioScaleMax: 0.045, attackMs: 420, releaseMs: 680 });
    expect(orb).toContain('MaxHomeOrb');
    expect(orb).toContain('setAudioLevel');
    expect(orb).toContain('useReduceMotion()');
    expect(orb).not.toContain('borderWidth');
    expect(orb).not.toContain('outerRing');
    expect(orb).not.toContain('innerRing');
  });

  it('renders MaxCallOrb for tutor while preserving MaxCallHalo for other formats', () => {
    expect(session).toContain('isTutor ? (');
    expect(session).toContain('<MaxCallOrb');
    expect(session).toContain('<MaxCallHalo');
    expect(session).not.toMatch(/isTutor[\s\S]{0,500}school-outline/);
  });
});
```

- [ ] **Step 2: Run the orb contracts and verify RED**

```powershell
npx jest --runTestsByPath tests/max_call_orb_visual_contract.test.ts tests/max_call_live_board_integration_contract.test.ts --no-cache --runInBand
```

Expected: missing constant/component and tutor still rendering the halo icon.

- [ ] **Step 3: Add named motion values without changing non-tutor halo tokens**

Append to `constants/motionHybrid.ts`:

```ts
export const MAX_CALL_ORB_HYBRID = {
  size: 238,
  audioScaleMax: 0.045,
  attackMs: 420,
  releaseMs: 680,
  resetMs: 240,
} as const;
```

- [ ] **Step 4: Implement the complete call-specific wrapper**

Create `components/max/MaxCallOrb.tsx`:

```tsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { MaxHomeOrbLayers } from '../../app/max_home_orb_assets';
import { MAX_CALL_ORB_HYBRID } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import MaxHomeOrb from '../home/MaxHomeOrb';

export type MaxCallOrbRef = { setAudioLevel(level: number | null): void };
type Props = { layers: MaxHomeOrbLayers; ownerVisible: boolean };

function clamp01(value: number): number {
  'worklet';
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export const MaxCallOrb = forwardRef<MaxCallOrbRef, Props>(function MaxCallOrb({ layers, ownerVisible }, ref) {
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const scale = useSharedValue(1);

  useImperativeHandle(ref, () => ({
    setAudioLevel(level) {
      if (reduceMotionRef.current || level === null || !Number.isFinite(level)) {
        scale.value = withTiming(1, { duration: MAX_CALL_ORB_HYBRID.resetMs });
        return;
      }
      const target = 1 + clamp01(level) * MAX_CALL_ORB_HYBRID.audioScaleMax;
      scale.value = withTiming(target, {
        duration: target > scale.value ? MAX_CALL_ORB_HYBRID.attackMs : MAX_CALL_ORB_HYBRID.releaseMs,
      });
    },
  }), [scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View testID="max-call-orb" style={animatedStyle}>
      <MaxHomeOrb layers={layers} size={MAX_CALL_ORB_HYBRID.size} ownerVisible={ownerVisible} />
    </Animated.View>
  );
});
```

- [ ] **Step 5: Wire the same theme layers and imperative audio path**

In `app/max_call_session.tsx`, read `themeMode`, memoize `getMaxHomeOrbLayers(themeMode)`, create `callOrbRef`, and route the existing audio sample without React state:

```ts
const { theme: t, f, themeMode } = useTheme();
const maxOrbLayers = useMemo(() => getMaxHomeOrbLayers(themeMode), [themeMode]);
const callOrbRef = useRef<MaxCallOrbRef>(null);

onLevels: (sample) => {
  const owner = haloOwnerRef.current;
  const level = owner === 'ai' ? sample.remote : owner === 'user' ? sample.mic : null;
  if (isTutor) callOrbRef.current?.setAudioLevel(level);
  else haloRef.current?.setMicLevel(level);
},
```

Replace only the tutor scene branch:

```tsx
{isTutor ? (
  <MaxCallOrb ref={callOrbRef} layers={maxOrbLayers} ownerVisible={phase !== 'failed'} />
) : (
  <MaxCallHalo ref={haloRef} color={haloColor} breathing={breathing} size={MAX_CALL_HYBRID.coreSize}>
    <Ionicons name={(scenario?.icon ?? 'chatbubbles-outline') as any} size={MAX_CALL_HYBRID.iconSize} color={t.accent} />
  </MaxCallHalo>
)}
```

- [ ] **Step 6: Run orb tests and verify GREEN**

Run the command from Step 2.

Expected: both suites pass and the tutor branch contains no ring/icon rendering.

- [ ] **Step 7: Commit the sphere change**

```powershell
git add -- constants/motionHybrid.ts components/max/MaxCallOrb.tsx app/max_call_session.tsx tests/max_call_orb_visual_contract.test.ts tests/max_call_live_board_integration_contract.test.ts
git commit --only -- constants/motionHybrid.ts components/max/MaxCallOrb.tsx app/max_call_session.tsx tests/max_call_orb_visual_contract.test.ts tests/max_call_live_board_integration_contract.test.ts -m "feat(max-voice): animate the full MAX sphere"
```

---

### Task 5: Replace the live caption card with a two-line subtitle rail

**Files:**
- Modify: `app/max_call_live_caption_view.tsx`
- Modify: `tests/max_call_live_caption_view.test.ts`
- Modify: `app/max_call_session.tsx:1150-1280`
- Modify: `tests/max_call_live_board_integration_contract.test.ts`

- [ ] **Step 1: Replace the old view tests with the approved rail contract**

Use these assertions in `tests/max_call_live_caption_view.test.ts`:

```ts
it('renders a noninteractive MAX-only polite live region', async () => {
  const view = await render(<MaxCallLiveCaptionView visibleAssistantText="Where would you like to go?" lang="ru" />);
  const rail = view.getByTestId('max-call-live-caption');
  expect(rail.props.accessibilityLiveRegion).toBe('polite');
  expect(rail.props.accessibilityRole).toBeUndefined();
  expect(view.getByText('Where would you like to go?').props.numberOfLines).toBe(2);
  expect(view.queryByText(/Ты:/)).toBeNull();
});

it('allows the subtitle to scale to 200 percent', async () => {
  const view = await render(<MaxCallLiveCaptionView visibleAssistantText="A complete response" lang="ru" />);
  expect(view.getByText('A complete response').props.maxFontSizeMultiplier).toBe(2);
});
```

Update the React Native mock to expose `View` and `Text`; remove `TouchableOpacity`, `fireEvent`, GlassSurface, and Ionicons mocks from this test.

- [ ] **Step 2: Run caption reducer and view tests and verify RED**

```powershell
npx jest --runTestsByPath tests/max_call_live_caption.test.ts tests/max_call_live_caption_view.test.ts --no-cache --runInBand
```

Expected: view props still require learner text and transcript callback, and the root is still a button.

- [ ] **Step 3: Implement the non-card rail**

Replace `app/max_call_live_caption_view.tsx` with:

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../components/ThemeContext';
import type { Lang } from '../constants/i18n';

type Props = { visibleAssistantText: string; lang: Lang };

export function MaxCallLiveCaptionView({ visibleAssistantText }: Props) {
  const { theme: t, f } = useTheme();
  return (
    <View
      testID="max-call-live-caption"
      accessibilityLiveRegion="polite"
      accessibilityLabel={visibleAssistantText === '' ? undefined : `MAX: ${visibleAssistantText}`}
      style={{ minHeight: 88, marginHorizontal: 22, marginBottom: 8, justifyContent: 'center' }}
    >
      {visibleAssistantText !== '' ? (
        <>
          <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8 }}>MAX</Text>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={2}
            style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800', lineHeight: Math.round(f.bodyLg * 1.35), marginTop: 6 }}
          >
            {visibleAssistantText}
          </Text>
        </>
      ) : null}
    </View>
  );
}

export default function __RouteShim() { return null; }
```

- [ ] **Step 4: Separate captions from tutor-board scrolling and preserve transcript access**

In `app/max_call_session.tsx`:

1. Render `MaxCallLiveCaptionView` directly, outside any `ScrollView`.
2. Pass only `visibleAssistantText` and `lang`.
3. Keep a bounded `ScrollView` only around `MaxTutorLiveBoard` when present.
4. Change the captions button to open the transcript sheet.
5. Add a 44 pt control in the existing sheet that toggles `ccEnabled`, so hiding captions remains available.

Use this control flow:

```tsx
{ccEnabled ? (
  <MaxCallLiveCaptionView visibleAssistantText={visibleAssistantText} lang={lang} />
) : null}

<TouchableOpacity
  testID="max-call-captions-button"
  accessibilityRole="button"
  accessibilityLabel={triLang(lang, { ru: 'Открыть текст разговора', uk: 'Відкрити текст розмови', es: 'Abrir transcripción', 'pt-BR': 'Abrir transcrição', vi: 'Mở bản ghi', id: 'Buka transkrip', tr: 'Konuşma metnini aç', pl: 'Otwórz transkrypcję' })}
  onPress={() => { hapticTap(); setSheetOpen(true); }}
>
  <Ionicons name="text-outline" size={20} color={ccEnabled ? t.accent : t.textMuted} />
</TouchableOpacity>
```

Inside the existing transcript sheet header:

```tsx
<TouchableOpacity
  testID="max-call-caption-visibility-toggle"
  accessibilityRole="switch"
  accessibilityState={{ checked: ccEnabled }}
  onPress={() => setCcEnabled((value) => !value)}
  style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
>
  <Ionicons name={ccEnabled ? 'eye-outline' : 'eye-off-outline'} size={20} color={t.accent} />
</TouchableOpacity>
```

- [ ] **Step 5: Run caption and integration tests and verify GREEN**

```powershell
npx jest --runTestsByPath tests/max_call_live_caption.test.ts tests/max_call_live_caption_view.test.ts tests/max_call_live_board_integration_contract.test.ts --no-cache --runInBand
```

Expected: reducer pacing remains green; the rail has no card/button/user line; transcript opening and subtitle visibility remain wired.

- [ ] **Step 6: Commit the subtitle rail**

```powershell
git add -- app/max_call_live_caption_view.tsx app/max_call_session.tsx tests/max_call_live_caption_view.test.ts tests/max_call_live_board_integration_contract.test.ts
git commit --only -- app/max_call_live_caption_view.tsx app/max_call_session.tsx tests/max_call_live_caption_view.test.ts tests/max_call_live_board_integration_contract.test.ts -m "feat(max-voice): simplify live subtitles"
```

---

### Task 6: Run focused integration and lifecycle verification

**Files:**
- Verify: all files touched in Tasks 1-5
- Update only if an assertion exposes a real regression: the relevant MAX test or source file

- [ ] **Step 1: Run the complete focused client gate**

```powershell
npx jest --runTestsByPath tests/max_call_client_teardown.test.ts tests/max_call_lifecycle_e2e.test.ts tests/max_call_daily_quota.test.ts tests/max_daily_quota_meter.test.tsx tests/max_call_prestart_design_contract.test.ts tests/max_call_orb_visual_contract.test.ts tests/max_call_live_caption.test.ts tests/max_call_live_caption_view.test.ts tests/max_call_live_board_integration_contract.test.ts tests/max_voice_review_server_contract.test.ts --no-cache --runInBand
```

Expected: every suite passes with no open handles.

- [ ] **Step 2: Run the focused server gate**

```powershell
Set-Location functions
npx jest --runTestsByPath src/max_voice_mint.test.ts src/max_voice_tutor_preview.test.ts --no-cache --runInBand
Set-Location ..
```

Expected: both suites pass; full and compatibility profiles explicitly request audio.

- [ ] **Step 3: Run lint only on touched TypeScript/TSX files**

```powershell
npx eslint app/max_call_client.ts app/max_call_daily_quota.ts app/max_call_prestart.tsx app/max_call_session.tsx app/max_call_live_caption.ts app/max_call_live_caption_view.tsx components/max/MaxDailyQuotaMeter.tsx components/max/MaxCallOrb.tsx constants/motionHybrid.ts tests/max_call_client_teardown.test.ts tests/max_call_daily_quota.test.ts tests/max_daily_quota_meter.test.tsx tests/max_call_orb_visual_contract.test.ts tests/max_call_live_caption_view.test.ts tests/max_call_prestart_design_contract.test.ts tests/max_call_live_board_integration_contract.test.ts
```

Expected: exit code 0 and no warnings in touched files.

- [ ] **Step 4: Inspect the final diff for scope and forbidden regressions**

Run:

```powershell
git diff --check -- app/max_call_client.ts app/max_call_daily_quota.ts app/max_call_prestart.tsx app/max_call_session.tsx app/max_call_live_caption_view.tsx components/max/MaxDailyQuotaMeter.tsx components/max/MaxCallOrb.tsx constants/motionHybrid.ts functions/src/max_voice_mint.ts tests/max_call_client_teardown.test.ts tests/max_call_daily_quota.test.ts tests/max_daily_quota_meter.test.tsx tests/max_call_orb_visual_contract.test.ts tests/max_call_live_caption_view.test.ts tests/max_call_prestart_design_contract.test.ts tests/max_call_live_board_integration_contract.test.ts functions/src/max_voice_mint.test.ts
git diff --stat -- app/max_call_client.ts app/max_call_daily_quota.ts app/max_call_prestart.tsx app/max_call_session.tsx app/max_call_live_caption_view.tsx components/max/MaxDailyQuotaMeter.tsx components/max/MaxCallOrb.tsx constants/motionHybrid.ts functions/src/max_voice_mint.ts
```

Expected: no whitespace errors; no Arena, auth, economy, admin, or unrelated files appear.

- [ ] **Step 5: Perform physical-device acceptance**

Use one iOS or Android device with a development build containing `react-native-webrtc` and `react-native-incall-manager`:

1. Open MAX prestart and confirm the daily value and bar do not change when the premint becomes ready.
2. Start the call and confirm the first greeting is audible on the intended speaker route.
3. Speak, wait for MAX, and confirm the sphere itself pulses smoothly with no surrounding rings.
4. Confirm the rail reveals MAX words only after speech begins and never exceeds two lines.
5. Open the transcript with the captions button, hide/show live subtitles, and close it.
6. End normally, then repeat once with background/foreground and once with a temporary network interruption.
7. Confirm no audio continues after teardown and the daily minutes do not jump between screens.

Expected: all seven observations pass. If the greeting transcript appears but audio is still silent, capture native route logs before changing another variable; do not add a second speculative audio fix.

- [ ] **Step 6: Record final verification evidence**

Add the exact commands, suite counts, and device/build identifier to the implementation handoff. Do not claim physical audio success without the device observation from Step 5.

---

## Plan self-review

- Spec coverage: daily quota, reservation continuity, no completed-goals metric, full sphere, no rings, reduced motion, assistant-only caption rail, transcript preservation, explicit audio mode, late route enforcement, bounded recovery, teardown, and device acceptance each map to a task above.
- Type consistency: `MaxDailyQuotaStart`, `MaxCallOrbRef`, `MAX_CALL_ORB_HYBRID`, and `MAX_CALL_REMOTE_TRACK_GRACE_MS` use the same names in their defining and consuming tasks.
- Scope: no post-call review, quota policy, billing, authentication, Arena, economy, or admin changes are included.

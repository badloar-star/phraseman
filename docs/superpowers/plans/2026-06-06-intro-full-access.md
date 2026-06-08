# Intro Full Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free 3-day post-onboarding full-access gift that unlocks premium-gated app features without marking the user as a paid Premium subscriber.

**Architecture:** Introduce a separate `intro_full_access` entitlement layer that contributes to `hasPremiumAccess` only while active. Keep real paid Premium, VIP/admin grants, and the intro gift separate so RevenueCat state, analytics, restore purchases, and app-store compliance stay clean.

**Tech Stack:** Expo React Native, TypeScript, AsyncStorage, Jest, Expo Router, existing `RewardModalBackdrop` modal system, existing `/premium_modal` paywall.

---

## Product Decision

- The gift starts after onboarding completion, not app install timestamp.
- Duration is exactly 72 hours from start.
- The user is never auto-subscribed and never billed.
- The first modal is a gift announcement, not a paywall.
- The expiration modal has one primary CTA to the existing paywall and one secondary CTA to continue free.
- Direct pricing cards do not belong in the expiration modal because the existing paywall already owns localized prices, restore purchase, legal links, and trial eligibility.

## File Structure

- Create `app/intro_full_access.ts`
  - Owns storage keys, state machine, date math, start/seen helpers, and cache invalidation helpers.
- Modify `app/premium_guard.ts`
  - Includes active intro gift in `getVerifiedPremiumAccessStatus()` only.
  - Does not include it in `getVerifiedRealPremiumStatus()` or `getVerifiedVipStatus()`.
- Modify `components/PremiumContext.tsx`
  - Exposes `isIntroFullAccess`, `introFullAccessEndsAt`, and still keeps `isPremium` paid-only.
  - Refreshes access on app events and foreground reload.
- Create `components/IntroFullAccessModal.tsx`
  - Contains both welcome and ended modal variants using the existing reward modal styling.
- Modify `app/_layout.tsx`
  - Starts the gift after onboarding, shows welcome modal once, shows ended modal once on next app entry after expiry, and avoids modal stacking.
- Modify `app/premium_modal.tsx`
  - Adds `intro_ended` context copy/analytics source for the CTA from the expiration modal.
- Create `tests/intro_full_access.test.ts`
  - Unit tests for status, 72-hour boundary, seen flags, and paid-user safety.
- Modify `tests/premium_guard.test.ts`
  - Contract tests that intro gift grants access but does not set paid Premium/VIP.
- Modify `tests/premium_context_vip_events_contract.test.ts`
  - Contract tests for the new context fields/events.
- Create `tests/intro_full_access_modal_contract.test.ts`
  - Source contract for copy, no direct prices, and paywall CTA.

---

### Task 1: Intro Full Access State Machine

**Files:**
- Create: `app/intro_full_access.ts`
- Create: `tests/intro_full_access.test.ts`

- [ ] **Step 1: Write failing tests for the entitlement state**

Create `tests/intro_full_access.test.ts`:

```ts
const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, asyncStore[k] ?? null])),
}));

beforeEach(() => {
  jest.resetModules();
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
});

describe('intro full access gift', () => {
  it('starts a 72-hour gift after onboarding and returns active state', async () => {
    const now = Date.UTC(2026, 5, 6, 10, 0, 0);
    const access = require('../app/intro_full_access');

    await access.startIntroFullAccessAfterOnboarding(now);
    const state = await access.getIntroFullAccessState(now + 60_000);

    expect(state.active).toBe(true);
    expect(state.startedAt).toBe(now);
    expect(state.endsAt).toBe(now + 72 * 60 * 60 * 1000);
    expect(state.expiredUnseen).toBe(false);
  });

  it('does not restart the gift when onboarding completion is called twice', async () => {
    const access = require('../app/intro_full_access');

    await access.startIntroFullAccessAfterOnboarding(1000);
    await access.startIntroFullAccessAfterOnboarding(9000);

    const state = await access.getIntroFullAccessState(10_000);
    expect(state.startedAt).toBe(1000);
    expect(state.endsAt).toBe(1000 + 72 * 60 * 60 * 1000);
  });

  it('expires exactly after 72 hours and reports unseen expiration once', async () => {
    const access = require('../app/intro_full_access');
    const start = 1000;
    const end = start + 72 * 60 * 60 * 1000;

    await access.startIntroFullAccessAfterOnboarding(start);

    await expect(access.getIntroFullAccessState(end - 1)).resolves.toMatchObject({
      active: true,
      expiredUnseen: false,
    });
    await expect(access.getIntroFullAccessState(end)).resolves.toMatchObject({
      active: false,
      expiredUnseen: true,
    });

    await access.markIntroFullAccessEndedSeen();
    await expect(access.getIntroFullAccessState(end + 1)).resolves.toMatchObject({
      active: false,
      expiredUnseen: false,
    });
  });

  it('tracks the welcome modal separately from access activation', async () => {
    const access = require('../app/intro_full_access');

    await access.startIntroFullAccessAfterOnboarding(1000);
    await expect(access.shouldShowIntroFullAccessWelcome()).resolves.toBe(true);

    await access.markIntroFullAccessWelcomeSeen();
    await expect(access.shouldShowIntroFullAccessWelcome()).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest --runTestsByPath tests/intro_full_access.test.ts --no-cache --runInBand
```

Expected: FAIL because `app/intro_full_access.ts` does not exist.

- [ ] **Step 3: Implement the state module**

Create `app/intro_full_access.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const INTRO_FULL_ACCESS_DURATION_MS = 72 * 60 * 60 * 1000;

const STARTED_AT_KEY = 'intro_full_access_started_at_v1';
const ENDS_AT_KEY = 'intro_full_access_ends_at_v1';
const WELCOME_SEEN_KEY = 'intro_full_access_welcome_seen_v1';
const ENDED_SEEN_KEY = 'intro_full_access_ended_seen_v1';

export type IntroFullAccessState = {
  active: boolean;
  startedAt: number | null;
  endsAt: number | null;
  remainingMs: number;
  expiredUnseen: boolean;
};

function parseMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function startIntroFullAccessAfterOnboarding(nowMs: number = Date.now()): Promise<void> {
  const existingStart = parseMs(await AsyncStorage.getItem(STARTED_AT_KEY));
  if (existingStart) return;

  const endsAt = nowMs + INTRO_FULL_ACCESS_DURATION_MS;
  await AsyncStorage.setItem(STARTED_AT_KEY, String(nowMs));
  await AsyncStorage.setItem(ENDS_AT_KEY, String(endsAt));
  await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'false');
  await AsyncStorage.setItem(ENDED_SEEN_KEY, 'false');
}

export async function getIntroFullAccessState(nowMs: number = Date.now()): Promise<IntroFullAccessState> {
  const [[, startedRaw], [, endsRaw], [, endedSeenRaw]] = await AsyncStorage.multiGet([
    STARTED_AT_KEY,
    ENDS_AT_KEY,
    ENDED_SEEN_KEY,
  ]);
  const startedAt = parseMs(startedRaw);
  const endsAt = parseMs(endsRaw);

  if (!startedAt || !endsAt) {
    return { active: false, startedAt: null, endsAt: null, remainingMs: 0, expiredUnseen: false };
  }

  const remainingMs = Math.max(0, endsAt - nowMs);
  const active = remainingMs > 0;
  const expiredUnseen = !active && endedSeenRaw !== 'true';

  return { active, startedAt, endsAt, remainingMs, expiredUnseen };
}

export async function shouldShowIntroFullAccessWelcome(): Promise<boolean> {
  const state = await getIntroFullAccessState();
  if (!state.startedAt || !state.active) return false;
  return (await AsyncStorage.getItem(WELCOME_SEEN_KEY)) !== 'true';
}

export async function markIntroFullAccessWelcomeSeen(): Promise<void> {
  await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
}

export async function markIntroFullAccessEndedSeen(): Promise<void> {
  await AsyncStorage.setItem(ENDED_SEEN_KEY, 'true');
}

export async function isIntroFullAccessActive(nowMs: number = Date.now()): Promise<boolean> {
  return (await getIntroFullAccessState(nowMs)).active;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx jest --runTestsByPath tests/intro_full_access.test.ts --no-cache --runInBand
```

Expected: PASS.

---

### Task 2: Premium Guard Integration

**Files:**
- Modify: `app/premium_guard.ts`
- Modify: `tests/premium_guard.test.ts`

- [ ] **Step 1: Add failing tests that intro access is not paid Premium**

Append to `tests/premium_guard.test.ts`:

```ts
test('intro full access grants premium-level access without making real Premium active', async () => {
  asyncStore.intro_full_access_started_at_v1 = String(Date.now() - 60_000);
  asyncStore.intro_full_access_ends_at_v1 = String(Date.now() + 60_000);
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: {} },
    activeSubscriptions: [],
  });

  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');

  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  await expect(getVerifiedVipStatus()).resolves.toBe(false);
  expect(asyncStore.premium_active).toBeUndefined();
  expect(asyncStore.vip_active).toBeUndefined();
});

test('expired intro full access does not grant premium-level access', async () => {
  asyncStore.intro_full_access_started_at_v1 = String(Date.now() - 4 * 24 * 60 * 60 * 1000);
  asyncStore.intro_full_access_ends_at_v1 = String(Date.now() - 24 * 60 * 60 * 1000);
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: {} },
    activeSubscriptions: [],
  });

  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus } = require('../app/premium_guard');

  await expect(getVerifiedPremiumStatus()).resolves.toBe(false);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx jest --runTestsByPath tests/premium_guard.test.ts --no-cache --runInBand
```

Expected: FAIL because intro access is not included in access status yet.

- [ ] **Step 3: Include intro access only in access-level status**

Modify `app/premium_guard.ts`:

```ts
import { isIntroFullAccessActive } from './intro_full_access';
```

In `getVerifiedPremiumAccessStatus()`, after tester/no-limit and before final denial, include:

```ts
if (await isIntroFullAccessActive()) {
  cachedPremiumAccess = true;
  return true;
}
```

Do not add intro checks to `getVerifiedRealPremiumStatus()` or `getVerifiedVipStatus()`.

- [ ] **Step 4: Run tests**

Run:

```bash
npx jest --runTestsByPath tests/premium_guard.test.ts tests/intro_full_access.test.ts --no-cache --runInBand
```

Expected: PASS.

---

### Task 3: Premium Context Surface

**Files:**
- Modify: `components/PremiumContext.tsx`
- Modify: `tests/premium_context_vip_events_contract.test.ts`

- [ ] **Step 1: Add a contract test for intro fields**

Append to `tests/premium_context_vip_events_contract.test.ts`:

```ts
it('exposes intro full access separately from real Premium and VIP', () => {
  expect(source).toContain('isIntroFullAccess');
  expect(source).toContain('introFullAccessEndsAt');
  expect(source).toContain('getIntroFullAccessState');
  expect(source).toContain('setHasPremiumAccess(realPremium || vip || introState.active)');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest --runTestsByPath tests/premium_context_vip_events_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because context fields are not present.

- [ ] **Step 3: Update context type and reload path**

Modify `components/PremiumContext.tsx`:

```ts
import { getIntroFullAccessState } from '../app/intro_full_access';
```

Add to the context value type:

```ts
isIntroFullAccess: boolean;
introFullAccessEndsAt: number | null;
```

In provider state:

```ts
const [isIntroFullAccess, setIsIntroFullAccess] = useState(false);
const [introFullAccessEndsAt, setIntroFullAccessEndsAt] = useState<number | null>(null);
```

Inside `runReload()`:

```ts
const introState = await getIntroFullAccessState();
setIsIntroFullAccess(introState.active);
setIntroFullAccessEndsAt(introState.endsAt);
setHasPremiumAccess(realPremium || vip || introState.active);
```

When building the provider value:

```ts
isIntroFullAccess,
introFullAccessEndsAt,
```

- [ ] **Step 4: Add intro access event refresh**

Where provider subscribes to access events, also listen for:

```ts
onAppEvent('intro_full_access_changed', () => {
  void runReload();
});
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npx jest --runTestsByPath tests/premium_context_vip_events_contract.test.ts tests/premium_guard.test.ts --no-cache --runInBand
```

Expected: PASS.

---

### Task 4: Welcome And Expiration Modals

**Files:**
- Create: `components/IntroFullAccessModal.tsx`
- Create: `tests/intro_full_access_modal_contract.test.ts`

- [ ] **Step 1: Write a source contract for copy and CTA behavior**

Create `tests/intro_full_access_modal_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

describe('intro full access modal contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'components', 'IntroFullAccessModal.tsx'), 'utf8');

  it('uses the shared reward modal styling instead of a one-off surface', () => {
    expect(source).toContain('RewardModalBackdrop');
    expect(source).toContain('rewardModalPrimaryButtonColors');
  });

  it('states that the gift does not auto-start a subscription', () => {
    expect(source).toContain('Подписка не включается автоматически');
  });

  it('keeps direct prices out of the expiration modal', () => {
    expect(source).not.toMatch(/₽|\\$|€|\\/мес|\\/год|month|year/i);
  });

  it('offers paywall CTA and free continuation on expiration', () => {
    expect(source).toContain('Оставить полный доступ');
    expect(source).toContain('Продолжить бесплатно');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest --runTestsByPath tests/intro_full_access_modal_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Create modal component**

Create `components/IntroFullAccessModal.tsx` with two variants:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkles, LockOpen, ShieldCheck } from 'lucide-react-native';
import {
  RewardModalBackdrop,
  RewardModalPanelBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

type Props = {
  visible: boolean;
  variant: 'welcome' | 'ended';
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
};

export function IntroFullAccessModal({ visible, variant, onPrimaryPress, onSecondaryPress }: Props) {
  const isWelcome = variant === 'welcome';

  return (
    <RewardModalBackdrop visible={visible} onRequestClose={onSecondaryPress ?? onPrimaryPress}>
      <RewardModalPanelBackdrop style={styles.panel}>
        <View style={styles.iconWrap}>
          {isWelcome ? <Sparkles size={26} color={rewardModalAccentColor} /> : <ShieldCheck size={26} color={rewardModalAccentColor} />}
        </View>
        <Text style={styles.eyebrow}>{isWelcome ? 'Подарок на старт' : 'Подарочный режим завершился'}</Text>
        <Text style={styles.title}>
          {isWelcome ? 'Три дня - все приложение без замков' : 'Бесплатный режим остается с тобой'}
        </Text>
        <Text style={styles.body}>
          {isWelcome
            ? 'Мы открыли тебе уроки, планы, темы, аналитику ошибок и режим без энергии. Можно спокойно нажимать все подряд - научный метод, почти.'
            : 'Три дня полного доступа закончились. Учиться бесплатно все еще можно: уроки, фразы и прогресс остаются. Премиум-фишки снова ждут за Premium, если захочется оставить все открытым.'}
        </Text>
        {isWelcome ? (
          <View style={styles.chips}>
            {['Все уроки', 'Все планы', 'Без энергии', 'Темы', 'Аналитика'].map((label) => (
              <View key={label} style={styles.chip}>
                <LockOpen size={14} color={rewardModalAccentColor} />
                <Text style={styles.chipText}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={onPrimaryPress}>
          <Text style={styles.primaryText}>{isWelcome ? 'Погнали, все открыто' : 'Оставить полный доступ'}</Text>
        </Pressable>
        {!isWelcome ? (
          <Pressable style={styles.secondaryButton} onPress={onSecondaryPress}>
            <Text style={styles.secondaryText}>Продолжить бесплатно</Text>
          </Pressable>
        ) : (
          <Text style={styles.footer}>Это подарок. Подписка не включается автоматически.</Text>
        )}
      </RewardModalPanelBackdrop>
    </RewardModalBackdrop>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 24,
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: rewardModalSoftSurface,
    borderWidth: 1,
    borderColor: rewardModalPanelBorder,
  },
  eyebrow: {
    color: rewardModalAccentColor,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  body: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: rewardModalSoftSurface,
    borderWidth: 1,
    borderColor: rewardModalPanelBorder,
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: rewardModalPrimaryButtonColors[0],
  },
  primaryText: {
    color: rewardModalPrimaryButtonText,
    fontSize: 17,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
});
```

- [ ] **Step 4: Run modal contract**

Run:

```bash
npx jest --runTestsByPath tests/intro_full_access_modal_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

---

### Task 5: Onboarding And App-Entry Orchestration

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `tests/onboarding_finish_navigation.test.ts` or create `tests/intro_full_access_layout_contract.test.ts`

- [ ] **Step 1: Add layout source contract**

Create `tests/intro_full_access_layout_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

describe('intro full access layout orchestration', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

  it('starts the intro gift only from onboarding completion', () => {
    expect(source).toContain('startIntroFullAccessAfterOnboarding');
    expect(source).toContain('markIntroFullAccessWelcomeSeen');
  });

  it('shows the expired gift modal without stacking it over onboarding', () => {
    expect(source).toContain('getIntroFullAccessState');
    expect(source).toContain('expiredUnseen');
    expect(source).toContain('IntroFullAccessModal');
  });

  it('routes the expiration CTA to the existing paywall context', () => {
    expect(source).toContain("context: 'intro_ended'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest --runTestsByPath tests/intro_full_access_layout_contract.test.ts --no-cache --runInBand
```

Expected: FAIL.

- [ ] **Step 3: Wire intro start after onboarding**

In `app/_layout.tsx`, import:

```ts
import { IntroFullAccessModal } from '../components/IntroFullAccessModal';
import {
  getIntroFullAccessState,
  markIntroFullAccessEndedSeen,
  markIntroFullAccessWelcomeSeen,
  shouldShowIntroFullAccessWelcome,
  startIntroFullAccessAfterOnboarding,
} from './intro_full_access';
```

Add local state:

```ts
const [introModalVariant, setIntroModalVariant] = useState<'welcome' | 'ended' | null>(null);
```

Inside `handleOnboardingDone()`, after onboarding is persisted and before existing post-onboarding sheets are shown:

```ts
await startIntroFullAccessAfterOnboarding();
emitAppEvent('intro_full_access_changed');
if (await shouldShowIntroFullAccessWelcome()) {
  setIntroModalVariant('welcome');
}
```

- [ ] **Step 4: Wire expiration check on app entry**

In the existing foreground/startup reload effect, add:

```ts
const introState = await getIntroFullAccessState();
if (introState.expiredUnseen && !premiumContext.hasPremiumAccessFromPaidSource) {
  setIntroModalVariant('ended');
}
```

If `hasPremiumAccessFromPaidSource` does not exist, use existing context values:

```ts
if (introState.expiredUnseen && !isPremium && !isVip) {
  setIntroModalVariant('ended');
}
```

- [ ] **Step 5: Render modals after onboarding/splash guards**

Near existing modal rendering:

```tsx
<IntroFullAccessModal
  visible={introModalVariant !== null}
  variant={introModalVariant ?? 'welcome'}
  onPrimaryPress={async () => {
    if (introModalVariant === 'welcome') {
      await markIntroFullAccessWelcomeSeen();
      setIntroModalVariant(null);
      return;
    }
    await markIntroFullAccessEndedSeen();
    setIntroModalVariant(null);
    router.push({ pathname: '/premium_modal', params: { context: 'intro_ended' } });
  }}
  onSecondaryPress={async () => {
    if (introModalVariant === 'welcome') {
      await markIntroFullAccessWelcomeSeen();
    } else {
      await markIntroFullAccessEndedSeen();
    }
    setIntroModalVariant(null);
  }}
/>
```

- [ ] **Step 6: Run layout contract**

Run:

```bash
npx jest --runTestsByPath tests/intro_full_access_layout_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

---

### Task 6: Paywall Context And Analytics

**Files:**
- Modify: `app/premium_modal.tsx`
- Modify: `tests/premium_modal_locale.test.ts` or create `tests/premium_modal_intro_ended_contract.test.ts`

- [ ] **Step 1: Add paywall context contract**

Create `tests/premium_modal_intro_ended_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

describe('premium modal intro-ended context', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

  it('has a dedicated intro_ended context', () => {
    expect(source).toContain('intro_ended');
    expect(source).toContain('Подарочный доступ закончился');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest --runTestsByPath tests/premium_modal_intro_ended_contract.test.ts --no-cache --runInBand
```

Expected: FAIL.

- [ ] **Step 3: Add the context copy**

In `app/premium_modal.tsx`, extend the context union/type with:

```ts
| 'intro_ended'
```

Add context-specific copy:

```ts
intro_ended: {
  title: 'Подарочный доступ закончился',
  subtitle: 'Можно продолжить бесплатно или оставить все открытым с Premium.',
}
```

Keep pricing/package rendering inside the existing paywall only.

- [ ] **Step 4: Run paywall test**

Run:

```bash
npx jest --runTestsByPath tests/premium_modal_intro_ended_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

---

### Task 7: Focused Verification

**Files:**
- No source edits unless a focused test exposes a real defect.

- [ ] **Step 1: Run intro access and premium guard tests**

Run:

```bash
npx jest --runTestsByPath tests/intro_full_access.test.ts tests/premium_guard.test.ts tests/premium_context_vip_events_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run modal/layout/paywall contracts**

Run:

```bash
npx jest --runTestsByPath tests/intro_full_access_modal_contract.test.ts tests/intro_full_access_layout_contract.test.ts tests/premium_modal_intro_ended_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run a dev build smoke check**

Run Metro/dev build using the existing project scripts:

```bash
npm run dev:emu:install
npm run metro:emu
```

Expected:
- App opens in the dev build.
- After a clean onboarding path, the welcome modal appears.
- Premium lessons/plans/themes are unlocked during the gift.
- Energy is not spent during the gift.
- Expiring the storage timestamp in dev causes the ended modal to appear on next app entry.
- "Оставить полный доступ" opens `/premium_modal?context=intro_ended`.
- "Продолжить бесплатно" closes the modal and does not reopen it.

---

## Self-Review

- Spec coverage:
  - Post-onboarding welcome modal: Task 4 and Task 5.
  - Three days full unlock: Task 1, Task 2, Task 3.
  - Not real Premium: Task 2.
  - Energy does not spend: covered by using `hasPremiumAccess`, then verified in Task 7.
  - Expiration modal: Task 4 and Task 5.
  - Gentle expiration copy: Task 4.
  - Pricing decision: Task 6 keeps prices in paywall only.
  - iPhone/Android support: React Native-only logic, no platform-specific storage or native module added.
- Placeholder scan:
  - No TBD/TODO placeholders.
- Type consistency:
  - `isIntroFullAccess`, `introFullAccessEndsAt`, `intro_full_access_changed`, and `intro_ended` are named consistently across tasks.

## Execution Recommendation

Use subagent-driven or inline task execution after approval. The riskiest pieces are Task 3 and Task 5 because they touch global app state and overlay ordering; verify them before moving to the next task.

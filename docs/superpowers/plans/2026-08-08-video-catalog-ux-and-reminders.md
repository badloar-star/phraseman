# Video Catalog UX and Reminder Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Video screen legible, retryable, and able to request notification permission from an explicit premiere-reminder tap.

**Architecture:** Keep `YoutubePremiereHero` as the visual unit, but separate its thumbnail from its metadata/action panel. Keep reminder orchestration in `app/youtube_premiere_notifications.ts`; permission must be asked before the existing master-preference gate so a fresh installation can establish its preference after a user tap. Keep catalog retry owned by `LingmanVideosScreen` and reuse `loadCatalog`.

**Tech Stack:** React Native, Expo Notifications, Expo Image, TypeScript, Jest.

---

### Task 1: Establish the failing UI contracts

**Files:**
- Modify: `tests/lingman_videos_catalog_contract.test.ts`
- Modify: `tests/youtube_premiere_notifications.test.ts`

- [x] **Step 1: Write failing UI and retry expectations**

```ts
expect(source).toContain('testID="youtube-premiere-thumbnail"');
expect(source).toContain('testID="youtube-premiere-details"');
expect(source).toContain('testID="youtube-catalog-retry"');
expect(source).toContain('onPress={() => void loadCatalog(undefined, true)}');
```

- [x] **Step 2: Write the failing permission-order expectation**

```ts
const off = dependencies({ isMasterEnabled: jest.fn(async () => false) });
await requestYoutubePremiereReminderFromTap(premiere, { nowMs, dependencies: off });
expect(off.requestPermission).toHaveBeenCalledTimes(1);
expect(off.schedule).not.toHaveBeenCalled();
```

- [x] **Step 3: Run the focused suites and verify RED**

Run: `npm test -- --runTestsByPath tests/lingman_videos_catalog_contract.test.ts tests/youtube_premiere_notifications.test.ts --runInBand`

Expected: FAIL because the thumbnail/details/retry test IDs and permission-first call order do not yet exist.

### Task 2: Repair the explicit reminder flow

**Files:**
- Modify: `app/youtube_premiere_notifications.ts`
- Test: `tests/youtube_premiere_notifications.test.ts`

- [x] **Step 1: Move the permission request before the master gate**

```ts
const permission = await dependencies.requestPermission();
if (!permission.granted) {
  return { ok: false, reason: permission.blocked ? 'permission_blocked' : 'permission_denied' };
}
if (!(await dependencies.isMasterEnabled())) return { ok: false, reason: 'master_disabled' };
```

This preserves an intentional in-app master opt-out while allowing a fresh installation to obtain native permission through the explicit tap.

- [x] **Step 2: Run the reminder suite and verify GREEN**

Run: `npm test -- --runTestsByPath tests/youtube_premiere_notifications.test.ts --runInBand`

Expected: PASS with the new ordering assertion and all scheduling/reconciliation checks.

### Task 3: Separate preview, details, and catalog retry

**Files:**
- Modify: `components/youtube/YoutubePremiereHero.tsx`
- Modify: `app/lingman_videos.tsx`
- Test: `tests/lingman_videos_catalog_contract.test.ts`

- [x] **Step 1: Render preview and information as distinct sibling blocks**

```tsx
<View testID="youtube-premiere-thumbnail" style={styles.thumbnail}>
  <Image source={{ uri: video.thumbnailUrl }} style={styles.image} contentFit="cover" />
  <View style={styles.imageScrim} />
  <View style={styles.badge}>{/* state */}</View>
</View>
<View testID="youtube-premiere-details" style={styles.details}>
  {/* title, countdown, watch and reminder */}
</View>
```

The thumbnail uses `aspectRatio: 16 / 9`; the details use the theme card background and retain 48 dp buttons.

- [x] **Step 2: Add the no-catalog retry button**

```tsx
<TouchableOpacity
  testID="youtube-catalog-retry"
  accessibilityRole="button"
  accessibilityLabel={copy.retry}
  disabled={refreshing}
  onPress={() => void loadCatalog(undefined, true)}
>
  <Text>{copy.retry}</Text>
</TouchableOpacity>
```

Place it inside the catalog-error view and add the localized `retry` copy. Existing cached/offline content remains displayed instead of being replaced.

- [x] **Step 3: Run the catalog contract suite and verify GREEN**

Run: `npm test -- --runTestsByPath tests/lingman_videos_catalog_contract.test.ts --runInBand`

Expected: PASS with the separated-structure and retry-action assertions.

### Task 4: Verify the changed feature

**Files:**
- Verify: `app/youtube_premiere_notifications.ts`
- Verify: `components/youtube/YoutubePremiereHero.tsx`
- Verify: `app/lingman_videos.tsx`

- [x] **Step 1: Run focused tests**

Run: `npm test -- --runTestsByPath tests/lingman_videos_catalog_contract.test.ts tests/youtube_premiere_notifications.test.ts tests/youtube_catalog_integration.test.ts --runInBand`

Expected: PASS, 0 failed tests.

- [x] **Step 2: Type-check the app**

Run: `npx tsc --noEmit --pretty false`

Expected: exit code 0.

- [x] **Step 3: Inspect only the intended diff**

Run: `git diff -- app/lingman_videos.tsx components/youtube/YoutubePremiereHero.tsx app/youtube_premiere_notifications.ts tests/lingman_videos_catalog_contract.test.ts tests/youtube_premiere_notifications.test.ts`

Expected: only the catalog UI, explicit reminder flow, and related tests changed.

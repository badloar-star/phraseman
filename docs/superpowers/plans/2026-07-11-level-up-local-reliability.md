# Level-Up Local Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать локальную выдачу подарков за новые уровни и глобальный показ level-up модала устойчивыми к конкурирующим модалкам, перезапуску, foreground и временным ошибкам AsyncStorage без исторической или межустройственной повторной выдачи.

**Architecture:** Новый `level_up_reward_reconciler.ts` становится единственной точкой, которая последовательно превращает подтверждённый диапазон XP в сохранённые entitlement-наборы, очередь показа и retry marker. Инвентарь возвращает явные статусы `persisted/already_pending/already_claimed/failed`, а глобальный host ремонтирует старую очередь до показа, подтверждает нативный показ только через `Modal.onShow` и перечитывает состояние при foreground.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, Jest, существующие `OverlayArbiter`, `level_gift_inventory`, `progress_events_client` и event bus.

---

## Карта файлов

- Create: `app/level_up_reward_reconciler.ts` — сериализованный диапазон XP → entitlement + persistent queue + retry.
- Create: `tests/level_up_reward_reconciler.test.ts` — поведение multi-level, retry, claimed и repair.
- Modify: `app/level_gift_inventory.ts` — статусный API создания single/dual entitlement без скрытия ошибок.
- Modify: `tests/level_gift_inventory.test.ts` — статусы, Premium-upgrade и защита частично полученного dual-набора.
- Modify: `app/xp_manager.ts` — заменить fire-and-forget gift/queue на reconciler.
- Modify: `tests/xp_manager_register_xp.test.ts` — доказать ожидание reconciler и очередь только после сохранения.
- Modify: `app/progress_events_client.ts` — серверное зеркало вызывает тот же reconciler вместо отдельной очереди.
- Modify: `tests/progress_events_client_queue.test.ts` — новый подтверждённый server event создаёт entitlement; stale mirror — нет.
- Modify: `tests/boot_cloud_restore_contract.test.ts` — общий cloud restore не становится источником новых entitlement.
- Modify: `app/friend_quests.ts` — серверно подтверждённый quest XP проходит через reconciler.
- Modify: `tests/friend_quests.test.ts` — quest reward создаёт level-up entitlement только при реальном росте XP.
- Modify: `components/overlay_arbiter_core.ts` — `levelUp` становится native-modal key.
- Modify: `tests/overlay_arbiter.test.ts` — native handoff для `levelUp`.
- Modify: `app/_layout.tsx` — preflight repair, `Modal.onShow`, foreground reread.
- Modify: `tests/level_up_sheet_contract.test.ts` — контракт onShow и отсутствие раннего ack.

### Task 1: Статусный API level-gift entitlement

**Files:**
- Modify: `app/level_gift_inventory.ts:1-339`
- Test: `tests/level_gift_inventory.test.ts`

- [ ] **Step 1: Написать падающие тесты статусов single/claimed/failed**

Добавить импорты и тесты:

```ts
import {
  ensureLevelGiftEntitlement,
  LEVEL_GIFT_ENTITLEMENT_FAILED,
} from '../app/level_gift_inventory';

it('returns persisted once and already_pending on retry', async () => {
  await expect(ensureLevelGiftEntitlement(5)).resolves.toMatchObject({
    level: 5,
    status: 'persisted',
    kind: 'single',
  });
  await expect(ensureLevelGiftEntitlement(5)).resolves.toMatchObject({
    level: 5,
    status: 'already_pending',
    kind: 'single',
  });
});

it('returns already_claimed without recreating a pending gift', async () => {
  await AsyncStorage.setItem('claimed_level_gifts', JSON.stringify({ 6: 'rare' }));
  await expect(ensureLevelGiftEntitlement(6)).resolves.toEqual({
    level: 6,
    status: 'already_claimed',
  });
  await expect(loadPendingLevelGiftInventory()).resolves.toEqual([]);
});

it('reports failed when the inventory write is not durable', async () => {
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error('disk unavailable'));
  await expect(ensureLevelGiftEntitlement(7)).resolves.toEqual({
    level: 7,
    status: LEVEL_GIFT_ENTITLEMENT_FAILED,
  });
});
```

- [ ] **Step 2: Запустить тест и подтвердить RED**

Run: `npx jest tests/level_gift_inventory.test.ts --runInBand`

Expected: FAIL — `ensureLevelGiftEntitlement` и `LEVEL_GIFT_ENTITLEMENT_FAILED` ещё не экспортируются.

- [ ] **Step 3: Реализовать явный результат без проглатывания ошибки**

Добавить в `app/level_gift_inventory.ts`:

```ts
import {
  rollF2pLevelGiftForUser,
  rollPremiumLevelGiftForUser,
  sanitizeLevelGiftForStudyTarget,
  type GiftDef,
} from './level_gift_system';

export const LEVEL_GIFT_ENTITLEMENT_FAILED = 'failed' as const;

export type LevelGiftEntitlementResult =
  | { level: number; status: 'persisted' | 'already_pending'; kind: 'single'; gift: GiftDef }
  | { level: number; status: 'persisted' | 'already_pending'; kind: 'dual'; pair: PremPair }
  | { level: number; status: 'already_claimed' | 'failed' };

export type EnsureLevelGiftEntitlementOptions = {
  premium?: boolean;
  studyTarget?: RuntimeStudyTarget;
};
```

Реализовать `ensureLevelGiftEntitlement(level, options)` так, чтобы он одним чтением `multiGet` проверял single, dual и claimed; не ловил ошибку записи как успех; создавал F2P gift через `rollF2pLevelGiftForUser`; записывал его через `saveUnclaimedGift`; после записи перечитывал `UNCLAIMED_GIFTS_KEY` и только затем возвращал `persisted`.

Сохранить обратную совместимость:

```ts
export const ensureUnclaimedGiftForLevel = async (
  level: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<GiftDef | null> => {
  const result = await ensureLevelGiftEntitlement(level, { studyTarget });
  if (result.status === 'failed' || result.status === 'already_claimed') return null;
  return result.kind === 'dual' ? result.pair.f2p : result.gift;
};
```

- [ ] **Step 4: Добавить RED-тесты Premium upgrade и partial-dual защиты**

```ts
it('upgrades an untouched pending single entitlement to a premium dual pair', async () => {
  await saveUnclaimedGift(8, makeGift('f2p-8'));
  await expect(ensureLevelGiftEntitlement(8, { premium: true })).resolves.toMatchObject({
    status: 'persisted',
    kind: 'dual',
    pair: { f2p: { id: 'f2p-8' } },
  });
  await expect(loadPendingLevelGiftCount()).resolves.toBe(2);
});

it('does not upgrade a remaining single part after a partial dual claim', async () => {
  await saveUnclaimedDualGift(9, {
    f2p: makeGift('f2p-9'),
    prem: makeGift('premium-9', 'epic'),
  });
  await markDualGiftPartClaimed(9, 'f2p');
  await saveClaimedGiftRarity(9, 'common');
  await expect(ensureLevelGiftEntitlement(9, { premium: true })).resolves.toMatchObject({
    status: 'already_pending',
    kind: 'single',
    gift: { id: 'premium-9' },
  });
});
```

- [ ] **Step 5: Реализовать Premium upgrade минимально**

Если `premium === true`, dual отсутствует, single существует и claimed rarity для уровня отсутствует, сохранить `{ f2p: existingSingle, prem: await rollPremiumLevelGiftForUser(...) }` через `saveUnclaimedDualGift`. Затем обязательно перечитать обе карты и подтвердить, что dual содержит точные id обоих подарков, а конфликтующая single-запись отсутствует; иначе вернуть `failed`. Если single существует вместе с claimed rarity, считать его оставшейся частью ранее частично полученного dual-набора и вернуть `already_pending/single` без апгрейда.

- [ ] **Step 6: Запустить GREEN**

Run: `npx jest tests/level_gift_inventory.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/level_gift_inventory.ts tests/level_gift_inventory.test.ts
git commit -m "feat: make level gift entitlements explicit"
```

### Task 2: Сериализованный reconciler, очередь и retry

**Files:**
- Create: `app/level_up_reward_reconciler.ts`
- Create: `tests/level_up_reward_reconciler.test.ts`

- [ ] **Step 1: Написать RED-тест диапазона и идемпотентности**

```ts
it('persists every crossed level sequentially before queueing it', async () => {
  const result = await reconcileLevelUpRewards(xpForLevel(4), xpForLevel(7));
  expect(result.map((row) => [row.level, row.status])).toEqual([
    [5, 'persisted'], [6, 'persisted'], [7, 'persisted'],
  ]);
  expect(JSON.parse(String(await AsyncStorage.getItem(PENDING_LEVEL_UP_QUEUE_KEY))))
    .toEqual([5, 6, 7]);
  expect(ensureLevelGiftEntitlement).toHaveBeenCalledTimes(3);

  await reconcileLevelUpRewards(xpForLevel(4), xpForLevel(7));
  expect(JSON.parse(String(await AsyncStorage.getItem(PENDING_LEVEL_UP_QUEUE_KEY))))
    .toEqual([5, 6, 7]);
});
```

В тестовом helper использовать реальные `getLevelFromXP` и пороги из `TOTAL_XP_FOR_LEVEL`, а `ensureLevelGiftEntitlement` мокать последовательными результатами.

- [ ] **Step 2: Написать RED-тест failed/retry/claimed**

```ts
it('keeps failed levels out of the show queue and retries them durably', async () => {
  ensureLevelGiftEntitlement
    .mockResolvedValueOnce({ level: 5, status: 'failed' })
    .mockResolvedValueOnce({ level: 5, status: 'persisted', kind: 'single', gift: makeGift('g5') });

  await reconcileLevelUpRewards(xpForLevel(4), xpForLevel(5));
  expect(await AsyncStorage.getItem(PENDING_LEVEL_UP_QUEUE_KEY)).toBeNull();
  expect(JSON.parse(String(await AsyncStorage.getItem(LEVEL_UP_REWARD_RETRY_KEY)))).toEqual([5]);

  await retryPendingLevelUpRewards();
  expect(JSON.parse(String(await AsyncStorage.getItem(PENDING_LEVEL_UP_QUEUE_KEY)))).toEqual([5]);
  expect(await AsyncStorage.getItem(LEVEL_UP_REWARD_RETRY_KEY)).toBeNull();
});

it('drops already claimed legacy queue entries without showing them', async () => {
  await AsyncStorage.setItem(PENDING_LEVEL_UP_QUEUE_KEY, JSON.stringify([5]));
  ensureLevelGiftEntitlement.mockResolvedValue({ level: 5, status: 'already_claimed' });
  await repairPendingLevelUpRewards();
  expect(await AsyncStorage.getItem(PENDING_LEVEL_UP_QUEUE_KEY)).toBeNull();
});
```

- [ ] **Step 3: Запустить тест и подтвердить RED**

Run: `npx jest tests/level_up_reward_reconciler.test.ts --runInBand`

Expected: FAIL — модуль отсутствует.

- [ ] **Step 4: Реализовать модуль**

Экспортировать:

```ts
export const PENDING_LEVEL_UP_QUEUE_KEY = 'pending_level_up_queue';
export const LEVEL_UP_REWARD_RETRY_KEY = 'pending_level_up_reward_retry_v1';

export async function reconcileLevelUpRewards(
  previousXp: number,
  nextXp: number,
  options: EnsureLevelGiftEntitlementOptions = {},
): Promise<LevelGiftEntitlementResult[]>;

export async function repairPendingLevelUpRewards(
  options: EnsureLevelGiftEntitlementOptions = {},
): Promise<number[]>;

export async function retryPendingLevelUpRewards(
  options: EnsureLevelGiftEntitlementOptions = {},
): Promise<number[]>;

export async function acknowledgePendingLevelUpShown(level: number): Promise<void>;
```

Все публичные операции пропускать через один module-level promise lock. Внутри создать приватные unlocked helpers (`reconcileLevelsUnlocked`, `repairPendingUnlocked`, `retryPendingUnlocked`), чтобы публичные repair/retry не вызывали друг друга через тот же lock и не создавали self-deadlock:

```ts
let reconcileLock: Promise<unknown> = Promise.resolve();

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = reconcileLock.then(work, work);
  reconcileLock = run.then(() => undefined, () => undefined);
  return run;
}
```

Для `persisted/already_pending` добавлять уровень в queue; для `already_claimed` удалять из queue/retry; для `failed` удалять из show queue и добавлять в retry. После успешной записи непустой show queue вызывать `emitAppEvent('level_up_pending')`. При полном отказе записи retry держать в module-level `Set<number>` и повторять в текущем процессе. `acknowledgePendingLevelUpShown(level)` через тот же `serialized(...)` lock читает актуальную очередь, удаляет только подтверждённый уровень и записывает остальные: отдельной queue read-modify-write операции в `_layout.tsx` не остаётся.

- [ ] **Step 5: Запустить GREEN и проверки гонок**

Добавить тест с `Promise.all` двух пересекающихся диапазонов и ожиданием уникальной отсортированной очереди. Добавить второй тест: одновременно запустить `acknowledgePendingLevelUpShown(5)` и reconcile нового уровня 6; итоговая очередь обязана быть `[6]`, без потери нового уровня и без воскрешения 5. Добавить тест, где запись durable retry marker падает: уровень остаётся в in-memory retry и успешно восстанавливается повторным `retryPendingLevelUpRewards()` в том же процессе. Затем выполнить:

Run: `npx jest tests/level_up_reward_reconciler.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/level_up_reward_reconciler.ts tests/level_up_reward_reconciler.test.ts
git commit -m "feat: reconcile durable level-up rewards"
```

### Task 3: Подключить фактические источники нового XP

**Files:**
- Modify: `app/xp_manager.ts:40,465-498`
- Modify: `tests/xp_manager_register_xp.test.ts`
- Modify: `app/progress_events_client.ts:396-420,484-529`
- Modify: `tests/progress_events_client_queue.test.ts`
- Modify: `tests/boot_cloud_restore_contract.test.ts`
- Modify: `app/friend_quests.ts:55-66`
- Modify: `tests/friend_quests.test.ts`

- [ ] **Step 1: Написать RED-тест xp_manager**

Мокать reconciler:

```ts
jest.mock('../app/level_up_reward_reconciler', () => ({
  reconcileLevelUpRewards: jest.fn(async () => []),
}));
```

Добавить сценарий crossing level threshold и проверить:

```ts
expect(reconcileLevelUpRewards).toHaveBeenCalledWith(currentXp, nextXp);
expect(emitAppEvent).not.toHaveBeenCalledWith('level_up_pending');
```

Последняя проверка фиксирует, что отдельная ручная очередь удалена из `xp_manager` и событием владеет reconciler.

- [ ] **Step 2: Запустить RED**

Run: `npx jest tests/xp_manager_register_xp.test.ts --runInBand`

Expected: FAIL — reconciler не вызывается.

- [ ] **Step 3: Заменить старый цикл xp_manager**

Удалить импорт `ensureUnclaimedGiftForLevel`, ручные чтение/запись `pending_level_up_queue` и `emitAppEvent('level_up_pending')`. После вычисления `prevLvl/newLvl` и записи нового XP выполнить:

```ts
await reconcileLevelUpRewards(currentTotal, newTotal);
```

Оставить avatar/frame, `energy_reload`, `xp_changed`, friend event и achievements без удаления.

- [ ] **Step 4: Написать RED-тест серверного mirror**

В `loadClient` замокать reconciler и добавить:

```ts
it('reconciles only a newly applied server event and ignores duplicates or stale mirrors', async () => {
  await AsyncStorage.setItem('user_total_xp', '100');
  await client.mirrorProgressResultToLocal(progressResult({ totalXp: 500, xpDelta: 400, duplicate: false }));
  expect(reconcileLevelUpRewards).toHaveBeenCalledWith(100, 500);

  reconcileLevelUpRewards.mockClear();
  await client.mirrorProgressResultToLocal(progressResult({ totalXp: 600, xpDelta: 100, duplicate: true }));
  expect(reconcileLevelUpRewards).not.toHaveBeenCalled();

  await client.mirrorProgressResultToLocal(progressResult({ totalXp: 400, xpDelta: 0, duplicate: false }));
  expect(reconcileLevelUpRewards).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Заменить `enqueueMirroredLevelUps` на reconciler**

Удалить локальную функцию `enqueueMirroredLevelUps`. После `multiSet` оставить условие роста и вызвать:

```ts
if (
  result.duplicate !== true
  && parseNonNegativeNumber(result.xpDelta) > 0
  && mergedTotalXp > localTotalBeforeMirror
) {
  await reconcileLevelUpRewards(localTotalBeforeMirror, mergedTotalXp);
}
```

Не изменять `cloud_sync.ts`: обычный restore не должен выдавать entitlement.

- [ ] **Step 6: Написать RED-тест friend quest**

Для ответа с `rewardApplied: true` и `callerXp` выше локального проверить один вызов reconciler с диапазоном. Для `rewardApplied: false` даже при более высоком `callerXp`, а также для равного/меньшего XP — отсутствие вызова.

```ts
expect(reconcileLevelUpRewards).toHaveBeenCalledWith(100, 500);

expect(reconcileLevelUpRewards).not.toHaveBeenCalled(); // rewardApplied: false
```

- [ ] **Step 7: Зафиксировать отсутствие entitlement из общего cloud restore**

В `tests/boot_cloud_restore_contract.test.ts` добавить source-contract:

```ts
it('does not infer level gift entitlements from a generic cloud restore', () => {
  const cloudSync = readFileSync(path.join(repoRoot, 'app/cloud_sync.ts'), 'utf8');
  expect(cloudSync).not.toContain("from './level_up_reward_reconciler'");
  expect(cloudSync).not.toContain('reconcileLevelUpRewards(');
});
```

Этот тест намеренно отличает `cloud_sync` от `progress_events_client`: только подтверждённый новый progress event имеет право создавать локальную награду.

- [ ] **Step 8: Подключить friend quest mirror**

Передать в `mirrorCallerXpWithoutRollback` явный флаг `rewardApplied` из ответа claim. Вычислить `nextXp = Math.max(localXp, serverXp)`, сначала записать `user_total_xp`, затем вызвать reconciler только для действительно применённой награды:

```ts
if (rewardApplied === true && nextXp > localXp) {
  await reconcileLevelUpRewards(localXp, nextXp);
}
```

- [ ] **Step 9: Запустить GREEN по всем источникам**

Run: `npx jest tests/xp_manager_register_xp.test.ts tests/progress_events_client_queue.test.ts tests/friend_quests.test.ts tests/boot_cloud_restore_contract.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add app/xp_manager.ts app/progress_events_client.ts app/friend_quests.ts tests/xp_manager_register_xp.test.ts tests/progress_events_client_queue.test.ts tests/friend_quests.test.ts tests/boot_cloud_restore_contract.test.ts
git commit -m "fix: route level-up rewards through reconciler"
```

### Task 4: Надёжный native Modal lifecycle и foreground repair

**Files:**
- Modify: `components/overlay_arbiter_core.ts:144-171`
- Modify: `tests/overlay_arbiter.test.ts:302-335`
- Modify: `app/_layout.tsx:653-986`
- Modify: `tests/level_up_sheet_contract.test.ts`

- [ ] **Step 1: Написать RED-тест native handoff**

```ts
expect(isNativeModal('levelUp')).toBe(true);
expect(needsHandoffGap('update', 'levelUp')).toBe(true);
expect(needsHandoffGap('levelUp', 'releaseNotes')).toBe(true);
```

- [ ] **Step 2: Запустить RED**

Run: `npx jest tests/overlay_arbiter.test.ts --runInBand`

Expected: FAIL — `levelUp` отсутствует в `NATIVE_MODAL_KEYS`.

- [ ] **Step 3: Добавить `levelUp` в native keys**

В `NATIVE_MODAL_KEYS` добавить строку:

```ts
'levelUp',
```

- [ ] **Step 4: Написать RED-контракт lifecycle**

В `tests/level_up_sheet_contract.test.ts` проверить:

```ts
expect(source).toContain('onShow={acknowledgeNativeLevelUpShown}');
expect(source).not.toMatch(/useEffect\(\(\) => \{\s*if \(!showLevelUp \|\| !levelUpOverlayVisible\) return;\s*removeShownLevelFromPersistentQueue/);
expect(source).toContain("AppState.addEventListener('change'");
expect(source).toContain('repairPendingLevelUpRewards');
expect(source).toContain('preRolledPair={giftPreRolledPair}');
expect(source).toContain('setLevelGiftDualMode(!!savedPair)');
```

- [ ] **Step 5: Реализовать preflight repair и onShow ack**

Импортировать reconciler helpers. В `flushQueue` сначала выполнить:

```ts
await retryPendingLevelUpRewards({ premium: !!hasPremiumAccess, studyTarget });
const repairedLevels = await repairPendingLevelUpRewards({
  premium: !!hasPremiumAccess,
  studyTarget,
});
```

Затем читать/мержить только repaired persistent queue. Зависимости `flushQueue` дополнить `hasPremiumAccess` и `studyTarget`.

Удалить эффект, который вызывает `removeShownLevelFromPersistentQueue` по `levelUpOverlayVisible`, и удалить сам отдельный AsyncStorage read-modify-write helper. Добавить:

```ts
const acknowledgeNativeLevelUpShown = useCallback(() => {
  void acknowledgePendingLevelUpShown(currentLevel);
}, [currentLevel]);
```

И передать в level-up `<Modal>`:

```tsx
onShow={acknowledgeNativeLevelUpShown}
```

После preflight repair загрузить точный сохранённый entitlement текущего уровня из `loadUnclaimedGifts()` и `loadUnclaimedDualGifts()`. Тип модала определяет сохранённое состояние, а не текущий `hasPremiumAccess`:

```ts
const savedPair = dualMap[currentLevel];
const savedGift = singleMap[currentLevel];
setGiftPreRolledPair(savedPair ?? undefined);
setGiftPreRolled(savedPair ? undefined : savedGift ?? undefined);
setLevelGiftDualMode(!!savedPair);
```

Передать точную пару в dual modal:

```tsx
<LevelGiftDualModal
  preRolledPair={giftPreRolledPair}
  {...existingProps}
/>
```

Если после partial dual claim сохранён только single gift, открывается `LevelGiftModal` с этим точным `preRolledGift`; новый premium gift не роллится.

Добавить поведенческий/контрактный сценарий legacy queue + partial dual: single остаток и claimed rarity для одного уровня должны приводить к `levelGiftDualMode === false`, точному `preRolledGift` и отсутствию нового `preRolledPair`.

- [ ] **Step 6: Добавить foreground reread без горячего фонового таймера**

```ts
useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void flushQueue();
  });
  return () => sub.remove();
}, [flushQueue]);
```

Не добавлять `setInterval`; это сохраняет performance invariants.

- [ ] **Step 7: Запустить GREEN**

Run: `npx jest tests/overlay_arbiter.test.ts tests/level_up_sheet_contract.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/overlay_arbiter_core.ts tests/overlay_arbiter.test.ts app/_layout.tsx tests/level_up_sheet_contract.test.ts
git commit -m "fix: persist level-up modal until native show"
```

### Task 5: Интеграционная проверка и защита существующей экономики

**Files:**
- Test: `tests/level_gift_claim_success_contract.test.ts`
- Test: `tests/level_gift_dual_modal_opacity_contract.test.ts`
- Test: `tests/perf_freeze_contract.test.ts`
- Test: `tests/navigation_back_underlay_contract.test.ts`

- [ ] **Step 1: Проверить отсутствие запрещённых изменений**

Run:

```powershell
git diff -- app/level_gift_system.ts constants/theme.ts components/LevelGiftModal.tsx components/LevelGiftDualModal.tsx app/cloud_sync.ts
```

Expected: пустой diff для формулы уровня, каталога подарков, claim UI и общего cloud restore.

- [ ] **Step 2: Запустить полный узкий набор**

Run:

```powershell
npx jest tests/level_up_reward_reconciler.test.ts tests/level_gift_inventory.test.ts tests/xp_manager_register_xp.test.ts tests/progress_events_client_queue.test.ts tests/friend_quests.test.ts tests/boot_cloud_restore_contract.test.ts tests/overlay_arbiter.test.ts tests/level_up_sheet_contract.test.ts tests/level_gift_claim_success_contract.test.ts tests/level_gift_dual_modal_opacity_contract.test.ts tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts --runInBand
```

Expected: PASS, 0 failed suites.

- [ ] **Step 3: Проверить TypeScript только затронутых модулей существующей командой проекта**

Сначала определить доступный узкий script:

Run: `npm run | Select-String -Pattern 'typecheck|tsc'`

Если проект предоставляет scoped typecheck, запустить его для затронутых файлов. Если доступен только глобальный `tsc`, не запускать автоматически вопреки правилу контекстного бюджета; зафиксировать, что типы проверены Jest/ts-jest и статической инспекцией импортов.

- [ ] **Step 4: Просмотреть итоговый diff и рабочее дерево**

Run:

```powershell
git diff --check
git status --short
git diff -- app/level_up_reward_reconciler.ts app/level_gift_inventory.ts app/xp_manager.ts app/progress_events_client.ts app/friend_quests.ts components/overlay_arbiter_core.ts app/_layout.tsx tests/level_up_reward_reconciler.test.ts tests/level_gift_inventory.test.ts tests/xp_manager_register_xp.test.ts tests/progress_events_client_queue.test.ts tests/friend_quests.test.ts tests/overlay_arbiter.test.ts tests/level_up_sheet_contract.test.ts
```

Expected: только целевые изменения; пользовательские unrelated-файлы остаются нетронутыми.

- [ ] **Step 5: Финальный Advisor review**

Передать objective, spec, plan, actual diff, результаты RED/GREEN и узкого набора. При `CHANGES_REQUIRED` исправить замечания и повторить затронутые проверки; завершать только после `DECISION: APPROVED`.

- [ ] **Step 6: Final commit**

Если после предыдущих task-коммитов остались только проверочные/контрактные изменения:

```bash
git add tests/level_gift_claim_success_contract.test.ts tests/level_gift_dual_modal_opacity_contract.test.ts
git commit -m "test: guard reliable level-up delivery"
```

Не создавать пустой коммит.

# Avatar Customization Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить скачок первого кадра и заменить текущую кастомизацию на «Студию образа» с иммерсивной сценой, составным предпросмотром, вкладками аватаров/аур и фильтрами «Все/Мои».

**Architecture:** Ранний bootstrap публикует account-scoped снимок кастомизации в существующий `app_snapshot_store`. Чистые модули каталога и черновика вычисляют доступность и CTA без UI-зависимостей; сервис применения выполняет одну локальную запись и сохраняет существующую синхронизацию. Маршрут использует один `Reanimated.FlatList`: сцена, вкладки и фильтры находятся в `ListHeaderComponent`, нижняя панель действий — вне списка.

**Tech Stack:** React Native 0.81, React 19, Expo Router 6, TypeScript 5.9 strict, AsyncStorage, Reanimated 4, Jest/ts-jest, существующие Theme/Premium/Lang контексты.

---

## Карта файлов

**Создать:**

- `constants/customization_storage_keys.ts` — лёгкие storage keys без каталогов и asset `require()`.
- `app/customization_snapshot.ts` — типы, безопасный парсинг storage и сравнение снимков.
- `app/customization_catalog.ts` — элементы каталога, фильтры и состояния доступности.
- `app/customization_draft.ts` — составной черновик и детерминированный resolver нижней CTA.
- `app/customization_service.ts` — атомарное применение образа и write-through обновление snapshot.
- `app/customization_purchase_intent.ts` — durable purchase intent и восстановление частично завершённой покупки.
- `app/customization_purchase_confirmation.ts` — чистое состояние request/confirm/cancel без списаний до подтверждения.
- `components/customization/CustomizationHero.tsx` — «Зал созвездий» с акцентом темы.
- `components/customization/CustomizationCatalogCard.tsx` — мемоизированная статичная карточка.
- `components/customization/CustomizationControls.tsx` — вкладки, `Все/Мои`, меню и нижняя CTA.
- `components/customization/AvatarEditorSheet.tsx` — редактор градиента/цвета логотипа.
- `components/customization/CustomizationPurchaseConfirmModal.tsx` — единое подтверждение покупки аватара/ауры/рестайлинга.
- `tests/customization_snapshot.test.ts`.
- `tests/customization_catalog.test.ts`.
- `tests/customization_draft.test.ts`.
- `tests/customization_service.test.ts`.
- `tests/customization_purchase_intent.test.ts`.
- `tests/customization_purchase_confirmation.test.ts`.
- `tests/shards_idempotent_spend.test.ts`.
- `tests/avatar_select_studio_contract.test.ts`.
- `tests/avatar_select_first_frame_contract.test.ts`.

**Изменить:**

- `constants/custom_avatars.ts` — переэкспортировать avatar keys из лёгкого модуля.
- `constants/avatar_auras.ts` — переэкспортировать aura keys из лёгкого модуля.
- `app/level_gift_system.ts` — сохранить прежний экспорт подарочного ключа как alias.
- `app/shards_system.ts` — добавить opt-in idempotency key для безопасного повторного spend.
- `app/app_snapshot_store.ts` — добавить поле `customization?: CustomizationSnapshot`.
- `app/app_snapshot_bootstrap.ts` — включить ключи кастомизации в ранний `multiGet`.
- `app/avatar_select.tsx` — заменить монолитный экран на координатор студии.
- `tests/app_snapshot_store_contract.test.ts`.
- `tests/app_snapshot_bootstrap_contract.test.ts`.
- `tests/avatar_select_vip_aura_contract.test.ts`.
- `tests/avatar_select_bouncy_contract.test.ts`.
- `tests/perf_freeze_contract.test.ts` не изменять; использовать его как read-only guard.

## Task 1: Нормализованный снимок кастомизации

**Files:**

- Create: `app/customization_snapshot.ts`
- Create: `tests/customization_snapshot.test.ts`
- Create: `constants/customization_storage_keys.ts`
- Modify: `constants/custom_avatars.ts`
- Modify: `constants/avatar_auras.ts`
- Modify: `app/level_gift_system.ts`

- [ ] **Step 1: Написать падающие тесты безопасного парсинга**

```ts
import fs from 'fs';
import path from 'path';
import {
  buildCustomizationSnapshot,
  customizationSnapshotsEqual,
} from '../app/customization_snapshot';

describe('customization snapshot', () => {
  it('preserves explicit none and valid owned maps', () => {
    const snapshot = buildCustomizationSnapshot(new Map([
      ['user_avatar', 'custom:custom-01:violet:black'],
      ['user_avatar_aura', 'none'],
      ['user_total_xp', '1250'],
      ['shards_balance', '44'],
      ['custom_avatar_owned_v1', JSON.stringify({ 'custom-01': 'violet:black' })],
      ['avatar_aura_owned_v1', JSON.stringify({ 'aura-aurora': true })],
      ['custom_avatar_gift_owned_v1', 'custom-61'],
      ['avatar_aura_gift_owned_v1', 'aura-nimbus'],
    ]), 100, 18);

    expect(snapshot.storedAuraSelection).toBe('none');
    expect(snapshot.shards).toBe(44);
    expect(snapshot.ownedAvatars['custom-01']).toBe('violet:black');
    expect(snapshot.ownedAuras['aura-aurora']).toBe(true);
  });

  it('rejects arrays, invalid booleans and malformed JSON', () => {
    const snapshot = buildCustomizationSnapshot(new Map([
      ['custom_avatar_owned_v1', '["custom-01"]'],
      ['avatar_aura_owned_v1', '{bad'],
    ]), 100, 1);
    expect(snapshot.ownedAvatars).toEqual({});
    expect(snapshot.ownedAuras).toEqual({});
  });

  it('compares normalized content instead of object identity', () => {
    const a = buildCustomizationSnapshot(new Map(), 100, 1);
    const b = buildCustomizationSnapshot(new Map(), 200, 1);
    expect(customizationSnapshotsEqual(a, b)).toBe(true);
  });

  it('stays lightweight for startup', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/customization_snapshot.ts'), 'utf8');
    expect(source).not.toContain("from '../constants/custom_avatars'");
    expect(source).not.toContain("from '../constants/avatars'");
    expect(source).not.toContain("from '../constants/avatar_auras'");
    expect(source).not.toContain('require(');
  });
});
```

- [ ] **Step 2: Запустить тест и подтвердить красную фазу**

Run: `npx jest --runInBand --runTestsByPath tests/customization_snapshot.test.ts`

Expected: FAIL с `Cannot find module '../app/customization_snapshot'`.

- [ ] **Step 3: Реализовать тип и чистый нормализатор**

```ts
export type OwnedAvatars = Record<string, string>;
export type OwnedAuras = Record<string, true>;

export interface CustomizationSnapshot {
  source: 'storage' | 'memory' | 'local';
  updatedAt: number;
  activeAvatar: string;
  storedAuraSelection: string | null;
  totalXp: number;
  level: number;
  shards: number;
  ownedAvatars: OwnedAvatars;
  ownedAuras: OwnedAuras;
  giftedAvatarId: string | null;
  giftedAuraId: string | null;
}

// constants/customization_storage_keys.ts — no catalog imports, no asset require().
export const CUSTOM_AVATAR_OWNED_KEY = 'custom_avatar_owned_v1';
export const CUSTOM_AVATAR_GIFT_OWNED_KEY = 'custom_avatar_gift_owned_v1';
export const USER_AVATAR_AURA_KEY = 'user_avatar_aura';
export const AVATAR_AURA_OWNED_KEY = 'avatar_aura_owned_v1';
export const AVATAR_AURA_GIFT_OWNED_KEY = 'avatar_aura_gift_owned_v1';
export const CUSTOMIZATION_STORAGE_KEYS = [
  USER_AVATAR_AURA_KEY,
  CUSTOM_AVATAR_OWNED_KEY,
  CUSTOM_AVATAR_GIFT_OWNED_KEY,
  AVATAR_AURA_OWNED_KEY,
  AVATAR_AURA_GIFT_OWNED_KEY,
] as const;

// Existing modules import/re-export these lightweight constants.
export const COSMETIC_GIFT_OWNED_AVATAR_KEY = CUSTOM_AVATAR_GIFT_OWNED_KEY;

export function buildCustomizationSnapshot(
  values: ReadonlyMap<string, string | null>,
  updatedAt: number,
  level: number,
): CustomizationSnapshot {
  const totalXp = readNonNegativeInt(values.get('user_total_xp'));
  const safeLevel = Math.max(1, Math.floor(level));
  return {
    source: 'storage',
    updatedAt,
    activeAvatar: values.get('user_avatar')?.trim() || String(Math.min(60, safeLevel)),
    storedAuraSelection: normalizeStoredAuraSelection(values.get(USER_AVATAR_AURA_KEY)),
    totalXp,
    level: safeLevel,
    shards: readNonNegativeInt(values.get('shards_balance')),
    ownedAvatars: parseOwnedAvatars(values.get(CUSTOM_AVATAR_OWNED_KEY)),
    ownedAuras: parseOwnedAuras(values.get(AVATAR_AURA_OWNED_KEY)),
    giftedAvatarId: nonEmpty(values.get(CUSTOM_AVATAR_GIFT_OWNED_KEY)),
    giftedAuraId: nonEmpty(values.get(AVATAR_AURA_GIFT_OWNED_KEY)),
  };
}
```

`customization_snapshot.ts` импортирует только `constants/customization_storage_keys.ts`. Он не импортирует `constants/custom_avatars.ts`, `constants/avatars.ts`, `constants/avatar_auras.ts` или `app/level_gift_system.ts`, поэтому ранний bootstrap не загружает каталоги и статические asset `require()`. Старые модули переэкспортируют те же ключи, поэтому существующие потребители не меняют storage contract.

`normalizeStoredAuraSelection` возвращает строку `none` без преобразования, `null` для пустого значения и trimmed id для непустой строки. Проверка существования aura id выполняется позже catalog policy, где импорт каталога уже допустим. `customizationSnapshotsEqual` сравнивает все содержательные поля, игнорируя `source` и `updatedAt`.

- [ ] **Step 4: Запустить тест и подтвердить зелёную фазу**

Run: `npx jest --runInBand --runTestsByPath tests/customization_snapshot.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 5: Зафиксировать этап**

```powershell
git add constants/customization_storage_keys.ts constants/custom_avatars.ts constants/avatar_auras.ts app/level_gift_system.ts app/customization_snapshot.ts tests/customization_snapshot.test.ts
git commit -m "feat: add customization snapshot model"
```

## Task 2: Первый кадр из общего app snapshot

**Files:**

- Modify: `app/app_snapshot_store.ts`
- Modify: `app/app_snapshot_bootstrap.ts`
- Modify: `app/customization_snapshot.ts`
- Modify: `tests/app_snapshot_store_contract.test.ts`
- Modify: `tests/app_snapshot_bootstrap_contract.test.ts`
- Create: `tests/avatar_select_first_frame_contract.test.ts`

- [ ] **Step 1: Добавить падающий контракт раннего bootstrap**

```ts
it('primes account-scoped customization in the startup multiGet', () => {
  const bootstrap = readProjectFile('app', 'app_snapshot_bootstrap.ts');
  expect(bootstrap).toContain('CUSTOMIZATION_STORAGE_KEYS');
  expect(bootstrap).toContain('buildCustomizationSnapshot(values, now, profile.level)');
  expect(bootstrap).toContain('customization:');
});

it('seeds avatar studio from the snapshot instead of fake defaults', () => {
  const source = readProjectFile('app', 'avatar_select.tsx');
  expect(source).toContain('useAppSnapshotSelector');
  expect(source).not.toContain('const [level, setLevel] = useState(1)');
  expect(source).not.toContain("const [activeAvatar, setActiveAvatar] = useState<string>('1')");
  expect(source).not.toContain('const [activeAuraId, setActiveAuraId] = useState<string | null>(null)');
});

it('publishes no update while delayed storage returns equal data', async () => {
  const current = buildCustomizationSnapshot(new Map(), 100, 4);
  let resolveFresh!: (value: CustomizationSnapshot) => void;
  const delayed = new Promise<CustomizationSnapshot>((resolve) => { resolveFresh = resolve; });
  const publish = jest.fn();
  const pending = revalidateCustomizationSnapshot(current, () => delayed, publish);
  expect(publish).not.toHaveBeenCalled();
  resolveFresh({ ...current, updatedAt: 200 });
  await pending;
  expect(publish).not.toHaveBeenCalled();
});

it('publishes one coherent update when delayed storage differs', async () => {
  const current = buildCustomizationSnapshot(new Map(), 100, 4);
  const fresh = { ...current, shards: 50, ownedAuras: { 'aura-aurora': true }, updatedAt: 200 };
  const publish = jest.fn();
  await revalidateCustomizationSnapshot(current, async () => fresh, publish);
  expect(publish).toHaveBeenCalledTimes(1);
  expect(publish).toHaveBeenCalledWith(fresh);
});
```

В `app_snapshot_store_contract` добавить поведенческую проверку: записать снимок с owned/style данными, вызвать `resetAppSnapshotForAccountSwitch()` и проверить `expect(getAppSnapshot().customization).toBeUndefined()`.

- [ ] **Step 2: Запустить только новые/изменённые контракты**

Run: `npx jest --runInBand --runTestsByPath tests/app_snapshot_store_contract.test.ts tests/app_snapshot_bootstrap_contract.test.ts tests/avatar_select_first_frame_contract.test.ts`

Expected: FAIL на отсутствующем поле `customization` и старых фиктивных `useState`.

- [ ] **Step 3: Расширить `AppSnapshot`**

```ts
import type { CustomizationSnapshot } from './customization_snapshot';

export interface AppSnapshot {
  profile?: AppSnapshotProfile;
  progress?: AppSnapshotProgress;
  customization?: CustomizationSnapshot;
  // existing fields remain unchanged
}
```

Не добавлять AsyncStorage в `app_snapshot_store.ts`; он остаётся in-memory store.

- [ ] **Step 4: Добавить ключи в существующий startup `multiGet`**

```ts
import { CUSTOMIZATION_STORAGE_KEYS } from '../constants/customization_storage_keys';

const keys = [
  ...BOOT_PROFILE_KEYS,
  ...BOOT_PROGRESS_KEYS,
  ...CUSTOMIZATION_STORAGE_KEYS,
  ...BOOT_SETTINGS_KEYS,
  lastOpenedKey,
  BOOT_LANG_KEY,
  BOOT_STUDY_TARGET_KEY,
];

const profile = buildProfileSnapshot(values, now);
patchAppSnapshot({
  profile,
  progress: buildProgressSnapshot(values, studyTarget, now),
  customization: buildCustomizationSnapshot(values, now, profile.level),
  // existing fields unchanged
});
```

- [ ] **Step 5: Подключить snapshot как начальное состояние маршрута**

Временно, до полного редизайна, заменить фиктивные initializer-ы в `app/avatar_select.tsx` на единый reducer/state initializer из `getAppSnapshot().customization`, а `load()` применять только если `customizationSnapshotsEqual` вернул `false`. Не менять UI на этом шаге.

```ts
const snapshotCustomization = useAppSnapshotSelector((snapshot) => snapshot.customization);
const [confirmed, setConfirmed] = useState(() =>
  snapshotCustomization ?? createCustomizationFallback(getAppSnapshot()),
);

useEffect(() => {
  if (!snapshotCustomization) return;
  setConfirmed((current) =>
    customizationSnapshotsEqual(current, snapshotCustomization) ? current : snapshotCustomization,
  );
}, [snapshotCustomization]);

const publishFreshSnapshot = useCallback((fresh: CustomizationSnapshot) => {
  setConfirmed((current) => customizationSnapshotsEqual(current, fresh) ? current : fresh);
  patchAppSnapshot({ customization: fresh });
}, []);
```

`createCustomizationFallback` берёт avatar/aura/XP/level из `snapshot.profile` и shards из `snapshot.progress`; только при полностью пустом app snapshot использует безопасные значения нового аккаунта. Он не подменяет существующий профиль аватаром `1`.

В том же модуле реализовать единую тихую сверку, чтобы маршрут не делал серию независимых `setState`:

```ts
export async function revalidateCustomizationSnapshot(
  current: CustomizationSnapshot,
  load: () => Promise<CustomizationSnapshot>,
  publish: (fresh: CustomizationSnapshot) => void,
): Promise<void> {
  const fresh = await load();
  if (!customizationSnapshotsEqual(current, fresh)) publish(fresh);
}
```

- [ ] **Step 6: Проверить первый кадр и bootstrap**

Run: `npx jest --runInBand --runTestsByPath tests/customization_snapshot.test.ts tests/app_snapshot_store_contract.test.ts tests/app_snapshot_bootstrap_contract.test.ts tests/avatar_select_first_frame_contract.test.ts`

Expected: PASS, без новых источников AsyncStorage в store.

- [ ] **Step 7: Зафиксировать этап**

```powershell
git add app/app_snapshot_store.ts app/app_snapshot_bootstrap.ts app/customization_snapshot.ts app/avatar_select.tsx tests/app_snapshot_store_contract.test.ts tests/app_snapshot_bootstrap_contract.test.ts tests/avatar_select_first_frame_contract.test.ts
git commit -m "fix: hydrate avatar studio first frame"
```

## Task 3: Каталог и доступность предметов

**Files:**

- Create: `app/customization_catalog.ts`
- Create: `tests/customization_catalog.test.ts`

- [ ] **Step 1: Написать таблицу падающих тестов**

```ts
const baseContext = {
  activeAvatar: 'custom:custom-gen-41:violet:black',
  activeAuraId: null,
  level: 1,
  ownedAuras: {},
  isPremium: false,
  isVip: false,
};
const secretGiftId = CUSTOM_AVATAR_GIFT_ONLY[0].id;

describe('customization catalog', () => {
  it('never exposes level avatars', () => {
    const items = buildAvatarCatalog({ ownedAvatars: {}, giftedAvatarId: null });
    expect(items.every((item) => item.kind === 'custom-avatar')).toBe(true);
  });

  it('hides unowned secret gifts and reveals owned gifts', () => {
    expect(buildAvatarCatalog({ ownedAvatars: {}, giftedAvatarId: null })
      .some((item) => item.id === secretGiftId)).toBe(false);
    expect(buildAvatarCatalog({
      ownedAvatars: { [secretGiftId]: 'violet:black' },
      giftedAvatarId: secretGiftId,
    }).some((item) => item.id === secretGiftId)).toBe(true);
  });

  it.each([
    ['aura-premium', 'plus'],
    ['aura-flame-51', 'level'],
    ['aura-season', 'reward'],
    ['aura-aurora', 'shards'],
  ] as const)('classifies %s as %s', (id, expected) => {
    expect(buildAuraCatalog(baseContext).find((item) => item.id === id)?.availability.kind).toBe(expected);
  });

  it('mine contains only owned/access-granted items plus none aura', () => {
    const items = buildAuraCatalog({
      ...baseContext,
      activeAuraId: 'aura-aurora',
      ownedAuras: { 'aura-aurora': true },
    });
    expect(filterCatalog(items, 'mine').every((item) => item.isOwned || item.id === 'none')).toBe(true);
  });
});
```

- [ ] **Step 2: Подтвердить красную фазу**

Run: `npx jest --runInBand --runTestsByPath tests/customization_catalog.test.ts`

Expected: FAIL с отсутствующим модулем.

- [ ] **Step 3: Реализовать discriminated unions и builders**

```ts
export type CatalogAvailability =
  | { kind: 'owned' }
  | { kind: 'shards'; cost: number }
  | { kind: 'level'; level: number }
  | { kind: 'plus' }
  | { kind: 'reward'; source: 'arena' | 'gift' }
  | { kind: 'none' };

type CatalogBase = {
  id: string;
  isOwned: boolean;
  isActive: boolean;
  availability: CatalogAvailability;
};

export type CustomizationCatalogItem =
  | (CatalogBase & { kind: 'custom-avatar'; previewValue: string })
  | (CatalogBase & { kind: 'aura' | 'none-aura'; previewAvatar: string; auraId: string });
```

`buildAvatarCatalog` использует только `CUSTOM_AVATAR_SHOP` плюс фактически принадлежащие пользователю `CUSTOM_AVATAR_GIFT_ONLY`. `buildAuraCatalog` добавляет синтетический `none-aura`, затем `AVATAR_AURAS`. Условие Plus использует единый `hasPlusAuraAccess = isPremium || isVip`.

- [ ] **Step 4: Проверить каталог**

Run: `npx jest --runInBand --runTestsByPath tests/customization_catalog.test.ts tests/avatar_select_vip_aura_contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Зафиксировать этап**

```powershell
git add app/customization_catalog.ts tests/customization_catalog.test.ts
git commit -m "feat: model avatar and aura catalog"
```

## Task 4: Составной черновик и CTA resolver

**Files:**

- Create: `app/customization_draft.ts`
- Create: `tests/customization_draft.test.ts`

- [ ] **Step 1: Написать падающую матрицу действий**

```ts
const owned = { kind: 'owned' } as const;
const availableDraft = {
  confirmed: {
    avatarValue: 'custom:custom-gen-41:violet:black',
    storedAuraSelection: null,
  },
  previewAvatarValue: 'custom:custom-gen-42:violet:black',
  previewStoredAuraSelection: 'none',
  effectivePreviewAuraId: null,
  activeTab: 'avatars' as const,
  avatarAvailability: owned,
  auraAvailability: { kind: 'none' } as const,
};

describe('resolveCustomizationAction', () => {
  it('applies an entirely available draft', () => {
    expect(resolveCustomizationAction(availableDraft)).toEqual({ kind: 'apply' });
  });

  it('buys and applies one shard blocker', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      avatarAvailability: { kind: 'shards', cost: 50 },
    })).toEqual({
      kind: 'buy-and-apply', target: 'avatar', purchaseKind: 'purchase', cost: 50,
    });
  });

  it('resolves two shard blockers one at a time from active tab', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      activeTab: 'auras',
      avatarAvailability: { kind: 'shards', cost: 50 },
      auraAvailability: { kind: 'shards', cost: 35 },
    })).toEqual({
      kind: 'buy-only', target: 'aura', purchaseKind: 'purchase', cost: 35,
    });
  });

  it('does not partially apply a level blocker', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      auraAvailability: { kind: 'level', level: 51 },
    })).toEqual({ kind: 'explain-level', level: 51 });
  });

  it('opens Plus for a Plus blocker', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      auraAvailability: { kind: 'plus' },
    })).toEqual({ kind: 'open-plus' });
  });

  it('explains an Arena reward without applying the avatar half', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      auraAvailability: { kind: 'reward', source: 'arena' },
    })).toEqual({ kind: 'explain-reward', source: 'arena' });
  });

  it('treats none aura as an available explicit value', () => {
    expect(resolveCustomizationAction(availableDraft)).toEqual({ kind: 'apply' });
  });

  it('returns unchanged when stored selections equal the confirmed state', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      previewAvatarValue: availableDraft.confirmed.avatarValue,
      previewStoredAuraSelection: null,
      effectivePreviewAuraId: 'aura-premium',
      auraAvailability: owned,
    })).toEqual({ kind: 'unchanged' });
  });

  it('charges 10 shards for a style delta on the same owned avatar', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      confirmed: {
        ...availableDraft.confirmed,
        avatarValue: 'custom:custom-gen-41:violet:black',
      },
      previewAvatarValue: 'custom:custom-gen-41:aurora:white',
      avatarAvailability: owned,
    })).toEqual({
      kind: 'buy-and-apply', target: 'avatar', purchaseKind: 'restyle', cost: 10,
    });
  });

  it.each([
    [null, true, false, 'aura-premium'],
    [null, false, true, 'aura-vip'],
    ['none', true, true, null],
    ['aura-aurora', true, true, 'aura-aurora'],
  ] as const)('keeps stored %s distinct from effective fallback', (stored, premium, vip, effective) => {
    expect(resolveEffectivePreviewAuraId(stored, premium, vip)).toBe(effective);
  });
});
```

- [ ] **Step 2: Подтвердить красную фазу**

Run: `npx jest --runInBand --runTestsByPath tests/customization_draft.test.ts`

Expected: FAIL с отсутствующим модулем.

- [ ] **Step 3: Реализовать reducer и resolver без побочных эффектов**

```ts
export interface CustomizationDraft {
  confirmed: {
    avatarValue: string;
    storedAuraSelection: string | null;
  };
  previewAvatarValue: string;
  previewStoredAuraSelection: string | null;
  effectivePreviewAuraId: string | null;
  activeTab: 'avatars' | 'auras';
  avatarAvailability: CatalogAvailability;
  auraAvailability: CatalogAvailability;
}

export type CustomizationAction =
  | { kind: 'apply' }
  | { kind: 'buy-and-apply'; target: 'avatar' | 'aura'; purchaseKind: 'purchase' | 'restyle'; cost: number }
  | { kind: 'buy-only'; target: 'avatar' | 'aura'; purchaseKind: 'purchase' | 'restyle'; cost: number }
  | { kind: 'open-plus' }
  | { kind: 'explain-level'; level: number }
  | { kind: 'explain-reward'; source: 'arena' | 'gift' }
  | { kind: 'unchanged' };
```

Resolver сначала обрабатывает непокупаемые блокеры, затем вычисляет `avatarCost`: 50 для нового shard-shop avatar, 10 для изменения gradient/logo того же owned avatar и 0 для неизменного owned style. После этого он считает shard-блокеры и сравнивает `previewAvatarValue`/`previewStoredAuraSelection` с `confirmed`. `effectivePreviewAuraId` используется только для hero; в storage записывается `previewStoredAuraSelection`, поэтому `null`, `none`, Premium fallback и VIP fallback не смешиваются. Resolver не читает storage, не списывает осколки и не вызывает router.

- [ ] **Step 4: Проверить матрицу**

Run: `npx jest --runInBand --runTestsByPath tests/customization_draft.test.ts`

Expected: PASS для apply, одного/двух blocker-ов, Plus, level, reward и none.

- [ ] **Step 5: Зафиксировать этап**

```powershell
git add app/customization_draft.ts tests/customization_draft.test.ts
git commit -m "feat: add composite customization draft"
```

## Task 5: Атомарное применение и durable-покупки

**Files:**

- Create: `app/customization_service.ts`
- Create: `app/customization_purchase_intent.ts`
- Create: `tests/customization_service.test.ts`
- Create: `tests/customization_purchase_intent.test.ts`
- Create: `tests/shards_idempotent_spend.test.ts`
- Modify: `app/shards_system.ts`
- Modify: `app/avatar_select.tsx`

- [ ] **Step 1: Написать падающие service-тесты с mock-зависимостями**

```ts
const availableInput = {
  avatarValue: 'custom:custom-gen-41:violet:black',
  storedAuraSelection: 'none',
  level: 18,
  frameId: 'frame-18',
};

const purchaseInput = {
  target: 'aura' as const,
  itemId: 'aura-aurora',
  cost: 35,
  spendReason: 'avatar_aura' as const,
  mode: 'buy-only' as const,
  ownedValue: true,
};

function makeDeps() {
  return {
    storage: {
      multiSet: jest.fn().mockResolvedValue(undefined),
      multiRemove: jest.fn().mockResolvedValue(undefined),
      getItem: jest.fn().mockResolvedValue(null),
    },
    getShardsBalance: jest.fn().mockResolvedValue(100),
    spendShardsIdempotent: jest.fn().mockResolvedValue('applied'),
    publishSnapshot: jest.fn(),
    invalidateCaches: jest.fn().mockResolvedValue(undefined),
    syncCloud: jest.fn(),
    syncPublicProfile: jest.fn(),
  } satisfies CustomizationServiceDeps;
}

it('writes avatar, frame and explicit aura in one multiSet', async () => {
  const deps = makeDeps();
  await applyCustomizationDraft(availableInput, deps);
  expect(deps.storage.multiSet).toHaveBeenCalledWith(expect.arrayContaining([
    ['user_avatar', availableInput.avatarValue],
    ['user_frame', availableInput.frameId],
    ['user_avatar_aura', availableInput.storedAuraSelection],
  ]));
  expect(deps.publishSnapshot).toHaveBeenCalledTimes(1);
  expect(deps.syncCloud).toHaveBeenCalledTimes(1);
});

it('does not publish or sync when local multiSet rejects', async () => {
  const deps = makeDeps();
  deps.storage.multiSet.mockRejectedValueOnce(new Error('disk'));
  await expect(applyCustomizationDraft(availableInput, deps)).rejects.toThrow('disk');
  expect(deps.publishSnapshot).not.toHaveBeenCalled();
  expect(deps.syncCloud).not.toHaveBeenCalled();
});

it('never spends twice for a confirmed purchase', async () => {
  const deps = makeDeps();
  await resumeCustomizationPurchase(
    await prepareCustomizationPurchase(purchaseInput, deps),
    deps,
  );
  expect(deps.spendShardsIdempotent).toHaveBeenCalledTimes(1);
});

it('keeps a charged intent and leaves profile unchanged when ownership write fails', async () => {
  const deps = makeDeps();
  deps.storage.multiSet
    .mockResolvedValueOnce(undefined) // prepared intent
    .mockResolvedValueOnce(undefined) // charged intent
    .mockRejectedValueOnce(new Error('owned write failed'));

  const prepared = await prepareCustomizationPurchase(purchaseInput, deps);
  await expect(resumeCustomizationPurchase(prepared, deps)).rejects.toThrow('owned write failed');

  expect(deps.spendShardsIdempotent).toHaveBeenCalledTimes(1);
  expect(deps.publishSnapshot).not.toHaveBeenCalled();
  expect(deps.syncCloud).not.toHaveBeenCalled();
  expect(readPersistedIntent(deps)).resolves.toMatchObject({ phase: 'charged' });
});

it('retries the same charged intent without a second debit, then grants ownership', async () => {
  const deps = makeDeps();
  const charged = makePurchaseIntent(purchaseInput, { opId: 'customization:test', phase: 'charged' });

  await resumeCustomizationPurchase(charged, deps);

  expect(deps.spendShardsIdempotent).not.toHaveBeenCalled();
  expect(deps.storage.multiSet).toHaveBeenCalledWith(expect.arrayContaining([
    ['avatar_aura_owned_v1', expect.stringContaining('aura-aurora')],
  ]));
  expect(deps.storage.multiRemove).toHaveBeenCalledWith(['customization_purchase_intent_v1']);
});

it('resets to the level avatar while preserving the stored aura selection', async () => {
  const deps = makeDeps();
  await resetToLevelAvatar({ level: 18, storedAuraSelection: 'none' }, deps);
  expect(deps.storage.multiSet).toHaveBeenCalledWith(expect.arrayContaining([
    ['user_avatar', '18'],
    ['user_avatar_aura', 'none'],
    ['user_frame', expect.any(String)],
  ]));
  expect(deps.invalidateCaches).toHaveBeenCalledTimes(1);
  expect(deps.syncCloud).toHaveBeenCalledTimes(1);
  expect(deps.syncPublicProfile).toHaveBeenCalledTimes(1);
});

it('deducts a shard operation id only once across a retry', async () => {
  await expect(spendShardsIdempotent(35, 'avatar_aura', 'customization:same-op'))
    .resolves.toBe('applied');
  await expect(spendShardsIdempotent(35, 'avatar_aura', 'customization:same-op'))
    .resolves.toBe('already-applied');
  await expect(getShardsBalance()).resolves.toBe(65);
});
```

- [ ] **Step 2: Подтвердить красную фазу**

Run: `npx jest --runInBand --runTestsByPath tests/customization_service.test.ts tests/customization_purchase_intent.test.ts tests/shards_idempotent_spend.test.ts`

Expected: FAIL с отсутствующим сервисом.

- [ ] **Step 3: Реализовать сервис с внедряемыми зависимостями**

```ts
export interface CustomizationServiceDeps {
  storage: Pick<typeof AsyncStorage, 'multiSet' | 'multiRemove' | 'getItem'>;
  getShardsBalance: typeof getShardsBalance;
  spendShardsIdempotent: typeof spendShardsIdempotent;
  publishSnapshot: (snapshot: CustomizationSnapshot) => void;
  invalidateCaches: (avatar: string, storedAuraSelection: string | null) => Promise<void>;
  syncCloud: (mode: 'immediate' | 'deferred') => void;
  syncPublicProfile: (avatar: string, level: number, storedAuraSelection: string | null) => void;
}

export interface ApplyCustomizationInput {
  avatarValue: string;
  storedAuraSelection: string | null;
  level: number;
  frameId: string;
}

export interface PurchaseCustomizationInput {
  target: 'avatar' | 'aura';
  itemId: string;
  cost: number;
  spendReason: 'custom_avatar' | 'custom_avatar_restyle' | 'avatar_aura';
  mode: 'buy-only' | 'buy-and-apply';
  ownedValue: true | string;
}
```

Порядок `applyCustomizationDraft`: повторная валидация доступности → единый `multiSet` → patch app snapshot → обновление зависимых локальных кэшей → `emitAppEvent('xp_changed')` → ровно по одному cloud/public sync. Для `storedAuraSelection === null` в storage записывается пустая строка; `none` остаётся явным `none`. В hero вычисляется `effectivePreviewAuraId`, но storage, кэши и существующий public-sync получают именно stored selection, поэтому Premium/VIP fallback не превращается случайно в пользовательский выбор. Если `multiSet` падает, snapshot и внешняя синхронизация не меняются.

`resetToLevelAvatar` вычисляет строковый level-avatar и `getBestFrameForLevel(level).id`, сохраняет текущую stored aura selection и проходит через тот же apply pipeline. Тест проверяет вычисленное значение, инвалидирование кэшей и ровно один cloud/public sync, а не только наличие текста кнопки.

- [ ] **Step 4: Добавить идемпотентное списание с устойчивым opId**

В `app/shards_system.ts` экспортировать:

```ts
export type IdempotentShardSpendResult =
  | 'applied'
  | 'already-applied'
  | 'insufficient'
  | 'failed';

export async function spendShardsIdempotent(
  amount: number,
  reason: ShardSpendReason,
  opId: string,
): Promise<IdempotentShardSpendResult>;
```

Передать `opId` в уже существующий `applyShardDeltaToCloud(..., opIdOverride)` и вернуть из его success-ветки флаг `alreadyApplied`. Для локальной/offline ветки хранить bounded ledger `shard_spend_op_ledger_v1` (последние 128 opId): под существующим storage lock сначала проверить ledger, затем одним `AsyncStorage.multiSet` записать баланс, метаданные и ledger. Тот же `opId` ставить в существующую pending-delta queue. Повтор после server success использует тот же callable opId; повтор после local success видит ledger. `spendShards` остаётся обратно совместимой boolean-обёрткой, которая генерирует свежий opId.

- [ ] **Step 5: Реализовать durable purchase intent**

`app/customization_purchase_intent.ts` хранит одну account-scoped запись `customization_purchase_intent_v1`:

```ts
export interface CustomizationPurchaseIntent extends PurchaseCustomizationInput {
  v: 1;
  accountScope: string;
  opId: string;
  phase: 'prepared' | 'charged';
  createdAt: number;
}
```

Порядок строго такой:

1. `prepareCustomizationPurchase` валидирует цель/цену, добавляет текущий stable account scope и сохраняет `prepared` до списания.
2. `resumeCustomizationPurchase` для `prepared` вызывает `spendShardsIdempotent` с тем же `opId`; `applied` и `already-applied` переводят intent в `charged`.
3. Для `charged` сервис записывает owned map. Ошибка оставляет intent в `charged`, не меняет профиль и не вызывает apply.
4. Только после успешного grant intent удаляется; `buy-only` обновляет каталог, `buy-and-apply` затем вызывает `applyCustomizationDraft`.
5. При монтировании route незавершённый intent возобновляется тем же `opId` только при совпадении `accountScope`; чужой/повреждённый intent не исполняется. Account reset удаляет intent вместе с customization snapshot.

Так сбой между списанием и выдачей предмета восстанавливается без второго списания. Списание не считается транзакцией вместе с профильным выбором: профиль меняется только после подтверждённой выдачи владения.

- [ ] **Step 6: Перенести существующие helper-ы из маршрута без изменения контрактов**

Перенести `syncAvatarDisplayToCloud`, `writeProfileAvatarSnapshot`, `invalidateAvatarDependentCaches`, парсинг owned maps и операции покупки в сервис/снимок. Оставить в маршруте только вызовы use-case. Не менять ключи storage, причины списания или режимы immediate/deferred.

- [ ] **Step 7: Проверить сервис и существующие облачные контракты**

Run: `npx jest --runInBand --runTestsByPath tests/customization_service.test.ts tests/customization_purchase_intent.test.ts tests/shards_idempotent_spend.test.ts tests/cloud_sync_owned_aura_merge.test.ts tests/avatar_select_vip_aura_contract.test.ts`

Expected: PASS; повтор с тем же opId не уменьшает баланс второй раз, write-failure после charge сохраняет intent, профиль не меняется до grant, reward-only не попадает в purchase path.

- [ ] **Step 8: Зафиксировать этап**

```powershell
git add app/customization_service.ts app/customization_purchase_intent.ts app/shards_system.ts app/avatar_select.tsx tests/customization_service.test.ts tests/customization_purchase_intent.test.ts tests/shards_idempotent_spend.test.ts
git commit -m "refactor: isolate customization persistence"
```

## Task 6: Иммерсивный «Зал созвездий»

**Files:**

- Create: `components/customization/CustomizationHero.tsx`
- Modify: `app/avatar_select.tsx`
- Create: `tests/avatar_select_studio_contract.test.ts`

- [ ] **Step 1: Написать падающий структурный контракт сцены**

```ts
it('renders a theme-accented hero with one animated aura', () => {
  const hero = readProjectFile('components', 'customization', 'CustomizationHero.tsx');
  expect(hero).toContain('themeAccent');
  expect(hero).toContain('animateAura={props.motionEnabled && !reduceMotion}');
  expect(hero).toContain('previewLabel');
});

it('keeps bright-green surfaces on dark foreground', () => {
  const controls = readProjectFile('components', 'customization', 'CustomizationControls.tsx');
  expect(controls).toContain('t.correctText');
});
```

- [ ] **Step 2: Подтвердить красную фазу**

Run: `npx jest --runInBand --runTestsByPath tests/avatar_select_studio_contract.test.ts`

Expected: FAIL, компонент отсутствует.

- [ ] **Step 3: Реализовать hero как чистый визуальный компонент**

```tsx
export interface CustomizationHeroProps {
  avatarValue: string;
  auraId: string | null;
  level: number;
  avatarLabel: string;
  auraLabel: string;
  themeAccent: string;
  motionEnabled: boolean;
  minHeight: number;
  previewLabel: string;
}

function ConstellationOrbits({ accent }: { accent: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orbitLarge, { borderColor: withAlpha(accent, 0.22) }]} />
      <View style={[styles.orbitSmall, { borderColor: withAlpha(accent, 0.34) }]} />
    </View>
  );
}

export const CustomizationHero = React.memo(function CustomizationHero(props: CustomizationHeroProps) {
  const reduceMotion = useReduceMotion();
  const colors = buildConstellationPalette(props.themeAccent);
  return (
    <LinearGradient colors={colors.background} style={[styles.hero, { minHeight: props.minHeight }]}>
      <ConstellationOrbits accent={colors.glow} />
      <AvatarView
        avatar={props.avatarValue}
        level={props.level}
        auraId={props.auraId}
        size={156}
        animateAura={props.motionEnabled && !reduceMotion}
      />
      <Text style={styles.name}>{props.avatarLabel}</Text>
      <Text style={styles.meta}>{props.auraLabel} · {props.level}</Text>
      <Text style={styles.preview}>{props.previewLabel}</Text>
    </LinearGradient>
  );
});
```

`buildConstellationPalette` принимает любой hex-акцент, формирует тёмную основу и ограниченное свечение. Hero использует существующий `hooks/use_reduce_motion.ts`; менять `AvatarAura` не требуется. Не использовать белый текст на ярко-зелёной CTA; CTA берёт `t.correctText`.

Все новые пользовательские строки (`Студия образа`, вкладки, фильтры, статусы блокировки, CTA, `Вернуть аватар уровня`, toast) задаются через существующий `triLang` для `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`; визуальный компонент получает готовые строки через props.

- [ ] **Step 4: Подключить hero в `ListHeaderComponent`**

Высота: `Math.max(420, windowHeight - insets.top - 92)`. Сцена полностью скроллится вместе со списком; sticky header не добавлять.

- [ ] **Step 5: Проверить контракт и существующий animation gate**

Run: `npx jest --runInBand --runTestsByPath tests/avatar_select_studio_contract.test.ts tests/perf_freeze_contract.test.ts`

Expected: PASS; каталожные элементы не создают новые бесконечные анимации.

- [ ] **Step 6: Зафиксировать этап**

```powershell
git add components/customization/CustomizationHero.tsx app/avatar_select.tsx tests/avatar_select_studio_contract.test.ts
git commit -m "feat: add constellation customization hero"
```

## Task 7: Виртуализированный каталог и управление

**Files:**

- Create: `components/customization/CustomizationCatalogCard.tsx`
- Create: `components/customization/CustomizationControls.tsx`
- Create: `components/customization/CustomizationPurchaseConfirmModal.tsx`
- Create: `app/customization_purchase_confirmation.ts`
- Create: `tests/customization_purchase_confirmation.test.ts`
- Modify: `app/avatar_select.tsx`
- Modify: `tests/avatar_select_bouncy_contract.test.ts`
- Modify: `tests/avatar_select_studio_contract.test.ts`

- [ ] **Step 1: Добавить падающие контракты одного вертикального списка**

```ts
it('uses one vertical virtualized list with the studio in its header', () => {
  const screen = readProjectFile('app', 'avatar_select.tsx');
  expect(screen).toContain('<Reanimated.FlatList');
  expect(screen).toContain('ListHeaderComponent={listHeader}');
  expect(screen).toContain('numColumns={3}');
  expect(screen).not.toContain('<ScrollView');
  expect(screen).not.toContain('<FlashList');
});

it('renders catalog auras statically', () => {
  const card = readProjectFile('components', 'customization', 'CustomizationCatalogCard.tsx');
  expect(card).toContain('animateAura={false}');
});
```

Обновить старый bouncy-контракт: он должен проверять один `Reanimated.FlatList` внутри внешнего `Reanimated.View`/`GestureWrap`, а не старые фиксированные блоки перед `ScrollView`.

- [ ] **Step 2: Подтвердить красную фазу**

Run: `npx jest --runInBand --runTestsByPath tests/avatar_select_studio_contract.test.ts tests/avatar_select_bouncy_contract.test.ts`

Expected: FAIL на старом `ScrollView`.

- [ ] **Step 3: Реализовать мемоизированную карточку**

```tsx
interface Props {
  item: CustomizationCatalogItem;
  selected: boolean;
  label: string;
  statusLabel: string;
  onPress: (id: string) => void;
}

function CatalogStatus({ text }: { text: string }) {
  return <Text numberOfLines={2} style={styles.status}>{text}</Text>;
}

export const CustomizationCatalogCard = React.memo(function CustomizationCatalogCard({
  item, selected, label, statusLabel, onPress,
}: Props) {
  return (
    <TapScale
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: false }}
      accessibilityLabel={`${label}. ${statusLabel}`}
      onPress={() => onPress(item.id)}
      style={[styles.card, selected && styles.selected]}
    >
      {item.kind === 'custom-avatar'
        ? <CustomAvatarBadge value={item.previewValue} size={72} />
        : <AvatarView avatar={item.previewAvatar} auraId={item.auraId} size={64} animateAura={false} />}
      <Text numberOfLines={2} style={styles.label}>{label}</Text>
      <CatalogStatus text={statusLabel} />
    </TapScale>
  );
});
```

Карточка не применяет предмет и не открывает paywall самостоятельно; она только меняет draft через callback.

- [ ] **Step 4: Реализовать вкладки, фильтры, меню и CTA**

`CustomizationControls` экспортирует `CustomizationTabs`, `OwnershipFilters`, `CustomizationOverflowMenu` и `CustomizationActionBar`. Все цели касания минимум 44×44, промежуток минимум 8 px. Меню `···` содержит `Карточка профиля`; при custom avatar показывает вторичное действие `Вернуть аватар уровня`.

```tsx
<CustomizationActionBar
  action={resolvedAction}
  busy={busy}
  foregroundColor={t.correctText}
  onPress={handleAction}
/>
```

- [ ] **Step 5: Добавить обязательное подтверждение до любого списания**

`app/customization_purchase_confirmation.ts` содержит чистый reducer для `request / cancel` и отдельную функцию подтверждения:

```ts
export interface PurchaseConfirmationState {
  pending: PurchaseCustomizationInput | null;
}

export function reducePurchaseConfirmation(
  state: PurchaseConfirmationState,
  event: { type: 'request'; input: PurchaseCustomizationInput } | { type: 'cancel' },
): PurchaseConfirmationState;

export async function confirmPendingPurchase(
  state: PurchaseConfirmationState,
  execute: (input: PurchaseCustomizationInput) => Promise<void>,
): Promise<void>;
```

Поведенческий тест фиксирует границу:

```ts
it('does not spend on request and executes only after explicit confirm', async () => {
  const execute = jest.fn().mockResolvedValue(undefined);
  const pending = reducePurchaseConfirmation({ pending: null }, { type: 'request', input: purchaseInput });

  expect(execute).not.toHaveBeenCalled();
  await confirmPendingPurchase(pending, execute);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith(purchaseInput);
});
```

`CustomizationPurchaseConfirmModal` оборачивает существующий `ThemedConfirmModal` и показывает предмет, цену и тип операции (покупка или смена стиля). `handleAction` при `buy-only`/`buy-and-apply` только dispatch-ит `request`; `prepareCustomizationPurchase` вызывается исключительно из `onConfirm`. `onCancel` очищает pending без записи intent и без spend. Этот один путь используется и для avatar, и для aura, и для restyle; старые отдельные confirm-модалки удаляются только после подключения нового.

- [ ] **Step 6: Собрать один `Reanimated.FlatList`**

```tsx
<BouncyWrap>
  <Reanimated.View style={[styles.flex, bouncyStyle]}>
    <Reanimated.FlatList
      data={catalogItems}
      keyExtractor={keyExtractor}
      renderItem={renderCatalogItem}
      numColumns={3}
      ListHeaderComponent={listHeader}
      columnWrapperStyle={styles.row}
      contentContainerStyle={{ paddingBottom: bottomInset + ACTION_BAR_HEIGHT + 20 }}
      onScroll={onAnimatedScroll}
      scrollEventThrottle={16}
      bounces
      alwaysBounceVertical
      overScrollMode="always"
    />
  </Reanimated.View>
</BouncyWrap>
```

Не вкладывать вертикальный список в `ScrollView`. При смене основной вкладки или фильтра вызывать `listRef.current?.scrollToOffset({ offset: heroHeight, animated: false })`, чтобы каждый новый набор начинался с начала каталога.

- [ ] **Step 7: Проверить структуру, подтверждение, VIP и bouncy**

Run: `npx jest --runInBand --runTestsByPath tests/customization_purchase_confirmation.test.ts tests/avatar_select_studio_contract.test.ts tests/avatar_select_bouncy_contract.test.ts tests/avatar_select_vip_aura_contract.test.ts`

Expected: PASS; в маршруте ровно один вертикальный виртуализированный список, а ни одна shard-покупка не начинает intent/spend до `onConfirm`.

- [ ] **Step 8: Зафиксировать этап**

```powershell
git add components/customization/CustomizationCatalogCard.tsx components/customization/CustomizationControls.tsx components/customization/CustomizationPurchaseConfirmModal.tsx app/customization_purchase_confirmation.ts app/avatar_select.tsx tests/customization_purchase_confirmation.test.ts tests/avatar_select_studio_contract.test.ts tests/avatar_select_bouncy_contract.test.ts tests/avatar_select_vip_aura_contract.test.ts
git commit -m "feat: build virtualized customization catalog"
```

## Task 8: Редактор аватара и полная интеграция маршрута

**Files:**

- Create: `components/customization/AvatarEditorSheet.tsx`
- Modify: `app/avatar_select.tsx`
- Modify: `tests/avatar_select_studio_contract.test.ts`
- Modify: `tests/custom_avatar_asset_alignment.test.ts`

- [ ] **Step 1: Добавить падающие контракты редактора и сохранённых входов**

```ts
it('keeps restyle, level-avatar reset and profile-card entry', () => {
  const screen = readProjectFile('app', 'avatar_select.tsx');
  const controls = readProjectFile('components', 'customization', 'CustomizationControls.tsx');
  const editor = readProjectFile('components', 'customization', 'AvatarEditorSheet.tsx');
  expect(editor).toContain('CUSTOM_AVATAR_RESTYLE_COST');
  expect(controls).toContain('levelAvatarLabel');
  expect(screen).toContain('Вернуть аватар уровня');
  expect(controls).toContain('onOpenProfileCard');
  expect(screen).toContain("router.push('/profile_card_upgrade'");
  expect(screen).toContain('resetToLevelAvatar');
});
```

- [ ] **Step 2: Подтвердить красную фазу**

Run: `npx jest --runInBand --runTestsByPath tests/avatar_select_studio_contract.test.ts tests/custom_avatar_asset_alignment.test.ts`

Expected: FAIL, редактор отсутствует.

- [ ] **Step 3: Перенести редактор в нижнюю панель**

```tsx
export interface AvatarEditorSheetProps {
  visible: boolean;
  avatar: CustomAvatarDef | null;
  gradientId: string;
  logoColor: CustomAvatarLogoColor;
  owned: boolean;
  onGradientChange: (id: string) => void;
  onLogoColorChange: (color: CustomAvatarLogoColor) => void;
  onConfirm: () => void;
  onClose: () => void;
}
```

Использовать существующие `CUSTOM_AVATAR_GRADIENTS`, локализованные имена, `CUSTOM_AVATAR_BUY_COST` и `CUSTOM_AVATAR_RESTYLE_COST`. Редактор меняет только draft. Gift-only без владения не открывает purchase path.

- [ ] **Step 4: Удалить из маршрута старые секции после переноса всех возможностей**

Проверить перед удалением старой разметки: покупка/рестайлинг, ауры, explicit none, Plus/VIP, level lock, reward-only, подарки, баланс осколков, возврат аватара уровня, вход в карточку профиля, cloud/public sync и toast-сообщения уже имеют новый вызывающий путь. Только после этого удалить старые `ScrollView.map`, profile-card section и прежние модальные блоки.

- [ ] **Step 5: Проверить узкие контракты интеграции**

Run: `npx jest --runInBand --runTestsByPath tests/avatar_select_studio_contract.test.ts tests/custom_avatar_asset_alignment.test.ts tests/avatar_select_vip_aura_contract.test.ts tests/avatar_auras.test.ts tests/avatar_auras_unlock_cap.test.ts`

Expected: PASS; уровневые аватары не появляются в catalog builder.

- [ ] **Step 6: Зафиксировать этап**

```powershell
git add components/customization/AvatarEditorSheet.tsx app/avatar_select.tsx tests/avatar_select_studio_contract.test.ts tests/custom_avatar_asset_alignment.test.ts
git commit -m "feat: complete avatar studio interactions"
```

## Task 9: Финальная проверка, доступность и регрессии

**Files:**

- Modify: only files required by failing focused checks
- Update: `docs/superpowers/plans/2026-07-13-avatar-customization-studio.md` checkbox state during execution

- [ ] **Step 1: Запустить весь узкий пакет кастомизации**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/customization_snapshot.test.ts `
  tests/customization_catalog.test.ts `
  tests/customization_draft.test.ts `
  tests/customization_service.test.ts `
  tests/customization_purchase_intent.test.ts `
  tests/customization_purchase_confirmation.test.ts `
  tests/shards_idempotent_spend.test.ts `
  tests/avatar_select_first_frame_contract.test.ts `
  tests/avatar_select_studio_contract.test.ts `
  tests/avatar_select_vip_aura_contract.test.ts `
  tests/avatar_select_bouncy_contract.test.ts `
  tests/custom_avatar_asset_alignment.test.ts `
  tests/avatar_auras.test.ts `
  tests/avatar_auras_unlock_cap.test.ts `
  tests/cloud_sync_owned_aura_merge.test.ts `
  tests/app_snapshot_store_contract.test.ts `
  tests/app_snapshot_bootstrap_contract.test.ts `
  tests/perf_freeze_contract.test.ts `
  tests/navigation_back_underlay_contract.test.ts
```

Expected: PASS, 0 failed suites. Не запускать snapshot-update или source-writing scripts.

- [ ] **Step 2: Запустить узкий статический check по изменённым файлам**

Не запускать широкий project-wide `tsc`. Выполнить `npx eslint` только для изменённых `.ts/.tsx` файлов студии; типы новых модулей дополнительно проверяются узкими Jest/ts-jest suites из Step 1. Сохранить объёмный вывод в `.codex-tmp/avatar-studio/static-check.log`, а в отчёт вынести только exit code и относящиеся к изменённым файлам ошибки.

- [ ] **Step 3: Провести ручную проверку на устройстве/dev build**

Проверить:

1. холодное открытие и повторный вход без смены аватара/уровня/ауры/цвета;
2. сцена занимает почти первый экран и полностью уходит при scroll;
3. темы с фиолетовым, синим и ярко-зелёным акцентом; на зелёной CTA тёмный текст;
4. `Аватары / Ауры`, `Все / Мои`, скрытый secret gift;
5. доступный образ, один платный blocker, два платных blocker-а, level/Plus/reward blocker;
6. `Без ауры`, `Вернуть аватар уровня`, меню `Карточка профиля`;
7. покупка 50, рестайлинг 10, аура 35 без двойного списания;
8. ширина 360 px, крупный шрифт, screen reader labels, reduced motion;
9. фон/возврат приложения и смена аккаунта.

- [ ] **Step 4: Проверить итоговый diff и отсутствие случайных файлов**

Run:

```powershell
git diff --check
git status --short
git diff --name-only 9673b99b4...HEAD
```

Expected: только запланированные файлы; никакие существующие пользовательские изменения, generated `functions/lib`, assets или `.superpowers/brainstorm` не добавлены.

- [ ] **Step 5: Вернуть найденные дефекты в ответственный этап**

Если Step 1–4 выявил дефект, вернуться к Task 1–8, добавить сначала воспроизводящий тест, исправить только файлы этого этапа и создать указанный там тематический коммит. Не создавать общий catch-all коммит и не подмешивать чужие изменения.

## Acceptance Criteria

- Первый кадр не использует фиктивные avatar `1`, level `1`, null aura или zero shards при наличии раннего снимка.
- Hero показывает составной draft и использует accent текущей темы.
- Hero полностью уходит при прокрутке; sticky preview отсутствует.
- Только `Аватары / Ауры` и `Все / Мои` являются основными элементами навигации каталога.
- Уровневые аватары отсутствуют в каталоге; действие `Вернуть аватар уровня` доступно только при custom avatar.
- Locked items видимы с условием, secret gifts скрыты до владения.
- Выбор не меняет профиль до явной CTA.
- Составной apply не оставляет частичного avatar/aura state.
- Любая shard-покупка сначала показывает единое подтверждение; повтор незавершённой операции не списывает осколки второй раз и не меняет профиль до выдачи владения.
- Существующие цены, Plus/VIP, Arena/reward, gift, profile-card route и sync-контракты сохранены.
- В экране один вертикальный виртуализированный список; каталожные ауры статичны.
- Узкий Jest-пакет проходит; ручная проверка подтверждает отсутствие визуального скачка.

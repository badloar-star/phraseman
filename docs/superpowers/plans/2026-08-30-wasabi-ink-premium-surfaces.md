# Wasabi Ink Premium Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить ровно пять реально отображаемых премиальных Wasabi Ink ассетов: три экранных фона, реферальный баннер и полноразмерную иконку темы.

**Architecture:** `AppArtBackdrop` получает optional static source только для `wasabiInk`; остальные темы продолжают использовать текущие градиенты и скримы без новых файлов. Три полноэкранных route-слота разделены на `home`, `settings` и `referrals`; существующие пути баннера и иконки сохраняются.

**Tech Stack:** React Native, Expo Router, `expo-image`, TypeScript, Jest/ts-jest, Sharp, WebP, встроенный Codex image generation.

---

### Task 1: Контракт пяти production-ассетов

**Files:**
- Create: `tests/wasabi_ink_premium_surfaces_contract.test.ts`
- Modify: `tests/wasabi_ink_asset_maps_contract.test.ts`
- Modify: `scripts/theme_assets/wasabi-ink-production-manifest.json`

- [ ] **Step 1: Написать failing-тест путей, размеров и runtime-подключения**

Тест обязан проверить следующие значения:

```ts
const SURFACES = [
  ['assets/images/app_backdrops/wasabiInk/home.webp', 1080, 1920, false],
  ['assets/images/app_backdrops/wasabiInk/settings.webp', 1080, 1920, false],
  ['assets/images/app_backdrops/wasabiInk/referrals.webp', 1080, 1920, false],
  ['assets/images/settings/referral_theme/invite-wasabiInk-v2.webp', 512, 171, false],
  ['assets/theme-icons/wasabiInk.webp', 96, 96, true],
] as const;
```

Дополнительно тест читает `components/appArtBackdropRegistry.ts`, `components/AppArtBackdrop.tsx` и `app/referrals.tsx` и требует три статических `require()`, имя `referrals`, `expo-image` и `artBackdrop="referrals"`.

- [ ] **Step 2: Запустить тест и подтвердить RED**

Run:

```powershell
npx jest --config .codex-tmp/wasabi-jest.config.cjs tests/wasabi_ink_premium_surfaces_contract.test.ts --runInBand
```

Expected: FAIL — отсутствуют три фоновых файла, registry source-map и размер иконки `96×96`.

- [ ] **Step 3: Обновить manifest без speculative-слотов**

Добавить три записи `family: "app_backdrops"`, обновить запись `wasabi.theme.icons.wasabiInk` до `96×96`, оставить реферальный баннер `512×171`. Итоговый manifest — 54 уникальных target.

- [ ] **Step 4: Зафиксировать контракт**

```powershell
git add tests/wasabi_ink_premium_surfaces_contract.test.ts tests/wasabi_ink_asset_maps_contract.test.ts scripts/theme_assets/wasabi-ink-production-manifest.json
git commit -m "test: define Wasabi Ink premium surface contract"
```

### Task 2: Runtime-подключение трёх фоновых слотов

**Files:**
- Modify: `components/appArtBackdropRegistry.ts`
- Modify: `components/AppArtBackdrop.tsx`
- Modify: `app/referrals.tsx`

- [ ] **Step 1: Добавить optional Wasabi map**

В registry добавить:

```ts
const WASABI_INK_BACKDROPS: Partial<Record<AppArtBackdropName, ImageSourcePropType>> = {
  home: require('../assets/images/app_backdrops/wasabiInk/home.webp'),
  settings: require('../assets/images/app_backdrops/wasabiInk/settings.webp'),
  referrals: require('../assets/images/app_backdrops/wasabiInk/referrals.webp'),
};

export function getAppArtBackdropSource(
  name: AppArtBackdropName,
  themeMode: ThemeMode,
): ImageSourcePropType | null {
  return themeMode === 'wasabiInk' ? WASABI_INK_BACKDROPS[name] ?? null : null;
}
```

`referrals` добавить в `APP_ART_BACKDROP_NAMES` и route-map.

- [ ] **Step 2: Вернуть Image-слой только при наличии source**

В `AppArtBackdrop` использовать `expo-image`:

```tsx
{source ? (
  <Image
    source={source}
    contentFit="cover"
    cachePolicy="memory-disk"
    accessible={false}
    style={[styles.image, { opacity: 0.72 }]}
  />
) : null}
```

После изображения остаются существующие вертикальный и краевой скримы. Для `wasabiInk` их альфы уменьшаются до уровня, при котором фон заметен, а центр сохраняет читаемость.

- [ ] **Step 3: Разделить Рефералы и Друзей**

В `app/referrals.tsx` заменить:

```tsx
<ScreenGradient artBackdrop="friends">
```

на:

```tsx
<ScreenGradient artBackdrop="referrals">
```

- [ ] **Step 4: Выполнить синтаксическую проверку**

Run: TypeScript `transpileModule` для трёх изменённых файлов.

Expected: 0 diagnostics.

### Task 3: Генерация и production-обработка пяти ассетов

**Files:**
- Create: `scripts/theme_assets/build-wasabi-premium-surfaces.mjs`
- Create: `assets/images/app_backdrops/wasabiInk/home.webp`
- Create: `assets/images/app_backdrops/wasabiInk/settings.webp`
- Create: `assets/images/app_backdrops/wasabiInk/referrals.webp`
- Replace: `assets/images/settings/referral_theme/invite-wasabiInk-v2.webp`
- Replace: `assets/theme-icons/wasabiInk.webp`
- Raw sources: `.codex-tmp/wasabi-premium-surfaces/raw/*.png`

- [ ] **Step 1: Подготовить композиционные референсы**

Из исторических `app_backdrops/compass-premium` извлечь только `home`, `settings`, `friends` в `.codex-tmp/wasabi-premium-surfaces/references/`. Они задают геометрию и negative space, но не цвет или содержание.

- [ ] **Step 2: Сгенерировать пять отдельных high-quality исходников**

Использовать встроенный image generation, один вызов на объект. Все полноэкранные и широкие арты генерируются на сплошном RGB; иконка запрашивается с реальной прозрачностью. Запрещены текст, watermark, логотипы, шахматка и повтор композиции `sagePorcelain`.

- [ ] **Step 3: Обработать только эти пять файлов**

Скрипт:

```js
await sharp(raw).resize(1080, 1920, { fit: 'cover' }).removeAlpha()
  .webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(target);

await sharp(iconRaw).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(88, 88, { fit: 'contain' })
  .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 82, alphaQuality: 100, effort: 6 }).toFile(iconTarget);
```

Перед replacement баннер и иконка копируются в `.codex-tmp/wasabi-premium-surfaces/backup/`.

- [ ] **Step 4: Собрать RGB contact sheet и экранные previews**

Contact sheet хранится вне bundle. Фоны накладываются под текущие mock-карточки с реальными отступами; отдельно проверяются баннер `512×171` и иконка рядом с девятью соседними темами.

### Task 4: GREEN и финальный аудит

**Files:**
- Modify: `tests/wasabi_ink_premium_surfaces_contract.test.ts` только если тест обнаружил реальную ошибку контракта, а не ради обхода проверки.

- [ ] **Step 1: Запустить focused Jest gates**

```powershell
npx jest --config .codex-tmp/wasabi-jest.config.cjs \
  tests/wasabi_ink_premium_surfaces_contract.test.ts \
  tests/wasabi_ink_asset_maps_contract.test.ts \
  tests/wasabi_ink_theme_contract.test.ts \
  tests/wasabi_ink_surface_contract.test.ts \
  --runInBand
```

Expected: все suites PASS.

- [ ] **Step 2: Проверить bundle hygiene**

Скрипт сравнивает все пути с `wasabiInk` в `assets/**` с manifest: `named === manifest === 54`, `missing === 0`, `extras === 0`.

- [ ] **Step 3: Проверить метаданные и вес**

Expected: три фона `1080×1920`, RGB, каждый ≤280 КБ; баннер `512×171`, RGB; иконка `96×96`, alpha, непрозрачный bbox занимает не менее 55% площади холста.

- [ ] **Step 4: Финальный diff-check**

Run: `git diff --check` только для файлов этого плана.

Expected: exit 0.

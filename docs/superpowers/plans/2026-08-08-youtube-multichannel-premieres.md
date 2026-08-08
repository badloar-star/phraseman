# Мультиканальный YouTube-раздел и премьеры — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить текущий одно-канальный экран видео в серверно управляемый мультиканальный YouTube-каталог с языковым автовыбором, плейлистами, состояниями премьер, countdown, однократной premium-анимацией и локальным напоминанием.

**Architecture:** Cloud Functions с серверным `YOUTUBE_DATA_API_KEY` синхронизируют ограниченный каталог YouTube, полностью записывают versioned snapshot и только затем атомарно переключают public manifest в Firestore. Мобильное приложение читает manifest и активную версию только на чтение, мгновенно гидрируется из локального snapshot и сохраняет существующий RSS-путь как fallback. Единственная рабочая админка — legacy-интерфейс в `admin/v2/legacy.html`; белый Admin 2 shell не меняется.

**Tech Stack:** Expo / React Native / TypeScript, Expo Router, React Native Firebase Firestore, AsyncStorage, Expo Notifications, React Native Reanimated, Firebase Functions v2 (Node 22), Firestore, Jest, Firebase Rules Unit Testing, plain HTML/CSS/JS legacy admin.

---

## Обязательные границы выполнения

- Работать только в каноническом checkout `C:\appsprojects\phraseman` и ветке `feature/referral-roulette`; не создавать ветку или worktree без отдельного распоряжения владельца.
- Сохранять все посторонние dirty-изменения. Перед каждым коммитом проверять `git status --short -- <paths>` и `git diff -- <paths>`. Команды `git add -- <paths>` ниже допустимы только для файлов, которые были чистыми до начала задачи; для уже dirty-файлов использовать `git add -p -- <path>` и проверить каждый hunk. Всегда проверять `git diff --cached --name-only` и `git diff --cached`.
- Из админки изменять только `admin/v2/legacy.html`. Не трогать `admin/legacy.html`, `admin/v2/index.html` и `admin/v2/scripts/**`.
- Не включать App Check для админских callable-функций. Использовать `ADMIN_SENSITIVE_WRITE_OPTIONS` и сохранять `ENFORCE_APP_CHECK_ADMIN=false` по умолчанию.
- Не использовать OpenAI API. Ключ `YOUTUBE_DATA_API_KEY` — отдельный Firebase Secret только для YouTube Data API.
- Не разворачивать Functions, Hosting, Rules или мобильный релиз без отдельного запроса владельца. План заканчивается проверенной release-ready реализацией и инструкцией ручного rollout.
- Перед изменением `admin/v2/legacy.html` перечитать `docs/design/ADMIN_UI_BIBLE.md`; новая карточка относится к категории «Контент», имеет один основной CTA, tooltips, preview, loading/empty/error и audit feedback.

## Task 0: Зафиксировать preflight и существующие dirty-пересечения

**Files:** read-only inspection only.

- [ ] **Step 1: Проверить канонический checkout и ветку**

```powershell
Get-Location
git branch --show-current
node scripts/canonical_workspace_guard.mjs
```

Expected: `C:\appsprojects\phraseman`, `feature/referral-roulette`, guard PASS.

- [ ] **Step 2: Зафиксировать baseline commit и dirty-состояние затрагиваемых файлов**

```powershell
git rev-parse HEAD
git status --short -- shared/youtube_catalog_contract.ts app/lingman_youtube.ts app/lingman_youtube_cache.ts app/lingman_videos.tsx app/notifications.ts app/_layout.tsx admin/v2/legacy.html admin/v2/index.html admin/v2/scripts admin/legacy.html firestore.rules functions/src functions/package.json
git diff -- admin/v2/legacy.html app/_layout.tsx app/notifications.ts app/lingman_youtube.ts app/lingman_videos.tsx firestore.rules functions/package.json
```

Записать baseline commit и список pre-dirty файлов в рабочие заметки выполнения. Если текущие незакоммиченные hunks уже меняют YouTube-секцию, notification type или те же Stack routes, сначала аккуратно совместить контракты; не заменять файл целиком и не откатывать чужие изменения.

- [ ] **Step 3: Проверить focused baseline**

```powershell
npx jest --runTestsByPath tests/lingman_youtube.test.ts tests/lingman_youtube_cache.test.ts tests/lingman_video_open_seen_contract.test.ts tests/admin_single_surface_contract.test.ts tests/admin_hosting_deploy_guard.test.ts --no-cache --runInBand
```

Expected: PASS либо точно записанный существующий baseline failure до первой правки. Не чинить несвязанные baseline failures в рамках этой функции.

## Task 1: Зафиксировать общий контракт каталога и чистую валидацию

**Files:**

- Create: `shared/youtube_catalog_contract.ts`
- Create: `tests/youtube_catalog_contract.test.ts`
- Modify: `app/lingman_youtube.ts`

- [ ] **Step 1: Написать RED-тесты общего контракта**

Покрыть:

- `UC[0-9A-Za-z_-]{22}` и YouTube URL;
- уникальные внутренние `channel.id` и `youtubeChannelId`;
- один default на locale и только среди enabled-каналов;
- точный locale → базовый locale → `defaultChannelId`;
- bounded limits: максимум 24 канала, 100 видео/канал, 50 плейлистов/канал, 500 элементов/плейлист;
- expiry обязательного premiere override;
- runtime-парсинг manifest/channel/video/playlist без доверия к Firestore JSON.

```ts
expect(resolveYoutubeChannelId(manifest, 'pt-PT', null)).toBe('channel-pt');
expect(() => validateYoutubeCatalogConfig({
  ...validConfig,
  localeDefaults: { ru: 'disabled-channel' },
})).toThrow('locale_default_must_be_enabled');
```

- [ ] **Step 2: Запустить тест и подтвердить RED**

Run:

```powershell
npx jest --runTestsByPath tests/youtube_catalog_contract.test.ts --no-cache --runInBand
```

Expected: FAIL, потому что `shared/youtube_catalog_contract.ts` ещё отсутствует.

- [ ] **Step 3: Реализовать типы, константы и pure helpers**

Минимальный публичный seam:

```ts
export const YOUTUBE_CATALOG_SCHEMA_VERSION = 1 as const;
export const YOUTUBE_CATALOG_LIMITS = Object.freeze({
  channels: 24,
  videosPerChannel: 100,
  playlistsPerChannel: 50,
  playlistItems: 500,
  playlistPageSize: 50,
});

export type YoutubeVideoState = 'video' | 'upcoming' | 'live' | 'completed';

export function resolveYoutubeChannelId(
  manifest: YoutubeCatalogManifest,
  locale: string,
  manualChannelId: string | null,
): string { /* exact → base → default → first enabled */ }
```

Runtime parsers должны возвращать typed result либо понятную ошибку; не использовать `as YoutubeCatalogManifest` на необработанном Firestore документе.

- [ ] **Step 4: Убрать дублирование parser-ов без поломки старых импортов**

`app/lingman_youtube.ts` должен re-export существующих имён:

```ts
export {
  parseYoutubeChannelId,
  parseYoutubeHandle,
} from '../shared/youtube_catalog_contract';
```

Сохранить поведение `getActiveYoutubeChannel()` и RSS fallback до Task 11.

- [ ] **Step 5: Подтвердить GREEN и старую совместимость**

Run:

```powershell
npx jest --runTestsByPath tests/youtube_catalog_contract.test.ts tests/lingman_youtube.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- shared/youtube_catalog_contract.ts tests/youtube_catalog_contract.test.ts app/lingman_youtube.ts
git commit -m "feat: define youtube catalog contract"
```

## Task 2: Реализовать YouTube Data API adapter и нормализацию премьер

**Files:**

- Create: `functions/src/youtube_data_api.ts`
- Create: `functions/src/youtube_data_api.test.ts`
- Create: `functions/src/youtube_catalog_core.ts`
- Create: `functions/src/youtube_catalog_core.test.ts`

- [ ] **Step 1: Написать RED-тесты HTTP adapter-а**

Проверить:

- только `https://www.googleapis.com/youtube/v3/*`;
- API key передаётся сервером и не попадает в лог/ошибку;
- `fields` ограничивает ответ;
- 10-секундный `AbortController` timeout;
- 429/403 quota, 5xx и malformed JSON нормализуются в разные error codes;
- пагинация останавливается на product limits.

- [ ] **Step 2: Написать RED-тесты статусов**

```ts
expect(classifyYoutubeVideo({
  scheduledStartTime: '2026-08-08T20:00:00Z',
}, Date.parse('2026-08-08T19:00:00Z'))).toBe('upcoming');

expect(classifyYoutubeVideo({
  actualStartTime: '2026-08-08T20:00:00Z',
}, Date.parse('2026-08-08T20:05:00Z'))).toBe('live');

expect(classifyYoutubeVideo({
  actualStartTime: '2026-08-08T20:00:00Z',
  actualEndTime: '2026-08-08T21:00:00Z',
}, Date.parse('2026-08-08T21:05:00Z'))).toBe('completed');
```

Также проверить Shorts-фильтр, merge uploads/Data API/pinned/overrides и отсутствие дублей.

- [ ] **Step 3: Подтвердить RED**

Run:

```powershell
cd functions
npx jest --runTestsByPath src/youtube_data_api.test.ts src/youtube_catalog_core.test.ts --no-cache --runInBand
```

Expected: FAIL на отсутствующих модулях.

- [ ] **Step 4: Реализовать gateway с dependency injection**

```ts
export interface YoutubeDataGateway {
  getChannel(channelId: string): Promise<YoutubeChannelSource>;
  getUploadVideoIds(uploadsPlaylistId: string, limit: number): Promise<string[]>;
  getVideos(videoIds: readonly string[]): Promise<YoutubeVideoSource[]>;
  getPlaylists(channelId: string, limit: number): Promise<YoutubePlaylistSource[]>;
  getPlaylistVideoIds(playlistId: string, limit: number): Promise<string[]>;
  searchEvents(channelId: string, eventType: 'upcoming' | 'live'): Promise<string[]>;
}
```

`videos.list` вызывать пакетами до 50 id. `search.list` не вызывать из adapter-а самопроизвольно: решение о quota/eligibility принадлежит core/runtime.

- [ ] **Step 5: Реализовать deterministic core**

Core принимает `nowMs`, config, предыдущий sync state и gateway output. Он не читает часы, env или Firestore напрямую. Политика discovery:

- обычные metadata/uploads/playlists — не чаще 15 минут;
- обычный event discovery — не чаще 6 часов;
- найденная upcoming-премьера обновляется через дешёвый `videos.list` каждые 2 минуты;
- live — через `videos.list` каждую минуту;
- глобально максимум 80 `search.list` calls/UTC day;
- round-robin cursor не даёт первым каналам постоянно съедать бюджет.

- [ ] **Step 6: GREEN**

Run:

```powershell
cd functions
npx jest --runTestsByPath src/youtube_data_api.test.ts src/youtube_catalog_core.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- functions/src/youtube_data_api.ts functions/src/youtube_data_api.test.ts functions/src/youtube_catalog_core.ts functions/src/youtube_catalog_core.test.ts
git commit -m "feat: normalize youtube catalog sources"
```

## Task 3: Добавить versioned Firestore repository и атомарную публикацию

**Files:**

- Create: `functions/src/youtube_catalog_store.ts`
- Create: `functions/src/youtube_catalog_store.test.ts`

- [ ] **Step 1: Написать RED-тесты repository**

Проверить последовательность:

1. создать `youtube_catalog_snapshots/{version}` со статусом `building`;
2. записать bounded channel/video/playlist/page docs chunked batches;
3. перечитать/проверить counts и schema;
4. отметить версию `ready`;
5. транзакцией переключить `youtube_catalog/public.activeVersion`;
6. только после переключения обновить `sync_state`.

Отдельные тесты:

- ошибка в любом batch не меняет public pointer;
- параллельный worker не может украсть незавершённую lease;
- cleanup удаляет только версии старше 7 дней и никогда activeVersion;
- rollback меняет pointer только на `ready`-версию;
- ни один документ не превышает безопасный сериализованный порог 700 KB.

- [ ] **Step 2: Подтвердить RED**

```powershell
cd functions
npx jest --runTestsByPath src/youtube_catalog_store.test.ts --no-cache --runInBand
```

Expected: FAIL.

- [ ] **Step 3: Реализовать repository через узкий интерфейс**

```ts
export interface YoutubeCatalogStore {
  readConfig(): Promise<YoutubeCatalogConfigRecord | null>;
  claimSyncLease(nowMs: number, owner: string): Promise<YoutubeSyncLease | null>;
  publishSnapshot(snapshot: YoutubeBuiltSnapshot, lease: YoutubeSyncLease): Promise<string>;
  recordFailure(lease: YoutubeSyncLease, error: YoutubeSyncError): Promise<void>;
  cleanupOldVersions(nowMs: number): Promise<number>;
}
```

Batch size держать не выше 400 writes. `activeVersion` переключать отдельной transaction после полной записи.

- [ ] **Step 4: GREEN**

```powershell
cd functions
npx jest --runTestsByPath src/youtube_catalog_store.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- functions/src/youtube_catalog_store.ts functions/src/youtube_catalog_store.test.ts
git commit -m "feat: publish atomic youtube snapshots"
```

## Task 4: Подключить scheduler, admin callables, secret и deploy coverage

**Files:**

- Create: `functions/src/youtube_catalog.ts`
- Create: `functions/src/youtube_catalog.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/package.json`
- Modify: `scripts/functions_source_coverage_gate.mjs` только если gate требует явного registry

- [ ] **Step 1: Написать RED-тесты entrypoints**

Требуемые exports:

```ts
youtubeCatalogSyncCron
adminGetYoutubeCatalogWorkspace
adminPublishYoutubeCatalogConfig
adminRefreshYoutubeCatalog
```

Проверить:

- все admin endpoints требуют `admin: true` и permission `application.config.write`;
- read и write используют `ADMIN_SENSITIVE_WRITE_OPTIONS`, а не глобальный `ENFORCE_APP_CHECK`;
- publish требует `expectedRevision`, `reason`, `requestId`, `idempotencyKey`;
- replay того же command возвращает прежний result, другой payload с тем же key отклоняется;
- manual refresh имеет 60-секундный server rate limit, lease и общий search budget;
- audit пишет before/after без secret и без полного payload YouTube;
- cron не публикует пустой snapshot при config/API failure.

- [ ] **Step 2: Подтвердить RED**

```powershell
cd functions
npx jest --runTestsByPath src/youtube_catalog.test.ts --no-cache --runInBand
```

Expected: FAIL.

- [ ] **Step 3: Реализовать runtime и secret**

```ts
export const YOUTUBE_DATA_API_KEY = defineSecret('YOUTUBE_DATA_API_KEY');

export const youtubeCatalogSyncCron = onSchedule({
  schedule: 'every 1 minutes',
  timeZone: 'UTC',
  region: 'us-central1',
  timeoutSeconds: 120,
  memory: '512MiB',
  secrets: [YOUTUBE_DATA_API_KEY],
}, async () => runYoutubeCatalogSync({ trigger: 'cron' }));
```

Admin refresh callable тоже получает `secrets: [YOUTUBE_DATA_API_KEY]`, но `enforceAppCheck` остаётся значением `ENFORCE_APP_CHECK_ADMIN` из `ADMIN_SENSITIVE_WRITE_OPTIONS`.

- [ ] **Step 4: Экспортировать и добавить узкий deploy script**

Добавить в `functions/package.json` отдельный script, не раздувая `deploy:safe`:

```json
"deploy:youtube-catalog": "node ../scripts/deploy_lock_guard.mjs && npm run build && firebase deploy --only \"functions:youtubeCatalogSyncCron,functions:adminGetYoutubeCatalogWorkspace,functions:adminPublishYoutubeCatalogConfig,functions:adminRefreshYoutubeCatalog\""
```

Этот script на данном этапе не запускать.

- [ ] **Step 5: GREEN + build + coverage gate**

```powershell
cd functions
npx jest --runTestsByPath src/youtube_catalog.test.ts --no-cache --runInBand
npm run build
npm run gate:functions-coverage
```

Expected: PASS; exports находятся в `lib/functions/src/index.js`.

- [ ] **Step 6: Commit**

```powershell
git add -- functions/src/youtube_catalog.ts functions/src/youtube_catalog.test.ts functions/src/index.ts functions/package.json scripts/functions_source_coverage_gate.mjs
git commit -m "feat: expose youtube catalog sync"
```

Если coverage script не менялся, не добавлять его в `git add`.

## Task 5: Закрыть Firestore Rules и проверить новую коллекцию

**Files:**

- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`
- Create: `functions/src/youtube_catalog_rules.emulator.test.ts`
- Modify: `functions/package.json`
- Inspect only: `functions/src/jarvis/*_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts` только если Jarvis уже читает затронутые пути

- [ ] **Step 1: Выполнить обязательную Jarvis impact-проверку**

```powershell
rg -n "youtube_catalog|remote_config.*youtube|youtube_channel" functions/src/jarvis
```

Expected: либо 0 совпадений и документированное «Jarvis не читает новый каталог», либо точечное обновление reader + contract guard в этой же задаче.

- [ ] **Step 2: Написать RED contract/emulator tests**

Матрица доступа:

| Path | signed-out | signed-in app | admin client | Admin SDK |
|---|---:|---:|---:|---:|
| `youtube_catalog/public` | deny | read | read | read/write |
| `youtube_catalog/config` | deny | deny | read | read/write |
| `youtube_catalog/sync_state` | deny | deny | read | read/write |
| active snapshot tree | deny | read | read | read/write |
| any client write | deny | deny | deny | allow |

- [ ] **Step 3: Добавить явные rules до финального deny-all**

```rules
match /youtube_catalog/{docId} {
  allow read: if docId == 'public' && request.auth != null
    || (docId in ['config', 'sync_state'] && isAdmin());
  allow create, update, delete: if false;
}

match /youtube_catalog_snapshots/{version} {
  allow read: if request.auth != null;
  allow write: if false;
  match /{document=**} {
    allow read: if request.auth != null;
    allow write: if false;
  }
}
```

- [ ] **Step 4: Добавить emulator script и запустить**

```json
"test:emulator:youtube-catalog-rules": "firebase emulators:exec --config ../firebase.json --only firestore --project demo-phraseman-youtube-catalog --log-verbosity QUIET \"jest --config jest.emulator.config.js --runTestsByPath src/youtube_catalog_rules.emulator.test.ts --no-cache --runInBand\""
```

Run:

```powershell
npx jest --runTestsByPath tests/firestore_rules_security.test.ts --no-cache --runInBand
cd functions
npm run test:emulator:youtube-catalog-rules
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- firestore.rules tests/firestore_rules_security.test.ts functions/src/youtube_catalog_rules.emulator.test.ts functions/package.json
git commit -m "security: protect youtube catalog snapshots"
```

## Task 6: Переделать только живую legacy-админку в «YouTube-каталог»

**Files:**

- Modify: `admin/v2/legacy.html`
- Create: `tests/admin_legacy_youtube_catalog_contract.test.ts`
- Verify unchanged: `admin/legacy.html`
- Verify unchanged: `admin/v2/index.html`
- Verify unchanged: `admin/v2/scripts/**`

- [ ] **Step 1: Перед редактированием перечитать Admin UI Bible**

```powershell
Get-Content -Raw -Encoding UTF8 docs/design/ADMIN_UI_BIBLE.md
```

- [ ] **Step 2: Написать RED DOM/source contract**

Тест требует:

- заголовок «YouTube-каталог» в категории «Контент»;
- список каналов с add/select/enable/order/locale/default controls;
- playlist overrides: hide/order/title;
- premiere overrides: hide/title/start/expiry/reset;
- «Обновить из YouTube» как единственный главный CTA;
- preview/validation перед publish config;
- sync status, last success, stale/error, quota budget;
- tooltip и `aria-label` на icon-only controls;
- escaping через `textContent`, без вставки admin/API текста в `innerHTML`;
- callable names из Task 4;
- отсутствие App Check enablement.

- [ ] **Step 3: Подтвердить RED**

```powershell
npx jest --runTestsByPath tests/admin_legacy_youtube_catalog_contract.test.ts --no-cache --runInBand
```

Expected: FAIL на старой одно-канальной карточке.

- [ ] **Step 4: Заменить карточку, сохранив migration fallback**

При первом открытии workspace:

- если `youtube_catalog/config` отсутствует, UI строит draft из `youtube_channel_*` и `youtube_pinned_videos`;
- ничего не пишет автоматически;
- admin видит preview «Будет создан первый канал»;
- publish происходит только после явного подтверждения и reason;
- старые remote-config поля не удаляются.

Client payload:

```js
const publishYoutubeCatalog = getAdminSensitiveControlCallable('adminPublishYoutubeCatalogConfig');
await publishYoutubeCatalog({
  nextConfig: collectYoutubeCatalogDraft(),
  expectedRevision: youtubeCatalogWorkspace.revision,
  reason: getRequiredReason(),
  requestId: crypto.randomUUID(),
  idempotencyKey: `youtube_catalog_${crypto.randomUUID()}`,
});
```

- [ ] **Step 5: Добавить понятные состояния**

- loading — сохранённая геометрия формы, не overlay;
- empty — кнопка добавления первого канала;
- validation error — рядом с полем и в summary;
- sync partial failure — по каналу, последний public snapshot остаётся активным;
- success — revision, audit id и время sync;
- responsive 375/768/1024/1440, touch target 44px, visible focus, `prefers-reduced-motion`.

- [ ] **Step 6: Проверить границу единственной админки**

```powershell
npx jest --runTestsByPath tests/admin_legacy_youtube_catalog_contract.test.ts tests/admin_single_surface_contract.test.ts tests/admin_hosting_deploy_guard.test.ts --no-cache --runInBand
git status --short -- admin/v2/legacy.html admin/v2/index.html admin/v2/scripts admin/legacy.html
```

Expected: PASS. Новые hunks этой задачи существуют только в `admin/v2/legacy.html`; pre-existing dirty hunks в frozen-файлах остаются побайтово нетронутыми и не staging-ятся.

- [ ] **Step 7: Commit**

```powershell
git add -p -- admin/v2/legacy.html
git add -- tests/admin_legacy_youtube_catalog_contract.test.ts
git diff --cached --name-only
git diff --cached -- admin/v2/legacy.html
git commit -m "feat: manage youtube catalog in legacy admin"
```

## Task 7: Добавить мобильный reader, локальный cache и выбор канала

**Files:**

- Create: `app/youtube_catalog_client.ts`
- Create: `app/youtube_catalog_cache.ts`
- Create: `app/youtube_channel_preference.ts`
- Create: `tests/youtube_catalog_client.test.ts`
- Create: `tests/youtube_channel_preference.test.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Написать RED-тесты client/cache**

Проверить:

- runtime validation manifest и active snapshot;
- one-shot `.get()` reads, без `onSnapshot`;
- account-generation guard: поздний ответ старого аккаунта не commit-ится;
- cached first frame из `screen_snapshot_store`;
- quiet revalidation не делает `setState`, если version и data не изменились;
- exact/base/default/manual selection;
- удалённый/disabled manual channel очищается и возвращает auto;
- bounded persisted screen snapshot: active event + первые 20 видео + 8 плейлистов, меньше 24 000 символов.

- [ ] **Step 2: Подтвердить RED**

```powershell
npx jest --runTestsByPath tests/youtube_catalog_client.test.ts tests/youtube_channel_preference.test.ts --no-cache --runInBand
```

Expected: FAIL.

- [ ] **Step 3: Реализовать aggregate reader**

```ts
export async function fetchYoutubeChannelCatalog(
  channelId: string,
  expectedVersion?: string,
): Promise<YoutubeChannelCatalog> {
  // public → active version → channel/videos/playlists; validate every document
}
```

Не использовать realtime listener. `videos` и `playlists` bounded server contract-ом; порядок восстанавливать по `recentVideoIds`/`playlistIds`, а не доверять query order.

- [ ] **Step 4: Реализовать долговечный manual/auto preference**

```ts
type YoutubeChannelPreference =
  | { mode: 'auto' }
  | { mode: 'manual'; channelId: string };
```

Гидрировать preference в bootstrap рядом с `primeScreenSnapshotsFromStorage()`:

```ts
hydrateYoutubeChannelPreference().catch(() => {}),
```

- [ ] **Step 5: GREEN**

```powershell
npx jest --runTestsByPath tests/youtube_catalog_client.test.ts tests/youtube_channel_preference.test.ts tests/lingman_youtube_cache.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- app/youtube_catalog_client.ts app/youtube_catalog_cache.ts app/youtube_channel_preference.ts app/_layout.tsx tests/youtube_catalog_client.test.ts tests/youtube_channel_preference.test.ts
git commit -m "feat: load cached youtube channel catalogs"
```

## Task 8: Реализовать countdown и однократность premium-анимации

**Files:**

- Create: `app/youtube_premiere_runtime.ts`
- Create: `tests/youtube_premiere_runtime.test.ts`

- [ ] **Step 1: Написать RED-тесты времени**

Покрыть:

- days/hours/minutes; seconds только в последний час;
- нулевую границу ровно в `scheduledStartTime`;
- изменение часового пояса не меняет remaining milliseconds;
- некорректное/прошедшее время не показывает отрицательный countdown;
- state из snapshot считается authoritative, локальное время только меняет presentation boundary;
- interval >= 1000 ms и останавливается при blur/background.

- [ ] **Step 2: Написать RED-тесты bounded seen-map**

```ts
const next = markPremiereIntroSeen(current, 'video-42', nowMs);
expect(shouldPlayPremiereIntro(next, 'video-42')).toBe(false);
expect(Object.keys(prunePremiereIntroSeen(next)).length).toBeLessThanOrEqual(40);
```

Хранить максимум 40 videoId и TTL 180 дней.

- [ ] **Step 3: Подтвердить RED, реализовать, получить GREEN**

```powershell
npx jest --runTestsByPath tests/youtube_premiere_runtime.test.ts --no-cache --runInBand
```

Expected after implementation: PASS.

- [ ] **Step 4: Commit**

```powershell
git add -- app/youtube_premiere_runtime.ts tests/youtube_premiere_runtime.test.ts
git commit -m "feat: model youtube premiere runtime"
```

## Task 9: Добавить явное локальное напоминание о премьере

**Files:**

- Modify: `app/notifications.ts`
- Create: `app/youtube_premiere_notifications.ts`
- Create: `tests/youtube_premiere_notifications.test.ts`
- Modify: `tests/notifications_triggers.test.ts` если trigger assertions требуют обновления
- Modify: `tests/notifications_prefs_contract.test.ts` если type/master assertions требуют обновления

- [ ] **Step 1: Написать RED-тесты reminder flow**

Проверить:

- permission спрашивается только после tap «Напомнить»;
- master notification toggle выключен → schedule не создаётся;
- >10 минут → trigger на `scheduledStartTime - 10m`;
- 0–10 минут → trigger на точное начало;
- время уже прошло → no schedule;
- повторный tap идемпотентно заменяет прежний id того же videoId;
- перенос премьеры reschedule-ит reminder;
- скрытая/удалённая/completed премьера отменяет reminder;
- tap ведёт в `/lingman_videos?videoId=...&channelId=...`;
- blocked permission возвращает UI state, а Settings открываются только после отдельного подтверждённого действия.

- [ ] **Step 2: Расширить локальный type без новой глобальной категории**

```ts
type LocalNotificationType =
  | /* existing */
  | 'youtube_premiere';
```

Напоминание является явным opt-in для конкретной премьеры и уважает только master toggle. Не включать его автоматически и не добавлять push/server campaign.

- [ ] **Step 3: Реализовать bounded storage**

```ts
type StoredPremiereReminder = {
  videoId: string;
  channelId: string;
  scheduledStartTime: string;
  notificationId: string;
};
```

Максимум 20 активных напоминаний; prune завершённых и старше 30 дней.

- [ ] **Step 4: Добавить deep-link case**

```ts
case 'youtube_premiere':
  scheduleNav(() => router.push({
    pathname: '/lingman_videos',
    params: { videoId: String(data.videoId), channelId: String(data.channelId) },
  } as any));
  break;
```

- [ ] **Step 5: GREEN**

```powershell
npx jest --runTestsByPath tests/youtube_premiere_notifications.test.ts tests/notifications_triggers.test.ts tests/notifications_prefs_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- app/notifications.ts app/youtube_premiere_notifications.ts tests/youtube_premiere_notifications.test.ts tests/notifications_triggers.test.ts tests/notifications_prefs_contract.test.ts
git commit -m "feat: schedule youtube premiere reminders"
```

Не добавлять существующие notification test-файлы, если они не изменялись; если `app/notifications.ts` был dirty в baseline, stage только новые YouTube hunks через `git add -p`.

## Task 10: Построить UI каналов, плейлистов и премьер

**Files:**

- Create: `components/youtube/YoutubeChannelHeader.tsx`
- Create: `components/youtube/YoutubeChannelPickerSheet.tsx`
- Create: `components/youtube/YoutubeChannelTabs.tsx`
- Create: `components/youtube/YoutubePremiereHero.tsx`
- Create: `components/youtube/YoutubePlaylistRow.tsx`
- Create: `components/youtube/YoutubeVideoCard.tsx`
- Create: `app/lingman_playlist.tsx`
- Modify: `app/lingman_videos.tsx`
- Modify: `app/_layout.tsx`
- Create: `tests/lingman_videos_catalog_contract.test.ts`
- Create: `tests/youtube_premiere_motion_contract.test.ts`

- [ ] **Step 1: Написать RED UI contracts**

Требовать testID/accessibility contracts для:

- «Все наши каналы»;
- auto/manual picker;
- tabs `home/playlists/all`;
- upcoming hero + countdown + remind;
- live hero + premium intro + watch CTA;
- playlist row/detail/play-all;
- loading/empty/stale/error/offline;
- trusted external URL и отсутствие autoplay.

- [ ] **Step 2: Подтвердить RED**

```powershell
npx jest --runTestsByPath tests/lingman_videos_catalog_contract.test.ts tests/youtube_premiere_motion_contract.test.ts --no-cache --runInBand
```

Expected: FAIL.

- [ ] **Step 3: Разделить экран на компоненты и сохранить стабильный первый кадр**

`app/lingman_videos.tsx` становится coordinator-ом, а не новым монолитом. Первый render берёт `YoutubeScreenSnapshot`; network revalidation не заменяет экран spinner-ом. Для первой установки зарезервировать точную hero/tab/list geometry skeleton-блоками.

Tabs:

- `Главная`: active/upcoming hero, первые 6 плейлистов, новые видео;
- `Плейлисты`: `FlashList` всех разрешённых плейлистов;
- `Все видео`: `FlashList` до 100 long-form videos;
- канал меняется через sheet; выбор сохраняется.

- [ ] **Step 4: Реализовать playlist detail**

Route:

```tsx
<Stack.Screen name="lingman_playlist" />
```

`Воспроизвести всё` открывает только trusted URL вида `https://www.youtube.com/playlist?list=...`. Отдельное видео открывает существующий `/lingman_video_player`; собственного autoplay/queue нет.

- [ ] **Step 5: Реализовать premium live intro**

Визуальное решение:

- короткое cinematic появление hero 900–1200 ms;
- затем остаётся статичная live-карточка;
- не modal, не блокирует Back, не запускает видео;
- один раз на `videoId`/устройство;
- при reduced motion сразу показывается финальный статичный кадр;
- любые looping glow/ring эффекты запускаются только при `useRuntimeActive()` и `!useReduceMotion()`, останавливаются на blur/background;
- зелёные/lime CTA используют тёмный текст/иконку.

- [ ] **Step 6: Локализация и accessibility**

Использовать `triLang` для всех активных/планируемых языков контракта. Touch targets минимум 44dp; countdown имеет не только визуальную метку, но и accessibility label; состояние live/upcoming не передаётся только цветом.

- [ ] **Step 7: GREEN**

```powershell
npx jest --runTestsByPath tests/lingman_videos_catalog_contract.test.ts tests/youtube_premiere_motion_contract.test.ts tests/lingman_video_open_seen_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add -- components/youtube app/lingman_playlist.tsx app/lingman_videos.tsx app/_layout.tsx tests/lingman_videos_catalog_contract.test.ts tests/youtube_premiere_motion_contract.test.ts
git commit -m "feat: redesign youtube channels and premieres"
```

## Task 11: Соединить миграцию, fallback и end-to-end state transitions

**Files:**

- Modify: `app/lingman_youtube.ts`
- Modify: `app/youtube_catalog_client.ts`
- Modify: `app/lingman_videos.tsx`
- Create: `tests/youtube_catalog_migration.test.ts`
- Create: `tests/youtube_catalog_integration.test.ts`

- [ ] **Step 1: Написать RED migration tests**

Сценарии:

- manifest отсутствует → старый `getActiveYoutubeChannel()` + RSS + pinned работает без изменения UI entry point;
- config bootstrap переносит `youtube_channel_*` и `youtube_pinned_videos` в первый draft, но не удаляет legacy поля;
- manifest malformed/active version incomplete → используется последний local catalog; если его нет — RSS;
- новая версия успешна → приложение переходит на каталог;
- account switch не показывает кэш предыдущего аккаунта;
- канал удалён → manual preference очищается безопасно.

- [ ] **Step 2: Написать RED state-transition integration**

Один deterministic test с fake clock:

1. upcoming + countdown;
2. reminder scheduled;
3. YouTube переносит start → reminder rescheduled;
4. snapshot становится live → intro eligible;
5. intro marked seen → повторный вход статичен;
6. snapshot становится completed → hero исчезает, видео остаётся в ленте;
7. API failure → предыдущая public version остаётся.

- [ ] **Step 3: Реализовать fallback chain**

```text
fresh public version
  → stale local catalog snapshot
  → existing RSS + pinned snapshot
  → built-in PHRASEMAN English fallback
```

Показывать тихую stale/offline метку, не очищать готовый контент и не создавать layout jump.

- [ ] **Step 4: GREEN**

```powershell
npx jest --runTestsByPath tests/youtube_catalog_migration.test.ts tests/youtube_catalog_integration.test.ts tests/lingman_youtube.test.ts tests/lingman_youtube_cache.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- app/lingman_youtube.ts app/youtube_catalog_client.ts app/lingman_videos.tsx tests/youtube_catalog_migration.test.ts tests/youtube_catalog_integration.test.ts
git commit -m "feat: migrate youtube catalog with rss fallback"
```

## Task 12: Финальная верификация и release-ready runbook

**Files:**

- Create: `docs/runbooks/YOUTUBE_CATALOG_ROLLOUT.md`
- Modify: `docs/superpowers/specs/2026-08-08-youtube-multichannel-premieres-design.md` только если реализация выявила подтверждённое отличие

- [ ] **Step 1: Выполнить focused root tests**

```powershell
npx jest --runTestsByPath tests/youtube_catalog_contract.test.ts tests/youtube_catalog_client.test.ts tests/youtube_channel_preference.test.ts tests/youtube_premiere_runtime.test.ts tests/youtube_premiere_notifications.test.ts tests/lingman_videos_catalog_contract.test.ts tests/youtube_premiere_motion_contract.test.ts tests/youtube_catalog_migration.test.ts tests/youtube_catalog_integration.test.ts tests/lingman_youtube.test.ts tests/lingman_youtube_cache.test.ts tests/lingman_video_open_seen_contract.test.ts tests/admin_legacy_youtube_catalog_contract.test.ts tests/admin_single_surface_contract.test.ts tests/admin_hosting_deploy_guard.test.ts tests/firestore_rules_security.test.ts --no-cache --runInBand
```

Expected: PASS, 0 failed.

- [ ] **Step 2: Выполнить focused Functions gates**

```powershell
cd functions
npx jest --runTestsByPath src/youtube_data_api.test.ts src/youtube_catalog_core.test.ts src/youtube_catalog_store.test.ts src/youtube_catalog.test.ts --no-cache --runInBand
npm run test:emulator:youtube-catalog-rules
npm run build
npm run gate:functions-coverage
```

Expected: PASS.

- [ ] **Step 3: Выполнить статические project gates**

```powershell
cd ..
npx tsc --noEmit
npm run audit:no-visible-loading
npm run scan:secrets:staged
node scripts/canonical_workspace_guard.mjs
node scripts/admin_hosting_deploy_guard.mjs
```

Expected: PASS. Если broad typecheck имеет уже существующие unrelated failures, сохранить полный лог в ignored temp, доказать focused typecheck затронутых файлов и явно перечислить baseline failures; не маскировать их и не править чужие области.

- [ ] **Step 4: Визуальная проверка**

Проверить на Android и iOS минимум:

- 375/768 widths или ближайшие реальные устройства;
- light/dark и доступные theme variants;
- reduce motion on/off;
- offline launch из cache;
- upcoming >1h, <1h, <10m;
- live first/second entry;
- blocked notification permission;
- channel picker и playlist detail;
- Back/navigation и отсутствие autoplay.

Записать только короткие результаты и пути к screenshots в runbook; не коммитить тяжёлые временные артефакты.

- [ ] **Step 5: Написать rollout/rollback runbook**

Порядок будущего ручного rollout:

1. создать Firebase Secret `YOUTUBE_DATA_API_KEY` с API restriction YouTube Data API;
2. deploy Firestore Rules;
3. deploy четыре YouTube functions;
4. открыть legacy admin и сохранить migration draft;
5. manual refresh, проверить ready snapshot и quota diagnostics;
6. включить catalog config;
7. выпустить мобильный клиент;
8. наблюдать sync errors/quota/stale versions.

Rollback:

- выключить `youtube_catalog/config.enabled`;
- mobile возвращается к RSS fallback;
- при плохой версии переключить `public.activeVersion` через проверенную server-side rollback-команду/скрипт, а не клиентскую запись;
- не удалять legacy remote-config поля в первой версии.

- [ ] **Step 6: Проверить отсутствие утечек и запрещённых изменений**

```powershell
rg -n "YOUTUBE_DATA_API_KEY|AIza" app components shared admin firestore.rules
git diff -- functions/src/callable_options.ts admin/v2/index.html admin/legacy.html
git diff --cached --name-only
```

Expected:

- secret name может встречаться только в server code/docs, значение ключа нигде не находится;
- в коммитах этой функции среди admin-файлов присутствует только `admin/v2/legacy.html`;
- App Check contract, Admin 2 shell и dead legacy copy не получили новых hunks этой задачи; их существующие пользовательские изменения, если были в baseline, не staging-ились.

- [ ] **Step 7: Финальный review изменённых файлов и Commit**

```powershell
git add -- docs/runbooks/YOUTUBE_CATALOG_ROLLOUT.md
git diff --cached --check
git diff --cached --name-only
git commit -m "docs: add youtube catalog rollout runbook"
```

## Итоговые критерии приёмки

- Язык приложения автоматически выбирает основной канал; manual selection сохраняется и сбрасывается в auto.
- «Все наши каналы» заменяет старую одиночную внешнюю плашку.
- У каждого канала есть «Главная», «Плейлисты», «Все видео» и отдельный playlist detail.
- Upcoming-премьера имеет явную метку, локализованный countdown и opt-in reminder.
- Live-премьера получает premium intro один раз на `videoId`, без autoplay и с reduced-motion fallback.
- Completed-премьера становится обычным видео.
- YouTube API key отсутствует в app/admin/public Firestore.
- Частичная/ошибочная sync не переключает public snapshot и не очищает старый каталог.
- RSS + pinned остаются rollback fallback.
- Рабочая админка — только `admin/v2/legacy.html`; забракованный Admin 2 не изменён.
- Focused tests, Functions build/coverage, Rules emulator и project guards проходят.

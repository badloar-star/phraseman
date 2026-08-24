# Project Rules

## ⛔ LEARNING V2: СНАЧАЛА `СТАРТ В2` (владелец, 2026-08-21)

При любом запросе найти, продолжить, написать, изменить, проверить или показать
работу по Learning V2 исполнитель обязан **до любых действий** полностью
прочитать `docs/v2/СТАРТ В2.md` и пройти указанный там маршрут чтения. Этот файл
фиксирует обязательные правила интро, типов сессий и заданий, восьми локалей,
диагностических дистракторов, feedback, owner-макета, gates и защиты от ухода от
спецификации.

Во время authoring каждые 10 минут или после каждой готовой сессии (что раньше)
выполняется короткий drift-check. После каждых пяти сессий, любой новой ошибки,
решения владельца, compaction, restart или handoff полностью перечитывается
применимый набор документов из `СТАРТ В2`. Без `ON TRACK` работа не
продолжается; drift-check не является PASS и не заменяет независимое review.

## ⛔ LEARNING V2 ИСПАНСКИЙ: СНАЧАЛА `СТАРТ ES` (владелец, 2026-08-23)

Испанский — независимый, параллельный target-language контур Learning V2. При
любом запросе найти, продолжить, написать, изменить, проверить или показать
работу по испанскому курсу исполнитель обязан **до любых действий** полностью
прочитать `docs/v2/СТАРТ ES.md` и пройти указанный там маршрут чтения (который
сам ссылается на общую дисциплину `docs/v2/СТАРТ В2.md`, не дублируя её).

Испанская и английская сессии могут работать одновременно в одном рабочем
дереве. Испанская сессия никогда не редактирует файлы, чьё имя начинается с
`episode_01_`, и никогда не редактирует английский экспорт
`LESSON1_AUTHORING_REGISTRY_V1` — только `authoringRegistryForTargetLanguage
("es")` и файлы своего собственного контура. Машинная проверка:
`npm run learning-v2:es-authoring-preflight` для испанского,
`npm run learning-v2:lesson1-authoring-preflight` для английского — команды
не пересекаются и не влияют друг на друга.

## ⛔ Economy Constitution — client authority, no orphan debits (owner, 2026-08-13)

This is a permanent architecture boundary for every current and future economy
feature.

- Personal progress and ordinary pearl spending are client-authoritative.
- The server may persist the append-only client operation journal, but it must
  never reject an ordinary client operation because of its own balance view,
  recalculate the client result, lower the client balance, or revoke an already
  granted result.
- A debit is legal only as one durable composite operation containing its exact
  grant/entitlement. Standalone `debit`, `spendShards`, `FieldValue.increment(-N)`
  or "spend first, grant later" flows are forbidden.
- Every operation has one stable idempotency key. A retry returns/replays the
  same receipt and cannot charge twice.
- Balance is a projection of immutable operations. A timestamp/LWW snapshot is
  never allowed to overwrite a newer local operation.
- Network failure affects synchronization only. It must not roll back a
  committed local result or turn it into a user-visible loss.
- Real-money purchases/refunds, transfers between people, marketplace
  settlements, admin commands and competitive outcomes are isolated external
  confirmed events. They may be verified by the server, but still must be
  immutable/idempotent and atomically bind every debit to its transfer,
  entitlement or result.
- Direct writes to `users/{uid}.shards` are forbidden everywhere, including
  Arena and Tournament. External adapters must append an immutable economy
  event and must never introduce a personal-balance writer or derive an event
  amount from that legacy field.
- Any economy schema/collection/field change must update Firestore Rules and
  the Jarvis data-contract audit in the same change, following the Jarvis rule
  below.

The canonical detailed contract is `docs/economy/ECONOMY_CONSTITUTION.md`.
Contract tests must fail when a new standalone debit, direct balance writer or
server-authoritative ordinary-spend path appears. Fix the implementation; never
weaken or delete the guard to make CI green.

## ⛔ АРЕНА: НЕ ОТКАТЫВАТЬ

Файлы Арены (`modules/arena/**`, `components/arena/**`, `app/arena*`,
`functions/src/arena_*`, `tests/arena_*`, `docs/arena/**`,
`components/tournament/TournamentBackdrop.tsx`) переписываются по прямому
заданию владельца. Их **нельзя** откатывать (`git revert`, `git checkout`
чужой версии) и нельзя перезаписывать из своего буфера. Работа уже дважды
терялась именно так. Подробности и порядок восстановления — в
`____АРЕНА_НЕ_ОТКАТЫВАТЬ____.md` в корне.


## ⛔ ЛИГИ: ПОНИЖЕНИЕ ОБЯЗАНО РАБОТАТЬ (владелец, 2026-08-17)

Итоги недели считаются в ДВУХ зеркальных местах — `app/league_engine.ts`
(`calculateResult`) и `functions/src/league_finalize_cron.ts`
(`computeGroupResults`). **Правишь одно — правь второе в том же коммите**: иначе
модалка покажет один исход, а авторитетный крон запишет другой.

Инцидент: понижение не работало НИ У КОГО. В комнате играют 3-5 человек, а хвост
(неактивные + жители `res_*`) имеет РОВНО 0 очков. Competition ranking считает
«строго выше/строго ниже», поэтому у игрока с нулём строго ниже нет никого
(`bottomRank=1`), а строго выше — только играющие (`myRank=4` при зоне 4): он
попадал в зону ПОВЫШЕНИЯ, и ветка `&& !promoted` гасила понижение. Владелец видел
«27 место из 29 — Остаёшься в лиге».

Правило владельца: (1) повышение требует хотя бы одного набранного очка;
(2) понижаются нижние 15% **и все с нулём очков**; (3) комната, где не играл
никто, никого не понижает. Ключевые имена: `iScored`/`inZeroZone`/`someoneScored`
(клиент), `scored`/`inZeroZone`/`hasAnyScorer` (сервер).

Сторож `scripts/guard_league_demotion.mjs` (pre-commit) блокирует правку, которая
их убирает. Сработал — чинить логику, а не обходить. Обычные тесты лиг этот класс
бага НЕ ловят: они работают на комнатах с уникальными очками и остаются зелёными
при полностью мёртвом понижении. Регрессии:
`tests/league_zero_points_demotion.test.ts` и
`functions/src/league_finalize_zero_points.test.ts`.

Флаг `league_xp_promotion_enabled` by design отключает понижение целиком — это не
регрессия, не «чинить» без слова владельца. Подробности:
`____ЛИГИ_ПОНИЖЕНИЕ_НЕ_ЛОМАТЬ____.md`.


## ⛔ ЛИГИ: КЭШ 6 ЧАСОВ, ТОЛЬКО ПРИ ЗАХОДЕ НА ЭКРАН (владелец, 2026-08-17)

Чужие цифры в таблице лиги обновляются **не чаще раза в 6 часов** и **только при
заходе на экран клуба**. Фоновых таймеров быть не должно. Свои очки живые — они
читаются локально (`withMyLivePoints` в `app/league_open_cache_policy.ts`,
0 чтений Firestore), поэтому редкий сетевой рефреш экран не «убивает».

Инцидент: снапшот-коммит `e7eb7d316` («preserve complete project snapshot»)
сломал правило дважды одной правкой — занизил `CLUB_REMOTE_REFRESH_MS` с 6 часов
до 45 секунд (константа служит И TTL кэша в `shouldRefreshRemote`, И периодом
таймера) и добавил `setInterval`, зовущий `loadData({ forceRemote: true })`, а
`forceRemote` явно обнуляет TTL и сбрасывает кэш группы. Открытый экран клуба
перечитывал Firestore каждые 45 секунд: 14 чтений за 10 минут вместо одного.

Правила: `forceRemote: true` допустим ТОЛЬКО в pull-to-refresh (`onLeagueRefresh`
— осознанный жест пользователя). Смена ISO-недели обходит троттл намеренно
(`weekChanged`), иначе теряется модалка итогов — это не баг. Живая подписка на
буст/лайки оставлена сознательно.

Сторож `scripts/guard_league_refresh_ttl.mjs` (pre-commit) проверяет три вещи:
TTL ≥ 6 часов, отсутствие `setInterval` рядом с `loadData`, не более одного
`forceRemote: true`. Сработал — вернуть правило, а не удалять проверку.
Подробности: `____ЛИГИ_КЭШ_6_ЧАСОВ_НЕ_ЛОМАТЬ____.md`.


## Workspace And Branch Safety

- The owner cancelled the obsolete fixed Windows checkout and fixed release-branch restriction on 2026-08-10.
- Commands must run from the root of the checkout that contains this `AGENTS.md`; no operating-system-specific absolute path or branch name is required.
- The currently checked-out branch is valid for implementation, builds, tests, Metro, and emulators.
- Never create a branch, Git worktree, separate checkout, forked coding task, or delegated coding session without an explicit owner request to create that exact branch/worktree/task.
- Existing historical branches and worktrees must not be deleted unless the owner explicitly requests that exact action.

## 🤖 Джарвис обязан оставаться актуальным (владелец, 2026-08-02)

Джарвис (`functions/src/jarvis/`) читает чужие коллекции и поля, но не участвует
в их изменении. Переименовали поле — департамент **не упадёт**, он вернёт нули и
будет бодро врать, что всё хорошо. Молчаливая ложь опаснее явной поломки: её
никто не заметит, пока не потеряются деньги или жалоба ребёнка не останется без
разбора.

Поэтому при ЛЮБОМ изменении контента, схемы данных, коллекций или полей —
**в том же ходу**, не дожидаясь напоминания владельца:

1. Проверь, читает ли это Джарвис: `functions/src/jarvis/*_firestore_fetcher.ts`.
2. Читает — обнови читатель под новую схему.
3. Обнови таблицу контракта в `functions/src/jarvis/jarvis_data_contract_guard.test.ts`.
4. Новый департамент → подключи в `all_departments_snapshot.ts` (поле обязательное,
   забыть нельзя) **и** добавь в `JF_DEPARTMENT_META` в `admin/v2/legacy.html`.
5. Новая коллекция → закрой правилом в `firestore.rules`.

Страж `jarvis_data_contract_guard.test.ts` ломает сборку при расхождении.
Обычные тесты департаментов это НЕ ловят — они на моках и остаются зелёными.
Сломался страж — чини контракт, не удаляй проверку.

## ⛔ ЕДИНСТВЕННАЯ РАБОЧАЯ АДМИНКА — `admin/v2/legacy.html` (КРИТИЧНО, читать первым)

Владелец пользуется ОДНОЙ админкой:
**https://phraseman-ea0b3.web.app/legacy.html#control-panel**

Её исходник — **`admin/v2/legacy.html`** и ТОЛЬКО он. Проверено побайтово (md5 живой
страницы == md5 этого файла). Firebase Hosting target `admin` публикует папку
`admin/v2` (`firebase.json` → `"public": "admin/v2"`), поэтому любая правка вне этой
папки на боевую НЕ попадает.

**ВСЁ пишем сюда:** новые разделы, генераторы, кнопки, callable-вызовы, фиксы.
Ни в какой другой файл админки писать НЕЛЬЗЯ.

> ⚠️ Имя папки `v2` историческое и вводит в заблуждение: внутри лежит привычная
> тёмная «старая» админка (`legacy.html`), а не какая-то новая. Не переименовывать
> без отдельного решения владельца — сломается hosting target.

### Заморожённые файлы админки (НЕ ТРОГАТЬ, только чтение)

| Файл | Что это | Статус |
|---|---|---|
| `admin/legacy.html` | отставшая копия рабочей админки | 🧊 ЗАМОРОЖЕН, к удалению |
| `admin/index.html` | редирект-заглушка на `/legacy.html` | 🧊 не редактировать |
| `admin/full.html`, `admin/site.html` | исторические огрызки | 🧊 не редактировать |
| `admin/v2/index.html` + белые V2-модули/стили/vendor | удалённая белая панель | ⛔ УДАЛЕНА НАВСЕГДА, НЕ ВОССТАНАВЛИВАТЬ |

Корень admin Hosting (`/`, `/index.html`, включая старые hash-маршруты
`#overview` и `#english-test`) обязан постоянным redirect вести на
`/legacy.html`. В `admin/v2/scripts/` разрешены только скрипты, которые прямо
подключены из `admin/v2/legacy.html`; удалённый V2-router/core/UI нельзя
восстанавливать ни из Git-истории, ни из старых тестов или генераторов.
Точное решение и список удалённых поверхностей зафиксированы в
`docs/admin/WHITE_ADMIN_V2_RETIRED.md`.

Признак ошибки: если правка админки НЕ находится в `admin/v2/legacy.html` — она
почти наверняка уезжает в мёртвый файл. Остановись и проверь путь.

Контракт защищён тестом `tests/admin_single_surface_contract.test.ts`.

## ⛔ App Check для админки — НЕ ВКЛЮЧАТЬ БЕЗ СЛОВА ВЛАДЕЛЬЦА (2026-08-03, КРИТИЧНО)

**Требование владельца: НИКОГДА не включать App Check на админских функциях, пока
владелец САМ ЯВНО этого не потребует.** Не «заодно», не «для безопасности», не «раз уж
чиню рядом». Только прямое распоряжение.

Что именно запрещено (любой пункт = нарушение требования):

- вернуть `enforceAppCheck: true` в `ADMIN_SENSITIVE_WRITE_OPTIONS`
  (`functions/src/callable_options.ts`);
- выставить env-переменную `ENFORCE_APP_CHECK_ADMIN=true`;
- рассчитывать `ENFORCE_APP_CHECK_ADMIN` через `appCheckGroup()` — он наследует
  глобальный `ENFORCE_APP_CHECK`, и общий раскат снова убьёт админку;
- убрать флаговый ранний `return` из `requireAdminAppCheck()`.

**История (почему правило жёсткое).** 2026-08-01 коммитом `58023df0f` в опции
захардкодили `enforceAppCheck: true`, а в `admin/v2/legacy.html` вписали reCAPTCHA
Enterprise site key `6LfteFAt...`. Но шаг 1 из
`docs/reports/APP_CHECK_ENABLEMENT_PLAN_2026-06-13.md` (создать ключ в Firebase Console —
ручное действие) выполнен НЕ был. Google этот ключ не признаёт: живая проверка на
проде возвращает `Invalid site key or not loaded in api.js`. Значит админка физически
не может получить App Check-токен, а сервер его требовал → Firebase рубил **все ~30
админских функций** (выдача Plus, бан, удаление, награды, лиги, рефералы, конфиги)
кодом `unauthenticated` ещё до входа в тело функции. Владелец двое суток не мог выдать
Plus. Симптом в UI: «Plus не выдан: Unauthenticated».

**Защита не падает.** Каждая админская функция отдельно требует custom claim
`admin: true` в Firebase Auth токене (см. `actor()` в
`functions/src/admin_access_controls.ts`) — без него вызов отклоняется
`permission-denied`. App Check был вторым слоем против ботов, а не основным замком.

**Когда владелец разрешит включить** — порядок обязателен: (1) создать настоящий
reCAPTCHA Enterprise-ключ в Google Cloud и зарегистрировать веб-приложение в Firebase
App Check; (2) прописать ключ в `admin/v2/legacy.html`; (3) убедиться в браузере, что
`grecaptcha.enterprise.execute()` возвращает токен без ошибки; (4) только потом
`ENFORCE_APP_CHECK_ADMIN=true`.

Сторож: `functions/src/admin_sensitive_writes.test.ts` — краснеет при хардкоде энфорса
и при наследовании глобального флага.

## Admin UI Bible

- Before changing `admin/v2/legacy.html`, admin navigation, admin controls, banners, update modals, remote-config panels, or any new admin screen, read `docs/design/ADMIN_UI_BIBLE.md` first and follow it as the source of truth.
- Admin UI must stay simple, categorized, icon-supported, tooltip-rich, accessible, and free of visual clutter. Do not add admin buttons, colors, overlays, menus, or text patterns that violate the Bible.

## Error Report Reply Preview Publishing

- After preparing and dry-running a valid `replies.json`, immediately and idempotently add those drafts to `PREPARED_REPORT_REPLIES` in `admin/v2/legacy.html` (the single live admin surface — see the boundary rule at the top), run the focused preview contracts, and deploy only Firebase Hosting target `admin` via `npm run hosting:admin`. Do not ask for another confirmation before publishing this preview.
- Preview publishing is static hosting only: it must not write Firestore, send user notifications, change report status, or award shards.
- Live delivery remains exclusively manual: only the administrator presses `Отправить готовые ответы` in the admin UI. Codex must never run `reply_to_reports.mjs --send` as part of this workflow.
- Preserve existing prepared drafts and unrelated user changes. Re-running the workflow must replace or skip the same `reportId`, never create duplicate preview entries.

## MAYMAY — CapCut phrase/TTS pipeline

- If the user mentions **"MAYMAY"**, "меймей", "найди пайплайн меймей", or asks for a new MAYMAY video/package,
  read `content/MAYMAY.md` FIRST and follow its step-by-step instructions exactly.
- MAYMAY builds 30 short English-learning CapCut videos from 30 sets of 20 phrase/preposition/phrasal-verb items,
  generates OpenAI TTS audio, and produces ready CapCut JSON while preserving all template timing, positions, styles,
  and element counts except the explicitly replaced audio/text.

## MASON — content scriptwriter pipeline

- If the user mentions **"MASON"**, "мейсон", "подними мейсон", or "пишем новый ролик", load the
  content pipeline: read `content/MASON.md` FIRST and follow its step-by-step instructions exactly.
- MASON writes ready-to-voice short-video scripts (RU, Clarkson's-Farm style) about building Phraseman.
  All its state lives in `content/` (MASON.md, DOSSIER.md, CLARKSON_STYLE.md, scripts/). It is
  self-contained — any AI in any session continues from those files.

## BUYER RADAR — revenue article/carousel pipeline

- If the user mentions **"BUYER RADAR"**, "баер радар", "buyer radar", buyer-search content, revenue carousels,
  or asks for Phraseman buyer-finding articles/carousels, read `docs/pipelines/buyer-radar-revenue-intelligence-pipeline.ru.md`
  and `docs/pipelines/buyer-radar-editorial-bible.ru.md` FIRST.
- All BUYER RADAR articles and carousels must follow the editorial bible: first slide instantly signals language learning,
  every slide advances a research-backed contradiction, and the last slide uses a closing contradiction plus
  "Ссылка на приложение Phraseman — в био."

## UI Contrast Rule

- On lime/salad/neon-green filled surfaces such as `t.accent`, `t.correct`, bright green badges, pills, and CTA buttons, use dark/black foreground (`t.correctText`, `#07110A`, or similarly dark text/icons), never white.
- Future UI generation must preserve this contrast rule across screenshots, badges, CTAs, tabs, paywalls, generated components, and design fixes unless the green surface is deliberately darkened enough for white to pass contrast.

## Session Performance And Context Budget

- Keep every session lean. Do not bulk-read, summarize, index, or paste large directory trees unless the current user request explicitly needs them.
- Treat generated output, runtime state, screenshots, image/audio/video assets, archives, caches, logs, native build output, package manager output, and previous agent/session state as out of context by default.
- Before using broad file discovery, prefer targeted `rg` searches with globs that exclude heavy areas such as `node_modules/`, `.git/`, `.codex*/`, `.claude*/`, `.superpowers/`, `.artifacts/`, `.logs/`, `docs/reports/`, `maestro-results/`, `assets/images/`, `admin/avatars/`, `android/.gradle/`, `android/app/build/`, `dist/`, `builds/`, `exports/`, `lingman-*`, and `subscription-recovery/`.
- Do not run broad Jest suites, whole-project typechecks, global asset scans, or recursive report generation as an automatic session habit. Run only the narrow verification needed for the active task unless the user explicitly asks for a broad gate.
- **СВЕТОФОР тяжёлых проверок (владелец, 2026-08-23) — ОБЯЗАТЕЛЕН.** На репозитории одновременно работает 10+ сессий Claude/Codex. Полный `tsc --noEmit` держит 4–8 ГБ, `ts-jest` — 2–3 ГБ на процесс; 23.08.2026 машина вылетела при 39 процессах node. Перед любой тяжёлой командой (`tsc`, `jest`, сборка, массовый скан) возьми слот и обязательно верни его:
  ```
  bash .claude/semaphore/slot.sh acquire "tsc (проверка типов)"
  bash .claude/semaphore/slot.sh release
  ```
  Слотов три — больше машина не тянет; захват атомарный (`mkdir`), протухшие слоты снимаются через 15 минут. Хук `heavy-process-traffic-light.js` блокирует тяжёлую команду без слота. Нет свободного слота — это НЕ повод обойти светофор: сузь объём проверки или подожди. Не заводи параллельных «своих» замков — светофор один на весь репозиторий.
- Do not start background workers, MCP servers, swarm/agent daemons, memory sync jobs, Telegram relays, auto-installers, or hook-based automation during normal sessions. Start them only for a request that explicitly needs that service, then stop them before finishing.
- Compact regularly in long sessions. If the active conversation becomes large, after major milestones, after broad logs/test output, or before starting a new unrelated task, compact/summarize the session and continue from the compacted state.
- Never keep huge command output in the active response context. Summarize the important lines and write bulky logs only to ignored temp/report directories.
- When the user reports slowness, first check active processes, Codex/VS Code log database size, hook configuration, and temp/plugin caches before touching app functionality.

## Codex Bulk Image Safety

- Do not run large DALL-E/image-generation batches through Codex's in-thread image generation because every base64 image result is stored in `.codex/sessions/*.jsonl` and can crash Codex with `RangeError: Invalid string length`.
- For collection cards, thumbnails, captions, or other bulk visual generation, use a file-based script/API pipeline that writes images, prompts, captions, manifests, and checkpoints to ignored folders such as `.codex-tmp/`, `output/`, `qa-artifacts/`, or the intended asset directory.
- Wrap long-running generators with `node scripts/codex-safe-run.mjs -- <command>` so stdout/stderr go to log files and Codex receives only short progress summaries.
- When extracting images already generated inside Codex, use `node scripts/export-codex-dalli-results.mjs --rollout <path> --summary`; the full record report must stay in `.codex-tmp/collectibles-dalli/reports/`, not in stdout.
- Before continuing a session that already generated many images, export the existing `image_generation_end` results, confirm the exported files/checkpoints, then continue in a fresh or compacted session. Preserve the original rollout file until the export has been verified.

## Codex OpenAI API Firewall

- Codex sessions must not use any project-supplied or user-billed OpenAI API key for local chat, responses, reviews, research, judging, phrase/content generation, image generation, transcription, embeddings, experiments, or batch analysis.
- Built-in Codex product capabilities that do not read or spend a project/user API credential are explicitly allowed. This includes image generation through Codex's built-in `image_gen`/DALL-E capability. Built-in image generation must still follow the `Codex Bulk Image Safety` rules above.
- The only OpenAI API use allowed from Codex is TTS/voiceover generation through `/v1/audio/speech`, and only after an explicit user request for audio plus the existing spend guard (`PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1`) and a narrow batch plan.
- Local Codex TTS scripts must read `OPENAI_TTS_API_KEY`, not the generic `OPENAI_API_KEY`. Do not add `OPENAI_API_KEY` back to `.env.local` for Codex convenience.
- Production/user Phraseman sessions may continue to use Firebase/Cloud Functions secrets such as `OPENAI_API_KEY`; this firewall is for local Codex/dev sessions and scripts.
- If a task would require a project/user OpenAI API credential for chat, responses, images, or transcription, stop and report that the project firewall forbids that API spend. Do not block an equivalent built-in Codex capability that uses no project/user API credential.

## New Theme / Per-Theme Asset Hygiene

- When adding a new theme (e.g. `business`) or generating per-theme art, an asset is allowed to exist in `assets/images/**` only if it is wired into a static `require()` in app source (theme→asset maps such as `app/home_menu_icons.ts`, `app/quizzes/medal_assets.ts`, per-feature visual maps, etc.). Generating a `*-<theme>.webp` (or a `assets/images/<feature>/<theme>/*` file) that no `require()` references is wasted bundle weight — do not do it.
- Wire first, generate second: before generating a theme's asset set, confirm each target slot has a `require()` line (or add the lines in the same change). Every generated file must map 1:1 to a slot the running app actually loads. Do not generate "extra" variants (alternate crops, unused sizes, speculative future slots) into the bundled `assets/images/**` tree.
- Match the existing theme's slot list exactly. A new theme must produce the SAME set of asset keys as the established themes for that feature — no more (extra files bloat the bundle), no fewer (missing files crash at runtime). If a slot does not apply, leave the map fallback, don't ship a dead file.
- Keep raw generation sources OUT of the bundled set. DALL-E originals / contact sheets / intermediate crops go in `*sources*`, `dalle_sources`, `singles`, `output/`, or `qa-artifacts/` — never loose in `assets/images/<feature>/` where they look bundled. Only the final, wired, compressed webp belongs there.
- Compress every new bundled image before committing (webp, quality ~58–80 via `sharp`, alpha preserved). Do not commit a freshly generated png/webp at generator-default quality.
- Periodic audit: an image in `assets/images/**` (excluding raw/source dirs) whose path-tail or basename appears in NO source file under `app/components/constants/hooks/contexts/lib/modules` is unused and may be removed. Verify with a literal basename search across those dirs (the project uses ONLY static `require()` path strings — no dynamic/template asset requires — so a path/basename-presence check is reliable). Always confirm zero references and back up before deleting.

## Do Not Delete Functionality Without Explicit Request

- Never remove, disable, hide, bypass, or replace an existing feature, screen, button, flow, state, storage key, API contract, asset mapping, test coverage, or user-visible behavior as a side effect of fixing another issue.
- A request to "fix", "repair", "adjust", "make it work", "improve", "refactor", or "clean up" is not permission to delete functionality.
- Deletion is allowed only when the user explicitly names the exact thing to delete or remove, for example: "delete the Premium text on the VIP card" or "remove this button".
- If a fix seems easier by removing functionality, keep the functionality and fix the broken behavior instead.
- If two existing features conflict and one appears impossible to preserve, stop and report the conflict before editing. Do not choose a deletion yourself.
- When editing shared UI, image/icon systems, navigation, localization, purchases, account deletion, gifts, stats, league, chat, lessons, or onboarding, preserve existing capabilities unless the current user request explicitly says to remove a specific capability.

## Auth Identity And Account Deletion Invariants

- Before changing auth/account flows, read this section. It applies to `app/auth_provider.ts`, `app/cloud_sync.ts`, `functions/src/auth_identity.ts`, `functions/src/account_delete.ts`, `firestore.rules`, auth modals, and their tests.
- Provider sign-in must not use a client Firestore transaction to create/update `users/*` or `auth_links/*`. Stable-link writes and repair belong on server callables. A return of `transaction_[firestore/permission-denied]` from `signInWithProvider` is a regression.
- `auth_links/{providerUid}` is the provider identity anchor. If server/callable discovers an existing provider-linked `stableUid`, it wins over the local anonymous `stable_id`; do not silently create a new account from an unverified Firestore fallback.
- `deleteAccountAndWipe()` intentionally starts `deleteCloudData()` in the background, then signs out, wipes local account data, clears `stable_id`, and writes the local `account_delete_pending_auth_v1` guard. Do not make account deletion wait synchronously on the cloud delete before local exit.
- Account deletion is split in two phases and **the UI must only ever await the fast one**. `beginAccountDeletion()` returns as soon as `prepareAccountDeletion()` has written the `account_delete_pending_auth_v1` guard (point of no return: the old email / Apple ID can no longer sign back in); everything network-bound — enqueue acknowledgement, transition drains, `signOutCurrentProvider()`, `ensureAnonUser()` — runs in the returned `completion` promise. `DeleteAccountConfirmModal` awaits `beginAccountDeletion()`, never `deleteAccountAndWipe()`; making it await the full flow reintroduces the shipped freeze where Settings locked up for tens of seconds on a slow network.
- The success path must NOT restart the app (`expo-updates` `reloadAsync` / `DevSettings.reload`) and must NOT present a second native `<Modal>`. `emitAppEvent('account_deleted')` already mounts a clean onboarding in-place; confirmation is a 3s in-onboarding pill (`components/AccountDeletedNotice.tsx`, flagged via `app/account_deleted_notice.ts`), because presenting an alert during the delete modal's dismiss breaks the iOS presentation stack.
- If the background phase dies (no network, app killed), `resumePendingAccountDeleteLocalExit()` finishes it on the next launch — that is why the guard is written before, not after, the network work.
- `signInWithProvider()` must check `readAccountDeletePendingAuth(firebaseProviderUid)` immediately after `signInWithCredential` and before reading/writing `auth_links`. If the same provider UID is still pending deletion, it must `signOutCurrentProvider()`, best-effort `ensureAnonUser()`, and return `account_delete_pending` without writing Critical App Health.
- Account switch/reset flows must use `signOutAndWipeForAccountSwitch()` rather than composing `signOutCurrentProvider()`, `clearStableId()`, and `ensureAnonUser()` manually; otherwise old account data can leak into a new account.
- When touching this area, run the narrow guards: `tests/auth_provider_stable_link.test.ts`, `tests/account_delete_flow_contract.test.ts`, `tests/firestore_rules_security.test.ts`, `tests/stable_id.test.ts`, and `tests/auth_identity_anon_relink.test.ts`.

## Motion Hybrid — правила-дефолты для ЛЮБОЙ новой поверхности (владелец, 2026-08-16)

Направление движения утверждено: **«Световод + Чекан»** — база из света и глубины
(без отскока), удар и вес — только у героя кульминации наград. Это стандарт для всех
новых модалок, тостов, шитов, баннеров, празднований и кнопок; правила сторожит
`tests/motion_hybrid_contract.test.ts` (baseline `config/motion-hybrid-baseline.json`
может только уменьшаться).

1. **Числа движения — только из `constants/motionHybrid.ts`** (LUM/CHK/PRESS/SUITE/
   TOAST/TABBAR_HYBRID). Магические пружины и тайминги в компонентах запрещены.
2. **Новая модалка/шит/тост** — через общие шеллы `components/modal_fx/HybridAlertShell`,
   `HybridSheetShell`, `components/feedback/FullscreenHybridEntrance` или с prop
   `motionVariant` (существующие поверхности: `'classic'` по умолчанию, `'hybrid'` —
   редизайн; переключение по умолчанию — только словом владельца).
3. **Кульминация награды** — один удар героя через `components/celebration/RewardImpactRings`
   + `use_reward_impact_hybrid` (squash 260/5, отдача 6px 180/6, ≤12 частиц, на
   `isLowEndDevice` → 0). Свита — settle 150/22, без отскока. Лестницы каскада
   неравномерные. Выход короче входа (`LUM.exitMs`).
4. **Кнопки — только клавиши.** Главные CTA — `components/DuoPressable` с кромкой
   (`edgeHeight` 4–6: лицо едет вниз на высоту кромки, подошва стоит; хаптика встроена).
   Вторичные/иконки/чипы/карточки — `components/PressableHybrid` (variant). Голые
   `Pressable`/`TouchableOpacity` с `opacity: pressed` у действий — брак.
5. **Никаких эмодзи в UI** (в т.ч. префиксы внутри переведённых строк) — только Ionicons
   и иконки проекта. Никаких `borderWidth`/`borderColor` у контейнеров (односторонний
   разделитель допустим). Никаких подписей-расшифровок мелким шрифтом. `fontWeight` только
   `'400'`/`'700'`. Цвета — только токены темы `t.*`.
6. **Reduce Motion = один финальный кадр**, `cancelAnimation` на unmount, только
   transform/opacity, циклы под гардом фокуса/AppState; счётчики —
   `AnimatedTextInput` + `useAnimatedProps`.
7. **Витрина** DEV Hub «Движение · все поверхности» (`/motion_showcase`): каждая новая
   поверхность добавляется пунктом в свой шард `components/dev/motion_showcase/sections/*`
   (реальный компонент с безопасными демо-пропсами: пустые колбэки, ничего не
   начислять; подписи через `cs()` из `showcase_copy.ts`).

## Коллекции: категория не пишется при получении (владелец, 2026-08-17)

Название сета коллекционных карточек (`titleRu` в `app/collectibles/catalog_data.ts`,
например «Животные», «Природа и сад») **не выводится в UI в момент получения карточки**
— ни в классической, ни в гибридной ветке. Показываем название карточки, редкость,
картинку и кнопки; сет/категорию — нет. Правило общее для ВСЕХ коллекций, не только
одной. Словарь переводов (`triLang`) не трогаем — просто не рендерим строку.

Просмотр коллекции (галерея) — другое: там название сета остаётся, это не момент
получения. Соблюдено:
- `components/CollectibleDropModal.tsx` — убран `setName`/`setTitle` (обе ветки,
  `motionVariant: 'classic'` и `'hybrid'`), заодно удалены ставшие мёртвыми
  `findCollectibleSet`/`collectibleSetTitleForLang`/`set`/`setTitle` и стиль `setName`.
- `app/collectibles_screen.tsx` — это галерея (просмотр), название сета там
  умышленно остаётся.

## Tests Are Read-Only Guards

- Tests must report failures; they must not rewrite app source, tests, configs, assets, generated source, storage contracts, or snapshots as part of a normal test run.
- A passing test run is not permission to auto-apply the state captured by that test. If a test finds drift, report the drift and let the user decide what to change.
- Do not run snapshot update, fixture update, codemod, generator, repair, migration, or "fix" scripts from a test unless their writes are confined to an ignored temp/report directory such as `.codex-tmp/`, `tmp/`, `coverage/`, `.artifacts/`, `.logs/`, `docs/reports/`, `docs/gustav/runs/`, `maestro-results/`, or `qa-artifacts/`.
- If a test needs a fixture, create it in a temp/report directory during the test. Never write fixture state into `app/`, `components/`, `constants/`, `hooks/`, `assets/`, `scripts/`, `tools/`, `functions/`, `tests/`, or root config files.
- If a generator or repair script must update source, it must be a separate explicit command, not part of `npm test`; default to dry-run/report mode and require a clear user request before applying changes.
- Root and Functions Jest use `tests/setup_jest_write_guard.js` to block accidental source writes, including inherited Node child processes. Only bypass it for intentional maintenance with `PHRASEMAN_ALLOW_SOURCE_WRITES=1`, and state that explicitly.

## CapCut Draft Safety Protocol

- Before any read/write repair, generation, or timeline mutation of a native CapCut draft, check for running `CapCut` processes.
- If CapCut is open and the task requires draft file edits, close CapCut yourself before writing. First try a normal close through the main window, wait for autosave to settle, then terminate remaining `CapCut` helper processes only if they do not exit.
- Never edit `draft_content.json`, `template-2.tmp`, `draft_meta_info.json`, `draft_biz_config.json`, `timeline_layout.json`, `Timelines/*/draft_content.json`, or CapCut resource mappings while any `CapCut` process is still running.
- After CapCut is fully closed, create a timestamped backup of the current project folder or every file that will be changed before making edits.
- After edits, mirror native draft changes consistently across root draft files and `Timelines/<draft-id>/draft_content.json`, then run structural gates before reopening or reporting completion.
- Do not leave the user responsible for closing CapCut unless the close operation fails or the user explicitly asks to keep it open.

## CapCut Russian Text Wrapping Invariant

- CapCut must never be trusted to wrap Russian (Cyrillic) on-screen text automatically: it may split a word in the middle.
- Before any Russian text is inserted or replaced in a CapCut draft, add explicit manual line breaks at spaces or clear phrase boundaries so every rendered line fits its text box. Never insert a break inside a word.
- Balance those manual lines: prefer meaningful two- or three-word groups and avoid a final one-word column whenever it can be joined to the preceding line without exceeding the safe width. A safe break must not become visually unnatural merely to avoid CapCut auto-wrap.
- Verify every affected Russian text element after the draft change (structurally and, when possible, in CapCut preview). If a line still cannot fit, shorten or rephrase it only with the user's authorization; do not permit mid-word wrapping.

## CapCut Timeline Structural-Analysis Protocol

- Before changing native CapCut timing, build and inspect a complete inventory of every populated track: segment start/end, material name/path, media type, text role, audio role, and phase membership. Do not infer phase boundaries from segment counts alone.
- Treat every material whose name/path identifies an advertisement, for example `REKLAMA`, `AD`, or an explicitly supplied sponsor clip, as an immutable barrier. Preserve its source and target duration exactly; no phrase audio or phrase text may overlap the barrier. Move the entire barrier and all later elements together when an earlier lesson interval grows.
- A timing change must preserve each segment's existing track, ordering, media identity, z-order, transform, and animation. It may change only start/duration values explicitly authorised by the user. Never create accidental parallel/stacked text lanes.
- When expanding a phrase cycle, map every timeline track from ordered anchors: phrase boundaries, every advertisement barrier start/end, first/second lesson phase boundary, and outro. Shift all phase-two text, audio, video, overlays, counters, CTA, and background segments as one intact block after the final adjusted anchor.
- Before writing, run a dry simulation that proves: no two text segments overlap on the same track; no language text/audio overlaps an ad barrier; every advertised segment duration is unchanged; all later phase-two track offsets are identical; and every native mirror will receive byte-identical JSON.
- If a preview reveals a structural regression, close CapCut, restore the last known-good timestamped backup first, then investigate the inventory and repair from that baseline. Never stack another timing edit over the broken draft.

## Lingman Named Pipeline

- When the user says "Lingman", "Professor Lingman", or "lingman pipeline", invoke the `lingman` skill and use `lingman-scenarist-pipeline/` as the source of truth for YouTube script, lesson package, title/thumbnail, rewrite, audit, and DOCX scenarist work.
- Every user manual correction to a generated lesson/video/package is a generation-rule update by default. When the user says they changed, fixed, disliked, corrected, or manually adjusted anything, preserve their current edit as sacred project context and add the underlying rule to the relevant generation rules, pipeline notes, builder comments, or QA gate if that rule is not already present. Do this even if the user does not explicitly ask to update rules. Future generations must follow the new rule instead of repeating the old behavior.
- CapCut lesson text must never rely on automatic wrapping that can split a word. For every generated or replaced on-screen text, insert manual line breaks only at spaces or clear phrase boundaries before applying it to CapCut. If a word or line still cannot fit, shorten or rephrase the text; never allow mid-word line breaks in Russian, English, IPA, captions, CTA, intro, or transition text.
- CTA/STA text in CapCut must always use Cyrillic-safe text writing and a Cyrillic-capable font. The generation gate must fail on literal `????`, replacement characters, mojibake such as `Ð`/`Ñ`, or unsupported-font rendering in CTA/STA text. Restoring CTA/STA text must not touch phrase timing, audio, or backgrounds.
- The current-good Cepicepi CapCut state is locked in `.codex-tmp/capcut-backups/ЦЕПИ ЦЕПИ ЦЕПИ (1).LOCKED-GOOD-CURRENT-20260605_162149` with manifest `exports/chains/cepicepi_next_chains_a1a2_20260605/LOCKED_GOOD_CURRENT_STATE.json`. Treat that exact state as the baseline for future Cepicepi generation and repair work; do not alter CTA/STA text, background behavior, timing, audio, or text layout unless the user explicitly requests that exact change.
- Chains CapCut background videos must be real semantic video assets selected for the exact current phrase meaning from open-source stock APIs such as Pexels and Pixabay. Never fill phrase backgrounds with intro clips, generic placeholders, one broad query repeated across many phrases, or a small set of clips duplicated through the lesson. The generation gate must report the query, provider asset id, source title/tags when available, local file path, and source reuse count; it must fail when a background is not phrase-specific or when reuse exceeds the explicit cap for that run. The gate must also fail if any CapCut background material has no resolvable `path` or draft-placeholder `media_path`, if any phrase background segment is transparent or faded out, or if any visible preset/intro/template overlay such as `My presets` covers the phrase background area after the intro boundary.
- For Chains 800 phrase/video packages, all 800 phrases must be unique. Do not build an 800-row package by repeating, cycling, paraphrase-cloning, or expanding a smaller phrase set. The gate must fail unless there are 800 distinct English phrases and 800 distinct Russian translations after normalization.
- For Lingman thumbnail/preview work, always inspect `lingman-scenarist-pipeline/THUMBNAIL_GENERATION_RULES.md` first and use `C:\Users\badlo\OneDrive\Desktop\preview examples` plus `lingman-scenarist-pipeline\thumbnail_reference_bank\every_pack_9_styles_20260531\source_screenshots` as the mandatory inspiration source. Future 9-thumbnail packs must cover the five saved reference families 1-2 times each, use DALL-E/AI generated raster finals only, keep Russian-channel visible text in Russian, and pass a contact-sheet gate before saying "готово".
- For VENGA 200-phrase language variants, also inspect `lingman-scenarist-pipeline\youtube_packages\venga_a1_200_20260531_pack2_ru_only\READY_YOUTUBE_PACK\contact_sheet.jpg` as the golden previous-pack quality baseline. Do not accept weak one-word labels or generic AI cards just because they pass technical checks; the new pack must be at least comparable in hook strength, density, composition, and style match.

## Performance Bible (Instagram-Grade Runtime)

Root causes fixed on 2026-07-02 (see `PERF_MASTER_PLAN.md`): frozen-background navigation, constant stack background, instant hydration, lazy content. These invariants are guarded by `tests/perf_freeze_contract.test.ts` and `tests/navigation_back_underlay_contract.test.ts`. Every new screen/feature MUST follow them; do not weaken the guards to make a feature pass.

### Frozen background (heat)
- The root Stack keeps `freezeOnBlur: true` globally. A screen may opt out (`freezeOnBlur: false`) ONLY if it is truly realtime (live opponent, running exam timer) AND is added to the allowlist in `tests/perf_freeze_contract.test.ts` with a reason.
- The custom tab slider (`app/(tabs)/_layout.tsx`) freezes invisible tabs via `react-freeze` (`ENABLE_TAB_FREEZE`). Never render tab content that must stay "hot" while hidden; use gated timers instead.
- Freeze stops renders, NOT timers/subscriptions. Any `setInterval`/`onSnapshot`/`Animated.loop`/`withRepeat(-1)` in screen code must be gated by `useIsScreenFocused()` (from `hooks/use_is_screen_focused.ts`) + an `AppState` listener attached only while the loop runs — copy the pattern from `components/AvatarAura.tsx`.
- Infinite animations (`withRepeat(..., -1)`, `Animated.loop`) are allowed unguarded only inside modals that unmount on close, or dev/lab screens. The contract test ratchets the current file list; new unguarded files fail CI.
- Fixing that ratchet (`tests/runtime_lifecycle_ratchet.test.ts`): run `npm run guard:motion-ratchet` FIRST. The jest suite takes ~110s and fails on the FIRST mismatched entry, hiding every later one (incidents 2026-08-02 and 2026-08-22 both turned into chains of two-minute runs); the guard reads the same registry out of the test file and prints ALL breakages in one second. Fix everything it lists, then run jest once as the final check. When a token no longer matches, read the source before touching anything — in practice the guard was rewritten *stricter*, not lost, so the fix is usually resealing the registry token, never deleting the check.
- Module-level caches must have an eviction policy (max entries and/or TTL) — pattern: `pruneFriendsProfileCache` in `app/friends_tab_swr_warm.ts`. A bare growing `Record`/`Map` singleton is a leak.
- New `setInterval` call sites must tick at >=1000ms, clean up on unmount/blur, and be added to the allowlist test `tests/owner_direction_runtime_contract.test.ts` consciously.

### Instant first frame (no content jumps)
- A screen's first render must show the last known real data, not defaults. Hydrate synchronously in `useState(() => ...)` initializers from a module peek-cache or `app_snapshot_store` (`useAppSnapshotSelector`) — never render a default and patch it in a `useEffect`.
- Reference implementations: `components/PremiumContext.tsx` (snapshot hydration), `components/EnergyContext.tsx` (peek cache), `app/(tabs)/lessons.tsx` + `app/lessons_tab_state.ts` (session cache + single `multiGet`).
- Never replace a whole screen with a centered spinner while loading — keep final geometry (skeleton blocks or last-known content). Layout must not shift when data arrives.
- Focus-driven refetch (`useFocusEffect`) must (a) be wrapped in `useCallback`, (b) compare fresh data with current state and skip `setState` when nothing changed ("quiet revalidation"), and (c) respect a TTL (30–60s) unless an explicit app event invalidates it.

### Layout stability (first frame = final geometry)

Guarded by `tests/layout_stability_contract.test.ts` + baseline `config/layout-stability-baseline.json` (the baseline may ONLY shrink — new violations are red CI). Per-edit feedback: `scripts/hooks/layout_stability_hook.mjs` (PostToolUse). The bar is Bevel-grade: after the first frame, NOTHING on screen moves unless the user acted or an explicit animation runs.

- Anything that arrives async either hydrates synchronously from a peek/snapshot cache, or its exact place is reserved with `SkeletonBlock` (`components/SkeletonShimmer.tsx`) matching the final width/height. Reference: `app/review.tsx` loading skeleton.
- Never `if (loading) return null` on a screen: it is a blank frame followed by the whole screen popping in (ratcheted).
- Counters visible on the first frame must not render `0` and then jump to the real value — hydrate from a module peek-cache (pattern: `app/home_screen_hydration.ts`) or reserve the digits with a small fixed-width `SkeletonBlock`.
- Elements inserted into / removed from normal flow after the first frame (banners, inline cards) must wrap the visibility flip in `animateNextLayoutTransition()` from `app/smooth_layout.ts` — a smooth ~220ms push, never a teleport. Prefer overlay (`position: 'absolute'`, e.g. `components/OfflineBanner.tsx`) when the element must not displace content and does not cover controls.
- Safe-area insets ONLY via `useStableSafeAreaInsets` (`app/stable_safe_area_metrics.ts`). The raw `useSafeAreaInsets` from `react-native-safe-area-context` reports 0 until native metrics land → inset jump (ratcheted).
- `adjustsFontSizeToFit` is banned — on iOS it shrinks short variants to tiny font (known regression class); fix with wrapping/layout, never by shrinking text (ratcheted).
- `onLayout` → `setState` measure-then-render is allowed only when the measured content is invisible until measured (opacity 0) or its container height is already reserved — a measurement must never move visible content.

### Optimistic UI and offline mutations
- Phraseman is local-first for ordinary rewards and reversible user actions: the visible result must update immediately, without `Applying...`, spinners, disabled close buttons, or waiting for a server response.
- Persist the local intent/effect first, then synchronize or retry in the background. Offline/transient failure uses the existing no-network notification and must not roll back newer user-visible state merely because the server is temporarily unavailable.
- Pending mutations must be account-scoped and idempotent where the underlying system supports a durable outbox. Never claim durable retry for a flow that has no journal/outbox yet.
- Payments, authentication, destructive/security-sensitive actions, and genuinely server-authoritative competitive results are explicit exceptions; do not fake success for them.
- `docs/OPTIMISTIC_UI_AND_OFFLINE_MUTATIONS.md` is the source of truth for implementation, retry, error, and exception rules.

### Stack navigation (no black frames)
- The Stack `contentStyle.backgroundColor` and the root container background are CONSTANT theme colors. Never derive them from async readiness flags.
- Screen transition animations only via flags in `app/config.ts` (`ENABLE_SCREEN_TRANSITIONS`, `SCREEN_FADE_TRANSITIONS` — fade is iOS-only until manually verified on Android/Fabric). No direct `animation: 'slide_*'` on individual `<Stack.Screen>`.

### Content weight & the server-delivery seam
- NEVER statically import multi-hundred-KB generated data (plan days, quiz packs, generated registries) into screens or top-level module scope. Access content ONLY through its registry/loader (`app/plan_content_registry.ts`, `app/quiz_thematic_registry.ts`, `app/quiz_phrases_loader.ts`): they lazy-`require()` per plan/pack today and are the single seam where bundled content will be swapped for server-delivered content (French is already remote; English is planned). New content types must ship behind the same kind of accessor, not as a direct import.
- Long lists (>~30 items, user-growable feeds/collections) use `FlashList`/`FlatList` with fixed-size rows — not `.map()` inside a `ScrollView`. Reference: `app/flashcards_collection.tsx`.
- Keep screens under ~800 lines where practical; extract sections into memoized subcomponents and defer below-the-fold mounting via `InteractionManager.runAfterInteractions`.

## Firestore Thread-Leak Invariant (`android_task_executor_maximum_pool_size: 0`)

`firebase.json` → `react-native` → **`android_task_executor_maximum_pool_size: 0` — не удалять и не менять
на другое значение без разбора нижеописанного бага.**

Зачем (Crashlytics, 2026-07-26, 1.5.63 — 12 событий / 4 пользователя, «Repetitive crashes»):
`java.lang.OutOfMemoryError: pthread_create (1040KB stack) failed` в
`ReactNativeFirebaseFirestoreCollectionModule.sendOnSnapshotEvent`. Это исчерпание лимита
ПОТОКОВ процесса, а не нехватка памяти под данные.

Механизм — апстрим-баг RNFirebase (публичного тикета нет):
`sendOnSnapshotEvent` берёт executor через `getTransactionalExecutor(listenerId)`
(`ReactNativeFirebaseFirestoreCollectionModule.java:386`) — единственное место в модуле, где
передаётся уникальный identifier. `TaskExecutorService` кэширует executors в статической
`HashMap` по имени `...TransactionalExecutor<listenerId>` и при отписке листенера НЕ удаляет их
(`shutdown()` — только при уничтожении модуля). Итог: каждая пере-подписка коллекционного
`onSnapshot` = +1 вечный однопоточный пул (~1 МБ стека). В дампе краша нумерация `pool-N-thread-1`
дошла до 6533, все спят на `LinkedBlockingQueue.take()`.

Почему помогает `0`: в `TaskExecutorService.getTransactionalExecutor(String identifier)` стоит
`maximumPoolSize != 0 ? identifier : ""` — при нуле identifier обнуляется, и все листенеры делят
ОДИН общий executor. Утечка исчезает по конструкции, без патча нативного кода.
Цена: операции Firestore сериализуются в один поток — поэтому коллекционные листенеры обязаны
оставаться дешёвыми (см. ниже).

Инварианты для нового кода:
- Коллекционные `onSnapshot` (`.collection(...)`, а не `.doc(...)`) ВСЕГДА с `limit()` — они и
  текут, и сериализуются. Doc-листенеры общий пул не плодят. На 2026-07-26 таких листенеров пять:
  три в `app/app_messages.ts`, два в `app/firestore_friend_requests.ts`.
- Не пере-подписывайся на коллекции чаще, чем нужно: нестабильные зависимости `useEffect`
  умножают утечку (в `components/AppMessagesInbox.tsx` подписка завязана на `effectiveVisible`,
  т.е. на открытие/закрытие ящика).
- Настройка читается из `firebase.json` в build-time → после её изменения нужна ПЕРЕСБОРКА
  Android-бинарника, JS-релиз её не подхватит.

## EAS Production Build Gates (читать ДО подъёма версий)

Профиль `production` запускает в post-install hook два сторожа подряд
(`package.json` → `eas-build-post-install`). Оба падают на сервере уже ПОСЛЕ загрузки
архива, то есть сжигают платную сборку. Прогоняй их локально до `eas build`.

**`scripts/release_keys_gate.mjs`** — самое частое падение:
- `android.versionCode` ОБЯЗАН быть РАВЕН `ios.buildNumber`. Разные номера (например
  106 и 105) роняют сборку на обеих платформах. Поднимаешь один — поднимай оба на то же
  число. Уникальность обеспечивается тем, что число растёт, а не тем, что платформы
  расходятся.
- Требует на месте `google-services.json`, `GoogleService-Info.plist`, упоминания
  RC/Google/Apple-ключей в `app/revenuecat_init.ts` и `app/auth_provider.ts`,
  `EXPO_PUBLIC_STORE_RELEASE=1` в `eas.json`.

**`scripts/eas_production_version_gate.mjs`** — сверяет `app.json` с `origin/master`:
- `version` изменена, `versionCode` > baseline, `ios.buildNumber` > baseline.

Локальная проверка перед запуском сборки (обе должны дать EXIT=0):
```
node scripts/release_keys_gate.mjs
EAS_BUILD_PROFILE=production EAS_BUILD_PLATFORM=android EXPO_PUBLIC_STORE_RELEASE=1 \
  EXPO_PUBLIC_RC_ANDROID=goog_test EXPO_PUBLIC_RC_IOS=appl_test \
  node scripts/eas_production_version_gate.mjs
```

Отдельно: `NSPhotoLibraryUsageDescription` и `NSFaceIDUsageDescription` в
`ios.infoPlist` обязательны, хотя приложение ни галерею, ни Face ID не использует —
`expo-file-system`/`expo-image` компилируют ссылку на `PHPhotoLibrary`, а
`expo-secure-store` на `LAContext`, и робот Apple отклоняет бинарник с ITMS-90683.
Удалить эти ключи нельзя: механизма strip-а разрешений у Expo нет. Privacy policy при
этом обновлять НЕ надо — Apple требует описывать только реально собираемые данные.

## Session Communication And Impact-Analysis Protocol

- Every session report and progress update must be written in the user's language and in plain, highly understandable language. Explain what changed, why it changed, what it affects, and what was checked. Avoid unexplained technical jargon; if a technical term is necessary, explain it immediately in ordinary words.
- Before changing any file, first understand its purpose, the user-visible behavior it supports, the callers and dependencies around it, the relevant tests and configuration, and the reason the current design exists. Do not treat the requested file as an isolated island.
- For changes involving data, identity, synchronization, purchases, permissions, or backend behavior, inspect the connected Firestore paths, security rules, indexes/configuration, Cloud Functions/callables, serializers, migrations, and relevant tests before editing. Inspect only the related surface, but do not skip it when the change could affect it.
- Trace the full affected flow where practical: input or user action -> state/storage -> Firestore or callable -> returned data -> UI or other consumers. Check loading, empty, error, offline, retry, sign-out/account-switch, and backwards-compatibility behavior when applicable.
- When the investigation reveals a directly related broken text, contract, test, validation, accessibility issue, or integration issue, fix it in the same change if doing so is safe and within scope. Do not silently expand into unrelated cleanup or remove existing functionality.
- Before claiming completion, verify the actual final state with focused tests, checks, or inspection appropriate to the change. Reports must distinguish clearly between what was verified, what was inferred, and what could not be checked.
- End every completed work report with a section titled `Находки и предложения` containing concise, actionable observations about improvements, risks, cleanup, or features that may be worth adding or removing. Do not present suggestions as completed work, and do not remove anything unless the user explicitly requests it.

## Learning V2 Session Handover Protocol

- Any session that researches, plans, implements, reviews, tests, integrates, or releases Phraseman Learning V2, its 32-episode curriculum, stars/access economy, voice activities, Speaking Club integration, Personal Review, dialogs, or Admin Content Studio must start by reading `docs/v2/HANDOVER.md`, `docs/v2/README.md`, `docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md`, and `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md` completely.
- Treat `docs/v2/HANDOVER.md` as the living cross-session execution record. Update it before ending a V2 session, before a planned compaction/handoff, and immediately after a completed numbered task or a material plan/decision change.
- Every V2 handover must repeat the plan in three forms: the one-paragraph mission, the full phase/task status table, and the exact next executable task with files, commands, acceptance criteria, and expected output. A vague statement such as “continue the next task” is invalid.
- Every V2 handover must record: user intent; authoritative documents and precedence; completed/partial/not-started work; worktree, branch, HEAD, base and upstream state; every changed file and purpose; RED/GREEN commands and counts; failed approaches and why; blockers/open findings; product/security/privacy/accessibility invariants; preserved dirty/untracked user changes; deploy/push/release state; and exact startup commands for the next session.
- Do not overwrite `docs/HANDOVER.md` or the current `.planning/ROADMAP.md` for Learning V2. They belong to other work. Use `docs/v2/HANDOVER.md` and a separate V2 GSD milestone/workstream.
- Do not claim a V2 phase or task is complete if a reproducibility, test, security, privacy, accessibility, data-migration, deployment, or handoff finding remains open. Mark it explicitly partial/provisional and name the exact closing step.
- Preserve legacy features until the explicit Phase 14 owner decision. A handover, plan update, refactor, or new V2 implementation is never implicit permission to remove, hide, bypass, or replace legacy behavior.

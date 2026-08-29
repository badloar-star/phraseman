# Phraseman — Claude instructions

## 🚦 СВЕТОФОР: перед тяжёлой работой возьми слот

На этом ПК владелец держит **10+ сессий Claude/Codex одновременно**. 23.08.2026
машина вылетала: жило **39–49 процессов node**. Сессии обязаны работать ВМЕСТЕ,
а не против друг друга.

**Слотов всего 3.** Перед тяжёлым — возьми слот:

```bash
bash .claude/semaphore/slot.sh acquire "что делаю"
```

`GO` — работай. `WAIT` — слот не дали: делай лёгкую часть задачи или скажи
владельцу, что ждёшь очереди. **Не запускай тяжёлое в обход светофора.**

Закончил — СРАЗУ отдай, не держи слот во время разговора:

```bash
bash .claude/semaphore/slot.sh release
```

**Тяжёлое (нужен слот):** субагенты (Agent), jest, tsc, сборка/Metro/EAS,
Workflow, массовый grep по всему репозиторию.
**Лёгкое (слот не нужен):** чтение и правка файлов, точечный grep, git, разговор.

Посмотреть светофор: `bash .claude/semaphore/slot.sh status`.
Слот протухает сам через 15 минут, если сессия умерла.
Подробности: `.claude/semaphore/README.md`.

**Это ПРИНУЖДАЕТСЯ хуком, а не просьбой.** Хук лежит НЕ в проекте, а в домашней
папке: `~/.claude/hooks/heavy-process-traffic-light.js`, зарегистрирован в
глобальном `~/.claude/settings.json` (в проектном `.claude/settings.json` его нет —
не ищи там). Он (PreToolUse/Bash) перехватывает тяжёлые команды из своего списка
и запуск с раздутой памятью, и отклоняет команду, если слота нет.
Повод: 23.08.2026 замер показал **48 процессов node при светофоре 0/3** —
сессии его игнорировали, потому что он держался только на тексте. Хук читает
ТОТ ЖЕ семафор (`slot.*.d`, лимит 3, TTL 15 мин), второго светофора нет.
Отклонили — не повторяй команду и не поднимай `--max-old-space-size`: возьми
слот либо делай лёгкую часть и скажи об этом в итоге. Субагентов и Workflow хук
не видит (они не через Bash) — там правило выше действует на совести сессии.

**Правила экономии машины (действуют всегда, даже со слотом):**
- **никогда не гонять полный сюит** — только точечно:
  `npx jest <один файл> --runInBand --watchman=false`
- `tsc` — точечно по затронутым файлам, не по всему проекту
- ≤ 3 агентов одновременно; воркфлоу на 11+ агентов роняли процесс
- старые команды `.claude/session-locks/*.sh` — переходники на этот же светофор


## ⛔ СПЕРВА ЛОГИ, ПОТОМ ПОЧИНКА — В ЛЮБОЙ СЕССИИ, НАВСЕГДА

**Правило владельца 2026-08-29. Действует ВСЕГДА, во ВСЕХ сессиях, даже если
владелец о нём не напоминает.**

Дословно: «в это место сперва добавлять логи, всегда чтобы проверять — такие
логи, которые покажут всё, чтобы выяснить ошибку и точно знать как исправить».

При ЛЮБОЙ ошибке / багрепорте / «не работает» **первый шаг — не правка, а логи.**
Ставим в проблемное место подробную трассировку, владелец воспроизводит, и
только по фактам из логов ставим диагноз и чиним. Гадать и «чинить похожее
место» запрещено — именно так уже терялись круги работы.

**Лог обязан показывать ВСЁ (иначе он бесполезен):**
- **вход** — какой экран/функция, с какими аргументами и в каком состоянии
  стартовала (uid, id сессии/урока/матча, флаги, режим);
- **каждое ветвление** — какая ветка выбрана и КАКОЕ ЗНАЧЕНИЕ это решило
  (печатать само значение, а не голое `true/false`);
- **значения переменных** до и после ключевых шагов, включая прочитанное из
  кэша / AsyncStorage / Firestore (и *откуда* пришло: кэш или сеть);
- **сеть** — какой вызов ушёл, что вернулось (код, `reason`, ключевые поля),
  сколько занял; отдельно таймауты и отвалы;
- **ранние выходы и `catch`** — КАЖДЫЙ `return` до конца функции и КАЖДЫЙ
  проглоченный `catch` обязан логировать причину;
- **финальный результат** — что реально показали пользователю.

Формат: единый префикс на задачу (`[ARENA-VERDICT]`, `[PAYWALL]`), чтобы
владелец вытащил всю цепочку одним grep.

**Запрет: немой `catch {}`.** Даже намеренно проглоченная ошибка пишет причину.
Прогрев картинок был мёртв ЦЕЛИКОМ месяцами именно потому, что пропущенный
импорт глушился пустым `catch` (см. память `project_image_preload_silently_dead`).

**Где смотреть:** `console.log`/`console.warn` с телефона идут в бандлер, сторож
зеркалит их в `.expo/metro-console.log` (подробности — память
`project_metro_console_log`). Что должно пережить перезапуск и попасть
владельцу — через `app/debug-logger.ts`.

**После починки** временную трассировку убираем, но логи на ранних выходах и в
`catch` оставляем НАВСЕГДА — их отсутствие и порождает немые баги.

**Повод.** Класс бага «механизм есть, а данных не дали» повторялся многократно:
`stable_identity_unavailable` (три круга чинили авторизацию вместо первого звена
цепочки), мёртвый прогрев картинок, «награду показали, но не начислили», немые
отказы покупки карточек.


## ⛔ АРЕНА: НЕ ОТКАТЫВАТЬ

Файлы Арены (`modules/arena/**`, `components/arena/**`, `app/arena*`,
`functions/src/arena_*`, `tests/arena_*`, `docs/arena/**`,
`components/tournament/TournamentBackdrop.tsx`) переписываются по прямому
заданию владельца. Их **нельзя** откатывать (`git revert`, `git checkout`
чужой версии) и нельзя перезаписывать из своего буфера. Работа уже дважды
терялась именно так. Подробности и порядок восстановления — в
`____АРЕНА_НЕ_ОТКАТЫВАТЬ____.md` в корне.


## ⛔ ЛИГИ: ПОНИЖЕНИЕ ОБЯЗАНО РАБОТАТЬ

Расчёт итогов недели живёт в ДВУХ зеркальных местах: `app/league_engine.ts`
(`calculateResult`) и `functions/src/league_finalize_cron.ts`
(`computeGroupResults`). **Правишь одно — правь второе в том же коммите**, иначе
бейдж модалки разойдётся с авторитетным итогом крона.

Инцидент 2026-08-17: понижение не работало НИ У КОГО. В комнате играли трое, у
остальных 26 было ровно 0 очков; competition ranking считает «строго выше/ниже»,
поэтому игрок с нулём получал `bottomRank=1` и `myRank=4` при зоне 4 — то есть
попадал в зону ПОВЫШЕНИЯ, и ветка `&& !promoted` гасила понижение. На экране
«27 место из 29 — Остаёшься в лиге».

Правило владельца: повышение требует хотя бы одного очка; понижаются нижние 15%
**и все с нулём очков**; комната без единого игравшего никого не понижает.
Ключевые имена: `iScored`/`inZeroZone`/`someoneScored` (клиент),
`scored`/`inZeroZone`/`hasAnyScorer` (сервер).

Сторож `scripts/guard_league_demotion.mjs` блокирует такой коммит (pre-commit).
Сработал — чинить логику, а не обходить сторожа. Обычные тесты лиг этот класс
бага НЕ ловят (они на комнатах с уникальными очками). Подробности:
`____ЛИГИ_ПОНИЖЕНИЕ_НЕ_ЛОМАТЬ____.md` в корне.

## ⛔ ЛИГИ: КЭШ 6 ЧАСОВ, ТОЛЬКО ПРИ ЗАХОДЕ НА ЭКРАН

Чужие цифры в таблице лиги обновляются **не чаще раза в 6 часов** и **только
когда человек заходит на экран клуба**. Фоновых таймеров быть не должно. Свои
очки при этом живые — они локальные (`withMyLivePoints`, 0 чтений Firestore),
поэтому редкий рефреш не делает экран мёртвым.

Инцидент 2026-08-17: снапшот-коммит `e7eb7d316` сломал правило дважды одной
правкой — занизил `CLUB_REMOTE_REFRESH_MS` с 6 часов до 45 секунд (эта константа
служит И TTL кэша, И периодом таймера) и добавил `setInterval` с
`forceRemote: true`, который явно обнуляет TTL. Открытый экран перечитывал
Firestore каждые 45 секунд.

`forceRemote: true` допустим ТОЛЬКО в pull-to-refresh — это жест пользователя.
Смена ISO-недели обходит троттл намеренно (`weekChanged`), это не баг.

Сторож `scripts/guard_league_refresh_ttl.mjs` блокирует занижение TTL, возврат
таймера и лишний `forceRemote` (pre-commit). Сработал — вернуть правило, а не
удалять проверку. Подробности: `____ЛИГИ_КЭШ_6_ЧАСОВ_НЕ_ЛОМАТЬ____.md`.

## ⛔ APP CHECK ЗАПЛОМБИРОВАН НАВСЕГДА — НЕ ВКЛЮЧАТЬ, НЕ ПРЕДЛАГАТЬ

**App Check в этом проекте не используется. Никогда. Решение владельца 2026-08-17.**

Дословно: «апп чек навсегда убрать из расчёта и поставить маркер для будущих
нейронок. Апп чек мы не делаем и не просим никогда, он не нужен вообще, его
заблокировать, запломбировать, убрать отовсюду и больше никогда не вспоминать.
Если где-то находишь требование апп чека — надо создавать отдельную сессию
всегда, чтобы его убрать.»

**Что запрещено:**
- предлагать включить App Check — ни «для безопасности», ни «раз уж чиню рядом»,
  ни «это стандартная практика», ни «на проде положено»;
- писать `enforceAppCheck: true` в новой функции (дефолт — `false`);
- «чинить» падающий тест, который ждёт `enforceAppCheck: true` — такой тест
  сторожит **отменённое** правило, чинить надо тест;
- выставлять `ENFORCE_APP_CHECK*` в окружении — переменные больше не читаются,
  значения захардкожены.

**Нашёл требование App Check где-то ещё** — не убирай походя внутри чужой задачи.
Заведи **отдельную сессию** под снятие. Это прямое указание владельца.

**Почему.** Дважды положил прод: 2026-08-03 админка («Plus не выдан:
Unauthenticated», site key Google не признавал, все ~30 функций отвечали
`unauthenticated`), 2026-08-16 курс Learning V2 (опубликован и жив, но
приложение показывало «Сессия недоступна / NOT FOUND» — дев-сборка без
отладочного токена получала 401, экран переводил отказ как «не найдено»).

**Что защищает вместо него:** обязательный авторизованный вызов, custom claim
`admin: true` для админских записей, правила Firestore, серверная авторитетность
ответов (правильные ответы заданий физически не покидают сервер).

Пломба: `functions/src/callable_options.ts` (маркер
`APP_CHECK_SEALED_BY_OWNER_2026_08_17`). Сторож:
`functions/src/app_check_sealed.test.ts` — ломает сборку при возврате энфорса.
Сработал — снимай энфорс, а не сторожа.

## ⛔ ВХОД В АДМИНКУ: НЕ ЛОМАТЬ НИКОГДА

**badloar@gmail.com — владелец админки, он входит ВСЕГДА.**

«Не пускает в админку» → **СНАЧАЛА проверить custom claim `admin`, а НЕ править
код входа**. Симптом почти всегда означает пропавший claim; правка `legacy.html`
ломает работающую защиту и не решает проблему. Порядок проверки и восстановления:
`____ВХОД_В_АДМИНКУ_НЕ_ЛОМАТЬ____.md` в корне.

В `onAuthStateChanged` (`admin/v2/legacy.html`) запрещено убирать:
`tr.claims.admin !== true`, `getIdTokenResult(true)`, `browserLocalPersistence`,
`getRedirectResult(auth)`.

**Главный запрет: никакого `signOut` в блоке отказа по claim.** 2026-08-16 он
сжёг автовход владельца — Firebase хранит сессию в IndexedDB, и пока claim был
стёрт, каждый заход сносил сохранённую сессию. Нет прав → показать причину и
кнопку повторной проверки, но сессию НЕ трогать.

Сторож `scripts/guard_admin_login.mjs` блокирует такой коммит (pre-commit).
Сработал — чинить вход, а не обходить сторожа.

## ⛔ АДМИНКА: писать ТОЛЬКО в `admin/v2/legacy.html`

Владелец пользуется одной админкой — https://phraseman-ea0b3.web.app/legacy.html#control-panel
Её исходник — **`admin/v2/legacy.html`**, и hosting публикует именно папку `admin/v2`.
Любая правка админки вне этого файла на боевую НЕ попадёт.

`admin/legacy.html`, `admin/index.html`, `admin/full.html` — **заморожены**, только
чтение. Белая V2-панель `admin/v2/index.html` и её router/core/UI удалены
навсегда; восстанавливать их запрещено. Корень Hosting обязан перенаправлять на
`/legacy.html`. Подробности: `AGENTS.md` → «ЕДИНСТВЕННАЯ РАБОЧАЯ АДМИНКА» и
`docs/admin/WHITE_ADMIN_V2_RETIRED.md`.

### 👤 Правило: рядом с uid ВСЕГДА имя (владелец, 2026-08-02)

В админке идентификатор пользователя никогда не показывается один. Голый uid не
говорит, о ком речь, и владельцу приходилось копировать его в поиск.

- Рендерить через `renderUserRef(uid, names, opts)` — общий помощник в
  `admin/v2/legacy.html`. Имя ведёт, uid поясняет более тихим тоном.
- Имена тянуть **батчем** через `resolveUserNames(uids)` — 30 uid за запрос плюс
  кэш на сессию. НИКОГДА не `getDoc` на каждый uid: так уже теряли до 600 чтений
  за один заход.
- Имени нет → показываем uid как есть. Ничего не выдумываем: подпись «Без имени»
  спутали бы с настоящим именем.
- Если имя уже есть рядом (соседняя колонка, заголовок карточки) — правило
  соблюдено, дублировать не нужно.

**Исключение — Telegram и любые внешние каналы:** туда не уходят ни имена, ни
uid, только количества. Департаменты Джарвиса по этой же причине считают
серверными `.count()`-агрегациями и документы не выкачивают — PII физически не
может попасть в решение.

### 🤖 Правило: тронул данные — обнови Джарвиса (владелец, 2026-08-02)

Джарвис читает чужие коллекции и поля, но не участвует в их изменении. Если
поле переименовали, департамент **не упадёт** — он вернёт нули и будет бодро
врать, что всё хорошо. Молчаливая ложь опаснее явной поломки.

Поэтому при ЛЮБОМ изменении контента, схемы данных, коллекций или полей —
**в том же ходу**, без напоминания владельца:

1. Проверь, читает ли это Джарвис: `functions/src/jarvis/*_firestore_fetcher.ts`.
2. Если да — обнови читатель под новую схему.
3. Обнови таблицу в `functions/src/jarvis/jarvis_data_contract_guard.test.ts`.
4. Новый департамент → подключи в `all_departments_snapshot.ts` (поле там
   обязательное, забыть нельзя) **и** добавь в `JF_DEPARTMENT_META`
   в `admin/v2/legacy.html`, иначе владелец его не увидит.
5. Новая коллекция → закрой правилом в `firestore.rules`.

**Страж:** `jarvis_data_contract_guard.test.ts` ломает сборку, когда контракт
разошёлся. Он проверяет связь «поле в источнике ↔ поле в читателе Джарвиса»,
правила Firestore и то, что каждый департамент виден в панели. Обычные тесты
департаментов это НЕ ловят — они работают на моках и остаются зелёными.

Сломался страж — почини контракт, а не удаляй проверку.

## MASON — content scriptwriter pipeline

If the user says **"MASON"**, "мейсон", "подними мейсон", or **"пишем новый ролик"** —
load the content pipeline: **read `content/MASON.md` FIRST** and follow its step-by-step
instructions exactly (read DOSSIER.md + CLARKSON_STYLE.md, write a ready-to-voice short-video
script in Clarkson's-Farm style on RU, save it to `content/scripts/ГГГГ-ММ-ДД_*.md`).

MASON is self-contained in `content/` — any AI, any session continues from those files.

## LINGMAN — educational scriptwriter pipeline (DIFFERENT channel)

If the user says **"LINGMAN"**, "лингман", **"пишем новый урок"**, or **"следующее видео"** —
load the OTHER content pipeline: **read `content/lingman/LINGMAN.md` FIRST** and follow its
step-by-step instructions exactly. This is the EDUCATIONAL English channel (Professor Lingman
voice, audience 40+/50+, long ~10-12 min "phrase chain" videos, native Phraseman integration).
It writes a ready-to-read teleprompter script (one continuous RU text) to
`content/lingman/scripts/ГГГГ-ММ-ДД_NNN_*.md` and updates `content/lingman/memory/`.

> ⚠️ MASON ≠ LINGMAN. MASON = behind-the-scenes dev channel (Shorts, Clarkson style, hero "Максим").
> LINGMAN = teaching channel about English (Professor Lingman voice). Do not mix them.

LINGMAN is self-contained in `content/lingman/` — any AI, any session continues from those files.

## VIRAL — app marketing pipeline (reels/carousels/content plans, THIRD pipeline)

If the user says **"VIRAL"**, "вирал", "подними вирал", **"пишем рилс"**, **"пишем карусель"**,
or **"контент-план"** — load the MARKETING pipeline: **read `content/marketing/VIRAL.md` FIRST**
and follow its steps exactly (then MARKETING_SYSTEM.md + the needed playbook). It produces
ready-to-shoot reels scripts / ready-to-design carousels / weekly content plans that drive
users into the paid funnel knowlyapps.com/start/, saved to `content/marketing/scripts/`.
Payment/analytics services setup for the funnel: `content/marketing/PAYMENTS_SETUP.md`.

> ⚠️ VIRAL ≠ MASON ≠ LINGMAN. VIRAL = promotion of the Phraseman APP on IG/TikTok/FB
> (goal: paying users). Do not mix the three pipelines.

VIRAL is self-contained in `content/marketing/` — any AI, any session continues from those files.

## AVATAR STUDIO — asset pipeline for the in-app avatar customizer (FOURTH pipeline)

If the user says **"АВАТАР"**, "подними аватар", "новая причёска/одежда/глаза/аксессуар
для аватара" — **read `content/avatar-studio/AVATAR_STUDIO.md` FIRST** and follow it.
2.5D whole-render approach (layered cutouts were REJECTED by the owner). Every asset is an
image-EDIT of the canonical base render (`base/base_m.png` boy / `base_f.png` girl), framed by
`frame_passport.v1.json`, and enters `catalog/` ONLY through
`scripts/check_render.mjs` → PASS (`--accept`). Never weaken the check to admit a bad asset.

AVATAR STUDIO is self-contained in `content/avatar-studio/` — any AI, any session continues
from those files.

> Project-wide engineering rules also live in `AGENTS.md`.

## ⛔ LEARNING V2: все тексты пишутся по Библии

Любой текст, который видит ученик (интро-страницы, объяснения в заданиях,
разборы ошибок), пишется СТРОГО по
[`docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md`](docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md).
Документ построен на исследовании (Mayer coherence principle, Kalyuga expertise
reversal, опубликованные правила голоса Duolingo), а не на вкусе.

Главные правила, нарушение которых блокирует гейт:
1. **Не упоминать то, чего в уроке нет.** Объяснение к испанскому `no`
   рассказывало про `nada` и `non` — слов, которых ученик не видел. Лишнее
   сравнение доказанно вредит новичку, а не помогает.
2. **Максимум 320 знаков и 4 предложения на интро.** Минимума НЕТ — прежний
   «минимум 300 знаков» и заставлял лить воду, он отменён.
3. **Без грамматических терминов** (инфинитив, спряжение, артикль, залог…).
4. **Юмор обязателен, но по теме** — шутка не по теме хуже, чем её отсутствие.

## ⛔ LEARNING V2: сессия «написана» ≠ сессия открывается

Зелёные preflight и mode-native gate проверяют ТОЛЬКО текст. Открываемость —
отдельная цепочка, и рвётся она молча: человек видит «Подготавливаем занятие
и локальное аудио…», затем «Сессия недоступна / stable_identity_unavailable»
или чёрный экран.

**`stable_identity_unavailable` почти никогда не про личность.** Это следствие
того, что сессия не нашлась локально и ушла в сеть, где её нет. 2026-08-27 на
этом потеряли три круга: чинили авторизацию вместо первого звена цепочки.

Перед словами «сессия готова, проверяйте» — обязательно пройти чек-лист
[`docs/v2/КАК_ВЫПУСКАТЬ_СЕССИЮ_ЧЕКЛИСТ.ru.md`](docs/v2/КАК_ВЫПУСКАТЬ_СЕССИЮ_ЧЕКЛИСТ.ru.md)
и прогнать сторож `tests/learning_v2_es_bundle_reachability_guard.test.ts`.

Коротко, что ломает сессию целиком:
- нет `modeNativePlanId`/`modeNativePractice` — автопотолок её не откроет;
- интро короче **300 знаков или менее 4 предложений** в любой из 8 локалей —
  гейт качества роняет ВСЮ сессию (так сломали уже готовую сессию 1);
- есть звуковые задания, но нет своей bundled-озвучки — материал не собирается;
- битая кодировка в модуле озвучки (`fÃ¡cil` вместо `fácil`) — поиск идёт по
  точному совпадению транскрипта, отсюда `production_audio_missing`.

Потолок доступных сессий **вычисляется сам**
(`esAuthoredEpisode01ContiguousCeilingV1`). Ручную константу не возвращать —
именно забытый ручной шаг и был корнем инцидента.

## Performance Bible (MANDATORY for any new screen/feature/UI change)

Before creating or editing screens, tabs, animations, data loading, or content files —
read **`AGENTS.md` → «Performance Bible (Instagram-Grade Runtime)»** and follow it exactly:
frozen background (freezeOnBlur/react-freeze + guarded loops), instant first frame
(sync hydration from snapshot/peek, no default-then-patch, no full-screen spinners),
**layout stability (first frame = final geometry: skeletons with reserved sizes, no
`if (loading) return null`, no zero-then-jump counters, flow inserts only via
`animateNextLayoutTransition`, insets only via `useStableSafeAreaInsets`, no
`adjustsFontSizeToFit`)**, constant stack background, lazy content through registry
accessors (the seam for the planned server-side content delivery). Guarded by
`tests/perf_freeze_contract.test.ts` and `tests/layout_stability_contract.test.ts`
(+ baseline `config/layout-stability-baseline.json`, may only shrink) — never weaken
the guards to make a feature pass; extend allowlists only consciously.

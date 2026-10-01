# E01/E02 — пакет PM-001, 003, 005, 008, 010, 012, 018, 021 (2026-10-01)

Снято на HEAD `a15901ee47807bbdef9dde7d8c7ef63a80037474`, ветка `feature/referral-roulette`.

## PM-001 — рабочая ветка и релизный SHA

Факты по git (команды: `git rev-parse`, `git rev-list --count`, `git merge-base --is-ancestor`):

| Что | Значение |
|---|---|
| Локальный HEAD | `a15901ee47807bbdef9dde7d8c7ef63a80037474` (`feature/referral-roulette`) |
| Удалённая `origin/feature/referral-roulette` | `79c3f6984528beb2368cf64304b2067f3685cff6`; HEAD впереди на 770 коммитов (не отправлено) |
| Старт программы 2.0 (audit_sha) | `574a9542053a6299f1bd1557c3c09a52825e4fc3` (2026-09-22); HEAD впереди на 698 коммитов |
| Интеграционная `codex/all-development-integration` | локально `01551585a9457e7d96bb6c667bb7e6460c0346f8`, удалённо `e9ec1c4b9dbe1ed2702e89b9078ac5a918724f24`; НЕ предок HEAD (329 коммитов только в ней, 4101 только в HEAD) |
| Версия приложения | `app.json`: 1.6.24, Android versionCode 130, iOS buildNumber 130 (`package.json` 1.5.53 — не версия релиза) |
| `master` | устарел, не база (PROGRESS.md раздел 4) |
| Опубликованный релиз в сторах | НЕ подтверждён: из репозитория не определяется (нужна консоль Google Play / App Store Connect) |

Вывод: три из четырёх сопоставляемых величин зафиксированы; четвёртая (какая сборка сейчас в сторах и её SHA)
требует владельца. Строка `RELEASE: pending` в хуке коммита в репозитории и `~/.claude/hooks` не найдена
(grep по `.git/hooks`, `scripts/hooks`, `~/.claude/hooks`) — значение неизвестно, не выдумываем.

## PM-003 — сверка требований с источником

Скрипт `docs/phraseman-2.0/tools/pm003_source_reconcile.mjs` (лёгкий, читает только реестр и источники):

- требований 258; у всех есть задача (без задачи — 0);
- 216 дословных locator-ов (offsets в `01_original_message.txt` / `03_design_rejection.txt`) сверены побайтово с источником — расхождений 0;
- расшифровка скриншотов: 68 пунктов S01–S68, привязаны (anchor) к требованию 36, **не привязаны 32**:
  S01, S06, S08, S10, S11, S12, S14, S15, S18, S20, S21, S22, S24, S27, S31, S36, S39, S40, S41, S42, S44, S46, S47, S49, S55, S56, S57, S58, S60, S61, S62, S63.
  Часть из них, вероятно, закрыта соседними требованиями/решениями (например S58/S60–S63 — D03/D04, S27 — D03), но
  привязки (ID требования + задача) у них нет — это и есть недостающий вход A1.
- пометки «неподтверждённых обрезанных строк» (A2): в расшифровке есть S12 («нижняя заметка закрыта полем ввода») и S57
  («сообщение частично обрезано»); отдельного перечня с статусом «не подтверждено» в реестре требований нет.

## PM-005 — реестр файлов

`docs/phraseman-2.0/tools/build_file_inventory.mjs` классифицирует ВСЕ отслеживаемые git файлы по пути (один файл — одна категория),
результат — `docs/phraseman-2.0/registries/file_inventory.json`.

Знаменатель `git ls-files` = 44534; классифицировано 44534; unclassified = 0. Категории: generated 2128, tests 4024, native 35,
server 1681, assets 5349, client_code 2590, content 5107, admin_web 321, tooling_scripts 1572, docs 21443, agent_config_and_archive 230,
root_config 54, vendor 0 (node_modules и прочее в git не отслеживаются — это исключение, записано в файле).

Честные границы (записаны в самом JSON): это классификация по пути, а не построчный аудит; граф зависимостей и признак
release_reachable не строились (отдельный тяжёлый проход под светофором).

## PM-008 — реестр пользовательских строк

Не выполнен. Факты для оценки объёма: единой таблицы ключей нет — тексты разбросаны по ~30 файлам `*copy.ts` в `app/`/`components/`
плюс инлайн-строки в 575 `.tsx`-файлах; критерий требует по каждой строке экран, ключ, контекст/скриншот, решение
(оставить/сократить/удалить) и обязательность — решение по строке принимает владелец/дизайн, а скриншоты снимаются в эмуляторе.
Предложение: сначала автоматический сбор строк (AST-проход под светофором) в `copy_inventory.json`, затем пакетная сверка с владельцем.

## PM-010 — baseline на слабом устройстве (методика)

Выполнить без физического устройства/release-сборки нельзя. Методика (для сессии с устройством или слабым профилем эмулятора):

1. Release-сборка (не dev-клиент): EAS profile `preview`/`production` APK, установить `adb install -r`.
2. Записать: модель устройства, версия ОС, RAM, тип сети (Wi-Fi/4G), версия приложения и versionCode, SHA сборки.
3. Холодный старт: `adb shell am force-stop <pkg>`, затем `adb shell am start -W -n <pkg>/<activity>` — взять `TotalTime` и `WaitTime`; 5 прогонов, медиана.
4. Тёплый старт: свернуть на 10 секунд (HOME), развернуть, `am start -W` — те же поля.
5. Задержка тапа: `adb shell dumpsys gfxinfo <pkg> framestats` на сценарии «Главная → Урок → первое задание»; 90/95-й перцентиль кадра и число jank-кадров.
6. Память: `adb shell dumpsys meminfo <pkg>` (TOTAL PSS) после старта и после 5 минут сценария.
7. Повторный вход: убить процесс, открыть приложение с активной сессией — время до интерактивной Главной.
8. Dev-bundling не смешивать: измерять только установленную release-сборку, сервер бандлера выключен (`adb reverse --remove-all`); в отчёт писать признак `release=true`.

Допустимая замена по FINAL_PHASE.md п.4: слабый профиль эмулятора (мало RAM/CPU) — но это решение координатора, см. вопросы.

## PM-012 — основной путь YouTube → набор → тренировка (по факту кода)

Путь: Главная/«Видео» → ролик (`app/lingman_videos.tsx`) → фразы под роликом (`components/youtube/YoutubeVideoPhrases.tsx`, тап по фразе —
перемотка на её момент; сохранение — `addFlashcard` с `source: 'video_phrase'`) → карточки (`hooks/use-flashcards.ts`) → тренировка.
Второй вход: «Из видео» (`app/flashcards_video_packs.tsx`, строка набора → `openPack`): набор фраз ролика открывает ролик по `videoId`
(`router.push` на `/lingman_videos`), обычный набор — `/flashcards_collection` с `preview: '1'` (тренировка без добавления себе).
Список «Из видео» строится из готовых `video_phrase_sets` (`app/video_phrase_set_packs.ts`), кэш 6 ч, один запрос.
В пути нет ни рун, ни наград, ни лиг, ни курса: в `lingman_videos.tsx`, `flashcards_video_packs.tsx`, `video_phrase_set_packs.ts`
нет ссылок на руны/XP/лиги (поиск по файлам); контракт `tests/video_player_no_watch_rewards_contract.test.mjs` сторожит отсутствие наград за просмотр.

Тесты (точечно, светофор): `tests/video_phrase_set_packs.test.ts` 4/4, `tests/video_pack_phrase_moment.test.ts` 10/10.

## PM-018 — удаление бесплатно, лимит вместо платы

- Факт кода: `deleteCustomCard` (`app/flashcards/custom_cards_store.ts`) не списывает ничего (ни рун, ни монет, ни энергии), только убирает карточку,
  пишет её в журнал удалений и возвращает снимок для «Вернуть»; единственный вызывающий UI-слой — `app/flashcards/useCollectionData.ts`.
  Тест `tests/fc_custom_cards_store.test.ts` 11/11 (upsert/delete/restore).
- Текущий объёмный лимит: `FREE_CUSTOM_CARD_LIMIT = 50` на язык у Free, Plus — без лимита (`app/flashcards/custom_card_access.ts`, решение владельца 2026-09-30);
  карточки хранятся страницами по 200 (`app/flashcards_cloud_pages.ts`).
- Решение D17 в `03_DECISIONS.md` имеет статус PROPOSED («Rate-limit создания/публикации и storage budget вместо платы за удаление»);
  gate PROPOSED_SCOPE_APPROVED не снят. Серверных rate-limit на создание/публикацию наборов в `functions/src/community_packs.ts` не найдено
  (есть только потолки размера строк и цены). Конкретные числа лимита — решение, которого нет.

## PM-021 — отказ от макета «Графит»

- Решение владельца зафиксировано дословно в `docs/phraseman-2.0/sources/03_design_rejection.txt` и R021: «PhraseMan_Home_Graphite.png ОТКЛОНЁН. Не переносить его стиль».
- Файл `PhraseMan_Home_Graphite.png` в git не отслеживается (`git ls-files | grep -i graphite` — только тесты/план другой, онбординговой «graphite»-темы
  `docs/onboarding-graphite-theme-coverage-plan.md`, `tests/onboarding_graphite_*`; это действующая тема онбординга, не отклонённый макет,
  онбординг по D115 не трогается). Ни одна задача/решение не ссылается на отклонённый макет как на утверждённый.
- Блокировка: gate `DESIGN_APPROVED_FOR_VISIBLE_CHANGES` стоит на 108 задачах (`registries/tasks.json`); приёмка нового дизайна идёт по макетам
  `docs/design/v2-app/*` и решениям D73/D115/D125/D131.

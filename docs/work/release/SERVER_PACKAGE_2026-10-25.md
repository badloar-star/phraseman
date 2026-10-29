# Серверный пакет 25.10 — один список команд

Governance-ID: TG-9C9406CBA3B9
Составил: 1 · ЯДРО, 24.10 вечер. Запуск — утренняя кнопка владельца №1 (RUNBOOK 08:45), **до сборки**.
Выкладывать только из чистого HEAD через `scripts/deploy_from_clean_head.sh`. Без флага `--execute` это сухой прогон. `--force` запрещён.
Перед выкладкой — 🟢 Ревизора на финальный HEAD. App Check не включается (пломба).

## Статус 24.10 21:00 — «бой = git» (решение координатора)

- Админка: 70af8ef55 (бой из дерева + нормализованные концы строк + 16 ответов) **уже выложена** `hosting:admin` из чистого HEAD 24.10 ~20:40; бой = HEAD без учёта CR. Пункт 4 ниже выполнен; повторять утром не нужно, если `admin/v2/legacy.html` не менялся.
- Клиент историй — e9fa41f24 (перенос 5169f85d6). Сервер историй (3 функции + экспорт + adminListOpsLog) и строки правил историй — мои коммиты 24.10 вечером, хеши у координатора.
- Правила премиум-тем — 369dfab6a (4 · ТЕМЫ). Вместе со строками историй файл правил = бой + премиум + блоки HEAD. Условие 0.1 закрыто.
- В пункт 1 добавлены три функции историй. Код на бою уже такой же, это выкладка ради «бой = git».

## ⚠ Поправка 25.10 ~06:55 (координатор): V4 из утреннего пакета УБРАНА

Вреда на бою нет: V4 зовут только неанглийские курсы, а их уроки скрыты; в app_errors отказов нет. Learning V2 коммитит код V4 и модуль проекции в git ради «бой = git», выкладка — после релиза отдельно. Из обеих строк ниже убрать `functions:content:learningV2CourseReleasedSessionGetV4`. Проверка «бой vs HEAD» остаётся.

Пакет утром: 23 default + функции админки наборов (после коммита Сайта) + firestore:rules + storage + hosting:admin; сайт с политикой — шаг 9 · САЙТ.

## Обновление 25.10 06:10 (координатор): V4 Learning V2, storage, проверка «бой vs HEAD»

- **learningV2CourseReleasedSessionGetV4** (кодовая база **content**). На бою её НЕТ (есть V2 и V3), а клиент в HEAD с 15.10 зовёт только V4. Learning V2 коммитит исходник: V4 + экспорт из v3 без заглушки. V3 на бою остаётся для старых сборок. Цель: `functions:content:learningV2CourseReleasedSessionGetV4` — только после этого коммита.
- **storage:rules** — 37288f682 (premium-theme-packs, только get).
- **Проверка перед выкладкой** — `node scripts/check_live_functions_vs_head.mjs --only "<та же строка>"`. СТОП, если имя из пакета не экспортируется в HEAD своей кодовой базы или цель без имени (вся кодовая база). Печатает «на бою, но не в HEAD» по кодовым базам и какие функции будут СОЗДАНЫ.
  - Замер 06:10: default — на бою 405, в HEAD 400, без экспорта в HEAD 22. Это выведенные из работы функции, например videoWatchRunesClaim, доживающий до min_app_version ≥ 2.0. Адресная выкладка их не трогает.
  - content — 9/9, расхождений нет.
  - СТОП на V4: в HEAD её ещё нет.
- Создаются впервые: 3 функции премиум-тем + V4. Скрипт выкладки сам проверяет право вызова (check_callable_invoker).

Итоговая строка `--only` (сухой прогон утром на финальном HEAD):

```bash
node scripts/check_live_functions_vs_head.mjs --only "functions:default:premiumDialogSend,functions:default:premiumDialogTranslate,functions:default:premiumDialogReview,functions:default:premiumDialogStream,functions:default:dialogueV2FreeformSessionStart,functions:default:dialogueV2FreeformSessionTurn,functions:default:spireReportSteps,functions:default:friendsDuelChallenge,functions:default:friendsDuelMove,functions:default:friendsDuelDecline,functions:default:friendLikeActivity,functions:default:friendUnlikeActivity,functions:default:friendsLessonInvite,functions:default:friendsLessonTogetherMark,functions:default:friendsNudge,functions:default:friendsGetProfiles,functions:default:claimReportReward,functions:default:premiumThemeEntitlementsGet,functions:default:premiumThemeConditionClaim,functions:default:premiumThemeVideoWatchReport,functions:default:storyAnnouncementsGet,functions:default:adminStoryAnnouncementsList,functions:default:adminStoryAnnouncementCommand,functions:content:learningV2CourseReleasedSessionGetV4,firestore:rules,storage"
```

```bash
bash scripts/deploy_from_clean_head.sh --only "functions:default:premiumDialogSend,functions:default:premiumDialogTranslate,functions:default:premiumDialogReview,functions:default:premiumDialogStream,functions:default:dialogueV2FreeformSessionStart,functions:default:dialogueV2FreeformSessionTurn,functions:default:spireReportSteps,functions:default:friendsDuelChallenge,functions:default:friendsDuelMove,functions:default:friendsDuelDecline,functions:default:friendLikeActivity,functions:default:friendUnlikeActivity,functions:default:friendsLessonInvite,functions:default:friendsLessonTogetherMark,functions:default:friendsNudge,functions:default:friendsGetProfiles,functions:default:claimReportReward,functions:default:premiumThemeEntitlementsGet,functions:default:premiumThemeConditionClaim,functions:default:premiumThemeVideoWatchReport,functions:default:storyAnnouncementsGet,functions:default:adminStoryAnnouncementsList,functions:default:adminStoryAnnouncementCommand,functions:content:learningV2CourseReleasedSessionGetV4,firestore:rules,storage"
```

**Плюс (координатор 25.10 ~06:50):** функции админки наборов сообщества — на более сильную модель (коммит 9 · САЙТ до 08:30). Настоящие имена в HEAD: `adminCommunityPackQaReview`, `adminCommunityPackApplyQaFixes`, `adminCommunityPackApplyQaFixesToPublished` (admin_community_pack_qa.ts) и `adminCommunityPackTranslateLocales` (admin_community_pack_translate.ts). В пакет войдут те, чьи файлы изменит коммит Сайта: `functions:default:<имя>`.

**Плюс (координатор 25.10 ~06:45):** `hosting:admin` — после коммита Сайта, тем же скриптом из чистого HEAD. Его можно дописать в конец строки `--only` или запустить отдельным вызовом. После выкладки — скачать боевой legacy.html и сверить с HEAD (без учёта CR). Сайт с политикой выкладывает 9 · САЙТ своим шагом.

Если `deploy_from_clean_head.sh` не принимает цели `functions:content:<имя>` или `storage`, их выкладывают отдельными вызовами того же скрипта. Это сухой прогон и проверит.

## ⚠ Находки 24.10 20:30 (меняют пакет)

- **Бой ≠ HEAD.** Боевая админка (`legacy.html`, Last-Modified 24.10 18:50 GMT) байт в байт равна испорченной рабочей копии. В ней есть вкладка «Истории» и «Элементы пейвола», которых нет в HEAD. `hosting:admin` из HEAD **сотрёт их с боя** — не выкладывать, пока эти правки не закоммичены.
- **Правила на бою** — ruleset 4c7052b3 от 23.10 16:48Z — выложены из дерева, со строками историй, которых нет ни в одном коммите. `firestore:rules` из HEAD без строк историй уберёт их исключение из общего админ-доступа. Правила выкладывать только после коммита историй и премиум-тем.
- **Функции историй** (`storyAnnouncementsGet`, `adminStoryAnnouncementsList`, `adminStoryAnnouncementCommand`) живут на бою, а их исходник не закоммичен. Адресный пакет их не трогает. Выкладка всего `functions:default` из HEAD запрещена: firebase предложит удалить эти три функции.
- Если координатор заберёт истории в релиз (5169f85d6 + сервер + правила), три функции историй добавляются в пункт 1.

## 0. Условия до 07:00

1. В HEAD закоммичены правила премиум-тем. Сейчас это чужая незакоммиченная правка `firestore.rules`: поле `premium_theme_entitlements_v1` в списке защищённых полей `users` и `match /premium_theme_video_watch/{userId} { allow read, write: if false; }`. Без неё функции тем работают, но телефон может записать себе право на тему сам.
2. Правка `admin/v2/legacy.html` починена: сейчас в рабочей копии файл на 4,4 МБ с ~160 тыс. лишних пустых строк. В неё вставлены 16 ответов из `docs/work/support/prepared-replies-2026-10-24.snippet.js`. Только после этого пункт 4.
3. Проверка типов functions на снимке HEAD зелёная (результат — в отчёте блокеров).

## 1. Функции (23 штуки, адресно)

| Что | Коммит | Функции |
|---|---|---|
| Шлюз согласия ИИ (журнал, fail-open) | a6e2545b4, 4224713d6 | premiumDialogSend, premiumDialogTranslate, premiumDialogReview, premiumDialogStream, dialogueV2FreeformSessionStart, dialogueV2FreeformSessionTurn |
| Правило для новичка + журнал хода | 4224713d6 | dialogueV2FreeformSessionTurn |
| Пик: предел 60 с + разбивка по шагам | 4224713d6 | spireReportSteps |
| Друзья: исход дуэли на телефоне, пуши на 9 языках, поле TTL | a6e2545b4, 25942d543 | friendsDuelChallenge, friendsDuelMove, friendsDuelDecline, friendLikeActivity, friendUnlikeActivity, friendsLessonInvite, friendsLessonTogetherMark, friendsNudge |
| «Урок вместе»: статусы курса друга | f25582a4e | friendsGetProfiles |
| Награды за жалобы старого формата | 0eacd6632 | claimReportReward |
| Премиум-темы (впервые) | a50cfbf18 | premiumThemeEntitlementsGet, premiumThemeConditionClaim, premiumThemeVideoWatchReport |
| Истории (код = бой, ради «бой = git») | коммит Ядра 24.10 | storyAnnouncementsGet, adminStoryAnnouncementsList, adminStoryAnnouncementCommand |

Сухой прогон (сейчас и утром на финальном HEAD):

```bash
bash scripts/deploy_from_clean_head.sh --only "functions:default:premiumDialogSend,functions:default:premiumDialogTranslate,functions:default:premiumDialogReview,functions:default:premiumDialogStream,functions:default:dialogueV2FreeformSessionStart,functions:default:dialogueV2FreeformSessionTurn,functions:default:spireReportSteps,functions:default:friendsDuelChallenge,functions:default:friendsDuelMove,functions:default:friendsDuelDecline,functions:default:friendLikeActivity,functions:default:friendUnlikeActivity,functions:default:friendsLessonInvite,functions:default:friendsLessonTogetherMark,functions:default:friendsNudge,functions:default:friendsGetProfiles,functions:default:claimReportReward,functions:default:premiumThemeEntitlementsGet,functions:default:premiumThemeConditionClaim,functions:default:premiumThemeVideoWatchReport,functions:default:storyAnnouncementsGet,functions:default:adminStoryAnnouncementsList,functions:default:adminStoryAnnouncementCommand"
```

Итого 23 функции. `adminListOpsLog` в пакет не входит: его код в HEAD не менялся, в коммите добавлен только экспорт.

Выкладка — та же строка с `--execute`, только по слову владельца. После выкладки скрипт сам запускает `scripts/check_callable_invoker.mjs`. Три функции тем новые: firebase даёт право вызова `allUsers` только при успешном создании, и если создание сорвётся, проверка напечатает команду починки.

## 2. Правила Firestore (после условия 0.1)

```bash
bash scripts/deploy_from_clean_head.sh --only "firestore:rules"
```

## 3. TTL квитанций Друзей (30 дней, поле `expireAt`)

```bash
gcloud firestore fields ttls update expireAt --collection-group=friend_duel_receipts --enable-ttl --project=phraseman-ea0b3
```

```bash
gcloud firestore fields ttls update expireAt --collection-group=friend_lesson_invite_receipts --enable-ttl --project=phraseman-ea0b3
```

## 4. Админка с ответами (после условия 0.2)

```bash
bash scripts/deploy_from_clean_head.sh --only "hosting:admin"
```

Отправка ответов людям — отдельная кнопка владельца в админке. Выкладка её не делает.

## 5. Проверка после (журналы, только чтение)

- `[AI-CONSENT]`: `ok` / `would_refuse` / `consent_read_failed` есть, `refused` = 0 (выключатель не включён).
- `[SPIRE-REPORT] batch_done`: есть `phases`; p90 `tookMs` < 60 000; `duplicates` ≈ 0.
- `[DIALOGUE-V2-FREEFORM-TURN] ok`: число `ms` по ходам — база для решения о скорости.
- Премиум-темы: `premiumThemeEntitlementsGet` отвечает 200, отказов `unauthenticated`/`not-found` нет.

## Откат

Скрипт выкладывает только HEAD, поэтому откат = revert-коммит нужной правки + та же команда `--only` с `--execute`.
Правила — revert строки правил + `--only "firestore:rules"`. TTL выключается той же командой с `--disable-ttl`.

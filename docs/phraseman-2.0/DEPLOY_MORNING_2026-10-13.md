# Утренняя прицельная выкладка (Ядро, 12.10 ночь) — для владельца

Выкладывает ВЛАДЕЛЕЦ (или координатор по его «да»). Ночью ничего не выкладывалось. Ключи и секреты сессия не читала.

> **Сверка 12.10 22:4x (Ядро):** `git status --short functions/` — пусто (незакоммиченного серверного кода нет). После написания
> документа появилось: **TTL обращений в поддержку** (Авторизация 98ff91799 — раздел «Д» ниже), починка типов итога диалога
> 351536a25 (без неё predeploy-сборка падала на 468ceebc0 — едет вместе с `dialogueV2SessionComplete`), строка журнала удаления
> 31d16c4ac (раздел «Е»). Тесты затронутых серверных файлов (client_reports, log_ttl, dialogue_v2_session_complete) — 38/38.
> Уже выложено координатором 12.10 вечером (повторять НЕ нужно): `firestore:indexes` (5 индексов удаления, 37e53b290) и
> `accountDeleteMine` + `accountDeleteWorker` (с 2027e3b2b, 87efe7d3b, 351536a25). **Не выкладывать утром:** опрос осколков
> (e4f45f8e3 и весь `shard_survey.ts`) — только в день релиза.

## Что едет

| Функция | Что даёт | Коммиты (с прошлой выкладки) | Нужно «да» |
|---|---|---|---|
| `dialogueV2TextTurn` | «Почему так» — разбор наставником, не «я», конкретная фраза в кавычках языка; сервер больше не принимает от модели «диалог окончен» до последней цели (dialogs-038) | b7c1fd1e8 (acceptDialogueEnded), 6e89ed5cc (промпт). Группа Диалогов V2 выложена 11.10 10:2x–10:47 (реестр п.46), оба коммита позже — в проде их нет. Встроенный выпуск Диалогов не менялся. | общее «да» на выкладку |
| `dialogueV2SessionComplete` | ничего видимого: в журнал пишется настоящая причина «Итог пока недоступен» (dialogs-041 — модель не успела за 20 с / ошибка провайдера / протухший контекст); по ней чиним итог | 468ceebc0 (только лог). Выложена 11.10 с группой Диалогов V2 — других изменений после нет | общее «да» |
| `reEngagePushCron` | пуши «серия ждёт / давно не был» на английском (при английском интерфейсе) | 7d9064944 и, если не выкладывались, 2a277357e — таблица ниже | общее «да» |
| `premiumExpiryReminderCron` | напоминание «Plus скоро продлится / закончится» на английском | 7d9064944 и, если не выкладывались, ещё 6 изменений — таблица ниже | **ОТДЕЛЬНОЕ «да» владельца** (напоминание о платеже) |

## Что уедет вместе — по каждой функции

Выкладка обновляет только названные функции, но каждая из них берёт ВЕСЬ свой код на момент коммита. Ниже — все изменения
в файлах функции и её прямых зависимостях. Для кронов дата прошлой выкладки в документах не записана: владелец смотрит её
командой (только чтение метаданных) и отсекает всё, что раньше этой даты, — оно уже в проде.

```bash
gcloud functions describe reEngagePushCron --gen2 --region us-central1 --project phraseman-ea0b3 --format="value(updateTime)"
gcloud functions describe premiumExpiryReminderCron --gen2 --region us-central1 --project phraseman-ea0b3 --format="value(updateTime)"
```

### `dialogueV2TextTurn` (прошлая выкладка 11.10 ~10:47, реестр п.46)

| Коммит | Дата | Что меняется для человека | Риск |
|---|---|---|---|
| b7c1fd1e8 | 11.10 14:31 | Диалог больше не обрывается после 2-й реплики, пока цели не пройдены: «конец» от модели принимается только на последней цели или в длинном разговоре (dialogs-038) | низкий; если модель так и не назовёт цель — страховка по длине разговора |
| 6e89ed5cc | 12.10 02:48 | «Почему так» объясняет наставник, а не персонаж от «я»: конкретная фраза в кавычках языка интерфейса и что она делает (dialogs-020) | низкий: меняется только текст инструкции модели; разбор ответа прежний |

Другие серверные коммиты с 11.10 (Шпиль b9f716cc9/70bffbcad, озвучка карточек, письма) — в других функциях, этой выкладкой
не уезжают. Брифинги Диалогов (shared/generated) — клиент, серверу не нужны.

### `dialogueV2SessionComplete` (прошлая выкладка 11.10 ~10:47, группа Диалогов V2)

| Коммит | Дата | Что меняется для человека | Риск |
|---|---|---|---|
| 468ceebc0 | 12.10 17:10 | ничего: при отказе модели в итоге диалога в журнал пишется причина `[DIALOGUE-V2-COMPLETE] provider_failed {reason, elapsedMs, model, httpStatus, turns}` — без текста реплик и ключа | нулевой: тот же отказ, только с причиной |
| 351536a25 | 12.10 21:28 | ничего: статус ответа модели читается без расширения типа (468ceebc0 ломал tsc в predeploy) | нулевой; без него сборка функций не проходит |

Проверка после: `firebase functions:log --only dialogueV2SessionComplete -n 50 --project phraseman-ea0b3` — при «Итог пока недоступен»
должна появиться строка `provider_failed` с `reason`.

### `reEngagePushCron` (дата прошлой выкладки — по команде выше)

| Коммит | Дата | Что меняется для человека | Риск |
|---|---|---|---|
| 7d9064944 | 12.10 | Пуши «серия ждёт / давно не был / очень давно» на английском для английского интерфейса (сейчас интерфейс en выключен — до включения не видно) | нулевой до включения английского |
| 2a277357e | 01.10 | Кто выключил напоминания о серии (pushPrefs.streak), больше не получает и «давно не был» (PM-200) | этим людям станет приходить меньше пушей — так и задумано |
| efe19ae9d | 30.09 | ничего: правка комментария | нет |

### `premiumExpiryReminderCron` — только по ОТДЕЛЬНОМУ «да» (дата прошлой выкладки — по команде выше)

| Коммит | Дата | Что меняется для человека | Риск |
|---|---|---|---|
| 7d9064944 | 12.10 | «Plus скоро продлится / доступ скоро закончится» на английском для английского интерфейса | нулевой до включения английского |
| ab673c8a0 | 04.10 | Убран отдельный текст «Твой MAX скоро продлится»: напоминание только про Plus (MAX выведен из доступа 04.10) | низкий: MAX в продаже нет; кто остался на MAX — текст про MAX больше не придёт |
| 225a65825 | 04.10 | Человек разницы не видит: крон читает 14 нужных полей профиля, а не весь документ (PM-252, дешевле) | низкий: если нужного поля нет в списке — напоминание не уйдёт; отбор покрыт тестом premium_expiry_reminder_select |
| 17047a3c8 | 04.10 | ничего: сбой при отборе получателей теперь пишет причину в журнал (PM-229) | нет |
| a4606e6e6 | 04.10 | ничего: удалены мёртвые помощники тира MAX | нет |
| 724fb9834 | 01.10 | Кто выключил «предложения» (pushPrefs.offers), больше не получает это напоминание (PM-200) | меньше напоминаний о продлении — так и задумано |
| f5447d10c | 01.10 | ничего: немые ошибки в расчёте доступа пишут причину в журнал (PM-229) | нет |
| f8eeec04d | 22.09 | ничего: комментарий-предупреждение в отборе получателей | нет |
| 0217c4a21 | 14.09 | ничего для пуша: функция проверки выдачи Plus админом стала доступна другим модулям | нет |

## Почему не из рабочей папки

`firebase deploy` собирает рабочую папку. В ней незакоммиченная правка Codex с ошибкой типов TS2352
(`modules/learning-v2/content/factory_native/factory_native_course_v1.ts:563`), и сборка functions её достаёт
(`functions/src/content_factory/learning_v2_publish_authored_course_v1.ts` → … → этот файл). Поэтому — чистый срез
последнего коммита во временной папке. Два файла окружения `functions/.env` и `functions/.env.phraseman-ea0b3` НЕ в git,
а deploy их подхватывает: срез их КОПИРУЕТ (без чтения), иначе функции уйдут без переменных окружения.

## Команда (Git Bash, одна строка) — `dialogueV2TextTurn` + `dialogueV2SessionComplete` + `reEngagePushCron`

> **Проверено 12.10 ~04:05 (Ядро):** срез коммита 5d62e7e38, выгрузка `git -c core.autocrlf=false archive`, переходы на
> node_modules, `PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1` + полный id → `npm --prefix functions run build` **rc=0 за 35 с**:
> support-context, gate:spire-multilingual, tsc (0 ошибок), копия ассетов, functions-runtime-parity — все шаги прошли.
> Выкладка не запускалась. Две первые проверки нашли и закрыли две поломки пути: нет .git в срезе и CRLF при выгрузке.

```bash
R=/c/appsprojects/phraseman; FULL=$(git -C $R rev-parse HEAD); D=/c/Temp/phraseman_deploy/${FULL:0:9}; [ ! -e "$D" ] && mkdir -p "$D" && git -C $R -c core.autocrlf=false archive $FULL | tar -x -C "$D" && cp $R/functions/.env $R/functions/.env.phraseman-ea0b3 "$D/functions/" && W=$(cygpath -w "$D") && powershell -NoProfile -c "New-Item -ItemType Junction -Path '$W\functions\node_modules' -Target 'C:\appsprojects\phraseman\functions\node_modules' | Out-Null; New-Item -ItemType Junction -Path '$W\node_modules' -Target 'C:\appsprojects\phraseman\node_modules' | Out-Null" && cd "$D" && export PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1 PHRASEMAN_SUPPORT_RELEASE_COMMIT=$FULL && npx tsx scripts/dialogue_v2_embedded_release.ts --check && firebase deploy --only functions:dialogueV2TextTurn,functions:dialogueV2SessionComplete,functions:reEngagePushCron --project phraseman-ea0b3
```

Сборку (`npm --prefix functions run build`) firebase запускает сам (predeploy). В срезе нет `.git`, поэтому сборка
идёт как «архив выпуска»: `PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1` + полный id коммита (`build_support_repo_context.js` без них
падает «requires a full Git checkout» — найдено проверкой 12.10). Выгрузка — `git -c core.autocrlf=false archive`: в
репозитории `core.autocrlf=true`, и обычный `git archive` превращает LF в CRLF — сторож `gate:spire-multilingual` сверяет
пул заданий побайтно и падает «es/tasks.jsonl is stale» (найдено второй проверкой 12.10). На вопрос CLI «delete functions?» — **No**.
Если папка среза уже есть — команда остановится сразу (`[ ! -e "$D" ]`): сначала уборка ниже. `rm -rf` по папке с
переходами НЕ запускать — он может уйти по переходу в рабочие `node_modules`.

## Только после ОТДЕЛЬНОГО «да» владельца — `premiumExpiryReminderCron`

Из того же среза (папка `$D` уже есть):

```bash
FULL=$(git -C /c/appsprojects/phraseman rev-parse HEAD); cd /c/Temp/phraseman_deploy/${FULL:0:9} && export PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1 PHRASEMAN_SUPPORT_RELEASE_COMMIT=$FULL && firebase deploy --only functions:premiumExpiryReminderCron --project phraseman-ea0b3
```

## После выкладки

- Проверка: `firebase functions:log --only dialogueV2TextTurn -n 20 --project phraseman-ea0b3`; в диалоге «Почему так» без «я».
- Уборка среза (сначала переходы, иначе удаление уйдёт в рабочие node_modules):

```bash
D=/c/Temp/phraseman_deploy/<коммит>; cmd //c rmdir "$(cygpath -w $D)\functions\node_modules"; cmd //c rmdir "$(cygpath -w $D)\node_modules"; rm -rf "$D"
```

## Вопрос владельцу утром (не выкладка)

Брифинги Диалогов переписаны (ru/uk/en) и переведены на es/pt-BR/vi/id/tr/pl Ядром без вычитки носителем — только
автопроверки генератора. Нужна ли вычитка носителем до релиза? (`DIALOG_BRIEFINGS_SAMPLE_R1.md`, раздел «Статус».)

## В: английские поля сообщений («Важное от Phraseman», settings-gap-002) — только со слова владельца

Коммит **9836f1880** (12.10 16:04). Без выкладки на английском интерфейсе новые кампании так и останутся без английского текста
(клиент в сборке уже не показывает русский вместо английского — такие сообщения просто скрыты).

**Функции — прицельно, 4 штуки** (по именам, НЕ весь functions):

| Функция | Что меняется | Что ещё уедет вместе (с 20.09, общий код) |
|---|---|---|
| `adminTranslateMessage` | автоперевод добавляет EN; пустой EN не подменяется русским | 76de2317d / abec9c00a (расход ИИ по operation, PM-231) — если не выкладывались |
| `adminCreateAppMessage` | пишет titleEn/messageEn/questionEn/textEn; пустой EN остаётся пустым; для плашки настроек EN не обязателен | 17047a3c8 (немые catch пишут причину, PM-229) — если не выкладывался |
| `adminUpdateAppMessage` | то же при правке кампании | то же |
| `adminLaunchVipSurveyCampaign` | приглашение в опрос Plus получает английский текст | то же |

Дату прошлой выкладки каждой смотреть так же, как выше (`gcloud functions describe <имя> … --format="value(updateTime)"`).

**Порядок: сначала сервер, потом админка.** Новая админка шлёт поле `en`; старый сервер его просто игнорирует, а новый
сервер со старой админкой работает (EN для плашки настроек сервер не требует) — поэтому любой порядок безопасен, но
«сервер → админка» даёт рабочий EN сразу после второго шага.

Из того же среза (команда среза — раздел «Команда» выше; папка `$D` уже есть):

```bash
FULL=$(git -C /c/appsprojects/phraseman rev-parse HEAD); cd /c/Temp/phraseman_deploy/${FULL:0:9} && export PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1 PHRASEMAN_SUPPORT_RELEASE_COMMIT=$FULL && firebase deploy --only functions:adminTranslateMessage,functions:adminCreateAppMessage,functions:adminUpdateAppMessage,functions:adminLaunchVipSurveyCampaign --project phraseman-ea0b3
```

Затем админка (hosting цель `admin` = папка `admin/v2`, только она; вместе уедет `oauth-privacy.html` с абзацем о 30 днях — 98ff91799):

```bash
FULL=$(git -C /c/appsprojects/phraseman rev-parse HEAD); cd /c/Temp/phraseman_deploy/${FULL:0:9} && firebase deploy --only hosting:admin --project phraseman-ea0b3
```

**Проверка после:**
- https://phraseman-ea0b3.web.app/legacy.html#control-panel → «Сообщения»: в форме переводов есть блок **EN · English**;
  «Перевести через ИИ» заполняет EN.
- Сохранить черновик (неактивный) → в Firestore у документа `app_messages/<id>` есть `titleEn`/`messageEn`; если EN не
  заполнять — поля пустые (не русские).
- `firebase functions:log --only adminCreateAppMessage -n 20 --project phraseman-ea0b3` — без ошибок.
- Старые кампании без EN на английском интерфейсе скрыты (так задумано); показать — открыть, «Перевести через ИИ», сохранить.

**Откат:** предыдущая ревизия каждой из 4 функций в Cloud Run (консоль) или выкладка тех же 4 функций из среза коммита
до 9836f1880; админка — повторная выкладка `hosting:admin` из того же старого среза (или откат релиза в консоли Hosting).
Данные откатывать не нужно: поля `*En` старые клиенты и старый сервер не читают.

**Опрос Plus ≠ «опрос осколков».** `adminLaunchVipSurveyCampaign` (functions/src/admin_app_messages.ts, приглашение
пройти опрос ради месяца Plus — это inbox-кампания app_messages) — НЕ «опрос осколков» из списка «не выкладывать до дня
релиза». Опрос осколков — это отдельный модуль `functions/src/shard_survey.ts` (`getActiveShardSurvey`, `submitShardSurvey`,
`adminWriteShardSurvey`, `adminDeleteShardSurvey`); эта выкладка его не трогает.

## Г: сайт (политика, условия, удаление) — knowlyapps.com

Зачем: опубликованный сайт отстаёт — политика `October 10`, условия `September 1`, страница удаления без 14 дней на восстановление и
без правила для гостя. Google Play читает именно https://knowlyapps.com/legal/data-deletion/, ссылки в формах сторов ведут на политику
(STORE_PRIVACY_FORMS_R1.md §3, §4.2, §4.8). В репозитории всё готово: `knowly-www/legal/{privacy,privacy-ios,terms,data-deletion}` =
`legal/*.json` (October 12, 2026; `npm run legal:sync` изменений не даёт), на странице удаления добавлен блок «14-day recovery window»
ровно по политике §20 и коду (`functions/src/account_delete_grace.ts`, 14 дней).

Цель hosting — `knowlywww` (.firebaserc → сайт `knowlyapps`, папка `knowly-www`, без predeploy). Выкладывается ВЕСЬ `knowly-www`
из коммита — тем же чистым срезом, что выше (папка `$D` уже есть).

**Что поедет кроме юридических страниц — НИЧЕГО.** Опубликованный сайт = состояние коммита `472f8715e` (10.10: политика October 10,
условия September 1, удаление October 10 — совпадает с живыми страницами). `git diff --stat 472f8715e HEAD -- knowly-www` — ровно 4 файла:
- `legal/privacy/index.html` — политика October 12 (4c71ca720, 0af36379f: §20 удаление гостя, правки первого выпуска);
- `legal/privacy-ios/index.html` — НОВАЯ страница, iOS-версия политики (78b23d514);
- `legal/terms/index.html` — условия October 12 (§4, 9b905f582);
- `legal/data-deletion/index.html` — дата и «14-day recovery window» (09ffadc73).
Других страниц сайта (главная, /start/, тесты уровня, гайды) изменения не касаются; незакоммиченных правок в `knowly-www` нет (12.10, 17:15).
Если перед выкладкой появятся новые коммиты в `knowly-www` — повторить `git diff --stat 472f8715e HEAD -- knowly-www`.

```bash
FULL=$(git -C /c/appsprojects/phraseman rev-parse HEAD); cd /c/Temp/phraseman_deploy/${FULL:0:9} && firebase deploy --only hosting:knowlywww --project phraseman-ea0b3
```

**Проверка после** (в браузере, без кэша — Ctrl+F5):
- https://knowlyapps.com/legal/privacy/ — «Last updated: October 12, 2026»;
- https://knowlyapps.com/legal/privacy-ios/ — «Last updated: October 12, 2026»;
- https://knowlyapps.com/legal/terms/ — «Last updated October 12, 2026»;
- https://knowlyapps.com/legal/data-deletion/ — «Last updated October 12, 2026» и раздел **«14-day recovery window»** (два абзаца:
  восстановление при входе Google/Apple; гость не восстанавливается, серверные данные — не позднее конца 14 дней);
- главная https://knowlyapps.com/ и /start/ открываются как раньше (весь сайт выложен из коммита).

**Откат:** консоль Firebase → Hosting → сайт `knowlyapps` → «Release history» → предыдущий релиз → Rollback. Данных не касается.

## Д: обращения в поддержку удаляются через 30 дней (TTL) — Авторизация 98ff91799, решение владельца (а)

Что едет: `submitClientReport` пишет `expireAt = создание + 30 дней` у обращений и сообщений об ошибках (`error_reports`, kind
`error_report`); `firestore.indexes.json` — правило TTL `error_reports.expireAt`. Политика (30 дней) уже в коммите — уезжает с сайтом
(раздел «Г»: в `legal/privacy*` абзац про 30 дней; список файлов сайта прежний — 4) и с админкой (`admin/v2/oauth-privacy.html`, раздел «В»).

```bash
FULL=$(git -C /c/appsprojects/phraseman rev-parse HEAD); cd /c/Temp/phraseman_deploy/${FULL:0:9} && export PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1 PHRASEMAN_SUPPORT_RELEASE_COMMIT=$FULL && firebase deploy --only functions:submitClientReport,firestore:indexes --project phraseman-ea0b3
```

- На вопрос CLI об удалении индексов/правил, которых нет в файле (в проде есть чужие overrides) — **No** (как вечером 12.10).
- TTL включается до 24 ч. Старые обращения без `expireAt` TTL не тронет — они живут до удаления аккаунта (backfill — отдельное решение).
- Джарвис: «открытые сообщения об ошибках» после включения считаются только за последние 30 дней.
- Проверка: новое обращение из приложения → в Firestore у `error_reports/<id>` есть `expireAt` ≈ +30 дней; консоль Firestore → TTL —
  правило `error_reports.expireAt` «Serving».
- Откат: выкладка `submitClientReport` из среза до 98ff91799; TTL-правило выключить в консоли (Firestore → TTL).
- **Только по слову владельца — backfill старых обращений** (после выкладки `firestore:indexes`; скрипт — Авторизация fec90ac91):
  сначала просмотр `node scripts/error_reports_ttl_backfill_2026-10-13.mjs` — печатает scanned / alreadyHasExpireAt / spireSkipped /
  willSet / alreadyExpiredOnSet / oldestCreatedAt, ничего не пишет. Запись — `node scripts/error_reports_ttl_backfill_2026-10-13.mjs --apply --owner-yes`:
  батчи по 400, обход по `__name__` с курсором. Вход — `gcloud auth application-default login`, ключей нет. Уже просроченные получат
  `expireAt` в прошлом — TTL удалит их в течение ~24 ч. Жалобы Шпиля не трогаются. **Отменить нельзя.**

## Е: удаление аккаунта — строка журнала (необязательно, вместе с любой выкладкой)

`accountDeleteMine` + `accountDeleteWorker` — 31d16c4ac: если учётной записи входа уже нет, пишется `stage=auth_already_deleted`
(раньше — тишина). Поведение не меняется. Выложить можно тем же срезом:
`firebase deploy --only functions:accountDeleteMine,functions:accountDeleteWorker --project phraseman-ea0b3`.

## Откат

Предыдущая ревизия функции в Cloud Run (консоль) или повторная выкладка из среза коммита до b7c1fd1e8 / 7d9064944.

## Предполётная проверка 03:05 (Авторизация, по заданию координатора) — НИЧЕГО НЕ ВЫКЛАДЫВАЛОСЬ

`firebase deploy` не запускался, ключи и `functions/.env*` не читались и в срез не копировались (сборке они не нужны), эмуляторы не
поднимались. Пакет: `docs/work/tasks/deploy-morning-preflight-2026-10-13.md`.

| Проверка | Результат |
|---|---|
| Сборка функций — чистый срез `git -c core.autocrlf=false archive` + переходы node_modules, `PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1` + полный id, `npm --prefix functions run build` (как в разделе «Команда»), одна сборка при свободных ≥3 ГБ | **rc=0 за 32–38 с**, дважды: срез 0c3c5a61d и 91c80f60e (HEAD сдвинулся между прогонами). Все шаги: support-context, gate:spire-multilingual, tsc, копия ассетов (4/4 пула Шпиля), functions-runtime-parity |
| Экспорт каждой функции в собранном `functions/lib/functions/src/index.js` (это `main` пакета) под именем из `--only functions:<имя>` | **11/11 есть.** А: dialogueV2TextTurn, dialogueV2SessionComplete, reEngagePushCron · Б: premiumExpiryReminderCron · В: adminTranslateMessage, adminCreateAppMessage, adminUpdateAppMessage, adminLaunchVipSurveyCampaign · Д: submitClientReport · Е: accountDeleteMine, accountDeleteWorker |
| `firestore.indexes.json` на HEAD (блок Д) — синтаксис локально | JSON читается: 77 индексов, 80 fieldOverrides, повторов override нет. **`error_reports.expireAt` — `ttl: true`, `indexes: []`** (как у остальных 11 TTL-правил) |
| Тесты функций блоков, одна нить | **19 наборов, 322/322 зелёные:** dialogue_v2_turn_callable, _turn_coaching, _turn_coaching_provider, _turn_production_callable, dialogue_v2_session_complete_callable, re_engage_push, premium_expiry_cron, _cron_select, _phase2_cas, premium_expiry_reminder, _reminder_select, admin_app_messages, client_reports, log_ttl, account_delete_worker, account_delete, account_delete_job, account_delete_grace_login_contract, account_delete_tombstone_contract. Рабочая папка `functions/` = HEAD (незакоммиченного нет) |

Срез удалён правильно: сначала `rmdir` переходов, потом папка. Если утром HEAD снова сдвинется — повторять ничего не нужно, кроме
`git status --short functions/` (пусто) и, при новых серверных коммитах, сборки по разделу «Команда».

## Повторная предполётная проверка 04:35 (Ядро, после 007da73fa) — НИЧЕГО НЕ ВЫКЛАДЫВАЛОСЬ

Повод: в функции блока **А** добавлены строки причин сбоев (007da73fa: `[SERVER-CAUSE]` в Диалогах V2 и `reEngagePushCron`;
поведение и коды ответов прежние). Проверено тем же способом, что в 03:05.

| Проверка | Результат |
|---|---|
| Сборка функций — чистый срез HEAD **437edbd1d** (включает 007da73fa и d3dda10da), без `functions/.env*`, при свободных 3,55 ГБ, под слотом светофора | **rc=0 за 39 с.** Все шаги: support-context, gate:spire-multilingual, tsc, ассеты Шпиля 4/4, functions-runtime-parity |
| Экспорт 11 функций выкладки в `functions/lib/functions/src/index.js` | **11/11** (А: dialogueV2TextTurn, dialogueV2SessionComplete, reEngagePushCron · Б · В ×4 · Д · Е ×2) |
| Тесты функций, одна нить | **25 наборов, 403/403:** те же 19, что в 03:05, плюс dialogue_v2_session_completion_core, dialogue_v2_completion_server, dialogue_v2_memory_writer, dialogue_v2_memory_management, dialogue_v2_server_authorization и тест помощника swallowed_error_cause |
| Срез | удалён: сначала сняты переходы на `node_modules`, проверено, что их нет, потом удалена папка; `node_modules` репозитория на месте |

**Для выкладки:** команда из раздела «Команда» берёт текущий HEAD — новый срез соберётся сам. После выкладки в журнале функций искать
`[SERVER-CAUSE]` рядом с `[DIALOGUE-V2-COMPLETE] failed` / `[DIALOGUE-V2-TURN] failed`, чтобы видеть исходную причину.

## Выкладка 13.10 07:28–08:02 (Ядро) — блоки А, Б, В, Д, Е ВЫЛОЖЕНЫ

Решение владельца 13.10 ~07:05 «Да, всё одним заходом» (через координатора) и прямое подтверждение в сессии Ядра
«Да, выкладывай А Б В Д Е». Блок Г (сайт), backfill старых обращений и опрос осколков — НЕ выкладывались.
Срез **1cbbd489a** (`git -c core.autocrlf=false archive`, `.env*` скопированы без чтения, переходы на node_modules); серверных
коммитов после проверенного 437edbd1d нет; `dialogue_v2_embedded_release.ts --check` rc=0. Все команды — `--only` по именам,
`--non-interactive`, без `--force`.

| Время | Блок | Что ушло | rc | Проверка после |
|---|---|---|---|---|
| 07:28:30–07:32:58 | А | dialogueV2TextTurn, dialogueV2SessionComplete, reEngagePushCron | 0 (268 с) | новые ревизии 06:32:36Z, STARTUP probe с 1-й попытки, ошибок нет |
| 07:33:35–07:38:03 | Б | premiumExpiryReminderCron | 0 (268 с) | ревизия 06:37:45Z, STARTUP ok |
| 07:38:04–07:46:49 | В | adminTranslateMessage, adminCreateAppMessage, adminUpdateAppMessage, adminLaunchVipSurveyCampaign | 0 (525 с) | 4/4 «Successful update», STARTUP ok у всех четырёх |
| 07:47:07–07:48:03 | В | hosting:admin | 0 (56 с) | legacy.html 200, блок «EN · English» есть, `tr.claims.admin !== true` на месте, корень → /legacy.html (301) |
| 07:48:21–07:53:26 | Д | submitClientReport, firestore:indexes | 0 (305 с) | индексы развёрнуты; «6 field overrides … not present» — НЕ удалены (без --force); TTL `error_reports.expireAt` = CREATING (до 24 ч); первый вызов 06:54:57Z принят |
| 07:54:18–07:59:52 | Е | accountDeleteMine, accountDeleteWorker | 0 (334 с) | STARTUP ok у обеих |
| 08:01:51 | — | уборка среза | — | переходы сняты до удаления, рабочие node_modules на месте |

Что смотреть дальше: `[SERVER-CAUSE]` рядом с `[DIALOGUE-V2-COMPLETE] failed` / `[DIALOGUE-V2-TURN] failed`; через сутки — TTL
«Serving» (`gcloud firestore fields ttls list --collection-group=error_reports`); у нового обращения `expireAt` ≈ +30 дней.

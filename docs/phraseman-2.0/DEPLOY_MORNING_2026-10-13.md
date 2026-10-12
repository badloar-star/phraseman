# Утренняя прицельная выкладка (Ядро, 12.10 ночь) — для владельца

Выкладывает ВЛАДЕЛЕЦ (или координатор по его «да»). Ночью ничего не выкладывалось. Ключи и секреты сессия не читала.

## Что едет

| Функция | Что даёт | Коммиты (с прошлой выкладки) | Нужно «да» |
|---|---|---|---|
| `dialogueV2TextTurn` | «Почему так» — разбор наставником, не «я», конкретная фраза в кавычках языка; сервер больше не принимает от модели «диалог окончен» до последней цели (dialogs-038) | b7c1fd1e8 (acceptDialogueEnded), 6e89ed5cc (промпт). Группа Диалогов V2 выложена 11.10 10:2x–10:47 (реестр п.46), оба коммита позже — в проде их нет. Встроенный выпуск Диалогов не менялся. | общее «да» на выкладку |
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

## Команда (Git Bash, одна строка) — `dialogueV2TextTurn` + `reEngagePushCron`

> **Проверено 12.10 ~04:05 (Ядро):** срез коммита 5d62e7e38, выгрузка `git -c core.autocrlf=false archive`, переходы на
> node_modules, `PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1` + полный id → `npm --prefix functions run build` **rc=0 за 35 с**:
> support-context, gate:spire-multilingual, tsc (0 ошибок), копия ассетов, functions-runtime-parity — все шаги прошли.
> Выкладка не запускалась. Две первые проверки нашли и закрыли две поломки пути: нет .git в срезе и CRLF при выгрузке.

```bash
R=/c/appsprojects/phraseman; FULL=$(git -C $R rev-parse HEAD); D=/c/Temp/phraseman_deploy/${FULL:0:9}; [ ! -e "$D" ] && mkdir -p "$D" && git -C $R -c core.autocrlf=false archive $FULL | tar -x -C "$D" && cp $R/functions/.env $R/functions/.env.phraseman-ea0b3 "$D/functions/" && W=$(cygpath -w "$D") && powershell -NoProfile -c "New-Item -ItemType Junction -Path '$W\functions\node_modules' -Target 'C:\appsprojects\phraseman\functions\node_modules' | Out-Null; New-Item -ItemType Junction -Path '$W\node_modules' -Target 'C:\appsprojects\phraseman\node_modules' | Out-Null" && cd "$D" && export PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1 PHRASEMAN_SUPPORT_RELEASE_COMMIT=$FULL && npx tsx scripts/dialogue_v2_embedded_release.ts --check && firebase deploy --only functions:dialogueV2TextTurn,functions:reEngagePushCron --project phraseman-ea0b3
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

Затем админка (hosting цель `admin` = папка `admin/v2`, только она):

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
из коммита — тем же чистым срезом, что выше (папка `$D` уже есть):

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

## Откат

Предыдущая ревизия функции в Cloud Run (консоль) или повторная выкладка из среза коммита до b7c1fd1e8 / 7d9064944.

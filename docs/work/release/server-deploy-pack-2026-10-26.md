# Выкладка сервера: что ждёт «да» владельца (утро 26.10)

Governance-ID: TG-E27B29F54B3D
Составил: 1 · ЯДРО, 25.10 вечер. Только документ — ничего не выложено.

**Одна кнопка утром** — шаг 2 ниже (функции + админка + сайт одной командой).
Перед ней:
- 🟢 Ревизора на финальный HEAD;
- сухой прогон той же строки без `--execute`.

App Check не включается (пломба).

## Что на бою сейчас

- 25.10 08:30 — функции + правила + storage + админка из **fb61aa1f6** (журнал `deploy_2_0_2_server.log`).
- 25.10 12:17 — 20 функций поддержки из **73c7afe54** (журнал `deploy_support_2026_10_25.log`). Ответ про Plus через
  Telegram-бот (29c5c251a) уже на бою, в пакет не входит.
- Сайт knowlyapps.com: политика без трёх последних правок (см. «Политика на сайте»).
- Пик: место в комнате недели на бою уже считается **по ступеням**. `config/spire_v1.rankBy` не задан, по умолчанию ступени.
  Переключать конфиг не нужно.

## Состав пакета

| # | Коммит | Что меняется для человека | Функции | Старые клиенты 2.0.1/2.0.2 |
|---|---|---|---|---|
| 1 | **713677ddd** вариант Б удаления | После «Удалить аккаунт» через Google/Apple можно передумать 14 дней: тот же вход → «Восстановить аккаунт?» → всё на месте. Сейчас это обещание не работает ни для одного аккаунта Google/Apple. Гости и новая кнопка «Удалить навсегда сейчас» удаляются сразу. | `accountDeleteEnqueue`, `accountDeleteCredentialStatus`, `accountDeleteWorker` | 🟢 Старые не шлют `deleteNow` → всегда 14 дней. Окно «Восстановить аккаунт?» в них уже есть (`account_delete_restore_client.ts` в обеих сборках). После удаления человека выкидывает со всех устройств (отзыв сессий), данные закрыты маркером удаления в правилах. |
| 2 | **0750164ff** шлюз отсрочки | Аккаунт, ждущий удаления, не может крутить рулетку друзей, получать спин за приглашение, покупать за руны наборы сообщества и сохранять фразы дня. | `referralSpin`, `referralClaimSpin`, `communitySyncPackRuneSale`, `dailyPhraseSetSaved` | 🟢 Отказ получает только тот, кто ждёт удаления, а он и так не может войти. Остальным — без изменений. |
| 3 | **d0da78392** подтяжка «навсегда» | Купил Plus, пока аккаунт ждал удаления, потом восстановил → Plus возвращается сразу при входе. Раньше подписка возвращалась через 6 ч, а «навсегда» не возвращался никогда. | `revenueCatPremiumReconcileMine`, `accountDeleteRestoreMine` | 🟢 Клиент читает только `ok`/`active`/`reconciled`; новые `plan`/`reason` не мешают. |
| 4 | **aafa29de4** (+e00c839e0) перевод в свободном диалоге | Кнопка «Перевести» под репликой собеседника в открытом разговоре — перевод на язык интерфейса по тапу. | `dialogueV2FreeformTranslate` (**новая**, создаётся впервые) | 🟢 Ответ хода не меняется (e00c839e0 откачен в aafa29de4). Старые клиенты новую функцию не зовут. Ход (`dialogueV2FreeformSessionTurn`) выкладывать не нужно: в нём добавлен только экспорт помощника. |
| 5 | **9a59c27b6** ступени в лесенке | В окне итога недели у каждого в лесенке видно число ступеней. | `spireFinalizeCron` | 🟢 Разбор лесенки в 2.0.1/2.0.2 берёт поля поимённо, без проверки ключей. |
| 6 | **ec03e9e58 + ccd507589** «золотое задание» Пика (пропущено в списке координатора) | Пока ничего: включается флагом `spire_gold` (ВЫКЛ). После включения ~30 % ступеней — ×2 монеты за верный ответ, не больше 3 в день. | `spireReportSteps` | 🟢 Двойной замок: флаг ВЫКЛ, и телефон показывает золото, только если сервер прислал `goldRule`. Ответ Пика старые клиенты не проверяют по ключам (проверено на a78dbec4d). Не хотите — уберите `spireReportSteps` из строки, остальное от него не зависит. |
| 7 | админка (Пульт) после fb61aa1f6 | Переключатели новых флагов в Пульте, 20 ответов поддержки (be3c2a3f0), политика в `oauth-privacy.html`. | `hosting:admin` | — |
| 8 | политика 14dd45fd9 + 7868dd51c + 13ea0d2ca | См. «Политика на сайте». | `hosting:knowlywww` | — |
| 9 | **51884d675** сводка «Восстановить аккаунт?» (5 · ВХОД) | Пока ничего: новое окно включается флагом `account_delete_variant_b_ui_enabled` (ВЫКЛ). После включения в окне восстановления видно «серия · фразы · урок N из 32». Одно чтение `users/{stableUid}` только при входе в удаляемый аккаунт; сбой — окно без цифр. | `accountDeleteStatusMine` | 🟢 Новое поле `summary` в ответе; старые клиенты его не читают. |

### Дописано ночью 26.10 (Ядро) — отдельной кнопкой, шаг 2б

Строки ниже **не входят** в команду шага 2. Это отдельная команда (шаг 2б), её выкладывают по отдельному «да». Все три —
только код, без новых чтений и без новых данных.

| # | Коммит | Что меняется для человека | Функции | Старые клиенты 2.0.1/2.0.2 |
|---|---|---|---|---|
| 10 | **99637a1a6** права до разбора команды (безопасность, Ревизор L732) | Для админа ничего. Не-админ, вызвавший админскую выдачу Plus или бан с кривой командой, раньше получал «неверный аргумент», а с правильной — «нет прав», и по этой разнице мог подбирать формат. Теперь любой не-админ получает только «нет прав». Ревью безопасности — у Ревизора (передаёт координатор). | `adminGrantAccess`, `adminSetUserBan` | 🟢 зовёт только админка |
| 11 | **43053dbd5** настоящий срок Plus для кольца | Кольцо Plus у аватара подписчика гаснет само, когда подписка кончилась. Раньше сервер считал срок подписки «бессрочным» (`premium_expiry='0'`), и кольцо горело вечно. Та же ошибка была у старого админского гранта со сроком. | `publicProfileProjectMine`, `adminGrantAccess`, `revenueCatShardsWebhook`, `premiumExpiryCron`, `adminGetUserProfile`, `adminSearchUsers` | 🟢 клиент читает тот же `plusUntilMs` |
| 12 | **c0473f366** журнал `[FREEFORM-PLUS]` | Для человека ничего. В журнале появляется, чей отказ «нужен Plus» в свободном разговоре и какое поле подписки его решило: 48 отказов за 3 дня шли очередями по 13–18 попыток. | `dialogueV2FreeformSessionStart`, `dialogueV2FreeformSessionTurn` (`dialogueV2FreeformTranslate` из строки 4 получит то же из HEAD) | 🟢 ответ не меняется |
| 13 | **(хэш после коммита)** пуш «серия ждёт» без обещания урока (Переводчик 7398140e4) | Пуш `streak_at_risk` уходит всем курсам, включая es/fr/de/it, где «Уроков» нет (D129/D130), а на 6 языках обещал «урок». Новое тело ×9: «Пара минут сегодня — и серия растёт.» Заголовок «🔥 Серия N дней ждёт тебя» прежний. Правда по коду: день засчитывает любое учебное действие — урок, карточки, «Мои ошибки», диалог, ступени Пика. **Риск:** только текст. **Откат:** revert и выкладка одной функции. | `reEngagePushCron` | 🟢 клиент текст не читает: тап ведёт туда же |

Сухой прогон шага 2б — без `--execute`; кнопка — та же строка с `--execute`:
```bash
bash scripts/deploy_from_clean_head.sh --only "functions:default:adminGrantAccess,functions:default:adminSetUserBan,functions:default:publicProfileProjectMine,functions:default:revenueCatShardsWebhook,functions:default:premiumExpiryCron,functions:default:adminGetUserProfile,functions:default:adminSearchUsers,functions:default:dialogueV2FreeformSessionStart,functions:default:dialogueV2FreeformSessionTurn,functions:default:reEngagePushCron"
```
Проверка после (журналы, только чтение):
- `[ADMIN-PLUS]` `step: in / out` — выдача Plus из админки проходит как раньше;
- кольцо Plus у тестового подписчика с истёкшим `premium_rc_expiry_ms` погасло после `publicProfileProjectMine`;
- `[FREEFORM-PLUS] refused` с полями `branches` при очередном отказе.

Откат — `git revert` нужного коммита и та же строка `--only` только с его функциями.

**Можно вычеркнуть (решает владелец):** «золотое задание» — `functions:default:spireReportSteps` (строка 6). Убрать его из
строки шага 2 — остальной пакет от него не зависит, флаг `spire_gold` просто останется без сервера.

**Исключено намеренно:** `accountsV2SyncApply`. Шлюз в него добавлен (0750164ff), но на бою функции **нет**: выкладка создала бы
новую функцию, а Accounts V2 выключен (`config/accounts_v2` нет). Выложить её вместе с запуском Accounts V2.

## Порядок

1. **Сухой прогон** (ничего не выкладывает): сверка «бой vs HEAD», сборка, команда.
   Замер 25.10 19:45: `OK`, создаётся только `dialogueV2FreeformTranslate`.
   ```bash
   bash scripts/deploy_from_clean_head.sh --only "functions:default:accountDeleteWorker,functions:default:accountDeleteEnqueue,functions:default:accountDeleteCredentialStatus,functions:default:accountDeleteRestoreMine,functions:default:accountDeleteStatusMine,functions:default:revenueCatPremiumReconcileMine,functions:default:referralSpin,functions:default:referralClaimSpin,functions:default:communitySyncPackRuneSale,functions:default:dailyPhraseSetSaved,functions:default:dialogueV2FreeformTranslate,functions:default:spireFinalizeCron,functions:default:spireReportSteps,hosting:admin,hosting:knowlywww"
   ```
2. **Кнопка владельца** — та же строка с `--execute`:
   ```bash
   bash scripts/deploy_from_clean_head.sh --only "functions:default:accountDeleteWorker,functions:default:accountDeleteEnqueue,functions:default:accountDeleteCredentialStatus,functions:default:accountDeleteRestoreMine,functions:default:accountDeleteStatusMine,functions:default:revenueCatPremiumReconcileMine,functions:default:referralSpin,functions:default:referralClaimSpin,functions:default:communitySyncPackRuneSale,functions:default:dailyPhraseSetSaved,functions:default:dialogueV2FreeformTranslate,functions:default:spireFinalizeCron,functions:default:spireReportSteps,hosting:admin,hosting:knowlywww" --execute
   ```
   Почему одной командой: связки внутри пакета не ломаются, если функции встанут с разницей в секунды.
   - Воркер и постановка задачи удаления: новая причина «удалить сейчас» нужна обоим. Шлёт её только новый экран за
     выключенным флагом.
   - Восстановление и подтяжка: каждая работает и без другой.

   После выкладки скрипт сам зовёт `check_callable_invoker` — для новой `dialogueV2FreeformTranslate` нужно право
   `allUsers`.
3. **Проверка после** (журналы, только чтение):
   - `[ACCOUNT-DELETE]`: у новой задачи не-гостя — отзыв сессий, без удаления пользователя Auth;
   - `[ACCOUNT-GATE] reject` — только у аккаунтов в отсрочке;
   - `[PREMIUM-RECONCILE]` — без ошибок `revenuecat_v2_*`;
   - `dialogueV2FreeformTranslate` отвечает (вызова не будет, пока флаг выключен);
   - `[SPIRE-REPORT]` без роста отказов;
   - сайт: на knowlyapps.com/legal/privacy/ дата October 25, 2026 и абзац про «delete now».

## Утренний список владельца — вне кнопок

- **Дать права ключу отправки в Play Console** (только владелец; Ядро в Play Console ничего не трогает).
  - Сейчас 2.0.2 (144) в Play не загружен: `eas submit android` → 403 PERMISSION_DENIED. Автоотправка 142 от 21.10 тоже
    ERRORED, поэтому в Play стоит версия старше 142 — номер виден в Play Console.
  - Ключ отправки — Firebase Admin SDK, прав в Play Console у него нет. Решение владельца 25.10 10:45 — отправлять кодом,
    без ручной загрузки.
  - Что сделать: Play Console → «Пользователи и разрешения» → пригласить сервисный аккаунт ключа отправки EAS с правом
    выпуска в production. Либо выпустить отдельный ключ Google Play Android Developer API и загрузить его в EAS.
  - Затем — `eas submit android` с `releaseStatus=completed`. Готовый `.aab` лежит в `C:\Temp\claude\aab_2_0_2\`.

## Кнопка 2 — ротация ключа отписки (EMAIL_UNSUBSCRIBE_*), отдельно от шага 2

Governance-ID: TG-8DCB1356A853. Основа — `docs/work/tasks/email-unsubscribe-secret-rotation-2026-10-25.md` (Learning V2).

- **Что меняется для человека:** ничего видимого. Ссылки «отписаться» из уже отправленных писем работают и после смены
  ключа: проверка знает текущий и прошлый ключ.
- **Зачем:** оба ключа лежат открытой переменной окружения у всех 9 функций content. Они попали туда из локального
  `functions-content/.env`, когда выкладка шла из рабочего дерева. Кто видит настройки функции, тот видит ключ и может
  подделать отписку.
- **Код готов:**
  - ключ читается только через `defineSecret` (`functions/src/email_unsubscribe.ts`, тесты `email_unsubscribe.test.ts`);
  - скрипт выкладки для content берёт только `functions-content/.env.<проект>` (b0b425334);
  - сторож этого правила — `tests/deploy_content_env_secret_contract.test.mjs`.
- **Порядок важен, каждый шаг — по «да» владельца:**
  1. Локально (не прод): удалить из `functions-content/.env` строки `EMAIL_UNSUBSCRIBE_SECRET=` и
     `EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET=`. Вторая защита от ручной выкладки из дерева.
  2. **Новый ключ в Secret Manager** (запись в прод, значение не выводится на экран). Сначала 2а, потом 2б: в промежутке
     функции работают на закреплённой v1.
     ```bash
     gcloud secrets versions access latest --secret=EMAIL_UNSUBSCRIBE_SECRET --project phraseman-ea0b3 | gcloud secrets versions add EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET --data-file=- --project phraseman-ea0b3
     ```
     Новый ключ живёт только во временном файле внутри подоболочки. Файл доступен лишь владельцу (`umask 077`) и
     удаляется `trap` на выходе — и после успеха, и при ошибке или прерывании:
     ```bash
     ( umask 077; EU_NEW="$(mktemp)"; trap 'rm -f "$EU_NEW"' EXIT; node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))" > "$EU_NEW" && gcloud secrets versions add EMAIL_UNSUBSCRIBE_SECRET --data-file="$EU_NEW" --project phraseman-ea0b3; rm -f "$EU_NEW" )
     ```
  3. **Выложить 5 потребителей** — они закрепят новые версии. emailUnsubscribe в том же пакете, чтобы проверка знала оба
     ключа. Сначала сухой прогон без `--execute`.
     ```bash
     bash scripts/deploy_from_clean_head.sh --only "functions:default:emailUnsubscribe,functions:default:webLeadCapture,functions:default:webLeadNudgeCron,functions:default:adminEmailBroadcast,functions:default:adminEmailContactsBackfill" --execute
     ```
  4. **Убрать открытую переменную** — перевыложить 9 функций content без неё:
     ```bash
     bash scripts/deploy_from_clean_head.sh --only "functions:content:adminConfirmV2OwnerEpisode,functions:content:adminGetV2OwnerGeneratorSetupCatalog,functions:content:adminImportV2OwnerEpisodeStage,functions:content:adminPublishAuthoredLearningV2Course,functions:content:learningV2ActivityAuxiliarySessionGetV1,functions:content:learningV2ActivityReleasedSessionGetV1,functions:content:learningV2CourseActiveCatalogGetV1,functions:content:learningV2CourseReleasedSessionGetV2,functions:content:learningV2CourseReleasedSessionGetV3" --execute
     ```
     V4 сюда не входит: создаётся только по отдельному «да» владельца.
  5. **Проверка** (только чтение):
     - открытых `EMAIL_UNSUBSCRIBE_*` в env нет ни у одной функции, у 5 потребителей — ссылки на секрет с новыми версиями;
     - `emailUnsubscribe` с заведомо неверным токеном отвечает «ссылка недействительна», не 500;
     - 30 минут нет `EMAIL_UNSUBSCRIBE_SECRET is not configured` и 5xx;
     - занятие Learning V2 открывается (V3).
  6. **Только после проверки** — выключить старые версии v1 обоих секретов: значение v1 уже живёт в PREVIOUS v2.
     Раньше нельзя: выключенная закреплённая версия ломает холодный старт.
     ```bash
     gcloud secrets versions disable 1 --secret=EMAIL_UNSUBSCRIBE_SECRET --project phraseman-ea0b3 && gcloud secrets versions disable 1 --secret=EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET --project phraseman-ea0b3
     ```
- **Откат:**
  - до шага 6 — вернуть прежний ключ новой версией трубой (`versions access 1 … | versions add …`) и перевыложить 5
    потребителей;
  - content — перевыкладка тем же скриптом; возвращать секреты в env не нужно.
- **Связь с шагом 2:** независимы, ни одной общей функции. Удобно сразу после шага 2.

## Флаги на клиенте — включать ПОСЛЕ

Код этих экранов едет следующим OTA (ведомость `OTA_READY_LEDGER_2026-10-25.md`), в сборке 2.0.2 его нет. Флаг включать
только когда выполнены оба условия: функции выложены (шаг 2) и OTA с этим кодом вышел.

| Флаг (Пульт) | Что включает | Условие |
|---|---|---|
| `account_delete_variant_b_ui_enabled` | Окна удаления варианта Б, кнопка «Удалить навсегда сейчас» | Шаг 2 + OTA. В тот же день снять из политики оговорку «Where available in the app» (коммит + `npm run legal:sync` + `hosting:admin,hosting:knowlywww` + OTA с копией политики в приложении). |
| `dialogue_freeform_translate_enabled` | «Перевести» в открытом разговоре | Шаг 2 + OTA + проверка права вызова новой функции. |
| `spire_gold` | «Золотое задание» ×2 | Шаг 2 + OTA. До выкладки `spireReportSteps` телефон сам ничего не покажет (`server_too_old`). |
| `apple_signin_revoke_enabled` | Отзыв Sign in with Apple при удалении | **Не из этого пакета:** нужен ключ Apple в консоли Firebase и фраза об отзыве в политике — до включения. |

## Политика на сайте — вместе с вариантом Б

Живая knowlyapps.com/legal/privacy/ (сверка 25.10 19:40) — версия от October 24. В HEAD (October 25) ещё три правки:
- **14dd45fd9** — особые темы открываются достижениями, особыми условиями или активной подпиской Plus. Премиум-темы на бою
  с 08:30 25.10, политика это ещё не говорит.
- **7868dd51c** — рядом с 14 днями — возможность удалить сразу («cannot be restored»), плюс страница data-deletion.
- **13ea0d2ca** — перед «удалить сразу» стоит «Where available in the app», пока кнопки в приложении нет.

С оговоркой текст верен и до, и после включения кнопки, поэтому сайт выкладывается тем же шагом 2 (`hosting:knowlywww`).
Оговорку снимаем в день включения `account_delete_variant_b_ui_enabled`.

## Откат

Скрипт выкладывает только HEAD: откат = `git revert` нужного коммита + та же строка `--only` только с его функциями +
`--execute`.
- **Вариант Б.** Revert 713677ddd возвращает удаление пользователя Auth сразу. Задачи, поставленные за время работы Б,
  удалятся воркером в срок, как и раньше.
- **Шлюз, подтяжка, ступени, золото.** Revert без последствий для данных: золото за флагом, ступени — добавочное поле.
- **Новая `dialogueV2FreeformTranslate`.** Флаг не включать. Удалить функцию — `firebase functions:delete
  dialogueV2FreeformTranslate --region us-central1` по слову владельца.
- **Сайт и админка.** Revert правки + `hosting:admin` / `hosting:knowlywww`.

## Важно знать до утра

- **Итоги W43 — без ступеней (решено координатором 25.10: до 00:01 UTC не выкладываем, выкладка сервера только по «да»
  владельца).** `spireFinalizeCron` бежит по понедельникам в 00:01 UTC. В итогах 2026-W43 ступеней в строках лесенки не
  будет: клиент скроет числа («Считаем места недели…»). Места и так считаются по ступеням. Со ступенями — итоги 02.11.

## Пятеро в отсрочке — ручная починка, решение владельца

**Кто.** 5 задач удаления в очереди, сроки 28.10–06.11. Вариант Б им не поможет: пользователя Auth удалил ещё старый
код при постановке задачи. Тот же вход Google/Apple создаст НОВОГО пользователя, и «Восстановить аккаунт?» его не найдёт.
В срок воркер сотрёт данные, как они и просили.

**По умолчанию ничего не делаем** — человек сам попросил удаление. Чинить только если он напишет в поддержку «хочу
вернуть аккаунт» до своего срока.

**Что сделать по такой просьбе** (готовой кнопки в админке нет):
1. Человек входит тем же Google/Apple. Появится новый пользователь Auth (новый uid) — его uid берём из обращения или из
   админки.
2. Снять удаление старого аккаунта — те же записи, что делает `accountDeleteRestoreMine`, в одной транзакции:
   - удалить `account_deletion_jobs/{jobId}` (по старому authUid), `account_deletion_tombstones/{stableUid}` и
     `account_deletion_auth_markers/{старый authUid}`;
   - удалить постоянные отказы `account_deletion_permanent_denials/*` для identityClosure задачи;
   - удалить `revenuecat_reconcile_reservations/{id}`, чтобы Plus вернулся сразу;
   - записать след в `account_deletion_restores`.
3. Привязать новый вход к старому аккаунту — `adminRepairAuthLink` в админке (право `users.auth_repair`, аудит в
   `admin_log`).
4. Человек перезапускает приложение → видит свой прогресс; Plus возвращает подтяжка.

Шаг 2 — ручные записи в прод. Если владелец решит, что это нужно хотя бы одному из пятерых, Ядро сделает админскую
кнопку «Вернуть аккаунт из отсрочки» (тот же код, что у `accountDeleteRestoreMine`, плюс аудит). Без неё руками —
только по прямому «да» владельца на каждого.

## Ещё
- **Кодовая база content.** На бою 9 функций, в HEAD 10: V4 Learning V2 по-прежнему не выложена, отдельно от этого пакета.

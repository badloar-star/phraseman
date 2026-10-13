# Политика конфиденциальности против R1 — сверка 13.10 (дополнение к PRIVACY_R1_GAP.md)

Источник истины политики — `legal/privacy_policy_en.json` и `legal/privacy_policy_en_ios.json` (копии в `app/legal/` совпадают;
HTML и сайт генерирует `npm run legal:sync`). iOS-вариант отличается от основного только платформенными абзацами (реклама, IDFA,
ATT) — в разделах ниже совпадает. **Файлы политики не менял и ничего не публиковал** — решение владельца.

Основа — прошлая сверка `PRIVACY_R1_GAP.md` (11.10, пункты П1–П9); её дополнения наложены 12.10 (63a968bad), поддержка — 14e128285,
98ff91799. Ниже — только то, что координатор назвал в 13.10, проверено по коду.

## Итог

| # | Пункт | Покрыт? | Что не так |
|---|---|---|---|
| 1 | Журнал диагностики в обращении (по умолчанию включён, 30 дней — п.84) | **Почти** | Политика: «lets you view the entries before you send». Форма показывает только **последние 12** записей (`app/support_report.tsx:274` `events.slice(-12)`), а уходит до 200 (`app/support_diagnostic_schema.ts:2`). Включение по умолчанию («Unless you switch it off»), 24 ч / 200 записей / ~64 КБ (`app/support_diagnostics.ts:19-21`) и удаление через 30 дней (`functions/src/client_reports.ts:369`, TTL) — описаны верно. |
| 2 | Согласие на аналитику (057dfb6ac) | Да | §10: согласие, отзыв, запись выбора. 057dfb6ac — исправление гонки (отзыв больше не теряется), политика уже обещает именно это. |
| 3 | Журнал ошибок и действий в облаке | Да | §10 «our own limited app activity/error logs», §19 «deleted automatically 90 days» — TTL есть (`client_reports.ts:417-418, 434-435`, `logExpireAt`). |
| 4 | Шпиль (ник и место видны другим) | Да | §5: ник, аватар, стиль, ступени, место, итог недели, боты в комнатах, удаление записи вместе с аккаунтом. |
| 5 | Публичные наборы сообщества и отклики | Да | §6: публикация, комментарии, видимость, ИИ-проверка и перевод, озвучка карточек. §11: отзывы-оценки уроков через ИИ. |
| 6 | Голос в Диалогах | **Почти** | Код: запись лежит в кэше телефона только для «Послушай себя» и стирается, если реплику отредактировали (`app/ai_dialog_session.tsx:1592-1606`, `app/speaking_recognition_options.ts:154-159`); в Диалоги уходит только распознанный текст. На Android распознавание идёт системным распознавателем (может работать через сервис Google — `speaking_recognition_options.ts:143-148`). Политика (§13) про сервисы платформы пишет в общем виде и **не говорит, что запись голоса хранится на телефоне и не отправляется Knowly**. |
| 7 | Удаление аккаунта и журнал удаления (блок Е) | **Почти** | §20 полно описывает 14 дней, гостя, повтор запроса. **Не сказано**, что после удаления остаётся запись о самом удалении: `account_deletion_log` — необратимые отпечатки (SHA-256) идентификаторов, дата, причина; без срока хранения (`functions/src/account_delete.ts:1717-1724`). Также записи заявки и восстановления (`account_deletion_jobs`, `account_deletion_restores`). |

## Предлагаемые правки текста

### П-1. Поддержка: что можно просмотреть → §10, абзац «Support diagnostics»

Вариант А (текст под код, рекомендую — без правки приложения):
- **en:** заменить «lets you view the entries before you send» на «lets you view the most recent entries before you send».
- **ru (черновик):** «…позволяет посмотреть последние записи перед отправкой…».

Вариант Б (код под текст): показать в форме все записи (до 200) — это правка `app/support_report.tsx` (вид экрана → нужен макет).

### П-2. Голос в Диалогах → §13, после абзаца о распознавании речи

- **en:** «In AI dialogues, when you answer by voice, the recording is kept only in the App's temporary storage on your device so that you can play your own message back, and it is removed when it is no longer needed; Knowly does not receive the recording. Only the recognised text of your answer is sent, as described in the AI features section. On Android, speech recognition uses your device's system speech recognizer, which may be provided by Google and may process your voice under its own terms.»
- **ru:** «В ИИ-диалогах, если ты отвечаешь голосом, запись хранится только во временной папке приложения на телефоне, чтобы ты мог прослушать своё сообщение, и удаляется, когда больше не нужна; Knowly эту запись не получает. Отправляется только распознанный текст ответа — как описано в разделе об ИИ. На Android распознавание речи выполняет системный распознаватель устройства; его может предоставлять Google, и он может обрабатывать голос по своим правилам.»

### П-3. Запись о выполненном удалении → §20, после абзаца «Once the 14 days elapse…»

- **en:** «After deletion we keep a minimal record that a deletion took place: one-way cryptographic hashes of the account identifiers (which cannot be turned back into them), the date and the reason. We keep it to demonstrate that your request was completed and to prevent abuse; it contains no profile, progress or content. While a deletion is pending we also keep the deletion request itself (account identifiers and the scheduled date) so it can run or be cancelled if you restore the account.»
- **ru:** «После удаления мы храним минимальную запись о том, что удаление состоялось: необратимые отпечатки идентификаторов аккаунта (из них нельзя восстановить сами идентификаторы), дату и причину. Это нужно, чтобы подтвердить выполнение запроса и предотвращать злоупотребления; профиля, прогресса и контента в записи нет. Пока удаление ожидает срока, мы также храним саму заявку (идентификаторы аккаунта и дату), чтобы выполнить её или отменить при восстановлении аккаунта.»
- В §19 (Retention) можно добавить строку: «A minimal deletion record (hashed identifiers, date, reason) is retained to demonstrate completed deletion requests.»

## Порядок, если владелец согласится

1. Внести П-1…П-3 в `legal/privacy_policy_en.json` **и** `legal/privacy_policy_en_ios.json` (одинаковые абзацы).
2. `npm run legal:sync` → `app/legal/*.json`, `privacy.html`, `admin/oauth-privacy.html`, `knowly-www/legal/*`.
3. Публикация hosting `knowly-www` — по решению владельца.
4. Формы магазинов (`STORE_PRIVACY_FORMS_R1.md`): П-2 и П-3 категорий данных не меняют (запись голоса не уходит с телефона; хэши — не персональные данные в формах).

## Что не проверялось

Настройки TTL в живом Firestore (только `firestore.indexes.json`), поведение системного распознавателя на конкретных телефонах, тексты сайта
вне репозитория.

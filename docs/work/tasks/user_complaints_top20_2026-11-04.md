# Выжимка ошибок и жалоб за 7 дней (04.11.2026) — для сценариев E2E

Governance-ID: TG-F72367B52155
Status: Done (read-only)
Owner: 1 · ЯДРО (поручение координатора, пилот E2E)

## Outcome
Топ типов ошибок из `app_errors` за 7 дней (последние 1000 записей по `createdAtMs`, чтение с where/limit, без записей).
Всего 923 записи; замороженный Learning V2 исключён (325 записей); осталось 598. Разных типов всего 9 (меньше 20).
Telegram-алерты нигде не логируются отдельно (источник один — `app_errors`); коллекцию пользовательских репортов не читал.

## Scope
Только чтение: `app_errors`. Платформа/версия — из полей записи. Экран заполнен у немногих (friends, root).

## Architecture
Источник: `app_errors` (поля: feature, context, severity, screen, platform, appVersion, message). Группировка: severity | feature | context.

## Security and privacy
Uid, имена и тексты пользователей в выжимку не вошли; приведены только типы, числа и обезличенные примеры.

## Technical debt
Нет сохранённой истории алертов Telegram; для повторения выборки нужен тот же запрос.

## Verification
Скрипты чтения/группировки одноразовые (scratchpad); итоговые числа ниже.

## Rollback
Файл-справка, откат не требуется.

## Топ типов (после исключения V2)
| № | Число | Тип (severity / feature / context) | Платформы | Версия | Что это |
|---|---|---|---|---|---|
| 1 | 417 | critical / mistakes_hub / `mistakes_hub:load_ceiling` | android 362, ios 55 | 2.0.3 | Хаб «Мои ошибки»: потолок загрузки, `reconcile:done reason=silent_retry` — экран долго собирался и ушёл в тихий повтор. 70 % всех ошибок. |
| 2 | 105 | critical / speak_mic / `speak_mic:no_speech_no_wav` | android 105 | 2.0.3 | Микрофон «Скажи вслух»: записи нет (удержание ~0,15 с, звука нет). |
| 3 | 40 | critical / speak_mic / `speak_mic:no_speech_timeout` | android 40 | 2.0.3 | Распознавание речи: таймаут (удержание ~1,3 с, ответ судьи ~6,7 с). |
| 4 | 27 | critical / speak_mic / `speak_mic:no_speech_empty_transcript` | android 27 | 2.0.3 | Распознавание вернуло пустой текст (удержание ~1,4 с, 3 слова цели). |
| 5 | 3 | warning / friends / `friends:auth_link_failed` | android 2, ios 1 | 1.5.63, 1.5.60 | «Друзья»: привязка аккаунта недоступна (старые версии). |
| 6 | 2 | critical / react / `react:error_boundary` | ios 2 | 2.0.3 | «Rendered fewer hooks than expected» — падение интерфейса на корневом экране (iOS). |
| 7 | 2 | warning / friends / `friends:accept_request_failed` | ios 2 | 2.0.3 | Принять заявку в друзья: `permission-denied` (Firestore). |
| 8 | 1 | critical / auth / `auth:signin_failure` | ios 1 | 2.0.3 | Вход: `remote_stable_link_failed:account_delete_pending` (аккаунт на удалении). |
| 9 | 1 | critical / speak_mic / `speak_mic:no_speech_threw` | android 1 | 2.0.3 | Микрофон: исключение при распознавании. |

## Под какие сценарии это просится
- «Мои ошибки» (хаб): открыть на аккаунте с накопленными ошибками на Android и iOS, дождаться загрузки; ожидание — без «потолка загрузки», список появляется из кэша мгновенно.
- «Скажи вслух»: короткое и длинное удержание кнопки на Android; без разрешения на микрофон; тихая речь.
- Друзья: принять заявку (ios), привязка аккаунта на старых версиях.
- Корневой экран iOS: запуск, возврат из фона (hooks-ошибка границы).
- Вход при аккаунте, поставленном на удаление.

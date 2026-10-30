# YouTube: ограниченные порции и короткие ответы автора

Изменение по запросу владельца от 30 октября 2026: загружать 10, 20, 30, 40, 50 или 100 комментариев, по умолчанию 50; готовить ответы только для текущей порции; писать коротко, дружески, без официального и шаблонного тона.

## Реализовано

- Сервер ограничивает запрос Firestore выбранным размером. Значения вне списка отклоняются до чтения комментариев. Канал фильтруется на сервере.
- Интерфейс выполняет один запрос на порцию, заменяет текущие строки при переходе и сохраняет несохранённые правки отдельно. Автоматического обхода всей коллекции нет.
- Генерация и повторная подготовка ограничены текущей порцией. Готовые ответы не перезаписываются обычной подготовкой новых; для этого есть отдельная команда повторной подготовки.
- Обновление и загрузка истории YouTube имеют общий бюджет N комментариев за нажатие, включая продолжение ответов в обсуждениях. Курсоры истории сохраняются для следующего нажатия.
- Изменение одного ответа обновляет один документ через `op: row`, сохраняя существующую проверку админского разрешения.
- Запуск очереди фиксирует одобренные ID текущей порции. Он не подхватывает другие страницы или позднее одобренные строки. Ручное одобрение, серверные ревизии и проверка отправки сохранены.
- Новый системный промпт: обычно одна реплика 3–20 слов; не больше двух коротких предложений, 40 слов и 320 символов. Юмор, благодарность и мягкий сарказм выбираются по ситуации. Лишние вступления, пересказ, канцелярские благодарности и вопросы для вовлечения запрещены.
- Слишком длинный или оборванный ответ не становится готовым черновиком для одобрения. Сохраняются `SKIP_REPLY`, `NEEDS_REVIEW`, продуктовые факты владельца и запрет на выдуманные обещания.
- Сохранены предыдущие локальные улучшения кэша, редактирования, повторной генерации и обработки конфликтов. Фильтр канала аналитики обращений отделён от курсора комментариев.

## Источник и границы

Во время выполнения live-функция и live-админка были новее GitHub. В `functions/src` этой ветки не было исходников `youtube_comments.ts` и `youtube_reply_instructions.ts`; YouTube JS/CSS также отсутствовали в GitHub. Старый `legacy.html` из ветки нельзя использовать для полного Hosting deploy: он отстаёт от рабочей админки. Этот change не переписывает его.

`base/youtube_comments.js` и `base/youtube_reply_instructions.js` — точная нормализованная копия двух модулей из опубликованного архива функции; `base/youtube-comments.js` и CSS — последняя локальная версия интерфейса с сохранёнными предыдущими улучшениями. `prepare_change.py` воспроизводит правки с проверками точных исходных участков. Публикуемый frontend также находится в `admin/v2/scripts/pages/`.

Backend сохранён как патч действующего compiled bundle, а не как выдуманный TypeScript-исходник. Перед возвратом к общему deploy из репозитория необходимо синхронизировать действительные исходники более новой админки и YouTube codebase. Не выполнять полный deploy старого состояния ветки.

## Проверки

```bash
python tools/youtube-comment-batches-20261030/prepare_change.py
node tools/youtube-comment-batches-20261030/tests/bounded_batches.test.cjs
node --check tools/youtube-comment-batches-20261030/changed/youtube-comments.js
node --check tools/youtube-comment-batches-20261030/changed/youtube_comments.js
node --check tools/youtube-comment-batches-20261030/changed/youtube_reply_instructions.js
```

26 проверок прошли: все шесть размеров чтения и генерации, отсутствие автоматического прохода по страницам, возврат назад, сохранение правок, переключение аккаунта и устаревшие ответы, отказ старого сервера с превышением лимита, точечное обновление, границы истории и очереди, проверка разрешений, параметры Firestore и контракт промпта. Сетевые API и OpenAI в тестах заменены заглушками; реальные ответы зрителям не генерировались и не отправлялись.

На рабочем сайте проверены 50 по умолчанию, 20 и 100 строк; переход между порциями по 20 без пересечений и возврат того же набора; фильтр английского канала без ошибки индекса. Все шесть вариантов доступны в селекторе. При проверке возвращены «Все каналы» и размер 50. Порция содержит и уже обработанные комментарии: число новых ответов может быть меньше N, это показано на кнопке подготовки.

Новый блок выбора порции не имеет собственного горизонтального переполнения на ширинах 375, 768, 1024 и 1440. На 375 обнаружено существующее ограничение старой оболочки: боковой отступ и верхняя панель сужают и перекрывают контент. Глобальная мобильная оболочка в этой задаче не переделывалась.

## Публикация 2026-10-30

- Project: `phraseman-ea0b3`.
- Function: `adminYoutubeComments`, `us-central1`, новая версия ACTIVE с `updateTime=2026-10-30T10:03:03.162714568Z`.
- Function patch mask: только `buildConfig.source`. Runtime, entry point, секреты, окружение, ресурсы, service account, ingress и лимиты сверены с исходными настройками.
- Исходный архив: `gcf-v2-sources-1047658658799-us-central1/adminYoutubeComments/function-source.zip`, generation `1793217686654249`.
- Исходная Hosting version: `sites/phraseman-ea0b3/versions/0184135e6e3fc4da`.
- Новая Hosting version: `sites/phraseman-ea0b3/versions/6b8efa1663164dd9`.
- Release: `sites/phraseman-ea0b3/releases/1793354662162000`.
- Сохранены все 99 путей и полная конфигурация Hosting. Изменены только `/scripts/pages/youtube-comments.js` и `/scripts/pages/youtube-comments.css`.
- Перед публикацией повторно сверено отсутствие конкурентного обновления функции и Hosting release.

## Скрипты и восстановление

`prepare_deployment.py` делает только чтение текущего проекта и создаёт checkpoint. `deploy_backend.py` проверяет исходные SHA-256, меняет два файла внутри существующего архива и запускает source-only update. `deploy_hosting.py stage` создаёт проверяемую версию с прежними путями/настройками; `publish` требует успешного backend deploy и неизменного предыдущего release.

Это датированный воспроизводимый патч. Повторное применение к уже изменённой функции останавливается на проверке базового SHA; нельзя удалять эти проверки, чтобы протолкнуть устаревший архив.

Checkpoint исходных function/source/Hosting metadata остаётся в авторизованном Cloud Shell: `/tmp/youtube-batches-20261030`. Для восстановления можно опубликовать указанную исходную Hosting version и вернуть `buildConfig.source.storageSource` к исходному bucket/object/generation. Перед восстановлением проверить, что после этой версии не появились другие изменения; пользовательские комментарии и черновики не удалять. Ключи и access tokens не включены в файлы или репозиторий.


## Follow-up: clear prepared replies (2026-10-30)

The same builder now applies `clear_drafts_patch.py`: owner-only bounded clear/undo, durable restore receipts, local-edit recovery, expected-revision send checks and generation-lock ownership.

The user narrowed this follow-up to YouTube comments; Stories changes are excluded from this release.

### Behavior

- One click clears every prepared, unsent draft in the loaded batch (maximum 100). Search filters and individual selection do not silently restrict the scope. Viewer comments and published replies are preserved.
- Undo restores replies as drafts requiring fresh approval. Sending/uncertain/in-flight and actively generating rows remain protected; partial results explain what was skipped.
- `replyDiscard` keeps one backup/receipt per comment, keyed by operation ID and monotonic revision. Existing comment TTL applies. No new collection or cron is created.
- Unsaved local edits are account-scoped, backed up before clearing and recovered after Undo, including lost responses. Storage failure stops clearing dirty drafts. A newer unsaved edit cannot be overwritten.
- Send verifies the expected revision both before channel verification and inside the final transaction. A stale generation cannot set review state or remove another generation's lock.

### Focused checks

```sh
python3 tools/youtube-comment-batches-20261030/prepare_change.py
node tools/youtube-comment-batches-20261030/tests/bounded_batches.test.cjs
node tools/youtube-comment-batches-20261030/tests/clear_drafts.test.cjs
```

26 batch/prompt checks and 20 clear/undo/concurrency checks pass on actual modules with mocked Firestore/callables. No paid OpenAI requests, no real YouTube sends, and no user replies are cleared during verification. The Jarvis guard keeps this owner workflow state outside its readers; all 8 fetchers and their actual callable/cron wiring were reviewed.

### Deployment

Use `deploy_clear_backend.py` and `deploy_clear_hosting.py` in the authenticated Cloud Shell checkpoint directory `/tmp/admin-repair-20261030`. The backend script starts from the currently deployed module SHA256 `38d97bbe799efac3b25d9381dfc23ff0eda36c39ac9ae2640606e48f6105a3b8`; only `buildConfig.source` changes. The hosting script replaces only `/scripts/pages/youtube-comments.js`, preserving every other live path/hash and all configuration. Deployment leases fail closed on concurrent updates. The older scripts above target the earlier batch rollout and are retained only as historical evidence.

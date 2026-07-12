# Admin v2: Plus-опрос и Telegram-алерты — дизайн

## Цель

Перенести `review-promo` и `alerts` из архивной админки в два нативных защищённых экрана Admin v2 без потери функций и без прямых браузерных записей в Firestore.

## Выбранный вариант

Используются отдельные маршруты `#review-promo` и `#alerts` внутри существующего раздела «Приложение». Это соответствует правилу «один экран — одна задача» и переводит реестр с 21/38 на 23/36 native/fallback.

## Plus-опрос

- Специализированные callables управляют `app_messages.kind=vip_survey`; generic app-message writer не расширяется.
- Сервер фиксирует `audience=free`, `surveyId=vip_feedback_v2`, `rewardDays=30`.
- Версия приложения больше не зашита: администратор явно выбирает список версий или `allVersions`.
- Для восьми локалей обязательны отдельные title/body; Spanish и English больше не объединяются.
- Preview показывает локализации, охват версий, TTL, priority, активные кампании, которые будут остановлены, причину, stop/rollback path и точное подтверждение.
- Apply в одной транзакции проверяет actor/expiry/fingerprint/revision, выключает старые активные survey, создаёт новую, пишет state/history/audit/idempotency.
- Ответы читаются через ограниченную серверную проекцию последних 500 документов, с фильтрами, пагинацией, итогами и без raw user/progress/auth данных.
- Profile ведёт в нативный профиль. Выдача/отзыв административного Plus остаётся через существующий защищённый money workflow и не затрагивает store/RevenueCat Plus.
- Генерации и AI-перевода на этом экране нет.

## Telegram-алерты

- Callables читают, preview/apply конфигурацию и ставят тестовую команду.
- Разрешены только `enabled`, `chatId`, пять event toggles и `spikePerHour` 1..100.
- CAS использует `configRevision`; служебные счётчики и окна сохраняются.
- Каждое изменение требует preview, причины и точного подтверждения; история хранит before/after и rollback reference.
- Тест отправляется в previewed chat ID, не сохраняет форму и не включает алерты.
- UI говорит «принято Telegram», «отклонено» или «доставка не подтверждена», но не «доставлено».
- Bot token, credential URL и raw provider errors никогда не возвращаются в браузер.

## Права и правила

- Новые permissions: `application.review_promo.read/write`, `application.alerts.read/write/test`; только owner/admin.
- Все writes идут через server commands с App Check, role resolution, reason, requestId, fingerprint и устойчивым idempotency key.
- Клиентам запрещены запись survey campaigns/responses/control collections и доступ к `admin_config/alerts`.
- Сохраняются необходимые app reads обычных `app_messages` и собственных survey responses.

## Интерфейс

Сохраняется утверждённый светлый Admin v2: семь разделов, зелёные кнопки с тёмным текстом, SVG-иконки, tooltips, focus-visible, понятные loading/empty/error состояния и responsive layout. Plus-опрос имеет «Кампания / Ответы», алерты — «Настройки / Проверка связи / История».

## Проверка и публикация

Нужны pure/callable/emulator/static tests, syntax/build/smoke, визуальная проверка 375/768/1024/1440, финальный Advisor `APPROVED`, затем indexes/functions/rules/hosting и только read-only production smoke.


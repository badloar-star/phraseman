# Admin Voice & Research Center — дизайн

Дата: 2026-07-13  
Статус: утверждено в рамках ранее одобренной программы Admin v2

## Цель

Заменить пять разрозненных legacy-вкладок `ideas`, `ideas-decided`, `surveys`, `onboarding-sources` и `cancel-surveys` единым native-разделом Admin v2 «Голос пользователей», не потеряв ни чтение, ни редактор, ни CSV, ни персональные решения по идеям.

## Структура интерфейса

Раздел относится к категории «Пользователи» и имеет пять внутренних представлений:

1. Новые идеи.
2. История решений.
3. Опросы.
4. Источники привлечения.
5. Причины отмены.

У экрана один спокойный заголовок, компактная панель вкладок, отдельные loading/empty/partial/error-состояния и одна главная кнопка в текущем контексте. Редактирование идеи или опроса открывается во встроенной рабочей панели, а не в каскаде модальных окон. На мобильной ширине таблицы становятся карточками. Лаймовые элементы всегда используют тёмный текст.

## Полнота переноса

### Идеи и история

- Последние 500 `user_ideas`, фильтры статуса и категории, поиск и профиль пользователя.
- Полный исходный текст идеи, польза, язык, платформа, версия и время.
- AI-черновик на языке пользователя с редактируемой подсказкой тона.
- Preview/apply для принятия и отклонения.
- Принятие атомарно фиксирует решение, выдаёт минимум год Plus, не сокращает lifetime/более длинный VIP, не меняет Store/RevenueCat, создаёт одно inbox-сообщение, одну operation-запись и один audit.
- История показывает точный отправленный текст, автора и время решения; она read-only.

### Опросы

- До 200 конфигураций, сохранённая all-time статистика и до 5000 ответов выбранного опроса.
- Поиск по UID и ответам, безопасный CSV из того же неизменяемого снимка.
- Полный редактор схемы `shard_survey_core.ts`: локализация, reward, cooldown, audience, lesson/platform targeting, вопросы, варианты, цвет и final screen.
- Preview/apply для create/update/toggle/delete/restore.
- Удаление сохраняет ответы и статистику; каждое изменение имеет полную историю и rollback preview.

### Источники привлечения

- Канонический источник — `app_activity`, только `action == onboarding_source_select`.
- Окна 7/28/90/180 дней, платформы all/iOS/Android.
- Последний ответ каждого UID, source mix и последние уникальные ответы.
- Лимит 50 000 событий с честным partial-состоянием.

### Причины отмены

- Последние 500 `subscription_cancel_surveys`, reason/search, профиль, метаданные и свободный текст.
- CSV использует `reasonText` с fallback на `text/comment` и защищён от формул.
- Три action-сегмента: цена, ценность/онбординг, техническое качество.
- Тренд сравнивает последние 14 дней с предыдущими 14 по отдельным aggregate-запросам; отклонение меньше 3 п.п. считается стабильным.

## Архитектура

Backend разделён на `admin_voice_research_core.ts` (чистые преобразования) и `admin_voice_research.ts` (Firestore, RBAC, snapshots, preview/apply/audit). Browser не читает и не пишет профильные коллекции напрямую.

Admin v2 разделён на state/view/controller-модули. `admin-core.js` только регистрирует маршрут и жизненный цикл. Все пять legacy deep links открывают нужное внутреннее представление одного native-экрана.

## Контракт чтения

`adminGetVoiceResearchWorkspace` принимает view, нормализованные фильтры, selectedSurveyId, pageSize, cursor и exportCsv. Ответ содержит items, totalMatched, summary, sources, nextCursor, snapshotCursor и CSV.

Каждый результат хранится в приватном actor/scope-bound gzip-снимке на 30 минут. Следующие страницы и CSV используют тот же снимок. Размер атомарной записи ограничен 8 МБ и 11 chunks; превышение отражается как truthful truncation или контролируемая ошибка.

## Безопасность изменений

Права:

- `users.research.read` — owner/admin/analyst/support/moderator;
- `users.research.export` — owner/admin/analyst;
- `users.research.write` — owner/admin;
- принятие идеи дополнительно требует `money.manual_access.write`.

Все admin-callables используют строгий App Check. Preview привязан к actor, reason, source fingerprint и TTL 30 минут. Apply повторно проверяет источник внутри транзакции, поддерживает idempotency и пишет audit/history. Старые однокнопочные mutation-callables становятся fail-closed compatibility adapters, а не обходом нового workflow.

Свободные тексты идей, ответов и отмен не попадают в универсальный audit/log payload.

## Проверка и выпуск

- TDD для проекций, caps, cursor scope, CSV, reward preservation и survey rollback.
- Backend transaction tests и frontend contracts.
- Firestore rules/index tests, migration board 59/31/28, language/runtime audits.
- Визуальная проверка 375/768/1024/1440.
- Финальный advisor review должен вернуть `DECISION: APPROVED` до deploy.
- Deploy: indexes → affected functions → hosting → authenticated read-only smoke → dedicated collection rule lockdown → повторный smoke.

## Не входит в пакет

- Генерация языков и контента.
- Изменение пользовательской подачи идей или опросов в мобильном приложении.
- Глобальный запрет чтения `app_activity`, пока не перенесены остальные analytics-consumers.


# Admin Content Factory — canary rollout

Этот runbook не разрешает deployment сам по себе. До явного запроса владельца проекта выполняются только локальные fake-provider проверки. Нельзя считать текущий Firebase project или alias тестовым по умолчанию.

## 1. Обязательный preflight

Заполнить readiness JSON и получить подтверждение для каждого поля:

- точный Firebase project ID и его назначение (`internal` / `staging` / `production`);
- разрешён ли deployment в этом запросе;
- allowlist функций: `adminCreateContentStage`, `adminRunContentStage`, `adminControlContentStage`, `adminPreviewContentStage`, `adminReviewContentStage`, `adminReviewCourseGeneration`, `adminSealCourseRelease`, `adminActivateCourseRelease`, `adminRollbackCourseRelease`;
- текущие версии функций и Admin Hosting;
- ID активного immutable release, revision каталога и candidate release;
- ссылки на Firestore export/backup и evidence manifest;
- предыдущее значение budget cap и rollout-флагов.

Если project ID не подтверждён, deployment запрещён. Локальные проверки продолжаются без него.

## 2. Волны

### Wave 0 — local/fake only

Запустить R7 smoke matrix и Admin v2 browser E2E. Требования: внешних запросов 0, manifest совпадает, permissions/audit matrix зелёная, accepted drafts сохраняются после rollback.

### Wave 1 — один объект

Только после отдельного разрешения: один урок или одна тема, затем ручной preview и QA. Ничего не активировать автоматически. Наблюдение не менее 30 минут после каждой серверной операции.

### Wave 2 — три объекта

Три последовательных урока/темы. Проверить дедупликацию между ними, число попыток, ручные правки и бюджетный proxy. Наблюдение не менее 60 минут.

### Wave 3 — ограниченный batch

Размер заранее записывается в readiness JSON и не может расширяться во время запуска. После batch — ручной review и отдельное решение об activation.

## 3. Метрики

- ошибки по нормализованным категориям;
- попытки / принятый артефакт;
- QA pass rate и распределение score;
- доля ручных correction/replacement;
- p50/p95 latency;
- reserved/consumed budget и доля cap.

Budget reservation — это proxy, а не фактическая стоимость провайдера. Нельзя показывать его как billed spend.

## 4. Немедленная остановка

Остановить текущую и следующие волны при любом событии:

- неправильный ответ или серьёзная языковая ошибка;
- необъяснимое изменение source/blueprint/artifact hash;
- обход прав или отсутствие audit record;
- повторная публикация/activation одного действия;
- потеря accepted draft либо ledger entry;
- рост нормализованной error rate выше записанного baseline threshold;
- p95 latency выше threshold;
- retry amplification выше threshold;
- budget cap/anomaly;
- неожиданный внешний запрос из smoke/E2E.

## 5. Rollback

Rollback переключает только указатель каталога на предыдущий immutable release. Он не удаляет candidate release, принятые артефакты, черновики или ledgers.

1. Зафиксировать текущие `releaseId`, catalog revision и evidence hash.
2. В Admin v2 вызвать `adminRollbackCourseRelease` с явными `targetReleaseId`, `expectedCurrentReleaseId`, `expectedRevision`, уникальным `idempotencyKey`, `requestId` и причиной.
3. Проверить новый catalog revision, runtime lookup и audit record.
4. Убедиться, что candidate release и drafts доступны для диагностики.
5. Повторный activation возможен только новым ручным решением и с актуальной CAS revision.

Никогда не подставлять release ID или project ID из предположения. Команда/действие заполняется только значениями из подтверждённого readiness packet.

## 6. Evidence и ответственность

Для каждой волны записать владельца, начало/конец observation window, входные ID, метрики до/после, решение continue/stop, audit IDs и manifest hashes. При остановке сохранить диагностику, но не удалять принятый контент.

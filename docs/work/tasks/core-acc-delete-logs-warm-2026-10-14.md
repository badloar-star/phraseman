# Task packet: удаление аккаунта — логи стадий enqueue, ранние выходы воркера/sweep, безопасный прогрев; доводка D188 ч.2; план Б V2 ↔ гейты

Governance-ID: TG-F0FB98B3F002
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 14.10 (удаление гостя №3: ack 17,2 с; план Б V2 к 15.10 12:00; D188)

## Outcome

1) `accountDeleteEnqueue` пишет `[ACCOUNT-DELETE-ENQUEUE]` по стадиям (вход, proof, resolve, fence, closure, enqueue, итог, мс);
`processAccountDeletionJob` и `sweepAccountDeletionJobs` логируют КАЖДЫЙ ранний выход с причиной (сейчас немые).
2) Прогрев: открытие экрана удаления шлёт `accountDeleteEnqueue({ warm: true })` без ключа удаления. Старый сервер (прод с 01.10)
отказывает `account_delete_credential_pending` до любых чтений/записей — без вреда; новый (после выкладки 17.10) отвечает
`{ warm: true }` до любой работы с данными. Сторож: warm никогда не создаёт задачу и не пишет метку/маркер.
3) D188 ч.2: функция порядка строк шторки — в лёгком модуле (тест не тянет экранный код).
4) План Б V2: обёртка гейтов №3/№4 признаёт рубильник LEARNING_V2_HIDDEN наравне с потолком 0; документ R1_PLAN_B_HIDE_V2.md дополнен.

## Scope

In scope: functions/src/account_delete.ts (enqueue), account_delete_job.ts (processAccountDeletionJob), account_delete_worker.ts
(sweep), тесты functions; клиентский вызов прогрева в коде экрана удаления; components/settings/study_language_sheet_order.ts;
scripts/learning_v2_plan_b_gates.mjs + тест; docs R1_PLAN_B_HIDE_V2.md.
Out of scope: grace гостей (решает владелец), App Check клиента (после R1), ленивые require (после R1), выкладка (17.10, владелец).

## Architecture

Прогрев идёт в ТОТ ЖЕ сервис (отдельное имя не прогрело бы инстанс enqueue). Ветка warm — первая строка обработчика после проверки
входа, до cleanCredentialProof/Firestore. Логи — структурные JSON-строки без uid (только хэш-префиксы и миллисекунды).

## Security and privacy

Прогрев требует вход (auth), не несёт данных и не меняет состояние. В логах нет uid/почты. Политику конфиденциальности не меняет.

## Technical debt

Contain: ленивые require и App Check клиента — задачи после R1 (tasks.json).

## Verification

Тесты functions (enqueue warm не пишет, ранние выходы логируются), проверка типов functions; клиентские точечные тесты; тест гейта плана Б.

## Rollback

Код логов безвреден; прогрев клиента — убрать один вызов; сервер — ветка warm удаляется одной правкой.

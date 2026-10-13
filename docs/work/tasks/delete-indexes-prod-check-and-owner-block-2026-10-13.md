# Task packet: индексы удаления аккаунта — прод против репо (только чтение) + ранбук/шаги владельца по R1-задачам

Governance-ID: TG-13D90F66DFE5
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 — 12.10 удаление гостя падало на collection_group_matches (нет индекса), 37e53b290 добавил индексы
в firestore.indexes.json; сверка tasks.json (PM-216/252 → ранбук §3; PM-224/249/250/254 → OWNER_RELEASE_STEPS блок владельца)

## Outcome

- Только чтение прода (ADC владельца): `gcloud firestore indexes fields list` / `composite list` → сравнение с
  firestore.indexes.json по всем индексам группы коллекций (fieldOverrides CG и составные CG): каких нет в проде / не READY,
  какие из них нужны удалению аккаунта (functions/src/account_delete.ts). Ответ координатору. Ничего не выкладывается.
- R1_RUNBOOK §3 (день сборки 16.10): PM-216 обмер бандла и PM-252 финальный ревью — шаги Ядра.
- OWNER_RELEASE_STEPS: блок «Тебе до 17.10» простыми словами — PM-224 бюджет GCP, PM-249 Terms, PM-250 декларации,
  PM-254 ручная матрица.

## Scope

In scope: чтение прода, два документа. Out of scope: выкладка индексов (владелец), правка кода удаления.

## Architecture

No architecture change.

## Security and privacy

Чтение конфигурации индексов (не данных пользователей); выгрузка — во временную папку сессии.

## Technical debt

- Индексы группы коллекций для удаления вводились без сторожа «прод = репо»; такой сторож — после R1.

## Verification

Сравнение по каждому полю: есть ли в проде CG-индекс нужного порядка и state=READY.

## Rollback

Откат коммита документов.

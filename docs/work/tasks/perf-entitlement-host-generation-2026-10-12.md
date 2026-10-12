# Task packet: EntitlementExpiredHost — без лишнего рендера на старте (поколение аккаунта сравнивать по полям)

Governance-ID: TG-81B0A8BA927A
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10, аудит скорости Дизайна R1_PERF_FIRST_FRAME.md)

## Outcome

components/EntitlementExpiredHost.tsx: эффект монтирования клал в state НОВЫЙ объект поколения (те же поля) → лишний рендер хоста и
повторный прогон эффекта проверки истечения на каждом старте. Теперь новый объект принимается только при смене generation/stableId/phase
(как app/(tabs)/home.tsx:880). Логика истечения подписки не меняется.

## Scope

In scope: одна строка setAccountGeneration + тест. Out of scope: логика показа карточки истечения.

## Architecture

Функциональный setState с проверкой равенства полей; при равенстве — прежний объект (React пропускает рендер).

## Security and privacy

Без изменений: смена аккаунта (другие поля) по-прежнему закрывает карточку и принимает новое поколение.

## Technical debt

- Contain: нет.

## Verification

Тест: при одинаковых полях state не меняется (тот же объект), при смене — новый; сторожа хоста.

## Rollback

Откат коммита.

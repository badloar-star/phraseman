# Task packet: подъём версии к релизу PhraseMan 2.0 — 2.0.0 / 131 / runtimeVersion 2.0.0 (обратимый коммит)

Governance-ID: TG-0FA8172545AB
Status: In progress (координатор 10.10: «отдельным обратимым коммитом подготовить подъём версии»)
Owner: сессия 1 · ЯДРО

## Outcome

app.json: version 1.6.24 → 2.0.0, android.versionCode 130 → 131, ios.buildNumber "130" → "131",
runtimeVersion "1.6.24" → "2.0.0". Сборка 130 уже в сторе с 22.09 (af76518ac), autoIncrement выключен —
без подъёма стор отклонит. runtimeVersion меняется вместе с версией: OTA канала production для 1.6.24 не попадёт в
новую нативную сборку, и наоборот.

## Scope

app.json — четыре значения. Ничего больше.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Если владелец выберет другую версию (например 1.7.0) — git revert этого коммита и новые числа по тем же правилам.
Серверный минимум версии клиента (accounts_v2 / force update) этим коммитом не меняется.

## Verification

JSON валиден; тесты, читающие версию, используют свои заглушки (expo-constants), не app.json.

## Rollback

git revert коммита (один файл).

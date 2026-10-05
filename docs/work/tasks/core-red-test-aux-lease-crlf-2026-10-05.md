# Task packet: learning_v2_activity_auxiliary_session_mount_v1 — ложный красный из-за CRLF

Governance-ID: TG-3A3D68CEF784
Status: In progress
Owner: сессия 1 · ЯДРО (координатор 05.10)

## Outcome

Тест ищет буквально 'withBackgroundNetworkLease(\n    "learning-v2.activity-auxiliary"'. Аренда сети в
app/learning_v2_activity_auxiliary_client.ts:437 на месте (и в released_session_client_v1.ts:417). Падение —
окончания строк: в индексе файлы LF, в рабочей копии CRLF (git ls-files --eol: i/lf w/crlf), «\r» ломает
буквальное сравнение. Регресса нет — сделать тест устойчивым к окончаниям строк и форматированию.

## Scope

tests/learning_v2_activity_auxiliary_session_mount_v1.test.ts: чтение исходника с нормализацией CRLF → LF;
проверка аренды — регулярка withBackgroundNetworkLease\(\s*"…". Код приложения не трогаем.

## Architecture

Без изменений приложения.

## Security and privacy

Не затрагивается.

## Technical debt

Прочие сторожа исходника с буквальным '\n' так же ломаются на CRLF-копии; помощник source() с нормализацией —
образец для них.

## Verification

Тест зелёный в CRLF-рабочей копии.

## Rollback

git revert.

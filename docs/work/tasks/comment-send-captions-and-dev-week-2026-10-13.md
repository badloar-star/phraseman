# Task packet: подписи отправки отклика на набор (cards-056) и dev-подмена «Итога недели» Шпиля (13.10)

Governance-ID: TG-17F8C338CE28
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручениям Авторизации (бэклог №18) и координатора

## Outcome

1. Отклик на набор в шторке комментариев (`app/community_packs/PackCommentsSheet.tsx`): у отправляемого отклика появляется подпись «отправляется…», у неотправленного — «не отправлено» рядом с «Повторить» и «Удалить», на 9 языках, по образцу cards-states №50. Состояния и логика отправки не меняются, только подписи.
2. Dev-подмена карточки «Итог недели» (`dev_state?spireWeek=up|stay|down|top|marble|obsidian|off`) для кадров Сверки; сторож `tests/spire_dev_week_override.test.ts` читает исходники без регулярных выражений с переводом строки.

## Scope

In scope: `app/community_packs/PackCommentsSheet.tsx` (две подписи у строки отклика), сторож подписей, `tests/spire_dev_week_override.test.ts`.

Out of scope: логика отправки, повторная отправка, ограничения, серверные вызовы; вкладки уроков (`app/(tabs)/lessons.tsx`) — правка Авторизации.

## Architecture

Подписи берутся из `triLang` рядом со строкой отклика, статусы `sending` и `failed` уже есть; добавляется короткий текст под строкой, без обводок. Сборка теста исходников нормализует переводы строк через `String.fromCharCode`, а не регуляркой.

## Security and privacy

Данных пользователя не добавляет: подписи — статичные строки интерфейса.

## Technical debt

Contain: подписи на 9 языках — предложение без проверки носителем (как остальные строки шторки).

## Verification

Точечные прогоны сторожей `tests/spire_dev_week_override.test.ts`, `tests/spire_tower_skins.test.ts` и сторожа шторки комментариев через test:one под светофором; кадры Сверки по образцу cards-states №50.

## Rollback

git revert коммита.

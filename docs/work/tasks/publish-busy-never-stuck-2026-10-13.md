# Task packet: «Открыть сообществу» — кнопка публикации не должна зависать при исключении

Governance-ID: TG-1A795F0251B2
Governance-ID: TG-77FED0458FF9
Status: In progress
Owner: сессия «2 · ДИЗАЙН» (аудит мгновенного отклика, правило №10, по команде координатора)
Related epic/enabler: OPTIMISTIC_UI_DESIGN_R1_2026-10-13.md, строка про публикацию (E1)

## Outcome

В `app/flashcards_collection.tsx` `onPublishPack` флаг `publishBusy` снимался только после нормального возврата `publishLocalAuthorPack`; при исключении (чтение хранилища, сбой раньше внутреннего try) кнопка оставалась заблокированной и ошибка уходила в необработанный отказ без сообщения. Теперь: исключение → `publishBusy` снят, тост «Не удалось отправить набор на публикацию», строка журнала `[PACK-PUBLISH] onPublishPack: исключение — …`.

## Scope

In scope: app/flashcards_collection.tsx — `onPublishPack` (try/catch вокруг вызова), контракт-тест.

Out of scope: сама отправка (ждём сервер — осознанно), тексты тостов, `publishLocalAuthorPack`.

## Architecture

No architecture change: исключение сводится к уже существующему исходу `'error'`, дальше идёт прежняя ветка тоста.

## Security and privacy

В журнал — текст ошибки (без данных набора).

## Technical debt

Pay now.

## Verification

Контракт-тест на строки; синтаксис.

## Rollback

git revert коммита.

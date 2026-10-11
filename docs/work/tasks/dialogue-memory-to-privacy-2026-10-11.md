# Task packet: «Память диалогов» — только в Настройках → Приватность, не в разделе «Диалоги»

Governance-ID: TG-410B9B1C0CF5
Status: In progress
Owner: сессия «Авторизация» (приказ владельца через координатора)

## Outcome
Строки «Память диалогов» в разделе «Диалоги» (`DialogueV2PlusTools`) больше нет; «Свободный разговор» остаётся. В Настройках → Приватность (раздел «ИИ-функции») появился пункт «Память диалогов» → `/dialogue_v2_memory` (экран контроля: что сохранено / очистить). Экран и сервер памяти не трогаем.

## Scope
`components/dialogs/DialogueV2PlusTools.tsx` (строка `memory`, проп `onOpenMemory`), `components/dialogs/DialogueV2CatalogueContainer.tsx` (`openMemory`), `app/privacy_settings.tsx` (новый `PrivacyRow`, без подписи мелким), тесты `tests/dialogue_v2_catalogue_container.test.ts` + новый сторож. Политика: проверить абзац о памяти диалогов; если нет — предложение в OWNER_RELEASE_STEPS §5.

## Architecture
Без изменения архитектуры: перенос точки входа. Экран памяти открывается для всех (как и раньше — без пейволла), «Назад» — `safeRouterBack` (стек → Приватность).

## Security and privacy
Данные не меняются; контроль над сохранённым остаётся доступным в разделе приватности — ближе к остальным согласиям ИИ.

## Technical debt
- Pay now: убрать мёртвый проп `onOpenMemory`.

## Verification
Тест контейнера (без `onOpenMemory`), новый source-сторож: в `DialogueV2PlusTools` нет `memory`, в `privacy_settings` есть строка → `/dialogue_v2_memory`. Храповик переводов ≤ базы. По одному, со слотом.

## Rollback
`git revert`.
Governance-ID: TG-C325443D1813 — тесты, политика проверена (абзац о памяти есть, «в приложении» — верно), коммит.

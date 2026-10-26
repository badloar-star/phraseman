# Ядро · сторож «тело пуша без урока» нормализует NFC (Ревизор 991f9704c)

Governance-ID: TG-16B3C38534B7
Status: In progress
Owner: 1 · ЯДРО

## Outcome
Сторож из 614e76486 проверял тело `streak_at_risk` регуляркой по сырой строке. Если тело пришло в NFD, где диакритика —
отдельный символ («lição», «bài»), регулярка `liç` / `bài` прошла бы мимо. Теперь перед проверкой — `.normalize('NFC')`,
и есть отдельный кейс NFD.

## Scope
In scope: только `functions/src/re_engage_push.test.ts`. Код пуша не меняется.

## Architecture
Без изменений.

## Security and privacy
Не затрагивает данные.

## Technical debt
Новой нет: сторож стал строже, текст пуша прежний.

## Verification
Кейс: старые pt/vi в NFD ловятся, новый vi в NFD — нет. `re_engage_push.test.ts` зелёный.

## Rollback
Откат коммита.

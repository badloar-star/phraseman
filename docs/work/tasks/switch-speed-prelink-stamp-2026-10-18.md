# Task packet: смена A→B быстрее — привязка Apple во время стирания A, метка владения параллельно

Governance-ID: TG-10BB3D66E72B
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Цель координатора — смена аккаунта ≤5 с. Замер iPhone 18.10 13:59 (правило 3, Apple A → Apple B): стирание A 3,9 с, затем
последовательно привязка Apple 1,7 с и метка владения 0,5 с. Обе сетевые операции не зависят от стирания — убираем их из
последовательной цепочки.

## Scope

- app/auth_provider.ts:
  - правило 3 + Apple: requestAppleLinkByVerifiedEmail стартует сразу после окна выбора (под A), параллельно со стиранием;
    продолжение входа берёт этот же ответ, если токен тот же (`[AUTH-APPLE-LINK] prelink carried matches=`); одноразово;
  - после конфликта email-already-in-use сервер зовётся повторно, даже если предварительная привязка отказала (сбой сети) —
    вместо карточки ошибки;
  - заблаговременный запрос метки владения гостя включён и для продолжения после смены (consume сверяет stableId/authUid).
- tests/signin_apple_handoff_unlock_contract.test.ts.

## Architecture

Серверная функция требует только авторизованного вызывающего (A подходит) и проверяет токен Apple сама — Firebase его не
видит, токен остаётся годным для входа. Проверка «гость ли сейчас» остаётся там, где ответ используется: `canTryLink`.

## Security and privacy

Без изменений по данным. Если A сам владеет почтой Apple ID, сервер привяжет Apple к A — то же, что и прежде после стирания.

## Technical debt

Хвост после входа (~2 с на iPhone) и новый гость (1,4 с) — следующий замер.

## Verification

Тесты через светофор (8 файлов). Живой прогон: в журнале `prelink start source=rule3_picker` до `rule3 switched` и
`prelink carried matches=yes`, `[LOGIN-STAMP] consume outcome=hit`.

## Rollback

`git revert <hash>`.

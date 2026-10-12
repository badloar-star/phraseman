# Task packet: сторож непереведённого текста — журналы Шпиля и bootMark в DIAGNOSTIC_LOG_CALL; база ратчета вниз

Governance-ID: TG-40AE4922AAE0
Status: Done — accd2bcf8 + база 152 по срезу HEAD
Owner: сессия «1 · Ядро» (координатор 12.10: «Добавь logSpireLayout|logSpireDock в DIAGNOSTIC_LOG_CALL… Тест. Базу потом
опусти ещё — только вниз»).

## Outcome
После ужесточения сторожа (fe1bc0d65, переводчик только целым именем) всплыли тексты журналов: `logSpireLayout`,
`logSpireDock` (components/spire/spire_layout_log.ts — только console.log, только dev) и `bootMark` (app/_layout.tsx —
только console.warn при включённой трассировке старта). На экран не попадают. Добавляются в список явных помощников
логов. Затем база `config/untranslated-ui-baseline.json` опускается до итога по чистому срезу HEAD (не по дереву с
чужими незакоммиченными правками) — только вниз.

## Scope
In: `scripts/scan_untranslated_ui.mjs` (одна регулярка), тест, база. Out: сами журналы.

## Architecture
Имена явные, не маской (как traceThumbMissing): UI-строка в похожей функции не просочится.

## Security and privacy
Нет данных.

## Technical debt
Новый помощник логов — дописывать в список.

## Verification
Тест контракта регулярки; итог сканера по срезу HEAD; `--update` только при итоге ниже текущей базы (165).

## Rollback
`git revert`.

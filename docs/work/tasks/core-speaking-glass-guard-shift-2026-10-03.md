# Task packet: сторож «Устно» (liquid glass source contract) — законный сдвиг runtime AST

Governance-ID: TG-B331A96ACF05
Status: Done
Owner: Ядро; сигнал «Дизайна» 03.10

## Outcome
tests/flashcards_speaking_liquid_glass_source_contract.test.mjs: «runtime AST unchanged» 33→34 узла, hash 1871…→e0eaae…. Источник — логика Ядра: 85f9e7231 (сторож загрузки SPEAKING_GATE_WATCHDOG — +1 useEffect, трассировка [FC-SPEAKING-GATE], reconcile missing → fail-open) и 94003821a (компактный manifest, снятие записи до локального старта, проброс ошибки возврата). Вёрстка «Дизайна» 4ee077331 значение не меняла. Также докоммичивается сторож fail-open свайпа (core-swipe-fail-open-guard).

## Scope
tests/flashcards_speaking_liquid_glass_source_contract.test.mjs, tests/flashcards_entry_fail_open_contract.test.ts.

## Architecture
Без изменения кода.

## Security and privacy
Нет изменений.

## Technical debt
Принято: нового долга нет; обновляется эталон сторожа под проверенные ревью правки.

## Verification
node --test для mjs-сторожа зелёный; fail_open_contract 7/7.

## Rollback
git revert.

## Итог
Три скрытых друг за другом расхождения: (1) runtime AST 33→34 — логика Ядра 85f9e7231/94003821a; (2) хэш защищённых элементов — эталон устарел раньше, семь элементов поэлементно одинаковы в 85f9e7231^/94003821a/4ee077331; (3) хэш components/SpeakingPanel.tsx — законные PM-229 db985607f и D139 997f56dfe. Итог 6/6.

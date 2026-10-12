# Task packet: «парение» стопки хаба Карточек — конечное число раз + лог [CARDS-HUB-ANIM]

Governance-ID: TG-B34C307F479A
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/flashcards/CardsHubV2.tsx, tests/motion_allowlist_contract.test.mjs, tests/perf_freeze_contract.test.ts

## Outcome

Хаб Карточек держит ЕДИНСТВЕННУЮ бесконечную анимацию — «парение» стопки (`float`, Reanimated, `withRepeat(..., -1, true)`, 8 dp за 5 с): из-за неё uiautomator не дожидается покоя, а у человека это постоянная нагрузка (обновление вида каждый кадр).
Ответы по коду: драйвер — UI-поток Reanimated, не JS (JS-кадров не дёргает); останавливается при уходе с экрана и в фоне (`useRuntimeActive` = фокус + приложение активно) и при «уменьшить движение»; в макетах хаба (`cards-section.html`, `cards-v2.html`) такой анимации нет — это декор приложения.
Что делаю: (1) лог [CARDS-HUB-ANIM] (только dev): число обновлений анимации за 5 с и состояние включена/выключена; (2) «парение» играет конечное число раз — 2 полных качания (≈20 с) после каждого входа на экран и останавливается на нуле; повторный вход — снова.

## Scope

In scope: app/flashcards/CardsHubV2.tsx, новый dev-проб app/flashcards/CardsHubAnimProbe.tsx, tests/motion_allowlist_contract.test.mjs (число вечных циклов 1 → 0), тест-сторож.
Out of scope: другие экраны, решение владельца о возврате бесконечного парения (если скажет вернуть — одна константа).

## Architecture

No architecture change: константа числа повторов вместо -1; dev-компонент измерения, не рендерится в сторе.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: постоянная анимация без необходимости.

## Verification

Тесты: motion_allowlist_contract, perf_freeze_contract, сторож парения; срез типов; замер кадров — по логу [CARDS-HUB-ANIM] на эмуляторе (за Сверкой/координатором).

## Rollback

Откат коммита (или вернуть -1 в константе).

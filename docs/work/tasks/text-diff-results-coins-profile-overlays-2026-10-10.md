# Task packet: сверка текстов макетов results/coins/profile/system/community/overlays с кодом + Optimistic UI окон покупки

Governance-ID: TG-83B4EC1057B6
Status: In progress
Owner: сессия «2 · Дизайн» (поручение координатора 10.10 01:55)
Related epic/enabler: parity-registry-triage-2026-10-10.md; lesson-question-screen-parity-2026-10-10.md

## Outcome

1. Для results, coins, profile, system, community и overlays (окна: пейвол/покупка/удаление/выход) — расхождения макета и кода по тексту и составу; вёрстку исправить, данные и решения владельца пометить.
2. Optimistic UI в окнах покупки/восстановления покупок: мгновенное состояние кнопки, блок двойного тапа, откат — проверка по коду, недостающее добавить или внести в список.

## Scope

In scope: view-слой экранов и окон; документ-разбор. Out of scope: логика денег/энергии/покупок (только проверка и список), Learning V2, Шпиль, Главная, файлы Codex.

## Architecture

Метод — playwright снимает текстовые узлы телефонов макета (сервер 127.0.0.1:8765), сопоставление по реестру `visual_parity.json` с кодом строки и всем приложением (`scan_texts.mjs`, `textdiff.js`, `textdiff2.js`). Правки — только вид.

## Security and privacy

Не затрагивает данные.

## Technical debt

Contain: расхождения, вызванные данными или решениями, фиксируются в документе.

## Verification

Проверка синтаксиса, узкие node-сторожа экранов; проверка типов — если хватает памяти.

## Rollback

Отдельные коммиты, `git revert`.

## Optimistic UI окон покупки/восстановления (10.10 ~02:20) — проверка по коду

| Окно / действие | Мгновенное состояние | Двойной тап | Откат при ошибке | Вердикт |
|---|---|---|---|---|
| Пейвол Plus — «Купить» (`paywall_purchase.handlePurchase`) | `setPurchasing(true)` синхронно до первого await; кнопка/планы/закрытие блокируются (`ctaBusy`, `checkoutInFlight`) | синхронный `operationRef` + проверка state | `finally`: `operationRef=null`, `setPurchasing(false)`, `setPayStarted(false)`; ошибки — тост/диалог | Полно, не менял |
| Пейвол Plus — «Восстановить» (`handleRestore`) | `setRestoring(true)` до await; кнопка занята | `operationRef` | `finally` | Полно, не менял |
| «Управление Plus» — «Восстановить покупки» (`manage_subscription.handleRestore`) | `setRestoring(true)` до await; иконка крутится, геометрия строки не меняется | был только state `restoring` (второй тап в том же кадре мог пройти) | `finally` снимает state | **Добавлен** `restoringRef` (синхронный замок, снимается в `finally`) |
| «Управление Plus» — смена плана / шаг удержания | `changing`, `saveOfferBusyRef` (ref) | есть | есть | Полно |

Деньги/активацию не трогал — только замок от двойного тапа. Остаток: `finally` в `manage_subscription.handleRestore` снимает state только если аккаунт той же генерации — при смене аккаунта посреди операции экран уже закрыт, зависшего состояния не остаётся (проверено по `isOperationCurrent`).

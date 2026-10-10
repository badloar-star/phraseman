# Task packet: DeferredRedirect — переход в следующем кадре, а не после всех анимаций

Governance-ID: TG-B38D36A6F459
Status: In progress (красный interaction_responsiveness_contract в очереди координатора; правило «каждый раздел мгновенно»)
Owner: сессия 1 · ЯДРО

## Outcome

components/DeferredRedirect.tsx ждал InteractionManager.runAfterInteractions + setTimeout(0) перед router.replace.
Пока идёт любая анимация (вход на экран, шторка), редирект откладывался — человек видел пустой фон темы. Сторож
interaction_responsiveness запрещает это ещё с исходного контракта. Теперь — один requestAnimationFrame после готовности
корневой навигации: replace не попадает в тот же кадр, что монтирование (это и было причиной отложить), но и не ждёт
анимаций. Отмена — cancelAnimationFrame при размонтировании.

## Scope

components/DeferredRedirect.tsx (используется +not-found, (tabs)/index, index, lesson_verbs, лаборатории Learning V2).

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

safe_modal_navigation.ts и прочие места сторож проверяет отдельно — они уже зелёные.

## Verification

interaction_responsiveness_contract; синтаксис; сторожи маршрутов, читающие DeferredRedirect.

## Rollback

git revert коммита.

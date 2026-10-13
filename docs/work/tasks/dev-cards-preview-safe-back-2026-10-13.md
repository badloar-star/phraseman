# Task packet: dev-превью итога Карточек — безопасный возврат вместо нативного router.back()

Governance-ID: TG-594EDEF32DC0
Status: In progress
Owner: Ядро (сессия 1)
Related: Темы 13.10 ~13:20 — красный tests/navigation_back_underlay_contract.test.ts из-за app/dev_cards_result_preview.tsx:42 (мой e96b0d647)

## Outcome

app/dev_cards_result_preview.tsx: «Готово» превью итога Карточек возвращает через `safeRouterBack(router)` (app/navigation_back),
как остальные экраны, — без нативного `router.back()`. Сторож навигации снова зелёный.

## Scope

In scope: одна строка и импорт в dev-превью. Out of scope: прод-экраны.

## Architecture

No architecture change.

## Security and privacy

Нет.

## Technical debt

- Нет: превью только для dev-сборки.

## Verification

tests/navigation_back_underlay_contract.test.ts; babel-проверка.

## Rollback

Откат коммита.

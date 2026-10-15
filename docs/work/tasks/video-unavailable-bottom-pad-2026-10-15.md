# Видео: состояния «нет роликов» и «сейчас недоступно» не уходят под таббар (проверка «ничего под таббаром», координатор 15.10)

Governance-ID: TG-88B9E65C8D56

## Outcome
Два пустых состояния вкладки «Видео» имели нижний отступ из стиля, а не из общего источника геометрии капсулы; при крупном шрифте низ содержимого оказывался под капсулой. Теперь отступ — `useTabContentBottomPad()` (верх капсулы + зазор), как у остальных списков вкладки.

## Scope
`app/lingman_videos.tsx` (два `contentContainerStyle`), `tests/button_audit_design_fixes_contract.test.ts`.

## Architecture
`inTab ? { paddingBottom: tabContentBottomPad } : null` поверх `styles.unavailable`.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Нет.

## Verification
Сторож по исходнику.

## Rollback
Откат коммита.

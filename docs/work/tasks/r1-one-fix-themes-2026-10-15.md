# R1_DIFF_ONE_FIX, раздел «Темы»: значок тоста и разделитель в меню диалога

Governance-ID: TG-C3E1A274B99B
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора)

## Outcome
paywall-gap-011: значок тоста — контурное кольцо с галочкой (образец `.wtoast .tb`, `checkC`/`alertC`), а не белый заливной круг; dialogs-gap-015: между пунктами меню «⋯» сессии диалога тонкий разделитель, плитки значков с малой тенью.

## Scope
components/ActionToast.tsx (иконки тонов: контурные), components/dialogs/glass/DialogueGlassMenuSheet.tsx — только стиль. Позиции, ждущие решения владельца (значок «В набор», цвет кнопки кода, переключатели, «Очистить память»), не трогаю.

## Architecture
Ionicons-варианты `-outline` для тонов success/error/info/warning; разделитель — линия-View высотой в волосок цвета токена.

## Security and privacy
Не применимо.

## Technical debt
Часть строк раздела — «образец ≠ код» или состояние/пересъёмка (cards-v2-005, cards-gap-001, cards-v2-022, cards-gap-020, cards-075) — кодовой правки не требуют, перечислены в отчёте.

## Verification
Тесты тостов, сторожа, срез типов; кадры paywall-gap-011, dialogs-gap-015 у Сверки.

## Rollback
git revert коммитов.

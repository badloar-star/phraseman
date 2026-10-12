# Task packet: окна «Промокод» и «Код от друга» — «✕» справа (overlays-campaigns-004/016/017)

Governance-ID: TG-F30527852CD9
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по сообщениям Макетов (12.10; решение координатора — следуем образцу)
Related epic/enabler: app/promo_code_entry.tsx, шторка «Код от друга» (app/referrals.tsx / components), promo-code-states.html, referral-code-states.html №1–2

## Outcome

«✕» стоит справа (в образце promo-code-states — справа без плашки; referral-code-states — справа в круге), заголовок по центру (referral) / как в образце.

## Scope

In scope: расположение кнопки закрытия и заголовка в двух окнах. Out of scope: онбординг (заморожен) — окна используются и вне онбординга, правка только их собственного заголовка.

## Architecture

No architecture change.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: расхождение с образцом на первом экране кампаний.

## Verification

Сторож на разметку, срез типов, пересъёмка Сверкой.

## Rollback

Откат коммита.

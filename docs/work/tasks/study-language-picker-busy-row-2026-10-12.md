# Task packet: язык изучения — busy только на тапнутой строке (R1_OPTIMISTIC_UI_REST п.3); проверка п.2 и п.4

Governance-ID: TG-C545FFC295A6
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/R1_OPTIMISTIC_UI_REST.md, components/settings/StudyLanguagePicker.tsx, components/LangContext.tsx, components/home/v2/HomeV2ContinueCard.tsx

## Outcome

Проверка по HEAD: п.2 (тост «Не удалось сохранить язык» при откате) закрыт adbed2e22; п.4 («Продолжить» на скелете нажимается, scale 0.98) закрыт 4ec1f25e9/комментарий в карточке; п.3: отметка активного языка в кадре тапа, откат и тост ошибки, busyRef — уже есть; остаётся «busy на всех строках» — полоса языков больше не блокируется целиком (disabled только на тапнутой строке во время смены, остальные тапы отсекает busyRef с логом).

## Scope

In scope: один атрибут полосы языков + сторож. Out of scope: онбординг (заморожен), шторка языка (не использует busy).

## Architecture

No architecture change.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: busy на всех строках блокировал полосу целиком.

## Verification

Сторож-контракт, срез типов.

## Rollback

Откат коммита.

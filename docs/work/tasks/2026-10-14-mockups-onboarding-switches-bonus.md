# Task packet — образцы к коду: онбординг-018, переключатели settings-gap-034, «Бонус на старт»

Governance-ID: TG-0CC4605B7947
Governance-ID: TG-B10F35164CC3

## Outcome
Координатор 14.10: onboarding-018 — мини-телефон в коде шире и ниже на ≈25 px (онбординг заморожен, правим образец); settings-gap-034 —
переключатели образца к коду; overlays-more — «Подарок на старт» → «Бонус на старт» (как IntroFullAccessModal); пакет «минимум элементов» —
пункт про 72 часа полного доступа (слово владельца 14.10 через Авторизацию: «такого не должно быть вообще, удалить»).

## Scope
docs/design/v2-app/onboarding-states.html, settings-gaps-states.html, overlays-more.html, minimum-elements-proposal.html (+ артефакт), реестр.

## Architecture
Правки скриптами с атомарной записью, numstat перед коммитом.

## Security and privacy
Не касается.

## Technical debt
Окно «Бонус на старт» в образцах остаётся до удаления в коде (порядок — координатор).

## Verification
playwright: снимки изменённых телефонов, 0 ошибок страниц.

## Rollback
git revert.

## Status
In progress.

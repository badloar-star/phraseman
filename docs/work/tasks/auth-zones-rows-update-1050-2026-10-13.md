# Task packet: строки diff/pending зоны Авторизации — сводка 13.10 ~10:50 (координатор)

Governance-ID: TG-5B4E1F7E07BC
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

В `docs/phraseman-2.0/AUTH_ZONES_DIFF_ROWS_R1_2026-10-13.md` дописан § 7 — все 56 строк R1 зоны (profile/settings-gap/auth-gap/
overlays-runtime: diff 27, pending 29). По каждой — что не так по кадру и кто чинит. Свои дефекты кода исправлены утром
(a548d5293, caa50be8e); новых не найдено. auth-gap-006 «красным» — образец тоже красный (проверено в браузере), не дефект.

## Scope

In scope — только документ. Код не меняется.

## Architecture

—

## Security and privacy

—

## Technical debt

- Contain: статусы в реестре ведёт Сверка; документ — снимок на 10:50.

## Verification

Список id совпадает с выгрузкой реестра (status diff|pending, release r1).

## Rollback

git revert коммита.

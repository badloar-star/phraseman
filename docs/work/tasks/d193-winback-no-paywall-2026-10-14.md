# Task packet: D193 шаг 1 — по возвращении после долгого отсутствия пейвол Plus больше не показываем (владелец 14.10)

Governance-ID: TG-85BACE59AF7F
Governance-ID: TG-68B60DAE1131
Status: Тест (красный) готов; код — одной волной с D186 и FIRST-TOUCH, после WB-R Сверки
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Владелец 14.10 (D193), об образце «Ты вернулся» из engagement-moments-v3-all: «ВОТ ЭТО ОТЛИЧНО! ВМЕСТО ПРЕДЛОЖЕНИЯ КУПИТЬ — ВОТ ЭТОТ БУДЕТ ЛУЧШЕ».

Шаг 1, сборка 16.10: `_layout.checkWinbackOffer` больше не открывает `/premium_modal` (context=winback).
- Гейт и запись активности остаются — на них сядет окно «С возвращением» (шаг 2).
- Отметка «показано в этом окне неактивности» ставится, как раньше: одно решение на возвращение.
- События `winback_shown` больше не шлём — окна покупки нет.
- Лог `[WINBACK] show=skipped reason=paywall_retired_D193 awayDays=…`.

Пейвол из остальных мест не трогается. Заодно снимается путь, на котором владелец поймал «зависание».

Шаг 2 (после D187; успеет с кадрами — в 16.10, иначе OTA): окно «С возвращением» по образцу — отдельный пакет.

## Scope

In scope: `app/_layout.tsx` (блок `if (show)` в `checkWinbackOffer`), сторож `tests/d193_winback_no_paywall.test.ts`.
Out of scope: гейт `winback_offer.ts`, другие входы в пейвол, окно шага 2.

## Architecture

Заменить `globalRouter.push('/premium_modal', { context: 'winback' })` и аналитику показа на лог. Сохраняем `markWinbackShown` и `recordLastActive`.

## Security and privacy

Меньше событий аналитики (`winback_shown` не шлём).

## Technical debt

- Контекст пейвола `winback` в текстах остаётся до чистки после R1 (мёртвый, вход не открывается).

## Verification

- Сторож D193.
- Сверка: `winbackaway=8` → свернуть / развернуть → пейвола нет, в журнале `[WINBACK] show=skipped`.

## Rollback

`git revert` коммита.

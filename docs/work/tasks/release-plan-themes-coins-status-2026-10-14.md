# План выхода 20.10: статус зоны Тем (coins, themes, themes-gradient)

Governance-ID: TG-3A476A00DAFC
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (старт по плану, `docs/phraseman-2.0/RELEASE_PLAN_2026-10-11.md`)
Related epic/enabler: coins-backdrop-v2-2026-10-14.md; shadow-style-tokens-2026-10-14.md

## Outcome

В журнал для координатора записан статус зоны: по coins — какие diff закрыты хэшами, какие не про цвет; по themes (19) и themes-gradient (3) — готовность к съёмке 13.10 и что нужно роботу.

## Scope

In scope: запись в `INBOX_COORDINATOR_FROM_THEMES.md`. Out of scope: правка реестра `visual_parity.json` (он у Сверки).

## Architecture

Изменений кода нет; статус опирается на коммиты `97099c35d`, `d85b3a22a`, `64eadf1ea`.

## Security and privacy

Не применимо.

## Technical debt

`code[]` у `themes-gradient-001…003` пуст — привязка за Сверкой; состояния coins-003/-004 требуют аккаунта с достаточным балансом.

## Verification

Хэши проверены по `git log`; тесты по зоне зелёные (записи 13–14.10).

## Rollback

Откат записи в журнале `git revert`.

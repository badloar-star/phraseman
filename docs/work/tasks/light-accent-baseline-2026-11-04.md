# Task packet: снижение базы храповика светлого акцента (PaywallPlusScreen)

Governance-ID: TG-4560B2712546
Status: In progress
Owner: сессия «Темы»
Related epic/enabler: none

## Outcome

В `config/light-accent-graphics-baseline.json` число сырых обращений к `accentBorder`/`accentText` для `components/paywall/PaywallPlusScreen.tsx` снижено с 1 до 0 (в закоммиченном `HEAD` в файле уже ноль). Храповик «уменьшилось — обнови базу» перестаёт быть красным по этому файлу. Пользователь ничего не видит: это только учёт.

## Scope

In scope: `config/light-accent-graphics-baseline.json` (ключ `deepCounts` для PaywallPlusScreen и `deepTotal` −1).
Out of scope: рост по `PackRow.tsx`, `CommunityWinnerDialog.tsx`, `CommunityPackCheckScene.tsx` (ждём коммит «Сайт», решение координатора), реферальная лесенка `referral_ladder*` (WIP, в базу не вносится), сами компоненты.

## Architecture

Только данные учёта; код компонентов не меняется. Тест `tests/light_accent_graphics_ratchet.test.ts` читает базу и сравнивает со сканером `scripts/light_accent_graphics_scan.mjs`. Понижение базы не открывает новых мест: сканер по-прежнему считает текущее состояние рабочего дерева.

## Security and privacy

Не применимо: данные не собираются и не передаются, аутентификация, персональные данные и политика не затрагиваются.

## Technical debt

- Рост по PackRow / CommunityWinnerDialog / CommunityPackCheckScene до коммита «Сайт» остаётся красным в храповике (Accept temporarily, владелец — координатор, выход — поднять базу или заменить сырой акцент токеном).
- Реферальная лесенка — KNOWN_ISSUES (WIP, вне базы).

## Verification

- `npm run test:one -- tests/light_accent_graphics_ratchet.test.ts`: тест «уменьшилось» по PaywallPlusScreen проходит; тест «не растёт» по остальным файлам остаётся красным только из-за чужого WIP (ожидаемо, см. сообщение координатору).
- Сканер: `node scripts/light_accent_graphics_scan.mjs --json` — число по PaywallPlusScreen = 0.
- Закоммичено через `scripts/safe_commit.sh` с `--expect config/light-accent-graphics-baseline.json=A/D`.

## Rollback

`git revert` коммита: база вернётся к 1 по PaywallPlusScreen, тест снова попросит её понизить.

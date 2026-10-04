# Task packet: ThemedArt — сцены окон первого входа (06dd77148)

Governance-ID: TG-063BD047E79F
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: docs/work/tasks/2026-10-04_themed_art.md

## Outcome

14 сцен окон первого входа (assets/images/v2art/{dark,light}/intro_*.webp, коммит Codex 06dd77148) доступны через ThemedArt; 14-я сцена `intro_profile_card` больше не пропускается генератором; у intro_cards_hub, intro_cards_swipe, intro_legacy_lessons подтягивается слой `.accent` и красится в цвет темы.

## Scope

In scope: `app/theme/themed_art_registry.ts` (+ имя), `app/theme/themed_art_assets.generated.ts` (пересборка скриптом), `tests/themed_art.test.ts` (111 имён, проверка .accent трёх сцен).
Out of scope: подключение в окна (сессия 2); сами картинки.

## Architecture

Нет изменений: имя добавлено в группу «Вступления»; generated пересобран `scripts/gen_themed_art_assets.mjs`.

## Security and privacy

Не применимо.

## Technical debt

Нет новой. `intro_profile_card` — 14-я сцена вне исходного ТЗ (13) — запасной картинки нет (origin до файлов был бы 'none'), но файлы уже есть.

## Verification

`node scripts/gen_themed_art_assets.mjs --check` без предупреждений; тест — 111 имён, 14 сцен origin 'v2art' в обеих яркостях, у трёх accent ≠ null, у остальных 11 — null; проверка типов моих файлов — 0 ошибок.

## Rollback

`git revert` — `intro_profile_card` снова пропускается, остальное без изменений.

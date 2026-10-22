# Кнопка назад на сцене без литералов; пометки замков у двух сторожей; реестр замков

Governance-ID: TG-49F2ADA7E683

## Outcome
5 · ВХОД и 11 · РЕВИЗОР: (1) сторож цветовых литералов v2 красный из-за запасного `'#FFFFFF'` в BackButton (sceneTop) — цвет светлых чернил берётся только из токена `g.mediaInk`; (2) у сторожей `v2_screens_color_literals_ratchet` и `theme_semantic_follows_current_theme` нет пометки замка «цвета строго оттенки текущей темы»; (3) новый сторож `theme_switch_clears_dev_override` внесён в KNOWN_GUARDS мета-сторожа.

## Scope
In scope: `components/v2/BackButton.tsx` (одна строка), комментарии-пометки в двух тестах, `tests/owner_locks_registry.test.cjs` (KNOWN_GUARDS).
Out of scope: хунки 5 · ВХОД в BackButton/ScreenBackButton (SCREEN_BACK_ZONE и др.) — коммитятся только мои хунки.

## Architecture
Без изменений: back_on_scene.ts принимает mediaInk из токена темы; BackButton передаёт `g.mediaInk` без запасного литерала.

## Security and privacy
Данных не касается.

## Technical debt
Долга не добавляется: запасной литерал убирается; экраны сцен передадут sceneTop сами (владельцы Главной, Диалогов, Сезона).

## Verification
`node --test tests/v2_screens_color_literals_ratchet.test.mjs`, `node --test tests/owner_locks_registry.test.cjs`, jest по кнопке назад.

## Rollback
Вернуть запасной литерал (не рекомендуется) и убрать пометки.

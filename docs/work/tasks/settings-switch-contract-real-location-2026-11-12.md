# Task packet: сторож переключателя Настроек смотрит в реальный файл

Governance-ID: TG-722DC1A268BF
Status: Done
Owner: Claude (side session, ночное дежурство 2026-11-12, по поручению координатора)
Related epic/enabler: settings-wider-blocks-2026-11-11

## Outcome

Тест `glass rows keep the approved row, tile, text and switch metrics…` в
`tests/settings_root_liquid_glass_source_contract.test.mjs` снова зелёный и по-прежнему ловит
поломку переключателя. С 04.11 (коммит 2b683c3d9) переключатель Настроек — общий
`components/settings/GlassSwitch.tsx`; `SettingsGlassSwitch` в `SettingsGlassRows.tsx` только
делегирует ему. Тест искал роль, размеры и сдвиг бегунка в старом месте.

## Scope

In scope: только этот тестовый файл — проверки переключателя читают `GlassSwitch.tsx`
и дополнительно требуют, чтобы `SettingsGlassSwitch` делегировал `GlassSwitch`.

Out of scope: код переключателя и строк Настроек не меняется.

## Architecture

No architecture change: тест следует за уже сделанным выносом переключателя в общий компонент.

## Security and privacy

Не касается данных и доступа — только сторож вёрстки/доступности.

## Technical debt

Pay now: устаревший сторож приведён к реальной структуре кода, без ослабления.

## Verification

Строгость не снижается — каждая прежняя проверка заменена эквивалентной:
- роль `switch` + `accessibilityState={{ checked: value, … }}` — в GlassSwitch;
- дорожка 48 (`width: 48, minWidth: 48`), зона нажатия ≥ 44: `minHeight: 36` + `hitSlop` 8/8 = 52;
- сдвиг бегунка 19 dp: `translateX: progress.value * 19`;
- `SettingsGlassSwitch` рендерит `<GlassSwitch`.
Прогон: `node --test tests/settings_root_liquid_glass_source_contract.test.mjs` через светофор → 10/10.

## Rollback

Вернуть прежние три строки утверждений (git revert коммита) — код приложения не затронут.

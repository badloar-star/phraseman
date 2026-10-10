# Task packet: храповик цветов — разметка арта/бренда theme-exempt и вердикт Learning V2 из токенов темы

Governance-ID: TG-088BB92615B7
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0» (контур: токены тем)
Related epic/enabler: координатор 10.10 19:58 — остаток храповика цветов (база 988), читаемость, Learning V2

## Outcome

Из 988 захардкоженных цветов ~650 — палитры иллюстраций и бренда (арт-фоны, SVG башни/сертификата/монеты/сцены, металлы статусов, кнопки входа, конфетти). Они помечаются `// theme-exempt: причина` (сканер не считает). Тема здесь не должна менять цвет по замыслу. Там, где цвет должен следовать теме, — токен: вердикт Learning V2 (`useLv2Glass`: `good`/`bad` и производные) теперь из токенов темы вместо литералов `#6FD08C`/`#F2766B`.

## Scope

In scope: помеченные файлы (арт/бренд, 22 файла), `components/learning-v2/LearningV2Glass.tsx` (`useLv2Glass`), `constants/liquidGlassPaletteRoles.ts` (оттенки semantic ≈ эталон Learning V2), база храповика (только строки моих файлов).
Out of scope: legacy-маршрут `app/learning-v2/session/[id].tsx` (118) и `learning_v2_session_intro_check.tsx` (52) со своей тёмной палитрой — перенос на токены = переписывание экрана, нужна отдельная задача; файлы вне моего списка, изменённые в рабочей папке другими сессиями (ForceUpdateGate, UpdateModal и др.); Главная.

## Architecture

Пометка ставится построчно скриптом; строка принимается, только если вывод транспилятора без комментариев не изменился — поведение гарантированно прежнее. Токены good/bad из `liquidGlassTokens` (контраст ≥ 4.5 на всех поверхностях всех тем) подставлены в `useLv2Glass` — потребители `g.good/g.bad/g.goodFill…` получают цвет темы автоматически. Константы `LV2_GOOD/LV2_BAD` остаются запасными для кода вне темы (помечены).

## Security and privacy

Не применимо.

## Technical debt

- Legacy-маршрут сессии Learning V2 и intro_check (170 цветов) — Contain: отдельная задача на перенос палитры в `useLv2Glass`-токены; списки соответствий в итоге координатору.
- Три прямых потребителя `LV2_GOOD/LV2_BAD` (`dialogue_v2_completion`, `CollectionListView`, `UgcPackEditorCardPreview`) — Contain: перевести на `g.good/g.bad` в их контурах.

## Verification

`node --test` по сторожам, смотрящим на правленые файлы (146 тестов; 2 красных не из моих правок: `flashcards_speaking_liquid_glass` — хеш `flashcards_speaking_session.tsx`, `spire_tab_gate` — флаг конфигурации); jest по 60 файлам (красные — не из моих правок: `statsThemeChrome`, tab layout, speech и др.); `theme_palette_roles` 8/8, `theme_surface_roles` 5/5, `theme_intensity_slider` 16/16; `theme_hardcoded_colors_ratchet` проходит.

## Rollback

`git revert` — пометки исчезнут, `useLv2Glass` вернётся к литералам.

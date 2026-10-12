# Ночная зачистка цвета (Темы, 13.10): `git diff 7f569e653..HEAD -- app components hooks`

Диапазон: 114 коммитов, 102 файла, +1452/−206 строк в app/components/hooks (от 12.10 22:16). Разбор — построчно по добавленным строкам: литералы цвета (`#hex`, `rgb/rgba/hsl`, `'white'/'black'/named/'transparent'`) и `border*Width/Color`; без комментариев, тестов, dev-файлов и строк с `theme-exempt` / `light-accent-ok` / `guard-ok` / `shadow-ok`.

## Результат: нарушений нет
Литералы цвета (3):
- `components/ui/v2_theme.ts:22–23` — запасные значения `accentGraphic` / `accentTextSafe` в базовой палитре турнира (`T`); это определение палитры, не экран. Реальные значения берутся из темы: `t.accentGraphic ?? t.accent`. Оставлено.
- `app/(tabs)/community.tsx:146` — `'transparent'` для неактивной вкладки; прозрачность, не цвет. Оставлено.

Обводки (4) — ни одна не новый контейнер, во всех случаях менялся только цвет существующего элемента:
- `components/feedback/TransitionBridge.tsx:94` — кольцо вокруг значка (круг-индикатор состояния), цвет `accentGraphic`.
- `components/feedback/VictoryBurst.tsx:123` — кромка вспышки победы, цвет `accentGraphic`.
- `app/flashcards/DeckSelectionTile.tsx:251` — кольцо выбора плитки набора (индикатор выбора), цвет `accentGraphic` / `textGhost`.
- `app/(tabs)/community.tsx:146` — подчёркивание активной вкладки (разделитель одной стороны, разрешён), цвет `accentGfx.border`.

Новых контейнеров с `borderWidth` у карточек/плашек за ночь не появилось. Новых литералов цвета вне палитр нет, пометок не требуется, чужих файлов в список владельцам добавлять нечего.

## Что не сделано
Ратчеты `theme_hardcoded_colors_ratchet` и `shadow_style_no_container_borders` не прогнаны: свободной памяти меньше 3 ГБ. Прогнать при ≥3 ГБ (точечно, по слоту). Известные красные от Codex (`modules/learning-v2/modes/mode_feedback_v1.tsx`) в этот диапазон не входят.

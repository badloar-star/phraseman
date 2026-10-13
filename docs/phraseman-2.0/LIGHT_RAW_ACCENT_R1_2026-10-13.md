# Светлое оформление: где графика/значки ещё красятся сырым accent (R1, Темы, 13.10)

Источник: `node scripts/light_accent_graphics_scan.mjs` (раздел 1 аудита `LIGHT_ACCENT_GRAPHICS_AUDIT_2026-10-13.md`), 56 мест на начало прохода, **47 после правок этого прохода**; Codex-область (34) и онбординг (заморожен) сканером не считаются (онбординг со своими палитрами от тем Liquid Glass не зависит).

## Контраст на светлой «Аврора ＠1» (худшая из поверхностей: фон, верх/низ фона, карточка, контрол, шторка)
- сырой `accent` #7EF0C8 — **1,00:1** (на ＠0,75 — 1,77; на ＠0,6 — 2,62; на ＠0,5 — 3,47);
- `accentGraphic` #48816E — **3,27:1** (на ＠0,5–0,75: 3,39–3,54) — оттенок тот же (H 159→160);
- `accentBright`/`accentText` #185E47 — 5,56:1 (значки, подписи), `accentBorder` #1D7458 — 4,12:1;
- чернила на заливке: `accentInk` #04261D на `accent` #7EF0C8 — 11,68:1 (на ＠0,5: чёрный на #4D8674 — 4,98:1).
Вывод: **заливка кнопки/пузыря/бейджа С ТЕКСТОМ на сыром accent допустима** — её читаемость определяет контраст чернил на заливке (≥ 4,98), а не заливки на фоне. Проблема только у графики и значков БЕЗ заливки и текста.

## Исправлено в этом проходе (9 мест, тёмный вид байт-в-байт: оба токена равны accent)
| Место | Что | Замена |
|---|---|---|
| `components/paywall/paywallShared.tsx:84` | `heroAccent` пейвола: иконки карточек, вуали и разделители | `accentGraphicOf(theme)` |
| `app/flashcards_swipe.tsx:3671` | круг выбора набора (чекбокс) | `t.accentGraphic ?? t.accent` |
| `components/mistakes-panel/panelPaint.ts:27` | запасной градиент кольца | `g.accentGraphic` |
| `app/flashcards/CardsHubV2.tsx:73` | запасной градиент плитки | `g.accentGraphic` |
| `components/ui/v2_sheet.tsx:194` | цвет текста/значка плашки (`tone='accent'`) | `P.accentTextSafe` |
| `components/ui/v2_ui.tsx:333` | значок/число чипа (`tone='gems'`) | `P.accentTextSafe` |
| `components/icons/LiveStreakFlame.tsx:45` | только цвет свечения (22–40 % альфа) | пометка `light-accent-ok` |
| `components/SaveToCardsButton.tsx:124, 148` | цвет приходит пропом, вызывающие передают `text` | пометка `light-accent-ok` |

## Остаток (47) — не требует правки токена, по классам
**А. Заливка с текстом на ней (контраст чернил ≥ 4,98) — оставлено:** `app/ai_companion_session.tsx:133,367`; `app/ai_dialog_briefing.tsx:66`; `app/ai_dialog_session.tsx:2159,2581` (пузырь своей реплики), `3283` (бейдж PLUS), `3589`; `app/flashcards_swipe.tsx:3519`; `app/flashcards_voice_picker.tsx:417`; `app/flashcards/CollectionListView.tsx:966`; `app/lesson_complete.tsx:492`; `app/(tabs)/lessons.tsx:5008` (счётчик); `components/AiDialogBriefingScreen.tsx:337`; `components/friends/FriendsGlassKit.tsx:147`; `components/NotificationPermissionModal.tsx:134`; `components/ReviewPromptModal.tsx:87`; `components/StatsPremiumBlur.tsx:219`; `components/ui/v2_sheet.tsx:123` (кнопка).
**Б. Круглая кнопка со значком без текста (значок чернилами на заливке; сама заливка на фоне 1,0:1) — решение Дизайна:** `app/ai_dialog_session.tsx:3241` (микрофон при записи), `3367` (отправить).
**В. Вуали/тинты/картинки/свечение (не график):** `app/(tabs)/home.tsx:2131` (слой арта плитки), `app/streak_stats.tsx:1596,1710,2520` (мягкие тинты), `components/ui/v2_ui.tsx:462,463`, `components/paywall/paywallShared.tsx:86–98` (прозрачные вуали и контуры), `app/_motion_showcase.tsx:144` (показ анимаций, dev).
**Г. Карта уроков / dev:** `app/(tabs)/lessons.tsx:1754` (заливка узла карты с текстом), `1844`, `1866` (ветка devUnlocked, только dev).
**Д. Передача в компонент (проверить получателя — владелец экрана):** `app/lesson_complete.tsx:1284` (карточка отзыва), `app/streak_stats.tsx:1123,1170,1212,2658` (режим «бизнес»), `components/DialogsTabContent.tsx:343,566` (вуаль `accent+1F/2A/26`, плашка PLUS с текстом), `components/SpeakingPanel.tsx:246` (кнопки с текстом и вуали), `components/lesson_help_theory_ui.tsx:59` (уже `accentText`), `components/paywall/PaywallPlus.tsx:57` (диск с галкой чернилами).

## Не сделано
- Онбординг: только отмечен как не затронутый (заморожен, свои палитры).
- Тесты прогнаны по слоту отдельно (см. коммит): храповик графики и токен.

## Решения координатора и итог второго шага (13.10, база 47 → 38)
- **Класс Д исправлен (тёмный байт-в-байт):** `app/lesson_complete.tsx:1284` (полосы разбора урока → `accentGraphicOf(t)`, плюс импорт); `app/streak_stats.tsx:1123/1170/1212` (режим «бизнес») и `2659` (блок «за всё время») → `accentGraphicOf(t)`. Остальное в классе Д — не график, помечено `light-accent-ok` с причиной: `components/DialogsTabContent.tsx:343/566` (только вуаль `accent+альфа` и подложка значка; плитка сценария поле `accent` не читает), `components/SpeakingPanel.tsx:246` (заливки кнопок с чернилами accentInk ≥ 4,98:1), `components/paywall/PaywallPlus.tsx:57` (диск с галкой чернилами).
- **Класс Б — уже выполнен:** значки круглых кнопок `ai_dialog_session.tsx:3241` (микрофон при записи) и `3367` (отправить) красятся `t.textOnGold`, а в темах Liquid Glass `textOnGold === accentInk` (`makeLiquidGlassTheme`, `textOnGold: t.accentInk`), т. е. 11,68:1 на ＠1; правки не потребовалось.
- Классы А, В, Г — оставлены по решению координатора.

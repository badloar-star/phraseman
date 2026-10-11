# Бледные места в светлых цветных темах (пакет accentText, кадры Сверки ACC_*)

Governance-ID: TG-B7D90F76E47B

## Outcome
По кадрам Сверки (светлая «Максимум» Аврора/Ирис/Магма и «Акцент», тёмная Аврора; экраны cards, swipe_answer, referrals, settings, dlg_brief, home, streak) составлен список бледных мест; исправлено то, что в зоне Дизайна, добавлены сторожа.

## Scope
`components/cards-grid/CardsKit.tsx` (значок плитки), переключатели (`app/settings_edu.tsx`, `app/settings_notifications.tsx`, `app/privacy_settings.tsx`, `components/settings/SettingsGlassRows.tsx` + новый `components/settings/switch_chrome.ts`), док кнопок (`components/mistakes-panel/PanelKit.tsx`), псевдонимы акцента как текста (`FlashcardsCategoryHub`, `shop`, `streak_stats`, `AppMessagesInbox`, `DialogsTabContent`, `ClozeGapText`, `ComboRing`, `AddToFlashcard`, `flashcards_swipe`), сторожа.

## Architecture
Правила: значок на плитке-градиенте в светлом — `g.text` (а не белый `mediaInk`); граница дорожки выключенного переключателя в светлом — `secondary` 65 % (≈3:1); цвет «акцент как текст» всегда через `accentText`, в том числе через локальные псевдонимы; док кнопок красится низом градиента фона, а не плоским `g.bg`.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Ручки переключателей и включённая дорожка не менялись (ручка 5.6:1 к дорожке, включённая дорожка — тон темы). Кадр Главной: серые «пятна» на плитках «Серия/Монеты/Уроки» — отдельный артефакт блика, не из этого прохода.

## Verification
Проверка типов в слоте светофора, сторожа `accent_text_on_light_card_contract` (теперь и псевдонимы) и `switch_track_border_contract`, контрактные тесты по затронутым файлам, пересъёмка Сверкой.

## Rollback
Откатить коммит.

## Список бледных мест

| Экран (кадр) | Что бледное | Причина | Файл | Исправление |
|---|---|---|---|---|
| Настройка тренировки (swipe_answer), все светлые | значок «людей» и другие значки в плитках строк наборов; значок «Умная очередь» | белый `mediaInk` на бледной плитке-градиенте (1.4–2.6:1 в светлой) | `components/cards-grid/CardsKit.tsx` `KitIconTile` | в светлой `g.text`, в тёмной `mediaInk` |
| Настройка тренировки (swipe_answer) | серая полоса внизу и просвечивающий сквозь неё список | затухание дока красилось плоским `g.bg`, а фон — градиент | `components/mistakes-panel/PanelKit.tsx` `PanelDock` | низ градиента фона `bgBottom`, непрозрачность F2 |
| Настройки обучения (settings), все светлые | дорожка выключенного переключателя сливается с карточкой (1.1–1.3:1) | кромка `glassEdge` в светлой — 12 % чёрного | 4 файла переключателей | `switchTrackBorder`: `secondary` 65 % (≈3:1) |
| Серия (streak) | «Все 9», значки, цифры, линия графика бледно-лавандовые на розовом | локальный псевдоним `accent = t.accent` | `app/streak_stats.tsx` | псевдоним через `accentText` (4 места) + `chartTheme.accent` |
| Хаб Карточек | подписи плиток цветом акцента | `hubLabelAccent = t.accent` | `app/flashcards/FlashcardsCategoryHub.tsx` | `accentText` |
| Магазин | цена цветом золота | `priceColor = t.gold` | `app/shop.tsx` | `accentText` |
| Сообщения | значок «письма», бейдж опроса | `glass.cta`/`theme.accent` | `components/AppMessagesInbox.tsx` | `accentText` (заливки не менялись) |
| Диалоги (вкладка) | значок «открыто» | псевдоним `accent` | `components/DialogsTabContent.tsx` | `t.accentText` |
| Карточки в тексте, комбо, «в карточки» | пропуск в тексте, число комбо, значок сохранения | `t.accent`/`t.gold` | `ClozeGapText`, `ComboRing`, `AddToFlashcard` | `accentText` |
| Источники в настройке swipe | значок выбранного источника | псевдоним `selectedAccent` | `app/flashcards_swipe.tsx` | `t.accentText` |

Оставлено с причиной: `PhraseCard` и `pack_opening` — цвет набора/кнопка с белым текстом (не тема); `streak_stats scoreAccent` — семантические цвета оценки; `VipSurveyModal accent.main` — уже `g.text`.

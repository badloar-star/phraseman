# Светлый акцент — вердикты Ядра по разделам 2–3 аудита (768656f71) · 13.10 ночь

Источник: `LIGHT_ACCENT_GRAPHICS_AUDIT_2026-10-13.md` (Темы). Разделы 2 (29 заливок) и 3 (51 алиас) — Ядро. **Код ещё не менялся** — см. «Блокер».

## Блокер: прямая замена меняет ТЁМНЫЙ вид (замер `liquidGlassTokens`)

Аудит считает, что «в тёмном `accentBorder` ≈ `accent`». Замер по темам × оформлению × уровню:

| Тема | тёмное 0 (Спокойно) accent / accentBorder | тёмное 1 accent / accentText | светлое 1 accent / accentBorder / accentText |
|---|---|---|---|
| graphite | `#F2F1F6` / `#F4F5F8EB` ≠ | `#ABC0D7` / `#ABC0D7` = | `#4D6C8C` / `#4D6C8C` / `#3F5D7D` |
| rose | `#F4DDE7` / `#F9E5EDEB` ≠ | `#EAABA8` / `#EAABA8` = | `#9A504F` / `#9A504F` / `#8A4241` |
| marine | `#D0EAED` / `#DAF0F3EB` ≠ | `#5CCFEB` / `#64D1EC` ≠ | `#007A9A` / `#007A9A` / `#006B8B` |
| grad_aurora | `#F2F1F6` / `#F2F1F6` = | `#7EF0C8` / `#98F3D3` ≠ | `#7EF0C8` / `#1D7458` / `#185E47` |
| grad_iris | `#F2F1F6` / `#F2F1F6` = | `#C7C9FF` / `#D5D7FF` ≠ | `#C7C9FF` / `#3E4985` / `#323B6B` |

- В тёмном «Спокойно» (вид по умолчанию у большинства) у тонированных тем `accentBorder` ≠ `accent` → замена графики поменяет тёмный вид.
- В тёмном «Максимуме» `accentText` ≠ `accent` у части тем → замена текста тоже сдвигает тёмный вид.

**Предложение (отправлено Темам):** два производных токена в `GlassTokens` и `Theme` (`makeLiquidGlassTheme`), в тёмном — байт-в-байт `accent`:
- `accentGraphic` = светлое ? `accentBorder` : `accent` — кольца, полосы, точки, контуры, спиннеры, ячейки тепловой карты;
- `accentTextSafe` = светлое ? `accentText` : `accent` — текст и значки на поверхности.
Для v2-палитры `P` (`getV2Palette`) — те же два поля. После токенов замены ниже — механические, храповик опускается на число исправленных строк.

## Раздел 2 — заливки (29)

| файл:строка | что это | вердикт |
|---|---|---|
| `app/_motion_showcase.tsx:144` | метка в dev-витрине анимаций | ок (dev, человек не видит) |
| `app/(tabs)/lessons.tsx:5003` | плашка-бейдж с текстом внутри | ок (заливка с подписью) |
| `app/ai_companion_session.tsx:132`, `:365` | кнопки с текстом | ок |
| `app/ai_dialog_briefing.tsx:66` | кнопка с текстом | ок |
| `app/ai_dialog_session.tsx:2157`, `:3587` | кнопки с текстом | ок |
| `app/ai_dialog_session.tsx:2579` | пузырь реплики ученика (текст внутри) | ок, если текст `accentInk` (проверить при замене) |
| `app/ai_dialog_session.tsx:3239` | круглая кнопка микрофона в режиме «слушаю» | ок, если значок внутри `accentInk` (проверить) |
| `app/ai_dialog_session.tsx:3281` | бейдж-счётчик с текстом | ок |
| `app/ai_dialog_session.tsx:3365` | кнопка «отправить» (значок) | ок, если значок `accentInk` (проверить) |
| `app/flashcards_swipe.tsx:3494` | кнопка «Начать» | ок |
| `app/flashcards_voice_picker.tsx:417` | кнопка с текстом | ок |
| `app/flashcards/CollectionListView.tsx:966` | кнопка действия с текстом | ок |
| `app/flashcards/FlashcardsCategoryTiles.tsx:91` | **точка 6×6** | **→ `accentGraphic`** |
| `app/lesson_complete.tsx:491` | кнопка | ок |
| `app/referral_access_ended_modal.tsx:238` | кнопка | ок |
| `app/referrals.tsx:698` | кнопка «Получить приз» | ок |
| `app/streak_stats.tsx:1592` | подложка переключателя метрик | ок (подложка, выбранный сегмент — отдельно) |
| `app/streak_stats.tsx:1706` | плитка-подложка значка (`accentTint`, полупрозрачная) | ок (вуаль); значок внутри `accent` → **`accentTextSafe`** |
| `app/streak_stats.tsx:2516` | плитка-подложка (`accentTint`), значок уже `accentText` | ок |
| `components/account/NicknameEditModal.tsx:556` | кнопка «Сохранить» | ок |
| `components/AiDialogBriefingScreen.tsx:337` | кнопка | ок |
| `components/CombinedLessonBreakdown.tsx:91` | **полоса прогресса** | **→ `accentGraphic`** |
| `components/friends/FriendsGlassKit.tsx:147` | главная кнопка | ок |
| `components/lessons/LessonMenuGlass.tsx:298` | **полоса прогресса урока** | **→ `accentGraphic`** |
| `components/lessons/LessonsListGlassCard.tsx:188` | **полоса прогресса в списке уроков** | **→ `accentGraphic`** |
| `components/SaveToCardsButton.tsx:124` | свечение-ореол | ок (вуаль/свечение) |
| `components/settings/StudyLanguagePicker.tsx:337` | кружок-галочка 18×18 (значок внутри) | ок, если галочка `accentInk` (проверить) |

## Раздел 3 — алиасы и передача (51)

| файл:строка | получатель | вердикт |
|---|---|---|
| `app/(tabs)/lessons.tsx:5315`, `:5341`, `:5368` | `accent` вкладки-пилюли «Уроки/Диалоги/Курс» | проверить получателя: подпись активной вкладки → `accentTextSafe` |
| `components/energy/EnergyAttemptsHud.tsx:88` | шкала энергии | **→ `accentGraphic`** |
| `app/(tabs)/home.tsx:2110` | тон иллюстраций плитки | ок (ложное срабатывание, не цвет) |
| `app/(tabs)/lessons.tsx:1750` | заливка текущего узла карты с текстом `textOnGold` | ок |
| `app/(tabs)/lessons.tsx:1840`, `:1862` | значок/текст узла при dev-разблокировке | ок (только dev) |
| `app/(tabs)/lessons.tsx:1922` | **подпись текущего урока** | **→ `accentTextSafe`** |
| `app/(tabs)/lessons.tsx:5993` | `chapterAccent` → `accent=` аккордеона главы | проверить получателя (полоса главы → `accentGraphic`) |
| `app/flashcards_swipe.tsx:3646` | заливка выбранного источника (`backgroundColor`) с подписью | ок, если подпись `accentInk` |
| `app/flashcards/CardsHubV2.tsx:73`, `components/mistakes-panel/panelPaint.ts:27` | градиент заливки плитки | ок (заливка) |
| `app/flashcards/PhraseCard.tsx:533` | **значок озвучки** (`color={packTheme ? accent : g.text}`) | **→ `accentTextSafe`** (когда нет `borderAccent` набора) |
| `app/lesson_complete.tsx:1281`, `components/SpeakingPanel.tsx:246`, `app/streak_stats.tsx:2654`, `components/DialogsTabContent.tsx:343`, `:566` | объект цветов передаётся в компонент | проверить получателя при замене |
| `app/settings_themes.tsx:79` | **текст `ink` на подложке `accentSoft`** | **→ `accentTextSafe`** |
| `app/streak_stats.tsx:1120`, `:1167`, `:1209` | ветка `isBusiness` (константа `false`) | ок (мёртвая ветка) |
| `app/streak_stats.tsx:2612` | **столбики дней** | **→ `accentGraphic`** |
| `components/ActivityHeatmap365.tsx:180`, `:249` | **рампа тепловой карты** | **→ `accentGraphic`** (база рампы) |
| `components/home/DayRings.tsx:158`, `:160`, `:161` | **кольца дня** | **→ `accentGraphic`** (и `lighten(...)` от него) |
| `components/icons/LiveStreakFlame.tsx:45` | свечение огня | ок (свечение) |
| `components/lesson_help_theory_ui.tsx:59` | уже `accentText ?? accent` | ок |
| `components/paywall/PaywallPlus.tsx:57` | заливка метки с `accentInk` | ок |
| `components/paywall/paywallShared.tsx:83` `heroAccent` | гало/подсветка карточек (полупрозрачно) + `PaywallProofCards:273` (проверить, текст ли) | вуали — ок; текст в ProofCards — **`accentTextSafe`** |
| `paywallShared.tsx:84` `selectedCardBorder` | **контур выбранного тарифа** | **→ `accentGraphic`** |
| `paywallShared.tsx:85, 89, 90, 92, 93, 95, 97` | вуали, тени, заливка кнопки | ок |
| `paywallShared.tsx:94` `pillText`, `:96` `expandBtnText` | **текст** | **→ `accentTextSafe`** |
| `components/ReviewPromptModal.tsx:87` | кнопка с `accentInk` | ок |
| `components/StatsPremiumBlur.tsx:219` | кнопка с `accentInk` | ок |
| `components/ui/v2_sheet.tsx:123` | кнопка с `P.accentText` | ок |
| `components/ui/v2_sheet.tsx:194` | **текст чипа `tone='accent'`** | **→ `P.accentTextSafe`** |
| `components/ui/v2_ui.tsx:333` | **текст счётчика `gems`** | **→ `P.accentTextSafe`** |
| `components/ui/v2_ui.tsx:462`, `:463` | вуаль-градиент строки | ок |
| `components/youtube/YoutubeInlinePlayer.tsx:182` | **спиннер загрузки** | **→ `accentGraphic`** |

**Итог:** из 80 строк настоящих дыр ≈ 22 (выделены «→»); остальное — кнопки и заливки с подписью, вуали, свечения, dev и мёртвые ветки. Ещё 7 «проверить получателя» — решаются при замене. После токенов Тем: замены одной волной, храповик минус по факту.

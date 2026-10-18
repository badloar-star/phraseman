# Литералы цвета в app/ components/ modules/ без пометки theme-exempt (18.10, для правок ПОСЛЕ 08:00)

Сканер tests/helpers/hardcoded_colors_scan.mjs (тот же, что у ratchet theme_hardcoded_colors): 9 файлов, 165 литералов. «Риск светлой» — строка с color/background/fill/stroke и белым/чёрным/почти чёрным литералом: на светлой теме белое-на-светлом / чёрное-на-тёмном.

## Файлы по числу литералов

| Файл | Литералов | Риск светлой (строк) |
|---|---|---|
| app/learning-v2/session/[id].tsx | 106 | 8 |
| app/learning_v2_session_intro_check.tsx | 46 | 5 |
| components/UpdateModal.tsx | 5 | 0 |
| components/ForceUpdateGate.tsx | 3 | 0 |
| app/flashcards_speaking_session.tsx | 1 | 0 |
| app/language_welcome.tsx | 1 | 0 |
| components/DailyPhraseCard.tsx | 1 | 0 |
| components/GlobalBroadcastModal.tsx | 1 | 0 |
| modules/learning-v2/modes/listen_choose_mode_v1.tsx | 1 | 0 |

## Строки «риск светлой»

### app/learning-v2/session/[id].tsx
- 1552: `#07110A` — color="#07110A"
- 1649: `#07110A` — <Ionicons name="mic" size={22} color="#07110A" />
- 1770: `#07110A, #DDE5EE` — color={voiceRecording ? "#07110A" : "#DDE5EE"}
- 1908: `#07110A` — <Ionicons name="arrow-forward" size={20} color="#07110A" />
- 2087: `#07110A` — <Ionicons name="arrow-forward" size={20} color="#07110A" />
- 2554: `#07110A` — repeatButtonText: { color: "#07110A", fontSize: 16, fontWeight: "900" },
### app/learning_v2_session_intro_check.tsx
- 324: `#07110A` — <Ionicons name="arrow-forward" size={20} color="#07110A" />
- 358: `#1B2430, #000` — questionCard: { minHeight: 180, borderRadius: 28, backgroundColor: '#1B2430', padding: 24, justifyContent: 'ce
- 370: `#8EE65A, #07110A` — choiceIndexCorrect: { backgroundColor: '#8EE65A', color: '#07110A' },
- 371: `#FB7185, #07110A` — choiceIndexWrong: { backgroundColor: '#FB7185', color: '#07110A' },
- 386: `#07110A` — ctaText: { color: '#07110A', fontSize: 16, fontWeight: '900' },

## Пары «литерал ↔ реальный фон под ним» (18.10, 05:10, расчёт WCAG)

Экраны `app/learning-v2/session/[id].tsx` и `app/learning_v2_session_intro_check.tsx` — самодостаточные ТЁМНЫЕ экраны со своей палитрой (`screen: #10151D`, карточки `#1B2430/#202936`…): литералы лежат на литеральных же поверхностях, тема приложения на них не влияет (светлая тема даёт тот же тёмный экран; токены темы используют только шторка-гейт и скелетон в `[id].tsx`). Поэтому «сломать светлую тему» эти 13 строк не могут — это вопрос дизайна (экран не следует теме), а не контраста.

### Намеренно тёмная поверхность, ок (все ≥ порога)
| Пара | Контраст | Порог |
|---|---|---|
| [id] 1552 иконка #07110A на градиенте accent→#5872FF (худшая точка #5872FF) | 4,82 | 3 |
| [id] 1552 то же на худшем из 6 мета-акцентов | 7,06 | 3 |
| [id] 1649/2554 «Повторить»: #07110A на #F472B6 | 7,25 | 4,5 |
| [id] 1770 стоп #07110A на активной #8EE65A | 12,45 | 3 |
| [id] 1770 микрофон #DDE5EE на #202A36 | 11,42 | 3 |
| [id] 1908/2087 стрелка #07110A на кнопке #8EE65A | 12,45 | 3 |
| intro_check 324 стрелка, 386 подпись CTA #07110A на #8EE65A | 12,45 | 3 / 4,5 |
| intro_check 370 индекс «верно» #07110A на #8EE65A | 12,45 | 4,5 |
| intro_check 371 индекс «неверно» #07110A на #FB7185 | 7,13 | 4,5 |
| intro_check 358 карточка #1B2430 к экрану #10151D (поверхность, отделена тенью) | 1,17 | — |

### Реальный провал < 4,5
Нет: по 13 строкам «риск светлой» — 0 провалов. (Вне этих 13 строк литералы второго рода — например `#7F8B99` на `#10151D` — не считались, это не «риск светлой».)

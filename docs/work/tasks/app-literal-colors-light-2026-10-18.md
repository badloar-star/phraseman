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

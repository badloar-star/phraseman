Теперь у меня полная картина файла. Создаю мастер-план.

---

## МАСТЕР-ПЛАН: Phraseman Exercise UI Redesign

Файл: `C:/appsprojects/phraseman/app/personal_plan_exercise.tsx` (3157 строк)

---

### ГЕЙТ 0: Фундамент — StyleSheet обновление (строки 2010–3156)

**Что:** Обновить значения в `StyleSheet.create` для всех базовых компонентов. Логика JSX не меняется — только числа и стили.

**Точные изменения в `styles`:**

```typescript
// ЗАМЕНИТЬ полностью объект styles = StyleSheet.create({...})
// Ключевые изменения по компонентам:

bigCard: {
  borderRadius: 28,         // было 28 ✓
  borderWidth: 1.5,         // было 1.5 ✓
  paddingHorizontal: 18,    // было 18 ✓
  paddingVertical: 16,      // было 16 ✓
  gap: 12,                  // было 12 ✓
  elevation: 10,            // ИЗМЕНИТЬ с 10
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.24,
  shadowRadius: 26,
  // shadowColor задаётся инлайн ✓
},

modeIcon: {
  width: 36,               // ИЗМЕНИТЬ с 52 → 36
  height: 36,              // ИЗМЕНИТЬ с 52 → 36
  borderRadius: 11,        // ИЗМЕНИТЬ с 19 → 11
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 4,
  shadowOffset: { width: 0, height: 0 },  // ИЗМЕНИТЬ на 0,0
  shadowOpacity: 0.4,
  shadowRadius: 8,
},

modeEyebrow: {
  fontSize: 13,            // ИЗМЕНИТЬ с 12 → 13
  lineHeight: 16,
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: 0,
},

optionRow: {
  minHeight: 58,           // ✓
  borderRadius: 18,        // ✓
  borderWidth: 1.5,        // ✓
  paddingHorizontal: 14,   // ✓
  paddingVertical: 8,      // ✓
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,                 // ✓
  elevation: 3,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.10,
  shadowRadius: 10,
},

optionLetter: {
  width: 34,    // ✓
  height: 34,   // ✓
  borderRadius: 10,  // ✓
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},

optionLetterText: {
  fontSize: 14,
  lineHeight: 18,
  fontWeight: '900',
},

optionRowText: {
  flex: 1,
  fontSize: 17,   // ✓
  lineHeight: 22,
  fontWeight: '900',
},

missingWordChip: {
  minHeight: 58,       // ✓
  minWidth: '44%',     // ✓
  flex: 1,
  borderRadius: 18,    // ✓
  borderWidth: 1.5,
  paddingHorizontal: 14,
  paddingVertical: 10,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  elevation: 4,
  shadowOffset: { width: 0, height: 7 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
},

missingWordChipLetter: {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: 1,
},

missingWordChipText: {
  fontSize: 20,      // ✓
  lineHeight: 26,
  fontWeight: '900',
  textAlign: 'center',
},

hintPanel: {
  minHeight: 48,       // ✓
  borderRadius: 18,    // ✓
  borderWidth: 1,
  paddingHorizontal: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 9,
},

hintPanelText: {
  flex: 1,
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '800',  // ✓
},

wordBank: {
  // УБРАТЬ marginTop: 18 (управлять через gap родителя)
  borderRadius: 22,   // ИЗМЕНИТЬ с 24 → 22
  borderWidth: 1,
  padding: 14,        // ИЗМЕНИТЬ с 12 → 14
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 8,
},

wordTile: {
  minHeight: 44,       // ИЗМЕНИТЬ с 50 → 44
  borderRadius: 14,    // ИЗМЕНИТЬ с 17 → 14
  borderWidth: 1,      // ИЗМЕНИТЬ с 1.5 → 1
  paddingHorizontal: 14,
  alignItems: 'center',
  justifyContent: 'center',
},

wordTileText: {
  fontSize: 16,        // ИЗМЕНИТЬ с 18 → 16
  lineHeight: 21,
  fontWeight: '900',   // ✓
},

answerSlotRow: {
  minHeight: 64,       // ✓
  borderRadius: 18,    // ✓
  borderWidth: 1.5,    // ✓
  padding: 10,
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
},

answerChip: {
  minHeight: 40,       // ✓
  borderRadius: 14,    // ✓
  borderWidth: 1,
  paddingHorizontal: 12,
  alignItems: 'center',
  justifyContent: 'center',
},

answerChipText: {
  fontSize: 17,
  lineHeight: 22,
  fontWeight: '900',
},

rowActions: {
  marginTop: 10,       // ИЗМЕНИТЬ с 18 → 10
  flexDirection: 'row',
  gap: 10,
},

secondaryButton: {
  minHeight: 50,       // ИЗМЕНИТЬ с 64 → 50
  minWidth: 96,        // ИЗМЕНИТЬ с 104 → 96
  borderRadius: 16,    // ИЗМЕНИТЬ с 22 → 16
  borderWidth: 1,      // ИЗМЕНИТЬ с 1.5 → 1
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 16,
},

secondaryButtonText: {
  fontSize: 15,        // ИЗМЕНИТЬ с 17 → 15
  lineHeight: 20,
  fontWeight: '900',
},

primaryButton: {
  minHeight: 58,       // ИЗМЕНИТЬ с 72 → 58
  borderRadius: 22,    // ✓
  borderWidth: 1.5,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 18,
  elevation: 8,        // ИЗМЕНИТЬ с 5 → 8
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.45, // ИЗМЕНИТЬ с 0.18 → 0.45 (задаётся условно в JSX)
  shadowRadius: 38,
},

primaryButtonText: {
  fontSize: 17,        // ✓
  lineHeight: 22,
  fontWeight: '900',
},

recallInput: {
  minHeight: 52,       // ИЗМЕНИТЬ с 60 → 52
  borderRadius: 16,    // ИЗМЕНИТЬ с 18 → 16
  borderWidth: 1.5,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 17,        // ИЗМЕНИТЬ с 20 → 17
  lineHeight: 22,
  fontWeight: '700',
},

audioPlayButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 52,
  borderRadius: 18,
  borderWidth: 1.5,
  paddingHorizontal: 24,
  elevation: 5,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.22,
  shadowRadius: 16,
},

scorePanel: {
  borderRadius: 20,
  borderWidth: 1.5,
  padding: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
  elevation: 4,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
},

scoreBadge: {
  width: 68,
  height: 68,
  borderRadius: 18,    // ИЗМЕНИТЬ с текущего
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},

scoreBadgeValue: {
  fontSize: 20,
  lineHeight: 26,
  fontWeight: '900',
  textAlign: 'center',
},

pronunciationOrb: {
  minWidth: 200,
  borderRadius: 24,
  borderWidth: 1.5,
  paddingHorizontal: 22,
  paddingVertical: 18,
  alignItems: 'center',
  gap: 6,
  elevation: 8,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.20,
  shadowRadius: 20,
},

pronunciationOrbText: {
  fontSize: 22,
  lineHeight: 28,
  fontWeight: '900',
  textAlign: 'center',
},

pronunciationOrbScore: {
  fontSize: 28,
  lineHeight: 34,
  fontWeight: '900',
  textAlign: 'center',
},
```

**Критерий успеха:** Компоненты отображаются без ошибок. Размеры иконки режима уменьшились (36x36 вместо 52x52). Кнопки "Проверить" чуть компактнее (58px вместо 72px).

---

### ГЕЙТ 1: plan_missing_word (строки 1343–1385)

**Текущий JSX — строки 1343–1385.** Структура уже правильная. Нужны только точечные правки:

**1. Инлайн-тень на missingWordChip при selected:**
```tsx
// В строке 1372, добавить shadowColor и shadowRadius при isSelected/isRight:
style={[
  styles.missingWordChip,
  { backgroundColor: bg, borderColor },
  isRight ? { shadowColor: accent, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8 } : null,
  isWrong ? { shadowColor: '#FF6E78', shadowOpacity: 0.30, shadowRadius: 18, elevation: 8 } : null,
]}
```

**2. Добавить modeSubLabel после liquidRail (уже есть строка 1348)** — проверить что текст `"Вставь пропущенное слово"` присутствует. ✓ Есть.

**3. HintBar — уже корректен** (строки 1381–1384). ✓

**4. phraseTranslation добавить paddingTop:**
```tsx
// строка 1352 — добавить стиль paddingTop
<Text style={[styles.phraseTranslation, { color: t.textMuted, paddingTop: 4 }]}>{item.promptRu}</Text>
```

**Готовый фрагмент замены строк 1343–1385:**
```tsx
) : isMissingWordMode && 'displayEnglish' in item && 'correctAnswer' in item ? (
  <>
    <View style={[styles.bigCard, { backgroundColor: t.bgCard, borderColor: accent + '44', shadowColor: accent }]}>
      <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
      <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
      <Text style={[styles.modeSubLabel, { color: t.textMuted }]}>Вставь пропущенное слово</Text>
      <View style={[styles.phraseHighlightBox, { borderColor: accent + '44', backgroundColor: t.bgSurface2 }]}>
        <Text style={[styles.phraseHighlightText, { color: t.textPrimary }]}>{String(item.displayEnglish)}</Text>
      </View>
      <Text style={[styles.phraseTranslation, { color: t.textMuted }]}>{item.promptRu}</Text>
    </View>

    <View style={styles.missingWordGrid}>
      {choiceOptions.map((option: string, optIdx: number) => {
        const letter = ['A', 'B', 'C', 'D'][optIdx] ?? '';
        const isSelected = selected === option;
        const isCorrect = option === currentCorrectAnswer;
        const isRight = Boolean(lastResult && isSelected && isCorrect);
        const isWrong = Boolean(lastResult && isSelected && !isCorrect);
        const borderColor = isRight ? accent : isWrong ? '#FF6E78' : isSelected ? accent + '77' : 'rgba(255,255,255,0.08)';
        const bg = isRight ? accent + '18' : isWrong ? '#FF6E7814' : t.bgSurface2;
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Выбрать слово: ${option}`}
            disabled={Boolean(lastResult) || saving}
            onPress={() => { hapticTap(); void submit(option); }}
            style={[
              styles.missingWordChip,
              { backgroundColor: bg, borderColor },
              isRight ? { shadowColor: accent, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8 } : null,
              isWrong ? { shadowColor: '#FF6E78', shadowOpacity: 0.30, shadowRadius: 18, elevation: 8 } : null,
            ]}
          >
            <Text style={[styles.missingWordChipLetter, { color: isRight ? accent : isWrong ? '#FF6E78' : t.textMuted }]}>{letter}</Text>
            <Text style={[styles.missingWordChipText, { color: t.textPrimary }]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>

    <View style={[styles.hintPanel, { borderColor: accent + '28', backgroundColor: t.bgCard }]}>
      <Ionicons name="scan-outline" size={17} color={accent} />
      <Text style={[styles.hintPanelText, { color: t.textMuted }]}>Смотри на смысл всей фразы, не на знакомое слово.</Text>
    </View>
  </>
```

**Критерий успеха:** Чипы 2x2, при правильном ответе — зелёное свечение accent, при неправильном — красное. Буква вверху малая, текст крупный снизу.

---

### ГЕЙТ 2: plan_choose_natural_phrase (строки 1386–1431)

**Текущий JSX уже правильный.** Единственное улучшение — добавить shadowColor на optionRow при isRight/isWrong состоянии:

**Готовый фрагмент замены строк 1386–1431:**
```tsx
) : isChoiceMode && 'correctAnswer' in item ? (
  <>
    <View style={[styles.bigCard, { backgroundColor: t.bgCard, borderColor: accent + '44', shadowColor: accent }]}>
      <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
      <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
      <Text style={[styles.modeSubLabel, { color: t.textMuted }]}>Выбери живой вариант</Text>
      <View style={[styles.phraseHighlightBox, { borderColor: accent + '44', backgroundColor: t.bgSurface2 }]}>
        <Text style={[styles.phraseHighlightText, { color: t.textPrimary }]}>{item.promptRu}</Text>
      </View>
    </View>

    <View style={styles.optionsList}>
      {choiceOptions.map((option: string, optIdx: number) => {
        const letter = ['A', 'B', 'C', 'D'][optIdx] ?? '';
        const isSelected = selected === option;
        const isCorrect = option === currentCorrectAnswer;
        const isRight = Boolean(lastResult && isSelected && isCorrect);
        const isWrong = Boolean(lastResult && isSelected && !isCorrect);
        const borderColor = isRight ? accent : isWrong ? '#FF6E78' : isSelected ? accent + '77' : 'rgba(255,255,255,0.08)';
        const bg = isRight ? accent + '18' : isWrong ? '#FF6E7814' : t.bgSurface2;
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Выбрать фразу: ${option}`}
            disabled={Boolean(lastResult) || saving}
            onPress={() => { hapticTap(); void submit(option); }}
            style={[
              styles.optionRow,
              { backgroundColor: bg, borderColor },
              isRight ? { shadowColor: accent, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 } : null,
              isWrong ? { shadowColor: '#FF6E78', shadowOpacity: 0.22, shadowRadius: 14, elevation: 6 } : null,
            ]}
          >
            <View style={[styles.optionLetter, {
              backgroundColor: isRight ? accent : isWrong ? '#FF6E78' : accent + '16',
              borderColor: isRight ? accent : isWrong ? '#FF6E78' : accent + '33',
            }]}>
              <Text style={[styles.optionLetterText, { color: (isRight || isWrong) ? (isRight ? actionText : '#fff') : accent }]}>{letter}</Text>
            </View>
            <Text style={[styles.optionRowText, { color: t.textPrimary }]}>{option}</Text>
            {isRight ? <Ionicons name="checkmark" size={20} color={accent} /> : null}
            {isWrong ? <Ionicons name="close" size={20} color="#FF6E78" /> : null}
          </TouchableOpacity>
        );
      })}
    </View>

    <View style={[styles.hintPanel, { borderColor: accent + '28', backgroundColor: t.bgCard }]}>
      <Ionicons name="chatbubble-ellipses-outline" size={17} color={accent} />
      <Text style={[styles.hintPanelText, { color: t.textMuted }]}>Ищи тот, что нормально прозвучит в разговоре.</Text>
    </View>
  </>
```

**Критерий успеха:** Варианты — вертикальный список с LetterBox слева. При выборе правильного: LetterBox заполняется accent-цветом + checkmark справа.

---

### ГЕЙТ 3: plan_listen_choose (строки 1432–1480)

**Текущий JSX уже правильный.** Правки аналогичны ГЕЙТУ 2 — добавить тень при результате:

**Готовый фрагмент замены строк 1432–1480:**
```tsx
) : isListeningMode && isPersonalPlanListenChooseItem(item) ? (
  <>
    <View style={[styles.bigCard, { backgroundColor: t.bgCard, borderColor: accent + '44', shadowColor: accent }]}>
      <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
      <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
      <Text style={[styles.modeSubLabel, { color: t.textMuted }]}>Сначала послушай — потом выбирай</Text>
      <PlanListenChooseAudioButton
        item={item}
        accent={accent}
        actionText={actionText}
        mutedText={t.textMuted}
      />
    </View>

    <View style={styles.optionsList}>
      {choiceOptions.map((option: string, optIdx: number) => {
        const letter = ['A', 'B', 'C', 'D'][optIdx] ?? '';
        const isSelected = selected === option;
        const isCorrect = option === currentCorrectAnswer;
        const isRight = Boolean(lastResult && isSelected && isCorrect);
        const isWrong = Boolean(lastResult && isSelected && !isCorrect);
        const borderColor = isRight ? accent : isWrong ? '#FF6E78' : isSelected ? accent + '77' : 'rgba(255,255,255,0.08)';
        const bg = isRight ? accent + '18' : isWrong ? '#FF6E7814' : t.bgSurface2;
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Выбрать: ${option}`}
            disabled={Boolean(lastResult) || saving}
            onPress={() => { hapticTap(); void submit(option); }}
            style={[
              styles.optionRow,
              { backgroundColor: bg, borderColor },
              isRight ? { shadowColor: accent, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 } : null,
              isWrong ? { shadowColor: '#FF6E78', shadowOpacity: 0.22, shadowRadius: 14, elevation: 6 } : null,
            ]}
          >
            <View style={[styles.optionLetter, {
              backgroundColor: isRight ? accent : isWrong ? '#FF6E78' : accent + '16',
              borderColor: isRight ? accent : isWrong ? '#FF6E78' : accent + '33',
            }]}>
              <Text style={[styles.optionLetterText, { color: (isRight || isWrong) ? (isRight ? actionText : '#fff') : accent }]}>{letter}</Text>
            </View>
            <Text style={[styles.optionRowText, { color: t.textPrimary }]}>{option}</Text>
            {isRight ? <Ionicons name="checkmark" size={20} color={accent} /> : null}
            {isWrong ? <Ionicons name="close" size={20} color="#FF6E78" /> : null}
          </TouchableOpacity>
        );
      })}
    </View>

    <View style={[styles.hintPanel, { borderColor: accent + '28', backgroundColor: t.bgCard }]}>
      <Ionicons name="ear-outline" size={17} color={accent} />
      <Text style={[styles.hintPanelText, { color: t.textMuted }]}>Текст не показываем: тренируем связь звук → смысл.</Text>
    </View>
  </>
```

**Критерий успеха:** AudioButton с PlaybackWaveform центрирован внутри BigCard. Варианты ответа идентичны ГЕЙТ 2.

---

### ГЕЙТ 4: plan_listen_build (строки 1521–1606)

**Текущий JSX правильный.** Добавить только динамическую тень на кнопку "Проверить":

**Готовый фрагмент замены строк 1521–1606:**
```tsx
) : isListenBuildMode && isPersonalPlanListenBuildItem(item) ? (
  <>
    <View style={[styles.bigCard, { backgroundColor: t.bgCard, borderColor: accent + '44', shadowColor: accent }]}>
      <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
      <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
      <Text style={[styles.modeSubLabel, { color: t.textMuted }]}>Послушай и собери по порядку</Text>
      <PlanListenChooseAudioButton
        item={item}
        accent={accent}
        actionText={actionText}
        mutedText={t.textMuted}
      />
      <View
        accessibilityLabel="Поле собранной фразы"
        style={[styles.answerSlotRow, { borderColor: buildWords.length > 0 ? accent + '55' : accent + '28', backgroundColor: t.bgSurface2 }]}
      >
        {buildWords.length > 0 ? buildWords.map((word, wordIndex) => (
          <TouchableOpacity
            key={`built-${word}-${wordIndex}`}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Убрать слово: ${word}`}
            disabled={Boolean(lastResult) || saving}
            onPress={() => {
              hapticTap();
              setBuildWords((current) => current.filter((_, index) => index !== wordIndex));
            }}
            style={[styles.answerChip, { borderColor: accent + '66', backgroundColor: accent + '18' }]}
          >
            <Text style={[styles.answerChipText, { color: t.textPrimary }]}>{word}</Text>
          </TouchableOpacity>
        )) : (
          <Text style={[styles.answerPlaceholder, { color: t.textMuted }]}>Нажимай слова снизу</Text>
        )}
      </View>
    </View>

    <View style={[styles.wordBank, { borderColor: accent + '22', backgroundColor: t.bgCard }]}>
      {item.wordOptions.map((word: string, wordIndex: number) => {
        const usedCount = buildWords.filter((value) => value === word).length;
        const availableCount = item.wordOptions.filter((value) => value === word).length;
        const isUsed = Boolean(lastResult) || saving || usedCount >= availableCount || buildWords.length >= item.targetWords.length;
        return (
          <TouchableOpacity
            key={`${word}:${wordIndex}`}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Добавить слово: ${word}`}
            disabled={isUsed}
            onPress={() => { hapticTap(); setBuildWords((current) => [...current, word]); }}
            style={[styles.wordTile, { backgroundColor: t.bgSurface2, borderColor: isUsed ? t.border : accent + '77', opacity: isUsed ? 0.38 : 1 }]}
          >
            <Text style={[styles.wordTileText, { color: t.textPrimary }]}>{word}</Text>
          </TouchableOpacity>
        );
      })}
    </View>

    {!lastResult ? (
      <View style={styles.rowActions}>
        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Убрать последнее слово"
          disabled={buildWords.length === 0 || saving}
          onPress={() => setBuildWords((current) => current.slice(0, -1))}
          style={[styles.secondaryButton, { borderColor: accent + '44', backgroundColor: t.bgSurface2 }]}
        >
          <Text style={[styles.secondaryButtonText, { color: buildWords.length > 0 ? t.textPrimary : t.textMuted }]}>← Убрать</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Проверить ответ"
          disabled={saving || buildWords.length !== item.targetWords.length}
          onPress={() => void submitListenBuild()}
          style={[
            styles.primaryButton,
            styles.primaryButtonFlex,
            {
              backgroundColor: buildWords.length === item.targetWords.length ? accent : t.bgSurface2,
              borderColor: accent + '55',
              shadowColor: accent,
              shadowOpacity: buildWords.length === item.targetWords.length ? 0.45 : 0,
            },
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: buildWords.length === item.targetWords.length ? actionText : t.textMuted }]}>Проверить</Text>
        </TouchableOpacity>
      </View>
    ) : null}
  </>
```

**Критерий успеха:** AnswerSlotRow меняет borderColor при добавлении слов (accent+'28' → accent+'55'). Кнопка "Проверить" активируется только при полном наборе слов.

---

### ГЕЙТ 5: plan_phrase_build (строки 1260–1342)

**Аналогично ГЕЙТ 4, но без AudioButton.** Текущий JSX уже правильный. Добавить динамическую тень на primaryButton:

**Готовый фрагмент замены строк 1260–1342:**
```tsx
) : isPhraseBuildMode && 'fullAnswer' in item ? (
  <>
    <View style={[styles.bigCard, { backgroundColor: t.bgCard, borderColor: accent + '44', shadowColor: accent }]}>
      <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
      <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
      <Text style={[styles.modeSubLabel, { color: t.textMuted }]}>Собери фразу по смыслу</Text>
      <View style={[styles.phraseHighlightBox, { borderColor: accent + '44', backgroundColor: t.bgSurface2 }]}>
        <Text style={[styles.phraseHighlightText, { color: t.textPrimary }]}>{item.promptRu}</Text>
      </View>
      <View
        accessibilityLabel="Поле собранной фразы"
        style={[styles.answerSlotRow, { borderColor: buildWords.length > 0 ? accent + '55' : accent + '28', backgroundColor: t.bgSurface2 }]}
      >
        {buildWords.length > 0 ? buildWords.map((word, wordIndex) => (
          <TouchableOpacity
            key={`phrase-build-${word}-${wordIndex}`}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Убрать слово: ${word}`}
            disabled={Boolean(lastResult) || saving}
            onPress={() => {
              hapticTap();
              setBuildWords((current) => current.filter((_, currentIndex) => currentIndex !== wordIndex));
            }}
            style={[styles.answerChip, { borderColor: accent + '66', backgroundColor: accent + '18' }]}
          >
            <Text style={[styles.answerChipText, { color: t.textPrimary }]}>{word}</Text>
          </TouchableOpacity>
        )) : (
          <Text style={[styles.answerPlaceholder, { color: t.textMuted }]}>Нажимай слова снизу</Text>
        )}
      </View>
    </View>

    <View style={[styles.wordBank, { borderColor: accent + '22', backgroundColor: t.bgCard }]}>
      {phraseBuildWordOptions.map((word: string, wordIndex: number) => {
        const usedCount = buildWords.filter((value) => value === word).length;
        const availableCount = phraseBuildWordOptions.filter((value) => value === word).length;
        const isUsed = Boolean(lastResult) || saving || usedCount >= availableCount || buildWords.length >= phraseBuildTargetWords.length;
        return (
          <TouchableOpacity
            key={`phrase-option-${word}:${wordIndex}`}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Добавить слово: ${word}`}
            disabled={isUsed}
            onPress={() => { hapticTap(); setBuildWords((current) => [...current, word]); }}
            style={[styles.wordTile, { backgroundColor: t.bgSurface2, borderColor: isUsed ? t.border : accent + '77', opacity: isUsed ? 0.38 : 1 }]}
          >
            <Text style={[styles.wordTileText, { color: t.textPrimary }]}>{word}</Text>
          </TouchableOpacity>
        );
      })}
    </View>

    {!lastResult ? (
      <View style={styles.rowActions}>
        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Убрать последнее слово"
          disabled={buildWords.length === 0 || saving}
          onPress={() => setBuildWords((current) => current.slice(0, -1))}
          style={[styles.secondaryButton, { borderColor: accent + '44', backgroundColor: t.bgSurface2 }]}
        >
          <Text style={[styles.secondaryButtonText, { color: buildWords.length > 0 ? t.textPrimary : t.textMuted }]}>← Убрать</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Проверить ответ"
          disabled={saving || buildWords.length !== phraseBuildTargetWords.length}
          onPress={() => void submitPhraseBuild()}
          style={[
            styles.primaryButton,
            styles.primaryButtonFlex,
            {
              backgroundColor: buildWords.length === phraseBuildTargetWords.length ? accent : t.bgSurface2,
              borderColor: accent + '55',
              shadowColor: accent,
              shadowOpacity: buildWords.length === phraseBuildTargetWords.length ? 0.45 : 0,
            },
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: buildWords.length === phraseBuildTargetWords.length ? actionText : t.textMuted }]}>Проверить</Text>
        </TouchableOpacity>
      </View>
    ) : null}
  </>
```

**Критерий успеха:** Идентично ГЕЙТ 4, но без AudioButton. Фраза-подсказка в phraseHighlightBox.

---

### ГЕЙТ 6: plan_pronunciation_repeat (строки 1607–1703)

**Текущий JSX правильный.** Единственная правка — PronunciationOrb сейчас не меняет backgroundColor при recording (это делается в PlanPronunciationRecorder). Добавить `modeSubLabel` динамику:

**Готовый фрагмент замены строк 1607–1703** — без структурных изменений, только добавить `shadowOpacity` динамику на primaryButton:

```tsx
) : isPronunciationMode && 'targetText' in item && 'completionLabel' in item ? (
  <>
    <View style={[styles.bigCard, { backgroundColor: t.bgCard, borderColor: accent + '44', shadowColor: accent }]}>
      <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
      <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
      <Text style={[styles.modeSubLabel, { color: t.textMuted }]}>
        {pronunciationHeardTarget ? 'Повтори на слух' : 'Сначала послушай эталон'}
      </Text>
      <View style={styles.pronunciationOrbWrap}>
        <View style={[styles.pronunciationOrb, { backgroundColor: accent + '14', borderColor: accent + '44', shadowColor: accent }]}>
          <Text style={[styles.pronunciationOrbText, { color: pronunciationScore ? t.textPrimary : t.textMuted }]}>
            {pronunciationScore ? item.targetText : '●●● ●●● ●●●'}
          </Text>
          {pronunciationScore ? (
            <Text style={[styles.pronunciationOrbScore, { color: pronunciationScore.passed ? accent : '#FF8A92' }]}>
              {pronunciationScore.score}%
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={[styles.phraseTranslation, { color: t.textMuted }]}>{item.promptRu}</Text>
    </View>

    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel="Слушать эталонную фразу"
      disabled={pronunciationSpeakingTarget}
      onPress={listenPronunciationTarget}
      style={[
        styles.listenButton,
        {
          backgroundColor: pronunciationSpeakingTarget ? t.bgSurface2 : accent,
          borderColor: accent + '55',
          opacity: pronunciationSpeakingTarget ? 0.72 : 1,
          shadowColor: accent,
          shadowOpacity: pronunciationSpeakingTarget ? 0 : 0.28,
        },
      ]}
    >
      <Ionicons name={pronunciationSpeakingTarget ? 'volume-high' : 'play'} size={20} color={pronunciationSpeakingTarget ? t.textMuted : actionText} />
      <Text style={[styles.listenButtonText, { color: pronunciationSpeakingTarget ? t.textMuted : actionText }]}>
        {pronunciationSpeakingTarget ? 'Слушаю...' : pronunciationHeardTarget ? 'Ещё раз' : 'Слушать фразу'}
      </Text>
    </TouchableOpacity>

    <PlanPronunciationRecorder
      accent={accent}
      actionText={actionText}
      mutedText={t.textMuted}
      surfaceColor={t.bgCard}
      subtleSurfaceColor={t.bgSurface2}
      borderColor={t.border}
      targetText={stringField(item, 'targetText') ?? ''}
      enabled={pronunciationHeardTarget && !pronunciationSpeakingTarget}
      onRecognized={handlePronunciationRecordingReady}
    />

    {pronunciationScoring || pronunciationScore || pronunciationError ? (
      <View style={[
        styles.scorePanel,
        {
          borderColor: pronunciationScore?.passed ? accent + '66' : pronunciationScore ? '#FF6E7866' : t.border,
          backgroundColor: t.bgCard,
          shadowColor: pronunciationScore?.passed ? accent : '#FF6E78',
        },
      ]}>
        <View style={[
          styles.scoreBadge,
          {
            backgroundColor: pronunciationScore?.passed ? accent + '18' : pronunciationScore ? '#FF6E7818' : t.bgSurface2,
            borderColor: pronunciationScore?.passed ? accent + '44' : pronunciationScore ? '#FF6E7844' : t.border,
          },
        ]}>
          <Text style={[styles.scoreBadgeValue, { color: pronunciationScore?.passed ? accent : pronunciationScore ? '#FF8A92' : t.textMuted }]}>
            {pronunciationScoring ? '…' : pronunciationScore ? `${pronunciationScore.score}%` : '--'}
          </Text>
        </View>
        <View style={styles.scoreCopy}>
          <Text style={[styles.scoreTitle, { color: pronunciationScore?.passed ? accent : pronunciationScore ? '#FF8A92' : t.textPrimary }]}>
            {pronunciationScoring
              ? 'Проверяю...'
              : pronunciationScore?.passed
                ? 'Засчитано!'
                : pronunciationScore
                  ? `Нужно ${PLAN_PRONUNCIATION_PASS_THRESHOLD}%`
                  : 'Не удалось'}
          </Text>
          <Text style={[styles.scoreBody, { color: t.textMuted }]}>
            {pronunciationScoring
              ? 'Сравниваю с эталоном...'
              : pronunciationScore
                ? pronunciationScore.transcript
                : pronunciationError ?? ''}
          </Text>
        </View>
      </View>
    ) : null}

    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel="Засчитать произношение"
      disabled={saving || pronunciationScoring || !pronunciationScore?.passed}
      onPress={() => void completePronunciation()}
      style={[
        styles.primaryButton,
        {
          backgroundColor: pronunciationScore?.passed ? accent : t.bgSurface2,
          borderColor: accent + '55',
          opacity: pronunciationScore?.passed ? 1 : 0.68,
          shadowColor: accent,
          shadowOpacity: pronunciationScore?.passed ? 0.45 : 0,
        },
      ]}
    >
      <Text style={[styles.primaryButtonText, { color: pronunciationScore?.passed ? actionText : t.textMuted }]}>
        {pronunciationScore?.passed ? item.completionLabel : `Нужно ${PLAN_PRONUNCIATION_PASS_THRESHOLD}%`}
      </Text>
    </TouchableOpacity>
  </>
```

**Критерий успеха:** PronunciationOrb показывает `●●● ●●● ●●●` пока нет результата. ScorePanel с 68x68 бейджем появляется после записи. Кнопка засчитать — активна только при passed.

---

### ГЕЙТ 7: plan_phrase_recall (строки 1481–1520)

**Текущий JSX правильный.** Добавить динамический shadowOpacity на primaryButton:

**Готовый фрагмент замены строк 1481–1520:**
```tsx
) : isRecallMode && 'targetText' in item ? (
  <>
    <View style={[styles.bigCard, { backgroundColor: t.bgCard, borderColor: accent + '44', shadowColor: accent }]}>
      <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
      <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
      <Text style={[styles.modeSubLabel, { color: t.textMuted }]}>Вспомни без подсказок</Text>
      <View style={[styles.phraseHighlightBox, { borderColor: accent + '44', backgroundColor: t.bgSurface2 }]}>
        <Text style={[styles.phraseHighlightText, { color: t.textPrimary }]}>{item.promptRu}</Text>
      </View>
      <TextInput
        value={typedAnswer}
        onChangeText={setTypedAnswer}
        editable={!lastResult && !saving}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Type in English..."
        placeholderTextColor={t.textMuted}
        style={[
          styles.recallInput,
          {
            color: t.textPrimary,
            borderColor: lastResult === 'wrong' ? '#FF6E78' : lastResult === 'correct' ? accent : accent + '44',
            backgroundColor: t.bgSurface2,
          },
        ]}
        returnKeyType="done"
        onSubmitEditing={() => void submitRecall()}
      />
    </View>

    {!lastResult ? (
      <TouchableOpacity
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel="Проверить ответ"
        disabled={saving || typedAnswer.trim().length === 0}
        onPress={() => void submitRecall()}
        style={[
          styles.primaryButton,
          {
            backgroundColor: typedAnswer.trim().length > 0 ? accent : t.bgSurface2,
            borderColor: accent + '55',
            shadowColor: accent,
            shadowOpacity: typedAnswer.trim().length > 0 ? 0.45 : 0,
          },
        ]}
      >
        <Text style={[styles.primaryButtonText, { color: typedAnswer.trim().length > 0 ? actionText : t.textMuted }]}>Проверить</Text>
      </TouchableOpacity>
    ) : null}

    <View style={[styles.hintPanel, { borderColor: accent + '28', backgroundColor: t.bgCard }]}>
      <Ionicons name="refresh-outline" size={17} color={accent} />
      <Text style={[styles.hintPanelText, { color: t.textMuted }]}>Не вышло — фраза вернётся в конце круга.</Text>
    </View>
  </>
```

**Критерий успеха:** TextInput borderColor плавно меняется между состояниями. Кнопка "Проверить" появляется только при наличии текста (через shadowOpacity и backgroundColor).

---

### ГЕЙТ 8: Финальная полировка

**1. Очистить мёртвые стили** — в `StyleSheet.create` есть ~20 устаревших ключей (строки 2435–2648: `phraseBuildCard`, `missingWordCard`, `naturalChoiceCard`, `listenChooseCard`, `listenBuildCard`, `recallCard`, `rosettaPromptCard`, `rosettaPrimaryButton`, `rosettaSecondaryButton`, `rosettaListenButton`, `rosettaCompleteButton`). Их можно оставить (они не рендерятся) или удалить для чистоты.

**2. Добавить `gap: 10` в `staticScroll`** — убрать скачки между блоками:
```tsx
// строка 2071-2077, добавить gap:
staticScroll: {
  flexGrow: 1,
  paddingTop: 10,
  paddingBottom: 14,
  justifyContent: 'space-between',
  overflow: 'hidden',
  gap: 10,  // ДОБАВИТЬ
},
```

**3. Добавить `marginTop: 0` на `wordBank`** — убрать `marginTop: 18` из styles и управлять через gap родителя (staticScroll gap: 10 уже задаёт расстояние):
```tsx
wordBank: {
  // marginTop: 18  ← УБРАТЬ
  borderRadius: 22,
  ...
},
```

**4. Граница hintPanel — добавить paddingVertical:**
```tsx
hintPanel: {
  minHeight: 48,
  borderRadius: 18,
  borderWidth: 1,
  paddingHorizontal: 14,
  paddingVertical: 10,  // ДОБАВИТЬ
  flexDirection: 'row',
  alignItems: 'center',
  gap: 9,
},
```

**5. Edge cases:**
- Если `choiceOptions.length < 4` — `.missingWordChip` с `flex:1` может растянуться на всю ширину. Добавить `maxWidth: '48%'` в missingWordChip.
- Если `item.promptRu` очень длинный — phraseHighlightBox растянется корректно (minHeight: 72 + `alignItems: 'center'` ✓).

**6. TypeScript type расширение** — `PersonalPlanExerciseStyles` (строки 1827–2008) нужно добавить/убедиться что все используемые стили задекларированы. Текущие используемые стили все присутствуют.

**Финальный визуальный тест (чеклист):**
- [ ] ModeIcon 36x36 px (не 52x52)
- [ ] ModeEyebrow 13px bold uppercase accent-цвет
- [ ] LiquidRail height:2 accent+'55' под modeRow
- [ ] PhraseHighlightBox fontSize:26, fontWeight:900, центр
- [ ] MissingWordChip 2x2 grid с letterLabel сверху
- [ ] OptionRow с LetterBox 34x34 слева, checkmark/close справа
- [ ] WordTile 44px высота, borderRadius:14, при used opacity:0.38
- [ ] AnswerSlotRow borderColor accent+'28' → accent+'55' при заполнении
- [ ] PrimaryButton 58px, shadowOpacity 0.45 когда active, 0 когда disabled
- [ ] SecondaryButton 50px, borderRadius:16
- [ ] ScoreBadge 68x68, borderRadius:18
- [ ] HintPanel с paddingVertical:10

---

## Сводная карта правок по строкам

| Гейт | Строки в файле | Тип правки |
|------|---------------|------------|
| 0 | 2102–2112 bigCard | Проверить значения ✓ |
| 0 | 2723–2743 modeIcon/modeEyebrow | `width/height: 36, borderRadius: 11` |
| 0 | 2230–2264 missingWordGrid/Chip | `shadowOffset: {0,7}` ✓ |
| 0 | 2856–2874 wordBank/wordTile | `borderRadius:22/14, padding:14, убрать marginTop` |
| 0 | 3104–3126 rowActions/buttons | `secondaryButton minHeight:50, primaryButton minHeight:58` |
| 0 | 3069–3077 recallInput | `minHeight:52, fontSize:17` |
| 1 | 1343–1385 | Добавить условные тени на missingWordChip |
| 2 | 1386–1431 | Добавить условные тени на optionRow |
| 3 | 1432–1480 | Добавить условные тени на optionRow |
| 4 | 1521–1606 | Добавить динамический shadowOpacity на primaryButton |
| 5 | 1260–1342 | Добавить динамический shadowOpacity на primaryButton |
| 6 | 1607–1703 | Добавить shadowOpacity:0 когда disabled на listenButton и primaryButton |
| 7 | 1481–1520 | Добавить shadowOpacity динамику на primaryButton |
| 8 | 2071–2077 | Добавить gap:10 в staticScroll |
| 8 | 2265–2273 | Добавить paddingVertical:10 в hintPanel |
| 8 | Мёртвые стили | Опциональная очистка phraseBuildCard, missingWordCard, etc. |
# Localization Note

Historical examples in this plan that reference `item.promptRu` must be read with the current runtime mirror `item.promptEs`: production UI chooses `item.promptEs` for `lang === 'es'` and falls back to `item.promptRu` only when Spanish copy is intentionally absent.

# flashcards.tsx — Критические правила

## 1. Перевод (translation fallback)
```ts
// ВСЕГДА fallback на ru если uk пустое
const tr = lang === 'uk' ? (item.uk || item.ru) : item.ru;
// НЕПРАВИЛЬНО: const tr = lang === 'uk' ? item.uk : item.ru;
```

## 2. Язык карточек (НЕ МЕНЯТЬ)
- `use-flashcards.ts loadFlashcards`: НЕ делать `uk: card.uk || card.ru` (навсегда запишет ru в uk)
- `flashcards.tsx loadAll`: миграция — ищет uk в ALL_LESSONS_UK и сохраняет
- `flashcards.tsx` отображение: fallback `item.uk || item.ru`
- `AddToFlashcard`: всегда передаёт реальный uk prop

## 3. Кнопка звука — НЕ использовать e.stopPropagation()
```tsx
// e.stopPropagation() не работает на Android. Использовать:
<View onStartShouldSetResponder={() => true}>
  <TouchableOpacity onPress={() => { Speech.stop(); Speech.speak(item.en, { language: 'en-US' }); }}>
    <Ionicons name="volume-medium-outline" />
  </TouchableOpacity>
</View>
```

## 4. Заголовок — правая часть кнопок
```tsx
// flex:1 + maxWidth:120 чтобы filter+delete умещались
<View style={{ flexDirection:'row', justifyContent:'flex-end', alignItems:'center', gap: 12, flex: 1, maxWidth: 120 }}>
```

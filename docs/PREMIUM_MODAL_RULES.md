# premium_modal.tsx — Критические правила

## showSuccess() — НЕ ЛОМАТЬ
1. Вызывает `reloadEnergy()` → анимация заполнения энергии
2. `DeviceEventEmitter.emit('premium_activated')` → уведомляет все экраны
3. `viewMode` → `'success'` → celebrate-модалка
4. НЕ закрывается автоматически (пользователь закрывает сам)

```
// ПРАВИЛО: showSuccess() НЕ должен содержать successTimer с goBack()!
// Старый таймер 2800мс удалён намеренно.
```

## Архитектура celebrate-карточек (UNLOCK_ITEMS)
Три слоя через `position: absolute`:
1. Нижний — цветная плашка (всегда отрендерена)
2. Средний — серый оверлей (`grayOverlay` 1→0)
3. Верхний — замочек (`lockOpacity` + `lockScale` + `lockRot`)

```
// overflow:'hidden' на враппере ОБЯЗАТЕЛЕН
// pointerEvents="none" на замочке чтобы не блокировать скролл
```

## Последовательность анимации (стагер 400мс)
| Время | Событие |
|-------|---------|
| base+0мс | slide+fade, серый оверлей |
| base+180мс | замочек pop (scale 0.5→1) |
| base+340мс | тряска: -18°→+14°→-10°→+6°→0° |
| base+680мс | 🔒→🔓, поворот -38° |
| base+880мс | fade замочка + fade серого |

## itemAnims ref-массив
```ts
{ cardOpacity: Value(0), cardTranslateY: Value(22), grayOverlay: Value(1),
  lockOpacity: Value(0), lockScale: Value(0.5), lockRot: Value(0) }
// lockRot: inputRange[-40,40] → outputRange['-40deg','40deg']
```

## openedLocks state
```ts
// false→'lock-closed', true→'lock-open'
// Сбрасывать в showSuccess(): setOpenedLocks(UNLOCK_ITEMS.map(() => false))
```

## Золотые анимации

### lesson1.tsx — PremiumGoldButton
- Объявлен перед `LessonContent`, вставлен под кнопкой "Понятно" в `showNoEnergyModal`
- `onPress`: сначала `onDismiss()`, потом `router.push('/premium_modal')`
- Цвета ФИКСИРОВАННЫЕ: фон `#B8860B`, текст/рамка `#FFD700` (НЕ t.accent)
- Анимация: пульс scale 1.0→1.07 (700мс) + мерцание ✨ (противофаза 1200мс)

### premium_modal.tsx — CTA + бейджик
```ts
const ctaPulse     = useRef(new Animated.Value(1)).current;
const badgeSparkle = useRef(new Animated.Value(0)).current;
```
- Бейджик: `shadowOpacity` → `badgeSparkle`, цвета `#B8860B`/`#FFD700`
- CTA: `<Animated.View style={{ transform: [{ scale: purchasing ? 1 : ctaPulse }] }}>`

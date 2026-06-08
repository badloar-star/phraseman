# Telegram — Точные значения из исходного кода

> Данные получены прямым чтением исходников Telegram-iOS (github.com/TelegramMessenger/Telegram-iOS)
> и Telegram-Android (github.com/DrKLO/Telegram). Файлы: NavigationBar.swift,
> ContainedViewLayoutTransition.swift, CAAnimationUtils.swift, ListView.swift,
> HapticFeedback.swift, ActionBar.java, SizeNotifierFrameLayout.java,
> RecyclerAnimationScrollHelper.java, AndroidUtilities.java, BottomSheet.java.
>
> Дата: 2026-06-07

---

## АНИМАЦИИ — Кривые и пружины

### Основная кривая Telegram (slide)
```swift
// ContainedViewLayoutTransition.swift
.custom(0.33, 0.52, 0.25, 0.99)  // "slide" preset — fast-in, very slow-out
```
```js
// React Native Reanimated
Easing.bezier(0.33, 0.52, 0.25, 0.99)
```

### Spring параметры (главная анимация)
```swift
// CAAnimationUtils.swift + ContainedViewLayoutTransition.swift
damping: 88.0
stiffness: 750.0   // ContainedViewLayoutTransition.bounceParameters()
// OR
stiffness: 900.0   // CAAnimationUtils.springAnimation() defaults
mass: 5.0
```
```js
withSpring(toValue, { damping: 88, stiffness: 900, mass: 5 })
```

### Spring для жестов (minimize/maximize)
```swift
// NavigationController.swift line 1668
.customSpring(damping: 124.0, initialVelocity: velocity)
// duration: 0.4s
```
```js
withSpring(toValue, { damping: 124, velocity: gestureVelocity })
// + withTiming(..., { duration: 400 }) если без жеста
```

### Fallback bezier (когда spring недоступен)
```swift
// CAAnimationUtils.swift line 173
CAMediaTimingFunction(controlPoints: 0.380, 0.700, 0.125, 1.000)
```
```js
Easing.bezier(0.38, 0.70, 0.125, 1.0)
```

### Android EASE_OUT_QUINT
```java
// CubicBezierInterpolator.EASE_OUT_QUINT — используется везде
// (стандартный quint easing)
```
```js
Easing.bezier(0.23, 1, 0.32, 1)
```

---

## АНИМАЦИИ — Длительности (iOS)

| Действие | Длительность | Кривая | Файл |
|----------|-------------|--------|------|
| Navigation push/pop | `0.4s` | `.spring` | NavigationController.swift:187 |
| Container update | `0.5s` | `.spring` | NavigationController.swift:596 |
| Minimize/maximize | `0.4s` | `.customSpring(damping: 124)` | NavigationController.swift:1668 |
| Status bar transition | `0.3s` / `0.2s` | `.easeInOut` | NavigationController.swift:203, 1275 |
| Modal snap-back | `0.5s` | `.spring` | NavigationModalContainer.swift:188 |
| Modal dismiss | `min(0.3s, 0.4/\|velocity\|)` | `.easeInOut` | NavigationModalContainer.swift |
| Modal quick cancel | `0.1s` | `.easeInOut` | NavigationModalContainer.swift |
| Alpha fade (удаление вью) | `0.3s` | — | NavigationContainer.swift:528 |
| ListView insertion | `0.4s` | `.spring` | ListView.swift |
| Scroll indicator fade | `0.3s` (delay 0.1s) | — | ListView.swift |
| Default fallback | `0.3s` | `.easeInOut` | ListView.swift |

**Особый кейс iOS 26:** Magic duration `0.3832s` → триггерит новую iOS 26 spring реализацию.

### Modal dismiss — velocity formula
```swift
let velocityFactor = 0.4 / max(1.0, abs(velocity.y))
let duration = Double(min(0.3, velocityFactor))  // max 300ms
```
```js
const duration = Math.min(300, (0.4 / Math.max(1.0, Math.abs(velocityY))) * 1000)
```

---

## АНИМАЦИИ — Длительности (Android)

| Действие | Длительность | Кривая |
|----------|-------------|--------|
| ActionBar action mode | `200ms` | linear |
| Title crossfade | `220ms` | `EASE_OUT_QUINT` (через DEFAULT) |
| Search show/hide | `150ms` | linear |
| Scroll adaptive bg | `320ms` | `EASE_OUT_QUINT` |
| BottomSheet open | `400ms` (delay 20ms) | `EASE_OUT_QUINT` |
| BottomSheet dismiss | `250ms` | `EASE_OUT` |
| BottomSheet button-click dismiss | `180ms` | `EASE_OUT` |
| Scroll icon crossfade | `150ms` | — (scale 1→0.5→1, swap at midpoint) |
| Shake animation | `300ms` | sin, 4dp, 4 cycles, parabolic |
| Navigation bar color | `200ms` | DEFAULT |

### Title translation offset (Android)
```java
// ActionBar.java
titleTextView[0].setTranslationY(fromBottom ? dp(20) : -dp(20));  // incoming
titleTextView[1].setTranslationY(fromBottom ? -dp(20) : dp(20));  // outgoing
```
```js
translateY: fromBottom ? 20 : -20  // dp единицы
```

### RecyclerView scroll duration formula
```java
// RecyclerAnimationScrollHelper.java
duration = ((scrollLength / recyclerHeight) + 1f) * 200L
// Clamped [300, 1300]ms
// 1 экран = 400ms, 2 экрана = 600ms, максимум 1300ms
```
```js
const duration = Math.min(1300, Math.max(300, ((scrollLength / screenHeight) + 1) * 200))
```

### Shake (React Native)
```js
withSequence(
  withTiming(-10, { duration: 50 }),
  withSpring(0, { damping: 10, stiffness: 600 })
)
// Android shakeViewSpring: stiffness=600, dampingRatio=0.5
```

### Android spring (shakeViewSpring)
```java
SpringAnimation(view, DynamicAnimation.TRANSLATION_X, 0)
    .setSpring(new SpringForce(0).setStiffness(600f))
    // dampingRatio: SpringForce.DAMPING_RATIO_MEDIUM_BOUNCY = 0.5
    .setStartVelocity(-1000)
```

---

## BLUR — Точные значения

### iOS — условие включения blur
```swift
// Blur включается только когда:
color.alpha > .ulpOfOne && color.alpha < 0.95
// ИЛИ forceKeepBlur = true
// При UIAccessibility.isReduceTransparencyEnabled → solid fallback
```
```js
import { AccessibilityInfo } from 'react-native'
const isReduceTransparency = await AccessibilityInfo.isReduceTransparencyEnabled()
// Если true → используй solid background, не BlurView
```

### iOS — custom blur radius (через private API)
```swift
// Убирает ВСЕ sub-filters кроме gaussianBlur и colorSaturate:
var allowedKeys = ["gaussianBlur"]
if enableSaturation { allowedKeys.append("colorSaturate") }
filter.setValue(customBlurRadius as NSNumber, forKey: "inputRadius")
// Убирает стандартный tint overlay, оставляет чистый blur
```
> expo-blur не даёт такого контроля. Для полного контроля нужен нативный модуль.

### iOS — corner radius модалей
```swift
var cornerRadius: CGFloat = 10.0
if controller._hasGlassStyle {
    cornerRadius = 38.0  // glass style
}
```
```js
borderRadius: hasGlassStyle ? 38 : 10
```

### Android — blur radius по классу устройства
```java
// SizeNotifierFrameLayout.java
switch (SharedConfig.getDevicePerformanceClass()) {
    case HIGH:    return 60;  // blur radius
    case AVERAGE: return 4;
    case LOW:     return 3;
}
```
```js
// Для RN — упрощение без device class detection:
const blurRadius = isHighEnd ? 20 : 8  // expo-blur использует другую шкалу
```

### Android — downscale для захвата
```java
private final float DOWN_SCALE = 12f;
// Захватывает bitmap в 1/12 разрешения
// makeBlurBitmap() overload: downscale=6f, maxRadius=7
```

### Android — RenderEffect (API 31+) с насыщенностью
```java
ColorMatrix colorMatrix = new ColorMatrix();
colorMatrix.setSaturation(2f);  // 2x насыщенность вместе с blur
blurNode.setRenderEffect(RenderEffect.createChainEffect(
    RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.DECAL),
    RenderEffect.createColorFilterEffect(new ColorMatrixColorFilter(colorMatrix))
));
// Padding вокруг области захвата: dp(36)
```

### Blur crossfade — точно 50ms
```java
blurCrossfade.setDuration(50);  // linear, без интерполятора
// Throttle перед следующим захватом: 16ms (1 кадр)
```

### Blur alpha привязан к скроллу
```java
// ActionBar.java:
// alpha = 1.0f - onTopAnimated
// Наверху (onTopAnimated=1.0) → blurAlpha = 0.0 (нет blur)
// Проскроллено (onTopAnimated=0.0) → blurAlpha = 1.0 (полный blur)
// Переход: 320ms, EASE_OUT_QUINT
```
```js
// Reanimated:
const blurOpacity = useAnimatedStyle(() => ({
  opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, 1], Extrapolation.CLAMP)
}))
```

---

## HAPTIC — Точные значения из HapticFeedback.swift

### Полный список стилей с интенсивностью
```swift
enum ImpactHapticFeedbackStyle {
    case light      // UIImpactFeedbackGenerator(style: .light)     — интенсивность 1.0
    case medium     // UIImpactFeedbackGenerator(style: .medium)    — интенсивность 1.0
    case heavy      // UIImpactFeedbackGenerator(style: .heavy)     — интенсивность 1.0
    case soft       // UIImpactFeedbackGenerator(style: .soft)      — iOS 13+
    case rigid      // UIImpactFeedbackGenerator(style: .rigid)     — iOS 13+
    case veryLight  // impactOccurred(intensity: 0.3)               — слабый
    case click05    // impactOccurred(intensity: 0.3)               — слабый клик
    case click06    // impactOccurred(intensity: 0.4)               — средний клик
}
```

### Notification haptic — ВАЖНО: warning через AudioServices
```swift
func success() { notificationGenerator?.notificationOccurred(.success) }
func error()   { notificationGenerator?.notificationOccurred(.error)   }
func warning() {
    AudioServicesPlaySystemSound(1102)  // notificationOccurred(.warning) ЗАКОММЕНТИРОВАН!
    // Telegram использует системный звук 1102 вместо стандартного warning haptic
}
```
```js
// В React Native для warning — лучше использовать impactAsync(Light):
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
// notificationAsync(Warning) тоже работает, но Telegram использует другой подход
```

### Selection feedback (tap)
```swift
func tap() { selectionGenerator.selectionChanged() }
func prepareTap() { selectionGenerator.prepare() }
```
```js
Haptics.selectionAsync()  // текущий hapticTap() правильный
```

### Continuous haptic (CoreHaptics) — ramp intensity
```swift
// 11 событий от t=0 до t=1:
intensity = (1.0 - t) * 0.1 + t * 1.0  // 0.1 → 1.0
sharpness = 0.3  // фиксирован
// Используется для: long-press, запись голосового, drag
```
> expo-haptics не поддерживает. Нужен кастомный нативный модуль для CoreHaptics.

### Generator lifetime — 1 секунда
```swift
// UIImpactFeedbackGenerator остаётся живым 1 секунду после последнего использования
// Предотвращает deallocate до завершения haptic engine
deinit { DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { } }
```

### Android haptic constants
```java
// Cursor drag:
view.performHapticFeedback(HapticFeedbackConstants.TEXT_HANDLE_MOVE,
    HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING)  // API 26+

// Tap:
view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP,
    HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING)
```

---

## SCROLL PHYSICS — Точные значения

### Deceleration rate
```swift
// ListView.swift:
let decelerationRate: CGFloat = 0.998  // точное значение
var currentVelocity = velocity * 15.0 * CGFloat(pow(Double(decelerationRate), 1000.0 * t))
// Начальная скорость умножается на 15.0x
// Экспоненциальное затухание: 0.998^(1000 * t)
```
```jsx
<ScrollView decelerationRate={0.998} />
```

### Overscroll trigger threshold
```swift
if scrollView.contentOffset.y < -48.0 {
    self.didEndScrollingWithOverscroll?()
}
```
```js
// onScroll: ({ contentOffset: { y } }) => y < -48 → trigger pull-to-refresh
```

### Modal scroll settings
```swift
// NavigationModalContainer.swift:
scrollView.bounces = false
scrollView.alwaysBounceVertical = false
scrollView.showsVerticalScrollIndicator = false
scrollView.contentInsetAdjustmentBehavior = .never
scrollView.delaysContentTouches = false
```
```jsx
<ScrollView
  bounces={false}
  showsVerticalScrollIndicator={false}
  contentInsetAdjustmentBehavior="never"
  delaysContentTouches={false}
/>
```

### Modal dismiss threshold
```swift
// velocity.y < -0.5 (pts/ms) ИЛИ progress >= 0.5 (50% высоты)
if velocity.y < -0.5 || progress >= 0.5 { dismiss() }
```
```js
const shouldDismiss = velocityY < -0.5 || progress >= 0.5
```

### Interactive pop — status bar threshold
```swift
// NavigationContainer.swift:
if progress >= 0.3 {
    updatedStatusBarStyle = destinationController.statusBarStyle
} else {
    updatedStatusBarStyle = sourceController.statusBarStyle
}
// Статус бар меняется на 30% жеста pop
```

### Android BottomSheet dismiss threshold
```java
// backAnimation = true (snap-back) когда:
translationY < AndroidUtilities.getPixelsInCM(0.8f, false)  // < 0.8cm физически
&& (velY < 3500 || Math.abs(velY) < Math.abs(velX))         // И скорость < 3500 px/s
// ИЛИ velY < 0 && Math.abs(velY) >= 3500  (быстрый свайп вверх)
```
```js
const snapBack = Math.abs(translationY) < THRESHOLD_PIXELS && Math.abs(velocityY) < 3500
```

---

## SAFE AREA — Архитектура

### iOS — трёхслойная система
```swift
// ContainerViewLayout.swift:
struct ContainerViewLayout {
    var intrinsicInsets: UIEdgeInsets   // raw device safe area
    var safeInsets: UIEdgeInsets        // computed for content
    var additionalInsets: UIEdgeInsets  // keyboard + extras
    var statusBarHeight: CGFloat?
    var inputHeight: CGFloat?
}
// Telegram НИКОГДА не использует additionalSafeAreaInsets напрямую
// Все insets вычисляются и передаются вниз по иерархии
```

### Modal top inset
```swift
var topInset = 10.0
if let statusBarHeight = layout.statusBarHeight {
    topInset += statusBarHeight  // = 10 + statusBarHeight
    // iPhone 16: 10 + 59 = 69pt
}
// Flat modal / landscape: topInset = 0.0
```
```js
const modalTopInset = 10 + (insets.top ?? 0)  // ~69pt на iPhone 16
```

### Corner rounding по типу устройства
```swift
if layout.safeInsets.bottom.isZero {
    // Устройство с кнопкой Home: только верхние углы
    container.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
} else {
    // Устройство с Dynamic Island / notch: все 4 угла
    container.layer.maskedCorners = [все 4]
}
```
```js
const hasHomeIndicator = insets.bottom > 0
const modalBorderRadius = {
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
  borderBottomLeftRadius: hasHomeIndicator ? 10 : 0,
  borderBottomRightRadius: hasHomeIndicator ? 10 : 0,
}
```

### Android ActionBar высоты
```java
// ActionBar.java getCurrentActionBarHeight():
tablet:    dp(64)
portrait:  dp(56)
landscape: dp(48)
```

### BottomSheet dim alpha
```java
protected int dimBehindAlpha = 51;  // 51/255 ≈ 20% opacity
```
```js
backgroundColor: 'rgba(0, 0, 0, 0.2)'
```

---

## ПРОЧИЕ UX ДЕТАЛИ

### Icon crossfade (Android)
```java
// AndroidUtilities.updateImageViewImageAnimated():
// 150ms ValueAnimator 0→1
// При value >= 0.5: swap image
// Scale: 1 → 0.5 → 1
```
```js
// React Native:
scale.value = withTiming(0.5, { duration: 75 }, () => {
  runOnJS(setIcon)(newIcon)
  scale.value = withTiming(1, { duration: 75 })
})
```

### Scroll highlight offset (Android)
```java
layoutManager.scrollToPositionWithOffset(position, dp(60))
// Выделенный элемент — 60dp от верха, не flush
```

### Bulletin hide tied to dismiss
```java
// BottomSheet.java dismiss():
bulletin.hide((long)(duration * 0.6f))  // = 150ms при duration=250ms
// Snackbar начинает скрываться на 60% длительности dismiss
```

### Stagger formula для cascade анимаций
```java
// AndroidUtilities.cascade():
float waveDuration = 1f / count * Math.min(waveLength, count)
float waveOffset = position / count * (1f - waveDuration)
// Каждый элемент: localTime = (fullT - waveOffset) / waveDuration
```

### System animation scale respect
```java
// Android:
float scale = Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
if (scale <= 0.0f) return false  // анимации выключены в настройках
```
```swift
// iOS:
UIView.animationDurationFactor()  // множитель для доступности (slow motion)
```
```js
// React Native:
import { AccessibilityInfo } from 'react-native'
// AccessibilityInfo.isReduceMotionEnabled() → отключить анимации
```

### ProMotion — opacity исключение
```swift
// CAAnimationUtils.swift line 62:
if animation.keyPath == "opacity" {
    preferredFps = 60.0  // opacity намеренно ограничен 60fps даже на ProMotion
    return
}
// Все остальные анимации: 60-120Hz диапазон
```

---

## REACT NATIVE CHEAT SHEET — Итог

```js
import { withSpring, withTiming, Easing, interpolate, Extrapolation } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { AccessibilityInfo } from 'react-native'

// ─── SPRINGS ───────────────────────────────────────────────────────────────
const SPRING_NAV     = { damping: 88, stiffness: 900, mass: 5 }      // push/pop
const SPRING_GESTURE = { damping: 124, velocity: gestureVelocity }    // pinch/pan
const SPRING_SHAKE   = { damping: 10, stiffness: 600 }                // error shake

// ─── EASINGS ───────────────────────────────────────────────────────────────
const EASE_SLIDE      = Easing.bezier(0.33, 0.52, 0.25, 0.99)  // panels
const EASE_SPRING_FB  = Easing.bezier(0.38, 0.70, 0.125, 1.0)  // spring fallback
const EASE_OUT_QUINT  = Easing.bezier(0.23, 1, 0.32, 1)        // Android open/show

// ─── DURATIONS ─────────────────────────────────────────────────────────────
const DUR = {
  navPush:       400,  // navigation push/pop
  modalSnap:     500,  // modal snap-back
  modalDismiss:  300,  // modal dismiss (max), velocity-capped
  actionMode:    200,  // action bar mode switch
  blur:           50,  // blur crossfade
  iconCross:     150,  // icon crossfade (scale 1→0.5→1)
  shake:         300,  // error shake
  scrollAdapt:   320,  // blur alpha adapt на scroll
}

// ─── BLUR ──────────────────────────────────────────────────────────────────
// Условие показа:
const bgAlpha = parseFloat(backgroundColor.split(',')[3] ?? '1')
const showBlur = bgAlpha > 0 && bgAlpha < 0.95 && !isReduceTransparency

// Blur opacity tied to scroll:
const blurOpacity = useAnimatedStyle(() => ({
  opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, 1], Extrapolation.CLAMP)
}))

// ─── SCROLL ────────────────────────────────────────────────────────────────
// <ScrollView decelerationRate={0.998} />
// overscroll trigger: contentOffset.y < -48
// modal: bounces={false} contentInsetAdjustmentBehavior="never" delaysContentTouches={false}
// modal dismiss: velocityY < -0.5 || progress >= 0.5
// status bar switch: progress >= 0.3

// ─── SAFE AREA ─────────────────────────────────────────────────────────────
const hasHomeIndicator = insets.bottom > 0
const modalTopInset = 10 + (insets.top ?? 0)  // ~69pt iPhone 16
const dimAlpha = 51 / 255  // = 0.2

// ─── MODAL CORNERS ─────────────────────────────────────────────────────────
const modalRadius = {
  borderTopLeftRadius: 10, borderTopRightRadius: 10,
  borderBottomLeftRadius: hasHomeIndicator ? 10 : 0,
  borderBottomRightRadius: hasHomeIndicator ? 10 : 0,
}

// ─── HAPTICS ───────────────────────────────────────────────────────────────
// onPressIn → Haptics.selectionAsync()  (не в onPress!)
// success: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
// error:   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
// warning: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)  (не warning!)
// drag:    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
```

---

*Источник: прямое чтение исходников Telegram-iOS и Telegram-Android, 2026-06-07*

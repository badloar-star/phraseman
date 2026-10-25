# Ядро · движение премиум-тем на Главной: журнал [THEME-MOTION] и пауза (25.10)

Governance-ID: TG-107F4924F9AF
Governance-ID: TG-192935D28029
Governance-ID: TG-F4941ABE75E2

## Outcome
Владелец: «скролл стал дёрганым, на главной». Подозреваемый: PremiumThemeMotion — WebView на всю сцену Главной. В ней WebGL-шейдер 24 к/с (signal/storm/gravity) или бесконечная CSS-анимация (olive/titanium/horizon), androidLayerType=hardware.
1. Журнал [THEME-MOTION]: тема, вид (webgl/css), смонтирован, Главная на виду, идёт ли прокрутка, приложение активно, идёт ли движение, частота кадров шейдера раз в 10 с, число пауз на прокрутку.
2. Пауза движения:
   - во время прокрутки Главной: шейдер плавно тормозит и разгоняется за 150 мс; CSS замирает на текущем кадре через animation-play-state, без мигания;
   - когда Главная не на виду;
   - когда приложение в фоне.
   WebView НЕ размонтируется и source не меняется: пауза идёт через injectJavaScript → window.__pmSetRunning.

## Scope
- app/home_scroll_activity.ts (новый): «идёт ли прокрутка экрана» — активно с первого шага, гаснет через 220 мс тишины или после конца жеста.
- app/scroll_restore_probe.ts: noteScrollDrag / noteScrollOffset сообщают активность ДО dev-ворот (Главная их уже зовёт; app/(tabs)/home.tsx правит другая сессия — его не трогаем).
- components/home/v2/scene/premium_theme_motion_gate.ts (новый): чистое правило «крутить ли движение».
- components/home/v2/scene/PremiumThemeMotion.tsx: ворота, ref, onLoadEnd, onMessage, журнал.
- Тесты: tests/premium_theme_motion_pause.test.ts (правило + прокрутка), tests/premium_theme_motion_pause_contract.test.mjs (страница умеет паузу, ключ WebView и html не зависят от паузы).

## Architecture
Ворота как у friends/SpireEnergyPill: runtimeOwnerId === 'home' + useIsScreenFocused + useAppRuntimeActive. Прокрутка — внешний store через useSyncExternalStore.

## Security and privacy
Данных не касается. WebView по-прежнему incognito, about:blank, CSP без сети. postMessage несёт только числа (кадры, состояние).

## Technical debt
Пауза на прокрутку включена константой PREMIUM_MOTION_PAUSE_ON_SCROLL. Если A/B Сверки разницы не покажет — можно выключить, не трогая остальное.

## Verification
Новые тесты, сторож premium_theme_motion_source_contract, home_scene_* точечно, проверка типов. На эмуляторе: [THEME-MOTION] в журнале, A/B Сверки.

## Rollback
Revert коммита. Страница без __pmSetRunning ведёт себя как раньше.

## Дополнение 25.10 ~08:45 (A/B Сверки: «Аметист» WebGL → ANR при бросках)
- app/remote_flags.ts: удалённый флаг premium_theme_webgl_motion_enabled, по умолчанию false. Коммит только своих хунков (--patch от HEAD), чужие строки paywall_* не трогаем.
- PremiumThemeMotion: WebGL-темы (Обсидиан / Аметист / Сингулярность) при выключенном флаге не монтируют WebView — фон статичный (градиент сцены). CSS-темы как прежде, с паузой.
- Включение шейдера: флаг true в «Пульте», живьём, без сборки — после проверки паузы на эмуляторе.

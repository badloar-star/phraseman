# Task packet: гейт сплеша по HOME-PAINT

Governance-ID: TG-C0A0E7E0461C
Status: In progress (координатор 05.10: «идея сплеш по HOME-PAINT — одобрено после цифр; если любой флаг
(онбординг/бан) не true — не прятать и логировать, какой держит»; пакет 08:26: sinceFirstContentSetMs 2465/1994)
Owner: сессия 1 · ЯДРО

## Outcome

Пакет 08:26: кадр Главной (HOME-PAINT) на +13369, а сплеш скрыт на +15590 — между setFirstContentReady(true) и
коммитом корня, который снимает гейт, JS-поток занят ~2,2 с (JS-STALL), хотя тяжёлых коммитов нет. Снимаем сплеш прямо
в колбэке первого кадра Главной, без ожидания перерисовки корня:
- нативный сплеш — SplashScreen.hideAsync();
- JS-заставка StartupSplashHold — её прозрачность через Animated на нативном драйвере (без React-рендера); сама она
  размонтируется позже обычным путём.
Условие: fontsReady, ready, liquidGlassChoiceReady — true; онбординг и бан — false (значения последнего коммита).
Иначе не прятать и [BOOTSPLASH] печатает, какой флаг держит. Один раз за процесс.

## Scope

app/_layout.tsx: модульный Animated.Value для корня StartupSplashHold; ref с флагами гейта в AppContent; подписка
whenHomePainted → ранний показ. Прежний гейт (nativeSplashCanHide) остаётся как есть — запасной путь.

## Architecture

Новый путь только раньше снимает уже готовую картинку; данные/навигация не меняются. markNativeSplashHidden и
resolveNativeSplashHidden идемпотентны.

## Security and privacy

Не затрагивает. Бан: при isBanned=true ранний путь не срабатывает.

## Technical debt

Если бан выставится ПОСЛЕ кадра Главной — экран бана всё равно покажется поверх (как и при прежнем гейте, который тоже
смотрит на текущее значение). После пакета замера — убрать временные метки.

## Verification

Синтаксис (babel_check); пакет замера: строка «HOME-PAINT early hide» и hideAsync ≈ HOME-PAINT; визуально — Главная
видна сразу после кадра, без мигания заставки.

## Rollback

git revert коммита.

# [THEME-BOOT] холодный старт при светлой и тёмной системной теме (СВЕРКА, 18.10 02:34–02:36, бандл с f04575af2)
cmd uimode night no / yes → force-stop → monkey LAUNCHER → 8 кадров exec-out screencap подряд (≈0,7 с между кадрами, итого ≈ 5–6 с) → через 30 с кадр «settled». Сценарий «новичок» не делался. Системная тема в конце возвращена: Night mode: no (как было).
Листы: light_sheet.png / dark_sheet.png (кадры f1…f8 слева направо + settled справа), кадры light_f1…f8, dark_f1…f8, *_settled.png; журналы light_theme_boot.txt, dark_theme_boot.txt.

## Светлая системная
- f1: рабочий стол/заставка, f2…f8 (≈0,7–5,6 с) — ТЁМНАЯ заставка (логотип на почти чёрном, яркость кадра 19 из 255) на всех 7 кадрах подряд; на «settled» (через 30 с) уже светлая Главная (209). Т.е. при светлой системе приложение 5+ секунд показывает тёмную заставку и только потом светлую тему — «вспышка тёмного» ВИДНА (длинная, не вспышка).
- Журнал: frame 1 (msSinceBoot 3070): systemScheme=light, followSystem=false, saved graphite/dark, chosen graphite/dark, choiceReady=false, hydratedInProcess=false, covered=true (кадр закрыт заставкой). hydrate (3380): storedTheme=null, onboardingDone=1, followMarker=1, bootScheme=light, decision=new_user/follow_system_marker. frame 2 (4003): systemScheme=light, followSystem=true, chosenTheme=ink, chosenAppearance=light, choiceReady=true, covered=false. Строки ceiling нет.
## Тёмная системная
- f1 — рабочий стол, f2 — тёмная заставка, f3…f8 — почти чёрный экран (яркость 0), settled — тёмная Главная (53). Переход без светлых вспышек.
- Журнал: frame 1 (3241): systemScheme=dark, followSystem=false, graphite/dark, covered=true; hydrate (3488): decision=new_user/follow_system_marker, bootScheme=dark; frame 2 (4215): followSystem=true, chosen marine/dark, choiceReady=true, covered=false.
## Замечания
- 🟡 На светлой системе заставка тёмная ~4 с (до frame 2 в журнале 4003 мс), экран приложения под ней закрыт (covered=true) — светлой темы до frame 2 не видно; если «вспышка тёмного» — это нативная заставка, её цвет не следует системной теме.
- 🟡 Хранилище «пользователь пройдён» (onboardingDone=1), а storedTheme/Appearance = null → решение «new_user/follow_system_marker» срабатывает у уже пройденной установки; savedTheme в кадре 1 «graphite», в кадре 2 «ink»/«marine» — в разных запусках разная (ink при светлой, marine при тёмной).

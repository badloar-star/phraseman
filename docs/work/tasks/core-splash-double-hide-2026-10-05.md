# Task packet: сплеш — второй hideAsync после раннего снятия по HOME-PAINT

Governance-ID: TG-37C7BEA04DE1
Status: In progress (координатор 05.10, пакет 09:26 прогон 1: early hide +9016, затем ещё SplashScreen.hideAsync() на
+13112 — «проверь, что он ничего не делает»)
Owner: сессия 1 · ЯДРО

## Outcome

Прежний гейт (nativeSplashCanHide) после раннего снятия зовёт hideAsync повторно, и голый `void hideAsync()` без catch
может дать необработанный отказ («нет зарегистрированного сплеша»). Если сплеш уже снят по HOME-PAINT — прежний путь
пишет [BOOTSPLASH] «уже снят по кадру Главной» и hideAsync не зовёт; остальное (окно коммитов, отметки) — как было.

## Scope

app/_layout.tsx, эффект nativeSplashCanHide.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Прогон 2: firstContentReady FALLBACK (400 мс) снимает сплеш раньше кадра Главной — отдельный вопрос координатору.

## Verification

Синтаксис; сторожа root_layout_startup_navigation_contract, bootstrap_locale_contract; пакет замера.

## Rollback

git revert коммита.

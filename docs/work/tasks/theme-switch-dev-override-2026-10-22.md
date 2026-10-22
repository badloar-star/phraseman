# «Темы не переключаются»: застрявший dev-оверрайд темы и оформления

Governance-ID: TG-9E160A31BF69

## Outcome
Владелец 22.10: «темы не переключаются». По журналу эмулятора (logcat, 18:07): записи `[THEMES-SWITCH] commit {"kind":"theme","from":"taupe","to":"rose"}` и `…"to":"ink"` проходят и пишутся на диск (`write_ok`), но активная тема в `[THEMES-MEM]` остаётся `marine`, а оформление — `dark`: каждая смена оформления пишет `from":"dark","to":"light"` с неизменным `from`. Это значит, что выбор человека применяется (`appliedLiquidGlassThemeId`), а эффективная тема берётся из памятного dev-оверрайда (`dev_state?theme=…&appearance=…`, app/dev_appearance_override.ts), который стоит выше сохранённого выбора. Оверрайд ставят робот-съёмки и dev-экраны; до перезапуска процесса он «держит» тему и оформление, и ручной выбор не виден.
Чиним: любой ручной выбор человека (тема, оформление, насыщенность) снимает dev-оверрайды, плюс журнал `[THEME-SWITCH]`, показывающий, кто держит эффективную тему.

## Scope
In scope: `components/ThemeContext.tsx` (снятие оверрайдов при ручном выборе, журнал расхождения «выбрано ≠ эффективно»), тест-замок `tests/theme_switch_clears_dev_override.test.ts`, реестр замков.
Out of scope: dev-экраны, которые ставят оверрайд намеренно (они сами возвращают прежнее при уходе).

## Architecture
`freezeFollowSystem` вызывается первым делом всеми тремя setter-ами (тема, оформление, насыщенность); перед ним добавлен `releaseDevOverrides(trigger)`: если `getDevThemeChoice()` или `getDevAppearance()` не пусты — пишет `[THEME-SWITCH]` с прежними значениями и вызывает `setDevThemeChoice(null)` / `setDevAppearance(null)`. Эффект-наблюдатель пишет `[THEME-SWITCH]` один раз на смену, если эффективная тема ≠ применённой, с указанием источника (preview / dev / followSystem).

## Security and privacy
Данных пользователя не касается; dev-оверрайды живут только в памяти.

## Technical debt
Dev-оверрайды остаются возможными в сборках для разработки; релизный путь `dev_state` — отдельный вопрос.

## Verification
Замок-тест: после `setLiquidGlassThemeId` / `setLiquidGlassAppearance` / `setLiquidGlassIntensity` оверрайды пусты, эффективная тема и оформление равны выбранным.

## Rollback
Убрать вызов `releaseDevOverrides` и эффект журнала.

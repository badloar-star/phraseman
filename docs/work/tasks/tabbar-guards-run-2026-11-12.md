# Task packet: прогнать тяжёлых сторожей панели вкладок после правок 11.11

Governance-ID: TG-46B9FD0CCDF8
Status: Done — 8 сторожей вкладок 33/33 и node 10/10 зелёные, проверка типов 0 ошибок
Owner: сессия Claude (ночное дежурство координатора 12.11: «доделать свои задачи до конца без вопросов»)
Related epic/enabler: docs/work/tasks/tabbar-ios-opaque-glass-2026-11-11.md

## Outcome

Правки панели вкладок 11.11 (c984940bb, 844f32108, 2f31159d2, a186b4d25) подтверждены прогоном сторожей и проверкой типов,
а не только чтением кода. Мерило — вывод команд «passed» по каждому файлу.

## Scope

In scope: `tests/v2_tab_bar_liquid_glass_theme.test.cjs` — первый тест красный с d8a0a685a (ищет `<CapFill width={slotW}`, а в коде
`width={capW}`) и после 844f32108 не находит `const color = on ? palette.accentBright`. Регулярки приводятся к нынешним строкам с тем же
смыслом: плашка — `palette.accentCap`, активный значок — `palette.accentBright`. Прогон jest-сторожей заморозки, прогрева и панели.

Out of scope: правки самого приложения, если сторожа зелёные; чужие красные сторожа.

## Architecture

No architecture change: только сторож и прогон.

## Security and privacy

Не затрагивается.

## Technical debt

Pay now: устаревшие регулярки сторожа приведены к коду, смысл проверки сохранён.

## Verification

`node --test tests/v2_tab_bar_liquid_glass_theme.test.cjs tests/tabbar_glass_opaque_2026_11_11.test.cjs`;
`npm run test:one --` по tab_freeze_handoff_contract, perf_freeze_contract, tabs_premount_order_2026_11_04, tab_deferred_mount_contract,
deferred_tab_prewarm_contract, dialogs_back_tabbar_contract, tab_bar_motion_accessibility_contract, theme_tab_bar_contrast;
точечная проверка типов по `app/(tabs)/_layout.tsx` и `components/v2/V2TabBar.tsx`. Всё через светофор.

## Rollback

`git revert` коммита сторожа; данные не затрагиваются.

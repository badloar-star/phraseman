# Codex: Шпиль — до «релизного пола» (срез A, владелец 10.10)

Дата: 2026-10-10. От: сессия 1 · ЯДРО, по поручению координатора. Срез: C:\Temp\claude\RELEASE_SLICE.md, пункт A.
Правило владельца: ничего не обрезаем, но если выпустить прямо сейчас — всё видимое выглядит и работает как
доделанное. Незаконченное не видно (за флагом), видимое — целое, без красных экранов, заглушек и «скоро».
Зона Codex: functions/src/spire_*, modules/spire, app/spire, components/spire.

## A1. Шпиль играбелен от начала до конца

Что Ядро видит на 10.10 (факты, а не догадки):

1. **Красный сторож вкладки.** tests/spire_tab_gate_source_contract.test.mjs, тест «flag: tab is hidden by default
   and only opens by remote key or __DEV__ override», падает на «reads the already cached remote config». Читатель
   флага (app/spire_tab_flag.ts) и сторож разошлись. Нужно привести код к сторожу (он охраняет fail-closed) либо
   осознанно обновить сторож, не ослабляя.
2. **Незакоммиченная работа Шпиля.**
   - 33 файла в modules/spire, app/spire, components/spire, functions/src. Сервер: spire_multilingual_pool,
     spire_pack_build, spire_progress_contract, spire_task_flag/incident/report_contract, admin_spire_task_flag.
   - Плюс D154–D157 в docs/phraseman-2.0/03_DECISIONS.md: в рабочей копии, не в коммите.
   - Сборка релиза идёт из коммита (срез E3), поэтому всё, что должно уехать, нужно закоммитить, а остальное
     осознанно исключить.
3. **Проход целиком на эмуляторе** (запись экрана): вкладка в «Сообществе» → вход в комнату → ступень → этаж →
   итог недели → награды и экран повышения. Сейчас на эмуляторе Шпиль виден только по dev-переопределению; это
   нужно явно отметить в отчёте.
4. **Полы:**
   - нет сети — спокойное «Сейчас недоступно» и «Попробовать снова» (D158), не красный экран;
   - первый вход без кэша — скелетон на месте блока;
   - вкладка выключена — её не видно вообще.

## A2. Лиги — переход только по сумме монет за неделю (D162)

Отдельное подробное задание: docs/phraseman-2.0/handoff/CODEX_LEAGUE_PROMOTION_2026-10-10.md (bf3ad5e36).
Коротко:
- spire_finalize_core сейчас ранжирует по ступеням. Нужно ранжировать по `starsWeekEarned(users/{uid}.stars,
  finishedWeek)`. Этот счётчик уже ведёт stars_ledger, в него идут только операции earn.
- Шкала ботов и места во время недели — по той же основе. Тексты правил — про монеты.
- Логи [LEAGUE-PROMO] (вход, решение, выход). Тесты; guard_league_demotion — под монеты, без ослабления.

## A3. Включение (делает только владелец, это боевые данные)

- remote_config/app.bools.spire_tab_enabled = true (видимость вкладки, app/spire_tab_flag.ts).
- config/spire_v1.enabled = true (liveForPlayers в spire_config_contract.ts).
- Порядок для владельца:
  1. функции выложены;
  2. пакеты недели собраны (adminSpirePackBuild или крон spirePackWeeklyCron) для каждого включённого языка
     (D155: неанглийские — fail-closed);
  3. config/spire_v1.enabled;
  4. только потом spire_tab_enabled.
- Ни один ключ не включать до зелёного прохода A1.

## Функции к выкладке владельцем (Шпиль)

spireReportSteps, spireJoinRoom, spireFinalizeCron, spirePackWeeklyCron, adminSpirePackBuild, spireZoneWarningCron,
adminSpireConfigGet, adminSpireConfigSet, adminSpireTaskFlagList, adminSpireTaskFlagAdd, adminSpireTaskFlagRemove,
adminSpireTaskReportList, adminSpireTaskIncidentStates, adminSpireTaskIncidentSetState.
Codex: сверь со своими незакоммиченными правками и пришли координатору точный список того, что изменилось после
последней выкладки. Ядро не знает, что уже выложено.

## Что прислать координатору

Одним сообщением:
1. Хэши коммитов.
2. Сторожа Шпиля — все зелёные, или красные с причиной.
3. Запись прохода A1 с эмулятора.
4. Список функций к выкладке.
5. Готовность A2 с тестами.

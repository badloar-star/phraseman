# Хендовер: 2 · Дизайн → Codex (26.10)

Для агента без контекста. Репозиторий C:\appsprojects\phraseman, ветка feature/referral-roulette, всё пишется в одно общее дерево (без веток и worktree). Коммиты только через `bash scripts/safe_commit.sh` (dry-run, `--expect путь=+/-` на каждый путь, `--patch` для чужих хунков; не под `timeout`). Новый Governance-ID дописывается строкой `Governance-ID: …` в пакет `docs/work/tasks/*.md` ДО правки файла вне docs. Тяжёлое (jest, tsc) — через светофор `bash .claude/semaphore/slot.sh`; два сторожа банков экзамена гоняются без слота: `npx jest tests/owner_locks_exam_episode_words_2026_10_25.test.ts tests/learning_v2_chapter_exam_v2_banks_rules.test.ts --runInBand`.

## Сделано (хэши)

Пейвол Plus:
- 8a7cd2cbe — окно Plus «Вариант М» ВКЛЮЧЕНО по умолчанию в сборке 2.0.3 (146): `DEFAULT_FLAGS.paywall_m_enabled = true` в app/remote_flags.ts, переключатель в «Пульте» (admin/v2/legacy.html) показывает «включено» при пустом конфиге; тесты paywall_m_flag_fork и paywall_admin_controls обновлены.
- 880312a38 — низ прежнего окна Plus: плашки «Восстановить» / «Ввести промокод» держат flex на внешнем слое V2Pressable (`outerStyle`), «Условия» / «Конфиденциальность» больше не наезжают; журнал `[PAYWALL-ENTRY] неизвестный вход` со всеми параметрами маршрута ДО отказа (app/paywall_entry_contract.ts); сторож tests/paywall_dock_links_and_unknown_entry_2026_10_26.test.ts.
- `settings_plus` — НЕ законный source. Настоящая кнопка Plus в Настройках шлёт `settings_premium` (app/(tabs)/settings.tsx, plusRowPress). Значение приходило из ссылки съёмки (Ядро записало в c161d894a). В белый список не добавлялось. Если красный экран повторится — в журнале будет строка `[PAYWALL-ENTRY] неизвестный вход … params={…}` с вызывающим.
- Ночные коммиты по М и промокоду: c27fb3114 (М за флагом), de97b53fe / 773dd65dc / de5aa2db0 / 6c339a122 (тексты), 28b693a44 / 1e3514044 (токены), cfbef82ca / 23fd42d50 / f11cb167b (окна по месту: энергия, серия, замок урока, ИИ-диалог, Мастерская), 6e8023aff (без обводок), 250887774 (крайние случаи 360 dp, шрифт ×1,3), 6c3005089 (прокрутка), 466dcc8bc / 590f6937d / 04f94e88c (промокод заменяет пейвол и возвращает в него с парой context/source из контракта).
- Прочее за ночь: настройки (26f03e894, 650ea13ea, ee7e44404), друзья (c54dd5242), проба прокрутки главной (030d072df, 320d98b90), сводки docs/work/design-night-summary-2026-10-26.md (7d1aad911, b8781c4ca, 764235475).

Банки экзамена глав v2 (modules/learning-v2/exam/banks/):
- уроки 16, 17, 18, 19 — по 7 глав: 050afdf17, ff6e4989f, 2f943a3de, 96f4bcc99; вопросы со «?» добавлены в 16 (гл. 4), 17 (гл. 2, 4, 6, 7), 19 (гл. 3–7) — 0a3357630; в уроке 18 вопросов в эпизодах нет.
- урок 29 главы 4–7 и урок 30 главы 1–2 (выпущено 17 эпизодов) — 4dcff3d80, подключены в registry_l27_l30.ts — 3301b45a4; единый файл вычитки docs/work/exam-banks/l29.md (7 глав), l30.md.
- строки прогресса — docs/work/exam-banks/PROGRESS.md (ebe2b465a и следующий).
- Реестр `registry_l16_l19.ts` — мой; `registry_l27_l30.ts` — общий с Learning V2 (его главы 27, 28, 29/1–3).

## НЕ доделано

1. Пейвол М — деньги проверены только чтением кода, НЕ на эмуляторе. Файл components/paywall/PaywallPlusScreen.tsx:286–299: окно М получает те же `p.handlePurchase`, `p.handleRestore`, `p.handleClose('close','x')`, `openPromoCodeFromPaywall(router, { context: ctx, source })`, цены `p.yearlyPrice / p.monthlyPrice` из хука `usePaywallPurchase` (app/paywall_purchase.ts), что и прежнее окно. Нужно живое подтверждение на устройстве: покупка (магазин, sandbox), восстановление, промокод и возврат в пейвол, закрытие и возврат на экран-источник, для КАЖДОГО context/source из PAYWALL_SOURCE_VALUES (app/paywall_entry_contract.ts) и контекстов app/premium_context.ts; цены не пустые и не заглушки; нет dev-строк. Как проверить: склейки Сверки «макет | эмулятор» (docs/phraseman-2.0/evidence/parity/), замок эмулятора — /c/Temp/claude/emu_lock.sh.
2. Узкий экран М (360 dp, шрифт ×1,3, самый длинный из 9 языков): логика `paywallMCompactLayout` (components/paywall/m/paywall_m_panels.ts:94) уже ставит плитки и тарифы столбиком, но кадров на эмуляторе нет. Тест: tests/paywall_m_panels_2026_10_25.test.ts и соседние paywall_m_*.
3. Вход «Не видим твой Plus» (PaywallServerRefusedDock.tsx) остаётся на своём доке даже при включённом М (PaywallPlusScreen.tsx:75); внутри М у него своя панель. Проверить глазами.
4. Низ прежнего окна (880312a38) проверен кодом и тестами, кадра «после» нет — нужна склейка на узком экране и со шрифтом ×1,3.
5. tsc: запуск `npm run typecheck` после коммита 8a7cd2cbe стартовал, результата на момент хендовера нет (лог C:/Temp/claude/c1/run_tsc_pw.log, строка EXIT_TSC=). До этого красный был только в чужом components/spire/SpireHomeScreen.tsx (podiumColumns, podiumSkeleton, roomCeilingPassed — незакоммиченная правка другой сессии).
6. Уроки 20+ банков: уроки 29–30 закрыты, но урок 30 — только главы 1–2. Когда выпустят эпизоды 17–56 урока 30: спеки в C:/Temp/claude/c1/exam/specs (вне репозитория, могут пропасть) — писать по образцам chapter_exam_v2_l30_c1/c2.ts; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md. «?» разрешён с урока 2.
7. 🟡 В docs/work/exam-banks/PROGRESS.md у урока 8 осталась устаревшая пометка про главу 3 без вопросов (мелочь, не моя строка).

## Незакоммиченные файлы моей зоны
Нет (проверено git status по components/paywall, app/paywall_entry_contract.ts, app/remote_flags.ts, банкам 16–19, 29, 30, docs/work/exam-banks). В рабочем дереве лежит много чужих незакоммиченных файлов других сессий — их не трогать.

## Красные тесты
- Мои наборы зелёные: 26 файлов пейвола (220 тестов) + 3 файла флага/админки (23 теста) перед коммитом 8a7cd2cbe; оба сторожа банков 416/416.
- Известные красные чужие: см. docs/work/handover/revizor_known_red_tests.txt; tsc — чужой SpireHomeScreen (п. 5).

## Риски
- 🔴 ДЕНЕЖНЫЙ ПУТЬ ЧЕРЕЗ ОКНО М: с 8a7cd2cbe это окно по умолчанию видят ВСЕ пользователи сборки 146. Проверка — только чтением кода. Если на устройстве покупка/восстановление/промокод ведут себя иначе — сразу выключить флаг: в «Пульте → Монетизация» снять «paywall_m_enabled» (живьём, без сборки) либо вернуть `paywall_m_enabled: false` в app/remote_flags.ts и выкатить OTA. Откат на прежнее окно — целиком рабочий.
- 🟡 Тексты М на 9 языках — часть черновая, ждёт утверждения Переводчика (docs/work/tasks/core-paywall-unknown-entries-guard-2026-10-25.md). Экран окна «Мастерская фраз» за отдельным флагом.
- 🟡 Тот же приём — `flex: 1` в `style` у `V2Pressable` (оно попадает на внутренний слой) — может прятаться и в других экранах; общий поиск не делался.
- Правило владельца: у М — ни одной обводки контейнера, ни одной мелкой подписи-расшифровки (токены темы, тень вместо рамки).

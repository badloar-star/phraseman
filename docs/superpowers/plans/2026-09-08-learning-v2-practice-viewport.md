# Компактная отработка Learning V2 — 2026-09-08

Прямое решение владельца: подключить принятую компоновку практики к приложению, сохранить прокрутку карты и убрать промежуточный экран «Я здесь. И я готов». Учебные интро остаются. В режиме стандартного размера текста основной путь рассчитан на один экран; крупный системный шрифт и длинные локализованные ответы никогда не обрезаются ради этого ограничения.

| Этап | Статус |
| --- | --- |
| Реальный player: footer в обычном layout, без резервных 148 px поверх прокрутки | Подключено |
| Шесть активных режимов: компактные интервалы, аудио, плитки и feedback | Подключено |
| Системная тема, callbacks, запись до release, ответы и карман | Существующее поведение сохранено |
| Briefing в HTML: удалён из каталога и маршрута, старые ссылки ведут в intro1 | Готово |
| Focused функциональные проверки и read-only review | Выполнены, ограничения ниже |
| Фактическое размещение на телефоне | Не проверено: adb devices пуст |

## Реализация

- `components/learning-v2/LearningV2PracticeViewport.tsx`: измеряет доступную высоту между header/footer и включает компактную плотность. Прокрутка появляется только при фактическом переполнении, как защита доступности. Смена плотности не перемонтирует задание.
- `app/learning_v2_direct_session_player_v1.tsx`: практика использует новый viewport, footer участвует в layout. Остальные dirty-изменения этого файла сохранены.
- Шесть `modules/learning-v2/modes/*_mode_v1.tsx`: компактная геометрия только в direct player. В аудиовыборе компактная сетка 2 × 2. Speed Match сохраняет прежний ScrollView в других hosts; direct player управляет возможным переполнением сам.
- `components/ui/v2_ui.tsx`: необязательный `compact` у V2Chip, минимум 44 dp, без ограничения строк и уменьшения шрифта. Остальные места приложения не включают этот параметр.
- `docs/v2/mockups/expedition-studio-2026-09-08/expedition.js` и `standalone.html`: 19 сцен, без briefing. Фраза «Экспедиция продолжается» ранее удалена из макета; в native player её не было.

## Проверка и ограничения

Blueprint/preflight PASS: fingerprint `bb53181a104f8476761eef548949b0f978a0fd2f0caacdb239ad70c5cbb1845c`, APPROVED; English CURRENT 1 DRAFT, LOCKED none, 2–56 forbidden. ON TRACK: только presentation, учебные исходники, schema, баланс и voice engine не менялись.

Focused RNTL проверяет измерение, доступность переполненного содержимого, сохранение ответа при resize и различение direct/other hosts. Восемь UI-файлов проходят ESLint без замечаний; player имеет 17 существующих предупреждений, 0 ошибок. Сборка standalone и проверка его 19 сцен через JS VM/PostCSS проходят. Это не доказательство пиксельного соответствия на устройстве.

Read-only review обнаружил отсутствующий локальный compact hook у ListenChooseOption и удаление вложенной прокрутки Speed Match в других hosts. Оба дефекта исправлены; повторный bounded review дополнительных конкретных регрессий не нашёл. Первый TypeScript reviewer отказался от review без полного project tsc; полный tsc не запускался по правилу ограниченных проверок репозитория.

`learning_v2_new_word_before_practice_motion_2026_08_26_gate.ts` PASS. Два дополнительно запущенных старых content gates остаются красными до UI assertions на нетронутых данных: `learning_v2_session1_owner_reported_issues_2026_08_26_gate.ts` — visually confusable intro glyphs; `learning_v2_session1_owner_ui_decisions_2026_08_25_gate.ts` — 3 unique left pair IDs вместо 4. Они не ослаблялись; этот пакет не получает общий content AUTO_PASS.

Логи: `.codex-tmp/practice-fit-test.log`, `practice-fit-lint-focused.log`, `practice-fit-lint.log`, `expedition-blueprint-current.log`, `expedition-preflight-current.log`. Сборка приложения, deploy, push и выпуск не выполнялись.

## Следующая проверка

На подключённом телефоне открыть реальную сессию Learning V2 и проверить все шесть режимов на 320/390 dp, включая неверный ответ, audio unavailable, запись и её результат. Убедиться, что стандартный текст помещается без прокрутки, а увеличенный доступен полностью. Сверять именно native, не HTML; полный visual/motion parity пока не заявляется.

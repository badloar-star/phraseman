# Learning V2 — Intro Reader A device QA

Дата: 2026-08-20.

## Устройство

- Android emulator: `sdk_gphone64_x86_64` (Pixel 8 profile).
- Экран: 1080 × 2400 px, density 420, font scale 1.0.
- Expo development build `app.phraseman`, Metro `127.0.0.1:8081`.
- Верхняя панель Reader использует явный стабильный safe-area inset; контент не попадает под status bar.

## Матрица визуальной проверки

Проверены 9 активных тем: `indigo`, `sagePorcelain`, `olive`, `midnight`, `ember`, `aurora`, `volt`, `dark`, `gold`.

Для каждой темы сохранены три реальных экрана (`concept`, `formula`, `trap`) — всего 27 PNG. Каждый сценарий открывал настоящий route, выбирал правильный ответ и переходил дальше. Первые восемь тем прошли единым Maestro-прогоном; Gold был повторён отдельно после подтверждённого ручного вмешательства в общий эмулятор и прошёл полностью.

## Что проверено

- Reader A остаётся одноколоночным: один заголовок, один объясняющий поток, один встроенный вопрос, одна фиксированная CTA.
- Целевой английский визуально отделён от языка объяснения и имеет вес 700; ошибочная целевая форма выделена отдельным цветом и зачёркнута.
- Цвет целевого языка уникален для каждой активной темы и проходит программный WCAG AA contrast gate.
- На светлой `sagePorcelain` и на тёмных `volt`/`gold` иерархия и контраст сохраняются.
- Нет слов «сессия», ссылок на прошлые/будущие занятия и карточной трёхколоночной подачи.
- Интерактивность: ответ → обратная связь → CTA → следующий экран.
- Motion Hybrid: используются общие токены `PRESS`/`SUITE`, без локальных spring/timing-констант.

## Автоматические гейты

- Semantic intro runs, source/generator/readback/adapters, Reader A design/theme, Motion Hybrid и dev fixture: 30/30 тестов зелёные на финальном контрольном прогоне.
- React Native Testing Library: интерактивный Reader A — 1/1 тест зелёный.
- Dev-only fixture contract: зелёный.
- Полный `tsc --noEmit` упёрся в лимит памяти Node (4 GB). Сфокусированный typecheck не нашёл ошибок в изменённых файлах; он остановился на двух существующих ошибках в `app/active_recall.ts` и `app/lesson_words.tsx`.

## Артефакты

Имена файлов: `<theme>-concept.png`, `<theme>-formula.png`, `<theme>-trap.png`.

# UX-волна 2 (уроки/практика), 04.11 — часть Learning V2

Governance-ID: TG-D39AB2CEDC1D

## Outcome
Приятные мелочи, одобренные владельцем (план `docs/work/ux_delight_quickwins_2026-11-04.md`, пункты 4, 6, 8б, 16): плавные полосы прогресса вместо прыжков `width: %`, Reduce Motion для конфетти/введения/медали/эквалайзера/TapScale, плавное появление «Кармана слов» и новых реплик диалога, Enter и фокус в вводе «Отработки ошибок». Пункт PracticeCta → V2Pressable — только после коммита «Дизайна» по V2Pressable.

## Scope
Только внешний вид и движение. НЕ трогаем логику энергии, резюме и прогресса плеера `app/learning_v2_direct_session_player_v1.tsx` (правки только патчем от HEAD, чужие правки в файле не берём). Файлы по пунктам: `components/learning-v2/placement/PlacementChrome.tsx`, `components/learning-v2/exam_v2/ChapterExamV2Run.tsx`, `components/lessons/LessonMenuGlass.tsx`, плеер; далее Reduce Motion и остальное по плану.

## Architecture
Готовый `components/KitProgressFill.tsx` (scaleX, нативный драйвер, кривая из KIT_MOTION, Reduce Motion). Новых View в списках нет; только transform/opacity. Для каждого пункта — тест-сторож (исходный контракт).

## Security and privacy
Данные не собираются и не передаются; политику конфиденциальности менять не нужно.

## Technical debt
Не добавляем: убираем четыре прыгающие полосы. Остаток: PracticeCta (~22 экрана) ждёт V2Pressable.

## Verification
Точечные тесты (`jest` через слот), сторож на пункт, импорт-проверка; типы по своим файлам в чистой копии (одним процессом, `--max-old-space-size=7168`), когда хватает памяти.

## Rollback
Каждый пункт — отдельный коммит; откат `git revert` по пункту. Полоса возвращается к `width: %` без влияния на данные.

Governance-ID: TG-1D63C99F799A (PracticeCta на V2Pressable; правка TS18048 в use-audio после удобства №2)

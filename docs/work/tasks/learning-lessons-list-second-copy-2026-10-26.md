# Task packet: '/lessons_list' в коде экранов «Обучения» — без второй копии вкладки «Уроки»

Governance-ID: TG-F87995A5CF8F
Status: In progress
Owner: Learning V2 session; задача координатора 26.10 (находка Ядра в аудите «назад», петля 99bc0fa02)

## Outcome

Переход к урокам из экранов «Обучения» больше не кладёт поверх стека вторую копию вкладки «Уроки» (/lessons_list — re-export
(tabs)/lessons): replace/dismissTo на /lessons_list → сворачивание до вкладки dismissToTabRoute(router, '/(tabs)/lessons'), как у Ядра
в lesson_complete. Запасной маршрут safeRouterBack (когда истории нет) → '/(tabs)/lessons'. «Назад» после перехода не показывает
список второй раз.

## Scope

app/hint.tsx, app/lesson_words.tsx, app/level_exam.tsx, app/exam.tsx, app/lesson1.tsx, components/level-exam/LevelExamV2.tsx; тест-сторож.
lesson_menu и learning-v2/chapter-exam '/lessons_list' в коде уже не содержат. Отдельный коммит на экран.

## Architecture

dismissToTabRoute (app/navigation_back.ts, Ядро): dismissTo вкладки — стек сворачивается до неё, иначе replace. Параметр id
(раскрыть урок в списке) при сворачивании не передаётся — вкладка остаётся в своём состоянии, как в 99bc0fa02.

## Security and privacy

Нет данных.

## Technical debt

Кадр Сверки: переход «К урокам» с экзаменов и выход из слов урока → «назад» не показывает список повторно.

## Verification

Сторож tests/learning_no_lessons_list_copy_2026_10_26 (ts); тесты экранов по исходнику.

## Rollback

Revert коммитов по экранам.

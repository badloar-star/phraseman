# Task packet: последние 4 перехода на копию вкладки «Уроки» (/lessons_list) + храповик

Governance-ID: TG-F87995A5CF8F
Status: In progress
Owner: Learning V2 session; задача координатора 26.10 (тот же класс, что c8dd3d872 / 99bc0fa02; разрешение на строки в диалоговых файлах — координатор)

## Outcome

«К урокам» из «Ошибок» и кнопки французского гейта (итог урока, разговор с ИИ, ИИ-собеседник) сворачивают стек до вкладки «Уроки», а не
кладут поверх её копию: «назад» не показывает список второй раз. Храповик запрещает новые переходы на /lessons_list.

## Scope

app/mistakes_hub.tsx, app/lesson_complete.tsx, app/ai_dialog_session.tsx, app/ai_companion_session.tsx — только строка перехода (+ импорт);
tests/gustav_french_curriculum_contract.test.ts (ожидание под новую строку); храповик tests/lessons_list_copy_ratchet_2026_10_26 (ts).

## Architecture

dismissToTabRoute(router, '/(tabs)/lessons') из app/navigation_back (лог [NAV-BACK] внутри); в lesson_complete — его константа
COMPLETE_TO_LESSONS_TAB. Оставшиеся места (реестр ролей, Главная и «Сегодня» при скрытом V2, тап по пушу) — в списке храповика.

## Security and privacy

Нет данных.

## Technical debt

Тап по пушу (notifications.ts, notification_tap_handler.ts) всё ещё ведёт на /lessons_list — зона уведомлений, хозяину через координатора.

## Verification

Храповик, gustav_french_curriculum_contract, lesson_complete_back_to_tab_contract, lesson_back_navigation_source; проверка типов.

## Rollback

Revert коммита.

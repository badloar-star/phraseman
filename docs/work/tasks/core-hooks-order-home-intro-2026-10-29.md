# Ядро · порядок хуков: Главная и вступление занятия Learning V2 (29.10, к кандидату OTA)

Governance-ID: TG-998ECFB79867
Status: Done — eslint rules-of-hooks по двум файлам: 0
Owner: 1 · ЯДРО

## Outcome
Линт react-hooks/rules-of-hooks (координатор) — хуки после раннего return:
- app/(tabs)/home.tsx:3034/3038/3050 — после `if (!diagChecked) return …` (строка 2429). diagChecked — константа true
  (строка 1525), ранний выход мёртвый: вылета нет, но любая будущая правка условия уронила бы Главную
  «Rendered more/fewer hooks». Убираем мёртвую ветку и константу.
- app/learning_v2_session_intro.tsx:590 — useEffect журнала [INTRO-BLUR] после `if (!screen) return null;` (516). Срабатывает,
  когда список экранов пуст; смена пусто↔непусто между рендерами → падение. Поднимаем эффект выше раннего выхода
  (все зависимости объявлены выше: g, sx, safeIndex, lessonId, reducedMotion).

## Scope
Только перенос/удаление строк, поведение не меняется.

## Architecture / Security and privacy / Technical debt
Без новых данных. Снимает класс бага «хук после раннего return» в двух экранах.

## Verification
eslint rules-of-hooks по двум файлам — 0; парс babel; тесты вступления и Главной точечно на снимке.

## Rollback
git revert.

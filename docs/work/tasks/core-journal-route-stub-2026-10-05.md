# Task packet: (б) journal.tsx — заглушка вместо реэкспорта экрана уроков

Governance-ID: TG-C0A0E7E0461C
Status: In progress (координатор 05.10, пакет 08:26: цепочка lessons.tsx ← journal.tsx — «заглушка оправдана»)
Owner: сессия 1 · ЯДРО

## Outcome

app/(tabs)/journal.tsx — legacy-якорь URL /journal — делал `export { default } from './lessons'`, и роутер, вычисляя файлы
маршрутов на старте, тянул экран уроков (3400+ строк, ~321 мс в графе корня) ещё до первого кадра. Компонент отсюда не
рендерится никогда ((tabs)/_layout не рендерит детей-роутов; /journal маппится на вкладку в PATHNAME_TO_IDX). Заменяем
реэкспорт на пустой компонент — URL по-прежнему не падает в not-found, а lessons.tsx грузится лениво, как и задумано.

## Scope

app/(tabs)/journal.tsx; описание в scripts/pm004_route_registry.mjs.

## Architecture

Маршрут остаётся, меняется только то, что он экспортирует.

## Security and privacy

Не затрагивает.

## Technical debt

Остальные маршруты, которые роутер вычисляет на старте (app/learning-v2/session/[id].tsx и др.), — вопрос владельцу про
asyncRoutes; здесь не трогаем.

## Verification

Синтаксис; пакет замера: lessons.tsx должен уйти из layout.module_eval:chains.

## Rollback

git revert коммита.

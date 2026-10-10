# Task packet: ворота паритета — только локально; перф-находки Сверки (home:js_gap, холодный диплинк)

Governance-ID: TG-16B47AA45F48
Status: In progress
Owner: сессия 1 · ЯДРО (решения координатора 11.10 02:40 и 03:05)

## Outcome

1. Ворота паритета макетов проверяются только в `release:precheck` (локально, строго, рычаг PARITY_GATE_WAIVER там
   же). Из eas-build-post-install убраны — на сервере EAS нет docs/, честно пройти они не могут.
2. [DIALOGS-OPEN] home:js_gap 2,7 + 2,3 с: сперва трассировка этапов монтирования Главной, найти виновника, вынести
   после первого кадра.
3. Холодный диплинк phraseman://video съедается стартовым replace на Главную — не перебивать распознанную ссылку.

## Scope

package.json (только строка eas-build-post-install, хунком; чужие правки не трогаю), tests/visual_parity_gate.test.mjs,
tests/store_release_gate_levers.test.mjs, docs/phraseman-2.0/RELEASE_BUILD_E4.md; далее app/(tabs)/home.tsx и
app/_layout.tsx — трассировка и точечные правки с тестами.

## Architecture

Без новых модулей. Ворота — смена места запуска. Перф — перенос работы за первый кадр (InteractionManager/после
first frame), без изменения данных.

## Security and privacy

Не затрагивает.

## Technical debt

Серверная сборка больше не проверяет макеты: ответственность за `npm run release:precheck` перед сборкой — на
владельце (строка в E4). После релиза — «квитанция сверки» (вариант в).

## Verification

node --test tests/store_release_gate_levers.test.mjs tests/visual_parity_gate.test.mjs; юнит-тесты на редирект
диплинка; трассировка на эмуляторе — замер владельцем/Сверкой.

## Rollback

git revert коммитов.

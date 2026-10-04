# Task packet: память корневого jest — найти и убрать причину

Governance-ID: TG-B77414A60125
Status: In progress
Owner: сессия 1 · ЯДРО (координатор 04.10: первое задание в окне jest)

## Outcome

Корневой прогон одного тестового файла укладывается в разы меньше памяти, чтобы jest не ронял эмулятор
и сессии не снимали друг друга. Решение — по замеру --logHeapUsage «до/после», коммит только при
падении пика вдвое и больше.

## Факты до замера

- package.json jest.roots = ['<rootDir>/tests'] — haste-map обходит только tests/ (2813 файлов, 25 МБ),
  content/ и modules/ он НЕ обходит; modulePathIgnorePatterns для них ничего не даст.
- transform: ts-jest с inline tsconfig и проверкой типов: на каждый тест-файл строится программа
  TypeScript по всему графу импортов (app → modules → сгенерированный контент). Гипотеза: это и есть
  пик памяти.

## Scope

package.json → jest.transform (опция ts-jest без проверки типов), если замер подтвердит. Вне: tsconfig.json
(его exclude не трогать), functions/jest.config.js.

## Architecture

Типы проверяет отдельный npm run typecheck (полный tsc — по разрешению координатора); тесты проверяют
поведение. Конфиг-кандидат сначала — в scratchpad, в проект только после замера.

## Security and privacy

Нет.

## Technical debt

Тесты перестанут ловить ошибки типов: компенсируется typecheck. Риск: тесты, опирающиеся на const enum /
namespace-слияния, — проверить прогоном нескольких батчей.

## Verification

Один файл (tests/flashcards_target_gate_fail_closed.test.ts) до/после с --logHeapUsage + пиковая рабочая
память процесса; затем батч из 3–4 файлов с новым конфигом.

## Rollback

git revert.

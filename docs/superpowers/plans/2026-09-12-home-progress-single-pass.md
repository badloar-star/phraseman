# Однократная обработка прогресса Главной — план реализации

> Исполнитель: выполнить в текущей сессии по `executing-plans`, без новых веток,
> worktree, делегирования, коммита или публикации: это ограничения владельца.

**Цель:** исключить повторный JSON.parse выбранного урока и временные массивы
`filter`, не перенося ни одного чтения или вычисления на другой экран.

**Архитектура:** только локальные переменные одного вызова Home.loadData.
Читаются те же 33 ключа одним multiGet; результаты подсчёта используются и для
общего числа завершённых уроков, и для выбранного проверкой доступности урока.
Общие кэши, запись прогресса, условия готовности, UI и прогрев не меняются.

**Стек:** TypeScript, установленный Jest/ts-jest, изолированное выполнение
реального блока исходника через node:vm (без монтирования всего Home).

## Предварительный аудит

- 17 мая, `df8f9c400b`: оба потребителя подсчёта уже существуют в snapshot-коммите.
- 27 июня, `f98b1f38c9`: единый пакет чтения прогресса и последнего урока.
- 28 июня, `db7fc45e08`: отдельная испорченная запись не должна срывать Home.
- 27 июля, `4c87b45e5c`: восстановленный lastId проверяется на доступность.
- 2 сентября, `7aadad13b9`: пакетный resolver заменяет последовательный цикл.

Даты — даты фиксации в Git, не обязательно первоначального написания. Причины
защит подтверждены комментариями в затронутом коде, а не названиями snapshot-коммитов.

Нельзя менять порог 45, учёт `replay_correct`, формулу `(correct / 50 * 5).toFixed(1)`,
обработку null/не-массивов/битого JSON, вызов resolver и его fallback при ошибке.
`setLessonsCompleted` остаётся до ожидания resolver, `setLastLesson` после него.
`rememberHomeScreenHydration` получает те же done/id/progress/score. Отдельные
чтения/записи других пользователей и Firestore не затрагиваются.

## Задача 1: RED — настоящий код, прежние результаты

Создать `tests/home_lesson_progress_single_pass.test.ts`: извлечь блок между
`let done = 0;` и `step('lessons+unlockLoop');`, проверить уникальность границ,
транспилировать установленным TypeScript. Подменить только внешние зависимости:
пакет хранилища, resolver, локализованные имена, React-setters и logger.
JSON.parse и Array.filter выполняются реально; обёртки считают вызовы.

- [x] Проверить пустые и битые данные, 44/45/50+ ответов, replay_correct,
  выбранный урок, все id 1–32 для en/es, resolver-return/reject, порядок обновлений,
  повторное чтение изменившегося прогресса и ошибку хранилища.
- [x] Отдельные проверки работы должны упасть на старом коде:

```ts
expect(run.parseCalls).toBe(32); // до правки 33 при заполненных 32 уроках
expect(run.filterCalls).toBe(0); // до правки 33 временных массива
```

Команда (обязательно взять общий слот, затем освободить в finally):
`node node_modules/jest/bin/jest.js --runInBand --runTestsByPath tests/home_lesson_progress_single_pass.test.ts`

## Задача 2: GREEN — только избыточная обработка

Изменить только блок в `app/(tabs)/home.tsx`, сохранив чужие изменения файла.
Вместо slice пар хранить по одному числу на урок в локальном массиве:

```ts
const lessonCorrectCounts = new Array<number>(lessonKeys.length);
for (let index = 0; index < lessonKeys.length; index += 1) {
    const saved = lessonEntriesWithLastOpened[index]?.[1];
    let correct = 0;
    if (saved) {
        try {
            const progress: unknown = JSON.parse(saved);
            if (Array.isArray(progress)) {
                for (const status of progress) {
                    if (status === 'correct' || status === 'replay_correct') correct += 1;
                }
            }
        } catch (e) {
            DebugLogger.error('home:correct', e instanceof Error ? e : new Error(String(e)), 'warning');
        }
    }
    lessonCorrectCounts[index] = correct;
    if (correct >= 45) done++;
}
```

После прежнего resolver вместо второго разбора и одинаковых веток с нулём:

```ts
const correct = lessonCorrectCounts[lastId - 1] ?? 0;
const scoreStr = (correct / 50 * 5).toFixed(1);
snapLastLessonId = lastId;
snapLastLessonProgress = correct;
snapLastLessonScore = scoreStr;
setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: correct, score: scoreStr });
```

- [x] Выполнить минимальную правку, затем повторить RED-команду — 25/25 PASS.

## Задача 3: проверка и границы результата

- [x] В одном общем слоте выполнить узкие тесты:
  `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath tests/home_lesson_progress_single_pass.test.ts tests/home_startup_stability.test.ts tests/home_counters_first_frame_contract.test.ts tests/home_return_stability_contract.test.ts tests/home_render_scope_guard.test.ts`
- [x] Проверить собственный diff относительно сохранённого текущего файла,
  `git diff --check` по затронутым путям, отсутствие изменений таймеров/готовности/
  прогрева/общих кэшей/записи данных.
- [x] Дополнить `docs/reports/STARTUP_REAUDIT_2026-09-12.md` фактическими RED/GREEN
  результатами. Не объявлять реальный выигрыш времени или достижение 500 мс:
  без замеров доказано лишь сокращение операций и сохранение проверенных результатов.

Релизная сборка и замеры устройства не выполняются по уточнению владельца.
Этот ограниченный шаг не закрывает общую цель быстрого запуска.

### Результат выполнения

RED: 23/25 PASS, две ожидаемые ошибки по числу операций. GREEN: 25/25 PASS.
Расширенные пять файлов: 38/39 PASS; прежний scope-guard по `level` падает и при
чтении сохранённого исходника до правки. Тест не ослаблен. После OOM обычного
ts-jest используется временный `--config .codex-tmp/startup-proof/jest-home-progress.config.cjs`
с изолированным преобразованием и неизменными проверками. Отдельный строгий
typecheck нового теста прошёл. Полной зелёной проверки приложения нет.

# Task packet: три красных сторожа «Уроков» (логика) — обновить под текущий код, не ослабляя

Governance-ID: TG-9D64D08C7623
Status: In progress (координатор 10.10: «после лиг — три красных сторожа Уроков»)
Owner: сессия 1 · ЯДРО

## Outcome

1. exam_best_pct_sync: в 4a1c787b4 (снятие App Check) `restore: () => { …; return restoreCloudForBoot(); }`
   стало `restore: () => restoreCloudForBoot()` — то же самое. Сторож ждёт новую форму; проверка, что координатор
   старта зовёт именно restoreCloudForBoot, остаётся.
2. lesson_list_flat (тест 3): блок завершения урока в lesson1.tsx переехал из `setTimeout(async () => {…})` в
   именованную `runLessonCompletionNavigation` (вызов — по settle эха или по фолбэк-таймеру).
   Проверено чтением, что всё происходит РОВНО ОДИН РАЗ:
   - ref перехода забирает и обнуляет тот путь, что сработал первым;
   - settle защищён флагом `settled`;
   - монеты засчитывает lesson_complete по (lessonId, studyTarget, completionOrdinal);
   - зачёт `passed: finalScore >= 2.5` есть и в основной ветке, и в запасной (catch).
   Сторож переведён на новую форму с теми же проверками и дополнен проверкой «ref обнуляется до вызова».
3. lessons_tab_locale_runtime (тест 1): русский список LEARNING_V2_OWNER_EN_TITLES_RU введён 13.09 (123aaf87a)
   ровно как исполнение решения «одни названия для всех языков». Комментарий в коде: один проверенный набор
   названий для всех языков интерфейса; сгенерированные «English · Lesson 1» запрещены. Это не ветка по языку.
   Сторож:
   - проверяет код без комментариев (его название — «runtime branch»);
   - разрешает ровно строку единого набора и отдельно требует, чтобы её условие не зависело от `lang`.
   Переменная `fallback` (старые названия курса для языка изучения) переименована в `legacyTitles`: это не
   запасной текст для языка интерфейса.

## Scope

tests/exam_best_pct_sync_contract.test.ts, tests/lesson_list_flat_and_completion_xp_contract.test.ts,
tests/lessons_tab_locale_runtime.test.ts; app/(tabs)/lessons.tsx — переименование одной локальной переменной.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Сторожа по строкам исходника снова отстанут при переписке — так задумано.

## Verification

Три сторожа зелёные; синтаксис lessons.tsx.

## Rollback

git revert коммита.

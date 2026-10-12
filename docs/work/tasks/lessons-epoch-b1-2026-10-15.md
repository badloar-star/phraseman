# B1 (§AUTH-0070, реестр п.73): эпоха вкладки уроков растёт только при уходе из active, при новом active и при сбое подписки

Governance-ID: TG-BE609B0A2C9C
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора; решение советника)

## Outcome
Во время смены аккаунта вкладка уроков пересобирается ровно 2 раза (при уходе из active и при новом active), а не 7: «смена → смена» только обновляет фазу. Крышка держит вкладку закрытой всю смену; сбой подписки закрывает вкладку.

## Scope
app/(tabs)/_layout.tsx (LessonsPaneBoundary), новый чистый модуль app/lessons_privacy_epoch.ts, тест, лог [LESSONS-EPOCH]. Файлы авторизации (account*, auth*) не трогаю.

## Architecture
Решение «растить эпоху или нет» вынесено в чистую функцию decideLessonsEpoch(prev, next) → {bump, reason}; редьюсер applyLessonsReconcile обновляет состояние {epoch, phase, failClosed}; крышка вычисляется функцией computeLessonsCover. Пропуск не меняет ключ DeferredTabScreen, поэтому вкладка не перемонтируется.

## Security and privacy
Приватность сохранена: данные старого аккаунта не переживают стирание — первый рост эпохи при уходе из active пересоздаёт вкладку, крышка (phase=transitioning / epoch > activated) держит экран до нового active; записи вкладки уроков отклоняются по поколению (lessons_tab_state: сброс снимка при смене generation и отбрасывание загрузки, начатой при другом generation).

## Technical debt
Остальные пункты §AUTH-0070 (B3, B2, потолок синхронизации, A1–A3) — отдельные задачи в файлах авторизации, не затронуты. Старая вкладка уроков, смонтированная при уходе из active, живёт до нового active (крышка закрыта).

## Verification
Тест active → смена×5 → active(новый) = 2 роста; крышка закрыта всю смену; сбой подписки закрывает; срез типов C:/Temp/claude/run_types_slice.sh.

## Rollback
git revert коммита.

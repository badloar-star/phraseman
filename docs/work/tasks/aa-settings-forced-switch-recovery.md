# Патч для Настроек: «Сменить без сохранения» при сбое после маркера

Governance-ID: TG-68B63F48AABB
Status: Ready to apply (владелец `app/(tabs)/settings.tsx` — Дизайн / кто держит файл)
Owner: подготовила сессия «Авторизация»; применяет владелец файла

## Outcome
Принудительная смена аккаунта («Сменить без сохранения») при отказе `recovery_required` / `wipe_failed` (сбой ПОСЛЕ записи маркера — возможен с 0dfe1c9c9) показывает то же окно, что обычная смена: «Нужно завершить смену аккаунта / перезапусти». Сейчас там «Всё осталось на месте» — неправда.

## Scope
Только `app/(tabs)/settings.tsx`, ветка `forced` (~1725): +23 строки перед общим `if (!forced.ok)`. Тексты — дословная копия окна обычной смены (~1920–1938, 9 языков), новых строк перевода нет. `showGlassAlert`/`L` уже в области видимости (`SettingsMain`, ~183).

## Как применить
```bash
git apply --check docs/work/tasks/aa-settings-forced-switch-recovery.patch
git apply docs/work/tasks/aa-settings-forced-switch-recovery.patch
```
Если файл уже менялся и патч не ложится — вставить блок из патча вручную сразу после `setSwitchAccountStage('idle');` в ветке `forced`, перед `if (!forced.ok) { showInfoAlert(`.

## Verification
`git apply --check` на HEAD 26a14fa8e — OK; пропатченный файл разбирается Babel. После применения: `npm run test:one -- tests/aa_release_floor_auth_ui.test.ts` и `tests/aa_auth_double_tap_contract.test.ts`. Коммитить своими ханками.

## Architecture / Security / Debt
Без изменения архитектуры и данных; только правдивый текст исхода. Долг закрывается этим патчем.

## Rollback
`git revert` коммита с патчем.

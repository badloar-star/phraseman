# Task packet: патч Настроек, пометка конфликтного патча, тексты «Что нового» 2.0

Governance-ID: TG-5F27232BBE36
Status: In progress
Owner: 1 · ЯДРО (поручение координатора 06:50)
Related epic/enabler: OWNER_RELEASE_STEPS.md

## Outcome

1. `aa-settings-forced-switch-recovery.patch`: применён, если `app/(tabs)/settings.tsx` свободен. Если файл занят,
   остаётся патчем с пометкой владельцу. Итог: во время наложения в файле появились чужие правки цветов (другая сессия),
   мои строки сняты `git apply -R`, чужие не тронуты.
2. `codex-notification-modal-tokens.patch`: первая строка — «НЕ НАКЛАДЫВАТЬ», `git apply --check` по-прежнему читает.
3. `docs/phraseman-2.0/STORE_WHATS_NEW.md`: 6–8 строк «Что нового в 2.0»
   - для магазинов и окна `ReleaseNotesV2Modal`;
   - языки: ru / uk / en и остальные языки интерфейса;
   - на «ты», без Шпиля, Learning V2, Арены.

   Окно не показывает недоступного в сторе — под это сторож.

## Scope

In scope:
- `docs/phraseman-2.0/OWNER_RELEASE_STEPS.md`;
- `docs/work/tasks/codex-notification-modal-tokens.patch`;
- `docs/phraseman-2.0/STORE_WHATS_NEW.md`;
- проверка `components/ReleaseNotesV2Modal.tsx` и его данных;
- тест-сторож.

Out of scope:
- код Настроек (занят);
- публикация листингов в магазинах — делает владелец.

## Architecture

Нет: тексты и сторож.

## Security and privacy

Не затрагиваются.

## Technical debt

- Contain: если окно берёт тексты из своего модуля, сторож держит запрет упоминаний недоступного в сторе.

## Verification

Сторож на запрещённые слова в текстах окна; точечные тесты окна.

## Rollback

Откат коммита.

# Task packet: «Восстановить аккаунт?» не ждёт слот арбитра вечно (ревью Ядра 2dba22af6)

Governance-ID: TG-F09EE7270B32
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~03:10)

## Outcome

Тёмное окно «Восстановить аккаунт?» (app/account_delete_restore_prompt.ts, вызов из RegistrationPromptModal.tsx:1255) идёт через
очередь `themed_blocking_alert_queue` → `ThemedBlockingAlertHost` → слот `OverlayArbiter` ('themedAlert'). Арбитр не вытесняет
владельца слота (крупные модалки закрывает человек), и вход ждал молча. Теперь:
- ожидание > 2 с без показа → `[ACCOUNT-RESTORE] waiting_slot {holder, waitedMs, queuePos, hostSeen}`;
- ожидание 8 с → окно показывается поверх (флаг `forceVisible` у элемента очереди, хост рисует его без слота) + лог `slot_timeout_force_visible`;
- «Восстановить» / «Не восстанавливать» / «назад» и исходы не меняются.

## Scope

In scope: опция `slotWait` у `enqueueThemedBlockingChoiceAlert` (по умолчанию выключена — прочие вызовы без изменений), отчёт хоста о
состоянии (`noteThemedBlockingAlertHostState`), учёт `forceVisible` в хосте, вызов в restore prompt, тесты. Out of scope: арбитр,
RegistrationPromptModal, другие окна очереди.

## Architecture

Таймеры живут в модуле очереди рядом с элементом и снимаются при любом закрытии (resolve/clear). Хост сообщает модулю, видно ли окно
и кто держит слот арбитра (то, что он уже логирует). Показ «поверх» — только для элемента, явно попросившего потолок.

## Security and privacy

Только логи: заголовок окна (48 символов), ключ владельца слота, миллисекунды; без uid и данных аккаунта.

## Technical debt

- Contain: показ поверх чужой модалки — два нативных окна сразу; допустимо для действия, начатого человеком (как окно входа + окно
  очереди сейчас); переход present-during-dismiss не возникает (чужое окно не закрывается в этот момент).

## Verification

Тест очереди на фейковых таймерах (лог на 2 с с владельцем, флаг на 8 с, ничего — если окно показано раньше, таймеры снимаются при
закрытии); тест restore prompt (передаёт slotWait 2000/8000, исходы прежние). Ручная проверка на устройстве — в список после сборки.

## Rollback

git revert коммита.

## Result

Сделано: slotWait в очереди (2 с лог waiting_slot с holder, 8 с forceVisible), хост показывает forced-голову и сообщает очереди visible/arbiterActive; restore prompt передаёт ACCOUNT_RESTORE_SLOT_WAIT. Тесты: 7 файлов 109/109 + overlays_runtime 19/19. Ручная проверка на устройстве — после сборки: занять слот чужой модалкой (например сообщение appMessageModal) → вход аккаунтом на удалении → через 2 с лог waiting_slot holder=…, через 8 с окно поверх; «Восстановить»/«назад» как раньше.

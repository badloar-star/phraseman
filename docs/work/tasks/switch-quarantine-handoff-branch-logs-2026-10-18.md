# Task packet: журнал ветки «передача входа» при запуске — каждый исход называет себя (сценарий №9)

Governance-ID: TG-E4DEEF785FBF
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

При запуске после убитого посреди входа процесса журнал показывает: фазу записи передачи, состояние Firebase
(аноним/провайдер, совпадение uid владельца и цели) и выбранный исход — `owner_still_anonymous` (вход не дошёл до
Firebase, человек остаётся гостем), довод вперёд или откат. Сейчас исход «гость, запись снята» проходит молча.

## Scope

- app/account_switch_quarantine.ts: resumeInternal, ветка providerHandoffRaw — строка входа и строка раннего выхода.

## Architecture

Факт (эмулятор 18.10 11:02–11:03): убит через 5 с после выбора — фаза credential_ready, Firebase ещё аноним →
`clearProviderCredentialHandoff` + completed, без единой строки; восстановить ветку удалось только чтением кода. Правило
«сперва логи»: каждый ранний return пишет причину. Значения — фаза, провайдер, isAnonymous, совпадения (yes/no),
без uid.

## Security and privacy

Без идентификаторов: только флаги совпадения.

## Technical debt

Остальные quarantined-исходы resumeInternal пишут причину через publish(reason) — отдельной строки нет; добавляю только
в ветку передачи входа (предмет прогона).

## Verification

Точечные тесты account_switch_quarantine через светофор; эмулятор — строки видны при повторе №9.

## Rollback

`git revert <hash>`.

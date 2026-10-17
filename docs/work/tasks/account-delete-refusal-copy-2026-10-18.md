# Task packet: тексты отказа удаления аккаунта — выровнять 7 языков под ru/en (координатор, разбор Входа 706cab654)

Governance-ID: TG-17539BE94A01
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: `docs/work/tasks/account-gone-elsewhere-2026-10-17.md`

## Outcome

Два окна отказа в `components/DeleteAccountConfirmModal.tsx` говорят на всех 9 языках то же, что ru/en:
- `pending_guard_persist_failed`: «Не удалось подготовить удаление. Аккаунт и данные не изменены. Освободи место на телефоне и попробуй снова.»;
- выход не завершился: «Выход не завершился. Аккаунт под защитой — перезапусти приложение и попробуй снова.»

Всё на «ты», без служебных слов («local», «безопасный выход»).

## Scope

In scope: значения uk / es / pt-BR / vi / id / tr / pl двух строк. ru и en не трогаю.

Out of scope:
- логика удаления;
- окно «удалён на другом устройстве» — снято по правилу владельца 22.09, его не возвращаю.

## Architecture

No architecture change.

## Security and privacy

Не применимо: меняются только тексты, данные не трогаются.

## Technical debt

Нет нового долга: строки остаются в том же объекте, что и раньше.

## Verification

- сторожа i18n;
- тесты `DeleteAccountConfirmModal` через slot.sh.

## Rollback

`git revert`.

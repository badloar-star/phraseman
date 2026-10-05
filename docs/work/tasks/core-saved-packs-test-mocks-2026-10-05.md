# Task packet: saved_packs_completion — моки новых зависимостей (только тест)

Governance-ID: TG-298024AEB01F
Status: In progress (координатор 05.10: «Unmocked accounts_v2_client_flag пришёл с account-authority S6a/S7 (0c2312f19,
8a2105dba); только мок в тесте, без правки кода входа; если не спасает — стоп»)
Owner: сессия 1 · ЯДРО

## Outcome

Тест исполняет продовый TS с подменой только границ устройства; новые импорты сломали его «Unmocked dependency»:
- hooks/use-flashcards.ts → ../app/accounts_v2_client_flag (captureAccountsV2OwnerUid, produceAccountsV2ChangeIfEnabled):
  мок «клиент v2 выключен» — null / ничего не делает (ровно поведение при выключенном флаге);
- communityPackDraftStorage.ts → ../swallow_log: мок noteSwallowed/noteSwallowedAs с той же семантикой fallback;
- localAuthorPacks.ts → ../learning_language_contour (LEARNING_LANGUAGE_TARGETS — реальный список) и
  ../account_scope_key.
Код приложения и авторизации не меняется.

## Scope

tests/saved_packs_completion.test.cjs — моки, настоящие чистые модули (custom_card_access, myPacksDataIntegrity, card_deletion_journal, community_pack_language), ключи локальных наборов по 5 языкам, автор с Plus в проверке разных id (лимит 3 у Free с 30.09).

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Если тест падает уже по смыслу (а не по мокам) — стоп и вопрос координатору, код входа не трогаем.

## Verification

node --test tests/saved_packs_completion.test.cjs — 0 fail.

## Rollback

git revert коммита.

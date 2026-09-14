# Saved Card Set Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в «Сохранённые» премиальный компактный режим выбора карточек, создание пользовательского набора от 10 карточек, редактирование/удаление/публикацию своих наборов и единый переключатель языка наборов English / Français / Deutsch / Español без смешивания каталогов.

**Architecture:** Сохранить `flashcards_collection.tsx` главным оркестратором, вынести язык набора, безопасные source labels и selection rules в чистые модули, а staged ids передавать в существующий `community_pack_create` через локальное staging-хранилище. `packLanguage` будет отдельным доменным полем и не заменит узкий `studyTarget`; legacy-записи без поля нормализуются к English. Публичные изменения останутся за существующим review callable, а удаление опубликованного набора будет soft-unlist через авторизованный callable.

**Tech Stack:** React Native / Expo Router, TypeScript, React Native Reanimated, AsyncStorage, Firebase callable functions, Firestore Rules, Jest / ts-jest.

---

## Phase 1 — Domain contracts and failing tests

### Task 1: Зафиксировать тестовый контракт языка набора

**Files:** `tests/pack_language.test.ts` (new), `app/flashcards/pack_languages.ts` (new).

- [ ] Написать красные unit-тесты для `PackLanguage = 'en' | 'fr' | 'de' | 'es'`, метаданных флага/нативного названия и функций `normalizePackLanguage`, `defaultPackLanguageForStudyTarget`, `packLanguageLabel`.
- [ ] В тестах проверить: missing/unknown/старое `studyTarget: 'en'` дают `en`; `fr`, `de`, `es` сохраняются как отдельные языки; текущий target становится default только если он поддержан; duplicate/invalid input не проходит.
- [ ] Запустить только тест: `bash .claude/semaphore/slot.sh acquire "jest pack language red"; npx jest --runTestsByPath tests/pack_language.test.ts --no-cache --runInBand; bash .claude/semaphore/slot.sh release` и убедиться, что он падает из-за отсутствующего модуля.
- [ ] Реализовать модуль с `PACK_LANGUAGES`, флагом/названием/short label, legacy-нормализацией и безопасным fallback `en`.
- [ ] Повторить тот же узкий тест; ожидаемый результат — все assertions PASS.

### Task 2: Зафиксировать source-label и selection rules

**Files:** `tests/saved_card_set_builder_domain.test.ts` (new), `app/flashcards/source_labels.ts` (new), `app/flashcards/saved_card_selection.ts` (new).

- [ ] Написать красные тесты для source mapper: `lesson + 12 → Источник: Урок 12`, `video → Источник: Видео · <title>`, `daily_phrase`, `community`, неизвестный source; отдельно проверить, что raw `sourceId` и `DEV:*` никогда не возвращаются в UI-текст.
- [ ] Написать красные тесты для selection: toggle idempotent, duplicate id не удваивается, `canCreate` false для 0–9 и 51+, true для 10–50, `remainingToMinimum`, очистка при смене языка, staging возвращает только стабильные ids.
- [ ] Запустить `tests/saved_card_set_builder_domain.test.ts` через semaphore и зафиксировать ожидаемый RED.
- [ ] Реализовать чистые функции без React/Firestore: локализованный `buildSourceLabel`, `toggleSelectedCardId`, `selectionCount`, `canCreatePackFromSelection`, `selectionLimitHint`, `clearSelectionForLanguageChange`, `stageSelectedCardIds`.
- [ ] Повторить узкий тест; ожидаемый результат — PASS.

### Task 3: Добавить тесты обратной совместимости модели карточки

**Files:** `tests/flashcard_pack_language_adapter.test.ts` (new), `app/flashcards/types.ts`, `app/community_packs/schema.ts`, `app/flashcards/marketplace.ts`.

- [ ] Написать красные тесты нормализатора карточки/набора: новый `targetText`/`translationText` сохраняется нейтрально; legacy `en` мапится в target; legacy pack без `packLanguage` виден как English; French/German/Spanish target не записывается только в поле с семантикой `en`.
- [ ] Написать тесты для `FlashcardMarketPack` и `CommunityPackSubmissionPayload`: новые записи требуют `packLanguage`, legacy чтение допускает отсутствие поля, unsupported language отклоняется.
- [ ] Реализовать типы `PackCardText`/adapter и добавить `packLanguage` в клиентскую схему, сохранив старые поля и `studyTarget` для совместимости.
- [ ] Проверить узко: `npx jest --runTestsByPath tests/flashcard_pack_language_adapter.test.ts tests/community_flashcard_rich_runtime.test.ts --no-cache --runInBand` под semaphore; ожидаемый результат — PASS.

## Phase 2 — Shared language surface and Saved selection UX

### Task 4: Сделать единый language picker с флагом

**Files:** `app/flashcards/PackLanguagePicker.tsx` (new), `app/flashcards/pack_languages.ts`, `app/flashcards_packs.tsx`, `app/flashcards/FlashcardsCategoryHub.tsx`, `app/flashcards_my_packs.tsx`, `tests/pack_language_picker_contract.test.ts` (new).

- [ ] Сначала добавить failing contract tests на четыре пункта picker, флаг + short code, доступный label, сохранение выбранного языка и пустое состояние без fallback на другой язык.
- [ ] Реализовать переиспользуемый compact header button и anchored/modal picker в текущих theme tokens: graphite/olive base, champagne-gold selected state, 44×44 touch target, `reduceMotion` без transform.
- [ ] Использовать существующие `assets/images/language_flags/language_en.webp`, `language_fr_dev.webp`, `language_es_dev.webp` и добавить German flag asset только вместе со статическим `require()` в picker; не оставлять несвязанные картинки в `assets/images/**`.
- [ ] Хранить preference в отдельном ключе `fc_pack_language_v1`; не переиспользовать `studyTarget`-ключи и не менять глобальный язык интерфейса.
- [ ] Подключить picker к каталогу, хабу и «Моим наборам»; default — текущий supported study target, иначе English. Повторить picker contract test.

### Task 5: Добавить язык в фильтрацию каталогов

**Files:** `app/community_packs/communityCatalogFilter.ts`, `app/flashcards/marketplace.ts`, `app/flashcards_packs.tsx`, `app/flashcards_my_packs.tsx`, `app/flashcards/FlashcardsCategoryHub.tsx`, `tests/community_pack_language_filter.test.ts` (new).

- [ ] Написать failing tests на `filterPacksByLanguage`: foreign packs excluded, legacy packs treated as English, search/sort remain unchanged, empty selected-language result stays empty.
- [ ] Реализовать один чистый filter function и применить его после cloud/local merge, до render; не делать четыре разных фильтра в экранах.
- [ ] Обновить Firestore mapping `communityFirestore.ts` и local mapping `localAuthorPacks.ts`, чтобы `packLanguage` проходил round-trip, а отсутствующее поле нормализовалось к English.
- [ ] Прогнать `tests/community_pack_language_filter.test.ts tests/community_pack_catalog_owner_fixes.test.ts`; ожидаемый результат — PASS.

### Task 6: Перестроить шапку «Сохранённых» и меню

**Files:** `app/flashcards/CollectionHeader.tsx`, `app/flashcards_collection.tsx`, `app/flashcards/FlashcardsFilterDropdown.tsx` (read/use only unless saved-specific branch is required), `tests/saved_collection_header_actions.test.ts` (new), `tests/flashcards_collection_header_compact_icons_contract.mjs`.

- [ ] Добавить failing interaction/contract tests: в saved header есть language flag и `⋯`; старый source-filter не показывается; menu содержит текстовые пункты `Вид`, `Отметить`, `Удалить выбранные`; `Вид` переключает существующий list/deck preference.
- [ ] Передать из collection orchestrator menu state, language state и action callbacks; другие категории не лишать существующей фильтрации.
- [ ] Реализовать anchored menu с opacity/translateY/scale 180–220 ms, `accessibilityRole="menu"`, понятными labels и disabled delete state без вызова действия.
- [ ] Убрать отдельную view icon button только из saved header; existing `fc_collection_view_v1` storage и обычный list/deck behavior сохранить.
- [ ] Прогнать header contract tests и existing `fc_collection_ready_snapshot_contract.test.ts`; ожидаемый результат — PASS.

### Task 7: Реализовать compact selection mode

**Files:** `app/flashcards_collection.tsx`, `app/flashcards/CollectionHeader.tsx`, `app/flashcards/CollectionListView.tsx`, `app/flashcards/FlashcardListItem.tsx`, `tests/saved_collection_selection_ui.test.ts` (new).

- [ ] Написать failing component/contract tests: `Отметить` forces list mode, header changes to `Выбрать карточки`, cards become compact, tap on row and checkbox are equivalent, count includes cards hidden by search, flip/details/speak/swipe are disabled, create CTA disabled below 10.
- [ ] Add explicit `selectionMode`, `selectedIds`, `toggleSelection`, `exitSelectionMode`, `selectedCount`, `canCreate` props; keep ordinary `FlashcardListItem` path untouched when selection is false.
- [ ] Add a separate compact renderer/variant with fixed reserved row height, target phrase, translation, safe source label and 44 pt checkbox target. Do not animate row height during selection; animate only marker opacity/scale 160–220 ms.
- [ ] Add premium selection states: graphite unselected, dark-gold selected surface/border, dark foreground on any lime/correct CTA; avoid visual noise and preserve readable text size.
- [ ] Add bottom action bar above tab bar with disabled `Создать набор`, reason `Выбери ещё N карточек`, enabled 10–50, and destructive `Удалить выбранные`; selection mode never persists across screen reload.
- [ ] Run the focused Jest test and the existing collection search tests under semaphore; expected PASS.

### Task 8: Batch-delete selected saved cards with one confirmation

**Files:** `app/flashcards_collection.tsx`, `app/flashcards/saved_card_selection.ts`, existing deletion module used by `useCollectionDeletion`, `tests/saved_collection_batch_delete.test.ts` (new).

- [ ] Write failing tests for one confirmation message, cancel preserving all cards, confirm calling the existing optimistic deletion pipeline once for the batch, selection cleanup, undo snackbar, and no mutation to lesson/video source data.
- [ ] Add batch adapter around the existing deletion pipeline rather than a visible sequence of per-card confirmations; lock repeated taps until completion.
- [ ] Use themed alert copy `Удалить N карточек?` with `Отмена` / `Удалить`; keep offset safe and preserve the existing single-card swipe/undo flow.
- [ ] Run the batch-delete test plus current saved-card deletion tests under semaphore; expected PASS.

## Phase 3 — Staged editor, own-pack management, and cloud contract

### Task 9: Stage selected card ids and hydrate the existing editor

**Files:** `app/community_packs/staging.ts`, `app/flashcards_collection.tsx`, `app/community_pack_create.tsx`, `app/community_packs/localAuthorPacks.ts`, `tests/community_pack_selection_editor.test.ts` (new).

- [ ] Write failing tests proving create navigation carries a staging key/ids only, not a large URL payload; editor hydrates exactly selected cards in stable order and displays source labels.
- [ ] Extend existing staging with versioned, target-isolated selected-id records and cleanup on successful save/cancel/expiry; do not put card text in route params.
- [ ] Add editor entry mode for `fresh=1`/staging key, prefill title blank, selected language, cards, and default cover; preserve existing direct edit route by `packId`.
- [ ] Add compact card rows in editor with swipe/remove, and recalculate minimum validation after removal. At 9 cards, block save/publish with exact missing count.
- [ ] Run the focused editor tests plus existing `community_pack_staging.test.ts` and `flashcard_editor_empty_inputs.test.ts`; expected PASS.

### Task 10: Complete editor fields and local save/public toggle

**Files:** `app/community_pack_create.tsx`, `app/community_packs/schema.ts`, `app/community_packs/localAuthorPacks.ts`, `app/community_packs/publishLocalPack.ts`, `tests/community_pack_editor_publish_toggle.test.ts` (new).

- [ ] Write failing tests for title/card minimum, language flag, cover selection, collapsed description, private local save, public toggle changing CTA, and publish calling existing review path only on explicit submit.
- [ ] Implement `packLanguage` state separate from `studyTarget`; keep a stable target/translation adapter for legacy cards; normalize source label at render time.
- [ ] Keep private save local-first and immediate; publish uses `callCommunitySubmitPackForReview` / existing update path, with pending/error state retaining the local result.
- [ ] Preserve existing card-back presets and moderation semantics; do not add direct Firestore writes from the editor.
- [ ] Run the new test plus `community_pack_card_backs.test.ts`, `community_pack_edit_keeps_listing_contract.test.ts`, and `community_pack_add_free.test.ts` under semaphore; expected PASS.

### Task 11: Add own-pack edit/delete actions

**Files:** `app/flashcards_my_packs.tsx`, `app/community_packs/localAuthorPacks.ts`, `app/community_packs/communityFirestore.ts`, `app/community_packs/functionsClient.ts`, `functions/src/community_packs.ts`, `functions/src/index.ts`, `tests/community_pack_author_delete.test.ts` (new), `functions/src/community_packs_author_delete.test.ts` (new).

- [ ] Write failing client/server tests: own local pack can be removed locally; own published pack exposes edit/delete; foreign pack has neither; update keeps existing review/listing contract; repeated delete is idempotent.
- [ ] Add `communityAuthorRemovePack` callable that authenticates the canonical author, rejects foreign ids, records a soft/unlisted author deletion state, preserves already delivered cards and moderation/audit history, and returns an idempotent result.
- [ ] Export the callable, add typed client wrapper with in-flight guard, and map deletion status out of catalog while keeping owned metadata understandable.
- [ ] Add confirmation modal in «Мои наборы» and editor overflow; local delete removes local record, published delete invokes callable, and UI refreshes the current language only.
- [ ] Run client and functions-focused tests. Because this changes an authenticated/destructive server path, run a Sol-high read-only security review of authorization, idempotency, and preservation semantics before implementation is declared complete; do not bypass failing guards.

### Task 12: Extend community payload and server validation for four pack languages

**Files:** `app/community_packs/schema.ts`, `app/community_packs/communityFirestore.ts`, `app/community_packs/localAuthorPacks.ts`, `app/community_packs/publishLocalPack.ts`, `app/community_packs/functionsClient.ts`, `functions/src/community_packs.ts`, `functions/src/community_packs.test.ts` or focused new function test, `firestore.rules`, `firestore.indexes.json` only if a new query requires it.

- [ ] Add failing contract tests for accepted `en/fr/de/es`, rejection of unsupported `packLanguage`, legacy default to English, field-level target/translation normalization, and published catalog round-trip.
- [ ] Update callable request normalization and submission snapshots to carry `packLanguage`; remove the current hard-coded non-English rejection only for the new pack-language contract, while leaving unrelated `studyTarget` gates intact.
- [ ] Preserve `en`/`ru`/`uk`/`es` legacy fields for old cards and write neutral `targetText`/`translationText` for new records; never silently reinterpret an English legacy field as a German/French/Spanish target.
- [ ] Add/adjust catalog query constraints only when needed; otherwise filter in the shared client function to avoid a new index. If schema fields or subcollections change, update `firestore.rules` in the same task and add a focused rules contract.
- [ ] Run focused client and functions tests under their respective semaphore slots; expected PASS.

### Task 13: Complete source labels on ordinary and compact cards

**Files:** `app/flashcards/source_labels.ts`, `app/flashcards/FlashcardListItem.tsx`, `app/flashcards/CollectionListView.tsx`, `app/community_packs/communityFirestore.ts`, `tests/flashcard_source_label_contract.test.ts` (new), existing `tests/fc_collection_search.test.ts`.

- [ ] Write failing test that rendered label contains the human source name and never concatenates `sourceId`.
- [ ] Route all list and compact card source badges through the mapper; add lesson/video metadata lookup where already available and stable fallbacks for missing metadata.
- [ ] Keep source badge present in ordinary saved cards, editor cards, «Мои наборы» card view, and community pack cards; preserve existing delete/edit/voice behavior outside selection mode.
- [ ] Run the focused source tests and existing collection tests; expected PASS.

## Phase 4 — Verification and handoff

### Task 14: Run focused regression matrix and inspect the live screen

**Files:** no new source files; use the existing in-app browser at `http://localhost:64952/`.

- [ ] Run the complete focused matrix with semaphore slots, writing verbose logs to `.codex-tmp/saved-card-set-builder/` rather than the conversation: language, selection, source labels, editor, community schema, existing saved/collection/community tests, and functions community tests.
- [ ] Run `npm run lint -- --no-cache` only if the focused source/tests pass and a semaphore slot is available; release the slot even on failure.
- [ ] Perform manual smoke flow in the visible browser: Saved → `⋯` → `Вид` → `Отметить` → compact cards → select 9/10 → create editor → remove one → save private → language picker → empty language state → edit/delete own pack → community catalog flag filtering.
- [ ] Verify accessibility labels/roles, 44×44 targets, reduce-motion behavior, no white text on bright green surfaces, no source ids in UI, and no large route payload.
- [ ] Run `git diff --check` and `git status --short`; preserve all unrelated dirty/staged worktree changes.
- [ ] Before claiming completion, use `verification-before-completion` and report exact commands/results. Do not run `git commit --no-verify`; the current Learning V2 release hook is an independent blocker that must remain visible if still failing.

## Notes on repository contracts

- No branch, worktree, delegated coding task, or background worker is created by this plan; implementation is a single-writer inline change unless the owner explicitly requests another execution mode.
- `admin/v2/legacy.html` is not part of this feature. The Jarvis scan currently finds no `community_packs`/`community_pack_submissions` Firestore fetcher or data-contract entry beyond the existing purchase business label; re-run the scan if a new collection/department is introduced, and update the reader/contract in the same change if that happens.
- Firestore Rules currently deny direct client create/delete/update of `community_packs`; keep that boundary. Author deletion and public updates must use authenticated callable functions and existing moderation/audit paths.

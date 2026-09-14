# Видео и фразы из видео

Статус: план до реализации
Дата: 2026-09-11

## 1. Решение владельца

К каждому опубликованному видео YouTube можно прикрепить набор фраз из авторского документа. Администратор загружает DOCX/PDF, AI извлекает черновик, администратор проверяет и публикует результат.

Пользователь открывает видео и видит строку «Фразы из видео». Нажатие открывает список. Каждая строка нажимаема целиком и открывает подробности. Рядом с каждой строкой находится существующая bookmark-иконка сохранения. Нажатие сохраняет фразу сразу, без кнопки «Сохранить выбранное».

В запись фразы входят только:

- `phrase` — оригинальная фраза;
- `translation` — перевод;
- `explanation` — одно объяснение.

Поле «пример», тип конструкции, схема, задания, грамматическая справка и отдельная кнопка тренировки в пользовательский контур не входят.

## 2. Аудит текущего проекта

### Уже пригодно для переиспользования

- `app/lingman_videos.tsx` уже загружает опубликованный YouTube-каталог, открывает единственный активный inline-плеер и показывает карточки видео.
- `components/youtube/YoutubeVideoCard.tsx` задаёт текущую широкую композицию видео, радиус 20 и существующий визуальный язык.
- `components/youtube/YoutubeInlinePlayer.tsx` отвечает за плеер, его loading/error/retry и освобождение WebView.
- `components/youtube/YoutubeChannelHeader.tsx` и `YoutubeChannelTabs.tsx` задают текущую навигацию и 44–48 dp touch-targets.
- `components/SaveToCardsButton.tsx` уже реализует нужную механику: `bookmark-outline`/`bookmark`, 48×48, optimistic отклик, haptic, disabled/saved state, accessible label и отсутствие обводки.
- `app/flashcards_collection.tsx`, `app/flashcards/FlashcardListItem.tsx` и `app/flashcards/CollectionDeckView.tsx` являются нормативным контуром просмотра и тренировки карточек.
- `app/flashcards/types.ts` уже имеет `CardItem`, source/sourceId и поля объяснений; сохранение должно использовать существующий путь, а не отдельную коллекцию пользовательских карточек.
- `docs/superpowers/specs/2026-08-26-learning-v2-card-pocket-and-lesson-dictionary-design.md` фиксирует владельческий принцип: сохранение — bookmark toggle, без отдельной тренировки внутри browse-поверхности.
- `admin/v2/legacy.html` — единственная рабочая админская поверхность. В ней уже есть YouTube-каталог, refresh/publish callables, command IDs, idempotency keys, preview и audit-паттерны.

### Ограничения и риски

- Админская реализация должна попасть в `admin/v2/legacy.html`, а не в замороженные копии `admin/legacy.html`, `admin/index.html` или исторические страницы.
- AI-результат нельзя показывать пользователю до явного approve/publish.
- Связь с видео должна использовать стабильный `videoId`, а не заголовок или позицию в списке.
- Сохранение должно быть идемпотентным: повторный тап не создаёт вторую карточку.
- Новая Firestore-коллекция/поле потребует одновременного обновления Rules и Jarvis data-contract audit.
- Для обычного сохранения карточки нельзя вводить серверный баланс, дебит или подтверждение сети; это обычная client-authoritative операция.
- Нельзя включать App Check на админских функциях без отдельного прямого распоряжения владельца.

## 3. Целевая архитектура

### 3.1 Домены

`YoutubeCatalog` остаётся источником видео и метаданных. Новый bounded контур `VideoPhrases` хранит авторский материал и публикует версию, привязанную к `videoId`. `Flashcards` остаётся единственным владельцем личного сохранения и тренировки.

Поток данных:

```text
DOCX/PDF
  -> admin upload
  -> admin-only parse callable
  -> validated draft version
  -> admin review/edit
  -> explicit publish
  -> public published snapshot by videoId
  -> app read-only list
  -> existing SaveToCardsButton
  -> existing CardItem / saved collection
```

### 3.2 Каноническая модель

Предлагаемая схема требует отдельного contract review перед кодированием:

```ts
type VideoPhrase = Readonly<{
  id: string;                 // stable: `${videoId}:${ordinal}` or generated immutable id
  ordinal: number;
  phrase: string;
  translation: string;
  explanation: string;
}>;

type VideoPhraseVersion = Readonly<{
  schemaVersion: 1;
  versionId: string;
  videoId: string;
  channelId: string;
  status: 'draft' | 'published' | 'archived';
  sourceFileName?: string;
  sourceFileHash?: string;
  phrases: readonly VideoPhrase[];
  phraseCount: number;
  createdAtMs: number;
  createdBy: string;
  publishedAtMs?: number;
  publishedBy?: string;
}>;
```

Storage recommendation:

- metadata document keyed by `videoId` with `activeVersionId` and publication status;
- immutable version snapshot containing the bounded phrase array;
- draft versions are never read by the app;
- publish atomically advances the active version;
- previous published version remains available for rollback.

The final collection names and document paths must be selected in the contract-review task. A single canonical published snapshot is preferred for the first release because a 200-phrase document is comfortably below Firestore's document limit when each entry is bounded and contains only three text fields. If measured content size approaches the limit, split the published snapshot into ordered pages before implementation rather than silently truncating.

### 3.3 Flashcard mapping

On save, map the published phrase into the existing `CardItem` shape:

- target-language phrase -> existing `en`-compatible target field used by the German content path;
- translation -> current learner-locale back field, with existing fallback rules;
- explanation -> existing explanation field used by card details;
- `source: 'video'`;
- stable `sourceId: videoId + ':' + phraseId`;
- no example fields populated;
- save/remove goes through the existing flashcard storage and sync path.

The exact target-language field mapping must be confirmed against the current German flashcard content contract before implementation. It must not create a second save writer.

## 4. UX scope

### 4.1 App screens

1. Existing video catalog: unchanged except the published-video entry point.
2. Existing video with inline player: below the player, show one wide tonal row titled `Фразы из видео`; no secondary “open” copy and no “Смотреть” CTA.
3. Phrase list: wide full-width rows, no decorative outer borders; each row contains phrase, translation and bookmark icon.
4. Phrase details: tap anywhere on a row opens a native bottom sheet using the existing sheet conventions; show only phrase, translation and explanation.
5. Saved receipt: bookmark fills immediately and existing toast/feedback confirms saving.
6. Existing Cards section: saved item appears in the normal saved collection and uses the existing `FlashcardListItem`/deck flow. No training action is added to the video screen.

### 4.2 Required app states

- no published phrase set: entry point is absent;
- published set loading: skeleton rows, stable reserved space;
- loaded list;
- details sheet loading/ready/error;
- unsaved/saved bookmark;
- save failure: restore previous state and show existing non-blocking feedback;
- offline with cached published snapshot, if the existing catalog cache policy supports it;
- empty published set: treated as a content/admin error, never as an invitation to train;
- duplicate save/remove: idempotent and visually stable;
- changed locale: phrase identity stays stable and translation uses the existing fallback contract.

## 5. Admin scope

The feature lives inside the existing `YouTube-каталог` workspace in `admin/v2/legacy.html`, with a selected-video phrase panel. It does not become a new top-level admin surface.

Admin workflow:

1. Select a video by stable `videoId`.
2. See current status: no phrases, draft, published, or published with newer draft.
3. Upload DOCX/PDF.
4. Parse with AI into a draft containing only phrase/translation/explanation.
5. Review the count and validation warnings.
6. Edit individual rows or remove a bad row from the draft.
7. Save draft.
8. Open learner preview for the selected video.
9. Publish with explicit confirmation showing video title, phrase count, version and rollback target.
10. View audit and rollback to the previous published version.

Admin states:

- no document;
- upload in progress;
- parse in progress;
- parse completed;
- partial/invalid extraction;
- draft with unsaved edits;
- publish blocked by validation errors;
- published;
- publish failed with draft retained;
- video missing or changed;
- rollback available.

Admin quality rules:

- light, simple operational surface following `docs/design/ADMIN_UI_BIBLE.md`;
- one primary action per state;
- no raw technical keys as main labels;
- clear tooltips and accessible labels;
- preview before publish;
- every mutation carries requestId/idempotencyKey and audit metadata;
- no App Check enforcement changes;
- no changes to frozen admin files.

## 6. Epics

### Epic 0 — Contract and audit foundation

Goal: freeze the boundaries before implementation.

User stories:

- As the owner, I want the phrase schema to contain only three fields so AI cannot silently add unwanted document content.
- As the maintainer, I want the video binding to use stable video IDs so title changes do not detach content.

Tasks/subtasks:

- confirm current German `CardItem` target/translation mapping;
- choose final Firestore paths and document-size strategy;
- define public/admin read and write boundaries;
- add contract fixture with phrase, translation, explanation and forbidden example field;
- define version, publish, rollback and idempotency contracts;
- update Jarvis impact checklist and Firestore Rules plan.

Acceptance: contract fixture and data-flow diagram are approved before UI implementation.

### Epic 1 — Video phrase content backend

Goal: store, validate and publish versioned phrase sets.

Enablers:

- `VideoPhraseVersion` validator;
- stable `videoId` lookup;
- bounded text/count validation;
- immutable version snapshot;
- atomic active-version pointer;
- rollback read path.

Tasks/subtasks:

- implement pure parser-independent schema validator;
- implement draft create/update/read;
- implement publish with expected revision and idempotency;
- implement rollback to prior ready version;
- add Rules for admin draft/version writes and public published reads;
- update Jarvis fetcher/contract if the new collection is read by Jarvis;
- add audit event fields and retention policy.

Acceptance: a published version is readable by videoId; draft is never public; repeat publish request returns the same receipt.

### Epic 2 — AI document import

Goal: turn the owner's document into a reviewable draft without publishing automatically.

User stories:

- As an admin, I want to upload my DOCX/PDF and receive a structured draft.
- As an admin, I want warnings for missing or ambiguous phrases instead of silently losing rows.

Tasks/subtasks:

- define document extraction input limits and supported MIME types;
- extract text/tables from DOCX/PDF;
- call the production AI parser only through an admin-authorized backend path;
- constrain output to `phrase`, `translation`, `explanation`;
- reject/strip `example`, schema, exercises and unrelated sections;
- validate ordinal, required text, max lengths and duplicate phrases;
- return per-row warnings and a parse summary;
- retain original file metadata/hash, not arbitrary private file contents in public documents;
- add retry behavior that preserves the existing draft.

Acceptance: the supplied 200-phrase document produces a draft with only the three approved fields; parser errors are visible and retryable.

### Epic 3 — Admin video phrase studio

Goal: manage phrase content per video in the single live admin surface.

User stories:

- As an admin, I want to select a video and see whether phrases are attached.
- As an admin, I want to inspect/edit each extracted phrase before publishing.
- As an admin, I want a learner preview and a reversible publish action.

Tasks/subtasks:

- add selected-video phrase workspace to `admin/v2/legacy.html`;
- add document upload state and parse progress;
- add review list with phrase/translation/explanation columns;
- add row edit and validation feedback;
- add draft save with dirty-state protection;
- add learner preview matching app wording and no-example rule;
- add publish summary, confirmation and rollback link;
- wire existing admin command/audit/idempotency patterns;
- add loading/empty/error/permission-denied states;
- run admin single-surface, route/action and language contract tests.

Acceptance: an admin can complete the whole workflow for one selected video without touching a second admin file.

### Epic 4 — App browse surface

Goal: let users browse phrases naturally from an existing video.

User stories:

- As a learner, I want to open `Фразы из видео` from a video without extra explanatory buttons.
- As a learner, I want to tap a phrase row and read its explanation.
- As a learner, I want missing phrase content to leave the existing video experience intact.

Tasks/subtasks:

- add read-only published phrase client contract keyed by videoId;
- add published-set cache/revalidation consistent with current catalog policy;
- add the single wide entry row below the player;
- add phrase list screen/sheet with borderless tonal rows;
- add phrase details sheet with only three fields;
- add loading/empty/error/retry states;
- preserve video player lifecycle and back navigation;
- add all learner locale copy and accessibility labels.

Acceptance: no published set means no new row; published set never blocks or replaces the YouTube player.

### Epic 5 — Immediate bookmark save and Cards integration

Goal: save video phrases through the existing card system and display them as ordinary saved cards.

User stories:

- As a learner, I want to save one phrase with the bookmark beside that phrase.
- As a learner, I want the saved phrase to appear in the existing `Сохранённые` cards collection.
- As a learner, I do not want video browsing to launch training.

Tasks/subtasks:

- reuse `SaveToCardsButton` rather than create another save button;
- map stable video phrase identity into existing `CardItem` source/sourceId;
- make save/remove optimistic and idempotent through the existing storage path;
- show saved state consistently in list and details sheet;
- ensure the normal flashcard front/back/flip path reads the three approved fields;
- keep example fields empty and do not add a video-specific training CTA;
- add dedupe, offline and failed-save tests.

Acceptance: save on one phrase is immediate, repeat save does not duplicate, and the same card appears in normal saved-card browsing/training.

### Epic 6 — Verification, rollout and operations

Goal: ship safely and keep the feature maintainable.

Tasks/subtasks:

- add focused unit, contract, component and navigation tests;
- add admin preview tests and published-read tests;
- add screenshot/state checklist for phone widths and admin desktop/tablet widths;
- run feature off/on smoke paths;
- canary with one video and a small internal audience;
- measure phrase-list opens, detail opens, save success/failure and publish errors without storing phrase text in analytics;
- document rollback procedure;
- enable production only after owner review.

Acceptance: deterministic gates pass, owner can verify one real video end-to-end, and rollback is proven in staging/canary.

## 7. Enablement and rollout

Feature controls:

- `video_phrases_enabled`: learner read path, default off;
- `video_phrases_admin_enabled`: admin authoring path, default on for owner/admin only;
- optional allowlist of video IDs for canary;
- server-side published data remains harmless while learner flag is off.

Rollout:

1. Develop with local fixture and no production AI call from Codex.
2. Deploy backend/admin behind admin-only access.
3. Import and review one real video.
4. Publish to staging/canary video ID.
5. Verify app browse, detail, save, Cards collection and rollback.
6. Enable learner flag for internal users.
7. Expand to all users after error/save metrics are healthy.

The learner flag must fail closed: if disabled or if the published read contract is invalid, the existing video surface remains unchanged.

## 8. Technical debt management

### Debt to prevent now

- No parser-specific fields in the public phrase schema.
- No second card-save writer.
- No title-based video binding.
- No draft data mixed with public data.
- No new generic admin page outside the single live surface.
- No AI prompt or model response treated as trusted without schema validation.
- No analytics event containing full phrase/explanation text.

### Debt register

Maintain a small register in the plan/implementation issue with: debt ID, affected contract, reason, owner, risk, expiry/review date, and removal condition. Every future shortcut must create a register entry before merge.

Initial entries:

- `VP-001`: confirm exact German CardItem field mapping before implementation;
- `VP-002`: measure published snapshot size with the real 200-phrase document;
- `VP-003`: decide whether public phrase snapshots need paging after size measurement;
- `VP-004`: determine whether Jarvis needs a reader or only a contract exclusion;
- `VP-005`: remove temporary canary allowlist after general rollout.

### Maintenance rules

- Keep pure validation and mapping functions separate from React and callable handlers.
- Keep admin orchestration behind named command contracts; do not add inline Firestore writes to unrelated handlers.
- Every epic ends with focused tests and a short debt-register review.
- Do not refactor the whole legacy admin during this feature; isolate the new workspace and record structural debt separately.
- Prefer one versioned contract change per commit/PR so rollback and review stay legible.
- Add a contract test whenever a field, collection, route, source ID or save behavior changes.
- Archive old phrase versions only through the version lifecycle; never overwrite the only published copy.

## 9. Scope boundaries

In scope:

- document upload and AI draft extraction;
- admin review/edit/preview/publish/rollback;
- per-video published phrase set;
- app browse list and detail explanation;
- immediate bookmark save;
- existing Saved Cards integration;
- loading/empty/error/accessibility states;
- audit, idempotency, Rules and Jarvis review.

Out of scope:

- example phrases;
- grammar schemes, exercises or answer checking;
- a new training mode;
- automatic training launch from video;
- replacing the YouTube catalog;
- generating or transcribing video content with a Codex API key;
- mass editing unrelated admin surfaces;
- changing the existing flashcard training algorithm;
- publishing AI output without human approval.

## 10. Definition of Done

- Owner can select one video in the live admin surface, upload the supplied document, inspect the three fields, correct a row, preview and publish.
- Published content is visible only for its exact videoId.
- App shows only `Фразы из видео` and no unnecessary “open/watch/train” CTA in this flow.
- Every phrase row has the existing bookmark save control.
- Save is immediate, idempotent and uses the existing Cards state.
- Saved phrase appears in the normal `Сохранённые` collection and standard training flow.
- No example field is parsed, stored in the public schema or rendered.
- Draft, published, failed, empty and rollback states are tested.
- Firestore Rules, Jarvis contract audit, admin single-surface contract and focused app tests pass.
- Feature can be disabled without changing the existing video experience.
- Technical debt register is updated and every temporary rollout mechanism has an owner and removal condition.

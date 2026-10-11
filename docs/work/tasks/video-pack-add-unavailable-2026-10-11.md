# Task packet: «+» у наборов из видео → «Не удалось добавить набор · Проверь связь»

Governance-ID: TG-281478566436
Status: In progress
Owner: сессия «Авторизация» (координатор, баг владельца на эмуляторе)

## Outcome
Тап «+» у набора в «Видео → Наборы» (наборы фраз роликов Professor Lingman) добавляет набор себе. Отказ (если набор правда нельзя добавить) — честным текстом, без «Проверь связь».

## Факт (журнал эмулятора, до правки)
`[PACK-SOCIAL] добавление отклонено pack=video:cnrVN_uz7Sg причина=unavailable`.
- Строка `app/flashcards/VideoPackRow.tsx` (76d2c820a) рисует `CommunityPackSocialBar` («+») для наборов из `app/video_phrase_set_packs.ts`: id `video:<videoId>`, `isOfficial: true`, БЕЗ `isCommunityUgc`.
- `addCommunityPackToLibrary` (`app/community_packs/communityPackActions.ts:39`) молча возвращает `unavailable` на `!pack.isCommunityUgc` → откат + тост «Проверь связь» (а сети в этом пути нет вовсе — добавление локальное).
- Сервер (решение владельца 23.09, `functions/src/video_phrases.ts:64,194–235`): набор ролика — обычный документ `community_packs/video_<videoId>`, создаётся при публикации фраз; «Добавить себе» должно работать через него.

## Scope
`app/community_packs/communityPackActions.ts` (сопоставление `video:<id>` → `video_<id>`, логи `[PACK-ADD]` на каждом выходе), `app/community_packs/CommunityPackSocialBar.tsx` (честный текст отказа), тест. НЕ трогать `VideoPackRow.tsx` (правит Дизайн).

## Architecture
Без новой архитектуры: набор фраз ролика при добавлении подменяется на соответствующий документ сообщества (тот же путь владения, счётчик добавлений, лайки). Префикс `video_` — копия серверной `videoPackId`, тест сверяет с исходником сервера.

## Security and privacy
Нет новых данных; логи без uid (только id набора и причина).

## Technical debt
- Pay now: немые ранние выходы в `addCommunityPackToLibrary`, ложный текст «Проверь связь».
- Accept temporarily (владелец — Ядро): префикс `video_` продублирован клиентом; вынести в `shared/` — при следующей правке Ядра.

## Verification
Новый тест: `video:<id>` → добавлен как `video_<id>`, владение записано; не-UGC без сопоставления → `unavailable` с логом причины; текст отказа без «связь». Соседние: тесты community_pack_actions / social bar (по одному, со слотом). Живая проверка — владелец/Сверка на эмуляторе: лог `[PACK-ADD]`.

## Rollback
`git revert`.
Governance-ID: TG-75D62EE54824 — правка communityPackActions/CommunityPackSocialBar.
Governance-ID: TG-C325443D1813 — APPROVE ревью; коммит. Замечания A–D ревью (owned у строки видео, тост при отсутствии документа, «Проверь связь» в быстром «+» каталога, try/catch в соцбаре) — отдельно.

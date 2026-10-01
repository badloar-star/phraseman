# PM-239: разбор ветки codex/all-development-integration (2026-10-01)

Решение Q56 (координатор): выпуск из feature/referral-roulette (D30), интеграционную ветку НЕ сливаем; нужное — точечный cherry-pick после утверждения списка, остальное — архив (git bundle, Q59).

## Метод (только чтение)
- Общий предок: 7cf1d69d5 (2026-07-12). Коммитов только в той ветке: 329 (311 без слияний); почти все — 10–14 июля 2026.
- `git cherry HEAD codex/all-development-integration`: 35 уже есть у нас тем же патчем, 276 уникальных.
- Для каждого из 276: `git apply --check -R` (уже применён), `git apply --check` (применим чисто), наличие файлов в HEAD. Скрипт: scratchpad triage239.cjs, ниже — полная таблица.

## Итог по 276
| Состояние | Кол-во | Рекомендация |
|---|---:|---|
| already_in_head (изменение уже есть) | 5 | ничего |
| files_gone (файлов в HEAD нет — удалённые зоны: белая админка V2, старые модули) | 75 | архив |
| applies_cleanly (новые файлы/доки, которых у нас нет) | 33 | архив, кроме кандидатов ниже |
| conflicts (те же файлы с тех пор переписаны 4101 нашим коммитом) | 163 | архив, кроме кандидатов ниже |

Применимые чисто — в основном июльские планы и модули, которые позже не пошли в 2.0: белая админка V2 (удалена навсегда, CLAUDE.md), «product manager workspace», XP-аудит, digest-метрики, планы соцкаруселей. Переносить их — значит возвращать отменённое.

## Кандидаты на ручную проверку (до cherry-pick)
1. **23ee62393 security: remove admin catch-all firestore writes** — там правило `match /{document=**} allow read, write: if isAdmin()` удалено целиком. В нашем firestore.rules (стр. ~3327) catch-all для админа ЕСТЬ, но уже с исключениями (users, accounts_v2, account_deletion_tombstones…). Полное удаление может сломать прямые записи админки legacy.html. → вопрос Q64.
2. **22372ce80 fix: preserve unicode analytics parameters**, **075cbcf97 / 686cb0481** (время активного просмотра YouTube в аналитике) — применимы чисто; проверить, нет ли у нас эквивалента (руны за видео переделывались в сентябре).
3. **6c3cf8e09 Fix referral invite links and rewards**, 6ea2a81f8, 03637a395 (рефералы) — конфликт; рефералы у нас переписаны (ветка referral-roulette), вероятно устарели.
4. **41018923f fix(weekly-review): enforce premium server-side** — эквивалент у нас УЖЕ есть: functions/src/weekly_review.ts вызывает resolvePremiumAccess и rejectFree (premium_status.ts на месте). Архив.
5. **be00b2169 / d0318e5f1** (почта поддержки без потерь) — проверить, есть ли у нас защита от потери писем.
6. **13e545184 / b07f53001 harden auth restore** — 34 файла, конфликт; авторизация с тех пор переписана (Account V2) — архив.

Всё прочее — архив. Перед любой чисткой веток — git bundle (Q59).

## Полная таблица (хэш | дата | состояние | файлов в HEAD / всего | тема)
| hash | date | state | files | subject |
|---|---|---|---|---|
| 6c3cf8e09 | 2026-05-13 | conflicts | 13/18 | Fix referral invite links and rewards |
| 9cae59b81 | 2026-06-08 | already_in_head | 1/1 | revert: restore origin/master lesson_data_25_32 without wordsEn bloat |
| 6ea2a81f8 | 2026-06-09 | conflicts | 1/2 | feat(referral): one-sided VIP copy + tighten referee antifraud to 72h |
| 03637a395 | 2026-06-09 | conflicts | 1/2 | feat(referral): add "My Referrals" modal with per-status list + header entry |
| 24feabc8b | 2026-06-10 | conflicts | 6/14 | feat: weekly AI review of mistakes in My Practice |
| 41018923f | 2026-06-10 | conflicts | 4/6 | fix(weekly-review): enforce premium server-side and trim free payload |
| 0b4af980e | 2026-07-10 | applies_cleanly | 0/1 | docs: capture admin language factory baseline |
| d888192f1 | 2026-07-10 | conflicts | 4/6 | feat: add admin command and audit contracts |
| 23ee62393 | 2026-07-10 | conflicts | 1/2 | security: remove admin catch-all firestore writes |
| 69c3185d5 | 2026-07-10 | conflicts | 2/2 | feat: add admin permission matrix |
| a998c193b | 2026-07-10 | conflicts | 2/2 | feat: define language factory pack contracts |
| 2e110269a | 2026-07-10 | already_in_head | 2/2 | feat: add deterministic lesson QA contract |
| 0a5fe5e70 | 2026-07-10 | applies_cleanly | 0/2 | feat: add versioned remote config command |
| 7ec03d0ca | 2026-07-10 | conflicts | 3/3 | feat: add server remote config publish command |
| b3cddda92 | 2026-07-10 | applies_cleanly | 0/2 | feat: add admin v2 control plane shell |
| 57ed0d5fe | 2026-07-10 | conflicts | 2/2 | feat: add content pack publication state machine |
| 4043643e0 | 2026-07-10 | conflicts | 4/4 | feat: add runtime pack isolation and adaptive generation contracts |
| f6e13c565 | 2026-07-10 | applies_cleanly | 0/1 | docs: define language factory generation prompt contract |
| a58328c81 | 2026-07-10 | conflicts | 2/2 | feat: validate generated quiz card and arena surfaces |
| 275e8c737 | 2026-07-10 | conflicts | 3/3 | feat: add server language factory job command |
| bd7e42888 | 2026-07-10 | conflicts | 11/14 | fix: harden admin and language factory gates |
| c829197fa | 2026-07-10 | conflicts | 1/3 | feat: add server course pack publish command |
| 69bb5e923 | 2026-07-10 | conflicts | 1/3 | test: harden server-only and publish receipt gates |
| 077a03d9c | 2026-07-10 | conflicts | 3/7 | feat: connect active language catalog to runtime client |
| d57836f61 | 2026-07-10 | conflicts | 2/5 | feat: add content rollback and deny audit bypasses |
| a90f57a30 | 2026-07-10 | conflicts | 2/3 | feat: bind content publish to deterministic QA receipts |
| 4dc67b2ef | 2026-07-10 | conflicts | 1/6 | fix: enforce exact runtime identity and more server-only writes |
| ad6dc040b | 2026-07-10 | files_gone | 0/2 | feat: wire admin auth and language factory job action |
| 6d3635601 | 2026-07-10 | applies_cleanly | 0/2 | docs: add exhaustive admin v2 migration coverage board |
| a5b8e802e | 2026-07-10 | applies_cleanly | 0/1 | test: guard exhaustive admin migration coverage |
| b0468875e | 2026-07-10 | files_gone | 0/1 | style: apply green admin control plane CTA palette |
| 57a409c7d | 2026-07-10 | conflicts | 15/15 | fix: durably enqueue account deletion |
| 975bb2459 | 2026-07-10 | files_gone | 0/2 | feat: add complete legacy capability registry |
| 9e11a5214 | 2026-07-10 | conflicts | 3/4 | feat: add server analytics snapshot and v2 analytics view |
| a1eb47a51 | 2026-07-10 | files_gone | 0/1 | ui: expose analytics from admin header |
| be00b2169 | 2026-07-10 | conflicts | 2/2 | fix(support): retain user emails during inbox sync |
| 0a99b6c8a | 2026-07-10 | conflicts | 3/4 | fix(admin): load support inbox through protected callable |
| 46dfbf9a4 | 2026-07-10 | files_gone | 0/2 | feat(admin-v2): add protected support mail surface |
| b99bb4a39 | 2026-07-10 | conflicts | 2/4 | feat(language-factory): expose bounded job progress |
| f6c412b5e | 2026-07-10 | conflicts | 3/7 | feat(runtime): deliver identity-bound published lessons |
| 59ba63972 | 2026-07-10 | already_in_head | 2/2 | feat(language-factory): add strict lesson generation prompt contract |
| 206d9ca6e | 2026-07-10 | conflicts | 2/4 | feat(content): add canonical immutable course release contract |
| d79337399 | 2026-07-10 | conflicts | 10/10 | feat(language-factory): add source, unit and immutable artifact foundations |
| eda28b7f7 | 2026-07-10 | conflicts | 10/11 | feat(content-factory): run validated generation units |
| eabf8a827 | 2026-07-10 | conflicts | 3/3 | feat(content-factory): add complete release sealing contract |
| b177e5110 | 2026-07-10 | conflicts | 3/3 | feat(content-factory): add human review and release sealing |
| 65d695540 | 2026-07-10 | conflicts | 3/5 | feat(content-runtime): activate canonical course releases |
| 13e545184 | 2026-07-10 | conflicts | 34/34 | fix: harden auth restore and account transitions |
| cf577abed | 2026-07-10 | conflicts | 15/15 | fix: durably enqueue account deletion |
| b07f53001 | 2026-07-10 | conflicts | 34/34 | fix: harden auth restore and account transitions |
| 53faa1510 | 2026-07-10 | conflicts | 2/2 | fix: isolate auth sync integration |
| 3ec80902a | 2026-07-10 | conflicts | 1/1 | fix: remove unrelated function export |
| 6a5f82c67 | 2026-07-10 | conflicts | 8/8 | fix(content-factory): harden review activation and rollback |
| 5434f5138 | 2026-07-10 | conflicts | 9/9 | fix(content-factory): checkpoint generation and enforce budgets |
| f21fd14a8 | 2026-07-10 | conflicts | 20/35 | feat(content-runtime): deliver canonical lessons by locale |
| cdbc7bd9c | 2026-07-10 | conflicts | 9/41 | feat(content-runtime): bind generated surfaces to releases |
| ad9d44f38 | 2026-07-10 | conflicts | 5/13 | feat(admin): build guarded language factory workflow |
| c893bd280 | 2026-07-10 | conflicts | 2/8 | feat(admin): group every legacy capability in v2 |
| 22272bc93 | 2026-07-10 | conflicts | 3/6 | feat(admin): guard remote config with revision preview |
| d0318e5f1 | 2026-07-10 | conflicts | 10/15 | fix(admin): make support mail durable and lossless |
| 2fb5d3c8a | 2026-07-10 | conflicts | 3/7 | feat(admin): add unified user profiles |
| b05a88530 | 2026-07-11 | applies_cleanly | 1/2 | feat: define digest metric and window contracts |
| 8c73687c0 | 2026-07-11 | applies_cleanly | 0/2 | feat: add bounded digest source collection |
| 7f311408a | 2026-07-11 | applies_cleanly | 0/2 | feat: reconcile digest metrics with RevenueCat |
| f04274efb | 2026-07-11 | conflicts | 2/3 | feat: persist comparable digest runs |
| f14dccc65 | 2026-07-11 | conflicts | 1/3 | feat: add comparable admin digest dashboard |
| 65d66184c | 2026-07-11 | conflicts | 6/10 | feat: add searchable application codex |
| 0cb0288b7 | 2026-07-11 | conflicts | 2/5 | feat: bind RevenueCat analytics reconciliation |
| a615db779 | 2026-07-11 | conflicts | 8/16 | feat(admin): add daily briefing and report center |
| 8bd8ae22f | 2026-07-11 | conflicts | 3/8 | fix: enforce verified digest analytics |
| 290904865 | 2026-07-11 | conflicts | 2/6 | fix: connect digest to generated Codex |
| 017b2c9e4 | 2026-07-11 | conflicts | 1/4 | fix: publish digest atomically |
| 0e1fc0c41 | 2026-07-11 | conflicts | 2/8 | fix: deploy current digest build |
| 544c8092b | 2026-07-11 | applies_cleanly | 0/1 | docs: specify admin product manager workspace |
| 62317bb4a | 2026-07-11 | conflicts | 1/11 | fix(admin): make migration routing truthful |
| 2dd15af74 | 2026-07-11 | applies_cleanly | 0/1 | docs: plan product manager workspace |
| dcf17b294 | 2026-07-11 | applies_cleanly | 0/2 | feat: define product manager contracts |
| c944646b0 | 2026-07-11 | applies_cleanly | 0/3 | feat: add product manager source manifest |
| c4a8fd93d | 2026-07-11 | conflicts | 4/4 | test: inventory production container borders |
| 417a75e9c | 2026-07-11 | conflicts | 1/1 | test: lock premium tonal surface contract |
| 2d9af7c6b | 2026-07-11 | conflicts | 9/10 | refactor: adopt tonal shared surfaces |
| ae99d0f37 | 2026-07-11 | conflicts | 6/6 | refactor: use stable tonal settings surfaces |
| 1372895bf | 2026-07-11 | conflicts | 3/3 | refactor: use tonal friends surfaces |
| 220bb51f1 | 2026-07-11 | conflicts | 3/3 | refactor: simplify lessons navigation surface |
| a26c45a95 | 2026-07-11 | conflicts | 3/3 | refactor: use tonal home surfaces |
| 8b9da850d | 2026-07-11 | conflicts | 1/7 | feat: connect product manager codex projection |
| 71600154c | 2026-07-11 | conflicts | 2/3 | refactor: use tonal quizzes surfaces |
| 0b3d4aa8d | 2026-07-11 | files_gone | 0/4 | feat: collect product manager evidence |
| 1ad77791d | 2026-07-11 | conflicts | 3/3 | refactor: use tonal tab shell surfaces |
| b0d81c044 | 2026-07-11 | applies_cleanly | 0/4 | feat: compute evidence-backed product insights |
| 926d7d4c7 | 2026-07-11 | conflicts | 5/5 | refactor: use tonal flashcard hub surfaces |
| f40d471ac | 2026-07-11 | conflicts | 3/3 | refactor: use tonal flashcards swipe surfaces |
| 6abe988a4 | 2026-07-11 | files_gone | 0/7 | feat: add truthful admin operational snapshot |
| 32e2adbe6 | 2026-07-11 | conflicts | 2/6 | feat: persist product manager decisions safely |
| cdf1632bf | 2026-07-11 | conflicts | 3/3 | refactor: use tonal flashcard list item surfaces |
| 2dbe8bd79 | 2026-07-11 | applies_cleanly | 0/3 | feat: generate validated product manager briefs |
| 0f0ae3ccc | 2026-07-11 | conflicts | 2/11 | feat: add product manager workspace |
| e2652c735 | 2026-07-11 | conflicts | 86/156 | refactor: complete borderless production surfaces |
| ba4ea824c | 2026-07-11 | conflicts | 2/7 | fix: protect product manager firestore state |
| 5ab43b962 | 2026-07-11 | conflicts | 3/10 | feat: add native admin audit log |
| d4f6cdfa7 | 2026-07-11 | conflicts | 2/7 | feat: define social learning card manifests |
| 4c51536ca | 2026-07-11 | conflicts | 7/16 | feat: add native admin ops log |
| fd933d1e9 | 2026-07-11 | files_gone | 0/3 | feat: prepare file based DALL-E briefs |
| a112e067b | 2026-07-11 | applies_cleanly | 0/1 | docs: plan production XP integrity audit |
| 85ba6fa6d | 2026-07-11 | files_gone | 0/2 | feat: import DALL-E card atlases |
| 6aab3d489 | 2026-07-11 | files_gone | 0/1 | docs: harden XP audit execution plan |
| dc87864bf | 2026-07-11 | files_gone | 0/1 | docs: complete XP audit evidence plan |
| 833cf31e7 | 2026-07-11 | files_gone | 0/2 | feat: render two slide learning cards |
| 62b8e9f9f | 2026-07-11 | files_gone | 0/1 | docs: fail closed on XP event provenance |
| 0cdfe85b6 | 2026-07-11 | files_gone | 0/5 | feat: gate social card exports |
| a10ebd05d | 2026-07-11 | files_gone | 0/3 | feat: package social learning cards |
| 033726e4c | 2026-07-11 | applies_cleanly | 0/2 | test: define XP audit evidence contracts |
| 21dcab1b0 | 2026-07-11 | files_gone | 0/1 | test: harden XP audit read-only contract |
| 258f87227 | 2026-07-11 | files_gone | 0/1 | test: detect aliased XP audit writes |
| a1292f7cd | 2026-07-11 | files_gone | 0/1 | test: isolate XP audit output capability |
| 74a56d4e3 | 2026-07-11 | files_gone | 0/1 | test: prevent XP report capability escapes |
| 8f5950abd | 2026-07-11 | files_gone | 0/1 | test: require ordered XP output guard |
| 7c2246752 | 2026-07-11 | files_gone | 0/1 | test: pin XP output guard bindings |
| 76a4795db | 2026-07-11 | applies_cleanly | 0/2 | feat: map verified historical XP catalogs |
| 622e4850a | 2026-07-11 | files_gone | 0/2 | fix: harden verified XP catalog history |
| 3b515f05b | 2026-07-11 | files_gone | 0/2 | fix: fail closed on XP catalog provenance |
| 414a470dc | 2026-07-11 | files_gone | 0/2 | fix: reject ambiguous formula block scopes |
| cccaca47d | 2026-07-11 | files_gone | 0/2 | fix: propagate XP formula evaluation errors |
| 23fb6dd33 | 2026-07-11 | applies_cleanly | 0/2 | feat: classify XP integrity evidence safely |
| cab6d74a8 | 2026-07-11 | files_gone | 0/2 | fix: fail closed on incomplete XP evidence |
| 7e29cdc78 | 2026-07-11 | files_gone | 0/2 | fix: reconstruct tied XP ledger evidence |
| 3bdfd8e41 | 2026-07-11 | conflicts | 2/7 | feat: add social learning cards pilot |
| 291828054 | 2026-07-11 | conflicts | 5/14 | feat: add admin asset studio |
| e6ea1107d | 2026-07-11 | files_gone | 0/2 | fix: preserve independent XP evidence provenance |
| 9c063671c | 2026-07-11 | files_gone | 0/2 | fix: correlate XP evidence without losing causes |
| c85aab11e | 2026-07-11 | files_gone | 0/5 | feat: promote admin daily briefing to pm digest |
| 23d814bb5 | 2026-07-11 | files_gone | 0/2 | fix: require independent XP anomaly families |
| b091fbf68 | 2026-07-11 | conflicts | 2/11 | fix: strengthen social card visual quality gates |
| ddffc6df9 | 2026-07-11 | files_gone | 0/7 | feat: add native admin control panel hub |
| 4f028e35c | 2026-07-11 | files_gone | 0/4 | feat: add IAM-gated XP audit reads |
| a0b0ca2bb | 2026-07-11 | files_gone | 0/6 | fix: replace app screenshot with contextual creative |
| 4d43ab8f3 | 2026-07-11 | files_gone | 0/2 | fix: read production XP restore timestamp |
| 4c21b7b6a | 2026-07-11 | files_gone | 0/7 | fix: harden XP audit evidence reads |
| 87f4aefbc | 2026-07-11 | files_gone | 0/4 | fix: expose alias closure completeness |
| 2affe5612 | 2026-07-11 | conflicts | 1/6 | feat: add privacy-safe XP audit reports |
| 2c3696e0a | 2026-07-11 | conflicts | 1/7 | fix: harden XP audit execution and reports |
| ebbb0e66e | 2026-07-11 | conflicts | 1/7 | fix: make XP audit reporting atomic |
| 25beb8e8b | 2026-07-11 | files_gone | 0/4 | feat: add bilingual labels and branded characters |
| 5a9bcab9b | 2026-07-11 | files_gone | 0/3 | fix: validate XP report path ancestors |
| 05296b39f | 2026-07-11 | files_gone | 0/10 | feat: define twenty unique social card series |
| 7f94541ed | 2026-07-11 | files_gone | 0/1 | fix: crop atlas guide lines from social cards |
| d69db0c5f | 2026-07-11 | files_gone | 0/4 | fix: align XP audit with production identity data |
| 86c0b2add | 2026-07-11 | files_gone | 0/2 | fix: classify missing XP evidence as indeterminate |
| f167d4211 | 2026-07-12 | files_gone | 0/2 | feat: add release maintenance remote config workflow |
| 2c7791089 | 2026-07-12 | files_gone | 0/3 | feat: add premium access remote config workflow |
| 55abc9848 | 2026-07-12 | applies_cleanly | 0/1 | docs: design trustworthy admin v2 analytics |
| 94454b5bc | 2026-07-12 | files_gone | 0/1 | fix: correct social card learning copy |
| ef7df2ead | 2026-07-12 | conflicts | 4/19 | fix: complete admin digest and product manager insights |
| 24d98c95b | 2026-07-12 | applies_cleanly | 0/1 | docs: plan trustworthy admin v2 analytics |
| d2b010516 | 2026-07-12 | applies_cleanly | 0/1 | docs: define next social carousel batch |
| fde700756 | 2026-07-12 | applies_cleanly | 0/1 | docs: plan next twenty social carousels |
| eb52ee04c | 2026-07-12 | conflicts | 2/2 | feat: define trustworthy admin analytics metrics |
| 5e4686f45 | 2026-07-12 | conflicts | 2/7 | feat: add admin promo codes workflow |
| 4ef1890f3 | 2026-07-12 | conflicts | 2/2 | feat: return source-aware admin analytics snapshot |
| a7def1b58 | 2026-07-12 | files_gone | 0/4 | feat: add varied install slide layouts |
| e42f79824 | 2026-07-12 | files_gone | 0/3 | content: add next twenty social carousels |
| e68e2b6be | 2026-07-12 | files_gone | 0/4 | feat: render trustworthy analytics in admin v2 |
| 7168b61fe | 2026-07-12 | files_gone | 0/5 | feat: add admin promo banner workflow |
| 8dccccc18 | 2026-07-12 | files_gone | 0/3 | fix: clarify admin analytics labels |
| 809d2de11 | 2026-07-12 | conflicts | 2/7 | fix: harden admin analytics edge states |
| cc3429615 | 2026-07-12 | conflicts | 5/10 | feat: add native admin app messages workflow |
| 20d661700 | 2026-07-12 | files_gone | 0/1 | fix: keep modern install copy clear of hero |
| 2ce96cff2 | 2026-07-12 | conflicts | 1/1 | chore: preserve admin core contract line endings |
| c74a03104 | 2026-07-12 | conflicts | 6/10 | feat: complete guarded app message lifecycle |
| 9e22a6c9e | 2026-07-12 | conflicts | 2/2 | fix: support safe unsubscribe secret rotation |
| 47789d97e | 2026-07-12 | files_gone | 0/2 | fix: load admin v2 assets from hosting path |
| b68a1aee2 | 2026-07-12 | files_gone | 0/3 | fix: enlarge social card learning visuals |
| e77adea7a | 2026-07-12 | applies_cleanly | 2/2 | fix: initialize standalone admin analytics |
| cb5da410d | 2026-07-12 | already_in_head | 3/3 | fix: preserve role-aware admin claims |
| 43cfc5e79 | 2026-07-12 | conflicts | 110/155 | feat(admin): make Admin 2 the primary control plane |
| 9d2e38b12 | 2026-07-12 | conflicts | 7/10 | fix: preserve legacy admin access in v2 |
| 766b870f2 | 2026-07-12 | files_gone | 0/2 | feat: make install slides unmistakably mobile |
| 3cc033e23 | 2026-07-12 | files_gone | 0/2 | fix: route admin campaigns to native screen |
| 04ebef506 | 2026-07-12 | applies_cleanly | 0/1 | docs: plan all-development integration |
| 9ee76f217 | 2026-07-12 | conflicts | 1/1 | fix: preserve admin briefing compatibility contracts |
| 5246c8a07 | 2026-07-12 | conflicts | 2/5 | fix: restore authenticated legacy modules in admin v2 |
| 0e5d3655d | 2026-07-12 | conflicts | 15/23 | merge: port unique admin v2 analytics surfaces |
| f75c2f731 | 2026-07-12 | conflicts | 3/7 | fix: reconcile Admin 2 primary shell and secure PM rules |
| 8d09c7472 | 2026-07-12 | conflicts | 1/2 | fix: open legacy admin tools outside the modular shell |
| aed8519cc | 2026-07-12 | conflicts | 1/2 | fix: align Admin 2 migration links and PM rule guards |
| 2a4ab2722 | 2026-07-12 | conflicts | 1/1 | test: follow OpenAI budget checks into legacy admin |
| 050fc2992 | 2026-07-12 | conflicts | 1/2 | fix: reconcile integration contracts |
| d4263ecea | 2026-07-12 | already_in_head | 1/1 | test: make analytics contract whitespace tolerant |
| 16da183ab | 2026-07-12 | conflicts | 1/2 | fix: secure standalone legacy admin authentication |
| 049b77b6c | 2026-07-12 | conflicts | 1/3 | docs: normalize integration plan whitespace |
| 262b6e115 | 2026-07-12 | conflicts | 2/2 | fix: prevent friends gift modal touch wedge |
| 54dd5e1d6 | 2026-07-12 | conflicts | 1/3 | chore: show release integration status after commits |
| 68d2ff893 | 2026-07-12 | applies_cleanly | 0/2 | docs: record friends gift release integration plan |
| bc8dbc99b | 2026-07-12 | conflicts | 17/125 | refactor: remove constellations game |
| c1e5756e6 | 2026-07-12 | conflicts | 5/7 | fix: preserve deployed admin functions in integration |
| f178a8645 | 2026-07-12 | conflicts | 2/2 | fix: preserve automatic nickname function |
| 861ebfb59 | 2026-07-12 | conflicts | 3/3 | build: complete admin v2 functions dependencies |
| 48f6ef4e0 | 2026-07-12 | conflicts | 3/3 | release: bump app to 1.5.56 build 99 |
| 892bdab21 | 2026-07-12 | conflicts | 4/4 | feat: configure and measure soft upsells |
| adca63ded | 2026-07-13 | files_gone | 0/3 | feat: expose soft upsell previews in admin console |
| 41d56261e | 2026-07-13 | applies_cleanly | 0/1 | docs: plan premium soft upsell conversion |
| 6c30fca4d | 2026-07-13 | applies_cleanly | 0/2 | feat: add exact soft upsell attribution contract |
| c0f323909 | 2026-07-13 | conflicts | 4/4 | feat: add opportunistic soft upsell overlay claim |
| ed7fcd061 | 2026-07-13 | conflicts | 2/6 | feat: redesign soft upsells as quiet premium modal |
| af8be4855 | 2026-07-13 | conflicts | 7/9 | feat: open real paywall from claimed soft upsells |
| 53a041106 | 2026-07-13 | conflicts | 21/39 | feat: complete premium soft upsell conversion funnel |
| 407f8e4d8 | 2026-07-13 | conflicts | 13/18 | fix: harden exact soft upsell conversion attribution |
| b9b997913 | 2026-07-13 | conflicts | 6/6 | fix: make trial and funnel metrics exact |
| 901f29812 | 2026-07-13 | applies_cleanly | 1/1 | docs: mark premium soft upsell implementation complete |
| 9f8ae52f7 | 2026-07-13 | conflicts | 7/7 | fix: preserve current integration contracts |
| a2082afb0 | 2026-07-13 | conflicts | 2/2 | fix: isolate analytics deduplication by upsell mode |
| 24d7b77f2 | 2026-07-13 | conflicts | 2/3 | fix(stats): distinguish percentile availability states |
| 6af4dcf46 | 2026-07-13 | conflicts | 3/4 | fix(stats): initialize percentile sample metadata |
| b14bb5439 | 2026-07-13 | conflicts | 2/3 | fix(stats): validate percentile sample boundaries |
| 73310f9cc | 2026-07-13 | applies_cleanly | 0/2 | feat(stats): derive verified personal observations |
| 1b4749eb4 | 2026-07-13 | files_gone | 0/2 | fix(stats): reject invalid previous periods |
| 345d1b41b | 2026-07-13 | files_gone | 0/2 | fix(stats): require complete insight snapshots |
| 07dac824a | 2026-07-13 | files_gone | 0/2 | fix(stats): discard oversized previous periods |
| ba9e59a7e | 2026-07-13 | conflicts | 3/3 | feat(stats): restore budgeted premium AI insights |
| cb537faf8 | 2026-07-13 | conflicts | 3/3 | fix(stats): classify verified insight failures |
| bd9e2830b | 2026-07-13 | conflicts | 2/2 | fix: isolate verified stats insights cache |
| 26afd3509 | 2026-07-13 | conflicts | 2/2 | feat(stats): constrain AI to verified observations |
| 6fe4d30cf | 2026-07-13 | conflicts | 2/2 | fix(stats): send verified request envelope |
| 32671db95 | 2026-07-13 | conflicts | 2/2 | fix(stats): harden insight request dedupe key |
| 833d1919b | 2026-07-13 | conflicts | 2/2 | refactor(stats): remove obsolete quota helpers |
| f89be5a8f | 2026-07-13 | conflicts | 1/4 | feat(stats): wire verified premium insights |
| 459c0ef4b | 2026-07-13 | conflicts | 1/4 | fix(stats): gate insights by load cycle |
| e026b2655 | 2026-07-13 | conflicts | 1/4 | fix(stats): return verified load cycle token |
| 782277c60 | 2026-07-13 | conflicts | 1/2 | fix(stats): guard every load cycle stage |
| 2ae72a3cf | 2026-07-13 | conflicts | 1/4 | fix(stats): bind insights to completed snapshots |
| 22746c36d | 2026-07-13 | conflicts | 2/2 | fix(stats): render verified insights server-side |
| ffda6aea6 | 2026-07-13 | conflicts | 2/2 | feat(stats): expose insight selection window |
| 00fc48aff | 2026-07-13 | files_gone | 0/2 | fix(stats): make insight rotation policy explicit |
| 3be17ff33 | 2026-07-13 | conflicts | 1/4 | fix(stats): restore windowed insight rotation |
| 3867cf7f1 | 2026-07-13 | conflicts | 1/2 | fix(stats): flag stale percentile source data |
| 9cdef2f9a | 2026-07-13 | conflicts | 1/2 | style(stats): use idiomatic array types |
| f9631c52f | 2026-07-13 | conflicts | 1/2 | fix(stats): align source freshness with daily cron |
| 36c566985 | 2026-07-13 | conflicts | 2/2 | fix(stats): reject malformed cached insights |
| 63b4d8d0e | 2026-07-13 | conflicts | 4/8 | fix(stats): support dynamic study targets |
| e42d492a7 | 2026-07-13 | conflicts | 4/6 | feat: define governed youtube analytics events |
| c358a70ae | 2026-07-13 | conflicts | 2/4 | fix: harden youtube analytics contract boundaries |
| 22372ce80 | 2026-07-13 | applies_cleanly | 1/2 | fix: preserve unicode analytics parameters |
| 075cbcf97 | 2026-07-13 | applies_cleanly | 0/2 | feat: measure youtube active playback time |
| efa0c9bc5 | 2026-07-13 | files_gone | 0/2 | fix: keep youtube watch clock monotonic |
| 74574fb2e | 2026-07-13 | conflicts | 2/2 | feat: bridge youtube iframe playback state |
| c0f44bf1d | 2026-07-13 | conflicts | 1/3 | fix: align youtube bridge message contract |
| 2a29a61ba | 2026-07-13 | conflicts | 2/2 | fix: stop youtube polling on unknown state |
| 6e37d4a6b | 2026-07-13 | conflicts | 3/4 | fix: harden youtube iframe lifecycle |
| 110a793d2 | 2026-07-13 | conflicts | 2/2 | fix: wait for youtube player readiness |
| d9b9cd95d | 2026-07-13 | conflicts | 2/10 | feat: track youtube engagement in app |
| 3ed8a617c | 2026-07-13 | files_gone | 0/2 | fix: enforce youtube analytics consent lifecycle |
| b42da44fb | 2026-07-13 | conflicts | 2/12 | fix: pin youtube playback analytics context |
| faffb7311 | 2026-07-13 | conflicts | 1/6 | fix: scope youtube session to playback attempt |
| 686cb0481 | 2026-07-13 | applies_cleanly | 0/2 | feat: aggregate youtube analytics semantics |
| b16ff65a2 | 2026-07-13 | files_gone | 0/2 | fix: scope youtube analytics quality filters |
| 93dbc581e | 2026-07-13 | files_gone | 0/2 | fix: preserve youtube conflict semantics under filters |
| 232a83301 | 2026-07-13 | files_gone | 0/2 | fix: align youtube platform and quality semantics |
| 76b2517e9 | 2026-07-13 | files_gone | 0/2 | fix: harden youtube analytics warehouse contract |
| ae75e0968 | 2026-07-13 | files_gone | 0/2 | fix: preserve unicode youtube analytics titles |
| 461c426b1 | 2026-07-13 | files_gone | 0/2 | fix: correct youtube analytics bigquery syntax |
| ce70d6ccd | 2026-07-13 | conflicts | 4/6 | feat: expose protected youtube analytics snapshot |
| c5ce8d28c | 2026-07-13 | files_gone | 0/11 | feat: add youtube analytics admin screen |
| b313b86b0 | 2026-07-13 | files_gone | 0/5 | fix: preserve youtube channel attribution |
| 6a0e4557b | 2026-07-13 | files_gone | 0/3 | fix: classify missing youtube sources |
| 5c2131cf3 | 2026-07-13 | files_gone | 0/2 | fix: label youtube exit clicks precisely |
| d740f9599 | 2026-07-13 | conflicts | 2/3 | fix: bridge youtube analytics session lifecycle |
| f544c35a8 | 2026-07-12 | conflicts | 5/10 | fix: complete release integration dependencies |
| e143ebe44 | 2026-07-13 | files_gone | 0/1 | fix: align league bonus preview contract |
| 44ba5b389 | 2026-07-12 | conflicts | 2/6 | fix: reconcile text integrity release gate |
| 5fee4870a | 2026-07-12 | conflicts | 4/12 | fix: reconcile approved workspace release contracts |
| 4634cbb00 | 2026-07-13 | conflicts | 4/12 | Revert "fix: reconcile approved workspace release contracts" |
| 972f6c460 | 2026-07-13 | conflicts | 1/1 | fix: preserve current text integrity baseline |
| e9ec1c4b9 | 2026-07-13 | conflicts | 1/1 | chore: refresh text integrity inventory |
| 4910287e3 | 2026-07-14 | conflicts | 4/12 | fix: retire legacy profile card screen |
| 7b8680865 | 2026-07-14 | files_gone | 0/1 | perf: stop loading retired profile card data |
| 01551585a | 2026-07-19 | conflicts | 1/1 | feat(auth): redesign registration prompt as interactive bottom sheet |
## Q66 — результат (2026-10-01)

Решение владельца: сверить кандидатов из `codex/all-development-integration` и переносить недостающее отдельными коммитами.

| Кандидат | Вердикт | Что сделано |
|---|---|---|
| 22372ce80 «preserve unicode analytics parameters» | **Перенесено, с изменением** | Коммит 0e7e610d2: `truncateFirebaseString` в `app/analytics.ts` режет по кодпоинтам и выбрасывает одиночные суррогаты. В оригинале `throw new Error('Invalid analytics string')` — у нас НЕ бросает (событие не теряется). Тест `tests/analytics_firebase_unicode.test.ts` 6/6 вместе с каталогом событий. |
| 075cbcf97 `app/youtube_playback_runtime.ts` | **Архив, не переносить** | Модуль без потребителей в нашем дереве; на ветке он часть цепочки (youtube_analytics_contract → playback controller → player runtime message → admin_youtube_analytics). Этих звеньев у нас нет. Перенос одного звена = мёртвый код. |
| 686cb0481 `functions/src/admin_youtube_analytics_core.ts` | **Архив, не переносить** | То же: ядро агрегации без вызывающего callable и без экрана админки (админка — только `admin/v2/legacy.html`). Если владелец захочет аналитику YouTube — переносить цепочку целиком отдельной задачей. |
| be00b2169 «retain user emails during inbox sync» | **Эквивалент уже есть** | В `functions/src/support_inbox.ts` уже есть `classifyEmail` (категория вместо молчаливого отсева), письма не отбрасываются, выборка по UID-курсору с догрузкой и повтором упавших (`selectSupportImap*`), дедуп по Message-ID; тесты `support_inbox.test.ts` / `support_25_letters_sim.test.ts`. Наша реализация новее и шире (курсор + uidValidity вместо «хвоста последних N»). Переносить нечего. |
| d0318e5f1 «support mail durable and lossless» | **Эквивалент уже есть** | Серверная часть присутствует: `support_reply_delivery.ts`, prepare/dispatch/cancel/resolve (+Batch) в `index.ts`, `runSupportReplyDispatchSweeper` и cron, права `support.*` в `admin/permissions.ts`. Клиентская часть коммита (`admin/index.html`, `admin/v2/scripts/*`) заморожена/удалена — не трогалась. |

Ссылка в реестре: PM-239 / Q66.

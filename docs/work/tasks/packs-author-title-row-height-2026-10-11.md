# Task packet: наборы — автор «Professor Lingman», название без расширения файла, строки одной высоты

Governance-ID: TG-A30B81C181C4
Status: Planned (после пилюли языка «Видео», приоритет №1)
Owner: сессия «Авторизация» (разгрузка Дизайна, координатор 14:45), исполнитель Opus
Related: OWNER_REQUESTS_LEDGER.md строки 4, 5, 9

## Outcome
1. **(п.4)** В каталоге / «Наборах сообщества» / странице набора у официальных наборов Professor Lingman автор — «Professor Lingman» (`LINGMAN_CHANNEL_DISPLAY_NAME`, `app/lingman_youtube.ts`), а не «Автор сообщества» (`communityAuthorFallbackName`, `app/community_packs/packAuthorNames.ts`). Признак «официальный» — по ответу Ядра (вопрос задан 14:50); до ответа — НЕ угадывать.
2. **(п.5)** Название набора нигде не показывается с расширением файла (`.docx/.doc/.pdf/.txt/.csv/.xlsx/.xls/.rtf/.odt/.pages/.numbers` — регистронезависимо, только в конце строки): одна функция форматирования названия набора, вызвана во ВСЕХ местах показа (плитка каталога, страница набора, «Мои наборы», выбор набора в тренировке, шапки/шторки). Источник (импорт) и чистку существующих чинит Ядро.
3. **(п.9)** Строки наборов во «Мои наборы» / каталоге / «Наборах сообщества» / выборе набора в тренировке — ОДИНАКОВОЙ фиксированной высоты по kit `.row` (плитка 46, gap 16, высота под максимум двух строк названия; название до 2 строк, многоточие только если не влезает; счётчик и шеврон по центру по вертикали) — через ОДИН общий компонент строки набора. Обе темы, большой шрифт.

## Уточнение координатора 17:10
Делаем ФУНКЦИОНАЛЬНУЮ часть (автор Lingman у официальных, название без расширения, единая фиксированная высота строки). Визуал плашки набора сообщества будет переделан: владелец отверг прежние макеты, сессия 3 готовит 3 варианта КОМПАКТНОЙ плашки (список остаётся, меняется плашка). Поэтому — НЕ вкладываться в тонкую стилизацию; главное — ОДИН общий компонент строки набора, чтобы замена плашки потом была в одном месте. Текущий вид строк сохранить, выровняв только высоту/перенос названия/вертикальный центр счётчика и шеврона.

## РЕШЕНИЕ ВЛАДЕЛЬЦА (журнал 29, координатор 18:10) — визуал плашки утверждён
Плашка набора сообщества = **Вариант 1 «Плитка-счётчик»** из `docs/design/v2-app/community-redesign.html` (`#c1`, `plate1`; живой вид http://localhost:8851/community-redesign.html): слева плитка с числом и подписью «карточек», название на всю ширину (не ужимается бейджем «Топ»), «+» справа добавляет набор себе; переключатель «Новые / Топ» под заголовком, «+» в заголовке создаёт набор; плавающей нижней плашки НЕТ; список остаётся. Все 4 экрана варианта (каталог, поиск, долгое нажатие, набор внутри) — сверить с макетом. Реализация — через ТОТ ЖЕ общий компонент строки набора (фиксированная высота — строка 9; название через `cleanPackSourceTitle`, автор Lingman — строки 4–5). Kit-нажатие 240 мс, `accentText`/`accentInk`, шрифты 16/13, обе темы, большой шрифт. Уточнение 17:10 «без тонкой стилизации» ОТМЕНЕНО этим решением — теперь точно по макету (гейт «приложение = макет»). Дизайн-скиллы по правилу owner-rules (impeccable → taste-skill → emil-design-eng). Governance-ID: TG-6AD09C318623.

## Ответ Ядра (координатор 17:25, коммит 306185f5c) — использовать, своё не писать
Governance-ID: TG-6AD09C318623
- **Название:** `shared/pack_source_title.ts` → `cleanPackSourceTitle(raw)` — одна функция для сервера и клиента (расширение `.docx` и т. п., «(1)», « - копия/Copy»). Применять в показе названия набора ВЕЗДЕ (плитка каталога, страница набора, «Мои наборы», выбор в тренировке, шапки/шторки). Старые документы маппер каталога (`mapCommunityPackDocToMarket`) уже чистит при чтении — показ = страховка для локальных/своих наборов.
- **Автор:** `shared/official_pack_marker.ts` → `isOfficialVideoPack(pack)` (признак: `authorStableId === "video:" + videoId` формата YouTube; такие наборы создаёт только сервер), `OFFICIAL_PACK_AUTHOR_NAME = 'Professor Lingman'`. Проверять признак ДО чтения `public_profiles` — сейчас каждый набор ролика тратит чтение несуществующего `public_profiles/video:*` (💸 экономия Firebase).
- **НЕ трогать** флаг `isOfficial` в маппере каталога: `isOfficialCatalogPack` выкинет такие наборы из списков сообщества.

## Scope
In: `app/community_packs/packAuthorNames.ts`, новые/общие помощники названия и строки набора (например `components/packs/PackRow.tsx`, `app/community_packs/packTitleDisplay.ts`), экраны, где рисуются строки наборов (найти grep'ом: «Мои наборы», каталог, «Наборы сообщества», выбор набора в тренировке — `app/flashcards_training_setup.tsx` и др.). Тесты: юнит на форматирование названия, source-контракт «все строки наборов через общий компонент; фиксированная высота; numberOfLines={2}».
Out: импорт и данные на сервере (Ядро), признак «официальный» на сервере (Ядро). Чужие незакоммиченные правки в файлах — не трогать (свои ханки).

## Architecture
Показ-only: (а) `formatPackTitleForDisplay(title)` — чистая функция; (б) `packAuthorDisplayName(pack, lang)` — официальный → Lingman, иначе ник/фолбэк как сейчас; (в) общий `PackRow` с фиксированной высотой строки (две строки названия при текущем масштабе шрифта — высоту считать от lineHeight × 2 с учётом fontScale, не захардкоженные пиксели под один размер). Макет: kit `.row` в `docs/design/v2-app/kit.css` / экраны наборов в `docs/design/v2-app/*.html` — сверка «макет | эмулятор» (гейт).

## Security and privacy
Нет новых данных. «Professor Lingman» показывается только по надёжному признаку (не по нику, который может выбрать любой пользователь — подделка официального автора).

## Technical debt
- Pay now: разные строки наборов в 4 местах, расширение в названии, фолбэк автора у официальных.
- Contain: источник названия (импорт) — Ядро; после его правки страховка в показе остаётся.

## Verification
Юнит + source-контракт (по одному, со слотом); `scan_untranslated_ui` ≤ 814; дизайн-запреты (без обводок-контейнеров, шрифты 16/13, accentText/accentInk, kit-нажатие 240 мс). Сверка снимает: «Мои наборы» (длинное и короткое название рядом), каталог, выбор набора в тренировке — обе темы, крупный шрифт. Ревью до APPROVE. В журнале владельца ✅ с коммитом.

## Rollback
Отдельные коммиты по пунктам; `git revert`.

Governance-ID: TG-CC1D2773FE8D — исполнитель: общий PackRow в каталоге «Наборы сообщества» (FlashcardsCategoryHub), шапка каталога, «Мои наборы», настройка тренировки, набор внутри

## Итог исполнителя (11.10, Opus)

**Общий компонент:** `components/packs/PackRow.tsx` (+ чистая модель `components/packs/packRowModel.ts`). Два вида: `plate` — плашка #c1 «Плитка-счётчик» (плитка 68 с числом и «карточек», название ≤2 строк + «Топ» в строке названия, автор с монетой ранга и ♥/👥/💬, справа «+» 44); `row` — kit `.row` («Мои наборы», тренировка). Высота фиксирована: `packRowHeight` = поля + межстрочный×2 + подпись, через `useLineScale` (плашка 92, строка 85 при шрифте 1.0; растёт с системным шрифтом). Нажатие — `KitTouchable` (90/240 мс, cubic-bezier(.3,1.4,.5,1)). Название всегда через `formatPackTitleForDisplay` → `cleanPackSourceTitle`.

| Место | Было | Стало |
|---|---|---|
| Каталог «Наборы сообщества» (`FlashcardsCategoryHub.tsx`) | своя строка packs-simple (minHeight 74, пилюля числа, шеврон, карандаш) | `PackRow variant="plate"` + `PackRowAddButton` (оптимистично, откат, защита от двойного тапа; платный → экран набора) |
| Поиск (тот же список) | без «Найдено», без подсветки | «Найдено N» + подсветка совпадения в названии; шапка (заголовок+сегмент) скрыта при открытом поиске |
| Долгое нажатие | шторка снизу `HybridSheetShell` | меню под приподнятой плашкой, остальные приглушены (.32); «Не показывать мне» — оптимистично с откатом |
| Шапка каталога (`flashcards_packs.tsx`) | нижний плавающий док «Новые/+/Топ», заголовок 30/36 | заголовок 32/38 + «+» 44 справа, переключатель «Новые/Топ» `.sg` под ним; дока нет |
| Набор внутри (`CommunityPackPreview.tsx`) | заголовок 34/40 + автор + previewMeta, «Карточки N», строки-карточки | плашка `PackRow` без «+», «Слова · N», строки `.wr` (динамик 44, слово 20/700, перевод 13), «Добавить себе» внизу без изменений |
| «Мои наборы» (`MyPacksV2.tsx`) | `KitPackRow` (2 строки только при шрифте 1.0, сырой authorName) | `PackRow variant="row"`, автор: Lingman / ник / фолбэк без чтения сети |
| Выбор набора в тренировке (`TrainingSetupV2.tsx`) | `KitCard` без ограничения строк | `PackRow variant="row"` + `PackRowCheck` |
| `CardsKit.tsx` | `KitPackRow` | удалён (единственный потребитель переехал) |
| Название везде (`marketplace.ts`) | сырое | `packTitleForInterface` чистит через `formatPackTitleForDisplay` (каталог, «Мои наборы», тренировка, шапки, шторки, deck_options) |
| Автор (`packAuthorNames.ts`) | `video:*` читал несуществующий `public_profiles` | `isOfficialPackAuthorId` до чтения, `officialPackAuthorName` (строгий `isOfficialVideoPack`), `useCommunityAuthor` с `coinRank` из того же документа |

Тесты: `pack_row_title_author` 9/9, `pack_row_shared_contract` 17/17, `community_pack_catalog_owner_fixes` 41/41, layout_stability 15/15, reachable_action_buttons 3/3, two_theme_static_colors 40/40, marketplace_interface_locale 18/18, community_pack_add_free 8/8, fc_navigation_visual 4/4, tabbar_scroll_chrome 5/5; node-контракты (liquid_hub 11, my_packs ×2, training_setup 4, community_liquid 3, hub_no_outline 1, hub_dense 1) — все зелёные. Полная проверка типов — 0 ошибок (в т.ч. PackCommentsSheet: `coinRank` в `CommunityAuthorProfile` сделан необязательным). `scan_untranslated_ui` 807 ≤ 814.
Governance-ID: TG-C325443D1813 — независимое ревью пакета наборов.
Governance-ID: TG-04682A5EF839 — REVISE ревью: честный текст отказа в quickAddPack, живые счётчики, меню/поиск/тень/плитка по макету, ClampedTitle вместо eslint-disable.

Governance-ID: TG-D530339FB73F — доработка по ревью (REVISE): экран поиска каталога по #c1 (flashcards_packs.tsx), живые счётчики, ClampedText

## Итог доработки (REVISE ревью 11.10, TG-04682A5EF839 / TG-D530339FB73F)

1. HIGH «Проверь связь» убран: `app/community_packs/packQuickAdd.ts` → `packAddFailureToast` (`unavailable` — «Этот набор пока нельзя добавить себе.», `throw:*` — «Не получилось сохранить набор на телефоне…», 9 языков, без «связи»); хаб `FlashcardsCategoryHub.tsx:692`, логи `[PACK-ROW] add:result/rollback`.
2. Живые счётчики: `app/community_packs/packLiveCounts.ts` (сдвиг поверх каталога, отбрасывается при новом значении каталога); хаб слушает like/comments/added (`:597–630`), «+» сразу +1 к «добавили», откат −1; экран набора — свои подписки (`CommunityPackPreview.tsx:140–153`, `comments={liveComments}`).
3. Меню долгого нажатия: `marginTop: MENU_GAP - STACK_GAP` (8 от плашки, `:274`).
4. Поиск по #c1 экран 2 (`flashcards_packs.tsx`): «назад» и крестик — `searchBareBtn` 44 без подложки, поле 52/26, внутренняя кромка вместо обводки, промежуток 8.
5. `PackRow.tsx:196,225`: скругление обёртки = радиус плашки, кольцо `.pl.up` 1px `mediaInk` .18.
6. Плитка-счётчик: тексты `maxFontSizeMultiplier=1.3`, ширина `countTileWidth` растёт тем же множителем (расчёт в тесте для всех 9 языков и «9999», шрифт 1–3).
7. Бейдж «Топ»: высота `lh(17)` < межстрочного названия `lh(22)` при любом масштабе.
8. Меню и «Не показывать мне» — `animateNextLayoutTransition` (`setMenuPack`, скрытие и откат).
9. Сбой скрытия — откат + `packHideFailureToast`; перечитывание вынесено в отдельный try (сбой не возвращает скрытый набор).
10. Строки зовут свежие обработчики через `openRowRef`/`addRowRef`/`quickAddRef`, цель обучения — `studyTargetRef`.
11. Шапка набора внутри без нажатия — обычный `View` (кнопка откликов доступна отдельно); «+» каталога — действие доступности строки (`accessibilityActions`).
Сторож обрезки: примитив `components/text-integrity/ClampedText.tsx` (до N строк + «…», без ужатия шрифта, опасные свойства запрещены типом); все три `eslint-disable` убраны, в PackRow нет сырого `numberOfLines`.

Тесты: pack_row_shared_contract 31/31, pack_row_title_author 17/17, community_pack_catalog_owner_fixes 41/41, video_pack_add_maps_to_community_doc 5/5, layout_stability_contract 15/15, community_pack_like_owner_fix 17/17, two_theme_static_colors 40/40, reachable_action_buttons 3/3, text_integrity_eslint_rule 17/17; node: liquid_hub 11/11, my_packs_review_p1 3/3, my_packs_liquid 4/4, training_setup 4/4, community_liquid 3/3. Типы — 0 ошибок. Переводы 807 ≤ 814. ESLint по файлам — 0 ошибок.
Governance-ID: TG-6B1ABC895916 — повторное ревью доработки наборов (включая ClampedText и сторож обрезки), коммит.
Governance-ID: TG-8C2B04ADC8D1 — REVISE-2: убрать принудительное перечитывание каталога после «+», двойной счёт на экране набора, высота поля поиска; ClampedText — видимое исключение (атрибут + eslint-disable с причиной только в примитиве), без экспорта из index, тест-трещотка потребителей; правка правила — решение координатора.

## Итог доработки 2 (REVISE-2, TG-8C2B04ADC8D1)

1. 💸 «+» в каталоге больше не перечитывает каталог: `FlashcardsCategoryHub.tsx:575–592` — событие `community_pack_added` от «+» (признак `addingPackIdsRef`, ставится до `await`) пропускает обновление с логом `[PACK-ROW] refresh skipped reason=quick_add`. Добавление с экрана набора — `refreshHubMarketAfterAdd` без `force` (`flashcards_packs.tsx:407,690`), Firestore-часть под 30-секундным троттлом.
2. Экран набора: та же модель, что в хабе — `bumpPackCounts`/`livePackCounts` с базой = текущие цифры (`CommunityPackPreview.tsx:167`); поздний ответ чтения, учёвший лайк, сбрасывает сдвиг (без N+2).
3. Поле поиска 52: слой в шапке «Сообщества» — `height: 52, marginVertical: -5` (`app/(tabs)/community.tsx:154`): 12 + 52 − 10 + 4 = 58, как строка вкладок; поле не выходит за шапку, список при открытии поиска не сдвигается.
4. ClampedText — одно видимое исключение: `numberOfLines={maxLines}` атрибутом и ОДНА строка `eslint-disable-next-line … -- журнал владельца п.9 …`; экспорт из `components/text-integrity/index.ts` убран (файл равен HEAD); объяснение обхода из комментария убрано; трещотка — импортирует только `components/packs/PackRow.tsx`. Правило и сканер не менялись.

Предложение координатору по правилу (не реализовано): (а) allowlist файла-примитива `components/text-integrity/ClampedText.tsx` в `createNoUnsafeTextTruncationRule` (опция `allowedFiles`) вместо eslint-disable; (б) ловить `JSXSpreadAttribute`, если в распространяемом объекте-литерале есть `numberOfLines`/`ellipsizeMode`/`allowFontScaling: false` (и по возможности — через идентификатор с таким инициализатором), — одинаково в `tools/eslint-rules/no-unsafe-text-truncation.js` и `scripts/text-integrity/inventory-core.cjs` (`structuralIdentityFromEslint` и TS-адаптер), иначе spread остаётся лазейкой.

Тесты: pack_row_shared_contract 38/38, pack_row_title_author 18/18, community_pack_catalog_owner_fixes 41/41, text_integrity_eslint_rule 17/17, layout_stability_contract 15/15; node: liquid_hub 11/11, my_packs_review_p1 3/3, training_setup 4/4, community_liquid 3/3, spire_tab_gate 8/8. Типы — 0 ошибок. ESLint — 0 ошибок, отключений сторожа обрезки ровно одно (ClampedText). Переводы 807 ≤ 814.
Governance-ID: TG-76F096462E24 — РЕШЕНИЯ ВЛАДЕЛЬЦА (координатор): одинаковая высота 85, название до 2 строк с «…», ник в 1 строку; примитив обрезки принят — в сторож no-unsafe-text-truncation добавить явное исключение для него с причиной.
Governance-ID: TG-A3A977F1724A — шаг после REVISE-2: явное исключение примитива в правиле и сканере + ловля spread (решение владельца через координатора).

## Итог доработки 3 (решение владельца через координатора: явное исключение примитива в стороже)

- а) `tools/eslint-rules/no-unsafe-text-truncation.js`: `ALLOWED_PRIMITIVE_FILES` (= `['components/text-integrity/ClampedText.tsx']`, причина в комментарии: «журнал владельца п.9, решение владельца через координатора 11.10: до N строк с многоточием, без ужатия шрифта»); в `create` разрешённый файл не проверяется. В `ClampedText.tsx` — `numberOfLines={maxLines}` обычным атрибутом, eslint-disable НЕТ (ноль).
- б) `scripts/text-integrity/inventory-core.cjs`: тот же список `SEMANTIC_TRUNCATION_PRIMITIVES` (источник для правила) + `isSemanticTruncationPrimitive` в обоих адаптерах (`structuralIdentitiesFromTypescript`, `structuralIdentityFromEslint`) — правило и сканер совпадают.
- в) Лазейка закрыта: оба адаптера ловят `JSXSpreadAttribute`, если раскрывается объект-литерал или локальная `const`-константа с объектом-литералом (снимаются `as const` / `satisfies` / скобки), с `numberOfLines` / `ellipsizeMode` / `allowFontScaling: false`. Раскрытие параметров (`{...props}`) и `let` не трогаются.
- г) Чужих существующих мест НЕТ: сравнение сканера до/после по всему репозиторию — новых находок 0, исчезла только строка `ClampedText.tsx:32` (разрешённый примитив). База `config/text-integrity-baseline.json` не менялась. Аудит `node scripts/text-integrity/inventory.mjs` показывает прежнее расхождение базы added 24 / removed 7 — оно было ДО этой правки (чужие сессии), моими правками не изменено.
- д) Трещотки: ClampedText импортирует только PackRow; в ClampedText, PackRow и потребителях — ноль отключений сторожа.

Тесты: text_integrity_eslint_rule 25/25 (новые: разрешённый файл проходит, тот же код в PackRow ловится; spread-литерал/константа ловится для всех трёх свойств; безопасные spread не ловятся; паритет отпечатков правило↔сканер), pack_row_shared_contract 38/38, text_integrity_inventory 51/51. ESLint по изменённым файлам — 0 ошибок.
Governance-ID: TG-5358AE718554 — финальное ревью (доработки 2–3, правило и сканер text-integrity) и коммит.
Governance-ID: TG-EEFC58046A25 — APPROVE финального ревью; коммит. LOW на потом: точное сравнение пути в allowlist (без toLowerCase), учёт затенения имени при поиске раскрываемой константы.

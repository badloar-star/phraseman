# Разбор diff r1: честный счёт кодовых правок (Макеты, 12.10)

Прежний разбор считал «кодовым» любой пункт без меток «данные / dev / вопрос» и раздавал исполнителей по ключевым словам — так в «Темы» попали строки, где кода нет. Теперь каждая строка diff размечена по разбору исполнителей: Темы (`7fcb58e46`, INBOX_COORDINATOR_FROM_THEMES.md), Дизайн (коммиты `ada33c4c4`…`9db022010`), решениям координатора и метке пункта. Метка хранится в `triage.final_bucket` (+ `final_who`, `final_group`).

Всего diff: **258**.

| Корзина | Строк | Что это |
|---|---|---|
| `a_code_defect` | 29 | есть кодовый дефект (метка «дефект кода» / решение координатора / разбор исполнителя) — **15 уникальных правок** |
| `a2_layout_candidate` | 52 | только «вёрстка, мелко» (±px) к утверждённому образцу, причина не доказана (прокрутка, клавиатура, данные) — **не гонять в код до пересъёмки свежим кодом** |
| `b_reshoot` | 112 | только пересъёмка (кадр старый / состояние / шаг робота / уже исправлено) |
| `c_owner_decides` | 36 | решает владелец (утренний лист): значок «В набор», шапка Шпиля, цвет кнопки, срок промокода… |
| `d_mockup_stale` | 29 | образец устарел или неточен — правят Макеты (страницы под замком — после ответа владельца) |

## Осталось кодовых правок по исполнителям

| Исполнитель | Уникальных правок | Строк |
|---|---|---|
| Дизайн | 12 | 21 |
| Темы | 1 | 1 |
| Ядро | 1 | 3 |
| Авторизация | 1 | 4 |
| **Итого** | **15** | **29** |

Кандидатов «мелкая вёрстка» (Дизайн): **52** строк — отдельно, см. ниже.

### Дизайн — 12

| Строки | Что исправить | Файл |
|---|---|---|
| cards-005 | [дефект кода — кандидат] Залипающая шапка полупрозрачная: сквозь полосу ползунка просвечивает перевод «выход на посадку» из прокрученной карточки (текст над ползунком y≈205); шапка должна быть непрозрачной или с размытием под поло | `app/flashcards/CollectionListView.tsx` |
| cards-006 | [дефект кода — две плашки] Подсказка «Зажми карточку, чтобы изменить или удалить её» висит над «Удалено · Вернуть» и закрывает ряд карточек; в образце плашка одна. Решить, должна ли подсказка показываться вместе с «Удалено» (повед | `app/flashcards/CollectionListView.tsx` |
| cards-034, cards-section-010 | [дефект кода — кандидат] Затемнение не закрывает статус-бар сверху (светлая полоса y<120) — как на кадре 02:59. | `app/flashcards/FlashcardListItem.tsx` |
| cards-gap-020 | [дефект кода — кандидат] Плашка «СООБЩЕНИЕ · Эта карточка уже в наборе» ложится поверх четвёртой строки списка наборов («Фразовые глаголы» скрыта под ней, видны обрезки) — плашка должна появляться ниже списка или заменять его низ  | `app/flashcards/ExpandedCardV2.tsx` |
| cards-gap-030, cards-v2-014, cards-v2-017 | [дефект кода — кандидат] Блок шапки набора (название, «A2 · 40 карточек · 🔒 Только ты», «Тренировать», «+») сдвинут вправо от края списка на ≈26 px — тот же сдвиг, что на cards-v2-014 и 017. В строке сведений лишний «🔒 Только ты»  | `app/flashcards_collection.tsx` |
| cards-gap-034 | [дефект кода — кандидат] Если экран набора без сети остаётся на заглушках без сообщения, это немой отказ: показать «Набор ещё не скачан — нужен интернет» и вернуть в каталог (как в образце). Подтвердить пересъёмкой и чтением обраб | `app/community_packs/stage_with_retry.ts` |
| dialogs-001 | [дефект кода — кандидат] Пилюли «30/30» (дневной лимит диалогов) справа под энергией в приложении нет — в образце Free она есть; проверить в коде хаба, показывается ли лимит у Free (у Plus пилюли нет по замыслу) и состояние ссылки | `components/dialogs/DialogueV2CatalogueContainer.tsx` |
| dialogs-gap-002 | [дефект кода — кандидат] В образце после пояснения отдельная строка «Для этого языка пока ничего не сохранено.» (пустое состояние), в приложении её нет — сразу кнопка; либо кадр снят не в пустом состоянии, либо строка не выводится | `app/dialogue_v2_memory.tsx` |
| overlays-campaigns-018, overlays-campaigns-019, overlays-campaigns-020, overlays-campaigns-022, overlays-campaigns-023, overlays-campaigns-024, overlays-campaigns-025 | [дефект кода — решение координатора 12.10] «✕» слева, заголовок смещён вправо; в образце «✕» справа в круге, заголовок по центру — перенести «✕» вправо (как 016/017). | `components/referral_code_sheet.tsx` |
| settings-gap-028 | [вёрстка, мелко] Блок «Разрешить уведомления» в приложении выше (≈120 против 112 px); подписи крупнее. | `app/settings_notifications.tsx` |
| spire-010 | [дефект кода — кандидат] Под панелью башня показана от вершины («НАД ОБЛАКАМИ», этажи 15, 14), маркер не на своём этаже; в образце окно башни стоит на этаже 4 с рамкой выделения и маркером. На spire-005 и spire-012 башня уже прокр | `components/spire/SpireResultPanel.tsx` |
| spire-016 | [дефект кода — кандидат] На месте башни пустая серая плашка (башня не отрисована), в образце башня с выделенным этажом 4 и монетами; кадр мог быть снят до отрисовки башни — переснять. | `components/spire/SpireClimbDock.tsx` |

### Темы — 1

| Строки | Что исправить | Файл |
|---|---|---|
| cards-024 | [дефект кода — кандидат, Темы] Шторка полупрозрачная: сквозь неё просвечивают строки списка карточек под ней (слова «занимать», «Admit», «Afford» видны поверх полей «Слово или фраза», «Пример» и между кнопками) — в образце шторка  | `app/community_pack_create.tsx` |

### Ядро — 1

| Строки | Что исправить | Файл |
|---|---|---|
| dialogs-005, dialogs-038, dialogs-041 | [логика Ядра] Категории 0/19 при пройденном «Перенести встречу»: итог не загрузился (completion_unavailable) — зона Ядра. | `components/dialogs/DialogueV2CatalogueContainer.tsx` |

### Авторизация — 1

| Строки | Что исправить | Файл |
|---|---|---|
| settings-gap-024, settings-gap-025, settings-gap-026, settings-gap-031 | [вёрстка, мелко] Шторка в приложении короче по ширине полей и без нижнего отступа до клавиатуры (≈0 против 40 px); спиннер мельче. | `components/account/NicknameEditModal.tsx` |

## Кандидаты: мелкая вёрстка (Дизайн) — после пересъёмки

`cards-007 cards-047 cards-078 cards-gap-007 cards-gap-009 cards-gap-010 cards-gap-011 cards-gap-012 cards-gap-016 cards-gap-035 cards-section-008 cards-section-012 cards-section-023 cards-v2-006 cards-v2-010 cards-v2-012 cards-v2-020 cards-v2-025 cards-v2-026 cards-v2-045 cards-v2-046 dialogs-011 dialogs-gap-003 dialogs-gap-010 dialogs-gap-012 dialogs-gap-013 overlays-campaigns-004 overlays-campaigns-009 overlays-campaigns-010 overlays-campaigns-011 overlays-campaigns-012 overlays-campaigns-014 overlays-campaigns-015 overlays-campaigns-016 paywall-gap-012 profile-016 settings-gap-014 settings-gap-015 settings-gap-016 settings-gap-018 settings-gap-022 settings-gap-035 spire-002 spire-005 spire-009 spire-012 spire-015 spire-gap-007 spire-gap-009 spire-gap-010 spire-gap-012 spire-gap-013`

## Список для ROBOT10 (одна строка)

```
cards-009 cards-010 cards-021 cards-025 cards-032 cards-039 cards-062 cards-075 cards-081 cards-gap-003 cards-gap-021 cards-gap-026 cards-section-006 cards-section-007 cards-section-009 cards-section-015 cards-section-019 cards-section-024 cards-section-028 cards-section-032 cards-section-033 cards-section-034 cards-section-035 cards-section-036 cards-v2-001 cards-v2-005 cards-v2-008 cards-v2-009 cards-v2-011 cards-v2-013 cards-v2-022 cards-v2-023 cards-v2-024 cards-v2-027 cards-v2-028 cards-v2-029 cards-v2-030 cards-v2-031 cards-v2-033 cards-v2-048 community-003 community-004 community-005 dialogs-007 dialogs-015 dialogs-016 dialogs-017 dialogs-018 dialogs-019 dialogs-020 dialogs-022 dialogs-023 dialogs-031 dialogs-032 dialogs-034 dialogs-036 dialogs-gap-009 dialogs-gap-015 dialogs-gap-017 energy-modes-001 energy-modes-017 onboarding-019 onboarding-020 onboarding-021 overlays-campaigns-005 overlays-runtime-018 packs-simple-003 packs-simple-004 paywall-gap-001 paywall-gap-002 paywall-gap-003 paywall-gap-004 paywall-gap-005 paywall-gap-007 paywall-gap-008 paywall-gap-009 paywall-gap-010 paywall-gap-011 paywalls-022 paywalls-023 paywalls-024 profile-001 profile-003 profile-004 profile-005 profile-006 profile-007 profile-008 profile-009 profile-010 profile-011 profile-012 profile-013 profile-014 profile-015 profile-020 profile-021 profile-022 profile-024 profile-025 profile-028 profile-029 profile-030 settings-gap-002 settings-gap-003 settings-gap-004 settings-gap-005 settings-gap-008 settings-gap-009 settings-gap-011 settings-gap-019 settings-gap-030 settings-gap-032 settings-gap-033 spire-001 spire-004 spire-006 spire-007 spire-008 spire-011 spire-013 spire-014 spire-017 spire-gap-003 spire-gap-006 spire-gap-011 spire-gap-014 spire-gap-015 spire-gap-018 spire-gap-020
```

Всего 130 (diff с корзиной `b_reshoot` + pending с coverage=ready).

## Решает владелец

`cards-014 cards-015 cards-016 cards-017 cards-048 cards-gap-008 cards-gap-018 cards-gap-022 cards-section-017 cards-section-020 cards-section-022 cards-section-044 cards-section-045 cards-v2-021 cards-v2-034 community-020 community-025 dialogs-002 dialogs-045 overlays-campaigns-007 overlays-campaigns-008 overlays-campaigns-017 overlays-campaigns-026 packs-simple-001 paywall-gap-006 paywalls-011 paywalls-012 paywalls-013 paywalls-016 paywalls-018 paywalls-019 profile-017 settings-gap-036 spire-003 spire-gap-008 spire-gap-017`

## Образец устарел — Макеты

`cards-002 cards-020 cards-028 cards-070 cards-gap-001 cards-gap-002 cards-gap-004 cards-gap-005 cards-gap-006 cards-section-005 cards-v2-018 community-001 community-006 community-007 dialogs-003 dialogs-004 dialogs-006 dialogs-008 dialogs-012 dialogs-013 dialogs-014 dialogs-029 dialogs-030 dialogs-035 dialogs-039 paywall-gap-013 profile-026 settings-gap-013 settings-gap-029`

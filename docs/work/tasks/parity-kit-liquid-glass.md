Governance-ID: TG-EAF16F015D1A
Governance-ID: TG-B94FA1E05BB2
Governance-ID: TG-B94FA1E05BB2
# Task packet: стекло kit.css в приложении + сверка «приложение = макет»

Governance-ID: TG-D2EEA9F37AAB
Governance-ID: TG-8B7F35875334
Governance-ID: TG-1BCFBC522E55
Governance-ID: TG-1740699B4B8E
Governance-ID: TG-03CA4D3041E8
Governance-ID: TG-D0D0628D35E0
Governance-ID: TG-BF26157476FD
Governance-ID: TG-E0BF648A222E
Governance-ID: TG-35522360535B
Governance-ID: TG-76EE7C4C715D
Governance-ID: TG-0B7F0D65F8AB
Governance-ID: TG-94CCB70A5991
Governance-ID: TG-96E63C4ADF01
Governance-ID: TG-4B8D64BE3749
Governance-ID: TG-CC523032E50F
Governance-ID: TG-F1F07565A8A0
Governance-ID: TG-D5C40CA91E89
Governance-ID: TG-04CB2D2AAC4D
Governance-ID: TG-5C777B797A22
Governance-ID: TG-3AB1FE44F96E
Governance-ID: TG-2CA53ABA8BB8
Governance-ID: TG-238A9E7FF547
Governance-ID: TG-6E8B00B01DE2
Governance-ID: TG-EC8858170E72
Governance-ID: TG-9CF92663B81E
Governance-ID: TG-34248B5F8BF6
Governance-ID: TG-C205A1E3D041
Governance-ID: TG-61495B1B555A
Governance-ID: TG-FF8BBB95828C
Governance-ID: TG-7C3B87F7403F
Governance-ID: TG-59D602A73A3E
Governance-ID: TG-2DFCB2C79A78
Governance-ID: TG-357907C77C6A
Governance-ID: TG-05B957EF8C78
Governance-ID: TG-F66F80767B90
Status: In progress
Owner: сессия 6 «СВЕРКА»
Related epic/enabler: ГЕЙТ «ПРИЛОЖЕНИЕ = МАКЕТ» (CLAUDE.md, владелец 04.10), docs/phraseman-2.0/registries/visual_parity.json

## Outcome

Кнопки, пилюли, карточки и варианты ответа в приложении выглядят как в макетах `docs/design/v2-app/*.html`: стекло с бликом по верхне-левой кромке, тёмной нижней кромкой и мягкой тенью (kit.css, блок LIQUID GLASS). Мера успеха — склейки `scripts/parity_shot.mjs` в `docs/phraseman-2.0/evidence/parity/` без отличий по стеклу; владелец видит каждую склейку в чате.

## Scope

In scope: новый общий слой `components/v2/KitLiquidGlass.tsx` (блик `--lg-sheen`, кромка `--lg-rim`, тень `--lg-drop`, белая кнопка `.cta`); подключение в `components/practice/PracticeChrome.tsx` (круглые кнопки, пилюля таймера), затем экраны тренировок (`app/flashcards_blitz_session.tsx` и соседние) — по одному, со склейкой до и после. Записи расхождений в `docs/phraseman-2.0/evidence/parity/SVERKA_LOG.md`.

Out of scope: логика тренировок, энергия, награды, сервер, данные; файлы с чужими незакоммиченными правками (передаются координатору); шапки с сердцами/монетами (одобренное отличие владельца).

## Architecture

Сейчас стекло делает каждый экран сам (CardsHubV2 — свои внутренние тени, V2Glass — «дымка»). Добавляется один статичный компонент-слой, кладётся первым ребёнком контейнера с `overflow: 'hidden'`; использует `boxShadow` с `inset` (RN 0.81, новая архитектура) и `LinearGradient`. Без размытия (Android BlurView даёт артефакты). Инвариант: слой `pointerEvents="none"`, не меняет размеры и раскладку.

## Security and privacy

Не касается: только внешний вид, нет данных, сети, авторизации, персональных данных.

## Technical debt

- Contain: три разных способа рисовать стекло (CardsHubV2, V2Glass, KitLiquidGlass). Новые экраны — только через KitLiquidGlass; выход — когда склейки всех разделов совпадут, свести CardsHubV2 на общий слой (владелец сессии 3, после её работы над хабом).

## Verification

- `Reload` из меню разработчика (быстрое обновление на эмуляторе выключено), затем `node scripts/parity_shot.mjs shot <id>` и разбор в увеличении ×3; склейка показывается владельцу.
- Точечная проверка типов по изменённым файлам; сторожа дизайна (design-guard) при записи.
- Производительность: слой статичный, без анимаций и размытия.

## Rollback

Убрать `<KitGlassLayer …/>` из потребителей и удалить `components/v2/KitLiquidGlass.tsx` — данных и прав пользователя не касается.

Governance-ID: TG-51DA273CFD34
Governance-ID: TG-4FCAA5531C60
(продолжение той же задачи: стекло строк «Настроек» — components/settings/SettingsGlassRows.tsx; коммит только через временный индекс)

Governance-ID: TG-054D34C312FC
Governance-ID: TG-2F0A2C2CE0D1
Governance-ID: TG-D731AF26BED5
(сторож tests/flashcards_blitz_liquid_glass_source_contract.test.mjs обновлён под KitGlassLayer — следствие 9b848f4b8)

Governance-ID: TG-B42BE230DCA8
(стекло карточек «Обучения» — components/lessons/LessonsListGlassCard.tsx, сторож lessons_list_liquid_glass_source_contract PASS)

Governance-ID: TG-D64A3791D1A1
(learn-004: футер «Нашёл ошибку?» скрыт при пустом поиске — app/(tabs)/lessons.tsx; сторожа lessons_* PASS)

Governance-ID: TG-8BA51DC640FB
(ореол текста в каталоге наборов — FlashcardsCategoryHub.tsx; сторож community_liquid обновлён)

Governance-ID: TG-02F41E43283D
(Наборы: нижняя панель по .bar3 и порядок лупа/EN — app/flashcards_packs.tsx; сборка 500 по уроку 4 — не моя)

(mistakes-panel-010: шапка отработки под строкой состояния — app/mistake_practice_session.tsx, RN SafeAreaView → useStableSafeAreaInsets)

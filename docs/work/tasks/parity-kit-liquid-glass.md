# Task packet: стекло kit.css в приложении + сверка «приложение = макет»

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

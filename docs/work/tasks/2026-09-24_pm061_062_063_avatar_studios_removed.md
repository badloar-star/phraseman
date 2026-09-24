# Task packet: Удаление старых студий аватаров (PM-061/062/063, D57)

Governance-ID: TG-7F99C66A2E36
Status: In progress
Owner: Claude (сессия PM-061/062/063)
Related epic/enabler: docs/phraseman-2.0/epics (2.0), решение владельца D57 (docs/phraseman-2.0/PROGRESS.md раздел 1)

## Outcome

Владелец подтвердил решение D57: старые "гексаэдрические" студии аватаров
(`app/avatar_select.tsx`, 1741 строка, редактор/каталог/покупки за руны и
жемчуг) и невыпущенный `app/avatar_dna_studio.tsx` (за флагом
`isAvatarDNAEnabled`) удаляются целиком. Пользователь больше не видит эти
экраны и не может в них попасть; показ ТЕКУЩЕГО аватара (AvatarView.tsx)
продолжает работать без изменений — он не зависит от удаляемых экранов.

## Scope

In scope: точки входа (кнопки/автопереходы) на `/avatar_select` и
`/avatar_dna_studio` в `components/LevelGiftDualModal.tsx`,
`components/LevelGiftModal.tsx`; маршруты `Stack.Screen` в `app/_layout.tsx`;
сами файлы `app/avatar_select.tsx`, `app/avatar_dna_studio.tsx`; записи в
реестрах (`app/navigation_back.ts`, `app/product_analytics_screen_registry.ts`,
`components/appArtBackdropRegistry.ts`, dev-витрина `screens_profile.tsx`);
тесты, читающие эти два файла напрямую (падают с ENOENT после удаления).

Out of scope: `app/(tabs)/home.tsx` и `app/(tabs)/_layout.tsx` (сессия
интерфейса, прямой запрет трогать); `components/avatar-dna/*` и
`modules/avatar-dna/*` — используются в боевом `components/AvatarView.tsx`
(показ аватара по всему приложению: home, friends, club, arena, league), не
изолированы от студии, удаление не входит в эту задачу; ассеты
`assets/images/avatar-auras*` — отдельная проверка компенсации/fallback.

## Architecture

Текущая граница: два независимых Stack-экрана (`avatar_select`,
`avatar_dna_studio`) вызывались из Главной (home.tsx, не трогаем) и из
модалок подарков за уровень. Показ текущего аватара идёт через отдельный
компонент `AvatarView.tsx`, который НЕ импортирует ни один из двух экранов —
он использует `AvatarDNAStage` из `components/avatar-dna/` только при явном
`localDNA` (недостижимо без студии, remote-флаг `avatar_dna_enabled` уже
`false` по умолчанию). Новая граница: оба экрана и их точки входа удалены;
`AvatarView.tsx` и вся инфраструктура показа аватара не меняются.
Компенсация покупок (`gifts_to_coins_table_v1.ts`) читает отдельные
хранилища владения (не экран) — не трогалась.

## Security and privacy

Не применимо: изменение не касается аутентификации, персональных данных,
секретов или разрешений. Удаляемые экраны не хранили и не передавали новых
категорий данных.

## Technical debt

- Accept temporarily: `home.tsx` содержит кнопку `nav.push('/avatar_select')`
  (строка ~4294) и вызывает `claimAvatarNudgeSession()`/не вызывает больше
  `markAvatarSectionVisited()` (функция была только в удалённом экране) —
  намёк на Главной теперь не сможет замолчать навсегда после захода.
  Владелец: сессия интерфейса, которая правит home.tsx. Срок: при следующей
  правке home.tsx. Влияние: намёк на аватар будет гаснуть по бюджету сессий
  (5 сессий), а не по факту захода — минорная UX-деградация, не критично.
- Accept temporarily: `components/avatar-dna/AvatarDNAInvitationHost.tsx`
  ссылается на несуществующий маршрут `/avatar_dna_studio` в `router.push`,
  но компонент нигде не монтируется (проверено grep) — рантайм-риска нет.
  Владелец: следующая сессия, работающая с `components/avatar-dna/*`. Срок:
  вместе с решением по всей ветке DNA-studio. Влияние: нулевое (мёртвый код).

## Verification

- `git grep` до/после каждого шага на отсутствие живых импортов/переходов
  на `/avatar_select` и `/avatar_dna_studio` вне комментариев.
- Точечные тесты через `npm run test:one -- tests/<файл>` (см. журнал
  выполнения) — светофор `.claude/semaphore/slot.sh`, не более 10 прогонов.
- `npm run typecheck` НЕ запускался (экономный режим, явно указано в задании).

## Rollback

Оба файла экрана и их точки входа можно восстановить из истории git
(`git revert` соответствующих коммитов) — удаление ничего не мигрирует и не
теряет данные пользователей: компенсация покупок уже покрыта отдельной
таблицей `gifts_to_coins_table_v1.ts`, которая не менялась в этой задаче.

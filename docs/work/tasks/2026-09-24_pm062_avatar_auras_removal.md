# Task packet: удаление гексаэдрических аватар-аур (PM-062, D61)

Governance-ID: TG-9A069078C47C
Governance-ID: TG-220B2FC1DD72
Status: Planned
Owner: Claude Sonnet 5 (сессия PM-062)
Related epic/enabler: PM-062, решения D57/D59 (отменено)/D61 в docs/phraseman-2.0/PROGRESS.md

## Outcome

Показ купленных аур аватара («гексаэдрических» ассетов avatar-auras/avatar-auras-hd)
убирается из приложения без замены, по прямому решению владельца D61
(«ауры удаляем без замены… монета ранга и есть новый аватар»). Пользователь
видит нейтральный аватар (без кольца/градиента вокруг) во всех местах, где
раньше рисовалась аура. Данные о том, что аура была куплена, не удаляются —
их читает уже готовая компенсационная миграция (`app/gifts_to_coins_migration_v1.ts`).

## Scope

In scope:
- `components/AvatarAura.tsx` — визуальный рендер кольца/градиента убирается,
  компонент становится тонкой прослойкой (просто контейнер вокруг children),
  чтобы не трогать 5 мест вызова (`AvatarView.tsx`, `LeagueChestOpenModal.tsx`,
  `LevelGiftModal.tsx`, `LevelGiftDualModal.tsx`, `PremiumAvatarHalo.tsx`).
- Ассеты `assets/images/avatar-auras/` и `assets/images/avatar-auras-hd/` —
  удаляются целиком.
- Модули, существующие ТОЛЬКО ради загрузки этих ассетов —
  `app/avatar_aura_assets.ts`, `app/avatar_aura_art_prefetch.ts`,
  `app/avatar_aura_remote_art.ts`, `constants/avatar_aura_core_art.ts`,
  `constants/avatar_aura_image_urls.ts` — удаляются вместе с их импортами.
- Тесты, проверявшие отменённое правило (отрисовку колец/ассетов) —
  переписываются/удаляются с пометкой PM-062/D61.

Out of scope (сознательно не трогается):
- `constants/avatar_auras.ts` — каталог id/названий/цветов ауры остаётся:
  это данные владения/покупки/подарков (нормализация id, цена покупки,
  сезонные id), которые читают `app/level_gift_system.ts`,
  `app/customization_*`, `app/firestore_leagues.ts`, `app/(tabs)/friends.tsx`,
  `app/(tabs)/home.tsx`, `app/club_screen.tsx`, `app/LeagueResultModal.tsx`,
  `app/services/league_chest_rewards.ts` и др. — эти файлы прямым текстом
  выведены из-под правки задачей PM-062.
- Season Pass кольца (`components/SeasonAuraRing.tsx`,
  `app/season_pass_track_config.ts`) — отдельная система, не упомянута в
  D57/D59/D61, не трогается.
- `app/(tabs)/_layout.tsx`, `app/(tabs)/home.tsx` — сессия интерфейса.
- Монеты рангов (`components/level_up/*`, `coinSource`, `coin_metal_palette`) —
  зона параллельной задачи PM-073/075/076/077, не трогается.
- Данные владения/покупки ауры (`AVATAR_AURA_OWNED_KEY`,
  `AVATAR_AURA_GIFT_OWNED_KEY`, миграция в монеты) — не трогается.

## Architecture

Было: `AvatarView` → `AvatarAura` (читает `constants/avatar_auras.ts` +
`app/avatar_aura_assets.ts` для approved-слоёв ИЛИ `season_pass_track_config.ts`
для сезонных слоёв) → рисует кольцо/градиент вокруг переданных children.

Стало: `AvatarAura` — чистый контейнер (`View` с центрированием), рисует
только children, без чтения каталога ауры и без ассетов. Публичный API
компонента (props) не меняется — вызывающий код не трогается. Модули,
существовавшие только ради загрузки approved-слоёв (assets/prefetch/remote-art/
core-art/image-urls), удаляются как мёртвый код после этой правки.

## Security and privacy

Не применимо: правка не меняет сбор/хранение персональных данных, не
добавляет сторонних сервисов и не меняет разрешения.

## Technical debt

- Pay now: мёртвые модули загрузки approved-аур удаляются в этом же ходе
  (не откладываются) — иначе они станут молча неиспользуемым, но
  компилируемым кодом.
- Contain: каталог `constants/avatar_auras.ts` временно шире, чем нужно после
  удаления рендера (хранит и данные владения, и мотив/цвет approved-аур,
  которые больше нигде не рисуются) — оставлено осознанно, т.к. используется
  как источник правды для нормализации/цены/подарков в файлах вне периметра
  этой задачи. Выход: отдельная задача очистки каталога, когда механика
  монет ранга (PM-073/077) заменит `getEffectiveAvatarAuraId`.

## Verification

- `grep` по HEAD на импорты удалённых модулей
  (`avatar_aura_assets`, `avatar_aura_art_prefetch`, `avatar_aura_remote_art`,
  `avatar_aura_core_art`, `avatar_aura_image_urls`) — должен быть пуст.
- Точечный тест (под светофором, не более 10 прогонов):
  `npm run test:one -- tests/<затронутый файл>.test.ts`.
- Ручная проверка: в местах показа аватара (Главная, профиль, лига, сундук,
  подарок уровня) больше нет кольца/градиента, аватар отрисовывается как
  обычно (инициалы/монета уровня/картинка).

## Rollback

Откат — `git revert` коммитов этой задачи; ассеты и модули восстановятся из
истории git. Данные владения ауры не менялись и не мигрировались этой
задачей, поэтому отката данных не требуется.

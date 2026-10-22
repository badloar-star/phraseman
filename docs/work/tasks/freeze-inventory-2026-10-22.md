# Заморозка невидимых экранов: опись «что заморожено / что живёт в фоне» (4 · ТЕМЫ)

Governance-ID: none (отчёт по поручению координатора 22.10, кода не менял)
Status: Report

## Outcome
Координатор просил включить заморозку невидимых вкладок и тяжёлых стеков (freezeOnBlur / react-freeze) после описи фоновых обязанностей. Опись показала: заморозка уже включена и охраняется сторожами; безопасных мест «включить ещё» нет. Ниже — что заморожено, что живёт в фоне и почему лишнее включать нельзя.

## Scope
Чтение `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `tests/perf_freeze_contract.test.ts`, точечный поиск `setInterval(`. Кода и поведения не менял.

## Architecture
**Заморожено (react-freeze) уже сейчас**
- Корневой стек: `freezeOnBlur: true` (`app/_layout.tsx` ~3723) — любой экран, ушедший под другой, не рендерится. Исключение одно: `exam` (`freezeOnBlur: false`) — экзамен должен жить при уходе из него. Сторож `tests/perf_freeze_contract.test.ts` (allowlist `['exam']`) и `tests/owner_direction_runtime_contract.test.ts`.
- Вкладки (`app/(tabs)/_layout.tsx`): `ENABLE_TAB_FREEZE = true`, `TAB_FREEZE_MIN_DISTANCE = 2` — замораживаются вкладки на расстоянии ≥ 2 от активной; активная и соседи по свайпу живые (иначе при перетаскивании сосед был бы пустым). Фоновый премаунт соседей (`ENABLE_BACKGROUND_TAB_PREMOUNT`) — вкладка делает первый коммит и засыпает.
- Экран тем (`settings_themes`) — push поверх вкладок: вкладки под ним заморожены стеком, поэтому смена темы из реального сценария перерисовывает единицы подписчиков (замер 5), а не 135.

**Живёт в фоне и НЕ замораживается (корень, вне Freeze)**
- Провайдеры и хосты корня `app/_layout.tsx` (PremiumProvider, ThemeProvider, GlobalShardsEarnedHost, EntitlementExpiredHost, ReferralWelcomeHost, StreakRiskToastHost, BillingIssueToastHost, ThemedBlockingAlertHost…) — их работа (подписки, окна наград, уведомления) не должна засыпать.
- Звук и энергия: таймеры в `energy_countdown_clock.ts`, `foreground_usage_ms.ts`, `visible_wall_clock.ts`, аудио `modules/audio/celebrationBackgroundPlayer.ts` — модульные, не зависят от дерева экранов.

**Живое внутри замороженного дерева (нюанс)**: у react-freeze пассивные эффекты (setInterval, подписки) остаются; замораживается только рендер. Поэтому каждый бесконечный цикл обязан быть под гардом фокуса — это охраняет тест «infinite animations guarded» в `perf_freeze_contract`.

Таймеры `setInterval` (список для аудитов): app — `dev_audio_players_census`, `exam`, `flashcards/CardsHubAnimProbe`, `flashcards_blitz_session`, `foreground_usage_ms`, `lingman_youtube`, `spire/use_spire_step_runner`, `visible_wall_clock`, `voice_equalizer`, `_layout`; components — `CleanOnboarding`, `completion/V2DoneChain|V2DoneScreen`, `energy/EnergyNeededSheet`, `energy_countdown_clock`, `friends_together/FriendEventMarker`, `home/v2/scene/HomeScene`, `legacy_bonus/*`, `level-exam/LevelExamV2`, `NoEnergyModal`, `RegistrationPromptModal`, `spire/moments/CountText|SpireLastChanceSheet`, `spire/scene/use_spire_scene_top`, `ui/new/UndoSnackbar`, `ui/V2Countdown`, `youtube/YoutubePremiereHero`. Большинство — модалки и шторки (живут только пока открыты).

## Security and privacy
Не касается.

## Technical debt
Единственный рычаг, который остался, — `TAB_FREEZE_MIN_DISTANCE` (сейчас 2). Уменьшить до 1 нельзя: сосед по свайпу станет пустым при перетаскивании. Менять только вместе с пересъёмкой свайпа Сверкой.

## Verification
Существующие сторожа: `tests/perf_freeze_contract.test.ts` (корневой freeze, allowlist исключений, вкладки заморожены, премаунт включён, бесконечные анимации под гардом), `tests/owner_direction_runtime_contract.test.ts`. Замеры [THEMES-PERF] — в сообщении координатору.

## Rollback
Не применимо (документ).

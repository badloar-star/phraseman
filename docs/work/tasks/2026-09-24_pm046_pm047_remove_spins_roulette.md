# Task packet: Удалить рулетку/экраны спинов и все источники их выдачи (PM-046, PM-047)

Governance-ID: TG-3610401D354E
Governance-ID: TG-4E689EE56031
Governance-ID: TG-D362784CED68
Governance-ID: TG-2BC9D5EE4B85
Governance-ID: TG-E6899B5F3660
Status: Planned
Owner: Claude session (PM-046/PM-047 исполнитель)
Related epic/enabler: E05 (docs/phraseman-2.0/epics/E05.md); D09 (03_DECISIONS.md, OWNER_FINAL)

## Outcome

Пользователь больше не видит экран спина за уровень (`/level_reward_spin`) и
раздел вращения (рулетка/спины) нигде в приложении — ни как кнопку, ни как
счётчик, ни как deeplink/notification target. Ни один игровой сценарий
(уровень, урок, сессия курса, Арена, сундук лиги, отчёт, Daily Journey,
задание-квест) больше не начисляет новый спин. Уже выданные неиспользованные
локальные спины НЕ трогаются (баланс/данные не удаляются, не конвертируются) —
только становятся недостижимыми для показа, что и требует задание (без
самодеятельной компенсации). Серверные функции спинов в `functions/` не
меняются и не удаляются (решение по их удалению — отдельное, D32).

## Scope

В рамках (клиент, `app/`, `components/`, локали, registry):
- Экран `/level_reward_spin` (app/level_reward_spin.tsx) и связанные с ним
  ТОЛЬКО-спин модули: level_reward_spins_client.ts, level_reward_spin_motion.ts,
  level_spin_credit_ids.ts, level_spin_local_contract.ts, level_spin_reward_assets*.ts,
  level_spin_reward_catalog.ts, level_spin_reward_delivery_channel.ts,
  lesson_spin_chance.ts, local_level_spin_auto_delivery.ts,
  daily_journey_spin_autocredit.ts, spin_avatar_gift_pool.ts, spin_ticket_asset.ts,
  компоненты LevelSpinFinishLine/LevelSpinRewardArt/LevelSpinRewardModal/
  SpinRewardPlaque/SpinTicketArt.
- Точки выдачи спинов: `app/local_level_spins.ts` (все `grantLocal*Spin*`) —
  переводятся в no-op, чтобы ни один вызывающий (quests_client, league chest,
  friend quests, video watch, boons, Daily Journey, Арена, урок/сессия) не
  зависел от удаления файлов и не потребовал правки сам.
- Точки входа/навигации на `/level_reward_spin` в home.tsx, streak_stats.tsx,
  level_gifts_inventory.tsx, feature_intro_sections_copy.ts, navigation_back.ts,
  components/level-exam/LevelExamV2.tsx, components/dev/motion_showcase,
  app/_layout.tsx (Stack.Screen).
- Спин-часть общего экрана "Подарки" (`level_gifts_inventory.tsx`) —
  спин-карточки/бейджи убираются, сам экран и подарочная (не-спин) часть
  остаются (относится к отдельной, ещё не подтверждённой задаче по подаркам).
- Реестр `docs/phraseman-2.0/registries/screen_inventory.json` — evidence
  удалённых маршрутов.

Вне рамок (сознательно НЕ трогаем в этом пакете):
- Реферальная рулетка (`app/referrals.tsx`, roulette_spin_client.ts,
  roulette_prizes.ts, roulette_win_modal.tsx, prize_arc.tsx,
  referral_roulette_flag.ts) — экран `/referrals` НЕ числится в
  screen_inventory.json с decision=remove, и убрать колесо, сохранив полезный
  реферальный функционал (ввод кода, шаринг, статистика приглашений),
  требует редизайна экрана — это решение для отдельной сессии интерфейса
  (D31/D40), не входит в этот срез. Отмечено отдельно в отчёте владельцу.
- Подарочная система (`level_gift_system.ts`, `level_gift_inventory.ts`,
  `LevelGiftModal.tsx`, `LevelGiftDualModal.tsx`) — welcome/comeback/day/week
  подарки, отдельный домен D09, не спины.
- Серверные функции `functions/src/level_reward_spins.ts`,
  `level_spin_enrollment.ts`, `level_spin_merge.ts`, `level_spin_star_grant.ts`,
  `referral_spin*.ts` — НЕ удаляются и не меняются (D32: удаление серверных
  функций требует согласия владельца).
- Баланс/данные существующих локальных спинов — не мигрируются, не
  компенсируются, не удаляются.

## Architecture

Текущая граница: выдача спина — набор публичных функций `grantLocal*Spin*` в
`app/local_level_spins.ts`, вызываемых из ~8 независимых доменов (задания,
сундук лиги, Арена, урок/курс-сессия, Daily Journey, отчёты, dev-выдача).
Экран `/level_reward_spin` и `level_gifts_inventory.tsx` — единственные
потребители баланса/кредитов на UI.

Новая граница: `grantLocal*Spin*` становятся no-op (сигнатура и тип
возврата сохраняются — `Promise<number[]>` → `[]`, `Promise<boolean>` → `false`),
поэтому ни один из 8 вызывающих доменов не меняется и не может получить
undefined/exception там, где раньше получал массив/булево. Это единственная
точка соприкосновения, которая позволяет не трогать quests_client.ts,
league_chest_rewards.ts, friend_quests.ts, video_watch_runes_client.ts,
boons/boon_rewards.ts, daily_journey_gift_activation.ts,
level_spin_level_up_queue.ts по отдельности.

Маршрут `/level_reward_spin` снимается из Stack (`app/_layout.tsx`) и файл
экрана удаляется; все точки навигации на него заменяются на либо отсутствие
действия (событие просто не ведёт никуда, как безопасный дефолт), либо переход
на Главную, где это уместно по UX (уведомления/deeplink).

## Security and privacy

Не изменяет аутентификацию/авторизацию, не работает с личными данными сверх
уже существующего локального AsyncStorage state (спин-баланс уже был
на устройстве, а не PII). Секреты не участвуют. Серверные callable-функции
спинов не трогаются — их авторизация не меняется этим пакетом.

## Technical debt

- Файлы `level_gift_inventory.ts`/`level_gifts_inventory.tsx`, оставшиеся с
  осиротевшими импортами спин-компонентов после удаления файлов — **Pay now**:
  вычищаются в рамках этого же пакета (иначе сборка не пройдёт).
- Неиспользуемые локальные спин-балансы на устройствах пользователей —
  **Accept temporarily**: решение о компенсации/миграции — открытый вопрос
  владельцу (см. отчёт), экспозиция ограничена тем, что баланс просто нигде
  не показывается; выход — отдельная задача после ответа владельца.
- Реферальная рулетка — **Contain**: помечена как отдельная, не блокирует этот
  пакет; граница — экран `/referrals` не в scope удаления сейчас.

## Verification

- `grep` по каждому удаляемому идентификатору/файлу подтверждает отсутствие
  оставшихся статических импортов вне удаляемого набора.
- Точечный прогон существующих контрактных тестов на удаляемые модули
  (например `tests/local_level_spins.test.ts`, `tests/lesson_spin_privilege_contract.test.ts`
  и т.п., если существуют) — либо удаляются с комментарием PM-046 (тест
  отменённого правила), либо остаются зелёными как тест no-op поведения.
- `docs/phraseman-2.0/registries/screen_inventory.json` остаётся валидным JSON
  (python -m json.tool проверка).
- typecheck выполняет оркестратор отдельно (см. инструкции сессии) — здесь не
  запускается.

## Rollback

Откат — `git revert` соответствующих коммитов (удаления файлов и правки
no-op отдельными коммитами, как требует протокол сторожа массового удаления).
Серверные функции и данные пользователей не менялись, поэтому откат клиента
полностью восстанавливает прежнее поведение без миграции данных.

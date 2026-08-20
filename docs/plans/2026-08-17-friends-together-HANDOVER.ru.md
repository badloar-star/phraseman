# ХЕНДОВЕР: «Вместе» (friends_together) — для следующей сессии (Codex/другая модель)

Дата: 2026-08-17. Ветка: `feature/referral-roulette`. Репозиторий: `C:\appsprojects\phraseman`.
Проект Firebase (прод): `phraseman-ea0b3`.

**СРОЧНОСТЬ:** владелец (Максим) написал заглавными буквами, что **DEV-панель ботов на вкладке
«Друзья» не работает — кнопки ничего не делают, боты не добавляются**. Это открытая, не
диагностированная в рантайме проблема №1. Всё остальное в фиче теоретически готово (сервер,
клиентское ядро, UI, тесты, деплой), но **ничего из этого не было проверено живьём на
эмуляторе/телефоне** ни разу за всю сессию — только статический анализ, точечный tsc/jest и
babel-синтаксис-чек. Это системный пробел, который надо закрыть в первую очередь.

---

## 0. ТРЕБОВАНИЯ ВЛАДЕЛЬЦА (дословно, в порядке поступления)

1. «раздел друзья в приложении бесполезный, не мотивирует» → нужна социальная механика.
2. Референс — старая VK-игра «В могиле» (энергия, закапывание/откапывание друзей, прокачка).
3. **Отверг** первую итерацию («Круг»: новый ресурс «огоньки», механика «Планка») — *«слишком
   много сущностей, никаких новых валют, использовать то, что есть»*.
4. **Отверг** прокачку предметов/базы (аналог прокачки могилы/лопаты в «В могиле»).
5. Финальный принятый концепт — **«Вместе»**: уровень дружбы (общие дни занятий) + сундук
   недели (опыт друзей) + кнопка «Позвать». Только существующие ресурсы: **опыт и звёзды**.
   Жемчужины НЕ раздаются фичей (только тратятся — сток).
6. «на главной ничего не добавляй» — вся механика только во вкладке Друзья.
7. Макеты должны быть: очень крупно, минимум объектов и цифр, **никаких подписей-пояснений**
   («и так должно быть понятно без этого»).
8. Анимации — строго по словарю гибрида «Световод + Чекан» (`constants/motionHybrid.ts`),
   который **пишет соседняя параллельная сессия** — переиспользовать её токены, не изобретать.
9. Экономика сундука: защита от «набрал 200 друзей — фармлю сундук каждую неделю» — решено
   считать только топ-10 друзей уровня «Приятели»+, кап XP на друга, требование к собственным
   дням/XP пользователя.
10. **Без Plus** в наградах сундука (было предложено 3 дня Plus на III пороге — владелец
    запретил одним словом «БЕЗ ПЛЮС!»). Заменено на +100★ и редкую косметику.
11. «начинай реализацию фулл с тестами и аудитами» — полная реализация сервер+клиент+UI+тесты.
12. «работай но хвати ронять мой компьютер» / «не боле 1 агента» / «економь ресуры пк» —
    **жёсткое ограничение**: НЕ запускать параллельных фоновых агентов (Task/Agent tool),
    НЕ гонять тяжёлые полные прогоны `tsc`/`jest` по всему проекту. Только точечные
    (per-file) проверки. Это ограничение действует и для следующей сессии, если явно не снято.
13. «ВКЛЮЧАЙ ЧЕРЕЗ ДЕПЛОЙ» — задеплоить функции в прод и включить remote_config флаг.
14. Найденный попутно баг с `referralOnUserProgressUpdated` (не экспортировался, отложенная
    квалификация реферала никогда не срабатывала) — владелец сказал «чини отдельной сессией» →
    было заведено через `spawn_task`, отдельная сессия это закоммитила
    (`d465eb491 fix(referral): export referralOnUserProgressUpdated trigger`).
    **НЕ ПРОВЕРЕНО: был ли этот коммит реально задеплоен в прод** (коммит ≠ деплой).
15. «добав в раздел друзей кнопку дев которая делает возможным проверку всех фич» — боты,
    сценарии, уровни, сундук, подарки — «кнопка при нажатии выезжает модал лист и там все
    кнопки». Сделано, но **не работает по словам владельца**.

---

## 1. ГЛАВНАЯ ПРОБЛЕМА ПРЯМО СЕЙЧАС

**DEV-панель ботов (`components/friends_together/DevBotsSheet.tsx`) открывается (предположительно —
не подтверждено), но кнопки внутри не производят видимого эффекта: боты не появляются в списке.**

### 1.1 Что проверено статическим анализом (НЕ рантаймом) и выглядит корректно

- `app/friends_together/dev_bots.ts`: `persist()` пишет в module-level переменную `memory`
  СРАЗУ (строка `memory = state;` до любых async-операций), значит `getDevBotsSnapshot()`
  должен быть консистентен сразу после `await addDevBots(...)`.
- `handleDevAddBots` в `app/(tabs)/friends.tsx` (~строка 1522): `await addDevBots(count)` →
  `setDevBots(s.bots)` — стандартный React-паттерн, выглядит правильно.
- `<DevBotsSheet bots={devBots} onAddBots={(count) => { void handleDevAddBots(count); }} .../>`
  (~строка 3748-3758) — проп проброшен верно.
- Двойной гейт `isDev()` в `dev_bots.ts` (`typeof __DEV__ !== 'undefined' && __DEV__ === true`)
  — стандартная и безопасная проверка, не должна блокировать в dev-сборке Expo/Metro.

### 1.2 НЕПРОВЕРЕННЫЕ гипотезы (по приоритету) — с этого нужно начать

**Гипотеза A (наиболее вероятная): DEV-кнопка вообще не видна, потому что
`friendsTogetherPolicy.enabled === false` на устройстве владельца.**
Вся DEV-ветка в JSX гейтится условием `{__DEV__ && friendsTogetherPolicy.enabled && (...)}"`
(и кнопка-триггер, и сам `<DevBotsSheet>`). Если владелец нажимал НЕ на нашу кнопку (колба,
`testID="friends-together-dev-open"`), а на что-то другое — вся диагностика должна начаться
с вопроса «он вообще видел иконку колбы в шапке вкладки Друзья?».
Путь до значения флага:
`remote_config/app` (Firestore, поле `bools.friends_together_enabled`) →
кэшируется в AsyncStorage под ключом `remote_config_cache_v1` (пишет
`app/remote_config_client.ts:127`, читается при бутстрапе `app/_layout.tsx:2609,2285`) →
`app/friends_together/together_config.ts:readCacheOnce()` читает ТОТ ЖЕ ключ и достаёт
`bools.friends_together_enabled` → `useFriendsTogetherEnabled()` хук.
**Как проверить:** на устройстве/эмуляторе открыть вкладку Друзья, проверить, есть ли
иконка колбы (flask-outline) в шапке слева от кнопки «Добавить друга» (person-add). Если её
нет — вся фича выключена на этом клиенте, и проблема НЕ в ботах, а в доставке флага.
Можно временно захардкодить `isFriendsTogetherEnabled()` → `return true` для локальной отладки
(потом откатить), либо проверить сырое значение в Firestore-консоли прод-проекта
`phraseman-ea0b3` → `remote_config/app` → `bools.friends_together_enabled` (должно быть `true`,
я его включил скриптом в предыдущей сессии — **перепроверь, что оно всё ещё `true`**, кто-то
другой мог перезаписать документ через `.set()` без `merge:true` и стереть поле).

**Гипотеза B: кнопка видна, шит открывается, но список ботов над `ScrollView` не рендерится
из-за условия `{bots.length > 0 && (...)}`  в `DevBotsSheet.tsx` — возможно, `setDevBots`
из `friends.tsx` не долетает до перерисовки самого `<DevBotsSheet>`, потому что шит
монтирован/размонтирован неправильно (проверить, не CLOSED ли шит физически размонтируется
при `visible=false` вместо CSS/анимационного скрытия — тогда его внутренний стейт не связан
с внешним `devBots` через проп, это нужно перепроверить в `ReferralSheetShell`, компонент
`components/referral_sheet_shell.tsx` — управляет ли он `visible` через условный рендер
детей или через анимацию видимости контейнера).**
**Как проверить:** добавить временный `console.log`/Alert в `handleDevAddBots` сразу после
`setDevBots(s.bots)` с `s.bots.length`, посмотреть в Metro-логе
(`.expo/metro-console.log` — см. память проекта `project_metro_console_log`), реально ли
вызывается обработчик и что возвращает `addDevBots`.

**Гипотеза C: `__DEV__` в реальной сборке владельца — не `true`.** Если владелец тестирует
через TestFlight/внутренний билд, а не через Metro dev-сервер, `__DEV__` будет `false`, и ВСЯ
DEV-ветка (кнопка + шит) физически отсутствует в дереве — это ожидаемо и не баг, но нужно
подтвердить, как именно владелец тестирует (см. память `project_emulator_bundle_delivery.md`,
`START_METRO.bat`/`START_METRO_EMULATOR.bat` в корне репо).

**Гипотеза D: React batching/closure — `useCallback` с пустым `[]` deps в
`handleDevAddBots`/остальных dev-хендлерах может держать устаревшую замкнутую функцию, если
что-то извне пересоздаёт компонент. Маловероятно, но проверить в React DevTools при рантайм-
отладке, если A/B/C не подтвердятся.**

### 1.3 План действий для диагностики (порядок обязателен)

1. Открыть проект в браузере/эмуляторе через `preview_start` или `START_METRO_EMULATOR.bat`
   (см. `AGENTS.md`/CLAUDE.md — Metro-инструкции, НЕ через Bash напрямую).
2. Зайти на вкладку Друзья, **сделать скриншот шапки** — есть ли иконка колбы.
3. Если иконки нет → диагностировать Гипотезу A (флаг remote_config).
4. Если иконка есть, нажать → диагностировать, открывается ли шит (Гипотеза B/`ReferralSheetShell`).
5. Если шит открылся → нажать «Add 3 bots», проверить Metro-консоль на ошибки/логи,
   проверить AsyncStorage через отладчик (ключ `friends_together_dev_bots_v1`).
6. Только после подтверждения корневой причины — чинить именно её, не гадать веером правок.

---

## 2. ПОЛНАЯ КАРТА ФАЙЛОВ ФИЧИ (что где лежит)

### 2.1 Документы/спецификации (читать в этом порядке)
| Файл | Что внутри |
|---|---|
| `docs/plans/2026-08-16-friends-social-loop-design.ru.md` | Первая (ОТВЕРГНУТАЯ) версия «Круг» — не реализовывать, только для истории решений |
| `docs/plans/2026-08-16-friends-together-implementation.ru.md` | **Основная утверждённая спецификация** — данные, callables, ядро клиента, UI, тесты, фазы. Читать первым |
| `docs/prototypes/2026-08-16-vmeste-friends-concept.html` | Финальный визуальный макет-эталон (крупно, без подписей, анимация по гибриду) — опубликован как Artifact |
| `docs/prototypes/2026-08-16-krug-social-loop-prototype.html` | Прототип ОТВЕРГНУТОЙ версии «Круг» — не использовать как референс UI |
| `docs/plans/2026-08-17-friends-together-HANDOVER.ru.md` | Этот файл |

### 2.2 Сервер (Firebase Functions)
| Файл | Статус | Что внутри |
|---|---|---|
| `functions/src/friends_together_core.ts` | ✅ Написан, 49 тестов зелёных | Чистые функции: кодек активных дней, уровни дружбы, прогресс сундука, тихие часы, лимиты nudge |
| `functions/src/friends_together.ts` | ✅ Написан, 24+ теста зелёных, ⚠️ пофикшен позже (weekKey/воскресенье) | 3 callable: `friendsTogetherClaimLevel`, `friendsClaimWeeklyChest`, `friendsNudge` + `applyReferralPairBonus` |
| `functions/src/friends_together_core.test.ts` | ✅ 49 тестов | |
| `functions/src/friends_together.test.ts` | ✅ ~27 тестов (после правок дня недели) | |
| `functions/src/friends_profiles.ts` | ✅ Расширен | `+lastActiveDate, activeDays, weeklyXp, friendsPush` в `FriendPublicProfile` |
| `functions/src/referral.ts` | ✅ Подключён `applyReferralPairBonus` в `markRefereeQualified` (обе точки вызова) | |
| `functions/src/index.ts` | ✅ Экспортированы 3 новых callable + `referralOnUserProgressUpdated` (последнее — отдельным коммитом `d465eb491`, см. §4) | |
| `firestore.rules` | ✅ Правила для `friend_pairs`, `friends_chest_claims`, `friend_nudges` | Задеплоены |
| `functions/src/jarvis/jarvis_data_contract_guard.test.ts` | ✅ Проверено — 30/30, новые коллекции не требуют правки читателей Джарвиса (личные подколлекции, не департаментская статистика) | |

**⚠️ ДЕПЛОЙ СТАТУС (проверить заново перед следующими шагами):**
Задеплоены точечно в прод (`phraseman-ea0b3`) командой:
```
firebase deploy --only "functions:friendsTogetherClaimLevel,functions:friendsClaimWeeklyChest,functions:friendsNudge,functions:friendsGetProfiles,functions:referralApply"
```
Успешно (лог подтверждён в сессии). **НЕ задеплоен точечно** в рамках этой сессии:
`referralOnUserProgressUpdated` (коммит `d465eb491` пришёл ПОСЛЕ основного деплоя, из отдельной
сессии) — **нужно проверить, задеплоен ли он вообще**, командой:
```bash
firebase functions:list 2>&1 | grep referralOnUserProgressUpdated
```
Если отсутствует — задеплоить: `firebase deploy --only functions:referralOnUserProgressUpdated`.

### 2.3 Клиентское ядро (чистая логика + сеть, без UI)
| Файл | Статус | Публичный API |
|---|---|---|
| `app/friends_together/together_days.ts` | ✅ 44+ тестов | `encodeActiveDays/decodeActiveDays, markActiveDay, mergeActiveDays, daysTogether, hasCommonDay, levelForDays, nextThreshold, bonusPercentForLevel, starRewardForLevel, LEVEL_NAMES, LEVEL_THRESHOLDS` |
| `app/friends_together/together_config.ts` | ✅ | Дефолты + `isFriendsTogetherEnabled()`, `useFriendsTogetherEnabled()` — читает `remote_config/app.bools.friends_together_enabled` через локальный кэш (см. §1.2 Гипотеза A) |
| `app/friends_together/weekly_chest_model.ts` | ✅ Тесты пройдены, дополнен `isClaimDay` (только воскресенье) | `buildWeeklyChestModel(...)` — чистый билдер состояния сундука |
| `app/friends_together/together_store.ts` | ✅ | `getFriendsTogetherSnapshot, primeFriendsTogetherSnapshot, refreshFriendsTogether` — пары друзей, кэш AsyncStorage 6ч, буст-флаг реферала теперь сверяется с текущей неделей (аудит-фикс) |
| `app/friends_together/nudge_client.ts` | ✅ Тесты | `nudgeFriend, isNudgedToday, primeNudgedTodayCache` — optimistic, теперь передаёт `stableId`+`senderDisplayName` (аудит-фикс, был баг — см. §5) |
| `app/friends_together/claims_client.ts` | ✅ | `claimFriendLevel, claimWeeklyChest` — теперь тоже передают `stableId` (тот же аудит-фикс) |
| `app/friends_together/sender_identity.ts` | ✅ Новый (аудит-фикс) | `prepareTogetherSender()` — общий helper для stableId+displayName, скопирован по паттерну `friend_gifts.ts` |
| `app/friends_together/dev_bots.ts` | ⚠️ **НЕ ПРОВЕРЕН В РАНТАЙМЕ — ИСТОЧНИК ЖАЛОБЫ** | `loadDevBots, addDevBots, advanceBotDay, advanceAllBots, setChestScenario, simulateIncomingNudge, markGiftReady, resetDevBots, getDevBotsSnapshot` |

### 2.4 UI-компоненты
| Файл | Статус |
|---|---|
| `components/friends_together/FriendsChestCard.tsx` | ✅ Собран, статически проверен, зарегистрирован в `runtime_lifecycle_ratchet` (гейт `useRuntimeActive(ownerVisible)`) |
| `components/friends_together/FriendTogetherSheet.tsx` | ✅ Собран |
| `components/friends_together/FriendLevelUpModal.tsx` | ✅ Собран, использует `useRewardImpactHybrid` |
| `components/friends_together/FriendsChestModal.tsx` | ✅ Собран, использует `useRewardImpactHybrid` |
| `components/friends_together/DevBotsSheet.tsx` | ⚠️ **НЕ ПРОВЕРЕН В РАНТАЙМЕ — ИСТОЧНИК ЖАЛОБЫ**. Строки специально на английском (не через `triLang`) — это осознанное решение по прецеденту `'DEV +1'` в `app/referrals.tsx`, НЕ баг i18n |

### 2.5 Точка входа/склейка
| Файл | Что изменено |
|---|---|
| `app/(tabs)/friends.tsx` | Основной файл вкладки — 390 строк diff. Импорты `friends_together/*`, весь стейт (`togetherSnapshot, myWeeklyStats, chestClaimedWeekKey, togetherSheetFriendUid, levelUpModal, chestModal, chestClaimBusy, nudgedTick, devBotsSheetOpen, devBots`), `weeklyChestModel` useMemo, `togetherByUid` useMemo, обработчики (`handleClaimFriendLevel, handleClaimWeeklyChest, handleNudgeFriend, handleDevAddBots, handleDevAdvanceAll, handleDevAdvanceOne, handleDevChestTier, handleDevIncomingNudge, handleDevGiftReady, handleDevReset`), рендер DEV-кнопки (~строка 3033-3045), рендер `<FriendsChestCard>` (~3050), рендер `<FriendTogetherSheet>/<FriendLevelUpModal>/<FriendsChestModal>/<DevBotsSheet>` (~3700-3760), полоска дружбы + колокольчик в `FriendRow` |
| `app/_layout.tsx` | `+syncFriendsPushPrefIfChanged()` вызов при старте (импорт из `app/notifications.ts`) |
| `app/settings_notifications.tsx` | `+ToggleRow` категория «Друзья» (`prefs.categories.friends`) |
| `app/hall_of_fame_utils.ts` | `updateStreakOnActivity` теперь также обновляет `active_days_v1` |
| `app/cloud_sync.ts` | `+active_days_v1, friends_push_v1` в SYNC_KEYS, OR-merge для `active_days_v1` |
| `app/xp_manager.ts` | `+friendsTogether` множитель в цепочке XP |
| `app/notifications.ts` | `+friends` категория в `NotifCategory`, `DEFAULT_NOTIF_PREFS`, `syncFriendsPushPrefIfChanged()` |
| `app/friends_profiles_batch.ts` | `+lastActiveDate, activeDays, weeklyXp, friendsPush` в `FriendProfileBatchRecord` |
| `tests/runtime_lifecycle_ratchet.test.ts` | `+` запись для `FriendsChestCard.tsx` в реестр |

### 2.6 Тесты (все запускались точечно, НЕ полным сьютом — владелец просил экономить ресурсы)
```
functions/src/friends_together_core.test.ts       — 49 тестов ✅
functions/src/friends_together.test.ts             — ~27 тестов ✅ (после правки дня недели)
tests/friends_together_days.test.ts                 — ✅
tests/friends_together_chest_model.test.ts           — 9 тестов ✅ (после isClaimDay правки)
tests/friends_together_nudge_client.test.ts          — 8 тестов ✅ (после stableId правки)
tests/friends_together_xp_multiplier.test.ts         — ✅
tests/friends_together_ui_contract.test.ts           — 31 тест ✅ (статический контракт: без обводок, без adjustsFontSizeToFit, только fontWeight 400/700, triLang с 8 языками для НЕ-dev компонентов, useRewardImpactHybrid в модалках)
```
**НЕ существует:** ни одного теста, который реально монтирует `DevBotsSheet.tsx` в React Test
Renderer/RNTL и симулирует нажатие кнопки «Add 3 bots», проверяя итоговый рендер списка ботов.
Все тесты — либо чистая логика (`dev_bots.ts` вообще НЕ покрыт тестами — 0 тестов), либо
статический grep по исходнику (`ui_contract.test.ts`). **Это дыра — `dev_bots.ts` нужно
покрыть unit-тестами, и `DevBotsSheet.tsx` нужен хотя бы один interaction-тест.**

---

## 3. КЛАССЫ ПРОБЛЕМ (обобщённо, для систематической проверки)

### Класс 1: Не верифицировано в реальном рантайме — НИЧЕГО
Вся фича (сервер+клиент+UI) прошла только: точечный `tsc --noEmit` по отдельным файлам,
точечный `jest` по отдельным тестовым файлам, один babel-syntax-check всего `friends.tsx`.
**Ни разу не открывался эмулятор/Metro для реального клика по интерфейсу за всю фичу.**
Это системный риск — возможны сломанные импорты, runtime-ошибки, которые tsc не ловит
(например неправильные relative paths, которые резолвятся в typecheck но не в Metro bundler
из-за regex/алиасов), неправильная сериализация в AsyncStorage, гонки при первом рендере.

### Класс 2: Флаг feature-toggle — единая точка отказа всей фичи
`friends_together_enabled` — если он `false` (не долетел / был перезаписан / кэш не обновился),
**ВСЯ фича невидима**: сундук, полоска дружбы, колокольчик, DEV-панель. Нужно явно
верифицировать текущее значение в проде и путь его доставки на конкретное устройство
владельца перед тем, как чинить что-либо ещё.

### Класс 3: `dev_bots.ts` — 0% тестового покрытия
Единственный файл всей фичи без единого теста. Учитывая, что это источник жалобы, это
нужно закрыть первым — минимум unit-тесты на `addDevBots/advanceBotDay/advanceAllBots/
setChestScenario/simulateIncomingNudge/markGiftReady/resetDevBots`, проверяющие
идемпотентность, персистентность через мок AsyncStorage, форму возвращаемого состояния.

### Класс 4: Деплой vs коммит — не одно и то же
Как минимум один коммит (`d465eb491`, referral-фикс) пришёл ПОСЛЕ основного деплоя функций
в этой сессии и не был задеплоен точечно в её рамках. Нужно свести полный список коммитов
на ветке, затрагивающих `functions/src/*`, с реальным списком задеплоенных функций
(`firebase functions:list`), и задеплоить расхождения.

### Класс 5: i18n ratchet — осознанно нарушен для DEV-кода (не баг, но задокументировать)
`scripts/scan_untranslated_ui.mjs` — ratchet-гард (счётчик непереведённых RU-строк может
только уменьшаться). `DevBotsSheet.tsx` изначально был написан на русском, что подняло
счётчик и заблокировало коммит хуком `pre-commit`. Исправлено переводом ярлыков на
английский (по прецеденту `'DEV +1'` в `app/referrals.tsx` — существующий паттерн для
чисто разработческого UI, не подлежащего `triLang`). **Если следующая сессия решит вернуть
русский текст в DEV-панель — нужно либо обернуть в `triLang`, либо держать английский,
но НЕ коммитить сырую кириллицу без обёртки, иначе pre-commit hook заблокирует коммит.**

### Класс 6: Косметика уровней 4/5 отсутствует (осознанно отложено)
Рамка на уровне «Близкие» (4) и аура на уровне «Лучшие» (5) описаны в спецификации, но
не реализованы — нужен арт (иконки/ассеты), которого нет. Отложено на «Фазу 3» по
спецификации. Не путать с багом — это осознанно не сделано.

### Класс 7: Джарвис — проверено, всё в порядке
По правилу CLAUDE.md «тронул данные — обнови Джарвиса»: явно проверено, что новые коллекции
(`friend_pairs`, `friends_chest_claims`, `friend_nudges`) НЕ требуют правки читателей
Джарвиса (личные подколлекции пользователя, не департаментская агрегированная статистика).
Тест `jarvis_data_contract_guard.test.ts` зелёный (30/30). Это НЕ открытый пункт, просто
зафиксировано, что проверка была сделана осознанно, не пропущена.

### Класс 8: Privacy Policy — НЕ проверено явно
По спецификации (`docs/plans/2026-08-16-friends-together-implementation.ru.md` §8) есть
пункт: друзья видят факт «занимался сегодня» и число общих дней — нужно проверить, покрыто
ли это текущим текстом `privacy.html`/`legal/*`, и если нет — предложить конкретную правку.
**Это НЕ было сделано в рамках сессии** (владелец не просил явно, но owner-rules требуют
проверки при любой правке данных — этот пункт остался открытым, отметить как техдолг).

---

## 4. ИСТОРИЯ РЕШЕНИЙ ВЛАДЕЛЬЦА (что было отклонено, чтобы не предлагать заново)

| Что предлагалось | Решение | Причина |
|---|---|---|
| Новый ресурс «Огоньки» (энергия действий над друзьями) | ❌ Отклонено | «слишком много сущностей, никаких новых валют» |
| Механика «Планка» (соревновательный вызов) | ❌ Отклонено | Та же причина — избыточная сущность |
| Прокачка базы/инструментов (аналог могилы/лопаты) | ❌ Отклонено | Владелец явно попросил другую механику вместо этого |
| 3 дня Plus как награда сундука III порога | ❌ Отклонено («БЕЗ ПЛЮС!») | Заменено на +100★ + косметика |
| Жители лиг (синтетические боты) как друзья в сундуке | ❌ Не применимо | Они физически не могут попасть в друзья (заявки не принимают) — упоминание убрано из документа |
| Открытие сундука в любой день недели | ❌ Отклонено при аудите | Заменено на «только воскресенье по локальному времени» — иначе открывали бы на пороге I во вторник, теряя II/III |
| Экспорт `referralOnUserProgressUpdated` чинить в этой же сессии | ❌ Отклонено, «чини отдельной сессией» | Заведено через `spawn_task`, выполнено отдельной сессией (`d465eb491`) |
| Параллельные фоновые агенты / тяжёлые полные прогоны tsc/jest | ❌ Запрещено с середины сессии | «економь ресуры пк», «не боле 1 агента» |

---

## 5. АУДИТ-НАХОДКИ ЭТОЙ СЕССИИ (уже исправлены, для справки — что чинили и почему)

1. **🔴 Клиент не передавал `stableId`/имя отправителя в callables** — `claims_client.ts` и
   `nudge_client.ts` изначально вызывали `friendsTogetherClaimLevel/friendsClaimWeeklyChest/
   friendsNudge` БЕЗ обязательного поля `stableId`, которое сервер требует первым делом
   (`cleanId(request.data?.stableId)` → `invalid-argument`). Это означало, что ВСЕ три
   callable гарантированно отклоняли бы любой реальный вызов с телефона. Исправлено —
   создан `app/friends_together/sender_identity.ts` (`prepareTogetherSender()`, копирует
   паттерн `prepareFriendGiftSender` из `friend_gifts.ts`), подключён во все три клиента.
   Покрыто тестом (`friends_together_nudge_client.test.ts` — новый кейс на payload+rollback).
2. **🟡 Сундук недели можно было клеймить в любой день недели** — исправлено: только
   воскресенье по локальному времени вызывающего (сервер: `isChestClaimDay` в
   `friends_together_core.ts`, гейт `friends_chest_claim_any_day` ручка в remote_config
   для тестов/админки), плюс формат `weekKey` теперь валидируется regex, плюс явный отказ
   `week_expired` для прошлых недель (weekly_xp уже сброшен кроном, считать нечего).
   Клиентская модель (`weekly_chest_model.ts`) получила `isClaimDay` — кнопка «Открыть» не
   показывается раньше воскресенья.
3. **Проверено и НЕ подтвердилось:** гипотеза о расхождении арифметики дат клиент/сервер
   (`together_days.ts` использует `addLocalDays`, сервер `shiftDayKey` использует
   `Date.parse` — обе на UTC-основе строки даты, семантика идентична, разночтений нет).

---

## 6. ЧТО ДЕЛАТЬ ДАЛЬШЕ (порядок для следующей сессии)

1. **Диагностировать жалобу владельца в реальном рантайме** (см. §1.3) — это приоритет №1,
   ничего другого не трогать, пока корневая причина не подтверждена фактами (логи/скриншоты),
   не догадками.
2. Написать unit-тесты для `app/friends_together/dev_bots.ts` (сейчас 0 тестов) — заодно
   это может само вскрыть логическую ошибку, если она есть.
3. Добавить хотя бы один RNTL/interaction-тест на `DevBotsSheet.tsx`, реально симулирующий
   нажатие кнопки и проверяющий вызов колбэка — сейчас таких тестов нет вообще ни для одного
   компонента фичи (только статический grep-контракт).
4. Проверить `firebase functions:list` на прод-проекте — сверить с фактическим списком
   функций, которые должны быть задеплоены, задеплоить расхождения (в первую очередь
   `referralOnUserProgressUpdated`, если отсутствует).
5. Проверить `remote_config/app.bools.friends_together_enabled` в прод Firestore напрямую —
   убедиться, что флаг всё ещё `true` (кто-то мог перезаписать документ).
6. Закрыть Класс 8 (Privacy Policy) — свериться с `privacy.html`/`legal/*`, предложить правку
   если нужно, ДО следующего релиза (это правило owner-rules, не опция).
7. Только после того, как DEV-панель реально заработает и будет продемонстрирована владельцу
   (скриншот/видео из реального рантайма, не код-ревью) — переходить к остальным открытым
   пунктам (косметика уровней 4/5, и т.д.), если владелец их попросит.

**Ограничение ресурсов (пункт 12 из §0) остаётся в силе, если владелец явно не снимет его в
новой сессии** — не запускать параллельных агентов, не гонять тяжёлые полные прогоны
tsc/jest по всему проекту, только точечные проверки конкретных файлов.

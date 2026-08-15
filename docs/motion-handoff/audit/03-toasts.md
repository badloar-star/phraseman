# 03 — Тосты, снекбары, баннеры и временные нотификации: полная инвентаризация

**Корень:** `/root/pm2` (app/ + components/ + constants/ + hooks/)
**Дата аудита:** 2026-08-14. Версия приложения 1.5.53.
**Метод:** чтение исходников; каждое утверждение — `файл:строка`.

**Проверка предыдущих отчётов:** папок `docs/` и `ux-audit/` в контейнере нет (ни внутри `/root/pm2`, ни рядом).
В коде на них есть только ссылки-комментарии: `components/BillingIssueToastHost.tsx:4`, `components/StreakRiskToastHost.tsx:4`,
`components/GlobalShardsEarnedHost.tsx:15` (`docs/reports/MODALS_TOASTS_AUDIT_2026-06-10.md`). Сами файлы недоступны — иду с нуля.

**Примечание об охвате:** в контейнере лежат только `app/`, `components/`, `constants/`, `hooks/`.
Каталога `modules/audio/` (`sound_director`, `sound_events`) физически нет — вызовы звука видны по импортам
(`components/ActionToast.tsx:19-20`, `components/AchievementToast.tsx:38`), но содержимое звукового директора не проверить.

---

## 0. Итог одной строкой

Найдено **36 отдельных временных/уведомляющих поверхностей**. Из них **ровно 2** (ActionToast и InGameToast)
ходят через дизайн-токен `themedToastChrome`; третий его потребитель — не тост, а inline-баннер на главной.
Остальные 33 поверхности имеют **собственные** тайминги, геометрию, позицию, палитру, интерактив и очередь.
Разброс длительности показа — **1400 мс … 10 000 мс** (×7). Разброс `zIndex` — **20 … 999 999** (×50 000).
Пружин для входа — **5 разных** наборов. Ни один тост, кроме `AccountDeletedNotice`, не уважает reduce-motion.
Единственный компонент проекта на Reanimated в этой категории (`FeedbackPlashka`) — **мёртвый, 0 вызовов**.

---

## 1. Инфраструктура

### 1.1. `constants/themedToastChrome.ts` — что даёт и кто пользуется

Файл (140 строк) отдаёт `ThemedToastChrome` по `ThemeMode`:

```
cardColors: [string, string, string]   // 3-стоповый градиент карточки
accent, accentSoft, border, closeBg, shadowColor, radius
title = theme.textPrimary, body = theme.textMuted   // themedToastChrome.ts:133-134
```

Покрыты **все 13 тем** (`constants/theme.ts:498`): dark, gold, olive, minimalDark, business, businessLight,
sagePorcelain, midnight, ember, aurora, volt, candyBlue, indigo. Фолбэк — `minimalDark` (`themedToastChrome.ts:130`).
Радиус варьируется по теме: 20 (gold), 18 (dark/olive), 16 (остальные).

**Потребители — всего 3:**

| Файл | Строка | Что это |
|---|---|---|
| `components/ActionToast.tsx` | 314 | глобальный тост |
| `components/InGameToast.tsx` | 43 | локальный тост внутри `PlayerProfileModal` |
| `app/(tabs)/home.tsx` | 2217 | **не тост** — inline-баннер «Бонус за вход» |

**Мёртвые поля токена:**

* `body` — **0 использований** во всём проекте. Вычисляется, никем не читается.
* `closeBg` — используется **только** в home-баннере (`app/(tabs)/home.tsx:2273`). Ни один тост не имеет кнопки закрытия.
* `border` — читается тремя потребителями, но **не рисуется ни разу**: в `ActionToast` `styles.toast` (строки 377-393)
  вообще не задаёт `borderWidth`, а `styles.iconBadge` задаёт `borderWidth: 0` (строка 407) при живом
  `borderColor: chrome.border` (строка 347). В `InGameToast` та же картина: `borderColor: chrome.border`
  (строка 48) при отсутствии `borderWidth` в `styles.toast` (61-77). В home-баннере — `borderWidth: 0`
  явно (`home.tsx:2236`), при этом на иконке `borderWidth: 1` (`home.tsx:2239`) — единственное место,
  где `border` реально виден.

То есть из 9 полей токена **реально красят экран 6**: `cardColors`, `accent`, `accentSoft`, `title`, `shadowColor`, `radius`.

**Главное дизайн-решение токена (и главный семантический риск):** цвет тоста зависит **от темы, а не от типа события**.
Это прямо задокументировано в `components/ActionToast.tsx:52-58`. Следствие: в теме `dark`
тост `error` рисуется **зелёным** (`accent: '#47C870'`, `border: 'rgba(71,200,112,0.42)'` — `themedToastChrome.ts:22-24`)
и подписан «Что-то пошло не так» зелёными буквами (`ActionToast.tsx:354`). В теме `gold` все пять тонов —
шампанское `#F6E3A1`. Тон различается **только** глифом Ionicons, текстом-надзаголовком, хаптикой и звуком.

### 1.2. `app/events.ts` — транспорт

* Тип полезной нагрузки: `AppEventMap['action_toast']` (`events.ts:95-109`): `type` ∈
  `success | error | info | warning | reward`, опциональный `soundEventId`, 8 языковых полей.
* Хелпер `actionToastTri(type, {ru, uk, es, ...})` (`events.ts:144-159`).
* **Анти-бурст на уровне эмиттера:** одинаковый `type+messageRu` в пределах 400 мс отбрасывается
  (`events.ts:6-9, 168-177`). Это второй слой дедупа — первый живёт в самом ActionToast (см. 2.1).
* Аналитика по тостам отключена флагом `TRACK_INTERNAL_APP_EVENTS = false` (`events.ts:10, 183`) —
  то есть **сейчас в проде не собирается статистика ни по одному тосту**.

**Масштаб:** 98 мест эмита (`84` однострочных + `14` многострочных) в **38 файлах**.
Топ-эмитенты: `app/shards_shop.tsx` (11), `app/(tabs)/friends.tsx` (11),
`app/community_packs/purchaseCommunityPack.ts` (7), `app/flashcards/cardPackShardPurchase.ts` (6),
`app/flashcards/useCollectionData.ts` (5), `app/club_screen.tsx` (5).

Распределение тонов по местам вызова: `error` ≈ 29, `success` ≈ 24, `info` ≈ 19, `reward` ≈ 5, `warning` ≈ 4.
`reward` и `warning` — почти не используются, хотя ради `warning` заводили отдельный тон и звук
(`ActionToast.tsx:36-41`).

### 1.3. `components/OverlayArbiter.tsx` + `overlay_arbiter_core.ts` — очередь верхнего уровня

Тосты живут в общей очереди с модалками. Ключи в приоритете (`overlay_arbiter_core.ts:37-88`):

```
… lessonResultsSequence → lessonCompleteNotif → collectibleDrop → reviewPrompt →
shardsEarned → achievementToast → coachToast → actionToast → coinsMigration → perfectWeekReward
```

`actionToast` — **предпоследний**. Он пропускает вперёд буквально всё, включая пользовательские модалки,
которые закрывает только человек.

Сторож H-ARBITER (`OverlayArbiter.tsx:151-165`) отбирает слот через 15 с, но **только** у ключей из
`FORCE_EVICTABLE_KEYS` (`overlay_arbiter_core.ts:102-114`): `shardsEarned`, `achievementToast`, `coachToast`,
`actionToast`, `boonActivated`. Крупные модалки не выселяются намеренно (`OverlayArbiter.tsx:145-150`).

**Следствие:** пока открыто любое окно, которое юзер читает (level-up + сундук, праздник, пейвол),
`actionToast` голодает неограниченно долго — а его очередь при этом обрезается до 2 элементов
(`ActionToast.tsx:134, 269`). Тост «покупка прошла» может опоздать на минуту или быть выброшен.

`achievementToast` ещё и попал в `NATIVE_MODAL_KEYS` (`overlay_arbiter_core.ts:158`) — из-за вложенной
детальной модалки. Это добавляет ему 360 мс `NATIVE_MODAL_HANDOFF_GAP_MS` (`OverlayArbiter.tsx:58`)
на каждый переход слота, хотя сама плашка — обычный `Animated.View`.

**Кто вне арбитра.** Из 21 файла с `useOverlayVisible` тостовых — четыре. Модалки `ReportUserModal`,
`PlayerProfileModal`, `ReportPackModal`, `CertificateNameModal`, `ThemedConfirmModal` **не регистрируются**
в арбитре (проверено grep'ом: 0 вхождений в каждом). Они рендерятся нативным `<Modal>`, то есть в
отдельном системном окне поверх дерева. Глобальный `ActionToast` при этом слот получит, отрисуется —
и окажется **под** нативной модалкой, невидимым.

Живой пример: `components/ReportUserModal.tsx:103-108` эмитит `error`-тост в ветке catch и при этом
**не закрывает** свою модалку (`setLoading(false); setDone(false);` — строки 96-97). Юзер видит только
хаптик-удар, текст ошибки не появляется нигде. Ровно из-за этой дыры и существует `InGameToast` —
локальный клон тоста, который умеет рисоваться внутри `PlayerProfileModal` (`PlayerProfileModal.tsx:2480`).

---

## 2. Каталог поверхностей

### Группа A — глобальные, смонтированы в `app/_layout.tsx`

Порядок монтирования: `_layout.tsx:3688-3701` (`AchievementToast`, `ActionToast`, хосты),
`_layout.tsx:3292` (`PromoBanner` — в потоке, над стеком навигации), `_layout.tsx:3462` (`OfflineBanner`).

---

#### A1. ActionToast — `components/ActionToast.tsx` (427 строк)

Единственный «настоящий» тост-хаб проекта.

* **Позиция:** снизу, `bottom = useGlobalBottomOverlayOffset()` (строка 321). Хук
  (`hooks/use-global-bottom-overlay-offset.ts:46-61`) считает `max(bottomInset,12) + tabBarHeight(на табах) + 8`.
  Горизонталь: `paddingHorizontal: 14` у host (373-375), `maxWidth: 560` у карточки (379).
* **Вход:** `requestAnimationFrame` (строка 202 — обход Fabric-краша `connectAnimatedNodeToView`, объяснено в 164-168),
  затем параллельно `Animated.spring(y: 120→0, tension 250, friction 22)` = `MOTION_SPRING_LEGACY.toast`
  (`constants/motion.ts:48`) и `Animated.timing(opacity 0→1, 240 мс)` = `MOTION_DURATION.normal` (строки 204-212).
* **Auto-dismiss:** `AUTO_DISMISS_MS = 3200` (строка 132). Выход: `timing(y → 120, 240 мс)` + `timing(opacity → 0, 180 мс)`
  (строки 216-219). Прозрачность гаснет **быстрее**, чем движение — плашка «истаивает и потом доезжает».
* **Очередь:** `MAX_QUEUE = 2` (134). При переполнении выбрасывается **самый старый** ожидающий
  (`queueRef.current.shift()` — 269), новый встаёт в хвост. Следующий тост стартует через `requestAnimationFrame`
  после размонтирования предыдущего (235-238) — визуальной паузы между тостами нет, они «перещёлкиваются».
* **Дедуп:** три слоя — `SAME_TOAST_COOLDOWN_MS = 1600` после скрытия того же ключа (139, 251-258),
  игнор совпадения с текущим (259), игнор совпадения с уже стоящим в очереди (260). Ключ =
  `type + '' + messageRu` (141-144) — то есть **украинский/испанский варианты одного тоста
  считаются одинаковыми** (это осознанно, комментарий 135-138).
* **Свайп/тап:** **нет вообще**. `pointerEvents="none"` (строка 326). Тост нельзя ни закрыть, ни отложить,
  ни нажать. Кнопки закрытия нет (`closeBg` из токена не используется).
* **Варианты:** 5 тонов (42). Различаются: глиф Ionicons + надзаголовок (64-130), хаптика, звук.
  **Цветом не различаются** (см. 1.1).
* **Хаптика** (172-179): `error|warning → hapticError()`, `success|reward → hapticSuccess()`, `info → hapticSoftImpact()`.
  При этом `hapticWarning()` в проекте существует (`hooks/use-haptics.ts:119`) и используется в трёх
  других местах (`app/LeagueResultModal.tsx:240`, `components/onboarding_aha/ChipsAssembly.tsx:162`,
  `components/onboarding_aha/SpeechBeat.tsx:174`) — но не в тостах.
* **Звук** (187-193): `soundDirector.request(payload.soundEventId ?? TOAST_SOUND_EVENTS[type])` c
  `dedupeKey`, `deferAfterVoice: true`, `queueIfBusy: true`, `rateLimit {4 старта / 1000 мс}`.
  Карта: `pm.system.success | pm.system.error_recoverable | pm.system.info | pm.system.warning | pm.reward.small` (44-50).
* **Геометрия:** `minHeight 66`, `borderRadius` из токена (335) поверх статического 16 (381),
  `paddingVertical 12`, `paddingLeft/Right 16`, `gap 12` (382-387). Акцент-рейка `width: 3`,
  `top/bottom: 11`, скруглена только справа (394-402). Иконочный бейдж `38×38 r12` (403-410).
  Надзаголовок 12 px / 800, текст 15/20 / 700 (416-425), `numberOfLines: 3` (357).
* **Проблемы:**
  1. Голодание в арбитре (см. 1.3) + очередь на 2 → тост может опоздать или пропасть.
  2. `pointerEvents="none"` — «Отменить»/«Открыть» в тосте невозможны в принципе. Из-за этого
     появились локальные снекбары с действиями (см. B6).
  3. `borderColor` мёртв (см. 1.1) — в светлой теме `sagePorcelain` карточка `#FCFDF9→#E1E5DC`
     на белом фоне разделена только тенью `rgba(35,50,43,0.14)`.
  4. Ошибка и успех отличаются только глифом; при быстром взгляде красный/зелёный сигнал отсутствует.
  5. `numberOfLines: 3` при `minHeight: 66` — длинный локализованный текст (например tr/pl из
     `StreakRiskToastHost.tsx:52-53`) обрезается многоточием.

---

#### A2. AchievementToast — `components/AchievementToast.tsx` (641 строка) + `components/AchievementContext.tsx` (172)

* **Позиция:** снизу, `bottom = useGlobalBottomOverlayOffset()` (строка 396), `left/right: 14`, `zIndex: 9999` (541-543).
* **Вход:** rAF (215) → параллельно `spring(translateY 160→0, MOTION_SPRING.toast)`,
  `timing(opacity, 240)`, `spring(scale 0.88→1, MOTION_SPRING.toast)` (217-231).
  **Это единственный тост со scale-входом.**
* **Auto-dismiss:** `AUTO_DISMISS_MS = 3800` (строка 40) — на 600 мс дольше ActionToast без объяснения.
  Выход `animateOut`: `timing(translateY → 160, 320 мс = MOTION_DURATION.slow)` + `timing(opacity → 0, 240 мс)` (251-254).
  **Третий, отдельный выход** для внешнего скрытия: `240 / 180` (169-172). Итого у одного компонента
  два разных сценария ухода с разными таймингами.
* **Очередь:** своя, в контексте. `showAchievement` (105-138) — дедуп по `id`; если тост уже показывается,
  новое достижение уходит в `queue`. При `queue.length >= TOAST_SUMMARY_THRESHOLD (=3)` вся очередь
  схлопывается в один сводный тост «Открыто N достижений» (128-134). Пауза между тостами —
  `setTimeout(showNext, 450)` (102). Сторож жизни тоста `TOAST_MAX_LIFETIME_MS = 12000` (12, 152-159).
* **Свайп:** есть, `PanResponder` (98-148). Захват при `|dx|>8 || |dy|>8` (101). Порог закрытия
  `SWIPE_THRESHOLD = 30` px **или** `|v| > 0.5` (112-113). Улёт: `dx*3` по X, `±200` по Y, 180 мс (116-121).
  Возврат — `spring(tension 80, friction 10)` (131-134) — **не токен**, локальные числа.
  Во время драга таймер сбрасывается (104) и перезапускается после отпускания (135).
* **Тап:** есть (408-410). Обычное достижение → открывает вложенный нативный `<Modal animationType="fade">`
  (456-457) с `BadgeShield`, «Поделиться» и «Закрыть». Сводный тост → `router.push('/achievements_screen')` (271).
* **Варианты:** 2 (обычный / сводка). Цвет берётся из `CAT_COLOR[category]` или `t.gold` для сводки (383).
* **Хаптика/звук:** `hapticSuccess()` + `soundDirector.request('pm.reward.achievement')` — **ровно один раз на тост**,
  через `cuedToastIdRef` (191-199). Причина защиты подробно описана в 73-82 (звук самопроизвольно
  повторялся из-за выселений арбитром).
* **Токены темы:** `t.bgCard`, `t.textSecond`, `t.textPrimary`, `t.textMuted` (414-446). **`themedToastChrome` не используется** —
  и градиента у плашки нет, только плоский `bgCard`. Рядом с ActionToast (3-стоповый градиент + рейка)
  выглядит как из другого приложения.
* **Геометрия:** `r20` (548), `paddingVertical 12 / paddingHorizontal 14` (549-550), `gap 12` (551),
  иконочный слот `64×64 r16` (559-566), картинка внутри `54×54` (43, 567-570), подпись 11 px uppercase
  `letterSpacing 0.4` (575-580), «✦» 20 px `opacity 0.5` (588-591).
* **Проблемы:**
  1. Три набора таймингов ухода в одном файле (240/180, 320/240, свайп 180).
  2. `borderColor: t.textSecond` (415) при отсутствии `borderWidth` в `s.card` — мёртвый.
     `t.textSecond` в роли цвета рамки — сам по себе странный выбор токена.
  3. Геометрия расходится с ActionToast по всем осям: r20 vs r16-20, слот 64 vs 38, отступы 14 vs 16, gap равны.
  4. `sparks: '✦'` — единственный текстовый декоративный глиф среди всех тостов.
  5. `transition={0}` у `ExpoImage` (429) — арт достижения появляется мгновенным щелчком поверх
     плавно въезжающей карточки.

---

#### A3. OfflineBanner — `components/OfflineBanner.tsx` (138 строк)

* **Позиция:** сверху, `top: insets.top + 4` (100), `left/right: 12`, `zIndex: 9999` (119-123).
* **Вход:** только `timing(opacity 0→1, 220 мс)` (75-79). **Движения нет** — плашка проявляется на месте.
* **Auto-dismiss:** `AUTO_HIDE_MS = 10_000` (21) — самый долгий тост проекта.
  Выход: `timing(opacity → 0, 180)` + `timing(translateY → -80, 180)` (50-53). Вход и выход **несимметричны**:
  влетает без сдвига, улетает вверх.
* **Свайп:** вверх, `PanResponder`. Захват `|dy|>6 && |dy|>|dx|` (59), тянется только вверх (62),
  закрытие при `dy < -24` (65), иначе `Animated.spring` **без параметров** (68) — дефолтная пружина RN.
* **Очередь:** нет. Единственный экземпляр, состояние `offline && !dismissed` (37).
  Сброс `dismissed` при возврате сети (43).
* **Токены темы:** **не использует ни одного**. Фон `rgba(30,30,36,0.92)`, текст `rgba(255,255,255,0.92)`,
  бордюр `rgba(255,255,255,0.18)` при `borderWidth: 0` — всё захардкожено (128-136).
  На светлой теме `sagePorcelain` это тёмная плашка на фарфоровом фоне.
* **Хаптика/звук:** нет. Потеря сети происходит беззвучно и без вибрации.
* **Геометрия:** `r10`, `paddingVertical 6 / paddingHorizontal 12`, шрифт `12.5 / 600` (125-137) —
  самая мелкая типографика среди всех тостов.
* **`lang` приходит пропом**, не из контекста (комментарий 26-27) — единственный такой случай.

---

#### A4. PromoBanner — `components/PromoBanner.tsx` (255 строк)

Не тост, а remote-config кампания, но живёт в том же слое.

* **Позиция:** в потоке `_layout.tsx:3292`, **над** всем стеком навигации; `paddingTop: max(insets.top, 8)`,
  `zIndex: 20`, `elevation: 20` (196-203). Толкает весь контент вниз — поэтому появление/исчезновение
  обёрнуто в `animateNextLayoutTransition()` (108, 143).
* **Вход:** **анимации нет**. Компонент просто монтируется (166).
* **Auto-dismiss:** нет. Живёт до `until`-даты (`campaign_expiry_scheduler`, 98-111) или до ручного закрытия.
* **Свайп:** горизонтальный. Захват `|dx| > 14 && |dx| > |dy|` (150), закрытие при `|dx| > 84` (155),
  иначе `spring(friction 7)` (159). Улёт при закрытии — `timing(translateX → 420, 180 мс)` (135-139),
  то есть **всегда вправо**, независимо от направления свайпа.
* **Токены темы:** только `monoIcon(themeMode, '#f3e8ff')` для текста/иконки (180, 250).
  Фон `#3b1d6e` и рамка `#5b21b6` — хардкод (199-201) во всех 13 темах.
* **Дисмисс персистится** по фингерпринту кампании (`campaignDismissalKey`, 60, 134).
* **Хаптика/звук:** нет.

---

#### A5. ThemedBlockingAlertHost — `components/ThemedBlockingAlertHost.tsx` (35) + `app/themed_blocking_alert_queue.ts` (46)

Формально не тост — блокирующий алерт, но это единственная **строгая FIFO-очередь** в проекте
(`themed_blocking_alert_queue.ts:8, 23-32`), и она стоит на 11-й позиции приоритета (`overlay_arbiter_core.ts:54`),
то есть **выше всех тостов**. Рендерится через `ThemedChoiceModal`. Без авто-закрытия.

---

### Группа B — headless-эмитенты (рендерят `null`, кормят ActionToast)

| # | Файл | Условие | Тон | Кулдаун |
|---|---|---|---|---|
| B1 | `components/GlobalShardsEarnedHost.tsx` (67) | событие `shards_earned` (`:46`) | `reward` (`:55`) | нет — весь дедуп внутри ActionToast (комментарий `:16`) |
| B2 | `components/GlobalFriendGiftHost.tsx` (106) | поллинг подарков (`:45-86`) | `reward` + `soundEventId: 'pm.social.gift_received'` (`:75-76`) | `POLL_INTERVAL_MS = 5 мин` (`:24`) |
| B3 | `components/StreakRiskToastHost.tsx` (80) | ≥17:00 и цепочка сгорит (`:20, 32-39`) | `warning` (`:45`) | 1 раз в день (`:34-36`) |
| B4 | `components/BillingIssueToastHost.tsx` (108) | billing issue в RevenueCat (`:48`) | `warning` (`:73`) | `COOLDOWN_MS = 3 дня` (`:21`) |
| B5 | `components/EntitlementExpiredHost.tsx` (340) | подписка истекла | `action_toast` на `:274` + собственная модалка (ключ `entitlementExpired`) | — |

B1 — важный исторический случай: раньше это была центральная `ShardsEarnedModal` с бэкдропом 82 % и
автозакрытием 40 с; переведена в тост по предыдущему аудиту (`GlobalShardsEarnedHost.tsx:12-16`).
Единственный след — ключ `shardsEarned` всё ещё висит в приоритете арбитра (`overlay_arbiter_core.ts:75`)
и в `FORCE_EVICTABLE_KEYS` (`:103`), хотя его больше никто не запрашивает.

---

### Группа C — экранные тосты

---

#### C1. MedalToast — `components/MedalToast.tsx` (476 строк) + драйвер в `app/lesson1.tsx:3577-3634, 3863-3875`

Самая «дорогая» плашка проекта — и самая рассогласованная с системой.

* **Позиция:** `position: absolute`, `left/right: 20`, `bottom` — проп со **значением по умолчанию 120**
  (`MedalToast.tsx:211`). Драйвер в `lesson1.tsx:3865-3874` `bottom` **не передаёт** → всегда 120 px,
  безотносительно `insets.bottom` и высоты клавиатуры. `zIndex` **не задан вообще** (405-418) —
  порядок держится только позицией в дереве.
* **Вход** (`lesson1.tsx:3597-3601`): `Animated.spring(anim 0→1, friction: 6)` — `tension` не указан,
  значит дефолтный RN 40. Это **пятый** уникальный набор пружины в проекте.
  Интерполяции: `translateY 22→0`, `scale 0.92→1`, `opacity 0→1` (`MedalToast.tsx:286-289`).
* **Auto-dismiss:** `Animated.delay(2200)` → `timing(anim → 0, 350 мс)` (`lesson1.tsx:3599-3600`).
  Итого показ 2200 мс — **самый короткий** из «крупных» тостов, при том что в плашке три строки текста
  (надзаголовок + заголовок + подзаголовок, `MedalToast.tsx:358-374`).
* **Свайп:** самый проработанный в проекте (`MedalToast.tsx:231-266`). Захват `|dx|>7 || dy<-7` (233-234).
  Закрытие при `|dx|>=50 || dy<=-38 || |vx|>=0.65 || vy<=-0.65` (240-243). Улёт `±420` по X / `-140` по Y
  за 170 мс (248-258), возврат — `spring` без параметров (245). **Важно:** `useNativeDriver: false`
  на всём драге (236, 245, 251, 256) — перетаскивание идёт через JS-мост, тогда как вход/выход
  (`anim`) — на нативном драйвере. Смешанный драйвер на одной плашке.
* **A11y:** `accessibilityRole="alert"`, `accessibilityActions: [{name:'dismiss'}]` (296-302).
  Единственный тост с кастомным accessibility-действием.
* **Варианты:** 6 (bronze/silver/gold × promoted/demoted), тексты на 8 языках (70-201).
* **Хаптика/звук:** **нет ни того, ни другого.** Смена ранга — самое «наградное» событие внутри урока —
  проходит абсолютно молча.
* **Тема — критическая ошибка:** `getMedalToastThemeStyle(themeMode ?? 'minimalDark')` (273).
  `components/medalToastThemeStyles.ts` содержит **13 выверенных палитр** (строки 32-343, у каждой
  своя `signature`: `graphite-blue-steel`, `olive-noir-champagne`, `graphite-champagne`…).
  Единственный call-site (`lesson1.tsx:3865-3874`) проп `themeMode` **не передаёт**.
  → **Во всех 13 темах медальная плашка рисуется палитрой `minimalDark`** (сине-стальной акцент `#6EA8FF`).
  346 строк дизайн-работы не доходят до экрана.
* **Мёртвый проп:** `isLightTheme: boolean` объявлен обязательным (45), деструктурируется (209)
  и **нигде в теле не используется** (grep по файлу даёт только эти две строки). `lesson1.tsx:3870`
  передаёт `isLightTheme={false}` — константу.
* **Геометрия:** карточка `r22`, `paddingHorizontal 18 / paddingVertical 16`, `gap 14` (419-428).
  Плашка медали `64×64 r32` с `borderWidth: 1` (444-451) — **единственная реальная рамка среди тостов**.
  Картинка медали `70×70` (452-455) — **больше слота на 6 px**, без `overflow: hidden`, то есть
  медаль намеренно (?) вылезает за круг на 3 px с каждой стороны. Ни в одном другом тосте такого нет.
  Типографика: `10.5 / 800 / letterSpacing 1.4` (459-464), `17 / 800` (465-470), `12.5 / 500 / lh 16` (471-475) —
  дробные кегли, больше нигде не встречающиеся.
* **Тень:** нейтральная `#000 / 0.28 / r16 / y8` (413-417); комментарий 409-412 фиксирует, что цветное
  свечение по акценту медали было **убрано** — то есть плашка сознательно лишена «дорогого» ореола,
  который есть у остального наградного UI.

---

#### C2. CoachToast — `components/CoachToast.tsx` (357 строк)

Показ на трёх экранах: `app/lesson_complete.tsx:1773-1800`, `app/review.tsx:1458-1483`, `app/lesson_words.tsx:3172+`.

* **Позиция:** `bottom: 24` **захардкожено**, `left/right: 16`, `zIndex: 100` (276-282).
  `useGlobalBottomOverlayOffset()` **не используется** → на экранах с таб-баром плашка наезжает на навигацию.
  `zIndex: 100` против 9997 у ActionToast — если оба совпадут, коуч уйдёт под системный тост.
* **Вход:** `spring(slideAnim 120→0, tension 80, friction 10)` + `timing(opacity, 250 мс)` (110-113).
  `tension 80 / friction 10` — **не токен**, локальные числа (совпадают со «возвратом свайпа» в AchievementToast).
* **Auto-dismiss:** `AUTO_DISMISS_MS = 8000` (47) — **в 2.5 раза дольше ActionToast**.
  Выход: `timing(slide → 120, 220 мс)` + `timing(opacity → 0, 200 мс)` (96-99). Ещё одна пара уникальных чисел.
* **Свайп:** **нет.** Есть крестик (228-230) и CTA-кнопка «Объяснить» (248-266).
  Единственный тост с полноценной кнопкой действия.
* **Очередь:** нет. Управляется локальным `useState` экрана. Регистрируется в арбитре как `coachToast`
  (78) — но с `ownState = true` **всегда**, то есть слот запрашивается сразу при монтировании.
* **Хаптика:** только на тап CTA (`hapticTap()`, 120). **На появление — ничего.**
* **Звук:** нет.
* **Токены:** `t.bgCard`, `t.border`, `t.accentBg`, `t.accent`, `t.textPrimary`, `t.textSecond`,
  `t.textMuted`, `t.correctText` (215-253). `themedToastChrome` не используется, градиента нет.
* **Геометрия:** `r16`, `paddingVertical 13 / paddingHorizontal 14`, `gap 9` (283-288) —
  третий уникальный набор отступов. Иконочный слот `38×38 r12` (300-306) — **совпадает с ActionToast**,
  единственная совпадающая метрика между двумя тостами. Тень `#000 / 0.28 / r18 / y8` (289-292).
* **Мёртвые токены:** `borderColor: t.border` при `borderWidth: 0` (215, 285); `focusPill` —
  `borderColor` при `borderWidth: 0` (239, 329).
* **Проблема самого высокого порядка:** 8-секундная плашка с кнопкой, которая **сама уходит**,
  пока юзер читает заголовок в две строки + описание в две строки (224, 233). Никакого «пауза при
  наведении/касании» нет — таймер ставится один раз в эффекте (115) и не сбрасывается ничем,
  кроме размонтирования.

---

#### C3. InGameToast — `components/InGameToast.tsx` (78 строк)

Локальный клон тоста, живущий внутри `PlayerProfileModal` (`PlayerProfileModal.tsx:2480-2484`).

* **Позиция:** **сверху**, `top: 60`, `left/right: 24`, `zIndex: 999999` (62-67) — самый высокий zIndex проекта.
* **Вход/выход:** `Animated.sequence`: `timing(0→1, 250)` → `delay(duration)` → `timing(1→0, 250)` (23-27).
  Идеально симметрично — **единственный симметричный тост в проекте**.
  Интерполяция `translateY: -20 → 0` (49).
* **Auto-dismiss:** `duration = 3000` по умолчанию (15); `PlayerProfileModal` его не переопределяет.
  Полный цикл = 250 + 3000 + 250 = 3500 мс.
* **Свайп/тап:** нет. И `pointerEvents` **не выставлен** → по умолчанию `'auto'`, то есть плашка
  на `top: 60` шириной во весь экран **перехватывает касания** в своей зоне, пока висит.
  У ActionToast эта же проблема закрыта явным `pointerEvents="none"` (`ActionToast.tsx:326`).
* **Варианты:** проп `type?: 'error' | 'info'` (12) объявлен, прокидывается из
  `PlayerProfileModal.tsx:2482` — и **выброшен**: `void type;` (`InGameToast.tsx:42`).
  error и info выглядят и звучат **абсолютно одинаково**.
* **Хаптика/звук:** нет.
* **Токены:** `themedToastChrome(themeMode, t)` (43) — использует `cardColors`, `title`, `shadowColor`;
  `border` мёртв (нет `borderWidth`).
* **Геометрия:** `r16`, `paddingVertical 14 / paddingHorizontal 20` (68-71), текст `f.body / 700 / center` (52).
  Иконки нет, надзаголовка нет, акцент-рейки нет — от ActionToast остался только фон-градиент.
* **Тень:** `shadowOpacity 0.25 / shadowRadius 10` (74-75) — против `noAndroidOutline` (76),
  то есть на Android тени нет вообще.

---

#### C4. BonusXPCard — `components/BonusXPCard.tsx` (228 строк), вызов `app/lesson_complete.tsx:1729-1736`

* **Позиция:** `position: 'center'` в вызове (1733) → `top: '50%', marginTop: -40` (182-185).
  **Единственная временная плашка в центре экрана.** `zIndex: 1000` (179).
* **Вход:** три параллельные пружины — `slideAnim (friction 7, tension 50)`, `opacityAnim (friction 7)`,
  `scaleAnim 0.8→1 (friction 7, tension 50)` (69-87). Шестой уникальный набор пружины.
  `translateY` интерполируется `50→0` для center, `100→0` для bottom (126-129).
* **Auto-dismiss:** `duration = 2000` (32, подтверждено вызовом 1734). Выход: `timing(opacity → 0, 200)` +
  `timing(scale → 0.9, 200)` (50-60) — **без обратного движения**, карточка схлопывается на месте.
* **Тап:** закрывает (147). Свайпа нет.
* **Хаптика:** `hapticMediumImpact()` (91). **Уникальная** — больше ни один тост её не использует.
* **Звук:** комментарий `// Звуковой эффект` (89) стоит над пустотой — звука нет.
  В шапке файла (`:6`) он тоже обещан.
* **Токены:** частично. `t.textPrimary`, `t.textMuted`, `t.bgCard` для светлой темы; но фон в `styles.card`
  захардкожен `#1a1a2e` (197), а tier-цвета — набор хардкодов `#4ADE80 / #FB923C / #A78BFA` (115-117)
  плюс отдельные ветки для gold/olive/light (104-114).
* **Геометрия:** `r16`, `marginHorizontal 24`, `paddingVertical 12 / paddingHorizontal 20` (189-196).
  `elevation: 8` (202) **без** `noAndroidOutline` — единственный тост, где этой защиты нет.
* **Текст «Нажми»** (166) — 10 px, `opacity 0.5` — микроподсказка, которой нет ни у одного другого тоста,
  хотя тапом закрываются также AchievementToast и RankChangeBanner.

---

#### C5. RankChangeBanner — `components/RankChangeBanner.tsx` (183), вызов `app/club_screen.tsx:1563-1571`

* **Позиция:** **в потоке**, не absolute. `marginBottom: 12` (153), внутри скролла клуба между
  хабом лиги и блоком гонки. Уезжает вместе со скроллом.
* **Вход:** `timing(anim 0→1, 280 мс)`, `translateY: -12 → 0` (38, 152) — движение **сверху вниз**,
  единственный такой вход среди временных плашек.
* **Auto-dismiss:** `duration = 5000` по умолчанию (22), клуб его не переопределяет.
  `Animated.sequence: [timing(280), delay(5000), timing(240)]` (37-43).
* **Тап:** закрывает через `timing(→0, 200)` + `onClose` (157-159). Свайпа нет.
  Крестик «×» — **текстовый символ** (173), а не иконка и не кнопка: у него нет `onPress`,
  нажатие работает только потому, что вся плашка — `Pressable`. `hitSlop` нет.
* **Токены темы:** **ноль**. Вся палитра захардкожена (142-146):
  `bg #10381e / #3a2a14`, `border #34d399 / #f59e0b`, `title #34d399 / #fbbf24`, `body #D8FBE8 / #FFE9B5`,
  `close rgba(255,255,255,0.68)`. Из темы берётся только шкала шрифтов `f` (25).
  В `sagePorcelain` — тёмно-зелёная плашка на фарфоре.
* **`borderWidth: 0`** (163) при заданном `borderColor` (162) — мёртвый.
* **Хаптика/звук:** нет. Обгон соперника в лиге происходит беззвучно.
* **Геометрия:** `r14`, `paddingHorizontal 14 / paddingVertical 12` (164-166).
* **Очередь:** нет; `rankDelta` — одиночный `useState` (`club_screen.tsx:417`).

---

#### C6. UndoDeleteSnackbar — `app/flashcards/CollectionListView.tsx:681-750`, драйвер `app/flashcards/useCollectionData.ts:656-742`, вызов `app/flashcards_collection.tsx:805-816`

Единственный **настоящий снекбар** (сообщение + действие отмены) в проекте.

* **Позиция:** снизу, `bottom = max(insets.bottom,8) + 14 + (sectionRoot ? FC_TABBAR_HEIGHT : 0)`
  (`flashcards_collection.tsx:807-810`) — своя формула, дублирующая логику `useGlobalBottomOverlayOffset`
  другими числами. `left/right: 14`, `zIndex: 90` (699-704).
* **Вход:** `Reanimated` `entering={FadeInDown.duration(220)}` (697). **Единственный Reanimated-вход
  среди живых тостов.**
* **Выход:** **отсутствует.** `exiting` не задан; по таймауту `setUndoEntry(null)`
  (`useCollectionData.ts:686-688`) просто размонтирует узел → снекбар **исчезает мгновенно, щелчком**.
  То же при нажатии «Вернуть» (`:706`).
* **Auto-dismiss:** 5000 мс (`useCollectionData.ts:688`). Новое удаление **заменяет** предыдущий
  снекбар через `undoKeyRef` (683-687) — то есть отменить можно только последнюю карточку.
* **Действие:** кнопка «Вернуть» с `hitSlop 10` (733), `fcHaptic('tap')` при нажатии (`useCollectionData.ts:707`).
* **Хаптика на появление:** нет.
* **Токены:** `t.bgCard`, `t.border`, `t.textPrimary`, `t.textMuted`, `t.accent` (711-743). Градиента нет.
* **Геометрия:** `r16`, `paddingHorizontal 16 / paddingVertical 13`, `gap 12` (714-716).
  `borderWidth: 1` (713) — **реальная рамка**, в отличие от всех остальных тостов.
  `elevation: 6` (721) без `noAndroidOutline` при непрозрачном `t.bgCard` — приемлемо, но непоследовательно.
* **Ошибки удаления/восстановления** уходят в глобальный ActionToast (`useCollectionData.ts:690-697, 733-740`) —
  то есть на одном экране успех показывается локальным снекбаром, а ошибка прилетает системным тостом
  с другой геометрией, из другой точки экрана.

---

#### C7. «Верный перевод» — `app/flashcards_swipe.tsx:2127-2158` (логика), `:3213-3250` (рендер), `:3542-3556` (стиль)

В комментарии автор сам называет это «короткий неблокирующий toast» (`:2146`).

* **Позиция:** сверху, `top: 54` (компакт) / `70` (обычный) — `:3223`. `left/right: 0`, `zIndex: 60`, `elevation: 60` (3544-3547).
* **Вход/выход:** `timing(0→1, 180)` / `timing(1→0, 180)` (2139-2152), `translateY: -8 → 0` (3228-3231).
  Симметрично, но **180 мс** — ни с чем в проекте не совпадает.
* **Auto-dismiss:** 3200 мс (2157) — совпадает с ActionToast, единственное численное совпадение
  между двумя независимыми поверхностями.
* **Интерактив:** `pointerEvents="none"` (3215). Ни тапа, ни свайпа.
* **A11y:** `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` + собранный
  `accessibilityLabel` (3217-3219) — **лучшая a11y-разметка среди всех тостов проекта**.
* **Токены:** `t.correctBg` (фон), `t.correct` (иконка/подпись/тень), `t.textPrimary` (3224-3244).
  То есть плашка **всегда зелёная**, вне зависимости от темы — но через токены, а не хардкод.
* **Геометрия:** `minHeight 58`, `r16`, `paddingVertical 10 / paddingHorizontal 12`, `gap 10` (3548-3554).
* **Хаптика/звук:** нет.

---

#### C8. Подсказка свайпа — `app/flashcards_swipe.tsx:2098-2115` (логика), `:2877-2903` (рендер), `:3573-3586` (стиль)

* **Позиция:** **в потоке**, между прогресс-баром и стопкой карточек. `marginBottom: 10` (3580).
* **Вход/выход:** `timing(0→1, 300)` / `timing(1→0, 220)` (2108, 2100), `translateY: -8 → 0` (2884).
* **Auto-dismiss:** **6000 мс** (2110). Комментарий прямо объясняет: «дольше, чем delete-hint (5с),
  т.к. текста тут больше» — то есть длительность подбиралась вручную под контент, без шкалы.
* **Интерактив:** крестик с `hitSlop 12` (2894-2901); также закрывается первым свайпом карточки (2329).
* **Персист:** `flashcardsSwipeHintSeenKey` в AsyncStorage (2103) — одноразовая подсказка.
* **Токены:** `glassFill(t.bgSurface, 0.5)` (2886), `t.textSecond`, `t.textMuted`.
  **Единственная временная плашка проекта, использующая `constants/glassSurfaceFill.ts`.**
* **Геометрия:** `r16`, `paddingVertical 10 / paddingHorizontal 14`, `gap 8`, тень `#000/0.08/r8/y2` (3573-3586).

---

#### C9. Подсказка удаления — `app/flashcards/CollectionListView.tsx:258-287` (логика), `:521-547` (рендер)

* **Позиция:** в потоке, `marginHorizontal 16 / marginTop 8 / marginBottom 4` (529).
* **Вход:** `timing(0→1, 350)` (271) → по завершении запускается **бесконечный пульс**
  `Animated.loop(scale 1 ↔ 1.025, 700/700 мс)` (273-279). **Единственная временная плашка с
  бесконечным циклом.** Выход: `timing(→0, 250)` (262).
* **Auto-dismiss:** 5000 мс (282).
* **Интерактив:** крестик с `hitSlop 12` (543).
* **Токены:** `t.bgSurface`, `t.border` (`borderWidth: 1` — **живая рамка**), `t.textSecond`, `t.textMuted` (531-535).
* **Геометрия:** `r12`, `paddingHorizontal 14 / paddingVertical 10`, `gap 10` (530-533).
* **Локализация только 3 языка** (537-541: ru/uk/es), тогда как проект поддерживает 8. Тот же дефект —
  в `UndoDeleteSnackbar` (726, 744) и в `flashcards_card_editor.tsx:509-513`.

---

#### C10-C13. Четыре независимых «+N XP» тоста

Одинаковая цель, четыре реализации, ни одна не совпадает с другой.

| Экран | Файл:строки (анимация / рендер) | Тайминг | Позиция | Геометрия | Цвет |
|---|---|---|---|---|---|
| **C10** Урок (фразы) | `app/lesson1.tsx:3051-3055` / `:1053-1057` | 200 → hold 900 → 300 | inline `absolute`, `right: 0, bottom: '100%'` над счётчиком | без плашки, только текст | `#F5A623` хардкод |
| **C11** Слова | `app/lesson_words.tsx:2798-2808` / `:3091-3102` | 420 → hold 1000 → 480 | `absolute top: 100`, `alignSelf: center`, `zIndex 99999` | пилюля `r20`, `padH 20 / padV 10` | `#FFC800` / `#92400E` (light) |
| **C12** Предлоги | `app/preposition_drill.tsx:188-198` / `:804-825` | 420 → hold 1000 → 480 | `absolute bottom: max(24, inset+18)`, `zIndex 99999` | пилюля `r20`, `padH 20 / padV 10` | `#FFC800` / `#92400E` |
| **C13** Непр. глаголы | `app/lesson_irregular_verbs.tsx:324-334` / `:654-669` | 420 → hold **1200** → 480 | `absolute top: 50`, `zIndex 999` | пилюля `r20`, `padH 18 / padV 8` | `#FFC800` / `#92400E` |

* C11/C12 — код-близнецы (`rise 44`, `Easing.out(cubic)` вход, `Easing.in(cubic)` выход, `translateY → -12`),
  различаются только позицией и наличием `runId`-защиты (C11 — `lesson_words.tsx:2811, 2814`).
* C13 оборачивает `components/XpGainBadge.tsx` c `noInnerAnimation` (662-667), то есть у бейджа
  есть собственная анимация (`XpGainBadge.tsx:35-48`: 260/240 мс, `Easing.out(cubic)`), которая
  здесь **намеренно отключена** — а в `app/exam.tsx:1348`, `app/lesson_help.tsx:613`,
  `app/review.tsx:1410`, `app/flashcards/SessionResultScreen.tsx:139` тот же бейдж используется
  **с** внутренней анимацией. Пятая вариация одного и того же «+N XP».
* Ни один из четырёх не даёт хаптику и звук.
* Ни один не использует токены темы для цвета — жёлтый `#FFC800` / `#F5A623` захардкожен.

---

#### C14. AccountDeletedNotice — `components/AccountDeletedNotice.tsx` (146), вызов `components/CleanOnboarding.tsx:2121-2123`

Лучший по качеству движения объект в категории — и единственный с reduce-motion.

* **Позиция:** сверху, `top: insets.top + 10` (94), `left/right: 20`, `zIndex: 40` (114-122).
* **Вход:** `timing(0→1, ENTER_MS = 260, Easing.out(Easing.exp))` (22, 57-62), `translateY: -12 → 0` (97-99).
* **Выход:** `timing(1→0, EXIT_MS = 340, Easing.out(Easing.exp))` (23, 66-70).
  **Единственный тост с осознанной асимметрией** «быстрый вход, спокойный уход», и она задокументирована (21).
* **Auto-dismiss:** `ACCOUNT_DELETED_NOTICE_DURATION_MS = 3000` (`app/account_deleted_notice.ts:21`).
  Отсчёт начинается **после** завершения входа (63-65), а не параллельно с ним — единственный
  корректный порядок в проекте (у всех остальных таймер стартует одновременно с анимацией входа).
* **Reduce-motion:** полноценная ветка без анимации (46-54) через `hooks/use_reduce_motion`.
  **Единственный тост во всём проекте, где это учтено.**
* **A11y:** `accessibilityLiveRegion="polite"` + `pointerEvents="none"` (90-91).
* **Text-integrity:** использует `FlowText` с `provenance="authored"` (106) — запрет усечения (комментарий 104-105).
  Все остальные тосты режут текст `numberOfLines`.
* **Токены:** нет. `rgba(255,255,255,0.13)` / `rgba(19,31,56,0.10)` и `#E8ECF5` / `#101828` (123-143) —
  хардкод, но обоснованный (плашка живёт поверх онбординга, у которого своя палитра, комментарий 134).
* **Геометрия:** `r999` (пилюля), `paddingHorizontal 18 / paddingVertical 12` (123-128) —
  единственная полностью скруглённая плашка.
* **Хаптика/звук:** нет.

---

#### C15. FeedbackPlashka — `components/feedback/FeedbackPlashka.tsx` (141) — **МЁРТВЫЙ КОД**

Grep по всему репозиторию: **0 импортов и 0 использований** вне самого файла.

Это единственная поверхность категории, написанная на `react-native-reanimated`:
`withSpring(1, {damping: 16, stiffness: 180, mass: 0.9})` на вход (38, 53),
`withTiming(0, {duration: 200})` + `runOnJS(onHidden)` на выход (55-58), `translateY: 140 → 0` (65).
Токены: `t.correct/t.wrong/t.correctBg/t.wrongBg/t.bgCard` (69-70, 78). Геометрия `r20`,
`padding 16`, `accentBar width 5`, `iconDot 34 r17` (104-135).

Соседи по FeedbackKit живы: `ResultsSequence` (`app/lesson_complete.tsx:76, 1364`),
`VictoryBurst` (`lesson_irregular_verbs.tsx:884`, `lesson_help.tsx:622`, `preposition_drill.tsx:832`,
`lesson_words.tsx:3203`), `ComboRing` (`lesson1.tsx:1038`). А `ConfettiBurst` из `components/feedback/`
дублируется локальной копией в `app/pack_opening.tsx:103`.

---

### Группа D — inline-плашки без анимации

Все они выполняют роль уведомления, но не двигаются вообще: появляются и исчезают мгновенной сменой ветки JSX.

| # | Файл:строки | Что | Живёт | Токены |
|---|---|---|---|---|
| D1 | `app/(tabs)/home.tsx:2217-2275` | «Бонус за вход!» | до тапа по «×» (`:2273`) | **`themedToastChrome`** + `goldShadow(1)` для gold. `minHeight 74`, рейка `width 4`, слот `44 r14`, `padV 13 / padH 14`, `gap 12` |
| D2 | `app/(tabs)/home.tsx:2276-2301` | «С возвращением!» | до сброса флага | `glassFill(t.bgCard, 0.5)`, но рамка `#FF9500 + '88'` хардкод, `borderWidth: 1` |
| D3 | `app/(tabs)/home.tsx:2302+` | «Восстановить цепочку» | — | `glassFill`, рамка `#FF9500 + '99'` |
| D4 | `app/(tabs)/home.tsx:3203-3232` | «Не удалось загрузить данные» + кнопка «Обновить» | до успешной загрузки (`:1591`) | `glassFill(t.bgCard,0.46)`, `t.accent + '22'`; `fontSize: 13` литералом, не `f.*` |
| D5 | `app/(tabs)/friends.tsx:2542-2546` + рендер `:1880-1885`, `:3396-3401`, `:3571-3594` | `addFeedback` — **один state, три разных визуала**: строка с иконкой в модалке, строка в футере списка, градиентная пилюля в подарках | `setTimeout 2500 мс` (`:2545`) | `t.correct` / `friendGiftPillColors` |
| D6 | `app/settings_notifications.tsx:177`, рендер `:301-305` | «Сохранено» в accessory строки | `setTimeout 1400 мс` — **самая короткая нотификация проекта** | `t.correct`, `fontSize: 13` литералом |
| D7 | `app/ai_dialog_session.tsx:1986-2032` | «Системная плашка ошибки ИИ» + кнопка «Повторить» | до следующей отправки | `glassFill(t.bgSurface,0.46)`, `t.accent`, `r14` |
| D8 | `app/max_call_session.tsx:885-903` | Reconnect-баннер | пока `phase === 'reconnecting'` | `glassFill(t.bgSurface,0.46)`, `r12` |
| D9 | `app/flashcards_card_editor.tsx:490-516` | Предупреждение о дубликате карточки | пока есть дубль | `t.gold`, `t.goldBg`, `borderWidth: 1` — **живая рамка** |
| D10 | `app/referrals.tsx:565-567, 847-849` | Галочка «скопировано» на кнопке | `setTimeout 1600 мс` | `t.accentBg` / `t.accent` |
| D11 | `app/account_details.tsx:164-170, 283-285` | То же, другой таймер `COPY_FEEDBACK_MS` | | `surface.accent` |

**D5 — характерный случай:** одно значение `addFeedback` рендерится в трёх местах экрана
одновременно (условия `addModalOpen` / `giftTarget` разводят их не полностью), с тремя разными
композициями и весами шрифта (`600` на `:1883`, `700` на `:3399`, `800` на `:3590`).

---

### Группа E — постоянные, но «уведомляющие» (для полноты)

* `components/SaveProgressBanner.tsx` (438) — карточка на главной (`app/(tabs)/home.tsx:3024`).
  Вход: `timing(0→1, 520 мс, Easing.out(cubic))` (198-203) — **самый долгий вход в проекте**,
  с четырьмя производными интерполяциями: `translateY 18→0`, `scale 0.965→1`,
  `iconScale [0.82, 1.08, 1]`, `iconGlow 0→0.62` (226-229). **Выхода нет** — `applyVisibility(false)`
  просто размонтирует узел через `animateNextLayoutTransition()` (98-103). Порог показа: XP ≥ 1000,
  кулдаун дисмисса 7 дней (45-47).
* `components/MaintenanceGate.tsx`, `components/ForceUpdateGate.tsx` — полноэкранные гейты, не тосты.
* `components/TodaysBoonStrip.tsx`, `components/GiftExpiryCountdown.tsx` — постоянные полоски/таймеры.
* `components/league/LeagueRaceFeed.tsx` — лента событий с `FadeInLeft.delay(120 + i*120).duration(260)` (`:40`);
  постоянная, не транзиентная.
* `components/arena/ArenaStarFlight.tsx` — полёт звёзд в счётчик; FX, не нотификация.

---

## 3. Сравнительная таблица

Только временные поверхности с собственным жизненным циклом (без группы D/E).

| # | Поверхность | Позиция | Вход (мс / кривая) | Показ (мс) | Выход (мс) | zIndex | Радиус | Отступы (V/H) | Тап | Свайп | Очередь | Хаптика | Звук | Тема |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | **ActionToast** | низ, `overlayOffset` | spring 250/22 + fade 240 | **3200** | 240 / fade 180 | 9997 | токен 16-20 | 12 / 16 | ✗ (`pointerEvents:none`) | ✗ | **есть**, max 2, дроп старейшего | success/error/reward/info/warn | 5 событий | **`themedToastChrome`** |
| A2 | **AchievementToast** | низ, `overlayOffset` | spring 250/22 + fade 240 + **scale 0.88** | **3800** | 320 / fade 240 (и 240/180 внешний) | 9999 | 20 | 12 / 14 | ✔ → модалка | ✔ 30px \| v>0.5 | **есть**, сводка при ≥3, пауза 450 | `hapticSuccess` | `pm.reward.achievement` | `t.bgCard` |
| A3 | **OfflineBanner** | верх, `insets.top+4` | fade 220, **без движения** | **10 000** | 180 + ↑80 | 9999 | 10 | 6 / 12 | ✗ | ✔ вверх, dy<-24 | ✗ | ✗ | ✗ | **хардкод** |
| A4 | **PromoBanner** | верх, в потоке | **нет** | ∞ (до `until`) | 180 → X+420 | 20 | 0 | 8 / 12 | ✔ ссылка + «×» | ✔ гориз., \|dx\|>84 | ✗ | ✗ | ✗ | **хардкод** `#3b1d6e` |
| C1 | **MedalToast** | низ, **`bottom:120` фикс** | spring friction 6 (tension по умолч.) | **2200** | 350 | **нет** | 22 | 16 / 18 | ✗ | ✔ 50px / 38px↑ / v 0.65 | ✗ | **✗** | **✗** | **сломана** (всегда `minimalDark`) |
| C2 | **CoachToast** | низ, **`bottom:24` фикс** | spring 80/10 + fade 250 | **8000** | 220 / fade 200 | **100** | 16 | 13 / 14 | ✔ CTA + «×» | ✗ | ✗ | только на CTA | ✗ | `t.bgCard` |
| C3 | **InGameToast** | **верх `top:60`** | 250, `translateY -20` | **3000** | 250 | **999 999** | 16 | 14 / 20 | ✗, но **ловит тапы** | ✗ | ✗ | ✗ | ✗ | `themedToastChrome` |
| C4 | **BonusXPCard** | **центр экрана** | 3× spring 7/50, scale 0.8 | **2000** | 200 (scale→0.9, без сдвига) | 1000 | 16 | 12 / 20 | ✔ закрывает | ✗ | ✗ | `hapticMediumImpact` | ✗ (обещан в коммент.) | частично, `#1a1a2e` |
| C5 | **RankChangeBanner** | **в потоке** (клуб) | 280, `translateY -12` | **5000** | 240 (тап — 200) | — | 14 | 12 / 14 | ✔ закрывает | ✗ | ✗ | ✗ | ✗ | **хардкод** 7 цветов |
| C6 | **UndoDeleteSnackbar** | низ, своя формула | **Reanimated** `FadeInDown 220` | **5000** | **нет — щелчок** | 90 | 16 | 13 / 16 | ✔ «Вернуть» | ✗ | замена (только последний) | на тап | ✗ | `t.bgCard` + **живая рамка** |
| C7 | **Верный перевод** | верх, `top 54/70` | 180, `translateY -8` | **3200** | 180 | 60 | 16 | 10 / 12 | ✗ | ✗ | ✗ | ✗ | ✗ | `t.correctBg` |
| C8 | **Подсказка свайпа** | в потоке | 300, `translateY -8` | **6000** | 220 | — | 16 | 10 / 14 | ✔ «×» | ✗ | ✗ | ✗ | ✗ | **`glassFill`** |
| C9 | **Подсказка удаления** | в потоке | 350 + **пульс ∞** 700/700 | **5000** | 250 | — | 12 | 10 / 14 | ✔ «×» | ✗ | ✗ | ✗ | ✗ | `t.bgSurface` + рамка |
| C10 | **+XP lesson1** | inline над счётчиком | 200 | **900** | 300 | — | — | — | ✗ | ✗ | ✗ | ✗ | ✗ | `#F5A623` |
| C11 | **+XP lesson_words** | `top 100`, центр | 420, `Easing.out(cubic)` | **1000** | 480 | **99 999** | 20 | 10 / 20 | ✗ | ✗ | `runId`-guard | ✗ | ✗ | `#FFC800` |
| C12 | **+XP prepositions** | низ, `max(24, inset+18)` | 420 | **1000** | 480 | **99 999** | 20 | 10 / 20 | ✗ | ✗ | ✗ | ✗ | ✗ | `#FFC800` |
| C13 | **+XP irreg. verbs** | `top 50`, центр | 420 | **1200** | 480 | 999 | 20 | 8 / 18 | ✗ | ✗ | ✗ | ✗ | ✗ | `#FFC800` |
| C14 | **AccountDeletedNotice** | верх, `insets.top+10` | 260, `Easing.out(exp)` | **3000** (старт **после** входа) | 340, `Easing.out(exp)` | 40 | **999** | 12 / 18 | ✗ | ✗ | ✗ | ✗ | ✗ | хардкод (обоснован) |
| C15 | **FeedbackPlashka** ☠ | — | Reanimated `withSpring 16/180/0.9` | — | `withTiming 200` | — | 20 | 16 / 16 | — | — | — | — | — | `t.correct/t.wrong` |

**Разброс, который видно из таблицы:**

* Длительность показа: **900 … 10 000 мс** (без учёта бесконечного PromoBanner) — фактор ×11.
* Длительность входа: **180 … 520 мс** — фактор ×3.
* Длительность выхода: **0 (щелчок) … 480 мс**.
* zIndex: **20 … 999 999**.
* Радиус: **10, 12, 14, 16, 20, 22, 999** — семь значений на 19 поверхностей.
* Вертикальный паддинг: **6, 8, 10, 12, 13, 14, 16** — семь значений.
* Позиция: низ ×7, верх ×5, центр ×1, в потоке ×4, inline ×1.
* Пружины: `250/22` (токен), `80/10`, `friction 6`, `7/50`, `damping 16/stiffness 180`,
  плюс два `Animated.spring()` вообще без параметров (`MedalToast.tsx:245, 264`; `OfflineBanner.tsx:68`).

---

## 4. Что уже унифицировано, а что нет

### 4.1. Унифицировано (реально работает)

1. **Транспорт для системных сообщений.** `emitAppEvent('action_toast', …)` + `actionToastTri()` —
   98 мест эмита из 38 файлов идут через один канал (`app/events.ts:95-159`). Никакого `Alert.alert`
   в этих сценариях нет.
2. **Анти-бурст на эмиттере.** 400 мс окно по `type+messageRu` (`events.ts:6-9, 168-177`) —
   ловит мульти-тап до того, как он дойдёт до UI.
3. **Дедуп и очередь в ActionToast.** Три слоя защиты (текущий / очередь / cooldown 1600 мс) —
   `ActionToast.tsx:249-271`. Внутри одного тоста дисциплина хорошая.
4. **Fabric-safety.** Оба глобальных тоста откладывают старт `Animated.start()` на следующий кадр
   через `requestAnimationFrame` (`ActionToast.tsx:200-213`, `AchievementToast.tsx:213-232`)
   и гасят `setState` из колбэков через `scheduleTrackedAnimatedStateUpdate`
   (`components/animationScheduling.ts`, применён в 5 местах). Это редкая и правильная дисциплина.
5. **Единый арбитр слота.** Все четыре «оверлейных» тоста (`shardsEarned`, `achievementToast`,
   `coachToast`, `actionToast`) зарегистрированы в `OverlayArbiter` и помечены как выселяемые
   (`overlay_arbiter_core.ts:102-114`) — модалки друг на друга не наезжают.
6. **`noAndroidOutline`.** Применён в 9 из 10 плашек с тенью (`ActionToast.tsx:392`,
   `AchievementToast.tsx:557`, `InGameToast.tsx:76`, `MedalToast.tsx:417`, `CoachToast.tsx:293`,
   `OfflineBanner.tsx:124`, `FeedbackPlashka.tsx:117`, `flashcards_swipe.tsx:3585`, `lesson_words.tsx:3097`).
   Исключение — `BonusXPCard.tsx:202` (`elevation: 8` без защиты).
7. **Отказ от рамок.** Решение «разделение тоном, без обводки» проведено последовательно:
   `borderWidth: 0` в `ActionToast.tsx:407`, `AchievementToast.tsx:563/601/636`, `MedalToast.tsx:426`,
   `CoachToast.tsx:285/329`, `RankChangeBanner.tsx:163`, `OfflineBanner.tsx:129`,
   `FeedbackPlashka.tsx:112`, `home.tsx:2236`. Мотивация зафиксирована в `flashcards_swipe.tsx:2932`.
   **Но** остались 3 исключения с живой рамкой: `UndoDeleteSnackbar` (`:713`),
   `CollectionListView` deleteHint (`:532`), `flashcards_card_editor` (`:500`), плюс
   `MedalToast.medalSlot` (`:448`) и иконка в home-баннере (`home.tsx:2239`).
8. **8-языковая локализация** в глобальном канале: `ToastPayload` несёт 8 полей (`events.ts:100-108`),
   `TOAST_TONES` покрывает 8 языков (`ActionToast.tsx:64-130`), `MedalToast` — 8 наборов (`:70-201`).
9. **`themedToastChrome` покрывает все 13 тем** без дыр (`themedToastChrome.ts:17-127`),
   как и `medalToastThemeStyles` (`:32-343`).

### 4.2. НЕ унифицировано

1. **Токен применён к 2 из 19 поверхностей.** `themedToastChrome` читают только `ActionToast` и
   `InGameToast`. Все остальные собирают палитру вручную: `t.bgCard` (Achievement, Coach, Undo),
   `glassFill` (подсказка свайпа), `t.correctBg` (верный перевод), полный хардкод
   (OfflineBanner, PromoBanner, RankChangeBanner, все четыре +XP).
2. **Нет шкалы длительности.** Каждое число подобрано на месте: 900, 1000, 1200, 1400, 1600, 2000,
   2200, 2500, 3000, 3200, 3800, 5000, 6000, 8000, 10 000. Совпадение 3200 мс между
   `ActionToast` и «верным переводом» — случайное, они не связаны.
3. **Нет шкалы позиций.** `useGlobalBottomOverlayOffset()` (правильный расчёт под таб-бар и
   safe-area) применяют **два** компонента — `ActionToast.tsx:321` и `AchievementToast.tsx:396`.
   `CoachToast` берёт `bottom: 24` (`:278`), `MedalToast` — `bottom: 120` (`:211`),
   `UndoDeleteSnackbar` — собственную формулу (`flashcards_collection.tsx:807-810`),
   `preposition_drill` — третью формулу (`:809`). Четыре разных ответа на один вопрос.
4. **Нет шкалы zIndex.** Значения расставлены «побольше, чтобы точно сверху»: 20, 40, 60, 90, 100,
   999, 1000, 9997, 9999, 99 999, 999 999. `CoachToast` (100) физически не может перекрыть
   `ActionToast` (9997), хотя семантически он важнее.
5. **Нет общей грамматики движения.** Токен `MOTION_SPRING_LEGACY.toast` (`motion.ts:48`) используют
   **два** компонента. Дальше: `80/10`, `friction 6`, `7/50`, `damping 16/stiffness 180`,
   три `Animated.spring()` без параметров. `MOTION_DURATION` (`motion.ts:1-17`) читают те же два
   компонента; все остальные пишут числа литералами.
6. **Нет общего входного вектора.** Снизу вверх: ActionToast, AchievementToast, CoachToast, MedalToast,
   +XP (prepositions), FeedbackPlashka. Сверху вниз: InGameToast, OfflineBanner (только fade),
   AccountDeletedNotice, RankChangeBanner, верный перевод, обе подсказки, +XP (words, verbs).
   Из центра со scale: BonusXPCard. Совсем без движения: PromoBanner, все inline-плашки группы D.
7. **Интерактив несогласован.** Свайп есть у 4 из 19 (Achievement, Medal, Offline, Promo),
   и у всех четырёх — разные пороги (30 px / 50 px / 24 px / 84 px) и разные оси.
   Тап-закрытие есть у 4. Кнопка действия — у 3 (Coach, Undo, home D4/D7).
   ActionToast, через который проходит 98 сообщений, **не имеет ни одного способа взаимодействия**.
8. **Хаптика.** Есть у 3 из 19: ActionToast (5 веток), AchievementToast (`hapticSuccess`),
   BonusXPCard (`hapticMediumImpact`). Молчат: MedalToast (смена ранга!), RankChangeBanner (обгон в лиге!),
   OfflineBanner (потеря сети!), UndoDeleteSnackbar (удаление карточки!), все четыре +XP.
   `hapticWarning()` существует, но в тостах не используется — `warning` отдан `hapticError()`
   (`ActionToast.tsx:176`).
9. **Звук.** Есть у 2 из 19: ActionToast (5 событий + `rateLimit`), AchievementToast (1 событие).
   `BonusXPCard` обещает звук в шапке (`:6`) и в комментарии (`:89`) — его нет.
10. **Reduce-motion.** 1 из 19 (`AccountDeletedNotice.tsx:46-54`). При этом `useReduceMotion`
    используется в 40+ компонентах проекта (arena, league, paywall, tournament) — то есть
    инфраструктура есть, до тостов её не довели.
11. **A11y.** `accessibilityRole="alert"` есть у 2 (`MedalToast.tsx:297`, `flashcards_swipe.tsx:3217`).
    `accessibilityLiveRegion` — у 3. У 14 из 19 скринридер о появлении плашки не узнаёт вообще.
12. **Обработка длинного текста.** `numberOfLines: 3` (ActionToast), `1` (Achievement name/desc,
    OfflineBanner, Undo), `2` (Coach title, PromoBanner), `4` (FeedbackPlashka subtitle),
    `FlowText` без усечения (AccountDeletedNotice). Пять разных политик.
13. **Локализация.** Глобальный канал — 8 языков. Локальные снекбары/подсказки —
    3 языка (`CollectionListView.tsx:537-541, 726, 744`; `flashcards_card_editor.tsx:509-513`;
    `coin_exchange.tsx:327-331`). На tr/pl/vi/id пользователь увидит русский.
14. **Размер шрифта.** ActionToast, AchievementToast, MedalToast, RankChange, BonusXP пишут кегли
    литералами (15, 12, 17, 12.5, 10.5, 18, 10). Coach, InGame, Undo, подсказки берут `f.*` из темы.
    То есть половина тостов **не масштабируется** вместе с настройкой размера текста приложения.

---

## 5. Проблемы, ранжированные

### Критические (ломают функциональность)

**P1. `MedalToast` игнорирует 12 из 13 тем.** `components/MedalToast.tsx:273` берёт
`themeMode ?? 'minimalDark'`, а единственный вызов (`app/lesson1.tsx:3865-3874`) проп не передаёт.
346 строк `components/medalToastThemeStyles.ts` (13 палитр с уникальными `signature`) не доходят до экрана.
В теме GOLD плашка новой медали рисуется сине-стальным `#6EA8FF` вместо шампанского.
Правка — одно слово в `lesson1.tsx`.

**P2. Тост невидим из-под нативной модалки.** `ReportUserModal.tsx:103-108` эмитит `error` и
**не закрывает** свою `<Modal>` (`:113`). ActionToast рисуется в корне дерева, ниже системного
окна модалки. Пользователь получает только вибрацию. Тот же риск у любого из 98 эмитов,
сработавшего при открытой модалке вне арбитра (`PlayerProfileModal`, `ReportPackModal`,
`CertificateNameModal`, `ThemedConfirmModal` — все с 0 вхождений `useOverlayVisible`).

**P3. `InGameToast` съедает тип сообщения.** `components/InGameToast.tsx:42` — `void type;`.
Проп `'error' | 'info'` объявлен (`:12`), передаётся (`PlayerProfileModal.tsx:2482`) и выбрасывается.
Отказ «заявку не отправить» выглядит идентично «заявка отправлена».

**P4. `InGameToast` перехватывает касания.** `pointerEvents` не задан (`:46`) → `'auto'`.
Полоса во всю ширину на `top: 60` блокирует нажатия в течение 3.5 с поверх профиля игрока.

**P5. Голодание ActionToast + потеря сообщений.** `actionToast` — предпоследний в приоритете
(`overlay_arbiter_core.ts:78`), а крупные модалки не выселяются (`OverlayArbiter.tsx:145-152`).
Пока открыт level-up с сундуком, очередь тоста обрезана до 2 (`ActionToast.tsx:134`) и
выбрасывает **старейшие** (`:269`). Тост «покупка прошла» может опоздать на минуту или исчезнуть.

### Серьёзные (движение не дотягивает до графики)

**P6. `UndoDeleteSnackbar` исчезает щелчком.** `entering={FadeInDown.duration(220)}` есть
(`CollectionListView.tsx:697`), `exiting` — нет. По таймауту (`useCollectionData.ts:687`) узел
просто размонтируется. Единственный снекбар с действием отмены в приложении — и он телепортируется.

**P7. `OfflineBanner` входит без движения, выходит с движением.** `timing(opacity, 220)` на вход
(`:75-79`) против `opacity 180 + translateY -80` на выход (`:50-53`). Плюс 10 секунд —
вдвое дольше любого другого тоста.

**P8. `PromoBanner` и все inline-плашки группы D появляются мгновенно.** PromoBanner толкает вниз
весь стек навигации (`_layout.tsx:3292`) без входной анимации (`:166`); компенсируется только
`animateNextLayoutTransition()` (`:108`). Для баннера в самом верху экрана этого мало.

**P9. `CoachToast` уходит сам, пока его читают.** 8000 мс (`:47`) на плашку с двухстрочным
заголовком, двухстрочным описанием, пилюлей фокус-слов и CTA. Таймер ставится один раз (`:115`)
и не сбрасывается ни касанием, ни скроллом. Свайпа для «отложить» нет.

**P10. Смена ранга и обгон в лиге — беззвучны и без вибрации.** `MedalToast` (нет ни одного
вызова haptic/sound в файле) и `RankChangeBanner` (то же). Это два самых эмоциональных события
геймификации, и оба проходят как визуальный шум.

**P11. Пять реализаций «+N XP».** C10-C13 плюс `XpGainBadge` с включённой внутренней анимацией
в четырёх других экранах. Разные тайминги (900/1000/1000/1200), разные позиции (верх/низ/inline),
разная геометрия, один и тот же хардкод `#FFC800`/`#F5A623` мимо темы.

**P12. `AchievementToast` — три разных выхода.** `240/180` (внешнее скрытие, `:169-172`),
`320/240` (`animateOut`, `:251-254`), `180` (свайп, `:119-121`). Одна плашка уходит с экрана
тремя разными скоростями в зависимости от причины.

**P13. Мёртвая рамка `themedToastChrome.border` в 13 темах.** Токен считает `border` для каждой
темы, оба тоста его читают (`ActionToast.tsx:335, 347`; `InGameToast.tsx:48`), но `borderWidth`
нигде не задан. В `sagePorcelain` карточка `#FCFDF9→#E1E5DC` на светлом фоне отделяется только
тенью `rgba(35,50,43,0.14)`.

**P14. Reduce-motion учтён у одной плашки из девятнадцати.** `AccountDeletedNotice.tsx:46-54`.
Инфраструктура (`hooks/use_reduce_motion`) есть и используется в 40+ компонентах.

### Средние

**P15. Тон = цвет темы, а не цвет события** (`ActionToast.tsx:52-58`, `themedToastChrome.ts`).
В `dark` ошибка зелёная, в `gold` всё шампанское. Различение — только по 21-px глифу и надзаголовку.

**P16. `MedalToast` использует `useNativeDriver: false` для драга** (`:236, 245, 251, 256`)
при нативном драйвере на входе/выходе. Смешанный драйвер на одной поверхности.

**P17. Мёртвый код.** `components/feedback/FeedbackPlashka.tsx` — 0 использований (единственная
Reanimated-плашка). `MedalToast.isLightTheme` — обязательный проп, не читается (`:45, 209`).
`themedToastChrome.body` — 0 чтений. Ключ `shardsEarned` в арбитре (`overlay_arbiter_core.ts:75, 103`)
после перевода модалки в тост.

**P18. `MedalToast`: картинка 70 px в слоте 64 px** (`:444-455`) без `overflow: hidden`.
В `AchievementToast` — 54 px в слоте 64 px (`:42-44`). Противоположные решения для одинакового узла.

**P19. Аналитика по тостам выключена.** `TRACK_INTERNAL_APP_EVENTS = false` (`events.ts:10`).
Ни один из 98 эмитов не считается — нет данных о том, какие тосты вообще видит пользователь.

**P20. `friends.addFeedback` — один state, три визуала** (`:1880-1885`, `:3396-3401`, `:3571-3594`),
три веса шрифта (600/700/800), без анимации, авто-скрытие 2500 мс (`:2545`).

**P21. Локализация локальных плашек — 3 языка вместо 8.**
`CollectionListView.tsx:537-541, 726, 744`; `flashcards_card_editor.tsx:509-513`;
`coin_exchange.tsx:327-331, 339-348`.

**P22. Половина тостов не масштабирует шрифт.** Литеральные кегли в `ActionToast.tsx:417-424`,
`AchievementToast.tsx:576`, `MedalToast.tsx:459-475`, `OfflineBanner.tsx:135`,
`BonusXPCard.tsx:211-226`, `home.tsx:3207, 3227`. Токен `f.*` игнорируется.

**P23. Двойная хаптика.** `ReportUserModal.tsx:102` (`hapticError()`) + ActionToast (`hapticError()`
для `error`) → два удара подряд. То же в `StreakReviveModal.tsx:197` (`hapticSuccess()` + `success`-тост).

**P24. `BonusXPCard`: `elevation: 8` без `noAndroidOutline`** (`:202`) — единственное исключение
из общей дисциплины теней проекта.

---

## 6. Куда двигать (кратко, по движению — не по графике)

1. **Один хук `useTransientSurface`** с обязательными параметрами: якорь (`top | bottom | inline`),
   `durationTier` (`quick 1800 / normal 3200 / read 5000 / persistent`), вход/выход из
   `MOTION_DURATION` + `MOTION_SPRING_LEGACY.toast`, обязательный `reduceMotion`-байпас,
   обязательный `pointerEvents`. Всё, что сейчас пишется литералами, становится тиром.
2. **Симметрия по умолчанию, асимметрия — осознанно.** Сейчас единственная задокументированная
   асимметрия — `AccountDeletedNotice` (260 вход / 340 выход, `Easing.out(exp)`). Взять её за эталон
   и раскатать: быстрый вход, спокойный уход. Убрать случайные пары (240/180, 320/240, 180/180, 250/250).
3. **Таймер стартует после входа.** Правильный порядок сегодня только в `AccountDeletedNotice.tsx:63-65`.
   У остальных таймер и анимация входа стартуют вместе — фактический показ короче заявленного на 200-520 мс.
4. **`bottom` — только через `useGlobalBottomOverlayOffset()`.** Убрать `bottom: 24`
   (`CoachToast.tsx:278`), `bottom: 120` (`MedalToast.tsx:211`) и две локальные формулы
   (`flashcards_collection.tsx:807`, `preposition_drill.tsx:809`).
5. **Лестница `zIndex` константами** (`OVERLAY_Z.banner=20 / hint=60 / snackbar=90 / toast=100 / critical=110`)
   вместо 999 999.
6. **Свайп в ActionToast + слот действия.** Пока его нет, экраны продолжат плодить локальные
   снекбары (уже: `UndoDeleteSnackbar`, `CoachToast`, D4, D7).
7. **Хаптика и звук — часть тира, а не решение автора.** Минимум: `MedalToast`, `RankChangeBanner`,
   `UndoDeleteSnackbar`, `OfflineBanner` должны отзываться. `hapticWarning()` — вернуть в `warning`.
8. **Дать тону цвет.** Оставить фон и градиент из `themedToastChrome`, но акцент-рейка (`:394-402`),
   иконка и надзаголовок должны краситься по `type`, а не по теме. Токену нужны 5 акцентов на тему,
   а не один.
9. **Схлопнуть пять «+XP» в один компонент** на базе `XpGainBadge` c пропом `anchor`.
10. **`exiting`-анимация обязательна.** Три поверхности сейчас исчезают щелчком:
    `UndoDeleteSnackbar`, `SaveProgressBanner`, все inline-плашки группы D.
11. **Удалить или включить `FeedbackPlashka`.** Это единственный Reanimated-эталон в категории;
    либо он становится базой для всех тостов, либо его нужно убрать из репозитория.

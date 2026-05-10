---
phase: 02-premium-soft-monetization
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/lesson_complete.tsx
  - app/lessons.tsx
  - app/lesson1.tsx
  - app/premium_modal.tsx
  - app/_admin_settings_testers.tsx
  - app/(tabs)/home.tsx
  - app/auth_provider.ts
  - app/cloud_sync.ts
  - app/shards_system.ts
  - app/(tabs)/streak_stats.tsx
  - components/PremiumCelebrationModal.tsx
  - components/MasteryReplayModal.tsx
  - components/AfterLesson5PushModal.tsx
  - components/StatsPremiumBlur.tsx
  - tests/mastery_replay.test.ts
  - tests/premium_celebration_admin_grant.test.ts
autonomous: true
requirements: [PREMIUM-01, PREMIUM-02, PREMIUM-03, PREMIUM-04, PREMIUM-05]

must_haves:
  truths:
    - "Mastery: после первого срабатывания lesson_complete для урока N выставляется флаг lesson_finished_once_v1_${N}=true"
    - "Mastery: кнопка «Начать урок» в lesson1.tsx превращается в paywall-кнопку 💎 100 для !premium && finished_once"
    - "Mastery: теория, словарь, неправильные глаголы — остаются открытыми всегда (не paywalled)"
    - "Mastery: списание 100 осколков идёт через spendShards(100, 'lesson_replay'), сбрасывает lesson{N}_progress, эмитит 'mastery_replay_started'"
    - "Mastery: premium-юзер открывает урок повторно бесплатно без модалки (или с подтверждением но без цены)"
    - "After-lesson-5 push: показывается ровно один раз когда юзер впервые завершает lesson 5 (`lesson_finished_once_v1_5 === true` после первого срабатывания); storage premium_push_lesson5_shown_v1=1; не показывается если уже premium"
    - "Premium celebration: запускается из home.tsx при mount если premium_celebration_pending_v1 === '1'; после показа: pending удалён, premium_celebration_seen_v1 = override timestamp"
    - "Premium celebration admin-grant: cloud_sync обнаруживает admin_premium_override === 'true' AND adminOverrideAt !== last_seen → выставляет premium_celebration_pending_v1 = '1'"
    - "Premium celebration RC: после успешной Purchases.purchasePackage (premium_modal flow) выставляется premium_celebration_pending_v1 = '1'"
    - "Stats blur: для !premium контейнеры графиков на streak_stats.tsx обёрнуты в BlurView intensity=45 + замочек overlay; tap → router.push('/premium_modal', { context: 'stats' })"
    - "Admin modals tab: новая секция в _admin_settings_testers.tsx с кнопками для запуска: AfterLesson5Push, MasteryReplayModal, PremiumCelebrationModal, StatsPremiumBlur, существующая StreakReviveModal, обновлённый premium_modal со всеми контекстами"
    - "Все новые модалки соответствуют стилю существующего premium_modal (золото #B8860B/#FFD700, PremiumCard, getVolumetricShadow, useTheme)"
    - "Все строки локализованы в RU/UK/ES через triLang"
    - "ShardSpendReason обновлён: добавлен 'lesson_replay'"
  artifacts:
    - path: "components/PremiumCelebrationModal.tsx"
      provides: "Полноэкранная celebration с particle-field, короной, sequential locks unlock animation"
      exports: ["default PremiumCelebrationModal"]
    - path: "components/MasteryReplayModal.tsx"
      provides: "Confirm-модалка перепрохождения урока: 3 CTA (replay 💎 / golden premium / cancel)"
      exports: ["default MasteryReplayModal"]
    - path: "components/AfterLesson5PushModal.tsx"
      provides: "Soft-push после первого завершения lesson 5: статы + 7-day trial CTA + skip"
      exports: ["default AfterLesson5PushModal"]
    - path: "components/StatsPremiumBlur.tsx"
      provides: "BlurView wrapper с замочком и tap-handler для статистики"
      exports: ["default StatsPremiumBlur"]
    - path: "app/premium_celebration_state.ts"
      provides: "Get/set premium_celebration_pending + seen markers, integration with cloud_sync"
      exports: ["isCelebrationPending", "consumeCelebration", "markCelebrationPending"]
  key_links:
    - from: "app/lesson_complete.tsx"
      to: "AsyncStorage:lesson_finished_once_v1_${id}"
      via: "AsyncStorage.setItem on first reach of completion screen for given lesson"
      pattern: "lesson_finished_once_v1_"
    - from: "app/lesson1.tsx (Start button render)"
      to: "components/MasteryReplayModal"
      via: "if (!premium && finished_once) → render paywall variant of Start button → tap opens MasteryReplayModal"
      pattern: "MasteryReplayModal"
    - from: "app/cloud_sync.ts (admin override detection)"
      to: "app/premium_celebration_state.ts:markCelebrationPending"
      via: "compare admin_premium_override timestamp vs premium_celebration_seen_v1; if newer → markCelebrationPending()"
      pattern: "premium_celebration_pending"
    - from: "app/(tabs)/home.tsx mount"
      to: "components/PremiumCelebrationModal"
      via: "useFocusEffect → isCelebrationPending() → setShowCelebration(true) → on close consumeCelebration()"
      pattern: "PremiumCelebrationModal"
    - from: "app/(tabs)/streak_stats.tsx"
      to: "components/StatsPremiumBlur"
      via: "wrap chart container with StatsPremiumBlur if !isPremium"
      pattern: "StatsPremiumBlur"
---

<objective>
Заложить UI-фундамент Premium Soft Monetization: 5 новых/обновлённых модалок + 1 системный flow (celebration) + admin-tab для проверки.

Purpose: Дать пользователю явные точки контакта с premium (push, mastery, celebration, blur) которые усиливают желание апгрейднуться без отнятия free-контента. Создать инструмент для self-проверки модалок (admin tab).

Output:
- `components/PremiumCelebrationModal.tsx` — премиум-уровневая анимация (~5 сек, particles + locks)
- `components/MasteryReplayModal.tsx` — confirm перепрохождения с 3 CTA
- `components/AfterLesson5PushModal.tsx` — soft-push после lesson 5
- `components/StatsPremiumBlur.tsx` — blur-обёртка для статистики
- `app/premium_celebration_state.ts` — модуль состояния celebration (pending/seen)
- Обновлены: `lesson_complete.tsx`, `lessons.tsx`, `lesson1.tsx`, `premium_modal.tsx`, `home.tsx`, `cloud_sync.ts`, `_admin_settings_testers.tsx`, `streak_stats.tsx`
- Tests: `mastery_replay.test.ts`, `premium_celebration_admin_grant.test.ts`
</objective>

<tasks>

### Task 1 — Premium Celebration State Module
- Создать `app/premium_celebration_state.ts`
  - `isCelebrationPending(): Promise<boolean>` — читает `premium_celebration_pending_v1`
  - `consumeCelebration(seenMarker: string): Promise<void>` — удаляет pending, ставит `premium_celebration_seen_v1 = seenMarker` (timestamp / 'iap_purchase')
  - `markCelebrationPending(): Promise<void>` — выставляет pending=1
  - `getLastSeenMarker(): Promise<string | null>` — для cloud_sync compare
- Storage keys: `premium_celebration_pending_v1`, `premium_celebration_seen_v1`

### Task 2 — Cloud Sync hook for admin-grant celebration
- В `app/cloud_sync.ts` (или аналогичном месте где читается `progress.admin_premium_override`):
  - При `admin_premium_override === 'true'` AND `progress.shards_admin_override_at` (или новое поле `premium_admin_grant_at`) сравнить с `getLastSeenMarker()`
  - Если новее → `markCelebrationPending()`
- В админ-индексе `admin/index.html`: при выдаче premium через кнопку записывать `progress.premium_admin_grant_at = String(Date.now())` (новое поле, рядом с `admin_premium_override`)

### Task 3 — Premium Celebration Modal (the showcase)
- `components/PremiumCelebrationModal.tsx`:
  - Стадии (5 секунд):
    1. Fade backdrop to dark + golden glow center (300мс)
    2. Particle-field 60-80 частиц спиралью из центра (1000мс) — `react-native-reanimated` shared values + `react-native-svg`
    3. Crown 👑 spring-bounce in (400мс) с perspective transform
    4. Shock-wave кольцо света (300мс)
    5. Stagger 6 ffeatures 🔒→🔓 + golden flash (1500мс, 250мс/строка):
       - ⚡ Безлимит энергии
       - 🔁 Mastery mode (повтор уроков)
       - 📊 Тренер (умное повторение)
       - 🧠 Аналитика прогресса
       - 🥇 Hard квизы
       - 🛡️ Защита стрика
    6. Counter «6/6 разблокировано» (300мс)
    7. CTA «Начать» (golden, shimmer)
  - Haptic-success на стадиях 1, 3, 5 (за каждый замок), 7
  - Tap-anywhere → skip to final frame
  - Локализация RU/UK/ES всех строк
- Запуск из `home.tsx`:
  - useFocusEffect → `isCelebrationPending()` → если true: setShow(true), на close `consumeCelebration(timestamp)`

### Task 4 — Mastery: lesson_finished_once flag
- В `app/lesson_complete.tsx`:
  - При первом достижении экрана для lesson_id: `AsyncStorage.setItem('lesson_finished_once_v1_' + id, '1')`
  - Эмитим `emitAppEvent('lesson_finished_once', { lessonId })`
- Helper `app/mastery.ts` (новый):
  - `isLessonFinishedOnce(id: number): Promise<boolean>`
  - `markLessonFinishedOnce(id: number): Promise<void>`
  - `MASTERY_REPLAY_COST_SHARDS = 100` (export const)
  - `executeReplay(id: number, isPremium: boolean): Promise<{ ok: true } | { ok: false; reason: 'insufficient_shards' | 'spend_failed' }>` — premium=skip списание, иначе spendShards(100, 'lesson_replay'), на успех — сбрасывает `lesson{id}_progress`

### Task 5 — ShardSpendReason: add 'lesson_replay'
- `app/shards_system.ts`:
  - В `ShardSpendReason` union добавить `| 'lesson_replay'`
  - Комментарий: «-100 Перепройти урок (Mastery mode, free-only — premium открывает повтор бесплатно)»

### Task 6 — MasteryReplayModal
- `components/MasteryReplayModal.tsx`:
  - Props: `{ visible, lessonId, onClose, onReplayed, isPremium }`
  - Заголовок: «Перепройти урок?»
  - Subtitle: «Прогресс сбросится. Тренируй до идеального результата.»
  - 3 CTA (premium=2):
    - 🔵 «Перепройти за 100 💎» (если !premium)
    - 🟡 «Премиум — безлимит повторов» (если !premium, golden gradient #B8860B + #FFD700)
    - ⚪ «Отмена»
    - Premium вариант: одна кнопка «Перепройти» (бесплатно)
  - На «Перепройти за 100💎» — вызывает `executeReplay(lessonId, false)`. Если insufficient → router.push('/shards_shop', { need, source: 'mastery' })
  - На «Премиум» — router.push('/premium_modal', { context: 'mastery', lesson: id })
  - Локализация RU/UK/ES

### Task 7 — lesson1.tsx «Start» button paywall integration
- Найти кнопку «Начать урок» в `lesson1.tsx`
- Добавить локальный state `finishedOnce: boolean`, грузим через `isLessonFinishedOnce(id)` в useFocusEffect
- Грузим `isPremium` через premium_guard
- Если `finishedOnce && !isPremium`: кнопка превращается в:
  - Текст «Перепройти» + 💎 100 + замочек
  - Tap → setShowMasteryModal(true)
- В render: `<MasteryReplayModal visible={showMasteryModal} ... />`
- На onReplayed: refresh lesson_progress state, реальный «start» (как обычно)

### Task 8 — lessons.tsx tile badge
- В компоненте тайла урока:
  - Показывать угловой бейдж 💎 100 если `lesson_finished_once_v1_${id}=true && !isPremium`
  - Premium-юзеры — без бейджа
- Стиль: маленький, в правом верхнем углу, с золотым outline

### Task 9 — AfterLesson5PushModal
- `components/AfterLesson5PushModal.tsx`:
  - Триггер: вход в `lesson_complete.tsx` для lessonId === 5 AND `premium_push_lesson5_shown_v1 !== '1'` AND !isPremium
  - На показе: `AsyncStorage.setItem('premium_push_lesson5_shown_v1', '1')`
  - UI: full-screen, стиль premium_modal
  - Заголовок: «Ты прошёл 5 уроков. 312 фраз. Серьёзный настрой.» (число фраз вычисляем live)
  - Persona-stats:
    - 🎯 «{count} фраз изучено»
    - 🔥 «Стрик: {streak} дней»
    - ⭐ «Уровень {level}»
  - Premium offer (в стиле существующего premium_modal): 7-day trial features + кнопка «Попробовать 7 дней бесплатно»
  - «Продолжить бесплатно» — мелким текстом снизу
  - На покупку → стандартный flow → premium_celebration срабатывает после ✅

### Task 10 — StatsPremiumBlur wrapper
- `components/StatsPremiumBlur.tsx`:
  - Props: `{ children: ReactNode, isPremium: boolean, context: 'stats' | 'heatmap' | 'patterns' }`
  - Если premium → возвращает `<>{children}</>` без обёртки
  - Если !premium:
    - Render children внутри `<View>` (нужно реальные графики чтобы blur был «по контуру»)
    - Поверх `<BlurView intensity={45} tint="default" style={absoluteFill}>`
    - Поверх blur — overlay с замочком 🔒 (size 32, color t.textPrimary), текстом «Premium-аналитика», кнопкой «Открыть» (golden)
    - Tap по overlay → `router.push('/premium_modal', { context })`
- Установить `expo-blur` если не установлен: `npx expo install expo-blur`

### Task 11 — Wire StatsPremiumBlur в streak_stats.tsx
- Найти контейнеры графиков «Опыт / Время» и карточки «Весь путь» (показано на скринах)
- Обернуть в `<StatsPremiumBlur isPremium={isPremium} context="stats">{<existing chart>}</StatsPremiumBlur>`
- isPremium читается из premium_guard

### Task 12 — premium_modal.tsx — добавить новые контексты
- В `app/premium_modal.tsx` добавить routes для context:
  - `'mastery'` — заголовок «Безлимит повторов уроков», иконка 🔁
  - `'stats'` — заголовок «Аналитика прогресса», иконка 📊
  - Существующие контексты сохранить (streak / quiz_hard / etc)
- В feature-list (общем) добавить новые премиум-фичи:
  - Mastery mode (повтор любого урока)
  - Тренер с слабыми местами
  - Heatmap 365 дней
  - Mistake patterns

### Task 13 — Admin Modals Preview tab
- В `app/_admin_settings_testers.tsx`:
  - Новая секция «Premium Modals Preview» (collapsible или отдельный таб через сегментер)
  - Кнопки запуска (каждая открывает соответствующую модалку без сайд-эффектов):
    - ▶ AfterLesson5Push
    - ▶ MasteryReplayModal (с фейковым lessonId=1)
    - ▶ PremiumCelebrationModal
    - ▶ StreakReviveModal (уже есть, передаём mock offer)
    - ▶ premium_modal со всеми context'ами (dropdown выбора)
    - ▶ StatsPremiumBlur preview (показывает blur поверх mock-графика)

### Task 14 — Tests
- `tests/mastery_replay.test.ts`:
  - `executeReplay` для !premium с балансом >= 100 → списывает, ok=true, lesson_progress сброшен
  - `executeReplay` для !premium с балансом < 100 → ok=false, reason='insufficient_shards'
  - `executeReplay` для premium → бесплатно, ok=true, lesson_progress сброшен
- `tests/premium_celebration_admin_grant.test.ts`:
  - `markCelebrationPending` → `isCelebrationPending` returns true
  - `consumeCelebration` → pending false, seen marker записан
  - cloud_sync mock: при обнаружении нового override → markPending вызван

</tasks>

<verification>

### Local self-checks before commit:
1. `npx tsc --noEmit` — 0 errors
2. `npx jest tests/mastery_replay.test.ts tests/premium_celebration_admin_grant.test.ts --no-coverage` — все pass
3. Полный jest suite — не более существующих фейлов (lesson_words_spanish_gloss preexisting)

### Manual UAT (через admin tab):
1. Открыть Settings → Admin → Premium Modals Preview
2. ▶ Каждая кнопка открывает соответствующую модалку без crash
3. PremiumCelebrationModal — анимация ~5 сек, можно skip тапом, есть haptic
4. MasteryReplayModal — premium показывает 1 CTA, free — 3 CTA
5. AfterLesson5Push — статы видны, golden CTA рядом со skip-link

### End-to-end:
1. Завершить lesson 5 в первый раз — увидеть AfterLesson5Push
2. Закрыть, перепройти lesson 5 — увидеть MasteryReplayModal
3. Списать 100💎 — урок открывается с обнулённым прогрессом
4. Через админку выдать premium → закрыть/открыть приложение → увидеть PremiumCelebrationModal
5. Открыть streak_stats как !premium — увидеть blur + замочек; tap → premium_modal с context='stats'

### No regressions:
- Существующая `lesson_complete.tsx` логика наград (XP, shards, badges) не изменена
- Premium status detection (premium_guard) — не меняем
- Существующие модалки (StreakReviveModal, EnergyRefillShardModal, ArenaLimitModal) работают как раньше

</verification>

<rollback>

В случае проблем после деплоя:
1. Feature flag в `app/config.ts`: `PREMIUM_SOFT_MONETIZATION_ENABLED = false` гасит:
   - AfterLesson5Push
   - MasteryReplayModal (lesson1 кнопка работает как обычно)
   - StatsPremiumBlur (графики видны всем как раньше)
   - PremiumCelebrationModal (не показывается)
2. Admin tab остаётся доступным независимо.
3. Storage не мигрируем — flag-revert безопасен.

</rollback>

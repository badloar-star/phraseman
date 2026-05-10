---
phase: 02-premium-soft-monetization
plan: 02
type: execute
wave: 1
depends_on: [01-PLAN.md]
files_modified:
  - app/paywall_personalization.ts
  - app/hall_of_fame_utils.ts
  - app/premium_modal.tsx
  - components/NoEnergyModal.tsx
  - app/(tabs)/quizzes.tsx
  - tests/paywall_personalization.test.ts
autonomous: true
requirements: [PREMIUM-06]

must_haves:
  truths:
    - "5 счётчиков хранятся в AsyncStorage: energy_zero_count_v1, streak_lost_count_v1, hard_paywall_blocks_v1 (3 новых); hofRank и foregroundHours из существующих ключей"
    - "energy_zero_count_v1: инкрементируется при появлении NoEnergyModal (visible prop true)"
    - "streak_lost_count_v1: инкрементируется в hall_of_fame_utils.ts при streak=1 (каждый из 3 мест сброса)"
    - "hard_paywall_blocks_v1: инкрементируется при tap на Hard-квиз если !premium (в quizzes.tsx или premium_modal когда context='quiz_hard')"
    - "pickPaywallTags(stats) → top-3 по pain-weight, min 0 активных = generic fallback"
    - "premium_modal.tsx показывает max 3 personalized-тега как pill-карточки над hero-блоком"
    - "Строки RU/UK/ES персонализированы: числа вставляются из реальных данных"
    - "Тест: pickPaywallTags выбирает правильный top-3 при разных комбинациях активных тегов"
  artifacts:
    - path: "app/paywall_personalization.ts"
      provides: "collectPaywallStats + computePainScore + pickPaywallTags"
      exports: ["collectPaywallStats", "pickPaywallTags", "incrementEnergyZeroCount", "incrementStreakLostCount", "incrementHardPaywallBlock", "type PersonalizedTag", "type PaywallStats"]

---

<objective>
Персонализированные строки на пейволле: показываем юзеру 2-3 конкретные причины почему ему нужен Premium на основе его истории. Никаких дизморальных сообщений.

Tags (user selected 1, 2, 4, 8, 9):
1. energy_zero: «Энергия кончилась N раз за месяц» (pain weight: 100 if N>3, 50 if N>1, 0 if N=0)
2. streak_lost: «Ты потерял стрик N раз» (weight: 95 if N>1, 40 if N=1, 0 if N=0)
4. hard_blocks: «Hard-квизы закрыты — N раз пытался открыть» (weight: 75 if N>2, 35 if N>0)
8. hof_rank: «Ты на #N в зале славы — буст XP поднимет тебя» (weight: 40 if rank>50)
9. time_hours: «Ты вложил N ч в обучение — не сбавляй темп» (weight: 25 always, motivating)

Show top-3. If <3 active → pad with generic features.
Output: PersonalizedTag[] displayed as pill-chips in premium_modal above hero.
</objective>

<tasks>
### Task 1 — paywall_personalization.ts
### Task 2 — Increment counters: energy_zero in NoEnergyModal, streak_lost in hall_of_fame_utils, hard_blocks in quizzes.tsx
### Task 3 — Wire pickPaywallTags into premium_modal.tsx UI
### Task 4 — Tests
</tasks>

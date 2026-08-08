# Phraseman Motion Language and Visible Result Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Унифицировать лёгкий отклик главных поверхностей Phraseman и четыре основных финальных экрана без изменения бизнес-логики и без нагрузки на скрытые экраны.

**Architecture:** Один канонический press-примитив использует существующие motion-токены и системный reduced-motion. Модалы и раскрытия переиспользуют общие presentation hooks. Финалы получают чистую модель представления с тремя уровнями интенсивности, но не начисляют награды и не принимают продуктовые решения.

**Tech Stack:** React Native, Expo Router, React Native Reanimated, Jest contract tests, существующие `MOTION_*`, `feedback_kit`, `hapticTap` и локализация Phraseman.

---

### Task 1: Канонический press-примитив

**Files:**
- Modify: `components/PressableScale.tsx`
- Test: `tests/pressable_scale_motion_contract.test.ts`

- [ ] Написать контракт, который требует варианты `icon | flat | card | primary`, passthrough Pressable props, disabled/busy guard, reduced-motion и отсутствие layout-анимаций.
- [ ] Запустить `npm test -- --runInBand tests/pressable_scale_motion_contract.test.ts` и подтвердить ожидаемое падение на новом API.
- [ ] Расширить корневой `PressableScale`, используя `MOTION_SPRING_LEGACY.micro`, `transform` и `opacity`; не удалять `components/feedback/PressableScale.tsx`.
- [ ] Повторно запустить контракт до зелёного результата.

### Task 2: Таб-бар и главные касания

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `components/NotificationCenterButton.tsx`
- Modify: `components/ui/PrimaryButton.tsx`
- Test: `tests/tab_bar_motion_accessibility_contract.test.ts`
- Test: `tests/primary_press_surfaces_contract.test.ts`

- [ ] Написать падающие контракты для `accessibilityRole="tab"`, `selected`, немедленной навигации, reduced-motion и канонического отклика верхней icon-only кнопки/основного CTA.
- [ ] Запустить оба теста и зафиксировать ожидаемые причины падения.
- [ ] Сохранить traveling pill и существующую навигацию; добавить ограниченный press/release pop и корректное состояние доступности.
- [ ] Подключить канонический примитив к `NotificationCenterButton` и `PrimaryButton`, исключив двойной haptic.
- [ ] Повторно запустить оба контракта.

### Task 3: Эталонное движение модала и accordion

**Files:**
- Create: `hooks/use_modal_motion.ts`
- Modify: `components/AppMessagesInbox.tsx`
- Modify: `components/AccordionChevronIonicons.tsx`
- Modify: `hooks/useAccordionFaqStyle.ts`
- Test: `tests/modal_motion_contract.test.ts`
- Test: `tests/accordion_motion_accessibility_contract.test.ts`

- [ ] Написать падающие контракты: backdrop/panel используют только opacity/transform, close callback вызывается один раз, reduced-motion поддержан, accordion отражает `expanded`.
- [ ] Запустить тесты и подтвердить падение на отсутствующем общем modal hook и accessibility API.
- [ ] Реализовать конечное открытие 240–320 мс и более быстрое закрытие с cleanup; панель не должна отдавать tap backdrop.
- [ ] Подключить эталон к inbox без изменения его данных, маршрутизации и порядка оверлеев; подключить accordion state.
- [ ] Повторно запустить оба контракта и существующие inbox/accordion-контракты.

### Task 4: Отклик обучения

**Files:**
- Modify: `app/lesson1.tsx`
- Modify: `components/feedback/PressableScale.tsx`
- Test: `tests/lesson_answer_motion_contract.test.ts`
- Test: `tests/lesson_runtime_animation_contract.test.ts`

- [ ] Инвентаризировать существующие `flashWord`, combo, lightning и answer effects, закрепив за каждым событием одного владельца.
- [ ] Написать падающий контракт: выбор реагирует один раз, правильный ответ имеет конечное подтверждение, неточный — один сдвиг 2–4 px, нет новых loops/intervals.
- [ ] Запустить контракт и подтвердить ожидаемое падение.
- [ ] Унифицировать press/answer feedback, не меняя правильность, энергию, XP, replay, восстановление и переход на completion.
- [ ] Запустить оба lesson-контракта.

### Task 5: Чистая модель видимого результата

**Files:**
- Create: `app/completion/progress_completion_model.ts`
- Create: `app/completion/progress_completion_copy.ts`
- Test: `tests/progress_completion_model.test.ts`

- [ ] Написать падающие тесты для `quiet | milestone | major`, обычного результата, perfect, record, streak, unlock и defeat; запрещать неподтверждённые формулировки.
- [ ] Запустить тест и подтвердить отсутствие модели.
- [ ] Реализовать типизированную чистую модель: `fact`, `accumulated`, `nextStep`, primary/secondary actions и подтверждённые flags.
- [ ] Реализовать copy builders через текущий `triLang`, без русских строк в presentation-компоненте.
- [ ] Повторно запустить тест.

### Task 6: Общий финальный presentation

**Files:**
- Modify: `components/feedback/ResultsSequence.tsx`
- Create: `components/feedback/ProgressCompletionView.tsx`
- Test: `tests/progress_completion_view_contract.test.ts`

- [ ] Написать падающий контракт для трёх уровней, skip, CTA не позднее трёх секунд, reduced-motion и конечных частиц только для milestone/major.
- [ ] Запустить тест и подтвердить ожидаемое падение.
- [ ] Расширить intensity до `quiet | milestone | major`, заменить 16-мс JS-счётчик на менее частое безопасное обновление и сохранить cleanup.
- [ ] Создать presentation-компонент, который не начисляет награды и принимает только готовую модель.
- [ ] Повторно запустить контракт.

### Task 7: Подключение четырёх финалов

**Files:**
- Modify: `app/lesson_complete.tsx`
- Modify: `app/quizzes/result_view.tsx`
- Modify: `app/personal_plan_complete.tsx`
- Modify: `app/arena_results.tsx`
- Test: `tests/lesson_complete_repeat_navigation.test.ts`
- Test: `tests/completion_surface_integration_contract.test.ts`

- [ ] Написать падающий интеграционный контракт: каждый финал передаёт подтверждённый факт, накопленный след и доступный следующий шаг; arena празднует серверные награды только после ответа.
- [ ] Запустить контракты и подтвердить ожидаемые падения.
- [ ] Подключать финалы по одному, сохраняя существующие reward/review/registration/restart/back flows и текущие локали.
- [ ] После каждого финала запускать его узкий контракт до зелёного результата.

### Task 8: Производительность и финальная проверка

**Files:**
- Modify: `tests/owner_direction_runtime_contract.test.ts` только если новый конечный timer требует явного контракта
- Test: `tests/perf_freeze_contract.test.ts`
- Test: `tests/navigation_back_underlay_contract.test.ts`

- [ ] Запустить все новые узкие тесты одним Jest-вызовом.
- [ ] Запустить `tests/perf_freeze_contract.test.ts`, `tests/navigation_back_underlay_contract.test.ts`, lesson completion и modal navigation контракты.
- [ ] Проверить diff на новые `Animated.loop`, `withRepeat(..., -1)`, `setInterval`, runtime blur и анимации width/height.
- [ ] Провести release smoke на Android: быстрые повторные taps, back во время модала, reduced-motion и четыре финала; записать проверенные и непроверенные сценарии.
- [ ] Перед заявлением о завершении передать фактический diff и вывод тестов финальному Advisor review; завершение допустимо только после `DECISION: APPROVED`.

# Удаление эффекта серии 5/10 (звук, вибрация, визуал) — решение владельца

**Дата:** 2026-08-03

**Статус:** выполнено

**Область:** мобильное приложение Phraseman — `app/feedback/*`, `modules/audio/*`, экраны уроков (`lesson1.tsx`, `lesson_words.tsx`, `lesson_irregular_verbs.tsx`, `preposition_drill.tsx`)

## 1. Решение

Владелец попросил полностью убрать эффект «серии» на порогах 5 и 10 верных ответов
подряд — звук, вибрацию и визуальный оверлей (молнию). Раньше на пороге 5
проигрывалась одна вспышка (`crack`/`pm.learn.combo_5`), на пороге 10 —
двойная (`thunder`/`pm.learn.combo_10`), плюс усиленная хаптика по уровню
серии (`искра→light, молния→medium, гроза→peak`).

Найдено при предрелизном аудите ветки `feature/referral-roulette`: удаление
визуального `LightningOverlay.tsx` уже произошло в этой же ветке ДО аудита, но
звук (`pm.learn.combo_5/10`) и усиленная вибрация по уровню серии продолжали
работать через `fk.verdict()` — эффект был убран только наполовину. Решение
владельца: убрать целиком, не оставлять осколков ни в одном канале ощущений.

## 2. Что убрано

- Визуал: `components/feedback/LightningOverlay.tsx` (удалено раньше в этой же ветке).
- Звук: события `pm.learn.combo_5`/`pm.learn.combo_10` — из каталога
  `modules/audio/sound_events.ts`, профилей анимации `modules/audio/sound_motion.ts`,
  legacy-алиасов `crack`/`thunder` в `app/feedback/sound_bank.ts`, названий в
  `app/_admin_sound_lab.tsx`, ветки выбора в
  `SoundArbiter.requestLearningVerdict()` (`modules/audio/sound_arbiter.ts`).
- Вибрация: `haptics.medium()`/`haptics.peak()` (уровни «молния»/«гроза») —
  убраны из `app/feedback/haptics.ts` как ставшие мёртвым кодом; `fk.verdict()`
  больше не читает уровень серии и не усиливает хаптику.
- Мёртвая инфраструктура: экспортируемые, но нигде не вызываемые `fk.combo()`
  и `fk.comboBreak()` из `app/feedback/feedback_kit.ts`; локальные счётчики
  `fkComboRef`/`fkStreakBefore`, которые существовали только для передачи
  длины серии в `fk.verdict({ combo })`, — убраны из всех четырёх экранов
  уроков.
- Ассеты: `.wav`-файлы `pm_learn_combo_5_v1.wav`, `pm_learn_combo_10_v1.wav`,
  а также найденные попутно неиспользуемые `assets/audio/ui/crack.wav`,
  `thunder.wav`, `thunder_far.wav` (легаси до перехода на Sound Director).
- Build-скрипт `scripts/prepare_phraseman_sfx.mjs`: убраны записи
  `pm.learn.combo_5/10`, обновлён контрактный тест
  `tests/phraseman_sfx_assets.test.ts` (39 → 37 включённых событий).

## 3. Что осталось нетронутым (сознательно)

- `app/feedback/combo_engine.ts` (`comboLevelFor`, `createComboEngine`) — чистая
  функция уровня серии. Всё ещё используется визуальным `ComboRing` в
  `lesson1.tsx` (кольцо-индикатор серии на экране) — это отдельный, более
  тихий визуальный элемент, эффекта «молнии» не воспроизводит и не был частью
  запроса на удаление.
- `haptics.light()` — используется `fk.transition()` при смене задания,
  никогда не был частью эффекта серии как такового.
- `components/LessonEnergyLightning.tsx` — «молния» энергии урока, полностью
  отдельная фича (индикатор запаса попыток), не связана с серией ответов.

## 4. Итог для вердикта ответа

`fk.verdict({ correct })` теперь всегда даёт один и тот же результат
независимо от длины серии: `pm.learn.correct`/`pm.learn.needs_work` (или
`completionEvent` на завершении блока) + `haptics.correct()`/`haptics.wrong()`.
Длина серии, если экрану всё ещё нужна для собственной логики (XP, `ComboRing`),
считается только через `combo_engine.ts`, не связана с ощущениями.

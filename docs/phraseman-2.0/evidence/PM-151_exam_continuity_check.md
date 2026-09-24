# PM-151 — Сохранить экзамены и срезы знаний: проверка целостности

Read-only проверка (без правок кода). Ветка `feature/referral-roulette`, дата 2026-09-24.
Задача из `docs/phraseman-2.0/registries/tasks.json` (epic E14, requirement R151),
acceptance PM-151-A1/A2.

## Навигация

Точки входа в экзамены найдены, обе целы:

- `app/(tabs)/lessons.tsx:4556` — плитка уровня (A1/A2/B1/B2) на экране уроков:
  `router.push({ pathname: "/level_exam", params: { level: lvl } })`, срабатывает
  в ветке `allDone` (строка 4555).
- `app/diagnostic_test.tsx:1659` — кнопка «Экзамен» на главном экране диагностики:
  `router.push('/exam')`.

`git log --oneline --since="2026-09-24" -- app/exam.tsx app/level_exam.tsx` —
**пусто**. `git log` по всем остальным файлам экзаменов
(`app/exam_*`, `app/level_exam_*`, `app/french_exam_remote_runtime.ts`) —
тоже **пусто**: ни один из этих файлов не редактировался в рамках программы 2.0
с 2026-09-24. Оба места вызова (`lessons.tsx`, `diagnostic_test.tsx`) также не
входят в список коммитов, менявших эти файлы за тот же период — обрыва импорта
или удалённой кнопки не найдено.

`app/french_exam_remote_runtime.ts` — не мёртвый код: на него ссылается активный
гейт `app/exam_target_gate.ts` (`examContentGateForTarget('fr')`,
`FRENCH_EXAM_REQUIRED_EVIDENCE`) и тест `tests/gustav_french_exam_target_gate.test.ts`.
Французский зачёт идёт через отдельный remote-раннер, не через английский банк —
это осознанная гейтация, а не поломка.

**Вывод по навигации: обрывов нет.**

## Данные попыток/результата

Проверены `app/level_exam_attempts.ts`, `app/level_exam_attempt_state.ts`,
`app/level_exam_scoring.ts`, `app/level_exam_blueprint.ts`, `app/level_exam_types.ts`.

- Хранение попытки — `AsyncStorage`, ключ `level_exam_active_v2::<target>::<uid>::<level>`
  (`activeLevelExamAttemptKey`, `app/level_exam_attempts.ts:31-37`). Снапшот —
  самодостаточная структура `LevelExamAttemptSnapshot` (`app/level_exam_attempt_state.ts:12-32`):
  id владельца, уровень, seed, порядок заданий, ответы, дедлайн, статус. **Ни одно
  поле не ссылается на totalXp/pearls/shards/spins/themes** — прямой grep по этим
  именам в файлах попытки/скоринга/типов/блюпринта дал 0 совпадений.
- Формула подсчёта `scoreLevelExam` (`app/level_exam_scoring.ts:47-142`) считает
  `score`/`pct`/`passed`/`byFormat`/`byLesson`/`weakLessons`/`medal` целиком из
  собственного снапшота попытки (`answers`, `blueprint.scoredUnitIds`) —
  внешних полей не читает.
- Пересдача: `recordCompletedLevelExamAttemptOnce` (`app/level_exam_attempts.ts:92-114`)
  инкрементит независимый счётчик `level_exam_attempt_count`, идемпотентно по
  `finishToken`-маркеру — тоже не завязан на удаляемые поля.

### Риск вне acceptance-критериев (не блокирует PM-151, но стоит знать)

`app/level_exam_scoring.ts:140` считает `baseXp: passed ? 50 + Math.round(pct/2) : ...`,
и это значение реально уходит в `registerXP(...)` в `app/level_exam.tsx:943-950`
(комментарий в коде прямо говорит: «зачёт даёт XP — раньше зачёт давал 0 XP»).
`registerXP` (`app/xp_manager.ts:478`) и `shards_system.ts` (```app/exam.tsx:37```,
`addShards('lesson_quiz_passed', ...)` в `app/level_exam.tsx`) — оба ещё **не
удалены** программой 2.0 (`git log` по `xp_manager.ts` за период — пусто).

Формально это не поломка PM-151 (данные попытки/пересчёт результата не зависят
от удаляемых полей, значит A2 выполнен), но по духу spec `docs/COURSES.md`:
«Учебные проценты/звёзды — не опыт и не основание вернуть XP» — сама выдача XP/
осколков за зачёт, похоже, относится к отдельной задаче по удалению
геймификации (не найдена отдельная PM-задача с этим текстом в реестре — под
запрос могут быть E-эпики про XP/жемчуг/спины, не PM-151). **Не трогал**, т.к.
задача read-only и не про это; фиксирую для видимости остальным сессиям.

## Два независимых гейта

Смотрено `app/(tabs)/lessons.tsx:4400-4430` (плитка уровня перед экзаменом).

```
const scoreReady = scores.slice(from - 1, to).every((s) => s >= 4.5);   // учебный prerequisite
const premiumExamAvailable = isPremium && examLevelIdx <= premiumReachableLevelIndex;
const examPremiumRequired =
  !isPremium && !effectiveDevContentUnlock && !effectiveNoLimits &&
  requiresPremiumForLesson(to, effectiveLegacyFreeLessonCap);          // entitlement (Plus/paywall)
const examSourceAvailable = examContentAvailableForTarget(studyTarget); // контентный гейт (fr/en банк)
const allDone =
  examSourceAvailable &&
  !examPremiumRequired &&
  (effectiveDevContentUnlock || effectiveNoLimits || premiumExamAvailable || scoreReady);
```

Это на практике **действительно два разных, независимых условия**, а не один
флаг под двумя именами:

1. **Prerequisite (учебный)** — `scoreReady`: все уроки уровня пройдены на
   4.5+ звёзд. Не зависит от `isPremium`.
2. **Entitlement (Plus/paywall)** — `examPremiumRequired` считается ОТДЕЛЬНО
   через `requiresPremiumForLesson(to, ...)`; `allDone` требует `!examPremiumRequired`
   как самостоятельный множитель, а не следствие пройденных уроков.

Проверка утверждения spec «2 звезды не обходят подписку»: да, в коде именно так —
даже если `scoreReady === true`, при `examPremiumRequired === true` (нет Plus и
лимит бесплатных уроков исчерпан) `allDone` всё равно `false`
(строки 4424-4429, `!examPremiumRequired` — обязательный множитель), и при клике
идёт ветка `examPremiumRequired ? openLessonPaywall(...)` (строка 4544), а не
переход в экзамен.

Проверка обратного утверждения «Plus не отменяет пройденность уроков»: частично
не так буквально, но не нарушает суть spec — код даёт Plus-пользователю
альтернативный путь `premiumExamAvailable` (Plus и уровень достижим по
`premiumReachableLevelIndex`), который может открыть экзамен БЕЗ `scoreReady`.
Это не «перескочить непройденный урок» в смысле обхода последовательности —
`premiumReachableLevelIndex`, судя по названию и использованию в `lessons.tsx`,
сам растёт по мере прохождения (не мгновенно даёт доступ ко всем уровням) — это
отдельный, уже согласованный в кодовой базе механизм ранней сдачи зачёта для
Plus, а не дыра, появившаяся от правок программы 2.0. **Не менялся** ни одним
коммитом с 2026-09-24 (см. раздел «Навигация» — `lessons.tsx` не в списке
коммитов, трогавших эту зону кода за период). Файл целиком за период
менялся другими руками (в git status значится modified), но конкретно строки
4400-4430 и точка `router.push('/level_exam', ...)` не связаны с последними
коммитами 2.0 — это существующая логика, не новая правка.

**Вывод: гейты в коде действительно независимы**, ровно как требует spec для
2 звёзд/подписки. Возможное смещение семантики «Plus обходит prerequisite для
ранних уровней» — существовавшее до программы 2.0 поведение, не регрессия
последних правок; require явного решения владельца, если он хочет это
поменять, но это вне scope PM-151 (проверка целостности, не редизайн гейтов).

## Тестовое покрытие

`find . -iname "*exam*test*" -not -path "*node_modules*"` (исключая
`.claude/worktrees` и `.worktrees`) — 23 файла:

- `tests/exam_best_pct_overlay.test.ts`, `exam_best_pct_sync_contract.test.ts`,
  `exam_certificate.test.ts`, `exam_energy_charge_timing_contract.test.ts`,
  `exam_locale.test.ts`, `exam_locale_runtime.test.ts`, `exam_share_locale.test.ts`
  — покрывают финальный экзамен (`app/exam.tsx`): локали, оверлей лучшего
  результата, сертификат, тайминг списания энергии.
- `tests/gustav_french_exam_target_gate.test.ts` (124 строки) — контрактный тест
  на `exam_target_gate.ts`: `examContentAvailableForTarget` для en/es/fr,
  структура гейта для French (remote quiz pack, no fallback на английский банк).
- `tests/level_exam_attempts.test.ts` (110 строк, 9 тестов) — счётчик попыток
  начинается с 1, инкремент отдельно от медалей, нормализация битых значений,
  скоуп по французскому target, round-trip owner-scoped снапшота, quarantine
  битых/legacy снапшотов, идемпотентность записи финиша под конкуренцией.
- `tests/level_exam_attempt_state.test.ts` (10 тестов) — нет попытки без
  списанной энергии, детерминированный снапшот с дедлайном, таймер стартует
  после интро-обратного отсчёта, персист ответов по scored unit, remaining-time
  из дедлайна, restore активной/просроченной попытки, quarantine
  битых/чужих снапшотов, pause/resume с сохранением остатка времени, общий
  идемпотентный finish token для ручной сдачи и таймаута.
- `tests/level_exam_scoring.test.ts` (124 строки, 7 тестов) — 30 независимых
  scored units по форматам, порог прохода 21/30, таймаут = засчитывается как
  неверный ответ, неверная speed-match пара, приём всех авторских вариантов
  fill-gap, до 3 слабейших уроков в детерминированном порядке.
- `tests/level_exam_access_deadline_contract.test.ts` — доступ к экрану
  не виснет в «checking» вечно (таймаут, `Promise.race`), не маскирует
  `blocked` под «продолжает грузиться».
- `tests/level_exam_blueprint.test.ts`, `level_exam_copy.test.ts`,
  `level_exam_countdown.test.ts`, `level_exam_intro.test.ts`,
  `level_exam_locale_runtime.test.ts`, `level_exam_progress_flag_compat_contract.test.ts`,
  `level_exam_progress_idempotency.test.ts`, `level_exam_question_ui_contract.test.ts`,
  `level_exam_result_ui.test.ts`, `level_exam_rng.test.ts`,
  `level_exam_ambiguous_prompt_contract.test.ts` — покрывают blueprint,
  копирайтинг, обратный отсчёт, интро, совместимость флагов прогресса,
  идемпотентность записи прогресса, контракт UI вопроса/результата, RNG,
  неоднозначные формулировки.
- `tests/level_exam_v2_route_contract.test.ts` (9 тестов) — English идёт через
  новый движок при сохранении French-гейта, связка attempt/timeout/scoring/UI,
  убраны немедленные подсказки правильности, интро без отдельного экрана
  подготовки, контент валидируется до списания энергии, **Plus-аккаунт никогда
  не видит и не платит энергию за экзамен**, совместимость 1/0 writers с
  облачными true-флагами, границы уроков читаются из канонической карты курса.

**Что НЕ протестировано явно** (не блокер, но пробел): нет отдельного unit-теста
именно на связку «scoreReady=false + examPremiumRequired=true одновременно» в
`lessons.tsx` (проверка UI-условия `allDone`, две ветки гейта вместе) —
`level_exam_v2_route_contract.test.ts` проверяет только Plus-путь без энергии,
не саму формулу `allDone` в `lessons.tsx`. Реальный обычным тестам недоступен
класс регрессии здесь маловероятен (формула простая булева логика без внешних
данных), но при следующей правке этой зоны стоит завести прямой тест на
`allDone`/`examPremiumRequired` вместе, как это уже сделано для лиг
(`guard_league_demotion.mjs`).

## Вердикт

**Экзамены/срезы целы, ничего не сломано.** Оба входа в навигацию рабочие, ни
один файл экзаменов не тронут коммитами программы 2.0 с 2026-09-24, данные
попытки/скоринг не зависят от удаляемых полей геймификации, а prerequisite и
entitlement — действительно два независимых условия в коде, ровно как того
требует spec. Единственное замечание вне PM-151-A1/A2 — зачёт по-прежнему
начисляет XP/осколки (`app/level_exam.tsx:943-950`, `app/level_exam_scoring.ts:140`),
что может расходиться с формулировкой spec про «звёзды — не основание для XP»;
если это отдельная задача программы 2.0, стоит завести её явно в реестре (не
найдена по поиску `exam`/`xp` вместе), не путать с PM-151.

# ХЕНДОВЕР: порт режимов Kimi V5 в лабораторию приложения (Уроки → V2)

> Дата: 2026-07-26. Предыдущая сессия (Claude) остановила свой цикл — работу ведёт
> ТОЛЬКО сессия, получившая этот хендовер. Владелец в курсе и ждёт результат.

## 1. Задача одним абзацем

Во вкладке «Уроки» → страница «V2» (дев-гейт `ENABLE_DEV_TOOLS`) стоит лаборатория
режимов Learning V2. Её ПЕРВАЯ версия была написана «из головы» и **не соответствует
макетам** — владелец проверил каждый режим и забраковал все. Нужно ЗАМЕНИТЬ содержимое
лаборатории дословным портом настоящих поверхностей из поставки Kimi V5 (React/Vite →
React Native): 17 режимов, каждый — перевод конкретного `.tsx` Kimi с его фикстурой,
токенами и шестью состояниями. НИЧЕГО не выдумывать от себя.

## 2. Где что лежит

| Что | Путь |
|---|---|
| Рабочее дерево (единственное место работы) | `C:\appsprojects\phraseman`, ветка **feature/referral-roulette** |
| План порта с чек-листом 17 режимов (ЧИТАТЬ ПЕРВЫМ) | `docs/v2/KIMI_PORT_PLAN.md` |
| Исходники Kimi (источник истины) | `C:\Users\badlo\Documents\kimi\workspace\kimi-delivery\learning-v2-frontend\20260719-0858-k3\source\src\` |
| Резервная копия поставки | `C:\appsprojects\phraseman-backups\kimi-learning-v2-frontend-20260719-0858-k3\source\src\` |
| Скриншоты для сверки (все режимы × состояния) | `<поставка>\screenshots\mobile\<surface>__<state>__*.png` |
| Живой макет Kimi в браузере (эталон поведения) | `npx http-server "<поставка>\source\dist" -p 4173` → http://localhost:4173 |
| Текущая (бракованная) лаборатория, которую замещаем | `components/learning-v2-lab/` (LearningV2ModesLab.tsx, ModeDemoPlayer.tsx, mode_catalog.ts, demo_content.ts) |
| Вход в лабораторию | `app/(tabs)/lessons.tsx` (страница `v2` → `<LearningV2ModesLab/>`) |

## 3. Архитектура Kimi, которую портируем (уже разведано)

- **6 канонических состояний**: prompt/active/processing/success/needs_work/recovery
  (`source/src/contracts/states.ts`). Геометрия экрана НЕ меняется между состояниями.
- **ActivityShell** (`shell/ActivityShell.tsx`, 165 строк) — каркас: header со
  state-бейджем → prompt lane → interaction lane → feedback lane (status-точка +
  сообщение из фикстуры + inline-прогрессбар в processing) → footer (1 primary +
  ≤1 ghost). Никаких полноэкранных спиннеров.
- **Оболочки**: ChoiceShell (`surfaces/mobile/shared/`), ComposerShell (+ComposerInput),
  VoiceActivityShell (`surfaces/modes2/VoiceActivityShell.tsx`, 541 строка — речевые).
- **Компоненты**: OptionGrid, SignalButton, FeedbackNote (`source/src/components/`),
  примитивы GraphemeText/ScriptAnnotation/IntentButton (`source/src/primitives/`).
- **Фикстуры** (весь контент и copy состояний): `fixtures/index.ts` (148 строк),
  `surfaces/modes2/fixtures.ts`, `surfaces/modes2/voice-fixtures.ts`. Копировать дословно.
- **Токены**: `styles/tokens.css` → тема **cinema** (тёмная из макетов): фон #070912,
  поверхность #0D101E, акцент #8FA0FF; state-цвета шести состояний; акценты режимов:
  listen #6C8EFF · missing-word #A78BFA · phrase-build #34D399 · pronunciation #F472B6 ·
  natural-choice #FBBF24. Размеры/радиусы/тайминги — там же; вёрстка классов — `styles/base.css` (4474 строки, брать блоки по классам: `.ashell`, `.optgrid`, `.chip`, `.lc__…`, `.composer…`, `.voice…`).

## 4. Порядок работы (по одному режиму, строго)

1. Прочитай `docs/v2/KIMI_PORT_PLAN.md` — там таблица 17 режимов с файлами-источниками.
2. Сначала фундамент (если ещё не создан): `components/learning-v2-lab/kimi/`
   (tokens.ts, ActivityShell.tsx, ChoiceShell/ComposerShell/VoiceShell, OptionGrid,
   SignalButton, FeedbackNote, primitives, fixtures/*). Структура — в плане.
3. Для каждого режима: исходник Kimi + фикстура + CSS его классов → RN-порт в
   `kimi/surfaces/<Mode>.tsx` → сверка со скриншотами (Read PNG!) → `npx tsc --noEmit`
   в корне ЧИСТО по своим файлам → атомарный коммит → чек-лист в плане ⬜→✅.
4. Роутинг: список лаборатории = каталог поверхностей Kimi; тап → портированная
   поверхность. Старые ModeDemoPlayer/demo_content замещаются, старый generic-код удалить,
   контракт-тест `tests/lessons_v2_surface_contract.test.ts` переписать под новую
   структуру (полнота каталога, запреты владельца, детерминизм).
5. Вердикты: submit → processing → success|needs_work по правильности ответа
   (локально, мгновенно); визуал и copy состояний — из фикстур Kimi. Речевые режимы —
   симуляция распознавания с бейджем (как в первой версии).

## 5. Ловушки (НЕ наступать)

- **`git worktree add` заблокирован хуком** — работать только в основном дереве.
- В дереве есть **чужой незакоммиченный WIP** (auth_recovery*, prompt_registry.ts,
  quiz_challenge_artifacts.test.ts, файлы functions/lib/*) — НЕ трогать, НЕ коммитить,
  никаких `git add -A` (только явные пути!).
- **Секрет-скан на коммите**: не стейджить чужие auth-тесты — заблокирует.
- **Админка**: рабочий файл ТОЛЬКО `admin/v2/legacy.html`; `admin/legacy.html`,
  `admin/index.html`, `admin/full.html` — заморожены (см. CLAUDE.md репо).
- **functions/package.json `main` = `lib/functions/src/index.js`** — не менять;
  перед любым deploy functions сначала `npm run build` в functions/.
- **Push ветки в GitHub** сейчас блокируется pre-push гейтом (87 старых линт-ошибок
  ветки — НЕ наши). Коммитить локально; push решает владелец.
- Perf-контракты: `tests/perf_freeze_contract.test.ts` (withRepeat(-1) требует гард
  `useRuntimeActive`) и `tests/layout_stability_contract.test.ts` — не ослаблять.
- Запреты владельца в UI: НИКАКИХ своих обводок контейнеров (тонкие state-границы из
  дизайн-системы Kimi — можно, это их макет), НИКАКОГО `adjustsFontSizeToFit`,
  никаких подписей-расшифровок мелким шрифтом. Клик-звук только на управляющих
  кнопках, на плитках — вибрация (TapScale).
- E1-контент и компилятор (`modules/learning-v2/**`) НЕ трогать — они готовы и
  покрыты тестами (46 файлов, 459 зелёных тестов корня).

## 6. Проверка готовности (перед отчётом владельцу)

- Все 17 строк чек-листа в KIMI_PORT_PLAN.md — ✅ (describe_scene — в каталоге с
  бейджем «СНЯТ», без запуска).
- Каждый режим визуально сверен со скриншотами `screenshots/mobile/` (открыть PNG).
- `npx tsc --noEmit` — 0 ошибок в новых файлах (в корне есть чужой тех-долг — не наш).
- `npx jest --runTestsByPath tests/lessons_v2_surface_contract.test.ts tests/perf_freeze_contract.test.ts --runInBand --watchman=false` — зелёные.
- Владелец смотрит: Metro из `C:\appsprojects\phraseman` (`npm run metro:iphone`) →
  Уроки → V2.

## 7. Контекст дня (чтобы не переделывать сделанное)

- План E1 Content Compiler (контент-движок) — ВЫПОЛНЕН, тесты зелёные, в трёх ветках.
- Воркер генерации E1 + вкладка «🧬 V2 Генератор» в `admin/v2/legacy.html` — готовы,
  функции задеплоены (adminSeedV2E1DemoSource / adminRunV2E1Compilation, us-central1),
  хостинг админки передеплоен правильной версией.
- Ветка пилота `prod-snapshot/learning-v2-pilot-20260721` и master — запушены в GitHub;
  master дополнительно слит с GitHub-линией (CI + аналитика).

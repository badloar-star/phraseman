# Task packet: что нужно владельцу, чтобы перенести два старых экрана сессии Learning V2 на токены темы

Governance-ID: TG-F33C0EFFAB0E
Status: Cancelled 10.10 21:05 — не нужно: router.ctx.js вырезает все `*learning[_-]v2*.tsx` из стор-сборки (EXPO_PUBLIC_STORE_RELEASE=1), эти два экрана в релиз не попадают. Владельцу решать нечего; скрипт оставлен на случай возврата экранов в релиз.
Owner: сессия «4 · ТЕМЫ 2.0» (подготовка); запускает владелец или сессия с правом записи в эти файлы
Related epic/enabler: координатор 10.10 20:22 и 20:40; цвета по выбранной теме везде

## Outcome

Два экрана рисуют свою тёмно-синюю палитру и не реагируют на выбор темы:
- `app/learning-v2/session/[id].tsx` — 118 цветов; старый экран сессии, работает при `studyTarget !== "en"` (для английского идёт новый плеер `LearningV2DirectSessionPlayerV1`);
- `app/learning_v2_session_intro_check.tsx` — 52 цвета; проверка интро (3 вопроса).

Всё механическое сделано одним скриптом `scripts/codemod_lv2_session_theme_tokens.mjs`: цвета-литералы → токены темы (`g.text`, `g.opaqueCard`, `g.glassEdge`, `g.accent`, `g.good`, `g.bad`, `g.warn`…), `StyleSheet.create` → `createStyles(g)`, хук темы и мемо в компонентах. Разметка и логика не меняются. Цвета семейств режимов (`MODE_META.accent`, градиент режима, свечение) остаются и помечаются `theme-exempt`.

## Scope

In scope: ровно два файла выше + база храповика цветов (`config/theme-hardcoded-colors-baseline.json`).
Out of scope: Главная, `LearningV2DirectSessionPlayerV1`, файлы с чужими незакоммиченными правками.

## Architecture

Скрипт по умолчанию ТОЛЬКО считает и печатает (файлы не меняет). Запись — только с флагом `--write`, и только если синтаксис результата цел (проверка через TypeScript). Если место вставки в файле изменилось, скрипт останавливается с «не найдено место» и ничего не пишет в этот файл.

Последний пробный прогон (только просмотр, 10.10): `[id].tsx` — заменено 106 цветов, ошибок синтаксиса 0, не сопоставлен 1 (`#6FD6FF` — свечение режима, помечается exempt); `intro_check` — заменено 49, ошибок 0, не сопоставлено 0.

## Security and privacy

Не применимо.

## Technical debt

- Если в файлах появятся чужие незакоммиченные правки, коммитить только свои хунки (`git apply --cached` во временный индекс).
- Тёмная «Спокойно» немного изменит вид этих экранов (токены темы вместо прежних тёмно-синих) — это и есть цель; «приложение = макет» для старых экранов макетов нет.

## Verification

Команды по порядку (из корня репозитория, слот светофора на jest):

```bash
# 0. Файлы должны быть чистыми (пустой вывод)
git status --short "app/learning-v2/session/[id].tsx" app/learning_v2_session_intro_check.tsx

# 1. Просмотр (ничего не пишет): ожидается «заменено цветов 106 / 49», «синтаксических ошибок 0»
node scripts/codemod_lv2_session_theme_tokens.mjs

# 2. Запись
node scripts/codemod_lv2_session_theme_tokens.mjs --write

# 3. Сторожа
node --test tests/learning_v2_liquid_glass_source_contract.test.mjs tests/theme_hardcoded_colors_ratchet.test.mjs
npm run test:one -- tests/short_screen_layout_contract.test.ts
npm run test:one -- tests/theme_palette_roles.test.ts

# 4. Обновить базу храповика цветов (после записи счёт упадёт на ~150)
node tests/theme_hardcoded_colors_ratchet.test.mjs --update
```

Затем смотреть в эмуляторе (русский или испанский язык обучения, не английский): сессия Learning V2 и проверка интро в тёмной и в светлой теме; текст, значки, кнопки и ответы «верно/неверно» читаются. Откат одним `git restore -- <файл>` или `git revert`.

## Rollback

`git restore --worktree -- "app/learning-v2/session/[id].tsx" app/learning_v2_session_intro_check.tsx` до коммита; после коммита — `git revert`.

## Инцидент (для прозрачности)

10.10 при подготовке я запускал вспомогательный скрипт «пробный прогон без записи», но флаг не был реализован, и он ЗАПИСАЛ оба файла (без вставки хуков — экраны были бы сломаны). Ошибку нашёл при следующей проверке и откатил оба файла к закоммиченной версии (`git restore --worktree`); сейчас они чистые. Скрипт в репозитории переписан: запись только с `--write`.

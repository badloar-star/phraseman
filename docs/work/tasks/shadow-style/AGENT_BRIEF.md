# Стиль «Тень» — задание исполнителю по группе файлов

Решение владельца 12.10.2026 («ВТОРОЙ ВАРИАНТ ДЕЛАЕМ!»): **контейнеры БЕЗ обводок**. Плашку отделяют тень и градиент 180°; выбранное/главное приподнято.
Спека: `docs/design/v2-app/SHADOW_STYLE_SPEC.md`. Эталоны (HTML, открыть можно Read-ом): `docs/design/v2-app/shadow-style-etalon.html`, `-2.html`, `-3.html`.
Слой kit уже готов и закоммичен — **бери из него, своих чисел не пиши**: `components/v2/ShadowSurface.tsx` (`PlateFill`, `plateBoxShadow(g)`, `nestedBoxShadow(g)`, `raisedBoxShadow(g)`, `actionBoxShadow(g)`, `RAISED_LIFT`, `useShadowGlass()`),
токены темы `g = liquidGlassTokens(liquidGlassThemeId)`: `plateFillFrom/To`, `raisedFillFrom/To`, `dividerTone`, `opaqueControl` и т.д. Примеры уже переделанных файлов (посмотри перед работой):
`components/cards-grid/CardsKit.tsx`, `components/mistakes-panel/PanelKit.tsx`, `components/mistakes-panel/PracticeKit.tsx`, `components/packs/PackRow.tsx`, `components/v2/V2Kit.tsx`, `components/v2/GlassAlertDialog.tsx`, `components/paywall/PaywallPlus.tsx`.

## Что убрать (КОНТЕЙНЕР = плашка, карточка, строка, плитка, пилюля, поле, кнопка с заливкой, шторка, окно)
- `borderWidth` / `borderColor` вокруг контейнера (в т.ч. `glassEdge`, `hairline*`, `line`, `border`, `stroke`, `outline`).
- Внутренние кромки: `boxShadow` с `inset: true` (`spreadDistance` ≥ 0.5, фаски `bevelHi/bevelLo`, `ringShadow`, `bevelShadow`, `kitGlassRim`), диагональные блики «150°» как кромка.
- Контурные кнопки («ghost» с рамкой) — заменить плашкой с малой тенью.

## Чем заменить
| Что | Как |
|---|---|
| Плашка/карточка/строка/поле/пилюля | заливка `<PlateFill g radius />` первым ребёнком (или `backgroundColor: g.plateFillFrom`) + `boxShadow: plateBoxShadow(g)` на контейнере |
| Вложенное (плитка-иконка, кнопка, чип внутри плашки) | фон `g.dividerTone` или `g.opaqueControl` + `boxShadow: nestedBoxShadow(g)` |
| Выбранное/главное | `PlateFill raised` + `raisedBoxShadow(g)` + сдвиг `transform: [{ translateY: RAISED_LIFT }]` **на внешней обёртке** (высота ряда не меняется) |
| Кнопка действия | цвет темы + `actionBoxShadow(g)` |
| Строки внутри групповой плашки | без своей плашки; между строками разделитель — высота 1 (`StyleSheet.hairlineWidth` допустим), цвет `g.dividerTone` (разделитель-линия НЕ контейнер) |
| Шторка снизу / окно поверх затемнения | без кромки; окно по центру — `plateBoxShadow(g)`; шторку отделяет затемнение |
| Отступ между плашками | ≥ 10 (тень должна «дышать») — если плашки слиплись, раздвинь `gap`/`marginTop` до 10 |

## Что ОСТАВИТЬ (это не обводка контейнера — не трогай, но в итоговом отчёте перечисли файл:строку и причину)
- кольца состояния исхода ответа «верно/неверно» (зелёное/красное) и индикатор выбора (радио-кольцо, чекбокс);
- дорожки и кольца прогресса, диаграммы, аватар-кольцо ранга/уровня, разделители-линии между строками, пунктир зон загрузки, трек переключателя (`switch_track_border_contract`), фокус-кольцо ввода в цвет акцента;
- границы внутри иллюстраций/арта (SVG), ленточки бейджей, обводка текста.
Сомневаешься — убирай обводку и компенсируй тенью/тоном; не оставляй «на всякий случай».

## Ловушки
- **`overflow: 'hidden'` на контейнере с `boxShadow`** может обрезать тень (особенно iOS). Если нужно скругление содержимого — клип на внутреннем слое (`PlateFill` уже со скруглением), либо если без этого нельзя — оставь `overflow` и опиши в отчёте.
- Не меняй логику, пропсы, `testID`, обработчики, тексты, раскладку (кроме снятия 1-pt рамки и отступа ≥ 10). Без новых зависимостей.
- Размеры шрифта: только 16/13 (и заголовки ≥ 19) — не вводи новых размеров. Не используй `adjustsFontSizeToFit`.
- Цвета — только токены темы (`g.*`); литералы цветов запрещены (сторож `two_theme_static_colors`), исключение — комментарий `theme-exempt: причина`.
- Не создавай ветки/worktree/stash. Работай в общем дереве. Файл правит другая сессия (есть чужие незакоммиченные изменения в нём — `git diff --stat <файл>` перед правкой)? Не лезь в него, перечисли в отчёте.

## Проверка (обязательно, тяжёлое — только со слотом)
1. Слот: `until bash .claude/semaphore/slot.sh acquire "Тень: <группа>" | grep -q "^GO"; do sleep 12; done` … `bash .claude/semaphore/slot.sh release` (слот один на всех — держи его ТОЛЬКО на время команды).
2. Типы: полный `tsc` на этой машине падает по памяти (exit 127, пусто). Делай срез: создай `C:/Temp/claude/tsconfig.<группа>.json` (`extends` корневой tsconfig, `compilerOptions: { noEmit: true, skipLibCheck: true, incremental: false }`, `include` — `expo-env.d.ts` + твои изменённые файлы, `exclude: []`) и запусти `NODE_OPTIONS=--max-old-space-size=6144 node node_modules/typescript/lib/tsc.js -p <файл> --pretty false`. Ожидаем пустой вывод и код 0.
3. Тесты точечно (НЕ весь набор): `*.test.mjs`/`.cjs` — `node --test tests/<файл>`; `*.test.ts(x)` — `npm run test:one -- tests/<файл>` (не `npx jest`!). Найди тесты по имени экрана: Grep по `tests/` (`*_source_contract*`, `*_liquid_glass_*`, `borderless_*`, `typography_*`, `layout_stability_contract`, `two_theme_static_colors_contract`, `text_integrity_inventory`). Обязательно прогнать: `tests/borderless_surface_guard.test.ts`, `tests/borderless_surface_audit.test.ts`, `tests/shared_borderless_surfaces_contract.test.ts`, `node --test tests/typography_two_sizes_ratchet.test.mjs tests/typography_store_surface_ratchet.test.mjs`.
4. Красный контракт, который утверждает СТАРУЮ обводку/кромку (`glassEdge`, `inset: true`, `borderWidth: 1`, `bevelHi`…) → перепиши под новое правило (assert: у контейнера нет обводки/кромки, есть `plateBoxShadow`/`PlateFill`/…); **не ослабляй** (не удаляй проверку, не расширяй allowlist ради прохода). Красный «хэш AST/базовая линия», где менялся ТОЛЬКО стиль — обнови хэш с комментарием «зачем (Тень 12.10)». Красный по причине, не связанной с твоей правкой, — не чини, перечисли.
5. Коммит: `/c/Temp/claude/commit_files.sh "feat(shadow): <группа> — контейнеры без обводок (стиль «Тень»)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" <список ТОЛЬКО своих файлов>` — скрипт сам берёт замок и временный индекс, печатает `parent==base: 1`. Перед коммитом `git diff --numstat -- <файл>` — убедись, что в диффе только твои правки. Коммить пачками (по 8–15 файлов), не одним гигантским.
6. Если хук пишет `TASK GOVERNANCE ARMED: TG-…` и блокирует запись — добавь строку `Governance-ID: TG-…` (как напечатано) в `docs/work/tasks/shadow-style-and-energy-dev-2026-10-12.md` под существующими и повтори.

## Отчёт (в конце, коротко, по-русски)
Хэши коммитов; сколько файлов переделано; что оставлено намеренно (файл:строка — причина); что не тронуто из-за чужих правок; какие тесты обновлены/красные не по твоей вине; места, где подозреваешь клип тени (`overflow`) или слипшиеся плашки; что должен снять Эмулятор.

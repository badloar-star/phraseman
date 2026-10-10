# Task packet: единый эталон нажатия (TapScale и общие Pressable-обёртки) и время шторок; хвосты аудита тона

Governance-ID: TG-C56E2902B98E
Status: In progress
Owner: сессия «2 · Дизайн» (поручение координатора 10.10 03:25)
Related epic/enabler: status-tone-audit-2026-10-10.md; lesson-press-and-home-review-2026-10-10.md; гейт «приложение = макет»

## Outcome

1. Окно аккаунта в настройках: «Сменить аккаунт»/«Продолжить» — цветом главной кнопки темы, не зелёным «успех».
2. Петля ошибок: красный значок «повтор» — осознанный, с комментарием «зачем».
3. Настройка тренировки: состояния `invalid`/`exhausted` получают главную кнопку (9 языков).
4. Общий TapScale и другие общие Pressable-обёртки = kit.js: вдавливание 90 мс до 0.97, отпускание 240 мс cubic-bezier(.3,1.4,.5,1). Один коммит на систему, сторож `tapscale_layout_trap_guard` и контракты зелёные.
5. Общий компонент шторок/окон: появление 440 мс cubic-bezier(.2,1,.3,1).

## Scope

In scope: view-слой и общие компоненты нажатия/шторок, их тесты-контракты. Out of scope: логика экранов, Learning V2, Шпиль, файлы Codex.

## Architecture

Источник правды по движению — `constants/motionHybrid.ts` (`KIT_MOTION`), зеркало kit.js макетов. Общие компоненты читают значения из `KIT_MOTION`.

## Security and privacy

Не затрагивает данные.

## Technical debt

Contain: расхождения, требующие решения владельца/макета, фиксируются в документе.

## Verification

Синтаксис (babel), узкие node-сторожа (`tests/tapscale_layout_trap_guard.test.mjs`, контракты TapScale), без полного сюита.

## Rollback

Отдельные коммиты, `git revert`.

## Результат (10.10 ~05:00)

**1–3. Хвосты аудита тона.** Окно аккаунта в настройках: «Сменить аккаунт», «Продолжить» и значок щита — `t.accent` вместо `t.correct` (только мои ханки; чужой ханк «гость: прогресс только на этом телефоне» в `settings.tsx` не включён). Петля ошибок: красный значок «повтор» оставлен осознанно, добавлен комментарий «зачем». Настройка тренировки: у `exhausted` и `invalid` появилась главная кнопка «Назад» (9 языков через `copy.back`), testID `fc-training-setup-exhausted-back` / `-error-back`.

**4. Единый эталон нажатия.** Новый `constants/kitPress.ts` (числа только из `KIT_MOTION` = kit.css:64–65): вдавливание 90 мс до .97 и opacity .86, отпускание 240 мс cubic-bezier(.3,1.4,.5,1), opacity 160 мс. На него переведены три общие обёртки: `TapScale` (было: пружина, 0.88, opacity .6), `PressableScale` (пружина, 0.94–0.988 по ролям) и `PressableHybrid` (вдавливание Easing.out(cubic), возврат пружиной, scale по ролям). Масштаб по умолчанию .97 для всех ролей; явные `scaleTo`/`pressScaleTo` в 43 вызывающих местах остались как осознанные исключения (список — `grep -rn "scaleTo=\|pressScaleTo=" app components`). Порядок «сперва кадр, потом хаптик» сохранён (сторож `interaction_responsiveness_contract`).
**Не тронуто:** `DuoPressable` (23 места) — «клавиша» с кромкой и translateY без scale (решение владельца 16.08, PrimaryButton); в ките такого нажатия нет — вопрос владельцу/Макетам: оставлять ли «клавишу» в 2.0.

**5. Шторки.** Общий `HybridSheetShell` (26 потребителей) переведён на kit.css `.sheet`: вход и выход 440 мс cubic-bezier(.2,1,.3,1), затемнение 260 мс, шторка стартует за нижним краем экрана без выцветания (раньше: пружина settle 150/22, 320 px, opacity 0→1, выход 260 мс). `KitSheetModal` (4 места) и `PanelSheet` уже на KIT_MOTION. Не менял: `HybridAlertShell` (19 окон по центру) — у кита нет движения для центральных окон (`.modal` без transition) — вопрос Макетам.

**Проверено.** Сторож `tapscale_layout_trap_guard` — зелёный; юнит-тесты (через слот, по файлам): 18 наборов / 137 тестов, где упоминаются обёртки и шторки, — зелёные; 12 `.mjs`-контрактов — зелёные после обновления 4 привязок (хэши PressableHybrid и «координации» HybridSheetShell, handleRestore из моего коммита 13a9053dd, моки KIT_MOTION). Красные не из-за меня: `legal_document_liquid_glass_source_contract` (чужая правка privacy_policy_en.json), `settings_notifications_liquid_glass` (хэш TimeModal в `app/settings_notifications.tsx`, файл не менялся).

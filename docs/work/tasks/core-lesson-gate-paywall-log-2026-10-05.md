# Task packet: learn (1) — Free видит «Ещё рано» вместо пейвола: лог ветки ворот (шаг 1)

Governance-ID: TG-34EB6C13616F
Status: In progress (Дизайн/координатор 05.10: «🔴 потеря выручки; сначала лог ветки ворот: тариф, причина, что показано»)
Owner: сессия 1 · ЯДРО

## Outcome

Вкладка «Уроки»: тап по закрытому уроку решает resolveLessonAccess (app/monetization_policy.ts): premium_required → пейвол,
иначе окно «Ещё рано». Проверка Plus стоит ДО прогресса, но её снимает devMode = DEV_CONTENT_UNLOCK — безусловная константа
dev-сборки (эмулятор Сверки) → Free в dev видит «Ещё рано». Второй возможный путь — legacy-потолок D122. Шаг 1 — лог всех
входов решения и того, что показано, в обоих обработчиках тапа (карточка и стеклянный список).

## Scope

app/(tabs)/lessons.tsx: console.warn [LESSON-GATE] {lesson, access, isPremium, devMode, noLimits, purchased, unlocked, cap,
requiresPremium, shown}. Поведение не меняется.

## Architecture

Не меняется.

## Security and privacy

Без uid: номер урока, тариф (флаг), решение.

## Technical debt

После лога — решение: devMode не должен снимать пейвол-ветку, если цель — проверять пейвол в dev (или Сверке нужен
флаг «вести себя как Free»); устаревший сторож paywall_entry_callsite_registry (второй вызов снят 20.09, 79df38e79).

## Verification

Синтаксис; сторожа lessons; воспроизведение Сверкой.

## Rollback

git revert коммита.

# Task packet: три красных полного прогона 25.10 у 5 · ВХОД (Ревизор, fullrun-reds-2026-10-25-0500.md)

Governance-ID: TG-4B57E42009BD
Governance-ID: TG-64C63CC26199
Status: In progress
Owner: 5 · ВХОД И АККАУНТ

## Outcome

Пять тестов снова зелёные (три от Ревизора + два от координатора); во всех устарел тест, код верный.

4. tests/onboarding_defer_gate.test.ts — ждал `runAfterHomeFirstFrame('v2_audio_seed', … { holdDuringOnboarding: true })` в
   app/_layout.tsx. Посев убран из корня целиком в 25888c669 (Learning V2 — только синтез речи), звук до конца онбординга не сеется.
   Проверка: если посев вернётся в корень — обязан ждать онбординг; пока его нет — зелено.
5. tests/auth_identity_anon_relink.test.ts — ждал последовательные `await assertAccountDeletionNotPending(db, authUid)` и
   `if (linkedStableId) await assertStableDeletionNotPending(...)`. fdeced617 (ускорение входа 18.10) свёл независимые чтения в один
   Promise.all, а метки удаления связанного аккаунта читает на месте (`linkedStableRetired` → `throwIdentityRetired`). Защита та же
   и в том же порядке: проверка удаления по authUid до чтения привязки, отказ по удалённому связанному аккаунту до «сиротской»
   ветки. Тест проверяет новую запись того же порядка.

1. tests/recovery_code_line.test.tsx — ждал ровно один `glass.bad` (отладочная кнопка сброса личности). 0ace9f5c7 (4 · ТЕМЫ)
   перевёл её на `semanticInk(glass).badText` (контраст 4.55+). Смысл проверки прежний: красный в окне входа только у отладочной
   кнопки — считаем `glass.bad` = 0 и `badText` = 1.
2. tests/clean_onboarding_copy.test.ts — ждал «Вход всё ещё выполняется / Кнопки останутся недоступны». Текст сменил
   10 · ПЕРЕВОДЧИК 18.10 (acd0c034c): «Вход ещё идёт. Кнопки снова заработают, когда ответит Google или Apple.»; новый текст уже
   держит onboarding_auth_busy_state_contract. Проверка — под новую формулировку.
3. tests/dev_intro_consent_preview.test.ts — набор не запускался: AiDialogConsentModal импортирует DialogsConsentTop (48a578629),
   тот через ThemedArtLayers тянет expo-image (ESM, стенд его не разбирает). Подменяем DialogsConsentTop, как уже подменены лист
   и мини-диалог; проверяемое поведение (превью не пишет решение о согласии) не меняется.

## Scope

Только три файла тестов. Код не трогаем.

## Architecture

Правки только в тестах: ожидания приводятся к текущему коду, проверяемые правила те же (красный только у отладочной кнопки;
русская формулировка «вход идёт» закреплена; превью согласия не пишет решения). Заглушка DialogsConsentTop — тем же способом,
что соседние заглушки в этом тесте.

## Security and privacy

Без изменений.

## Technical debt

Стенд не разбирает expo-image (ESM): любой новый тест, дотянувшийся до ThemedArtLayers, упадёт так же — нужна общая заглушка
expo-image в настройке стенда (кандидат на отдельную задачу).

## Verification

Три теста через слот.

## Rollback

git revert.

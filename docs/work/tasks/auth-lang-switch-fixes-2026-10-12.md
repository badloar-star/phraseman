# Task packet: смена языка без перезапуска — пуш энергии, язык изучения в Настройках, ошибки входа по ключу

Governance-ID: TG-B405C02C2F8A
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» (полоса R1 «смена языка»), задание координатора по §AUTH-0110
Related epic/enabler: INBOX §AUTH-0110, R1_WORK_SPLIT п.3

## Outcome

1. Пуш «энергия восполнена» (и «серия потеряна» — тот же дефект в `app/hall_of_fame_utils.ts:30`) приходит на языке интерфейса для всех 9 языков, а не по-русски для en/pt-BR/vi/id/tr/pl. Общий выбор языка уведомлений `resolveNotificationLang` (сохранённый язык → язык устройства), лог `[LANG-SWITCH] notification_lang` при запасном пути, без немого `catch`.
2. Настройки берут изучаемый язык из `useStudyTarget()` — первый кадр сразу верный (не `'en'`), смена цели подхватывается без перезапуска.
3. Ошибки входа в онбординге и в окне входа хранят ключ (код), текст строится при рендере на текущем языке.

Каждое — отдельный коммит, тест, лог `[LANG-SWITCH]`.

## Scope

In scope: новый `app/notification_lang.ts`, `components/EnergyContext.tsx` (readNotificationLang), `app/hall_of_fame_utils.ts` (notificationLangFromStorageValue), `app/(tabs)/settings.tsx` (строки 542-549 и потребители `studyTarget`), `components/CleanOnboarding.tsx`, `components/RegistrationPromptModal.tsx` (состояния ошибок), тесты.
Out of scope: переустановка уведомлений после смены языка (Ядро), Шпиль и Карточки (Темы), типографика Настроек (Темы).

## Architecture

Без смены границ: язык уведомлений — чистая функция над сохранённым значением; Настройки читают существующий `StudyTargetContext`; ошибки — `{ code, … }` вместо строки, тексты — существующие функции.

## Security and privacy

Нет новых данных; в логах — коды языка.

## Technical debt

Pay now: две копии «ru/uk/es → иначе ru» заменены одной функцией.

## Verification

Тест `tests/notification_lang.test.ts` (9 языков, мусор → язык устройства), контракт EnergyContext/hall_of_fame; тест Настроек на `useStudyTarget`; тесты окна входа/онбординга (aa_release_floor_auth_ui, aa_auth_double_tap_contract).

## Rollback

Откат коммитов по одному.

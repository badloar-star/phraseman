# Аудит релизной локализации интерфейса — 2026-08-10

## Граница аудита

Проверяются все пользовательские тексты релизного интерфейса для текущих языков
`ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`.

Не входят в эту поставку по задаче владельца:

- уроки, теория, тренажёры и персональная практика;
- сценарии диалогов, задания дня, наборы фраз и другой учебный контент;
- dev/admin/lab-экраны и стартовые шаблоны Expo.

Это исключение не означает, что такие тексты переведены: они должны пройти
отдельную контентную редактуру. В частности, `app/home_feature_tips.ts` содержит
RU/UK карточки-экскурсии и намеренно сохраняет русский контент для остальных
интерфейсных языков до отдельного контентного прохода.

## Методика

1. Все восемь интерфейсных языков включены в production-gate.
2. Карты видимой UI-копии проверены на полный набор восьми ключей.
3. AST-аудитор `scripts/heisenberg_raw_string_audit.ts` просканировал 1391
   файлов `app/**` и `components/**`, включая JSX, alert/toast, доступные
   screen-reader атрибуты и строковые шаблоны в них.
4. Каждое срабатывание классифицировано как полная карта локалей, исключённый
   контент/практика либо dev/brand/template. Реальные UI-пробелы исправлены.

## Исправленные релизные поверхности

- onboarding, авторизация, paywall, welcome и legal-экраны;
- домашний экран, лига, турниры, профиль, клуб, статистика, уведомления;
- карточки, аудио, лимит сохранений и доступные метки screen reader;
- paywall наборов карточек — самостоятельная UI-копия для PT-BR, VI, ID, TR и
  PL (без перевода описаний самих наборов);
- отзывы, сообщения, обновления, модальные окна и системные ошибки;
- AI-диалоги и flashcards target gate только в части оболочки интерфейса,
  без перевода учебного содержимого.

Последний проход устранил четыре русских динамических accessibility-label:
баланс жемчужин на главной, время вопроса турнира, баланс карточек и счётчик
сохранённых карточек. Для них добавлен контракт
`tests/interface_accessibility_locale_contract.test.ts`.

## Проверенные полные карты, не являющиеся долгом

- `components/LangContext.tsx` — восемь локалей;
- `components/release_notes_copy.ts` — восемь локалей;
- `components/MedalToast.tsx` — восемь локалей;
- `app/notifications.ts` — восемь локалей;
- `app/review_utils.ts` — восемь локалей;
- `app/roulette_prizes.ts` — UI использует `roulettePrizeLabel()` с восемью
  локалями; русские поля legacy-данных не выводятся.

## Проверки этапа

Команды выполнялись узкими наборами:

```text
npx jest --runInBand tests/home_feature_tips.test.ts tests/home_onboarding_runtime_contract.test.ts tests/heisenberg_raw_string_audit.test.ts tests/review_prompt_copy.test.ts tests/locale_ru_uk_es.test.ts
# 5 suites, 37 tests passed

npx jest --runInBand tests/interface_accessibility_locale_contract.test.ts tests/heisenberg_raw_string_audit.test.ts tests/tournament_screens_contract.test.ts tests/flashcards_target_scope_contract.test.ts
# 3 suites, 81 tests passed

npx jest --runInBand tests/card_pack_paywall_locale_contract.test.ts tests/flashcard_pack_purchase_refresh_contract.test.ts tests/heisenberg_raw_string_audit.test.ts
# 3 suites, 28 tests passed
```

Jest завершался с обычным предупреждением о незакрытых async handles после
успешных тестов; провалов и snapshot-изменений нет.

Дополнительный широкий запуск включал
`tests/flashcard_pack_gift_choice_contract.test.ts` и ожидаемо остановился на
несвязанной существующей проблеме: тест требует отсутствующий вызов
`callFlashcardPackGiftGrantGlobalBroadcast` в `app/global_broadcast_modal.ts`.
Локализационный paywall и его контракт этот файл не меняют.

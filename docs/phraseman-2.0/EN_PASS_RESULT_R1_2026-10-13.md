# EN-проход R1 — результат просмотра кадров (13.10)

Кадры: `docs/phraseman-2.0/evidence/en_pass_r1/<id>.png` + журнал `<id>.log`. Ссылки — DEV_LINKS_EN_PASS.md (все с `uiLang=en`
и `enStudyPrompt=off`, кроме `en-d164-lang-choice-001`). Каждая сессия правит только свой раздел.

## Авторизация

Просмотрено 04:45 (кадры, которые уже есть): onboarding-001, onboarding-007, paywall-gap-001, paywall-gap-005, paywalls-011,
paywalls-019, paywalls-023. Во всех журналах `[I18N-FALLBACK]` — 0, кириллицы на кадрах нет, кнопки в одну строку, многоточий нет.

| Кадр | Что не так | Где | Чьё / статус |
|---|---|---|---|
| paywall-gap-001, paywall-gap-005 | Цены `≈ €39,99` / `€7,99` / `€3,33` — с запятой в английском интерфейсе. Это запасная «справочная» цена, когда магазин недоступен (эмулятор); с живым магазином цена приходит уже локализованной | `app/paywall_reference_prices.ts:27–29` (строки `'€39,99'` и т. п.; ещё `:10` — формат удалённого рубильника) | Пейвол (Ядро) — форматировать по языку интерфейса или хранить число; не блокер |
| paywalls-023 | Кадр совпадает с paywalls-019 (верх «Manage subscription»), списка причин отмены нет — робот не дошёл до шага | шаги строки paywalls-023 в DEV_LINKS_R1 / EN_PASS | Сверка/робот — шаги, не язык |
| paywalls-019/023 | «Free conversation» в списке Plus по-английски читается как «бесплатный разговор» (имелось в виду «свободный») | `app/manage_subscription.tsx:109` (benefit `free_conversation`, `en`) | Тексты (Ядро) — вариант «Open conversation» / «Free-form conversation»; решение по тексту не моё |
| paywalls-019/023 | «Energy is not consumed» — неуклюже по-английски | `app/manage_subscription.tsx:108` (benefit `energy`, `en`) | Тексты — вариант «Unlimited energy» |
| paywalls-011 | Подпись «The button works without prices — the price shows in the store.» — последнее слово «store.» одно на второй строке | `components/paywall/PaywallPlusCopy.ts:181` (`fineNoPrices`) | мелочь вёрстки/текста; не блокер |
| paywall-gap-001/005, 011 | «keep going right / away.» — «away.» одно на второй строке | `app/paywall_context_texts.ts:109` | мелочь; не блокер |
| onboarding-001, onboarding-007 | Серая прямоугольная подложка вокруг «Get started» и вокруг круглой кнопки «назад» | — | вероятно подсветка фокуса Android после клавиш робота (на касании её нет); проверить на кадре без клавиш, в коде не трогаю |

Ещё не сняты (жду кадров): settings-gap-002, profile-004/006/011/003, settings-gap-024, settings-gap-028, system-015,
auth-gap-001/003/008/009/010, settings-gap-016, profile-012, en-d164-lang-choice-001.

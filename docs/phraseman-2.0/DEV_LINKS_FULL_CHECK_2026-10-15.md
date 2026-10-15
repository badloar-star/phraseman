# Dev-ссылки на труднодоступные состояния — полная проверка 15.10 (Ядро → Сверка)

Задача координатора (реестр, п.4): у Сверки должна быть ссылка на каждое труднодоступное состояние.
Источник правды — `parseDevStateParams` в `app/dev_state_fixtures.ts` (116 параметров на 15.10, 16:00).
Ниже — что есть, готовые ссылки и пробелы.

## Как запускать

1. `adb shell am force-stop app.phraseman` → запуск → дождаться «DEV-STATE OK».
2. Каждая ссылка: `phraseman://dev_state?onboarding=done&intros=seen&…&next=<экран>`.
3. Подмены живут в памяти процесса: между состояниями — холодный перезапуск.
4. Если `next` содержит свои параметры (`?a=1&b=2`), кодируй его целиком: `&` → `%26`, `?` → `%3F`.
   Иначе внешняя ссылка разрежет `next` по `&`.
5. Отдельное событие «после перехода» (тост, имитация пуша) срабатывает через ~0,9–1,5 с после `[DEV-STATE] route: replace вызван`.
   Снимай через 2–3 с после строки `[DEV-STATE] after_route: выполняю`.

## 1. Пейвол из каждого источника (38 контекстов)

Шаблон (Free, без оверлеев):

`phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&next=%2Fpremium_modal%3Fcontext%3D<КОНТЕКСТ>%26source%3Ddev_state`

Контексты (`PREMIUM_CONTEXT_VALUES`, `app/premium_context.ts`):
`no_energy`, `onboarding_plan`, `course_after_lesson3`, `lesson_b1`, `flashcard_limit`, `flashcard_training`, `flashcard_create`,
`pack_create`, `streak`, `theme`, `club`, `dialog_limit`, `dialog_locked_level`, `dialog_analysis`, `ai_voice_input`, `speaking`,
`mistake_practice`, `mastery`, `stats`, `heatmap`, `patterns`, `percentiles`, `intro_ended`, `level_up`, `premium_expired`,
`vip_expired`, `notification_upsell`, `language_add`, `ai_explain`, `weekly_review`, `avatar_aura`, `free_lessons_complete`,
`winback`, `referral_ended`, `arena_limit`, `combined_lesson`, `home_discount_badge`, `generic`.

Состояния самого пейвола — тот же шаблон плюс:
- `paywall=loading` — загрузка цен;
- `paywall=failed` — ошибка магазина;
- `paywall=reference` — эталонные цены;
- `paywall=live` — настоящие.

`arena_limit` — Арена удалена (D83). Если пейвол на нём закрывается, это ожидаемо, а не дефект.

Пейвол из настоящего места (не только по контексту):
- голос на нуле: `lv2voice=0`, потом тап по микрофону в Уроках, Ошибках, Карточках или курсе V2;
- Диалоги: `dev_dialog_voice=spent`;
- энергия на нуле: `energy=0`, потом старт урока.

## 2. Окна моментов Главной

Флаг окон — `moments=v3`. Без него окна итога недели не показываются: `[D191-GATE] флаг moments_v3 выключен`.

| Окно | Ссылка (добавь к базовой) |
|---|---|
| Итог недели Пика — вверх / остался / вниз / вершина / мрамор / обсидиан | `moments=v3&spire=open&spireWeek=up` (`stay`, `down`, `top`, `marble`, `obsidian`)`&next=/(tabs)/home` |
| «С возвращением» (3 / 8 / 30 дней) | `moments=v3&welcomeback=8&next=/(tabs)/home` (`3`, `30`) — **новый параметр**, добавлен 15.10. Если окно уже показывали, отметка показа его не пустит: нужны стёртые данные приложения |
| Пейвол-предложение «вернись» (winback, не окно) | `winbackaway=3&next=/(tabs)/home` (`8`, `30`) |
| «Встречайте PhraseMan 2.0» | `legacybonus=demo&next=/(tabs)/home` (`pearls` — с жемчугом, `nothing` — без бонусов) |
| «Хватает на ранг N» | `moments=v3&coinRank=<N>&coins=<сумма>&next=/(tabs)/home` (свой разбор, см. код) |
| Порядок окон подряд | `moments=v3&spireWeek=up&welcomeback=8&legacybonus=demo&next=/(tabs)/home` → в журнале `[OVERLAY-ARB] handoff … delayMs=360` между ними |

## 3. Шторки на нуле

| Состояние | Ссылка |
|---|---|
| Энергия 0 → «Нужна энергия» | `plus=off&energy=0&next=/(tabs)/home`, потом старт урока |
| Энергия восстанавливается (таймер) | `plus=off&energy=restoring&restore_in=20&next=/(tabs)/home` |
| Энергия у Plus («Без лимита») | `plus=on&energy_stop=plus_granted&next=/(tabs)/home` |
| Голос на сегодня: 3 / 1 / 0 | `plus=off&lv2voice=3` (`1`, `0`)`&next=<экран с микрофоном>` |
| Голос в Диалогах исчерпан | `plus=off&dev_dialog_voice=spent&next=<диалог>` |

## 4. Сторис

| Состояние | Ссылка |
|---|---|
| Кольцо — есть непросмотренные | `stories=on&storyseed=all&next=/(tabs)/home` |
| Кольцо — всё просмотрено | `stories=on&storyseed=seen&next=/(tabs)/home` |
| Сторис нет | `stories=on&storyseed=none&next=/(tabs)/home` |

## 5. Пик

- Открыт: `spire=open&next=/(tabs)/community`.
- Закрыт: `spire=closed&next=/(tabs)/community`.
- Ранг по монетам / шагам: `spireRankBy=coins` / `steps`.
- Ярус: `spireTier=<n>` (свой разбор).
- Пуш итога недели: `notif=spire_week_result&next=/(tabs)/home` — после R14 (ceef2f2b0) переход через `navigate`, в журнале `[PUSH-TAP] tab_nav via=navigate`.

## 6. Plus / Free / VIP

- Free: `plus=off` или `free=on`.
- Plus: `plus=on` плюс план `plan=yearly|monthly|lifetime`, конец плана `planUntil=<мс>`.
- VIP: `vip=promo|promo_lifetime|referral|survey|idea|tester|admin|admin_lifetime`.
- Вводный доступ: `introAccess=active`.
- Перенос Plus: `plustransfer=on`.
- Управление подпиской в загрузке: `manage=loading&next=/manage_subscription`.
- Пуш «Plus истекает» снимать с Plus: `plus=on&notif=premium_expiry_reminder`. У гостя экран честно говорит «активирован»: это экран для подписчиков.

## 7. Пустые состояния и ошибки

| Экран | Ссылка |
|---|---|
| Карточки пусто | `cards=empty&next=/(tabs)/lessons` |
| Каталог диалогов пусто | `catalog=empty` |
| Видеоколлекции пусто | `videopacks=empty` |
| Входящие пусто | `inbox=empty` |
| Друзья без событий | `friends=off` |
| Ошибки пусто / демо | `mistakes=off` / `mistakes=demo` |
| Экран ошибки сети | `errorscreen=on` |
| Кэш не прочитан | `cache=failed` |
| Сохранение прогресса курса упало | `lv2save=fail` |
| Удаление аккаунта: сбой | `delete=fail` (в реальный аккаунт не жать — `delete` не запускать по-настоящему) |
| Поддержка: сбой / отправлено | `support=fail` / `support=sent` |
| Тосты покупок | `toast=purchase_confirmed\|restored\|status_not_found\|no_active_subscriptions\|status_check_failed\|restore_failed\|store_unreachable` |

## 8. Пробелы — чего нет ссылкой

1. **Офлайн.** Dev-параметра нет, делать средствами эмулятора:
   - выключить: `adb shell svc wifi disable && adb shell svc data disable`;
   - включить: `… enable`.
   - Для R13 «подписчик не видит купи Plus» — холодный старт офлайн **без кэша аккаунта**. Это свежая установка или стёртые данные, учётку не удалять.
   - Ждать в журнале `[ACCESS-RESOLVE] voice source=fallback`. На нуле — `voice_await_done result=timeout` через 10 с, и только потом пейвол.
2. **«Доступ неизвестен» без офлайна** (подписка резолвится медленно) — отдельной подмены нет. Если нужно снять индикатор ожидания на кнопке: индикатор ещё не подключён в хостах микрофонов (поле `awaitingAccess`, задача Дизайна). Снимать пока нечего.
3. **Скелетон пустой вкладки** — не сделан (нет макета, задача Дизайна). Строка `[TABS-DEFERRED] placeholder … heldMs` покажет, сколько вкладка держала пустой фон.

Если какое-то состояние из списка координатора здесь не нашлось — пиши Ядру, ссылку добавлю в `dev_state_fixtures.ts`.

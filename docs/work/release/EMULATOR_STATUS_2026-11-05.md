# Эмулятор 7 (5560) — статус 05.11 17:30

- Maestro: 01 онбординг, 02 меню урока, 03 Наборы, 06 вкладка Plus, 07 и 08 dev-подписка — прогоны зелёные; флоу закоммичены 7520a5acf (e2e/maestro). Урок 1 до итога: 25/50 шагов, монеты считаются (+3/ответ, +4 при серии ≥16), итог не пройден.
- [SUB-TIER] после dev_state?set=plus:on,plan:yearly,coinRank:3: step plan=yearly применён («plan memory_only {"plan":"yearly"}»), но SUB-TIER = source=default_plus plan=none productId=none tier=plus. Годовой план не доходит до определителя tier → Ultra не рисуется. Для Входа: dev-ссылка должна класть productId годового продукта в источник tier.
- Пик монтируется в app/(tabs)/community.tsx (loadSpire → components/spire/SpireHomeScreen), прямого маршрута нет. На coinRank:3 во вкладке «Сообщество» сегменты Friends / Packs / Videos, сегмента Пика нет; вход в ТОП Пика не найден (проверка dev_state set=spire:open не подтверждена — флоу упал на ожидании «DEV-STATE OK»).
- Кадры: docs/work/release/frames_2026-11-05/e2e_pre/ (plus_tab_1..3, home_newbie_3tiles_video_phrases, b06_*, b07_*, b08_*, b09_01_community). Кадры b07_04/b07_05 и ultra_*.png — dev_moments_preview (хоп), не годятся.
- Среда: HEAD 8dbfe08d3; 5560 — Pixel_8_fresh (5 ГБ); Metro общий :8081; 5554 выключен ради Maestro; сообщения другим сессиям приостановлены лимитом, этот файл заменяет последнее сообщение.

## 18:25 — ANR на 5560 при двух эмуляторах
- На хосте одновременно идут 5560 (4,9 ГБ) и 5562 (исполнитель Maestro), свободно ~4 ГБ. Приложение на 5560 повисло: «Phraseman isn't responding» (кадр e2e_pre/peak_try_community.png), мои Maestro-прогоны обрываются без ошибки (два Maestro CLI одновременно делят драйвер на хосте).
- Для ТОПа Пика: сегмент «Peak» в «Сообществе» требует useSpireTabEnabled() и !peakLocked (community.tsx:67,122); на coinRank:3 он не отображался — проверка dev_state set=spire:open не завершена из-за зависания.
- Нужно решение: либо один эмулятор (вернуть 5554/5560 по очереди) и один исполнитель Maestro за раз, либо больше памяти.

## 19:00 — Ultra и ТОП Пика (по коммиту 1db420532)
- [SUB-TIER] после dev_state?set=uiLang:ru,plus:on,plan:yearly,coinRank:3,spire:open: `source=dev plan=yearly productId=none tier=ultra` (18:55:32). Ultra ПОЧИНЕН: на Главной вокруг аватара РУБИНОВО-РОЗОВОЕ кольцо с ✦ и красный шестигранник (кадр e2e_pre/ultra2_home.png, ultra_ru_home.png); у Plus (tier=plus) кольцо синее с бриллиантом (b08_02_home_ultra.png).
- Вход в Пик: плитка «Пик» на Главной (4-я плитка при ru + spire:open + ранг ≥2); вкладка «Сообщество» показывает «Пик / Друзья / Наборы» (b12_02_peak_scrolled.png). При en Пик закрыт: [SPIRE-GATE] allowed=false reason=ui_lang_not_supported — Пик только для ru/uk.
- ТОП на ЖИВОЙ вкладке: пустой скелетон («Этаж 1», строки-заглушки, «Играть» серая) — у нового аккаунта нет комнаты на сервере; ТОПа с аурой участников живьём нет. Превью dev_spire_preview?state=room (peak_preview_room_ultra_session.png): ТОП-5 + строка «Ты» с рубиновым кольцом и ✦ — аура Ultra у «Ты» есть, у остальных 5 — нет (в моках без подписки).
- Замечание по методу: adb input tap на этом эмуляторе не срабатывает (Maestro-драйвер перехватывает ввод), тапы делаю только Maestro; dev-состояние живёт в памяти и сбрасывается при каждой перезагрузке бандла (чужие правки → «Loading from 10.0.2.2:8081»).

## 20:35 — Пункт 1: окна оплаты (пути для Сверки)
Папка: docs/work/release/frames_2026-11-05/sverka/1-paywalls/ — 10 кадров, ru-интерфейс, устройство 5560 (настроенное, НЕ чистое: серия 5 дн., 1190 монет, курс de, аккаунт Google в панели), Metro HEAD ~ba8a20b1b; ссылка phraseman://premium_modal?context=<ctx>&_dev_state=live, тема переключалась dev_state set=appearance:<light|dark>.
Файлы: {light,dark}_{language_add, course_after_lesson3, no_energy, generic, premium_expired}.png. Журнал: C:/Temp/claude/b10.log (flow e2e/maestro/10_paywall_windows_en.yaml, зелёный, 8 мин 7 с).
Находка (глазами, light_language_add и dark_no_energy): окна показывают только заголовок («Ещё один язык для занятий» / «Энергия закончилась»), подпись про автопродление и кнопку «Подключить Ultra»; НЕТ плиток тарифов с ценой, нет «Ввести промокод», нет пробного периода, нет «−58 %»/радио (нижняя 2/3 экрана пустая). Шапка «PhraseMan Ultra» (не Plus). Окно не стандартного вида «Все окна Plus» — Сверке сравнить с макетом; возможно, цены не загрузились без магазина (dev), тогда нужен кадр на магазинной сборке.
Контекст «другой язык» отдельным именем не найден — взят language_add; «дальше» = course_after_lesson3.
Устройство: 5560 — перезапущено координатором (~19:56), кадры новичка (ранг 0) на нём не снять без смены состояния.

## 20:50 — Пункт 2: «Открытие раздела» (RU), для сессии Моменты и Сверки
Папка: docs/work/release/frames_2026-11-05/sverka/2-section-openings/ — 48 PNG + 6 видео (rec_light_<раздел>.mp4, Maestro startRecording, светлая тема). Файлы: {light,dark}_{video,dialogs,peak,cards,plus,rank}_p{1,2,3,4}.png (фазы 1–4 каждого раздела). Ссылка: phraseman://dev_moments_preview?state=openings&section=<…>&phase=<1..4>; язык ru включён dev_state set=uiLang:ru,appearance:<light|dark>. Flow e2e/maestro/11_section_openings_ru.yaml (зелёный, 14 мин).
Язык: интерфейс ru — «ВИДЕО», «Пропустить», «Новый ранг!», «Видео и диалоги теперь доступны.», «Посмотреть открытия», «На главную». Откуда английское «New rank! / See what opened» у владельца: язык приложения следует языку системы эмулятора (en), пока dev_state не поставит uiLang:ru; в самих окнах превью тексты локализованы (en-вариант отображается только при ui=en). Само окно не содержит жёстко зашитого английского.
Наблюдение (light_video_p4): на русском окно «Видео» в фазе 4 — Лингман слева, две пустые рамки-карточки справа с иконкой планшета и наушников, внизу пустой экран (заголовок и кнопка не показаны в p4 — только индикатор шага и «Пропустить»); dark_rank_p4 — полный экран «РАНГ 1 · НОВЫЙ РАЗДЕЛ / Новый ранг! / Видео и диалоги теперь доступны / Посмотреть открытия / На главную» с бронзовой монетой. Сверять с утверждённым макетом — задача Моментов.

## 21:20 — Пункт 3a: Главная без сети (№4, №5 списка Сверки)
Папка: docs/work/release/frames_2026-11-05/sverka/3-offline/ — home_offline_dark.png, home_offline_light.png (ru, устройство 5560, режим «в самолёте» включён Maestro setAirplaneMode, затем выключен; проверено: airplane_mode_on=0). Flow e2e/maestro/12_home_offline_sets_ru.yaml.
Видно (home_offline_light): в шапке значок самолёта вместо сигнала сети; баннер «Интернет ушёл погулять. Занятия и карточки работают и без него.»; остальная Главная (серия 5 дней, «Продолжить», «Сегодня», плитки Уроки/Карточки/Диалоги/Пик, ряд «Видео»). Замечание: кадр «светлая» — зелёный градиент шапки (тема карточек тёмно-зелёная), как у «тёмной» — проверить, что dev_state appearance:light применился (на «Открытии раздела» светлая отличалась).

## 21:50 — Окно оплаты generic: журнал размеров (для Входа, координатора, Сверки)
Кадры: docs/work/release/frames_2026-11-05/sverka/5-paywall-layout/paywall_generic_dark.png и paywall_generic_light.png; строки: .../paywall_layout_log.txt (ru, 5560, окно 411×914 dp, ссылка premium_modal?context=generic&_dev_state=live; Metro с коммитами 3987ec00a и 49d08f78f в дереве; flow 15_paywall_layout_generic_ru.yaml зелёный, 3 мин).
ЧЕТЫРЕ ЧИСЛА (оба показа, тёмная 21:44:41 и светлая 21:45:17 — одинаковы):
- sheet:  y=58,  h=856, w=411
- header: y=0,   h=163, w=411
- scroll: y=163, h=0,   w=411   ← ВЫСОТА ПРОКРУТКИ = 0
- dock:   y=163, h=1827, w=411  ← НИЖНЯЯ ПАНЕЛЬ НА ВЕСЬ ЭКРАН (1827 при листе 856)
[PAYWALL-FIT] skip {"touched":false,"viewportH":0,"contentH":0}, затем skip {"touched":false,"viewportH":0,"contentH":381}.
Вывод: содержимое (contentH=381) не помещается, потому что viewport прокрутки имеет высоту 0, а «dock» растянут на 1827 (с y=163) — он занимает всю область под шапкой и вытесняет плитки/промокод; визуально внизу пустота (кадр). Это причина «пустого окна»: сломан flex-layout (dock без ограничения высоты / scroll без flex:1 и minHeight). Для Входа.

## Пересъёмка окон оплаты после 406692e88 (22:55, 5560, тёмная+светлая × 5 контекстов)
- Кадры: docs/work/release/frames_2026-11-05/sverka/6-paywalls-retake/{dark,light}_{course_after_lesson3,language_add,generic,no_energy,premium_expired}.png; журнал: paywall_layout_log_raw.txt (PAYWALL-LAYOUT/FIT, без очистки, 10 показов); флоу e2e/maestro/16_paywalls_retake_ru.yaml.
- ВАЖНО: первый ретейк (22:32) снят на СТАРОМ бандле (scroll h=0, dock h=1827). После force-stop и перезапуска dev-клиента бандл подхватил фикс — этот ретейк на нём.
- Размеры: sheet h=856 (generic 835); header 205/197/163/205/239 (course/language_add/generic/no_energy/premium_expired); scroll h=360/368/381/360/326 (>0); dock h=291 (ниже ожидаемых 300–450, но всё помещается); PAYWALL-FIT: contentH=381, overflow 21/13/0/21/55, action scroll_to_end (generic: fits).
- Кадры: выгоды, плитки «Ultra·Год €39,99 / Plus·Месяц €7,99», «Подключить Ultra», «Восстановить покупки», «Ввести промокод», «Условия/Конфиденциальность» — всё на месте во всех контекстах.
- ДЕФЕКТ для Входа: при overflow>0 (premium_expired, overflow 55) авто-прокрутка scroll_to_end сдвигает список — первая выгода «Серия, фразы и уроки сохранены» залезает под подзаголовок/шапку (виден обрезок строки, light_premium_expired.png). Нужно скроллить к началу или не прокручивать автоматически.

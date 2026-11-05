# Сценарии Сверки для Эмулятора (устройство ведёт только Эмулятор)

Governance-ID: TG-699C53106B0E

Правила: я на устройства больше не шлю ссылки и тапы. Эмулятор выполняет в своей очереди, отдаёт кадры (PNG) и строки журнала в `docs/work/release/frames_2026-11-05/pending/<папка>/` и `docs/work/tasks/`; я сравниваю с макетом и ставлю вердикты. Кнопки трат/покупок/удаления не нажимать. На 5554 — боевой Google-аккаунт владельца: выход и сброс не делать.

## S1. Онбординг с испанским (Вход, P0) — 5560
1. force-stop, запуск, дождаться отрисовки.
2. НОВОЕ (Вход, коммит 428c8fe6b): составная ссылка БЕЗ «&»: `adb -s emulator-5560 shell am start -a android.intent.action.VIEW -d "phraseman://dev_state?set=newbie:1,onboarding:pending,plus:off"` после force-stop (холодный старт); диагностика `[DEV-STATE] params keys=… expanded=…` — прислать Входу, если дошёл один ключ. Старый способ (ключи по одному, `&` в одинарных кавычках на стороне устройства), если составная не сработает: `dev_state?onboarding=pending`, затем отдельно `dev_state?newbie=1`. Порядок: если второй теряется — сначала newbie=1, затем force-stop и `onboarding=pending` холодным стартом. ВАЖНО: комбинированная ссылка `newbie=1&onboarding=pending&plus=off&next=/` применяет только newbie (проверено 13:10).
2б. НОВОЕ (Вход, коммит 7dce4c4e5, фикс гонки холодного старта): после force-stop и одной составной ссылки на welcome нажать «Начать» — при неготовом списке Пульта на кнопке индикатор до ~4 с. Ожидаемая строка (журнал не чистить): `[ONB-FLAGS] route: source=ready_immediately|arrived_while_waiting|timeout_safe_minimum waitedMs=… list=… final=welcome,language,name` — экран языка ДОЛЖЕН появиться; выбрать Spanish; прислать `[ONBOARD-LANG] choose/set/dev_set/choose:done`, `[DEV-STATE] params keys=…`. После — `dev_state?set=newbie:0`.
3. Журнал не чистить. Сразу до тапа: `logcat -d | grep -a "ONB-FLAGS|ONBOARD"`; затем «Get started» (экран «From first words…»), на «Which language are we learning?» выбрать Spanish → «Choose language»; снова `grep`.
4. Нужные строки: `[ONB-FLAGS] order/route`, `[ONBOARD-LANG] choose / set / dev_set / choose:done match=… / lock_decision`.
5. Кадры: экран выбора языка, «Almost done», Главная после онбординга (ранг 0), «Уроки» на испанском.
6. В конце `dev_state?newbie=0`.

## S2. Монеты 3/2/1 (Ядро) — 5560, plus=off, newbie=1 (бонус +500 при ключе не выдаётся)
1. Урок 1 (курс из онбординга): пройти до итога. После каждого прохода: кадр счётчика в шапке до/после, кадр итога; `logcat -d | grep -a "LESSON-COINS"` (pass_decision passNumber/awardPerItem, answer_awarded, settle_*, screen_hydrated waitedMs).
2. «Перепройти» (testID `lesson-menu-primary`) ещё два раза. Ожидание: +3, +2, +1.

## S3. Кадры Дизайна — 5554 (ветеран) без прокруток, по вкладкам нижней панели
№130 энергия без подложки (Главная + Пик, светлая/тёмная); №124 углы плашек «Друзей» (зум); №127 «Играть» в Пике 375×667 и 412×915 + `[SPIRE-LAYOUT] dock.wrap`; №104 шов под «Начать» + `[HOME-FIT]`; №162 «Друзья» с «+»; №154/165 «Карточки»; №179 язык изучения. Вкладка «Наборы» + `[SETS-HERO]` для Тем.

## S4. Пейволы v3 (координатор, приёмка 1:1 a1aec863f) — окна `language_add`, `no_energy`, `generic`, `premium_expired` × светлая/тёмная × 360×800 и 412×915. Кнопки покупки не нажимать.

## S5. №92 (Ядро): ролик → «Добавить набор себе» → «Карточки → Мои»; `logcat | grep -E "PACK-ADD|PACK-OWNED|MY-PACKS|VIDEO-PACK"` + кадр «Моих».

## S6–S8 (координатор, 19:10; после окон оплаты, на HEAD после 7922339cc / ce9cec3cf / 0f98a3667)
- S6 Приветствие Лингмана (после 7922339cc): открыть Главную, затем `dev_state` newbie (`set=newbie:1`); кадр реплики 3 тёмная+светлая. Проверка: при открытом Пике приветствие НЕ появляется, при возврате на Главную — появляется; журнал `[WELCOME-B3] host_check`.
- S7 «Открытие раздела» (после ce9cec3cf): нажать «Пропустить» — закрылось сразу; после перезапуска для этого раздела не возвращается; журнал `[SECTION-OPENING] dismissed persisted=true`. Кадры до/после.
- S8 Вкладка Plus, низ (после 0f98a3667): кнопка «Оформить Ultra на год», подпись «Цена и пробный период — из магазина…». Кнопку не нажимать.
Пути кадров и журналы — Сверке, хэш — координатору.

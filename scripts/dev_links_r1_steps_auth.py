# Ссылки и шаги робота Авторизации для покрытия съёмки r1 (triage.coverage: link_missing + core_switch без шагов).
#
# зачем (координатор 12.10): строки auth-gap-001/002/003/008/009/010/011/012 и profile-023 не имели ссылки или шагов. Свой модуль, чтобы
# не править общий dev_links_r1_steps.py (его уже дважды перетирали коммиты целиком). Подключается из scripts/dev_links_r1_generate.py
# (import), как dev_links_r1_steps_cards2.py.
#
# Безопасность: все подмены — dev_state, только память процесса, в стор-сборке маршрут вырезан и геттеры = null.
# Ни один шаг не входит в аккаунт и не стирает данные: вход подменён ошибкой ДО сети (switch=…, restore=retired), окна удаления только
# открываются (delete=fail — страховка), подтверждение удаления роботу не даётся (auth-gap-011 — вручную).
from dev_links_r1_steps import ACCT, CANCEL, ENTRIES, MANAGE, PLAN_Y, SIGNIN, add

DELETE_OPEN = ['see:#account-delete-button', 'tap:#account-delete-button']

# ── Экран «Аккаунт»
add('auth-gap-001', [], 'plus=off', ACCT, note='гость: «Привязать аккаунт», нет почты / способа входа / «Выйти»; ТОЛЬКО ГОСТЬ')
add('auth-gap-002', ['tap:#account-email-copy', 'settle:0'], '', ACCT,
    note='«Скопировано» (≈1,4 с, снимок сразу после тапа); НУЖЕН ВХОД — строка почты есть только у вошедшего')

# ── Окно входа: отказы до сети (switch=required — новая подмена, restore=retired — существующая)
add('auth-gap-003', SIGNIN, 'switch=required', ACCT, note='окно входа: «нужна смена аккаунта» + кнопка «Сменить аккаунт» (вход отдаёт account_switch_required до сети); ТОЛЬКО ГОСТЬ')
add('auth-gap-012', SIGNIN + ['tap:#auth-switch-account', 'wait:1500'], 'switch=required', ACCT,
    note='«Сменить аккаунт» → окно «Сменить аккаунт?» в Настройках (без строки про Plus — она требует свежий store-Plus); «Продолжить» НЕ жать; ТОЛЬКО ГОСТЬ')
add('auth-gap-008', SIGNIN, 'restore=retired', ACCT, note='вход в удалённый навсегда аккаунт → окно «Аккаунт удалён» (identity_retired до сети); ТОЛЬКО ГОСТЬ')

# ── Удаление: только открыть окно
add('auth-gap-009', DELETE_OPEN, 'delete=fail', ACCT, note='окно «Удалить аккаунт?» с «14 дней», НЕ подтверждать; НУЖЕН ВХОД')
add('auth-gap-010', DELETE_OPEN, 'delete=fail', ACCT, note='гость: окно «Прогресс удалится безвозвратно», НЕ подтверждать; ТОЛЬКО ГОСТЬ')
add('auth-gap-011', DELETE_OPEN, 'delete=fail', ACCT, unique=False,
    note='«Удаление не завершилось» — ВРУЧНУЮ: нужно ввести слово подтверждения кириллицей (робот вводит только ASCII) и нажать «Удалить»; '
         'перед тапом убедиться, что в журнале есть [DEV-STATE] … delete — иначе это настоящее удаление')

# ── Управление подпиской: удержание после причины «Не хватает функций»
add('profile-023', [CANCEL, 'tap:#manage-subscription-reason-missing_features', 'tap:#manage-subscription-reasons-continue'], PLAN_Y, MANAGE,
    note='причина «Не хватает функций» → «Продолжить» → предложение удержания; offer-decline НЕ жать')

# ── profile-017 (склейка 12.10, «состояние не то»): образец — прокрученный экран месячной подписки («Восстановить покупки», «Перейти к отмене»,
# пояснение про источник цены). Запись в общем файле снимала верх экрана; перекрываем её здесь, общий файл не трогаем.
ENTRIES.pop('profile-017', None)
add('profile-017', ['scroll:down'], 'plus=on&plan=monthly', MANAGE,
    note='управление подпиской, месячная, прокручено вниз; карточки «Перейти на годовой» без магазина нет (нужен store-аккаунт)')

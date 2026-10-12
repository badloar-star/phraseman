# Ссылки и шаги по партии 1 подмен Ядра (коммит 7a79d3519, таблица «id → подмена → ссылка» — docs/phraseman-2.0/DEV_SWITCHES_R1_CORE.md, 09241b29a).
#
# зачем (Ядро 12.10, «партия 1 готова — впишите в DEV_LINKS_R1»): подмены появились, строкам не хватало ссылок и шагов. Все подмены — только память процесса, в прод ничего не пишется.
# Тексты шагов `tap:Текст` — для русского интерфейса; остальное по testID. Файл подключается из scripts/dev_links_r1_generate.py (import).
# Ссылки dialogs-033 / dialogs-gap-016 раньше НЕ содержали dev_dialog_send=ok — старт сессии уходил в прод; здесь это исправлено.
from dev_links_r1_steps import DLG, DLG_START, add

COMM = 'spire=open&plus=off&free=on&cards=demo'
FRIENDS = 'friends=demo&' + COMM
COMMUNITY = '/(tabs)/community'


def search(code):
    """Поиск друга по коду (шаг S(code) из таблицы Ядра)."""
    return ['tap:#friends-open-add', 'wait:800', 'tap:#friends-code-input', f'type:{code}', 'tap:#friends-search', 'wait:1000']


# ── Настройки, Профиль, Плюс
add('settings-gap-023', ['tap:#support-report-input', 'type:Test', 'back', 'tap:#support-report-submit', 'wait:800'], 'plus=off&support=sent', '/support_report', note='Поддержка: «Обращение отправлено» без отправки (support=sent); текст набирается, клавиатура закрывается перед «Отправить»')
add(['paywalls-020', 'profile-019'], [], 'plus=on&plan=yearly&manage=loading', '/manage_subscription', note='«Управление подпиской»: скелетон держится (manage=loading)')
add('settings-gap-020', ['tap:#settings-study-language-row', 'wait:700', 'tap:#study-language-option-es', 'wait:700'], 'plus=off&studyTarget=en&started=en,es', '/(tabs)/settings', note='тост «Теперь учишь…»: es уже начат (started=en,es), мини-онбординга нет')
add('settings-gap-021', ['tap:#settings-study-language-row', 'wait:700', 'tap:#study-language-option-en', 'wait:700'], 'plus=off&studyTarget=es&started=en,es&studyfail=on', '/(tabs)/settings', note='ошибка смены языка изучения (started=en,es + studyfail=on)')
add('paywalls-009', ['wait:3000'], 'plus=off&upsell=first_lesson', '/lesson_complete?id=1&passed=1', note='итог урока: мягкое предложение Plus после первого зачёта (upsell=first_lesson; ждём конец анимации наград)')
add('paywalls-010', ['wait:3000'], 'plus=off&upsell=three_lessons', '/lesson_complete?id=1&passed=1', note='итог урока: предложение Plus после трёх уроков (upsell=three_lessons)')
add('paywalls-008', [], 'plus=off&aiConsent=granted&ai_explain=limit', '/lesson_menu?id=1', unique=False, note='карточка ИИ-разбора «лимит дня» (ai_explain=limit): надо открыть урок и ошибиться в задании → ai-mistake-limit-card — шаги ручные')

# ── Промокод
add('overlays-campaigns-006', ['tap:#promo-code-input', 'type:TESTCODE', 'back', 'tap:#promo-code-submit', 'wait:400'], 'plus=off&promo=hold', '/promo_code_entry', note='промокод: «Активируем…» держится (promo=hold)')

# ── Диалоги: подставной старт и ход (dev_dialog_send=ok) — обязателен, иначе старт сессии идёт в прод
SEND = ['tap:#dialogue-v2-session-input', 'type:Hello', 'tap:#dialogue-v2-session-send']
DLG_BASE = 'plus=off&dquota=reset&energy=5&dev_dialog_send=ok'
COMPLETE = ['wait:2500', 'tap:#dialogue-v2-session-more', 'tap:#dialogue-v2-session-menu-complete', 'wait:1500']
add('dialogs-033', DLG_START + SEND + ['wait:1200'], DLG_BASE + '&dialogs_paused=1', DLG, note='«Диалоги временно недоступны» (dialogs_paused=1) + подставной старт; в старой ссылке не было dev_dialog_send=ok — старт уходил в прод')
add('dialogs-gap-016', DLG_START + SEND + ['wait:700'], DLG_BASE + '&dev_dialog_fail=service', DLG, note='тост «Энергия возвращена» (dev_dialog_fail=service): снимать сразу после отправки; старая ссылка вела на кадр gap-017')
add('dialogs-021', DLG_START + SEND + ['wait:2500'], DLG_BASE + '&dev_dialog_better=on', DLG, note='разбор хода: «Лучше так» (dev_dialog_better=on)')
add('dialogs-037', DLG_START + SEND + ['wait:2500', 'see:#dialogue-v2-session-end-veil'], DLG_BASE + '&dev_dialog_end=on', DLG, note='подставной ход завершает диалог: завеса конца (dev_dialog_end=on)')
add('dialogs-040', DLG_START + SEND + COMPLETE, DLG_BASE + '&dev_dialog_completion=clean', DLG, note='итог диалога: без ошибок (dev_dialog_completion=clean)')
add('dialogs-044', DLG_START + SEND + COMPLETE, DLG_BASE + '&dev_dialog_completion=errors', DLG, note='итог диалога: с ошибками (dev_dialog_completion=errors)')
add('dialogs-042', DLG_START + SEND + COMPLETE + ['tap:#dialogue-v2-completion-feedback-header', 'tap:#dialogue-v2-completion-feedback-star-4'], DLG_BASE + '&dev_dialog_completion=clean', DLG, note='итог диалога: блок отзыва, выбрана 4-я звезда (отправку НЕ жать)')
add('dialogs-gap-007', DLG_START + SEND + COMPLETE, DLG_BASE + '&dev_dialog_completion=loading', DLG, note='итог диалога: загрузка (dev_dialog_completion=loading)')
add('dialogs-gap-008', DLG_START + SEND + COMPLETE, DLG_BASE + '&dev_dialog_completion=unavailable', DLG, note='итог диалога: «недоступно» (dev_dialog_completion=unavailable)')

# ── Друзья: служебные коды DEVFND (найденный друг без сервера) и DEVUNS (не синхронизирован)
FOUND = search('DEVFND')
add(['community-009', 'community-017', 'community-018', 'community-019'], FOUND, FRIENDS, COMMUNITY, unique=False, note='Друзья: найден профиль «Алиса» (код DEVFND, без сервера); какая из строк 009/017–019 — по макету: карточка найденного / подпись — сверять глазами')
add('community-010', FOUND + ['tap:#friends-add-found', 'wait:500'], FRIENDS + '&dev_friends_hold=add_request', COMMUNITY, unique=False, note='«Отправляем заявку…»: карточка скрывается в тот же тик — кадр совпадает с 017 (решение координатора)')
add('community-011', FOUND + ['tap:#friends-add-found', 'wait:800'], FRIENDS + '&dev_friends_fail=add', COMMUNITY, note='Друзья: не удалось отправить заявку (dev_friends_fail=add)')
add('community-014', search('DEVUNS') + ['wait:500'], FRIENDS, COMMUNITY, note='Друзья: профиль найден, но не синхронизирован (код DEVUNS; DEVUNSYNCED тоже работает)')
add('community-022', ['wait:800', 'see:#friend-study-invite-modal'], FRIENDS + '&friend_event=study_invite', COMMUNITY, note='приглашение на занятие (friend_event=study_invite): кнопки не жать')

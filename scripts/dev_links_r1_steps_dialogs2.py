# Ссылки и шаги Диалогов для покрытия съёмки r1 — группа (2а): пути, выводимые из кода без сервера ИИ (подставной старт и ход: dev_dialog_send=ok, app/dev_dialog_send.ts).
#
# зачем (координатор 12.10, R1_PENDING_COVERAGE): строки Диалогов имели путь в shot list, но не имели ссылки и шагов. Здесь — только те, чей кадр однозначно получается из подмен приложения;
# кадры с настоящим ИИ, микрофоном устройства и серверной памятью остаются ручными (группы G-D05/D06/D08/D09 — Сверка вручную). Файл подключается из scripts/dev_links_r1_generate.py (import).
from dev_links_r1_steps import DLG, DLG_START, SESSION_FREE, WORLD, ROW, add

# Согласие на ИИ: БЕЗ подмены aiConsent=granted (она обходит шторку). aiConsent=off — явное «нет подмены», чтобы add() не подставил granted сам; согласие в облако не пишется.
add('dialogs-009', [WORLD, ROW, 'tap:#dialogue-v2-briefing-start', 'wait:1500'], 'plus=off&dquota=reset&energy=5&aiConsent=off', DLG, note='согласие на ИИ — шторка при нажатии «Начать» (без подмены согласия; кнопку согласия НЕ жать — запись в облако)')

# Сессия: начало (приветствие собеседника) и сессия Plus — подставной старт без ИИ
add('dialogs-013', DLG_START, SESSION_FREE + '&dev_dialog_send=ok', DLG, note='начало сессии: приветствие собеседника (подставной старт dev_dialog_send=ok; какой диалог первый — зависит от каталога)')
add('dialogs-039', DLG_START, 'plus=on&dquota=reset&energy=5&dev_dialog_send=ok', DLG, note='сессия у Plus: в шапке нет пилюль энергии и лимита (подставной старт)')

# Голосовой ввод: устройство без распознавания речи (подмена speech=unavailable читается speech_device_availability)
add('dialogs-gap-013', DLG_START, SESSION_FREE + '&dev_dialog_send=ok&speech=unavailable', DLG, note='сессия: распознавание речи не работает на устройстве (speech=unavailable)')

# Свободный разговор (Plus): пустое состояние — «Что можно спросить»
add('dialogs-045', [], 'plus=on&dquota=reset&energy=5', '/dialogue_v2_freeform', note='свободный разговор у Plus: пустое состояние «Что можно спросить»')

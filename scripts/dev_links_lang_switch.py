# Генератор docs/phraseman-2.0/DEV_LINKS_LANG_SWITCH.md: проверка смены языка БЕЗ перезапуска (R1_WORK_SPLIT п.3, Авторизация 13.10).
# зачем: «язык переключается во всех разделах без перезапуска и без прилипших строк» нельзя проверить одной ссылкой после force-stop —
# нужен уже открытый раздел, на котором язык меняется. Пары строк: «а» открывает раздел на исходном языке, «б» — ТОТ ЖЕ раздел на новом
# языке в том же процессе (вкладки остаются смонтированными), «в» — обратно. Интерфейс: dev uiLang=en|off (только память, на диск и в облако
# не пишется, в сторе отклоняется). Изучаемый язык: studyTarget=en|es (как во всех ссылках съёмки).
# Запуск: python scripts/dev_links_lang_switch.py [путь для результата]
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/phraseman-2.0/DEV_LINKS_LANG_SWITCH.md'
COMMON = 'onboarding=done&intros=seen&overlays=off'

# (ключ, раздел, маршрут, доп. параметры) — разделы первого выпуска, где строк интерфейса больше всего
UI_SECTIONS = [
    ('home', 'Главная', '/(tabs)/home', 'plus=off'),
    ('lessons', 'Уроки — список', '/(tabs)/lessons', 'plus=off&studyTarget=en'),
    ('dialogs', 'Диалоги — хаб', '/ai_dialog_home', 'plus=off&coinRank=6'),
    ('cards', 'Карточки — хаб', '/flashcards', 'cards=demo&plus=on&studyTarget=en&enStudyPrompt=off'),
    ('saved', 'Карточки — сохранённые', '/flashcards_collection?cat=saved', 'cards=demo&plus=on&studyTarget=en&enStudyPrompt=off'),
    ('settings', 'Настройки', '/(tabs)/settings', 'plus=off'),
    ('account', 'Аккаунт', '/account_details', 'plus=off'),
    ('stats', 'Статистика и серия', '/streak_stats', 'plus=on'),
    ('mistakes', 'Мои ошибки', '/mistakes_hub', 'mistakes=demo&studyTarget=en'),
    ('coins', 'Монеты', '/runes_wallet', 'coinRank=5&coins=12480'),
    ('videos', 'Видео — канал', '/lingman_videos', 'videopacks=catalog&studyTarget=en'),
    ('community', 'Сообщество', '/(tabs)/community', 'cards=demo&plus=on&studyTarget=en&enStudyPrompt=off'),
]
# (ключ, раздел, маршрут, доп. параметры) — где виден контент изучаемого языка
TARGET_SECTIONS = [
    ('home', 'Главная', '/(tabs)/home', 'plus=off'),
    ('lessons', 'Уроки — список', '/(tabs)/lessons', 'plus=on'),
    ('dialogs', 'Диалоги — хаб', '/ai_dialog_home', 'plus=off&coinRank=6'),
    ('cards', 'Карточки — хаб', '/flashcards', 'plus=on'),
]


def link(params: str, nxt: str) -> str:
    return f"phraseman://dev_state?{COMMON}&{params}&next={nxt.replace('&', '%26')}"


HEAD = ['| id | экран · состояние | ссылка | перед кадром | shot list | тапы | уникальна | образец |', '|---|---|---|---|---|---|---|---|']
out = ['# DEV_LINKS_LANG_SWITCH — смена языка без перезапуска (R1 п.3, Авторизация 13.10)', '',
       'Файл генерируется: `python scripts/dev_links_lang_switch.py`. Руками не править.', '',
       '**Как проходить (важно):** строки одной тройки (шаг 1/3, 2/3, 3/3 — номера подряд) идут ПОДРЯД, БЕЗ `force-stop` между ними — иначе это проверка',
       'холодного старта, а не смены языка. `force-stop` — только перед первой строкой тройки. Кадр «б» должен быть целиком на новом языке:',
       'любая русская строка на английском кадре (или наоборот) = прилипшая строка → строка журнала `[LANG-SWITCH]` / `[DEV-STATE] uiLang`',
       'и путь экрана — Авторизации. `[I18N-FALLBACK]` в журнале = у строки нет английского. Шпиль на английском показывает экран',
       '«закрыт для языка» — это правильно (п.76).', '']

n = 0
out += ['## Интерфейс: русский → английский → русский', ''] + HEAD
for key, title, route, extra in UI_SECTIONS:
    out.append(f"| lang-switch-{n + 1:03d} | {title} · 1/3 русский (исходный) | `{link(extra + '&uiLang=off', route)}` | force-stop |  | wait:1500 | нет |  |")
    out.append(f"| lang-switch-{n + 2:03d} | {title} · 2/3 английский без перезапуска | `{link(extra + '&uiLang=en', route)}` | сразу после {n + 1:03d}, без force-stop |  | wait:1500 | нет |  |")
    out.append(f"| lang-switch-{n + 3:03d} | {title} · 3/3 снова русский без перезапуска | `{link(extra + '&uiLang=off', route)}` | сразу после {n + 2:03d}, без force-stop |  | wait:1500 | нет |  |")
    n += 3
out.append('')

out += ['## Изучаемый язык: английский → испанский → английский', '',
        'Кадр «б»: уроки, диалоги, карточки и Главная — для испанского (названия, фразы, наборы); ничего от английского не осталось.', ''] + HEAD
for key, title, route, extra in TARGET_SECTIONS:
    out.append(f"| lang-switch-{n + 1:03d} | {title} · 1/3 изучаю английский | `{link(extra + '&studyTarget=en', route)}` | force-stop |  | wait:2000 | нет |  |")
    out.append(f"| lang-switch-{n + 2:03d} | {title} · 2/3 изучаю испанский без перезапуска | `{link(extra + '&studyTarget=es', route)}` | сразу после {n + 1:03d}, без force-stop |  | wait:2000 | нет |  |")
    out.append(f"| lang-switch-{n + 3:03d} | {title} · 3/3 снова английский без перезапуска | `{link(extra + '&studyTarget=en', route)}` | сразу после {n + 2:03d}, без force-stop |  | wait:2000 | нет |  |")
    n += 3
out.append('')

with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(out))
print(f'{OUT}: строк {n}, троек {n // 3}')

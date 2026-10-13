# Генератор docs/phraseman-2.0/DEV_LINKS_EN_PASS.md: набор ссылок «en-проход» (решение владельца п.76 «английский интерфейс входит в R1», координатор 12.10).
# Берёт готовые ссылки из DEV_LINKS_R1.md по списку id, добавляет `uiLang=en` перед `next=` (и `overlays=off`, если его нет) и дописывает ссылки на Главную и Уроки.
# Запуск: python scripts/dev_links_en_pass.py [путь к DEV_LINKS_R1.md] [путь для результата]
import re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'docs/phraseman-2.0/DEV_LINKS_R1.md'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'docs/phraseman-2.0/DEV_LINKS_EN_PASS.md'

BASE = 'phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off'

# (раздел, [id строк DEV_LINKS_R1.md])
GROUPS = [
    ('Диалоги — хаб, брифинг, сессия', ['dialogs-001', 'dialogs-003', 'dialogs-007', 'dialogs-013', 'dialogs-014', 'dialogs-017', 'dialogs-018', 'dialogs-023', 'dialogs-035', 'dialogs-036', 'dialogs-045', 'dialogs-gap-002']),
    ('Карточки — хаб, сохранённые, каталог', ['cards-v2-001', 'cards-002', 'cards-005', 'cards-007', 'cards-009', 'cards-010', 'cards-014', 'cards-015', 'cards-017', 'cards-020', 'cards-021', 'cards-023', 'cards-028']),
    ('Карточки — тренировки', ['cards-v2-029', 'cards-v2-031', 'cards-v2-033', 'cards-v2-034', 'cards-section-046', 'cards-gap-010']),
    ('Пейволы', ['paywall-gap-001', 'paywall-gap-004', 'paywall-gap-005', 'paywall-gap-009', 'paywalls-011', 'paywalls-012', 'paywalls-018', 'paywalls-019', 'paywalls-023']),
    ('Настройки и профиль', ['settings-gap-002', 'profile-004', 'profile-006', 'profile-007', 'profile-008', 'profile-011', 'profile-013', 'profile-016']),
    # зачем (координатор 12.10, Авторизация): EN-проход не покрывал вход, аккаунт, удаление, приватность. Только гость и dev-подмены:
    # switch=required|not_uploaded|backup_blocked и restore=retired подменяют вход ошибкой ПЕРВОЙ строкой signInWithProvider (до окна
    # Google — настоящего входа нет), delete=fail — до окна подтверждения, настоящее удаление недостижимо. Без входа в №1/№2/№3.
    # Смена аккаунта (auth-gap-013…018) нажимает кнопки по русскому тексту — генератор помечает их ⚠️, testID — отдельная задача Дизайна.
    ('Вход, аккаунт, удаление, приватность', ['auth-gap-001', 'profile-003', 'settings-gap-024', 'settings-gap-025', 'settings-gap-026',
                                              'auth-gap-003', 'auth-gap-004', 'auth-gap-005', 'auth-gap-008', 'auth-gap-012',
                                              'auth-gap-009', 'auth-gap-010', 'auth-gap-011', 'settings-gap-016', 'profile-012',
                                              'onboarding-001', 'onboarding-007',
                                              'auth-gap-013', 'auth-gap-014', 'auth-gap-015', 'auth-gap-017', 'auth-gap-018']),
]

# Главная, Уроки и итог диалога строк реестра не имеют — ссылки собраны вручную.
# зачем (координатор 12.10, Макеты): ids en-home/en-lessons/en-dialog-completion не проходили разбор робота (parseLinksDoc требует суффикс из трёх цифр) —
# теперь en-home-001 / en-lessons-001 / en-dialog-completion-001; колонки как в DEV_LINKS_R1 (8 штук: «тапы» шестая, «уникальна» седьмая).
EXTRA = [
    ('Главная и Уроки', [
        ('en-home-001', 'Главная', BASE + '&next=/(tabs)/home', '', 'да'),
        ('en-lessons-001', 'Уроки — карта', BASE + '&next=/(tabs)/lessons', '', 'да'),
    ]),
    # итог диалога: сессия + одна реплика + меню «⋯» → «Завершить» (шаги и ссылка берутся у dialogs-043 из DEV_LINKS_R1.md, не отлажены)
    ('Диалоги — итог', [
        ('en-dialog-completion-001', 'Итог диалога (завершён вручную)', 'FROM:dialogs-043', '', 'нет'),
    ]),
    # зачем (координатор 13.10): один кадр самого выбора языка изучения D164 — ссылка хаба Диалогов БЕЗ enStudyPrompt=off.
    ('Выбор языка изучения (D164)', [
        ('en-d164-lang-choice-001', 'Хаб «Диалоги» — выбор языка изучения (интерфейс en + изучаю en)', 'FROM_PROMPT:dialogs-001', '', 'да'),
    ]),
]

rows = {}
for line in open(SRC, encoding='utf-8'):
    m = re.match(r'\| ([a-z0-9-]+-\d{3}) \|', line)
    if m:
        c = line.rstrip('\n').split('|')
        rows[c[1].strip()] = {'title': c[2].strip(), 'link': c[3].strip().strip('`'), 'before': c[4].strip(), 'taps': c[6].strip().strip('`'), 'unique': c[7].strip() if len(c) > 7 else 'нет'}

def to_en(link: str, prompt_off: bool = True) -> str | None:
    if not link.startswith('phraseman://dev_state?'):
        return None
    head, sep, nxt = link.partition('&next=')
    if 'uiLang=' not in head:
        head += '&uiLang=en'
    if 'overlays=' not in head:
        head += '&overlays=off'
    # зачем (координатор 13.10, D164): при паре «интерфейс en + изучаю en» выбор языка изучения перекрывает кадр (хаб Диалогов);
    # dev-переключатель enStudyPrompt=off (3740a8eee, только память) его убирает. Изучаемый язык не меняем. Сам выбор — отдельной строкой.
    if prompt_off and 'enStudyPrompt=' not in head:
        head += '&enStudyPrompt=off'
    return head + sep + nxt

out = ['# DEV_LINKS_EN_PASS — ссылки «en-проход» (Дизайн, 12.10)', '',
       'Решение владельца п.76: английский интерфейс входит в R1. Флаг `ENGLISH_UI_LOCALE_ENABLED` пока выключен; до его включения английский открывается dev-подменой `uiLang=en` (app/dev_ui_lang.ts): только память, на диск и в облако язык не пишется, в стор-сборке параметр отклоняется. Каждая ссылка — готовая из DEV_LINKS_R1.md с `uiLang=en` и `overlays=off`.', '',
       '**Как проходить:** `adb shell am force-stop app.phraseman` → ссылка → «DEV-STATE OK». В журнале искать `[DEV-STATE] uiLang`, `[I18N-FALLBACK]` (строка без английского: подставился испанский), русский или испанский текст на экране = дыра. Шаги-тапы с текстовым селектором (`tap:Текст`) в английском не сработают — используйте `#testID`.', '']
missing = []
used = 0
for title, ids in GROUPS:
    out += [f'## {title}', '', '| id | экран · состояние | ссылка | перед кадром | shot list | тапы | уникальна | образец |', '|---|---|---|---|---|---|---|---|']
    for rid in ids:
        r = rows.get(rid)
        if not r:
            missing.append(rid); continue
        en = to_en(r['link'])
        if not en:
            out.append(f"| {rid} | {r['title']} | ручной путь (см. DEV_LINKS_R1.md) | {r['before']} |  | {r['taps']} | нет |  |")
            continue
        taps = r['taps']
        warn = ' ⚠️ селектор по тексту — заменить на #testID' if re.search(r'(tap|long|see|await):[^;#]*[А-Яа-яЁё]', taps) else ''
        out.append(f"| {rid} | {r['title']} | `{en}` | {r['before']} |  | {taps}{warn} | {r['unique']} |  |")
        used += 1
    out.append('')
for title, items in EXTRA:
    out += [f'## {title}', '', '| id | экран · состояние | ссылка | перед кадром | shot list | тапы | уникальна | образец |', '|---|---|---|---|---|---|---|---|']
    for rid, name, link, taps, uniq in items:
        if link.startswith('FROM:') or link.startswith('FROM_PROMPT:'):
            keep_prompt = link.startswith('FROM_PROMPT:')
            link = 'FROM:' + link.split(':', 1)[1]
            src = rows.get(link[5:])
            en_link = to_en(src['link'], prompt_off=not keep_prompt) if src else None
            if not en_link:
                out.append(f"| {rid} | {name} | ручной путь (см. DEV_LINKS_R1.md, {link[5:]}) |  |  |  | нет |  |")
                used += 1
                continue
            out.append(f"| {rid} | {name} | `{en_link}` |  |  | `{src['taps']}` | {uniq} |  |")
            used += 1
            continue
        out.append(f"| {rid} | {name} | {'`' + link + '`' if link.startswith('phraseman://') else link} |  |  | {taps} | {uniq} |  |")
        used += 1
    out.append('')
out += ['## Итог', '', f'Ссылок: {used}. Не найдено в DEV_LINKS_R1.md: {", ".join(missing) if missing else "нет"}.', '']
open(OUT + '.tmpw', 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
import os
os.replace(OUT + '.tmpw', OUT)
print('written', OUT, 'links', used, 'missing', missing)

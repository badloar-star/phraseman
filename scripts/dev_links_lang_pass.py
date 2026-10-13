#!/usr/bin/env python3
"""Генератор docs/phraseman-2.0/DEV_LINKS_LANG_PASS.md — шаблон ссылок lang_pass: 15 ключевых экранов × 7 языков интерфейса.

зачем (координатор 13.10, Сверка lang_pass): проверить, что на каждом языке интерфейса ключевые экраны целиком на нём (нет прилипших
русских/английских строк, длинные слова не ломают вёрстку). Хвост экрана — тот же `dev_state`, что у ru/en-прохода
(scripts/dev_links_lang_switch.py, Авторизация); добавляется только `&uiLang=<язык>` перед `next=`.

ВАЖНО: сейчас `dev_state?uiLang` принимает ТОЛЬКО `en|off` (app/dev_state_fixtures.ts, app/dev_ui_lang.ts). Для es, pt-BR, tr, pl, vi, id, uk
параметр отклоняется (`rejected`), пока Ядро не расширит его. Файл генерируется: `python scripts/dev_links_lang_pass.py`. Руками не править.
"""
import io
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'phraseman-2.0', 'DEV_LINKS_LANG_PASS.md')

# (код, название языка) — 7 языков lang_pass; ru и en проходит DEV_LINKS_LANG_SWITCH.md
LANGS = [('es', 'испанский'), ('pt-BR', 'португальский (Бразилия)'), ('tr', 'турецкий'), ('pl', 'польский'),
         ('vi', 'вьетнамский'), ('id', 'индонезийский'), ('uk', 'украинский')]

BASE = 'onboarding=done&intros=seen&overlays=off'
# 15 ключевых экранов: (ключ, название, параметры до next, маршрут, пауза)
SCREENS = [
    ('home', 'Главная', 'plus=off', '/(tabs)/home', 'wait:1500'),
    ('lessons', 'Уроки — список', 'plus=off&studyTarget=en', '/(tabs)/lessons', 'wait:1500'),
    ('dialogs', 'Диалоги — хаб', 'plus=off&coinRank=6', '/ai_dialog_home', 'wait:1500'),
    ('cards-hub', 'Карточки — хаб', 'cards=demo&plus=on&studyTarget=en&enStudyPrompt=off', '/flashcards', 'wait:1500'),
    ('cards-saved', 'Карточки — сохранённые', 'cards=demo&plus=on&studyTarget=en&enStudyPrompt=off', '/flashcards_collection?cat=saved', 'wait:1500'),
    ('settings', 'Настройки', 'plus=off', '/(tabs)/settings', 'wait:1500'),
    ('account', 'Аккаунт', 'plus=off', '/account_details', 'wait:1500'),
    ('stats', 'Статистика и серия', 'plus=on', '/streak_stats', 'wait:1500'),
    ('mistakes', 'Мои ошибки', 'mistakes=demo&studyTarget=en', '/mistakes_hub', 'wait:1500'),
    ('coins', 'Монеты — кошелёк', 'coinRank=5&coins=12480', '/runes_wallet', 'wait:1500'),
    ('video', 'Видео — канал', 'videopacks=catalog&studyTarget=en', '/lingman_videos', 'wait:1500'),
    ('community', 'Сообщество', 'cards=demo&plus=on&studyTarget=en&enStudyPrompt=off', '/(tabs)/community', 'wait:1500'),
    ('paywall', 'Пейвол Plus', 'plus=off&free=on&energy=5', '/premium_modal?context=no_energy%26source=no_energy_modal', 'wait:1500'),
    ('promo', 'Промокод', 'plus=off&energy=3&promo=not_found', '/promo_code_entry', 'wait:1500'),
    ('themes', 'Темы оформления', 'plus=off', '/settings_themes', 'wait:1500'),
]


def link(params, nxt, lang):
    return 'phraseman://dev_state?%s&%s&uiLang=%s&next=%s' % (BASE, params, lang, nxt)


def main():
    rows = []
    n = 0
    for code, name in LANGS:
        for key, title, params, nxt, wait in SCREENS:
            n += 1
            rows.append('| lang-pass-%03d | %s · %s | `%s` | `%s` | %s |' % (n, title, code, link(params, nxt, code),
                                                                            'force-stop только перед первым экраном языка' if key == 'home' else 'без force-stop (смена языка без перезапуска)', wait))
    head = ('# DEV_LINKS_LANG_PASS — ключевые экраны на 7 языках интерфейса (Темы 13.10)\n\n'
            'Файл генерируется: `python scripts/dev_links_lang_pass.py`. Руками не править.\n\n'
            '**Условие:** `dev_state?uiLang` сейчас принимает только `en|off`. Для es / pt-BR / tr / pl / vi / id / uk ссылки заработают после расширения параметра '
            'у Ядра (`app/dev_state_fixtures.ts`, `app/dev_ui_lang.ts`): значение = код языка из ворот интерфейсных языков; до этого параметр попадёт в `rejected`.\n\n'
            '**Как проходить:** языки идут блоками по 15 экранов; внутри блока `force-stop` не нужен (проверка смены языка без перезапуска), между блоками — `uiLang=off`. '
            'Кадр целиком на языке блока: русская или английская строка на нём = прилипшая строка (журнал `[LANG-SWITCH]`, `[I18N-FALLBACK]`). '
            'Смотреть длинные слова: переносы, обрезка, перекрытие (кнопки, плашки, заголовки).\n\n'
            '| id | экран · язык | ссылка | перед кадром | пауза |\n|---|---|---|---|---|\n')
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(head + '\n'.join(rows) + '\n')
    print('строк', n)


if __name__ == '__main__':
    main()

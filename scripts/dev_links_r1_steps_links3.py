# Ссылки и шаги, третья партия «link_missing → ready» (координатор 12.10: «каждые ~20 строк — коммит и итог»).
#
# зачем: часть строк — «дубли» уже описанных кадров (в реестре у них свой номер макета, а кадр приложения тот же: «(dup) То же, что …») — им достаточно скопировать ссылку и шаги
# соседней строки; плюс прямые маршруты служебных состояний. Файл подключается из scripts/dev_links_r1_generate.py после остальных модулей шагов (копирует их записи).
from dev_links_r1_steps import ENTRIES, add


def twin(rid, source, note=''):
    """Копия ссылки и шагов строки `source` для строки-двойника `rid` (тот же кадр приложения)."""
    src = ENTRIES.get(source)
    if src is None:
        raise SystemExit(f'links3: нет записи-источника {source} для {rid}')
    if rid in ENTRIES:
        raise SystemExit(f'duplicate steps entry: {rid}')
    ENTRIES[rid] = {'link': src['link'], 'steps': list(src['steps']), 'unique': src['unique'], 'note': note or f'тот же кадр, что {source}'}


# ── Карточки: двойники
twin('cards-section-038', 'cards-076', 'дубль cards-076: «Карточек нет» (тот же кадр)')
twin('cards-v2-035', 'cards-section-044', 'дубль cards-section-044: «Блиц — верно»')
twin('cards-v2-036', 'cards-section-045', 'дубль cards-section-045: «Блиц — неверно»')
twin('cards-v2-037', 'cards-section-046', '«Устно — верно» = cards-section-046 (speech=correct)')

# ── Карточки: служебное состояние «Недоступен для правки» (shot list G-C09): маршрут несуществующего облачного набора → ugc-pack-load-error
add('cards-074', ['see:#ugc-pack-load-error'], 'cards=demo&plus=on', '/community_pack_create?packId=dev_missing_cloud_pack', note='создание набора: набор недоступен для правки (packId несуществующего облачного набора → ugc-pack-load-error)')

# cards-061 — теперь в dev_links_r1_steps_cards3.py (Ядро c35b9f8ad: заметка всегда открыта, «раскрыта» = фокус)

# ── Каталог без сети: cards-section-029 «Сейчас недоступно» — тот же экран каталога сообщества (плитка «Сообщество» на хабе в авиарежиме → /flashcards_packs), что cards-v2-044
twin('cards-section-029', 'cards-v2-044', 'дубль cards-v2-044: каталог без сети (catalog=empty + fail=catalog_load)')

# ── Профиль: «Приватность и данные» (кадры profile-009/010 7:12 показали общий экран «Настройки» — у строк не было ссылки на /privacy_settings)
# зачем: настройки → «Приватность и данные» — отдельный маршрут; ИИ-переключатели не трогаем (согласие уходит в облако), аналитика — локальный переключатель; шаг для profile-010 не проверен на кадре
add('profile-009', ['wait:1000'], 'plus=off', '/privacy_settings', note='«Приватность и данные»: аналитика выкл, ИИ выкл (исходное состояние)')
add('profile-010', ['wait:1000', 'tap:#privacy-analytics-consent-switch', 'wait:600'], 'plus=off', '/privacy_settings', unique=False, note='«Приватность и данные»: аналитика ВКЛ (меняется заметка под тумблером); ИИ-переключатели не нажимать — согласие уходит в облако')

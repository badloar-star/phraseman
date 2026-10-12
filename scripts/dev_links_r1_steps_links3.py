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

# ── Карточки: редактор новой карточки, заметка раскрыта (testID поля заметки — fc-editor-description; раскрытие тапом — по коду, не проверено на кадре)
add('cards-061', ['tap:#fc-editor-description', 'wait:400'], 'cards=demo&plus=on', '/flashcards_card_editor?create=1&cat=custom', unique=False, note='редактор новой карточки: заметка раскрыта (тап по fc-editor-description; не проверено на кадре)')

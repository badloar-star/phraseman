#!/usr/bin/env python3
"""Regenerate task/epic Markdown, traceability and local read-only board from JSON."""
from pathlib import Path
from collections import Counter
import html
import json
from make_prompt import generate
ROOT=Path(__file__).resolve().parents[1]
def write(path, text):
    f=ROOT/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(text.rstrip()+'\n',encoding='utf-8')
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def main():
    tasks=read('registries/tasks.json');reqs={r['id']:r for r in read('registries/requirements.json')};epics=read('registries/epics.json')
    basis={'OWNER':'Указание владельца','PROPOSAL':'Рекомендация, требует согласования','DECISION':'Вопрос для решения владельцем','SAFETY':'Инженерная защита / обязательный контроль','LATER':'Отложенное направление'}
    trace=['# Связь требований, источников и задач','', 'Реестр отражает выполненную декомпозицию, а не доказательство абсолютной полноты. Контроль полноты — PM-003; сырой источник сохранён целиком. Символьные offsets — Unicode, не байты.','']
    for t in tasks:
        done=sum(a['accepted'] for a in t['acceptance']); total=len(t['acceptance'])
        lines=[f"# {t['id']} — {t['title']}",'',f"Эпик: [{t['epic']}](../epics/{t['epic']}.md) · Статус: `{t['status']}` · Критерии: {done}/{total}",f"Основание: {basis[t['basis']]} · Этап: {t['stage']}",f"Модель: `{t['model']}` · Reasoning: `{t['reasoning']}` · Профиль: {t['profile']}",'',f"Спецификация: [{t['spec']}](../{t['spec']})",'Правила: [BIBLE](../01_BIBLE.md) · [Состояние](../04_CURRENT_STATE.md) · [Решения](../03_DECISIONS.md)','', '## Проверяемый результат']
        for ac in t['acceptance']:
            lines += [f"- [{'x' if ac['accepted'] else ' '}] {ac['id']}: {ac['text']}"]
            if ac['evidence']:lines.append('  Доказательства: '+', '.join(map(str,ac['evidence'])))
        lines += ['', '## Зависимости и условия','Прямые задачи: '+(', '.join(f"[{d}]({d}.md)" for d in t['depends_on']) or 'не назначены; общие условия BIBLE действуют.')]
        lines += ['- '+g for g in t['gates']]
        lines += ['','Gates блокируют соответствующее изменение/выпуск, но не безопасный preflight. Не пытаться закрыть открытое решение без владельца.','', '## Источник и исходная формулировка']
        for rid in t['requirement_ids']:
            # зачем (01.10): в requirement_ids иногда стоит номер решения (D131 у PM-288) — раньше
            # KeyError ронял генератор на середине и оставлял полупереписанные карточки.
            if rid not in reqs:
                lines += [f"{rid} · решение владельца/координатора, см. [03_DECISIONS](../03_DECISIONS.md)",'']
                continue
            r=reqs[rid];s=r['source'];loc=f"символы {s['start_char']}:{s['end_char']}" if 'start_char' in s else s.get('anchor','')
            lines += [f"{rid} · [{s['file']}](../{s['file']}) · {loc} · {'дословная выдержка' if s.get('verbatim') else 'нормализованная расшифровка скриншота'}",'', '> '+s['excerpt'].strip().replace('\n','\n> '),'']
            trace += [f"## {rid} → [{t['id']}](tasks/{t['id']}.md)",f"{t['title']} · {basis[t['basis']]}",f"Источник: `{s['file']}`, {loc}",'', '> '+s['excerpt'].strip().replace('\n','\n> '),'']
        lines += ['## Обязательный preflight','Файлы/callers и SHA; Firestore/Functions/Storage/AI; разовая/постоянная цена; устройство; существующая очередь/priority/dedupe/cancel/retry; диагностика→админка; совместимость/rollback; тесты. Все неизвестные обозначить unknown, не 0.','', '## Выполнение и evidence',f"Audit SHA: {t.get('audit_sha') or 'не установлен'}",f"Result SHA: {t.get('result_sha') or 'нет'}",f"Исполнитель: {t.get('owner') or 'не назначен'}",f"Reviewer: {t.get('reviewer') or 'не назначен'}",'Проверки и evidence: '+(', '.join(map(str,t.get('evidence',[]))) or 'не приложены'), 'Остаток / notes: '+('; '.join(map(str,t.get('notes',[]))) or 'реализация не начата'),'', '## Готовый стартовый промпт','```text',generate(t['id']).strip(),'```']
        write(f"tasks/{t['id']}.md",'\n'.join(lines))
    write('06_TRACEABILITY.md','\n'.join(trace))
    for e in epics:
        tt=[t for t in tasks if t['epic']==e['id']]
        lines=[f"# {e['id']} — {e['title']}",'',f"Этап {e['stage']} · {len(tt)} задач · Спецификация: [docs/{e['spec']}.md](../docs/{e['spec']}.md)",'','Эпик не выполнять одним безлимитным промптом. Выбирать одну task с закрытыми необходимыми условиями.','', '| Задача | Результат | Статус | Модель / effort |','|---|---|---|---|']
        lines += [f"| [{t['id']}](../tasks/{t['id']}.md) | {t['title']} | {t['status']} | {t['model']} / {t['reasoning']} |" for t in tt]
        write(f"epics/{e['id']}.md",'\n'.join(lines))
    data=[]
    for t in tasks:
        x=dict(t);x['sources']=[reqs[r]['source'] for r in t['requirement_ids'] if r in reqs];data.append(x)
    payload=json.dumps({'tasks':data,'epics':epics,'basis':basis},ensure_ascii=False).replace('</','<\\/')
    template=(ROOT/'tools/board_template.html').read_text(encoding='utf-8')
    write('board.html',template.replace('__DATA_JSON__',payload))
    stats=Counter(t['model']+'/'+t['reasoning'] for t in tasks)
    section='\n'.join(f'| [{e["id"]}](epics/{e["id"]}.md) | {e["title"]} | {len(e["tasks"])} | {e["stage"]} |' for e in epics)
    master=f'''# PhraseMan 2.0 — мастер-план
Версия 1.0 · 23.09.2026 · {len(tasks)} задач / {len(epics)} эпика

## Цель и границы
Сохранить полезное обучение и убрать всё, что мешает пути YouTube → нужный набор → практика. Полностью новый современный мобильный интерфейс, не перенос отклонённого «Графита». Быстродействие доказывается на устройстве. Сохранность данных и покупок важнее скорости массового удаления.

План объединяет требования владельца, открытые решения и отдельные инженерные защиты. Основание каждой задачи явно подписано. Это не список уже выполненных изменений. Новые задания дописываются с новыми IDs без перенумерации существующих.

## Последовательность, которая не возвращает хаос
### Этап A — закрепить базу и измерить
PM-001–PM-011. Сначала текущий HEAD/релиз, затем route/file/job/copy/asset inventory, сценарии слабого устройства и реальные расходы. Выход: понятен denominator аудита; источники и неустановленные факты записаны. Нет разрешения удалить всё по совпадению строки.

### Этап B — закрыть контракты и выбрать новый дизайн
E02 и предварительная часть E03, одновременно read-only детализация E23. Утвердить монетный ранг/диалоги, лимиты своих карточек, исключения аудио, шкалу звёзд, карту сохранения покупок. Предложить новые направления на пяти экранах. Выход: конкретное согласование, а не фраза «примерно как Telegram».

### Этап C1 — один работающий вертикальный сценарий
После дизайна: каталог карточек → связанный набор из ролика → выбор/практика → результат → возврат. В этот срез входят только необходимые задачи E04/E09/E10/E11/E12/E20/E21. Не строить одновременно все разделы и не объявлять главный экран готовым приложением.

### Этап C2 — безопасное снятие старой экономики и фанфар
E05/E06/E07/E08 вместе с миграциями E23. Порядок внутри каждой механики: права/ledger → совместимость/cutoff → прекратить новые выдачи/покупки → мигрировать и проверить → снять UI/runtime → снять deployment → финальная очистка по сроку. Задачи эпика не означают, что можно игнорировать этот порядок.

### Этап C3 — остальные сохраняемые разделы
Диалоги, V1, друзья/активность, недельный топ, визитка, статистика, настройки. Единые компоненты, короткие тексты, изоляция локалей. Удаление арены/планов и консервация движков/Макса подтверждаются release graph. Нет зависимости от будущей башни или Learning V2.

### Этап D — финальная проверка и выпуск
E24 плюс окончательные проверки E21–E23. Upgrade с данными старого покупателя, offline/2 устройства, очереди, security, звук, доступность, paywall, фактический биллинг. Затем policy/terms по реально оставшимся потокам и управляемый beta/rollout с заранее заданными stop/rollback conditions.

### LATER — не растягивать текущий релиз
E15: новая V2, облачная голосовая ветка, башня. Новые 32×50 языковые V1 — сначала пилот/QA и спрос; запись идеи в плане не делает её блокером упрощения.

## Критический путь
База → карта прав/зависимостей → решение по экономике/доступу → утверждённый UI → один учебный поток → совместимая миграция → остальные потоки/удаление → реальные проверки → релиз. Дизайн-направления и read-only backend audit допустимо исследовать параллельно; запись в один checkout — одним владельцем.

## Первые отдельные сессии
| Сессия | Задачи и результат | Модель / effort |
|---|---|---|
| 1 | PM-001: только база, без редактирования приложения | Luna / high |
| 2 | PM-002–003: установка правил и контроль полноты в документах | Luna / high |
| 3 | Одна из PM-004–009 за раз: адресная инвентаризация | по карточке |
| 4 | PM-010–011: воспроизведение и данные, не предположение о причинах | по карточке |
| 5 | PM-013–020: конкретные нерешённые контракты по одному | по карточке |
| 6 | PM-022–024: новый дизайн и owner approval | по карточке |

Группа в строке — серия отдельных небольших заданий, не один общий prompt. Список не обещает число часов: без замеров базы и объёма legacy оценка времени выдумана.

## Эпики
| ID | Область | Задач | Этап |
|---|---|---:|---|
{section}

## Модели и экономия
Рекомендованные назначения: {', '.join(f'{k}: {v}' for k,v in sorted(stats.items()))}. Проверять фактическую доступность клиента. Это не обещание минимальной цены. Модель повышается на конкретном блокере, а не для всего эпика. Внутренние reviewers по необходимости, не пять дорогих проходов для каждого отступа.

## Где находится детальная работа
[Доска](board.html), [реестр](registries/tasks.json), [полная трассировка](06_TRACEABILITY.md), [решения](03_DECISIONS.md), [постоянные правила](01_BIBLE.md). Статусы и принятые критерии редактировать в реестре, затем `python tools/render_views.py`. Исходник не сокращать при передаче следующей сессии; загружать нужный фрагмент по locator.
'''
    write('02_MASTER_PLAN.md',master)
    print(f'Rendered {len(tasks)} tasks, {len(epics)} epics, board and master plan')
if __name__=='__main__':main()

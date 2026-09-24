#!/usr/bin/env python3
"""Print one task prompt. No API, model launch, Git or application changes."""
from pathlib import Path
import argparse
import json
import sys
ROOT = Path(__file__).resolve().parents[1]

def generate(task_id: str) -> str:
    tasks = json.loads((ROOT / 'registries/tasks.json').read_text(encoding='utf-8'))
    reqs = {r['id']: r for r in json.loads((ROOT / 'registries/requirements.json').read_text(encoding='utf-8'))}
    task = next((t for t in tasks if t['id'] == task_id), None)
    if not task:
        raise ValueError(f'Неизвестный Task ID: {task_id}')
    lines = [f"Задача {task['id']}: {task['title']}",
             f"Рекомендованная модель: {task['model']}; reasoning: {task['reasoning']}. Подтверди фактически выбранные в клиенте.",
             f"Статус: {task['status']}. Основание: {task['basis']}. Это не разрешение реализовать весь эпик.",
             '', 'Прочитай существующие AGENTS и следующие файлы пакета:',
             f"01_BIBLE.md → 04_CURRENT_STATE.md → 03_DECISIONS.md → tasks/{task_id}.md → {task['spec']}.",
             'Затем проверь фактический HEAD и затронутый код; прежний sample SHA не объявляй текущим.',
             '', 'Критерии результата:']
    for ac in task['acceptance']:
        lines.append(f"- {ac['id']}: {ac['text']}")
    lines += ['', 'Прямая зависимость: ' + (', '.join(task['depends_on']) or 'нет назначенной; общие gates сохраняются'),
              'До изменения должны быть закрыты gates: ' + (', '.join(task['gates']) or 'по BIBLE для выбранного вида работы'),
              '', 'Основание из источника (не выдавай SAFETY/PROPOSAL за дословное пожелание):']
    for rid in task['requirement_ids']:
        r = reqs[rid]; s = r['source']
        location = f"chars {s['start_char']}:{s['end_char']}" if 'start_char' in s else str(s.get('anchor', ''))
        lines += [f"{rid} | {s['file']} | {location} | {'дословно' if s.get('verbatim') else 'нормализовано'}", s['excerpt']]
    lines += ['', 'Сначала только preflight: scope/callers/инварианты, Firestore/Functions/Storage/AI, нагрузка устройства, jobs и место в существующей очереди, диагностика/админка, миграция, тесты и rollback.',
              'Новые расходы, jobs, зависимости, анимации или тексты не добавляй без согласования. Unknown не заменяй нулём. Открытое решение владельца нельзя закрывать самостоятельно.',
              'Без согласованного preflight и применимых gates не меняй код. После разрешения выполняй одну задачу; результат передай read-only reviewer с evidence. Незапущенные проверки обозначай NOT_RUN.',
              'По завершении запиши фактические SHA, модель/effort, accepted criteria/evidence, reviewer и остаток работы в реестр/worklog/handoff. При read-only доступе только предложи запись, не утверждай, что сохранил её.']
    return '\n'.join(lines) + '\n'

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('task_id')
    args = parser.parse_args()
    try:
        print(generate(args.task_id), end='')
        return 0
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
if __name__ == '__main__':
    raise SystemExit(main())

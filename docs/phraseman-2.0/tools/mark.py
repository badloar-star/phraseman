#!/usr/bin/env python3
"""Отметить прогресс задачи в registries/tasks.json и дописать запись в worklog.

зачем: владелец передаёт работу между разными LLM; отметки должны быть
одинаковыми и не требовать ручной правки 300-килобайтного JSON.

Пример:
  python tools/mark.py PM-037 --status done --accept PM-037-A1 \
      --evidence "commit abc123" --sha abc123 --owner "Claude Sonnet 5" \
      --model sonnet-5 --reasoning low --reviewer "Opus 5.5 self-check" \
      --note "колокольчик удалён"
Статусы: planned, ready_audit, in_progress, review, done, blocked, needs_decision, deferred.
После отметок: python tools/render_views.py && python tools/validate.py
"""
import argparse
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASKS = ROOT / 'registries' / 'tasks.json'
WORKLOG = ROOT / 'registries' / 'worklog.jsonl'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('task_id')
    p.add_argument('--status')
    p.add_argument('--accept', action='append', default=[], help='ID критерия (можно несколько)')
    p.add_argument('--evidence', action='append', default=[])
    p.add_argument('--sha')
    p.add_argument('--audit-sha')
    p.add_argument('--owner')
    p.add_argument('--reviewer')
    p.add_argument('--verdict', choices=['PASS', 'CHANGES_REQUIRED', 'BLOCKED'])
    p.add_argument('--model')
    p.add_argument('--reasoning')
    p.add_argument('--note', action='append', default=[])
    p.add_argument('--author', default='Claude')
    a = p.parse_args()

    tasks = json.loads(TASKS.read_text(encoding='utf-8'))
    task = next((t for t in tasks if t['id'] == a.task_id), None)
    if task is None:
        raise SystemExit(f'Нет задачи {a.task_id}')
    known = {c['id'] for c in task['acceptance']}
    for cid in a.accept:
        if cid not in known:
            raise SystemExit(f'У {a.task_id} нет критерия {cid}; есть: {sorted(known)}')
    for c in task['acceptance']:
        if c['id'] in a.accept:
            c['accepted'] = True
            c['evidence'] = list(dict.fromkeys(c['evidence'] + a.evidence))
    if a.status:
        task['status'] = a.status
    if a.sha:
        task['result_sha'] = a.sha
    if a.audit_sha:
        task['audit_sha'] = a.audit_sha
    if a.owner:
        task['owner'] = a.owner
    if a.reviewer:
        task['reviewer'] = a.reviewer
    if a.verdict:
        task['review_verdict'] = a.verdict
    if a.model:
        task['actual_model'] = a.model
    if a.reasoning:
        task['actual_reasoning'] = a.reasoning
    task['evidence'] = list(dict.fromkeys(task['evidence'] + a.evidence))
    task['notes'] = task['notes'] + a.note
    TASKS.write_text(json.dumps(tasks, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    entry = {
        'at': date.today().isoformat(), 'kind': 'TASK_PROGRESS', 'task_id': a.task_id,
        'author': a.author, 'status': task['status'], 'accepted': a.accept,
        'result_sha': a.sha, 'note': '; '.join(a.note), 'evidence': a.evidence,
    }
    with WORKLOG.open('a', encoding='utf-8') as f:
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    done = sum(c['accepted'] for c in task['acceptance'])
    print(f"{a.task_id}: {task['status']} · критерии {done}/{len(task['acceptance'])}")


if __name__ == '__main__':
    main()

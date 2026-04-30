"""
restore_session_edits.py
========================
Читает все JSONL сессий Claude и восстанавливает все Edit-операции в файлах проекта.

Запуск:
  python scripts/restore_session_edits.py

Или из другой сессии Claude:
  Bash: python c:/appsprojects/phraseman/scripts/restore_session_edits.py
"""

import json
import os
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SESSIONS_DIR = Path("C:/Users/badlo/.claude/projects/c--appsprojects-phraseman")
PROJECT_DIR  = Path("c:/appsprojects/phraseman")

def load_edits_from_jsonl(jsonl_path):
    """Извлекает все Edit tool_use из одного JSONL файла сессии."""
    edits = []
    try:
        with open(jsonl_path, encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue

                msg = obj.get('message', {})
                if not msg:
                    continue
                if msg.get('role') != 'assistant':
                    continue

                content = msg.get('content', [])
                if not isinstance(content, list):
                    continue

                for block in content:
                    if not isinstance(block, dict):
                        continue
                    if block.get('type') != 'tool_use':
                        continue
                    if block.get('name') != 'Edit':
                        continue

                    inp = block.get('input', {})
                    file_path  = inp.get('file_path', '')
                    old_string = inp.get('old_string', '')
                    new_string = inp.get('new_string', '')
                    replace_all = inp.get('replace_all', False)

                    if file_path and old_string and new_string != old_string:
                        edits.append({
                            'file': file_path,
                            'old': old_string,
                            'new': new_string,
                            'replace_all': replace_all,
                            'session': jsonl_path.name,
                        })
    except Exception as e:
        print(f"  ОШИБКА при чтении {jsonl_path.name}: {e}")
    return edits


def apply_edits(edits):
    applied = 0
    skipped = 0
    missing = 0
    errors  = 0

    file_cache = {}

    for edit in edits:
        fpath = edit['file']

        # Нормализуем путь
        fpath = fpath.replace('\\', '/')

        if not os.path.exists(fpath):
            print(f"  ✗ ФАЙЛ НЕ НАЙДЕН: {fpath}")
            errors += 1
            continue

        if fpath not in file_cache:
            try:
                file_cache[fpath] = open(fpath, encoding='utf-8').read()
            except Exception as e:
                print(f"  ✗ ЧТЕНИЕ: {fpath}: {e}")
                errors += 1
                continue

        content = file_cache[fpath]
        old = edit['old']
        new = edit['new']

        # Уже применено — new строка есть, old нет
        if new in content and old not in content:
            skipped += 1
            continue

        # Нечего применять — old строки нет и new тоже нет
        if old not in content:
            missing += 1
            continue

        # Применяем
        if edit['replace_all']:
            file_cache[fpath] = content.replace(old, new)
        else:
            file_cache[fpath] = content.replace(old, new, 1)

        short_old = old[:60].replace('\n', '↵')
        print(f"  ✓ {os.path.basename(fpath)}: {short_old!r}")
        applied += 1

    # Сохраняем изменённые файлы
    for fpath, content in file_cache.items():
        original = open(fpath, encoding='utf-8').read()
        if content != original:
            open(fpath, 'w', encoding='utf-8').write(content)

    return applied, skipped, missing, errors


def main():
    print("=" * 60)
    print("restore_session_edits.py")
    print("=" * 60)

    jsonl_files = sorted(SESSIONS_DIR.glob("*.jsonl"))
    print(f"\nНайдено сессий: {len(jsonl_files)}")

    all_edits = []
    for jf in jsonl_files:
        edits = load_edits_from_jsonl(jf)
        if edits:
            print(f"  {jf.name[:8]}...: {len(edits)} Edit операций")
            all_edits.extend(edits)

    print(f"\nВсего Edit операций (до дедупликации): {len(all_edits)}")

    # Дедупликация: оставляем только первое вхождение каждой уникальной тройки (file, old, new)
    seen = set()
    deduped = []
    for e in all_edits:
        key = (e['file'], e['old'], e['new'])
        if key not in seen:
            seen.add(key)
            deduped.append(e)
    all_edits = deduped
    print(f"После дедупликации:                    {len(all_edits)}")
    print("\nПрименяю...\n")

    applied, skipped, missing, errors = apply_edits(all_edits)

    print(f"\n{'='*60}")
    print(f"  Применено:     {applied}")
    print(f"  Уже на месте:  {skipped}")
    print(f"  Не найдено:    {missing}")
    print(f"  Ошибки:        {errors}")
    print("=" * 60)


if __name__ == '__main__':
    main()

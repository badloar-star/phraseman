import json
import os
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TARGET_SESSIONS = [
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/66d17b80-d929-4f73-ac0a-617069bb7062.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/fa8a53f6-4276-4a25-88c5-6b8bde5879ef.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/f03ded42-448c-40fe-bd13-aa58f6b76f79.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/560c3309-c253-4584-9b47-f73b75269a20.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/0506cde2-bb1e-484c-9395-b86120e16785.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/dca4eba4-ee3e-4fc2-909f-a01dd5ac39f2.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/a9f317e2-3dc7-4488-a9b1-cd2a18e30949.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/75ec9482-b8e9-4d08-bf11-e37170764462.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/ab6ff238-b065-42fe-804f-427246de0afe.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/1483959d-c857-4eb1-bbb5-d72b3ccfc8fa.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/327644f1-bedc-47de-9962-1a0629f5c1ab.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/a813499c-f63c-46c8-93d3-68e174bb43ec.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/1eb4d6e8-d2b7-47a5-b8af-c09c0d72e323.jsonl",
    # Арена — сессии 15:21–15:36 (прямо перед плохими коммитами)
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/3deb5db8-7027-4c65-a62a-ffdfaace6032.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/33b61ac9-be2a-48c1-8b77-a622c75b2e17.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/282891be-7286-4fa7-9487-97048a02ecfa.jsonl",
    "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/b8657361-68b4-494f-b52d-5ba461e74e47.jsonl",
]


def load_edits_from_jsonl(jsonl_path):
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
                if not msg or msg.get('role') != 'assistant':
                    continue
                content = msg.get('content', [])
                if not isinstance(content, list):
                    continue
                for block in content:
                    if not isinstance(block, dict):
                        continue
                    if block.get('type') != 'tool_use' or block.get('name') != 'Edit':
                        continue
                    inp = block.get('input', {})
                    file_path   = inp.get('file_path', '')
                    old_string  = inp.get('old_string', '')
                    new_string  = inp.get('new_string', '')
                    replace_all = inp.get('replace_all', False)
                    if file_path and old_string and new_string != old_string:
                        edits.append({
                            'file': file_path,
                            'old': old_string,
                            'new': new_string,
                            'replace_all': replace_all,
                        })
    except Exception as e:
        print(f"  ОШИБКА: {jsonl_path}: {e}")
    return edits


def apply_edits(edits):
    applied = skipped = missing = errors = 0
    file_cache = {}

    for edit in edits:
        fpath = edit['file'].replace('\\\\', '/').replace('\\', '/')
        if not os.path.exists(fpath):
            print(f"  x НЕТ ФАЙЛА: {fpath}")
            errors += 1
            continue
        if fpath not in file_cache:
            try:
                file_cache[fpath] = open(fpath, encoding='utf-8').read()
            except Exception as e:
                print(f"  x ЧТЕНИЕ {fpath}: {e}")
                errors += 1
                continue

        content = file_cache[fpath]
        old, new = edit['old'], edit['new']

        if new in content and old not in content:
            skipped += 1
            continue
        if old not in content:
            missing += 1
            continue

        if edit['replace_all']:
            file_cache[fpath] = content.replace(old, new)
        else:
            file_cache[fpath] = content.replace(old, new, 1)

        short = old[:70].replace('\n', 'NL')
        print(f"  + {os.path.basename(fpath)}: {short!r}")
        applied += 1

    for fpath, content in file_cache.items():
        original = open(fpath, encoding='utf-8').read()
        if content != original:
            open(fpath, 'w', encoding='utf-8').write(content)

    return applied, skipped, missing, errors


def main():
    print("=" * 65)
    print("Восстановление: 17 апр 16:18 — 18 апр 15:36")
    print("=" * 65)

    all_edits = []
    seen_keys = set()

    for path in TARGET_SESSIONS:
        if not os.path.exists(path):
            print(f"  пропускаю (нет файла): {os.path.basename(path)[:20]}")
            continue
        edits = load_edits_from_jsonl(path)
        before = len(all_edits)
        for e in edits:
            key = (e['file'], e['old'], e['new'])
            if key not in seen_keys:
                seen_keys.add(key)
                all_edits.append(e)
        added = len(all_edits) - before
        print(f"  {os.path.basename(path)[:20]}: {len(edits)} ops, +{added} unique")

    print(f"\nВсего уникальных операций: {len(all_edits)}")
    print("\nПрименяю...\n")

    applied, skipped, missing, errors = apply_edits(all_edits)

    print(f"\n{'='*65}")
    print(f"  Применено:    {applied}")
    print(f"  Уже есть:     {skipped}")
    print(f"  Не найдено:   {missing}")
    print(f"  Ошибки:       {errors}")
    print("=" * 65)


if __name__ == '__main__':
    main()

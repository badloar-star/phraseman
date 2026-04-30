#!/usr/bin/env python3
"""
Analyze Claude session JSONL file to find unapplied edits.
"""
import json
import os

SESSION_FILE = r"C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/66d17b80-d929-4f73-ac0a-617069bb7062.jsonl"
OUTPUT_FILE = r"c:/appsprojects/phraseman/scripts/session1_analysis.txt"
BASE_PATH = r"c:/appsprojects/phraseman"
SKIP_PATHS = ["root-access", "settings.json", "/Users/badlo/.claude", "C:/Users/badlo/.claude"]

def should_skip(path):
    if not path:
        return True
    for s in SKIP_PATHS:
        if s in path:
            return True
    norm = path.replace("\\", "/").lower()
    if "appsprojects/phraseman" not in norm:
        return True
    return False

def read_file(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()
    except:
        return None

def write_file(path, content):
    try:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"  Write error: {e}")
        return False

# Parse session
print("Parsing session file...")
edits = []
writes = []

with open(SESSION_FILE, 'r', encoding='utf-8', errors='replace') as f:
    for line_num, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except:
            continue

        if obj.get('type') != 'assistant':
            continue

        msg = obj.get('message', {})
        if not isinstance(msg, dict):
            continue

        content = msg.get('content', [])
        if not isinstance(content, list):
            continue

        for item in content:
            if not isinstance(item, dict):
                continue
            if item.get('type') != 'tool_use':
                continue

            tool_name = item.get('name', '')
            inp = item.get('input', {})

            if tool_name == 'Edit':
                file_path = inp.get('file_path', '')
                if should_skip(file_path):
                    continue
                edits.append({
                    'line': line_num,
                    'file_path': file_path,
                    'old_string': inp.get('old_string', ''),
                    'new_string': inp.get('new_string', ''),
                    'replace_all': inp.get('replace_all', False),
                })

            elif tool_name == 'Write':
                file_path = inp.get('file_path', '')
                if should_skip(file_path):
                    continue
                writes.append({
                    'line': line_num,
                    'file_path': file_path,
                    'content': inp.get('content', ''),
                })

print(f"Found {len(edits)} Edit operations, {len(writes)} Write operations")

# Analyze edits
unapplied = []
already_applied = []
cant_apply = []

for edit in edits:
    fp = edit['file_path']
    old = edit['old_string']
    new = edit['new_string']

    content = read_file(fp)
    if content is None:
        cant_apply.append({**edit, 'reason': 'FILE_NOT_FOUND'})
        continue

    old_present = old in content
    # Check if new is present (and old is not — meaning already applied)
    new_present = new in content if new.strip() else True

    if old_present:
        unapplied.append({**edit, '_content': content})
    elif new_present:
        already_applied.append(edit)
    else:
        cant_apply.append({**edit, 'reason': 'NEITHER_FOUND'})

# Analyze writes — use the LAST write per file (most recent)
from collections import defaultdict
last_write = {}
for w in writes:
    last_write[w['file_path']] = w

write_missing = []
write_ok = []

for fp, w in last_write.items():
    if not os.path.exists(fp):
        write_missing.append(w)
    else:
        existing = read_file(fp)
        if existing != w['content']:
            write_missing.append({**w, 'exists_different': True})
        else:
            write_ok.append(w)

# Build output
lines_out = []
lines_out.append("=" * 80)
lines_out.append("SESSION ANALYSIS REPORT")
lines_out.append("=" * 80)
lines_out.append(f"Total Edit ops (phraseman): {len(edits)}")
lines_out.append(f"  Already applied:          {len(already_applied)}")
lines_out.append(f"  Unapplied (old present):  {len(unapplied)}")
lines_out.append(f"  Cannot apply:             {len(cant_apply)}")
lines_out.append(f"Total Write ops:            {len(writes)} ({len(last_write)} unique files)")
lines_out.append(f"  Already written OK:       {len(write_ok)}")
lines_out.append(f"  Missing/different:        {len(write_missing)}")
lines_out.append("")

# Group unapplied by file
by_file = defaultdict(list)
for e in unapplied:
    by_file[e['file_path']].append(e)

lines_out.append("=" * 80)
lines_out.append("UNAPPLIED EDITS (grouped by file)")
lines_out.append("=" * 80)

for fp in sorted(by_file.keys()):
    edits_list = by_file[fp]
    lines_out.append(f"\nFILE: {fp}  [{len(edits_list)} edit(s)]")
    for i, e in enumerate(edits_list, 1):
        lines_out.append(f"  Edit #{i} (session line {e['line']}):")
        lines_out.append(f"    OLD: {repr(e['old_string'][:150])}")
        lines_out.append(f"    NEW: {repr(e['new_string'][:150])}")

lines_out.append("\n" + "=" * 80)
lines_out.append("CANNOT APPLY (neither old nor new found)")
lines_out.append("=" * 80)

cant_by_file = defaultdict(list)
for e in cant_apply:
    cant_by_file[e['file_path']].append(e)

for fp in sorted(cant_by_file.keys()):
    edits_list = cant_by_file[fp]
    lines_out.append(f"\nFILE: {fp}")
    for i, e in enumerate(edits_list, 1):
        lines_out.append(f"  Edit #{i} (line {e['line']}, reason={e.get('reason','?')})")
        lines_out.append(f"    OLD: {repr(e['old_string'][:150])}")
        lines_out.append(f"    NEW: {repr(e['new_string'][:150])}")

lines_out.append("\n" + "=" * 80)
lines_out.append("MISSING/DIFFERENT WRITES (last write per file)")
lines_out.append("=" * 80)
for w in write_missing:
    fp = w['file_path']
    lines_out.append(f"\nFILE: {fp}")
    lines_out.append(f"  exists_different={w.get('exists_different', False)}")
    lines_out.append(f"  Content preview: {repr(w['content'][:200])}")

lines_out.append("\n" + "=" * 80)
lines_out.append("UNAPPLIED COUNT PER FILE (summary)")
lines_out.append("=" * 80)
for fp in sorted(by_file.keys()):
    lines_out.append(f"  {len(by_file[fp]):3d}  {fp}")

output_text = "\n".join(lines_out)
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(output_text)

print(f"Analysis written to {OUTPUT_FILE}")

# === APPLY UNAPPLIED EDITS ===
print("\n" + "="*60)
print("APPLYING UNAPPLIED EDITS...")
print("="*60)

newly_applied = 0
failed = 0

# Apply in session order, re-reading file each time we change it
# Group by file, preserve session order within each file
for fp in sorted(by_file.keys()):
    edits_list = sorted(by_file[fp], key=lambda e: e['line'])
    content = read_file(fp)
    if content is None:
        print(f"  SKIP (can't read): {fp}")
        failed += len(edits_list)
        continue

    file_changed = False
    for e in edits_list:
        old = e['old_string']
        new = e['new_string']
        replace_all = e.get('replace_all', False)

        if old not in content:
            print(f"  SKIP (old not present): {fp}:L{e['line']}")
            failed += 1
            continue

        if replace_all:
            content = content.replace(old, new)
        else:
            content = content.replace(old, new, 1)
        file_changed = True
        newly_applied += 1
        short_old = repr(old[:60])
        print(f"  APPLY L{e['line']}: {fp}")
        print(f"    old={short_old}")

    if file_changed:
        if write_file(fp, content):
            print(f"  SAVED: {fp}")
        else:
            print(f"  ERROR saving: {fp}")

# Apply missing writes
print("\nAPPLYING MISSING WRITES...")
writes_applied = 0
for w in write_missing:
    fp = w['file_path']
    dirpath = os.path.dirname(fp)
    if dirpath:
        os.makedirs(dirpath, exist_ok=True)
    if write_file(fp, w['content']):
        print(f"  WROTE: {fp}")
        writes_applied += 1
    else:
        print(f"  ERROR: {fp}")

print("\n" + "="*60)
print("FINAL SUMMARY")
print("="*60)
print(f"Total Edit ops in session:     {len(edits)}")
print(f"  Already applied before run:  {len(already_applied)}")
print(f"  Newly applied this run:      {newly_applied}")
print(f"  Could not apply:             {len(cant_apply) + failed}")
print(f"Write ops (unique files):      {len(last_write)}")
print(f"  Already OK:                  {len(write_ok)}")
print(f"  Newly written this run:      {writes_applied}")

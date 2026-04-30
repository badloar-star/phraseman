import json, sys, io, os
from pathlib import Path
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SESSIONS_DIR = Path("C:/Users/badlo/.claude/projects/c--appsprojects-phraseman")
TARGET = [
    "66d17b80-d929-4f73-ac0a-617069bb7062.jsonl",
    "fa8a53f6-4276-4a25-88c5-6b8bde5879ef.jsonl",
    "f03ded42-448c-40fe-bd13-aa58f6b76f79.jsonl",
    "560c3309-c253-4584-9b47-f73b75269a20.jsonl",
    "0506cde2-bb1e-484c-9395-b86120e16785.jsonl",
    "dca4eba4-ee3e-4fc2-909f-a01dd5ac39f2.jsonl",
    "a9f317e2-3dc7-4488-a9b1-cd2a18e30949.jsonl",
    "75ec9482-b8e9-4d08-bf11-e37170764462.jsonl",
    "ab6ff238-b065-42fe-804f-427246de0afe.jsonl",
    "1483959d-c857-4eb1-bbb5-d72b3ccfc8fa.jsonl",
    "327644f1-bedc-47de-9962-1a0629f5c1ab.jsonl",
    "a813499c-f63c-46c8-93d3-68e174bb43ec.jsonl",
    "1eb4d6e8-d2b7-47a5-b8af-c09c0d72e323.jsonl",
    "3deb5db8-7027-4c65-a62a-ffdfaace6032.jsonl",
    "33b61ac9-be2a-48c1-8b77-a622c75b2e17.jsonl",
    "282891be-7286-4fa7-9487-97048a02ecfa.jsonl",
    "b8657361-68b4-494f-b52d-5ba461e74e47.jsonl",
]
SKIP = ['root-access', 'settings.json', '/Users/badlo/.claude']

# Collect edits per file in CHRONOLOGICAL order (no dedup)
edits_per_file = defaultdict(list)
for name in TARGET:
    jf = SESSIONS_DIR / name
    if not jf.exists(): continue
    with open(jf, encoding='utf-8', errors='ignore') as f:
        for line in f:
            try: obj = json.loads(line.strip())
            except: continue
            msg = obj.get('message', {})
            if msg.get('role') != 'assistant': continue
            for block in msg.get('content', []):
                if not isinstance(block, dict): continue
                if block.get('type') != 'tool_use' or block.get('name') != 'Edit': continue
                inp = block.get('input', {})
                fp = inp.get('file_path', '').replace('\\', '/')
                old = inp.get('old_string', '')
                new = inp.get('new_string', '')
                if not fp or not old: continue
                skip = any(s in fp for s in SKIP)
                if skip: continue
                if 'phraseman' not in fp.lower(): continue
                edits_per_file[fp].append((old, new, name[:8]))

# For each file, apply edits where possible
total_applied = 0
total_skipped = 0
report = []
for fp, edits in sorted(edits_per_file.items()):
    if not os.path.exists(fp):
        report.append(f"MISSING FILE: {fp} ({len(edits)} edits)")
        continue
    with open(fp, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    original = content
    applied = 0
    skipped_dup = 0
    skipped_stale = 0
    for old, new, sess in edits:
        if old == new:
            skipped_dup += 1
            continue
        if old in content:
            # Only apply if the new_string is not already present in a way that would duplicate
            # If the new_string contains the old_string (extension), we want to make sure new isn't already there
            if new and new in content:
                # already applied in another way
                skipped_dup += 1
                continue
            # Apply the replacement (only first occurrence to be safe)
            content = content.replace(old, new, 1)
            applied += 1
        else:
            # old string not found — either already applied or superseded
            if new and new in content:
                skipped_dup += 1
            else:
                skipped_stale += 1
    if content != original:
        with open(fp, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        report.append(f"APPLIED {applied} to {fp} (skipped_dup={skipped_dup}, skipped_stale={skipped_stale})")
        total_applied += applied
    else:
        report.append(f"NO CHANGES to {fp} (skipped_dup={skipped_dup}, skipped_stale={skipped_stale})")
    total_skipped += skipped_dup + skipped_stale

print(f"Total applied: {total_applied}")
print(f"Total skipped: {total_skipped}")
print()
for line in report:
    print(line)

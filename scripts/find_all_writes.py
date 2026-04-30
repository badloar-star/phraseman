import json, os, sys, io, datetime
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SESSIONS_DIR = Path("C:/Users/badlo/.claude/projects/c--appsprojects-phraseman")

# Период: 17 апр 16:18 -> 18 апр 15:36
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

SKIP = ['service-account.json', 'root-access', 'functions/']

all_writes = {}  # file -> (session, content)

for name in TARGET:
    jf = SESSIONS_DIR / name
    if not jf.exists():
        continue
    try:
        with open(jf, encoding='utf-8', errors='ignore') as f:
            for line in f:
                try:
                    obj = json.loads(line.strip())
                except:
                    continue
                msg = obj.get('message', {})
                if msg.get('role') != 'assistant':
                    continue
                for block in msg.get('content', []):
                    if not isinstance(block, dict):
                        continue
                    if block.get('type') != 'tool_use' or block.get('name') != 'Write':
                        continue
                    inp = block.get('input', {})
                    fp = inp.get('file_path', '').replace('\\', '/')
                    content = inp.get('content', '')
                    if not fp or not content:
                        continue
                    if 'phraseman' not in fp.lower():
                        continue
                    skip = False
                    for s in SKIP:
                        if s in fp:
                            skip = True
                            break
                    if skip:
                        continue
                    all_writes[fp] = (name[:16], content)
    except Exception as e:
        print(f"ERROR {name}: {e}")

print(f"Всего уникальных Write-файлов: {len(all_writes)}\n")

# Показываем какие файлы НЕ существуют на диске (нужно создать)
missing = []
existing = []
for fp, (sess, content) in sorted(all_writes.items()):
    fp_norm = fp.replace('\\', '/')
    if os.path.exists(fp_norm):
        existing.append((fp_norm, sess, len(content)))
    else:
        missing.append((fp_norm, sess, len(content)))

print("=== ОТСУТСТВУЮТ (надо создать) ===")
for fp, sess, size in missing:
    print(f"  {sess}: {os.path.basename(fp)} ({size} chars)")

print(f"\n=== УЖЕ СУЩЕСТВУЮТ ({len(existing)}) ===")
for fp, sess, size in existing:
    print(f"  {sess}: {os.path.basename(fp)}")

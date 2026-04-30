import json, os, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SESSIONS_DIR = Path("C:/Users/badlo/.claude/projects/c--appsprojects-phraseman")

TARGET = [
    "fa8a53f6-4276-4a25-88c5-6b8bde5879ef.jsonl",
    "dca4eba4-ee3e-4fc2-909f-a01dd5ac39f2.jsonl",
]

MISSING = [
    'FLASHCARDS_RULES.md',
    'HOME_DEPENDENCIES.md',
    'PREMIUM_MODAL_RULES.md',
    'firestore.indexes.json',
]

writes = {}
for name in TARGET:
    jf = SESSIONS_DIR / name
    if not jf.exists():
        continue
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
                if any(m in fp for m in MISSING):
                    writes[fp] = content

for fp, content in writes.items():
    os.makedirs(os.path.dirname(fp) or '.', exist_ok=True)
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  + CREATED: {os.path.basename(fp)}")

print(f"\nCreated {len(writes)} files")

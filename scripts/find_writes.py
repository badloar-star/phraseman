import json, os, sys, io, datetime
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SESSIONS_DIR = Path("C:/Users/badlo/.claude/projects/c--appsprojects-phraseman")

target = []
for jf in sorted(SESSIONS_DIR.glob("*.jsonl")):
    mtime = jf.stat().st_mtime
    dt = datetime.datetime.fromtimestamp(mtime)
    if dt.month == 4 and dt.day == 18 and dt.hour < 16:
        target.append((dt, jf))

target.sort()
print(f"Sessions to scan: {len(target)}")

KEYWORDS = ['screengradient', 'gradient', 'background', 'anim', 'arena', 'duel']

for dt, jf in target:
    writes = []
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
                    if block.get('type') != 'tool_use':
                        continue
                    if block.get('name') != 'Write':
                        continue
                    fp = block.get('input', {}).get('file_path', '')
                    if any(k in fp.lower() for k in KEYWORDS):
                        writes.append(fp)
    except Exception as e:
        pass
    if writes:
        print(f"\n  {dt.strftime('%H:%M')} {jf.name[:20]}:")
        for w in writes:
            print(f"    WRITE: {w}")

# Also look for ALL writes in phraseman
print("\n\n=== ALL Write ops on phraseman files ===")
for dt, jf in target:
    writes = []
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
                    if block.get('type') != 'tool_use':
                        continue
                    if block.get('name') != 'Write':
                        continue
                    fp = block.get('input', {}).get('file_path', '')
                    if 'phraseman' in fp.lower():
                        writes.append(fp)
    except:
        pass
    if writes:
        print(f"\n  {dt.strftime('%H:%M')} {jf.name[:20]}:")
        for w in set(writes):
            print(f"    {w}")

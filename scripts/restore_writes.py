import json, os, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SESSION = "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/33b61ac9-be2a-48c1-8b77-a622c75b2e17.jsonl"

# Also include b8657361 session
SESSION2 = "C:/Users/badlo/.claude/projects/c--appsprojects-phraseman/b8657361-68b4-494f-b52d-5ba461e74e47.jsonl"

SKIP_PATHS = [
    'service-account.json',   # credentials - skip
    'functions/',             # cloud functions - skip for now
    'root-access',            # другой проект
]

def should_skip(fp):
    for s in SKIP_PATHS:
        if s in fp:
            return True
    return False

def extract_writes(session_path):
    writes = []
    try:
        with open(session_path, encoding='utf-8', errors='ignore') as f:
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
                    inp = block.get('input', {})
                    fp = inp.get('file_path', '')
                    content = inp.get('content', '')
                    if fp and content and 'phraseman' in fp.lower():
                        if not should_skip(fp):
                            writes.append({'file': fp, 'content': content})
    except Exception as e:
        print(f"ERROR reading {session_path}: {e}")
    return writes

def apply_writes(writes):
    # Deduplicate - keep LAST write to each file (most recent version)
    seen = {}
    for w in writes:
        seen[w['file']] = w['content']

    written = 0
    for fp, content in seen.items():
        fp_norm = fp.replace('\\', '/')
        # Ensure directory exists
        dirpath = os.path.dirname(fp_norm)
        if dirpath:
            os.makedirs(dirpath, exist_ok=True)
        try:
            with open(fp_norm, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  + WRITTEN: {os.path.basename(fp_norm)}")
            written += 1
        except Exception as e:
            print(f"  x ERROR {fp_norm}: {e}")
    return written

def main():
    print("=" * 60)
    print("Restoring Write ops from arena sessions")
    print("=" * 60)

    all_writes = []
    for sess in [SESSION, SESSION2]:
        w = extract_writes(sess)
        print(f"\n{os.path.basename(sess)[:20]}: {len(w)} Write ops")
        all_writes.extend(w)

    print(f"\nTotal: {len(all_writes)} writes")
    print(f"Unique files: {len(set(w['file'] for w in all_writes))}")
    print("\nApplying...\n")

    written = apply_writes(all_writes)
    print(f"\nDone: {written} files written")

if __name__ == '__main__':
    main()

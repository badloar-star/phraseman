import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

raw = open('C:\\appsprojects\\phraseman\\__draft_d38.json', encoding='utf-8').read()
draft = json.loads(raw)

def walk(obj, path=''):
    if isinstance(obj, dict):
        if any(k in obj for k in ['ru','uk','es']) and isinstance(obj.get('ru',''), str):
            keys = [k for k in ['ru','uk','es'] if k in obj]
            if len(keys) >= 2:
                print(f'PATH: {path}')
                for k in keys:
                    print(f'  {k.upper()}: {obj[k]}')
                print()
        for k, v in obj.items():
            walk(v, path + '.' + k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk(v, path + f'[{i}]')

walk(draft)

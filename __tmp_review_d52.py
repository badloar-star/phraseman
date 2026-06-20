import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'C:\appsprojects\phraseman\__tmp_review_d52.json', encoding='utf-8') as f:
    data = json.load(f)

def walk(obj, path=''):
    if isinstance(obj, dict):
        ru = obj.get('ru')
        uk = obj.get('uk')
        es = obj.get('es')
        if ru and (uk or es):
            print(f'PATH: {path}')
            print(f'  RU: {ru}')
            if uk:
                print(f'  UK: {uk}')
            if es:
                print(f'  ES: {es}')
            print()
        for k, v in obj.items():
            walk(v, (path + '.' + k) if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk(v, f'{path}[{i}]')

walk(data)

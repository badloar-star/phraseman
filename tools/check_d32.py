import json

raw = open('C:/appsprojects/phraseman/tools/d32.json', encoding='utf-8').read()
draft = json.loads(raw)

def extract_triples(obj, path, results):
    if isinstance(obj, dict):
        if 'ru' in obj:
            results.append({'path': path, 'ru': obj.get('ru'), 'uk': obj.get('uk'), 'es': obj.get('es')})
        else:
            for k, v in obj.items():
                extract_triples(v, path + '.' + k, results)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            extract_triples(v, path + '[' + str(i) + ']', results)

triples = []
extract_triples(draft, 'root', triples)
for t in triples:
    print('---')
    print('PATH:', t['path'])
    print('RU :', t['ru'])
    print('UK :', t['uk'])
    print('ES :', t['es'])

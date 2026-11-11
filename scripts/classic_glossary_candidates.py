# Кандидаты в словарь классики: все слова из верных ответов фраз, которых нет в glossary.json (владелец 05.11: «все слова из фраз должны быть в словаре»).
# Запуск ТОЛЬКО из venv: C:\Users\badlo\Documents\LocalAI\nlp-venv\Scripts\python.exe -I scripts/classic_glossary_candidates.py
# Результат: docs/work/classic_glossary_candidates/<lang>.json — [{lemma, pos, forms[], firstLesson, phraseIds[], example{id,target,ru,uk}}], без ru/uk переводов леммы (их дописывают позже).
import json, io, os, sys, re, collections
import spacy
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SIZE = os.environ.get('SPACY_SIZE', 'md')
OUT = os.path.join(ROOT, 'docs', 'work', 'classic_glossary_candidates'); os.makedirs(OUT, exist_ok=True)
norm = lambda t: re.sub(r"[.,!?;:¿¡«»\"]", '', t.lower())
for lang in ['en', 'es', 'fr', 'de', 'it']:
    nlp = spacy.load(f'{lang}_core_{"web" if lang=="en" else "news"}_{SIZE}', disable=['parser', 'ner'])
    gl = json.load(io.open(os.path.join(ROOT, 'modules', 'classic-courses', lang, 'glossary.json'), encoding='utf-8'))['lemmas']
    have = {norm(e['lemma']) for e in gl}
    phrases = []
    for n in range(1, 33):
        phrases += json.load(io.open(os.path.join(ROOT, 'modules', 'classic-courses', lang, f'lessons-{n:02d}.json'), encoding='utf-8'))['phrases']
    # лемматизация в контексте фразы
    docs = list(nlp.pipe([' '.join(t['correct'] for t in p['tiles']) for p in phrases], batch_size=512))
    cand = collections.OrderedDict()
    for p, doc in zip(phrases, docs):
        lesson = int(re.search(r'(\d\d)[.:]\d\d$', p['id']).group(1))
        for tok in doc:
            if tok.is_punct or tok.is_space: continue
            lem = tok.lemma_.lower().strip()
            if not lem or not re.match(r"^[\w'’-]+$", lem): continue
            key = lem
            c = cand.setdefault(key, {'lemma': lem, 'pos': collections.Counter(), 'forms': collections.Counter(), 'firstLesson': lesson, 'phraseIds': []})
            c['pos'][tok.pos_] += 1; c['forms'][tok.text.lower()] += 1
            c['firstLesson'] = min(c['firstLesson'], lesson)
            if p['id'] not in c['phraseIds']: c['phraseIds'].append(p['id'])
    byid = {p['id']: p for p in phrases}
    out = []
    for c in cand.values():
        covered = c['lemma'] in have or any(f in have for f in c['forms'])
        if covered: continue
        ex = byid[c['phraseIds'][0]]
        out.append({'lemma': c['lemma'], 'pos': c['pos'].most_common(1)[0][0], 'forms': sorted(c['forms']), 'firstLesson': c['firstLesson'], 'phraseIds': c['phraseIds'],
                    'example': {'id': ex['id'], 'target': ex['target'], 'ru': ex['sourceLocales']['ru'], 'uk': ex['sourceLocales']['uk']}})
    out.sort(key=lambda x: (x['firstLesson'], x['lemma']))
    json.dump(out, io.open(os.path.join(OUT, f'{lang}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(lang, 'в словаре', len(have), 'кандидатов', len(out), flush=True)

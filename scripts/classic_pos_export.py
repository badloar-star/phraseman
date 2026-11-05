# Экспорт грамматических классов (spaCy, офлайн) для генератора соблазнов: класс верной плитки в контексте фразы и класс слова в изоляции.
# Запуск ТОЛЬКО из venv: C:\Users\badlo\Documents\LocalAI\nlp-venv\Scripts\python.exe -I scripts/classic_pos_export.py
# Правило согласования с локальным валидатором check_distractors.py: соблазн не помечается pos_mismatch, если класс слова в изоляции ∩ класс верной плитки ≠ ∅.
import json, io, os, sys, re
import spacy
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SIZE = os.environ.get('SPACY_SIZE', 'md')
MODELS = {l: f'{l}_core_{"web" if l=="en" else "news"}_{SIZE}' for l in ['en', 'es', 'fr', 'de', 'it']}
CLASS = {'VERB': 'V', 'AUX': 'V', 'NOUN': 'N', 'PROPN': 'N', 'ADJ': 'A', 'ADV': 'D', 'DET': 'P', 'PRON': 'P', 'ADP': 'ADP', 'NUM': 'NUM', 'CCONJ': 'CONJ', 'SCONJ': 'CONJ', 'PART': 'PART', 'INTJ': 'INTJ'}
CLASS_DE = dict(CLASS, ADV='A')
def build(words, fp):
    s, spans = '', []
    for i, w in enumerate(words):
        if i: s += ' '
        spans.append((len(s), len(s) + len(w))); s += w
    return s + fp, spans
def toks(doc, a, b): return [t for t in doc if t.idx < b and t.idx + len(t.text) > a and not t.is_punct]
out = {}
for lang in ['en', 'es', 'fr', 'de', 'it']:
    nlp = spacy.load(MODELS[lang], disable=['parser', 'ner']); cmap = CLASS_DE if lang == 'de' else CLASS
    phrases = []
    for n in range(1, 33):
        phrases += json.load(io.open(os.path.join(ROOT, 'modules', 'classic-courses', lang, f'lessons-{n:02d}.json'), encoding='utf-8'))['phrases']
    texts, spans_l = [], []
    for p in phrases:
        words = [t['correct'] for t in p['tiles']]
        fp = p['target'].strip()[-1:] if p['target'].strip()[-1:] in '.?!' else ''
        s, sp = build(words, fp); texts.append(s); spans_l.append(sp)
    tiles = {}
    for p, doc, sp in zip(phrases, nlp.pipe(texts, batch_size=512), spans_l):
        tiles[p['id']] = [sorted({cmap.get(t.pos_, '?') for t in toks(doc, a, b)} - {'?'}) for a, b in sp]
    words = set()
    for p in phrases:
        for t in p['tiles']:
            words.add(t['correct']); words.update(t['distractors'])
    allw = set()
    for w in words:
        allw.add(w); allw.add(w[:1].upper() + w[1:]); allw.add(w[:1].lower() + w[1:])
    allw = sorted(allw)
    iso = {}
    for w, d in zip(allw, nlp.pipe(allw, batch_size=1024)):
        iso[w] = sorted({cmap.get(t.pos_, '?') for t in d if not t.is_punct} - {'?'})
    out[lang] = {'tiles': tiles, 'iso': iso}
    print(lang, len(tiles), len(iso), flush=True)
json.dump(out, io.open(os.path.join(ROOT, 'scripts', 'classic_pos_lexicon.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

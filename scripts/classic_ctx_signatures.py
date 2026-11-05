# Контекстные «подписи» слов для генератора соблазнов классических курсов (Работник А, 05.11.2026).
#
# зачем (решение владельца 05.11, OWNER_DECISIONS_2026-11-05_QA.md): соблазн — та же часть речи и та же форма, что верная плитка,
# правдоподобная ошибка, только язык курса. Прежняя проверка (classic_pos_export.py) брала класс слова В ИЗОЛЯЦИИ — spaCy там
# ошибается («Achetait» = сущ.), и пересечение классов пропускало «regardons» на месте «ne», «gare» на месте «en», «baby» в немецком.
# Здесь всё разбирается В КОНТЕКСТЕ фразы:
#   tiles — подпись верной плитки в своей фразе: «класс/VerbForm» (V/Fin, V/Inf, V/Part, N/, A/, D/, NOM/ = DET|PRON, ADP/, CONJ/ …);
#   words — какие подписи слово получало в курсе: как верная плитка (сильный сигнал) или, если верным оно не бывает, как соблазн,
#           подставленный на свою позицию (большинство разборов);
#   bans  — точечно: соблазн, подставленный на позицию, разбирается не той подписью, что верная плитка («LL:NN#i» → [слова]).
# Генератор (classic_course_pack.mjs, правило ctxPos) пускает кандидата, только если подпись плитки входит в подписи слова.
# Запуск ТОЛЬКО из venv (нужен slot светофора — это тяжёлый разбор ~10 с на язык × 5):
#   C:/Users/badlo/Documents/LocalAI/nlp-venv/Scripts/python.exe -I scripts/classic_ctx_signatures.py [--src <dir modules/classic-courses>]
import json, io, os, re, sys, collections
import spacy
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[sys.argv.index('--src') + 1] if '--src' in sys.argv else os.path.join(ROOT, 'modules', 'classic-courses')
OUT = os.path.join(ROOT, 'scripts', 'classic_ctx_signatures.json')
COARSE = {'VERB': 'V', 'AUX': 'V', 'NOUN': 'N', 'PROPN': 'N', 'ADJ': 'A', 'ADV': 'D', 'DET': 'NOM', 'PRON': 'NOM', 'ADP': 'ADP',
          'NUM': 'NUM', 'CCONJ': 'CONJ', 'SCONJ': 'CONJ', 'PART': 'PART', 'INTJ': 'INTJ'}
# зачем: DET и PRON — один класс (ce/ces, mon/le mien, das/dem ученик путает законно); различаем только у глаголов форму VerbForm
FUNC = ('ADP', 'DET', 'PRON')

def build(words, fp):
    s, spans = '', []
    for i, w in enumerate(words):
        if i and not words[i - 1].endswith(('’', "'")): s += ' '
        spans.append((len(s), len(s) + len(w))); s += w
    return s + fp, spans

def sig(doc, a, b):
    ts = [t for t in doc if t.idx < b and t.idx + len(t.text) > a and not t.is_punct]
    if not ts: return None
    # плитка из двух токенов (l’eau, qu’il, avez-vous, zum): основным считаем содержательный токен, а не служебную приставку
    t = ts[-1] if len(ts) > 1 and ts[0].pos_ in FUNC and ts[-1].pos_ not in FUNC else ts[0]
    c = COARSE.get(t.pos_)
    if not c: return None
    vf = t.morph.get('VerbForm') if c == 'V' else []
    return f"{c}/{vf[0] if vf else ''}"

def lower(w): return w.lower()

# зачем (Координатор 05.11): --langs es,fr,de,it — пересчитать только эти курсы; остальные части файла (en, уже выверенный Ревизором) не трогать
LANGS = sys.argv[sys.argv.index('--langs') + 1].split(',') if '--langs' in sys.argv else ['en', 'es', 'fr', 'de', 'it']
out = json.load(io.open(OUT, encoding='utf-8')) if '--langs' in sys.argv and os.path.exists(OUT) else {}
for lang in LANGS:
    nlp = spacy.load(f'{lang}_core_{"web" if lang == "en" else "news"}_md', disable=['ner'])
    phrases = []
    for n in range(1, 33):
        phrases += json.load(io.open(os.path.join(SRC, lang, f'lessons-{n:02d}.json'), encoding='utf-8'))['phrases']
    texts, jobs = [], []
    for pi, p in enumerate(phrases):
        words = [t['correct'] for t in p['tiles']]
        fp = p['target'].strip()[-1:] if p['target'].strip()[-1:] in '.?!' else ''
        s, sp = build(words, fp); texts.append(s); jobs.append((pi, -1, None, sp))
        for ti, t in enumerate(p['tiles']):
            for d in t['distractors']:
                w2 = list(words); w2[ti] = d
                s2, sp2 = build(w2, fp); texts.append(s2); jobs.append((pi, ti, d, sp2))
    tiles, bans = {}, collections.defaultdict(list)
    strong = collections.defaultdict(collections.Counter)  # слово → подписи как верной плитки
    weak = collections.defaultdict(collections.Counter)    # слово → подписи как подставленного соблазна
    for (pi, ti, d, sp), doc in zip(jobs, nlp.pipe(texts, batch_size=1024)):
        p = phrases[pi]
        if ti < 0:
            sg = [sig(doc, a, b) for a, b in sp]
            tiles[p['id']] = sg
            for t, s in zip(p['tiles'], sg):
                if s: strong[lower(t['correct'])][s] += 1
            continue
        s = sig(doc, *sp[ti])
        if not s: continue
        weak[lower(d)][s] += 1
        c = tiles[p['id']][ti]
        if c and c != s:
            m = re.search(r'(\d\d)[.:](\d\d)$', p['id'])  # тот же ключ «LL:NN», что phraseNumbers() генератора (en-classic-r1:18.32 → 18:32)
            bans[f"{m[1]}:{m[2]}#{ti}"].append(d)
    words = {}
    for w in set(strong) | set(weak):
        if strong.get(w):
            words[w] = sorted(strong[w])  # все подписи, в которых слово реально стоит верным в курсе
        else:
            top = weak[w].most_common()
            best = top[0][1]
            words[w] = sorted(s for s, n in top if n * 3 >= best)  # подписи, набравшие ≥ трети голосов лидера
    out[lang] = {'tiles': {k: v for k, v in tiles.items()}, 'words': words, 'bans': dict(bans)}
    print(f'[CTX-SIG] {lang}: фраз {len(tiles)}, слов {len(words)}, точечных запретов {sum(len(v) for v in bans.values())}', flush=True)
json.dump(out, io.open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
print('[CTX-SIG] записано', OUT)

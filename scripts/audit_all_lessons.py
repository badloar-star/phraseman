#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Full linguistic audit of all 32 lessons in PhraseMan.
Oxford/Cambridge EFL methodology, CEFR A1->C1 standards.
"""
import re, sys, os
sys.stdout.reconfigure(encoding='utf-8')

files = {
    '1_8':   'c:/appsprojects/phraseman/app/lesson_data_1_8.ts',
    '9_16':  'c:/appsprojects/phraseman/app/lesson_data_9_16.ts',
    '17_24': 'c:/appsprojects/phraseman/app/lesson_data_17_24.ts',
    '25_32': 'c:/appsprojects/phraseman/app/lesson_data_25_32.ts',
}
src = {}
for k,p in files.items():
    with open(p,'r',encoding='utf-8') as f:
        src[k]=f.read()

def extract_block(text, start_idx):
    depth=1; i=start_idx
    while i<len(text) and depth>0:
        if text[i]=='[': depth+=1
        elif text[i]==']': depth-=1
        i+=1
    return text[start_idx:i-1]

eng_pat = re.compile(r"english:\s*['\"`]([^'\"`\n]+)['\"`]")

lesson_phrases, lesson_vocab, lesson_irreg = {}, {}, {}

for text in src.values():
    for m in re.finditer(r'LESSON_(\d+)_PHRASES\s*(?::[^=]*)?\s*=\s*\[', text):
        ln = int(m.group(1))
        block = extract_block(text, m.end())
        lesson_phrases[ln] = eng_pat.findall(block)

    for m in re.finditer(r'LESSON_(\d+)_VOCABULARY\s*(?::[^=]*)?\s*=\s*\[', text):
        ln = int(m.group(1))
        block = extract_block(text, m.end())
        lesson_vocab[ln] = eng_pat.findall(block)

    past_pat = re.compile(
        r"english:\s*['\"]([^'\"]+)['\"].*?past:\s*['\"]([^'\"]+)['\"].*?pastParticiple:\s*['\"]([^'\"]+)['\"]",
        re.DOTALL)
    for m in re.finditer(r'LESSON_(\d+)_IRREGULAR_VERBS\s*(?::[^=]*)?\s*=\s*\[', text):
        ln = int(m.group(1))
        block = extract_block(text, m.end())
        lesson_irreg[ln] = [(a,b,c) for a,b,c in past_pat.findall(block)]

LESSON_TOPICS = {
    1:  "To Be (am/is/are) — Утверждения",
    2:  "To Be — Отрицание и вопросы",
    3:  "Present Simple — Утверждения",
    4:  "Present Simple — Отрицание (don't/doesn't)",
    5:  "Present Simple — Вопросы (Do/Does?)",
    6:  "Специальные вопросы (What/Where/Who...)",
    7:  "Глагол To Have (have/has)",
    8:  "Предлоги времени (in/on/at)",
    9:  "There is / There are",
    10: "Модальные глаголы (can/must)",
    11: "Past Simple — Правильные глаголы (-ed)",
    12: "Past Simple — Неправильные глаголы",
    13: "Future Simple (will)",
    14: "Степени сравнения (more/most/-er/-est)",
    15: "Притяжательные местоимения (my/your/his...)",
    16: "Фразовые глаголы (phrasal verbs)",
    17: "Present Continuous (am/is/are + -ing)",
    18: "Повелительное наклонение (Imperative)",
    19: "Предлоги места",
    20: "Артикли (a/an/the)",
    21: "Неопределённые местоимения (some/any/no/every)",
    22: "Герундий (Verb + -ing)",
    23: "Пассивный залог (Passive Voice)",
    24: "Present Perfect (have/has + done)",
    25: "Past Continuous (was/were + -ing)",
    26: "Условные предложения (Conditionals)",
    27: "Косвенная речь (Reported Speech)",
    28: "Возвратные местоимения (myself/yourself...)",
    29: "Used to",
    30: "Relative Clauses (who/which/that/where)",
    31: "Complex Object (want you to...)",
    32: "Финальное повторение",
}

STOPWORDS = {
    'the','a','an','is','are','am','was','were','be','been','being',
    'i','you','he','she','it','we','they','me','him','her','us','them',
    'my','your','his','its','our','their','this','that','these','those',
    'do','does','did','not','and','or','but','in','on','at','to','for',
    'of','with','by','from','if','as','so','then','than','when','where',
    'what','who','how','why','will','would','can','could','should','may',
    'might','must','shall','have','has','had','get','got'
}

all_words_seen = set()
results = []

for ln in range(1, 33):
    phrases = lesson_phrases.get(ln, [])
    vocab = lesson_vocab.get(ln, [])
    irreg = lesson_irreg.get(ln, [])

    all_tokens = set()
    for ph in phrases:
        for t in re.findall(r"\b[a-zA-Z']+\b", ph.lower()):
            t = t.strip("'")
            if t not in STOPWORDS and len(t) > 2:
                all_tokens.add(t)

    new_words = all_tokens - all_words_seen
    vocab_lower = {v.lower() for v in vocab}
    irreg_base = {v[0].lower() for v in irreg}

    in_phrases_not_vocab = sorted(w for w in new_words
                                  if vocab and w not in vocab_lower and w not in STOPWORDS)

    all_words_seen |= all_tokens

    results.append({
        'ln': ln,
        'topic': LESSON_TOPICS.get(ln, '—'),
        'phrase_count': len(phrases),
        'vocab_count': len(vocab),
        'irreg_count': len(irreg),
        'new_words': len(new_words),
        'phrases': phrases,
        'vocab': vocab,
        'irreg': irreg,
        'in_phrases_not_vocab': in_phrases_not_vocab,
        'new_words_list': sorted(new_words),
    })

# ── Topic keyword coverage analysis ───────────────────────────────────────
TOPIC_KEYWORDS = {
    1: ['am','is','are'],
    2: ["isn't","aren't","not","is ","are "],
    3: ['work','speak','live','love','eat','buy','drink','cook','watch','drive'],
    4: ["don't","doesn't"],
    5: ['do ','does '],
    6: ['what','where','how','who','why','when','which'],
    7: ['have','has'],
    8: ['january','february','march','morning','evening','night','summer','winter','monday'],
    9: ['there is','there are'],
    10: ['can','must'],
    11: ['ed ','yesterday','last week','last year'],
    12: ['went','came','saw','took','gave','made','said','got','found','knew','bought'],
    13: ['will'],
    14: ['more','most','than','better','worse','best','worst'],
    15: ['my','your','his','her','our','their','mine','yours'],
    16: ['get up','turn on','turn off','look for','give up','find out','come back','put on'],
    17: ['ing','am ','is ','are '],
    18: ['please','do not','stop','start','open','close','turn','bring'],
    19: ['next to','under','behind','above','between','in front','opposite','near'],
    20: [' the ',' a ',' an '],
    21: ['someone','something','anyone','anything','nobody','nothing','everywhere','somewhere'],
    22: ['enjoy','avoid','finish','start','love','hate','keep','suggest'],
    23: ['is built','is made','was written','are grown','is used','was found'],
    24: ['have visited','has done','have never','has been','have just'],
    25: ['was reading','were working','was sleeping','were travelling'],
    26: ['if','would','unless','provided'],
    27: ['said that','told','asked','thought that','explained that'],
    28: ['myself','yourself','himself','herself','itself','ourselves','themselves'],
    29: ['used to'],
    30: ['who','which','that','where','whose'],
    31: ['want you to','expect','ask you to','make you','let you'],
    32: [],
}

def assess_lesson(r):
    ln = r['ln']
    phrases = r['phrases']
    ph = r['phrase_count']
    vo = r['vocab_count']
    ir = r['irreg_count']
    nw = r['new_words']
    vocab = r['vocab']
    irreg = r['irreg']
    issues = []
    recs = []

    # ── SCORE 1: Объём (Quantity) ─────────────────────────────────────────
    if ph == 50: s_vol = 10
    elif 40 <= ph < 50: s_vol = 8
    elif 30 <= ph < 40: s_vol = 6
    elif ph > 0: s_vol = 4
    else: s_vol = 0

    # ── SCORE 2: Покрытие темы (Topic coverage in phrases) ────────────────
    kws = TOPIC_KEYWORDS.get(ln, [])
    if not phrases:
        s_topic = 0
    elif not kws:
        s_topic = 7  # final revision — can't strictly measure
    else:
        matches = sum(1 for p in phrases if any(kw.lower() in p.lower() for kw in kws))
        ratio = matches / len(phrases)
        if ratio > 0.85: s_topic = 10
        elif ratio > 0.65: s_topic = 8
        elif ratio > 0.45: s_topic = 6
        elif ratio > 0.2: s_topic = 4
        else: s_topic = 2

    # ── SCORE 3: Словарный раздел ─────────────────────────────────────────
    if vo >= 80: s_vocab = 10
    elif vo >= 50: s_vocab = 8
    elif vo >= 20: s_vocab = 6
    elif vo > 0: s_vocab = 4
    else: s_vocab = 0

    if vo == 0 and ln <= 12:
        issues.append("Раздел СЛОВАРЬ отсутствует (уроки 1-12 должны иметь словарь)")
        recs.append("Добавить раздел VOCABULARY с ключевыми словами урока")
    if r['in_phrases_not_vocab']:
        top_missing = r['in_phrases_not_vocab'][:8]
        issues.append(f"Слова в фразах, но не в словаре: {', '.join(top_missing)}")

    # ── SCORE 4: Неправильные глаголы ────────────────────────────────────
    IRREG_NEEDED = {11, 12, 13, 23, 24, 25}
    IRREG_USEFUL = {4, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 26, 27, 28, 29, 30, 31}
    if ir >= 15: s_irreg = 10
    elif ir >= 10: s_irreg = 8
    elif ir >= 5: s_irreg = 6
    elif ir > 0: s_irreg = 4
    else:
        if ln in IRREG_NEEDED:
            s_irreg = 1
            issues.append(f"КРИТИЧНО: Раздел неправ. глаголов пуст, а тема ({LESSON_TOPICS[ln]}) требует их!")
            recs.append("Добавить 15-20 неправильных глаголов с формами")
        elif ln in IRREG_USEFUL:
            s_irreg = 3
            issues.append("Раздел неправ. глаголов отсутствует (рекомендуется)")
        else:
            s_irreg = 7  # Not applicable (L1-3 early lessons)

    # ── SCORE 5: Прогрессия (новые слова за раз) ────────────────────────
    if nw <= 20: s_prog = 10
    elif nw <= 35: s_prog = 9
    elif nw <= 55: s_prog = 7
    elif nw <= 80: s_prog = 5
    elif nw <= 120: s_prog = 3
    else: s_prog = 1

    if nw > 80:
        issues.append(f"Перегруз: {nw} новых слов за один урок (рекомендуется ≤35)")
        recs.append(f"Сократить количество новых слов до 30-40. Перенести менее частотные в следующий урок.")

    # ── SCORE 6: Разнообразие структур (структурное разнообразие фраз) ──
    if not phrases:
        s_diversity = 0
    else:
        starters = [p.split()[0].lower() if p else '' for p in phrases]
        unique_starters = len(set(starters))
        ratio = unique_starters / len(phrases)
        subjects = ['i','you','he','she','it','we','they']
        subj_coverage = len(set(s for s in starters if s in subjects))
        lengths = [len(p.split()) for p in phrases]
        avg_len = sum(lengths)/len(lengths)
        variety = ratio * 5 + (subj_coverage/7)*3 + (min(avg_len,8)/8)*2
        s_diversity = min(10, round(variety*10/10, 1))

    # ── OVERALL ──────────────────────────────────────────────────────────
    weights = {'vol':2, 'topic':3, 'vocab':2, 'irreg':1, 'prog':2, 'diversity':1}
    scores = {
        'volume': s_vol, 'topic': s_topic, 'vocab': s_vocab,
        'irreg': s_irreg, 'progression': s_prog, 'diversity': round(s_diversity,1)
    }
    w_vals = [weights['vol'], weights['topic'], weights['vocab'],
              weights['irreg'], weights['prog'], weights['diversity']]
    s_vals = [s_vol, s_topic, s_vocab, s_irreg, s_prog, s_diversity]
    overall = sum(a*b for a,b in zip(s_vals, w_vals)) / sum(w_vals)
    scores['overall'] = round(overall, 1)

    return scores, issues, recs

# ── RUN ASSESSMENT ─────────────────────────────────────────────────────────

print("=" * 110)
print("   ЛИНГВИСТИЧЕСКИЙ АУДИТ PHRASEMAN — 32 УРОКА")
print("   Критерии: объём · покрытие темы · словарь · неправ. глаголы · прогрессия · разнообразие структур")
print("=" * 110)
print()
print(f"{'L':>3} {'Тема':42} {'Фраз':>5} {'Слов':>5} {'Irreg':>5} | {'Объём':>5} {'Тема':>5} {'Слов':>5} {'Irg':>4} {'Прог':>5} {'Разн':>5} | {'ИТОГ':>5}")
print("-" * 110)

all_results = []
for r in results:
    scores, issues, recs = assess_lesson(r)
    all_results.append((r, scores, issues, recs))
    ln = r['ln']
    t = r['topic'][:42]
    print(f"L{ln:2d} {t:42} {r['phrase_count']:5} {r['vocab_count']:5} {r['irreg_count']:5} |"
          f" {scores['volume']:5.1f} {scores['topic']:5.1f} {scores['vocab']:5.1f} {scores['irreg']:4.1f}"
          f" {scores['progression']:5.1f} {scores['diversity']:5.1f} | {scores['overall']:5.1f}")

avg = sum(r[1]['overall'] for r in all_results) / len(all_results)
print("-" * 110)
print(f"{'СРЕДНЕЕ':>55} {avg:47.1f}")

# ── DETAILED REPORTS PER LESSON ────────────────────────────────────────────
print()
print("=" * 110)
print("   ДЕТАЛЬНЫЕ ОТЧЁТЫ ПО КАЖДОМУ УРОКУ")
print("=" * 110)

for r, scores, issues, recs in all_results:
    ln = r['ln']
    print()
    print(f"{'─'*110}")
    print(f" УРОК {ln}: {r['topic']}")
    print(f"{'─'*110}")
    print(f" Фраз: {r['phrase_count']}  |  Слов в словаре: {r['vocab_count']}  |  Неправ. глаголов: {r['irreg_count']}  |  Новых слов: {r['new_words']}")
    print(f" ИТОГОВАЯ ОЦЕНКА: {scores['overall']}/10  |  Объём:{scores['volume']}  Тема:{scores['topic']}  Слов:{scores['vocab']}  Irreg:{scores['irreg']}  Прогр:{scores['progression']}  Разн:{scores['diversity']}")
    print()

    # Sample phrases
    if r['phrases']:
        print(" ПРИМЕРЫ ФРАЗ (первые 8):")
        for i, ph in enumerate(r['phrases'][:8], 1):
            print(f"   {i:2}. {ph}")
    else:
        print(" ФРАЗЫ: ОТСУТСТВУЮТ")

    # Vocabulary sample
    if r['vocab']:
        print(f"\n СЛОВАРЬ ({r['vocab_count']} слов, первые 15): {', '.join(r['vocab'][:15])}")
    else:
        print("\n СЛОВАРЬ: отсутствует")

    # Irreg verbs
    if r['irreg']:
        print(f"\n НЕПРАВИЛЬНЫЕ ГЛАГОЛЫ ({r['irreg_count']}):")
        for base, past, pp in r['irreg'][:10]:
            print(f"   {base:15} → {past:15} → {pp}")
        if r['irreg_count'] > 10:
            print(f"   ... и ещё {r['irreg_count']-10}")

    # Specific analysis
    print(f"\n АНАЛИЗ:")

    # Check duplicate phrases
    seen_ph = {}
    dups = []
    for ph in r['phrases']:
        ph_low = ph.lower().strip()
        if ph_low in seen_ph:
            dups.append(ph)
        seen_ph[ph_low] = True
    if dups:
        print(f"   ⚠️  Дубликаты фраз: {dups}")
    else:
        print(f"   ✅ Дубликатов фраз нет")

    # Subject variety
    if r['phrases']:
        starters = [ph.split()[0].lower() if ph else '' for ph in r['phrases']]
        from collections import Counter
        s_count = Counter(starters)
        print(f"   Подлежащие: {dict(s_count.most_common(8))}")

    # Missing critical structures for the topic
    if ln == 3:
        present_simple_verbs = ['say','tell','think','make','need','play','run','give','take','go']
        missing = [v for v in present_simple_verbs
                   if not any(v in ph.lower().split() for ph in r['phrases'])]
        if missing:
            print(f"   ⚠️  Высокочастотные глаголы Present Simple отсутствуют в фразах: {missing}")
            recs.append(f"Добавить фразы с: {', '.join(missing[:5])}")

    if ln == 10:
        go_present = any('go' in ph.lower().split() or 'goes' in ph.lower().split()
                         for ph in r['phrases'])
        need_present = any('need' in ph.lower().split() for ph in r['phrases'])
        think_present = any('think' in ph.lower().split() for ph in r['phrases'])
        if not go_present:
            print("   ❌ Глагол GO с модальными отсутствует (You can go / We must go)")
            recs.append("Добавить: You can go now. / We must go. / She can go home. / They must not go there.")
        if not need_present:
            print("   ⚠️  NEED как модальный отсутствует")
        if not think_present:
            print("   ⚠️  Глагол THINK отсутствует")

    if ln in [11, 12]:
        if r['irreg_count'] == 0:
            print("   ❌ КРИТИЧНО: Past Simple урок без неправильных глаголов!")

    if ln == 13:
        neg_will = sum(1 for ph in r['phrases'] if "won't" in ph.lower() or "will not" in ph.lower())
        q_will = sum(1 for ph in r['phrases'] if ph.strip().startswith('Will') or ph.strip().startswith('will'))
        print(f"   Will-отрицания: {neg_will}  |  Will-вопросы: {q_will}")
        if neg_will < 5:
            issues.append("Мало фраз с will not/won't")
            recs.append("Добавить 8-10 фраз с отрицанием won't и вопросами Will...?")

    if ln == 16:
        phrasal_verbs_found = set()
        pv_list = ['get up','turn on','turn off','look for','give up','find out',
                   'come back','put on','take off','go on','pick up','set up',
                   'carry on','look up','bring up','run out','break down','look after']
        for ph in r['phrases']:
            for pv in pv_list:
                if pv in ph.lower():
                    phrasal_verbs_found.add(pv)
        print(f"   Фразовых глаголов покрыто: {len(phrasal_verbs_found)}/18: {sorted(phrasal_verbs_found)}")
        missing_pv = [pv for pv in pv_list if pv not in phrasal_verbs_found]
        if missing_pv:
            recs.append(f"Добавить фразовые глаголы: {', '.join(missing_pv[:6])}")

    if ln == 26:
        cond_types = {
            'type1': sum(1 for ph in r['phrases'] if 'if' in ph.lower() and 'will' in ph.lower()),
            'type2': sum(1 for ph in r['phrases'] if 'if' in ph.lower() and 'would' in ph.lower()),
            'type3': sum(1 for ph in r['phrases'] if 'if' in ph.lower() and 'had' in ph.lower()),
        }
        print(f"   Условные типы: Type 1(if+will)={cond_types['type1']}  Type 2(if+would)={cond_types['type2']}  Type 3(if+had)={cond_types['type3']}")
        if cond_types['type1'] + cond_types['type2'] < 20:
            issues.append("Мало примеров условных предложений")

    # Issues and recommendations
    if issues:
        print(f"\n ПРОБЛЕМЫ:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print(f"\n ПРОБЛЕМЫ: не выявлено")

    if recs:
        print(f"\n РЕКОМЕНДАЦИИ:")
        for rec in recs:
            print(f"   → {rec}")

# ── GLOBAL SUMMARY ─────────────────────────────────────────────────────────
print()
print("=" * 110)
print("   СИСТЕМНЫЕ ВЫВОДЫ ПО ВСЕМУ КУРСУ")
print("=" * 110)

# Global verb coverage
print("\n1. ПОКРЫТИЕ ТОПОВЫХ АНГЛИЙСКИХ ГЛАГОЛОВ (Oxford 3000):")
TOP_VERBS = ['go','say','tell','think','make','need','give','know','see','come',
             'take','find','want','use','work','feel','keep','try','look','help',
             'run','play','live','believe','write','read','hear','speak','buy',
             'drive','cook','watch','eat','drink','teach','learn','start','stop',
             'begin','finish','open','close','turn','send','call','meet','pay',
             'spend','ask','get','put','bring','show','move','break','win','grow']

all_combined = ' '.join([' '.join(r['phrases']) for r in results if r['phrases']]).lower()
print(f"   {'Глагол':15} {'Встречается':15} {'Урок введения':15}")
first_seen_global = {}
for ln_n in range(1, 33):
    r = results[ln_n-1]
    for ph in r['phrases']:
        for w in ph.lower().split():
            w = re.sub(r"[^a-z']", '', w).strip("'")
            if w in TOP_VERBS and w not in first_seen_global:
                first_seen_global[w] = ln_n

never_seen = []
for v in TOP_VERBS:
    fs = first_seen_global.get(v)
    if fs:
        count = all_combined.count(f' {v} ') + all_combined.count(f' {v}s ') + all_combined.count(f' {v}ed ')
        status = 'ПОЗДНО(L16+)' if fs >= 16 else ('OK' if fs <= 10 else f'L{fs}')
        print(f"   {v:15} L{fs:2d} ({count:3d} раз) {status}")
    else:
        never_seen.append(v)

if never_seen:
    print(f"\n   ❌ НИКОГДА не появляются в курсе ({len(never_seen)} глаголов):")
    print(f"   {', '.join(never_seen)}")

# Lessons with no vocabulary section
print("\n2. УРОКИ БЕЗ РАЗДЕЛА 'СЛОВАРЬ':")
no_vocab = [r['ln'] for r in results if r['vocab_count'] == 0]
print(f"   {no_vocab}")
print(f"   Это {len(no_vocab)} из 32 уроков — {round(len(no_vocab)/32*100)}% курса без словарного раздела")

# Lessons with no irregular verbs
print("\n3. УРОКИ БЕЗ РАЗДЕЛА 'НЕПРАВИЛЬНЫЕ ГЛАГОЛЫ':")
no_irreg = [r['ln'] for r in results if r['irreg_count'] == 0]
print(f"   {no_irreg}")

# Top/bottom lessons
sorted_by_score = sorted(all_results, key=lambda x: x[1]['overall'], reverse=True)
print("\n4. ТОП-5 ЛУЧШИХ УРОКОВ:")
for r, s, _, _ in sorted_by_score[:5]:
    print(f"   L{r['ln']:2d} {r['topic']:45} — {s['overall']}/10")

print("\n5. ТОП-5 ПРОБЛЕМНЫХ УРОКОВ:")
for r, s, _, _ in sorted_by_score[-5:]:
    print(f"   L{r['ln']:2d} {r['topic']:45} — {s['overall']}/10")

print("\n6. ОБЩАЯ ОЦЕНКА КУРСА:")
overall_avg = sum(r[1]['overall'] for r in all_results) / len(all_results)
ph_total = sum(r[0]['phrase_count'] for r in all_results)
vocab_total = sum(r[0]['vocab_count'] for r in all_results)
irreg_total = sum(r[0]['irreg_count'] for r in all_results)
print(f"   Средняя оценка: {overall_avg:.1f}/10")
print(f"   Всего фраз: {ph_total}  |  Всего слов в словарях: {vocab_total}  |  Всего неправ. глаголов: {irreg_total}")
print(f"   Уроков с полным набором (фразы+словарь+irreg): {sum(1 for r in all_results if r[0]['phrase_count']>0 and r[0]['vocab_count']>0 and r[0]['irreg_count']>0)}/32")

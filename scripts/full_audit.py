#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ПОЛНЫЙ АУДИТ ВСЕХ 32 УРОКОВ PHRASEMAN
Читает все три источника данных:
  1. lesson_data_*.ts          — фразы
  2. app/lesson_words.tsx      — словарь (WORDS_BY_LESSON)
  3. app/irregular_verbs_data.ts — неправильные глаголы (IRREGULAR_VERBS_BY_LESSON)
"""
import re, sys, os
sys.stdout.reconfigure(encoding='utf-8')

ROOT = 'c:/appsprojects/phraseman/app'

# ═══════════════════════════════════════════════════════════════════
#  1. ЗАГРУЗКА ДАННЫХ
# ═══════════════════════════════════════════════════════════════════

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

phrase_files = [
    f'{ROOT}/lesson_data_1_8.ts',
    f'{ROOT}/lesson_data_9_16.ts',
    f'{ROOT}/lesson_data_17_24.ts',
    f'{ROOT}/lesson_data_25_32.ts',
]
words_file  = f'{ROOT}/lesson_words.tsx'
irreg_file  = f'{ROOT}/irregular_verbs_data.ts'

all_phrase_src = '\n'.join(read(f) for f in phrase_files)
words_src      = read(words_file)
irreg_src      = read(irreg_file)

def extract_block(text, pos):
    """Извлекает содержимое массива начиная с pos (после '[')."""
    depth = 1; i = pos
    while i < len(text) and depth > 0:
        if text[i] == '[': depth += 1
        elif text[i] == ']': depth -= 1
        i += 1
    return text[pos:i-1]

# ── Фразы ─────────────────────────────────────────────────────────
lesson_phrases = {}  # {ln: [english_str, ...]}
en_pat = re.compile(r"english:\s*['\"`]([^'\"`\n]+)['\"`]")

for m in re.finditer(r'LESSON_(\d+)_PHRASES\s*(?::[^=]*)?\s*=\s*\[', all_phrase_src):
    ln = int(m.group(1))
    block = extract_block(all_phrase_src, m.end())
    lesson_phrases[ln] = en_pat.findall(block)

# ── Словарь (lesson_words.tsx) ─────────────────────────────────────
lesson_words = {}   # {ln: [{en, ru, uk, pos}, ...]}
w_start = words_src.index('const WORDS_BY_LESSON')
lesson_block_pat = re.compile(r'^\s*(\d+):\s*\[', re.MULTILINE)
w_matches = list(lesson_block_pat.finditer(words_src, w_start))

for i, m in enumerate(w_matches):
    ln = int(m.group(1))
    end = w_matches[i+1].start() if i+1 < len(w_matches) else words_src.index('};', m.start())
    block = words_src[m.end():end]
    entries = []
    for wm in re.finditer(
        r"en:\s*'([^']+)'.*?ru:\s*'([^']+)'.*?uk:\s*'([^']+)'.*?pos:\s*'([^']+)'",
        block, re.DOTALL
    ):
        entries.append({'en': wm.group(1), 'ru': wm.group(2), 'uk': wm.group(3), 'pos': wm.group(4)})
    lesson_words[ln] = entries

# ── Неправильные глаголы (irregular_verbs_data.ts) ────────────────
lesson_irreg = {}   # {ln: [{base, past, pp, ru, uk}, ...]}
irr_start = irreg_src.index('IRREGULAR_VERBS_BY_LESSON')
irr_block_pat = re.compile(r'^\s*(\d+):\s*\[', re.MULTILINE)
irr_matches = list(irr_block_pat.finditer(irreg_src, irr_start))

for i, irm in enumerate(irr_matches):
    ln = int(irm.group(1))
    end = irr_matches[i+1].start() if i+1 < len(irr_matches) else irreg_src.index('};', irm.start())
    block = irreg_src[irm.end():end]
    verbs = []
    verb_pat = re.compile(
        r"base:\s*'([^']+)'.*?past:\s*'([^']+)'.*?pp:\s*'([^']+)'.*?ru:\s*'([^']+)'",
        re.DOTALL
    )
    for vm in verb_pat.finditer(block):
        verbs.append({'base': vm.group(1), 'past': vm.group(2), 'pp': vm.group(3), 'ru': vm.group(4)})
    lesson_irreg[ln] = verbs

# ═══════════════════════════════════════════════════════════════════
#  2. ГРАММАТИЧЕСКИЕ ТЕМЫ И ОЖИДАНИЯ
# ═══════════════════════════════════════════════════════════════════

LESSON_TOPICS = {
    1:  "To Be (am/is/are) — утверждения",
    2:  "To Be — отрицание и вопросы",
    3:  "Present Simple — утверждения",
    4:  "Present Simple — отрицание (don't/doesn't)",
    5:  "Present Simple — вопросы (Do/Does?)",
    6:  "Специальные вопросы (What/Where/Who...)",
    7:  "Глагол To Have (have/has)",
    8:  "Предлоги времени (in/on/at)",
    9:  "There is / There are",
    10: "Модальные глаголы (can/must)",
    11: "Past Simple — правильные глаголы (-ed)",
    12: "Past Simple — неправильные глаголы",
    13: "Future Simple (will)",
    14: "Степени сравнения прилагательных",
    15: "Притяжательные местоимения (my/your/his...)",
    16: "Фразовые глаголы (phrasal verbs)",
    17: "Present Continuous (am/is/are + -ing)",
    18: "Повелительное наклонение (Imperative)",
    19: "Предлоги места",
    20: "Артикли (a/an/the)",
    21: "Неопределённые местоимения (some/any/no/every...)",
    22: "Герундий (Verb + -ing как существительное)",
    23: "Пассивный залог (Passive Voice)",
    24: "Present Perfect (have/has + V3)",
    25: "Past Continuous (was/were + -ing)",
    26: "Условные предложения (Conditionals)",
    27: "Косвенная речь (Reported Speech)",
    28: "Возвратные местоимения (myself/yourself...)",
    29: "Used to",
    30: "Relative Clauses (who/which/that/where)",
    31: "Complex Object (I want you to...)",
    32: "Финальное повторение",
}

# Ключевые слова/структуры для проверки покрытия темы
TOPIC_MARKERS = {
    1:  ['am','is','are'],
    2:  ["isn't","aren't","not","is ","are ","Is ","Are "],
    3:  ['work','speak','live','love','eat','buy','drink','cook','watch','drive','believe'],
    4:  ["don't","doesn't","do not","does not"],
    5:  ['Do ','Does ','do you','does he','does she'],
    6:  ['What','Where','How','Who','Why','When','Which'],
    7:  ['have','has'],
    8:  [' in January',' in February',' in March',' in April',' in May',' in June',
         ' in July',' in August',' in September',' in October',' in November',' in December',
         ' on Monday',' on Tuesday',' on Wednesday',' on Thursday',' on Friday',' on Saturday',' on Sunday',
         ' at ',' in the morning',' in the evening',' at noon',' at midnight',' at night'],
    9:  ['There is','There are','there is','there are'],
    10: ['can ','must ','Can ','Must '],
    11: ['ed ',' yesterday',' ago',' last '],
    12: ['went','came','saw','took','gave','made','said','got','found','knew','bought','ate','drank','wrote','spoke'],
    13: ['will ','Will ',"won't","will not"],
    14: ['more ','most ','than ','better','worse','best','worst','er '],
    15: ['mine','yours','his','hers','ours','theirs','my ','your ','his ','her ','our ','their '],
    16: ['get up','turn on','turn off','look for','give up','find out','come back','put on','take off',
         'go on','pick up','set up','carry on','look up','bring up','hold on','run out','break down',
         'look after','wake up','get out','get into','get off','get on'],
    17: ['am ','is ','are ','ing ','ing.','ing,'],
    18: ['Please','Do not','Don\'t','Let\'s','Let us'],
    19: ['next to','under','behind','above','between','in front','opposite','near','inside','outside'],
    20: [' the ',' a ',' an '],
    21: ['someone','something','anyone','anything','nobody','nothing','everywhere','somewhere','no one','everyone','everybody'],
    22: ['enjoy','avoid','finish','start','love','hate','keep','suggest','stop','mind','consider','practise','prefer','miss','like'],
    23: ['is built','is made','was written','are grown','is used','was found','was sent','is cleaned','are paid'],
    24: ['have ','has ','\'ve ','\'s ','never','ever','just','already','yet'],
    25: ['was ','were ','ing '],
    26: ['if ','If ','would','unless'],
    27: ['said that','told','asked','thought that','explained that','mentioned that','replied that','confirmed that'],
    28: ['myself','yourself','himself','herself','itself','ourselves','themselves','yourselves'],
    29: ['used to'],
    30: ['who ','which ','that ','whose ','where ','when '],
    31: ['want you to','expect','ask you to','make you','let you','want him to','want her to','want them to','would like'],
    32: [],
}

# Самые важные неправильные глаголы которые ДОЛЖНЫ быть в курсе
MUST_KNOW_IRREG = [
    'be','have','do','go','come','get','make','know','think','take',
    'see','give','find','say','tell','buy','eat','drink','speak','write',
    'read','drive','feel','forget','understand','wear','pay','send','meet','bring',
    'leave','break','build','sit','stand','run','win','lose','keep','put',
    'hear','hold','catch','teach','sleep','grow','fall','cut','hit','hurt',
]

# ═══════════════════════════════════════════════════════════════════
#  3. АНАЛИЗ КАЖДОГО УРОКА
# ═══════════════════════════════════════════════════════════════════

# Собираем все неправильные глаголы встреченные в предыдущих уроках
cumulative_irreg = set()

def analyze_lesson(ln):
    global cumulative_irreg
    phrases  = lesson_phrases.get(ln, [])
    words    = lesson_words.get(ln, [])
    irreg    = lesson_irreg.get(ln, [])
    topic    = LESSON_TOPICS.get(ln, '?')
    markers  = TOPIC_MARKERS.get(ln, [])

    result = {
        'ln': ln, 'topic': topic,
        'phrases': phrases, 'words': words, 'irreg': irreg,
        'issues': [], 'recommendations': [],
        'scores': {},
    }
    iss = result['issues']
    rec = result['recommendations']

    n_ph = len(phrases)
    n_wo = len(words)
    n_ir = len(irreg)

    # ── SCORE 1: Объём фраз ────────────────────────────────────────
    if n_ph >= 50:   s_vol = 10
    elif n_ph >= 40: s_vol = 8
    elif n_ph >= 30: s_vol = 6
    elif n_ph >  0:  s_vol = 4
    else:            s_vol = 0

    # ── SCORE 2: Покрытие грамматической темы ──────────────────────
    if not phrases or not markers:
        s_topic = 7 if not markers else 0
    else:
        hits = sum(1 for p in phrases if any(mk in p for mk in markers))
        ratio = hits / n_ph
        if   ratio > 0.85: s_topic = 10
        elif ratio > 0.65: s_topic = 8
        elif ratio > 0.45: s_topic = 6
        elif ratio > 0.25: s_topic = 4
        else:              s_topic = 2

        if ratio < 0.5 and markers:
            iss.append(f"Покрытие темы слабое: только {hits}/{n_ph} фраз содержат маркеры темы ({ratio:.0%})")
            rec.append("Переработать фразы: каждая должна явно демонстрировать изучаемую грамматику")

    # ── SCORE 3: Словарный раздел ──────────────────────────────────
    if   n_wo >= 50: s_vocab = 10
    elif n_wo >= 35: s_vocab = 9
    elif n_wo >= 20: s_vocab = 7
    elif n_wo >= 10: s_vocab = 5
    elif n_wo >  0:  s_vocab = 3
    else:            s_vocab = 0

    # Проверяем слова в фразах которых нет в словаре
    vocab_set = {w['en'].lower() for w in words}
    STOPWORDS = {'the','a','an','is','are','am','was','were','be','been','being',
                 'i','you','he','she','it','we','they','me','him','her','us','them',
                 'do','does','did','not','and','or','but','in','on','at','to','for',
                 'of','with','by','from','if','as','so','then','than','when','where',
                 'what','who','how','why','will','would','can','could','should','may',
                 'might','must','shall','have','has','had','this','that','these','those',
                 'my','your','his','its','our','their'}
    phrase_words_new = set()
    for p in phrases:
        for w in re.findall(r"\b[a-z']+\b", p.lower()):
            w = w.strip("'")
            if w not in STOPWORDS and len(w) > 2 and w not in vocab_set:
                phrase_words_new.add(w)
    if phrase_words_new and n_wo > 0:
        sample = sorted(phrase_words_new)[:10]
        iss.append(f"В фразах встречаются слова которых нет в словаре ({len(phrase_words_new)} слов): {', '.join(sample)}...")

    # ── SCORE 4: Неправильные глаголы ─────────────────────────────
    IRREG_CRITICAL = {11, 12, 24}    # уроки где без них нельзя
    IRREG_IMPORTANT = {13, 23, 25}   # уроки где очень желательно

    if   n_ir >= 15: s_irreg = 10
    elif n_ir >= 10: s_irreg = 9
    elif n_ir >= 5:  s_irreg = 7
    elif n_ir >= 2:  s_irreg = 5
    elif n_ir == 1:  s_irreg = 3
    else:
        if ln in IRREG_CRITICAL:
            s_irreg = 0
            iss.append(f"❌ КРИТИЧНО: урок '{topic}' не имеет раздела неправильных глаголов!")
            rec.append("Немедленно добавить 15+ неправильных глаголов с формами V1/V2/V3")
        elif ln in IRREG_IMPORTANT:
            s_irreg = 2
            iss.append(f"⚠️  Раздел неправ. глаголов пустой, хотя тема '{topic}' этого требует")
            rec.append("Добавить 10-15 неправильных глаголов")
        else:
            s_irreg = 6  # не критично

    # Проверяем: новые глаголы из этого урока покрыты в irreg разделе
    irreg_bases = {v['base'].lower() for v in irreg}
    # Глаголы в фразах урока
    COMMON_IRREG = {'go','came','saw','took','gave','made','said','got','found','knew',
                    'bought','ate','drank','wrote','spoke','drove','felt','forgot','wore',
                    'paid','sent','met','brought','built','sat','ran','left','broke','kept',
                    'put','heard','caught','taught','cut','hurt','read','won','lost'}
    phrase_text = ' '.join(phrases).lower()
    irreg_in_phrases = {w for w in COMMON_IRREG if w in phrase_text}
    # Проверяем что их past/pp формы есть в irreg
    irreg_past_covered = set()
    for v in irreg:
        irreg_past_covered.add(v['past'].lower().split('/')[0])
    missing_coverage = irreg_in_phrases - irreg_past_covered - cumulative_irreg
    if missing_coverage and n_ir > 0:
        iss.append(f"Неправ. формы в фразах не покрыты в разделе: {', '.join(sorted(missing_coverage)[:6])}")

    # ── SCORE 5: Структурное разнообразие фраз ────────────────────
    if not phrases:
        s_diversity = 0
    else:
        starters = [p.split()[0].lower() if p else '' for p in phrases]
        from collections import Counter
        starter_cnt = Counter(starters)
        n_unique_starts = len(starter_cnt)
        # Охват подлежащих
        subjects = {'i','you','he','she','it','we','they'}
        subj_found = len(subjects & set(starters))
        # Длина фраз (разнообразие)
        lengths = [len(p.split()) for p in phrases]
        avg_len = sum(lengths)/len(lengths)
        min_len = min(lengths)
        max_len = max(lengths)
        len_variety = (max_len - min_len) / max(max_len, 1)
        # Итоговый балл
        s_diversity = round(
            (n_unique_starts / max(n_ph, 1)) * 4 +
            (subj_found / 7) * 3 +
            min(avg_len / 8, 1) * 2 +
            len_variety * 1,
            1
        )
        s_diversity = min(10.0, s_diversity * 10 / 7)

        if subj_found < 5:
            iss.append(f"Охват подлежащих: только {subj_found}/7 (I/you/he/she/it/we/they)")
            rec.append("Добавить фразы с недостающими подлежащими")
        dominant = starter_cnt.most_common(1)[0]
        if dominant[1] > n_ph * 0.4:
            iss.append(f"Монотонность: '{dominant[0]}' встречается в {dominant[1]}/{n_ph} фразах ({dominant[1]/n_ph:.0%})")

    # ── СПЕЦИФИЧЕСКИЕ ПРОВЕРКИ ПО ТЕМАМ ──────────────────────────

    if ln == 3:  # Present Simple утверждения
        missing_high_freq = [v for v in ['say','think','make','need','play','run','give','take']
                             if not any(v in p.lower().split() for p in phrases)]
        if missing_high_freq:
            iss.append(f"Отсутствуют высокочастотные глаголы Present Simple: {missing_high_freq}")
            rec.append(f"Добавить фразы с: {', '.join(missing_high_freq[:5])}")

    if ln == 8:  # Предлоги времени
        prepositions = {'in':0, 'on':0, 'at':0}
        for ph in phrases:
            words_ph = ph.lower().split()
            for prep in prepositions:
                if prep in words_ph:
                    prepositions[prep] += 1
        iss.append(f"Распределение предлогов in/on/at: {prepositions}")
        if min(prepositions.values()) < 5:
            rec.append("Добавить больше примеров с недостаточно представленными предлогами")

    if ln == 10:  # Модальные глаголы
        go_present = any(re.search(r'\bgo\b|\bgoes\b', p, re.I) for p in phrases)
        need_present = any(re.search(r'\bneed\b', p, re.I) for p in phrases)
        think_present = any(re.search(r'\bthink\b', p, re.I) for p in phrases)
        could_present = any(re.search(r'\bcould\b', p, re.I) for p in phrases)
        may_present = any(re.search(r'\bmay\b', p, re.I) for p in phrases)
        if not go_present:
            iss.append("❌ Глагол GO с модальными ОТСУТСТВУЕТ (You can go / We must go)")
            rec.append("Добавить: 'You can go now.', 'We must go.', 'She can go home.', 'They must not go there.'")
        if not could_present:
            iss.append("⚠️  COULD (past of can) отсутствует")
            rec.append("Добавить примеры с could: 'Could you help me?', 'I could not find it.'")
        if not may_present:
            iss.append("⚠️  MAY отсутствует")
        if not need_present:
            iss.append("⚠️  NEED (to) отсутствует")

    if ln == 11:  # Past Simple правильные
        if n_ir < 5:
            iss.append("❌ Past Simple урок без неправ. глаголов — студент не знает что go→went, see→saw!")
            rec.append("Добавить хотя бы 10 неправильных глаголов для контраста с правильными")

    if ln == 12:  # Past Simple неправильные
        if n_ir < 10:
            iss.append("❌ Урок 'Неправильные глаголы' содержит мало неправ. глаголов!")
            rec.append("Добавить 20+ неправильных глаголов с V1/V2/V3")
        # Проверить что в фразах используются именно неправ. формы
        irreg_forms_in_phrases = sum(1 for p in phrases
                                     if any(w in p.lower() for w in ['went','came','saw','took','gave','made','said','got','found','bought','ate','drank','wrote','spoke']))
        if irreg_forms_in_phrases < n_ph * 0.5:
            iss.append(f"Только {irreg_forms_in_phrases}/{n_ph} фраз содержат неправильные формы глаголов")

    if ln == 13:  # Future Simple
        neg_will = sum(1 for p in phrases if "won't" in p.lower() or "will not" in p.lower())
        q_will = sum(1 for p in phrases if p.strip().startswith('Will') or p.strip().startswith('will'))
        iss.append(f"Отрицания won't/will not: {neg_will} фраз | Вопросы Will...?: {q_will} фраз")
        if neg_will < 8:
            rec.append(f"Добавить ещё {8-neg_will} фраз с won't/will not")
        if q_will < 8:
            rec.append(f"Добавить ещё {8-q_will} вопросов Will...?")

    if ln == 16:  # Фразовые глаголы
        ALL_PV = ['get up','wake up','turn on','turn off','look for','give up','find out',
                  'come back','put on','take off','go on','pick up','set up','carry on',
                  'look up','bring up','hold on','run out','break down','look after',
                  'get out','get into','get off','get on','give back','put off','put away',
                  'throw away','work out','come in']
        found_pv = [pv for pv in ALL_PV if any(pv in p.lower() for p in phrases)]
        missing_pv = [pv for pv in ALL_PV if pv not in found_pv]
        iss.append(f"Покрыто {len(found_pv)}/{len(ALL_PV)} фразовых глаголов из топ-30: {found_pv}")
        if missing_pv:
            rec.append(f"Не покрыты: {', '.join(missing_pv[:10])}")
            rec.append("Добавить по 2-3 фразы для каждого отсутствующего фразового глагола")

    if ln == 23:  # Passive Voice
        active_passive = {}
        for tense in ['present simple passive','past simple passive','present continuous passive']:
            active_passive[tense] = 0
        for p in phrases:
            pl = p.lower()
            if re.search(r'\bis\s+\w+ed\b|\bare\s+\w+ed\b', pl):
                active_passive['present simple passive'] += 1
            if re.search(r'\bwas\s+\w+ed\b|\bwere\s+\w+ed\b', pl):
                active_passive['past simple passive'] += 1
            if re.search(r'\bbeing\s+\w+ed\b', pl):
                active_passive['present continuous passive'] += 1
        iss.append(f"Распределение пассивного залога по временам: {active_passive}")

    if ln == 24:  # Present Perfect
        if n_ir == 0:
            iss.append("❌ Present Perfect требует V3 форм — а раздел неправ. глаголов ПУСТ!")
            rec.append("Добавить 20+ глаголов с V3: have done, have seen, have been, have gone, etc.")
        # Проверка have/has ever/never/just/already/yet
        markers_pp = {'ever':0,'never':0,'just':0,'already':0,'yet':0}
        for p in phrases:
            for mk in markers_pp:
                if mk in p.lower():
                    markers_pp[mk] += 1
        iss.append(f"Маркеры времени в фразах: {markers_pp}")
        missing_mk = [k for k,v in markers_pp.items() if v < 3]
        if missing_mk:
            rec.append(f"Добавить фразы с маркерами: {missing_mk}")

    if ln == 26:  # Conditionals
        cond_t1 = sum(1 for p in phrases if 'if' in p.lower() and 'will' in p.lower())
        cond_t2 = sum(1 for p in phrases if 'if' in p.lower() and 'would' in p.lower())
        cond_t3 = sum(1 for p in phrases if 'if' in p.lower() and 'had' in p.lower())
        iss.append(f"Типы условных: Type1(if+will)={cond_t1} | Type2(if+would)={cond_t2} | Type3(if+had)={cond_t3}")
        if cond_t2 == 0:
            iss.append("❌ Type 2 Conditional (if + would) отсутствует!")
            rec.append("Добавить 10+ фраз Type 2: 'If I had money, I would travel.'")
        if cond_t3 == 0:
            iss.append("❌ Type 3 Conditional (if + had + would have) отсутствует!")
            rec.append("Добавить 5+ фраз Type 3: 'If she had studied, she would have passed.'")

    if ln == 27:  # Reported Speech
        backshift_correct = sum(1 for p in phrases
                                if 'said that' in p.lower() or 'told' in p.lower()
                                or 'mentioned that' in p.lower() or 'replied that' in p.lower())
        iss.append(f"Корректный backshift (said that/told/mentioned): {backshift_correct}/{n_ph} фраз")
        if backshift_correct < n_ph * 0.6:
            rec.append("Добавить больше фраз с корректным сдвигом времён в косвенной речи")

    # ── ИТОГОВЫЙ БАЛЛ ──────────────────────────────────────────────
    weights = {'volume':2, 'topic':3, 'vocab':2, 'irreg':2, 'diversity':1}
    vals = {'volume':s_vol,'topic':s_topic,'vocab':s_vocab,'irreg':s_irreg,'diversity':round(s_diversity,1)}
    overall = sum(vals[k]*weights[k] for k in weights) / sum(weights.values())

    result['scores'] = {**vals, 'overall': round(overall, 1)}
    result['starters'] = Counter(p.split()[0].lower() if p else '' for p in phrases)
    result['n_ph'] = n_ph
    result['n_wo'] = n_wo
    result['n_ir'] = n_ir

    # Обновляем кумулятивный список неправ. глаголов
    cumulative_irreg |= {v['past'].lower().split('/')[0] for v in irreg}

    return result


# ═══════════════════════════════════════════════════════════════════
#  4. ВЫВОД ОТЧЁТА
# ═══════════════════════════════════════════════════════════════════

results = [analyze_lesson(ln) for ln in range(1, 33)]

LINE = '═' * 115
line = '─' * 115

print(LINE)
print('  ПОЛНЫЙ ЛИНГВИСТИЧЕСКИЙ АУДИТ PHRASEMAN — 32 УРОКА')
print('  Источники: lesson_data_*.ts + lesson_words.tsx + irregular_verbs_data.ts')
print('  Методология: Oxford/Cambridge EFL, CEFR A1→C1')
print(LINE)
print()
print(f"{'L':>3} {'Тема':43} {'Фраз':>5}{'Слов':>5}{'Ireg':>5} | {'Объём':>5}{'Тема':>5}{'Слов':>5}{'Ireg':>5}{'Разн':>5} | {'ИТОГ':>5}")
print(line)

all_scores = []
for r in results:
    s = r['scores']
    all_scores.append(s['overall'])
    print(f"L{r['ln']:2d} {r['topic'][:43]:43} {r['n_ph']:5}{r['n_wo']:5}{r['n_ir']:5} |"
          f" {s['volume']:5.1f}{s['topic']:5.1f}{s['vocab']:5.1f}{s['irreg']:5.1f}{s['diversity']:5.1f} |"
          f" {s['overall']:5.1f}")

print(line)
print(f"  СРЕДНЕЕ: {sum(all_scores)/len(all_scores):.1f}/10   "
      f"Всего фраз: {sum(r['n_ph'] for r in results)}  "
      f"Всего слов в словарях: {sum(r['n_wo'] for r in results)}  "
      f"Всего неправ. глаголов: {sum(r['n_ir'] for r in results)}")

# ── Детальные отчёты по каждому уроку ─────────────────────────────
print()
print(LINE)
print('  ДЕТАЛЬНЫЕ ОТЧЁТЫ ПО КАЖДОМУ УРОКУ')
print(LINE)

for r in results:
    ln   = r['ln']
    s    = r['scores']
    iss  = r['issues']
    rec  = r['recommendations']

    print()
    print(line)
    print(f"  УРОК {ln}: {r['topic']}")
    print(f"  ИТОГ: {s['overall']}/10  |  Объём:{s['volume']}  Тема:{s['topic']}  Слов:{s['vocab']}  Irreg:{s['irreg']}  Разн:{s['diversity']}")
    print(f"  Фраз: {r['n_ph']}  |  Слов в словаре: {r['n_wo']}  |  Неправ. глаголов: {r['n_ir']}")
    print(line)

    # Примеры фраз
    print(f"\n  ФРАЗЫ (первые 10 из {r['n_ph']}):")
    for i, ph in enumerate(r['phrases'][:10], 1):
        print(f"    {i:2}. {ph}")

    # Словарь
    print(f"\n  СЛОВАРЬ ({r['n_wo']} слов):")
    if r['words']:
        from collections import defaultdict
        by_pos = defaultdict(list)
        for w in r['words']:
            by_pos[w['pos']].append(w['en'])
        for pos, ws in sorted(by_pos.items()):
            print(f"    [{pos}] ({len(ws)}): {', '.join(ws)}")
    else:
        print("    — отсутствует")

    # Неправильные глаголы
    print(f"\n  НЕПРАВИЛЬНЫЕ ГЛАГОЛЫ ({r['n_ir']}):")
    if r['irreg']:
        for v in r['irreg']:
            print(f"    {v['base']:15} → {v['past']:18} → {v['pp']:18}  [{v['ru']}]")
    else:
        print("    — отсутствует")

    # Распределение подлежащих
    print(f"\n  РАСПРЕДЕЛЕНИЕ ПОДЛЕЖАЩИХ:")
    if r['starters']:
        from collections import Counter
        top = r['starters'].most_common(10)
        print(f"    {dict(top)}")

    # Проблемы
    if iss:
        print(f"\n  ПРОБЛЕМЫ ({len(iss)}):")
        for issue in iss:
            print(f"    ⚠  {issue}")
    else:
        print(f"\n  ПРОБЛЕМЫ: не выявлено ✅")

    # Рекомендации
    if rec:
        print(f"\n  РЕКОМЕНДАЦИИ:")
        for rr in rec:
            print(f"    → {rr}")

# ── Системные выводы ──────────────────────────────────────────────
print()
print(LINE)
print('  СИСТЕМНЫЕ ВЫВОДЫ ПО ВСЕМУ КУРСУ')
print(LINE)

# Сортировка по оценке
sorted_r = sorted(results, key=lambda x: x['scores']['overall'], reverse=True)

print("\n  ТОП-5 ЛУЧШИХ УРОКОВ:")
for r in sorted_r[:5]:
    print(f"    L{r['ln']:2d} {r['topic']:50} → {r['scores']['overall']}/10")

print("\n  ТОП-5 ПРОБЛЕМНЫХ УРОКОВ:")
for r in sorted_r[-5:]:
    print(f"    L{r['ln']:2d} {r['topic']:50} → {r['scores']['overall']}/10")

# Важные глаголы которые никогда не встречаются
print("\n  ПОКРЫТИЕ КРИТИЧЕСКИХ ГЛАГОЛОВ OXFORD 3000 В ФРАЗАХ:")
TOP50 = ['go','say','tell','think','make','need','give','know','see','come','take','find',
         'want','use','work','feel','keep','try','look','help','run','play','live','believe',
         'write','read','hear','speak','buy','drive','cook','watch','eat','drink','teach',
         'learn','start','stop','begin','finish','open','close','send','call','meet','pay',
         'spend','ask','get','put','bring','show','break','win','grow','sit','stand','sleep']

all_phrases_text = ' '.join(p.lower() for r in results for p in r['phrases'])
never = [v for v in TOP50 if not re.search(rf'\b{v}\b', all_phrases_text)]
late  = [v for v in TOP50 if v not in never
         and next((r['ln'] for r in results if any(re.search(rf'\b{v}\b', p, re.I) for p in r['phrases'])), 99) >= 16]
print(f"\n  Никогда не встречаются в курсе: {never}")
print(f"  Появляются только в L16+: {late}")

print("\n  КРИТИЧЕСКИЕ СТРУКТУРНЫЕ ПРОБЛЕМЫ:")
critical = []
for r in results:
    if r['scores']['overall'] < 5.5:
        critical.append(f"  L{r['ln']:2d} ({r['scores']['overall']}/10): {r['topic']}")
for c in critical:
    print(c)

print(f"\n  Уроков без раздела неправ. глаголов: {sum(1 for r in results if r['n_ir']==0)}/32")
print(f"  Уроков с < 25 слов в словаре:        {sum(1 for r in results if r['n_wo']<25)}/32")
print(f"  Уроков с полным набором (≥40 фраз + ≥20 слов + ≥5 irreg): "
      f"{sum(1 for r in results if r['n_ph']>=40 and r['n_wo']>=20 and r['n_ir']>=5)}/32")

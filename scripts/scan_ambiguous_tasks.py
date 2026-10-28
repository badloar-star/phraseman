"""Сканер неоднозначных заданий (несколько верных вариантов) — 12 · ТЕОРИЯ, 28.10.2026.

зачем: владелец — «несколько вариантов правильных в очень многих заданиях… такие задания надо удалять,
заменять» (пример: they are going to pay / they are paying). Сканер только ищет кандидатов, ничего не правит.

Источники:
  A. Learning V2 EN — content/learning-v2-course/sessions/en/lNN/sNN/practice.atomic.json (ветка ru):
     context_gap_grammar (верный = вариант без choiceFeedback) и phrase_builder (дистракторы-плитки, порядок).
  B. Старые уроки — app/lesson_data_*.ts, wordsEn (слот = верное слово + 5 дистракторов), alternatives.

Запуск: python scripts/scan_ambiguous_tasks.py [--out C:/Temp/claude/ambiguous.json]
Печатает сводку по правилам и статусам; полный список — в JSON.
"""
import difflib
import io
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSE = os.path.join(ROOT, 'content', 'learning-v2-course', 'sessions', 'en')
OLD_FILES = ['lesson_data_1_8_phrases_es.gen.ts', 'lesson_data_9_16_phrases_es.gen.ts',
             'lesson_data_17_24.ts', 'lesson_data_25_32.ts']

BE = r"(?:am|is|are|'m|'s|'re|was|were)"
IRREGULAR_PAST = set('''went saw ate drank took gave made did had got came bought brought thought told said found left
lost met paid put read ran sat slept spoke spent stood swam taught understood woke wore won wrote sold sent felt kept knew
heard held built broke chose caught drove fell flew forgot froze grew hung hid hit hurt let lent lay rode rang rose shook
shot shut sang sank stole stuck struck swept threw'''.split())
PARTICIPLE_ONLY = set('''gone seen eaten drunk taken given done been known written spoken broken chosen driven flown
forgotten frozen grown hidden ridden risen shaken stolen sung swum thrown worn woken fallen begun'''.split())

CONTRACTIONS = {"i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is',
                "she's": 'she is', "it's": 'it is', "that's": 'that is', "don't": 'do not', "doesn't": 'does not',
                "didn't": 'did not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
                "can't": 'cannot', "won't": 'will not', "i'll": 'i will', "you'll": 'you will', "we'll": 'we will',
                "they'll": 'they will', "he'll": 'he will', "she'll": 'she will', "i've": 'i have', "you've": 'you have',
                "we've": 'we have', "they've": 'they have', "haven't": 'have not', "hasn't": 'has not',
                "shouldn't": 'should not', "couldn't": 'could not', "wouldn't": 'would not', "mustn't": 'must not',
                "let's": 'let us', "there's": 'there is', "what's": 'what is', "where's": 'where is'}

# Пары слов, которые часто обе верны (синонимы / модальные / количественные / указательные).
SWAP_GROUPS = {
    'модальные can/could/be able to': [{'can', 'could'}, {'can', 'be able to'}, {'can', 'am able to'},
                                        {'can', 'is able to'}, {'can', 'are able to'}],
    'модальные may/might/could': [{'may', 'might'}, {'might', 'could'}, {'may', 'could'}, {'may', 'can'}],
    'модальные must/have to/should': [{'must', 'have to'}, {'must', 'has to'}, {'must', 'should'},
                                       {'should', 'ought to'}, {'have to', 'need to'}, {'has to', 'needs to'},
                                       {'should', 'have to'}, {'must', 'need to'}],
    'will/shall/would': [{'will', 'shall'}, {'would', 'will'}, {"'ll", 'will'}],
    'some/any': [{'some', 'any'}],
    'much/many/a lot of': [{'much', 'a lot of'}, {'many', 'a lot of'}, {'lots of', 'a lot of'}, {'many', 'lots of'},
                           {'much', 'lots of'}],
    'this/that': [{'this', 'that'}, {'these', 'those'}, {'it', 'this'}, {'it', 'that'}],
    'артикль': [{'a', 'the'}, {'an', 'the'}, {'a', 'one'}],
    'синонимы': [{'start', 'begin'}, {'starts', 'begins'}, {'started', 'began'}, {'big', 'large'}, {'film', 'movie'},
                 {'shop', 'store'}, {'also', 'too'}, {'maybe', 'perhaps'}, {'until', 'till'}, {'fast', 'quick'},
                 {'quickly', 'fast'}, {'sick', 'ill'}, {'call', 'phone'}, {'small', 'little'}, {'speak', 'talk'},
                 {'holiday', 'vacation'}, {'flat', 'apartment'}, {'autumn', 'fall'}, {'mobile', 'phone'},
                 {'get', 'buy'}, {'got', 'bought'}, {'get', 'receive'}, {'got', 'received'}, {'look at', 'watch'},
                 {'near', 'close to'}, {'nearly', 'almost'}, {'whole', 'all'}, {'each', 'every'},
                 {'everyone', 'everybody'}, {'someone', 'somebody'}, {'anyone', 'anybody'}, {'no one', 'nobody'},
                 {'glad', 'happy'}, {'fine', 'good'}, {'fine', 'ok'}, {'great', 'good'}, {'which', 'what'},
                 {'who', 'that'}, {'which', 'that'}, {'toilet', 'bathroom'}, {'trip', 'journey'},
                 {'kids', 'children'}, {'mum', 'mom'}, {'enough', 'sufficient'},
                 {'hard', 'difficult'}, {'simple', 'easy'}, {'shut', 'close'}, {'arrive', 'come'},
                 {'arrived', 'came'}, {'reply', 'answer'}, {'wish', 'want'}],
    'предлог': [{'in', 'on'}, {'in', 'at'}, {'on', 'at'}, {'to', 'towards'}, {'about', 'on'}, {'for', 'during'}],
}
PAIR_TO_GROUP = {}
for g, pairs in SWAP_GROUPS.items():
    for p in pairs:
        PAIR_TO_GROUP[frozenset(p)] = g

# Маркеры в контексте (сцена ru + английская фраза). Ключ — какая форма поддержана.
MARKERS = {
    'perfect': [r'\b(ever|never|just|already|yet|since|so far|recently|lately)\b', r'уже|только что|когда-нибудь|ни разу|'
                r'ещё не|еще не|до сих пор|с тех пор|за последн|результат|сейчас.*(готов|есть|нет)'],
    'past': [r'\b(yesterday|ago|last (night|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday|summer|time)|'
             r'in (19|20)\d\d|when did|then)\b', r'вчера|назад|на прошлой|в прошлом|прошлым|позавчера|тогда|в детстве|'
             r'в (19|20)\d\d'],
    'going': [r'\bgoing to\b', r'решил|решила|решили|собира|намерен|намерева|задумал|план(ир|у)|хоти?те|видно, что|'
              r'вот-вот|судя по|тучи|через going'],
    'cont_future': [r'\b(tonight|tomorrow|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|at \d)',
                    r'договор|назначен|записан|забронир|билет|в календар|согласовал|приглас|встреча в|уже купил|'
                    r'подтвердил|через present continuous'],
    'will': [r"\b(will|'ll|i think|probably|maybe)\b", r'обеща|прямо сейчас решаете|спонтан|предлага|наверное|думаете|'
             r'уверены|прогноз|в будущем|через will|кажется|вероятно|предсказ'],
    'cont_now': [r'\b(now|right now|at the moment|look|listen)\b', r'сейчас|в данный момент|прямо сейчас|в эту минуту|смотрите|'
                 r'слушайте|в эти дни|сегодня утром занят'],
    'simple_habit': [r'\b(every|usually|always|often|never|sometimes)\b', r'кажд|обычно|всегда|часто|иногда|никогда|по утрам|'
                     r'по вечерам|привычк|регулярно|по выходным'],
    'pastperf': [r'\bby the time\b|\bbefore\b|\bafter\b|\bsaid\b|\btold\b|\badmitted\b',
                 r'до того как|к тому времени|раньше, чем|до (приезда|прихода|звонка|начала)|к (приходу|возвращению|приезду)|'
                 r'уже были|ещё до|еще до'],
    'past_cont': [r'\bwhile\b|\bat \d+ (yesterday|last)', r'в тот момент|когда .*(позвонил|пришёл|пришел|зашёл|зашел)|'
                  r'весь вечер|в это время|процесс'],
}

SELF_ADMIT = re.compile(r'возможн\w* фраз|тоже (верн|можно|подход|правильн)|тоже допуст|допустимо, но|грамматически верн|'
                        r'грамматически правильн|можно сказать и|можно и так|указанн\w* форм|требуется указанн', re.I)


def norm(s):
    s = s.lower().replace('’', "'").replace('‘', "'")
    s = re.sub(r"[.,!?;:«»\"()]", ' ', s)
    return [t for t in s.split() if t]


def expand(tokens):
    out = []
    for t in tokens:
        out.extend(CONTRACTIONS.get(t, t).split())
    return out


AUX = {'am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'shall',
       'would', 'going'}
SUBJ = {'i', 'you', 'we', 'they', 'he', 'she', 'it'}
AGREE = {'am': {'i'}, 'is': {'he', 'she', 'it'}, 'are': {'you', 'we', 'they'}, 'was': {'i', 'he', 'she', 'it'},
         'were': {'you', 'we', 'they'}, 'has': {'he', 'she', 'it'}, 'have': {'i', 'you', 'we', 'they'},
         'does': {'he', 'she', 'it'}, 'do': {'i', 'you', 'we', 'they'}}
NOT_VERB = set('''a an the this that these those my your his her its our their not never just already ever also
always often usually sometimes still to of in on at for with from by and or but if when so very really here there
now then too some any no every all it him them me us you i we they he she is are am was were be been being do does
did have has had will would can could may might must should shall'''.split())
ED_BASE = {'need', 'feed', 'seed', 'speed', 'breed', 'bleed', 'proceed', 'succeed', 'exceed', 'red', 'bed', 'shed'}
ING_BASE = {'bring', 'sing', 'ring', 'sting', 'swing', 'fling', 'cling', 'string', 'thing', 'king', 'wing', 'spring'}


def is_ing(w):
    return len(w) > 4 and w.endswith('ing') and w not in ING_BASE


def is_past(w):
    return w in IRREGULAR_PAST or (len(w) > 3 and w.endswith('ed') and w not in ED_BASE)


def is_pp(w):
    return is_past(w) or w in PARTICIPLE_ONLY or w == 'been'


def is_base(w):
    return w.isalpha() and w not in NOT_VERB and not is_ing(w) and not is_past(w) and w not in PARTICIPLE_ONLY


def tense_tag(tokens):
    """Строгая метка формы глагола во всей фразе; 'bad' — фраза неграмматична (дистрактор явно неверен)."""
    w = expand(tokens)
    n = len(w)

    def nxt(i):
        j = i + 1
        while j < n and w[j] in ('not', 'never', 'just', 'already', 'ever', 'still', 'also', 'always', 'usually',
                                 'often', 'really'):
            j += 1
        return j

    for i, t in enumerate(w):
        subj = w[i - 1] if i > 0 and w[i - 1] in SUBJ else (w[i + 1] if i + 1 < n and w[i + 1] in SUBJ else None)
        if t in AGREE and subj and subj not in AGREE[t]:
            return 'bad'
        j = nxt(i)
        if j >= n:
            continue
        v = w[j]
        if t in ('am', 'is', 'are'):
            if v == 'going' and j + 2 < n and w[j + 1] == 'to' and is_base(w[j + 2]):
                return 'going'
            if is_ing(v):
                return 'cont'
            if is_base(v) and subj:
                return 'bad'
        if t in ('was', 'were') and is_ing(v):
            return 'past_cont'
        if t in ('will', 'shall'):
            if is_base(v) or v == 'be':
                return 'will'
            return 'bad'
        if t in ('have', 'has', 'had') and is_pp(v) and (subj or i == 0):
            return 'perfect' if t != 'had' else 'pastperf'
        if t in ('have', 'has') and is_ing(v):
            return 'bad'
        if t in ('do', 'does') and (subj or i == 0):
            return 'simple' if (is_base(v) or v in ('have', 'be')) else 'bad'
        if t == 'did' and (subj or i == 0):
            return 'past' if (is_base(v) or v in ('have', 'be')) else 'bad'
        if t in ('can', 'could', 'may', 'might', 'must', 'should', 'would') and not (is_base(v) or v in ('have', 'be')):
            return 'bad'
    for i, t in enumerate(w[:-1]):
        if t in SUBJ:
            v = w[i + 1]
            if is_past(v):
                return 'past'
            if v in NOT_VERB:
                return None
            if is_base(v) or (v.endswith('s') and is_base(v[:-1])):
                return 'simple'
            break
    return None


TENSE_PAIRS = {
    frozenset({'going', 'cont'}): 'going to ↔ Present Continuous (будущее)',
    frozenset({'will', 'going'}): 'will ↔ going to',
    frozenset({'will', 'cont'}): 'will ↔ Present Continuous (будущее)',
    frozenset({'perfect', 'past'}): 'Present Perfect ↔ Past Simple',
    frozenset({'past', 'past_cont'}): 'Past Simple ↔ Past Continuous',
    frozenset({'cont', 'simple'}): 'Present Simple ↔ Present Continuous',
    frozenset({'will', 'simple'}): 'will ↔ Present Simple',
    frozenset({'perfect', 'simple'}): 'Present Perfect ↔ Present Simple',
    frozenset({'pastperf', 'past'}): 'Past Perfect ↔ Past Simple',
    frozenset({'pastperf', 'perfect'}): 'Past Perfect ↔ Present Perfect',
}


UNCOUNTABLE = set('''water music coffee tea milk bread rice money information advice news homework work furniture luggage
baggage weather traffic time help food fruit juice soup sugar salt butter cheese meat paper equipment research
knowledge patience fun hair rain snow'''.split())
PERSON = set('''man woman person people friend friends student students doctor teacher girl boy guy colleague colleagues
neighbour neighbor manager child children kid kids mother father brother sister wife husband driver client customer
guest guests worker workers boss nurse waiter actor singer someone somebody anyone everyone nobody one who'''.split())
VOWEL_SOUND_EXC = ('uni', 'use', 'eu', 'one', 'once', 'user', 'usual')


def article_ok(words, i):
    """Можно ли поставить артикль words[i] (a/an/the) перед следующим словом."""
    art = words[i]
    if i and words[i - 1] in ('a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'our',
                                'their', 'its', 'some', 'any', 'no', 'every', 'each'):
        return False
    if i + 1 >= len(words):
        return False
    nxt = words[i + 1]
    if nxt in NOT_VERB or nxt in SUBJ or nxt in ('little', 'few', 'lot'):
        return False
    if art in ('a', 'an'):
        vowel = nxt[0] in 'aeiou' and not nxt.startswith(VOWEL_SOUND_EXC) or nxt.startswith(('hour', 'honest'))
        if (art == 'a') == vowel:
            return False
        if nxt in UNCOUNTABLE or nxt.endswith(('est', 'ing')) or nxt == 'most':
            return False
        if nxt.endswith('s') and not nxt.endswith(('ss', 'us', 'is')):
            return False
    return True


def relative_ok(words, i):
    w = words[i]
    prev = words[i - 1] if i else ''
    if prev in ('said', 'say', 'says', 'know', 'knew', 'think', 'thought', 'hope', 'believe', 'told', 'tell', 'sure',
                'at', 'in', 'on', 'of', 'for', 'to', 'from', 'with', 'is', 'was', 'that', 'which', 'who'):
        return False
    if w == 'who' and prev not in PERSON:
        return False
    if w == 'which' and prev in PERSON:
        return False
    return True


def classify(correct, alt):
    """Возвращает (правило, кусок верного, кусок альтернативы) или None (пара не похожа на «оба верны»)."""
    c, a = norm(correct), norm(alt)
    if c == a:
        return None
    if expand(c) == expand(a):
        return ('сокращение = полная форма (один и тот же ответ)', ' '.join(c), ' '.join(a))
    tc, ta = tense_tag(c), tense_tag(a)
    if ta == 'bad' or (tc and tc != 'bad' and ta is None and tc not in ('simple', 'past')):
        return None
    sm = difflib.SequenceMatcher(a=c, b=a, autojunk=False)
    ops = [o for o in sm.get_opcodes() if o[0] != 'equal']
    if not ops:
        return None
    i0, i1, j0, j1 = ops[0][1], ops[-1][2], ops[0][3], ops[-1][4]
    cs, as_ = ' '.join(c[i0:i1]), ' '.join(a[j0:j1])
    if (i1 - i0) <= 3 and (j1 - j0) <= 3:
        g = PAIR_TO_GROUP.get(frozenset({cs, as_}))
        if g == 'артикль' or (not cs and as_ in ('a', 'an', 'the')) or (not as_ and cs in ('a', 'an', 'the')):
            if as_ in ('a', 'an', 'the') and not article_ok(a, j0):
                return None
            if not as_ and i1 < len(c) and (c[i1].endswith('est') or c[i1] in ('most', 'same', 'only', 'first', 'last')):
                return None
            if not as_ and i1 < len(c) and c[i1] not in UNCOUNTABLE and not c[i1].endswith('s'):
                return None  # без артикля перед исчисляемым в единственном числе — ошибка
            return ('артикль', cs or '∅', as_ or '∅')
        if g == 'синонимы' and {cs, as_} & {'that', 'which', 'who', 'whom', 'what'}:
            if as_ in ('which', 'who', 'that', 'whom', 'what') and not relative_ok(a, j0):
                return None
            if cs == 'that' and i0 and c[i0 - 1] in ('said', 'say', 'know', 'think', 'hope', 'told', 'sure'):
                return None
            return ('who/which/that', cs, as_)
        if g and g.startswith('модальные'):
            subj = next((x for x in a if x in SUBJ), '')
            if 'may' in (cs, as_) and a and a[0] == 'may' and subj not in ('i', 'we'):
                return None  # May you…? — неверно
            if 'be able to' in as_ and j0 and a[j0 - 1] in ('will', 'can', 'must', 'should'):
                return None
            if tense_tag(a) == 'bad':
                return None
        if g == 'will/shall/would':
            if 'shall' in (cs, as_) and not ({'i', 'we'} & set(a)):
                return None
            if 'would' in (cs, as_) and not re.search(r'\b(said|told|promised|thought|knew|hoped|if)\b', ' '.join(a)):
                return None
        if g in ('some/any',):
            neg_q = bool(re.search(r"\b(not|no|never|if)\b", ' '.join(expand(a)))) or (correct.strip().endswith('?'))
            if as_ == 'any' and not neg_q:
                return None  # any в утверждении — ошибка
            return (g, cs, as_)
        if g and g != 'предлог':
            return (g, cs, as_)
    seg_words = c[i0:i1] + a[j0:j1]
    verbish = any(x in AUX or is_ing(x) or is_pp(x) for x in expand(seg_words))
    if tc and ta and tc != ta and 'bad' not in (tc, ta) and verbish:
        if {tc, ta} == {'past', 'past_cont'} and any(x in ('was', 'were') for x in c[max(0, i0 - 2):i0]) and                 not is_ing(' '.join(c[i0:i1])):
            return None  # was tired / was tiring — прилагательное, не время
        rule = TENSE_PAIRS.get(frozenset({tc, ta}))
        if rule:
            return (rule, cs, as_)
    return None


MODAL_RU = {'can': r'мож|умее|способ', 'cannot': r'не мож|не умее', 'could': r'мог(ла|ли)?\b|мог бы|могли бы|не мог',
            'may': r'может быть|возможно|разреш|можно', 'might': r'может быть|возможно|вдруг',
            'must': r'должн|обязан|нельзя|необходимо', 'have to': r'приходится|придётся|нужно|надо|должн',
            'should': r'стоит|следует|лучше|советую', 'will': r'буд|завтра|позже|скоро|следующ|обеща|не забуду', 'shall': r'(^|\s)давай|не\s+\w+ть ли',
            'would': r'\bбы\b|сказал|обещал', 'be able to': r'сможет|смогу|смогут|сможем|сможешь|сможете'}


def modal_status(correct, alt, ctx):
    """Модальные: русская подсказка однозначно называет один глагол?"""
    def which(s):
        w = ' '.join(expand(norm(s)))
        for m in ('be able to', 'have to', 'cannot', 'could', 'might', 'should', 'shall', 'would', 'must', 'may', 'can',
                  'will'):
            if re.search(r'\b' + m + r'\b', w):
                return m
        return None
    mc, ma = which(correct), which(alt)
    hc = bool(mc and re.search(MODAL_RU.get(mc, '$^'), ctx))
    ha = bool(ma and re.search(MODAL_RU.get(ma, '$^'), ctx))
    if hc and not ha:
        return 'resolved_marker'
    if ha and not hc:
        return 'contradiction'
    return 'unresolved'

NEAR = r'рядом|в руках|у вас в|протягива|показывает на .* рядом|близко|здесь|перед вами|этот|эта|эти|это\s+(\w+ое|\w+ий|\w+ая)|сегодня'
FAR = r'далеко|вдали|дальн|у окна|у двери|на той|за стеклом|напротив|\bтот\b|\bта\b|\bте\b|\bто\b\s+\w|тогда|в тот'


def demonstrative_status(correct, alt, ctx):
    c, a = set(expand(norm(correct))), set(expand(norm(alt)))
    near_c = bool(c & {'this', 'these'})
    near_a = bool(a & {'this', 'these'})
    near, far = bool(re.search(NEAR, ctx)), bool(re.search(FAR, ctx))
    if 'it' in c | a and not (c & {'that', 'those'} or a & {'that', 'those'}):
        return 'unresolved'  # «это» = it / this — без подсказки оба верны
    if near_c and near and not far or (not near_c and far and not near):
        return 'resolved_marker'
    if near_a and near and not far or (not near_a and far and not near):
        return 'contradiction'
    return 'unresolved'


DEF_RU = r'уже говорили|уже показал|о (нём|ней|них) же|смотрите на|смотрит на|одн\w+ и т\w+ же|понятн\w+ (вам|обоим)|тот самый|та самая|\bтот\b|\bта\b|\bте\b|этот|эта|эти|' \
         r'единствен|ваш\w*|сво\w+|которую|который|которое|которые|где '
INDEF_RU = r'впервые|вообще|какой-то|какая-то|какое-то|один из|одна из|любой|любая|какой-нибудь|новый|новая|есть\b|у \w+ есть|' \
           r'общего названия|как вид|в целом|без a'


def article_status(correct, alt, ctx):
    c = expand(norm(correct))
    definite = 'the' in c and 'the' not in expand(norm(alt))
    d, i = bool(re.search(DEF_RU, ctx)), bool(re.search(INDEF_RU, ctx))
    if (definite and d and not i) or (not definite and i and not d):
        return 'resolved_marker'
    if (definite and i and not d) or (not definite and d and not i):
        return 'contradiction'
    return 'unresolved'


def marker_status(rule, correct, alt, context):
    """resolved_marker / instruction / contradiction / unresolved."""
    ctx = context.lower()
    side = {'going to ↔ Present Continuous (будущее)': ('going', 'cont_future'),
            'will ↔ going to': ('will', 'going'),
            'will ↔ Present Continuous (будущее)': ('will', 'cont_future'),
            'Present Perfect ↔ Past Simple': ('perfect', 'past'),
            'Past Simple ↔ Past Continuous': ('past', 'past_cont'),
            'Present Simple ↔ Present Continuous': ('simple_habit', 'cont_now'),
            'will ↔ Present Simple': ('will', 'simple_habit'),
            'Present Perfect ↔ Present Simple': ('perfect', 'simple_habit'),
            'Past Perfect ↔ Past Simple': ('pastperf', 'past'),
            'Past Perfect ↔ Present Perfect': ('pastperf', 'perfect')}.get(rule)
    if rule == 'will/shall/would' and {'will', 'shall'} <= set(expand(norm(correct + ' ' + alt))):
        return 'unresolved'  # I/we shall = I/we will: оба верны
    if rule.startswith('модальные') or rule == 'will/shall/would':
        return modal_status(correct, alt, ctx)
    if rule == 'this/that':
        return demonstrative_status(correct, alt, ctx)
    if rule == 'артикль':
        return article_status(correct, alt, ctx)
    if re.search(r'через (going to|will|present continuous|present perfect|past simple|past continuous|present simple|'
                 r'can|could|must|have to|should|some|any|the|a)\b', ctx):
        return 'instruction'
    if not side:
        return 'unresolved'
    tag_c = tense_tag(norm(correct))
    hits = {k: any(re.search(p, ctx) for p in MARKERS[k]) for k in side}
    # какая сторона у верного ответа
    first_is_correct = (tag_c == side[0]) or (side[0] == 'cont_future' and tag_c == 'cont') or \
                       (side[0] == 'simple_habit' and tag_c == 'simple')
    good, bad = (side[0], side[1]) if first_is_correct else (side[1], side[0])
    if hits[good] and not hits[bad]:
        return 'resolved_marker'
    if hits[bad] and not hits[good]:
        return 'contradiction'
    return 'unresolved'


def lesson_of(path_l):
    return int(path_l[1:])


def scan_course(rows):
    for L in sorted(d for d in os.listdir(COURSE) if re.fullmatch(r'l\d\d', d)):
        for s in sorted(os.listdir(os.path.join(COURSE, L))):
            f = os.path.join(COURSE, L, s, 'practice.atomic.json')
            if not os.path.exists(f):
                continue
            j = json.load(io.open(f, encoding='utf-8'))
            for it in j['interactionsByLocale'].get('ru', []):
                p = it.get('modePayload') or {}
                fam = p.get('family')
                iid = it['interactionId']
                scene = (p.get('localizedScene') or {}).get('ru') or it.get('prompt') or ''
                if fam == 'context_gap_grammar':
                    wrong = {cf['responseId']: cf for cf in p.get('choiceFeedback', []) if not cf.get('correct')}
                    opts = p.get('gapOptions', [])
                    right = [o for o in opts if o['responseId'] not in wrong]
                    if len(right) != 1:
                        continue
                    phrase = p.get('gappedTargetPhrase', '')
                    correct = phrase.replace('___', right[0]['text'])
                    for o in opts:
                        if o['responseId'] not in wrong:
                            continue
                        alt = phrase.replace('___', o['text'])
                        fb = wrong[o['responseId']].get('feedbackByLocale', {}).get('ru', '')
                        add(rows, 'course', L, s, iid, 'вставь слово', correct, alt, scene, fb)
                elif fam == 'phrase_builder':
                    toks = p.get('orderedTokens', [])
                    correct = p.get('targetPhrase') or ' '.join(toks)
                    fbs = {sf['responseId']: sf for sf in p.get('slotFeedback', [])}
                    for k, d in enumerate(p.get('authoredDistractorTokens', [])):
                        fb = (fbs.get(f'{iid}:tile:d{k + 1}') or {}).get('feedbackByLocale', {}).get('ru', '')
                        best = None
                        for i in range(len(toks)):
                            alt = ' '.join(toks[:i] + [d] + toks[i + 1:])
                            r = classify(' '.join(toks), alt)
                            if r:
                                best = alt
                                break
                        for i in range(len(toks) + 1):  # вставка лишней плитки (артикль, some, too)
                            if best:
                                break
                            alt = ' '.join(toks[:i] + [d] + toks[i:])
                            if classify(' '.join(toks), alt):
                                best = alt
                        if best:
                            add(rows, 'course', L, s, iid, 'собери фразу', ' '.join(toks), best, scene, fb)
                    order = movable_order(toks)
                    if order:
                        rows.append(dict(source='course', lesson=lesson_of(L), session=s, id=iid, kind='собери фразу',
                                         rule='порядок слов: обстоятельство времени можно в начало', order=order, correct=correct, alt='', scene=scene, feedback='',
                                         status='unresolved', self_admit=False))


TIME_MOVABLE = re.compile(r'^(yesterday|today|tomorrow|tonight|now|then|later|soon|sometimes|usually|'
                          r'last|next|every|on|in|at|this|after|before|when|if)$', re.I)


TIME_NOUNS = set('morning evening night week weekend month year summer winter spring autumn time day monday tuesday '
                 'wednesday thursday friday saturday sunday'.split())


def movable_order(toks):
    """Обстоятельство времени / придаточное, которое можно поставить и в начало, и в конец фразы."""
    low = [t.lower().strip('.,!?') for t in toks]
    if not low or low[-1] == '' or toks[-1].endswith('?'):
        return None
    if ',' in ''.join(toks):
        return None
    for n in (1, 2, 3):
        tail = low[-n:]
        if n == 1 and tail[0] in ('yesterday', 'today', 'tomorrow', 'tonight', 'sometimes'):
            return 'обстоятельство «' + ' '.join(toks[-n:]) + '» можно в начало'
        if n == 2 and tail[0] in ('last', 'next', 'every', 'this') and tail[1] in TIME_NOUNS and len(low) > n + 1:
            return 'обстоятельство «' + ' '.join(toks[-n:]) + '» можно в начало'
    return None


def add(rows, source, L, s, iid, kind, correct, alt, scene, fb):
    r = classify(correct, alt)
    if not r:
        return
    rule, cseg, aseg = r
    ctx = scene + ' ' + correct
    status = 'identical' if rule.startswith('сокращение') else marker_status(rule, correct, alt, ctx)
    rows.append(dict(source=source, lesson=lesson_of(L) if L else None, session=s, id=iid, kind=kind, rule=rule,
                     correct=correct, alt=alt, cseg=cseg, aseg=aseg, scene=scene, feedback=fb, status=status,
                     self_admit=bool(SELF_ADMIT.search(fb))))


OLD_PHRASE = re.compile(r"id:\s*'(lesson(\d+)_phrase_\d+)'(.*?)(?=\n\s*\{\s*\n\s*id:|\n\];)", re.S)
STR = r"""(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")"""


def s_of(m):
    return (m.group(1) if m.group(1) is not None else m.group(2)).replace("\\'", "'")


def scan_old(rows):
    seen = set()
    for fn in OLD_FILES:
        t = io.open(os.path.join(ROOT, 'app', fn), encoding='utf-8').read()
        for m in OLD_PHRASE.finditer(t):
            pid, lesson, body = m.group(1), int(m.group(2)), m.group(3)
            if pid in seen or 'wordsEn:' not in body:
                continue
            seen.add(pid)
            en = re.search(r'english:\s*' + STR, body)
            ru = re.search(r'russian:\s*' + STR, body)
            if not en:
                continue
            english, russian = s_of(en), (s_of(ru) if ru else '')
            alts = []
            am = re.search(r'alternatives:\s*\[(.*?)\]', body, re.S)
            if am:
                alts = [s_of(x) for x in re.finditer(STR, am.group(1))]
            words_en = body[body.index('wordsEn:'):]
            slots = []
            for wm in re.finditer(r"\{\s*text:\s*" + STR + r",\s*correct:\s*" + STR + r",\s*distractors:\s*\[(.*?)\]",
                                  words_en):
                text = wm.group(1) if wm.group(1) is not None else wm.group(2)
                ds = [s_of(x) for x in re.finditer(STR, wm.group(5))]
                slots.append((text, ds))
            toks = [x for x, _ in slots]
            for i, (w, ds) in enumerate(slots):
                for d in ds:
                    alt = ' '.join(toks[:i] + [d] + toks[i + 1:])
                    in_alts = any(norm(alt) == norm(a) or expand(norm(alt)) == expand(norm(a)) for a in alts)
                    r = classify(' '.join(toks), alt)
                    if in_alts:
                        rows.append(dict(source='old', lesson=lesson, session='', id=pid, kind='выбор слова',
                                         rule='дистрактор даёт фразу из alternatives', correct=english, alt=alt,
                                         cseg=w, aseg=d, scene=russian, feedback='', status='identical',
                                         self_admit=False))
                    elif r:
                        rule, cseg, aseg = r
                        st = 'identical' if rule.startswith('сокращение') else \
                            marker_status(rule, english, alt, russian + ' ' + english)
                        rows.append(dict(source='old', lesson=lesson, session='', id=pid, kind='выбор слова', rule=rule,
                                         correct=english, alt=alt, cseg=cseg, aseg=aseg, scene=russian, feedback='',
                                         status=st, self_admit=False))


def main():
    out = 'C:/Temp/claude/ambiguous.json'
    if '--out' in sys.argv:
        out = sys.argv[sys.argv.index('--out') + 1]
    rows = []
    scan_course(rows)
    scan_old(rows)
    io.open(out, 'w', encoding='utf-8').write(json.dumps(rows, ensure_ascii=False, indent=1))
    by = Counter((r['source'], r['rule'], r['status']) for r in rows)
    items = Counter((r['source'], r['rule']) for r in rows)
    print('кандидатов (пар верный/дистрактор):', len(rows), '; заданий:', len({r['id'] for r in rows}))
    for (src, rule), n in sorted(items.items(), key=lambda x: (x[0][0], -x[1])):
        st = ', '.join(f'{k[2]} {v}' for k, v in by.items() if k[0] == src and k[1] == rule)
        print(f'  [{src}] {rule}: {n}  ({st})')
    print('автор сам признаёт «тоже возможно»:', sum(r['self_admit'] for r in rows))
    print('JSON:', out)


if __name__ == '__main__':
    main()

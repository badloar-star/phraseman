"""Narrow A1 grammar for location statements, negation and polar questions; not a general Spanish parser."""
from __future__ import annotations
import hashlib,re,unicodedata

def ck(ok,msg):
    if not ok: raise ValueError(msg)
def bi(r,u): return {'ru':r,'uk':u}
def norm(s):return unicodedata.normalize('NFC',s).casefold()
def lower(w):return w[:1].lower()+w[1:]
def cap(w):return w[:1].upper()+w[1:]
V=['estoy','estás','está','estamos','estáis','están']; persons=['1s','2s','3s','1p','2p','3p']; names={'ana','luis'}
# Each tuple: attested subject expression, required form, English gloss, RU and UK rationale.
S={}
def subject(forms,verb,en,r,u):
    for f,e in zip(forms.split('|'),en.split('|'),strict=True):S[f]=(verb,e,r,u)
subject('él|ella|ana|luis','está','he|she|Ana|Luis','один человек','одна людина')
subject('ellos|ellas|ana y luis','están','they|they|Ana and Luis','несколько человек','кілька людей')
subject('la llave|el móvil|la mesa|el coche|la mochila|el libro|la estación|la tienda|el bolso|la parada|el hotel|el pasaporte|el billete|la salida','está','the key|the phone|the table|the car|the backpack|the book|the station|the shop|the bag|the bus stop|the hotel|the passport|the ticket|the exit','один предмет или одно место','один предмет або одне місце')
subject('las llaves|los libros|los coches|los billetes|los pasaportes','están','the keys|the books|the cars|the tickets|the passports','несколько предметов','кілька предметів')
# Register the location gloss as an expression: the Russian/Ukrainian preposition need not be a literal en.
LOC={}
for line in '''aquí|здесь|тут|here
allí|вон там|он там|over there
lejos|далеко|далеко|far away
cerca|рядом|поруч|nearby
dentro|внутри|всередині|inside
fuera|снаружи|надворі|outside
en casa|дома|вдома|at home
en clase|на занятии|на занятті|in class
en la cocina|на кухне|на кухні|in the kitchen
en la mesa|на столе|на столі|on the table
en la puerta|у входа, у двери|біля входу, біля дверей|at the door
en la estación|на станции|на станції|at the station
en el coche|в машине|у машині|in the car
en la mochila|в рюкзаке|у рюкзаку|in the backpack
en la tienda|в магазине|у магазині|in the shop
en la oficina|в офисе|в офісі|in the office
en el bolso|в сумке|у сумці|in the bag
en el bolsillo|в кармане|у кишені|in the pocket
en la parada|на остановке|на зупинці|at the bus stop
en la salida|у выхода|біля виходу|at the exit
en el hotel|в отеле|у готелі|at the hotel'''.splitlines():
    es,r,u,e=line.split('|');LOC[es]=(r,u,e)
EXTRA='''no_neg|no|no|не; ставится перед формой estar|не; ставимо перед формою estar|core|neg
tienda|tienda|tienda|магазин|магазин|core|noun
oficina|oficina|oficina|офис|офіс|core|noun
bolso|bolso|bolso|сумка (не рюкзак)|сумка (не рюкзак)|core|noun
bolsillo|bolsillo|bolsillo|карман|кишеня|core|noun
parada|parada|parada|остановка (транспорта)|зупинка (транспорту)|core|noun
hotel|hotel|hotel|отель|готель|core|noun
pasaporte|pasaporte|pasaporte pasaportes|паспорт|паспорт|core|noun
billete|billete|billete billetes|билет (на транспорт, Испания)|квиток (на транспорт, Іспанія)|core|noun
salida|salida|salida|выход|вихід|core|noun'''
POOL={'verb':V,'neg':'no sí ya hoy aquí también'.split(),'prep':'en de para sin entre desde'.split(),'article':'el la los las le les'.split(),'place':'aquí allí lejos cerca dentro fuera'.split(),'person':'él ella ellos ellas tú yo'.split(),'name':'Ana Luis Marta Pablo Elena Diego'.split(),'join':'y o pero ni sin con'.split()}
DETS={'móvil':'el','llave':'la','clase':'la','casa':'la','llaves':'las','mesa':'la','coche':'el','coches':'los','libro':'el','libros':'los','mochila':'la','cocina':'la','puerta':'la','estación':'la','tienda':'la','oficina':'la','bolso':'el','bolsillo':'el','parada':'la','hotel':'el','pasaporte':'el','pasaportes':'los','billete':'el','billetes':'los','salida':'la'}
POOL['noun']=list(DETS)
PR={'estoy':['yo'],'estás':['tú'],'está':['usted'],'estamos':['nosotros','nosotras'],'estáis':['vosotros','vosotras'],'están':['ustedes']}
IMP={'estoy':('я','я','I'),'estás':('ты','ти','you'),'está':('вы, один собеседник на usted','ви, один співрозмовник на usted','you'),'estamos':('мы','ми','we'),'estáis':('вы, друзья на vosotros','ви, друзі на vosotros','you'),'están':('вы, несколько собеседников на ustedes','ви, кілька співрозмовників на ustedes','you')}
RULE={'01':'estar.location.pres.ind.affirm','02':'estar.location.pres.ind.negative','03':'estar.location.pres.ind.polar'}

def decode(es,lid):
    mark=lid=='03';ck(bool(re.fullmatch(r'¿[^¿?.!]+\?' if mark else r'[^¿?.!]+\.',es)),'Punctuation: '+es)
    raw=(es[1:-1] if mark else es[:-1]);t=raw.split(' ');ck(all(w.isalpha() for w in t) and raw[0].isupper(),'Token/case: '+es);w=[norm(x) for x in t];vi=[i for i,x in enumerate(w) if x in V];ck(len(vi)==1,'Single estar: '+es);i=vi[0];v=w[i];neg=lid=='02';ck(w.count('no')==int(neg) and (not neg or i>0 and w[i-1]=='no'),'Placement of no: '+es)
    loc=next((k for k in sorted(LOC,key=len,reverse=True) if ' '.join(w).endswith(' '+k)),None);ck(loc,'Invalid location: '+es);end=len(w)-len(loc.split());a=w[:i-int(neg)];b=w[i+1:end];ck(not (a and b) and (mark or not b) and i<end,'Clause order: '+es);sub=' '.join(a or b);ck(not sub or sub in S and S[sub][0]==v,'Subject and verb mismatch '+es)
    return t,v,sub,loc

def display_str(s,q):return ('¿' if q else '')+cap(s)+('?' if q else '.')
def variants(sub,v,loc,kind,as_written):
    neg=kind=='02';q=kind=='03';vv=('no ' if neg else '')+v
    su=' '.join(x.title() if x in names else x for x in sub.split());items=[]
    if not sub:
        items += [f'{pr} {vv} {loc}' for pr in PR[v]]
    elif q:
        items.extend([f'{su} {vv} {loc}', f'{vv} {su} {loc}'])
    elif sub in ('él','ella','ellos','ellas'):
        items.append(f'{vv} {loc}')
    return sorted({display_str(x,q) for x in items}-{as_written})

def english(sub,v,loc,lid):
    pr=S[sub][1] if sub else IMP[v][2];be='am' if pr=='I' else 'are' if pr in ('we','you','they','Ana and Luis') or v=='están' else 'is';loc=LOC[loc][2];s=(f'{be} {pr} {loc}?' if lid=='03' else f'{pr} {be} '+('not ' if lid=='02' else '')+loc+'.');return cap(s)

def analyse(sub,v,loc,lid):
    es_sub=' '.join(x.title() if x in names else x for x in sub.split());r,u,en=LOC[loc];imp=IMP[v]
    agreement=bi(f'«{es_sub}» — {S[sub][2]}; поэтому {v}.' if sub else f'Форма {v} уже указывает на «{imp[0]}»; отдельное местоимение не обязательно.',f'«{es_sub}» — {S[sub][3]}; тому {v}.' if sub else f'Форма {v} уже вказує на «{imp[1]}»; окремий займенник не обов’язковий.')
    locnote=bi(f'{loc} — «{r}». '+('Здесь место выражено группой с en.' if loc.startswith('en ') else 'Это слово уже называет место; en перед ним не ставим.'),f'{loc} — «{u}». '+('Тут місце передає сполучення з en.' if loc.startswith('en ') else 'Це слово вже позначає місце; en перед ним не ставимо.'))
    op={'01':bi(f'Это утверждение: поставь {v} и назови место.',f'Це твердження: постав {v} і назви місце.'),'02':bi(f'Собери no → {v}. Это отрицает именно то место, которое названо дальше.',f'Склади no → {v}. Це заперечує саме те місце, яке названо далі.'),'03':bi('Спрашиваешь «да или нет», а не «где?». Не добавляй dónde. Знаки вопроса появятся сами.','Питаєш «так чи ні», а не «де?». Не додавай dónde. Знаки питання з’являться самі.')}[lid]
    return {'agreement':agreement,'meaning':locnote,'operation':op}

def slot(word,entry,pid,i,tokens,analysis,alts):
    k=norm(word);g=entry['group']; atstart=i==0
    def ranking(a,tag):return hashlib.sha256(f'{pid}|{i}|{tag}|{a}'.encode()).digest()
    def case(a):return a if g=='name' else cap(a) if atstart else lower(a)
    # No genuinely valid next word from a recorded alternative becomes a distractor.
    pref=[norm(z) for z in tokens[:i]];ban={k}
    for alt in alts:
        z=[norm(w) for w in re.findall(r'[^\W\d_]+',alt)];
        if len(z)>i and z[:i]==pref:ban.add(z[i])
    candidates=[case(w) for w in POOL[g] if norm(w) not in ban];wrong=sorted(candidates,key=lambda x:ranking(x,'pick'))[:5];choices=sorted([word,*wrong],key=lambda x:ranking(x,'show'));ck(len({norm(w) for w in choices})==6,'Tile shortage: '+pid+':'+word)
    if g=='verb':note=analysis['agreement'];tag='agreement'
    elif g=='neg':note=analysis['operation'];tag='negation'
    elif g=='prep' or g=='place':note=analysis['meaning'];tag='location'
    elif g=='article':
        nxt=tokens[i+1];note=bi(f'В этой фразе название идёт с артиклем: {k} {nxt}. Запоминай их вместе.',f'У цій фразі назва має артикль: {k} {nxt}. Запам’ятовуй їх разом.');tag='article'
    elif g=='join':note=bi('Y соединяет два имени. Вместе они требуют están.','Y поєднує два імені. Разом вони потребують están.');tag='coordination'
    else:note=bi(f'{word} здесь означает «{entry["ru"]}». Сверь с тем, о ком или о чём говорится в задании.',f'{word} тут означає «{entry["uk"]}». Звір із тим, про кого або про що йдеться в завданні.');tag='meaning'
    return {'text':word,'correct':word,'choices':choices,'distractors':wrong,'category':g,'senseId':entry['id'],'explanation':note,'errorTag':tag}

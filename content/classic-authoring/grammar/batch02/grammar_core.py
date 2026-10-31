"""Bounded compiler for classic Spanish lessons 4–6; deliberately not a general Spanish parser."""
import hashlib, random, re, unicodedata

def bi(r,u):return {'ru':r,'uk':u}
def ck(v,m):
    if not v:raise ValueError(m)
def key(s):return unicodedata.normalize('NFC',s).casefold()
def cap(w):return w[:1].upper()+w[1:]
SER='soy eres es somos sois son'.split(); EST='estoy estás está estamos estáis están'.split(); PRO='yo tú él/ella/usted nosotros/as vosotros/as ellos/ellas/ustedes'.split()
PERSON=[('я','я'),('ты','ти'),('один человек или предмет','одна людина або річ'),('мы','ми'),('вы, неформально к группе в Испании','ви, неформально до групи в Іспанії'),('несколько людей или предметов','кілька людей або предметів')]
FORM_EXT={'bolso':'bolsos','mochila':'mochilas','movil':'móviles','tienda':'tiendas','bolsillo':'bolsillos'}
NO_PLURAL={'estación','profesor','móvil','pasaporte','billete','estudiante','coche','hotel','tren','mapa','foto'}
MASC='pasaporte billete bolso tren hotel móvil mapa coche libro bolsillo médico profesor enfermero'.split(); FEM='llave maleta mochila tienda foto mesa cocina estación parada salida oficina médica profesora enfermera casa puerta clase'.split()
DUAL={'estudiante','guía'}; NAMES={'ana','luis'};SUBJ={'ana':'3s','luis':'3s','él':'3s','ella':'3s','usted':'3s','ellos':'3p','ellas':'3p','ustedes':'3p','ana y luis':'3p'};PERSONS=['1s','2s','3s','1p','2p','3p'];DET=['el','la','los','las']; WH=['dónde','quién','quiénes','qué'];ALLVERBS=SER+EST

def singular(w):
    if w in {'profesores','trenes'}:return w[:-2]
    return {'móviles':'móvil'}.get(w,w[:-1] if w.endswith('s') else w)
def gender(w):
    s=singular(w);return ('m' if s in MASC else 'f' if s in FEM else 'common' if s in DUAL else None)
def garticle(w,art):return art in DET and (art in ('los','las'))==w.endswith('s') and (gender(w)=='common' or (gender(w)=='m' and art in ('el','los')) or (gender(w)=='f' and art in ('la','las')))
def words(es):return es.removeprefix('¿')[:-1].split(' ')
def morphology(es,lid):
    q=lid==5;ck(bool(re.fullmatch(r'¿[^¿?.!]+\?' if q else r'[^¿?.!]+\.',es)),'punctuation: '+es);t=words(es);ck(t[0][0].isupper() and all(x.isalpha() for x in t),'tokenization '+es);w=list(map(key,t));vs=[i for i,x in enumerate(w) if x in ALLVERBS];ck(len(vs)==1,'finite verb '+es);i=vs[0];v=w[i];base='ser' if v in SER else 'estar';person=PERSONS[(SER if v in SER else EST).index(v)]
    for j,x in enumerate(w):
        if x in DET:ck(j+1<len(w) and garticle(w[j+1],x),'bad determiner '+es)
    if lid==4:
        ck(base=='ser' and i<len(w)-1 and w.count('no')==0,'identity '+es);sub=' '.join(w[:i]);ck(not sub or SUBJ.get(sub)==person,'identity subject '+es);tail=w[i+1:];r=tail[-1];isname=r in NAMES;ck((isname and (' '.join(tail) in ('ana','luis','ana y luis'))) or (gender(r) and singular(r) in {'médico','médica','profesor','profesora','estudiante','guía','enfermero','enfermera'} and (len(tail)==1 or len(tail)==2 and tail[0] in DET)),'bad complement '+es)
        if not isname:ck(r.endswith('s')==person.endswith('p'),'predicate number '+es)
    elif lid==5:
        ck(w[0] in WH and 'no' not in w,'question '+es);sub=' '.join(w[i+1:]) if w[0]=='dónde' else ' '.join(w[1:i]) if w[0]=='qué' and i>1 else w[0];
        if w[0]=='dónde':
            ck(i==1 and base=='estar','where order '+es)
            if sub:ck((SUBJ.get(sub) or ('3p' if w[i+1] in ['los','las'] else '3s'))==person,'where agreement '+es)
        elif w[0]=='qué':
            if i==1:ck(w[2:] in (['esto'],['eso']) and v=='es','what is this '+es)
            else:ck(i==2 and base=='estar' and w[1].endswith('s')==(v=='están'),'which agreement '+es)
        else:
            ck(i==1,'who order '+es)
            if w[0]=='quiénes':ck(v=='son','who plural '+es)
            else:ck(v in ['está','es','eres'],'who singular '+es)
    else:
        ck(i==2 and w[0] in DET and base=='estar' and v==('están' if w[0] in ('las','los') else 'está'),'article subject '+es);sub=' '.join(w[:i]);ck(w[i+1:] and (w[i+1] in ['aquí','allí','dentro','fuera','cerca','lejos','en']),'location '+es)
    return t,w,i,v,person,base,sub

def agreement(v,person,sub):
    n=PERSONS.index(person);r,u=PERSON[n];subject=('«'+sub+'»' if sub else '—');return bi(f'{v} — форма для «{r}». '+(f'Ориентир в этом образце: {subject}.' if sub else 'Местоимение опущено: нужное лицо подсказывает сама форма.'),f'{v} — форма для «{u}». '+(f'Орієнтир у цьому зразку: {subject}.' if sub else 'Займенник пропущено: потрібну особу підказує сама форма.'))
def article_note(art,noun):
    num=art in ('los','las');fem=art in ('la','las');rt='женский' if fem else 'мужской';ut='жіночий' if fem else 'чоловічий';rg='несколько' if num else 'один человек или предмет';ug='кілька' if num else 'одна людина або річ';common=gender(noun)=='common'
    return bi(f'{art} {noun}: {rt} род, '+('множественное число.' if num else 'единственное число.')+(' У этого названия форма одинакова для мужчин и женщин; ориентируйся на контекст.' if common else ' Род выбираем по испанскому слову, не по переводу.'),f'{art} {noun}: {ut} рід, '+('множина.' if num else 'однина.')+(' Ця назва має однакову форму для чоловіків і жінок; зважай на контекст.' if common else ' Рід визначаємо за іспанським словом, не за перекладом.'))

def analyse(es,lid,book,look):
    t,w,i,v,person,base,sub=morphology(es,lid); ag=agreement(v,person,sub); a=bi(' → '.join(t),' → '.join(t));articles=[article_note(x,w[j+1]) for j,x in enumerate(w) if x in DET]; wh=w[0] if lid==5 else '';tail=' '.join(t[i+1:]);piece=' '.join(t[:i]);
    if lid==4:
        op=bi(f'Здесь {v} называет личность или роль. После глагола собираем «{tail}», а не место. Для места снова понадобился бы estar.',f'Тут {v} називає особу або роль. Після дієслова складаємо «{tail}», а не місце. Для місця знову знадобилося б estar.'); meaning=(articles[0] if articles else (bi(f'«{tail}» — имя. Чтобы представиться, не нужно добавлять артикль перед именем.',f'«{tail}» — ім’я. Щоб представитися, не треба додавати артикль перед іменем.') if w[-1] in NAMES else bi(f'«{tail}» называет профессию или род занятий без уточнения «тот самый». В таком нейтральном ответе артикль не нужен.',f'«{tail}» називає фах або рід занять без уточнення «той самий». У такій нейтральній відповіді артикль не потрібен.')))
    elif lid==5:
        op={'dónde':bi('Нужен ответ о месте, а не «да/нет»: начни с dónde. Во второй позиции — знакомая форма estar.','Потрібна відповідь про місце, а не «так/ні»: почни з dónde. У другій позиції — знайома форма estar.'),'quién':bi('Нужно назвать человека: quién. Если известно место, следующий глагол estar; если спрашиваем, кто перед нами, нужен ser.','Треба назвати людину: quién. Якщо відоме місце, далі дієслово estar; якщо питаємо, хто перед нами, потрібне ser.'),'quiénes':bi('Ты спрашиваешь сразу о нескольких людях. У самого вопросительного слова есть множественная форма: quiénes.','Ти питаєш одразу про кількох людей. У самого питального слова є форма множини: quiénes.'),'qué':bi('Qué спрашивает о вещи или о выборе. Перед названием предмета оно не меняется по роду или числу.','Qué позначає запитання про річ або вибір. Перед назвою предмета воно не змінюється за родом чи числом.')}[wh]; meaning=(bi(f'«{piece}» — одна группа: «какой/какие …?». Между qué и существительным нет артикля.',f'«{piece}» — одна група: «який/які …?». Між qué та іменником немає артикля.') if wh=='qué' and i>1 else bi(f'Прочитай целый вопрос: {es} Здесь {base} '+('указывает на местонахождение.' if base=='estar' else 'помогает узнать личность или название.'),f'Прочитай запитання повністю: {es} Тут {base} '+('вказує на місце.' if base=='estar' else 'допомагає з’ясувати особу або назву.')))
        if wh in ('quién','quiénes') and base=='ser':ag=bi(f'В этой фразе собеседник или названная группа определяют форму {v}: {es}',f'У цій фразі адресат або названа група визначають форму {v}: {es}')
    else:
        op=articles[0];meaning=articles[1] if len(articles)>1 else bi(f'«{tail}» отвечает на вопрос «где?». Число глагола зависит от «{piece}», а не от места.',f'«{tail}» відповідає на запитання «де?». Число дієслова залежить від «{piece}», а не від місця.')
    return {'agreement':ag,'operation':op,'meaning':meaning,'assembly':a,'subject':sub,'verb':v,'verbLemma':base,'person':person,'wordOrder':' '.join(t)},(t,w,i,v,person,base,sub)

ROLE='médico médica médicos médicas profesor profesora profesores profesoras estudiante estudiantes guía guías enfermero enfermera'.split(); NOUN='pasaporte pasaportes billete billetes maleta maletas llave llaves tren trenes mapa mapas foto fotos bolso bolsos mochila mochilas coche coches móvil móviles tienda tiendas libro libros mesa cocina puerta estación hotel bolsillo bolsillos salida parada oficina clase casa'.split()
POOL={'wh':['dónde','quién','quiénes','qué','cuándo','cómo','cuánto','cuánta'],'demo':['esto','eso','hoy','aquí','allí','ayer','mañana'],'article':['el','la','los','las','en','de'],'role':ROLE,'noun':NOUN,'person':'él ella ellos ellas usted ustedes yo tú nosotros vosotros'.split(),'name':'Ana Luis Sara Elena Pablo Rosa'.split(),'join':'y o pero ni sin con'.split(),'place':'aquí allí lejos cerca dentro fuera'.split(),'prep':'en de para sin entre desde'.split()}

def alternatives(es,lid,ctx):
    t,w,i,v,person,base,sub=ctx;out=[];pron={'1s':'Yo','2s':'Tú','3s':'Usted','1p':'Nosotros','2p':'Vosotros','3p':'Ustedes'}[person];rest=' '.join(t[i+1:]);pred=w[-1];
    if lid==4 and not sub:
        if person in ('1p','2p') and (pred in ('médicas','profesoras') or 'las' in w):pron=pron.replace('os','as')
        out.append(pron+' '+v+' '+rest+'.');
        if person in ('1p','2p') and pred in ('estudiantes','guías') and not any(x in w for x in DET):out.append(pron.replace('os','as')+' '+v+' '+rest+'.')
    if lid==4 and sub in ('él','ella','ellos','ellas','usted'):out.append(cap(v)+' '+rest+'.')
    if lid==5 and w[0]=='dónde' and i==1 and not sub:
        end={'1s':'yo','2s':'tú','1p':'nosotros','2p':'vosotros'}.get(person);out+=([f'¿Dónde {v} {end}?'] if end else [])
    if es=='¿Dónde están ustedes?':out.append('¿Dónde están?')
    if lid==6:
        lead=rest if rest.startswith('en ') else rest.lower();out.append(cap(lead)+' '+v+' '+' '.join(w[:i])+'.')
    return list(dict.fromkeys(x for x in out if x!=es))

def slot(lid,pid,j,ctx,analysis,entry,alternates):
    t,w,i,v,person,base,sub=ctx;x=w[j];g=entry['group']; rg=analysis['agreement']; note=bi(f'В образце «{t[j]}» передаёт: {entry["ru"]}.',f'У зразку «{t[j]}» передає: {entry["uk"]}.')
    if g=='verb': choices=(SER if x in SER else EST);note=rg
    else:
        choices=POOL[g];
        if g=='article':note=article_note(x,w[j+1])
        elif g=='wh':note=analysis['operation']
        elif g=='role' and (j==0 or w[j-1] not in DET):note=bi(f'Нужно название «{entry["ru"]}» в форме {x}. При простом названии профессии после ser артикль не требуется.',f'Потрібна назва «{entry["uk"]}» у формі {x}. Коли просто називаємо фах після ser, артикля не потрібно.') if lid==4 else note
        elif g=='prep' and x=='en':note=bi('En вводит место: по-русски тут может понадобиться «в», «на» или «у».','En вводить місце: українською тут можуть знадобитися «у», «на» або «біля».')
    banned={x};
    # Do not penalize the start of a listed variant. Also exclude gender-equivalent profession distractors if the source does not require gender.
    for alt in alternates:
        aw=list(map(key,words(alt)))
        if len(aw)>j and aw[:j]==w[:j]:banned.add(aw[j])
    if g=='wh' and x in ['quién','quiénes']:banned.update(['quién','quiénes'])
    rng=random.Random(int.from_bytes(hashlib.sha256((pid+'#'+str(j)).encode()).digest()[:8],'big'));pool=[z for z in choices if key(z) not in banned];rng.shuffle(pool);ds=[cap(z) if j==0 or g=='name' else z for z in pool[:5]];ck(len(ds)==5 and len(set(map(key,ds+[t[j]])))==6,'six words '+pid+str(j));six=[t[j],*ds];rng.shuffle(six);return {'text':t[j],'correct':t[j],'distractors':ds,'choices':six,'senseId':entry['id'],'category':g,'errorTag':g,'explanation':note}

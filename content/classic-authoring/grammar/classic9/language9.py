"""Bounded editorial grammar for the 7–9 phrase banks. No network or runtime dependencies."""
import hashlib, random, re
from collections import OrderedDict

def bi(r,u): return {'ru':r,'uk':u}
def split(s):return re.findall(r'[^\W\d_]+',s,flags=re.U)
def rev(xs):return list(dict.fromkeys(xs))
def require(x,m):
 if not x: raise ValueError(m)
ROOTS=['trabajar','estudiar','hablar','buscar']
END=['o','as','a','amos','áis','an']; PERSON=['yo','tú','él / ella / usted','nosotros/as','vosotros/as','ellos / ellas / ustedes']; PC=['1s','2s','3s','1p','2p','3p']; PRU=['я','ты','он, она или один адресат на «вы»','мы','вы, несколько друзей в Испании','они или несколько адресатов на ustedes'];PUK=['я','ти','він, вона або один адресат на «ви»','ми','ви, кілька друзів в Іспанії','вони або кілька адресатів на ustedes']
VFORMS={**{r:[r[:-2]+e for e in END] for r in ROOTS},'estar':['estoy','estás','está','estamos','estáis','están'],'ser':['soy','eres','es','somos','sois','son'],'haber':['hay']}; VLOOK={w:(v,k) for v,forms in VFORMS.items() for k,w in enumerate(forms)}
NEW='''haber_exist|haber|hay|hay (haber)|есть, имеется; говоря о наличии|є, наявне; про наявність|verb
art_indef|un / una|un una|un / una|неопределённый артикль, один предмет|неозначений артикль, один предмет|article
dos_num|dos|dos|dos|два, две|два, дві|number
agua|agua|agua|el agua|вода|вода|noun
cafe_drink|café|café|el café|кофе, напиток|кава, напій|noun
gente|gente|gente|la gente|люди (собирательное слово)|люди (збірна назва)|noun
hoy|hoy|hoy|hoy|сегодня|сьогодні|time
mi_pos|mi|mi mis|mi / mis|мой, моя, мои|мій, моя, мої|possessive
tu_pos|tu|tu tus|tu / tus|твой, твоя, твои|твій, твоя, твої|possessive
su_pos|su|su sus|su / sus|его, её, их; Ваш при вежливом обращении|його, її, їхній; Ваш за ввічливого звертання|possessive
hermano_family|hermano|hermano hermana hermanos hermanas|el hermano / la hermana|брат / сестра|брат / сестра|noun
madre|madre|madre|la madre|мама, мать|мама, мати|noun
clase_group|clase|class_group_only|la clase (группа / група)|класс, учебная группа|клас, навчальна група|noun
clase_room|clase|class_room_only|la clase (аудитория / аудиторія)|класс, учебная аудитория|клас, навчальна аудиторія|noun
espanol_lang|español|español|el español|испанский язык|іспанська мова|language
ingles_lang|inglés|inglés|el inglés|английский язык|англійська мова|language'''
VERB_KEYS={'estar':'estar_loc','ser':'ser_id','haber':'haber_exist',**{r:r for r in ROOTS}}
def prepare(book):
 look={f.lower():k for k,x in book.items() for f in x['formsSeen']}; meta=NEW.splitlines()+['|'.join([v,v,' '.join(VFORMS[v]),v,r,u,'verb']) for v,r,u in zip(ROOTS,['работать','учиться; изучать','говорить','искать'],['працювати','навчатися; вивчати','говорити','шукати'])]
 for row in meta:
  key,lem,forms,d,r,u,g=row.split('|');require(key not in book,'reintroduced key '+key);book[key]={'id':key,'lemma':lem,'display':d,'ru':r,'uk':u,'group':g,'tier':'core','examples':[],'formsSeen':[]}
  for w in forms.split():
   if w.endswith('_only'):continue
   require(w not in look or look[w]==key,'ambiguous '+w);look[w]=key
 return look

def getid(w,pid,look):
 if w=='clase' and pid in ('es:08:49','es:09:37'):return 'clase_group' if pid=='es:08:49' else 'clase_room'
 return look[w]
POSS='mi mis tu tus su sus'.split(); DET='el la los las'.split(); INDEF=['un','una']; NUM=['dos','tres','cuatro','cinco','seis','ocho','diez']; Nouns='libro mochila llave bolso puerta móvil casa maleta mesa tren mapa tienda oficina coche bolsillo billete foto estación pasaporte'.split(); Places='aquí allí dentro fuera cerca lejos'.split();PREPS='en para hasta sin desde hacia entre sobre con por de'.split(); NO='no ya siempre nunca aún también hoy'.split()

def phrase_notes(n,ws,idx,vi,lem,person,row):
 v=ws[vi];starts=ws[0]; ru,uk=row[1:3]; subj=' '.join(ws[:vi]).replace('¿','').strip();sg=' '.join(ws);ag=bi(f'«{v}» — форма для «{PRU[person]}». Смотри, кто выполняет действие.',f'«{v}» — форма для «{PUK[person]}». Визнач, хто виконує дію.')
 if n==7:
  obj=ws[vi+1:];c=next((x for x in obj if x in INDEF+['dos']),None)
  ag=bi('Hay — безличная форма: здесь не ищем подлежащее для согласования.','Hay — безособова форма: тут не шукаємо підмета для узгодження.')
  op=bi('No непосредственно перед hay отрицает наличие.','No безпосередньо перед hay заперечує наявність.') if 'no' in ws else bi('¿…? превращает сообщение о наличии в вопрос, не меняя hay.','¿…? перетворює повідомлення про наявність на запитання, не змінюючи hay.') if row[0].startswith('¿') else bi('Сначала названо место, потом hay и то, что там обнаружили.','Спершу названо місце, далі hay і те, що там знайшли.') if vi else bi('Начинаем с hay, затем называем то, что имеется; место, если оно названо, идёт следом.','Починаємо з hay, потім називаємо те, що є; місце, якщо воно вказане, йде далі.')
  fragment=' '.join(obj[:2]) if c else obj[0]; me=bi(f'«{fragment}»: dos указывает точное количество, а существительное стоит во множественном числе.',f'«{fragment}»: dos указує точну кількість, а іменник стоїть у множині.') if c=='dos' else bi(f'«{fragment}» представляет один предмет впервые: артикль выбран по роду испанского слова.',f'«{fragment}» уперше називає один предмет: артикль обрано за родом іспанського слова.') if c else bi(f'«{fragment}» здесь без артикля: речь о наличии вообще, не о конкретном уже известном предмете.',f'«{fragment}» тут без артикля: ідеться про наявність узагалі, а не про конкретну вже відому річ.')
 elif n==8:
  pairs=[(w,ws[i+1]) for i,w in enumerate(ws[:-1]) if w in POSS];ps,ns=pairs[0];nb=len(pairs);group=' / '.join(w+' '+noun for w,noun in pairs)
  ag=bi(f'В группе «{ps} {ns}» выбирай {ps} по владельцу и числу того, что названо существительным {ns}.',f'У групі «{ps} {ns}» обирай {ps} за власником і числом того, що названо іменником {ns}.')
  op=bi('Два владельца: сначала разбери первую пару, затем вторую. Их формы не обязаны совпадать.','Два власники: спершу розбери першу пару, тоді другу. Їхні форми не обов’язково однакові.') if nb==2 else bi(f'«{group}» образует единую группу. Не добавляй определённый артикль между притяжательным словом и существительным.',f'«{group}» утворює єдину групу. Не додавай означеного артикля між присвійним словом та іменником.')
  me=bi(f'Форма {v} выбрана по подлежащему, не по владельцу. '+('Ser здесь называет профессию.' if lem=='ser' else 'Estar здесь сообщает местонахождение или принадлежность к классу.' if idx==49 else 'Estar здесь указывает местонахождение.'),f'Форму {v} обрано за підметом, не за власником. '+('Ser тут називає професію або рід занять.' if lem=='ser' else 'Estar тут показує належність до класу.' if idx==49 else 'Estar тут указує місце.'))
 else:
  ag=bi(f'{lem} → {lem[:-2]}- + -{END[person]} → {v}. Действующее лицо: {PRU[person]}.',f'{lem} → {lem[:-2]}- + -{END[person]} → {v}. Виконавець дії: {PUK[person]}.')
  op=bi(f'Отрицание no ставится прямо перед личной формой {v}. Окончание при отрицании не меняется.',f'Заперечення no ставимо безпосередньо перед особовою формою {v}. Закінчення при запереченні не змінюється.') if 'no' in ws else bi(f'В вопросе остаётся та же форма {v}; отдельное вспомогательное слово не нужно.',f'У запитанні залишається та сама форма {v}; окреме допоміжне слово не потрібне.') if row[0].startswith('¿') else bi(f'В настоящем времени {v} само называет действие: не прибавляй ser или estar.',f'У теперішньому часі {v} саме називає дію: не додавай ser або estar.')
  me={'trabajar':bi('Здесь речь о работе, а место или время — отдельное уточнение.','Тут ідеться про роботу, а місце чи час — окреме уточнення.'),'estudiar':bi('Estudiar называет учёбу. Название языка после него отвечает на «что изучать?», а en указывает место.','Estudiar означає навчання. Назва мови після нього відповідає на «що вивчати?», а en указує місце.'),'hablar':bi('Hablar + название языка — говорить на этом языке. Это не то же самое, что estudiar, то есть изучать.','Hablar + назва мови — говорити цією мовою. Це не те саме, що estudiar, тобто вивчати.'),'buscar':bi('После buscar прямо назови предмет поиска. Предлог перед вещью не нужен.','Після buscar прямо назви предмет пошуку. Перед річчю прийменник не потрібний.')}[lem]
 return ag,op,me

def choices_and_note(pid,j,words,entry,alternatives,allnotes):
 w=words[j];low=w.lower();k=entry['id'];g=entry['group'];ag,op,me=allnotes
 default=bi('В этом переводе '+w+' передаёт: '+entry['ru']+'.','У цьому перекладі '+w+' передає: '+entry['uk']+'.');note=default
 if low in VLOOK:
  v,i=VLOOK[low];pool=VFORMS[v] if v!='haber' else ['hay','han','habéis','he','somos','eres','soy']; note=bi('Неизменное hay сообщает о наличии; для нескольких вещей оно имеет ту же форму.','Незмінне hay повідомляє про наявність; для кількох речей форма та сама.') if low=='hay' else bi(f'{v} → {low}: форма для «{PRU[i]}».',f'{v} → {low}: форма для «{PUK[i]}».')
 elif low in POSS:
  pool=POSS; nextw=words[j+1].lower(); count='несколько' if low.endswith('s') else 'один'; cu='кілька' if low.endswith('s') else 'один';note=bi(f'Следующее слово — {nextw}. Выбери владельца по переводу и число по предмету ({count}): {low}.',f'Наступне слово — {nextw}. Обери власника за перекладом, а число — за предметом ({cu}): {low}.')
 elif low in INDEF:pool=['un','una','unos','unas','del','al','mis'];note=bi(f'{low} вводит один предмет впервые и согласуется с {words[j+1]} по роду.',f'{low} уперше називає один предмет і узгоджується з {words[j+1]} за родом.')
 elif low in DET:pool=DET+['sin','hacia','desde','entre','al'];note=bi(f'Артикль {low} относится к {words[j+1]}; согласуй его по роду и числу с этим испанским существительным.',f'Артикль {low} стосується {words[j+1]}; узгодь його за родом і числом із цим іспанським іменником.')
 elif low=='dos':pool=NUM;note=bi('Точное число — два. Dos подходит и для книг, и для ключей.','Точна кількість — два. Dos підходить і для книжок, і для ключів.')
 elif low in Places:pool=Places
 elif low=='en':pool=['en','sin','desde','hacia','entre','hasta','contra'];note=bi('Место обозначаем через en. В en la mesa это «на столе», в en la mochila — «в рюкзаке».','Місце передаємо через en. В en la mesa це «на столі», в en la mochila — «у рюкзаку».')
 elif low=='no':pool=['no','sí','quizá','nunca','siempre','también','casi'];note=bi('Для простого отрицания нужно no перед глаголом. Nunca означало бы «никогда».','Для простого заперечення потрібне no перед дієсловом. Nunca означало б «ніколи».')
 elif g=='name':pool=['Ana','Luis','Marta','Pablo','Rosa','Jorge','Elena']
 elif g=='language':pool=['español','inglés','francés','alemán','italiano','japonés','ruso'];note=bi('После глагола назови нужный язык: '+entry['ru']+'. Названия языков пишутся со строчной буквы.','Після дієслова назви потрібну мову: '+entry['uk']+'. Назви мов пишуться з малої літери.')
 elif low=='hoy':pool='hoy mañana ayer siempre nunca luego pronto'.split()
 elif low=='usted':pool='usted tú vosotros nosotros ellas ellos yo'.split()
 elif low=='dónde':pool='dónde cuándo quién cómo cuánto por qué'.split()
 elif low=='y':pool='y o sin ni aunque porque pero'.split()
 else:pool=Nouns.copy();pool=[p+'s' if low.endswith('s') and not p.endswith('s') and p[-1] in 'aeiou' else p for p in pool];pool.extend(['agua','café','gente','madre','hermana','hermano'])
 rng=random.Random(int.from_bytes(hashlib.sha256((pid+'|'+str(j)).encode()).digest()[:8],'big')); banned={low}; pref=[x.lower() for x in words[:j]]
 for alt in alternatives:
  aw=[x.lower() for x in split(alt)];
  if len(aw)>j and aw[:j]==pref:banned.add(aw[j])
 ds=[z for z in rev(pool) if z.lower() not in banned];rng.shuffle(ds);ds=ds[:5];require(len(ds)==5,'options '+pid+':'+str(j));ds=[z[:1].upper()+z[1:] if j==0 else z for z in ds];opts=[w,*ds];rng.shuffle(opts);require(len(set(z.lower() for z in opts))==6,'duplicates');return dict(text=w,correct=w,choices=opts,distractors=ds,category=g,senseId=k,errorTag=g,explanation=note)

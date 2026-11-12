"""Usage: python -B compile9.py <unpacked classic-six pack> <new empty output>. Python 3.10+, standard library."""
from pathlib import Path
import csv, hashlib, html, json, re, shutil, sys
from language9 import *
HERE=Path(__file__).resolve().parent
G=HERE.parent
sys.path.insert(0,str(G/'classic6'))
from build import atlas,parts

def read(p):return json.loads(p.read_text('utf8'))
def write(p,obj):p.parent.mkdir(exist_ok=True,parents=True);p.write_text(json.dumps(obj,sort_keys=True,ensure_ascii=False,indent=2)+'\n','utf8')
def checksum(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rows(p):return [s.split('|') for s in (HERE/p).read_text('utf8').splitlines() if s.strip() and not s.startswith('#')]
def num(n):return f'{n:02d}'
META={7:('Hay: что здесь есть?','Hay: що тут є?','Сообщи, есть ли в каком-то месте предмет, люди или что-то необходимое. Отличай hay от está.','Скажи, чи є десь річ, люди або щось потрібне. Відрізняй hay від está.','haber.exist.pres',[1,6]),8:('Мои, твои или их: mi, tu, su','Мої, твої чи їхні: mi, tu, su','Назови владельца и выбери форму по числу вещей. Используй знакомые фразы о месте и семье.','Назви власника й обери форму за кількістю речей. Використовуй знайомі фрази про місце та родину.','possessive.prenominal.number',[1,6]),9:('Я работаю, ты работаешь: настоящее на -ar','Я працюю, ти працюєш: теперішній час на -ar','Выбери окончание правильного глагола на -ar по тому, кто действует.','Обери закінчення правильного дієслова на -ar за тим, хто виконує дію.','pres.ind.regular.ar',[1,2,3])}
BANDS={7:[('Заметь один предмет','Поміть один предмет'),('Один или два','Один чи два'),('Количество не важно','Кількість не важлива'),('Чего нет? Есть ли…?','Чого немає? Чи є…?'),('Сначала место, затем находка','Спершу місце, тоді знахідка')],8:[('Моя вещь, мои вещи','Моя річ, мої речі'),('Вещи собеседника','Речі співрозмовника'),('Чьи вещи? Контекст для su','Чиї речі? Контекст для su'),('Назови близкого человека','Назви близьку людину'),('Найди нужную вещь','Знайди потрібну річ')],9:[('Я и ты: -o и -as','Я й ти: -o та -as'),('Имя, родственник или usted','Ім’я, родич чи usted'),('Мы, вы, они','Ми, ви, вони'),('Что ты ищешь?','Що ти шукаєш?'),('Перенеси правило в вопрос и отрицание','Застосуй правило в запитанні й запереченні')]}

def alternatives(n,idx,ws,vi,lem,person,esc):
 lo=[w.lower() for w in ws];res=[];q=esc.startswith('¿');first=lambda z:z[0].upper()+z[1:] if z else z
 def sentence(w):
  x=' '.join(w).strip();return ('¿' if q else '')+first(x)+('?' if q else '.')
 def uncap(w):return w if w in ['Ana','Luis'] else w.lower()
 if n==7:
  if vi and lo[0] not in ['no']:
   sx=vi-1 if lo[vi-1]=='no' else vi;res.append(sentence(ws[sx:]+[uncap(x) for x in ws[:sx]]))
  elif lo[-1] in ['aquí','cerca','hoy','dentro','fuera']:
   res.append(sentence([ws[-1]]+[uncap(ws[0])]+ws[1:-1]))
  elif 'en' in lo[vi+1:]:
   loc=lo.index('en',vi+1);res.append(sentence(ws[loc:]+[uncap(ws[0])]+ws[1:loc]))
 if n==8 and idx in (45,46):
  who=ws[1:3];res.append(sentence(who+[lo[0]]+ws[3:]))
 if n==9 and (lo[0] in VLOOK or lo[0]=='no') and person in [0,1,3,4]:
  subj={0:['Yo'],1:['Tú'],3:['Nosotros','Nosotras'],4:['Vosotros','Vosotras']}[person]
  for s in subj:res.append(sentence([s,uncap(ws[0])]+ws[1:]))
 if n==9 and idx==19:res.append('Trabaja en la estación.')
 if n==9 and idx==41:res.append('No trabajo hoy.')
 return [s for s in rev(res) if s!=esc]

def bank(n,book,look,edits,prevtargets):
 prefix='es:'+num(n);tr,tu,gr,gu,gram,req=META[n];l=dict(id=prefix,ordinal=n,schema='phraseman.classic.lesson/1',course='classic',studyTarget='es',sourceLocales=['ru','uk'],accent='es-ES',level='A1',grammar=gram,prerequisites=['es:'+num(i) for i in req],title=bi(tr,tu),goal=bi(gr,gu),bands=[bi(*b) for b in BANDS[n]],workedReference=[],phrases=[]);phr=l['phrases'];used=[];new=[]
 for ix,row in enumerate(rows(num(n)+'.psv'),1):
  pid=prefix+':'+num(ix);row=edits.get(pid,row);es,ru,uk,en,*contexts=row;require(len(contexts) in [0,2],pid);w=split(es);ws=[s.lower() for s in w];require(es.casefold() not in prevtargets,'duplicate exercise '+pid);prevtargets.add(es.casefold());require(es in [' '.join(w)+'.','¿'+' '.join(w)+'?'],pid+' punctuation');verbs=[i for i,x in enumerate(ws) if x in VLOOK];require(len(verbs)==1,pid+' finite verb');v=verbs[0];lemma,person=VLOOK[ws[v]];require((n==7 and lemma=='haber') or (n==8 and lemma in ['ser','estar'] and any(x in POSS for x in ws)) or (n==9 and lemma in ROOTS),pid+' topic')
  ag,op,me=phrase_notes(n,ws,ix,v,lemma,person,row);alt=alternatives(n,ix,w,v,lemma,person,es);ss=[];slots=[]
  for j,w0 in enumerate(w):
   val=w0.lower();key=getid(val,pid,look);e=book[key];ss.append(key);used.append(key)
   if not e.get('firstPhrase'):e.update(firstPhrase=pid,firstLesson=prefix);new.append(key)
   if pid not in e['examples']:e['examples'].append(pid)
   if val not in [f.lower() for f in e['formsSeen']]:e['formsSeen'].append(w0)
   slots.append(choices_and_note(pid,j,w,e,alt,(ag,op,me)))
  ctx=bi(*contexts) if contexts else bi('','');order=' → '.join(w);a=dict(agreement=ag,operation=op,meaning=me,assembly=bi(order,order),verb=ws[v],verbLemma=lemma,person='impersonal' if n==7 else PC[person],wordOrder=' '.join(w));phr.append(dict(id=pid,format='word_builder',displayOrder=ix,band=(ix-1)//10+1,prompt=bi(ru,uk),context=ctx,targetText=es,englishGloss=en,practiceWords=slots,acceptedExamples=alt,senses=ss,analysis=a,punctuation={'before':'¿' if es.startswith('¿') else '','after':es[-1]},tts={'locale':'es-ES','text':es}))
 require(len(phr)==50,'50 per lesson');l['vocabulary']={'new':new,'seenBefore':[x for x in rev(used) if x not in new]};return l

def tables(l):
 n=l['ordinal'];pp=l['phrases'];tables=[];gt=[];lemmas={7:['haber'],8:['estar','ser'],9:ROOTS}[n];usage={7:bi('Hay — особая безличная форма haber. Здесь у неё нет шести разных лиц.','Hay — особлива безособова форма haber. Тут вона не має шести різних осіб.'),8:bi('Выбор mi/tus/sus относится к вещи; форму ser или estar выбирай по подлежащему.','Вибір mi/tus/sus стосується речі; форму ser чи estar обирай за підметом.'),9:bi('Четыре глагола, одна система окончаний. Нажми номер, чтобы увидеть соответствующую фразу.','Чотири дієслова, одна система закінчень. Натисни номер, щоб побачити відповідну фразу.')}[n];vt=[]
 def samples(form):return [p['id'] for p in pp if form in [w['correct'].lower() for w in p['practiceWords']]]
 def addtable(title,items):
  r=[{'form':form,'note':bi(r,u),'examples':[pp[i-1]['id'] for i in ii]} for form,r,u,ii in items];gt.append({'title':bi(*title),'rows':r});tables.append({'title':bi(*title),'rows':[{'es':z['form'],'id':z['examples'][0],'gloss':z['note'],'sample':pp[int(z['examples'][0].split(':')[-1])-1]['targetText']} for z in r]})
 if n==7:addtable(('Пять моделей с hay','П’ять моделей з hay'),[('hay un / una','Один новый предмет','Один новий предмет',[1,2]),('hay dos','Точное количество','Точна кількість',[11,12]),('hay + agua / libros','Вещество или вещи без точного счёта','Речовина чи речі без точної кількості',[21,26]),('no hay','Отсутствие','Відсутність',[31,35]),('¿hay…?','Спросить, есть ли что-то','Запитати, чи щось є',[37,39])]);
 if n==8:addtable(('Владелец и число вещей','Власник і кількість речей'),[(f,r,u,[i]) for f,r,u,i in [('mi','моё: один предмет','моє: один предмет',1),('mis','моё: несколько предметов','моє: кілька предметів',2),('tu','твоё: один предмет','твоє: один предмет',11),('tus','твоё: несколько предметов','твоє: кілька предметів',12),('su','его / её / их / Ваш: один предмет','його / її / їхній / Ваш: один предмет',25),('sus','тот же круг владельцев: несколько вещей','ті самі можливі власники: кілька речей',26)]])
 for lemma in lemmas:
  tab=dict(lemma=lemma,senseId=VERB_KEYS[lemma],tense=bi('Настоящее время','Теперішній час'),usage=usage,forms=[]);r=[]
  for i,form in enumerate(VFORMS[lemma]):
   ids=samples(form);imp=n==7;pron='—' if imp else PERSON[i];gl=bi('есть / имеется','є / наявне') if imp else bi(PRU[i],PUK[i]);f=dict(surface=form,model=form,person='impersonal' if imp else PC[i],pronoun=pron,practised=bool(ids),translation=gl,examples=ids);tab['forms'].append(f);r.append(dict(es=pron+' · '+form,gloss=gl,id=ids[0] if ids else None,sample=pp[int(ids[0][-2:])-1]['targetText'] if ids else ''))
  vt.append(tab);tables.append({'title':bi('Формы '+lemma,'Форми '+lemma),'rows':r})
 l.update(verbTables=vt,verbs=vt[0],grammarTables=gt);return tables

def enrich(ls):
 curr=None;refs={p['id']:p for l in ls for p in l['phrases']};intro={l['ordinal']:[] for l in ls};examples={n:[] for n in intro};theory={}
 for a in rows('intro.psv'):
  if a[0].startswith('@'):
   n=int(a[0][1:]);i=len(intro[n])+1;_,kind,tr,tu,sr,su=a;c=dict(lessonId=n,screenId=f'classic_es_{n:02d}_intro_{i}_{kind}',order=i,kind=kind,titleRU=tr,titleUK=tu,subtitleRU=sr,subtitleUK=su,linesRU=[],linesUK=[]);intro[n].append(c)
  elif a[0]=='ref':
   for ord in a[1:]:
    p=refs['es:'+num(n)+':'+ord];examples[n].append(p['id']);focus=p['analysis']['verb'] if n!=8 else next(w['text'] for w in p['practiceWords'] if w['category']=='possessive');sp=re.split(r'(\b'+re.escape(focus)+r'\b)',p['targetText'],flags=re.I);ps=[{'text':z,'tone':'accent' if z.lower()==focus.lower() else 'strong','semantic':'targetCorrect'} for z in sp if z]
    for k in ['ru','uk']:c['lines'+k.upper()].append({'type':'example','parts':ps+[{'text':' — '+p['prompt'][k],'tone':'muted','semantic':'nativeGloss'}]})
  else:
   require(len(a)==3,'intro columns');
   for k,text in zip(['RU','UK'],a[1:]):c['lines'+k].append({'type':a[0],'parts':parts(text)})
 for a in rows('theory.psv'):
  if a[0].startswith('@'):
   n=int(a[0][1:]);theory[n]=({'wrong':a[1],'right':a[2],'why':bi(a[3],a[4])},[]);continue
  tr,tu,br,bu,ex,f,fr,fu=a;bu=bu.replace('Новий глагол','Нове дієслово');ids=['es:'+num(n)+':'+num(int(i)) for i in ex.split(',')];fid='es:'+num(n)+':'+num(int(f));sample=lambda pid:{'es':refs[pid]['targetText'],'gloss':refs[pid]['prompt']};theory[n][1].append(dict(heading=bi(tr,tu),body=bi(br,bu),examples=ids,samples=[sample(i) for i in ids],focusId=fid,focusSample=sample(fid),focus=bi(fr,fu)))
 for l in ls:
  n=l['ordinal'];cs=intro[n];require([c['kind'] for c in cs]==['concept','formula','practice'],'classic intro');fm={}
  for c in cs:
   for k in ['ru','uk']:
    lines=c['lines'+k.upper()];plain=lambda row:''.join(p['text'] for p in row['parts']);c['text'+k.upper()]='\n'.join(plain(b) for b in lines)
    if c['kind']=='formula':fm[k]=plain(next(b for b in lines if b['type']=='formula'))
  contrast,t=theory[n];require(len(t)==7 and contrast['right'] in {p['targetText'] for p in l['phrases']},'theory');l.update(intro=cs,introExampleIds=examples[n],introPresentation='classic_legacy_manual_cumulative',theory=t,theoryGuide={'schema':'classic-es.reference/1','title':l['title'],'formula':fm,'chapters':t,'contrast':contrast,'tables':tables(l)})

def make_adapter(l):
 arr=[]
 for p in l['phrases']:
  ws=[]
  for j,w in enumerate(p['practiceWords']):
   note=w['explanation'];ws.append({'text':w['text'],'correct':w['correct'],'distractors':w['distractors'],'category':w['category'],'teachingNote':{'id':p['id']+':'+str(j+1),'correctRu':note['ru'],'correctUk':note['uk'],'wrongRu':note['ru'],'wrongUk':note['uk']}})
  arr.append({'id':p['id'],'spanish':p['targetText'],'english':p['englishGloss'],'russian':p['prompt']['ru'],'ukrainian':p['prompt']['uk'],'words':ws,'alternativesEs':p['acceptedExamples']})
 return arr

def build(base,out):
 require(not out.exists() or not any(out.iterdir()),'choose empty output');ls=[read(base/'lessons'/('ES-'+num(i)+'.json')) for i in range(1,7)];book=read(base/'ledger.json');require(len(book)==53,'base lexicon mismatch');prog=read(base/'programme.json');old={p['targetText'].casefold() for l in ls for p in l['phrases']};look=prepare(book);ed={x[0]:x[1:] for x in rows('edited.psv')};new=[bank(n,book,look,ed,old) for n in [7,8,9]];enrich(new);book={k:v for k,v in book.items() if v.get('firstPhrase')};ls+=new
 out.mkdir(parents=True,exist_ok=True)
 for sub in ['lessons','classic-adapter','classic-intro','classic-theory']:shutil.copytree(base/sub,out/sub)
 for l in new:
  n=l['ordinal'];tag='ES-'+num(n);write(out/'lessons'/(tag+'.json'),l);write(out/'classic-adapter'/(tag+'.phrases.json'),make_adapter(l));write(out/'classic-intro'/(tag+'.intro.json'),l['intro']);write(out/'classic-theory'/(tag+'.theory.json'),l['theoryGuide'])
 ts=out/'classic-theory'/'TheoryClassicES.tsx';tsx=ts.read_text('utf8').replace('the six sibling','the nine sibling').replace("6:()=>require('./ES-06.theory.json'),","6:()=>require('./ES-06.theory.json'),\n  7:()=>require('./ES-07.theory.json'),8:()=>require('./ES-08.theory.json'),9:()=>require('./ES-09.theory.json'),");require("ES-09.theory.json" in tsx,'adapter');ts.write_text(tsx,'utf8')
 raw=(base/'START.html').read_text('utf8');data=json.dumps(dict(lessons=ls,lexicon=book),ensure_ascii=False,separators=(',',':'),sort_keys=True).replace('<','\\u003c');s,k=re.subn(r'(<script type="application/json" id="pack">).*?(</script>)',lambda m:m[1]+data+m[2],raw,flags=re.S);require(k==1,'reader pack');s=s.replace("'dónde','el / la'][i]","'dónde','el / la','hay','mi / tu / su','-ar'][i]").replace('01–06','01–09').replace('300 переводов','450 переводов').replace('300 перекладів','450 перекладів');s=s.replace('</body>',"<script>function jumpToLesson(){const m=location.hash.match(/^#(?:L|ES-)?0?([1-9])$/i);if(m)pick(Number(m[1])-1)}window.addEventListener('hashchange',jumpToLesson);jumpToLesson()</script></body>");(out/'START.html').write_text(s,'utf8');at=atlas(ls).replace('01–06','01–09').replace('</nav>',''.join(f'<a href="#L{i}">ES-0{i}</a>' for i in [7,8,9])+'</nav>');(out/'THEORY.html').write_text(at,'utf8');write(out/'ledger.json',book);write(out/'programme.json',prog);write(out/'NEXT.json',dict(next='ES-10',topic=prog[9],completed=[l['id'] for l in ls],dictionaryPrerequisite='ledger.json',source='content/classic-authoring/grammar/classic9',introContract='classic_legacy_manual_cumulative',release='editorial_only_not_deployed'))
 with (out/'ALL-450.tsv').open('w',encoding='utf-8-sig',newline='') as f:
  wr=csv.writer(f,delimiter='\t');wr.writerow(['ID','Ord','ES','RU','UK','Context RU','Context UK','Slots','Разбор','Розбір']);
  for l in ls:
   for p in l['phrases']:
    a=p['analysis'];wr.writerow([p['id'],p['displayOrder'],p['targetText'],p['prompt']['ru'],p['prompt']['uk'],p['context']['ru'],p['context']['uk'],a['assembly']['ru'],*[' '.join(a[t][k] for t in ('agreement','operation','meaning')) for k in ('ru','uk')]])
 baseport=(base/'PORTING.md').read_text('utf8');(out/'PORTING.md').write_text((HERE/'README.md').read_text('utf8')+'\n\n---\n\n## Архивная техническая справка о первых шести уроках (не текущий объём)\n'+baseport,'utf8');write(out/'manifest.json',dict(schema='phraseman.classic.es.nine-pack/1',state='portable_editorial_not_deployed',studyTarget='es',sourceLocales=['ru','uk'],completedLessons=9,plannedLessons=32,nextLesson='ES-10',phrases=450,newPhrases=150,introBlocks=27,theoryChapters=63,dictionaryEntries=len(book),newEntriesPerLesson=[l['vocabulary']['new'] for l in new],wordSlots=sum(len(p['practiceWords']) for l in ls for p in l['phrases']),newWordSlots=sum(len(p['practiceWords']) for l in new for p in l['phrases'])))
if __name__=='__main__':build(Path(sys.argv[1]).resolve(),Path(sys.argv[2]).resolve())

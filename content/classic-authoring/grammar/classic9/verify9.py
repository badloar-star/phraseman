"""No deployment. Validates exported data and runs actual DOM clicks on the offline course."""
import collections,csv,hashlib,html,json,re,shutil,subprocess,sys,tempfile
from pathlib import Path
from language9 import split, VFORMS, POSS
H=Path(__file__).resolve().parent;sys.path.insert(0,str(H.parent/'classic6'))
import verify as six

def load(p):return json.loads(p.read_text('utf8'))
def dump(p,x):p.parent.mkdir(exist_ok=True,parents=True);p.write_text(json.dumps(x,ensure_ascii=False,indent=2,sort_keys=True)+'\n','utf8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def check(x,m):
 if not x:raise ValueError(m)

def verify_data(base,out):
 ls=[load(out/'lessons'/f'ES-{n:02d}.json') for n in range(1,10)];book=load(out/'ledger.json');old=load(base/'ledger.json');m=load(out/'manifest.json');refs={p['id']:p for l in ls for p in l['phrases']};cnt=0;hashed={};first={};v_senses={}
 for k,x in old.items():check((x['firstLesson'],x['firstPhrase'])==(book[k]['firstLesson'],book[k]['firstPhrase']),'moved old sense '+k)
 for n,l in enumerate(ls,1):
  tag=f'ES-{n:02}';check(l['ordinal']==n and l['id']==f'es:{n:02}' and len(l['phrases'])==50 and l['sourceLocales']==['ru','uk'],tag); intro=load(out/'classic-intro'/(tag+'.intro.json'));th=load(out/'classic-theory'/(tag+'.theory.json'));ad=load(out/'classic-adapter'/(tag+'.phrases.json'));check(len(ad)==50 and th==l['theoryGuide'] and intro==l['intro'],tag+' adapters');check([c['kind'] for c in intro]==['concept','formula','practice'] and [c['order'] for c in intro]==[1,2,3] and all(not {'learningV2EmbeddedQuestion','interaction'}.intersection(c) for c in intro),tag+' intro');check(len(th['chapters'])==7 and all(c['focusId'] in refs and len(c['body']['uk'])>40 and len(c['body']['ru'])>40 for c in th['chapters']),tag+' theory')
  if n<=6:
   for sub,suffix in [('lessons','.json'),('classic-intro','.intro.json'),('classic-theory','.theory.json'),('classic-adapter','.phrases.json')]:
    path=Path(sub)/(tag+suffix);check((out/path).read_bytes()==(base/path).read_bytes(),'old file differs '+str(path));hashed[str(path)]=sha(out/path)
  for v in l['verbTables']:
   for r in v['forms']:check(all(p in refs for p in r['examples']),tag+' verb example')
  for idx,(p,a) in enumerate(zip(l['phrases'],ad),1):
   check(p['format']=='word_builder' and a['id']==p['id'] and a['spanish']==p['targetText'] and p['displayOrder']==idx,'format '+p['id']);ws=p['practiceWords'];correct=[z['correct'] for z in ws];check(correct==[z['correct'] for z in a['words']]==split(p['targetText']),p['id']+' assembly');counts=p['punctuation'];check(counts['before']+' '.join(correct)+counts['after']==p['targetText'],p['id']+' punctuation');check(a['russian']==p['prompt']['ru'] and a['ukrainian']==p['prompt']['uk'],p['id']+' source');cnt+=len(ws)
   for j,w in enumerate(ws):
    ch={s.casefold() for s in w['choices']};check(len(ch)==6 and {s.casefold() for s in w['distractors']}==ch-{w['correct'].casefold()},p['id']+' choices');check(w['senseId'] in book,p['id']+' no lexeme');check(p['id'] in book[w['senseId']]['examples'],p['id']+' evidence');first.setdefault(w['senseId'],p['id']);check(all(w['explanation'].get(k) for k in ['ru','uk']),p['id']+' slot explanation')
    if n>6:
     for alt in p['acceptedExamples']:
      mobile=[s.casefold() for s in split(alt)];current=[s.casefold() for s in correct];check(not (len(mobile)>j and mobile[:j]==current[:j] and mobile[j] in ch-{current[j]}),p['id']+' distractor collides with an accepted alternative')
   if n>6:
    low=[s.casefold() for s in correct];check(bool(re.search(r'[А-Яа-яІЇЄҐіїєґ]',p['prompt']['uk'])) and not re.search('[ыэъёЫЭЪЁ]',p['prompt']['uk']),p['id']+' Ukrainian prompt');check(p['id']==f'es:{n:02}:{idx:02}',p['id']);check(all(p['analysis'][a][k] for a in ['agreement','operation','meaning','assembly'] for k in ['ru','uk']),p['id']+' analysis')
    if n==7:
     check(low.count('hay')==1 and p['analysis']['verbLemma']=='haber',p['id']+' hay');check('no' not in low or low.index('no')+1==low.index('hay'),p['id']+' negative');check('dos' not in low or low[low.index('dos')+1].endswith('s'),p['id']+' numeral')
    if n==8:
     for j,s in enumerate(low):
      if s in POSS:check(s.endswith('s')==low[j+1].endswith('s'),p['id']+' possessive number')
     check(any(s in POSS for s in low),p['id']+' possessive missing')
    if n==9:
     v=p['analysis']['verb'];lemma=p['analysis']['verbLemma'];check(lemma in ['trabajar','estudiar','hablar','buscar'] and v in VFORMS[lemma] and v in low,p['id']+' action');v_senses.setdefault(lemma,set()).add(v)
  for k in l['vocabulary']['new']:check(book[k]['firstLesson']==l['id'],tag+' repeat new');check(k not in l['vocabulary']['seenBefore'],tag+' duplicate section');
 for k,v in book.items():check(first[k]==v['firstPhrase'],k+' first use');check(len(v['examples'])==len(set(v['examples'])),k+' repeated evidence')
 check(len(refs)==450 and len({p['targetText'].casefold() for p in refs.values()})==450 and cnt==m['wordSlots'],'course totals');check(all(len(forms)==6 for forms in v_senses.values()) and len(v_senses)==4,'all endings');check([z['id'] for z in ls]==load(out/'NEXT.json')['completed'],'handoff');check(load(out/'NEXT.json')['next']=='ES-10','handoff number');check({book[w]['lemma'] for w in ls[6]['vocabulary']['new']} >= {'haber','dos'},'word ledger 07');check('salida' in ls[6]['vocabulary']['seenBefore'],'old salida');check(book['clase_group']['firstPhrase']=='es:08:49','distinct class sense');check(len(list(csv.reader((out/'ALL-450.tsv').open(encoding='utf-8-sig'),delimiter='\t')))==451,'audit TSV');check((out/'ALL-450.html').read_text('utf8').count('<article>')==450,'audit reader');return m,hashed

def run(base,out):
 m,hashed=verify_data(base,out);js=six.JS.replace('lessons.length===6','lessons.length===9').replace('i<6;i++','i<9;i++').replace('intros===12&&journeys===600&&seen.size===300&&words===2550',f'intros===18&&journeys===900&&seen.size===450&&words==={2*m["wordSlots"]}');check(js!=six.JS and 'i<9;' in js,'browser test construction');six.JS=js;r=six.browser(out/'START.html');check(r['journeys']==900,'browser');dump(out/'qa/browser.json',dict(**r,uniquePhrases=450,locales=['ru','uk'],wrongChoiceAndReturnFromTheoryChecked=True,nativeDevicesTested=False,independentTeacherReview=False));dump(out/'qa/unchanged01-06.json',hashed);files={p.relative_to(out).as_posix():sha(p) for p in sorted(out.rglob('*')) if p.is_file() and p.name!='manifest.json' and 'source' not in p.relative_to(out).parts};m['sha256']=files;dump(out/'manifest.json',m);print(json.dumps(r))
if __name__=='__main__':run(Path(sys.argv[1]),Path(sys.argv[2]))

"""Finalize the portable export and check actual HTML with Chromium; never writes to the app."""
import csv,hashlib,json,os,re,shutil,subprocess,sys,tempfile
from pathlib import Path
H=Path(__file__).resolve().parent
def enc(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
def load(p):return json.loads(p.read_text('utf8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
JS=r'''<script>try{
const $1=s=>document.querySelector(s),all=s=>Array.from(document.querySelectorAll(s)),ok=(v,m)=>{if(!v)throw Error(m)},tap=s=>{let b=$1(s);ok(b,'missing '+s);b.click()},a=k=>tap('[data-a="'+k+'"]'),view=k=>tap('[data-k="'+k+'"]');let journeys=0,words=0,intros=0;const seen=new Set();ok(lessons.length===6,'six lessons');
for(const lg of ['ru','uk']){tap('[data-lang="'+lg+'"]');for(let i=0;i<6;i++){
 tap('[data-a="lesson"][data-i="'+i+'"]');const l=lessons[i];ok(all('.stack article').length===1&&!$1('[data-a=launch]')&&!$1('.choice'),'one visible');const title=$1('.stack h2').textContent;ok(title===l.intro[0][lg==='ru'?'titleRU':'titleUK'],'title');a('nextIntro');ok(all('.stack article').length===2&&$1('.stack h2').textContent===title&&!$1('[data-a=launch]'),'retain first');a('nextIntro');ok(all('.stack article').length===3&&$1('.stack h2').textContent===title&&!$1('[data-a=nextIntro]')&&$1('[data-a=launch]').textContent===(lg==='ru'?'Начать тренировку':'Почати тренування'),'last CTA');ok(!all('.stack input,.stack .choice').length,'no quizzes');a('launch');intros++;
 view('theory');ok(all('[data-chapter]').length===7&&$1('.rich-wrong')&&$1('.rich-correct')&&$1('.trow'),'rich theory');view('words');ok(all('.lex .card').length===l.vocabulary.new.length+l.vocabulary.seenBefore.length,'dictionary');view('verb');ok(all('.forms .card').length>=6,'verb tables');
 for(let j=0;j<50;j++){view('bank');tap('[data-a="run"][data-i="'+j+'"]');const p=l.phrases[j];ok($1('#prompt').textContent===p.prompt[lg]&&!$1('#target'),'source');if(p.context[lg])ok($1('#body').textContent.includes(p.context[lg]),'context');for(let k=0;k<p.practiceWords.length;k++){let w=p.practiceWords[k],b=all('.choice button');ok(b.length===6,'six choices');if(!k&&j%10===0){b.find(z=>z.textContent!==w.correct).click();ok(st().slot===k&&!!$1('[role=status]').textContent,'wrong advances');b=all('.choice button')}if(k===1&&j%10===0){a('why');ok(tab==='theory','theory');a('back');ok(tab==='practice'&&st().slot===k&&st().idx===j,'resume same word');b=all('.choice button')}b.find(z=>z.textContent===w.correct).click();words++}ok($1('#target').textContent===p.targetText,'assembled '+p.id);a('explain');ok($1('#body').textContent.includes(p.analysis.agreement[lg]),'analysis');a('back');seen.add(p.id);journeys++}a('next');ok(tab==='summary'&&st().done.length===50,'summary')
}}ok(intros===12&&journeys===600&&seen.size===300&&words===2550,'totals');document.body.dataset.receipt=JSON.stringify({intros,journeys,words});}catch(e){document.body.dataset.error=e.stack||String(e)}</script>'''
def browser(p):
 import html
 exe=next((shutil.which(n) for n in ['google-chrome','chromium','chromium-browser'] if shutil.which(n)),None);assert exe,'Chrome/Chromium required'
 with tempfile.TemporaryDirectory() as td:
  d=Path(td);f=d/'check.html';f.write_text(p.read_text('utf8').replace('</html>',JS+'</html>',1),'utf8');r=subprocess.run([exe,'--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-dev-shm-usage',f'--user-data-dir={d}/profile','--dump-dom',f.as_uri()],capture_output=True,timeout=200);body=r.stdout.split(b'<body',1)[-1].split(b'>',1)[0].decode('utf8','replace');m=re.search(r'data-receipt="([^"]+)"',body);assert m and r.returncode==0,(body[:1400],r.stderr[-200:]);return json.loads(html.unescape(m[1]))

def run(out):
 ls=[load(out/'lessons'/f'ES-{i:02}.json') for i in range(1,7)];refs={p['id']:p for l in ls for p in l['phrases']};old=load(out/'qa'/'phrase-content-hashes.json');assert set(refs)==set(old) and len(refs)==300
 for key,p in refs.items():
  assert hashlib.sha256(json.dumps(p,ensure_ascii=False,sort_keys=True).encode()).hexdigest()==old[key];assert p['format']=='word_builder';assert all(len(set(w['choices']))==6 and w['correct'] in w['choices'] for w in p['practiceWords'])
 for l in ls:
  name=f'ES-{l["ordinal"]:02}';intro=load(out/'classic-intro'/(name+'.intro.json'));t=load(out/'classic-theory'/(name+'.theory.json'));adapter=load(out/'classic-adapter'/(name+'.phrases.json'))
  assert list(map(lambda p:p['id'],adapter))==[p['id'] for p in l['phrases']];assert intro==l['intro'] and t==l['theoryGuide'] and len(l['phrases'])==50;assert [b['order'] for b in intro]==[1,2,3];assert [b['kind'] for b in intro]==['concept','formula','practice'];assert len(t['chapters'])==7
  for b in intro:
   assert b['lessonId']==l['ordinal'] and not {'interaction','learningV2EmbeddedQuestion'}.intersection(b);assert all(b[k] for k in ['titleRU','titleUK','linesRU','linesUK','textRU','textUK']);assert [q['type'] for q in b['linesRU']]==[q['type'] for q in b['linesUK']];assert '[[ ' not in str(b) and '[[' not in str(b)
  for c in t['chapters']:assert refs[c['focusId']]['targetText']==c['focusSample']['es'] and len(c['samples'])==len(c['examples']) and all(ex.startswith(l['id']+':') for ex in c['examples'])
  assert {b['screenId'] for b in intro} and len({b['screenId'] for b in intro})==3
 # Old batches use different audit columns: normalize them rather than concatenate incompatible rows.
 with (out/'ALL-300.tsv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.writer(f,delimiter='\t');w.writerow(['ID','Порядок','ES','RU','UK','Контекст RU','Контекст UK','Сборка','Разбор RU','Розбір UK']);
  for l in ls:
   for p in l['phrases']:
    a=p['analysis'];w.writerow([p['id'],p['displayOrder'],p['targetText'],p['prompt']['ru'],p['prompt']['uk'],p['context']['ru'],p['context']['uk'],a['assembly']['ru'],*[' '.join(a[x][k] for x in ['agreement','operation','meaning']) for k in ['ru','uk']]])
 with (out/'ALL-300.tsv').open(encoding='utf-8-sig',newline='') as f:
  rows=list(csv.reader(f,delimiter='\t'));assert len(rows)==301 and all(len(r)==10 for r in rows)
 repo=next((p for p in H.parents if (p/'app/lesson_intro_screens.tsx').is_file()),None);ref={}
 if repo:
  src=(repo/'app/lesson_intro_screens.tsx').read_text('utf8');assert all(x in src for x in ['revealedCount','allRevealed','handleTapAnywhere','Начать тренировку']);
  for i in range(1,7):
   rp=f'app/lesson_intro_screens_lesson{i}_v2.ts';s=(repo/rp).read_text('utf8');ref[rp]={'sha256':sha(repo/rp),'kind':re.findall(r'(?m)^    kind: [\'"]([^\'"]+)',s),'titlesRU':re.findall(r'(?m)^    titleRU: [\'"]([^\'"]+)',s)}
  for p in ['app/lesson_intro_screens.tsx','app/lesson_help.tsx','app/lesson_help_theory_registry.ts','components/lesson_help_theory_ui.tsx','app/lesson_data_types.ts']:ref[p]={'sha256':sha(repo/p)}
 proof=browser(out/'START.html');receipt={'checked':'complete bilingual browser navigation and assembly; no native-device test','uniquePhrases':300,'sourceLocales':['ru','uk'],**proof,'classicSourceFilesInspected':ref};(out/'qa/browser.json').write_text(enc(receipt),'utf8');m=load(out/'manifest.json');m['sha256']={p.relative_to(out).as_posix():sha(p) for p in sorted(out.rglob('*')) if p.is_file() and p.name!='manifest.json' and 'source' not in p.relative_to(out).parts};(out/'manifest.json').write_text(enc(m),'utf8');print(enc(receipt))
if __name__=='__main__':run(Path(sys.argv[1]).resolve())

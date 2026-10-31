"""Build the six finished classic Spanish lessons only. Uses standard library, existing source banks and no services."""
import hashlib,html,json,re,shutil,subprocess,sys,tempfile
from pathlib import Path
from reader import render
H=Path(__file__).resolve().parent;G=H.parent;LANG=['ru','uk'];e=html.escape

def jread(p):return json.loads(p.read_text('utf8'))
def jwrite(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+'\n','utf8')
def bi(r,u):return {'ru':r,'uk':u}
def rows(name):return [s.split('|') for s in (H/name).read_text('utf8').splitlines() if s and not s.startswith('#')]
def parts(s):return [{'text':x[2:-2],'tone':'accent'} if x.startswith('[[') else {'text':x} for x in re.split(r'(\[\[.*?\]\])',s) if x]
def plain(q):return ''.join(p['text'] for p in q['parts'])
def sid(n,last):return f'es:{n:02d}:{last}'
def sample(p):return {'es':p['targetText'],'gloss':p['prompt']}
def checksum(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def supplements(ls):
 refs={p['id']:p for l in ls for p in l['phrases']};intro={i:[] for i in range(1,7)};theory={};hits={i:[] for i in range(1,7)}
 for a in rows('intro.psv'):
  tag=a[0]
  if tag.startswith('@'):
   n=int(tag[1:]);_,kind,tr,tu,sr,su=a[1:] if False else a; seq=len(intro[n])+1
   c={'lessonId':n,'screenId':f'classic_es_{n:02d}_intro_{seq}_{kind}','order':seq,'kind':kind,'titleRU':tr,'titleUK':tu,'subtitleRU':sr,'subtitleUK':su,'linesRU':[],'linesUK':[]};intro[n].append(c);continue
  if tag=='ref':
   for suffix in a[1:]:
    x=refs[sid(n,suffix)];hits[n].append(x['id']);accent=x['analysis'].get('verb',''); split=re.split(r'(\b'+re.escape(accent)+r'\b)',x['targetText'],flags=re.I) if accent else [x['targetText']];target=[{'text':z,'tone':('accent' if z.lower()==accent.lower() else 'strong'),'semantic':'targetCorrect'} for z in split if z]
    for k in LANG:c['lines'+k.upper()].append({'type':'example','parts':target+[{'text':' — '+x['prompt'][k],'tone':'muted','semantic':'nativeGloss'}]})
  else:
   assert tag in ('text','formula','step','correct','wrong','tip','example') and len(a)==3,a
   for k,s in zip(LANG,a[1:]):c['lines'+k.upper()].append({'type':tag,'parts':parts(s)})
 for a in rows('theory.psv'):
  if a[0].startswith('@'):
   n=int(a[0][1:]);assert n not in theory and len(a)==5;theory[n]={'contrast':{'wrong':a[1],'right':a[2],'why':bi(a[3],a[4])},'focus':{}};continue
  idx,ex,r,u=a;assert int(idx) not in theory[n]['focus'];theory[n]['focus'][int(idx)]=(refs[sid(n,ex)],bi(r,u))
 for l in ls:
  n=l['ordinal'];assert [q['kind'] for q in intro[n]]==['concept','formula','practice'];assert set(theory[n]['focus'])==set(range(1,8));assert len(l['theory'])==7
  l['intro']=intro[n];l['introExampleIds']=hits[n];l['introPresentation']='classic_legacy_manual_cumulative';l['workedReference']=[]
  for c in l['intro']:
   for k in LANG:c['text'+k.upper()]='\n'.join(plain(q) for q in c['lines'+k.upper()]);assert all(x not in c for x in ['interaction','learningV2EmbeddedQuestion'])
  fml={k:plain(next(q for q in intro[n][1]['lines'+k.upper()] if q['type']=='formula')) for k in LANG};chapters=[]
  for i,ch in enumerate(l['theory'],1):
   p,focus=theory[n]['focus'][i];ch.update({'focus':focus,'focusId':p['id'],'focusSample':sample(p),'samples':[sample(refs[r]) for r in ch['examples']]});chapters.append(ch)
  l.setdefault('verbTables',[l['verbs']]);l.setdefault('grammarTables',[]);tables=[]
  for tab in l['grammarTables']:
   table={'title':tab['title'],'rows':[]};tables.append(table)
   for r in tab['rows']:
    p=refs[r['examples'][0]];table['rows'].append({'es':r['form'],'gloss':r['note'],'sample':p['targetText'],'id':p['id']})
  for v in l['verbTables']:
   table={'title':bi('Формы '+v['lemma'],'Форми '+v['lemma']),'rows':[]};tables.append(table)
   for r in v['forms']:
    pid=next(iter(r['examples']),None);table['rows'].append({'es':r['pronoun']+' · '+r['model'],'gloss':r['translation'],'sample':refs[pid]['targetText'] if pid else '', 'id':pid})
  l['theoryGuide']={'schema':'classic-es.reference/1','title':l['title'],'formula':fml,'chapters':chapters,'contrast':theory[n]['contrast'],'tables':tables};assert theory[n]['contrast']['right'] in {x['targetText'] for x in l['phrases']}
 return refs

def atlas(ls):
 style='''<style>*{box-sizing:border-box}body{margin:0;color:#192b42;background:#f0f3f8;font:16px/1.6 system-ui,sans-serif}main{max-width:880px;margin:auto;padding:24px 16px 65px}header,article{background:white;border-radius:16px;padding:clamp(18px,3vw,30px);margin-bottom:13px}h1,h2,h3{line-height:1.2}h2{margin-top:2em}h3{margin:8px 0 12px}.small{color:#576982;font-size:.85rem}a{color:#233f84}nav a{display:inline-block;margin-right:12px}b{color:#223e84}.formula,aside{padding:12px 16px;background:#ebf0fb;border-radius:8px}.example{padding:4px 0 4px 12px;border-left:3px solid #c1cde3}.bad{color:#943e26}.good{color:#125336}.actions{display:flex;gap:8px}button{border:1px solid #bdc9dd;border-radius:10px;background:white;color:#223554;padding:9px 15px;font:inherit;cursor:pointer}button[aria-pressed=true]{background:#243f73;color:white}table{border-collapse:collapse;width:100%;font-size:.94rem}td,th{text-align:left;padding:6px 4px;border-bottom:1px solid #d6deec}html[lang=ru] [data-l=uk],html[lang=uk] [data-l=ru]{display:none}@media print{.actions{display:none}article{break-inside:avoid}}</style>'''
 def ln(q):return ''.join('<b>'+e(p['text'])+'</b>' if p.get('tone') in ('accent','strong') else e(p['text']) for p in q['parts'])
 out=['<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PhraseMan · ES 01–06 · Вступление и теория</title>',style,'<main><header><span class="small">PHRASEMAN CLASSIC / ESPAÑOL / A1</span><h1 data-l="ru">Вступления и теория</h1><h1 data-l="uk">Вступи й теорія</h1><div class="actions"><button aria-pressed="true" data-key="ru">Русский</button><button aria-pressed="false" data-key="uk">Українська</button></div><nav>'+''.join(f'<a href="#L{n}">ES-0{n}</a>' for n in range(1,7))+'</nav></header>']
 for l in ls:
  n=l['ordinal'];t=l['theoryGuide'];out.append(f'<section id="L{n}">');
  for k in LANG:
   K=k.upper(); out.append(f'<div data-l="{k}"><h2>ES-0{n} · {e(l["title"][k])}</h2><p>{e(l["goal"][k])}</p>');stage='Вступление' if k=='ru' else 'Вступ'
   for c in l['intro']:
    out.append(f'<article><span class="small">{stage} · {c["order"]}/3</span><h3>{e(c["title"+K])}</h3><p>{e(c["subtitle"+K])}</p>');out.extend(f'<p class="{dict(wrong="bad",correct="good",formula="formula",example="example").get(q["type"],"")}">{ln(q)}</p>' for q in c['lines'+K]);out.append('</article>')
   out.append('<h3>'+ ('Подробная теория' if k=='ru' else 'Докладна теорія')+'</h3><p class="formula">'+e(t['formula'][k])+'</p>');
   for i,c in enumerate(t['chapters'],1):
    out.append(f'<article><h3>{i}. {e(c["heading"][k])}</h3><p>{e(c["body"][k])}</p>');out.extend(f'<p class="example"><b lang="es">{e(s["es"])}</b> — {e(s["gloss"][k])}</p>' for s in c['samples']);out.append('<aside><b>'+e(c['focusSample']['es'])+'</b><br>'+e(c['focus'][k])+'</aside></article>')
   c=t['contrast'];out.append('<article><h3>'+('Типичная ошибка' if k=='ru' else 'Типова помилка')+'</h3><p class="bad">× '+e(c['wrong'])+'</p><p class="good">✓ '+e(c['right'])+'</p><p>'+e(c['why'][k])+'</p></article>');
   for tbl in t['tables']:out.append('<article><h3>'+e(tbl['title'][k])+'</h3><table>'+''.join('<tr><th>'+e(r['es'])+'</th><td>'+e(r['gloss'][k])+'</td><td>'+e(r['sample'] or '—')+'</td></tr>' for r in tbl['rows'])+'</table></article>')
   out.append('</div>')
  out.append('</section>')
 return ''.join(out)+'''</main><script>document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{document.documentElement.lang=b.dataset.key;document.querySelectorAll('[data-key]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))})</script></html>'''

def run(out):
 assert not out.exists() or not any(out.iterdir());out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory() as t:
  b1,b2=(Path(t)/s for s in ['one','two']);subprocess.run([sys.executable,'-B',str(G/'batch01/compile_batch.py'),'--out',str(b1)],check=True,stdout=subprocess.DEVNULL);subprocess.run([sys.executable,'-B',str(G/'batch02/compile.py'),str(b2)],check=True,stdout=subprocess.DEVNULL)
  ls=[jread((b1 if n<=3 else b2)/'lessons'/f'ES-{n:02d}.json') for n in range(1,7)];book=jread(b2/'ledger.json');prev_hash={p['id']:hashlib.sha256(json.dumps(p,ensure_ascii=False,sort_keys=True).encode()).hexdigest() for l in ls for p in l['phrases']};refs=supplements(ls);assert len(refs)==len(prev_hash)==300
  for n,l in enumerate(ls,1):
   name=f'ES-{n:02d}';jwrite(out/'lessons'/f'{name}.json',l);jwrite(out/'classic-intro'/f'{name}.intro.json',l['intro']);jwrite(out/'classic-theory'/f'{name}.theory.json',l['theoryGuide']);dest=out/'classic-adapter'/f'{name}.phrases.json';dest.parent.mkdir(exist_ok=True);shutil.copyfile((b1 if n<=3 else b2)/'classic-adapter'/dest.name,dest)
  r=(b2/'START.html').read_text('utf8');r=re.sub(r'(<script type="application/json" id="pack">).*?(</script>)',r'\1@@PACK@@\2',r,flags=re.S);assert r.count('@@PACK@@')==1
  compact=json.dumps({'lessons':ls,'lexicon':book},ensure_ascii=False,separators=(',',':'),sort_keys=True).replace('<','\\u003c');(out/'START.html').write_text(render(r).replace('@@PACK@@',compact),'utf8');(out/'THEORY.html').write_text(atlas(ls),'utf8');shutil.copyfile(H/'TheoryClassicES.tsx',out/'classic-theory'/'TheoryClassicES.tsx');shutil.copyfile(H/'PORTING.md',out/'PORTING.md');
  for name in ['ledger.json','programme.json','NEXT.json']:shutil.copyfile(b2/name,out/name)
  x=jread(out/'NEXT.json');x.update(source='content/classic-authoring/grammar/classic6',introContract='classic_legacy_manual_cumulative');jwrite(out/'NEXT.json',x)
  rows1=(b1/'phrase-audit.tsv').read_text('utf-8-sig').splitlines();rows2=(b2/'phrase-audit.tsv').read_text('utf-8-sig').splitlines();(out/'ALL-300.tsv').write_text('\n'.join(rows1+rows2[1:])+'\n','utf-8-sig')
  jwrite(out/'qa'/'phrase-content-hashes.json',prev_hash);jwrite(out/'manifest.json',{'schema':'phraseman.classic.es.six-pack/1','course':'classic','studyTarget':'es','sourceLocales':LANG,'state':'offline_editorial_pack_not_deployed','completedLessons':6,'plannedLessons':32,'nextLesson':'ES-07','phrases':len(refs),'wordSlots':sum(len(p['practiceWords']) for p in refs.values()),'introBlocks':sum(len(l['intro']) for l in ls),'theoryChapters':sum(len(l['theory']) for l in ls),'dictionaryEntries':len(book),'sha256':{p.relative_to(out).as_posix():checksum(p) for p in sorted(out.rglob('*')) if p.is_file()}})
if __name__=='__main__':run(Path(sys.argv[1]).resolve())

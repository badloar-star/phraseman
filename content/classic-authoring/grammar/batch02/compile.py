#!/usr/bin/env python3
"""From repository checkout: python3 -B compile.py /path/to/empty-output. No services/dependencies."""
import csv, hashlib, html, json, sys
from pathlib import Path
from language import *
HERE=Path(__file__).resolve().parent; ROOT=HERE.parent; B1=ROOT/'batch01';sys.path.insert(0,str(B1));import compile_batch as prev

def rows(p):return [x.split('|') for x in p.read_text('utf8').splitlines() if x.strip() and not x.lstrip().startswith('#')]
def writej(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,sort_keys=True,indent=2,ensure_ascii=False)+'\n','utf8')
def compact(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
def guide_fields(n):
    spec=prev.parse_sections(HERE/f'{n:02}.teach');ck(set(spec)=={'title','goal','bands','intro','theory','verb'},'guide sections');ck([len(spec[k]) for k in ('bands','intro','theory')]==[5,3,7],'guide counts');return spec

def build():
    prior,book=prev.compile_all();past={key(p['targetText']) for l in prior for p in l['phrases']};look={};
    def bind(w,s):
        k=key(w);ck(k not in look or look[k]==s,'ambiguous token '+k);look[k]=s
    for sid,x in book.items():
        for w in x['formsSeen']:bind(w,sid)
    for sid,forms in FORM_EXT.items():
        for w in forms.split():bind(w,sid)
    priorFirst={s:(x['firstLesson'],x['firstPhrase']) for s,x in book.items()};
    for sid,lemma,forms,disp,r,u,g in rows(HERE/'lexicon.psv'):
        ck(sid not in book,'duplicate lemma ID'); book[sid]={'id':sid,'lemma':lemma,'ru':r,'uk':u,'tier':'core','group':g,'display':disp,'examples':[],'formsSeen':[]};
        for w in forms.split():bind(w,sid)
    edits={r[0]:r[1:] for r in rows(HERE/'editorial.psv')};used_edits=set();first=set(priorFirst);lessons=[]
    for n in [4,5,6]:
        lid=f'{n:02}';prefix='es:'+lid;g=guide_fields(n);bank=rows(HERE/f'{lid}.psv');ck(len(bank)==50,'exactly 50 per lesson');l={'id':prefix,'ordinal':n,'schema':'phraseman.classic.lesson/1','course':'classic','studyTarget':'es','sourceLocales':['ru','uk'],'accent':'es-ES','level':'A1','grammar':{4:'ser.identity.pres.ind',5:'direct.wh.ser-estar',6:'noun.definite-article.agreement'}[n],'prerequisites':{4:['es:01'],5:['es:01','es:03','es:04'],6:['es:01']}[n],'title':bi(*g['title'][0]),'goal':bi(*g['goal'][0]),'bands':[bi(*x) for x in g['bands']],'intro':[prev.chapter(x,lid) for x in g['intro']],'theory':[prev.chapter(x,lid) for x in g['theory']],'workedReference':[],'phrases':[]};new=[];used=[]
        for pos,row in enumerate(bank,1):
            idx=f'{lid}:{pos:02}';pid='es:'+idx
            if idx in edits:row=edits[idx];used_edits.add(idx)
            ck(len(row) in (4,6) and all(row[:4]),'source cells '+pid);es,r,u,en=row[:4];context=bi(*(row[4:] or ['','']));
            ck(key(es) not in past,'repeated phrase '+es);past.add(key(es));ck(all(x.endswith('?' if n==5 else '.') for x in [r,u,en]),'source punctuation '+pid)
            a,ctx=analyse(es,n,book,look);ts=ctx[0];alts=alternatives(es,n,ctx);senses=[];slots=[]
            for j,w in enumerate(ts):
                sid=look[key(w)];e=book[sid]
                if sid not in first:first.add(sid);new.append(sid);e['firstLesson']=prefix;e['firstPhrase']=pid
                if sid not in used:used.append(sid)
                if pid not in e['examples']:e['examples'].append(pid)
                if key(w) not in set(map(key,e['formsSeen'])):e['formsSeen'].append(w)
                slots.append(slot(n,pid,j,ctx,a,e,alts));senses.append(sid)
            l['phrases'].append({'id':pid,'displayOrder':pos,'band':1+(pos-1)//10,'prompt':bi(r,u),'context':context,'targetText':es,'englishGloss':en,'tts':{'text':es,'locale':'es-ES'},'format':'word_builder','punctuation':{'before':'¿' if n==5 else '','after':'?' if n==5 else '.'},'practiceWords':slots,'senses':senses,'analysis':a,'acceptedExamples':alts})
        l['vocabulary']={'new':new,'seenBefore':[s for s in used if s not in new]};l['verbTables']=[]
        for lemma,paradigm,sid in [('ser',SER,'ser_id'),('estar',EST,'estar_loc')]:
            found=[p for p in l['phrases'] if p['analysis']['verbLemma']==lemma]
            if not found:continue
            forms=[]
            for j,v in enumerate(paradigm):
                ids=[p['id'] for p in found if p['analysis']['verb']==v];forms.append({'person':PERSONS[j],'pronoun':PRO[j],'surface':v,'model':v,'translation':bi(*PERSON[j]),'examples':ids,'practised':bool(ids)})
            l['verbTables'].append({'senseId':sid,'lemma':lemma,'tense':bi('Настоящее время','Теперішній час'),'usage':bi(*g['verb'][0]),'forms':forms})
        l['verbs']=l['verbTables'][0];l['grammarTables']=[]
        if n==6:
            ref=[]
            for ar in DET:
                ids=[p['id'] for p in l['phrases'] if key(p['practiceWords'][0]['text'])==ar];ck(bool(ids),'unattested article');firstword=next(p['practiceWords'][1]['text'] for p in l['phrases'] if p['id']==ids[0]);ref.append({'form':ar,'note':article_note(ar,firstword),'examples':ids});
            l['grammarTables'].append({'title':bi('Четыре формы артикля','Чотири форми артикля'),'rows':ref})
        lessons.append(l)
    ck(used_edits==set(edits),'unused review override');ck(first==set(book),'unattested sense');ck(priorFirst=={s:(book[s]['firstLesson'],book[s]['firstPhrase']) for s in priorFirst},'old dictionary renumbered');return lessons,book,prior

def reader(l,book):
    s=(B1/'reader.html').read_text('utf8');s=s.replace('Español 01–03','Español 04–06').replace('pm.classic.preview1.','pm.classic.preview0406.v1.').replace('f(a.i+1)','f(lessons[a.i].ordinal)').replace('f(li+1)','f(l.ordinal)').replace("${i+1} · ${['+','no','¿?'][i]}","${x.ordinal} · ${['ser','¿dónde?','el / la'][i]}").replace("T('Глагол: estar','Дієслово: estar')","T('Глаголы и формы','Дієслова й форми')").replace('refs.get(z).i===li','refs.has(z)&&refs.get(z).i===li');a=s.index("if(tab==='verb')");b=s.index("if(tab==='words')",a);s=s[:a]+'''if(tab==='verb'){out=`<article class="card"><div class="eyebrow">${e('Справочник урока','Довідник уроку')}</div><h2>${e('Глаголы и формы','Дієслова й форми')}</h2><p>${ui(l.verbs.usage)}</p></article>`+l.grammarTables.map(t=>`<h3>${ui(t.title)}</h3><div class="forms">${t.rows.map(r=>`<div class="card"><h2 lang="es">${escape(r.form)}</h2><p>${ui(r.note)}</p>${refExample(r.examples[0])}${btnRef(r.examples[0])}</div>`).join('')}</div>`).join('')+l.verbTables.map(t=>`<div class="eyebrow" style="margin:1.3rem 0 .3rem">${escape(t.lemma)} · ${ui(t.tense)}</div><div class="forms">${t.forms.map(r=>`<div class="card"><div class="aside">${escape(r.pronoun)}</div><h3 lang="es">${escape(r.surface)}</h3>${r.examples.length?refExample(r.examples[0])+btnRef(r.examples[0]):`<small>${e('Для справки — в этих 50 фразах не проверяется.','Для довідки — у цих 50 фразах не перевіряється.')}</small>`}</div>`).join('')}</div>`).join('');}
'''+s[b:];return s.replace('@@PACK@@',compact({'lessons':l,'lexicon':book}))

def fullbank(ls):
    e=html.escape; css=(B1/'reader.html').read_text('utf8').split('<style>',1)[1].split('</style>',1)[0];nav=' · '.join(f'<a href="#L{x["ordinal"]}">{e(x["title"]["ru"])}</a>' for x in ls);sections=[]
    for l in ls:
        parts=[]
        for p in l['phrases']:
            a=p['analysis'];notes=''.join(f'<p><b>{lg.upper()}</b> {e(a["agreement"][lg])} {e(a["operation"][lg])} {e(a["meaning"][lg])}</p>' for lg in ['ru','uk']);parts.append(f'<article class="card"><div class="eyebrow">{e(p["id"])}</div><h3 lang="es">{e(p["targetText"])}</h3><div>RU: {e(p["prompt"]["ru"])} · UK: {e(p["prompt"]["uk"])}</div><small>{e(p["context"]["ru"])}</small><p class="sample" lang="es">{e(a["assembly"]["ru"])}</p><details><summary>Разбор / Розбір</summary>{notes}</details></article>')
        sections.append(f'<section id="L{l["ordinal"]}"><h2>ES-{l["ordinal"]:02} · {e(l["title"]["ru"])}</h2>'+''.join(parts)+'</section>')
    return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PhraseMan · Банк 04–06</title><style>'+css+'</style><main><div class="eyebrow">PHRASEMAN / ESPAÑOL / A1</div><h1>150 фраз: уроки 4–6</h1><p>'+nav+'</p>'+''.join(sections)+'</main></html>'

def run(out):
    ck(not out.exists() or not any(out.iterdir()),'choose an empty output directory');out.mkdir(parents=True,exist_ok=True);ls,book,prior=build();writej(out/'ledger.json',book);prog=[{'number':int(r[0]),'goalRU':r[1],'example':r[2],'requires':[] if r[3]=='-' else list(map(int,r[3].split(',')))} for r in rows(ROOT/'es/programme.psv')];writej(out/'programme.json',prog)
    for l in ls:
        n=l['ordinal'];writej(out/f'lessons/ES-{n:02}.json',l);arr=[]
        for p in l['phrases']:
            ws=[]
            for j,w in enumerate(p['practiceWords']):
                nt=w['explanation'];ws.append({'text':w['text'],'correct':w['correct'],'distractors':w['distractors'],'category':w['category'],'teachingNote':{'id':p['id']+':'+str(j+1),'correctRu':nt['ru'],'correctUk':nt['uk'],'wrongRu':nt['ru'],'wrongUk':nt['uk']}})
            arr.append({'id':p['id'],'english':p['englishGloss'],'spanish':p['targetText'],'russian':p['prompt']['ru'],'ukrainian':p['prompt']['uk'],'words':ws,'alternativesEs':p['acceptedExamples']})
        writej(out/f'classic-adapter/ES-{n:02}.phrases.json',arr)
    (out/'START.html').write_text(reader(ls,book),'utf8');(out/'ALL-150.html').write_text(fullbank(ls),'utf8');(out/'PORTING.md').write_bytes((HERE/'README.md').read_bytes());writej(out/'NEXT.json',{'next':'ES-07','topic':prog[6],'completed':[l['id'] for l in prior+ls],'source':'content/classic-authoring/grammar/batch02','dictionaryPrerequisite':'ledger.json','release':'editorial_only_not_deployed'})
    with (out/'phrase-audit.tsv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f,delimiter='\t');w.writerow(['ID','ES','RU','UK','RU: контекст','UK: контекст','плитки','RU: разбор','UK: розбір']);
        for l in ls:
            for p in l['phrases']:
                a=p['analysis'];w.writerow([p['id'],p['targetText'],p['prompt']['ru'],p['prompt']['uk'],p['context']['ru'],p['context']['uk'],a['assembly']['ru'],*[' '.join(a[k][lg] for k in ('agreement','operation','meaning')) for lg in ['ru','uk']]])
    counts={'newPhrases':sum(len(l['phrases']) for l in ls),'totalCoursePhrases':sum(len(l['phrases']) for l in ls+prior),'wordSlots':sum(len(p['practiceWords']) for l in ls for p in l['phrases']),'newSensesByLesson':[len(l['vocabulary']['new']) for l in ls],'cumulativeSenses':len(book)};writej(out/'manifest.json',{'schema':'phraseman.classic.batch/1','releaseClass':'offline_portable_content','authorizedTargets':['es'],'sourceLocales':['ru','uk'],'published':False,'lessonIds':[l['id'] for l in ls],'counts':counts,'sha256':{p.relative_to(out).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}});print(counts)
if __name__=='__main__':run(Path(sys.argv[1]).resolve())

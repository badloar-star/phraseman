#!/usr/bin/env python3
"""Build the ES-01..03 portable editorial bundle. Python 3.10+, standard library only."""
import argparse, csv, hashlib, json, re, sys
from pathlib import Path
from lingua import bi,ck,norm,cap,V,persons,RULE,LOC,EXTRA,DETS,decode,variants,english,analyse,slot
HERE=Path(__file__).resolve().parent; BASE=HERE.parent;sys.path.insert(0,str(BASE));import guided_build as old

def lines(p):return [s.strip() for s in p.read_text(encoding='utf8').splitlines() if s.strip() and not s.startswith('#')]
def dump(x):return json.dumps(x,ensure_ascii=False,indent=2,sort_keys=True)+'\n'
def save(p,obj):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(dump(obj),encoding='utf8')
def parse_sections(p):
    out={};k=None
    for line in lines(p):
        if line.startswith('[') and line.endswith(']'):
            k=line[1:-1];ck(k not in out,'Repeated section');out[k]=[]
        else:out[k].append(line.split('|'))
    return out

def chapter(r,lid):
    ck(len(r)==5 and all(r),'Invalid guide row');return {'heading':bi(*r[:2]),'body':bi(*r[2:4]),'examples':[f'es:{lid}:{a}' for a in r[4].split(',')]}
def source_data():
    original=old.prepare(BASE)['lessons'][0];first=original['guide'];book={};look={}
    for r in lines(BASE/'es/lexicon.psv')+EXTRA.splitlines():
        sid,lemma,forms,ru,uk,tier,group=r.split('|');ck(sid not in book,'Duplicate sense');book[sid]={'id':sid,'lemma':lemma,'ru':ru,'uk':uk,'tier':tier,'group':group,'display':((DETS[lemma]+' '+lemma) if group=='noun' else lemma),'examples':[],'formsSeen':[]}
        for w in forms.split():ck(w not in look,'Ambiguous sense: '+w);look[w]=sid
    seq1=[]
    for p in original['phrases']:
        scene=first['scenes'].get(p['num'],['',''])[:];r=p['ru'];u=p['uk']; notes=[]
        for idx,text in enumerate([r,u]):
            m=re.search(r'\s*\(([^()]*)\)\s*$',text);notes.append(text[:m.start()].strip() if m else text)
            if m:scene[idx]=' '.join(x for x in (m.group(1),scene[idx]) if x)
        seq1.append([p['num'],p['targetText'],*notes,*scene]);
    S={'01':{'title':original['title'],'goal':['Скажи, где находишься ты, другой человек или знакомая вещь. Одна модель: форма estar + место.','Скажи, де перебуваєш ти, інша людина або знайома річ. Одна модель: форма estar + місце.'],'bands':[r[:2] for r in first['bands']],'intro':first['intro'],'theory':first['theory'],'verb':['Estar меняет форму в зависимости от того, кто или что находится в указанном месте. Это одна словарная статья, а не шесть отдельных глаголов.','Форма estar залежить від того, хто чи що перебуває в названому місці. Це одна словникова стаття, а не шість окремих дієслів.'],'rows':seq1,'workedExamples':[{'prompt':bi(*x[:2]),'answer':x[2],'reason':bi(*x[4:6])} for x in first['checks']]}}
    for lid in ['02','03']:
        d=parse_sections(HERE/(lid+'.teach'));ck(set(d)=={'title','goal','bands','intro','theory','verb'},'Unknown/missing section'); rows=[r.split('|') for r in lines(HERE/(lid+'.psv'))];S[lid]={**d,'title':d['title'][0],'goal':d['goal'][0],'verb':d['verb'][0],'rows':rows,'workedExamples':[]}
    return S,book,look,original['forms']

def compile_all():
    source,book,look,forms=source_data();lessons=[];allids=set();alltexts=set();firstseen=set()
    for lid,s in source.items():
        ck(len(s['rows'])==50 and sorted(x[0] for x in s['rows'])==[f'{n:02d}' for n in range(1,51)],'Bad phrase bank size/IDs');ck(len(s['intro'])==3 and len(s['theory'])>=7 and len(s['bands'])==5,'Incomplete sections');L={'id':'es:'+lid,'ordinal':int(lid),'schema':'phraseman.classic.lesson/1','course':'classic','studyTarget':'es','sourceLocales':['ru','uk'],'accent':'es-ES','level':'A1','grammar':RULE[lid],'title':bi(*s['title']),'goal':bi(*s['goal']),'prerequisites':(['es:01'] if lid=='02' else ['es:01','es:02'] if lid=='03' else []),'bands':[bi(*r) for r in s['bands']],'intro':[chapter(r,lid) for r in s['intro']],'theory':[chapter(r,lid) for r in s['theory']],'workedReference':s['workedExamples'],'verbs':{'senseId':'estar_loc','lemma':'estar','tense':bi('Настоящее время','Теперішній час'),'usage':bi(*s['verb']),'forms':[]},'phrases':[]};used=[];new=[]
        for rank,row in enumerate(s['rows'],1):
            ck(len(row) in (4,6) and all(row[:4]),'Malformed phrase');n,es,ru,uk=row[:4];pid=f'es:{lid}:{n}';ck(pid not in allids and norm(es) not in alltexts,'Duplicate phrase');allids.add(pid);alltexts.add(norm(es));t,v,sub,loc=decode(es,lid);q=lid=='03';ck(ru.endswith('?' if q else '.') and uk.endswith('?' if q else '.'),'Gloss punctuation mismatch '+pid);alts=variants(sub,v,loc,lid,es);info=analyse(sub,v,loc,lid);slots=[];senses=[]
            for i,w in enumerate(t):
                sid=look[norm(w)];e=book[sid]
                if sid not in firstseen:firstseen.add(sid);new.append(sid);e['firstLesson']=L['id'];e['firstPhrase']=pid
                if sid not in used:used.append(sid)
                if pid not in e['examples']:e['examples'].append(pid)
                if norm(w) not in set(map(norm,e['formsSeen'])):e['formsSeen'].append(w)
                senses.append(sid);slots.append(slot(w,e,pid,i,t,info,alts))
            parts=bi(' → '.join(t),' → '.join(t));vix=[norm(w) for w in t].index(v);pattern='verb-subject-place' if q and sub and vix==0 else 'subject-verb-place' if sub else 'verb-place';
            L['phrases'].append({'id':pid,'displayOrder':rank,'band':1+(rank-1)//10,'prompt':bi(ru,uk),'context':bi(*(row[4:6] or ['',''])),'targetText':es,'englishGloss':english(sub,v,loc,lid),'tts':{'text':es,'locale':'es-ES'},'format':'word_builder','punctuation':{'before':'¿' if q else '', 'after':'?' if q else '.'},'practiceWords':slots,'senses':senses,'analysis':{**info,'subject':sub,'verb':v,'location':loc,'wordOrder':pattern,'assembly':parts},'acceptedExamples':alts})
        L['vocabulary']={'new':new,'seenBefore':[sid for sid in used if sid not in new]}; subset={p['id'] for p in L['phrases']};ck(all(x in subset for c in L['intro']+L['theory'] for x in c['examples']),'Dangling guide example')
        for person,pr,v,ru,uk in forms:
            ids=[p['id'] for p in L['phrases'] if p['analysis']['verb']==v];ck(bool(ids),'Unpractised verb form '+v);L['verbs']['forms'].append({'person':person,'pronoun':pr,'translation':bi(ru,uk),'surface':v,'model':('no '+v if lid=='02' else v),'examples':ids})
        lessons.append(L)
    ck(firstseen==set(book),'Unattested dictionary entries');return lessons,book

def write(out):
    lessons,book=compile_all();out.mkdir(parents=True,exist_ok=True);programme=[dict(number=int(p[0]),goalRU=p[1],example=p[2],requires=[] if p[3]=='-' else list(map(int,p[3].split(',')))) for p in [r.split('|') for r in lines(BASE/'es/programme.psv')]]
    save(out/'ledger.json',book);save(out/'programme.json',programme)
    # Keep real (non-placeholder) english glosses for compatibility; only es is an authorized target in this release.
    for l in lessons:
        lid=f"{l['ordinal']:02}";save(out/f'lessons/ES-{lid}.json',l);rows=[]
        for p in l['phrases']:
            words=[]
            for w in p['practiceWords']:
                note=w['explanation']; words.append({'text':w['text'],'correct':w['correct'],'distractors':w['distractors'],'category':w['category'],'teachingNote':{'id':f"{p['id']}:{len(words)+1}",'correctRu':note['ru'],'correctUk':note['uk'],'wrongRu':note['ru'],'wrongUk':note['uk']}})
            rows.append({'id':p['id'],'english':p['englishGloss'],'spanish':p['targetText'],'russian':p['prompt']['ru'],'ukrainian':p['prompt']['uk'],'words':words,'alternativesEs':p['acceptedExamples']})
        save(out/f'classic-adapter/ES-{lid}.phrases.json',rows)
    with (out/'phrase-audit.tsv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f,delimiter='\t',lineterminator='\n');w.writerow(['ID','Порядок','Русский','Українська','Español','Контекст RU','Контекст UK','Форма','Сборка','Почему эта форма','Как назвать место','Операция']);
        for l in lessons:
            for p in l['phrases']:
                a=p['analysis'];w.writerow([p['id'],p['displayOrder'],p['prompt']['ru'],p['prompt']['uk'],p['targetText'],p['context']['ru'],p['context']['uk'],a['verb'],a['assembly']['ru'],a['agreement']['ru'],a['meaning']['ru'],a['operation']['ru']])
    inline=json.dumps({'lessons':lessons,'lexicon':book},ensure_ascii=False,sort_keys=True,separators=(',',':')).replace('<','\\u003c');html=(HERE/'reader.html').read_text(encoding='utf8');ck(html.count('@@PACK@@')==1,'Bad template');(out/'START.html').write_text(html.replace('@@PACK@@',inline),encoding='utf8');(out/'PORTING.md').write_bytes((HERE/'README.md').read_bytes());save(out/'NEXT.json',{'next':'ES-04','topic':programme[3],'canonicalSource':'content/classic-authoring/grammar/batch01','dictionaryPrerequisite':'ledger.json','learnerPracticeMode':'word_builder_only','status':'content_complete_not_deployed','review':'independent linguistic and device review not performed'})
    sums={p.relative_to(out).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file() and p.name!='manifest.json'};save(out/'manifest.json',{'format':'phraseman.classic.batch/1','sourceLocales':['ru','uk'],'studyTarget':'es','authorizedTargets':['es'],'releaseClass':'portable_content','published':False,'lessonIds':[l['id'] for l in lessons],'counts':{'phrases':sum(len(l['phrases']) for l in lessons),'wordSlots':sum(len(p['practiceWords']) for l in lessons for p in l['phrases']),'senses':len(book),'newSensesByLesson':[len(l['vocabulary']['new']) for l in lessons]},'sha256':sums});return lessons,book
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,required=True);out=ap.parse_args().out.resolve();ck(out!=BASE and BASE not in out.parents,'Write to a separate folder');ck(not out.exists() or not any(out.iterdir()),'Output must be empty');write(out);print((out/'manifest.json').read_text(encoding='utf8'))

#!/usr/bin/env python3
"""Build course-authoring drafts. Standard library only; no release or network side effects."""
from pathlib import Path
from functools import lru_cache
from collections import Counter
from html import escape
import argparse, hashlib, json, re, unicodedata
ROOT = Path(__file__).resolve().parent
TIERS = ('core','recognize','support','name')
class Invalid(ValueError): pass
def ensure(condition, message):
    if not condition: raise Invalid(message)
def tokens(s): return re.findall(r"[^\W\d_]+(?:['’][^\W\d_]+)*|\d+",unicodedata.normalize('NFC',s),re.UNICODE)
def norm(s): return ' '.join(t.casefold() for t in tokens(s))
def fold(s): return ''.join(c for c in unicodedata.normalize('NFD',norm(s)) if not unicodedata.combining(c))
def dump(obj): return json.dumps(obj,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
def numbered(n): return [f'{i:02}' for i in range(1,n+1)]
def rows(p,n):
    result=[]
    for i,line in enumerate(p.read_text('utf-8-sig').splitlines(),1):
        if not line.strip() or line.lstrip().startswith('#'): continue
        fields=[v.strip() for v in line.split('|')]
        ensure(len(fields)==n and all(fields),f'{p.name}:{i}: expected {n} populated fields'); result.append(fields)
    return result

def align(text,tags,lex):
    words=norm(text).split()
    @lru_cache(None)
    def match(k,at):
        if k==len(tags): return () if at==len(words) else None
        key=tags[k]; ensure(key in lex,'unknown sense: '+key)
        for form in sorted(lex[key]['forms'],key=lambda x:(-len(x),x)):
            part=norm(form).split(); end=at+len(part)
            if words[at:end]==part:
                rest=match(k+1,end)
                if rest is not None:return ((key,at,end),)+rest
        return None
    spans=match(0,0);ensure(spans is not None,'incomplete or wrong sense alignment: '+text);return spans

def read_guide(p,lid,target):
    g=json.loads(p.read_text('utf-8')); ids=set(numbered(50))
    ensure(g.get('id')==f'{target.upper()}-{lid}' and g.get('status')=='author_draft','unexpected guide id/status')
    ensure(g['speechLocale'].split('-')[0]==target,'wrong TTS target')
    def require(obj,fields):ensure(all(isinstance(obj.get(k),str) and obj[k].strip() for k in fields),'missing localized text')
    for k in ('title','goal'): require(g[k],('ru','uk'))
    ensure([b['start'] for b in g['blocks']]==[1,11,21,31,41],'block boundaries')
    for b in g['blocks']: require(b,('ru','uk','tipRu','tipUk'))
    def refs(ls):ensure(isinstance(ls,list) and ls and all(i in ids for i in ls),'invalid phrase reference')
    ensure(len(g['theory'])>=3 and g['forms'] and g['dialogues'] and len(g['checks'])>=3,'incomplete lesson')
    for t in g['theory']: require(t,('titleRu','titleUk','ru','uk'));refs(t['refs'])
    for lemma,forms,ru,uk,rs in g['forms']:ensure(all((lemma,forms,ru,uk)),'empty form');refs(rs)
    for d in g['dialogues']:
        require(d,('ru','uk'));ensure(len(d['turns'])>=2 and all(role for role,_ in d['turns']),'dialogue incomplete');refs([i for _,i in d['turns']])
    for ru,uk,opts,answer,whyru,whyuk in g['checks']:
        refs(opts);ensure(len(opts)==len(set(opts))>=2 and answer in opts and all((ru,uk,whyru,whyuk)),'invalid check')
    ensure(g['sources'] and all(s.startswith('https://') for s in g['sources']),'missing references');return g

def compile_course(root,target):
    base=root/target; course=rows(base/'course.psv',5);ensure(course and [r[0] for r in course]==numbered(len(course)),'programme gap')
    lex={};identities=set()
    for k,lemma,pos,tier,ru,uk,forms in rows(base/'senses.psv',7):
        ensure(re.fullmatch(r'[a-z][a-z0-9_]*',k) and k not in lex and tier in TIERS,'bad/duplicate lexicon key: '+k)
        identity=(norm(lemma),pos,ru.casefold());ensure(identity not in identities,'duplicate sense: '+k);identities.add(identity)
        lex[k]=dict(lemma=lemma,pos=pos,tier=tier,ru=ru,uk=uk,forms=forms.split(';'));ensure(all(norm(x) for x in lex[k]['forms']),'empty lexical form')
    folders=sorted(p.name for p in (base/'lessons').iterdir() if p.is_dir());ensure(folders and folders==numbered(len(folders)) and len(folders)<=len(course),'lesson sequence gap')
    ledger={};canonical={};lessons=[]; proper={norm(f) for e in lex.values() if e['tier']=='name' for f in e['forms']}
    for lid in folders:
        folder=base/'lessons'/lid;g=read_guide(folder/'guide.json',lid,target);source=rows(folder/'phrases.psv',8);ensure([r[0] for r in source]==numbered(50),'expected 50 phrase IDs in '+lid);phrases=[];used=set();prior=set(ledger)
        for pid,text,ru,uk,keys,alts,cr,cu in source:
            code=f'{target}:{lid}:{pid}';n=norm(text);ensure(n and n not in canonical,'duplicate phrase: '+code);canonical[n]=code
            if target=='es':ensure(text.count('¿')==text.count('?') and text.count('¡')==text.count('!'),'unpaired punctuation: '+code)
            variants=[] if alts=='—' else [v.strip() for v in alts.split(';')]; av=[norm(x) for x in variants];ensure(all(av) and len(av)==len(set(av)) and n not in av,'empty or duplicate alternative: '+code)
            tags=keys.split();spans=align(text,tags,lex);used.update(tags);ws=tokens(text)
            for k in dict.fromkeys(tags):
                if k not in ledger:ledger[k]=dict(key=f'{target}:{k}',firstLesson=lid,firstPhrase=code,examples=[],attestedForms=[],**{f:lex[k][f] for f in ('lemma','pos','tier','ru','uk')})
                ledger[k]['examples'].append(code)
            for k,a,b in spans:
                form=' '.join(ws[a:b]);found=ledger[k]['attestedForms']
                if not any(norm(form)==norm(v) for v in found):found.append(form)
            phrases.append(dict(id=code,localId=pid,targetText=text,ru=ru,uk=uk,cue={'ru':cr,'uk':cu},alternatives=variants,spans=[dict(sense=k,fromToken=a,toExclusive=b) for k,a,b in spans],tts=dict(text=text,locale=g['speechLocale'],engine='device')))
        pool=sorted({w.casefold() for p in phrases for w in tokens(p['targetText'])});ensure(len(pool)>8,'small word bank')
        for p in phrases:
            forbidden={fold(w) for s in [p['targetText']]+p['alternatives'] for w in tokens(s)};candidates=[w for w in pool if fold(w) not in forbidden];ensure(len(candidates)>=5,'too few tiles at '+p['id']);p['practiceWords']=[]
            for i,w in enumerate(tokens(p['targetText'])):
                order=sorted(candidates,key=lambda x:((x in proper)!=(w.casefold() in proper),hashlib.sha256(f"{p['id']}:{i}:{x}".encode()).digest())); candidates5=[v.capitalize() if v in proper or w[0].isupper() else v for v in order[:5]];p['practiceWords'].append(dict(text=w,correct=w,distractors=candidates5))
        new=sorted(used-prior);lessons.append(dict(ordinal=lid,guide=g,phrases=phrases,newSenses=new,recycledSenses=sorted(used&prior),newByTier=dict(Counter(lex[k]['tier'] for k in new))))
    ensure(set(lex)==set(ledger),'dictionary entry without canonical example');nextrow=course[len(folders)] if len(course)>len(folders) else None;hand=lessons[-1]['guide']['handoff'];ensure(hand['next']==(target.upper()+'-'+nextrow[0] if nextrow else 'END') and hand['ru'] and hand['uk'],'bad handoff')
    return dict(schema='phraseman.authoring/1',target=target,productionReady=False,independentReview='pending',programme=course,lessons=lessons,ledger=ledger,nextBrief=dict(row=nextrow,handoff=hand,priorPhraseCount=len(canonical),knownSenseIds=sorted(ledger)))

def render(b,l):
    g=l['guide'];P={x['localId']:x for x in l['phrases']};h=lambda x:escape(str(x));tracks=[]
    for lang in ('ru','uk'):
        uk=lang=='uk';s='Uk' if uk else 'Ru';title='Переклад' if uk else 'Перевод';parts=['<div class="eyebrow">PHRASEMAN CLASSIC / '+h(g['id'])+'</div><h1>'+h(g['title'][lang])+'</h1><p class="lead">'+h(g['goal'][lang])+'</p>']
        for idx,bl in enumerate(g['blocks']):
            parts.append('<h2>'+str(idx+1)+'. '+h(bl[lang])+'</h2><p>'+h(bl['tip'+s])+'</p>')
            for p in l['phrases'][idx*10:idx*10+10]:parts.append('<article><small>'+h(p['localId'])+' · '+h(p['cue'][lang])+'</small><b lang="'+h(b['target'])+'">'+h(p['targetText'])+'</b><details><summary>'+title+'</summary>'+h(p[lang])+'</details></article>')
        parts.append('<h2>'+('Як це працює' if uk else 'Как это работает')+'</h2>')
        for t in g['theory']:parts.append('<h3>'+h(t['title'+s])+'</h3><p>'+h(t[lang])+'</p>')
        parts.append('<h2>'+('Форми' if uk else 'Формы')+'</h2>')
        for lemma,forms,ru,ua,_ in g['forms']:parts.append('<p><strong>'+h(lemma)+'</strong> · '+h(forms)+'<br>'+h(ua if uk else ru)+'</p>')
        for d in g['dialogues']:
            parts.append('<h2>'+h(d[lang])+'</h2>');parts.extend('<p><strong>'+h(role)+'</strong> · '+h(P[pid]['targetText'])+' <small>'+h(P[pid][lang])+'</small></p>' for role,pid in d['turns'])
        parts.append('<h2>'+('Перевір себе' if uk else 'Проверь себя')+'</h2>')
        for ru,ua,opts,ans,whyru,whyua in g['checks']:parts.append('<article>'+h(ua if uk else ru)+'<p>'+' / '.join(h(P[x]['targetText']) for x in opts)+'</p><details><summary>'+('Відповідь' if uk else 'Ответ')+'</summary>'+h(P[ans]['targetText'])+' · '+h(whyua if uk else whyru)+'</details></article>')
        parts.append('<h2>'+('Словник уроку' if uk else 'Словарь урока')+'</h2>'); categories=('Активний мінімум','Достатньо впізнати','Службові слова й конструкції','Власні назви') if uk else ('Активный минимум','Достаточно узнать','Служебные слова и конструкции','Имена и названия')
        for tier,heading in zip(TIERS,categories):
            keys=[k for k in l['newSenses']+l['recycledSenses'] if b['ledger'][k]['tier']==tier];parts.append('<h3>'+h(heading)+' · '+str(len(keys))+'</h3>')
            for k in sorted(keys,key=lambda k:b['ledger'][k]['lemma']):
                e=b['ledger'][k];parts.append('<p><strong>'+h(e['lemma'])+'</strong> · '+h(e[lang])+' <small>'+h(e['firstPhrase'])+' / '+h(', '.join(e['attestedForms']))+'</small></p>')
        tracks.append('<section id="'+lang+'"'+(' hidden' if uk else '')+'>'+''.join(parts)+'</section>')
    style='*{box-sizing:border-box}html{scroll-behavior:smooth}body{font:17px/1.55 system-ui,sans-serif;color:#193539;max-width:820px;margin:auto;padding:22px;background:#f5f8f4}header{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:2px solid #12675b}.eyebrow{margin-top:30px;font-size:.7em;letter-spacing:.16em;color:#12675b;font-weight:750}button,summary{cursor:pointer}button{padding:8px 16px;border:1px solid #8daaa3;background:white;color:#174d45;border-radius:8px}article{background:white;border-left:3px solid #a6cdc2;padding:.7em 1em;margin:.5em 0}b,small{display:block}b{font-size:1.25em}small{color:#4d6968}h1{line-height:1.1;font-size:clamp(2.2em,6vw,3.5em);margin:.2em 0}h2{margin-top:1.8em;color:#185c52}.lead{font-size:1.2em}details{margin-top:.3em}summary{color:#185c52}section[hidden]{display:none}'
    return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PhraseMan · '+h(g['id'])+'</title><style>'+style+'</style><header><strong>PhraseMan / Español</strong><span><button data-l="ru">RU</button> <button data-l="uk">UA</button></span></header>'+''.join(tracks)+'<script>document.querySelectorAll("button[data-l]").forEach(b=>b.onclick=()=>{let l=b.dataset.l;document.documentElement.lang=l;document.querySelectorAll("section").forEach(s=>s.hidden=s.id!==l)})</script></html>'

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--target',default='es',choices=('es','en','fr','de','it'));ap.add_argument('--out',type=Path,required=True);a=ap.parse_args();out=a.out.resolve();ensure(out!=ROOT and ROOT not in out.parents,'choose a separate output directory');b=compile_course(ROOT,a.target);out.mkdir(parents=True,exist_ok=True)
    arts={'bundle.json':dump(b),'ledger.json':dump(b['ledger']),'NEXT.json':dump(b['nextBrief'])};arts.update({l['guide']['id']+'.html':render(b,l) for l in b['lessons']});receipt={'status':'STRUCTURE_PASS_ONLY','independentLanguageReview':'pending','published':False,'counts':{l['guide']['id']:len(l['phrases']) for l in b['lessons']},'sha256':{k:hashlib.sha256(v.encode()).hexdigest() for k,v in arts.items()}}
    for name,text in {**arts,'receipt.json':dump(receipt)}.items():(out/name).write_bytes(text.encode())
    print(dump(receipt))
if __name__=='__main__':main()

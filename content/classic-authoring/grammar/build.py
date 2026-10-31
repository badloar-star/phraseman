#!/usr/bin/env python3
"""Editorial build only. Python 3.10+; no third-party packages, network or publication."""
from pathlib import Path
import argparse, hashlib, html, json, re, unicodedata
from collections import defaultdict
ROOT=Path(__file__).resolve().parent
class Invalid(ValueError): pass
def check(ok,msg):
    if not ok: raise Invalid(msg)
def key(s): return unicodedata.normalize('NFC',s).casefold()
def seq(n): return [f'{i:02}' for i in range(1,n+1)]
def read(p): return [x.strip() for x in p.read_text('utf-8-sig').splitlines() if x.strip() and not x.lstrip().startswith('#')]
def split(s,n):
    r=[x.strip() for x in s.split('|')];check(len(r)==n and all(r),f'Expected {n} fields: {s}');return r
def section(p):
    d={}; group=None
    for s in read(p):
        if re.fullmatch(r'\[[a-z]+\]',s):
            group=s[1:-1];check(group not in d,'Duplicate section '+group);d[group]=[]
        else:
            check(group in d,'Missing section header');d[group].append(s)
    return d
def h(x): return html.escape(str(x),quote=True)
def dump(obj): return json.dumps(obj,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
def eswords(t):
    check(re.fullmatch(r"[^\W\d_]+(?: [^\W\d_]+)*\.",t) is not None,'ES-01 requires an affirmative statement and final period: '+t);return t[:-1].split(' ')
POOLS={'verb':'estoy estás está estamos estáis están','place':'aquí allí cerca lejos dentro fuera','prep':'en de para sin entre desde','noun':'casa clase móvil llave llaves mesa coche coches libro libros mochila cocina puerta estación','article':'el la los las un una','person':'él ella ellos ellas tú yo','name':'Ana Luis Marta Pablo Elena Diego','join':'y o pero ni sin con'}
FORMS={'1s':'estoy','2s':'estás','3s':'está','1p':'estamos','2p':'estáis','3p':'están'}
RU_PERSON={'я':'1s','ты':'2s','мы':'1p','вы':'2p','они':'3p','он':'3s','она':'3s','ана':'3s','луис':'3s','телефон':'3s','ключи':'3p','стол':'3s','машина':'3s','книги':'3p','рюкзак':'3s','машины':'3p','книга':'3s','ключ':'3s','станция':'3s'}
def verify_estar(tokens,person,ru):
    w=list(map(key,tokens));check(person in FORMS and [x for x in w if x in FORMS.values()]==[FORMS[person]],'Wrong conjugation: '+str(w));v=w.index(FORMS[person]);s=' '.join(w[:v]);
    if s:
        singular={'él','ella','ana','luis','el móvil','la mesa','el coche','la mochila','el libro','la llave','la estación'};plural={'ellos','ellas','ana y luis','las llaves','los libros','los coches'}
        check((s in singular and person=='3s') or (s in plural and person=='3p'),'Unknown subject or agreement: '+s)
    first=key(ru.split()[0]);n='3p' if ru.startswith('Ана и Луис ') else RU_PERSON.get(first);check(n==person,'RU person/number: '+ru)
    allowed={'aquí','allí','cerca','lejos','fuera','dentro','en casa','en clase','en la cocina','en la mesa','en la puerta','en la estación','en el coche','en la mochila'};check(' '.join(w[v+1:]) in allowed,'Outside location pattern: '+str(w));check(len(w)<=6,'Too many words for L1')
def options(word,group,uid,index):
    k=key(word);pool=POOLS[group].split();check(k in map(key,pool),'Unknown option: '+word)
    candidates=[x for x in pool if key(x)!=k];order=lambda x: hashlib.sha256(f'{uid}:{index}:{key(x)}'.encode()).digest()
    candidates=sorted(candidates,key=order)[:5];candidates=[x[:1].upper()+x[1:] if word[0].isupper() else x for x in candidates];all_opts=sorted([word]+candidates,key=lambda x:hashlib.sha256(f'{uid}:{index}:display:{key(x)}'.encode()).digest());check(len({key(x) for x in all_opts})==6,'Duplicate or missing tile');return {'text':word,'correct':word,'distractors':candidates,'choices':all_opts,'kind':group}
def alternatives(words,person):
    s=' '.join(words);out=[];lower=s[0].lower()+s[1:]
    if key(words[0]) in FORMS.values():
        for pr in {'1s':['Yo'],'2s':['Tú'],'1p':['Nosotros','Nosotras'],'2p':['Vosotros','Vosotras']}.get(person,[]):out.append(pr+' '+lower+'.')
    elif key(words[0]) in {'él','ella','ellos','ellas'}:
        tail=' '.join(words[1:]);out.append(tail[0].upper()+tail[1:]+'.')
    return out

def compile_course(root=ROOT,target='es'):
    base=root/target;prog=[split(r,4) for r in read(base/'programme.psv')];check([r[0] for r in prog]==seq(32),'Expected 32 ordered topics');
    for lid,_,__,deps in prog:
        check(deps=='-' or all(x in seq(int(lid)-1) for x in deps.split(',')),'Missing or forward prerequisite: '+lid)
    lex={};lookup={};ledger={};seen=set();lessons=[]
    for row in read(base/'lexicon.psv'):
        id,lemma,surf,ru,uk,tier,group=split(row,7);check(id not in lex and group in POOLS and tier in {'core','recognize','support','name'},'Bad sense '+id);lex[id]=dict(id=id,lemma=lemma,ru=ru,uk=uk,tier=tier,group=group)
        for text in surf.split():
            k=key(text);lookup.setdefault(k,[]).append(id)
    files=sorted(base.glob('*.lesson'));check(files and [x.stem for x in files]==seq(len(files)) and len(files)<=32,'Missing or unordered lessons')
    for f in files:
        lid=f.stem;d=section(f);g,locale,level=split(d['grammar'][0],3);check(len(d['grammar'])==1 and len(d['title'])==1,'Exactly one grammar target and title');check(g=='estar.location.pres.ind.affirm','No grammar validator installed yet for '+g);forms=[split(r,5) for r in d['forms']];check(len(forms)==6 and {r[0]:r[2] for r in forms}==FORMS,'Wrong reference paradigm');steps=[split(r,5) for r in d['steps']];check([r[0] for r in steps]==['01','11','21','31','41'],'Wrong block ranges');rules=[split(r,5) for r in d['rules']];check(all(all(x in seq(50) for x in r[4].split(',')) for r in rules),'Broken theory link');rs=[split(r,5) for r in d['phrases']];check([r[0] for r in rs]==seq(50),'Expected exactly 50 ordered, stable IDs');phrases=[];old=set(ledger);used=set()
        for pid,person,ru,uk,es in rs:
            uid=f'{target}:{lid}:{pid}';words=eswords(es);verify_estar(words,person,ru);check(key(es) not in seen,'Repeated phrase: '+es);seen.add(key(es));slots=[];senses=[]
            for i,w in enumerate(words):
                ids=lookup.get(key(w),[]);check(len(ids)==1,'Missing/ambiguous lesson sense (supply an explicit mapping): '+w);k=ids[0];e=lex[k];used.add(k);senses.append(k);le=ledger.setdefault(k,{**e,'firstLesson':lid,'firstPhrase':uid,'forms':[],'examples':[]});
                if key(w) not in [key(z) for z in le['forms']]:le['forms'].append(w)
                if uid not in le['examples']:le['examples'].append(uid)
                slots.append(options(w,e['group'],uid,i))
            check(' '.join(w['correct'] for w in slots)+'.'==es,'Canonical/assembly mismatch: '+uid);phrases.append(dict(id=uid,num=pid,ru=ru,uk=uk,targetText=es,person=person,practiceWords=slots,senses=senses,alternatives=alternatives(words,person)))
        check(all(any(p['person']==k for p in phrases) for k in FORMS),'Missing person');lessons.append(dict(id=lid,title=split(d['title'][0],2),grammar=g,locale=locale,level=level,steps=steps,rules=rules,forms=forms,phrases=phrases,new=sorted(used-old),review=sorted(used&old)))
    check(set(lex)==set(ledger),'Gloss without a canonical example');return dict(schema='classic-grammar-author/1',target=target,productionReady=False,independentReview='pending',programme=prog,ledger=ledger,lessons=lessons,nextTopic=prog[len(files)] if len(files)<len(prog) else None)

def write(root,out):
    b=compile_course(root);template=(root/'preview.html').read_text('utf-8');out.mkdir(parents=True,exist_ok=True);write=lambda n,s:(out/n).write_bytes(s.encode());write('bundle.json',dump(b));write('ledger.json',dump(b['ledger']));write('NEXT.json',dump({'source':'grammar/es','next':b['nextTopic'],'priorSenses':sorted(b['ledger']),'exclude':['situation-led material','Learning V2'],'status':'implement next grammar validator before compiling'}))
    for l in b['lessons']:
        static=[]
        for j,p in enumerate(l['phrases']):
            if j%10==0:static.append('<h3>'+h(l['steps'][j//10][1])+'</h3>')
            static.append('<p><b>'+h(p['num'])+'</b> · '+h(p['ru'])+' — <strong>'+h(p['targetText'])+'</strong><br>'+h(' → '.join(w['correct'] for w in p['practiceWords']))+'</p>')
        data=json.dumps({'lesson':l,'ledger':b['ledger'],'programme':b['programme']},ensure_ascii=False,sort_keys=True).replace('<','\\u003c');write('ES-'+l['id']+'.html',template.replace('@@DATA@@',data).replace('@@STATIC@@',''.join(static)))
    slots=sum(len(p['practiceWords']) for l in b['lessons'] for p in l['phrases']);write('receipt.json',dump({'status':'technical_only','phrases':sum(len(l['phrases']) for l in b['lessons']),'wordPositions':slots,'review':'independent review pending','deployed':False}));print('Compiled',len(b['lessons']),'x 50 phrases;',slots,'word positions.')
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',required=True,type=Path);p.add_argument('--target',choices=['es'],default='es');a=p.parse_args();out=a.out.resolve();check(out!=ROOT and ROOT not in out.parents,'Use a separate output directory');write(ROOT,out)

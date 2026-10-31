"""Run against the actual offline document, 300 complete user journeys. No online calls."""
import shutil,subprocess,sys,tempfile
from pathlib import Path
JS=r'''<script>try{
const one=s=>document.querySelector(s),all=s=>Array.from(document.querySelectorAll(s)),must=(b,s)=>{if(!b)throw Error(s)},tap=s=>{const x=one(s);must(x,'missing '+s);x.click()},act=a=>tap('[data-a="'+a+'"]'),tabto=k=>tap('[data-a="tab"][data-k="'+k+'"]');let count=0,answers=0;const expected=lessons.reduce((n,l)=>n+l.phrases.reduce((s,p)=>s+p.practiceWords.length,0),0)*2;
must(one('.intro')&&!one('.choice'),'initial intro');
for(const lg of ['ru','uk']){tap('[data-lang="'+lg+'"]'); for(let h=0;h<3;h++){
 tap('[data-a="lesson"][data-i="'+h+'"]');act('nextIntro');act('nextIntro');act('launch');tabto('verb');must(all('.forms .card').length===6,'all forms');tabto('words');must(all('.lex .card').length>=5,'vocabulary');tabto('theory');must(all('#body details').length===7,'seven chapters');
 for(let i=0;i<50;i++){tabto('bank');must(all('.bank-item').length===50,'missing rows');tap('[data-a="run"][data-i="'+i+'"]');const p=lessons[h].phrases[i];must(one('#prompt').textContent===p.prompt[lg],'locale/ordering');must(!one('#target'),'answer already shown');for(let j=0;j<p.practiceWords.length;j++){
 const w=p.practiceWords[j];let buttons=all('.choice button');must(buttons.length===6,'six choices');if(j===0&&i===0){buttons.find(b=>b.textContent!==w.correct).click();must(st().slot===0&&one('[role="status"]').textContent,'wrong advanced');buttons=all('.choice button')}
 if(j===1&&i===0){act('why');act('back');must(st().slot===1&&st().idx===i,'lost selected word');buttons=all('.choice button')}
 const right=buttons.find(x=>x.textContent===w.correct);must(right,'missing answer');right.click();answers++;}
 must(one('#target')?.textContent===p.targetText,'final phrase/punctuation '+p.id);act('explain');must(one('#body details'),'word analysis');act('back');count++;}
 must(st().done.length===50,'completion tally mismatch');act('next');must(tab==='summary','no summary');}
}
must(count===300&&answers===expected,'wrong totals');document.body.setAttribute('data-proof',count+':'+answers);
}catch(e){document.body.setAttribute('data-err',e.message)}</script>'''
def main():
 p=Path(sys.argv[1]);src=p.read_text('utf8');ck='</body>';assert ck in src;exe=next((v for n in ('google-chrome','chromium','chromium-browser') if (v:=shutil.which(n))),None)
 if not exe:raise SystemExit('Chromium is required')
 with tempfile.TemporaryDirectory() as td:
  path=Path(td)/'fixture.html';path.write_text(src.replace(ck,JS+ck,1),'utf8');r=subprocess.run([exe,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking',f'--user-data-dir={td}/profile','--dump-dom',path.as_uri()],capture_output=True,timeout=150);body=r.stdout.split(b'<body',1)[-1].split(b'>',1)[0]
  if r.returncode or b'data-proof="300:' not in body:raise SystemExit(f'FAILED browser receipt: {body[:800]!r}; {r.stderr[-500:]!r}')
  print('Chromium PASS: '+body.decode('utf-8').strip())
if __name__=='__main__':main()

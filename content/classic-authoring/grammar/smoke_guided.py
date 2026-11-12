"""No external Python dependencies. Pass a generated offline lesson HTML path."""
from pathlib import Path
import shutil, subprocess, sys, tempfile

CASES=r'''<script>
try{
const qs=s=>document.querySelector(s), tap=s=>{const e=qs(s);if(!e)throw Error('missing '+s);e.click();}, must=(x,m)=>{if(!x)throw Error(m);};
must(qs('.intro-card')&&!qs('.choices'),'first paint must be intro');tap('[data-act=next]');tap('[data-act=next]');tap('[data-act=launch]');must(qs('#task')&&slot===0,'intro does not arrive at first phrase');
let total=0;
for(const locale of ['ru','uk']){
 tap('#'+locale);tap('[data-dest=bank]');must(document.querySelectorAll('article.phrase').length===50,'all phrases not visible');
 for(let i=0;i<P.length;i++){
  tap('[data-dest=bank]');tap(`[data-act=run][data-i="${i}"]`);const p=P[i];must(qs('#task').textContent===p[locale],'wrong local prompt');
  for(let j=0;j<p.practiceWords.length;j++){
   let buttons=[...document.querySelectorAll('[data-act=word]')];must(buttons.length===6,'expected six choices');let right=buttons.find(x=>x.textContent===p.practiceWords[j].correct);must(right,'missing correct');
   if(i===0&&j===0){buttons.find(x=>x!==right).click();must(slot===0&&qs('#feedback').textContent,'wrong word advanced');}
   if(i===0&&j===1){tap('[data-act=theory]');must(document.querySelectorAll('details.reader-rule').length===8,'missing theory');tap('[data-act=practice]');must(slot===1&&idx===0,'lost word position');buttons=[...document.querySelectorAll('[data-act=word]')];right=buttons.find(x=>x.textContent===p.practiceWords[j].correct);}
   right.click();total++;
  }
  must(qs('.success b').textContent===p.targetText,'wrong built sentence');
 }
 tap('[data-dest=theory]');for(let i=0;i<3;i++){tap(`[data-act=check][data-q="${i}"][data-j="${i%2?1:0}"]`);must(picked[i]===false,'wrong choice accepted');tap(`[data-act=check][data-q="${i}"][data-j="${i%2?0:1}"]`);must(picked[i]===true,'valid choice rejected');}
 tap('[data-dest=vocab]');must(qs('[data-act=run]'),'no linked vocabulary');
}
must(total===352,'wrong total');document.body.setAttribute('data-browser-proof','ok-352');
}catch(e){document.body.setAttribute('data-browser-error',e.message);}
</script>'''

def main():
 page=Path(sys.argv[1]);src=page.read_text('utf8');assert '</body>' in src
 chrome=next((x for n in ('google-chrome','chromium','chromium-browser') if (x:=shutil.which(n))),None)
 if not chrome:raise SystemExit('Chromium is required for this check')
 with tempfile.TemporaryDirectory() as td:
  fixture=Path(td)/'check.html';fixture.write_text(src.replace('</body>',CASES+'</body>',1),'utf8');run=subprocess.run([chrome,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',f'--user-data-dir={td}/profile','--dump-dom',fixture.as_uri()],capture_output=True,timeout=90)
  if run.returncode or b'data-browser-proof="ok-352"' not in run.stdout.split(b'<body',1)[1].split(b'>',1)[0]:
   print(run.stdout.split(b'<body',1)[-1][:350]);print(run.stderr[-800:]);raise SystemExit('Offline reader smoke failed')
 print('PASS: 50/50 phrases, 176/176 choices per locale; RU and UK; intro → trainer → theory → same word; 3 independent theory checks')
if __name__=='__main__':main()

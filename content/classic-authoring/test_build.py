"""Run: python -m unittest discover -s content/classic-authoring -p test_build.py -v"""
import copy,json,shutil,tempfile,unittest
from pathlib import Path
from build import ROOT,Invalid,align,compile_course,fold,norm,render,rows,tokens
class CourseTest(unittest.TestCase):
    def setUp(self):
        td=tempfile.TemporaryDirectory();self.addCleanup(td.cleanup);self.root=Path(td.name);self.es=self.root/'es';(self.es/'lessons').mkdir(parents=True)
        for name in ['course.psv','senses.psv']: shutil.copy(ROOT/'es'/name,self.es/name)
        shutil.copytree(ROOT/'es/lessons/01',self.es/'lessons/01');self.pg=self.es/'lessons/01/phrases.psv';self.g=self.pg.with_name('guide.json')
        # The gold regression fixture stays on lesson 1 even after later lessons expand the shared registry.
        ids={k for r in rows(self.pg,8) for k in r[4].split()};sf=self.es/'senses.psv';sf.write_text('\n'.join('|'.join(r) for r in rows(sf,7) if r[0] in ids)+'\n','utf-8')
    def b(self):return compile_course(self.root,'es')
    def swap(self,file,a,b):
        s=file.read_text('utf-8');self.assertIn(a,s);file.write_text(s.replace(a,b,1),'utf-8')
    def test_full_lesson(self):
        b=self.b();self.assertEqual(len(b['programme']),32);self.assertEqual(len(b['lessons'][0]['phrases']),50);self.assertEqual(b['nextBrief']['row'][0],'02');self.assertFalse(b['productionReady']);self.assertEqual(b['independentReview'],'pending')
    def test_pronominal_forms(self):
        e=self.b()['ledger']['llamarse'];self.assertEqual(e['firstPhrase'],'es:01:11');self.assertEqual(set(e['attestedForms']),{'Me llamo','te llamas','se llama'})
    def test_accent_and_senses(self):
        l=self.b()['ledger'];self.assertNotEqual(l['tu_pron']['key'],l['tu_pos']['key']);self.assertEqual(l['ser_origin']['firstPhrase'],'es:01:31');self.assertNotEqual(norm('tú'),norm('tu'))
    def test_tiles(self):
        for p in self.b()['lessons'][0]['phrases']:
            self.assertEqual([w['correct'] for w in p['practiceWords']],tokens(p['targetText'])); forbidden={fold(w) for s in [p['targetText']]+p['alternatives'] for w in tokens(s)}
            for w in p['practiceWords']:self.assertEqual(len(set(w['distractors'])),5);self.assertFalse(forbidden.intersection(map(fold,w['distractors'])))
    def test_reject_duplicate_phrase(self):
        self.swap(self.pg,'Buenas tardes.|','BUENOS DÍAS!|');self.assertRaises(Invalid,self.b)
    def test_reject_wrong_span(self):
        self.swap(self.pg,'|llamarse ana|','|vivir ana|');self.assertRaises(Invalid,self.b)
    def test_reject_missing_translation(self):
        self.swap(self.pg,'|Доброго ранку.|','||');self.assertRaises(Invalid,self.b)
    def test_reject_missing_phrase(self):
        self.pg.write_text('\n'.join(self.pg.read_text('utf-8').splitlines()[:-1]),'utf-8');self.assertRaises(Invalid,self.b)
    def test_bad_key(self):
        g=json.loads(self.g.read_text('utf-8'));g['checks'][0][3]='99';self.g.write_text(json.dumps(g),'utf-8');self.assertRaises(Invalid,self.b)
    def test_wrong_target(self):
        self.swap(self.g,'es-ES','fr-FR');self.assertRaises(Invalid,self.b)
    def test_course_order(self):
        self.pg.parent.rename(self.pg.parent.with_name('02'));self.assertRaises(Invalid,self.b)
    def test_ledger_across_lessons(self):
        # Synthetic full-length fixture, never published. A new suffix identifies each row as a different exercise.
        two=self.es/'lessons/02';shutil.copytree(self.pg.parent,two);g=json.loads(self.g.read_text('utf-8'));g['id']='ES-02';g['handoff']['next']='ES-03';(two/'guide.json').write_text(json.dumps(g),'utf-8');r=rows(two/'phrases.psv',8)
        for row in r:row[1]+=' hoy';row[4]+=' hoy'
        (two/'phrases.psv').write_text('\n'.join('|'.join(x) for x in r),'utf-8');sf=self.es/'senses.psv';sf.write_text(sf.read_text('utf-8')+'hoy|hoy|adverb|core|сегодня|сьогодні|hoy\n','utf-8');b=self.b();self.assertEqual(b['lessons'][1]['newSenses'],['hoy']);self.assertIn('llamarse',b['lessons'][1]['recycledSenses']);self.assertEqual(b['ledger']['llamarse']['firstPhrase'],'es:01:11');self.assertIn('es:02:11',b['ledger']['llamarse']['examples']);self.assertEqual(b['nextBrief']['row'][0],'03')
    def test_preview(self):
        b=self.b();page=render(b,b['lessons'][0]);self.assertIn('Первое знакомство',page);self.assertIn('Перше знайомство',page);self.assertIn('¿Cómo se llama usted?',page)
    def test_deterministic(self):self.assertEqual(self.b(),self.b())
if __name__=='__main__':unittest.main()

import csv, io, json, shutil, tempfile, unittest
from pathlib import Path
import build as core
import guided_build as g
class GuidedTests(unittest.TestCase):
 def setUp(self):
  temp=tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup); self.work=Path(temp.name);self.root=self.work/'source';shutil.copytree(core.ROOT,self.root);self.guide=self.root/'es/01.guide'
 def guide_error(self,before,after):
  t=self.guide.read_text('utf-8');self.assertIn(before,t);self.guide.write_text(t.replace(before,after,1),'utf-8');self.assertRaises(core.Invalid,g.prepare,self.root)
 def test_objects_and_order(self):
  d=g.prepare(self.root);l=d['lessons'][0];self.assertEqual([p['targetText'] for p in l['phrases'][:4]],['Estoy aquí.','Estás aquí.','Estás en casa.','Estoy en casa.']);self.assertEqual([p['displayPosition'] for p in l['phrases']],list(range(1,51)));self.assertEqual(l['phrases'][2]['id'],'es:01:07');self.assertEqual(d['ledger']['casa']['firstPhrase'],'es:01:07');self.assertFalse(d['productionReady']);self.assertEqual(len(l['guide']['intro']),3);self.assertEqual(len(l['guide']['theory']),7);self.assertEqual(len(l['guide']['checks']),3)
 def test_no_content_loss_or_ambiguous_article(self):
  ps=g.prepare(self.root)['lessons'][0]['phrases'];self.assertEqual({p['id']:p['targetText'] for p in ps},{p['id']:p['targetText'] for p in core.compile_course(self.root)['lessons'][0]['phrases']});self.assertEqual(sum(len(p['practiceWords']) for p in ps),176)
  for p in ps:
   for w in p['practiceWords']:
    self.assertEqual(len(set(w['choices'])),6);self.assertIn(w['correct'],w['choices']);self.assertNotIn(w['correct'],w['distractors']);
    if w['kind']=='article':self.assertFalse({'un','una'} & {s.lower() for s in w['choices']})
 def test_mandatory_guide(self):self.guide.unlink();self.assertRaises(core.Invalid,g.prepare,self.root)
 def test_missing_intro(self):self.guide_error('[intro]','[missing]')
 def test_missing_theory(self):self.guide_error('[theory]','[missing]')
 def test_no_broken_reference(self):self.guide_error('как','как') if False else self.guide_error('|01,02\n','|01,99\n')
 def test_no_order_collision(self):self.guide_error('01 02 07 06','01 01 07 06')
 def test_export(self):
  out=self.work/'out';g.write(self.root,out);s=(out/'ES-01.html').read_text('utf8');self.assertNotIn('@@',s);self.assertIn("tab='intro'",s);self.assertIn('Проверь себя',s);self.assertIn('Почати практику',s);self.assertFalse(json.loads((out/'receipt.json').read_text())['deployed']);self.assertEqual(len(list(csv.DictReader(io.StringIO((out/'audit-50.tsv').read_text('utf-8-sig')),delimiter='\t'))),50)
if __name__=='__main__':unittest.main()

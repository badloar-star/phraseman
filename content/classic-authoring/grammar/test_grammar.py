import shutil,tempfile,unittest,json
from pathlib import Path
import build as b
class GrammarTests(unittest.TestCase):
 def setUp(self):
  td=tempfile.TemporaryDirectory();self.addCleanup(td.cleanup);self.root=Path(td.name)/'g';shutil.copytree(b.ROOT,self.root);self.lesson=self.root/'es/01.lesson'
 def result(self):return b.compile_course(self.root)
 def change(self,a,c,p=None):
  p=p or self.lesson;text=p.read_text();head='';body=text
  if p==self.lesson:head,sep,body=text.partition('[phrases]\n');head+=sep;self.assertTrue(sep)
  self.assertIn(a,body);p.write_text(head+body.replace(a,c,1))
 def test_spine(self):
  d=self.result();self.assertEqual(len(d['programme']),32);self.assertEqual(d['nextTopic'][0],'02');self.assertIn('No перед',d['nextTopic'][1]);self.assertFalse(d['productionReady'])
 def test_fifty_and_assembly(self):
  rows=self.result()['lessons'][0]['phrases'];self.assertEqual(len(rows),50);self.assertEqual(len(set(p['targetText'] for p in rows)),50)
  for p in rows:
   self.assertEqual(' '.join(w['correct'] for w in p['practiceWords'])+'.',p['targetText']);self.assertTrue(p['ru'] and p['uk'])
   for w in p['practiceWords']:
    self.assertEqual(len(set(map(b.key,w['choices']))),6);self.assertEqual(w['choices'].count(w['correct']),1);self.assertEqual(len(w['distractors']),5)
 def test_all_verb_choices_contrast_person(self):
  for p in self.result()['lessons'][0]['phrases']:
   [v]=[w for w in p['practiceWords'] if w['kind']=='verb'];self.assertEqual(set(map(b.key,v['choices'])),set(b.FORMS.values()))
 def test_evidence(self):
  d=self.result();self.assertEqual(d['ledger']['estar_loc']['firstPhrase'],'es:01:01');self.assertEqual(len(d['ledger']['estar_loc']['forms']),6);self.assertEqual(len(d['ledger']['estar_loc']['examples']),50);self.assertEqual(d['ledger']['llave']['firstPhrase'],'es:01:32');self.assertEqual(set(d['ledger']['llave']['forms']),{'llave','llaves'});self.assertNotEqual(d['ledger']['art_def']['id'],d['ledger']['el_person']['id'])
 def test_gold(self):
  p=self.result()['lessons'][0]['phrases'];self.assertEqual(p[0]['targetText'],'Estoy aquí.');self.assertEqual(p[1]['targetText'],'Estás aquí.');self.assertEqual(p[-1]['targetText'],'Las llaves están en la mochila.');self.assertIn('Yo estoy aquí.',p[0]['alternatives']);self.assertIn('Está aquí.',p[10]['alternatives'])
 def test_agreement(self):
  self.change('Las llaves están aquí.','Las llaves está aquí.');self.assertRaises(b.Invalid,self.result)
 def test_wrong_subject_even_if_conjugation_metadata_matches(self):
  self.change('El móvil está aquí.','Los móviles está aquí.');self.assertRaises(b.Invalid,self.result)
 def test_reject_wrong_ru_subject(self):
  self.change('Я здесь.','Ты здесь.');self.assertRaises(b.Invalid,self.result)
 def test_no_second_predicate(self):
  self.change('Estoy aquí.','Quiero estar aquí.');self.assertRaises(b.Invalid,self.result)
 def test_no_question_in_affirmative_lesson(self):
  self.change('Estás allí.','¿Estás allí?');self.assertRaises(b.Invalid,self.result)
 def test_no_negation_in_first_lesson(self):
  self.change('Estoy lejos.','No estoy lejos.');self.assertRaises(b.Invalid,self.result)
 def test_duplicate_rejected(self):
  self.change('Estás allí.','Estás aquí.');self.assertRaises(b.Invalid,self.result)
 def test_reject_forward_dependency(self):
  self.change('Estoy aquí.|-','Estoy aquí.|02',self.root/'es/programme.psv');self.assertRaises(b.Invalid,self.result)
 def test_preview_and_receipt(self):
  out=self.root.parent/'out';b.write(self.root,out);src=(out/'ES-01.html').read_text();self.assertNotIn('@@DATA@@',src);self.assertNotIn('@@STATIC@@',src);self.assertIn('<noscript>',src);self.assertIn('data-opt=',src);self.assertEqual(json.loads((out/'receipt.json').read_text())['phrases'],50)
if __name__=='__main__':unittest.main()

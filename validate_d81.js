
const VALID_POS = new Set(['verb','noun','pronoun','adjective','adverb','modifier','preposition','syntax','determiner','existential','article','to-be','conjunction','modal','phrasal_particle','other']);

const phrases = [
  {id:'impuls_d81_p1', english:'The sink is broken today.', words:[
    {text:'The', partOfSpeech:'article', distractors:['A','An','This','That','Some']},
    {text:'sink', partOfSpeech:'noun', distractors:['pipe','tap','drain','wall','door']},
    {text:'is', partOfSpeech:'to-be', distractors:['are','was','be','am','were']},
    {text:'broken', partOfSpeech:'adjective', distractors:['clean','open','fixed','new','ready']},
    {text:'today', partOfSpeech:'adverb', distractors:['now','here','always','Monday','again']}
  ]},
  {id:'impuls_d81_p2', english:'Can you come on Monday?', words:[
    {text:'Can', partOfSpeech:'modal', distractors:['Will','Do','Are','Is','Should']},
    {text:'you', partOfSpeech:'pronoun', distractors:['he','she','they','we','it']},
    {text:'come', partOfSpeech:'verb', distractors:['go','call','fix','stay','check']},
    {text:'on', partOfSpeech:'preposition', distractors:['in','at','by','for','to']},
    {text:'Monday', partOfSpeech:'noun', distractors:['Tuesday','Friday','Sunday','morning','evening']}
  ]},
  {id:'impuls_d81_p3', english:'The pipe is leaking badly.', words:[
    {text:'The', partOfSpeech:'article', distractors:['A','An','My','This','Your']},
    {text:'pipe', partOfSpeech:'noun', distractors:['sink','tap','drain','wall','door']},
    {text:'is', partOfSpeech:'to-be', distractors:['are','was','be','am','were']},
    {text:'leaking', partOfSpeech:'verb', distractors:['broken','fixed','open','clean','working']},
    {text:'badly', partOfSpeech:'adverb', distractors:['slowly','today','always','here','again']}
  ]},
  {id:'impuls_d81_p4', english:'Can you fix it today?', words:[
    {text:'Can', partOfSpeech:'modal', distractors:['Will','Do','Are','Is','Could']},
    {text:'you', partOfSpeech:'pronoun', distractors:['he','she','they','we','I']},
    {text:'fix', partOfSpeech:'verb', distractors:['come','call','check','go','see']},
    {text:'it', partOfSpeech:'pronoun', distractors:['this','that','them','us','him']},
    {text:'today', partOfSpeech:'adverb', distractors:['now','Monday','here','always','again']}
  ]},
  {id:'impuls_d81_p5', english:'My address is Green Street ten.', words:[
    {text:'My', partOfSpeech:'determiner', distractors:['Your','The','A','Our','His']},
    {text:'address', partOfSpeech:'noun', distractors:['name','number','phone','street','flat']},
    {text:'is', partOfSpeech:'to-be', distractors:['are','was','be','am','were']},
    {text:'Green', partOfSpeech:'noun', distractors:['Main','Old','New','Park','Long']},
    {text:'Street', partOfSpeech:'noun', distractors:['Road','Avenue','Lane','Drive','Place']},
    {text:'ten', partOfSpeech:'noun', distractors:['five','one','four','eight','twelve']}
  ]},
  {id:'impuls_d81_p6', english:'The water is not hot.', words:[
    {text:'The', partOfSpeech:'article', distractors:['A','An','My','This','Some']},
    {text:'water', partOfSpeech:'noun', distractors:['pipe','sink','tap','drain','heat']},
    {text:'is', partOfSpeech:'to-be', distractors:['are','was','be','am','were']},
    {text:'not', partOfSpeech:'adverb', distractors:['very','too','so','also','still']},
    {text:'hot', partOfSpeech:'adjective', distractors:['cold','clean','broken','warm','ready']}
  ]}
];

const vocabulary = [
  {word:'sink', partOfSpeech:'noun', example:'The sink is broken today.'},
  {word:'pipe', partOfSpeech:'noun', example:'The pipe is leaking badly.'},
  {word:'leaking', partOfSpeech:'verb', example:'The pipe is leaking badly.'},
  {word:'fix', partOfSpeech:'verb', example:'Can you fix it today?'},
  {word:'address', partOfSpeech:'noun', example:'My address is Green Street ten.'},
  {word:'broken', partOfSpeech:'adjective', example:'The sink is broken today.'}
];

const intro = [{kind:'context'},{kind:'grammar'},{kind:'grammar'}];

console.log('=== STRUCTURE COUNTS ===');
console.log('Phrases:', phrases.length, '(need 6)', phrases.length === 6 ? 'OK' : 'ERROR');
console.log('Vocab:', vocabulary.length, '(need 6)', vocabulary.length === 6 ? 'OK' : 'ERROR');
console.log('Intro:', intro.length, '(need 3)', intro.length === 3 ? 'OK' : 'ERROR');

console.log('\n=== PHRASE CHECKS ===');
phrases.forEach(function(p) {
  var tokens = p.english.replace(/[?.!,]/g,'').trim().split(/\s+/);
  var wordTexts = p.words.map(function(w) { return w.text; });

  console.log('\n' + p.id + ': "' + p.english + '"');
  console.log('  Tokens:', tokens.join('|'), 'count=' + tokens.length);
  console.log('  words[] :', wordTexts.join('|'), 'count=' + wordTexts.length);

  if (tokens.length !== wordTexts.length) {
    console.log('  [ERROR] token count mismatch');
  }

  tokens.forEach(function(tok) {
    var found = wordTexts.some(function(wt) { return wt.toLowerCase() === tok.toLowerCase(); });
    if (!found) console.log('  [ERROR] phrase token "' + tok + '" missing from words[]');
  });

  wordTexts.forEach(function(wt) {
    var found = tokens.some(function(t) { return t.toLowerCase() === wt.toLowerCase(); });
    if (!found) console.log('  [ERROR] words[] entry "' + wt + '" missing from phrase tokens');
  });

  p.words.forEach(function(w) {
    if (w.distractors.length !== 5) {
      console.log('  [ERROR] word "' + w.text + '" distractors=' + w.distractors.length + ' (need 5)');
    }
    if (!VALID_POS.has(w.partOfSpeech)) {
      console.log('  [ERROR] Invalid POS "' + w.partOfSpeech + '" for "' + w.text + '"');
    }
    if (w.text.indexOf(' ') !== -1) {
      console.log('  [ERROR] Space in word text: "' + w.text + '"');
    }
  });
});

console.log('\n=== VOCAB CHECKS ===');
vocabulary.forEach(function(v) {
  if (!VALID_POS.has(v.partOfSpeech)) {
    console.log('[ERROR] Invalid vocab POS "' + v.partOfSpeech + '" for "' + v.word + '"');
  }
  var exTokens = v.example.replace(/[?.!,]/g,'').trim().split(/\s+/).map(function(t) { return t.toLowerCase(); });
  if (exTokens.indexOf(v.word.toLowerCase()) === -1) {
    console.log('[ERROR] vocab "' + v.word + '" NOT in example: "' + v.example + '"');
  } else {
    console.log('OK vocab "' + v.word + '" found in example');
  }
  var inAnyPhrase = phrases.some(function(p) {
    var pt = p.english.replace(/[?.!,]/g,'').trim().split(/\s+/).map(function(t) { return t.toLowerCase(); });
    return pt.indexOf(v.word.toLowerCase()) !== -1;
  });
  if (!inAnyPhrase) {
    console.log('[ERROR] vocab "' + v.word + '" NOT in any phrase');
  }
});

console.log('\n=== POS NOTES ===');
console.log('p5 Green -> noun: Green is part of proper noun street name, tagged noun. Consider: adjective is more typical for color-as-name, but noun is defensible as proper noun component.');
console.log('p5 Street -> noun: OK, common noun used as part of address');
console.log('p5 ten -> noun: ten as house number - tagged noun. More precisely it is a cardinal number/determiner. "noun" is debatable but within allowed POS set.');
console.log('p2 Monday -> noun: proper noun, OK');
console.log('p4 it -> pronoun: OK');
console.log('constructions check: p2 uses [modals] but modal is valid POS. Note: constructions field uses "modals" (plural) - this is separate from POS field which uses "modal"');

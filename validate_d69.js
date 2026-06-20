
var VALID_POS = ['verb','noun','pronoun','adjective','adverb','modifier','preposition','syntax','determiner','existential','article','to-be','conjunction','modal','phrasal_particle','other'];
var validSet = {};
for(var i=0;i<VALID_POS.length;i++) validSet[VALID_POS[i]] = true;

var phrases = [
  {id:'voyazh_d69_p1',english:'Can I pay by card?',words:[
    {text:'Can',partOfSpeech:'modal',distractors:['May','Will','Do','Should','Must']},
    {text:'I',partOfSpeech:'pronoun',distractors:['we','you','they','he','she']},
    {text:'pay',partOfSpeech:'verb',distractors:['buy','give','take','send','ask']},
    {text:'by',partOfSpeech:'preposition',distractors:['with','on','at','for','in']},
    {text:'card',partOfSpeech:'noun',distractors:['cash','check','money','bill','coin']}
  ]},
  {id:'voyazh_d69_p2',english:'How much does it cost?',words:[
    {text:'How',partOfSpeech:'adverb',distractors:['What','Where','When','Which','Why']},
    {text:'much',partOfSpeech:'determiner',distractors:['many','long','far','often','well']},
    {text:'does',partOfSpeech:'verb',distractors:['do','is','has','was','did']},
    {text:'it',partOfSpeech:'pronoun',distractors:['this','that','they','he','she']},
    {text:'cost',partOfSpeech:'verb',distractors:['pay','sell','price','buy','give']}
  ]},
  {id:'voyazh_d69_p3',english:'Do you accept credit cards?',words:[
    {text:'Do',partOfSpeech:'verb',distractors:['Can','Are','Have','Will','Did']},
    {text:'you',partOfSpeech:'pronoun',distractors:['they','we','I','he','she']},
    {text:'accept',partOfSpeech:'verb',distractors:['take','use','give','want','need']},
    {text:'credit',partOfSpeech:'adjective',distractors:['debit','gift','cash','bank','store']},
    {text:'cards',partOfSpeech:'noun',distractors:['cash','coins','checks','bills','money']}
  ]},
  {id:'voyazh_d69_p4',english:'Can I get a receipt, please?',words:[
    {text:'Can',partOfSpeech:'modal',distractors:['Will','Should','Must','May','Do']},
    {text:'I',partOfSpeech:'pronoun',distractors:['we','you','they','he','she']},
    {text:'get',partOfSpeech:'verb',distractors:['give','take','have','make','find']},
    {text:'a',partOfSpeech:'article',distractors:['the','my','this','one','any']},
    {text:'receipt',partOfSpeech:'noun',distractors:['bill','card','ticket','coin','note']}
  ]},
  {id:'voyazh_d69_p5',english:'I want to pay in cash.',words:[
    {text:'I',partOfSpeech:'pronoun',distractors:['we','you','they','he','she']},
    {text:'want',partOfSpeech:'verb',distractors:['need','like','try','plan','hope']},
    {text:'to',partOfSpeech:'other',distractors:['by','in','at','for','with']},
    {text:'pay',partOfSpeech:'verb',distractors:['buy','give','take','send','get']},
    {text:'in',partOfSpeech:'preposition',distractors:['by','with','at','on','for']},
    {text:'cash',partOfSpeech:'noun',distractors:['card','check','coins','bill','money']}
  ]},
  {id:'voyazh_d69_p6',english:'Does this price include tax?',words:[
    {text:'Does',partOfSpeech:'verb',distractors:['Do','Is','Has','Can','Will']},
    {text:'this',partOfSpeech:'determiner',distractors:['that','the','a','my','your']},
    {text:'price',partOfSpeech:'noun',distractors:['cost','bill','card','tax','receipt']},
    {text:'include',partOfSpeech:'verb',distractors:['have','add','cover','show','mean']},
    {text:'tax',partOfSpeech:'noun',distractors:['tip','fee','cost','bill','charge']}
  ]}
];

var vocabulary = [
  {word:'pay',partOfSpeech:'verb',example:'Can I pay by card?'},
  {word:'card',partOfSpeech:'noun',example:'Can I pay by card?'},
  {word:'cost',partOfSpeech:'verb',example:'How much does it cost?'},
  {word:'receipt',partOfSpeech:'noun',example:'Can I get a receipt, please?'},
  {word:'cash',partOfSpeech:'noun',example:'I want to pay in cash.'},
  {word:'tax',partOfSpeech:'noun',example:'Does this price include tax?'}
];

var introKinds = ['context','grammar','tip'];

var issues = [];

// 1. Count checks
if(phrases.length !== 6) issues.push('PHRASE_COUNT: got ' + phrases.length + ', expected 6');
if(vocabulary.length !== 6) issues.push('VOCAB_COUNT: got ' + vocabulary.length + ', expected 6');
if(introKinds.length !== 3) issues.push('INTRO_COUNT: got ' + introKinds.length + ', expected 3');

// 2. POS + distractor count per word
for(var i=0;i<phrases.length;i++) {
  var p = phrases[i];
  for(var j=0;j<p.words.length;j++) {
    var w = p.words[j];
    if(!validSet[w.partOfSpeech]) {
      issues.push('INVALID_POS: ' + p.id + ' word=' + w.text + ' pos=' + w.partOfSpeech);
    }
    if(w.distractors.length !== 5) {
      issues.push('DISTRACTOR_COUNT: ' + p.id + ' word=' + w.text + ' count=' + w.distractors.length);
    }
  }
}

// 3. Space in word text
for(var i=0;i<phrases.length;i++) {
  var p = phrases[i];
  for(var j=0;j<p.words.length;j++) {
    var w = p.words[j];
    if(w.text.indexOf(' ') !== -1) {
      issues.push('SPACE_IN_WORD: ' + p.id + ' word=' + JSON.stringify(w.text));
    }
  }
}

// 4. Each words[].text must appear in phrase english tokens
for(var i=0;i<phrases.length;i++) {
  var p = phrases[i];
  var tokens = p.english.toLowerCase().replace(/[^a-z ]/g,'').split(' ').filter(function(x){return x.length>0;});
  for(var j=0;j<p.words.length;j++) {
    var w = p.words[j];
    var found = false;
    for(var k=0;k<tokens.length;k++) {
      if(tokens[k] === w.text.toLowerCase()) { found=true; break; }
    }
    if(!found) {
      issues.push('WORD_NOT_IN_PHRASE: ' + p.id + ' word=' + w.text + ' tokens=[' + tokens.join(',') + ']');
    }
  }
}

// 5. vocab.word in at least one phrase (substring match)
var allEn = phrases.map(function(p){return p.english.toLowerCase();});
for(var i=0;i<vocabulary.length;i++) {
  var v = vocabulary[i];
  var wl = v.word.toLowerCase();
  var found = false;
  for(var k=0;k<allEn.length;k++) {
    if(allEn[k].indexOf(wl) !== -1) { found=true; break; }
  }
  if(!found) {
    issues.push('VOCAB_NOT_IN_PHRASES: ' + v.word);
  }
}

// 6. vocab POS valid
for(var i=0;i<vocabulary.length;i++) {
  var v = vocabulary[i];
  if(!validSet[v.partOfSpeech]) {
    issues.push('INVALID_VOCAB_POS: ' + v.word + ' pos=' + v.partOfSpeech);
  }
}

// 7. please in p4 - not in words array
var p4 = phrases[3];
var p4tokens = p4.english.toLowerCase().replace(/[^a-z ]/g,'').split(' ').filter(function(x){return x.length>0;});
var p4wordTexts = p4.words.map(function(w){return w.text.toLowerCase();});
console.log('p4 phrase tokens: ' + p4tokens.join('|'));
console.log('p4 words array: ' + p4wordTexts.join('|'));

if(issues.length === 0) {
  console.log('ALL_CLEAN');
} else {
  for(var i=0;i<issues.length;i++) {
    console.log('ISSUE: ' + issues[i]);
  }
}

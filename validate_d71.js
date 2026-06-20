
var VALID_POS = ['verb','noun','pronoun','adjective','adverb','modifier','preposition','syntax','determiner','existential','article','to-be','conjunction','modal','phrasal_particle','other'];

var phrases = [
  {id:'voyazh_d71_p1',english:'I bought a beautiful scarf for my wife.',words:[
    {text:'I',partOfSpeech:'pronoun',distractors:['Me','My','We','He','She']},
    {text:'bought',partOfSpeech:'verb',distractors:['buyed','buy','buys','buying','bought.']},
    {text:'a',partOfSpeech:'article',distractors:['the','an','some','my','this']},
    {text:'beautiful',partOfSpeech:'adjective',distractors:['beautifully','beauty','more','ugly','old']},
    {text:'scarf',partOfSpeech:'noun',distractors:['scarfs',"scarf's",'bag','hat','shirt']},
    {text:'for',partOfSpeech:'preposition',distractors:['to','with','of','from','at']},
    {text:'my',partOfSpeech:'pronoun',distractors:['your','his','her','our','their']},
    {text:'wife',partOfSpeech:'noun',distractors:['wifes','husband','wives','friend','mother']}
  ]},
  {id:'voyazh_d71_p2',english:'She found her favorite shop here.',words:[
    {text:'She',partOfSpeech:'pronoun',distractors:['Her','He','They','We','I']},
    {text:'found',partOfSpeech:'verb',distractors:['finded','find','finds','finding','fund']},
    {text:'her',partOfSpeech:'pronoun',distractors:['his','my','their','our','its']},
    {text:'favorite',partOfSpeech:'adjective',distractors:['favoritely','favour','best','boring','old']},
    {text:'shop',partOfSpeech:'noun',distractors:['shops','shopping','store','market','mall']},
    {text:'here',partOfSpeech:'adverb',distractors:['there','where','near','this','now']}
  ]},
  {id:'voyazh_d71_p3',english:'We spent all our money on souvenirs.',words:[
    {text:'We',partOfSpeech:'pronoun',distractors:['Us','Our','They','I','She']},
    {text:'spent',partOfSpeech:'verb',distractors:['spended','spend','spends','spendt','paid']},
    {text:'all',partOfSpeech:'determiner',distractors:['every','some','few','most','any']},
    {text:'our',partOfSpeech:'pronoun',distractors:['my','their','his','her','its']},
    {text:'money',partOfSpeech:'noun',distractors:['moneys','cash','coins','budget','price']},
    {text:'on',partOfSpeech:'preposition',distractors:['for','at','in','with','to']},
    {text:'souvenirs',partOfSpeech:'noun',distractors:['souvenir','gifts','souveniers','things','toys']}
  ]},
  {id:'voyazh_d71_p4',english:'My friend gave me a great idea.',words:[
    {text:'My',partOfSpeech:'pronoun',distractors:['Your','His','Her','Our','Their']},
    {text:'friend',partOfSpeech:'noun',distractors:['friends','friendly','buddy','mate','colleague']},
    {text:'gave',partOfSpeech:'verb',distractors:['gived','give','gives','given','gets']},
    {text:'me',partOfSpeech:'pronoun',distractors:['I','my','him','her','us']},
    {text:'a',partOfSpeech:'article',distractors:['the','an','some','this','one']},
    {text:'great',partOfSpeech:'adjective',distractors:['greatly','greater','good','bad','small']},
    {text:'idea',partOfSpeech:'noun',distractors:['ideas','ideal','thought','plan','wish']}
  ]},
  {id:'voyazh_d71_p5',english:'Did you see their new collection?',words:[
    {text:'Did',partOfSpeech:'verb',distractors:['Do','Does','Have','Was','Were']},
    {text:'you',partOfSpeech:'pronoun',distractors:['your','we','they','he','I']},
    {text:'see',partOfSpeech:'verb',distractors:['saw','seen','sees','look','watch']},
    {text:'their',partOfSpeech:'pronoun',distractors:['there','they','our','his','my']},
    {text:'new',partOfSpeech:'adjective',distractors:['newly','newer','old','latest','fresh']},
    {text:'collection',partOfSpeech:'noun',distractors:['collections','collect','collector','set','series']}
  ]},
  {id:'voyazh_d71_p6',english:'He took his wife to the market.',words:[
    {text:'He',partOfSpeech:'pronoun',distractors:['His','She','They','We','I']},
    {text:'took',partOfSpeech:'verb',distractors:['taked','take','takes','taken','brought']},
    {text:'his',partOfSpeech:'pronoun',distractors:['her','my','our','their','its']},
    {text:'wife',partOfSpeech:'noun',distractors:['wifes','husband','wives','friend','partner']},
    {text:'to',partOfSpeech:'preposition',distractors:['at','in','on','for','from']},
    {text:'the',partOfSpeech:'article',distractors:['a','an','this','that','some']},
    {text:'market',partOfSpeech:'noun',distractors:['markets','mall','shop','store','bazaar']}
  ]}
];

var vocabulary = [
  {word:'bought',partOfSpeech:'verb',example:'I bought a beautiful scarf for my wife.'},
  {word:'scarf',partOfSpeech:'noun',example:'I bought a beautiful scarf for my wife.'},
  {word:'found',partOfSpeech:'verb',example:'She found her favorite shop here.'},
  {word:'spent',partOfSpeech:'verb',example:'We spent all our money on souvenirs.'},
  {word:'souvenirs',partOfSpeech:'noun',example:'We spent all our money on souvenirs.'},
  {word:'collection',partOfSpeech:'noun',example:'Did you see their new collection?'}
];

var intro = [{kind:'context'},{kind:'grammar'},{kind:'tip'}];

var issues = [];

// counts
if(phrases.length !== 6) issues.push('phrase count=' + phrases.length);
if(intro.length !== 3) issues.push('intro count=' + intro.length);
if(vocabulary.length !== 6) issues.push('vocab count=' + vocabulary.length);

phrases.forEach(function(p) {
  p.words.forEach(function(w) {
    // distractor count
    if(w.distractors.length !== 5) {
      issues.push(p.id + ' [' + w.text + '] distractors=' + w.distractors.length);
    }
    // POS validity
    if(VALID_POS.indexOf(w.partOfSpeech) === -1) {
      issues.push(p.id + ' [' + w.text + '] invalid POS: ' + w.partOfSpeech);
    }
    // text with space
    if(w.text.indexOf(' ') !== -1) {
      issues.push(p.id + ' [' + w.text + '] has space in text');
    }
  });

  // word in phrase tokens
  var tokens = p.english.replace(/[?.!,]/g,'').split(' ').map(function(t){ return t.toLowerCase(); });
  p.words.forEach(function(w) {
    if(tokens.indexOf(w.text.toLowerCase()) === -1) {
      issues.push(p.id + ' [' + w.text + '] NOT in phrase tokens: ' + tokens.join(','));
    }
  });
});

// vocab word in its example phrase (same form)
vocabulary.forEach(function(v) {
  var ph = null;
  for(var i=0;i<phrases.length;i++){
    if(phrases[i].english === v.example){ ph = phrases[i]; break; }
  }
  if(!ph) {
    issues.push('vocab [' + v.word + '] example not matching any phrase: ' + v.example);
    return;
  }
  var tokens = ph.english.replace(/[?.!,]/g,'').split(' ').map(function(t){ return t.toLowerCase(); });
  if(tokens.indexOf(v.word.toLowerCase()) === -1) {
    issues.push('vocab [' + v.word + '] not found (same form) in example phrase tokens: ' + tokens.join(','));
  }
});

if(issues.length === 0) {
  console.log('CLEAN');
} else {
  issues.forEach(function(i){ console.log('ISSUE: ' + i); });
}

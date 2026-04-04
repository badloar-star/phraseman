const fs = require('fs');
const path = 'c:/appsprojects/phraseman/app/lesson_data_all.ts';
let content = fs.readFileSync(path, 'utf8');

const newPhrases = `
  {id:'l22p21',english:'Smoking in this public place is strictly forbidden.',russian:'Курение в этом общественном месте строго запрещено.',ukrainian:'Куріння в цьому громадському місці суворо заборонено.',words:[{text:'Smoking',correct:'Smoking',distractors:['Smoke','Smokes','Smoked','Smiling','Smelling']},{text:'in',correct:'in',distractors:['on','at','for','to','by']},{text:'this',correct:'this',distractors:['that','these','those','thin','thus']},{text:'public',correct:'public',distractors:['publish','popular','people','private','power']},{text:'place',correct:'place',distractors:['plate','plane','palace','peace','price']},{text:'is',correct:'is',distractors:['are','am','be','was','were']},{text:'strictly',correct:'strictly',distractors:['strict','strong','strange','straight','street']},{text:'forbidden.',correct:'forbidden.',distractors:['forbid.','forgot.','forward.','forest.','formal.']}]},
  {id:'l22p22',english:'Someone suggested ordering that large pizza with mushrooms.',russian:'Кто-то предложил заказать ту большую пиццу с грибами.',ukrainian:'Хтось запропонував замовити ту велику піцу з грибами.',words:[{text:'Someone',correct:'Someone',distractors:['Anyone','No one','Everyone','Something','Anything']},{text:'suggested',correct:'suggested',distractors:['suggest','suggests','suggesting','support','supply']},{text:'ordering',correct:'ordering',distractors:['order','orders','ordered','opening','offering']},{text:'that',correct:'that',distractors:['this','these','those','than','then']},{text:'large',correct:'large',distractors:['long','laugh','light','low','last']},{text:'pizza',correct:'pizza',distractors:['piece','plate','pasta','price','pilot']},{text:'with',correct:'with',distractors:['without','within','worth','water','white']},{text:'mushrooms.',correct:'mushrooms.',distractors:['mushroom.','music.','muscle.','museum.','mountain.']}]},
  {id:'l22p23',english:'Is your hobby collecting these old rare stamps?',russian:'Ваше хобби — коллекционирование этих старых редких марок?',ukrainian:'Ваше хобі — колекціонування цих старих рідкісних марок?',words:[{text:'Is',correct:'Is',distractors:['Are','Am','Be','Was','Were']},{text:'your',correct:'your',distractors:['you','yours','yourself','our','their']},{text:'hobby',correct:'hobby',distractors:['hobbies','habits','holiday','honey','happy']},{text:'collecting',correct:'collecting',distractors:['collect','collects','collected','calling','cleaning']},{text:'these',correct:'these',distractors:['this','that','those','then','thus']},{text:'old',correct:'old',distractors:['gold','cold','hold','bold','older']},{text:'rare',correct:'rare',distractors:['rain','rich','real','rise','race']},{text:'stamps?',correct:'stamps?',distractors:['stamp?','steps?','stops?','stars?','states?']}]},
  {id:'l22p24',english:'She really likes photographing these wild animals in forest.',russian:'Она действительно любит фотографировать этих диких животных в лесу.',ukrainian:'Вона дійсно любить фотографувати цих диких тварин у лісі.',words:[{text:'She',correct:'She',distractors:['Her','He','They','We','It']},{text:'really',correct:'really',distractors:['real','ready','rely','rare','early']},{text:'likes',correct:'likes',distractors:['like','liked','liking','links','lacks']},{text:'photographing',correct:'photographing',distractors:['photograph','photographs','photo','phone','painting']},{text:'these',correct:'these',distractors:['this','that','those','then','thus']},{text:'wild',correct:'wild',distractors:['wide','wind','wing','wine','wall']},{text:'animals',correct:'animals',distractors:['animal','another','anymore','anyway','army']},{text:'in',correct:'in',distractors:['on','at','to','for','by']},{text:'forest.',correct:'forest.',distractors:['forests.','formal.','former.','forget.','forward.']}]},
  {id:'l22p25',english:'Studying this complex topic requires much free time.',russian:'Изучение этой сложной темы требует много свободного времени.',ukrainian:'Вивчення цієї складної теми потребує багато вільного часу.',words:[{text:'Studying',correct:'Studying',distractors:['Study','Studies','Studied','Staying','Starting']},{text:'this',correct:'this',distractors:['that','these','those','thin','thus']},{text:'complex',correct:'complex',distractors:['complete','complaint','company','comfort','compare']},{text:'topic',correct:'topic',distractors:['top','type','total','table','trip']},{text:'requires',correct:'requires',distractors:['require','required','requiring','requests','returns']},{text:'much',correct:'much',distractors:['many','more','most','match','march']},{text:'free',correct:'free',distractors:['feel','fire','fresh','front','fruit']},{text:'time.',correct:'time.',distractors:['times.','team.','term.','tame.','tide.']}]},`;

const marker = "  {id:'l22p20',";
const idx = content.indexOf(marker);
if (idx === -1) { console.error('marker not found'); process.exit(1); }

let pos = idx;
let braceCount = 0;
let started = false;
while (pos < content.length) {
  const ch = content[pos];
  if (ch === '{') { braceCount++; started = true; }
  else if (ch === '}') { braceCount--; if (started && braceCount === 0) { pos++; break; } }
  pos++;
}
if (content[pos] === ',') pos++;

const before = content.slice(0, pos);
const after = content.slice(pos);
fs.writeFileSync(path, before + '\n' + newPhrases + after, 'utf8');
console.log('Done, inserted l22p21-p25');

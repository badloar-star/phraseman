const fs = require('fs');
const path = 'c:/appsprojects/phraseman/app/lesson_data_all.ts';
let content = fs.readFileSync(path, 'utf8');

const lesson22Block = `
// ============================================================
// LESSON 22 — Gerund
// ============================================================

export const LESSON_22_INTRO_SCREENS = [
  { titleRU: 'Урок 22: Герундий', titleUK: 'Урок 22: Герундій', textRU: 'Герундий — форма глагола с окончанием -ing, которая работает как существительное. Например: Swimming is fun. I enjoy cooking. She finished writing.', textUK: 'Герундій — форма дієслова із закінченням -ing, яка працює як іменник. Наприклад: Swimming is fun. I enjoy cooking. She finished writing.' },
  { titleRU: 'Глаголы с герундием', titleUK: 'Дієслова з герундієм', textRU: 'После этих глаголов всегда используется герундий: enjoy, finish, stop, avoid, keep, dislike, hate, suggest, mention, prefer, appreciate, imagine, require, include.', textUK: 'Після цих дієслів завжди вживається герундій: enjoy, finish, stop, avoid, keep, dislike, hate, suggest, mention, prefer, appreciate, imagine, require, include.' },
];

const LESSON_22_PHRASES: LessonPhrase[] = [
  {id:'l22p1',english:'Swimming in cold ocean is very refreshing.',russian:'Плавание в холодном океане очень бодрит.',ukrainian:'Плавання в холодному океані дуже бадьорить.',words:[{text:'Swimming',correct:'Swimming',distractors:['Swim','Swims','Swam','Swum','Swimmer']},{text:'in',correct:'in',distractors:['on','at','by','for','to']},{text:'cold',correct:'cold',distractors:['cool','could','gold','bold','called']},{text:'ocean',correct:'ocean',distractors:['sea','river','lake','open','often']},{text:'is',correct:'is',distractors:['are','am','be','was','been']},{text:'very',correct:'very',distractors:['every','vary','really','early','only']},{text:'refreshing.',correct:'refreshing.',distractors:['refresh.','refreshed.','fresh.','fishing.','flash.']}]},
  {id:'l22p2',english:'She finished writing that long technical report.',russian:'Она закончила писать тот длинный технический отчет.',ukrainian:'Вона закінчила писати той довгий технічний звіт.',words:[{text:'She',correct:'She',distractors:['Her','He','They','We','It']},{text:'finished',correct:'finished',distractors:['finish','finishes','finishing','fine','fixed']},{text:'writing',correct:'writing',distractors:['write','writes','wrote','written','waiting']},{text:'that',correct:'that',distractors:['this','these','those','than','then']},{text:'long',correct:'long',distractors:['short','length','along','light','last']},{text:'technical',correct:'technical',distractors:['technique','teacher','total','typical','technology']},{text:'report.',correct:'report.',distractors:['repeat.','repair.','record.','resort.','remote.']}]},
  {id:'l22p3',english:'My brother really enjoys cooking spicy food.',russian:'Мой брат действительно обожает готовить острую еду.',ukrainian:'Мій брат дійсно обожнює готувати гостру їжу.',words:[{text:'My',correct:'My',distractors:['Me','Mine','I','Your','His']},{text:'brother',correct:'brother',distractors:['brothers','mother','father','bother','border']},{text:'really',correct:'really',distractors:['real','ready','rare','rely','early']},{text:'enjoys',correct:'enjoys',distractors:['enjoy','enjoyed','enjoying','engine','enough']},{text:'cooking',correct:'cooking',distractors:['cook','cooks','cooked','cool','cake']},{text:'spicy',correct:'spicy',distractors:['space','spice','special','spring','spider']},{text:'food.',correct:'food.',distractors:['foot.','feed.','flood.','fold.','fool.']}]},
  {id:'l22p4',english:'Learning foreign languages opens new opportunities.',russian:'Изучение иностранных языков открывает новые возможности.',ukrainian:'Вивчення іноземних мов відкриває нові можливості.',words:[{text:'Learning',correct:'Learning',distractors:['Learn','Learns','Learned','Lean','Leaving']},{text:'foreign',correct:'foreign',distractors:['forest','forget','forward','formal','former']},{text:'languages',correct:'languages',distractors:['language','luggage','landscapes','laugh','large']},{text:'opens',correct:'opens',distractors:['open','opened','opening','often','offers']},{text:'new',correct:'new',distractors:['now','news','net','next','know']},{text:'opportunities.',correct:'opportunities.',distractors:['opportunity.','opposite.','operations.','opinions.','options.']}]},
  {id:'l22p5',english:'Do you prefer travelling by train or plane?',russian:'Вы предпочитаете путешествовать на поезде или самолете?',ukrainian:'Ви надаєте перевагу подорожам потягом чи літаком?',words:[{text:'Do',correct:'Do',distractors:['Does','Done','Doing','Did','Is']},{text:'you',correct:'you',distractors:['your','yours','yourself','we','they']},{text:'prefer',correct:'prefer',distractors:['prefers','preferred','perfect','prepare','present']},{text:'travelling',correct:'travelling',distractors:['travel','travels','travelled','training','tracking']},{text:'by',correct:'by',distractors:['buy','bus','be','at','in']},{text:'train',correct:'train',distractors:['rain','brain','trade','trial','grain']},{text:'or',correct:'or',distractors:['of','on','our','out','for']},{text:'plane?',correct:'plane?',distractors:['plant?','plate?','place?','plain?','plan?']}]},
  {id:'l22p6',english:'Reading this new article helps me understand modern economy.',russian:'Чтение этой новой статьи помогает мне понять современную экономику.',ukrainian:'Читання цієї нової статті допомагає мені зрозуміти сучасну економіку.',words:[{text:'Reading',correct:'Reading',distractors:['Read','Reads','Ready','Riding','Running']},{text:'this',correct:'this',distractors:['that','these','those','thin','thus']},{text:'new',correct:'new',distractors:['now','news','newly','net','next']},{text:'article',correct:'article',distractors:['articles','artist','army','archive','active']},{text:'helps',correct:'helps',distractors:['help','helped','helping','holds','heels']},{text:'me',correct:'me',distractors:['my','mine','I','you','him']},{text:'understand',correct:'understand',distractors:['understood','understands','understanding','under','stand']},{text:'modern',correct:'modern',distractors:['model','modest','morning','mountain','moderate']},{text:'economy.',correct:'economy.',distractors:['economic.','economist.','ecology.','energy.','entry.']}]},
  {id:'l22p7',english:'They stopped discussing that old problem at the meeting.',russian:'Они прекратили обсуждать ту старую проблему на собрании.',ukrainian:'Вони припинили обговорювати ту стару проблему на зборах.',words:[{text:'They',correct:'They',distractors:['Them','Their','We','You','It']},{text:'stopped',correct:'stopped',distractors:['stop','stops','stopping','stepped','stayed']},{text:'discussing',correct:'discussing',distractors:['discuss','discussed','discusses','dressing','drinking']},{text:'that',correct:'that',distractors:['this','these','those','than','then']},{text:'old',correct:'old',distractors:['older','oldest','gold','cold','hold']},{text:'problem',correct:'problem',distractors:['problems','program','project','product','profile']},{text:'at',correct:'at',distractors:['on','in','to','for','by']},{text:'the',correct:'the',distractors:['a','an','some','any','each']},{text:'meeting.',correct:'meeting.',distractors:['meet.','meets.','metal.','mental.','matter.']}]},
  {id:'l22p8',english:'Riding bicycle in the park is his favorite activity.',russian:'Езда на велосипеде в парке — его любимое занятие.',ukrainian:'Їзда на велосипеді в парку — його улюблене заняття.',words:[{text:'Riding',correct:'Riding',distractors:['Ride','Rides','Road','Reading','Running']},{text:'bicycle',correct:'bicycle',distractors:['bicycles','bike','circle','cycle','bottle']},{text:'in',correct:'in',distractors:['on','at','to','for','by']},{text:'the',correct:'the',distractors:['a','an','some','any','each']},{text:'park',correct:'park',distractors:['parks','part','dark','pork','pack']},{text:'is',correct:'is',distractors:['are','am','be','was','been']},{text:'his',correct:'his',distractors:['he','him','her','my','your']},{text:'favorite',correct:'favorite',distractors:['favor','famous','family','father','fashion']},{text:'activity.',correct:'activity.',distractors:['active.','activities.','action.','actor.','account.']}]},
  {id:'l22p9',english:'Our manager suggested rescheduling that important meeting.',russian:'Наш руководитель предложил перенести ту важную встречу.',ukrainian:'Наш керівник запропонував перенести ту важливу зустріч.',words:[{text:'Our',correct:'Our',distractors:['Us','We','Ours','Hour','Out']},{text:'manager',correct:'manager',distractors:['manage','managed','memory','member','message']},{text:'suggested',correct:'suggested',distractors:['suggest','suggests','suggesting','support','supply']},{text:'rescheduling',correct:'rescheduling',distractors:['reschedule','reschedules','reading','recording','returning']},{text:'that',correct:'that',distractors:['this','these','those','than','then']},{text:'important',correct:'important',distractors:['importance','import','improve','imagine','impossible']},{text:'meeting.',correct:'meeting.',distractors:['meet.','meets.','metal.','mental.','matter.']}]},
  {id:'l22p10',english:'We avoid buying cheap plastic toys for children.',russian:'Мы избегаем покупать дешевые пластиковые игрушки для детей.',ukrainian:'Ми уникаємо купувати дешеві пластикові іграшки для дітей.',words:[{text:'We',correct:'We',distractors:['Us','Our','Ours','They','You']},{text:'avoid',correct:'avoid',distractors:['avoids','avoided','advice','admit','adjust']},{text:'buying',correct:'buying',distractors:['buy','buys','bought','building','bringing']},{text:'cheap',correct:'cheap',distractors:['check','chief','chest','chip','chair']},{text:'plastic',correct:'plastic',distractors:['plate','place','plants','player','pocket']},{text:'toys',correct:'toys',distractors:['toy','top','today','town','tower']},{text:'for',correct:'for',distractors:['four','from','form','far','fore']},{text:'children.',correct:'children.',distractors:['child.','childs.','chicken.','kitchen.','church.']}]},
  {id:'l22p11',english:'Painting these bright landscapes requires great patience.',russian:'Рисование этих ярких пейзажей требует большого терпения.',ukrainian:'Малювання цих яскравих пейзажів потребує великого терпіння.',words:[{text:'Painting',correct:'Painting',distractors:['Paint','Paints','Painted','Printing','Pointing']},{text:'these',correct:'these',distractors:['this','that','those','then','thus']},{text:'bright',correct:'bright',distractors:['bring','brought','bridge','bright-ly','brisk']},{text:'landscapes',correct:'landscapes',distractors:['landscape','land','lands','language','luggage']},{text:'requires',correct:'requires',distractors:['require','required','requiring','requests','returns']},{text:'great',correct:'great',distractors:['greet','green','grey','ground','grade']},{text:'patience.',correct:'patience.',distractors:['patient.','parents.','pattern.','partner.','portion.']}]},
  {id:'l22p12',english:'He keeps ignoring my messages for some reason.',russian:'Он продолжает игнорировать мои сообщения по какой-то причине.',ukrainian:'Він продовжує ігнорувати мої повідомлення з якоїсь причини.',words:[{text:'He',correct:'He',distractors:['Him','His','She','They','It']},{text:'keeps',correct:'keeps',distractors:['keep','kept','keeping','sleeps','helps']},{text:'ignoring',correct:'ignoring',distractors:['ignore','ignored','ignores','imagine','inviting']},{text:'my',correct:'my',distractors:['me','mine','I','your','her']},{text:'messages',correct:'messages',distractors:['message','messenger','manager','memory','measure']},{text:'for',correct:'for',distractors:['four','from','form','far','fore']},{text:'some',correct:'some',distractors:['same','come','soon','any','every']},{text:'reason.',correct:'reason.',distractors:['reasons.','season.','result.','record.','region.']}]},
  {id:'l22p13',english:'Is your hobby collecting rare old coins?',russian:'Ваше хобби — коллекционирование редких старых монет?',ukrainian:'Ваше хобі — колекціонування рідкісних старих монет?',words:[{text:'Is',correct:'Is',distractors:['Are','Am','Be','Was','Were']},{text:'your',correct:'your',distractors:['you','yours','yourself','her','our']},{text:'hobby',correct:'hobby',distractors:['hobbies','habits','happy','honey','holiday']},{text:'collecting',correct:'collecting',distractors:['collect','collects','collected','calling','cleaning']},{text:'rare',correct:'rare',distractors:['rain','race','rich','real','rise']},{text:'old',correct:'old',distractors:['older','oldest','gold','cold','hold']},{text:'coins?',correct:'coins?',distractors:['coin?','corn?','coat?','cost?','cold?']}]},
  {id:'l22p14',english:'She doesn\'t imagine life without dancing on stage.',russian:'Она не представляет жизнь без танцев на сцене.',ukrainian:'Вона не уявляє життя без танців на сцені.',words:[{text:'She',correct:'She',distractors:['Her','He','They','We','It']},{text:"doesn't",correct:"doesn't",distractors:["don't",'doing','does','did','done']},{text:'imagine',correct:'imagine',distractors:['imagines','imagined','image','improve','insist']},{text:'life',correct:'life',distractors:['live','lives','lived','light','left']},{text:'without',correct:'without',distractors:['within','with','weather','water','winter']},{text:'dancing',correct:'dancing',distractors:['dance','dances','danced','driving','drinking']},{text:'on',correct:'on',distractors:['in','at','to','for','by']},{text:'stage.',correct:'stage.',distractors:['stages.','state.','stay.','stone.','store.']}]},
  {id:'l22p15',english:'Cleaning this huge apartment takes the whole day.',russian:'Уборка этой огромной квартиры занимает целый день.',ukrainian:'Прибирання цієї величезної квартири займає цілий день.',words:[{text:'Cleaning',correct:'Cleaning',distractors:['Clean','Cleans','Cleaned','Clear','Closing']},{text:'this',correct:'this',distractors:['that','these','those','thin','thus']},{text:'huge',correct:'huge',distractors:['high','home','house','hug','haze']},{text:'apartment',correct:'apartment',distractors:['apartments','appointment','department','compartment','apart']},{text:'takes',correct:'takes',distractors:['take','took','taken','taking','talks']},{text:'the',correct:'the',distractors:['a','an','some','any','each']},{text:'whole',correct:'whole',distractors:['wheel','white','while','whale','wall']},{text:'day.',correct:'day.',distractors:['days.','dog.','dad.','door.','dry.']}]},
  {id:'l22p16',english:'Waiting for public transport takes too much time in the morning.',russian:'Ожидание общественного транспорта отнимает слишком много времени утром.',ukrainian:'Очікування громадського транспорту забирає занадто багато часу вранці.',words:[{text:'Waiting',correct:'Waiting',distractors:['Wait','Waits','Waited','Weighting','Writing']},{text:'for',correct:'for',distractors:['from','four','forward','about','with']},{text:'public',correct:'public',distractors:['publish','people','popular','private','power']},{text:'transport',correct:'transport',distractors:['transfer','traffic','travel','train','truck']},{text:'takes',correct:'takes',distractors:['take','took','taken','taking','talks']},{text:'too',correct:'too',distractors:['to','two','top','ten','the']},{text:'much',correct:'much',distractors:['many','more','most','match','march']},{text:'time',correct:'time',distractors:['times','team','term','tame','tide']},{text:'in',correct:'in',distractors:['at','on','to','for','by']},{text:'the',correct:'the',distractors:['a','an','some','any','each']},{text:'morning.',correct:'morning.',distractors:['mornings.','mourning.','mountain.','month.','money.']}]},
  {id:'l22p17',english:'Does your offer include visiting that historical museum?',russian:'Ваше предложение включает посещение того исторического музея?',ukrainian:'Ваша пропозиція включає відвідування того історичного музею?',words:[{text:'Does',correct:'Does',distractors:['Do','Done','Doing','Did','Is']},{text:'your',correct:'your',distractors:['you','yours','yourself','our','their']},{text:'offer',correct:'offer',distractors:['offers','office','officer','often','order']},{text:'include',correct:'include',distractors:['includes','including','inside','indeed','income']},{text:'visiting',correct:'visiting',distractors:['visit','visits','visited','vision','visual']},{text:'that',correct:'that',distractors:['this','these','those','than','then']},{text:'historical',correct:'historical',distractors:['history','historic','honest','hospital','holiday']},{text:'museum?',correct:'museum?',distractors:['museums?','music?','muscle?','mountain?','message?']}]},
  {id:'l22p18',english:'They dislike walking in this noisy shopping mall.',russian:'Им не нравится гулять в этом шумном торговом центре.',ukrainian:'Їм не подобається гуляти в цьому шумному торговому центрі.',words:[{text:'They',correct:'They',distractors:['Them','Their','We','You','It']},{text:'dislike',correct:'dislike',distractors:['dislikes','disliked','distance','direct','divide']},{text:'walking',correct:'walking',distractors:['walk','walks','walked','waking','working']},{text:'in',correct:'in',distractors:['on','at','to','for','by']},{text:'this',correct:'this',distractors:['that','these','those','thin','thus']},{text:'noisy',correct:'noisy',distractors:['noise','nose','nice','notice','nearly']},{text:'shopping',correct:'shopping',distractors:['shop','shops','shipping','stopping','skipping']},{text:'mall.',correct:'mall.',distractors:['ball.','call.','wall.','mail.','mill.']}]},
  {id:'l22p19',english:'Checking all these important documents is boring job.',russian:'Проверка всех этих важных документов — скучная работа.',ukrainian:'Перевірка всіх цих важливих документів — нудна робота.',words:[{text:'Checking',correct:'Checking',distractors:['Check','Checks','Checked','Chicken','Choosing']},{text:'all',correct:'all',distractors:['also','always','allow','along','almost']},{text:'these',correct:'these',distractors:['this','that','those','then','thus']},{text:'important',correct:'important',distractors:['importance','import','improve','imagine','impossible']},{text:'documents',correct:'documents',distractors:['document','doctor','double','dollar','during']},{text:'is',correct:'is',distractors:['are','am','be','was','were']},{text:'boring',correct:'boring',distractors:['bored','bore','born','board','bring']},{text:'job.',correct:'job.',distractors:['jobs.','join.','joy.','jaw.','jug.']}]},
  {id:'l22p20',english:'We appreciate having this reliable equipment in our laboratory.',russian:'Мы ценим наличие этого надежного оборудования в нашей лаборатории.',ukrainian:'Ми цінуємо наявність цього надійного обладнання в нашій лабораторії.',words:[{text:'We',correct:'We',distractors:['Us','Our','Ours','They','You']},{text:'appreciate',correct:'appreciate',distractors:['appreciates','appreciated','appearance','approach','approve']},{text:'having',correct:'having',distractors:['have','has','had','hiring','hiding']},{text:'this',correct:'this',distractors:['that','these','those','thin','thus']},{text:'reliable',correct:'reliable',distractors:['rely','relied','real','relative','release']},{text:'equipment',correct:'equipment',distractors:['equip','equal','error','event','evening']},{text:'in',correct:'in',distractors:['on','at','to','for','by']},{text:'our',correct:'our',distractors:['us','we','ours','out','hour']},{text:'laboratory.',correct:'laboratory.',distractors:['lab.','library.','label.','labor.','latter.']}]},
  {id:'l22p26',english:'Listening to this classical album relaxes my stressed mind.',russian:'Прослушивание этого классического альбома расслабляет мой напряженный ум.',ukrainian:'Прослуховування цього класичного альбому розслабляє мій напружений розум.',words:[{text:'Listening',correct:'Listening',distractors:['Listen','Listens','Listened','Lighting','Learning']},{text:'to',correct:'to',distractors:['too','two','for','at','in']},{text:'this',correct:'this',distractors:['that','these','those','thin','thus']},{text:'classical',correct:'classical',distractors:['classic','class','classes','clarify','climate']},{text:'album',correct:'album',distractors:['albums','alarm','along','aloud','allow']},{text:'relaxes',correct:'relaxes',distractors:['relax','relaxed','relaxing','release','relative']},{text:'my',correct:'my',distractors:['me','mine','I','your','his']},{text:'stressed',correct:'stressed',distractors:['stress','streets','strong','strange','straight']},{text:'mind.',correct:'mind.',distractors:['minds.','mine.','main.','mean.','middle.']}]},
  {id:'l22p27',english:'Someone finished translating that complex legal contract.',russian:'Кто-то закончил переводить тот сложный юридический контракт.',ukrainian:'Хтось закінчив перекладати той складний юридичний контракт.',words:[{text:'Someone',correct:'Someone',distractors:['Anyone','No one','Everyone','Something','Anything']},{text:'finished',correct:'finished',distractors:['finish','finishes','finishing','fixed','filled']},{text:'translating',correct:'translating',distractors:['translate','translates','translated','training','tracking']},{text:'that',correct:'that',distractors:['this','these','those','than','then']},{text:'complex',correct:'complex',distractors:['complete','complaint','company','comfort','compare']},{text:'legal',correct:'legal',distractors:['local','level','loyal','label','logical']},{text:'contract.',correct:'contract.',distractors:['contracts.','control.','contact.','context.','convert.']}]},
  {id:'l22p28',english:'Do you hate waiting in those long queues at airport?',russian:'Вы ненавидите ждать в тех длинных очередях в аэропорту?',ukrainian:'Ви ненавидите чекати в тих довгих чергах в аеропорту?',words:[{text:'Do',correct:'Do',distractors:['Does','Done','Doing','Did','Is']},{text:'you',correct:'you',distractors:['your','yours','yourself','we','they']},{text:'hate',correct:'hate',distractors:['hates','hated','hating','have','heat']},{text:'waiting',correct:'waiting',distractors:['wait','waits','waited','writing','wanting']},{text:'in',correct:'in',distractors:['on','at','to','for','by']},{text:'those',correct:'those',distractors:['this','that','these','then','thus']},{text:'long',correct:'long',distractors:['length','light','look','low','last']},{text:'queues',correct:'queues',distractors:['queue','questions','queens','quiet','quite']},{text:'at',correct:'at',distractors:['in','on','to','for','by']},{text:'airport?',correct:'airport?',distractors:['airports?','airplane?','air?','port?','passport?']}]},
  {id:'l22p29',english:'She mentioned selling that old family house.',russian:'Она упомянула о продаже того старого семейного дома.',ukrainian:'Вона згадала про продаж того старого сімейного будинку.',words:[{text:'She',correct:'She',distractors:['Her','He','They','We','It']},{text:'mentioned',correct:'mentioned',distractors:['mention','mentions','mentioning','memory','managed']},{text:'selling',correct:'selling',distractors:['sell','sells','sold','sailing','sending']},{text:'that',correct:'that',distractors:['this','these','those','than','then']},{text:'old',correct:'old',distractors:['older','oldest','gold','cold','hold']},{text:'family',correct:'family',distractors:['families','familiar','famous','farmer','father']},{text:'house.',correct:'house.',distractors:['houses.','home.','horse.','hour.','honey.']}]},
  {id:'l22p30',english:'Visiting this annual conference is a great idea for our team.',russian:'Посещение этой ежегодной конференции — отличная идея для нашей команды.',ukrainian:'Відвідування цієї щорічної конференції — чудова ідея для нашої команди.',words:[{text:'Visiting',correct:'Visiting',distractors:['Visit','Visits','Visited','Vision','Visual']},{text:'this',correct:'this',distractors:['that','these','those','thin','thus']},{text:'annual',correct:'annual',distractors:['animal','another','anyway','answer','announce']},{text:'conference',correct:'conference',distractors:['conferences','confidence','condition','confirm','conflict']},{text:'is',correct:'is',distractors:['are','am','be','was','been']},{text:'a',correct:'a',distractors:['an','the','some','any','each']},{text:'great',correct:'great',distractors:['greet','green','grey','ground','grade']},{text:'idea',correct:'idea',distractors:['ideas','ideal','item','ivory','iron']},{text:'for',correct:'for',distractors:['from','four','forward','about','with']},{text:'our',correct:'our',distractors:['us','we','ours','out','hour']},{text:'team.',correct:'team.',distractors:['teams.','term.','time.','tame.','tide.']}]},
];

ALL_LESSONS.push({ id: 22, titleRU: 'Герундий', titleUK: 'Герундій', introScreens: LESSON_22_INTRO_SCREENS, phrases: LESSON_22_PHRASES });

export const LESSON_22_VOCABULARY = [
  { english: 'Swim', russian: 'Плавать', ukrainian: 'Плавати' },
  { english: 'Refreshing', russian: 'Бодрящий', ukrainian: 'Підбадьорливий' },
  { english: 'Finish', russian: 'Заканчивать', ukrainian: 'Закінчувати' },
  { english: 'Write', russian: 'Писать', ukrainian: 'Писати' },
  { english: 'Technical', russian: 'Технический', ukrainian: 'Технічний' },
  { english: 'Report', russian: 'Отчет', ukrainian: 'Звіт' },
  { english: 'Enjoy', russian: 'Наслаждаться', ukrainian: 'Насолоджуватися' },
  { english: 'Cook', russian: 'Готовить', ukrainian: 'Готувати' },
  { english: 'Spicy', russian: 'Острый (пряный)', ukrainian: 'Гострий (пряний)' },
  { english: 'Food', russian: 'Еда', ukrainian: 'Їжа' },
  { english: 'Learn', russian: 'Изучать', ukrainian: 'Вивчати' },
  { english: 'Foreign', russian: 'Иностранный', ukrainian: 'Іноземний' },
  { english: 'Language', russian: 'Язык', ukrainian: 'Мова' },
  { english: 'Opportunity', russian: 'Возможность', ukrainian: 'Можливість' },
  { english: 'Prefer', russian: 'Предпочитать', ukrainian: 'Надавати перевагу' },
  { english: 'Travel', russian: 'Путешествовать', ukrainian: 'Подорожувати' },
  { english: 'Train', russian: 'Поезд', ukrainian: 'Потяг' },
  { english: 'Plane', russian: 'Самолет', ukrainian: 'Літак' },
  { english: 'Read', russian: 'Читать', ukrainian: 'Читати' },
  { english: 'Article', russian: 'Статья', ukrainian: 'Стаття' },
  { english: 'Help', russian: 'Помогать', ukrainian: 'Допомагати' },
  { english: 'Understand', russian: 'Понимать', ukrainian: 'Розуміти' },
  { english: 'Modern', russian: 'Современный', ukrainian: 'Сучасний' },
  { english: 'Economy', russian: 'Экономика', ukrainian: 'Економіка' },
  { english: 'Stop', russian: 'Прекращать', ukrainian: 'Припиняти' },
  { english: 'Discuss', russian: 'Обсуждать', ukrainian: 'Обговорювати' },
  { english: 'Problem', russian: 'Проблема', ukrainian: 'Проблема' },
  { english: 'Ride', russian: 'Ездить', ukrainian: 'Їздити' },
  { english: 'Bicycle', russian: 'Велосипед', ukrainian: 'Велосипед' },
  { english: 'Park', russian: 'Парк', ukrainian: 'Парк' },
  { english: 'Favorite', russian: 'Любимый', ukrainian: 'Улюблений' },
  { english: 'Activity', russian: 'Занятие', ukrainian: 'Заняття' },
  { english: 'Manager', russian: 'Руководитель', ukrainian: 'Керівник' },
  { english: 'Suggest', russian: 'Предлагать', ukrainian: 'Пропонувати' },
  { english: 'Reschedule', russian: 'Переносить', ukrainian: 'Переносити' },
  { english: 'Avoid', russian: 'Избегать', ukrainian: 'Уникати' },
  { english: 'Buy', russian: 'Покупать', ukrainian: 'Купувати' },
  { english: 'Cheap', russian: 'Дешевый', ukrainian: 'Дешевий' },
  { english: 'Plastic', russian: 'Пластиковый', ukrainian: 'Пластиковий' },
  { english: 'Toy', russian: 'Игрушка', ukrainian: 'Іграшка' },
  { english: 'Children', russian: 'Дети', ukrainian: 'Діти' },
  { english: 'Paint', russian: 'Рисовать (красками)', ukrainian: 'Малювати (фарбами)' },
  { english: 'Bright', russian: 'Яркий', ukrainian: 'Яскравий' },
  { english: 'Landscape', russian: 'Пейзаж', ukrainian: 'Пейзаж' },
  { english: 'Require', russian: 'Требовать', ukrainian: 'Потребувати' },
  { english: 'Patience', russian: 'Терпение', ukrainian: 'Терпіння' },
  { english: 'Keep', russian: 'Продолжать', ukrainian: 'Продовжувати' },
  { english: 'Ignore', russian: 'Игнорировать', ukrainian: 'Ігнорувати' },
  { english: 'Message', russian: 'Сообщение', ukrainian: 'Повідомлення' },
  { english: 'Reason', russian: 'Причина', ukrainian: 'Причина' },
  { english: 'Collect', russian: 'Коллекционировать', ukrainian: 'Колекціонувати' },
  { english: 'Rare', russian: 'Редкий', ukrainian: 'Рідкісний' },
  { english: 'Coin', russian: 'Монета', ukrainian: 'Монета' },
  { english: 'Imagine', russian: 'Представлять', ukrainian: 'Уявляти' },
  { english: 'Life', russian: 'Жизнь', ukrainian: 'Життя' },
  { english: 'Without', russian: 'Без', ukrainian: 'Без' },
  { english: 'Dance', russian: 'Танцевать', ukrainian: 'Танцювати' },
  { english: 'Stage', russian: 'Сцена', ukrainian: 'Сцена' },
  { english: 'Clean', russian: 'Убирать', ukrainian: 'Прибирати' },
  { english: 'Huge', russian: 'Огромный', ukrainian: 'Величезний' },
  { english: 'Apartment', russian: 'Квартира', ukrainian: 'Квартира' },
  { english: 'Take', russian: 'Занимать (время)', ukrainian: 'Займати (час)' },
  { english: 'Whole', russian: 'Целый', ukrainian: 'Цілий' },
  { english: 'Wait', russian: 'Ждать', ukrainian: 'Чекати' },
  { english: 'Public', russian: 'Общественный', ukrainian: 'Громадський' },
  { english: 'Transport', russian: 'Транспорт', ukrainian: 'Транспорт' },
  { english: 'Offer', russian: 'Предложение', ukrainian: 'Пропозиція' },
  { english: 'Include', russian: 'Включать', ukrainian: 'Включати' },
  { english: 'Visit', russian: 'Посещать', ukrainian: 'Відвідувати' },
  { english: 'Historical', russian: 'Исторический', ukrainian: 'Історичний' },
  { english: 'Museum', russian: 'Музей', ukrainian: 'Музей' },
  { english: 'Dislike', russian: 'Не любить', ukrainian: 'Не любити' },
  { english: 'Walk', russian: 'Гулять', ukrainian: 'Гуляти' },
  { english: 'Noisy', russian: 'Шумный', ukrainian: 'Шумний' },
  { english: 'Check', russian: 'Проверять', ukrainian: 'Перевіряти' },
  { english: 'Boring', russian: 'Скучный', ukrainian: 'Нудний' },
  { english: 'Job', russian: 'Работа', ukrainian: 'Робота' },
  { english: 'Appreciate', russian: 'Ценить', ukrainian: 'Цінувати' },
  { english: 'Reliable', russian: 'Надежный', ukrainian: 'Надійний' },
  { english: 'Equipment', russian: 'Оборудование', ukrainian: 'Обладнання' },
  { english: 'Laboratory', russian: 'Лаборатория', ukrainian: 'Лабораторія' },
  { english: 'Listen', russian: 'Слушать', ukrainian: 'Слухати' },
  { english: 'Classical', russian: 'Классический', ukrainian: 'Класичний' },
  { english: 'Album', russian: 'Альбом', ukrainian: 'Альбом' },
  { english: 'Relax', russian: 'Расслаблять', ukrainian: 'Розслабляти' },
  { english: 'Stressed', russian: 'Напряженный', ukrainian: 'Напружений' },
  { english: 'Mind', russian: 'Ум', ukrainian: 'Розум' },
  { english: 'Translate', russian: 'Переводить', ukrainian: 'Перекладати' },
  { english: 'Complex', russian: 'Сложный', ukrainian: 'Складний' },
  { english: 'Legal', russian: 'Юридический', ukrainian: 'Юридичний' },
  { english: 'Contract', russian: 'Контракт', ukrainian: 'Контракт' },
  { english: 'Hate', russian: 'Ненавидеть', ukrainian: 'Ненавидіти' },
  { english: 'Queue', russian: 'Очередь', ukrainian: 'Черга' },
  { english: 'Airport', russian: 'Аэропорт', ukrainian: 'Аеропорт' },
  { english: 'Mention', russian: 'Упоминать', ukrainian: 'Згадувати' },
  { english: 'Sell', russian: 'Продавать', ukrainian: 'Продавати' },
  { english: 'House', russian: 'Дом', ukrainian: 'Будинок' },
  { english: 'Annual', russian: 'Ежегодный', ukrainian: 'Щорічний' },
  { english: 'Conference', russian: 'Конференция', ukrainian: 'Конференція' },
  { english: 'Idea', russian: 'Идея', ukrainian: 'Ідея' },
  { english: 'Team', russian: 'Команда', ukrainian: 'Команда' },
];

export const LESSON_22_IRREGULAR_VERBS = [
  { english: 'Write', russian: 'Писать', ukrainian: 'Писати', past: 'wrote', pastParticiple: 'written' },
  { english: 'Read', russian: 'Читать', ukrainian: 'Читати', past: 'read', pastParticiple: 'read' },
  { english: 'Understand', russian: 'Понимать', ukrainian: 'Розуміти', past: 'understood', pastParticiple: 'understood' },
  { english: 'Ride', russian: 'Ездить', ukrainian: 'Їздити', past: 'rode', pastParticiple: 'ridden' },
  { english: 'Buy', russian: 'Покупать', ukrainian: 'Купувати', past: 'bought', pastParticiple: 'bought' },
  { english: 'Keep', russian: 'Продолжать', ukrainian: 'Продовжувати', past: 'kept', pastParticiple: 'kept' },
  { english: 'Take', russian: 'Занимать (время)', ukrainian: 'Займати (час)', past: 'took', pastParticiple: 'taken' },
  { english: 'Have', russian: 'Иметь', ukrainian: 'Мати', past: 'had', pastParticiple: 'had' },
  { english: 'Sell', russian: 'Продавать', ukrainian: 'Продавати', past: 'sold', pastParticiple: 'sold' },
];
`;

const marker = 'export const ALL_LESSONS_RU';
const idx = content.indexOf(marker);
if (idx === -1) { console.error('marker not found'); process.exit(1); }
content = content.slice(0, idx) + lesson22Block + '\n' + content.slice(idx);

content = content.replace(
  '  21: LESSON_21_PHRASES.map(p => ({ english: p.english, russian: p.russian })),\n};',
  '  21: LESSON_21_PHRASES.map(p => ({ english: p.english, russian: p.russian })),\n  22: LESSON_22_PHRASES.map(p => ({ english: p.english, russian: p.russian })),\n};'
);
content = content.replace(
  '  21: LESSON_21_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),\n};',
  '  21: LESSON_21_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),\n  22: LESSON_22_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),\n};'
);
content = content.replace(
  '  21: LESSON_21_VOCABULARY,\n};',
  '  21: LESSON_21_VOCABULARY,\n  22: LESSON_22_VOCABULARY,\n};'
);
content = content.replace(
  '  21: LESSON_21_IRREGULAR_VERBS,\n};',
  '  21: LESSON_21_IRREGULAR_VERBS,\n  22: LESSON_22_IRREGULAR_VERBS,\n};'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done, lesson 22 added with', (content.match(/l22p/g)||[]).length, 'phrases');

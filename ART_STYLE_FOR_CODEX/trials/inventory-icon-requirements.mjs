import fs from 'node:fs';
import ts from 'typescript';
const file='app/ai_dialog_scenarios.ts';
const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
const scenarios=[];
function walk(node){
  if(ts.isObjectLiteralExpression(node)){
    const props=Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p=>[
      p.name.getText(source).replace(/["']/g,''),ts.isStringLiteral(p.initializer)?p.initializer.text:null,
    ]));
    if(props.id&&props.icon)scenarios.push({id:props.id,title:props.titleRu||props.title||props.id,icon:props.icon});
  }
  ts.forEachChild(node,walk);
}
walk(source);
const main=['lessons','dialogs','cards','continue','phrase_of_day','mistakes_entry','today','spire_tile'];
const streak=Array.from({length:10},(_,i)=>'streak_'+String(i+1).padStart(2,'0')).concat(['streak_freeze','streak_freeze_overlay']);
const streakTierDays=JSON.parse(fs.readFileSync('constants/streakIconAssets.ts','utf8').match(/STREAK_ICON_TIERS\s*=\s*(\[[\s\S]*?\])\s*as const/)[1].replace(/,\s*\]/,']'));
const ranks=Array.from({length:6},(_,i)=>'spire_rank_'+(i+1));
const flags=['flag_es','flag_fr'];
const legacy=['cards_from_video','cards_empty_saved'];
const dialogueThemes=['airplane','cup','restaurant','car','train','briefcase','map','compass','cursor','bed','dumbbell','branch','network','wifi','battery'].map(x=>'dialogue_'+x);
// Preserve the owner's full ten-category inventory, not only the large Home art.
const uiCategories=[
  ['Навигация и управление','закрыть|назад|вперёд/открыть|развернуть|свернуть|раскрыть список|стрелка назад|стрелка вперёд|стрелка вперёд в круге|стрелка вверх|стрелка вверх в круге|стрелка вниз|отменить|ещё — горизонтально|ещё — вертикально|ещё в круге|параметры-ползунки|фильтр|перетащить|поиск|открыть во внешнем окне|выйти|стереть символ|главная|сетка|список|перемешать|повторить|обновить|обновить в круге|синхронизация'],
  ['Отметки и состояния','галочка|галочка в круге|двойная галочка|крестик в круге|плюс|плюс в круге|минус в круге|восклицательный знак в круге|предупреждение|i|i в круге|вопрос в круге|замок закрыт|замок открыт|глаз|глаз перечёркнутый|квадрат с галочкой|переключатель вкл|переключатель выкл|квадрат|точка|нет сети|загрузка в облако|сохранить|корзина-удалить|жук-ошибка|бесконечность|флажок-пожаловаться'],
  ['Правка и обмен','редактировать|карандаш|копировать|ножницы|поделиться|поделиться в соцсетях|ссылка|булавка|буфер обмена'],
  ['Обучение','шапочка выпускника|книга|библиотека|чтение|лампочка|текст|язык|глобус|Земля|документ|газета|калькулятор|колба|пазл|волшебная палочка|блёстки/ИИ|ключ с молотком'],
  ['Энергия, награды, прогресс','молния|звезда|лента-награда|кубок|пьедестал|кристалл|подарок|огонёк серии|снежинка-заморозка|ракета|график вверх|график вниз|столбики|статистика|аналитика|пульс|спидометр|песочные часы|таймер|часы|календарь|билет|ценник|чек|ключ-доступ'],
  ['Звук и видео','микрофон|микрофон выкл|громкость полная|громкость средняя|ухо|наушники|ноты|радио|играть|играть в круге|перемотка|пауза|стоп|видеокамера|камера|картинка|YouTube|диск|громкоговоритель'],
  ['Общение и люди','люди|человек|профиль в круге|добавить друга|облачко|два облачка|облачко пишет|квадратное облачко|квадратное облачко с точками|трубка|конверт|самолётик-отправить|колокольчик|колокольчик выкл|улыбка|палец вверх|палец вниз|ладонь|сердце|щит|щит с галочкой|медицинский крест'],
  ['Карточки и покупки','закладка|слои-набор|альбомы|кубик|банковская карта|тележка|корзинка|витрина|сумка|футболка|монета-руна'],
  ['Настройки и оформление','шестерёнка|молоток|палитра|солнце|луна|телефон|сигнал связи'],
  ['Темы диалогов','самолёт|чашка|вилка с ножом|машина|поезд|портфель|карта|компас|стрелка-курсор|кровать|гантель|ветка-выбор|сеть связей|вай-фай|батарея'],
].map(([title,labels],category)=>({title,icons:labels.split('|').map((label,index)=>({id:'ui_'+String(category+1).padStart(2,'0')+'_'+String(index+1).padStart(2,'0'),label}))}));
const requirements={
  specification:'User messages in this session; requirements are not reduced to completed files.',
  variantsPerIcon:5,brightnesses:['dark','light'],layers:['base','accent'],
  main,streak,streakTierDays,ranks,rankMapping:'badgeIndex=floor(tier/2)+1; all twelve actual stone league names remain distinct in the tower preview',
  crown:[],lockedArt:{crown:'Preserve the owner-approved crown; latest direct owner correction forbids replacement variants or substitution.'},flags,legacy,dialogueThemes,aiOff:['ai_off'],
  scenarios,scenarioCount:scenarios.length,uiCategories,
  uiCatalogCount:uiCategories.reduce((sum,c)=>sum+c.icons.length,0),
  uiCatalogNote:'All owner-listed icons stay in scope. Reuse with a large-art or dialogue ID requires explicit semantic mapping and complete five-choice evidence; do not count duplicates as separate finished artwork.',
  preview:{sourceHome:'ART_STYLE_FOR_CODEX/home_styles.html',sourceScreens:'docs/design/v2-app',
    originalLayout:true,allAffectedScreens:true,independentSelection:true,persistSelections:true,
    namedThemes:23,darkLight:true,hueSlider:true,intensitySlider:true,
    tower:{source:'docs/design/v2-app/spire.html',constructionVariants:5,leagues:12,floors:15,interactive:true,imageGeneration:false}},
  assetInvariants:{directory:'ART_STYLE_FOR_CODEX/trials/S2_clay/{dark,light}',width:1024,height:1024,alpha:true,maxBaseBytes:409600,whiteAccent:true,exactAccentAlignment:true},
  productionImport:'Not authorized until the owner chooses candidates.',
};
fs.writeFileSync('ART_STYLE_FOR_CODEX/trials/interactive/requirements.json',JSON.stringify(requirements,null,2));
console.log(JSON.stringify({main:main.length,streak:streak.length,ranks:ranks.length,flags:flags.length,legacy:legacy.length,dialogueThemes:dialogueThemes.length,scenarioObjects:scenarios.length,scenarioIconSymbols:[...new Set(scenarios.map(s=>s.icon))]}));

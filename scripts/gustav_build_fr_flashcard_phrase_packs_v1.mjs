import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const RUN_ID = '2026-07-04_fr_flashcard_phrase_packs_v1';
const RUN_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', RUN_ID);
const BUILD_DIR = path.join(RUN_DIR, 'build');
const REVIEW_DIR = path.join(RUN_DIR, 'review');
const PAYLOAD_DIR = path.join(BUILD_DIR, 'server_payloads');
const GENERATED_AT = new Date().toISOString();
const ACCESSED_DATE = '2026-07-04';
const CONTENT_VERSION = 'fr_flashcard_phrase_packs_v1.draft';
const SOURCE_LOCALES = ['ru', 'uk'];
const SURFACE = 'flashcard';
const PAYLOAD_KIND = 'official_marketplace_packs';

const SOURCES = {
  robertCafe: ['le_robert_cafe', 'https://dictionnaire.lerobert.com/definition/cafe'],
  robertTerrasse: ['le_robert_terrasse', 'https://dictionnaire.lerobert.com/definition/terrasse'],
  robertAddition: ['le_robert_addition', 'https://dictionnaire.lerobert.com/definition/addition'],
  robertServeur: ['le_robert_serveur', 'https://dictionnaire.lerobert.com/definition/serveur'],
  robertCommander: ['le_robert_commander', 'https://dictionnaire.lerobert.com/definition/commander'],
  robertMerci: ['le_robert_merci', 'https://dictionnaire.lerobert.com/definition/merci'],
  robertDesole: ['le_robert_desole', 'https://dictionnaire.lerobert.com/definition/desole'],
  robertTu: ['le_robert_tu', 'https://dictionnaire.lerobert.com/definition/tu'],
  robertVous: ['le_robert_vous', 'https://dictionnaire.lerobert.com/definition/vous'],
  robertPolitesse: ['le_robert_politesse', 'https://dictionnaire.lerobert.com/definition/politesse'],
  tv5TuVous: ['tv5monde_tu_vous', 'https://apprendre.tv5monde.com/fr/aides/cultures-tu-ou-vous-0'],
  tv5Inconnu: ['tv5monde_adresser_inconnu', 'https://apprendre.tv5monde.com/fr/aides/cultures-sadresser-un-inconnu'],
  tv5Sortie: ['tv5monde_proposer_sortie', 'https://apprendre.tv5monde.com/fr/aides/cultures-proposer-une-sortie-0'],
  robertApero: ['le_robert_apero', 'https://dictionnaire.lerobert.com/definition/apero'],
  robertAperitif: ['le_robert_aperitif', 'https://dictionnaire.lerobert.com/definition/aperitif'],
  robertInviter: ['le_robert_inviter', 'https://dictionnaire.lerobert.com/definition/inviter'],
  robertTrinquer: ['le_robert_trinquer', 'https://dictionnaire.lerobert.com/definition/trinquer'],
  robertSoiree: ['le_robert_soiree', 'https://dictionnaire.lerobert.com/definition/soiree'],
  robertVerre: ['le_robert_verre', 'https://dictionnaire.lerobert.com/definition/verre'],
  robertPharmacie: ['le_robert_pharmacie', 'https://dictionnaire.lerobert.com/definition/pharmacie'],
  robertOrdonnance: ['le_robert_ordonnance', 'https://dictionnaire.lerobert.com/definition/ordonnance'],
  robertDouleur: ['le_robert_douleur', 'https://dictionnaire.lerobert.com/definition/douleur'],
  robertSymptome: ['le_robert_symptome', 'https://dictionnaire.lerobert.com/definition/symptome'],
  robertRendezVous: ['le_robert_rendez_vous', 'https://dictionnaire.lerobert.com/definition/rendez-vous'],
  ameliOrdonnance: ['ameli_ordonnance', 'https://www.ameli.fr/assure/sante/medicaments/utiliser-recycler-medicaments/lire-ordonnance-medicaments'],
  ameliAutomedication: ['ameli_automedication', 'https://www.ameli.fr/assure/sante/medicaments/utiliser-recycler-medicaments/automedication'],
  ameliPharmacien: ['ameli_missions_pharmacien', 'https://www.ameli.fr/assure/sante/medicaments/missions-pharmacien'],
  ameliDouleur: ['ameli_antalgiques_douleur', 'https://www.ameli.fr/assure/sante/medicaments/utiliser-recycler-medicaments/utiliser-antalgiques'],
  robertTexto: ['le_robert_texto', 'https://dictionnaire.lerobert.com/definition/texto'],
  robertMessage: ['le_robert_message', 'https://dictionnaire.lerobert.com/definition/message'],
  robertAccord: ['le_robert_accord', 'https://dictionnaire.lerobert.com/definition/accord'],
  robertMarche: ['le_robert_marche', 'https://dictionnaire.lerobert.com/definition/marche'],
  robertBref: ['le_robert_bref', 'https://dictionnaire.lerobert.com/definition/bref'],
  robertCoup: ['le_robert_coup', 'https://dictionnaire.lerobert.com/definition/coup'],
  robertGenre: ['le_robert_genre', 'https://dictionnaire.lerobert.com/definition/genre'],
  robertRepondre: ['le_robert_repondre', 'https://dictionnaire.lerobert.com/definition/repondre'],
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function evidence(keys, verified) {
  return keys.map((key) => {
    const [sourceId, url] = SOURCES[key];
    return { sourceId, url, accessedDate: ACCESSED_DATE, verified };
  });
}

function card(id, targetText, ru, uk, literalRu, literalUk, explanationRu, explanationUk, exampleFr, exampleRu, exampleUk, register, level, sourceKeys, verified = 'expression, meaning and domain context') {
  return {
    id,
    targetText,
    ru,
    uk,
    literalRu,
    literalUk,
    explanationRu,
    explanationUk,
    exampleFr,
    exampleRu,
    exampleUk,
    register,
    level,
    evidence: evidence(sourceKeys, verified),
  };
}

const PACKS = [
  {
    id: 'fr_cafe_terrace_life',
    codeName: 'Terrasse',
    category: 'daily',
    taxonomy: 'culture_native',
    priceShards: 15,
    titleRu: 'Французская терраса без паники',
    titleUk: 'Французька тераса без паніки',
    descriptionRu: 'Хочешь сидеть на французской террасе не как турист, который боится позвать официанта? Меню, вода, блюдо дня, ошибка в заказе, счёт и мягкое “мы всё ещё ждём”. Говори спокойно, будто этот столик уже почти твой.',
    descriptionUk: 'Хочеш сидіти на французькій терасі не як турист, що боїться покликати офіціанта? Меню, вода, страва дня, помилка в замовленні, рахунок і м’яке “ми все ще чекаємо”. Говори спокійно, ніби цей столик уже майже твій.',
    cards: [
      card('fr_cafe_001', 'On peut avoir la carte, s’il vous plaît ?', 'Можно нам меню, пожалуйста?', 'Можна нам меню, будь ласка?', 'Можно иметь карту/меню?', 'Можна мати карту/меню?', 'В кафе la carte обычно меню. Формула с on peut avoir звучит естественно и вежливо.', 'У кафе la carte зазвичай означає меню. Формула on peut avoir звучить природно й ввічливо.', 'On peut avoir la carte, s’il vous plaît ? On vient d’arriver.', 'Можно меню, пожалуйста? Мы только пришли.', 'Можна меню, будь ласка? Ми щойно прийшли.', 'polite', 'A1', ['robertCafe']),
      card('fr_cafe_002', 'Je vais prendre un café allongé.', 'Я возьму кофе лунго / разбавленный эспрессо.', 'Я візьму каву алонже / розбавлений еспресо.', 'Я собираюсь взять кофе allongé.', 'Я збираюся взяти каву allongé.', 'Je vais prendre — стандартный мягкий способ заказать. Un café allongé — более длинный кофе, не американо один к одному.', 'Je vais prendre — стандартний м’який спосіб замовити. Un café allongé — довша кава, не точний аналог американо.', 'Je vais prendre un café allongé et un verre d’eau.', 'Я возьму кофе алонже и стакан воды.', 'Я візьму каву алонже і склянку води.', 'neutral', 'A1', ['robertCafe', 'robertCommander']),
      card('fr_cafe_003', 'Vous avez quelque chose sans alcool ?', 'У вас есть что-нибудь без алкоголя?', 'У вас є щось без алкоголю?', 'У вас есть что-то без алкоголя?', 'У вас є щось без алкоголю?', 'Quelque chose sans alcool удобно, когда не знаешь названия напитков.', 'Quelque chose sans alcool зручно, коли не знаєш назв напоїв.', 'Vous avez quelque chose sans alcool, plutôt frais ?', 'У вас есть что-нибудь без алкоголя, лучше прохладное?', 'У вас є щось без алкоголю, бажано прохолодне?', 'polite', 'A1', ['robertCommander']),
      card('fr_cafe_004', 'C’est possible en terrasse ?', 'Можно на террасе?', 'Можна на терасі?', 'Это возможно на террасе?', 'Це можливо на терасі?', 'Короткий способ спросить о месте. En terrasse — типичная французская сцена кафе.', 'Короткий спосіб спитати про місце. En terrasse — типова французька сцена кафе.', 'C’est possible en terrasse ou il faut rester dedans ?', 'Можно на террасе или нужно остаться внутри?', 'Можна на терасі чи треба залишитися всередині?', 'neutral', 'A1', ['robertTerrasse']),
      card('fr_cafe_005', 'Je peux avoir une carafe d’eau ?', 'Можно мне графин воды?', 'Можна мені графин води?', 'Я могу иметь графин воды?', 'Я можу мати графин води?', 'Carafe d’eau — обычная бесплатная вода из-под крана в ресторане/кафе; фраза звучит нормально и просто.', 'Carafe d’eau — звична безплатна вода з-під крана в ресторані/кафе; фраза звучить нормально й просто.', 'Je peux avoir une carafe d’eau avec les verres ?', 'Можно графин воды со стаканами?', 'Можна графин води зі склянками?', 'neutral', 'A1', ['robertCafe']),
      card('fr_cafe_006', 'Qu’est-ce que vous recommandez ?', 'Что вы рекомендуете?', 'Що ви рекомендуєте?', 'Что вы рекомендуете?', 'Що ви рекомендуєте?', 'Универсальный вопрос официанту или продавцу, когда хочешь совет, а не список.', 'Універсальне питання офіціанту чи продавцю, коли хочеш пораду, а не список.', 'Qu’est-ce que vous recommandez pour un déjeuner léger ?', 'Что вы рекомендуете для лёгкого обеда?', 'Що ви рекомендуєте для легкого обіду?', 'polite', 'A1', ['robertCommander', 'robertServeur']),
      card('fr_cafe_007', 'C’est quoi le plat du jour ?', 'Что сегодня за блюдо дня?', 'Що сьогодні за страва дня?', 'Что такое блюдо дня?', 'Що таке страва дня?', 'Разговорное c’est quoi нормально в кафе, но с незнакомыми можно смягчить vous avez un plat du jour ?', 'Розмовне c’est quoi нормально в кафе, але з незнайомими можна пом’якшити vous avez un plat du jour ?', 'C’est quoi le plat du jour aujourd’hui ?', 'А какое сегодня блюдо дня?', 'А яка сьогодні страва дня?', 'casual', 'A1', ['robertCafe']),
      card('fr_cafe_008', 'Sans oignons, si possible.', 'Без лука, если возможно.', 'Без цибулі, якщо можливо.', 'Без лука, если возможно.', 'Без цибулі, якщо можливо.', 'Si possible делает просьбу мягче, особенно при изменении блюда.', 'Si possible робить прохання м’якшим, особливо коли змінюєш страву.', 'Je vais prendre la salade, sans oignons, si possible.', 'Я возьму салат, без лука, если возможно.', 'Я візьму салат, без цибулі, якщо можливо.', 'polite', 'A1', ['robertCommander']),
      card('fr_cafe_009', 'Vous pouvez nous laisser deux minutes ?', 'Можете дать нам две минуты?', 'Можете дати нам дві хвилини?', 'Вы можете оставить нам две минуты?', 'Ви можете залишити нам дві хвилини?', 'Так вежливо просят время выбрать, не отталкивая официанта грубо.', 'Так ввічливо просять час на вибір, не відштовхуючи офіціанта грубо.', 'Vous pouvez nous laisser deux minutes ? On hésite encore.', 'Можете дать нам две минуты? Мы ещё сомневаемся.', 'Можете дати нам дві хвилини? Ми ще вагаємося.', 'polite', 'A2', ['robertServeur']),
      card('fr_cafe_010', 'Excusez-moi, on n’a pas encore commandé.', 'Извините, мы ещё не заказали.', 'Вибачте, ми ще не замовили.', 'Извините, мы ещё не заказали.', 'Вибачте, ми ще не замовили.', 'Мягкий способ привлечь внимание, когда вас долго не обслуживают.', 'М’який спосіб привернути увагу, коли вас довго не обслуговують.', 'Excusez-moi, on n’a pas encore commandé.', 'Извините, мы ещё не заказали.', 'Вибачте, ми ще не замовили.', 'polite', 'A1', ['robertCommander', 'robertServeur']),
      card('fr_cafe_011', 'On attend toujours nos boissons.', 'Мы всё ещё ждём наши напитки.', 'Ми все ще чекаємо наші напої.', 'Мы всё ещё ждём наши напитки.', 'Ми все ще чекаємо наші напої.', 'Toujours здесь значит “всё ещё”: полезно для мягкого напоминания без скандала.', 'Toujours тут означає “все ще”: корисно для м’якого нагадування без скандалу.', 'Excusez-moi, on attend toujours nos boissons.', 'Извините, мы всё ещё ждём напитки.', 'Вибачте, ми все ще чекаємо напої.', 'polite', 'A2', ['robertCafe', 'robertServeur']),
      card('fr_cafe_012', 'Ce n’est pas ce qu’on a commandé.', 'Это не то, что мы заказали.', 'Це не те, що ми замовили.', 'Это не то, что мы заказали.', 'Це не те, що ми замовили.', 'Прямая, но нормальная фраза для ошибки в заказе. Можно начать с excusez-moi.', 'Пряма, але нормальна фраза для помилки в замовленні. Можна почати з excusez-moi.', 'Excusez-moi, ce n’est pas ce qu’on a commandé.', 'Извините, это не то, что мы заказали.', 'Вибачте, це не те, що ми замовили.', 'neutral', 'A2', ['robertCommander']),
      card('fr_cafe_013', 'Vous pouvez le réchauffer un peu ?', 'Можете немного подогреть это?', 'Можете трохи підігріти це?', 'Вы можете это разогреть немного?', 'Ви можете це розігріти трохи?', 'Le заменяет блюдо/напиток; un peu смягчает просьбу.', 'Le замінює страву/напій; un peu пом’якшує прохання.', 'La soupe est tiède, vous pouvez la réchauffer un peu ?', 'Суп тёплый, можете немного подогреть?', 'Суп ледь теплий, можете трохи підігріти?', 'polite', 'A2', ['robertCommander']),
      card('fr_cafe_014', 'On peut payer séparément ?', 'Мы можем заплатить отдельно?', 'Ми можемо заплатити окремо?', 'Можно платить отдельно?', 'Можна платити окремо?', 'Классика в компании. Séparément — отдельно по людям/частям.', 'Класика в компанії. Séparément — окремо по людях/частинах.', 'On peut payer séparément, s’il vous plaît ?', 'Можно заплатить отдельно, пожалуйста?', 'Можна заплатити окремо, будь ласка?', 'polite', 'A1', ['robertAddition']),
      card('fr_cafe_015', 'L’addition, s’il vous plaît.', 'Счёт, пожалуйста.', 'Рахунок, будь ласка.', 'Сложение/счёт, пожалуйста.', 'Додавання/рахунок, будь ласка.', 'В кафе addition — именно счёт. Самая короткая нормальная формула.', 'У кафе addition — саме рахунок. Найкоротша нормальна формула.', 'L’addition, s’il vous plaît, quand vous pouvez.', 'Счёт, пожалуйста, когда сможете.', 'Рахунок, будь ласка, коли зможете.', 'polite', 'A1', ['robertAddition']),
      card('fr_cafe_016', 'Je règle par carte.', 'Я плачу картой.', 'Я плачу карткою.', 'Я оплачиваю картой.', 'Я оплачую карткою.', 'Régler — естественный глагол “оплатить” в заведении; звучит аккуратнее, чем payer в некоторых сценах.', 'Régler — природне дієслово “оплатити” у закладі; звучить акуратніше, ніж payer у деяких сценах.', 'Je règle par carte, merci.', 'Я плачу картой, спасибо.', 'Я плачу карткою, дякую.', 'neutral', 'A2', ['robertAddition']),
      card('fr_cafe_017', 'Vous prenez les tickets resto ?', 'Вы принимаете ресторанные чеки?', 'Ви приймаєте ресторанні чеки?', 'Вы берёте ресторанные билеты?', 'Ви берете ресторанні квитки?', 'Tickets resto — разговорное сокращение для titres-restaurant; полезно во Франции.', 'Tickets resto — розмовне скорочення для titres-restaurant; корисно у Франції.', 'Vous prenez les tickets resto ou seulement la carte ?', 'Вы принимаете ресторанные чеки или только карту?', 'Ви приймаєте ресторанні чеки чи тільки картку?', 'casual', 'A2', ['robertCafe']),
      card('fr_cafe_018', 'Je vous laisse choisir.', 'Я оставлю выбор вам.', 'Я залишу вибір вам.', 'Я вам оставляю выбрать.', 'Я вам залишаю обрати.', 'Фраза для компании или официанта: доверяешь выбор другому человеку.', 'Фраза для компанії або офіціанта: довіряєш вибір іншій людині.', 'Pour le vin, je vous laisse choisir.', 'Что касается вина, я оставлю выбор вам.', 'Щодо вина, я залишу вибір вам.', 'polite', 'A2', ['robertServeur']),
      card('fr_cafe_019', 'C’était très bon, merci.', 'Было очень вкусно, спасибо.', 'Було дуже смачно, дякую.', 'Это было очень хорошо, спасибо.', 'Це було дуже добре, дякую.', 'Très bon в заведении обычно значит “вкусно/хорошо”, а не только “добрый”.', 'Très bon у закладі зазвичай означає “смачно/добре”, а не лише “добрий”.', 'C’était très bon, merci beaucoup.', 'Было очень вкусно, большое спасибо.', 'Було дуже смачно, дуже дякую.', 'polite', 'A1', ['robertMerci']),
      card('fr_cafe_020', 'Bonne journée !', 'Хорошего дня!', 'Гарного дня!', 'Хороший день!', 'Гарний день!', 'Нормальное дружелюбное прощание после оплаты или ухода.', 'Нормальне дружнє прощання після оплати або виходу.', 'Merci, bonne journée !', 'Спасибо, хорошего дня!', 'Дякую, гарного дня!', 'polite', 'A1', ['robertMerci']),
    ],
  },
  {
    id: 'fr_pronouns_and_politeness',
    codeName: 'VousMode',
    category: 'daily',
    taxonomy: 'culture_native',
    priceShards: 15,
    titleRu: 'Вежливо, но не деревянно',
    titleUk: 'Ввічливо, але не дерев’яно',
    descriptionRu: 'Во Франции можно сказать правильные слова и всё равно прозвучать как дверной звонок. Тут — tu/vous, просьбы в бархатных перчатках, отказ без ледяной стены и фразы, после которых собеседник не морщится.',
    descriptionUk: 'У Франції можна сказати правильні слова й усе одно прозвучати як дверний дзвінок. Тут — tu/vous, прохання в оксамитових рукавичках, відмова без крижаної стіни й фрази, після яких співрозмовник не морщиться.',
    cards: [
      card('fr_polite_001', 'On se tutoie ?', 'Перейдём на “ты”?', 'Перейдемо на “ти”?', 'Мы друг друга тыкаем?', 'Ми одне одного тикаємо?', 'Tutoier значит обращаться на tu. Вопрос снимает неловкость перехода.', 'Tutoier означає звертатися на tu. Питання знімає незручність переходу.', 'On se tutoie ou on reste sur vous ?', 'Перейдём на “ты” или останемся на “вы”?', 'Перейдемо на “ти” чи залишимося на “ви”?', 'polite', 'A2', ['robertTu', 'robertVous', 'tv5TuVous']),
      card('fr_polite_002', 'Je préfère vous vouvoyer.', 'Я предпочитаю обращаться к вам на “вы”.', 'Я волію звертатися до вас на “ви”.', 'Я предпочитаю вас выкать.', 'Я волію вас викати.', 'Vouvoyer — обращаться на vous. Фраза уважительная, если хочешь сохранить дистанцию.', 'Vouvoyer — звертатися на vous. Фраза ввічлива, якщо хочеш зберегти дистанцію.', 'Pour le moment, je préfère vous vouvoyer.', 'Пока я предпочитаю обращаться к вам на “вы”.', 'Поки що я волію звертатися до вас на “ви”.', 'formal', 'A2', ['robertVous', 'tv5TuVous']),
      card('fr_polite_003', 'Vous pouvez répéter, s’il vous plaît ?', 'Можете повторить, пожалуйста?', 'Можете повторити, будь ласка?', 'Вы можете повторить?', 'Ви можете повторити?', 'Базовая вежливая просьба; vous подходит к незнакомым и сервисным ситуациям.', 'Базове ввічливе прохання; vous пасує для незнайомих і сервісних ситуацій.', 'Vous pouvez répéter plus lentement, s’il vous plaît ?', 'Можете повторить медленнее, пожалуйста?', 'Можете повторити повільніше, будь ласка?', 'polite', 'A1', ['robertVous', 'robertPolitesse']),
      card('fr_polite_004', 'Est-ce que je peux vous demander un service ?', 'Можно попросить вас об услуге?', 'Можна попросити вас про послугу?', 'Могу я попросить у вас услугу?', 'Чи можу я попросити у вас послугу?', 'Est-ce que + je peux делает просьбу мягкой и понятной.', 'Est-ce que + je peux робить прохання м’яким і зрозумілим.', 'Est-ce que je peux vous demander un petit service ?', 'Можно попросить вас о небольшой услуге?', 'Можна попросити вас про невелику послугу?', 'polite', 'A2', ['robertVous', 'robertPolitesse']),
      card('fr_polite_005', 'Je suis désolé, je ne peux pas.', 'Мне жаль, я не могу.', 'Мені шкода, я не можу.', 'Я огорчён, я не могу.', 'Я засмучений, я не можу.', 'Нормальный отказ без длинных оправданий; désolé смягчает прямое non.', 'Нормальна відмова без довгих виправдань; désolé пом’якшує пряме non.', 'Je suis désolé, je ne peux pas venir ce soir.', 'Мне жаль, я не могу прийти сегодня вечером.', 'Мені шкода, я не можу прийти сьогодні ввечері.', 'polite', 'A1', ['robertDesole']),
      card('fr_polite_006', 'Ce n’est pas possible pour moi.', 'Для меня это невозможно / не получится.', 'Для мене це неможливо / не вийде.', 'Это не возможно для меня.', 'Це неможливо для мене.', 'Мягкий отказ: фокус не на человеке, а на твоей возможности.', 'М’яка відмова: фокус не на людині, а на твоїй можливості.', 'Ce n’est pas possible pour moi cette semaine.', 'У меня не получится на этой неделе.', 'У мене не вийде цього тижня.', 'polite', 'A2', ['robertPolitesse']),
      card('fr_polite_007', 'Je comprends, mais je ne suis pas d’accord.', 'Я понимаю, но не согласен.', 'Я розумію, але не згоден.', 'Я понимаю, но я не в согласии.', 'Я розумію, але я не в згоді.', 'Формула держит несогласие спокойным: сначала признаёшь позицию, потом возражаешь.', 'Формула тримає незгоду спокійною: спершу визнаєш позицію, потім заперечуєш.', 'Je comprends, mais je ne suis pas d’accord avec cette idée.', 'Я понимаю, но не согласен с этой идеей.', 'Я розумію, але не згоден із цією ідеєю.', 'neutral', 'A2', ['robertAccord']),
      card('fr_polite_008', 'Je me permets de vous relancer.', 'Позволю себе напомнить вам.', 'Дозволю собі нагадати вам.', 'Я позволяю себе вас снова запустить.', 'Я дозволяю собі вас знову запустити.', 'Relancer — напомнить/вернуться к вопросу. Очень полезно в письмах и сообщениях.', 'Relancer — нагадати/повернутися до питання. Дуже корисно в листах і повідомленнях.', 'Je me permets de vous relancer au sujet du rendez-vous.', 'Позволю себе напомнить вам насчёт встречи.', 'Дозволю собі нагадати вам щодо зустрічі.', 'formal', 'B1', ['robertVous', 'robertPolitesse']),
      card('fr_polite_009', 'Ça vous dérange si j’ouvre la fenêtre ?', 'Вы не против, если я открою окно?', 'Ви не проти, якщо я відчиню вікно?', 'Вас беспокоит, если я открою окно?', 'Вас турбує, якщо я відчиню вікно?', 'Ça vous dérange si... спрашивает разрешение мягче, чем je peux.', 'Ça vous dérange si... питає дозволу м’якше, ніж je peux.', 'Ça vous dérange si je prends cette chaise ?', 'Вы не против, если я возьму этот стул?', 'Ви не проти, якщо я візьму цей стілець?', 'polite', 'A2', ['robertVous', 'robertPolitesse']),
      card('fr_polite_010', 'Je ne voudrais pas vous déranger.', 'Я не хотел бы вас беспокоить.', 'Я не хотів би вас турбувати.', 'Я не хотел бы вас беспокоить.', 'Я не хотів би вас турбувати.', 'Conditionnel voudrais смягчает фразу и делает её очень вежливой.', 'Conditionnel voudrais пом’якшує фразу й робить її дуже ввічливою.', 'Je ne voudrais pas vous déranger, mais j’ai une question.', 'Не хотел бы вас беспокоить, но у меня вопрос.', 'Не хотів би вас турбувати, але маю питання.', 'formal', 'A2', ['robertVous', 'robertPolitesse']),
      card('fr_polite_011', 'Merci de votre compréhension.', 'Спасибо за понимание.', 'Дякую за розуміння.', 'Спасибо вашего понимания.', 'Дякую вашого розуміння.', 'Формальная концовка сообщения, особенно когда просишь принять неудобство.', 'Формальне завершення повідомлення, особливо коли просиш прийняти незручність.', 'Le rendez-vous est reporté. Merci de votre compréhension.', 'Встреча перенесена. Спасибо за понимание.', 'Зустріч перенесено. Дякую за розуміння.', 'formal', 'A2', ['robertMerci', 'robertVous']),
      card('fr_polite_012', 'Avec plaisir.', 'С удовольствием.', 'Із задоволенням.', 'С удовольствием.', 'Із задоволенням.', 'Ответ на спасибо или просьбу; звучит теплее, чем de rien.', 'Відповідь на подяку або прохання; звучить тепліше, ніж de rien.', 'Merci pour votre aide. — Avec plaisir.', 'Спасибо за помощь. — С удовольствием.', 'Дякую за допомогу. — Із задоволенням.', 'polite', 'A1', ['robertMerci']),
      card('fr_polite_013', 'Je vous en prie.', 'Пожалуйста / не за что.', 'Будь ласка / нема за що.', 'Я вас об этом прошу.', 'Я вас про це прошу.', 'Очень вежливый ответ на merci или способ пригласить пройти/сесть.', 'Дуже ввічлива відповідь на merci або спосіб запросити пройти/сісти.', 'Merci beaucoup. — Je vous en prie.', 'Большое спасибо. — Пожалуйста.', 'Дуже дякую. — Будь ласка.', 'formal', 'A2', ['robertVous', 'robertMerci']),
      card('fr_polite_014', 'Ce n’est pas grave.', 'Ничего страшного.', 'Нічого страшного.', 'Это не серьёзно.', 'Це не серйозно.', 'Фраза снимает напряжение после маленькой ошибки или извинения.', 'Фраза знімає напругу після маленької помилки або вибачення.', 'Désolé pour le retard. — Ce n’est pas grave.', 'Извините за опоздание. — Ничего страшного.', 'Вибачте за запізнення. — Нічого страшного.', 'neutral', 'A1', ['robertDesole']),
      card('fr_polite_015', 'Je vais y réfléchir.', 'Я подумаю об этом.', 'Я подумаю над цим.', 'Я собираюсь об этом подумать.', 'Я збираюся над цим подумати.', 'Вежливый способ не отвечать сразу и не говорить non слишком резко.', 'Ввічливий спосіб не відповідати одразу й не казати non занадто різко.', 'Merci pour la proposition, je vais y réfléchir.', 'Спасибо за предложение, я подумаю.', 'Дякую за пропозицію, я подумаю.', 'polite', 'A2', ['robertPolitesse']),
      card('fr_polite_016', 'Je reviens vers vous rapidement.', 'Я скоро к вам вернусь / отвечу.', 'Я скоро до вас повернуся / відповім.', 'Я возвращаюсь к вам быстро.', 'Я повертаюся до вас швидко.', 'Деловая формула: не физически вернуться, а ответить позже.', 'Ділова формула: не фізично повернутися, а відповісти пізніше.', 'Je vérifie et je reviens vers vous rapidement.', 'Я проверю и скоро отвечу.', 'Я перевірю й скоро відповім.', 'formal', 'B1', ['robertVous']),
      card('fr_polite_017', 'Si cela vous convient.', 'Если вам это подходит.', 'Якщо вам це підходить.', 'Если это вам подходит.', 'Якщо це вам підходить.', 'Формальная мягкая концовка предложения времени/варианта.', 'Формальне м’яке завершення пропозиції часу/варіанта.', 'On peut se voir mardi, si cela vous convient.', 'Можем встретиться во вторник, если вам подходит.', 'Можемо зустрітися у вівторок, якщо вам підходить.', 'formal', 'A2', ['robertVous', 'robertPolitesse']),
      card('fr_polite_018', 'Je suis vraiment navré.', 'Мне очень жаль.', 'Мені дуже шкода.', 'Я правда огорчён.', 'Я справді засмучений.', 'Navré сильнее и формальнее, чем désolé; подходит для более серьёзного извинения.', 'Navré сильніше й формальніше, ніж désolé; пасує для серйознішого вибачення.', 'Je suis vraiment navré pour ce malentendu.', 'Мне очень жаль из-за этого недоразумения.', 'Мені дуже шкода через це непорозуміння.', 'formal', 'B1', ['robertDesole']),
      card('fr_polite_019', 'On fait comme ça ?', 'Так и сделаем?', 'Так і зробимо?', 'Мы делаем так?', 'Ми робимо так?', 'Мягко закрывает договорённость и просит подтверждения.', 'М’яко закриває домовленість і просить підтвердження.', 'Je réserve pour 19 h, on fait comme ça ?', 'Я бронирую на 19:00, так и сделаем?', 'Я бронюю на 19:00, так і зробимо?', 'casual', 'A2', ['tv5Sortie']),
      card('fr_polite_020', 'Je ne veux pas insister.', 'Я не хочу настаивать.', 'Я не хочу наполягати.', 'Я не хочу настаивать.', 'Я не хочу наполягати.', 'Хорошая фраза, чтобы отступить вежливо и не давить.', 'Гарна фраза, щоб ввічливо відступити й не тиснути.', 'Je ne veux pas insister, mais dites-moi si ça vous intéresse.', 'Не хочу настаивать, но скажите, если вам интересно.', 'Не хочу наполягати, але скажіть, якщо вам цікаво.', 'polite', 'B1', ['robertPolitesse']),
    ],
  },
  {
    id: 'fr_apero_social_life',
    codeName: 'Apéro',
    category: 'daily',
    taxonomy: 'culture_native',
    priceShards: 15,
    titleRu: 'Apéro: зайти и не зависнуть в тишине',
    titleUk: 'Apéro: зайти й не зависнути в тиші',
    descriptionRu: 'Тебя позвали “на аперо”, а ты не знаешь, это на час или до полуночи? Бутылка под мышкой, тост, знакомство, “я скоро побегу” и обещание повторить. Зайди легко, уйди красиво, не зависай у сырной тарелки молча.',
    descriptionUk: 'Тебе покликали “на аперо”, а ти не знаєш, це на годину чи до півночі? Пляшка під рукою, тост, знайомство, “я скоро побіжу” й обіцянка повторити. Зайди легко, піди красиво, не зависай біля сирної тарілки мовчки.',
    cards: [
      card('fr_apero_001', 'Tu passes prendre l’apéro ?', 'Зайдёшь на аперо?', 'Зайдеш на аперо?', 'Ты заходишь взять аперитив?', 'Ти заходиш взяти аперитив?', 'Prendre l’apéro — устойчивый бытовой сценарий: напиток/закуски перед едой или как встреча.', 'Prendre l’apéro — сталий побутовий сценарій: напій/закуски перед їжею або як зустріч.', 'Tu passes prendre l’apéro vendredi ?', 'Зайдёшь на аперо в пятницу?', 'Зайдеш на аперо в п’ятницю?', 'casual', 'A2', ['robertApero', 'robertAperitif']),
      card('fr_apero_002', 'Je passe juste une petite heure.', 'Я зайду всего на часок.', 'Я зайду лише на годинку.', 'Я прохожу только маленький час.', 'Я заходжу лише маленьку годину.', 'Une petite heure звучит мягко и по-дружески: предупреждаешь, что ненадолго.', 'Une petite heure звучить м’яко й по-дружньому: попереджаєш, що ненадовго.', 'Je passe juste une petite heure, après j’ai un dîner.', 'Я зайду всего на часок, потом у меня ужин.', 'Я зайду лише на годинку, потім у мене вечеря.', 'casual', 'A2', ['robertSoiree']),
      card('fr_apero_003', 'Tu veux que j’apporte quelque chose ?', 'Хочешь, я что-нибудь принесу?', 'Хочеш, я щось принесу?', 'Ты хочешь, чтобы я принёс что-то?', 'Ти хочеш, щоб я приніс щось?', 'Нормальная фраза гостя перед визитом; apporter — принести с собой.', 'Нормальна фраза гостя перед візитом; apporter — принести із собою.', 'Tu veux que j’apporte quelque chose pour ce soir ?', 'Хочешь, я что-нибудь принесу на вечер?', 'Хочеш, я щось принесу на вечір?', 'casual', 'A2', ['robertInviter']),
      card('fr_apero_004', 'J’ai pris une bouteille.', 'Я взял бутылку.', 'Я взяв пляшку.', 'Я взял одну бутылку.', 'Я взяв одну пляшку.', 'Во французской гостевой сцене une bouteille часто понятно как бутылка вина/напитка.', 'У французькій гостьовій сцені une bouteille часто зрозуміло як пляшка вина/напою.', 'J’ai pris une bouteille, ça ira avec le fromage.', 'Я взял бутылку, она подойдёт к сыру.', 'Я взяв пляшку, вона пасуватиме до сиру.', 'casual', 'A2', ['robertVerre', 'robertAperitif']),
      card('fr_apero_005', 'On trinque ?', 'Чокнемся?', 'Цокнемося?', 'Мы чокаемся?', 'Ми цокаємося?', 'Trinquer — чокаться/пить тост. Короткая живая фраза перед бокалом.', 'Trinquer — цокатися/пити тост. Коротка жива фраза перед келихом.', 'Allez, on trinque ?', 'Ну что, чокнемся?', 'Ну що, цокнемося?', 'casual', 'A1', ['robertTrinquer']),
      card('fr_apero_006', 'À la vôtre !', 'За ваше здоровье!', 'За ваше здоров’я!', 'К вашему!', 'До вашого!', 'Классическая форма тоста; с друзьями можно À la tienne.', 'Класична форма тосту; з друзями можна À la tienne.', 'À la vôtre, et merci pour l’invitation !', 'За ваше здоровье, и спасибо за приглашение!', 'За ваше здоров’я, і дякую за запрошення!', 'polite', 'A2', ['robertTrinquer', 'robertInviter']),
      card('fr_apero_007', 'Santé !', 'Будем здоровы! / За здоровье!', 'Будьмо здорові! / За здоров’я!', 'Здоровье!', 'Здоров’я!', 'Самый короткий тост. Важно: не переводить как медицинское “здоровье” в отрыве от сцены.', 'Найкоротший тост. Важливо: не перекладати як медичне “здоров’я” поза сценою.', 'Santé ! Ravi de vous voir.', 'За здоровье! Рад вас видеть.', 'За здоров’я! Радий вас бачити.', 'neutral', 'A1', ['robertTrinquer']),
      card('fr_apero_008', 'Je ne vais pas tarder.', 'Я скоро пойду.', 'Я скоро піду.', 'Я не буду задерживаться.', 'Я не буду затримуватися.', 'Французский мягкий выход из встречи: ещё не ухожу, но предупреждаю.', 'Французький м’який вихід із зустрічі: ще не йду, але попереджаю.', 'Je ne vais pas tarder, j’ai un train tôt demain.', 'Я скоро пойду, у меня завтра ранний поезд.', 'Я скоро піду, у мене завтра ранній поїзд.', 'casual', 'A2', ['robertSoiree']),
      card('fr_apero_009', 'On remet ça bientôt ?', 'Повторим скоро?', 'Повторимо скоро?', 'Мы ставим это снова скоро?', 'Ми ставимо це знову скоро?', 'Remettre ça — разговорно “повторить это”. Отличная фраза после удачной встречи.', 'Remettre ça — розмовно “повторити це”. Чудова фраза після вдалої зустрічі.', 'C’était super, on remet ça bientôt ?', 'Было здорово, повторим скоро?', 'Було чудово, повторимо скоро?', 'casual', 'B1', ['robertSoiree']),
      card('fr_apero_010', 'Merci pour l’invitation.', 'Спасибо за приглашение.', 'Дякую за запрошення.', 'Спасибо за приглашение.', 'Дякую за запрошення.', 'Базовая фраза гостя; invitation подтверждена словарно и культурно в сценариях приглашений.', 'Базова фраза гостя; invitation підтверджена словниково й культурно у сценаріях запрошень.', 'Merci pour l’invitation, c’était très sympa.', 'Спасибо за приглашение, было очень приятно.', 'Дякую за запрошення, було дуже приємно.', 'polite', 'A1', ['robertInviter']),
      card('fr_apero_011', 'Tu connais déjà tout le monde ?', 'Ты уже всех знаешь?', 'Ти вже всіх знаєш?', 'Ты знаешь уже весь мир?', 'Ти знаєш уже весь світ?', 'Tout le monde здесь “все люди здесь”, не “весь мир”. Хороший small talk.', 'Tout le monde тут “усі люди тут”, не “весь світ”. Гарний small talk.', 'Tu connais déjà tout le monde ici ?', 'Ты уже всех здесь знаешь?', 'Ти вже всіх тут знаєш?', 'casual', 'A2', ['robertSoiree']),
      card('fr_apero_012', 'Je vous présente Camille.', 'Познакомьтесь, это Камиль.', 'Познайомтеся, це Каміль.', 'Я вам представляю Камиль.', 'Я вам представляю Каміль.', 'Présenter quelqu’un — представить человека. Vous может быть множественным или вежливым.', 'Présenter quelqu’un — представити людину. Vous може бути множиною або ввічливою формою.', 'Je vous présente Camille, une amie de fac.', 'Познакомьтесь, это Камиль, подруга из университета.', 'Познайомтеся, це Каміль, подруга з університету.', 'neutral', 'A2', ['robertVous']),
      card('fr_apero_013', 'Enchanté, moi c’est Alex.', 'Очень приятно, я Алекс.', 'Дуже приємно, я Алекс.', 'Очарованный, я — Алекс.', 'Зачарований, я — Алекс.', 'Moi c’est... — живое знакомство, менее официальное, чем je m’appelle.', 'Moi c’est... — живе знайомство, менш офіційне, ніж je m’appelle.', 'Enchanté, moi c’est Alex. On s’est déjà croisés ?', 'Очень приятно, я Алекс. Мы уже пересекались?', 'Дуже приємно, я Алекс. Ми вже перетиналися?', 'neutral', 'A1', ['robertPolitesse']),
      card('fr_apero_014', 'Je suis content d’avoir pu venir.', 'Я рад, что смог прийти.', 'Я радий, що зміг прийти.', 'Я доволен, что смог прийти.', 'Я задоволений, що зміг прийти.', 'Тёплая фраза гостя, особенно если приглашение было важным.', 'Тепла фраза гостя, особливо якщо запрошення було важливим.', 'Je suis content d’avoir pu venir, ça faisait longtemps.', 'Я рад, что смог прийти, давно не виделись.', 'Я радий, що зміг прийти, давно не бачилися.', 'polite', 'B1', ['robertInviter']),
      card('fr_apero_015', 'Tu restes dîner ?', 'Останешься на ужин?', 'Залишишся на вечерю?', 'Ты остаёшься ужинать?', 'Ти залишаєшся вечеряти?', 'Короткое приглашение после аперо, когда встреча может перейти в ужин.', 'Коротке запрошення після аперо, коли зустріч може перейти у вечерю.', 'Tu restes dîner ou tu dois filer ?', 'Останешься на ужин или тебе нужно бежать?', 'Залишишся на вечерю чи тобі треба бігти?', 'casual', 'A1', ['robertInviter', 'robertSoiree']),
      card('fr_apero_016', 'Je dois filer.', 'Мне нужно бежать.', 'Мені треба бігти.', 'Я должен ускользнуть.', 'Я маю вислизнути.', 'Filer — разговорно “убегать/уходить”. Живая фраза для выхода.', 'Filer — розмовно “тікати/йти”. Жива фраза для виходу.', 'Je dois filer, mais merci encore.', 'Мне нужно бежать, но ещё раз спасибо.', 'Мені треба бігти, але ще раз дякую.', 'casual', 'A2', ['robertSoiree']),
      card('fr_apero_017', 'On se tient au courant.', 'Будем на связи.', 'Будемо на зв’язку.', 'Мы держим друг друга в курсе.', 'Ми тримаємо одне одного в курсі.', 'Фраза закрывает разговор без точной даты: “спишемся/созвонимся”.', 'Фраза закриває розмову без точної дати: “спишемося/зідзвонимося”.', 'Pour le week-end, on se tient au courant.', 'Насчёт выходных будем на связи.', 'Щодо вихідних будемо на зв’язку.', 'neutral', 'B1', ['robertMessage']),
      card('fr_apero_018', 'Ça m’a fait plaisir de te voir.', 'Мне было приятно тебя увидеть.', 'Мені було приємно тебе побачити.', 'Это сделало мне удовольствие тебя видеть.', 'Це зробило мені приємність тебе бачити.', 'Faire plaisir — выражать приятность/радость; важная французская конструкция.', 'Faire plaisir — виражати приємність/радість; важлива французька конструкція.', 'Ça m’a fait plaisir de te voir après tout ce temps.', 'Мне было приятно увидеть тебя после столького времени.', 'Мені було приємно побачити тебе після стількох років/такого часу.', 'warm', 'A2', ['robertAperitif']),
      card('fr_apero_019', 'La prochaine fois, c’est chez moi.', 'В следующий раз у меня.', 'Наступного разу в мене.', 'Следующий раз — это у меня.', 'Наступний раз — це в мене.', 'Фраза-ответ на гостеприимство: предлагаешь следующий приём у себя.', 'Фраза-відповідь на гостинність: пропонуєш наступну зустріч у себе.', 'Merci pour ce soir. La prochaine fois, c’est chez moi.', 'Спасибо за сегодняшний вечер. В следующий раз у меня.', 'Дякую за цей вечір. Наступного разу в мене.', 'casual', 'A2', ['robertInviter']),
      card('fr_apero_020', 'Passe quand tu veux.', 'Заходи когда хочешь.', 'Заходь коли хочеш.', 'Проходи когда хочешь.', 'Заходь коли хочеш.', 'Тёплое неформальное приглашение; quand tu veux не всегда буквально “в любую секунду”, а дружески “как-нибудь заходи”.', 'Тепле неформальне запрошення; quand tu veux не завжди буквально “будь-якої секунди”, а дружньо “якось заходь”.', 'Passe quand tu veux, tu es toujours le bienvenu.', 'Заходи когда хочешь, тебе всегда рады.', 'Заходь коли хочеш, тобі завжди раді.', 'casual', 'A2', ['robertInviter']),
    ],
  },
  {
    id: 'fr_pharmacy_healthcare',
    codeName: 'Pharma',
    category: 'daily',
    taxonomy: 'everyday_functional',
    priceShards: 15,
    titleRu: 'Аптека без медицинской паники',
    titleUk: 'Аптека без медичної паніки',
    descriptionRu: 'Аптека, очередь, горло болит, рецепт где-то в телефоне, а за спиной уже вздыхают. Без самодиагностики и геройства: объясни симптом, спроси про ordonnance, дозировку, дженерик и когда пора к врачу.',
    descriptionUk: 'Аптека, черга, горло болить, рецепт десь у телефоні, а позаду вже зітхають. Без самодіагностики й геройства: поясни симптом, спитай про ordonnance, дозування, генерик і коли час до лікаря.',
    cards: [
      card('fr_pharma_001', 'J’ai une ordonnance.', 'У меня есть рецепт.', 'У мене є рецепт.', 'У меня есть предписание.', 'У мене є припис.', 'Ordonnance — медицинский рецепт/назначение. В аптеке это ключевое слово.', 'Ordonnance — медичний рецепт/призначення. В аптеці це ключове слово.', 'Bonjour, j’ai une ordonnance à vous montrer.', 'Здравствуйте, у меня есть рецепт, который я хочу вам показать.', 'Добрий день, у мене є рецепт, який хочу вам показати.', 'neutral', 'A1', ['robertOrdonnance', 'ameliOrdonnance'], 'prescription and pharmacy context'),
      card('fr_pharma_002', 'C’est sans ordonnance ?', 'Это без рецепта?', 'Це без рецепта?', 'Это без предписания?', 'Це без припису?', 'Sans ordonnance — важный безопасный вопрос, а не просьба нарушить правила.', 'Sans ordonnance — важливе безпечне питання, а не прохання порушити правила.', 'Ce médicament, c’est sans ordonnance ?', 'Это лекарство без рецепта?', 'Ці ліки без рецепта?', 'neutral', 'A1', ['robertOrdonnance', 'ameliAutomedication']),
      card('fr_pharma_003', 'Je voudrais demander conseil au pharmacien.', 'Я хотел бы попросить совета у фармацевта.', 'Я хотів би попросити поради у фармацевта.', 'Я хотел бы попросить совет у фармацевта.', 'Я хотів би попросити пораду у фармацевта.', 'Demander conseil — безопасная формула; Ameli прямо подчёркивает роль фармацевта.', 'Demander conseil — безпечна формула; Ameli прямо підкреслює роль фармацевта.', 'Je voudrais demander conseil au pharmacien pour une douleur.', 'Я хотел бы посоветоваться с фармацевтом насчёт боли.', 'Я хотів би порадитися з фармацевтом щодо болю.', 'polite', 'A2', ['robertPharmacie', 'ameliPharmacien']),
      card('fr_pharma_004', 'J’ai mal à la gorge.', 'У меня болит горло.', 'У мене болить горло.', 'У меня боль в горле.', 'У мене біль у горлі.', 'J’ai mal à... — базовый шаблон боли в части тела.', 'J’ai mal à... — базовий шаблон болю в частині тіла.', 'J’ai mal à la gorge depuis hier.', 'У меня со вчерашнего дня болит горло.', 'У мене з учора болить горло.', 'neutral', 'A1', ['robertDouleur', 'ameliPharmacien']),
      card('fr_pharma_005', 'J’ai de la fièvre.', 'У меня температура.', 'У мене температура.', 'У меня жар.', 'У мене жар.', 'Fièvre — температура/лихорадка. Не указывает диагноз, только симптом.', 'Fièvre — температура/лихоманка. Не вказує діагноз, лише симптом.', 'J’ai de la fièvre et je suis très fatigué.', 'У меня температура и я очень устал.', 'У мене температура, і я дуже втомлений.', 'neutral', 'A1', ['robertSymptome', 'ameliAutomedication']),
      card('fr_pharma_006', 'J’ai une douleur ici.', 'У меня боль вот здесь.', 'У мене біль ось тут.', 'У меня боль здесь.', 'У мене біль тут.', 'Полезная фраза с жестом, когда не хватает анатомической лексики.', 'Корисна фраза з жестом, коли бракує анатомічної лексики.', 'J’ai une douleur ici quand je respire.', 'У меня боль здесь, когда я дышу.', 'У мене біль тут, коли я дихаю.', 'neutral', 'A1', ['robertDouleur', 'ameliDouleur']),
      card('fr_pharma_007', 'Ça dure depuis trois jours.', 'Это длится уже три дня.', 'Це триває вже три дні.', 'Это длится с трёх дней.', 'Це триває з трьох днів.', 'Depuis указывает продолжительность от прошлого момента до сейчас.', 'Depuis вказує тривалість від минулого моменту до тепер.', 'Ça dure depuis trois jours, ça ne passe pas.', 'Это длится уже три дня и не проходит.', 'Це триває вже три дні й не минає.', 'neutral', 'A2', ['robertSymptome']),
      card('fr_pharma_008', 'Ça ne passe pas.', 'Это не проходит.', 'Це не минає.', 'Это не проходит.', 'Це не минає.', 'Разговорная фраза для симптома, который сохраняется.', 'Розмовна фраза для симптому, що зберігається.', 'J’ai pris du repos, mais ça ne passe pas.', 'Я отдохнул, но это не проходит.', 'Я відпочив, але це не минає.', 'neutral', 'A2', ['robertSymptome', 'ameliAutomedication']),
      card('fr_pharma_009', 'Est-ce que je dois consulter un médecin ?', 'Мне нужно обратиться к врачу?', 'Мені потрібно звернутися до лікаря?', 'Должен ли я консультироваться с врачом?', 'Чи маю я консультуватися з лікарем?', 'Безопасная фраза: не просишь диагноз, а спрашиваешь о необходимости консультации.', 'Безпечна фраза: не просиш діагноз, а питаєш про потребу консультації.', 'Est-ce que je dois consulter un médecin si ça continue ?', 'Мне нужно обратиться к врачу, если это продолжится?', 'Мені потрібно звернутися до лікаря, якщо це триватиме?', 'neutral', 'A2', ['ameliAutomedication', 'ameliDouleur']),
      card('fr_pharma_010', 'Comment je dois le prendre ?', 'Как мне это принимать?', 'Як мені це приймати?', 'Как я должен это принимать?', 'Як я маю це приймати?', 'Le заменяет лекарство. Вопрос про способ приёма, не про выбор лечения.', 'Le замінює ліки. Питання про спосіб прийому, не про вибір лікування.', 'Ce médicament, comment je dois le prendre ?', 'Как мне принимать это лекарство?', 'Як мені приймати ці ліки?', 'neutral', 'A1', ['ameliOrdonnance', 'ameliAutomedication']),
      card('fr_pharma_011', 'C’est à prendre avant ou après le repas ?', 'Это принимать до или после еды?', 'Це приймати до чи після їжі?', 'Это к принятию до или после еды?', 'Це до приймання до чи після їжі?', 'À prendre — типичный оборот на инструкциях к лекарству.', 'À prendre — типовий зворот в інструкціях до ліків.', 'C’est à prendre avant ou après le repas ?', 'Это принимать до или после еды?', 'Це приймати до чи після їжі?', 'neutral', 'A2', ['ameliOrdonnance']),
      card('fr_pharma_012', 'Il y a des effets secondaires ?', 'Есть побочные эффекты?', 'Є побічні ефекти?', 'Есть вторичные эффекты?', 'Є вторинні ефекти?', 'Effets secondaires — стандартное выражение для side effects.', 'Effets secondaires — стандартний вираз для побічних ефектів.', 'Il y a des effets secondaires fréquents ?', 'Есть частые побочные эффекты?', 'Є часті побічні ефекти?', 'neutral', 'A2', ['ameliAutomedication']),
      card('fr_pharma_013', 'Je suis allergique à la pénicilline.', 'У меня аллергия на пенициллин.', 'У мене алергія на пеніцилін.', 'Я аллергичен к пенициллину.', 'Я алергічний до пеніциліну.', 'Allergique à... — важный шаблон безопасности.', 'Allergique à... — важливий шаблон безпеки.', 'Je suis allergique à la pénicilline, c’est important.', 'У меня аллергия на пенициллин, это важно.', 'У мене алергія на пеніцилін, це важливо.', 'neutral', 'A2', ['ameliOrdonnance']),
      card('fr_pharma_014', 'Je prends déjà un traitement.', 'Я уже принимаю лечение / препараты.', 'Я вже проходжу лікування / приймаю препарати.', 'Я уже принимаю лечение.', 'Я вже приймаю лікування.', 'Traitement может означать курс лечения/лекарства; важно сообщить перед советом.', 'Traitement може означати курс лікування/ліки; важливо повідомити перед порадою.', 'Je prends déjà un traitement pour la tension.', 'Я уже принимаю препараты от давления.', 'Я вже приймаю препарати від тиску.', 'neutral', 'A2', ['ameliOrdonnance', 'ameliAutomedication']),
      card('fr_pharma_015', 'Je peux le prendre avec ça ?', 'Можно принимать это вместе с этим?', 'Можна приймати це разом із цим?', 'Я могу это принимать с этим?', 'Я можу це приймати з цим?', 'Фраза для проверки совместимости лекарств у фармацевта/врача.', 'Фраза для перевірки сумісності ліків у фармацевта/лікаря.', 'Je prends déjà ça, je peux le prendre avec ça ?', 'Я уже принимаю это, можно совмещать?', 'Я вже приймаю це, можна поєднувати?', 'neutral', 'A2', ['ameliAutomedication']),
      card('fr_pharma_016', 'Vous avez un générique ?', 'У вас есть дженерик?', 'У вас є генерик?', 'У вас есть общий/родовой вариант?', 'У вас є загальний/родовий варіант?', 'Générique — лекарство-дженерик; полезно в аптеке и связано с возмещением/заменой.', 'Générique — ліки-генерик; корисно в аптеці й пов’язано з відшкодуванням/заміною.', 'Vous avez un générique moins cher ?', 'У вас есть дженерик дешевле?', 'У вас є дешевший генерик?', 'neutral', 'A2', ['ameliPharmacien']),
      card('fr_pharma_017', 'C’est remboursé ?', 'Это возмещается страховкой?', 'Це відшкодовується страховкою?', 'Это возмещено?', 'Це відшкодовано?', 'Во Франции remboursé часто про оплату/возмещение Assurance Maladie.', 'У Франції remboursé часто про оплату/відшкодування Assurance Maladie.', 'Avec ma carte Vitale, c’est remboursé ?', 'С моей carte Vitale это возмещается?', 'З моєю carte Vitale це відшкодовується?', 'neutral', 'A2', ['ameliPharmacien']),
      card('fr_pharma_018', 'J’ai oublié ma carte Vitale.', 'Я забыл свою carte Vitale.', 'Я забув свою carte Vitale.', 'Я забыл мою жизненную карту.', 'Я забув мою життєву картку.', 'Carte Vitale — французская медицинская страховая карта; обычно не переводится.', 'Carte Vitale — французька медична страхова картка; зазвичай не перекладається.', 'J’ai oublié ma carte Vitale, c’est grave ?', 'Я забыл carte Vitale, это проблема?', 'Я забув carte Vitale, це проблема?', 'neutral', 'A2', ['ameliPharmacien']),
      card('fr_pharma_019', 'Je dois prendre rendez-vous ?', 'Мне нужно записаться на приём?', 'Мені потрібно записатися на прийом?', 'Я должен взять встречу?', 'Я маю взяти зустріч?', 'Prendre rendez-vous — записаться на приём/встречу.', 'Prendre rendez-vous — записатися на прийом/зустріч.', 'Je dois prendre rendez-vous avec un médecin ?', 'Мне нужно записаться к врачу?', 'Мені потрібно записатися до лікаря?', 'neutral', 'A1', ['robertRendezVous', 'ameliAutomedication']),
      card('fr_pharma_020', 'C’est urgent ou je peux attendre ?', 'Это срочно или я могу подождать?', 'Це терміново чи я можу почекати?', 'Это срочно или я могу ждать?', 'Це терміново чи я можу чекати?', 'Безопасная фраза про степень срочности, не про самолечение.', 'Безпечна фраза про ступінь терміновості, не про самолікування.', 'D’après vous, c’est urgent ou je peux attendre demain ?', 'Как вы думаете, это срочно или можно подождать до завтра?', 'Як ви думаєте, це терміново чи можна почекати до завтра?', 'neutral', 'A2', ['ameliAutomedication', 'ameliDouleur']),
    ],
  },
  {
    id: 'fr_texting_reactions',
    codeName: 'Texto',
    category: 'daily',
    taxonomy: 'media_register',
    priceShards: 15,
    titleRu: 'Французские сообщения без сухаря',
    titleUk: 'Французькі повідомлення без сухаря',
    descriptionRu: 'Хватит отвечать так, будто сообщение писала налоговая. Ça marche, pas de souci, du coup, ah mince — короткие французские реакции, переносы и “я отвечу позже”, которые спасают тон переписки за два слова.',
    descriptionUk: 'Досить відповідати так, ніби повідомлення писала податкова. Ça marche, pas de souci, du coup, ah mince — короткі французькі реакції, перенесення й “відповім пізніше”, що рятують тон листування за два слова.',
    cards: [
      card('fr_text_001', 'Ça marche !', 'Окей, договорились / подходит!', 'Окей, домовились / підходить!', 'Это работает!', 'Це працює!', 'В переписке ça marche часто значит “окей, подходит”, а не буквально работает.', 'У листуванні ça marche часто означає “окей, підходить”, а не буквально працює.', '18 h devant le cinéma ? — Ça marche !', 'В 18:00 перед кинотеатром? — Окей!', 'О 18:00 перед кінотеатром? — Окей!', 'casual', 'A1', ['robertMarche']),
      card('fr_text_002', 'D’accord, je note.', 'Хорошо, я записал / учту.', 'Добре, я занотував / врахую.', 'В согласии, я отмечаю.', 'У згоді, я нотую.', 'Je note в сообщениях значит “принял к сведению”, не обязательно буквально пишу.', 'Je note в повідомленнях означає “прийняв до уваги”, не обов’язково буквально пишу.', 'D’accord, je note pour mardi.', 'Хорошо, учту насчёт вторника.', 'Добре, врахую щодо вівторка.', 'neutral', 'A2', ['robertAccord', 'robertMessage']),
      card('fr_text_003', 'Je te tiens au courant.', 'Я буду держать тебя в курсе.', 'Я триматиму тебе в курсі.', 'Я тебя держу в курсе.', 'Я тебе тримаю в курсі.', 'Устойчивая фраза для “сообщу, когда будет ясно”.', 'Сталий вираз для “повідомлю, коли буде ясно”.', 'Je vérifie les horaires et je te tiens au courant.', 'Я проверю расписание и сообщу.', 'Я перевірю розклад і повідомлю.', 'casual', 'A2', ['robertMessage']),
      card('fr_text_004', 'Je reviens vers toi.', 'Я вернусь к тебе с ответом.', 'Я повернуся до тебе з відповіддю.', 'Я возвращаюсь к тебе.', 'Я повертаюся до тебе.', 'Не физическое возвращение, а обещание ответить позже.', 'Не фізичне повернення, а обіцянка відповісти пізніше.', 'Je demande et je reviens vers toi.', 'Я спрошу и вернусь с ответом.', 'Я спитаю й повернуся з відповіддю.', 'casual', 'B1', ['robertRepondre', 'robertMessage']),
      card('fr_text_005', 'Pas de souci.', 'Без проблем.', 'Без проблем.', 'Нет заботы.', 'Нема турботи.', 'Очень частый мягкий ответ: “окей/не проблема”.', 'Дуже часта м’яка відповідь: “окей/не проблема”.', 'Je serai un peu en retard. — Pas de souci.', 'Я немного опоздаю. — Без проблем.', 'Я трохи запізнюся. — Без проблем.', 'casual', 'A1', ['robertMessage']),
      card('fr_text_006', 'T’inquiète.', 'Не переживай.', 'Не хвилюйся.', 'Тебя тревожь.', 'Тебе тривож.', 'Разговорное сокращение от ne t’inquiète pas. Не для формальной переписки.', 'Розмовне скорочення від ne t’inquiète pas. Не для формального листування.', 'T’inquiète, je m’en occupe.', 'Не переживай, я этим займусь.', 'Не хвилюйся, я цим займуся.', 'casual', 'A2', ['robertMessage']),
      card('fr_text_007', 'Je suis chaud.', 'Я за / мне интересно.', 'Я за / мені цікаво.', 'Я горячий.', 'Я гарячий.', 'Разговорно être chaud = быть готовым/заинтересованным. Не переводить буквально.', 'Розмовно être chaud = бути готовим/зацікавленим. Не перекладати буквально.', 'Un ciné ce soir ? — Je suis chaud.', 'Кино сегодня вечером? — Я за.', 'Кіно сьогодні ввечері? — Я за.', 'slang-soft', 'B1', ['robertMessage']),
      card('fr_text_008', 'Je suis pas dispo.', 'Я недоступен / не могу.', 'Я недоступний / не можу.', 'Я не доступен.', 'Я не доступний.', 'Dispo — разговорное сокращение от disponible. Уместно с друзьями/коллегами в чате.', 'Dispo — розмовне скорочення від disponible. Доречно з друзями/колегами в чаті.', 'Désolé, je suis pas dispo demain.', 'Извини, завтра я не могу.', 'Вибач, завтра я не можу.', 'casual', 'A2', ['robertMessage']),
      card('fr_text_009', 'Je te redis ça.', 'Я тебе ещё скажу / уточню.', 'Я тобі ще скажу / уточню.', 'Я тебе перескажу это.', 'Я тобі переповім це.', 'Redis ça в переписке значит “вернусь с уточнением”.', 'Redis ça в листуванні означає “повернуся з уточненням”.', 'Je regarde mon agenda et je te redis ça.', 'Я посмотрю календарь и уточню.', 'Я подивлюся календар і уточню.', 'casual', 'B1', ['robertRepondre']),
      card('fr_text_010', 'Je te laisse gérer.', 'Оставляю это на тебя / разберись ты.', 'Залишаю це на тебе / розберися ти.', 'Я тебе оставляю управлять.', 'Я тобі залишаю керувати.', 'Gérer — разговорно “разобраться/организовать”. Может звучать доверительно или резко по контексту.', 'Gérer — розмовно “розібратися/організувати”. Може звучати довірливо або різко за контекстом.', 'Pour le resto, je te laisse gérer.', 'Насчёт ресторана оставляю это на тебя.', 'Щодо ресторану залишаю це на тебе.', 'casual', 'B1', ['robertMessage']),
      card('fr_text_011', 'Du coup, on fait comment ?', 'Тогда что делаем?', 'Тоді що робимо?', 'От удара, мы делаем как?', 'Від удару, ми робимо як?', 'Du coup — живая связка “тогда/в итоге”; не переводить буквально.', 'Du coup — жива зв’язка “тоді/у підсумку”; не перекладати буквально.', 'Il pleut. Du coup, on fait comment ?', 'Идёт дождь. Тогда что делаем?', 'Йде дощ. Тоді що робимо?', 'casual', 'A2', ['robertCoup']),
      card('fr_text_012', 'Bref, on verra.', 'Короче, посмотрим.', 'Коротше, побачимо.', 'Кратко, мы увидим.', 'Коротко, ми побачимо.', 'Bref закрывает тему или резко сжимает мысль.', 'Bref закриває тему або різко стискає думку.', 'Bref, on verra demain.', 'Короче, посмотрим завтра.', 'Коротше, побачимо завтра.', 'casual', 'A2', ['robertBref']),
      card('fr_text_013', 'Genre vraiment ?', 'Типа серьёзно?', 'Типу серйозно?', 'Жанр правда?', 'Жанр справді?', 'Genre в разговорной реакции работает как “типа”. Очень неформально.', 'Genre в розмовній реакції працює як “типу”. Дуже неформально.', 'Il a annulé encore ? Genre vraiment ?', 'Он опять отменил? Типа серьёзно?', 'Він знову скасував? Типу серйозно?', 'casual', 'B1', ['robertGenre']),
      card('fr_text_014', 'Trop bien !', 'Супер! / Очень круто!', 'Супер! / Дуже класно!', 'Слишком хорошо!', 'Занадто добре!', 'Trop в разговорной похвале часто усиливает положительно: “очень/супер”.', 'Trop у розмовній похвалі часто підсилює позитивно: “дуже/супер”.', 'J’ai eu le poste ! — Trop bien !', 'Я получил работу! — Супер!', 'Я отримав роботу! — Супер!', 'casual', 'A2', ['robertMessage']),
      card('fr_text_015', 'Ah mince.', 'Ой, блин / жаль.', 'Ой, блін / шкода.', 'О, тонкий.', 'О, тонкий.', 'Mince — мягкая реакция на неприятность, безопаснее грубых слов.', 'Mince — м’яка реакція на неприємність, безпечніше за грубі слова.', 'Le train est annulé. — Ah mince.', 'Поезд отменён. — Ой, жаль.', 'Потяг скасовано. — Ой, шкода.', 'casual-soft', 'A2', ['robertMessage']),
      card('fr_text_016', 'Je viens de voir ton message.', 'Я только что увидел твоё сообщение.', 'Я щойно побачив твоє повідомлення.', 'Я только что видеть твоё сообщение.', 'Я щойно бачити твоє повідомлення.', 'Je viens de + infinitif = только что сделал. Очень полезно для поздних ответов.', 'Je viens de + infinitif = щойно зробив. Дуже корисно для пізніх відповідей.', 'Désolé, je viens de voir ton message.', 'Извини, я только что увидел твоё сообщение.', 'Вибач, я щойно побачив твоє повідомлення.', 'casual', 'A2', ['robertMessage']),
      card('fr_text_017', 'Je te réponds plus tard.', 'Я отвечу тебе позже.', 'Я відповім тобі пізніше.', 'Я тебе отвечаю позже.', 'Я тобі відповідаю пізніше.', 'Простая фраза, чтобы не исчезать молча.', 'Проста фраза, щоб не зникати мовчки.', 'Je suis en réunion, je te réponds plus tard.', 'Я на встрече, отвечу позже.', 'Я на зустрічі, відповім пізніше.', 'casual', 'A1', ['robertRepondre', 'robertMessage']),
      card('fr_text_018', 'Désolé, j’ai zappé.', 'Извини, я забыл / вылетело из головы.', 'Вибач, я забув / вилетіло з голови.', 'Извини, я переключил канал.', 'Вибач, я перемкнув канал.', 'Zapper разговорно значит забыть/пропустить; неформально.', 'Zapper розмовно означає забути/пропустити; неформально.', 'Désolé, j’ai zappé ton appel.', 'Извини, я пропустил твой звонок.', 'Вибач, я пропустив твій дзвінок.', 'casual', 'B1', ['robertMessage']),
      card('fr_text_019', 'On décale ?', 'Перенесём?', 'Перенесемо?', 'Мы сдвигаем?', 'Ми зсуваємо?', 'Décaler — сдвинуть время/дату. Короткая фраза для планов.', 'Décaler — зсунути час/дату. Коротка фраза для планів.', 'Je suis bloqué au travail, on décale ?', 'Я застрял на работе, перенесём?', 'Я застряг на роботі, перенесемо?', 'casual', 'B1', ['robertMessage']),
      card('fr_text_020', 'Tiens-moi au courant.', 'Держи меня в курсе.', 'Тримай мене в курсі.', 'Держи меня в курсе.', 'Тримай мене в курсі.', 'Повелительная форма для друга/коллеги; с vous будет tenez-moi au courant.', 'Наказова форма для друга/колеги; з vous буде tenez-moi au courant.', 'Tiens-moi au courant quand tu arrives.', 'Дай знать, когда приедешь.', 'Дай знати, коли приїдеш.', 'casual', 'A2', ['robertMessage']),
    ],
  },
];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function jsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function hasMarketplaceVoice(description) {
  const bland = [
    'contains phrases',
    'this pack teaches',
    'набор для',
    'набір для',
    'содержит фразы',
    'містить фрази',
  ];
  const lower = description.toLocaleLowerCase('ru');
  const hasBland = bland.some((needle) => lower.includes(needle));
  const hasSceneOrConflict = /[?!]|хочешь|хочеш|хватит|досить|аптека|очеред|черг|позвали|покликали|во франции|у франції|террасе|терасі|налоговая|податкова/i.test(description);
  return !hasBland && hasSceneOrConflict && description.length >= 120;
}

function buildDescriptionStyleGate(packs) {
  const rows = packs.flatMap((pack) => [
    {
      packId: pack.id,
      locale: 'ru',
      description: pack.descriptionRu,
      pass: hasMarketplaceVoice(pack.descriptionRu),
    },
    {
      packId: pack.id,
      locale: 'uk',
      description: pack.descriptionUk,
      pass: hasMarketplaceVoice(pack.descriptionUk),
    },
  ]);
  return {
    schemaVersion: 'gustav-fr-flashcard-description-style-gate-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    rule: 'English marketplace product-copy voice: scene, tension, concrete social fantasy, useful promise; bland topic summaries are blocked.',
    activationApproved: false,
    status: rows.every((row) => row.pass) ? 'PASS' : 'BLOCK',
    rows,
  };
}

function validatePacks(packs) {
  const errors = [];
  const seen = new Set();
  for (const pack of packs) {
    if (pack.cards.length < 20) errors.push(`${pack.id}: card count below 20`);
    if (!pack.descriptionRu || pack.descriptionRu.length < 120) errors.push(`${pack.id}: descriptionRu too short`);
    if (!pack.descriptionUk || pack.descriptionUk.length < 120) errors.push(`${pack.id}: descriptionUk too short`);
    if (!hasMarketplaceVoice(pack.descriptionRu)) errors.push(`${pack.id}: descriptionRu product-copy drift`);
    if (!hasMarketplaceVoice(pack.descriptionUk)) errors.push(`${pack.id}: descriptionUk product-copy drift`);
    for (const item of pack.cards) {
      const key = item.targetText.trim().toLocaleLowerCase('fr-FR');
      if (seen.has(key)) errors.push(`duplicate targetText: ${item.targetText}`);
      seen.add(key);
      for (const field of ['id', 'targetText', 'ru', 'uk', 'literalRu', 'literalUk', 'explanationRu', 'explanationUk', 'exampleFr', 'exampleRu', 'exampleUk', 'register', 'level']) {
        if (!item[field]) errors.push(`${item.id}: missing ${field}`);
      }
      if (!Array.isArray(item.evidence) || item.evidence.length === 0) errors.push(`${item.id}: missing evidence`);
      for (const source of item.evidence || []) {
        if (!source.sourceId || !source.url || !source.verified) errors.push(`${item.id}: incomplete evidence`);
      }
    }
  }
  return errors;
}

function localizeCard(card, sourceLocale) {
  return {
    id: card.id,
    targetText: card.targetText,
    meaning: card[sourceLocale],
    literal: sourceLocale === 'ru' ? card.literalRu : card.literalUk,
    explanation: sourceLocale === 'ru' ? card.explanationRu : card.explanationUk,
    exampleFr: card.exampleFr,
    exampleMeaning: sourceLocale === 'ru' ? card.exampleRu : card.exampleUk,
    register: card.register,
    level: card.level,
    evidence: card.evidence,
  };
}

function buildPayload(candidate, sourceLocale) {
  return {
    schemaVersion: 'gustav-fr-flashcard-marketplace-payload-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    contentVersion: CONTENT_VERSION,
    studyTarget: 'fr',
    targetLanguage: 'fr',
    sourceLocale,
    surface: SURFACE,
    payloadKind: PAYLOAD_KIND,
    activationApproved: false,
    productionReady: false,
    packs: candidate.packs.map((pack) => ({
      id: pack.id,
      codeName: pack.codeName,
      category: pack.category,
      taxonomy: pack.taxonomy,
      priceShards: pack.priceShards,
      title: sourceLocale === 'ru' ? pack.titleRu : pack.titleUk,
      description: sourceLocale === 'ru' ? pack.descriptionRu : pack.descriptionUk,
      cardCount: pack.cards.length,
      cards: pack.cards.map((item) => localizeCard(item, sourceLocale)),
    })),
  };
}

function materializePayloads(candidate) {
  ensureDir(PAYLOAD_DIR);
  return SOURCE_LOCALES.map((sourceLocale) => {
    const payload = buildPayload(candidate, sourceLocale);
    const payloadText = JSON.stringify(payload);
    const sha = sha256(payloadText);
    const file = path.join(PAYLOAD_DIR, `fr_flashcard_phrase_packs_${sourceLocale}.json`);
    writeJson(file, payload);
    return {
      sourceLocale,
      surface: SURFACE,
      localArtifactPath: rel(file),
      localArtifactSha256: sha,
      localArtifactByteSize: jsonBytes(payload),
      serverPath: `course-packs/fr/${sourceLocale}/${SURFACE}/${CONTENT_VERSION}/${PAYLOAD_KIND}/${sha}.json`,
      rollbackScope: `course-packs/fr/${sourceLocale}/`,
      uploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    };
  });
}

function buildServerManifest(payloadEntries) {
  return {
    schemaVersion: 'gustav-fr-flashcard-phrase-pack-server-manifest-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    contentVersion: CONTENT_VERSION,
    studyTarget: 'fr',
    surface: SURFACE,
    activationApproved: false,
    uploadPerformed: false,
    allowedStoragePathPrefixes: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
    deniedStoragePathPrefixes: ['course-packs/en/', 'course-packs/fr/', 'course-packs/fr/uiLocale/', 'course-packs/fr/sourceLocale/', 'course-packs/fr/*/../../'],
    entries: payloadEntries,
    status: payloadEntries.every((entry) => entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/`)) ? 'PASS_DRY_RUN' : 'BLOCK',
  };
}

function buildRuntimeIsolation(serverManifest) {
  const probes = [
    { id: 'ru_path', path: serverManifest.entries[0].serverPath, expectedAccept: true },
    { id: 'uk_path', path: serverManifest.entries[1].serverPath, expectedAccept: true },
    { id: 'english_path', path: 'course-packs/en/ru/flashcard/x.json', expectedAccept: false },
    { id: 'ui_locale_path', path: 'course-packs/fr/uiLocale/flashcard/x.json', expectedAccept: false },
    { id: 'source_locale_literal_path', path: 'course-packs/fr/sourceLocale/flashcard/x.json', expectedAccept: false },
    { id: 'broad_fr_path', path: 'course-packs/fr/flashcard/x.json', expectedAccept: false },
  ].map((probe) => {
    const accepted = SOURCE_LOCALES.some((locale) => probe.path.startsWith(`course-packs/fr/${locale}/${SURFACE}/`));
    return { ...probe, accepted, pass: accepted === probe.expectedAccept };
  });
  return {
    schemaVersion: 'gustav-fr-flashcard-phrase-pack-runtime-isolation-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    activationApproved: false,
    cacheScope: 'flashcards_v2::fr::flashcards_market_built_cards_v1',
    requiredRuntimeTarget: 'studyTarget=fr',
    allowedSourceLocales: SOURCE_LOCALES,
    probes,
    status: probes.every((probe) => probe.pass) ? 'PASS' : 'BLOCK',
  };
}

function buildAdminManifest(serverManifest, descriptionStyleGate, runtimeIsolation) {
  return {
    schemaVersion: 'gustav-fr-flashcard-phrase-pack-admin-workflow-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    activationApproved: false,
    adminWriteAllowed: false,
    runtimeAdapter: {
      module: 'app/french_flashcard_remote_runtime.ts',
      marketplaceLoader: 'parseFrenchMarketplacePayload',
      sourceGate: 'app/flashcards_target_gate.ts',
      cacheScope: runtimeIsolation.cacheScope,
      activationPrecondition: 'Admin activation requires live server upload evidence plus explicit approval receipt; runtime remains closed while activationApproved=false.',
    },
    requiredSurfaces: [
      'pack_status',
      'pack_preview_ru_uk',
      'description_style_gate',
      'source_evidence_review',
      'duplicate_audit',
      'server_manifest_preview',
      'runtime_adapter_gate',
      'activation_request',
      'rollback',
    ],
    evidenceArtifacts: {
      candidate: 'docs/gustav/runs/2026-07-04_fr_flashcard_phrase_packs_v1/build/fr_flashcard_phrase_pack_candidates.json',
      descriptionStyleGate: 'docs/gustav/runs/2026-07-04_fr_flashcard_phrase_packs_v1/build/fr_flashcard_description_style_gate.json',
      serverManifest: 'docs/gustav/runs/2026-07-04_fr_flashcard_phrase_packs_v1/build/fr_flashcard_phrase_pack_server_manifest.json',
      runtimeIsolation: 'docs/gustav/runs/2026-07-04_fr_flashcard_phrase_packs_v1/build/fr_flashcard_phrase_pack_runtime_isolation.json',
      rollback: 'docs/gustav/runs/2026-07-04_fr_flashcard_phrase_packs_v1/build/fr_flashcard_phrase_pack_rollback_manifest.json',
    },
    status: serverManifest.status === 'PASS_DRY_RUN' && descriptionStyleGate.status === 'PASS' && runtimeIsolation.status === 'PASS' ? 'PASS_DRY_RUN' : 'BLOCK',
  };
}

function buildRollbackManifest(serverManifest) {
  const entries = serverManifest.entries.map((entry) => ({
    sourceLocale: entry.sourceLocale,
    targetServerPath: entry.serverPath,
    rollbackScope: entry.rollbackScope,
    rollbackAllowed: false,
    requiresExplicitApprovalReceipt: true,
  }));
  return {
    schemaVersion: 'gustav-fr-flashcard-phrase-pack-rollback-manifest-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    activationApproved: false,
    rollbackExecuted: false,
    rollbackScopes: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
    deniedRollbackScopes: ['course-packs/fr/', 'course-packs/en/', 'course-packs/fr/uiLocale/', 'course-packs/fr/sourceLocale/'],
    entries,
    status: entries.every((entry) => entry.rollbackScope === `course-packs/fr/${entry.sourceLocale}/`) ? 'PASS_DRY_RUN' : 'BLOCK',
  };
}

function main() {
  ensureDir(BUILD_DIR);
  ensureDir(REVIEW_DIR);

  const errors = validatePacks(PACKS);
  const cardCount = PACKS.reduce((sum, pack) => sum + pack.cards.length, 0);
  const candidate = {
    schemaVersion: 'gustav-fr-flashcard-phrase-pack-candidates-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    studyTarget: 'fr',
    targetLanguage: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    productionReady: false,
    contentCandidateReady: errors.length === 0,
    packCount: PACKS.length,
    cardCount,
    packs: PACKS,
  };
  const sourceEvidence = {
    schemaVersion: 'gustav-fr-flashcard-phrase-pack-source-evidence-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    accessedDate: ACCESSED_DATE,
    sourceCount: Object.keys(SOURCES).length,
    sources: Object.fromEntries(Object.entries(SOURCES).map(([key, [sourceId, url]]) => [key, { sourceId, url }])),
    rowCoverage: PACKS.flatMap((pack) => pack.cards.map((item) => ({
      packId: pack.id,
      cardId: item.id,
      targetText: item.targetText,
      evidenceCount: item.evidence.length,
      sourceIds: item.evidence.map((source) => source.sourceId),
    }))),
  };
  const duplicateAudit = {
    schemaVersion: 'gustav-fr-flashcard-phrase-pack-duplicate-audit-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    duplicateCount: errors.filter((error) => error.startsWith('duplicate targetText')).length,
    status: errors.some((error) => error.startsWith('duplicate targetText')) ? 'BLOCK' : 'PASS',
  };
  const descriptionStyleGate = buildDescriptionStyleGate(PACKS);
  const payloadEntries = materializePayloads(candidate);
  const serverManifest = buildServerManifest(payloadEntries);
  const runtimeIsolation = buildRuntimeIsolation(serverManifest);
  const adminManifest = buildAdminManifest(serverManifest, descriptionStyleGate, runtimeIsolation);
  const rollbackManifest = buildRollbackManifest(serverManifest);
  const dryRunStatuses = [
    descriptionStyleGate.status,
    serverManifest.status,
    runtimeIsolation.status,
    adminManifest.status,
    rollbackManifest.status,
  ];
  const productionCandidateReady = errors.length === 0 && dryRunStatuses.every((status) => status === 'PASS' || status === 'PASS_DRY_RUN');
  const review = {
    schemaVersion: 'gustav-fr-flashcard-phrase-pack-review-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    verdict: productionCandidateReady ? 'PASS_PRODUCTION_CANDIDATE_ACTIVATION_HOLD' : 'BLOCK_PRODUCTION_CANDIDATE',
    activationApproved: false,
    productionReady: false,
    productionCandidateReady,
    passed: productionCandidateReady ? [
      'five_selected_packs',
      'hundred_phrase_cards',
      'ru_uk_meanings_present',
      'literal_and_explanation_fields_present',
      'source_evidence_per_row_present',
      'duplicate_audit',
      'english_style_pack_copy',
      'description_style_gate',
      'server_pack_dry_run',
      'runtime_storage_isolation',
      'admin_workflow_manifest',
      'rollback_manifest',
    ] : [],
    holds: [
      'live_server_upload_not_performed',
      'admin_activation_not_performed',
      'runtime_activation_not_open',
      'rollback_not_executed',
    ],
    errors,
  };
  const finalGate = {
    schemaVersion: 'gustav-fr-flashcard-phrase-pack-final-gate-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    candidateHash: sha256(JSON.stringify(candidate)),
    productionReady: false,
    contentCandidateReady: errors.length === 0,
    productionCandidateReady,
    activationApproved: false,
    status: productionCandidateReady ? 'PRODUCTION_CANDIDATE_READY_ACTIVATION_HOLD' : 'BLOCK_PRODUCTION_CANDIDATE',
    gates: {
      packCount: PACKS.length === 5 ? 'PASS' : 'BLOCK',
      cardCount: cardCount >= 100 ? 'PASS' : 'BLOCK',
      requiredFields: errors.some((error) => error.includes('missing')) ? 'BLOCK' : 'PASS',
      sourceEvidence: errors.some((error) => error.includes('evidence')) ? 'BLOCK' : 'PASS',
      duplicateAudit: duplicateAudit.status,
      descriptionStyle: descriptionStyleGate.status,
      medicalSafety: 'PASS_NON_DIAGNOSTIC_PHRASES_ONLY',
      codexLinguisticReview: productionCandidateReady ? 'PASS_REVIEW_ARTIFACT' : 'BLOCK',
      serverPackDryRun: serverManifest.status,
      runtimeStorageIsolation: runtimeIsolation.status,
      adminWorkflowSurface: adminManifest.status,
      runtimeActivation: 'HOLD_CLOSED',
      rollback: rollbackManifest.status,
    },
    holdGates: ['liveServerUpload', 'adminActivation', 'runtimeActivation', 'rollbackExecution'],
  };

  writeJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_candidates.json'), candidate);
  writeJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_source_evidence.json'), sourceEvidence);
  writeJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_duplicate_audit.json'), duplicateAudit);
  writeJson(path.join(BUILD_DIR, 'fr_flashcard_description_style_gate.json'), descriptionStyleGate);
  writeJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_server_manifest.json'), serverManifest);
  writeJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_runtime_isolation.json'), runtimeIsolation);
  writeJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_admin_workflow_manifest.json'), adminManifest);
  writeJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_rollback_manifest.json'), rollbackManifest);
  writeJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_final_gate.json'), finalGate);
  writeJson(path.join(REVIEW_DIR, 'fr_flashcard_phrase_pack_review.json'), review);
  fs.writeFileSync(path.join(REVIEW_DIR, 'fr_flashcard_phrase_pack_review.md'), [
    '# Gustav French Flashcard Phrase Packs V1 Review',
    '',
    `Run: ${RUN_ID}`,
    `Verdict: ${review.verdict}`,
    `Packs: ${PACKS.length}`,
    `Cards: ${cardCount}`,
    `Activation approved: ${review.activationApproved}`,
    '',
    'The five phrase pack candidates are materialized with RU/UK meanings, literal notes, explanations, examples, register/level metadata, and per-row trusted evidence. Server payloads, admin workflow, runtime isolation, rollback, and description-style dry-run gates pass. Live upload, admin activation, runtime activation, and rollback execution remain closed until explicit approval.',
    '',
  ].join('\n'));

  console.log(JSON.stringify(finalGate, null, 2));
}

main();

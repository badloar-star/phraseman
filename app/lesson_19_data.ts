/**
 * LESSON 19: Prepositions of Place / Предлоги места
 * 50 phrases + vocabulary + irregular verbs
 */

import { LessonIntroScreen, LessonPhrase } from './lesson_data_all';

export const LESSON_19_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    textRU: 'Привет! В этом уроке мы разберемся с предлогами места. Они помогают нам точно описать, ГДЕ находится что-то: на столе, под стулом, между шкафом и окном.',
    textUK: 'Привіт! На цьому уроці ми розберемось з прийменниками місця. Вони допомагають нам точно описати, ДЕ знаходиться щось: на столі, під стільцем, між шафою й вікном.',
  },
  {
    textRU: 'Главные предлоги места: IN (в), ON (на), UNDER (под), BEHIND (за), BETWEEN (между), NEAR (рядом), ABOVE (над), BELOW (ниже), BESIDE (рядом с), OPPOSITE (напротив), INSIDE (внутри), OUTSIDE (снаружи), ALONG (вдоль), AMONG (среди), AROUND (вокруг).',
    textUK: 'Головні прийменники місця: IN (у), ON (на), UNDER (під), BEHIND (за), BETWEEN (між), NEAR (біля), ABOVE (над), BELOW (нижче), BESIDE (поряд з), OPPOSITE (навпроти), INSIDE (всередині), OUTSIDE (зовні), ALONG (вздовж), AMONG (серед), AROUND (навколо).',
  },
  {
    textRU: 'Помни: после предлога часто идет артикль (the) и слово. Давайте тренироваться! Начнем с простых предложений и постепенно усложним. Ты справишься! 💪',
    textUK: 'Пам\'ятай: після прийменника часто йде артикль (the) і слово. Давайте тренуватися! Почнемо з простих речень і поступово ускладнимо. Ти справишся! 💪',
  },
];

export const LESSON_19_PHRASES: LessonPhrase[] = [
  // 1-5
  {
    id: 'l19p1',
    english: 'That grey cat sleeps on that soft pillow in this corner.',
    russian: 'Тот серый кот спит на той мягкой подушке в этом углу.',
    ukrainian: 'Той сірий кіт спить на тій м\'якій подушці в цьому кутку.',
    words: [
      { text: 'That', correct: 'That', distractors: ['This', 'These', 'Those', 'Than'] },
      { text: 'grey', correct: 'grey', distractors: ['great', 'green', 'greedy', 'greyly'] },
      { text: 'cat', correct: 'cat', distractors: ['cut', 'cap', 'car', 'cats'] },
      { text: 'sleeps', correct: 'sleeps', distractors: ['sleep', 'sleeping', 'slept', 'sleepy'] },
      { text: 'on', correct: 'on', distractors: ['in', 'at', 'under', 'by'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'soft', correct: 'soft', distractors: ['softy', 'softly', 'sort', 'salt'] },
      { text: 'pillow', correct: 'pillow', distractors: ['pillows', 'yellow', 'pillar', 'pillowly'] },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'out', 'onto'] },
      { text: 'this', correct: 'this', distractors: ['that', 'these', 'those', 'thin'] },
      { text: 'corner.', correct: 'corner.', distractors: ['corners.', 'corn.', 'cornerly.', 'cover.'] },
    ],
  },
  {
    id: 'l19p2',
    english: 'Put those fresh fruits in that wicker basket above this table.',
    russian: 'Положи те свежие фрукты в ту плетеную корзину над этим столом.',
    ukrainian: 'Поклади ті свіжі фрукти в той плетений кошик над цим столом.',
    words: [
      { text: 'Put', correct: 'Put', distractors: ['Puts', 'Putting', 'Pat', 'Pit'] },
      { text: 'those', correct: 'those', distractors: ['these', 'this', 'that', 'them'] },
      { text: 'fresh', correct: 'fresh', distractors: ['freshly', 'freshy', 'flesh', 'fish'] },
      { text: 'fruits', correct: 'fruits', distractors: ['fruit', 'fruitsy', 'front', 'fruity'] },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'out', 'into'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'wicker', correct: 'wicker', distractors: ['wicked', 'winter', 'wickerly', 'wick'] },
      { text: 'basket', correct: 'basket', distractors: ['baskets', 'basic', 'blanket', 'basketly'] },
      { text: 'above', correct: 'above', distractors: ['under', 'about', 'across', 'along'] },
      { text: 'this', correct: 'this', distractors: ['that', 'these', 'those', 'thin'] },
      { text: 'table.', correct: 'table.', distractors: ['tablet.', 'tables.', 'tab.', 'cable.'] },
    ],
  },
  {
    id: 'l19p3',
    english: 'Our new office is between that bank and that cafe.',
    russian: 'Наш новый офис находится между тем банком и тем кафе.',
    ukrainian: 'Наш новий офіс знаходиться між тим банком і тим кафе.',
    words: [
      { text: 'Our', correct: 'Our', distractors: ['Us', 'We', 'Ours', 'Hour'] },
      { text: 'new', correct: 'new', distractors: ['now', 'news', 'newly', 'knew'] },
      { text: 'office', correct: 'office', distractors: ['offices', 'officer', 'official', 'off'] },
      { text: 'is', correct: 'is', distractors: ['are', 'am', 'was', 'be'] },
      { text: 'between', correct: 'between', distractors: ['behind', 'beside', 'below', 'betwixt'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'bank', correct: 'bank', distractors: ['banks', 'banky', 'back', 'band'] },
      { text: 'and', correct: 'and', distractors: ['end', 'any', 'add', 'ant'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'cafe.', correct: 'cafe.', distractors: ['cafes.', 'coffee.', 'cafeteria.', 'cage.'] },
    ],
  },
  {
    id: 'l19p4',
    english: 'Your leather gloves lie under that wooden armchair.',
    russian: 'Твои кожаные перчатки лежат под тем деревянным креслом.',
    ukrainian: 'Твої шкіряні рукавички лежать під тим дерев\'яним кріслом.',
    words: [
      { text: 'Your', correct: 'Your', distractors: ['You', 'Yours', 'You\'re', 'Year'] },
      { text: 'leather', correct: 'leather', distractors: ['weather', 'feather', 'leatherly', 'leader'] },
      { text: 'gloves', correct: 'gloves', distractors: ['glove', 'glovesy', 'glass', 'glows'] },
      { text: 'lie', correct: 'lie', distractors: ['lies', 'lay', 'lying', 'line'] },
      { text: 'under', correct: 'under', distractors: ['over', 'above', 'behind', 'units'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'wooden', correct: 'wooden', distractors: ['wood', 'woodly', 'wool', 'woolly'] },
      { text: 'armchair.', correct: 'armchair.', distractors: ['chair.', 'armchairs.', 'arm.', 'chairs.'] },
    ],
  },
  {
    id: 'l19p5',
    english: 'Their big dog always waits behind that black door.',
    russian: 'Их большая собака всегда ждет за той черной дверью.',
    ukrainian: 'Їхній великий собака завжди чекає за тими чорними дверима.',
    words: [
      { text: 'Their', correct: 'Their', distractors: ['They', 'Them', 'There', 'Theirs'] },
      { text: 'big', correct: 'big', distractors: ['bag', 'bug', 'bigly', 'bigy'] },
      { text: 'dog', correct: 'dog', distractors: ['dogs', 'dogy', 'dock', 'doll'] },
      { text: 'always', correct: 'always', distractors: ['alway', 'away', 'allow', 'all'] },
      { text: 'waits', correct: 'waits', distractors: ['wait', 'waiting', 'waited', 'waist'] },
      { text: 'behind', correct: 'behind', distractors: ['between', 'beside', 'below', 'beyond'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'black', correct: 'black', distractors: ['block', 'blank', 'blackly', 'blue'] },
      { text: 'door.', correct: 'door.', distractors: ['doors.', 'doory.', 'floor.', 'dear.'] },
    ],
  },

  // 6-10
  {
    id: 'l19p6',
    english: 'My dear sister stands near that tall mirror now.',
    russian: 'Моя дорогая сестра сейчас стоит около того высокого зеркала.',
    ukrainian: 'Моя дорога сестра зараз стоїть біля того високого дзеркала.',
    words: [
      { text: 'My', correct: 'My', distractors: ['Me', 'Mine', 'I', 'May'] },
      { text: 'dear', correct: 'dear', distractors: ['deer', 'dare', 'door', 'deal'] },
      { text: 'sister', correct: 'sister', distractors: ['sisters', 'sisterly', 'sista', 'mister'] },
      { text: 'stands', correct: 'stands', distractors: ['stand', 'standing', 'stood', 'stay'] },
      { text: 'near', correct: 'near', distractors: ['far', 'next', 'nearly', 'neat'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'tall', correct: 'tall', distractors: ['tail', 'tell', 'toll', 'talk'] },
      { text: 'mirror', correct: 'mirror', distractors: ['mirrors', 'mirrory', 'minor', 'error'] },
      { text: 'now.', correct: 'now.', distractors: ['know.', 'no.', 'new.', 'how.'] },
    ],
  },

  // 11-15
  {
    id: 'l19p11',
    english: 'Our white cat often hides behind that wide curtain.',
    russian: 'Наша белая кошка часто прячется за тем широким занавесом.',
    ukrainian: 'Наша біла кішка часто ховається за тією широкою завісою.',
    words: [
      { text: 'Our', correct: 'Our', distractors: ['Us', 'We', 'Ours', 'Hour'] },
      { text: 'white', correct: 'white', distractors: ['write', 'wait', 'while', 'wheat'] },
      { text: 'cat', correct: 'cat', distractors: ['cut', 'cap', 'car', 'cats'] },
      { text: 'often', correct: 'often', distractors: ['after', 'offer', 'off', 'soften'] },
      { text: 'hides', correct: 'hides', distractors: ['hide', 'hidden', 'hid', 'hidesy'] },
      { text: 'behind', correct: 'behind', distractors: ['between', 'beside', 'below', 'beyond'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'wide', correct: 'wide', distractors: ['wild', 'wind', 'wisely', 'side'] },
      { text: 'curtain.', correct: 'curtain.', distractors: ['certain.', 'curtains.', 'captain.', 'garden.'] },
    ],
  },

  // 16-20
  {
    id: 'l19p16',
    english: 'That polite courier stands at that main entrance to this building now.',
    russian: 'Тот вежливый курьер сейчас стоит у того главного входа в это здание.',
    ukrainian: 'Той ввічливий кур\'єр зараз стоїть біля того головного входу в цю будівлю.',
    words: [
      { text: 'That', correct: 'That', distractors: ['This', 'These', 'Those', 'Than'] },
      { text: 'polite', correct: 'polite', distractors: ['policy', 'polish', 'politely', 'political'] },
      { text: 'courier', correct: 'courier', distractors: ['couriers', 'courage', 'course', 'court'] },
      { text: 'stands', correct: 'stands', distractors: ['stand', 'standing', 'stood', 'stay'] },
      { text: 'at', correct: 'at', distractors: ['in', 'on', 'to', 'for'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'main', correct: 'main', distractors: ['mine', 'mean', 'mainly', 'mail'] },
      { text: 'entrance', correct: 'entrance', distractors: ['enter', 'enters', 'entry', 'entrancey'] },
      { text: 'to', correct: 'to', distractors: ['too', 'two', 'through', 'till'] },
      { text: 'this', correct: 'this', distractors: ['that', 'these', 'those', 'thin'] },
      { text: 'building', correct: 'building', distractors: ['build', 'built', 'buildings', 'bold'] },
      { text: 'now.', correct: 'now.', distractors: ['know.', 'no.', 'new.', 'how.'] },
    ],
  },

  // 21-25
  {
    id: 'l19p21',
    english: 'That old oak grows right opposite this low brick house.',
    russian: 'Тот старый дуб растет прямо напротив этого низкого кирпичного дома.',
    ukrainian: 'Той старий дуб росте прямо навпроти цього низького цегляного будинку.',
    words: [
      { text: 'That', correct: 'That', distractors: ['This', 'These', 'Those', 'Than'] },
      { text: 'old', correct: 'old', distractors: ['older', 'oldy', 'cold', 'hold'] },
      { text: 'oak', correct: 'oak', distractors: ['oaks', 'oakey', 'out', 'oar'] },
      { text: 'grows', correct: 'grows', distractors: ['grow', 'growing', 'grew', 'grass'] },
      { text: 'right', correct: 'right', distractors: ['write', 'light', 'rightly', 'night'] },
      { text: 'opposite', correct: 'opposite', distractors: ['across', 'against', 'oppose', 'open'] },
      { text: 'this', correct: 'this', distractors: ['that', 'these', 'those', 'thin'] },
      { text: 'low', correct: 'low', distractors: ['law', 'slow', 'lowly', 'allow'] },
      { text: 'brick', correct: 'brick', distractors: ['bricks', 'break', 'bricky', 'bridge'] },
      { text: 'house.', correct: 'house.', distractors: ['houses.', 'home.', 'housey.', 'horse.'] },
    ],
  },

  // 26-30
  {
    id: 'l19p26',
    english: 'That experienced master works inside that tight basement now.',
    russian: 'Тот опытный мастер сейчас работает внутри того тесного подвала.',
    ukrainian: 'Той досвідчений майстер зараз працює всередині того тісного підвалу.',
    words: [
      { text: 'That', correct: 'That', distractors: ['This', 'These', 'Those', 'Than'] },
      { text: 'experienced', correct: 'experienced', distractors: ['experience', 'experiences', 'expensive', 'expert'] },
      { text: 'master', correct: 'master', distractors: ['masters', 'masterly', 'mister', 'monster'] },
      { text: 'works', correct: 'works', distractors: ['work', 'working', 'worked', 'worker'] },
      { text: 'inside', correct: 'inside', distractors: ['outside', 'in', 'into', 'indoor'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'tight', correct: 'tight', distractors: ['light', 'night', 'tightly', 'thought'] },
      { text: 'basement', correct: 'basement', distractors: ['basements', 'base', 'basic', 'basket'] },
      { text: 'now.', correct: 'now.', distractors: ['know.', 'no.', 'new.', 'how.'] },
    ],
  },

  // 31-35
  {
    id: 'l19p31',
    english: 'That tall waiter stands between those two empty tables now.',
    russian: 'Тот высокий официант сейчас стоит между теми двумя пустыми столами.',
    ukrainian: 'Той високий офіціант зараз стоїть між тими двома порожніми столами.',
    words: [
      { text: 'That', correct: 'That', distractors: ['This', 'These', 'Those', 'Than'] },
      { text: 'tall', correct: 'tall', distractors: ['tell', 'tail', 'toll', 'talk'] },
      { text: 'waiter', correct: 'waiter', distractors: ['waiting', 'waiters', 'wait', 'water'] },
      { text: 'stands', correct: 'stands', distractors: ['stand', 'standing', 'stood', 'stay'] },
      { text: 'between', correct: 'between', distractors: ['behind', 'beside', 'below', 'betwixt'] },
      { text: 'those', correct: 'those', distractors: ['these', 'this', 'that', 'them'] },
      { text: 'two', correct: 'two', distractors: ['too', 'to', 'tow', 'twice'] },
      { text: 'empty', correct: 'empty', distractors: ['entry', 'emptily', 'employ', 'empire'] },
      { text: 'tables', correct: 'tables', distractors: ['table', 'tablet', 'tab', 'cable'] },
      { text: 'now.', correct: 'now.', distractors: ['know.', 'no.', 'new.', 'how.'] },
    ],
  },

  // 36-40
  {
    id: 'l19p36',
    english: 'That sad musician plays that old guitar under that wooden bridge now.',
    russian: 'Тот грустный музыкант сейчас играет на той старой гитаре под тем деревянным мостом.',
    ukrainian: 'Той сумний музикант зараз грає на тій старій гітарі під тим дерев\'яним мостом.',
    words: [
      { text: 'That', correct: 'That', distractors: ['This', 'These', 'Those', 'Than'] },
      { text: 'sad', correct: 'sad', distractors: ['said', 'side', 'sadly', 'seed'] },
      { text: 'musician', correct: 'musician', distractors: ['music', 'musicians', 'musical', 'museum'] },
      { text: 'plays', correct: 'plays', distractors: ['play', 'playing', 'played', 'players'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'old', correct: 'old', distractors: ['older', 'oldy', 'cold', 'hold'] },
      { text: 'guitar', correct: 'guitar', distractors: ['guitars', 'guitary', 'guitarly', 'guide'] },
      { text: 'under', correct: 'under', distractors: ['over', 'above', 'behind', 'units'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'wooden', correct: 'wooden', distractors: ['wood', 'woodly', 'wool', 'woolly'] },
      { text: 'bridge', correct: 'bridge', distractors: ['bridges', 'bridgey', 'bright', 'ridge'] },
      { text: 'now.', correct: 'now.', distractors: ['know.', 'no.', 'new.', 'how.'] },
    ],
  },

  // 41-45
  {
    id: 'l19p41',
    english: 'My small niece hides under that round dining table now.',
    russian: 'Моя маленькая племянница сейчас прячется под тем круглым обеденным столом.',
    ukrainian: 'Моя маленька племінниця зараз ховається під тим круглим обіднім столом.',
    words: [
      { text: 'My', correct: 'My', distractors: ['Me', 'Mine', 'I', 'May'] },
      { text: 'small', correct: 'small', distractors: ['smell', 'smile', 'smalls', 'small-y'] },
      { text: 'niece', correct: 'niece', distractors: ['nieces', 'nice', 'nephew', 'niecey'] },
      { text: 'hides', correct: 'hides', distractors: ['hide', 'hidden', 'hid', 'hidesy'] },
      { text: 'under', correct: 'under', distractors: ['over', 'above', 'behind', 'units'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'round', correct: 'round', distractors: ['road', 'around', 'red', 'found'] },
      { text: 'dining', correct: 'dining', distractors: ['dinner', 'dine', 'dining-table', 'diner'] },
      { text: 'table', correct: 'table', distractors: ['tables', 'tab', 'cable', 'tablet'] },
      { text: 'now.', correct: 'now.', distractors: ['know.', 'no.', 'new.', 'how.'] },
    ],
  },

  // 46-50
  {
    id: 'l19p46',
    english: 'Those old chess lie inside that dark wooden cupboard.',
    russian: 'Те старые шахматы лежат внутри того темного деревянного шкафа.',
    ukrainian: 'Ті старі шахи лежать всередині тієї темної дерев\'яної шафи.',
    words: [
      { text: 'Those', correct: 'Those', distractors: ['These', 'This', 'That', 'Them'] },
      { text: 'old', correct: 'old', distractors: ['older', 'oldy', 'cold', 'hold'] },
      { text: 'chess', correct: 'chess', distractors: ['chest', 'chessy', 'choose', 'cheese'] },
      { text: 'lie', correct: 'lie', distractors: ['lies', 'lay', 'lying', 'line'] },
      { text: 'inside', correct: 'inside', distractors: ['outside', 'in', 'into', 'indoor'] },
      { text: 'that', correct: 'that', distractors: ['this', 'these', 'those', 'than'] },
      { text: 'dark', correct: 'dark', distractors: ['duck', 'darky', 'darkly', 'dock'] },
      { text: 'wooden', correct: 'wooden', distractors: ['wood', 'woodly', 'wool', 'woolly'] },
      { text: 'cupboard.', correct: 'cupboard.', distractors: ['cup.', 'board.', 'cupboards.', 'table.'] },
    ],
  },
];

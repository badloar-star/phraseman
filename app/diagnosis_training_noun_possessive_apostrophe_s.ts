import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk = ru, es = ru): TriText => ({ ru, uk, es });

const CONTRAST = [
  "'s singular possessive",
  "plural possessive s'",
  'of-phrase',
  'apostrophe position',
  'possessive adjective',
  'is contraction',
];

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      "Сначала найди владельца и вещь. Один владелец = owner + 's. Plural с -s = owners'. Irregular plural без -s = + 's.",
      "Спочатку знайди власника і річ. Один власник = owner + 's. Plural з -s = owners'. Irregular plural без -s = + 's.",
      "Find the owner and the thing. Singular owner takes 's; regular plural takes apostrophe after s.",
    ),
    depth2,
    depth3,
    depth4,
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь ошибка в владельце, порядке слов или позиции апострофа. Нужная форма: ${correct}.`,
    `Тут помилка у власнику, порядку слів або позиції апострофа. Потрібна форма: ${correct}.`,
    `Use this possessive pattern: ${correct}.`,
  );
}

function step(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  correctFeedback: TriText;
  wrong: Record<string, TriText>;
  retryFeedback: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      "Possessive 's строит принадлежность так: владелец + 's + вещь. Если владельцев несколько и plural уже заканчивается на -s, апостроф обычно идет после s.",
      "Possessive 's будує належність так: власник + 's + річ. Якщо власників кілька і plural уже закінчується на -s, апостроф зазвичай іде після s.",
      "Possessive 's means owner + 's + thing; regular plural owners take apostrophe after s.",
    ),
    microTask: tri(
      'Выбери форму, где правильно показаны владелец, вещь и апостроф.',
      'Обери форму, де правильно показані власник, річ і апостроф.',
      'Choose the correct possessive form.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? defaultWrong(input.correctAnswer)])),
    retryFeedback: retry(...input.retryFeedback),
    fallbackExplanation: tri(
      "Скелет: owner + 's + thing. John's phone. Для plural с -s: students' answers. Для irregular plural: children's toys.",
      "Скелет: owner + 's + thing. John's phone. Для plural з -s: students' answers. Для irregular plural: children's toys.",
      "Owner + 's + thing; plural with -s takes s'; irregular plural takes 's.",
    ),
    focusWords: input.focusWords,
  };
}

export const NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING: DiagnosisTraining = {
  id: 'noun_possessive_apostrophe_s',
  category: 'noun',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 36,
  supportedLocales: ['ru', 'uk'],
  title: tri("John's / My friend's: принадлежность через 's", "John's / My friend's: належність через 's"),
  shortTitle: tri("Possessive 's", "Possessive 's"),
  shortDiagnosis: tri(
    "Ты путаешь possessive 's: John's phone, my friend's car, the teacher's book.",
    "Ти плутаєш possessive 's: John's phone, my friend's car, the teacher's book.",
  ),
  diagnosisText: tri(
    "Ты путаешь притяжательную форму с 's: John's phone, my friend's car, the teacher's book. Главная проблема в том, что в русском и украинском принадлежность часто выражается падежом или словом “у”, а английский часто ставит владельца перед вещью и добавляет 's.",
    "Ти плутаєш присвійну форму з 's: John's phone, my friend's car, the teacher's book. Головна проблема в тому, що українською і російською належність часто виражається відмінком або словом “у”, а англійська часто ставить власника перед річчю і додає 's.",
  ),
  mentalModel: tri(
    "Possessive 's = владелец + 's + вещь. John's phone = телефон Джона. My friend's car = машина моего друга. Если владельцев несколько и plural уже заканчивается на -s, часто добавляем только апостроф: my parents' house.",
    "Possessive 's = власник + 's + річ. John's phone = телефон Джона. My friend's car = машина мого друга. Якщо власників кілька і plural уже закінчується на -s, часто додаємо тільки апостроф: my parents' house.",
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    "Один владелец: John's phone, my friend's car, the teacher's book. Plural с -s: my parents' house, the students' answers. Irregular plural без -s: children's toys, men's room.",
    "Один власник: John's phone, my friend's car, the teacher's book. Plural з -s: my parents' house, the students' answers. Irregular plural без -s: children's toys, men's room.",
  ),
  whatUserMustLearn: {
    ru: [
      "Если владелец один, обычно добавляем 's: John's phone, Anna's bag.",
      "После 's ставится вещь, которая принадлежит владельцу: John's phone, не phone John's.",
      "My friend's car = машина моего друга. Friend's показывает, что друг один.",
      "My friends' car = машина моих друзей. Friends' показывает, что друзей несколько.",
      "Если plural noun уже заканчивается на -s, обычно добавляем только апостроф: the students' answers.",
      "Если plural noun неправильный и не заканчивается на -s, добавляем 's: children's toys, men's shoes.",
      "Не путай 's принадлежности и 's как сокращение is: John's phone = телефон Джона, John's here = John is here.",
      'Для вещей и абстрактных понятий часто можно использовать of: the name of the app, the end of the lesson.',
      "Для людей и животных possessive 's звучит очень естественно: my brother's phone, the dog's food.",
      "Нельзя писать Johns phone, если смысл “телефон Джона”. Нужен апостроф: John's phone.",
    ],
    uk: [
      "Якщо власник один, зазвичай додаємо 's: John's phone, Anna's bag.",
      "Після 's ставиться річ, яка належить власнику: John's phone, не phone John's.",
      "My friend's car = машина мого друга. Friend's показує, що друг один.",
      "My friends' car = машина моїх друзів. Friends' показує, що друзів кілька.",
      "Якщо plural noun уже закінчується на -s, зазвичай додаємо тільки апостроф: the students' answers.",
      "Якщо plural noun неправильний і не закінчується на -s, додаємо 's: children's toys, men's shoes.",
      "Не плутай 's належності і 's як скорочення is: John's phone = телефон Джона, John's here = John is here.",
      'Для речей і абстрактних понять часто можна використовувати of: the name of the app, the end of the lesson.',
      "Для людей і тварин possessive 's звучить дуже природно: my brother's phone, the dog's food.",
      "Не можна писати Johns phone, якщо сенс “телефон Джона”. Потрібен апостроф: John's phone.",
    ],
    es: [
      "Singular owners usually add 's.",
      "The thing comes after 's.",
      "Friend's means one friend.",
      "Friends' means several friends.",
      "Plural nouns ending in -s usually add only apostrophe.",
      "Irregular plurals not ending in -s add 's.",
      "'s can mean possession or is.",
      'Of-phrases often work for things and abstract ideas.',
      "Possessive 's is natural for people and animals.",
      'Do not omit the apostrophe in possessive forms.',
    ],
  },
  examples: [
    { en: "This is John's phone.", ru: 'Это телефон Джона.', uk: 'Це телефон Джона.', es: "This is John's phone.", why: tri("John - один владелец. Поэтому John + 's + phone.", "John - один власник. Тому John + 's + phone.") },
    { en: "My friend's car is outside.", ru: 'Машина моего друга снаружи.', uk: 'Машина мого друга зовні.', es: "My friend's car is outside.", why: tri("Friend один. Поэтому friend's car.", "Friend один. Тому friend's car.") },
    { en: "My friends' car is outside.", ru: 'Машина моих друзей снаружи.', uk: 'Машина моїх друзів зовні.', es: "My friends' car is outside.", why: tri("Friends - plural с -s. Для принадлежности добавляем апостроф после s: friends' car.", "Friends - plural з -s. Для належності додаємо апостроф після s: friends' car.") },
    { en: "The teacher's book is on the table.", ru: 'Книга учителя на столе.', uk: 'Книга вчителя на столі.', es: "The teacher's book is on the table.", why: tri("Teacher один. Поэтому teacher's book.", "Teacher один. Тому teacher's book.") },
    { en: "The students' answers were correct.", ru: 'Ответы студентов были правильными.', uk: 'Відповіді студентів були правильними.', es: "The students' answers were correct.", why: tri("Students - plural с -s. Апостроф идет после s: students' answers.", "Students - plural з -s. Апостроф іде після s: students' answers.") },
    { en: "The children's toys are everywhere.", ru: 'Детские игрушки повсюду.', uk: 'Дитячі іграшки всюди.', es: "The children's toys are everywhere.", why: tri("Children - irregular plural без -s. Поэтому добавляем 's: children's toys.", "Children - irregular plural без -s. Тому додаємо 's: children's toys.") },
    { en: 'The name of the app is Phraseman.', ru: 'Название приложения - Phraseman.', uk: 'Назва застосунку - Phraseman.', es: 'The name of the app is Phraseman.', why: tri('Для вещей и понятий часто естественно использовать of: the name of the app.', 'Для речей і понять часто природно використовувати of: the name of the app.') },
    { en: "John's here.", ru: 'Джон здесь.', uk: 'Джон тут.', es: "John's here.", why: tri("Здесь John's = John is, потому что после 's нет noun-вещи. Это не принадлежность.", "Тут John's = John is, бо після 's немає noun-речі. Це не належність.") },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri("Похоже, ты иногда переводишь “телефон Джона” как phone John или John phone. В английском принадлежность часто строится иначе: владелец идет первым и получает 's.", "Схоже, ти іноді перекладаєш “телефон Джона” як phone John або John phone. В англійській належність часто будується інакше: власник іде першим і отримує 's.") },
    { id: 'intro_rule', type: 'rule', text: tri("Формула: owner + 's + thing. John's phone. Anna's bag. My friend's car.", "Формула: owner + 's + thing. John's phone. Anna's bag. My friend's car.") },
    { id: 'intro_warning', type: 'warning', text: tri("Главная ловушка: friend's и friends' - не одно и то же. My friend's car = машина одного друга. My friends' car = машина друзей.", "Головна пастка: friend's і friends' - не одне й те саме. My friend's car = машина одного друга. My friends' car = машина друзів.") },
  ],
  steps: [
    step({ id: 'poss_s_easy_001', order: 1, difficulty: 'easy', targetSkill: 'singular_owner_name', sentence: 'This is ___ phone.', translation: tri('Это телефон Джона.', 'Це телефон Джона.'), options: ["John's", 'John', 'Johns', "phone's John"], correctAnswer: "John's", correctFeedback: tri("Да. John - один владелец. Формула: John's phone.", "Так. John - один власник. Формула: John's phone."), wrong: { John: tri("John phone не показывает принадлежность в стандартной форме. Нужно John's phone.", "John phone не показує належність у стандартній формі. Потрібно John's phone."), Johns: tri("Johns без апострофа выглядит как plural или фамилия, но не “Джона”. Нужно John's.", "Johns без апострофа виглядає як plural або прізвище, але не “Джона”. Потрібно John's."), "phone's John": tri("Владелец должен стоять перед вещью: John's phone, не phone's John.", "Власник має стояти перед річчю: John's phone, не phone's John.") }, retryFeedback: [tri("Чей телефон? John + 's.", "Чий телефон? John + 's."), tri("John's phone."), tri("Подсказка: This is John's phone.", "Підказка: This is John's phone.")], focusWords: ["John's phone"] }),
    step({ id: 'poss_s_easy_002', order: 2, difficulty: 'easy', targetSkill: 'singular_owner_common_noun', sentence: 'The ___ book is on the table.', translation: tri('Книга учителя на столе.', 'Книга вчителя на столі.'), options: ["teacher's", 'teacher', 'teachers', "book's teacher"], correctAnswer: "teacher's", correctFeedback: tri("Да. Teacher один. Принадлежность: teacher's book.", "Так. Teacher один. Належність: teacher's book."), wrong: { teacher: tri("Teacher book без 's не показывает “книга учителя” в стандартной форме. Нужно teacher's book.", "Teacher book без 's не показує “книга вчителя” у стандартній формі. Потрібно teacher's book."), teachers: tri("Teachers без апострофа значит учителя. Для “учителя” как владельца нужен teacher's.", "Teachers без апострофа означає вчителі. Для “вчителя” як власника потрібен teacher's."), "book's teacher": tri("Book's teacher значит учитель книги, что не нужно. Нужно teacher's book.", "Book's teacher означає вчитель книги, що не потрібно. Потрібно teacher's book.") }, retryFeedback: [tri("Владелец teacher + 's + вещь book.", "Власник teacher + 's + річ book."), tri("Teacher's book."), tri("Подсказка: The teacher's book is on the table.", "Підказка: The teacher's book is on the table.")], focusWords: ["teacher's book"] }),
    step({ id: 'poss_s_easy_003', order: 3, difficulty: 'easy', targetSkill: 'singular_owner_name_bag', sentence: 'This is ___ bag.', translation: tri('Это сумка Анны.', 'Це сумка Анни.'), options: ["Anna's", 'Anna', 'Annas', "bag's Anna"], correctAnswer: "Anna's", correctFeedback: tri("Да. Anna - один владелец. Поэтому Anna's bag.", "Так. Anna - один власник. Тому Anna's bag."), wrong: { Anna: tri("Anna bag не показывает принадлежность. Нужно Anna's bag.", "Anna bag не показує належність. Потрібно Anna's bag."), Annas: tri("Annas без апострофа не значит “Анны”. Нужно Anna's.", "Annas без апострофа не означає “Анни”. Потрібно Anna's."), "bag's Anna": tri("Владелец должен стоять перед вещью: Anna's bag.", "Власник має стояти перед річчю: Anna's bag.") }, retryFeedback: [tri("Анны = Anna's.", "Анни = Anna's."), tri("Anna's bag."), tri("Подсказка: This is Anna's bag.", "Підказка: This is Anna's bag.")], focusWords: ["Anna's bag"] }),
    step({ id: 'poss_s_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'friend_singular_possessive', sentence: 'My ___ car is outside.', translation: tri('Машина моего друга снаружи.', 'Машина мого друга зовні.'), options: ["friend's", "friends'", 'friends', 'friend'], correctAnswer: "friend's", correctFeedback: tri("Да. Друг один. Поэтому my friend's car.", "Так. Друг один. Тому my friend's car."), wrong: { "friends'": tri("Friends' значит “моих друзей”, то есть владельцев несколько. Здесь один друг: friend's.", "Friends' означає “моїх друзів”, тобто власників кілька. Тут один друг: friend's."), friends: tri("Friends без апострофа значит друзья. Для принадлежности нужен friend's или friends'.", "Friends без апострофа означає друзі. Для належності потрібен friend's або friends'."), friend: tri("My friend car неправильно для “машина моего друга”. Нужно my friend's car.", "My friend car неправильно для “машина мого друга”. Потрібно my friend's car.") }, retryFeedback: [tri("Один друг = friend's.", "Один друг = friend's."), tri("My friend's car."), tri("Подсказка: My friend's car is outside.", "Підказка: My friend's car is outside.")], focusWords: ["friend's car"] }),
    step({ id: 'poss_s_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'friends_plural_possessive', sentence: 'My ___ car is outside.', translation: tri('Машина моих друзей снаружи.', 'Машина моїх друзів зовні.'), options: ["friend's", "friends'", 'friend', 'friends'], correctAnswer: "friends'", correctFeedback: tri("Да. Друзей несколько. Plural friends уже заканчивается на -s, поэтому apostrophe после s: friends' car.", "Так. Друзів кілька. Plural friends уже закінчується на -s, тому apostrophe після s: friends' car."), wrong: { "friend's": tri("Friend's значит одного друга. Здесь друзей несколько, поэтому friends'.", "Friend's означає одного друга. Тут друзів кілька, тому friends'."), friend: tri("Friend без 's не показывает принадлежность. И здесь нужен plural possessive: friends'.", "Friend без 's не показує належність. І тут потрібен plural possessive: friends'."), friends: tri("Friends без апострофа значит друзья. Для принадлежности нужен friends'.", "Friends без апострофа означає друзі. Для належності потрібен friends'.") }, retryFeedback: [tri("Много друзей = friends'.", "Багато друзів = friends'."), tri("My friends' car."), tri("Подсказка: My friends' car is outside.", "Підказка: My friends' car is outside.")], focusWords: ["friends' car"] }),
    step({ id: 'poss_s_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'friend_friend_s_friends_contrast', sentence: 'Choose the correct pair.', translation: tri('Дом моего друга / дом моих друзей', 'Будинок мого друга / будинок моїх друзів'), options: ["my friend's house / my friends' house", "my friends' house / my friend's house", 'my friend house / my friends house', "my friend's house / my friend's house"], correctAnswer: "my friend's house / my friends' house", correctFeedback: tri("Да. Friend's = одного друга. Friends' = нескольких друзей.", "Так. Friend's = одного друга. Friends' = кількох друзів."), wrong: { "my friends' house / my friend's house": tri("Формы перепутаны. Один друг = friend's, много друзей = friends'.", "Форми переплутані. Один друг = friend's, багато друзів = friends'."), 'my friend house / my friends house': tri('В обеих фразах не хватает апострофа принадлежности.', 'В обох фразах бракує апострофа належності.'), "my friend's house / my friend's house": tri("Обе формы показывают одного друга. Для “моих друзей” нужна форма friends'.", "Обидві форми показують одного друга. Для “моїх друзів” потрібна форма friends'.") }, retryFeedback: [tri("Friend's = один. Friends' = много.", "Friend's = один. Friends' = багато."), tri("Friend's house / friends' house."), tri("Подсказка: my friend's house / my friends' house.", "Підказка: my friend's house / my friends' house.")], focusWords: ["friend's house", "friends' house"] }),
    step({ id: 'poss_s_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'students_plural_possessive', sentence: 'The ___ answers were correct.', translation: tri('Ответы студентов были правильными.', 'Відповіді студентів були правильними.'), options: ["students'", "student's", 'students', 'student'], correctAnswer: "students'", correctFeedback: tri("Да. Students - plural с -s. Принадлежность: students' answers.", "Так. Students - plural з -s. Належність: students' answers."), wrong: { "student's": tri("Student's значит одного студента. Здесь студентов несколько, поэтому students'.", "Student's означає одного студента. Тут студентів кілька, тому students'."), students: tri("Students без апострофа не показывает принадлежность. Нужно students'.", "Students без апострофа не показує належність. Потрібно students'."), student: tri("Student один и без принадлежности. Нужна форма students'.", "Student один і без належності. Потрібна форма students'.") }, retryFeedback: [tri("Много студентов = students'.", "Багато студентів = students'."), tri("Students' answers."), tri("Подсказка: The students' answers were correct.", "Підказка: The students' answers were correct.")], focusWords: ["students' answers"] }),
    step({ id: 'poss_s_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'parents_plural_possessive', sentence: 'My ___ house is big.', translation: tri('Дом моих родителей большой.', 'Будинок моїх батьків великий.'), options: ["parents'", "parent's", 'parents', 'parent'], correctAnswer: "parents'", correctFeedback: tri("Да. Parents - plural с -s. Принадлежность: parents' house.", "Так. Parents - plural з -s. Належність: parents' house."), wrong: { "parent's": tri("Parent's значит одного родителя. Здесь родители во множественном числе, поэтому parents'.", "Parent's означає одного з батьків. Тут батьки у множині, тому parents'."), parents: tri("Parents без апострофа не показывает принадлежность. Нужно parents'.", "Parents без апострофа не показує належність. Потрібно parents'."), parent: tri("Parent один и без 's. Для “родителей” как владельцев нужно parents'.", "Parent один і без 's. Для “батьків” як власників потрібно parents'.") }, retryFeedback: [tri("Parents plural + possessive = parents'."), tri("My parents' house."), tri("Подсказка: My parents' house is big.", "Підказка: My parents' house is big.")], focusWords: ["parents' house"] }),
    step({ id: 'poss_s_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'teachers_plural_possessive', sentence: 'The ___ room is upstairs.', translation: tri('Комната учителей наверху.', 'Кімната вчителів нагорі.'), options: ["teachers'", "teacher's", 'teachers', 'teacher'], correctAnswer: "teachers'", correctFeedback: tri("Да. Teachers - plural с -s. Комната учителей = teachers' room.", "Так. Teachers - plural з -s. Кімната вчителів = teachers' room."), wrong: { "teacher's": tri("Teacher's room = комната одного учителя. Здесь учителей несколько: teachers'.", "Teacher's room = кімната одного вчителя. Тут вчителів кілька: teachers'."), teachers: tri("Teachers room без апострофа не показывает принадлежность. Нужно teachers' room.", "Teachers room без апострофа не показує належність. Потрібно teachers' room."), teacher: tri("Teacher один и без принадлежности. Нужно teachers'.", "Teacher один і без належності. Потрібно teachers'.") }, retryFeedback: [tri("Много teachers = teachers'.", "Багато teachers = teachers'."), tri("Teachers' room."), tri("Подсказка: The teachers' room is upstairs.", "Підказка: The teachers' room is upstairs.")], focusWords: ["teachers' room"] }),
    step({ id: 'poss_s_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'children_irregular_plural_possessive', sentence: 'The ___ toys are everywhere.', translation: tri('Детские игрушки повсюду.', 'Дитячі іграшки всюди.'), options: ["children's", "childrens'", 'children', "child's"], correctAnswer: "children's", correctFeedback: tri("Да. Children - irregular plural без -s, поэтому добавляем 's: children's toys.", "Так. Children - irregular plural без -s, тому додаємо 's: children's toys."), wrong: { "childrens'": tri("Childrens неправильная форма. Children уже plural, поэтому children's.", "Childrens неправильна форма. Children уже plural, тому children's."), children: tri("Children без 's не показывает принадлежность. Нужно children's.", "Children без 's не показує належність. Потрібно children's."), "child's": tri("Child's = одного ребенка. Здесь дети во множественном числе: children's.", "Child's = однієї дитини. Тут діти у множині: children's.") }, retryFeedback: [tri("Children уже plural. Possessive = children's."), tri("Children's toys."), tri("Подсказка: The children's toys are everywhere.", "Підказка: The children's toys are everywhere.")], focusWords: ["children's toys"] }),
    step({ id: 'poss_s_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'men_irregular_plural_possessive', sentence: 'The ___ shoes are near the door.', translation: tri('Мужская обувь возле двери.', 'Чоловіче взуття біля дверей.'), options: ["men's", "mens'", 'men', "man's"], correctAnswer: "men's", correctFeedback: tri("Да. Men - irregular plural без -s. Принадлежность: men's shoes.", "Так. Men - irregular plural без -s. Належність: men's shoes."), wrong: { "mens'": tri("Mens неправильная форма. Men уже plural, поэтому men's.", "Mens неправильна форма. Men уже plural, тому men's."), men: tri("Men shoes без 's не показывает принадлежность в стандартной форме. Нужно men's shoes.", "Men shoes без 's не показує належність у стандартній формі. Потрібно men's shoes."), "man's": tri("Man's = одного мужчины. Men's = мужская/мужчин во множественном смысле.", "Man's = одного чоловіка. Men's = чоловіча/чоловіків у множинному сенсі.") }, retryFeedback: [tri("Men plural + 's = men's."), tri("Men's shoes."), tri("Подсказка: The men's shoes are near the door.", "Підказка: The men's shoes are near the door.")], focusWords: ["men's shoes"] }),
    step({ id: 'poss_s_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'possessive_s_vs_is', sentence: "Choose the sentence where 's means possession.", translation: tri("Выбери предложение, где 's означает принадлежность.", "Обери речення, де 's означає належність."), options: ["John's phone is here.", "John's here.", "She's tired.", "It's cold."], correctAnswer: "John's phone is here.", correctFeedback: tri("Да. John's phone = телефон Джона. После 's стоит noun phone, значит это принадлежность.", "Так. John's phone = телефон Джона. Після 's стоїть noun phone, значить це належність."), wrong: { "John's here.": tri("John's here = John is here. Здесь 's означает is, не принадлежность.", "John's here = John is here. Тут 's означає is, не належність."), "She's tired.": tri("She's tired = She is tired. Это сокращение is, не принадлежность.", "She's tired = She is tired. Це скорочення is, не належність."), "It's cold.": tri("It's cold = It is cold. Это не possessive. Притяжательное its пишется без апострофа.", "It's cold = It is cold. Це не possessive. Присвійне its пишеться без апострофа.") }, retryFeedback: [tri("Если после 's идет вещь-noun, это часто принадлежность.", "Якщо після 's іде річ-noun, це часто належність."), tri("John's phone = possession."), tri("Подсказка: John's phone is here.", "Підказка: John's phone is here.")], focusWords: ["John's phone", "John is"] }),
    step({ id: 'poss_s_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_singular_plural_pair', sentence: 'Choose the correct pair.', translation: tri('Телефон Джона / ответы студентов', 'Телефон Джона / відповіді студентів'), options: ["John's phone / the students' answers", "Johns phone / the student's answers", 'John phone / the students answers', "phone's John / the answers' students"], correctAnswer: "John's phone / the students' answers", correctFeedback: tri("Да. John один = John's. Students plural = students'.", "Так. John один = John's. Students plural = students'."), wrong: { "Johns phone / the student's answers": tri("Johns без апострофа неправильно. Student's означает одного студента, но нужно студентов: students'.", "Johns без апострофа неправильно. Student's означає одного студента, але потрібно студентів: students'."), 'John phone / the students answers': tri('В обеих фразах не хватает апострофа принадлежности.', 'В обох фразах бракує апострофа належності.'), "phone's John / the answers' students": tri("Владелец должен стоять перед вещью: John's phone, students' answers.", "Власник має стояти перед річчю: John's phone, students' answers.") }, retryFeedback: [tri("Один owner = 's. Plural с -s = s'.", "Один owner = 's. Plural з -s = s'."), tri("John's phone / students' answers."), tri("Подсказка: John's phone / the students' answers.", "Підказка: John's phone / the students' answers.")], focusWords: ["John's phone", "students' answers"] }),
    step({ id: 'poss_s_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_regular_irregular_plural', sentence: 'Choose the correct pair.', translation: tri('Дом родителей / игрушки детей', 'Будинок батьків / іграшки дітей'), options: ["my parents' house / the children's toys", "my parent's house / the childrens' toys", 'my parents house / the children toys', "my parent house / the child's toys"], correctAnswer: "my parents' house / the children's toys", correctFeedback: tri("Да. Parents plural с -s = parents'. Children irregular plural = children's.", "Так. Parents plural з -s = parents'. Children irregular plural = children's."), wrong: { "my parent's house / the childrens' toys": tri("Parent's значит одного родителя. Childrens' неправильно, потому что children уже plural. Нужно parents' / children's.", "Parent's означає одного з батьків. Childrens' неправильно, бо children уже plural. Потрібно parents' / children's."), 'my parents house / the children toys': tri("Не хватает апострофа принадлежности: parents' house, children's toys.", "Бракує апострофа належності: parents' house, children's toys."), "my parent house / the child's toys": tri("Parent house без 's неправильно, а child's toys означает одного ребенка. Нужно parents' и children's.", "Parent house без 's неправильно, а child's toys означає одну дитину. Потрібно parents' і children's.") }, retryFeedback: [tri("Parents' / children's."), tri("Parents' house / children's toys."), tri("Подсказка: my parents' house / the children's toys.", "Підказка: my parents' house / the children's toys.")], focusWords: ["parents' house", "children's toys"] }),
    step({ id: 'poss_s_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Машина моего друга возле дома моих родителей.', 'Машина мого друга біля будинку моїх батьків.'), options: ["My friend's car is near my parents' house.", "My friends car is near my parent's house.", 'My friend car is near my parents house.', "My car's friend is near my house's parents."], correctAnswer: "My friend's car is near my parents' house.", correctFeedback: tri("Да. Friend один = friend's. Parents plural = parents'.", "Так. Friend один = friend's. Parents plural = parents'."), wrong: { "My friends car is near my parent's house.": tri("Friends car пропускает апостроф, а parent's house значит дом одного родителя. Нужно friend's car и parents' house.", "Friends car пропускає апостроф, а parent's house означає будинок одного з батьків. Потрібно friend's car і parents' house."), 'My friend car is near my parents house.': tri("В обеих частях не хватает possessive apostrophe: friend's car, parents' house.", "В обох частинах бракує possessive apostrophe: friend's car, parents' house."), "My car's friend is near my house's parents.": tri('Владелец и вещь перепутаны. Нужны friend + car и parents + house.', 'Власник і річ переплутані. Потрібні friend + car і parents + house.') }, retryFeedback: [tri("Friend's car. Parents' house."), tri("My friend's car / my parents' house."), tri("Подсказка: My friend's car is near my parents' house.", "Підказка: My friend's car is near my parents' house.")], focusWords: ["friend's car", "parents' house"] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_apostrophe_s_error',
      'wrong_word_order_possessive_error',
      'singular_plural_possessive_confusion',
      'plural_apostrophe_position_error',
      'irregular_plural_possessive_error',
      'possessive_s_vs_is_confusion',
      'of_phrase_error',
      'apostrophe_after_thing_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем владельца, вещь и позицию апострофа.', 'Звичайне пояснення: показуємо власника, річ і позицію апострофа.'),
    depth2: tri('Проще: спрашиваем, владелец один или их несколько.', 'Простіше: питаємо, власник один чи їх кілька.'),
    depth3: tri("Еще проще: показываем готовые пары John's phone / students' answers.", "Ще простіше: показуємо готові пари John's phone / students' answers."),
    depth4: tri('Почти подсказка: прямо указываем, куда поставить апостроф.', 'Майже підказка: прямо вказуємо, куди поставити апостроф.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        "Остановись. Сначала найди владельца. Один владелец = owner + 's: John's phone. Много владельцев с plural -s = owners': students' answers. Irregular plural без -s = + 's: children's toys.",
        "Зупинись. Спочатку знайди власника. Один власник = owner + 's: John's phone. Багато власників з plural -s = owners': students' answers. Irregular plural без -s = + 's: children's toys.",
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_owner_number_hint_then_retry',
      card: tri(
        'Подсказка по владельцу: система покажет, владелец один, plural с -s или irregular plural, но не выберет апостроф за пользователя.',
        'Підказка за власником: система покаже, власник один, plural з -s або irregular plural, але не вибере апостроф за користувача.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери владельца. Потом выбери, владелец один или их несколько. После этого система вернет тебя к полной фразе.',
        'Режим підказки: спочатку обери власника. Потім обери, власник один чи їх кілька. Після цього система поверне тебе до повної фрази.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_poss_s_001', prompt: tri("В John's phone кто владелец?", "У John's phone хто власник?"), options: ['John', 'phone'], correctIndex: 0, thenReturnToExerciseId: 'poss_s_easy_001' },
      { id: 'guided_poss_s_002', prompt: tri("Friend's car означает машина одного друга или нескольких друзей?", "Friend's car означає машина одного друга чи кількох друзів?"), options: ['одного друга', 'нескольких друзей'], correctIndex: 0, thenReturnToExerciseId: 'poss_s_contrast_001' },
      { id: 'guided_poss_s_003', prompt: tri("Friends' car означает машина одного друга или нескольких друзей?", "Friends' car означає машина одного друга чи кількох друзів?"), options: ['одного друга', 'нескольких друзей'], correctIndex: 1, thenReturnToExerciseId: 'poss_s_contrast_002' },
      { id: 'guided_poss_s_004', prompt: tri('Children уже plural или singular?', 'Children уже plural чи singular?'), options: ['plural', 'singular'], correctIndex: 0, thenReturnToExerciseId: 'poss_s_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'noun',
    microDiagnosisId: 'noun_possessive_apostrophe_s',
    diagnosisLabel: tri("Possessive 's", "Possessive 's"),
    contrastSet: CONTRAST,
    focusWords: ["John's phone", "friend's car", "friends' car", "students' answers", "children's toys", "parents' house"],
    focusPatterns: [
      'singular_owner_name',
      'singular_owner_common_noun',
      'singular_owner_name_bag',
      'friend_singular_possessive',
      'friends_plural_possessive',
      'friend_friend_s_friends_contrast',
      'students_plural_possessive',
      'parents_plural_possessive',
      'teachers_plural_possessive',
      'children_irregular_plural_possessive',
      'men_irregular_plural_possessive',
      'possessive_s_vs_is',
      'mixed_singular_plural_pair',
      'mixed_regular_irregular_plural',
      'mixed_sentence_correction',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_noun_possessive_apostrophe_s_start',
    answer: 'diagnosis_training_noun_possessive_apostrophe_s_answer',
    mastery: 'diagnosis_training_noun_possessive_apostrophe_s_mastery',
    fallback: 'diagnosis_training_noun_possessive_apostrophe_s_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'noun',
      microDiagnosisId: 'noun_possessive_apostrophe_s',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logOwnerNumber: true,
      logApostrophePosition: true,
      logPossessivePattern: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=noun&microDiagnosisId=noun_possessive_apostrophe_s',
  },
  qualityChecklist: {
    hasStableId: true,
    hasCategory: true,
    hasMultilingualTitle: true,
    hasPlainDiagnosisText: true,
    hasMentalModel: true,
    hasContrastSet: true,
    hasAtLeastSixExamples: true,
    hasAtLeastTwelveExercises: true,
    hasEasyContrastMixedStructure: true,
    hasDistractorSpecificFeedback: true,
    hasRetryFeedbackLevels: true,
    hasGuidedModeForRepeatedMistakes: true,
    hasMasteryRules: true,
    hasSmartTrainerConfig: true,
    hasAnalyticsPayload: true,
    hasFallbackRoute: true,
  },
};



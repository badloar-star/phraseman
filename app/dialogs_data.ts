// dialogs_data.ts — New Social Mechanics v3
// CLEARED: Waiting for new dialog scenarios to be added

export type ChoiceStyle = 'textbook' | 'casual' | 'awkward';

export interface DialogChoice3 {
  textEN: string;
  /** Translation shown on card flip back-side */
  textRU?: string;
  textUK?: string;
  style: ChoiceStyle;
  /** For regular steps: absolute social score 0-100. For isFinalStep: delta (e.g. +5, -5) */
  socialScore: number;
  npcEmoji: string;
  impactRU: string;
  impactUK: string;
}

export interface DialogStep3 {
  id: string;
  npcTextEN: string;
  npcTextRU: string;
  npcTextUK: string;
  npcEmojiDefault: string;
  choices: DialogChoice3[];
  /** Last step: socialScore is a delta added to the running average */
  isFinalStep?: boolean;
}

export interface GlossaryEntry {
  phrase: string;
  explanationRU: string;
  explanationUK: string;
  /** Micro-context tip, e.g. "Use this to sound polite" */
  contextRU?: string;
  contextUK?: string;
}

export interface DialogEnding3 {
  minScore: number;
  maxScore: number;
  icon: string;
  titleRU: string;
  titleUK: string;
  storyRU: string;
  storyUK: string;
  xpReward: number;
}

export interface DialogScenario3 {
  id: string;
  titleRU: string;
  titleUK: string;
  emoji: string;
  bgColor: string;
  setting: string;
  premium: boolean;
  roleRU: string;
  roleUK: string;
  goalRU: string;
  goalUK: string;
  /** 1 = very formal, 5 = very casual */
  toneLevel: number;
  toneLabelRU: string;
  toneLabelUK: string;
  npcName: string;
  npcGender: 'm' | 'f';
  npcEmojiDefault: string;
  gameOverEN: string;
  gameOverRU: string;
  gameOverUK: string;
  steps: DialogStep3[];
  glossary: GlossaryEntry[];
  endings: DialogEnding3[];
}

// ============================================
// DIALOG SCENARIOS
// ============================================

export const DIALOGS: DialogScenario3[] = [
  {
    id: 'dinner_001',
    titleRU: 'Ужин в гостях',
    titleUK: 'Вечеря в гостях',
    emoji: '🍽️',
    bgColor: '#3B2A1A',
    setting: 'A Taste of Hospitality — Brighton, Private House',
    premium: false,
    roleRU: 'Вы пришли на ужин к другу. Его сестра Сара встречает вас у двери.',
    roleUK: 'Ви прийшли на вечерю до друга. Його сестра Сара зустрічає вас біля дверей.',
    goalRU: 'Произвести хорошее впечатление',
    goalUK: 'Справити гарне враження',
    toneLevel: 2,
    toneLabelRU: 'Неформально',
    toneLabelUK: 'Неформально',
    npcName: 'Sarah',
    npcGender: 'f',
    npcEmojiDefault: '🙂',
    gameOverEN: "I think I need to check on the kitchen... excuse me.",
    gameOverRU: "Мне кажется, мне нужно проверить кухню... прошу прощения.",
    gameOverUK: "Здається, мені треба перевірити кухню... вибачте.",
    steps: [
      {
        id: 'dinner_001_s1',
        npcTextEN: "I'm so glad you could make it! Please, make yourself at home. Would you like a drink?",
        npcTextRU: "Я так рада, что вы смогли прийти! Пожалуйста, чувствуйте себя как дома. Хотите чего-нибудь выпить?",
        npcTextUK: "Я така рада, що ви змогли прийти! Будь ласка, почувайтеся як вдома. Хочете чогось випити?",
        npcEmojiDefault: '🙂',
        choices: [
          {
            textEN: "Thank you! You have a lovely home. Water is fine for me.",
            textRU: "Спасибо! У вас чудесный дом. Мне подойдёт вода.",
            textUK: "Дякую! У вас чудовий будинок. Мені підійде вода.",
            style: 'casual',
            socialScore: 75,
            npcEmoji: '😊',
            impactRU: "Отличное начало! Сара улыбается.",
            impactUK: "Чудовий початок! Сара усміхається.",
          },
          {
            textEN: "Yes, I am here. Give me some juice if you have it, please.",
            textRU: "Да, я здесь. Дайте мне, пожалуйста, сок, если есть.",
            textUK: "Так, я тут. Дайте мені, будь ласка, сік, якщо є.",
            style: 'textbook',
            socialScore: 55,
            npcEmoji: '🙂',
            impactRU: "Нейтрально. Ничего лишнего.",
            impactUK: "Нейтрально. Нічого зайвого.",
          },
          {
            textEN: "I am late because of the traffic. I will take any alcohol.",
            textRU: "Я опоздал(а) из-за пробок. Возьму любой алкоголь.",
            textUK: "Я спізнився/лась через пробки. Візьму будь-який алкоголь.",
            style: 'awkward',
            socialScore: 18,
            npcEmoji: '😮',
            impactRU: "Сара немного растеряна. Будь осторожнее.",
            impactUK: "Сара трохи розгублена. Будь обережніший.",
          },
        ],
      },
      {
        id: 'dinner_001_s2',
        npcTextEN: "The food is almost ready. I hope you don't mind home-cooked meals. It's a bit experimental!",
        npcTextRU: "Еда почти готова. Надеюсь, вы не против домашней кухни. Это небольшой эксперимент!",
        npcTextUK: "Їжа майже готова. Сподіваюся, ви не проти домашньої кухні. Це невеличкий експеримент!",
        npcEmojiDefault: '😊',
        choices: [
          {
            textEN: "I love trying new things! I'm sure it tastes heavenly.",
            textRU: "Обожаю пробовать новое! Уверен(а), вкус будет божественным.",
            textUK: "Обожнюю куштувати нове! Впевнений/а, смак буде божественним.",
            style: 'casual',
            socialScore: 78,
            npcEmoji: '😄',
            impactRU: "Сара в восторге! Она чувствует вашу искренность.",
            impactUK: "Сара у захваті! Вона відчуває вашу щирість.",
          },
          {
            textEN: "I like home food. I hope it is not very spicy for me.",
            textRU: "Я люблю домашнюю еду. Надеюсь, она не слишком острая для меня.",
            textUK: "Я люблю домашню їжу. Сподіваюся, вона не занадто гостра для мене.",
            style: 'textbook',
            socialScore: 57,
            npcEmoji: '😊',
            impactRU: "Сара кивает. Всё в порядке.",
            impactUK: "Сара киває. Все гаразд.",
          },
          {
            textEN: "I usually eat in restaurants. I hope I will like your cooking.",
            textRU: "Я обычно ем в ресторанах. Надеюсь, мне понравится ваша стряпня.",
            textUK: "Я зазвичай їм у ресторанах. Сподіваюся, мені сподобається ваше куховарство.",
            style: 'awkward',
            socialScore: 20,
            npcEmoji: '😬',
            impactRU: "Немного неловко. Сара старается не показывать вид.",
            impactUK: "Трохи незручно. Сара намагається не показувати вигляду.",
          },
        ],
      },
      {
        id: 'dinner_001_s3',
        npcTextEN: "You have a healthy appetite! Would you like a second helping of the main dish?",
        npcTextRU: "У вас здоровый аппетит! Хотите добавку основного блюда?",
        npcTextUK: "У вас здоровий апетит! Бажаєте добавку основної страви?",
        npcEmojiDefault: '😄',
        isFinalStep: true,
        choices: [
          {
            textEN: "It's so yummy, I can't resist! Just a small portion, please.",
            textRU: "Это так вкусно, не могу устоять! Только маленькую порцию, пожалуйста.",
            textUK: "Це так смачно, не можу встояти! Тільки маленьку порцію, будь ласка.",
            style: 'casual',
            socialScore: 12,
            npcEmoji: '😄',
            impactRU: "Сара сияет! Лучший комплимент повару — попросить добавку.",
            impactUK: "Сара сяє! Найкращий комплімент кухарю — попросити добавку.",
          },
          {
            textEN: "Yes, I want more. Please give me one more plate of this food.",
            textRU: "Да, я хочу ещё. Пожалуйста, дайте мне ещё одну тарелку этой еды.",
            textUK: "Так, я хочу ще. Будь ласка, дайте мені ще одну тарілку цієї їжі.",
            style: 'textbook',
            socialScore: 3,
            npcEmoji: '😊',
            impactRU: "Вежливо, но немного скованно. Сара довольна.",
            impactUK: "Ввічливо, але трохи скуто. Сара задоволена.",
          },
          {
            textEN: "I am very full. My stomach hurts a bit. No more food, thanks.",
            textRU: "Я очень объелся(ась). У меня немного болит живот. Больше не надо, спасибо.",
            textUK: "Я дуже об'ївся/лась. У мене трохи болить живіт. Більше не треба, дякую.",
            style: 'awkward',
            socialScore: -10,
            npcEmoji: '😬',
            impactRU: "Жалобы на самочувствие за столом — табу в британском этикете.",
            impactUK: "Скарги на самопочуття за столом — табу в британському етикеті.",
          },
        ],
      },
    ],
    glossary: [
      {
        phrase: 'make it',
        explanationRU: 'смочь прийти / выбраться (на событие)',
        explanationUK: 'змогти прийти / вибратися (на подію)',
        contextRU: 'Используется, когда кто-то добрался на мероприятие несмотря на дела',
        contextUK: 'Використовується, коли хтось дістався на захід попри справи',
      },
      {
        phrase: 'make yourself at home',
        explanationRU: 'чувствуйте себя как дома',
        explanationUK: 'почувайтеся як вдома',
        contextRU: 'Стандартная фраза вежливости хозяина — предложи гостю расслабиться',
        contextUK: 'Стандартна фраза ввічливості господаря — запроси гостя розслабитись',
      },
      {
        phrase: 'home-cooked',
        explanationRU: 'домашней кухни (приготовленное дома)',
        explanationUK: 'домашня кухня (приготовлене вдома)',
        contextRU: 'Противоположность ресторанной или фастфуд-еде',
        contextUK: 'Протилежність ресторанній їжі або фастфуду',
      },
      {
        phrase: 'experimental',
        explanationRU: 'экспериментальный / необычный',
        explanationUK: 'незвичний / експериментальний',
        contextRU: 'В контексте еды: «я пробую новый рецепт, не судите строго»',
        contextUK: 'В контексті їжі: «я пробую новий рецепт, не судіть суворо»',
      },
      {
        phrase: 'heavenly',
        explanationRU: 'божественный (очень вкусный)',
        explanationUK: 'божественний (дуже смачний)',
        contextRU: 'Очень сильный эмоциональный комплимент — сильнее чем «delicious»',
        contextUK: 'Дуже сильний емоційний комплімент — сильніше ніж «delicious»',
      },
      {
        phrase: 'healthy appetite',
        explanationRU: 'хороший аппетит',
        explanationUK: 'гарний апетит',
        contextRU: 'Вежливый способ заметить, что гостю нравится еда и он ест с удовольствием',
        contextUK: 'Ввічливий спосіб зауважити, що гостю подобається їжа і він їсть із задоволенням',
      },
      {
        phrase: 'second helping',
        explanationRU: 'добавка (вторая порция)',
        explanationUK: 'добавка (друга порція)',
        contextRU: 'Попросить добавку — высший комплимент хозяйке в британской традиции',
        contextUK: 'Попросити добавку — найвищий комплімент господині у британській традиції',
      },
      {
        phrase: 'yummy',
        explanationRU: 'вкуснятина / очень вкусно',
        explanationUK: 'смакота / дуже смачно',
        contextRU: 'Простое и тёплое слово для похвалы еды — звучит искренне и дружелюбно',
        contextUK: 'Просте й тепле слово для похвали їжі — звучить щиро та дружньо',
      },
      {
        phrase: 'resist',
        explanationRU: 'устоять / удержаться',
        explanationUK: 'втриматися / відмовитись',
        contextRU: '«I can\'t resist» — когда что-то настолько вкусно, что нельзя отказаться',
        contextUK: '«I can\'t resist» — коли щось настільки смачне, що неможливо відмовитись',
      },
    ],
    endings: [
      {
        minScore: 70,
        maxScore: 100,
        icon: '🌟',
        titleRU: 'The Perfect Guest',
        titleUK: 'The Perfect Guest',
        storyRU: "Тебя официально признали «своим». Сара в восторге от твоей открытости — ты похвалил её готовку (heavenly!), попросил добавку и вёл себя естественно. Перед уходом она даёт тебе рецепт того самого «экспериментального» блюда и приглашает на воскресный бранч с семьёй.",
        storyUK: "Тебе офіційно визнали «своїм». Сара в захваті від твоєї відкритості — ти похвалив її готовку (heavenly!), попросив добавку і поводився природно. Перед відходом вона дає тобі рецепт тієї самої «експериментальної» страви і запрошує на недільний бранч із сім'єю.",
        xpReward: 50,
      },
      {
        minScore: 40,
        maxScore: 69,
        icon: '🙂',
        titleRU: 'The Polite Stranger',
        titleUK: 'The Polite Stranger',
        storyRU: "Ужин прошёл без происшествий, но без тепла. Ты был очень вежлив, но твои фразы звучали как выдержки из словаря. Сара оценила старание, но чувствовала лёгкую дистанцию. Вы обменялись формальными прощаниями. Совет: не бойся эмоционально окрашенных слов — yummy, lovely, heavenly. Они делают тебя «живым» в глазах носителя.",
        storyUK: "Вечеря пройшла без інцидентів, але без тепла. Ти був дуже ввічливий, але твої фрази звучали як виписки зі словника. Сара оцінила старання, але відчувала легку дистанцію. Ви обмінялися формальними прощаннями. Порада: не бійся емоційно забарвлених слів — yummy, lovely, heavenly. Вони роблять тебе «живим» в очах носія.",
        xpReward: 25,
      },
      {
        minScore: 0,
        maxScore: 39,
        icon: '😬',
        titleRU: 'The Social Disaster',
        titleUK: 'The Social Disaster',
        storyRU: "Вечер закончился слишком быстро. Твоё опоздание и жалобы на боль в животе создали напряжённую обстановку. Прямолинейность насчёт ресторанов прозвучала как скрытое оскорбление кулинарных талантов Сары. Она сослалась на головную боль и закончила ужин через 40 минут. Запомни: личные жалобы на здоровье и сравнение домашней еды с ресторанами — табу в британском этикете.",
        storyUK: "Вечір закінчився занадто швидко. Твоє запізнення та скарги на біль у животі створили напружену атмосферу. Прямолінійність щодо ресторанів прозвучала як прихована образа кулінарних талантів Сари. Вона послалася на головний біль і закінчила вечерю через 40 хвилин. Запам'ятай: особисті скарги на здоров'я і порівняння домашньої їжі з ресторанами — табу в британському етикеті.",
        xpReward: 5,
      },
    ],
  },
];

export function getDialogById(id: string): DialogScenario3 | undefined {
  return DIALOGS.find(d => d.id === id);
}

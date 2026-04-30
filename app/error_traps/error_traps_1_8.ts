// app/error_traps/error_traps_1_8.ts
// Per-word система подсказок — Уроки 1-8
// УРОК 1: 51 фраза с To Be (базовый уровень)

import type { PhraseErrorTraps, LessonErrorTrapsMap } from '../types/feedback';

// ══════════════════════════════════════════════════════════════
// УРОК 1: To Be + Профессии и прилагательные (51 фраза)
// ══════════════════════════════════════════════════════════════

const L1_TRAPS: readonly PhraseErrorTraps[] = [
  // 0: "I am a teacher"
  {
    phraseIndex: 0,
    wordTraps: [],
    generalRule: 'С «I» всегда идет am, а перед профессией — a. Представьте, что am — это знак «=». Без него вы не «есть» учитель, вы просто два случайных слова.',
    generalRule_UA: 'З «I» завжди йде am, а перед професією — a. Уявіть, що am — це знак «=». Без нього ви не «є» вчителем, ви просто два випадкових слова.',
    traps: []
  },
  // 1: "He is a doctor"
  {
    phraseIndex: 1,
    wordTraps: [],
    generalRule: 'Для «Он/Она» мостик меняется на is. Is — это клей для единственного числа. Он намертво приклеивает доктора к «нему».',
    generalRule_UA: 'Для «Він/Вона» місток змінюється на is. Is — це клей для однини. Він намертво приклеює лікаря до «нього».',
    traps: []
  },
  // 2: "She is a manager"
  {
    phraseIndex: 2,
    wordTraps: [],
    generalRule: 'Схема та же: She + is + a. Английское предложение — это поезд. She — тепловоз, is — уголь. Без угля не поедем!',
    generalRule_UA: 'Схема та сама: She + is + a. Англійське речення — це потяг. She — тепловоз, is — вугілля. Без вугілля не поїдемо!',
    traps: []
  },
  // 3: "We are students"
  {
    phraseIndex: 3,
    wordTraps: [],
    generalRule: 'Нас много — берем are и добавляем -s в конце. Артикль a (один) убегает, когда видит толпу студентов. Его заменяет -s.',
    generalRule_UA: 'Нас багато — беремо are і додаємо -s в кінці. Артикль a (один) тікає, коли бачить натовп студентів. Його замінює -s.',
    traps: []
  },
  // 4: "They are colleagues"
  {
    phraseIndex: 4,
    wordTraps: [],
    generalRule: 'Для «They» тоже используем are + -s. Слово «коллеги» длинное, но правило простое: много людей = are.',
    generalRule_UA: 'Для «They» теж використовуємо are + -s. Слово «колеги» довге, але правило просте: багато людей = are.',
    traps: []
  },
  // 5: "I am young"
  {
    phraseIndex: 5,
    wordTraps: [],
    generalRule: 'Описание («какой?») не требует артикля a. Вы не можете быть «одним молодым» в штуках. Качества артиклей не боятся.',
    generalRule_UA: 'Опис («який?») не потребує артикля a. Ви не можете бути «одним молодим» у штуках. Якості артиклів не бояться.',
    traps: []
  },
  // 6: "He is tall"
  {
    phraseIndex: 6,
    wordTraps: [],
    generalRule: 'Просто He + is + описание. Слово tall универсально — оно не меняет окончание для мальчиков и девочек.',
    generalRule_UA: 'Просто He + is + опис. Слово tall універсальне — воно не змінює закінчення для хлопчиків та дівчаток.',
    traps: []
  },
  // 7: "She is smart"
  {
    phraseIndex: 7,
    wordTraps: [],
    generalRule: 'She + is + описание. В английском «умный» и «умная» — это одно и то же слово. Красота!',
    generalRule_UA: 'She + is + опис. В англійській мові «розумний» і «розумна» — це одне й те саме слово. Краса!',
    traps: []
  },
  // 8: "We are ready"
  {
    phraseIndex: 8,
    wordTraps: [],
    generalRule: 'Для «Мы» — are, но описание ready без -s. Состояние (готовность) не множится. Мы все «ready» в одном общем смысле.',
    generalRule_UA: 'Для «Ми» — are, але опис ready без -s. Стан (готовність) не множиться. Ми всі «ready» в одному загальному сенсі.',
    traps: []
  },
  // 9: "They are at home"
  {
    phraseIndex: 9,
    wordTraps: [],
    generalRule: 'Указываем место: They + are + предлог at. Предлог at — это как точка GPS, приколовшая их к дому.',
    generalRule_UA: 'Вказуємо місце: They + are + прийменник at. Прийменник at — це як точка GPS, що приколола їх до будинку.',
    traps: []
  },
  // 10: "I am a programmer"
  {
    phraseIndex: 10,
    wordTraps: [],
    generalRule: 'С «I» всегда идет am, а перед профессией — a. Даже если вы крутой кодер, в английском вы сначала «есть» (am), а потом уже «один программист» (a).',
    generalRule_UA: 'З «I» завжди йде am, а перед професією — a. Навіть якщо ви крутий кодер, в англійській ви спочатку «є» (am), а потім уже «один програміст» (a).',
    traps: []
  },
  // 11: "He is a lawyer"
  {
    phraseIndex: 11,
    wordTraps: [],
    generalRule: 'Для «He» мостик — is. Не забудьте артикль a. Юристы любят законы, а закон английского гласит: «Нет связки is — нет предложения».',
    generalRule_UA: 'Для «He» місток — is. Не забудьте артикль a. Юристи люблять закони, а закон англійської каже: «Немає зв\'язки is — немає речення».',
    traps: []
  },
  // 12: "She is an engineer"
  {
    phraseIndex: 12,
    wordTraps: [],
    generalRule: 'Перед гласной «e» артикль a превращается в an. Попробуйте сказать «a engineer» — язык запнется. An нужен для скорости и красоты.',
    generalRule_UA: 'Перед голосною «e» артикль a перетворюється на an. Спробуйте сказати «a engineer» — язик запнеться. An потрібен для швидкості та краси.',
    traps: []
  },
  // 13: "We are partners"
  {
    phraseIndex: 13,
    wordTraps: [],
    generalRule: 'Нас много — берем are и добавляем -s в конце. Are — это мостик для компании. Если вас двое и больше, забудьте про «а» и шипите в конце: -s.',
    generalRule_UA: 'Нас багато — беремо are і додаємо -s в кінці. Are — це місток для компанії. Якщо вас двоє і більше, забудьте про «а» і шипіть у кінці: -s.',
    traps: []
  },
  // 14: "They are drivers"
  {
    phraseIndex: 14,
    wordTraps: [],
    generalRule: 'Для «They» тоже используем are + -s. Водители едят в одном автобусе под названием are, а -s на конце — это их багаж.',
    generalRule_UA: 'Для «They» теж використовуємо are + -s. Водії їдять в одному автобусі під назвою are, а -s наприкінці — це їхній багаж.',
    traps: []
  },
  // 15: "I am free"
  {
    phraseIndex: 15,
    wordTraps: [],
    generalRule: 'Качество («какой?») не требует артикля a. Вы свободны от артиклей! Если это описание состояния, просто ставьте am.',
    generalRule_UA: 'Якість («який?») не потребує артикля a. Ви вільні від артиклів! Якщо це опис стану, просто ставте am.',
    traps: []
  },
  // 16: "She is very smart"
  {
    phraseIndex: 16,
    wordTraps: [],
    generalRule: 'Усилитель very ставится прямо перед качеством. Very — это специя. Сначала «кто есть», а потом «насколько умная».',
    generalRule_UA: 'Підсилювач very ставиться прямо перед якістю. Very — це спеція. Спочатку «хто є», а потім «наскільки розумна».',
    traps: []
  },
  // 17: "We are very tired"
  {
    phraseIndex: 17,
    wordTraps: [],
    generalRule: 'Усталость в английском — это качество (какие?), а не глагол. Неважно, как сильно вы устали, are никуда не денется.',
    generalRule_UA: 'Втома в англійській — це якість (які?), а не дієслово. Неважливо, як сильно ви втомилися, are нікуди не дінеться.',
    traps: []
  },
  // 18: "They are very tall"
  {
    phraseIndex: 18,
    wordTraps: [],
    generalRule: 'Для «Они» берем are, но слово tall не меняется. Описания в английском очень ленивые — они не добавляют -s, даже если речь о великанах.',
    generalRule_UA: 'Для «Вони» беремо are, але слово tall не змінюється. Описи в англійській дуже ліниві — вони не додають -s, навіть якщо мова про велетнів.',
    traps: []
  },
  // 19: "It is easy"
  {
    phraseIndex: 19,
    wordTraps: [],
    generalRule: 'Для предметов и ситуаций используем It is. В английском «что-то» всегда должно «быть». It is — это универсальный старт для любой оценки.',
    generalRule_UA: 'Для предметів та ситуацій використовуємо It is. В англійській «щось» завжди має «бути». It is — це універсальний старт для будь-якої оцінки.',
    traps: []
  },
  // 20: "It is hard"
  {
    phraseIndex: 20,
    wordTraps: [],
    generalRule: 'Для «Это» всегда используем связку is. В английском нельзя просто сказать «Сложно». Нужно обязательно добавить «Оно есть» (It is).',
    generalRule_UA: 'Для «Це» завжди використовуємо зв\'язку is. В англійській не можна просто сказати «Складно». Треба обов\'язково додати «Воно є» (It is).',
    traps: []
  },
  // 21: "It is a new phone"
  {
    phraseIndex: 21,
    wordTraps: [],
    generalRule: 'Предмет один, поэтому ставим is a. Артикль a всегда стоит перед описанием (new), а не перед самим предметом.',
    generalRule_UA: 'Предмет один, тому ставимо is a. Артикль a завжди стоїть перед описом (new), а не перед самим предметом.',
    traps: []
  },
  // 22: "He is my new manager"
  {
    phraseIndex: 22,
    wordTraps: [],
    generalRule: 'Если появилось слово «мой» (my), артикль a позорно убегает. Слова-владельцы (мой, твой) — очень ревнивые, они не терпят артиклей рядом с собой.',
    generalRule_UA: 'Якщо з\'явилося слово «мій» (my), артикль a ганебно тікає. Слова-власники (мій, твій) — дуже ревниві, вони не терплять артиклі поруч із собою.',
    traps: []
  },
  // 23: "I am very busy"
  {
    phraseIndex: 23,
    wordTraps: [],
    generalRule: 'Используем am для себя и very для усиления. Даже если вы на пике занятости, не забудьте про am — без него вы просто «очень занятость».',
    generalRule_UA: 'Використовуємо am для себе та very для посилення. Навіть якщо ви на піку зайнятості, не забудьте про am — без нього ви просто «дуже зайнятість».',
    traps: []
  },
  // 24: "He is a civil engineer"
  {
    phraseIndex: 24,
    wordTraps: [],
    generalRule: 'Длинная профессия? Артикль a всё равно ставится в самое начало. Артикль — это как заголовок для всей группы слов «гражданский инженер».',
    generalRule_UA: 'Довга професія? Артикль a все одно ставиться на самий початок. Артикль — це як заголовок для всієї групи слів «цивільний інженер».',
    traps: []
  },
  // 25: "It is an important meeting"
  {
    phraseIndex: 25,
    wordTraps: [],
    generalRule: 'Слово «important» начинается на гласную, поэтому берем an. Гласные любят компанию согласных. An помогает фразе звучать мелодично.',
    generalRule_UA: 'Слово «important» починається на голосну, тому беремо an. Голосні люблять компанію приголосних. An допомагає фразі звучати мелодійно.',
    traps: []
  },
  // 26: "She is a surgeon"
  {
    phraseIndex: 26,
    wordTraps: [],
    generalRule: 'Для «She» неизменно используем is + a. В английском у профессий нет женского рода (кроме редких исключений), так что surgeon подходит всем.',
    generalRule_UA: 'Для «She» незмінно використовуємо is + a. В англійській у професій немає жіночого роду (крім рідкісних винятків), тож surgeon підходить усім.',
    traps: []
  },
  // 27: "They are our new clients"
  {
    phraseIndex: 27,
    wordTraps: [],
    generalRule: '«Они» (They) требуют are, а слово «наши» (our) убирает артикль. Клиентов много, поэтому в конце слова обязательно вешаем колокольчик — букву -s.',
    generalRule_UA: '«Вони» (They) вимагають are, а слово «наші» (our) прибирає артикль. Клієнтів багато, тому в кінці слова обов\'язково вішаємо дзвіночок — букву -s.',
    traps: []
  },
  // 28: "I am an accountant"
  {
    phraseIndex: 28,
    wordTraps: [],
    generalRule: 'Опять гласная в начале (a) — значит, используем an. Бухгалтеры любят счета, а английский любит порядок: I + am + an + Job.',
    generalRule_UA: 'Знову голосна на початку (a) — значить, використовуємо an. Бухгалтери люблять рахунки, а англійська любить порядок: I + am + an + Job.',
    traps: []
  },
  // 29: "He is a dentist"
  {
    phraseIndex: 29,
    wordTraps: [],
    generalRule: 'Простая связка He + is. Даже если вы боитесь стоматологов, артикль a перед ними ставить придётся!',
    generalRule_UA: 'Проста зв\'язка He + is. Навіть якщо ви боїтеся стоматологів, артикль a перед ними ставити доведеться!',
    traps: []
  },
  // 30: "She is a consultant"
  {
    phraseIndex: 30,
    wordTraps: [],
    generalRule: 'Для «She» неизменно берем is + a. В английском «консультант» не меняет окончание для женщин. Consultant — слово универсальное.',
    generalRule_UA: 'Для «She» незмінно беремо is + a. В англійській «консультант» не змінює закінчення для жінок. Consultant — слово універсальне.',
    traps: []
  },
  // 31: "We are neighbours"
  {
    phraseIndex: 31,
    wordTraps: [],
    generalRule: 'Нас много — берем are и добавляем -s в конце. Артикль a (один) тут лишний, ведь соседа как минимум два.',
    generalRule_UA: 'Нас багато — беремо are і додаємо -s в кінці. Артикль a (один) тут зайвий, адже сусідів як мінімум двоє.',
    traps: []
  },
  // 32: "They are parents"
  {
    phraseIndex: 32,
    wordTraps: [],
    generalRule: 'Для «They» (Они) тоже используем are + -s. Родители — это всегда пара или группа, поэтому буква s в конце обязательна.',
    generalRule_UA: 'Для «They» (Вони) теж використовуємо are + -s. Батьки — це завжди пара або група, тому буква s в кінці обов\'язкова.',
    traps: []
  },
  // 33: "It is the right answer"
  {
    phraseIndex: 33,
    wordTraps: [],
    generalRule: 'Используем the, потому что ответ конкретный (правильный). Если ответ один-единственный верный, артикль a меняется на «королевский» the.',
    generalRule_UA: 'Використовуємо the, бо відповідь конкретна (правильна). Якщо відповідь одна-єдина вірна, артикль a змінюється на «королівський» the.',
    traps: []
  },
  // 34: "He is my partner"
  {
    phraseIndex: 34,
    wordTraps: [],
    generalRule: 'Слово «мой» (my) заменяет собой любые артиклей. Нельзя сказать «my a partner». Либо он чей-то (my), либо просто какой-то (a).',
    generalRule_UA: 'Слово «мій» (my) замінює собою будь-які артиклі. Не можна сказати «my a partner». Або він чийсь (my), або просто якийсь (a).',
    traps: []
  },
  // 35: "She is my colleague"
  {
    phraseIndex: 35,
    wordTraps: [],
    generalRule: 'Схема та же: is + my + профессия/статус. Коллега может быть мужчиной или женщиной, слово colleague не меняется.',
    generalRule_UA: 'Схема та сама: is + my + професія/статус. Колега може бути чоловіком або жінкою, слово colleague не змінюється.',
    traps: []
  },
  // 36: "We are your neighbours"
  {
    phraseIndex: 36,
    wordTraps: [],
    generalRule: 'Для «Мы» — are, а «ваши» (your) убирает артиклей. Не забудьте -s в конце слова neighbours, ведь вас много!',
    generalRule_UA: 'Для «Ми» — are, а «ваші» (your) прибирає артиклі. Не забудьте -s у кінці слова neighbours, адже вас багато!',
    traps: []
  },
  // 37: "He is a very good doctor"
  {
    phraseIndex: 37,
    wordTraps: [],
    generalRule: 'Артикль a ставится в самое начало всей связки. Сначала артикль, потом «очень хороший», и только потом «врач».',
    generalRule_UA: 'Артикль a ставиться на самий початок усієї зв\'язки. Спочатку артикль, потім «дуже хороший», і тільки потім «лікар».',
    traps: []
  },
  // 38: "She is a very experienced engineer"
  {
    phraseIndex: 38,
    wordTraps: [],
    generalRule: 'Хотя «experienced» начинается на гласную, мы ставим a, так как первым идет «very». Артикль дружит с тем словом, которое идет сразу за ним.',
    generalRule_UA: 'Хоча «experienced» починається на голосну, ми ставимо a, бо першим йде «very». Артикль дружить із тим словом, яке йде одразу за ним.',
    traps: []
  },
  // 39: "It is a new project"
  {
    phraseIndex: 39,
    wordTraps: [],
    generalRule: 'It is + a + описание + предмет. Каждому новому проекту в английском положен свой артикль a.',
    generalRule_UA: 'It is + a + опис + предмет. Кожному новому проекту в англійській мові належить свій артикль a.',
    traps: []
  },
  // 40: "It is a beautiful city"
  {
    phraseIndex: 40,
    wordTraps: [],
    generalRule: 'Предмет один, поэтому используем связку is a. Артикль a ставится перед «beautiful». Сначала оценка, потом сам город.',
    generalRule_UA: 'Предмет один, тому використовуємо зв\'язку is a. Артикль a ставиться перед «beautiful». Спочатку оцінка, потім саме місто.',
    traps: []
  },
  // 41: "He is from London"
  {
    phraseIndex: 41,
    wordTraps: [],
    generalRule: 'Чтобы сказать «из», используем связку is from. Перед городами артикль a не нужен. Лондон один, мы и так знаем, о чем речь.',
    generalRule_UA: 'Щоб сказати «з», використовуємо зв\'язку is from. Перед містами артикль a не потрібен. Лондон один, ми і так знаємо, про що йде мова.',
    traps: []
  },
  // 42: "She is from Berlin"
  {
    phraseIndex: 42,
    wordTraps: [],
    generalRule: 'Схема та же: is from + название города. Глагол is — это обязательный «паспортный контроль» перед упоминанием родины.',
    generalRule_UA: 'Схема та сама: is from + назва міста. Дієслово is — це обов\'язковий «паспортний контроль» перед згадкою батьківщини.',
    traps: []
  },
  // 43: "We are from Canada"
  {
    phraseIndex: 43,
    wordTraps: [],
    generalRule: 'Нас много, поэтому мостик меняется на are. Перед странами артиклей тоже не ставим. Просто from + название.',
    generalRule_UA: 'Нас багато, тому місток змінюється на are. Перед країнами артиклі теж не ставимо. Просто from + назва.',
    traps: []
  },
  // 44: "It is my favourite book"
  {
    phraseIndex: 44,
    wordTraps: [],
    generalRule: 'Слово «моя» (my) вытесняет артикль a. Если вещь «любимая», она уже особенная. Достаточно слова my, чтобы это подчеркнуть.',
    generalRule_UA: 'Слово «моя» (my) витісняє артикль a. Якщо річ «улюблена», вона вже особлива. Достатньо слова my, щоб це підкреслити.',
    traps: []
  },
  // 45: "He is such a busy person"
  {
    phraseIndex: 45,
    wordTraps: [],
    generalRule: 'Усилитель «такой» (such) требует после себя артикль a. В связке «такой + предмет» артикль a зажат посередине: such + a + busy person.',
    generalRule_UA: 'Підсилювач «такий» (such) вимагає після себе артикль a. У зв\'язці «такий + предмет» артикль a затиснутий посередині: such + a + busy person.',
    traps: []
  },
  // 46: "She is so kind"
  {
    phraseIndex: 46,
    wordTraps: [],
    generalRule: 'Если после «такой» нет существительного (человек, город), используем so. So — для чувств и качеств, Such a — для людей и вещей.',
    generalRule_UA: 'Якщо після «така» немає іменника (людина, місто), використовуємо so. So — для почуттів та якостей, Such a — для людей та речей.',
    traps: []
  },
  // 47: "We are a young team"
  {
    phraseIndex: 47,
    wordTraps: [],
    generalRule: 'Мы — это are, но команда одна, поэтому ставим a. Хотя «нас» много, слово «команда» — это один коллектив. Поэтому a team.',
    generalRule_UA: 'Ми — це are, але команда одна, тому ставимо a. Хоча «нас» багато, слово «команда» — це один колектив. Тому a team.',
    traps: []
  },
  // 48: "They are experienced specialists"
  {
    phraseIndex: 48,
    wordTraps: [],
    generalRule: 'Для «Они» берем are и добавляем -s в конце. Специалистов много, поэтому артикль a (один) исчезает.',
    generalRule_UA: 'Для «Вони» беремо are і додаємо -s в кінці. Фахівців багато, тому артикль a (один) зникає.',
    traps: []
  },
  // 49: "I am a senior analyst"
  {
    phraseIndex: 49,
    wordTraps: [],
    generalRule: 'Стандартная формула: I + am + a + должность. Даже если ваша должность звучит солидно, вы всё равно «один из» (a) в компании.',
    generalRule_UA: 'Стандартна формула: I + am + a + посада. Навіть якщо ваша посада звучить солідно, ви все одно «один із» (a) в компанії.',
    traps: []
  },
];

// ══════════════════════════════════════════════════════════════
// УРОК 2: To Be + Отрицания и вопросы (51 фраза)
// ══════════════════════════════════════════════════════════════

const L2_TRAPS: readonly PhraseErrorTraps[] = [
  // 0: "I am not tired" → [i, am, not, tired]
  {
    phraseIndex: 0,
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" глагол "to be" только "am": I am not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после глагола "am": am not.' },
    ],
    generalRule: 'I + am + not + прилагательное.',
    traps: []
  },
  // 1: "He is not busy" → [he, is, not, busy]
  {
    phraseIndex: 1,
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" глагол только "is": He is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'He + is + not + прилагательное.',
    traps: []
  },
  // 2: "She is not ready" → [she, is, not, ready]
  {
    phraseIndex: 2,
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" только "is": She is not.' },
      { wordIndex: 2, hint: 'Отрицание "not" идёт после "is": is not.' },
    ],
    generalRule: 'She + is + not + прилагательное.',
    traps: []
  },
  // 3: "We are not at home" → [we, are, not, at, home]
  {
    phraseIndex: 3,
    wordTraps: [
      { wordIndex: 1, hint: 'С "We" только "are": We are not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "are": are not.' },
    ],
    generalRule: 'We + are + not + место.',
    traps: []
  },
  // 4: "They are not students" → [they, are, not, students]
  {
    phraseIndex: 4,
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" только "are": They are not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "are": are not.' },
    ],
    generalRule: 'They + are + not + существительное (мн.ч.).',
    traps: []
  },
  // 5: "Are you a doctor?" → [are, you, a, doctor]
  {
    phraseIndex: 5,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос начинается с "Are": Are you...?' },
      { wordIndex: 2, hint: 'Артикль "a" перед согласной: a doctor.' },
    ],
    generalRule: 'Are + you + a + профессия?',
    traps: []
  },
  // 6: "Is he a teacher?" → [is, he, a, teacher]
  {
    phraseIndex: 6,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос начинается с "Is": Is he...?' },
      { wordIndex: 2, hint: 'Артикль "a": a teacher.' },
    ],
    generalRule: 'Is + he + a + профессия?',
    traps: []
  },
  // 7: "Is she ready?" → [is, she, ready]
  {
    phraseIndex: 7,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос начинается с "Is": Is she...?' },
    ],
    generalRule: 'Is + she + прилагательное?',
    traps: []
  },
  // 8: "Are you colleagues?" → [are, you, colleagues]
  {
    phraseIndex: 8,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с "you" начинается с "Are": Are you...?' },
    ],
    generalRule: 'Are + you + существительное?',
    traps: []
  },
  // 9: "Are they at home?" → [are, they, at, home]
  {
    phraseIndex: 9,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с "they" начинается с "Are": Are they...?' },
      { wordIndex: 2, hint: 'Предлог "at" для местоположения: at home.' },
    ],
    generalRule: 'Are + they + at + место?',
    traps: []
  },
  // 10: "Yes I am a doctor" → [yes, i, am, a, doctor]
  {
    phraseIndex: 10,
    wordTraps: [
      { wordIndex: 2, hint: 'С "I" глагол только "am": I am.' },
      { wordIndex: 3, hint: 'Артикль "a": a doctor.' },
    ],
    generalRule: 'Yes + I + am + a + профессия.',
    traps: []
  },
  // 11: "No he is not busy" → [no, he, is, not, busy]
  {
    phraseIndex: 11,
    wordTraps: [
      { wordIndex: 2, hint: 'С "He" только "is": He is.' },
      { wordIndex: 3, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'No + he + is + not + прилагательное.',
    traps: []
  },
  // 12: "Yes she is smart" → [yes, she, is, smart]
  {
    phraseIndex: 12,
    wordTraps: [
      { wordIndex: 2, hint: 'С "She" только "is": She is.' },
    ],
    generalRule: 'Yes + she + is + прилагательное.',
    traps: []
  },
  // 13: "No we are not ready" → [no, we, are, not, ready]
  {
    phraseIndex: 13,
    wordTraps: [
      { wordIndex: 2, hint: 'С "We" только "are": We are.' },
      { wordIndex: 3, hint: 'Отрицание идёт после "are": are not.' },
    ],
    generalRule: 'No + we + are + not + прилагательное.',
    traps: []
  },
  // 14: "He is not young" → [he, is, not, young]
  {
    phraseIndex: 14,
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" только "is": He is not.' },
      { wordIndex: 2, hint: 'Отрицание "not" идёт после "is": is not.' },
    ],
    generalRule: 'He + is + not + прилагательное.',
    traps: []
  },
  // 15: "She is not old" → [she, is, not, old]
  {
    phraseIndex: 15,
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" только "is": She is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'She + is + not + прилагательное.',
    traps: []
  },
  // 16: "We are not right" → [we, are, not, right]
  {
    phraseIndex: 16,
    wordTraps: [
      { wordIndex: 1, hint: 'С "We" только "are": We are not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "are": are not.' },
    ],
    generalRule: 'We + are + not + прилагательное.',
    traps: []
  },
  // 17: "They are not free" → [they, are, not, free]
  {
    phraseIndex: 17,
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" только "are": They are not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "are": are not.' },
    ],
    generalRule: 'They + are + not + прилагательное.',
    traps: []
  },
  // 18: "Are you free?" → [are, you, free]
  {
    phraseIndex: 18,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с "you" начинается с "Are": Are you...?' },
    ],
    generalRule: 'Are + you + прилагательное?',
    traps: []
  },
  // 19: "Is she a programmer?" → [is, she, a, programmer]
  {
    phraseIndex: 19,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с "she" начинается с "Is": Is she...?' },
      { wordIndex: 2, hint: 'Артикль "a": a programmer.' },
    ],
    generalRule: 'Is + she + a + профессия?',
    traps: []
  },
  // 20: "It is not hard" → [it, is, not, hard]
  {
    phraseIndex: 20,
    wordTraps: [
      { wordIndex: 1, hint: 'С "It" только "is": It is not.' },
      { wordIndex: 2, hint: 'Отрицание "not" идёт после "is": is not.' },
    ],
    generalRule: 'It + is + not + прилагательное.',
    traps: []
  },
  // 21: "It is not new" → [it, is, not, new]
  {
    phraseIndex: 21,
    wordTraps: [
      { wordIndex: 1, hint: 'С "It" только "is": It is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'It + is + not + прилагательное.',
    traps: []
  },
  // 22: "Are you tired?" → [are, you, tired]
  {
    phraseIndex: 22,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с "you" начинается с "Are": Are you...?' },
    ],
    generalRule: 'Are + you + прилагательное?',
    traps: []
  },
  // 23: "I am not a dentist" → [i, am, not, a, dentist]
  {
    phraseIndex: 23,
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" только "am": I am not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "am": am not.' },
      { wordIndex: 3, hint: 'Артикль "a": a dentist.' },
    ],
    generalRule: 'I + am + not + a + профессия.',
    traps: []
  },
  // 24: "He is not a manager" → [he, is, not, a, manager]
  {
    phraseIndex: 24,
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" только "is": He is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
      { wordIndex: 3, hint: 'Артикль "a": a manager.' },
    ],
    generalRule: 'He + is + not + a + профессия.',
    traps: []
  },
  // 25: "She is not a driver" → [she, is, not, a, driver]
  {
    phraseIndex: 25,
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" только "is": She is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
      { wordIndex: 3, hint: 'Артикль "a": a driver.' },
    ],
    generalRule: 'She + is + not + a + профессия.',
    traps: []
  },
  // 26: "We are not neighbours" → [we, are, not, neighbours]
  {
    phraseIndex: 26,
    wordTraps: [
      { wordIndex: 1, hint: 'С "We" только "are": We are not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "are": are not.' },
    ],
    generalRule: 'We + are + not + существительное (мн.ч.).',
    traps: []
  },
  // 27: "They are not partners" → [they, are, not, partners]
  {
    phraseIndex: 27,
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" только "are": They are not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "are": are not.' },
    ],
    generalRule: 'They + are + not + существительное (мн.ч.).',
    traps: []
  },
  // 28: "Are you an accountant?" → [are, you, an, accountant]
  {
    phraseIndex: 28,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с "you" начинается с "Are": Are you...?' },
      { wordIndex: 2, hint: 'Артикль "an" перед гласной: an accountant.' },
    ],
    generalRule: 'Are + you + an + профессия (гласная)?',
    traps: []
  },
  // 29: "Are they colleagues?" → [are, they, colleagues]
  {
    phraseIndex: 29,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с "they" начинается с "Are": Are they...?' },
    ],
    generalRule: 'Are + they + существительное?',
    traps: []
  },
  // 30: "No he is not a dentist" → [no, he, is, not, a, dentist]
  {
    phraseIndex: 30,
    wordTraps: [
      { wordIndex: 2, hint: 'С "He" только "is": He is not.' },
      { wordIndex: 3, hint: 'Отрицание идёт после "is": is not.' },
      { wordIndex: 4, hint: 'Артикль "a": a dentist.' },
    ],
    generalRule: 'No + he + is + not + a + профессия.',
    traps: []
  },
  // 31: "I am not right" → [i, am, not, right]
  {
    phraseIndex: 31,
    wordTraps: [
      { wordIndex: 1, hint: 'С "I" только "am": I am not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "am": am not.' },
    ],
    generalRule: 'I + am + not + прилагательное.',
    traps: []
  },
  // 32: "It is not my problem" → [it, is, not, my, problem]
  {
    phraseIndex: 32,
    wordTraps: [
      { wordIndex: 1, hint: 'С "It" только "is": It is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'It + is + not + притяжательное + существительное.',
    traps: []
  },
  // 33: "Is he very busy now?" → [is, he, very, busy, now]
  {
    phraseIndex: 33,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с "he" начинается с "Is": Is he...?' },
    ],
    generalRule: 'Is + he + very + прилагательное + now?',
    traps: []
  },
  // 34: "They are not our competitors" → [they, are, not, our, competitors]
  {
    phraseIndex: 34,
    wordTraps: [
      { wordIndex: 1, hint: 'С "They" только "are": They are not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "are": are not.' },
    ],
    generalRule: 'They + are + not + притяжательное + существительное (мн.ч.).',
    traps: []
  },
  // 35: "Is this your office?" → [is, this, your, office]
  {
    phraseIndex: 35,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос начинается с "Is": Is this...?' },
    ],
    generalRule: 'Is + this + притяжательное + существительное?',
    traps: []
  },
  // 36: "He is not from London" → [he, is, not, from, london]
  {
    phraseIndex: 36,
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" только "is": He is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
      { wordIndex: 3, hint: 'Предлог "from" для происхождения: from London.' },
    ],
    generalRule: 'He + is + not + from + место.',
    traps: []
  },
  // 37: "Is she not your colleague?" → [is, she, not, your, colleague]
  {
    phraseIndex: 37,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с отрицанием начинается с "Is": Is she not...?' },
      { wordIndex: 2, hint: 'Отрицание "not" может быть в вопросе: is she not.' },
    ],
    generalRule: 'Is + she + not + притяжательное + существительное?',
    traps: []
  },
  // 38: "We are not ready" → [we, are, not, ready]
  {
    phraseIndex: 38,
    wordTraps: [
      { wordIndex: 1, hint: 'С "We" только "are": We are not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "are": are not.' },
    ],
    generalRule: 'We + are + not + прилагательное.',
    traps: []
  },
  // 39: "This is not true" → [this, is, not, true]
  {
    phraseIndex: 39,
    wordTraps: [
      { wordIndex: 1, hint: 'С "this" глагол "is": This is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'This + is + not + прилагательное.',
    traps: []
  },
  // 40: "Are you partners?" → [are, you, partners]
  {
    phraseIndex: 40,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с "you" начинается с "Are": Are you...?' },
    ],
    generalRule: 'Are + you + существительное?',
    traps: []
  },
  // 41: "Yes we are ready" → [yes, we, are, ready]
  {
    phraseIndex: 41,
    wordTraps: [
      { wordIndex: 2, hint: 'С "We" только "are": We are.' },
    ],
    generalRule: 'Yes + we + are + прилагательное.',
    traps: []
  },
  // 42: "No she is not tired" → [no, she, is, not, tired]
  {
    phraseIndex: 42,
    wordTraps: [
      { wordIndex: 2, hint: 'С "She" только "is": She is not.' },
      { wordIndex: 3, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'No + she + is + not + прилагательное.',
    traps: []
  },
  // 43: "Is this your phone?" → [is, this, your, phone]
  {
    phraseIndex: 43,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос начинается с "Is": Is this...?' },
    ],
    generalRule: 'Is + this + притяжательное + существительное?',
    traps: []
  },
  // 44: "Is he not your new employee?" → [is, he, not, your, new, employee]
  {
    phraseIndex: 44,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос с отрицанием начинается с "Is": Is he not...?' },
      { wordIndex: 2, hint: 'Отрицание "not" может быть в вопросе: is he not.' },
    ],
    generalRule: 'Is + he + not + притяжательное + прилагательное + существительное?',
    traps: []
  },
  // 45: "She is not right" → [she, is, not, right]
  {
    phraseIndex: 45,
    wordTraps: [
      { wordIndex: 1, hint: 'С "She" только "is": She is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'She + is + not + прилагательное.',
    traps: []
  },
  // 46: "It is not your mistake" → [it, is, not, your, mistake]
  {
    phraseIndex: 46,
    wordTraps: [
      { wordIndex: 1, hint: 'С "It" только "is": It is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'It + is + not + притяжательное + существительное.',
    traps: []
  },
  // 47: "We are not in the office" → [we, are, not, in, the, office]
  {
    phraseIndex: 47,
    wordTraps: [
      { wordIndex: 1, hint: 'С "We" только "are": We are not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "are": are not.' },
      { wordIndex: 3, hint: 'Предлог "in" для места: in the office.' },
    ],
    generalRule: 'We + are + not + in + артикль + место.',
    traps: []
  },
  // 48: "He is not your competitor" → [he, is, not, your, competitor]
  {
    phraseIndex: 48,
    wordTraps: [
      { wordIndex: 1, hint: 'С "He" только "is": He is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'He + is + not + притяжательное + существительное.',
    traps: []
  },
  // 49: "This is not that person" → [this, is, not, that, person]
  {
    phraseIndex: 49,
    wordTraps: [
      { wordIndex: 1, hint: 'С "this" глагол "is": This is not.' },
      { wordIndex: 2, hint: 'Отрицание идёт после "is": is not.' },
    ],
    generalRule: 'This + is + not + that + существительное.',
    traps: []
  },
];

const L3_TRAPS: readonly PhraseErrorTraps[] = [];
const L4_TRAPS: readonly PhraseErrorTraps[] = [];
const L5_TRAPS: readonly PhraseErrorTraps[] = [];
const L6_TRAPS: readonly PhraseErrorTraps[] = [];
const L7_TRAPS: readonly PhraseErrorTraps[] = [];
const L8_TRAPS: readonly PhraseErrorTraps[] = [
  // 0: "I work on Monday"
  {
    phraseIndex: 0,
    wordTraps: [
      { wordIndex: 2, hint: 'С днями недели всегда используется on: on Monday, on Friday.' },
    ],
    generalRule: 'Логика этой фразы строится по шагам: сначала тот, кто действует (I), затем само действие (work), и в конце — время через предлог on и название дня.',
    generalRule_UA: 'Логіка цієї фрази будується по кроках: спочатку той, хто діє (I), потім сама дія (work), і в кінці — час через прийменник on та назву дня.',
    traps: []
  },
  // 1: "She leaves at eight o'clock"
  {
    phraseIndex: 1,
    wordTraps: [
      { wordIndex: 2, hint: 'Для точного времени по часам — at: at eight o\'clock.' },
      { wordIndex: 4, hint: 'o\'clock — показатель конкретного часа. Не пропускайте его!' },
    ],
    generalRule: 'Представьте формулу: персонаж (She), затем действие в нужной форме (leaves), и завершаем точным временем, используя связку at и o\'clock.',
    generalRule_UA: 'Уявіть формулу: персонаж (She), потім дія у потрібній формі (leaves), і завершуємо точним часом, використовуючи зв\'язку at та o\'clock.',
    traps: []
  },
  // 2: "We rest in July"
  {
    phraseIndex: 2,
    wordTraps: [
      { wordIndex: 2, hint: 'С месяцами — in: in July, in January. Мы «внутри» этого периода.' },
    ],
    generalRule: 'Последовательность слов здесь такова: мы (We), затем то, что мы делаем (rest), и в конце указываем месяц через предлог «в» (in).',
    generalRule_UA: 'Послідовність слів тут така: ми (We), потім те, що ми робимо (rest), і в кінці вказуємо місяць через прийменник «в» (in).',
    traps: []
  },
  // 3: "He pays on the weekend"
  {
    phraseIndex: 3,
    wordTraps: [
      { wordIndex: 2, hint: 'on the weekend / on weekends — предлог on для выходных (в курсе — американский стандарт).' },
      { wordIndex: 3, hint: 'Артикль the: on the weekend — устойчивое сочетание.' },
    ],
    generalRule: 'Структура предложения: сначала тот, кто платит (He), затем действие (pays), и время через on the weekend (или on weekends).',
    generalRule_UA: 'Структура речення: спочатку той, хто платить (He), потім дія (pays), і час через on the weekend (або on weekends).',
    traps: []
  },
  // 4: "They call in the morning"
  {
    phraseIndex: 4,
    wordTraps: [
      { wordIndex: 2, hint: 'Части суток с the: in the morning, in the evening, in the afternoon.' },
      { wordIndex: 3, hint: 'Не забудьте артикль «the» перед morning!' },
    ],
    generalRule: 'Чтобы мысль была ясной, соблюдайте порядок: сначала они (They), затем действие (call), и в конце временной период (in the morning).',
    generalRule_UA: 'Щоб думка була ясною, дотримуйтесь порядку: спочатку вони (They), потім дія (call), і в кінці часовий період (in the morning).',
    traps: []
  },
  // 5: "He has a meeting at noon"
  {
    phraseIndex: 5,
    wordTraps: [
      { wordIndex: 4, hint: 'Noon (полдень) — конкретный момент, поэтому at: at noon.' },
    ],
    generalRule: 'Схема построения такая: персонаж (He), факт наличия встречи (has a meeting) и точный момент времени через предлог at.',
    generalRule_UA: 'Схема побудови така: персонаж (He), факт наявності зустрічі (has a meeting) і точний момент часу через прийменник at.',
    traps: []
  },
  // 6: "You pay cash on Friday"
  {
    phraseIndex: 6,
    wordTraps: [
      { wordIndex: 3, hint: 'С любым днем недели — on: on Friday, on Monday, on Sunday.' },
    ],
    generalRule: 'Мы строим фразу по цепочке: кто (You), что делает (pay), чем именно (cash) и когда это происходит (on Friday).',
    generalRule_UA: 'Ми будуємо фразу за ланцюжком: хто (You), що робить (pay), чим саме (cash) і коли це відбувається (on Friday).',
    traps: []
  },
  // 7: "The shop closes at midnight"
  {
    phraseIndex: 7,
    wordTraps: [
      { wordIndex: 3, hint: 'Midnight — точный момент времени, поэтому at: at midnight.' },
    ],
    generalRule: 'Чтобы всё прозвучало верно, сначала назовите объект (The shop), затем действие (closes) и завершите фразу точным временем.',
    generalRule_UA: 'Щоб усе прозвучало правильно, спочатку назвіть об\'єкт (The shop), потім дію (closes) і завершіть фразу точним часом.',
    traps: []
  },
  // 8: "We travel in winter"
  {
    phraseIndex: 8,
    wordTraps: [
      { wordIndex: 2, hint: 'Времена года — in: in winter, in summer, in spring, in autumn.' },
    ],
    generalRule: 'Логика утверждения проста: мы (We), затем наше занятие (travel) и указание времени года через предлог «в» (in).',
    generalRule_UA: 'Логіка твердження проста: ми (We), потім наше заняття (travel) і вказівка пори року через прийменник «в» (in).',
    traps: []
  },
  // 9: "They walk in the evening"
  {
    phraseIndex: 9,
    wordTraps: [
      { wordIndex: 2, hint: 'Части суток требуют in the: in the evening, in the morning.' },
      { wordIndex: 3, hint: 'Артикль «the» обязателен: in the evening, а не in evening.' },
    ],
    generalRule: 'Структура фразы строится последовательно: действующие лица (They), само действие (walk) и временной отрезок в конце.',
    generalRule_UA: 'Структура фрази будується послідовно: дійові особи (They), сама дія (walk) і часовий відрізок у кінці.',
    traps: []
  },
  // 10: "I drink coffee at noon"
  {
    phraseIndex: 10,
    wordTraps: [
      { wordIndex: 3, hint: 'Noon — точная точка дня. Всегда at noon, как at midnight.' },
    ],
    generalRule: 'Ритм предложения таков: вы (I), затем ваше действие (drink coffee), и в конце — точное время встречи с напитком.',
    generalRule_UA: 'Ритм речення такий: ви (I), потім ваша дія (drink coffee), і в кінці — точний час зустрічі з напоєм.',
    traps: []
  },
  // 11: "The train arrives at seven PM"
  {
    phraseIndex: 11,
    wordTraps: [
      { wordIndex: 3, hint: 'Точное время — at: at seven PM, at nine thirty, at midnight.' },
      { wordIndex: 5, hint: 'PM = после полудня (Post Meridiem). Противоположность — AM.' },
    ],
    generalRule: 'Сначала мы называем транспорт (The train), затем действие (arrives) и завершаем фразу временем с обязательным предлогом-указателем.',
    generalRule_UA: 'Спочатку ми називаємо транспорт (The train), потім дію (arrives) і завершуємо фразу часом з обов\'язковим прийменником-покажчиком.',
    traps: []
  },
  // 12: "We do sport on Tuesdays"
  {
    phraseIndex: 12,
    wordTraps: [
      { wordIndex: 3, hint: 'С днями недели — on. Tuesdays (с -s) = каждый вторник.' },
    ],
    generalRule: 'Формула этой фразы: группа людей (We), активность (do sport) и день недели с соответствующим предлогом.',
    generalRule_UA: 'Формула цієї фрази: група людей (We), активність (do sport) і день тижня з відповідним прийменником.',
    traps: []
  },
  // 13: "She checks mail at night"
  {
    phraseIndex: 13,
    wordTraps: [
      { wordIndex: 3, hint: 'Исключение: ночь = at night (не in the night). Запомните!' },
    ],
    generalRule: 'Шаги просты: персонаж (She), действие (checks mail) и время суток, которое мы выделяем предлогом at.',
    generalRule_UA: 'Кроки прості: персонаж (She), дія (checks mail) і час доби, який ми виділяємо прийменником at.',
    traps: []
  },
  // 14: "They relax in August"
  {
    phraseIndex: 14,
    wordTraps: [
      { wordIndex: 2, hint: 'Месяцы — всегда in: in August, in July, in January.' },
    ],
    generalRule: 'Сначала указываем тех, о ком речь (They), затем их состояние (relax) и период в календаре через предлог «в» (in).',
    generalRule_UA: 'Спочатку вказуємо тих, про кого мова (They), потім їхній стан (relax) і період у календарі через прийменник «в» (in).',
    traps: []
  },
  // 15: "I book a hotel in June"
  {
    phraseIndex: 15,
    wordTraps: [
      { wordIndex: 4, hint: 'Месяцы — in: in June, in December, in March. Мы внутри периода.' },
    ],
    generalRule: 'Цепочка утверждения строится так: я (I), действие по заказу (book a hotel) и временная рамка в конце.',
    generalRule_UA: 'Ланцюжок твердження будується так: я (I), дія із замовлення (book a hotel) і часова рамка в кінці.',
    traps: []
  },
  // 16: "We meet at nine thirty"
  {
    phraseIndex: 16,
    wordTraps: [
      { wordIndex: 2, hint: 'Точное время (часы + минуты) — at: at nine thirty, at ten fifteen.' },
    ],
    generalRule: 'Логика проста: называем нас (We), само событие (meet) и точные цифры времени с предлогом-маркером.',
    generalRule_UA: 'Логіка проста: називаємо нас (We), саму подію (meet) і точні цифри часу з прийменником-маркером.',
    traps: []
  },
  // 17: "She works on Thursdays"
  {
    phraseIndex: 17,
    wordTraps: [
      { wordIndex: 2, hint: 'Дни недели — on. Thursdays (с -s) = каждый четверг.' },
    ],
    generalRule: 'Схема построения: кто (She), её занятость (works) и конкретные дни в календаре с предлогом on.',
    generalRule_UA: 'Схема побудови: хто (She), її зайнятість (works) і конкретні дні в календарі з прийменником on.',
    traps: []
  },
  // 18: "They order food in the evening"
  {
    phraseIndex: 18,
    wordTraps: [
      { wordIndex: 3, hint: 'Части суток: in the evening, in the morning, in the afternoon.' },
      { wordIndex: 4, hint: 'Артикль «the» обязателен: in the evening.' },
    ],
    generalRule: 'Чтобы мысль была логичной, сначала скажите, кто действует (They), затем что они делают (order food) и в конце добавьте время.',
    generalRule_UA: 'Щоб думка була логічною, спочатку скажіть, хто діє (They), потім що вони роблять (order food) і в кінці додайте час.',
    traps: []
  },
  // 19: "He has a vacation in spring"
  {
    phraseIndex: 19,
    wordTraps: [
      { wordIndex: 4, hint: 'Сезоны — in: in spring, in summer, in autumn, in winter.' },
    ],
    generalRule: 'Формула фразы проста: на первом месте персонаж (He), затем его обладание отпуском (has a vacation) и сезон в конце.',
    generalRule_UA: 'Формула фрази проста: на першому місці персонаж (He), потім його володіння відпусткою (has a vacation) і сезон у кінці.',
    traps: []
  },
  // 20: "I come home at midnight"
  {
    phraseIndex: 20,
    wordTraps: [
      { wordIndex: 3, hint: 'Midnight — точный момент. Как at noon, at six o\'clock.' },
    ],
    generalRule: 'Структура этой мысли такова: сначала тот, кто совершает действие (I), само действие (come), затем направление (home) и в конце — время через предлог at.',
    generalRule_UA: 'Структура цієї думки така: спочатку той, хто виконує дію (I), сама дія (come), потім напрямок (home) і в кінці — час через прийменник at.',
    traps: []
  },
  // 21: "The train departs at ten fifteen"
  {
    phraseIndex: 21,
    wordTraps: [
      { wordIndex: 3, hint: 'Точное время с минутами — at: at ten fifteen, at nine thirty.' },
    ],
    generalRule: 'Представьте это как схему: главный объект (The train), его действие (departs) и точное время с предлогом-указателем в конце.',
    generalRule_UA: 'Уявіть це як схему: головний об\'єкт (The train), його дія (departs) і точний час із прийменником-покажчиком у кінці.',
    traps: []
  },
  // 22: "We walk in the park on Sundays"
  {
    phraseIndex: 22,
    wordTraps: [
      { wordIndex: 2, hint: 'Место действия — in: walk in the park. Предлог in указывает, что мы внутри/в рамках пространства.' },
      { wordIndex: 3, hint: 'Обязательно с артиклем: in the park, а не in park.' },
      { wordIndex: 5, hint: 'Дни недели — on. Sundays (с -s) = каждое воскресенье, регулярное действие.' },
    ],
    generalRule: 'Фраза строится по схеме: кто (We) + действие (walk) + где (in the park) + когда (on Sundays). Место идёт перед временем.',
    generalRule_UA: 'Фраза будується за схемою: хто (We) + дія (walk) + де (in the park) + коли (on Sundays). Місце йде перед часом.',
    traps: []
  },
  // 23: "She has breakfast in the morning"
  {
    phraseIndex: 23,
    wordTraps: [
      { wordIndex: 3, hint: 'Части суток — in the: in the morning, in the evening.' },
      { wordIndex: 4, hint: '«the» обязательно: in the morning, а не in morning.' },
    ],
    generalRule: 'Чтобы составить эту фразу, следуйте порядку: персонаж (She), действие (has breakfast) и временной отрезок через предлог in.',
    generalRule_UA: 'Щоб скласти цю фразу, дотримуйтесь порядку: персонаж (She), дія (has breakfast) і часовий відрізок через прийменник in.',
    traps: []
  },
  // 24: "They shop on Saturday"
  {
    phraseIndex: 24,
    wordTraps: [
      { wordIndex: 2, hint: 'Дни недели — on: on Saturday, on Monday, on Friday.' },
    ],
    generalRule: 'Схема предложения: на первом месте те, кто действует (They), затем само занятие (shop) и в конце — день недели с предлогом on.',
    generalRule_UA: 'Схема речення: на першому місці ті, хто діє (They), потім саме заняття (shop) і в кінці — день тижня з прийменником on.',
    traps: []
  },
  // 25: "I order a taxi at six o'clock"
  {
    phraseIndex: 25,
    wordTraps: [
      { wordIndex: 4, hint: 'Точный час — at: at six o\'clock. o\'clock = ровно час.' },
    ],
    generalRule: 'Формула фразы строится последовательно: кто (I), что делает (order a taxi) и в какой момент (at six o\'clock).',
    generalRule_UA: 'Формула фрази будується послідовно: хто (I), що робить (order a taxi) і в який момент (at six o\'clock).',
    traps: []
  },
  // 26: "We have lunch at one PM"
  {
    phraseIndex: 26,
    wordTraps: [
      { wordIndex: 3, hint: 'Точное время — at: at one PM, at seven AM.' },
      { wordIndex: 5, hint: 'PM = после полудня. AM = до полудня.' },
    ],
    generalRule: 'Чтобы всё прозвучало правильно, сначала назовите нас (We), затем действие (have lunch) и точное время с предлогом-маркером.',
    generalRule_UA: 'Щоб усе прозвучало правильно, спочатку назвіть нас (We), потім дію (have lunch) і точний час із прийменником-покажчиком.',
    traps: []
  },
  // 27: "She visits the gym on Wednesdays"
  {
    phraseIndex: 27,
    wordTraps: [
      { wordIndex: 4, hint: 'Дни недели — on. Wednesdays (с -s) = каждую среду.' },
    ],
    generalRule: 'Логическая цепочка такова: героиня (She), её действие (visits the gym) и регулярный день недели через предлог on.',
    generalRule_UA: 'Логічний ланцюжок такий: героїня (She), її дія (visits the gym) і регулярний день тижня через прийменник on.',
    traps: []
  },
  // 28: "They watch the news in the evening"
  {
    phraseIndex: 28,
    wordTraps: [
      { wordIndex: 3, hint: 'Части суток — in the: in the evening, не at the evening.' },
      { wordIndex: 4, hint: 'Артикль «the» обязателен: in the evening.' },
    ],
    generalRule: 'Структура здесь простая: в начале те, о ком говорим (They), затем их привычка (watch news) и временной блок в конце.',
    generalRule_UA: 'Структура тут проста: на початку ті, про кого говоримо (They), потім їхня звичка (watch news) і часовий блок у кінці.',
    traps: []
  },
  // 29: "He has a day off on Saturday"
  {
    phraseIndex: 29,
    wordTraps: [
      { wordIndex: 5, hint: 'Дни недели — on: on Saturday, on Sunday.' },
    ],
    generalRule: 'Мы строим предложение по шагам: сначала персонаж (He), факт наличия выходного (has a day off) и день недели с предлогом on.',
    generalRule_UA: 'Ми будуємо речення за кроками: спочатку персонаж (He), факт наявності вихідного (has a day off) і день тижня з прийменником on.',
    traps: []
  },
  // 30: "I have a break at two o'clock"
  {
    phraseIndex: 30,
    wordTraps: [
      { wordIndex: 4, hint: 'Точный час — at: at two o\'clock, at noon, at midnight.' },
    ],
    generalRule: 'Схема этого утверждения: я (I), наличие перерыва (have a break) и точное время, обозначенное предлогом at.',
    generalRule_UA: 'Схема цього твердження: я (I), наявність перерви (have a break) і точний час, позначений прийменником at.',
    traps: []
  },
  // 31: "We pay rent in January"
  {
    phraseIndex: 31,
    wordTraps: [
      { wordIndex: 3, hint: 'Месяцы — in: in January, in August, in October.' },
    ],
    generalRule: 'Логика фразы: действующие лица (We), действие (pay rent) и название месяца через предлог «в» (in).',
    generalRule_UA: 'Логіка фрази: дійові особи (We), дія (pay rent) і назва місяця через прийменник «в» (in).',
    traps: []
  },
  // 32: "She finishes work at five PM"
  {
    phraseIndex: 32,
    wordTraps: [
      { wordIndex: 3, hint: 'Точное время — at: at five PM, at seven AM.' },
      { wordIndex: 5, hint: 'PM = вечера (после полудня). AM = утра (до полудня).' },
    ],
    generalRule: 'Представьте последовательность: кто (She), её действие (finishes work) и точный момент окончания через предлог at.',
    generalRule_UA: 'Уявіть послідовність: хто (She), її дія (finishes work) і точний момент закінчення через прийменник at.',
    traps: []
  },
  // 33: "They meet on weekends"
  {
    phraseIndex: 33,
    wordTraps: [
      { wordIndex: 2, hint: 'В американском английском используем on weekends для регулярных действий по выходным.' },
    ],
    generalRule: 'Сначала мы называем группу людей (They), затем их действие (meet) и завершаем указанием на регулярные выходные через on weekends.',
    generalRule_UA: 'Спочатку ми називаємо групу людей (They), потім їхню дію (meet) і завершуємо вказівкою на регулярні вихідні через on weekends.',
    traps: []
  },
  // 34: "He has a birthday in October"
  {
    phraseIndex: 34,
    wordTraps: [
      { wordIndex: 4, hint: 'Месяцы — in: in October, in December, in June.' },
    ],
    generalRule: 'Мы строим фразу так: главный герой (He), факт наличия события (has a birthday) и месяц через предлог «в» (in).',
    generalRule_UA: 'Ми будуємо фразу так: головний герой (He), факт наявності події (has a birthday) і місяць через прийменник «в» (in).',
    traps: []
  },
  // 35: "I book a table in the evening"
  {
    phraseIndex: 35,
    wordTraps: [
      { wordIndex: 4, hint: 'Части суток — in the: in the evening, in the morning.' },
      { wordIndex: 5, hint: 'Артикль «the» обязателен: in the evening.' },
    ],
    generalRule: 'Чтобы мысль была ясной, соблюдайте ритм: я (I), само действие (book a table) и временной период в конце.',
    generalRule_UA: 'Щоб думка була ясною, дотримуйтесь ритму: я (I), сама дія (book a table) і часовий період у кінці.',
    traps: []
  },
  // 36: "Does she have time on Friday"
  {
    phraseIndex: 36,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос — вспомогательный глагол Does впереди: Does she...?' },
      { wordIndex: 4, hint: 'Дни недели — on: on Friday, on Monday.' },
    ],
    generalRule: 'В вопросе сначала идет помощник (Does), затем персонаж (she), действие (have time) и в конце день недели с предлогом on.',
    generalRule_UA: 'У запитанні спочатку йде помічник (Does), потім персонаж (she), дія (have time) і в кінці день тижня з прийменником on.',
    traps: []
  },
  // 37: "They have dinner at seven o'clock"
  {
    phraseIndex: 37,
    wordTraps: [
      { wordIndex: 3, hint: 'Точный час — at: at seven o\'clock, at midnight.' },
    ],
    generalRule: 'Шаги для построения фразы: те, о ком говорим (They), их действие (have dinner) и точное время в конце.',
    generalRule_UA: 'Кроки для побудови фрази: ті, про кого говоримо (They), їхня дія (have dinner) і точний час у кінці.',
    traps: []
  },
  // 38: "We travel in May"
  {
    phraseIndex: 38,
    wordTraps: [
      { wordIndex: 2, hint: 'Месяцы — in: in May, in July, in September.' },
    ],
    generalRule: 'Логическая формула: на первом месте те, кто едет (We), затем действие (travel) и временной отрезок через предлог «в» (in).',
    generalRule_UA: 'Логічна формула: на першому місці ті, хто їде (We), потім дія (travel) і часовий відрізок через прийменник «в» (in).',
    traps: []
  },
  // 39: "He checks documents at night"
  {
    phraseIndex: 39,
    wordTraps: [
      { wordIndex: 3, hint: 'Ночь — исключение: at night (не in the night). Запомните!' },
    ],
    generalRule: 'Последовательность слов: главный герой (He), его работа с бумагами (checks documents) и период времени через предлог at.',
    generalRule_UA: 'Послідовність слів: головний герой (He), його робота з паперами (checks documents) і період часу через прийменник at.',
    traps: []
  },
  // 40: "I buy tickets in March"
  {
    phraseIndex: 40,
    wordTraps: [
      { wordIndex: 3, hint: 'Месяцы — in: in March, in May, in January.' },
    ],
    generalRule: 'В английском утверждении слова выстраиваются в строгом порядке: сначала тот, кто совершает покупку (I), затем само действие (buy tickets) и в конце — время через предлог in.',
    generalRule_UA: 'В англійському твердженні слова вишиковуються в суворому порядку: спочатку той, хто здійснює покупку (I), потім сама дія (buy tickets) і в кінці — час через прийменник in.',
    traps: []
  },
  // 41: "She calls parents on weekends"
  {
    phraseIndex: 41,
    wordTraps: [
      { wordIndex: 3, hint: 'В американском английском используем on weekends для повторяющегося действия.' },
    ],
    generalRule: 'Логика построения проста: на первом месте героиня (She), далее её действие (calls parents) и в самом конце указание времени через предлог at.',
    generalRule_UA: 'Логіка побудови проста: на першому місці героїня (She), далі її дія (calls parents) і в самому кінці вказівка часу через прийменник at.',
    traps: []
  },
  // 42: "We drink tea in the afternoon"
  {
    phraseIndex: 42,
    wordTraps: [
      { wordIndex: 3, hint: 'Части суток — in the: in the afternoon, in the morning, in the evening.' },
      { wordIndex: 4, hint: 'Артикль «the» обязателен: in the afternoon.' },
    ],
    generalRule: 'Чтобы предложение звучало верно, следуйте формуле: действующие лица (We), затем действие (drink tea) и завершающий временной блок.',
    generalRule_UA: 'Щоб речення звучало правильно, дотримуйтесь формули: дійові особи (We), потім дія (drink tea) і завершальний часовий блок.',
    traps: []
  },
  // 43: "Does he have work in September"
  {
    phraseIndex: 43,
    wordTraps: [
      { wordIndex: 0, hint: 'Вопрос — Does впереди: Does he...? (не Is he...?)' },
      { wordIndex: 4, hint: 'Месяцы — in: in September, in August, in March.' },
    ],
    generalRule: 'В вопросительной конструкции сначала идет помощник (Does), затем главный герой (he), действие (have work) и временной отрезок с предлогом in.',
    generalRule_UA: 'У питальній конструкції спочатку йде помічник (Does), потім головний герой (he), дія (have work) і часовий відрізок із прийменником in.',
    traps: []
  },
  // 44: "They finish the project at midnight"
  {
    phraseIndex: 44,
    wordTraps: [
      { wordIndex: 4, hint: 'Midnight — точный момент, поэтому at: at midnight, at noon.' },
    ],
    generalRule: 'Последовательность слов в этой фразе такова: сначала исполнители (They), затем их действие (finish the project) и точное время в конце.',
    generalRule_UA: 'Послідовність слів у цій фразі така: спочатку виконавці (They), потім їхня дія (finish the project) і точний час у кінці.',
    traps: []
  },
  // 45: "I check tickets at midnight"
  {
    phraseIndex: 45,
    wordTraps: [
      { wordIndex: 3, hint: 'Midnight — точный момент: at midnight. Как at noon, at six o\'clock.' },
    ],
    generalRule: 'Формула успеха проста: называем себя (I), затем действие (check tickets) и добавляем временной маркер с предлогом at.',
    generalRule_UA: 'Формула успіху проста: називаємо себе (I), потім дію (check tickets) і додаємо часовий маркер із прийменником at.',
    traps: []
  },
  // 46: "The train arrives at seven AM"
  {
    phraseIndex: 46,
    wordTraps: [
      { wordIndex: 3, hint: 'Точное время — at: at seven AM, at nine thirty.' },
      { wordIndex: 5, hint: 'AM = Ante Meridiem = до полудня. Противоположность PM.' },
    ],
    generalRule: 'Шаги построения мысли: предмет (The train), действие (arrives) и точное время с обязательным предлогом-помощником.',
    generalRule_UA: 'Кроки побудови думки: предмет (The train), дія (arrives) і точний час з обов\'язковим прийменником-помічником.',
    traps: []
  },
  // 47: "We order pizza on Saturdays"
  {
    phraseIndex: 47,
    wordTraps: [
      { wordIndex: 3, hint: 'Дни недели — on. Saturdays (с -s) = каждую субботу.' },
    ],
    generalRule: 'Ритм фразы таков: сначала мы (We), затем наше действие (order pizza) и регулярный день недели с предлогом on.',
    generalRule_UA: 'Ритм фрази такий: спочатку ми (We), потім наша дія (order pizza) і регулярний день тижня з прийменником on.',
    traps: []
  },
  // 48: "She has a meeting in December"
  {
    phraseIndex: 48,
    wordTraps: [
      { wordIndex: 4, hint: 'Месяцы — in: in December, in June, in October.' },
    ],
    generalRule: 'Структура предложения проста: на первом месте персонаж (She), затем факт наличия встречи (has a meeting) и месяц с предлогом in.',
    generalRule_UA: 'Структура речення проста: на першому місці персонаж (She), потім факт наявності зустрічі (has a meeting) і місяць із прийменником in.',
    traps: []
  },
  // 49: "They rest in April"
  {
    phraseIndex: 49,
    wordTraps: [
      { wordIndex: 2, hint: 'Месяцы — in: in April, in July, in August.' },
    ],
    generalRule: 'Чтобы выразить эту мысль, следуйте порядку: действующие лица (They), затем их состояние (rest) и название месяца через предлог in.',
    generalRule_UA: 'Щоб висловити цю думку, дотримуйтесь порядку: дійові особи (They), потім їхній стан (rest) і назва місяця через прийменник in.',
    traps: []
  },
];

export const TRAPS_1_8: LessonErrorTrapsMap = {
  1: L1_TRAPS,
  2: L2_TRAPS,
  3: L3_TRAPS,
  4: L4_TRAPS,
  5: L5_TRAPS,
  6: L6_TRAPS,
  7: L7_TRAPS,
  8: L8_TRAPS,
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

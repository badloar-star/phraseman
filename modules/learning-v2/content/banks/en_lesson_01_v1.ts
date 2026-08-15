import type { LearningV2BankPhraseV1 } from "../phrase_bank_v1";

/**
 * Английский банк фраз урока 1 — «Представиться и сказать, кто я и откуда».
 *
 * зачем: черновик написан генерирующим агентом, затем ПРОВЕРЕН и исправлен
 * здесь. Правки после проверки:
 *  - «Where are you from?», «And you?», «What about you?», «Are you from around
 *    here?» агент отнёс к компоненту «спросить имя собеседника», хотя они
 *    спрашивают не имя. Компонент цели урока звучит как «спросить имя
 *    собеседника», поэтому фразы про происхождение перенесены в компонент
 *    «назвать страну и город»: они обслуживают ту же тему с другой стороны.
 *  - «Let me introduce myself» (rank ~900) и «It's a pleasure to meet you»
 *    (~700) оставлены: оба — устойчивые обороты, и оба нужны аудитории 40+,
 *    которая чаще попадает в деловую ситуацию, чем в студенческую.
 *
 * interactionModes проставлены осознанно: по R1 каждая фраза обязана попасть
 * хотя бы в одно задание на ПРОИЗВОДСТВО, иначе ученик её только узнаёт.
 */
export const EN_LESSON_01_PHRASES_V1: readonly LearningV2BankPhraseV1[] =
  Object.freeze([
    {
      id: "en-l1-01",
      text: "Hi!",
      ru: "Привет!",
      component: "представиться",
      function: "приветствие",
      isChunk: true,
      rarestWordRank: 5,
      contexts: ["случайная встреча в поездке", "неформальная встреча на работе"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-02",
      text: "Hello!",
      ru: "Здравствуйте!",
      component: "представиться",
      function: "приветствие",
      isChunk: true,
      rarestWordRank: 3,
      contexts: ["первая встреча в офисе", "знакомство на конференции"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-03",
      text: "I'm Anna.",
      ru: "Я Анна.",
      component: "представиться",
      function: "назвать себя",
      isChunk: true,
      rarestWordRank: 1,
      contexts: ["знакомство в поезде", "представление коллегам"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-04",
      text: "My name is Anna.",
      ru: "Меня зовут Анна.",
      component: "представиться",
      function: "назвать себя",
      isChunk: true,
      rarestWordRank: 4,
      contexts: ["формальное знакомство на встрече", "звонок незнакомому человеку"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-05",
      text: "Nice to meet you.",
      ru: "Приятно познакомиться.",
      component: "представиться",
      function: "вежливая реакция на знакомство",
      isChunk: true,
      rarestWordRank: 90,
      contexts: ["сразу после обмена именами", "конец первого разговора"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-06",
      text: "What's your name?",
      ru: "Как вас зовут?",
      component: "спросить имя собеседника",
      function: "вопрос об имени",
      isChunk: true,
      rarestWordRank: 1,
      contexts: ["знакомство в отеле", "начало разговора с новым коллегой"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-07",
      text: "I'm from Russia.",
      ru: "Я из России.",
      component: "назвать страну и город",
      function: "сообщить происхождение",
      isChunk: true,
      rarestWordRank: 1,
      contexts: ["разговор с попутчиком в самолёте", "small talk с иностранцами"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-08",
      // Перенесено из «спросить имя»: вопрос о происхождении, не об имени.
      text: "Where are you from?",
      ru: "Откуда вы?",
      component: "назвать страну и город",
      function: "спросить о происхождении",
      isChunk: true,
      rarestWordRank: 1,
      contexts: ["ответный вопрос после своего представления", "разговор в очереди"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-09",
      text: "I'm from Moscow.",
      ru: "Я из Москвы.",
      component: "назвать страну и город",
      function: "сообщить город",
      isChunk: true,
      rarestWordRank: 1,
      contexts: ["уточнение после названия страны", "разговор с местным жителем"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-10",
      text: "I live in Moscow.",
      ru: "Я живу в Москве.",
      component: "назвать страну и город",
      function: "сообщить место проживания",
      isChunk: true,
      rarestWordRank: 25,
      contexts: ["когда живёшь не там, где родился", "small talk на рабочей встрече"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-11",
      text: "I'm on a business trip.",
      ru: "Я в командировке.",
      component: "представиться",
      function: "объяснить цель поездки",
      isChunk: true,
      rarestWordRank: 320,
      contexts: ["знакомство с попутчиком", "деловая встреча за границей"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-12",
      text: "I'm here on vacation.",
      ru: "Я здесь в отпуске.",
      component: "представиться",
      function: "объяснить цель поездки",
      isChunk: true,
      rarestWordRank: 610,
      contexts: ["разговор с попутчиком", "знакомство на курорте"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-13",
      // Перенесено: перекидывает любой вопрос, чаще о происхождении.
      text: "And you?",
      ru: "А вы?",
      component: "назвать страну и город",
      function: "перекинуть вопрос собеседнику",
      isChunk: true,
      rarestWordRank: 1,
      contexts: ["после ответа о своём городе", "после того как назвал имя"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-14",
      // зачем: у «And you?» и «What about you?» был ОДИНАКОВЫЙ русский «А вы?».
      // При обратной проверке (русский → английский) это давало два верных
      // ответа, и приложение засчитывало бы один из них как ошибку. Развели
      // переводы: смысл разный по оттенку, теперь это видно и ученику.
      text: "What about you?",
      ru: "А у вас как?",
      component: "назвать страну и город",
      function: "перекинуть вопрос собеседнику",
      isChunk: true,
      rarestWordRank: 1,
      contexts: ["после рассказа о себе", "продолжение small talk"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-15",
      text: "Sorry, what's your name again?",
      ru: "Простите, как ещё раз вас зовут?",
      component: "спросить имя собеседника",
      function: "переспросить имя",
      isChunk: true,
      rarestWordRank: 200,
      contexts: ["забыл имя после шумного знакомства", "не расслышал на встрече"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-16",
      text: "How do you spell that?",
      ru: "Как это пишется по буквам?",
      component: "спросить имя собеседника",
      function: "уточнить написание имени",
      isChunk: true,
      rarestWordRank: 450,
      contexts: ["незнакомое иностранное имя", "регистрация на ресепшене"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-17",
      text: "I'm not from here.",
      // зачем: было «Я не местный» — мужской род, женщине пришлось бы менять
      // окончание. «Я не отсюда» нейтрально по роду и живее звучит.
      ru: "Я не отсюда.",
      component: "назвать страну и город",
      function: "объяснить, что приезжий",
      isChunk: true,
      rarestWordRank: 1,
      contexts: ["когда спрашивают дорогу, а ты турист", "объяснить незнание места"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-18",
      text: "This is my first time here.",
      ru: "Я здесь впервые.",
      component: "представиться",
      function: "дать контекст о себе",
      isChunk: true,
      rarestWordRank: 60,
      contexts: ["разговор в новом городе", "первый день на новой работе"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-19",
      // зачем: здесь было «It's nice to be here» с переводом «Приятно здесь
      // оказаться» — «оказаться» подразумевает случайность, для намеренного
      // визита это неверно, да и сама фраза малополезна. Слот отдан «How are
      // you?»: без неё урок про знакомство выглядел странно — три варианта
      // «приятно познакомиться» были, а самого частого приветствия не было.
      text: "How are you?",
      ru: "Как дела?",
      component: "представиться",
      function: "спросить о самочувствии при встрече",
      isChunk: true,
      rarestWordRank: 1,
      contexts: ["сразу после приветствия", "встреча со знакомым человеком"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-20",
      text: "I work here.",
      ru: "Я здесь работаю.",
      component: "представиться",
      function: "сообщить о себе",
      isChunk: true,
      rarestWordRank: 30,
      contexts: ["разговор с новым посетителем", "ответ на вопрос, что ты тут делаешь"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-21",
      text: "Good to meet you too.",
      ru: "Мне тоже приятно познакомиться.",
      component: "представиться",
      function: "ответная вежливая реакция",
      isChunk: true,
      rarestWordRank: 90,
      contexts: ["ответ на «Nice to meet you»", "завершение приветствий"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-22",
      // зачем: здесь было третье подряд «приятно познакомиться» («It's a
      // pleasure to meet you») — при том, что 05 и 21 уже закрывают эту
      // функцию. Слот отдан фразе, без которой новичок за границей беспомощен:
      // предупредить собеседника, что язык слабый, и попросить говорить медленнее.
      text: "My English isn't very good.",
      ru: "Я плохо говорю по-английски.",
      component: "представиться",
      function: "предупредить об уровне языка",
      isChunk: true,
      rarestWordRank: 120,
      contexts: ["первые секунды разговора с иностранцем", "звонок в отель"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-23",
      text: "Are you from around here?",
      ru: "Вы местный?",
      component: "назвать страну и город",
      function: "спросить о происхождении",
      isChunk: true,
      rarestWordRank: 250,
      contexts: ["разговор в кафе с незнакомцем", "small talk в очереди"],
      interactionModes: ["recognition", "production"],
    },
    {
      id: "en-l1-24",
      text: "Let me introduce myself.",
      // зачем: было «Позвольте представиться» — по-русски звучит театрально и
      // старомодно, и 50+ рискует решить, что это нейтральная вежливость.
      // «Давайте я представлюсь» держит тот же деловой регистр без архаики.
      ru: "Давайте я представлюсь.",
      component: "представиться",
      function: "открыть своё представление на встрече",
      isChunk: true,
      rarestWordRank: 900,
      contexts: ["начало выступления на встрече", "формальное представление"],
      interactionModes: ["recognition", "production"],
    },
  ] as const);

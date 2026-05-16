import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function pronounStep(input: {
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
  retry: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  const correctIndex = input.options.findIndex((option) => option === input.correctAnswer);
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Сначала найди роль местоимения. Кто делает действие получает subject form: I, he, she, we, they. После глагола или предлога нужна object form: me, him, her, us, them.',
      'Спочатку знайди роль займенника. Хто виконує дію отримує subject form: I, he, she, we, they. Після дієслова або прийменника потрібна object form: me, him, her, us, them.',
      'Primero encuentra el papel del pronombre. Quien hace la acción usa subject form: I, he, she, we, they. Después de verbo o preposición usamos object form: me, him, her, us, them.',
    ),
    microTask: tri(
      'Выбери местоимение по роли в предложении.',
      'Обери займенник за роллю в реченні.',
      'Elige el pronombre según su papel en la frase.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Проверь роль: это местоимение делает действие или получает действие после глагола/предлога?',
        'Не зовсім. Перевір роль: цей займенник виконує дію чи отримує дію після дієслова/прийменника?',
        'No exactamente. Revisa el papel: el pronombre hace la acción o recibe la acción después de verbo/preposición?',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: правильная форма здесь - "${input.correctAnswer}".`,
        `Підказка: правильна форма тут - "${input.correctAnswer}".`,
        `Pista: la forma correcta aquí es "${input.correctAnswer}".`,
      ),
    ],
    fallbackExplanation: tri(
      'Остановись и спроси: кто делает действие? Тогда I/he/she/we/they. Кого трогает действие или что стоит после предлога? Тогда me/him/her/us/them.',
      'Зупинись і запитай: хто виконує дію? Тоді I/he/she/we/they. Кого зачіпає дія або що стоїть після прийменника? Тоді me/him/her/us/them.',
      'Detente y pregunta: quién hace la acción? Entonces I/he/she/we/they. A quién afecta la acción o qué va después de preposición? Entonces me/him/her/us/them.',
    ),
    focusWords: input.focusWords,
  };
}

export const PRONOUN_CASE_TRAINING: DiagnosisTraining = {
  id: 'pronoun_case',
  category: 'pronoun',
  version: '1.0.0',
  status: 'active',
  priority: 11,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('I / Me, He / Him: кто делает и кого трогают', 'I / Me, He / Him: хто робить і кого зачіпають', 'I / Me, He / Him: quién hace y a quién afecta'),
  shortTitle: tri('Subject / Object Pronouns', 'Subject / Object Pronouns', 'Subject / Object Pronouns'),
  shortDiagnosis: tri(
    'Ты путаешь subject pronouns и object pronouns: I/me, he/him, she/her, we/us, they/them.',
    'Ти плутаєш subject pronouns та object pronouns: I/me, he/him, she/her, we/us, they/them.',
    'Confundes subject pronouns y object pronouns: I/me, he/him, she/her, we/us, they/them.',
  ),
  diagnosisText: tri(
    'Ты путаешь subject pronouns и object pronouns. Английский выбирает форму не по переводу, а по роли слова: кто делает действие или на кого действие направлено.',
    'Ти плутаєш subject pronouns та object pronouns. Англійська обирає форму не за перекладом, а за роллю слова: хто виконує дію або на кого дія спрямована.',
    'Confundes subject pronouns y object pronouns. El inglés elige la forma por el papel en la frase: quién hace la acción o a quién afecta la acción.',
  ),
  mentalModel: tri(
    'Subject pronoun делает действие: I, he, she, we, they. Object pronoun получает действие или стоит после предлога: me, him, her, us, them.',
    'Subject pronoun виконує дію: I, he, she, we, they. Object pronoun отримує дію або стоїть після прийменника: me, him, her, us, them.',
    'Subject pronoun hace la acción: I, he, she, we, they. Object pronoun recibe la acción o va después de preposición: me, him, her, us, them.',
  ),
  contrastSet: ['I/me', 'he/him', 'she/her', 'we/us', 'they/them', 'you'],
  coreRule: tri(
    'До глагола как исполнитель: I know him. He called me. После глагола или предлога как объект: She helped me. I spoke to him. Between you and me.',
    'До дієслова як виконавець: I know him. He called me. Після дієслова або прийменника як обʼєкт: She helped me. I spoke to him. Between you and me.',
    'Antes del verbo como quien hace: I know him. He called me. Después del verbo o preposición como objeto: She helped me. I spoke to him. Between you and me.',
  ),
  whatUserMustLearn: {
    ru: [
      'Subject pronouns используются, когда местоимение делает действие: I work, he knows, she called.',
      'Object pronouns используются, когда действие направлено на человека: help me, call him, see her.',
      'После предлогов всегда нужна object form: to me, with him, for her, between us.',
      'I превращается в me после глагола или предлога: call me, with me.',
      'He превращается в him после глагола или предлога: call him, with him.',
      'She и her: she делает действие, her получает действие.',
      'We и us: we делаем, us трогают/нам/с нами.',
      'They и them: they делают, them трогают/им/с ними.',
      'You не меняется: you может быть subject и object.',
    ],
    uk: [
      'Subject pronouns використовуються, коли займенник виконує дію: I work, he knows, she called.',
      'Object pronouns використовуються, коли дія спрямована на людину: help me, call him, see her.',
      'Після прийменників завжди потрібна object form: to me, with him, for her, between us.',
      'I перетворюється на me після дієслова або прийменника: call me, with me.',
      'He перетворюється на him після дієслова або прийменника: call him, with him.',
      'She і her: she виконує дію, her отримує дію.',
      'We і us: we робимо, us зачіпають/нам/з нами.',
      'They і them: they роблять, them зачіпають/їм/з ними.',
      'You не змінюється: you може бути subject і object.',
    ],
    es: [
      'Subject pronouns se usan cuando el pronombre hace la acción: I work, he knows, she called.',
      'Object pronouns se usan cuando la acción afecta a la persona: help me, call him, see her.',
      'Después de preposiciones siempre usamos object form: to me, with him, for her, between us.',
      'I se convierte en me después de verbo o preposición: call me, with me.',
      'He se convierte en him después de verbo o preposición: call him, with him.',
      'She y her: she hace la acción, her recibe la acción.',
      'We y us: we hacemos, us recibe la acción / a nosotros / con nosotros.',
      'They y them: they hacen, them recibe la acción / a ellos / con ellos.',
      'You no cambia: you puede ser subject y object.',
    ],
  },
  examples: [
    { en: 'I called him yesterday.', ru: 'Я позвонил ему вчера.', uk: 'Я подзвонив йому вчора.', es: 'Lo llamé ayer.', why: tri('I делает действие, him получает действие после called.', 'I виконує дію, him отримує дію після called.', 'I hace la acción, him recibe la acción después de called.') },
    { en: 'He called me yesterday.', ru: 'Он позвонил мне вчера.', uk: 'Він подзвонив мені вчора.', es: 'Él me llamó ayer.', why: tri('He делает действие. Me получает действие после called.', 'He виконує дію. Me отримує дію після called.', 'He hace la acción. Me recibe la acción después de called.') },
    { en: 'She helped us.', ru: 'Она помогла нам.', uk: 'Вона допомогла нам.', es: 'Ella nos ayudó.', why: tri('She делает действие. Us получает помощь.', 'She виконує дію. Us отримує допомогу.', 'She hace la acción. Us recibe la ayuda.') },
    { en: 'They invited her.', ru: 'Они пригласили ее.', uk: 'Вони запросили її.', es: 'La invitaron.', why: tri('They делают действие. Her получает действие после invited.', 'They виконують дію. Her отримує дію після invited.', 'They hacen la acción. Her recibe la acción después de invited.') },
    { en: 'This is for me.', ru: 'Это для меня.', uk: 'Це для мене.', es: 'Esto es para mí.', why: tri('После for нужна object form: for me.', 'Після for потрібна object form: for me.', 'Después de for necesitamos object form: for me.') },
    { en: 'I spoke to him.', ru: 'Я поговорил с ним.', uk: 'Я поговорив з ним.', es: 'Hablé con él.', why: tri('После to нужна object form: to him.', 'Після to потрібна object form: to him.', 'Después de to necesitamos object form: to him.') },
    { en: 'Between you and me, this is strange.', ru: 'Между нами говоря, это странно.', uk: 'Між нами кажучи, це дивно.', es: 'Entre tú y yo, esto es raro.', why: tri('После between нужна object form: between you and me.', 'Після between потрібна object form: between you and me.', 'Después de between necesitamos object form: between you and me.') },
    { en: 'You and I need to talk.', ru: 'Нам с тобой нужно поговорить.', uk: 'Нам з тобою потрібно поговорити.', es: 'Tú y yo tenemos que hablar.', why: tri('You and I вместе делают действие need.', 'You and I разом виконують дію need.', 'You and I juntos hacen la acción need.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь пары I/me, he/him, she/her. Это не про перевод, а про роль в предложении.', 'Схоже, ти плутаєш пари I/me, he/him, she/her. Це не про переклад, а про роль у реченні.', 'Parece que confundes pares como I/me, he/him, she/her. No va de traducción, sino del papel en la frase.') },
    { id: 'intro_rule', type: 'rule', text: tri('Кто делает действие - I, he, she, we, they. Кого трогают или после предлога - me, him, her, us, them.', 'Хто виконує дію - I, he, she, we, they. Кого зачіпають або після прийменника - me, him, her, us, them.', 'Quien hace la acción - I, he, she, we, they. A quien afecta la acción o después de preposición - me, him, her, us, them.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не выбирай по переводу автоматически. Сначала найди роль: исполнитель или объект.', 'Не обирай за перекладом автоматично. Спочатку знайди роль: виконавець чи обʼєкт.', 'No elijas automáticamente por traducción. Primero encuentra el papel: sujeto u objeto.') },
  ],
  steps: [
    pronounStep({ id: 'pronoun_case_easy_001', order: 1, difficulty: 'easy', targetSkill: 'subject_i', sentence: '___ called him yesterday.', translation: tri('Я позвонил ему вчера.', 'Я подзвонив йому вчора.', 'Lo llamé ayer.'), options: ['I', 'Me', 'My', 'Mine'], correctAnswer: 'I', correctFeedback: tri('Да. Здесь местоимение делает действие called. Кто позвонил? I.', 'Так. Тут займенник виконує дію called. Хто подзвонив? I.', 'Sí. Aquí el pronombre hace la acción called. Quién llamó? I.'), wrong: { Me: tri('Me используется, когда действие идет на меня: call me. Здесь я сам делаю действие, поэтому I.', 'Me використовується, коли дія спрямована на мене: call me. Тут я сам виконую дію, тому I.', 'Me se usa cuando la acción va hacia mí: call me. Aquí yo hago la acción, por eso I.'), My: tri('My означает "мой" и требует существительное: my phone. Здесь нужен subject: I.', 'My означає "мій" і потребує іменник: my phone. Тут потрібен subject: I.', 'My significa "mi" y necesita sustantivo: my phone. Aquí necesitamos subject: I.'), Mine: tri('Mine означает "мой" без существительного. Здесь нужен тот, кто делает действие: I.', 'Mine означає "мій" без іменника. Тут потрібен той, хто виконує дію: I.', 'Mine significa "mío" sin sustantivo. Aquí necesitamos quien hace la acción: I.') }, retry: [tri('Перед called стоит тот, кто делает действие. Делатель = I.', 'Перед called стоїть той, хто виконує дію. Виконавець = I.', 'Antes de called va quien hace la acción. Hacedor = I.'), tri('Кто позвонил? I.', 'Хто подзвонив? I.', 'Quién llamó? I.'), tri('Подсказка: I called him yesterday.', 'Підказка: I called him yesterday.', 'Pista: I called him yesterday.')], focusWords: ['I', 'him'] }),
    pronounStep({ id: 'pronoun_case_easy_002', order: 2, difficulty: 'easy', targetSkill: 'object_me_after_verb', sentence: 'He called ___ yesterday.', translation: tri('Он позвонил мне вчера.', 'Він подзвонив мені вчора.', 'Él me llamó ayer.'), options: ['I', 'me', 'my', 'mine'], correctAnswer: 'me', correctFeedback: tri('Да. He делает действие, а me получает действие после called.', 'Так. He виконує дію, а me отримує дію після called.', 'Sí. He hace la acción, y me recibe la acción después de called.'), wrong: { I: tri('I используется, когда я делаю действие. Здесь действие идет на меня после called, поэтому me.', 'I використовується, коли я виконую дію. Тут дія спрямована на мене після called, тому me.', 'I se usa cuando yo hago la acción. Aquí la acción va hacia mí después de called, por eso me.'), my: tri('My означает "мой" и требует существительное. После called нужен object pronoun: me.', 'My означає "мій" і потребує іменник. Після called потрібен object pronoun: me.', 'My significa "mi" y necesita sustantivo. Después de called necesitamos object pronoun: me.'), mine: tri('Mine означает "мой" как самостоятельное слово. Здесь нужен объект действия: me.', 'Mine означає "мій" як самостійне слово. Тут потрібен обʼєкт дії: me.', 'Mine significa "mío" como palabra independiente. Aquí necesitamos objeto de la acción: me.') }, retry: [tri('После called нужен тот, кого позвали. Кого? Me.', 'Після called потрібен той, кому подзвонили. Кому? Me.', 'Después de called necesitamos a quien llamaron. A quién? Me.'), tri('Call me. Не call I.', 'Call me. Не call I.', 'Call me. No call I.'), tri('Подсказка: He called me yesterday.', 'Підказка: He called me yesterday.', 'Pista: He called me yesterday.')], focusWords: ['He', 'me'] }),
    pronounStep({ id: 'pronoun_case_easy_003', order: 3, difficulty: 'easy', targetSkill: 'subject_he', sentence: '___ knows the answer.', translation: tri('Он знает ответ.', 'Він знає відповідь.', 'Él sabe la respuesta.'), options: ['He', 'Him', 'His', 'Her'], correctAnswer: 'He', correctFeedback: tri('Да. Местоимение делает действие knows. Кто знает? He.', 'Так. Займенник виконує дію knows. Хто знає? He.', 'Sí. El pronombre hace la acción knows. Quién sabe? He.'), wrong: { Him: tri('Him используется после глагола или предлога: call him, with him. Здесь он сам знает, поэтому he.', 'Him використовується після дієслова або прийменника: call him, with him. Тут він сам знає, тому he.', 'Him se usa después de verbo o preposición: call him, with him. Aquí él sabe, por eso he.'), His: tri('His означает принадлежность: his answer. Здесь нужен subject: he.', 'His означає належність: his answer. Тут потрібен subject: he.', 'His significa posesión: his answer. Aquí necesitamos subject: he.'), Her: tri('Her относится к she как object или possessive. Здесь нужен мужской subject: he.', 'Her належить до she як object або possessive. Тут потрібен чоловічий subject: he.', 'Her pertenece a she como object o possessive. Aquí necesitamos subject masculino: he.') }, retry: [tri('Перед knows стоит тот, кто делает действие. Он делает = he.', 'Перед knows стоїть той, хто виконує дію. Він робить = he.', 'Antes de knows va quien hace la acción. Él hace = he.'), tri('He knows.', 'He knows.', 'He knows.'), tri('Подсказка: He knows the answer.', 'Підказка: He knows the answer.', 'Pista: He knows the answer.')], focusWords: ['He', 'knows'] }),
    pronounStep({ id: 'pronoun_case_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'object_him_after_verb', sentence: 'I know ___.', translation: tri('Я знаю его.', 'Я знаю його.', 'Lo conozco.'), options: ['he', 'him', 'his', "he's"], correctAnswer: 'him', correctFeedback: tri('Да. I делает действие know. Him получает действие после know.', 'Так. I виконує дію know. Him отримує дію після know.', 'Sí. I hace la acción know. Him recibe la acción después de know.'), wrong: { he: tri('He используется, когда он делает действие. После know нужен объект: him.', 'He використовується, коли він виконує дію. Після know потрібен обʼєкт: him.', 'He se usa cuando él hace la acción. Después de know necesitamos objeto: him.'), his: tri('His означает принадлежность: his car. Здесь "знаю его" = know him.', 'His означає належність: his car. Тут "знаю його" = know him.', 'His significa posesión: his car. Aquí "lo conozco" = know him.'), "he's": tri("He's = he is или he has. После know нужен object pronoun: him.", "He's = he is або he has. Після know потрібен object pronoun: him.", "He's = he is o he has. Después de know necesitamos object pronoun: him.") }, retry: [tri('Know кого? Him.', 'Know кого? Him.', 'Know a quién? Him.'), tri('I know him.', 'I know him.', 'I know him.'), tri('Подсказка: I know him.', 'Підказка: I know him.', 'Pista: I know him.')], focusWords: ['I', 'him'] }),
    pronounStep({ id: 'pronoun_case_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'object_her_after_verb', sentence: 'They invited ___.', translation: tri('Они пригласили ее.', 'Вони запросили її.', 'La invitaron.'), options: ['she', 'her', 'hers', "she's"], correctAnswer: 'her', correctFeedback: tri('Да. They делают действие. Her получает действие после invited.', 'Так. They виконують дію. Her отримує дію після invited.', 'Sí. They hacen la acción. Her recibe la acción después de invited.'), wrong: { she: tri('She используется, когда она делает действие. Здесь ее пригласили, поэтому her.', 'She використовується, коли вона виконує дію. Тут її запросили, тому her.', 'She se usa cuando ella hace la acción. Aquí la invitaron a ella, por eso her.'), hers: tri('Hers означает принадлежность без существительного. После invited нужен object pronoun: her.', 'Hers означає належність без іменника. Після invited потрібен object pronoun: her.', 'Hers significa posesión sin sustantivo. Después de invited necesitamos object pronoun: her.'), "she's": tri("She's = she is или she has. После invited нужен object pronoun: her.", "She's = she is або she has. Після invited потрібен object pronoun: her.", "She's = she is o she has. Después de invited necesitamos object pronoun: her.") }, retry: [tri('Invite кого? Her.', 'Invite кого? Her.', 'Invite a quién? Her.'), tri('They invited her.', 'They invited her.', 'They invited her.'), tri('Подсказка: They invited her.', 'Підказка: They invited her.', 'Pista: They invited her.')], focusWords: ['They', 'her'] }),
    pronounStep({ id: 'pronoun_case_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'object_us_after_verb', sentence: 'She helped ___.', translation: tri('Она помогла нам.', 'Вона допомогла нам.', 'Ella nos ayudó.'), options: ['we', 'us', 'our', 'ours'], correctAnswer: 'us', correctFeedback: tri('Да. She делает действие. Us получает помощь после helped.', 'Так. She виконує дію. Us отримує допомогу після helped.', 'Sí. She hace la acción. Us recibe la ayuda después de helped.'), wrong: { we: tri('We используется, когда мы делаем действие. Здесь помогли нам, поэтому us.', 'We використовується, коли ми виконуємо дію. Тут допомогли нам, тому us.', 'We se usa cuando nosotros hacemos la acción. Aquí nos ayudaron a nosotros, por eso us.'), our: tri('Our означает "наш" и требует существительное. Здесь нужен object pronoun: us.', 'Our означає "наш" і потребує іменник. Тут потрібен object pronoun: us.', 'Our significa "nuestro" y necesita sustantivo. Aquí necesitamos object pronoun: us.'), ours: tri('Ours означает "наш" без существительного. Здесь нужен объект действия: us.', 'Ours означає "наш" без іменника. Тут потрібен обʼєкт дії: us.', 'Ours significa "nuestro" sin sustantivo. Aquí necesitamos objeto de la acción: us.') }, retry: [tri('Help кого? Us.', 'Help кого? Us.', 'Help a quién? Us.'), tri('She helped us.', 'She helped us.', 'She helped us.'), tri('Подсказка: She helped us.', 'Підказка: She helped us.', 'Pista: She helped us.')], focusWords: ['She', 'us'] }),
    pronounStep({ id: 'pronoun_case_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'object_after_preposition_me', sentence: 'This message is for ___.', translation: tri('Это сообщение для меня.', 'Це повідомлення для мене.', 'Este mensaje es para mí.'), options: ['I', 'me', 'my', 'mine'], correctAnswer: 'me', correctFeedback: tri('Да. После предлога for нужна object form: for me.', 'Так. Після прийменника for потрібна object form: for me.', 'Sí. Después de la preposición for necesitamos object form: for me.'), wrong: { I: tri('После предлога for нельзя I. После предлогов нужна object form: me.', 'Після прийменника for не можна I. Після прийменників потрібна object form: me.', 'Después de la preposición for no usamos I. Después de preposiciones necesitamos object form: me.'), my: tri('My требует существительное: for my friend. Если без существительного, нужно for me.', 'My потребує іменник: for my friend. Якщо без іменника, потрібно for me.', 'My necesita sustantivo: for my friend. Si no hay sustantivo, necesitamos for me.'), mine: tri('Mine означает "мое". После for, если речь "для меня", нужно me.', 'Mine означає "моє". Після for, якщо йдеться "для мене", потрібно me.', 'Mine significa "mío". Después de for, si quieres decir "para mí", necesitamos me.') }, retry: [tri('После for всегда object form: for me.', 'Після for завжди object form: for me.', 'Después de for siempre object form: for me.'), tri('For me. Не for I.', 'For me. Не for I.', 'For me. No for I.'), tri('Подсказка: This message is for me.', 'Підказка: This message is for me.', 'Pista: This message is for me.')], focusWords: ['for', 'me'] }),
    pronounStep({ id: 'pronoun_case_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'object_after_preposition_him', sentence: 'I spoke to ___.', translation: tri('Я поговорил с ним.', 'Я поговорив з ним.', 'Hablé con él.'), options: ['he', 'him', 'his', "he's"], correctAnswer: 'him', correctFeedback: tri('Да. После предлога to нужна object form: to him.', 'Так. Після прийменника to потрібна object form: to him.', 'Sí. Después de la preposición to necesitamos object form: to him.'), wrong: { he: tri('После to нельзя he. После предлога нужна object form: him.', 'Після to не можна he. Після прийменника потрібна object form: him.', 'Después de to no usamos he. Después de preposición necesitamos object form: him.'), his: tri('His означает принадлежность: his phone. После to нужен him.', 'His означає належність: his phone. Після to потрібен him.', 'His significa posesión: his phone. Después de to necesitamos him.'), "he's": tri("He's = he is или he has. После to нужен object pronoun: him.", "He's = he is або he has. Після to потрібен object pronoun: him.", "He's = he is o he has. Después de to necesitamos object pronoun: him.") }, retry: [tri('После to ставим him, не he.', 'Після to ставимо him, не he.', 'Después de to ponemos him, no he.'), tri('To him.', 'To him.', 'To him.'), tri('Подсказка: I spoke to him.', 'Підказка: I spoke to him.', 'Pista: I spoke to him.')], focusWords: ['to', 'him'] }),
    pronounStep({ id: 'pronoun_case_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'between_you_and_me', sentence: 'Between you and ___, this sounds strange.', translation: tri('Между нами говоря, это звучит странно.', 'Між нами кажучи, це звучить дивно.', 'Entre tú y yo, esto suena raro.'), options: ['I', 'me', 'my', 'mine'], correctAnswer: 'me', correctFeedback: tri('Да. После between нужна object form. Поэтому between you and me.', 'Так. Після between потрібна object form. Тому between you and me.', 'Sí. Después de between necesitamos object form. Por eso between you and me.'), wrong: { I: tri('Between you and I можно услышать, но в стандартной грамматике после between нужна object form: between you and me.', 'Between you and I можна почути, але в стандартній граматиці після between потрібна object form: between you and me.', 'Between you and I se oye a veces, pero en gramática estándar después de between necesitamos object form: between you and me.'), my: tri('My требует существительное после себя. Здесь нужна object form после between: me.', 'My потребує іменник після себе. Тут потрібна object form після between: me.', 'My necesita un sustantivo después. Aquí necesitamos object form después de between: me.'), mine: tri('Mine означает "мое", но после between нужен объект: me.', 'Mine означає "моє", але після between потрібен обʼєкт: me.', 'Mine significa "mío", pero después de between necesitamos objeto: me.') }, retry: [tri('Between - это предлог. После предлога нужна object form: me.', 'Between - це прийменник. Після прийменника потрібна object form: me.', 'Between es preposición. Después de preposición necesitamos object form: me.'), tri('Between you and me.', 'Between you and me.', 'Between you and me.'), tri('Подсказка: Between you and me.', 'Підказка: Between you and me.', 'Pista: Between you and me.')], focusWords: ['between', 'me'] }),
    pronounStep({ id: 'pronoun_case_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'compound_subject_you_and_i', sentence: 'You and ___ need to talk.', translation: tri('Нам с тобой нужно поговорить.', 'Нам з тобою потрібно поговорити.', 'Tú y yo tenemos que hablar.'), options: ['I', 'me', 'my', 'mine'], correctAnswer: 'I', correctFeedback: tri('Да. You and I вместе делают действие need. Это subject position, поэтому I.', 'Так. You and I разом виконують дію need. Це subject position, тому I.', 'Sí. You and I juntos hacen la acción need. Es subject position, por eso I.'), wrong: { me: tri('Me нужен, если действие идет на меня или после предлога. Здесь You and I делают действие need.', 'Me потрібен, якщо дія спрямована на мене або після прийменника. Тут You and I виконують дію need.', 'Me se usa si la acción va hacia mí o después de preposición. Aquí You and I hacen la acción need.'), my: tri('My означает "мой" и требует существительное. Здесь нужен subject: I.', 'My означає "мій" і потребує іменник. Тут потрібен subject: I.', 'My significa "mi" y necesita sustantivo. Aquí necesitamos subject: I.'), mine: tri('Mine означает "мое". Здесь нужен тот, кто делает действие: I.', 'Mine означає "моє". Тут потрібен той, хто виконує дію: I.', 'Mine significa "mío". Aquí necesitamos quien hace la acción: I.') }, retry: [tri('Кто должен поговорить? You and I. Делатели = subject form.', 'Хто має поговорити? You and I. Виконавці = subject form.', 'Quién necesita hablar? You and I. Hacedores = subject form.'), tri('You and I need.', 'You and I need.', 'You and I need.'), tri('Подсказка: You and I need to talk.', 'Підказка: You and I need to talk.', 'Pista: You and I need to talk.')], focusWords: ['You', 'I'] }),
    pronounStep({ id: 'pronoun_case_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'compound_object_you_and_me', sentence: 'This is important for you and ___.', translation: tri('Это важно для нас с тобой.', 'Це важливо для нас з тобою.', 'Esto es importante para ti y para mí.'), options: ['I', 'me', 'my', 'mine'], correctAnswer: 'me', correctFeedback: tri('Да. После предлога for нужна object form. Поэтому for you and me.', 'Так. Після прийменника for потрібна object form. Тому for you and me.', 'Sí. Después de la preposición for necesitamos object form. Por eso for you and me.'), wrong: { I: tri('После for нельзя I. Вся пара стоит после предлога, поэтому you and me.', 'Після for не можна I. Уся пара стоїть після прийменника, тому you and me.', 'Después de for no usamos I. Toda la pareja va después de preposición, por eso you and me.'), my: tri('My требует существительное. Здесь нужен object pronoun после for: me.', 'My потребує іменник. Тут потрібен object pronoun після for: me.', 'My necesita sustantivo. Aquí necesitamos object pronoun después de for: me.'), mine: tri('Mine означает "мое". Здесь смысл "для меня", поэтому me.', 'Mine означає "моє". Тут зміст "для мене", тому me.', 'Mine significa "mío". Aquí el sentido es "para mí", por eso me.') }, retry: [tri('For кого? For you and me.', 'For кого? For you and me.', 'For a quién? For you and me.'), tri('After for = me.', 'After for = me.', 'After for = me.'), tri('Подсказка: for you and me.', 'Підказка: for you and me.', 'Pista: for you and me.')], focusWords: ['for', 'me'] }),
    pronounStep({ id: 'pronoun_case_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'subject_they_object_them', sentence: '___ helped me, so I thanked ___.', translation: tri('Они помогли мне, поэтому я поблагодарил их.', 'Вони допомогли мені, тому я подякував їм.', 'Ellos me ayudaron, así que les di las gracias.'), options: ['They / them', 'Them / they', 'They / they', 'Them / them'], correctAnswer: 'They / them', correctFeedback: tri('Да. They делают действие helped. Them получают действие thanked.', 'Так. They виконують дію helped. Them отримують дію thanked.', 'Sí. They hacen la acción helped. Them reciben la acción thanked.'), wrong: { 'Them / they': tri('Логика перевернута. В начале они делают действие, поэтому they. После thanked они объект, поэтому them.', 'Логіка перевернута. На початку вони виконують дію, тому they. Після thanked вони обʼєкт, тому them.', 'La lógica está invertida. Al principio hacen la acción, por eso they. Después de thanked son objeto, por eso them.'), 'They / they': tri('Первая часть правильная, но после thanked нужен object pronoun: them.', 'Перша частина правильна, але після thanked потрібен object pronoun: them.', 'La primera parte está bien, pero después de thanked necesitamos object pronoun: them.'), 'Them / them': tri('Вторая часть правильная, но в начале нужен subject pronoun: They helped me.', 'Друга частина правильна, але на початку потрібен subject pronoun: They helped me.', 'La segunda parte está bien, pero al principio necesitamos subject pronoun: They helped me.') }, retry: [tri('Кто помог? They. Кого поблагодарил? Them.', 'Хто допоміг? They. Кого подякував? Them.', 'Quién ayudó? They. A quién agradecí? Them.'), tri('They do. Them receive.', 'They do. Them receive.', 'They do. Them receive.'), tri('Подсказка: They helped me, so I thanked them.', 'Підказка: They helped me, so I thanked them.', 'Pista: They helped me, so I thanked them.')], focusWords: ['They', 'them'] }),
    pronounStep({ id: 'pronoun_case_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_he_him', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Elige la oración correcta.'), options: ['Him called me.', 'He called I.', 'He called me.', 'Him called I.'], correctAnswer: 'He called me.', correctFeedback: tri('Да. He делает действие called. Me получает действие.', 'Так. He виконує дію called. Me отримує дію.', 'Sí. He hace la acción called. Me recibe la acción.'), wrong: { 'Him called me.': tri('Him не может быть обычным subject перед called. Если он делает действие, нужен he.', 'Him не може бути звичайним subject перед called. Якщо він виконує дію, потрібен he.', 'Him no puede ser subject normal antes de called. Si él hace la acción, necesitamos he.'), 'He called I.': tri('He правильный как subject, но после called нужен me, не I.', 'He правильний як subject, але після called потрібен me, не I.', 'He está bien como subject, pero después de called necesitamos me, no I.'), 'Him called I.': tri('Обе формы перепутаны. Делатель = he. Объект после called = me.', 'Обидві форми переплутані. Виконавець = he. Обʼєкт після called = me.', 'Ambas formas están confundidas. Hacedor = he. Objeto después de called = me.') }, retry: [tri('Кто звонил? He. Кому? Me.', 'Хто дзвонив? He. Кому? Me.', 'Quién llamó? He. A quién? Me.'), tri('He called me.', 'He called me.', 'He called me.'), tri('Подсказка: He called me.', 'Підказка: He called me.', 'Pista: He called me.')], focusWords: ['He', 'me'] }),
    pronounStep({ id: 'pronoun_case_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'after_preposition_them', sentence: 'I went with ___.', translation: tri('Я пошел с ними.', 'Я пішов з ними.', 'Fui con ellos.'), options: ['they', 'them', 'their', 'theirs'], correctAnswer: 'them', correctFeedback: tri('Да. После предлога with нужна object form: with them.', 'Так. Після прийменника with потрібна object form: with them.', 'Sí. Después de la preposición with necesitamos object form: with them.'), wrong: { they: tri('They используется как subject. После with нужен object pronoun: them.', 'They використовується як subject. Після with потрібен object pronoun: them.', 'They se usa como subject. Después de with necesitamos object pronoun: them.'), their: tri('Their означает принадлежность: their car. После with нужен them.', 'Their означає належність: their car. Після with потрібен them.', 'Their significa posesión: their car. Después de with necesitamos them.'), theirs: tri('Theirs означает самостоятельное притяжательное слово. Здесь нужно with them.', 'Theirs означає самостійне присвійне слово. Тут потрібно with them.', 'Theirs significa posesivo independiente. Aquí necesitamos with them.') }, retry: [tri('After with = object form. They становится them.', 'After with = object form. They стає them.', 'After with = object form. They se vuelve them.'), tri('With them.', 'With them.', 'With them.'), tri('Подсказка: I went with them.', 'Підказка: I went with them.', 'Pista: I went with them.')], focusWords: ['with', 'them'] }),
    pronounStep({ id: 'pronoun_case_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_subject_object_pair', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Elige la pareja correcta.'), options: ['She knows him / He knows her', 'Her knows he / Him knows she', 'She knows he / He knows she', 'Her knows him / Him knows her'], correctAnswer: 'She knows him / He knows her', correctFeedback: tri('Да. She и he делают действие. Him и her получают действие после knows.', 'Так. She і he виконують дію. Him і her отримують дію після knows.', 'Sí. She y he hacen la acción. Him y her reciben la acción después de knows.'), wrong: { 'Her knows he / Him knows she': tri('Her и him не должны быть subject здесь. Перед knows нужны she/he. После knows нужны him/her.', 'Her і him не мають бути subject тут. Перед knows потрібні she/he. Після knows потрібні him/her.', 'Her y him no deben ser subject aquí. Antes de knows necesitamos she/he. Después de knows necesitamos him/her.'), 'She knows he / He knows she': tri('Subject формы she/he в начале правильные. Но после knows нужны object формы: him/her.', 'Subject forms she/he на початку правильні. Але після knows потрібні object forms: him/her.', 'Las formas subject she/he al principio están bien. Pero después de knows necesitamos object forms: him/her.'), 'Her knows him / Him knows her': tri('В начале предложения нужны subject forms: she/he. Object формы him/her используются после глагола.', 'На початку речення потрібні subject forms: she/he. Object forms him/her використовуються після дієслова.', 'Al principio de la frase necesitamos subject forms: she/he. Object forms him/her se usan después del verbo.') }, retry: [tri('Перед knows - тот, кто знает: she/he. После knows - кого знают: him/her.', 'Перед knows - той, хто знає: she/he. Після knows - кого знають: him/her.', 'Antes de knows - quien conoce: she/he. Después de knows - a quien conocen: him/her.'), tri('She knows him. He knows her.', 'She knows him. He knows her.', 'She knows him. He knows her.'), tri('Подсказка: She knows him / He knows her.', 'Підказка: She knows him / He knows her.', 'Pista: She knows him / He knows her.')], focusWords: ['She', 'him', 'He', 'her'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['subject_object_confusion', 'after_verb_object_error', 'after_preposition_subject_error', 'compound_subject_error', 'between_you_and_me_error', 'he_him_error', 'she_her_error', 'we_us_error', 'they_them_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем роль местоимения в предложении.', 'Звичайне пояснення: показуємо роль займенника в реченні.', 'Explicación normal: mostramos el papel del pronombre en la frase.'),
    depth2: tri('Проще: сводим выбор к вопросу "кто делает?" или "кого/кому?".', 'Простіше: зводимо вибір до питання "хто робить?" або "кого/кому?".', 'Más simple: reducimos la elección a "quién hace?" o "a quién?".'),
    depth3: tri('Еще проще: показываем готовые пары I/me, he/him, they/them.', 'Ще простіше: показуємо готові пари I/me, he/him, they/them.', 'Aún más simple: mostramos pares listos I/me, he/him, they/them.'),
    depth4: tri('Почти подсказка: прямо указываем, нужна subject form или object form.', 'Майже підказка: прямо вказуємо, потрібна subject form чи object form.', 'Casi pista: indicamos directamente si necesitas subject form u object form.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Найди роль местоимения. Оно делает действие? Тогда I/he/she/we/they. Оно стоит после глагола или предлога? Тогда me/him/her/us/them.', 'Зупинись. Знайди роль займенника. Він виконує дію? Тоді I/he/she/we/they. Він стоїть після дієслова або прийменника? Тоді me/him/her/us/them.', 'Detente. Encuentra el papel del pronombre. Hace la acción? Entonces I/he/she/we/they. Está después de verbo o preposición? Entonces me/him/her/us/them.') },
    afterThreeWrongInSameExercise: { action: 'show_pronoun_role_hint_then_retry', card: tri('Система покажет, местоимение здесь subject или object, но не выберет форму за пользователя.', 'Система покаже, займенник тут subject чи object, але не вибере форму за користувача.', 'El sistema mostrará si el pronombre aquí es subject u object, pero no elegirá la forma.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери роль - делает действие или получает действие. Потом вернемся к местоимению.', 'Режим підказки: спочатку обери роль - виконує дію чи отримує дію. Потім повернемося до займенника.', 'Modo guiado: primero elige el papel - hace la acción o recibe la acción. Luego volvemos al pronombre.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_pronoun_case_001', prompt: tri('В предложении ___ called him местоимение перед called делает действие?', 'У реченні ___ called him займенник перед called виконує дію?', 'En ___ called him, el pronombre antes de called hace la acción?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'pronoun_case_easy_001' },
      { id: 'guided_pronoun_case_002', prompt: tri('В фразе He called ___ местоимение после called получает действие?', 'У фразі He called ___ займенник після called отримує дію?', 'En He called ___, el pronombre después de called recibe la acción?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'pronoun_case_easy_002' },
      { id: 'guided_pronoun_case_003', prompt: tri('После предлога for нужна subject form или object form?', 'Після прийменника for потрібна subject form чи object form?', 'Después de la preposición for necesitamos subject form u object form?'), options: ['subject form', 'object form'], correctIndex: 1, thenReturnToExerciseId: 'pronoun_case_contrast_004' },
      { id: 'guided_pronoun_case_004', prompt: tri('В фразе You and ___ need to talk вся пара делает действие need?', 'У фразі You and ___ need to talk вся пара виконує дію need?', 'En You and ___ need to talk, toda la pareja hace la acción need?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'pronoun_case_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'pronoun',
    microDiagnosisId: 'pronoun_case',
    diagnosisLabel: tri('Subject / Object Pronouns', 'Subject / Object Pronouns', 'Subject / Object Pronouns'),
    contrastSet: ['I/me', 'he/him', 'she/her', 'we/us', 'they/them', 'you'],
    focusWords: ['I', 'me', 'he', 'him', 'she', 'her', 'we', 'us', 'they', 'them'],
    focusPatterns: ['subject_i', 'object_me_after_verb', 'subject_he', 'object_him_after_verb', 'object_her_after_verb', 'object_us_after_verb', 'object_after_preposition_me', 'object_after_preposition_him', 'between_you_and_me', 'compound_subject_you_and_i', 'compound_object_you_and_me', 'subject_they_object_them', 'mixed_he_him', 'after_preposition_them', 'mixed_subject_object_pair'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_pronoun_case_start',
    answer: 'diagnosis_training_pronoun_case_answer',
    mastery: 'diagnosis_training_pronoun_case_mastery',
    fallback: 'diagnosis_training_pronoun_case_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'pronoun', microDiagnosisId: 'pronoun_case', contrastSet: ['I/me', 'he/him', 'she/her', 'we/us', 'they/them', 'you'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logPronounRole: true, logPronounCase: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=pronoun&microDiagnosisId=pronoun_case',
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



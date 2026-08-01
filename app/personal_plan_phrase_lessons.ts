import type { LessonPhrase, LessonTeachingNote, LessonWord } from './lesson_data_types';
import { getPlanById, type PersonalPlanId } from './personal_plan_catalog';
import { buildPhraseExplanation } from './personal_plan_phrase_explanation';
import {
  buildGavanWeek1CanonicalPlan,
  type GavanCanonicalDay,
  type GavanCanonicalPhrase,
} from './personal_plan_gavan_week1_canonical_plan';
import { resolveBundledCompatibilityPlanContentPhraseLesson } from './plan_content_readiness';
import { contentDayToLessonPhrases } from './plan_content_runtime_adapter';

export type PersonalPlanPhraseLesson = {
  id: string;
  planId: PersonalPlanId;
  title: string;
  subtitle: string;
  afterLessonId: number;
  rationale: string;
  phrases: LessonPhrase[];
};

type NoteTranslations = {
  titleUk?: string;
  titleEs?: string;
  correctUk?: string;
  correctEs?: string;
  wrongUk?: string;
  wrongEs?: string;
};

// titleUk/titleEs/correctUk/correctEs/wrongUk/wrongEs are all optional on
// LessonTeachingNote, and the UI falls back to the russian note when they are
// absent. Do NOT default them to the russian text — that masquerades russian as a
// real uk/es translation. Pass real translations via `translations` when
// available; otherwise leave them undefined.
function note(
  id: string,
  titleRu: string,
  correctRu: string,
  wrongRu: string,
  translations: NoteTranslations = {},
) {
  return {
    id,
    titleRu,
    correctRu,
    wrongRu,
    ...(translations.titleUk ? { titleUk: translations.titleUk } : {}),
    ...(translations.titleEs ? { titleEs: translations.titleEs } : {}),
    ...(translations.correctUk ? { correctUk: translations.correctUk } : {}),
    ...(translations.correctEs ? { correctEs: translations.correctEs } : {}),
    ...(translations.wrongUk ? { wrongUk: translations.wrongUk } : {}),
    ...(translations.wrongEs ? { wrongEs: translations.wrongEs } : {}),
  };
}

const toBeNote = note(
  'gavan_d1_to_be_short',
  'Коротко и спокойно',
  'В английском в такой фразе нужен маленький глагол-связка: I am, You are, It is. В живой речи это часто сжимается до I’m, You’re, It’s.',
  'Если убрать am / are / is, английская фраза звучит как недособранная. По-русски можно сказать короче, а в английском связку лучше оставить.',
);

const clearNote = note(
  'gavan_d1_clear',
  'Clear = понятно',
  'Clear здесь значит “понятно / ясно”. It’s not clear — мягкий способ сказать, что мысль пока не разобралась.',
  'Clear не про чистоту стола. В разговоре это часто про ясность: понятно человеку или нет.',
);

const hereNote = note(
  'gavan_d1_here',
  'Here = здесь',
  'Here помогает коротко обозначить присутствие: I’m here. Без объяснений на три этажа.',
  'Here легко спутать с hear на слух. В этой фразе нужен here — место, где ты находишься.',
);

export const PERSONAL_PLAN_PHRASE_LESSONS: Record<string, PersonalPlanPhraseLesson> = {
  gavan_day1_short_replies: {
    id: 'gavan_day1_short_replies',
    planId: 'gavan',
    title: 'Короткие ответы',
    subtitle: 'Фразы, которые помогают ответить спокойно и не раздувать разговор.',
    afterLessonId: 1,
    rationale: 'Сначала урок 1 дает I am / You are / It is. Здесь те же конструкции работают в обычных коротких ответах.',
    phrases: [
      {
        id: 'gavan_d1_phrase_1',
        english: "I'm here.",
        russian: 'Я здесь.',
        ukrainian: 'Я тут.',
        spanish: 'Я здесь.',
        words: [
          { text: "I'm", correct: "I'm", distractors: ["You're", "He's", "We're", "It's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'here', correct: 'here', distractors: ['hear', 'there', 'her', 'where'], category: 'place', teachingNote: hereNote },
        ],
      },
      {
        id: 'gavan_d1_phrase_2',
        english: "I'm okay.",
        russian: 'Я в порядке.',
        ukrainian: 'Я в порядку.',
        spanish: 'Я в порядке.',
        words: [
          { text: "I'm", correct: "I'm", distractors: ["You're", "He's", "We're", "It's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'okay', correct: 'okay', distractors: ['ready', 'right', 'busy', 'safe'], category: 'adjective', teachingNote: note('gavan_d1_okay', 'Okay = нормально', 'Okay — простой способ сказать, что все нормально. Не торжественно, не сухо, просто понятно.', 'Okay не значит “идеально”. Это спокойное “нормально / все в порядке”.') },
        ],
      },
      {
        id: 'gavan_d1_phrase_3',
        english: "It's okay.",
        russian: 'Все нормально.',
        ukrainian: 'Все нормально.',
        spanish: 'Все нормально.',
        words: [
          { text: "It's", correct: "It's", distractors: ["I'm", "You're", "We're", "He's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'okay', correct: 'okay', distractors: ['ready', 'right', 'busy', 'safe'], category: 'adjective', teachingNote: note('gavan_d1_it_okay', 'It’s okay', 'It’s okay — короткое “все нормально”. Подходит, когда не хочется звучать драматично.', 'It’s здесь не “это” в тяжелом смысле. Это обычная связка для короткой оценки ситуации.') },
        ],
      },
      {
        id: 'gavan_d1_phrase_4',
        english: "It's not clear.",
        russian: 'Пока непонятно.',
        ukrainian: 'Поки незрозуміло.',
        spanish: 'Пока непонятно.',
        words: [
          { text: "It's", correct: "It's", distractors: ["I'm", "You're", "We're", "He's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'not', correct: 'not', distractors: ['now', 'no', 'note', 'none'], category: 'negative', teachingNote: note('gavan_d1_not', 'Not = не', 'Not ставит спокойное отрицание: it’s clear — понятно, it’s not clear — непонятно.', 'Not нельзя заменить на no внутри такой фразы. No обычно отдельный ответ, а not работает внутри предложения.') },
          { text: 'clear', correct: 'clear', distractors: ['clean', 'close', 'cheap', 'calm'], category: 'adjective', teachingNote: clearNote },
        ],
      },
      {
        id: 'gavan_d1_phrase_5',
        english: "You're right.",
        russian: 'Вы правы.',
        ukrainian: 'Ви праві.',
        spanish: 'Вы правы.',
        words: [
          { text: "You're", correct: "You're", distractors: ["I'm", "He's", "We're", "It's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'right', correct: 'right', distractors: ['write', 'ready', 'wrong', 'bright'], category: 'adjective', teachingNote: note('gavan_d1_right', 'Right = правы', 'You’re right — короткое согласие без лишней церемонии. Хорошая фраза, когда человек объяснил верно.', 'Right здесь не “право” и не направление. В этой фразе это “прав / права / правы”.') },
        ],
      },
    ],
  },
};

const GAVAN_WEEK1_CANONICAL_MEDIA_LESSON_RE = /^gavan_week1_day([1-7])_canonical_media$/;
const GENERATED_PLAN_PHRASE_LESSON_RE = /^(voyazh|mitap|gavan|impuls|echo)_d(\d{3})_content_unit$/;

type GeneratedPhraseTemplate = {
  english: string;
  russian: string;
  ukrainian?: string;
  spanish?: string;
};

const GENERATED_PLAN_PHRASE_TEMPLATES: Record<PersonalPlanId, GeneratedPhraseTemplate[]> = {
  voyazh: [
    { english: 'I need some help.', russian: 'Мне нужна помощь.', ukrainian: 'Мені потрібна допомога.', spanish: 'Necesito ayuda.' },
    { english: 'Where is the entrance?', russian: 'Где вход?', ukrainian: 'Де вхід?', spanish: '¿Dónde está la entrada?' },
    { english: 'Can you show me?', russian: 'Можете показать?', ukrainian: 'Можете показати?', spanish: '¿Puede mostrarme?' },
    { english: 'I have a booking.', russian: 'У меня есть бронь.', ukrainian: 'У мене є бронювання.', spanish: 'Tengo una reserva.' },
    { english: 'How much is it?', russian: 'Сколько это стоит?', ukrainian: 'Скільки це коштує?', spanish: '¿Cuánto cuesta?' },
    { english: 'I need a receipt.', russian: 'Мне нужен чек.', ukrainian: 'Мені потрібен чек.', spanish: 'Necesito un recibo.' },
  ],
  mitap: [
    { english: 'The next step is clear.', russian: 'Следующий шаг понятен.', ukrainian: 'Наступний крок зрозумілий.', spanish: 'El siguiente paso está claro.' },
    { english: 'I will send the summary.', russian: 'Я отправлю краткое резюме.', ukrainian: 'Я надішлю коротке резюме.', spanish: 'Enviaré el resumen.' },
    { english: 'We need one owner.', russian: 'Нам нужен один ответственный.', ukrainian: 'Нам потрібен один відповідальний.', spanish: 'Necesitamos un responsable.' },
    { english: 'Can we confirm the deadline?', russian: 'Можем подтвердить срок?', ukrainian: 'Можемо підтвердити дедлайн?', spanish: '¿Podemos confirmar el plazo?' },
    { english: 'I will follow up today.', russian: 'Я вернусь с ответом сегодня.', ukrainian: 'Я повернусь із відповіддю сьогодні.', spanish: 'Haré seguimiento hoy.' },
    { english: 'Let us keep this short.', russian: 'Давайте коротко.', ukrainian: 'Давайте коротко.', spanish: 'Seamos breves.' },
  ],
  gavan: [
    { english: 'I am here.', russian: 'Я здесь.', ukrainian: 'Я тут.', spanish: 'Estoy aquí.' },
    { english: 'It is not clear.', russian: 'Пока непонятно.', ukrainian: 'Поки незрозуміло.', spanish: 'No está claro.' },
    { english: 'I need this form.', russian: 'Мне нужна эта форма.', ukrainian: 'Мені потрібна ця форма.', spanish: 'Necesito este formulario.' },
    { english: 'Can you check it?', russian: 'Можете проверить?', ukrainian: 'Можете перевірити?', spanish: '¿Puede revisarlo?' },
    { english: 'The address is correct.', russian: 'Адрес верный.', ukrainian: 'Адреса правильна.', spanish: 'La dirección es correcta.' },
    { english: 'I will bring it tomorrow.', russian: 'Я принесу это завтра.', ukrainian: 'Я принесу це завтра.', spanish: 'Lo traeré mañana.' },
  ],
  impuls: [
    { english: 'I think it works.', russian: 'Думаю, это работает.', ukrainian: 'Думаю, це працює.', spanish: 'Creo que funciona.' },
    { english: 'I need a moment.', russian: 'Мне нужна минутка.', ukrainian: 'Мені потрібна хвилинка.', spanish: 'Necesito un momento.' },
    { english: 'That makes sense.', russian: 'Это логично.', ukrainian: 'Це логічно.', spanish: 'Tiene sentido.' },
    { english: 'Let me say it again.', russian: 'Скажу еще раз.', ukrainian: 'Скажу ще раз.', spanish: 'Déjame decirlo de nuevo.' },
    { english: 'Because it is faster.', russian: 'Потому что так быстрее.', ukrainian: 'Бо так швидше.', spanish: 'Porque es más rápido.' },
    { english: 'I can explain briefly.', russian: 'Я могу коротко объяснить.', ukrainian: 'Я можу коротко пояснити.', spanish: 'Puedo explicarlo brevemente.' },
  ],
  echo: [
    { english: 'I heard the main word.', russian: 'Я услышал главное слово.', ukrainian: 'Я почув головне слово.', spanish: 'Escuché la palabra principal.' },
    { english: 'Can you repeat that?', russian: 'Можете повторить?', ukrainian: 'Можете повторити?', spanish: '¿Puede repetir eso?' },
    { english: 'I missed the time.', russian: 'Я пропустил время.', ukrainian: 'Я пропустив час.', spanish: 'No escuché la hora.' },
    { english: 'The place is clear.', russian: 'Место понятно.', ukrainian: 'Місце зрозуміле.', spanish: 'El lugar está claro.' },
    { english: 'Please say it slower.', russian: 'Скажите медленнее, пожалуйста.', ukrainian: 'Скажіть повільніше, будь ласка.', spanish: 'Por favor, hable más despacio.' },
    { english: 'I can answer now.', russian: 'Я могу ответить сейчас.', ukrainian: 'Я можу відповісти зараз.', spanish: 'Puedo responder ahora.' },
  ],
};

const GENERATED_DAY1_PHRASE_TEMPLATES: Partial<Record<string, GeneratedPhraseTemplate[]>> = {
  mitap_d001_content_unit: [
    { english: 'The next steps are clear.', russian: 'Следующие шаги понятны.', ukrainian: 'Наступні кроки зрозумілі.', spanish: 'Los próximos pasos están claros.' },
    { english: 'I will send the next steps.', russian: 'Я отправлю следующие шаги.', ukrainian: 'Я надішлю наступні кроки.', spanish: 'Enviaré los próximos pasos.' },
    { english: 'We need one owner.', russian: 'Нам нужен один ответственный.', ukrainian: 'Нам потрібен один відповідальний.', spanish: 'Necesitamos un responsable.' },
    { english: 'The deadline is today.', russian: 'Срок сегодня.', ukrainian: 'Дедлайн сьогодні.', spanish: 'El plazo es hoy.' },
    { english: 'I will follow up after the call.', russian: 'Я вернусь с ответом после звонка.', ukrainian: 'Я повернусь із відповіддю після дзвінка.', spanish: 'Haré seguimiento después de la llamada.' },
    { english: 'Let us keep the summary short.', russian: 'Давайте оставим резюме коротким.', ukrainian: 'Давайте залишимо резюме коротким.', spanish: 'Mantengamos el resumen breve.' },
  ],
  mitap_d002_content_unit: [
    { english: 'My update is short.', russian: 'Мой апдейт короткий.', ukrainian: 'Моє оновлення коротке.', spanish: 'Mi actualización es breve.' },
    { english: 'The first task is done.', russian: 'Первая задача готова.', ukrainian: 'Перше завдання виконано.', spanish: 'La primera tarea está hecha.' },
    { english: 'I am working on the next part.', russian: 'Я работаю над следующей частью.', ukrainian: 'Я працюю над наступною частиною.', spanish: 'Estoy trabajando en la siguiente parte.' },
    { english: 'I have one small blocker.', russian: 'У меня есть один небольшой блокер.', ukrainian: 'У мене є один невеликий блокер.', spanish: 'Tengo un pequeño obstáculo.' },
    { english: 'I need ten more minutes.', russian: 'Мне нужно еще десять минут.', ukrainian: 'Мені потрібно ще десять хвилин.', spanish: 'Necesito diez minutos más.' },
    { english: 'I will share the result today.', russian: 'Я поделюсь результатом сегодня.', ukrainian: 'Я поділюся результатом сьогодні.', spanish: 'Compartiré el resultado hoy.' },
  ],
  mitap_d003_content_unit: [
    { english: 'The next steps are clear.', russian: 'Следующие шаги понятны.', ukrainian: 'Наступні кроки зрозумілі.', spanish: 'Los próximos pasos están claros.' },
    { english: 'I will send the next steps.', russian: 'Я отправлю следующие шаги.', ukrainian: 'Я надішлю наступні кроки.', spanish: 'Enviaré los próximos pasos.' },
    { english: 'We need one owner.', russian: 'Нам нужен один ответственный.', ukrainian: 'Нам потрібен один відповідальний.', spanish: 'Necesitamos un responsable.' },
    { english: 'The deadline is Friday.', russian: 'Срок в пятницу.', ukrainian: 'Дедлайн у п\'ятницю.', spanish: 'El plazo es el viernes.' },
    { english: 'I will confirm it today.', russian: 'Я подтвержу это сегодня.', ukrainian: 'Я підтверджу це сьогодні.', spanish: 'Lo confirmaré hoy.' },
    { english: 'Let us keep the summary short.', russian: 'Давайте оставим резюме коротким.', ukrainian: 'Давайте залишимо резюме коротким.', spanish: 'Mantengamos el resumen breve.' },
  ],
  mitap_d004_content_unit: [
    { english: 'Can I check the status?', russian: 'Могу я уточнить статус?', ukrainian: 'Можу я уточнити статус?', spanish: '¿Puedo revisar el estado?' },
    { english: 'Is this still on track?', russian: 'Это все еще по плану?', ukrainian: 'Це все ще за планом?', spanish: '¿Seguimos en el plan?' },
    { english: 'I need a quick update.', russian: 'Мне нужен короткий апдейт.', ukrainian: 'Мені потрібне коротке оновлення.', spanish: 'Necesito una actualización rápida.' },
    { english: 'What is the main blocker?', russian: 'Что сейчас главный блокер?', ukrainian: 'Що зараз головний блокер?', spanish: '¿Cuál es el principal obstáculo?' },
    { english: 'I can help with the next step.', russian: 'Я могу помочь со следующим шагом.', ukrainian: 'Я можу допомогти з наступним кроком.', spanish: 'Puedo ayudar con el siguiente paso.' },
    { english: 'Let us close this today.', russian: 'Давайте закроем это сегодня.', ukrainian: 'Давайте закриємо це сьогодні.', spanish: 'Cerremos esto hoy.' },
  ],
  mitap_d005_content_unit: [
    { english: 'Can we confirm the deadline?', russian: 'Можем подтвердить срок?', ukrainian: 'Можемо підтвердити дедлайн?', spanish: '¿Podemos confirmar el plazo?' },
    { english: 'When is this due?', russian: 'Когда это нужно сдать?', ukrainian: 'Коли це потрібно здати?', spanish: '¿Cuándo hay que entregar esto?' },
    { english: 'Is Friday still okay?', russian: 'Пятница все еще подходит?', ukrainian: 'П\'ятниця ще підходить?', spanish: '¿El viernes sigue bien?' },
    { english: 'I need the final date.', russian: 'Мне нужна финальная дата.', ukrainian: 'Мені потрібна остаточна дата.', spanish: 'Necesito la fecha final.' },
    { english: 'Can we move the deadline?', russian: 'Можем перенести срок?', ukrainian: 'Можемо перенести дедлайн?', spanish: '¿Podemos mover el plazo?' },
    { english: 'I will send it by Friday.', russian: 'Я отправлю это к пятнице.', ukrainian: 'Я надішлю це до п\'ятниці.', spanish: 'Lo enviaré antes del viernes.' },
  ],
  mitap_d006_content_unit: [
    { english: 'There is a small mistake.', russian: 'Есть небольшая ошибка.', ukrainian: 'Є невелика помилка.', spanish: 'Hay un pequeño error.' },
    { english: 'This is the wrong file.', russian: 'Это не тот файл.', ukrainian: 'Це не той файл.', spanish: 'Este no es el archivo correcto.' },
    { english: 'I need to fix the number.', russian: 'Мне нужно исправить число.', ukrainian: 'Мені потрібно виправити число.', spanish: 'Necesito corregir el número.' },
    { english: 'Can I send the updated version?', russian: 'Могу я отправить обновленную версию?', ukrainian: 'Можу я надіслати оновлену версію?', spanish: '¿Puedo enviar la versión actualizada?' },
    { english: 'Please use the latest version.', russian: 'Пожалуйста, используйте последнюю версию.', ukrainian: 'Будь ласка, використовуйте останню версію.', spanish: 'Por favor, use la versión más reciente.' },
    { english: 'I will correct it now.', russian: 'Я исправлю это сейчас.', ukrainian: 'Я виправлю це зараз.', spanish: 'Lo corregiré ahora.' },
  ],
  mitap_d007_content_unit: [
    { english: 'The next steps are clear.', russian: 'Следующие шаги понятны.', ukrainian: 'Наступні кроки зрозумілі.', spanish: 'Los próximos pasos están claros.' },
    { english: 'I need a quick update.', russian: 'Мне нужен короткий апдейт.', ukrainian: 'Мені потрібне коротке оновлення.', spanish: 'Necesito una actualización rápida.' },
    { english: 'Can we confirm the deadline?', russian: 'Можем подтвердить срок?', ukrainian: 'Можемо підтвердити дедлайн?', spanish: '¿Podemos confirmar el plazo?' },
    { english: 'I have one small blocker.', russian: 'У меня есть один небольшой блокер.', ukrainian: 'У мене є один невеликий блокер.', spanish: 'Tengo un pequeño obstáculo.' },
    { english: 'There is a small mistake.', russian: 'Есть небольшая ошибка.', ukrainian: 'Є невелика помилка.', spanish: 'Hay un pequeño error.' },
    { english: 'Please use the latest version.', russian: 'Пожалуйста, используйте последнюю версию.', ukrainian: 'Будь ласка, використовуйте останню версію.', spanish: 'Por favor, use la versión más reciente.' },
  ],
  mitap_d008_content_unit: [
    { english: 'Can I take the next action?', russian: 'Могу я взять следующее действие?', ukrainian: 'Можу я взяти наступну дію?', spanish: '¿Puedo encargarme de la siguiente acción?' },
    { english: 'I need more context first.', russian: 'Мне сначала нужно больше контекста.', ukrainian: 'Мені спочатку потрібно більше контексту.', spanish: 'Primero necesito más contexto.' },
    { english: 'What should I prioritize today?', russian: 'Что мне сегодня поставить в приоритет?', ukrainian: 'Що мені сьогодні поставити в пріоритет?', spanish: '¿Qué debo priorizar hoy?' },
    { english: 'I can send a short summary.', russian: 'Я могу отправить короткое резюме.', ukrainian: 'Я можу надіслати коротке резюме.', spanish: 'Puedo enviar un resumen breve.' },
    { english: 'Please confirm the main owner.', russian: 'Пожалуйста, подтвердите главного ответственного.', ukrainian: 'Будь ласка, підтвердіть головного відповідального.', spanish: 'Por favor, confirme el responsable principal.' },
    { english: 'I will follow up after the call.', russian: 'Я напишу после созвона.', ukrainian: 'Я напишу після дзвінка.', spanish: 'Haré seguimiento después de la llamada.' },
  ],
  mitap_d009_content_unit: [
    { english: 'Can we clarify the scope?', russian: 'Можем уточнить объем задачи?', ukrainian: 'Можемо уточнити обсяг завдання?', spanish: '¿Podemos aclarar el alcance?' },
    { english: 'What is included in this task?', russian: 'Что входит в эту задачу?', ukrainian: 'Що входить до цього завдання?', spanish: '¿Qué incluye esta tarea?' },
    { english: 'I need one example first.', russian: 'Мне сначала нужен один пример.', ukrainian: 'Мені спочатку потрібен один приклад.', spanish: 'Primero necesito un ejemplo.' },
    { english: 'Please send the current brief.', russian: 'Пожалуйста, пришлите текущий бриф.', ukrainian: 'Будь ласка, надішліть поточний бриф.', spanish: 'Por favor, envíe el brief actual.' },
    { english: 'I can start after that.', russian: 'Я могу начать после этого.', ukrainian: 'Я можу почати після цього.', spanish: 'Puedo empezar después de eso.' },
    { english: 'Let us confirm the first step.', russian: 'Давайте подтвердим первый шаг.', ukrainian: 'Давайте підтвердимо перший крок.', spanish: 'Confirmemos el primer paso.' },
  ],
  mitap_d010_content_unit: [
    { english: 'What should I prioritize first?', russian: 'Что мне поставить в приоритет сначала?', ukrainian: 'Що мені поставити в пріоритет спочатку?', spanish: '¿Qué debo priorizar primero?' },
    { english: 'Who owns this part?', russian: 'Кто отвечает за эту часть?', ukrainian: 'Хто відповідає за цю частину?', spanish: '¿Quién es el responsable de esta parte?' },
    { english: 'Can we confirm the deadline?', russian: 'Можем подтвердить срок?', ukrainian: 'Можемо підтвердити дедлайн?', spanish: '¿Podemos confirmar el plazo?' },
    { english: 'I see one small blocker.', russian: 'Я вижу один небольшой блокер.', ukrainian: 'Я бачу один невеликий блокер.', spanish: 'Veo un pequeño obstáculo.' },
    { english: 'Please send the latest update.', russian: 'Пожалуйста, пришлите последний апдейт.', ukrainian: 'Будь ласка, надішліть останнє оновлення.', spanish: 'Por favor, envíe la última actualización.' },
    { english: 'I can adjust the plan.', russian: 'Я могу скорректировать план.', ukrainian: 'Я можу скоригувати план.', spanish: 'Puedo ajustar el plan.' },
  ],
  mitap_d011_content_unit: [
    { english: 'Can I propose the next step?', russian: 'Могу я предложить следующий шаг?', ukrainian: 'Можу я запропонувати наступний крок?', spanish: '¿Puedo proponer el siguiente paso?' },
    { english: 'I need more context before I start.', russian: 'Мне нужно больше контекста перед началом.', ukrainian: 'Мені потрібно більше контексту перед початком.', spanish: 'Necesito más contexto antes de empezar.' },
    { english: 'What is the expected outcome?', russian: 'Какой ожидаемый результат?', ukrainian: 'Який очікуваний результат?', spanish: '¿Cuál es el resultado esperado?' },
    { english: 'I can draft a short update.', russian: 'Я могу набросать короткий апдейт.', ukrainian: 'Я можу скласти коротке оновлення.', spanish: 'Puedo redactar una actualización breve.' },
    { english: 'Please tell me if this works.', russian: 'Пожалуйста, скажите, подходит ли это.', ukrainian: 'Будь ласка, скажіть, чи це підходить.', spanish: 'Por favor, dígame si esto funciona.' },
    { english: 'I will revise it after feedback.', russian: 'Я доработаю это после фидбэка.', ukrainian: 'Я доопрацюю це після відгуку.', spanish: 'Lo revisaré después de recibir comentarios.' },
  ],
  voyazh_d001_content_unit: [
    { english: 'I need help now.', russian: 'Мне нужна помощь сейчас.', ukrainian: 'Мені потрібна допомога зараз.', spanish: 'Necesito ayuda ahora.' },
    { english: 'Can you help me, please?', russian: 'Можете мне помочь, пожалуйста?', ukrainian: 'Можете мені допомогти, будь ласка?', spanish: '¿Puede ayudarme, por favor?' },
    { english: 'I lost my bag.', russian: 'Я потерял сумку.', ukrainian: 'Я загубив сумку.', spanish: 'Perdí mi bolso.' },
    { english: 'I need the information desk.', russian: 'Мне нужна информационная стойка.', ukrainian: 'Мені потрібна інформаційна стійка.', spanish: 'Necesito el mostrador de información.' },
    { english: 'Please call airport staff.', russian: 'Пожалуйста, позовите сотрудников аэропорта.', ukrainian: 'Будь ласка, покличте персонал аеропорту.', spanish: 'Por favor, llame al personal del aeropuerto.' },
    { english: 'I can wait here.', russian: 'Я могу подождать здесь.', ukrainian: 'Я можу зачекати тут.', spanish: 'Puedo esperar aquí.' },
  ],
  voyazh_d002_content_unit: [
    { english: 'Here is my passport.', russian: 'Вот мой паспорт.', ukrainian: 'Ось мій паспорт.', spanish: 'Aquí tiene mi pasaporte.' },
    { english: 'I am here for vacation.', russian: 'Я здесь в отпуске.', ukrainian: 'Я тут у відпустці.', spanish: 'Estoy aquí de vacaciones.' },
    { english: 'I have a return ticket.', russian: 'У меня есть обратный билет.', ukrainian: 'У мене є зворотний квиток.', spanish: 'Tengo un billete de vuelta.' },
    { english: 'I will stay for one week.', russian: 'Я останусь на одну неделю.', ukrainian: 'Я залишуся на один тиждень.', spanish: 'Me quedaré una semana.' },
    { english: 'This is my hotel booking.', russian: 'Это моя бронь отеля.', ukrainian: 'Це моє бронювання готелю.', spanish: 'Esta es mi reserva de hotel.' },
    { english: 'Can I go now?', russian: 'Могу я идти сейчас?', ukrainian: 'Можу я іти зараз?', spanish: '¿Puedo irme ahora?' },
  ],
  voyazh_d003_content_unit: [
    { english: 'I need to check this bag.', russian: 'Мне нужно сдать эту сумку.', ukrainian: 'Мені потрібно здати цю сумку.', spanish: 'Necesito facturar esta bolsa.' },
    { english: 'Here is my boarding pass.', russian: 'Вот мой посадочный талон.', ukrainian: 'Ось мій посадковий талон.', spanish: 'Aquí tiene mi tarjeta de embarque.' },
    { english: 'The bag is not heavy.', russian: 'Сумка не тяжелая.', ukrainian: 'Сумка не важка.', spanish: 'La bolsa no pesa mucho.' },
    { english: 'There is one fragile item.', russian: 'Там есть одна хрупкая вещь.', ukrainian: 'Там є один крихкий предмет.', spanish: 'Hay un artículo frágil.' },
    { english: 'Can I get a baggage receipt?', russian: 'Могу я получить багажную квитанцию?', ukrainian: 'Можу я отримати квитанцію на багаж?', spanish: '¿Me puede dar un comprobante del equipaje?' },
    { english: 'Which gate should I use?', russian: 'Каким выходом мне пользоваться?', ukrainian: 'Яким виходом мені користуватися?', spanish: '¿Qué puerta debo usar?' },
  ],
  voyazh_d004_content_unit: [
    { english: 'I need a taxi to my hotel.', russian: 'Мне нужно такси до моего отеля.', ukrainian: 'Мені потрібне таксі до мого готелю.', spanish: 'Necesito un taxi hasta mi hotel.' },
    { english: 'How much is the ride?', russian: 'Сколько стоит поездка?', ukrainian: 'Скільки коштує поїздка?', spanish: '¿Cuánto cuesta el trayecto?' },
    { english: 'Please use the meter.', russian: 'Пожалуйста, включите счетчик.', ukrainian: 'Будь ласка, увімкніть лічильник.', spanish: 'Por favor, use el taxímetro.' },
    { english: 'Can you take this route?', russian: 'Можете поехать этим маршрутом?', ukrainian: 'Можете поїхати цим маршрутом?', spanish: '¿Puede ir por esta ruta?' },
    { english: 'The hotel is near the station.', russian: 'Отель рядом со станцией.', ukrainian: 'Готель поруч зі станцією.', spanish: 'El hotel está cerca de la estación.' },
    { english: 'I can pay by card.', russian: 'Я могу оплатить картой.', ukrainian: 'Я можу оплатити карткою.', spanish: 'Puedo pagar con tarjeta.' },
  ],
  voyazh_d005_content_unit: [
    { english: 'I have a hotel reservation.', russian: 'У меня есть бронирование в отеле.', ukrainian: 'У мене є бронювання в готелі.', spanish: 'Tengo una reserva de hotel.' },
    { english: 'Here is my passport.', russian: 'Вот мой паспорт.', ukrainian: 'Ось мій паспорт.', spanish: 'Aquí tiene mi pasaporte.' },
    { english: 'Can I get the room key?', russian: 'Могу я получить ключ от номера?', ukrainian: 'Можу я отримати ключ від кімнати?', spanish: '¿Me puede dar la llave de la habitación?' },
    { english: 'Is breakfast included?', russian: 'Завтрак включен?', ukrainian: 'Сніданок включено?', spanish: '¿Está incluido el desayuno?' },
    { english: 'The room is on the second floor.', russian: 'Номер на втором этаже.', ukrainian: 'Кімната на другому поверсі.', spanish: 'La habitación está en el segundo piso.' },
    { english: 'I need wifi access.', russian: 'Мне нужен доступ к Wi-Fi.', ukrainian: 'Мені потрібен доступ до Wi-Fi.', spanish: 'Necesito acceso al wifi.' },
  ],
  voyazh_d006_content_unit: [
    { english: 'I need to change the room.', russian: 'Мне нужно поменять номер.', ukrainian: 'Мені потрібно змінити кімнату.', spanish: 'Necesito cambiar de habitación.' },
    { english: 'The key does not work.', russian: 'Ключ не работает.', ukrainian: 'Ключ не працює.', spanish: 'La llave no funciona.' },
    { english: 'There is a small problem.', russian: 'Есть небольшая проблема.', ukrainian: 'Є невелика проблема.', spanish: 'Hay un pequeño problema.' },
    { english: 'Can you check the booking?', russian: 'Можете проверить бронирование?', ukrainian: 'Можете перевірити бронювання?', spanish: '¿Puede revisar la reserva?' },
    { english: 'I think this is the wrong bag.', russian: 'Думаю, это не та сумка.', ukrainian: 'Думаю, це не та сумка.', spanish: 'Creo que esta no es mi bolsa.' },
    { english: 'Please help me fix this.', russian: 'Пожалуйста, помогите мне это исправить.', ukrainian: 'Будь ласка, допоможіть мені це виправити.', spanish: 'Por favor, ayúdeme a solucionar esto.' },
  ],
  voyazh_d007_content_unit: [
    { english: 'I need help with my trip.', russian: 'Мне нужна помощь с поездкой.', ukrainian: 'Мені потрібна допомога з поїздкою.', spanish: 'Necesito ayuda con mi viaje.' },
    { english: 'Here is my booking.', russian: 'Вот мое бронирование.', ukrainian: 'Ось моє бронювання.', spanish: 'Aquí está mi reserva.' },
    { english: 'Can you check the details?', russian: 'Можете проверить детали?', ukrainian: 'Можете перевірити деталі?', spanish: '¿Puede verificar los detalles?' },
    { english: 'The room has a problem.', russian: 'В номере есть проблема.', ukrainian: 'У кімнаті є проблема.', spanish: 'La habitación tiene un problema.' },
    { english: 'I can wait here.', russian: 'Я могу подождать здесь.', ukrainian: 'Я можу зачекати тут.', spanish: 'Puedo esperar aquí.' },
    { english: 'Please help me fix this.', russian: 'Пожалуйста, помогите мне это исправить.', ukrainian: 'Будь ласка, допоможіть мені це виправити.', spanish: 'Por favor, ayúdeme a solucionar esto.' },
  ],
  voyazh_d008_content_unit: [
    { english: 'Which bus goes to the center?', russian: 'Какой автобус идет в центр?', ukrainian: 'Який автобус іде до центру?', spanish: '¿Qué autobús va al centro?' },
    { english: 'I need a ticket to the station.', russian: 'Мне нужен билет до станции.', ukrainian: 'Мені потрібен квиток до станції.', spanish: 'Necesito un billete hasta la estación.' },
    { english: 'Can I pay by card here?', russian: 'Могу я оплатить картой здесь?', ukrainian: 'Можу я оплатити карткою тут?', spanish: '¿Puedo pagar con tarjeta aquí?' },
    { english: 'How long is the wait?', russian: 'Сколько ждать?', ukrainian: 'Скільки чекати?', spanish: '¿Cuánto hay que esperar?' },
    { english: 'I will get off here.', russian: 'Я выйду здесь.', ukrainian: 'Я виходжу тут.', spanish: 'Me bajo aquí.' },
    { english: 'Is this the right stop?', russian: 'Это правильная остановка?', ukrainian: 'Це правильна зупинка?', spanish: '¿Es esta la parada correcta?' },
  ],
  voyazh_d009_content_unit: [
    { english: 'What time does it leave?', russian: 'Во сколько он отправляется?', ukrainian: 'О котрій він відправляється?', spanish: '¿A qué hora sale?' },
    { english: 'I need the next bus.', russian: 'Мне нужен следующий автобус.', ukrainian: 'Мені потрібен наступний автобус.', spanish: 'Necesito el próximo autobús.' },
    { english: 'Is this the right platform?', russian: 'Это правильная платформа?', ukrainian: 'Це правильна платформа?', spanish: '¿Es este el andén correcto?' },
    { english: 'Please show me the schedule.', russian: 'Пожалуйста, покажите мне расписание.', ukrainian: 'Будь ласка, покажіть мені розклад.', spanish: 'Por favor, muéstreme el horario.' },
    { english: 'Can you help me with the time?', russian: 'Можете помочь мне со временем?', ukrainian: 'Можете допомогти мені з часом?', spanish: '¿Puede ayudarme con el horario?' },
    { english: 'I can wait ten minutes.', russian: 'Я могу подождать десять минут.', ukrainian: 'Я можу зачекати десять хвилин.', spanish: 'Puedo esperar diez minutos.' },
  ],
  voyazh_d010_content_unit: [
    { english: 'Is there a train instead?', russian: 'Есть поезд вместо этого?', ukrainian: 'Є поїзд замість цього?', spanish: '¿Hay un tren en su lugar?' },
    { english: 'Can I take the tram?', russian: 'Могу я поехать на трамвае?', ukrainian: 'Можу я поїхати трамваєм?', spanish: '¿Puedo tomar el tranvía?' },
    { english: 'The taxi is too expensive.', russian: 'Такси слишком дорогое.', ukrainian: 'Таксі надто дороге.', spanish: 'El taxi es demasiado caro.' },
    { english: 'I need a cheaper option.', russian: 'Мне нужен вариант дешевле.', ukrainian: 'Мені потрібен варіант дешевше.', spanish: 'Necesito una opción más económica.' },
    { english: 'How far is the station?', russian: 'Как далеко станция?', ukrainian: 'Як далеко станція?', spanish: '¿A qué distancia está la estación?' },
    { english: 'I can walk from here.', russian: 'Я могу дойти отсюда пешком.', ukrainian: 'Я можу дійти звідси пішки.', spanish: 'Puedo ir a pie desde aquí.' },
  ],
  voyazh_d011_content_unit: [
    { english: 'Can you suggest the best route?', russian: 'Можете предложить лучший маршрут?', ukrainian: 'Можете запропонувати найкращий маршрут?', spanish: '¿Puede sugerirme la mejor ruta?' },
    { english: 'I need to get there by six.', russian: 'Мне нужно добраться туда к шести.', ukrainian: 'Мені потрібно дістатися туди до шостої.', spanish: 'Necesito llegar antes de las seis.' },
    { english: 'What is the easiest way?', russian: 'Какой самый простой способ?', ukrainian: 'Який найпростіший спосіб?', spanish: '¿Cuál es la forma más sencilla?' },
    { english: 'I can change at the next station.', russian: 'Я могу пересесть на следующей станции.', ukrainian: 'Я можу пересісти на наступній станції.', spanish: 'Puedo hacer transbordo en la siguiente estación.' },
    { english: 'Please tell me where to get off.', russian: 'Пожалуйста, скажите, где мне выйти.', ukrainian: 'Будь ласка, скажіть, де мені виходити.', spanish: 'Por favor, dígame dónde bajarme.' },
    { english: 'I will ask again if I am lost.', russian: 'Я спрошу еще раз, если потеряюсь.', ukrainian: 'Я запитаю ще раз, якщо загублюся.', spanish: 'Preguntaré de nuevo si me pierdo.' },
  ],
  gavan_d001_content_unit: [
    { english: "I'm here.", russian: 'Я здесь.', ukrainian: 'Я тут.', spanish: 'Estoy aquí.' },
    { english: "I'm okay.", russian: 'Я в порядке.', ukrainian: 'Я в порядку.', spanish: 'Estoy bien.' },
    { english: "It's okay.", russian: 'Все нормально.', ukrainian: 'Все нормально.', spanish: 'Está bien.' },
    { english: "It's not clear.", russian: 'Пока непонятно.', ukrainian: 'Поки незрозуміло.', spanish: 'No está claro.' },
    { english: "You're right.", russian: 'Вы правы.', ukrainian: 'Ви праві.', spanish: 'Tiene razón.' },
    { english: "I'm ready.", russian: 'Я готов.', ukrainian: 'Я готовий.', spanish: 'Estoy listo.' },
  ],
  gavan_d002_content_unit: [
    { english: 'This is my full address.', russian: 'Это мой полный адрес.', ukrainian: 'Це моя повна адреса.', spanish: 'Esta es mi dirección completa.' },
    { english: 'The postcode is correct.', russian: 'Почтовый индекс верный.', ukrainian: 'Поштовий індекс правильний.', spanish: 'El código postal es correcto.' },
    { english: 'My flat number is five.', russian: 'Номер моей квартиры пять.', ukrainian: 'Номер моєї квартири — п\'ять.', spanish: 'Mi número de piso es el cinco.' },
    { english: 'Can you spell the street name?', russian: 'Можете произнести название улицы по буквам?', ukrainian: 'Можете розібрати назву вулиці по літерах?', spanish: '¿Puede deletrear el nombre de la calle?' },
    { english: 'The address is on this form.', russian: 'Адрес указан в этой форме.', ukrainian: 'Адреса зазначена в цій формі.', spanish: 'La dirección está en este formulario.' },
    { english: 'I can send proof of address.', russian: 'Я могу отправить подтверждение адреса.', ukrainian: 'Я можу надіслати підтвердження адреси.', spanish: 'Puedo enviar un comprobante de domicilio.' },
  ],
  gavan_d003_content_unit: [
    { english: 'I need this form.', russian: 'Мне нужна эта форма.', ukrainian: 'Мені потрібна ця форма.', spanish: 'Necesito este formulario.' },
    { english: 'Can you check this document?', russian: 'Можете проверить этот документ?', ukrainian: 'Можете перевірити цей документ?', spanish: '¿Puede revisar este documento?' },
    { english: 'This page is not clear.', russian: 'Эта страница непонятна.', ukrainian: 'Ця сторінка незрозуміла.', spanish: 'Esta página no está clara.' },
    { english: 'I can fill it in today.', russian: 'Я могу заполнить это сегодня.', ukrainian: 'Я можу заповнити це сьогодні.', spanish: 'Puedo rellenarlo hoy.' },
    { english: 'Do I need a copy?', russian: 'Мне нужна копия?', ukrainian: 'Мені потрібна копія?', spanish: '¿Necesito una copia?' },
    { english: 'I will bring the document tomorrow.', russian: 'Я принесу документ завтра.', ukrainian: 'Я принесу документ завтра.', spanish: 'Traeré el documento mañana.' },
  ],
  gavan_d004_content_unit: [
    { english: 'Which documents should I bring?', russian: 'Какие документы мне принести?', ukrainian: 'Які документи мені принести?', spanish: '¿Qué documentos debo traer?' },
    { english: 'Do I need the original document?', russian: 'Мне нужен оригинал документа?', ukrainian: 'Мені потрібен оригінал документа?', spanish: '¿Necesito el documento original?' },
    { english: 'Is a copy enough?', russian: 'Копии достаточно?', ukrainian: 'Копії достатньо?', spanish: '¿Es suficiente una copia?' },
    { english: 'Can I send it online?', russian: 'Могу я отправить это онлайн?', ukrainian: 'Можу я надіслати це онлайн?', spanish: '¿Puedo enviarlo por internet?' },
    { english: 'Where can I find the list?', russian: 'Где я могу найти список?', ukrainian: 'Де я можу знайти список?', spanish: '¿Dónde puedo encontrar la lista?' },
    { english: 'I can bring them tomorrow.', russian: 'Я могу принести их завтра.', ukrainian: 'Я можу принести їх завтра.', spanish: 'Puedo traerlos mañana.' },
  ],
  gavan_d005_content_unit: [
    { english: 'I do not have this document.', russian: 'У меня нет этого документа.', ukrainian: 'У мене немає цього документа.', spanish: 'No tengo este documento.' },
    { english: 'Can I bring it later?', russian: 'Могу я принести это позже?', ukrainian: 'Можу я принести це пізніше?', spanish: '¿Puedo traerlo más tarde?' },
    { english: 'I have a digital copy.', russian: 'У меня есть цифровая копия.', ukrainian: 'У мене є цифрова копія.', spanish: 'Tengo una copia digital.' },
    { english: 'I need more time.', russian: 'Мне нужно больше времени.', ukrainian: 'Мені потрібно більше часу.', spanish: 'Necesito más tiempo.' },
    { english: 'What can I do now?', russian: 'Что я могу сделать сейчас?', ukrainian: 'Що я можу зробити зараз?', spanish: '¿Qué puedo hacer ahora?' },
    { english: 'I will send it tomorrow.', russian: 'Я отправлю это завтра.', ukrainian: 'Я надішлю це завтра.', spanish: 'Lo enviaré mañana.' },
  ],
  gavan_d006_content_unit: [
    { english: 'There is a mistake on the form.', russian: 'В форме есть ошибка.', ukrainian: 'У формі є помилка.', spanish: 'Hay un error en el formulario.' },
    { english: 'The address is wrong.', russian: 'Адрес неправильный.', ukrainian: 'Адреса неправильна.', spanish: 'La dirección es incorrecta.' },
    { english: 'I need to update my details.', russian: 'Мне нужно обновить мои данные.', ukrainian: 'Мені потрібно оновити свої дані.', spanish: 'Necesito actualizar mis datos.' },
    { english: 'Can I correct this page?', russian: 'Могу я исправить эту страницу?', ukrainian: 'Можу я виправити цю сторінку?', spanish: '¿Puedo corregir esta página?' },
    { english: 'Please check the new copy.', russian: 'Пожалуйста, проверьте новую копию.', ukrainian: 'Будь ласка, перевірте нову копію.', spanish: 'Por favor, revise la nueva copia.' },
    { english: 'I will bring the right document.', russian: 'Я принесу правильный документ.', ukrainian: 'Я принесу правильний документ.', spanish: 'Traeré el documento correcto.' },
  ],
  gavan_d007_content_unit: [
    { english: 'This is my full address.', russian: 'Это мой полный адрес.', ukrainian: 'Це моя повна адреса.', spanish: 'Esta es mi dirección completa.' },
    { english: 'I need this form.', russian: 'Мне нужна эта форма.', ukrainian: 'Мені потрібна ця форма.', spanish: 'Necesito este formulario.' },
    { english: 'Can you check this document?', russian: 'Можете проверить этот документ?', ukrainian: 'Можете перевірити цей документ?', spanish: '¿Puede revisar este documento?' },
    { english: 'Which documents should I bring?', russian: 'Какие документы мне принести?', ukrainian: 'Які документи мені принести?', spanish: '¿Qué documentos debo traer?' },
    { english: 'I have a digital copy.', russian: 'У меня есть цифровая копия.', ukrainian: 'У мене є цифрова копія.', spanish: 'Tengo una copia digital.' },
    { english: 'Please check the new copy.', russian: 'Пожалуйста, проверьте новую копию.', ukrainian: 'Будь ласка, перевірте нову копію.', spanish: 'Por favor, revise la nueva copia.' },
  ],
  gavan_d008_content_unit: [
    { english: 'Can I submit this form online?', russian: 'Могу я отправить эту форму онлайн?', ukrainian: 'Можу я подати цю форму онлайн?', spanish: '¿Puedo enviar este formulario por internet?' },
    { english: 'I need to upload a copy.', russian: 'Мне нужно загрузить копию.', ukrainian: 'Мені потрібно завантажити копію.', spanish: 'Necesito subir una copia.' },
    { english: 'Where should I sign?', russian: 'Где мне подписать?', ukrainian: 'Де мені підписати?', spanish: '¿Dónde debo firmar?' },
    { english: 'I can bring the original tomorrow.', russian: 'Я могу принести оригинал завтра.', ukrainian: 'Я можу принести оригінал завтра.', spanish: 'Puedo traer el original mañana.' },
    { english: 'Please tell me the reference number.', russian: 'Пожалуйста, скажите мне номер обращения.', ukrainian: 'Будь ласка, скажіть мені номер звернення.', spanish: 'Por favor, dígame el número de referencia.' },
    { english: 'I will keep this receipt.', russian: 'Я сохраню этот чек.', ukrainian: 'Я збережу цей чек.', spanish: 'Guardaré este recibo.' },
  ],
  gavan_d009_content_unit: [
    { english: 'What is the next step?', russian: 'Какой следующий шаг?', ukrainian: 'Який наступний крок?', spanish: '¿Cuál es el siguiente paso?' },
    { english: 'Do I need an appointment?', russian: 'Мне нужна запись?', ukrainian: 'Мені потрібен запис?', spanish: '¿Necesito una cita?' },
    { english: 'Can I book it today?', russian: 'Могу я записаться сегодня?', ukrainian: 'Можу я записатися сьогодні?', spanish: '¿Puedo reservar la cita hoy?' },
    { english: 'Please confirm the date.', russian: 'Пожалуйста, подтвердите дату.', ukrainian: 'Будь ласка, підтвердіть дату.', spanish: 'Por favor, confirme la fecha.' },
    { english: 'I will bring this document.', russian: 'Я принесу этот документ.', ukrainian: 'Я принесу цей документ.', spanish: 'Traeré este documento.' },
    { english: 'Can you write it down for me?', russian: 'Можете записать это для меня?', ukrainian: 'Можете записати це для мене?', spanish: '¿Puede anotármelo?' },
  ],
  gavan_d010_content_unit: [
    { english: 'Do I need proof of address?', russian: 'Мне нужно подтверждение адреса?', ukrainian: 'Мені потрібне підтвердження адреси?', spanish: '¿Necesito un comprobante de domicilio?' },
    { english: 'Can I pay the fee here?', russian: 'Могу я оплатить сбор здесь?', ukrainian: 'Можу я сплатити збір тут?', spanish: '¿Puedo pagar la tasa aquí?' },
    { english: 'Please make a copy for me.', russian: 'Пожалуйста, сделайте для меня копию.', ukrainian: 'Будь ласка, зробіть для мене копію.', spanish: 'Por favor, hágame una copia.' },
    { english: 'Where is the service desk?', russian: 'Где стойка обслуживания?', ukrainian: 'Де стійка обслуговування?', spanish: '¿Dónde está el mostrador de atención?' },
    { english: 'I need another appointment.', russian: 'Мне нужна еще одна запись.', ukrainian: 'Мені потрібен ще один запис.', spanish: 'Necesito otra cita.' },
    { english: 'I will come back next week.', russian: 'Я вернусь на следующей неделе.', ukrainian: 'Я повернуся наступного тижня.', spanish: 'Volveré la semana que viene.' },
  ],
  gavan_d011_content_unit: [
    { english: 'Can you explain how to apply?', russian: 'Можете объяснить, как подать заявку?', ukrainian: 'Можете пояснити, як подати заяву?', spanish: '¿Puede explicarme cómo solicitarlo?' },
    { english: 'I need to send this document today.', russian: 'Мне нужно отправить этот документ сегодня.', ukrainian: 'Мені потрібно надіслати цей документ сьогодні.', spanish: 'Necesito enviar este documento hoy.' },
    { english: 'What information is missing?', russian: 'Какой информации не хватает?', ukrainian: 'Якої інформації не вистачає?', spanish: '¿Qué información falta?' },
    { english: 'I can bring the form tomorrow.', russian: 'Я могу принести форму завтра.', ukrainian: 'Я можу принести форму завтра.', spanish: 'Puedo traer el formulario mañana.' },
    { english: 'Please confirm the next step.', russian: 'Пожалуйста, подтвердите следующий шаг.', ukrainian: 'Будь ласка, підтвердіть наступний крок.', spanish: 'Por favor, confirme el siguiente paso.' },
    { english: 'I will write down the reference number.', russian: 'Я запишу номер обращения.', ukrainian: 'Я запишу номер звернення.', spanish: 'Anotaré el número de referencia.' },
  ],
  impuls_d001_content_unit: [
    { english: 'I can tell a short story.', russian: 'Я могу рассказать короткую историю.', ukrainian: 'Я можу розповісти коротку історію.', spanish: 'Puedo contar una historia breve.' },
    { english: 'First, I missed the bus.', russian: 'Сначала я пропустил автобус.', ukrainian: 'Спочатку я пропустив автобус.', spanish: 'Primero, perdí el autobús.' },
    { english: 'Then I called my friend.', russian: 'Потом я позвонил другу.', ukrainian: 'Потім я зателефонував другу.', spanish: 'Luego llamé a mi amigo.' },
    { english: 'After that, I found another way.', russian: 'После этого я нашел другой путь.', ukrainian: 'Після цього я знайшов інший шлях.', spanish: 'Después de eso, encontré otra forma de llegar.' },
    { english: 'The story ends well.', russian: 'История заканчивается хорошо.', ukrainian: 'Історія закінчується добре.', spanish: 'La historia termina bien.' },
    { english: 'That is why I was late.', russian: 'Вот почему я опоздал.', ukrainian: 'Ось чому я запізнився.', spanish: 'Por eso llegué tarde.' },
  ],
  impuls_d002_content_unit: [
    { english: 'I think this is useful.', russian: 'Я думаю, это полезно.', ukrainian: 'Я думаю, це корисно.', spanish: 'Creo que esto es útil.' },
    { english: 'My opinion is simple.', russian: 'Мое мнение простое.', ukrainian: 'Моя думка проста.', spanish: 'Mi opinión es sencilla.' },
    { english: 'I like this idea.', russian: 'Мне нравится эта идея.', ukrainian: 'Мені подобається ця ідея.', spanish: 'Me gusta esta idea.' },
    { english: 'I do not agree yet.', russian: 'Я пока не согласен.', ukrainian: 'Я поки не згоден.', spanish: 'Todavía no estoy de acuerdo.' },
    { english: 'The reason is clear.', russian: 'Причина понятна.', ukrainian: 'Причина зрозуміла.', spanish: 'La razón está clara.' },
    { english: 'I can explain it briefly.', russian: 'Я могу коротко это объяснить.', ukrainian: 'Я можу коротко це пояснити.', spanish: 'Puedo explicarlo brevemente.' },
  ],
  impuls_d003_content_unit: [
    { english: 'Because it saves time.', russian: 'Потому что это экономит время.', ukrainian: 'Бо це економить час.', spanish: 'Porque ahorra tiempo.' },
    { english: 'Because I need practice.', russian: 'Потому что мне нужна практика.', ukrainian: 'Бо мені потрібна практика.', spanish: 'Porque necesito práctica.' },
    { english: 'Because the idea is useful.', russian: 'Потому что идея полезная.', ukrainian: 'Бо ідея корисна.', spanish: 'Porque la idea es útil.' },
    { english: 'Because I can do it now.', russian: 'Потому что я могу сделать это сейчас.', ukrainian: 'Бо я можу зробити це зараз.', spanish: 'Porque puedo hacerlo ahora.' },
    { english: 'Because the answer is simple.', russian: 'Потому что ответ простой.', ukrainian: 'Бо відповідь проста.', spanish: 'Porque la respuesta es sencilla.' },
    { english: 'Because we have a clear reason.', russian: 'Потому что у нас есть понятная причина.', ukrainian: 'Бо у нас є зрозуміла причина.', spanish: 'Porque tenemos una razón clara.' },
  ],
  impuls_d004_content_unit: [
    { english: 'Let me say it again.', russian: 'Дайте мне сказать это еще раз.', ukrainian: 'Дозвольте мені сказати це ще раз.', spanish: 'Déjame decirlo de nuevo.' },
    { english: 'I made a small mistake.', russian: 'Я сделал небольшую ошибку.', ukrainian: 'Я зробив невелику помилку.', spanish: 'Cometí un pequeño error.' },
    { english: 'The right word is different.', russian: 'Правильное слово другое.', ukrainian: 'Правильне слово інше.', spanish: 'La palabra correcta es otra.' },
    { english: 'I mean the other option.', russian: 'Я имею в виду другой вариант.', ukrainian: 'Я маю на увазі інший варіант.', spanish: 'Me refiero a la otra opción.' },
    { english: 'Let me fix the sentence.', russian: 'Дайте мне исправить предложение.', ukrainian: 'Дозвольте мені виправити речення.', spanish: 'Déjame corregir la frase.' },
    { english: 'Now it sounds better.', russian: 'Теперь это звучит лучше.', ukrainian: 'Тепер це звучить краще.', spanish: 'Ahora suena mejor.' },
  ],
  impuls_d005_content_unit: [
    { english: 'Give me one second.', russian: 'Дайте мне одну секунду.', ukrainian: 'Дайте мені одну секунду.', spanish: 'Dame un segundo.' },
    { english: 'Let me think for a moment.', russian: 'Дайте мне подумать минутку.', ukrainian: 'Дайте мені подумати хвилинку.', spanish: 'Déjame pensar un momento.' },
    { english: 'I need a short pause.', russian: 'Мне нужна короткая пауза.', ukrainian: 'Мені потрібна коротка пауза.', spanish: 'Necesito una breve pausa.' },
    { english: 'Can I answer in a minute?', russian: 'Могу я ответить через минуту?', ukrainian: 'Можу я відповісти через хвилину?', spanish: '¿Puedo responder en un minuto?' },
    { english: 'I will answer after the pause.', russian: 'Я отвечу после паузы.', ukrainian: 'Я відповім після паузи.', spanish: 'Responderé después de la pausa.' },
    { english: 'Please give me a moment.', russian: 'Пожалуйста, дайте мне минутку.', ukrainian: 'Будь ласка, дайте мені хвилинку.', spanish: 'Por favor, dame un momento.' },
  ],
  impuls_d006_content_unit: [
    { english: 'I have two ideas.', russian: 'У меня есть две идеи.', ukrainian: 'У мене є дві ідеї.', spanish: 'Tengo dos ideas.' },
    { english: 'The first idea is simple.', russian: 'Первая идея простая.', ukrainian: 'Перша ідея проста.', spanish: 'La primera idea es sencilla.' },
    { english: 'The second idea is faster.', russian: 'Вторая идея быстрее.', ukrainian: 'Друга ідея швидша.', spanish: 'La segunda idea es más rápida.' },
    { english: 'I can connect them now.', russian: 'Я могу связать их сейчас.', ukrainian: 'Я можу пов\'язати їх зараз.', spanish: 'Puedo combinarlas ahora.' },
    { english: 'So my answer is clear.', russian: 'Так что мой ответ понятен.', ukrainian: 'Тож моя відповідь зрозуміла.', spanish: 'Así que mi respuesta está clara.' },
    { english: 'Let me say both parts.', russian: 'Дайте мне сказать обе части.', ukrainian: 'Дозвольте мені сказати обидві частини.', spanish: 'Déjame decir las dos partes.' },
  ],
  impuls_d007_content_unit: [
    { english: 'I can tell a short story.', russian: 'Я могу рассказать короткую историю.', ukrainian: 'Я можу розповісти коротку історію.', spanish: 'Puedo contar una historia breve.' },
    { english: 'My opinion is simple.', russian: 'Мое мнение простое.', ukrainian: 'Моя думка проста.', spanish: 'Mi opinión es sencilla.' },
    { english: 'Because it saves time.', russian: 'Потому что это экономит время.', ukrainian: 'Бо це економить час.', spanish: 'Porque ahorra tiempo.' },
    { english: 'Let me say it again.', russian: 'Дайте мне сказать это еще раз.', ukrainian: 'Дозвольте мені сказати це ще раз.', spanish: 'Déjame decirlo de nuevo.' },
    { english: 'Give me one second.', russian: 'Дайте мне одну секунду.', ukrainian: 'Дайте мені одну секунду.', spanish: 'Dame un segundo.' },
    { english: 'I have two ideas.', russian: 'У меня есть две идеи.', ukrainian: 'У мене є дві ідеї.', spanish: 'Tengo dos ideas.' },
  ],
  impuls_d008_content_unit: [
    { english: 'Can I answer in two parts?', russian: 'Могу я ответить в двух частях?', ukrainian: 'Можу я відповісти двома частинами?', spanish: '¿Puedo responder en dos partes?' },
    { english: 'The first point is simple.', russian: 'Первый пункт простой.', ukrainian: 'Перший пункт простий.', spanish: 'El primer punto es sencillo.' },
    { english: 'The second point is more important.', russian: 'Второй пункт важнее.', ukrainian: 'Другий пункт важливіший.', spanish: 'El segundo punto es más importante.' },
    { english: 'I need one example.', russian: 'Мне нужен один пример.', ukrainian: 'Мені потрібен один приклад.', spanish: 'Necesito un ejemplo.' },
    { english: 'Let me connect the ideas.', russian: 'Дайте мне связать идеи.', ukrainian: 'Дозвольте мені пов\'язати ідеї.', spanish: 'Déjame conectar las ideas.' },
    { english: 'That is my short answer.', russian: 'Это мой короткий ответ.', ukrainian: 'Це моя коротка відповідь.', spanish: 'Esa es mi respuesta breve.' },
  ],
  impuls_d009_content_unit: [
    { english: 'Give me a second to answer.', russian: 'Дайте мне секунду, чтобы ответить.', ukrainian: 'Дайте мені секунду, щоб відповісти.', spanish: 'Dame un segundo para responder.' },
    { english: 'My main point is simple.', russian: 'Моя главная мысль простая.', ukrainian: 'Моя головна думка проста.', spanish: 'Mi punto principal es sencillo.' },
    { english: 'I can add one reason.', russian: 'Я могу добавить одну причину.', ukrainian: 'Я можу додати одну причину.', spanish: 'Puedo añadir una razón.' },
    { english: 'For example, it saves time.', russian: 'Например, это экономит время.', ukrainian: 'Наприклад, це економить час.', spanish: 'Por ejemplo, ahorra tiempo.' },
    { english: 'So my answer is yes.', russian: 'Так что мой ответ — да.', ukrainian: 'Тож моя відповідь — так.', spanish: 'Entonces mi respuesta es sí.' },
    { english: 'Let me finish with this.', russian: 'Позвольте закончить этим.', ukrainian: 'Дозвольте закінчити цим.', spanish: 'Permíteme terminar con esto.' },
  ],
  impuls_d010_content_unit: [
    { english: 'I see your point.', russian: 'Я понимаю вашу мысль.', ukrainian: 'Я розумію вашу думку.', spanish: 'Entiendo tu punto.' },
    { english: 'I would choose a different option.', russian: 'Я бы выбрал другой вариант.', ukrainian: 'Я б обрав інший варіант.', spanish: 'Yo elegiría una opción diferente.' },
    { english: 'My reason is practical.', russian: 'Моя причина практичная.', ukrainian: 'Моя причина практична.', spanish: 'Mi razón es práctica.' },
    { english: 'For me, the main issue is time.', russian: 'Для меня главная проблема — время.', ukrainian: 'Для мене головна проблема — час.', spanish: 'Para mí, el problema principal es el tiempo.' },
    { english: 'So I prefer the second idea.', russian: 'Поэтому я предпочитаю вторую идею.', ukrainian: 'Тому я надаю перевагу другій ідеї.', spanish: 'Por eso prefiero la segunda idea.' },
    { english: 'That is my short answer.', russian: 'Это мой короткий ответ.', ukrainian: 'Це моя коротка відповідь.', spanish: 'Esa es mi respuesta breve.' },
  ],
  impuls_d011_content_unit: [
    { english: 'Can I start with a short answer?', russian: 'Могу я начать с короткого ответа?', ukrainian: 'Можу я почати з короткої відповіді?', spanish: '¿Puedo empezar con una respuesta breve?' },
    { english: 'I need a moment to organize my thoughts.', russian: 'Мне нужна минутка, чтобы собрать мысли.', ukrainian: 'Мені потрібна хвилинка, щоб зібрати думки.', spanish: 'Necesito un momento para ordenar mis ideas.' },
    { english: 'The first reason is clear.', russian: 'Первая причина понятна.', ukrainian: 'Перша причина зрозуміла.', spanish: 'La primera razón está clara.' },
    { english: 'I can give one quick example.', russian: 'Я могу привести один быстрый пример.', ukrainian: 'Я можу навести один швидкий приклад.', spanish: 'Puedo dar un ejemplo rápido.' },
    { english: 'Please tell me if I should continue.', russian: 'Пожалуйста, скажите, продолжать ли мне.', ukrainian: 'Будь ласка, скажіть, чи варто мені продовжувати.', spanish: 'Por favor, dígame si debo continuar.' },
    { english: 'I will make my answer shorter.', russian: 'Я сделаю свой ответ короче.', ukrainian: 'Я зроблю свою відповідь коротшою.', spanish: 'Haré mi respuesta más breve.' },
  ],
  echo_d001_content_unit: [
    { english: 'Can you repeat that?', russian: 'Можете повторить это?', ukrainian: 'Можете повторити це?', spanish: '¿Puede repetir eso?' },
    { english: 'Please repeat the last word.', russian: 'Пожалуйста, повторите последнее слово.', ukrainian: 'Будь ласка, повторіть останнє слово.', spanish: 'Por favor, repita la última palabra.' },
    { english: 'I heard the time.', russian: 'Я услышал время.', ukrainian: 'Я почув час.', spanish: 'Escuché la hora.' },
    { english: 'I missed the place.', russian: 'Я пропустил место.', ukrainian: 'Я пропустив місце.', spanish: 'No escuché el lugar.' },
    { english: 'Did you say today?', russian: 'Вы сказали сегодня?', ukrainian: 'Ви сказали сьогодні?', spanish: '¿Dijo hoy?' },
    { english: 'Now I can answer.', russian: 'Теперь я могу ответить.', ukrainian: 'Тепер я можу відповісти.', spanish: 'Ahora puedo responder.' },
  ],
  echo_d002_content_unit: [
    { english: 'Yes, I understand.', russian: 'Да, я понимаю.', ukrainian: 'Так, я розумію.', spanish: 'Sí, entiendo.' },
    { english: 'No, not yet.', russian: 'Нет, пока нет.', ukrainian: 'Ні, ще ні.', spanish: 'No, todavía no.' },
    { english: 'I can answer now.', russian: 'Я могу ответить сейчас.', ukrainian: 'Я можу відповісти зараз.', spanish: 'Puedo responder ahora.' },
    { english: 'Please say it again.', russian: 'Пожалуйста, скажите это еще раз.', ukrainian: 'Будь ласка, скажіть це ще раз.', spanish: 'Por favor, repítalo.' },
    { english: 'The answer is short.', russian: 'Ответ короткий.', ukrainian: 'Відповідь коротка.', spanish: 'La respuesta es breve.' },
    { english: 'I need one more second.', russian: 'Мне нужна еще одна секунда.', ukrainian: 'Мені потрібна ще одна секунда.', spanish: 'Necesito un segundo más.' },
  ],
  echo_d003_content_unit: [
    { english: 'Can you say that again?', russian: 'Можете сказать это еще раз?', ukrainian: 'Можете сказати це ще раз?', spanish: '¿Puede decir eso otra vez?' },
    { english: 'Please say it more slowly.', russian: 'Пожалуйста, скажите это медленнее.', ukrainian: 'Будь ласка, скажіть це повільніше.', spanish: 'Por favor, hable más despacio.' },
    { english: 'Did you say tomorrow?', russian: 'Вы сказали завтра?', ukrainian: 'Ви сказали завтра?', spanish: '¿Dijo mañana?' },
    { english: 'I heard the first part.', russian: 'Я услышал первую часть.', ukrainian: 'Я почув першу частину.', spanish: 'Escuché la primera parte.' },
    { english: 'I missed the last word.', russian: 'Я пропустил последнее слово.', ukrainian: 'Я пропустив останнє слово.', spanish: 'No escuché la última palabra.' },
    { english: 'Now I understand the message.', russian: 'Теперь я понимаю сообщение.', ukrainian: 'Тепер я розумію повідомлення.', spanish: 'Ahora entiendo el mensaje.' },
  ],
  echo_d004_content_unit: [
    { english: 'Did you say five oclock?', russian: 'Вы сказали в пять часов?', ukrainian: 'Ви сказали о п\'ятій?', spanish: '¿Dijo a las cinco?' },
    { english: 'Is the meeting here?', russian: 'Встреча здесь?', ukrainian: 'Зустріч тут?', spanish: '¿La reunión es aquí?' },
    { english: 'I heard the street name.', russian: 'Я услышал название улицы.', ukrainian: 'Я почув назву вулиці.', spanish: 'Escuché el nombre de la calle.' },
    { english: 'Can you repeat the address?', russian: 'Можете повторить адрес?', ukrainian: 'Можете повторити адресу?', spanish: '¿Puede repetir la dirección?' },
    { english: 'The place is near the station.', russian: 'Место рядом со станцией.', ukrainian: 'Місце поруч зі станцією.', spanish: 'El lugar está cerca de la estación.' },
    { english: 'I will be there tomorrow.', russian: 'Я буду там завтра.', ukrainian: 'Я буду там завтра.', spanish: 'Estaré allí mañana.' },
  ],
  echo_d005_content_unit: [
    { english: 'The main message is clear.', russian: 'Главное сообщение понятно.', ukrainian: 'Головне повідомлення зрозуміле.', spanish: 'El mensaje principal está claro.' },
    { english: 'I understand the key point.', russian: 'Я понимаю главный смысл.', ukrainian: 'Я розумію головну думку.', spanish: 'Entiendo el punto clave.' },
    { english: 'You need this today.', russian: 'Вам это нужно сегодня.', ukrainian: 'Вам це потрібно сьогодні.', spanish: 'Necesita esto hoy.' },
    { english: 'I can confirm the plan.', russian: 'Я могу подтвердить план.', ukrainian: 'Я можу підтвердити план.', spanish: 'Puedo confirmar el plan.' },
    { english: 'Please send the short version.', russian: 'Пожалуйста, отправьте короткую версию.', ukrainian: 'Будь ласка, надішліть коротку версію.', spanish: 'Por favor, envíe la versión breve.' },
    { english: 'I will reply after I listen.', russian: 'Я отвечу после того, как послушаю.', ukrainian: 'Я відповім після того, як послухаю.', spanish: 'Responderé después de escuchar.' },
  ],
  echo_d006_content_unit: [
    { english: 'I missed one detail.', russian: 'Я пропустил одну деталь.', ukrainian: 'Я пропустив одну деталь.', spanish: 'No escuché un detalle.' },
    { english: 'Can you say the short version?', russian: 'Можете сказать короткую версию?', ukrainian: 'Можете сказати коротку версію?', spanish: '¿Puede decir la versión breve?' },
    { english: 'The main point is this.', russian: 'Главная мысль вот в этом.', ukrainian: 'Головна думка ось у цьому.', spanish: 'El punto principal es este.' },
    { english: 'I need to hear it again.', russian: 'Мне нужно услышать это еще раз.', ukrainian: 'Мені потрібно почути це ще раз.', spanish: 'Necesito escucharlo de nuevo.' },
    { english: 'Now the message is clear.', russian: 'Теперь сообщение понятно.', ukrainian: 'Тепер повідомлення зрозуміле.', spanish: 'Ahora el mensaje está claro.' },
    { english: 'I can reply now.', russian: 'Я могу ответить сейчас.', ukrainian: 'Я можу відповісти зараз.', spanish: 'Puedo responder ahora.' },
  ],
  echo_d007_content_unit: [
    { english: 'Can you repeat that?', russian: 'Можете повторить это?', ukrainian: 'Можете повторити це?', spanish: '¿Puede repetir eso?' },
    { english: 'I can answer now.', russian: 'Я могу ответить сейчас.', ukrainian: 'Я можу відповісти зараз.', spanish: 'Puedo responder ahora.' },
    { english: 'Can you say that again?', russian: 'Можете сказать это еще раз?', ukrainian: 'Можете сказати це ще раз?', spanish: '¿Puede decir eso otra vez?' },
    { english: 'Did you say five oclock?', russian: 'Вы сказали в пять часов?', ukrainian: 'Ви сказали о п\'ятій?', spanish: '¿Dijo a las cinco?' },
    { english: 'The main message is clear.', russian: 'Главное сообщение понятно.', ukrainian: 'Головне повідомлення зрозуміле.', spanish: 'El mensaje principal está claro.' },
    { english: 'I missed one detail.', russian: 'Я пропустил одну деталь.', ukrainian: 'Я пропустив одну деталь.', spanish: 'No escuché un detalle.' },
  ],
  echo_d008_content_unit: [
    { english: 'Can you repeat the useful part?', russian: 'Можете повторить полезную часть?', ukrainian: 'Можете повторити корисну частину?', spanish: '¿Puede repetir la parte importante?' },
    { english: 'I heard the first word.', russian: 'Я услышал первое слово.', ukrainian: 'Я почув перше слово.', spanish: 'Escuché la primera palabra.' },
    { english: 'I missed the last detail.', russian: 'Я пропустил последнюю деталь.', ukrainian: 'Я пропустив останню деталь.', spanish: 'No escuché el último detalle.' },
    { english: 'Please say that slower.', russian: 'Пожалуйста, скажите это медленнее.', ukrainian: 'Будь ласка, скажіть це повільніше.', spanish: 'Por favor, dígalo más despacio.' },
    { english: 'Now I understand the time.', russian: 'Теперь я понимаю время.', ukrainian: 'Тепер я розумію час.', spanish: 'Ahora entiendo la hora.' },
    { english: 'That answer is clear.', russian: 'Этот ответ понятен.', ukrainian: 'Ця відповідь зрозуміла.', spanish: 'Esa respuesta está clara.' },
  ],
  echo_d009_content_unit: [
    { english: 'Can you repeat the key part?', russian: 'Можете повторить ключевую часть?', ukrainian: 'Можете повторити ключову частину?', spanish: '¿Puede repetir la parte clave?' },
    { english: 'I heard the date clearly.', russian: 'Я ясно услышал дату.', ukrainian: 'Я чітко почув дату.', spanish: 'Escuché la fecha claramente.' },
    { english: 'I missed the final number.', russian: 'Я пропустил последнее число.', ukrainian: 'Я пропустив останнє число.', spanish: 'No escuché el número final.' },
    { english: 'Please say the address again.', russian: 'Пожалуйста, скажите адрес еще раз.', ukrainian: 'Будь ласка, скажіть адресу ще раз.', spanish: 'Por favor, repita la dirección.' },
    { english: 'Now I can confirm it.', russian: 'Теперь я могу это подтвердить.', ukrainian: 'Тепер я можу це підтвердити.', spanish: 'Ahora puedo confirmarlo.' },
    { english: 'That detail is clear now.', russian: 'Теперь эта деталь понятна.', ukrainian: 'Тепер ця деталь зрозуміла.', spanish: 'Ese detalle está claro ahora.' },
  ],
  echo_d010_content_unit: [
    { english: 'Which entrance should I use?', russian: 'Каким входом мне воспользоваться?', ukrainian: 'Яким входом мені скористатися?', spanish: '¿Qué entrada debo usar?' },
    { english: 'I heard window number three.', russian: 'Я услышал окно номер три.', ukrainian: 'Я почув вікно номер три.', spanish: 'Escuché la ventanilla número tres.' },
    { english: 'Did you say the second floor?', russian: 'Вы сказали второй этаж?', ukrainian: 'Ви сказали другий поверх?', spanish: '¿Dijo el segundo piso?' },
    { english: 'Please repeat the queue number.', russian: 'Пожалуйста, повторите номер очереди.', ukrainian: 'Будь ласка, повторіть номер черги.', spanish: 'Por favor, repita el número de turno.' },
    { english: 'Now I understand the name.', russian: 'Теперь я понимаю имя.', ukrainian: 'Тепер я розумію ім\'я.', spanish: 'Ahora entiendo el nombre.' },
    { english: 'That instruction is clear now.', russian: 'Теперь эта инструкция понятна.', ukrainian: 'Тепер ця інструкція зрозуміла.', spanish: 'Esa instrucción está clara ahora.' },
  ],
  echo_d011_content_unit: [
    { english: 'Can I check what I understood?', russian: 'Могу я проверить, что я понял?', ukrainian: 'Можу я перевірити, що я зрозумів?', spanish: '¿Puedo verificar lo que entendí?' },
    { english: 'I heard the main instruction.', russian: 'Я услышал главную инструкцию.', ukrainian: 'Я почув головну інструкцію.', spanish: 'Escuché la instrucción principal.' },
    { english: 'I need one more detail.', russian: 'Мне нужна еще одна деталь.', ukrainian: 'Мені потрібна ще одна деталь.', spanish: 'Necesito un detalle más.' },
    { english: 'What should I do first?', russian: 'Что мне сделать сначала?', ukrainian: 'Що мені зробити спочатку?', spanish: '¿Qué debo hacer primero?' },
    { english: 'Please correct me if I am wrong.', russian: 'Пожалуйста, поправьте меня, если я ошибаюсь.', ukrainian: 'Будь ласка, поправте мене, якщо я помиляюся.', spanish: 'Por favor, corríjame si me equivoco.' },
    { english: 'I will repeat it back slowly.', russian: 'Я медленно повторю это обратно.', ukrainian: 'Я повільно повторю це назад.', spanish: 'Lo repetiré despacio.' },
  ],
};

function compactUnique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/[.!?]+$/g, '');
}

function targetWordsForPhrase(phrase: GavanCanonicalPhrase): string[] {
  return phrase.english
    .replace(/[.!?]+$/g, '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function canonicalWordCategory(phrase: GavanCanonicalPhrase, word: string): string {
  const norm = normalized(word);
  if (phrase.firstSeenConstructions.some((item) => normalized(item).split(/\s+/).includes(norm))) {
    return 'grammar';
  }
  if (phrase.newWords.some((item) => normalized(item).split(/\s+/).includes(norm))) {
    return 'vocabulary';
  }
  return 'phrase';
}

function canonicalWordDistractors(day: GavanCanonicalDay, word: string): string[] {
  const norm = normalized(word);
  const dayWords = day.phrases
    .flatMap(targetWordsForPhrase)
    .filter((candidate) => normalized(candidate) !== norm);
  const defaults = ['please', 'now', 'again', 'here', 'that', 'okay', 'right', 'check']
    .filter((candidate) => normalized(candidate) !== norm);

  return compactUnique([...dayWords, ...defaults]).slice(0, 5);
}

function canonicalTeachingNote(phrase: GavanCanonicalPhrase): LessonTeachingNote {
  const card = phrase.explanationCards[0];
  const fallback = `${phrase.english} работает как короткая готовая фраза. Сначала держим общий смысл, потом уже отдельные слова.`;

  return {
    id: card?.id ?? `${phrase.id}:canonical-note`,
    titleRu: card?.covers?.[0] ? `Фраза: ${card.covers[0]}` : 'Слушаем фразу целиком',
    correctRu: card?.correctRu ?? fallback,
    correctUk: card?.correctRu ?? fallback,
    correctEs: card?.correctRu ?? fallback,
    wrongRu: card?.wrongRu ?? 'Послушай еще раз и выбери смысл всей фразы, а не одно знакомое слово.',
    wrongUk: card?.wrongRu ?? 'Послушай еще раз и выбери смысл всей фразы, а не одно знакомое слово.',
    wrongEs: card?.wrongRu ?? 'Послушай еще раз и выбери смысл всей фразы, а не одно знакомое слово.',
  };
}

function canonicalWordsForPhrase(day: GavanCanonicalDay, phrase: GavanCanonicalPhrase): LessonWord[] {
  const words = targetWordsForPhrase(phrase);
  const note = canonicalTeachingNote(phrase);

  return words.map((word, index) => ({
    text: word,
    correct: word,
    distractors: canonicalWordDistractors(day, word),
    category: canonicalWordCategory(phrase, word),
    ...(index === words.length - 1 ? { teachingNote: note } : {}),
  }));
}

export function isGeneratedPersonalPlanPhraseLessonId(id: string | undefined): boolean {
  return Boolean(id && GENERATED_PLAN_PHRASE_LESSON_RE.test(id));
}

export function getGeneratedPersonalPlanPhraseLessonContentUnitIds(
  lessonId: string,
  count = 6,
): string[] {
  if (!isGeneratedPersonalPlanPhraseLessonId(lessonId)) return [];
  return Array.from({ length: Math.max(0, count) }, (_, index) => `${lessonId}_phrase_${index + 1}`);
}

function generatedWordsForPhrase(phrase: GeneratedPhraseTemplate, noteId: string): LessonWord[] {
  const targetWords = phrase.english
    .replace(/[.!?]+$/g, '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const phraseTokenSet = new Set(targetWords.map((word) => word.toLowerCase()));
  const distractorPools: Record<string, string[]> = {
    action: ['share', 'confirm', 'check', 'finish', 'send', 'start', 'review'],
    adjective: ['short', 'ready', 'simple', 'blocked', 'confirmed', 'urgent'],
    noun: ['owner', 'task', 'result', 'summary', 'deadline', 'update', 'blocker'],
    time: ['today', 'tomorrow', 'Friday', 'morning', 'later', 'soon'],
    phrase: ['please', 'again', 'briefly', 'slowly', 'carefully', 'clearly'],
  };
  const explanation = buildPhraseExplanation(phrase.english, phrase.russian);
  const teachingNote = note(
    noteId,
    explanation.title.ru,
    explanation.correct.ru,
    explanation.wrong.ru,
    {
      titleUk: explanation.title.uk,
      titleEs: explanation.title.es,
      correctUk: explanation.correct.uk,
      correctEs: explanation.correct.es,
      wrongUk: explanation.wrong.uk,
      wrongEs: explanation.wrong.es,
    },
  );

  return targetWords.map((word, index) => {
    const normalizedWord = word.toLowerCase();
    const category = /^(send|share|confirm|check|keep|follow|need|work|working|go|bring|repeat|get|use)$/i.test(word)
      ? 'action'
      : /^(clear|short|done|small|heavy|fragile|correct|ready|useful|simple)$/i.test(word)
        ? 'adjective'
        : /^(today|tomorrow|friday|week|minutes?|morning|later|now)$/i.test(word)
          ? 'time'
          : /^(owner|task|part|blocker|result|summary|deadline|steps?|passport|bag|gate|address|form)$/i.test(word)
            ? 'noun'
            : 'phrase';
    const pool = compactUnique([...(distractorPools[category] ?? []), ...distractorPools.phrase]);
    const distractors = pool
      .filter((item) => item.toLowerCase() !== normalizedWord)
      .filter((item) => !phraseTokenSet.has(item.toLowerCase()))
      .slice(0, 5);

    return {
      text: word,
      correct: word,
      distractors,
      category,
      // Attach the phrase-level explanation to the FIRST word so the learner
      // sees "what to build and why" as soon as the exercise opens.
      ...(index === 0 ? { teachingNote } : {}),
    };
  });
}

function buildGeneratedPlanPhraseLesson(id: string): PersonalPlanPhraseLesson | null {
  const match = GENERATED_PLAN_PHRASE_LESSON_RE.exec(id);
  if (!match) return null;

  const planId = match[1] as PersonalPlanId;
  const dayIndex = Number(match[2]);
  const plan = getPlanById(planId);
  const day = plan.days.find((item) => item.dayIndex === dayIndex);

  // Prefer real agent-authored content from the new pipeline (full explanations,
  // authored POS + distractors, day vocabulary). Falls back to the old template path
  // for days that have not been authored yet.
  const dayOneTemplates = GENERATED_DAY1_PHRASE_TEMPLATES[id];
  const contentResolution = dayOneTemplates
    ? { kind: 'missing' as const }
    : resolveBundledCompatibilityPlanContentPhraseLesson(planId, dayIndex);
  if (contentResolution.kind === 'authored_day') {
    const authored = contentResolution.day;
    // The catalog/navigation request content units by position: `${id}_phrase_${N}`.
    // The exercise item builders filter lesson.phrases by those ids. So the authored
    // phrases MUST be re-keyed to the same positional scheme (their internal ids like
    // "voyazh_d1_p1" would never match the requested "voyazh_d001_content_unit_phrase_1"
    // and every exercise task would show "задание не открылось").
    const phrases = contentDayToLessonPhrases(authored).map((phrase, index) => ({
      ...phrase,
      id: `${id}_phrase_${index + 1}`,
    }));
    return {
      id,
      planId,
      title: day?.title ?? authored.topic.ru,
      subtitle: day?.phraseGoal ?? authored.outcome.ru,
      afterLessonId: 1,
      rationale: day?.theory ?? authored.outcome.ru,
      phrases,
    };
  }

  if (contentResolution.kind === 'blocked') {
    return null;
  }

  const templates = dayOneTemplates ?? GENERATED_PLAN_PHRASE_TEMPLATES[planId];

  return {
    id,
    planId,
    title: day?.title ?? `Personal plan day ${dayIndex}`,
    subtitle: day?.phraseGoal ?? 'Personal plan phrase practice.',
    afterLessonId: 1,
    rationale: day?.theory ?? 'This day builds short phrases for the selected real-life scenario.',
    phrases: templates.map((template, index) => ({
      id: `${id}_phrase_${index + 1}`,
      english: template.english,
      russian: template.russian,
      // ukrainian is a required field; fall back to russian only as a stopgap until
      // real translations land. spanish is optional — leave it undefined (not a fake
      // russian copy) so the UI's documented russian fallback kicks in and es caches
      // are not polluted with russian text.
      ukrainian: template.ukrainian ?? template.russian,
      ...(template.spanish ? { spanish: template.spanish } : {}),
      words: generatedWordsForPhrase(template, `${id}_phrase_${index + 1}_note`),
    })),
  };
}

function buildGavanCanonicalMediaPhraseLesson(day: GavanCanonicalDay): PersonalPlanPhraseLesson {
  const afterLessonId = day.exerciseBlocks
    .flatMap((block) => block.prerequisiteLessonIds)
    .find((lessonId) => Number.isFinite(lessonId)) ?? 1;

  return {
    id: `gavan_week1_day${day.dayIndex}_canonical_media`,
    planId: 'gavan',
    title: day.titleRu,
    subtitle: day.goalRu,
    afterLessonId,
    rationale: day.prerequisiteSummaryRu,
    phrases: day.phrases.map((phrase) => ({
      id: phrase.id,
      english: phrase.english,
      russian: phrase.ru,
      ukrainian: phrase.uk ?? phrase.ru,
      ...(phrase.es ? { spanish: phrase.es } : {}),
      words: canonicalWordsForPhrase(day, phrase),
    })),
  };
}

export function getGavanCanonicalMediaPhraseLesson(id: string): PersonalPlanPhraseLesson | null {
  const match = GAVAN_WEEK1_CANONICAL_MEDIA_LESSON_RE.exec(id);
  if (!match) return null;

  const dayIndex = Number(match[1]);
  const day = buildGavanWeek1CanonicalPlan().days.find((item) => item.dayIndex === dayIndex);
  return day ? buildGavanCanonicalMediaPhraseLesson(day) : null;
}

function cleanPlanUserName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, 32) : 'Phraseman';
}

export function personalizePlanPhraseLesson(
  lesson: PersonalPlanPhraseLesson,
  userName: string | null | undefined,
): PersonalPlanPhraseLesson {
  const name = cleanPlanUserName(userName);
  const fill = (text: string | undefined): string | undefined => text?.replace(/\{\{name\}\}/g, name);
  return {
    ...lesson,
    title: fill(lesson.title) ?? lesson.title,
    subtitle: fill(lesson.subtitle) ?? lesson.subtitle,
    rationale: fill(lesson.rationale) ?? lesson.rationale,
    phrases: lesson.phrases.map((phrase) => ({
      ...phrase,
      english: fill(phrase.english) ?? phrase.english,
      spanish: fill(phrase.spanish),
      russian: fill(phrase.russian) ?? phrase.russian,
      ukrainian: fill(phrase.ukrainian) ?? phrase.ukrainian,
      words: phrase.words?.map((word) => ({
        ...word,
        text: fill(word.text) ?? word.text,
        correct: fill(word.correct) ?? word.correct,
        distractors: word.distractors.map((item) => fill(item) ?? item),
      })),
    })),
  };
}

export function getPersonalPlanPhraseLesson(id: string | string[] | undefined): PersonalPlanPhraseLesson | null {
  const lessonId = Array.isArray(id) ? id[0] : id;
  if (!lessonId) return null;
  if (GENERATED_DAY1_PHRASE_TEMPLATES[lessonId]) {
    return buildGeneratedPlanPhraseLesson(lessonId);
  }
  return PERSONAL_PLAN_PHRASE_LESSONS[lessonId]
    ?? getGavanCanonicalMediaPhraseLesson(lessonId)
    ?? buildGeneratedPlanPhraseLesson(lessonId);
}

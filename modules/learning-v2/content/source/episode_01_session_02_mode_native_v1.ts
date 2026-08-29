import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2Localized,
} from '../generator_course_contract';
import type {
  LearningV2ModeAudioReferenceV1,
  LearningV2ModeChoiceFeedbackV1,
  LearningV2ModeNativePayloadV1,
} from '../../contracts/mode_native_payload_v1';
import {
  expandLocalized,
  UNTRANSLATED_MARKER,
  type LocalizedSource,
  type SessionModeNativePracticeSourceV1,
  type SessionVocabularyContactStageV1,
  type SessionVocabularySourceV1,
} from './session_shard_from_source_v1';
import { EPISODE_01_SESSION_01_VOCABULARY_V1 } from './episode_01_session_01_vocabulary_v1';
import { EPISODE_01_SESSION_02_VOCABULARY_V1 } from './episode_01_session_02_vocabulary_v1';
import { EPISODE_01_SESSION_02_MODE_NATIVE_PHRASES } from './episode_01_session_02_affirmative_phrases_v1';

const vocabulary = EPISODE_01_SESSION_02_VOCABULARY_V1;
const phrases = EPISODE_01_SESSION_02_MODE_NATIVE_PHRASES;
const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

const INSTRUCTION = Object.freeze({
  repeatWord: {
    ru: 'Послушайте слово, затем произнесите его вслух.', uk: 'Послухайте слово, потім вимовте його вголос.',
    es: 'Escucha la palabra y luego repítela en voz alta.', 'pt-BR': 'Ouça a palavra e depois repita em voz alta.',
    vi: 'Nghe từ rồi đọc to từ đó.', id: 'Dengarkan katanya, lalu ucapkan dengan lantang.',
    tr: 'Sözcüğü dinleyin, sonra sesli söyleyin.', pl: 'Posłuchaj słowa, a potem powiedz je na głos.',
  },
  listenWord: {
    ru: 'Послушайте и выберите именно то слово, которое прозвучало.', uk: 'Послухайте й виберіть саме те слово, яке прозвучало.',
    es: 'Escucha y elige exactamente la palabra que suena.', 'pt-BR': 'Ouça e escolha exatamente a palavra que foi dita.',
    vi: 'Nghe và chọn đúng từ vừa được phát.', id: 'Dengarkan dan pilih tepat kata yang terdengar.',
    tr: 'Dinleyin ve tam olarak duyduğunuz sözcüğü seçin.', pl: 'Posłuchaj i wybierz dokładnie to słowo, które padło.',
  },
  contextMeaning: {
    ru: 'Дополните сообщение словом, которое точно подходит по смыслу.', uk: 'Доповніть повідомлення словом, яке точно пасує за змістом.',
    es: 'Completa el mensaje con la palabra que encaja exactamente por el sentido.', 'pt-BR': 'Complete a mensagem com a palavra que combina exatamente com o sentido.',
    vi: 'Hoàn thành lời nói bằng từ khớp chính xác với nghĩa.', id: 'Lengkapi pesan dengan kata yang paling tepat maknanya.',
    tr: 'İletiyi, anlama tam uyan sözcükle tamamlayın.', pl: 'Uzupełnij wypowiedź słowem, które dokładnie pasuje znaczeniem.',
  },
  listenMeaning: {
    ru: 'Послушайте слово и выберите его точное значение.', uk: 'Послухайте слово й виберіть його точне значення.',
    es: 'Escucha la palabra y elige su significado exacto.', 'pt-BR': 'Ouça a palavra e escolha o significado exato.',
    vi: 'Nghe từ và chọn đúng nghĩa của nó.', id: 'Dengarkan katanya dan pilih arti yang tepat.',
    tr: 'Sözcüğü dinleyin ve tam anlamını seçin.', pl: 'Posłuchaj słowa i wybierz jego dokładne znaczenie.',
  },
  listenBuildPhrase: {
    ru: 'Послушайте целую фразу и соберите её в услышанном порядке.', uk: 'Послухайте цілу фразу й складіть її в почутому порядку.',
    es: 'Escucha la frase completa y constrúyela en el orden que oyes.', 'pt-BR': 'Ouça a frase inteira e monte-a na ordem ouvida.',
    vi: 'Nghe cả câu và ghép lại theo đúng thứ tự đã nghe.', id: 'Dengarkan seluruh kalimat dan susun sesuai urutan yang terdengar.',
    tr: 'Cümlenin tamamını dinleyin ve duyduğunuz sırayla kurun.', pl: 'Posłuchaj całego zdania i ułóż je w usłyszanej kolejności.',
  },
  buildPhrase: {
    ru: 'Соберите полную фразу о своём состоянии.', uk: 'Складіть повну фразу про свій стан.',
    es: 'Construye una frase completa sobre tu estado.', 'pt-BR': 'Monte uma frase completa sobre o seu estado.',
    vi: 'Ghép một câu đầy đủ về trạng thái của bạn.', id: 'Susun kalimat lengkap tentang keadaan Anda.',
    tr: 'Kendi durumunuzla ilgili tam bir cümle kurun.', pl: 'Ułóż pełne zdanie o swoim stanie.',
  },
  contextBuild: {
    ru: 'Выберите точное слово, которое завершает смысл этой фразы.', uk: 'Виберіть точне слово, яке завершує зміст цієї фрази.',
    es: 'Elige la palabra exacta que completa el sentido de esta frase.', 'pt-BR': 'Escolha a palavra exata que completa o sentido desta frase.',
    vi: 'Chọn đúng từ hoàn thành ý nghĩa của câu này.', id: 'Pilih kata yang tepat untuk melengkapi makna kalimat ini.',
    tr: 'Bu cümlenin anlamını tamamlayan doğru sözcüğü seçin.', pl: 'Wybierz dokładne słowo, które dopełnia sens tego zdania.',
  },
  speedMatch: {
    ru: 'Соедините восемь английских слов с их точными значениями.', uk: 'З’єднайте вісім англійських слів із їхніми точними значеннями.',
    es: 'Une las ocho palabras inglesas con sus significados exactos.', 'pt-BR': 'Ligue as oito palavras em inglês aos significados exatos.',
    vi: 'Ghép tám từ tiếng Anh với nghĩa chính xác.', id: 'Pasangkan delapan kata bahasa Inggris dengan arti yang tepat.',
    tr: 'Sekiz İngilizce sözcüğü tam anlamlarıyla eşleştirin.', pl: 'Połącz osiem angielskich słów z ich dokładnymi znaczeniami.',
  },
  listenPhrase: {
    ru: 'Послушайте и выберите целую фразу, которая прозвучала.', uk: 'Послухайте й виберіть цілу фразу, яка прозвучала.',
    es: 'Escucha y elige la frase completa que suena.', 'pt-BR': 'Ouça e escolha a frase inteira que foi dita.',
    vi: 'Nghe và chọn đúng cả câu vừa được phát.', id: 'Dengarkan dan pilih seluruh kalimat yang terdengar.',
    tr: 'Dinleyin ve duyduğunuz tam cümleyi seçin.', pl: 'Posłuchaj i wybierz całe zdanie, które padło.',
  },
  repeatPhrase: {
    ru: 'Послушайте полную фразу, произнесите её и сравните с образцом.', uk: 'Послухайте повну фразу, вимовте її та порівняйте зі зразком.',
    es: 'Escucha la frase completa, repítela y compárala con el modelo.', 'pt-BR': 'Ouça a frase inteira, repita e compare com o modelo.',
    vi: 'Nghe cả câu, đọc lại rồi so sánh với mẫu.', id: 'Dengarkan kalimat lengkap, ucapkan, lalu bandingkan dengan contoh.',
    tr: 'Tam cümleyi dinleyin, söyleyin ve örnekle karşılaştırın.', pl: 'Posłuchaj pełnego zdania, powiedz je i porównaj ze wzorem.',
  },
} satisfies Readonly<Record<string, LocalizedSource>>);

function audio(id: string, transcript: string): LearningV2ModeAudioReferenceV1 {
  return Object.freeze({ audioTargetId: id, transcript });
}

const WORD_AUDIO = vocabulary.map((item) => audio(item.id, item.target));
const WORD_SLOW_AUDIO = vocabulary.map((item) => audio(`${item.id}-slow`, item.target));
const PHRASE_AUDIO = phrases.map((item) => audio(item.id, item.english));
const PHRASE_SLOW_AUDIO = phrases.map((item) => audio(`${item.id}-slow`, item.english));

function feedback(
  responseId: string,
  correct: boolean,
  testedDimension: string,
  feedbackByLocale: LearningV2Localized<string>,
): LearningV2ModeChoiceFeedbackV1 {
  return Object.freeze({ responseId, correct, testedDimension, feedbackByLocale });
}

function vocabularyFeedback(
  item: SessionVocabularySourceV1,
  stage: SessionVocabularyContactStageV1,
): readonly LearningV2ModeChoiceFeedbackV1[] {
  const contact = item.contacts[stage];
  return Object.freeze([
    feedback(`${item.id}:${stage}:correct`, true, stage, expandLocalized(contact.guidance)),
    ...contact.distractors.map((entry) => feedback(
      `${item.id}:${stage}:${entry.reasonCode}`,
      false,
      `${entry.trapType}:${entry.reasonCode}`,
      expandLocalized(entry.feedback),
    )),
  ]);
}

function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`session_02_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const detail = phrase.localizedDetails?.[locale];
    if (locale === 'en' && !detail) {
      const russian = phrase.localizedDetails?.ru?.[field];
      if (!russian) throw new Error(`session_02_phrase_ru_missing:${phraseIndex}`);
      return [locale, `${UNTRANSLATED_MARKER}${russian}`];
    }
    if (!detail) throw new Error(`session_02_phrase_locale_missing:${phraseIndex}:${locale}`);
    return [locale, detail[field]];
  })) as LearningV2Localized<string>;
}

function atomicLocalized(
  value: LearningV2Localized<string>,
): LearningV2Localized<string> {
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
    locale,
    value[locale].split('/')[0]!.trim(),
  ])) as LearningV2Localized<string>;
}

function localizedPhraseDistractorFeedback(
  phraseIndex: number,
  value: string,
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const reason = phrase?.localizedDetails?.[locale]?.distractors.find((entry) => entry.value === value)?.reason;
    if (locale === 'en' && !reason) {
      const russian = phrase?.localizedDetails?.ru?.distractors.find((entry) => entry.value === value)?.reason;
      if (!russian) throw new Error(`session_02_phrase_distractor_ru_missing:${phraseIndex}:${value}`);
      return [locale, `${UNTRANSLATED_MARKER}${russian}`];
    }
    if (!reason) throw new Error(`session_02_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
    return [locale, reason];
  })) as LearningV2Localized<string>;
}

function phraseBuilderFeedback(phraseIndex: number): readonly LearningV2ModeChoiceFeedbackV1[] {
  const phrase = phrases[phraseIndex]!;
  const values = [...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))];
  return Object.freeze([
    feedback(`${phrase.id}:builder:correct`, true, 'phrase_assembly', localizedPhraseField(phraseIndex, 'explanation')),
    ...values.map((value) => feedback(
      `${phrase.id}:builder:${value}`,
      false,
      `phrase_assembly:${value}`,
      localizedPhraseDistractorFeedback(phraseIndex, value),
    )),
  ]);
}

function repeatWord(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  return Object.freeze({
    family: 'scripted_repeat_compare',
    referenceAudio: WORD_AUDIO[index]!,
    slowReferenceAudio: WORD_SLOW_AUDIO[index]!,
    targetPhrase: item.target,
    recordControlPolicy: 'hold_press_release_with_accessible_toggle',
    modelPlayback: 'reference_and_slow',
    learnerPlayback: 'available_after_capture',
    honestOutcomeStates: Object.freeze(['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] as const),
  });
}

function listenChooseWord(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const contact = item.contacts.recognize;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: WORD_AUDIO[index]!,
    slowReferenceAudio: WORD_SLOW_AUDIO[index]!,
    localizedMeaningChoices: Object.freeze([
      { responseId: `${item.id}:recognize:correct`, targetText: item.target, meaningByLocale: null },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:recognize:${entry.reasonCode}`,
        targetText: entry.value,
        meaningByLocale: null,
      })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: vocabularyFeedback(item, 'recognize'),
  });
}

const EXTRA_MEANING = Object.freeze({
  happy: Object.freeze({
    value: 'tired',
    meaning: L({ ru: 'уставший', uk: 'втомлений', es: 'cansado', 'pt-BR': 'cansado', vi: 'mệt', id: 'lelah', tr: 'yorgun', pl: 'zmęczony' }),
    feedback: L({
      ru: 'Tired говорит, что батарейка человека почти села. Happy — про радость, а не про запас сил.',
      uk: 'Tired говорить, що батарейка людини майже сіла. Happy — про радість, а не про запас сил.',
      es: 'Tired dice que queda poca energía. Happy habla de alegría, no de la batería personal.',
      'pt-BR': 'Tired diz que a energia está no fim. Happy fala de alegria, não da bateria pessoal.',
      vi: 'Tired nói rằng pin năng lượng sắp cạn. Happy nói về niềm vui, không phải mức pin.',
      id: 'Tired berarti tenaga hampir habis. Happy berbicara tentang rasa senang, bukan baterai tubuh.',
      tr: 'Tired kişinin enerjisinin azaldığını söyler. Happy enerji değil, sevinç anlatır.',
      pl: 'Tired mówi, że osobista bateria prawie padła. Happy dotyczy radości, nie poziomu energii.',
    }),
  }),
  tired: Object.freeze({
    value: 'happy',
    meaning: L({ ru: 'счастливый', uk: 'щасливий', es: 'feliz', 'pt-BR': 'feliz', vi: 'vui vẻ', id: 'senang', tr: 'mutlu', pl: 'szczęśliwy' }),
    feedback: L({
      ru: 'Happy улыбается, tired ищет ближайший диван. В записи говорится именно о нехватке сил.',
      uk: 'Happy усміхається, tired шукає найближчий диван. У записі йдеться саме про брак сил.',
      es: 'Happy sonríe; tired busca el sofá más cercano. El audio habla de falta de energía.',
      'pt-BR': 'Happy sorri; tired procura o sofá mais próximo. O áudio fala de falta de energia.',
      vi: 'Happy đang cười; tired đang tìm chiếc ghế gần nhất. Âm thanh nói về việc thiếu sức.',
      id: 'Happy tersenyum; tired mencari sofa terdekat. Audio menyatakan kekurangan tenaga.',
      tr: 'Happy gülümser, tired en yakın koltuğu arar. Kayıt enerji eksikliğini anlatır.',
      pl: 'Happy się uśmiecha, tired szuka najbliższej kanapy. Nagranie mówi o braku sił.',
    }),
  }),
} as const);

const AUTHORED_DISTRACTOR_MEANING = Object.freeze({
  busy: L({ ru: 'занят', uk: 'зайнятий', es: 'ocupado', 'pt-BR': 'ocupado', vi: 'bận', id: 'sibuk', tr: 'meşgul', pl: 'zajęty' }),
});

function listenChooseMeaning(index: 0 | 2): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const contact = item.contacts.retrieve_meaning;
  const extra = EXTRA_MEANING[item.target as keyof typeof EXTRA_MEANING];
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: WORD_AUDIO[index]!,
    slowReferenceAudio: WORD_SLOW_AUDIO[index]!,
    localizedMeaningChoices: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, targetText: item.target, meaningByLocale: atomicLocalized(expandLocalized(item.meaning)) },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${entry.reasonCode}`,
        targetText: entry.value,
        meaningByLocale: atomicLocalized(
          AUTHORED_DISTRACTOR_MEANING[entry.value as keyof typeof AUTHORED_DISTRACTOR_MEANING]
            ?? expandLocalized(vocabulary.find((word) => word.target === entry.value)?.meaning
              ?? EPISODE_01_SESSION_01_VOCABULARY_V1.find((word) => word.target === entry.value)?.meaning
              ?? item.meaning),
        ),
      })),
      { responseId: `${item.id}:retrieve_meaning:extra_${extra.value}`, targetText: extra.value, meaningByLocale: extra.meaning },
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'retrieve_meaning'),
      feedback(`${item.id}:retrieve_meaning:extra_${extra.value}`, false, `semantic_neighbor:extra_${extra.value}`, extra.feedback),
    ]),
  });
}

const EXTRA_CONTEXT_FEEDBACK = Object.freeze({
  sad: L({
    ru: 'Fine означает спокойное «всё нормально». Здесь настроение явно провалилось ниже нормы, поэтому нужно sad.',
    uk: 'Fine означає спокійне «усе нормально». Тут настрій явно впав нижче норми, тому потрібне sad.',
    es: 'Fine significa que todo va bien. Aquí el ánimo cayó claramente, así que corresponde sad.',
    'pt-BR': 'Fine significa que está tudo bem. Aqui o humor caiu claramente, então a palavra é sad.',
    vi: 'Fine nghĩa là mọi thứ ổn. Ở đây tâm trạng đã tụt hẳn, nên cần sad.',
    id: 'Fine berarti keadaan baik-baik saja. Di sini suasana hati jelas turun, jadi pilih sad.',
    tr: 'Fine her şeyin normal olduğunu söyler. Burada ruh hâli açıkça düşmüş; gereken sad.',
    pl: 'Fine oznacza spokojne „wszystko dobrze”. Tutaj nastrój wyraźnie spadł, więc pasuje sad.',
  }),
  fine: L({
    ru: 'Happy добавляет настоящую радость. Fine скромнее: просто «нормально», без салюта и конфетти.',
    uk: 'Happy додає справжню радість. Fine скромніше: просто «нормально», без салюту й конфеті.',
    es: 'Happy añade alegría de verdad. Fine es más modesto: simplemente «bien», sin confeti.',
    'pt-BR': 'Happy traz alegria de verdade. Fine é mais modesto: apenas «bem», sem confete.',
    vi: 'Happy có niềm vui rõ ràng. Fine khiêm tốn hơn: chỉ là “ổn”, không cần pháo giấy.',
    id: 'Happy membawa kegembiraan. Fine lebih sederhana: hanya “baik-baik saja”, tanpa konfeti.',
    tr: 'Happy gerçek sevinç ekler. Fine daha sakindir: yalnızca “iyiyim”, konfeti yok.',
    pl: 'Happy dodaje prawdziwą radość. Fine jest skromniejsze: po prostu „w porządku”, bez konfetti.',
  }),
});

function contextMeaning(index: 1 | 3): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const phraseIndex = index;
  const contact = item.contacts.retrieve_meaning;
  const extraValue = index === 1 ? 'fine' : 'happy';
  const options = [item.target, ...contact.distractors.map((entry) => entry.value), extraValue];
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: atomicLocalized(localizedPhraseField(phraseIndex, 'meaning')),
    gappedTargetPhrase: 'I am ___',
    gapOptions: Object.freeze(options.map((text, optionIndex) => ({
      responseId: optionIndex === 0
        ? `${item.id}:retrieve_meaning:correct`
        : optionIndex <= contact.distractors.length
        ? `${item.id}:retrieve_meaning:${contact.distractors[optionIndex - 1]!.reasonCode}`
        : `${item.id}:retrieve_meaning:extra_${extraValue}`,
      text,
    }))),
    testedDimension: `meaning:${item.target}_in_i_am_frame`,
    choiceFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'retrieve_meaning'),
      feedback(`${item.id}:retrieve_meaning:extra_${extraValue}`, false, `semantic_neighbor:extra_${extraValue}`, EXTRA_CONTEXT_FEEDBACK[item.target as 'sad' | 'fine']),
    ]),
  });
}

function fullPhraseBuilder(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'phrase_builder',
    targetPhrase: phrase.english,
    localizedMeaning: atomicLocalized(localizedPhraseField(phraseIndex, 'meaning')),
    orderedTokens: Object.freeze(phrase.english.split(' ')),
    authoredDistractorTokens: Object.freeze([...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))]),
    slotFeedback: phraseBuilderFeedback(phraseIndex),
  });
}

function listenBuildPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'listen_build_dictation',
    referenceAudio: PHRASE_AUDIO[phraseIndex]!,
    slowReferenceAudio: PHRASE_SLOW_AUDIO[phraseIndex]!,
    hiddenTargetPhrase: phrase.english,
    orderedTokens: Object.freeze(phrase.english.split(' ')),
    authoredDistractorTokens: Object.freeze([...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))]),
    slotFeedback: phraseBuilderFeedback(phraseIndex),
  });
}

const READY_VS_TIRED_FEEDBACK = L({
  ru: 'Ready означает «готов» и говорит о начале. Здесь нужно tired: оно означает «устал» и точно завершает I am tired.',
  uk: 'Ready означає «готовий» і говорить про початок. Тут потрібне tired: воно означає «втомлений» і завершує I am tired.',
  es: 'Ready significa «listo para empezar». Aquí corresponde tired, «cansado», para completar I am tired.',
  'pt-BR': 'Ready significa «pronto para começar». Aqui entra tired, «cansado», para completar I am tired.',
  vi: 'Ready nghĩa là sẵn sàng bắt đầu. Ở đây cần tired, nghĩa là mệt, để hoàn thành I am tired.',
  id: 'Ready berarti siap memulai. Di sini diperlukan tired, yaitu lelah, untuk melengkapi I am tired.',
  tr: 'Ready “başlamaya hazır” demektir. Burada I am tired cümlesini tamamlayan “yorgun” anlamındaki tired gerekir.',
  pl: 'Ready znaczy „gotowy do rozpoczęcia”. Tutaj potrzebne jest tired, „zmęczony”, aby powstało I am tired.',
});

const TIRED_PHRASE_CHOICE_FEEDBACK: Readonly<Record<number, LearningV2Localized<string>>> = Object.freeze({
  0: L({
    ru: 'I am happy означает «я счастлив». В записи звучит I am tired — «я устал», поэтому решает последнее слово tired.',
    uk: 'I am happy означає «я щасливий». У записі звучить I am tired — «я втомлений», тож вирішальне слово tired.',
    es: 'I am happy significa «estoy feliz». El audio dice I am tired, «estoy cansado»; la clave es tired.',
    'pt-BR': 'I am happy significa «estou feliz». O áudio diz I am tired, «estou cansado»; a pista é tired.',
    vi: 'I am happy nghĩa là “tôi vui”. Âm thanh nói I am tired, “tôi mệt”; từ quyết định là tired.',
    id: 'I am happy berarti “saya senang”. Audio mengatakan I am tired, “saya lelah”; penentunya tired.',
    tr: 'I am happy “mutluyum” demektir. Kayıtta I am tired, yani “yorgunum” duyulur; belirleyici sözcük tired.',
    pl: 'I am happy znaczy „jestem szczęśliwy”. Nagranie mówi I am tired, „jestem zmęczony”; rozstrzyga tired.',
  }),
  1: L({
    ru: 'I am sad означает «я грустный». В записи звучит I am tired — «я устал»; sad и tired называют разные состояния.',
    uk: 'I am sad означає «я сумний». У записі звучить I am tired — «я втомлений»; sad і tired називають різні стани.',
    es: 'I am sad significa «estoy triste». El audio dice I am tired, «estoy cansado»; sad y tired son estados distintos.',
    'pt-BR': 'I am sad significa «estou triste». O áudio diz I am tired, «estou cansado»; sad e tired são estados diferentes.',
    vi: 'I am sad nghĩa là “tôi buồn”. Âm thanh nói I am tired, “tôi mệt”; sad và tired là hai trạng thái khác nhau.',
    id: 'I am sad berarti “saya sedih”. Audio mengatakan I am tired, “saya lelah”; sad dan tired berbeda keadaan.',
    tr: 'I am sad “üzgünüm” demektir. Kayıtta I am tired, yani “yorgunum” duyulur; sad ve tired farklı durumlardır.',
    pl: 'I am sad znaczy „jestem smutny”. Nagranie mówi I am tired, „jestem zmęczony”; sad i tired to różne stany.',
  }),
  3: L({
    ru: 'I am fine означает «у меня всё нормально». В записи звучит I am tired — «я устал»; нужно состояние tired.',
    uk: 'I am fine означає «у мене все нормально». У записі звучить I am tired — «я втомлений»; потрібен стан tired.',
    es: 'I am fine significa «estoy bien». El audio dice I am tired, «estoy cansado»; el estado correcto es tired.',
    'pt-BR': 'I am fine significa «estou bem». O áudio diz I am tired, «estou cansado»; o estado correto é tired.',
    vi: 'I am fine nghĩa là “tôi ổn”. Âm thanh nói I am tired, “tôi mệt”; trạng thái đúng là tired.',
    id: 'I am fine berarti “saya baik-baik saja”. Audio mengatakan I am tired, “saya lelah”; keadaan yang benar tired.',
    tr: 'I am fine “iyiyim” demektir. Kayıtta I am tired, yani “yorgunum” duyulur; doğru durum tired.',
    pl: 'I am fine znaczy „wszystko w porządku”. Nagranie mówi I am tired, „jestem zmęczony”; właściwy stan to tired.',
  }),
});

function contextBuildTired(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[2]!;
  const build = item.contacts.build_form;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: atomicLocalized(localizedPhraseField(2, 'meaning')),
    gappedTargetPhrase: 'I am ___',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:build_form:correct`, text: item.target },
      ...build.distractors.map((entry) => ({ responseId: `${item.id}:build_form:${entry.reasonCode}`, text: entry.value })),
      { responseId: `${item.id}:build_form:ready`, text: 'ready' },
    ]),
    testedDimension: 'orthography:tired_in_i_am_frame',
    choiceFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'build_form'),
      feedback(`${item.id}:build_form:ready`, false, 'semantic_neighbor:ready', READY_VS_TIRED_FEEDBACK),
    ]),
  });
}

const SPEED_WORDS = Object.freeze([
  ...vocabulary,
]);
const SPEED_IDS = SPEED_WORDS.map((word) => `e01-s02-pair-${word.target.toLowerCase()}`);
const speedMatchPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match',
  pairGrid: Object.freeze(SPEED_WORDS.map((word, index) => ({
    pairId: SPEED_IDS[index]!, target: word.target, meaningByLocale: atomicLocalized(expandLocalized(word.meaning)),
  }))),
  leftColumn: Object.freeze([SPEED_IDS[2]!, SPEED_IDS[0]!, SPEED_IDS[3]!, SPEED_IDS[1]!]),
  rightColumn: Object.freeze([SPEED_IDS[1]!, SPEED_IDS[3]!, SPEED_IDS[0]!, SPEED_IDS[2]!]),
  pairingKey: 'pair_id',
  timerPolicy: Object.freeze({ enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }),
  finishStats: Object.freeze(['speed', 'accuracy', 'personal_best'] as const),
});

function listenChoosePhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: PHRASE_AUDIO[phraseIndex]!,
    slowReferenceAudio: PHRASE_SLOW_AUDIO[phraseIndex]!,
    localizedMeaningChoices: Object.freeze(phrases.map((candidate, index) => ({
      responseId: `${phrase.id}:listen:${index === phraseIndex ? 'correct' : `phrase_${index}`}`,
      targetText: candidate.english,
      meaningByLocale: atomicLocalized(localizedPhraseField(index, 'meaning')),
    }))),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: Object.freeze(phrases.map((candidate, index) => feedback(
      `${phrase.id}:listen:${index === phraseIndex ? 'correct' : `phrase_${index}`}`,
      index === phraseIndex,
      index === phraseIndex ? 'listening_exact_phrase' : `semantic_neighbor:last_word:${candidate.english.split(' ').at(-1)}`,
      index === phraseIndex
        ? localizedPhraseField(phraseIndex, 'explanation')
        : phraseIndex === 2
        ? TIRED_PHRASE_CHOICE_FEEDBACK[index]!
        : localizedPhraseField(index, 'explanation'),
    ))),
  });
}

function contextPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[phraseIndex]!;
  const contact = item.contacts.retrieve_meaning;
  const extraValue = 'fine';
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: atomicLocalized(localizedPhraseField(phraseIndex, 'meaning')),
    gappedTargetPhrase: 'I am ___',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, text: item.target },
      ...contact.distractors.map((entry) => ({ responseId: `${item.id}:retrieve_meaning:${entry.reasonCode}`, text: entry.value })),
      { responseId: `${item.id}:retrieve_meaning:extra_${extraValue}`, text: extraValue },
    ]),
    testedDimension: `meaning:${item.target}_in_complete_statement`,
    choiceFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'retrieve_meaning'),
      feedback(`${item.id}:retrieve_meaning:extra_${extraValue}`, false, `semantic_neighbor:extra_${extraValue}`, EXTRA_CONTEXT_FEEDBACK.sad),
    ]),
  });
}

function repeatPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'scripted_repeat_compare',
    referenceAudio: PHRASE_AUDIO[phraseIndex]!,
    slowReferenceAudio: PHRASE_SLOW_AUDIO[phraseIndex]!,
    targetPhrase: phrase.english,
    recordControlPolicy: 'hold_press_release_with_accessible_toggle',
    modelPlayback: 'reference_and_slow',
    learnerPlayback: 'available_after_capture',
    honestOutcomeStates: Object.freeze(['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] as const),
  });
}

export const EPISODE_01_SESSION_02_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: repeatWord(0) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 1 }, modePayload: listenChooseWord(1) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 2 }, modePayload: repeatWord(2) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 3 }, modePayload: listenChooseWord(3) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 1 }, modePayload: contextMeaning(1) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 2 }, modePayload: listenChooseMeaning(2) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 3 }, modePayload: contextMeaning(3) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseMeaning(0) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuildPhrase, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenBuildPhrase(0) },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildPhrase, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 1 }, modePayload: fullPhraseBuilder(1) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextBuild, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 2 }, modePayload: contextBuildTired() },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildPhrase, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 3 }, modePayload: fullPhraseBuilder(3) },
  { family: 'speed_match', instruction: INSTRUCTION.speedMatch, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [0, 1, 2, 3] }, modePayload: speedMatchPayload },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildPhrase, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: fullPhraseBuilder(0) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextBuild, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: contextPhrase(1) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenPhrase, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: listenChoosePhrase(2) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: repeatPhrase(3) },
]);

if (EPISODE_01_SESSION_02_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error('session_02_mode_native_practice_count_invalid');
}

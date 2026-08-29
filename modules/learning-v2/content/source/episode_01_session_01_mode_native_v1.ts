import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2Localized,
} from "../generator_course_contract";
import type {
  LearningV2ModeAudioReferenceV1,
  LearningV2ModeChoiceFeedbackV1,
  LearningV2ModeNativePayloadV1,
} from "../../contracts/mode_native_payload_v1";
import {
  expandLocalized,
  UNTRANSLATED_MARKER,
  type LocalizedSource,
  type SessionModeNativePracticeSourceV1,
  type SessionVocabularyContactStageV1,
  type SessionVocabularySourceV1,
} from "./session_shard_from_source_v1";
import { EPISODE_01_SESSION_01_VOCABULARY_V1 } from "./episode_01_session_01_vocabulary_v1";
import { EPISODE_01_SESSION_01_WORD_FIRST_PHRASES } from "./episode_01_session_01_phrases_word_first_v1";

const vocabulary = EPISODE_01_SESSION_01_VOCABULARY_V1;
const phrases = EPISODE_01_SESSION_01_WORD_FIRST_PHRASES;

function localizedPhraseField(
  phraseIndex: number,
  field: "meaning" | "explanation",
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) {
    throw new Error(`session_01_mode_native_phrase_details_missing:${phraseIndex}`);
  }
  return Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
      const details = phrase.localizedDetails?.[locale];
      if (locale === "en" && !details) {
        const russian = phrase.localizedDetails?.ru?.[field];
        if (!russian) {
          throw new Error(`session_01_mode_native_phrase_locale_missing:${phraseIndex}:ru`);
        }
        return [locale, `${UNTRANSLATED_MARKER}${russian}`];
      }
      if (!details) {
        throw new Error(
          `session_01_mode_native_phrase_locale_missing:${phraseIndex}:${locale}`,
        );
      }
      return [locale, details[field]];
    }),
  ) as LearningV2Localized<string>;
}

function localizedPhraseDistractorFeedback(
  phraseIndex: number,
  value: string,
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  return Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
      const reason = phrase?.localizedDetails?.[locale]?.distractors.find(
        (entry) => entry.value === value,
      )?.reason ?? EPISODE_01_SESSION_01_PHRASE_THIRD_DISTRACTOR_FEEDBACK[value]?.[locale];
      if (locale === "en" && !reason) {
        const russian = phrase?.localizedDetails?.ru?.distractors.find(
          (entry) => entry.value === value,
        )?.reason;
        if (!russian) {
          throw new Error(
            `session_01_mode_native_phrase_distractor_missing:${phraseIndex}:ru:${value}`,
          );
        }
        return [locale, `${UNTRANSLATED_MARKER}${russian}`];
      }
      if (!reason) {
        throw new Error(
          `session_01_mode_native_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`,
        );
      }
      return [locale, reason];
    }),
  ) as LearningV2Localized<string>;
}

export const EPISODE_01_SESSION_01_PHRASE_THIRD_DISTRACTOR_FEEDBACK: Readonly<
  Record<string, LearningV2Localized<string>>
> = Object.freeze({
  me: L({
    ru: 'Me означает «меня/мне». Сообщение говорящего о себе начинается с I.', uk: 'Me означає «мене/мені». Повідомлення мовця про себе починається з I.', es: 'Me funciona como objeto. El mensaje del hablante sobre sí mismo empieza con I.', 'pt-BR': 'Me funciona como objeto. A mensagem de quem fala sobre si começa com I.', vi: 'Me là dạng tân ngữ. Người nói bắt đầu lời về mình bằng I.', id: 'Me adalah bentuk objek. Penutur memulai pernyataan tentang dirinya dengan I.', tr: 'Me nesne biçimidir. Konuşan kendisiyle ilgili söze I ile başlar.', pl: 'Me jest formą dopełnienia. Mówiący zaczyna wypowiedź o sobie od I.',
  }),
  "I'm": L({
    ru: "I'm уже содержит I и am. После отдельного I нужна только связка am.", uk: "I'm уже містить I та am. Після окремого I потрібна лише зв’язка am.", es: "I'm ya contiene I y am. Después de I solo hace falta am.", 'pt-BR': "I'm já contém I e am. Depois de I, basta am.", vi: "I'm đã chứa I và am. Sau I riêng chỉ cần am.", id: "I'm sudah memuat I dan am. Setelah I terpisah, cukup am.", tr: "I'm zaten I ve am içerir. Ayrı I sonrasında yalnız am gerekir.", pl: "I'm zawiera już I oraz am. Po osobnym I potrzebne jest tylko am.",
  }),
  her: L({
    ru: 'Her означает «её/ей» и теряет финальную e. Место «здесь» пишется here.', uk: 'Her означає «її/їй» і втрачає кінцеву e. Місце «тут» пишеться here.', es: 'Her significa «su/a ella» y pierde la e final. «Aquí» se escribe here.', 'pt-BR': 'Her significa «dela/a ela» e perde o e final. «Aqui» se escreve here.', vi: 'Her nghĩa là “cô ấy/của cô ấy” và thiếu e cuối. “Ở đây” viết here.', id: 'Her berarti “dia/miliknya” dan kehilangan e akhir. “Di sini” ditulis here.', tr: 'Her “onu/onun” anlamındadır ve sondaki e eksiktir. “Burada” here yazılır.', pl: 'Her znaczy „ją/jej” i nie ma końcowego e. „Tutaj” zapisujemy here.',
  }),
  red: L({
    ru: 'Red означает «красный» и заканчивается раньше. Состояние «готов» выражает ready.', uk: 'Red означає «червоний» і закінчується раніше. Стан «готовий» передає ready.', es: 'Red significa «rojo» y termina antes. El estado «listo» se expresa con ready.', 'pt-BR': 'Red significa «vermelho» e termina antes. O estado «pronto» se expressa com ready.', vi: 'Red nghĩa là “màu đỏ” và kết thúc sớm hơn. “Sẵn sàng” là ready.', id: 'Red berarti “merah” dan lebih pendek. Keadaan “siap” dinyatakan dengan ready.', tr: 'Red “kırmızı” demektir ve daha kısadır. “Hazır” durumu ready ile anlatılır.', pl: 'Red znaczy „czerwony” i kończy się wcześniej. Stan „gotowy” wyraża ready.',
  }),
});

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
    feedback(
      `${item.id}:${stage}:correct`,
      true,
      stage,
      expandLocalized(contact.guidance),
    ),
    ...contact.distractors.map((entry) =>
      feedback(
        `${item.id}:${stage}:${entry.reasonCode}`,
        false,
        `${entry.trapType}:${entry.reasonCode}`,
        expandLocalized(entry.feedback),
      ),
    ),
  ]);
}

function phraseBuilderFeedback(
  phraseIndex: number,
): readonly LearningV2ModeChoiceFeedbackV1[] {
  const phrase = phrases[phraseIndex]!;
  const distractorValues = phrase.words.flatMap((word) =>
    word.distractors.map((entry) => entry.value),
  );
  return Object.freeze([
    feedback(
      `${phrase.id}:builder:correct`,
      true,
      "phrase_assembly",
      localizedPhraseField(phraseIndex, "explanation"),
    ),
    ...distractorValues.map((value) =>
      feedback(
        `${phrase.id}:builder:${value}`,
        false,
        `phrase_assembly:${value}`,
        localizedPhraseDistractorFeedback(phraseIndex, value),
      ),
    ),
  ]);
}

function L(source: LocalizedSource): LearningV2Localized<string> {
  return expandLocalized(source);
}

const LISTEN_HERE_READY = L({
  ru: "I am ready означает «я готов», но прозвучало I am here — «я здесь»: последнее слово указывает место, а не готовность.",
  uk: "I am ready означає «я готовий», але прозвучало I am here — «я тут»: останнє слово вказує місце, а не готовність.",
  es: "I am ready significa «estoy listo», pero sonó I am here, «estoy aquí»: la última palabra indica lugar, no preparación.",
  "pt-BR": "I am ready significa «estou pronto», mas soou I am here, «estou aqui»: a última palavra indica lugar, não preparo.",
  vi: "I am ready nghĩa là “tôi sẵn sàng”, nhưng âm thanh là I am here, “tôi ở đây”: từ cuối chỉ nơi chốn, không phải sự sẵn sàng.",
  id: "I am ready berarti “saya siap”, tetapi yang terdengar I am here, “saya di sini”: kata terakhir menunjukkan tempat, bukan kesiapan.",
  tr: "I am ready “hazırım” demektir; duyulan ise I am here, “buradayım”: son sözcük hazırlığı değil, yeri gösterir.",
  pl: "I am ready znaczy „jestem gotowy”, lecz słychać I am here — „jestem tutaj”: ostatnie słowo wskazuje miejsce, nie gotowość.",
});
const LISTEN_THERE_MEANING = L({
  ru: "Я там", uk: "Я там", es: "Estoy allí", "pt-BR": "Estou lá",
  vi: "Tôi ở đó", id: "Saya di sana", tr: "Oradayım", pl: "Jestem tam",
});
const LISTEN_HOME_MEANING = L({
  ru: "Я дома", uk: "Я вдома", es: "Estoy en casa", "pt-BR": "Estou em casa",
  vi: "Tôi ở nhà", id: "Saya di rumah", tr: "Evdeyim", pl: "Jestem w domu",
});
const LISTEN_HERE_THERE = L({
  ru: "I am there означает «я там», но прозвучало I am here — «я здесь». Ловушка меняет именно место.",
  uk: "I am there означає «я там», але прозвучало I am here — «я тут». Пастка змінює саме місце.",
  es: "I am there significa «estoy allí», pero sonó I am here, «estoy aquí». La trampa cambia justo el lugar.",
  "pt-BR": "I am there significa «estou lá», mas soou I am here, «estou aqui». A armadilha troca justamente o lugar.",
  vi: "I am there nghĩa là “tôi ở đó”, nhưng âm thanh là I am here, “tôi ở đây”. Bẫy nằm ở việc đổi địa điểm.",
  id: "I am there berarti “saya di sana”, tetapi yang terdengar I am here, “saya di sini”. Jebakannya menukar tempat.",
  tr: "I am there “oradayım” demektir; duyulan I am here, “buradayım”. Tuzak yalnızca yeri değiştirir.",
  pl: "I am there znaczy „jestem tam”, lecz słychać I am here — „jestem tutaj”. Pułapka zmienia właśnie miejsce.",
});
const LISTEN_HERE_HOME = L({
  ru: "I am home означает «я дома», но прозвучало I am here — «я здесь». Here говорит о текущем месте, не обязательно о доме.",
  uk: "I am home означає «я вдома», але прозвучало I am here — «я тут». Here називає поточне місце, не обов’язково дім.",
  es: "I am home significa «estoy en casa», pero sonó I am here, «estoy aquí». Here marca el lugar actual, no necesariamente la casa.",
  "pt-BR": "I am home significa «estou em casa», mas soou I am here, «estou aqui». Here marca o lugar atual, não necessariamente casa.",
  vi: "I am home nghĩa là “tôi ở nhà”, nhưng âm thanh là I am here, “tôi ở đây”. Here chỉ vị trí hiện tại, không nhất thiết là nhà.",
  id: "I am home berarti “saya di rumah”, tetapi yang terdengar I am here, “saya di sini”. Here menunjuk tempat saat ini, belum tentu rumah.",
  tr: "I am home “evdeyim” demektir; duyulan I am here, “buradayım”. Here şu anki yeri söyler; bu yer ev olmak zorunda değildir.",
  pl: "I am home znaczy „jestem w domu”, lecz słychać I am here — „jestem tutaj”. Here wskazuje obecne miejsce, niekoniecznie dom.",
});

const HERE_AUDIO: LearningV2ModeAudioReferenceV1 = Object.freeze({
  audioTargetId: "legacy-lesson1_phrase_1",
  transcript: "I am here",
});

function authoredAudio(
  audioTargetId: string,
  transcript: string,
): LearningV2ModeAudioReferenceV1 {
  return Object.freeze({ audioTargetId, transcript });
}

// Stable logical targets exist before immutable clips are published. The DEV
// owner-preview reads their exact transcripts through on-device TTS; release
// audio later binds to the same ids without changing authored interactions.
const WORD_AUDIO = Object.freeze([
  authoredAudio("e01-s01-word-i", "I"),
  authoredAudio("e01-s01-word-am", "am"),
  authoredAudio("e01-s01-word-here", "here"),
  authoredAudio("e01-s01-word-ready", "ready"),
]);
const WORD_SLOW_AUDIO = Object.freeze([
  authoredAudio("e01-s01-word-i-slow", "I"),
  authoredAudio("e01-s01-word-am-slow", "am"),
  authoredAudio("e01-s01-word-here-slow", "here"),
  authoredAudio("e01-s01-word-ready-slow", "ready"),
]);
const HERE_SLOW_AUDIO = authoredAudio(
  "e01-s01-phrase-i-am-here-slow",
  "I am here",
);
const READY_AUDIO = authoredAudio("e01-s01-phrase-i-am-ready", "I am ready");
const READY_SLOW_AUDIO = authoredAudio(
  "e01-s01-phrase-i-am-ready-slow",
  "I am ready",
);

const EXTRA_RECOGNIZE_TRAPS = Object.freeze({
  0: Object.freeze({
    value: "Y",
    reasonCode: "i_recognize_y_initial_glide",
    feedback: L({
      ru: "Y звучит /waɪ/: перед /aɪ/ слышится короткое /w/. У I этого начального скольжения нет — только /aɪ/.",
      uk: "Y звучить /waɪ/: перед /aɪ/ чути коротке /w/. У I цього початкового ковзання немає — лише /aɪ/.",
      es: "Y suena /waɪ/: antes de /aɪ/ aparece un breve /w/. I no tiene ese inicio; suena solo /aɪ/.",
      "pt-BR": "Y soa /waɪ/: antes de /aɪ/ há um /w/ curto. I não tem esse início; soa apenas /aɪ/.",
      vi: "Y đọc /waɪ/: có âm /w/ ngắn trước /aɪ/. I không có âm mở đầu đó, chỉ là /aɪ/.",
      id: "Y berbunyi /waɪ/: ada /w/ singkat sebelum /aɪ/. I tidak memiliki bunyi awal itu, hanya /aɪ/.",
      tr: "Y /waɪ/ diye okunur; /aɪ/ öncesinde kısa bir /w/ vardır. I bu başlangıcı taşımaz, yalnız /aɪ/ olur.",
      pl: "Y brzmi /waɪ/: przed /aɪ/ słychać krótkie /w/. I nie ma tego początku, brzmi tylko /aɪ/.",
    }),
  }),
  1: Object.freeze({
    value: "I'm",
    reasonCode: "am_recognize_im_extra_i_sound",
    feedback: L({
      ru: "I'm начинается с /aɪ/ — сначала отчётливо слышится I. В коротком am сразу звучит /æ/ и затем губы закрываются на /m/.",
      uk: "I'm починається з /aɪ/ — спочатку чітко чути I. У короткому am одразу звучить /æ/, а далі губи змикаються на /m/.",
      es: "I'm empieza con /aɪ/: primero se oye claramente I. Am empieza directamente con /æ/ y cierra los labios en /m/.",
      "pt-BR": "I'm começa com /aɪ/: primeiro aparece claramente I. Am começa direto em /æ/ e fecha os lábios no /m/.",
      vi: "I'm mở đầu bằng /aɪ/, nên nghe rõ I trước. Am đi thẳng vào /æ/ rồi khép môi ở /m/.",
      id: "I'm diawali /aɪ/, jadi I terdengar lebih dulu. Am langsung diawali /æ/ lalu bibir menutup pada /m/.",
      tr: "I'm /aɪ/ ile başlar; önce I açıkça duyulur. Am doğrudan /æ/ ile başlar ve /m/ ile kapanır.",
      pl: "I'm zaczyna się /aɪ/, więc najpierw wyraźnie słychać I. Am zaczyna się od /æ/ i zamyka usta na /m/.",
    }),
  }),
  2: Object.freeze({
    value: "hero",
    reasonCode: "here_recognize_hero_extra_syllable",
    feedback: L({
      ru: "Hero начинается похоже, но после here-сегмента слышен ещё один слог /roʊ/. В here слово заканчивается сразу после /hɪr/.",
      uk: "Hero починається схоже, але після частини here чути ще один склад /roʊ/. У here слово закінчується одразу після /hɪr/.",
      es: "Hero empieza de forma parecida, pero añade otra sílaba, /roʊ/. Here termina justo después de /hɪr/.",
      "pt-BR": "Hero começa de modo parecido, mas acrescenta outra sílaba, /roʊ/. Here termina logo depois de /hɪr/.",
      vi: "Hero mở đầu gần giống nhưng còn thêm âm tiết /roʊ/. Here kết thúc ngay sau /hɪr/.",
      id: "Hero berawal mirip, tetapi masih memiliki suku kata /roʊ/. Here selesai tepat setelah /hɪr/.",
      tr: "Hero benzer başlar ama sonunda ek /roʊ/ hecesi duyulur. Here /hɪr/ sonrasında biter.",
      pl: "Hero zaczyna się podobnie, ale dodaje sylabę /roʊ/. Here kończy się zaraz po /hɪr/.",
    }),
  }),
  3: Object.freeze({
    value: "already",
    reasonCode: "ready_recognize_already_extra_opening",
    feedback: L({
      ru: "Already прячет ready в конце, но перед ним ещё слышится /ɔːl/. В записи слово начинается сразу с /red-/: ready.",
      uk: "Already містить ready наприкінці, але перед ним ще чути /ɔːl/. У записі слово одразу починається з /red-/: ready.",
      es: "Already contiene un final parecido a ready, pero antes se oye /ɔːl/. El audio empieza directamente por /red-/: ready.",
      "pt-BR": "Already termina parecido com ready, mas antes aparece /ɔːl/. O áudio começa direto em /red-/: ready.",
      vi: "Already có phần cuối giống ready nhưng còn âm /ɔːl/ ở trước. Âm thanh bắt đầu ngay bằng /red-/: ready.",
      id: "Already memiliki akhir yang mirip ready, tetapi ada /ɔːl/ di depannya. Audio langsung dimulai /red-/: ready.",
      tr: "Already sonunda ready benzeri bir bölüm taşır ama önce /ɔːl/ duyulur. Kayıt doğrudan /red-/ ile başlar: ready.",
      pl: "Already ma zakończenie podobne do ready, ale wcześniej słychać /ɔːl/. Nagranie zaczyna się od razu /red-/: ready.",
    }),
  }),
} as const);

const EXTRA_MEANING_TRAPS = Object.freeze({
  0: Object.freeze({
    value: "you",
    reasonCode: "i_meaning_you_other_person",
    feedback: L({
      ru: "You указывает на собеседника — «ты/вы». Когда человек называет самого себя, нужен I — «я».",
      uk: "You вказує на співрозмовника — «ти/ви». Коли людина називає саму себе, потрібне I — «я».",
      es: "You señala a la otra persona, «tú/usted». Para nombrarse a uno mismo se usa I, «yo».",
      "pt-BR": "You aponta para a outra pessoa, «você». Para falar de si como sujeito, usa-se I, «eu».",
      vi: "You chỉ người đang nghe, còn I chỉ chính người đang nói. Nghĩa “tôi” cần I.",
      id: "You menunjuk lawan bicara, sedangkan I menunjuk orang yang sedang berbicara sendiri.",
      tr: "You karşıdaki kişiyi, I ise konuşanın kendisini gösterir. “Ben” anlamı için I gerekir.",
      pl: "You wskazuje rozmówcę, a I osobę mówiącą. Znaczenie „ja” wymaga I.",
    }),
  }),
  1: Object.freeze({
    value: "I",
    reasonCode: "am_meaning_i_speaker_not_link",
    feedback: L({
      ru: "I означает «я» и называет говорящего. В этом задании нужна связка «есть / являюсь» — am.",
      uk: "I означає «я» і називає мовця. Тут потрібна зв’язка «є» — am.",
      es: "I significa «yo» y nombra a quien habla. Aquí se pide la unión «soy/estoy»: am.",
      "pt-BR": "I significa «eu» e nomeia quem fala. Aqui se pede a ligação «sou/estou»: am.",
      vi: "I nghĩa là “tôi” và gọi tên người nói. Ở đây cần từ nối “là/đang”: am.",
      id: "I berarti “saya” dan menyebut penutur. Di sini yang dicari adalah penghubung “adalah”: am.",
      tr: "I “ben” demektir ve konuşanı gösterir. Burada istenen bağlayıcı “-im” anlamındaki am'dir.",
      pl: "I znaczy „ja” i wskazuje mówiącego. Tutaj potrzebny jest łącznik „jestem”: am.",
    }),
  }),
  2: Object.freeze({
    value: "near",
    reasonCode: "here_meaning_near_proximity_not_location",
    feedback: L({
      ru: "Near означает «рядом/близко» и обычно требует назвать, рядом с чем. Самостоятельное «здесь» — here.",
      uk: "Near означає «поруч/близько» й зазвичай потребує сказати, поруч із чим. Самостійне «тут» — here.",
      es: "Near significa «cerca» y normalmente necesita indicar cerca de qué. «Aquí» por sí solo es here.",
      "pt-BR": "Near significa «perto» e normalmente pede dizer perto de quê. «Aqui» sozinho é here.",
      vi: "Near nghĩa là “gần” và thường cần nói gần cái gì. Từ độc lập mang nghĩa “ở đây” là here.",
      id: "Near berarti “dekat” dan biasanya perlu menyebut dekat dengan apa. “Di sini” sendiri ialah here.",
      tr: "Near “yakın” demektir ve genellikle neye yakın olduğunu ister. Tek başına “burada” anlamı here olur.",
      pl: "Near znaczy „blisko” i zwykle wymaga wskazania, blisko czego. Samodzielne „tutaj” to here.",
    }),
  }),
  3: Object.freeze({
    value: "waiting",
    reasonCode: "ready_meaning_waiting_action_not_readiness",
    feedback: L({
      ru: "Waiting означает «ждущий/жду»: это действие ожидания. Ready говорит, что всё подготовлено и можно начинать.",
      uk: "Waiting означає «чекаю/той, хто чекає»: це дія очікування. Ready показує, що все підготовлено й можна починати.",
      es: "Waiting significa «esperando»: describe la acción de esperar. Ready indica que todo está preparado para empezar.",
      "pt-BR": "Waiting significa «esperando»: é a ação de esperar. Ready indica que está tudo pronto para começar.",
      vi: "Waiting là “đang chờ”, một hành động. Ready nghĩa là đã chuẩn bị xong và có thể bắt đầu.",
      id: "Waiting berarti “sedang menunggu”, yaitu sebuah tindakan. Ready berarti sudah siap untuk mulai.",
      tr: "Waiting “bekliyor” eylemini anlatır. Ready ise hazırlığın tamam olduğunu ve başlanabileceğini söyler.",
      pl: "Waiting oznacza „czekający/czekam” i opisuje czynność. Ready mówi, że wszystko jest przygotowane i można zaczynać.",
    }),
  }),
} as const);

// Meaning-choice labels are authored for the learner's own language. Showing
// the English trap tokens here turned a meaning task into another spelling
// task (for example I / me / my / you under «значение слова»).
const VOCABULARY_TRAP_MEANINGS = Object.freeze({
  me: L({ ru: "меня", uk: "мене", es: "me", "pt-BR": "me", vi: "tôi ở vị trí tân ngữ", id: "saya sebagai objek", tr: "beni", pl: "mnie" }),
  my: L({ ru: "мой", uk: "мій", es: "mi", "pt-BR": "meu", vi: "của tôi", id: "milik saya", tr: "benim", pl: "mój" }),
  you: L({ ru: "ты", uk: "ти", es: "tú", "pt-BR": "você", vi: "bạn", id: "kamu", tr: "sen", pl: "ty" }),
  an: L({ ru: "слово an", uk: "слово an", es: "la palabra an", "pt-BR": "a palavra an", vi: "từ an", id: "kata an", tr: "an sözcüğü", pl: "słowo an" }),
  m: L({ ru: "буква m", uk: "літера m", es: "la letra m", "pt-BR": "a letra m", vi: "chữ m", id: "huruf m", tr: "m harfi", pl: "litera m" }),
  I: L({ ru: "я", uk: "я", es: "yo", "pt-BR": "eu", vi: "tôi", id: "saya", tr: "ben", pl: "ja" }),
  there: L({ ru: "там", uk: "там", es: "allí", "pt-BR": "lá", vi: "ở đó", id: "di sana", tr: "orada", pl: "tam" }),
  home: L({ ru: "дома", uk: "удома", es: "en casa", "pt-BR": "em casa", vi: "ở nhà", id: "di rumah", tr: "evde", pl: "w domu" }),
  near: L({ ru: "рядом", uk: "поруч", es: "cerca", "pt-BR": "perto", vi: "gần", id: "dekat", tr: "yakın", pl: "blisko" }),
  busy: L({ ru: "занят", uk: "зайнятий", es: "ocupado", "pt-BR": "ocupado", vi: "bận", id: "sibuk", tr: "meşgul", pl: "zajęty" }),
  tired: L({ ru: "устал / устала", uk: "втомився / втомилася", es: "cansado / cansada", "pt-BR": "cansado / cansada", vi: "mệt", id: "lelah", tr: "yorgun", pl: "zmęczony / zmęczona" }),
  waiting: L({ ru: "жду / ожидаю", uk: "чекаю", es: "esperando", "pt-BR": "esperando", vi: "đang chờ", id: "sedang menunggu", tr: "bekliyorum", pl: "czekam" }),
} as const satisfies Readonly<Record<string, LearningV2Localized<string>>>);

function vocabularyTrapMeaning(value: string): LearningV2Localized<string> {
  const localized = VOCABULARY_TRAP_MEANINGS[
    value as keyof typeof VOCABULARY_TRAP_MEANINGS
  ];
  if (!localized) throw new Error(`session_01_trap_meaning_missing:${value}`);
  return Object.freeze(
    Object.fromEntries(
      Object.entries(localized).map(([locale, copy]) => [
        locale,
        copy.split("/")[0]!.trim(),
      ]),
    ),
  ) as unknown as LearningV2Localized<string>;
}

function atomicLocalizedMeaning(
  localized: LearningV2Localized<string>,
): LearningV2Localized<string> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(localized).map(([locale, copy]) => [
        locale,
        copy.split("/")[0]!.trim(),
      ]),
    ),
  ) as unknown as LearningV2Localized<string>;
}

function atomicVocabularyMeaning(
  item: (typeof vocabulary)[number],
): LearningV2Localized<string> {
  const localized = expandLocalized(item.meaning);
  return Object.freeze(
    Object.fromEntries(
      Object.entries(localized).map(([locale, copy]) => [
        locale,
        copy.split("/")[0]!.trim(),
      ]),
    ),
  ) as unknown as LearningV2Localized<string>;
}

function listenChooseWord(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const contact = item.contacts.recognize;
  return Object.freeze({
    family: "listen_choose",
    referenceAudio: WORD_AUDIO[index]!,
    slowReferenceAudio: WORD_SLOW_AUDIO[index]!,
    localizedMeaningChoices: Object.freeze([
      {
        responseId: `${item.id}:recognize:correct`,
        targetText: item.target,
        meaningByLocale: null,
      },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:recognize:${entry.reasonCode}`,
        targetText: entry.value,
        meaningByLocale: null,
      })),
    ]),
    transcriptRevealPolicy: "after_first_attempt",
    choiceFeedback: vocabularyFeedback(item, "recognize"),
  });
}

function vocabularyFeedbackForReason(
  item: SessionVocabularySourceV1,
  stage: SessionVocabularyContactStageV1,
  reasonCode: string,
): LearningV2ModeChoiceFeedbackV1 {
  const row = vocabularyFeedback(item, stage).find((entry) =>
    entry.responseId.endsWith(`:${reasonCode}`),
  );
  if (!row) {
    throw new Error(`session_01_vocabulary_feedback_missing:${item.id}:${stage}:${reasonCode}`);
  }
  return row;
}

function listenBuildWord(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  return Object.freeze({
    family: "listen_build_dictation",
    referenceAudio: WORD_AUDIO[index]!,
    slowReferenceAudio: WORD_SLOW_AUDIO[index]!,
    hiddenTargetPhrase: item.target,
    orderedTokens: Object.freeze([item.target]),
    // Only real, authored neighbouring words are offered. Deliberately misspelled
    // pseudo-words made the answer look like a spelling CAPTCHA rather than a
    // learning decision.
    authoredDistractorTokens: Object.freeze([
      ...item.contacts.recognize.distractors.map((entry) => entry.value),
    ]),
    slotFeedback: vocabularyFeedback(item, "recognize"),
  });
}

function listenChooseMeaning(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const contact = item.contacts.retrieve_meaning;
  return Object.freeze({
    family: "listen_choose",
    referenceAudio: WORD_AUDIO[index]!,
    slowReferenceAudio: WORD_SLOW_AUDIO[index]!,
    localizedMeaningChoices: Object.freeze([
      {
        responseId: `${item.id}:retrieve_meaning:correct`,
        targetText: item.target,
        meaningByLocale: atomicVocabularyMeaning(item),
      },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${entry.reasonCode}`,
        targetText: entry.value,
        meaningByLocale: vocabularyTrapMeaning(entry.value),
      })),
    ]),
    transcriptRevealPolicy: "after_first_attempt",
    choiceFeedback: vocabularyFeedback(item, "retrieve_meaning"),
  });
}

function vocabularyFormBuilder(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const build = item.contacts.build_form;
  return Object.freeze({
    family: "phrase_builder",
    targetPhrase: item.target,
    localizedMeaning: expandLocalized(item.meaning),
    orderedTokens: Object.freeze([item.target]),
    authoredDistractorTokens: Object.freeze([
      ...build.distractors.map((entry) => entry.value),
    ]),
    slotFeedback: vocabularyFeedback(item, "build_form"),
  });
}

function vocabularyMeaningBuilder(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const meaning = item.contacts.retrieve_meaning;
  return Object.freeze({
    family: "phrase_builder",
    targetPhrase: item.target,
    localizedMeaning: expandLocalized(item.meaning),
    orderedTokens: Object.freeze([item.target]),
    authoredDistractorTokens: Object.freeze([
      ...meaning.distractors.map((entry) => entry.value),
    ]),
    slotFeedback: vocabularyFeedback(item, "retrieve_meaning"),
  });
}

function listenBuildPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: "listen_build_dictation",
    referenceAudio: phraseIndex === 0 ? HERE_AUDIO : READY_AUDIO,
    slowReferenceAudio:
      phraseIndex === 0 ? HERE_SLOW_AUDIO : READY_SLOW_AUDIO,
    hiddenTargetPhrase: phrase.english,
    orderedTokens: Object.freeze(phrase.english.split(" ")),
    authoredDistractorTokens: Object.freeze(
      phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)),
    ),
    slotFeedback: phraseBuilderFeedback(phraseIndex),
  });
}

function listenChooseHerePhrase(): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[0]!;
  const ready = phrases[1]!;
  return Object.freeze({
    family: "listen_choose",
    referenceAudio: HERE_AUDIO,
    slowReferenceAudio: HERE_SLOW_AUDIO,
    localizedMeaningChoices: Object.freeze([
      {
        responseId: `${phrase.id}:listen:correct`,
        targetText: phrase.english,
        meaningByLocale: localizedPhraseField(0, "meaning"),
      },
      {
        responseId: `${phrase.id}:listen:ready`,
        targetText: ready.english,
        meaningByLocale: atomicLocalizedMeaning(localizedPhraseField(1, "meaning")),
      },
      {
        responseId: `${phrase.id}:listen:there`,
        targetText: "I am there",
        meaningByLocale: LISTEN_THERE_MEANING,
      },
      {
        responseId: `${phrase.id}:listen:home`,
        targetText: "I am home",
        meaningByLocale: LISTEN_HOME_MEANING,
      },
    ]),
    transcriptRevealPolicy: "after_first_attempt",
    choiceFeedback: Object.freeze([
      feedback(
        `${phrase.id}:listen:correct`,
        true,
        "listening_exact_phrase",
        localizedPhraseField(0, "explanation"),
      ),
      feedback(
        `${phrase.id}:listen:ready`,
        false,
        "semantic_neighbor:last_word",
        LISTEN_HERE_READY,
      ),
      feedback(
        `${phrase.id}:listen:there`,
        false,
        "phonetic:here_versus_there",
        LISTEN_HERE_THERE,
      ),
      feedback(
        `${phrase.id}:listen:home`,
        false,
        "phonetic:here_versus_home",
        LISTEN_HERE_HOME,
      ),
    ]),
  });
}

function contextGap(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const item = vocabulary[0]!;
  const subjectFeedback = vocabularyFeedback(item, "retrieve_meaning");
  const youTrap = item.contacts.retrieve_meaning.distractors.find(
    (entry) => entry.value === "you",
  );
  if (!youTrap) throw new Error("session_01_context_gap_you_trap_missing");
  return Object.freeze({
    family: "context_gap_grammar",
    localizedScene: localizedPhraseField(phraseIndex, "meaning"),
    gappedTargetPhrase: phrase.english.replace(/^I\b/u, "___"),
    gapOptions: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, text: "I" },
      { responseId: `${item.id}:retrieve_meaning:i_meaning_me_object_case`, text: "me" },
      { responseId: `${item.id}:retrieve_meaning:i_meaning_my_possessive`, text: "my" },
      { responseId: `${item.id}:retrieve_meaning:${youTrap.reasonCode}`, text: "you" },
    ]),
    testedDimension: "grammar:first_person_subject_before_am",
    choiceFeedback: Object.freeze(subjectFeedback),
  });
}

function repeatCompare(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: "scripted_repeat_compare",
    referenceAudio: phraseIndex === 0 ? HERE_AUDIO : READY_AUDIO,
    slowReferenceAudio:
      phraseIndex === 0 ? HERE_SLOW_AUDIO : READY_SLOW_AUDIO,
    targetPhrase: phrase.english,
    recordControlPolicy: "hold_press_release_with_accessible_toggle",
    modelPlayback: "reference_and_slow",
    learnerPlayback: "available_after_capture",
    honestOutcomeStates: Object.freeze([
      "PASS_CONFIDENT",
      "NEEDS_WORK_CONFIDENT",
      "UNCERTAIN",
      "INVALID_AUDIO_OR_SYSTEM",
    ] as const),
  });
}

const SPEED_MATCH_VOCABULARY = Object.freeze([
  { id: "i", target: "I", meaning: L({ ru: "я", uk: "я", es: "yo", "pt-BR": "eu", vi: "tôi", id: "saya", tr: "ben", pl: "ja" }) },
  { id: "am", target: "am", meaning: L({ ru: "есть", uk: "є", es: "soy", "pt-BR": "sou", vi: "là", id: "adalah", tr: "-im", pl: "jestem" }) },
  { id: "here", target: "here", meaning: L({ ru: "здесь", uk: "тут", es: "aquí", "pt-BR": "aqui", vi: "ở đây", id: "di sini", tr: "burada", pl: "tutaj" }) },
  { id: "ready", target: "ready", meaning: L({ ru: "готов", uk: "готовий", es: "listo", "pt-BR": "pronto", vi: "sẵn sàng", id: "siap", tr: "hazır", pl: "gotowy" }) },
] as const);

const speedMatchVocabularyPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: "speed_match",
  pairGrid: Object.freeze(
    SPEED_MATCH_VOCABULARY.map((word) => ({
      pairId: `e01-s01-pair-${word.id}`,
      target: word.target,
      meaningByLocale: word.meaning,
    })),
  ),
  leftColumn: Object.freeze([
    "e01-s01-pair-here",
    "e01-s01-pair-i",
    "e01-s01-pair-am",
    "e01-s01-pair-ready",
  ]),
  rightColumn: Object.freeze([
    "e01-s01-pair-ready",
    "e01-s01-pair-i",
    "e01-s01-pair-here",
    "e01-s01-pair-am",
  ]),
  pairingKey: "pair_id",
  timerPolicy: Object.freeze({
    enabledByDefault: true,
    learnerCanDisable: true,
    pausesOnInterruption: true,
  }),
  finishStats: Object.freeze(["speed", "accuracy", "personal_best"] as const),
});

export const EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1 = Object.freeze<
  readonly SessionModeNativePracticeSourceV1[]
>([
  {
    family: "listen_choose",
    purpose: "supported_practice",
    learningStage: "recognize",
    target: { kind: "vocabulary", sourceIndex: 0 },
    modePayload: listenChooseWord(0),
  },
  {
    family: "listen_build_dictation",
    purpose: "supported_practice",
    learningStage: "recognize",
    target: { kind: "vocabulary", sourceIndex: 1 },
    modePayload: listenBuildWord(1),
  },
  {
    family: "listen_choose",
    purpose: "supported_practice",
    learningStage: "recognize",
    target: { kind: "vocabulary", sourceIndex: 2 },
    modePayload: listenChooseWord(2),
  },
  {
    family: "listen_build_dictation",
    purpose: "supported_practice",
    learningStage: "recognize",
    target: { kind: "vocabulary", sourceIndex: 3 },
    modePayload: listenBuildWord(3),
  },
  {
    family: "phrase_builder",
    purpose: "retrieval_practice",
    learningStage: "retrieve_meaning",
    target: { kind: "vocabulary", sourceIndex: 0 },
    modePayload: vocabularyMeaningBuilder(0),
  },
  {
    family: "listen_choose",
    purpose: "retrieval_practice",
    learningStage: "retrieve_meaning",
    target: { kind: "vocabulary", sourceIndex: 1 },
    modePayload: listenChooseMeaning(1),
  },
  {
    family: "phrase_builder",
    purpose: "retrieval_practice",
    learningStage: "retrieve_meaning",
    target: { kind: "vocabulary", sourceIndex: 2 },
    modePayload: vocabularyMeaningBuilder(2),
  },
  {
    family: "listen_choose",
    purpose: "retrieval_practice",
    learningStage: "retrieve_meaning",
    target: { kind: "vocabulary", sourceIndex: 3 },
    modePayload: listenChooseMeaning(3),
  },
  {
    family: "phrase_builder",
    purpose: "guided_practice",
    learningStage: "build_form",
    target: { kind: "vocabulary", sourceIndex: 1 },
    modePayload: vocabularyFormBuilder(1),
  },
  {
    family: "listen_build_dictation",
    purpose: "guided_practice",
    learningStage: "build_form",
    target: { kind: "vocabulary", sourceIndex: 0 },
    modePayload: listenBuildWord(0),
  },
  {
    family: "phrase_builder",
    purpose: "guided_practice",
    learningStage: "build_form",
    target: { kind: "vocabulary", sourceIndex: 3 },
    modePayload: vocabularyFormBuilder(3),
  },
  {
    family: "listen_build_dictation",
    purpose: "guided_practice",
    learningStage: "build_form",
    target: { kind: "vocabulary", sourceIndex: 2 },
    modePayload: listenBuildWord(2),
  },
  {
    family: "speed_match",
    purpose: "near_transfer",
    learningStage: "apply_in_phrase",
    target: { kind: "vocabulary_grid", sourceIndices: [0, 1, 2, 3] },
    modePayload: speedMatchVocabularyPayload,
  },
  {
    family: "listen_build_dictation",
    purpose: "guided_practice",
    learningStage: "apply_in_phrase",
    target: { kind: "phrase", sourceIndex: 1 },
    modePayload: listenBuildPhrase(1),
  },
  {
    family: "listen_choose",
    purpose: "near_transfer",
    learningStage: "apply_in_phrase",
    target: { kind: "phrase", sourceIndex: 0 },
    modePayload: listenChooseHerePhrase(),
  },
  {
    family: "context_gap_grammar",
    purpose: "near_transfer",
    learningStage: "apply_in_phrase",
    target: { kind: "phrase", sourceIndex: 1 },
    modePayload: contextGap(1),
  },
  {
    family: "scripted_repeat_compare",
    purpose: "independent_check",
    learningStage: "speak_with_model",
    target: { kind: "phrase", sourceIndex: 0 },
    modePayload: repeatCompare(0),
  },
]);

if (EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error("session_01_mode_native_practice_count_invalid");
}

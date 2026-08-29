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
import { ES_EPISODE_01_SESSION_01_VOCABULARY_V1 } from './es_episode_01_session_01_vocabulary_v1';
import { ES_EPISODE_01_SESSION_01_PHRASES } from './es_episode_01_session_01_phrases_v1';

// зачем этот файл (владелец, 2026-08-25/26, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10): испанская сессия 1 переписывается один в один по форме
// английского эталона episode_01_session_01_mode_native_v1.ts — тот же набор
// из 17 interactions, то же чередование families по трём word-first стадиям
// (recognize/retrieve_meaning/build_form) для четырёх слов, тот же порядок
// apply_in_phrase/speak_with_model в конце. Испанские target, IPA, дистракторы,
// feedback и локализации — полностью самостоятельные, не копия английских:
// раздел 6/7 СТАРТ ES запрещает механический перенос ловушек с английского.
//
// зачем ИМЕННО es/soy/fácil/verdad (те же 4 слова, что уже были в старом
// формате es_episode_01_session_01_vocabulary_v1.ts): SPANISH_CURRICULUM_GRID
// фиксирует урок 1 = ser + оценка/реакция (Es fácil, Es verdad, No es difícil,
// Es igual, No es así, Eres rápido, Somos dos). Четыре слова этой сессии —
// связка для «оно/он/она» (es), связка для «я» (soy), первый признак (fácil)
// и устойчивая реакция (verdad) — минимальный набор, из которого строятся две
// первые ключевые фразы урока (Es fácil, Es verdad), не выходя за грамматику
// урока 1 (только ser, без eres/somos/son, без вопроса, без отрицания —
// это сессии 2+ того же урока).
const vocabulary = ES_EPISODE_01_SESSION_01_VOCABULARY_V1;
const phrases = ES_EPISODE_01_SESSION_01_PHRASES.filter(
  (phrase) => phrase.id === 'es-e01-s01-es-facil' || phrase.id === 'es-e01-s01-es-verdad',
);
if (phrases.length !== 2) {
  throw new Error('es_session_01_mode_native_phrase_subset_invalid');
}

function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) {
    throw new Error(`es_session_01_mode_native_phrase_details_missing:${phraseIndex}`);
  }
  return Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
      const details = phrase.localizedDetails?.[locale];
      // зачем 'en' вместо 'es' здесь (СТАРТ ES преамбула): в испанском
      // контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
      // ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). LEARNING_V2_INTERFACE_LOCALES
      // общий для обоих контуров и включает 'es'; для испанского контура
      // читаем под явным псевдонимом englishExplanationLocale, чтобы не
      // перепутать с целевым испанским текстом.
      const englishExplanationLocale = locale === 'es' ? 'en' : locale;
      const value = phrase.localizedDetails?.[englishExplanationLocale as typeof locale]?.[field]
        ?? details?.[field];
      if (!value) {
        throw new Error(
          `es_session_01_mode_native_phrase_locale_missing:${phraseIndex}:${locale}`,
        );
      }
      return [locale, value];
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
      const englishExplanationLocale = locale === 'es' ? 'en' : locale;
      const reason = phrase?.localizedDetails?.[englishExplanationLocale as typeof locale]?.distractors.find(
        (entry) => entry.value === value,
      )?.reason;
      if (!reason) {
        throw new Error(
          `es_session_01_mode_native_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`,
        );
      }
      return [locale, reason];
    }),
  ) as LearningV2Localized<string>;
}

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
  const distractorValues = [
    ...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value))),
  ];
  return Object.freeze([
    feedback(
      `${phrase.id}:builder:correct`,
      true,
      'phrase_assembly',
      localizedPhraseField(phraseIndex, 'explanation'),
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

const L = (source: LocalizedSource): LearningV2Localized<string> =>
  expandLocalized(source);

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
  authoredAudio('es-e01-s01-word-es', 'es'),
  authoredAudio('es-e01-s01-word-soy', 'soy'),
  authoredAudio('es-e01-s01-word-facil', 'fácil'),
  authoredAudio('es-e01-s01-word-verdad', 'verdad'),
]);
const WORD_SLOW_AUDIO = Object.freeze([
  authoredAudio('es-e01-s01-word-es-slow', 'es'),
  authoredAudio('es-e01-s01-word-soy-slow', 'soy'),
  authoredAudio('es-e01-s01-word-facil-slow', 'fácil'),
  authoredAudio('es-e01-s01-word-verdad-slow', 'verdad'),
]);
const FACIL_PHRASE_AUDIO = authoredAudio('es-e01-s01-phrase-es-facil', 'Es fácil');
const FACIL_PHRASE_SLOW_AUDIO = authoredAudio(
  'es-e01-s01-phrase-es-facil-slow',
  'Es fácil',
);
const VERDAD_PHRASE_AUDIO = authoredAudio('es-e01-s01-phrase-es-verdad', 'Es verdad');
const VERDAD_PHRASE_SLOW_AUDIO = authoredAudio(
  'es-e01-s01-phrase-es-verdad-slow',
  'Es verdad',
);

// зачем именно эти четыре испанские фонетические ловушки (не перевод
// английских hero/already/Y/I'm): каждая — реально близкое по звуку испанское
// слово или форма, подобранная под конкретный target этой сессии.
// es → eres (лишний слог -re- перед тем же окончанием, см. словарный файл
// recognize-контакта es); soy → son (тот же дифтонг начала не при чём, зато
// конечный носовой /n/ вместо /i/ — учтено ниже отдельным EXTRA-набором,
// т.к. эта ловушка для soy уже есть в словаре, здесь берём вторую — hoy,
// омофон-ловушка «сегодня» с тем же дифтонгом /oi/, начинающимся на другую
// согласную); fácil → fatal (похожая длина и ударный слог, но другое второе
// согласное f-t вместо f-c, частая ошибка новичка на слух); verdad → verás
// (тот же корень ver-, другое окончание, оба слова высокочастотные).
const EXTRA_RECOGNIZE_TRAPS = Object.freeze({
  0: Object.freeze({
    value: 'eres',
    reasonCode: 'es_recognize_eres_extra_syllable_mode_native',
    feedback: L({
      ru: 'Eres добавляет слог /e-re-/ перед тем же окончанием -s; es звучит короче — сразу /es/, без лишнего слога в начале.',
      uk: 'Eres додає склад /e-re-/ перед тим самим закінченням -s; es звучить коротше — одразу /es/, без зайвого складу на початку.',
      es: 'Eres adds the syllable /e-re-/ before the same -s ending; es is shorter — straight to /es/, with no extra syllable at the start.',
      'pt-BR': 'Eres acrescenta a sílaba /e-re-/ antes da mesma terminação -s; es é mais curto — direto para /es/, sem sílaba extra no início.',
      vi: 'Eres thêm âm tiết /e-re-/ trước cùng đuôi -s; es ngắn hơn — đi thẳng vào /es/, không có âm tiết thừa ở đầu.',
      id: 'Eres menambahkan suku kata /e-re-/ sebelum akhiran -s yang sama; es lebih pendek — langsung ke /es/, tanpa suku kata tambahan di awal.',
      tr: 'Eres, aynı -s sonundan önce /e-re-/ hecesini ekler; es daha kısadır — doğrudan /es/\'e gider, başta fazladan hece yoktur.',
      pl: 'Eres dodaje sylabę /e-re-/ przed tą samą końcówką -s; es brzmi krócej — od razu /es/, bez dodatkowej sylaby na początku.',
    }),
  }),
  1: Object.freeze({
    value: 'hoy',
    reasonCode: 'soy_recognize_hoy_different_onset',
    feedback: L({
      ru: 'Hoy начинается немой h и тем же дифтонгом /oi/, но означает «сегодня» — совсем другое слово. Soy начинается со звонкого /s/.',
      uk: 'Hoy починається з німого h і тим самим дифтонгом /oi/, але означає «сьогодні» — зовсім інше слово. Soy починається зі дзвінкого /s/.',
      es: 'Hoy starts with a silent h and the same diphthong /oi/, but it means "today" — a completely different word. Soy starts with a voiced /s/.',
      'pt-BR': 'Hoy começa com um h mudo e o mesmo ditongo /oi/, mas significa "hoje" — uma palavra completamente diferente. Soy começa com um /s/ sonoro.',
      vi: 'Hoy bắt đầu bằng h câm và cùng nguyên âm đôi /oi/, nhưng nghĩa là "hôm nay" — một từ hoàn toàn khác. Soy bắt đầu bằng /s/ hữu thanh.',
      id: 'Hoy diawali h yang tidak berbunyi dan diftong /oi/ yang sama, tetapi berarti "hari ini" — kata yang sama sekali berbeda. Soy diawali /s/ yang bersuara.',
      tr: 'Hoy sessiz bir h ile ve aynı /oi/ ikili ünlüsüyle başlar ama "bugün" anlamına gelir — tamamen farklı bir kelime. Soy ötümlü bir /s/ ile başlar.',
      pl: 'Hoy zaczyna się niemym h i tym samym dyftongiem /oi/, ale znaczy „dzisiaj” — zupełnie inne słowo. Soy zaczyna się dźwięcznym /s/.',
    }),
  }),
  2: Object.freeze({
    value: 'fatal',
    reasonCode: 'facil_recognize_fatal_different_consonant',
    feedback: L({
      ru: 'Fatal имеет похожую длину и ударение на последнем слоге — fa-TAL, но второй звук /t/, а не /θ/~/s/. Fácil ударен на первом слоге: FÁ-cil.',
      uk: 'Fatal має схожу довжину і наголос на останньому складі — fa-TAL, але другий звук /t/, а не /θ/~/s/. Fácil наголошений на першому складі: FÁ-cil.',
      es: 'Fatal has a similar length and is stressed on the last syllable — fa-TAL, but the second sound is /t/, not /θ/~/s/. Fácil is stressed on the first syllable: FÁ-cil.',
      'pt-BR': 'Fatal tem comprimento parecido e acento na última sílaba — fa-TAL, mas o segundo som é /t/, não /θ/~/s/. Fácil é acentuado na primeira sílaba: FÁ-cil.',
      vi: 'Fatal có độ dài tương tự và trọng âm ở âm tiết cuối — fa-TAL, nhưng âm thứ hai là /t/, không phải /θ/~/s/. Fácil có trọng âm ở âm tiết đầu: FÁ-cil.',
      id: 'Fatal memiliki panjang yang mirip dan tekanan pada suku kata terakhir — fa-TAL, tetapi bunyi kedua adalah /t/, bukan /θ/~/s/. Fácil memiliki tekanan pada suku kata pertama: FÁ-cil.',
      tr: 'Fatal benzer uzunluğa sahiptir ve son hecede vurgu vardır — fa-TAL, ama ikinci ses /t/\'dir, /θ/~/s/ değil. Fácil ilk hecede vurgulanır: FÁ-cil.',
      pl: 'Fatal ma podobną długość i akcent na ostatniej sylabie — fa-TAL, ale drugi dźwięk to /t/, nie /θ/~/s/. Fácil ma akcent na pierwszej sylabie: FÁ-cil.',
    }),
  }),
  3: Object.freeze({
    value: 'verás',
    reasonCode: 'verdad_recognize_veras_different_ending',
    feedback: L({
      ru: 'Verás начинается с того же корня ver-, но заканчивается на -ás («увидишь») — совсем другое слово и другое ударение. Verdad заканчивается на -DAD.',
      uk: 'Verás починається з того самого кореня ver-, але закінчується на -ás («побачиш») — зовсім інше слово й інший наголос. Verdad закінчується на -DAD.',
      es: 'Verás starts with the same root ver-, but ends in -ás ("you will see") — a completely different word with different stress. Verdad ends in -DAD.',
      'pt-BR': 'Verás começa com a mesma raiz ver-, mas termina em -ás ("verá") — uma palavra completamente diferente, com acento diferente. Verdad termina em -DAD.',
      vi: 'Verás bắt đầu bằng cùng gốc ver-, nhưng kết thúc bằng -ás ("sẽ thấy") — một từ hoàn toàn khác với trọng âm khác. Verdad kết thúc bằng -DAD.',
      id: 'Verás dimulai dengan akar kata yang sama ver-, tetapi berakhir dengan -ás ("akan melihat") — kata yang sama sekali berbeda dengan tekanan berbeda. Verdad berakhir dengan -DAD.',
      tr: 'Verás aynı ver- köküyle başlar ama -ás ("göreceksin") ile biter — farklı vurgulu, tamamen farklı bir kelime. Verdad -DAD ile biter.',
      pl: 'Verás zaczyna się od tego samego rdzenia ver-, ale kończy się na -ás ("zobaczysz") — zupełnie inne słowo z innym akcentem. Verdad kończy się na -DAD.',
    }),
  }),
} as const);

// зачем именно эти значенческие ловушки: близкие по смыслу испанские слова,
// которые новичок мог бы спутать со значением target на стадии
// retrieve_meaning — параллель английским EXTRA_MEANING_TRAPS (you/I/near/waiting),
// но подобрана для испанской лексики этой же сессии.
const EXTRA_MEANING_TRAPS = Object.freeze({
  0: Object.freeze({
    value: 'está',
    reasonCode: 'es_meaning_esta_estar_confusion',
    feedback: L({
      ru: 'Está — от другого глагола, estar: про место или временное состояние («находится», «сейчас такой»). Es — про постоянный признак или личность: «является».',
      uk: 'Está — від іншого дієслова, estar: про місце чи тимчасовий стан («знаходиться», «зараз такий»). Es — про постійну ознаку чи особу: «є».',
      es: 'Está comes from a different verb, estar: it is about location or a temporary state ("is located", "is currently"). Es is about a permanent quality or identity: "is".',
      'pt-BR': 'Está vem de outro verbo, estar: fala de lugar ou estado temporário ("está localizado", "está assim agora"). Es fala de uma qualidade permanente ou identidade: "é".',
      vi: 'Está đến từ một động từ khác, estar: nói về vị trí hoặc trạng thái tạm thời ("đang ở", "hiện đang như vậy"). Es nói về đặc điểm lâu dài hoặc danh tính: "là".',
      id: 'Está berasal dari kata kerja lain, estar: tentang lokasi atau keadaan sementara ("berada di", "sedang begini"). Es tentang sifat permanen atau identitas: "adalah".',
      tr: 'Está farklı bir fiilden gelir, estar: yer veya geçici bir durum hakkındadır ("bulunuyor", "şu an böyle"). Es kalıcı bir nitelik veya kimlik hakkındadır: "-dir".',
      pl: 'Está pochodzi z innego czasownika, estar: dotyczy miejsca lub stanu tymczasowego („znajduje się”, „jest teraz taki”). Es dotyczy trwałej cechy lub tożsamości: „jest”.',
    }),
  }),
  1: Object.freeze({
    value: 'estoy',
    reasonCode: 'soy_meaning_estoy_estar_confusion',
    feedback: L({
      ru: 'Estoy — от estar, тоже «я», но про временное состояние или место («я сейчас устал», «я здесь»). Soy — про постоянное качество говорящего.',
      uk: 'Estoy — від estar, теж «я», але про тимчасовий стан чи місце («я зараз втомлений», «я тут»). Soy — про постійну якість мовця.',
      es: 'Estoy comes from estar, also "I", but about a temporary state or location ("I am tired right now", "I am here"). Soy is about the speaker\'s permanent quality.',
      'pt-BR': 'Estoy vem de estar, também "eu", mas sobre um estado temporário ou lugar ("estou cansado agora", "estou aqui"). Soy fala da qualidade permanente de quem fala.',
      vi: 'Estoy đến từ estar, cũng là "tôi", nhưng nói về trạng thái tạm thời hoặc vị trí ("tôi đang mệt", "tôi ở đây"). Soy nói về đặc điểm lâu dài của người nói.',
      id: 'Estoy berasal dari estar, juga "saya", tetapi tentang keadaan sementara atau lokasi ("saya lelah sekarang", "saya di sini"). Soy tentang sifat permanen penutur.',
      tr: 'Estoy, estar\'dan gelir, o da "ben" demektir, ama geçici bir durum veya yer hakkındadır ("şu an yorgunum", "buradayım"). Soy konuşanın kalıcı niteliği hakkındadır.',
      pl: 'Estoy pochodzi od estar, też „ja”, ale dotyczy stanu tymczasowego lub miejsca („jestem teraz zmęczony”, „jestem tutaj”). Soy dotyczy trwałej cechy mówiącego.',
    }),
  }),
  2: Object.freeze({
    value: 'difícil',
    reasonCode: 'facil_meaning_dificil_opposite_extra',
    feedback: L({
      ru: 'Difícil означает «трудный» — прямая противоположность. «Лёгкий», не требующий усилий — fácil.',
      uk: 'Difícil означає «важкий» — пряма протилежність. «Легкий», що не потребує зусиль — fácil.',
      es: 'Difícil means "hard" — the direct opposite. "Easy", not requiring effort, is fácil.',
      'pt-BR': 'Difícil significa "difícil" — o oposto direto. "Fácil", que não exige esforço, é fácil.',
      vi: 'Difícil nghĩa là "khó" — trái nghĩa trực tiếp. "Dễ", không cần cố gắng, là fácil.',
      id: 'Difícil berarti "sulit" — kebalikan langsung. "Mudah", yang tidak memerlukan usaha, adalah fácil.',
      tr: 'Difícil "zor" demektir — doğrudan zıttı. Çaba gerektirmeyen "kolay" ise fácil.',
      pl: 'Difícil znaczy „trudny” — bezpośrednie przeciwieństwo. „Łatwy”, niewymagający wysiłku, to fácil.',
    }),
  }),
  // зачем НЕ mentira (было раньше): verdad.contacts.retrieve_meaning.distractors
  // в es_episode_01_session_01_vocabulary_v1.ts УЖЕ содержит mentira (и fácil).
  // listenChooseMeaning/vocabularyMeaningBuilder добавляют этот extra ПОВЕРХ
  // contact.distractors без проверки на пересечение — с mentira здесь задание
  // предлагало «ложь» дважды среди вариантов одной карточки. hoy («сегодня»)
  // не пересекается ни с одним из существующих ловушек verdad.
  3: Object.freeze({
    value: 'hoy',
    reasonCode: 'verdad_meaning_hoy_unrelated_extra',
    feedback: L({
      ru: 'Hoy означает «сегодня» — совсем другое слово, про время, а не про правдивость. Подтверждение чужих слов — verdad, «правда».',
      uk: 'Hoy означає «сьогодні» — зовсім інше слово, про час, а не про правдивість. Підтвердження чужих слів — verdad, «правда».',
      es: 'Hoy means "today" — a completely different word, about time, not about truthfulness. Confirming someone else\'s words is verdad, "truth".',
      'pt-BR': 'Hoy significa "hoje" — uma palavra completamente diferente, sobre tempo, não sobre veracidade. Confirmar as palavras de outra pessoa é verdad, "verdade".',
      vi: 'Hoy nghĩa là "hôm nay" — một từ hoàn toàn khác, nói về thời gian, không phải về sự thật. Xác nhận lời người khác là verdad, "sự thật".',
      id: 'Hoy berarti "hari ini" — kata yang sama sekali berbeda, tentang waktu, bukan tentang kebenaran. Mengonfirmasi kata-kata orang lain adalah verdad, "kebenaran".',
      tr: 'Hoy "bugün" demektir — zamanla ilgili tamamen farklı bir kelime, doğrulukla ilgili değil. Başkasının sözlerini onaylamak verdad, yani "gerçek"tir.',
      pl: 'Hoy znaczy „dzisiaj” — zupełnie inne słowo, o czasie, nie o prawdziwości. Potwierdzenie cudzych słów to verdad, „prawda”.',
    }),
  }),
} as const);

// Meaning-choice labels are authored for the learner's own language, exactly
// as the English precedent does — showing the raw Spanish trap tokens under
// "meaning" would turn a meaning task into another spelling task.
const VOCABULARY_TRAP_MEANINGS = Object.freeze({
  es: L({ ru: 'является (он/она/оно)', uk: 'є (він/вона/воно)', es: 'is (he/she/it)', 'pt-BR': 'é (ele/ela)', vi: 'là (anh ấy/cô ấy/nó)', id: 'adalah (dia)', tr: '-dir (o)', pl: 'jest (on/ona/ono)' }),
  soy: L({ ru: 'я есть', uk: 'я є', es: 'I am', 'pt-BR': 'eu sou', vi: 'tôi là', id: 'saya adalah', tr: 'benim', pl: 'jestem' }),
  eres: L({ ru: 'ты есть', uk: 'ти є', es: 'you are', 'pt-BR': 'você é', vi: 'bạn là', id: 'kamu adalah', tr: 'sensin', pl: 'jesteś' }),
  hoy: L({ ru: 'сегодня', uk: 'сьогодні', es: 'today', 'pt-BR': 'hoje', vi: 'hôm nay', id: 'hari ini', tr: 'bugün', pl: 'dzisiaj' }),
  fatal: L({ ru: 'ужасно, катастрофично', uk: 'жахливо, катастрофічно', es: 'terrible, disastrous', 'pt-BR': 'terrível, desastroso', vi: 'kinh khủng, thảm hại', id: 'mengerikan, bencana', tr: 'berbat, felaket', pl: 'okropny, katastrofalny' }),
  verás: L({ ru: 'увидишь', uk: 'побачиш', es: 'you will see', 'pt-BR': 'você verá', vi: 'bạn sẽ thấy', id: 'kamu akan melihat', tr: 'göreceksin', pl: 'zobaczysz' }),
  está: L({ ru: 'находится / сейчас такой', uk: 'знаходиться / зараз такий', es: 'is located / is currently', 'pt-BR': 'está localizado / está assim agora', vi: 'đang ở / hiện đang như vậy', id: 'berada / sedang begini', tr: 'bulunuyor / şu an böyle', pl: 'znajduje się / jest teraz taki' }),
  estoy: L({ ru: 'я нахожусь / я сейчас такой', uk: 'я знаходжуся / я зараз такий', es: 'I am located / I am currently', 'pt-BR': 'estou localizado / estou assim agora', vi: 'tôi đang ở / tôi hiện đang như vậy', id: 'saya berada / saya sedang begini', tr: 'bulunuyorum / şu an böyleyim', pl: 'znajduję się / jestem teraz taki' }),
  difícil: L({ ru: 'трудный', uk: 'важкий', es: 'hard', 'pt-BR': 'difícil', vi: 'khó', id: 'sulit', tr: 'zor', pl: 'trudny' }),
  mentira: L({ ru: 'ложь', uk: 'брехня', es: 'lie', 'pt-BR': 'mentira', vi: 'lời nói dối', id: 'kebohongan', tr: 'yalan', pl: 'kłamstwo' }),
  fácil: L({ ru: 'лёгкий', uk: 'легкий', es: 'easy', 'pt-BR': 'fácil', vi: 'dễ', id: 'mudah', tr: 'kolay', pl: 'łatwy' }),
  verdad: L({ ru: 'правда', uk: 'правда', es: 'truth', 'pt-BR': 'verdade', vi: 'sự thật', id: 'kebenaran', tr: 'gerçek', pl: 'prawda' }),
} as const satisfies Readonly<Record<string, LearningV2Localized<string>>>);

function vocabularyTrapMeaning(value: string): LearningV2Localized<string> {
  const localized = VOCABULARY_TRAP_MEANINGS[value as keyof typeof VOCABULARY_TRAP_MEANINGS];
  if (!localized) throw new Error(`es_session_01_trap_meaning_missing:${value}`);
  return localized;
}

function listenChooseWord(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const contact = item.contacts.recognize;
  const extra = EXTRA_RECOGNIZE_TRAPS[index as keyof typeof EXTRA_RECOGNIZE_TRAPS];
  return Object.freeze({
    family: 'listen_choose',
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
      ...(extra
        ? [{
            responseId: `${item.id}:recognize:${extra.reasonCode}`,
            targetText: extra.value,
            meaningByLocale: null,
          }]
        : []),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'recognize'),
      ...(extra
        ? [feedback(
            `${item.id}:recognize:${extra.reasonCode}`,
            false,
            `phonetic:${extra.reasonCode}`,
            extra.feedback,
          )]
        : []),
    ]),
  });
}

function listenBuildWord(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const extra = EXTRA_RECOGNIZE_TRAPS[index as keyof typeof EXTRA_RECOGNIZE_TRAPS];
  if (!extra) throw new Error(`es_session_01_listen_build_extra_trap_missing:${item.id}`);
  return Object.freeze({
    family: 'listen_build_dictation',
    referenceAudio: WORD_AUDIO[index]!,
    slowReferenceAudio: WORD_SLOW_AUDIO[index]!,
    hiddenTargetPhrase: item.target,
    orderedTokens: Object.freeze([item.target]),
    // Only real, authored neighbouring words are offered — no misspelled
    // pseudo-words, matching the English precedent's spelling-CAPTCHA guard.
    authoredDistractorTokens: Object.freeze([
      ...item.contacts.recognize.distractors.map((entry) => entry.value),
      extra.value,
    ]),
    slotFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'recognize'),
      feedback(
        `${item.id}:recognize:${extra.reasonCode}`,
        false,
        `phonetic:${extra.reasonCode}`,
        extra.feedback,
      ),
    ]),
  });
}

function listenChooseMeaning(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const contact = item.contacts.retrieve_meaning;
  const extra = EXTRA_MEANING_TRAPS[index as keyof typeof EXTRA_MEANING_TRAPS];
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: WORD_AUDIO[index]!,
    slowReferenceAudio: WORD_SLOW_AUDIO[index]!,
    localizedMeaningChoices: Object.freeze([
      {
        responseId: `${item.id}:retrieve_meaning:correct`,
        targetText: item.target,
        meaningByLocale: expandLocalized(item.meaning),
      },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${entry.reasonCode}`,
        targetText: entry.value,
        meaningByLocale: vocabularyTrapMeaning(entry.value),
      })),
      {
        responseId: `${item.id}:retrieve_meaning:${extra.reasonCode}`,
        targetText: extra.value,
        meaningByLocale: vocabularyTrapMeaning(extra.value),
      },
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'retrieve_meaning'),
      feedback(
        `${item.id}:retrieve_meaning:${extra.reasonCode}`,
        false,
        `semantic_neighbor:${extra.reasonCode}`,
        extra.feedback,
      ),
    ]),
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
    throw new Error(`es_session_01_vocabulary_feedback_missing:${item.id}:${stage}:${reasonCode}`);
  }
  return row;
}

function vocabularyFormBuilder(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const build = item.contacts.build_form;
  const buildTrapValues = new Set(build.distractors.map((entry) => entry.value));
  const extraFromRecognize = item.contacts.recognize.distractors.find(
    (entry) => !buildTrapValues.has(entry.value),
  );
  const extra = extraFromRecognize
    ? { value: extraFromRecognize.value, reasonCode: extraFromRecognize.reasonCode, stage: 'recognize' as const }
    : { value: EXTRA_RECOGNIZE_TRAPS[index as keyof typeof EXTRA_RECOGNIZE_TRAPS]!.value, reasonCode: EXTRA_RECOGNIZE_TRAPS[index as keyof typeof EXTRA_RECOGNIZE_TRAPS]!.reasonCode, stage: 'extra' as const };
  return Object.freeze({
    family: 'phrase_builder',
    targetPhrase: item.target,
    localizedMeaning: expandLocalized(item.meaning),
    orderedTokens: Object.freeze([item.target]),
    authoredDistractorTokens: Object.freeze([
      ...build.distractors.map((entry) => entry.value),
      extra.value,
    ]),
    slotFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'build_form'),
      extra.stage === 'recognize'
        ? vocabularyFeedbackForReason(item, 'recognize', extra.reasonCode)
        : feedback(
            `${item.id}:recognize:${extra.reasonCode}`,
            false,
            `phonetic:${extra.reasonCode}`,
            EXTRA_RECOGNIZE_TRAPS[index as keyof typeof EXTRA_RECOGNIZE_TRAPS]!.feedback,
          ),
    ]),
  });
}

function vocabularyMeaningBuilder(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const meaning = item.contacts.retrieve_meaning;
  const extra = EXTRA_MEANING_TRAPS[index as keyof typeof EXTRA_MEANING_TRAPS];
  return Object.freeze({
    family: 'phrase_builder',
    targetPhrase: item.target,
    localizedMeaning: expandLocalized(item.meaning),
    orderedTokens: Object.freeze([item.target]),
    authoredDistractorTokens: Object.freeze([
      ...meaning.distractors.map((entry) => entry.value),
      extra.value,
    ]),
    slotFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'retrieve_meaning'),
      feedback(
        `${item.id}:retrieve_meaning:${extra.reasonCode}`,
        false,
        `semantic_neighbor:${extra.reasonCode}`,
        extra.feedback,
      ),
    ]),
  });
}

function listenBuildPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'listen_build_dictation',
    referenceAudio: phraseIndex === 0 ? FACIL_PHRASE_AUDIO : VERDAD_PHRASE_AUDIO,
    slowReferenceAudio:
      phraseIndex === 0 ? FACIL_PHRASE_SLOW_AUDIO : VERDAD_PHRASE_SLOW_AUDIO,
    hiddenTargetPhrase: phrase.english,
    orderedTokens: Object.freeze(phrase.english.split(' ')),
    authoredDistractorTokens: Object.freeze(
      phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)),
    ),
    slotFeedback: phraseBuilderFeedback(phraseIndex),
  });
}

const LISTEN_ES_VERDAD_MEANING = L({
  ru: 'Это правда', uk: 'Це правда', es: 'That is true', 'pt-BR': 'Isso é verdade',
  vi: 'Điều đó là thật', id: 'Itu benar', tr: 'Bu doğru', pl: 'To prawda',
});
const LISTEN_ES_CARO_MEANING = L({
  ru: 'Это дорого', uk: 'Це дорого', es: 'That is expensive', 'pt-BR': 'Isso é caro',
  vi: 'Cái đó đắt', id: 'Itu mahal', tr: 'Bu pahalı', pl: 'To drogie',
});
const LISTEN_ES_IGUAL_MEANING = L({
  ru: 'Это всё равно', uk: 'Це все одно', es: 'It is all the same', 'pt-BR': 'Tanto faz',
  vi: 'Cũng như nhau thôi', id: 'Sama saja', tr: 'Aynı şey', pl: 'To bez różnicy',
});
const LISTEN_ES_FACIL_VS_VERDAD = L({
  ru: 'Verdad означает «правда» и заканчивается на -DAD; fácil заканчивается на -cil и означает «лёгкий».',
  uk: 'Verdad означає «правда» і закінчується на -DAD; fácil закінчується на -cil і означає «легкий».',
  es: 'Verdad means "truth" and ends in -DAD; fácil ends in -cil and means "easy".',
  'pt-BR': 'Verdad significa "verdade" e termina em -DAD; fácil termina em -cil e significa "fácil".',
  vi: 'Verdad nghĩa là "sự thật" và kết thúc bằng -DAD; fácil kết thúc bằng -cil và nghĩa là "dễ".',
  id: 'Verdad berarti "kebenaran" dan berakhir dengan -DAD; fácil berakhir dengan -cil dan berarti "mudah".',
  tr: 'Verdad "gerçek" demektir ve -DAD ile biter; fácil -cil ile biter ve "kolay" demektir.',
  pl: 'Verdad znaczy „prawda” i kończy się na -DAD; fácil kończy się na -cil i znaczy „łatwy”.',
});
const LISTEN_ES_CARO_VS_VERDAD = L({
  ru: 'Caro означает «дорого» — совсем другая оценка, про цену, а не про правдивость слов.',
  uk: 'Caro означає «дорого» — зовсім інша оцінка, про ціну, а не про правдивість слів.',
  es: 'Caro means "expensive" — a completely different evaluation, about price, not about the truth of words.',
  'pt-BR': 'Caro significa "caro" — uma avaliação completamente diferente, sobre preço, não sobre a veracidade das palavras.',
  vi: 'Caro nghĩa là "đắt" — một đánh giá hoàn toàn khác, về giá cả, không phải về độ tin cậy của lời nói.',
  id: 'Caro berarti "mahal" — penilaian yang sama sekali berbeda, tentang harga, bukan tentang kebenaran kata-kata.',
  tr: 'Caro "pahalı" demektir — tamamen farklı bir değerlendirme, sözlerin doğruluğu değil, fiyat hakkında.',
  pl: 'Caro znaczy „drogi” — zupełnie inna ocena, dotycząca ceny, nie prawdziwości słów.',
});
const LISTEN_ES_IGUAL_VS_VERDAD = L({
  ru: 'Igual означает «всё равно» — про безразличие к выбору, а не про подтверждение чужих слов.',
  uk: 'Igual означає «все одно» — про байдужість до вибору, а не про підтвердження чужих слів.',
  es: 'Igual means "all the same" — about indifference between choices, not about confirming someone else\'s words.',
  'pt-BR': 'Igual significa "tanto faz" — sobre indiferença entre escolhas, não sobre confirmar as palavras de outra pessoa.',
  vi: 'Igual nghĩa là "cũng như nhau" — về sự thờ ơ giữa các lựa chọn, không phải về việc xác nhận lời người khác.',
  id: 'Igual berarti "sama saja" — tentang ketidakpedulian antar pilihan, bukan tentang mengonfirmasi kata-kata orang lain.',
  tr: 'Igual "aynı şey" demektir — seçimler arasındaki kayıtsızlık hakkındadır, başkasının sözlerini onaylamak değil.',
  pl: 'Igual znaczy „bez różnicy” — dotyczy obojętności wobec wyboru, nie potwierdzenia cudzych słów.',
});

function listenChooseFacilPhrase(): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[0]!;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: FACIL_PHRASE_AUDIO,
    slowReferenceAudio: FACIL_PHRASE_SLOW_AUDIO,
    localizedMeaningChoices: Object.freeze([
      {
        responseId: `${phrase.id}:listen:correct`,
        targetText: phrase.english,
        meaningByLocale: localizedPhraseField(0, 'meaning'),
      },
      {
        responseId: `${phrase.id}:listen:caro`,
        targetText: 'Es caro',
        meaningByLocale: LISTEN_ES_CARO_MEANING,
      },
      {
        responseId: `${phrase.id}:listen:igual`,
        targetText: 'Es igual',
        meaningByLocale: LISTEN_ES_IGUAL_MEANING,
      },
      {
        responseId: `${phrase.id}:listen:verdad`,
        targetText: phrases[1]!.english,
        meaningByLocale: LISTEN_ES_VERDAD_MEANING,
      },
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: Object.freeze([
      feedback(
        `${phrase.id}:listen:correct`,
        true,
        'listening_exact_phrase',
        localizedPhraseField(0, 'explanation'),
      ),
      feedback(`${phrase.id}:listen:caro`, false, 'semantic_neighbor:last_word', LISTEN_ES_CARO_VS_VERDAD),
      feedback(`${phrase.id}:listen:igual`, false, 'semantic_neighbor:last_word', LISTEN_ES_IGUAL_VS_VERDAD),
      feedback(`${phrase.id}:listen:verdad`, false, 'phonetic:facil_versus_verdad', LISTEN_ES_FACIL_VS_VERDAD),
    ]),
  });
}

const CONTEXT_GAP_ES_TRAP_ERES = L({
  ru: 'Eres обращено ко второму лицу — «ты». Безличная оценка ситуации, «это», использует es.',
  uk: 'Eres звернене до другої особи — «ти». Безособова оцінка ситуації, «це», використовує es.',
  es: 'Eres is addressed to the second person — "you". An impersonal evaluation of a situation, "it", uses es.',
  'pt-BR': 'Eres se dirige à segunda pessoa — "você". Uma avaliação impessoal de uma situação, "isso", usa es.',
  vi: 'Eres hướng đến ngôi thứ hai — "bạn". Đánh giá phi cá nhân về một tình huống, "điều đó", dùng es.',
  id: 'Eres ditujukan kepada orang kedua — "kamu". Penilaian impersonal atas suatu situasi, "itu", menggunakan es.',
  tr: 'Eres ikinci kişiye hitap eder — "sen". Bir durumun kişisiz değerlendirmesi, "bu", es kullanır.',
  pl: 'Eres zwraca się do drugiej osoby — „ty”. Bezosobowa ocena sytuacji, „to”, używa es.',
});
const CONTEXT_GAP_ES_TRAP_SOY = L({
  ru: 'Soy — только про самого говорящего, «я». Оценка ситуации не о говорящем — нужно es.',
  uk: 'Soy — тільки про самого мовця, «я». Оцінка ситуації не про мовця — потрібно es.',
  es: 'Soy is only about the speaker themselves, "I". An evaluation of a situation is not about the speaker — es is needed.',
  'pt-BR': 'Soy é só sobre quem fala, "eu". Uma avaliação da situação não é sobre quem fala — precisa de es.',
  vi: 'Soy chỉ nói về chính người nói, "tôi". Đánh giá về một tình huống không phải về người nói — cần es.',
  id: 'Soy hanya tentang penutur itu sendiri, "saya". Penilaian atas suatu situasi bukan tentang penutur — perlu es.',
  tr: 'Soy sadece konuşanın kendisi hakkındadır, "ben". Bir durumun değerlendirmesi konuşan hakkında değildir — es gerekir.',
  pl: 'Soy dotyczy tylko samego mówiącego, „ja”. Ocena sytuacji nie dotyczy mówiącego — potrzebne jest es.',
});
const CONTEXT_GAP_ES_TRAP_ESTA = L({
  ru: 'Está — от estar, про место или временное состояние. Оценка признака вещи или ситуации навсегда — es.',
  uk: 'Está — від estar, про місце чи тимчасовий стан. Оцінка ознаки речі чи ситуації назавжди — es.',
  es: 'Está comes from estar, about location or a temporary state. Evaluating a lasting quality of a thing or situation uses es.',
  'pt-BR': 'Está vem de estar, sobre lugar ou estado temporário. Avaliar uma qualidade duradoura de uma coisa ou situação usa es.',
  vi: 'Está đến từ estar, nói về vị trí hoặc trạng thái tạm thời. Đánh giá một đặc điểm lâu dài của một sự vật hoặc tình huống dùng es.',
  id: 'Está berasal dari estar, tentang lokasi atau keadaan sementara. Menilai sifat yang bertahan dari suatu benda atau situasi menggunakan es.',
  tr: 'Está estar\'dan gelir, yer veya geçici bir durum hakkındadır. Bir şeyin veya durumun kalıcı bir niteliğini değerlendirmek es kullanır.',
  pl: 'Está pochodzi od estar, dotyczy miejsca lub stanu tymczasowego. Ocena trwałej cechy rzeczy lub sytuacji używa es.',
});

function contextGapVerdad(): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[1]!;
  const item = vocabulary[0]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(1, 'meaning'),
    gappedTargetPhrase: '___ verdad',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, text: 'Es' },
      { responseId: `${item.id}:retrieve_meaning:es_meaning_eres_second_person`, text: 'Eres' },
      { responseId: `${item.id}:retrieve_meaning:es_meaning_soy_first_person`, text: 'Soy' },
      { responseId: `${item.id}:retrieve_meaning:context_gap_esta`, text: 'Está' },
    ]),
    testedDimension: 'grammar:es_third_person_impersonal_before_verdad',
    choiceFeedback: Object.freeze([
      feedback(
        `${item.id}:retrieve_meaning:correct`,
        true,
        'retrieve_meaning',
        localizedPhraseField(1, 'explanation'),
      ),
      feedback(
        `${item.id}:retrieve_meaning:es_meaning_eres_second_person`,
        false,
        'grammar:es_meaning_eres_second_person',
        CONTEXT_GAP_ES_TRAP_ERES,
      ),
      feedback(
        `${item.id}:retrieve_meaning:es_meaning_soy_first_person`,
        false,
        'grammar:es_meaning_soy_first_person',
        CONTEXT_GAP_ES_TRAP_SOY,
      ),
      feedback(
        `${item.id}:retrieve_meaning:context_gap_esta`,
        false,
        'grammar:context_gap_esta',
        CONTEXT_GAP_ES_TRAP_ESTA,
      ),
    ]),
  });
}

function repeatCompare(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'scripted_repeat_compare',
    referenceAudio: phraseIndex === 0 ? FACIL_PHRASE_AUDIO : VERDAD_PHRASE_AUDIO,
    slowReferenceAudio:
      phraseIndex === 0 ? FACIL_PHRASE_SLOW_AUDIO : VERDAD_PHRASE_SLOW_AUDIO,
    targetPhrase: phrase.english,
    recordControlPolicy: 'hold_press_release_with_accessible_toggle',
    modelPlayback: 'reference_and_slow',
    learnerPlayback: 'available_after_capture',
    honestOutcomeStates: Object.freeze([
      'PASS_CONFIDENT',
      'NEEDS_WORK_CONFIDENT',
      'UNCERTAIN',
      'INVALID_AUDIO_OR_SYSTEM',
    ] as const),
  });
}

const SPEED_MATCH_VOCABULARY = Object.freeze([
  { id: 'es', target: 'es', meaning: L({ ru: 'является', uk: 'є', es: 'is', 'pt-BR': 'é', vi: 'là', id: 'adalah', tr: '-dir', pl: 'jest' }) },
  { id: 'soy', target: 'soy', meaning: L({ ru: 'я есть', uk: 'я є', es: 'I am', 'pt-BR': 'eu sou', vi: 'tôi là', id: 'saya adalah', tr: 'benim', pl: 'jestem' }) },
  { id: 'facil', target: 'fácil', meaning: L({ ru: 'лёгкий', uk: 'легкий', es: 'easy', 'pt-BR': 'fácil', vi: 'dễ', id: 'mudah', tr: 'kolay', pl: 'łatwy' }) },
  { id: 'verdad', target: 'verdad', meaning: L({ ru: 'правда', uk: 'правда', es: 'truth', 'pt-BR': 'verdade', vi: 'sự thật', id: 'kebenaran', tr: 'gerçek', pl: 'prawda' }) },
] as const);

const speedMatchVocabularyPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match',
  pairGrid: Object.freeze(
    SPEED_MATCH_VOCABULARY.map((word) => ({
      pairId: `es-e01-s01-pair-${word.id}`,
      target: word.target,
      meaningByLocale: word.meaning,
    })),
  ),
  leftColumn: Object.freeze([
    'es-e01-s01-pair-facil',
    'es-e01-s01-pair-es',
    'es-e01-s01-pair-soy',
    'es-e01-s01-pair-verdad',
  ]),
  rightColumn: Object.freeze([
    'es-e01-s01-pair-verdad',
    'es-e01-s01-pair-soy',
    'es-e01-s01-pair-facil',
    'es-e01-s01-pair-es',
  ]),
  pairingKey: 'pair_id',
  timerPolicy: Object.freeze({
    enabledByDefault: true,
    learnerCanDisable: true,
    pausesOnInterruption: true,
  }),
  finishStats: Object.freeze(['speed', 'accuracy', 'personal_best'] as const),
});

export const ES_EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1 = Object.freeze<
  readonly SessionModeNativePracticeSourceV1[]
>([
  {
    family: 'listen_choose',
    purpose: 'supported_practice',
    learningStage: 'recognize',
    target: { kind: 'vocabulary', sourceIndex: 0 },
    modePayload: listenChooseWord(0),
  },
  {
    family: 'listen_build_dictation',
    purpose: 'supported_practice',
    learningStage: 'recognize',
    target: { kind: 'vocabulary', sourceIndex: 1 },
    modePayload: listenBuildWord(1),
  },
  {
    family: 'listen_choose',
    purpose: 'supported_practice',
    learningStage: 'recognize',
    target: { kind: 'vocabulary', sourceIndex: 2 },
    modePayload: listenChooseWord(2),
  },
  {
    family: 'listen_build_dictation',
    purpose: 'supported_practice',
    learningStage: 'recognize',
    target: { kind: 'vocabulary', sourceIndex: 3 },
    modePayload: listenBuildWord(3),
  },
  {
    family: 'phrase_builder',
    purpose: 'retrieval_practice',
    learningStage: 'retrieve_meaning',
    target: { kind: 'vocabulary', sourceIndex: 0 },
    modePayload: vocabularyMeaningBuilder(0),
  },
  {
    family: 'listen_choose',
    purpose: 'retrieval_practice',
    learningStage: 'retrieve_meaning',
    target: { kind: 'vocabulary', sourceIndex: 1 },
    modePayload: listenChooseMeaning(1),
  },
  {
    family: 'phrase_builder',
    purpose: 'retrieval_practice',
    learningStage: 'retrieve_meaning',
    target: { kind: 'vocabulary', sourceIndex: 2 },
    modePayload: vocabularyMeaningBuilder(2),
  },
  {
    family: 'listen_choose',
    purpose: 'retrieval_practice',
    learningStage: 'retrieve_meaning',
    target: { kind: 'vocabulary', sourceIndex: 3 },
    modePayload: listenChooseMeaning(3),
  },
  {
    family: 'phrase_builder',
    purpose: 'guided_practice',
    learningStage: 'build_form',
    target: { kind: 'vocabulary', sourceIndex: 1 },
    modePayload: vocabularyFormBuilder(1),
  },
  {
    family: 'listen_build_dictation',
    purpose: 'guided_practice',
    learningStage: 'build_form',
    target: { kind: 'vocabulary', sourceIndex: 0 },
    modePayload: listenBuildWord(0),
  },
  {
    family: 'phrase_builder',
    purpose: 'guided_practice',
    learningStage: 'build_form',
    target: { kind: 'vocabulary', sourceIndex: 3 },
    modePayload: vocabularyFormBuilder(3),
  },
  {
    family: 'listen_build_dictation',
    purpose: 'guided_practice',
    learningStage: 'build_form',
    target: { kind: 'vocabulary', sourceIndex: 2 },
    modePayload: listenBuildWord(2),
  },
  {
    family: 'speed_match',
    purpose: 'near_transfer',
    learningStage: 'apply_in_phrase',
    target: { kind: 'vocabulary_grid', sourceIndices: [0, 1, 2, 3] },
    modePayload: speedMatchVocabularyPayload,
  },
  {
    family: 'listen_build_dictation',
    purpose: 'guided_practice',
    learningStage: 'apply_in_phrase',
    target: { kind: 'phrase', sourceIndex: 1 },
    modePayload: listenBuildPhrase(1),
  },
  {
    family: 'listen_choose',
    purpose: 'near_transfer',
    learningStage: 'apply_in_phrase',
    target: { kind: 'phrase', sourceIndex: 0 },
    modePayload: listenChooseFacilPhrase(),
  },
  {
    family: 'context_gap_grammar',
    purpose: 'near_transfer',
    learningStage: 'apply_in_phrase',
    target: { kind: 'phrase', sourceIndex: 1 },
    modePayload: contextGapVerdad(),
  },
  {
    family: 'scripted_repeat_compare',
    purpose: 'independent_check',
    learningStage: 'speak_with_model',
    target: { kind: 'phrase', sourceIndex: 0 },
    modePayload: repeatCompare(0),
  },
]);

if (ES_EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error('es_session_01_mode_native_practice_count_invalid');
}

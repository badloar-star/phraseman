import type { LearningV2Localized } from '../generator_course_contract';
import type { LearningV2ModeAudioReferenceV1, LearningV2ModeChoiceFeedbackV1, LearningV2ModeNativePayloadV1 } from '../../contracts/mode_native_payload_v1';
import { expandLocalized, type LocalizedSource, type SessionModeNativePracticeSourceV1 } from './session_shard_from_source_v1';
import { EPISODE_01_SESSION_04_VOCABULARY_V1 } from './episode_01_session_04_vocabulary_v1';
import { EPISODE_01_SESSION_04_READINESS_PHRASES } from './episode_01_session_04_phrases_word_first_v1';
import { EPISODE_01_SESSION_01_VOCABULARY_V1 } from './episode_01_session_01_vocabulary_v1';

const vocabulary = EPISODE_01_SESSION_04_VOCABULARY_V1;
const phrases = EPISODE_01_SESSION_04_READINESS_PHRASES;
const L = (value: LocalizedSource): LearningV2Localized<string> => expandLocalized(value);

const INSTRUCTION = Object.freeze({
  hearWord: { ru: 'Послушайте и выберите точное новое слово.', uk: 'Послухайте й виберіть точне нове слово.', es: 'Escucha y elige la palabra nueva exacta.', 'pt-BR': 'Ouça e escolha a palavra nova exata.', vi: 'Nghe và chọn đúng từ mới.', id: 'Dengarkan dan pilih kata baru yang tepat.', tr: 'Dinleyin ve doğru yeni sözcüğü seçin.', pl: 'Posłuchaj i wybierz dokładne nowe słowo.' },
  sayWord: { ru: 'Послушайте новое слово, произнесите его и сравните.', uk: 'Послухайте нове слово, вимовте його й порівняйте.', es: 'Escucha la palabra nueva, pronúnciala y compara.', 'pt-BR': 'Ouça a palavra nova, pronuncie e compare.', vi: 'Nghe từ mới, phát âm rồi so sánh.', id: 'Dengarkan kata baru, ucapkan, lalu bandingkan.', tr: 'Yeni sözcüğü dinleyin, söyleyin ve karşılaştırın.', pl: 'Posłuchaj nowego słowa, powiedz je i porównaj.' },
  chooseMeaning: { ru: 'Выберите слово, которое точно подходит к ситуации.', uk: 'Оберіть слово, яке точно відповідає ситуації.', es: 'Elige la palabra que encaja exactamente en la situación.', 'pt-BR': 'Escolha a palavra que combina exatamente com a situação.', vi: 'Chọn từ khớp chính xác với tình huống.', id: 'Pilih kata yang tepat untuk situasinya.', tr: 'Duruma tam uyan sözcüğü seçin.', pl: 'Wybierz słowo dokładnie pasujące do sytuacji.' },
  chooseSpelling: { ru: 'Выберите точное написание целого слова.', uk: 'Оберіть точне написання цілого слова.', es: 'Elige la escritura exacta de la palabra completa.', 'pt-BR': 'Escolha a escrita exata da palavra inteira.', vi: 'Chọn cách viết chính xác của cả từ.', id: 'Pilih ejaan tepat dari kata utuh.', tr: 'Sözcüğün tam ve doğru yazımını seçin.', pl: 'Wybierz dokładną pisownię całego słowa.' },
  listenBuild: { ru: 'Послушайте целую фразу и соберите только услышанное.', uk: 'Послухайте цілу фразу й складіть лише почуте.', es: 'Escucha la frase completa y construye solo lo que oyes.', 'pt-BR': 'Ouça a frase inteira e monte apenas o que ouviu.', vi: 'Nghe cả câu và ghép đúng phần đã nghe.', id: 'Dengarkan kalimat lengkap dan susun hanya yang terdengar.', tr: 'Tam cümleyi dinleyin ve yalnız duyduğunuzu kurun.', pl: 'Posłuchaj całego zdania i ułóż tylko to, co słychać.' },
  repeat: { ru: 'Послушайте фразу, произнесите её и сравните с образцом.', uk: 'Послухайте фразу, вимовте її й порівняйте зі зразком.', es: 'Escucha la frase, repítela y compárala con el modelo.', 'pt-BR': 'Ouça a frase, repita e compare com o modelo.', vi: 'Nghe câu, đọc lại rồi so sánh với mẫu.', id: 'Dengarkan kalimat, ucapkan, lalu bandingkan dengan contoh.', tr: 'Cümleyi dinleyin, söyleyin ve örnekle karşılaştırın.', pl: 'Posłuchaj zdania, powiedz je i porównaj ze wzorem.' },
  listenChoose: { ru: 'Послушайте и выберите точную целую фразу.', uk: 'Послухайте й виберіть точну цілу фразу.', es: 'Escucha y elige la frase completa exacta.', 'pt-BR': 'Ouça e escolha a frase inteira exata.', vi: 'Nghe và chọn đúng cả câu.', id: 'Dengarkan dan pilih seluruh kalimat yang tepat.', tr: 'Dinleyin ve söylenen tam cümleyi seçin.', pl: 'Posłuchaj i wybierz dokładne całe zdanie.' },
  context: { ru: 'Выберите состояние, которое завершает ситуацию.', uk: 'Оберіть стан, який завершує ситуацію.', es: 'Elige el estado que completa la situación.', 'pt-BR': 'Escolha o estado que completa a situação.', vi: 'Chọn trạng thái hoàn thành tình huống.', id: 'Pilih keadaan yang melengkapi situasi.', tr: 'Durumu tamamlayan hâli seçin.', pl: 'Wybierz stan, który kończy sytuację.' },
  speed: { ru: 'Соедините четыре новых и знакомых слова с точными значениями.', uk: 'З’єднайте чотири нові й знайомі слова з точними значеннями.', es: 'Une cuatro palabras nuevas y conocidas con sus significados exactos.', 'pt-BR': 'Ligue quatro palavras novas e conhecidas aos significados exatos.', vi: 'Ghép bốn từ mới và quen với nghĩa chính xác.', id: 'Pasangkan empat kata baru dan dikenal dengan arti tepat.', tr: 'Dört yeni ve tanıdık sözcüğü kesin anlamlarıyla eşleştirin.', pl: 'Połącz cztery nowe i znane słowa z dokładnymi znaczeniami.' },
} satisfies Readonly<Record<string, LocalizedSource>>);

function audio(id: string, transcript: string): LearningV2ModeAudioReferenceV1 {
  return Object.freeze({ audioTargetId: id, transcript });
}
function feedback(responseId: string, correct: boolean, testedDimension: string, feedbackByLocale: LearningV2Localized<string>): LearningV2ModeChoiceFeedbackV1 {
  return Object.freeze({ responseId, correct, testedDimension, feedbackByLocale });
}
function vocabularyFeedback(index: number, stage: 'recognize' | 'retrieve_meaning' | 'build_form'): readonly LearningV2ModeChoiceFeedbackV1[] {
  const item = vocabulary[index]!;
  const unit = item.contacts[stage];
  return Object.freeze([
    feedback(`${item.id}:${stage}:correct`, true, stage, L(unit.guidance)),
    ...unit.distractors.map((entry) => feedback(`${item.id}:${stage}:${entry.reasonCode}`, false, `${entry.trapType}:${entry.reasonCode}`, L(entry.feedback))),
  ]);
}
function hearWord(index: number, stage: 'recognize' | 'retrieve_meaning' = 'recognize'): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const unit = item.contacts[stage];
  return Object.freeze({
    family: 'listen_choose', referenceAudio: audio(item.id, item.target), slowReferenceAudio: audio(`${item.id}-slow`, item.target),
    localizedMeaningChoices: Object.freeze([
      { responseId: `${item.id}:${stage}:correct`, targetText: item.target, meaningByLocale: null },
      ...unit.distractors.map((entry) => ({ responseId: `${item.id}:${stage}:${entry.reasonCode}`, targetText: entry.value, meaningByLocale: null })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt', choiceFeedback: vocabularyFeedback(index, stage),
  });
}
function sayWord(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  return Object.freeze({ family: 'scripted_repeat_compare', referenceAudio: audio(item.id, item.target), slowReferenceAudio: audio(`${item.id}-slow`, item.target), targetPhrase: item.target, recordControlPolicy: 'hold_press_release_with_accessible_toggle', modelPlayback: 'reference_and_slow', learnerPlayback: 'available_after_capture', honestOutcomeStates: Object.freeze(['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] as const) });
}
function chooseMeaning(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const unit = item.contacts.retrieve_meaning;
  return Object.freeze({ family: 'context_gap_grammar', localizedScene: L(item.meaning), gappedTargetPhrase: '___', gapOptions: Object.freeze([{ responseId: `${item.id}:retrieve_meaning:correct`, text: item.target }, ...unit.distractors.map((entry) => ({ responseId: `${item.id}:retrieve_meaning:${entry.reasonCode}`, text: entry.value }))]), testedDimension: `lexical_meaning:${item.target}`, choiceFeedback: vocabularyFeedback(index, 'retrieve_meaning') });
}
function chooseSpelling(index: number): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[index]!;
  const unit = item.contacts.build_form;
  return Object.freeze({ family: 'context_gap_grammar', localizedScene: L(item.meaning), gappedTargetPhrase: '___', gapOptions: Object.freeze([
    { responseId: `${item.id}:build_form:correct`, text: item.target },
    ...unit.distractors.map((entry) => ({ responseId: `${item.id}:build_form:${entry.reasonCode}`, text: entry.value })),
  ]), testedDimension: `whole_word_spelling:${item.target}`, choiceFeedback: vocabularyFeedback(index, 'build_form') });
}

function phraseField(index: number, field: 'meaning' | 'explanation'): LearningV2Localized<string> {
  const phrase = phrases[index]!;
  return Object.fromEntries(Object.entries(phrase.localizedDetails ?? {}).map(([locale, detail]) => [locale, detail![field]])) as LearningV2Localized<string>;
}
function phraseFeedback(index: number): readonly LearningV2ModeChoiceFeedbackV1[] {
  const phrase = phrases[index]!;
  const values = [...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))];
  return Object.freeze([
    feedback(`${phrase.id}:correct`, true, 'phrase_assembly', phraseField(index, 'explanation')),
    ...values.map((value) => feedback(`${phrase.id}:wrong:${value}`, false, `phrase_assembly:${value}`, Object.fromEntries(Object.entries(phrase.localizedDetails ?? {}).map(([locale, detail]) => [locale, detail!.distractors.find((entry) => entry.value === value)?.reason ?? detail!.explanation])) as LearningV2Localized<string>)),
  ]);
}
function phraseBuilder(index: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[index]!;
  const ordered = phrase.english.split(' ');
  const distractors = [...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))].filter((value) => !ordered.includes(value)).slice(0, 6);
  return Object.freeze({ family: 'phrase_builder', targetPhrase: phrase.english, localizedMeaning: phraseField(index, 'meaning'), orderedTokens: Object.freeze(ordered), authoredDistractorTokens: Object.freeze(distractors), slotFeedback: phraseFeedback(index) });
}
function listenBuild(index: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[index]!;
  const ordered = phrase.english.split(' ');
  const distractors = [...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))].filter((value) => !ordered.includes(value)).slice(0, 6);
  return Object.freeze({ family: 'listen_build_dictation', referenceAudio: audio(phrase.id, phrase.english), slowReferenceAudio: audio(`${phrase.id}-slow`, phrase.english), hiddenTargetPhrase: phrase.english, orderedTokens: Object.freeze(ordered), authoredDistractorTokens: Object.freeze(distractors), slotFeedback: phraseFeedback(index) });
}
function repeat(index: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[index]!;
  return Object.freeze({ family: 'scripted_repeat_compare', referenceAudio: audio(phrase.id, phrase.english), slowReferenceAudio: audio(`${phrase.id}-slow`, phrase.english), targetPhrase: phrase.english, recordControlPolicy: 'hold_press_release_with_accessible_toggle', modelPlayback: 'reference_and_slow', learnerPlayback: 'available_after_capture', honestOutcomeStates: Object.freeze(['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] as const) });
}

function listenDoneContrast(selected: string): LocalizedSource {
  return { ru: `${selected} передаёт другой смысл. В аудио звучит You are done: слово done сообщает о завершённом деле.`, uk: `${selected} передає інший зміст. В аудіо звучить You are done: слово done повідомляє про завершену справу.`, es: `${selected} expresa otro sentido. El audio dice You are done: done comunica que la tarea terminó.`, 'pt-BR': `${selected} expressa outro sentido. O áudio diz You are done: done comunica que a tarefa terminou.`, vi: `${selected} mang nghĩa khác. Âm thanh nói You are done: done cho biết công việc đã hoàn tất.`, id: `${selected} menyampaikan arti lain. Audio mengatakan You are done: done menyatakan tugas selesai.`, tr: `${selected} başka bir anlam verir. Kayıtta You are done duyulur: done işin bittiğini söyler.`, pl: `${selected} przekazuje inny sens. Nagranie zawiera You are done: done mówi o skończonym zadaniu.` };
}
const LISTEN_DONE_FEEDBACK = Object.freeze([
  listenDoneContrast('You are set'), listenDoneContrast('You are free'), listenDoneContrast('You are here'),
] satisfies readonly LocalizedSource[]);
const LISTEN_DONE_CHOICES = Object.freeze([
  { targetText: 'You are done', meaningByLocale: phraseField(1, 'meaning') },
  { targetText: 'You are set', meaningByLocale: phraseField(0, 'meaning') },
  { targetText: 'You are free', meaningByLocale: phraseField(2, 'meaning') },
  { targetText: 'You are here', meaningByLocale: phraseField(3, 'meaning') },
]);
function listenChooseDone(): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[1]!;
  return Object.freeze({ family: 'listen_choose', referenceAudio: audio(phrase.id, phrase.english), slowReferenceAudio: audio(`${phrase.id}-slow`, phrase.english), localizedMeaningChoices: Object.freeze(LISTEN_DONE_CHOICES.map((choice, option) => ({ responseId: `${phrase.id}:listen:${option}`, ...choice }))), transcriptRevealPolicy: 'after_first_attempt', choiceFeedback: Object.freeze(LISTEN_DONE_CHOICES.map((_choice, option) => feedback(`${phrase.id}:listen:${option}`, option === 0, option === 0 ? 'listening_exact_phrase' : `listening_contrast:${option}`, option === 0 ? phraseField(1, 'explanation') : L(LISTEN_DONE_FEEDBACK[option - 1]!)))) });
}

const CONTEXT_FREE_FEEDBACK = Object.freeze([
  { ru: 'Set означает «готов»: всё подготовлено. Здесь смысл другой — в расписании есть время, поэтому нужно free.', uk: 'Set означає «готовий»: усе підготовлено. Тут інший зміст — у розкладі є час, тому потрібне free.', es: 'Set significa «listo»: todo está preparado. Aquí hay tiempo disponible, por eso corresponde free.', 'pt-BR': 'Set significa «pronto»: tudo está preparado. Aqui há tempo disponível, por isso a resposta é free.', vi: 'Set nghĩa là “sẵn sàng”: mọi thứ đã chuẩn bị. Ở đây lịch có thời gian, nên cần free.', id: 'Set berarti “siap”: semuanya sudah tersedia. Di sini jadwal punya waktu, jadi jawabannya free.', tr: 'Set “hazır” demektir. Burada takvimde zaman vardır; bu yüzden free gerekir.', pl: 'Set znaczy „gotowy”: wszystko przygotowane. Tutaj jest czas w kalendarzu, więc potrzebne free.' },
  { ru: 'Done означает «закончил»: дело закрыто. Свободное время называет free, даже если карандаш ещё работает.', uk: 'Done означає «закінчив»: справу закрито. Вільний час називає free, навіть якщо олівець ще працює.', es: 'Done significa «terminé»: la tarea está cerrada. El tiempo disponible es free, aunque el lápiz siga trabajando.', 'pt-BR': 'Done significa «terminei»: a tarefa acabou. O tempo disponível é free, mesmo que o lápis ainda trabalhe.', vi: 'Done nghĩa là “đã xong”: công việc kết thúc. Thời gian rảnh là free, dù cây bút vẫn đang làm việc.', id: 'Done berarti “selesai”: tugas ditutup. Waktu luang adalah free, meskipun pensil masih bekerja.', tr: 'Done “bitirdim” demektir; iş kapanmıştır. Kalem hâlâ çalışsa bile boş zamanı free anlatır.', pl: 'Done znaczy „skończyłem”: zadanie zamknięte. Wolny czas to free, nawet jeśli ołówek nadal pracuje.' },
  { ru: 'Here означает «здесь» и отвечает на вопрос о месте. Ситуация говорит о свободном времени, значит нужен free.', uk: 'Here означає «тут» і відповідає на питання про місце. Ситуація говорить про вільний час, отже потрібне free.', es: 'Here significa «aquí» y responde sobre el lugar. La situación habla de tiempo disponible, así que corresponde free.', 'pt-BR': 'Here significa «aqui» e responde sobre lugar. A situação fala de tempo disponível, então a resposta é free.', vi: 'Here nghĩa là “ở đây” và nói về địa điểm. Tình huống nói về thời gian rảnh, nên cần free.', id: 'Here berarti “di sini” dan menjawab tentang tempat. Situasinya tentang waktu luang, jadi perlu free.', tr: 'Here “burada” demektir ve yeri söyler. Durum boş zamandan söz ediyor; gereken free olur.', pl: 'Here znaczy „tutaj” i mówi o miejscu. Sytuacja dotyczy wolnego czasu, więc potrzebne free.' },
] satisfies readonly LocalizedSource[]);
function contextFree(): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[2]!;
  const values = ['free', 'set', 'done', 'here'] as const;
  return Object.freeze({ family: 'context_gap_grammar', localizedScene: L({ ru: 'В расписании собеседника появилось свободное окно.', uk: 'У розкладі співрозмовника з’явилося вільне вікно.', es: 'Apareció un hueco libre en la agenda de la otra persona.', 'pt-BR': 'Apareceu um horário livre na agenda da outra pessoa.', vi: 'Lịch của người nghe vừa có một khoảng trống.', id: 'Ada waktu kosong di jadwal lawan bicara.', tr: 'Karşıdaki kişinin takviminde boş zaman açıldı.', pl: 'W kalendarzu rozmówcy pojawiło się wolne okno.' }), gappedTargetPhrase: 'You are ___', gapOptions: Object.freeze(values.map((value, option) => ({ responseId: `${phrase.id}:gap:${option}`, text: value }))), testedDimension: 'availability_state_free', choiceFeedback: Object.freeze(values.map((_value, option) => feedback(`${phrase.id}:gap:${option}`, option === 0, option === 0 ? 'availability_state_free' : `state_contrast:${option}`, option === 0 ? phraseField(2, 'explanation') : L(CONTEXT_FREE_FEEDBACK[option - 1]!)))) });
}

const READY = EPISODE_01_SESSION_01_VOCABULARY_V1.find((entry) => entry.target === 'ready')!;
const SPEED_WORDS = Object.freeze([...vocabulary, READY]);
const SPEED_MEANINGS = Object.freeze({
  set: { ru: 'готов', uk: 'готовий', es: 'listo', 'pt-BR': 'pronto', vi: 'sẵn sàng', id: 'siap', tr: 'hazır', pl: 'gotowy' },
  done: { ru: 'закончил', uk: 'закінчив', es: 'terminado', 'pt-BR': 'terminei', vi: 'đã xong', id: 'selesai', tr: 'bitti', pl: 'skończone' },
  free: { ru: 'свободен', uk: 'вільний', es: 'libre', 'pt-BR': 'livre', vi: 'rảnh', id: 'luang', tr: 'boş', pl: 'wolny' },
  ready: { ru: 'готов начинать', uk: 'готовий починати', es: 'listo para empezar', 'pt-BR': 'pronto para começar', vi: 'sẵn sàng bắt đầu', id: 'siap mulai', tr: 'başlamaya hazır', pl: 'gotowy do startu' },
} satisfies Readonly<Record<string, LocalizedSource>>);
const SPEED_IDS = SPEED_WORDS.map((entry) => `e01-s04-pair-${entry.target}`);
const speedMatch: LearningV2ModeNativePayloadV1 = Object.freeze({ family: 'speed_match', pairGrid: Object.freeze(SPEED_WORDS.map((entry, index) => ({ pairId: SPEED_IDS[index]!, target: entry.target, meaningByLocale: L((SPEED_MEANINGS as Record<string, (typeof SPEED_MEANINGS)[keyof typeof SPEED_MEANINGS]>)[entry.target]!) }))), leftColumn: Object.freeze([SPEED_IDS[2]!, SPEED_IDS[0]!, SPEED_IDS[3]!, SPEED_IDS[1]!]), rightColumn: Object.freeze([SPEED_IDS[1]!, SPEED_IDS[3]!, SPEED_IDS[0]!, SPEED_IDS[2]!]), pairingKey: 'pair_id', timerPolicy: Object.freeze({ enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }), finishStats: Object.freeze(['speed', 'accuracy', 'personal_best'] as const) });

export const EPISODE_01_SESSION_04_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'listen_choose', instruction: INSTRUCTION.hearWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: hearWord(0) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.sayWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 1 }, modePayload: sayWord(1) },
  { family: 'listen_choose', instruction: INSTRUCTION.hearWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 2 }, modePayload: hearWord(2) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.chooseMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: chooseMeaning(0) },
  { family: 'listen_choose', instruction: INSTRUCTION.chooseMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 1 }, modePayload: hearWord(1, 'retrieve_meaning') },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.chooseMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 2 }, modePayload: chooseMeaning(2) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.sayWord, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: sayWord(0) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.chooseSpelling, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 1 }, modePayload: chooseSpelling(1) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.sayWord, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 2 }, modePayload: sayWord(2) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuild, purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: listenBuild(0) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeat, purpose: 'near_transfer', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: repeat(1) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenChoose, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: listenChooseDone() },
  { family: 'phrase_builder', instruction: INSTRUCTION.listenBuild, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: phraseBuilder(3) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.context, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: contextFree() },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuild, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 5 }, modePayload: listenBuild(5) },
  { family: 'speed_match', instruction: INSTRUCTION.speed, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [0, 1, 2], knownItems: SPEED_WORDS }, modePayload: speedMatch },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeat, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: repeat(0) },
]);

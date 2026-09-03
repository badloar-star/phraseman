import type { EpisodeSourcePhrase } from "./episode_01_source_v1";
import { expandLocalized, type LocalizedSource, type SessionSource } from "./session_shard_from_source_v1";
import type { LearningV2ModeNativePayloadV1 } from "../../contracts/mode_native_payload_v1";
import {
  EPISODE_03_SESSION_08_GOAL_V2 as CHECKPOINT_GOAL,
  EPISODE_03_SESSION_08_INTRO_V2 as CHECKPOINT_INTRO,
  EPISODE_03_SESSION_08_MODE_NATIVE_PRACTICE_V2 as CHECKPOINT_PRACTICE,
  EPISODE_03_SESSION_08_SUMMARY_V2 as CHECKPOINT_SUMMARY,
  EPISODE_03_SESSION_08_TITLE_V2 as CHECKPOINT_TITLE,
} from "./episode_03_session_08_content_v2";
import { LESSON3_SESSION_16_MODE_NATIVE_PLAN_ID_V1 } from "./lesson3_session_choreography_v1";

const tiles: Readonly<Record<string, readonly string[]>> = Object.freeze({ Where: ["Who", "What", "How"], are: ["is", "am", "not"], they: ["we", "you", "she"], Who: ["What", "Where", "How"], is: ["are", "am", "not"], she: ["he", "they", "it"], absent: ["present", "careless", "silent"], careless: ["careful", "absent", "silent"], The: ["A", "An", "This"], the: ["a", "an", "this"], door: ["doors", "lock", "room"], lock: ["locks", "look", "door"], room: ["rooms", "door", "table"], table: ["tables", "cable", "room"], window: ["windows", "widow", "door"], picture: ["pictures", "pitcher", "map"], coat: ["coats", "goat", "cup"], open: ["closed", "clean", "warm"], clean: ["dirty", "open", "small"], small: ["big", "warm", "clean"], warm: ["cold", "small", "open"], here: ["there", "open", "clean"] });
const phrase = (id: string, english: string, russian: string, explanation: string): EpisodeSourcePhrase => ({
  id, english, russian,
  explanation: `${explanation} Это самостоятельная checkpoint-проверка: опирайтесь на известную форму, а не на подсказку.`,
  words: english.replace(/[?.]/gu, "").split(" ").map((correct, wordIndex) => ({
    correct,
    category: "checkpoint_phrase",
    distractors: (tiles[correct] ?? ["a", "an", "the"]).map((value, index) => ({
      value,
      trapType: "phrase_assembly" as const,
      reasonCode: `${id}-${wordIndex}-${index}-${value}`,
      why: `Плитка ${value} не подходит вместо ${correct}: она меняет форму или смысл фразы ${english}.`,
    })),
  })),
  features: ["copula_be", "article", "wh_question"],
});

/** Changed-context Chapter 2 checkpoint.  No new lexical sense is introduced. */
export const EPISODE_03_SESSION_16_PHRASES_V2 = Object.freeze([
  phrase("e03-s16-where-are-they", "Where are they?", "Где они?", "Так спрашивают о месте нескольких людей."),
  phrase("e03-s16-who-is-she", "Who is she?", "Кто она?", "Так спрашивают об одном человеке."),
  phrase("e03-s16-who-is-absent", "Who is absent?", "Кто отсутствует?", "Так проверяют форму is с одним человеком."),
  phrase("e03-s16-who-is-careless", "Who is careless?", "Кто невнимателен?", "Так проверяют вопрос о качестве одного человека."),
  phrase("e03-s16-the-door-is-open", "The door is open.", "Дверь открыта.", "Так называют конкретную уже известную дверь."),
  phrase("e03-s16-the-lock-is-open", "The lock is open.", "Замок открыт.", "Так называют конкретный уже известный замок."),
  phrase("e03-s16-the-room-is-clean", "The room is clean.", "Комната чистая.", "Так называют конкретную уже известную комнату."),
  phrase("e03-s16-the-table-is-clean", "The table is clean.", "Стол чистый.", "Так называют конкретный уже известный стол."),
  phrase("e03-s16-the-window-is-open", "The window is open.", "Окно открыто.", "Так называют конкретное уже известное окно."),
  phrase("e03-s16-the-picture-is-small", "The picture is small.", "Картинка маленькая.", "Так называют конкретную уже известную картинку."),
  phrase("e03-s16-the-coat-is-warm", "The coat is warm.", "Пальто тёплое.", "Так называют конкретное уже известное пальто."),
  phrase("e03-s16-where-is-the-door", "Where is the door?", "Где дверь?", "Так спрашивают о месте конкретной уже известной двери."),
  phrase("e03-s16-who-is-here", "Who is here?", "Кто здесь?", "Так спрашивают, какой человек находится здесь."),
  phrase("e03-s16-the-room-is-open", "The room is open.", "Комната открыта.", "Так говорят о конкретной уже понятной комнате."),
  phrase("e03-s16-the-coat-is-clean", "The coat is clean.", "Пальто чистое.", "Так описывают конкретное уже понятное пальто."),
] as const);
const l=(ru:string,uk:string,es:string,pt:string,vi:string,id:string,tr:string,pl:string):LocalizedSource=>({ru,uk,es,"pt-BR":pt,vi,id,tr,pl});
const audio=(audioTargetId:string,transcript:string)=>({audioTargetId,transcript});
const good=(responseId:string,target:string)=>({responseId,correct:true,testedDimension:"checkpoint_exact_form",feedbackByLocale:expandLocalized(l(`Верно: ${target}.`,`Правильно: ${target}.`,`Correcto: ${target}.`,`Certo: ${target}.`,`Đúng: ${target}.`,`Benar: ${target}.`,`Doğru: ${target}.`,`Dobrze: ${target}.`))});
const wrong=(responseId:string,selected:string,target:string)=>({responseId,correct:false,testedDimension:"checkpoint_exact_form",feedbackByLocale:expandLocalized(l(`Вы выбрали ${selected}. Нужна форма ${target}.`,`Ви обрали ${selected}. Потрібна форма ${target}.`,`Elegiste ${selected}. Hace falta ${target}.`,`Você escolheu ${selected}. A forma é ${target}.`,`Bạn chọn ${selected}. Cần dạng ${target}.`,`Anda memilih ${selected}. Bentuknya ${target}.`,`${selected} seçtiniz. Doğru biçim ${target}.`,`Wybrano ${selected}. Potrzebna forma: ${target}.`))});
const rebuiltCheckpointPractice = Object.freeze([
  CHECKPOINT_PRACTICE[0]!,
  { ...CHECKPOINT_PRACTICE[1]!, target:{kind:"phrase" as const,sourceIndex:4}, modePayload:{family:"listen_choose",referenceAudio:audio("e03-s16-listen-door",EPISODE_03_SESSION_16_PHRASES_V2[4].english),slowReferenceAudio:audio("e03-s16-listen-door-slow",EPISODE_03_SESSION_16_PHRASES_V2[4].english),localizedMeaningChoices:[{responseId:"right",targetText:EPISODE_03_SESSION_16_PHRASES_V2[4].english,meaningByLocale:expandLocalized(l("Дверь открыта.","Двері відчинені.","La puerta está abierta.","A porta está aberta.","Cánh cửa mở.","Pintunya terbuka.","Kapı açık.","Drzwi są otwarte."))},{responseId:"a",targetText:"A door is open.",meaningByLocale:expandLocalized(l("Любая дверь","Будь-які двері","Cualquier puerta","Qualquer porta","Bất kỳ cửa nào","Pintu apa saja","Herhangi bir kapı","Dowolne drzwi"))},{responseId:"missing",targetText:"The door open.",meaningByLocale:expandLocalized(l("Нет is","Немає is","Falta is","Falta is","Thiếu is","Tidak ada is","Is yok","Brakuje is"))},{responseId:"order",targetText:"Open is the door.",meaningByLocale:expandLocalized(l("Другой порядок","Інший порядок","Otro orden","Outra ordem","Trật tự khác","Urutan lain","Başka sıra","Inny szyk"))}],transcriptRevealPolicy:"after_first_attempt",choiceFeedback:[good("right",EPISODE_03_SESSION_16_PHRASES_V2[4].english),wrong("a","A door is open.",EPISODE_03_SESSION_16_PHRASES_V2[4].english),wrong("missing","The door open.",EPISODE_03_SESSION_16_PHRASES_V2[4].english),wrong("order","Open is the door.",EPISODE_03_SESSION_16_PHRASES_V2[4].english)]} as LearningV2ModeNativePayloadV1 },
  { ...CHECKPOINT_PRACTICE[2]!, target:{kind:"phrase" as const,sourceIndex:5}, modePayload:{family:"listen_build_dictation",referenceAudio:audio("e03-s16-dictation-lock",EPISODE_03_SESSION_16_PHRASES_V2[5].english),slowReferenceAudio:audio("e03-s16-dictation-lock-slow",EPISODE_03_SESSION_16_PHRASES_V2[5].english),hiddenTargetPhrase:EPISODE_03_SESSION_16_PHRASES_V2[5].english,orderedTokens:["The","lock","is","open"],authoredDistractorTokens:["a","an","are"],slotFeedback:[good("dictated",EPISODE_03_SESSION_16_PHRASES_V2[5].english)]} as LearningV2ModeNativePayloadV1 },
  { ...CHECKPOINT_PRACTICE[3]!, target:{kind:"phrase" as const,sourceIndex:6}, modePayload:{family:"phrase_builder",targetPhrase:EPISODE_03_SESSION_16_PHRASES_V2[6].english,localizedMeaning:null,orderedTokens:["The","room","is","clean"],authoredDistractorTokens:["a","an","are"],slotFeedback:[good("built",EPISODE_03_SESSION_16_PHRASES_V2[6].english)]} as LearningV2ModeNativePayloadV1 },
  { ...CHECKPOINT_PRACTICE[4]!, target:{kind:"phrase" as const,sourceIndex:7}, modePayload:{family:"speed_match",pairGrid:[{pairId:"table",target:"table",meaningByLocale:expandLocalized(l("стол","стіл","mesa","mesa","bàn","meja","masa","stół"))}],leftColumn:["table"],rightColumn:["table"],pairingKey:"pair_id",timerPolicy:{enabledByDefault:true,learnerCanDisable:true,pausesOnInterruption:true},finishStats:["speed","accuracy","personal_best"]} as LearningV2ModeNativePayloadV1 },
  { ...CHECKPOINT_PRACTICE[5]!, target:{kind:"phrase" as const,sourceIndex:8}, modePayload:{family:"scripted_repeat_compare",referenceAudio:audio("e03-s16-repeat-window",EPISODE_03_SESSION_16_PHRASES_V2[8].english),slowReferenceAudio:audio("e03-s16-repeat-window-slow",EPISODE_03_SESSION_16_PHRASES_V2[8].english),targetPhrase:EPISODE_03_SESSION_16_PHRASES_V2[8].english,recordControlPolicy:"hold_press_release_with_accessible_toggle",modelPlayback:"reference_and_slow",learnerPlayback:"available_after_capture",honestOutcomeStates:["PASS_CONFIDENT","NEEDS_WORK_CONFIDENT","UNCERTAIN","INVALID_AUDIO_OR_SYSTEM"]} as LearningV2ModeNativePayloadV1 },
]);

export const EPISODE_03_SESSION_16_SOURCE: SessionSource = Object.freeze({
  packageId: "learning-v2-en-v1", targetLanguage: "en", episodeOrdinal: 3, requiredSessionOrdinal: 16,
  canDoOutcomeId: "obj-en-definite-definite-chapter-checkpoint", generationInputFingerprint: "en-e03-s16-wh-article-checkpoint-v2",
  sessionKindOverride: "checkpoint", distractorAuthorship: "manual",
  reviewConstructIds: ["wh_questions", "indefinite_article", "definite_article"], newVocabularyExceptionReason: "checkpoint_retrieval_only",
  title: CHECKPOINT_TITLE, summary: CHECKPOINT_SUMMARY, learningGoal: CHECKPOINT_GOAL,
  introPages: CHECKPOINT_INTRO, newVocabulary: [], phrases: EPISODE_03_SESSION_16_PHRASES_V2,
  modeNativePlanId: LESSON3_SESSION_16_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: rebuiltCheckpointPractice,
});

import type { SessionSource } from "./session_shard_from_source_v1";
import { EPISODE_03_SESSION_17_SOURCE as S17 } from "./episode_03_session_17_v1";
import { LESSON3_SESSION_18_MODE_NATIVE_PLAN_ID_V1 } from "./lesson3_session_choreography_v1";

/**
 * Separate guided-extension packet.  It deliberately retains the four
 * approved plural retrieval sentences while the standalone word cycle moves
 * from books to boxes; all six task targets remain distinct.
 */
const l=(ru:string,uk:string,es:string,pt:string,vi:string,id:string,tr:string,pl:string)=>({ru,uk,es,"pt-BR":pt,vi,id,tr,pl});
const replaceBox=(value:string)=>value.replaceAll("books","boxes").replaceAll("book","box").replaceAll("Books","Boxes").replaceAll("Book","Box");
const contacts=Object.fromEntries(Object.entries(S17.newVocabulary[0]!.contacts).map(([stage,contact])=>[stage,{...contact,guidance:Object.fromEntries(Object.entries(contact.guidance).map(([locale,text])=>[locale,replaceBox(text)])),distractors:contact.distractors.map((distractor,index)=>{const value=index===0?"box":index===1?"books":"box's"; return {...distractor,value,feedback:Object.fromEntries(Object.entries(distractor.feedback).map(([locale,text])=>[locale,`Wrong choice: ${value}. ${replaceBox(text)} Correct target: boxes.`]))};})}])) as typeof S17.newVocabulary[0]!["contacts"];
const vocabulary=Object.freeze([{...S17.newVocabulary[0]!,id:"e03-s18-boxes",target:"boxes",meaning:l("коробки","коробки","cajas","caixas","các hộp","kotak-kotak","kutular","pudełka"),contacts}]);

export const EPISODE_03_SESSION_18_SOURCE:SessionSource=Object.freeze({
 ...S17, requiredSessionOrdinal:18, canDoOutcomeId:"obj-en-plural-nouns-boxes-guided",
 generationInputFingerprint:"en-e03-s18-plural-nouns-boxes-v1", modeNativePlanId:LESSON3_SESSION_18_MODE_NATIVE_PLAN_ID_V1,
 title:l("Открытые коробки","Відкриті коробки","Cajas abiertas","Caixas abertas","Các hộp mở","Kotak terbuka","Açık kutular","Otwarte pudełka"),
 summary:l("Закрепите are с несколькими предметами через boxes.","Закріпіть are з кількома предметами через boxes.","Refuerza are con varios objetos mediante boxes.","Reforce are com vários objetos usando boxes.","Củng cố are với nhiều đồ vật qua boxes.","Perkuat are dengan beberapa benda melalui boxes.","Boxes ile çok nesnede are kullanımını pekiştirin.","Utrwal are przy wielu rzeczach przez boxes."),
 learningGoal:l("Выбрать are после boxes.","Обрати are після boxes.","Elegir are después de boxes.","Escolher are depois de boxes.","Chọn are sau boxes.","Memilih are setelah boxes.","Boxes sonrası are seçmek.","Wybrać are po boxes."),
 newVocabulary:vocabulary,
});

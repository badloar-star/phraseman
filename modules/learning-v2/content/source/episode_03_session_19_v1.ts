import type { SessionSource } from "./session_shard_from_source_v1";
import { EPISODE_03_SESSION_17_SOURCE as S17 } from "./episode_03_session_17_v1";
import { LESSON3_SESSION_19_MODE_NATIVE_PLAN_ID_V1 } from "./lesson3_session_choreography_v1";

/** Dedicated diagnostic-contrast packet for bags; retrieval sentences remain the approved plural set. */
const l=(ru:string,uk:string,es:string,pt:string,vi:string,id:string,tr:string,pl:string)=>({ru,uk,es,"pt-BR":pt,vi,id,tr,pl});
const replaceBag=(value:string)=>value.replaceAll("books","bags").replaceAll("book","bag").replaceAll("Books","Bags").replaceAll("Book","Bag");
const contacts=Object.fromEntries(Object.entries(S17.newVocabulary[0]!.contacts).map(([stage,contact])=>[stage,{...contact,guidance:Object.fromEntries(Object.entries(contact.guidance).map(([locale,text])=>[locale,replaceBag(text)])),distractors:contact.distractors.map((distractor,index)=>{const value=index===0?"bag":index===1?"books":"bag's"; return {...distractor,value,feedback:Object.fromEntries(Object.entries(distractor.feedback).map(([locale,text])=>[locale,`Wrong choice: ${value}. ${replaceBag(text)} Correct target: bags.`]))};})}])) as typeof S17.newVocabulary[0]!["contacts"];
const vocabulary=Object.freeze([{...S17.newVocabulary[0]!,id:"e03-s19-bags",target:"bags",meaning:l("сумки","сумки","bolsas","bolsas","túi","tas","çantalar","torby"),contacts}]);

export const EPISODE_03_SESSION_19_SOURCE:SessionSource=Object.freeze({
 ...S17, requiredSessionOrdinal:19, canDoOutcomeId:"obj-en-plural-nouns-bags-diagnostic",
 generationInputFingerprint:"en-e03-s19-plural-nouns-bags-v1", modeNativePlanId:LESSON3_SESSION_19_MODE_NATIVE_PLAN_ID_V1,
 title:l("Сумки рядом","Сумки поруч","Bolsas cerca","Bolsas por perto","Túi ở đây","Tas di sini","Çantalar burada","Torby tutaj"),
 summary:l("Проверьте are с несколькими сумками и исправьте типичную ошибку.","Перевірте are з кількома сумками та виправте типову помилку.","Comprueba are con varias bolsas y corrige un error típico.","Confira are com várias bolsas e corrija um erro típico.","Kiểm tra are với nhiều túi và sửa lỗi thường gặp.","Periksa are dengan beberapa tas dan perbaiki kesalahan umum.","Birden çok çantada are kullanımını kontrol edin ve yaygın hatayı düzeltin.","Sprawdź are przy kilku torbach i popraw typowy błąd."),
 learningGoal:l("Отличить bags are от bags is.","Відрізнити bags are від bags is.","Distinguir bags are de bags is.","Distinguir bags are de bags is.","Phân biệt bags are và bags is.","Membedakan bags are dan bags is.","Bags are ile bags is'i ayırmak.","Odróżnić bags are od bags is."),
 newVocabulary:vocabulary,
});

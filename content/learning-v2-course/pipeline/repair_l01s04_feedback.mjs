import fs from "node:fs";
import path from "node:path";
const apply = process.argv.includes("--apply");
const file = path.resolve(import.meta.dirname, "../sessions/en/l01/s04/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const prefix = "en:lesson-01:session-04";
const correct = {
  i02:{ru:"Верно: в записи early. Это не earn и не really.",uk:"Правильно: у записі early. Це не earn і не really."},
  i04:{ru:"Верно: в записи right. Это не white и не ride.",uk:"Правильно: у записі right. Це не white і не ride."},
  i06:{ru:"Верно: в записи wrong. Это не long и не ring.",uk:"Правильно: у записі wrong. Це не long і не ring."},
  i08:{ru:"Верно: второе слово — wrong, то есть «неверно».",uk:"Правильно: друге слово — wrong, тобто «неправильно»."},
  i09:{ru:"Верно: в записи free. Это не three и не fry.",uk:"Правильно: у записі free. Це не three і не fry."},
  i13:{ru:"Верно: после I нужна форма am: I am wrong.",uk:"Правильно: після I потрібна форма am: I am wrong."},
  i15:{ru:"Верно: в записи I am not sure. — «я не уверен».",uk:"Правильно: у записі I am not sure. — «я не впевнений»."},
  i21:{ru:"Верно: not busy — «не занят», поэтому можно взять новую задачу.",uk:"Правильно: not busy — «не зайнятий», тому можна взяти нове завдання."},
};
const tiles = {
  i12:{ru:"right — «прав», но здесь вы говорите I am not wrong: «я не ошибаюсь».",uk:"right — «правий», але тут ви кажете I am not wrong: «я не помиляюся»."},
  i14:{ru:"not лишнее: здесь все задачи закончены, значит I am free.",uk:"not зайве: тут усі завдання завершені, отже I am free."},
  i16:{ru:"С I нужна форма am, поэтому is лишнее.",uk:"З I потрібна форма am, тому is зайве."},
  i18:{ru:"not меняет смысл на отрицание, а здесь: I am fine.",uk:"not змінює зміст на заперечення, а тут: I am fine."},
  i20:{ru:"wrong означает «неверно», но расчёт верный: I am right.",uk:"wrong означає «неправильно», але розрахунок вірний: I am right."},
};
for (const locale of ["ru","uk"]) { for (const [suffix,feedbackByLocale] of Object.entries(correct)) { const id=`${prefix}:${suffix}`,item=data.interactionsByLocale[locale].find(x=>x.interactionId===id),answer=data.answers.find(x=>x.interactionId===id); if(!item||!answer?.correctResponseId)throw new Error(id); if(suffix==="i21") item.modePayload.gappedTargetPhrase="I am ___ ."; const row={responseId:answer.correctResponseId,correct:true,testedDimension:item.modePayload.testedDimension,feedbackByLocale};const old=item.modePayload.choiceFeedback.find(x=>x.responseId===answer.correctResponseId);if(old)Object.assign(old,row);else item.modePayload.choiceFeedback.unshift(row);} for(const [suffix,feedbackByLocale] of Object.entries(tiles)){const id=`${prefix}:${suffix}`,item=data.interactionsByLocale[locale].find(x=>x.interactionId===id);if(!item)throw new Error(id);item.modePayload.slotFeedback=[{responseId:`${id}:tile:d1`,correct:false,testedDimension:item.modePayload.testedDimension,feedbackByLocale}];}}
if(!apply){console.log("[L01S04-FEEDBACK] dry run");process.exit(0);} fs.writeFileSync(file,`${JSON.stringify(data,null,2)}\n`);console.log("[L01S04-FEEDBACK] applied");

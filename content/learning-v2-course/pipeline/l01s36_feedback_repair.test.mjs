import assert from"node:assert/strict";import fs from"node:fs";import path from"node:path";import{fileURLToPath}from"node:url";import test from"node:test";import{parseIntro}from"./build_release.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const session="en:lesson-01:session-36";const choices={i02:"colleagues",i04:"friends",i08:"guests",i09:"guests",i12:"together",i15:"funny"};const tiles=["i05","i10","i11","i13","i17:s01","i17:s04"];
const introFeedback={
  ru:[
    "Верно: We are colleagues — «мы коллеги»: с we ставят are, а colleagues называет вашу рабочую связь с Олегом.",
    "Верно: They are friends — «они друзья»: с they ставят are, а friends во множественном числе называет отношения этих двух людей.",
    "Верно: They are guests — «они гости»: люди зашли ненадолго, поэтому guests точно передаёт ситуацию; с they ставят are.",
  ],
  uk:[
    "Правильно: We are colleagues — «ми колеги»: з we ставлять are, а colleagues називає ваш робочий зв'язок з Олегом.",
    "Правильно: They are friends — «вони друзі»: з they ставлять are, а friends у множині називає стосунки цих двох людей.",
    "Правильно: They are guests — «вони гості»: люди зайшли ненадовго, тому guests точно передає ситуацію; з they ставлять are.",
  ],
};
test("L01/S36 authors localized feedback for every intro answer, including the correct answer",()=>{for(const locale of["ru","uk"]){const pages=parseIntro(fs.readFileSync(path.join(root,`sessions/en/l01/s36/final.${locale}.md`),"utf8"));assert.equal(pages.length,3);for(const[pageIndex,page]of pages.entries()){assert.equal(page.options.length,3,`${locale}:intro${pageIndex+1}`);assert.equal(page.options[0].correct,true);assert.equal(page.options[0].feedback,introFeedback[locale][pageIndex]);for(const option of page.options)assert.ok(option.feedback.trim(),`${locale}:intro${pageIndex+1}:${option.text}`)}}});
test("L01/S36 explains every checked answer and extra tile",()=>{const d=JSON.parse(fs.readFileSync(path.join(root,"sessions/en/l01/s36/practice.atomic.json"),"utf8"));for(const locale of["ru","uk"]){const rows=new Map(d.interactionsByLocale[locale].map(x=>[x.interactionId.slice(`${session}:`.length),x]));for(const[id,word]of Object.entries(choices)){const f=rows.get(id).modePayload.choiceFeedback?.find(x=>x.responseId===`${session}:${id}:r1`);assert.equal(f?.correct,true,`${locale}:${id}`);assert.match(f?.feedbackByLocale?.[locale]??"",new RegExp(word))}for(const id of tiles){const r=rows.get(id);assert.deepEqual(r.responseOptions,[],`${locale}:${id}`);const f=r.modePayload.slotFeedback?.find(x=>x.responseId===`${session}:${id}:tile:d1`);assert.equal(f?.correct,false,`${locale}:${id}`);assert.ok(f?.feedbackByLocale?.[locale],`${locale}:${id}`)}}});

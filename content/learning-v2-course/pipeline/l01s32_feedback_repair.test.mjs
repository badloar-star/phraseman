import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const session="en:lesson-01:session-32";
const choices={i01:"small",i02:"small",i03:"dark",i05:"dark",i06:"expensive",i10:"cold",i12:"rainy",i13:"rainy",i14:"warm",i15:"warm",i17:"clean"};
test("L01/S32 has answer feedback and explains the negation in the bright-room item",()=>{const d=JSON.parse(fs.readFileSync(path.join(root,"sessions/en/l01/s32/practice.atomic.json"),"utf8"));for(const locale of ["ru","uk"]){const rows=new Map(d.interactionsByLocale[locale].map(x=>[x.interactionId.slice(`${session}:`.length),x]));for(const [id,word] of Object.entries(choices)){const f=rows.get(id).modePayload.choiceFeedback?.find(x=>x.responseId===`${session}:${id}:r1`);assert.equal(f?.correct,true,`${locale}:${id}`);assert.match(f?.feedbackByLocale?.[locale]??"",new RegExp(word));}const room=rows.get("i05");assert.match(room.modePayload.gappedTargetPhrase,/not ___/,`${locale}: i05 negation is visible`);assert.match(room.prompt,/света полно|світла повно/i,`${locale}: i05 bright-room evidence`);const f=rows.get("i04").modePayload.slotFeedback?.find(x=>x.responseId===`${session}:i04:tile:d1`);assert.equal(f?.correct,false,`${locale}:i04 tile`);assert.match(f?.feedbackByLocale?.[locale]??"",/are/);}});

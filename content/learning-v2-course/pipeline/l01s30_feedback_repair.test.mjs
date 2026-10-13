import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const session="en:lesson-01:session-30";
const choices={i02:"busy",i04:"quiet",i05:"busy",i08:"loud",i10:"free",i12:"quiet",i14:"open"};
const tiles={i06:"are",i13:"are",i15:"are",i16:"open"};
const load=()=>JSON.parse(fs.readFileSync(path.join(root,"sessions/en/l01/s30/practice.atomic.json"),"utf8"));

test("L01/S30 explains each checked answer and extra tile",()=>{
  for(const locale of ["ru","uk"]){
    const rows=new Map(load().interactionsByLocale[locale].map(x=>[x.interactionId.slice(`${session}:`.length),x]));
    for(const [id,answer] of Object.entries(choices)){
      const feedback=rows.get(id).modePayload.choiceFeedback?.find(x=>x.responseId===`${session}:${id}:r1`);
      assert.equal(feedback?.correct,true,`${locale}:${id}: correct feedback`);
      assert.match(feedback?.feedbackByLocale?.[locale]??"",new RegExp(answer),`${locale}:${id}: answer named`);
    }
    for(const [id,tile] of Object.entries(tiles)){
      const row=rows.get(id);
      assert.deepEqual(row.responseOptions,[],`${locale}:${id}: no phantom choices`);
      const feedback=row.modePayload.slotFeedback?.find(x=>x.responseId===`${session}:${id}:tile:d1`);
      assert.equal(feedback?.correct,false,`${locale}:${id}: tile feedback`);
      assert.match(feedback?.feedbackByLocale?.[locale]??"",new RegExp(tile),`${locale}:${id}: tile named`);
    }
  }
});

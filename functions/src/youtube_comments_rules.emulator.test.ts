import {readFileSync} from 'node:fs';
import path from 'node:path';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc} from 'firebase/firestore';

describe('YouTube approvals cannot bypass callable via Firestore',()=>{
  let env:RulesTestEnvironment;
  beforeAll(async()=>{
    env=await initializeTestEnvironment({projectId:'demo-youtube-admin',firestore:{rules:readFileSync(path.resolve(__dirname,'../../firestore.rules'),'utf8')}});
  },30000);
  afterAll(async()=>env?.cleanup());
  it.each(['admin_youtube_comments','admin_youtube_comment_settings'])('denies direct read/write for every client role: %s',async collection=>{
    for(const ctx of [env.unauthenticatedContext(),env.authenticatedContext('ordinary'),env.authenticatedContext('mmk1YSI3bjRLNoce8n4sMBiFeIK2',{admin:true,adminRole:'owner'})]){
      const target=doc(ctx.firestore(),`${collection}/attempt`);
      await assertFails(setDoc(target,{reply:{status:'approved'},paused:false}));
      await assertFails(getDoc(target));
    }
  });
});

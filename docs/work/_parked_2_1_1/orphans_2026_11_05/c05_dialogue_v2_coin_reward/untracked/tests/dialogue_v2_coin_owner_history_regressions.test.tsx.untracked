import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { markPracticeRuneSettlementPending, flushStalePracticeRuneSettlements } from '../app/practice_rune_settlement';
import { createPracticeRuneEarnings, awardPracticeRune } from '../app/practice_rune_earnings';
const mockStore = new Map<string,string>();
let mockOwner='owner-a', mockSwitch=false, mockSealed=false;
const mockCommit=jest.fn();
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true,default:{
 getItem:jest.fn(async(k:string)=>mockStore.get(k)??null),
 setItem:jest.fn(async(k:string,v:string)=>{mockStore.set(k,v);if(k.startsWith('practice_rune_pending_settlement'))mockSealed=true;}),
 removeItem:jest.fn(async(k:string)=>{mockStore.delete(k);}),
 multiRemove:jest.fn(async(ks:string[])=>ks.forEach(k=>mockStore.delete(k))),
 getAllKeys:jest.fn(async()=>[...mockStore.keys()]),
 multiGet:jest.fn(async(ks:string[])=>ks.map(k=>[k,mockStore.get(k)??null])),
 multiSet:jest.fn(async(rows:[string,string][])=>rows.forEach(([k,v])=>mockStore.set(k,v))),
}}));
jest.mock("../app/stable_id.ts",()=>({getStableId:async()=>{const snapshot=mockOwner;if(mockSwitch&&mockSealed&&mockOwner==='owner-a'){mockOwner='owner-b';mockSwitch=false;}return snapshot;}}),{virtual:true});
jest.mock("../app/account_generation.ts",()=>({waitForActiveAccountGeneration:async()=>({stableId:mockOwner,generation:1,phase:'active'})}),{virtual:true});
jest.mock("../app/app_snapshot_store.ts",()=>({getAppSnapshot:()=>({progress:{stars:0,starsEarnedTotal:0}})}),{virtual:true});
jest.mock("../app/config.ts",()=>({CLOUD_SYNC_ENABLED:true,IS_EXPO_GO:false}),{virtual:true});
jest.mock("../app/debug-logger.ts",()=>({reportSwallowed:jest.fn(),DebugLogger:{info:jest.fn(),warn:jest.fn(),error:jest.fn()}}),{virtual:true});
jest.mock("../app/level_spin_star_grants.ts",()=>({commitPracticeRuneGrantLocally:(...args:unknown[])=>mockCommit(...args),acknowledgePracticeRuneGrantLocally:jest.fn(),practiceRuneOperationStorageKey:(o:string,id:string)=>'op:'+o+':'+id}));
jest.mock("../modules/today-tasks/today_tasks_store.ts",()=>({recordTodayTaskActivity:jest.fn()}),{virtual:true});
jest.mock('expo-crypto',()=>({CryptoDigestAlgorithm:{SHA256:'sha'},digestStringAsync:async(_:string,s:string)=>jest.requireActual('node:crypto').createHash('sha256').update(s).digest('hex')}));
jest.mock('@react-native-firebase/app',()=>({getApp:()=>({})}));
jest.mock('@react-native-firebase/functions',()=>({getFunctions:()=>({}),httpsCallable:()=>async()=>{throw Error('offline-only');}}));
const sessionKey='dialogue_history-review';
const ids=Array.from({length:10},(_,i)=>'dialogue_coin_'+(i+1));
const tick=async()=>{for(let i=0;i<100;i++)await act(async()=>{await Promise.resolve();});};
beforeEach(()=>{mockStore.clear();mockOwner='owner-a';mockSwitch=false;mockSealed=false;mockCommit.mockReset();mockCommit.mockResolvedValue(undefined);(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;});
test('existing committed ordinal1 with cleared pending marker must remain replayable',async()=>{
 let earnings=createPracticeRuneEarnings({activity:'lesson',sessionKey,firstCompletion:false});
 for(const id of ids)earnings=awardPracticeRune(earnings,id).earnings;
 const sealed=await markPracticeRuneSettlementPending({ownerStableId:'owner-a',earnings,completionOrdinal:1});
 mockStore.set('op:owner-a:'+sealed.sealedOperation!.operationId,JSON.stringify(sealed.sealedOperation));
 for(const key of [...mockStore.keys()])if(key.startsWith('practice_rune_pending_settlement'))mockStore.delete(key);
 const hook=await renderHook(()=>usePracticeRunes({activity:'lesson',sessionKey,completionOrdinal:1,repeatPriceOnly:true}));
 await tick();expect(hook.result.current.hydrating).toBe(false);
 let outcome:any,error:any;
 await act(async()=>{try{outcome=await hook.result.current.settleFixedReward({ownerStableId:'owner-a',amount:10,itemIds:ids});}catch(e){error=e;}});
 console.log('REVIEW_HISTORY',JSON.stringify({error:error?.message,status:outcome?.status,commits:mockCommit.mock.calls.length}));
 await act(async()=>hook.unmount());
 expect(error).toBeUndefined();expect(outcome?.status).not.toBe('deferred');
});
test('owner changes after seal-check snapshot must not create a reward for B',async()=>{
 const hook=await renderHook(()=>usePracticeRunes({activity:'lesson',sessionKey,completionOrdinal:1,repeatPriceOnly:true}));
 await tick();mockSwitch=true;
 await act(async()=>{await hook.result.current.settleFixedReward({ownerStableId:'owner-a',amount:10,itemIds:ids});});
 const bMarkers=[...mockStore.entries()].filter(([k])=>k.startsWith('practice_rune_pending_settlement')&&k.includes('owner-b'));
 await flushStalePracticeRuneSettlements('owner-b');
 console.log('REVIEW_OWNER',JSON.stringify({bMarkers:bMarkers.length,commitOwners:mockCommit.mock.calls.map(([,op])=>op.ownerStableId)}));
 await act(async()=>hook.unmount());
 expect(bMarkers).toHaveLength(0);
 expect(mockCommit.mock.calls.some(([,op])=>op.ownerStableId==='owner-b')).toBe(false);
});

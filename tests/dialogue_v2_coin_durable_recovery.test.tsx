import React from 'react';
import {act, render} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Host from '../components/dialogue_coin/DialogueV2CoinIntentHost';
import {dialogueV2CoinIntentsKey} from '../app/dialogue_v2_coin_intents';
import {dialogueV2CoinAwardedKey} from '../app/dialogue_v2_coin_reward';
import {markPracticeRuneSettlementPending, readCommittedFixedDialogueReward, settlePracticeRuneEarningsToServer} from '../app/practice_rune_settlement';
import {createPracticeRuneEarnings, awardPracticeRune} from '../app/practice_rune_earnings';

const mockStore = new Map<string,string>();
let mockFault = '';
let mockOwner = 'owner-a';
let mockSwitchAt = '';
const mockCommit = jest.fn();
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true, default:{
 getItem:jest.fn(async(k:string)=>{if(mockFault==='latch-read' && k.startsWith('dialogue_v2_coins_awarded'))throw Error('partial-latch-read');if(mockSwitchAt==='latch-read' && k.startsWith('dialogue_v2_coins_awarded'))mockOwner='owner-b';return mockStore.get(k)??null;}),
 setItem:jest.fn(async(k:string,v:string)=>{if(mockFault==='pending-write' && k.startsWith('practice_rune_pending_settlement'))throw Error('partial-pending-write');if(mockFault==='latch-write' && k.startsWith('dialogue_v2_coins_awarded'))throw Error('partial-latch-write');if(mockFault==='intent-remove' && k.startsWith('dialogue_v2_coin_intents') && v==='[]')throw Error('partial-intent-remove');mockStore.set(k,v);if(k.startsWith('practice_rune_pending_settlement')){if(mockSwitchAt==='seal')mockOwner='owner-b';if(mockFault==='after-seal')throw Error('crash-after-seal');}}),
 removeItem:jest.fn(async(k:string)=>{mockStore.delete(k);}),
 getAllKeys:jest.fn(async()=>[...mockStore.keys()]),
 multiGet:jest.fn(async(ks:string[])=>ks.map(k=>[k,mockStore.get(k)??null])),
 multiSet:jest.fn(async(rows:[string,string][])=>{rows.forEach(([k,v])=>mockStore.set(k,v));}),
}}));
jest.mock("../app/stable_id.ts",()=>({getStableId:async()=>mockOwner}),{virtual:true});
jest.mock("../app/account_generation.ts",()=>({waitForActiveAccountGeneration:async()=>({stableId:mockOwner,generation:1,phase:'active'})}),{virtual:true});
jest.mock("../app/app_snapshot_store.ts",()=>({getAppSnapshot:()=>({progress:{stars:0,starsEarnedTotal:0}})}),{virtual:true});
jest.mock("../app/config.ts",()=>({CLOUD_SYNC_ENABLED:true,IS_EXPO_GO:false}),{virtual:true});
jest.mock("../app/debug-logger.ts",()=>({reportSwallowed:jest.fn(),DebugLogger:{info:jest.fn(),warn:jest.fn(),error:jest.fn()}}),{virtual:true});
jest.mock("../app/level_spin_star_grants.ts",()=>({commitPracticeRuneGrantLocally:(...args:unknown[])=>mockCommit(...args),acknowledgePracticeRuneGrantLocally:jest.fn(),practiceRuneOperationStorageKey:(o:string,id:string)=>`op:${o}:${id}`}));
jest.mock("../modules/today-tasks/today_tasks_store.ts",()=>({recordTodayTaskActivity:jest.fn()}),{virtual:true});
jest.mock('expo-crypto',()=>({CryptoDigestAlgorithm:{SHA256:'sha'},digestStringAsync:async(_:string,s:string)=>jest.requireActual('node:crypto').createHash('sha256').update(s).digest('hex')}));
jest.mock('@react-native-firebase/app',()=>({getApp:()=>({})}));
jest.mock('@react-native-firebase/functions',()=>({getFunctions:()=>({}),httpsCallable:()=>async()=>{throw Error('offline-test-only');}}));

async function mountHost(){const tree=await render(<Host/>);for(let i=0;i<100;i++)await act(async()=>{await Promise.resolve();});return tree;}
beforeEach(()=>{mockStore.clear();mockOwner='owner-a';mockSwitchAt='';mockCommit.mockReset();mockCommit.mockRejectedValue(Error('wallet-storage-unavailable'));mockFault='';(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;jest.spyOn(console,'log').mockImplementation(()=>{});jest.spyOn(console,'warn').mockImplementation(()=>{});mockStore.set(dialogueV2CoinIntentsKey('owner-a'),JSON.stringify([{sessionId:'reward-1',amount:10,endedBy:'manual',mistakes:0,atMs:1}]));});
afterEach(()=>jest.restoreAllMocks());

test('partial latch read failure retains the only durable dialogue retry handle',async()=>{
 mockFault='latch-read';const tree=await mountHost();await act(async()=>tree.unmount());
 expect(mockCommit).not.toHaveBeenCalled();
 expect(JSON.parse(mockStore.get(dialogueV2CoinIntentsKey('owner-a'))??'[]')).toHaveLength(1);
});
test('actual host plus hook plus settlement retains intent when pending marker write fails',async()=>{
 mockFault='pending-write';const tree=await mountHost();await act(async()=>tree.unmount());
 expect(AsyncStorage.setItem).toHaveBeenCalledWith(expect.stringContaining('practice_rune_pending_settlement'),expect.any(String));
 expect(mockCommit).not.toHaveBeenCalled();
 expect([...mockStore.keys()].some(k=>k.startsWith('practice_rune_pending_settlement'))).toBe(false);
 expect(JSON.parse(mockStore.get(dialogueV2CoinIntentsKey('owner-a'))??'[]')).toHaveLength(1);
 expect(mockStore.has(dialogueV2CoinAwardedKey('owner-a','reward-1'))).toBe(false);
});
test('actual local commit rejection seals recovery payload but must not report terminal success',async()=>{
 const tree=await mountHost();await act(async()=>tree.unmount());
 expect(mockCommit).toHaveBeenCalled();
 const rows=[...mockStore.entries()].filter(([k])=>k.startsWith('practice_rune_pending_settlement'));
 expect(rows).toHaveLength(1);
 expect(JSON.parse(rows[0][1]).operation).toEqual(expect.objectContaining({ownerStableId:'owner-a',amount:10,completionOrdinal:1}));
 expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('зачёт отправлен'));
});
test.each([10,25,30])('fixed amount %i seals exact operation then replay preserves fingerprint',async(amount)=>{
 mockStore.set(dialogueV2CoinIntentsKey('owner-a'),JSON.stringify([{sessionId:'reward-1',amount,endedBy:'bot',mistakes:0,atMs:1}]));
 mockFault='latch-write';let tree=await mountHost();await act(async()=>tree.unmount());
 const key=[...mockStore.keys()].find(k=>k.startsWith('practice_rune_pending_settlement'))!;
 const first=JSON.parse(mockStore.get(key)!);
 expect(first.operation).toEqual(expect.objectContaining({amount,completionOrdinal:1,ownerStableId:'owner-a'}));
 mockFault='';tree=await mountHost();await act(async()=>tree.unmount());
 expect(JSON.parse(mockStore.get(key)!).operation).toEqual(first.operation);
 expect(mockStore.has(dialogueV2CoinAwardedKey('owner-a','reward-1'))).toBe(true);
 expect(JSON.parse(mockStore.get(dialogueV2CoinIntentsKey('owner-a'))!)).toHaveLength(0);
 expect(mockCommit.mock.calls.every(([,op])=>op.operationId===first.operation.operationId && op.requestFingerprint===first.operation.requestFingerprint)).toBe(true);
});
test.each(['pending-write','after-seal','intent-remove'])('restart retains deterministic recovery after %s',async(fault)=>{
 mockFault=fault;let tree=await mountHost();await act(async()=>tree.unmount());
 expect(JSON.parse(mockStore.get(dialogueV2CoinIntentsKey('owner-a'))!)).toHaveLength(1);
 const key=[...mockStore.keys()].find(k=>k.startsWith('practice_rune_pending_settlement'));
 const operation=key ? JSON.parse(mockStore.get(key)!).operation : undefined;
 mockFault='';tree=await mountHost();await act(async()=>tree.unmount());
 const pending=[...mockStore.keys()].filter(k=>k.startsWith('practice_rune_pending_settlement'));
 expect(pending).toHaveLength(1);
 if(operation)expect(JSON.parse(mockStore.get(pending[0])!).operation).toEqual(operation);
 expect(JSON.parse(mockStore.get(dialogueV2CoinIntentsKey('owner-a'))!)).toHaveLength(0);
});
test.each(['latch-read','seal'])('A→B at %s preserves A intent and never credits B',async(boundary)=>{
 mockSwitchAt=boundary;const tree=await mountHost();await act(async()=>tree.unmount());
 expect(JSON.parse(mockStore.get(dialogueV2CoinIntentsKey('owner-a'))!)).toHaveLength(1);
 expect(mockStore.has(dialogueV2CoinAwardedKey('owner-a','reward-1'))).toBe(false);
 expect(mockCommit.mock.calls.every(([token,op])=>token.stableId==='owner-a' && op.ownerStableId==='owner-a')).toBe(true);
});
test('legacy pre-seal latch is recovered through the same operation rather than dropping reward',async()=>{
 mockStore.set(dialogueV2CoinAwardedKey('owner-a','reward-1'),JSON.stringify({amount:10,atMs:1}));
 const tree=await mountHost();await act(async()=>tree.unmount());
 expect(mockCommit).toHaveBeenCalled();
 expect([...mockStore.keys()].filter(k=>k.startsWith('practice_rune_pending_settlement'))).toHaveLength(1);
});
test('adapter models idempotent successful local journal across lost intent removal and remount',async()=>{
 // Wallet boundary model, not the actual native wallet journal implementation.
 const journal=new Map<string,unknown>();let balance=0;
 mockCommit.mockImplementation(async(_token,op)=>{const prior=journal.get(op.operationId);if(prior){expect(prior).toEqual(op);return;}journal.set(op.operationId,op);balance+=op.amount;});
 mockFault='intent-remove';let tree=await mountHost();await act(async()=>tree.unmount());
 mockFault='';tree=await mountHost();await act(async()=>tree.unmount());
 expect(journal.size).toBe(1);expect(balance).toBe(10);
 expect(JSON.parse(mockStore.get(dialogueV2CoinIntentsKey('owner-a'))!)).toHaveLength(0);
});
test.each(['unmount','owner-change'])('%s while local commit is pending cannot finalize a stale worker',async(action)=>{
 let release!:()=>void;mockCommit.mockImplementation(()=>new Promise<void>(r=>{release=r;}));
 const tree=await mountHost();expect(release).toBeDefined();
 if(action==='unmount')await act(async()=>tree.unmount());else mockOwner='owner-b';
 await act(async()=>{release();for(let i=0;i<50;i++)await Promise.resolve();});
 if(action!=='unmount')await act(async()=>tree.unmount());
 expect(mockStore.has(dialogueV2CoinAwardedKey('owner-a','reward-1'))).toBe(false);
 expect(JSON.parse(mockStore.get(dialogueV2CoinIntentsKey('owner-a'))!)).toHaveLength(1);
 expect(mockCommit.mock.calls.every(([token,op])=>token.stableId==='owner-a' && op.ownerStableId==='owner-a')).toBe(true);
});
function fixedEarnings(amount=10, sessionKey='dialogue_reward-1'){
 let earnings=createPracticeRuneEarnings({activity:'lesson',sessionKey,firstCompletion:false});
 for(let i=1;i<=amount;i++)earnings=awardPracticeRune(earnings,`dialogue_coin_${i}`).earnings;
 return earnings;
}
test.each(['owner','amount','fingerprint','malformed','read-error'])('fixed historical proof rejects %s before writes',async(fault)=>{
 const earnings=fixedEarnings();
 const sealed=await markPracticeRuneSettlementPending({ownerStableId:'owner-a',earnings,completionOrdinal:1});
 const operation={...sealed.sealedOperation!};
 if(fault==='owner')operation.ownerStableId='owner-b';
 if(fault==='amount')operation.amount=25;
 if(fault==='fingerprint')operation.requestFingerprint='a'.repeat(64);
 const key=`op:owner-a:${operation.operationId}`;
 mockStore.set(key,fault==='malformed' ? '{' : JSON.stringify(operation));
 const before=(AsyncStorage.setItem as jest.Mock).mock.calls.length;
 if(fault==='read-error')(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(Error('read-failed'));
 await expect(readCommittedFixedDialogueReward({ownerStableId:'owner-a',earnings})).rejects.toThrow();
 expect((AsyncStorage.setItem as jest.Mock).mock.calls.length).toBe(before);
});
test('valid self-hashed wrong-amount history is rejected',async()=>{
 const wrong=fixedEarnings(25);const desired=fixedEarnings(10);
 const sealed=await markPracticeRuneSettlementPending({ownerStableId:'owner-a',earnings:wrong,completionOrdinal:1});
 mockStore.set(`op:owner-a:${sealed.sealedOperation!.operationId}`,JSON.stringify(sealed.sealedOperation));
 await expect(readCommittedFixedDialogueReward({ownerStableId:'owner-a',earnings:desired})).rejects.toThrow('level_spin_star_request_conflict');
});
test('legacy completed head without pending marker releases the following intent',async()=>{
 const earnings=fixedEarnings();const sealed=await markPracticeRuneSettlementPending({ownerStableId:'owner-a',earnings,completionOrdinal:1});
 mockStore.set(`op:owner-a:${sealed.sealedOperation!.operationId}`,JSON.stringify(sealed.sealedOperation));
 for(const key of [...mockStore.keys()])if(key.startsWith('practice_rune_pending_settlement'))mockStore.delete(key);
 mockStore.set(dialogueV2CoinAwardedKey('owner-a','reward-1'),'legacy');
 mockStore.set(dialogueV2CoinIntentsKey('owner-a'),JSON.stringify([
 {sessionId:'reward-1',amount:10,endedBy:'manual',mistakes:0,atMs:1},
 {sessionId:'reward-2',amount:25,endedBy:'bot',mistakes:1,atMs:2}]));
 const tree=await mountHost();await act(async()=>tree.unmount());
 expect(JSON.parse(mockStore.get(dialogueV2CoinIntentsKey('owner-a'))!)).toHaveLength(0);
 expect(mockCommit.mock.calls.every(([,op])=>op.sessionKey==='dialogue_reward-2')).toBe(true);
 expect(mockCommit).toHaveBeenCalled();
});
test('supplied A durable operation cannot create B marker even for old settlement callers',async()=>{
 const earnings=fixedEarnings();const durable=await markPracticeRuneSettlementPending({ownerStableId:'owner-a',earnings,completionOrdinal:1});
 mockOwner='owner-b';const before=[...mockStore.keys()];
 await expect(settlePracticeRuneEarningsToServer(earnings,1,durable)).resolves.toEqual({locallyCommitted:false,settled:false});
 expect([...mockStore.keys()]).toEqual(before);expect(mockCommit).not.toHaveBeenCalled();
});

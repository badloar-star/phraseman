import { ENERGY_PASSIVE_UNIT_MS, ENERGY_BASE_CAPACITY, ENERGY_FREE_REENTRY_WINDOW_MS } from '../app/energy_contract';
import { createMonthlyTrainingSessionAccess } from '../app/monthly_training_sessions';
import type { AccountGenerationToken } from '../app/account_generation';
const token = { generation: 1, stableId: 'owner-test', phase: 'active' } as AccountGenerationToken;
test('five energy, thirty-minute recovery, unchanged ten-minute reentry', () => {
 expect(ENERGY_BASE_CAPACITY).toBe(5);
 expect(ENERGY_PASSIVE_UNIT_MS).toBe(1_800_000);
 expect(ENERGY_FREE_REENTRY_WINDOW_MS).toBe(600_000);
});
test('old exhausted month cannot block any training mode, offline included', async () => {
 const storage={getItem:jest.fn(async()=>JSON.stringify({version:1,period:'2026-10',starts:Array.from({length:30},(_,i)=>String(i))})),setItem:jest.fn()};
 const access=createMonthlyTrainingSessionAccess({now:()=>Date.parse('2026-10-28'),timeZone:()=> 'UTC',isCurrentAccount:()=>true,storage});
 expect(await access.preview({token})).toMatchObject({status:'allowed',limit:0,resetAt:null});
 for(let i=0;i<100;i++) expect(await access.consume({token,receiptId:String(i),mode:(['swipe','blitz','recall','speaking'] as const)[i%4]})).toMatchObject({status:'allowed',limit:0});
 expect(storage.getItem).not.toHaveBeenCalled(); expect(storage.setItem).not.toHaveBeenCalled();
});
test('retired quota still rejects a stale account',async()=>{
 const access=createMonthlyTrainingSessionAccess({now:Date.now,timeZone:()=> 'UTC',isCurrentAccount:()=>false,storage:{getItem:jest.fn(),setItem:jest.fn()}});
 expect(await access.consume({token,receiptId:'r',mode:'swipe'})).toMatchObject({status:'stale_account'});
});

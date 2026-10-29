
import { spirePackHash } from './spire_pack_contract';
import { inspectSpireWeeklyPacks } from './admin_spire_pack_status';
describe('read-only current-week pack projection', () => {
  const valid = (tier:number) => ({size:'100',metadata:{schema:'spire-pack-v1',weekId:'2026-W43',lang:'en',tier:String(tier),packHash:spirePackHash({tier})}});
  it('checks exactly twelve deterministic paths and reports present metadata', async()=>{
    const read=jest.fn(async(path:string)=>valid(Number(path.split('/')[2])));
    const result=await inspectSpireWeeklyPacks('en','2026-W43',read);
    expect(read).toHaveBeenCalledTimes(12);
    expect(read).toHaveBeenCalledWith('spire_packs/en/0/2026-W43.json');
    expect(result.presentCount).toBe(12);
    expect(result.rows.every(row=>row.status==='present')).toBe(true);
  });
  it('keeps missing, invalid and permission errors distinct',async()=>{
    const result=await inspectSpireWeeklyPacks('en','2026-W43',async(path:string)=>{
      const tier=Number(path.split('/')[2]);
      if(tier===0)throw Object.assign(new Error('missing'),{code:404});
      if(tier===1)throw Object.assign(new Error('denied'),{code:403});
      return {...valid(tier),metadata:{...valid(tier).metadata,lang:'es'}};
    });
    expect(result.rows[0].status).toBe('missing');
    expect(result.rows[1].status).toBe('error');
    expect(result.rows[2].status).toBe('invalid');
    expect(result.presentCount).toBe(0);
  });
  it('rejects path injection before any reads',async()=>{
    const read=jest.fn();
    await expect(inspectSpireWeeklyPacks('../en','2026-W43',read)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  });
});

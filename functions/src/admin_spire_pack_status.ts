import { SPIRE_PACK_MAX_TIER, SPIRE_PACK_SCHEMA, spirePackPath } from './spire_pack_contract';
type Metadata = { size?: string | number; updated?: string; metadata?: Record<string, unknown> };
export async function inspectSpireWeeklyPacks(lang: string, weekId: string, read: (path:string)=>Promise<Metadata>) {
  if (!['en','es','fr','de','it'].includes(lang) || !/^\d{4}-W\d{2}$/.test(weekId)) throw new Error('invalid_pack_scope');
  const rows = [];
  // Serial metadata probes bound concurrency; no payload download or storage writes.
  for(let tier=0;tier<=SPIRE_PACK_MAX_TIER;tier++) {
    const path=spirePackPath(lang,tier,weekId);
    try {
      const meta=await read(path), data=meta.metadata||{};
      const valid=data.schema===SPIRE_PACK_SCHEMA && data.lang===lang && data.weekId===weekId
        && String(data.tier)===String(tier) && /^sp1_[A-Za-z0-9_-]{32}$/.test(String(data.packHash||'')) && Number(meta.size)>0;
      rows.push({tier,path,status:valid?'present':'invalid',packHash:valid?String(data.packHash):null,updated:meta.updated||null});
    }catch(error){
      const code=Number((error as {code?:unknown})?.code);
      rows.push({tier,path,status:code===404?'missing':'error',packHash:null,updated:null});
    }
  }
  return {lang,weekId,checkedAtMs:Date.now(),scope:'storage_metadata',presentCount:rows.filter(r=>r.status==='present').length,totalTiers:SPIRE_PACK_MAX_TIER+1,rows};
}

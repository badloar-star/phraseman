// зачем (владелец 06.11, Plus/Ultra): у владельца годовой подписки экран «Управление подпиской» говорит «Ultra», у месячной — «Plus».
import fs from 'node:fs';
import path from 'node:path';

const src = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Plus/Ultra: «Управление подпиской» (C3)', () => {
  it('все строки LP экрана проходят подмену названия по уровню (годовая → Ultra)', () => {
    const manage = src('app/manage_subscription.tsx');
    expect(manage).toContain("const manageTier = useSubscriptionTier() ?? 'plus';");
    expect(manage).toContain("applyTierName(triLang(L, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl }), manageTier)");
  });
});

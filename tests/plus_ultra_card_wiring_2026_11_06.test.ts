// зачем (владелец 06.11, Plus/Ultra): визитка — свой уровень по магазину, чужой по публичному полю plusTier (нет поля → Plus). Коммитится вместе с правкой PlayerProfileModal/ProfileCardBody.
import fs from 'node:fs';
import path from 'node:path';

const src = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Plus/Ultra: визитка', () => {
  it('визитка: свой уровень по магазину, чужой по публичному полю plusTier; монета и метка получают tier', () => {
    const modal = src('components/PlayerProfileModal.tsx');
    expect(modal).toContain("const plusTier = isMe ? myTier : tierFromPublicField((player as { plusTier?: unknown } | null | undefined)?.plusTier);");
    expect(modal).toContain('plusTier={plusTier}');
    expect(src('components/profile-card/ProfileCardCoin.tsx')).toContain('tier={plusTier}');
    expect(src('components/profile-card/ProfileCardBody.tsx')).toContain('tier={plusTier}');
  });

});

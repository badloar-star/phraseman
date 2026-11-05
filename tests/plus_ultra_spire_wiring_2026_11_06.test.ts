// зачем (владелец 05–06.11, Plus/Ultra в Пике): уровень подписки участника идёт из members.<uid>.plusTier
// до монеты во всех местах Пика; нет поля → null → Plus. Пин цепочки, чтобы звено не потерялось молча.
import fs from 'node:fs';
import path from 'node:path';
import { spireBuildRoomRows } from '../modules/spire/room_rows';

const src = (f: string): string => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

describe('Plus/Ultra в Пике: цепочка plusTier', () => {
  it('разбор комнаты: ultra/plus/нет → ultra/plus/null (смотрим исходник парсера)', () => {
    const s = src('modules/spire/room_rows.ts');
    expect(s).toContain("plusTier: value.plusTier === 'ultra' ? 'ultra' : value.plusTier === 'plus' ? 'plus' : null");
    expect(s).toContain('plusTier: m.plusTier ?? null');
    expect(s).toContain('plusTier: serverMe?.plusTier ?? null');
  });
  it('модели и типы несут plusTier', () => {
    expect(src('modules/spire/peak_model.ts')).toContain('plusTier: r.plusTier ?? null');
    expect(src('components/spire/spire_tower_model.ts')).toContain('plusTier: r.plusTier ?? null');
    expect(src('components/spire/spire_room_types.ts')).toContain('plusTier?');
  });
  it('монета Пика пробрасывает plusTier в AvatarView', () => {
    expect(src('components/spire/SpireRankCoin.tsx')).toContain('plusTier={plusTier}');
  });
  it('экспорт строителя на месте', () => {
    expect(typeof spireBuildRoomRows).toBe('function');
  });
});

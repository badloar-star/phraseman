// ЗАМОК ВЛАДЕЛЬЦА 05.11 06:08 («Ранг 0 а у меня всё доступно»): на ранге 0 Главная показывает только плитки из утверждённого макета (Уроки / Сохранённые), остальное открывается по рангам;
// замки действуют и на старых пользователей (kill-switch — Пульт rank_gates_existing_users). Реестр docs/work/OWNER_LOCKS.md, строка 05.11. Макет: docs/work/golden/approved-rev8 (rev6-home-free-0.png, OWNER-STATE-MAPPING.md).
// Ослабить можно только по новому слову владельца: правка этого файла + строки реестра + KNOWN_GUARDS в tests/owner_locks_registry.test.cjs.
import { applyRemoteConfigSnapshot, getRemoteBool } from '../app/remote_flags';
import { decideForUser } from '../app/rank_gate_decision';
import { readSource } from './helpers/read_source';

const oldUser = { isNew: false } as never;
const base = { gatesEnabled: true, rank: 0, plusActive: false, plusResolved: true, existingUsersGated: true } as const;

describe('ЗАМОК ВЛАДЕЛЬЦА 05.11 — ранг 0: только плитки из макета', () => {
  afterEach(() => { applyRemoteConfigSnapshot({}); });

  it('ранговые замки включены по умолчанию и действуют на старых пользователей', () => {
    applyRemoteConfigSnapshot({});
    expect(getRemoteBool('rank_gates_enabled')).toBe(true);
    expect(getRemoteBool('rank_gates_existing_users')).toBe(true);
  });

  it('ранг 0: видео, диалоги, Пик и хаб карточек закрыты; «Сохранённые», свои карточки, практика, друзья и наборы открыты', () => {
    for (const surface of ['video', 'dialogues', 'peak', 'cards_hub'] as const) expect(decideForUser(surface, { ...base, verdict: oldUser })).toMatchObject({ status: 'locked' });
    for (const surface of ['saved_cards', 'own_cards', 'card_practice', 'friends', 'social_packs'] as const) expect(decideForUser(surface, { ...base, verdict: oldUser })).toMatchObject({ status: 'allowed' });
  });

  it('ранги: видео/диалоги с 1, Пик со 2, хаб карточек с 3 (таблица макета OWNER-STATE-MAPPING)', () => {
    const at = (rank: number, surface: 'video' | 'dialogues' | 'peak' | 'cards_hub') => decideForUser(surface, { ...base, rank, verdict: oldUser }).status;
    expect([at(1, 'video'), at(1, 'dialogues'), at(1, 'peak'), at(1, 'cards_hub')]).toEqual(['allowed', 'allowed', 'locked', 'locked']);
    expect([at(2, 'peak'), at(2, 'cards_hub')]).toEqual(['allowed', 'locked']);
    expect(at(3, 'cards_hub')).toBe('allowed');
  });

  it('Главная рисует плитки «Диалоги/Карточки/Пик/Видео» только когда раздел не закрыт рангом', () => {
    const home = readSource('app/(tabs)/home.tsx');
    expect(home).toContain('dialogs: homeDialoguesVisible && !rankLockedDialogues');
    expect(home).toContain('cards: homeFlashcardsVisible && !rankLockedCardsHub');
    expect(home).toContain('!rankLockedPeak');
    expect(home).toContain('!rankLockedVideo');
  });
});

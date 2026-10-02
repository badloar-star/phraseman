// зачем (PM-162, Q-E2 координатора): сбой сети при заявке в друзья — честное «Связь пропала»,
// а не общее «Что-то пошло не так».
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@react-native-firebase/firestore', () => ({}));

import { isFriendRequestNetworkError } from '../app/firestore_friend_requests';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('заявка в друзья: сетевой сбой распознаётся', () => {
  it('нет связи, таймаут, сервис недоступен — network', () => {
    expect(isFriendRequestNetworkError(Object.assign(new Error('x'), { code: 'firestore/unavailable' }))).toBe(true);
    expect(isFriendRequestNetworkError(Object.assign(new Error('x'), { code: 'deadline-exceeded' }))).toBe(true);
    expect(isFriendRequestNetworkError(new Error('Failed to get document because the client is offline.'))).toBe(true);
    expect(isFriendRequestNetworkError(new Error('Network request failed'))).toBe(true);
  });

  it('прочие ошибки — не network', () => {
    expect(isFriendRequestNetworkError(Object.assign(new Error('x'), { code: 'permission-denied' }))).toBe(false);
    expect(isFriendRequestNetworkError(new Error('boom'))).toBe(false);
  });

  it('проводка: экран друзей и карточка профиля показывают «Связь пропала»', () => {
    expect(read('app/firestore_friend_requests.ts')).toMatch(/return offline \? 'network' : 'error';/);
    expect(read('app/(tabs)/friends.tsx')).toMatch(/result === 'network'[\s\S]{0,400}Связь пропала/);
    expect(read('components/profile-card/usePlayerProfileSocial.ts')).toMatch(/result === 'network'[\s\S]{0,300}Связь пропала/);
  });
});

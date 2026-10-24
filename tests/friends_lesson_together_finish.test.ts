/**
 * «Урок вместе» (идея 2, макет friends-full.html «Друг прошёл» и «Сообщения» утром; координатор 22.10, тексты Переводчика 865d9c17b).
 * Сторож: ряд «{имя}: занятие вместе · +2» в финале появляется по начислению телефона для ЭТОГО занятия; строка «{имя}: приглашение
 * закончилось в полночь» — только для истёкших без «друг прошёл» и только с именем; обе — за выключателем «Вместе».
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import { expiredLessonInvites } from '../app/friends_together/lesson_invite_expired';
import { bellInviteExpired, finalTogetherSub, finalTogetherTitle } from '../app/friends_together/lesson_together_finish_copy';
import { __resetTogetherCreditForTests, noteTogetherCredit, peekTogetherCredit, subscribeTogetherCredit } from '../app/friends_together/lesson_together_moment';
import type { UserNotification } from '../app/user_notifications';

const NOW = 1_800_000_000_000;
const sent = (inviteId: string, friendUid: string, expiresAtMs: number) => ({ inviteId, friendUid, lessonKey: 'lesson-01:session:02', sentAtMs: expiresAtMs - 3_600_000, expiresAtMs });
const done = (inviteId: string) => ({
  id: `n-${inviteId}`, type: 'friend_nudge', fromUid: 'x', fromName: 'X', read: false, createdAt: NOW,
  nav: { kind: 'friend_event', action: 'lesson_together', actorStableUid: 'x', eventId: `e-${inviteId}`, inviteId, dayKey: '2026-10-22' },
}) as unknown as UserNotification;

describe('строка «приглашение закончилось в полночь»', () => {
  it('истёкшие без «друг прошёл», с именем, свежие сверху; неистёкшие и пройденные — нет', () => {
    const list = [sent('a', 'ira', NOW - 1000), sent('b', 'mark', NOW - 5000), sent('c', 'oleg', NOW + 60_000), sent('d', 'lida', NOW - 100), sent('e', 'nobody', NOW - 10)];
    const names = { ira: 'Ирина', mark: 'Марк', oleg: 'Олег', lida: 'Лида' };
    const out = expiredLessonInvites(list, [done('d')], names, NOW);
    expect(out.map((x) => x.name)).toEqual(['Ирина', 'Марк']);
  });

  it('тексты без рода: имя перед двоеточием, 9 языков', () => {
    expect(bellInviteExpired('ru', 'Ирина')).toBe('Ирина: приглашение закончилось в полночь');
    expect(bellInviteExpired('en', 'Ira')).toBe('Ira: the invitation ended at midnight');
    expect(finalTogetherTitle('ru', 'Алекс')).toBe('Алекс: занятие вместе');
    expect(finalTogetherSub('pl')).toBe('Nagroda „razem” dla was obojga');
  });
});

describe('ряд «Занятие вместе» в финале', () => {
  beforeEach(() => __resetTogetherCreditForTests());

  it('начисление этого занятия видно и до, и после открытия финала; чужое занятие — нет', () => {
    const seen: string[] = [];
    const off = subscribeTogetherCredit((c) => seen.push(c.sessionId));
    noteTogetherCredit({ sessionId: 's1', inviterUid: 'alex', inviterName: 'Алекс', coins: 2, atMs: NOW });
    expect(seen).toEqual(['s1']);
    expect(peekTogetherCredit('s1')?.inviterName).toBe('Алекс');
    expect(peekTogetherCredit('s2')).toBeNull();
    off();
    noteTogetherCredit({ sessionId: 's2', inviterUid: 'alex', inviterName: 'Алекс', coins: 2, atMs: NOW });
    expect(seen).toEqual(['s1']);
  });
});

describe('исходники: подключение за выключателем', () => {
  const read = (...p: string[]) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', ...p), 'utf8'));

  it('начисление у друга сообщает финалу; финал и «Сообщения» рисуют строки только при «Вместе»', () => {
    expect(read('app', 'friends_together', 'lesson_together_claim.ts')).toMatch(/toastTogether\(invite\.inviterName\);\s*\n[\s\S]{0,200}noteTogetherCredit\(\{ sessionId: event\.sessionId/);
    expect(read('components', 'learning-v2', 'horizons', 'HorizonSessionResult.tsx')).toContain('friendsSlot={FRIENDS_TOGETHER_UI_ENABLED && !preview ? <View style={{ gap: 10 }}><FinishLessonTogether lessonKey={sessionId} />');
    expect(read('components', 'NotificationCenterButton.tsx')).toContain('FRIENDS_TOGETHER_UI_ENABLED && !teamDetailOpen ? <BellLessonInviteExpired rows={visibleItems} active={visible} />');
  });
});

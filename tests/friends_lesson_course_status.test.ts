/**
 * «Урок вместе» (идея 2, макет «Выбор друзей»: кому открыт, кто прошёл, у кого закрыт) — статусы по маскам курса друга.
 * зачем (координатор 22.10; закон владельца «сервер только хранит записи»): маски пишет телефон друга в синхронизируемый прогресс,
 * friendsGetProfiles отдаёт их строгим проходом (0 новых чтений), телефон пригласившего сам решает статус строки.
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import { encodeCourseMaskV1 } from '../modules/learning-v2/progress/course_progress_masks_v1';
import { lessonInviteStatusFromCourse, parseFriendCourse } from '../app/friends_together/lesson_together';

const bit = (lesson: number, session: number) => (lesson - 1) * 56 + (session - 1);

describe('статус занятия у друга по его маскам', () => {
  // пройдены 1.1–1.3, открыто 2.5 (после экзамена), текущее — 1.4
  const course = { c: encodeCourseMaskV1([bit(1, 1), bit(1, 2), bit(1, 3)]), o: encodeCourseMaskV1([bit(2, 5)]) };

  it('пройдено → done; открыто → open; текущее (первое не пройденное и не открытое) → open; дальше → locked', () => {
    expect(lessonInviteStatusFromCourse(course, 1, 2)).toBe('done');
    expect(lessonInviteStatusFromCourse(course, 2, 5)).toBe('open');
    expect(lessonInviteStatusFromCourse(course, 1, 4)).toBe('open');
    expect(lessonInviteStatusFromCourse(course, 1, 5)).toBe('locked');
    expect(lessonInviteStatusFromCourse(course, 3, 1)).toBe('locked');
  });

  it('масок нет или номера вне сетки курса — «не знаем»', () => {
    expect(lessonInviteStatusFromCourse(null, 1, 1)).toBe('unknown');
    expect(lessonInviteStatusFromCourse(undefined, 1, 1)).toBe('unknown');
    expect(lessonInviteStatusFromCourse(course, 0, 1)).toBe('unknown');
    expect(lessonInviteStatusFromCourse(course, 33, 1)).toBe('unknown');
    expect(lessonInviteStatusFromCourse(course, 1, 57)).toBe('unknown');
  });

  it('новичок без пройденного: открыто только первое занятие курса', () => {
    expect(lessonInviteStatusFromCourse({ c: '', o: '' }, 1, 1)).toBe('open');
    expect(lessonInviteStatusFromCourse({ c: '', o: '' }, 1, 2)).toBe('locked');
  });

  it('строгий разбор поля профиля: только {v:1, c, o} из шестнадцатеричных строк', () => {
    expect(parseFriendCourse({ v: 1, c: 'F7', o: '' })).toEqual({ c: 'f7', o: '' });
    expect(parseFriendCourse({ v: 2, c: 'f7', o: '' })).toBeNull();
    expect(parseFriendCourse({ v: 1, c: 'xyz', o: '' })).toBeNull();
    expect(parseFriendCourse({ v: 1, c: 'f'.repeat(449), o: '' })).toBeNull();
    expect(parseFriendCourse('{"v":1}')).toBeNull();
    expect(parseFriendCourse(null)).toBeNull();
  });
});

describe('исходники: маски идут из профиля в выбор друзей', () => {
  const read = (...p: string[]) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', ...p), 'utf8'));

  it('снимок пары разбирает friendCourse; выбор друзей берёт статус из масок, а не «не знаем» для всех', () => {
    expect(read('app', 'friends_together', 'together_store.ts')).toContain('course: parseFriendCourse(profile.friendCourse),');
    const finish = read('components', 'friends_together', 'FinishLessonInvite.tsx');
    expect(finish).toContain('status: lessonInviteStatusFromCourse(snapshot.pairs[c.friendUid]?.course, lesson, sessionOrdinal),');
    expect(finish).not.toContain("status: 'unknown' }))");
  });
});

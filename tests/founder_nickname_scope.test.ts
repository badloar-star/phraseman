// зачем (координатор 15.10, изоляция аккаунтов): «Пропуск основателя» показывал «＠ник» прошлого аккаунта после смены.
import fs from 'node:fs';
import path from 'node:path';
import { nextFounderNickState, visibleFounderNickname, type FounderNickState } from '../app/founder_nickname_scope';

const EMPTY: FounderNickState = { scope: null, value: null };

describe('founder nickname is bound to the account scope', () => {
  it('аккаунт A с ником → смена на B без ника → окно без ника A', () => {
    let state = nextFounderNickState(EMPTY, 'scopeA', 'Delta 94030');
    expect(visibleFounderNickname(state, 'scopeA')).toBe('Delta 94030');
    // текущая область уже B, а состояние ещё A — чужой ник не показываем
    expect(visibleFounderNickname(state, 'scopeB')).toBeNull();
    // у B имени нет — состояние сбрасывается, ник A не переносится
    state = nextFounderNickState(state, 'scopeB', null);
    expect(state).toEqual({ scope: 'scopeB', value: null });
    expect(visibleFounderNickname(state, 'scopeB')).toBeNull();
  });

  it('в той же области пустое имя не стирает известный ник; у B свой ник виден', () => {
    const a = nextFounderNickState(EMPTY, 'scopeA', 'Anna');
    expect(nextFounderNickState(a, 'scopeA', null)).toBe(a);
    const b = nextFounderNickState(a, 'scopeB', 'Boris');
    expect(visibleFounderNickname(b, 'scopeB')).toBe('Boris');
  });

  it('без области аккаунта ник не запоминается и не показывается', () => {
    expect(nextFounderNickState(EMPTY, null, 'X')).toEqual(EMPTY);
    expect(visibleFounderNickname({ scope: 'scopeA', value: 'X' }, null)).toBeNull();
  });

  it('вкладка «Обучение» берёт ник только через область аккаунта; в лог ник не пишется', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx'), 'utf8');
    expect(src).toContain('visibleFounderNickname(learningV2FounderNickState, learningV2FounderAccountScope)');
    expect(src).not.toContain('setLearningV2FounderNickname(');
    const mod = fs.readFileSync(path.join(__dirname, '..', 'app', 'founder_nickname_scope.ts'), 'utf8');
    expect(mod).toMatch(/present: nickname !== null/);
    expect(mod).not.toMatch(/JSON\.stringify\(\{[^}]*\bnickname\b[^!]*\}\)/);
  });
});

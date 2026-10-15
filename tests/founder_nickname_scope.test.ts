// зачем (координатор 15.10, изоляция аккаунтов): «Пропуск основателя» показывал «＠ник» прошлого аккаунта после смены.
import fs from 'node:fs';
import path from 'node:path';
import { founderPassNicknameForModal, nextFounderNickState, visibleFounderNickname, type FounderNickState } from '../app/founder_nickname_scope';

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

// зачем (координатор 15.10, Сверка: «＠Neon 39486» у свежего гостя сменился через ~20 с): пропуск не печатает ник,
// пока сгенерированное имя не подтверждено сервером; окно от этого не зависит
describe('founder pass prints the nickname only once it is confirmed', () => {
  it('pending generated nickname: the pass shows no name (source=pending)', () => {
    expect(founderPassNicknameForModal('Neon 39486', true)).toEqual({ nickname: null, source: 'pending' });
  });
  it('pending flag not read yet: no name either — no flash of a temporary one', () => {
    expect(founderPassNicknameForModal('Neon 39486', null)).toEqual({ nickname: null, source: 'pending' });
  });
  it('confirmed nickname: printed as is (source=confirmed)', () => {
    expect(founderPassNicknameForModal('Omega 10002', false)).toEqual({ nickname: 'Omega 10002', source: 'confirmed' });
  });
  it('no nickname at all: none', () => {
    expect(founderPassNicknameForModal(null, false)).toEqual({ nickname: null, source: 'none' });
    expect(founderPassNicknameForModal(null, true)).toEqual({ nickname: null, source: 'none' });
  });
  it('the lessons tab feeds the modal through the gate and re-reads the flag after the profile is confirmed', () => {
    const tab = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx'), 'utf8');
    expect(tab).toContain('founderPassNicknameForModal(learningV2FounderNicknameRaw, learningV2FounderNickPending)');
    expect(tab).toContain('AsyncStorage.getItem(GENERATED_NICKNAME_PENDING_KEY)');
    expect(tab).toContain('onAppEvent("cloud_profile_hydrated", () => readPending("cloud_profile_hydrated"))');
    expect(tab).toContain('nickname={learningV2FounderNickname}');
    // окно не ждёт ник: гейт показа его не получает
    const gate = tab.slice(tab.indexOf('resolveLearningV2FounderPassGateV1({'), tab.indexOf('});', tab.indexOf('resolveLearningV2FounderPassGateV1({')));
    expect(gate).not.toMatch(/nick/i);
  });
});

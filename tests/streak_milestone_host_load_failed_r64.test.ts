// зачем (R64, координатор 15.10): если ленивая загрузка StreakMilestoneHost падает, удержание слота #36 обязано сняться — иначе
// следующий момент на итоге ждёт вечно. Сторож: все 4 экрана итога ловят сбой загрузки одним помощником, а помощник освобождает слот.
import fs from 'node:fs';
import path from 'node:path';

const SITES = ['app/lesson_complete.tsx', 'app/dialogue_v2_completion.tsx', 'app/mistake_practice_session.tsx', 'app/flashcards/SessionResultScreen.tsx'];

describe('R64 · сбой загрузки StreakMilestoneHost снимает удержание слота #36', () => {
  it.each(SITES)('%s ловит сбой ленивой загрузки', (rel) => {
    const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    expect(src).toMatch(/lazy\(\(\) => import\('[./]+components\/streak\/moments\/StreakMilestoneHost'\)\.catch\(streakMilestoneHostLoadFailed\)\)/);
  });

  it('помощник пишет причину и отдаёт пустой компонент', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { streakMilestoneHostLoadFailed } = jest.requireActual('../app/streak_milestone_pending');
    const mod = streakMilestoneHostLoadFailed(new Error('chunk'));
    expect(typeof mod.default).toBe('function');
    expect(console.warn).toHaveBeenCalledWith('[STREAK-MILESTONE] host_load_failed', 'chunk');
  });
});

// Ревизор 15.10: React.lazy запоминает заглушку — второй рубеж в том же процессе не должен повиснуть на удержании.
import { render as render64 } from '@testing-library/react-native';
import React from 'react';

describe('R64 · заглушка снимает удержание при каждом показе, а не только при первом сбое', () => {
  it('два рубежа подряд после одного сбоя загрузки — оба забраны, удержания нет', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const p = jest.requireActual('../app/streak_milestone_pending');
    p.__resetStreakMilestonePendingForTests();
    p.noteStreakMilestonePending(7, '2026-10-15');
    const Stub = p.streakMilestoneHostLoadFailed(new Error('chunk')).default;
    expect(p.isStreakMilestoneHold()).toBe(false);
    p.noteStreakMilestonePending(14, '2026-10-22');
    expect(p.isStreakMilestoneHold()).toBe(true);
    const first = await render64(React.createElement(Stub, { lang: 'ru' }));
    expect(p.peekStreakMilestonePending()).toBeNull();
    expect(p.isStreakMilestoneHold()).toBe(false);
    first.unmount();
    p.noteStreakMilestonePending(30, '2026-11-07');
    await render64(React.createElement(Stub, { lang: 'ru' }));
    expect(p.peekStreakMilestonePending()).toBeNull();
    expect(p.isStreakMilestoneHold()).toBe(false);
  });
});

// Владелец 29.10 (утверждённый макет «Лесенка приглашений», ответ координатора В): на вкладке «Друзья» в пустом списке вместо значка/заголовка/подсказки встаёт
// лесенка; «Добавить друга» остаётся под ней (других входов в пустом списке нет). Флаг выключен — пустое состояние прежнее (значок, заголовок, подсказка, кнопка).
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/friends/FriendsGlassKit', () => ({
  useFriendsGlass: () => ({ glass: { opaqueControl: '#222', lightTint: '#aaa', text: '#fff', secondary: '#ccc' }, textScale: 1 }),
  FriendsGlassButton: ({ label, testID }: { label: string; testID: string }) => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.createElement('Text', { testID }, label);
  },
}));

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react-native';
import FriendsEmptyState from '../components/friends/FriendsEmptyState';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const asText = (node: unknown): string => JSON.stringify(node);

describe('пустая вкладка «Друзья» и лесенка', () => {
  it('без лесенки — прежнее пустое состояние: заголовок, подсказка, «Добавить друга»', async () => {
    const view = await render(<FriendsEmptyState onAdd={() => undefined} />);
    const all = asText(view.toJSON());
    expect(all).toContain('Учиться вместе приятнее');
    expect(all).toContain('Найди друга по имени или поделись своим кодом.');
    expect(view.getByTestId('friends-empty-add')).toBeTruthy();
  });

  it('с лесенкой — лесенка на месте значка/заголовка/подсказки, «Добавить друга» остаётся под ней', async () => {
    const view = await render(<FriendsEmptyState onAdd={() => undefined} ladder={React.createElement('Text', { testID: 'ladder-slot' }, 'ЛЕСЕНКА')} />);
    const all = asText(view.toJSON());
    expect(all).toContain('ЛЕСЕНКА');
    expect(all).not.toContain('Учиться вместе приятнее');
    expect(all).not.toContain('Найди друга по имени');
    expect(view.getByTestId('friends-empty-add')).toBeTruthy();
    expect(view.getByTestId('friends-list-empty')).toBeTruthy();
  });
});

describe('подключение во вкладке «Друзья»', () => {
  const friends = read('app/(tabs)/friends.tsx');
  it('лесенка включается флагом и работающей программой, данные — из уже загруженного снимка приглашений', () => {
    expect(friends).toContain('const friendsLadderShown = friendsLadderEnabled && referralMarketingVisible;');
    expect(friends).toContain('deriveReferralLadder(scopedReferralState.drain?.ladder, scopedReferralState.invites)');
    expect(friends).toContain('const ladderCodeCopy = useReferralCodeCopy(referralCode, referralAccountKey);');
    expect(friends).toContain('ladder={friendsLadderShown ? (');
    expect(friends).toContain('onShare={() => { void handleReferralInvite(); }}');
    expect(friends).toContain('<ReferralLadderHowSheet visible={friendsLadderHowOpen}');
  });
  it('копирование кода: галочка сразу на тап, откат с причиной, запись только для аккаунта показанного кода', () => {
    const hook = read('hooks/use_referral_code_copy.ts');
    expect(hook).toContain('setCopied(true);');
    expect(hook.indexOf('setCopied(true);')).toBeLessThan(hook.indexOf('copyReferralCodeForAccount({'));
    expect(hook).toContain("rollback('copy_rejected_account_or_code_changed')");
    expect(hook).toContain("rollback('clipboard_unavailable')");
    expect(hook).toContain("rollback('account_changed_before_copy')");
    expect(hook).not.toMatch(/firebase|firestore|httpsCallable|fetch\(/i);
  });
});

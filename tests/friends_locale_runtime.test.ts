import * as fs from 'fs';
import * as path from 'path';

describe('friends tab locale runtime', () => {
  it('does not route planned friend activity copy through legacy runtime markers', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/friends.tsx'), 'utf8');
    const legacyRuntimePattern = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

    expect(source).not.toMatch(legacyRuntimePattern);
  });

  it('keeps incoming friend gift labels wired for every Heisenberg locale', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/friends.tsx'), 'utf8');

    for (const field of ['giftLabelPtBr', 'giftLabelVi', 'giftLabelId', 'giftLabelTr', 'giftLabelPl']) {
      expect(source).toContain(field);
    }
    for (const field of ['labelPtBr', 'labelVi', 'labelId', 'labelTr', 'labelPl']) {
      expect(source).toContain(field);
    }
  });

  it('keeps the empty-friends add action as a single full-width button', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/friends.tsx'), 'utf8');

    expect(source).toContain('testID="friends-empty-add"');
    // Реферальные CTA убраны из empty-state (owner 2026-07-24): приглашения живут в настройках.
    expect(source).not.toContain('testID="friends-empty-invite"');
    expect(source).not.toContain('testID="friends-empty-enter-code"');
    // minHeight + paddingVertical (не жёсткая height): кнопка растёт под крупные шрифты.
    expect(source).toContain("style={{ minHeight: 58, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'");
    // adjustsFontSizeToFit запрещён на кнопках (схлопывает текст в ноль — известная ловушка);
    // вместо него перенос на 2 строки.
    expect(source).toContain('numberOfLines={2}');
    expect(source).not.toContain('adjustsFontSizeToFit minimumFontScale={0.78}');
  });

  it('keeps the friend search input free of hard-coded sample text', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/friends.tsx'), 'utf8');

    expect(source).toContain('testID="friends-code-input"');
    expect(source).toContain('placeholder=""');
    // Добавление в друзья — только по имени (поиск по коду остаётся молчаливым fallback,
    // но в UI код больше не показываем и не предлагаем вводить, чтобы не путать с реф-кодом).
    expect(source).toContain('Введите имя друга');
    expect(source).toContain('Введіть імʼя друга');
    expect(source).not.toContain('PKVQGP / Nick');
    expect(source).not.toContain('Введите код или ник');
    expect(source).not.toContain('Введіть код або нік');
  });

  it('no longer renders the friend code card inside the add-friend modal (single code policy)', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/friends.tsx'), 'utf8');

    // Карточка «Мой код» (friend-код) больше не РЕНДЕРИТСЯ в модалке добавления друга:
    // показываем пользователю только ОДИН код — реферальный — чтобы не путать два разных кода.
    expect(source).not.toContain('<CodeCard');
  });

  it('keeps referral mechanics warm in friends without rendering referral UI', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/friends.tsx'), 'utf8');

    // UI рулетки/приглашений из «Друзей» убран полностью (owner 2026-07-24):
    // ни мегафон-иконки, ни empty-state оффера, ни переходов на реферальные экраны.
    expect(source).not.toContain('testID="friends-referral-code-inline"');
    expect(source).not.toContain('testID="friends-referral-code-card"');
    expect(source).not.toContain('testID="friends-open-referrals"');
    expect(source).not.toContain('Мои рефералы');
    expect(source).not.toContain("router.push('/referrals' as any)");
    expect(source).not.toContain("router.push('/referral_code_entry' as any)");
    // Механика осталась: реф-код прогревается на фокус, модалка окончания доступа
    // по-прежнему делится приглашением (legacy-drain).
    expect(source).toContain('const referralMarketingVisible = referralSurface.marketingVisible');
    expect(source).toContain('selectReferralSurfaceState');
    expect(source).toContain('void handleReferralInvite()');
    expect(source).toContain('ReferralAccessEndedModal');
  });

  it('keeps Firestore friend/league helpers free of legacy locale runtime markers', () => {
    const files = [
      '../app/firestore_friends.ts',
      '../app/firestore_leagues.ts',
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
      const legacyLocalePattern = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b)\b/u;
      expect(source).not.toMatch(legacyLocalePattern);
    }
  });
});

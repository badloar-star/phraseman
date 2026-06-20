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

  it('keeps empty-friends invite actions aligned as equal horizontal buttons', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/friends.tsx'), 'utf8');

    expect(source).toContain('testID="friends-empty-invite"');
    expect(source).toContain('testID="friends-empty-enter-code"');
    expect(source).toContain("style={{ height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'");
    expect(source).toContain("style={{ flex: 1, height: 58, backgroundColor: 'transparent'");
    expect(source).toContain("style={{ height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'");
    expect(source).toContain('numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}');
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

  it('shows the empty-friends referral premium offer instead of generic progress copy', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/friends.tsx'), 'utf8');

    expect(source).toContain(
      'Получите 7 дней полного Premium-доступа ко всему за одного приглашённого друга, который установит приложение, введёт ваш код',
    );
    // Показываем РЕФЕРАЛЬНЫЙ код (referral_codes), не friend-код — иначе друг
    // ввёл бы friend-код, которого нет в referral_codes, и наград не было бы (C1).
    expect(source).toContain('const [referralCode, setReferralCode]');
    // Код живёт ИНЛАЙНОМ в тексте empty-state (как и было задумано), а не в отдельной
    // карточке. Отдельная карточка убрана, чтобы код был ровно в ОДНОМ месте в Друзьях.
    expect(source).toContain('testID="friends-referral-code-inline"');
    expect(source).not.toContain('testID="friends-referral-code-card"');
    expect(source).toContain(' і повністю пройде один урок.');
    expect(source).not.toContain('testID="friends-referral-seven-plus-seven-note"');
    // «Запросити» делится реферальной ссылкой через handleReferralInvite (не friend-кодом).
    expect(source).toContain('void handleReferralInvite()');
    expect(source).toContain("router.push('/referral_code_entry' as any)");
    expect(source).toContain("router.push('/referrals' as any)");
    expect(source).toContain('Рефералы');
    expect(source).toContain('Ввести код');
    expect(source).not.toContain('Друзья видят твой прогресс');
  });

  it('keeps Firestore friend/league helpers free of locale fallback audit markers', () => {
    const files = [
      '../app/firestore_friends.ts',
      '../app/firestore_leagues.ts',
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
      expect(source).not.toContain('fallback');
      expect(source).not.toContain('Fallback');
    }
  });
});

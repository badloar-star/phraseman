// зачем (TG-AA6EC9A6D998, решения координатора 00:50): гость не получает ложного
// «Всё в безопасности — вернём прогресс», в Настройках видит честное «прогресс только
// на этом телефоне», политика говорит о потере прогресса гостя, а кнопки входа не
// двигают раскладку после асинхронной проверки доступности.
import { readFileSync } from 'fs';
import path from 'path';
import {
  getStartupRecoveryHonestCopy,
  resolveStartupRecoveryLinkState,
  shouldShowSavedJourneyLine,
} from '../components/startup_recovery_link_copy';

const root = process.cwd();
// зачем (11.10): рабочая копия в CRLF (autocrlf) — сторож сверяет многострочный текст, нормализуем переносы.
const read = (rel: string): string => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

describe('окно восстановления: выбор текста по признаку привязки', () => {
  test('провайдер текущей сессии = привязка была', () => {
    expect(resolveStartupRecoveryLinkState({ sessionProvider: 'google', hintLinked: false }))
      .toEqual({ state: 'linked', decidedBy: 'session_provider' });
    expect(resolveStartupRecoveryLinkState({ sessionProvider: 'apple', hintLinked: false }).state).toBe('linked');
  });

  test('подсказка сервера linked:true = привязка была', () => {
    expect(resolveStartupRecoveryLinkState({ sessionProvider: null, hintLinked: true }))
      .toEqual({ state: 'linked', decidedBy: 'recovery_hint' });
  });

  test('«не было» — только по прямому подтверждению сервера о прежнем владельце', () => {
    expect(resolveStartupRecoveryLinkState({ sessionProvider: null, hintLinked: false, ownerLinkedConfirmedByServer: false }))
      .toEqual({ state: 'not_linked', decidedBy: 'server_owner_not_linked' });
    expect(resolveStartupRecoveryLinkState({ sessionProvider: null, hintLinked: false, ownerLinkedConfirmedByServer: true }).state)
      .toBe('linked');
  });

  test('без достоверного признака — неизвестно (аноним сейчас ≠ «привязки не было»)', () => {
    expect(resolveStartupRecoveryLinkState({ sessionProvider: null, hintLinked: false }))
      .toEqual({ state: 'unknown', decidedBy: 'no_reliable_signal' });
    expect(resolveStartupRecoveryLinkState({ sessionProvider: null, hintLinked: false, ownerLinkedConfirmedByServer: null }).state)
      .toBe('unknown');
  });

  test('была привязка → прежний текст окна (null), строка «путь сохранён» видна', () => {
    expect(getStartupRecoveryHonestCopy('ru', 'linked')).toBeNull();
    expect(shouldShowSavedJourneyLine('startup_recovery', 'linked')).toBe(true);
  });

  test('не было → честный текст «вернуть нельзя, дальше привяжи», без «Всё в безопасности»', () => {
    const ru = getStartupRecoveryHonestCopy('ru', 'not_linked');
    expect(ru?.subtitle).toBe('Этот прогресс был без входа — вернуть его нельзя. Дальше привяжи Google или Apple, чтобы он сохранялся.');
    expect(ru?.title).not.toContain('Всё в безопасности');
    expect(shouldShowSavedJourneyLine('startup_recovery', 'not_linked')).toBe(false);
  });

  test('неизвестно → нейтральный текст без обещания «вернём»', () => {
    const ru = getStartupRecoveryHonestCopy('ru', 'unknown');
    expect(ru?.subtitle).toBe('Войди тем способом, которым входил раньше. Если входа не было, этот прогресс вернуть нельзя.');
    expect(ru?.title).not.toContain('Всё в безопасности');
    expect(ru?.subtitle).not.toMatch(/верн[её]м/i);
    expect(shouldShowSavedJourneyLine('startup_recovery', 'unknown')).toBe(false);
  });

  test('тексты есть на английском и украинском и не обещают восстановления', () => {
    for (const state of ['not_linked', 'unknown'] as const) {
      const en = getStartupRecoveryHonestCopy('en', state);
      const uk = getStartupRecoveryHonestCopy('uk', state);
      expect(en?.title.length).toBeGreaterThan(5);
      expect(uk?.title.length).toBeGreaterThan(5);
      expect(en?.subtitle).toMatch(/can’t be restored/);
      expect(en?.title).not.toBe('Everything is safe');
    }
  });

  test('вне окна восстановления строка «путь сохранён» не трогается', () => {
    expect(shouldShowSavedJourneyLine('settings', 'unknown')).toBe(true);
    expect(shouldShowSavedJourneyLine('lesson1', 'not_linked')).toBe(true);
  });

  test('все 9 языков прописаны в обоих честных текстах', () => {
    const src = read('components/startup_recovery_link_copy.ts');
    for (const key of ["ru:", "uk:", "en:", "es:", "'pt-BR':", "vi:", "id:", "tr:", "pl:"]) {
      expect(src.split(key).length - 1).toBeGreaterThanOrEqual(4);
    }
  });

  test('модалка берёт честный текст до дефолтного и читает провайдер текущей сессии', () => {
    const modal = read('components/RegistrationPromptModal.tsx');
    expect(modal).toContain('const finalTitle = title ?? recoveryHonestCopy?.title ?? defaultTitle;');
    expect(modal).toContain('const finalSubtitle = subtitle ?? recoveryHonestCopy?.subtitle ?? defaultSubtitle;');
    expect(modal).toContain('peekLinkedAuthFromCurrentUser()?.provider');
    expect(modal).toContain('[AUTH-RECOVERY-COPY]');
    expect(modal).toContain('{showSavedJourneyLine && (');
  });
});

describe('Настройки: строка гостя', () => {
  test('вместо «аккаунт не привязан» — «прогресс привязан к этому телефону» (9 языков)', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).not.toContain("'аккаунт не привязан'");
    expect(settings).toContain(
      "L('прогресс привязан к этому телефону', 'прогрес прив’язаний до цього телефона', 'progress is tied to this phone', 'progreso vinculado a este teléfono', 'progresso vinculado a este celular', 'tiến độ gắn với điện thoại này', 'progres terikat ke ponsel ini', 'ilerleme bu telefona bağlı', 'postęp przypisany do tego telefonu')",
    );
    // строка показывается только без привязки: ветка linkedAuth оставлена прежней
    expect(settings).toMatch(/linkedAuth\s*\n\s*\? L\('аккаунт привязан'/);
  });
});

describe('Политика: прогресс гостя привязан к установке', () => {
  const paragraph = 'If you use the App as a guest (without signing in with Google or Apple), your progress is tied to this installation. Deleting the app, clearing its data, or moving to a new device may permanently lose it. Sign in with Google or Apple to keep it.';
  test.each([
    'legal/privacy_policy_en.json',
    'legal/privacy_policy_en_ios.json',
    'app/legal/privacy_policy_en.json',
    'app/legal/privacy_policy_en_ios.json',
  ])('%s — абзац в разделе 3 «Data stored on your device»', (rel) => {
    const sections = JSON.parse(read(rel)) as Array<{ heading?: string; body?: string }>;
    const section = sections.find((s) => String(s.heading ?? '').startsWith('3. Data stored on your device'));
    expect(section?.body).toContain(paragraph);
  });

  test('HTML-копии пересобраны (legal:sync)', () => {
    for (const rel of ['privacy.html', 'admin/v2/oauth-privacy.html', 'knowly-www/legal/privacy/index.html']) {
      expect(read(rel)).toContain('your progress is tied to this installation');
    }
  });
});

describe('кнопки входа: первый кадр = финальная геометрия', () => {
  test('Google проверяется синхронно, асинхронная версия делегирует', () => {
    const provider = read('app/auth_provider.ts');
    expect(provider).toContain('export function isGoogleSignInAvailableSync(): boolean {');
    expect(provider).toMatch(/export async function isGoogleSignInAvailable\(\): Promise<boolean> \{\s*return isGoogleSignInAvailableSync\(\);\s*\}/);
    expect(provider).toContain('export function peekAppleSignInAvailability(): boolean | null {');
  });

  test('онбординг: Google инициализируется синхронно, Apple держит место заглушкой', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    expect(onboarding).toContain('const [googleAvailable] = useState(isGoogleSignInAvailableSync);');
    expect(onboarding).toContain('useState<boolean | null>(peekAppleSignInAvailability)');
    expect(onboarding).not.toContain('isGoogleSignInAvailable().then');
    expect(onboarding).toContain('<AuthProviderButtonPlaceholder testID="onboarding-apple-placeholder" />');
    expect(onboarding).toContain('<AuthProviderButtonPlaceholder shape="pill" testID="onboarding-privacy-apple-placeholder" />');
    // «вход недоступен» не мигает, пока Apple не ответил
    expect(onboarding).toContain('{!googleAvailable && appleAvailable === false ? (');
  });

  test('окно входа: Google синхронно при открытии, Apple — заглушка той же высоты', () => {
    const modal = read('components/RegistrationPromptModal.tsx');
    expect(modal).toContain('const googleAvail = useMemo(() => (visible ? isGoogleSignInAvailableSync() : false), [visible]);');
    expect(modal).toContain('useState<boolean | null>(peekAppleSignInAvailability)');
    expect(modal).not.toContain('isGoogleSignInAvailable().then');
    expect(modal).toContain('{appleAvail === null && <AuthProviderButtonPlaceholder shape="sheet" testID="provider-apple-placeholder" />}');
    expect(modal).toContain('{!googleAvail && appleAvail === false && (');
  });

  test('заглушка повторяет высоту кнопки каждой формы', () => {
    const buttons = read('components/AuthProviderButtons.tsx');
    expect(buttons).toMatch(/default: HEIGHT,\s*pill: PILL_HEIGHT,\s*sheet: SHEET_HEIGHT,/);
    expect(buttons).toContain('height: AUTH_PROVIDER_BUTTON_HEIGHT[shape]');
    expect(buttons).toContain('pointerEvents="none"');
  });
});

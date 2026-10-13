// зачем (кандидаты Макетов 7cff8cada, координатор 12.10): paywall-gap-006, dialogs-023, settings-gap-008, profile-022 / paywalls-024 — каждая правка по доказанной причине.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('кандидаты Макетов 12.10', () => {
  it('paywall-gap-006: «Разрешить напоминание» — пилюля на всю ширину (stretch во внешнем слое, градиент обрезан скруглением)', () => {
    const src = read('components/paywall/PaywallTrialReminderPrompt.tsx');
    expect(src).toMatch(/onPress=\{allow\}\s+withHaptic=\{false\}\s+outerStyle=\{S\.stretch\}/);
    expect(src).toContain('stretch: { alignSelf: \'stretch\' },');
    expect(src).toMatch(/cta: \{[^}]*borderRadius: 29[^}]*overflow: 'hidden' \}/);
  });

  it('dialogs-023: подпись настроения в шапке — одна строка, без переноса посреди слова и без сжатия шрифта', () => {
    const src = read('components/dialogs/DialogueV2SessionScreen.tsx');
    expect(src).toMatch(/<Text numberOfLines=\{1\} ellipsizeMode="tail" maxFontSizeMultiplier=\{1\.3\} style=\{\{ flexShrink: 1, color: glass\.secondary, fontSize: 16/);
    expect(src).not.toContain('adjustsFontSizeToFit');
  });

  it('settings-gap-008: dev-сид опроса не кладёт вопрос в заголовок и абзац (трижды одно и то же)', () => {
    const src = read('app/app_messages.ts');
    expect(src).toContain("...texts('title', kind === 'poll' ? DEV_POLL_TITLE : DEV_MESSAGE_TITLE),");
    expect(src).toContain("...texts('message', kind === 'poll' ? DEV_POLL_BODY : DEV_MESSAGE_BODY),");
    expect(src).toContain("ru: 'Важное от Phraseman'");
  });

  it('profile-022 / paywalls-024: шаг робота получает прогресс удержания и не уходит в браузер магазина', () => {
    const flag = read('app/dev_save_offer_progress.ts');
    expect(flag).toContain('streak: 12, lessonsCompleted: 38');
    expect(flag).toContain('devAvailable() && on ? DEV_SAVE_OFFER_PROGRESS : null');
    expect(read('app/manage_subscription.tsx')).toContain('getDevSaveOfferProgress() ?? (hydration');
    expect(read('app/dev_state_fixtures.ts')).toContain("request.offerProgress = pick('offerProgress', ['on', 'off'] as const);");
    expect(read('scripts/dev_links_r1_steps.py')).toContain("PLAN_Y + '&offerProgress=on', MANAGE,");
  });
});

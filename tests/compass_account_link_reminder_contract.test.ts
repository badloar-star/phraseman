import fs from 'fs';
import path from 'path';

const root = process.cwd();
const hostSource = fs.readFileSync(path.join(root, 'app/compass/compass_briefing_host.tsx'), 'utf8');
const modalSource = fs.readFileSync(path.join(root, 'app/compass/compass_briefing_modal.tsx'), 'utf8');
const registrationSource = fs.readFileSync(path.join(root, 'components/RegistrationPromptModal.tsx'), 'utf8');

describe('compass account link reminder contract', () => {
  it('shows the save-progress reminder from Compass only after day two and only for unlinked users', () => {
    expect(hostSource).toContain("const ACCOUNT_LINK_REMINDER_SEEN_KEY = 'compass_account_link_reminder_seen_v1'");
    expect(hostSource).toContain('const planDayIndex = day?.planDayIndex ?? 0');
    expect(hostSource).toContain('planDayIndex < 2');
    expect(hostSource).toContain('AUTH_PROMPT_SHOWN_KEY');
    expect(hostSource).toContain('getLinkedAuthInfo()');
    expect(hostSource).toContain('setAccountReminderEligible(linked == null)');
  });

  it('opens the existing registration prompt instead of adding a new auth flow', () => {
    expect(hostSource).toContain("import RegistrationPromptModal from '../../components/RegistrationPromptModal'");
    expect(hostSource).toContain('context="compass"');
    expect(hostSource).toContain('markAccountReminderSeen()');
    expect(hostSource).toContain('navigateAfterModalClose');
    expect(hostSource).toContain('setAccountPromptVisible(true)');
    expect(registrationSource).toContain("'home_banner' | 'compass'");
  });

  it('renders a dedicated Compass account reminder CTA', () => {
    expect(modalSource).toContain('accountReminder?:');
    expect(modalSource).toContain('onAccountLinkPress?: () => void');
    expect(modalSource).toContain('testID="compass-account-link-reminder"');
    expect(modalSource).toContain('testID="compass-account-link-cta"');
  });
});

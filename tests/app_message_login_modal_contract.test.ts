import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('app-message login modal contract', () => {
  test('reuses the animated release-notes modal with a local acknowledgement CTA', () => {
    const wrapper = read('components/AppMessageAnnouncementModal.tsx');
    const releaseNotesModal = read('components/ReleaseNotesModal.tsx');

    expect(wrapper).toContain("from './ReleaseNotesModal'");
    expect(wrapper).toContain('type ReleaseNotesAnnouncement');
    expect(wrapper).toContain('pickAppMessageText(message, lang)');
    expect(wrapper).toContain('<ReleaseNotesModal');
    expect(wrapper).toContain('announcement=');
    expect(wrapper).toContain('showCloseButton');
    expect(wrapper).toContain('body:');
    expect(wrapper).not.toContain('pill:');
    expect(wrapper).not.toContain('subtitle:');
    expect(wrapper).not.toContain('itemTitle:');
    expect(wrapper).not.toContain('footer:');
    expect(wrapper).not.toContain('UpdateModal');
    expect(wrapper).not.toContain('dismissAppMessage');
    expect(releaseNotesModal).toContain('announcement?:');
    expect(releaseNotesModal).toContain('showCloseButton?:');
    expect(releaseNotesModal).toContain('accessibilityLabel={displayTx.close}');
    expect(releaseNotesModal).toContain('styles.announcementCard');
    expect(releaseNotesModal).toContain('announcement.body');
    expect(releaseNotesModal).not.toContain('announcement.pill');
    expect(releaseNotesModal).not.toContain('announcement.subtitle');
    expect(releaseNotesModal).not.toContain('notifications-outline');
  });

  test('registers the modal with the root overlay arbiter and account-scoped queue', () => {
    const layout = read('app/_layout.tsx');
    const overlayCore = read('components/overlay_arbiter_core.ts');

    expect(layout).toContain("useOverlayVisible('appMessageModal'");
    expect(layout).toContain('<AppMessageAnnouncementModal');
    expect(layout).toContain('acknowledgeAppMessageModal');
    expect(overlayCore).toContain("'appMessageModal'");
  });

  test('renders a feathered shine instead of sweeping a solid rectangle', () => {
    const releaseNotesModal = read('components/ReleaseNotesModal.tsx');

    expect(releaseNotesModal).toContain('styles.shineGradient');
    expect(releaseNotesModal).toContain("'rgba(255, 247, 206, 0)'");
    expect(releaseNotesModal).not.toContain("backgroundColor: '#FFF7CE'");
  });
});

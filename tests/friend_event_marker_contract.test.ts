import fs from 'node:fs';
import path from 'node:path';

describe('friend event marker and study modal', () => {
  const marker = fs.readFileSync(path.join(process.cwd(), 'components/friends_together/FriendEventMarker.tsx'), 'utf8');
  const modal = fs.readFileSync(path.join(process.cwd(), 'components/friends_together/FriendStudyInviteModal.tsx'), 'utf8');
  const row = fs.readFileSync(path.join(process.cwd(), 'components/friends_together/FriendListRow.tsx'), 'utf8');

  it('uses universal Ionicons, accessible invisible meaning, and Motion Hybrid tokens', () => {
    expect(marker).toContain("from '@expo/vector-icons/Ionicons'");
    expect(marker).toContain("'hand-left-outline'");
    expect(marker).toContain("'book-outline'");
    expect(marker).toContain("'shield-half-outline'");
    expect(marker).toContain('name="flash"');
    expect(marker).toContain('accessibilityLabel');
    expect(marker).toContain('useReduceMotion');
    expect(marker).toContain('LUM');
    expect(marker).toContain('setInterval');
    expect(marker).toContain('clearInterval');
    expect(marker).not.toContain("from 'expo-image'");
    expect(marker).not.toContain('getFriendEventAsset');
    expect(marker).not.toContain('themeMode');
    expect(marker).not.toContain('За тебя');
    expect(marker).not.toContain('Зовёт');
  });

  it('keeps the friend row human and gives study invite only approved primary copy', () => {
    expect(row).toContain('<FriendEventMarker');
    expect(modal).toContain('HybridAlertShell');
    expect(modal).toContain('Пять минут на английский?');
    expect(modal).toContain('Начать занятие');
    expect(modal).toContain('Не сейчас');
    expect(modal).not.toContain('Одно маленькое занятие');
  });
});

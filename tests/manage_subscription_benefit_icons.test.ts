// зачем (склейка profile-016/017, 12.10): в «Подписка Plus» значки пунктов «Что включено» были залитые и другие (chatbubbles, stats-chart,
// albums), а в макете manage-subscription-states.html — контурные (bolt, chat, mic, bookmark, snow, trend, layers), 22 px, цвет — оттенок темы.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'manage_subscription.tsx'), 'utf8');

describe('manage subscription: included benefits use the mockup outline icons', () => {
  it('maps every benefit to its outline glyph', () => {
    const expected: Record<string, string> = {
      energy: 'flash-outline',
      free_conversation: 'chatbubble-outline',
      pronunciation: 'mic-outline',
      saved_phrases: 'bookmark-outline',
      streak_freezes: 'snow-outline',
      detailed_stats: 'trending-up-outline',
      flashcard_training: 'layers-outline',
    };
    for (const [id, icon] of Object.entries(expected)) {
      expect(src).toContain(`{ benefitId: '${id}', icon: '${icon}',`);
    }
  });

  it('draws the benefit icon at 22 px in the theme tint, like the mockup', () => {
    expect(src).toContain('<Ionicons name={benefit.icon} size={22} color={glass.lightTint} />');
    expect(src).toContain('<Ionicons name="checkmark" size={20} color={glass.lightTint} />');
  });
});

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

  // зачем (владелец 11.11, макет plus-screens-duo-2026-11-11, раздел B): строки «Что включено» рисует ManageSubscriptionDuoView —
  // значок по-прежнему контурный 22 px, но цвет теперь от уровня подписки (Ultra — коралловый, Plus — фиолетовый; в светлой теме — цвет текста).
  it('draws the benefit icon at 22 px in the tier accent, like the mockup', () => {
    const view = fs.readFileSync(path.join(__dirname, '..', 'components', 'manage-subscription', 'ManageSubscriptionDuoView.tsx'), 'utf8');
    expect(src).toContain('icon: benefit.icon');
    expect(view).toContain('<Ionicons name={benefit.icon} size={22} color={accent} />');
    expect(view).toContain('<Ionicons name="checkmark" size={18} color={accent} />');
    expect(view).toContain('const accent = g.isLight ? g.text : colors[0];');
  });
});

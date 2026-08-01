import fs from 'fs';
import path from 'path';

describe('ai typing bubble contract', () => {
  const scenarioSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');
  const companionSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'), 'utf8');
  const bubbleSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'AiTypingBubble.tsx'), 'utf8');

  it('uses the custom typing bubble in both AI chat screens', () => {
    for (const source of [scenarioSource, companionSource]) {
      expect(source).toContain("import AiTypingBubble from '../components/AiTypingBubble';");
      expect(source).toContain('<AiTypingBubble');
    }
  });

  it('keeps the typing bubble animated, accessible, and reduced-motion aware', () => {
    expect(bubbleSource).toContain('accessibilityLabel="AI is typing a reply"');
    expect(bubbleSource).toContain('testID="ai-typing-bubble"');
    expect(bubbleSource).toContain('AccessibilityInfo.isReduceMotionEnabled');
    expect(bubbleSource).toContain("AccessibilityInfo.addEventListener('reduceMotionChanged'");
    expect(bubbleSource).toContain('Animated.loop');
    expect(bubbleSource).toContain('useNativeDriver: true');
    expect(bubbleSource).toContain('translateY');
    expect(bubbleSource).toContain('opacity');
  });
});

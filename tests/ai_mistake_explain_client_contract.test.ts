import fs from 'fs';
import path from 'path';

const clientSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_mistake_explain_client.ts'), 'utf8');
const cardSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'AiMistakeCard.tsx'), 'utf8');

describe('AI mistake explanation client contract', () => {
  it('calls the protected explainMistake callable with App Check initialized', () => {
    expect(clientSource).toContain('initFirebaseAppCheckIfAvailable');
    expect(clientSource).toContain("'explainMistake'");
    expect(clientSource).toContain('ExplainMistakeRequest');
    expect(clientSource).toContain('ExplainMistakeResponse');
  });

  it('keeps the smart card inline with a single action and visible quota state', () => {
    expect(cardSource).toContain('testID="ai-mistake-card"');
    expect(cardSource).toContain('testID="ai-mistake-explain-button"');
    expect(cardSource).toContain('remaining');
    expect(cardSource).toContain('AiMistakeCardState');
  });
});

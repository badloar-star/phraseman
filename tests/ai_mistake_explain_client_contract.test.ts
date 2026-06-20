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

  it('supports diff pairs and the eli5 variant for the whole-error breakdown', () => {
    expect(clientSource).toContain('diffPairs');
    expect(clientSource).toContain('MistakeExplainVariant');
    expect(clientSource).toContain("'eli5'");
  });

  it('keeps the smart card inline and exposes the simple-explain footer action', () => {
    expect(cardSource).toContain('testID="ai-mistake-card"');
    expect(cardSource).toContain('testID="ai-mistake-simple-button"');
    expect(cardSource).toContain('onOpenSimple');
    expect(cardSource).toContain('AiMistakeCardState');
  });

  it('no longer shows a daily quota line on the card', () => {
    expect(cardSource).not.toContain('Осталось сегодня');
    expect(cardSource).not.toContain('quotaLine');
  });
});

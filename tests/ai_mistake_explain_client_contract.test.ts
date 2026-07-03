import fs from 'fs';
import path from 'path';

const clientSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_mistake_explain_client.ts'), 'utf8');
const cardSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'AiMistakeCard.tsx'), 'utf8');
const limitCardSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'AiLimitUpsellCard.tsx'), 'utf8');
const hookSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'use_mistake_explain.ts'), 'utf8');

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

  it('keeps the smart card inline and shows the free-limit upsell card', () => {
    expect(cardSource).toContain('testID="ai-mistake-card"');
    expect(cardSource).toContain('AiLimitUpsellCard');
    expect(cardSource).toContain('testID="ai-mistake-limit-card"');
    expect(limitCardSource).toContain('Получить фулл доступ');
    expect(cardSource).toContain('AiMistakeCardState');
  });

  it('suppresses repeat mistake-limit notices after the first one shown today', () => {
    expect(hookSource).toContain('hasShownAiMistakeLimitNoticeToday');
    expect(hookSource).toContain("setAiMistakeState('hidden')");
    expect(hookSource).toContain('markAiMistakeLimitNoticeShownToday');
  });

  it('no longer shows a daily quota line on the card', () => {
    expect(cardSource).not.toContain('Осталось сегодня');
    expect(cardSource).not.toContain('quotaLine');
  });
});

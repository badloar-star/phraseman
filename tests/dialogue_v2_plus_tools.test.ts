import fs from 'node:fs';
import path from 'node:path';

describe('Dialogue V2 Plus tools discovery', () => {
  const toolsSource = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2PlusTools.tsx'),
    'utf8',
  );
  const containerSource = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2CatalogueContainer.tsx'),
    'utf8',
  );

  test('shows neutral free conversation and memory rows in existing Design 2.0 styling', () => {
    expect(toolsSource).toContain("ru: 'Свободный разговор'");
    expect(toolsSource).toContain("ru: 'Память диалогов'");
    expect(toolsSource).toContain('V2.gapTight');
    expect(toolsSource).toContain('V2.radius.row');
    expect(toolsSource).toContain('useV2Palette');
    expect(toolsSource).not.toMatch(/Компас|Compass/);
    expect(toolsSource).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  test('keeps free conversation Plus-gated while memory always reaches its delete-capable route', () => {
    expect(containerSource).toContain('<DialogueV2PlusTools');
    expect(containerSource).toContain('usePremium()');
    expect(containerSource).toContain("pathname: '/dialogue_v2_freeform'");
    expect(containerSource).not.toContain("pathname: '/ai_companion_session'");
    expect(containerSource).toContain("pathname: '/dialogue_v2_memory'");
    expect(containerSource).toContain("pathname: '/premium_modal'");
    expect(containerSource).toContain("source: 'dialogue_v2_freeform'");
    expect(containerSource).not.toContain("source: 'dialogue_v2_memory'");
  });

  test('uses the approved free-conversation product name without a companion label', () => {
    const companionSource = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'),
      'utf8',
    );
    const subscriptionSource = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'manage_subscription.tsx'),
      'utf8',
    );
    expect(companionSource).toContain("ru: 'Свободный разговор'");
    expect(companionSource).toContain("en: 'Free conversation'");
    expect(companionSource).not.toContain("ru: 'Компас'");
    expect(companionSource).not.toContain("ru: 'Свободный разговор с ИИ-компаньоном'");
    expect(subscriptionSource).not.toContain('Собеседник «Компас»');
    // зачем (30.09): строки «…без ограничений» в manage_subscription не было ни в одной версии
    // (git log -S пуст) — список Plus намеренно без маркетинговых обещаний. Сторожим имя продукта.
    expect(subscriptionSource).toContain("benefitId: 'free_conversation', icon: 'chatbubbles', ru: 'Свободный разговор'");
  });
});

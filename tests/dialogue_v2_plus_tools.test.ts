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

  // зачем (приказ владельца 11.10): «Память диалогов» — только в Настройках → Приватность, не в разделе.
  test('shows the neutral free conversation row (memory lives in Privacy settings) in Design 2.0 styling', () => {
    expect(toolsSource).toContain("ru: 'Свободный разговор'");
    expect(toolsSource).not.toContain("ru: 'Память диалогов'");
    // ЗАМОК ВЛАДЕЛЬЦА 22.10: «Да, переносить» (макет dialogs-hub-v4) — плитка одного стиля с плитками тем: V2Pressable, токены dialogs_hub_tokens (заливка «контрол»), высота 58, радиус 20, без hex-цветов
    expect(toolsSource).toContain('V2Pressable');
    expect(toolsSource).toContain('dialogsHubTokens');
    expect(toolsSource).toMatch(/tile: \{ height: 58, borderRadius: 20,/);
    expect(toolsSource).not.toMatch(/Компас|Compass/);
    expect(toolsSource).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  // зачем (координатор 12.10, dialogs-001/002; эталон «Тень» etalon.html .dc/.pp): значок PLUS рядом с названием, плитка 52/18, значки и замок/шеврон цвета темы
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «ЕСЛИ PLUS ЮЗЕР ТО УБРАТЬ PLUS ИКОНКУ» — значок Plus и замок только у Free; у Plus шеврон и никакого значка (раньше значок был виден всегда)
  test('free conversation tile: Plus badge and lock only for Free, chevron without a badge for Plus', () => {
    expect(toolsSource).toContain('dialogue-v2-freeform-plus-badge');
    const badge = toolsSource.indexOf('dialogue-v2-freeform-plus-badge');
    const gate = toolsSource.lastIndexOf('!hasPremiumAccess ? (', badge);
    expect(gate).toBeGreaterThan(-1);
    // значок стоит ВНУТРИ ветки «нет Plus», а шеврон — в ветке «есть Plus»
    expect(toolsSource.indexOf('chevron-forward')).toBeGreaterThan(badge);
    expect(toolsSource.indexOf('lock-closed')).toBeGreaterThan(badge);
    expect(toolsSource).toContain('t.plus.bg');
    expect(toolsSource).toContain('t.plus.ink');
  });

  test('keeps free conversation Plus-gated; memory route is reached from Privacy settings', () => {
    expect(containerSource).toContain('<DialogueV2PlusTools');
    expect(containerSource).toContain('usePremium()');
    expect(containerSource).toContain("pathname: '/dialogue_v2_freeform'");
    expect(containerSource).not.toContain("pathname: '/ai_companion_session'");
    expect(containerSource).not.toContain("pathname: '/dialogue_v2_memory'");
    // экран памяти (удаление сохранённого) доступен без Plus — из Настроек → Приватность.
    expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'privacy_settings.tsx'), 'utf8')).toContain("router.push('/dialogue_v2_memory'");
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
    expect(companionSource).toContain("en: 'Open conversation'"); // зачем (13.10): «Free» по-английски читалось как «бесплатный»
    expect(companionSource).not.toContain("ru: 'Компас'");
    expect(companionSource).not.toContain("ru: 'Свободный разговор с ИИ-компаньоном'");
    expect(subscriptionSource).not.toContain('Собеседник «Компас»');
    // зачем (30.09): строки «…без ограничений» в manage_subscription не было ни в одной версии
    // (git log -S пуст) — список Plus намеренно без маркетинговых обещаний. Сторожим имя продукта.
    // 12.10: значок — контурный chatbubble-outline по макету manage-subscription-states.html (склейка profile-016).
    expect(subscriptionSource).toContain("benefitId: 'free_conversation', icon: 'chatbubble-outline', ru: 'Свободный разговор'");
  });
});

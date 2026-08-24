// ════════════════════════════════════════════════════════════════════════════
// Контракт: блок «Дополнительное предложение» в PaywallPlanCards.
//
// ИСТОРИЯ. Изначально тоггл раскрывал разовую покупку Phraseman Pro, и сторож
// сторожил имена showLifetimeOffer/lifetimeOfferExpanded. Позже под тот же
// тоггл переехала карточка MAX, переменные переименовали в
// showAdditionalOffer/additionalOfferExpanded — и сторож ослеп: он искал
// строки, которых в файле уже не было, и молча проходил на любом коде.
// Найдено аудитом 2026-08-24, здесь имена приведены к фактическим.
//
// ПРАВИЛО СЕЙЧАС (владелец 2026-08-24): продажа Pro снята, под тогглом живёт
// тариф MAX. Карточка MAX — навигационная (уводит на /max_paywall), а не
// выбор плана, поэтому у неё role="button" и chevron вместо radio.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'paywall', 'PaywallPlanCards.tsx'),
  'utf8',
);

describe('paywall additional offer disclosure', () => {
  it('keeps the extra offer collapsed until the user asks for it', () => {
    expect(source).toContain("import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';");
    expect(source).toContain('const [showAdditionalOffer, setShowAdditionalOffer] = React.useState(false);');
    expect(source).toContain("const additionalOfferExpanded = showAdditionalOffer || selected === 'lifetime';");
    expect(source).toContain('accessibilityState={{ expanded: additionalOfferExpanded, disabled: !!disabled }}');
    // Карточки планов остаются радио-выбором (ветка «не onNavigate»).
    expect(source).toContain("accessibilityState={onNavigate ? { disabled: !!disabled } : { selected: sel, disabled: !!disabled }}");
  });

  it('never renders the lifetime card without the disclosure gate', () => {
    expect(source).toContain('lifetimeAvailable && additionalOfferExpanded && renderCard(');
    // Безусловный рендер Pro не должен вернуться.
    expect(source).not.toContain('lifetimeAvailable && renderCard(');
  });

  it('does not leave an invisible lifetime selection after the offer is collapsed', () => {
    expect(source).toContain("if (!nextExpanded && selected === 'lifetime') onSelect('yearly');");
    // Зона нажатия тоггла не мельче 48pt.
    expect(source).toContain('minHeight: 48');
  });

  it('shows MAX as a navigation card, not as a selectable plan', () => {
    // зачем: MAX покупается на своём экране (/max_paywall) через
    // max_subscription_purchase, а не через денежный путь Plus/Pro. Если он
    // когда-нибудь станет настоящим значением PaywallPlan, этот сторож упадёт
    // и заставит пересмотреть сброс выбора при сворачивании тоггла.
    expect(source).toContain('onOpenMaxPaywall && additionalOfferExpanded && renderCard(');
    expect(source).toContain("accessibilityRole={onNavigate ? 'button' : 'radio'}");
    expect(source).toContain("name={onNavigate ? 'chevron-forward' : sel ? 'checkmark-circle' : 'ellipse-outline'}");
  });
});

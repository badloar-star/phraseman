// ════════════════════════════════════════════════════════════════════════════
// paywall_exit_offer_themed_modal_contract.test.ts
//
// зачем: владелец увидел на пейволе СИСТЕМНЫЙ диалог вместо нашей модалки —
// exit-intent оффер триала («Точно уходишь? N дня доступа — бесплатно») был
// написан через нативный Alert.alert. Нативный диалог рисует ОС: он игнорирует
// тему приложения (на Android — белый лист с зелёными капс-кнопками поверх
// тёмного пейвола) и выбивается из дизайна.
//
// Контракт фиксирует ровно ту регрессию, которую поймали глазами:
//   1) оффер живёт в состоянии хука (ExitTrialOfferState), а не в Alert.alert;
//   2) ВСЕ семь вариантов пейвола A–G рисуют его нашим <ThemedConfirmModal>;
//   3) вся мультиязычная копия и три события воронки сохранены.
//
// Тест — по исходному тексту (как соседние paywall_tonal_*_contract): хук
// usePaywallPurchase не рендерится в node/jest без рендерера, а регрессия здесь
// именно «каким компонентом нарисовано», что и проверяется текстом.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PAYWALL_VARIANTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;

function readPurchaseHook(): string {
  return fs.readFileSync(path.join(ROOT, 'app', 'paywall_purchase.ts'), 'utf8');
}

function readPaywallScreen(variant: string): string {
  return fs.readFileSync(path.join(ROOT, 'app', `paywall_${variant}.tsx`), 'utf8');
}

describe('paywall exit-intent offer uses the themed modal, not a native Alert', () => {
  it('exposes the exit offer as hook state instead of firing a native Alert', () => {
    const source = readPurchaseHook();

    // Оффер отдаётся наружу как состояние с готовой копией и колбэками.
    expect(source).toContain('export type ExitTrialOfferState = {');
    expect(source).toContain('const [exitOffer, setExitOffer] = useState<ExitTrialOfferState | null>(null);');
    expect(source).toContain('setExitOffer({');
    expect(source).toContain('exitOffer,');
  });

  it('never routes the exit offer copy through Alert.alert', () => {
    const source = readPurchaseHook();

    // Заголовок оффера обязан жить в setExitOffer({ title: ... }), а не в Alert.
    const offerAnchor = source.indexOf('Точно уходишь?');
    expect(offerAnchor).toBeGreaterThan(-1);

    // Ближайший вызов ВЫШЕ заголовка — setExitOffer, а не Alert.alert: если
    // кто-то вернёт нативный диалог, этот порядок сломается.
    const before = source.slice(0, offerAnchor);
    const lastSetOffer = before.lastIndexOf('setExitOffer({');
    const lastAlert = before.lastIndexOf('Alert.alert(');
    expect(lastSetOffer).toBeGreaterThan(lastAlert);
  });

  it('keeps the full multilingual offer copy and the three funnel events', () => {
    const source = readPurchaseHook();

    // Копия оффера на всех поддерживаемых языках (регресс = пустая модалка).
    for (const marker of ['Точно уходишь?', 'Точно йдеш?', '¿Seguro que te vas?', 'Tem certeza?']) {
      expect(source).toContain(marker);
    }
    // Обе подписи кнопок и честное объяснение про списание.
    expect(source).toContain('Не сейчас');
    expect(source).toContain('Платить сейчас не нужно');

    // Воронка оффера не должна потеряться при переезде на модалку.
    expect(source).toContain("trackEvent('paywall_exit_offer_shown'");
    expect(source).toContain("trackEvent('paywall_exit_offer_accepted'");
    expect(source).toContain("trackEvent('paywall_exit_offer_declined'");
  });

  it.each(PAYWALL_VARIANTS)('renders the offer with ThemedConfirmModal on paywall %s', (variant) => {
    const source = readPaywallScreen(variant);

    expect(source).toContain("import ThemedConfirmModal from '../components/ThemedConfirmModal';");
    expect(source).toContain('<ThemedConfirmModal');
    expect(source).toContain('visible={!!p.exitOffer}');
    // Подтверждение и отказ обязаны звать колбэки хука — иначе аналитика
    // оффера и закрытие пейвола молча отвалятся.
    expect(source).toContain('p.exitOffer?.onConfirm()');
    expect(source).toContain('p.exitOffer?.onCancel()');
  });

  it.each(PAYWALL_VARIANTS)('does not fall back to a native Alert on paywall %s', (variant) => {
    const source = readPaywallScreen(variant);

    expect(source).not.toContain('Alert.alert(');
  });
});

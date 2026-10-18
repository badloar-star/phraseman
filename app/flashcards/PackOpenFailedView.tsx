// ═════════════════════════════════════════════════════════════════════
// PackOpenFailedView.tsx — спокойное состояние набора, у которого не загрузились карточки (без слов об ошибке).
//
// зачем (правило владельца 01.10 и 18.10, координатор 08:00: «экранов-ошибок нигде»): раньше здесь был честный экран «Не удалось загрузить / Проверь интернет / Повторить» (🟡 Макеты, эмулятор B, 15.10).
// Теперь — спокойное пустое состояние без слов об ошибке и без кнопки повтора: загрузка карточек набора тихо повторяется сама (useLoadGate: паузы 1/3/8 с, затем при возврате в приложение),
// счётчик живёт между монтированиями — view исчезает на время повтора и возвращается. «Назад» остаётся.
// Журнал причины — [NO-ERROR-SCREEN] pack_open_failed (и прежний [PACK-OPEN] в flashcards_collection.tsx).
// ═════════════════════════════════════════════════════════════════════
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QuietEmptyState from '../../components/cards-grid/QuietEmptyState';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { triLang, type Lang } from '../../constants/i18n';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { useLoadGate } from '../use_load_gate';

export default function PackOpenFailedView({ lang, onRetry, onBack }: Readonly<{ lang: Lang; onRetry: () => void; onBack: () => void }>) {
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets(); // зачем (Ревизор 3e4531ac1 🟡 (3)): «Назад» не должна уходить под жестовую полосу
  useLoadGate({ id: 'pack-open-cards', status: 'error', retry: onRetry, persistAcrossMounts: true });
  const back = triLang(lang, {
    ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
  });
  return (
    <View style={[styles.root, { backgroundColor: g.bg }]} testID="fc-pack-open-failed">
      <QuietEmptyState g={g} lang={lang} screen="pack_open_failed" reason="deeplink_cards_failed" testID="fc-pack-open-quiet" />
      <Pressable accessibilityRole="button" accessibilityLabel={back} hitSlop={12} onPress={onBack} style={[styles.back, { bottom: 16 + insets.bottom }]} testID="fc-pack-open-back">
        <Text style={[styles.backText, { color: g.text }]}>{back}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },
  back: { position: 'absolute', left: 0, right: 0, bottom: 28, alignItems: 'center', paddingVertical: 12 },
  backText: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
});

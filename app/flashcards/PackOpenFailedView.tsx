// ═══════════════════════════════════════════════════════════════════════════
// PackOpenFailedView.tsx — честное состояние «Не удалось загрузить набор» с «Повторить» и «Назад».
//
// зачем (🟡 от Макетов, эмулятор B, координатор 15.10): набор, у которого не загрузились карточки, 5 с показывал скелет и молча закрывался,
// выбрасывая в отдельный каталог. Теперь экран остаётся, говорит причину и даёт выбор: повторить загрузку или вернуться туда, откуда пришли.
// Журнал причины — [PACK-OPEN] в flashcards_collection.tsx.
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KitEmpty } from '../../components/cards-grid/CardsKit';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { triLang, type Lang } from '../../constants/i18n';

export default function PackOpenFailedView({ lang, onRetry, onBack }: Readonly<{ lang: Lang; onRetry: () => void; onBack: () => void }>) {
  const g = useLv2Glass();
  const title = triLang(lang, {
    ru: 'Не удалось загрузить', uk: 'Не вдалося завантажити', en: "Couldn't load this pack", es: 'No se pudo cargar',
    'pt-BR': 'Não foi possível carregar', vi: 'Không tải được', id: 'Gagal memuat', tr: 'Yüklenemedi', pl: 'Nie udało się wczytać',
  });
  const detail = triLang(lang, {
    ru: 'Проверь интернет', uk: 'Перевір інтернет', en: 'Check your connection', es: 'Comprueba tu conexión',
    'pt-BR': 'Verifique sua conexão', vi: 'Kiểm tra kết nối', id: 'Periksa koneksi', tr: 'Bağlantını kontrol et', pl: 'Sprawdź połączenie',
  });
  const retry = triLang(lang, {
    ru: 'Повторить', uk: 'Повторити', en: 'Try again', es: 'Reintentar',
    'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
  });
  const back = triLang(lang, {
    ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
  });
  return (
    <View style={[styles.root, { backgroundColor: g.bg }]} testID="fc-pack-open-failed">
      <KitEmpty g={g} icon="cloud-offline-outline" title={title} detail={detail} action={retry} actionIcon="refresh" onAction={onRetry} actionTestID="fc-pack-open-retry" />
      <Pressable accessibilityRole="button" accessibilityLabel={back} hitSlop={12} onPress={onBack} style={styles.back} testID="fc-pack-open-back">
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

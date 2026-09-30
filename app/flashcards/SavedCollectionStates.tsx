import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';

type Props = {
  lang: Lang;
  loadError: boolean;
  searchActive: boolean;
  onCommunity: () => void;
  onRetry: () => unknown;
};

function SavedGlassSheen({ edge, tint }: { edge: string; tint: string }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <BlurView intensity={Platform.OS === 'android' ? 12 : 16} blurReductionFactor={3}
      experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
      tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
    <LinearGradient colors={[tint, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={{ height: 1, backgroundColor: edge }} />
  </View>;
}

export function SavedCollectionLoading({ lang }: { lang: Lang }) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const label = triLang(lang, {
    ru: 'Загрузка карточек', uk: 'Завантаження карток', en: 'Loading cards', es: 'Cargando tarjetas',
    'pt-BR': 'Carregando cartões', vi: 'Đang tải thẻ', id: 'Memuat kartu', tr: 'Kartlar yükleniyor', pl: 'Wczytywanie kart',
  });
  return <View testID="fc-saved-loading" accessibilityRole="progressbar" accessibilityLabel={label} style={styles.loading}>
    {Array.from({ length: 4 }, (_, index) => <View key={index} style={[styles.skeleton, { backgroundColor: g.card, borderColor: g.glassEdge }]}>
      <SavedGlassSheen edge={g.glassEdge} tint={g.selected} />
      <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: index % 2 === 0 ? '39%' : '52%' }]} />
      <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: '24%' }]} />
      <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: '67%' }]} />
    </View>)}
    <ActivityIndicator color={g.secondary} style={styles.spinner} />
  </View>;
}

export function SavedCollectionState({ lang, loadError, searchActive, onCommunity, onRetry }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const title = loadError ? triLang(lang, {
    ru: 'Не удалось загрузить карточки', uk: 'Не вдалося завантажити картки', en: 'Could not load cards', es: 'No se pudieron cargar las tarjetas',
    'pt-BR': 'Não foi possível carregar os cartões', vi: 'Không tải được thẻ', id: 'Kartu tidak dapat dimuat', tr: 'Kartlar yüklenemedi', pl: 'Nie udało się wczytać kart',
  }) : searchActive ? triLang(lang, {
    ru: 'Ничего не найдено', uk: 'Нічого не знайдено', en: 'Nothing found', es: 'No se encontró nada',
    'pt-BR': 'Nada encontrado', vi: 'Không tìm thấy gì', id: 'Tidak ditemukan', tr: 'Hiçbir şey bulunamadı', pl: 'Nic nie znaleziono',
  }) : triLang(lang, {
    ru: 'Нет карточек', uk: 'Немає карток', en: 'No cards yet', es: 'Aún no hay tarjetas',
    'pt-BR': 'Ainda não há cartões', vi: 'Chưa có thẻ', id: 'Belum ada kartu', tr: 'Henüz kart yok', pl: 'Brak kart',
  });
  const detail = loadError ? triLang(lang, {
    ru: 'Проверьте интернет и попробуйте ещё раз.', uk: 'Перевірте інтернет і спробуйте ще раз.', en: 'Check your connection and try again.', es: 'Comprueba la conexión e inténtalo de nuevo.',
    'pt-BR': 'Verifique sua conexão e tente novamente.', vi: 'Kiểm tra kết nối và thử lại.', id: 'Periksa koneksi lalu coba lagi.', tr: 'Bağlantını kontrol edip tekrar dene.', pl: 'Sprawdź połączenie i spróbuj ponownie.',
  }) : searchActive ? triLang(lang, {
    ru: 'Попробуй другое слово.', uk: 'Спробуй інше слово.', en: 'Try another word.', es: 'Prueba con otra palabra.',
    'pt-BR': 'Tente outra palavra.', vi: 'Thử từ khác.', id: 'Coba kata lain.', tr: 'Başka bir kelime dene.', pl: 'Spróbuj innego słowa.',
  }) : triLang(lang, {
    ru: 'Сохраняй слова из уроков, видео и наборов — они соберутся здесь.', uk: 'Зберігай слова з уроків, відео й наборів — вони з’являться тут.', en: 'Save words from lessons, videos and packs — they will appear here.',
    es: 'Guarda palabras de lecciones, vídeos y packs; aparecerán aquí.', 'pt-BR': 'Salve palavras de aulas, vídeos e pacotes; elas aparecerão aqui.',
    vi: 'Lưu từ từ bài học, video và bộ thẻ — chúng sẽ xuất hiện ở đây.', id: 'Simpan kata dari pelajaran, video, dan paket — semuanya akan muncul di sini.',
    tr: 'Derslerden, videolardan ve paketlerden kelime kaydet; burada toplanacaklar.', pl: 'Zapisuj słowa z lekcji, filmów i zestawów — pojawią się tutaj.',
  });
  const action = loadError ? triLang(lang, {
    ru: 'Повторить загрузку', uk: 'Повторити завантаження', en: 'Retry loading', es: 'Volver a cargar',
    'pt-BR': 'Tentar carregar novamente', vi: 'Tải lại', id: 'Muat ulang', tr: 'Yeniden yükle', pl: 'Wczytaj ponownie',
  }) : triLang(lang, {
    ru: 'Наборы сообщества', uk: 'Набори спільноти', en: 'Community packs', es: 'Packs de la comunidad',
    'pt-BR': 'Pacotes da comunidade', vi: 'Bộ thẻ cộng đồng', id: 'Paket komunitas', tr: 'Topluluk paketleri', pl: 'Zestawy społeczności',
  });
  return <View testID={loadError ? 'fc-saved-error' : searchActive ? 'fc-saved-search-empty' : 'fc-saved-empty'} style={styles.state}>
    <View style={[styles.icon, { backgroundColor: g.card, borderColor: g.glassEdge }]}>
      <SavedGlassSheen edge={g.glassEdge} tint={g.selected} />
      <Ionicons name={loadError ? 'cloud-offline-outline' : searchActive ? 'search-outline' : 'bookmark-outline'} size={27} color={g.lightTint} />
    </View>
    <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
    <Text style={[styles.detail, { color: g.secondary }]}>{detail}</Text>
    {!searchActive || loadError ? <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={() => { if (loadError) void onRetry(); else onCommunity(); }}
      style={({ pressed }) => [styles.action, { backgroundColor: g.cta }, pressed && styles.pressed]}>
      <Text style={[styles.actionText, { color: g.ctaInk }]}>{action}</Text>
    </Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  skeleton: { height: 118, borderRadius: 16, borderWidth: 1, padding: 18, justifyContent: 'center', gap: 9, overflow: 'hidden' },
  skeletonLine: { height: 11, borderRadius: 6 },
  spinner: { marginTop: 8 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 88, paddingHorizontal: 30 },
  icon: { width: 61, height: 61, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center', marginTop: 18 },
  detail: { fontSize: 15, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  action: { minHeight: 46, borderRadius: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  actionText: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.82 },
});

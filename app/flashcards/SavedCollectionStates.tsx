import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import { useLoadGate } from '../use_load_gate';

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
  return <View testID="fc-saved-loading" accessibilityLabel={label} style={styles.loading}>
    {Array.from({ length: 4 }, (_, index) => <View key={index} style={[styles.skeleton, { backgroundColor: g.card, borderColor: g.glassEdge }]}>
      <SavedGlassSheen edge={g.glassEdge} tint={g.selected} />
      <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: index % 2 === 0 ? '39%' : '52%' }]} />
      <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: '24%' }]} />
      <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: '67%' }]} />
    </View>)}
  </View>;
}

// зачем (владелец 01.10 + D158 / PM-214): экрана ошибки загрузки нет — при сбое скелетон той же геометрии
// и тихий повтор, но не бесконечный: общий useLoadGate (паузы 1/3/8 с), затем «Сейчас недоступно» +
// «Попробовать снова». Счётчик живёт между монтированиями (persistAcrossMounts): экран размонтируется на
// время самой загрузки, и локальный счётчик сбрасывался бы каждый круг.
export function SavedCollectionState(props: Props) {
  const { lang, loadError, onRetry } = props;
  const retry = useCallback(() => {
    console.warn('[FC-SAVED] тихий повтор загрузки карточек');
    try { void Promise.resolve(onRetry()).catch((e) => console.warn('[FC-SAVED] повтор отклонён', e)); }
    catch (e) { console.warn('[FC-SAVED] повтор упал', e); }
  }, [onRetry]);
  const gate = useLoadGate({ id: 'fc-saved', status: loadError ? 'error' : 'ready', retry, persistAcrossMounts: true });
  if (loadError && gate.exhausted) return <SavedCollectionUnavailable lang={lang} onRetry={() => gate.retryNow('tap')} />;
  if (loadError) return <SavedCollectionLoading lang={lang} />;
  return <SavedCollectionEmpty {...props} />;
}

function SavedCollectionUnavailable({ lang, onRetry }: Readonly<{ lang: Lang; onRetry: () => void }>) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const title = triLang(lang, {
    ru: 'Сейчас недоступно', uk: 'Зараз недоступно', en: 'Not available right now', es: 'No disponible ahora',
    'pt-BR': 'Indisponível agora', vi: 'Hiện chưa khả dụng', id: 'Belum tersedia sekarang', tr: 'Şu anda kullanılamıyor', pl: 'Teraz niedostępne',
  });
  const action = triLang(lang, {
    ru: 'Попробовать снова', uk: 'Спробувати ще', en: 'Try again', es: 'Intentar de nuevo',
    'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
  });
  return <View testID="fc-saved-unavailable" style={styles.state}>
    <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
    <Pressable testID="fc-saved-try-again" accessibilityRole="button" accessibilityLabel={action} onPress={onRetry}
      style={({ pressed }) => [styles.action, { backgroundColor: g.opaqueControl }, pressed && styles.pressed]}>
      <Text style={[styles.actionText, { color: g.text }]}>{action}</Text>
    </Pressable>
  </View>;
}

// зачем (владелец: «в приложении запрещены любые различия с макетом», cards-section кадр 7 «Пусто»): блок стоит
// по центру ЭКРАНА (top:50%, translateY(-46%) от высоты 217), а не под заголовком; плитка 61×61 r16 #28282A,
// «Пока пусто» 24/30, подпись 16/22, кнопка 48 высотой с мятным свечением. Поиск без результатов (кадр 38) — прежний вид.
const EMPTY_BLOCK_H = 217;

function SavedCollectionEmpty({ lang, searchActive, onCommunity }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { height } = useWindowDimensions();
  // зачем: блок центрируется по ЭКРАНУ (как в макете), а родитель начинается под шапкой — меряем его верх в окне.
  const holder = useRef<View>(null);
  const [pageTop, setPageTop] = useState<number | null>(null);
  const measure = useCallback(() => {
    holder.current?.measureInWindow((_x, y) => { setPageTop((prev) => (prev === y ? prev : y)); });
  }, []);
  const title = searchActive ? triLang(lang, {
    ru: 'Ничего не найдено', uk: 'Нічого не знайдено', en: 'Nothing found', es: 'No se encontró nada',
    'pt-BR': 'Nada encontrado', vi: 'Không tìm thấy gì', id: 'Tidak ditemukan', tr: 'Hiçbir şey bulunamadı', pl: 'Nic nie znaleziono',
  }) : triLang(lang, {
    ru: 'Пока пусто', uk: 'Поки порожньо', en: 'Nothing here yet', es: 'Todavía no hay nada',
    'pt-BR': 'Ainda está vazio', vi: 'Chưa có gì', id: 'Masih kosong', tr: 'Henüz boş', pl: 'Na razie pusto',
  });
  const detail = searchActive ? triLang(lang, {
    ru: 'Попробуй другое слово.', uk: 'Спробуй інше слово.', en: 'Try another word.', es: 'Prueba con otra palabra.',
    'pt-BR': 'Tente outra palavra.', vi: 'Thử từ khác.', id: 'Coba kata lain.', tr: 'Başka bir kelime dene.', pl: 'Spróbuj innego słowa.',
  }) : triLang(lang, {
    ru: 'Сохраняйте слова в уроках', uk: 'Зберігайте слова в уроках', en: 'Save words in lessons', es: 'Guarda palabras en las lecciones',
    'pt-BR': 'Salve palavras nas aulas', vi: 'Lưu từ trong bài học', id: 'Simpan kata di pelajaran',
    tr: 'Derslerde kelime kaydet', pl: 'Zapisuj słowa w lekcjach',
  });
  const action = triLang(lang, {
    ru: 'Найти наборы', uk: 'Знайти набори', en: 'Find packs', es: 'Buscar packs',
    'pt-BR': 'Encontrar pacotes', vi: 'Tìm bộ thẻ', id: 'Cari paket', tr: 'Paket bul', pl: 'Znajdź zestawy',
  });
  if (searchActive) {
    return <View testID="fc-saved-search-empty" style={styles.state}>
      <View style={[styles.icon, { backgroundColor: g.card, borderColor: g.glassEdge }]}>
        <SavedGlassSheen edge={g.glassEdge} tint={g.selected} />
        <Ionicons name="search-outline" size={27} color={g.lightTint} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
      <Text style={[styles.detail, { color: g.secondary }]}>{detail}</Text>
    </View>;
  }
  return <View ref={holder} onLayout={measure} testID="fc-saved-empty" pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <View pointerEvents="box-none" style={[styles.emptyBlock, { top: Math.round(height / 2 - 0.46 * EMPTY_BLOCK_H - (pageTop ?? 0)), opacity: pageTop === null ? 0 : 1 }]}>
      <View style={styles.emptyTile}>
        <Ionicons name="bookmark" size={28} color="#E9E9EB" />
      </View>
      <Text accessibilityRole="header" style={[styles.emptyTitle, { color: g.text }]}>{title}</Text>
      <Text style={[styles.emptyDetail, { color: g.secondary }]}>{detail}</Text>
      <Pressable testID="fc-saved-find-packs" accessibilityRole="button" accessibilityLabel={action} onPress={onCommunity}
        style={({ pressed }) => [
          styles.emptyCta,
          { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -12, color: `${g.accent}B3` }] },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.emptyCtaText, { color: g.accentInk }]}>{action}</Text>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 24, boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.7)' }] }]} />
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  skeleton: { height: 118, borderRadius: 16, borderWidth: 1, padding: 18, justifyContent: 'center', gap: 9, overflow: 'hidden' },
  skeletonLine: { height: 11, borderRadius: 6 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 88, paddingHorizontal: 30 },
  icon: { width: 61, height: 61, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center', marginTop: 18 },
  detail: { fontSize: 16, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  action: { minHeight: 46, borderRadius: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  actionText: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.82 },
  emptyBlock: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 40 },
  emptyTile: { width: 61, height: 61, borderRadius: 16, backgroundColor: '#28282A', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center', marginTop: 22 },
  emptyDetail: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  emptyCta: { height: 48, borderRadius: 24, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  emptyCtaText: { fontSize: 17, fontWeight: '700' },
});

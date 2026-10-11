import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { KitEmpty } from '../../components/cards-grid/CardsKit';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';
import { useLoadGate } from '../use_load_gate';

type Props = {
  lang: Lang;
  loadError: boolean;
  searchActive: boolean;
  onCommunity: () => void;
  onRetry: () => unknown;
};

function noop(): void {
  // кнопки в состоянии поиска нет (hideAction)
}

export function SavedCollectionLoading({ lang }: { lang: Lang }) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const label = triLang(lang, {
    ru: 'Загрузка карточек', uk: 'Завантаження карток', en: 'Loading cards', es: 'Cargando tarjetas',
    'pt-BR': 'Carregando cartões', vi: 'Đang tải thẻ', id: 'Memuat kartu', tr: 'Kartlar yükleniyor', pl: 'Wczytywanie kart',
  });
  return <View testID="fc-saved-loading" accessibilityLabel={label} style={styles.loading}>
    {Array.from({ length: 4 }, (_, index) => <View key={index} style={[styles.skeleton, { boxShadow: plateBoxShadow(g) }]}>
      <PlateFill g={g} radius={16} />
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
  // зачем (Сверка cards-section offline, шаблон .empty): плитка 61 со значком «нет сети», «Сейчас недоступно» 24/30,
  // строка 16/22, кнопка «Попробовать снова» со значком обновления — тот же блок по центру экрана, что у «Пусто».
  const hint = triLang(lang, {
    ru: 'Проверь интернет', uk: 'Перевір інтернет', en: 'Check your connection', es: 'Revisa tu conexión',
    'pt-BR': 'Verifique a internet', vi: 'Kiểm tra kết nối mạng', id: 'Periksa koneksi internet', tr: 'İnternetini kontrol et', pl: 'Sprawdź internet',
  });
  return <KitEmpty g={g} testID="fc-saved-unavailable" icon="cloud-offline-outline" title={title} detail={hint} action={action} actionIcon="refresh" onAction={onRetry} actionTestID="fc-saved-try-again" />;
}

// зачем (владелец: «в приложении запрещены любые различия с макетом», cards-section кадр 7 «Пусто»): блок стоит
// по центру ЭКРАНА (top:50%, translateY(-46%) от высоты 217), а не под заголовком; плитка 61×61 r16 #28282A,
// «Пока пусто» 24/30, подпись 16/22, кнопка 48 высотой с мятным свечением. Поиск без результатов (кадр 38) — прежний вид.
function SavedCollectionEmpty({ lang, searchActive, onCommunity }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
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
    ru: 'Сохраняй слова в уроках', uk: 'Зберігай слова в уроках', en: 'Save words in lessons', es: 'Guarda palabras en las lecciones',
    'pt-BR': 'Salve palavras nas aulas', vi: 'Lưu từ trong bài học', id: 'Simpan kata di pelajaran',
    tr: 'Derslerde kelime kaydet', pl: 'Zapisuj słowa w lekcjach',
  });
  const action = triLang(lang, {
    ru: 'Найти наборы', uk: 'Знайти набори', en: 'Find packs', es: 'Buscar packs',
    'pt-BR': 'Encontrar pacotes', vi: 'Tìm bộ thẻ', id: 'Cari paket', tr: 'Paket bul', pl: 'Znajdź zestawy',
  });
  if (searchActive) {
    // зачем (шаблон .empty макета): поиск без результатов — плитка, 24/30 и 16/22 по центру экрана, как у «Пусто».
    return <KitEmpty g={g} testID="fc-saved-search-empty" icon="search-outline" title={title} detail={detail} action="" onAction={noop} hideAction />;
  }
  return <KitEmpty g={g} testID="fc-saved-empty" icon="bookmark" title={title} detail={detail} action={action} onAction={onCommunity} actionTestID="fc-saved-find-packs" />;
}

const baseStyles = StyleSheet.create({
  loading: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  // зачем (Тень 12.10): плашка-скелетон без кромки; overflow убран, иначе клип тени; gap между плашками loading — 10
  skeleton: { height: 118, borderRadius: 16, padding: 18, justifyContent: 'center', gap: 9 },
  skeletonLine: { height: 11, borderRadius: 6 },
});

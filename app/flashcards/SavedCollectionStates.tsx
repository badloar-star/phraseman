import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { KitEmpty } from '../../components/cards-grid/CardsKit';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';
import { useLoadGate } from '../use_load_gate';
import { logNoErrorScreen } from '../no_error_screen_log';

type Props = {
  lang: Lang;
  loadError: boolean;
  searchActive: boolean;
  onCommunity: () => void;
  onRetry: () => unknown;
  /** NetInfo: сети нет — «Сейчас недоступно» сразу после первой неудачи, автоповтор идёт фоном (cards-039, координатор 18.10). */
  deviceOffline?: boolean;
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

// зачем (владелец 01.10 + D158 / PM-214; правило владельца 18.10, координатор 08:00: «экранов-ошибок нигде»): экрана ошибки загрузки нет — при сбое скелетон той же геометрии и тихий повтор,
// но не бесконечный: общий useLoadGate (паузы 1/3/8 с, затем повтор при возврате в приложение). После исчерпания ИЛИ без сети (NetInfo) — не «Сейчас недоступно / Попробовать снова»,
// а то же спокойное пустое состояние, что у пустого списка (SavedCollectionEmpty): кнопки повтора нет, повтор идёт сам; когда карточки приедут — список подставится тихо.
// Счётчик живёт между монтированиями (persistAcrossMounts): экран размонтируется на время самой загрузки, и локальный счётчик сбрасывался бы каждый круг.
export function SavedCollectionState(props: Props) {
  const { loadError, onRetry } = props;
  // зачем (cards-039, Сверка 81d2dfe38, координатор 18.10 05:52): контракт useLoadGate — «retry() обязан перевести status в 'loading'»; `retrying` живёт на время повтора (любой исход его снимает) и отдаётся воротам как 'loading'.
  const [retrying, setRetrying] = useState(false);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);
  // зачем (Сайт, проверка 9be415d23): пока загрузка идёт, второй повтор не запускаем (иначе параллельные loadAll) — защита остаётся для повторов ворот и возврата в приложение.
  const retryingRef = useRef(false);
  const retry = useCallback(() => {
    if (retryingRef.current) {
      console.log('[CARDS-LOAD] retry → skipped in_flight'); // guard-ok: второй повтор при идущей загрузке
      return;
    }
    retryingRef.current = true;
    console.warn('[FC-SAVED] тихий повтор загрузки карточек');
    setRetrying(true);
    const settle = (outcome: string) => {
      console.log('[CARDS-LOAD] retry:settled', JSON.stringify({ outcome, stillMounted: aliveRef.current })); // guard-ok: итог одного повтора
      retryingRef.current = false;
      if (aliveRef.current) setRetrying(false);
    };
    try { Promise.resolve(onRetry()).then(() => settle('ok'), (e) => { console.warn('[FC-SAVED] повтор отклонён', e); settle('rejected'); }); }
    catch (e) { console.warn('[FC-SAVED] повтор упал', e); settle('threw'); }
  }, [onRetry]);
  const gateStatus = retrying ? 'loading' : loadError ? 'error' : 'ready';
  const gate = useLoadGate({ id: 'fc-saved', status: gateStatus, retry, persistAcrossMounts: true });
  // зачем (координатор 18.10 05:47 + правило владельца 18.10 08:00): без сети (NetInfo) — спокойное пустое состояние сразу после первой неудачи; автоповтор useLoadGate при этом продолжается.
  const quietEmpty = loadError && (gate.exhausted || !!props.deviceOffline);
  const drawn = quietEmpty ? 'empty' : loadError ? 'skeleton' : 'empty';
  const drawnKey = `${drawn}|${gateStatus}|${gate.exhausted}|${String(props.deviceOffline)}|${String(quietEmpty)}`;
  const drawnLoggedRef = useRef('');
  useEffect(() => {
    if (drawnLoggedRef.current === drawnKey) return;
    drawnLoggedRef.current = drawnKey;
    console.log('[CARDS-LOAD] state:render', JSON.stringify({ drawn, loadError, retrying, gateStatus, gateExhausted: gate.exhausted, deviceOffline: !!props.deviceOffline, quietEmpty })); // guard-ok: что рисует состояние и по каким флагам
    if (quietEmpty) logNoErrorScreen('flashcards_saved', gate.exhausted ? 'load_exhausted' : 'offline_first_fail', 'quiet_empty', { deviceOffline: !!props.deviceOffline });
  }, [drawn, drawnKey, gate.exhausted, gateStatus, loadError, props.deviceOffline, quietEmpty, retrying]);
  if (drawn === 'skeleton') return <SavedCollectionLoading lang={props.lang} />;
  return <SavedCollectionEmpty {...props} />;
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
    ru: 'Сохраняй слова из уроков', uk: 'Зберігай слова з уроків', en: 'Save words from lessons', es: 'Guarda palabras de las lecciones',
    'pt-BR': 'Salve palavras das aulas', vi: 'Lưu từ từ bài học', id: 'Simpan kata dari pelajaran',
    tr: 'Derslerden kelime kaydet', pl: 'Zapisuj słowa z lekcji',
  });
  const action = triLang(lang, {
    ru: 'Открыть каталог', uk: 'Відкрити каталог', en: 'Open the catalog', es: 'Abrir el catálogo',
    'pt-BR': 'Abrir o catálogo', vi: 'Mở danh mục', id: 'Buka katalog', tr: 'Kataloğu aç', pl: 'Otwórz katalog',
  });
  if (searchActive) {
    // зачем (шаблон .empty макета): поиск без результатов — плитка, 24/30 и 16/22 по центру экрана, как у «Пусто».
    return <KitEmpty g={g} testID="fc-saved-search-empty" icon="search-outline" title={title} detail={detail} action="" onAction={noop} hideAction />;
  }
  return <KitEmpty g={g} testID="fc-saved-empty" icon="bookmark-outline" title={title} detail={detail} action={action} onAction={onCommunity} actionTestID="fc-saved-find-packs" />;
}

const baseStyles = StyleSheet.create({
  loading: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  // зачем (Тень 12.10): плашка-скелетон без кромки; overflow убран, иначе клип тени; gap между плашками loading — 10
  skeleton: { height: 118, borderRadius: 16, padding: 18, justifyContent: 'center', gap: 9 },
  skeletonLine: { height: 11, borderRadius: 6 },
});

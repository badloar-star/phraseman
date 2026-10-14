/**
 * Экран настройки тренировки — макет docs/design/v2-app/cards-v2.html, блок «Тренировка» (кадры «Настройка», «Настройка — пусто», «Лимит Free»).
 *
 * зачем (владелец 12.10: «Карточки 2.0 все в работу», стиль «Тень»): кружок «назад» и пилюля остатка («24/30») сверху, плитка-значок 55 и
 * название режима 30/700 без подписи, раздел «Что повторяем» — наборы плитками в 2 колонки с круглой отметкой, «Сколько» (10 / 20 / Все),
 * режимный сегмент (Блиц — «Время», «Напиши» — «Показывать EN → RU / RU → EN») и «Начать» со значком ▶. Лимит Free — НЕ тупик, а обычная
 * настройка с пилюлей, где вместо «Начать» кнопка «Безлимит с Plus». Загрузка, выбор наборов, квота и запуск остаются в
 * flashcards_training_setup.tsx — здесь только вид.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLineScale, useScaledTextStyles } from '../../hooks/useLineScale';

import { KitCta, KitEmpty, KitSectionHead, KitSegment } from '../../components/cards-grid/CardsKit';
import KitTouchable from '../../components/KitTouchable';
import { useLv2Glass, type Lv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { BackButton, PanelDock } from '../../components/mistakes-panel/PanelKit';
import { nestedBoxShadow, PlateFill, plateBoxShadow, raisedBoxShadow, RAISED_LIFT } from '../../components/v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';
import { useTheme } from '../../components/ThemeContext';
import type { DeckSheetOption } from './DeckPickerSheet';
import type { FcDeckId } from './deck_selection';
import type { LanguageMenuEntry } from './fc_lang_filter';
import PackLanguagePicker from './PackLanguagePicker';
import type { PackLanguage } from './pack_languages';

export type SetupSizeOption = Readonly<{ id: string; label: string }>;

type Props = Readonly<{
  lang: Lang;
  title: string;
  /** Значок режима в плитке 55 слева от названия (макет `.tile.t55`). */
  modeIcon: keyof typeof Ionicons.glyphMap;
  /** «24/30»; null — пилюли нет (квота ещё читается). */
  limitLabel: string | null;
  /** Код языка наборов («EN») — чип в верхнем ряду справа; с наборами одного языка только показывает язык, с несколькими — кнопка фильтра (п.83); null — чипа нет. */
  languageLabel?: string | null;
  /** п.83: есть куда переключиться (наборы другого языка) — чип становится кнопкой с шевроном и меню; иначе остаётся чипом без стрелки. */
  languageSwitchable?: boolean;
  /** Пункты меню языка: код и число наборов (только языки с наборами). */
  languageEntries?: readonly LanguageMenuEntry[];
  /** Код выбранного языка наборов ('en'…) — отмечается в меню. */
  languageCode?: PackLanguage;
  onLanguageChange?: (code: PackLanguage) => void;
  /** Лимит месяца исчерпан: настройка остаётся обычной, а вместо «Начать» — «Безлимит с Plus» (макет «Лимит Free»). */
  limitReached: boolean;
  status: 'ready' | 'loading' | 'unavailable' | 'empty' | 'invalid';
  invalidText: string;
  decks: readonly DeckSheetOption[];
  /** «64 карточки» — подпись числа карточек набора на языке интерфейса. */
  countLabelFor: (count: number) => string;
  selectedIds: readonly FcDeckId[];
  onToggle: (deckId: FcDeckId) => void;
  /** Сколько карточек выбрано (с учётом повторов в разных наборах) — для озвучки кнопки «Начать». */
  selectedCardCount: number;
  sizeOptions: readonly SetupSizeOption[] | null;
  size: string;
  onSizeChange: (id: string) => void;
  /** Второй сегмент режима: блиц — «Время», «Напиши» — «Показывать»; null — нет. */
  extra: Readonly<{ title: string; options: readonly SetupSizeOption[]; value: string; onChange: (id: string) => void }> | null;
  /** Подпись внизу: «Начать». */
  startLabel: string;
  canStart: boolean;
  /** Пояснение, почему «Начать» недоступна (например, мало карточек для блица); null — нет. */
  hint: string | null;
  onStart: () => void;
  /** Тап по «Безлимит с Plus» при исчерпанном лимите — открыть окно покупки. */
  onUpgrade: () => void;
  onBack: () => void;
  onFindPacks: () => void;
  onRetry: () => void;
}>;

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', packs: 'Что повторяем', cards: 'Сколько', unlimited: 'Безлимит с Plus', empty: 'Нет карточек', emptyHint: 'Сохрани пару слов', find: 'Открыть каталог', unavailable: 'Сейчас недоступно', checkNet: 'Проверь интернет', retry: 'Попробовать снова', selectedOf: 'карточек выбрано', language: 'Язык тренировки' },
  uk: { back: 'Назад', packs: 'Що повторюємо', cards: 'Скільки', unlimited: 'Безліміт з Plus', empty: 'Немає карток', emptyHint: 'Збережи кілька слів', find: 'Відкрити каталог', unavailable: 'Зараз недоступно', checkNet: 'Перевір інтернет', retry: 'Спробувати ще', selectedOf: 'карток вибрано', language: 'Мова тренування' },
  en: { back: 'Back', packs: 'What to practise', cards: 'How many', unlimited: 'Unlimited with Plus', empty: 'No cards', emptyHint: 'Save a few words', find: 'Open the catalog', unavailable: 'Not available right now', checkNet: 'Check your connection', retry: 'Try again', selectedOf: 'cards selected', language: 'Practice language' },
  es: { back: 'Atrás', packs: 'Qué repasamos', cards: 'Cuántas', unlimited: 'Ilimitado con Plus', empty: 'Sin tarjetas', emptyHint: 'Guarda unas palabras', find: 'Abrir el catálogo', unavailable: 'No disponible ahora', checkNet: 'Comprueba tu conexión', retry: 'Intentar de nuevo', selectedOf: 'tarjetas elegidas', language: 'Idioma de práctica' },
  'pt-BR': { back: 'Voltar', packs: 'O que vamos revisar', cards: 'Quantos', unlimited: 'Ilimitado com Plus', empty: 'Sem cartões', emptyHint: 'Salve algumas palavras', find: 'Abrir o catálogo', unavailable: 'Indisponível agora', checkNet: 'Verifique sua conexão', retry: 'Tentar de novo', selectedOf: 'cartões selecionados', language: 'Idioma da prática' },
  vi: { back: 'Quay lại', packs: 'Ôn gì', cards: 'Bao nhiêu', unlimited: 'Không giới hạn với Plus', empty: 'Chưa có thẻ', emptyHint: 'Hãy lưu vài từ', find: 'Mở danh mục', unavailable: 'Hiện chưa khả dụng', checkNet: 'Kiểm tra kết nối', retry: 'Thử lại', selectedOf: 'thẻ đã chọn', language: 'Ngôn ngữ luyện tập' },
  id: { back: 'Kembali', packs: 'Apa yang diulang', cards: 'Berapa banyak', unlimited: 'Tanpa batas dengan Plus', empty: 'Tidak ada kartu', emptyHint: 'Simpan beberapa kata', find: 'Buka katalog', unavailable: 'Belum tersedia sekarang', checkNet: 'Periksa koneksi', retry: 'Coba lagi', selectedOf: 'kartu dipilih', language: 'Bahasa latihan' },
  tr: { back: 'Geri', packs: 'Neyi tekrarlıyoruz', cards: 'Kaç tane', unlimited: 'Plus ile sınırsız', empty: 'Kart yok', emptyHint: 'Birkaç kelime kaydet', find: 'Kataloğu aç', unavailable: 'Şu anda kullanılamıyor', checkNet: 'Bağlantını kontrol et', retry: 'Tekrar dene', selectedOf: 'kart seçildi', language: 'Pratik dili' },
  pl: { back: 'Wstecz', packs: 'Co powtarzamy', cards: 'Ile', unlimited: 'Bez limitu z Plus', empty: 'Brak kart', emptyHint: 'Zapisz kilka słów', find: 'Otwórz katalog', unavailable: 'Teraz niedostępne', checkNet: 'Sprawdź połączenie', retry: 'Spróbuj ponownie', selectedOf: 'kart wybrano', language: 'Język ćwiczeń' },
});

/** Плитка набора `.pk`: название 16/700, под ним число карточек, справа сверху круглая отметка; выбранная приподнята (стиль «Тень»). */
const DeckPickTile = memo(function DeckPickTile({ g, title, countLabel, on, disabled, testID, accessibilityLabel, onPress }: Readonly<{
  g: Lv2Glass;
  title: string;
  countLabel: string;
  on: boolean;
  disabled: boolean;
  testID: string;
  accessibilityLabel: string;
  onPress: () => void;
}>) {
  const lh = useLineScale();
  return (
    // зачем (Тень 12.10): сдвиг выбранной — на внешней обёртке, высота ряда не меняется
    <View style={[styles.tileOuter, on && { transform: [{ translateY: RAISED_LIFT }] }]}>
      <KitTouchable
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: on, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[styles.tile, { boxShadow: on ? raisedBoxShadow(g) : plateBoxShadow(g), opacity: disabled ? 0.45 : 1 }]}
      >
        <PlateFill g={g} radius={16} raised={on} />
        <Text style={[styles.tileTitle, { color: g.text, lineHeight: lh(22) }]}>{title}</Text>
        <Text style={[styles.tileCount, { color: g.secondary, lineHeight: lh(18) }]}>{countLabel}</Text>
        {/* индикатор выбора `.chk` 24: выбран — светлый круг с галочкой, нет — кольцо (состояние, не обводка контейнера) */}
        <View
          pointerEvents="none"
          style={[styles.chk, on ? { backgroundColor: g.cta } : { boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: `${g.text}4D` }] }]} // shadow-ok: кольцо индикатора выбора (радио), а не обводка контейнера
        >
          {on ? <Ionicons name="checkmark" size={16} color={g.ctaInk} /> : null}
        </View>
      </KitTouchable>
    </View>
  );
});

function TrainingSetupV2Inner(props: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом (при 1.0 тот же объект стилей — вид прежний)
  const styles2 = useScaledTextStyles(baseStyles);
  const { lang, title, modeIcon, limitLabel, languageLabel = null, languageSwitchable = false, languageEntries = [], languageCode = 'en', onLanguageChange, limitReached, status, invalidText, decks, countLabelFor, selectedIds, onToggle, selectedCardCount, sizeOptions, size, onSizeChange, extra, startLabel, canStart, hint, onStart, onUpgrade, onBack, onFindPacks, onRetry } = props;
  const g = useLv2Glass();
  const { theme } = useTheme();
  const lh = useLineScale();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const languageCounts = useMemo(() => Object.fromEntries(languageEntries.map((entry) => [entry.code, entry.count])) as Partial<Record<PackLanguage, number>>, [languageEntries]);
  const languageCodes = useMemo(() => languageEntries.map((entry) => entry.code as PackLanguage), [languageEntries]);
  const showList = status === 'ready' || status === 'loading';
  // зачем: плитки наборов собираются парами — обе плитки ряда одной высоты, если название одной переносится на 2 строки
  const deckRows = useMemo(() => {
    const out: DeckSheetOption[][] = [];
    for (let i = 0; i < decks.length; i += 2) out.push(decks.slice(i, i + 2) as DeckSheetOption[]);
    return out;
  }, [decks]);

  return (
    <View testID="fc-training-setup-v2" style={styles2.root}>
      <ScrollView contentContainerStyle={styles2.scroll} showsVerticalScrollIndicator={false} decelerationRate="fast">
        <View style={styles2.top}>
          <BackButton g={g} onPress={onBack} label={copy.back} />
          {/* зачем (владелец 12.10, cards-027; п.83 «кнопка языка фильтрует наборы»): справа в верхнем ряду — чип языка наборов рядом с пилюлей остатка.
              Наборы одного языка — чип только показывает язык (без стрелки); нескольких — кнопка фильтра с меню. Токены темы; длинный код не сжимается (шрифт не ужимаем) — чип растёт по тексту,
              а ряд при нехватке места переносится, не режет. */}
          {languageLabel || limitLabel ? (
            <View style={styles2.topRight}>
              {languageLabel && languageSwitchable && onLanguageChange ? (
                // зачем (владелец 12.10, п.83, cards-027): с наборами нескольких языков чип — кнопка фильтра; меню — общий PackLanguagePicker без «Без языка», в пунктах число наборов
                <PackLanguagePicker
                  lang={lang}
                  t={theme}
                  value={languageCode}
                  languages={languageCodes}
                  counts={languageCounts}
                  onChange={onLanguageChange}
                  renderTrigger={(open, visible) => (
                    <Pressable
                      testID="fc-training-setup-language-chip"
                      accessibilityRole="button"
                      accessibilityLabel={`${copy.language}: ${languageLabel}`}
                      accessibilityState={{ expanded: visible }}
                      onPress={open}
                      hitSlop={6}
                      style={({ pressed }) => [styles2.pill, { backgroundColor: visible ? g.selected : g.buttonFill, boxShadow: nestedBoxShadow(g), opacity: pressed ? 0.78 : 1 }]}
                    >
                      <Text style={[styles2.pillText, { color: g.text }]}>{languageLabel}</Text>
                      <Ionicons name="chevron-down" size={16} color={g.text} />
                    </Pressable>
                  )}
                />
              // зачем (вердикты Макетов 7c831a193, cards-076 / cards-section-034…036; координатор 13.10): в образце cards-v2 чипа языка нет. Наборы ОДНОГО языка — чип был только индикатором, убран;
              // с наборами нескольких языков он остаётся кнопкой фильтра (единственный способ сменить язык тренировки) — Макеты дорисуют.
              ) : null}
              {limitLabel ? (
                <View testID="fc-training-setup-monthly-limit" style={[styles2.pill, { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) }]}>
                  <Ionicons name="copy-outline" size={16} color={g.text} />
                  <Text style={[styles2.pillText, { color: g.text }]}>{limitLabel}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        {/* макет: `.tile.t55` + название режима 30/700 (без подписи) */}
        <View style={styles2.titleRow}>
          <View style={[styles2.modeTile, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
            <Ionicons name={modeIcon} size={26} color={g.text} />
          </View>
          <Text testID="fc-training-setup-header-title" accessibilityRole="header" style={[styles2.title, { color: g.text, lineHeight: lh(36) }]}>{title}</Text>
        </View>

        {/* зачем (R1 cards-v2-029): «Настройка — пусто» по макету — блок В ПОТОКЕ под заголовком режима (`.empty.sm`), а не по центру экрана: см. KitEmpty `inline` */}
        {status === 'empty' ? (
          <KitEmpty inline g={g} testID="fc-training-setup-empty" icon="albums-outline" title={copy.empty} detail={copy.emptyHint} action={copy.find} onAction={onFindPacks} actionTestID="fc-training-setup-find-packs" />
        ) : null}
        {showList ? (
          <>
            <KitSectionHead g={g} title={copy.packs} count={0} hideCount />
            {status === 'loading' ? (
              <View testID="fc-training-setup-loading" style={styles2.stack}>
                {[0, 1].map((i) => (
                  <View key={`sk${i}`} /* guard-ok: две статичные строки заглушек */ style={styles2.pickRow}>
                    <View style={[styles2.skeleton, { backgroundColor: g.dividerTone }]} />
                    <View style={[styles2.skeleton, { backgroundColor: g.dividerTone }]} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles2.stack}>
                {deckRows.map((pair) => (
                  <View key={pair[0].deckId} style={styles2.pickRow}>
                    {pair.map((deck) => (
                      <DeckPickTile
                        key={deck.deckId}
                        g={g}
                        title={deck.title}
                        countLabel={countLabelFor(deck.count)}
                        on={selectedIds.includes(deck.deckId)}
                        disabled={deck.count <= 0}
                        testID={`fc-training-setup-deck-${deck.deckId}`}
                        accessibilityLabel={`${deck.title}, ${deck.count}`}
                        onPress={() => onToggle(deck.deckId)}
                      />
                    ))}
                    {pair.length === 1 ? <View style={styles.tileOuter} /> : null}
                  </View>
                ))}
              </View>
            )}
            {status === 'ready' && sizeOptions ? (
              <>
                <KitSectionHead g={g} title={copy.cards} count={0} hideCount />
                <KitSegment g={g} options={sizeOptions} value={size} onChange={onSizeChange} testIDPrefix="fc-training-setup-size" />
              </>
            ) : null}
            {status === 'ready' && extra ? (
              <>
                <KitSectionHead g={g} title={extra.title} count={0} hideCount />
                <KitSegment g={g} options={extra.options} value={extra.value} onChange={extra.onChange} testIDPrefix="fc-training-setup-extra" />
              </>
            ) : null}
            {hint ? <Text accessibilityLiveRegion="polite" style={[styles2.hint, { color: g.secondary }]}>{hint}</Text> : null}
          </>
        ) : null}
      </ScrollView>

      {status === 'unavailable' ? (
        <KitEmpty g={g} testID="fc-training-setup-unavailable" icon="cloud-offline-outline" title={copy.unavailable} detail={copy.checkNet} action={copy.retry} actionIcon="refresh" onAction={onRetry} actionTestID="fc-training-setup-try-again" />
      ) : null}
      {status === 'invalid' ? (
        <KitEmpty g={g} testID="fc-training-setup-error" icon="alert-circle-outline" title={invalidText} detail="" action={copy.back} onAction={onBack} actionTestID="fc-training-setup-error-back" />
      ) : null}

      {showList ? (
        <PanelDock>
          <View style={styles2.dock}>
            <View>
              {limitReached ? (
                // зачем (решение координатора 12.10, макет «Лимит Free»): исчерпанный месячный лимит — не тупик; кнопка ведёт в покупку Plus
                <KitCta g={g} testID="fc-training-setup-upgrade" label={copy.unlimited} icon="lock-open-outline" onPress={onUpgrade} />
              ) : (
                <KitCta
                  g={g}
                  testID="fc-training-setup-start"
                  label={startLabel}
                  accessibilityLabel={selectedCardCount > 0 ? `${startLabel}, ${selectedCardCount} ${copy.selectedOf}` : startLabel}
                  icon="play"
                  disabled={!canStart}
                  onPress={() => { console.log('[FC-TRAIN-ENTRY] setup:press', JSON.stringify({ canStart, status })); onStart(); }}
                />
              )}
            </View>
          </View>
        </PanelDock>
      ) : null}
    </View>
  );
}

export const TrainingSetupV2 = memo(TrainingSetupV2Inner);

const styles = StyleSheet.create({
  tileOuter: { flex: 1, minWidth: 0 },
  // `.pk`: r16, поля 14/14/12, высота от 84
  tile: { flex: 1, borderRadius: 16, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12, minHeight: 84 },
  tileTitle: { fontSize: 16, fontWeight: '700', paddingRight: 30 },
  tileCount: { fontSize: 13, marginTop: 14, fontVariant: ['tabular-nums'] },
  chk: { position: 'absolute', right: 12, top: 12, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

const baseStyles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 150 },
  top: { minHeight: 44, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { minHeight: 30, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  topRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, flexShrink: 1 },
  pillText: { fontSize: 16, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // макет: `.flex gap 14, margin-top 14`; `.tile.t55` r14; название 30/700, межбуквенный −.4
  titleRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  modeTile: { width: 55, height: 55, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4 },
  stack: { gap: 10 }, // зачем (Тень 12.10): между плашками ≥ 10
  pickRow: { flexDirection: 'row', gap: 10 },
  skeleton: { flex: 1, minHeight: 84, borderRadius: 16 },
  hint: { marginTop: 14, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  dock: { paddingHorizontal: 20 },
});

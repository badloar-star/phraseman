/**
 * Экран настройки тренировки — макет docs/design/v2-app/cards-section.html (кадры «Блиц», «Устно», «Правда / ложь», «Вспомни и напиши»,
 * «Мало карточек», «Карточек нет», «Лимит исчерпан», «Нет сети»).
 *
 * зачем (владелец: «в приложении запрещены любые различия с макетом»): кружок «назад» и пилюля остатка «24/30» сверху, название режима 40/46 с короткой
 * подписью, раздел «Наборы» со счётчиком выбранных карточек, строки-карточки наборов с круглой отметкой, переключатель «Карточек 10 / 20 / Все»
 * (где режим его поддерживает) и мятная «Начать». Загрузка, выбор наборов, квота и запуск остаются в flashcards_training_setup.tsx — здесь только вид.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { KitCard, KitCheck, KitCta, KitEmpty, KitIconTile, KitSectionHead, KitSegment, KitTitle } from '../../components/cards-grid/CardsKit';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { BackButton, PanelDock } from '../../components/mistakes-panel/PanelKit';
import { triLang, type Lang } from '../../constants/i18n';
import type { DeckSheetOption } from './DeckPickerSheet';
import type { FcDeckId } from './deck_selection';

export type SetupSizeOption = Readonly<{ id: string; label: string }>;

type Props = Readonly<{
  lang: Lang;
  title: string;
  subtitle: string;
  /** «24/30»; null — пилюли нет (квота ещё читается). */
  limitLabel: string | null;
  status: 'ready' | 'loading' | 'unavailable' | 'empty' | 'exhausted' | 'invalid';
  /** Для «Лимит исчерпан»: «Обновится 1 ноября». */
  resetText: string;
  invalidText: string;
  decks: readonly DeckSheetOption[];
  /** «64 карточки» — подпись числа карточек набора на языке интерфейса. */
  countLabelFor: (count: number) => string;
  selectedIds: readonly FcDeckId[];
  onToggle: (deckId: FcDeckId) => void;
  /** Сколько карточек выбрано (с учётом повторов в разных наборах). */
  selectedCardCount: number;
  sizeOptions: readonly SetupSizeOption[] | null;
  size: string;
  onSizeChange: (id: string) => void;
  /** Подпись внизу: «Начать» или «Начать · 20». */
  startLabel: string;
  canStart: boolean;
  /** Пояснение, почему «Начать» недоступна (например, мало карточек для блица); null — нет. */
  hint: string | null;
  onStart: () => void;
  onBack: () => void;
  onFindPacks: () => void;
  onRetry: () => void;
}>;

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', packs: 'Наборы', selected: 'выбрано', cards: 'Карточек', addPack: 'Добавить набор', empty: 'Пока нет карточек', emptyHint: 'Добавьте набор и начните', find: 'Найти наборы', unavailable: 'Сейчас недоступно', checkNet: 'Проверьте интернет', retry: 'Попробовать снова', limit: 'Лимит на этот месяц исчерпан' },
  uk: { back: 'Назад', packs: 'Набори', selected: 'вибрано', cards: 'Карток', addPack: 'Додати набір', empty: 'Поки немає карток', emptyHint: 'Додайте набір і починайте', find: 'Знайти набори', unavailable: 'Зараз недоступно', checkNet: 'Перевірте інтернет', retry: 'Спробувати ще', limit: 'Ліміт на цей місяць вичерпано' },
  en: { back: 'Back', packs: 'Packs', selected: 'selected', cards: 'Cards', addPack: 'Add a pack', empty: 'No cards yet', emptyHint: 'Add a pack and get started', find: 'Find packs', unavailable: 'Not available right now', checkNet: 'Check your connection', retry: 'Try again', limit: 'This month\'s limit is used up' },
  es: { back: 'Atrás', packs: 'Packs', selected: 'seleccionadas', cards: 'Tarjetas', addPack: 'Añadir un pack', empty: 'Aún no hay tarjetas', emptyHint: 'Añade un pack y empieza', find: 'Buscar packs', unavailable: 'No disponible ahora', checkNet: 'Comprueba tu conexión', retry: 'Intentar de nuevo', limit: 'Límite de este mes agotado' },
  'pt-BR': { back: 'Voltar', packs: 'Pacotes', selected: 'selecionados', cards: 'Cartões', addPack: 'Adicionar pacote', empty: 'Ainda não há cartões', emptyHint: 'Adicione um pacote e comece', find: 'Encontrar pacotes', unavailable: 'Indisponível agora', checkNet: 'Verifique sua conexão', retry: 'Tentar de novo', limit: 'O limite deste mês acabou' },
  vi: { back: 'Quay lại', packs: 'Bộ thẻ', selected: 'đã chọn', cards: 'Thẻ', addPack: 'Thêm bộ thẻ', empty: 'Chưa có thẻ', emptyHint: 'Thêm bộ thẻ và bắt đầu', find: 'Tìm bộ thẻ', unavailable: 'Hiện chưa khả dụng', checkNet: 'Kiểm tra kết nối', retry: 'Thử lại', limit: 'Đã hết giới hạn tháng này' },
  id: { back: 'Kembali', packs: 'Paket', selected: 'dipilih', cards: 'Kartu', addPack: 'Tambah paket', empty: 'Belum ada kartu', emptyHint: 'Tambahkan paket lalu mulai', find: 'Cari paket', unavailable: 'Belum tersedia sekarang', checkNet: 'Periksa koneksi', retry: 'Coba lagi', limit: 'Batas bulan ini habis' },
  tr: { back: 'Geri', packs: 'Paketler', selected: 'seçildi', cards: 'Kart', addPack: 'Paket ekle', empty: 'Henüz kart yok', emptyHint: 'Bir paket ekle ve başla', find: 'Paket bul', unavailable: 'Şu anda kullanılamıyor', checkNet: 'Bağlantını kontrol et', retry: 'Tekrar dene', limit: 'Bu ayki limit doldu' },
  pl: { back: 'Wstecz', packs: 'Zestawy', selected: 'wybrano', cards: 'Kart', addPack: 'Dodaj zestaw', empty: 'Brak kart', emptyHint: 'Dodaj zestaw i zacznij', find: 'Znajdź zestawy', unavailable: 'Teraz niedostępne', checkNet: 'Sprawdź połączenie', retry: 'Spróbuj ponownie', limit: 'Limit na ten miesiąc wyczerpany' },
});

function TrainingSetupV2Inner(props: Props) {
  const { lang, title, subtitle, limitLabel, status, resetText, invalidText, decks, countLabelFor, selectedIds, onToggle, selectedCardCount, sizeOptions, size, onSizeChange, startLabel, canStart, hint, onStart, onBack, onFindPacks, onRetry } = props;
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const showList = status === 'ready' || status === 'loading';

  return (
    <View testID="fc-training-setup-v2" style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <BackButton g={g} onPress={onBack} label={copy.back} />
          {limitLabel ? (
            <View testID="fc-training-setup-monthly-limit" style={styles.pill}>
              <Ionicons name="copy-outline" size={16} color={g.text} />
              <Text style={[styles.pillText, { color: g.text }]}>{limitLabel}</Text>
            </View>
          ) : null}
        </View>
        <KitTitle g={g} title={title} subtitle={subtitle} testID="fc-training-setup-header-title" />

        {showList ? (
          <>
            <View style={styles.sectionRow}>
              <KitSectionHead g={g} title={copy.packs} count={status === 'ready' ? decks.length : 0} hideCount />
              {status === 'ready' ? <Text testID="fc-training-setup-summary" accessibilityLiveRegion="polite" style={[styles.selected, { color: g.secondary }]}>{`${selectedCardCount} ${copy.selected}`}</Text> : null}
            </View>
            {status === 'loading' ? (
              <View testID="fc-training-setup-loading" style={styles.stack}>
                {[0, 1, 2].map((i) => <View key={`sk${i}`} /* guard-ok: три статичные заглушки */ style={styles.skeleton} />)}
              </View>
            ) : (
              <View style={styles.stack}>
                {decks.map((deck) => {
                  const on = selectedIds.includes(deck.deckId);
                  return (
                    <KitCard
                      key={deck.deckId}
                      g={g}
                      testID={`fc-training-setup-deck-${deck.deckId}`}
                      accessibilityLabel={`${deck.title}, ${deck.count}`}
                      onPress={() => onToggle(deck.deckId)}
                      disabled={deck.count <= 0}
                      style={deck.count <= 0 ? styles.dim : undefined}
                    >
                      <View style={styles.row}>
                        <KitIconTile g={g} icon={deck.icon} />
                        <View style={styles.rowText}>
                          <Text style={[styles.rowTitle, { color: g.text }]}>{deck.title}</Text>
                          <Text style={[styles.rowSub, { color: g.secondary }]}>{countLabelFor(deck.count)}</Text>
                        </View>
                        <KitCheck on={on} />
                      </View>
                    </KitCard>
                  );
                })}
                <KitCard g={g} onPress={onFindPacks} testID="fc-training-setup-add-pack" accessibilityLabel={copy.addPack}>
                  <View style={styles.row}>
                    <KitIconTile g={g} icon="add" />
                    <Text style={[styles.rowTitle, styles.addTitle, { color: g.text }]}>{copy.addPack}</Text>
                    <Ionicons name="chevron-forward" size={20} color={g.secondary} />
                  </View>
                </KitCard>
              </View>
            )}
            {status === 'ready' && sizeOptions ? (
              <>
                <KitSectionHead g={g} title={copy.cards} count={0} hideCount />
                <KitSegment g={g} options={sizeOptions} value={size} onChange={onSizeChange} testIDPrefix="fc-training-setup-size" />
              </>
            ) : null}
            {hint ? <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: g.secondary }]}>{hint}</Text> : null}
          </>
        ) : null}
      </ScrollView>

      {status === 'empty' ? (
        <KitEmpty g={g} testID="fc-training-setup-empty" icon="albums-outline" title={copy.empty} detail={copy.emptyHint} action={copy.find} onAction={onFindPacks} actionTestID="fc-training-setup-find-packs" />
      ) : null}
      {status === 'unavailable' ? (
        <KitEmpty g={g} testID="fc-training-setup-unavailable" icon="cloud-offline-outline" title={copy.unavailable} detail={copy.checkNet} action={copy.retry} actionIcon="refresh" onAction={onRetry} actionTestID="fc-training-setup-try-again" />
      ) : null}
      {status === 'exhausted' ? (
        <KitEmpty g={g} testID="fc-training-setup-exhausted" icon="lock-closed-outline" title={copy.limit} detail={resetText} action="" onAction={onBack} hideAction />
      ) : null}
      {status === 'invalid' ? (
        <KitEmpty g={g} testID="fc-training-setup-error" icon="alert-circle-outline" title={invalidText} detail="" action="" onAction={onBack} hideAction />
      ) : null}

      {showList ? (
        <PanelDock>
          <View style={styles.dock}>
            <View style={canStart ? undefined : styles.dim}>
              <KitCta g={g} testID="fc-training-setup-start" label={startLabel} trailingIcon="arrow-forward" onPress={() => { if (canStart) onStart(); }} />
            </View>
          </View>
        </PanelDock>
      ) : null}
    </View>
  );
}

export const TrainingSetupV2 = memo(TrainingSetupV2Inner);

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 150 },
  top: { height: 44, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { height: 30, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.07)' },
  pillText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selected: { marginTop: 30, marginBottom: 14, fontSize: 14, lineHeight: 17 },
  stack: { gap: 9 },
  skeleton: { height: 65, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
  dim: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10, paddingLeft: 19, paddingRight: 16 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  addTitle: { flex: 1, fontWeight: '600' },
  rowSub: { fontSize: 15, lineHeight: 19 },
  hint: { marginTop: 14, fontSize: 14, lineHeight: 19, textAlign: 'center' },
  dock: { paddingHorizontal: 20 },
});

/**
 * Раскрытая карточка — нижняя шторка по макету docs/design/v2-app/cards-v2.html (кадры «Карточка открыта», «Карточка — оборот»; CSS `.flip`, `.acts`).
 *
 * зачем (Карточки 2.0, владелец 12.10; решение координатора: cards-v2 перекрывает CARDS_LOCKED): вместо карточки по центру с затемнением — шторка
 * снизу (общая PanelSheet: затемнение 260 мс, выезд 440 мс). В шторке — разворотная карточка 196 высотой r20 (тап переворачивает: 560 мс
 * cubic-bezier(.2,.8,.2,1), перспектива 1200) и ряд круглых действий 56: «Озвучить / Изменить / В набор / Удалить». Лицевая сторона — «EN», озвучка, слово 34/40,
 * значок «перевернуть»; оборот — перевод 30/36 и пример под ним. Точек «силы слова» на карточке больше нет (макет их не рисует).
 * «В набор» открывает в той же шторке список своих неопубликованных наборов и кладёт в выбранный эту карточку (localPackCardAdd), без серверных вызовов.
 * Сама карточка — общий FlipCard (его же использует превью «Новой карточки»); высота растёт по тексту, а не режет его.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { KitCta } from '../../components/cards-grid/CardsKit';
import { FlipCard } from '../../components/cards-grid/FlipCard';
import { useLineScale } from '../../components/cards-grid/useLineScale';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { SheetRow } from '../../components/mistakes-panel/PanelKit';
import { PanelSheet } from '../../components/mistakes-panel/PanelSheet';
import { nestedBoxShadow } from '../../components/v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';
import { addCardToLocalPack, loadPackPickerState } from '../community_packs/localPackCardAdd';
import type { LocalAuthorPack } from '../community_packs/localAuthorPacks';
import { actionToastTri, emitAppEvent } from '../events';
import type { CardItem } from './types';

export type ExpandedCardData = Readonly<{
  id: string;
  front: string;
  ipa?: string | null;
  back: string;
  /** Оставлено для совместимости с вызовами: на карточке точки «силы слова» больше не рисуются. */
  dots?: number;
  example?: string | null;
  exampleTr?: string | null;
}>;

type Props = Readonly<{
  card: ExpandedCardData | null;
  lang: Lang;
  /** Название набора (и автор у чужого) — оставлено для совместимости; в шторке макета подписи над карточкой нет. */
  overline?: string;
  /** own — «Озвучить / Изменить / В набор / Удалить»; foreign — «Озвучить» и «Сохранить»; none — без действий. */
  footer: 'own' | 'foreign' | 'none';
  saved: boolean;
  /** Показать «Удалить» (нельзя у карточек, которые нельзя удалить отсюда). */
  canDelete: boolean;
  canEdit: boolean;
  /** Показывать «Сохранить / Сохранено» (в самих «Сохранённых» карточка уже сохранена — плитки нет). */
  showSave?: boolean;
  /** Исходная карточка приложения — нужна для «В набор». Нет — плитки «В набор» нет. */
  sourceCard?: CardItem | null;
  /** «Создать набор», когда своих неопубликованных наборов ещё нет. */
  onCreatePack?: () => void;
  onClose: () => void;
  onSpeak: (text: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSave: () => void;
}>;

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { edit: 'Изменить', saved: 'Сохранено', save: 'Сохранить', del: 'Удалить', speak: 'Озвучить', close: 'Закрыть', toPack: 'В набор', pickPack: 'В какой набор?', noPacks: 'Своих наборов пока нет', createPack: 'Создать набор', flip: 'Перевернуть карточку' },
  uk: { edit: 'Змінити', saved: 'Збережено', save: 'Зберегти', del: 'Видалити', speak: 'Озвучити', close: 'Закрити', toPack: 'До набору', pickPack: 'До якого набору?', noPacks: 'Власних наборів поки немає', createPack: 'Створити набір', flip: 'Перевернути картку' },
  en: { edit: 'Edit', saved: 'Saved', save: 'Save', del: 'Delete', speak: 'Listen', close: 'Close', toPack: 'To a pack', pickPack: 'Which pack?', noPacks: 'You have no packs yet', createPack: 'Create a pack', flip: 'Flip the card' },
  es: { edit: 'Editar', saved: 'Guardada', save: 'Guardar', del: 'Eliminar', speak: 'Escuchar', close: 'Cerrar', toPack: 'A un set', pickPack: '¿A qué set?', noPacks: 'Aún no tienes sets', createPack: 'Crear un set', flip: 'Girar la tarjeta' },
  'pt-BR': { edit: 'Editar', saved: 'Salvo', save: 'Salvar', del: 'Excluir', speak: 'Ouvir', close: 'Fechar', toPack: 'Para um conjunto', pickPack: 'Para qual conjunto?', noPacks: 'Você ainda não tem conjuntos', createPack: 'Criar um conjunto', flip: 'Virar o cartão' },
  vi: { edit: 'Sửa', saved: 'Đã lưu', save: 'Lưu', del: 'Xóa', speak: 'Nghe', close: 'Đóng', toPack: 'Vào bộ thẻ', pickPack: 'Vào bộ thẻ nào?', noPacks: 'Bạn chưa có bộ thẻ nào', createPack: 'Tạo bộ thẻ', flip: 'Lật thẻ' },
  id: { edit: 'Ubah', saved: 'Tersimpan', save: 'Simpan', del: 'Hapus', speak: 'Dengarkan', close: 'Tutup', toPack: 'Ke set', pickPack: 'Ke set mana?', noPacks: 'Belum ada set', createPack: 'Buat set', flip: 'Balik kartu' },
  tr: { edit: 'Düzenle', saved: 'Kaydedildi', save: 'Kaydet', del: 'Sil', speak: 'Dinle', close: 'Kapat', toPack: 'Sete ekle', pickPack: 'Hangi sete?', noPacks: 'Henüz setin yok', createPack: 'Paket oluştur', flip: 'Kartı çevir' },
  pl: { edit: 'Edytuj', saved: 'Zapisano', save: 'Zapisz', del: 'Usuń', speak: 'Posłuchaj', close: 'Zamknij', toPack: 'Do zestawu', pickPack: 'Do którego zestawu?', noPacks: 'Nie masz jeszcze zestawów', createPack: 'Utwórz zestaw', flip: 'Obróć kartę' },
});

const toastCopy = {
  added: { ru: 'Добавлено в набор', uk: 'Додано до набору', en: 'Added to the pack', es: 'Añadida al set', 'pt-BR': 'Adicionado ao pacote', vi: 'Đã thêm vào bộ thẻ', id: 'Ditambahkan ke paket', tr: 'Sete eklendi', pl: 'Dodano do zestawu' },
  duplicate: { ru: 'Эта карточка уже в наборе', uk: 'Ця картка вже в наборі', en: 'The card is already in this pack', es: 'La tarjeta ya está en el set', 'pt-BR': 'O cartão já está no pacote', vi: 'Thẻ đã có trong bộ thẻ', id: 'Kartu sudah ada di paket', tr: 'Kart zaten sette', pl: 'Karta jest już w zestawie' },
  failed: { ru: 'Не удалось добавить карточку', uk: 'Не вдалося додати картку', en: 'Couldn’t add the card', es: 'No se pudo añadir la tarjeta', 'pt-BR': 'Não foi possível adicionar o cartão', vi: 'Không thể thêm thẻ', id: 'Kartu tidak dapat ditambahkan', tr: 'Kart eklenemedi', pl: 'Nie udało się dodać karty' },
} as const;

const TAG = '[CARD-SHEET]';

type ActionDef = Readonly<{ key: string; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; testID: string; danger?: boolean }>;

function ExpandedCardInner({ card, lang, footer, saved, canDelete, canEdit, showSave = true, sourceCard, onCreatePack, onClose, onSpeak, onEdit, onDelete, onToggleSave }: Props) {
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const onlyPublishedText = triLang(lang, {
    ru: 'Нет наборов, куда можно добавить', uk: 'Немає наборів, куди можна додати', en: 'No packs to add to', es: 'No hay sets a los que añadir',
    'pt-BR': 'Não há pacotes para adicionar', vi: 'Không có bộ thẻ nào để thêm vào', id: 'Tidak ada paket untuk ditambah', tr: 'Eklenebilecek paket yok', pl: 'Brak zestawów, do których można dodać',
  });
  const lh = useLineScale();
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<'card' | 'packs'>('card');
  const [packs, setPacks] = useState<readonly LocalAuthorPack[] | null>(null);
  // зачем (решение координатора 12.10): есть только опубликованные наборы — добавлять некуда, но «Своих наборов нет» было бы неправдой
  const [onlyPublished, setOnlyPublished] = useState(false);
  const [adding, setAdding] = useState(false);
  // зачем (аудит Optimistic UI Карточек, 12.10): `adding` — состояние, второй тап в том же кадре видел его «ещё свободным»; синхронный замок — ref
  const addingRef = useRef(false);
  const cardId = card?.id ?? null;

  // зачем: при открытии новой карточки — лицевая сторона и режим «карточка»
  useEffect(() => {
    setFlipped(false);
    setMode('card');
    setPacks(null);
    setAdding(false);
    addingRef.current = false;
  }, [cardId]);

  const toggleFlip = useCallback(() => {
    setFlipped((prev) => {
      console.log(`${TAG} разворот → ${!prev ? 'оборот' : 'лицо'} cardId=${cardId}`);
      return !prev;
    });
  }, [cardId]);

  const openPacks = useCallback(() => {
    if (!sourceCard) { console.warn(`${TAG} «В набор»: исходной карточки нет cardId=${cardId}`); return; }
    setMode('packs');
    void loadPackPickerState().then((state) => {
      setOnlyPublished(state.addable.length === 0 && state.publishedCount > 0);
      setPacks(state.addable);
    }).catch((error: unknown) => {
      console.warn(`${TAG} «В набор»: не удалось прочитать наборы: ${error instanceof Error ? error.message : String(error)}`);
      setPacks([]);
    });
  }, [cardId, sourceCard]);

  const addTo = useCallback((packId: string) => {
    if (!sourceCard || adding) return;
    if (addingRef.current) {
      console.log(`[OPT-UI] card_to_pack ignored reason=double_tap packId=${packId}`); // guard-ok: ранний выход пишет причину
      return;
    }
    addingRef.current = true;
    setAdding(true);
    void addCardToLocalPack(packId, sourceCard).then((result) => {
      console.log(`${TAG} «В набор»: результат=${result} packId=${packId}`);
      if (result === 'added') {
        emitAppEvent('action_toast', actionToastTri('success', toastCopy.added));
        onClose();
      } else if (result === 'duplicate') {
        emitAppEvent('action_toast', actionToastTri('info', toastCopy.duplicate));
        addingRef.current = false;
        setAdding(false);
      } else {
        emitAppEvent('action_toast', actionToastTri('error', toastCopy.failed));
        addingRef.current = false;
        setAdding(false);
      }
    }).catch((error: unknown) => {
      // зачем (аудит Optimistic UI 12.10): отказ записи без catch оставлял кнопку «занятой» навсегда и не говорил человеку, что карточка не добавилась
      console.warn(`${TAG} «В набор»: запись упала packId=${packId}: ${error instanceof Error ? error.message : String(error)}`);
      emitAppEvent('action_toast', actionToastTri('error', toastCopy.failed));
      addingRef.current = false;
      setAdding(false);
    });
  }, [adding, onClose, sourceCard]);

  if (!card) return null;

  const backTag = lang.slice(0, 2).toUpperCase();
  const actions: ActionDef[] = [
    { key: 'speak', icon: 'volume-high-outline', label: copy.speak, onPress: () => onSpeak(card.front), testID: 'fc-expanded-speak' },
  ];
  if (footer === 'own') {
    if (canEdit) actions.push({ key: 'edit', icon: 'create-outline', label: copy.edit, onPress: onEdit, testID: 'fc-expanded-edit' });
    if (sourceCard) actions.push({ key: 'pack', icon: 'albums-outline', label: copy.toPack, onPress: openPacks, testID: 'fc-expanded-to-pack' });
    if (showSave) actions.push({ key: 'save', icon: saved ? 'bookmark' : 'bookmark-outline', label: saved ? copy.saved : copy.save, onPress: onToggleSave, testID: 'fc-expanded-save' });
    if (canDelete) actions.push({ key: 'del', icon: 'trash-outline', label: copy.del, onPress: onDelete, testID: 'fc-expanded-delete', danger: true });
  } else if (footer === 'foreign') {
    if (sourceCard) actions.push({ key: 'pack', icon: 'albums-outline', label: copy.toPack, onPress: openPacks, testID: 'fc-expanded-to-pack' });
  }

  return (
    <PanelSheet visible onClose={onClose} testID="fc-expanded-card">
      {mode === 'card' ? (
        <View>
          <FlipCard
            g={g}
            testID="fc-expanded-card-flip"
            front={card.front}
            ipa={card.ipa}
            back={card.back}
            example={card.example}
            exampleTr={card.exampleTr}
            backTag={backTag}
            flipped={flipped}
            onFlip={toggleFlip}
            onSpeak={() => onSpeak(card.front)}
            speakLabel={copy.speak}
            flipLabel={copy.flip}
          />
          <View style={styles.acts}>
            {actions.map((action) => (
              <Pressable key={action.key} testID={action.testID} accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} style={({ pressed }) => [styles.act, pressed && styles.pressed]}>
                <View style={[styles.actCircle, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
                  <Ionicons name={action.icon} size={22} color={action.danger ? g.bad : g.text} />
                </View>
                <Text style={[styles.actLabel, { color: g.secondary, lineHeight: lh(17) }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
          {footer === 'foreign' && showSave ? (
            <View style={styles.foot}>
              <KitCta g={g} label={saved ? copy.saved : copy.save} icon={saved ? 'bookmark' : 'bookmark-outline'} onPress={onToggleSave} testID="fc-expanded-save" />
            </View>
          ) : null}
        </View>
      ) : (
        <View testID="fc-expanded-pack-picker">
          <Text accessibilityRole="header" style={[styles.pickTitle, { color: g.text, lineHeight: lh(26) }]}>{copy.pickPack}</Text>
          {/* зачем (аудит cards-gaps-states): пока список читается — заглушки строк (высота шторки не прыгает); много наборов — список прокручивается */}
          {packs === null ? (
            <View testID="fc-expanded-pack-picker-loading">
              {[0, 1, 2].map((n) => <View key={n} style={[styles.pickSkeleton, { backgroundColor: g.opaqueControl }]} />)}
            </View>
          ) : packs.length === 0 ? (
            <View>
              <Text style={[styles.empty, { color: g.secondary, lineHeight: lh(22) }]}>{onlyPublished ? onlyPublishedText : copy.noPacks}</Text>
              {onCreatePack ? <SheetRow g={g} testID="fc-expanded-create-pack" icon="add" title={copy.createPack} onPress={onCreatePack} /> : null}
            </View>
          ) : (
            <ScrollView style={styles.pickList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" decelerationRate="fast">
              {packs.map((pack) => (
                <SheetRow key={pack.id} g={g} testID={`fc-expanded-pack-${pack.id}`} icon="albums-outline" title={pack.title} onPress={() => addTo(pack.id)} />
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </PanelSheet>
  );
}

export const ExpandedCardV2 = memo(ExpandedCardInner);

const styles = StyleSheet.create({
  pickList: { maxHeight: 360 },
  pickSkeleton: { height: 62, borderRadius: 16, marginTop: 10 },
  acts: { marginTop: 22, flexDirection: 'row', gap: 8 },
  act: { flex: 1, alignItems: 'center', gap: 8 },
  actCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.82 },
  foot: { marginTop: 18 },
  pickTitle: { fontSize: 22, fontWeight: '700', paddingHorizontal: 6, paddingBottom: 6 },
  empty: { fontSize: 16, paddingHorizontal: 6, paddingVertical: 12 },
});

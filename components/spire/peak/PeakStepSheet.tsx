// Лист этажа Пика (макет peak-floor-sheet-2026-11-11, владелец 11.11): «Этаж N», ступени, плашка рекорда (монета владельца, имя, время),
// сетка «Сейчас на этаже» — монеты рангов всех, кто на этаже, с именами.
// зачем (владелец 11.11: «оно не должно показывать там этажи — этаж выбираем на башне, а не в модал листе»): стрелок смены этажа в листе нет,
// лист открывается на этаже, по которому тапнули на башне. Компонент чисто презентационный — данные приходят пропсами (0 новых чтений).
import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../useSpirePalette';
import { spireGameText } from '../spire_game_strings';
import SpireRankCoin from '../SpireRankCoin';
import type { SpireRival } from '../spire_tower_model';
import { recordCopy } from '../spire_record_copy';
import { spireText } from '../spire_strings';
import { formatPeakTime, type PeakStepRecord } from '../../../modules/spire/peak_model';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { KIT_MOTION } from '../../../constants/motionHybrid';

export type PeakSheetRecord = PeakStepRecord & Readonly<{ coinRank?: number | null }>;

type Props = Readonly<{
  lang: Lang;
  visible: boolean;
  /** «Этаж 7». */
  title: string;
  /** Выбранная ступень — для подписи «Рекорд ступени N». */
  step?: number;
  record: PeakSheetRecord | null;
  recordStatus?: 'loading' | 'unavailable' | 'ready';
  /** Кто сейчас на этаже; null — комната ещё читается; undefined — блок не показываем. */
  occupants?: readonly SpireRival[] | null;
  /** uid текущего пользователя: его монета стоит первой, с кольцом и подписью «Ты». */
  meUid?: string | null;
  onClose: () => void;
  /** Ряд ступеней (PeakStepChips). */
  stepper?: React.ReactNode;
}>;

export const PEAK_SHEET_OCCUPANT_COIN = 52;
const OCCUPANT_COLUMNS = 5;

function PeakStepSheet({ lang, visible, title, step, record, recordStatus = 'ready', occupants, meUid, onClose, stepper }: Props) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const time = record ? formatPeakTime(record.durationMs) : null;
  const hasRecord = recordStatus === 'ready' && record !== null && time !== null;
  // зачем (макет): своя монета первая, остальные — порядком комнаты; сортируем копию, пропс не трогаем
  const people = occupants ? [...occupants].sort((a, b) => Number(b.uid === meUid) - Number(a.uid === meUid)) : occupants;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel={spireText(lang, 'back')} />
      <View style={[s.sheet, { backgroundColor: p.card, paddingBottom: insets.bottom + 24 }]} testID="peak-step-sheet">
        <View style={[s.handle, { backgroundColor: p.textMuted }]} />
        <ScrollView style={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{title}</Text>
          {stepper ? <View style={s.stepper}>{stepper}</View> : null}
          <View style={[s.rec, { backgroundColor: p.cardRaised }]} testID="peak-step-record">
            {hasRecord && record ? <SpireRankCoin rank={record.coinRank ?? null} size={48} plus={false} /> : null}
            <View style={s.recWho}>
              {hasRecord && record ? (
                <>
                  <View style={s.recLabel}>
                    <Ionicons name="trophy-outline" size={18} color={p.accentTextSafe} />
                    <Text numberOfLines={1} style={[s.recLabelText, { color: p.accentTextSafe }]}>{spireGameText(lang, 'peakStepRecordN', { n: step ?? 1 })}</Text>
                  </View>
                  <Text numberOfLines={2} style={[s.recName, { color: p.text }]}>{record.name?.trim() || '—'}</Text>
                </>
              ) : (
                <Text style={[s.recName, { color: p.text }]}>
                  {recordStatus === 'loading' ? recordCopy(lang, 'loading') : recordStatus === 'unavailable' ? recordCopy(lang, 'unavailable') : spireGameText(lang, 'peakNoRecord')}
                </Text>
              )}
            </View>
            <Text style={[s.recTime, { color: hasRecord ? p.accentTextSafe : p.textMuted }]}>{hasRecord ? time : '—'}</Text>
          </View>
          {people !== undefined ? (
            <View style={s.occupants} testID="peak-floor-occupants">
              <View style={s.occHead}>
                <Text accessibilityRole="header" style={[s.occTitle, { color: p.text }]}>{spireGameText(lang, 'peakFloorOccupants')}</Text>
                {people && people.length > 0 ? <Text style={[s.occCount, { color: p.textSecondary }]}>{people.length}</Text> : null}
              </View>
              {people === null || people.length === 0 ? (
                <Text style={[s.occEmpty, { color: p.textSecondary }]}>
                  {people === null ? recordCopy(lang, 'loading') : spireGameText(lang, 'peakFloorEmpty')}
                </Text>
              ) : (
                <View style={s.grid}>
                  {people.map((member) => {
                    const isMe = member.uid === meUid;
                    return (
                      <View key={member.uid} style={s.cell} accessible accessibilityLabel={isMe ? spireText(lang, 'you') : member.name}>
                        <View style={[s.coinWrap, isMe ? { backgroundColor: p.accentGraphic } : null]}>
                          <SpireRankCoin rank={member.coinRank} size={PEAK_SHEET_OCCUPANT_COIN} plus={false} />
                        </View>
                        <Text numberOfLines={1} style={[s.cellName, { color: isMe ? p.text : p.textSecondary }]}>{isMe ? spireText(lang, 'you') : member.name}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // зачем (аудит 05.11): затемнение — токен кита, как у KitSheetModal, а не литерал цвета
  scrim: { flex: 1, backgroundColor: `rgba(0,0,0,${KIT_MOTION.dimOpacity})` },
  sheet: { maxHeight: '85%', paddingHorizontal: 16, paddingTop: 10, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14, opacity: 0.5 },
  content: { flexGrow: 0, flexShrink: 1 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  stepper: { marginTop: 14 },
  rec: { marginTop: 14, borderRadius: 20, padding: 16, minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 14 },
  recWho: { flex: 1, minWidth: 0, gap: 2 },
  recLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recLabelText: { flexShrink: 1, fontSize: 15, lineHeight: 19, fontWeight: '700' },
  recName: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  recTime: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  occupants: { marginTop: 22 },
  occHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  occTitle: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  occCount: { fontSize: 17, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  occEmpty: { fontSize: 16, lineHeight: 21, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 14 },
  cell: { width: `${100 / OCCUPANT_COLUMNS}%`, alignItems: 'center', gap: 6, paddingHorizontal: 3 },
  // зачем (макет): своя монета — кольцом цвета темы (подложка на 3 dp шире), без обводки-рамки
  coinWrap: { padding: 3, borderRadius: PEAK_SHEET_OCCUPANT_COIN / 2 + 3 },
  cellName: { fontSize: 14, lineHeight: 17, fontWeight: '600', maxWidth: '100%' },
});

export default memo(PeakStepSheet);

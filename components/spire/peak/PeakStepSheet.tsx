// PeakStepSheet — шторка «рекорд ступени» по адресу этаж:ступень. Нет данных → «—» (никаких «нужны данные» в приложении).
// зачем (координатор 04.11): общий слой для A/B; время мм:сс.сс — formatPeakTime, запись — peakStepRecord (модель Пика).
import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../useSpirePalette';
import { spireGameText } from '../spire_game_strings';
import { spireText } from '../spire_strings';
import V2Pressable from '../../v2/V2Pressable';
import type { PeakStepRecord } from '../../../modules/spire/peak_model';
import { peakRecordLine } from './peak_text';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';

type Props = Readonly<{ lang: Lang; visible: boolean; title: string; record: PeakStepRecord | null; onClose: () => void; stepper?: React.ReactNode }>;

function PeakStepSheet({ lang, visible, title, record, onClose, stepper }: Props) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel={spireText(lang, 'back')} />
      <View style={[s.sheet, { backgroundColor: p.card, paddingBottom: insets.bottom + 20 }]} testID="peak-step-sheet">
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireGameText(lang, 'peakStepRecord')}</Text>
        <Text style={[s.sub, { color: p.textSecondary }]}>{title}</Text>
        {stepper ? <View style={s.stepper}>{stepper}</View> : null}
        <Text style={[s.line, { color: p.text }]} testID="peak-step-record">{peakRecordLine(lang, record)}</Text>
        <V2Pressable accessibilityRole="button" onPress={onClose} style={[s.close, { backgroundColor: p.cta }]} testID="peak-step-close">
          <Text style={[s.closeText, { color: p.ctaText }]}>{spireGameText(lang, 'close')}</Text>
        </V2Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { paddingHorizontal: 20, paddingTop: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  sub: { fontSize: 15, lineHeight: 20, marginTop: 2 },
  stepper: { marginTop: 16, alignItems: 'center' },
  line: { fontSize: 24, lineHeight: 30, fontWeight: '800', marginTop: 18, fontVariant: ['tabular-nums'] },
  close: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  closeText: { fontSize: 17, fontWeight: '700' },
});

export default memo(PeakStepSheet);

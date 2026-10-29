/**
 * ReferralLadderHowSheet — лист «Как это работает» для «Лесенки приглашений» (макет v3 QTcHjbVMPK64SWmobt1Vig, владелец 29.10).
 *
 * зачем: четыре строки правил (срок урока, что считается, монеты за друга, Plus за троих) и кнопка «Понятно». Тот же каркас шторки, что у прежнего листа
 * рулетки (ReferralSheetShell): жесты, выезд и закрытие не переписываются. Числа берутся из модели (с сервера), не зашиты в текст.
 */
import React, { memo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import KitTouchable from './KitTouchable';
import ReferralSheetShell from './referral_sheet_shell';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import type { Lang } from '../constants/i18n';
import type { ReferralLadderView } from '../app/referral_ladder_model';
import { referralLadderText } from './referral_ladder_strings';

type Props = Readonly<{ visible: boolean; onClose: () => void; view: ReferralLadderView }>;

const ROWS = [
  { key: 'how1', icon: 'time-outline' },
  { key: 'how2', icon: 'school-outline' },
  { key: 'how3', icon: 'gift-outline' },
  { key: 'how4', icon: 'diamond-outline' },
] as const;

function ReferralLadderHowSheet({ visible, onClose, view }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const L = lang as Lang;
  const vars = { coins: view.coinsPerFriend, days: view.lessonWindowDays };
  return (
    <ReferralSheetShell
      visible={visible}
      onClose={onClose}
      testID="referral-ladder-how-sheet"
      title={referralLadderText(L, 'sheetTitle')}
      closeLabel={referralLadderText(L, 'gotIt')}
    >
      <View style={{ marginTop: 4, gap: 10 }}>
        {ROWS.map((row) => (
          <View key={row.key} testID={`referral-ladder-${row.key}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: glass.opaqueControl }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueCard }}>
              <Ionicons name={row.icon} size={17} color={glass.accent} />
            </View>
            <Text style={{ flex: 1, minWidth: 0, color: glass.text, fontSize: 15, lineHeight: 20, fontWeight: '700' }}>
              {/* how1 — окно урока (дней), how3 — монеты, how4 — Plus (дней за тройку): у каждой строки свои числа */}
              {referralLadderText(L, row.key, row.key === 'how1' ? { days: vars.days } : row.key === 'how3' ? { coins: vars.coins } : { days: view.plusDays })}
            </Text>
          </View>
        ))}
        <KitTouchable
          testID="referral-ladder-how-ok"
          accessibilityRole="button"
          activeOpacity={0.84}
          onPress={onClose}
          style={{ marginTop: 4, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.cta }}
        >
          <Text style={{ color: glass.ctaInk, fontSize: 16, fontWeight: '700' }}>{referralLadderText(L, 'gotIt')}</Text>
        </KitTouchable>
      </View>
    </ReferralSheetShell>
  );
}

export default memo(ReferralLadderHowSheet);

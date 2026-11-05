/**
 * ReferralLadderHowSheet — лист «Как это работает» для «Лесенки приглашений» (макет v3 QTcHjbVMPK64SWmobt1Vig, владелец 29.10).
 *
 * зачем: пять строк правил отдельно объясняют монеты и более строгий Plus (два дня, устройство, cooldown), затем кнопка «Понятно». Тот же каркас шторки, что у прежнего листа
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

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  /** Вкладка «Друзья» передаёт существующий вход в поиск/ввод кода; на отдельном экране CTA не рисуется. */
  onEnterFriendCode?: () => void;
  view: ReferralLadderView;
}>;

const ROWS = [
  { key: 'how1', icon: 'time-outline' },
  { key: 'how2', icon: 'gift-outline' },
  { key: 'how3', icon: 'school-outline' },
  { key: 'how4', icon: 'phone-portrait-outline' },
  { key: 'how5', icon: 'diamond-outline' },
] as const;

function ReferralLadderHowSheet({ visible, onClose, onEnterFriendCode, view }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const L = lang as Lang;
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
              <Ionicons name={row.icon} size={17} color={glass.accentTextSafe} />
            </View>
            <Text style={{ flex: 1, minWidth: 0, color: glass.text, fontSize: 15, lineHeight: 20, fontWeight: '700' }}>
              {/* how1 — окно приглашения; how2 — монеты; how5 — срок Plus. У остальных строк нет числовых плейсхолдеров. */}
              {referralLadderText(L, row.key, row.key === 'how1'
                ? { days: view.lessonWindowDays }
                : row.key === 'how2'
                  ? { coins: view.coinsPerFriend }
                  : row.key === 'how5'
                    ? { days: view.plusDays }
                    : {})}
            </Text>
          </View>
        ))}
        {onEnterFriendCode ? (
          <KitTouchable
            testID="referral-ladder-enter-friend-code"
            accessibilityRole="button"
            activeOpacity={0.84}
            onPress={onEnterFriendCode}
            style={{ marginTop: 4, minHeight: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: glass.opaqueControl }}
          >
            <Ionicons accessible={false} name="person-add-outline" size={19} color={glass.text} />
            <Text style={{ color: glass.text, fontSize: 16, fontWeight: '700' }}>{referralLadderText(L, 'enterFriendCode')}</Text>
          </KitTouchable>
        ) : null}
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

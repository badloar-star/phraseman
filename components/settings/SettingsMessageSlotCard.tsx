import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { type Lang } from '../../constants/i18n';
import {
  pickAppMessageText,
  type AppMessageWithState,
} from '../../app/app_messages';
import { trackEvent } from '../../app/analytics';
import { SETTINGS_GROUP_MARGIN } from './SettingsGroup';
import { nestedBoxShadow, plateBoxShadow, useShadowGlass } from '../v2/ShadowSurface';

type Props = {
  campaign: AppMessageWithState;
  lang: Lang;
  marginTop?: number;
};

export function SettingsMessageSlotCard({ campaign, lang, marginTop = 12 }: Props) {
  const { theme: t, f } = useTheme();
  const g = useShadowGlass();
  const copy = useMemo(() => pickAppMessageText(campaign, lang), [campaign, lang]);

  useEffect(() => {
    void trackEvent('settings_message_impression', {
      campaign_id: campaign.id,
      slot: campaign.settingsSlot,
      kind: campaign.kind,
    });
  }, [campaign.id, campaign.kind, campaign.settingsSlot]);

  return (
    <View
      testID={`settings-message-slot-${campaign.settingsSlot}`}
      accessibilityLabel={copy.title}
      style={[
        styles.card,
        {
          marginTop,
          // зачем (стиль «Тень», владелец 12.10): карточка сообщения — плашка с тенью (раньше отделялась только тоном bgCard)
          backgroundColor: g.plateFillFrom,
          boxShadow: plateBoxShadow(g),
        },
      ]}
    >
      <View style={styles.headingRow}>
        <View style={[styles.icon, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
          {/* зачем: паритет profile.html (13.10): в макете A у блока «Важное от Phraseman» значок рупора */}
          <Ionicons name="megaphone-outline" size={18} color={t.textPrimary} />
        </View>
        <Text style={[styles.title, { color: t.textPrimary }]}>{copy.title}</Text>
      </View>
      {copy.body ? <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>{copy.body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // зачем (запрет владельца, 2026-08-26): контейнеры без обводки — разделяем
  // тоном. Фон t.bgCard уже отличается от фона экрана настроек.
  card: {
    marginHorizontal: SETTINGS_GROUP_MARGIN,
    borderRadius: 22, // зачем: паритет profile.html (13.10): `.card.c2` — радиус 22, как у карточки профиля
    borderWidth: 0,
    padding: 16,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // зачем: паритет profile.html (13.10): заголовок 16/22/800 и текст с межстрочным 22 — ровно как в макете A
  title: { flex: 1, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  body: { marginTop: 10, lineHeight: 22 },
});

export default SettingsMessageSlotCard;

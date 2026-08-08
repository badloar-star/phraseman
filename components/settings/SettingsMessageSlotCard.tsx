import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import type { Lang } from '../../constants/i18n';
import {
  pickAppMessagePollOptionText,
  pickAppMessagePollQuestion,
  pickAppMessageText,
  type AppMessageWithState,
} from '../../app/app_messages';
import {
  readSettingsPollVote,
  submitSettingsPollVoteOptimistically,
  type SettingsPollVoteState,
} from '../../app/settings_poll_vote';
import { trackEvent } from '../../app/analytics';
import { SETTINGS_GROUP_MARGIN } from './SettingsGroup';

type Props = {
  campaign: AppMessageWithState;
  lang: Lang;
  ownerStableId: string;
  marginTop?: number;
};

const LOCKED_VOTE_LABEL: Record<Lang, string> = {
  ru: 'Ваш выбор сохранён и не изменяется',
  uk: 'Ваш вибір збережено, його не можна змінити',
  es: 'Tu elección se guardó y no se puede cambiar',
  'pt-BR': 'Sua escolha foi salva e não pode ser alterada',
  vi: 'Lựa chọn của bạn đã được lưu và không thể thay đổi',
  id: 'Pilihan Anda telah disimpan dan tidak dapat diubah',
  tr: 'Seçiminiz kaydedildi ve değiştirilemez',
  pl: 'Twój wybór został zapisany i nie można go zmienić',
};

function lockedVoteLabel(lang: Lang): string {
  return LOCKED_VOTE_LABEL[lang] ?? LOCKED_VOTE_LABEL.ru;
}

function percent(count: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((Math.max(0, count) / total) * 100)}%`;
}

export function SettingsMessageSlotCard({ campaign, lang, ownerStableId, marginTop = 12 }: Props) {
  const { theme: t, f } = useTheme();
  const [vote, setVote] = useState<SettingsPollVoteState | null>(null);
  const copy = useMemo(() => pickAppMessageText(campaign, lang), [campaign, lang]);
  const question = useMemo(() => (
    campaign.poll ? pickAppMessagePollQuestion(campaign.poll, lang) : ''
  ), [campaign.poll, lang]);

  useEffect(() => {
    let active = true;
    setVote(null);
    if (campaign.kind === 'poll' && ownerStableId) {
      void readSettingsPollVote(ownerStableId, campaign.id).then((stored) => {
        if (active) setVote(stored);
      });
    }
    return () => { active = false; };
  }, [campaign.id, campaign.kind, ownerStableId]);

  useEffect(() => {
    void trackEvent('settings_message_impression', {
      campaign_id: campaign.id,
      slot: campaign.settingsSlot,
      kind: campaign.kind,
    });
  }, [campaign.id, campaign.kind, campaign.settingsSlot]);

  const onVote = (optionId: string) => {
    if (vote || !ownerStableId) return;
    const optimistic: SettingsPollVoteState = {
      messageId: campaign.id,
      optionId,
      requestId: `ui-${Date.now().toString(36)}`,
      status: 'pending',
      updatedAtMs: Date.now(),
    };
    setVote(optimistic);
    void submitSettingsPollVoteOptimistically(ownerStableId, campaign.id, optionId).then(setVote);
    void trackEvent('settings_poll_vote', {
      campaign_id: campaign.id,
      slot: campaign.settingsSlot,
      option_id: optionId,
    });
  };

  const totalVotes = campaign.poll?.voteCount ?? 0;
  return (
    <View
      testID={`settings-message-slot-${campaign.settingsSlot}`}
      accessibilityLabel={copy.title}
      style={[
        styles.card,
        {
          marginTop,
          backgroundColor: t.bgCard,
          borderColor: t.border,
        },
      ]}
    >
      <View style={styles.headingRow}>
        <View style={[styles.icon, { backgroundColor: t.bgSurface }]}>
          <Ionicons name={campaign.kind === 'poll' ? 'bar-chart-outline' : 'megaphone-outline'} size={18} color={t.textPrimary} />
        </View>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.bodyLg }]}>{copy.title}</Text>
      </View>
      {copy.body ? <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>{copy.body}</Text> : null}
      {campaign.kind === 'poll' && campaign.poll ? (
        <View style={styles.poll} accessibilityRole="radiogroup">
          <Text style={[styles.question, { color: t.textPrimary, fontSize: f.body }]}>{question}</Text>
          {campaign.poll.options.map((option) => {
            const selected = vote?.optionId === option.id;
            const locked = Boolean(vote);
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: locked }}
                disabled={locked}
                onPress={() => onVote(option.id)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    minHeight: 44,
                    backgroundColor: selected ? t.bgSurface : 'transparent',
                    borderColor: selected ? t.accent : t.border,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? t.accent : t.textGhost}
                />
                <Text style={[styles.optionText, { color: t.textPrimary, fontSize: f.body }]}>
                  {pickAppMessagePollOptionText(option, lang)}
                </Text>
                <Text style={[styles.percent, { color: locked ? t.textMuted : 'transparent', fontSize: f.caption }]}>
                  {percent(campaign.poll?.counts[option.id] ?? 0, totalVotes)}
                </Text>
              </Pressable>
            );
          })}
          {vote ? (
            <Text style={[styles.locked, { color: t.textMuted, fontSize: f.caption }]}>{lockedVoteLabel(lang)}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SETTINGS_GROUP_MARGIN,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '800', lineHeight: 22 },
  body: { marginTop: 10, lineHeight: 21 },
  poll: { marginTop: 14, gap: 8 },
  question: { fontWeight: '700', lineHeight: 21, marginBottom: 2 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  optionText: { flex: 1, lineHeight: 20 },
  percent: { width: 42, textAlign: 'right', fontWeight: '700' },
  locked: { marginTop: 2, lineHeight: 18 },
});

export default SettingsMessageSlotCard;

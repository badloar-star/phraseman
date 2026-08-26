import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
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

// зачем (аудит по Библии, 2026-08-26): было «Ваш выбор сохранён и не
// изменяется» — обращение на «вы» (Правило 14) плюс хвост «и не изменяется»,
// который читается как отказ. Библия просит короткое подтверждение на «ты».
//
// зачем triLang вместо Record<Lang, string>: переводы тут были и раньше, но
// плоскую карту сторож i18n (scripts/scan_untranslated_ui.mjs) не распознаёт
// как словарь и считал обе строки забытым русским текстом. Обёртка убирает
// ложный долг и приводит файл к общей для проекта форме.
function lockedVoteLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Твой выбор сохранён',
    uk: 'Твій вибір збережено',
    en: 'Your choice is saved',
    es: 'Tu elección quedó guardada',
    'pt-BR': 'Sua escolha ficou salva',
    vi: 'Lựa chọn của bạn đã được lưu',
    id: 'Pilihanmu sudah tersimpan',
    tr: 'Seçimin kaydedildi',
    pl: 'Twój wybór został zapisany',
  });
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
                    backgroundColor: selected ? t.accentBg : t.bgSurface,
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
  // зачем (запрет владельца, 2026-08-26): контейнеры без обводки — разделяем
  // тоном. Фон t.bgCard уже отличается от фона экрана настроек.
  card: {
    marginHorizontal: SETTINGS_GROUP_MARGIN,
    borderRadius: 16,
    borderWidth: 0,
    padding: 16,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '800', lineHeight: 22 },
  body: { marginTop: 10, lineHeight: 21 },
  poll: { marginTop: 14, gap: 8 },
  question: { fontWeight: '700', lineHeight: 21, marginBottom: 2 },
  // зачем: выбор варианта показывают радиокнопка и более светлый фон, рамка
  // была третьим — и запрещённым — способом.
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  optionText: { flex: 1, lineHeight: 20 },
  percent: { width: 42, textAlign: 'right', fontWeight: '700' },
  locked: { marginTop: 2, lineHeight: 18 },
});

export default SettingsMessageSlotCard;

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
  ownerTail,
  peekSettingsPollVote,
  readSettingsPollVote,
  submitSettingsPollVoteOptimistically,
  type SettingsPollVoteState,
} from '../../app/settings_poll_vote';
import { trackEvent } from '../../app/analytics';
import { SETTINGS_GROUP_MARGIN } from './SettingsGroup';
import { nestedBoxShadow, plateBoxShadow, useShadowGlass } from '../v2/ShadowSurface';

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
  const g = useShadowGlass();
  // зачем (settings-gap-008, журнал Сверки 13.10 15:58: голос приходил из хранилища через 754 мс — кадр «не голосовал», затем прыжок высоты):
  // первый кадр берёт голос из памяти процесса (peek), хранилище только догоняет и сверяет.
  const [vote, setVote] = useState<SettingsPollVoteState | null>(() => (
    campaign.kind === 'poll' && ownerStableId ? peekSettingsPollVote(ownerStableId, campaign.id) ?? null : null
  ));
  // зачем (settings-gaps-states): голос, отданный на этом экране, ещё не в серверных счётчиках кампании — прибавляем его локально, чтобы проценты считались с учётом выбора
  const [castHereOptionId, setCastHereOptionId] = useState<string | null>(null);
  const copy = useMemo(() => pickAppMessageText(campaign, lang), [campaign, lang]);
  const question = useMemo(() => (
    campaign.poll ? pickAppMessagePollQuestion(campaign.poll, lang) : ''
  ), [campaign.poll, lang]);

  useEffect(() => {
    let active = true;
    const peeked = campaign.kind === 'poll' && ownerStableId ? peekSettingsPollVote(ownerStableId, campaign.id) : null;
    setVote(peeked ?? null);
    setCastHereOptionId(null);
    if (__DEV__) console.log(`[SETTINGS-POLL] гидрация вход campaign=${campaign.id} kind=${campaign.kind} owner=${ownerTail(ownerStableId)} память=${peeked === undefined ? 'не читалась' : peeked ? `${peeked.optionId}/${peeked.status}` : 'нет голоса'}`);
    if (campaign.kind === 'poll' && ownerStableId) {
      const startedAt = Date.now();
      void readSettingsPollVote(ownerStableId, campaign.id).then((stored) => {
        if (__DEV__) console.log(`[SETTINGS-POLL] гидрация итог campaign=${campaign.id} owner=${ownerTail(ownerStableId)} хранилище=${stored ? `${stored.optionId}/${stored.status}` : 'нет'} active=${String(active)} за ${Date.now() - startedAt} мс`);
        // last-write-guard: голос, отданный на этом экране, пока шло чтение, не затираем поздним «нет» из хранилища.
        if (active) setVote((prev) => stored ?? prev);
      });
    } else {
      if (__DEV__) console.log(`[SETTINGS-POLL] гидрация пропущена: kind=${campaign.kind} owner=${ownerTail(ownerStableId)}`);
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
    setCastHereOptionId(optionId);
    void submitSettingsPollVoteOptimistically(ownerStableId, campaign.id, optionId).then(setVote);
    void trackEvent('settings_poll_vote', {
      campaign_id: campaign.id,
      slot: campaign.settingsSlot,
      option_id: optionId,
    });
  };

  const totalVotes = (campaign.poll?.voteCount ?? 0) + (castHereOptionId ? 1 : 0);
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
          {/* зачем: паритет profile.html (13.10): в макете A у блока «Важное от Phraseman» один значок — рупор, и для сообщения, и для опроса */}
          <Ionicons name="megaphone-outline" size={18} color={t.textPrimary} />
        </View>
        <Text style={[styles.title, { color: t.textPrimary }]}>{copy.title}</Text>
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
                  size={22}
                  color={selected ? t.accentText : t.textGhost}
                />
                <Text style={[styles.optionText, { color: t.textPrimary, fontSize: f.body }]}>
                  {pickAppMessagePollOptionText(option, lang)}
                </Text>
                <Text style={[styles.percent, { color: locked ? t.textMuted : 'transparent', fontSize: 13, fontWeight: '700' /* зачем (settings-gaps-states): проценты 13 жирным как в макете, не f.caption=15 */ }]}>
                  {percent((campaign.poll?.counts[option.id] ?? 0) + (castHereOptionId === option.id ? 1 : 0), totalVotes)}
                </Text>
              </Pressable>
            );
          })}
          {vote ? (
            <Text style={[styles.locked, { color: t.textMuted, fontSize: 13, lineHeight: 18 /* зачем (settings-gaps-states): подпись 13/18 */ }]}>{lockedVoteLabel(lang)}</Text>
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
    borderRadius: 22, // зачем: паритет profile.html (13.10): `.card.c2` — радиус 22, как у карточки профиля
    borderWidth: 0,
    padding: 16,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // зачем: паритет profile.html (13.10): заголовок 16/22/800 и текст с межстрочным 22 — ровно как в макете A
  title: { flex: 1, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  body: { marginTop: 10, lineHeight: 22 },
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

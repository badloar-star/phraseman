import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { Image, type ImageSource } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import type { GroupMember } from '../../app/league_engine';
import type { LeagueBonusMissionModel } from '../../app/league_club_hub_model';
import { leaguePublicName } from '../../app/league_public_name';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LeagueChestRing } from './LeagueChestRing';
import type { LeagueHubPalette } from './leagueHubPalette';

interface LeagueBonusMissionProps {
  model: LeagueBonusMissionModel;
  lang: Lang;
  palette: LeagueHubPalette;
  giftImage: ImageSourcePropType;
  renderContributorAvatar: (member: GroupMember, size: number) => React.ReactNode;
  onClaim: () => void;
  onBoost: () => void;
  onOpenBoostBuyer: () => void;
  onLikeBoost: () => void;
  boostLiked: boolean;
  boostLikeBusy: boolean;
  boostTimeLeft: string;
  onOpenRank: () => void;
  onChestPress: () => void;
}

function LeagueBonusMissionComponent({ model, lang, palette, giftImage, renderContributorAvatar, onClaim, onBoost, onOpenBoostBuyer, onLikeBoost, boostLiked, boostLikeBusy, boostTimeLeft, onOpenRank, onChestPress }: LeagueBonusMissionProps) {
  const reduceMotion = useReduceMotion();
  const claimLabel = triLang(lang, { ru: 'Забрать бонус', uk: 'Забрати бонус', es: 'Recoger bono', 'pt-BR': 'Coletar bônus', vi: 'Nhận phần thưởng', id: 'Ambil bonus', tr: 'Bonusu al', pl: 'Odbierz bonus' });

  return (
    <Reanimated.View entering={reduceMotion ? undefined : FadeInUp.delay(120).duration(240)} style={[styles.shell, { backgroundColor: model.canClaim ? palette.accent : palette.surface }]} testID="league-bonus-mission">
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={[styles.eyebrow, { color: model.canClaim ? palette.accentText : palette.text }]}>{triLang(lang, { ru: 'ОБЩАЯ ЦЕЛЬ НЕДЕЛИ', uk: 'СПІЛЬНА ЦІЛЬ ТИЖНЯ', es: 'META COMÚN', 'pt-BR': 'META COMUM', vi: 'MỤC TIÊU CHUNG', id: 'TARGET BERSAMA', tr: 'ORTAK HEDEF', pl: 'WSPÓLNY CEL' })}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, { ru: 'Показать, что в сундуке', uk: 'Показати, що у скрині', es: 'Mostrar el contenido del cofre', 'pt-BR': 'Mostrar o que há no baú', vi: 'Xem bên trong rương', id: 'Lihat isi peti', tr: 'Sandığın içini göster', pl: 'Pokaż zawartość skrzyni' })}
          onPress={onChestPress}
          testID="league-chest-press"
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: model.goal, now: model.progress }}>
          <LeagueChestRing
            percent={model.percent}
            size={78}
            strokeWidth={6}
            trackColor={model.canClaim ? 'rgba(7,17,10,0.18)' : palette.elevated}
            fillColor={model.canClaim ? palette.accentText : palette.warning}
            testID="league-chest-ring"
          >
            <Image source={giftImage as ImageSource} style={{ width: 44, height: 44 }} contentFit="contain" accessibilityLabel={triLang(lang, { ru: 'Сундук Бонус-лиги', uk: 'Скриня Бонус-ліги', es: 'Cofre de liga', 'pt-BR': 'Baú da liga', vi: 'Rương giải đấu', id: 'Peti liga', tr: 'Lig sandığı', pl: 'Skrzynia ligi' })} />
          </LeagueChestRing>
        </View>
        </Pressable>
      </View>

      <View style={styles.progressMeta}>
        <Text style={[styles.progressValue, { color: model.canClaim ? palette.accentText : palette.text }]}>{model.progress.toLocaleString()} / {model.goal.toLocaleString()} XP</Text>
        <Text style={[styles.percent, { color: model.canClaim ? palette.accentText : palette.muted }]}>{model.percent}%</Text>
      </View>

      <View style={styles.teamRow}>
        <View style={styles.avatars}>{model.topContributors.map((member, index) => <View key={member.uid ?? member.botId ?? `${member.name}-${index}`} accessibilityLabel={`${leaguePublicName(member.name, member.uid ?? member.botId ?? member.name)}, ${member.points} XP`} style={[styles.avatarSlot, { marginLeft: index === 0 ? 0 : -8, borderColor: model.canClaim ? palette.accent : palette.surface }]}>{renderContributorAvatar(member, 34)}</View>)}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Открыть рейтинг участников', uk: 'Відкрити рейтинг учасників', es: 'Abrir clasificación', 'pt-BR': 'Abrir ranking', vi: 'Mở bảng xếp hạng', id: 'Buka peringkat', tr: 'Sıralamayı aç', pl: 'Otwórz ranking' })} onPress={onOpenRank} style={styles.contribution}>
          <Text style={[styles.contributionLabel, { color: model.canClaim ? palette.accentText : palette.muted }]}>{triLang(lang, { ru: 'Ваш вклад', uk: 'Ваш внесок', es: 'Tu aporte', 'pt-BR': 'Sua contribuição', vi: 'Đóng góp của bạn', id: 'Kontribusimu', tr: 'Katkın', pl: 'Twój wkład' })}</Text>
          <Text style={[styles.contributionValue, { color: model.canClaim ? palette.accentText : palette.text }]}>{model.myContribution.toLocaleString()} XP</Text>
        </Pressable>
      </View>

      {model.boost ? (
        <View testID="league-group-boost-card" style={[styles.boost, { backgroundColor: model.canClaim ? 'rgba(7,17,10,0.14)' : palette.elevated }]}>
          <Ionicons name="flash" size={18} color={model.canClaim ? palette.accentText : palette.warning} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${leaguePublicName(model.boost.buyerName, model.boost.buyerUid)}, ×${model.boost.multiplier}`}
            onPress={onOpenBoostBuyer}
            style={styles.boostBuyer}
            testID="league-group-boost-buyer"
          >
            <Text numberOfLines={1} style={[styles.boostText, { color: model.canClaim ? palette.accentText : palette.text }]}>{leaguePublicName(model.boost.buyerName, model.boost.buyerUid)} · ×{model.boost.multiplier}</Text>
            {boostTimeLeft ? <Text style={[styles.boostTime, { color: model.canClaim ? palette.accentText : palette.muted }]}>{boostTimeLeft}</Text> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Поблагодарить за буст', uk: 'Подякувати за буст', es: 'Agradecer el boost', 'pt-BR': 'Agradecer o boost', vi: 'Cảm ơn lượt tăng tốc', id: 'Berterima kasih atas boost', tr: 'Boost için teşekkür et', pl: 'Podziękuj za boost' })}
            disabled={boostLiked || boostLikeBusy}
            onPress={onLikeBoost}
            style={styles.boostLike}
            testID="league-group-boost-like"
          >
            <Ionicons name={boostLiked ? 'heart' : 'heart-outline'} size={18} color={model.canClaim ? palette.accentText : palette.negative} />
            <Text style={[styles.boostLikeText, { color: model.canClaim ? palette.accentText : palette.negative }]}>{model.boost.likeCount}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Включить общий буст', uk: 'Увімкнути спільний буст', es: 'Activar boost común', 'pt-BR': 'Ativar boost comum', vi: 'Bật tăng tốc chung', id: 'Aktifkan boost bersama', tr: 'Ortak boost aç', pl: 'Włącz wspólny boost' })} onPress={onBoost} style={[styles.boost, { backgroundColor: model.canClaim ? 'rgba(7,17,10,0.14)' : palette.elevated }]} testID="league-group-boost-buy">
          <Ionicons name="flash-outline" size={18} color={model.canClaim ? palette.accentText : palette.warning} />
          <Text style={[styles.boostText, { color: model.canClaim ? palette.accentText : palette.text }]}>{triLang(lang, { ru: 'Ускорить весь клуб', uk: 'Прискорити весь клуб', es: 'Impulsar todo el club', 'pt-BR': 'Impulsionar todo o clube', vi: 'Tăng tốc cả câu lạc bộ', id: 'Percepat seluruh klub', tr: 'Tüm kulübü hızlandır', pl: 'Przyspiesz cały klub' })}</Text>
        </Pressable>
      )}

      {model.canClaim ? (
        <Pressable accessibilityRole="button" accessibilityLabel={claimLabel} onPress={onClaim} style={({ pressed }) => [styles.claim, { backgroundColor: palette.accentText, opacity: pressed ? 0.86 : 1 }]}>
          <Text style={[styles.claimText, { color: palette.accent }]}>{claimLabel}</Text>
          <Ionicons name="gift" size={19} color={palette.accent} />
        </Pressable>
      ) : null}
    </Reanimated.View>
  );
}

export const LeagueBonusMission = memo(LeagueBonusMissionComponent);

const styles = StyleSheet.create({
  shell: { borderRadius: 26, padding: 17, gap: 11, overflow: 'hidden' },
  headingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  headingText: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressValue: { fontSize: 15, fontWeight: '900' },
  percent: { fontSize: 13, fontWeight: '800' },
  teamRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatarSlot: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  contribution: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  contributionLabel: { fontSize: 11, fontWeight: '700' },
  contributionValue: { fontSize: 15, fontWeight: '900' },
  boost: { minHeight: 46, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  boostBuyer: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  boostText: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '800' },
  boostTime: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  boostLike: { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  boostLikeText: { fontSize: 12, fontWeight: '900' },
  claim: { minHeight: 50, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  claimText: { fontSize: 16, fontWeight: '900' },
});

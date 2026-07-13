import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { Image, type ImageSource } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import type { GroupMember } from '../../app/league_engine';
import type { LeagueBonusMissionModel } from '../../app/league_club_hub_model';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { LeagueHubPalette } from './leagueHubPalette';

interface LeagueBonusMissionProps {
  model: LeagueBonusMissionModel;
  lang: Lang;
  palette: LeagueHubPalette;
  giftImage: ImageSourcePropType;
  renderContributorAvatar: (member: GroupMember, size: number) => React.ReactNode;
  onClaim: () => void;
  onBoost: () => void;
  onOpenRank: () => void;
}

function missionMessage(model: LeagueBonusMissionModel, lang: Lang): string {
  if (model.state === 'claimed') return triLang(lang, { ru: 'Награда получена — миссия недели выполнена', uk: 'Нагороду отримано — місію тижня виконано', es: 'Premio recogido: misión completada', 'pt-BR': 'Prêmio coletado: missão concluída', vi: 'Đã nhận thưởng — nhiệm vụ hoàn thành', id: 'Hadiah diambil — misi selesai', tr: 'Ödül alındı — görev tamamlandı', pl: 'Nagroda odebrana — misja ukończona' });
  if (model.state === 'ready') return triLang(lang, { ru: 'Сундук готов. Заберите общую награду', uk: 'Скриня готова. Заберіть спільну нагороду', es: 'El cofre está listo', 'pt-BR': 'O baú está pronto', vi: 'Rương đã sẵn sàng', id: 'Peti sudah siap', tr: 'Sandık hazır', pl: 'Skrzynia jest gotowa' });
  return triLang(lang, { ru: `Осталось ${model.remainingXp.toLocaleString()} XP до сундука`, uk: `Залишилося ${model.remainingXp.toLocaleString()} XP до скрині`, es: `Faltan ${model.remainingXp.toLocaleString()} XP`, 'pt-BR': `Faltam ${model.remainingXp.toLocaleString()} XP`, vi: `Còn ${model.remainingXp.toLocaleString()} XP`, id: `Kurang ${model.remainingXp.toLocaleString()} XP`, tr: `${model.remainingXp.toLocaleString()} XP kaldı`, pl: `Zostało ${model.remainingXp.toLocaleString()} XP` });
}

function LeagueBonusMissionComponent({ model, lang, palette, giftImage, renderContributorAvatar, onClaim, onBoost, onOpenRank }: LeagueBonusMissionProps) {
  const reduceMotion = useReduceMotion();
  const claimLabel = triLang(lang, { ru: 'Забрать бонус', uk: 'Забрати бонус', es: 'Recoger bono', 'pt-BR': 'Coletar bônus', vi: 'Nhận phần thưởng', id: 'Ambil bonus', tr: 'Bonusu al', pl: 'Odbierz bonus' });

  return (
    <Reanimated.View entering={reduceMotion ? undefined : FadeInUp.delay(120).duration(240)} style={[styles.shell, { backgroundColor: model.canClaim ? palette.accent : palette.surface }]} testID="league-bonus-mission">
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={[styles.eyebrow, { color: model.canClaim ? palette.accentText : palette.muted }]}>{triLang(lang, { ru: 'ОБЩАЯ ЦЕЛЬ НЕДЕЛИ', uk: 'СПІЛЬНА ЦІЛЬ ТИЖНЯ', es: 'META COMÚN', 'pt-BR': 'META COMUM', vi: 'MỤC TIÊU CHUNG', id: 'TARGET BERSAMA', tr: 'ORTAK HEDEF', pl: 'WSPÓLNY CEL' })}</Text>
          <Text style={[styles.title, { color: model.canClaim ? palette.accentText : palette.text }]}>{triLang(lang, { ru: 'Бонус-лига', uk: 'Бонус-ліга', es: 'Liga de bonus', 'pt-BR': 'Liga de bônus', vi: 'Giải thưởng chung', id: 'Liga bonus', tr: 'Bonus ligi', pl: 'Liga bonusowa' })}</Text>
        </View>
        <Image source={giftImage as ImageSource} style={styles.gift} contentFit="contain" accessibilityLabel={triLang(lang, { ru: 'Сундук Бонус-лиги', uk: 'Скриня Бонус-ліги', es: 'Cofre de liga', 'pt-BR': 'Baú da liga', vi: 'Rương giải đấu', id: 'Peti liga', tr: 'Lig sandığı', pl: 'Skrzynia ligi' })} />
      </View>

      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: model.goal, now: model.progress }} style={[styles.track, { backgroundColor: model.canClaim ? 'rgba(7,17,10,0.18)' : palette.elevated }]}>
        <View style={[styles.fill, { width: `${model.percent}%`, backgroundColor: model.canClaim ? palette.accentText : palette.accent }]} />
      </View>
      <View style={styles.progressMeta}>
        <Text style={[styles.progressValue, { color: model.canClaim ? palette.accentText : palette.text }]}>{model.progress.toLocaleString()} / {model.goal.toLocaleString()} XP</Text>
        <Text style={[styles.percent, { color: model.canClaim ? palette.accentText : palette.muted }]}>{model.percent}%</Text>
      </View>
      <Text style={[styles.message, { color: model.canClaim ? palette.accentText : palette.muted }]}>{missionMessage(model, lang)}</Text>

      <View style={styles.teamRow}>
        <View style={styles.avatars}>{model.topContributors.map((member, index) => <View key={member.uid ?? member.botId ?? `${member.name}-${index}`} accessibilityLabel={`${member.name}, ${member.points} XP`} style={[styles.avatarSlot, { marginLeft: index === 0 ? 0 : -8, borderColor: model.canClaim ? palette.accent : palette.surface }]}>{renderContributorAvatar(member, 34)}</View>)}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Открыть рейтинг участников', uk: 'Відкрити рейтинг учасників', es: 'Abrir clasificación', 'pt-BR': 'Abrir ranking', vi: 'Mở bảng xếp hạng', id: 'Buka peringkat', tr: 'Sıralamayı aç', pl: 'Otwórz ranking' })} onPress={onOpenRank} style={styles.contribution}>
          <Text style={[styles.contributionLabel, { color: model.canClaim ? palette.accentText : palette.muted }]}>{triLang(lang, { ru: 'Ваш вклад', uk: 'Ваш внесок', es: 'Tu aporte', 'pt-BR': 'Sua contribuição', vi: 'Đóng góp của bạn', id: 'Kontribusimu', tr: 'Katkın', pl: 'Twój wkład' })}</Text>
          <Text style={[styles.contributionValue, { color: model.canClaim ? palette.accentText : palette.text }]}>{model.myContribution.toLocaleString()} XP</Text>
        </Pressable>
      </View>

      {model.boost ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${model.boost.buyerName}, ×${model.boost.multiplier}`} onPress={onBoost} style={[styles.boost, { backgroundColor: model.canClaim ? 'rgba(7,17,10,0.14)' : palette.elevated }]}>
          <Ionicons name="flash" size={18} color={model.canClaim ? palette.accentText : palette.warning} />
          <Text style={[styles.boostText, { color: model.canClaim ? palette.accentText : palette.text }]}>{model.boost.buyerName} · ×{model.boost.multiplier}</Text>
        </Pressable>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Включить общий буст', uk: 'Увімкнути спільний буст', es: 'Activar boost común', 'pt-BR': 'Ativar boost comum', vi: 'Bật tăng tốc chung', id: 'Aktifkan boost bersama', tr: 'Ortak boost aç', pl: 'Włącz wspólny boost' })} onPress={onBoost} style={[styles.boost, { backgroundColor: model.canClaim ? 'rgba(7,17,10,0.14)' : palette.elevated }]}>
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
  headingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64 },
  headingText: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  title: { fontSize: 23, lineHeight: 28, fontWeight: '900' },
  gift: { width: 70, height: 70 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressValue: { fontSize: 15, fontWeight: '900' },
  percent: { fontSize: 13, fontWeight: '800' },
  message: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  teamRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatarSlot: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  contribution: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  contributionLabel: { fontSize: 11, fontWeight: '700' },
  contributionValue: { fontSize: 15, fontWeight: '900' },
  boost: { minHeight: 46, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  boostText: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '800' },
  claim: { minHeight: 50, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  claimText: { fontSize: 16, fontWeight: '900' },
});

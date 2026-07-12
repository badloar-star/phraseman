import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import RewardCardV2 from './reward_v2/RewardCardV2';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { oskolokImageForPackShards } from '../app/oskolok';
import { bundleLang } from '../constants/i18n';
import { ruShardKnowledgeSubtitle, ukShardKnowledgeSubtitle } from '../constants/shard_plurals';
import { rewardModalSoftSurface, rewardModalPanelBorder, rewardModalAccentColor } from './RewardModalBackdrop';

export interface ShardReward {
  id: string;
  dataId: string;
  dataText: string;
  count: number;
  reason?: 'bug_fixed' | 'suggestion_accepted' | 'admin_grant';
  rewardType?: string;
  label?: string;
}

interface Props {
  rewards: ShardReward[];
  visible: boolean;
  onClose: () => void;
}

const TEXTS = {
  ru: {
    kicker: 'НАГРАДА',
    title: 'Осколки у тебя',
    subtitle: (n: number) => ruShardKnowledgeSubtitle(n),
    body: 'Твой репорт проверили и баг починили. Это настоящая работа — осколки заслужены.',
    bodySuggestion: 'Команда начислила тебе осколки. Твоя помощь делает Phraseman лучше — спасибо.',
    bodyAdmin: 'Команда начислила тебе осколки — это наш способ сказать спасибо.',
    label: 'За исправление:',
    labelSuggestion: 'От команды:',
    labelAdmin: 'От команды:',
    btn: 'Отлично',
    multiple: (n: number) => `${n} исправленных ошибок`,
    multipleSuggestion: (n: number) => `${n} наград от команды`,
    multipleAdmin: (n: number) => `${n} наград от команды`,
  },
  uk: {
    kicker: 'НАГОРОДА',
    title: 'Осколки вже твої',
    subtitle: (n: number) => ukShardKnowledgeSubtitle(n),
    body: 'Репорт перевірили і полагодили баг. Це справжня детективна робота — і вона має ціну.',
    bodySuggestion: 'Команда нарахувала тобі осколки. Дякуємо, що допомагаєш Phraseman ставати кращим.',
    bodyAdmin: 'Команда нарахувала тобі осколки. Невеликий жест великої вдячності.',
    label: 'За виправлення:',
    labelSuggestion: 'Від команди:',
    labelAdmin: 'Від команди:',
    btn: 'Чудово',
    multiple: (n: number) => `${n} виправлених помилок`,
    multipleSuggestion: (n: number) => `${n} нагород від команди`,
    multipleAdmin: (n: number) => `${n} нагород від команди`,
  },
  es: {
    kicker: 'RECOMPENSA',
    title: 'Tus fragmentos',
    subtitle: (n: number) => (n > 1 ? `+${n} fragmentos de conocimiento` : '+1 fragmento de conocimiento'),
    body: 'Confirmaron tu informe y ya corrigieron el fallo. Mereces el botín del detective.',
    bodySuggestion: 'El equipo te abonó fragmentos. Gracias por ayudar a mejorar Phraseman.',
    bodyAdmin: 'El equipo te abonó fragmentos. Gracias por quedarte con nosotros.',
    label: 'Por el arreglo:',
    labelSuggestion: 'Del equipo:',
    labelAdmin: 'Del equipo:',
    btn: 'Entendido',
    multiple: (n: number) => `${n} errores corregidos`,
    multipleSuggestion: (n: number) => `${n} recompensas del equipo`,
    multipleAdmin: (n: number) => `${n} recompensas del equipo`,
  },
  'pt-BR': {
    kicker: 'RECOMPENSA',
    title: 'Fragmentos recebidos',
    subtitle: (n: number) => (n > 1 ? `+${n} fragmentos de conhecimento` : '+1 fragmento de conhecimento'),
    body: 'Seu relatório foi verificado e o bug foi corrigido. Recompensa merecida por uma investigação de verdade.',
    bodySuggestion: 'A equipe creditou fragmentos para você. Obrigado por ajudar o Phraseman a melhorar.',
    bodyAdmin: 'A equipe creditou fragmentos para você. É nosso jeito de agradecer pelo seu apoio.',
    label: 'Pela correção:',
    labelSuggestion: 'Da equipe:',
    labelAdmin: 'Da equipe:',
    btn: 'Perfeito',
    multiple: (n: number) => `${n} erros corrigidos`,
    multipleSuggestion: (n: number) => `${n} recompensas da equipe`,
    multipleAdmin: (n: number) => `${n} recompensas da equipe`,
  },
  vi: {
    kicker: 'PHẦN THƯỞNG',
    title: 'Bạn đã nhận mảnh',
    subtitle: (n: number) => `+${n} mảnh kiến thức`,
    body: 'Báo cáo đã được kiểm tra và lỗi đã được sửa. Đây là phần thưởng xứng đáng cho công việc điều tra thật sự.',
    bodySuggestion: 'Đội ngũ đã cộng mảnh cho bạn. Cảm ơn bạn đã giúp Phraseman tốt hơn.',
    bodyAdmin: 'Đội ngũ đã cộng mảnh cho bạn. Đây là cách chúng tôi cảm ơn sự ủng hộ của bạn.',
    label: 'Cho bản sửa:',
    labelSuggestion: 'Từ đội ngũ:',
    labelAdmin: 'Từ đội ngũ:',
    btn: 'Tuyệt',
    multiple: (n: number) => `${n} lỗi đã sửa`,
    multipleSuggestion: (n: number) => `${n} phần thưởng từ đội ngũ`,
    multipleAdmin: (n: number) => `${n} phần thưởng từ đội ngũ`,
  },
  id: {
    kicker: 'HADIAH',
    title: 'Shard sudah masuk',
    subtitle: (n: number) => `+${n} shard pengetahuan`,
    body: 'Laporanmu sudah diperiksa dan bug-nya diperbaiki. Hadiah yang pantas untuk kerja investigasi sungguhan.',
    bodySuggestion: 'Tim menambahkan shard untukmu. Terima kasih sudah membantu Phraseman menjadi lebih baik.',
    bodyAdmin: 'Tim menambahkan shard untukmu. Ini cara kami berterima kasih atas dukunganmu.',
    label: 'Untuk perbaikan:',
    labelSuggestion: 'Dari tim:',
    labelAdmin: 'Dari tim:',
    btn: 'Mantap',
    multiple: (n: number) => `${n} bug diperbaiki`,
    multipleSuggestion: (n: number) => `${n} hadiah dari tim`,
    multipleAdmin: (n: number) => `${n} hadiah dari tim`,
  },
  tr: {
    kicker: 'ÖDÜL',
    title: 'Parçalar sende',
    subtitle: (n: number) => `+${n} bilgi parçası`,
    body: 'Raporun incelendi ve hata düzeltildi. Gerçek araştırma çalışması için hak edilmiş bir ödül.',
    bodySuggestion: "Ekip hesabına parçalar ekledi. Phraseman'i daha iyi yapmaya yardım ettiğin için teşekkürler.",
    bodyAdmin: 'Ekip hesabına parçalar ekledi. Desteğin için teşekkür etme biçimimiz bu.',
    label: 'Düzeltme için:',
    labelSuggestion: 'Ekipten:',
    labelAdmin: 'Ekipten:',
    btn: 'Harika',
    multiple: (n: number) => `${n} düzeltilmiş hata`,
    multipleSuggestion: (n: number) => `${n} ekip ödülü`,
    multipleAdmin: (n: number) => `${n} ekip ödülü`,
  },
  pl: {
    kicker: 'NAGRODA',
    title: 'Odłamki są twoje',
    subtitle: (n: number) => `+${n} odłamków wiedzy`,
    body: 'Zgłoszenie zostało sprawdzone, a błąd naprawiony. Zasłużona nagroda za prawdziwą pracę dochodzeniową.',
    bodySuggestion: 'Zespół przyznał ci odłamki. Dziękujemy, że pomagasz ulepszać Phraseman.',
    bodyAdmin: 'Zespół przyznał ci odłamki. Tak dziękujemy za twoje wsparcie.',
    label: 'Za poprawkę:',
    labelSuggestion: 'Od zespołu:',
    labelAdmin: 'Od zespołu:',
    btn: 'Świetnie',
    multiple: (n: number) => `${n} naprawionych błędów`,
    multipleSuggestion: (n: number) => `${n} nagród od zespołu`,
    multipleAdmin: (n: number) => `${n} nagród od zespołu`,
  },
};

function ShardRewardModal({ rewards, visible, onClose }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const tx = TEXTS[bundleLang(lang)];

  const totalShards = rewards.reduce((s, r) => s + r.count, 0);
  const firstDataText = rewards[0]?.dataText ?? '';
  const multipleReports = rewards.length > 1;
  const isAdminGrant = rewards.every((r) => r.reason === 'admin_grant' || r.reason === 'suggestion_accepted');
  const typedRewardLabels = rewards
    .filter((r) => r.label && r.rewardType && r.rewardType !== 'shards')
    .map((r) => r.label!) as string[];

  const accent = rewardModalAccentColor(themeMode, t);
  const soft = rewardModalSoftSurface(themeMode, t);
  const border = rewardModalPanelBorder(themeMode, t);

  const handleOpen = () => {
    hapticSuccess();
    onClose();
  };

  return (
    <RewardCardV2
      visible={visible}
      semantic="shards"
      backdropAction="cta"
      kicker={tx.kicker}
      icon={
        <Image
          source={oskolokImageForPackShards(Math.max(1, totalShards))}
          style={styles.gemIcon}
          contentFit="contain"
        />
      }
      title={tx.title}
      value={totalShards > 0 ? tx.subtitle(totalShards) : undefined}
      ctaLabel={tx.btn}
      onCta={handleOpen}
    >
      {typedRewardLabels.length > 0 && (
        <View style={styles.typedWrap}>
          {typedRewardLabels.map((lbl, i) => (
            <Text key={`tr-${i}`} style={[styles.typedLbl, { color: accent, fontSize: f.bodyLg }]}>
              {lbl}
            </Text>
          ))}
        </View>
      )}

      <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>
        {isAdminGrant ? tx.bodyAdmin : tx.body}
      </Text>

      {!(isAdminGrant && !firstDataText) && (
        <View style={[styles.detailBox, { backgroundColor: soft, borderColor: border }]}>
          <Text style={[styles.detailLabel, { color: accent, fontSize: f.label }]}>
            {multipleReports
              ? (isAdminGrant ? tx.multipleAdmin(rewards.length) : tx.multiple(rewards.length))
              : (isAdminGrant ? tx.labelAdmin : tx.label)}
          </Text>
          {!multipleReports && firstDataText && (
            <Text style={[styles.detailText, { color: t.textPrimary, fontSize: f.body }]}>
              {firstDataText}
            </Text>
          )}
        </View>
      )}
    </RewardCardV2>
  );
}

export default memo(ShardRewardModal);

const styles = StyleSheet.create({
  gemIcon: { width: 62, height: 62 },
  typedWrap: { alignItems: 'center', marginTop: 6, gap: 4 },
  typedLbl: { fontWeight: '800', textAlign: 'center' },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  detailBox: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 0,
    padding: 16,
    gap: 8,
    marginTop: 10,
  },
  detailLabel: { fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  detailText: { lineHeight: 22, fontWeight: '600' },
});
